"""One lifespan-owned scheduler. Database claims, never request tasks, own execution."""

import asyncio
from collections.abc import Callable
from contextlib import suppress
from time import monotonic
from uuid import uuid4

from prodops.application.errors import CancellationRequested, ExecutionBudgetExceeded, LostOwnership, StorageFailure
from prodops.application.execution import DiagnosticAgent, DiagnosticTools, ExecutionStore
from prodops.domain.execution import ExecutionLease, Observation, ToolRequest


class Scheduler:
    def __init__(self, store: ExecutionStore, agent: DiagnosticAgent, tools: DiagnosticTools,
                 concurrency: int, on_failure: Callable[[], None]) -> None:
        self.store, self.agent, self.tools = store, agent, tools
        self.concurrency, self.on_failure = concurrency, on_failure
        self.owner_id = uuid4()
        self.healthy = False
        self._stop = asyncio.Event()
        self._runner: asyncio.Task[None] | None = None

    async def start(self) -> None:
        if self._runner is not None:
            raise RuntimeError("Scheduler already started")
        self._stop.clear()
        self.healthy = True
        self._runner = asyncio.create_task(self._run(), name="prodops-scheduler")

    async def stop(self) -> None:
        runner, self._runner = self._runner, None
        self._stop.set()
        if runner is not None:
            try:
                await asyncio.wait_for(asyncio.shield(runner), timeout=5)
            except TimeoutError:
                runner.cancel()
                await asyncio.gather(runner, return_exceptions=True)
        self.healthy = False

    async def _run(self) -> None:
        workers: set[asyncio.Task[None]] = set()
        try:
            while not self._stop.is_set():
                for worker in tuple(workers):
                    if worker.done():
                        workers.remove(worker)
                        worker.result()
                while len(workers) < self.concurrency and not self._stop.is_set():
                    lease = await self.store.claim(self.owner_id)
                    if lease is None:
                        break
                    workers.add(asyncio.create_task(self._execute(lease), name=f"prodops-run-{lease.run_id}"))
                with suppress(TimeoutError):
                    await asyncio.wait_for(self._stop.wait(), timeout=0.05)
            if workers:
                await asyncio.gather(*workers)
        except asyncio.CancelledError:
            raise
        except Exception:
            self.healthy = False
            self.on_failure()
        finally:
            for worker in workers:
                if not worker.done():
                    worker.cancel()
            if workers:
                await asyncio.gather(*workers, return_exceptions=True)

    async def _observe(self, lease: ExecutionLease, request: ToolRequest, elapsed: Callable[[], float]) -> Observation:
        async def heartbeat() -> None:
            while True:
                await asyncio.sleep(1)
                await self.store.heartbeat(lease, elapsed())

        tool = asyncio.create_task(self.tools.execute(request))
        beat = asyncio.create_task(heartbeat())
        try:
            done, _ = await asyncio.wait((tool, beat), return_when=asyncio.FIRST_COMPLETED)
            if beat in done:
                await beat
                raise StorageFailure()
            return await tool
        finally:
            for task in (tool, beat):
                if not task.done():
                    task.cancel()
            await asyncio.gather(tool, beat, return_exceptions=True)

    async def _execute(self, lease: ExecutionLease) -> None:
        started = monotonic()
        prior_elapsed = lease.elapsed_seconds

        def elapsed() -> float:
            return prior_elapsed + monotonic() - started

        async def fail(code: str, message: str, *, interrupted: bool = False) -> None:
            with suppress(LostOwnership):
                await self.store.fail(lease, code, message, elapsed(), interrupted=interrupted)

        try:
            remaining = lease.policy.run_timeout - prior_elapsed
            if remaining <= 0:
                raise ExecutionBudgetExceeded()
            async with asyncio.timeout(remaining):
                observations: list[Observation] = list(lease.observations)
                for request in self.agent.plan(lease.content)[lease.completed_steps:]:
                    lease, call_id = await self.store.begin_tool(lease, request, elapsed())
                    try:
                        async with asyncio.timeout(lease.policy.tool_timeout):
                            observation = await self._observe(lease, request, elapsed)
                    except TimeoutError:
                        await fail("tool_failed", "Mock tool timed out. No further tools were scheduled.")
                        return
                    lease = await self.store.finish_tool(lease, call_id, observation, elapsed())
                    observations.append(observation)
                await self.store.complete(lease, self.agent.answer(tuple(observations)), elapsed())
        except CancellationRequested:
            with suppress(LostOwnership):
                await self.store.acknowledge_cancel(lease, elapsed())
        except (TimeoutError, ExecutionBudgetExceeded):
            await fail("budget_exceeded", "Task execution budget exceeded. No further tools were scheduled.")
        except LostOwnership:
            return
        except StorageFailure:
            raise
        except asyncio.CancelledError:
            await fail("internal_error", "Service stopped before the task result was confirmed. Review required.", interrupted=True)
            raise
        except Exception:
            await fail("tool_failed", "Mock diagnostic failed. No further tools were scheduled.")
