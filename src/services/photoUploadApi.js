import { authFetch } from "./authToken";

const USE_GUIDE_MOCK =
  import.meta.env.MODE === "mock" ||
  import.meta.env.VITE_USE_GUIDE_MOCK === "true";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "https://api.vora-heritage.click"
).replace(/\/+$/, "");

// 장기 복원이 필요한 화면은 URL뿐 아니라 S3 key도 보관해야 한다.
// presigned URL은 만료되므로 페이지 재진입 시 key로 새 URL을 발급받는다.
export async function uploadPhotoAsset(file, artifactId) {
  if (USE_GUIDE_MOCK) {
    return { url: URL.createObjectURL(file), key: "" };
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
  return { url: data.url, key: data.key || "" };
}

// 기존 세척/강화 등 URL만 필요한 화면의 호환 API는 유지한다.
export async function uploadPhoto(file, artifactId) {
  const asset = await uploadPhotoAsset(file, artifactId);
  return asset.url;
}

export async function refreshPhotoUrl(artifactId, key) {
  if (!key) return "";
  if (USE_GUIDE_MOCK) return "";
  if (!artifactId) {
    throw new Error("artifactId가 없어 사진 URL을 갱신할 수 없습니다.");
  }

  const query = new URLSearchParams({ artifactId, key });
  const response = await authFetch(`${API_BASE}/photos/url?${query.toString()}`);

  if (!response.ok) {
    throw new Error("사진 URL 갱신 실패");
  }

  const data = await response.json();
  return data.url || "";
}
