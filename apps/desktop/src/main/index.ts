import { app, BrowserWindow, session } from "electron";
import path from "node:path";

function rendererAddress(): string | null {
  const value = process.env.PRODOPS_RENDERER_URL;
  if (value === undefined) return null;
  const url = new URL(value);
  if (app.isPackaged || url.protocol !== "http:" || url.hostname !== "127.0.0.1" ||
      url.pathname !== "/" || url.username || url.password || url.search || url.hash) {
    throw new Error("Invalid development renderer address");
  }
  return url.href;
}

async function createWindow(): Promise<void> {
  const address = rendererAddress();
  const window = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 650,
    title: "ProdOps · 设备异常排查",
    backgroundColor: "#f5f7f9",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: false,
    },
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.once("ready-to-show", () => window.show());
  if (address) await window.loadURL(address);
  else await window.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  await createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch(() => app.exit(1));
    }
  });
}).catch(() => {
  console.error("Desktop failed to start. Check the development build and configuration.");
  app.exit(1);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
