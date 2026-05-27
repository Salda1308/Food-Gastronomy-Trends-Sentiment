"""
Upload the latest Gold layer partition to S3 after each pipeline run.
This makes the Gold Parquet files available to the Lambda FastAPI function.

Required environment variables (set in .env):
  AWS_ACCESS_KEY_ID     — AWS credentials
  AWS_SECRET_ACCESS_KEY
  AWS_S3_BUCKET         — target bucket name (e.g. empire-taste)
  AWS_REGION            — bucket region (e.g. us-east-1)
"""
from __future__ import annotations

import os
from pathlib import Path

DATALAKE_BASE = Path("/opt/airflow/datalake")
S3_BUCKET     = os.environ.get("AWS_S3_BUCKET", "")
AWS_REGION    = os.environ.get("AWS_REGION", "us-east-1")


def upload_gold_to_s3() -> dict:
    """
    Upload all files in the latest Gold date partition to S3.

    S3 key structure mirrors the local path:
      local:  datalake/gold/2026-05-27/governance_020250.parquet/part-*.snappy.parquet
      S3:     s3://<bucket>/gold/2026-05-27/governance_020250.parquet/part-*.snappy.parquet
    """
    if not S3_BUCKET:
        raise EnvironmentError(
            "AWS_S3_BUCKET not set. Add it to your .env file."
        )

    import boto3
    from scripts.utils import latest_date_dir

    s3 = boto3.client("s3", region_name=AWS_REGION)
    gold_base = DATALAKE_BASE / "gold"
    latest    = latest_date_dir(gold_base)

    uploaded: list[str] = []
    for local_file in latest.rglob("*"):
        if not local_file.is_file():
            continue
        # Build S3 key relative to datalake root
        s3_key = str(local_file.relative_to(DATALAKE_BASE))
        s3.upload_file(str(local_file), S3_BUCKET, s3_key)
        uploaded.append(s3_key)
        print(f"[s3_upload] Uploaded: s3://{S3_BUCKET}/{s3_key}")

    print(f"[s3_upload] Done — {len(uploaded)} file(s) → s3://{S3_BUCKET}/gold/{latest.name}/")
    return {"bucket": S3_BUCKET, "partition": latest.name, "files": uploaded}


if __name__ == "__main__":
    result = upload_gold_to_s3()
    print(result)
