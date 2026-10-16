"""Behavioral regression cases: violations must be rejected, missing products never pass."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.check import Result, aggregate, execute, run
from scripts.check_boundaries import check as check_python
from scripts.check_contracts import EXPORTER, GENERATOR, SNAPSHOT, TYPES, VALIDATOR_GENERATOR, VALIDATORS
from scripts.check_contracts import check as check_contracts, has_external_reference
from scripts.check_delivery import validate as check_delivery

REPO = Path(__file__).resolve().parents[2]
NODE = shutil.which("node") or "node"


class WorkspaceCase(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory(prefix="prodops-quality-")
        self.root = Path(self.directory.name)

    def tearDown(self) -> None:
        self.directory.cleanup()

    def write(self, name: str | Path, content: str) -> Path:
        target = self.root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return target


class GateResults(WorkspaceCase):
    def test_report_and_unicode_output_survive_a_legacy_windows_encoding(self) -> None:
        script = '''
import sys
from pathlib import Path
import scripts.check as check
check.ROOT = Path(sys.argv[1]).resolve()
check.run = lambda root, profile: [check.Result("unicode", "PASS", "\\u2714 \\u4e2d\\u6587", [])]
sys.argv = ["check", "--profile", "docs", "--report", "unicode.json"]
raise SystemExit(check.main())
'''
        result = subprocess.run([sys.executable, "-c", script, str(self.root)], cwd=REPO,
                                env={**os.environ, "PYTHONUTF8": "0", "PYTHONIOENCODING": "cp1252"},
                                capture_output=True, text=True, encoding="utf-8", timeout=20, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("\u2714 \u4e2d\u6587", result.stdout)
        self.assertEqual(json.loads((self.root / "unicode.json").read_text(encoding="utf-8"))["status"], "PASS")

    def test_no_checks_is_not_success(self) -> None:
        self.assertEqual(aggregate([]), ("NOT_READY", 2))

    def test_unready_check_prevents_success(self) -> None:
        self.assertEqual(aggregate([Result("a", "PASS", "", []), Result("b", "NOT_READY", "", [])]), ("NOT_READY", 2))

    def test_failure_takes_precedence(self) -> None:
        self.assertEqual(aggregate([Result("a", "FAIL", "", []), Result("b", "NOT_READY", "", [])]), ("FAIL", 1))

    def test_subprocess_status_and_reported_command(self) -> None:
        args = [sys.executable, "-c", "raise SystemExit(2)"]
        result = execute("fixture", args, self.root, unready_exit=True)
        self.assertEqual(result.status, "NOT_READY")
        self.assertEqual(result.command, args)

    def test_external_tool_exit_two_is_a_failure(self) -> None:
        result = execute("external", [sys.executable, "-c", "raise SystemExit(2)"], self.root)
        self.assertEqual(result.status, "FAIL")

    def test_service_profile_runs_behavior_and_excludes_unbuilt_desktop(self) -> None:
        def fake_execute(name: str, args: list[str], root: Path,
                         required: list[Path] | None = None, *, unready_exit: bool = False) -> Result:
            return Result(name, "PASS", "fixture", args)

        with patch("scripts.check.environment_check", return_value=Result("environment", "PASS", "", [])):
            with patch("scripts.check.execute", side_effect=fake_execute):
                results = run(self.root, "service")
        names = [result.name for result in results]
        self.assertIn("harness-regressions", names)
        self.assertIn("product-python-types", names)
        self.assertIn("product-python-boundaries", names)
        self.assertIn("product-python-behavior", names)
        self.assertNotIn("product-typescript-types", names)
        self.assertNotIn("product-contracts", names)

    def test_missing_service_behavior_suite_is_not_ready(self) -> None:
        result = execute("product-python-behavior", [sys.executable, "-m", "unittest", "discover"],
                         self.root, [self.root / "services/agent/tests/test_service.py"])
        self.assertEqual(result.status, "NOT_READY")

    def test_mypy_rejects_real_assignment_error(self) -> None:
        config = self.write("mypy.ini", "[mypy]\n")
        result = execute("bad-python", [sys.executable, "-m", "mypy", "--config-file", str(config), "--no-incremental", "-c", "value: int = 'wrong'"], REPO)
        self.assertEqual(result.status, "FAIL", result.detail)
        self.assertIn("Incompatible types", result.detail)

    def test_typescript_rejects_real_assignment_error(self) -> None:
        source = self.write("invalid.ts", 'const value: number = "wrong";\n')
        result = execute("bad-ts", [NODE, str(REPO / "node_modules/typescript/bin/tsc"), "--noEmit", "--strict", "--skipLibCheck", str(source)], REPO)
        self.assertEqual(result.status, "FAIL", result.detail)
        self.assertIn("TS2322", result.detail)


class PythonBoundaries(WorkspaceCase):
    def source(self, layer: str, content: str) -> None:
        self.write(f"services/agent/src/prodops/{layer}/sample.py", content)

    def test_missing_product_is_not_ready(self) -> None:
        self.assertEqual(check_python(self.root)[1], 2)

    def test_domain_stdlib_and_application_domain_are_allowed(self) -> None:
        self.source("domain", "from dataclasses import dataclass\n")
        self.source("application", "from prodops.domain import sample\n")
        self.assertEqual(check_python(self.root), ([], 0))

    def test_domain_cannot_depend_on_fastapi(self) -> None:
        self.source("domain", "from fastapi import FastAPI\n")
        self.assertIn("domain cannot import external", "\n".join(check_python(self.root)[0]))

    def test_relative_import_cannot_cross_into_api(self) -> None:
        self.source("domain", "from .. import api\n")
        self.assertIn("domain cannot import prodops.api", "\n".join(check_python(self.root)[0]))

    def test_reversed_adapter_dependency_is_rejected(self) -> None:
        self.source("application", "import prodops.adapters.database\n")
        self.assertEqual(check_python(self.root)[1], 1)

    def test_comments_are_not_imports(self) -> None:
        self.source("domain", '# import fastapi\nmessage = "import prodops.api"\n')
        self.assertEqual(check_python(self.root)[1], 0)

    def test_dynamic_loading_is_rejected(self) -> None:
        self.source("domain", '__import__("fastapi")\n')
        self.assertEqual(check_python(self.root)[1], 1)


class TypeScriptBoundaries(WorkspaceCase):
    def setUp(self) -> None:
        super().setUp()
        self.write("apps/desktop/tsconfig.json", json.dumps({"compilerOptions": {
            "baseUrl": ".", "paths": {"@/*": ["src/*"]},
            "module": "NodeNext", "moduleResolution": "NodeNext"}}))
        for layer in ("main", "preload", "renderer", "shared"):
            self.write(f"apps/desktop/src/{layer}/index.ts", "export const value = 1;\n")

    def check(self) -> Result:
        return execute("fixture-ts-boundaries", [NODE, str(REPO / "scripts/check_ts_boundaries.ts"), "--root", str(self.root)], REPO)

    def test_shared_types_and_comments_are_allowed(self) -> None:
        self.write("apps/desktop/src/renderer/index.ts", '// import fs from "node:fs";\nimport { value } from "../shared/index.js";\n')
        self.assertEqual(self.check().status, "PASS")

    def test_reexport_of_node_module_is_rejected(self) -> None:
        self.write("apps/desktop/src/renderer/index.ts", 'export * from "node:fs";\n')
        self.assertEqual(self.check().status, "FAIL")

    def test_preload_cannot_import_child_process(self) -> None:
        self.write("apps/desktop/src/preload/index.ts", 'import { exec } from "node:child_process";\n')
        self.assertEqual(self.check().status, "FAIL")

    def test_alias_cannot_hide_main_import(self) -> None:
        self.write("apps/desktop/src/renderer/index.ts", 'import { value } from "@/main/index.js";\n')
        self.assertEqual(self.check().status, "FAIL")

    def test_require_cannot_hide_main_import(self) -> None:
        self.write("apps/desktop/src/renderer/index.ts", 'const value = require("../main/index.js");\n')
        self.assertEqual(self.check().status, "FAIL")

    def test_nonliteral_dynamic_loading_is_rejected(self) -> None:
        self.write("apps/desktop/src/renderer/index.ts", 'const moduleName = "node:fs"; import(moduleName);\n')
        self.assertEqual(self.check().status, "FAIL")


class Contracts(WorkspaceCase):
    def setUp(self) -> None:
        super().setUp()
        self.schema = {
            "openapi": "3.1.0", "info": {"title": "Harness fixture", "version": "1"},
            "paths": {}, "components": {"schemas": {"Health": {
                "type": "object", "properties": {"status": {"type": "string"}}, "required": ["status"]}}}}
        self.write(SNAPSHOT, json.dumps(self.schema))
        self.write(VALIDATORS, "// harness validator fixture\n")
        self.write(VALIDATOR_GENERATOR, 'import fs from "node:fs";\nfs.writeFileSync(process.argv[process.argv.indexOf("--output") + 1], "// harness validator fixture\\n");\n')
        self.write(EXPORTER, "import json,sys\nfrom pathlib import Path\n"
                   f"schema = json.loads({json.dumps(self.schema)!r})\n"
                   "Path(sys.argv[sys.argv.index('--output') + 1]).write_text(json.dumps(schema), encoding='utf-8')\n")
        output = self.root / TYPES
        output.parent.mkdir(parents=True, exist_ok=True)
        result = subprocess.run([NODE, str(REPO / GENERATOR), str(self.root / SNAPSHOT), "--output", str(output)],
                                capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30, check=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_matching_export_and_generated_types_pass(self) -> None:
        self.assertEqual(check_contracts(self.root, sys.executable, NODE, REPO), ([], 0))

    def test_stale_schema_is_rejected(self) -> None:
        changed = json.loads((self.root / SNAPSHOT).read_text(encoding="utf-8"))
        changed["info"]["version"] = "changed"
        self.write(SNAPSHOT, json.dumps(changed))
        errors, code = check_contracts(self.root, sys.executable, NODE, REPO)
        self.assertEqual(code, 1)
        self.assertTrue(any("Exported OpenAPI differs" in error for error in errors))

    def test_stale_types_are_rejected(self) -> None:
        self.write(TYPES, "export interface Health { incorrect: number }\n")
        errors, code = check_contracts(self.root, sys.executable, NODE, REPO)
        self.assertEqual(code, 1)
        self.assertTrue(any("Generated TS types differ" in error for error in errors))

    def test_missing_exporter_is_not_ready(self) -> None:
        (self.root / EXPORTER).unlink()
        self.assertEqual(check_contracts(self.root, sys.executable, NODE, REPO)[1], 2)

    def test_stale_runtime_validators_are_rejected(self) -> None:
        self.write(VALIDATORS, "// stale runtime validator\n")
        errors, code = check_contracts(self.root, sys.executable, NODE, REPO)
        self.assertEqual(code, 1)
        self.assertTrue(any("runtime validators differ" in error for error in errors))

    def test_nested_external_references_are_rejected(self) -> None:
        self.assertTrue(has_external_reference({"components": [{"$ref": "https://example.invalid/schema.json"}]}))
        self.assertFalse(has_external_reference({"$ref": "#/components/schemas/Health"}))


class DeliveryRecords(WorkspaceCase):
    def setUp(self) -> None:
        super().setUp()
        self.write("docs/requirements.md", "| REQ-001 | confirmed | acceptance |\n")
        self.write("docs/engineering-constraints.md", "| HAR-001 | rule | acceptance |\n")
        self.write("docs/tasks/m1/one.md", "# Task\nM1-T01-AC01\n")
        self.task: dict[str, object] = {"id": "M1-T01", "state": "not_started", "depends_on": [],
            "requirements": ["REQ-001"], "acceptance": ["M1-T01-AC01"], "card": "docs/tasks/m1/one.md"}

    def manifest(self, tasks: list[dict[str, object]]) -> None:
        self.write("docs/tasks/m1/tasks.json", json.dumps(tasks))

    def test_unstarted_card_is_valid(self) -> None:
        self.manifest([self.task])
        self.assertEqual(check_delivery(self.root), [])

    def test_fake_verified_task_is_rejected(self) -> None:
        self.task["state"] = "verified"
        self.manifest([self.task])
        self.assertTrue(check_delivery(self.root))

    def test_dependency_cycle_is_rejected(self) -> None:
        other = {**self.task, "id": "M1-T02", "depends_on": ["M1-T01"]}
        self.task["depends_on"] = ["M1-T02"]
        self.manifest([self.task, other])
        self.assertTrue(any("cycle" in error for error in check_delivery(self.root)))

    def test_undefined_requirement_is_rejected(self) -> None:
        self.task["requirements"] = ["REQ-999"]
        self.manifest([self.task])
        self.assertTrue(any("undefined requirement" in error for error in check_delivery(self.root)))

    def completed_task(self) -> None:
        self.write("implementation.py", "value = 1\n")
        self.write("evidence.md", "Fixture acceptance result\n")
        self.write("review.md", "Fixture self review\n")
        self.write("verification.json", json.dumps({"schema_version": 1, "task_id": "M1-T01",
            "environment": {"python": "fixture"}, "source": {"revision": "fixture"},
            "criteria": [{"id": "M1-T01-AC01", "status": "PASS", "evidence": "evidence.md"}]}))
        self.write("review.json", json.dumps({"schema_version": 1, "task_id": "M1-T01", "mode": "self_review",
            "reviewer": "fixture", "decision": "approved", "record": "review.md", "findings": []}))
        self.task.update(state="verified", implementation=["implementation.py"], verification="verification.json", review="review.json")

    def test_complete_receipts_are_valid(self) -> None:
        self.completed_task()
        self.manifest([self.task])
        self.assertEqual(check_delivery(self.root), [])

    def test_receipts_work_with_a_noncanonical_workspace_root(self) -> None:
        self.completed_task()
        self.manifest([self.task])
        (self.root / "alias").mkdir()
        self.assertEqual(check_delivery(self.root / "alias" / ".."), [])

    def test_cross_milestone_dependency_requires_verified_delivery(self) -> None:
        self.completed_task()
        self.manifest([self.task])
        self.write("docs/tasks/m2/one.md", "# Task\nM2-T01-AC01\n")
        second = {"id": "M2-T01", "state": "in_progress", "depends_on": ["M1-T01"],
                  "requirements": ["REQ-001"], "acceptance": ["M2-T01-AC01"], "card": "docs/tasks/m2/one.md"}
        self.write("docs/tasks/m2/tasks.json", json.dumps([second]))
        self.assertEqual(check_delivery(self.root), [])
        self.task["state"] = "implemented"
        self.manifest([self.task])
        self.assertTrue(any("unfinished dependencies" in error for error in check_delivery(self.root)))

    def test_open_review_finding_prevents_verified(self) -> None:
        self.completed_task()
        review = json.loads((self.root / "review.json").read_text(encoding="utf-8"))
        review["findings"] = [{"id": "R1", "status": "open", "reason": "not fixed"}]
        self.write("review.json", json.dumps(review))
        self.manifest([self.task])
        self.assertTrue(any("Open review findings" in error for error in check_delivery(self.root)))

    def test_missing_acceptance_evidence_prevents_verified(self) -> None:
        self.completed_task()
        evidence = json.loads((self.root / "verification.json").read_text(encoding="utf-8"))
        evidence["criteria"][0]["status"] = "NOT_RUN"
        self.write("verification.json", json.dumps(evidence))
        self.manifest([self.task])
        self.assertTrue(any("Acceptance evidence incomplete" in error for error in check_delivery(self.root)))


if __name__ == "__main__":
    unittest.main()
