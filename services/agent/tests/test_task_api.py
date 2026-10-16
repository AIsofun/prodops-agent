"""Real HTTP boundaries over isolated SQLite databases; no model or device access."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from pathlib import Path
import sqlite3
import tempfile
from typing import Any
import unittest
from uuid import uuid4

from fastapi.testclient import TestClient

from prodops.bootstrap.app import create_app, create_local_app
from prodops.bootstrap.config import ConfigurationError, ServiceSettings, load_settings

TOKEN = "test-only-development-token-000000000000"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "X-ProdOps-Protocol": "1.3"}


def app(database: Path, mode: str = "local") -> Any:
    return create_app(ServiceSettings.model_validate({"mode": mode, "database": database, "development_token": TOKEN}))


class TaskAPITests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory(prefix="prodops-api-")
        self.database = Path(self.directory.name) / "tasks.sqlite3"
        self.client = TestClient(app(self.database), base_url="http://127.0.0.1", headers=HEADERS)
        self.client.__enter__()
        self.addCleanup(self.directory.cleanup)
        self.addCleanup(self.client.__exit__, None, None, None)
        response = self.client.get("/api/v1/workspaces")
        self.assertEqual(response.status_code, 200, response.text)
        self.workspace = response.json()["items"][0]["workspace_id"]
        self.path = f"/api/v1/workspaces/{self.workspace}/conversations"

    def conversation(self) -> str:
        response = self.client.post(self.path, json={"title": "  Camera check  "})
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["title"], "Camera check")
        return str(response.json()["conversation_id"])

    def submit(self, conversation: str, key: str | None = None, content: str = " inspect camera ") -> Any:
        return self.client.post(f"/api/v1/conversations/{conversation}/runs",
                                json={"content": content, "execution_mode": "mock"},
                                headers={"Idempotency-Key": key or str(uuid4())})

    def counts(self) -> tuple[int, ...]:
        with closing(sqlite3.connect(self.database)) as connection:
            return tuple(connection.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
                         for table in ("runs", "messages", "run_events", "idempotency_records"))

    def test_auth_protocol_origin_and_configuration_fail_closed(self) -> None:
        for headers, expected in (({}, 401), ({**HEADERS, "Authorization": "Bearer wrong-secret"}, 401),
                                  ({**HEADERS, "Origin": "https://untrusted.example"}, 403),
                                  ({**HEADERS, "X-ProdOps-Protocol": "1.0"}, 426),
                                  ({"Authorization": HEADERS["Authorization"]}, 426)):
            with TestClient(app(self.database.with_name("unauthorized.sqlite3")), base_url="http://127.0.0.1") as raw:
                response = raw.post(self.path, json={"title": "secret-input"}, headers=headers)
                self.assertEqual(response.status_code, expected, response.text)
                self.assertNotIn("secret-input", response.text)
                self.assertNotIn(TOKEN, response.text)
                self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(self.client.get(self.path).json()["items"], [])
        with TestClient(create_local_app(), base_url="http://127.0.0.1") as disabled:
            self.assertEqual(disabled.get("/api/v1/workspaces", headers=HEADERS).status_code, 503)
        response = self.client.get("/api/v1/workspaces", headers=[("Authorization", HEADERS["Authorization"]), ("Authorization", HEADERS["Authorization"])])
        self.assertEqual(response.status_code, 401)

    def test_submission_is_atomic_queued_and_idempotent(self) -> None:
        conversation, key = self.conversation(), str(uuid4())
        first = self.submit(conversation, key)
        self.assertEqual(first.status_code, 202, first.text)
        snapshot = first.json()
        self.assertEqual((snapshot["status"], snapshot["version"], snapshot["last_event_seq"]), ("queued", 1, 1))
        self.assertEqual(first.headers["idempotency-replayed"], "false")
        duplicate = self.submit(conversation, key, "inspect camera")
        self.assertEqual(duplicate.status_code, 202)
        self.assertEqual(duplicate.json(), snapshot)
        self.assertEqual(duplicate.headers["idempotency-replayed"], "true")
        conflict = self.submit(conversation, key, "different request")
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(conflict.json()["error"]["code"], "idempotency_conflict")
        self.assertEqual(self.submit(conversation).status_code, 409)
        self.assertEqual(self.counts(), (1, 1, 1, 1))
        self.assertEqual(self.client.get(f"/api/v1/runs/{snapshot['run_id']}").json(), snapshot)
        self.assertEqual(self.client.get(f"/api/v1/conversations/{conversation}/runs").json()["items"], [snapshot])
        messages = self.client.get(f"/api/v1/conversations/{conversation}/messages").json()["items"]
        self.assertEqual([(item["content"], item["role"]) for item in messages], [("inspect camera", "user")])
        with closing(sqlite3.connect(self.database)) as connection:
            self.assertEqual(connection.execute("SELECT active_run_id FROM conversations").fetchone()[0], snapshot["run_id"])
            self.assertEqual(connection.execute("SELECT event_type,seq FROM run_events").fetchone(), ("run.created", 1))

    def test_concurrent_distinct_keys_get_one_active_run(self) -> None:
        conversation = self.conversation()
        with ThreadPoolExecutor(max_workers=8) as workers:
            results = list(workers.map(lambda _: self.submit(conversation), range(8)))
        self.assertEqual(sorted(item.status_code for item in results), [202] + [409] * 7)
        self.assertEqual(self.counts(), (1, 1, 1, 1))

    def test_concurrent_same_key_returns_one_original_result(self) -> None:
        conversation, key = self.conversation(), str(uuid4())
        with ThreadPoolExecutor(max_workers=8) as workers:
            results = list(workers.map(lambda _: self.submit(conversation, key), range(8)))
        self.assertEqual([item.status_code for item in results], [202] * 8)
        self.assertEqual(len({item.json()["run_id"] for item in results}), 1)
        self.assertEqual(sum(item.headers["idempotency-replayed"] == "false" for item in results), 1)
        self.assertEqual(self.counts(), (1, 1, 1, 1))

    def test_late_write_failure_rolls_back_entire_submission(self) -> None:
        conversation = self.conversation()
        with closing(sqlite3.connect(self.database)) as connection:
            connection.execute("CREATE TRIGGER fail_event BEFORE INSERT ON run_events BEGIN SELECT RAISE(ABORT,'private-sql-detail'); END")
            connection.commit()
        response = self.submit(conversation)
        self.assertEqual(response.status_code, 503, response.text)
        self.assertNotIn("private-sql-detail", response.text)
        self.assertEqual(self.counts(), (0, 0, 0, 0))
        with closing(sqlite3.connect(self.database)) as connection:
            self.assertIsNone(connection.execute("SELECT active_run_id FROM conversations").fetchone()[0])
            connection.execute("DROP TRIGGER fail_event")
            connection.commit()
        self.assertEqual(self.submit(conversation).status_code, 202)

    def test_restart_preserves_history_identity_and_submission_receipt(self) -> None:
        conversation, key = self.conversation(), str(uuid4())
        snapshot = self.submit(conversation, key).json()
        identity = self.client.get("/api/v1/capabilities").json()["deployment_id"]
        self.client.__exit__(None, None, None)
        try:
            with TestClient(app(self.database, "server"), base_url="http://127.0.0.1", headers=HEADERS) as restarted:
                self.assertEqual(restarted.get("/api/v1/capabilities").json()["deployment_id"], identity)
                self.assertEqual(restarted.get(f"/api/v1/runs/{snapshot['run_id']}").json(), snapshot)
                self.assertEqual(restarted.post(f"/api/v1/conversations/{conversation}/runs", json={"content": "inspect camera", "execution_mode": "mock"}, headers={"Idempotency-Key": key}).json(), snapshot)
        finally:
            self.client.__enter__()

    def test_pagination_is_stable_and_scoped_and_inputs_are_bounded(self) -> None:
        expected = {self.conversation() for _ in range(5)}
        ids: list[str] = []
        cursor: str | None = None
        first_cursor = ""
        while True:
            query = {"limit": "2"}
            if cursor:
                query["cursor"] = cursor
            response = self.client.get(self.path, params=query)
            self.assertEqual(response.status_code, 200, response.text)
            page = response.json()
            ids.extend(item["conversation_id"] for item in page["items"])
            cursor = page["next_cursor"]
            first_cursor = first_cursor or cursor or ""
            if not cursor:
                break
        self.assertEqual(set(ids), expected)
        self.assertEqual(len(ids), 5)
        for limit in ("0", "101", "1.0", "true", "-1"):
            self.assertEqual(self.client.get(self.path, params={"limit": limit}).status_code, 422)
        for value in ("invalid!", "", "x" * 513):
            self.assertEqual(self.client.get(self.path, params={"cursor": value}).status_code, 422)
        conversation = ids[0]
        self.assertEqual(self.client.get(f"/api/v1/conversations/{conversation}/messages", params={"cursor": first_cursor}).status_code, 422)
        for endpoint in (f"/api/v1/workspaces/{uuid4()}/conversations", f"/api/v1/conversations/{uuid4()}/messages", f"/api/v1/runs/{uuid4()}"):
            self.assertEqual(self.client.get(endpoint).status_code, 404)

    def test_bad_submissions_and_oversized_bodies_do_not_write(self) -> None:
        conversation = self.conversation()
        path = f"/api/v1/conversations/{conversation}/runs"
        for body in ({"content": "hello"}, {"content": "hello", "execution_mode": "real"},
                     {"content": " ", "execution_mode": "mock"}, {"content": "x" * 32001, "execution_mode": "mock"},
                     {"content": "hello", "execution_mode": "mock", "secret": "private-value"}):
            response = self.client.post(path, json=body, headers={"Idempotency-Key": str(uuid4())})
            self.assertEqual(response.status_code, 422)
            self.assertNotIn("private-value", response.text)
        self.assertEqual(self.client.post(path, json={"content": "hello", "execution_mode": "mock"}).status_code, 422)
        self.assertEqual(self.client.post(path, content=b"x" * 262145).status_code, 413)
        self.assertEqual(self.client.post(path, content=iter([b"x" * 131073, b"x" * 131073])).status_code, 413)
        self.assertEqual(self.counts(), (0, 0, 0, 0))
        caps = self.client.get("/api/v1/capabilities").json()
        self.assertEqual((caps["authentication"], caps["runs"], caps["execution_enabled"]), ("development_token", True, False))

    def test_foreign_workspace_records_cannot_be_read_or_submitted(self) -> None:
        deployment = self.client.get("/api/v1/capabilities").json()["deployment_id"]
        foreign_workspace, foreign_conversation, foreign_run = str(uuid4()), str(uuid4()), str(uuid4())
        timestamp = "2026-10-16 00:00:00.000000"
        with closing(sqlite3.connect(self.database)) as connection:
            connection.execute("PRAGMA foreign_keys=ON")
            connection.execute("INSERT INTO workspaces(id,deployment_id,name,created_at) VALUES(?,?,?,?)", (foreign_workspace, deployment, "Other workspace", timestamp))
            connection.execute("INSERT INTO conversations(id,workspace_id,title,created_at,updated_at) VALUES(?,?,?,?,?)", (foreign_conversation, foreign_workspace, "Private title", timestamp, timestamp))
            connection.execute("INSERT INTO runs(id,conversation_id,workspace_id,status,resolution_status,version,last_event_seq,checkpoint,created_at,updated_at) VALUES(?,?,?,'queued','unknown',1,0,'{}',?,?)", (foreign_run, foreign_conversation, foreign_workspace, timestamp, timestamp))
            connection.commit()
        for path in (f"/api/v1/workspaces/{foreign_workspace}/conversations", f"/api/v1/conversations/{foreign_conversation}/messages", f"/api/v1/conversations/{foreign_conversation}/runs", f"/api/v1/runs/{foreign_run}"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 404)
            self.assertNotIn("Private title", response.text)
        self.assertEqual(self.submit(foreign_conversation).status_code, 404)
        self.assertEqual(self.client.get(self.path).json()["items"], [])

    def test_message_and_run_pagination_and_cross_conversation_cursor(self) -> None:
        conversation, other = self.conversation(), self.conversation()
        run_ids: set[str] = set()
        for _ in range(4):
            snapshot = self.submit(conversation).json()
            run_ids.add(snapshot["run_id"])
            # Fixture represents prior terminal runs; execution is not part of this card.
            with closing(sqlite3.connect(self.database)) as connection:
                connection.execute("UPDATE runs SET status='succeeded' WHERE id=?", (snapshot["run_id"],))
                connection.execute("UPDATE conversations SET active_run_id=NULL WHERE id=?", (conversation,))
                connection.commit()
        for kind, field in (("messages", "message_id"), ("runs", "run_id")):
            path = f"/api/v1/conversations/{conversation}/{kind}"
            first = self.client.get(path, params={"limit": "2"}).json()
            self.assertEqual(len(first["items"]), 2)
            cursor = first["next_cursor"]
            second = self.client.get(path, params={"limit": "2", "cursor": cursor}).json()
            self.assertIsNone(second["next_cursor"])
            combined = first["items"] + second["items"]
            self.assertEqual(len({item[field] for item in combined}), 4)
            if kind == "runs":
                self.assertEqual({item[field] for item in combined}, run_ids)
            self.assertEqual(self.client.get(f"/api/v1/conversations/{other}/{kind}", params={"cursor": cursor}).status_code, 422)


class BusinessConfigurationTests(unittest.TestCase):
    def test_queue_capacity_is_enforced_at_actual_submission_boundary(self) -> None:
        with tempfile.TemporaryDirectory(prefix="prodops-queue-api-") as directory:
            settings = ServiceSettings.model_validate({"mode": "local", "database": Path(directory) / "queue.sqlite3",
                                                       "development_token": TOKEN, "queue_limit": 1})
            with TestClient(create_app(settings), base_url="http://127.0.0.1", headers=HEADERS) as client:
                workspace = client.get("/api/v1/workspaces").json()["items"][0]["workspace_id"]
                ids = [client.post(f"/api/v1/workspaces/{workspace}/conversations", json={"title": "Queue"}).json()["conversation_id"] for _ in range(2)]
                first_key = str(uuid4())
                body = {"content": "camera", "execution_mode": "mock"}
                self.assertEqual(client.post(f"/api/v1/conversations/{ids[0]}/runs", json=body, headers={"Idempotency-Key": first_key}).status_code, 202)
                second = client.post(f"/api/v1/conversations/{ids[1]}/runs", json=body, headers={"Idempotency-Key": str(uuid4())})
                self.assertEqual((second.status_code, second.json()["error"]["code"]), (429, "budget_exceeded"))
                self.assertEqual(client.post(f"/api/v1/conversations/{ids[0]}/runs", json=body, headers={"Idempotency-Key": first_key}).status_code, 202)

    def test_database_token_pair_and_absolute_path_are_required_and_secrets_hidden(self) -> None:
        for values in ({"PRODOPS_DATABASE": "relative.sqlite3"}, {"PRODOPS_DEVELOPMENT_TOKEN": TOKEN},
                       {"PRODOPS_DATABASE": "relative.sqlite3", "PRODOPS_DEVELOPMENT_TOKEN": TOKEN},
                       {"PRODOPS_DATABASE": str(Path.cwd() / "test.sqlite3"), "PRODOPS_DEVELOPMENT_TOKEN": "short-secret"}):
            with self.assertRaises(ConfigurationError) as error:
                load_settings({"PRODOPS_MODE": "local", **values})
            self.assertNotIn(TOKEN, str(error.exception))
            self.assertNotIn("short-secret", str(error.exception))
        settings = load_settings({"PRODOPS_MODE": "local", "PRODOPS_DATABASE": str(Path.cwd() / "test.sqlite3"), "PRODOPS_DEVELOPMENT_TOKEN": TOKEN})
        self.assertNotIn(TOKEN, repr(settings))


if __name__ == "__main__":
    unittest.main()
