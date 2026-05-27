"""
Gold-layer storytelling aggregations for the NYC Gastronomy dashboard.

Concept
-------
Web-scraped Eater NY articles are analysed for NLP signals (sentiment, keywords,
trending topics).  Those signals are cross-referenced with the Spoonacular recipe
dataset to surface which recipes align with what NYC food media is currently
discussing positively.  The output is a flat long-format Parquet consumed directly
by the dashboard layer.

Aggregations are justified in userstory.md.
"""
from __future__ import annotations
from datetime import datetime
from pathlib import Path

from scripts.utils import latest_date_dir, today_output_dir
from scripts.silver.trend_analysis import is_food_token

GOLD_BASE   = "/opt/airflow/datalake/gold"
SILVER_BASE = "/opt/airflow/datalake/silver"


# ── Spark session ─────────────────────────────────────────────────────────────

def _build_spark():
    from pyspark.sql import SparkSession
    return (
        SparkSession.builder
        .master("local[*]")
        .appName("NYC-Gastronomy-Storytelling")
        .config("spark.driver.memory",          "1g")
        .config("spark.sql.shuffle.partitions", "4")
        .config("spark.ui.enabled",             "false")
        .config("spark.ui.showConsoleProgress", "false")
        # RFC-2822 timezone offsets (+0000) aren't parseable by Spark 3's new
        # DateTimeFormatter; LEGACY restores Java SimpleDateFormat semantics.
        .config("spark.sql.legacy.timeParserPolicy", "LEGACY")
        .getOrCreate()
    )


# ── I/O helpers ───────────────────────────────────────────────────────────────

def _latest_gold(pattern: str) -> str:
    gold_dir = latest_date_dir(Path(GOLD_BASE))
    matches  = sorted(gold_dir.glob(pattern))
    if not matches:
        raise FileNotFoundError(f"No Gold file matching {pattern} in {gold_dir}")
    return str(matches[-1])


def _row(aggregation, category, dim_name, dim_value, metric, value, label, ts):
    return {
        "aggregation":  aggregation,
        "category":     category,
        "dimension_name":  str(dim_name)  if dim_name  is not None else None,
        "dimension_value": str(dim_value) if dim_value is not None else None,
        "metric":  metric,
        "value":   float(value),
        "label":   str(label) if label is not None else None,
        "computed_at": ts,
    }


# ── Sentiment scoring ─────────────────────────────────────────────────────────

def _add_sentiment(df):
    """
    Adds compound_score (VADER, −1 to +1) and sentiment_label (positive /
    neutral / negative) to the articles DataFrame.
    VADER is a rule-based model tuned for short social/news text — appropriate
    for Eater NY article summaries without requiring a labelled training set.
    """
    import nltk
    nltk.download("vader_lexicon", quiet=True)

    from pyspark.sql import functions as F
    from pyspark.sql.types import FloatType, StringType

    def _score(text: str | None) -> float:
        if not text:
            return 0.0
        from nltk.sentiment.vader import SentimentIntensityAnalyzer
        return float(SentimentIntensityAnalyzer().polarity_scores(text)["compound"])

    def _label(score: float | None) -> str:
        if score is None:
            return "neutral"
        if score >= 0.05:
            return "positive"
        if score <= -0.05:
            return "negative"
        return "neutral"

    score_udf = F.udf(_score, FloatType())
    label_udf = F.udf(_label, StringType())

    return (
        df
        .withColumn("compound_score",  score_udf(F.col("article_summary_clean")))
        .withColumn("sentiment_label", label_udf(F.col("compound_score")))
    )


def _parse_dates(df):
    """Coerce published_date (RFC-2822 or ISO) to a date column."""
    from pyspark.sql import functions as F
    return df.withColumn(
        "pub_date",
        F.coalesce(
            F.to_date(F.to_timestamp(F.col("published_date"), "EEE, dd MMM yyyy HH:mm:ss Z")),
            F.to_date(F.to_timestamp(F.col("published_date"), "EEE, dd MMM yyyy HH:mm:ss zzz")),
            F.to_date(F.to_timestamp(F.col("published_date"))),
            F.to_date(F.col("published_date")),
        ),
    )


