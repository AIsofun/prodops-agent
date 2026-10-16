import { contextBridge, ipcRenderer } from "electron";
import { STATUS_CHANNEL, parseConnectionStatus } from "../shared/connection.js";
import type { DesktopBridge } from "../shared/desktop.js";

const bridge: DesktopBridge = Object.freeze({
  getInfo: () => ({ name: "ProdOps", version: "0.1.0" }),
  connections: Object.freeze({
    getStatus: async (...args: unknown[]) => {
      if (args.length !== 0) throw new Error("Connection status takes no arguments");
      const value: unknown = await ipcRenderer.invoke(STATUS_CHANNEL, { connection_id: "development" });
      return parseConnectionStatus(value);
    },
  }),
});

contextBridge.exposeInMainWorld("prodops", bridge);
