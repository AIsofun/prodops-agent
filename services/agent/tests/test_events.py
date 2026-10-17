"""Committed replay, SSE boundaries and actual loopback disconnect/reconnect."""

from __future__ import annotations

import asyncio
from collections.abc import Iterator
from contextlib import closing, contextmanager
import json
import os
from pathlib import Path
import queue
import re
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
from typing import Any
import unittest
from unittest.mock import AsyncMock, Mock, patch
from urllib.error import HTTPError
from urllib.request import ProxyHandler, Request, build_opener
from uuid import UUID, uuid4

from fastapi import Request as APIRequest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from prodops.adapters.storage.events import SQLiteEventStore
from prodops.adapters.storage.models import RunEventRow, RunRow
from prodops.api.stream import event_stream
from prodops.application.errors import CursorExpired, InvalidCursor, StorageFailure
from prodops.application.tasks import TaskService
from prodops.bootstrap.app import create_app
from prodops.bootstrap.config import ServiceSettings
from prodops.domain.execution import ExecutionPolicy, Observation, ToolRequest

TOKEN = "test-only-sse-token-00000000000000000000"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "X-ProdOps-Protocol": "1.4"}


def parse_frames(text: str) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for frame in text.split("\n\n"):
        fields = dict(line.split(": ", 1) for line in frame.splitlines() if ": " in line and not line.startswith(":"))
        if "data" in fields:
            data = json.loads(fields["data"])
            if "id" in fields:
                assert int(fields["id"]) == data["seq"]
                assert fields["event"] == data["event_type"]
            result.append(data)
    return result


class EventTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory(prefix="prodops-events-")
        self.database = Path(self.directory.name) / "events.sqlite3"
        self.store = SQLiteEventStore(self.database, ExecutionPolicy(max_tool_calls=100))
        await self.store.start()
        conversation = await self.store.create_conversation("SSE fixture")
        self.run_id = (await self.store.submit_run(conversation.conversation_id, "camera", "development", uuid4())).run.run_id
        self.service = TaskService(self.store)
        self.request = Mock(spec=APIRequest)
        self.request.is_disconnected = AsyncMock(return_value=False)

    async def asyncTearDown(self) -> None:
        await self.store.close()
        self.directory.cleanup()

    async def finish(self, calls: int = 0) -> None:
        lease = await self.store.claim(uuid4())
        assert lease is not None
        for index in range(calls):
            lease, call_id = await self.store.begin_tool(lease, ToolRequest("mock.read_metrics", "camera_offline"), index * 0.01)
            lease = await self.store.finish_tool(lease, call_id, Observation("mock://event-fixture", "Explicit fixture result"), index * 0.01 + 0.001)
        await self.store.complete(lease, "【模拟】完整回复，故障恢复未知。", calls * 0.01 + 0.002)

    async def test_terminal_stream_pages_join_snapshot_watermark_and_close(self) -> None:
        await self.finish(15)
        snapshot = await self.store.get_run(self.run_id)
        assert snapshot is not None
        response = await event_stream(self.service, self.run_id, 1, self.request, lambda: True)
        chunks = [str(chunk) async for chunk in response.body_iterator]
        events = parse_frames("".join(chunks))
        self.assertEqual([event["seq"] for event in events], list(range(2, snapshot.last_event_seq + 1)))
        self.assertGreater(len(events), 32)
        self.assertEqual(events[-1]["event_type"], "run.completed")
        page = await self.store.read_events(self.run_id, 0, 32)
        self.assertEqual(len(page.items), 32)
        empty = await event_stream(self.service, self.run_id, snapshot.last_event_seq, self.request, lambda: True)
        self.assertEqual([chunk async for chunk in empty.body_iterator], [])

    async def test_reader_never_observes_an_uncommitted_event_or_watermark(self) -> None:
        async with self.store.transaction(write=True) as session:
            row = await session.get(RunRow, str(self.run_id))
            assert row is not None
            row.last_event_seq, row.version = 2, 2
            session.add(RunEventRow(run_id=row.id, seq=2, schema_version="1.1", event_type="run.started", occurred_at=row.created_at, payload={"attempt_id": str(uuid4())}))
            await session.flush()
            before = await self.store.read_events(self.run_id, 1, 32)
            self.assertEqual((before.items, before.last_event_seq), ((), 1))
        after = await self.store.read_events(self.run_id, 1, 32)
        self.assertEqual(([item.seq for item in after.items], after.last_event_seq), ([2], 2))

    async def test_heartbeat_and_disconnect_do_not_create_business_events(self) -> None:
        response = await event_stream(self.service, self.run_id, 1, self.request, lambda: True)
        with patch("prodops.api.stream.HEARTBEAT_SECONDS", 0.01), patch("prodops.api.stream.POLL_SECONDS", 0.005):
            frame = await asyncio.wait_for(anext(aiter(response.body_iterator)), 1)
            self.assertEqual(frame, ": heartbeat\n\n")
            self.request.is_disconnected.return_value = True
            with self.assertRaises(StopAsyncIteration):
                await anext(aiter(response.body_iterator))
        run = await self.store.get_run(self.run_id)
        assert run is not None
        self.assertEqual((run.status, run.last_event_seq), ("queued", 1))

    async def test_post_header_storage_failure_is_sanitized_and_has_no_event_id(self) -> None:
        page = await self.store.read_events(self.run_id, 0, 32)
        with patch.object(self.store, "read_events", new=AsyncMock(side_effect=[page, StorageFailure("private-storage-detail")])):
            response = await event_stream(self.service, self.run_id, 0, self.request, lambda: True)
            self.assertIn("id: 1\n", str(await anext(aiter(response.body_iterator))))
            failure = str(await anext(aiter(response.body_iterator)))
            self.assertIn("event: stream.error", failure)
            self.assertNotIn("id:", failure)
            self.assertNotIn("private-storage-detail", failure)
            self.assertEqual(parse_frames(failure)[0]["error"]["code"], "not_ready")
            self.assertEqual(parse_frames(failure)[0]["request_id"], response.headers["x-request-id"])
            with self.assertRaises(StopAsyncIteration):
                await anext(aiter(response.body_iterator))

    async def test_cursor_expiration_after_headers_emits_error_without_advancing_cursor(self) -> None:
        page = await self.store.read_events(self.run_id, 0, 32)
        with patch.object(self.store, "read_events", new=AsyncMock(side_effect=[page, CursorExpired()])):
            response = await event_stream(self.service, self.run_id, 0, self.request, lambda: True)
            await anext(aiter(response.body_iterator))
            failure = str(await anext(aiter(response.body_iterator)))
            self.assertEqual(parse_frames(failure)[0]["error"]["code"], "cursor_expired")
            self.assertNotIn("id:", failure)

    async def test_retention_floor_and_invalid_future_cursor_fail_before_stream(self) -> None:
        await self.finish()
        with self.assertRaises(InvalidCursor):
            await self.store.read_events(self.run_id, 999, 32)
        async with self.store.transaction(write=True) as session:
            await session.execute(delete(RunEventRow).where(RunEventRow.run_id == str(self.run_id), RunEventRow.seq <= 2))
        with self.assertRaises(CursorExpired):
            await event_stream(self.service, self.run_id, 0, self.request, lambda: True)
        page = await self.store.read_events(self.run_id, 2, 32)
        self.assertEqual([item.seq for item in page.items], [3, 4])

    async def test_invalid_persisted_payload_does_not_start_a_successful_stream(self) -> None:
        async with self.store.transaction(write=True) as session:
            row = await session.get(RunEventRow, (str(self.run_id), 1))
            assert row is not None
            row.payload = {"private": "private-value"}
        with self.assertRaises(StorageFailure):
            await event_stream(self.service, self.run_id, 0, self.request, lambda: True)

    async def test_invalid_unicode_payload_is_a_safe_pre_stream_storage_failure(self) -> None:
        async with self.store.transaction(write=True) as session:
            row = await session.get(RunEventRow, (str(self.run_id), 1))
            assert row is not None
            row.event_type = "message.delta"
            row.payload = {"message_id": str(uuid4()), "delta": "\ud800"}
        with self.assertRaises(StorageFailure):
            await event_stream(self.service, self.run_id, 0, self.request, lambda: True)


