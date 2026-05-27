from __future__ import annotations
import re
from datetime import datetime
from pathlib import Path

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def today_date_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def latest_date_dir(base: Path) -> Path:
    """Return the most recent YYYY-MM-DD subdirectory of *base*.

    Falls back to *base* itself when no date subdirectories exist so that
    scripts remain compatible with data written before date-partitioning was
    introduced.
    """
    if not base.exists():
        return base
    dirs = sorted(
        [d for d in base.iterdir() if d.is_dir() and _DATE_RE.match(d.name)],
        reverse=True,
    )
    return dirs[0] if dirs else base


def today_output_dir(base: Path) -> Path:
    """Return *base*/YYYY-MM-DD for today, creating it if needed."""
    out = base / today_date_str()
    out.mkdir(parents=True, exist_ok=True)
    return out
