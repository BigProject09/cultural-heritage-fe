/**
 * 회원 mock. .env에서 VITE_USE_USER_MOCK=true로 켠다.
 * 실제 API와 동일하게 loginId 기반 로그인 및 사용자 프로필을 반환한다.
 */
const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const users = [
  {
    loginId: "admin01",
    email: "admin@vora.io",
    password: "adminpass1!",
    nickName: "관리자",
    role: "ADMIN",
  },
  {
    loginId: "user01",
    email: "user@vora.io",
    password: "userpass1!",
    nickName: "김보존",
    role: "USER",
  },
];

let nextUserId = users.length + 1;

function base64UrlEncode(value) {
  const json = JSON.stringify(value);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createMockToken({ loginId, role }) {
  const header = base64UrlEncode({ alg: "none", typ: "JWT" });
  const payload = base64UrlEncode({
    sub: loginId,
    role,
    iat: Math.floor(Date.now() / 1000),
  });
  return `${header}.${payload}.mock-signature`;
}

export async function mockSignup({ loginId, email, password, nickName }) {
  await delay(300);

  if (users.some((user) => user.loginId === loginId)) {
    throw new Error("이미 사용 중인 아이디입니다.");
  }

  if (users.some((user) => user.email === email)) {
    throw new Error("이미 사용 중인 이메일입니다.");
  }

  users.push({ loginId, email, password, nickName, role: "USER" });
  return nextUserId++;
}

export async function mockLogin({ loginId, password }) {
  await delay(300);

  const user = users.find(
    (item) => item.loginId === loginId && item.password === password,
  );

  if (!user) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  return {
    token: createMockToken(user),
    loginId: user.loginId,
    email: user.email,
    nickName: user.nickName,
    role: user.role,
  };
}

export async function mockLogout() {
  await delay(100);
  return null;
}
