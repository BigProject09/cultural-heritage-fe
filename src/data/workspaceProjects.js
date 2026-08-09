import { getArtifactModuleRoute } from "../utils/artifactRoutes";
import {
  compactMyReports,
  deleteMyReportsByArtifactId,
} from "../utils/myReports";
import {
  createArtifactImageKey,
  deleteArtifactAsset,
  deleteArtifactAssets,
  getArtifactImageUrl,
  saveArtifactImage,
} from "./localArtifactAssets";

export const MODULE_STATUS = {
  DONE: "DONE",
  IN_PROGRESS: "IN_PROGRESS",
  NOT_STARTED: "NOT_STARTED",
  NEEDS_UPDATE: "NEEDS_UPDATE",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  FAILED: "FAILED",
};

export const WORKSPACE_MODULES = [
  {
    key: "guide",
    apiKey: "GUIDE",
    number: "01",
    eyebrow: "AI CONSERVATION",
    title: "유물 복원 가이드",
    shortTitle: "복원 가이드",
    subtitle: "AI 보존처리 가이드",
    description:
      "유물 기본 정보를 바탕으로 필요한 보존처리 공정을 선택하고 단계별 작업을 기록합니다.",
  },
  {
    key: "xray",
    apiKey: "XRAY",
    number: "02",
    eyebrow: "X-RAY IMAGING",
    title: "X-RAY 복원",
    shortTitle: "X-RAY",
    subtitle: "파편 결합 · 결함 분석",
    description:
      "X-RAY 파편을 결합하고 내부 결함 후보를 검토·확정합니다.",
  },
  {
    key: "visual",
    apiKey: "VISUAL",
    number: "03",
    eyebrow: "VISUAL INSPECTION",
    title: "육안 조사",
    shortTitle: "육안 조사",
    subtitle: "특이점 부위 기록 · 판정",
    description:
      "2D 컬러 이미지에서 특이점 위치와 유형을 기록하고 판정합니다.",
  },
];

