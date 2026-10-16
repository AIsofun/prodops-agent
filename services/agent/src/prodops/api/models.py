"""Versioned transport DTOs. Reserved models do not advertise implemented routes."""

from datetime import datetime, timedelta
import re
from typing import Annotated, Literal
from uuid import UUID

from pydantic import (
    AfterValidator, AwareDatetime, BaseModel, BeforeValidator, ConfigDict, Field,
    JsonValue, StringConstraints,
)

from prodops.domain.deployment import DeploymentMode
from prodops.domain.runs import ResolutionStatus, RunStatus

PROTOCOL_VERSION = "1.0"
ProtocolVersion = Literal["1.0"]
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=512)]
Content = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=32000)]
Sequence = Annotated[int, Field(strict=True, ge=0, le=9007199254740991)]
EventSequence = Annotated[int, Field(strict=True, ge=1, le=9007199254740991)]
UTC_TIMESTAMP_PATTERN = r"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:[Zz]|\+00:00)$"


def require_utc(value: datetime) -> datetime:
    if value.utcoffset() != timedelta(0):
        raise ValueError("timestamp must be UTC")
    return value


def require_timestamp_type(value: object) -> object:
    if not isinstance(value, (str, datetime)):
        raise ValueError("timestamp must be a date-time string")
    if isinstance(value, str) and re.fullmatch(UTC_TIMESTAMP_PATTERN, value) is None:
        raise ValueError("timestamp must use UTC date-time format")
    return value


UtcTimestamp = Annotated[AwareDatetime, BeforeValidator(require_timestamp_type),
                         AfterValidator(require_utc), Field(description="UTC timestamp (Z or +00:00).",
                         json_schema_extra={"pattern": UTC_TIMESTAMP_PATTERN})]


class DTO(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)


class HealthResponse(DTO):
    status: Literal["alive", "ready", "not_ready"]
    mode: DeploymentMode
    scope: Literal["service_skeleton"] = "service_skeleton"


class CapabilitiesResponse(DTO):
    protocol_version: ProtocolVersion
    event_schema_version: ProtocolVersion
    deployment_id: UUID = Field(description="Ephemeral service instance ID in M1; durable deployment identity in M2/M4.")
    mode: DeploymentMode
    scope: Literal["service_skeleton"] = "service_skeleton"
    authentication: Literal["unavailable"] = "unavailable"
    conversations: Literal[False] = False
    runs: Literal[False] = False
    event_stream: Literal[False] = False


ErrorCode = Literal[
    "invalid_request", "incompatible_protocol", "unauthenticated", "forbidden",
    "not_found", "conflict", "idempotency_conflict", "cursor_expired", "not_ready",
    "model_unavailable", "tool_failed", "budget_exceeded", "internal_error",
]


class ErrorDetail(DTO):
    code: ErrorCode
    message: ShortText = Field(description="Sanitized user-facing message; never raw input or exception text.")
    retryable: Annotated[bool, Field(strict=True)]


class ErrorResponse(DTO):
    error: ErrorDetail
    request_id: UUID


class Conversation(DTO):
    conversation_id: UUID
    deployment_id: UUID
    workspace_id: UUID
    title: ShortText
    created_at: UtcTimestamp
    updated_at: UtcTimestamp


class Message(DTO):
    message_id: UUID
    conversation_id: UUID
    run_id: UUID | None
    role: Literal["user", "assistant"]
    content: Content
    created_at: UtcTimestamp


class PageQuery(DTO):
    limit: Annotated[int, Field(strict=True, ge=1, le=100)] = 50
    cursor: Annotated[str, StringConstraints(min_length=1, max_length=512)] | None = None


class ConversationPage(DTO):
    items: list[Conversation]
    next_cursor: str | None


class RunCreateRequest(DTO):
    content: Content


class SubmissionHeaders(DTO):
    idempotency_key: UUID = Field(description="Future Idempotency-Key header; scoped to deployment/workspace/caller/resource/operation.")


class EvidenceReference(DTO):
    evidence_id: UUID
    tool_call_id: UUID
    source: ShortText
    collected_at: UtcTimestamp
    summary: ShortText
    artifact_id: UUID | None = Field(description="Authorized resource ID, never an arbitrary filesystem path.")


