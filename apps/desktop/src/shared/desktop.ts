import type { ConnectionStatus } from "./connection.js";
import type { components } from "../../../../packages/api-client/src/schema.js";
import type { BusinessValues, BridgeResult, EventBatch, Page } from "./business.js";
import type { DesktopPreferences, WindowAction, MenuName, MenuAction } from "./shell.js";

type Schema = components["schemas"];
export const QUIT_CHANNEL = "prodops:app:quit";

export interface DesktopInfo {
  name: string;
  version: string;
}

export interface DesktopBridge {
  getInfo(): DesktopInfo;
  app: { quit(): Promise<void> };
  shell: {
    window(action: WindowAction): Promise<{ maximized: boolean }>;
    menu(name: MenuName): Promise<MenuAction>;
    preferences(): Promise<DesktopPreferences>;
    savePreferences(value: DesktopPreferences): Promise<DesktopPreferences>;
  };
  connections: { getStatus(): Promise<ConnectionStatus> };
  business: {
    workspaces(): Promise<BridgeResult<BusinessValues["workspaces"]>>;
    conversations(workspace_id: string, page: Page): Promise<BridgeResult<BusinessValues["conversations.list"]>>;
    createConversation(workspace_id: string, body: Schema["ConversationCreateRequest"]): Promise<BridgeResult<BusinessValues["conversations.create"]>>;
    messages(conversation_id: string, page: Page): Promise<BridgeResult<BusinessValues["messages.list"]>>;
    runs(conversation_id: string, page: Page): Promise<BridgeResult<BusinessValues["runs.list"]>>;
    run(run_id: string): Promise<BridgeResult<BusinessValues["runs.get"]>>;
    submit(conversation_id: string, body: Schema["RunCreateRequest"], idempotency_key: string): Promise<BridgeResult<BusinessValues["runs.submit"]>>;
    cancel(run_id: string, body: Schema["CancelRunRequest"]): Promise<BridgeResult<BusinessValues["runs.cancel"]>>;
    recover(run_id: string, body: Schema["RecoverRunRequest"], idempotency_key: string): Promise<BridgeResult<BusinessValues["runs.recover"]>>;
  };
  events: {
    open(run_id: string, after_seq: number): Promise<BridgeResult<{ subscription_id: string }>>;
    read(run_id: string, subscription_id: string): Promise<BridgeResult<EventBatch>>;
    close(run_id: string, subscription_id: string): Promise<BridgeResult<null>>;
  };
}

declare global {
  interface Window {
    prodops: DesktopBridge;
  }
}
