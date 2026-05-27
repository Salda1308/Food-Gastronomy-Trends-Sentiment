"""
Gold-layer data governance KPI computation.

Reads all Silver Parquet files, computes the KPI set defined in KPI.md,
and persists results as datalake_gold/governance_{timestamp}.parquet.
Each row is one KPI measurement in a flat long-format table.
"""
from __future__ import annotations
import os
import re
from datetime import datetime
from pathlib import Path

from scripts.utils import latest_date_dir, today_output_dir

SILVER_BASE = "/opt/airflow/datalake/silver"
BRONZE_BASE = "/opt/airflow/datalake/bronze"
GOLD_BASE   = "/opt/airflow/datalake/gold"

# Expected display columns for schema compliance checks
EXPECTED_API_COLS = {
    "id", "title", "summary", "image", "readyInMinutes", "servings",
    "vegetarian", "vegan", "glutenFree", "dairyFree", "veryHealthy",
    "healthScore", "spoonacularScore", "pricePerServing",
    "cuisines", "dishTypes", "diets", "sourceUrl", "sourceName", "aggregateLikes",
}
EXPECTED_WEB_COLS = {
    "article_id", "article_title", "article_title_clean", "article_url",
    "article_summary_clean", "categories", "published_date", "source", "author",
}

# Numeric columns to include in outlier analysis
API_NUMERIC_KPI_COLS  = ["readyInMinutes", "healthScore", "spoonacularScore",
                          "pricePerServing", "aggregateLikes"]
# Text columns to measure length statistics
API_TEXT_COLS  = ["summary"]
WEB_TEXT_COLS  = ["article_summary", "article_summary_clean"]


def _build_spark():
    from pyspark.sql import SparkSession
    return (
        SparkSession.builder
        .master("local[*]")
        .appName("NYC-Gastronomy-Governance")
        .config("spark.driver.memory",           "1g")
        .config("spark.sql.shuffle.partitions",  "4")
        .config("spark.sql.parquet.mergeSchema", "true")
        .config("spark.ui.enabled",              "false")
        .config("spark.ui.showConsoleProgress",  "false")
        .getOrCreate()
    )


# ── helpers ──────────────────────────────────────────────────────────────────

def _row(kpi, category, source, field, value, unit, finding, ts):
    return {
        "kpi_name":   kpi,
        "category":   category,
        "source":     source,
        "field":      field,
        "value":      float(value),
        "unit":       unit,
        "finding":    finding,
        "computed_at": ts,
    }


# ── KPI 1: null rate per field ────────────────────────────────────────────────

def kpi_null_rates(df, source, ts, results):
    from pyspark.sql import functions as F
    from pyspark.sql.types import StringType

    total = df.count()
    if total == 0:
        return total

    null_exprs = []
    for field in df.schema.fields:
        if isinstance(field.dataType, StringType):
            # count nulls AND blank/whitespace-only strings
            cond = F.col(field.name).isNull() | (F.trim(F.col(field.name)) == "")
        else:
            cond = F.col(field.name).isNull()
        null_exprs.append(F.count(F.when(cond, F.lit(1))).alias(field.name))

    null_counts = df.select(null_exprs).collect()[0].asDict()

    for col_name, null_count in null_counts.items():
        rate = round(null_count / total * 100, 2)
        results.append(_row(
            "null_rate", "completeness", source, col_name,
            rate, "%",
            f"{null_count}/{total} records have null or empty values",
            ts,
        ))
    return total


# ── KPI 2: volume metrics ─────────────────────────────────────────────────────

def kpi_volume(df, source, ts, total, results):
    # Total records
    results.append(_row(
        "record_count", "volume", source, None,
        total, "records",
        f"{total} records across all {source} Silver files",
        ts,
    ))

    # Source-file breakdown (count parquet files in today's partition)
    silver_dir = latest_date_dir(Path(SILVER_BASE) / source)
    file_count = len(list(silver_dir.glob("*.parquet"))) if silver_dir.exists() else 0
    results.append(_row(
        "source_file_count", "volume", source, None,
        file_count, "files",
        f"{file_count} Parquet files in silver/{source}/{silver_dir.name}/",
        ts,
    ))

    # API-specific: ingredient coverage
    if source == "api":
        expected_ingredients = 19  # defined in api_ingestion.py
        bronze_api = latest_date_dir(Path(BRONZE_BASE) / "api")
        actual = len(list(bronze_api.glob("*.json"))) if bronze_api.exists() else 0
        coverage = round(actual / expected_ingredients * 100, 2)
        results.append(_row(
            "ingredient_coverage", "volume", "api", None,
            coverage, "%",
            f"{actual}/{expected_ingredients} target ingredients have Bronze data",
            ts,
        ))


# ── KPI 3: duplicate rate ─────────────────────────────────────────────────────

def kpi_duplicate_rate(df, key_col, source, ts, total, results):
    if key_col not in df.columns:
        return

    unique = df.dropDuplicates([key_col]).count()
    dupes  = total - unique
    rate   = round(dupes / total * 100, 2) if total > 0 else 0.0

    results.append(_row(
        "duplicate_rate", "uniqueness", source, key_col,
        rate, "%",
        f"{dupes} duplicate records out of {total} (keyed on {key_col})",
        ts,
    ))


