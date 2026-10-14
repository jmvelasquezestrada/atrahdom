"""Generate clean, static detail URLs for the effective CENDOC catalog only."""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from editorial_data import apply_editorial_overrides, load_editorial_config  # noqa: E402


# Pilot-only sizing for the portrait Scribd document. Scribd's embed editor
# supports custom viewer dimensions; keep this override scoped to this record.
CENDOC_IFRAME_HEIGHT_OVERRIDES = {
    "upr-a-practical-guide-for-civil-society-coalitions-to-engage-in-implementation-mechanisms": {
        "scribd_1046068349": "800",
    },
}


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "noscript"}:
            self.skip_depth += 1
        elif tag in {"p", "div", "br", "li", "h1", "h2", "h3", "h4", "figure"}:
            self.parts.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript"} and self.skip_depth:
            self.skip_depth -= 1
        elif tag in {"p", "div", "li", "h1", "h2", "h3", "h4", "figure"}:
            self.parts.append(" ")

    def handle_data(self, data: str) -> None:
        if not self.skip_depth:
            self.parts.append(data)


def plain_text(value: str) -> str:
    parser = TextExtractor()
    parser.feed(value or "")
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()


def content_of(post: dict[str, Any]) -> str:
    body = post.get("content_html") or ""
    if not body and post.get("content_file"):
        source = ROOT / str(post["content_file"])
        if source.is_file():
            body = source.read_text(encoding="utf-8")
    return body


def apply_iframe_height_overrides(slug: str, body: str) -> str:
    overrides = CENDOC_IFRAME_HEIGHT_OVERRIDES.get(slug, {})
    for frame_id, height in overrides.items():
        pattern = re.compile(
            rf'(<iframe\b(?=[^>]*\bid=["\']{re.escape(frame_id)}["\'])[^>]*\bheight=["\'])\d+(["\'])',
            re.I,
        )
        body, count = pattern.subn(rf"\g<1>{height}\2", body)
        if count != 1:
            raise ValueError(f"Expected one iframe {frame_id!r} in CENDOC record {slug}; found {count}")
    return body


def date_of(post: dict[str, Any]) -> str:
    if post.get("editorial_metadata_reviewed") and post.get("editorial_date"):
        return str(post["editorial_date"])
    return str(post.get("publication_date") or post.get("date") or "")


def display_date(value: str) -> str:
    raw = str(value or "").strip()
    match = re.match(r"^(\d{4})-(\d{2})-(\d{2})", raw)
    if match:
        year, month, day = map(int, match.groups())
        months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
        return f"{day} de {months[month - 1]} de {year}"
    return raw


def date_sort_key(value: str) -> int:
    raw = str(value or "").strip()
    if re.fullmatch(r"\d{4}", raw):
        try:
            return int(datetime(int(raw), 1, 1).timestamp())
        except (ValueError, OSError):
            return 0
    match = re.fullmatch(r"(\d{1,2}) de ([\wáéíóú]+) de (\d{4})", raw, re.I)
    if match:
        months = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12}
        month = months.get(match.group(2).lower())
        if month:
            return int(datetime(int(match.group(3)), month, int(match.group(1))).timestamp())
    match = re.match(r"^(\d{4})-(\d{2})-(\d{2})", raw)
    if match:
        return int(datetime(*map(int, match.groups())).timestamp())
    try:
        return int(datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp())
    except (ValueError, OverflowError):
        return 0


def root_url(value: str) -> str:
    if not value:
        return "https://www.atrahdom.org/assets/images/53748227-967265606800058-5365576087386456064-o-e1612201671497-8a4eddd06b.jpg"
    if value.startswith(("https://", "http://")):
        return value
    return "https://www.atrahdom.org/" + value.lstrip("/")


def image_of(post: dict[str, Any]) -> str:
    images = post.get("images") or []
    return str(post.get("featured_image") or (images[0] if images else ""))


def attachment_path(item: Any) -> str:
    return str(item if isinstance(item, str) else item.get("local_path") or item.get("path") or "")


def pdf_embed(path: str, label: str) -> str:
    escaped_path = html.escape(path, quote=True)
    escaped_label = html.escape(label or Path(urlparse(path).path).name, quote=True)
    return f'<section class="media-embed document-embed"><div class="media-embed-head"><h3>{escaped_label}</h3><a href="{escaped_path}" target="_blank" rel="noopener">Abrir en pestaña nueva</a></div><iframe src="{escaped_path}#view=FitH" title="{escaped_label}" loading="lazy"></iframe></section>'


