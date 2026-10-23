export const SHELL_CHANNEL = "prodops:desktop:shell";
export type WindowAction = "minimize" | "maximize" | "close";
export type MenuName = "file" | "edit" | "view" | "help";
export type MenuAction = "new-conversation" | "models" | "connections" | "toggle-sidebar" | "about" | "quit" | null;
export interface ModelDraft { name: string; endpoint: string; model: string }
export interface DesktopPreferences {
  schema_version: 1;
  sidebar_collapsed: boolean;
  local: ModelDraft;
  cloud: ModelDraft;
  server_endpoint: string;
}
export type ShellRequest = { operation: "preferences.get" } | { operation: "preferences.save"; value: DesktopPreferences } |
  { operation: "window"; action: WindowAction } | { operation: "menu"; name: MenuName };

export function defaultPreferences(): DesktopPreferences {
  return { schema_version: 1, sidebar_collapsed: false, local: { name: "本地模型", endpoint: "", model: "" },
    cloud: { name: "云端模型", endpoint: "", model: "" }, server_endpoint: "" };
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, expected: string): boolean {
  return Object.keys(value).sort().join(",") === expected;
}
function text(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.length <= limit && !/[\u0000-\u001f\u007f]/.test(value);
}
function endpoint(value: unknown): value is string {
  if (!text(value, 2048)) return false;
  if (value === "") return true;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !!url.hostname &&
    !url.username && !url.password && !url.search && !url.hash; } catch { return false; }
}
function modelDraft(value: unknown): value is ModelDraft {
  return record(value) && keys(value, "endpoint,model,name") && text(value.name, 80) &&
    endpoint(value.endpoint) && text(value.model, 128);
}
export function parsePreferences(value: unknown): DesktopPreferences {
  if (!record(value) || !keys(value, "cloud,local,schema_version,server_endpoint,sidebar_collapsed") ||
      value.schema_version !== 1 || typeof value.sidebar_collapsed !== "boolean" || !modelDraft(value.local) ||
      !modelDraft(value.cloud) || !endpoint(value.server_endpoint)) throw new Error("Invalid desktop preferences");
  return { schema_version: 1, sidebar_collapsed: value.sidebar_collapsed, local: { ...value.local },
    cloud: { ...value.cloud }, server_endpoint: value.server_endpoint };
}
export function parseShellRequest(value: unknown): ShellRequest {
  if (!record(value)) throw new Error("Invalid desktop request");
  if (value.operation === "preferences.get" && keys(value, "operation")) return { operation: value.operation };
  if (value.operation === "preferences.save" && keys(value, "operation,value")) return { operation: value.operation, value: parsePreferences(value.value) };
  if (value.operation === "window" && keys(value, "action,operation") && typeof value.action === "string" &&
      ["minimize", "maximize", "close"].includes(value.action)) return { operation: value.operation, action: value.action as WindowAction };
  if (value.operation === "menu" && keys(value, "name,operation") && typeof value.name === "string" &&
      ["file", "edit", "view", "help"].includes(value.name)) return { operation: value.operation, name: value.name as MenuName };
  throw new Error("Invalid desktop request");
}
export function parseMenuAction(value: unknown): MenuAction {
  if (value === null || typeof value === "string" && ["new-conversation", "models", "connections", "toggle-sidebar", "about", "quit"].includes(value)) return value as MenuAction;
  throw new Error("Invalid desktop menu response");
}
