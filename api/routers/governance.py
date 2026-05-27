"""
Governance endpoints — expose pipeline quality KPIs from the Gold layer.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.loader import load_governance, latest_partition_date

router = APIRouter()


@router.get("/")
def get_governance():
    """
    Return all governance KPI rows from the latest Gold partition.

    Response shape:
    {
      "partition_date": "2026-05-27",
      "row_count": 87,
      "data": [ { kpi_name, category, source, field, value, unit, finding, computed_at }, ... ]
    }
    """
    try:
        df = load_governance()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return {
        "partition_date": latest_partition_date(),
        "row_count": len(df),
        "data": df.to_dict(orient="records"),
    }


@router.get("/kpis")
def get_kpi_summary():
    """
    Return a compact summary of the four headline KPIs shown in the dashboard cards.

    Response shape:
    {
      "partition_date": "2026-05-27",
      "total_records": 78,
      "max_null_rate": 89.74,
      "duplicate_rate": 50.0,
      "schema_compliance_rate": 100.0
    }
    """
    try:
        df = load_governance()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    total_records      = int(df[df["kpi_name"] == "record_count"]["value"].sum())
    max_null           = float(df[df["kpi_name"] == "null_rate"]["value"].max()) if not df[df["kpi_name"] == "null_rate"].empty else 0.0
    duplicate_rate     = float(df[df["kpi_name"] == "duplicate_rate"]["value"].max()) if not df[df["kpi_name"] == "duplicate_rate"].empty else 0.0
    schema_compliance  = float(df[df["kpi_name"] == "schema_compliance_rate"]["value"].min()) if not df[df["kpi_name"] == "schema_compliance_rate"].empty else 0.0

    return {
        "partition_date":       latest_partition_date(),
        "total_records":        total_records,
        "max_null_rate":        round(max_null, 2),
        "duplicate_rate":       round(duplicate_rate, 2),
        "schema_compliance_rate": round(schema_compliance, 2),
    }


@router.get("/null-rates")
def get_null_rates():
    """
    Return null rate per field (only fields with null_rate > 0), sorted by severity.
    """
    try:
        df = load_governance()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    nr = (
        df[(df["kpi_name"] == "null_rate") & (df["value"] > 0)]
        [["source", "field", "value"]]
        .sort_values("value", ascending=False)
    )
    return {
        "partition_date": latest_partition_date(),
        "data": nr.to_dict(orient="records"),
    }
