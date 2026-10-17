import http, { type ClientRequest } from "node:http";
import { randomUUID } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import { validateRunEvent, validateErrorResponse } from "../../../../packages/api-client/src/validators.cjs";
import { failure, parseEventRequest, type BridgeResult, type EventBatch, type EventRequest,
  type RunEvent, type StreamState } from "../shared/business.js";
import { httpFailure, sameConnection, type ConnectionProvider } from "./business.js";
import type { ManagedConnection } from "./service.js";

/** One bounded authenticated stream; the renderer pulls batches, never an unbounded push queue. */
class Subscription {
  readonly id = randomUUID();
  readonly instance: ManagedConnection;
  private request: ClientRequest | null = null;
  private state: StreamState = "open";
  private queue: RunEvent[] = [];
  private accepted: number;
  private delivered: number;
  private line = "";
  private frameBytes = 0;
  private frame: { id?: string; event?: string; data?: string } = {};
  private decoder = new StringDecoder("utf8");
  private waiting: (() => void) | null = null;
  private reading = false;
  private idle: ReturnType<typeof setTimeout> | null = null;
  private openTimer: ReturnType<typeof setTimeout> | null = null;
  private opening: ((value: BridgeResult<{ subscription_id: string }>) => void) | null = null;

  constructor(readonly runId: string, after: number, connection: ManagedConnection,
              private provider: ConnectionProvider, private expire: () => void) {
    this.instance = connection;
    this.accepted = this.delivered = after;
    this.touch();
  }
  private touch(): void {
    if (this.idle) clearTimeout(this.idle);
    this.idle = setTimeout(this.expire, 30000);
    this.idle.unref();
  }
  open(): Promise<BridgeResult<{ subscription_id: string }>> {
    return new Promise((resolve) => {
      let settled = false;
      const opened = (result: BridgeResult<{ subscription_id: string }>) => {
        if (settled) return;
        settled = true;
        this.opening = null;
        if (this.openTimer) clearTimeout(this.openTimer);
        this.openTimer = null;
        resolve(result);
      };
      this.opening = opened;
      this.request = http.get({ hostname: "127.0.0.1", port: this.instance.port,
        path: `/api/v1/runs/${this.runId}/events`, headers: { Authorization: `Bearer ${this.instance.token}`,
          "X-ProdOps-Protocol": "1.4", "Last-Event-ID": String(this.accepted), Accept: "text/event-stream" } }, (response) => {
        if (!sameConnection(this.instance, this.provider())) {
          opened(failure("not_ready")); this.finish("closed"); response.destroy(); return;
        }
        if (response.statusCode !== 200 || !(response.headers["content-type"] ?? "").startsWith("text/event-stream")) {
          opened(failure(response.statusCode === 200 ? "invalid_response" : httpFailure(response.statusCode ?? 0)));
          this.finish("closed"); response.destroy(); return;
        }
        opened({ ok: true, value: { subscription_id: this.id } });
        response.on("data", (chunk: Buffer) => {
          if (!sameConnection(this.instance, this.provider())) { this.finish("closed"); return; }
          try { this.consume(this.decoder.write(chunk)); } catch { this.finish("invalid_response"); }
        });
        response.on("error", () => this.finish("offline"));
        response.on("end", () => {
          // A clean close is terminal only after a valid terminal business event.
          if (this.line || this.frameBytes) this.finish("invalid_response");
          else this.finish("offline");
        });
      });
      this.openTimer = setTimeout(() => { opened(failure("offline")); this.finish("offline"); }, 5000);
      this.request.setTimeout(45000, () => { opened(failure("offline")); this.finish("offline"); });
      this.request.on("error", () => { opened(failure("offline")); this.finish("offline"); });
    });
  }
  private consume(chunk: string): void {
    this.line += chunk;
    let end: number;
    while (this.state === "open" && (end = this.line.indexOf("\n")) >= 0) {
        const raw = this.line.slice(0, end);
        this.line = this.line.slice(end + 1);
        if (Buffer.byteLength(raw) > 131072) { this.finish("overflow"); return; }
        const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
        if (line === "") { this.dispatch(); continue; }
        if (line.startsWith(":")) continue;
        this.frameBytes += Buffer.byteLength(line);
        if (this.frameBytes > 131072) { this.finish("overflow"); return; }
        const colon = line.indexOf(":");
        const field = colon < 0 ? line : line.slice(0, colon);
        const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field !== "id" && field !== "event" && field !== "data") throw new Error("Invalid event field");
        if (this.frame[field] !== undefined) throw new Error("Duplicate event field");
        this.frame[field] = value;
    }
    if (Buffer.byteLength(this.line) > 131072) this.finish("overflow");
  }
  private dispatch(): void {
    const frame = this.frame;
    this.frame = {};
    this.frameBytes = 0;
    if (Object.keys(frame).length === 0) return;
    let value: unknown;
    try { value = JSON.parse(frame.data ?? ""); } catch { this.finish("invalid_response"); return; }
    if (frame.event === "stream.error") {
      if (frame.id !== undefined || !validateErrorResponse(value)) this.finish("invalid_response");
      else this.finish(value.error.code === "cursor_expired" ? "cursor_expired" : "offline");
      return;
    }
    if (!validateRunEvent(value) || value.run_id.toLowerCase() !== this.runId.toLowerCase() ||
        String(value.seq) !== frame.id || frame.event !== value.event_type) { this.finish("invalid_response"); return; }
    if (value.seq <= this.accepted) return;
    if (value.seq !== this.accepted + 1) { this.finish("gap"); return; }
    if (this.queue.length >= 32) { this.finish("overflow"); return; }
    this.accepted = value.seq;
    this.queue.push(value);
    this.waiting?.();
    if (["run.completed", "run.failed", "run.cancelled"].includes(value.event_type)) this.finish("ended");
  }
  private finish(state: StreamState): void {
    if (this.state !== "open") return;
    this.state = state;
    this.opening?.(failure(state === "closed" ? "not_ready" : "offline"));
    if (this.openTimer) clearTimeout(this.openTimer);
    this.openTimer = null;
    this.request?.destroy();
    this.waiting?.();
  }
  async read(): Promise<BridgeResult<EventBatch>> {
    if (this.reading) return failure("capacity");
    this.reading = true;
    this.touch();
    try {
      if (!sameConnection(this.instance, this.provider())) this.finish("closed");
      if (this.queue.length === 0 && this.state === "open") {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => { this.waiting = null; resolve(); }, 20000);
          this.waiting = () => { clearTimeout(timer); this.waiting = null; resolve(); };
        });
      }
      if (!sameConnection(this.instance, this.provider())) { this.queue = []; this.state = "closed"; }
      const events = this.queue.splice(0, 8);
      if (events.length) this.delivered = events[events.length - 1].seq;
      return { ok: true, value: { events, last_seq: this.delivered, state: this.queue.length ? "open" : this.state } };
    } finally { this.reading = false; }
  }
  close(): void {
    this.finish("closed");
    this.queue = [];
    if (this.idle) clearTimeout(this.idle);
    this.idle = null;
  }
}

