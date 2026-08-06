const USE_VCA_MOCK = import.meta.env.VITE_USE_VCA_MOCK === "true";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8080"
).replace(/\/+$/, "");
const VCA_BASE = `${API_BASE}/api/vca`;
const VCA_ACCESS_TOKEN = import.meta.env.VITE_VCA_ACCESS_TOKEN || "";

const mockArtifacts = new Map();
const mockPendingUploads = new Map();
const mockPdfJobs = new Map();
const mockCorpusPdfs = [];

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function normalizeRun(run) {
  const assessmentRunId = run.assessmentRunId || run.runId;
  return { ...run, assessmentRunId, runId: assessmentRunId };
}

function gatewayUrl(url) {
  if (!url || !url.startsWith("/api/vca")) return url;
  const gateway = new URL(`${API_BASE}${url}`);
  if (VCA_ACCESS_TOKEN) gateway.searchParams.set("vca_access_token", VCA_ACCESS_TOKEN);
  return gateway.toString();
}

function shouldUploadToPresignedUrl(presigned) {
  if (presigned.uploadMode === "DIRECT_COMPLETE") return false;
  return true;
}

function normalizePdfJob(job) {
  return {
    ...job,
    downloadUrl: gatewayUrl(job.downloadUrl),
  };
}

function normalizeImage(image) {
  return {
    ...image,
    imageUrl: gatewayUrl(image.imageUrl),
    downloadUrl: gatewayUrl(image.downloadUrl),
  };
}

function normalizeArtifact(artifact) {
  return {
    ...artifact,
    thumbnailUrl: gatewayUrl(artifact.thumbnailUrl),
    uploadedImages: (artifact.uploadedImages || []).map(normalizeImage),
    runs: (artifact.runs || []).map(normalizeRun),
  };
}

function normalizeReport(report) {
  return {
    ...report,
    findings: report.findings || [],
    recommendations: report.recommendations || [],
    images: (report.images || []).map(normalizeImage),
  };
}

function normalizeIntermediateResults(results) {
  return {
    artifactId: results?.artifactId || "",
    assessmentRunId: results?.assessmentRunId || results?.runId || "",
    projectName: results?.projectName || "",
    stages: (results?.stages || []).map((stage) => ({
      stage: stage.stage || "",
      displayName: stage.displayName || "",
      items: (stage.items || []).map((item) => ({
        relativePath: item.relativePath || "",
        fileName: item.fileName || "",
        contentType: item.contentType || "",
        sizeBytes: item.sizeBytes,
        preview: item.preview || "",
      })),
    })),
  };
}

function isPotteryMaterial(material = "") {
  const normalized = material.toLowerCase();
  return normalized.includes("도자") || normalized.includes("pottery") || normalized.includes("ceramic");
}

function getMockArtifact(artifactId) {
  const key = String(artifactId || "artifact-demo-001");
  const existing = mockArtifacts.get(key);
  if (existing) {
    advanceMockRuns(existing);
    return existing;
  }

  const artifact = {
    artifactId: key,
    displayName: "청동 향로",
    status: "DRAFT",
    uploadedImages: [],
    runs: [],
  };
  mockArtifacts.set(key, artifact);
  return artifact;
}

function advanceMockRuns(artifact) {
  artifact.runs.forEach((run) => {
    if (run.status === "COMPLETED" || run.status === "FAILED") return;
    const createdAt = new Date(run.createdAt).getTime();
    const elapsed = Date.now() - createdAt;
    if (elapsed >= 3000) {
      run.status = "COMPLETED";
      run.completedAt = run.completedAt || new Date().toISOString();
      run.currentStage = "보고서 준비 완료";
      run.progressPercent = 100;
      return;
    }
    if (elapsed >= 900) {
      run.status = "RUNNING";
      run.currentStage = "표면 상태 분석 중";
      run.progressPercent = 62;
      return;
    }
    run.status = "QUEUED";
    run.currentStage = "분석 대기열 등록";
    run.progressPercent = 18;
  });
  if (artifact.runs.some((run) => run.status === "QUEUED" || run.status === "RUNNING")) {
    artifact.status = "ANALYZING";
  } else if (artifact.runs.some((run) => run.status === "COMPLETED")) {
    artifact.status = "ASSESSED";
  } else if (artifact.uploadedImages.length > 0) {
    artifact.status = "READY";
  } else {
    artifact.status = "DRAFT";
  }
}

