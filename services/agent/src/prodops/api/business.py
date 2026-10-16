"""Protected, loopback-only development business routes."""

from collections.abc import Callable
from dataclasses import asdict
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BeforeValidator, Field

from prodops.api.errors import APIError, ProtocolError
from prodops.api.models import (
    PROTOCOL_VERSION, Conversation, ConversationCreateRequest, ConversationPage,
    ErrorResponse, Message, MessagePage, RunCreateRequest, RunPage, RunSnapshot,
    Workspace, WorkspaceList,
)
from prodops.application.access import DevelopmentAccess
from prodops.application.tasks import TaskService
from prodops.domain.records import ConversationRecord, RunRecord


def decimal_limit(value: object) -> object:
    if isinstance(value, str) and value.isascii() and value.isdecimal():
        return int(value)
    if type(value) is int:
        return value
    raise ValueError("limit must be a decimal integer")


Limit = Annotated[int, BeforeValidator(decimal_limit), Field(ge=1, le=100)]
Cursor = Annotated[str | None, Query(min_length=1, max_length=512)]


def business_router(service: TaskService | None, access: DevelopmentAccess | None,
                    ready: Callable[[], bool]) -> APIRouter:
    bearer = HTTPBearer(auto_error=False)

    async def authorize(request: Request, response: Response,
                        credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
                        protocol: Annotated[str | None, Header(alias="X-ProdOps-Protocol", description="Required exact protocol 1.2 for business requests.")] = None) -> TaskService:
        if service is None or access is None or not ready():
            raise APIError(503, "not_ready", "Development business API is not configured or ready.")
        if len(request.headers.getlist("authorization")) != 1 or credentials is None or not access.allows(credentials.credentials):
            raise APIError(401, "unauthenticated", "A valid development bearer token is required.")
        if "origin" in request.headers:
            raise APIError(403, "forbidden", "Browser origins cannot access the development business API.")
        if request.headers.getlist("x-prodops-protocol") != [PROTOCOL_VERSION]:
            raise ProtocolError()
        response.headers["Cache-Control"] = "no-store"
        return service

    router = APIRouter(prefix="/api/v1", tags=["development tasks"],
                       responses={status: {"model": ErrorResponse} for status in (401, 403, 404, 409, 413, 422, 426, 429, 503)})

    def conversation(record: ConversationRecord, tasks: TaskService) -> Conversation:
        return Conversation.model_validate({**asdict(record), "deployment_id": tasks.identity.deployment_id})

    def snapshot(record: RunRecord) -> RunSnapshot:
        return RunSnapshot.model_validate(asdict(record))

    @router.get("/workspaces", response_model=WorkspaceList)
    async def workspaces(tasks: Annotated[TaskService, Depends(authorize)]) -> WorkspaceList:
        return WorkspaceList(items=[Workspace.model_validate(asdict(await tasks.workspace()))])

    @router.post("/workspaces/{workspace_id}/conversations", response_model=Conversation, status_code=201)
    async def create_conversation(workspace_id: UUID, body: ConversationCreateRequest,
                                  tasks: Annotated[TaskService, Depends(authorize)]) -> Conversation:
        return conversation(await tasks.create_conversation(workspace_id, body.title), tasks)

    @router.get("/workspaces/{workspace_id}/conversations", response_model=ConversationPage)
    async def conversations(workspace_id: UUID, tasks: Annotated[TaskService, Depends(authorize)],
                            limit: Annotated[Limit, Query()] = 50, cursor: Cursor = None) -> ConversationPage:
        page = await tasks.conversations(workspace_id, limit, cursor)
        return ConversationPage(items=[conversation(item, tasks) for item in page.items], next_cursor=page.next_cursor)

    @router.get("/conversations/{conversation_id}/messages", response_model=MessagePage)
    async def messages(conversation_id: UUID, tasks: Annotated[TaskService, Depends(authorize)],
                       limit: Annotated[Limit, Query()] = 50, cursor: Cursor = None) -> MessagePage:
        page = await tasks.messages(conversation_id, limit, cursor)
        return MessagePage(items=[Message.model_validate(asdict(item)) for item in page.items], next_cursor=page.next_cursor)

    @router.get("/conversations/{conversation_id}/runs", response_model=RunPage)
    async def runs(conversation_id: UUID, tasks: Annotated[TaskService, Depends(authorize)],
                   limit: Annotated[Limit, Query()] = 50, cursor: Cursor = None) -> RunPage:
        page = await tasks.runs(conversation_id, limit, cursor)
        return RunPage(items=[snapshot(item) for item in page.items], next_cursor=page.next_cursor)

    @router.post("/conversations/{conversation_id}/runs", response_model=RunSnapshot, status_code=202)
    async def submit(conversation_id: UUID, body: RunCreateRequest, request: Request, response: Response,
                     tasks: Annotated[TaskService, Depends(authorize)],
                     idempotency_key: Annotated[UUID, Header(alias="Idempotency-Key")]) -> RunSnapshot:
        keys = request.headers.getlist("idempotency-key")
        try:
            if len(keys) != 1:
                raise ValueError()
            key = idempotency_key
        except ValueError:
            raise APIError(422, "invalid_request", "A UUID Idempotency-Key header is required.") from None
        result = await tasks.submit(conversation_id, body.content, key)
        response.headers["Idempotency-Replayed"] = str(result.replayed).lower()
        return snapshot(result.run)

    @router.get("/runs/{run_id}", response_model=RunSnapshot)
    async def run(run_id: UUID, tasks: Annotated[TaskService, Depends(authorize)]) -> RunSnapshot:
        return snapshot(await tasks.snapshot(run_id))

    return router
