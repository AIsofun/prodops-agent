"""Execution values shared by the agent, runtime and persistence ports."""

from dataclasses import dataclass
import math
from uuid import UUID


@dataclass(frozen=True)
class ExecutionPolicy:
    concurrency: int = 1
    queue_limit: int = 100
    max_tool_calls: int = 12
    run_timeout: float = 600
    tool_timeout: float = 30

    def __post_init__(self) -> None:
        for value, upper in ((self.concurrency, 4), (self.queue_limit, 100), (self.max_tool_calls, 100)):
            if type(value) is not int or not 1 <= value <= upper:
                raise ValueError("Invalid execution count budget")
        for timeout in (self.run_timeout, self.tool_timeout):
            if isinstance(timeout, bool) or not math.isfinite(timeout) or not 0 < timeout <= 600:
                raise ValueError("Invalid execution timeout budget")


@dataclass(frozen=True)
class ToolRequest:
    name: str
    scenario: str


@dataclass(frozen=True)
class Observation:
    source: str
    summary: str


@dataclass(frozen=True)
class ExecutionLease:
    run_id: UUID
    owner_id: UUID
    version: int
    content: str
    policy: ExecutionPolicy
    tool_calls_used: int
    elapsed_seconds: float
    completed_steps: int = 0
    observations: tuple[Observation, ...] = ()
