"""
Shared Gold layer loader for API routers.
Supports both local filesystem (development) and S3 (AWS Lambda production).

The GOLD_BASE environment variable controls where data is read from:
  - Local:  GOLD_BASE=datalake_gold          (default, for docker-compose)
  - AWS S3: GOLD_BASE=s3://empire-taste/gold  (Lambda production)
"""
from __future__ import annotations

import os
import re
from pathlib import Path

import pandas as pd

GOLD_BASE = os.environ.get("GOLD_BASE", "datalake_gold")
_DATE_RE  = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _is_s3() -> bool:
    return GOLD_BASE.startswith("s3://")


# ── S3 helpers ────────────────────────────────────────────────────────────────

def _s3fs():
    import s3fs
    return s3fs.S3FileSystem()


def _latest_date_dir_s3() -> str:
    fs = _s3fs()
    base = GOLD_BASE.rstrip("/").removeprefix("s3://")
    try:
        entries = fs.ls(base, detail=False)
    except FileNotFoundError:
        raise FileNotFoundError(f"S3 path not found: s3://{base}")

    dirs = [e for e in entries if _DATE_RE.match(e.split("/")[-1])]
    if not dirs:
        raise FileNotFoundError(f"No date partitions found in s3://{base}")
    return "s3://" + sorted(dirs)[-1]


def _read_parquet_s3(pattern: str) -> pd.DataFrame:
    import fnmatch
    fs = _s3fs()
    latest = _latest_date_dir_s3()
    base = latest.removeprefix("s3://")

    all_entries = fs.ls(base, detail=False)
    matches = sorted(
        [e for e in all_entries if fnmatch.fnmatch(e.split("/")[-1], pattern)],
        key=lambda e: fs.info(e)["LastModified"],
        reverse=True,
    )
    if not matches:
        raise FileNotFoundError(f"No Gold file matching '{pattern}' in {latest}")

    target = matches[0]
    # Spark coalesce(1) writes a directory — find the part file inside
    if fs.isdir(target):
        parts = [
            f for f in fs.ls(target, detail=False)
            if f.endswith(".snappy.parquet") or f.endswith(".parquet")
        ]
        if not parts:
            raise FileNotFoundError(f"No part files in Spark output dir: s3://{target}")
        target = parts[0]

    return pd.read_parquet(f"s3://{target}", filesystem=fs)


# ── Local helpers ─────────────────────────────────────────────────────────────

def _latest_date_dir_local() -> Path:
    base = Path(GOLD_BASE)
    if not base.exists():
        raise FileNotFoundError(f"Gold base directory not found: {base}")
    dirs = sorted(
        [d for d in base.iterdir() if d.is_dir() and _DATE_RE.match(d.name)],
        reverse=True,
    )
    if not dirs:
        raise FileNotFoundError(f"No date partitions found under {base}")
    return dirs[0]


def _read_parquet_local(pattern: str) -> pd.DataFrame:
    latest = _latest_date_dir_local()
    matches = sorted(
        latest.glob(pattern),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not matches:
        raise FileNotFoundError(f"No Gold file matching '{pattern}' in {latest}")

    target = matches[0]
    if target.is_dir():
        parts = (
            list(target.glob("part-*.snappy.parquet"))
            or list(target.glob("part-*.parquet"))
        )
        if not parts:
            raise FileNotFoundError(f"No part files in Spark output dir: {target}")
        return pd.read_parquet(parts[0])

    return pd.read_parquet(target)


# ── Public interface ──────────────────────────────────────────────────────────

def _read_parquet(pattern: str) -> pd.DataFrame:
    if _is_s3():
        return _read_parquet_s3(pattern)
    return _read_parquet_local(pattern)


def load_governance() -> pd.DataFrame:
    return _read_parquet("governance_*.parquet")


def load_storytelling() -> pd.DataFrame:
    return _read_parquet("storytelling_*.parquet")


def latest_partition_date() -> str:
    if _is_s3():
        return _latest_date_dir_s3().split("/")[-1]
    return _latest_date_dir_local().name
