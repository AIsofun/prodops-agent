"""Run the development skeleton: python -m prodops.bootstrap.cli --mode local."""

import argparse
import os
import sys
from collections.abc import Sequence

import uvicorn

from prodops.bootstrap.app import create_app
from prodops.bootstrap.config import ConfigurationError, load_settings


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ProdOps development service (loopback only)")
    parser.add_argument("--mode", help="local or server; otherwise requires PRODOPS_MODE")
    parser.add_argument("--host", help="development skeleton permits only 127.0.0.1")
    parser.add_argument("--port", help="0 allocates an available port; overrides PRODOPS_PORT")
    parser.add_argument("--database", help="absolute SQLite path; requires PRODOPS_DEVELOPMENT_TOKEN")
    args = parser.parse_args(argv)
    try:
        settings = load_settings(os.environ, mode=args.mode, host=args.host, port=args.port, database=args.database)
    except ConfigurationError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    print(f"ProdOps {settings.mode.value}: development skeleton; no production authentication.",
          file=sys.stderr, flush=True)
    uvicorn.run(create_app(settings), host=settings.host, port=settings.port, workers=1,
                lifespan="on", access_log=False, server_header=False,
                timeout_graceful_shutdown=5)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
