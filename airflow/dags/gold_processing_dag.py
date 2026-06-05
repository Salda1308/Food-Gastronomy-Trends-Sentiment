"""
Gold Processing DAG — Step 6
==============================
Picks up where silver_processing_pipeline left off.

  1. wait_for_silver  — sensor: waits for Parquet files in the latest date
                        partition of BOTH silver/api/ and silver/webscraping/
  2. spark_gold_transform    — deduplicate + join → gold_articles + gold_recipes
  3. compute_governance      — data-quality KPIs → governance Parquet
  4. compute_storytelling    — VADER sentiment + keywords + aggregations
                               → storytelling Parquet

Each task starts and stops its own SparkSession so only one JVM is active
inside the scheduler container at a time.

This DAG is paused by default. Trigger it manually after silver_processing_pipeline
succeeds, or run it standalone whenever silver/ already has up-to-date data.
"""

from airflow.decorators import dag, task
from airflow.sensors.python import PythonSensor
from datetime import datetime, timedelta

default_args = {
    "owner": "data_engineering_team",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}


def _silver_files_ready() -> bool:
    """
    True when the latest date partition of BOTH silver subdirectories
    contains at least one Parquet file.
    """
    from pathlib import Path
    from scripts.utils import latest_date_dir
    api_ready = any(latest_date_dir(Path("/opt/airflow/datalake/silver/api")).glob("*.parquet"))
    web_ready = any(latest_date_dir(Path("/opt/airflow/datalake/silver/webscraping")).glob("*.parquet"))
    return api_ready and web_ready


@dag(
    dag_id="gold_processing_pipeline",
    default_args=default_args,
    schedule_interval="@daily",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    is_paused_upon_creation=True,
    tags=["gold", "spark"],
)
def gold_processing_dag():

    wait_for_silver = PythonSensor(
        task_id="wait_for_silver_files",
        python_callable=_silver_files_ready,
        poke_interval=60,
        timeout=3600,
        mode="reschedule",
    )

    @task()
    def spark_gold_transform() -> str:
        """Deduplicate and consolidate Silver → gold_articles + gold_recipes Parquet."""
        from scripts.gold.spark_transform import main
        main()
        return "Gold datasets written"

    @task()
    def compute_governance() -> str:
        """Compute 8 data-quality KPIs over Silver data → governance Parquet."""
        from scripts.gold.spark_governance import main
        main()
        return "Governance report written"

    @task()
    def compute_storytelling() -> str:
        """VADER sentiment + TF-IDF keywords + dashboard aggregations → storytelling Parquet."""
        from scripts.gold.spark_storytelling import main
        main()
        return "Storytelling summary written"

    @task()
    def notify_mobile() -> str:
        import httpx, os
        api = os.environ.get("GASTRONOMY_API_URL", "http://gastronomy-api:8000")
        try:
            r = httpx.post(f"{api}/api/notify/pipeline", json={
                "dag_id": "gold_processing_pipeline",
                "message": "NYC food trends updated. Check the latest sentiment and keyword data.",
            }, timeout=10)
            return f"Notification sent — status {r.status_code}"
        except Exception as exc:
            return f"Notification skipped: {exc}"

    wait_for_silver >> spark_gold_transform() >> compute_governance() >> compute_storytelling() >> notify_mobile()


dag_instance = gold_processing_dag()
