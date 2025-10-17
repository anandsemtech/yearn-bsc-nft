import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __LIT_DEV_MODE__: false, // silence lit dev warning in prod bundle
  },
  build: { sourcemap: false, minify: "esbuild" },
});
