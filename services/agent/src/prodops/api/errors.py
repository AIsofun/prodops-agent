"""Safe structured errors at the API boundary; never echo rejected input."""

from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from prodops.api.models import ErrorCode, ErrorDetail, ErrorResponse


class ProtocolError(Exception):
    pass


def error_response(status_code: int, code: ErrorCode, message: str) -> JSONResponse:
    error = ErrorResponse(error=ErrorDetail(code=code, message=message, retryable=False), request_id=uuid4())
    return JSONResponse(status_code=status_code, content=error.model_dump(mode="json"),
                        headers={"Cache-Control": "no-store", "X-Request-ID": str(error.request_id)})


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ProtocolError)
    async def incompatible_protocol(request: Request, exc: ProtocolError) -> JSONResponse:
        return error_response(426, "incompatible_protocol", "Client and service protocol versions are incompatible. Use protocol 1.0.")

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, exc: RequestValidationError) -> JSONResponse:
        return error_response(422, "invalid_request", "Request validation failed. Check fields and types.")
