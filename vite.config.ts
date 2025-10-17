import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // ⛔ Don’t watch folders that may change during dev
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/build/**",
        "**/public/**",          // if you drop IPFS/json dumps here
        "**/tmp/**",
        "**/.cache/**",
      ],
    },
  },
});
