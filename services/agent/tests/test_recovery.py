"""Cancellation boundaries, process death and explicitly reviewed mock recovery."""

from __future__ import annotations

import asyncio
from dataclasses import replace
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from typing import Any
import unittest
from unittest.mock import patch
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from pydantic import TypeAdapter
from sqlalchemy import select, text

from prodops.adapters.storage.lock import DatabaseServiceLock
from prodops.adapters.storage.models import RunEventRow, RunRow, ToolCallRow
from prodops.adapters.storage.recovery import SQLiteRecoveryStore
from prodops.adapters.storage.sqlite import StorageInitializationError
from prodops.adapters.mock_tools import MockTools
from prodops.agent.mock import MockDiagnosticAgent
from prodops.api.models import RunEvent
from prodops.application.errors import CancellationRequested, IdempotencyConflict, InvalidRecovery, StorageFailure
from prodops.bootstrap.app import create_app
from prodops.bootstrap.config import ServiceSettings
from prodops.domain.execution import ExecutionPolicy, Observation, ToolRequest
from prodops.runtime.scheduler import Scheduler


class GateTools:
    def __init__(self) -> None:
        self.started = asyncio.Event()
        self.release = asyncio.Event()
        self.calls: list[str] = []

    async def execute(self, request: ToolRequest) -> Observation:
        self.calls.append(request.name)
        self.started.set()
        await self.release.wait()
        return Observation("mock://recovery/readonly", "Confirmed simulated observation")


class RecoveryTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory(prefix="prodops-recovery-")
        self.database = Path(self.directory.name) / "recovery.sqlite3"
        self.store = SQLiteRecoveryStore(self.database)
        await self.store.start()
        self.schedulers: list[Scheduler] = []

    async def asyncTearDown(self) -> None:
        for scheduler in self.schedulers:
            await scheduler.stop()
        await self.store.close()
        self.directory.cleanup()

    async def submit(self) -> UUID:
        conversation = await self.store.create_conversation("Mock recovery")
        return (await self.store.submit_run(conversation.conversation_id, "camera", "development", uuid4())).run.run_id

    async def terminal(self, run_id: UUID) -> Any:
        for _ in range(200):
            run = await self.store.get_run(run_id)
            assert run is not None
            if run.status in ("cancelled", "succeeded", "failed", "recovery_required"):
                return run
            await asyncio.sleep(0.01)
        self.fail("Task did not finish")

    async def schedule(self, tools: GateTools) -> Scheduler:
        scheduler = Scheduler(self.store, MockDiagnosticAgent(), tools, 1, lambda: self.fail("Unexpected scheduler failure"))
        self.schedulers.append(scheduler)
        await scheduler.start()
        return scheduler

    async def event_rows(self, run_id: UUID) -> list[RunEventRow]:
        async with self.store.transaction() as session:
            rows = list(await session.scalars(select(RunEventRow).where(RunEventRow.run_id == str(run_id)).order_by(RunEventRow.seq)))
        for row in rows:
            TypeAdapter(RunEvent).validate_python({"schema_version": row.schema_version, "run_id": row.run_id,
                "seq": row.seq, "occurred_at": row.occurred_at, "event_type": row.event_type, "payload": row.payload})
        return rows

    async def test_queued_and_repeated_cancel_are_idempotent_and_release_slot(self) -> None:
        run_id = await self.submit()
        cancelled = await self.store.cancel_run(run_id, "Stop this mock")
        self.assertEqual(cancelled.status, "cancelled")
        self.assertEqual(await self.store.cancel_run(run_id, "Another reason"), cancelled)
        self.assertEqual([row.event_type for row in await self.event_rows(run_id)], ["run.created", "run.cancel_requested", "run.cancelled"])
        self.assertIsNone(await self.store.claim(uuid4()))
        next_run = await self.store.submit_run(cancelled.conversation_id, "camera", "development", uuid4())
        self.assertNotEqual(next_run.run.run_id, run_id)

    async def test_running_cancel_retains_in_flight_result_and_prevents_next_tool(self) -> None:
        run_id, tools = await self.submit(), GateTools()
        await self.schedule(tools)
        await asyncio.wait_for(tools.started.wait(), 2)
        cancelling = await self.store.cancel_run(run_id, None)
        self.assertEqual(cancelling.status, "cancelling")
        self.assertEqual(await self.store.cancel_run(run_id, None), cancelling)
        tools.release.set()
        terminal = await self.terminal(run_id)
        self.assertEqual((terminal.status, len(terminal.evidence), len(tools.calls)), ("cancelled", 1, 1))
        events = await self.event_rows(run_id)
        self.assertEqual(events[-2].event_type, "tool.completed")
        self.assertEqual(events[-1].event_type, "run.cancelled")
        self.assertNotIn("run.completed", [row.event_type for row in events])
        self.assertEqual(terminal.last_event_seq, len(events))

    async def test_cancelled_in_flight_timeout_preserves_failure_and_stops_next_tool(self) -> None:
        self.store.policy = ExecutionPolicy(tool_timeout=0.05)
        run_id, tools = await self.submit(), GateTools()
        await self.schedule(tools)
        await asyncio.wait_for(tools.started.wait(), 2)
        await self.store.cancel_run(run_id, None)
        terminal = await self.terminal(run_id)
        self.assertEqual((terminal.status, len(tools.calls), terminal.error.code), ("cancelled", 1, "tool_failed"))
        self.assertEqual(terminal.evidence, ())

    async def test_shutdown_grace_expiry_marks_unconfirmed_tool_unknown(self) -> None:
        run_id, tools = await self.submit(), GateTools()
        scheduler = await self.schedule(tools)
        await asyncio.wait_for(tools.started.wait(), 2)
        await scheduler.stop()
        terminal = await self.terminal(run_id)
        self.assertEqual((terminal.status, len(tools.calls)), ("recovery_required", 1))
        async with self.store.transaction() as session:
            tool = await session.scalar(select(ToolCallRow).where(ToolCallRow.run_id == str(run_id)))
            row = await session.get(RunRow, str(run_id))
            assert tool is not None and row is not None
            self.assertEqual(tool.status, "unknown")
            self.assertEqual(row.checkpoint["tool_calls_used"], 1)
            self.assertGreaterEqual(float(str(row.checkpoint["elapsed_seconds"])), 5)

    async def test_shutdown_cancels_worker_once_and_awaits_durable_unknown_result(self) -> None:
        run_id, tools = await self.submit(), GateTools()
        scheduler = await self.schedule(tools)
        await asyncio.wait_for(tools.started.wait(), 2)
        # Wait until the stop path is gathering workers, then delay the durable
        # interruption write. A second cancellation would discard this result.
        original = self.store.fail
        writes = 0

        async def delayed(*args: Any, **kwargs: Any) -> None:
            nonlocal writes
            writes += 1
            await asyncio.sleep(0.1)
            await original(*args, **kwargs)

        with patch.object(self.store, "fail", side_effect=delayed):
            await scheduler.stop()
        run = await self.store.get_run(run_id)
        assert run is not None
        self.assertEqual(run.status, "recovery_required")
        self.assertEqual(len(run.unknown_tool_call_ids), 1)
        self.assertEqual(writes, 1)

    async def test_lifespan_shutdown_reconciles_unconfirmed_intent_after_execution_owner_failure(self) -> None:
        class FailedOwnerTools(MockTools):
            async def execute(self, request: ToolRequest) -> Observation:
                raise StorageFailure()

        database = Path(self.directory.name) / "failed-owner.sqlite3"
        token = "isolated-shutdown-owner-token-000000000000"
        settings = ServiceSettings.model_validate({"mode": "local", "database": database, "development_token": token, "execution_enabled": True})
        headers = {"Authorization": f"Bearer {token}", "X-ProdOps-Protocol": "1.4"}
        with patch("prodops.bootstrap.app.MockTools", FailedOwnerTools), TestClient(create_app(settings), base_url="http://127.0.0.1") as client:
            workspace = client.get("/api/v1/workspaces", headers=headers).json()["items"][0]["workspace_id"]
            conversation = client.post(f"/api/v1/workspaces/{workspace}/conversations", headers=headers, json={"title": "Owner failure"}).json()["conversation_id"]
            submitted = client.post(f"/api/v1/conversations/{conversation}/runs", headers={**headers, "Idempotency-Key": str(uuid4())}, json={"content": "camera", "execution_mode": "mock"})
            self.assertEqual(submitted.status_code, 202)
            run_id = UUID(submitted.json()["run_id"])
            for _ in range(100):
                if client.get("/health/ready").status_code == 503:
                    break
                time.sleep(0.02)
            else:
                self.fail("Execution owner failure did not revoke readiness")
        reopened = SQLiteRecoveryStore(database)
        await reopened.start()
        try:
            run = await reopened.get_run(run_id)
            assert run is not None
            self.assertEqual(run.status, "recovery_required")
            self.assertEqual(len(run.unknown_tool_call_ids), 1)
            self.assertEqual(run.evidence, ())
        finally:
            await reopened.close()

    async def test_cancel_between_steps_and_after_terminal_does_not_rewrite_results(self) -> None:
        run_id = await self.submit()
        lease = await self.store.claim(uuid4())
        assert lease is not None
        lease, call_id = await self.store.begin_tool(lease, ToolRequest("mock.read_metrics", "camera_offline"), 0.01)
        lease = await self.store.finish_tool(lease, call_id, Observation("mock://done", "Completed result"), 0.02)
        await self.store.cancel_run(run_id, None)
        with self.assertRaises(CancellationRequested):
            await self.store.begin_tool(lease, ToolRequest("mock.read_logs", "camera_offline"), 0.03)
        await self.store.acknowledge_cancel(lease, 0.03)
        terminal = await self.terminal(run_id)
        self.assertEqual(len(terminal.evidence), 1)
        self.assertEqual(await self.store.cancel_run(run_id, None), terminal)

    async def test_restart_marks_running_and_cancelling_unknown_and_keeps_queued(self) -> None:
        self.store.policy = ExecutionPolicy(concurrency=4)
        running, cancelling, queued = [await self.submit() for _ in range(3)]
        first, second = await self.store.claim(uuid4()), await self.store.claim(uuid4())
        assert first is not None and second is not None
        first, call_id = await self.store.begin_tool(first, ToolRequest("mock.read_metrics", "camera_offline"), 0.1)
        await self.store.cancel_run(cancelling, None)
        await self.store.close()
        await self.store.start()
        await self.store.recover_orphans()
        for run_id in (running, cancelling):
            run = await self.store.get_run(run_id)
            assert run is not None
            self.assertEqual(run.status, "recovery_required")
        kept = await self.store.get_run(queued)
        assert kept is not None
        self.assertEqual((kept.status, kept.last_event_seq), ("queued", 1))
        async with self.store.transaction() as session:
            tool = await session.get(ToolCallRow, str(call_id))
            assert tool is not None
            self.assertEqual(tool.status, "unknown")
        cancelled_recovery = await self.store.get_run(cancelling)
        assert cancelled_recovery is not None
        with self.assertRaises(InvalidRecovery):
            await self.store.recover_run(cancelling, cancelled_recovery.version, (), uuid4())

    async def test_reviewed_recovery_creates_new_attempt_without_repeating_committed_steps_or_resetting_budget(self) -> None:
        run_id = await self.submit()
        lease = await self.store.claim(uuid4())
        assert lease is not None
        lease, first_call = await self.store.begin_tool(lease, ToolRequest("mock.read_metrics", "camera_offline"), 0.01)
        lease = await self.store.finish_tool(lease, first_call, Observation("mock://original", "Original committed metric"), 0.02)
        lease, unknown_call = await self.store.begin_tool(lease, ToolRequest("mock.read_logs", "camera_offline"), 0.03)
        async with self.store.transaction() as session:
            row = await session.get(RunRow, str(run_id))
            assert row is not None
            previous_attempt = row.checkpoint["attempt_id"]
        await self.store.close()
        await self.store.start()
        await self.store.recover_orphans()
        waiting = await self.store.get_run(run_id)
        assert waiting is not None
        for version, calls in ((waiting.version - 1, (unknown_call,)), (waiting.version, ()), (waiting.version, (uuid4(),))):
            with self.assertRaises(InvalidRecovery):
                await self.store.recover_run(run_id, version, calls, uuid4())
        key = uuid4()
        accepted = await self.store.recover_run(run_id, waiting.version, (unknown_call,), key)
        self.assertEqual((accepted.run.status, len(accepted.run.evidence)), ("queued", 1))
        replay = await self.store.recover_run(run_id, waiting.version, (unknown_call,), key)
        self.assertTrue(replay.replayed)
        self.assertEqual(replay.run, accepted.run)
        with self.assertRaises(IdempotencyConflict):
            await self.store.recover_run(run_id, waiting.version, (), key)
        tools = GateTools()
        tools.release.set()
        await self.schedule(tools)
        completed = await self.terminal(run_id)
        self.assertEqual((completed.status, len(completed.evidence)), ("succeeded", 3))
        self.assertEqual(tools.calls, ["mock.read_logs", "mock.read_runbook"])
        self.assertEqual(completed.evidence[0].tool_call_id, first_call)
        async with self.store.transaction() as session:
            row = await session.get(RunRow, str(run_id))
            old = await session.get(ToolCallRow, str(unknown_call))
            assert row is not None and old is not None
            self.assertNotEqual(row.checkpoint["attempt_id"], previous_attempt)
            self.assertEqual(row.checkpoint["tool_calls_used"], 4)
            self.assertGreaterEqual(float(str(row.checkpoint["elapsed_seconds"])), 0.03)
            self.assertEqual((old.status, old.result["reviewed"]), ("unknown", True))
        self.assertIn("run.recovery_approved", [row.event_type for row in await self.event_rows(run_id)])

    async def test_exhausted_budget_blocks_recovery_and_unknown_result_is_not_retried(self) -> None:
        self.store.policy = ExecutionPolicy(max_tool_calls=1)
        run_id = await self.submit()
        lease = await self.store.claim(uuid4())
        assert lease is not None
        lease, call_id = await self.store.begin_tool(lease, ToolRequest("mock.read_metrics", "camera_offline"), 0.01)
        await self.store.recover_orphans()
        waiting = await self.store.get_run(run_id)
        assert waiting is not None
        with self.assertRaises(InvalidRecovery):
            await self.store.recover_run(run_id, waiting.version, (call_id,), uuid4())
        cancelled = await self.store.cancel_run(run_id, None)
        self.assertEqual(cancelled.status, "cancelled")
        async with self.store.transaction() as session:
            old = await session.get(ToolCallRow, str(call_id))
            assert old is not None
            self.assertEqual(old.status, "unknown")

    async def test_failed_recovery_event_rolls_back_review_status_and_state(self) -> None:
        run_id = await self.submit()
        lease = await self.store.claim(uuid4())
        assert lease is not None
        _, call_id = await self.store.begin_tool(lease, ToolRequest("mock.read_metrics", "camera_offline"), 0.01)
        await self.store.recover_orphans()
        waiting = await self.store.get_run(run_id)
        assert waiting is not None
        async with self.store.transaction(write=True) as session:
            await session.execute(text("CREATE TRIGGER fail_recovery BEFORE INSERT ON run_events WHEN NEW.event_type='run.recovery_approved' BEGIN SELECT RAISE(ABORT,'private-recovery-failure'); END"))
        with self.assertRaises(StorageFailure):
            await self.store.recover_run(run_id, waiting.version, (call_id,), uuid4())
        self.assertEqual(await self.store.get_run(run_id), waiting)
        async with self.store.transaction() as session:
            old = await session.get(ToolCallRow, str(call_id))
            assert old is not None
            self.assertIs(old.result.get("reviewed"), False)


