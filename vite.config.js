import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/tasks": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/pottery-inspection": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});