const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { once } = require("node:events");
const build = process.env.PRODOPS_TEST_BUILD ?? path.resolve(__dirname, "../dist");
const { ModelProbe } = require(path.join(build, "main/model-probe.js"));
const { ModelKeyVault } = require(path.join(build, "main/model-keys.js"));
const { parseShellRequest, parseModelCheck, parseModelKeyStatus } = require(path.join(build, "shared/shell.js"));

test("model IPC rejects secret fields and unknown actions/results", () => {
  const draft = { name: "fixture", endpoint: "http://127.0.0.1:11434/v1", model: "fixture" };
  assert.equal(parseShellRequest({ operation: "model.test", source: "local", draft }).operation, "model.test");
  for (const value of [{ operation: "model.key.get", source: "local", draft }, { operation: "model.test", source: "other", draft },
    { operation: "model.test", source: "local", draft: { ...draft, api_key: "fixture-only" } }]) assert.throws(() => parseShellRequest(value), /Invalid/);
  assert.throws(() => parseModelCheck({ code: "connected", response: "unsafe-body" }), /Invalid/);
  assert.throws(() => parseModelKeyStatus({ configured: true, secret: "fixture-only" }), /Invalid/);
});

test("real HTTP model-list probe checks auth, model identity, limits, failures and never follows redirects", async () => {
  let count = 0;
  const server = http.createServer((request, response) => {
    count++;
    const branch = request.url.split("/")[1];
    if (branch === "timeout") return;
    if (branch === "redirect") { response.writeHead(302, { Location: "/ok/models" }); response.end(); return; }
    if (["401", "404", "429", "500"].includes(branch)) { response.writeHead(Number(branch)); response.end("fixture response must never be exposed"); return; }
    response.setHeader("Content-Type", "application/json");
    if (branch === "large") { response.end(' '.repeat(1024 * 1024 + 1)); return; }
    if (branch === "broken") { response.end('{'); return; }
    if (branch === "html") { response.setHeader("Content-Type", "text/html"); response.end("<html></html>"); return; }
    if (branch === "auth" && request.headers.authorization !== "Bearer fixture-only-key") { response.writeHead(401); response.end(); return; }
    assert.match(request.url, /\/models$/);
    assert.equal(request.method, "GET");
    response.end(JSON.stringify({ object: "list", data: [{ id: "fixture-model" }] }));
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const draft = branch => ({ name: "fixture", endpoint: `${base}/${branch}/`, model: "fixture-model" });
  const probe = new ModelProbe({ get: async () => null }, 2000);
  const shortProbe = new ModelProbe({ get: async () => null }, 120);
  try {
    for (const [branch, code] of [["ok", "connected"], ["auth", "unauthorized"], ["401", "unauthorized"], ["404", "not_found"], ["429", "rate_limited"],
      ["500", "http_error"], ["redirect", "http_error"], ["large", "invalid_response"], ["broken", "invalid_response"], ["html", "invalid_response"], ["timeout", "timeout"]]) {
      const before = count; assert.deepEqual(await (branch === "timeout" ? shortProbe : probe).test("local", draft(branch)), { code }, branch); assert.equal(count, before + 1, "No retries or redirect requests");
    }
    assert.deepEqual(await probe.test("local", { ...draft("ok"), model: "missing" }), { code: "model_missing" });
    assert.deepEqual(await probe.test("local", { ...draft("ok"), endpoint: "" }), { code: "invalid_config" });
    assert.deepEqual(await probe.test("local", { ...draft("ok"), endpoint: "https://user:pass@example.invalid" }), { code: "invalid_config" });
    assert.deepEqual(await new ModelProbe({ get: async () => "fixture-only-key" }).test("cloud", draft("auth")), { code: "connected" });
    assert.deepEqual(await new ModelProbe({ get: async () => { throw new Error("private failure"); } }).test("cloud", draft("ok")), { code: "key_unavailable" });
    const pending = shortProbe.test("local", draft("timeout"));
    assert.deepEqual(await shortProbe.test("local", draft("ok")), { code: "busy" }); await pending;
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  assert.deepEqual(await probe.test("local", draft("ok")), { code: "unreachable" });
});

test("keys are encrypted, bound to exact endpoint/source, survive restart and never fall back to plaintext", async () => {
  const allowed = path.resolve(__dirname, "../../../.quality-reports"); await fs.mkdir(allowed, { recursive: true });
  const directory = await fs.mkdtemp(path.join(allowed, "model-vault-"));
  // Isolated deterministic encryption fixture; actual Windows safeStorage is tested in Electron.
  const encryption = { available: () => true, encrypt: value => Buffer.from(value.split("").reverse().join("")), decrypt: value => value.toString().split("").reverse().join("") };
  const endpoint = "https://model.invalid/v1";
  try {
    const vault = new ModelKeyVault(directory, encryption);
    await vault.set("cloud", endpoint, "fixture-only-key");
    assert.ok(!(await fs.readFile(path.join(directory, "model-keys.json"), "utf8")).includes("fixture-only-key"));
    const reopened = new ModelKeyVault(directory, encryption);
    assert.equal(await reopened.get("cloud", endpoint + "/"), "fixture-only-key");
    assert.equal(await reopened.get("local", endpoint), null);
    assert.equal(await reopened.get("cloud", "https://other.invalid/v1"), null);
    assert.equal(await reopened.get("cloud", "https://model.invalid/v2"), null);
    assert.throws(() => vault.set("cloud", "http://insecure.invalid/v1", "fixture-only-key"), /Invalid/);
    assert.throws(() => vault.set("cloud", endpoint, "bad\nkey"), /Invalid/);
    await assert.rejects(new ModelKeyVault(directory, { ...encryption, available: () => false }).set("cloud", endpoint, "another-key"), /encryption/);
    assert.equal(await reopened.get("cloud", endpoint), "fixture-only-key");
    await reopened.set("cloud", endpoint, null); assert.equal(await reopened.get("cloud", endpoint), null);
  } finally { if (!directory.startsWith(allowed + path.sep)) throw new Error("Unsafe key fixture cleanup"); await fs.rm(directory, { recursive: true, force: true }); }
});
