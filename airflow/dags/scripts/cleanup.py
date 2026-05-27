"""
Datalake storage cleanup — rolling retention window.

Deletes date-partitioned directories (YYYY-MM-DD/) from Bronze, Silver, and
Gold layers that are older than RETENTION_DAYS.  Called as the final step of
the pipeline DAG so every successful run trims the oldest data automatically.

Cloud cost rationale
--------------------
Each daily run writes ~5-20 MB across three layers.  Without cleanup that
accumulates to several GB/month on S3 or Azure Blob.  A 30-day window keeps
the data needed for trend analysis (4 weeks) while capping storage at a
predictable ceiling.
"""
from __future__ import annotations

import re
import shutil
from datetime import date, timedelta
from pathlib import Path

RETENTION_DAYS = 30
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

_DATALAKE_BASE = Path("/opt/airflow/datalake")

_LAYERS = [
    _DATALAKE_BASE / "bronze" / "api",
    _DATALAKE_BASE / "bronze" / "webscraping",
    _DATALAKE_BASE / "silver" / "api",
    _DATALAKE_BASE / "silver" / "webscraping",
    _DATALAKE_BASE / "gold",
]


def _date_dirs(layer: Path) -> list[tuple[date, Path]]:
    """Return (date, path) pairs for all YYYY-MM-DD subdirs, sorted oldest first."""
    if not layer.exists():
        return []
    result = []
    for d in layer.iterdir():
        if d.is_dir() and _DATE_RE.match(d.name):
            try:
                result.append((date.fromisoformat(d.name), d))
            except ValueError:
                pass
    return sorted(result, key=lambda x: x[0])


def cleanup(retention_days: int = RETENTION_DAYS, dry_run: bool = False) -> dict:
    """
    Delete all date partitions older than `retention_days` across all layers.

    Returns a summary dict with lists of deleted and kept directories.
    dry_run=True logs what would be deleted without removing anything.
    """
    cutoff = date.today() - timedelta(days=retention_days)
    deleted: list[str] = []
    kept:    list[str] = []
    errors:  list[str] = []

    print(f"[cleanup] Retention window: {retention_days} days  |  Cutoff date: {cutoff}")

    for layer in _LAYERS:
        for partition_date, path in _date_dirs(layer):
            if partition_date < cutoff:
                label = str(path)
                if dry_run:
                    print(f"[cleanup] DRY RUN — would delete: {label}")
                    deleted.append(label)
                else:
                    try:
                        shutil.rmtree(path)
                        print(f"[cleanup] Deleted: {label}")
                        deleted.append(label)
                    except Exception as exc:
                        msg = f"Failed to delete {label}: {exc}"
                        print(f"[cleanup] ERROR — {msg}")
                        errors.append(msg)
            else:
                kept.append(str(path))

    print(
        f"[cleanup] Done — deleted {len(deleted)} partition(s), "
        f"kept {len(kept)}, errors {len(errors)}"
    )
    return {"deleted": deleted, "kept": kept, "errors": errors}


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Datalake partition cleanup")
    parser.add_argument("--retention-days", type=int, default=RETENTION_DAYS)
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be deleted without removing anything")
    args = parser.parse_args()
    cleanup(retention_days=args.retention_days, dry_run=args.dry_run)
