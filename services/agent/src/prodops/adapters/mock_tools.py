"""Packaged, bounded mock observations. No demo globals, network or equipment I/O."""

import asyncio
import json
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from prodops.domain.execution import Observation, ToolRequest


class MockScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    metrics: str = Field(min_length=1, max_length=512)
    logs: str = Field(min_length=1, max_length=512)
    runbook: str = Field(min_length=1, max_length=512)


class MockTools:
    def __init__(self) -> None:
        self._scenarios: dict[str, MockScenario] = {}

    async def start(self) -> None:
        path = Path(__file__).with_name("fixtures") / "diagnostics.json"
        raw: object = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(raw, dict) or set(raw) != {"camera_offline", "ocr_quality_drop", "kafka_backlog", "inference_latency_high"}:
            raise ValueError("Invalid packaged mock scenarios")
        self._scenarios = {key: MockScenario.model_validate(value) for key, value in raw.items()}

    async def execute(self, request: ToolRequest) -> Observation:
        # Keep the interface asynchronous without simulating actual network access.
        await asyncio.sleep(0)
        field = {"mock.read_metrics": "metrics", "mock.read_logs": "logs", "mock.read_runbook": "runbook"}.get(request.name)
        scenario = self._scenarios.get(request.scenario)
        if field is None or scenario is None:
            raise ValueError("Unknown mock tool or scenario")
        return Observation(source=f"mock://fixtures/{request.scenario}/{field}", summary=str(getattr(scenario, field)))
