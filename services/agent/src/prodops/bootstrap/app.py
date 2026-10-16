"""Local/server composition roots share the same HTTP and application code."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI
from starlette.middleware.trustedhost import TrustedHostMiddleware

from prodops.adapters.storage.tasks import SQLiteTaskStore
from prodops.api.body_limit import BodyLimitMiddleware
from prodops.api.business import business_router
from prodops.api.contracts import ContractAPI, capabilities_router
from prodops.api.errors import install_error_handlers
from prodops.api.health import health_router
from prodops.application.health import HealthService
from prodops.application.access import DevelopmentAccess
from prodops.application.tasks import TaskService
from prodops.bootstrap.config import ServiceSettings
from prodops.domain.deployment import DeploymentMode


def create_app(settings: ServiceSettings) -> FastAPI:
    health = HealthService(mode=settings.mode)
    store = SQLiteTaskStore(settings.database) if settings.database is not None else None
    tasks = TaskService(store) if store is not None else None
    access = DevelopmentAccess(settings.development_token.get_secret_value()) if settings.development_token is not None else None
    instance_id = uuid4()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        try:
            if store is not None:
                await store.start()
            await health.start()
            yield
        finally:
            await health.stop()
            if store is not None:
                await store.close()

    app = ContractAPI(title="ProdOps Agent development service", version="0.1.0",
                      lifespan=lifespan, docs_url=None, redoc_url=None)
    app.add_middleware(BodyLimitMiddleware)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=[settings.host])
    app.include_router(health_router(health))
    app.include_router(capabilities_router(settings.mode,
                       lambda: store.identity.deployment_id if store is not None and health.ready else instance_id,
                       lambda: store is not None and health.ready))
    app.include_router(business_router(tasks, access, lambda: health.ready))
    install_error_handlers(app)
    return app


def create_local_app() -> FastAPI:
    """Explicit in-process development entry; does not bind a socket."""
    return create_app(ServiceSettings(mode=DeploymentMode.LOCAL))


def create_server_app() -> FastAPI:
    """Server-mode development entry, still loopback-only until M4 auth."""
    return create_app(ServiceSettings(mode=DeploymentMode.SERVER))
