from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from html import escape, unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse
from urllib.request import Request, build_opener
import json
import mimetypes
import os
import re
import shutil
import time

ROOT = Path(__file__).resolve().parent
INVENTORY_DIR = ROOT / "inventory"
CONTENT_DIR = ROOT / "content"
ASSETS_DIR = ROOT / "assets"
RAW_DIR = CONTENT_DIR / "raw"
PAGES_DIR = CONTENT_DIR / "pages"
POSTS_DIR = CONTENT_DIR / "posts"
ATTACHMENTS_DIR = CONTENT_DIR / "attachments"

REQUEST_DELAY = float(os.environ.get("ATRAHDOM_REQUEST_DELAY", "0.15"))
USER_AGENT = "Mozilla/5.0 (compatible; ATRAHDOM local migration/1.0; +https://atrahdom.org/)"
DOMAIN = "atrahdom.org"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tif", ".tiff"}
DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".zip", ".rtf", ".txt"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v"}

NOISE_HOSTS = {"pixel.wp.com", "stats.wp.com"}
NOISE_PATH_PATTERNS = ("/b.gif", "/g.gif")

BODY_CLASSES = {
    "entry-content",
    "post-content",
    "page-content",
    "article-content",
    "wp-block-post-content",
}
STOP_CLASSES = {
    "sharedaddy",
    "sd-sharing-enabled",
    "jp-relatedposts",
    "post-navigation",
    "entry-footer",
    "comments-area",
    "comment-respond",
    "wpl-likebox",
    "wpcnt",
}


@dataclass
class FetchResult:
    url: str
    final_url: str
    status: int
    content_type: str
    body: bytes


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize_url(url: str, base: str = "") -> str:
    absolute = urljoin(base, url)
    parsed = urlparse(absolute)
    if parsed.scheme not in {"http", "https"}:
        return absolute
    netloc = parsed.netloc.lower().removeprefix("www.")
    path = re.sub(r"/{2,}", "/", parsed.path or "/")
    return urlunparse((parsed.scheme.lower(), netloc, path, "", parsed.query, ""))


def canonical_asset_url(url: str) -> str:
    parsed = urlparse(normalize_url(url))
    query = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True) if k.lower() not in {"w", "h", "resize", "fit", "crop", "quality"}]
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", urlencode(query), ""))


