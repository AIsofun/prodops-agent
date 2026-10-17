import { useEffect, useRef, useState } from "react";
import type { components } from "../../../../packages/api-client/src/schema.js";
import type { BridgeCode, BridgeResult, RunEvent } from "../shared/business.js";
import { ProgressSession, type ProgressState } from "../shared/progress.js";
import type { ConnectionStatus } from "../shared/connection.js";

type Schema = components["schemas"];
export type Conversation = Schema["Conversation"];
export type Snapshot = Schema["RunSnapshot"];
export const busyRun = (run: Snapshot | null) => run !== null && !["succeeded", "failed", "cancelled"].includes(run.status);
export const errors: Record<BridgeCode, string> = {
  offline: "连接已断开。请刷新历史核对提交结果，草稿已保留。",
  invalid_response: "服务响应异常。请检查应用与服务版本，然后刷新。",
  incompatible: "应用与服务版本不兼容，请安装匹配的版本。",
  unauthenticated: "当前身份不可用，请重新打开应用后检查连接。",
  forbidden: "当前身份没有权限访问这些内容，请核对工作区。",
  not_found: "记录已不可访问，请刷新会话列表。",
  conflict: "会话忙碌或记录已变化，请刷新任务状态后核对。",
  invalid_request: "内容或请求不符合要求，请修改后再试。",
  capacity: "服务或订阅已达上限，请稍后刷新。",
  not_ready: "业务服务尚未就绪。请重新打开应用并检查服务配置。",
  cursor_expired: "进度记录起点已过期，请刷新任务快照。",
};
class BridgeFailure extends Error {
  constructor(readonly code: BridgeCode, readonly requestId: string | null) { super(code); }
}
function unwrap<T>(result: BridgeResult<T>): T {
  if (!result.ok) throw new BridgeFailure(result.error.code, result.error.request_id);
  return result.value;
}
const api = () => window.prodops.business;
const page = (cursor: string | null) => ({ limit: 20, cursor });

