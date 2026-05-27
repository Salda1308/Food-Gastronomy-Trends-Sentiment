"""
NYC Gastronomy Trends — Unified Sequential Pipeline
====================================================

Linear 6-step flow.  Every task starts only after the preceding task succeeds.

Phase 1 — Trend Analysis
  1. extract_eater_ny   : Download Eater NY articles → Bronze webscraping layer
  2. clean_eater_ny     : NLP-clean articles → Silver webscraping layer
  3. analyze_trends     : Extract top food keywords from Silver → passed to Step 4

Phase 2 — Search Based on Analysis
  4. search_spoonacular : Query Spoonacular API with trend keywords → Bronze API layer
  5. clean_recipes      : Clean recipe data → Silver API layer
  6. prepare_gold       : Consolidate everything → Gold layer (transform + governance
                          + storytelling)

Data flow between Step 3 and Step 4:
  `analyze_trends` returns a list[str] of keywords via Airflow XCom.
  `search_spoonacular` receives that list as its first argument; the TaskFlow
  API wires the XCom dependency automatically — no explicit >> needed between
  these two tasks.

Dependency chain (explicit):
  t1 >> t2 >> t3 → (XCom) → t4 >> t5 >> t6
"""

from airflow.decorators import dag, task
from datetime import datetime, timedelta

default_args = {
    "owner": "data_engineering_team",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}


