import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "spa-fallback",
      closeBundle() {
        const index = resolve(import.meta.dirname, "dist/index.html");
        copyFileSync(index, resolve(import.meta.dirname, "dist/404.html"));
      },
    },
  ],
  server: {
    port: 4173,
    host: true,
  },
});
