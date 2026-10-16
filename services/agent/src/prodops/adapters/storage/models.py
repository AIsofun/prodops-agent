"""Relational mappings; migrations carry their own immutable table definitions."""

from datetime import UTC, datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.engine import Dialect
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator


class UtcDateTime(TypeDecorator[datetime]):
    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("A timezone-aware timestamp is required")
        normalized = value.astimezone(UTC)
        return normalized.replace(tzinfo=None) if dialect.name == "sqlite" else normalized

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


class Base(DeclarativeBase):
    pass


class DeploymentRow(Base):
    __tablename__ = "deployments"
    __table_args__ = (CheckConstraint("singleton = 1", name="ck_deployment_singleton"),)
    singleton: Mapped[int] = mapped_column(Integer, primary_key=True)
    id: Mapped[str] = mapped_column(String(36), unique=True)
    default_workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", deferrable=True, initially="DEFERRED"))
    created_at: Mapped[datetime] = mapped_column(UtcDateTime())


class WorkspaceRow(Base):
    __tablename__ = "workspaces"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    deployment_id: Mapped[str] = mapped_column(ForeignKey("deployments.id"))
    name: Mapped[str] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(UtcDateTime())


class ConversationRow(Base):
    __tablename__ = "conversations"
    __table_args__ = (Index("ix_conversations_workspace_updated", "workspace_id", "updated_at", "id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"))
    title: Mapped[str] = mapped_column(String(512))
    active_run_id: Mapped[str | None] = mapped_column(ForeignKey("runs.id"))
    created_at: Mapped[datetime] = mapped_column(UtcDateTime())
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime())


class RunRow(Base):
    __tablename__ = "runs"
    __table_args__ = (
        CheckConstraint("status IN ('queued','running','awaiting_approval','cancelling','recovery_required','succeeded','failed','cancelled')", name="ck_run_status"),
        CheckConstraint("resolution_status IN ('unknown','unresolved','resolved')", name="ck_run_resolution"),
        CheckConstraint("version >= 1 AND version <= 9007199254740991", name="ck_run_version"),
        CheckConstraint("last_event_seq >= 0 AND last_event_seq <= 9007199254740991", name="ck_run_seq"),
        Index("ix_runs_queue", "status", "created_at", "id"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"))
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"))
    status: Mapped[str] = mapped_column(String(32), server_default="queued")
    resolution_status: Mapped[str] = mapped_column(String(16), server_default="unknown")
    version: Mapped[int] = mapped_column(Integer, server_default=text("1"))
    last_event_seq: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    checkpoint: Mapped[dict[str, object]] = mapped_column(JSON, server_default=text("'{}'"))
    created_at: Mapped[datetime] = mapped_column(UtcDateTime())
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime())


class MessageRow(Base):
    __tablename__ = "messages"
    __table_args__ = (CheckConstraint("role IN ('user','assistant')", name="ck_message_role"),
                      Index("ix_messages_conversation_created", "conversation_id", "created_at", "id"))
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"))
    run_id: Mapped[str | None] = mapped_column(ForeignKey("runs.id"))
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime())


class RunEventRow(Base):
    __tablename__ = "run_events"
    __table_args__ = (CheckConstraint("seq >= 1 AND seq <= 9007199254740991", name="ck_event_seq"),)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), primary_key=True)
    seq: Mapped[int] = mapped_column(Integer, primary_key=True)
    schema_version: Mapped[str] = mapped_column(String(16))
    event_type: Mapped[str] = mapped_column(String(64))
    occurred_at: Mapped[datetime] = mapped_column(UtcDateTime())
    payload: Mapped[dict[str, object]] = mapped_column(JSON)


class ToolCallRow(Base):
    __tablename__ = "tool_calls"
    __table_args__ = (CheckConstraint("status IN ('pending','running','succeeded','failed','unknown')", name="ck_tool_status"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"))
    tool_name: Mapped[str] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(16))
    summary: Mapped[str] = mapped_column(Text)
    result: Mapped[dict[str, object]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime())


class IdempotencyRow(Base):
    __tablename__ = "idempotency_records"
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), primary_key=True)
    actor_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    resource_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    operation: Mapped[str] = mapped_column(String(64), primary_key=True)
    key: Mapped[str] = mapped_column(String(36), primary_key=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"))
    response: Mapped[dict[str, object]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime())
