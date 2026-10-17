"""Read committed event pages in short transactions; never hold one over a stream."""

from uuid import UUID

from sqlalchemy import func, select

from prodops.adapters.storage.models import RunEventRow
from prodops.adapters.storage.recovery import SQLiteRecoveryStore
from prodops.adapters.storage.tasks import storage_operation
from prodops.application.errors import CursorExpired, InvalidCursor
from prodops.domain.records import EventPage, EventRecord
from prodops.domain.runs import RunStatus


class SQLiteEventStore(SQLiteRecoveryStore):
    @storage_operation
    async def read_events(self, run_id: UUID, after_seq: int, limit: int) -> EventPage:
        if type(after_seq) is not int or not 0 <= after_seq <= 9007199254740991 or type(limit) is not int or not 1 <= limit <= 32:
            raise InvalidCursor()
        async with self.transaction() as session:
            run = await self._scoped(session, run_id)
            if after_seq > run.last_event_seq:
                raise InvalidCursor()
            first = await session.scalar(select(func.min(RunEventRow.seq)).where(RunEventRow.run_id == str(run_id)))
            floor = first - 1 if first is not None else run.last_event_seq
            if after_seq < floor:
                raise CursorExpired()
            rows = list(await session.scalars(select(RunEventRow).where(RunEventRow.run_id == str(run_id), RunEventRow.seq > after_seq).order_by(RunEventRow.seq).limit(limit)))
            if (not rows and after_seq < run.last_event_seq) or any(row.seq != after_seq + index + 1 for index, row in enumerate(rows)):
                raise CursorExpired()
            return EventPage(tuple(EventRecord(UUID(row.run_id), row.seq, row.schema_version, row.event_type, row.occurred_at, row.payload) for row in rows),
                             run.last_event_seq, RunStatus(run.status))