class ToolResult(DTO):
    tool_call_id: UUID
    status: Literal["succeeded", "failed", "unknown"]
    summary: ShortText
    evidence: list[EvidenceReference]


class ActionProposal(DTO):
    proposal_id: UUID
    tool_name: ShortText
    target: ShortText
    parameters: dict[str, JsonValue] = Field(description="Connector-specific validation and sanitization required before use.")
    impact: ShortText
    expires_at: UtcTimestamp
    revision: EventSequence


class RunSnapshot(DTO):
    run_id: UUID
    deployment_id: UUID
    workspace_id: UUID
    conversation_id: UUID
    status: RunStatus
    resolution_status: ResolutionStatus
    version: EventSequence
    last_event_seq: Sequence
    created_at: UtcTimestamp
    updated_at: UtcTimestamp
    evidence: list[EvidenceReference]
    error: ErrorDetail | None


class ReplayCursor(DTO):
    run_id: UUID
    after_seq: Sequence = Field(description="Exclusive watermark; SSE Last-Event-ID uses this decimal sequence.")


class RunCreatedPayload(DTO):
    conversation_id: UUID


class RunStartedPayload(DTO):
    attempt_id: UUID


class StepStartedPayload(DTO):
    step_id: UUID
    label: ShortText


class ToolStartedPayload(DTO):
    tool_call_id: UUID
    tool_name: ShortText


class MessageDeltaPayload(DTO):
    message_id: UUID
    delta: Annotated[str, StringConstraints(min_length=1, max_length=32000)]


class CancelPayload(DTO):
    reason: ShortText | None


class RunCompletedPayload(DTO):
    message_id: UUID
    resolution_status: ResolutionStatus


class RunFailedPayload(DTO):
    error: ErrorDetail


class RecoveryRequiredPayload(DTO):
    reason: ShortText
    unknown_tool_call_ids: list[UUID]


class EventEnvelope(DTO):
    schema_version: ProtocolVersion
    run_id: UUID
    seq: EventSequence
    occurred_at: UtcTimestamp


class RunCreatedEvent(EventEnvelope):
    event_type: Literal["run.created"]
    payload: RunCreatedPayload


class RunStartedEvent(EventEnvelope):
    event_type: Literal["run.started"]
    payload: RunStartedPayload


class StepStartedEvent(EventEnvelope):
    event_type: Literal["step.started"]
    payload: StepStartedPayload


class ToolStartedEvent(EventEnvelope):
    event_type: Literal["tool.started"]
    payload: ToolStartedPayload


class ToolCompletedEvent(EventEnvelope):
    event_type: Literal["tool.completed"]
    payload: ToolResult


class MessageDeltaEvent(EventEnvelope):
    event_type: Literal["message.delta"]
    payload: MessageDeltaPayload


class ApprovalRequestedEvent(EventEnvelope):
    event_type: Literal["approval.requested"]
    payload: ActionProposal


class CancelRequestedEvent(EventEnvelope):
    event_type: Literal["run.cancel_requested"]
    payload: CancelPayload


class RunCompletedEvent(EventEnvelope):
    event_type: Literal["run.completed"]
    payload: RunCompletedPayload


class RunFailedEvent(EventEnvelope):
    event_type: Literal["run.failed"]
    payload: RunFailedPayload


class RunCancelledEvent(EventEnvelope):
    event_type: Literal["run.cancelled"]
    payload: CancelPayload


class RecoveryRequiredEvent(EventEnvelope):
    event_type: Literal["run.recovery_required"]
    payload: RecoveryRequiredPayload


RunEvent = Annotated[
    RunCreatedEvent | RunStartedEvent | StepStartedEvent | ToolStartedEvent |
    ToolCompletedEvent | MessageDeltaEvent | ApprovalRequestedEvent | CancelRequestedEvent |
    RunCompletedEvent | RunFailedEvent | RunCancelledEvent | RecoveryRequiredEvent,
    Field(discriminator="event_type"),
]


class ReservedContracts(DTO):
    """Schema registry for future endpoints, NOT an HTTP response body."""

    conversation: Conversation
    conversation_page: ConversationPage
    page_query: PageQuery
    message: Message
    run_create: RunCreateRequest
    submission_headers: SubmissionHeaders
    run_snapshot: RunSnapshot
    replay_cursor: ReplayCursor
    event: RunEvent
