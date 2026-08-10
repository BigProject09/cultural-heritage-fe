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

// 서버는 run을 assessmentRunId로만 내려주지만, FE 전역(선택된 run 매칭,
// 폴링, PDF 작업 등)은 runId로 찾는다. 두 키에 같은 값을 채워 둬야
// 어느 이름으로 조회해도 어긋나지 않는다.
function normalizeRun(run) {
  const assessmentRunId = run.assessmentRunId || run.runId;
  return { ...run, assessmentRunId, runId: assessmentRunId };
}

// 서버가 내려주는 이미지/PDF/썸네일 URL은 "/api/vca/..." 상대 경로다.
// 프런트가 실제로 받으려면 API_BASE를 붙이고, 게이트웨이 인증이 필요하면
// vca_access_token 쿼리를 추가해야 한다. normalizeImage/normalizeArtifact/
// normalizePdfJob이 공용으로 쓴다.
function gatewayUrl(url) {
  if (!url || !url.startsWith("/api/vca")) return url;
  const gateway = new URL(`${API_BASE}${url}`);
  if (VCA_ACCESS_TOKEN) gateway.searchParams.set("vca_access_token", VCA_ACCESS_TOKEN);
  return gateway.toString();
}

function normalizePdfJob(job) {
  return {
    ...job,
    downloadUrl: gatewayUrl(job.downloadUrl),
  };
}

function normalizeImage(image) {
  // The Spring API only ever sends `downloadUrl` (see ImageResponse /
  // ReportResponse.Image) - there is no separate `imageUrl` field from the
  // server. `imageUrl` is a FE-only convenience the upload flow can
  // temporarily override with an in-memory blob preview; outside of that it
  // must fall back to the real downloadUrl or the grid renders nothing.
  const downloadUrl = gatewayUrl(image.downloadUrl);
  return {
    ...image,
    imageUrl: gatewayUrl(image.imageUrl) || downloadUrl,
    downloadUrl,
  };
}

// artifact 응답의 URL 필드와 중첩된 이미지/run 목록을 일괄 정규화한다.
// getVcaArtifact, getVcaArtifacts에서 응답을 state에 넣기 전에 쓴다.
function normalizeArtifact(artifact) {
  return {
    ...artifact,
    thumbnailUrl: gatewayUrl(artifact.thumbnailUrl),
    uploadedImages: (artifact.uploadedImages || []).map(normalizeImage),
    runs: (artifact.runs || []).map(normalizeRun),
  };
}

// report 응답을 정규화한다. findings/recommendations/images는 누락 시
// 빈 배열로 채우고, ragArtifacts의 각 count 필드는 서버가 값을 안 보내면
// 실제 배열 길이로 대신 채운다. getVcaReport, runVcaPotteryInspection에서 쓴다.
function normalizeReport(report) {
  const ragArtifacts = report.ragArtifacts;
  return {
    ...report,
    findings: report.findings || [],
    recommendations: report.recommendations || [],
    images: (report.images || []).map(normalizeImage),
    ragArtifacts: ragArtifacts && typeof ragArtifacts === "object"
      ? {
        ...ragArtifacts,
        queryCount: ragArtifacts.queryCount ?? ragArtifacts.queries?.length ?? 0,
        retrievalResultCount: ragArtifacts.retrievalResultCount ?? ragArtifacts.retrievalResults?.length ?? 0,
        evidenceRowCount: ragArtifacts.evidenceRowCount ?? ragArtifacts.evidenceRows?.length ?? 0,
        visualConceptCardCount: ragArtifacts.visualConceptCardCount ?? ragArtifacts.visualConceptCards?.length ?? 0,
        queries: Array.isArray(ragArtifacts.queries) ? ragArtifacts.queries : [],
        retrievalResults: Array.isArray(ragArtifacts.retrievalResults) ? ragArtifacts.retrievalResults : [],
        evidenceRows: Array.isArray(ragArtifacts.evidenceRows) ? ragArtifacts.evidenceRows : [],
        visualConceptCards: Array.isArray(ragArtifacts.visualConceptCards) ? ragArtifacts.visualConceptCards : [],
      }
      : ragArtifacts,
  };
}

