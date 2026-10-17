"""Behavior checks for M1-T02. All network access is to isolated loopback children."""

from __future__ import annotations

import json
import os
import queue
import re
import socket
import subprocess
import sys
import threading
import tempfile
import time
import unittest
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, patch
from urllib.request import ProxyHandler, Request, build_opener
from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import ValidationError

from prodops.application.health import HealthService
from prodops.bootstrap.app import create_app, create_local_app, create_server_app
from prodops.bootstrap.config import ConfigurationError, ServiceSettings, load_settings
from prodops.domain.deployment import DeploymentMode

ROOT = Path(__file__).resolve().parents[3]


def clean_environment() -> dict[str, str]:
    return {key: value for key, value in os.environ.items() if not key.startswith("PRODOPS_")}


class ConfigurationTests(unittest.TestCase):
    def test_explicit_mode_is_required(self) -> None:
        with self.assertRaisesRegex(ConfigurationError, "mode: missing"):
            load_settings({})

    def test_modes_use_same_settings_and_cli_overrides_environment(self) -> None:
        for mode in DeploymentMode:
            settings = load_settings({"PRODOPS_MODE": mode.value, "PRODOPS_PORT": "1234"})
            self.assertEqual(settings.mode, mode)
            self.assertEqual(settings.host, "127.0.0.1")
            self.assertEqual(settings.port, 1234)
        settings = load_settings({"PRODOPS_MODE": "server", "PRODOPS_PORT": "1234"},
                                 mode="local", port="0")
        self.assertEqual(settings.mode, DeploymentMode.LOCAL)
        self.assertEqual(settings.port, 0)

    def test_configuration_rejects_unsafe_and_invalid_values_without_echoing_them(self) -> None:
        invalid = [
            {"PRODOPS_HOST": host} for host in ("0.0.0.0", "::", "localhost", "192.168.1.4")
        ] + [
            {"PRODOPS_PORT": value} for value in ("-1", "65536", "1.5", "", "secret-port-value")
        ] + [{"PRODOPS_ENVIRONMENT": "production"}, {"PRODOPS_MODE": "secret-mode-value"}]
        for values in invalid:
            with self.subTest(values=values):
                with self.assertRaises(ConfigurationError) as raised:
                    load_settings({"PRODOPS_MODE": "local", **values})
                self.assertNotIn("secret-", str(raised.exception))

    def test_unknown_configuration_does_not_silently_fall_back(self) -> None:
        with self.assertRaisesRegex(ConfigurationError, "PRODOPS_PORRT") as raised:
            load_settings({"PRODOPS_MODE": "local", "PRODOPS_PORRT": "secret-port"})
        self.assertNotIn("secret-port", str(raised.exception))

    def test_programmatic_settings_also_reject_network_exposure(self) -> None:
        with self.assertRaises(ValidationError):
            ServiceSettings.model_validate({"mode": "server", "host": "0.0.0.0"})
        with self.assertRaises(ValidationError):
            ServiceSettings.model_validate({"mode": "server", "environment": "production"})