# ── KPI 4: schema compliance ──────────────────────────────────────────────────

def kpi_schema_compliance(df, expected_cols, source, ts, results):
    actual      = set(df.columns)
    present     = len(expected_cols & actual)
    compliance  = round(present / len(expected_cols) * 100, 2)
    missing     = sorted(expected_cols - actual)

    results.append(_row(
        "schema_compliance_rate", "validity", source, None,
        compliance, "%",
        (f"{present}/{len(expected_cols)} expected columns present"
         + (f"; missing: {missing}" if missing else "")),
        ts,
    ))

    # Extra (unexpected) columns are also worth flagging
    extra = sorted(actual - expected_cols)
    if extra:
        results.append(_row(
            "unexpected_columns", "validity", source, None,
            float(len(extra)), "columns",
            f"Columns present but not in expected schema: {extra}",
            ts,
        ))


# ── KPI 5: outlier rate per numeric field ─────────────────────────────────────

def kpi_outlier_rates(df, numeric_cols, source, ts, total, results):
    from pyspark.sql import functions as F

    target_cols = [c for c in numeric_cols if c in df.columns]
    if not target_cols:
        return

    for c in target_cols:
        non_null_df = df.filter(F.col(c).isNotNull())
        n = non_null_df.count()
        if n < 4:
            continue  # IQR is not meaningful for tiny samples

        quantiles = non_null_df.approxQuantile(c, [0.25, 0.75], 0.01)
        if len(quantiles) < 2:
            continue
        q1, q3 = quantiles
        iqr = q3 - q1
        if iqr == 0:
            # All values identical — report zero outliers explicitly
            results.append(_row(
                "outlier_rate", "validity", source, c,
                0.0, "%",
                f"IQR=0 (all {n} non-null values identical); no outliers computable",
                ts,
            ))
            continue

        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        outlier_count = df.filter(
            F.col(c).isNotNull() & ((F.col(c) < lower) | (F.col(c) > upper))
        ).count()
        rate = round(outlier_count / total * 100, 2) if total > 0 else 0.0

        results.append(_row(
            "outlier_rate", "validity", source, c,
            rate, "%",
            (f"{outlier_count}/{total} records outside IQR fence "
             f"[{lower:.2f}, {upper:.2f}]  Q1={q1:.2f} Q3={q3:.2f}"),
            ts,
        ))


# ── KPI 6: text length statistics ────────────────────────────────────────────

def kpi_text_length(df, text_cols, source, ts, results):
    from pyspark.sql import functions as F

    for c in text_cols:
        if c not in df.columns:
            continue

        non_null_df = df.filter(F.col(c).isNotNull() & (F.col(c) != ""))
        if non_null_df.count() == 0:
            continue

        stats = non_null_df.select(
            F.avg(F.length(c)).alias("mean"),
            F.percentile_approx(F.length(c), 0.5).alias("median"),
            F.min(F.length(c)).alias("min"),
            F.max(F.length(c)).alias("max"),
        ).collect()[0]

        for metric, val in [
            ("text_length_mean",   stats["mean"]),
            ("text_length_median", stats["median"]),
            ("text_length_min",    stats["min"]),
            ("text_length_max",    stats["max"]),
        ]:
            results.append(_row(
                metric, "accuracy", source, c,
                val, "chars",
                f"{metric.split('_')[-1].capitalize()} character count in {c}",
                ts,
            ))

    # NLP compression ratio for webscraping
    if source == "webscraping" and all(c in df.columns for c in ("article_summary", "article_summary_clean")):
        stats = df.filter(
            F.col("article_summary").isNotNull() & (F.col("article_summary") != "") &
            F.col("article_summary_clean").isNotNull() & (F.col("article_summary_clean") != "")
        ).select(
            F.avg(
                F.length("article_summary_clean").cast("double") /
                F.length("article_summary").cast("double")
            ).alias("ratio")
        ).collect()[0]

        ratio = stats["ratio"] or 0.0
        results.append(_row(
            "nlp_compression_ratio", "accuracy", source, "article_summary_clean",
            round(ratio, 4), "ratio",
            f"Mean clean/raw length ratio after NLP pipeline ({ratio:.2%} of original retained)",
            ts,
        ))


# ── KPI 7: language distribution (non-ASCII proxy) ───────────────────────────

