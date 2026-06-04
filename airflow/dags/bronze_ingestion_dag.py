"""
Bronze Ingestion DAG — Web scraping + OpenTable reviews
=========================================================
Tasks:
  1. extract_eater_ny   → Eater NY RSS/Atom feed → bronze/webscraping/
  2. extract_opentable  → OpenTable reviews (Playwright + GraphQL) → bronze/opentable/

Paused by default. Trigger manually para snapshot sin correr el pipeline completo.
"""

from airflow.decorators import dag, task
from datetime import datetime, timedelta

default_args = {
    "owner": "data_engineering_team",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}


@dag(
    dag_id="bronze_ingestion_pipeline",
    default_args=default_args,
    schedule_interval=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    is_paused_upon_creation=True,
    tags=["bronze"],
)
def bronze_ingestion_pipeline():

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

    # Corren en paralelo — son fuentes independientes
    extract_eater_ny()
    extract_opentable()


dag_instance = bronze_ingestion_pipeline()
