import { Menu, type BrowserWindow, type IpcMainInvokeEvent, type MenuItemConstructorOptions } from "electron";
import { assertSender } from "./ipc.js";
import { parseShellRequest, type MenuAction, type MenuName } from "../shared/shell.js";
import type { PreferencesStore } from "./preferences.js";
import type { ModelProbe } from "./model-probe.js";
import type { ModelKeyVault } from "./model-keys.js";
import type { ModelKeyDialog } from "./model-key-dialog.js";

export function createShellHandler(getWindow: () => BrowserWindow, store: PreferencesStore,
  models?: { probe: ModelProbe; vault: ModelKeyVault; dialog: ModelKeyDialog }) {
  let menuPending = false;
  return async (event: IpcMainInvokeEvent, input: unknown) => {
    const window = getWindow();
    assertSender(event, window);
    const request = parseShellRequest(input);
    if (request.operation === "preferences.get") return store.get();
    if (request.operation === "preferences.save") return store.save(request.value);
    if (request.operation === "model.test" || request.operation === "model.key.status" || request.operation === "model.key.edit" || request.operation === "model.key.remove") {
      if (!models) throw new Error("Model settings unavailable");
      if (request.operation === "model.test") return models.probe.test(request.source, request.draft);
      try {
        if (request.operation === "model.key.edit") await models.dialog.edit(window, request.source, request.draft.endpoint);
        if (request.operation === "model.key.remove") await models.vault.set(request.source, request.draft.endpoint, null);
        return { configured: await models.vault.configured(request.source, request.draft.endpoint) };
      } catch { throw new Error("Model key management unavailable"); }
    }
    if (request.operation === "window") {
      if (request.action === "minimize") window.minimize();
      if (request.action === "maximize") { if (window.isMaximized()) window.unmaximize(); else window.maximize(); }
      if (request.action === "close") setTimeout(() => { if (!window.isDestroyed()) window.close(); }, 0);
      return { maximized: window.isMaximized() };
    }
    if (request.operation !== "menu") throw new Error("Invalid desktop menu request");
    if (menuPending) return null;
    menuPending = true;
    try {
      return await new Promise<MenuAction>((resolve) => {
        const item = (label: string, action: MenuAction): MenuItemConstructorOptions => ({ label, click: () => resolve(action) });
        const menus: Record<MenuName, MenuItemConstructorOptions[]> = {
          file: [item("新建排查", "new-conversation"), { type: "separator" }, item("模型与 API 设置", "models"), item("运行位置", "connections"),
            { type: "separator" }, item("退出应用", "quit")],
          edit: [{ role: "undo", label: "撤销" }, { role: "redo", label: "重做" }, { type: "separator" },
            { role: "cut", label: "剪切" }, { role: "copy", label: "复制" }, { role: "paste", label: "粘贴" }, { role: "selectAll", label: "全选" }],
          view: [item("展开 / 收起左侧栏", "toggle-sidebar")],
          help: [item("关于 ProdOps", "about")],
        };
        const menu = Menu.buildFromTemplate(menus[request.name]);
        const onClosed = () => { menu.closePopup(window); resolve(null); };
        window.once("closed", onClosed);
        menu.popup({ window, callback: () => { window.removeListener("closed", onClosed); resolve(null); } });
      });
    } finally { menuPending = false; }
  };
}
