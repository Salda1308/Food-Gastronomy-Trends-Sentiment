"""
Silver Processing DAG
======================
Picks up where bronze_ingestion_pipeline left off.

  1. wait_for_bronze  — sensor: espera JSON en bronze/webscraping/ o bronze/opentable/
  2a. clean_eater_ny  — NLP-clean artículos Eater NY → silver/webscraping/
  2b. clean_opentable — aplana + NLP-clean reseñas OpenTable → silver/opentable/
  3. analyze_trends   — TF-IDF sobre webscraping + opentable → top-10 keywords (XCom)
  4. search_spoonacular — query Spoonacular con esos keywords → bronze/api/
  5. clean_recipes    — flatten + clean recipes → silver/api/

Paused by default. Trigger manually después de bronze_ingestion_pipeline.
"""

from airflow.decorators import dag, task
from airflow.sensors.python import PythonSensor
from datetime import datetime, timedelta

default_args = {
    "owner": "data_engineering_team",
    "retries": 1,
    "retry_delay": timedelta(minutes=2),
}


def _bronze_ready() -> bool:
    """True when webscraping OR opentable bronze partition has at least one JSON."""
    from pathlib import Path
    from scripts.utils import latest_date_dir
    web = latest_date_dir(Path("/opt/airflow/datalake/bronze/webscraping"))
    ot  = latest_date_dir(Path("/opt/airflow/datalake/bronze/opentable"))
    return any(web.glob("*.json")) or any(ot.glob("*.json"))


@dag(
    dag_id="silver_processing_pipeline",
    default_args=default_args,
    schedule_interval=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    is_paused_upon_creation=True,
    tags=["silver"],
)
def silver_processing_dag():

    wait_for_bronze = PythonSensor(
        task_id="wait_for_bronze",
        python_callable=_bronze_ready,
        poke_interval=30,
        timeout=600,
        mode="poke",
    )

    @task()
    def clean_eater_ny() -> str:
        from scripts.silver.preprocess_datasets import preprocess_web_only
        preprocess_web_only()
        return "Articles cleaned → Silver webscraping"

    @task()
    def clean_opentable() -> str:
        from scripts.silver.preprocess_datasets import preprocess_opentable_only
        preprocess_opentable_only()
        return "Reviews cleaned → Silver opentable"

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
        return "Recipes cleaned → Silver API"

    t1  = wait_for_bronze
    t2a = clean_eater_ny()
    t2b = clean_opentable()
    t3  = analyze_trends()
    t4  = search_spoonacular(t3)
    t5  = clean_recipes()

    # clean_eater_ny y clean_opentable corren en paralelo, luego analyze_trends
    t1 >> [t2a, t2b] >> t3 >> t4 >> t5


dag_instance = silver_processing_dag()
