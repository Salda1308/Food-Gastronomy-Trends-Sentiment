from __future__ import annotations
import argparse
import html
import json
import re
import shutil
from pathlib import Path
from typing import Iterable
import pandas as pd

from scripts.utils import latest_date_dir, today_output_dir

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

# Domain-specific stop words for the NYC food/gastronomy corpus.
# These are high-frequency terms that carry no sentiment signal in this dataset
# (every article and recipe is already known to be NYC-focused and food-related).
FOOD_NYC_STOP_WORDS: set[str] = {
    "eater", "eaterland", "nyc", "ny",
    "recipe", "recipes",
    "restaurant", "restaurants",
    "new york", "york",   # "new" kept — can carry sentiment ("new opening")
}


def organize_raw_files(base_dir: Path) -> tuple[list[Path], list[Path]]:
    """
    Locates Bronze JSON files in the latest date-partitioned subdirectory of
    bronze/api/ and bronze/webscraping/.  base_dir should be /opt/airflow/datalake.
    """
    api_bronze_base = base_dir / "bronze" / "api"
    web_bronze_base = base_dir / "bronze" / "webscraping"

    api_bronze_base.mkdir(parents=True, exist_ok=True)
    web_bronze_base.mkdir(parents=True, exist_ok=True)

    api_files = sorted(latest_date_dir(api_bronze_base).glob("*.json"))
    web_files = sorted(latest_date_dir(web_bronze_base).glob("*.json"))

    return api_files, web_files


def _dedupe_paths(paths: Iterable[Path]) -> list[Path]:
    seen: set[Path] = set()
    deduped: list[Path] = []
    for p in paths:
        if p not in seen:
            deduped.append(p)
            seen.add(p)
    return deduped


def flatten_list_columns(df: pd.DataFrame) -> pd.DataFrame:
    for col in df.columns:
        if not df[col].empty:
            has_list = df[col].apply(lambda x: isinstance(x, list)).any()
            if has_list:
                df[col] = df[col].apply(
                    lambda x: ", ".join(map(str, x)) if isinstance(x, list) else x
                )
    return df


def strip_html_tags(text: str) -> str:
    if not isinstance(text, str):
        return ""
    decoded = html.unescape(text)
    if BeautifulSoup is not None:
        return BeautifulSoup(decoded, "html.parser").get_text(" ", strip=True)
    return re.sub(r"<[^>]+>", " ", decoded).strip()


def remove_photo_attribution(text: str) -> str:
    """
    Eater NY articles prepend an image caption + photographer credit before the
    article body using the pattern:
        "[Caption sentence]. | Photographer Name Article text starts here…"
    This function strips everything up to and including the attribution, leaving
    only the real article content. Only applied when the pipe pattern appears
    within the first 300 characters (to avoid false positives deeper in text).
    """
    match = re.match(r'^.{0,300}? \| \S+(?:\s\S+){0,2} (?=[A-Z])', text)
    if match:
        return text[match.end():]
    return text


def get_english_stopwords() -> set[str]:
    import nltk
    from nltk.corpus import stopwords
    try:
        return set(stopwords.words("english"))
    except LookupError:
        nltk.download("stopwords", quiet=True)
        return set(stopwords.words("english"))


def clean_nlp_text(text: str, stop_words: set[str]) -> str:
    """
    Full NLP cleaning pipeline:
      1. Decode HTML entities (&#8217; → ')
      2. Remove URLs
      3. Lowercase
      4. Strip punctuation
      5. Normalize whitespace
      6. Remove stopwords, single-character tokens, and pure-numeric tokens
    """
    if not isinstance(text, str):
        return ""
    decoded = html.unescape(text)
    no_urls = re.sub(r"https?://\S+|www\.\S+", " ", decoded)
    lowered = no_urls.lower()
    no_punct = re.sub(r"[^\w\s]", " ", lowered)
    normalized = re.sub(r"\s+", " ", no_punct).strip()
    tokens = [
        tok for tok in normalized.split()
        if tok not in stop_words
        and len(tok) > 1          # drop single-character leftovers (e.g. "p" from "6 p.m.")
        and not tok.isdigit()     # drop pure numeric tokens
    ]
    return " ".join(tokens)


