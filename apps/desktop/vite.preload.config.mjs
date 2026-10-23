import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  configFile: false,
  build: {
    outDir: fileURLToPath(new URL("dist/preload", import.meta.url)),
    emptyOutDir: true,
    lib: { entry: { index: fileURLToPath(new URL("src/preload/index.ts", import.meta.url)), "model-key": fileURLToPath(new URL("src/preload/model-key.ts", import.meta.url)) }, formats: ["cjs"], fileName: (_format, name) => `${name}.js` },
    rolldownOptions: { external: ["electron"] },
  },
});
