import { readFile, mkdir, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { defaultPreferences, parsePreferences, type DesktopPreferences } from "../shared/shell.js";

/** UI preferences and inactive, non-secret connection drafts only. Never used by the task executor. */
export class PreferencesStore {
  private writes: Promise<unknown> = Promise.resolve();
  constructor(private readonly directory: string) {}
  private get filename() { return path.join(this.directory, "ui-preferences.json"); }
  async get(): Promise<DesktopPreferences> {
    await this.writes;
    try {
      const data = await readFile(this.filename);
      if (data.length > 16384) throw new Error("Invalid preferences size");
      return parsePreferences(JSON.parse(data.toString("utf8")) as unknown);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return defaultPreferences();
      throw new Error("Desktop preferences unavailable");
    }
  }
  save(input: unknown): Promise<DesktopPreferences> {
    const value = parsePreferences(input);
    const write = this.writes.then(async () => {
      await mkdir(this.directory, { recursive: true });
      const temporary = path.join(this.directory, `ui-preferences-${randomUUID()}.tmp`);
      try { await writeFile(temporary, JSON.stringify(value) + "\n", { encoding: "utf8", flag: "wx", mode: 0o600 });
        await rename(temporary, this.filename);
      } catch { throw new Error("Desktop preferences unavailable"); }
      finally { await unlink(temporary).catch(() => undefined); }
      return parsePreferences(value);
    });
    this.writes = write.catch(() => undefined);
    return write;
  }
}
