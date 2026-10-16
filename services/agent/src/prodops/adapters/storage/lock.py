"""Process-held database service lock; OS releases it after abnormal termination."""

from pathlib import Path
import sys
from typing import BinaryIO

if sys.platform == "win32":
    import msvcrt
else:
    import fcntl

from prodops.adapters.storage.sqlite import StorageInitializationError


class DatabaseServiceLock:
    def __init__(self, database: Path) -> None:
        self.database = database
        self._handle: BinaryIO | None = None

    def acquire(self) -> None:
        if self._handle is not None:
            raise StorageInitializationError("Database service lock is already held.")
        handle: BinaryIO | None = None
        try:
            canonical = self.database.resolve()
            path = canonical.with_name(canonical.name + ".service.lock")
            path.parent.mkdir(parents=True, exist_ok=True)
            handle = path.open("a+b")
            if handle.seek(0, 2) == 0:
                handle.write(b"0")
                handle.flush()
            handle.seek(0)
            if sys.platform == "win32":
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            if handle is not None:
                handle.close()
            raise StorageInitializationError("Database is already owned by another service or cannot be locked.") from None
        self._handle = handle

    def release(self) -> None:
        handle, self._handle = self._handle, None
        if handle is not None:
            # Closing releases the OS lock. Keep the lock file to avoid inode races.
            handle.close()
