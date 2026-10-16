"""Inject defects into isolated copies of real product sources and exercise product gates."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Callable

from scripts.check import Result, execute
from scripts.check_contracts import check as check_contracts

ROOT = Path(__file__).resolve().parents[1]


def verify(report: Path) -> int:
    reports = (ROOT / ".quality-reports").resolve()
    reports.mkdir(exist_ok=True)
    python = ROOT / (".venv/Scripts/python.exe" if os.name == "nt" else ".venv/bin/python")
    node = shutil.which("node") or "node"
    tsc = ROOT / "node_modules/typescript/bin/tsc"
    records: list[dict[str, object]] = []
    with tempfile.TemporaryDirectory(prefix="product-gates-", dir=reports) as directory:
        root = Path(directory).resolve()
        if not root.is_relative_to(reports):
            raise ValueError("Isolated copy must stay inside the report workspace")
        for relative in ("apps/desktop/src", "services/agent/src", "services/agent/tests",
                         "services/agent/scripts", "packages/api-client", "contracts", "scripts"):
            shutil.copytree(ROOT / relative, root / relative, ignore=shutil.ignore_patterns("__pycache__", ".mypy_cache"))
        for relative in ("apps/desktop/tsconfig.json", "apps/desktop/tsconfig.renderer.json",
                         "apps/desktop/package.json", "services/agent/pyproject.toml", "package.json"):
            target = root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / relative, target)

        def run(name: str, args: list[str], expected: str = "PASS") -> None:
            result = execute(name, args, root)
            records.append({"name": name, "expected": expected, "actual": result.status,
                            "passed": result.status == expected, "command": args, "detail": result.detail})

        def typescript() -> list[str]:
            return [node, str(tsc), "--noEmit", "-p", str(root / "apps/desktop/tsconfig.json")]

        def backend_types() -> list[str]:
            return [str(python), "-m", "mypy", "--config-file", str(root / "services/agent/pyproject.toml")]

        def contract(name: str, expected: int) -> None:
            previous = os.environ.get("PYTHONPATH")
            os.environ["PYTHONPATH"] = str(root / "services/agent/src")
            try:
                errors, code = check_contracts(root, str(python), node, ROOT)
            finally:
                if previous is None:
                    os.environ.pop("PYTHONPATH", None)
                else:
                    os.environ["PYTHONPATH"] = previous
            records.append({"name": name, "expected_exit_code": expected, "actual_exit_code": code,
                            "passed": code == expected, "detail": errors})

        def mutate(relative: str, change: Callable[[str], str], action: Callable[[], None]) -> None:
            path = root / relative
            original = path.read_bytes()
            try:
                path.write_text(change(original.decode("utf-8")), encoding="utf-8")
                action()
            finally:
                path.write_bytes(original)

        run("baseline-product-typescript", typescript())
        run("baseline-product-python", backend_types())
        ts_boundary = [node, str(ROOT / "scripts/check_ts_boundaries.ts"), "--root", str(root)]
        py_boundary = [str(python), str(ROOT / "scripts/check_boundaries.py"), "--root", str(root)]
        run("baseline-typescript-boundaries", ts_boundary)
        run("baseline-python-boundaries", py_boundary)
        contract("baseline-real-contract", 0)
        mutate("apps/desktop/src/renderer/App.tsx", lambda s: s + '\nconst injected: number = "type error";\n',
               lambda: run("reject-real-renderer-type-error", typescript(), "FAIL"))
        mutate("apps/desktop/src/renderer/App.tsx", lambda s: s + '\nimport fs from "node:fs";\n',
               lambda: run("reject-real-renderer-node-import", ts_boundary, "FAIL"))
        mutate("services/agent/src/prodops/domain/runs.py", lambda s: s + '\ninjected: int = "type error"\n',
               lambda: run("reject-real-domain-type-error", backend_types(), "FAIL"))
        mutate("services/agent/src/prodops/domain/runs.py", lambda s: s + '\nimport fastapi\n',
               lambda: run("reject-real-domain-framework-import", py_boundary, "FAIL"))
        mutate("services/agent/src/prodops/api/models.py", lambda s: s.replace('class HealthResponse(DTO):', 'class HealthResponse(DTO):\n    injected_contract_field: str'),
               lambda: contract("reject-live-api-model-drift", 1))
        mutate("packages/api-client/src/schema.d.ts", lambda s: s + '\nexport type InjectedDrift = string;\n',
               lambda: contract("reject-real-generated-types-drift", 1))
        mutate("packages/api-client/src/validators.cjs", lambda s: s + '\n// injected validator drift\n',
               lambda: contract("reject-real-runtime-validator-drift", 1))
        config = root / "apps/desktop/tsconfig.json"
        original = config.read_bytes()
        try:
            config.unlink()
            result: Result = execute("missing-product-config", typescript(), root, [config])
            records.append({"name": "missing-product-config", "expected": "NOT_READY", "actual": result.status,
                            "passed": result.status == "NOT_READY", "detail": result.detail})
        finally:
            config.write_bytes(original)
    passed = all(record["passed"] is True for record in records)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps({"status": "PASS" if passed else "FAIL", "scope": "isolated real product source copies; no demo or UI substitution",
                                 "cases": records}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for record in records:
        print(f"{'PASS' if record['passed'] else 'FAIL'}: {record['name']}")
    return 0 if passed else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, default=Path(".quality-reports/product-gate-injections.json"))
    args = parser.parse_args()
    report = (ROOT / args.report).resolve()
    if not report.is_relative_to(ROOT):
        parser.error("Report must stay inside the repository")
    return verify(report)


if __name__ == "__main__":
    raise SystemExit(main())
