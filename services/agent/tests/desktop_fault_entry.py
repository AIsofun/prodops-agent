"""Test-only inherited-pipe entry with gated mock reads and explicit SSE faults."""

import asyncio
from collections.abc import Callable
from pathlib import Path
import sys
from unittest.mock import patch
from uuid import UUID, uuid4

from fastapi import FastAPI
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from prodops.adapters.mock_tools import MockTools
from prodops.api.models import ErrorResponse
from prodops.bootstrap import desktop
from prodops.bootstrap.app import create_app as real_factory
from prodops.bootstrap.config import ServiceSettings
from prodops.domain.execution import Observation, ToolRequest

gate = Path(sys.argv[1])
mode = sys.argv[2]
if not gate.is_absolute() or mode not in ("cancel", "disconnect", "expired", "gap", "crash", "recover"):
    raise SystemExit(2)


class GatedTools(MockTools):
    async def execute(self, request: ToolRequest) -> Observation:
        while not gate.exists():
            await asyncio.sleep(0.02)
        return await super().execute(request)


class ExplicitFault:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        self.injected = False

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        events = str(scope.get("path", "")).endswith("/events")
        after = dict(scope.get("headers", [])).get(b"last-event-id", b"0")
        if events and mode == "expired" and after != b"0" and not self.injected:
            self.injected = True
            error = ErrorResponse.model_validate({"error": {"code": "cursor_expired", "message": "Explicit isolated cursor expiration fixture.", "retryable": False}, "request_id": str(uuid4())})
            await JSONResponse(error.model_dump(mode="json"), status_code=410)(scope, receive, send)
            return

        async def forward(message: Message) -> None:
            if events and mode == "gap" and not self.injected and message["type"] == "http.response.body" and b"id: 5\n" in message.get("body", b""):
                self.injected = True
                await send({**message, "body": b""})
            else:
                await send(message)

        await self.app(scope, receive, forward)


def fixture_app(settings: ServiceSettings, *, on_ready: Callable[[UUID], None] | None = None) -> FastAPI:
    with patch("prodops.bootstrap.app.MockTools", GatedTools):
        app = real_factory(settings, on_ready=on_ready)
    app.add_middleware(ExplicitFault)
    return app


with patch.object(desktop, "create_app", fixture_app):
    raise SystemExit(desktop.main())