export class EventStreams {
  private subscriptions = new Map<string, Subscription>();
  private disposed = false;
  constructor(private provider: ConnectionProvider) {}
  async execute(input: EventRequest): Promise<BridgeResult<{ subscription_id: string } | EventBatch | null>> {
    const request = parseEventRequest(input);
    if (this.disposed) return failure("not_ready");
    if (request.operation === "open") {
      const connection = this.provider();
      if (connection === null) return failure("not_ready");
      if (this.subscriptions.size >= 4) return failure("capacity");
      const stream = new Subscription(request.run_id, request.after_seq, connection, this.provider, () => {
        stream.close(); this.subscriptions.delete(stream.id);
      });
      this.subscriptions.set(stream.id, stream);
      const result = await stream.open();
      if (!result.ok) { stream.close(); this.subscriptions.delete(stream.id); }
      return result;
    }
    const stream = this.subscriptions.get(request.subscription_id);
    if (!stream || stream.runId !== request.run_id) return failure("not_found");
    if (request.operation === "read") return stream.read();
    stream.close(); this.subscriptions.delete(stream.id);
    return { ok: true, value: null };
  }
  dispose(): void {
    this.disposed = true;
    for (const stream of this.subscriptions.values()) stream.close();
    this.subscriptions.clear();
  }
}
