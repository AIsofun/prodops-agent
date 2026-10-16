"""Contract behavior at real app boundaries and reserved future DTO boundaries."""

from __future__ import annotations

import copy
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient
from pydantic import TypeAdapter, ValidationError

from prodops.api.models import (
    DTO, Conversation, ErrorResponse, Message, PageQuery, ReplayCursor,
    RunCreateRequest, RunEvent, RunSnapshot, SubmissionHeaders,
)
from prodops.bootstrap.app import create_local_app, create_server_app

ROOT = Path(__file__).resolve().parents[3]
EXPORTER = ROOT / "services/agent/scripts/export_contracts.py"
EVENT = TypeAdapter(RunEvent)


def fixtures() -> dict[str, Any]:
    sample: dict[str, Any] = json.loads((ROOT / "contracts/examples.json").read_text(encoding="utf-8"))
    return sample


class BoundaryTests(unittest.TestCase):
    def test_capabilities_and_exact_protocol_negotiation_in_both_modes(self) -> None:
        ids: set[str] = set()
        for mode, factory in (("local", create_local_app), ("server", create_server_app)):
            with self.subTest(mode=mode), TestClient(factory(), base_url="http://127.0.0.1") as client:
                response = client.get("/api/v1/capabilities")
                self.assertEqual(response.status_code, 200)
                body = response.json()
                ids.add(body.pop("deployment_id"))
                self.assertEqual(body, {"protocol_version": "1.2", "event_schema_version": "1.0",
                    "mode": mode, "scope": "service_skeleton", "authentication": "unavailable",
                    "conversations": False, "runs": False, "event_stream": False, "execution_enabled": False})
                self.assertEqual(response.headers["cache-control"], "no-store")
                self.assertEqual(client.get("/api/v1/capabilities").json()["deployment_id"], response.json()["deployment_id"])
                self.assertEqual(client.get("/api/v1/capabilities", headers={"X-ProdOps-Protocol": "1.2"}).status_code, 200)
                for version in ("2.0", "1.1", "1.0", "1", "", " 1.2", "secret-client-input"):
                    rejected = client.get("/api/v1/capabilities", headers={"X-ProdOps-Protocol": version})
                    self.assertEqual(rejected.status_code, 426)
                    error = ErrorResponse.model_validate(rejected.json())
                    self.assertEqual(error.error.code, "incompatible_protocol")
                    self.assertFalse(error.error.retryable)
                    self.assertNotIn("secret-client-input", rejected.text)
                    self.assertEqual(rejected.headers["x-request-id"], str(error.request_id))
                for path in ("/api/v1/conversations", "/api/v1/runs", "/api/v1/runs/example/events"):
                    self.assertEqual(client.get(path).status_code, 404)
        self.assertEqual(len(ids), 2)

    def test_reserved_request_validation_with_a_test_only_route_is_sanitized(self) -> None:
        app = create_local_app()

        @app.post("/test-only", response_model=RunCreateRequest)
        async def validate_request(body: RunCreateRequest) -> RunCreateRequest:
            return body

        with TestClient(app, base_url="http://127.0.0.1") as client:
            response = client.post("/test-only", json={"content": "  inspect camera  ", "execution_mode": "mock"})
            self.assertEqual(response.json(), {"content": "inspect camera", "execution_mode": "mock"})
            for body in ({"content": "   "}, {"content": 42}, {"content": "ok", "secret": "credential-value"}):
                response = client.post("/test-only", json=body)
                self.assertEqual(response.status_code, 422)
                self.assertEqual(ErrorResponse.model_validate(response.json()).error.code, "invalid_request")
                self.assertNotIn("credential-value", response.text)
                self.assertNotIn("secret", response.text)
            self.assertEqual(client.post("/test-only", content='{bad-secret-json').status_code, 422)


