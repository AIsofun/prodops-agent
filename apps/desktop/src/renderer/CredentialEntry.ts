export {};
declare global { interface Window { modelKeyEntry: { submit(secret: string): Promise<void> } } }
const form = document.querySelector<HTMLFormElement>("#key-form")!;
const input = document.querySelector<HTMLInputElement>("#api-key")!;
const save = document.querySelector<HTMLButtonElement>("#save")!;
const cancel = document.querySelector<HTMLButtonElement>("#cancel")!;
const notice = document.querySelector<HTMLParagraphElement>("#key-notice")!;
document.querySelector("#key-endpoint")!.textContent = new URLSearchParams(location.search).get("endpoint") ?? "";
cancel.onclick = () => window.close();
document.addEventListener("keydown", event => { if (event.key === "Escape" && !save.disabled) window.close(); });
form.onsubmit = async event => {
  event.preventDefault();
  save.disabled = true; cancel.disabled = true; notice.textContent = "正在加密保存…";
  try { await window.modelKeyEntry.submit(input.value); input.value = ""; }
  catch { input.value = ""; notice.textContent = "保存失败。请检查密钥格式或系统加密服务后重试。"; }
  finally { save.disabled = false; cancel.disabled = false; }
};
