FROM apache/airflow:2.10.2-python3.11

# Install OpenJDK 17 (required by PySpark). Must run as root before switching
# back to the airflow user that the base image expects.
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
        default-jdk-headless \
        # Playwright Firefox dependencies
        libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
        libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
        libxfixes3 libxrandr2 libgbm1 libasound2 \
        libxcb-shm0 libx11-xcb1 libxcursor1 \
        libgtk-3-0 libpango-1.0-0 libpangocairo-1.0-0 \
        libcairo2 libcairo-gobject2 libgdk-pixbuf-2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Point PySpark and the JVM to the system Java installation.
ENV JAVA_HOME=/usr/lib/jvm/default-java

USER airflow
RUN pip install --no-cache-dir --timeout=120 pyspark==3.5.1
COPY requirements.txt /
RUN pip install --no-cache-dir --timeout=120 -r /requirements.txt
RUN playwright install firefox

# Install remaining Firefox system deps via playwright's own helper (runs as root)
USER root
RUN playwright install-deps firefox
USER airflow
# Download the medium English spaCy model (~50 MB). The medium model includes
# 685k word vectors needed for semantic food detection; the small model has none.
RUN python -m spacy download en_core_web_md
