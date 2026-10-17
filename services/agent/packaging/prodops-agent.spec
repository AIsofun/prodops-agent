# Windows AMD64 onedir service. Explicit runtime data only, never user data/config.
from pathlib import Path

root = Path(SPECPATH).resolve().parents[2]
source = root / "services" / "agent" / "src"
a = Analysis(
    [str(source / "prodops/bootstrap/packaged.py")],
    pathex=[str(source)],
    binaries=[],
    datas=[
        (str(source / "prodops/adapters/fixtures/diagnostics.json"), "prodops/adapters/fixtures"),
        (str(source / "prodops/adapters/storage/migrations/env.py"), "prodops/adapters/storage/migrations"),
        (str(source / "prodops/adapters/storage/migrations/versions/0001_storage.py"), "prodops/adapters/storage/migrations/versions"),
    ],
    hiddenimports=[
        "aiosqlite", "sqlalchemy.dialects.sqlite.aiosqlite", "sqlalchemy.sql.default_comparator",
        "uvicorn.logging", "uvicorn.loops.asyncio", "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.websockets.auto", "uvicorn.lifespan.on",
    ],
    hookspath=[], hooksconfig={}, runtime_hooks=[],
    excludes=["tkinter", "pytest", "mypy", "httpx2"],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [], exclude_binaries=True, name="prodops-agent", debug=False,
          bootloader_ignore_signals=False, strip=False, upx=False, console=True)
coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name="prodops-agent")
