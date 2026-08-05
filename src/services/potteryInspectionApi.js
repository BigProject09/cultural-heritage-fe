/**
 * 도자기 육안조사 AI 서비스 호출.
 *
 * VITE_API_BASE_URL을 절대 주소로 사용한다 (api.js / xrayApi.js와 같은 규칙).
 * 이전에는 dev 서버 proxy(vite.config.js)에 기대는 상대경로였는데, 배포된
 * 백엔드 주소로 직접 요청을 보내려면 절대 주소가 필요하고, 그러려면
 * 백엔드의 CORS 허용 목록에 프론트 origin이 등록되어 있어야 한다.
 *
 * axios 대신 fetch를 쓴 이유: 공용 api.js 인스턴스는 Content-Type:
 * application/json이 기본이라 파일 업로드(FormData)와 안 맞는다. fetch는
 * body가 FormData면 boundary를 포함한 올바른 Content-Type을 브라우저가
 * 알아서 붙여주므로 이 문제 자체가 생기지 않는다.
 */

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8080"
).replace(/\/+$/, "");

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

  const response = await fetch(`${API_BASE}/pottery-inspection?${params}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await readError(response);
    throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.json();
}