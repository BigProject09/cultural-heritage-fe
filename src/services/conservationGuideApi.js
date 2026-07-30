import api from "./api";

export const startTask = async (taskId, data) => {
  const response = await api.post(`/tasks/${taskId}/start`, data);
  return response.data;
};

export const resumeTask = async (taskId, data) => {
  const response = await api.post(`/tasks/${taskId}/resume`, data);
  return response.data;
};