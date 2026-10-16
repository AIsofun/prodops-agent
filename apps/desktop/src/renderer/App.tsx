export function App() {
  const info = window.prodops.getInfo();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">P</span><strong>{info.name}</strong></div>
        <div className="workspace"><span className="eyebrow">当前工作区</span><strong>本机开发环境</strong></div>
        <button className="new-chat" disabled>＋ 新建排查</button>
        <div className="section-label">排查记录</div>
        <div className="empty-history">暂无会话记录<br /><span>完成的排查将在这里保留</span></div>
        <div className="sidebar-footer"><span className="status-dot" />开发预览 <span>v{info.version}</span></div>
      </aside>
      <main>
        <header className="topbar"><span>设备异常排查</span><span className="preview-badge">开发预览</span></header>
        <div className="content">
          <div className="intro"><div className="eyebrow">PRODUCTION OPERATIONS</div><h1>从异常描述开始排查</h1><p>连接服务后，结合设备状态、日志和操作手册，逐步核对问题。</p></div>
          <section className="connection-card" aria-label="服务连接">
            <div className="connection-icon">◎</div><div><h2>尚未连接服务</h2><p>开发版本请手动启动本机服务。服务连接功能准备中。</p></div><button disabled>检查连接</button>
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
