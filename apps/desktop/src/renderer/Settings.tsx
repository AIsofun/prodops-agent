import { useEffect, useState } from "react";
import type { DesktopPreferences, ModelDraft } from "../shared/shell.js";
import type { ConnectionStatus } from "../shared/connection.js";
import { Icon } from "./Icons.js";

export function Settings({ screen, preferences, available, save, close, connection }: {
  screen: "models" | "connections"; preferences: DesktopPreferences; available: boolean;
  save(value: DesktopPreferences): Promise<boolean>; close(): void; connection: ConnectionStatus | null;
}) {
  const [source, setSource] = useState<"local" | "cloud">("local");
  const [local, setLocal] = useState<ModelDraft>(preferences.local);
  const [cloud, setCloud] = useState<ModelDraft>(preferences.cloud);
  const [server, setServer] = useState(preferences.server_endpoint);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setLocal(preferences.local); setCloud(preferences.cloud); setServer(preferences.server_endpoint); }, [preferences.local, preferences.cloud, preferences.server_endpoint]);
  useEffect(() => { setNotice(""); }, [screen, source]);
  const draft = source === "local" ? local : cloud;
  function update(key: keyof ModelDraft, value: string) { (source === "local" ? setLocal : setCloud)((previous) => ({ ...previous, [key]: value })); setNotice(""); }
  async function submit() {
    setSaving(true); setNotice("");
    const value = screen === "models" ? { ...preferences, local, cloud } : { ...preferences, server_endpoint: server };
    const saved = await save(value);
    setNotice(saved ? "连接资料已保存。当前排查服务与模拟诊断模式保持不变。" : "保存失败。请使用不含账号、密码或查询参数的 HTTP / HTTPS 地址，再重试。");
    setSaving(false);
  }
  return <section className="settings-page" aria-label={screen === "models" ? "模型与 API 设置" : "运行位置设置"}>
    <header className="settings-heading"><h1>{screen === "models" ? "模型与 API" : "运行位置"}</h1><button onClick={close} aria-label="返回排查"><Icon name="close" /></button></header>
    {screen === "models" ? <>
      <p className="settings-description">模型服务与排查运行位置分别设置</p>
      <div className="model-tabs" role="tablist" aria-label="模型类型">{(["local", "cloud"] as const).map((item) => <button key={item} id={`model-${item}`} role="tab" aria-selected={source === item} aria-controls="model-fields" onClick={() => setSource(item)}>{item === "local" ? "本地模型" : "云端 API"}</button>)}</div>
      <form id="model-fields" role="tabpanel" aria-labelledby={`model-${source}`} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <div className="settings-fields"><label>配置名称<input aria-label="配置名称" maxLength={80} value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label>服务协议<input aria-label="服务协议" value="OpenAI 兼容接口（待接入）" readOnly /></label>
          <label className="field-wide">{source === "local" ? "本地服务地址" : "API 基础地址"}<input aria-label="模型服务地址" type="url" maxLength={2048} value={draft.endpoint} placeholder={source === "local" ? "http://127.0.0.1:11434/v1" : "https://模型服务地址/v1"} onChange={(event) => update("endpoint", event.target.value)} /><small>仅保存不含密钥、账号或查询参数的服务地址。</small></label>
          <label className="field-wide">模型名称<input aria-label="模型名称" maxLength={128} value={draft.model} placeholder="填写服务中可用的模型标识" onChange={(event) => update("model", event.target.value)} /></label>
          {source === "cloud" && <div className="field-wide key-setting"><span>API Key</span><div><span>尚未接入密钥管理</span><button type="button" disabled>安全录入</button></div><small>密钥录入将在真实模型接入后启用，界面不会回显密钥。</small></div>}
        </div>
        <p className="settings-description support-note">当前使用显式模拟诊断。此处保存连接资料，真实模型调用与连接测试尚未接入。</p>
        <div className="settings-actions"><button type="button" disabled>测试连接</button><button className="primary" disabled={!available || saving} type="submit">{saving ? "保存中…" : "保存连接资料"}</button></div>
      </form>
    </> : <>
      <p className="settings-description">选择执行排查任务的电脑或服务器，与模型服务配置独立。</p>
      <div className="runtime-options"><div><Icon name="monitor" /><div><strong>在本机运行</strong><p>由当前电脑执行查询、保存任务与历史。</p></div><span>{connection?.mode === "local" ? "当前连接" : "尚未启用"}</span></div>
        <div><Icon name="server" /><div><strong>连接工厂服务器</strong><p>由内网服务器执行任务，客户端关闭后任务仍可继续。</p></div><span>{connection?.mode === "server" ? "开发连接" : "待接入"}</span></div></div>
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }}><label className="server-field">服务器地址<input aria-label="工厂服务器地址" type="url" maxLength={2048} value={server} placeholder="https://工厂服务器地址" onChange={(event) => { setServer(event.target.value); setNotice(""); }} /></label>
        <p className="settings-description support-note">可先保存服务器地址。服务器登录、工作区选择与连接切换尚未接入。</p>
        <div className="settings-actions"><button type="button" disabled>连接服务器</button><button className="primary" type="submit" disabled={!available || saving}>{saving ? "保存中…" : "保存连接资料"}</button></div>
      </form>
    </>}
    <p role="status" className="settings-notice">{notice}</p>
  </section>;
}