def matching_pdf_file_blocks(body: str, paths: set[str]) -> list[tuple[int, int, str, str]]:
    """Find standalone download blocks that link to one of this record's PDFs."""
    div_tags = list(re.finditer(r"</?div\b[^>]*>", body, re.I))
    blocks: list[tuple[int, int, str, str]] = []
    div_blocks: list[tuple[int, int]] = []
    for index, opening in enumerate(div_tags):
        if opening.group(0).startswith("</"):
            continue
        class_match = re.search(r"\bclass\s*=\s*([\"'])(.*?)\1", opening.group(0), re.I | re.S)
        if not class_match or "wp-block-file" not in class_match.group(2).split():
            continue
        depth = 1
        for closing_index in range(index + 1, len(div_tags)):
            tag = div_tags[closing_index].group(0)
            depth += -1 if tag.startswith("</") else 1
            if depth:
                continue
            end = div_tags[closing_index].end()
            matched_path, label = linked_pdf(body[opening.start():end], paths)
            if matched_path:
                blocks.append((opening.start(), end, matched_path, label))
                div_blocks.append((opening.start(), end))
            break
    for paragraph in re.finditer(r"<p\b[^>]*>([\s\S]*?)</p>", body, re.I):
        inner = paragraph.group(1)
        matched_path, label = linked_pdf(inner, paths)
        if not matched_path:
            continue
        if any(start <= paragraph.start() and paragraph.end() <= end for start, end in div_blocks):
            continue
        anchor = re.search(r"<a\b[^>]*>[\s\S]*?</a>", inner, re.I)
        if anchor and not plain_text(inner[:anchor.start()] + inner[anchor.end():]).strip():
            blocks.append((paragraph.start(), paragraph.end(), matched_path, label))
    blocks.sort(key=lambda item: item[0])
    return blocks


def linked_pdf(markup: str, paths: set[str]) -> tuple[str, str]:
    for anchor in re.finditer(r"<a\b([^>]*)>([\s\S]*?)</a>", markup, re.I):
        href_match = re.search(r"\bhref\s*=\s*([\"'])(.*?)\1", anchor.group(1), re.I | re.S)
        if not href_match:
            continue
        href = html.unescape(href_match.group(2)).replace("\\", "/")
        href_path = urlparse(href).path.lstrip("/")
        path = next((candidate for candidate in paths if href == candidate or href_path == candidate), "")
        if path:
            return path, plain_text(anchor.group(2))
    return "", ""


def prepare_pdf_resources(post: dict[str, Any], body: str) -> tuple[str, dict[str, str], list[str]]:
    pdf_paths = {
        attachment_path(item)
        for item in post.get("attachments") or []
        if re.search(r"\.pdf(?:$|[?#])", attachment_path(item), re.I)
    }
    moved: dict[str, str] = {}
    blocks: list[str] = []
    resource_blocks = matching_pdf_file_blocks(body, pdf_paths)
    for start, end, path, label in reversed(resource_blocks):
        moved.setdefault(path, label)
        blocks.insert(0, body[start:end])
        body = body[:start] + body[end:]
    return body, moved, blocks


def embeds_for(post: dict[str, Any], body: str, moved_labels: dict[str, str], download_blocks: list[str]) -> str:
    embeds: list[str] = []
    for item in post.get("attachments") or []:
        path = attachment_path(item)
        if not path or not re.search(r"\.pdf(?:$|[?#])", path, re.I):
            continue
        if path in body and re.search(r"<(?:iframe|embed|object)\b[^>]*" + re.escape(path), body, re.I):
            continue
        if path in body:
            match = re.search(r"<a\b[^>]*href=[\"']" + re.escape(path) + r"[\"'][^>]*>([\s\S]*?)</a>", body, re.I)
            if not match:
                continue
            label = plain_text(match.group(1)) or Path(urlparse(path).path).name
        else:
            label = moved_labels.get(path) or Path(urlparse(path).path).name
        embeds.append(pdf_embed(path, label))
    if not embeds and not download_blocks:
        return ""
    return '<h2>Recursos embebidos</h2>' + "".join(embeds) + "".join(download_blocks)


def post_author(post: dict[str, Any]) -> str:
    if post.get("editorial_metadata_reviewed"):
        return str(post.get("editorial_author") or "")
    return str(post.get("internal_author") or post.get("wordpress_user") or "")


def citation_year(date: str) -> str:
    match = re.search(r"\b(18|19|20|21)\d{2}\b", date)
    return match.group(0) if match else "s.f."


