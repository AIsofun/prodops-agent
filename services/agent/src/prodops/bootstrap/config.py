"""Explicit configuration loading; never read environment at import time."""

from collections.abc import Mapping
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from prodops.domain.deployment import DeploymentMode

ENV_FIELDS = {
    "PRODOPS_MODE": "mode",
    "PRODOPS_ENVIRONMENT": "environment",
    "PRODOPS_HOST": "host",
    "PRODOPS_PORT": "port",
}


class ConfigurationError(ValueError):
    """Safe to display: contains field names/error types, never input values."""


class ServiceSettings(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", hide_input_in_errors=True)

    mode: DeploymentMode
    environment: Literal["development"] = "development"
    # Authentication is delivered in M4. Never expose this skeleton to a LAN.
    host: Literal["127.0.0.1"] = "127.0.0.1"
    port: int = Field(default=0, ge=0, le=65535)


def load_settings(environ: Mapping[str, str], *, mode: str | None = None,
                  host: str | None = None, port: str | None = None) -> ServiceSettings:
    unknown = sorted(key for key in environ if key.startswith("PRODOPS_") and key not in ENV_FIELDS)
    if unknown:
        raise ConfigurationError("Unknown configuration keys: " + ", ".join(unknown))
    values = {field: environ[key] for key, field in ENV_FIELDS.items() if key in environ}
    for field, value in (("mode", mode), ("host", host), ("port", port)):
        if value is not None:
            values[field] = value
    try:
        return ServiceSettings.model_validate(values)
    except ValidationError as exc:
        details = "; ".join(f"{'.'.join(map(str, error['loc']))}: {error['type']}"
                            for error in exc.errors(include_input=False, include_url=False))
        raise ConfigurationError("Invalid configuration: " + details) from None
