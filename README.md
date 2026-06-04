# Empire's Taste — NYC Gastronomic Intelligence Pipeline

Real-time sentiment analysis of New York City's food scene. Combines press articles, real diner reviews, and recipe data through a **Bronze → Silver → Gold medallion architecture** orchestrated by Apache Airflow — exposed through a Next.js dashboard, a mobile app, and a FastAPI serving layer.

---

## What it does

```
Eater NY (RSS) ──────────────────────────────────────┐
                                                      ▼
OpenTable (Playwright + GraphQL) ──────────► Bronze  (raw JSON, YYYY-MM-DD/)
                                                      │
                                              NLP · pandas
                                                      ▼
                                             Silver  (Parquet, deduplicated)
                                                      │
                                      TF-IDF + spaCy → trending keywords
                                                      │
Spoonacular API ◄─────────────── XCom keywords        │
        │                                             │
        └──────────────────────────────────────► Silver/api
                                                      │
                                            PySpark 3.5
                                                      ▼
                                              Gold    (analytics-ready Parquet)
                                          ╱       │        ╲
                                   FastAPI   Plotly Dash  Next.js / Expo
```

The pipeline is **trend-driven**: NLP extracts what NYC is talking about today, then Spoonacular is queried specifically for those keywords — not a static ingredient list.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Orchestration | Apache Airflow 2.10.2 |
| Data processing (Silver) | pandas 2.2, NLTK, spaCy, scikit-learn |
| Data processing (Gold) | PySpark 3.5.1 + VADER sentiment UDF |
| Web scraping | Playwright (Firefox headless) + BeautifulSoup4 |
| API | FastAPI + Mangum (Lambda-ready) |
| Web frontend | Next.js 15, NextAuth.js (Google OAuth) |
| Mobile | Expo SDK 54 / React Native 0.81, TypeScript |
| Dashboards | Plotly Dash 2.17 |
| Storage | Parquet (pyarrow) + JSON |
| Infrastructure | Docker Compose |
| Runtime | Python 3.11 |

---

## Project Structure

```
Workshop4/
├── airflow/
│   └── dags/
│       ├── nyc_gastronomy_pipeline.py       ← unified 8-task DAG (manual trigger)
│       └── scripts/
│           ├── bronze/
│           │   ├── WebScrapping_NY.py       ← Eater NY RSS scraper
│           │   ├── opentable_ingestion.py   ← Playwright + GraphQL scraper
│           │   ├── api_ingestion.py         ← Spoonacular REST client
│           │   └── spoonacular_client.py    ← API wrapper + key rotation
│           ├── silver/
│           │   ├── preprocess_datasets.py   ← NLP cleaning + Parquet writer
│           │   └── trend_analysis.py        ← TF-IDF + spaCy keyword extraction
│           └── gold/
│               ├── spark_transform.py       ← recipe + article consolidation
│               ├── spark_governance.py      ← 8 quality KPIs
│               └── spark_storytelling.py    ← 10 trend aggregations + VADER
├── api/
│   ├── main.py                              ← FastAPI entrypoint
│   ├── loader.py                            ← Gold Parquet reader (local or S3)
│   └── routers/
│       ├── storytelling.py                  ← /api/storytelling/*
│       ├── governance.py                    ← /api/governance/*
│       └── recommendations.py              ← /api/recommendations/
├── dashboard/
│   ├── governance_app.py                    ← Plotly Dash — data quality
│   └── storytelling_app.py                  ← Plotly Dash — trends
├── web/                                     ← Next.js 15 web dashboard
│   ├── app/
│   │   ├── page.tsx                         ← landing page
│   │   ├── dashboard/trends/                ← sentiment + keywords
│   │   ├── dashboard/recipes/               ← recipe grid + filters
│   │   ├── dashboard/favorites/             ← saved recipes
│   │   └── dashboard/data/                  ← pipeline KPIs
│   └── components/
├── mobile/                                  ← Expo React Native app
│   ├── app/
│   │   ├── index.tsx                        ← landing
│   │   ├── login.tsx                        ← Google OAuth
│   │   └── (dashboard)/
│   │       ├── trends.tsx
│   │       ├── recipes/
│   │       ├── favorites.tsx
│   │       └── data.tsx
│   └── components/
├── datalake_bronze/                         ← raw JSON (git-ignored)
├── datalake_silver/                         ← cleaned Parquet (git-ignored)
├── datalake_gold/                           ← aggregated Parquet (git-ignored)
├── Documents/                               ← architecture docs + diagrams
│   ├── architecture.md                      ← full technical spec
│   ├── architecture_diagrams.md             ← 9 Mermaid diagrams
│   ├── Presentation.html                    ← 13-slide deck (⬇ PDF button)
│   └── CHANGELOG_WORKSHOP4.md
├── Dockerfile                               ← Airflow + PySpark + Playwright
├── Dockerfile.api                           ← FastAPI (lightweight)
├── Dockerfile.dashboard                     ← Plotly Dash (no Java)
├── Dockerfile.web                           ← Next.js
└── docker-compose.yaml
```

