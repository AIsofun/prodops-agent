const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const build = process.env.PRODOPS_TEST_BUILD ?? path.resolve(__dirname, "../dist");
const { developmentConnection, getConnectionStatus } = require(path.join(build, "main/connection.js"));
const { createStatusHandler } = require(path.join(build, "main/ipc.js"));
const { parseConnectionStatus, validateStatusRequest } = require(path.join(build, "shared/connection.js"));
const { validateHealth, validateCapabilities } = require("../../../packages/api-client/src/validators.cjs");

const id = "44444444-4444-4444-8444-444444444444";
const healthy = { status: "ready", mode: "local", scope: "service_skeleton" };
const capable = { protocol_version: "1.2", event_schema_version: "1.0", deployment_id: id,
  mode: "local", scope: "service_skeleton", authentication: "unavailable", conversations: false, runs: false, event_stream: false };
const ready = { connection_id: "development", mode: "local", state: "ready", deployment_id: id, protocol_version: "1.2" };

async function withServer(handler, action) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try { await action({ port: server.address().port, mode: "local" }); }
  finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
}
function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

test("main-only configuration cannot contain a URL, credentials or invalid port", () => {
  assert.deepEqual(developmentConnection({}), { port: 8765, mode: "local" });
  for (const port of ["0", "65536", "-1", "1.5", "http://attacker.example", "secret-value"]) {
    assert.throws(() => developmentConnection({ PRODOPS_SERVICE_PORT: port }), /Invalid development connection/);
  }
  assert.throws(() => developmentConnection({ PRODOPS_SERVICE_MODE: "secret-value" }), /Invalid development connection/);
});

test("read-only requests use fixed paths and version header then return validated ready data", async () => {
  const paths = [];
  await withServer((request, response) => {
    assert.equal(request.method, "GET");
    assert.equal(request.headers["x-prodops-protocol"], "1.2");
    paths.push(request.url);
    json(response, 200, request.url === "/health/ready" ? healthy : capable);
  }, async (connection) => assert.deepEqual(await getConnectionStatus(connection), ready));
  assert.deepEqual(paths, ["/health/ready", "/api/v1/capabilities"]);
});

test("service not ready is distinct from offline and does not fetch capabilities", async () => {
  let calls = 0;
  await withServer((_request, response) => { calls++; json(response, 503, { ...healthy, status: "not_ready" }); },
    async (connection) => assert.equal((await getConnectionStatus(connection)).state, "not_ready"));
  assert.equal(calls, 1);
});

test("incompatible HTTP status and explicit unsupported protocol are distinguished", async () => {
  for (const httpStatus of [200, 426]) {
    await withServer((request, response) => json(response, request.url === "/health/ready" ? 200 : httpStatus,
      request.url === "/health/ready" ? healthy : { ...capable, protocol_version: "2.0" }),
    async (connection) => assert.equal((await getConnectionStatus(connection)).state, "incompatible"));
  }
});

test("invalid service DTOs, wrong modes and secret extra fields cannot cross the boundary", async () => {
  for (const body of [{ ...capable, deployment_id: "invalid" }, { ...capable, mode: "server" },
    { ...capable, secret: "credential-value" }, { ...capable, runs: "true" }, {}]) {
    await withServer((request, response) => json(response, 200, request.url === "/health/ready" ? healthy : body),
      async (connection) => {
        const status = await getConnectionStatus(connection);
        assert.equal(status.state, "invalid_response");
        assert.ok(!JSON.stringify(status).includes("credential-value"));
      });
  }
});

test("redirects are rejected without following arbitrary targets", async () => {
  let targetCalls = 0;
  await withServer((_request, response) => { targetCalls++; json(response, 200, healthy); }, async (target) => {
    await withServer((_request, response) => {
      response.writeHead(302, { "Content-Type": "application/json", Location: `http://127.0.0.1:${target.port}/other` });
      response.end("{}");
    }, async (connection) => assert.equal((await getConnectionStatus(connection)).state, "invalid_response"));
  });
  assert.equal(targetCalls, 0);
});

test("timeouts do not retry and cannot leave the caller waiting indefinitely", async () => {
  let calls = 0;
  await withServer(() => { calls++; }, async (connection) => {
    assert.equal((await getConnectionStatus(connection, 30)).state, "offline");
  });
  assert.equal(calls, 1);
});

test("oversized, malformed and non-JSON responses are rejected", async () => {
  for (const [type, body] of [["application/json", "x".repeat(32769)], ["application/json", "invalid"], ["text/plain", "{}"]]) {
    await withServer((_request, response) => { response.writeHead(200, { "Content-Type": type }); response.end(body); },
      async (connection) => assert.equal((await getConnectionStatus(connection)).state, "invalid_response"));
  }
});

function sender() {
  const frame = { url: "file:///trusted/index.html" };
  const contents = { mainFrame: frame, getURL: () => frame.url };
  return { window: { isDestroyed: () => false, webContents: contents }, event: { sender: contents, senderFrame: frame } };
}

test("IPC refuses malformed input before any network request", async () => {
  const target = sender();
  let calls = 0;
  const handler = createStatusHandler(() => target.window, async () => { calls++; return ready; });
  for (const request of [null, [], {}, { connection_id: "other" }, { connection_id: "development", url: "http://attacker.example" }]) {
    await assert.rejects(handler(target.event, request), /Invalid connection request/);
  }
  assert.equal(calls, 0);
});

test("IPC refuses another window, a subframe, a missing frame and a closed window", async () => {
  const target = sender();
  let calls = 0;
  const handler = createStatusHandler(() => target.window, async () => { calls++; return ready; });
  for (const event of [{ ...target.event, sender: {} }, { ...target.event, senderFrame: { url: target.event.senderFrame.url } }, { ...target.event, senderFrame: null }]) {
    await assert.rejects(handler(event, { connection_id: "development" }), /Untrusted connection request/);
  }
  target.window.isDestroyed = () => true;
  await assert.rejects(handler(target.event, { connection_id: "development" }), /Untrusted connection request/);
  assert.equal(calls, 0);
});

test("concurrent status reads share only the current in-flight request", async () => {
  const target = sender();
  let calls = 0;
  const handler = createStatusHandler(() => target.window, async () => {
    calls++; await new Promise((resolve) => setTimeout(resolve, 10)); return ready;
  });
  const request = { connection_id: "development" };
  assert.deepEqual(await Promise.all([handler(target.event, request), handler(target.event, request)]), [ready, ready]);
  assert.equal(calls, 1);
  await handler(target.event, request);
  assert.equal(calls, 2);
});

test("preload response validation rejects unknown fields and invalid state combinations", () => {
  assert.deepEqual(parseConnectionStatus(ready), ready);
  validateStatusRequest({ connection_id: "development" });
  for (const response of [null, { ...ready, token: "credential-value" }, { ...ready, state: "arbitrary" },
    { ...ready, deployment_id: null }, { ...ready, protocol_version: "2.0" }, { ...ready, mode: { value: "local" } }]) {
    assert.throws(() => parseConnectionStatus(response), /Invalid connection response/);
  }
});

test("generated HTTP validators enforce the actual schema without type coercion", () => {
  assert.equal(validateHealth(healthy), true);
  assert.equal(validateCapabilities(capable), true);
  assert.equal(validateHealth({ ...healthy, token: "secret" }), false);
  assert.equal(validateCapabilities({ ...capable, deployment_id: "invalid" }), false);
  assert.equal(validateCapabilities({ ...capable, runs: "false" }), false);
});
