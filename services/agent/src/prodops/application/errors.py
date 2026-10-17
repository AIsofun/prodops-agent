"""Expected use-case failures; no external input or exception details in messages."""


class ResourceNotFound(Exception):
    pass


class ActiveRunConflict(Exception):
    pass


class IdempotencyConflict(Exception):
    pass


class InvalidCursor(Exception):
    pass


class StorageFailure(Exception):
    pass


class QueueFull(Exception):
    pass


class LostOwnership(Exception):
    pass


class ExecutionBudgetExceeded(Exception):
    pass


class CancellationRequested(Exception):
    pass


class InvalidRecovery(Exception):
    pass


class CursorExpired(Exception):
    pass