@dag(
    dag_id="nyc_gastronomy_pipeline",
    default_args=default_args,
    schedule_interval="@daily",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    # Only one active run at a time — the Gold tasks each start their own JVM
    # and competing runs would exhaust the container's heap.
    max_active_runs=1,
    tags=["pipeline", "sequential", "gold", "silver", "bronze"],
)
def nyc_gastronomy_pipeline():

    # ── Phase 1 · Step 1 ─────────────────────────────────────────────────────
    @task()
    def extract_eater_ny() -> str:
        """
        Fetch Eater NY Atom feed, save up to 20 articles as raw JSON in
        datalake/bronze/webscraping/.
        """
        from scripts.bronze.WebScrapping_NY import main
        main()
        return "Eater NY feed extracted to Bronze"

    # ── Phase 1 · Step 2 ─────────────────────────────────────────────────────
    @task()
    def clean_eater_ny() -> str:
        """
        Load Bronze webscraping JSONs, deduplicate by article_id, apply the
        full NLP cleaning pipeline (HTML stripping, photo-attribution removal,
        stopword filtering), and write a single merged Parquet to
        datalake/silver/webscraping/.
        """
        from scripts.silver.preprocess_datasets import preprocess_web_only
        preprocess_web_only()
        return "Eater NY articles cleaned and saved to Silver"

    # ── Phase 1 · Step 3 ─────────────────────────────────────────────────────
    @task()
    def analyze_trends() -> list[str]:
        """
        Read Silver webscraping Parquet, count token frequencies across all
        article_summary_clean and article_title_clean fields, and return the
        top-10 food-signal keywords.

        The returned list is automatically stored in XCom and injected into
        search_spoonacular() as its `keywords` argument.
        """
        from scripts.silver.trend_analysis import extract_trending_keywords
        keywords = extract_trending_keywords(top_n=10)
        print(f"[analyze_trends] Keywords forwarded to API search: {keywords}")
        return keywords

    # ── Phase 2 · Step 4 ─────────────────────────────────────────────────────
    @task()
    def search_spoonacular(keywords: list[str]) -> str:
        """
        Receive trend keywords from XCom (Step 3) and query the Spoonacular
        complexSearch endpoint for each keyword using `query=keyword` (free-text
        match, not ingredient-exact).  Non-empty results are saved as raw JSON
        in datalake/bronze/api/.

        `keywords` is injected automatically by the TaskFlow API from the return
        value of analyze_trends() — no XCom.pull() call required.
        """
        from scripts.bronze.api_ingestion import search_by_keywords
        search_by_keywords(keywords, number=5)
        return f"Spoonacular search complete for keywords: {keywords}"

    # ── Phase 2 · Step 5 ─────────────────────────────────────────────────────
    @task()
    def clean_recipes() -> str:
        """
        Load all Bronze API JSONs produced in Step 4, flatten list columns,
        strip HTML from summaries, coerce nullable integer columns, and write
        one Parquet per ingredient/keyword to datalake/silver/api/.
        """
        from scripts.silver.preprocess_datasets import preprocess_api_only
        preprocess_api_only()
        return "Recipe data cleaned and saved to Silver"

    # ── Phase 2 · Step 6 ─────────────────────────────────────────────────────
    @task()
    def prepare_gold() -> str:
        """
        Consolidate Silver data into the Gold layer in three sequential
        sub-steps, each with its own SparkSession (never concurrent):

          a) spark_transform   — deduplicate and join articles + recipes into
                                 gold_recipes and gold_articles Parquet datasets.
          b) spark_governance  — compute 8 data-quality KPIs over Silver data
                                 and persist as governance_YYYYMMDD.parquet.
          c) spark_storytelling — run VADER sentiment scoring, keyword/bigram
                                  frequency, recipe–trend alignment, and all
                                  dashboard aggregations; persist as
                                  storytelling_YYYYMMDD.parquet.
        """
        from scripts.gold.spark_transform import main as run_transform
        from scripts.gold.spark_governance import main as run_governance
        from scripts.gold.spark_storytelling import main as run_storytelling

        print("[prepare_gold] Step 6a — Gold transform")
        run_transform()

        print("[prepare_gold] Step 6b — Governance KPIs")
        run_governance()

        print("[prepare_gold] Step 6c — Storytelling aggregations")
        run_storytelling()

        return "Gold layer prepared: transform + governance + storytelling complete"

    # ── Step 7 · Upload Gold to S3 ────────────────────────────────────────────
    @task()
    def upload_gold_to_s3() -> str:
        """
        Push the latest Gold partition to S3 so the Lambda FastAPI can serve it.
        Skipped gracefully if AWS_S3_BUCKET is not set (local-only runs).
        """
        import os
        if not os.environ.get("AWS_S3_BUCKET"):
            print("[upload_gold_to_s3] AWS_S3_BUCKET not set — skipping S3 upload.")
            return "S3 upload skipped (no bucket configured)"
        from scripts.s3_upload import upload_gold_to_s3 as _upload
        result = _upload()
        return f"Uploaded {len(result['files'])} files to s3://{result['bucket']}/gold/{result['partition']}/"

    # ── Step 8 · Storage cleanup ──────────────────────────────────────────────
    @task()
    def cleanup_old_partitions() -> str:
        """
        Delete Bronze/Silver/Gold date partitions older than 30 days.
        Runs after every successful Gold step to keep storage bounded.
        Safe to skip manually if you need to inspect old data — the pipeline
        will clean up on the next successful run.
        """
        from scripts.cleanup import cleanup
        result = cleanup(retention_days=30)
        return (
            f"Cleanup complete — deleted {len(result['deleted'])} partition(s), "
            f"kept {len(result['kept'])}"
        )

    # ── Dependency chain ──────────────────────────────────────────────────────
    #
    #   t1 >> t2 >> t3 ──(XCom keywords)──► t4 >> t5 >> t6 >> t7
    #
    # The XCom link (t3 → t4) is declared by passing t3 as the argument to
    # search_spoonacular(); Airflow infers the task dependency automatically.
    # The explicit >> operators cover the remaining links.

    t1 = extract_eater_ny()
    t2 = clean_eater_ny()
    t3 = analyze_trends()
    t4 = search_spoonacular(t3)   # XCom: t3's return value → keywords arg
    t5 = clean_recipes()
    t6 = prepare_gold()
    t7 = upload_gold_to_s3()
    t8 = cleanup_old_partitions()

    t1 >> t2 >> t3 >> t4 >> t5 >> t6 >> t7 >> t8


dag_instance = nyc_gastronomy_pipeline()
