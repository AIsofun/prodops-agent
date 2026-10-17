import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = fileURLToPath(new URL("../../../", import.meta.url));
function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}
const require = createRequire(path.resolve(argument("--tools-root", root), "package.json"));
const Ajv2020 = require("ajv/dist/2020.js").default;
const addFormats = require("ajv-formats").default;
const standalone = require("ajv/dist/standalone/index.js").default;
const outputFlag = process.argv.indexOf("--output");
const output = outputFlag >= 0 ? process.argv[outputFlag + 1] : "packages/api-client/src/validators.cjs";
if (!output) throw new Error("--output requires a path");
const openapi = JSON.parse(fs.readFileSync(argument("--schema", path.join(root, "contracts/openapi.json")), "utf8"));
function convert(value) {
  if (Array.isArray(value)) return value.map(convert);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== "discriminator")
    .map(([key, item]) => [key, key === "$ref" ? item.replace("#/components/schemas/", "#/$defs/") : convert(item)]));
  return value;
}
const ajv = new Ajv2020({ code: { source: true, lines: true }, strict: true, validateFormats: true, coerceTypes: false, removeAdditional: false });
addFormats(ajv);
ajv.addSchema({ $id: "prodops-contracts", $defs: convert(openapi.components.schemas) });
const code = "// Generated from contracts/openapi.json. Do not edit.\n" + standalone(ajv, {
  validateHealth: "prodops-contracts#/$defs/HealthResponse",
  validateCapabilities: "prodops-contracts#/$defs/CapabilitiesResponse",
  validateRunEvent: "prodops-contracts#/$defs/ReservedContracts/properties/event",
  validateDesktopStartupRequest: "prodops-contracts#/$defs/DesktopStartupRequest",
  validateDesktopStartupReady: "prodops-contracts#/$defs/DesktopStartupReady",
  validateDesktopStartupFailure: "prodops-contracts#/$defs/DesktopStartupFailure",
  validateDesktopStopRequest: "prodops-contracts#/$defs/DesktopStopRequest",
  validateWorkspaceList: "prodops-contracts#/$defs/WorkspaceList",
});
const target = path.resolve(root, output);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, code.trimEnd() + "\n");
