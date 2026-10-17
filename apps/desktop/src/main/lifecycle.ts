import { app, Menu, Tray, type BrowserWindow } from "electron";

/** Retains the existing window and manages only this application's native tray. */
export class DesktopLifecycle {
  private tray: Tray | null = null;
  private menu: Menu | null = null;
  constructor(private window: BrowserWindow, private quitting: () => boolean) {}

  async install(): Promise<void> {
    if (process.platform !== "win32") return;
    const icon = await app.getFileIcon(process.execPath, { size: "small" });
    if (icon.isEmpty()) throw new Error("Desktop tray icon is unavailable");
    this.tray = new Tray(icon);
    this.tray.setToolTip("ProdOps · 关闭窗口后继续排查");
    this.menu = Menu.buildFromTemplate([
      { id: "show", label: "打开排查窗口", click: () => this.show() },
      { type: "separator" },
      { id: "quit", label: "退出（等待当前查询收尾）", click: () => app.quit() },
    ]);
    this.tray.setContextMenu(this.menu);
    this.tray.on("double-click", () => this.show());
    this.window.on("close", (event) => {
      if (!this.quitting() && this.tray !== null && !this.tray.isDestroyed()) {
        event.preventDefault(); this.window.hide();
      }
    });
  }
  show(): void {
    if (this.window.isDestroyed() || this.quitting()) return;
    if (this.window.isMinimized()) this.window.restore();
    this.window.show(); this.window.focus();
  }
  dispose(): void {
    this.tray?.destroy();
    this.tray = null;
    this.menu = null;
  }
}
