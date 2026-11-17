"""Apply maintained editorial decisions to the generated ATRAHDOM catalog."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "content" / "editorial-config.json"


def load_editorial_config() -> dict[str, Any]:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def apply_editorial_overrides(site_data: dict[str, Any], config: dict[str, Any] | None = None) -> dict[str, Any]:
    """Apply only reviewed bibliographic fields; never rewrite historical categories or content."""
    config = config or load_editorial_config()
    posts = site_data.setdefault("posts", [])
    by_slug = {str(post.get("slug", "")): post for post in posts}

    protected = set(config.get("manual_excluded_slugs", []))
    no_metadata = set(config.get("bibliography_excluded_slugs", []))
    overrides = config.get("bibliography_overrides", {})
    communication_slugs = set(config.get("communication_slugs", []))
    descriptions = config.get("communication_description_overrides", {})
    seo_titles = config.get("communication_seo_title_overrides", {})
    omit_social_image = set(config.get("communication_omit_social_image_slugs", []))
    if not isinstance(descriptions, dict):
        raise ValueError("communication_description_overrides must be an object")
    unknown_descriptions = set(descriptions) - communication_slugs
    if unknown_descriptions:
        raise ValueError(f"Communication descriptions reference non-communication records: {sorted(unknown_descriptions)}")
    if not isinstance(seo_titles, dict):
        raise ValueError("communication_seo_title_overrides must be an object")
    unknown_seo_titles = set(seo_titles) - communication_slugs
    if unknown_seo_titles:
        raise ValueError(f"Communication SEO titles reference non-communication records: {sorted(unknown_seo_titles)}")
    unknown_image_omissions = omit_social_image - communication_slugs
    if unknown_image_omissions:
        raise ValueError(f"Social-image omissions reference non-communication records: {sorted(unknown_image_omissions)}")
    if protected.intersection(overrides):
        raise ValueError(f"Manual-review slugs must not have automatic bibliographic overrides: {sorted(protected.intersection(overrides))}")

    missing = (set(config.get("communication_slugs", [])) | set(overrides)) - set(by_slug)
    if missing:
        raise ValueError(f"Editorial configuration references missing site records: {sorted(missing)}")

    for slug, values in overrides.items():
        if slug in no_metadata or slug in protected:
            continue
        post = by_slug[slug]
        if values.get("title"):
            post["title"] = values["title"]
        post["editorial_metadata_reviewed"] = True
        post["editorial_author"] = values.get("author") or ""
        if values.get("citation_title"):
            post["editorial_citation_title"] = values["citation_title"]
        else:
            post.pop("editorial_citation_title", None)
        if values.get("citation_url"):
            post["editorial_citation_url"] = values["citation_url"]
        post["editorial_date"] = values.get("date") or None
        post["editorial_institutions"] = values.get("institutions") or ""
        post["editorial_identifier"] = values.get("identifier")
        # Categories, original publication dates, content, routes and source metadata stay intact.

    for slug, description in descriptions.items():
        if not isinstance(description, str) or not description.strip():
            raise ValueError(f"Communication description is empty or invalid for {slug}")
        by_slug[slug]["excerpt_html"] = description.strip()

    for slug, seo_title in seo_titles.items():
        if not isinstance(seo_title, str) or not seo_title.strip():
            raise ValueError(f"Communication SEO title is empty or invalid for {slug}")
        by_slug[slug]["editorial_seo_title"] = seo_title.strip()

    for slug in omit_social_image:
        by_slug[slug]["editorial_omit_social_image"] = True

    site_data["editorial"] = {
        "communication_slugs": list(config.get("communication_slugs", [])),
        "communication_excluded_slugs": list(config.get("communication_excluded_slugs", [])),
        "cendoc_excluded_slugs": list(config.get("cendoc_excluded_slugs", [])),
        "homepage_cendoc_excluded_slugs": list(config.get("homepage_cendoc_excluded_slugs", [])),
        "manual_excluded_slugs": list(config.get("manual_excluded_slugs", [])),
    }
    return site_data


def write_browser_config(config: dict[str, Any] | None = None) -> None:
    config = config or load_editorial_config()
    out = ROOT / "content" / "editorial-data.js"
    browser_config = {key: value for key, value in config.items() if key not in {"source_workbook", "source_sheet"}}
    out.write_text("window.ATRAHDOM_EDITORIAL = " + json.dumps(browser_config, ensure_ascii=False) + ";\n", encoding="utf-8")


def site_config(config: dict[str, Any]) -> dict[str, Any]:
    return {
        "communication_slugs": config.get("communication_slugs", []),
        "communication_excluded_slugs": config.get("communication_excluded_slugs", []),
        "cendoc_excluded_slugs": config.get("cendoc_excluded_slugs", []),
        "homepage_cendoc_excluded_slugs": config.get("homepage_cendoc_excluded_slugs", []),
        "manual_excluded_slugs": config.get("manual_excluded_slugs", []),
    }
