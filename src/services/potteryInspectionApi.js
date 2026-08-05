/**
 * 도자기 육안조사 AI 서비스 호출.
 *
 * xrayApi.js와 같은 원칙을 따른다 - 브라우저는 같은 오리진(프록시)으로
 * 보내므로 CORS 설정이 필요 없고, 개발 중에는 vite.config.js의 프록시가
 * /pottery-inspection을 8080(Spring)으로 넘긴다.
 *
 * axios 대신 fetch를 쓴 이유: 공용 api.js 인스턴스는 Content-Type:
 * application/json이 기본이라 파일 업로드(FormData)와 안 맞는다. fetch는
 * body가 FormData면 boundary를 포함한 올바른 Content-Type을 브라우저가
 * 알아서 붙여주므로 이 문제 자체가 생기지 않는다.
 */

/**
 * Mock 모드 여부. 백엔드/AI 서버 없이 화면만 확인할 때 쓴다.
 * .env에 VITE_USE_POTTERY_MOCK=true로 켠다 - xrayApi.js의
 * VITE_USE_XRAY_MOCK과 같은 규칙이다.
 */
const USE_MOCK = import.meta.env.VITE_USE_POTTERY_MOCK === "true";

const MOCK_DELAY_MS = 900;

const MOCK_RESULT = {
  module_version: "mock",
  inspection_text:
    "[유물 외형]\n(Mock) 사진상 외형은 완전한 것으로 추정된다. 표면 광택 수준은 " +
    "높음으로 관찰된다. 시대는 형태·양식 기반 참고 결과로 고려 후보로 추정된다 " +
    "(모델 점수 92%).\n\n[주요 문양]\n(Mock) 표면에서 매화문, 학문(두루미)이(가) " +
    "확인된다.\n\n[종합 의견]\n(Mock) 뚜렷한 이상 소견은 확인되지 않았다.",
  summary: "(Mock) 형태: 완전 추정 / 시대 후보: 고려 / 문양: 매화문, 학문(두루미)",
  human_review_recommended: false,
  detail: {
    completeness: { prediction: "완전", score: 0.99 },
    glaze: { prediction: "높음", score: 0.8 },
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

  const response = await fetch(`/pottery-inspection?${params}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.json();
}