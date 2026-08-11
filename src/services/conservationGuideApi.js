import api from "./api";
import {
  createBondingTempAnalysisMock,
  createColorAnalysisMock,
  createGuideMockContext,
} from "./conservationGuideMock";

const USE_GUIDE_MOCK =
  import.meta.env.MODE === "mock" ||
  import.meta.env.VITE_USE_GUIDE_MOCK === "true";

const waitForMock = () =>
  new Promise((resolve) => {
    window.setTimeout(resolve, 120);
  });

export const startTask = async (taskId, data) => {
  if (USE_GUIDE_MOCK) {
    await waitForMock();
    console.info("[Guide Mock] startTask", { taskId, data });

    return {
      taskId,
      mock: true,
      interrupt: {
        mock_context: createGuideMockContext(),
      },
    };
  }

  const response = await api.post(`/tasks/${taskId}/start`, data);
  return response.data;
};

export const resumeTask = async (taskId, data, options = {}) => {
  if (USE_GUIDE_MOCK) {
    await waitForMock();
    console.info("[Guide Mock] resumeTask", { taskId, data });

    const resume = data?.resume || {};
    const isWettingAnalysis =
      Array.isArray(resume.before_photo_urls) &&
      Array.isArray(resume.after_photo_urls) &&
      options.mockStage !== "bonding-temp";
    const isBondingTempAnalysis =
      Array.isArray(resume.before_photo_urls) &&
      Array.isArray(resume.after_photo_urls) &&
      options.mockStage === "bonding-temp";

    return {
      taskId,
      mock: true,
      interrupt: isBondingTempAnalysis
        ? {
            stage: "접합 - 임시접합 검증",
            ai_temp_analysis: createBondingTempAnalysisMock(),
            default_action: "proceed",
          }
        : isWettingAnalysis
          ? {
            stage: "강화처리 - 습윤 효과 분석",
            ai_color_analysis: createColorAnalysisMock(),
            default_action: "proceed",
          }
          : null,
    };
  }

  const response = await api.post(`/tasks/${taskId}/resume`, data);
  return response.data;
};

/**
 * 저장된 Task 상태(진행 상황/완료 결과)를 조회한다.
 * 최종보고서 페이지에서 guide_result(results)와 relicInfo를 가져올 때 쓴다.
 * Mock 모드에서는 세션 중 저장해둔 게 없으니 null을 돌려준다 - 호출부에서
 * "보존가이드 결과 없이 나머지만으로 보고서 생성"으로 처리하면 된다.
 */
export const getTask = async (taskId) => {
  if (USE_GUIDE_MOCK) {
    await waitForMock();
    console.info("[Guide Mock] getTask", { taskId });
    return null;
  }

  const response = await api.get(`/tasks/${taskId}`);
  return response.data;
};
