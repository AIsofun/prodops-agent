const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const root = path.resolve(__dirname, "../../..");
const build = process.env.PRODOPS_TEST_BUILD ?? path.resolve(__dirname, "../dist");
const { BusinessClient } = require(path.join(build, "main/business.js"));
const { EventStreams } = require(path.join(build, "main/events.js"));
const { LocalService, serviceLaunchOptions } = require(path.join(build, "main/service.js"));
const { createBusinessHandler, createEventsHandler } = require(path.join(build, "main/ipc.js"));
const { parseBusinessRequest, parseEventRequest, parseResult, validEventBatch } = require(path.join(build, "shared/business.js"));
const id = "44444444-4444-4444-8444-444444444444";
const other = "55555555-5555-4555-8555-555555555555";
const now = "2026-10-17T00:00:00Z";
const base = { port: 8765, mode: "local", token: "private-test-only-token-00000000000000", instance_id: id, deployment_id: id, process_id: 1 };
const scope = { connection_id: "development" };
const run = { run_id: id, deployment_id: id, workspace_id: id, conversation_id: id, status: "queued", resolution_status: "unknown",
  version: 1, last_event_seq: 1, created_at: now, updated_at: now, evidence: [], error: null, unknown_tool_call_ids: [] };
function json(response, status, body) { response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify(body)); }
function error(response, status) { json(response, status, { error: { code: "conflict", message: "private-server-detail", retryable: false }, request_id: id }); }
async function withServer(handler, action) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try { await action({ ...base, port: server.address().port }); }
  finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
}
function unbox(result) { assert.equal(result.ok, true, JSON.stringify(result)); return result.value; }
function event(seq, event_type = "run.created", override = {}) {
  return { schema_version: "1.1", run_id: id, seq, event_type, occurred_at: now,
    payload: event_type === "run.completed" ? { message_id: id, resolution_status: "unknown" } : { conversation_id: id }, ...override };
}
function frame(value) { return `id: ${value.seq}\nevent: ${value.event_type}\ndata: ${JSON.stringify(value)}\n\n`; }
async function collect(streams, runId, sub) {
  const events = [];
  for (let count = 0; count < 20; count++) {
    const batch = unbox(await streams.execute({ ...scope, operation: "read", run_id: runId, subscription_id: sub }));
    assert.ok(batch.events.length <= 8);
    events.push(...batch.events);
    if (batch.state !== "open") return { events, batch };
  }
  assert.fail("Stream did not reach a bounded final result");
}

