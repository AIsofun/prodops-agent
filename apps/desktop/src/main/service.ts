import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import http from "node:http";
import path from "node:path";
import {
  validateDesktopStartupFailure, validateDesktopStartupReady,
  validateDesktopStartupRequest, validateDesktopStopRequest, validateWorkspaceList,
} from "../../../../packages/api-client/src/validators.cjs";
import type { components } from "../../../../packages/api-client/src/schema.js";
import { getConnectionStatus } from "./connection.js";
import type { ConnectionState, ConnectionStatus } from "../shared/connection.js";

type Ready = components["schemas"]["DesktopStartupReady"];
export interface ManagedConnection {
  readonly port: number;
  readonly mode: "local";
  readonly token: string;
  readonly instance_id: string;
  readonly deployment_id: string;
  readonly process_id: number;
}
export interface ServiceLaunchOptions {
  executable: string;
  args: string[];
  cwd: string;
  databasePath: string;
  startupTimeoutMs?: number;
  shutdownTimeoutMs?: number;
}

function deadline<T>(promise: Promise<T>, timeout: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Local service operation timed out")), timeout);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); reject(new Error("Local service operation failed")); });
  });
}

function verifyAuthentication(connection: ManagedConnection): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: "127.0.0.1", port: connection.port, path: "/api/v1/workspaces",
      headers: { Authorization: `Bearer ${connection.token}`, "X-ProdOps-Protocol": "1.4", Accept: "application/json" } }, (response) => {
      if (response.statusCode !== 200 || !(response.headers["content-type"] ?? "").startsWith("application/json")) {
        response.resume(); reject(new Error("Local service authentication failed")); return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 32768) response.destroy(new Error("Invalid local service response"));
        else chunks.push(chunk);
      });
      response.on("error", () => reject(new Error("Local service authentication failed")));
      response.on("end", () => {
        try {
          const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if (!validateWorkspaceList(body) || body.items.length !== 1 || body.items[0].deployment_id !== connection.deployment_id) throw new Error();
          resolve();
        } catch { reject(new Error("Invalid local service identity")); }
      });
    });
    request.setTimeout(2500, () => request.destroy(new Error("Local service authentication timed out")));
    const timer = setTimeout(() => request.destroy(new Error("Local service authentication timed out")), 2500);
    request.once("close", () => clearTimeout(timer));
    request.on("error", () => reject(new Error("Local service authentication failed")));
  });
}

