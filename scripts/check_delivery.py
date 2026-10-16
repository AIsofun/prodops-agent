"""Validate milestone task dependencies and evidence/review receipts."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import cast

from scripts.check_project_docs import rows

ROOT = Path(__file__).resolve().parents[1]
STATES = {"not_started", "in_progress", "implemented", "verified"}


def repository_file(root: Path, value: object) -> Path | None:
    if not isinstance(value, str):
        return None
    base = root.resolve()
    path = (base / value).resolve()
    return path if path.is_relative_to(base) and path.is_file() else None


def validate(root: Path) -> list[str]:
    manifests = sorted((root / "docs/tasks").glob("m*/tasks.json"))
    if not manifests:
        return ["Milestone task manifest is missing"]
    data: list[object] = []
    errors: list[str] = []
    for manifest in manifests:
        parsed: object = json.loads(manifest.read_text(encoding="utf-8"))
        if not isinstance(parsed, list) or not parsed:
            errors.append(f"Task manifest must be a nonempty array: {manifest.parent.name}")
            continue
        for item in parsed:
            if isinstance(item, dict) and not str(item.get("id", "")).startswith(manifest.parent.name.upper() + "-"):
                errors.append(f"Task id must match manifest milestone: {item.get('id')}")
        data.extend(parsed)
    tasks: dict[str, dict[str, object]] = {}
    known = {cells[0] for name in ("requirements.md", "engineering-constraints.md")
             for cells in rows((root / "docs" / name).read_text(encoding="utf-8"))}
    for raw in data:
        if not isinstance(raw, dict) or not isinstance(raw.get("id"), str):
            errors.append("Task must be an object with a string id")
            continue
        task = cast(dict[str, object], raw)
        identifier = str(task["id"])
        if not re.fullmatch(r"M[1-9]\d*-T\d{2}", identifier):
            errors.append(f"Invalid milestone task id: {identifier}")
        if identifier in tasks:
            errors.append(f"Duplicate task: {identifier}")
        tasks[identifier] = task
    for identifier, task in tasks.items():
        state = task.get("state")
        if state not in STATES:
            errors.append(f"Invalid state: {identifier}")
        card = repository_file(root, task.get("card"))
        if card is None:
            errors.append(f"Missing task card: {identifier}")
        requirements = task.get("requirements")
        if not isinstance(requirements, list) or not requirements or any(req not in known for req in requirements):
            errors.append(f"Missing or undefined requirement: {identifier}")
        criteria = task.get("acceptance")
        if not isinstance(criteria, list) or not criteria or len(set(criteria)) != len(criteria):
            errors.append(f"Invalid acceptance criteria: {identifier}")
            criteria = []
        if card and any(not isinstance(item, str) or item not in card.read_text(encoding="utf-8") for item in criteria):
            errors.append(f"Acceptance id absent from card: {identifier}")
        dependencies = task.get("depends_on")
        if not isinstance(dependencies, list) or any(dep not in tasks or dep == identifier for dep in dependencies):
            errors.append(f"Invalid dependency: {identifier}")
        if state in {"in_progress", "implemented", "verified"} and isinstance(dependencies, list):
            if any(tasks.get(dep, {}).get("state") != "verified" for dep in dependencies):
                errors.append(f"Active task has unfinished dependencies: {identifier}")
        if state in {"implemented", "verified"}:
            paths = task.get("implementation")
            if not isinstance(paths, list) or not paths or any(repository_file(root, path) is None for path in paths):
                errors.append(f"Implementation files required: {identifier}")
        if state != "verified":
            continue
        evidence_path = repository_file(root, task.get("verification"))
        review_path = repository_file(root, task.get("review"))
        if evidence_path is None or review_path is None:
            errors.append(f"Verified task needs verification and review receipts: {identifier}")
            continue
        evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
        review = json.loads(review_path.read_text(encoding="utf-8"))
        if evidence.get("task_id") != identifier or review.get("task_id") != identifier:
            errors.append(f"Receipt task id mismatch: {identifier}")
        if evidence.get("schema_version") != 1 or review.get("schema_version") != 1:
            errors.append(f"Unsupported receipt schema: {identifier}")
        if not evidence.get("environment") or not evidence.get("source"):
            errors.append(f"Verification environment and source required: {identifier}")
        results = evidence.get("criteria", [])
        verified = {result.get("id") for result in results if result.get("status") == "PASS"
                    and repository_file(root, result.get("evidence")) is not None}
        if set(criteria) != verified or len(results) != len(criteria):
            errors.append(f"Acceptance evidence incomplete: {identifier}")
        if review.get("decision") != "approved" or review.get("mode") not in {"self_review", "independent_review", "human_review"}:
            errors.append(f"Review not approved or mode not recorded: {identifier}")
        if not repository_file(root, review.get("record")):
            errors.append(f"Review record is missing: {identifier}")
        if not review.get("reviewer"):
            errors.append(f"Reviewer identity is missing: {identifier}")
        if any(finding.get("status") not in {"open", "fixed", "accepted", "false_positive"}
               or not finding.get("reason") for finding in review.get("findings", [])):
            errors.append(f"Invalid finding status or missing reason: {identifier}")
        if any(finding.get("status") == "open" for finding in review.get("findings", [])):
            errors.append(f"Open review findings: {identifier}")
    visited: set[str] = set()
    active: set[str] = set()

    def visit(identifier: str) -> None:
        if identifier in active:
            errors.append(f"Dependency cycle: {identifier}")
            return
        if identifier in visited:
            return
        active.add(identifier)
        dependencies = tasks[identifier].get("depends_on", [])
        if isinstance(dependencies, list):
            for dep in dependencies:
                if isinstance(dep, str) and dep in tasks:
                    visit(dep)
        active.remove(identifier)
        visited.add(identifier)

    for identifier in tasks:
        visit(identifier)
    return errors


def main() -> int:
    try:
        errors = validate(ROOT)
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        errors = [f"Invalid delivery record: {exc}"]
    for error in errors:
        print("ERROR: " + error)
    if not errors:
        print("PASS: milestone task graphs, requirement mappings and delivery receipts")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
