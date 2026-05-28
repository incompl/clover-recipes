#!/usr/bin/env python3
"""Scrape posts from the Clover Food Lab "recipes-menu" category into markdown."""

import html
import json
import pathlib
import re
import sys
import urllib.request

import html2text

SITE = "https://www.cloverfoodlab.com"

CATEGORY_ID = 51  # recipes-menu
API = f"https://www.cloverfoodlab.com/wp-json/wp/v2/posts?categories={CATEGORY_ID}&per_page=100"
ROOT = pathlib.Path(__file__).parent
OUT_DIR = ROOT / "recipes"
ASSETS_DIR = ROOT / "assets"
ASSET_RE = re.compile(
    r'https?://www\.cloverfoodlab\.com/wp-content/uploads/([^\s"\'<>)]+)'
)


def fetch_posts():
    posts = []
    page = 1
    while True:
        url = f"{API}&page={page}"
        req = urllib.request.Request(url, headers={"User-Agent": "clover-recipes-scraper/1.0"})
        with urllib.request.urlopen(req) as resp:
            total_pages = int(resp.headers.get("X-WP-TotalPages", "1"))
            posts.extend(json.loads(resp.read()))
        if page >= total_pages:
            break
        page += 1
    return posts


def absolutize(html_str):
    # Make src="/foo" and href="/foo" absolute against the site root.
    return re.sub(r'(src|href)="/(?!/)', rf'\1="{SITE}/', html_str)


def download_asset(rel_path):
    """Download an upload to assets/<rel_path>, return its local relative path."""
    dest = ASSETS_DIR / rel_path
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        url = f"{SITE}/wp-content/uploads/{rel_path}"
        req = urllib.request.Request(url, headers={"User-Agent": "clover-recipes-scraper/1.0"})
        try:
            with urllib.request.urlopen(req) as resp:
                dest.write_bytes(resp.read())
            print(f"    fetched {rel_path}", file=sys.stderr)
        except Exception as e:
            print(f"    SKIP {rel_path}: {e}", file=sys.stderr)
            return None
    # Markdown lives in recipes/, so reference assets via ../assets/
    return f"../assets/{rel_path}"


def localize_assets(html_str):
    def replace(match):
        rel = match.group(1)
        local = download_asset(rel)
        return local if local else match.group(0)
    return ASSET_RE.sub(replace, html_str)


def to_markdown(post):
    converter = html2text.HTML2Text()
    converter.body_width = 0
    converter.ignore_images = False

    title = html.unescape(post["title"]["rendered"])
    content = localize_assets(absolutize(post["content"]["rendered"]))
    body_md = converter.handle(content).strip()

    frontmatter = [
        "---",
        f'title: "{title.replace(chr(34), chr(92) + chr(34))}"',
        f'date: {post["date"][:10]}',
        f'slug: {post["slug"]}',
        f'url: {post["link"]}',
        "---",
        "",
    ]
    return "\n".join(frontmatter) + f"# {title}\n\n{body_md}\n"


def main():
    OUT_DIR.mkdir(exist_ok=True)
    ASSETS_DIR.mkdir(exist_ok=True)
    posts = fetch_posts()
    print(f"Fetched {len(posts)} posts", file=sys.stderr)
    for post in posts:
        path = OUT_DIR / f"{post['slug']}.md"
        path.write_text(to_markdown(post), encoding="utf-8")
        print(f"  wrote {path.name}", file=sys.stderr)


if __name__ == "__main__":
    main()
