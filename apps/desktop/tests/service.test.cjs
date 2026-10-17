const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const root = path.resolve(__dirname, "../../..");
const build = process.env.PRODOPS_TEST_BUILD ?? path.resolve(__dirname, "../dist");
const { LocalService, serviceLaunchOptions } = require(path.join(build, "main/service.js"));

async function isolated(action) {
  const allowed = path.join(root, ".quality-reports");
  fs.mkdirSync(allowed, { recursive: true });
  const directory = fs.mkdtempSync(path.join(allowed, "service-test-"));
  try { await action(directory); }
  finally {
    const target = path.resolve(directory);
    assert.ok(target.startsWith(path.resolve(allowed) + path.sep));
    fs.rmSync(target, { recursive: true, force: true });
  }
}
function read(connection, token = connection.token) {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: "127.0.0.1", port: connection.port, path: "/api/v1/workspaces",
      headers: { Authorization: `Bearer ${token}`, "X-ProdOps-Protocol": "1.4" } }, (response) => {
      let body = "";
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body: JSON.parse(body) }));
      response.on("error", reject);
    });
    request.setTimeout(2000, () => request.destroy(new Error("test request timeout")));
    request.on("error", reject);
  });
}

test("owned Python startup authenticates privately, rotates tokens and preserves deployment identity", async () => {
  await isolated(async (directory) => {
    const options = serviceLaunchOptions(false, root, root, directory);
    const service = new LocalService(options);
    let first;
    try {
      const startup = service.start();
      assert.equal(service.start(), startup);
      first = await startup;
      assert.equal((await read(first)).status, 200);
      assert.equal((await read(first, "wrong-test-token")).status, 401);
      const status = await service.getStatus();
      assert.equal(status.state, "ready");
      assert.equal(status.deployment_id, first.deployment_id);
      assert.equal(Object.keys(status).sort().join(","), "connection_id,deployment_id,mode,protocol_version,state");
      assert.ok(!JSON.stringify(status).includes(first.token));
      assert.ok(!service.child.spawnargs.join(" ").includes(first.token));
    } finally { await service.stop(); }
    assert.equal((await service.getStatus()).state, "offline");
    await assert.rejects(read(first));
    const restarted = new LocalService(options);
    try {
      const second = await restarted.start();
      assert.equal(second.deployment_id, first.deployment_id);
      assert.notEqual(second.instance_id, first.instance_id);
      assert.notEqual(second.token, first.token);
      assert.equal((await read(second, first.token)).status, 401);
    } finally { await restarted.stop(); }
  });
});

test("packaged and development entry locations are explicit and never depend on current directory", () => {
  const options = serviceLaunchOptions(true, path.join(root, "bundle"), root, path.join(root, "data"));
  assert.equal(options.executable, path.join(root, "bundle/agent/prodops-agent.exe"));
  assert.deepEqual(options.args, []);
  assert.equal(options.databasePath, path.join(root, "data/agent/prodops.sqlite3"));
  assert.throws(() => new LocalService({ ...options, executable: "relative.exe" }), /Invalid local service configuration/);
});

test("malformed, wrong-instance and wrong-protocol startup messages fail closed without retrying", async () => {
  await isolated(async (directory) => {
    for (const override of [{ instance_id: "44444444-4444-4444-8444-444444444444" }, { protocol_version: "2.0" },
      { host: "192.168.1.2" }, { port: 0 }, { secret: "private-value" }]) {
      const script = `process.stdin.once('data', chunk => {
        const input=JSON.parse(chunk.toString());
        process.stdout.write(JSON.stringify({type:'ready',startup_version:'1.0',instance_id:input.instance_id,
          process_id:process.pid,parent_process_id:process.ppid,host:'127.0.0.1',port:8765,
          deployment_id:'55555555-5555-4555-8555-555555555555',protocol_version:'1.4',event_schema_version:'1.1',mode:'local',
          ...${JSON.stringify(override)}})+'\\n');
        setInterval(()=>{},1000);
      });`;
      const service = new LocalService({ executable: process.execPath, args: ["-e", script], cwd: root,
        databasePath: path.join(directory, "invalid.sqlite3"), startupTimeoutMs: 5000, shutdownTimeoutMs: 20 });
      await assert.rejects(service.start(), /Local service could not start/);
      assert.equal((await service.getStatus()).state, "invalid_response");
      assert.notEqual(service.child.exitCode, null);
      await assert.rejects(service.start(), /stopped/);
      await service.stop();
    }
    assert.equal(fs.existsSync(path.join(directory, "invalid.sqlite3")), false);
  });
});

test("startup timeout and missing executable terminate only the owned child and expose safe state", async () => {
  await isolated(async (directory) => {
    const hanging = new LocalService({ executable: process.execPath, args: ["-e", "process.stdin.resume();setInterval(()=>{},1000)"],
      cwd: root, databasePath: path.join(directory, "timeout.sqlite3"), startupTimeoutMs: 50, shutdownTimeoutMs: 20 });
    await assert.rejects(hanging.start(), /Local service could not start/);
    assert.notEqual(hanging.child.exitCode, null);
    assert.equal((await hanging.getStatus()).state, "offline");
    const missing = new LocalService({ executable: path.join(directory, "missing.exe"), args: [], cwd: root,
      databasePath: path.join(directory, "missing.sqlite3"), startupTimeoutMs: 1000, shutdownTimeoutMs: 20 });
    await assert.rejects(missing.start(), /Local service could not start/);
    assert.equal((await missing.getStatus()).state, "offline");
  });
});
