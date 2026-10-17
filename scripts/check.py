"""Unified quality entry: docs, harness, Python service, or M1 product gates."""

from __future__ import annotations

import argparse
import io
import json
import os
import shutil
import subprocess
import sys
import time
import tomllib
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

ROOT = Path(__file__).resolve().parents[1]
Status = Literal["PASS", "FAIL", "NOT_READY"]


@dataclass
class Result:
    name: str
    status: Status
    detail: str
    command: list[str]
    seconds: float = 0


def aggregate(results: list[Result]) -> tuple[Status, int]:
    if not results:
        return "NOT_READY", 2
    if any(result.status == "FAIL" for result in results):
        return "FAIL", 1
    if any(result.status == "NOT_READY" for result in results):
        return "NOT_READY", 2
    return "PASS", 0


def execute(name: str, args: list[str], root: Path, required: list[Path] | None = None,
            *, unready_exit: bool = False) -> Result:
    missing = [str(path.relative_to(root)) for path in required or [] if not path.is_file()]
    if missing:
        return Result(name, "NOT_READY", "Missing prerequisites: " + ", ".join(missing), args)
    start = time.monotonic()
    environment = {**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"}
    try:
        completed = subprocess.run(args, cwd=root, env=environment, encoding="utf-8", errors="replace",
                                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=180, check=False)
        status: Status = "PASS" if completed.returncode == 0 else "NOT_READY" if unready_exit and completed.returncode == 2 else "FAIL"
        return Result(name, status, completed.stdout.strip(), args, round(time.monotonic() - start, 3))
    except FileNotFoundError as exc:
        return Result(name, "NOT_READY", str(exc), args)
    except (OSError, subprocess.TimeoutExpired) as exc:
        return Result(name, "FAIL", str(exc), args, round(time.monotonic() - start, 3))


def environment_check(root: Path, python: Path, node: str) -> Result:
    problems: list[str] = []
    details: list[str] = []
    for filename in ("pyproject.toml", "uv.lock", "package.json", "package-lock.json"):
        if not (root / filename).is_file():
            problems.append(f"Missing {filename}")
    if not python.is_file():
        problems.append("Missing .venv: run uv sync --frozen --group dev")
    else:
        probe = execute("python-version", [str(python), "-c",
            "import sys,importlib.metadata; print('.'.join(map(str,sys.version_info[:3]))); print(importlib.metadata.version('mypy'))"], root)
        if probe.status != "PASS":
            problems.append("Python/mypy environment unavailable: " + probe.detail)
        else:
            lines = probe.detail.splitlines()
            version = tuple(int(part) for part in lines[0].split("."))
            if not (3, 12) <= version < (3, 14):
                problems.append("Supported Python range is >=3.12,<3.14")
            config = tomllib.loads((root / "pyproject.toml").read_text(encoding="utf-8"))
            expected = next(str(dep).split("==")[1] for dep in config["dependency-groups"]["dev"]
                            if str(dep).startswith("mypy=="))
            if lines[1] != expected:
                problems.append("Installed mypy differs from pyproject.toml")
            details.append(f"Python {lines[0]}, mypy {lines[1]}")
    probe = execute("node-version", [node, "--version"], root)
    if probe.status != "PASS":
        problems.append("Node unavailable: " + probe.detail)
    else:
        version = tuple(int(part) for part in probe.detail.lstrip("v").split("."))
        if not (22, 18) <= version < (25,):
            problems.append("Supported Node range is >=22.18,<25")
        details.append("Node " + probe.detail)
    if (root / "package.json").is_file():
        package = json.loads((root / "package.json").read_text(encoding="utf-8"))
        for name, expected in package["devDependencies"].items():
            installed = root / "node_modules" / name / "package.json"
            if not installed.is_file():
                problems.append(f"Missing {name}: run npm ci --ignore-scripts")
            elif json.loads(installed.read_text(encoding="utf-8"))["version"] != expected:
                problems.append(f"Installed {name} differs from package.json")
        if (root / "package-lock.json").is_file():
            lock = json.loads((root / "package-lock.json").read_text(encoding="utf-8"))
            if lock["packages"][""]["devDependencies"] != package["devDependencies"]:
                problems.append("package-lock.json root dependencies are stale")
    return Result("environment", "NOT_READY" if problems else "PASS", "\n".join(details + problems), [])


def run(root: Path, profile: str) -> list[Result]:
    python = root / (".venv/Scripts/python.exe" if os.name == "nt" else ".venv/bin/python")
    node = shutil.which("node") or "node"
    results: list[Result] = []
    if profile != "docs":
        results.append(environment_check(root, python, node))
    results.append(execute("documents", [sys.executable, "-m", "scripts.check_project_docs"], root))
    results.append(execute("task-delivery-records", [sys.executable, "-m", "scripts.check_delivery"], root))
    if profile == "docs":
        return results
    results.append(execute("harness-python-types", [str(python), "-m", "mypy", "--config-file", "pyproject.toml"], root,
                           [python]))
    tsc = root / "node_modules/typescript/bin/tsc"
    results.append(execute("harness-typescript-types", [node, str(tsc), "--noEmit", "-p", "tooling/tsconfig.json"], root, [tsc]))
    dependencies_ready = results[0].status == "PASS"
    if dependencies_ready:
        results.append(execute("harness-regressions", [str(python), "-m", "unittest", "discover", "-s", "tests/harness", "-t", ".", "-v"], root, [python]))
    else:
        results.append(Result("harness-regressions", "NOT_READY", "Resolve environment prerequisites before running tool regression scenarios", []))
    if profile == "harness":
        return results
    backend = root / "services/agent"
    desktop = root / "apps/desktop"
    results.append(execute("product-python-types", [str(python), "-m", "mypy", "--config-file", str(backend / "pyproject.toml")], root,
                           [python, backend / "pyproject.toml", backend / "src/prodops/__init__.py"]))
    results.append(execute("product-python-boundaries", [sys.executable, "-m", "scripts.check_boundaries"], root, unready_exit=True))
    results.append(execute("product-python-behavior", [str(python), "-m", "unittest", "discover", "-s", "services/agent/tests", "-v"], root,
                           [python, backend / "tests/test_service.py"]))
    results.append(execute("product-event-consumer", [node, "--test", "packages/api-client/tests/events.test.mjs"], root,
                           [root / "packages/api-client/tests/events.test.mjs", root / "packages/api-client/src/events.ts"]))
    if profile == "service":
        return results
    results.append(execute("product-typescript-types", [node, str(tsc), "--noEmit", "-p", str(desktop / "tsconfig.json")], root,
                           [tsc, desktop / "tsconfig.json"]))
    results.append(execute("product-renderer-types", [node, str(tsc), "--noEmit", "-p", str(desktop / "tsconfig.renderer.json")], root,
                           [tsc, desktop / "tsconfig.renderer.json"]))
    results.append(execute("product-typescript-boundaries", [node, "scripts/check_ts_boundaries.ts"], root, [tsc], unready_exit=True))
    results.append(execute("product-contracts", [str(python), "-m", "scripts.check_contracts", "--node", node], root, [python], unready_exit=True))
    results.append(execute("product-desktop-behavior", [node, "apps/desktop/scripts/check.mjs"], root,
                           [tsc, desktop / "scripts/check.mjs", desktop / "tests/connection.test.cjs", desktop / "tests/service.test.cjs", desktop / "tests/business.test.cjs", desktop / "tests/progress.test.cjs", desktop / "tsconfig.electron.json"]))
    return results


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if isinstance(stream, io.TextIOWrapper):
            stream.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", choices=["docs", "harness", "service", "m1"], default="m1")
    parser.add_argument("--report", type=Path, help="JSON output path inside this repository")
    args = parser.parse_args()
    profile = str(args.profile)
    output = (ROOT / (args.report or Path(f".quality-reports/{profile}.json"))).resolve()
    if not output.is_relative_to(ROOT):
        parser.error("Reports must stay inside the repository")
    try:
        results = run(ROOT, profile)
    except (OSError, ValueError, KeyError, StopIteration) as exc:
        results = [Result("configuration", "FAIL", str(exc), [])]
    status, exit_code = aggregate(results)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({
        "schema_version": 1, "profile": profile, "status": status,
        "exit_code": exit_code, "created_at": datetime.now(UTC).isoformat(),
        "scope": "harness only; not product acceptance" if profile == "harness" else "Current product static checks and available service/contract/client behavior; GUI, packaging, remote CI and milestone acceptance separate" if profile == "m1" else "Current service types, boundaries and service/contract/event-consumer behavior; not complete product acceptance" if profile == "service" else profile,
        "checks": [asdict(result) for result in results],
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for result in results:
        print(f"[{result.status}] {result.name}")
        if result.detail:
            print(result.detail)
    print(f"OVERALL {status}: {output.relative_to(ROOT)}")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
