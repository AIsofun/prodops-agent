"""Actual read-only capabilities endpoint and a single-source schema registry."""

from collections.abc import Callable
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, FastAPI, Header, Response
from fastapi.openapi.utils import get_openapi

from prodops.api.errors import ProtocolError
from prodops.api.models import (
    PROTOCOL_VERSION, CapabilitiesResponse, ErrorResponse, ReservedContracts,
)
from prodops.domain.deployment import DeploymentMode
from prodops.domain.events import EVENT_SCHEMA_VERSION


def capabilities_router(mode: DeploymentMode, deployment_id: Callable[[], UUID],
                        business_ready: Callable[[], bool], execution_ready: Callable[[], bool]) -> APIRouter:
    router = APIRouter(prefix="/api/v1", tags=["capabilities"])

    @router.get("/capabilities", response_model=CapabilitiesResponse,
                responses={426: {"model": ErrorResponse}, 422: {"model": ErrorResponse}})
    async def capabilities(
        response: Response,
        protocol: Annotated[str | None, Header(alias="X-ProdOps-Protocol",
            description="Omit for discovery; when supplied it must exactly match 1.4.")] = None,
    ) -> CapabilitiesResponse:
        if protocol is not None and protocol != PROTOCOL_VERSION:
            raise ProtocolError()
        response.headers["Cache-Control"] = "no-store"
        enabled = business_ready()
        return CapabilitiesResponse(protocol_version="1.4", event_schema_version=EVENT_SCHEMA_VERSION,
                                    deployment_id=deployment_id(), mode=mode,
                                    scope="development" if enabled else "service_skeleton",
                                    authentication="development_token" if enabled else "unavailable",
                                    conversations=enabled, runs=enabled, event_stream=enabled, execution_enabled=execution_ready())

    return router


class ContractAPI(FastAPI):
    def openapi(self) -> dict[str, Any]:
        if self.openapi_schema is None:
            schema = get_openapi(title=self.title, version=self.version, routes=self.routes,
                                 description=self.description)
            reserved = ReservedContracts.model_json_schema(ref_template="#/components/schemas/{model}")
            components = schema.setdefault("components", {}).setdefault("schemas", {})
            for name, definition in reserved.pop("$defs", {}).items():
                if name in components and components[name] != definition:
                    raise ValueError(f"Conflicting contract schema: {name}")
                components[name] = definition
            components["ReservedContracts"] = reserved
            schema["x-prodops-reserved-models"] = {"$ref": "#/components/schemas/ReservedContracts"}
            schema["x-prodops-protocol-version"] = PROTOCOL_VERSION
            self.openapi_schema = schema
        return self.openapi_schema