export const STATUS_LABEL = {
  DONE: "완료",
  IN_PROGRESS: "진행 중",
  NOT_STARTED: "미시작",
  NEEDS_UPDATE: "업데이트 필요",
  REVIEW_REQUIRED: "검토 필요",
  FAILED: "실패",
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080")
  .replace(/\/+$/, "");
const ARTIFACTS_PATH =
  import.meta.env.VITE_ARTIFACTS_API_PATH || "/api/artifacts";
const ARTIFACT_STORAGE_MODE =
  import.meta.env.VITE_ARTIFACT_STORAGE_MODE?.toLowerCase() === "api"
    ? "api"
    : "local";
const ACTIVE_ARTIFACT_KEY = "activeArtifactId";
const LOCAL_PROJECTS_KEY = "voraWorkspaceProjectsV2";

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function emptyModules() {
  return {
    guide: MODULE_STATUS.NOT_STARTED,
    xray: MODULE_STATUS.NOT_STARTED,
    visual: MODULE_STATUS.NOT_STARTED,
  };
}

function ensureNotAborted(signal) {
  if (signal?.aborted) {
    throw new DOMException("요청이 취소되었습니다.", "AbortError");
  }
}

function inferTone(material = "") {
  if (material.includes("백자") || material.includes("도자")) return "porcelain";
  if (material.includes("철")) return "iron";
  if (material.includes("청동") || material.includes("금속")) return "bronze";
  return "new";
}

function normalizeStatus(status) {
  const value = String(status || MODULE_STATUS.NOT_STARTED).toUpperCase();
  if (value === "COMPLETED" || value === "SUCCEEDED") return MODULE_STATUS.DONE;
  if (value === "RUNNING" || value === "QUEUED") {
    return MODULE_STATUS.IN_PROGRESS;
  }
  if (value === "STALE") return MODULE_STATUS.NEEDS_UPDATE;
  return STATUS_LABEL[value] ? value : MODULE_STATUS.NOT_STARTED;
}

function normalizeModules(modules) {
  if (Array.isArray(modules)) {
    return modules.reduce(
      (result, module) => {
        const key = String(module.moduleType || module.type || "").toLowerCase();
        if (key in result) result[key] = normalizeStatus(module.status);
        return result;
      },
      emptyModules(),
    );
  }

  const source = modules || {};
  return WORKSPACE_MODULES.reduce(
    (result, module) => {
      const value =
        source[module.key] ??
        source[module.apiKey] ??
        source[module.apiKey.toLowerCase()];
      result[module.key] = normalizeStatus(
        typeof value === "object" ? value.status : value,
      );
      return result;
    },
    emptyModules(),
  );
}

export function normalizeWorkspaceProject(project = {}) {
  const artifactId =
    project.artifactId ||
    project.artifactCode ||
    project.artifact_code ||
    project.id ||
    "";
  const material = project.material || project.relicMaterial || "";
  const image =
    project.image ||
    project.imageUrl ||
    project.thumbnailUrl ||
    project.colorImageUrl ||
    project.primaryImage?.url ||
    project.files?.find?.((file) => file.fileRole === "COLOR_ORIGINAL")?.url ||
    null;

  return {
    artifactId: String(artifactId),
    name: project.name || project.title || "무명 유물",
    material: material || "재질 미입력",
    period: project.period || project.era || "시대 미상",
    condition:
      project.condition ||
      project.conditionSummary ||
      project.condition_summary ||
      "",
    category: project.category || "",
    description: project.description || "",
    weight: project.weight || "",
    bondingArea: project.bondingArea || "",
    treatmentPurpose: project.treatmentPurpose || "",
    image,
    imageKey: project.imageKey || project.localImageKey || "",
    updatedAt:
      project.updatedAt ||
      project.updated_at ||
      project.createdAt ||
      new Date().toISOString(),
    tone: project.tone || inferTone(material),
    modules: normalizeModules(
      project.modules || project.artifactModules || project.moduleStatuses,
    ),
  };
}

function readLocalProjects() {
  const stored = safeParse(localStorage.getItem(LOCAL_PROJECTS_KEY), null);

  if (Array.isArray(stored)) {
    return stored
      .map(normalizeWorkspaceProject)
      .filter((project) => project.artifactId);
  }

  // 구버전에서 선택 중이던 유물이 있으면 샘플을 만들지 않고 그 한 건만
  // 목록으로 이어받는다.
  const legacyArtifact = safeParse(localStorage.getItem("artifactInfo"), {});
  if (!legacyArtifact.artifactId) return [];

  return [normalizeWorkspaceProject(legacyArtifact)];
}

function writeLocalProjects(projects) {
  try {
    const persistentProjects = projects.map((project) => {
      const normalized = normalizeWorkspaceProject(project);
      return {
        ...normalized,
        image: normalized.image?.startsWith?.("blob:") ? null : normalized.image,
      };
    });

    localStorage.setItem(
      LOCAL_PROJECTS_KEY,
      JSON.stringify(persistentProjects),
    );
  } catch (error) {
    if (
      error?.name === "QuotaExceededError" ||
      error?.name === "NS_ERROR_DOM_QUOTA_REACHED"
    ) {
      throw new Error(
        "브라우저 프로젝트 저장 공간이 부족합니다. 기존 Base64 이미지 데이터를 정리한 뒤 다시 시도해주세요.",
        { cause: error },
      );
    }
    throw error;
  }
}

function imageFileToThumbnail(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("대표 이미지를 읽지 못했습니다."));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () =>
        reject(new Error("대표 이미지 형식을 확인해주세요."));
      image.onload = () => {
        const maxLength = 1600;
        const scale = Math.min(1, maxLength / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("대표 이미지 미리보기를 만들지 못했습니다."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
              return;
            }
            reject(new Error("대표 이미지 미리보기를 만들지 못했습니다."));
          },
          "image/jpeg",
          0.82,
        );
      };
      image.src = String(reader.result || "");
    };

    reader.readAsDataURL(file);
  });
}

