"""Explicit configuration loading; never read environment at import time."""

from collections.abc import Mapping
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, SecretStr, ValidationError, model_validator

from prodops.domain.deployment import DeploymentMode

ENV_FIELDS = {
    "PRODOPS_MODE": "mode",
    "PRODOPS_ENVIRONMENT": "environment",
    "PRODOPS_HOST": "host",
    "PRODOPS_PORT": "port",
    "PRODOPS_DATABASE": "database",
    "PRODOPS_DEVELOPMENT_TOKEN": "development_token",
    "PRODOPS_EXECUTION_ENABLED": "execution_enabled",
    "PRODOPS_MAX_CONCURRENT_RUNS": "max_concurrent_runs",
    "PRODOPS_QUEUE_LIMIT": "queue_limit",
    "PRODOPS_MAX_TOOL_CALLS": "max_tool_calls",
    "PRODOPS_RUN_TIMEOUT": "run_timeout",
    "PRODOPS_TOOL_TIMEOUT": "tool_timeout",
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
    database: Path | None = None
    development_token: SecretStr | None = Field(default=None, min_length=32, max_length=256)
    execution_enabled: bool = False
    max_concurrent_runs: int | None = Field(default=None, ge=1, le=4)
    queue_limit: int = Field(default=100, ge=1, le=100)
    max_tool_calls: int = Field(default=12, ge=1, le=100)
    run_timeout: float = Field(default=600, gt=0, le=600, allow_inf_nan=False)
    tool_timeout: float = Field(default=30, gt=0, le=600, allow_inf_nan=False)

    @model_validator(mode="after")
    def validate_business_configuration(self) -> "ServiceSettings":
        if (self.database is None) != (self.development_token is None):
            raise ValueError("database and development_token must be configured together")
        if self.database is not None and not self.database.is_absolute():
            raise ValueError("database must be an absolute path")
        if self.execution_enabled and self.database is None:
            raise ValueError("execution requires protected storage")
        if self.mode == DeploymentMode.LOCAL and self.max_concurrent_runs not in (None, 1):
            raise ValueError("local concurrency is limited to one")
        return self


def load_settings(environ: Mapping[str, str], *, mode: str | None = None,
                  host: str | None = None, port: str | None = None,
                  database: str | None = None) -> ServiceSettings:
    unknown = sorted(key for key in environ if key.startswith("PRODOPS_") and key not in ENV_FIELDS)
    if unknown:
        raise ConfigurationError("Unknown configuration keys: " + ", ".join(unknown))
    values = {field: environ[key] for key, field in ENV_FIELDS.items() if key in environ}
    for field, value in (("mode", mode), ("host", host), ("port", port), ("database", database)):
        if value is not None:
            values[field] = value
    try:
        return ServiceSettings.model_validate(values)
    except ValidationError as exc:
        details = "; ".join(f"{'.'.join(map(str, error['loc']))}: {error['type']}"
                            for error in exc.errors(include_input=False, include_url=False))
        raise ConfigurationError("Invalid configuration: " + details) from None