// mock 응답에서 도자기 재질 여부를 문자열로 판별한다 (mock getVcaReport/
// runVcaPotteryInspection 전용). 주의: VisualReport.jsx에 같은 판별 로직이
// 독립적으로 있어, 키워드를 바꾸려면 두 곳 모두 고쳐야 한다.
function isPotteryMaterial(material = "") {
  const normalized = material.toLowerCase();
  return normalized.includes("도자") || normalized.includes("pottery") || normalized.includes("ceramic");
}

// VITE_USE_VCA_MOCK 모드에서 백엔드 대신 쓰는 인메모리 artifact 저장소.
// 없으면 만들고, 있으면 진행 중 run 상태를 먼저 진행시킨(advanceMockRuns)
// 뒤 돌려준다.
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

// 실제 폴링 없이도 화면에서 진행 상태를 확인할 수 있도록, run 생성 후
// 경과 시간만으로 QUEUED → RUNNING → COMPLETED를 흉내 낸다. mock 모드
// 전용이며 getMockArtifact가 조회할 때마다 호출한다.
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

// mock 모드의 presign/complete 업로드 흐름에서만 쓰는 무결성 체크섬.
// 실서버 경로(uploadVcaImage의 FormData 업로드)는 이 과정을 쓰지 않는다.
async function calculateSha256(file) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// 실패 응답 바디에서 에러 코드/메시지를 뽑아낸다. JSON이 아니거나 파싱에
// 실패하면 원본 텍스트로 대체한다(response를 clone해 두 번 읽을 수 있게 함).
// requestJson 전용.
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

// VCA_BASE 기준 fetch 공용 래퍼. 접근 토큰 헤더를 붙이고, 네트워크 실패와
// 4xx/5xx 응답을 모두 status/code가 달린 Error로 통일해 던진다. 이 파일의
// mock이 아닌 모든 API 함수가 거쳐 간다.
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

// RAG 코퍼스 PDF 목록/업로드/삭제 API. 코퍼스 관리 UI가 화면에서 빠진
// 뒤로는(관련 커밋 참고) 현재 이 스코프 안 어디서도 호출하지 않는다 -
// 백엔드 엔드포인트 자체는 남아 있어 그대로 유지했다.
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

// artifact 목록 조회 - 현재 이 스코프 안에서는 쓰이지 않는다(단건 조회인
// getVcaArtifact만 useVisualInvestigation이 사용). 목록 화면이 생기면 쓸 수
// 있게 유지.
export async function getVcaArtifacts({ signal } = {}) {
  if (USE_VCA_MOCK) return { items: [normalizeArtifact(getMockArtifact("artifact-demo-001"))] };
  const payload = await requestJson("", { signal });
  return { ...payload, items: (payload.items || []).map(normalizeArtifact) };
}

// artifact 단건 조회 - useVisualInvestigation의 loadArtifact가 초기 로드와
// 활성 run 폴링 둘 다에 쓰는 핵심 조회 함수다.
export async function getVcaArtifact(artifactId, { signal } = {}) {
  if (USE_VCA_MOCK) {
    await delay(180);
    return normalizeArtifact(getMockArtifact(artifactId));
  }
  return normalizeArtifact(await requestJson(`/${encodeURIComponent(artifactId)}`, { signal }));
}

// mock 모드 전용 2단계 업로드의 1단계(업로드 URL 발급). 실서버는
// uploadVcaImage가 FormData로 한 번에 업로드하므로 이 경로를 타지 않는다.
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

