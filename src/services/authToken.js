/**
 * 로그인 세션에서 JWT access token을 읽고 Spring API 요청에 붙이는 공통 헬퍼.
 *
 * S3 presigned URL처럼 외부 스토리지로 직접 요청할 때는 이 헬퍼를 사용하지 않는다.
 */
export function getAccessToken() {
  try {
    const loginUser = JSON.parse(localStorage.getItem("loginUser") || "null");
    return loginUser?.accessToken || loginUser?.token || "";
  } catch {
    return "";
  }
}

export function withAuthHeaders(headersInit) {
  const headers = new Headers(headersInit || {});
  const token = getAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

export function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: withAuthHeaders(options.headers),
  });
}
