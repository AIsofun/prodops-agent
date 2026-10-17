const { app } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const output = path.resolve(process.env.PRODOPS_SMOKE_OUTPUT);
const data = path.resolve(process.env.PRODOPS_SMOKE_USER_DATA);
const gate = path.join(data, "release-mock-reads.test");
const phase = process.env.PRODOPS_LIFECYCLE_PHASE;
fs.mkdirSync(output, { recursive: true });
app.setPath("userData", data);
const fault = require("./fault-probe.cjs").install("crash", gate);
const { DesktopLifecycle } = require("../dist/main/lifecycle.js");
const { BusinessClient } = require("../dist/main/business.js");
let controller, tray, completed = false, report;
const originalInstall = DesktopLifecycle.prototype.install;
DesktopLifecycle.prototype.install = async function () { await originalInstall.call(this); controller = this; tray = this.tray; };
const timer = setTimeout(() => { console.error("Lifecycle desktop verification timed out"); app.exit(1); }, 40000);
app.once("browser-window-created", (_event, window) => window.webContents.once("did-finish-load", async () => {
  try {
    const result = await window.webContents.executeJavaScript(`(async()=>{
      const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
      async function wait(probe){for(let index=0;index<3000;index++){const value=probe();if(value)return value;await pause(5);}throw new Error('Lifecycle UI timeout');}
      await wait(()=>document.querySelector('[data-connection-state="ready"]')&&!document.querySelector('textarea').disabled);
      const input=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'相机掉线');input.dispatchEvent(new Event('input',{bubbles:true}));
      await wait(()=>!document.querySelector('[aria-label="提交排查"]').disabled);document.querySelector('[aria-label="提交排查"]').click();
      await wait(()=>document.querySelector('[data-run-status="running"]')&&document.querySelector('[data-event-seq="4"]'));
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'托盘中的草稿');input.dispatchEvent(new Event('input',{bubbles:true}));
      await pause(10);
      return {run_id:document.querySelector('[data-run-id]').dataset.runId,conversation_id:document.querySelector('[data-conversation]').dataset.conversation};
    })()`);
    const connection = fault.service.getConnection();
    assert.ok(connection && controller && tray && !tray.isDestroyed());
    report = { phase, ...result, parent_pid: process.pid, service_pid: connection.process_id, service_port: connection.port,
      instance_id: connection.instance_id, deployment_id: connection.deployment_id, native_tray_created: true, tray_bounds: tray.getBounds() };
    if (phase === "parent") {
      fs.writeFileSync(path.join(output, "parent-ready.json"), JSON.stringify(report, null, 2) + "\n");
      return; // The outer harness kills only this parent, leaving the private pipe to close naturally.
    }
    if (phase === "pipe") {
      fault.service.child.stdin.end();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Private pipe shutdown did not finish")), 15000);
        fault.service.child.once("close", () => { clearTimeout(timeout); resolve(); });
      });
      assert.equal(fault.service.child.exitCode, 0);
      report = { ...report, status: "PASS", private_pipe_closed: true, service_exit_code: 0 };
      completed = true; clearTimeout(timer); controller.menu.getMenuItemById("quit").click(); return;
    }
    window.close();
    assert.equal(window.isDestroyed(), false); assert.equal(window.isVisible(), false);
    const client = new BusinessClient(() => fault.service.getConnection());
    fs.writeFileSync(gate, "release isolated mock reads\n");
    let snapshot;
    for (let index = 0; index < 200; index++) {
      const result = await client.execute({ connection_id: "development", operation: "runs.get", run_id: report.run_id });
      assert.equal(result.ok, true); snapshot = result.value;
      if (snapshot.status === "succeeded") break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    client.dispose();
    assert.equal(snapshot.status, "succeeded"); assert.equal(window.isVisible(), false);
    const second = spawn(process.execPath, [path.join(__dirname, "secondary.cjs")], { windowsHide: true, stdio: "ignore",
      env: { ...process.env, PRODOPS_SECONDARY_DATA: data } });
    const secondTimer = setTimeout(() => second.kill(), 10000);
    const exit = await new Promise((resolve, reject) => { second.once("error", reject); second.once("exit", resolve); }).finally(() => clearTimeout(secondTimer));
    assert.equal(exit, 0);
    for (let index = 0; index < 100 && !window.isVisible(); index++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(window.isVisible(), true);
    assert.equal(fault.service.getConnection().instance_id, connection.instance_id);
    const resumed = await window.webContents.executeJavaScript(`({conversation:document.querySelector('[data-conversation]').dataset.conversation,draft:document.querySelector('textarea').value})`);
    assert.equal(resumed.conversation, report.conversation_id); assert.equal(resumed.draft, "托盘中的草稿");
    window.minimize(); controller.menu.getMenuItemById("show").click(); assert.equal(window.isMinimized(), false);
    window.close(); assert.equal(window.isVisible(), false); tray.emit("double-click"); assert.equal(window.isVisible(), true);
    fs.writeFileSync(path.join(output, "restored.png"), (await window.webContents.capturePage()).toPNG());
    report = { ...report, status: "PASS", hidden_task_succeeded: true, second_instance_exit: exit, same_service_instance: true,
      original_conversation_restored: true, draft_preserved: true, menu_restore: true, tray_double_click_restore: true };
    completed = true; clearTimeout(timer);
    controller.menu.getMenuItemById("quit").click();
  } catch (error) { console.error(error); app.exit(1); }
}));
require("../dist/main/index.js");
app.on("will-quit", () => {
  if (!completed) return;
  try {
    assert.equal(tray.isDestroyed(), true);
    assert.notEqual(fault.service.child.exitCode, null);
    report.tray_destroyed = true; report.service_exit_code = fault.service.child.exitCode;
    fs.writeFileSync(path.join(output, "runtime.json"), JSON.stringify(report, null, 2) + "\n");
  } catch (error) { console.error(error); process.exitCode = 1; }
});
