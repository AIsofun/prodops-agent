import { useEffect, useState } from "react";
import type { ConnectionStatus } from "../shared/connection.js";

const labels = {
  ready: ["服务已就绪", "已连接开发服务。诊断任务功能尚未开放。"],
  offline: ["服务离线", "请手动启动本机开发服务，再检查连接。"],
  incompatible: ["协议不兼容", "请使用与桌面版本兼容的服务，再重新连接。"],
  not_ready: ["服务尚未就绪", "服务正在准备，请稍后再次检查。"],
  invalid_response: ["服务响应异常", "请核对开发服务版本与配置，然后重新检查。"],
};

export function App() {
  const info = window.prodops.getInfo();
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [checking, setChecking] = useState(true);
  async function checkConnection() {
    setChecking(true);
    try { setConnection(await window.prodops.connections.getStatus()); }
    catch { setConnection({ connection_id: "development", mode: "local", state: "invalid_response", deployment_id: null, protocol_version: null }); }
    finally { setChecking(false); }
  }
  useEffect(() => { void checkConnection(); }, []);
  const text = checking ? ["正在检查服务", "正在连接已配置的开发服务。"] : connection ? labels[connection.state] : ["服务响应异常", "请重新检查连接。"];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">P</span><strong>{info.name}</strong></div>
        <div className="workspace"><span className="eyebrow">当前连接</span><strong>{connection?.mode === "server" ? "服务器开发环境" : "本机开发环境"}</strong></div>
        <button className="new-chat" disabled>＋ 新建排查</button>
        <div className="section-label">排查记录</div>
        <div className="empty-history">暂无会话记录<br /><span>完成的排查将在这里保留</span></div>
        <div className="sidebar-footer"><span className="status-dot" />开发预览 <span>v{info.version}</span></div>
      </aside>
      <main>
        <header className="topbar"><span>设备异常排查</span><span className="preview-badge">开发预览</span></header>
        <div className="content">
          <div className="intro"><div className="eyebrow">PRODUCTION OPERATIONS</div><h1>从异常描述开始排查</h1><p>连接服务后，结合设备状态、日志和操作手册，逐步核对问题。</p></div>
          <section className="connection-card" aria-label="服务连接" data-connection-state={checking ? "checking" : connection?.state}>
            <div className="connection-icon">◎</div><div aria-live="polite"><h2>{text[0]}</h2><p>{text[1]}</p></div><button disabled={checking} onClick={() => void checkConnection()}>检查连接</button>
          </section>
          <section className="steps" aria-label="排查流程">
            <article><span>01</span><h3>描述异常</h3><p>说明设备、发生时间和观察到的现象。</p></article>
            <article><span>02</span><h3>核对证据</h3><p>查看每一步进度，以及查询结果的来源。</p></article>
            <article><span>03</span><h3>确认下一步</h3><p>结合诊断与现场情况，决定后续处理。</p></article>
          </section>
          <div className="composer"><textarea aria-label="异常描述" disabled placeholder="诊断功能准备中，连接服务后即可开始。" /><div><span>仅在授权范围内查询设备和数据</span><button disabled aria-label="提交排查">↑</button></div></div>
          <p className="scope-note">当前版本提供基础窗口，诊断任务与历史记录尚未开放。</p>
        </div>
      </main>
    </div>
  );
}
