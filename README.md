# Empire's Taste — NYC Gastronomic Intelligence Pipeline

Sentiment analysis pipeline for NYC food and gastronomy trends.
Collects data from the Spoonacular recipe API and Eater NY news articles, processes it through a **Bronze → Silver → Gold medallion architecture** orchestrated by Apache Airflow, and exposes the results through two Plotly Dash dashboards and a FastAPI serving layer.

---

## Architecture

```
Eater NY RSS ──────────────┐
                           ▼
                    Bronze layer (JSON)
                           │
Spoonacular API ──────┐    │  NLP preprocess
 (trend-driven query) │    ▼
                      └──▶ Silver layer (Parquet)
                                   │
                                   │  PySpark aggregations
                                   ▼
                            Gold layer (Parquet)
                           ╱              ╲
               Governance Dashboard   Storytelling Dashboard
               (data quality KPIs)    (trends for chefs)
                                   │
                                FastAPI
                          /api/trends, /api/recipes
```

Every layer writes to a date-partitioned subdirectory (`YYYY-MM-DD/`).
Runs accumulate without overwriting history — the next layer always reads from the most recent date directory.

---

## Project Structure

```
.
├── airflow/
│   └── dags/
│       ├── nyc_gastronomy_pipeline.py   ← main unified DAG (6 tasks, @daily)
│       ├── bronze_ingestion_dag.py      ← standalone Bronze DAG
│       ├── silver_processing_dag.py     ← standalone Silver DAG
│       ├── gold_processing_dag.py       ← standalone Gold DAG
│       └── scripts/
│           ├── bronze/
│           │   ├── api_ingestion.py     ← Spoonacular REST client
│           │   └── WebScrapping_NY.py   ← Eater NY RSS scraper
│           ├── silver/
│           │   ├── preprocess_datasets.py  ← NLP cleaning + Parquet writer
│           │   └── trend_analysis.py       ← keyword extraction (VADER + NLP)
│           └── gold/
│               ├── spark_transform.py      ← recipe + article consolidation
│               ├── spark_governance.py     ← data quality KPI computation
│               └── spark_storytelling.py   ← trend aggregations
├── api/
│   ├── main.py                  ← FastAPI app entrypoint
│   ├── loader.py                ← Gold Parquet loader
│   └── routers/
│       ├── governance.py        ← GET /api/governance
│       ├── storytelling.py      ← GET /api/storytelling
│       └── recommendations.py   ← GET /api/recipes/trending
├── dashboard/
│   ├── governance_app.py        ← Plotly Dash — data quality dashboard
│   ├── storytelling_app.py      ← Plotly Dash — trends dashboard
│   └── utils.py                 ← shared palette + Gold loader
├── notebooks/
│   └── workshop3_analysis.ipynb ← data quality + Gold layer EDA
├── datalake_bronze/             ← raw JSON (git-ignored)
├── datalake_silver/             ← cleaned Parquet (git-ignored)
├── datalake_gold/               ← aggregated Parquet (git-ignored)
├── Dockerfile                   ← Airflow image (Python 3.11 + PySpark)
├── Dockerfile.dashboard         ← Dash image (lightweight, no Java)
├── Dockerfile.api               ← FastAPI image
├── docker-compose.yaml
├── requirements.txt             ← Airflow + pipeline dependencies
├── requirements.dashboard.txt   ← Dash dependencies
└── requirements.api.txt         ← FastAPI dependencies
```

---

## Quick Start

### Prerequisites

- Docker Desktop running
- `.env` file at the project root:

```env
SPOONACULAR_API_KEY=your_key_here
```

### Start everything

```bash
git clone <repo-url>
cd Food-Gastronomy-Trends-Sentiment-main
cp .env.example .env        # then fill in your API key
docker-compose up --build
```

| Service | URL | Credentials |
|---------|-----|-------------|
| Airflow UI | http://localhost:8080 | admin / admin |
| Governance Dashboard | http://localhost:8050 | — |
| Storytelling Dashboard | http://localhost:8051 | — |
| FastAPI (Swagger) | http://localhost:8000/docs | — |
| PostgreSQL | localhost:5432 | airflow / airflow |

### Trigger the pipeline

After Airflow initializes (~60 s), trigger the daily pipeline:

