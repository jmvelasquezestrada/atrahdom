from __future__ import annotations

import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from editorial_data import apply_editorial_overrides, load_editorial_config, write_browser_config  # noqa: E402


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


MONTHS = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12,
}


def display_date(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    if raw.lower() == "s.f." or re.fullmatch(r"\d{4}", raw):
        return raw
    match = re.fullmatch(r"(\d{1,2}) de ([a-záéíóú]+) de (\d{4})", raw, re.I)
    if match:
        return raw
    iso = re.match(r"^(\d{4})-(\d{2})-(\d{2})", raw)
    if iso:
        year, month, day = map(int, iso.groups())
        names = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
        return f"{day} de {names[month - 1]} de {year}"
    return raw


def citation_date(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw or raw.lower() == "s.f.":
        return "s.f."
    year = re.search(r"\b(18|19|20|21)\d{2}\b", raw)
    return year.group(0) if year else "s.f."


def root_url(path: str) -> str:
    if not path:
        return "https://www.atrahdom.org/assets/images/53748227-967265606800058-5365576087386456064-o-e1612201671497-8a4eddd06b.jpg"
    if path.startswith(("https://", "http://")):
        return path
    return "https://www.atrahdom.org/" + path.lstrip("/")


def get_content(post: dict[str, Any]) -> str:
    body = post.get("content_html") or ""
    if not body and post.get("content_file"):
        path = ROOT / post["content_file"]
        if path.is_file():
            body = path.read_text(encoding="utf-8")
    return body


def sidebar(post: dict[str, Any], date: str) -> str:
    parts = ['<p><strong>Tipo:</strong><br>Comunicado institucional</p>']
    author = post.get("editorial_author") if post.get("editorial_metadata_reviewed") else (post.get("internal_author") or post.get("wordpress_user"))
    if author:
        parts.append(f'<p><strong>Autoría:</strong><br>{html.escape(str(author))}</p>')
    if date:
        parts.append(f'<p><strong>Fecha:</strong><br>{html.escape(display_date(date))}</p>')
    categories = post.get("categories") or []
    names = [str(category) if isinstance(category, str) else "" for category in categories]
    names = [name for name in names if name]
    if names:
        parts.append(f'<p><strong>Categorías históricas:</strong><br>{html.escape(", ".join(names))}</p>')
    institutions = post.get("editorial_institutions") or ""
    if institutions:
        parts.append(f'<p><strong>Institución(es) consignada(s; función no determinada):</strong><br>{html.escape(str(institutions))}</p>')
    identifier = post.get("editorial_identifier")
    if identifier:
        label = "DOI" if identifier.get("type") == "DOI" else "ISBN"
        val = str(identifier.get("value", ""))
        if label == "DOI" and val.startswith(("https://doi.org/", "http://doi.org/")):
            parts.append(f'<p><strong>DOI:</strong><br><a href="{html.escape(val, quote=True)}" rel="noopener">{html.escape(val)}</a></p>')
        else:
            parts.append(f'<p><strong>{label}:</strong><br>{html.escape(val)}</p>')

    title = str(post.get("title") or "Sin título")
    year = citation_date(date)
    if author:
        citation = f'{html.escape(str(author))}. ({year}). <em>{html.escape(title)}</em>.'
    else:
        citation = f'<em>{html.escape(title)}</em>. ({year}).'
    if identifier and identifier.get("type") == "DOI":
        doi = str(identifier.get("value", ""))
        if doi.startswith(("https://doi.org/", "http://doi.org/")):
            citation += f' <a href="{html.escape(doi, quote=True)}" rel="noopener">{html.escape(doi)}</a>'
    parts.append(f'<div class="citation-block"><p><strong>Cita sugerida:</strong></p><blockquote>{citation}</blockquote></div>')
    return "".join(parts)


def pdf_embed(path: str, label: str) -> str:
    escaped_path = html.escape(path, quote=True)
    escaped_label = html.escape(label or Path(path.split("?", 1)[0]).name, quote=True)
    return f'<section class="media-embed document-embed"><div class="media-embed-head"><h3>{escaped_label}</h3><a href="{escaped_path}" target="_blank" rel="noopener">Abrir en pestaña nueva</a></div><iframe src="{escaped_path}#view=FitH" title="{escaped_label}" loading="lazy"></iframe></section>'


def attachment_markup(post: dict[str, Any], body: str) -> str:
    attachments = post.get("attachments") or []
    items: list[str] = []
    for item in attachments:
        path = item if isinstance(item, str) else item.get("local_path") or item.get("path") or ""
        if not path:
            continue
        label = Path(path.split("?", 1)[0]).name
        if path in body:
            if not re.search(r"\.pdf(?:$|[?#])", path, re.I):
                continue
            embedded = False
            for tag in re.findall(r"<(?:iframe|embed|object)\b[^>]*>", body, re.I):
                if path in html.unescape(tag) and not re.search(r"\bhidden(?:\s|=|>)", tag, re.I):
                    embedded = True
                    break
            if embedded:
                continue
            link = next((match for match in re.finditer(r"<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*>([\s\S]*?)</a>", body, re.I) if html.unescape(match.group(1)) == path), None)
            if link:
                label = plain_text(link.group(2)) or label
            else:
                continue
        items.append(pdf_embed(path, label))
    return "".join(items)


def render_page(template: str, post: dict[str, Any], slug: str) -> str:
    title = str(post.get("title") or "Sin título")
    canonical = f"https://www.atrahdom.org/comunicados/{slug}/"
    body = get_content(post)
    if not body.strip():
        raise ValueError(f"No usable content for comunicado {slug}")
    description = plain_text(post.get("excerpt_html") or "") or plain_text(body)
    description = description[:180].rstrip()
    date = post.get("editorial_date") if post.get("editorial_metadata_reviewed") and post.get("editorial_date") else post.get("publication_date") or post.get("date") or ""
    author = post.get("editorial_author") if post.get("editorial_metadata_reviewed") else (post.get("internal_author") or post.get("wordpress_user"))
    date_author = " · ".join(x for x in [html.escape(display_date(date)) if date else "", f'Por {html.escape(str(author))}' if author else ""] if x)
    image = root_url(post.get("featured_image") or (post.get("images") or [""])[0])
    values = {
        "TITLE": html.escape(title),
        "DESCRIPTION": html.escape(description, quote=True),
        "CANONICAL": canonical,
        "IMAGE": html.escape(image, quote=True),
        "DATE_AUTHOR": date_author,
        "CONTENT": body,
        "ATTACHMENTS": attachment_markup(post, body),
        "SIDEBAR": sidebar(post, date),
    }
    page = template
    for key, value in values.items():
        page = page.replace("{{" + key + "}}", value)
    if re.search(r"{{[A-Z_]+}}", page):
        raise ValueError(f"Unresolved template marker for comunicado {slug}")
    return page


def render_card(post: dict[str, Any], slug: str) -> str:
    title = html.escape(str(post.get("title") or "Sin título"))
    date = post.get("editorial_date") if post.get("editorial_metadata_reviewed") and post.get("editorial_date") else post.get("publication_date") or post.get("date") or ""
    meta = '<div class="meta"><span>Comunicado</span>' + (f'<span>{html.escape(display_date(date))}</span>' if date else "") + "</div>"
    return f'<article class="card"><div class="card-body">{meta}<h2><a href="/comunicados/{slug}/">{title}</a></h2><a class="read" href="/comunicados/{slug}/">Leer comunicado →</a></div></article>'


def generate_comunicados_pages(site_data: dict[str, Any], config: dict[str, Any] | None = None, *, check: bool = False, pages_only: bool = False) -> list[Path]:
    config = config or load_editorial_config()
    site_data = apply_editorial_overrides(site_data, config)
    all_posts = {str(post.get("slug", "")): post for post in site_data.get("posts", [])}
    slugs = config.get("communication_slugs", [])
    if not slugs or len(slugs) != len(set(slugs)):
        raise ValueError(f"Expected nonempty, unique comunicado slugs; found {len(slugs)} entries / {len(set(slugs))} unique")
    excluded = set(config.get("communication_excluded_slugs", []))
    if excluded.intersection(slugs):
        raise ValueError(f"Excluded records are listed for Comunicados: {sorted(excluded.intersection(slugs))}")
    missing = [slug for slug in slugs if slug not in all_posts]
    if missing:
        raise ValueError(f"Missing site records for comunicado slugs: {missing}")

    template_path = ROOT / "templates" / "comunicado-page.html"
    template = template_path.read_text(encoding="utf-8")
    index_path = ROOT / "comunicados" / "index.html"
    index = index_path.read_text(encoding="utf-8")
    marker = re.compile(r"<!-- COMUNICADOS:INDEX:START -->[\s\S]*?<!-- COMUNICADOS:INDEX:END -->")
    if len(marker.findall(index)) != 1:
        raise ValueError("comunicados/index.html must contain exactly one generated index marker pair")
    ordered = [all_posts[slug] for slug in slugs]
    ordered.sort(key=lambda post: str(post.get("editorial_date") or post.get("publication_date") or post.get("date") or ""), reverse=True)
    cards = "\n".join(render_card(post, str(post["slug"])) for post in ordered)
    block = '<!-- COMUNICADOS:INDEX:START -->\n    <section class="section"><div class="wrap"><div class="grid">\n' + cards + '\n</div></div></section>\n    <!-- COMUNICADOS:INDEX:END -->'
    if not pages_only and not check:
        index_path.write_text(marker.sub(lambda _: block, index), encoding="utf-8")

    outputs: list[Path] = [] if pages_only else [index_path]
    for slug in slugs:
        post = all_posts[slug]
        content_file = post.get("content_file")
        if content_file and not (ROOT / content_file).is_file():
            raise ValueError(f"Source content file is missing for {slug}: {content_file}")
        destination = ROOT / "comunicados" / slug / "index.html"
        page = render_page(template, post, slug)
        if check:
            if not destination.is_file() or destination.read_text(encoding="utf-8") != page:
                raise ValueError(f"Generated output is missing or stale: {destination.relative_to(ROOT)}")
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(page, encoding="utf-8")
        outputs.append(destination)
    return outputs


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pages-only", action="store_true", help="Generate only individual pages; do not rewrite source data, browser data, or the index")
    parser.add_argument("--check", action="store_true", help="Compare expected output without writing files")
    args = parser.parse_args()
    config = load_editorial_config()
    data_path = ROOT / "content" / "site.json"
    site_data = json.loads(data_path.read_text(encoding="utf-8"))
    site_data = apply_editorial_overrides(site_data, config)
    if not args.pages_only and not args.check:
        data_path.write_text(json.dumps(site_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (ROOT / "content" / "site-data.js").write_text("window.ATRAHDOM_SITE = " + json.dumps(site_data, ensure_ascii=False) + ";\n", encoding="utf-8")
        write_browser_config(config)
    outputs = generate_comunicados_pages(site_data, config, check=args.check, pages_only=args.pages_only)
    print(f"{'Checked' if args.check else 'Generated'} {len(config.get('communication_slugs', []))} comunicado pages" + ("; catalog and data files untouched" if args.pages_only or args.check else f" and updated {outputs[0].relative_to(ROOT)}"))

    from scripts.generate_search_index import generate as generate_search
    generate_search(check=args.check)


if __name__ == "__main__":
    main()
