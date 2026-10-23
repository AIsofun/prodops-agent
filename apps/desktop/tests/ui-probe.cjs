const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
module.exports = async function uiProbe(window, output, phase) {
  const screenshot = async (name) => fs.writeFileSync(path.join(output, name + ".png"), (await window.webContents.capturePage()).toPNG());
  const result = await window.webContents.executeJavaScript(`(async()=>{
    const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const ensure=(ok,label)=>{if(!ok)throw new Error(label);};
    async function wait(probe,label){for(let n=0;n<4000;n++){if(probe())return;await pause(5);}throw new Error('UI timeout: '+label);}
    async function stored(probe,label){for(let n=0;n<1000;n++){if(probe(await window.prodops.shell.preferences()))return;await pause(10);}throw new Error('Stored UI timeout: '+label);}
    const click=selector=>{const item=document.querySelector(selector);ensure(item,'Missing '+selector);item.click();};
    const type=(label,value)=>{const input=document.querySelector('input[aria-label="'+label+'"]');ensure(input,'Missing '+label);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));};
    await wait(()=>document.querySelector('[data-connection-state="ready"]')&&!document.querySelector('textarea').disabled,'ready');
    const original=await window.prodops.connections.getStatus();
    if(${JSON.stringify(phase)}==='reopen'){
      const saved=await window.prodops.shell.preferences();
      ensure(saved.sidebar_collapsed&&saved.local.model==='isolated-local'&&saved.cloud.model==='isolated-cloud','Preferences did not survive reopening');
      ensure(saved.server_endpoint==='https://factory.invalid','Server draft missing');
      await wait(()=>document.querySelector('.sidebar-collapsed'),'Restored sidebar');
      return {phase:'reopen',preferences_reopened:true,sidebar_restored:true,execution_mode:'mock'};
    }
    const input=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'保留排查草稿');input.dispatchEvent(new Event('input',{bubbles:true}));
    click('[data-action="toggle-sidebar"]');await wait(()=>document.querySelector('.sidebar-collapsed')&&!document.querySelector('[data-action="toggle-sidebar"]').disabled,'collapsed persisted');
    ensure(getComputedStyle(document.querySelector('.titlebar')).backgroundColor===getComputedStyle(document.querySelector('.sidebar')).backgroundColor,'Split titlebar background');
    ensure(input.value==='保留排查草稿','Collapsing lost draft');
    click('.logo-button');await wait(()=>!document.querySelector('.profile-popover').hidden,'Logo popup');ensure(document.querySelectorAll('.profile-popover button').length===0,'Logo has settings button');click('.logo-button');
    click('.settings-entry');await wait(()=>document.querySelector('.settings-page'),'Settings open');
    type('模型服务地址','http://127.0.0.1:11434/v1');type('模型名称','isolated-local');await pause(10);click('.settings-actions .primary');
    await wait(()=>document.querySelector('.settings-notice').textContent.includes('已保存'),'Local saved');
    await stored(value=>value.local.model==='isolated-local','Local profile');
    click('[role="tab"][id="model-cloud"]');await wait(()=>document.querySelector('#model-cloud').getAttribute('aria-selected')==='true','Cloud tab');type('模型服务地址','https://model.invalid/v1');type('模型名称','isolated-cloud');await pause(10);
    click('[data-action="toggle-sidebar"]');await wait(()=>!document.querySelector('.sidebar-collapsed')&&!document.querySelector('[data-action="toggle-sidebar"]').disabled,'Expanded persisted');
    ensure(document.querySelector('input[aria-label="模型名称"]').value==='isolated-cloud','Sidebar toggle lost unsaved model draft');
    ensure(document.querySelectorAll('input[type="password"]').length===0,'Renderer exposes secret entry');
    ensure([...document.querySelectorAll('.settings-page button')].find(x=>x.textContent==='测试连接').disabled,'Unsupported model test is enabled');
    click('.settings-actions .primary');await stored(value=>value.cloud.model==='isolated-cloud'&&value.cloud.endpoint==='https://model.invalid/v1','Cloud profile');await wait(()=>!document.querySelector('.settings-actions .primary').disabled,'Cloud save settled');
    type('模型服务地址','https://user:password@model.invalid');await pause(10);click('.settings-actions .primary');
    await wait(()=>document.querySelector('.settings-notice').textContent.includes('保存失败'),'Credential URL rejected');
    ensure((await window.prodops.shell.preferences()).cloud.endpoint==='https://model.invalid/v1','Invalid save overwrote previous draft');
    click('[aria-label="返回排查"]');await wait(()=>!document.querySelector('.chat-screen').hidden,'Back to draft');ensure(input.value==='保留排查草稿','Settings lost chat draft');
    click('.runtime-anchor > button');await wait(()=>!document.querySelector('.runtime-popover').hidden,'Runtime open');
    [...document.querySelectorAll('.runtime-popover button')].find(x=>x.textContent==='运行位置设置').click();
    await wait(()=>document.querySelector('input[aria-label="工厂服务器地址"]'),'Separate runtime settings');
    type('工厂服务器地址','https://factory.invalid');await pause(10);click('.settings-actions .primary');
    await wait(()=>document.querySelector('.settings-notice').textContent.includes('已保存'),'Server draft saved');
    const after=await window.prodops.connections.getStatus();ensure(after.deployment_id===original.deployment_id&&after.mode===original.mode,'Draft switched active deployment');
    click('[aria-label="返回排查"]');click('[data-action="toggle-sidebar"]');await wait(()=>document.querySelector('.sidebar-collapsed')&&!document.querySelector('[data-action="toggle-sidebar"]').disabled,'Final collapsed persisted');
    return {phase:'create',same_titlebar_color:true,logo_popup_without_settings:true,chat_draft_preserved:true,unsaved_model_draft_preserved:true,
      local_and_cloud_saved:true,credential_url_refused:true,no_renderer_key_input:true,unsupported_operations_disabled:true,server_draft_saved:true,active_connection_unchanged:true};
  })()`);
  assert.ok(result.phase);
  await screenshot("desktop");
  if (phase === "create") {
    await window.webContents.executeJavaScript("document.querySelector('[data-action=\"toggle-sidebar\"]').click()");
    await new Promise(resolve => setTimeout(resolve, 150));
    await screenshot("home");
    await window.webContents.executeJavaScript("document.querySelector('.settings-entry').click()");
    await window.webContents.executeJavaScript("new Promise((resolve,reject)=>{let n=0;function wait(){const tab=document.querySelector('#model-cloud');if(tab){tab.click();resolve();}else if(n++<200)setTimeout(wait,5);else reject(new Error('Settings screenshot timeout'));}wait();})");
    await new Promise(resolve => setTimeout(resolve, 150));
    await screenshot("models");
    await window.webContents.executeJavaScript("document.querySelector('[aria-label=\"返回排查\"]').click();document.querySelector('[data-action=\"toggle-sidebar\"]').click()");
    await new Promise(resolve => setTimeout(resolve, 150));
    const { Menu } = require("electron");
    const originalMenu = Menu.buildFromTemplate;
    let capturedMenu;
    Menu.buildFromTemplate = (...args) => { capturedMenu = originalMenu.apply(Menu, args); return capturedMenu; };
    try {
      await window.webContents.executeJavaScript("document.querySelector('.desktop-menus button').click()");
      for (let n = 0; !capturedMenu && n < 200; n++) await new Promise(resolve => setTimeout(resolve, 5));
      assert.ok(capturedMenu);
      const models = capturedMenu.items.find(item => item.label === "模型与 API 设置");
      assert.ok(models); models.click(); capturedMenu.closePopup(window);
      await window.webContents.executeJavaScript("new Promise((resolve,reject)=>{let n=0;function wait(){if(document.querySelector('.settings-page'))resolve();else if(n++<200)setTimeout(wait,5);else reject(new Error('Native menu did not navigate'));}wait();})");
      await window.webContents.executeJavaScript("document.querySelector('[aria-label=\"返回排查\"]').click()");
      result.native_file_menu_dispatch = true;
    } finally { Menu.buildFromTemplate = originalMenu; }
    const { createShellHandler } = require("../dist/main/shell.js");
    const { PreferencesStore } = require("../dist/main/preferences.js");
    const handler = createShellHandler(() => window, new PreferencesStore(process.env.PRODOPS_SMOKE_USER_DATA));
    await assert.rejects(handler({ sender: window.webContents, senderFrame: { url: window.webContents.getURL() } }, { operation: "window", action: "close" }), /Untrusted/);
    result.foreign_shell_frame_refused = true;
    await window.webContents.executeJavaScript("window.prodops.shell.window('maximize')");
    assert.equal(window.isMaximized(), true);
    await window.webContents.executeJavaScript("window.prodops.shell.window('maximize')");
    assert.equal(window.isMaximized(), false);
    await window.webContents.executeJavaScript("window.prodops.shell.window('minimize')");
    assert.equal(window.isMinimized(), true); window.restore();
    await window.webContents.executeJavaScript("window.prodops.shell.window('close')");
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(window.isVisible(), false); window.show();
    result.window_controls = { maximize_restore: true, minimize: true, close_hides_to_tray: true };
  }
  return result;
};
