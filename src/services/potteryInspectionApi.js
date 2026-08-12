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
 * 다중 객체 감지(422 + code=MULTIPLE_OBJECTS_DETECTED) 전용 에러.
 * VisualPage.jsx가 이걸 잡아서 "하나의 유물이 깨진 조각들이에요" 재시도
 * 선택지를 보여줄지 판단한다 - 그냥 Error면 이 정보가 메시지 문자열에만
 * 남아서 구분이 어렵다.
 */
export class MultipleObjectsDetectedError extends Error {
  constructor(message, { detectedRegionCount, regionGroups } = {}) {
    super(message);
    this.name = "MultipleObjectsDetectedError";
    this.detectedRegionCount = detectedRegionCount;
    this.regionGroups = regionGroups;
  }
}

/**
 * 오류 응답에서 사용자에게 표시할 메시지를 추출한다.
 * detail이 문자열이 아니라 구조화된 객체(다중 객체 감지)면 그 신호를 살려서
 * MultipleObjectsDetectedError를 던진다.
 */
async function readError(response) {
  const copy = response.clone();

  try {
    const data = await response.json();
    const detail = data.detail;

    if (detail && typeof detail === "object" && detail.code === "MULTIPLE_OBJECTS_DETECTED") {
      throw new MultipleObjectsDetectedError(detail.message || "다중 객체가 감지되었습니다.", {
        detectedRegionCount: detail.detected_region_count,
        regionGroups: detail.region_groups,
      });
    }

    return data.message || detail || JSON.stringify(data);
  } catch (error) {
    if (error instanceof MultipleObjectsDetectedError) throw error;
    return copy.text();
  }
}

/**
 * 도자기 육안 상태조사 AI 분석 요청.
 *
 * treatAsSingleArtifact: 이전 호출이 MultipleObjectsDetectedError로
 * 실패했고, 사용자가 "이건 하나의 유물이 깨진 조각들이다"라고 확인한 뒤
 * 재요청할 때만 true로 준다. 기본은 false.
 */
export async function inspectPottery(
  imageBlob,
  { nCalls = 3, useVlmPattern = true, treatAsSingleArtifact = false } = {},
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
    treat_as_single_artifact: String(treatAsSingleArtifact),
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
