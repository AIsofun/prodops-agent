export interface DesktopInfo {
  name: string;
  version: string;
}

export interface DesktopBridge {
  getInfo(): DesktopInfo;
}

declare global {
  interface Window {
    prodops: DesktopBridge;
  }
}
