export type IconName = "panel" | "plus" | "settings" | "up" | "down" | "monitor" | "server" | "minus" | "maximize" | "close" | "camera" | "scan" | "layers";
const paths: Record<IconName, string> = {
  panel: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 0v18",
  plus: "M12 5v14M5 12h14", settings: "M4 7h16M4 17h16M8 4v6M16 14v6", up: "M12 19V5M5 12l7-7 7 7",
  down: "m6 9 6 6 6-6", monitor: "M4 3h16v13H4ZM12 16v5M8 21h8", server: "M4 3h16v7H4ZM4 14h16v7H4ZM7 6h.01M7 17h.01",
  minus: "M5 12h14", maximize: "M8 3h13v13M3 8h13v13H3Z", close: "m6 6 12 12M18 6 6 18",
  camera: "M3 7h4l2-3h6l2 3h4v13H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  scan: "M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M8 8h8M8 12h8M8 16h5", layers: "m12 3 9 5-9 5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5",
};
export function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
