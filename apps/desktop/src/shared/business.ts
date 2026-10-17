import type { components } from "../../../../packages/api-client/src/schema.js";
import {
  validateWorkspaceList, validateConversationCreateRequest, validateRunCreateRequest,
  validateCancelRunRequest, validateRecoverRunRequest, validateConversation,
  validateConversationPage, validateMessagePage, validateRunPage, validateRunSnapshot, validateRunEvent,
} from "../../../../packages/api-client/src/validators.cjs";

type Schema = components["schemas"];
export const BUSINESS_CHANNEL = "prodops:business";
export const EVENTS_CHANNEL = "prodops:events";
export type Page = { limit: number; cursor: string | null };
type Scope = { connection_id: "development" };
export type BusinessRequest = Scope & (
  { operation: "workspaces" } |
  { operation: "conversations.list"; workspace_id: string; page: Page } |
  { operation: "conversations.create"; workspace_id: string; body: Schema["ConversationCreateRequest"] } |
  { operation: "messages.list" | "runs.list"; conversation_id: string; page: Page } |
  { operation: "runs.get"; run_id: string } |
  { operation: "runs.submit"; conversation_id: string; body: Schema["RunCreateRequest"]; idempotency_key: string } |
  { operation: "runs.cancel"; run_id: string; body: Schema["CancelRunRequest"] } |
  { operation: "runs.recover"; run_id: string; body: Schema["RecoverRunRequest"]; idempotency_key: string }
);
export interface BusinessValues {
  workspaces: Schema["WorkspaceList"];
  "conversations.list": Schema["ConversationPage"];
  "conversations.create": Schema["Conversation"];
  "messages.list": Schema["MessagePage"];
  "runs.list": Schema["RunPage"];
  "runs.get": Schema["RunSnapshot"];
  "runs.submit": Schema["RunSnapshot"];
  "runs.cancel": Schema["RunSnapshot"];
  "runs.recover": Schema["RunSnapshot"];
}
export type BridgeCode = "offline" | "invalid_response" | "incompatible" | "unauthenticated" |
  "forbidden" | "not_found" | "conflict" | "invalid_request" | "capacity" | "not_ready" | "cursor_expired";
export type BridgeResult<T> = { ok: true; value: T } | { ok: false; error: { code: BridgeCode; request_id: string | null } };
const codes: BridgeCode[] = ["offline", "invalid_response", "incompatible", "unauthenticated", "forbidden", "not_found",
  "conflict", "invalid_request", "capacity", "not_ready", "cursor_expired"];
