import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../../", import.meta.url));
for (const args of [
  ["node_modules/typescript/bin/tsc", "-p", "apps/desktop/tsconfig.electron.json", "--outDir", "apps/desktop/.test-build"],
  ["--test", "apps/desktop/tests/connection.test.cjs", "apps/desktop/tests/service.test.cjs", "apps/desktop/tests/business.test.cjs", "apps/desktop/tests/progress.test.cjs", "apps/desktop/tests/preferences.test.cjs"],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit", windowsHide: true,
    env: { ...process.env, PRODOPS_TEST_BUILD: path.join(root, "apps/desktop/.test-build") } });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
