"""
NYC Gastronomy Trends — Unified Pipeline
=========================================

Phase 1 — Ingestion (paralelo)
  1a. extract_eater_ny   : Eater NY RSS → bronze/webscraping/
  1b. extract_opentable  : OpenTable reviews (Playwright+GraphQL) → bronze/opentable/

Phase 2 — Silver cleaning (paralelo)
  2a. clean_eater_ny     : NLP-clean artículos → silver/webscraping/
  2b. clean_opentable    : Aplana + NLP-clean reseñas → silver/opentable/

Phase 3 — Análisis y enriquecimiento
  3.  analyze_trends     : TF-IDF sobre webscraping + opentable → top-10 keywords (XCom)
  4.  search_spoonacular : Spoonacular API con esos keywords → bronze/api/
  5.  clean_recipes      : Flatten + clean recipes → silver/api/
  6.  prepare_gold       : Transform + Governance + Storytelling → gold/

Phase 4 — Post-process
  7.  upload_gold_to_s3
  8.  cleanup_old_partitions

Dependency chain:
  [t1a, t1b] >> [t2a, t2b] >> t3 → (XCom) → t4 >> t5 >> t6 >> t7 >> t8
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
    schedule_interval=None,   # solo manual — evita re-ejecuciones automáticas
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["pipeline", "sequential", "gold", "silver", "bronze"],
)
def nyc_gastronomy_pipeline():

    # ── Phase 1 · Ingestion (paralelo) ───────────────────────────────────────
    @task()
    def extract_eater_ny() -> str:
        from scripts.bronze.WebScrapping_NY import main
        main()
        return "Eater NY feed extracted to Bronze"

    @task()
    def extract_opentable() -> str:
        from scripts.bronze.opentable_ingestion import main
        main()
        return "OpenTable reviews extracted to Bronze"

    # ── Phase 2 · Silver cleaning (paralelo) ─────────────────────────────────
    @task()
    def clean_eater_ny() -> str:
        from scripts.silver.preprocess_datasets import preprocess_web_only
        preprocess_web_only()
        return "Eater NY articles cleaned → Silver"

    @task()
    def clean_opentable() -> str:
        from scripts.silver.preprocess_datasets import preprocess_opentable_only
        preprocess_opentable_only()
        return "OpenTable reviews cleaned → Silver"

    # ── Phase 3 · Análisis ────────────────────────────────────────────────────
    @task()
    def analyze_trends() -> list[str]:
        from scripts.silver.trend_analysis import extract_trending_keywords
        keywords = extract_trending_keywords(top_n=10)
        print(f"[analyze_trends] Keywords: {keywords}")
        return keywords

    @task()
    def search_spoonacular(keywords: list[str]) -> str:
        from scripts.bronze.api_ingestion import search_by_keywords
        search_by_keywords(keywords, number=5)
        return f"Spoonacular search complete for: {keywords}"

    @task()
    def clean_recipes() -> str:
        from scripts.silver.preprocess_datasets import preprocess_api_only
        preprocess_api_only()
        return "Recipe data cleaned → Silver"

    @task()
    def prepare_gold() -> str:
        from scripts.gold.spark_transform import main as run_transform
        from scripts.gold.spark_governance import main as run_governance
        from scripts.gold.spark_storytelling import main as run_storytelling

        print("[prepare_gold] Step a — Gold transform")
        run_transform()
        print("[prepare_gold] Step b — Governance KPIs")
        run_governance()
        print("[prepare_gold] Step c — Storytelling aggregations")
        run_storytelling()

        return "Gold layer prepared: transform + governance + storytelling complete"

    # ── Phase 4 · Post-process ────────────────────────────────────────────────
    @task()
    def upload_gold_to_s3() -> str:
        import os
        if not os.environ.get("AWS_S3_BUCKET"):
            print("[upload_gold_to_s3] AWS_S3_BUCKET not set — skipping.")
            return "S3 upload skipped (no bucket configured)"
        from scripts.s3_upload import upload_gold_to_s3 as _upload
        result = _upload()
        return f"Uploaded {len(result['files'])} files to s3://{result['bucket']}/gold/{result['partition']}/"

    @task()
    def cleanup_old_partitions() -> str:
        from scripts.cleanup import cleanup
        result = cleanup(retention_days=30)
        return (
            f"Cleanup complete — deleted {len(result['deleted'])} partition(s), "
            f"kept {len(result['kept'])}"
        )

    # ── Dependency chain ──────────────────────────────────────────────────────
    #
    #  [t1a, t1b] >> [t2a, t2b] >> t3 ──(XCom)──► t4 >> t5 >> t6 >> t7 >> t8
    #
    t1a = extract_eater_ny()
    t1b = extract_opentable()
    t2a = clean_eater_ny()
    t2b = clean_opentable()
    t3  = analyze_trends()
    t4  = search_spoonacular(t3)
    t5  = clean_recipes()
    t6  = prepare_gold()
    t7  = upload_gold_to_s3()
    t8  = cleanup_old_partitions()

    # Serie completa — cada fuente termina antes de pasar a la siguiente
    t1a >> t2a >> t1b >> t2b >> t3 >> t4 >> t5 >> t6 >> t7 >> t8


dag_instance = nyc_gastronomy_pipeline()
