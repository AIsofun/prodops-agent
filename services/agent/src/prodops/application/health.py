"""Readiness for the current skeleton; no model or database is implied."""

from dataclasses import dataclass

from prodops.domain.deployment import DeploymentMode


@dataclass
class HealthService:
    mode: DeploymentMode
    ready: bool = False

    async def start(self) -> None:
        # Future startup dependencies must finish successfully before this flips.
        self.ready = True

    async def stop(self) -> None:
        self.ready = False
