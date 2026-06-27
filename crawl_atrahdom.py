from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urljoin, urlparse, urlunparse, urldefrag
from urllib.request import Request, build_opener
import json
import mimetypes
import os
import re
import time


START_URLS = [
    "https://atrahdom.org/",
    "https://atrahdom.org/category/blog/",
    "https://atrahdom.org/category/centro-de-documentacion-digital/",
    "https://atrahdom.org/category/publicaciones-propias/",
    "https://atrahdom.org/category/sitradomsa/",
]
DOMAIN = "atrahdom.org"
MAX_HTML_PAGES = int(os.environ.get("ATRAHDOM_MAX_HTML_PAGES", "2000"))
REQUEST_DELAY = float(os.environ.get("ATRAHDOM_REQUEST_DELAY", "0.2"))
CHECKPOINT_EVERY = int(os.environ.get("ATRAHDOM_CHECKPOINT_EVERY", "25"))
OUTPUT_DIR = Path("inventory")
DOWNLOAD_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".zip",
    ".mp3",
    ".mp4",
}
DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".zip"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
IGNORED_INTERNAL_PREFIXES = (
    "https://atrahdom.org/wp-login.php",
    "https://atrahdom.org/wp-admin/",
)


@dataclass
class FetchResult:
    original_url: str
    final_url: str
    status_code: int
    content_type: str
    body: str
    history: list[int]


class PageParser(HTMLParser):
    def __init__(self, page_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.page_url = page_url
        self.title = ""
        self.h1 = ""
        self.body_classes: list[str] = []
        self.canonical = ""
        self.published = ""
        self.modified = ""
        self.wordpress_user = ""
        self.links: list[dict[str, str]] = []
        self.images: list[dict[str, str]] = []
        self.embeds: list[dict[str, str]] = []
        self.categories: list[str] = []
        self.tags: list[str] = []
        self.visible_text: list[str] = []
        self.media_count = 0
        self._stack: list[dict[str, Any]] = []
        self._capture: str | None = None
        self._capture_attrs: dict[str, str] = {}
        self._capture_text: list[str] = []
        self._figure_caption = ""
        self._in_script_or_style = False

    def handle_starttag(self, tag: str, attrs_raw: list[tuple[str, str | None]]) -> None:
        attrs = {name.lower(): value or "" for name, value in attrs_raw}
        classes = attrs.get("class", "").split()
        self._stack.append({"tag": tag, "attrs": attrs, "text": []})
        if tag in {"script", "style", "noscript"}:
            self._in_script_or_style = True
        if tag == "body":
            self.body_classes = classes
        if tag == "title":
            self._start_capture("title", attrs)
        if tag == "h1" and not self.h1:
            self._start_capture("h1", attrs)
        if tag == "time" and attrs.get("datetime"):
            if "updated" in classes:
                self.modified = attrs["datetime"]
            elif not self.published:
                self.published = attrs["datetime"]
        if tag == "meta":
            prop = attrs.get("property", "") or attrs.get("name", "")
            if prop == "article:published_time":
                self.published = attrs.get("content", self.published)
            if prop == "article:modified_time":
                self.modified = attrs.get("content", self.modified)
            if prop == "date":
                self.published = attrs.get("content", self.published)
        if tag == "link" and attrs.get("rel") == "canonical" and attrs.get("href"):
            self.canonical = normalize_url(attrs["href"], self.page_url)
        if tag == "a" and attrs.get("href"):
            self._start_capture("a", attrs)
        if tag == "img" and attrs.get("src"):
            self.media_count += 1
            self.images.append(
                {
                    "src": normalize_url(attrs["src"], self.page_url),
                    "alt": attrs.get("alt", ""),
                    "title": attrs.get("title", ""),
                    "caption": self._figure_caption,
                }
            )
        if tag in {"iframe", "embed", "video", "audio"}:
            self.media_count += 1
            src = attrs.get("src") or attrs.get("data") or ""
            if src:
                self.embeds.append({"src": normalize_url(src, self.page_url), "title": attrs.get("title", ""), "tag": tag})
        if tag == "figcaption":
            self._start_capture("figcaption", attrs)

    def handle_endtag(self, tag: str) -> None:
        if self._capture == tag:
            text = clean_text(" ".join(self._capture_text))
            attrs = self._capture_attrs
            if tag == "title" and text:
                self.title = text
            elif tag == "h1" and text:
                self.h1 = text
            elif tag == "figcaption":
                self._figure_caption = text
            elif tag == "a":
                href = attrs.get("href", "")
                if href:
                    rel = attrs.get("rel", "")
                    klass = attrs.get("class", "")
                    ancestor_classes = " ".join(str(item["attrs"].get("class", "")) for item in self._stack)
                    absolute = normalize_url(href, self.page_url)
                    self.links.append({"url": absolute, "text": text, "rel": rel, "class": klass})
                    if "author" in rel or "author" in klass or "author" in ancestor_classes or "vcard" in ancestor_classes:
                        self.wordpress_user = self.wordpress_user or text
                    if "category" in rel:
                        add_unique(self.categories, text)
                    if "tag" in rel and "category" not in rel:
                        add_unique(self.tags, text)
            self._capture = None
            self._capture_attrs = {}
            self._capture_text = []
        if tag == "figure":
            self._figure_caption = ""
        if tag in {"script", "style", "noscript"}:
            self._in_script_or_style = False
        if self._stack:
            self._stack.pop()

    def handle_data(self, data: str) -> None:
        if self._in_script_or_style:
            return
        text = clean_text(data)
        if not text:
            return
        self.visible_text.append(text)
        if self._capture:
            self._capture_text.append(text)

    def _start_capture(self, tag: str, attrs: dict[str, str]) -> None:
        self._capture = tag
        self._capture_attrs = attrs
        self._capture_text = []


def add_unique(values: list[str], value: str) -> None:
    if value and value not in values:
        values.append(value)


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(value)).strip()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_url(url: str, base: str | None = None) -> str:
    joined = urljoin(base or "", url)
    joined, _fragment = urldefrag(joined)
    parsed = urlparse(joined)
    if parsed.scheme not in {"http", "https"}:
        return joined
    netloc = parsed.netloc.lower()
    if netloc == f"www.{DOMAIN}":
        netloc = DOMAIN
    path = re.sub(r"/{2,}", "/", parsed.path or "/")
    return urlunparse((parsed.scheme.lower(), netloc, path, "", parsed.query, ""))


