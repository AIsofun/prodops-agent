import { contextBridge } from "electron";
import type { DesktopBridge } from "../shared/desktop.js";

const bridge: DesktopBridge = Object.freeze({
  getInfo: () => ({ name: "ProdOps", version: "0.1.0" }),
});

contextBridge.exposeInMainWorld("prodops", bridge);
