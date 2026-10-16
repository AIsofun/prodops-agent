import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build, createServer } from "vite";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(import.meta.url);
const compiler = spawn(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "apps/desktop/tsconfig.electron.json"], { cwd: root, stdio: "inherit", windowsHide: true });
const code = await new Promise((resolve) => compiler.once("exit", resolve));
if (code !== 0) process.exit(1);
await build({ configFile: fileURLToPath(new URL("../vite.preload.config.mjs", import.meta.url)) });
const server = await createServer({ configFile: fileURLToPath(new URL("../vite.config.mjs", import.meta.url)), server: { port: 0 } });
await server.listen();
const address = server.httpServer.address();
if (!address || typeof address === "string") throw new Error("Missing Vite port");
const child = spawn(require("electron"), ["apps/desktop"], { cwd: root, stdio: "inherit", windowsHide: true, env: { ...process.env, PRODOPS_RENDERER_URL: `http://127.0.0.1:${address.port}/` } });
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (child.exitCode === null) child.kill();
  await server.close();
  process.exitCode = code;
}
child.on("error", async () => { await stop(1); });
child.on("exit", async (code) => { await stop(code ?? 1); });
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