```bash
# Via UI: DAGs → nyc_gastronomy_pipeline → Trigger DAG ▶

# Via CLI:
docker exec $(docker ps -qf "name=airflow-scheduler") \
  airflow dags trigger nyc_gastronomy_pipeline
```

---

## The Pipeline — `nyc_gastronomy_pipeline`

Single sequential DAG, `@daily`, `max_active_runs=1`.

```
t1 >> t2 >> t3 ──(XCom: keywords)──▶ t4 >> t5 >> t6
```

| Step | Task ID | Script | Output |
|------|---------|--------|--------|
| 1 | `extract_eater_ny` | `bronze/WebScrapping_NY.py` | `bronze/webscraping/YYYY-MM-DD/*.json` |
| 2 | `clean_eater_ny` | `silver/preprocess_datasets.py` | `silver/webscraping/YYYY-MM-DD/*_deduped.parquet` |
| 3 | `analyze_trends` | `silver/trend_analysis.py` | keyword list → XCom |
| 4 | `search_spoonacular` | `bronze/api_ingestion.py` | `bronze/api/YYYY-MM-DD/*.json` |
| 5 | `clean_recipes` | `silver/preprocess_datasets.py` | `silver/api/YYYY-MM-DD/*.parquet` |
| 6 | `prepare_gold` | `gold/spark_transform.py` + `spark_governance.py` + `spark_storytelling.py` | `gold/YYYY-MM-DD/*.parquet` |

**XCom wire:** Step 3 extracts the top trending food keywords from the Silver web articles and passes them to Step 4 via Airflow XCom. Step 4 queries Spoonacular specifically for those keywords — the pipeline is trend-driven, not keyword-static.

---

## Data Layers

| Layer | Host path | Container path | Format | Content |
|-------|-----------|----------------|--------|---------|
| Bronze | `./datalake_bronze/` | `/opt/airflow/datalake/bronze/` | JSON | Raw API responses + raw RSS articles |
| Silver | `./datalake_silver/` | `/opt/airflow/datalake/silver/` | Parquet | Cleaned, deduplicated, NLP-preprocessed |
| Gold | `./datalake_gold/` | `/opt/airflow/datalake/gold/` | Parquet (Spark) | Aggregated, analytics-ready |

### Gold outputs per daily run

```
datalake_gold/YYYY-MM-DD/
├── gold_recipes_HHMMSS.parquet/     ← recipe details
├── gold_articles_HHMMSS.parquet/    ← cleaned articles with sentiment
├── governance_HHMMSS.parquet/       ← data quality KPIs
└── storytelling_HHMMSS.parquet/     ← trend + sentiment aggregations
```

Each `*.parquet/` is a Spark `coalesce(1)` output directory containing a single `part-00000-*.snappy.parquet` file. The dashboard `load_latest_gold()` handles this format transparently.

### Governance KPI schema

| Column | Type | Description |
|--------|------|-------------|
| `kpi_name` | string | `null_rate`, `duplicate_rate`, `record_count`, `outlier_rate`, … |
| `category` | string | `completeness`, `volume`, `uniqueness`, `validity`, `accuracy`, `timeliness` |
| `source` | string | `api` or `webscraping` |
| `field` | string | Column name the KPI applies to |
| `value` | float | Numeric KPI value |
| `unit` | string | `%`, `count`, `chars`, … |
| `finding` | string | Human-readable description |
| `computed_at` | timestamp | Run timestamp |

### Storytelling aggregation schema

| Column | Type | Description |
|--------|------|-------------|
| `aggregation` | string | `sentiment_distribution`, `sentiment_trend`, `top_keywords`, `keyword_sentiment`, `source_comparison`, `volume_trends`, … |
| `category` | string | `sentiment`, `temporal`, `keywords`, `sources`, … |
| `dimension_name` | string | Grouping dimension label |
| `dimension_value` | string | Grouping dimension value |
| `metric` | string | `count`, `avg_compound`, `percentage`, … |
| `value` | float | Metric value |
| `label` | string | Display label for dashboards |
| `computed_at` | timestamp | Run timestamp |

---

## Silver Processing Details

`preprocess_datasets.py` handles both sources:

**API (recipes):**
- Flattens list columns (`extendedIngredients`, `cuisines`, `diets`) to comma-separated strings
- Strips HTML from `summary` via BeautifulSoup
- Coerces `preparationMinutes` / `cookingMinutes` to `int32`
- Deduplicates by `id`

