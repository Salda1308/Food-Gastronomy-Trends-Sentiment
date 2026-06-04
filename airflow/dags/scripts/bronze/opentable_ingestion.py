"""
OpenTable review scraper — sesión automática vía Playwright.

Flujo:
  1. get_session()          → Chromium headless navega a OpenTable,
                              intercepta el GQL request y extrae cookie + csrf frescos.
  2. discover_restaurants() → busca top restaurantes NYC y devuelve (id, slug).
  3. fetch_reviews()        → pagina la API GraphQL con esas credenciales.
  4. main()                 → orquesta todo y guarda en bronze/opentable/.
"""

import json
import os
import time
from datetime import datetime
from pathlib import Path

import requests
from playwright.sync_api import sync_playwright

from scripts.utils import today_output_dir

GQL_URL = "https://www.opentable.com/dapi/fe/gql?optype=query&opname=ReviewSearchResults"
PERSISTED_HASH = "a544a8bb7070a1aa6c5e50b3f9bb239ba44f442eb9ac628f30b57bd3ae098b27"

PAGES_PER_RESTAURANT = 5
PAGE_SIZE = 10
SESSION_ANCHOR = "brooklyn-chop-house-new-york"

FALLBACK_RESTAURANTS = [
    (1017331, "brooklyn-chop-house-new-york"),
    (76272,   "le-bernardin-new-york"),
    (78436,   "gramercy-tavern-new-york"),
    (3316,    "the-modern-new-york"),
    (64507,   "daniel-new-york"),
    (5308,    "per-se-new-york"),
    (37783,   "eleven-madison-park-new-york"),
    (188978,  "nobu-fifty-seven-new-york"),
    (60738,   "the-river-cafe-brooklyn"),
    (54867,   "jungsik-new-york"),
]

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/148.0.0.0 Safari/537.36"
)


def get_session() -> tuple[str, str]:
    captured: dict = {}

    with sync_playwright() as p:
        browser = p.firefox.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
            timezone_id="America/New_York",
            extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
        )
        page = context.new_page()

        def on_request(request):
            if "ReviewSearchResults" in request.url and not captured:
                captured["cookie"] = request.headers.get("cookie", "")
                captured["csrf"]   = request.headers.get("x-csrf-token", "")

        page.on("request", on_request)
        page.goto(
            f"https://www.opentable.com/r/{SESSION_ANCHOR}",
            wait_until="domcontentloaded",
            timeout=60_000,
        )
        for _ in range(4):
            page.evaluate("window.scrollBy(0, 800)")
            page.wait_for_timeout(800)

        if not captured.get("cookie"):
            cookies = context.cookies()
            captured["cookie"] = "; ".join(f"{c['name']}={c['value']}" for c in cookies)

        browser.close()

    cookie = captured.get("cookie", "")
    csrf   = captured.get("csrf", "")
    if not cookie:
        raise RuntimeError("No se pudo obtener sesión de OpenTable")
    return cookie, csrf


def discover_restaurants(cookie: str, csrf: str, limit: int = 20) -> list[tuple[int, str]]:
    found: list[tuple[int, str]] = []
    try:
        with sync_playwright() as p:
            browser = p.firefox.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1920, "height": 1080},
                locale="en-US",
                timezone_id="America/New_York",
            )
            page = context.new_page()

            def on_response(response):
                if "restaurantSearch" in response.url or "RestaurantSearch" in response.url:
                    try:
                        data    = response.json()
                        results = (
                            data.get("data", {})
                            .get("restaurantSearchResults", {})
                            .get("searchResults", [])
                        )
                        for r in results:
                            rid  = r.get("restaurant", {}).get("id")
                            slug = r.get("restaurant", {}).get("urlSlug", "")
                            if rid and slug and len(found) < limit:
                                found.append((rid, slug))
                    except Exception:
                        pass

            page.on("response", on_response)
            page.goto(
                "https://www.opentable.com/s?covers=2&dateTime=2026-06-03T19%3A00"
                "&metroId=13&regionIds[]=9&term=&corrid=discover",
                wait_until="domcontentloaded",
                timeout=60_000,
            )
            for _ in range(6):
                page.evaluate("window.scrollBy(0, 600)")
                page.wait_for_timeout(700)
            browser.close()
    except Exception as e:
        print(f"Descubrimiento dinámico falló ({e}) — usando lista de respaldo")

    if not found:
        print("Usando restaurantes de respaldo")
        return FALLBACK_RESTAURANTS

    print(f"Restaurantes descubiertos: {len(found)}")
    return found


def _headers(cookie: str, csrf: str) -> dict:
    return {
        "accept": "*/*",
        "content-type": "application/json",
        "cookie": cookie,
        "origin": "https://www.opentable.com",
        "ot-page-group": "rest-profile",
        "ot-page-type": "restprofilepage",
        "user-agent": USER_AGENT,
        "x-csrf-token": csrf,
        "x-query-timeout": "150",
    }


def fetch_reviews(restaurant_id: int, cookie: str, csrf: str) -> list:
    headers = _headers(cookie, csrf)
    reviews = []
    for page in range(1, PAGES_PER_RESTAURANT + 1):
        payload = {
            "operationName": "ReviewSearchResults",
            "extensions": {
                "persistedQuery": {"version": 1, "sha256Hash": PERSISTED_HASH}
            },
            "variables": {
                "prioritiseUserLanguage": False,
                "gpid": 0,
                "restaurantId": restaurant_id,
                "page": page,
                "pageSize": PAGE_SIZE,
                "highlightFormat": "index",
                "searchTerm": "",
                "sortBy": "newestReview",
            },
        }
        try:
            resp = requests.post(GQL_URL, headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            body = resp.json() or {}
            batch = (
                body
                .get("data") or {}
            ).get("restaurant") or {}
            batch = (batch.get("reviewSearchResults") or {}).get("reviews") or []
            if not batch:
                break
            reviews.extend(batch)
            time.sleep(1)
        except requests.HTTPError as e:
            print(f"  HTTP {e.response.status_code} en página {page} — deteniendo")
            break
        except Exception as e:
            print(f"  Error en página {page}: {e}")
            break
    return reviews


def main(base_dir: str = "/opt/airflow/datalake"):
    out_dir = str(today_output_dir(Path(f"{base_dir}/bronze/opentable")))
    os.makedirs(out_dir, exist_ok=True)

    print("Obteniendo sesión OpenTable...")
    cookie, csrf = get_session()

    print("Descubriendo restaurantes NYC...")
    restaurants = discover_restaurants(cookie, csrf)

    total = 0
    for restaurant_id, slug in restaurants:
        print(f"Fetching: {slug} (id={restaurant_id})")
        reviews = fetch_reviews(restaurant_id, cookie, csrf)
        if not reviews:
            print("  Sin reseñas — saltando")
            continue

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        out_path = os.path.join(out_dir, f"{slug}_{ts}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "source": "OpenTable",
                    "restaurant_id": restaurant_id,
                    "slug": slug,
                    "fetched_at": datetime.now().isoformat(),
                    "reviews": reviews,
                },
                f,
                ensure_ascii=False,
                indent=2,
            )
        print(f"  {len(reviews)} reseñas → {out_path}")
        total += len(reviews)

    print(f"OpenTable ingestion completa — {total} reseñas totales")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-dir", default="/opt/airflow/datalake")
    args = parser.parse_args()
    main(args.base_dir)