async function migrateLegacyLocalImages(projects) {
  const migratedKeys = [];
  let changed = false;

  try {
    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index];

      if (project.image?.startsWith?.("data:image/")) {
        const response = await fetch(project.image);
        const blob = await response.blob();
        const imageKey = createArtifactImageKey(project.artifactId);

        await saveArtifactImage({
          key: imageKey,
          artifactId: project.artifactId,
          blob,
          fileName: "legacy-artifact-image.jpg",
        });

        migratedKeys.push(imageKey);
        projects[index] = {
          ...project,
          image: null,
          imageKey,
        };
        changed = true;
      } else if (project.image?.startsWith?.("blob:")) {
        projects[index] = {
          ...project,
          image: null,
        };
        changed = true;
      }
    }

    if (changed) writeLocalProjects(projects);
    return projects;
  } catch (error) {
    await Promise.allSettled(migratedKeys.map(deleteArtifactAsset));
    throw new Error(
      "기존 대표 이미지를 새 임시 저장소로 이전하지 못했습니다.",
      { cause: error },
    );
  }
}

async function prepareLocalProjects() {
  compactMyReports();
  return migrateLegacyLocalImages(readLocalProjects());
}

async function hydrateLocalProject(project) {
  if (!project) return project;

  const normalized = normalizeWorkspaceProject(project);
  if (!normalized.imageKey) return normalized;

  const image = await getArtifactImageUrl(normalized.imageKey);
  return {
    ...normalized,
    image: image || null,
  };
}

async function saveLocalProject(project, currentProjects = null) {
  const projects = currentProjects || (await prepareLocalProjects());
  const normalized = normalizeWorkspaceProject(project);
  const index = projects.findIndex(
    (item) => item.artifactId === normalized.artifactId,
  );

  if (index >= 0) {
    projects[index] = normalized;
  } else {
    projects.unshift(normalized);
  }

  writeLocalProjects(projects);
  return hydrateLocalProject(normalized);
}

function getLocalProject(projects, artifactId) {
  return projects.find(
    (project) => project.artifactId === String(artifactId),
  );
}

function getAccessToken() {
  return (
    localStorage.getItem("accessToken") ||
    safeParse(localStorage.getItem("loginUser"), {})?.accessToken ||
    ""
  );
}

