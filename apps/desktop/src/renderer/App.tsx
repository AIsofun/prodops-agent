import { busyRun, useWorkspace, type Snapshot } from "./useWorkspace.js";
import type { RunEvent } from "../shared/business.js";
import { useState } from "react";

const labels = {
  ready: ["服务已就绪", "当前使用模拟诊断，不连接真实设备或模型。"],
  offline: ["服务离线", "请重新打开应用；若仍失败，请检查服务配置。"],
  incompatible: ["协议不兼容", "请使用与桌面版本兼容的服务，再重新连接。"],
  not_ready: ["服务尚未就绪", "服务正在准备，请稍后再次检查。"],
  invalid_response: ["服务响应异常", "请核对服务版本与配置，然后重新检查。"],
};
const statuses: Record<Snapshot["status"], string> = {
  queued: "排队中", running: "正在排查", awaiting_approval: "等待确认", cancelling: "正在取消",
  recovery_required: "中断后待核对", succeeded: "诊断完成", failed: "诊断失败", cancelled: "已取消",
};
const toolNames: Record<string, string> = { "mock.read_metrics": "读取模拟指标", "mock.read_logs": "读取模拟日志", "mock.read_runbook": "查阅模拟操作手册" };
function eventText(event: RunEvent): string {
  switch (event.event_type) {
    case "run.created": return "任务已提交，等待执行";
    case "run.started": return "开始模拟诊断";
    case "step.started": return toolNames[event.payload.label] ?? "开始排查步骤";
    case "tool.started": return toolNames[event.payload.tool_name] ?? "开始只读查询";
    case "tool.completed": return event.payload.status === "succeeded" ? "查询完成，证据已保存" : "查询未能完成";
    case "message.delta": return "诊断回复已保存";
    case "approval.requested": return "操作需要明确确认";
    case "run.completed": return "只读诊断完成，故障恢复情况仍需核验";
    case "run.failed": return "诊断失败，请查看任务状态";
    case "run.cancelled": return "任务已取消，已有结果保留";
    case "run.cancel_requested": return "已请求取消，等待当前步骤收尾";
    case "run.recovery_required": return "执行中断，需要核对未确认结果";
    case "run.recovery_approved": return "已确认继续执行模拟查询";
  }
}
const time = (value: string) => new Date(value).toLocaleString("zh-CN", { hour12: false });
function RecoveryPanel({ run, disabled, recover }: { run: Snapshot; disabled: boolean; recover(ids: string[]): Promise<void> }) {
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const unknown = run.unknown_tool_call_ids ?? [];
  return <section className="recovery-panel" aria-label="中断结果核对"><h3>核对未确认的查询</h3>
    <p>服务中断时，以下查询没有确认结果。核对记录后，可以明确允许重做尚未确认的模拟只读查询；已有证据会保留。</p>
    {unknown.map((id) => <label key={id}><input type="checkbox" data-review-call={id} disabled={disabled} checked={reviewed.includes(id)}
      onChange={(event) => setReviewed((previous) => event.target.checked ? [...previous, id] : previous.filter((item) => item !== id))} />我已核对查询记录 <code>{id}</code></label>)}
    <label><input type="checkbox" data-action="confirm-recovery" disabled={disabled} checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />我确认继续执行模拟只读查询，允许重做尚未确认的步骤。</label>
    <button data-action="recover-run" disabled={disabled || !confirmed || reviewed.length !== unknown.length} onClick={() => void recover(reviewed)}>{disabled ? "提交核对中…" : "确认后继续排查"}</button>
  </section>;
}
function Pagination({ earlier, recent, onEarlier, onRecent, label }: { earlier: boolean; recent: boolean; onEarlier(): void; onRecent(): void; label: string }) {
  if (!earlier && !recent) return null;
  return <div className="pagination">{recent && <button onClick={onRecent}>最近{label}</button>}{earlier && <button onClick={onEarlier}>更早{label}</button>}</div>;
}

