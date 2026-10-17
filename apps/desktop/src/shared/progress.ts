import type { components } from "../../../../packages/api-client/src/schema.js";
import { validEventBatch, type BridgeCode, type BridgeResult, type RunEvent, type StreamState } from "./business.js";
import type { DesktopBridge } from "./desktop.js";

type Snapshot = components["schemas"]["RunSnapshot"];
export type ProgressState = StreamState | "reconnecting" | "restoring";
export type ProgressTransport = DesktopBridge["events"] & {
  snapshot(runId: string): Promise<BridgeResult<Snapshot>>;
};
export interface ProgressHooks {
  state(state: ProgressState): void;
  events(events: RunEvent[]): void;
  snapshot(snapshot: Snapshot, reset: boolean): void;
  finished(snapshot: Snapshot): Promise<void>;
  failure(code: BridgeCode): void;
}
class ProgressFault extends Error {
  constructor(readonly code: BridgeCode, readonly reset = false) { super(code); }
}
function unwrap<T>(value: BridgeResult<T>): T {
  if (!value.ok) throw new ProgressFault(value.error.code, value.error.code === "cursor_expired");
  return value.value;
}
const terminal = (snapshot: Snapshot) => ["succeeded", "failed", "cancelled"].includes(snapshot.status);

/** Read-only bounded reconnects. This session never retries submit/cancel/recover. */
export class ProgressSession {
  private stopped = false;
  private subscription: string | null = null;
  private wake: (() => void) | null = null;
  private watermark = 0;
  constructor(private transport: ProgressTransport, private initial: Snapshot, private hooks: ProgressHooks,
              private delays: readonly number[] = [500, 1000, 2000, 4000, 8000]) {}
  get lastSeq(): number { return this.watermark; }
  stop(): void {
    this.stopped = true;
    this.wake?.();
    this.release();
  }
  private release(): void {
    const id = this.subscription;
    this.subscription = null;
    if (id) void this.transport.close(this.initial.run_id, id).catch(() => undefined);
  }
  private pause(delay: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.wake = null; resolve(); }, delay);
      this.wake = () => { clearTimeout(timer); this.wake = null; resolve(); };
    });
  }
  private identity(snapshot: Snapshot): void {
    if (snapshot.run_id !== this.initial.run_id || snapshot.deployment_id !== this.initial.deployment_id ||
        snapshot.conversation_id !== this.initial.conversation_id || snapshot.workspace_id !== this.initial.workspace_id) {
      throw new ProgressFault("invalid_response");
    }
  }
  async run(): Promise<void> {
    let retries = 0;
    let restore = false;
    while (!this.stopped) {
      try {
        if (restore) {
          const snapshot = unwrap(await this.transport.snapshot(this.initial.run_id));
          if (this.stopped) return;
          this.identity(snapshot);
          this.watermark = snapshot.last_event_seq;
          this.hooks.snapshot(snapshot, true);
          restore = false;
          if (terminal(snapshot)) { this.hooks.state("ended"); await this.hooks.finished(snapshot); return; }
        }
        const opened = unwrap(await this.transport.open(this.initial.run_id, this.watermark));
        this.subscription = opened.subscription_id;
        if (this.stopped) return;
        this.hooks.state("open");
        while (!this.stopped) {
          const batch = unwrap(await this.transport.read(this.initial.run_id, opened.subscription_id));
          if (this.stopped) return;
          if (!validEventBatch(batch)) throw new ProgressFault("invalid_response");
          const accepted: RunEvent[] = [];
          for (const event of batch.events) {
            if (event.run_id !== this.initial.run_id) throw new ProgressFault("invalid_response");
            if (event.seq <= this.watermark) continue;
            if (event.seq !== this.watermark + 1) throw new ProgressFault("cursor_expired", true);
            this.watermark = event.seq;
            accepted.push(event);
          }
          if (batch.last_seq > this.watermark) throw new ProgressFault("cursor_expired", true);
          if (accepted.length) this.hooks.events(accepted);
          const snapshot = unwrap(await this.transport.snapshot(this.initial.run_id));
          if (this.stopped) return;
          this.identity(snapshot);
          this.hooks.snapshot(snapshot, false);
          this.hooks.state(batch.state);
          if (batch.state === "ended") {
            if (!terminal(snapshot)) throw new ProgressFault("invalid_response");
            await this.hooks.finished(snapshot); return;
          }
          if (["cursor_expired", "gap", "overflow"].includes(batch.state)) throw new ProgressFault("cursor_expired", true);
          if (batch.state === "incompatible") throw new ProgressFault("incompatible");
          if (batch.state === "invalid_response") throw new ProgressFault("invalid_response");
          if (batch.state !== "open") throw new ProgressFault("offline");
          retries = 0;
        }
      } catch (error) {
        if (this.stopped) return;
        const fault = error instanceof ProgressFault ? error : new ProgressFault("offline");
        if (!["offline", "not_ready", "capacity", "cursor_expired"].includes(fault.code) || retries >= this.delays.length) {
          this.hooks.state(fault.code === "incompatible" ? "incompatible" : fault.code === "invalid_response" ? "invalid_response" : "offline");
          this.hooks.failure(fault.code); return;
        }
        restore ||= fault.reset;
        this.hooks.state(restore ? "restoring" : "reconnecting");
        this.release();
        await this.pause(this.delays[retries++]);
      } finally { this.release(); }
    }
  }
}
