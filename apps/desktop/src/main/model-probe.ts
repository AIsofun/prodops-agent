import http from "node:http";
import https from "node:https";
import { modelEndpoint, keyEndpointAllowed, parseModelDraft, type ModelDraft, type ModelSource, type ModelCheckResult } from "../shared/shell.js";
import type { ModelKeyVault } from "./model-keys.js";

/** Explicit user-triggered GET /models only. No redirects, retries, inference or task data. */
export class ModelProbe {
  private pending = false;
  constructor(private readonly vault: Pick<ModelKeyVault, "get">, private readonly timeout = 10000) {}
  async test(source: ModelSource, input: ModelDraft): Promise<ModelCheckResult> {
    if (this.pending) return { code: "busy" };
    let url: URL;
    let draft: ModelDraft;
    try { draft = parseModelDraft(input); url = modelEndpoint(draft.endpoint); if (!draft.model.trim()) throw new Error(); }
    catch { return { code: "invalid_config" }; }
    this.pending = true;
    try {
      let secret: string | null;
      try { secret = await this.vault.get(source, draft.endpoint); }
      catch { return { code: "key_unavailable" }; }
      if (secret && !keyEndpointAllowed(url)) return { code: "invalid_config" };
      url.pathname = url.pathname.replace(/\/+$/, "") + "/models";
      return await new Promise<ModelCheckResult>((resolve) => {
        let settled = false;
        const finish = (code: ModelCheckResult["code"]) => { if (!settled) { settled = true; clearTimeout(timer); resolve({ code }); } };
        const request = (url.protocol === "https:" ? https : http).get(url, {
          headers: { Accept: "application/json", ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
        }, (response) => {
          const status = response.statusCode ?? 0;
          if (status !== 200) {
            finish(status === 401 || status === 403 ? "unauthorized" : status === 404 ? "not_found" : status === 429 ? "rate_limited" : "http_error");
            response.destroy(); return;
          }
          if (!/^application\/json(?:\s*;|$)/i.test(response.headers["content-type"] ?? "")) { finish("invalid_response"); response.destroy(); return; }
          let bytes = 0;
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > 1024 * 1024) { finish("invalid_response"); response.destroy(); return; }
            chunks.push(chunk);
          });
          response.on("error", () => finish("unreachable"));
          response.on("end", () => {
            if (settled) return;
            try {
              const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
              if (!body || typeof body !== "object" || !("data" in body) || !Array.isArray(body.data) || body.data.length > 10000 ||
                body.data.some(item => !item || typeof item !== "object" || typeof item.id !== "string" || item.id.length > 256)) throw new Error();
              finish(body.data.some(item => item.id === draft.model.trim()) ? "connected" : "model_missing");
            } catch { finish("invalid_response"); }
          });
        });
        const timer = setTimeout(() => { finish("timeout"); request.destroy(); }, this.timeout);
        request.on("error", () => finish("unreachable"));
      });
    } catch { return { code: "unreachable" }; }
    finally { this.pending = false; }
  }
}
