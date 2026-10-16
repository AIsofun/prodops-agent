import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  configFile: false,
  build: {
    outDir: fileURLToPath(new URL("dist/preload", import.meta.url)),
    emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL("src/preload/index.ts", import.meta.url)), formats: ["cjs"], fileName: () => "index.js" },
    rolldownOptions: { external: ["electron"] },
  },
});
