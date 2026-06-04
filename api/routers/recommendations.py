"""
Recipe recommendation endpoint.
Reads gold_recipes_*.parquet (deduplicated by Silver + Gold transform)
and returns only the fields needed to suggest dishes to the user.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from api.loader import _read_parquet, latest_partition_date

router = APIRouter()

_KEEP_COLS = [
    "id", "title", "image", "summary",
    "readyInMinutes", "servings", "pricePerServing",
    "cuisines", "dishTypes", "diets",
    "vegetarian", "vegan", "glutenFree", "dairyFree",
    "ingredient_names", "instructions_text",
    "spoonacularScore", "healthScore", "aggregateLikes",
    "sourceUrl",
]


def _load_recipes():
    try:
        df = _read_parquet("gold_recipes_*.parquet")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    present = [c for c in _KEEP_COLS if c in df.columns]
    return df[present].fillna("")


@router.get("/")
def get_recipes(
    limit: int = Query(50, ge=1, le=200),
    cuisine: str | None = Query(None, description="Partial match against cuisines field"),
    diet: str | None = Query(None, description="E.g. vegetarian, vegan, glutenFree, dairyFree, ketogenic, paleo"),
    max_minutes: int | None = Query(None, description="Max readyInMinutes"),
    maxReadyTime: int | None = Query(None, description="Alias for max_minutes (frontend compat)"),
    query: str | None = Query(None, description="Text search in title and ingredients"),
):
    """
    Return recipe suggestions from the Gold layer.

    - `cuisine`      — partial match against cuisines field
    - `diet`         — boolean columns (vegetarian, vegan, glutenFree, dairyFree)
                       OR partial match against the diets text field (ketogenic, paleo, etc.)
    - `max_minutes` / `maxReadyTime` — maximum preparation time (both accepted)
    - `query`        — text search in title and ingredient_names
    - `limit`        — default 50, max 200

    Results sorted by spoonacularScore descending.
    """
    df = _load_recipes()

    # Text search — title + ingredient names
    if query:
        q = query.lower()
        mask = (
            df["title"].str.lower().str.contains(q, na=False)
            | df.get("ingredient_names", df["title"]).str.lower().str.contains(q, na=False)
        )
        df = df[mask]

    # Cuisine filter
    if cuisine:
        df = df[df["cuisines"].str.lower().str.contains(cuisine.lower(), na=False)]

    # Diet filter — try boolean column first, then text search in diets field
    if diet:
        # Map common frontend values to column names
        _COL_MAP = {
            "gluten free": "glutenFree",
            "dairy free":  "dairyFree",
            "gluten-free": "glutenFree",
            "dairy-free":  "dairyFree",
        }
        col = _COL_MAP.get(diet.lower(), diet)
        if col in df.columns:
            df = df[df[col] == True]
        elif "diets" in df.columns:
            # Fallback: text search in the diets string column
            df = df[df["diets"].str.lower().str.contains(diet.lower(), na=False)]

    # Time filter — accept both parameter names
    minutes_limit = max_minutes or maxReadyTime
    if minutes_limit and "readyInMinutes" in df.columns:
        df = df[df["readyInMinutes"].apply(
            lambda x: isinstance(x, (int, float)) and x <= minutes_limit
        )]

    if "spoonacularScore" in df.columns:
        df = df.sort_values("spoonacularScore", ascending=False)

    return {
        "partition_date": latest_partition_date(),
        "total":          len(df),
        "recipes":        df.head(limit).to_dict(orient="records"),
    }


@router.get("/{recipe_id}")
def get_recipe(recipe_id: int):
    """
    Return a single recipe by its Spoonacular id.
    """
    df = _load_recipes()
    row = df[df["id"] == recipe_id]
    if row.empty:
        raise HTTPException(status_code=404, detail=f"Recipe {recipe_id} not found")
    return row.iloc[0].to_dict()
