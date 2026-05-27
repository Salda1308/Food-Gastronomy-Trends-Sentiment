from __future__ import annotations
import os
import re
import glob as _glob
from datetime import datetime
from pathlib import Path

import pandas as pd

GOLD_BASE = os.environ.get("GOLD_BASE", "datalake_gold")

COLOR_PALETTE: dict[str, str] = {
    "POSITIVE": "#27AE60",
    "NEGATIVE": "#E74C3C",
    "NEUTRAL":  "#95A5A6",
    "PRIMARY":  "#2C3E50",
    "ACCENT":   "#F39C12",
    "NULL_HIGH": "#E74C3C",
    "NULL_MED":  "#E67E22",
    "NULL_LOW":  "#F1C40F",
}

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _latest_date_dir(base: Path) -> Path:
    if not base.exists():
        raise FileNotFoundError(f"Gold base directory not found: {base}")
    dirs = sorted(
        [d for d in base.iterdir() if d.is_dir() and _DATE_RE.match(d.name)],
        reverse=True,
    )
    if not dirs:
        raise FileNotFoundError(f"No date-partitioned subdirectories found under {base}")
    return dirs[0]


def load_latest_gold(pattern: str) -> pd.DataFrame:
    """
    Finds the most recent YYYY-MM-DD subdirectory under GOLD_BASE,
    globs for files/dirs matching `pattern`, then reads the parquet.

    Spark writes coalesce(1) parquet as a directory containing
    part-*.snappy.parquet — this function handles both that format
    and a plain single-file parquet.
    """
    base = Path(GOLD_BASE)
    latest = _latest_date_dir(base)

    matches = sorted(
        latest.glob(pattern),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not matches:
        raise FileNotFoundError(f"No files matching '{pattern}' in {latest}")

    target = matches[0]

    if target.is_dir():
        parts = (
            list(target.glob("part-*.snappy.parquet"))
            or list(target.glob("part-*.parquet"))
        )
        if not parts:
            raise FileNotFoundError(
                f"No part files found in Spark output directory: {target}"
            )
        return pd.read_parquet(parts[0])

    return pd.read_parquet(target)


def format_timestamp(pattern: str) -> str:
    """Returns human-readable mtime of the latest Gold file matching pattern."""
    try:
        base = Path(GOLD_BASE)
        latest = _latest_date_dir(base)
        matches = sorted(
            latest.glob(pattern),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if not matches:
            return "No data loaded"
        mtime = matches[0].stat().st_mtime
        return datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return "Unknown"
