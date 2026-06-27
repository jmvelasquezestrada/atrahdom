from __future__ import annotations

from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
import json
import re

ROOT = Path(__file__).resolve().parent
CONTENT_DIR = ROOT / "content"
INVENTORY_DIR = ROOT / "inventory"


class StructuralParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.text: list[str] = []
        self.headings = 0
        self.paragraphs = 0
        self.lists = 0
        self.links = 0
        self.images = 0
        self.tables = 0
        self.figures = 0
        self.iframes = 0
        self.attachments = 0

    def handle_starttag(self, tag: str, attrs_raw: list[tuple[str, str | None]]) -> None:
        attrs = {name.lower(): value or "" for name, value in attrs_raw}
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self.headings += 1
        elif tag == "p":
            self.paragraphs += 1
        elif tag in {"ul", "ol"}:
            self.lists += 1
        elif tag == "a":
            self.links += 1
            href = attrs.get("href", "").lower()
            if re.search(r"\.(pdf|docx?|pptx?|xlsx?|zip)(?:$|[?#])", href):
                self.attachments += 1
        elif tag == "img":
            self.images += 1
        elif tag == "table":
            self.tables += 1
        elif tag == "figure":
            self.figures += 1
        elif tag == "iframe":
            self.iframes += 1

    def handle_data(self, data: str) -> None:
        cleaned = re.sub(r"\s+", " ", unescape(data)).strip()
        if cleaned:
            self.text.append(cleaned)

    @property
    def normalized_text(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self.text)).strip()

    def metrics(self) -> dict[str, int]:
        return {
            "headings": self.headings,
            "paragraphs": self.paragraphs,
            "lists": self.lists,
            "links": self.links,
            "images": self.images,
            "tables": self.tables,
            "figures": self.figures,
            "iframes": self.iframes,
            "attachments": self.attachments,
            "text_length": len(self.normalized_text),
            "word_count": len(self.normalized_text.split()),
        }


def parse_html(html: str) -> StructuralParser:
    parser = StructuralParser()
    parser.feed(html)
    parser.close()
    return parser


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def compare_item(item: dict[str, Any]) -> dict[str, Any]:
    original_url = item.get("final_url") or item.get("original_url", "")
    raw_file = ROOT / item.get("raw_file", "")
    content_file = ROOT / item.get("content_file", "")
    result = {
        "original_url": original_url,
        "local_route": item.get("local_route", ""),
        "title_match": bool(item.get("title")),
        "date_match": bool(item.get("publication_date")) or item.get("type") == "home",
        "user_match": bool(item.get("wordpress_user")) or item.get("type") in {"home", "page"},
        "text_match": False,
        "image_count_match": False,
        "attachment_count_match": False,
        "link_count_match": False,
        "structure_match": False,
        "visual_review": "not_started",
        "notes": "",
        "verified_at": "",
        "status": "needs_review",
        "source_metrics": {},
        "local_metrics": {},
    }
    if not raw_file.exists() or not content_file.exists():
        result["notes"] = "Falta raw_file o content_file."
        return result

    # Raw HTML contains the entire WordPress page. Use the extracted body stored in content_html
    # as the source for literal comparison, and the written local file as the rendered target.
    source_html = item.get("content_html", "")
    local_html = content_file.read_text(encoding="utf-8")
    source = parse_html(source_html)
    local = parse_html(local_html)
    source_text = source.normalized_text
    local_text = local.normalized_text
    source_metrics = source.metrics()
    local_metrics = local.metrics()

    result["source_metrics"] = source_metrics
    result["local_metrics"] = local_metrics
    result["text_match"] = source_text == local_text and bool(source_text)
    result["image_count_match"] = source_metrics["images"] == local_metrics["images"]
    result["attachment_count_match"] = source_metrics["attachments"] == local_metrics["attachments"]
    result["link_count_match"] = source_metrics["links"] == local_metrics["links"]
    result["structure_match"] = all(
        source_metrics[key] == local_metrics[key]
        for key in ("headings", "paragraphs", "lists", "tables", "figures", "iframes")
    )

    automated_ok = all(
        result[key]
        for key in (
            "title_match",
            "date_match",
            "user_match",
            "text_match",
            "image_count_match",
            "attachment_count_match",
            "link_count_match",
            "structure_match",
        )
    )
    result["status"] = "needs_visual_review" if automated_ok else "needs_review"
    if automated_ok:
        result["notes"] = "Comparación estructural automática aprobada; falta revisión visual manual."
    else:
        differences = [key for key in ("text_match", "image_count_match", "attachment_count_match", "link_count_match", "structure_match") if not result[key]]
        result["notes"] = "Diferencias automáticas: " + ", ".join(differences)
    return result


def main() -> None:
    items_path = CONTENT_DIR / "items.json"
    if not items_path.exists():
        raise SystemExit("No existe content/items.json. Ejecuta primero migrate_content.py")
    items = load_json(items_path)
    results = [compare_item(item) for item in items if item.get("migration_status") == "rendered"]
    write_json(INVENTORY_DIR / "verification.json", results)

    summary = {
        "total_rendered": len(results),
        "needs_visual_review": sum(1 for item in results if item["status"] == "needs_visual_review"),
        "needs_review": sum(1 for item in results if item["status"] == "needs_review"),
        "verified": sum(1 for item in results if item["status"] == "verified"),
    }
    write_json(CONTENT_DIR / "verification-summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