export function App() {
  const info = window.prodops.getInfo();
  const state = useWorkspace();
  const busy = busyRun(state.run);
  const text = state.checking ? ["正在检查服务", "正在连接当前服务。"] : state.connection ? labels[state.connection.state] : ["服务响应异常", "请重新检查连接。"];
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">P</span><strong>{info.name}</strong></div>
      <div className="workspace"><span className="eyebrow">当前连接</span><strong>{state.connection?.mode === "server" ? "服务器开发环境" : "本机开发环境"}</strong><span className="mock-tag">模拟诊断</span></div>
      <button className="new-chat" data-action="new-conversation" disabled={!state.workspaceId || state.submitting || state.loading} onClick={() => void state.createConversation()}>＋ 新建排查</button>
      <div className="section-label">排查记录</div>
      <nav className="conversation-list" aria-label="会话列表">
        {state.conversations.map((item) => <button key={item.conversation_id} data-conversation-id={item.conversation_id} aria-current={item.conversation_id === state.selected?.conversation_id ? "page" : undefined}
          disabled={state.submitting} onClick={() => void state.selectConversation(item)}><strong>{item.title}</strong><span>{time(item.created_at)}</span></button>)}
        {state.conversations.length === 0 && <div className="empty-history">暂无会话记录<br /><span>从右侧描述一个问题开始</span></div>}
      </nav>
      <Pagination label="会话" earlier={state.conversationNext !== null} recent={state.conversationCursor !== null}
        onEarlier={() => void state.paginate("conversations", state.conversationNext)} onRecent={() => void state.paginate("conversations", null)} />
      <div className="sidebar-footer"><span className="status-dot" />开发预览 <span>v{info.version}</span></div>
    </aside>
    <main>
      <header className="topbar"><span>设备异常排查</span><span className="preview-badge">模拟环境 · 只读</span></header>
      <div className="content">
        <div className={`intro ${state.selected ? "compact" : ""}`}><div className="eyebrow">PRODUCTION OPERATIONS</div><h1>{state.selected?.title ?? "从异常描述开始排查"}</h1>
          {!state.selected && <p>描述问题，逐步核对指标、日志和操作手册，查看带来源的建议。</p>}</div>
        <section className="connection-card" aria-label="服务连接" data-connection-state={state.checking ? "checking" : state.connection?.state}>
          <div className="connection-icon">◎</div><div aria-live="polite"><h2>{text[0]}</h2><p>{text[1]}</p></div><button disabled={state.checking || state.submitting} onClick={() => void state.checkConnection()}>检查连接</button>
        </section>
        {state.problem && <section className="problem" role="alert"><p>{state.problem.text}</p>{state.problem.requestId && <small>关联记录：{state.problem.requestId}</small>}
          <button disabled={state.loading || state.submitting} onClick={() => void (state.selected ? state.selectConversation(state.selected) : state.checkConnection())}>刷新当前记录</button></section>}
        {state.loading && <p role="status">正在读取会话记录…</p>}
        <section className="message-list" aria-label="会话消息" data-conversation={state.selected?.conversation_id ?? ""}>
          <Pagination label="消息" earlier={state.messageNext !== null} recent={state.messageCursor !== null}
            onEarlier={() => void state.paginate("messages", state.messageNext)} onRecent={() => void state.paginate("messages", null)} />
          {[...state.messages].reverse().map((message) => <article className={`message ${message.role}`} key={message.message_id} data-message-id={message.message_id} data-role={message.role}>
            <header><strong>{message.role === "user" ? "你" : "模拟诊断"}</strong><time>{time(message.created_at)}</time></header><p>{message.content}</p></article>)}
          {state.selected && !state.loading && state.messages.length === 0 && <p className="empty-view">这是一个新会话。可输入相机掉线、OCR质量下降、Kafka堆积或推理延迟。</p>}
        </section>
        {state.run && <section className="run-card" aria-label="任务状态" data-run-id={state.run.run_id} data-run-status={state.run.status}>
          <div className="run-heading"><h2>{statuses[state.run.status]}</h2><span className="mock-tag">显式模拟</span>
            {["queued", "running", "cancelling"].includes(state.run.status) && <button data-action="cancel-run" disabled={state.acting || state.run.status === "cancelling"} onClick={() => void state.cancelRun()}>{state.run.status === "cancelling" ? "等待当前步骤收尾…" : "取消排查"}</button>}</div>
          <p className="run-reference">任务 {state.run.run_id}</p>
          <p className="resolution" data-resolution={state.run.resolution_status}>故障是否恢复：{({ unknown: "尚未核验", unresolved: "未恢复", resolved: "已核验恢复" })[state.run.resolution_status]}</p>
          {state.run.error && state.run.status === "failed" && <p className="problem">{state.run.error.code === "budget_exceeded" ? "本次排查超过执行预算，已停止后续查询。" : "本次排查未完成，请检查连接与问题描述。"}已有证据保留，核对后可发起新排查。</p>}
          {state.run.status === "cancelling" && <p>正在停止后续步骤；在途查询的结果仍会保留。</p>}
          {state.run.status === "recovery_required" && <RecoveryPanel key={`${state.run.run_id}:${state.run.version}`} run={state.run} disabled={state.acting} recover={state.recoverRun} />}
          <p className="stream-status" data-stream-state={state.stream} aria-live="polite">{state.stream === "reconnecting" ? "进度连接中断，正在按原进度重新连接。任务状态以服务记录为准。" : state.stream === "restoring" ? "正在重新读取任务快照，避免遗漏进度。" : state.stream === "open" ? "正在接收进度…" : state.stream === "ended" ? "进度已同步" : "进度连接已停止，可刷新记录核对。"}</p>
          {state.restored && <p className="stream-status">已恢复完整任务快照；下方继续展示新收到的进度。</p>}
          <details className="progress" open><summary>排查进度 <span>{state.events.length} 条近期进度记录</span></summary>
            <ol>{state.events.map((event) => <li key={event.seq} data-event-seq={event.seq}><span>{eventText(event)}</span><time>{new Date(event.occurred_at).toLocaleTimeString("zh-CN", { hour12: false })}</time></li>)}</ol>
          </details>
          <div className="evidence-grid" aria-label="诊断证据">
            {state.run.evidence.map((item) => <article className="evidence" key={item.evidence_id} data-evidence-id={item.evidence_id}><h3>模拟证据</h3><p>{item.summary}</p><code>{item.source}</code><time>采集：{time(item.collected_at)}</time>
              <details><summary>查看证据记录</summary><pre>{JSON.stringify(item, null, 2)}</pre></details></article>)}
          </div>
        </section>}
        {state.runs.length > 0 && <section className="run-history" aria-label="历史任务"><h2>本会话任务</h2><div>{state.runs.map((item) => <button key={item.run_id} disabled={busy || state.submitting} data-history-run={item.run_id}
          aria-pressed={item.run_id === state.run?.run_id} onClick={() => state.selectRun(item)}>{statuses[item.status]} · {time(item.created_at)}</button>)}</div>
          <Pagination label="任务" earlier={state.runNext !== null} recent={state.runCursor !== null} onEarlier={() => void state.paginate("runs", state.runNext)} onRecent={() => void state.paginate("runs", null)} /></section>}
        <form className="composer" onSubmit={(event) => { event.preventDefault(); void state.submit(); }}>
          <label className="sr-only" htmlFor="diagnostic-input">异常描述</label><textarea id="diagnostic-input" aria-label="异常描述" value={state.draft} maxLength={32000} disabled={!state.workspaceId || state.loading}
            onChange={(event) => state.setDraft(event.target.value)} placeholder={busy ? "可继续编辑草稿，当前任务结束后再发送。" : state.selected ? "继续描述问题，或输入“继续排查”…" : "例如：2号相机掉线了，最近五分钟没有图像。"} />
          <div><span>{busy ? "当前任务尚未结束，草稿会保留" : "只查询模拟数据，不执行设备处置"}</span><button type="submit" disabled={!state.workspaceId || busy || state.loading || state.submitting || !state.draft.trim()} aria-label="提交排查">{state.submitting ? "提交中…" : "发送 ↑"}</button></div>
        </form>
        <p className="scope-note">模拟结果不代表现场事实。任务完成与故障恢复分别记录。</p>
      </div>
    </main>
  </div>;
}
