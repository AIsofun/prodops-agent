"""Compare exported OpenAPI and generated TS types without rewriting tracked artifacts."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPORTER = Path("services/agent/scripts/export_contracts.py")
SNAPSHOT = Path("contracts/openapi.json")
TYPES = Path("packages/api-client/src/schema.d.ts")
GENERATOR = Path("node_modules/openapi-typescript/bin/cli.js")
VALIDATOR_GENERATOR = Path("packages/api-client/scripts/generate-validators.mjs")
VALIDATORS = Path("packages/api-client/src/validators.cjs")


def has_external_reference(value: object) -> bool:
    if isinstance(value, dict):
        reference = value.get("$ref")
        if isinstance(reference, str) and not reference.startswith("#"):
            return True
        return any(has_external_reference(item) for item in value.values())
    if isinstance(value, list):
        return any(has_external_reference(item) for item in value)
    return False


def command(args: list[str], root: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, cwd=root, text=True, encoding="utf-8", errors="replace",
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=90, check=False)


def check(root: Path, python: str, node: str, tools_root: Path | None = None) -> tuple[list[str], int]:
    missing = [str(item) for item in (EXPORTER, SNAPSHOT, TYPES, VALIDATOR_GENERATOR, VALIDATORS) if not (root / item).is_file()]
    if missing:
        return ["NOT_READY: missing product contract artifacts: " + ", ".join(missing)], 2
    generator = (tools_root or root) / GENERATOR
    if not generator.is_file():
        return ["NOT_READY: install the locked openapi-typescript dependency"], 2
    errors: list[str] = []
    with tempfile.TemporaryDirectory(prefix="prodops-contracts-") as directory:
        temp = Path(directory)
        exported, generated = temp / "openapi.json", temp / "schema.d.ts"
        result = command([python, str(root / EXPORTER), "--output", str(exported)], root)
        if result.returncode or not exported.is_file():
            return ["Contract exporter failed: " + result.stdout], 1
        try:
            actual: object = json.loads(exported.read_text(encoding="utf-8-sig"))
            expected: object = json.loads((root / SNAPSHOT).read_text(encoding="utf-8-sig"))
        except (ValueError, UnicodeError) as exc:
            return [f"Invalid contract JSON: {exc}"], 1
        if not isinstance(actual, dict) or not str(actual.get("openapi", "")).startswith("3."):
            return ["Exporter must produce an OpenAPI 3 document"], 1
        if has_external_reference(actual):
            return ["External $ref is not allowed; export a self-contained contract"], 1
        if actual != expected:
            errors.append("Exported OpenAPI differs from contracts/openapi.json")
        result = command([node, str(generator), str(exported), "--output", str(generated)], root)
        if result.returncode or not generated.is_file():
            return errors + ["Type generation failed: " + result.stdout], 1
        actual_types = generated.read_text(encoding="utf-8").replace("\r\n", "\n").rstrip()
        expected_types = (root / TYPES).read_text(encoding="utf-8").replace("\r\n", "\n").rstrip()
        if actual_types != expected_types:
            errors.append("Generated TS types differ from packages/api-client/src/schema.d.ts")
        validators = temp / "validators.cjs"
        result = command([node, str(root / VALIDATOR_GENERATOR), "--schema", str(exported),
                          "--output", str(validators), "--tools-root", str(tools_root or root)], root)
        if result.returncode or not validators.is_file():
            return errors + ["Runtime validator generation failed: " + result.stdout], 1
        if validators.read_text(encoding="utf-8").replace("\r\n", "\n").rstrip() != (root / VALIDATORS).read_text(encoding="utf-8").replace("\r\n", "\n").rstrip():
            errors.append("Generated runtime validators differ from packages/api-client/src/validators.cjs")
    return errors, 1 if errors else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--python", default=sys.executable)
    parser.add_argument("--node", default="node")
    args = parser.parse_args()
    try:
        errors, code = check(Path(args.root).resolve(), str(args.python), str(args.node))
    except (OSError, subprocess.TimeoutExpired) as exc:
        errors, code = [f"Contract check could not run: {exc}"], 1
    for error in errors:
        print(error)
    if not code:
        print("PASS: exported API contract, generated TypeScript and runtime validators are consistent")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
