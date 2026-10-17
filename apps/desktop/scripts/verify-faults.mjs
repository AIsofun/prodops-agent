import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = path.resolve(root, process.argv[2] ?? ".quality-reports/desktop-faults");
const allowed = path.resolve(root, ".quality-reports");
fs.mkdirSync(allowed, { recursive: true });
const cases = [];
async function launch(mode, userData, gate) {
  const env = { ...process.env, PRODOPS_SMOKE_USER_DATA: userData, PRODOPS_SMOKE_OUTPUT: path.join(output, mode),
    PRODOPS_SMOKE_FAULT: mode, PRODOPS_SMOKE_GATE: gate, PRODOPS_EXPECT_CONNECTION: "ready" };
  for (const key of ["PRODOPS_SERVICE_PORT", "PRODOPS_SERVICE_MODE", "PRODOPS_RENDERER_URL", "PRODOPS_SMOKE_BUSINESS", "PRODOPS_SMOKE_WORKSPACE"]) delete env[key];
  const child = spawn(require("electron"), ["apps/desktop/tests/smoke.cjs"], { cwd: root, env, windowsHide: true, stdio: "inherit" });
  const timer = setTimeout(() => child.kill(), 60000);
  const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); }).finally(() => clearTimeout(timer));
  if (code !== 0) throw new Error(`Desktop fault case ${mode} failed`);
  const report = path.join(output, mode, "runtime.json");
  const result = JSON.parse(fs.readFileSync(report, "utf8")); result.process_exit_code = code;
  fs.writeFileSync(report, JSON.stringify(result, null, 2) + "\n");
  cases.push(result.renderer.fault);
  console.log(`PASS: actual Electron ${mode}`);
}
for (const mode of ["cancel", "disconnect", "expired", "gap", "crash"]) {
  const userData = fs.mkdtempSync(path.join(allowed, "fault-data-"));
  const gate = path.join(userData, "release-mock-reads.test");
  try {
    await launch(mode, userData, gate);
    if (mode === "crash") await launch("recover", userData, gate);
  } finally {
    const target = path.resolve(userData);
    if (!target.startsWith(allowed + path.sep)) throw new Error("Invalid fault test cleanup path");
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}
fs.writeFileSync(path.join(output, "summary.json"), JSON.stringify({ status: "PASS", cases }, null, 2) + "\n");
