import { request } from "./backendApi";
import { mockLogin, mockLogout, mockSignup } from "./userMock";

const USE_MOCK = import.meta.env.VITE_USE_USER_MOCK === "true";

export function signup({ email, password, nickName }) {
  if (USE_MOCK) return mockSignup({ email, password, nickName });

  return request("/api/users/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, nickName }),
    fallback500Message: "이미 가입된 이메일이거나 처리 중 오류가 발생했습니다.",
  });
}

export function login({ email, password }) {
  if (USE_MOCK) return mockLogin({ email, password });

  return request("/api/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    fallback500Message: "이메일 또는 비밀번호가 올바르지 않습니다.",
  });
}

export function logout() {
  if (USE_MOCK) return mockLogout();

  return request("/api/users/logout", { method: "POST" });
}
