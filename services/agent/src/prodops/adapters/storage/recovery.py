"""Cancellation and reviewed recovery; startup scan requires the service OS lock."""

from datetime import UTC, datetime
import hashlib
import json
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from prodops.adapters.storage.execution import SQLiteExecutionStore, persisted_policy
from prodops.adapters.storage.models import ConversationRow, IdempotencyRow, RunRow, ToolCallRow
from prodops.adapters.storage.tasks import cached_run, run_json, storage_operation
from prodops.application.errors import IdempotencyConflict, InvalidRecovery, QueueFull, ResourceNotFound, StorageFailure
from prodops.domain.records import RunRecord, RunSubmission


class SQLiteRecoveryStore(SQLiteExecutionStore):
    async def _scoped(self, session: AsyncSession, run_id: UUID) -> RunRow:
        row = await session.scalar(select(RunRow).where(RunRow.id == str(run_id), RunRow.workspace_id == str(self.identity.workspace_id)))
        if row is None:
            raise ResourceNotFound()
        return row

    async def _release_slot(self, session: AsyncSession, row: RunRow) -> None:
        await session.execute(update(ConversationRow).where(ConversationRow.id == row.conversation_id, ConversationRow.active_run_id == row.id).values(active_run_id=None, updated_at=row.updated_at))

    @storage_operation
    async def cancel_run(self, run_id: UUID, reason: str | None) -> RunRecord:
        async with self.transaction(write=True) as session:
            row = await self._scoped(session, run_id)
            if row.status in ("cancelled", "succeeded", "failed", "cancelling"):
                return self._run(row)
            checkpoint = dict(row.checkpoint)
            checkpoint.update(cancel_requested=True)
            row.checkpoint = checkpoint
            self._event(session, row, "run.cancel_requested", {"reason": reason})
            if row.status == "running":
                row.status = "cancelling"
            else:
                row.status = "cancelled"
                checkpoint.update(owner_id=None)
                row.checkpoint = dict(checkpoint)
                self._event(session, row, "run.cancelled", {"reason": reason})
                await self._release_slot(session, row)
            await session.flush()
            return self._run(row)

    @storage_operation
    async def recover_orphans(self) -> None:
        """Caller holds exclusive service lock, proving no previous owner is alive."""
        async with self.transaction(write=True) as session:
            rows = list(await session.scalars(select(RunRow).where(RunRow.workspace_id == str(self.identity.workspace_id), RunRow.status.in_(("running", "cancelling")))))
            for row in rows:
                now = datetime.now(UTC)
                checkpoint = dict(row.checkpoint)
                elapsed = checkpoint.get("elapsed_seconds", 0.0)
                heartbeat = checkpoint.get("heartbeat_at")
                if not isinstance(elapsed, (int, float)):
                    raise StorageFailure()
                # Conservatively charge the unconfirmed interval, including downtime.
                if isinstance(heartbeat, str):
                    previous = datetime.fromisoformat(heartbeat)
                    if previous.utcoffset() is None:
                        raise StorageFailure()
                    elapsed += max(0, (now - previous).total_seconds())
                tools = list(await session.scalars(select(ToolCallRow).where(ToolCallRow.run_id == row.id, ToolCallRow.status == "running")))
                for tool in tools:
                    tool.status = "unknown"
                    tool.summary = "Service stopped before the tool result was confirmed."
                    tool.result = {**tool.result, "reviewed": False}
                message = "Previous execution owner stopped. Review unknown results before recovery."
                checkpoint.update(owner_id=None, active_tool_call_id=None, elapsed_seconds=elapsed, unknown_tool_call_ids=[tool.id for tool in tools],
                                  error={"code": "internal_error", "message": message, "retryable": False})
                row.checkpoint, row.status = checkpoint, "recovery_required"
                self._event(session, row, "run.recovery_required", {"reason": message, "unknown_tool_call_ids": [tool.id for tool in tools]})

    @storage_operation
    async def recover_run(self, run_id: UUID, expected_version: int, reviewed_calls: tuple[UUID, ...], key: UUID) -> RunSubmission:
        workspace, resource = str(self.identity.workspace_id), str(run_id)
        reviewed = sorted(str(item) for item in reviewed_calls)
        request_hash = hashlib.sha256(json.dumps({"version": expected_version, "reviewed": reviewed, "decision": "retry_mock_reads"}, sort_keys=True).encode("utf-8")).hexdigest()
        async with self.transaction(write=True) as session:
            row = await self._scoped(session, run_id)
            receipt = await session.get(IdempotencyRow, (workspace, "development", resource, "runs.recover", str(key)))
            if receipt is not None:
                if receipt.request_hash != request_hash:
                    raise IdempotencyConflict()
                return RunSubmission(cached_run(receipt.response), True)
            if row.status != "recovery_required" or row.version != expected_version or row.checkpoint.get("execution_mode") != "mock" or row.checkpoint.get("cancel_requested") is True:
                raise InvalidRecovery()
            calls = list(await session.scalars(select(ToolCallRow).where(ToolCallRow.run_id == resource, ToolCallRow.status == "unknown")))
            unknown = [tool for tool in calls if tool.result.get("reviewed") is not True]
            if len(reviewed) != len(set(reviewed)) or set(reviewed) != {tool.id for tool in unknown} or any(not tool.tool_name.startswith("mock.") for tool in unknown):
                raise InvalidRecovery()
            checkpoint = dict(row.checkpoint)
            policy = persisted_policy(checkpoint.get("budget"))
            used, elapsed = checkpoint.get("tool_calls_used", 0), checkpoint.get("elapsed_seconds", 0.0)
            if type(used) is not int or not isinstance(elapsed, (int, float)):
                raise StorageFailure()
            if used >= policy.max_tool_calls or elapsed >= policy.run_timeout:
                raise InvalidRecovery()
            queued = await session.scalar(select(func.count()).select_from(RunRow).where(RunRow.workspace_id == workspace, RunRow.status == "queued"))
            if queued is not None and queued >= self.policy.queue_limit:
                raise QueueFull()
            conversation = await session.get(ConversationRow, row.conversation_id)
            if conversation is None or conversation.active_run_id != row.id:
                raise InvalidRecovery()
            now = datetime.now(UTC)
            for tool in unknown:
                tool.result = {**tool.result, "reviewed": True, "decision": "retry_mock_reads", "reviewed_at": now.isoformat()}
            history = checkpoint.get("recovery_reviews", [])
            if not isinstance(history, list):
                raise StorageFailure()
            checkpoint.update(error=None, unknown_tool_call_ids=[], recovery_reviews=[*history, {"reviewed_at": now.isoformat(), "reviewed_calls": reviewed, "version": expected_version}])
            row.checkpoint, row.status = checkpoint, "queued"
            self._event(session, row, "run.recovery_approved", {"prior_attempt_id": checkpoint.get("attempt_id"), "reviewed_tool_call_ids": reviewed, "decision": "retry_mock_reads"})
            result = self._run(row)
            session.add(IdempotencyRow(workspace_id=workspace, actor_id="development", resource_id=resource, operation="runs.recover", key=str(key), request_hash=request_hash, run_id=resource, response=run_json(result), created_at=now))
            await session.flush()
            return RunSubmission(result, False)
