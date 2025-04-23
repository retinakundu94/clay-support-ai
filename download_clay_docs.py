import os
import requests
from bs4 import BeautifulSoup
import re
import time

BASE_URL = "https://docs.clay.com"
START_URL = f"{BASE_URL}/docs"

def clean_filename(name):
    # Simple cleaning for filenames
    name = name.lower().strip()
    name = re.sub(r'[^a-z0-9_\-]', '_', name)
    name = re.sub(r'_{2,}', '_', name)
    return name[:40]  # keep filenames short

def get_article_links():
    resp = requests.get(START_URL)
    soup = BeautifulSoup(resp.text, "html.parser")
    # Find links under the sidebar menu
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("/docs/") and " " not in href:
            url = BASE_URL + href
            text = a.get_text(strip=True)
            links.append((text, url))
    # Remove duplicates by URL
    seen = set()
    unique_links = []
    for title, url in links:
        if url not in seen:
            seen.add(url)
            unique_links.append((title, url))
    return unique_links

def get_article_text(url):
    resp = requests.get(url)
    soup = BeautifulSoup(resp.text, "html.parser")
    # Find all <article> content (main doc)
    article = soup.find("article")
    if not article:
        return None
    # Get all paragraphs and headings
    texts = []
    for tag in article.find_all(["h1", "h2", "h3", "p", "li"]):
        line = tag.get_text(separator=" ", strip=True)
        if line:
            texts.append(line)
    return "\n".join(texts)

def main():
    os.makedirs("docs", exist_ok=True)
    links = get_article_links()
    print(f"Found {len(links)} doc pages. Downloading...")
    for title, url in links:
        print(f"Fetching: {title} -> {url}")
        text = get_article_text(url)
        if text:
            fname = clean_filename(title) + ".txt"
            path = os.path.join("docs", fname)
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"Saved to {path}")
        else:
            print(f"Failed to get text for {url}")
        time.sleep(0.8)  # be polite to the server

if __name__ == "__main__":
    main()
