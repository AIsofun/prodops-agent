const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const build = process.env.PRODOPS_TEST_BUILD ?? path.resolve(__dirname, "../dist");
const { parsePreferences, defaultPreferences, parseShellRequest, parseMenuAction } = require(path.join(build, "shared/shell.js"));
const { PreferencesStore } = require(path.join(build, "main/preferences.js"));

test("desktop capabilities accept only finite operations and non-secret profile fields", () => {
  assert.deepEqual(parseShellRequest({ operation: "window", action: "minimize" }), { operation: "window", action: "minimize" });
  for (const value of [{ operation: "window", action: "exec" }, { operation: "window", action: { toString: () => "close" } },
    { operation: "menu", name: "file", url: "https://example.invalid" }, { operation: "preferences.get", path: "other" }]) assert.throws(() => parseShellRequest(value), /Invalid/);
  assert.throws(() => parseMenuAction({ toString: () => "quit" }), /Invalid/);
  assert.throws(() => parsePreferences({ ...defaultPreferences(), api_key: "should-not-be-saved" }), /Invalid/);
  for (const endpoint of ["file:///tmp/config", "https://user:password@example.invalid/v1", "https://example.invalid?key=secret", "https://example.invalid/#secret", "http://x/\nsecret"]) {
    assert.throws(() => parsePreferences({ ...defaultPreferences(), local: { name: "local", endpoint, model: "test" } }), /Invalid/);
  }
  assert.throws(() => parsePreferences({ ...defaultPreferences(), cloud: { name: "cloud", endpoint: "", model: "test", key: "secret" } }), /Invalid/);
});

test("isolated preference saves survive reopening, reject corruption and preserve the last valid file", async () => {
  const allowed = path.resolve(__dirname, "../../../.quality-reports");
  await fs.mkdir(allowed, { recursive: true });
  const directory = await fs.mkdtemp(path.join(allowed, "preferences-test-"));
  try {
    const store = new PreferencesStore(directory);
    assert.deepEqual(await store.get(), defaultPreferences());
    const value = { ...defaultPreferences(), sidebar_collapsed: true, local: { name: "本地", endpoint: "http://127.0.0.1:11434/v1", model: "sample" } };
    await Promise.all([store.save(value), store.save({ ...value, server_endpoint: "https://factory.invalid" })]);
    const result = await new PreferencesStore(directory).get();
    assert.equal(result.sidebar_collapsed, true);
    assert.equal(result.local.model, "sample");
    assert.equal(result.server_endpoint, "https://factory.invalid");
    assert.throws(() => store.save({ ...value, secret: "blocked" }), /Invalid/);
    assert.deepEqual(await store.get(), result);
    await fs.writeFile(path.join(directory, "ui-preferences.json"), "invalid-json");
    await assert.rejects(store.get(), /unavailable/);
    assert.equal(await fs.readFile(path.join(directory, "ui-preferences.json"), "utf8"), "invalid-json");
  } finally {
    if (!path.resolve(directory).startsWith(allowed + path.sep)) throw new Error("Unsafe preferences test cleanup");
    await fs.rm(directory, { recursive: true, force: true });
  }
});