def is_noise_asset(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.netloc.lower() in NOISE_HOSTS:
        return True
    return any(parsed.path.endswith(pattern) for pattern in NOISE_PATH_PATTERNS)


def safe_slug(value: str, fallback: str = "item") -> str:
    value = unescape(value or "").strip().lower()
    value = re.sub(r"[^a-z0-9áéíóúüñ]+", "-", value, flags=re.IGNORECASE)
    value = value.strip("-")
    return value or fallback


def extension_from(url: str, content_type: str = "") -> str:
    ext = Path(urlparse(url).path).suffix.lower()
    if ext:
        return ext
    guessed = mimetypes.guess_extension(content_type.split(";", 1)[0].strip()) if content_type else None
    return guessed or ""


def asset_bucket(ext: str) -> Path:
    if ext in IMAGE_EXTENSIONS:
        return ASSETS_DIR / "images"
    if ext in DOCUMENT_EXTENSIONS:
        return ASSETS_DIR / "documents"
    if ext in AUDIO_EXTENSIONS:
        return ASSETS_DIR / "audio"
    if ext in VIDEO_EXTENSIONS:
        return ASSETS_DIR / "video"
    return ASSETS_DIR / "other"


def fetch(opener: Any, url: str) -> FetchResult:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    try:
        with opener.open(request, timeout=40) as response:
            return FetchResult(url, normalize_url(response.geturl()), response.status, response.headers.get("content-type", ""), response.read())
    except HTTPError as exc:
        body = exc.read() if hasattr(exc, "read") else b""
        return FetchResult(url, normalize_url(exc.geturl() or url), exc.code, exc.headers.get("content-type", "") if exc.headers else "", body)


def unique_asset_path(url: str, content_type: str = "") -> Path:
    parsed = urlparse(url)
    ext = extension_from(url, content_type)
    stem = safe_slug(Path(parsed.path).stem, "asset")[:90]
    digest = sha256(url.encode("utf-8")).hexdigest()[:10]
    return asset_bucket(ext) / f"{stem}-{digest}{ext}"


def download_assets(opener: Any, media: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, str]]:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    lookup: dict[str, str] = {}
    canonical_records: dict[str, dict[str, Any]] = {}

    for item in media:
        original = normalize_url(item.get("original_url", ""))
        if not original or is_noise_asset(original):
            item["download_status"] = "ignored_noise"
            continue
        canonical = canonical_asset_url(original)
        canonical_records.setdefault(canonical, item)

    total = len(canonical_records)
    for index, (url, item) in enumerate(canonical_records.items(), 1):
        existing = item.get("local_path", "")
        if existing and (ROOT / existing).exists():
            lookup[url] = existing
            lookup[normalize_url(item.get("original_url", url))] = existing
            item["download_status"] = "downloaded"
            continue
        try:
            result = fetch(opener, url)
            if result.status >= 400 or not result.body:
                item["download_status"] = "failed"
                item["download_error"] = f"HTTP {result.status}"
                continue
            target = unique_asset_path(result.final_url or url, result.content_type)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(result.body)
            relative = target.relative_to(ROOT).as_posix()
            item.update(
                {
                    "canonical_url": url,
                    "final_url": result.final_url,
                    "status_code": result.status,
                    "content_type": result.content_type,
                    "size_bytes": len(result.body),
                    "sha256": sha256(result.body).hexdigest(),
                    "local_path": relative,
                    "download_status": "downloaded",
                }
            )
            lookup[url] = relative
            lookup[normalize_url(item.get("original_url", url))] = relative
            print(f"asset {index}/{total}: {relative}", flush=True)
        except (URLError, TimeoutError, OSError) as exc:
            item["download_status"] = "failed"
            item["download_error"] = repr(exc)
        time.sleep(REQUEST_DELAY)

    # Propagate the canonical result to every occurrence in the original manifest.
    for item in media:
        original = normalize_url(item.get("original_url", ""))
        canonical = canonical_asset_url(original) if original else ""
        source = canonical_records.get(canonical)
        if source:
            for key in ("canonical_url", "final_url", "status_code", "content_type", "size_bytes", "sha256", "local_path", "download_status", "download_error"):
                if key in source:
                    item[key] = source[key]
            if source.get("local_path"):
                lookup[original] = source["local_path"]
                lookup[canonical] = source["local_path"]

    return media, lookup


class ContentExtractor(HTMLParser):
    """Extract the first WordPress content container while preserving its inner HTML."""

    def __init__(self, page_url: str) -> None:
        super().__init__(convert_charrefs=False)
        self.page_url = page_url
        self.capturing = False
        self.capture_depth = 0
        self.output: list[str] = []
        self.found = False
        self.skip_depth = 0
        self._stack: list[tuple[str, set[str]]] = []

    def handle_starttag(self, tag: str, attrs_raw: list[tuple[str, str | None]]) -> None:
        attrs = {name.lower(): value or "" for name, value in attrs_raw}
        classes = set(attrs.get("class", "").split())
        self._stack.append((tag, classes))

        if not self.capturing and classes.intersection(BODY_CLASSES):
            self.capturing = True
            self.capture_depth = 1
            self.found = True
            return

        if not self.capturing:
            return

        if self.skip_depth:
            self.skip_depth += 1
            return
        if classes.intersection(STOP_CLASSES):
            self.skip_depth = 1
            return

        self.capture_depth += 1
        self.output.append(self._serialize_start(tag, attrs_raw, False))

    def handle_startendtag(self, tag: str, attrs_raw: list[tuple[str, str | None]]) -> None:
        if self.capturing and not self.skip_depth:
            self.output.append(self._serialize_start(tag, attrs_raw, True))

    def handle_endtag(self, tag: str) -> None:
        if self.capturing:
            if self.skip_depth:
                self.skip_depth -= 1
            else:
                self.capture_depth -= 1
                if self.capture_depth == 0:
                    self.capturing = False
                else:
                    self.output.append(f"</{tag}>")
        if self._stack:
            self._stack.pop()

    def handle_data(self, data: str) -> None:
        if self.capturing and not self.skip_depth:
            self.output.append(data)

    def handle_entityref(self, name: str) -> None:
        if self.capturing and not self.skip_depth:
            self.output.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        if self.capturing and not self.skip_depth:
            self.output.append(f"&#{name};")

    def handle_comment(self, data: str) -> None:
        if self.capturing and not self.skip_depth:
            self.output.append(f"<!--{data}-->")

    @staticmethod
    def _serialize_start(tag: str, attrs_raw: list[tuple[str, str | None]], closed: bool) -> str:
        attrs = "".join(f' {name}="{escape(value or "", quote=True)}"' for name, value in attrs_raw)
        return f"<{tag}{attrs}{' /' if closed else ''}>"

    @property
    def html(self) -> str:
        return "".join(self.output).strip()


