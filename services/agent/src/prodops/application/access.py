"""Single-principal development access. Production identity is delivered separately."""

import hmac


class DevelopmentAccess:
    def __init__(self, token: str) -> None:
        self._token = token.encode("utf-8")

    def allows(self, token: str | None) -> bool:
        return token is not None and hmac.compare_digest(self._token, token.encode("utf-8"))
