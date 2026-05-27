from __future__ import annotations
from datetime import datetime
from pathlib import Path

from scripts.utils import latest_date_dir, today_output_dir

SILVER_BASE = "/opt/airflow/datalake/silver"
GOLD_BASE   = "/opt/airflow/datalake/gold"

# Columns kept in gold_recipes — display and downstream NLP use
RECIPE_COLS = [
    "id", "title", "summary", "image",
    "readyInMinutes", "servings",
    "vegetarian", "vegan", "glutenFree", "dairyFree", "veryHealthy",
    "healthScore", "spoonacularScore", "pricePerServing",
    "cuisines", "dishTypes", "diets",
    "sourceUrl", "sourceName", "aggregateLikes",
    "ingredient_names",   # CSV of ingredient names — extracted from extendedIngredients
    "instructions_text",  # Plain-text steps — extracted from analyzedInstructions
]

# Columns kept in gold_articles — NLP-ready + display metadata
ARTICLE_COLS = [
    "article_id", "article_title", "article_title_clean",
    "article_url", "article_summary_clean",
    "categories", "published_date", "source", "author",
]


def build_spark_session():
    from pyspark.sql import SparkSession
    return (
        SparkSession.builder
        .master("local[*]")
        .appName("NYC-Gastronomy-Gold-Transform")
        # Memory: driver IS the executor in local mode; 1 g is sufficient for
        # the current dataset volume and leaves headroom for the JVM + Airflow.
        .config("spark.driver.memory", "1g")
        # Shuffle partitions: default 200 is excessive for small data.
        .config("spark.sql.shuffle.partitions", "4")
        # Merge schemas across silver parquet files that may differ by one column
        # (e.g. champagne carries an extra 'description' field).
        .config("spark.sql.parquet.mergeSchema", "true")
        # Suppress the Spark web UI and console progress bars inside Airflow logs.
        .config("spark.ui.enabled", "false")
        .config("spark.ui.showConsoleProgress", "false")
        .getOrCreate()
    )


def _read_with_type_coercion(spark, directory: str):
    """
    Read all Parquet files in *directory* one by one, cast columns that have
    known cross-file type conflicts to a stable target type, then union.
    Using mergeSchema=true for the union covers genuinely extra columns
    (e.g. 'description' only in champagne.parquet); it cannot handle type
    conflicts (e.g. license=INT vs license=STRING), which is why we coerce
    before merging.
    """
    from pyspark.sql import functions as F
    from functools import reduce

    files = [str(p) for p in Path(directory).glob("*.parquet")]
    if not files:
        raise FileNotFoundError(f"No Parquet files found in {directory}")

    dfs = []
    for fpath in files:
        fdf = spark.read.parquet(fpath)
        # Coerce known cross-file type conflicts → always use the wider/string type
        if "license" in fdf.columns:
            fdf = fdf.withColumn("license", F.col("license").cast("string"))
        dfs.append(fdf)

    return reduce(lambda a, b: a.unionByName(b, allowMissingColumns=True), dfs)


def transform_recipes(spark, silver_api_dir: str, gold_out: str) -> int:
    """
    Reads all silver/api Parquet files as one distributed DataFrame,
    selects display-ready columns, consolidates boolean dietary flags,
    deduplicates by recipe id, and writes to gold_out.
    """
    from pyspark.sql import functions as F

    df = _read_with_type_coercion(spark, silver_api_dir)

    # Select only the columns that are actually present in this batch
    keep = [c for c in RECIPE_COLS if c in df.columns]
    df = df.select(keep)

    # Deduplicate — multiple silver files from different ingredient searches
    # can return the same recipe id (e.g. a wagyu dish appearing under both
    # wagyu_beef and black_truffle searches).
    if "id" in df.columns:
        df = df.dropDuplicates(["id"])

    # Derive a single array column from the individual boolean dietary flags
    # so consumers don't have to join four boolean columns.
    dietary_map = [
        ("vegetarian", "vegetarian"),
        ("vegan", "vegan"),
        ("glutenFree", "gluten_free"),
        ("dairyFree", "dairy_free"),
    ]
    present_flags = [(col, label) for col, label in dietary_map if col in df.columns]
    if present_flags:
        tag_expr = F.array_compact(
            F.array(*[
                F.when(F.col(c) == True, F.lit(label))
                for c, label in present_flags
            ])
        )
        df = df.withColumn("dietary_tags", tag_expr)

    # coalesce(1) → single part file inside the output directory
    df.coalesce(1).write.mode("overwrite").parquet(gold_out)
    return df.count()


def transform_articles(spark, silver_web_dir: str, gold_out: str) -> int:
    """
    Reads all silver/webscraping Parquet files as one distributed DataFrame,
    selects NLP-ready columns, deduplicates by article_id, and writes to gold_out.
    """
    df = _read_with_type_coercion(spark, silver_web_dir)

    keep = [c for c in ARTICLE_COLS if c in df.columns]
    df = df.select(keep)

    # Deduplicate across Silver files — back-to-back RSS fetches and the
    # separate deduped parquet can all land in silver/webscraping/.
    if "article_id" in df.columns:
        df = df.dropDuplicates(["article_id"])

    df.coalesce(1).write.mode("overwrite").parquet(gold_out)
    return df.count()


def main() -> None:
    spark = build_spark_session()
    try:
        ts       = datetime.now().strftime("%H%M%S")
        gold_dir = today_output_dir(Path(GOLD_BASE))

        silver_api = latest_date_dir(Path(SILVER_BASE) / "api")
        silver_web = latest_date_dir(Path(SILVER_BASE) / "webscraping")

        recipes_out  = str(gold_dir / f"gold_recipes_{ts}.parquet")
        articles_out = str(gold_dir / f"gold_articles_{ts}.parquet")

        n = transform_recipes(spark, str(silver_api), recipes_out)
        print(f"gold_recipes:  {n} rows → {recipes_out}")

        n = transform_articles(spark, str(silver_web), articles_out)
        print(f"gold_articles: {n} rows → {articles_out}")

    finally:
        spark.stop()


if __name__ == "__main__":
    main()
