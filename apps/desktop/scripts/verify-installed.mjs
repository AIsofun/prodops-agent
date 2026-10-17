import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import net from "node:net";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const output = path.resolve(root, process.argv[2] ?? ".quality-reports/installed-verification");
const phase = process.argv[3] ?? "run";
const testRoot = path.resolve(root, ".quality-reports/installed-development");
const installation = path.join(testRoot, "application");
const profile = path.join(testRoot, "profile");
const executable = path.join(installation, "ProdOps Dev.exe");
const installer = path.join(root, ".quality-reports/installers/ProdOps-Dev-0.1.0-windows-x64-setup.exe");
const system = process.env.SystemRoot;
if (process.platform !== "win32" || !system) throw new Error("Windows verification required");
fs.mkdirSync(output, { recursive: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const ps = path.join(system, "System32/WindowsPowerShell/v1.0/powershell.exe");
const quote = value => "'" + value.replaceAll("'", "''") + "'";
function powershell(script) {
  const result = spawnSync(ps, ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script], {
    env: { ...process.env, PSModulePath: path.join(system, "System32/WindowsPowerShell/v1.0/Modules") }, encoding: "utf8", windowsHide: true, timeout: 20000 });
  if (result.status !== 0) throw new Error("Installed process inspection failed: " + (result.error?.code ?? result.status) + ": " + result.stderr?.slice(-1500));
  return result.stdout.trim();
}
async function execute(file, args, timeout = 120000) {
  const child = spawn(file, args, { cwd: testRoot, windowsHide: true, stdio: "ignore" });
  const timer = setTimeout(() => child.kill(), timeout);
  const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); }).finally(() => clearTimeout(timer));
  if (code !== 0) throw new Error("Installer/uninstaller did not complete successfully");
}
function checksum(file) { return createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
if (phase === "install") {
  if (fs.existsSync(installation)) throw new Error("Isolated installation already exists; inspect before replacing it");
  const registry = spawnSync(path.join(system, "System32/reg.exe"), ["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\b2a4cd7e-73c6-4ee8-8c39-9c12f534ef15"], { windowsHide: true, encoding: "utf8" });
  if (registry.status === 0) throw new Error("Development installer identity already registered; no existing installation will be overwritten");
  fs.mkdirSync(testRoot, { recursive: true });
  const signature = powershell(`(Get-AuthenticodeSignature -LiteralPath ${quote(installer)}).Status.ToString()`);
  if (signature !== "NotSigned") throw new Error("Expected an explicitly unsigned development installer");
  await execute(installer, ["/S", "/CURRENTUSER", `/D=${installation}`]);
  if (!fs.existsSync(executable) || !fs.existsSync(path.join(installation, "resources/agent/prodops-agent.exe"))) throw new Error("Required installed runtime missing");
  fs.writeFileSync(path.join(output, "installation.json"), JSON.stringify({ status: "PASS", installer_sha256: checksum(installer), signature,
    installation, executable, contains_electron: true, contains_frozen_python: true, current_user_only: true, published: false }, null, 2) + "\n");
  console.log("PASS: unsigned offline development installer installed into isolated workspace directory");
} else if (phase === "uninstall") {
  const uninstaller = fs.readdirSync(installation).find(name => /^Uninstall.*\.exe$/i.test(name));
  if (!uninstaller) throw new Error("Owned development uninstaller missing");
  await execute(path.join(installation, uninstaller), ["/S", "/CURRENTUSER"]);
  for (let index = 0; index < 200 && fs.existsSync(executable); index++) await pause(50);
  if (fs.existsSync(executable)) throw new Error("Owned development application still installed");
  fs.writeFileSync(path.join(output, "uninstallation.json"), JSON.stringify({ status: "PASS", application_removed: true,
    isolated_history_retained: fs.existsSync(path.join(profile, "agent/prodops.sqlite3")) }, null, 2) + "\n");
  console.log("PASS: isolated development app uninstalled; test history retained");
} else if (phase === "run") {
  if (!fs.existsSync(executable)) throw new Error("Install the isolated development build first");
  const outside = path.join(testRoot, "empty-working-directory"); fs.mkdirSync(outside, { recursive: true });
  const runtime = [];
  async function launch(mode, conversation) {
    const server = net.createServer(); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port; await new Promise(resolve => server.close(resolve));
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(PRODOPS_|PYTHON|ELECTRON_RUN_AS_NODE)/i.test(key)));
    env.PATH = path.join(system, "System32") + ";" + system;
    const child = spawn(executable, [`--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1"], { cwd: outside, env, windowsHide: true, stdio: "ignore" });
    const exited = new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); });
    const timer = setTimeout(() => child.kill(), 45000);
    let socket;
    try {
      let target;
      for (let index = 0; index < 400; index++) {
        const targets = await new Promise(resolve => {
          const request = http.get({ hostname: "127.0.0.1", port, path: "/json/list" }, response => {
            let body = ""; response.on("data", chunk => { body += chunk; }); response.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve([]); } });
          }); request.setTimeout(1000, () => request.destroy()); request.on("error", () => resolve([]));
        });
        target = targets.find(item => item.type === "page" && item.url.includes("app.asar/renderer/index.html"));
        if (target) break;
        if (child.exitCode !== null) throw new Error("Installed app exited before rendering");
        await pause(50);
      }
      if (!target) throw new Error("Installed app page did not become available");
      if (!decodeURIComponent(target.url).toLowerCase().includes(installation.replaceAll("\\", "/").toLowerCase())) throw new Error("Unexpected installed page identity");
      const address = new URL(target.webSocketDebuggerUrl);
      if (!["127.0.0.1", "localhost"].includes(address.hostname) || Number(address.port) !== port) throw new Error("Unexpected local verification endpoint");
      socket = new WebSocket(address);
      await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
      let next = 0; const pending = new Map();
      socket.addEventListener("message", message => { const value = JSON.parse(message.data); if (value.id && pending.has(value.id)) { const item = pending.get(value.id); pending.delete(value.id); value.error ? item.reject(new Error("Local page verification command failed")) : item.resolve(value.result); } });
      socket.addEventListener("close", () => { for (const item of pending.values()) item.reject(new Error("Local verification page closed")); pending.clear(); });
      const command = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
      const evaluate = async expression => { const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error("Installed interface verification failed: " + (result.exceptionDetails.exception?.description ?? "page exception")); return result.result.value; };
      const result = await evaluate(`(async()=>{
        const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
        const ensure=(value,message)=>{if(!value)throw new Error(message);};
        async function wait(probe,label){for(let index=0;index<3000;index++){const value=probe();if(value)return value;await pause(5);}throw new Error('Installed UI timeout: '+label);}
        await wait(()=>document.querySelector('[data-connection-state="ready"]')&&!document.querySelector('textarea')?.disabled,'ready');
        ensure(typeof process==='undefined'&&typeof require==='undefined','Node globals exposed');
        const bad=await window.prodops.app.quit({invalid:true}).then(()=>false,()=>true);ensure(bad,'Quit arguments accepted');
        if(${JSON.stringify(mode)}==='create'){
          const previous=document.querySelector('[data-conversation]').dataset.conversation;
          document.querySelector('[data-action="new-conversation"]').click();
          await wait(()=>document.querySelector('[data-conversation]').dataset.conversation&&document.querySelector('[data-conversation]').dataset.conversation!==previous&&!document.querySelector('textarea').disabled,'new isolated conversation');
          const input=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'相机掉线');input.dispatchEvent(new Event('input',{bubbles:true}));
          await wait(()=>!document.querySelector('[aria-label="提交排查"]').disabled,'submit enabled');document.querySelector('[aria-label="提交排查"]').click();
        }
        await wait(()=>document.querySelector('[data-run-status="succeeded"]')&&document.querySelectorAll('[data-role="assistant"]').length===1&&document.querySelectorAll('[data-evidence-id]').length===3,'task and history');
        const selected=document.querySelector('[data-conversation]').dataset.conversation;
        if(${JSON.stringify(conversation ?? null)})ensure(selected===${JSON.stringify(conversation ?? null)},'Conversation identity changed');
        ensure(document.querySelector('[data-resolution="unknown"]'),'Resolution misreported');
        return {conversation_id:selected,run_id:document.querySelector('[data-run-id]').dataset.runId,status:'succeeded',evidence_count:3,message_count:document.querySelectorAll('[data-message-id]').length,
          node_globals_absent:true,invalid_quit_refused:bad,bridge_keys:Object.keys(window.prodops).sort()};
      })()`);
      const servicePath = path.join(installation, "resources/agent/prodops-agent.exe");
      const processes = JSON.parse(powershell(`ConvertTo-Json -InputObject @(Get-CimInstance Win32_Process -Filter 'ParentProcessId = ${child.pid}' | Where-Object { $_.ExecutablePath -eq ${quote(servicePath)} } | Select-Object ProcessId,ParentProcessId,ExecutablePath) -Compress`));
      if (processes.length !== 1) throw new Error("Installed app did not own exactly one bundled service");
      await evaluate("document.querySelector('.progress').open=false;document.querySelector('.run-card').scrollIntoView({block:'start'});void 0");
      await pause(100);
      const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      fs.writeFileSync(path.join(output, `${mode}.png`), Buffer.from(screenshot.data, "base64"));
      await evaluate("document.querySelector('[data-action=\"quit-app\"]').click();void 0").catch(() => undefined);
      const code = await exited;
      if (code !== 0) throw new Error("Installed app did not exit successfully");
      const serviceStillRunning = powershell(`@(Get-CimInstance Win32_Process -Filter 'ProcessId = ${processes[0].ProcessId}' | Where-Object { $_.ExecutablePath -eq ${quote(servicePath)} }).Count`);
      if (serviceStillRunning !== "0") throw new Error("Installed app left its bundled service running");
      if (!fs.existsSync(path.join(profile, "agent/prodops.sqlite3"))) throw new Error("Custom isolated history was not persisted");
      const report = { mode, ...result, process_exit_code: code, owned_service_stopped: true, parent_pid: child.pid, service: processes[0], page_loaded_from_installed_asar: true,
        development_path_removed: true, cwd: outside, profile, source_isolation: [".venv", "node_modules", "apps/desktop/src", "services/agent/src"].map(name => ({ name, unavailable: !fs.existsSync(path.join(root, name)) })) };
      fs.writeFileSync(path.join(output, `${mode}.json`), JSON.stringify(report, null, 2) + "\n"); runtime.push(report);
      return result.conversation_id;
    } finally { socket?.close(); clearTimeout(timer); if (child.exitCode === null && child.signalCode === null) { child.kill(); await exited; } }
  }
  const conversation = await launch("create"); await launch("reopen", conversation);
  fs.writeFileSync(path.join(output, "summary.json"), JSON.stringify({ status: "PASS", environment_scope: "current development Windows; not a clean machine", runtime }, null, 2) + "\n");
  console.log("PASS: actual installed app, bundled service, mock diagnosis and reopened history without development PATH/source/runtime directories");
} else throw new Error("Unknown installed verification phase");
