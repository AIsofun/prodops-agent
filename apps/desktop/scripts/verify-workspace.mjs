import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = path.resolve(root, process.argv[2] ?? ".quality-reports/workspace-integration");
const allowed = path.resolve(root, ".quality-reports");
fs.mkdirSync(allowed, { recursive: true });
const userData = fs.mkdtempSync(path.join(allowed, "workspace-data-"));
async function launch(phase, expected) {
  const env = { ...process.env, PRODOPS_SMOKE_USER_DATA: userData, PRODOPS_SMOKE_OUTPUT: path.join(output, phase),
    PRODOPS_SMOKE_WORKSPACE: phase, PRODOPS_EXPECT_CONNECTION: "ready", PRODOPS_EXPECT_CONVERSATION: expected ?? "" };
  for (const key of ["PRODOPS_SERVICE_PORT", "PRODOPS_SERVICE_MODE", "PRODOPS_RENDERER_URL", "PRODOPS_SMOKE_BUSINESS"]) delete env[key];
  const child = spawn(require("electron"), ["apps/desktop/tests/smoke.cjs"], { cwd: root, env, windowsHide: true, stdio: "inherit" });
  const timer = setTimeout(() => child.kill(), 100000);
  const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); }).finally(() => clearTimeout(timer));
  if (code !== 0) throw new Error(`Workspace desktop ${phase} failed`);
  const report = path.join(output, phase, "runtime.json");
  const result = JSON.parse(fs.readFileSync(report, "utf8"));
  result.process_exit_code = code;
  fs.writeFileSync(report, JSON.stringify(result, null, 2) + "\n");
  return result.renderer.workspace;
}
try {
  const created = await launch("create");
  const reopened = await launch("reopen", created.conversation_id);
  fs.writeFileSync(path.join(output, "summary.json"), JSON.stringify({ status: "PASS", created, reopened }, null, 2) + "\n");
  console.log("PASS: actual Electron interaction, scoped drafts/context, pagination and persisted history after full service restart");
} finally {
  const target = path.resolve(userData);
  if (!target.startsWith(allowed + path.sep)) throw new Error("Invalid workspace test cleanup path");
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