test("real service supports authenticated conversation/task history, idempotency and bounded replay", async () => {
  const allowed = path.join(root, ".quality-reports");
  fs.mkdirSync(allowed, { recursive: true });
  const directory = fs.mkdtempSync(path.join(allowed, "business-test-"));
  const service = new LocalService(serviceLaunchOptions(false, root, root, directory));
  const client = new BusinessClient(() => service.getConnection());
  const streams = new EventStreams(() => service.getConnection());
  try {
    await service.start();
    const workspace = unbox(await client.execute({ ...scope, operation: "workspaces" })).items[0];
    const conversation = unbox(await client.execute({ ...scope, operation: "conversations.create", workspace_id: workspace.workspace_id, body: { title: "隔离桌面诊断" } }));
    const request = { ...scope, operation: "runs.submit", conversation_id: conversation.conversation_id, body: { content: "相机掉线", execution_mode: "mock" }, idempotency_key: randomUUID() };
    const submitted = unbox(await client.execute(request));
    assert.deepEqual(unbox(await client.execute(request)), submitted);
    assert.equal((await client.execute({ ...request, body: { ...request.body, content: "changed" } })).error.code, "conflict");
    const sub = unbox(await streams.execute({ ...scope, operation: "open", run_id: submitted.run_id, after_seq: 0 }));
    const result = await collect(streams, submitted.run_id, sub.subscription_id);
    assert.equal(result.batch.state, "ended");
    assert.deepEqual(result.events.map((item) => item.seq), Array.from({ length: result.events.length }, (_, index) => index + 1));
    const snapshot = unbox(await client.execute({ ...scope, operation: "runs.get", run_id: submitted.run_id }));
    assert.equal(snapshot.status, "succeeded"); assert.equal(snapshot.evidence.length, 3);
    assert.equal(snapshot.last_event_seq, result.batch.last_seq);
    const page = { limit: 1, cursor: null };
    assert.equal(unbox(await client.execute({ ...scope, operation: "conversations.list", workspace_id: workspace.workspace_id, page })).items.length, 1);
    assert.equal(unbox(await client.execute({ ...scope, operation: "runs.list", conversation_id: conversation.conversation_id, page })).items[0].run_id, submitted.run_id);
    assert.equal(unbox(await client.execute({ ...scope, operation: "messages.list", conversation_id: conversation.conversation_id, page })).items[0].role, "assistant");
    assert.equal(unbox(await client.execute({ ...scope, operation: "runs.cancel", run_id: submitted.run_id, body: {} })).status, "succeeded");
    assert.equal((await client.execute({ ...scope, operation: "runs.recover", run_id: submitted.run_id,
      body: { expected_version: snapshot.version, reviewed_tool_call_ids: [], decision: "retry_mock_reads" }, idempotency_key: randomUUID() })).error.code, "conflict");
    assert.equal((await client.execute({ ...scope, operation: "runs.get", run_id: randomUUID() })).error.code, "not_found");
    unbox(await streams.execute({ ...scope, operation: "close", run_id: submitted.run_id, subscription_id: sub.subscription_id }));
  } finally {
    streams.dispose(); client.dispose(); await service.stop();
    assert.ok(path.resolve(directory).startsWith(path.resolve(allowed) + path.sep));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("fixed routes preserve authentication/body/key and return safe errors without retry", async () => {
  const seen = [];
  await withServer((request, response) => {
    assert.equal(request.headers.authorization, `Bearer ${base.token}`);
    assert.equal(request.headers["x-prodops-protocol"], "1.4"); assert.equal(request.headers.origin, undefined);
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => { seen.push({ url: request.url, method: request.method, body: JSON.parse(body), key: request.headers["idempotency-key"] }); json(response, 202, run); });
  }, async (connection) => {
    const client = new BusinessClient(() => connection);
    try { unbox(await client.execute({ ...scope, operation: "runs.recover", run_id: id,
      body: { expected_version: 1, reviewed_tool_call_ids: [], decision: "retry_mock_reads" }, idempotency_key: other })); }
    finally { client.dispose(); }
  });
  assert.deepEqual(seen, [{ url: `/api/v1/runs/${id}/recover`, method: "POST", body: { expected_version: 1, reviewed_tool_call_ids: [], decision: "retry_mock_reads" }, key: other }]);
  for (const [status, code] of [[401, "unauthenticated"], [403, "forbidden"], [404, "not_found"], [409, "conflict"], [410, "cursor_expired"],
    [422, "invalid_request"], [426, "incompatible"], [429, "capacity"], [503, "not_ready"]]) {
    let count = 0;
    await withServer((_request, response) => { count++; error(response, status); }, async (connection) => {
      const client = new BusinessClient(() => connection);
      const result = await client.execute({ ...scope, operation: "runs.get", run_id: id });
      assert.equal(result.ok, false); assert.equal(result.error.request_id, id); assert.equal(result.error.code, code);
      assert.ok(!JSON.stringify(result).includes("private-server-detail")); client.dispose();
    });
    assert.equal(count, 1);
  }
});

test("malformed and cross-resource/deployment responses and redirects cannot cross IPC", async () => {
  for (const value of [{ ...run, secret: "private-value" }, { ...run, run_id: other }, { ...run, deployment_id: other }, { ...run, version: "1" }, {}]) {
    await withServer((_request, response) => json(response, 200, value), async (connection) => {
      const client = new BusinessClient(() => connection);
      assert.equal((await client.execute({ ...scope, operation: "runs.get", run_id: id })).error.code, "invalid_response"); client.dispose();
    });
  }
  await withServer((_request, response) => { response.writeHead(302, { "Content-Type": "application/json", Location: "http://attacker.example" }); response.end("{}"); }, async (connection) => {
    const client = new BusinessClient(() => connection);
    assert.equal((await client.execute({ ...scope, operation: "workspaces" })).error.code, "invalid_response"); client.dispose();
  });
});

test("business concurrency, total response timeout, response size and connection change stay bounded", async () => {
  await withServer(() => {}, async (connection) => {
    const client = new BusinessClient(() => connection, 50);
    const pending = Array.from({ length: 8 }, () => client.execute({ ...scope, operation: "workspaces" }));
    assert.equal((await client.execute({ ...scope, operation: "workspaces" })).error.code, "capacity");
    assert.ok((await Promise.all(pending)).every((item) => item.error.code === "offline")); client.dispose();
  });
  await withServer((_request, response) => { response.writeHead(200, { "Content-Type": "application/json" }); response.end("x".repeat(4 * 1024 * 1024 + 1)); }, async (connection) => {
    const client = new BusinessClient(() => connection);
    assert.equal((await client.execute({ ...scope, operation: "workspaces" })).error.code, "invalid_response"); client.dispose();
  });
  let active;
  await withServer((_request, response) => { active = { ...active, instance_id: other }; json(response, 200, { items: [] }); }, async (connection) => {
    active = connection;
    const client = new BusinessClient(() => active);
    assert.equal((await client.execute({ ...scope, operation: "workspaces" })).error.code, "not_ready"); client.dispose();
  });
});

test("business/event IPC refuse foreign windows/subframes/stale URLs and invalid input before network", async () => {
  let calls = 0;
  const contents = { mainFrame: { url: "file:///app/index.html" }, getURL: () => "file:///app/index.html" };
  const window = { isDestroyed: () => false, webContents: contents };
  const trusted = { sender: contents, senderFrame: contents.mainFrame };
  for (const handler of [createBusinessHandler(() => window, { execute: async () => { calls++; } }), createEventsHandler(() => window, { execute: async () => { calls++; } })]) {
    for (const event of [{ ...trusted, sender: {} }, { ...trusted, senderFrame: {} }, { ...trusted, senderFrame: null }]) await assert.rejects(handler(event, {}), /Untrusted/);
    contents.mainFrame.url = "file:///stale.html";
    await assert.rejects(handler(trusted, {}), /Untrusted/); contents.mainFrame.url = contents.getURL();
    await assert.rejects(handler(trusted, { ...scope, operation: "workspaces", url: "http://attacker.example" }), /Invalid/);
  }
  for (const input of [{ ...scope, operation: "runs.get", run_id: "../bad" }, { ...scope, operation: "runs.submit", conversation_id: id, body: { content: "x", execution_mode: "real" }, idempotency_key: id },
    { ...scope, operation: "conversations.list", workspace_id: id, page: { limit: 101, cursor: null } }]) assert.throws(() => parseBusinessRequest(input), /Invalid/);
  assert.throws(() => parseEventRequest({ ...scope, operation: "open", run_id: id, after_seq: Number.MAX_SAFE_INTEGER + 1 }), /Invalid/);
  assert.throws(() => parseResult({ ok: false, error: { code: "offline", request_id: null, secret: "private" } }, validEventBatch), /Invalid/);
  assert.equal(parseBusinessRequest({ ...scope, operation: "runs.get", run_id: "abcdefab-cdef-4abc-8abc-abcdefabcdef".toUpperCase() }).run_id, "abcdefab-cdef-4abc-8abc-abcdefabcdef");
  assert.equal(validEventBatch({ events: [event(1)], last_seq: 2, state: "open" }), false);
  assert.equal(calls, 0);
});

test("SSE parses split frames, discards duplicate replay and ends only on a terminal event", async () => {
  const wire = frame(event(1)) + frame(event(1)) + frame(event(2, "run.completed"));
  await withServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.write(wire.slice(0, 17)); setImmediate(() => response.end(wire.slice(17)));
  }, async (connection) => {
    const streams = new EventStreams(() => connection);
    try {
      const sub = unbox(await streams.execute({ ...scope, operation: "open", run_id: id, after_seq: 0 }));
      const result = await collect(streams, id, sub.subscription_id);
      assert.deepEqual(result.events.map((item) => item.seq), [1, 2]);
      assert.equal(result.batch.state, "ended"); assert.equal(result.batch.last_seq, 2);
    } finally { streams.dispose(); }
  });
});

