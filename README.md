# Food Gastronomy Trends — Sentiment Pipeline

Project topic
-------------
This repository implements a data pipeline that collects food-related content from web sources (Eater NY) and the Spoonacular API, processes it through a Bronze → Silver → Gold layered architecture, and exposes results via a REST API and interactive dashboards. The project focuses on trend detection and sentiment analysis for gastronomic topics in New York.

Team members
------------
- Maria del Pilar Pradilla Cely
- Jairo Arturo Mosquera
- David Santiago Aldana Gonzalez


Sources and data
----------------
- Eater NY (web articles) — used for trend discovery and contextual analysis.
- Spoonacular API — used to retrieve recipe metadata and enrichment for trending keywords.
- Internal processing uses Spark (PySpark), pandas, and common NLP libraries (spaCy, NLTK, scikit-learn).

Repository structure
--------------------
- `airflow/` — Airflow DAGs and supporting scripts.
	- `airflow/dags/` — DAG definitions: bronze, silver, and unified pipeline.
	- `airflow/dags/scripts/` — ingestion and transformation scripts grouped by layer.
- `api/` — FastAPI service exposing Gold-layer data (`api/main.py`, `api/loader.py`).
- `dashboard/` — Dash applications for governance and storytelling and utility helpers (`utils.py`).
- `datalake_bronze/`, `datalake_silver/`, `datalake_gold/` — sample local partitions for development.
- `Dockerfile`, `Dockerfile.api`, `Dockerfile.dashboard` — container recipes for Airflow, API and Dashboards.
- `docker-compose.yaml` — local development composition for Airflow, dashboards, and the API.
- requirements files: `requirements.txt`, `requirements.api.txt`, `requirements.dashboard.txt`.

Current pipeline status
-----------------------
- Bronze: implemented via `airflow/dags/bronze_ingestion_dag.py` (web + API ingestion).
- Silver: `airflow/dags/silver_processing_dag.py` contains a sensor and a processing task invoking `scripts/silver/preprocess_datasets.py`.
- Gold / Unified pipeline: `airflow/dags/nyc_gastronomy_pipeline.py` defines the high-level sequence (extract → clean → analyze → search → clean recipes → prepare gold), but several tasks are currently stubs and need implementation (e.g., `analyze_trends`, `search_spoonacular`, `clean_recipes`, `prepare_gold`).

Prerequisites
-------------
- Docker and Docker Compose installed (for local development).
- A `.env` file in the repository root containing at least `SPOONACULAR_API_KEY`.
- Optional: Python 3.11 and pip for running API and dashboards locally.

Running the full stack with Docker Compose
-----------------------------------------
Build and start all services in detached mode:
```bash
docker-compose up --build -d
```

Key services and default ports (as configured in `docker-compose.yaml`)
- Airflow Web UI: http://localhost:8080
- Governance dashboard: http://localhost:8050
- Storytelling dashboard: http://localhost:8051
- API (uvicorn): http://localhost:8000

Development credentials
-----------------------
- Airflow development user created by the compose boot step: `admin` / `admin`. Change for production.

Useful Airflow commands (via docker-compose)
-------------------------------------------
List available DAGs:
```bash
docker-compose exec airflow-webserver airflow dags list
```

Trigger a DAG manually (example):
```bash
docker-compose exec airflow-webserver airflow dags trigger bronze_ingestion_pipeline
```

List DAG runs for the unified pipeline:
```bash
docker-compose exec airflow-webserver airflow dags list-runs -d nyc_gastronomy_pipeline
```

Follow scheduler logs:
```bash
docker-compose logs -f airflow-scheduler
```

Visit the Airflow UI at http://localhost:8080 to enable/disable DAGs and inspect XComs, task instances and logs.

Running API and dashboards locally without Docker
------------------------------------------------
API:
```bash
pip install -r requirements.api.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Dashboards:
```bash
pip install -r requirements.dashboard.txt
python dashboard/governance_app.py
python dashboard/storytelling_app.py
```

Both API and dashboards use the `GOLD_BASE` environment variable to locate Gold data (default `datalake_gold`). When using Docker Compose, `./datalake_gold` is mounted into containers and `GOLD_BASE` is set to `/app/datalake_gold`.

Recommendations & notes
------------------------
- Implement the remaining task functions in `airflow/dags/nyc_gastronomy_pipeline.py` to complete the Gold pipeline.
- Improve Dockerfiles for production: add non-root user, `HEALTHCHECK`, and labels.
- Avoid hard-coded credentials; use secret management or environment variables in production deployments.

Troubleshooting
---------------
- If DAGs do not appear in Airflow: confirm `./airflow/dags` is mounted and restart the webserver and scheduler services.
- If dashboards show no data: check that `datalake_gold` contains YYYY-MM-DD partitions with `governance_*.parquet` and `storytelling_*.parquet` files.
- If API keys are missing: verify `.env` and the container environment variables.
