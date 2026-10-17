const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

module.exports = async function workspaceProbe(window, output, phase) {
  const expected = process.env.PRODOPS_EXPECT_CONVERSATION ?? null;
  const result = await window.webContents.executeJavaScript(`(async () => {
    const phase=${JSON.stringify(phase)}, expected=${JSON.stringify(expected)};
    const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const ensure=(condition,message)=>{if(!condition)throw new Error(message);};
    async function wait(probe,label,timeout=20000){const start=Date.now();while(Date.now()-start<timeout){const value=probe();if(value)return value;await pause(5);}throw new Error('Timed out: '+label);}
    const unwrap=result=>{ensure(result.ok,'Bridge failure: '+(result.error?.code??'unknown'));return result.value;};
    const selected=()=>document.querySelector('[data-conversation]')?.dataset.conversation;
    const card=()=>document.querySelector('[data-run-id]');
    const input=()=>document.querySelector('textarea');
    const submit=()=>document.querySelector('[aria-label="提交排查"]');
    function type(value){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input(),value);input().dispatchEvent(new Event('input',{bubbles:true}));}
    async function send(value){type(value);await wait(()=>!submit().disabled,'send enabled');submit().click();}
    async function done(previous){return wait(()=>{const item=card();return item&&item.dataset.runId!==previous&&item.dataset.runStatus==='succeeded'&&document.querySelector('[data-role="assistant"]')&&item.querySelectorAll('[data-event-seq]').length>0?item.dataset.runId:null;},'completed UI task');}
    const messages=()=>[...document.querySelectorAll('[data-message-id]')].map(element=>element.dataset.messageId);
    const button=text=>[...document.querySelectorAll('button')].find(item=>item.textContent.trim()===text);
    async function choose(id){let item=document.querySelector('[data-conversation-id="'+id+'"]');if(!item&&button('更早会话')){button('更早会话').click();item=await wait(()=>document.querySelector('[data-conversation-id="'+id+'"]'),'earlier conversation');}ensure(item,'Conversation unavailable');item.click();await wait(()=>selected()===id&&!input().disabled,'conversation selected');}
    await wait(()=>document.querySelector('[data-connection-state="ready"]')&&!input().disabled,'business ready');
    if(phase==='reopen'){
      await choose(expected);
      await wait(()=>messages().length===4&&document.querySelectorAll('[data-evidence-id]').length===3,'persisted history');
      ensure(document.body.innerText.includes('故障是否恢复：尚未核验'),'Independent resolution absent');
      return {phase,conversation_id:expected,reopened_messages:messages().length,evidence_count:3,history_persisted:true};
    }
    await send('相机掉线');
    await wait(()=>submit().textContent.includes('提交中')||['queued','running'].includes(card()?.dataset.runStatus),'visible busy state');
    type('继续排查');await pause(5);
    ensure(submit().disabled,'Busy submit must be blocked');
    const firstRun=await done(null), firstConversation=selected();
    await wait(()=>messages().length===2,'first reply');
    ensure(input().value==='继续排查','Busy draft was lost');
    ensure(document.querySelectorAll('[data-evidence-id]').length===3,'Evidence absent');
    ensure(document.querySelector('[data-resolution="unknown"]'),'Resolution must remain unknown');
    await send('继续排查');await done(firstRun);await wait(()=>messages().length===4,'followup reply');
    ensure(document.querySelectorAll('[data-evidence-id]').length===3,'Followup did not use conversation context');
    document.querySelector('[data-action="new-conversation"]').click();
    await wait(()=>selected()&&selected()!==firstConversation&&!input().disabled,'new conversation');
    const secondConversation=selected();
    ensure(input().value==='','New conversation inherited draft');
    await send('继续排查');await done(null);await wait(()=>messages().length===2,'new conversation reply');
    ensure(document.querySelectorAll('[data-evidence-id]').length===0,'New conversation inherited evidence');
    await choose(firstConversation);await wait(()=>messages().length===4&&document.querySelectorAll('[data-evidence-id]').length===3,'switch back');
    type('现场记录草稿');await pause(10);await choose(secondConversation);type('另一会话草稿');await pause(10);await choose(firstConversation);
    ensure(input().value==='现场记录草稿','Draft crossed conversations');
    const workspace=unwrap(await window.prodops.business.workspaces()).items[0];
    const pagination=unwrap(await window.prodops.business.createConversation(workspace.workspace_id,{title:'分页验证'}));
    for(let index=0;index<21;index++){
      const run=unwrap(await window.prodops.business.submit(pagination.conversation_id,{content:'分页隔离样例 '+index,execution_mode:'mock'},crypto.randomUUID()));
      for(let attempt=0;attempt<100;attempt++){const current=unwrap(await window.prodops.business.run(run.run_id));if(current.status==='succeeded')break;ensure(attempt<99,'Seed task timeout');await pause(10);}
    }
    for(let index=0;index<20;index++)unwrap(await window.prodops.business.createConversation(workspace.workspace_id,{title:'分页空会话 '+index}));
    button('检查连接').click();await wait(()=>button('更早会话')&&!button('检查连接').disabled,'conversation pagination');
    button('更早会话').click();await wait(()=>document.querySelector('[data-conversation-id="'+pagination.conversation_id+'"]'),'older conversation page');
    await choose(pagination.conversation_id);await wait(()=>messages().length===20&&button('更早消息')&&button('更早任务'),'history pagination');
    const latestMessages=messages();button('更早消息').click();await wait(()=>messages().length===20&&!messages().some(id=>latestMessages.includes(id)),'older messages');
    button('最近消息').click();await wait(()=>messages().some(id=>latestMessages.includes(id)),'recent messages');
    button('更早任务').click();await wait(()=>document.querySelectorAll('[data-history-run]').length===1,'older runs');
    button('最近任务').click();await wait(()=>document.querySelectorAll('[data-history-run]').length===20,'recent runs');
    await choose(firstConversation);await wait(()=>messages().length===4&&document.querySelectorAll('[data-evidence-id]').length===3,'final first conversation');
    ensure(input().value==='现场记录草稿','Pagination lost draft');
    return {phase,conversation_id:firstConversation,second_conversation_id:secondConversation,
      completed_messages:messages().length,evidence_count:3,busy_draft_preserved:true,followup_context:true,new_conversation_isolated:true,
      conversation_pagination:true,message_pagination:true,run_pagination:true,draft_scope_isolated:true};
  })()`);
  assert.equal(result.evidence_count, 3);
  await window.webContents.executeJavaScript("document.querySelector('.run-card').scrollIntoView({block:'start'}); document.querySelector('.progress').open=false");
  await new Promise((resolve) => setTimeout(resolve, 100));
  fs.writeFileSync(path.join(output, "evidence.png"), (await window.webContents.capturePage()).toPNG());
  await window.webContents.executeJavaScript("document.querySelector('.message-list').scrollIntoView({block:'start'})");
  return result;
};
