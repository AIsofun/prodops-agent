/** Parse imports with the TypeScript compiler API, including re-exports and aliases. */
import fs from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";
import ts from "typescript";

const builtins = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));
const allowed: Record<string, Set<string>> = {
  renderer: new Set(["renderer", "shared"]),
  preload: new Set(["preload", "shared"]),
  main: new Set(["main", "shared"]),
  shared: new Set(["shared"]),
};

function filesUnder(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(target);
    return /\.[cm]?tsx?$/.test(entry.name) ? [target] : [];
  });
}

function run(root: string): number {
  const sourceRoot = path.join(root, "apps/desktop/src");
  const files = filesUnder(sourceRoot);
  if (!files.length) {
    console.log("NOT_READY: TypeScript product sources are missing");
    return 2;
  }
  const configPath = path.join(root, "apps/desktop/tsconfig.json");
  if (!fs.existsSync(configPath)) {
    console.log("NOT_READY: desktop tsconfig.json is missing");
    return 2;
  }
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  if (parsed.errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(parsed.errors, {
    getCurrentDirectory: () => root,
    getCanonicalFileName: (name) => name,
    getNewLine: () => "\n",
  }));
  const errors: string[] = [];
  for (const file of files) {
    const relative = path.relative(sourceRoot, file);
    const layer = relative.split(path.sep)[0];
    if (!allowed[layer]) {
      errors.push(`${relative}: unknown desktop layer`);
      continue;
    }
    const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function reject(node: ts.Node, reason: string): void {
      const location = source.getLineAndCharacterOfPosition(node.getStart(source));
      errors.push(`${relative}:${location.line + 1}: ${reason}`);
    }
    function checkImport(node: ts.Node, specifier: string): void {
      if ((builtins.has(specifier) || specifier.startsWith("node:")) && layer !== "main") {
        reject(node, `${layer} cannot import Node module ${specifier}`);
      }
      if (specifier === "electron" && !["main", "preload"].includes(layer)) {
        reject(node, `${layer} cannot import electron`);
      }
      const resolved = ts.resolveModuleName(specifier, file, parsed.options, ts.sys).resolvedModule;
      if (!resolved) {
        if (specifier.startsWith(".") || specifier.startsWith("@/")) reject(node, `unresolved local import ${specifier}`);
        return; // External package resolution is also checked by tsc.
      }
      const target = path.relative(sourceRoot, resolved.resolvedFileName);
      if (!target.startsWith("..") && !path.isAbsolute(target)) {
        const targetLayer = target.split(path.sep)[0];
        if (!allowed[layer].has(targetLayer)) reject(node, `${layer} cannot import ${targetLayer}`);
      } else if (!resolved.isExternalLibraryImport) {
        const clientRoot = path.join(root, "packages/api-client/src") + path.sep;
        if (!path.resolve(resolved.resolvedFileName).startsWith(clientRoot)) {
          reject(node, `import leaves the allowed desktop/client source roots: ${specifier}`);
        }
      }
    }
    function visit(node: ts.Node): void {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
          checkImport(node, node.moduleSpecifier.text);
        }
      } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
        const expression = node.moduleReference.expression;
        if (expression && ts.isStringLiteralLike(expression)) checkImport(node, expression.text);
      } else if (ts.isCallExpression(node)) {
        const isImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
        const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
        if (isImport || isRequire) {
          const argument = node.arguments[0];
          if (argument && ts.isStringLiteralLike(argument)) checkImport(node, argument.text);
          else reject(node, "nonliteral dynamic module loading is not allowed");
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  for (const error of errors) console.error(error);
  if (!errors.length) console.log(`PASS: TypeScript boundaries (${files.length} files)`);
  return errors.length ? 1 : 0;
}

const rootIndex = process.argv.indexOf("--root");
const root = rootIndex >= 0 ? process.argv[rootIndex + 1] : process.cwd();
try {
  if (!root) throw new Error("--root requires a directory");
  process.exitCode = run(path.resolve(root));
} catch (error) {
  console.error(String(error));
  process.exitCode = 1;
}
