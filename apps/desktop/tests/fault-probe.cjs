const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../..");

exports.install = function install(mode, gate) {
  const allowed = path.resolve(root, ".quality-reports") + path.sep;
  if (!path.isAbsolute(gate) || !path.resolve(gate).startsWith(allowed)) throw new Error("Invalid isolated fault gate");
  const record = { opens: [], disconnected: false, mode };
  const serviceModule = require("../dist/main/service.js");
  const originalOptions = serviceModule.serviceLaunchOptions;
  serviceModule.serviceLaunchOptions = (...args) => ({ ...originalOptions(...args),
    args: [path.join(root, "services/agent/tests/desktop_fault_entry.py"), gate, mode] });
  const originalStart = serviceModule.LocalService.prototype.start;
  serviceModule.LocalService.prototype.start = function (...args) { record.service = this; return originalStart.apply(this, args); };
  const { EventStreams } = require("../dist/main/events.js");
  const original = EventStreams.prototype.execute;
  EventStreams.prototype.execute = async function (input) {
    if (input.operation === "open") record.opens.push(input.after_seq);
    const result = await original.call(this, input);
    if (["disconnect", "expired"].includes(mode) && !record.disconnected && input.operation === "read" && result.ok && result.value.events?.some(event => event.seq >= 4)) {
      record.disconnected = true;
      this.subscriptions.get(input.subscription_id)?.request?.destroy(new Error("Explicit isolated network disconnect"));
    }
    return result;
  };
  return record;
};

exports.run = async function run(window, output, mode, gate, record) {
  const evaluate = code => window.webContents.executeJavaScript(`(async()=>{${code}})()`);
  const helpers = `
    const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const ensure=(value,message)=>{if(!value)throw new Error(message);};
    async function wait(probe,label){const start=Date.now();while(Date.now()-start<20000){const value=probe();if(value)return value;await pause(5);}throw new Error('Fault UI timed out: '+label);}
    const card=()=>document.querySelector('[data-run-id]');
    const state=()=>card()?.dataset.runStatus;
    const input=()=>document.querySelector('textarea');
    function type(value){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input(),value);input().dispatchEvent(new Event('input',{bubbles:true}));}
  `;
  if (mode === "recover") {
    const before = await evaluate(helpers + `await wait(()=>state()==='recovery_required','startup recovery');
      const calls=[...document.querySelectorAll('[data-review-call]')];ensure(calls.length===1,'Expected one unknown call');
      ensure(document.querySelector('[data-action="recover-run"]').disabled,'Recovery must need explicit review');
      return {run_id:card().dataset.runId,unknown_calls:calls.length};`);
    await window.webContents.executeJavaScript("document.querySelector('.recovery-panel').scrollIntoView({block:'center'})");
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(path.join(output, "recovery-required.png"), (await window.webContents.capturePage()).toPNG());
    fs.writeFileSync(gate, "release isolated mock reads\n");
    const after = await evaluate(helpers + `document.querySelectorAll('[data-review-call]').forEach(item=>item.click());
      document.querySelector('[data-action="confirm-recovery"]').click();
      await wait(()=>!document.querySelector('[data-action="recover-run"]').disabled,'review complete');
      document.querySelector('[data-action="recover-run"]').click();
      await wait(()=>state()==='succeeded'&&document.querySelectorAll('[data-evidence-id]').length===3,'reviewed recovery complete');
      return {status:state(),evidence_count:document.querySelectorAll('[data-evidence-id]').length,run_id:card().dataset.runId};`);
    assert.equal(after.run_id, before.run_id);
    return { ...before, ...after, explicit_review_required: true };
  }
  const started = await evaluate(helpers + `await wait(()=>document.querySelector('[data-connection-state="ready"]')&&!input().disabled,'ready');
    type('相机掉线');await wait(()=>!document.querySelector('[aria-label="提交排查"]').disabled,'submit enabled');
    document.querySelector('[aria-label="提交排查"]').click();
    await wait(()=>state()==='running'&&document.querySelector('[data-event-seq="4"]'),'in-flight gated tool');
    return {run_id:card().dataset.runId,status:state()};`);
  if (mode === "crash") {
    const child = record.service.child;
    assert.ok(child.pid && child.exitCode === null);
    await new Promise((resolve, reject) => execFile(path.join(process.env.SystemRoot, "System32/taskkill.exe"), ["/PID", String(child.pid), "/T", "/F"],
      { windowsHide: true, timeout: 5000 }, error => error ? reject(error) : resolve()));
    const result = await evaluate(helpers + `await wait(()=>['reconnecting','offline'].includes(document.querySelector('[data-stream-state]')?.dataset.streamState),'service interruption');
      ensure(state()==='running','Network loss fabricated a failed task');
      return {status:state(),run_id:card().dataset.runId,network_did_not_fail_task:true};`);
    return { ...result, owned_service_hard_stopped: true };
  }
  if (mode === "cancel") {
    await evaluate(helpers + `const cancel=document.querySelector('[data-action="cancel-run"]');cancel.click();cancel.click();
      await wait(()=>state()==='cancelling','cooperative cancellation');
      ensure(document.querySelector('[data-action="cancel-run"]').disabled,'Repeated cancellation must be disabled');`);
    fs.writeFileSync(gate, "release isolated mock read\n");
    return evaluate(helpers + `await wait(()=>state()==='cancelled'&&document.querySelectorAll('[data-evidence-id]').length===1,'cancelled with in-flight result');
      const runId=card().dataset.runId;const result=await window.prodops.business.run(runId);ensure(result.ok,'Cancelled snapshot unavailable');
      const starts=[...document.querySelectorAll('[data-event-seq]')].map(item=>Number(item.dataset.eventSeq));
      ensure(new Set(starts).size===starts.length,'Duplicate visible events');
      return {status:state(),run_id:runId,evidence_count:1,repeated_cancel_blocked:true,in_flight_result_retained:true};`);
  }
  if (mode === "disconnect" || mode === "expired") {
    await evaluate(helpers + `await wait(()=>document.querySelector('[data-stream-state]')?.dataset.streamState==='reconnecting','read-only reconnect');
      ensure(state()==='running','Disconnect fabricated a failed task');`);
    const target = mode === "expired" ? 3 : 2;
    const start = Date.now();
    while (record.opens.length < target && Date.now() - start < 10000) await new Promise(resolve => setTimeout(resolve, 10));
    assert.ok(record.opens.length >= target);
    assert.ok(record.opens[1] > 0, "Reconnect must preserve the delivered watermark");
  }
  fs.writeFileSync(gate, "release isolated mock reads\n");
  if (mode === "gap" || mode === "expired") await evaluate(helpers + `await wait(()=>document.body.innerText.includes('已恢复完整任务快照'),'snapshot restoration');`);
  const completed = await evaluate(helpers + `await wait(()=>state()==='succeeded'&&document.querySelectorAll('[data-evidence-id]').length===3,'final result');
    const sequences=[...document.querySelectorAll('[data-event-seq]')].map(item=>Number(item.dataset.eventSeq));
    ensure(new Set(sequences).size===sequences.length,'Duplicate visible progress');
    return {status:state(),evidence_count:3,sequences,restored:document.body.innerText.includes('已恢复完整任务快照')};`);
  if (mode === "gap" || mode === "expired") assert.equal(completed.restored, true);
  return { ...started, ...completed, reconnect_after_sequences: record.opens, explicit_disconnect: record.disconnected };
};
