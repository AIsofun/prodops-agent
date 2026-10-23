import { BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { assertSender } from "./ipc.js";
import { modelEndpoint, keyEndpointAllowed, type ModelSource } from "../shared/shell.js";
import type { ModelKeyVault } from "./model-keys.js";

export const MODEL_KEY_ENTRY_CHANNEL = "prodops:model-key:submit";
/** The conversation/settings renderer never receives or submits raw keys. */
export class ModelKeyDialog {
  private pending = false;
  constructor(private readonly vault: ModelKeyVault) {}
  async edit(parent: BrowserWindow, source: ModelSource, endpoint: string): Promise<void> {
    const url = modelEndpoint(endpoint);
    if (!keyEndpointAllowed(url) || this.pending) throw new Error("Model key entry unavailable");
    this.pending = true;
    const dialog = new BrowserWindow({ parent, modal: true, width: 540, height: 360, resizable: false, minimizable: false, maximizable: false,
      title: "安全录入 API Key", backgroundColor: "#fff", autoHideMenuBar: true, show: false,
      webPreferences: { preload: path.join(__dirname, "../preload/model-key.js"), contextIsolation: true, sandbox: true, nodeIntegration: false,
        webSecurity: true, webviewTag: false, devTools: false } });
    dialog.removeMenu();
    dialog.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    dialog.webContents.on("will-navigate", event => event.preventDefault());
    dialog.webContents.on("will-attach-webview", event => event.preventDefault());
    const closed = new Promise<void>(resolve => dialog.once("closed", () => { ipcMain.removeHandler(MODEL_KEY_ENTRY_CHANNEL); this.pending = false; resolve(); }));
    let writing = false;
    ipcMain.handle(MODEL_KEY_ENTRY_CHANNEL, async (event, input: unknown) => {
      assertSender(event, dialog);
      if (!input || typeof input !== "object" || Object.keys(input).join(",") !== "secret" || !("secret" in input) || typeof input.secret !== "string" ||
          !/^[\x21-\x7e]{1,4096}$/.test(input.secret) || writing) throw new Error("Invalid model key entry");
      writing = true;
      try { await this.vault.set(source, endpoint, input.secret); setTimeout(() => { if (!dialog.isDestroyed()) dialog.close(); }, 0); return { saved: true }; }
      catch { throw new Error("Model key could not be saved"); }
      finally { writing = false; }
    });
    dialog.on("close", event => { if (writing) event.preventDefault(); });
    dialog.once("ready-to-show", () => dialog.show());
    try {
      const parentURL = new URL(parent.webContents.getURL());
      const query = { endpoint: url.href };
      if (parentURL.protocol === "http:") {
        const address = new URL("credentials.html", parentURL); address.search = new URLSearchParams(query).toString(); await dialog.loadURL(address.href);
      } else await dialog.loadFile(path.join(__dirname, "../renderer/credentials.html"), { query });
      await closed;
    } catch { if (!dialog.isDestroyed()) dialog.destroy(); throw new Error("Model key entry unavailable"); }
  }
}
