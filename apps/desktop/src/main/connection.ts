import http from "node:http";
import { validateCapabilities, validateHealth } from "../../../../packages/api-client/src/validators.cjs";
import type { ConnectionStatus } from "../shared/connection.js";

export interface DevelopmentConnection {
  readonly port: number;
  readonly mode: "local" | "server";
}

export function developmentConnection(env: NodeJS.ProcessEnv): DevelopmentConnection {
  const port = env.PRODOPS_SERVICE_PORT ?? "8765";
  const mode = env.PRODOPS_SERVICE_MODE ?? "local";
  if (!/^[0-9]{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535 || !["local", "server"].includes(mode)) {
    throw new Error("Invalid development connection settings");
  }
  return Object.freeze({ port: Number(port), mode: mode as "local" | "server" });
}

class InvalidResponse extends Error {}

function readJson(connection: DevelopmentConnection, endpoint: "/health/ready" | "/api/v1/capabilities", timeout: number): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: "127.0.0.1", port: connection.port, path: endpoint,
      headers: { "X-ProdOps-Protocol": "1.1", Accept: "application/json" } }, (response) => {
      if (!(response.headers["content-type"] ?? "").startsWith("application/json")) {
        response.resume(); reject(new InvalidResponse()); return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 32768) { response.destroy(); reject(new InvalidResponse()); }
        else chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => {
        try { resolve({ status: response.statusCode ?? 0, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) }); }
        catch { reject(new InvalidResponse()); }
      });
    });
    const timer = setTimeout(() => request.destroy(new Error("Connection timeout")), timeout);
    request.on("error", reject);
    request.on("close", () => clearTimeout(timer));
  });
}

export async function getConnectionStatus(connection: DevelopmentConnection, timeout = 2500): Promise<ConnectionStatus> {
  const status = (state: ConnectionStatus["state"]): ConnectionStatus => ({ connection_id: "development", mode: connection.mode, state, deployment_id: null, protocol_version: null });
  try {
    const health = await readJson(connection, "/health/ready", timeout);
    if (!validateHealth(health.body) || health.body.mode !== connection.mode) return status("invalid_response");
    if (health.status === 503 && health.body.status === "not_ready") return status("not_ready");
    if (health.status !== 200 || health.body.status !== "ready") return status("invalid_response");
    const capabilities = await readJson(connection, "/api/v1/capabilities", timeout);
    if (capabilities.status === 426) return status("incompatible");
    if (capabilities.status !== 200) return status("invalid_response");
    if (typeof capabilities.body === "object" && capabilities.body !== null && "protocol_version" in capabilities.body && capabilities.body.protocol_version !== "1.1") return status("incompatible");
    if (!validateCapabilities(capabilities.body) || capabilities.body.mode !== connection.mode) return status("invalid_response");
    return { ...status("ready"), deployment_id: capabilities.body.deployment_id, protocol_version: "1.1" };
  } catch (error) { return status(error instanceof InvalidResponse ? "invalid_response" : "offline"); }
}
