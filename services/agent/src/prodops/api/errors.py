"""Safe structured errors at the API boundary; never echo rejected input."""

from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from prodops.api.models import PROTOCOL_VERSION, ErrorCode, ErrorDetail, ErrorResponse
from prodops.application.errors import ActiveRunConflict, IdempotencyConflict, InvalidCursor, InvalidRecovery, QueueFull, ResourceNotFound, StorageFailure


class ProtocolError(Exception):
    pass


class APIError(Exception):
    def __init__(self, status: int, code: ErrorCode, message: str) -> None:
        self.status, self.code, self.message = status, code, message


def error_response(status_code: int, code: ErrorCode, message: str) -> JSONResponse:
    error = ErrorResponse(error=ErrorDetail(code=code, message=message, retryable=False), request_id=uuid4())
    return JSONResponse(status_code=status_code, content=error.model_dump(mode="json"),
                        headers={"Cache-Control": "no-store", "X-Request-ID": str(error.request_id)})


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(InvalidRecovery)
    async def invalid_recovery(request: Request, exc: InvalidRecovery) -> JSONResponse:
        return error_response(409, "conflict", "Task state, review confirmation or remaining budget does not permit recovery.")

    @app.exception_handler(QueueFull)
    async def queue_full(request: Request, exc: QueueFull) -> JSONResponse:
        return error_response(429, "budget_exceeded", "Development task queue is full. Wait for existing tasks to finish.")

    @app.exception_handler(ProtocolError)
    async def incompatible_protocol(request: Request, exc: ProtocolError) -> JSONResponse:
        return error_response(426, "incompatible_protocol", f"Client and service protocol versions are incompatible. Use protocol {PROTOCOL_VERSION}.")

    @app.exception_handler(APIError)
    async def expected_error(request: Request, exc: APIError) -> JSONResponse:
        response = error_response(exc.status, exc.code, exc.message)
        if exc.status == 401:
            response.headers["WWW-Authenticate"] = "Bearer"
        return response

    @app.exception_handler(ResourceNotFound)
    async def not_found(request: Request, exc: ResourceNotFound) -> JSONResponse:
        return error_response(404, "not_found", "Resource not found in this workspace.")

    @app.exception_handler(ActiveRunConflict)
    async def busy(request: Request, exc: ActiveRunConflict) -> JSONResponse:
        return error_response(409, "conflict", "Conversation already has an active run.")

    @app.exception_handler(IdempotencyConflict)
    async def duplicate(request: Request, exc: IdempotencyConflict) -> JSONResponse:
        return error_response(409, "idempotency_conflict", "Idempotency key was used for a different request.")

    @app.exception_handler(InvalidCursor)
    async def cursor(request: Request, exc: InvalidCursor) -> JSONResponse:
        return error_response(422, "invalid_request", "Invalid pagination cursor.")

    @app.exception_handler(StorageFailure)
    async def storage(request: Request, exc: StorageFailure) -> JSONResponse:
        return error_response(503, "not_ready", "Storage operation failed. Check service status before retrying.")

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, exc: RequestValidationError) -> JSONResponse:
        return error_response(422, "invalid_request", "Request validation failed. Check fields and types.")
