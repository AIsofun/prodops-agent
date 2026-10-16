import type { ConnectionStatus } from "./connection.js";

export interface DesktopInfo {
  name: string;
  version: string;
}

export interface DesktopBridge {
  getInfo(): DesktopInfo;
  connections: { getStatus(): Promise<ConnectionStatus> };
}

declare global {
  interface Window {
    prodops: DesktopBridge;
  }
}
