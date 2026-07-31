import api from "./api";

import axios from "axios";

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === "true";

export const startTask = async (taskId, requestData) => {
  if (USE_MOCK_API) {
    console.log("[MOCK] 작업 시작:", {
      taskId,
      requestData,
    });

    return {
      taskId,
      status: "WAITING",
      interrupt: {
        // applyInterrupt가 사용하는 실제 응답 구조에 맞춰 작성
      },
    };
  }

  const response = await axios.post(`/tasks/${taskId}/start`, requestData);

  return response.data;
};
export const resumeTask = async (taskId, data) => {
  const response = await api.post(`/tasks/${taskId}/resume`, data);
  return response.data;
};
