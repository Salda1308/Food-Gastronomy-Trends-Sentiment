"""
Storytelling endpoints — expose sentiment, keywords, trends, and entities
from the Gold storytelling Parquet file.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.loader import load_storytelling, latest_partition_date, _read_parquet

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
    Return combined sentiment distribution (articles + OpenTable reviews) and avg compound score.

    Response shape:
    {
      "partition_date": "2026-05-27",
      "distribution": [
        { "label": "positive", "count": 45, "percentage": 72.0 },
        { "label": "negative", "count": 12, "percentage": 19.0 },
        { "label": "neutral",  "count": 6,  "percentage": 9.0  }
      ],
      "avg_compound_score": 0.312
    }
    """
    df = _story_df()

    # Accumulate counts from BOTH article sentiment and OpenTable review sentiment
    counts: dict[str, int] = {"positive": 0, "negative": 0, "neutral": 0}
    avgs: list[float] = []

    for agg_name in ("sentiment_distribution", "reviews_sentiment_distribution"):
        count_rows = df[(df["aggregation"] == agg_name) & (df["metric"] == "count")]
        for _, row in count_rows.iterrows():
            lbl = str(row["dimension_value"]).lower()
            if lbl in counts:
                counts[lbl] += int(row["value"])

        avg_row = df[(df["aggregation"] == agg_name) & (df["metric"] == "avg_compound_score")]
        if not avg_row.empty:
            avgs.append(float(avg_row["value"].values[0]))

    total = sum(counts.values())
    distribution = [
        {
            "label":      lbl,
            "count":      cnt,
            "percentage": round(cnt / total * 100, 2) if total > 0 else 0.0,
        }
        for lbl, cnt in counts.items()
        if total > 0  # skip empty labels only when there's no data at all
    ]

    avg_score = round(sum(avgs) / len(avgs), 4) if avgs else None

    return {
        "partition_date":     latest_partition_date(),
        "distribution":       distribution,
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
    Return sentiment breakdown per week over time.

    Response shape:
    {
      "partition_date": "2026-05-27",
      "trend": [
        {
          "week": "2026-05-20",
          "avg_sentiment": 0.31,
          "article_count": 8,
          "positive_pct": 72.5,
          "negative_pct": 12.5,
          "neutral_pct": 15.0
        },
        ...
      ]
    }
    """
    df = _story_df()
    st = df[df["aggregation"] == "sentiment_trend"]

    def _metric_map(metric: str) -> dict:
        rows = st[st["metric"] == metric]
        return dict(zip(rows["dimension_value"], rows["value"]))

    avg_map  = _metric_map("avg_sentiment")
    cnt_map  = _metric_map("article_count")
    pos_map  = _metric_map("positive_pct")
    neg_map  = _metric_map("negative_pct")
    neu_map  = _metric_map("neutral_pct")

    weeks = sorted(avg_map.keys())
    trend = [
        {
            "week":          str(w)[:10],
            "avg_sentiment": float(avg_map[w]),
            "article_count": int(cnt_map.get(w, 0)),
            "positive_pct":  float(pos_map.get(w, 0.0)),
            "negative_pct":  float(neg_map.get(w, 0.0)),
            "neutral_pct":   float(neu_map.get(w, 0.0)),
        }
        for w in weeks
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


@router.get("/sources")
def get_sources():
    """
    Return article and review counts with their titles/links for the data page.

    Response shape:
    {
      "articles": { "count": 10, "items": [{"title": "...", "url": "...", "published_date": "..."}] },
      "reviews":  { "count": 173, "by_restaurant": [{"restaurant": "...", "count": 50}] }
    }
    """
    articles_items = []
    reviews_by_restaurant = []
    reviews_count = 0

    try:
        art = _read_parquet("gold_articles_*.parquet")
        cols = [c for c in ("article_title", "article_url", "published_date", "source", "author") if c in art.columns]
        for _, row in art[cols].dropna(subset=["article_url"]).iterrows():
            articles_items.append({
                "title":          str(row.get("article_title", "")) or "Untitled",
                "url":            str(row.get("article_url",   "")),
                "published_date": str(row.get("published_date", ""))[:10],
                "source":         str(row.get("source", "Eater NY")),
            })
    except Exception:
        pass

    try:
        rev = _read_parquet("gold_reviews_*.parquet")
        reviews_count = len(rev)
        if "restaurant_slug" in rev.columns:
            for slug, grp in rev.groupby("restaurant_slug"):
                reviews_by_restaurant.append({
                    "restaurant": str(slug).replace("-", " ").title(),
                    "slug":       str(slug),
                    "count":      len(grp),
                })
            reviews_by_restaurant.sort(key=lambda x: x["count"], reverse=True)
    except Exception:
        pass

    return {
        "partition_date": latest_partition_date(),
        "articles": {
            "count": len(articles_items),
            "items": sorted(articles_items, key=lambda x: x["published_date"], reverse=True),
        },
        "reviews": {
            "count":           reviews_count,
            "by_restaurant":   reviews_by_restaurant,
        },
    }
