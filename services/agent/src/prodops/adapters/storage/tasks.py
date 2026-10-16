"""Atomic queued task API persistence, isolated from HTTP and model execution."""

from collections.abc import Awaitable, Callable, Coroutine
from datetime import UTC, datetime
from functools import wraps
import hashlib
import json
from typing import Any, Literal, ParamSpec, TypeVar, cast
from uuid import UUID, uuid4

from sqlalchemy import and_, or_, select, update
from sqlalchemy.exc import SQLAlchemyError

from prodops.adapters.storage.models import ConversationRow, IdempotencyRow, MessageRow, RunEventRow, RunRow, WorkspaceRow
from prodops.adapters.storage.paging import decode_cursor, encode_cursor
from prodops.adapters.storage.sqlite import SQLiteStore
from prodops.application.errors import ActiveRunConflict, IdempotencyConflict, ResourceNotFound, StorageFailure
from prodops.domain.records import ConversationRecord, MessageRecord, RecordPage, RunRecord, RunSubmission, WorkspaceRecord
from prodops.domain.runs import ResolutionStatus, RunStatus

P = ParamSpec("P")
T = TypeVar("T")


def storage_operation(method: Callable[P, Awaitable[T]]) -> Callable[P, Coroutine[Any, Any, T]]:
    @wraps(method)
    async def call(*args: P.args, **kwargs: P.kwargs) -> T:
        try:
            return await method(*args, **kwargs)
        except SQLAlchemyError:
            raise StorageFailure() from None
    return call


def run_json(run: RunRecord) -> dict[str, object]:
    return {"run_id": str(run.run_id), "deployment_id": str(run.deployment_id), "workspace_id": str(run.workspace_id),
            "conversation_id": str(run.conversation_id), "status": run.status.value, "resolution_status": run.resolution_status.value,
            "version": run.version, "last_event_seq": run.last_event_seq, "created_at": run.created_at.isoformat(), "updated_at": run.updated_at.isoformat()}


def cached_run(value: dict[str, object]) -> RunRecord:
    return RunRecord(UUID(str(value["run_id"])), UUID(str(value["deployment_id"])), UUID(str(value["workspace_id"])),
                     UUID(str(value["conversation_id"])), RunStatus(str(value["status"])), ResolutionStatus(str(value["resolution_status"])),
                     int(str(value["version"])), int(str(value["last_event_seq"])), datetime.fromisoformat(str(value["created_at"])), datetime.fromisoformat(str(value["updated_at"])))


