"""Deployment location, shared by service assembly and health reporting."""

from enum import StrEnum


class DeploymentMode(StrEnum):
    LOCAL = "local"
    SERVER = "server"
