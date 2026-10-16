"""Transport-independent records returned by persistence ports."""

from dataclasses import dataclass
from datetime import datetime
from typing import Generic, Literal, TypeVar
from uuid import UUID

from prodops.domain.runs import ResolutionStatus, RunStatus

T = TypeVar("T")


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


@dataclass(frozen=True)
class WorkspaceRecord:
    workspace_id: UUID
    deployment_id: UUID
    name: str
    created_at: datetime


@dataclass(frozen=True)
class MessageRecord:
    message_id: UUID
    conversation_id: UUID
    run_id: UUID | None
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime


@dataclass(frozen=True)
class EvidenceRecord:
    evidence_id: UUID
    tool_call_id: UUID
    source: str
    collected_at: datetime
    summary: str
    artifact_id: UUID | None = None


@dataclass(frozen=True)
class RunErrorRecord:
    code: str
    message: str
    retryable: bool = False


@dataclass(frozen=True)
class RunRecord:
    run_id: UUID
    deployment_id: UUID
    workspace_id: UUID
    conversation_id: UUID
    status: RunStatus
    resolution_status: ResolutionStatus
    version: int
    last_event_seq: int
    created_at: datetime
    updated_at: datetime
    evidence: tuple[EvidenceRecord, ...] = ()
    error: RunErrorRecord | None = None
    unknown_tool_call_ids: tuple[UUID, ...] = ()


@dataclass(frozen=True)
class RecordPage(Generic[T]):
    items: tuple[T, ...]
    next_cursor: str | None


@dataclass(frozen=True)
class RunSubmission:
    run: RunRecord
    replayed: bool
