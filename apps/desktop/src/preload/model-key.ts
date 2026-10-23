import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("modelKeyEntry", Object.freeze({
  submit: async (secret: unknown) => {
    if (typeof secret !== "string" || !/^[\x21-\x7e]{1,4096}$/.test(secret)) throw new Error("Invalid API Key");
    const result: unknown = await ipcRenderer.invoke("prodops:model-key:submit", { secret });
    if (!result || typeof result !== "object" || Object.keys(result).join(",") !== "saved" || !("saved" in result) || result.saved !== true) throw new Error("Key entry failed");
  },
}));
