"""
Push notification endpoints.

POST /api/notify/register   — mobile app registers its Expo push token
POST /api/notify/pipeline   — called by Airflow when a pipeline run finishes
"""
from __future__ import annotations

import json
from pathlib import Path

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

_TOKENS_FILE = Path("/opt/airflow/datalake") / "push_tokens.json"


def _load_tokens() -> list[str]:
    if not _TOKENS_FILE.exists():
        return []
    try:
        return json.loads(_TOKENS_FILE.read_text())
    except Exception:
        return []


def _save_tokens(tokens: list[str]) -> None:
    _TOKENS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _TOKENS_FILE.write_text(json.dumps(tokens))


class RegisterBody(BaseModel):
    token: str


class PipelineBody(BaseModel):
    dag_id: str = "nyc_gastronomy_pipeline"
    message: str = "Fresh NYC food data is ready. Open the app to explore the latest trends."


@router.post("/register")
def register_token(body: RegisterBody):
    tokens = _load_tokens()
    if body.token not in tokens:
        tokens.append(body.token)
        _save_tokens(tokens)
    return {"registered": len(tokens)}


@router.post("/pipeline")
def notify_pipeline_complete(body: PipelineBody):
    tokens = _load_tokens()
    if not tokens:
        return {"sent": 0, "detail": "No registered devices"}

    messages = [
        {
            "to": token,
            "channelId": "pipeline",
            "title": "Empire's Taste — Data updated",
            "body": body.message,
            "sound": "default",
        }
        for token in tokens
    ]

    try:
        resp = httpx.post(
            "https://exp.host/--/api/v2/push/send",
            json=messages,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            timeout=10,
        )
        return {"sent": len(tokens), "expo_status": resp.status_code}
    except Exception as exc:
        return {"sent": 0, "error": str(exc)}
