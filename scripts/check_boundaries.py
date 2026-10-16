"""Check static Python imports against the product architecture."""

from __future__ import annotations

import argparse
import ast
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = Path("services/agent/src/prodops")
ALLOWED: dict[str, set[str]] = {
    "domain": {"domain"},
    "application": {"application", "domain"},
    "agent": {"agent", "domain", "application"},
    "runtime": {"runtime", "application", "domain", "agent"},
    "api": {"api", "application", "domain"},
    "adapters": {"adapters", "application", "domain", "agent"},
    "bootstrap": set(),
}


def imported_modules(tree: ast.AST, module: str, is_package: bool) -> list[tuple[int, str]]:
    imports: list[tuple[int, str]] = []
    package = module.split(".") if is_package else module.split(".")[:-1]
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.extend((node.lineno, alias.name) for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            if node.level:
                keep = len(package) - node.level + 1
                if keep < 1:
                    imports.append((node.lineno, "INVALID_RELATIVE_IMPORT"))
                    continue
                base = ".".join(package[:keep])
                if node.module:
                    base += "." + node.module
            else:
                base = node.module or ""
            imports.append((node.lineno, base))
            imports.extend((node.lineno, f"{base}.{alias.name}") for alias in node.names)
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id == "__import__":
                imports.append((node.lineno, "DYNAMIC_IMPORT"))
            if isinstance(node.func, ast.Attribute) and node.func.attr == "import_module":
                imports.append((node.lineno, "DYNAMIC_IMPORT"))
    return imports


def check(root: Path) -> tuple[list[str], int]:
    package = root / PACKAGE
    files = sorted(package.rglob("*.py")) if package.is_dir() else []
    if not files:
        return ["NOT_READY: Python product package has no source files"], 2
    errors: list[str] = []
    for path in files:
        relative = path.relative_to(package)
        if relative == Path("__init__.py"):
            # Package metadata may not become a shortcut around the layer rules.
            layer = "domain"
        else:
            layer = relative.parts[0]
        if layer not in ALLOWED:
            errors.append(f"{relative}: unknown product layer")
            continue
        try:
            tree = ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(relative))
        except (SyntaxError, UnicodeError) as exc:
            errors.append(f"{relative}: cannot parse source: {exc}")
            continue
        module = "prodops." + ".".join(relative.with_suffix("").parts)
        is_package = path.name == "__init__.py"
        if is_package:
            module = module.removesuffix(".__init__")
        for line, target in imported_modules(tree, module, is_package):
            if target in {"INVALID_RELATIVE_IMPORT", "DYNAMIC_IMPORT"}:
                errors.append(f"{relative}:{line}: unsupported {target}")
                continue
            parts = target.split(".")
            if parts[0] == "prodops":
                if len(parts) > 1 and parts[1] not in ALLOWED:
                    errors.append(f"{relative}:{line}: unknown internal layer {target}")
                elif len(parts) > 1 and layer != "bootstrap" and parts[1] not in ALLOWED[layer]:
                    errors.append(f"{relative}:{line}: {layer} cannot import {target}")
            elif layer == "domain" and parts[0] not in sys.stdlib_module_names:
                errors.append(f"{relative}:{line}: domain cannot import external module {target}")
    return errors, 1 if errors else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args()
    errors, code = check(Path(args.root).resolve())
    for error in errors:
        print(error)
    if not code:
        print("PASS: Python static import boundaries")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
