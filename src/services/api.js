import axios from "axios";

// xrayApi.js와 같은 규칙: VITE_API_BASE_URL이 있으면 그 값을, 없으면
// 로컬 개발 기본값(localhost:8080)을 쓴다. dev 서버 proxy에 기대지 않고
// 항상 절대 주소로 요청을 보내므로, 배포 환경이 바뀌어도 이 값만 바꾸면 된다.
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8080"
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
