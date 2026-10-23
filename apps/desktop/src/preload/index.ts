import { contextBridge, ipcRenderer } from "electron";
import { STATUS_CHANNEL, parseConnectionStatus } from "../shared/connection.js";
import type { DesktopBridge } from "../shared/desktop.js";
import { QUIT_CHANNEL } from "../shared/desktop.js";
import { SHELL_CHANNEL, parseShellRequest, parsePreferences, parseMenuAction } from "../shared/shell.js";
import { BUSINESS_CHANNEL, EVENTS_CHANNEL, parseBusinessRequest, parseEventRequest, parseResult,
  validBusinessValue, validSubscription, validEventBatch, type BusinessRequest, type BusinessValues, type BridgeResult } from "../shared/business.js";

async function business<K extends keyof BusinessValues>(request: BusinessRequest & { operation: K }): Promise<BridgeResult<BusinessValues[K]>> {
  const value: unknown = await ipcRenderer.invoke(BUSINESS_CHANNEL, parseBusinessRequest(request));
  return parseResult(value, (item): item is BusinessValues[K] => validBusinessValue(request.operation, item));
}

const bridge: DesktopBridge = Object.freeze({
  getInfo: () => ({ name: "ProdOps", version: "0.1.0" }),
  shell: Object.freeze<DesktopBridge["shell"]>({
    window: async (action) => {
      const result: unknown = await ipcRenderer.invoke(SHELL_CHANNEL, parseShellRequest({ operation: "window", action }));
      if (typeof result !== "object" || result === null || Object.keys(result).join(",") !== "maximized" ||
          !("maximized" in result) || typeof result.maximized !== "boolean") throw new Error("Invalid window response");
      return { maximized: result.maximized };
    },
    menu: async (name) => parseMenuAction(await ipcRenderer.invoke(SHELL_CHANNEL, parseShellRequest({ operation: "menu", name }))),
    preferences: async () => parsePreferences(await ipcRenderer.invoke(SHELL_CHANNEL, { operation: "preferences.get" })),
    savePreferences: async (value) => parsePreferences(await ipcRenderer.invoke(SHELL_CHANNEL,
      parseShellRequest({ operation: "preferences.save", value }))),
  }),
  app: Object.freeze({ quit: async (...args: unknown[]) => {
    if (args.length) throw new Error("Application quit takes no arguments");
    const result: unknown = await ipcRenderer.invoke(QUIT_CHANNEL, {});
    if (typeof result !== "object" || result === null || Object.keys(result).join(",") !== "accepted" ||
        !("accepted" in result) || result.accepted !== true) throw new Error("Invalid application quit response");
  } }),
  connections: Object.freeze({
    getStatus: async (...args: unknown[]) => {
      if (args.length !== 0) throw new Error("Connection status takes no arguments");
      const value: unknown = await ipcRenderer.invoke(STATUS_CHANNEL, { connection_id: "development" });
      return parseConnectionStatus(value);
    },
  }),
  business: Object.freeze<DesktopBridge["business"]>({
    workspaces: () => business({ operation: "workspaces", connection_id: "development" }),
    conversations: (workspace_id, page) => business({ operation: "conversations.list", connection_id: "development", workspace_id, page }),
    createConversation: (workspace_id, body) => business({ operation: "conversations.create", connection_id: "development", workspace_id, body }),
    messages: (conversation_id, page) => business({ operation: "messages.list", connection_id: "development", conversation_id, page }),
    runs: (conversation_id, page) => business({ operation: "runs.list", connection_id: "development", conversation_id, page }),
    run: (run_id) => business({ operation: "runs.get", connection_id: "development", run_id }),
    submit: (conversation_id, body, idempotency_key) => business({ operation: "runs.submit", connection_id: "development", conversation_id, body, idempotency_key }),
    cancel: (run_id, body) => business({ operation: "runs.cancel", connection_id: "development", run_id, body }),
    recover: (run_id, body, idempotency_key) => business({ operation: "runs.recover", connection_id: "development", run_id, body, idempotency_key }),
  }),
  events: Object.freeze<DesktopBridge["events"]>({
    open: async (run_id, after_seq) => parseResult(await ipcRenderer.invoke(EVENTS_CHANNEL,
      parseEventRequest({ operation: "open", connection_id: "development", run_id, after_seq })), validSubscription),
    read: async (run_id, subscription_id) => {
      const result = parseResult(await ipcRenderer.invoke(EVENTS_CHANNEL,
        parseEventRequest({ operation: "read", connection_id: "development", run_id, subscription_id })), validEventBatch);
      if (result.ok && result.value.events.some((event) => event.run_id.toLowerCase() !== run_id.toLowerCase())) throw new Error("Invalid event scope");
      return result;
    },
    close: async (run_id, subscription_id) => parseResult(await ipcRenderer.invoke(EVENTS_CHANNEL,
      parseEventRequest({ operation: "close", connection_id: "development", run_id, subscription_id })), (item): item is null => item === null),
  }),
});

contextBridge.exposeInMainWorld("prodops", bridge);
