/**
 * 로그인 API는 토큰만 반환하고 닉네임을 주지 않는다. 같은 브라우저에서
 * 가입한 계정이면 표시명을 이어서 보여주기 위해 이메일별 닉네임을 로컬에 캐시해둔다.
 */
const STORAGE_KEY = "nicknameCache";

function readCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

export function rememberNickname(email, nickname) {
  if (!email || !nickname) return;
  const cache = readCache();
  cache[email] = nickname;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

export function recallNickname(email) {
  if (!email) return null;
  return readCache()[email] || null;
}
