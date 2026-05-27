"""
Empire's Taste — REST API
=========================
FastAPI service that exposes Gold layer Parquet data as JSON endpoints.
Designed to back a Flutter mobile app and future Azure deployment.

All endpoints read from the latest YYYY-MM-DD Gold partition.
No external dependencies — data flows exclusively from the Gold layer.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import governance, storytelling, recommendations

app = FastAPI(
    title="Empire's Taste API",
    description="NYC Gastronomic Trends & Sentiment — Gold layer REST interface",
    version="1.0.0",
)

# Allow Flutter app (and local dashboard dev) to call the API from any origin.
# Restrict origins in production to your specific domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(governance.router,       prefix="/api/governance",       tags=["Governance"])
app.include_router(storytelling.router,    prefix="/api/storytelling",    tags=["Storytelling"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])


@app.get("/health", tags=["Health"])
def health():
    """Liveness probe — returns OK if the API process is running."""
    return {"status": "ok", "service": "empire-taste-api"}


# AWS Lambda entry point — Mangum wraps the FastAPI app so Lambda can invoke it.
# When running locally with uvicorn this variable is ignored.
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except ImportError:
    pass
