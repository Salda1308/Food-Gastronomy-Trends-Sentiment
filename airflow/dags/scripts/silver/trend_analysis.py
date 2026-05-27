"""
Trend keyword extraction from Silver webscraping layer.

Reads the cleaned article text produced by the Silver preprocessing step and
returns the top-N food-relevant keywords by TF-IDF score.  These keywords are
passed directly to the Spoonacular API search in the next pipeline step.

How food detection works — hybrid approach
------------------------------------------
General English word vectors (spaCy en_core_web_md) can tell that "pizza" and
"burger" are similar to other food words, but they struggle with:
  - Cuisine names:  "indian", "japanese" → model knows geography, not food
  - Rare/exotic terms: "birria", "khachapuri", "omakase" → weak or no vector

The hybrid approach combines two complementary checks:

  1. Semantic similarity to a food anchor vector
     The anchor is the average of 30+ representative food seed words.
     Any token with cosine similarity > FOOD_THRESHOLD passes.
     Catches: pizza, sushi, chicken, burger, wine, tiramisu, cocktail...

  2. CUISINE_VOCAB membership (~30 terms)
     A small curated list for culinary concepts that vectors miss.
     Catches: indian, omakase, birria, vegan, tasting...

This replaces the ~200-word manual FOOD_VOCAB from the previous version,
reducing manual maintenance by ~87% while improving coverage of exotic terms.

The is_food_token() function is exported and reused by spark_storytelling.py
so both the API keyword step and the dashboard keyword step use identical logic.
"""
from __future__ import annotations
import re
from pathlib import Path

import numpy as np

from scripts.utils import latest_date_dir

_SILVER_WEB_BASE = Path("/opt/airflow/datalake/silver/webscraping")
_MIN_FOOD_RESULTS = 3
FOOD_THRESHOLD    = 0.35   # cosine similarity cutoff (tuned on NYC food corpus)

# Seed words that define the "food" vector space.  Deliberately diverse:
# ingredients, dishes, beverages, cooking methods, and cuisine names so the
# anchor vector sits near the centre of the gastronomy concept space.
_FOOD_SEEDS: list[str] = [
    "pizza", "pasta", "sushi", "chicken", "wine", "steak", "burger",
    "dessert", "cuisine", "ingredient", "seafood", "spice", "cocktail",
    "cheese", "ramen", "taco", "salmon", "mushroom", "chocolate", "coffee",
    "italian", "japanese", "french", "mexican", "thai", "korean",
    "culinary", "gastronomy", "dish", "recipe", "flavor", "cook",
]

# Small supplemental list for culinary terms whose general-English word vectors
# don't land close enough to the food anchor (tested at FOOD_THRESHOLD = 0.35).
# Cuisine names ("indian", "japanese") and Japanese culinary concepts ("omakase")
# are the main categories that need this fallback.
CUISINE_VOCAB: set[str] = {
    # cuisine names
    "italian", "japanese", "mexican", "french", "chinese", "korean",
    "thai", "indian", "greek", "spanish", "peruvian", "lebanese",
    "vietnamese", "ethiopian", "moroccan", "turkish", "caribbean",
    "mediterranean", "latin", "american",
    # culinary concepts with weak vectors
    "omakase", "kaiseki", "izakaya", "tapas", "mezze",
    "birria", "khachapuri", "tiradito",
    "vegan", "vegetarian", "brunch", "tasting",
}

# Module-level cache — model loads once per process, not per call.
_nlp        = None
_food_vec   = None   # pre-computed normalised food anchor vector


def _load_food_filter() -> tuple:
    """Lazily load en_core_web_md and compute the food anchor vector."""
    global _nlp, _food_vec
    if _nlp is None:
        import spacy
        _nlp = spacy.load("en_core_web_md")
        vecs = [_nlp(w).vector for w in _FOOD_SEEDS if _nlp(w).has_vector]
        avg  = np.mean(vecs, axis=0)
        _food_vec = avg / (np.linalg.norm(avg) + 1e-8)
    return _nlp, _food_vec


def is_food_token(token_text: str) -> bool:
    """
    Return True if token_text is likely a food-related term.

    Check 1 — CUISINE_VOCAB: catches cuisine names and culinary concepts whose
    general-English vectors don't reflect food context.

    Check 2 — Cosine similarity to food anchor vector: catches ingredients,
    dishes, beverages, and cooking terms not in CUISINE_VOCAB.
    """
    if token_text.lower() in CUISINE_VOCAB:
        return True
    nlp, food_vec = _load_food_filter()
    doc = nlp(token_text)
    if not doc or not doc[0].has_vector:
        return False
    v     = doc[0].vector
    v_norm = v / (np.linalg.norm(v) + 1e-8)
    return float(np.dot(v_norm, food_vec)) > FOOD_THRESHOLD