export function useWorkspace() {
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationCursor, setConversationCursor] = useState<string | null>(null);
  const [conversationNext, setConversationNext] = useState<string | null>(null);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Schema["Message"][]>([]);
  const [messageNext, setMessageNext] = useState<string | null>(null);
  const [messageCursor, setMessageCursor] = useState<string | null>(null);
  const [runs, setRuns] = useState<Snapshot[]>([]);
  const [runNext, setRunNext] = useState<string | null>(null);
  const [runCursor, setRunCursor] = useState<string | null>(null);
  const [run, setRun] = useState<Snapshot | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [stream, setStream] = useState<ProgressState>("closed");
  const [restored, setRestored] = useState(false);
  const [acting, setActing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<{ text: string; requestId: string | null } | null>(null);
  const epoch = useRef(0);
  const progress = useRef<ProgressSession | null>(null);
  const action = useRef(false);
  const recovery = useRef<{ runId: string; version: number; key: string } | null>(null);
  const sending = useRef(false);
  const messagePage = useRef<string | null>(null);
  const runPage = useRef<string | null>(null);
  const messageQuery = useRef(0);
  const runQuery = useRef(0);
  const conversationQuery = useRef(0);
  const pending = useRef<{ conversation: string; content: string; key: string } | null>(null);

  function report(error: unknown) {
    setProblem(error instanceof BridgeFailure ? { text: errors[error.code], requestId: error.requestId } :
      { text: "操作暂未完成，请刷新记录后核对。草稿已保留。", requestId: null });
  }
  function stopWatching() {
    progress.current?.stop();
    progress.current = null;
  }
  async function readConversations(workspace: string, cursor: string | null) {
    const query = ++conversationQuery.current;
    const result = unwrap(await api().conversations(workspace, page(cursor)));
    if (query === conversationQuery.current) { setConversations(result.items); setConversationCursor(cursor); setConversationNext(result.next_cursor); }
    return result.items;
  }
  async function watch(snapshot: Snapshot, token: number) {
    stopWatching();
    setEvents([]); setStream("open"); setRestored(false);
    const current = () => epoch.current === token && progress.current === session;
    const session = new ProgressSession({ ...window.prodops.events, snapshot: (id) => api().run(id) }, snapshot, {
      state: (value) => { if (current()) setStream(value); },
      events: (items) => { if (current()) setEvents((previous) => [...previous, ...items].slice(-80)); },
      snapshot: (latest, reset) => {
        if (!current()) return;
        setRun(latest); setRuns((previous) => previous.map((item) => item.run_id === latest.run_id ? latest : item));
        if (reset) { setEvents([]); setRestored(true); }
      },
      finished: async () => {
        if (messagePage.current !== null || !current()) return;
        const history = unwrap(await api().messages(snapshot.conversation_id, page(null)));
        if (current() && messagePage.current === null) { setMessages(history.items); setMessageNext(history.next_cursor); }
      },
      failure: (code) => { if (current()) report(new BridgeFailure(code, null)); },
    });
    progress.current = session;
    await session.run();
  }
  async function selectConversation(conversation: Conversation) {
    const token = ++epoch.current;
    stopWatching(); setSelected(conversation); setMessages([]); setRuns([]); setRun(null); setEvents([]);
    setMessageCursor(null); messagePage.current = null; setRunCursor(null); runPage.current = null;
    setMessageNext(null); setRunNext(null); setStream("closed"); setLoading(true); setProblem(null);
    try {
      const [history, tasks] = await Promise.all([api().messages(conversation.conversation_id, page(null)), api().runs(conversation.conversation_id, page(null))]);
      if (epoch.current !== token) return;
      const messageResult = unwrap(history), runResult = unwrap(tasks);
      setMessages(messageResult.items); setMessageNext(messageResult.next_cursor);
      setRuns(runResult.items); setRunNext(runResult.next_cursor);
      const latest = runResult.items[0] ?? null;
      setRun(latest);
      if (latest) void watch(latest, token);
    } catch (error) { if (epoch.current === token) report(error); }
    finally { if (epoch.current === token) setLoading(false); }
  }
  async function checkConnection() {
    const token = epoch.current;
    setChecking(true); setProblem(null);
    try {
      const status = await window.prodops.connections.getStatus();
      if (epoch.current !== token) return;
      setConnection(status);
      if (status.state === "ready") {
        const workspace = unwrap(await api().workspaces()).items[0];
        if (epoch.current !== token) return;
        if (!workspace) throw new BridgeFailure("not_ready", null);
        setWorkspaceId(workspace.workspace_id);
        const items = await readConversations(workspace.workspace_id, null);
        if (epoch.current !== token) return;
        if (selected) await selectConversation(selected);
        else if (items[0]) await selectConversation(items[0]);
      }
    } catch (error) { report(error); }
    finally { setChecking(false); }
  }
  useEffect(() => {
    void checkConnection();
    return () => { epoch.current++; stopWatching(); };
  }, []);

  const draftKey = selected?.conversation_id ?? "new";
  const draft = drafts[draftKey] ?? "";
  function setDraft(content: string) { setDrafts((previous) => ({ ...previous, [draftKey]: content })); }
  async function createConversation() {
    if (!workspaceId || sending.current) return;
    sending.current = true; setSubmitting(true); setProblem(null);
    try {
      const conversation = unwrap(await api().createConversation(workspaceId, { title: "新的排查" }));
      await readConversations(workspaceId, null); await selectConversation(conversation);
    } catch (error) { report(error); }
    finally { sending.current = false; setSubmitting(false); }
  }
  async function submit() {
    const content = draft.trim();
    if (!workspaceId || sending.current || busyRun(run) || loading || !content) return;
    sending.current = true; setSubmitting(true); setProblem(null);
    try {
      let conversation = selected;
      if (!conversation) {
        conversation = unwrap(await api().createConversation(workspaceId, { title: content.slice(0, 64) }));
        const createdId = conversation.conversation_id;
        setDrafts((previous) => ({ ...previous, [createdId]: previous.new ?? "", new: "" }));
        await selectConversation(conversation);
      }
      const token = epoch.current;
      if (pending.current?.conversation !== conversation.conversation_id || pending.current.content !== content) {
        pending.current = { conversation: conversation.conversation_id, content, key: crypto.randomUUID() };
      }
      const result = unwrap(await api().submit(conversation.conversation_id, { content, execution_mode: "mock" }, pending.current.key));
      pending.current = null;
      if (epoch.current !== token) return;
      setRun(result); setRuns((previous) => [result, ...previous.filter((item) => item.run_id !== result.run_id)].slice(0, 20));
      setRunCursor(null); runPage.current = null; setMessageCursor(null); messagePage.current = null;
      const submittedConversation = conversation.conversation_id;
      setDrafts((previous) => ({ ...previous, [submittedConversation]: previous[submittedConversation]?.trim() === content ? "" : previous[submittedConversation] ?? "" }));
      const history = unwrap(await api().messages(conversation.conversation_id, page(null)));
      if (epoch.current === token) { setMessages(history.items); setMessageNext(history.next_cursor); void watch(result, token); }
      await readConversations(workspaceId, null);
    } catch (error) { report(error); }
    finally { sending.current = false; setSubmitting(false); }
  }
  async function paginate(kind: "conversations" | "messages" | "runs", cursor: string | null) {
    const token = epoch.current;
    setProblem(null);
    try {
      if (kind === "conversations" && workspaceId) await readConversations(workspaceId, cursor);
      else if (selected && kind === "messages") {
        const query = ++messageQuery.current;
        messagePage.current = cursor;
        const result = unwrap(await api().messages(selected.conversation_id, page(cursor)));
        if (token === epoch.current && query === messageQuery.current) { setMessageCursor(cursor); setMessages(result.items); setMessageNext(result.next_cursor); }
      } else if (selected && kind === "runs") {
        const query = ++runQuery.current;
        runPage.current = cursor;
        const result = unwrap(await api().runs(selected.conversation_id, page(cursor)));
        if (token === epoch.current && query === runQuery.current) { setRunCursor(cursor); setRuns(result.items); setRunNext(result.next_cursor); }
      }
    } catch (error) { if (token === epoch.current) report(error); }
  }
  function selectRun(snapshot: Snapshot) {
    if (busyRun(run)) return;
    setRun(snapshot); setProblem(null); void watch(snapshot, epoch.current);
  }
  async function cancelRun() {
    if (!run || action.current || !["queued", "running"].includes(run.status)) return;
    const token = epoch.current;
    action.current = true; setActing(true); setProblem(null);
    try {
      const latest = unwrap(await api().cancel(run.run_id, {}));
      if (epoch.current === token) { setRun(latest); void watch(latest, token); }
    } catch (error) { if (epoch.current === token) report(error); }
    finally { action.current = false; setActing(false); }
  }
  async function recoverRun(reviewed: string[]) {
    const unknown = run?.unknown_tool_call_ids ?? [];
    if (!run || action.current || run.status !== "recovery_required" || reviewed.length !== unknown.length ||
        new Set(reviewed).size !== reviewed.length || reviewed.some((id) => !unknown.includes(id))) return;
    const token = epoch.current;
    action.current = true; setActing(true); setProblem(null);
    try {
      if (recovery.current?.runId !== run.run_id || recovery.current.version !== run.version) {
        recovery.current = { runId: run.run_id, version: run.version, key: crypto.randomUUID() };
      }
      const latest = unwrap(await api().recover(run.run_id, { expected_version: run.version, reviewed_tool_call_ids: reviewed, decision: "retry_mock_reads" }, recovery.current.key));
      recovery.current = null;
      if (epoch.current === token) { setRun(latest); void watch(latest, token); }
    } catch (error) { if (epoch.current === token) report(error); }
    finally { action.current = false; setActing(false); }
  }
  return { connection, checking, workspaceId, conversations, conversationCursor, conversationNext, selected,
    messages, messageCursor, messageNext, runs, runCursor, runNext, run, events, stream, restored, acting, draft, loading, submitting, problem,
    setDraft, checkConnection, createConversation, selectConversation, selectRun, submit, paginate, cancelRun, recoverRun };
}
