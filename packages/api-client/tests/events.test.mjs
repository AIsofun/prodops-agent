import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { RunEventCursor } from "../src/events.ts";

const sample = JSON.parse(fs.readFileSync(new URL("../../../contracts/examples.json", import.meta.url), "utf8")).events[0];
const frame = (event) => ({ id: String(event.seq), event: event.event_type, data: JSON.stringify(event) });

test("committed events advance a bounded cursor and duplicate replay is ignored", () => {
  const cursor = new RunEventCursor(sample.run_id, 0);
  assert.deepEqual(cursor.accept(frame(sample)), sample);
  assert.equal(cursor.accept(frame(sample)), null);
  assert.equal(cursor.lastSeq, 1);
  assert.equal(cursor.accept(frame({ ...sample, seq: 2 })).seq, 2);
});
test("a snapshot watermark joins replay and refuses gaps without advancing", () => {
  const cursor = new RunEventCursor(sample.run_id, 5);
  assert.equal(cursor.accept(frame({ ...sample, seq: 5 })), null);
  assert.throws(() => cursor.accept(frame({ ...sample, seq: 7 })), /Event gap/);
  assert.equal(cursor.lastSeq, 5);
  assert.equal(cursor.accept(frame({ ...sample, seq: 6 })).seq, 6);
});
test("wrong run, malformed data, payload mismatch and unsafe sequence cannot enter the cursor", () => {
  const cursor = new RunEventCursor(sample.run_id, 0);
  for (const value of [{ ...sample, run_id: "44444444-4444-4444-8444-444444444444" },
    { ...sample, seq: "1" }, { ...sample, seq: true }, { ...sample, seq: 9007199254740992 },
    { ...sample, payload: { secret: "private-value" } }, { ...sample, schema_version: "2.0" },
    { ...sample, occurred_at: "2026-10-17T08:00:00+08:00" }, { ...sample, occurred_at: 1792137600 }]) {
    assert.throws(() => cursor.accept(frame(value)), /Invalid event frame/);
  }
  for (const invalid of [null, [], {}, { ...frame(sample), extra: "private" }, { ...frame(sample), id: "01" }, { ...frame(sample), id: "2" },
    { ...frame(sample), data: "private-invalid-json" }, { ...frame(sample), event: "other" },
    { ...frame(sample), data: "x".repeat(131073) }]) assert.throws(() => cursor.accept(invalid), /Invalid event frame/);
  assert.equal(cursor.lastSeq, 0);
});
test("cursor initialization rejects unsafe bounds and another connection needs a fresh cursor", () => {
  for (const seq of [-1, 1.5, NaN, 9007199254740992]) assert.throws(() => new RunEventCursor(sample.run_id, seq));
  assert.throws(() => new RunEventCursor("invalid", 0));
  assert.equal(new RunEventCursor(sample.run_id, 0).lastSeq, 0);
});
test("generated validator reads all legacy and current variants with explicit schema compatibility", () => {
  const samples = JSON.parse(fs.readFileSync(new URL("../../../contracts/examples.json", import.meta.url), "utf8")).events;
  for (const event of samples) assert.deepEqual(new RunEventCursor(event.run_id, event.seq - 1).accept(frame(event)), event);
  const approved = samples.find((event) => event.event_type === "run.recovery_approved");
  assert.throws(() => new RunEventCursor(approved.run_id, approved.seq - 1).accept(frame({ ...approved, schema_version: "1.0" })), /Invalid event frame/);
});
