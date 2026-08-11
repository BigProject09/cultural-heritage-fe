/**
 * 회원 mock. xrayApi.js/potteryInspectionApi.js와 같은 규칙 - .env에
 * VITE_USE_USER_MOCK=true로 켠다.
 *
 * login()은 실제로도 토큰만 반환하므로(jwt.js가 payload를 디코드해
 * email/role을 읽는 구조), mock 토큰도 header.payload.signature 형태의
 * base64url 문자열로 만들어야 로그인 후 화면이 정상 동작한다.
 */
const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const users = [
  { email: "admin@vora.io", password: "adminpass1", nickName: "관리자", role: "ADMIN" },
  { email: "user@vora.io", password: "userpass1", nickName: "김보존", role: "USER" },
];

let nextUserId = users.length + 1;

function base64UrlEncode(value) {
  const json = JSON.stringify(value);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createMockToken({ email, role }) {
  const header = base64UrlEncode({ alg: "none", typ: "JWT" });
  const payload = base64UrlEncode({
    sub: email,
    role,
    iat: Math.floor(Date.now() / 1000),
  });
  return `${header}.${payload}.mock-signature`;
}

export async function mockSignup({ email, password, nickName }) {
  await delay(300);

  if (users.some((user) => user.email === email)) {
    throw new Error("이미 가입된 이메일이거나 처리 중 오류가 발생했습니다.");
  }

  users.push({ email, password, nickName, role: "USER" });

  return nextUserId++;
}

export async function mockLogin({ email, password }) {
  await delay(300);

  const user = users.find(
    (item) => item.email === email && item.password === password,
  );

  if (!user) {
    throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  return { token: createMockToken(user) };
}

export async function mockLogout() {
  await delay(100);
  return null;
}
