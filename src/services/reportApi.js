import { authFetch } from "./authToken";

/**
 * 최종 통합 보고서 생성 AI 서비스(report-ai) 호출.
 *
 * xrayApi.js / potteryInspectionApi.js와 같은 원칙을 따른다 - 브라우저는 같은
 * 오리진(프록시)으로 보내므로 CORS 설정이 필요 없고, 개발 중에는
 * vite.config.js의 프록시가 /api/reports를 8080(Spring)으로 넘긴다.
 *
 * axios 대신 fetch를 쓴 이유: /generate/docx 응답은 JSON이 아니라 바이너리
 * (.docx) 파일이라, 공용 api.js 인스턴스(Content-Type: application/json 고정)와
 * 안 맞는다.
 *
 * report-ai 자체는 GUIDE_TASK/XRAY_JOB/INSPECTION_RESULT_POTTERY를 직접
 * 조회하지 않는다 - 이 파일을 호출하기 전에 각 파트 결과를 모아서
 * buildReportPayload로 채워야 한다 (FinalReportPage.jsx 참고).
 */

const SPRING_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "https://api.vora-heritage.click"
).replace(/\/+$/, "");

const REPORTS_BASE = `${SPRING_BASE}/api/reports`;

/** 오류 응답에서 사람이 읽을 메시지를 뽑는다 (xrayApi.js의 readError와 동일 패턴). */
async function readError(response) {
  const copy = response.clone();
  try {
    const data = await response.json();
    return data.message || data.detail || JSON.stringify(data);
  } catch {
    return copy.text();
  }
}

/**
 * report_json 생성 + .docx 변환을 한 번에 한다.
 * LLM 호출이 매번 새로 발생하므로 페이지 진입 시가 아니라, 사용자가
 * "최종 보고서 생성" 버튼을 눌렀을 때만 호출해야 한다.
 *
 * @returns {Promise<Blob>} 다운로드 가능한 .docx Blob
 */
export async function generateReportDocx(payload) {
  const response = await authFetch(`${REPORTS_BASE}/generate/docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.blob();
}

/**
 * DB에 저장된 가장 최근 육안조사 결과를 report-ai 입력 형태로 가져온다.
 * 이번 세션에 육안조사를 안 했거나(새로고침 등으로 visualResult가 사라진
 * 경우) 대체용으로 쓴다. 저장된 게 없으면 inspection_text가 빈 문자열로
 * 온다 - 에러가 아니다.
 */
export async function getPotterySource(artifactId) {
  const response = await authFetch(`${REPORTS_BASE}/${artifactId}/pottery-source`);

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.json();
}

/**
 * report_json만 생성한다 (미리보기·재확인 등 docx가 필요 없는 경우).
 */
export async function generateReportJson(payload) {
  const response = await authFetch(`${REPORTS_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.json();
}

/**
 * 이미 만든 report_json을 .docx로만 변환한다 (LLM 재호출 없음, 빠름).
 * ASSESSMENT_REPORT 저장이 붙기 전까지는 아직 쓸 데가 없지만, BE에 이미
 * 엔드포인트가 있어 같이 노출해둔다.
 */
export async function reportJsonToDocx({ artifactId, reportJson, photos }) {
  const response = await authFetch(`${REPORTS_BASE}/docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      artifact_id: artifactId,
      report_json: reportJson,
      photos,
    }),
  });

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.blob();
}

/** 생성된 report_json만 DB에 먼저 저장한다. */
export async function saveReportJson(artifactId, reportJson) {
  const response = await authFetch(
    `${REPORTS_BASE}/${encodeURIComponent(artifactId)}/save-json`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ reportJson, photos: {} }),
    },
  );

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.json();
}

/** 이 유물의 가장 최근 저장 보고서를 조회한다. 저장본이 없으면 null. */
export async function getLatestSavedReport(artifactId) {
  const response = await authFetch(`${REPORTS_BASE}/${encodeURIComponent(artifactId)}`);

  if (response.status === 404) return null;
  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.json();
}

/** 사진까지 포함한 최종 DOCX를 S3 + report_document에 저장한다. */
export async function saveReportDocument({ artifactId, reportJson, photos }) {
  const response = await authFetch(
    `${REPORTS_BASE}/${encodeURIComponent(artifactId)}/save`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ reportJson, photos }),
    },
  );

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.json();
}

/** presigned DOCX URL을 기존 다운로드 UX로 저장한다. */
export async function downloadReportFromUrl(url, filename) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`저장된 보고서를 불러오지 못했습니다 (HTTP ${response.status})`);
  }
  downloadBlob(await response.blob(), filename);
}

/** 브라우저에서 Blob을 파일로 즉시 다운로드한다. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}