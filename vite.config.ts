import { defineConfig } from "vite";

// WebXR requires a secure context (HTTPS or localhost).
// localhost is treated as a secure context by supported browsers, so plain
// `vite` dev over localhost is sufficient for development. For LAN/headset
// testing over an IP address, run with `--host` and provide HTTPS certs.
export default defineConfig({
  base: "./",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: "es2020",
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
  },
});
