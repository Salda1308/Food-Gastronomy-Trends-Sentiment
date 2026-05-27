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
    limit: int = Query(20, ge=1, le=100),
    cuisine: str | None = Query(None, description="Filter by cuisine (e.g. italian, japanese)"),
    diet: str | None = Query(None, description="Filter by diet (e.g. vegan, glutenFree)"),
    max_minutes: int | None = Query(None, description="Max readyInMinutes"),
):
    """
    Return recipe suggestions from the Gold layer.

    Optional filters:
    - `cuisine` — partial match against the cuisines field
    - `diet`    — one of: vegetarian, vegan, glutenFree, dairyFree
    - `max_minutes` — maximum preparation time

    Results are ranked by spoonacularScore descending.
    """
    df = _load_recipes()

    if cuisine:
        df = df[df["cuisines"].str.lower().str.contains(cuisine.lower(), na=False)]

    if diet and diet in df.columns:
        df = df[df[diet] == True]

    if max_minutes and "readyInMinutes" in df.columns:
        df = df[df["readyInMinutes"].apply(
            lambda x: isinstance(x, (int, float)) and x <= max_minutes
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
