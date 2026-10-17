import type { components } from "./schema.js";
import { validateRunEvent } from "./validators.cjs";

export type RunEvent = components["schemas"]["ReservedContracts"]["event"];
export interface EventFrame { id: string; event: string; data: string }

/** A bounded watermark for one run on one connection. Recreate on connection change. */
export class RunEventCursor {
  private runId: string;
  private watermark: number;

  constructor(runId: string, afterSeq: number) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId) ||
        !Number.isSafeInteger(afterSeq) || afterSeq < 0) throw new Error("Invalid event cursor");
    this.runId = runId.toLowerCase();
    this.watermark = afterSeq;
  }

  get lastSeq(): number { return this.watermark; }

  accept(frame: unknown): RunEvent | null {
    if (typeof frame !== "object" || frame === null || Array.isArray(frame) ||
        Object.keys(frame).some((key) => !["id", "event", "data"].includes(key))) throw new Error("Invalid event frame");
    const { id, event, data } = frame as Record<string, unknown>;
    if (typeof id !== "string" || !/^[1-9][0-9]{0,15}$/.test(id) ||
        typeof event !== "string" || typeof data !== "string" || data.length > 131072) {
      throw new Error("Invalid event frame");
    }
    let value: unknown;
    try { value = JSON.parse(data); } catch { throw new Error("Invalid event frame"); }
    if (!validateRunEvent(value) || value.run_id.toLowerCase() !== this.runId ||
        String(value.seq) !== id || value.event_type !== event) throw new Error("Invalid event frame");
    if (value.seq <= this.watermark) return null;
    if (value.seq !== this.watermark + 1) throw new Error("Event gap: reload the task snapshot");
    this.watermark = value.seq;
    return value;
  }
}
