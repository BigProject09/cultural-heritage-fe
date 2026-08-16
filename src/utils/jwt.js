/** JWT payload를 디코드한다. 서명 검증은 서버 책임이므로 클라이언트는 파싱만 한다. */
export function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => "%" + char.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}