test("SSE rejects gaps, wrong run/payload, oversized frames, stream errors and queue overflow", async () => {
  const cases = [
    [frame(event(2)), "gap", 0], [frame(event(1, "run.created", { run_id: other })), "invalid_response", 0],
    [frame(event(1, "run.created", { payload: { reason: "wrong" } })), "invalid_response", 0],
    ["data: " + "x".repeat(131073), "overflow", 0],
    [`event: stream.error\ndata: ${JSON.stringify({ error: { code: "cursor_expired", message: "private-server-detail", retryable: false }, request_id: id })}\n\n`, "cursor_expired", 0],
    [Array.from({ length: 33 }, (_, index) => frame(event(index + 1))).join(""), "overflow", 32],
    [frame(event(1)), "offline", 1],
  ];
  for (const [wire, state, count] of cases) await withServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/event-stream" }); response.end(wire);
  }, async (connection) => {
    const streams = new EventStreams(() => connection);
    try {
      const sub = unbox(await streams.execute({ ...scope, operation: "open", run_id: id, after_seq: 0 }));
      const result = await collect(streams, id, sub.subscription_id);
      assert.equal(result.batch.state, state); assert.equal(result.events.length, count); assert.equal(result.batch.last_seq, count);
      assert.ok(!JSON.stringify(result).includes("private-server-detail"));
    } finally { streams.dispose(); }
  });
});