def sidebar(post: dict[str, Any], categories: list[str], slug: str) -> str:
    author = post_author(post)
    date = date_of(post)
    title = str(post.get("title") or "Sin título")
    parts = [f'<p><strong>Tipo:</strong><br>{html.escape(str(post.get("editorial_type") or "Publicación"))}</p>']
    if author:
        parts.append(f'<p><strong>Autoría:</strong><br>{html.escape(author)}</p>')
    if date:
        parts.append(f'<p><strong>Fecha:</strong><br>{html.escape(display_date(date))}</p>')
    if categories:
        parts.append(f'<p><strong>Categorías:</strong><br>{html.escape(", ".join(categories))}</p>')
    institutions = str(post.get("editorial_institutions") or "")
    if institutions:
        parts.append(f'<p><strong>Institución(es):</strong><br>{html.escape(institutions)}</p>')
    identifier = post.get("editorial_identifier")
    if identifier:
        label = "DOI" if identifier.get("type") == "DOI" else "ISBN"
        value = str(identifier.get("value") or "")
        value_html = html.escape(value)
        if label == "DOI" and value.startswith(("https://doi.org/", "http://doi.org/")):
            value_html = f'<a href="{html.escape(value, quote=True)}" rel="noopener">{html.escape(value)}</a>'
        parts.append(f'<p><strong>{label}:</strong><br>{value_html}</p>')
    citation = f'{html.escape(author)}. ({citation_year(date)}). <em>{html.escape(plain_text(title))}</em>.' if author else f'<em>{html.escape(plain_text(title))}</em>. ({citation_year(date)}).'
    if identifier and identifier.get("type") == "DOI" and str(identifier.get("value") or "").startswith(("https://doi.org/", "http://doi.org/")):
        doi = str(identifier["value"])
        citation += f' <a href="{html.escape(doi, quote=True)}" rel="noopener">{html.escape(doi)}</a>'
    parts.append(f'<div class="citation-block"><p><strong>Cita sugerida:</strong></p><blockquote>{citation}</blockquote></div>')
    return "".join(parts)


def date_author_line(post: dict[str, Any]) -> str:
    bits = []
    if date_of(post):
        bits.append(html.escape(display_date(date_of(post))))
    if post_author(post):
        bits.append("Por " + html.escape(post_author(post)))
    modified = str(post.get("modified_date") or post.get("modified") or "")
    if modified and modified != date_of(post):
        bits.append("Actualizado el " + html.escape(display_date(modified)))
    return "".join(f"<span>{item}</span>" for item in bits)


def is_cendoc_post(post: dict[str, Any], excluded: set[str]) -> bool:
    slug = str(post.get("slug") or "")
    categories = [str(item) if isinstance(item, str) else "" for item in post.get("categories") or []]
    has_cendoc_category = any(re.search(r"document|publicaciones propias|investig|informe|manual|tesis", category, re.I) for category in categories)
    return slug not in excluded and (has_cendoc_category or bool(post.get("attachments")))


def route_for_related(post: dict[str, Any], cendoc_slugs: set[str], communications: set[str]) -> str:
    slug = str(post.get("slug") or "")
    if slug in cendoc_slugs:
        return f"/cendoc/{slug}/"
    if slug in communications:
        return f"/comunicados/{slug}/"
    return str(post.get("local_route") or f"#/contenido/{post.get('type', 'post')}/{post.get('id', '')}")


def related_markup(post: dict[str, Any], all_posts: list[dict[str, Any]], categories_by_slug: dict[str, list[str]], cendoc_slugs: set[str], communications: set[str]) -> str:
    slug = str(post.get("slug") or "")
    categories = categories_by_slug.get(slug, [])
    related = [item for item in all_posts if item.get("slug") != slug and set(categories).intersection(categories_by_slug.get(str(item.get("slug") or ""), []))]
    related.sort(key=lambda item: date_sort_key(date_of(item)), reverse=True)
    cards = []
    for item in related[:3]:
        title = html.escape(str(item.get("title") or "Sin título"))
        url = html.escape(route_for_related(item, cendoc_slugs, communications), quote=True)
        date = date_of(item)
        image = image_of(item)
        media = f'<div class="card-media"><img src="{html.escape(image, quote=True)}" alt="" loading="lazy" decoding="async"></div>' if image else '<div class="card-media"></div>'
        excerpt = plain_text(item.get("excerpt_html") or "") or plain_text(content_of(item))
        excerpt = html.escape(excerpt[:190] + ("…" if len(excerpt) > 190 else ""))
        date_html = f'<span>{html.escape(display_date(date))}</span>' if date else ""
        cards.append(f'<article class="card">{media}<div class="card-body"><div class="meta">{html.escape((categories_by_slug.get(str(item.get("slug") or ""), []) or ["Archivo"])[0])}{date_html}</div><h3>{title}</h3><p>{excerpt}</p><a class="read" href="{url}">Leer contenido completo →</a></div></article>')
    if not cards:
        return ""
    return '<section class="section tint"><div class="wrap"><h2>Documentos relacionados</h2><div class="grid">' + "".join(cards) + '</div></div></section>'


