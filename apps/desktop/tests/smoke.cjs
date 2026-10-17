const { app } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const output = path.resolve(process.env.PRODOPS_SMOKE_OUTPUT);
fs.mkdirSync(output, { recursive: true });
if (!path.isAbsolute(process.env.PRODOPS_SMOKE_USER_DATA ?? "")) throw new Error("Isolated desktop data directory required");
app.setPath("userData", process.env.PRODOPS_SMOKE_USER_DATA);
const fault = process.env.PRODOPS_SMOKE_FAULT ? require("./fault-probe.cjs").install(process.env.PRODOPS_SMOKE_FAULT, process.env.PRODOPS_SMOKE_GATE) : null;
const timer = setTimeout(() => { console.error("Desktop smoke test timed out"); app.exit(1); }, process.env.PRODOPS_SMOKE_WORKSPACE ? 90000 : 30000);
let completed = false;
app.once("browser-window-created", (_event, window) => {
  window.webContents.once("did-finish-load", async () => {
    try {
      const prefs = window.webContents.getLastWebPreferences();
      assert.equal(prefs.contextIsolation, true);
      assert.equal(prefs.sandbox, true);
      assert.equal(prefs.nodeIntegration, false);
      assert.equal(prefs.webSecurity, true);
      assert.equal(prefs.webviewTag, false);
      const result = await window.webContents.executeJavaScript(`new Promise((resolve) => {
        function probe() {
          if (!document.querySelector('h1')) { setTimeout(probe, 20); return; }
          resolve({ title: document.title, heading: document.querySelector('h1').textContent,
            body: document.body.innerText, node: typeof require, process: typeof process,
            bridgeKeys: Object.keys(window.prodops), info: window.prodops.getInfo(),
            csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]').content });
        } probe();
      })`);
      if (process.env.PRODOPS_SMOKE_WORKSPACE !== "reopen" && process.env.PRODOPS_SMOKE_FAULT !== "recover") assert.equal(result.heading, "从异常描述开始排查");
      assert.equal(result.node, "undefined");
      assert.equal(result.process, "undefined");
      assert.deepEqual(result.bridgeKeys.sort(), ["business", "connections", "events", "getInfo"]);
      assert.equal(result.info.name, "ProdOps");
      assert.ok(result.csp.includes("script-src 'self'"));
      assert.ok(!result.csp.includes("unsafe-eval"));
      const expected = process.env.PRODOPS_EXPECT_CONNECTION ?? (process.env.PRODOPS_SERVICE_PORT === undefined ? "ready" : "offline");
      const state = await window.webContents.executeJavaScript(`new Promise((resolve) => {
        function probe() {
          const element = document.querySelector('[data-connection-state]');
          if (!element || element.dataset.connectionState === 'checking') { setTimeout(probe, 20); return; }
          resolve({ state: element.dataset.connectionState, text: element.innerText });
        } probe();
      })`);
      assert.equal(state.state, expected);
      const malformed = await window.webContents.executeJavaScript(`window.prodops.connections.getStatus({url:'http://attacker.example'}).then(() => false, () => true)`);
      assert.equal(malformed, true);
      result.connection = state;
      if (process.env.PRODOPS_SMOKE_BUSINESS === "true") {
        result.business = await window.webContents.executeJavaScript(`(async () => {
          const bridge = window.prodops;
          const unwrap = (response) => { if (!response.ok) throw new Error('Bridge returned ' + response.error.code); return response.value; };
          const workspace = unwrap(await bridge.business.workspaces()).items[0];
          const conversation = unwrap(await bridge.business.createConversation(workspace.workspace_id, {title:'桌面桥接验证'}));
          const key = crypto.randomUUID();
          const body = {content:'相机掉线',execution_mode:'mock'};
          const run = unwrap(await bridge.business.submit(conversation.conversation_id, body, key));
          const replay = unwrap(await bridge.business.submit(conversation.conversation_id, body, key));
          if (run.run_id !== replay.run_id) throw new Error('Idempotency failed');
          const subscription = unwrap(await bridge.events.open(run.run_id, 0));
          let count=0, last=0, state='open';
          try {
            while (state === 'open') {
              const batch = unwrap(await bridge.events.read(run.run_id, subscription.subscription_id));
              for (const event of batch.events) {
                if (event.seq !== last + 1) throw new Error('Event sequence failed');
                last=event.seq; count++;
              }
              if (batch.last_seq !== last) throw new Error('Delivery watermark failed');
              state=batch.state;
            }
          } finally { unwrap(await bridge.events.close(run.run_id, subscription.subscription_id)); }
          if (state !== 'ended') throw new Error('Stream did not finish');
          const snapshot=unwrap(await bridge.business.run(run.run_id));
          const messages=unwrap(await bridge.business.messages(conversation.conversation_id,{limit:10,cursor:null}));
          if (snapshot.status !== 'succeeded' || snapshot.evidence.length !== 3 || messages.items.length !== 2) throw new Error('Result/history failed');
          const refused=await bridge.business.run('../invalid').then(()=>false,()=>true);
          if (!refused) throw new Error('Invalid bridge input accepted');
          return {status:snapshot.status,event_count:count,last_seq:last,evidence_count:snapshot.evidence.length,
            message_count:messages.items.length,invalid_input_refused:refused};
        })()`);
        assert.equal(result.business.status, "succeeded");
      }
      if (process.env.PRODOPS_SMOKE_WORKSPACE) result.workspace = await require("./workspace-probe.cjs")(window, output, process.env.PRODOPS_SMOKE_WORKSPACE);
      if (fault) {
        result.fault = await require("./fault-probe.cjs").run(window, output, process.env.PRODOPS_SMOKE_FAULT, process.env.PRODOPS_SMOKE_GATE, fault);
        await window.webContents.executeJavaScript("document.querySelector('.run-card')?.scrollIntoView({block:'start'})");
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
      fs.writeFileSync(path.join(output, "desktop.png"), (await window.webContents.capturePage()).toPNG());
      fs.writeFileSync(path.join(output, "runtime.json"), JSON.stringify({ status: "PASS", versions: process.versions, preferences: { contextIsolation: prefs.contextIsolation, sandbox: prefs.sandbox, nodeIntegration: prefs.nodeIntegration, webSecurity: prefs.webSecurity, webviewTag: prefs.webviewTag }, renderer: result, checks: ["React rendered", "renderer has no Node globals", "restricted bridge", "window closes and app exits"] }, null, 2) + "\n");
      completed = true;
      clearTimeout(timer);
      window.close();
      app.quit(); // Window close now hides to the real tray; this probe explicitly exits.
    } catch (error) {
      console.error(error);
      app.exit(1);
    }
  });
});
app.on("will-quit", () => { if (!completed) process.exitCode = 1; });
require("../dist/main/index.js");