// mock 업로드 2단계 - presignVcaImage가 등록해 둔 대기 항목을 sha256으로
// 확인하고 uploadedImages에 반영한다. uploadVcaImage의 mock 분기에서만 부른다.
export async function completeVcaImage(artifactId, imageId, sha256) {
  if (USE_VCA_MOCK) {
    const pending = mockPendingUploads.get(imageId);
    if (!pending || pending.sha256 !== sha256) throw new Error("완료할 이미지 업로드 정보를 찾을 수 없습니다.");
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

// 이미지 업로드. useVisualInvestigation의 selectFiles가 선택 파일마다
// 호출한다. 실서버는 단일 FormData POST, mock 모드는 presign→complete
// 2단계로 흉내 낸다.
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

  return completeVcaImage(artifactId, imageId, sha256);
}

// useVisualInvestigation의 removeImage가 호출하는 이미지 삭제.
export async function deleteVcaImage(artifactId, imageId) {
  if (USE_VCA_MOCK) {
    const artifact = getMockArtifact(artifactId);
    artifact.uploadedImages = artifact.uploadedImages.filter((image) => image.imageId !== imageId);
    return null;
  }
  return requestJson(`/${encodeURIComponent(artifactId)}/images/${encodeURIComponent(imageId)}`, { method: "DELETE" });
}

// 새 분석 run 접수. useVisualInvestigation의 startRun이 호출한다.
// resume: true면 직전 실패한 run에서 이어서 시작한다("이어서 분석 시작" 버튼) -
// 이미지 구성이 그 run과 정확히 같을 때만 서버에서 실제로 적용된다.
export async function createVcaRun(artifactId, { material = "", resume = false } = {}) {
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
  const payload = { ...(material ? { material } : {}), ...(resume ? { resume: true } : {}) };
  const body = Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined;
  return normalizeRun(await requestJson(`/${encodeURIComponent(artifactId)}/runs`, {
    method: "POST",
    ...(body ? { headers: { "Content-Type": "application/json" }, body } : {}),
  }));
}

// 진행 중 run 중지. useVisualInvestigation의 cancelRun이 호출한다.
export async function cancelVcaRun(artifactId, assessmentRunId) {
  if (USE_VCA_MOCK) {
    await delay(150);
    const artifact = getMockArtifact(artifactId);
    const run = artifact.runs.find((candidate) => candidate.runId === assessmentRunId);
    if (run && (run.status === "QUEUED" || run.status === "RUNNING")) {
      run.status = "FAILED";
      run.failureReason = "사용자가 분석을 중지했습니다.";
      run.completedAt = new Date().toISOString();
    }
    return normalizeRun(run || { assessmentRunId, status: "FAILED" });
  }
  return normalizeRun(await requestJson(
    `/${encodeURIComponent(artifactId)}/runs/${encodeURIComponent(assessmentRunId)}/cancel`,
    { method: "POST" },
  ));
}

// 완료된 run의 보고서 조회. useVisualInvestigation의 loadReport와
// VisualFindingDetailPage가 각자 직접 호출한다(후자는 report를 라우트
// 이동으로 전달받지 않고 매번 새로 불러온다). run이 아직 COMPLETED가
// 아니면 409/NOT_READY를 던진다.
export async function getVcaReport(artifactId, assessmentRunId) {
  if (USE_VCA_MOCK) {
    await delay(350);
    const artifact = getMockArtifact(artifactId);
    const run = getMockRun(artifactId, assessmentRunId);
    if (!run) throw new Error("분석 실행 정보를 찾을 수 없습니다.");
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
        summary: { headline: "국부 검토 필요", description: "표면 전반은 안정적이나 국부적인 오염과 미세 균열은 전문가 대조 검토가 필요합니다." },
        findings: [{
          findingId: "mock-finding-1",
          category: "VCA_ANOMALY",
          severity: "INFO",
          description: "구연부에서 미세한 표면 균열 후보가 확인됩니다.",
          conceptFamily: "균열",
          descriptor: "구연부 미세 균열 후보",
          imageId: artifact.uploadedImages[0]?.imageId,
          citations: [{ citationId: "mock-citation-1", sourceCitation: "금속 문화유산 상태 조사 지침", pageNumber: 12 }],
          bbox: { xMin: 120, yMin: 40, xMax: 260, yMax: 150 },
        }],
        recommendations: [{ title: "사광 재확인", priority: "보통", description: "균열 진행 방향을 사광 조명에서 재확인하세요." }],
        images: artifact.uploadedImages.slice(0, 2).map((image) => ({ ...image, downloadUrl: image.imageUrl })),
        ragArtifacts: {
          schema: "rag_candidate_evidence_v1",
          queryCount: 2,
          retrievalResultCount: 2,
          evidenceRowCount: 2,
          visualConceptCardCount: 1,
          queries: [
            { lane: "owlv2_sam2", promptText: "청동 향로 표면 미세 균열 보존 처리", queryId: "mock-query-1" },
            { lane: "owlv2_sam2", promptText: "청동 유물 국부 오염 사광 관찰 방법", queryId: "mock-query-2" },
          ],
          retrievalResults: [
            {
              chunkId: "mock-chunk-1",
              citationId: "mock-citation-1",
              lane: "owlv2_sam2",
              matchedTerms: ["미세 균열", "사광"],
              pageNumber: null,
              promptText: "청동 향로 표면 미세 균열 보존 처리",
              queryId: "mock-query-1",
              rank: 1,
              score: 0.91,
              snippetText: "미세 균열 후보는 사광 조명과 확대 관찰로 위치와 진행 방향을 재확인합니다.",
              sourceCitation: "금속 문화유산 상태 조사 지침",
            },
            {
              chunkId: "mock-chunk-2",
              citationId: "mock-citation-2",
              lane: "owlv2_sam2",
              matchedTerms: ["표면 오염", "건식 제거"],
              pageNumber: 12,
              promptText: "청동 유물 국부 오염 사광 관찰 방법",
              queryId: "mock-query-2",
              rank: 1,
              score: 0.86,
              snippetText: "표면 오염은 건식 제거 전 상태를 사진과 관찰 기록으로 남긴 뒤 단계적으로 검토합니다.",
              sourceCitation: "청동 유물 보존 처리 기록 예시",
            },
          ],
          evidenceRows: [
            {
              evidenceState: "rag_evidence_ready",
              lane: "owlv2_sam2",
              matchedCitationIds: ["mock-citation-1"],
              promptText: "청동 향로 표면 미세 균열 보존 처리",
              queryId: "mock-query-1",
              ragParentCandidateId: "미세 균열 후보",
              topCitationId: "mock-citation-1",
              topRetrievalScore: 0.91,
            },
            {
              evidenceState: "rag_evidence_ready",
              lane: "owlv2_sam2",
              matchedCitationIds: ["mock-citation-2"],
              promptText: "청동 유물 국부 오염 사광 관찰 방법",
              queryId: "mock-query-2",
              ragParentCandidateId: "국부 오염",
              topCitationId: "mock-citation-2",
              topRetrievalScore: 0.86,
            },
          ],
          visualConceptCards: [
            {
              conceptCardId: "mock-card-1",
              conceptFamily: "사광 재확인",
              contextTerms: ["구연부", "확대 관찰"],
              descriptorTerms: ["사광", "선형 음영"],
              materialTerms: ["청동"],
              provenanceStrength: "strong",
              ragParentCandidateId: "미세 균열 후보",
              rawRetrievedSentence: "구연부를 중심으로 낮은 각도의 조명을 사용해 균열 후보의 연속성을 확인합니다.",
              retrievalScore: 0.91,
              sourceCitationIds: ["mock-citation-1"],
            },
          ],
        },
        potteryInspectionStatus: isPotteryMaterial(run.material)
          ? { applicable: true, status: "NOT_STARTED", retryable: true, failureMessage: null, lastAttemptedAt: null }
          : null,
      }),
    };
  }
  const result = await requestJson(`/${encodeURIComponent(artifactId)}/runs/${encodeURIComponent(assessmentRunId)}/report`);
  return { ...result, run: result.run ? normalizeRun(result.run) : undefined, report: normalizeReport(result.report || result) };
}