def _extract_ingredient_names(ingredients) -> str:
    """Convert extendedIngredients list-of-dicts → comma-separated ingredient names."""
    if not isinstance(ingredients, list):
        return ""
    return ", ".join(
        str(i.get("name", "")).strip()
        for i in ingredients
        if isinstance(i, dict) and i.get("name")
    )


def _extract_instructions_text(instructions) -> str:
    """Convert analyzedInstructions list-of-blocks → plain-text steps joined by space."""
    if not isinstance(instructions, list) or not instructions:
        return ""
    steps = []
    for block in instructions:
        if isinstance(block, dict):
            for step in block.get("steps", []):
                if isinstance(step, dict) and step.get("step"):
                    steps.append(step["step"].strip())
    return " ".join(steps)


def preprocess_api_file(file_path: Path, output_dir: Path) -> Path | None:
    with file_path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    rows = payload.get("results", [])
    if not rows:
        return None

    df = pd.DataFrame(rows)

    # Coerce time columns: use nullable Int32 so -1 sentinel is never introduced.
    # preparationMinutes and cookingMinutes are frequently null in the Spoonacular
    # API (only populated when the source recipe breaks them out separately).
    # readyInMinutes is the reliable total-time field.
    for col in ["preparationMinutes", "cookingMinutes"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int32")

    # Extract structured columns before generic flattening — flatten_list_columns
    # would otherwise serialize dicts as ugly str(dict) output.
    if "extendedIngredients" in df.columns:
        df["ingredient_names"] = df["extendedIngredients"].apply(_extract_ingredient_names)

    if "analyzedInstructions" in df.columns:
        df["instructions_text"] = df["analyzedInstructions"].apply(_extract_instructions_text)

    df = flatten_list_columns(df)

    if "summary" in df.columns:
        df["summary"] = df["summary"].astype(str).apply(strip_html_tags)

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{file_path.stem}.parquet"
    df.to_parquet(output_path, index=False)
    return output_path


def preprocess_webscraping_file(
    file_path: Path, output_dir: Path, stop_words: set[str]
) -> Path | None:
    with file_path.open("r", encoding="utf-8") as f:
        rows = json.load(f)

    df = pd.DataFrame(rows)

    # Decode HTML entities in title (e.g. &#8217; → curly apostrophe)
    if "article_title" in df.columns:
        df["article_title"] = df["article_title"].astype(str).apply(html.unescape)

    if "article_summary" in df.columns:
        # Clean summary: strip attribution prefix first, then full NLP pipeline
        df["article_summary_clean"] = df["article_summary"].astype(str).apply(
            lambda t: clean_nlp_text(remove_photo_attribution(t), stop_words)
        )

    # Clean title for NLP use (stored separately; raw title preserved above)
    if "article_title" in df.columns:
        df["article_title_clean"] = df["article_title"].astype(str).apply(
            lambda t: clean_nlp_text(t, stop_words)
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{file_path.stem}.parquet"
    df.to_parquet(output_path, index=False)
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Procesamiento Capa Silver")
    parser.add_argument("--base-dir", default="/opt/airflow/datalake", help="Datalake root")
    args, unknown = parser.parse_known_args()

    base_dir = Path(args.base_dir).resolve()

    api_files, web_files = organize_raw_files(base_dir)

    api_output_dir = today_output_dir(base_dir / "silver" / "api")
    web_output_dir = today_output_dir(base_dir / "silver" / "webscraping")

    # --- API layer ---
    print(f"Procesando {len(api_files)} archivos de API...")
    for path in api_files:
        out = preprocess_api_file(path, api_output_dir)
        if out:
            print(f"- Creado: {out.name}")
        else:
            print(f"- Saltado (sin resultados): {path.name}")

    # --- Web scraping layer ---
    # Process each file independently, then merge + deduplicate across files by
    # article_id to prevent duplicate rows from back-to-back RSS fetches that
    # captured the same articles.
    stop_words = get_english_stopwords() | FOOD_NYC_STOP_WORDS
    print(f"Procesando {len(web_files)} archivos de WebScraping...")

    web_frames: list[pd.DataFrame] = []
    for path in web_files:
        with path.open("r", encoding="utf-8") as f:
            rows = json.load(f)
        web_frames.append(pd.DataFrame(rows).assign(_source_file=path.name))

    if web_frames:
        combined = pd.concat(web_frames, ignore_index=True)
        before = len(combined)

        # Keep first occurrence of each article_id across all files
        if "article_id" in combined.columns:
            combined = combined.drop_duplicates(subset="article_id", keep="first")
        after = len(combined)
        if before != after:
            print(f"  Deduplicados {before - after} artículos duplicados entre archivos.")

        combined = combined.drop(columns=["_source_file"], errors="ignore")

        # Decode HTML entities in title
        if "article_title" in combined.columns:
            combined["article_title"] = combined["article_title"].astype(str).apply(html.unescape)

        # NLP cleaning
        if "article_summary" in combined.columns:
            combined["article_summary_clean"] = combined["article_summary"].astype(str).apply(
                lambda t: clean_nlp_text(remove_photo_attribution(t), stop_words)
            )
        if "article_title" in combined.columns:
            combined["article_title_clean"] = combined["article_title"].astype(str).apply(
                lambda t: clean_nlp_text(t, stop_words)
            )

        web_output_dir.mkdir(parents=True, exist_ok=True)
        # Write a single deduplicated parquet named after the latest source file
        latest_stem = sorted(web_files)[-1].stem
        out_path = web_output_dir / f"{latest_stem}_deduped.parquet"
        combined.to_parquet(out_path, index=False)
        print(f"- Creado: {out_path.name}  ({len(combined)} artículos únicos)")


def preprocess_web_only(base_dir_str: str = "/opt/airflow/datalake") -> None:
    """
    Process ONLY Bronze webscraping JSONs → Silver webscraping Parquet.
    Called by Step 2 of the sequential pipeline (clean_eater_ny task).
    """
    base_dir    = Path(base_dir_str).resolve()
    _, web_files = organize_raw_files(base_dir)
    web_output_dir = today_output_dir(base_dir / "silver" / "webscraping")
    stop_words     = get_english_stopwords() | FOOD_NYC_STOP_WORDS

    print(f"[silver/web] Processing {len(web_files)} Bronze webscraping files…")
    if not web_files:
        print("[silver/web] No Bronze webscraping files found — nothing to do.")
        return

    web_frames: list[pd.DataFrame] = []
    for path in web_files:
        with path.open("r", encoding="utf-8") as f:
            rows = json.load(f)
        web_frames.append(pd.DataFrame(rows).assign(_source_file=path.name))

    combined = pd.concat(web_frames, ignore_index=True)
    if "article_id" in combined.columns:
        before   = len(combined)
        combined = combined.drop_duplicates(subset="article_id", keep="first")
        dropped  = before - len(combined)
        if dropped:
            print(f"[silver/web] Deduplicated {dropped} duplicate articles.")

    combined = combined.drop(columns=["_source_file"], errors="ignore")

    if "article_title" in combined.columns:
        combined["article_title"] = combined["article_title"].astype(str).apply(html.unescape)

    if "article_summary" in combined.columns:
        combined["article_summary_clean"] = combined["article_summary"].astype(str).apply(
            lambda t: clean_nlp_text(remove_photo_attribution(t), stop_words)
        )
    if "article_title" in combined.columns:
        combined["article_title_clean"] = combined["article_title"].astype(str).apply(
            lambda t: clean_nlp_text(t, stop_words)
        )

    latest_stem = sorted(web_files)[-1].stem
    out_path    = web_output_dir / f"{latest_stem}_deduped.parquet"
    combined.to_parquet(out_path, index=False)
    print(f"[silver/web] Written: {out_path.name}  ({len(combined)} unique articles)")


def preprocess_api_only(base_dir_str: str = "/opt/airflow/datalake") -> None:
    """
    Process ONLY Bronze API JSONs → Silver API Parquet.
    Called by Step 5 of the sequential pipeline (clean_recipes task).
    """
    base_dir       = Path(base_dir_str).resolve()
    api_files, _   = organize_raw_files(base_dir)
    api_output_dir = today_output_dir(base_dir / "silver" / "api")

    print(f"[silver/api] Processing {len(api_files)} Bronze API files…")
    if not api_files:
        print("[silver/api] No Bronze API files found — nothing to do.")
        return

    for path in api_files:
        out = preprocess_api_file(path, api_output_dir)
        if out:
            print(f"[silver/api] Written: {out.name}")
        else:
            print(f"[silver/api] Skipped (no results): {path.name}")


if __name__ == "__main__":
    main()