class MetadataParser(HTMLParser):
    def __init__(self, page_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.page_url = page_url
        self.title = ""
        self.h1 = ""
        self.published = ""
        self.modified = ""
        self.author = ""
        self.categories: list[str] = []
        self.tags: list[str] = []
        self.featured_image = ""
        self._capture: str | None = None
        self._capture_attrs: dict[str, str] = {}
        self._text: list[str] = []

    def handle_starttag(self, tag: str, attrs_raw: list[tuple[str, str | None]]) -> None:
        attrs = {name.lower(): value or "" for name, value in attrs_raw}
        classes = attrs.get("class", "").split()
        if tag in {"title", "h1", "a"}:
            self._capture = tag
            self._capture_attrs = attrs
            self._text = []
        if tag == "time" and attrs.get("datetime"):
            if "updated" in classes:
                self.modified = attrs["datetime"]
            elif not self.published:
                self.published = attrs["datetime"]
        if tag == "meta":
            prop = attrs.get("property") or attrs.get("name") or ""
            content = attrs.get("content", "")
            if prop == "article:published_time":
                self.published = content
            elif prop == "article:modified_time":
                self.modified = content
            elif prop in {"og:image", "twitter:image"} and not self.featured_image:
                self.featured_image = normalize_url(content, self.page_url)

    def handle_endtag(self, tag: str) -> None:
        if self._capture == tag:
            text = re.sub(r"\s+", " ", " ".join(self._text)).strip()
            attrs = self._capture_attrs
            if tag == "title":
                self.title = text
            elif tag == "h1" and not self.h1:
                self.h1 = text
            elif tag == "a":
                rel = attrs.get("rel", "")
                klass = attrs.get("class", "")
                href = normalize_url(attrs.get("href", ""), self.page_url)
                if "author" in rel or "author" in klass:
                    self.author = self.author or text
                if "category" in rel and text and text not in self.categories:
                    self.categories.append(text)
                if "tag" in rel and "category" not in rel and text and text not in self.tags:
                    self.tags.append(text)
            self._capture = None
            self._capture_attrs = {}
            self._text = []

    def handle_data(self, data: str) -> None:
        if self._capture:
            text = re.sub(r"\s+", " ", data).strip()
            if text:
                self._text.append(text)


class LinkImageRewriter(HTMLParser):
    def __init__(self, page_url: str, asset_lookup: dict[str, str], route_lookup: dict[str, str]) -> None:
        super().__init__(convert_charrefs=False)
        self.page_url = page_url
        self.asset_lookup = asset_lookup
        self.route_lookup = route_lookup
        self.output: list[str] = []
        self.images: list[str] = []
        self.attachments: list[str] = []
        self.external: list[str] = []
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs_raw: list[tuple[str, str | None]]) -> None:
        self.output.append(self._start(tag, attrs_raw, False))

    def handle_startendtag(self, tag: str, attrs_raw: list[tuple[str, str | None]]) -> None:
        self.output.append(self._start(tag, attrs_raw, True))

    def handle_endtag(self, tag: str) -> None:
        self.output.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        self.output.append(data)

    def handle_entityref(self, name: str) -> None:
        self.output.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        self.output.append(f"&#{name};")

    def handle_comment(self, data: str) -> None:
        self.output.append(f"<!--{data}-->")

    def _start(self, tag: str, attrs_raw: list[tuple[str, str | None]], closed: bool) -> str:
        attrs: list[tuple[str, str | None]] = []
        for name, value in attrs_raw:
            new_value = value
            if value and name.lower() in {"src", "href", "poster"}:
                absolute = normalize_url(value, self.page_url)
                canonical = canonical_asset_url(absolute)
                if absolute in self.asset_lookup or canonical in self.asset_lookup:
                    local = self.asset_lookup.get(absolute) or self.asset_lookup[canonical]
                    new_value = local
                    ext = Path(urlparse(absolute).path).suffix.lower()
                    if tag == "img":
                        self.images.append(local)
                    elif ext in DOCUMENT_EXTENSIONS:
                        self.attachments.append(local)
                elif urlparse(absolute).netloc.lower().removeprefix("www.") == DOMAIN and absolute in self.route_lookup:
                    new_value = self.route_lookup[absolute]
                    self.links.append(new_value)
                elif absolute.startswith(("http://", "https://")):
                    self.external.append(absolute)
            if value and name.lower() == "srcset":
                candidates = []
                for candidate in value.split(","):
                    bits = candidate.strip().split()
                    if not bits:
                        continue
                    absolute = normalize_url(bits[0], self.page_url)
                    local = self.asset_lookup.get(absolute) or self.asset_lookup.get(canonical_asset_url(absolute))
                    bits[0] = local or absolute
                    candidates.append(" ".join(bits))
                new_value = ", ".join(candidates)
            attrs.append((name, new_value))
        rendered = "".join(f' {name}="{escape(value or "", quote=True)}"' for name, value in attrs)
        return f"<{tag}{rendered}{' /' if closed else ''}>"

    @property
    def html(self) -> str:
        return "".join(self.output).strip()