// 리포트 하단 "시스템 환경 정보" 조회 - 특정 run이 아니라 vca-ai 엔진이
// 지금 도는 환경 자체(OS/CPU·GPU/라이브러리·모델 버전)를 설명하는 전역
// 정보라 artifactId 없이 한 번만 불러오면 된다. VisualReport가 마운트
// 시점에 한 번 호출해서 푸터에 작게 표시한다.
export async function getVcaSystemInfo({ signal } = {}) {
  if (USE_VCA_MOCK) {
    await delay(80);
    return {
      os: "Mock OS",
      pythonVersion: "3.13",
      device: "cpu",
      libraries: { torch: "mock", transformers: "mock" },
      models: [],
    };
  }
  return requestJson("/system-info", { signal });
}

// 도자기 보조 검사 실행 - useVisualInvestigation의 handlePotteryInspection이
// 호출한다. 완료된 report를 그대로 돌려주므로 호출부가 곧바로 report
// state를 갈아 끼울 수 있다.
export async function runVcaPotteryInspection(artifactId, assessmentRunId, { material = "" } = {}) {
  if (USE_VCA_MOCK) {
    await delay(350);
    const artifact = getMockArtifact(artifactId);
    const run = getMockRun(artifactId, assessmentRunId);
    if (!run) throw new Error("분석 실행 정보를 찾을 수 없습니다.");
    if (run.status !== "COMPLETED") {
      const error = new Error("분석 보고서가 준비된 뒤 도자기 검사를 실행할 수 있습니다.");
      error.status = 409;
      error.code = "NOT_READY";
      throw error;
    }
    if (!isPotteryMaterial(material || run.material)) {
      return normalizeReport({
        reportId: `report-${assessmentRunId}`,
        summary: { headline: "국부 검토 필요", description: "표면 전반은 안정적입니다." },
        findings: [],
        recommendations: [],
        images: artifact.uploadedImages.slice(0, 2).map((image) => ({ ...image, downloadUrl: image.imageUrl })),
        potteryInspectionStatus: { applicable: false, status: "NOT_STARTED", retryable: false, failureMessage: null, lastAttemptedAt: null },
      });
    }
    return normalizeReport({
      reportId: `report-${assessmentRunId}`,
      summary: { headline: "국부 검토 필요", description: "표면 전반은 안정적이나 국부적인 오염과 미세 균열은 전문가 대조 검토가 필요합니다." },
      findings: [{
        findingId: "mock-finding-1",
        category: "VCA_ANOMALY",
        severity: "INFO",
        description: "구연부에서 미세한 표면 균열 후보가 확인됩니다.",
        conceptFamily: "균열",
        descriptor: "구연부 미세 균열 후보",
        imageId: artifact.uploadedImages[0]?.imageId,
        citations: [{ citationId: "mock-citation-1", sourceCitation: "금속 문화유산 상태 조사 지침", pageNumber: 12 }],
        bbox: { xMin: 120, yMin: 40, xMax: 260, yMax: 150 },
      }],
      recommendations: [{ title: "사광 재확인", priority: "보통", description: "균열 진행 방향을 사광 조명에서 재확인하세요." }],
      images: artifact.uploadedImages.slice(0, 2).map((image) => ({ ...image, downloadUrl: image.imageUrl })),
      potteryInspection: {
        moduleVersion: "VORA 도자기 검사",
        inspectionText: "도자기 표면과 문양 후보를 확인했습니다.",
        summary: "도자기 보조 검사가 완료되었습니다.",
        humanReviewRecommended: true,
        detail: { pattern: "문양 후보", confidence: 0.88 },
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

// PDF 생성 작업 접수. useVisualInvestigation의 handlePdfJob이 pdfJob이
// 없을 때 호출한다.
export async function createVcaPdfJob(artifactId, assessmentRunId) {
  if (USE_VCA_MOCK) {
    const job = { jobId: `pdf-mock-${Date.now()}`, assessmentRunId, status: "QUEUED", createdAt: Date.now() };
    mockPdfJobs.set(job.jobId, job);
    return job;
  }
  return normalizePdfJob(await requestJson(`/${encodeURIComponent(artifactId)}/runs/${encodeURIComponent(assessmentRunId)}/report/pdf`, { method: "POST" }));
}

// PDF 작업 상태 재조회. handlePdfJob이 pdfJob이 이미 있을 때(재확인) 호출한다.
export async function getVcaPdfJob(artifactId, jobId) {
  if (USE_VCA_MOCK) {
    const job = mockPdfJobs.get(jobId);
    if (!job) throw new Error("PDF 생성 작업을 찾을 수 없습니다.");
    if (Date.now() - job.createdAt > 900) job.status = "COMPLETED";
    return normalizePdfJob(job);
  }
  return normalizePdfJob(await requestJson(`/${encodeURIComponent(artifactId)}/report-pdf-jobs/${encodeURIComponent(jobId)}`));
}

// VisualReport의 "PDF 열기" 링크 href. mock 모드에서는 job에 downloadUrl이
// 없으므로 인라인 data URI로 대체한다.
export function getVcaPdfDownloadUrl(job) {
  if (job?.downloadUrl) return job.downloadUrl;
  if (USE_VCA_MOCK) return "data:application/pdf;charset=utf-8,VORA%20%EC%9C%A1%EC%95%88%20%EC%A1%B0%EC%82%AC%20%EB%B3%B4%EA%B3%A0%EC%84%9C";
  return "";
}
