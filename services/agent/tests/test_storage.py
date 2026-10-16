"""Durability and transactional boundaries, always on isolated file databases."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta, timezone
from contextlib import closing
from pathlib import Path
import sqlite3
import tempfile
import unittest
from uuid import UUID, uuid4
from unittest.mock import patch

from sqlalchemy import func, inspect, select, text
from sqlalchemy.engine import Connection
from sqlalchemy.exc import IntegrityError, StatementError

from prodops.adapters.storage.models import (
    Base, ConversationRow, MessageRow, RunEventRow, RunRow, WorkspaceRow,
)
from prodops.adapters.storage.sqlite import SQLiteStore, StorageInitializationError
from prodops.application.storage import ConversationStore


class InertStorageTests(unittest.TestCase):
    def test_constructor_does_not_create_or_connect_to_a_database(self) -> None:
        with tempfile.TemporaryDirectory(prefix="prodops-storage-inert-") as directory:
            database = Path(directory) / "not-created" / "database.db"
            with patch("sqlite3.connect", side_effect=AssertionError("Unexpected database I/O")):
                store = SQLiteStore(database)
                self.assertFalse(database.parent.exists())
                with self.assertRaisesRegex(RuntimeError, "not started"):
                    _ = store.identity


class StorageTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory(prefix="prodops-storage-")
        self.root = Path(self.directory.name).resolve()
        self.database = self.root / "数据 100% #.db"
        self.store = SQLiteStore(self.database)
        await self.store.start()

    async def asyncTearDown(self) -> None:
        await self.store.close()
        self.directory.cleanup()

    async def seed_run(self) -> tuple[UUID, UUID]:
        conversation = await self.store.create_conversation("camera diagnosis")
        run_id = uuid4()
        now = datetime.now(UTC)
        async with self.store.transaction(write=True) as session:
            session.add(RunRow(id=str(run_id), conversation_id=str(conversation.conversation_id),
                               workspace_id=str(self.store.identity.workspace_id), created_at=now, updated_at=now))
        return conversation.conversation_id, run_id

    async def test_migration_schema_matches_formal_mappings_and_is_versioned(self) -> None:
        def schema(connection: Connection) -> dict[str, set[str]]:
            inspector = inspect(connection)
            return {name: {column["name"] for column in inspector.get_columns(name)}
                    for name in inspector.get_table_names()}

        async with self.store.engine.connect() as connection:
            tables = await connection.run_sync(schema)
            self.assertEqual(await connection.scalar(text("SELECT version_num FROM alembic_version")), "0001_storage")
            self.assertEqual(await connection.scalar(text("PRAGMA foreign_keys")), 1)
            self.assertEqual(await connection.scalar(text("PRAGMA journal_mode")), "wal")
        self.assertEqual(set(tables), set(Base.metadata.tables) | {"alembic_version"})
        for name, table in Base.metadata.tables.items():
            self.assertEqual(tables[name], set(table.columns.keys()), name)

    async def test_port_round_trip_survives_close_and_reopen(self) -> None:
        port: ConversationStore = self.store
        identity = port.identity
        conversation = await port.create_conversation("  相机排查  ")
        self.assertEqual(conversation.title, "相机排查")
        await self.store.close()
        await self.store.start()
        await self.store.start()
        self.assertEqual(self.store.identity, identity)
        self.assertEqual(await self.store.get_conversation(conversation.conversation_id), conversation)

    async def test_messages_and_events_survive_reopen_without_claiming_execution(self) -> None:
        conversation_id, run_id = await self.seed_run()
        message_id = uuid4()
        async with self.store.transaction(write=True) as session:
            session.add(MessageRow(id=str(message_id), conversation_id=str(conversation_id), run_id=str(run_id),
                                   role="user", content="模拟输入", created_at=datetime.now(UTC)))
            session.add(RunEventRow(run_id=str(run_id), seq=1, schema_version="1.0", event_type="run.created",
                                    occurred_at=datetime.now(UTC), payload={"conversation_id": str(conversation_id)}))
        await self.store.close()
        await self.store.start()
        async with self.store.transaction() as session:
            message = await session.get(MessageRow, str(message_id))
            event = await session.get(RunEventRow, (str(run_id), 1))
            run = await session.get(RunRow, str(run_id))
            assert message is not None and event is not None and run is not None
            self.assertEqual(message.content, "模拟输入")
            self.assertEqual(event.payload, {"conversation_id": str(conversation_id)})
            self.assertEqual(run.status, "queued")
            self.assertEqual(run.resolution_status, "unknown")

    async def test_partial_transaction_rolls_back(self) -> None:
        conversation_id = uuid4()
        now = datetime.now(UTC)
        with self.assertRaisesRegex(RuntimeError, "injected fault"):
            async with self.store.transaction(write=True) as session:
                session.add(ConversationRow(id=str(conversation_id), workspace_id=str(self.store.identity.workspace_id),
                                            title="Must roll back", created_at=now, updated_at=now))
                await session.flush()
                raise RuntimeError("injected fault")
        self.assertIsNone(await self.store.get_conversation(conversation_id))

    async def test_foreign_keys_duplicate_sequences_and_invalid_states_are_rejected(self) -> None:
        _, run_id = await self.seed_run()
        async with self.store.transaction(write=True) as session:
            session.add(RunEventRow(run_id=str(run_id), seq=1, schema_version="1.0", event_type="run.created", occurred_at=datetime.now(UTC), payload={}))
        for sequence, target in ((1, run_id), (0, run_id), (9007199254740992, run_id), (2, uuid4())):
            with self.subTest(seq=sequence), self.assertRaises(IntegrityError):
                async with self.store.transaction(write=True) as session:
                    session.add(RunEventRow(run_id=str(target), seq=sequence, schema_version="1.0", event_type="run.created", occurred_at=datetime.now(UTC), payload={}))
        with self.assertRaises(IntegrityError):
            async with self.store.transaction(write=True) as session:
                row = await session.get(RunRow, str(run_id))
                assert row is not None
                row.status = "invented-success"
        async with self.store.transaction() as session:
            self.assertEqual(await session.scalar(select(func.count()).select_from(RunEventRow)), 1)

    async def test_concurrent_operations_use_distinct_sessions_and_keep_commits(self) -> None:
        async def session_identity() -> int:
            async with self.store.transaction() as session:
                await session.scalar(select(func.count()).select_from(ConversationRow))
                await asyncio.sleep(0.02)
                return id(session)

        sessions = await asyncio.gather(session_identity(), session_identity())
        self.assertEqual(len(set(sessions)), 2)
        conversations = await asyncio.gather(*(self.store.create_conversation(f"conversation {index}") for index in range(12)))
        self.assertEqual(len({row.conversation_id for row in conversations}), 12)
        async with self.store.transaction() as session:
            self.assertEqual(await session.scalar(select(func.count()).select_from(ConversationRow)), 12)

    async def test_default_identity_does_not_change_when_other_workspaces_exist(self) -> None:
        identity = self.store.identity
        other_workspace = str(uuid4())
        other_conversation = uuid4()
        now = datetime.now(UTC)
        async with self.store.transaction(write=True) as session:
            session.add(WorkspaceRow(id=other_workspace, deployment_id=str(identity.deployment_id), name="Other", created_at=now))
            await session.flush()
            session.add(ConversationRow(id=str(other_conversation), workspace_id=other_workspace,
                                        title="Other scope", created_at=now, updated_at=now))
        await self.store.close()
        await self.store.start()
        self.assertEqual(self.store.identity, identity)
        self.assertIsNone(await self.store.get_conversation(other_conversation))

    async def test_independent_databases_do_not_share_identity_or_records(self) -> None:
        other = SQLiteStore(self.root / "other.db")
        await other.start()
        try:
            conversation = await self.store.create_conversation("private to this database")
            self.assertNotEqual(other.identity, self.store.identity)
            self.assertIsNone(await other.get_conversation(conversation.conversation_id))
        finally:
            await other.close()

    async def test_utc_round_trip_and_naive_timestamps_are_rejected(self) -> None:
        conversation = await self.store.create_conversation("UTC")
        local_time = datetime(2026, 10, 16, 12, 30, tzinfo=timezone(timedelta(hours=8)))
        async with self.store.transaction(write=True) as session:
            row = await session.get(ConversationRow, str(conversation.conversation_id))
            assert row is not None
            row.updated_at = local_time
        result = await self.store.get_conversation(conversation.conversation_id)
        assert result is not None
        self.assertEqual(result.updated_at, local_time.astimezone(UTC))
        self.assertEqual(result.updated_at.tzinfo, UTC)
        with self.assertRaises(StatementError):
            async with self.store.transaction(write=True) as session:
                row = await session.get(ConversationRow, str(conversation.conversation_id))
                assert row is not None
                row.updated_at = datetime(2026, 10, 16)

    async def test_unknown_revision_fails_closed_and_preserves_database(self) -> None:
        conversation = await self.store.create_conversation("preserve this")
        await self.store.close()
        with closing(sqlite3.connect(self.database)) as connection:
            with connection:
                connection.execute("UPDATE alembic_version SET version_num = 'future_secret_version'")
        with self.assertRaises(StorageInitializationError) as raised:
            await self.store.start()
        self.assertNotIn("future_secret_version", str(raised.exception))
        self.assertNotIn(str(self.database), str(raised.exception))
        with self.assertRaisesRegex(RuntimeError, "not started"):
            _ = self.store.identity
        with closing(sqlite3.connect(self.database)) as connection:
            self.assertEqual(connection.execute("SELECT version_num FROM alembic_version").fetchone()[0], "future_secret_version")
            self.assertEqual(connection.execute("SELECT title FROM conversations WHERE id = ?", (str(conversation.conversation_id),)).fetchone()[0], "preserve this")

    async def test_concurrent_initialization_is_serialized_and_close_releases_files(self) -> None:
        database = self.root / "concurrent.db"
        first, second = SQLiteStore(database), SQLiteStore(database)
        try:
            await asyncio.gather(first.start(), second.start(), first.start())
            self.assertEqual(first.identity, second.identity)
        finally:
            await first.close()
            await second.close()
        renamed = database.with_name("closed.db")
        database.rename(renamed)
        self.assertTrue(renamed.is_file())

    async def test_invalid_storage_location_is_a_safe_startup_error(self) -> None:
        invalid = SQLiteStore(self.database / "child.db")
        with self.assertRaises(StorageInitializationError) as raised:
            await invalid.start()
        self.assertNotIn(str(self.database), str(raised.exception))
        await invalid.close()


if __name__ == "__main__":
    unittest.main()
