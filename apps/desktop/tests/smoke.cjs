const { app } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const output = path.resolve(process.env.PRODOPS_SMOKE_OUTPUT);
fs.mkdirSync(output, { recursive: true });
const timer = setTimeout(() => { console.error("Desktop smoke test timed out"); app.exit(1); }, 30000);
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
      assert.equal(result.heading, "从异常描述开始排查");
      assert.equal(result.node, "undefined");
      assert.equal(result.process, "undefined");
      assert.deepEqual(result.bridgeKeys, ["getInfo"]);
      assert.equal(result.info.name, "ProdOps");
      assert.ok(result.csp.includes("script-src 'self'"));
      assert.ok(!result.csp.includes("unsafe-eval"));
      await new Promise((resolve) => setTimeout(resolve, 350));
      fs.writeFileSync(path.join(output, "desktop.png"), (await window.webContents.capturePage()).toPNG());
      fs.writeFileSync(path.join(output, "runtime.json"), JSON.stringify({ status: "PASS", versions: process.versions, preferences: { contextIsolation: prefs.contextIsolation, sandbox: prefs.sandbox, nodeIntegration: prefs.nodeIntegration, webSecurity: prefs.webSecurity, webviewTag: prefs.webviewTag }, renderer: result, checks: ["React rendered", "renderer has no Node globals", "restricted bridge", "window closes and app exits"] }, null, 2) + "\n");
      completed = true;
      clearTimeout(timer);
      window.close();
    } catch (error) {
      console.error(error);
      app.exit(1);
    }
  });
});
app.on("will-quit", () => { if (!completed) process.exitCode = 1; });
require("../dist/main/index.js");