# ── Aggregation 1: Sentiment distribution ────────────────────────────────────
# User story #3 (detect cuisines gaining/losing popularity) and #7 (validate
# consistency between API and scraping sentiment)

def agg_sentiment_distribution(df, ts, results):
    from pyspark.sql import functions as F

    total = df.count()
    if total == 0:
        return

    for row in df.groupBy("sentiment_label").count().collect():
        lbl   = row["sentiment_label"]
        count = row["count"]
        pct   = round(count / total * 100, 2)
        results.append(_row("sentiment_distribution", "sentiment",
                            "sentiment_label", lbl, "count",      count, f"{pct}% of articles", ts))
        results.append(_row("sentiment_distribution", "sentiment",
                            "sentiment_label", lbl, "percentage", pct,   f"{count} articles",   ts))

    avg_score = df.agg(F.avg("compound_score")).collect()[0][0] or 0.0
    results.append(_row("sentiment_distribution", "sentiment",
                        "overall", "all", "avg_compound_score",
                        round(float(avg_score), 4), "VADER compound", ts))


# ── Aggregation 2: Sentiment trend over time ──────────────────────────────────
# User story #3 (temporal opinion shifts per dish category)

def agg_sentiment_trend(df, ts, results):
    from pyspark.sql import functions as F

    dated = _parse_dates(df).filter(F.col("pub_date").isNotNull())
    if dated.count() == 0:
        return

    rows = (
        dated
        .withColumn("week", F.date_trunc("week", F.col("pub_date")))
        .groupBy("week")
        .agg(
            F.avg("compound_score").alias("avg_sentiment"),
            F.count("*").alias("article_count"),
        )
        .orderBy("week")
        .collect()
    )
    for row in rows:
        w = str(row["week"])
        results.append(_row("sentiment_trend", "temporal", "week", w,
                            "avg_sentiment",  round(float(row["avg_sentiment"] or 0), 4),
                            f"{row['article_count']} articles", ts))
        results.append(_row("sentiment_trend", "temporal", "week", w,
                            "article_count", row["article_count"], w, ts))


# ── Aggregation 3: Top keywords ───────────────────────────────────────────────
# User stories #1 (highest-rated dish topics) and #5 (neighborhood signals)

def agg_top_keywords(df, ts, results, top_n: int = 20):
    """
    TF-IDF keyword extraction on the article corpus (collected to driver).
    TF-IDF rewards terms distinctive to this batch while penalising terms
    that appear in every article — more meaningful than raw frequency.
    Scores are normalised 0-100 relative to the top term.
    """
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer

    docs = [
        row["article_summary_clean"] or ""
        for row in df.select("article_summary_clean").collect()
    ]
    docs = [d for d in docs if d.strip()]
    if not docs:
        return

    vectorizer = TfidfVectorizer(max_features=500, ngram_range=(1, 1), min_df=1)
    tfidf_matrix = vectorizer.fit_transform(docs)
    feature_names = vectorizer.get_feature_names_out()
    mean_scores   = np.asarray(tfidf_matrix.mean(axis=0)).flatten()
    top_indices   = mean_scores.argsort()[::-1]

    ranked = [
        (feature_names[i], float(mean_scores[i]))
        for i in top_indices
        if is_food_token(feature_names[i])
    ][:top_n]

    if not ranked:
        return

    max_score = ranked[0][1]
    for i, (word, score) in enumerate(ranked, start=1):
        normalised = round(score / max_score * 100, 1) if max_score > 0 else 0.0
        results.append(_row("top_keywords", "content",
                            "rank", i, "tfidf_score", normalised, word, ts))


# ── Aggregation 4: Top bigrams ─────────────────────────────────────────────────
# User stories #1 (compound food concepts like "tasting menu") and #5
# (NYC neighbourhood phrases like "lower east")

def agg_top_bigrams(df, ts, results, top_n: int = 15):
    from pyspark.sql import functions as F
    from pyspark.ml.feature import NGram

    tokenized = df.withColumn("tokens", F.split(F.col("article_summary_clean"), r"\s+"))
    bigrams   = NGram(n=2, inputCol="tokens", outputCol="bigrams").transform(tokenized)

    rows = (
        bigrams
        .select(F.explode(F.col("bigrams")).alias("bigram"))
        .filter(F.length("bigram") > 5)
        .groupBy("bigram")
        .count()
        .orderBy(F.desc("count"))
        .limit(top_n)
        .collect()
    )
    for i, row in enumerate(rows, start=1):
        results.append(_row("top_bigrams", "content",
                            "rank", i, "frequency", row["count"], row["bigram"], ts))