export function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function keys(value: Record<string, unknown>, expected: string[]): boolean {
  return Object.keys(value).sort().join(",") === expected.sort().join(",");
}
export function uuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function sequence(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) >= 0; }
function page(value: unknown): value is Page {
  return object(value) && keys(value, ["limit", "cursor"]) && Number.isInteger(value.limit) &&
    (value.limit as number) >= 1 && (value.limit as number) <= 100 &&
    (value.cursor === null || (typeof value.cursor === "string" && value.cursor.length >= 1 && value.cursor.length <= 512));
}
export function parseBusinessRequest(value: unknown): BusinessRequest {
  if (!object(value) || value.connection_id !== "development") throw new Error("Invalid business request");
  let fields: string[] = [];
  let valid = false;
  switch (value.operation) {
    case "workspaces": valid = true; break;
    case "conversations.list": fields = ["workspace_id", "page"]; valid = uuid(value.workspace_id) && page(value.page); break;
    case "conversations.create": fields = ["workspace_id", "body"]; valid = uuid(value.workspace_id) && validateConversationCreateRequest(value.body); break;
    case "messages.list": case "runs.list": fields = ["conversation_id", "page"]; valid = uuid(value.conversation_id) && page(value.page); break;
    case "runs.get": fields = ["run_id"]; valid = uuid(value.run_id); break;
    case "runs.submit": fields = ["conversation_id", "body", "idempotency_key"];
      valid = uuid(value.conversation_id) && uuid(value.idempotency_key) && validateRunCreateRequest(value.body); break;
    case "runs.cancel": fields = ["run_id", "body"]; valid = uuid(value.run_id) && validateCancelRunRequest(value.body); break;
    case "runs.recover": fields = ["run_id", "body", "idempotency_key"];
      valid = uuid(value.run_id) && uuid(value.idempotency_key) && validateRecoverRunRequest(value.body); break;
  }
  if (!valid || !keys(value, ["operation", "connection_id", ...fields])) throw new Error("Invalid business request");
  const normalized = { ...value };
  for (const key of ["workspace_id", "conversation_id", "run_id", "idempotency_key"]) {
    if (typeof normalized[key] === "string") normalized[key] = normalized[key].toLowerCase();
  }
  return normalized as BusinessRequest;
}
export function validBusinessValue<K extends keyof BusinessValues>(operation: K, value: unknown): value is BusinessValues[K] {
  switch (operation) {
    case "workspaces": return validateWorkspaceList(value) && value.items.length <= 100;
    case "conversations.create": return validateConversation(value);
    case "conversations.list": return validateConversationPage(value) && value.items.length <= 100;
    case "messages.list": return validateMessagePage(value) && value.items.length <= 100;
    case "runs.list": return validateRunPage(value) && value.items.length <= 100;
    default: return validateRunSnapshot(value);
  }
}
export function failure(code: BridgeCode, request_id: string | null = null): BridgeResult<never> {
  return { ok: false, error: { code, request_id } };
}
export function parseResult<T>(value: unknown, valid: (value: unknown) => value is T): BridgeResult<T> {
  if (object(value)) {
    if (value.ok === true && keys(value, ["ok", "value"]) && valid(value.value)) return { ok: true, value: value.value };
    if (value.ok === false && keys(value, ["ok", "error"]) && object(value.error) && keys(value.error, ["code", "request_id"]) &&
        codes.includes(value.error.code as BridgeCode) && (value.error.request_id === null || uuid(value.error.request_id))) {
      return value as BridgeResult<T>;
    }
  }
  throw new Error("Invalid bridge response");
}
export type EventRequest = Scope & { run_id: string } & (
  { operation: "open"; after_seq: number } | { operation: "read" | "close"; subscription_id: string }
);
export type RunEvent = Schema["ReservedContracts"]["event"];
export type StreamState = "open" | "ended" | "closed" | "offline" | "invalid_response" | "incompatible" | "cursor_expired" | "gap" | "overflow";
export interface EventBatch { events: RunEvent[]; last_seq: number; state: StreamState }
export function parseEventRequest(value: unknown): EventRequest {
  if (!object(value) || value.connection_id !== "development" || !uuid(value.run_id) ||
      (value.operation === "open" ? !keys(value, ["connection_id", "run_id", "operation", "after_seq"]) || !sequence(value.after_seq) :
        !["read", "close"].includes(value.operation as string) || !keys(value, ["connection_id", "run_id", "operation", "subscription_id"]) || !uuid(value.subscription_id))) {
    throw new Error("Invalid event request");
  }
  return { ...value, run_id: value.run_id.toLowerCase(),
    ...(typeof value.subscription_id === "string" ? { subscription_id: value.subscription_id.toLowerCase() } : {}) } as EventRequest;
}
export function validSubscription(value: unknown): value is { subscription_id: string } {
  return object(value) && keys(value, ["subscription_id"]) && uuid(value.subscription_id);
}
export function validEventBatch(value: unknown): value is EventBatch {
  return object(value) && keys(value, ["events", "last_seq", "state"]) && sequence(value.last_seq) &&
    ["open", "ended", "closed", "offline", "invalid_response", "incompatible", "cursor_expired", "gap", "overflow"].includes(value.state as string) &&
    Array.isArray(value.events) && value.events.length <= 8 && value.events.every((event: unknown) => validateRunEvent(event)) &&
    value.events.every((event: RunEvent, index: number, events: RunEvent[]) =>
      index === 0 || (event.seq === events[index - 1].seq + 1 && event.run_id === events[index - 1].run_id)) &&
    (value.events.length === 0 || value.last_seq === value.events[value.events.length - 1].seq);
}