export function serviceLaunchOptions(packaged: boolean, resources: string, root: string, userData: string): ServiceLaunchOptions {
  return {
    executable: packaged ? path.join(resources, "agent", "prodops-agent.exe") :
      path.join(root, process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python"),
    args: packaged ? [] : ["-m", "prodops.bootstrap.desktop"],
    cwd: packaged ? resources : root,
    databasePath: path.join(userData, "agent", "prodops.sqlite3"),
  };
}

/** Owns one private local child. Tokens and process controls never cross the preload bridge. */
export class LocalService {
  private child: ChildProcessWithoutNullStreams | null = null;
  private connection: ManagedConnection | null = null;
  private startup: Promise<ManagedConnection> | null = null;
  private shutdown: Promise<void> | null = null;
  private closed: Promise<void> = Promise.resolve();
  private state: ConnectionState = "not_ready";
  private stopping = false;
  private instanceId = randomUUID();
  private options: ServiceLaunchOptions;

  constructor(options: ServiceLaunchOptions) {
    if (![options.executable, options.cwd, options.databasePath].every((value) => path.isAbsolute(value)) ||
        (options.startupTimeoutMs !== undefined && (!Number.isInteger(options.startupTimeoutMs) || options.startupTimeoutMs < 20 || options.startupTimeoutMs > 30000)) ||
        (options.shutdownTimeoutMs !== undefined && (!Number.isInteger(options.shutdownTimeoutMs) || options.shutdownTimeoutMs < 20 || options.shutdownTimeoutMs > 12000))) {
      throw new Error("Invalid local service configuration");
    }
    this.options = { ...options, args: [...options.args] };
  }

  start(): Promise<ManagedConnection> {
    if (this.stopping) return Promise.reject(new Error("Local service has stopped"));
    this.startup ??= this.launch().catch(async () => {
      await this.stop().catch(() => undefined);
      throw new Error("Local service could not start. Check the runtime and data configuration.");
    });
    return this.startup;
  }

  private launch(): Promise<ManagedConnection> {
    const token = randomBytes(32).toString("base64url");
    const message: components["schemas"]["DesktopStartupRequest"] = {
      startup_version: "1.0", instance_id: this.instanceId, token, database_path: this.options.databasePath,
    };
    if (!validateDesktopStartupRequest(message)) return Promise.reject(new Error("Invalid local startup request"));
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("PRODOPS_") && !key.startsWith("PYTHON")));
    env.PYTHONUTF8 = "1";
    const child = spawn(this.options.executable, this.options.args, {
      cwd: this.options.cwd, env, shell: false, windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
    });
    this.child = child;
    this.closed = new Promise((resolve) => child.once("close", () => {
      this.connection = null;
      if (this.state === "not_ready") this.state = "offline";
      resolve();
    }));
    child.stderr.on("data", () => undefined); // Drain private diagnostics without forwarding raw output.
    return new Promise((resolve, reject) => {
      let settled = false;
      let received = false;
      let bytes = 0;
      let buffer = "";
      const timer = setTimeout(() => fail("offline"), this.options.startupTimeoutMs ?? 30000);
      const fail = (state: ConnectionState) => {
        this.state = state;
        this.connection = null;
        if (!settled) { settled = true; clearTimeout(timer); reject(new Error("Local service startup failed")); }
        else void this.stop().catch(() => undefined);
      };
      child.once("error", () => fail("offline"));
      child.once("close", () => { if (!settled) fail("offline"); });
      child.stdin.on("error", () => { if (!this.stopping) fail("offline"); });
      child.stdout.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 4096) { fail("invalid_response"); return; }
        if (received) { if (chunk.toString("utf8").trim()) fail("invalid_response"); return; }
        buffer += chunk.toString("utf8");
        const end = buffer.indexOf("\n");
        if (end < 0) return;
        received = true;
        if (buffer.slice(end + 1).trim()) { fail("invalid_response"); return; }
        let value: unknown;
        try { value = JSON.parse(buffer.slice(0, end)); } catch { fail("invalid_response"); return; }
        if (validateDesktopStartupFailure(value) && value.type === "error") { fail("offline"); return; }
        if (!validateDesktopStartupReady(value) || value.type !== "ready" || value.startup_version !== "1.0" ||
            value.host !== "127.0.0.1" || value.mode !== "local" || value.instance_id !== this.instanceId ||
            (value.process_id !== child.pid && value.parent_process_id !== child.pid)) { fail("invalid_response"); return; }
        const ready: Ready = value;
        const connection: ManagedConnection = Object.freeze({ port: ready.port, mode: "local", token,
          instance_id: ready.instance_id, deployment_id: ready.deployment_id, process_id: ready.process_id });
        void (async () => {
          const status = await getConnectionStatus(connection);
          if (status.state !== "ready" || status.deployment_id !== connection.deployment_id) throw new Error();
          await verifyAuthentication(connection);
          if (settled || this.stopping) return;
          this.connection = connection;
          settled = true;
          clearTimeout(timer);
          resolve(connection);
        })().catch(() => fail("invalid_response"));
      });
      child.stdin.write(JSON.stringify(message) + "\n");
    });
  }

  async getStatus(): Promise<ConnectionStatus> {
    const connection = this.connection;
    if (connection !== null && !this.stopping) {
      const status = await getConnectionStatus(connection);
      if (status.state !== "ready" || status.deployment_id === connection.deployment_id) return status;
      this.state = "invalid_response";
    }
    return { connection_id: "development", mode: "local", state: this.state,
      deployment_id: null, protocol_version: null };
  }

  stop(): Promise<void> {
    this.stopping = true;
    this.shutdown ??= this.performStop();
    return this.shutdown;
  }

  private async performStop(): Promise<void> {
    const child = this.child;
    if (child === null) return;
    if (this.connection !== null) this.state = "offline";
    this.connection = null;
    const stop: components["schemas"]["DesktopStopRequest"] = { type: "stop", instance_id: this.instanceId };
    if (validateDesktopStopRequest(stop) && !child.stdin.destroyed) child.stdin.end(JSON.stringify(stop) + "\n");
    try { await deadline(this.closed, this.options.shutdownTimeoutMs ?? 12000); }
    catch {
      if (child.exitCode === null && child.pid !== undefined) {
        if (process.platform === "win32") {
          const taskkill = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe");
          await new Promise<void>((resolve) => execFile(taskkill, ["/PID", String(child.pid), "/T", "/F"],
            { windowsHide: true, timeout: 5000 }, () => resolve()));
        } else child.kill("SIGKILL");
      }
      await deadline(this.closed, 5000);
    }
  }
}
