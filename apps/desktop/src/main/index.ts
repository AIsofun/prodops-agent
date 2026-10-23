import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "node:path";
import { developmentConnection, getConnectionStatus } from "./connection.js";
import { createStatusHandler, createBusinessHandler, createEventsHandler, createQuitHandler } from "./ipc.js";
import { STATUS_CHANNEL } from "../shared/connection.js";
import { LocalService, serviceLaunchOptions } from "./service.js";
import { BusinessClient } from "./business.js";
import { EventStreams } from "./events.js";
import { BUSINESS_CHANNEL, EVENTS_CHANNEL } from "../shared/business.js";
import { DesktopLifecycle } from "./lifecycle.js";
import { QUIT_CHANNEL } from "../shared/desktop.js";
import { SHELL_CHANNEL } from "../shared/shell.js";
import { PreferencesStore } from "./preferences.js";
import { createShellHandler } from "./shell.js";

if (app.commandLine.hasSwitch("user-data-dir")) {
  const directory = app.commandLine.getSwitchValue("user-data-dir");
  if (!path.isAbsolute(directory) || directory.length > 4096 || directory.includes("\0")) throw new Error("Invalid application data directory");
  app.setPath("userData", path.resolve(directory));
}

let localService: LocalService | null = null;
let shutdownPending = false;
let quitPermitted = false;
let lifecycle: DesktopLifecycle | null = null;

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
    backgroundColor: "#f7f7f7",
    frame: false,
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
  const connection = localService === null ? developmentConnection(process.env) : null;
  ipcMain.handle(STATUS_CHANNEL, createStatusHandler(() => window, () => localService !== null ?
    localService.getStatus() : getConnectionStatus(connection!)));
  window.once("closed", () => ipcMain.removeHandler(STATUS_CHANNEL));
  const provider = () => localService?.getConnection() ?? null;
  const client = new BusinessClient(provider);
  const streams = new EventStreams(provider);
  ipcMain.handle(BUSINESS_CHANNEL, createBusinessHandler(() => window, client));
  ipcMain.handle(EVENTS_CHANNEL, createEventsHandler(() => window, streams));
  ipcMain.handle(QUIT_CHANNEL, createQuitHandler(() => window, () => app.quit()));
  ipcMain.handle(SHELL_CHANNEL, createShellHandler(() => window, new PreferencesStore(app.getPath("userData"))));
  const dispose = () => { client.dispose(); streams.dispose(); };
  window.webContents.once("destroyed", dispose);
  window.webContents.on("render-process-gone", dispose);
  window.once("closed", () => { dispose(); ipcMain.removeHandler(BUSINESS_CHANNEL); ipcMain.removeHandler(EVENTS_CHANNEL); ipcMain.removeHandler(QUIT_CHANNEL); ipcMain.removeHandler(SHELL_CHANNEL); });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.once("ready-to-show", () => window.show());
  lifecycle = new DesktopLifecycle(window, () => shutdownPending || quitPermitted);
  await lifecycle.install();
  if (address) await window.loadURL(address);
  else await window.loadFile(path.join(__dirname, "../renderer/index.html"));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => lifecycle?.show());
  app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    if (app.isPackaged || process.env.PRODOPS_SERVICE_PORT === undefined) {
      localService = new LocalService(serviceLaunchOptions(app.isPackaged, process.resourcesPath,
        path.resolve(__dirname, "../../../.."), app.getPath("userData")));
      await localService.start().catch(() => undefined);
    }
    await createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length > 0) lifecycle?.show();
      else {
        createWindow().catch(() => app.exit(1));
      }
    });
  }).catch(() => {
    console.error("Desktop failed to start. Check the development build and configuration.");
    app.exit(1);
  });

  app.on("before-quit", (event) => {
    if (quitPermitted) return;
    if (localService === null) { quitPermitted = true; return; }
    event.preventDefault();
    if (shutdownPending) return;
    shutdownPending = true;
    for (const window of BrowserWindow.getAllWindows()) window.setTitle("ProdOps · 正在等待当前查询收尾");
    void localService.stop().then(() => { quitPermitted = true; app.quit(); }, () => { quitPermitted = true; app.exit(1); });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
  app.on("will-quit", () => lifecycle?.dispose());
}