def extract_trending_keywords(top_n: int = 10) -> list[str]:
    """
    Return the top_n most food-relevant keywords from Silver articles.

    Pipeline:
      1. TF-IDF over article_summary_clean + article_title_clean
         → ranks tokens by how distinctive they are in THIS batch
      2. is_food_token() filter
         → keeps only gastronomy-relevant terms
      3. Fallback to frequency ranking if fewer than _MIN_FOOD_RESULTS pass
    """
    import pandas as pd
    from sklearn.feature_extraction.text import TfidfVectorizer

    silver_web = latest_date_dir(_SILVER_WEB_BASE)
    files      = sorted(silver_web.glob("*.parquet"))
    if not files:
        raise FileNotFoundError(
            f"No Silver webscraping Parquet files in {silver_web}. "
            "Run the Eater NY cleaning step first."
        )

    frames = [pd.read_parquet(f) for f in files]
    df     = pd.concat(frames, ignore_index=True)
    if "article_id" in df.columns:
        df = df.drop_duplicates(subset="article_id")

    text_cols = [c for c in ("article_summary_clean", "article_title_clean") if c in df.columns]
    if not text_cols:
        raise ValueError(
            "Silver webscraping Parquet has no NLP-cleaned text columns. "
            "Re-run the cleaning step."
        )

    docs = df[text_cols].fillna("").apply(lambda r: " ".join(r), axis=1).tolist()
    docs = [d for d in docs if d.strip()]
    if not docs:
        return []

    vectorizer   = TfidfVectorizer(max_features=500, ngram_range=(1, 1), min_df=1)
    tfidf_matrix = vectorizer.fit_transform(docs)
    feature_names = vectorizer.get_feature_names_out()
    mean_scores   = np.asarray(tfidf_matrix.mean(axis=0)).flatten()
    top_indices   = mean_scores.argsort()[::-1]

    food_keywords = [
        feature_names[i] for i in top_indices
        if is_food_token(feature_names[i])
    ][:top_n]

    if len(food_keywords) >= _MIN_FOOD_RESULTS:
        keywords = food_keywords
        print(f"[trend_analysis] TF-IDF + vectors: {len(keywords)} food keywords "
              f"from {len(df)} articles:")
    else:
        from collections import Counter
        all_tokens = " ".join(docs).split()
        counter    = Counter(t for t in all_tokens if is_food_token(t))
        keywords   = [w for w, _ in counter.most_common(top_n)]
        print(f"[trend_analysis] TF-IDF found only {len(food_keywords)} matches "
              f"— falling back to frequency ranking:")

    scores = dict(zip(feature_names, mean_scores))
    for rank, kw in enumerate(keywords, 1):
        print(f"  {rank:2d}. {kw}  (tfidf={scores.get(kw, 0):.4f})")

    return keywords


def extract_named_entities(df=None) -> dict[str, list[tuple[str, int]]]:
    """
    Run spaCy NER (en_core_web_md) on raw article titles and summaries.

    Returns:
      restaurant   ← ORG entities
      neighborhood ← GPE / LOC entities
      chef         ← PERSON entities
    """
    import pandas as pd
    import spacy
    from collections import Counter

    if df is None:
        silver_web = latest_date_dir(_SILVER_WEB_BASE)
        files      = sorted(silver_web.glob("*.parquet"))
        if not files:
            return {"restaurant": [], "neighborhood": [], "chef": []}
        frames = [pd.read_parquet(f) for f in files]
        df     = pd.concat(frames, ignore_index=True)
        if "article_id" in df.columns:
            df = df.drop_duplicates(subset="article_id")

    # Use medium model so NER benefits from same model already loaded for vectors.
    nlp = spacy.load("en_core_web_md")

    restaurants:   Counter = Counter()
    neighborhoods: Counter = Counter()
    chefs:         Counter = Counter()

    for _, row in df.iterrows():
        title   = str(row.get("article_title", "") or "")
        summary = str(row.get("article_summary", "") or "")[:1000]
        doc     = nlp(f"{title}. {summary}")
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

    return {
        "restaurant":   restaurants.most_common(10),
        "neighborhood": neighborhoods.most_common(10),
        "chef":         chefs.most_common(10),
    }


if __name__ == "__main__":
    print("Keywords:", extract_trending_keywords())
    print("\nEntities:", extract_named_entities())
