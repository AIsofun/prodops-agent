"""Database-owned execution transitions. State, checkpoint and events commit together."""

from dataclasses import asdict, replace
from datetime import UTC, datetime
import math
from uuid import UUID, uuid4

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from prodops.adapters.storage.models import ConversationRow, MessageRow, RunEventRow, RunRow, ToolCallRow
from prodops.adapters.storage.tasks import SQLiteTaskStore, storage_operation
from prodops.application.errors import ExecutionBudgetExceeded, LostOwnership, StorageFailure
from prodops.domain.execution import ExecutionLease, ExecutionPolicy, Observation, ToolRequest


def persisted_policy(value: object) -> ExecutionPolicy:
    if not isinstance(value, dict) or set(value) != {"concurrency", "queue_limit", "max_tool_calls", "run_timeout", "tool_timeout"}:
        raise StorageFailure()
    counts = [value[key] for key in ("concurrency", "queue_limit", "max_tool_calls")]
    times = [value[key] for key in ("run_timeout", "tool_timeout")]
    if any(type(item) is not int for item in counts) or any(type(item) not in (int, float) for item in times):
        raise StorageFailure()
    try:
        return ExecutionPolicy(*counts, *times)
    except (ValueError, TypeError):
        raise StorageFailure() from None


class SQLiteExecutionStore(SQLiteTaskStore):
    @storage_operation
    async def claim(self, owner_id: UUID) -> ExecutionLease | None:
        workspace = str(self.identity.workspace_id)
        async with self.transaction(write=True) as session:
            active = await session.scalar(select(func.count()).select_from(RunRow).where(RunRow.workspace_id == workspace, RunRow.status.in_(("running", "cancelling"))))
            if active is not None and active >= self.policy.concurrency:
                return None
            row = await session.scalar(select(RunRow).where(RunRow.workspace_id == workspace, RunRow.status == "queued").order_by(RunRow.created_at, RunRow.id).limit(1))
            if row is None:
                return None
            conversation = await session.get(ConversationRow, row.conversation_id)
            if conversation is None or conversation.active_run_id != row.id or row.checkpoint.get("execution_mode") != "mock":
                raise StorageFailure()
            content = await session.scalar(select(MessageRow.content).where(MessageRow.run_id == row.id, MessageRow.role == "user"))
            if content is None:
                raise StorageFailure()
            checkpoint = dict(row.checkpoint)
            # Existing T02 queued rows have no budget; initialize once on first claim.
            if "budget" not in checkpoint:
                checkpoint["budget"] = asdict(self.policy)
            policy = persisted_policy(checkpoint["budget"])
            used, elapsed = checkpoint.get("tool_calls_used", 0), checkpoint.get("elapsed_seconds", 0.0)
            if type(used) is not int or not isinstance(elapsed, (float, int)) or isinstance(elapsed, bool) or used < 0 or elapsed < 0 or not math.isfinite(elapsed):
                raise StorageFailure()
            attempt_id = str(uuid4())
            checkpoint.update(owner_id=str(owner_id), attempt_id=attempt_id, heartbeat_at=datetime.now(UTC).isoformat(), tool_calls_used=used, elapsed_seconds=float(elapsed))
            row.checkpoint, row.status = checkpoint, "running"
            self._event(session, row, "run.started", {"attempt_id": attempt_id})
            await session.flush()
            return ExecutionLease(UUID(row.id), owner_id, row.version, content, policy, used, float(elapsed))

    async def _owned(self, session: AsyncSession, lease: ExecutionLease) -> RunRow:
        row = await session.get(RunRow, str(lease.run_id))
        if row is None or row.workspace_id != str(self.identity.workspace_id) or row.status != "running" or row.version != lease.version or row.checkpoint.get("owner_id") != str(lease.owner_id):
            raise LostOwnership()
        return row

    @staticmethod
    def _event(session: AsyncSession, row: RunRow, kind: str, payload: dict[str, object]) -> None:
        row.last_event_seq += 1
        row.version += 1
        row.updated_at = datetime.now(UTC)
        session.add(RunEventRow(run_id=row.id, seq=row.last_event_seq, schema_version="1.0", event_type=kind, occurred_at=row.updated_at, payload=payload))

    @staticmethod
    def _checkpoint(row: RunRow, elapsed: float) -> dict[str, object]:
        if not math.isfinite(elapsed) or elapsed < 0:
            raise ValueError("Invalid elapsed execution time")
        checkpoint = dict(row.checkpoint)
        prior = checkpoint.get("elapsed_seconds", 0.0)
        if not isinstance(prior, (float, int)):
            raise StorageFailure()
        checkpoint.update(elapsed_seconds=max(float(prior), elapsed), heartbeat_at=datetime.now(UTC).isoformat())
        return checkpoint

    @storage_operation
    async def begin_tool(self, lease: ExecutionLease, request: ToolRequest, elapsed: float) -> tuple[ExecutionLease, UUID]:
        async with self.transaction(write=True) as session:
            row = await self._owned(session, lease)
            checkpoint = self._checkpoint(row, elapsed)
            used = checkpoint.get("tool_calls_used", 0)
            if type(used) is not int:
                raise StorageFailure()
            if used >= lease.policy.max_tool_calls or elapsed >= lease.policy.run_timeout:
                raise ExecutionBudgetExceeded()
            call_id = uuid4()
            checkpoint.update(tool_calls_used=used + 1, active_tool_call_id=str(call_id))
            row.checkpoint = checkpoint
            session.add(ToolCallRow(id=str(call_id), run_id=row.id, tool_name=request.name, status="running",
                                    summary="Explicit mock read request", result={"scenario": request.scenario}, created_at=datetime.now(UTC)))
            self._event(session, row, "step.started", {"step_id": str(uuid4()), "label": request.name})
            self._event(session, row, "tool.started", {"tool_call_id": str(call_id), "tool_name": request.name})
            await session.flush()
            return replace(lease, version=row.version, tool_calls_used=used + 1, elapsed_seconds=elapsed), call_id

    @storage_operation
    async def finish_tool(self, lease: ExecutionLease, call_id: UUID, result: Observation, elapsed: float) -> ExecutionLease:
        if not 1 <= len(result.summary) <= 512 or not 1 <= len(result.source) <= 512 or not result.source.startswith("mock://"):
            raise ValueError("Invalid mock observation")
        async with self.transaction(write=True) as session:
            row = await self._owned(session, lease)
            tool = await session.get(ToolCallRow, str(call_id))
            if tool is None or tool.run_id != row.id or tool.status != "running" or row.checkpoint.get("active_tool_call_id") != str(call_id):
                raise LostOwnership()
            checkpoint = self._checkpoint(row, elapsed)
            evidence: dict[str, object] = {"evidence_id": str(uuid4()), "tool_call_id": str(call_id), "source": result.source,
                                           "summary": result.summary, "collected_at": datetime.now(UTC).isoformat(), "artifact_id": None}
            previous = checkpoint.get("evidence", [])
            if not isinstance(previous, list):
                raise StorageFailure()
            checkpoint.update(evidence=[*previous, evidence], active_tool_call_id=None)
            row.checkpoint = checkpoint
            tool.status, tool.summary = "succeeded", result.summary
            tool.result = {"source": result.source, "summary": result.summary, "evidence": [evidence]}
            self._event(session, row, "tool.completed", {"tool_call_id": str(call_id), "status": "succeeded", "summary": result.summary, "evidence": [evidence]})
            await session.flush()
            return replace(lease, version=row.version, elapsed_seconds=elapsed)

    @storage_operation
    async def complete(self, lease: ExecutionLease, answer: str, elapsed: float) -> None:
        if not 1 <= len(answer) <= 32000:
            raise ValueError("Invalid final answer")
        async with self.transaction(write=True) as session:
            row = await self._owned(session, lease)
            if elapsed >= lease.policy.run_timeout:
                raise ExecutionBudgetExceeded()
            checkpoint = self._checkpoint(row, elapsed)
            checkpoint.update(owner_id=None, final_message_id=str(uuid4()))
            row.checkpoint, row.status = checkpoint, "succeeded"
            row.resolution_status = "unknown"
            message_id = str(checkpoint["final_message_id"])
            session.add(MessageRow(id=message_id, conversation_id=row.conversation_id, run_id=row.id, role="assistant", content=answer, created_at=datetime.now(UTC)))
            self._event(session, row, "message.delta", {"message_id": message_id, "delta": answer})
            self._event(session, row, "run.completed", {"message_id": message_id, "resolution_status": "unknown"})
            await session.execute(update(ConversationRow).where(ConversationRow.id == row.conversation_id, ConversationRow.active_run_id == row.id).values(active_run_id=None, updated_at=row.updated_at))

    @storage_operation
    async def fail(self, lease: ExecutionLease, code: str, message: str, elapsed: float, *, interrupted: bool = False) -> None:
        async with self.transaction(write=True) as session:
            row = await self._owned(session, lease)
            checkpoint = self._checkpoint(row, elapsed)
            error: dict[str, object] = {"code": code, "message": message, "retryable": False}
            active = checkpoint.get("active_tool_call_id")
            unknown: list[str] = []
            if isinstance(active, str):
                tool = await session.get(ToolCallRow, active)
                if tool is not None and tool.run_id == row.id and tool.status == "running":
                    tool.status = "unknown" if interrupted else "failed"
                    tool.summary, tool.result = message, {"error": error}
                    if interrupted:
                        unknown.append(active)
                    else:
                        self._event(session, row, "tool.completed", {"tool_call_id": active, "status": "failed", "summary": message, "evidence": []})
            checkpoint.update(owner_id=None, error=error, active_tool_call_id=None)
            row.checkpoint, row.status = checkpoint, "recovery_required" if interrupted else "failed"
            if interrupted:
                self._event(session, row, "run.recovery_required", {"reason": message, "unknown_tool_call_ids": unknown})
            else:
                self._event(session, row, "run.failed", {"error": error})
                await session.execute(update(ConversationRow).where(ConversationRow.id == row.conversation_id, ConversationRow.active_run_id == row.id).values(active_run_id=None, updated_at=row.updated_at))

    @storage_operation
    async def heartbeat(self, lease: ExecutionLease, elapsed: float) -> None:
        async with self.transaction(write=True) as session:
            row = await self._owned(session, lease)
            row.checkpoint = self._checkpoint(row, elapsed)
