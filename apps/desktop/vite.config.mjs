import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  build: { outDir: "dist/renderer", emptyOutDir: true, rolldownOptions: { input: { index: fileURLToPath(new URL("index.html", import.meta.url)), credentials: fileURLToPath(new URL("credentials.html", import.meta.url)) } } },
  server: { host: "127.0.0.1" },
  plugins: [{
    name: "development-csp",
    apply: "serve",
    transformIndexHtml(html) {
      return html.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
        .replace("connect-src 'none'", "connect-src 'self' ws://127.0.0.1:*");
    },
  }],
});