class StreamAPITests(unittest.TestCase):
    def test_actual_route_auth_input_expiration_and_terminal_headers(self) -> None:
        with tempfile.TemporaryDirectory(prefix="prodops-sse-boundary-") as directory:
            database = Path(directory) / "boundary.sqlite3"

            async def seed() -> UUID:
                store = SQLiteEventStore(database)
                await store.start()
                try:
                    conversation = await store.create_conversation("SSE boundary")
                    run_id = (await store.submit_run(conversation.conversation_id, "camera", "development", uuid4())).run.run_id
                    await store.cancel_run(run_id, None)
                    return run_id
                finally:
                    await store.close()

            run_id = asyncio.run(seed())
            settings = ServiceSettings.model_validate({"mode": "local", "database": database, "development_token": TOKEN})
            with TestClient(create_app(settings), base_url="http://127.0.0.1", headers=HEADERS) as client:
                path = f"/api/v1/runs/{run_id}/events"
                for value in ("", "-1", "1.5", "true", "9007199254740992", "x" * 17):
                    self.assertEqual(client.get(path, headers={"Last-Event-ID": value}).status_code, 422)
                self.assertEqual(client.get(path, headers=[("Last-Event-ID", "1"), ("Last-Event-ID", "1")]).status_code, 422)
                self.assertEqual(client.get(path, headers={"Origin": "https://untrusted.example"}).status_code, 403)
                self.assertEqual(client.get(path, headers={"X-ProdOps-Protocol": "1.3"}).status_code, 426)
                unauthenticated = client.build_request("GET", path)
                del unauthenticated.headers["Authorization"]
                self.assertEqual(client.send(unauthenticated).status_code, 401)
                self.assertEqual(client.get(f"/api/v1/runs/{uuid4()}/events").status_code, 404)
                response = client.get(path, headers={"Last-Event-ID": "1"})
                self.assertEqual(response.status_code, 200)
                self.assertTrue(response.headers["content-type"].startswith("text/event-stream"))
                self.assertEqual(response.headers["cache-control"], "no-store")
                self.assertEqual(response.headers["x-accel-buffering"], "no")
                self.assertIn("x-request-id", response.headers)
                self.assertEqual([item["seq"] for item in parse_frames(response.text)], [2, 3])
                self.assertEqual(client.get(path, headers={"Last-Event-ID": "3"}).text, "")
                self.assertTrue(client.get("/api/v1/capabilities").json()["event_stream"])
                with closing(sqlite3.connect(database)) as connection:
                    connection.execute("DELETE FROM run_events WHERE seq=1")
                    connection.commit()
                expired = client.get(path)
                self.assertEqual((expired.status_code, expired.json()["error"]["code"]), (410, "cursor_expired"))

    @contextmanager
    def server(self, database: Path) -> Iterator[int]:
        script = '''
import asyncio
import sys
from pathlib import Path
from prodops.adapters.mock_tools import MockTools
original = MockTools.execute
async def delayed(self,request):
    while not Path(sys.argv[1]).exists():
        await asyncio.sleep(0.01)
    return await original(self,request)
MockTools.execute=delayed
from prodops.bootstrap.cli import main
raise SystemExit(main(["--mode","local"]))
'''
        environment = {key: value for key, value in os.environ.items() if not key.startswith("PRODOPS_")}
        environment.update(PRODOPS_DATABASE=str(database), PRODOPS_DEVELOPMENT_TOKEN=TOKEN, PRODOPS_EXECUTION_ENABLED="true")
        process = subprocess.Popen([sys.executable, "-c", script, str(database.with_suffix(".continue"))], env=environment, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8")
        lines: queue.Queue[str] = queue.Queue()

        def collect() -> None:
            assert process.stdout is not None
            for line in process.stdout:
                lines.put(line)

        reader = threading.Thread(target=collect, daemon=True)
        reader.start()
        try:
            deadline = time.monotonic() + 15
            while time.monotonic() < deadline:
                try:
                    line = lines.get(timeout=0.2)
                except queue.Empty:
                    continue
                match = re.search(r"Uvicorn running on http://127\.0\.0\.1:(\d+)", line)
                if match:
                    yield int(match.group(1))
                    return
            self.fail("Isolated SSE service did not become ready")
        finally:
            if process.poll() is None:
                process.terminate()
            process.wait(timeout=10)
            reader.join(timeout=5)
            if process.stdout is not None:
                process.stdout.close()

    def test_real_http_disconnect_reconnect_has_no_missing_events_and_replay_can_be_deduplicated(self) -> None:
        opener = build_opener(ProxyHandler({}))
        with tempfile.TemporaryDirectory(prefix="prodops-sse-http-") as directory:
            with self.server(Path(directory) / "http.sqlite3") as port:
                base = f"http://127.0.0.1:{port}"

                def request(path: str, body: dict[str, object] | None = None) -> dict[str, Any]:
                    encoded = json.dumps(body).encode("utf-8") if body is not None else None
                    with opener.open(Request(base + path, data=encoded, headers={**HEADERS, "Content-Type": "application/json", "Idempotency-Key": str(uuid4())}), timeout=5) as response:
                        result: dict[str, Any] = json.load(response)
                        return result

                workspace = request("/api/v1/workspaces")["items"][0]["workspace_id"]
                conversation = request(f"/api/v1/workspaces/{workspace}/conversations", {"title": "SSE actual transport"})["conversation_id"]
                submitted = request(f"/api/v1/conversations/{conversation}/runs", {"content": "camera", "execution_mode": "mock"})
                path = f"/api/v1/runs/{submitted['run_id']}/events"
                initial_text = ""
                with opener.open(Request(base + path, headers=HEADERS), timeout=5) as stream:
                    while True:
                        line = stream.readline().decode("utf-8")
                        self.assertNotEqual(line, "")
                        initial_text += line
                        if line == "\n" and "event: tool.started\n" in initial_text:
                            break
                initial = parse_frames(initial_text)
                self.assertEqual(initial[-1]["event_type"], "tool.started")
                self.assertEqual(request(f"/api/v1/runs/{submitted['run_id']}")["status"], "running")
                (Path(directory) / "http.continue").write_text("Continue isolated mock read", encoding="utf-8")
                for _ in range(100):
                    final = request(f"/api/v1/runs/{submitted['run_id']}")
                    if final["status"] == "succeeded":
                        break
                    time.sleep(0.02)
                self.assertEqual((final["status"], len(final["evidence"])), ("succeeded", 3))
                cursor = initial[-1]["seq"]
                with opener.open(Request(base + path, headers={**HEADERS, "Last-Event-ID": str(cursor)}), timeout=5) as stream:
                    replay = parse_frames(stream.read().decode("utf-8"))
                self.assertEqual([item["seq"] for item in initial + replay], list(range(1, final["last_event_seq"] + 1)))
                with opener.open(Request(base + path, headers={**HEADERS, "Last-Event-ID": str(cursor - 1)}), timeout=5) as stream:
                    duplicated = parse_frames(stream.read().decode("utf-8"))
                merged = {(item["run_id"], item["seq"]): item for item in initial + duplicated}
                self.assertEqual(len(merged), final["last_event_seq"])
