import { authFetch } from "./authToken";

/**
 * 도자기 육안조사 AI 서비스 호출.
 *
 * FE는 Spring만 호출한다. 진행 상태의 기준은 Spring/RDS의 assessment_run이며,
 * FastAPI job_id를 브라우저 localStorage에 저장하지 않는다.
 */

const USE_MOCK = import.meta.env.VITE_USE_POTTERY_MOCK === "true";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://api.vora-heritage.click"
).replace(/\/+$/, "");

const MOCK_DELAY_MS = 900;
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const MOCK_RESULT = {
  module_version: "mock",
  inspection_text:
    "[유물 현황]\n(Mock) 사진의 형태는 완전한 것으로 추정됩니다. 표면 광택 수준은 " +
    "낮음으로 관찰되며, 시대 및 형식 판정은 참고 결과로 고려됩니다 (모델 점수 92%).\n\n" +
    "[주요 문양]\n(Mock) 표면에서 매화문 계열의 문양이 확인됩니다.\n\n" +
    "[종합 의견]\n(Mock) 특별한 이상 소견은 확인되지 않았습니다.",
  summary: "(Mock) 형태: 완전 추정 / 시대 후보: 고려 / 문양: 매화문 계열",
  human_review_recommended: false,
  detail: {
    completeness: { prediction: "완전", score: 0.99 },
    glaze: { prediction: "낮음", score: 0.8 },
    era: { prediction: "고려", score: 0.92 },
    pattern_era_color: {
      min_agreement_used: 2,
      patterns: [
        {
          key: "mock-1",
          display_name: "매화문",
          pattern_name: "매화문",
          decision: "확정",
          agreement_count: 3,
          bbox_percent: { x1: 20, y1: 25, x2: 55, y2: 55 },
        },
      ],
    },
  },
};

export class MultipleObjectsDetectedError extends Error {
  constructor(
    message,
    { detectedRegionCount, regionGroups, photoUrl, assessmentRunId } = {},
  ) {
    super(message);
    this.name = "MultipleObjectsDetectedError";
    this.detectedRegionCount = detectedRegionCount;
    this.regionGroups = regionGroups;
    this.photoUrl = photoUrl;
    this.assessmentRunId = assessmentRunId;
  }
}

async function readError(response) {
  const copy = response.clone();
  try {
    const data = await response.json();
    return data?.message || data?.detail || JSON.stringify(data);
  } catch {
    return copy.text();
  }
}

function normalizeDetail(detail) {
  if (typeof detail !== "string") return detail;
  try {
    return JSON.parse(detail);
  } catch {
    return detail;
  }
}

function throwIfFailed(job) {
  if (!job || job.status !== "failed") return;

  const detail = normalizeDetail(job.errorDetail);
  if (
    detail &&
    typeof detail === "object" &&
    detail.code === "MULTIPLE_OBJECTS_DETECTED"
  ) {
    throw new MultipleObjectsDetectedError(
      detail.message || "다중 객체가 감지되었습니다.",
      {
        detectedRegionCount: detail.detected_region_count,
        regionGroups: detail.region_groups,
        photoUrl: job.photoUrl,
        assessmentRunId: job.assessmentRunId,
      },
    );
  }

  const message =
    (typeof detail === "string" && detail) ||
    detail?.message ||
    job.errorDetail ||
    "육안조사 분석에 실패했습니다.";
  const error = new Error(String(message));
  error.status = job.errorStatus;
  throw error;
}

/** Spring/RDS에 새 육안조사 작업을 접수한다. */
export async function createInspectionJob(
  imageBlob,
  {
    artifactId,
    nCalls = 3,
    useVlmPattern = true,
    treatAsSingleArtifact = false,
    signal,
  } = {},
) {
  if (!artifactId) {
    throw new Error("artifactId가 없어 육안조사 작업을 시작할 수 없습니다.");
  }

  if (USE_MOCK) {
    return {
      assessmentRunId: `mock-${Date.now()}`,
      artifactId,
      status: "queued",
      progressPercent: 5,
      photoUrl: URL.createObjectURL(imageBlob),
      result: null,
    };
  }

  const formData = new FormData();
  formData.append("image", imageBlob, imageBlob?.name || "artifact.jpg");

  const params = new URLSearchParams({
    artifact_id: artifactId,
    n_calls: String(nCalls),
    use_vlm_pattern: String(useVlmPattern),
    treat_as_single_artifact: String(treatAsSingleArtifact),
  });

  const response = await authFetch(
    `${API_BASE_URL}/pottery-inspection/jobs?${params.toString()}`,
    {
      method: "POST",
      body: formData,
      signal,
    },
  );

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${String(detail).slice(0, 300)}`);
  }

  const job = await response.json();
  if (!job?.assessmentRunId) {
    throw new Error("육안조사 작업 ID를 받지 못했습니다.");
  }
  throwIfFailed(job);
  return job;
}

/**
 * 사용자가 AI 분석 결과를 최종 확인한 뒤 문양 기반 상태 조사를 확정한다.
 * 이 호출이 성공한 시점에 Spring이 결과를 저장하고 assessment_run을 완료 처리한다.
 */
export async function completeInspectionJob(
  artifactId,
  assessmentRunId,
  { signal } = {},
) {
  if (USE_MOCK) {
    return {
      assessmentRunId,
      artifactId,
      status: "done",
      progressPercent: 100,
      result: MOCK_RESULT,
      photoUrl: null,
    };
  }

  if (!artifactId || !assessmentRunId) {
    throw new Error("artifactId 또는 assessmentRunId가 없어 조사를 완료할 수 없습니다.");
  }

  const params = new URLSearchParams({ artifact_id: artifactId });
  const response = await authFetch(
    `${API_BASE_URL}/pottery-inspection/jobs/${encodeURIComponent(assessmentRunId)}/complete?${params.toString()}`,
    { method: "POST", signal },
  );

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${String(detail).slice(0, 300)}`);
  }

  return response.json();
}