def render_page(template: str, post: dict[str, Any], categories: list[str], all_posts: list[dict[str, Any]], categories_by_slug: dict[str, list[str]], cendoc_slugs: set[str], communications: set[str]) -> str:
    slug = str(post["slug"])
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        raise ValueError(f"Unsafe or unsupported slug for CENDOC path: {slug!r}")
    body = apply_iframe_height_overrides(slug, content_of(post))
    if not body.strip():
        raise ValueError(f"No usable source content for CENDOC record {slug}")
    body, moved_pdf_labels, download_blocks = prepare_pdf_resources(post, body)
    title = str(post.get("title") or "Sin título")
    excerpt = plain_text(post.get("excerpt_html") or "") or plain_text(body)
    description = excerpt[:180].rstrip()
    image = root_url(image_of(post))
    canonical = f"https://www.atrahdom.org/cendoc/{slug}/"
    values = {
        "TITLE": html.escape(title),
        "DESCRIPTION": html.escape(description, quote=True),
        "CANONICAL": canonical,
        "IMAGE": html.escape(image, quote=True),
        "CATEGORIES": " · ".join(html.escape(item) for item in categories) or "Archivo histórico",
        "DATE_AUTHOR": date_author_line(post),
        "CONTENT": body,
        "EMBEDS": embeds_for(post, body, moved_pdf_labels, download_blocks),
        "SIDEBAR": sidebar(post, categories, slug),
        "RELATED": related_markup(post, all_posts, categories_by_slug, cendoc_slugs, communications),
    }
    page = template
    for key, value in values.items():
        page = page.replace("{{" + key + "}}", value)
    page = page.replace("\r\n", "\n").replace("\r", "\n")
    if re.search(r"{{[A-Z_]+}}", page):
        raise ValueError(f"Unresolved template marker for CENDOC record {slug}")
    return page


def generate(check: bool = False, only_slugs: set[str] | None = None) -> list[Path]:
    config = load_editorial_config()
    source_path = ROOT / "content" / "site.json"
    site_data = apply_editorial_overrides(json.loads(source_path.read_text(encoding="utf-8")), config)
    posts = site_data.get("posts", [])
    excluded = set(config.get("cendoc_excluded_slugs", []))
    communications = set(config.get("communication_slugs", []))
    manual = set(config.get("manual_excluded_slugs", []))
    cendoc_posts = [post for post in posts if is_cendoc_post(post, excluded)]
    slugs = [str(post.get("slug") or "") for post in cendoc_posts]
    if len(slugs) != len(set(slugs)):
        raise ValueError("The effective CENDOC catalog contains duplicate slugs")
    if communications.intersection(slugs) or manual.intersection(slugs):
        raise ValueError("An excluded communications/manual-review record entered the CENDOC output")
    if len(communications) != 37:
        raise ValueError(f"Expected 37 communication routes; found {len(communications)}")
    if only_slugs is not None:
        missing = only_slugs - set(slugs)
        if missing:
            raise ValueError(f"Requested slugs are not in the effective CENDOC catalog: {sorted(missing)}")
        cendoc_posts = [post for post in cendoc_posts if str(post.get("slug") or "") in only_slugs]

    template = (ROOT / "templates" / "cendoc-page.html").read_text(encoding="utf-8")
    categories_by_slug = {str(post.get("slug") or ""): [str(c) for c in post.get("categories") or [] if isinstance(c, str)] for post in posts}
    all_posts = sorted(posts, key=lambda post: date_sort_key(date_of(post)), reverse=True)
    outputs: list[Path] = []
    for post in cendoc_posts:
        slug = str(post["slug"])
        source_file = post.get("content_file")
        if source_file and not (ROOT / str(source_file)).is_file() and not post.get("content_html"):
            raise ValueError(f"Source content file is missing for {slug}: {source_file}")
        page = render_page(template, post, categories_by_slug[slug], all_posts, categories_by_slug, set(slugs), communications)
        destination = ROOT / "cendoc" / slug / "index.html"
        outputs.append(destination)
        if check:
            if not destination.is_file() or destination.read_text(encoding="utf-8") != page:
                raise ValueError(f"Generated output is missing or stale: {destination.relative_to(ROOT)}")
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(page, encoding="utf-8", newline="\n")
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare expected output without writing files")
    parser.add_argument("--slugs", nargs="+", help="Limit generation or checking to these CENDOC slugs")
    args = parser.parse_args()
    outputs = generate(check=args.check, only_slugs=set(args.slugs) if args.slugs else None)
    action = "Checked" if args.check else "Generated"
    print(f"{action} {len(outputs)} CENDOC detail pages; no catalog data or communication files written")


if __name__ == "__main__":
    main()
