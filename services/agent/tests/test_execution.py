"""Owned database scheduling, explicit mock evidence and durable budget behavior."""

from __future__ import annotations

import asyncio
from dataclasses import replace
from pathlib import Path
import tempfile
from typing import Any
import unittest
from uuid import UUID, uuid4
from unittest.mock import AsyncMock, patch

from pydantic import TypeAdapter
from sqlalchemy import select

from prodops.adapters.mock_tools import MockTools
from prodops.adapters.storage.execution import SQLiteExecutionStore
from prodops.adapters.storage.models import ConversationRow, RunEventRow, RunRow, ToolCallRow
from prodops.agent.mock import MockDiagnosticAgent
from prodops.api.models import RunEvent
from prodops.application.errors import LostOwnership, QueueFull, StorageFailure
from prodops.domain.execution import ExecutionPolicy, Observation, ToolRequest
from prodops.domain.runs import RunStatus
from prodops.runtime.scheduler import Scheduler


class ControlledTools:
    def __init__(self, *, delay: float = 0, fail: bool = False) -> None:
        self.delay, self.fail = delay, fail
        self.calls = 0

    async def execute(self, request: ToolRequest) -> Observation:
        self.calls += 1
        await asyncio.sleep(self.delay)
        if self.fail:
            raise RuntimeError("private-tool-exception")
        return Observation("mock://controlled/readonly", "Explicit test observation")


class ExecutionTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory(prefix="prodops-execution-")
        self.database = Path(self.directory.name) / "execution.sqlite3"
        self.store = SQLiteExecutionStore(self.database)
        await self.store.start()
        self.schedulers: list[Scheduler] = []
        self.failed = False

    async def asyncTearDown(self) -> None:
        for scheduler in self.schedulers:
            await scheduler.stop()
        await self.store.close()
        self.directory.cleanup()

    async def submit(self, content: str = "camera offline") -> UUID:
        conversation = await self.store.create_conversation("Mock diagnosis")
        return (await self.store.submit_run(conversation.conversation_id, content, "development", uuid4())).run.run_id

    async def scheduler(self, tools: Any) -> Scheduler:
        scheduler = Scheduler(self.store, MockDiagnosticAgent(), tools, self.store.policy.concurrency, lambda: setattr(self, "failed", True))
        self.schedulers.append(scheduler)
        await scheduler.start()
        return scheduler

    async def terminal(self, run_id: UUID) -> Any:
        for _ in range(200):
            run = await self.store.get_run(run_id)
            assert run is not None
            if run.status in (RunStatus.SUCCEEDED, RunStatus.FAILED, RunStatus.RECOVERY_REQUIRED):
                return run
            await asyncio.sleep(0.01)
        self.fail("Task did not reach a terminal or review state")

    async def events(self, run_id: UUID) -> list[dict[str, object]]:
        async with self.store.transaction() as session:
            rows = list(await session.scalars(select(RunEventRow).where(RunEventRow.run_id == str(run_id)).order_by(RunEventRow.seq)))
        return [{"run_id": row.run_id, "seq": row.seq, "schema_version": row.schema_version,
                 "event_type": row.event_type, "occurred_at": row.occurred_at, "payload": row.payload} for row in rows]

    async def test_four_packaged_mock_scenarios_generate_committed_evidence_and_answers(self) -> None:
        tools = MockTools()
        await tools.start()
        runs = [(await self.submit(query), scenario) for query, scenario in (
            ("相机掉线", "camera_offline"), ("OCR质量下降", "ocr_quality_drop"),
            ("Kafka堆积", "kafka_backlog"), ("推理延迟升高", "inference_latency_high"))]
        await self.scheduler(tools)
        adapter = TypeAdapter(RunEvent)
        for run_id, scenario in runs:
            run = await self.terminal(run_id)
            self.assertEqual((run.status, run.resolution_status), ("succeeded", "unknown"))
            self.assertEqual(len(run.evidence), 3)
            self.assertTrue(all(scenario in item.source and item.collected_at.utcoffset().total_seconds() == 0 for item in run.evidence))
            events = await self.events(run_id)
            self.assertEqual([event["seq"] for event in events], list(range(1, len(events) + 1)))
            self.assertEqual(run.last_event_seq, len(events))
            self.assertEqual(run.version, len(events))
            for event in events:
                adapter.validate_python(event)
            self.assertEqual(events[-1]["event_type"], "run.completed")
            messages = await self.store.list_messages(run.conversation_id, 50, None)
            self.assertEqual(len(messages.items), 2)
            self.assertIn("模拟", messages.items[0].content)
            self.assertIn("未知", messages.items[0].content)
            async with self.store.transaction() as session:
                row = await session.get(RunRow, str(run_id))
                conversation = await session.get(ConversationRow, str(run.conversation_id))
                assert row is not None and conversation is not None
                self.assertEqual(row.checkpoint["tool_calls_used"], 3)
                self.assertGreater(float(str(row.checkpoint["elapsed_seconds"])), 0)
                self.assertIsNone(conversation.active_run_id)
                self.assertIsNone(row.checkpoint["owner_id"])
        self.assertFalse(self.failed)

    async def test_ambiguous_and_unknown_inputs_request_clarification_without_fake_evidence(self) -> None:
        tools = ControlledTools()
        ids = [await self.submit(query) for query in ("something happened", "camera and kafka")]
        await self.scheduler(tools)
        for run_id in ids:
            run = await self.terminal(run_id)
            self.assertEqual(run.status, "succeeded")
            self.assertEqual(run.evidence, ())
        self.assertEqual(tools.calls, 0)

    async def test_tool_count_budget_is_consumed_before_call_and_stops_later_steps(self) -> None:
        self.store.policy = ExecutionPolicy(max_tool_calls=1)
        run_id = await self.submit()
        tools = ControlledTools()
        await self.scheduler(tools)
        run = await self.terminal(run_id)
        self.assertEqual(run.status, "failed")
        self.assertEqual(run.error.code, "budget_exceeded")
        self.assertEqual((tools.calls, len(run.evidence)), (1, 1))
        async with self.store.transaction() as session:
            row = await session.get(RunRow, str(run_id))
            assert row is not None
            self.assertEqual(row.checkpoint["tool_calls_used"], 1)

    async def test_tool_failure_and_tool_timeout_do_not_retry_or_leak_exception(self) -> None:
        self.store.policy = ExecutionPolicy(tool_timeout=0.03)
        for tools in (ControlledTools(fail=True), ControlledTools(delay=1)):
            run_id = await self.submit()
            scheduler = await self.scheduler(tools)
            run = await self.terminal(run_id)
            self.assertEqual((run.status, run.error.code, tools.calls), ("failed", "tool_failed", 1))
            self.assertNotIn("private-tool", run.error.message)
            self.assertEqual(run.evidence, ())
            async with self.store.transaction() as session:
                tool = await session.scalar(select(ToolCallRow).where(ToolCallRow.run_id == str(run_id)))
                assert tool is not None
                self.assertEqual(tool.status, "failed")
            await scheduler.stop()

    async def test_total_timeout_records_budget_failure_and_retains_consumption(self) -> None:
        self.store.policy = ExecutionPolicy(run_timeout=0.05, tool_timeout=1)
        run_id, tools = await self.submit(), ControlledTools(delay=1)
        await self.scheduler(tools)
        run = await self.terminal(run_id)
        self.assertEqual((run.status, run.error.code, tools.calls), ("failed", "budget_exceeded", 1))
        async with self.store.transaction() as session:
            row = await session.get(RunRow, str(run_id))
            assert row is not None
            self.assertEqual(row.checkpoint["tool_calls_used"], 1)
            self.assertGreaterEqual(float(str(row.checkpoint["elapsed_seconds"])), 0.05)

    async def test_queue_limit_and_database_claim_ownership_are_atomic(self) -> None:
        self.store.policy = ExecutionPolicy(queue_limit=1)
        run_id = await self.submit()
        with self.assertRaises(QueueFull):
            await self.submit()
        owners = [uuid4(), uuid4()]
        leases = await asyncio.gather(*(self.store.claim(owner) for owner in owners))
        self.assertEqual(sum(item is not None for item in leases), 1)
        lease = next(item for item in leases if item is not None)
        self.assertEqual(lease.run_id, run_id)
        with self.assertRaises(LostOwnership):
            await self.store.begin_tool(replace(lease, owner_id=uuid4()), ToolRequest("mock.read_metrics", "camera_offline"), 0)
        with self.assertRaises(LostOwnership):
            await self.store.begin_tool(replace(lease, version=lease.version - 1), ToolRequest("mock.read_metrics", "camera_offline"), 0)

    async def test_persisted_task_budgets_survive_close_and_changed_service_defaults(self) -> None:
        self.store.policy = ExecutionPolicy(max_tool_calls=1)
        run_id = await self.submit()
        await self.store.close()
        self.store = SQLiteExecutionStore(self.database, ExecutionPolicy(max_tool_calls=12))
        await self.store.start()
        tools = ControlledTools()
        await self.scheduler(tools)
        run = await self.terminal(run_id)
        self.assertEqual((run.status, run.error.code, tools.calls), ("failed", "budget_exceeded", 1))

    async def test_server_concurrency_remains_bounded_by_database_running_count(self) -> None:
        self.store.policy = ExecutionPolicy(concurrency=4)
        for _ in range(6):
            await self.submit()
        leases = await asyncio.gather(*(self.store.claim(uuid4()) for _ in range(6)))
        self.assertEqual(sum(item is not None for item in leases), 4)

    async def test_heartbeat_persists_elapsed_time_while_tool_is_in_flight(self) -> None:
        run_id = await self.submit()
        tools = ControlledTools(delay=1.15)
        await self.scheduler(tools)
        for _ in range(150):
            async with self.store.transaction() as session:
                row = await session.get(RunRow, str(run_id))
                assert row is not None
                elapsed = float(str(row.checkpoint.get("elapsed_seconds", 0)))
                active_tool = row.checkpoint.get("active_tool_call_id")
            if elapsed >= 1 and active_tool is not None:
                break
            await asyncio.sleep(0.01)
        self.assertGreaterEqual(elapsed, 1)
        self.assertIsNotNone(active_tool)
        self.assertEqual((await self.terminal(run_id)).status, "succeeded")

    async def test_scheduler_storage_failure_revokes_readiness_and_does_not_retry(self) -> None:
        with patch.object(self.store, "claim", new=AsyncMock(side_effect=StorageFailure())) as claim:
            scheduler = await self.scheduler(ControlledTools())
            for _ in range(100):
                if self.failed:
                    break
                await asyncio.sleep(0.01)
            self.assertTrue(self.failed)
            self.assertFalse(scheduler.healthy)
            claim.assert_awaited_once()

    async def test_completed_run_keeps_original_idempotent_submission_receipt(self) -> None:
        conversation = await self.store.create_conversation("camera")
        key = uuid4()
        original = await self.store.submit_run(conversation.conversation_id, "camera", "development", key)
        tools = MockTools()
        await tools.start()
        await self.scheduler(tools)
        self.assertEqual((await self.terminal(original.run.run_id)).status, "succeeded")
        replay = await self.store.submit_run(conversation.conversation_id, "camera", "development", key)
        self.assertTrue(replay.replayed)
        self.assertEqual(replay.run, original.run)
        self.assertEqual(replay.run.status, "queued")


class PolicyTests(unittest.TestCase):
    def test_invalid_budgets_are_rejected(self) -> None:
        for values in ({"concurrency": 0}, {"concurrency": 5}, {"max_tool_calls": True},
                       {"queue_limit": 101}, {"run_timeout": float("nan")},
                       {"tool_timeout": 0}, {"tool_timeout": float("inf")}):
            with self.assertRaises(ValueError):
                ExecutionPolicy(**values)


if __name__ == "__main__":
    unittest.main()
