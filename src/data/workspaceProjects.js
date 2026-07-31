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
      "유물 정보와 조사 결과를 종합해 단계별 보존처리 초안을 만듭니다.",
    route: "/flow-recommendation",
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
    route: "/pre-investigation/xray",
  },
  {
    key: "visual",
    apiKey: "VISUAL",
    number: "03",
    eyebrow: "VISUAL INSPECTION",
    title: "육안 복원",
    shortTitle: "육안 조사",
    subtitle: "손상 부위 기록 · 판정",
    description:
      "2D 컬러 이미지에서 손상 위치와 유형을 기록하고 판정합니다.",
    route: "/pre-investigation/visual",
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
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
  } catch (error) {
    if (
      error?.name === "QuotaExceededError" ||
      error?.name === "NS_ERROR_DOM_QUOTA_REACHED"
    ) {
      throw new Error(
        "브라우저 로컬 저장 공간이 부족합니다. 더 작은 대표 이미지를 선택해주세요.",
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
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result || "");
    };

    reader.readAsDataURL(file);
  });
}

function saveLocalProject(project) {
  const projects = readLocalProjects();
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
  return normalized;
}

function getLocalProject(artifactId) {
  return readLocalProjects().find(
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
    return readLocalProjects().sort(
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
    const project = getLocalProject(artifactId);
    if (!project) {
      throw new Error("브라우저에 저장된 유물 프로젝트를 찾을 수 없습니다.");
    }
    return project;
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
    const existing = artifactInfo.artifactId
      ? getLocalProject(artifactInfo.artifactId)
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

    const image = imageFile
      ? await imageFileToThumbnail(imageFile)
      : existing?.image || artifactInfo.image || null;
    const project = saveLocalProject({
      ...existing,
      ...artifactInfo,
      artifactId,
      image,
      modules,
      updatedAt: new Date().toISOString(),
    });

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
    const project = getLocalProject(artifactId);
    if (!project) {
      throw new Error("브라우저에 저장된 유물 프로젝트를 찾을 수 없습니다.");
    }

    const modules = {
      ...project.modules,
      [moduleKey]: normalizeStatus(status),
    };

    if (
      ["xray", "visual"].includes(moduleKey) &&
      normalizeStatus(status) === MODULE_STATUS.DONE &&
      modules.guide === MODULE_STATUS.DONE
    ) {
      modules.guide = MODULE_STATUS.NEEDS_UPDATE;
    }

    return saveLocalProject({
      ...project,
      modules,
      updatedAt: new Date().toISOString(),
    });
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

export function getModuleRoute(moduleKey) {
  return (
    WORKSPACE_MODULES.find((module) => module.key === moduleKey)?.route || "/"
  );
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
