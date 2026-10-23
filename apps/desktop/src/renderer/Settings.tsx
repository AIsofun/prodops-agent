import { useEffect, useRef, useState } from "react";
import type { DesktopPreferences, ModelDraft, ModelCheckCode } from "../shared/shell.js";
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
  const [pending, setPending] = useState(false);
  const [configured, setConfigured] = useState(false);
  const initialized = useRef(available);
  const revision = useRef(0);
  const actionLock = useRef(false);
  useEffect(() => {
    if (available && !initialized.current) {
      initialized.current = true; setLocal(preferences.local); setCloud(preferences.cloud); setServer(preferences.server_endpoint);
    }
  }, [available, preferences.local, preferences.cloud, preferences.server_endpoint]);
  useEffect(() => { setNotice(""); }, [screen, source]);
  const draft = source === "local" ? local : cloud;
  useEffect(() => {
    let active = true; setConfigured(false);
    if (draft.endpoint) window.prodops.shell.modelKey("status", source, draft).then(value => { if (active) setConfigured(value.configured); }, () => undefined);
    return () => { active = false; };
  }, [source, draft.endpoint]);
  useEffect(() => () => { revision.current++; }, []);
  function update(key: keyof ModelDraft, value: string) { revision.current++; (source === "local" ? setLocal : setCloud)((previous) => ({ ...previous, [key]: value })); setNotice(""); }
  async function test() {
    if (actionLock.current) return;
    actionLock.current = true; setPending(true); setNotice("正在连接模型服务…");
    const version = revision.current;
    const messages: Record<ModelCheckCode, string> = {
      connected: "连接成功，已在服务模型列表中找到指定模型。尚未发送对话或排查数据。",
      invalid_config: "请填写有效的 HTTP / HTTPS 服务地址和模型名称，地址不能包含账号、密钥或查询参数。",
      unreachable: "无法连接模型服务。请检查服务是否启动、地址和端口是否正确，以及证书或网络设置。",
      timeout: "连接超时，请检查模型服务状态后重试。", unauthorized: "认证失败或无访问权限。请通过安全录入设置正确的 API Key。",
      not_found: "模型列表接口不存在。请确认填写的是 OpenAI 兼容 API 基础地址（通常以 /v1 结尾）。",
      rate_limited: "模型服务限制了请求频率或配额，请稍后重试或检查服务账户。", http_error: "模型服务返回异常状态。请检查服务日志和 API 基础地址。",
      invalid_response: "服务返回的模型列表格式异常，无法确认连接可用。", model_missing: "已连接服务，但模型列表中没有填写的模型，请核对模型名称。",
      key_unavailable: "无法读取加密密钥，请重新安全录入或移除该服务的密钥。", busy: "已有连接测试正在进行，请稍后重试。",
    };
    try { const result = await window.prodops.shell.testModel(source, draft); if (version === revision.current) setNotice(messages[result.code]); }
    catch { if (version === revision.current) setNotice(messages.invalid_config); }
    finally { actionLock.current = false; setPending(false); }
  }
  async function manageKey(action: "edit" | "remove") {
    if (actionLock.current) return;
    actionLock.current = true; setPending(true); setNotice("");
    const version = revision.current;
    try {
      const result = await window.prodops.shell.modelKey(action, source, draft);
      if (version === revision.current) { setConfigured(result.configured); setNotice(action === "remove" ? "此服务地址的密钥已移除。" : result.configured ? "此服务地址已有加密密钥，可点击测试连接验证。" : "已取消录入，未保存密钥。"); }
    } catch { if (version === revision.current) setNotice("密钥操作未完成。请填写 HTTPS 或本机回环服务地址，并检查 Windows 加密服务后重试。"); }
    finally { actionLock.current = false; setPending(false); }
  }
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
      <div className="model-tabs" role="tablist" aria-label="模型类型">{(["local", "cloud"] as const).map((item) => <button key={item} id={`model-${item}`} role="tab" aria-selected={source === item} aria-controls="model-fields" disabled={pending || saving} onClick={() => { revision.current++; setSource(item); }}>{item === "local" ? "本地模型" : "云端 API"}</button>)}</div>
      <form id="model-fields" role="tabpanel" aria-labelledby={`model-${source}`} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <div className="settings-fields"><label>配置名称<input aria-label="配置名称" maxLength={80} value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label>服务协议<input aria-label="服务协议" value="OpenAI 兼容接口" readOnly /></label>
          <label className="field-wide">{source === "local" ? "本地服务地址" : "API 基础地址"}<input aria-label="模型服务地址" type="url" maxLength={2048} value={draft.endpoint} placeholder={source === "local" ? "http://127.0.0.1:11434/v1" : "https://模型服务地址/v1"} onChange={(event) => update("endpoint", event.target.value)} /><small>仅保存不含密钥、账号或查询参数的服务地址。</small></label>
          <label className="field-wide">模型名称<input aria-label="模型名称" maxLength={128} value={draft.model} placeholder="填写服务中可用的模型标识" onChange={(event) => update("model", event.target.value)} /></label>
          <div className="field-wide key-setting"><span>API Key{source === "local" ? "（可选）" : ""}</span><div><span>{configured ? "当前地址已设置加密密钥" : "当前地址未设置密钥"}</span><div><button type="button" data-action="edit-model-key" disabled={!available || pending || saving} onClick={() => void manageKey("edit")}>{configured ? "更新密钥" : "安全录入"}</button>{configured && <button type="button" data-action="remove-model-key" disabled={!available || pending || saving} onClick={() => void manageKey("remove")}>移除密钥</button>}</div></div><small>在独立安全窗口录入，由当前 Windows 账户加密保存；更换服务地址后需重新录入。</small></div>
        </div>
        <p className="settings-description support-note">测试连接按当前填写的地址和模型读取模型列表，无需先保存。当前排查仍为显式模拟，保存资料不会启用真实模型诊断。</p>
        <div className="settings-actions"><button type="button" data-action="test-model" disabled={!available || pending || saving} onClick={() => void test()}>{pending ? "处理中…" : "测试连接"}</button><button className="primary" disabled={!available || saving || pending} type="submit">{saving ? "保存中…" : "保存连接资料"}</button></div>
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
