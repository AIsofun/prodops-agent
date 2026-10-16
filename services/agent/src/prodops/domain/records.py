"""Transport-independent records returned by persistence ports."""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class StorageIdentity:
    deployment_id: UUID
    workspace_id: UUID


@dataclass(frozen=True)
class ConversationRecord:
    conversation_id: UUID
    workspace_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
