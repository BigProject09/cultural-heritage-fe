const USE_GUIDE_MOCK =
  import.meta.env.MODE === "mock" ||
  import.meta.env.VITE_USE_GUIDE_MOCK === "true";

// xrayApi.js / api.js와 같은 규칙: VITE_API_BASE_URL이 있으면 그 값을,
// 없으면 로컬 개발 기본값(localhost:8080)을 쓴다.
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8080"
).replace(/\/+$/, "");

export async function uploadPhoto(file) {
  if (USE_GUIDE_MOCK) {
    return URL.createObjectURL(file);
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/photos/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("사진 업로드 실패");
  }

  const data = await response.json();
  return data.url;
}