function getMockRun(artifactId, assessmentRunId) {
  return getMockArtifact(artifactId).runs.find(
    (run) => run.assessmentRunId === assessmentRunId,
  );
}

async function calculateSha256(file) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readError(response) {
  const copy = response.clone();
  try {
    const payload = await response.json();
    const envelope = payload?.error;
    if (envelope && typeof envelope === "object") {
      return { code: envelope.code, message: envelope.message || "VCA 요청에 실패했습니다." };
    }
    return { code: payload?.code, message: payload?.message || payload?.detail || JSON.stringify(payload) };
  } catch {
    return { code: undefined, message: await copy.text() };
  }
}

async function requestJson(path, options = {}) {
  const headers = {
    ...(VCA_ACCESS_TOKEN ? { "X-VCA-Access-Token": VCA_ACCESS_TOKEN } : {}),
    ...(options.headers || {}),
  };
  let response;
  try {
    response = await fetch(`${VCA_BASE}${path}`, { ...options, headers });
  } catch (cause) {
    if (cause?.name === "AbortError") throw cause;
    const error = new Error("VCA Spring 서버에 연결할 수 없습니다.", { cause });
    error.status = 0;
    error.code = "NETWORK_ERROR";
    throw error;
  }

  if (!response.ok) {
    const detail = await readError(response);
    const error = new Error(detail.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = detail.code;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

export function isVcaMockMode() {
  return USE_VCA_MOCK;
}

export async function getVcaCorpusPdfs({ signal } = {}) {
  if (USE_VCA_MOCK) return [...mockCorpusPdfs];
  const payload = await requestJson("/corpus/pdfs", { signal });
  return Array.isArray(payload) ? payload : payload.items || [];
}

export async function uploadVcaCorpusPdf(file) {
  if (USE_VCA_MOCK) {
    const updatedAt = new Date().toISOString();
    const pdf = {
      fileName: file.name,
      sizeBytes: file.size,
      updatedAt,
    };
    mockCorpusPdfs.push(pdf);
    return pdf;
  }

  const formData = new FormData();
  formData.append("file", file);
  return requestJson("/corpus/pdfs", {
    method: "POST",
    body: formData,
  });
}

export async function deleteVcaCorpusPdf(fileName) {
  if (USE_VCA_MOCK) {
    const index = mockCorpusPdfs.findIndex((pdf) => pdf.fileName === fileName);
    if (index >= 0) mockCorpusPdfs.splice(index, 1);
    return null;
  }
  return requestJson(`/corpus/pdfs/${encodeURIComponent(fileName)}`, { method: "DELETE" });
}

export async function getVcaArtifacts({ signal } = {}) {
  if (USE_VCA_MOCK) return { items: [normalizeArtifact(getMockArtifact("artifact-demo-001"))] };
  const payload = await requestJson("", { signal });
  return { ...payload, items: (payload.items || []).map(normalizeArtifact) };
}

export async function getVcaArtifact(artifactId, { signal } = {}) {
  if (USE_VCA_MOCK) {
    await delay(180);
    return normalizeArtifact(getMockArtifact(artifactId));
  }
  return normalizeArtifact(await requestJson(`/${encodeURIComponent(artifactId)}`, { signal }));
}

export async function presignVcaImage(artifactId, file, sha256) {
  if (USE_VCA_MOCK) {
    const imageId = `image-mock-${Date.now()}`;
    mockPendingUploads.set(imageId, { file, sha256 });
    return { imageId, uploadUrl: `mock://vca/${imageId}`, method: "PUT" };
  }
  return requestJson(`/${encodeURIComponent(artifactId)}/images/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      sha256,
    }),
  });
}

export async function completeVcaImage(artifactId, imageId, sha256) {
  if (USE_VCA_MOCK) {
    const pending = mockPendingUploads.get(imageId);
    if (!pending || pending.sha256 !== sha256) throw new Error("완료할 Mock 이미지 업로드를 찾을 수 없습니다.");
    const image = {
      imageId,
      fileName: pending.file.name,
      contentType: pending.file.type,
      sizeBytes: pending.file.size,
      status: "UPLOADED",
      imageUrl: URL.createObjectURL(pending.file),
      downloadUrl: null,
      createdAt: new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
    };
    const artifact = getMockArtifact(artifactId);
    artifact.uploadedImages.push(image);
    artifact.status = "READY";
    mockPendingUploads.delete(imageId);
    return image;
  }
  return requestJson(`/${encodeURIComponent(artifactId)}/images/${encodeURIComponent(imageId)}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha256 }),
  });
}