test("subscriptions bind task/connection, cap ownership and release pending reads on close", async () => {
  await withServer((request, response) => {
    assert.equal(request.headers.authorization, `Bearer ${base.token}`); assert.equal(request.headers["last-event-id"], "7");
    response.writeHead(200, { "Content-Type": "text/event-stream" }); response.write(": heartbeat\n\n");
  }, async (connection) => {
    let active = connection;
    const streams = new EventStreams(() => active);
    try {
      const subs = [];
      for (let i = 0; i < 4; i++) subs.push(unbox(await streams.execute({ ...scope, operation: "open", run_id: id, after_seq: 7 })).subscription_id);
      assert.equal((await streams.execute({ ...scope, operation: "open", run_id: id, after_seq: 7 })).error.code, "capacity");
      assert.equal((await streams.execute({ ...scope, operation: "read", run_id: other, subscription_id: subs[0] })).error.code, "not_found");
      const pending = streams.execute({ ...scope, operation: "read", run_id: id, subscription_id: subs[0] });
      assert.equal((await streams.execute({ ...scope, operation: "read", run_id: id, subscription_id: subs[0] })).error.code, "capacity");
      unbox(await streams.execute({ ...scope, operation: "close", run_id: id, subscription_id: subs[0] }));
      assert.equal(unbox(await pending).state, "closed");
      active = { ...connection, instance_id: other };
      assert.equal(unbox(await streams.execute({ ...scope, operation: "read", run_id: id, subscription_id: subs[1] })).state, "closed");
    } finally { streams.dispose(); }
  });
  await withServer((_request, response) => error(response, 426), async (connection) => {
    const streams = new EventStreams(() => connection);
    assert.equal((await streams.execute({ ...scope, operation: "open", run_id: id, after_seq: 0 })).error.code, "incompatible"); streams.dispose();
  });
});

test("disposing a window releases business requests and event opens before response headers", { timeout: 5000 }, async () => {
  await withServer(() => {}, async (connection) => {
    const client = new BusinessClient(() => connection);
    const pending = client.execute({ ...scope, operation: "workspaces" });
    client.dispose();
    assert.equal((await pending).error.code, "not_ready");
    const streams = new EventStreams(() => connection);
    const opening = streams.execute({ ...scope, operation: "open", run_id: id, after_seq: 0 });
    streams.dispose();
    assert.equal((await opening).error.code, "not_ready");
  });
});
