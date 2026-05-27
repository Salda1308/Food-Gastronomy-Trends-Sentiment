"""
Storytelling endpoints — expose sentiment, keywords, trends, and entities
from the Gold storytelling Parquet file.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.loader import load_storytelling, latest_partition_date

router = APIRouter()


def _story_df():
    try:
        return load_storytelling()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/")
def get_storytelling():
    """
    Return all storytelling aggregation rows from the latest Gold partition.
    Full dataset — use specific endpoints for filtered views.
    """
    df = _story_df()
    return {
        "partition_date": latest_partition_date(),
        "row_count": len(df),
        "data": df.to_dict(orient="records"),
    }


@router.get("/sentiment")
def get_sentiment():
    """
    Return sentiment distribution (positive / neutral / negative counts and %)
    plus the overall average compound score.

    Response shape:
    {
      "partition_date": "2026-05-27",
      "distribution": [
        { "label": "positive", "count": 7, "percentage": 70.0 },
        ...
      ],
      "avg_compound_score": 0.312
    }
    """
    df = _story_df()

    dist = (
        df[(df["aggregation"] == "sentiment_distribution") & (df["metric"] == "count")]
        [["dimension_value", "value"]]
        .rename(columns={"dimension_value": "label", "value": "count"})
    )
    pct_rows = df[
        (df["aggregation"] == "sentiment_distribution") & (df["metric"] == "percentage")
    ][["dimension_value", "value"]].rename(columns={"dimension_value": "label", "value": "percentage"})

    merged = dist.merge(pct_rows, on="label", how="left")

    avg_row = df[
        (df["aggregation"] == "sentiment_distribution") & (df["metric"] == "avg_compound_score")
    ]
    avg_score = float(avg_row["value"].values[0]) if not avg_row.empty else None

    return {
        "partition_date":    latest_partition_date(),
        "distribution":      merged.to_dict(orient="records"),
        "avg_compound_score": avg_score,
    }


@router.get("/keywords")
def get_keywords(limit: int = 15):
    """
    Return the top food keywords ranked by TF-IDF score (normalized 0–100),
    with the average sentiment label for each keyword.

    Query param:
      limit (int, default 15) — max keywords to return

    Response shape:
    {
      "partition_date": "2026-05-27",
      "keywords": [
        { "rank": 1, "keyword": "ramen", "score": 100.0, "sentiment": "positive" },
        ...
      ]
    }
    """
    df = _story_df()

    kw = (
        df[df["aggregation"] == "top_keywords"]
        .sort_values("value", ascending=False)
        .head(limit)
    )
    ks = df[df["aggregation"] == "keyword_sentiment"]
    ks_map = dict(zip(ks["dimension_value"].str.lower(), ks["label"].str.lower()))

    keywords = []
    for i, (_, row) in enumerate(kw.iterrows(), start=1):
        word = str(row["label"])
        keywords.append({
            "rank":      i,
            "keyword":   word,
            "score":     float(row["value"]),
            "sentiment": ks_map.get(word.lower(), "neutral"),
        })

    return {
        "partition_date": latest_partition_date(),
        "keywords":       keywords,
    }


@router.get("/trend")
def get_sentiment_trend():
    """
    Return average sentiment score per week over time.

    Response shape:
    {
      "partition_date": "2026-05-27",
      "trend": [
        { "week": "2026-05-20", "avg_sentiment": 0.31, "article_count": 8 },
        ...
      ]
    }
    """
    df = _story_df()

    rows = df[(df["aggregation"] == "sentiment_trend") & (df["metric"] == "avg_sentiment")]
    counts = df[(df["aggregation"] == "sentiment_trend") & (df["metric"] == "article_count")]
    count_map = dict(zip(counts["dimension_value"], counts["value"].astype(int)))

    trend = [
        {
            "week":          str(row["dimension_value"])[:10],
            "avg_sentiment": float(row["value"]),
            "article_count": count_map.get(row["dimension_value"], 0),
        }
        for _, row in rows.sort_values("dimension_value").iterrows()
    ]

    return {
        "partition_date": latest_partition_date(),
        "trend":          trend,
    }


@router.get("/entities")
def get_named_entities():
    """
    Return top restaurants, neighborhoods, and chefs extracted from article titles via NER.

    Response shape:
    {
      "partition_date": "2026-05-27",
      "restaurants":   [ { "name": "Le Bernardin", "mentions": 3 }, ... ],
      "neighborhoods": [ { "name": "Brooklyn", "mentions": 5 }, ... ],
      "chefs":         [ { "name": "Eric Ripert", "mentions": 2 }, ... ]
    }
    """
    df = _story_df()

    ne = df[df["aggregation"] == "named_entities"] if "named_entities" in df["aggregation"].values else df.iloc[0:0]

    def _top(entity_type: str, n: int = 5) -> list[dict]:
        rows = (
            ne[ne["dimension_value"] == entity_type]
            .sort_values("value", ascending=False)
            .head(n)
        )
        return [
            {"name": str(r["label"]), "mentions": int(r["value"])}
            for _, r in rows.iterrows()
        ]

    return {
        "partition_date": latest_partition_date(),
        "restaurants":    _top("restaurant"),
        "neighborhoods":  _top("neighborhood"),
        "chefs":          _top("chef"),
    }


@router.get("/summary")
def get_narrative_summary():
    """
    Return the key narrative figures that appear in the storytelling dashboard card.
    Designed for display in a Flutter widget without additional processing.

    Response shape:
    {
      "partition_date":   "2026-05-27",
      "top_keyword":      "ramen",
      "pct_positive":     68,
      "recipe_count":     39,
      "top_diet":         "Vegan"
    }
    """
    df = _story_df()

    try:
        top_keyword = (
            df[df["aggregation"] == "top_keywords"]
            .sort_values("value", ascending=False)
            .iloc[0]["label"]
        )
    except (IndexError, KeyError):
        top_keyword = None

    try:
        pct_row = df[
            (df["aggregation"] == "sentiment_distribution")
            & (df["dimension_value"].str.lower() == "positive")
            & (df["metric"] == "percentage")
        ]
        pct_positive = int(pct_row["value"].values[0]) if not pct_row.empty else 0
    except Exception:
        pct_positive = 0

    try:
        sc = df[df["aggregation"] == "source_comparison"]
        api_row = sc[(sc["dimension_value"] == "api_recipes") & (sc["metric"] == "record_count")]
        recipe_count = int(api_row["value"].values[0]) if not api_row.empty else 0
    except Exception:
        recipe_count = 0

    try:
        db = df[(df["aggregation"] == "dietary_breakdown") & (df["metric"] == "count")]
        top_diet = db.sort_values("value", ascending=False).iloc[0]["label"]
    except (IndexError, KeyError):
        top_diet = None

    return {
        "partition_date": latest_partition_date(),
        "top_keyword":    top_keyword,
        "pct_positive":   pct_positive,
        "recipe_count":   recipe_count,
        "top_diet":       top_diet,
    }
