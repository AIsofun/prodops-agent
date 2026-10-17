import http, { type ClientRequest } from "node:http";
import { validateErrorResponse } from "../../../../packages/api-client/src/validators.cjs";
import { failure, object, parseBusinessRequest, validBusinessValue,
  type BusinessRequest, type BusinessValues, type BridgeResult, type BridgeCode } from "../shared/business.js";
import type { ManagedConnection } from "./service.js";

export type ConnectionProvider = () => ManagedConnection | null;
export function httpFailure(status: number): BridgeCode {
  return ({ 401: "unauthenticated", 403: "forbidden", 404: "not_found", 409: "conflict", 410: "cursor_expired",
    413: "invalid_request", 422: "invalid_request", 426: "incompatible", 429: "capacity", 503: "not_ready" } as Record<number, BridgeCode>)[status] ?? "invalid_response";
}
export function sameConnection(first: ManagedConnection, current: ManagedConnection | null): boolean {
  return current !== null && first.instance_id === current.instance_id && first.deployment_id === current.deployment_id && first.port === current.port;
}
function route(request: BusinessRequest): { path: string; method: "GET" | "POST"; status: number } {
  let target: string;
  let status = 200;
  let method: "GET" | "POST" = "GET";
  switch (request.operation) {
    case "workspaces": target = "/workspaces"; break;
    case "conversations.list": target = `/workspaces/${request.workspace_id}/conversations`; break;
    case "conversations.create": target = `/workspaces/${request.workspace_id}/conversations`; method = "POST"; status = 201; break;
    case "messages.list": target = `/conversations/${request.conversation_id}/messages`; break;
    case "runs.list": target = `/conversations/${request.conversation_id}/runs`; break;
    case "runs.submit": target = `/conversations/${request.conversation_id}/runs`; method = "POST"; status = 202; break;
    case "runs.get": target = `/runs/${request.run_id}`; break;
    case "runs.cancel": target = `/runs/${request.run_id}/cancel`; method = "POST"; break;
    case "runs.recover": target = `/runs/${request.run_id}/recover`; method = "POST"; status = 202; break;
  }
  if ("page" in request) {
    const query = new URLSearchParams({ limit: String(request.page.limit) });
    if (request.page.cursor !== null) query.set("cursor", request.page.cursor);
    target += `?${query}`;
  }
  return { path: "/api/v1" + target, method, status };
}
function belongs(value: unknown, request: BusinessRequest, connection: ManagedConnection): boolean {
  if (!object(value)) return false;
  const items = Array.isArray(value.items) ? value.items : [value];
  if ("page" in request && (items.length > request.page.limit ||
      (value.next_cursor !== null && (typeof value.next_cursor !== "string" || value.next_cursor.length > 512)))) return false;
  return items.every((item: unknown) => object(item) &&
    (request.operation === "messages.list" || item.deployment_id === connection.deployment_id) &&
    (!("workspace_id" in request) || item.workspace_id === request.workspace_id) &&
    (!("conversation_id" in request) || item.conversation_id === request.conversation_id) &&
    (!("run_id" in request) || item.run_id === request.run_id));
}

/** Fixed API operations only. Credentials remain in this main-process object. */
export class BusinessClient {
  private requests = new Set<ClientRequest>();
  private disposed = false;
  constructor(private connection: ConnectionProvider, private timeoutMs = 5000) {}

  async execute<K extends keyof BusinessValues>(input: BusinessRequest & { operation: K }): Promise<BridgeResult<BusinessValues[K]>>;
  async execute(input: BusinessRequest): Promise<BridgeResult<BusinessValues[keyof BusinessValues]>>;
  async execute(input: BusinessRequest): Promise<BridgeResult<BusinessValues[keyof BusinessValues]>> {
    const request = parseBusinessRequest(input);
    const connection = this.connection();
    if (this.disposed || connection === null) return failure("not_ready");
    if (this.requests.size >= 8) return failure("capacity");
    const destination = route(request);
    const body = "body" in request ? JSON.stringify(request.body) : null;
    if (body !== null && Buffer.byteLength(body) > 262144) return failure("invalid_request");
    return new Promise((resolve) => {
      let settled = false;
      const done = (result: BridgeResult<BusinessValues[keyof BusinessValues]>) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.requests.delete(outgoing);
        resolve(sameConnection(connection, this.connection()) && !this.disposed ? result : failure("not_ready"));
      };
      const outgoing = http.request({ hostname: "127.0.0.1", port: connection.port, path: destination.path, method: destination.method,
        headers: { Authorization: `Bearer ${connection.token}`, "X-ProdOps-Protocol": "1.4", Accept: "application/json",
          ...(body === null ? {} : { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }),
          ...("idempotency_key" in request ? { "Idempotency-Key": request.idempotency_key } : {}) } }, (response) => {
        if (!(response.headers["content-type"] ?? "").startsWith("application/json") ||
            (response.statusCode !== undefined && response.statusCode >= 300 && response.statusCode < 400)) {
          done(failure("invalid_response")); response.destroy(); return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 4 * 1024 * 1024) { done(failure("invalid_response")); response.destroy(); }
          else chunks.push(chunk);
        });
        response.on("error", () => done(failure("offline")));
        response.on("end", () => {
          try {
            const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (response.statusCode !== destination.status) {
              done(validateErrorResponse(value) ? failure(httpFailure(response.statusCode ?? 0), value.request_id) : failure("invalid_response"));
            } else if (validBusinessValue(request.operation, value) && belongs(value, request, connection)) done({ ok: true, value });
            else done(failure("invalid_response"));
          } catch { done(failure("invalid_response")); }
        });
      });
      const timer = setTimeout(() => { done(failure("offline")); outgoing.destroy(); }, this.timeoutMs);
      this.requests.add(outgoing);
      outgoing.on("error", () => done(failure("offline")));
      outgoing.end(body);
    });
  }
  dispose(): void {
    this.disposed = true;
    for (const request of this.requests) request.destroy(new Error("Business connection closed"));
    this.requests.clear();
  }
}
