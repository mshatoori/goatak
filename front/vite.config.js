import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// List of endpoints to proxy to webclient
const webclientEndpoints = ["^/api"];

const proxy = {
  "/auth": {
    target: "http://auth-service:8080",
    changeOrigin: true,
  },
  "/ws": {
    target: "http://webclient:8080",
    ws: true,
    changeOrigin: true,
  },
  "/api": {
    target: "http://webclient:8080",
    changeOrigin: true,
    // rewrite: (path) => path.replace(/^\/api/, ""),
  },
};

export default defineConfig({
  base: "",
  plugins: [vue()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      usePolling: true,
    },
    proxy: proxy,
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "index.html",
      output: {
        entryFileNames: "js/[name].js",
        chunkFileNames: "js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "css/[name]-[hash][extname]";
          }
          return "[name]-[hash][extname]";
        },
      },
    },
  },
});
