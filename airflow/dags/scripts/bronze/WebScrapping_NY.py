import requests
import xml.etree.ElementTree as ET
import json
import os
from datetime import datetime
from pathlib import Path
import re
import time

from scripts.utils import today_output_dir


# Definimos la función main para que Airflow la pueda llamar
def main():
    SCRAPING_RESPONSE_DIR = str(today_output_dir(Path("/opt/airflow/datalake/bronze/webscraping")))

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    topic = "nycfoodtrends"
    rss_url = "https://ny.eater.com/rss/index.xml"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }

    NAMESPACES = {
        'atom': 'http://www.w3.org/2005/Atom',
        'content': 'http://purl.org/rss/1.0/modules/content/',
        'dc': 'http://purl.org/dc/elements/1.1/'
    }

    def get_text(item, path, default=""):
        node = item.find(path, NAMESPACES)
        if node is None or node.text is None:
            return default
        return node.text.strip()

    def clean_html(raw_html):
        if raw_html is None:
            return ""
        cleanr = re.compile('<.*?>')
        cleantext = re.sub(cleanr, '', str(raw_html))
        cleantext = re.sub(r'\s+', ' ', cleantext)
        return cleantext.strip()

    try:
        print(f"Iniciando conexión a: {rss_url}")
        time.sleep(1)
        response = requests.get(rss_url, headers=headers, timeout=30)
        response.raise_for_status()
        
        root = ET.fromstring(response.content)
        food_articles = []
        is_atom = root.tag.endswith('feed')

        if is_atom:
            entries = root.findall('atom:entry', NAMESPACES)
            print(f"Entries found in Atom feed: {len(entries)}")
            for entry in entries:
                title = get_text(entry, 'atom:title', 'Untitled')
                guid = get_text(entry, 'atom:id', '')
                author = get_text(entry, 'atom:author/atom:name', '')
                published_date = get_text(entry, 'atom:published', '') or get_text(entry, 'atom:updated', '')
                
                link = ''
                for ln in entry.findall('atom:link', NAMESPACES):
                    if ln.get('rel') in (None, '', 'alternate'):
                        link = ln.get('href', '')
                        break

                raw_summary = get_text(entry, 'atom:content', '') or get_text(entry, 'atom:summary', '')
                clean_summary = clean_html(raw_summary)

                categories = []
                for cat in entry.findall('atom:category', NAMESPACES):
                    term = cat.get('term')
                    if term: categories.append(term.strip())

                food_articles.append({
                    "source": "Eater NY (Atom)",
                    "article_title": title,
                    "article_url": link,
                    "article_id": guid,
                    "author": author,
                    "article_summary": clean_summary,
                    "categories": categories,
                    "location_focus": "New York City",
                    "published_date": published_date,
                    "date_extracted": timestamp
                })
                if len(food_articles) >= 20: break
        else:
            items = root.findall('./channel/item')
            print(f"Items found in RSS feed: {len(items)}")
            for item in items:
                title = get_text(item, 'title', 'Untitled')
                link = get_text(item, 'link', '')
                guid = get_text(item, 'guid', '')
                author = get_text(item, 'dc:creator', '')
                published_date = get_text(item, 'pubDate', '')
                raw_summary = get_text(item, 'content:encoded', '') or get_text(item, 'description', '')
                clean_summary = clean_html(raw_summary)
                
                categories = [cat.text.strip() for cat in item.findall('category') if cat.text]

                food_articles.append({
                    "source": "Eater NY (RSS)",
                    "article_title": title,
                    "article_url": link,
                    "article_id": guid,
                    "author": author,
                    "article_summary": clean_summary,
                    "categories": categories,
                    "location_focus": "New York City",
                    "published_date": published_date,
                    "date_extracted": timestamp
                })
                if len(food_articles) >= 20: break

        if len(food_articles) > 0:
            # Deduplicate: skip save if all article_ids already exist in a prior file
            new_ids = {a["article_id"] for a in food_articles}
            existing_files = sorted(
                [f for f in os.listdir(SCRAPING_RESPONSE_DIR) if f.endswith(".json")],
                reverse=True
            )
            for existing_file in existing_files:
                try:
                    with open(os.path.join(SCRAPING_RESPONSE_DIR, existing_file), encoding="utf-8") as ef:
                        existing_articles = json.load(ef)
                    existing_ids = {a.get("article_id") for a in existing_articles}
                    if new_ids == existing_ids:
                        print(f"Duplicate batch detected — all {len(new_ids)} article_ids already in '{existing_file}'. Skipping save.")
                        break
                except Exception:
                    continue
            else:
                filename = os.path.join(SCRAPING_RESPONSE_DIR, f"foodblog_{topic}_{timestamp}.json")
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(food_articles, f, indent=4, ensure_ascii=False)
                print(f"Successfully extracted {len(food_articles)} articles to {filename}")
        else:
            print("No articles found.")

    except Exception as e:
        print(f"Error while connecting to the feed: {e}")
        # Importante: lanzar la excepción para que Airflow sepa que falló
        raise e

# Esto permite que el script siga funcionando si lo corres manualmente
if __name__ == "__main__":
    main()