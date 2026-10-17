"""Inherited-pipe startup through real isolated Python children, never production data."""

from __future__ import annotations

import json
import os
from pathlib import Path
import queue
import subprocess
import sys
import tempfile
import threading
from typing import Any
import unittest
from urllib.error import HTTPError
from urllib.request import ProxyHandler, Request, build_opener
from uuid import uuid4

from prodops.api.models import DesktopStartupRequest

TOKEN = "test-only-pipe-token-000000000000000000000"


class DesktopBootstrapTests(unittest.TestCase):
    def setUp(self) -> None:
        self.readers: dict[subprocess.Popen[str], list[threading.Thread]] = {}

    def start(self, path: Path) -> tuple[subprocess.Popen[str], dict[str, Any], queue.Queue[str]]:
        environment = {key: value for key, value in os.environ.items() if not key.startswith("PRODOPS_")}
        environment["PYTHONUTF8"] = "1"
        child = subprocess.Popen([sys.executable, "-m", "prodops.bootstrap.desktop"],
                                 stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 text=True, encoding="utf-8", env=environment)
        self.addCleanup(self.cleanup, child)
        message = {"startup_version": "1.0", "instance_id": str(uuid4()), "token": TOKEN, "database_path": str(path)}
        assert child.stdin is not None and child.stdout is not None and child.stderr is not None
        child.stdin.write(json.dumps(message) + "\n")
        child.stdin.flush()
        lines: queue.Queue[str] = queue.Queue()

        def read_output() -> None:
            assert child.stdout is not None
            for line in child.stdout:
                lines.put(line)

        reader = threading.Thread(target=read_output, daemon=True)
        reader.start()
        # Drain stderr so a diagnostic cannot fill the child's pipe.
        errors: list[str] = []

        def read_errors() -> None:
            assert child.stderr is not None
            for line in child.stderr:
                errors.append(line)

        error_reader = threading.Thread(target=read_errors, daemon=True)
        error_reader.start()
        self.readers[child] = [reader, error_reader]
        line = lines.get(timeout=20)
        self.assertNotIn(TOKEN, line)
        ready: dict[str, Any] = json.loads(line)
        self.assertEqual(ready["type"], "ready")
        self.assertEqual(ready["instance_id"], message["instance_id"])
        self.assertEqual((ready["host"], ready["mode"], ready["protocol_version"]), ("127.0.0.1", "local", "1.4"))
        self.assertTrue(ready["process_id"] == child.pid or ready["parent_process_id"] == child.pid)
        self.assertGreater(ready["port"], 0)
        self.assertNotIn(TOKEN, "".join(errors))
        return child, ready, lines

    def cleanup(self, child: subprocess.Popen[str]) -> None:
        if child.stdin is not None and not child.stdin.closed:
            child.stdin.close()
        if child.poll() is None:
            try:
                child.wait(timeout=15)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait(timeout=10)
        for reader in self.readers.pop(child, []):
            reader.join(timeout=5)
        for stream in (child.stdout, child.stderr):
            if stream is not None:
                stream.close()

    def test_pipe_ready_requires_token_and_stop_releases_database_for_next_launch(self) -> None:
        opener = build_opener(ProxyHandler({}))
        with tempfile.TemporaryDirectory(prefix="prodops-desktop-pipe-") as directory:
            database = Path(directory) / "数据.sqlite3"
            child, ready, lines = self.start(database)
            with self.assertRaises(HTTPError) as unauthorized:
                opener.open(f"http://127.0.0.1:{ready['port']}/api/v1/workspaces", timeout=5)
            self.assertEqual(unauthorized.exception.code, 401)
            request = Request(f"http://127.0.0.1:{ready['port']}/api/v1/workspaces",
                              headers={"Authorization": f"Bearer {TOKEN}", "X-ProdOps-Protocol": "1.4"})
            with opener.open(request, timeout=5) as response:
                self.assertEqual(json.load(response)["items"][0]["deployment_id"], ready["deployment_id"])
            assert child.stdin is not None
            child.stdin.write(json.dumps({"type": "stop", "instance_id": ready["instance_id"]}) + "\n")
            child.stdin.flush()
            self.assertEqual(child.wait(timeout=15), 0)
            self.assertTrue(lines.empty(), "stdout must contain only the startup handshake")
            second, restarted, _ = self.start(database)
            self.assertEqual(restarted["deployment_id"], ready["deployment_id"])
            assert second.stdin is not None
            second.stdin.close()
            self.assertEqual(second.wait(timeout=15), 0)
            self.cleanup(child)
            self.cleanup(second)

    def test_invalid_input_is_safe_and_does_not_create_database(self) -> None:
        with tempfile.TemporaryDirectory(prefix="prodops-pipe-invalid-") as directory:
            path = Path(directory) / "not-created.sqlite3"
            valid = {"startup_version": "1.0", "instance_id": str(uuid4()), "token": TOKEN, "database_path": str(path)}
            cases = ["bad-secret-json\n", json.dumps({**valid, "database_path": "relative.sqlite3"}) + "\n",
                     json.dumps({**valid, "token": "short-secret"}) + "\n", "x" * 32769 + "\n"]
            for message in cases:
                result = subprocess.run([sys.executable, "-m", "prodops.bootstrap.desktop"], input=message,
                                        capture_output=True, text=True, encoding="utf-8", timeout=20, check=False)
                self.assertEqual(result.returncode, 2)
                self.assertEqual(json.loads(result.stdout)["type"], "error")
                self.assertNotIn(TOKEN, result.stdout + result.stderr)
                self.assertNotIn("short-secret", result.stdout + result.stderr)
                self.assertNotIn("bad-secret-json", result.stdout + result.stderr)
            self.assertFalse(path.exists())
            model = DesktopStartupRequest.model_validate(valid)
            self.assertNotIn(TOKEN, repr(model))


if __name__ == "__main__":
    unittest.main()
