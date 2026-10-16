"""Explicit-lifecycle SQLite store. Constructor and module import perform no I/O."""

from collections.abc import AsyncIterator
import asyncio
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from typing import Protocol
from uuid import UUID, uuid4

from alembic import command
from alembic.config import Config
from sqlalchemy import URL, create_engine, event, select
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from prodops.adapters.storage.models import ConversationRow, DeploymentRow, WorkspaceRow
from prodops.domain.records import ConversationRecord, StorageIdentity

_MIGRATION_LOCK = Lock()


class StorageInitializationError(RuntimeError):
    """Safe startup failure without rejected database paths or raw SQL."""


class _Cursor(Protocol):
    def execute(self, statement: str) -> object: ...
    def close(self) -> None: ...


class _DBConnection(Protocol):
    isolation_level: str | None
    def cursor(self) -> _Cursor: ...


def _configure(connection: _DBConnection, record: object) -> None:
    connection.isolation_level = None
    cursor = connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA journal_mode=WAL")
    finally:
        cursor.close()


def _begin(connection: Connection) -> None:
    mode = connection.get_execution_options().get("sqlite_begin_mode", "DEFERRED")
    if mode not in ("DEFERRED", "IMMEDIATE"):
        raise ValueError("Invalid SQLite transaction mode")
    connection.exec_driver_sql("BEGIN " + mode)


def _migrate(connection: Connection) -> None:
    config = Config()
    location = str(Path(__file__).parent / "migrations").replace("%", "%%")
    config.set_main_option("script_location", location)
    config.attributes["connection"] = connection
    command.upgrade(config, "head")


def _migrate_database(database: Path) -> None:
    # Alembic's context proxy is process-global. Serialize synchronous migrations
    # in worker threads; never block the event loop while holding this lock.
    with _MIGRATION_LOCK:
        database.parent.mkdir(parents=True, exist_ok=True)
        engine = create_engine(URL.create("sqlite", database=str(database)))
        event.listen(engine, "connect", _configure)
        event.listen(engine, "begin", _begin)
        try:
            with engine.begin() as connection:
                _migrate(connection)
        finally:
            engine.dispose()


class SQLiteStore:
    def __init__(self, database: Path) -> None:
        self.database = database.absolute()
        self._engine: AsyncEngine | None = None
        self._sessions: async_sessionmaker[AsyncSession] | None = None
        self._identity: StorageIdentity | None = None
        self._lifecycle = asyncio.Lock()

    @property
    def identity(self) -> StorageIdentity:
        if self._identity is None:
            raise RuntimeError("Storage is not started")
        return self._identity

    @property
    def engine(self) -> AsyncEngine:
        if self._engine is None:
            raise RuntimeError("Storage is not started")
        return self._engine

    async def start(self) -> None:
        async with self._lifecycle:
            await self._start()

    async def _start(self) -> None:
        if self._engine is not None:
            return
        engine: AsyncEngine | None = None
        try:
            await asyncio.to_thread(_migrate_database, self.database)
            engine = create_async_engine(URL.create("sqlite+aiosqlite", database=str(self.database)))
            event.listen(engine.sync_engine, "connect", _configure)
            event.listen(engine.sync_engine, "begin", _begin)
            sessions = async_sessionmaker(engine, expire_on_commit=False)
            async with sessions.begin() as session:
                await session.connection(execution_options={"sqlite_begin_mode": "IMMEDIATE"})
                deployment = await session.scalar(select(DeploymentRow).where(DeploymentRow.singleton == 1))
                if deployment is None:
                    deployment = DeploymentRow(singleton=1, id=str(uuid4()), default_workspace_id=str(uuid4()), created_at=datetime.now(UTC))
                    session.add(deployment)
                    await session.flush()
                workspace = await session.scalar(select(WorkspaceRow).where(WorkspaceRow.id == deployment.default_workspace_id, WorkspaceRow.deployment_id == deployment.id))
                if workspace is None:
                    workspace = WorkspaceRow(id=deployment.default_workspace_id, deployment_id=deployment.id, name="Development workspace", created_at=datetime.now(UTC))
                    session.add(workspace)
                    await session.flush()
                identity = StorageIdentity(UUID(deployment.id), UUID(workspace.id))
            self._engine, self._sessions, self._identity = engine, sessions, identity
        except Exception:
            if engine is not None:
                await engine.dispose()
            raise StorageInitializationError("Database initialization failed. Check the schema version and storage configuration.") from None

    async def close(self) -> None:
        async with self._lifecycle:
            engine = self._engine
            self._engine, self._sessions, self._identity = None, None, None
            if engine is not None:
                await engine.dispose()

    @asynccontextmanager
    async def transaction(self, *, write: bool = False) -> AsyncIterator[AsyncSession]:
        if self._sessions is None:
            raise RuntimeError("Storage is not started")
        async with self._sessions.begin() as session:
            if write:
                await session.connection(execution_options={"sqlite_begin_mode": "IMMEDIATE"})
            yield session

    async def create_conversation(self, title: str) -> ConversationRecord:
        normalized = title.strip()
        if not 1 <= len(normalized) <= 512:
            raise ValueError("Conversation title must contain 1 to 512 characters")
        now = datetime.now(UTC)
        row = ConversationRow(id=str(uuid4()), workspace_id=str(self.identity.workspace_id), title=normalized,
                              active_run_id=None, created_at=now, updated_at=now)
        async with self.transaction(write=True) as session:
            session.add(row)
            await session.flush()
        return self._conversation(row)

    async def get_conversation(self, conversation_id: UUID) -> ConversationRecord | None:
        workspace_id = str(self.identity.workspace_id)
        async with self.transaction() as session:
            row = await session.scalar(select(ConversationRow).where(ConversationRow.id == str(conversation_id), ConversationRow.workspace_id == workspace_id))
            return None if row is None else self._conversation(row)

    @staticmethod
    def _conversation(row: ConversationRow) -> ConversationRecord:
        return ConversationRecord(UUID(row.id), UUID(row.workspace_id), row.title, row.created_at, row.updated_at)