class DTOTests(unittest.TestCase):
    def test_examples_cover_all_event_variants_and_four_outcomes(self) -> None:
        sample = fixtures()
        for model, key in ((Conversation, "conversations"), (Message, "messages"),
                           (RunSnapshot, "snapshots"), (ErrorResponse, "errors")):
            for item in sample[key]:
                model.model_validate_json(json.dumps(item))
        tags = set()
        for item in sample["events"]:
            event = EVENT.validate_json(json.dumps(item))
            self.assertEqual(event.model_dump(mode="json"), item)
            tags.add(event.event_type)
        schema = EVENT.json_schema()
        self.assertEqual(tags, set(schema["discriminator"]["mapping"]))
        self.assertEqual({item["status"] for item in sample["snapshots"]},
                         {"succeeded", "failed", "cancelled", "recovery_required"})
        self.assertEqual(sample["snapshots"][0]["resolution_status"], "unknown")

    def test_event_envelope_rejects_bad_versions_cursors_ids_and_timestamps(self) -> None:
        valid = fixtures()["events"][0]
        invalid = [("schema_version", "2.0"), ("event_type", "unrecognized"),
                   ("run_id", "not-a-uuid"), ("seq", 0), ("seq", -1), ("seq", True),
                   ("seq", "1"), ("seq", 1.5), ("seq", 9007199254740992),
                   ("occurred_at", "2026-10-16T08:00:00"),
                   ("occurred_at", "2026-10-16T16:00:00+08:00"),
                   ("occurred_at", 1792137600), ("occurred_at", "1792137600"),
                   ("occurred_at", True), ("extra", "secret")]
        for key, value in invalid:
            with self.subTest(key=key, value=value), self.assertRaises(ValidationError):
                EVENT.validate_python({**valid, key: value})
        for key in ("schema_version", "run_id", "seq", "occurred_at", "event_type", "payload"):
            value = dict(valid)
            del value[key]
            with self.subTest(missing=key), self.assertRaises(ValidationError):
                EVENT.validate_python(value)

    def test_event_payload_cannot_be_swapped_or_contain_unknown_fields(self) -> None:
        valid = fixtures()["events"][0]
        for payload in ({"message_id": valid["run_id"], "delta": "text"},
                        {**valid["payload"], "credential": "secret"}):
            with self.assertRaises(ValidationError):
                EVENT.validate_python({**valid, "payload": payload})
        completed = fixtures()["events"][4]
        with self.assertRaises(ValidationError):
            EVENT.validate_python({**completed, "payload": {**completed["payload"], "status": "running"}})

    def test_pagination_idempotency_and_replay_bounds(self) -> None:
        self.assertEqual(PageQuery().limit, 50)
        for bad in (0, 101, True, "50"):
            with self.assertRaises(ValidationError):
                PageQuery.model_validate({"limit": bad})
        with self.assertRaises(ValidationError):
            PageQuery.model_validate({"cursor": ""})
        with self.assertRaises(ValidationError):
            SubmissionHeaders.model_validate({"idempotency_key": ""})
        run_id = fixtures()["events"][0]["run_id"]
        self.assertEqual(ReplayCursor.model_validate({"run_id": run_id, "after_seq": 0}).after_seq, 0)
        for bad in (-1, True, "1", 9007199254740992):
            with self.assertRaises(ValidationError):
                ReplayCursor.model_validate({"run_id": run_id, "after_seq": bad})