def route_for(record: dict[str, Any]) -> str:
    item_type = record.get("type", "html")
    slug = record.get("slug") or safe_slug(record.get("title", ""))
    if item_type == "home":
        return "#/"
    if item_type == "page":
        return f"#/page/{slug}"
    if item_type == "post":
        return f"#/post/{slug}"
    if item_type in {"category", "tag_archive", "author_archive", "date_archive", "format_archive"}:
        return f"#/archive/{item_type}/{slug}"
    if item_type == "attachment":
        return f"#/attachment/{slug}"
    return f"#/content/{slug}"


def migrate_html(opener: Any, records: list[dict[str, Any]], asset_lookup: dict[str, str]) -> list[dict[str, Any]]:
    route_lookup = {normalize_url(item.get("final_url") or item.get("original_url", "")): route_for(item) for item in records}
    output: list[dict[str, Any]] = []
    html_records = [item for item in records if item.get("type") in {"home", "page", "post", "attachment"} and item.get("status_code") == 200]

    for index, record in enumerate(html_records, 1):
        url = normalize_url(record.get("final_url") or record.get("original_url", ""))
        try:
            result = fetch(opener, url)
            if result.status >= 400:
                raise OSError(f"HTTP {result.status}")
            charset = "utf-8"
            match = re.search(r"charset=([^;\s]+)", result.content_type, flags=re.I)
            if match:
                charset = match.group(1).strip("\"'")
            text = result.body.decode(charset, errors="replace")
            RAW_DIR.mkdir(parents=True, exist_ok=True)
            raw_path = RAW_DIR / f"{safe_slug(record.get('slug', 'item'))}-{sha256(url.encode()).hexdigest()[:8]}.html"
            raw_path.write_text(text, encoding="utf-8")

            extractor = ContentExtractor(url)
            extractor.feed(text)
            extractor.close()
            metadata = MetadataParser(url)
            metadata.feed(text)
            metadata.close()

            body_html = extractor.html
            if not body_html:
                record["migration_status"] = "needs_review"
                record["migration_error"] = "No WordPress content container found"
                output.append(record)
                continue

            rewriter = LinkImageRewriter(url, asset_lookup, route_lookup)
            rewriter.feed(body_html)
            rewriter.close()
            local_html = rewriter.html

            kind_dir = PAGES_DIR if record.get("type") in {"home", "page"} else POSTS_DIR if record.get("type") == "post" else ATTACHMENTS_DIR
            content_path = kind_dir / f"{safe_slug(record.get('slug', 'item'))}.html"
            content_path.parent.mkdir(parents=True, exist_ok=True)
            content_path.write_text(local_html, encoding="utf-8")

            migrated = dict(record)
            migrated.update(
                {
                    "title": metadata.h1 or record.get("title") or metadata.title,
                    "publication_date": metadata.published or record.get("publication_date", ""),
                    "modified_date": metadata.modified or record.get("modified_date", ""),
                    "wordpress_user": metadata.author or record.get("wordpress_user", ""),
                    "categories": metadata.categories or record.get("categories", []),
                    "tags": metadata.tags or record.get("tags", []),
                    "featured_image_original": metadata.featured_image,
                    "featured_image": asset_lookup.get(metadata.featured_image, asset_lookup.get(canonical_asset_url(metadata.featured_image), "")) if metadata.featured_image else "",
                    "local_route": route_for(record),
                    "content_file": content_path.relative_to(ROOT).as_posix(),
                    "raw_file": raw_path.relative_to(ROOT).as_posix(),
                    "content_html": local_html,
                    "content_hash_local": sha256(re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", local_html))).strip().encode("utf-8")).hexdigest(),
                    "images": sorted(set(rewriter.images)),
                    "attachments": sorted(set(rewriter.attachments)),
                    "external_links": sorted(set(rewriter.external)),
                    "internal_links": sorted(set(rewriter.links)),
                    "migration_status": "rendered",
                    "verification_status": "needs_review",
                }
            )
            output.append(migrated)
            print(f"content {index}/{len(html_records)}: {record.get('type')} {record.get('slug')}", flush=True)
        except (URLError, TimeoutError, OSError, UnicodeError) as exc:
            failed = dict(record)
            failed["migration_status"] = "needs_review"
            failed["migration_error"] = repr(exc)
            output.append(failed)
        time.sleep(REQUEST_DELAY)

    return output


def build_site_data(migrated: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "https://atrahdom.org/",
        "home": next((item for item in migrated if item.get("type") == "home"), None),
        "pages": [item for item in migrated if item.get("type") == "page"],
        "posts": [item for item in migrated if item.get("type") == "post"],
        "attachments": [item for item in migrated if item.get("type") == "attachment"],
    }


def main() -> None:
    records = load_json(INVENTORY_DIR / "urls.json")
    media = load_json(INVENTORY_DIR / "media.json")
    opener = build_opener()

    print(f"Downloading assets from {len(media)} manifest records…", flush=True)
    media, lookup = download_assets(opener, media)
    write_json(INVENTORY_DIR / "media.json", media)
    write_json(INVENTORY_DIR / "asset-map.json", lookup)

    print("Extracting literal WordPress content…", flush=True)
    migrated = migrate_html(opener, records, lookup)
    write_json(CONTENT_DIR / "items.json", migrated)
    site_data = build_site_data(migrated)
    write_json(CONTENT_DIR / "site.json", site_data)

    js_path = CONTENT_DIR / "site-data.js"
    js_path.write_text("window.ATRAHDOM_SITE = " + json.dumps(site_data, ensure_ascii=False) + ";\n", encoding="utf-8")

    summary = {
        "records_considered": len(records),
        "content_migrated": sum(1 for item in migrated if item.get("migration_status") == "rendered"),
        "content_needs_review": sum(1 for item in migrated if item.get("migration_status") == "needs_review"),
        "assets_downloaded": sum(1 for item in media if item.get("download_status") == "downloaded"),
        "assets_failed": sum(1 for item in media if item.get("download_status") == "failed"),
        "assets_ignored": sum(1 for item in media if item.get("download_status") == "ignored_noise"),
    }
    write_json(CONTENT_DIR / "migration-summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