export async function uploadVcaImage(artifactId, file) {
  if (!USE_VCA_MOCK) {
    const formData = new FormData();
    formData.append("file", file);
    return normalizeImage(
      await requestJson(`/${encodeURIComponent(artifactId)}/images`, {
        method: "POST",
        body: formData,
      }),
    );
  }

  const sha256 = await calculateSha256(file);
  const presigned = await presignVcaImage(artifactId, file, sha256);
  const imageId = presigned.imageId || presigned.fileId;
  if (!imageId) throw new Error("이미지 업로드 응답에 imageId가 없습니다.");

  if (!USE_VCA_MOCK && shouldUploadToPresignedUrl(presigned)) {
    const uploadResponse = await fetch(presigned.uploadUrl, {
      method: presigned.method || "PUT",
      headers: { ...(presigned.requiredHeaders || {}), "Content-Type": file.type },
      body: file,
    });
    if (!uploadResponse.ok) throw new Error(`이미지 업로드에 실패했습니다. (HTTP ${uploadResponse.status})`);
  }
  return completeVcaImage(artifactId, imageId, sha256);
}

export async function deleteVcaImage(artifactId, imageId) {
  if (USE_VCA_MOCK) {
    const artifact = getMockArtifact(artifactId);
    artifact.uploadedImages = artifact.uploadedImages.filter((image) => image.imageId !== imageId);
    return null;
  }
  return requestJson(`/${encodeURIComponent(artifactId)}/images/${encodeURIComponent(imageId)}`, { method: "DELETE" });
}

export async function createVcaRun(artifactId, { material = "" } = {}) {
  if (USE_VCA_MOCK) {
    await delay(250);
    const artifact = getMockArtifact(artifactId);
    const run = normalizeRun({
      assessmentRunId: `run-mock-${Date.now()}`,
      artifactId,
      status: "QUEUED",
      material,
      imageCount: artifact.uploadedImages.length,
      createdAt: new Date().toISOString(),
      completedAt: null,
      currentStage: "분석 대기열 등록",
      progressPercent: 18,
    });
    artifact.runs.unshift(run);
    artifact.status = "ANALYZING";
    return run;
  }
  const body = material ? JSON.stringify({ material }) : undefined;
  return normalizeRun(await requestJson(`/${encodeURIComponent(artifactId)}/runs`, {
    method: "POST",
    ...(body ? { headers: { "Content-Type": "application/json" }, body } : {}),
  }));
}