def kpi_language_distribution(df, text_cols, source, ts, results):
    """
    Proxy metric: non-ASCII character ratio.  All content in this corpus is
    expected to be English, so any non-ASCII chars signal encoding noise or
    foreign-language contamination.  True language detection would require
    langdetect or similar; the ASCII ratio is sufficient for a monolingual corpus.
    """
    from pyspark.sql import functions as F

    for c in text_cols:
        if c not in df.columns:
            continue

        # Concatenate all non-null values and count non-ASCII characters
        # using a UDF-free approach: chars outside [\\x00-\\x7F] matched by regex
        sample_df = df.filter(F.col(c).isNotNull() & (F.col(c) != ""))
        if sample_df.count() == 0:
            continue

        # total chars across all rows
        total_chars = sample_df.select(F.sum(F.length(c)).alias("t")).collect()[0]["t"] or 0
        # non-ASCII: length of original minus length after removing non-ASCII
        non_ascii_chars = sample_df.select(
            F.sum(
                F.length(c) - F.length(F.regexp_replace(c, "[^\\x00-\\x7F]", ""))
            ).alias("n")
        ).collect()[0]["n"] or 0

        rate = round(non_ascii_chars / total_chars * 100, 3) if total_chars > 0 else 0.0
        results.append(_row(
            "non_ascii_ratio", "accuracy", source, c,
            rate, "%",
            (f"{non_ascii_chars}/{total_chars} non-ASCII chars; "
             "corpus is expected to be monolingual English — any value >1% warrants review"),
            ts,
        ))


# ── KPI 8: ingestion frequency compliance ─────────────────────────────────────

def kpi_ingestion_frequency(ts, results):
    """
    Counts distinct ingestion dates per source in the Bronze layer.
    Each YYYY-MM-DD subdirectory corresponds to one daily DAG run.
    """
    _date_re = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    for source in ("api", "webscraping"):
        bronze_base = Path(BRONZE_BASE) / source
        if not bronze_base.exists():
            continue

        date_dirs = sorted(
            [d for d in bronze_base.iterdir() if d.is_dir() and _date_re.match(d.name)]
        )
        dates = [d.name for d in date_dirs]
        files = list(bronze_base.rglob("*.json"))

        results.append(_row(
            "ingestion_distinct_dates", "timeliness", source, None,
            float(len(dates)), "dates",
            f"Bronze {source} spans {len(dates)} daily partition(s): {dates}",
            ts,
        ))

        results.append(_row(
            "ingestion_file_count", "timeliness", source, None,
            float(len(files)), "files",
            f"{len(files)} Bronze JSON files across all partitions for '{source}'",
            ts,
        ))


# ── orchestrator ─────────────────────────────────────────────────────────────

def _read_api(spark):
    """Read silver/api files one by one, coercing 'license' to STRING before
    union so Spark doesn't fail on INT vs STRING type conflict across files."""
    from pyspark.sql import functions as F
    from functools import reduce

    silver_api = latest_date_dir(Path(SILVER_BASE) / "api")
    files = [str(p) for p in silver_api.glob("*.parquet")]
    if not files:
        raise FileNotFoundError(f"No Parquet files in {silver_api}")
    dfs = []
    for fpath in files:
        fdf = spark.read.parquet(fpath)
        if "license" in fdf.columns:
            fdf = fdf.withColumn("license", F.col("license").cast("string"))
        dfs.append(fdf)
    return reduce(lambda a, b: a.unionByName(b, allowMissingColumns=True), dfs)


def main():
    from pyspark.sql import Row

    spark = _build_spark()
    try:
        ts = datetime.now().isoformat()
        results = []

        # ── API ──────────────────────────────────────────────────────────────
        api_df = _read_api(spark)
        total_api = kpi_null_rates(api_df, "api", ts, results)
        kpi_volume(api_df, "api", ts, total_api, results)
        kpi_duplicate_rate(api_df, "id", "api", ts, total_api, results)
        kpi_schema_compliance(api_df, EXPECTED_API_COLS, "api", ts, results)
        kpi_outlier_rates(api_df, API_NUMERIC_KPI_COLS, "api", ts, total_api, results)
        kpi_text_length(api_df, API_TEXT_COLS, "api", ts, results)
        kpi_language_distribution(api_df, API_TEXT_COLS, "api", ts, results)

        # ── Webscraping ──────────────────────────────────────────────────────
        silver_web = latest_date_dir(Path(SILVER_BASE) / "webscraping")
        web_df = spark.read.parquet(str(silver_web))
        total_web = kpi_null_rates(web_df, "webscraping", ts, results)
        kpi_volume(web_df, "webscraping", ts, total_web, results)
        kpi_duplicate_rate(web_df, "article_id", "webscraping", ts, total_web, results)
        kpi_schema_compliance(web_df, EXPECTED_WEB_COLS, "webscraping", ts, results)
        kpi_text_length(web_df, WEB_TEXT_COLS, "webscraping", ts, results)
        kpi_language_distribution(web_df, ["article_summary", "article_summary_clean"],
                                  "webscraping", ts, results)

        # ── Cross-source ─────────────────────────────────────────────────────
        kpi_ingestion_frequency(ts, results)

        # ── Persist ──────────────────────────────────────────────────────────
        gold_dir = today_output_dir(Path(GOLD_BASE))
        file_ts  = datetime.now().strftime("%H%M%S")
        out_path = str(gold_dir / f"governance_{file_ts}.parquet")

        gov_df = spark.createDataFrame([Row(**r) for r in results])
        gov_df.coalesce(1).write.mode("overwrite").parquet(out_path)

        print(f"Governance report: {len(results)} KPI rows → {out_path}")
        gov_df.show(50, truncate=80)

    finally:
        spark.stop()


if __name__ == "__main__":
    main()
