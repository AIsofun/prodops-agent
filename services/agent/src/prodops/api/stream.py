"""Bounded database-backed SSE replay, heartbeat and safe post-header errors."""

import asyncio
from collections.abc import AsyncIterator, Callable
from dataclasses import asdict
from time import monotonic
from uuid import UUID, uuid4

from fastapi import Request
from fastapi.responses import StreamingResponse
from pydantic import TypeAdapter

from prodops.api.models import ErrorDetail, ErrorResponse, RunEvent
from prodops.application.errors import CursorExpired, InvalidCursor, ResourceNotFound, StorageFailure
from prodops.application.tasks import TaskService
from prodops.domain.records import EventPage

HEARTBEAT_SECONDS = 15.0
POLL_SECONDS = 0.1
EVENT = TypeAdapter(RunEvent)


def frames(page: EventPage) -> list[tuple[int, str]]:
    result: list[tuple[int, str]] = []
    for item in page.items:
        event = EVENT.validate_python(asdict(item))
        result.append((event.seq, f"id: {event.seq}\nevent: {event.event_type}\ndata: {event.model_dump_json()}\n\n"))
    return result


def stream_error(code: str, request_id: UUID) -> str:
    detail = ErrorDetail.model_validate({"code": code, "message": "Event stream stopped. Reload the task snapshot before reconnecting.", "retryable": False})
    error = ErrorResponse(error=detail, request_id=request_id)
    # No id: errors must never advance the durable task cursor.
    return f"event: stream.error\ndata: {error.model_dump_json()}\n\n"


async def event_stream(service: TaskService, run_id: UUID, after_seq: int, request: Request,
                       ready: Callable[[], bool]) -> StreamingResponse:
    page = await service.events(run_id, after_seq)
    request_id = uuid4()
    try:
        initial = frames(page)
    except ValueError:
        raise StorageFailure() from None

    async def generate() -> AsyncIterator[str]:
        current, prepared, cursor = page, initial, after_seq
        last_heartbeat = monotonic()
        try:
            while True:
                for seq, frame in prepared:
                    if await request.is_disconnected():
                        return
                    yield frame
                    cursor = seq
                if current.status in ("succeeded", "failed", "cancelled") and cursor >= current.last_event_seq:
                    return
                if await request.is_disconnected():
                    return
                if not ready():
                    yield stream_error("not_ready", request_id)
                    return
                if monotonic() - last_heartbeat >= HEARTBEAT_SECONDS:
                    yield ": heartbeat\n\n"
                    last_heartbeat = monotonic()
                await asyncio.sleep(POLL_SECONDS)
                current = await service.events(run_id, cursor)
                prepared = frames(current)
        except CursorExpired:
            yield stream_error("cursor_expired", request_id)
        except ResourceNotFound:
            yield stream_error("not_found", request_id)
        except (StorageFailure, InvalidCursor, ValueError):
            yield stream_error("not_ready", request_id)
        except Exception:
            yield stream_error("internal_error", request_id)

    return StreamingResponse(generate(), media_type="text/event-stream", headers={
        "Cache-Control": "no-store", "X-Accel-Buffering": "no", "X-Request-ID": str(request_id),
    })