export async function getVcaReport(artifactId, assessmentRunId) {
  if (USE_VCA_MOCK) {
    await delay(350);
    const artifact = getMockArtifact(artifactId);
    const run = getMockRun(artifactId, assessmentRunId);
    if (!run) throw new Error("Mock 분석 실행을 찾을 수 없습니다.");
    if (run.status !== "COMPLETED") {
      const error = new Error("분석 보고서가 아직 준비되지 않았습니다.");
      error.status = 409;
      error.code = "NOT_READY";
      throw error;
    }
    return {
      run: normalizeRun(run),
      report: normalizeReport({
        reportId: `report-${assessmentRunId}`,
        summary: { overallCondition: "안정", riskLevel: "낮음", headline: "국부 검토 필요", description: "표면 전반은 안정적이나 국부적인 오염과 미세 균열은 전문가 대조 검토가 필요합니다." },
        findings: [{ title: "미세 균열 후보", category: "균열", severity: "관찰", description: "구연부에서 미세한 표면 균열 후보가 확인됩니다.", confidence: 0.82, imageId: artifact.uploadedImages[0]?.imageId }],
        recommendations: [{ title: "사광 재확인", priority: "보통", description: "균열 진행 방향을 사광 조명에서 재확인하세요." }],
        images: artifact.uploadedImages.slice(0, 2).map((image) => ({ ...image, downloadUrl: image.imageUrl })),
        potteryInspectionStatus: isPotteryMaterial(run.material)
          ? { applicable: true, status: "NOT_STARTED", retryable: true, failureMessage: null, lastAttemptedAt: null }
          : null,
      }),
    };
  }
  const result = await requestJson(`/${encodeURIComponent(artifactId)}/runs/${encodeURIComponent(assessmentRunId)}/report`);
  return { ...result, run: result.run ? normalizeRun(result.run) : undefined, report: normalizeReport(result.report || result) };
}

export async function runVcaPotteryInspection(artifactId, assessmentRunId, { material = "" } = {}) {
  if (USE_VCA_MOCK) {
    await delay(350);
    const artifact = getMockArtifact(artifactId);
    const run = getMockRun(artifactId, assessmentRunId);
    if (!run) throw new Error("Mock 분석 실행을 찾을 수 없습니다.");
    if (run.status !== "COMPLETED") {
      const error = new Error("분석 보고서가 준비된 뒤 도자기 검사를 실행할 수 있습니다.");
      error.status = 409;
      error.code = "NOT_READY";
      throw error;
    }
    if (!isPotteryMaterial(material || run.material)) {
      return normalizeReport({
        reportId: `report-${assessmentRunId}`,
        summary: { overallCondition: "안정", riskLevel: "낮음", headline: "국부 검토 필요", description: "표면 전반은 안정적입니다." },
        findings: [],
        recommendations: [],
        images: artifact.uploadedImages.slice(0, 2).map((image) => ({ ...image, downloadUrl: image.imageUrl })),
        potteryInspectionStatus: { applicable: false, status: "NOT_STARTED", retryable: false, failureMessage: null, lastAttemptedAt: null },
      });
    }
    return normalizeReport({
      reportId: `report-${assessmentRunId}`,
      summary: { overallCondition: "안정", riskLevel: "낮음", headline: "국부 검토 필요", description: "표면 전반은 안정적이나 국부적인 오염과 미세 균열은 전문가 대조 검토가 필요합니다." },
      findings: [{ title: "미세 균열 후보", category: "균열", severity: "관찰", description: "구연부에서 미세한 표면 균열 후보가 확인됩니다.", confidence: 0.82, imageId: artifact.uploadedImages[0]?.imageId }],
      recommendations: [{ title: "사광 재확인", priority: "보통", description: "균열 진행 방향을 사광 조명에서 재확인하세요." }],
      images: artifact.uploadedImages.slice(0, 2).map((image) => ({ ...image, downloadUrl: image.imageUrl })),
      potteryInspection: {
        moduleVersion: "pottery-mock-v1",
        inspectionText: "도자기 표면과 문양 후보를 확인했습니다.",
        summary: "도자기 보조 검사가 완료되었습니다.",
        humanReviewRecommended: true,
        detail: { pattern: "mock-pattern", confidence: 0.88 },
      },
      potteryInspectionStatus: { applicable: true, status: "COMPLETED", retryable: true, failureMessage: null, lastAttemptedAt: new Date().toISOString() },
    });
  }

  const body = material ? JSON.stringify({ material }) : undefined;
  const result = await requestJson(
    `/${encodeURIComponent(artifactId)}/runs/${encodeURIComponent(assessmentRunId)}/pottery-inspection`,
    {
      method: "POST",
      ...(body ? { headers: { "Content-Type": "application/json" }, body } : {}),
    },
  );
  return normalizeReport(result.report || result);
}

