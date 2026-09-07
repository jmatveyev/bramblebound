"""Rebuild the standalone, root, and GitHub Pages game entry points."""
from pathlib import Path
import subprocess
import sys


def main() -> int:
    root = Path(__file__).resolve().parent
    for name in ("bramblebound.html", "index.html", "docs/index.html"):
        result = subprocess.run(
            [sys.executable, str(root / "source/build.py"), "--output", str(root / name)],
            check=False,
        )
        if result.returncode:
            return result.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
