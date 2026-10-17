import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = path.resolve(root, process.argv[2] ?? ".quality-reports/lifecycle-integration");
const allowed = path.resolve(root, ".quality-reports");
fs.mkdirSync(allowed, { recursive: true });
const records = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function alive(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }
function listening(port) { return new Promise(resolve => { const request = http.get({ hostname: "127.0.0.1", port, path: "/health/live" }, response => { response.resume(); resolve(true); }); request.setTimeout(1000, () => request.destroy()); request.on("error", () => resolve(false)); }); }
function launch(phase, data, script = "lifecycle.cjs") {
  const env = { ...process.env, PRODOPS_LIFECYCLE_PHASE: phase, PRODOPS_SMOKE_USER_DATA: data, PRODOPS_SMOKE_OUTPUT: path.join(output, phase) };
  for (const key of ["PRODOPS_SERVICE_PORT", "PRODOPS_SERVICE_MODE", "PRODOPS_RENDERER_URL", "PRODOPS_SMOKE_BUSINESS", "PRODOPS_SMOKE_WORKSPACE", "PRODOPS_SMOKE_FAULT"]) delete env[key];
  if (phase === "recover") { env.PRODOPS_SMOKE_FAULT = "recover"; env.PRODOPS_SMOKE_GATE = path.join(data, "release-mock-reads.test"); env.PRODOPS_EXPECT_CONNECTION = "ready"; }
  const child = spawn(require("electron"), [path.join(root, "apps/desktop/tests", script)], { cwd: root, env, windowsHide: true, stdio: "inherit" });
  const timer = setTimeout(() => child.kill(), 45000);
  const exited = new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); }).finally(() => clearTimeout(timer));
  return { child, exited };
}
const inspect = `import asyncio,json,sys\nfrom pathlib import Path\nfrom uuid import UUID\nfrom prodops.adapters.storage.events import SQLiteEventStore\nasync def check():\n s=SQLiteEventStore(Path(sys.argv[1]));await s.start();r=await s.get_run(UUID(sys.argv[2]));print(json.dumps({'status':r.status,'unknown_calls':len(r.unknown_tool_call_ids),'evidence_count':len(r.evidence),'error_code':r.error.code if r.error else None,'last_seq':r.last_event_seq}));await s.close()\nasyncio.run(check())`;
function storedRun(data, runId) {
  const result = spawnSync(path.join(root, ".venv/Scripts/python.exe"), ["-c", inspect, path.join(data, "agent/prodops.sqlite3"), runId], { cwd: root, encoding: "utf8", windowsHide: true, timeout: 10000 });
  if (result.status !== 0) throw new Error("Isolated lifecycle history inspection failed");
  return JSON.parse(result.stdout);
}
const phases = process.argv[3] ? [process.argv[3]] : ["tray", "pipe", "parent"];
if (phases.some(phase => !["tray", "pipe", "parent"].includes(phase))) throw new Error("Unknown lifecycle verification phase");
for (const phase of phases) {
  const data = fs.mkdtempSync(path.join(allowed, "lifecycle-data-"));
  let owned;
  try {
    const previousReady = path.join(output, phase, "parent-ready.json");
    if (phase === "parent" && fs.existsSync(previousReady)) fs.unlinkSync(previousReady);
    const { child, exited } = launch(phase, data);
    owned = { child, exited };
    if (phase === "tray" || phase === "pipe") {
      if (await exited !== 0) throw new Error("Tray lifecycle failed");
      const report = JSON.parse(fs.readFileSync(path.join(output, phase, "runtime.json"), "utf8"));
      owned.servicePid = report.service_pid;
      if (await listening(report.service_port) || alive(report.service_pid)) throw new Error("Explicit quit left the owned service alive");
      if (phase === "pipe") {
        const stored = storedRun(data, report.run_id);
        report.stored = stored;
        fs.writeFileSync(path.join(output, phase, "runtime.json"), JSON.stringify(report, null, 2) + "\n");
        if (stored.status !== "recovery_required" || stored.unknown_calls !== 1) throw new Error("Private pipe grace did not retain unknown result: " + JSON.stringify(stored));
      }
      records.push(report); console.log(phase === "tray" ? "PASS: actual native tray, hidden execution, single instance, restore and explicit service exit" : "PASS: actual private channel EOF, bounded graceful shutdown and unknown in-flight result retained");
    } else {
      const readyPath = path.join(output, phase, "parent-ready.json");
      for (let index = 0; index < 400 && !fs.existsSync(readyPath); index++) await pause(50);
      if (!fs.existsSync(readyPath)) { child.kill(); await exited; throw new Error("Parent fault fixture not ready"); }
      const report = JSON.parse(fs.readFileSync(readyPath, "utf8"));
      if (report.parent_pid !== child.pid) throw new Error("Unexpected parent identity");
      owned.servicePid = report.service_pid;
      const started = Date.now(); child.kill(); await exited;
      for (let index = 0; index < 300 && alive(report.service_pid); index++) await pause(50);
      if (alive(report.service_pid) || await listening(report.service_port)) throw new Error("Parent pipe EOF left service alive");
      const stored = storedRun(data, report.run_id);
      if (!["running", "cancelling", "recovery_required"].includes(stored.status) || stored.evidence_count !== 0) throw new Error("Unconfirmed parent-exit result was fabricated");
      const final = { ...report, status: "PASS", parent_hard_exit: true, owned_service_exited: true, service_port_closed: true,
        elapsed_ms: Date.now() - started, stored };
      fs.writeFileSync(path.join(output, phase, "runtime.json"), JSON.stringify(final, null, 2) + "\n"); records.push(final);
      const reopened = launch("recover", data, "smoke.cjs");
      if (await reopened.exited !== 0) throw new Error("Parent-exit reviewed recovery failed");
      const reviewed = JSON.parse(fs.readFileSync(path.join(output, "recover/runtime.json"), "utf8")).renderer.fault;
      if (reviewed.unknown_calls !== 1 || reviewed.status !== "succeeded" || !reviewed.explicit_review_required) throw new Error("Restart did not require review");
      final.review_after_real_restart = reviewed;
      fs.writeFileSync(path.join(output, phase, "runtime.json"), JSON.stringify(final, null, 2) + "\n");
      console.log("PASS: actual parent hard exit, private pipe EOF, no owned service remaining and reviewed recovery after restart");
    }
  } finally {
    if (owned && owned.child.exitCode === null && owned.child.signalCode === null) { owned.child.kill(); await owned.exited; }
    if (owned?.servicePid) {
      for (let index = 0; index < 300 && alive(owned.servicePid); index++) await pause(50);
      if (alive(owned.servicePid)) throw new Error("Owned service must exit before isolated data cleanup");
    }
    const target = path.resolve(data);
    if (!target.startsWith(allowed + path.sep)) throw new Error("Invalid lifecycle cleanup path");
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}
fs.writeFileSync(path.join(output, "summary.json"), JSON.stringify({ status: "PASS", records }, null, 2) + "\n");
