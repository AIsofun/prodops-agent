"""Local/server composition roots share the same HTTP and application code."""

from collections.abc import AsyncIterator, Callable
import asyncio
from contextlib import asynccontextmanager
from uuid import UUID, uuid4

from fastapi import FastAPI
from starlette.middleware.trustedhost import TrustedHostMiddleware

from prodops.adapters.storage.events import SQLiteEventStore
from prodops.adapters.storage.lock import DatabaseServiceLock
from prodops.adapters.mock_tools import MockTools
from prodops.agent.mock import MockDiagnosticAgent
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
from prodops.domain.execution import ExecutionPolicy
from prodops.runtime.scheduler import Scheduler


def create_app(settings: ServiceSettings, *, on_ready: Callable[[UUID], None] | None = None) -> FastAPI:
    health = HealthService(mode=settings.mode)
    policy = ExecutionPolicy(settings.max_concurrent_runs or (1 if settings.mode == DeploymentMode.LOCAL else 4),
                             settings.queue_limit, settings.max_tool_calls, settings.run_timeout, settings.tool_timeout)
    store = SQLiteEventStore(settings.database, policy) if settings.database is not None else None
    service_lock = DatabaseServiceLock(settings.database) if settings.database is not None else None
    tasks = TaskService(store) if store is not None else None
    access = DevelopmentAccess(settings.development_token.get_secret_value()) if settings.development_token is not None else None
    instance_id = uuid4()
    deployment_id = instance_id
    tools = MockTools()
    scheduler = Scheduler(store, MockDiagnosticAgent(), tools, policy.concurrency,
                          lambda: setattr(health, "ready", False)) if store is not None and settings.execution_enabled else None

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        nonlocal deployment_id
        try:
            if service_lock is not None:
                await asyncio.to_thread(service_lock.acquire)
            if store is not None:
                await store.start()
                await store.recover_orphans()
                deployment_id = store.identity.deployment_id
            if scheduler is not None:
                await tools.start()
                await scheduler.start()
            await health.start()
            if on_ready is not None:
                on_ready(deployment_id)
            yield
        finally:
            try:
                await health.stop()
                try:
                    if scheduler is not None:
                        await scheduler.stop()
                        # No worker remains and this lifespan still owns the OS
                        # lock. Reconcile any committed intent whose result could
                        # not be confirmed before shutdown, including failed owners.
                        if store is not None:
                            await store.recover_orphans()
                finally:
                    if store is not None:
                        await store.close()
            finally:
                if service_lock is not None:
                    service_lock.release()

    app = ContractAPI(title="ProdOps Agent development service", version="0.1.0",
                      lifespan=lifespan, docs_url=None, redoc_url=None)
    app.add_middleware(BodyLimitMiddleware)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=[settings.host])
    app.include_router(health_router(health))
    app.include_router(capabilities_router(settings.mode,
                       lambda: deployment_id,
                       lambda: store is not None and health.ready,
                       lambda: scheduler is not None and scheduler.healthy))
    app.include_router(business_router(tasks, access, lambda: health.ready))
    install_error_handlers(app)
    return app


def create_local_app() -> FastAPI:
    """Explicit in-process development entry; does not bind a socket."""
    return create_app(ServiceSettings(mode=DeploymentMode.LOCAL))


def create_server_app() -> FastAPI:
    """Server-mode development entry, still loopback-only until M4 auth."""
    return create_app(ServiceSettings(mode=DeploymentMode.SERVER))
