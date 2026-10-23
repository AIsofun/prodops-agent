import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ConnectionStatus } from "../shared/connection.js";
import { defaultPreferences, type DesktopPreferences, type MenuAction, type MenuName, type WindowAction } from "../shared/shell.js";
import { Icon } from "./Icons.js";
import { Settings } from "./Settings.js";

export type Screen = "chat" | "models" | "connections";
export function DesktopShell({ children, navigation, screen, setScreen, create, disabled, connection, checking, check }: {
  children: ReactNode; navigation: ReactNode; screen: Screen; setScreen(screen: Screen): void;
  create(): void; disabled: boolean; connection: ConnectionStatus | null; checking: boolean; check(): void;
}) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const current = useRef(preferences);
  const [available, setAvailable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [writing, setWriting] = useState(false);
  const writeLock = useRef(false);
  const [problem, setProblem] = useState("");
  const [profile, setProfile] = useState(false);
  const [runtime, setRuntime] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const runtimeRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const logo = new URL("./assets/logo.svg", import.meta.url).href;
  useEffect(() => {
    let active = true;
    window.prodops.shell.preferences().then((value) => { if (active) { current.current = value; setPreferences(value); setAvailable(true); } },
      () => { if (active) setProblem("界面配置读取失败，暂不能保存。请重新打开应用后重试。"); }).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  async function save(value: DesktopPreferences) {
    if (writeLock.current) return false;
    writeLock.current = true; setWriting(true);
    try { const result = await window.prodops.shell.savePreferences({ ...value, sidebar_collapsed: current.current.sidebar_collapsed });
      current.current = result; setPreferences(result); setProblem(""); return true;
    } catch { return false; }
    finally { writeLock.current = false; setWriting(false); }
  }
  async function toggleSidebar() {
    if (writeLock.current || !loaded) return;
    const previous = current.current;
    const next = { ...previous, sidebar_collapsed: !previous.sidebar_collapsed };
    current.current = next; setPreferences(next); setProfile(false);
    if (available) {
      writeLock.current = true; setWriting(true);
      try { await window.prodops.shell.savePreferences(next); }
      catch { setProblem("左栏显示已调整，本次偏好未能保存。"); }
      finally { writeLock.current = false; setWriting(false); }
    }
  }
  function navigate(value: Screen) { setScreen(value); setRuntime(false); setProfile(false); }
  const callbacks = useRef({ create, disabled, navigate, toggleSidebar });
  callbacks.current = { create, disabled, navigate, toggleSidebar };
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") { setRuntime(false); setProfile(false); return; }
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (event.key.toLowerCase() === "b") { event.preventDefault(); void callbacks.current.toggleSidebar(); }
      if (event.key.toLowerCase() === "n" && !callbacks.current.disabled) { event.preventDefault(); callbacks.current.navigate("chat"); callbacks.current.create(); }
      if (event.key === ",") { event.preventDefault(); callbacks.current.navigate("models"); }
    }
    function dismiss(event: PointerEvent) {
      if (!runtimeRef.current?.contains(event.target as Node)) setRuntime(false);
      if (!profileRef.current?.contains(event.target as Node)) setProfile(false);
    }
    document.addEventListener("keydown", keyboard); document.addEventListener("pointerdown", dismiss);
    return () => { document.removeEventListener("keydown", keyboard); document.removeEventListener("pointerdown", dismiss); };
  }, []);
  function action(value: MenuAction) {
    if (value === "new-conversation" && !disabled) { navigate("chat"); create(); }
    if (value === "models" || value === "connections") navigate(value);
    if (value === "toggle-sidebar") void toggleSidebar();
    if (value === "about") setProfile(true);
    if (value === "quit") void window.prodops.app.quit();
  }
  async function menu(name: MenuName) { try { action(await window.prodops.shell.menu(name)); } catch { setProblem("菜单暂不可用，请重试。"); } }
  async function control(value: WindowAction) { try { setMaximized((await window.prodops.shell.window(value)).maximized); } catch { setProblem("窗口操作未完成，请重试。"); } }
  return <div className={`app-shell ${preferences.sidebar_collapsed ? "sidebar-collapsed" : ""}`}>
    <header className="titlebar" aria-label="应用标题栏">
      <button className="sidebar-toggle" disabled={writing || !loaded} data-action="toggle-sidebar" aria-label={preferences.sidebar_collapsed ? "展开左侧栏" : "收起左侧栏"} aria-expanded={!preferences.sidebar_collapsed} aria-controls="app-sidebar" onClick={() => void toggleSidebar()}><Icon name="panel" /></button>
      <nav className="desktop-menus" aria-label="应用菜单">{(["file", "edit", "view", "help"] as const).map((name) => <button key={name} onClick={() => void menu(name)}>{name[0].toUpperCase() + name.slice(1)}</button>)}</nav>
      <div className="window-drag" onDoubleClick={() => void control("maximize")} />
      <div className="window-controls" aria-label="窗口控制"><button aria-label="最小化" onClick={() => void control("minimize")}><Icon name="minus" /></button><button aria-label={maximized ? "还原窗口" : "最大化"} onClick={() => void control("maximize")}><Icon name="maximize" /></button><button className="window-close" aria-label="关闭窗口" onClick={() => void control("close")}><Icon name="close" /></button></div>
    </header>
    <aside className="sidebar" id="app-sidebar" aria-label="会话导航">
      <div className="wordmark">ProdOps</div><button className="new-chat" aria-label="新建排查" data-action="new-conversation" disabled={disabled} onClick={() => { navigate("chat"); create(); }}><Icon name="plus" /><span>新建排查</span></button>
      <div className="conversation-navigation" onClick={() => navigate("chat")}>{navigation}</div>
      <div className="sidebar-bottom"><button className="settings-entry" aria-label="模型与 API 设置" onClick={() => navigate("models")}><Icon name="settings" /><span>模型与 API 设置</span></button>
        <div className="profile-anchor" ref={profileRef}><button className="logo-button" aria-label="ProdOps 项目 Logo 与关于信息" aria-expanded={profile} aria-controls="about-prodops" onClick={() => setProfile(!profile)}><img src={logo} alt="ProdOps 四维超立方体" /></button>
          <section className="profile-popover" id="about-prodops" hidden={!profile} aria-label="关于 ProdOps"><h2>ProdOps</h2><p>四维超立方体 · 16 个顶点，32 条连线</p><p>版本 {window.prodops.getInfo().version} · 模拟诊断</p></section></div>
      </div>
    </aside>
    <main className="main-panel">
      <header className="contextbar connection-card" data-connection-state={checking ? "checking" : connection?.state} aria-label="服务连接">
        <span>排查助手</span><div className="runtime-anchor" ref={runtimeRef}><button aria-expanded={runtime} aria-controls="runtime-popover" onClick={() => setRuntime(!runtime)}><Icon name={connection?.mode === "server" ? "server" : "monitor"} />运行位置：{connection?.mode === "server" ? "工厂服务器" : "本机"}<Icon name="down" /></button>
          <section className="runtime-popover" id="runtime-popover" hidden={!runtime} aria-label="排查运行位置"><h2>排查运行位置</h2><p>{connection?.mode === "server" ? "当前连接开发服务器，由服务器执行排查。" : "由当前电脑的服务执行排查任务。"}</p><p>模型服务可独立选择本地或云端。</p><p className="connection-state">{checking ? "正在检查服务…" : ({ ready: "服务已就绪 · 显式模拟诊断", offline: "服务离线", incompatible: "协议不兼容", not_ready: "服务尚未就绪", invalid_response: "服务响应异常" })[connection?.state ?? "invalid_response"]}</p>
            <button disabled={checking} onClick={check}>检查连接</button><button onClick={() => navigate("connections")}>运行位置设置</button></section></div>
      </header>
      {problem && <p className="shell-problem" role="alert">{problem}</p>}
      <div className="chat-screen" hidden={screen !== "chat"}>{children}</div>
      {screen !== "chat" && <Settings screen={screen} preferences={preferences} available={available && !writing} save={save} close={() => navigate("chat")} connection={connection} />}
    </main>
  </div>;
}
