import { authFetch } from "./authToken";

const USE_GUIDE_MOCK =
  import.meta.env.MODE === "mock" ||
  import.meta.env.VITE_USE_GUIDE_MOCK === "true";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "https://api.vora-heritage.click"
).replace(/\/+$/, "");

export async function uploadPhoto(file, artifactId) {
  if (USE_GUIDE_MOCK) {
    return URL.createObjectURL(file);
  }

  if (!artifactId) {
    throw new Error("artifactId가 없어 사진을 업로드할 수 없습니다.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("artifactId", artifactId);

  const response = await authFetch(`${API_BASE}/photos/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("사진 업로드 실패");
  }

  const data = await response.json();
  return data.url;
}