---

## Quick Start

### Prerequisites

- Docker Desktop running
- `.env` at the project root (see [Environment Variables](#environment-variables))

```bash
cp .env.example .env
# Edit .env and add your SPOONACULAR_API_KEY
```

### Start everything

```bash
docker-compose up --build
```

| Service | URL | Credentials |
|---------|-----|-------------|
| Airflow UI | http://localhost:8080 | admin / admin |
| Web Dashboard | http://localhost:3000 | Google OAuth |
| FastAPI (Swagger) | http://localhost:8000/docs | — |
| Governance Dashboard | http://localhost:8050 | — |
| Storytelling Dashboard | http://localhost:8051 | — |
| PostgreSQL | localhost:5432 | airflow / airflow |

### Trigger the pipeline

```bash
# Via Airflow UI: DAGs → nyc_gastronomy_pipeline → ▶ Trigger DAG

# Via CLI:
docker exec $(docker ps -qf "name=airflow-scheduler") \
  airflow dags trigger nyc_gastronomy_pipeline
```

Full run takes **~10 minutes**. Gold data is immediately available to the API and dashboards.

---

## The Pipeline

DAG: `nyc_gastronomy_pipeline` — manual trigger, sequential, `max_active_runs=1`.

```
t1 ── t2 ── t3 ── t4 ──(XCom: keywords)──► t5 ── t6 ── t7 ── t8
```

| # | Task | What it does | Input → Output |
|---|------|-------------|----------------|
| 1 | `extract_eater_ny` | Fetches up to 20 articles from Eater NY Atom feed | RSS → `bronze/webscraping/` |
| 2 | `clean_eater_ny` | 7-step NLP pipeline → `article_summary_clean` | bronze → `silver/webscraping/` |
| 3 | `extract_opentable` | Playwright session → paginates reviews via internal GraphQL | web → `bronze/opentable/` |
| 4 | `clean_opentable` | Flatten JSON, NLP, dedup by `review_id` | bronze → `silver/opentable/` |
| 5 | `analyze_trends` | TF-IDF + spaCy cosine on articles + reviews → top food keywords | silver → **XCom** |
| 6 | `search_spoonacular` | Queries Spoonacular per keyword (6-key rotation) | XCom → `bronze/api/` |
| 7 | `clean_recipes` | Strip HTML, flatten lists, cast types, dedup by recipe ID | bronze → `silver/api/` |
| 8 | `prepare_gold` | Spark: transform + governance KPIs + storytelling aggregations | silver → `gold/` |

**Why the XCom feedback loop matters:** Step 5 reads what NYC food media and real diners are discussing *today*, then Step 6 queries Spoonacular for exactly those terms. The pipeline adapts daily — it does not use a static ingredient list.

---

## Medallion Data Layers

Each layer partitions by date: `YYYY-MM-DD/`. Runs accumulate without overwriting history.

### Bronze — Raw data, never modified

| Subfolder | Format | Source |
|-----------|--------|--------|
| `webscraping/` | JSON array | Eater NY articles (10 fields per article) |
| `opentable/` | JSON array | Diner reviews (rating, free text, restaurant slug) |
| `api/` | JSON | Spoonacular `/recipes/complexSearch` responses |

### Silver — Cleaned, NLP-enriched

| Subfolder | Format | Key transformations |
|-----------|--------|-------------------|
| `webscraping/` | Parquet | Photo-credit removal, HTML decode, URL strip, lowercase, stopwords, short-token filter → `article_summary_clean` |
| `opentable/` | Parquet | Nested JSON flatten, NLP cleaning → `text_clean`, dedup by `review_id` |
| `api/` | Parquet | HTML strip from `summary` (bs4), lists → CSV strings, `Int32` nullable types |

### Gold — Analytics-ready, PySpark output

```
gold/YYYY-MM-DD/
├── gold_articles_HHMMSS.parquet/     9 cols + NLP text
├── gold_recipes_HHMMSS.parquet/      20 cols + dietary_tags array
├── governance_HHMMSS.parquet/        8 quality KPIs, long format
└── storytelling_HHMMSS.parquet/      10 aggregations, long format
```

> Each `*.parquet/` is a Spark `coalesce(1)` directory — one `part-00000-*.parquet` inside.

---

## Data Sources

### Eater NY (RSS/Atom scraping)
- Feed: `https://ny.eater.com/rss/index.xml`
- Up to 20 articles/day — title, summary, author, categories, canonical URL
- Bronze deduplication: skips write if all `article_id`s already exist for the day

### OpenTable (Playwright + GraphQL)
- Firefox headless acquires an authenticated session automatically
- GraphQL endpoint: `gql?opname=ReviewSearchResults` (persisted query hash)
- Up to 50 reviews per restaurant (5 pages × 10) — food, service, ambiance ratings + free text
- Added in Workshop 4 to balance sentiment (press-only gave 100% positive)

### Spoonacular API
- Endpoint: `/recipes/complexSearch?query={keyword}&addRecipeInformation=True&number=5`
- 6 API keys with automatic rotation when quota is hit
- Queried dynamically with the day's trending keywords, not a static list

---

## NLP Pipeline (Silver)

The `clean_nlp_text()` function applied to every article/review summary:

```
① Remove photo credit  → strips "Caption. | Photo: Name" prefixes
② Decode HTML entities → &#8217; → '
③ Remove URLs          → https://...
④ Lowercase            → "Best Ramen!" → "best ramen"
⑤ Remove punctuation   → [^\w\s] → space
⑥ Normalize whitespace → multiple spaces → one
⑦ Filter tokens        → NLTK stopwords + domain words ("eater","nyc","restaurant","york")
                          + single-char + purely numeric
```

**Keyword extraction** uses a hybrid of TF-IDF (rewards batch-distinctive terms) + spaCy cosine similarity against a 30-word food anchor vector + a curated `CUISINE_VOCAB` for terms vectors miss ("omakase", "birria"). Generic opinion words from OpenTable reviews ("amazing", "wonderful", "staff") are blocked before reaching Spoonacular.

---

## API Endpoints

FastAPI at `http://localhost:8000`. Reads Gold Parquet directly via `pandas.read_parquet()`. Always serves the most recent `YYYY-MM-DD` partition; falls back to yesterday if today's run is missing.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/storytelling/sentiment` | Combined sentiment distribution — articles + reviews |
| GET | `/api/storytelling/keywords` | Top food keywords with TF-IDF score and sentiment |
| GET | `/api/storytelling/trend` | Weekly mood evolution (avg VADER compound) |
| GET | `/api/storytelling/entities` | Restaurants, chefs, neighborhoods (NER) |
| GET | `/api/storytelling/sources` | Articles with links + review counts by restaurant |
| GET | `/api/storytelling/summary` | Top keyword, % positive, total recipes |
| GET | `/api/recommendations/` | Recipes filtered by cuisine / diet / prep time |
| GET | `/api/governance/kpis` | All 8 quality KPIs |
| GET | `/api/governance/null-rates` | Null completeness by field |
| GET | `/api/governance/outliers` | IQR outlier rate by numeric field |
| GET | `/docs` | Swagger UI |

---

## Web Dashboard (Next.js 15)

`http://localhost:3000` — Google OAuth required.

| Screen | Route | Content |
|--------|-------|---------|
| Landing | `/` | NYC video hero, live sentiment stats, entry CTAs |
| Trends | `/dashboard/trends` | Keyword of the day, sentiment donut (press + reviews), weekly trend line, NER entity table, THE BOARD keyword labels |
| Recipes | `/dashboard/recipes` | Trending recipes filtered by cuisine/diet/time, favoriting |
| Favorites | `/dashboard/favorites` | Personal recipe collection (Prisma + SQLite, per user) |
| Data | `/dashboard/data` | Pipeline KPIs in plain language, data completeness grid |

---

## Mobile App (Expo)

```bash
cd mobile && npm install
# Create mobile/.env with EXPO_PUBLIC_API_URL=http://<your-mac-ip>:8000
npx expo start
```

Same screens as the web dashboard, optimized for iOS/Android. Uses `expo-secure-store` for favorites. Google OAuth via `expo-auth-session`. A **DEV — SKIP LOGIN** button appears automatically when the API URL points to a local IP.

---

## Dashboards (Plotly Dash)

### Governance — `http://localhost:8050`
Data engineering team view. Reads `governance_*.parquet`.
- KPI cards: records, null rate, duplicate rate, schema compliance
- Null rate bars per field (red > 20%, amber > 5%, blue ≤ 5%)
- Volume over time by source
- IQR outlier rate per numeric field
- Full KPI table (paginated)

### Storytelling — `http://localhost:8051`
Chef / restaurant professional view. Reads `storytelling_*.parquet`.
- Narrative card: "This week, [keyword] is the most discussed…"
- Sentiment donut + weekly trend line
- Top keywords with VADER color coding
- Media vs. Kitchen comparison (article count vs. recipe count)

Both dashboards auto-refresh every **5 minutes**.

---

## Data Governance (8 Quality KPIs)

Computed by `spark_governance.py` over Silver data. Stored in `gold/governance_*.parquet` as long format (one row per KPI).

| KPI | Dimension | What it measures |
|-----|-----------|-----------------|
| `null_rate` | Completeness | % null or empty values per column |
| `record_count` | Volume | Total records in Silver for the day |
| `source_file_count` | Volume | Number of Parquet files in the daily directory |
| `duplicate_rate` | Uniqueness | % duplicates by primary key (`id` or `article_id`) |
| `schema_compliance_rate` | Validity | % of expected columns present |
| `outlier_rate` | Validity | % of records outside IQR range per numeric column |
| `nlp_compression_ratio` | Accuracy | `len(clean) / len(raw)` — NLP cleaning effectiveness |
| `ingestion_distinct_dates` | Timeliness | Number of daily partitions present in Bronze |

---

## AWS Deployment

`api/loader.py` auto-detects whether to read from local filesystem (Docker) or S3 (Lambda).

| Docker (local) | AWS (production) |
|----------------|-----------------|
| `airflow-scheduler` + `airflow-webserver` | **MWAA** (Managed Workflows for Apache Airflow) |
| `datalake_bronze/silver/gold/` volumes | **S3** bucket — `/bronze/` `/silver/` `/gold/` prefixes |
| `gastronomy-api` FastAPI container | **Lambda** + Mangum + **API Gateway** |
| `web` Next.js container | **AWS Amplify** (CI/CD + CDN) |
| `postgres` Airflow metadata | **RDS PostgreSQL** (managed by MWAA) |
| Plotly Dash dashboards | **QuickSight** or EC2 |
| Logs | **CloudWatch** |

---

## Environment Variables

The project uses **three separate `.env` files**. Each has a corresponding `.env.example` — copy and fill it in before running anything.

---

### 1. Root `.env` — Docker Compose (Airflow + Web)

```bash
cp .env.example .env
```

| Variable | Required | How to get it |
|----------|----------|--------------|
| `SPOONACULAR_API_KEY` | ✅ Yes | [spoonacular.com/food-api](https://spoonacular.com/food-api) — free tier: 150 req/day |
| `SPOONACULAR_API_KEY_2` … `_6` | No | Same site — add extras for automatic key rotation |
| `AUTH_SECRET` | ✅ Yes | Run: `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | ✅ Yes | [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client (Web) |
| `AUTH_GOOGLE_SECRET` | ✅ Yes | Same page as `AUTH_GOOGLE_ID` |
| `AUTH_GITHUB_ID` | No | [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App |
| `AUTH_GITHUB_SECRET` | No | Same page as `AUTH_GITHUB_ID` |

**Google OAuth setup:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials → **Create Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy **Client ID** → `AUTH_GOOGLE_ID` and **Client Secret** → `AUTH_GOOGLE_SECRET`

---

### 2. `web/.env.local` — Next.js local development only

> Only needed if you run `npm run dev` inside `web/`. Docker reads from root `.env`.

```bash
cp web/.env.example web/.env.local
```

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` (default, keep as-is) |
| `AUTH_SECRET` | Same value as root `.env` |
| `AUTH_GOOGLE_ID` | Same value as root `.env` |
| `AUTH_GOOGLE_SECRET` | Same value as root `.env` |
| `DATABASE_URL` | `file:./prisma/dev.db` (default, keep as-is) |

---

### 3. `mobile/.env` — Expo app

```bash
cp mobile/.env.example mobile/.env
```

| Variable | How to fill it |
|----------|---------------|
| `EXPO_PUBLIC_API_URL` | Your Mac's local IP + port 8000. Find it with: `ipconfig getifaddr en0` (Mac) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google Cloud → OAuth Client ID for **Web** |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google Cloud → OAuth Client ID for **iOS** |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google Cloud → OAuth Client ID for **Android** |

> The mobile device and your Mac must be on the **same WiFi network**. `localhost` does not work on a physical device.
>
> In development, a **DEV — SKIP LOGIN** button appears automatically when the API URL points to a local IP — use it to bypass OAuth setup.

---

## Docker Commands

```bash
# Start everything (build if needed)
docker-compose up --build

# Start in background
docker-compose up --build -d

# Restart scheduler after DAG/script changes (hot-reload via volume)
docker-compose restart airflow-scheduler

# Rebuild after Dockerfile or requirements changes
docker-compose up --build -d airflow-scheduler airflow-webserver

# Force-recreate after .env changes
docker-compose up -d --force-recreate airflow-scheduler airflow-webserver

# Logs
docker-compose logs -f                         # all services
docker-compose logs -f airflow-scheduler       # pipeline only

# Reset (keeps Postgres data)
docker-compose down

# Full reset (wipes Postgres — Airflow re-initializes)
docker-compose down -v

# Manual pipeline trigger via CLI
docker exec $(docker ps -qf "name=airflow-scheduler") \
  airflow dags trigger nyc_gastronomy_pipeline

# Reset a single day's data
rm -rf datalake_bronze/*/2026-05-26
rm -rf datalake_silver/*/2026-05-26
rm -rf datalake_gold/2026-05-26
```

---

## User Stories

| Priority | Role | Need |
|----------|------|------|
| HIGH | Catering manager | Top-rated dishes by event type |
| HIGH | Event planner | Filter suggestions by dietary restriction (vegan, gluten-free, halal) |
| HIGH | Restaurant manager | Sentiment trends by dish category over time |
| MED | Data analyst | Data quality metrics: missing fields, ingestion rate, record counts |
| MED | Event planner | Dishes by NYC neighborhood → location-specific menus |
| LOW | Manager | Automated alerts on sudden sentiment drops |
| LOW | Data analyst | Compare recipe metadata vs. review sentiment |

---

## Documents

| File | Description |
|------|-------------|
| `Documents/architecture.md` | Full technical spec — schemas, NLP pipeline, Spark config decisions |
| `Documents/architecture_diagrams.md` | 9 Mermaid diagrams (Docker, DAG, Medallion, NLP, Gold Spark, AWS deployment) |
| `Documents/Presentation.html` | 13-slide deck — open in browser, use ← → to navigate, ⬇ Download PDF button included |
| `Documents/CHANGELOG_WORKSHOP4.md` | All changes introduced in Workshop 4 (OpenTable, pipeline redesign, sentiment fix) |
| `Documents/INSTRUCTIONS.md` | Original project brief |
