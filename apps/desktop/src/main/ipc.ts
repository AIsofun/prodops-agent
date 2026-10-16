import type { IpcMainInvokeEvent, BrowserWindow } from "electron";
import { validateStatusRequest } from "../shared/connection.js";
import type { ConnectionStatus } from "../shared/connection.js";

export function createStatusHandler(getWindow: () => BrowserWindow, probe: () => Promise<ConnectionStatus>) {
  let pending: Promise<ConnectionStatus> | undefined;
  return async (event: IpcMainInvokeEvent, request: unknown): Promise<ConnectionStatus> => {
    const window = getWindow();
    if (window.isDestroyed() || event.sender !== window.webContents || !event.senderFrame ||
        event.senderFrame !== window.webContents.mainFrame || event.senderFrame.url !== window.webContents.getURL()) {
      throw new Error("Untrusted connection request");
    }
    validateStatusRequest(request);
    if (!pending) pending = probe().finally(() => { pending = undefined; });
    return pending;
  };
}
