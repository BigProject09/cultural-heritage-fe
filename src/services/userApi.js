import { request } from "./backendApi";
import { mockLogin, mockLogout, mockSignup } from "./userMock";

const USE_MOCK = import.meta.env.VITE_USE_USER_MOCK === "true";

export function signup({ loginId, email, password, nickName }) {
  if (USE_MOCK) return mockSignup({ loginId, email, password, nickName });

  return request("/api/users/signup", {
    method: "POST",
    body: JSON.stringify({ loginId, email, password, nickName }),
    fallback500Message: "이미 사용 중인 아이디/이메일이거나 처리 중 오류가 발생했습니다.",
  });
}

export function login({ loginId, password }) {
  if (USE_MOCK) return mockLogin({ loginId, password });

  return request("/api/users/login", {
    method: "POST",
    body: JSON.stringify({ loginId, password }),
    fallback500Message: "아이디 또는 비밀번호가 올바르지 않습니다.",
  });
}

export function logout() {
  if (USE_MOCK) return mockLogout();

  return request("/api/users/logout", { method: "POST" });
}