class ApplicationTests(unittest.TestCase):
    def test_liveness_readiness_and_shutdown_for_both_entry_points(self) -> None:
        for mode, factory in (("local", create_local_app), ("server", create_server_app)):
            with self.subTest(mode=mode):
                app = factory()
                client = TestClient(app, base_url="http://127.0.0.1")
                self.assertEqual(client.get("/health/live").status_code, 200)
                self.assertEqual(client.get("/health/ready").status_code, 503)
                with client:
                    response = client.get("/health/ready")
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.json(), {
                        "status": "ready", "mode": mode, "scope": "service_skeleton",
                    })
                    self.assertEqual(response.headers["cache-control"], "no-store")
                self.assertEqual(client.get("/health/ready").status_code, 503)
                client.close()

    def test_host_header_is_restricted_and_no_cors_is_granted(self) -> None:
        with TestClient(create_local_app(), base_url="http://127.0.0.1") as client:
            self.assertEqual(client.get("/health/live", headers={"host": "attacker.example"}).status_code, 400)
            response = client.get("/health/live", headers={"origin": "https://attacker.example"})
            self.assertNotIn("access-control-allow-origin", response.headers)

    def test_applications_do_not_share_readiness(self) -> None:
        with TestClient(create_local_app(), base_url="http://127.0.0.1") as running:
            with TestClient(create_server_app(), base_url="http://127.0.0.1") as other:
                self.assertEqual(other.get("/health/ready").status_code, 200)
            self.assertEqual(running.get("/health/ready").status_code, 200)

    def test_startup_failure_is_not_reported_ready_and_cleanup_runs(self) -> None:
        app = create_local_app()
        with patch.object(HealthService, "start", new=AsyncMock(side_effect=RuntimeError("startup failed"))):
            with patch.object(HealthService, "stop", new=AsyncMock()) as stop:
                with self.assertRaisesRegex(RuntimeError, "startup failed"):
                    with TestClient(app, base_url="http://127.0.0.1"):
                        self.fail("startup failure must prevent serving")
                stop.assert_awaited_once()
        with TestClient(app, base_url="http://127.0.0.1") as recovered:
            self.assertEqual(recovered.get("/health/ready").status_code, 200)

    def test_import_and_factory_do_not_connect_or_bind_or_create_database(self) -> None:
        script = '''
from unittest.mock import patch
import os
with patch("socket.socket.connect", side_effect=AssertionError("network during import")), \
     patch("socket.socket.bind", side_effect=AssertionError("bind during import")), \
     patch("sqlite3.connect", side_effect=AssertionError("database during import")), \
     patch.dict(os.environ, {"PRODOPS_MODE": "invalid-secret"}):
    from prodops.bootstrap.app import create_app, create_local_app, create_server_app
    from prodops.bootstrap.cli import main
    create_local_app()
    create_server_app()
print("import and factories are inert")
'''
        result = subprocess.run([sys.executable, "-c", script], cwd=ROOT, env=clean_environment(),
                                capture_output=True, text=True, timeout=20, check=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("factories are inert", result.stdout)


class ProcessTests(unittest.TestCase):
    def run_cli(self, args: list[str], extra_env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
        return subprocess.run([sys.executable, "-m", "prodops.bootstrap.cli", *args],
                              cwd=ROOT, env={**clean_environment(), **(extra_env or {})},
                              capture_output=True, text=True, timeout=20, check=False)

    @contextmanager
    def running_service(self, mode: str, extra_env: dict[str, str] | None = None) -> Iterator[int]:
        entry = Path(sys.executable).parent / ("prodops-agent.exe" if os.name == "nt" else "prodops-agent")
        process = subprocess.Popen([str(entry), "--mode", mode],
                                   cwd=ROOT, env={**clean_environment(), **(extra_env or {})}, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True)
        lines: queue.Queue[str] = queue.Queue()

        def collect() -> None:
            assert process.stdout is not None
            for line in process.stdout:
                lines.put(line)

        reader = threading.Thread(target=collect, daemon=True)
        reader.start()
        output: list[str] = []
        try:
            deadline = time.monotonic() + 20
            while time.monotonic() < deadline:
                try:
                    line = lines.get(timeout=0.2)
                except queue.Empty:
                    if process.poll() is not None:
                        break
                    continue
                output.append(line)
                match = re.search(r"Uvicorn running on http://127\.0\.0\.1:(\d+)", line)
                if match:
                    yield int(match.group(1))
                    return
            self.fail("CLI did not start on loopback: " + "".join(output))
        finally:
            # Windows terminate is forced cleanup of this isolated child. ASGI
            # graceful shutdown is checked separately by TestClient lifespan.
            if process.poll() is None:
                process.terminate()
            process.wait(timeout=10)
            reader.join(timeout=5)
            if process.stdout is not None:
                process.stdout.close()

    def test_real_local_and_server_processes_serve_health_on_random_ports(self) -> None:
        opener = build_opener(ProxyHandler({}))
        for mode in ("local", "server"):
            with self.subTest(mode=mode), self.running_service(mode) as port:
                self.assertGreater(port, 0)
                for endpoint, status in (("live", "alive"), ("ready", "ready")):
                    with opener.open(f"http://127.0.0.1:{port}/health/{endpoint}", timeout=5) as response:
                        self.assertEqual(response.status, 200)
                        self.assertEqual(json.load(response), {
                            "status": status, "mode": mode, "scope": "service_skeleton",
                        })

    def test_cli_missing_required_configuration_exits_before_starting(self) -> None:
        result = self.run_cli([])
        self.assertEqual(result.returncode, 2)
        self.assertIn("mode: missing", result.stderr)
        self.assertNotIn("Uvicorn running", result.stderr)

    def test_actual_http_submission_continues_after_connection_closes_in_both_modes(self) -> None:
        opener = build_opener(ProxyHandler({}))
        token = "isolated-cli-test-token-000000000000000"
        headers = {"Authorization": f"Bearer {token}", "X-ProdOps-Protocol": "1.4", "Content-Type": "application/json"}
        with tempfile.TemporaryDirectory(prefix="prodops-runtime-http-") as directory:
            for mode in ("local", "server"):
                environment = {"PRODOPS_DATABASE": str(Path(directory) / f"{mode}.sqlite3"),
                               "PRODOPS_DEVELOPMENT_TOKEN": token, "PRODOPS_EXECUTION_ENABLED": "true"}
                with self.subTest(mode=mode), self.running_service(mode, environment) as port:
                    base = f"http://127.0.0.1:{port}"

                    def request(path: str, body: dict[str, object] | None = None) -> dict[str, Any]:
                        encoded = json.dumps(body).encode("utf-8") if body is not None else None
                        with opener.open(Request(base + path, data=encoded,
                                                 headers={**headers, "Idempotency-Key": str(uuid4())}), timeout=5) as response:
                            if path.endswith("/runs") and body is not None:
                                self.assertEqual(response.status, 202)
                            result: dict[str, Any] = json.load(response)
                            return result

                    workspace = request("/api/v1/workspaces")["items"][0]["workspace_id"]
                    conversation = request(f"/api/v1/workspaces/{workspace}/conversations", {"title": "Mock HTTP"})["conversation_id"]
                    submitted = request(f"/api/v1/conversations/{conversation}/runs", {"content": "camera offline", "execution_mode": "mock"})
                    # The submit response/socket is closed before any subsequent query.
                    for _ in range(100):
                        snapshot = request(f"/api/v1/runs/{submitted['run_id']}")
                        if snapshot["status"] in ("succeeded", "failed"):
                            break
                        time.sleep(0.02)
                    self.assertEqual(snapshot["status"], "succeeded")
                    self.assertEqual(len(snapshot["evidence"]), 3)
                    self.assertEqual(snapshot["resolution_status"], "unknown")
                    self.assertTrue(request("/api/v1/capabilities")["execution_enabled"])

    def test_cli_refuses_exposure_and_production_and_sanitizes_values(self) -> None:
        cases = [(["--mode", "server", "--host", "0.0.0.0"], {}),
                 (["--mode", "server"], {"PRODOPS_ENVIRONMENT": "production"}),
                 (["--mode", "secret-mode"], {}),
                 (["--mode", "local", "--port", "secret-port"], {})]
        for args, environment in cases:
            with self.subTest(args=args):
                result = self.run_cli(args, environment)
                self.assertEqual(result.returncode, 2)
                self.assertNotIn("secret-", result.stdout + result.stderr)
                self.assertNotIn("Uvicorn running", result.stderr)

    def test_complete_task_chain_and_paged_history_survive_real_restart_in_both_modes(self) -> None:
        opener = build_opener(ProxyHandler({}))
        token = "test-only-integration-token-000000000000000"
        headers = {"Authorization": f"Bearer {token}", "X-ProdOps-Protocol": "1.4", "Content-Type": "application/json"}
        with tempfile.TemporaryDirectory(prefix="prodops-task-core-") as directory:
            for mode in ("local", "server"):
                environment = {"PRODOPS_DATABASE": str(Path(directory) / f"{mode}.sqlite3"),
                               "PRODOPS_DEVELOPMENT_TOKEN": token, "PRODOPS_EXECUTION_ENABLED": "true"}
                base = ""

                def request(path: str, body: dict[str, object] | None = None, key: str | None = None) -> dict[str, Any]:
                    encoded = json.dumps(body).encode("utf-8") if body is not None else None
                    with opener.open(Request(base + path, data=encoded,
                                             headers={**headers, "Idempotency-Key": key or str(uuid4())}), timeout=10) as response:
                        if path.endswith("/runs") and body is not None:
                            self.assertEqual(response.status, 202)
                        result: dict[str, Any] = json.load(response)
                        return result

                def events(run_id: str, after: int = 0) -> list[dict[str, Any]]:
                    with opener.open(Request(base + f"/api/v1/runs/{run_id}/events", headers={**headers, "Last-Event-ID": str(after)}), timeout=10) as response:
                        self.assertTrue(response.headers["Content-Type"].startswith("text/event-stream"))
                        text = response.read(1024 * 1024 + 1).decode("utf-8")
                        self.assertLessEqual(len(text), 1024 * 1024)
                    return [json.loads(line[6:]) for line in text.splitlines() if line.startswith("data: ")]

                with self.subTest(mode=mode), self.running_service(mode, environment) as port:
                    base = f"http://127.0.0.1:{port}"
                    capabilities = request("/api/v1/capabilities")
                    workspace = request("/api/v1/workspaces")["items"][0]["workspace_id"]
                    conversation = request(f"/api/v1/workspaces/{workspace}/conversations", {"title": "Multi-turn integration"})["conversation_id"]
                    snapshots: list[dict[str, Any]] = []
                    for content in ("OCR quality drop", "Kafka backlog"):
                        key = str(uuid4())
                        body: dict[str, object] = {"content": content, "execution_mode": "mock"}
                        submitted = request(f"/api/v1/conversations/{conversation}/runs", body, key)
                        timeline = events(submitted["run_id"])
                        snapshot = request(f"/api/v1/runs/{submitted['run_id']}")
                        self.assertEqual((snapshot["status"], snapshot["resolution_status"]), ("succeeded", "unknown"))
                        self.assertEqual([item["seq"] for item in timeline], list(range(1, snapshot["last_event_seq"] + 1)))
                        self.assertEqual(timeline[-1]["event_type"], "run.completed")
                        self.assertEqual(len(snapshot["evidence"]), 3)
                        self.assertTrue(all(item["source"].startswith("mock://") for item in snapshot["evidence"]))
                        self.assertEqual(request(f"/api/v1/conversations/{conversation}/runs", body, key), submitted)
                        snapshots.append(snapshot)
                    first_page = request(f"/api/v1/conversations/{conversation}/runs?limit=1")
                    next_page = request(f"/api/v1/conversations/{conversation}/runs?limit=1&cursor={first_page['next_cursor']}")
                    self.assertEqual({first_page["items"][0]["run_id"], next_page["items"][0]["run_id"]}, {item["run_id"] for item in snapshots})
                    self.assertIsNone(next_page["next_cursor"])
                    messages = request(f"/api/v1/conversations/{conversation}/messages")
                    self.assertEqual(len(messages["items"]), 4)
                    self.assertEqual(sum(item["role"] == "assistant" for item in messages["items"]), 2)
                # A new installed CLI process reopens the same database and service lock.
                with self.running_service(mode, environment) as port:
                    base = f"http://127.0.0.1:{port}"
                    self.assertEqual(request("/api/v1/capabilities")["deployment_id"], capabilities["deployment_id"])
                    self.assertEqual(request("/api/v1/workspaces")["items"][0]["workspace_id"], workspace)
                    self.assertEqual(request(f"/api/v1/conversations/{conversation}/messages"), messages)
                    history = request(f"/api/v1/conversations/{conversation}/runs")
                    self.assertEqual({item["run_id"] for item in history["items"]}, {item["run_id"] for item in snapshots})
                    for snapshot in snapshots:
                        self.assertEqual(request(f"/api/v1/runs/{snapshot['run_id']}"), snapshot)
                        self.assertEqual(events(snapshot["run_id"], snapshot["last_event_seq"]), [])
                        replay = events(snapshot["run_id"], 5)
                        self.assertEqual([item["seq"] for item in replay], list(range(6, snapshot["last_event_seq"] + 1)))

    def test_port_conflict_is_a_real_startup_failure(self) -> None:
        with socket.socket() as occupied:
            occupied.bind(("127.0.0.1", 0))
            occupied.listen()
            result = self.run_cli(["--mode", "local", "--port", str(occupied.getsockname()[1])])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("error while attempting to bind", result.stderr.lower())


if __name__ == "__main__":
    unittest.main()
