import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// 프록시 대상을 다른 서비스(backendApi.js, xrayApi.js 등)와 동일하게
// VITE_API_BASE_URL에서 읽는다. .env/.env.local에 값이 없으면 기존과 같이
// http://localhost:8080으로 대체한다.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_API_BASE_URL || "http://localhost:8080";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/tasks": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/pottery-inspection": {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});