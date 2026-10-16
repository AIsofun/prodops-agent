"""Bounded opaque keyset cursors, scoped to a workspace and resource."""

import base64
from datetime import datetime, timedelta
import json
import re
from uuid import UUID

from prodops.application.errors import InvalidCursor


def encode_cursor(kind: str, workspace_id: str, resource_id: str, created_at: datetime, row_id: str) -> str:
    value = {"v": 1, "k": kind, "w": workspace_id, "r": resource_id, "t": created_at.isoformat(), "i": row_id}
    return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode("utf-8")).decode("ascii").rstrip("=")


def decode_cursor(cursor: str | None, kind: str, workspace_id: str, resource_id: str) -> tuple[datetime, str] | None:
    if cursor is None:
        return None
    try:
        if not 1 <= len(cursor) <= 512 or re.fullmatch(r"[A-Za-z0-9_-]+", cursor) is None:
            raise ValueError()
        value: object = json.loads(base64.b64decode(cursor + "=" * (-len(cursor) % 4), altchars=b"-_", validate=True))
        if not isinstance(value, dict) or set(value) != {"v", "k", "w", "r", "t", "i"} or type(value["v"]) is not int or value["v"] != 1:
            raise ValueError()
        if (value["k"], value["w"], value["r"]) != (kind, workspace_id, resource_id) or not isinstance(value["t"], str) or not isinstance(value["i"], str):
            raise ValueError()
        timestamp = datetime.fromisoformat(value["t"])
        if timestamp.utcoffset() != timedelta(0):
            raise ValueError()
        row_id = str(UUID(value["i"]))
        return timestamp, row_id
    except (ValueError, TypeError, UnicodeError):
        raise InvalidCursor() from None
