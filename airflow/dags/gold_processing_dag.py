from airflow.decorators import dag, task
from airflow.sensors.python import PythonSensor
from datetime import datetime, timedelta

default_args = {
    'owner': 'data_engineering_team',
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

def _silver_files_exist() -> bool:
    """Return True when at least one Parquet exists in both silver subdirectories."""
    from pathlib import Path
    api_ready = any(Path("/opt/airflow/datalake/silver/api").glob("*.parquet"))
    web_ready = any(Path("/opt/airflow/datalake/silver/webscraping").glob("*.parquet"))
    return api_ready and web_ready

@dag(
    dag_id='gold_processing_pipeline',
    default_args=default_args,
    schedule_interval='@daily',
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    is_paused_upon_creation=True,  # superseded by nyc_gastronomy_pipeline
    tags=['gold', 'spark'],
)
def gold_processing_dag():

    wait_for_silver = PythonSensor(
        task_id='wait_for_silver_files',
        python_callable=_silver_files_exist,
        poke_interval=60,
        timeout=3600,
        mode='reschedule',
    )

    @task()
    def spark_gold_transform():
        from scripts.gold.spark_transform import main
        main()
        return "Gold datasets written"

    @task()
    def compute_governance():
        from scripts.gold.spark_governance import main
        main()
        return "Governance report written"

    @task()
    def compute_storytelling():
        from scripts.gold.spark_storytelling import main
        main()
        return "Storytelling summary written"

    # Each task starts and stops its own SparkSession so only one JVM is active
    # inside the scheduler container at a time.
    wait_for_silver >> spark_gold_transform() >> compute_governance() >> compute_storytelling()

dag_instance = gold_processing_dag()
