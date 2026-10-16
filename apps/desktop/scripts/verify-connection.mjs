import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = path.resolve(root, process.argv[2] ?? ".quality-reports/connection-integration");
fs.mkdirSync(output, { recursive: true });
const scenarios = [];
async function smoke(name, port, mode, expected) {
  const target = path.join(output, name);
  const child = spawn(process.execPath, ["apps/desktop/scripts/smoke.mjs", target], { cwd: root, stdio: "inherit", windowsHide: true,
    env: { ...process.env, PRODOPS_SERVICE_PORT: String(port), PRODOPS_SERVICE_MODE: mode, PRODOPS_EXPECT_CONNECTION: expected } });
  const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", resolve); });
  scenarios.push({ name, expected, exit_code: code, status: code === 0 ? "PASS" : "FAIL", evidence: path.relative(root, path.join(target, "runtime.json")).replaceAll("\\", "/") });
  if (code !== 0) throw new Error(`Connection scenario failed: ${name}`);
}
async function startService(mode) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("PRODOPS_")));
  const child = spawn(path.join(root, process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python"),
    ["-m", "prodops.bootstrap.cli", "--mode", mode], { cwd: root, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let text = "";
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Service startup timeout")), 20000);
      function read(chunk) {
        text += chunk.toString();
        const match = /Uvicorn running on http:\/\/127\.0\.0\.1:(\d+)/.exec(text);
        if (match) { clearTimeout(timer); resolve(Number(match[1])); }
      }
      child.stdout.on("data", read); child.stderr.on("data", read);
      child.on("error", (error) => { clearTimeout(timer); reject(error); });
      child.on("exit", () => { clearTimeout(timer); reject(new Error("Service exited before ready")); });
    });
    return { child, port };
  } catch (error) { child.kill(); throw error; }
}
try {
  for (const mode of ["local", "server"]) {
    const { child, port } = await startService(mode);
    try { await smoke(`ready-${mode}`, port, mode, "ready"); }
    finally { child.kill(); await new Promise((resolve) => child.once("exit", resolve)); }
    await smoke(`offline-${mode}`, port, mode, "offline");
  }
  const fixture = http.createServer((request, response) => {
    response.writeHead(request.url === "/health/ready" ? 200 : 426, { "Content-Type": "application/json" });
    response.end(JSON.stringify(request.url === "/health/ready" ? { status: "ready", mode: "local", scope: "service_skeleton" } : { error: { code: "incompatible_protocol", message: "Fixture protocol mismatch", retryable: false }, request_id: "11111111-1111-4111-8111-111111111111" }));
  });
  await new Promise((resolve) => fixture.listen(0, "127.0.0.1", resolve));
  try { await smoke("incompatible-fixture", fixture.address().port, "local", "incompatible"); }
  finally { fixture.closeAllConnections(); await new Promise((resolve) => fixture.close(resolve)); }
  console.log("PASS: real Python local/server connections, offline transitions and explicit mismatch fixture");
} finally {
  fs.writeFileSync(path.join(output, "integration.json"), JSON.stringify({ status: scenarios.length === 5 && scenarios.every((s) => s.status === "PASS") ? "PASS" : "FAIL", scenarios, limitations: "Development services only. Python children terminated for isolated test cleanup; graceful service lifecycle remains M3." }, null, 2) + "\n");
}
