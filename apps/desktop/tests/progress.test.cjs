const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const build = process.env.PRODOPS_TEST_BUILD ?? path.resolve(__dirname, "../dist");
const { ProgressSession } = require(path.join(build, "shared/progress.js"));
const id = "44444444-4444-4444-8444-444444444444";
const other = "55555555-5555-4555-8555-555555555555";
const now = "2026-10-17T00:00:00Z";
const initial = { run_id: id, deployment_id: id, workspace_id: id, conversation_id: id, status: "queued", resolution_status: "unknown",
  version: 1, last_event_seq: 1, created_at: now, updated_at: now, evidence: [], error: null, unknown_tool_call_ids: [] };
const ok = value => ({ ok: true, value });
const fail = code => ({ ok: false, error: { code, request_id: null } });
function event(seq, terminal = false) {
  return { schema_version: "1.1", run_id: id, seq, event_type: terminal ? "run.completed" : "run.created", occurred_at: now,
    payload: terminal ? { message_id: id, resolution_status: "unknown" } : { conversation_id: id } };
}
function recorded() {
  const record = { states: [], events: [], snapshots: [], finished: [], failures: [] };
  return { record, hooks: { state: value => record.states.push(value), events: items => record.events.push(...items),
    snapshot: (value, reset) => record.snapshots.push({ value, reset }), finished: async value => { record.finished.push(value); }, failure: code => record.failures.push(code) } };
}

test("network loss resumes the delivered watermark, deduplicates replay and never fabricates task failure", async () => {
  const { record, hooks } = recorded();
  const opens = [], closes = [];
  const batches = [
    { events: [event(1)], last_seq: 1, state: "offline" },
    { events: [event(1)], last_seq: 1, state: "open" },
    { events: [event(2, true)], last_seq: 2, state: "ended" },
  ];
  let current = initial;
  const session = new ProgressSession({ open: async (_id, after) => { opens.push(after); return ok({ subscription_id: id }); },
    read: async () => { const batch = batches.shift(); current = { ...initial, status: batch.state === "ended" ? "succeeded" : "running", last_event_seq: batch.last_seq }; return ok(batch); },
    close: async (_id, sub) => { closes.push(sub); return ok(null); }, snapshot: async () => ok(current) }, initial, hooks, [1, 1]);
  await session.run();
  assert.deepEqual(opens, [0, 1]); assert.deepEqual(record.events.map(item => item.seq), [1, 2]);
  assert.equal(session.lastSeq, 2); assert.equal(record.finished[0].status, "succeeded");
  assert.ok(record.states.includes("reconnecting")); assert.ok(record.snapshots.every(item => item.value.status !== "failed"));
  assert.equal(record.failures.length, 0); assert.equal(closes.length, 2);
});

test("sequence gaps restore a scoped snapshot before opening its new watermark", async () => {
  const { record, hooks } = recorded();
  const opens = [];
  let reads = 0, snapshots = 0;
  const session = new ProgressSession({ open: async (_id, after) => { opens.push(after); return ok({ subscription_id: id }); },
    read: async () => ok(++reads === 1 ? { events: [event(3)], last_seq: 3, state: "open" } : { events: [event(6, true)], last_seq: 6, state: "ended" }),
    close: async () => ok(null), snapshot: async () => ok({ ...initial, status: ++snapshots === 1 ? "running" : "succeeded", last_event_seq: snapshots === 1 ? 5 : 6 }) }, initial, hooks, [1]);
  await session.run();
  assert.deepEqual(opens, [0, 5]); assert.equal(record.snapshots[0].reset, true);
  assert.deepEqual(record.events.map(item => item.seq), [6]); assert.ok(record.states.includes("restoring"));
  assert.equal(record.failures.length, 0);
});

test("expired cursor can recover a complete terminal snapshot without replaying unavailable history", async () => {
  const { record, hooks } = recorded();
  let opens = 0;
  const session = new ProgressSession({ open: async () => { opens++; return fail("cursor_expired"); }, read: async () => assert.fail("No read expected"),
    close: async () => ok(null), snapshot: async () => ok({ ...initial, status: "succeeded", last_event_seq: 7 }) }, initial, hooks, [1]);
  await session.run(); assert.equal(opens, 1); assert.equal(session.lastSeq, 7);
  assert.equal(record.snapshots[0].reset, true); assert.equal(record.finished.length, 1); assert.equal(record.failures.length, 0);
});

test("connection identity change and incompatible protocols stop without retrying business operations", async () => {
  for (const incompatible of [false, true]) {
    const { record, hooks } = recorded(); let opens = 0;
    const session = new ProgressSession({ open: async () => { opens++; return incompatible ? fail("incompatible") : fail("cursor_expired"); },
      read: async () => assert.fail("No read expected"), close: async () => ok(null),
      snapshot: async () => ok({ ...initial, deployment_id: other }) }, initial, hooks, [1, 1]);
    await session.run(); assert.equal(opens, 1);
    assert.deepEqual(record.failures, [incompatible ? "incompatible" : "invalid_response"]);
    assert.equal(record.events.length, 0); assert.equal(record.snapshots.length, 0);
  }
});

test("reconnect exhaustion is bounded and stops waiting when the owning view closes", async () => {
  const { record, hooks } = recorded(); let opens = 0;
  const transport = { open: async () => { opens++; return fail("not_ready"); }, read: async () => assert.fail("No read expected"), close: async () => ok(null), snapshot: async () => ok(initial) };
  await new ProgressSession(transport, initial, hooks, [1, 1]).run();
  assert.equal(opens, 3); assert.deepEqual(record.failures, ["not_ready"]);
  const stopped = recorded();
  const session = new ProgressSession(transport, initial, stopped.hooks, [5000]);
  const completion = session.run();
  await new Promise(resolve => setImmediate(resolve)); session.stop(); await completion;
  assert.equal(stopped.record.failures.length, 0);
});

test("closing a view releases a pending event read and drops late frames", async () => {
  const { record, hooks } = recorded(); let finishRead;
  const session = new ProgressSession({ open: async () => ok({ subscription_id: id }),
    read: async () => new Promise(resolve => { finishRead = resolve; }), close: async () => { finishRead?.(ok({ events: [event(1)], last_seq: 1, state: "closed" })); return ok(null); },
    snapshot: async () => ok(initial) }, initial, hooks, [1]);
  const completion = session.run(); await new Promise(resolve => setImmediate(resolve));
  session.stop(); await completion; assert.equal(record.events.length, 0); assert.equal(record.failures.length, 0);
});
