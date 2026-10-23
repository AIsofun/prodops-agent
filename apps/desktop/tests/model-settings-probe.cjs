const assert = require("node:assert/strict");
const http = require("node:http");
const { once } = require("node:events");
const { BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
module.exports = async (window, output, phase) => {
  const run = expression => window.webContents.executeJavaScript(expression);
  if (phase === "reopen") {
    assert.equal(await run("window.prodops.shell.preferences().then(p=>window.prodops.shell.modelKey('status','cloud',p.cloud)).then(x=>x.configured)"), true);
    return { encrypted_key_survived_process_restart: true };
  }
  let requests = 0;
  let expectedKey = "fixture-only-key";
  const server = http.createServer((request, response) => {
    requests++;
    assert.equal(request.method, "GET"); assert.ok(request.url.endsWith("/models"));
    response.setHeader("Content-Type", "application/json");
    if (request.url.startsWith("/secure/") && request.headers.authorization !== `Bearer ${expectedKey}`) { response.writeHead(401); response.end('{"error":"fixture"}'); return; }
    response.end(JSON.stringify({ object: "list", data: [{ id: "isolated-local" }, { id: "isolated-cloud" }] }));
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  const prepare = async (source, address, model) => run(`(async()=>{
    const wait=async p=>{for(let n=0;n<1000;n++){if(p())return;await new Promise(r=>setTimeout(r,5));}throw new Error('Prepare settings timeout');};
    if(!document.querySelector('.settings-page'))document.querySelector('.settings-entry').click();
    await wait(()=>document.querySelector('#model-${source}'));document.querySelector('#model-${source}').click();
    await wait(()=>document.querySelector('#model-${source}').getAttribute('aria-selected')==='true');
    for(const [label,value] of ${JSON.stringify([["模型服务地址", address], ["模型名称", model]])}){const i=document.querySelector('input[aria-label="'+label+'"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,value);i.dispatchEvent(new Event('input',{bubbles:true}));}
    await new Promise(r=>setTimeout(r,20));
  })()`);
  const waitNotice = text => run(`new Promise((resolve,reject)=>{let n=0;function probe(){const p=document.querySelector('.settings-notice');if(p?.textContent.includes(${JSON.stringify(text)})&&!document.querySelector('[data-action="test-model"]').disabled)resolve(true);else if(n++<1600)setTimeout(probe,10);else reject(new Error('Model notice timeout: '+p?.textContent));}probe();})`);
  const test = async text => { await run("document.querySelector('[data-action=\"test-model\"]').click()"); await waitNotice(text); };
  const editKey = async (cancel, secret = "fixture-only-key") => {
    await run("document.querySelector('[data-action=\"edit-model-key\"]').click()");
    let dialog;
    for (let n = 0; n < 1000; n++) { dialog = BrowserWindow.getAllWindows().find(item => item.getParentWindow() === window); if (dialog && !dialog.webContents.isLoading()) break; await pause(10); }
    assert.ok(dialog, "Key dialog opened");
    const prefs = dialog.webContents.getLastWebPreferences(); assert.equal(prefs.sandbox, true); assert.equal(prefs.contextIsolation, true);
    await dialog.webContents.executeJavaScript(`(async()=>{
      for(let n=0;!document.querySelector('#api-key')&&n<500;n++)await new Promise(r=>setTimeout(r,5));
      if(typeof window.prodops!=='undefined'||typeof require!=='undefined'||Object.keys(window.modelKeyEntry).join(',')!=='submit')throw new Error('Secret dialog exposes wrong capabilities');
      if(${cancel})document.querySelector('#cancel').click();else{document.querySelector('#api-key').value=${JSON.stringify(secret)};document.querySelector('#key-form').requestSubmit();}
    })()`);
    for (let n = 0; !dialog.isDestroyed() && n < 1000; n++) await pause(10);
    assert.equal(dialog.isDestroyed(), true);
  };
  try {
    await prepare("local", endpoint + "/v1", "isolated-local"); await test("连接成功");
    assert.equal(requests, 1);
    assert.equal(await run("window.prodops.shell.preferences().then(x=>x.local.endpoint)"), "http://127.0.0.1:11434/v1", "Testing does not save the unsaved form");
    await prepare("cloud", endpoint + "/secure", "isolated-cloud"); await test("认证失败");
    await editKey(true); await waitNotice("已取消");
    await editKey(false); await waitNotice("已有加密密钥"); await test("连接成功");
    expectedKey = "fixture-updated-key";
    await editKey(false, expectedKey); await waitNotice("已有加密密钥"); await test("连接成功");
    const ciphertext = fs.readFileSync(path.join(process.env.PRODOPS_SMOKE_USER_DATA, "model-keys.json"), "utf8");
    assert.ok(!ciphertext.includes("fixture-only-key") && !ciphertext.includes(expectedKey), "Real Windows encrypted key storage");
    await prepare("cloud", endpoint + "/other", "isolated-cloud");
    assert.equal(await run(`window.prodops.shell.modelKey('status','cloud',{name:'fixture',endpoint:${JSON.stringify(endpoint + "/other")},model:'isolated-cloud'}).then(x=>x.configured)`), false);
    await prepare("cloud", endpoint + "/secure", "isolated-cloud");
    for (let n = 0; n < 200 && !await run("!!document.querySelector('[data-action=\"remove-model-key\"]')"); n++) await pause(10);
    await run("document.querySelector('[data-action=\"remove-model-key\"]').click()"); await waitNotice("已移除"); await test("认证失败");
    await prepare("cloud", "https://model.invalid/v1", "isolated-cloud"); await editKey(false); await waitNotice("已有加密密钥");
    assert.equal(await run("document.querySelectorAll('input[type=password]').length"), 0);
    await run("document.querySelector('[aria-label=\"返回排查\"]').click()");
    const scroll = await run(`(async()=>{
      await new Promise(r=>setTimeout(r,20));const content=document.querySelector('.content');const column=document.querySelector('.chat-column');
      const filler=document.createElement('div');filler.style.height='4000px';filler.style.flexShrink='0';column.insertBefore(filler,document.querySelector('.composer'));
      await new Promise(r=>requestAnimationFrame(r));content.scrollTop=500;await new Promise(r=>requestAnimationFrame(r));
      const result={root_height:document.scrollingElement.clientHeight,root_scroll_height:document.scrollingElement.scrollHeight,root_scroll_top:document.scrollingElement.scrollTop,
        chat_scroll_top:content.scrollTop,titlebar_top:document.querySelector('.titlebar').getBoundingClientRect().top};
      filler.remove();content.scrollTop=0;return result;
    })()`);
    assert.ok(scroll.root_scroll_height <= scroll.root_height + 1, "No outer page scroll");
    assert.equal(scroll.root_scroll_top, 0); assert.equal(scroll.titlebar_top, 0); assert.equal(scroll.chat_scroll_top, 500);
    fs.writeFileSync(path.join(output, "scroll.json"), JSON.stringify(scroll, null, 2) + "\n");
    return { local_button_sends_real_get: true, cloud_auth_failure_and_success: true, key_dialog_cancel_save_update_remove: true, encrypted_windows_storage: true,
      no_key_in_settings_renderer: true, endpoint_binding: true, test_does_not_save_draft: true, single_chat_scroll_and_fixed_titlebar: true, fixture_requests: requests };
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
};
