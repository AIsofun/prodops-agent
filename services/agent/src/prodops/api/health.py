"""Minimal liveness/readiness endpoints for the development skeleton."""

from typing import Literal

from fastapi import APIRouter, Response
from pydantic import BaseModel, ConfigDict

from prodops.application.health import HealthService
from prodops.domain.deployment import DeploymentMode


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["alive", "ready", "not_ready"]
    mode: DeploymentMode
    scope: Literal["service_skeleton"] = "service_skeleton"


def health_router(service: HealthService) -> APIRouter:
    router = APIRouter(prefix="/health", tags=["health"])

    @router.get("/live", response_model=HealthResponse)
    async def live(response: Response) -> HealthResponse:
        response.headers["Cache-Control"] = "no-store"
        return HealthResponse(status="alive", mode=service.mode)

    @router.get("/ready", response_model=HealthResponse,
                responses={503: {"model": HealthResponse}})
    async def ready(response: Response) -> HealthResponse:
        response.headers["Cache-Control"] = "no-store"
        if not service.ready:
            response.status_code = 503
        return HealthResponse(status="ready" if service.ready else "not_ready", mode=service.mode)

    return router
