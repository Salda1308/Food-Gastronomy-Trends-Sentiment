FROM apache/airflow:2.10.2-python3.11

# Install OpenJDK 17 (required by PySpark). Must run as root before switching
# back to the airflow user that the base image expects.
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
        default-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

# Point PySpark and the JVM to the system Java installation.
ENV JAVA_HOME=/usr/lib/jvm/default-java

USER airflow
RUN pip install --no-cache-dir pyspark==3.5.1
COPY requirements.txt /
RUN pip install --no-cache-dir -r /requirements.txt
# Download the medium English spaCy model (~50 MB). The medium model includes
# 685k word vectors needed for semantic food detection; the small model has none.
RUN python -m spacy download en_core_web_md