# ── Aggregation 5: Keyword-sentiment association ──────────────────────────────
# User story #3 (which terms are gaining vs losing positive coverage)

def agg_keyword_sentiment(df, ts, results, top_n: int = 15):
    from pyspark.sql import functions as F
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer

    # Use TF-IDF to select which food keywords to score for sentiment —
    # same ranking as agg_top_keywords so the two aggregations are consistent.
    docs = [
        row["article_summary_clean"] or ""
        for row in df.select("article_summary_clean").collect()
    ]
    docs = [d for d in docs if d.strip()]
    if not docs:
        return

    vectorizer = TfidfVectorizer(max_features=500, ngram_range=(1, 1), min_df=1)
    tfidf_matrix = vectorizer.fit_transform(docs)
    feature_names = vectorizer.get_feature_names_out()
    mean_scores   = np.asarray(tfidf_matrix.mean(axis=0)).flatten()
    top_indices   = mean_scores.argsort()[::-1]

    top_food_words = [
        feature_names[i] for i in top_indices if is_food_token(feature_names[i])
    ][:top_n]

    class _FakeRow:
        def __init__(self, word): self.word = word

    top_words = [_FakeRow(w) for w in top_food_words]

    for row in top_words:
        word = row.word
        avg  = (
            df.filter(F.col("article_summary_clean").contains(word))
            .agg(F.avg("compound_score").alias("avg"))
            .collect()[0]["avg"]
        )
        if avg is not None:
            lbl = "positive" if avg >= 0.05 else ("negative" if avg <= -0.05 else "neutral")
            results.append(_row("keyword_sentiment", "sentiment",
                                "keyword", word, "avg_sentiment",
                                round(float(avg), 4), lbl, ts))


# ── Aggregation 6: Source comparison ─────────────────────────────────────────
# User story #7 (compare API recipe scores vs article sentiment for model validation)

def agg_source_comparison(articles_df, recipes_df, ts, results):
    from pyspark.sql import functions as F

    a = articles_df.agg(
        F.avg("compound_score").alias("avg_sentiment"),
        F.count("*").alias("n"),
    ).collect()[0]
    results.append(_row("source_comparison", "cross_source",
                        "source", "web_articles", "avg_sentiment",
                        round(float(a["avg_sentiment"] or 0), 4),
                        f"{a['n']} Eater NY articles", ts))
    results.append(_row("source_comparison", "cross_source",
                        "source", "web_articles", "record_count", a["n"], "Eater NY", ts))

    r = recipes_df.agg(
        F.avg("spoonacularScore").alias("avg_sp"),
        F.avg("healthScore").alias("avg_h"),
        F.count("*").alias("n"),
    ).collect()[0]
    results.append(_row("source_comparison", "cross_source",
                        "source", "api_recipes", "avg_spoonacular_score",
                        round(float(r["avg_sp"] or 0), 4),
                        f"{r['n']} Spoonacular recipes", ts))
    results.append(_row("source_comparison", "cross_source",
                        "source", "api_recipes", "avg_health_score",
                        round(float(r["avg_h"] or 0), 4),
                        f"{r['n']} Spoonacular recipes", ts))
    results.append(_row("source_comparison", "cross_source",
                        "source", "api_recipes", "record_count", r["n"], "Spoonacular", ts))


# ── Aggregation 7: Volume trends ──────────────────────────────────────────────
# User stories #3 (topic activity peaks) and #4 (ingestion reliability check)

def agg_volume_trends(df, ts, results):
    from pyspark.sql import functions as F

    dated = _parse_dates(df).filter(F.col("pub_date").isNotNull())
    if dated.count() == 0:
        return

    for row in dated.groupBy("pub_date").count().orderBy("pub_date").collect():
        results.append(_row("volume_trends", "temporal",
                            "date", str(row["pub_date"]),
                            "article_count", row["count"], str(row["pub_date"]), ts))


