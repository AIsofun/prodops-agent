import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { build } from "vite";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(import.meta.url);
if (process.platform !== "win32" || process.arch !== "x64") throw new Error("This development package targets Windows AMD64");
const reports = path.join(root, ".quality-reports");
const outputArguments = process.argv.slice(2);
if (outputArguments.length > 1) throw new Error("Usage: package.mjs [output-directory]");
const installers = path.resolve(root, outputArguments[0] ?? ".quality-reports/installers");
if (!installers.startsWith(path.resolve(reports) + path.sep)) throw new Error("Package output must be inside .quality-reports");
const appDirectory = path.join(reports, "package-app");
const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(CSC_|WIN_CSC_|AZURE_)/i.test(key)));
const env = { ...inherited, PYINSTALLER_CONFIG_DIR: path.join(reports, "pyinstaller-cache"),
  ELECTRON_BUILDER_CACHE: path.join(reports, "electron-builder-cache"), CSC_IDENTITY_AUTO_DISCOVERY: "false", PYTHONUTF8: "1" };
function run(executable, args) {
  const result = spawnSync(executable, args, { cwd: root, env, stdio: "inherit", windowsHide: true });
  if (result.error || result.status !== 0) throw new Error("Development package build command failed");
}
run(path.join(root, ".venv/Scripts/python.exe"), ["-m", "PyInstaller", "--noconfirm", "--clean",
  "--distpath", ".quality-reports/service-dist", "--workpath", ".quality-reports/service-build", "services/agent/packaging/prodops-agent.spec"]);
run(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "apps/desktop/tsconfig.electron.json"]);
for (const config of ["vite.preload.config.mjs", "vite.config.mjs"]) await build({ configFile: path.join(root, "apps/desktop", config) });
await build({ configFile: false, build: { outDir: path.join(appDirectory, "main"), emptyOutDir: true, minify: false,
  lib: { entry: path.join(root, "apps/desktop/src/main/index.ts"), formats: ["cjs"], fileName: () => "index.js" },
  rolldownOptions: { external: ["electron", /^node:/] } } });
for (const directory of ["preload", "renderer"]) {
  const target = path.resolve(appDirectory, directory);
  if (!target.startsWith(path.resolve(reports) + path.sep)) throw new Error("Invalid package staging path");
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(path.join(root, "apps/desktop/dist", directory), target, { recursive: true });
}
const metadata = JSON.parse(fs.readFileSync(path.join(root, "apps/desktop/package.json"), "utf8"));
fs.writeFileSync(path.join(appDirectory, "package.json"), JSON.stringify({ name: "prodops-desktop-development", productName: "ProdOps Dev",
  version: metadata.version, description: "Windows desktop agent development build with explicit mock diagnostics", author: "ProdOps contributors", type: "commonjs", main: "main/index.js", private: true }, null, 2) + "\n");
run(process.execPath, ["node_modules/electron-builder/cli.js", "--win", "nsis", "--x64", "--publish", "never", "--config", "apps/desktop/electron-builder.cjs", `--config.directories.output=${installers}`]);
const name = `ProdOps-Dev-${metadata.version}-windows-x64-setup.exe`;
const executable = path.join(installers, name);
const checksum = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
function sourceFiles(directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    if (entry.name === "__pycache__") return [];
    return entry.isDirectory() ? sourceFiles(target) : /\.(ts|tsx|css|svg|py|json)$/.test(entry.name) ? [target] : [];
  });
}
const sources = ["package-lock.json", "uv.lock", "pyproject.toml", "contracts/openapi.json", "apps/desktop/electron-builder.cjs", "services/agent/packaging/prodops-agent.spec",
  "apps/desktop/scripts/package.mjs", ...sourceFiles("apps/desktop/src"), ...sourceFiles("services/agent/src")];
const manifest = { schema_version: 1, target: "windows-x64", development_only: true, signed: false, published: false,
  version: metadata.version, created_at: new Date().toISOString(), source_revision: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(),
  worktree_dirty: spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).stdout.trim().length > 0,
  versions: { node: process.versions.node, electron: require("electron/package.json").version, electron_builder: require("electron-builder/package.json").version, pyinstaller: "6.22.3" },
  installer: { name, bytes: fs.statSync(executable).size, sha256: checksum(executable) },
  source_hashes: Object.fromEntries(sources.map(file => [file, checksum(path.join(root, file))])) };
fs.writeFileSync(path.join(installers, "build-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
fs.writeFileSync(path.join(installers, `${name}.sha256`), `${manifest.installer.sha256}  ${name}\n`);
console.log(`PASS: unsigned development installer built locally; ${executable}`);
