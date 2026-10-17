"""Frozen desktop executable entry; transport remains the private parent pipe."""

from multiprocessing import freeze_support

from prodops.bootstrap.desktop import main

if __name__ == "__main__":
    freeze_support()
    raise SystemExit(main())