# ── Aggregation 8: Category breakdown ────────────────────────────────────────
# User stories #1 (event type mapping) and #3 (cuisine-level sentiment)

def agg_category_breakdown(df, ts, results):
    from pyspark.sql import functions as F
    from pyspark.sql.types import ArrayType

    # categories is ARRAY<STRING> when written by Spark, STRING when written by pandas
    if isinstance(df.schema["categories"].dataType, ArrayType):
        exploded = F.explode(F.col("categories"))
    else:
        exploded = F.explode(F.split(F.col("categories"), ","))

    cat_df = (
        df
        .select(
            exploded.alias("cat"),
            F.col("compound_score"),
            F.col("sentiment_label"),
        )
        .withColumn("cat", F.trim(F.col("cat")))
        .filter(F.col("cat") != "")
    )

    rows = (
        cat_df
        .groupBy("cat")
        .agg(
            F.count("*").alias("article_count"),
            F.avg("compound_score").alias("avg_sentiment"),
            F.sum(F.when(F.col("sentiment_label") == "positive", 1).otherwise(0)).alias("pos"),
            F.sum(F.when(F.col("sentiment_label") == "negative", 1).otherwise(0)).alias("neg"),
        )
        .orderBy(F.desc("article_count"))
        .collect()
    )
    for row in rows:
        cat = row["cat"]
        results.append(_row("category_breakdown", "content",
                            "category", cat, "article_count", row["article_count"], cat, ts))
        results.append(_row("category_breakdown", "content",
                            "category", cat, "avg_sentiment",
                            round(float(row["avg_sentiment"] or 0), 4),
                            "positive" if (row["avg_sentiment"] or 0) >= 0.05 else "neutral/negative",
                            ts))
        results.append(_row("category_breakdown", "content",
                            "category", cat, "positive_count", row["pos"], cat, ts))
        results.append(_row("category_breakdown", "content",
                            "category", cat, "negative_count", row["neg"], cat, ts))


# ── Aggregation 9: Recipe-trend alignment ────────────────────────────────────
# Core concept: NLP signals from articles → rank existing recipes by media buzz.
# User stories #1 (highest-rated dishes for event types) and #2 (dietary filtering).

def agg_recipe_trend_alignment(articles_df, recipes_df, ts, results):
    from pyspark.sql import functions as F

    # Extract top food keywords from positively-scored articles
    positive_articles = articles_df.filter(F.col("compound_score") >= 0.05)
    source_df = positive_articles if positive_articles.count() > 0 else articles_df

    top_words = (
        source_df
        .select(F.explode(F.split(F.col("article_summary_clean"), r"\s+")).alias("word"))
        .filter(F.length("word") > 3)
        .filter(~F.col("word").rlike(r"^\d+$"))
        .groupBy("word")
        .count()
        .orderBy(F.desc("count"))
        .limit(20)
        .select("word")
        .collect()
    )
    keywords = [row["word"] for row in top_words]

    # Score each recipe: count how many trending keywords appear in title + cuisines
    recipe_rows = recipes_df.select(
        "id", "title", "cuisines", "dishTypes",
        "spoonacularScore", "healthScore", "aggregateLikes",
    ).collect()

    for rr in recipe_rows:
        combined = f"{(rr['title'] or '').lower()} {(rr['cuisines'] or '').lower()} {(rr['dishTypes'] or '').lower()}"
        matches   = [kw for kw in keywords if kw in combined]
        trend_score = len(matches)

        results.append(_row("recipe_trend_alignment", "recommendation",
                            "recipe_id", str(rr["id"]),
                            "trend_score", float(trend_score),
                            rr["title"], ts))
        results.append(_row("recipe_trend_alignment", "recommendation",
                            "recipe_id", str(rr["id"]),
                            "spoonacular_score", float(rr["spoonacularScore"] or 0),
                            rr["title"], ts))
        results.append(_row("recipe_trend_alignment", "recommendation",
                            "recipe_id", str(rr["id"]),
                            "aggregate_likes", float(rr["aggregateLikes"] or 0),
                            rr["title"], ts))
        if matches:
            results.append(_row("recipe_trend_alignment", "recommendation",
                                "recipe_id", str(rr["id"]),
                                "matched_keywords", float(len(matches)),
                                "|".join(matches[:5]), ts))


