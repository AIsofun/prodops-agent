import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = path.resolve(root, process.argv[2] ?? ".quality-reports/desktop-ui");
const allowed = path.resolve(root, ".quality-reports");
fs.mkdirSync(allowed, { recursive: true });
const userData = fs.mkdtempSync(path.join(allowed, "ui-data-"));
try {
  const results = [];
  for (const phase of ["create", "reopen"]) {
    const env = { ...process.env, PRODOPS_SMOKE_USER_DATA: userData, PRODOPS_SMOKE_OUTPUT: path.join(output, phase), PRODOPS_SMOKE_UI: phase };
    for (const key of ["PRODOPS_SERVICE_PORT", "PRODOPS_SERVICE_MODE", "PRODOPS_RENDERER_URL", "PRODOPS_SMOKE_WORKSPACE", "PRODOPS_SMOKE_FAULT"]) delete env[key];
    const child = spawn(require("electron"), ["apps/desktop/tests/smoke.cjs"], { cwd: root, env, windowsHide: true, stdio: "inherit" });
    const timer = setTimeout(() => child.kill(), 100000);
    const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); }).finally(() => clearTimeout(timer));
    if (code !== 0) throw new Error(`Desktop UI ${phase} failed`);
    results.push(JSON.parse(fs.readFileSync(path.join(output, phase, "runtime.json"), "utf8")).renderer.ui);
  }
  fs.writeFileSync(path.join(output, "summary.json"), JSON.stringify({ status: "PASS", results }, null, 2) + "\n");
  console.log("PASS: actual Electron UI, window controls, separate inactive profiles and restart persistence");
} finally {
  if (!path.resolve(userData).startsWith(allowed + path.sep)) throw new Error("Unsafe UI test cleanup");
  fs.rmSync(userData, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
