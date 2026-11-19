"""Apply maintained editorial decisions to the generated ATRAHDOM catalog."""

from __future__ import annotations

import json
import re
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
    cendoc_descriptions = config.get("cendoc_description_overrides", {})
    cendoc_citations = config.get("cendoc_citation_overrides", {})
    cendoc_citation_authors = config.get("cendoc_citation_author_overrides", {})
    seo_titles = config.get("communication_seo_title_overrides", {})
    cendoc_seo_titles = config.get("cendoc_seo_title_overrides", {})
    omit_social_image = set(config.get("communication_omit_social_image_slugs", []))
    raw_cendoc_social_image_omissions = config.get("cendoc_omit_social_image_slugs", [])
    if not isinstance(raw_cendoc_social_image_omissions, list) or any(
        not isinstance(slug, str) or not slug for slug in raw_cendoc_social_image_omissions
    ):
        raise ValueError("cendoc_omit_social_image_slugs must be a list of nonempty slugs")
    cendoc_social_image_omissions = set(raw_cendoc_social_image_omissions)
    if not isinstance(descriptions, dict):
        raise ValueError("communication_description_overrides must be an object")
    unknown_descriptions = set(descriptions) - communication_slugs
    if unknown_descriptions:
        raise ValueError(f"Communication descriptions reference non-communication records: {sorted(unknown_descriptions)}")
    if not isinstance(cendoc_descriptions, dict):
        raise ValueError("cendoc_description_overrides must be an object")
    cendoc_excluded = set(config.get("cendoc_excluded_slugs", []))
    unknown_cendoc_descriptions = set(cendoc_descriptions) - set(by_slug)
    excluded_cendoc_descriptions = set(cendoc_descriptions) & cendoc_excluded
    if unknown_cendoc_descriptions or excluded_cendoc_descriptions:
        raise ValueError(
            "CENDOC descriptions reference unknown or excluded records: "
            f"{sorted(unknown_cendoc_descriptions | excluded_cendoc_descriptions)}"
        )
    if not isinstance(cendoc_citations, dict):
        raise ValueError("cendoc_citation_overrides must be an object")
    unknown_cendoc_citations = set(cendoc_citations) - set(by_slug)
    communication_cendoc_citations = set(cendoc_citations) & communication_slugs
    if unknown_cendoc_citations or communication_cendoc_citations:
        raise ValueError(
            "CENDOC citation overrides reference unknown or communication records: "
            f"{sorted(unknown_cendoc_citations | communication_cendoc_citations)}"
        )
    for slug, citation in cendoc_citations.items():
        if not isinstance(citation, dict) or not all(
            isinstance(citation.get(field), str) and citation[field].strip()
            for field in ("author", "date", "title")
        ):
            raise ValueError(f"CENDOC citation override is incomplete for {slug}")
    if not isinstance(cendoc_citation_authors, dict):
        raise ValueError("cendoc_citation_author_overrides must be an object")
    unknown_cendoc_citation_authors = set(cendoc_citation_authors) - set(by_slug)
    communication_cendoc_citation_authors = set(cendoc_citation_authors) & communication_slugs
    invalid_cendoc_citation_authors = set()
    for slug, citation_authors in cendoc_citation_authors.items():
        if not isinstance(citation_authors, dict):
            invalid_cendoc_citation_authors.add(slug)
            continue
        authors = citation_authors.get("authors")
        source_url = citation_authors.get("source_url")
        if (
            not isinstance(authors, list)
            or not authors
            or not isinstance(source_url, str)
            or not source_url.startswith("https://")
        ):
            invalid_cendoc_citation_authors.add(slug)
            continue
        for author in authors:
            if (
                not isinstance(author, dict)
                or not isinstance(author.get("family"), str)
                or not author["family"].strip()
                or not isinstance(author.get("initials"), list)
                or not author["initials"]
                or any(
                    not isinstance(initial, str)
                    or len(initial) != 2
                    or not initial[0].isalpha()
                    or initial[1] != "."
                    for initial in author["initials"]
                )
            ):
                invalid_cendoc_citation_authors.add(slug)
                break
    if unknown_cendoc_citation_authors or communication_cendoc_citation_authors or invalid_cendoc_citation_authors:
        raise ValueError(
            "CENDOC citation-author overrides reference unknown, communication, or invalid records: "
            f"{sorted(unknown_cendoc_citation_authors | communication_cendoc_citation_authors | invalid_cendoc_citation_authors)}"
        )
    if not isinstance(cendoc_seo_titles, dict):
        raise ValueError("cendoc_seo_title_overrides must be an object")
    unknown_cendoc_seo_titles = set(cendoc_seo_titles) - set(by_slug)
    communication_cendoc_seo_titles = set(cendoc_seo_titles) & communication_slugs
    if unknown_cendoc_seo_titles or communication_cendoc_seo_titles:
        raise ValueError(
            "CENDOC SEO titles reference unknown or communication records: "
            f"{sorted(unknown_cendoc_seo_titles | communication_cendoc_seo_titles)}"
        )
    if not isinstance(seo_titles, dict):
        raise ValueError("communication_seo_title_overrides must be an object")
    unknown_seo_titles = set(seo_titles) - communication_slugs
    if unknown_seo_titles:
        raise ValueError(f"Communication SEO titles reference non-communication records: {sorted(unknown_seo_titles)}")
    unknown_image_omissions = omit_social_image - communication_slugs
    if unknown_image_omissions:
        raise ValueError(f"Social-image omissions reference non-communication records: {sorted(unknown_image_omissions)}")
    cendoc_excluded = set(config.get("cendoc_excluded_slugs", []))
    cendoc_standalone = set(config.get("cendoc_standalone_slugs", []))
    known_cendoc_details = {
        slug
        for slug, post in by_slug.items()
        if post.get("attachments")
        or any(
            re.search(r"document|publicaciones propias|investig|informe|manual|tesis", str(category), re.I)
            for category in post.get("categories") or []
            if isinstance(category, str)
        )
    } | cendoc_standalone
    unknown_cendoc_image_omissions = cendoc_social_image_omissions - set(by_slug)
    non_cendoc_image_omissions = cendoc_social_image_omissions - known_cendoc_details
    excluded_cendoc_image_omissions = cendoc_social_image_omissions & (
        (cendoc_excluded - cendoc_standalone) | communication_slugs | protected
    )
    if unknown_cendoc_image_omissions or non_cendoc_image_omissions or excluded_cendoc_image_omissions:
        raise ValueError(
            "CENDOC social-image omissions reference unknown, non-CENDOC, or excluded records: "
            f"{sorted(unknown_cendoc_image_omissions | non_cendoc_image_omissions | excluded_cendoc_image_omissions)}"
        )
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

    for slug, description in cendoc_descriptions.items():
        if not isinstance(description, str) or not description.strip():
            raise ValueError(f"CENDOC description is empty or invalid for {slug}")
        by_slug[slug]["excerpt_html"] = description.strip()

    for slug, citation in cendoc_citations.items():
        by_slug[slug]["editorial_citation_override"] = citation

    for slug, citation_authors in cendoc_citation_authors.items():
        by_slug[slug]["editorial_citation_authors"] = citation_authors["authors"]

    for slug, seo_title in cendoc_seo_titles.items():
        if not isinstance(seo_title, str) or not seo_title.strip() or len(seo_title.strip()) > 90:
            raise ValueError(f"CENDOC SEO title is empty or exceeds 90 characters for {slug}")
        by_slug[slug]["editorial_seo_title"] = seo_title.strip()

    for slug, seo_title in seo_titles.items():
        if not isinstance(seo_title, str) or not seo_title.strip():
            raise ValueError(f"Communication SEO title is empty or invalid for {slug}")
        by_slug[slug]["editorial_seo_title"] = seo_title.strip()

    for slug in omit_social_image:
        by_slug[slug]["editorial_omit_social_image"] = True

    for slug in cendoc_social_image_omissions:
        by_slug[slug]["editorial_remove_social_image"] = True

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