# ── Aggregation 10: Dietary breakdown ────────────────────────────────────────
# User story #2 (filter suggestions by dietary restriction)

def agg_dietary_breakdown(recipes_df, ts, results):
    from pyspark.sql import functions as F

    total = recipes_df.count()
    if total == 0:
        return

    dietary_flags = {
        "vegetarian": "Vegetarian",
        "vegan":      "Vegan",
        "glutenFree": "Gluten-free",
        "dairyFree":  "Dairy-free",
        "veryHealthy":"Very healthy",
    }
    for col, label in dietary_flags.items():
        if col not in recipes_df.columns:
            continue
        count = recipes_df.filter(F.col(col) == True).count()
        pct   = round(count / total * 100, 2)
        results.append(_row("dietary_breakdown", "recommendation",
                            "dietary_flag", col, "count", count,
                            f"{label}: {pct}% of recipes", ts))
        results.append(_row("dietary_breakdown", "recommendation",
                            "dietary_flag", col, "percentage", pct, label, ts))


# ── Aggregation N: Named Entity Recognition ──────────────────────────────────
# spaCy en_core_web_sm NER on article titles → restaurant names (ORG),
# NYC neighbourhoods (GPE/LOC), chef names (PERSON).

def agg_named_entities(df, ts, results, top_n: int = 8):
    import spacy
    from collections import Counter

    nlp = spacy.load("en_core_web_md")

    restaurants:   Counter = Counter()
    neighborhoods: Counter = Counter()
    chefs:         Counter = Counter()

    title_col = "article_title" if "article_title" in df.columns else None
    if title_col is None:
        return

    titles = [
        row[title_col] or ""
        for row in df.select(title_col).collect()
    ]

    for title in titles:
        doc = nlp(title)
        for ent in doc.ents:
            name = ent.text.strip()
            if len(name) < 3:
                continue
            if ent.label_ == "ORG":
                restaurants[name] += 1
            elif ent.label_ == "PERSON":
                chefs[name] += 1
            elif ent.label_ in ("GPE", "LOC"):
                neighborhoods[name] += 1

    entity_map = {
        "restaurant":   restaurants,
        "neighborhood": neighborhoods,
        "chef":         chefs,
    }
    for entity_type, counter in entity_map.items():
        for rank, (name, count) in enumerate(counter.most_common(top_n), start=1):
            results.append(_row("named_entities", "entities",
                                "entity_type", entity_type,
                                "count", float(count), name, ts))


# ── Orchestrator ──────────────────────────────────────────────────────────────

def main():
    import nltk
    nltk.download("vader_lexicon", quiet=True)

    from pyspark.sql import Row

    spark = _build_spark()
    try:
        ts = datetime.now().isoformat()
        results: list[dict] = []

        articles_df = spark.read.parquet(_latest_gold("gold_articles_*.parquet"))
        recipes_df  = spark.read.parquet(_latest_gold("gold_recipes_*.parquet"))

        # Enrich articles with VADER sentiment scores (runs as Spark UDF, local mode)
        articles_df = _add_sentiment(articles_df)

        agg_sentiment_distribution(articles_df, ts, results)
        agg_sentiment_trend(articles_df, ts, results)
        agg_top_keywords(articles_df, ts, results)
        agg_top_bigrams(articles_df, ts, results)
        agg_keyword_sentiment(articles_df, ts, results)
        agg_source_comparison(articles_df, recipes_df, ts, results)
        agg_volume_trends(articles_df, ts, results)
        agg_category_breakdown(articles_df, ts, results)
        agg_recipe_trend_alignment(articles_df, recipes_df, ts, results)
        agg_dietary_breakdown(recipes_df, ts, results)
        agg_named_entities(articles_df, ts, results)

        gold_dir = today_output_dir(Path(GOLD_BASE))
        file_ts  = datetime.now().strftime("%H%M%S")
        out_path = str(gold_dir / f"storytelling_{file_ts}.parquet")

        story_df = spark.createDataFrame([Row(**r) for r in results])
        story_df.coalesce(1).write.mode("overwrite").parquet(out_path)

        print(f"Storytelling: {len(results)} rows → {out_path}")
        story_df.show(60, truncate=90)

    finally:
        spark.stop()


if __name__ == "__main__":
    main()
