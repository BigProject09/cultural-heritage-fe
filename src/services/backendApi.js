/**
 * 회원/게시판/공지사항용 공용 백엔드 요청 헬퍼.
 *
 * data/workspaceProjects.js의 request()/getAccessToken() 패턴을 그대로 따르되,
 * 이 도메인에서만 쓰기 위해 별도로 둔다(기존 워크스페이스 흐름에 영향 없도록).
 */

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "https://api.vora-heritage.click"
).replace(/\/+$/, "");

const STATUS_FALLBACK_MESSAGE = {
  400: "입력값을 확인해주세요.",
  401: "로그인이 필요합니다.",
  403: "권한이 없습니다.",
  404: "요청한 정보를 찾을 수 없습니다.",
};

function getAccessToken() {
  try {
    const loginUser = JSON.parse(localStorage.getItem("loginUser") || "null");

    return loginUser?.accessToken || loginUser?.token || "";
  } catch {
    return "";
  }
}

function resolveErrorMessage(status, payload, fallback500Message) {
  const validationMessage = Array.isArray(payload?.errors)
    ? payload.errors[0]?.defaultMessage
    : null;

  return (
    validationMessage ||
    payload?.message ||
    (status === 500
      ? fallback500Message || "서버 오류가 발생했습니다."
      : STATUS_FALLBACK_MESSAGE[status]) ||
    `요청에 실패했습니다. (HTTP ${status})`
  );
}

/**
 * @param {string} path
 * @param {RequestInit & { fallback500Message?: string }} options
 */
export async function request(path, options = {}) {
  const { fallback500Message, ...fetchOptions } = options;
  const token = getAccessToken();
  const headers = new Headers(fetchOptions.headers || {});

  if (fetchOptions.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error(
      "백엔드 서버에 연결할 수 없습니다. 서버 실행 여부와 VITE_API_BASE_URL을 확인하세요.",
      { cause: error },
    );
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(response.status, payload, fallback500Message),
    );
  }

  return payload;
}