class ProcessRecoveryTests(unittest.TestCase):
    def test_os_lock_rejects_second_service_and_releases_after_process_death(self) -> None:
        with tempfile.TemporaryDirectory(prefix="prodops-service-lock-") as directory:
            path = Path(directory) / "lock.sqlite3"
            lock = DatabaseServiceLock(path)
            lock.acquire()
            try:
                with self.assertRaises(StorageInitializationError):
                    DatabaseServiceLock(path).acquire()
                refused = subprocess.run([sys.executable, "-c", "from pathlib import Path; import sys; from prodops.adapters.storage.lock import DatabaseServiceLock; DatabaseServiceLock(Path(sys.argv[1])).acquire()", str(path)], capture_output=True, text=True, timeout=20, check=False)
                self.assertNotEqual(refused.returncode, 0)
            finally:
                lock.release()
            script = "from pathlib import Path; import os,sys; from prodops.adapters.storage.lock import DatabaseServiceLock; lock=DatabaseServiceLock(Path(sys.argv[1])); lock.acquire(); os._exit(23)"
            result = subprocess.run([sys.executable, "-c", script, str(path)], capture_output=True, text=True, timeout=20, check=False)
            self.assertEqual(result.returncode, 23, result.stderr)
            lock.acquire()
            lock.release()

    def test_actual_hard_exit_then_api_start_requires_review_and_never_replays_unknown_call(self) -> None:
        script = '''
import asyncio,os,sys
from pathlib import Path
from uuid import uuid4
from prodops.adapters.storage.lock import DatabaseServiceLock
from prodops.adapters.storage.recovery import SQLiteRecoveryStore
from prodops.adapters.mock_tools import MockTools
from prodops.domain.execution import ToolRequest
async def run():
    path=Path(sys.argv[1]); lock=DatabaseServiceLock(path); lock.acquire()
    store=SQLiteRecoveryStore(path); await store.start()
    conversation=await store.create_conversation("Crash fixture")
    submitted=await store.submit_run(conversation.conversation_id,"camera","development",uuid4())
    lease=await store.claim(uuid4())
    lease,call=await store.begin_tool(lease,ToolRequest("mock.read_metrics","camera_offline"),0.01)
    tools=MockTools(); await tools.start()
    observed=await tools.execute(ToolRequest("mock.read_metrics","camera_offline"))
    Path(sys.argv[2]).write_text(str(submitted.run.run_id)+"\\n"+str(call)+"\\n"+observed.summary,encoding="utf-8")
    os._exit(23)
asyncio.run(run())
'''
        with tempfile.TemporaryDirectory(prefix="prodops-hard-crash-") as directory:
            database, marker = Path(directory) / "crashed.sqlite3", Path(directory) / "fixture.txt"
            result = subprocess.run([sys.executable, "-c", script, str(database), str(marker)], capture_output=True, text=True, timeout=20, check=False)
            self.assertEqual(result.returncode, 23, result.stderr)
            run_id, call_id, observed = marker.read_text(encoding="utf-8").splitlines()
            self.assertIn("模拟", observed)
            token = "test-only-crash-token-000000000000000"
            settings = ServiceSettings.model_validate({"mode": "local", "database": database, "development_token": token})
            headers = {"Authorization": f"Bearer {token}", "X-ProdOps-Protocol": "1.4"}
            with TestClient(create_app(settings.model_copy(update={"execution_enabled": True})), base_url="http://127.0.0.1", headers=headers) as active:
                self.assertTrue(active.get("/api/v1/capabilities").json()["execution_enabled"])
                for _ in range(3):
                    self.assertEqual(active.get(f"/api/v1/runs/{run_id}").json()["status"], "recovery_required")
                    time.sleep(0.06)
            with TestClient(create_app(settings), base_url="http://127.0.0.1", headers=headers) as client:
                waiting = client.get(f"/api/v1/runs/{run_id}").json()
                self.assertEqual(waiting["status"], "recovery_required")
                self.assertEqual(waiting["unknown_tool_call_ids"], [call_id])
                unauthenticated = client.build_request("POST", f"/api/v1/runs/{run_id}/cancel", json={})
                del unauthenticated.headers["Authorization"]
                self.assertEqual(client.send(unauthenticated).status_code, 401)
                self.assertEqual(client.post(f"/api/v1/runs/{uuid4()}/cancel", json={}).status_code, 404)
                bad = {"expected_version": waiting["version"], "reviewed_tool_call_ids": [], "decision": "retry_mock_reads"}
                self.assertEqual(client.post(f"/api/v1/runs/{run_id}/recover", json=bad, headers={"Idempotency-Key": str(uuid4())}).status_code, 409)
                body = {**bad, "reviewed_tool_call_ids": [call_id]}
                key = str(uuid4())
                recovered = client.post(f"/api/v1/runs/{run_id}/recover", json=body, headers={"Idempotency-Key": key})
                self.assertEqual((recovered.status_code, recovered.json()["status"]), (202, "queued"))
                repeated = client.post(f"/api/v1/runs/{run_id}/recover", json=body, headers={"Idempotency-Key": key})
                self.assertEqual(repeated.json(), recovered.json())
                self.assertEqual(repeated.headers["idempotency-replayed"], "true")
                cancelled = client.post(f"/api/v1/runs/{run_id}/cancel", json={})
                self.assertEqual(cancelled.json()["status"], "cancelled")
                self.assertEqual(client.post(f"/api/v1/runs/{run_id}/cancel", json={}).json(), cancelled.json())


if __name__ == "__main__":
    unittest.main()
