"""Conversation and queued-run use cases; execution is a separate runtime slice."""

from uuid import UUID

from prodops.application.errors import ResourceNotFound
from prodops.application.storage import TaskStore
from prodops.domain.records import ConversationRecord, MessageRecord, RecordPage, RunRecord, RunSubmission, StorageIdentity, WorkspaceRecord


class TaskService:
    def __init__(self, store: TaskStore) -> None:
        self.store = store

    @property
    def identity(self) -> StorageIdentity:
        return self.store.identity

    def require_workspace(self, workspace_id: UUID) -> None:
        if workspace_id != self.identity.workspace_id:
            raise ResourceNotFound()

    async def workspace(self) -> WorkspaceRecord:
        return await self.store.get_workspace()

    async def create_conversation(self, workspace_id: UUID, title: str) -> ConversationRecord:
        self.require_workspace(workspace_id)
        return await self.store.create_conversation(title)

    async def conversations(self, workspace_id: UUID, limit: int, cursor: str | None) -> RecordPage[ConversationRecord]:
        self.require_workspace(workspace_id)
        return await self.store.list_conversations(limit, cursor)

    async def messages(self, conversation_id: UUID, limit: int, cursor: str | None) -> RecordPage[MessageRecord]:
        return await self.store.list_messages(conversation_id, limit, cursor)

    async def runs(self, conversation_id: UUID, limit: int, cursor: str | None) -> RecordPage[RunRecord]:
        return await self.store.list_runs(conversation_id, limit, cursor)

    async def submit(self, conversation_id: UUID, content: str, key: UUID) -> RunSubmission:
        return await self.store.submit_run(conversation_id, content, "development", key)

    async def snapshot(self, run_id: UUID) -> RunRecord:
        run = await self.store.get_run(run_id)
        if run is None:
            raise ResourceNotFound()
        return run