/** 문양 박스가 합성된 최종 이미지를 해당 assessment_run에 영구 연결한다. */
export async function uploadAnnotatedInspectionPhoto(
  artifactId,
  assessmentRunId,
  file,
  { signal } = {},
) {
  if (USE_MOCK) {
    return { annotatedPhotoUrl: file ? URL.createObjectURL(file) : null };
  }

  if (!artifactId || !assessmentRunId) {
    throw new Error("artifactId 또는 assessmentRunId가 없어 보정 이미지를 저장할 수 없습니다.");
  }

  const formData = new FormData();
  formData.append("file", file, file?.name || "annotated.png");

  const params = new URLSearchParams({ artifact_id: artifactId });
  const response = await authFetch(
    `${API_BASE_URL}/pottery-inspection/jobs/${encodeURIComponent(assessmentRunId)}/annotated-photo?${params.toString()}`,
    { method: "POST", body: formData, signal },
  );

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${String(detail).slice(0, 300)}`);
  }

  return response.json();
}

/** 특정 assessment_run의 현재 상태를 Spring에서 조회한다. */
export async function getInspectionJob(artifactId, assessmentRunId, { signal } = {}) {
  if (USE_MOCK && String(assessmentRunId).startsWith("mock-")) {
    return {
      assessmentRunId,
      artifactId,
      status: "review_ready",
      progressPercent: 100,
      result: MOCK_RESULT,
      photoUrl: null,
    };
  }

  const params = new URLSearchParams({ artifact_id: artifactId });
  const response = await authFetch(
    `${API_BASE_URL}/pottery-inspection/jobs/${encodeURIComponent(assessmentRunId)}?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${String(detail).slice(0, 300)}`);
  }

  const job = await response.json();
  throwIfFailed(job);
  return job;
}

/** artifactId만으로 가장 최근 서버 육안조사 작업/완료 결과를 찾는다. */
export async function getLatestInspectionJob(artifactId, { signal } = {}) {
  if (USE_MOCK) return null;

  const params = new URLSearchParams({ artifact_id: artifactId });
  const response = await authFetch(
    `${API_BASE_URL}/pottery-inspection/jobs/latest?${params.toString()}`,
    { signal },
  );

  if (response.status === 404) return null;

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${String(detail).slice(0, 300)}`);
  }

  const job = await response.json();
  throwIfFailed(job);
  return job;
}

/** 진행 중 서버 job을 AI 분석 완료(검토 대기) 상태까지 폴링한다. */
export async function pollInspectionJob(
  artifactId,
  assessmentRunId,
  { signal, onStatus, timeoutMs = POLL_TIMEOUT_MS } = {},
) {
  if (USE_MOCK && String(assessmentRunId).startsWith("mock-")) {
    await new Promise((resolve, reject) => {
      const timer = window.setTimeout(resolve, MOCK_DELAY_MS);
      signal?.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
    return {
      assessmentRunId,
      artifactId,
      status: "review_ready",
      progressPercent: 100,
      result: MOCK_RESULT,
    };
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const job = await getInspectionJob(artifactId, assessmentRunId, { signal });
    onStatus?.(job);

    if (job.status === "done" || job.status === "review_ready") {
      return job;
    }

    await new Promise((resolve, reject) => {
      const timer = window.setTimeout(resolve, POLL_INTERVAL_MS);
      signal?.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
  }

  throw new Error(
    "분석이 예상보다 오래 걸리고 있어요. 페이지를 다시 열면 서버의 진행 중 작업을 이어서 확인합니다.",
  );
}

/** 기존 호출부 호환용. 신규 VisualPage는 create/poll을 직접 사용한다. */
export async function inspectPottery(
  imageBlob,
  {
    artifactId,
    nCalls = 3,
    useVlmPattern = true,
    treatAsSingleArtifact = false,
    signal,
  } = {},
) {
  const created = await createInspectionJob(imageBlob, {
    artifactId,
    nCalls,
    useVlmPattern,
    treatAsSingleArtifact,
    signal,
  });

  const completed = await pollInspectionJob(artifactId, created.assessmentRunId, {
    signal,
  });
  return completed.result;
}
