"""Minimal liveness/readiness endpoints for the development skeleton."""

from fastapi import APIRouter, Response

from prodops.api.models import HealthResponse
from prodops.application.health import HealthService


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
