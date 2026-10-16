// Compile-only consumer checks; runtime IPC/HTTP validation belongs to T05/M2.
import type { components, operations } from "../src/schema.js";

type Event = components["schemas"]["ReservedContracts"]["event"];
type Capabilities = operations["capabilities_api_v1_capabilities_get"]["responses"][200]["content"]["application/json"];

export function completedResolution(event: Event): string | null {
  if (event.event_type === "run.completed") {
    return event.payload.resolution_status;
  }
  if (event.event_type === "run.failed") {
    return event.payload.error.code;
  }
  if (event.event_type === "message.delta") {
    // @ts-expect-error Text deltas cannot establish the task's resolution.
    const resolution = event.payload.resolution_status;
    return resolution ?? event.payload.delta;
  }
  return null;
}

export function checkProtocol(capabilities: Capabilities): "1.0" {
  return capabilities.protocol_version;
}

// @ts-expect-error Sequence numbers must be numeric.
export const invalidSequence: Event["seq"] = "1";
// @ts-expect-error The M1 protocol union rejects an unsupported version.
export const invalidProtocol: Event["schema_version"] = "2.0";
