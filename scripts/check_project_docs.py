"""Check repository requirement traceability using only the Python standard library."""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
ID_PATTERN = re.compile(r"(?:REQ|NFR|HAR)-\d{3}\Z")
LINK_PATTERN = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")
STATUSES = {"未开始", "进行中", "已实现", "已验证", "暂缓", "待定"}
PHASES = {f"M{i}" for i in range(7)}


def linked_files(cell: str) -> list[str]:
    return [match.group(1) for match in LINK_PATTERN.finditer(cell)]


def local_target(source: Path, link: str) -> Path | None:
    parsed = urlsplit(link.strip("<>"))
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    return (source.parent / unquote(parsed.path)).resolve()


def rows(text: str) -> list[list[str]]:
    result = []
    for line in text.splitlines():
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if cells and re.match(r"^(?:REQ|NFR|HAR)(?:-|$)", cells[0]):
            result.append(cells)
    return result


def validate(root: Path) -> tuple[list[str], int]:
    errors: list[str] = []
    required = [
        root / "AGENTS.md",
        root / "README.md",
        root / "docs/requirements.md",
        root / "docs/engineering-constraints.md",
        root / "docs/traceability.md",
        root / "docs/architecture.md",
        root / "docs/implementation-plan.md",
    ]
    for path in required:
        if not path.is_file():
            errors.append(f"Missing required document: {path.relative_to(root)}")
    if errors:
        return errors, 0

    documents = sorted(set(required + list((root / "docs").rglob("*.md"))))
    for path in documents:
        text = path.read_text(encoding="utf-8-sig")
        fences = re.findall(r"^```", text, re.MULTILINE)
        if len(fences) % 2:
            errors.append(f"Unbalanced fenced blocks: {path.relative_to(root)}")
        for link in linked_files(text):
            target = local_target(path, link)
            if target is not None and not target.is_file():
                errors.append(f"Missing local file in {path.relative_to(root)}: {link}")

    definitions: dict[str, Path] = {}
    for name, allowed in [("requirements.md", {"REQ", "NFR"}),
                          ("engineering-constraints.md", {"HAR"})]:
        path = root / "docs" / name
        for cells in rows(path.read_text(encoding="utf-8-sig")):
            identifier = cells[0]
            if not ID_PATTERN.fullmatch(identifier):
                errors.append(f"Invalid definition identifier: {identifier}")
            if identifier.split("-")[0] not in allowed:
                errors.append(f"Unexpected definition in {name}: {identifier}")
            if identifier in definitions:
                errors.append(f"Duplicate definition: {identifier}")
            definitions[identifier] = path
    if not definitions:
        errors.append("No requirement definitions found")

    tracker = root / "docs/traceability.md"
    design_sections = set(re.findall(
        r"^#{2,3} (\d+(?:\.\d+)?)\s",
        (root / "docs/architecture.md").read_text(encoding="utf-8-sig"),
        re.MULTILINE,
    ))
    tracked: set[str] = set()
    for cells in rows(tracker.read_text(encoding="utf-8-sig")):
        identifier = cells[0]
        if not ID_PATTERN.fullmatch(identifier):
            errors.append(f"Invalid tracking identifier: {identifier}")
        if identifier in tracked:
            errors.append(f"Duplicate tracking row: {identifier}")
        tracked.add(identifier)
        if len(cells) != 7:
            errors.append(f"Expected 7 tracking columns: {identifier}")
            continue
        _, phase, status, design, implementation, evidence, notes = cells
        if phase not in PHASES:
            errors.append(f"Invalid phase for {identifier}: {phase}")
        if status not in STATUSES:
            errors.append(f"Invalid status for {identifier}: {status}")
        if not re.fullmatch(r"\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?)*", design):
            errors.append(f"Missing or invalid design reference: {identifier}")
        elif not set(design.split()).issubset(design_sections):
            errors.append(f"Unknown design section: {identifier}: {design}")
        if status in {"已实现", "已验证"} and not linked_files(implementation):
            errors.append(f"Implementation link required: {identifier}")
        if status == "已验证" and not linked_files(evidence):
            errors.append(f"Verification evidence link required: {identifier}")
        if status in {"暂缓", "待定"} and notes in {"", "-"}:
            errors.append(f"Reason required for {status}: {identifier}")
        for column in (implementation, evidence):
            for link in linked_files(column):
                target = local_target(tracker, link)
                if target is None or not target.is_relative_to(root) or not target.is_file():
                    errors.append(f"Repository file reference required: {identifier}: {link}")

    for identifier in sorted(definitions.keys() - tracked):
        errors.append(f"Missing tracking row: {identifier}")
    for identifier in sorted(tracked - definitions.keys()):
        errors.append(f"Undefined tracking identifier: {identifier}")
    return errors, len(definitions)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT, help="Repository root")
    args = parser.parse_args()
    errors, count = validate(args.root.resolve())
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print(f"PASS: {count} requirement and harness definitions have consistent tracking.")
    print("Local file links, statuses, phases, evidence references and fences checked.")
    print("This check does not establish product acceptance or evidence quality.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
