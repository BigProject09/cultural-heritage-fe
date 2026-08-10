/**
 * 도자기 육안조사 AI 서비스 호출.
 *
 * xrayApi.js와 같은 원칙을 따른다.
 * 운영 환경에서는 Spring Backend API를 통해 요청하고,
 * 개발 환경에서도 VITE_API_BASE_URL 값을 기준으로 요청한다.
 *
 * axios 대신 fetch를 사용하는 이유:
 * 파일 업로드(FormData) 요청에서는 브라우저가 multipart/form-data의
 * boundary를 포함한 Content-Type을 자동으로 생성하도록 두는 것이 안전하다.
 */

/**
 * Mock 모드 여부.
 * 백엔드/AI 서버 없이 화면만 확인할 때 사용한다.
 *
 * .env:
 * VITE_USE_POTTERY_MOCK=true
 */
const USE_MOCK = import.meta.env.VITE_USE_POTTERY_MOCK === "true";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.vora-heritage.click";

const MOCK_DELAY_MS = 900;

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
    completeness: {
      prediction: "완전",
      score: 0.99,
    },
    glaze: {
      prediction: "낮음",
      score: 0.8,
    },
    era: {
      prediction: "고려",
      score: 0.92,
    },
    pattern_era_color: {
      min_agreement_used: 2,
      patterns: [
        {
          key: "mock-1",
          display_name: "매화문",
          pattern_name: "매화문",
          decision: "확정",
          agreement_count: 3,
          bbox_percent: {
            x1: 20,
            y1: 25,
            x2: 55,
            y2: 55,
          },
        },
      ],
    },
  },
};

/**
 * 오류 응답에서 사용자에게 표시할 메시지를 추출한다.
 */
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
 * 도자기 육안 상태조사 AI 분석 요청.
 */
export async function inspectPottery(
  imageBlob,
  { nCalls = 3, useVlmPattern = true } = {},
) {
  if (USE_MOCK) {
    await new Promise((resolve) => window.setTimeout(resolve, MOCK_DELAY_MS));

    return MOCK_RESULT;
  }

  const formData = new FormData();

  formData.append("image", imageBlob, "artifact.jpg");

  const params = new URLSearchParams({
    n_calls: String(nCalls),
    use_vlm_pattern: String(useVlmPattern),
  });

  const response = await fetch(
    `${API_BASE_URL}/pottery-inspection?${params.toString()}`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const detail = await readError(response);

    throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.json();
}
