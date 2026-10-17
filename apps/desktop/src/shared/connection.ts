export const STATUS_CHANNEL = "prodops:connections:get-status";
export type ConnectionState = "ready" | "offline" | "incompatible" | "not_ready" | "invalid_response";

export interface ConnectionStatus {
  connection_id: "development";
  mode: "local" | "server";
  state: ConnectionState;
  deployment_id: string | null;
  protocol_version: "1.4" | null;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateStatusRequest(value: unknown): void {
  if (!record(value) || Object.keys(value).length !== 1 || value.connection_id !== "development") {
    throw new Error("Invalid connection request");
  }
}

export function parseConnectionStatus(value: unknown): ConnectionStatus {
  if (!record(value) || Object.keys(value).sort().join(",") !== "connection_id,deployment_id,mode,protocol_version,state" ||
      value.connection_id !== "development" || (value.mode !== "local" && value.mode !== "server") ||
      typeof value.state !== "string" || !["ready", "offline", "incompatible", "not_ready", "invalid_response"].includes(value.state)) {
    throw new Error("Invalid connection response");
  }
  if (value.state === "ready") {
    if (typeof value.deployment_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.deployment_id) || value.protocol_version !== "1.4") {
      throw new Error("Invalid connection response");
    }
  } else if (value.deployment_id !== null || value.protocol_version !== null) throw new Error("Invalid connection response");
  return value as unknown as ConnectionStatus;
}
