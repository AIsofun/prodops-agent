"""Private inherited-pipe desktop entry. Stdout carries bounded protocol lines only."""

import asyncio
from contextlib import suppress
import os
from pathlib import Path
import socket
import sys
from threading import Thread
from uuid import UUID

from pydantic import ValidationError
import uvicorn

from prodops.api.models import (
    PROTOCOL_VERSION, DesktopStartupFailure, DesktopStartupReady,
    DesktopStartupRequest, DesktopStopRequest,
)
from prodops.bootstrap.app import create_app
from prodops.bootstrap.config import ServiceSettings
from prodops.domain.events import EVENT_SCHEMA_VERSION

MAX_STARTUP_BYTES = 32768
MAX_CONTROL_BYTES = 1024


def emit(message: DesktopStartupReady | DesktopStartupFailure) -> bool:
    try:
        sys.stdout.write(message.model_dump_json() + "\n")
        sys.stdout.flush()
        return True
    except (OSError, ValueError):
        return False


class DesktopServer(uvicorn.Server):
    def __init__(self, config: uvicorn.Config, request: DesktopStartupRequest, port: int) -> None:
        super().__init__(config)
        self.request = request
        self.port = port
        self.deployment_id: UUID | None = None

    async def startup(self, sockets: list[socket.socket] | None = None) -> None:
        await super().startup(sockets)
        if not self.started or self.deployment_id is None:
            self.should_exit = True
            return
        ready = DesktopStartupReady(instance_id=self.request.instance_id, process_id=os.getpid(),
                                    parent_process_id=os.getppid(), port=self.port,
                                    deployment_id=self.deployment_id, protocol_version=PROTOCOL_VERSION,
                                    event_schema_version=EVENT_SCHEMA_VERSION)
        if not emit(ready):
            self.should_exit = True
        loop = asyncio.get_running_loop()

        def watch_control() -> None:
            # A daemon reader avoids blocking asyncio's executor shutdown if the
            # service fails while the parent still holds its pipe open.
            try:
                line = sys.stdin.buffer.readline(MAX_CONTROL_BYTES + 1)
                if line:
                    if len(line) > MAX_CONTROL_BYTES or not line.endswith(b"\n"):
                        raise ValueError("Invalid control message")
                    stop = DesktopStopRequest.model_validate_json(line)
                    if stop.instance_id != self.request.instance_id:
                        raise ValueError("Wrong control instance")
            except (OSError, ValueError):
                # Invalid control input also closes this private child safely.
                pass
            with suppress(RuntimeError):
                loop.call_soon_threadsafe(setattr, self, "should_exit", True)

        Thread(target=watch_control, name="prodops-parent-pipe", daemon=True).start()


async def serve(request: DesktopStartupRequest) -> bool:
    settings = ServiceSettings.model_validate({"mode": "local", "database": Path(request.database_path),
                                               "development_token": request.token, "execution_enabled": True})
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        if sys.platform == "win32":
            listener.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        listener.bind(("127.0.0.1", 0))
        listener.listen(128)
        listener.setblocking(False)
        port = int(listener.getsockname()[1])
        server: DesktopServer

        def ready(deployment_id: UUID) -> None:
            server.deployment_id = deployment_id

        app = create_app(settings, on_ready=ready)
        config = uvicorn.Config(app, host="127.0.0.1", port=port, workers=1, lifespan="on",
                                access_log=False, server_header=False, timeout_graceful_shutdown=5)
        server = DesktopServer(config, request, port)
        await server.serve(sockets=[listener])
        return server.started


def main() -> int:
    instance_id: UUID | None = None
    try:
        line = sys.stdin.buffer.readline(MAX_STARTUP_BYTES + 1)
        if not line or len(line) > MAX_STARTUP_BYTES or not line.endswith(b"\n"):
            raise ValueError("Invalid startup message")
        request = DesktopStartupRequest.model_validate_json(line)
        instance_id = request.instance_id
        if asyncio.run(serve(request)):
            return 0
    except (OSError, ValueError, ValidationError, RuntimeError, SystemExit):
        pass
    emit(DesktopStartupFailure(instance_id=instance_id))
    print("Local desktop service could not start. Check the runtime and data configuration.", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