class ExportTests(unittest.TestCase):
    def test_generated_types_compile_with_a_typed_consumer(self) -> None:
        node = shutil.which("node")
        self.assertIsNotNone(node, "locked Node environment required")
        assert node is not None
        result = subprocess.run([node, "node_modules/typescript/bin/tsc", "--noEmit", "-p",
                                 "packages/api-client/tsconfig.json"], cwd=ROOT,
                                capture_output=True, text=True, timeout=30, check=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_export_matches_both_apps_and_cli_is_inert_even_from_another_directory(self) -> None:
        expected = create_local_app().openapi()
        self.assertEqual(expected, create_server_app().openapi())
        with tempfile.TemporaryDirectory(prefix="prodops-export-test-") as directory:
            output = Path(directory) / "nested/openapi.json"
            script = '''
import runpy,sys
from unittest.mock import patch
with patch("socket.socket.connect", side_effect=AssertionError("network access")), \\
     patch("socket.socket.bind", side_effect=AssertionError("socket bind")), \\
     patch("sqlite3.connect", side_effect=AssertionError("database access")):
    sys.argv = [sys.argv[1], "--output", sys.argv[2]]
    runpy.run_path(sys.argv[0], run_name="__main__")
'''
            result = subprocess.run([sys.executable, "-c", script, str(EXPORTER), str(output)],
                                    cwd=directory, capture_output=True, text=True, timeout=30, check=False)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(json.loads(output.read_text(encoding="utf-8")), expected)
        self.assertEqual(expected, json.loads((ROOT / "contracts/openapi.json").read_text(encoding="utf-8")))

    def test_schema_uses_actual_routes_and_formal_reserved_models(self) -> None:
        class Probe(DTO):
            marker: int

        app = create_local_app()

        @app.get("/test-only", response_model=Probe)
        async def probe() -> Probe:
            return Probe(marker=1)

        schema = app.openapi()
        self.assertIn("/test-only", schema["paths"])
        self.assertIn("Probe", schema["components"]["schemas"])
        self.assertEqual(set(create_local_app().openapi()["paths"]),
                         {"/health/live", "/health/ready", "/api/v1/capabilities", "/api/v1/workspaces",
                          "/api/v1/workspaces/{workspace_id}/conversations", "/api/v1/conversations/{conversation_id}/messages",
                          "/api/v1/conversations/{conversation_id}/runs", "/api/v1/runs/{run_id}"})
        registry = schema["components"]["schemas"]["ReservedContracts"]
        self.assertEqual(registry["properties"]["event"]["discriminator"]["propertyName"], "event_type")
        self.assertIn("RunSnapshot", schema["components"]["schemas"])

    def test_real_artifact_drift_is_rejected_without_rewriting(self) -> None:
        from scripts.check_contracts import EXPORTER as exporter, SNAPSHOT, TYPES, VALIDATORS, VALIDATOR_GENERATOR, check

        node = shutil.which("node")
        self.assertIsNotNone(node, "locked Node environment required")
        assert node is not None
        with tempfile.TemporaryDirectory(prefix="prodops-drift-test-") as directory:
            root = Path(directory)
            for relative in (exporter, SNAPSHOT, TYPES, VALIDATORS, VALIDATOR_GENERATOR):
                target = root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / relative, target)
            self.assertEqual(check(root, sys.executable, node, ROOT), ([], 0))
            changed = copy.deepcopy(json.loads((root / SNAPSHOT).read_text(encoding="utf-8")))
            changed["components"]["schemas"]["RunSnapshot"]["properties"]["last_event_seq"]["type"] = "string"
            (root / SNAPSHOT).write_text(json.dumps(changed), encoding="utf-8")
            before = hashlib.sha256((root / SNAPSHOT).read_bytes()).hexdigest()
            errors, code = check(root, sys.executable, node, ROOT)
            self.assertEqual(code, 1)
            self.assertTrue(any("Exported OpenAPI differs" in error for error in errors))
            self.assertEqual(hashlib.sha256((root / SNAPSHOT).read_bytes()).hexdigest(), before)
            shutil.copyfile(ROOT / SNAPSHOT, root / SNAPSHOT)
            with (root / TYPES).open("a", encoding="utf-8") as stream:
                stream.write("\nexport type UnreviewedDrift = string;\n")
            before_types = (root / TYPES).read_bytes()
            errors, code = check(root, sys.executable, node, ROOT)
            self.assertEqual(code, 1)
            self.assertTrue(any("Generated TS types differ" in error for error in errors))
            self.assertEqual((root / TYPES).read_bytes(), before_types)
            shutil.copyfile(ROOT / TYPES, root / TYPES)
            (root / VALIDATORS).write_text("// invalid runtime validator", encoding="utf-8")
            before_validators = (root / VALIDATORS).read_bytes()
            errors, code = check(root, sys.executable, node, ROOT)
            self.assertEqual(code, 1)
            self.assertTrue(any("runtime validators differ" in error for error in errors))
            self.assertEqual((root / VALIDATORS).read_bytes(), before_validators)


if __name__ == "__main__":
    unittest.main()