class SQLiteTaskStore(SQLiteStore):
    @storage_operation
    async def create_conversation(self, title: str) -> ConversationRecord:
        return await super().create_conversation(title)

    @storage_operation
    async def get_conversation(self, conversation_id: UUID) -> ConversationRecord | None:
        return await super().get_conversation(conversation_id)

    @storage_operation
    async def get_workspace(self) -> WorkspaceRecord:
        async with self.transaction() as session:
            row = await session.get(WorkspaceRow, str(self.identity.workspace_id))
            if row is None:
                raise ResourceNotFound()
            return WorkspaceRecord(UUID(row.id), UUID(row.deployment_id), row.name, row.created_at)

    @storage_operation
    async def list_conversations(self, limit: int, cursor: str | None) -> RecordPage[ConversationRecord]:
        workspace = str(self.identity.workspace_id)
        after = decode_cursor(cursor, "conversations", workspace, workspace)
        statement = select(ConversationRow).where(ConversationRow.workspace_id == workspace)
        if after is not None:
            statement = statement.where(or_(ConversationRow.created_at < after[0], and_(ConversationRow.created_at == after[0], ConversationRow.id < after[1])))
        async with self.transaction() as session:
            rows = list(await session.scalars(statement.order_by(ConversationRow.created_at.desc(), ConversationRow.id.desc()).limit(limit + 1)))
            items = rows[:limit]
            next_cursor = encode_cursor("conversations", workspace, workspace, items[-1].created_at, items[-1].id) if len(rows) > limit else None
            return RecordPage(tuple(self._conversation(row) for row in items), next_cursor)

    @storage_operation
    async def list_messages(self, conversation_id: UUID, limit: int, cursor: str | None) -> RecordPage[MessageRecord]:
        if await self.get_conversation(conversation_id) is None:
            raise ResourceNotFound()
        workspace, resource = str(self.identity.workspace_id), str(conversation_id)
        after = decode_cursor(cursor, "messages", workspace, resource)
        statement = select(MessageRow).where(MessageRow.conversation_id == resource)
        if after is not None:
            statement = statement.where(or_(MessageRow.created_at < after[0], and_(MessageRow.created_at == after[0], MessageRow.id < after[1])))
        async with self.transaction() as session:
            rows = list(await session.scalars(statement.order_by(MessageRow.created_at.desc(), MessageRow.id.desc()).limit(limit + 1)))
            items = rows[:limit]
            next_cursor = encode_cursor("messages", workspace, resource, items[-1].created_at, items[-1].id) if len(rows) > limit else None
            return RecordPage(tuple(MessageRecord(UUID(row.id), UUID(row.conversation_id), UUID(row.run_id) if row.run_id else None,
                                                  cast(Literal["user", "assistant"], row.role), row.content, row.created_at) for row in items), next_cursor)

    @storage_operation
    async def list_runs(self, conversation_id: UUID, limit: int, cursor: str | None) -> RecordPage[RunRecord]:
        if await self.get_conversation(conversation_id) is None:
            raise ResourceNotFound()
        workspace, resource = str(self.identity.workspace_id), str(conversation_id)
        after = decode_cursor(cursor, "runs", workspace, resource)
        statement = select(RunRow).where(RunRow.conversation_id == resource, RunRow.workspace_id == workspace)
        if after is not None:
            statement = statement.where(or_(RunRow.created_at < after[0], and_(RunRow.created_at == after[0], RunRow.id < after[1])))
        async with self.transaction() as session:
            rows = list(await session.scalars(statement.order_by(RunRow.created_at.desc(), RunRow.id.desc()).limit(limit + 1)))
            items = rows[:limit]
            next_cursor = encode_cursor("runs", workspace, resource, items[-1].created_at, items[-1].id) if len(rows) > limit else None
            return RecordPage(tuple(self._run(row) for row in items), next_cursor)

    @storage_operation
    async def get_run(self, run_id: UUID) -> RunRecord | None:
        async with self.transaction() as session:
            row = await session.scalar(select(RunRow).where(RunRow.id == str(run_id), RunRow.workspace_id == str(self.identity.workspace_id)))
            return None if row is None else self._run(row)

    @storage_operation
    async def submit_run(self, conversation_id: UUID, content: str, actor_id: str, key: UUID) -> RunSubmission:
        normalized = content.strip()
        if not 1 <= len(normalized) <= 32000:
            raise ValueError("Invalid run content")
        fingerprint = hashlib.sha256(json.dumps({"content": normalized, "execution_mode": "mock"}, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()
        workspace, resource = str(self.identity.workspace_id), str(conversation_id)
        async with self.transaction(write=True) as session:
            conversation = await session.scalar(select(ConversationRow).where(ConversationRow.id == resource, ConversationRow.workspace_id == workspace))
            if conversation is None:
                raise ResourceNotFound()
            existing = await session.get(IdempotencyRow, (workspace, actor_id, resource, "runs.create", str(key)))
            if existing is not None:
                if existing.request_hash != fingerprint:
                    raise IdempotencyConflict()
                return RunSubmission(cached_run(existing.response), True)
            if conversation.active_run_id is not None:
                raise ActiveRunConflict()
            now, run_id = datetime.now(UTC), str(uuid4())
            row = RunRow(id=run_id, workspace_id=workspace, conversation_id=resource, status="queued", resolution_status="unknown",
                         version=1, last_event_seq=1, checkpoint={"execution_mode": "mock"}, created_at=now, updated_at=now)
            session.add(row)
            await session.flush()
            changed = await session.scalar(update(ConversationRow).where(ConversationRow.id == resource, ConversationRow.workspace_id == workspace, ConversationRow.active_run_id.is_(None)).values(active_run_id=run_id, updated_at=now).returning(ConversationRow.id))
            if changed is None:
                raise ActiveRunConflict()
            session.add(MessageRow(id=str(uuid4()), conversation_id=resource, run_id=run_id, role="user", content=normalized, created_at=now))
            session.add(RunEventRow(run_id=run_id, seq=1, schema_version="1.0", event_type="run.created", occurred_at=now, payload={"conversation_id": resource}))
            run = self._run(row)
            session.add(IdempotencyRow(workspace_id=workspace, actor_id=actor_id, resource_id=resource, operation="runs.create", key=str(key), request_hash=fingerprint, run_id=run_id, response=run_json(run), created_at=now))
            await session.flush()
        return RunSubmission(run, False)

    def _run(self, row: RunRow) -> RunRecord:
        return RunRecord(UUID(row.id), self.identity.deployment_id, UUID(row.workspace_id), UUID(row.conversation_id),
                         RunStatus(row.status), ResolutionStatus(row.resolution_status), row.version, row.last_event_seq, row.created_at, row.updated_at)
