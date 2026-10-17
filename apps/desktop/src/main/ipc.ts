import type { IpcMainInvokeEvent, BrowserWindow } from "electron";
import { validateStatusRequest } from "../shared/connection.js";
import type { ConnectionStatus } from "../shared/connection.js";
import { parseBusinessRequest, parseEventRequest } from "../shared/business.js";
import type { BusinessClient } from "./business.js";
import type { EventStreams } from "./events.js";

export function assertSender(event: IpcMainInvokeEvent, window: BrowserWindow): void {
  if (window.isDestroyed() || event.sender !== window.webContents || !event.senderFrame ||
      event.senderFrame !== window.webContents.mainFrame || event.senderFrame.url !== window.webContents.getURL()) {
    throw new Error("Untrusted desktop request");
  }
}

export function createBusinessHandler(getWindow: () => BrowserWindow, client: BusinessClient) {
  return async (event: IpcMainInvokeEvent, request: unknown) => {
    assertSender(event, getWindow());
    return client.execute(parseBusinessRequest(request));
  };
}
export function createEventsHandler(getWindow: () => BrowserWindow, streams: EventStreams) {
  return async (event: IpcMainInvokeEvent, request: unknown) => {
    assertSender(event, getWindow());
    return streams.execute(parseEventRequest(request));
  };
}

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
