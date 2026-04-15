import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "../polyplace-watcher/frontend",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/ws": {
        target: "ws://127.0.0.1:8000",
        ws: true,
      },
    },
  },
});
