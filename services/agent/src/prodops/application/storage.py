"""Persistence ports, independent of a database or HTTP framework."""

from typing import Protocol
from uuid import UUID

from prodops.domain.records import ConversationRecord, StorageIdentity


class ConversationStore(Protocol):
    @property
    def identity(self) -> StorageIdentity: ...

    async def create_conversation(self, title: str) -> ConversationRecord: ...

    async def get_conversation(self, conversation_id: UUID) -> ConversationRecord | None: ...
