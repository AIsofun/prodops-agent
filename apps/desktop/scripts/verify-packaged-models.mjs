import http from "node:http";
import { once } from "node:events";
import assert from "node:assert/strict";

/** Runs only against the verifier's isolated package/profile and loopback fixture. */
export async function verifyPackagedModels(evaluate, debugPort) {
  const fixture = http.createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/secure/models" && request.headers.authorization !== "Bearer fixture-packaged-key") { response.writeHead(401); response.end("{}"); return; }
    assert.ok(["/public/models", "/secure/models"].includes(request.url)); assert.equal(request.method, "GET");
    response.end(JSON.stringify({ data: [{ id: "packaged-fixture" }] }));
  });
  fixture.listen(0, "127.0.0.1"); await once(fixture, "listening");
  const address = `http://127.0.0.1:${fixture.address().port}`;
  let socket;
  try {
    await evaluate(`(async()=>{
      const wait=async p=>{for(let n=0;n<1000;n++){if(p())return;await new Promise(r=>setTimeout(r,5));}throw new Error('Package settings timeout');};
      document.querySelector('.settings-entry').click();await wait(()=>document.querySelector('#model-cloud'));document.querySelector('#model-cloud').click();
      await wait(()=>document.querySelector('#model-cloud').getAttribute('aria-selected')==='true');
      for(const [label,value] of ${JSON.stringify([["模型服务地址", address + "/secure"], ["模型名称", "packaged-fixture"]])}){const input=document.querySelector('input[aria-label="'+label+'"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}
      await new Promise(r=>setTimeout(r,20));document.querySelector('[data-action="test-model"]').click();
      await wait(()=>document.querySelector('.settings-notice').textContent.includes('认证失败')&&!document.querySelector('[data-action="test-model"]').disabled);
      document.querySelector('[data-action="edit-model-key"]').click();
    })()`);
    let target;
    for (let n = 0; n < 300; n++) {
      const targets = await new Promise((resolve, reject) => {
        const request = http.get(`http://127.0.0.1:${debugPort}/json/list`, response => { let text = ""; response.on("data", chunk => { text += chunk; }); response.on("end", () => { try { resolve(JSON.parse(text)); } catch { reject(new Error("Invalid local debugger list")); } }); });
        request.on("error", reject); request.setTimeout(1000, () => request.destroy());
      });
      target = targets.find(item => item.type === "page" && item.url.includes("app.asar/renderer/credentials.html"));
      if (target) break; await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.ok(target, "Packaged credential HTML loaded");
    const url = new URL(target.webSocketDebuggerUrl); assert.equal(url.hostname, "127.0.0.1"); assert.equal(Number(url.port), debugPort);
    socket = new WebSocket(url);
    await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
    const reply = new Promise((resolve, reject) => {
      socket.addEventListener("message", event => { const value = JSON.parse(event.data); if (value.id === 1) value.error || value.result.exceptionDetails ? reject(new Error("Packaged key entry failed")) : resolve(value.result); });
      socket.addEventListener("error", reject, { once: true });
    });
    socket.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { awaitPromise: true, expression: `(async()=>{
      for(let n=0;typeof document.querySelector('#key-form')?.onsubmit!=='function'&&n<500;n++)await new Promise(r=>setTimeout(r,5));
      if(typeof document.querySelector('#key-form')?.onsubmit!=='function')throw new Error('Packaged key form did not initialize');
      if(typeof require!=='undefined'||typeof process!=='undefined'||typeof window.prodops!=='undefined'||Object.keys(window.modelKeyEntry).join(',')!=='submit')throw new Error('Unexpected secret-window capability');
      document.querySelector('#api-key').value='fixture-packaged-key';document.querySelector('#key-form').requestSubmit();return true;
    })()` } }));
    await reply;
    await evaluate(`(async()=>{
      const wait=async p=>{for(let n=0;n<1500;n++){if(p())return;await new Promise(r=>setTimeout(r,10));}throw new Error('Packaged model verification timeout: '+document.querySelector('.settings-notice')?.textContent);};
      await wait(()=>document.querySelector('.settings-notice').textContent.includes('已有加密密钥')&&!document.querySelector('[data-action="test-model"]').disabled);
      document.querySelector('[data-action="test-model"]').click();await wait(()=>document.querySelector('.settings-notice').textContent.includes('连接成功')&&!document.querySelector('[data-action="test-model"]').disabled);
      document.querySelector('[aria-label="返回排查"]').click();await wait(()=>!document.querySelector('.chat-screen').hidden);
      const geometry={height:document.scrollingElement.clientHeight,scrollHeight:document.scrollingElement.scrollHeight,top:document.querySelector('.titlebar').getBoundingClientRect().top,scrollTop:document.scrollingElement.scrollTop,bodyTop:document.body.scrollTop,rootTop:document.querySelector('#root').scrollTop};
      if(geometry.scrollHeight>geometry.height+1||geometry.top!==0)throw new Error('Packaged scroll geometry: '+JSON.stringify(geometry));
    })()`);
    return { actual_packaged_connection_button: true, actual_packaged_key_window_and_encryption: true, authentication_checked: true, outer_scroll_absent: true };
  } finally { socket?.close(); fixture.closeAllConnections(); await new Promise(resolve => fixture.close(resolve)); }
}
