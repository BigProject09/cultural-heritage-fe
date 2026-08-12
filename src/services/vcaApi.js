/**
 * VCA(육안조사) 실행 관리 + 결과 저장.
 *
 * 지금은 도자기 육안조사에서만 쓴다 - X-ray는 artifact_id에 직접 UNIQUE를 거는
 * 다른 재실행 정책을 쓰고(xrayApi.js 참고), 보존가이드는 taskId 기반이라
 * 이 서비스와는 무관하다.
 */

const SPRING_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "https://api.vora-heritage.click"
).replace(/\/+$/, "");

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
 * 진행 중인(active) VCA 실행이 있으면 그걸 그대로 쓰고, 없으면 새로 만든다.
 * BE는 활성 run이 있을 때 생성 요청에 409로 답하도록 돼 있어서, 그 경우
 * 목록 조회로 활성 run을 다시 찾아온다.
 */
export async function getOrCreateAssessmentRun(artifactId) {
  const createResponse = await fetch(`${SPRING_BASE}/api/vca/${artifactId}/runs`, {
    method: "POST",
  });

  if (createResponse.ok) {
    return createResponse.json();
  }

  if (createResponse.status === 409) {
    const listResponse = await fetch(`${SPRING_BASE}/api/vca/${artifactId}/runs`);
    if (!listResponse.ok) {
      const detail = await readError(listResponse);
      throw new Error(`HTTP ${listResponse.status}: ${detail.slice(0, 300)}`);
    }
    const runs = await listResponse.json();
    if (runs.length === 0) {
      throw new Error("활성 VCA 실행이 있다고 했지만 목록이 비어 있습니다.");
    }
    return runs[0];
  }

  const detail = await readError(createResponse);
  throw new Error(`HTTP ${createResponse.status}: ${detail.slice(0, 300)}`);
}

/** 육안조사 AI 응답(inspectPottery 결과)을 그대로 저장한다. */
export async function savePotteryInspectionResult(artifactId, assessmentRunId, aiResult) {
  const response = await fetch(
    `${SPRING_BASE}/api/vca/${artifactId}/runs/${assessmentRunId}/inspection-results/pottery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(aiResult),
    },
  );

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.json();
}