**Web scraping (articles):**
- Adds `article_summary_clean` — lowercased, punctuation removed, English stopwords stripped (NLTK)
- Adds `article_title_clean`
- Deduplicates by `article_url`

---

## API Endpoints

FastAPI server at `http://localhost:8000`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/governance` | Latest governance KPIs from Gold |
| `GET` | `/api/storytelling` | Latest storytelling aggregations from Gold |
| `GET` | `/api/recipes/trending` | Recipes ranked by alignment with current food trends |
| `GET` | `/docs` | Swagger UI |

---

## Dashboards

### Governance — `http://localhost:8050`

For the **data engineering team**. Reads `governance_*.parquet`.

| Component | What it shows |
|-----------|---------------|
| KPI Cards | Total records, max null rate, duplicate rate, schema compliance |
| Null Rate Chart | Horizontal bars per field — red >20%, amber >5%, blue ≤5% |
| Volume Over Time | Records per day grouped by source |
| Outlier Rate Chart | IQR-based outlier rate per numeric field |
| KPI Table | All governance rows, paginated, sortable |

### Storytelling — `http://localhost:8051`

For **chefs and restaurant professionals**. Reads `storytelling_*.parquet`.

| Component | What it shows |
|-----------|---------------|
| Narrative Card | "This week, [keyword] is the most discussed…" |
| Sentiment Donut | Positive / negative / neutral share; center = avg VADER |
| Sentiment Trend | Avg compound score per week |
| Top Keywords | Frequency + sentiment color (green = positive, red = negative) |
| Media vs Kitchen | Article count vs recipe count |
| Activity Chart | Article volume by date |

Both dashboards auto-refresh every **5 minutes**.

---

## Notebooks

```
notebooks/workshop3_analysis.ipynb
```

Covers Workshop 3 requirements:

| Section | Content |
|---------|---------|
| 1 | Load all Silver Parquet files (API + web) |
| 2 | Null rate analysis — bar charts per field, per source |
| 3 | Duplicate detection — hashable-column filtered `duplicated()` |
| 4 | Text length statistics + boxplots |
| 5 | Gold governance KPI table (matplotlib, color-coded by severity) |
| 6 | Gold storytelling exploration — donut, trend line, keywords |
| 7 | Data quality findings report (structured Markdown table) |
| 8 | Outlier rate per numeric field (IQR method) |

Run from the repo root:

```bash
cd notebooks
jupyter notebook workshop3_analysis.ipynb
```

---

## Docker Commands

### Start / rebuild

```bash
# Everything
docker-compose up --build -d

# Only Airflow (pipeline)
docker-compose up --build -d airflow-scheduler airflow-webserver

# Only dashboards
docker-compose up --build -d governance-dashboard storytelling-dashboard

# Only the API
docker-compose up --build -d gastronomy-api
```

### After code changes

```bash
# DAGs / scripts — volume-mounted, no rebuild needed; restart scheduler:
docker-compose restart airflow-scheduler

# Dockerfile or requirements changed — rebuild the image:
docker-compose up --build -d airflow-scheduler airflow-webserver
```

### After changing the Spoonacular API key

```bash
# Edit .env, then force-recreate so the new env var is picked up:
docker-compose up -d --force-recreate airflow-scheduler airflow-webserver
```

### Logs

```bash
docker-compose logs -f                        # everything
docker-compose logs -f airflow-scheduler      # pipeline only
docker-compose logs -f gastronomy-api
docker-compose logs -f governance-dashboard
```

### Stop

```bash
docker-compose down           # stop, keep Postgres data
docker-compose down -v        # stop + wipe Postgres (Airflow re-initializes)
```

---

## Dependencies

| Component | Version |
|-----------|---------|
| Python | 3.11 |
| Apache Airflow | 2.10.2 |
| PySpark | 3.5.1 |
| pandas | 2.2.1 |
| pyarrow | 15.0.0 |
| NLTK | 3.8.1 |
| scikit-learn | 1.4.2 |
| spaCy | 3.7.4 |
| Dash | 2.17.1 |
| Plotly | 5.22.0 |
| FastAPI | latest |

Airflow and dashboard services use **separate Docker images** to keep the dashboard image small (no Java, no Spark).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPOONACULAR_API_KEY` | Yes | Primary Spoonacular API key |
| `SPOONACULAR_API_KEY_2` … `_6` | No | Rotation keys — used automatically when the primary key hits quota |