export async function getVcaIntermediateResults(artifactId, assessmentRunId, { signal } = {}) {
  if (USE_VCA_MOCK) {
    const artifact = getMockArtifact(artifactId);
    const run = getMockRun(artifactId, assessmentRunId);
    if (!run) throw new Error("Mock 분석 실행을 찾을 수 없습니다.");
    if (run.status !== "COMPLETED") {
      const error = new Error("분석 중간 결과가 아직 준비되지 않았습니다.");
      error.status = 409;
      error.code = "NOT_READY";
      throw error;
    }
    return normalizeIntermediateResults({
      artifactId,
      assessmentRunId,
      projectName: artifact.displayName,
      stages: [
        {
          stage: "INPUT_NORMALIZATION",
          displayName: "입력 정규화",
          items: [
            {
              relativePath: "01_input/manifest.json",
              fileName: "manifest.json",
              contentType: "application/json",
              sizeBytes: 384,
              preview: `{"artifactId":"${artifactId}","assessmentRunId":"${assessmentRunId}","imageCount":${run.imageCount}}`,
            },
          ],
        },
        {
          stage: "SURFACE_ANALYSIS",
          displayName: "표면 상태 분석",
          items: [
            {
              relativePath: "02_surface-analysis/summary.txt",
              fileName: "summary.txt",
              contentType: "text/plain",
              sizeBytes: 196,
              preview: "표면 전반은 안정적입니다. 국부적인 오염과 미세 균열 후보는 전문가 대조 검토가 필요합니다.",
            },
          ],
        },
      ],
    });
  }
  return normalizeIntermediateResults(
    await requestJson(
      `/${encodeURIComponent(artifactId)}/runs/${encodeURIComponent(assessmentRunId)}/intermediate-results`,
      { signal },
    ),
  );
}

export async function createVcaPdfJob(artifactId, assessmentRunId) {
  if (USE_VCA_MOCK) {
    const job = { jobId: `pdf-mock-${Date.now()}`, assessmentRunId, status: "QUEUED", createdAt: Date.now() };
    mockPdfJobs.set(job.jobId, job);
    return job;
  }
  return normalizePdfJob(await requestJson(`/${encodeURIComponent(artifactId)}/runs/${encodeURIComponent(assessmentRunId)}/report/pdf`, { method: "POST" }));
}

export async function getVcaPdfJob(artifactId, jobId) {
  if (USE_VCA_MOCK) {
    const job = mockPdfJobs.get(jobId);
    if (!job) throw new Error("Mock PDF 작업을 찾을 수 없습니다.");
    if (Date.now() - job.createdAt > 900) job.status = "COMPLETED";
    return normalizePdfJob(job);
  }
  return normalizePdfJob(await requestJson(`/${encodeURIComponent(artifactId)}/report-pdf-jobs/${encodeURIComponent(jobId)}`));
}

export function getVcaPdfDownloadUrl(job) {
  if (job?.downloadUrl) return job.downloadUrl;
  if (USE_VCA_MOCK) return "data:application/pdf;charset=utf-8,VORA%20mock%20visual%20inspection%20report";
  return "";
}