def is_internal(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.netloc.lower().removeprefix("www.") == DOMAIN


def extension_for(url: str) -> str:
    return Path(urlparse(url).path).suffix.lower()


def looks_like_download(url: str) -> bool:
    return extension_for(url) in DOWNLOAD_EXTENSIONS


def should_skip_internal_html(url: str) -> bool:
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    return bool(query) or parsed.path.endswith("/trackback/")


def slug_for(url: str) -> str:
    path = urlparse(url).path.strip("/")
    if not path:
        return "inicio"
    return path.split("/")[-1] or path.replace("/", "-")


def text_hash(text: str) -> str:
    normalized = clean_text(text)
    return sha256(normalized.encode("utf-8")).hexdigest() if normalized else ""


def classify_html_url(url: str, parser: PageParser) -> str:
    body_classes = set(parser.body_classes)
    path = urlparse(url).path.strip("/")
    if not path:
        return "home"
    if "single-post" in body_classes:
        return "post"
    if "page" in body_classes and "home" not in body_classes:
        return "page"
    if "category" in body_classes or path.startswith("category/"):
        return "category"
    if "author" in body_classes or path.startswith("author/"):
        return "author_archive"
    if "tag" in body_classes or path.startswith("tag/"):
        return "tag_archive"
    if "attachment" in body_classes:
        return "attachment"
    if "date" in body_classes or re.match(r"^\d{4}(/\d{2})?(/\d{2})?/?$", path):
        return "date_archive"
    if "type" in body_classes or path.startswith("type/"):
        return "format_archive"
    return "html"


def platform_for(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if "youtube" in host or "youtu.be" in host:
        return "YouTube"
    if "slideshare" in host:
        return "SlideShare"
    if "scribd" in host:
        return "Scribd"
    if "facebook" in host:
        return "Facebook"
    if "twitter" in host or host == "x.com":
        return "Twitter/X"
    if "instagram" in host:
        return "Instagram"
    if "wordpress" in host or "wp.com" in host or "wp.me" in host:
        return "WordPress.com"
    if "ilo.org" in host:
        return "OIT/ILO"
    return host or "desconocido"


def fetch(opener: Any, url: str) -> FetchResult:
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; ATRAHDOM migration inventory/2.0; +https://atrahdom.org/)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    history: list[int] = []
    try:
        with opener.open(request, timeout=25) as response:
            raw = response.read()
            content_type = response.headers.get("content-type", "")
            charset = response.headers.get_content_charset() or "utf-8"
            body = raw.decode(charset, errors="replace") if "text/" in content_type or "html" in content_type else ""
            return FetchResult(url, normalize_url(response.geturl()), response.status, content_type, body, history)
    except HTTPError as exc:
        content_type = exc.headers.get("content-type", "") if exc.headers else ""
        raw = exc.read()
        body = raw.decode("utf-8", errors="replace") if raw else ""
        return FetchResult(url, normalize_url(exc.geturl() or url), exc.code, content_type, body, history)


def build_record(original_url: str, result: FetchResult, parser: PageParser | None, pagination_source: str) -> dict[str, Any]:
    content_type_label = "asset" if looks_like_download(result.final_url) else "unknown"
    title = ""
    publication_date = ""
    modified_date = ""
    wordpress_user = ""
    categories: list[str] = []
    tags: list[str] = []
    content_hash = ""
    media_count = 0
    attachment_count = 0
    canonical = ""

    if parser:
        title = parser.h1 or parser.title
        publication_date = parser.published
        modified_date = parser.modified
        wordpress_user = parser.wordpress_user
        categories = parser.categories
        tags = parser.tags
        content_hash = text_hash(" ".join(parser.visible_text))
        media_count = parser.media_count
        attachment_count = sum(1 for link in parser.links if looks_like_download(link["url"]))
        canonical = parser.canonical
        content_type_label = classify_html_url(result.final_url, parser)

    return {
        "original_url": normalize_url(original_url),
        "final_url": result.final_url,
        "status_code": result.status_code,
        "content_type": result.content_type,
        "type": content_type_label,
        "title": title,
        "slug": slug_for(result.final_url),
        "publication_date": publication_date,
        "modified_date": modified_date,
        "wordpress_user": wordpress_user,
        "internal_author": "",
        "categories": categories,
        "tags": tags,
        "parent": "",
        "pagination_source": pagination_source,
        "canonical_url": canonical,
        "content_hash": content_hash,
        "media_count": media_count,
        "attachment_count": attachment_count,
        "migration_status": "inventoried",
        "verification_status": "not_started",
    }


def media_record(source_page: str, raw_url: str, context: str, alt: str = "", caption: str = "") -> dict[str, Any]:
    url = normalize_url(raw_url, source_page)
    ext = extension_for(url)
    guessed_type = mimetypes.guess_type(urlparse(url).path)[0] or ""
    return {
        "original_url": url,
        "source_page": source_page,
        "type": "image" if ext in IMAGE_EXTENSIONS else "document" if ext in DOCUMENT_EXTENSIONS else "media",
        "extension": ext,
        "mime_type": guessed_type,
        "title": Path(urlparse(url).path).name,
        "alt_text": alt,
        "caption": caption,
        "context": context,
        "local_path": "",
        "download_status": "not_started",
    }


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_verification(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "original_url": item["final_url"] or item["original_url"],
            "local_route": "",
            "title_match": False,
            "date_match": False,
            "user_match": False,
            "text_match": False,
            "image_count_match": False,
            "attachment_count_match": False,
            "link_count_match": False,
            "structure_match": False,
            "visual_review": "not_started",
            "notes": "",
            "verified_at": "",
            "status": "inventoried" if 0 < item.get("status_code", 0) < 400 else "needs_review",
        }
        for item in records
        if item.get("type") not in {"asset", "unknown"}
    ]


def write_inventory(
    records: list[dict[str, Any]],
    media_by_key: dict[tuple[str, str], dict[str, Any]],
    external_by_key: dict[tuple[str, str], dict[str, Any]],
    broken_links: list[dict[str, Any]],
    redirects: list[dict[str, Any]],
) -> None:
    write_json(OUTPUT_DIR / "urls.json", records)
    write_json(OUTPUT_DIR / "media.json", list(media_by_key.values()))
    write_json(OUTPUT_DIR / "external-resources.json", list(external_by_key.values()))
    write_json(OUTPUT_DIR / "verification.json", build_verification(records))
    write_json(OUTPUT_DIR / "broken-links.json", broken_links)
    write_json(OUTPUT_DIR / "redirects.json", redirects)


def main() -> None:
    opener = build_opener()
    queue: deque[tuple[str, str]] = deque((normalize_url(url), "seed") for url in START_URLS)
    seen_html: set[str] = set()
    queued: set[str] = {url for url, _source in queue}
    media_by_key: dict[tuple[str, str], dict[str, Any]] = {}
    external_by_key: dict[tuple[str, str], dict[str, Any]] = {}
    records: list[dict[str, Any]] = []
    broken_links: list[dict[str, Any]] = []
    redirects: list[dict[str, Any]] = []

    try:
        while queue and len(seen_html) < MAX_HTML_PAGES:
            url, pagination_source = queue.popleft()
            queued.discard(url)
            if url in seen_html or any(url.startswith(prefix) for prefix in IGNORED_INTERNAL_PREFIXES):
                continue
            seen_html.add(url)

            try:
                result = fetch(opener, url)
            except (HTTPError, URLError, TimeoutError, OSError) as exc:
                broken_links.append({"source_url": pagination_source, "url": url, "error": repr(exc), "checked_at": now_iso()})
                records.append(
                    {
                        "original_url": url,
                        "final_url": "",
                        "status_code": 0,
                        "type": "unknown",
                        "title": "",
                        "slug": slug_for(url),
                        "publication_date": "",
                        "modified_date": "",
                        "wordpress_user": "",
                        "internal_author": "",
                        "categories": [],
                        "tags": [],
                        "parent": "",
                        "pagination_source": pagination_source,
                        "canonical_url": "",
                        "content_hash": "",
                        "media_count": 0,
                        "attachment_count": 0,
                        "migration_status": "inventoried",
                        "verification_status": "not_started",
                    }
                )
                continue

            if result.final_url != url or result.history:
                redirects.append(
                    {
                        "original_url": url,
                        "final_url": result.final_url,
                        "status_code": result.status_code,
                        "history": result.history,
                    }
                )

            if result.status_code >= 400:
                broken_links.append(
                    {
                        "source_url": pagination_source,
                        "url": url,
                        "final_url": result.final_url,
                        "status_code": result.status_code,
                        "checked_at": now_iso(),
                    },
                )

            parser = None
            if "text/html" in result.content_type and result.body:
                parser = PageParser(result.final_url)
                parser.feed(result.body)
                parser.close()

            records.append(build_record(url, result, parser, pagination_source))

            if not parser:
                time.sleep(REQUEST_DELAY)
                continue

            page_source = result.final_url

            for img in parser.images:
                rec = media_record(page_source, img["src"], "img", img["alt"], img["caption"])
                media_by_key[(rec["source_page"], rec["original_url"])] = rec

            for embed in parser.embeds:
                linked = embed["src"]
                if is_internal(linked) and looks_like_download(linked):
                    rec = media_record(page_source, linked, embed["tag"], embed.get("title", ""))
                    media_by_key[(rec["source_page"], rec["original_url"])] = rec
                elif not is_internal(linked):
                    external_by_key[(page_source, linked)] = {
                        "source_page": page_source,
                        "url": linked,
                        "title": embed.get("title", ""),
                        "platform": platform_for(linked),
                        "author": "",
                        "status": "not_started",
                    }

            for link in parser.links:
                href = link["url"]
                parsed = urlparse(href)
                if parsed.scheme not in {"http", "https"}:
                    continue
                if not is_internal(href):
                    external_by_key.setdefault(
                        (page_source, href),
                        {
                            "source_page": page_source,
                            "url": href,
                            "title": link.get("text", ""),
                            "platform": platform_for(href),
                            "author": "",
                            "status": "not_started",
                        },
                    )
                    continue
                if looks_like_download(href):
                    rec = media_record(page_source, href, "link", link.get("text", ""))
                    media_by_key[(rec["source_page"], rec["original_url"])] = rec
                    continue
                if any(href.startswith(prefix) for prefix in IGNORED_INTERNAL_PREFIXES):
                    continue
                if should_skip_internal_html(href):
                    continue
                if href not in seen_html and href not in queued:
                    queue.append((href, page_source))
                    queued.add(href)

            if len(records) % CHECKPOINT_EVERY == 0:
                write_inventory(records, media_by_key, external_by_key, broken_links, redirects)
                print(
                    f"checkpoint urls={len(records)} media={len(media_by_key)} external={len(external_by_key)} queued={len(queue)}",
                    flush=True,
                )

            time.sleep(REQUEST_DELAY)
    finally:
        write_inventory(records, media_by_key, external_by_key, broken_links, redirects)

    print(
        " ".join(
            [
                f"urls={len(records)}",
                f"media={len(media_by_key)}",
                f"external={len(external_by_key)}",
                f"broken={len(broken_links)}",
                f"redirects={len(redirects)}",
                f"queued={len(queue)}",
            ]
        )
    )


if __name__ == "__main__":
    main()