async function request(path, options = {}) {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error(
      "백엔드 서버에 연결할 수 없습니다. Spring 서버와 VITE_API_BASE_URL을 확인하세요.",
      { cause: error },
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      (typeof payload === "string" ? payload : "") ||
      `요청에 실패했습니다. (HTTP ${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  return (
    payload?.content ||
    payload?.items ||
    payload?.artifacts ||
    payload?.data ||
    []
  );
}

function moduleApiKey(moduleKey) {
  return (
    WORKSPACE_MODULES.find((module) => module.key === moduleKey)?.apiKey ||
    String(moduleKey || "").toUpperCase()
  );
}

function artifactPayload(artifactInfo, entryModule) {
  return {
    name: artifactInfo.name,
    category: artifactInfo.category || null,
    material: artifactInfo.material || null,
    era: artifactInfo.period || null,
    description: artifactInfo.description || null,
    conditionSummary: artifactInfo.condition || null,
    weight: artifactInfo.weight || null,
    bondingArea: artifactInfo.bondingArea || null,
    treatmentPurpose: artifactInfo.treatmentPurpose || null,
    initialModuleType: moduleApiKey(entryModule),
  };
}

export async function getWorkspaceProjects({ signal } = {}) {
  if (ARTIFACT_STORAGE_MODE === "local") {
    ensureNotAborted(signal);
    const projects = await prepareLocalProjects();
    ensureNotAborted(signal);
    const hydratedProjects = await Promise.all(projects.map(hydrateLocalProject));
    ensureNotAborted(signal);
    return hydratedProjects.sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    );
  }

  const payload = await request(ARTIFACTS_PATH, { signal });
  return extractList(payload)
    .map(normalizeWorkspaceProject)
    .filter((project) => project.artifactId);
}

export async function getWorkspaceProject(artifactId, { signal } = {}) {
  if (ARTIFACT_STORAGE_MODE === "local") {
    ensureNotAborted(signal);
    const projects = await prepareLocalProjects();
    ensureNotAborted(signal);
    const project = getLocalProject(projects, artifactId);
    if (!project) {
      throw new Error("브라우저에 저장된 유물 프로젝트를 찾을 수 없습니다.");
    }
    return hydrateLocalProject(project);
  }

  const payload = await request(
    `${ARTIFACTS_PATH}/${encodeURIComponent(artifactId)}`,
    { signal },
  );
  return normalizeWorkspaceProject(payload?.data || payload);
}

async function uploadArtifactImage(artifactId, file, entryModule) {
  const presigned = await request(
    `${ARTIFACTS_PATH}/${encodeURIComponent(artifactId)}/files/presign`,
    {
      method: "POST",
      body: JSON.stringify({
        moduleType: moduleApiKey(entryModule),
        fileRole: "COLOR_ORIGINAL",
        originalFileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      }),
    },
  );

  const uploadResponse = await fetch(presigned.uploadUrl, {
    method: presigned.method || "PUT",
    headers: {
      ...(presigned.requiredHeaders || {}),
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`대표 이미지 업로드에 실패했습니다. (HTTP ${uploadResponse.status})`);
  }

  return request(
    `${ARTIFACTS_PATH}/${encodeURIComponent(artifactId)}/files/${encodeURIComponent(presigned.fileId)}/complete`,
    {
      method: "POST",
      body: JSON.stringify({
        sizeBytes: file.size,
        etag: uploadResponse.headers.get("etag") || undefined,
      }),
    },
  );
}

export async function upsertWorkspaceProject(
  artifactInfo,
  entryModule,
  { editMode = false, imageFile = null } = {},
) {
  if (ARTIFACT_STORAGE_MODE === "local") {
    const projects = await prepareLocalProjects();
    const existing = artifactInfo.artifactId
      ? getLocalProject(projects, artifactInfo.artifactId)
      : null;
    const artifactId =
      editMode && existing?.artifactId
        ? existing.artifactId
        : `artifact-${Date.now()}`;
    const modules = {
      ...(existing?.modules || emptyModules()),
    };

    if (modules[entryModule] === MODULE_STATUS.NOT_STARTED) {
      modules[entryModule] = MODULE_STATUS.IN_PROGRESS;
    }

    const previousImageKey = existing?.imageKey || "";
    let nextImageKey = previousImageKey;

    if (imageFile) {
      const imageBlob = await imageFileToThumbnail(imageFile);
      nextImageKey = createArtifactImageKey(artifactId);
      await saveArtifactImage({
        key: nextImageKey,
        artifactId,
        blob: imageBlob,
        fileName: imageFile.name,
      });
    }

    let project;
    try {
      project = await saveLocalProject(
        {
          ...existing,
          ...artifactInfo,
          artifactId,
          image: null,
          imageKey: nextImageKey,
          modules,
          updatedAt: new Date().toISOString(),
        },
        projects,
      );
    } catch (error) {
      if (nextImageKey && nextImageKey !== previousImageKey) {
        await deleteArtifactAsset(nextImageKey).catch(() => {});
      }
      throw error;
    }

    if (previousImageKey && previousImageKey !== nextImageKey) {
      await deleteArtifactAsset(previousImageKey).catch(() => {});
    }

    selectWorkspaceProject(project);
    return project;
  }

  const artifactId = artifactInfo.artifactId;
  const path =
    editMode && artifactId
      ? `${ARTIFACTS_PATH}/${encodeURIComponent(artifactId)}`
      : ARTIFACTS_PATH;
  const saved = await request(path, {
    method: editMode && artifactId ? "PATCH" : "POST",
    body: JSON.stringify(artifactPayload(artifactInfo, entryModule)),
  });

  let project = normalizeWorkspaceProject(saved?.data || saved);
  if (!project.artifactId) {
    throw new Error("서버 응답에 artifactId가 없습니다.");
  }

  if (imageFile) {
    await uploadArtifactImage(project.artifactId, imageFile, entryModule);
    project = await getWorkspaceProject(project.artifactId);
  }

  if (
    project.modules[entryModule] === MODULE_STATUS.NOT_STARTED
  ) {
    project = await markWorkspaceModule(
      project.artifactId,
      entryModule,
      MODULE_STATUS.IN_PROGRESS,
    );
  }

  selectWorkspaceProject(project);
  return project;
}

export async function markWorkspaceModule(artifactId, moduleKey, status) {
  if (ARTIFACT_STORAGE_MODE === "local") {
    const projects = await prepareLocalProjects();
    const project = getLocalProject(projects, artifactId);
    if (!project) {
      throw new Error("브라우저에 저장된 유물 프로젝트를 찾을 수 없습니다.");
    }

    const modules = {
      ...project.modules,
      [moduleKey]: normalizeStatus(status),
    };

    return saveLocalProject(
      {
        ...project,
        modules,
        updatedAt: new Date().toISOString(),
      },
      projects,
    );
  }

  const payload = await request(
    `${ARTIFACTS_PATH}/${encodeURIComponent(artifactId)}/modules/${moduleApiKey(moduleKey)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

  const returnedProject = payload?.artifact || payload?.data?.artifact;
  if (returnedProject) return normalizeWorkspaceProject(returnedProject);

  return getWorkspaceProject(artifactId);
}

export async function deleteWorkspaceProject(artifactId) {
  const targetId = String(artifactId);

  if (ARTIFACT_STORAGE_MODE === "local") {
    const projects = await prepareLocalProjects();
    const existing = getLocalProject(projects, targetId);
    if (!existing) {
      throw new Error("삭제할 유물 프로젝트를 찾을 수 없습니다.");
    }

    writeLocalProjects(
      projects.filter((project) => project.artifactId !== targetId),
    );

    try {
      await deleteArtifactAssets(targetId);
    } catch (error) {
      console.warn("프로젝트 임시 이미지 정리를 완료하지 못했습니다.", error);
    }
  } else {
    await request(`${ARTIFACTS_PATH}/${encodeURIComponent(targetId)}`, {
      method: "DELETE",
    });
  }

  deleteMyReportsByArtifactId(targetId);

  const selectedArtifact = safeParse(localStorage.getItem("artifactInfo"), {});
  if (
    localStorage.getItem(ACTIVE_ARTIFACT_KEY) === targetId ||
    String(selectedArtifact.artifactId || "") === targetId
  ) {
    localStorage.removeItem(ACTIVE_ARTIFACT_KEY);
    localStorage.removeItem("artifactInfo");
  }
}

export function selectWorkspaceProject(project) {
  const normalized = normalizeWorkspaceProject(project);
  const artifactInfo = {
    artifactId: normalized.artifactId,
    name: normalized.name,
    material: normalized.material,
    period: normalized.period,
    condition: normalized.condition,
    category: normalized.category,
    description: normalized.description,
    weight: normalized.weight,
    bondingArea: normalized.bondingArea,
    treatmentPurpose: normalized.treatmentPurpose,
    image: normalized.image,
    imageKey: normalized.imageKey,
  };

  localStorage.setItem(ACTIVE_ARTIFACT_KEY, normalized.artifactId);
  localStorage.setItem("artifactInfo", JSON.stringify(artifactInfo));
  return artifactInfo;
}

export function getActiveArtifactId() {
  const artifactInfo = safeParse(localStorage.getItem("artifactInfo"), {});
  return localStorage.getItem(ACTIVE_ARTIFACT_KEY) || artifactInfo.artifactId || "";
}

export function getArtifactStorageMode() {
  return ARTIFACT_STORAGE_MODE;
}

export function getModuleRoute(moduleKey, artifactId = getActiveArtifactId()) {
  return getArtifactModuleRoute(artifactId, moduleKey);
}

export function formatWorkspaceDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return `오늘 ${date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}`;
  }

  return date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}

export function getNextModule(project) {
  return (
    WORKSPACE_MODULES.find(
      (module) => project.modules[module.key] === MODULE_STATUS.IN_PROGRESS,
    )?.key ||
    WORKSPACE_MODULES.find(
      (module) =>
        project.modules[module.key] !== MODULE_STATUS.DONE &&
        project.modules[module.key] !== MODULE_STATUS.NEEDS_UPDATE,
    )?.key ||
    WORKSPACE_MODULES.find(
      (module) => project.modules[module.key] === MODULE_STATUS.NEEDS_UPDATE,
    )?.key ||
    "guide"
  );
}
