import { readFile, mkdir, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { modelEndpoint, keyEndpointAllowed, type ModelSource } from "../shared/shell.js";

export interface SecretEncryption { available(): boolean; encrypt(value: string): Buffer; decrypt(value: Buffer): string }
type Keys = Partial<Record<ModelSource, { endpoint: string; ciphertext: string }>>;
export class ModelKeyVault {
  private writes: Promise<unknown> = Promise.resolve();
  constructor(private readonly directory: string, private readonly encryption: SecretEncryption) {}
  private get filename() { return path.join(this.directory, "model-keys.json"); }
  private async read(): Promise<Keys> {
    try {
      const bytes = await readFile(this.filename);
      if (bytes.length > 32768) throw new Error();
      const data: unknown = JSON.parse(bytes.toString("utf8"));
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
      for (const [source, item] of Object.entries(data)) {
        if (!["local", "cloud"].includes(source) || !item || typeof item !== "object" || Object.keys(item).sort().join(",") !== "ciphertext,endpoint" ||
          typeof item.endpoint !== "string" || modelEndpoint(item.endpoint).href !== item.endpoint || !keyEndpointAllowed(new URL(item.endpoint)) ||
          typeof item.ciphertext !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(item.ciphertext) || item.ciphertext.length > 16000) throw new Error();
      }
      return data as Keys;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw new Error("Model key storage unavailable");
    }
  }
  async configured(source: ModelSource, endpoint: string): Promise<boolean> {
    return (await this.get(source, endpoint)) !== null;
  }
  async get(source: ModelSource, endpoint: string): Promise<string | null> {
    await this.writes;
    const item = (await this.read())[source];
    if (!item || item.endpoint !== modelEndpoint(endpoint).href) return null;
    try {
      if (!this.encryption.available()) throw new Error();
      const secret = this.encryption.decrypt(Buffer.from(item.ciphertext, "base64"));
      if (!/^[\x21-\x7e]{1,4096}$/.test(secret)) throw new Error();
      return secret;
    } catch { throw new Error("Model key storage unavailable"); }
  }
  set(source: ModelSource, endpoint: string, secret: string | null): Promise<void> {
    const url = modelEndpoint(endpoint);
    if (!keyEndpointAllowed(url) || secret !== null && !/^[\x21-\x7e]{1,4096}$/.test(secret)) throw new Error("Invalid model key configuration");
    const write = this.writes.then(async () => {
      const data = await this.read();
      if (secret === null) { if (data[source]?.endpoint === url.href) delete data[source]; }
      else {
        if (!this.encryption.available()) throw new Error("Model key encryption unavailable");
        data[source] = { endpoint: url.href, ciphertext: this.encryption.encrypt(secret).toString("base64") };
      }
      await mkdir(this.directory, { recursive: true });
      const temporary = path.join(this.directory, `model-keys-${randomUUID()}.tmp`);
      try { await writeFile(temporary, JSON.stringify(data) + "\n", { flag: "wx", mode: 0o600 }); await rename(temporary, this.filename); }
      catch { throw new Error("Model key storage unavailable"); }
      finally { await unlink(temporary).catch(() => undefined); }
    });
    this.writes = write.catch(() => undefined);
    return write;
  }
}
