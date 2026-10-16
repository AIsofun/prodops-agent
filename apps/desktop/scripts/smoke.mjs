import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = process.argv[2] ?? ".quality-reports/desktop-smoke";
let server;
const env = { ...process.env, PRODOPS_SMOKE_OUTPUT: output };
delete env.PRODOPS_RENDERER_URL;
if (process.argv.includes("--dev")) {
  server = await createServer({ configFile: fileURLToPath(new URL("../vite.config.mjs", import.meta.url)), server: { port: 0 } });
  await server.listen();
  const address = server.httpServer.address();
  if (!address || typeof address === "string") throw new Error("Missing Vite port");
  env.PRODOPS_RENDERER_URL = `http://127.0.0.1:${address.port}/`;
}
const child = spawn(require("electron"), ["apps/desktop/tests/smoke.cjs"], { cwd: root, stdio: "inherit", windowsHide: true, env });
const timer = setTimeout(() => { child.kill(); process.exitCode = 1; }, 40000);
child.on("error", async (error) => { clearTimeout(timer); console.error(error); await server?.close(); process.exitCode = 1; });
child.on("exit", async (code) => {
  clearTimeout(timer);
  await server?.close();
  const report = path.resolve(root, output, "runtime.json");
  if (code === 0 && fs.existsSync(report)) {
    const result = JSON.parse(fs.readFileSync(report, "utf8"));
    result.process_exit_code = code;
    result.mode = server ? "vite-development" : "built-renderer";
    fs.writeFileSync(report, JSON.stringify(result, null, 2) + "\n");
    console.log(`PASS: actual Electron window (${result.mode}), security probes and exit; ${report}`);
  } else process.exitCode = code || 1;
});
