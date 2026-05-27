from airflow.decorators import dag, task
from airflow.sensors.python import PythonSensor
from datetime import datetime, timedelta

default_args = {
    'owner': 'data_engineering_team',
    'retries': 1,
    'retry_delay': timedelta(minutes=2),
}

def _bronze_files_exist() -> bool:
    """Return True when at least one JSON exists in the bronze API directory."""
    from pathlib import Path
    return any(Path("/opt/airflow/datalake/bronze/api").glob("*.json"))

@dag(
    dag_id='silver_processing_pipeline',
    default_args=default_args,
    schedule_interval='@daily',
    start_date=datetime(2024, 1, 1),
    catchup=False,
    is_paused_upon_creation=True,  # superseded by nyc_gastronomy_pipeline
    tags=['silver', 'taskflow']
)
def silver_processing_dag():

    wait_for_data = PythonSensor(
        task_id='wait_for_bronze_files',
        python_callable=_bronze_files_exist,
        poke_interval=30,
        timeout=600,
    )

    @task()
    def process_data_task():
        from scripts.silver.preprocess_datasets import main as run_silver_logic
        run_silver_logic()
        return "Capa Silver completada: JSONs convertidos a Parquet"

    wait_for_data >> process_data_task()

dag_instance = silver_processing_dag()
