"""Generate static clean URL pages for the approved legacy-route conversion."""
from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from editorial_data import apply_editorial_overrides  # noqa: E402

BASE = "https://www.atrahdom.org"
RECORDS = {
    "sitradom": "/sindicatos/sitradom/",
    "sitradomsa": "/sindicatos/sitradomsa/",
    "nuevo-sindicato-de-trabajadoras-domesticas-similares-y-a-cuenta-propia-sitradomsa": "/sindicatos/nuevo-sindicato-de-trabajadoras-domesticas-similares-y-a-cuenta-propia-sitradomsa/",
    "sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom": "/sindicatos/sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom/",
}
BLOG_ALIAS = "blog/sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom/"
STATIC = {
    "/sindicatos/": ("Sindicatos", "Publicaciones y documentos históricos relacionados con SITRADOM y SITRADOMSA.", "Índice sindical", ""),
    "/solicita-apoyo/": ("Solicita apoyo", "Canales actuales de contacto y pasos de orientación laboral de ATRAHDOM.", "Acompañamiento laboral", "Orientación y acompañamiento jurídico para trabajadoras del hogar, a domicilio y de maquila."),
    "/afiliate/": ("Afíliate y participa", "Hay varias formas de sumarse a ATRAHDOM y a los sindicatos de trabajadoras del hogar.", "Organización y participación", "Hay varias formas de sumarse a ATRAHDOM y a los sindicatos de trabajadoras del hogar."),
}


class Text(HTMLParser):
    def __init__(self, source: str):
        super().__init__(convert_charrefs=True); self.parts=[]; self.feed(source)
    def handle_data(self, data: str): self.parts.append(data)


def plain(value: str) -> str:
    parser=Text(value or "")
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()


def date_display(value: str) -> str:
    m=re.match(r"^(\d{4})-(\d{2})-(\d{2})", str(value or ""))
    if not m: return str(value or "")
    y,mo,d=map(int,m.groups()); months="enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split()
    return f"{d} de {months[mo-1]} de {y}"


def date_sort_key(post: dict) -> tuple[int,int,int]:
    value=str(post.get("editorial_date") if post.get("editorial_metadata_reviewed") and post.get("editorial_date") else post.get("publication_date") or post.get("date") or "").strip()
    if re.fullmatch(r"\d{4}",value): return (int(value),1,1)
    iso=re.match(r"^(\d{4})-(\d{2})-(\d{2})",value)
    if iso: return tuple(map(int,iso.groups()))
    spanish=re.match(r"^(\d{1,2}) de ([^\W\d_]+) de (\d{4})$",value,re.I)
    if spanish:
        months={name:index for index,name in enumerate("enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split(),1)}
        month=months.get(spanish.group(2).casefold())
        if month: return (int(spanish.group(3)),month,int(spanish.group(1)))
    return (0,0,0)


def blog_posts() -> list[dict]:
    source=ROOT/"content"/"blog-posts.js"
    script=("const fs=require('fs'),vm=require('vm');const box={window:{}};"
            "vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),box);"
            "process.stdout.write(JSON.stringify(box.window.ATRAHDOM_BLOG||[]));")
    try:
        result=subprocess.run(["node","-e",script,str(source)],cwd=ROOT,check=True,capture_output=True,text=True)
        records=json.loads(result.stdout)
    except (OSError,subprocess.CalledProcessError,json.JSONDecodeError) as exc:
        raise ValueError(f"Could not read content/blog-posts.js: {exc}") from exc
    for post in records:
        post.setdefault("type","post")
        post.setdefault("categories",[])
        post["categories"]=list(dict.fromkeys(["Blog",*post["categories"]]))
        post.setdefault("local_route",f"#/post/{post.get('slug','')}")
    return records


def historical_union_posts(data: dict, blogs: list[dict]) -> list[dict]:
    posts=[{**post,"type":"post"} for post in data.get("posts",[])]
    posts.extend(post for post in blogs if not any(
        existing.get("slug")==post.get("slug") or
        (existing.get("local_route") and existing.get("local_route")==post.get("local_route"))
        for existing in posts))
    result=[]
    for post in posts:
        categories=post.get("categories") or []
        if post.get("slug")=="revista-sindical-sitradom":
            continue
        if re.search("sitradom",str(post.get("slug") or ""),re.I) or any(re.search("sitradom",str(cat),re.I) for cat in categories):
            result.append(post)
    return sorted(result,key=date_sort_key,reverse=True)


def historical_cards(posts: list[dict]) -> str:
    cards=[]
    for post in posts:
        categories=post.get("categories") or []
        category=str(categories[0]) if categories else "Archivo"
        date=str(post.get("editorial_date") if post.get("editorial_metadata_reviewed") and post.get("editorial_date") else post.get("publication_date") or post.get("date") or "")
        author=str(post.get("editorial_author") or "") if post.get("editorial_metadata_reviewed") else str(post.get("wordpress_user") or post.get("internal_author") or "")
        excerpt=str(post.get("excerpt_html") or "")
        if not excerpt:
            body=str(post.get("content_html") or "")
            if not body and post.get("content_file"):
                source=ROOT/str(post["content_file"])
                if source.is_file(): body=source.read_text(encoding="utf-8")
            excerpt=body
        summary=plain(excerpt)
        if len(summary)>190: summary=summary[:190].rsplit(" ",1)[0].rstrip(" ,;:")+"…"
        route=str(post.get("local_route") or post.get("legacy_local_route") or "")
        if route.startswith("#/"): route="/"+route
        if not route: route="/#/post/"+str(post.get("slug") or "")
        image=post.get("featured_image")
        if not image:
            images=post.get("images") or []
            image=images[0] if isinstance(images,list) and images else images if isinstance(images,str) else ""
        image=str(image or "assets/images/cropped-atrahdom-logo-2019-91a74affa5.png")
        media=f'<div class="card-media"><img src="{html.escape(image,quote=True)}" alt="" loading="lazy" decoding="async"></div>'
        meta=f'<div class="meta"><span>{html.escape(category)}</span>{f"<span>{html.escape(date_display(date))}</span>" if date else ""}{f"<span>Por {html.escape(author)}</span>" if author else ""}</div>'
        cards.append(f'<article class="card">{media}<div class="card-body">{meta}<h3>{html.escape(str(post.get("title") or "Sin título"))}</h3><p>{html.escape(summary)}</p><a class="read" href="{html.escape(route,quote=True)}">Leer contenido completo →</a></div></article>')
    return "".join(cards)


def institution_cards(data: dict) -> str:
    records={post.get("slug"):post for post in [*data.get("pages",[]),*data.get("posts",[])]}
    labels={"sitradom":"SITRADOM","sitradomsa":"SITRADOMSA"}
    cards=[]
    for slug,label in labels.items():
        if slug not in RECORDS or slug not in records:
            raise ValueError(f"Missing institutional record: {slug}")
        route=RECORDS[slug]
        card=f'<article class="card org-index-card"><div class="card-body"><p class="eyebrow">Ficha institucional</p><h3>{label}</h3><a class="read" href="{route}">Ver ficha institucional →</a></div></article>'
        cards.append((date_sort_key(records[slug]),card))
    cards.sort(key=lambda item:item[0],reverse=True)
    return "".join(card for _,card in cards)


def template() -> str:
    path=ROOT/"templates"/"clean-route-page.html"
    if not path.is_file(): raise ValueError("Missing templates/clean-route-page.html")
    return path.read_text(encoding="utf-8")


def page_shell(tpl: str, title: str, desc: str, canonical: str, main: str, schema: dict | None=None) -> str:
    social_type="article" if schema else "website"
    tags=(f'<meta name="description" content="{html.escape(desc, quote=True)}">\n'
          f'<title>{html.escape(title)} | ATRAHDOM</title>\n'
          f'<link rel="canonical" href="{canonical}">\n'
          f'<meta property="og:title" content="{html.escape(title, quote=True)} | ATRAHDOM">\n'
          f'<meta property="og:description" content="{html.escape(desc, quote=True)}">\n'
          f'<meta property="og:url" content="{canonical}">\n'
          f'<meta property="og:type" content="{social_type}">\n'
          f'<meta name="twitter:card" content="summary">\n'
          f'<meta name="twitter:title" content="{html.escape(title, quote=True)} | ATRAHDOM">\n'
          f'<meta name="twitter:description" content="{html.escape(desc, quote=True)}">')
    if schema: tags += '\n<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False,separators=(",",":"))+'</script>'
    result=tpl.replace("{{SEO}}",tags).replace("{{CANONICAL}}",canonical).replace("{{MAIN}}",main)
    if "{{" in result: raise ValueError("Unresolved clean route template marker")
    return result


def render_static(tpl: str, path: str, title: str, desc: str, eyebrow: str, intro: str, body: str) -> str:
    canonical=BASE+path
    intro_html=f'<p>{html.escape(intro)}</p>' if intro else ""
    main=f'<main id="contenido" tabindex="-1"><section class="page-hero"><div class="wrap"><p class="eyebrow">{html.escape(eyebrow)}</p><h1>{html.escape(title)}</h1>{intro_html}</div></section><section class="section"><div class="wrap">{body}</div></section></main>'
    return page_shell(tpl,title,desc,canonical,main,{
      "@context":"https://schema.org","@type":"WebPage","name":title,"description":desc,"url":canonical,
      "isPartOf":{"@id":BASE+"/#website"},"publisher":{"@id":BASE+"/#organization"}})


def render_record(tpl: str, post: dict, slug: str) -> str:
    route=RECORDS[slug]; canonical=BASE+route; title=str(post.get("title") or slug)
    body=str(post.get("content_html") or "")
    if not body and post.get("content_file"):
        body=(ROOT/str(post["content_file"])).read_text(encoding="utf-8")
    if not body.strip(): raise ValueError(f"No source content for {slug}")
    date=str(post.get("editorial_date") if post.get("editorial_metadata_reviewed") and post.get("editorial_date") else post.get("publication_date") or post.get("date") or "")
    author=str(post.get("editorial_author") or "") if post.get("editorial_metadata_reviewed") else str(post.get("wordpress_user") or post.get("internal_author") or "")
    cats=post.get("categories") or []
    desc=plain(str(post.get("excerpt_html") or "")) or plain(body)
    if len(desc)>180:
        desc=desc[:180].rsplit(" ",1)[0].rstrip(" ,;:")+"…"
    if slug=="sitradom":
        content=f'<article class="prose organization-page">{body}</article>'
        main=f'<main id="contenido" tabindex="-1"><section class="page-hero"><div class="wrap"><p class="eyebrow">Organización sindical</p><h1>{html.escape(title)}</h1></div></section><section class="section"><div class="wrap">{content}</div></section></main>'
    else:
        category_meta=" · ".join(f'<span class="cat-pill">{html.escape(str(c))}</span>' for c in cats) or "Archivo histórico"
        meta=f'<p class="eyebrow">{category_meta}</p><h1>{html.escape(title)}</h1><div class="meta">{f"<span>{html.escape(date_display(date))}</span>" if date else ""}{f"<span>Por {html.escape(author)}</span>" if author else ""}</div>'
        sidebar='<h3>Identificación de la publicación</h3><p><strong>Tipo:</strong><br>Publicación</p>'
        if author: sidebar+=f'<p><strong>Autoría consignada:</strong><br>{html.escape(author)}</p>'
        if date: sidebar+=f'<p><strong>Fecha:</strong><br>{html.escape(date_display(date))}</p>'
        if cats: sidebar+=f'<p><strong>Categorías:</strong><br>{html.escape(", ".join(map(str,cats)))}</p>'
        citation_year=date[:4] if re.match(r"^\d{4}",date) else date
        back_route="/blog/" if any(str(c).lower()=="blog" for c in cats) else "/"
        back_label="Volver al Blog" if back_route=="/blog/" else "Volver al inicio"
        sidebar+=f'<div class="citation-block"><p><strong>Cita sugerida (datos disponibles):</strong></p><blockquote>{(html.escape(author)+". ") if author else ""}({html.escape(citation_year)}). <em>{html.escape(title)}</em>.</blockquote></div><a href="{back_route}">← {back_label}</a>'
        main=f'<main id="contenido" tabindex="-1"><section class="page-hero"><div class="wrap">{meta}</div></section><section class="section blog-editorial-section"><div class="wrap content-layout conasso-layout"><aside class="sidebar">{sidebar}</aside><article class="prose blog-editorial">{body}</article></div></section></main>'
    schema={"@context":"https://schema.org","@type":"BlogPosting" if post.get("type")=="post" else "WebPage","headline":title,"description":desc,"url":canonical,"mainEntityOfPage":canonical,"publisher":{"@id":BASE+"/#organization"},"isPartOf":{"@id":BASE+"/#website"},"articleSection":cats}
    if date: schema["datePublished"]=date[:10] if re.match(r"^\d{4}-\d{2}-\d{2}",date) else date
    if author: schema["author"]={"@type":"Person","name":author}
    return page_shell(tpl,title,desc,canonical,main,schema)


def generated() -> dict[str,str]:
    data=json.loads((ROOT/"content/site.json").read_text(encoding="utf-8"))
    data=apply_editorial_overrides(data)
    by_slug={p.get("slug"):p for p in [*data.get("pages",[]),*data.get("posts",[])]}
    tpl=template(); outputs={}
    for route,(name,desc,eyebrow,intro) in STATIC.items():
        if route=="/sindicatos/":
            posts=historical_union_posts(data,blog_posts())
            body='<section class="historical-publications"><h2>Publicaciones históricas relacionadas con SITRADOM y SITRADOMSA</h2><div class="grid">'+historical_cards(posts)+'</div></section>'
        elif route=="/solicita-apoyo/":
            body='<div class="steps"><div class="step placeholder"><h3>PASO 1</h3><h4>Comunícate con nosotras</h4><p>Escríbenos a <a href="mailto:coordinacion@atrahdom.org">coordinacion@atrahdom.org</a> o llama al <a href="tel:+50222532382">(502) 2253 2382</a> para una primera orientación.</p></div><div class="step placeholder"><h3>PASO 2</h3><h4>Valoración del caso</h4><p>Una asesora legal evaluará tu situación laboral y determinará el tipo de acompañamiento que necesitas.</p></div><div class="step placeholder"><h3>PASO 3</h3><h4>Acompañamiento y seguimiento</h4><p>Te brindaremos acompañamiento jurídico, información sobre tus derechos y los pasos a seguir.</p></div></div>'
        else:
            icons=['<svg class="eje-icon" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M8 21h8M5 6h14"></path><path d="M7 6l-3 7a3.5 3.5 0 0 0 7 0zM17 6l-3 7a3.5 3.5 0 0 0 7 0z"></path></g></svg>','<svg class="eje-icon" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10v4l3 .8V19l3 1v-4.4L21 19V5z"></path><path d="M21 9.5a2.5 2.5 0 0 1 0 5"></path></g></svg>','<svg class="eje-icon" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9.5L12 5l10 4.5L12 14z"></path><path d="M6.5 11.5V16c0 1.2 2.5 2.5 5.5 2.5s5.5-1.3 5.5-2.5v-4.5M21 10v5"></path></g></svg>']
            body=f'<div class="affiliate-grid"><article class="affiliate-card">{icons[0]}<h3>Trabajadora afiliada</h3><p>Para trabajadoras del hogar, a domicilio y de maquila que quieren organizarse y defender sus derechos.</p><ul class="affiliate-list"><li>Acompañamiento y orientación laboral</li><li>Formación en derechos y talleres</li><li>Participación en asambleas y sindicatos</li></ul><a class="btn" href="mailto:coordinacion@atrahdom.org?subject=Quiero%20afiliarme%20%E2%80%94%20ATRAHDOM">Quiero afiliarme</a></article><article class="affiliate-card">{icons[1]}<h3>Organización aliada</h3><p>Para organizaciones, sindicatos y redes que buscan articular acciones con ATRAHDOM.</p><ul class="affiliate-list"><li>Alianzas e incidencia conjunta</li><li>Espacios de coordinación regional</li><li>Campañas y pronunciamientos</li></ul><a class="btn" href="mailto:coordinacion@atrahdom.org?subject=Proponer%20alianza%20%E2%80%94%20ATRAHDOM">Proponer alianza</a></article><article class="affiliate-card">{icons[2]}<h3>Voluntariado y colaboración</h3><p>Para personas que desean aportar tiempo, conocimiento o recursos a la causa.</p><ul class="affiliate-list"><li>Apoyo técnico y profesional</li><li>Colaboración en investigación</li><li>Difusión y solidaridad</li></ul><a class="btn" href="mailto:coordinacion@atrahdom.org?subject=Quiero%20colaborar%20%E2%80%94%20ATRAHDOM">Quiero colaborar</a></article></div><div class="placeholder affiliate-note"><h3>PLACEHOLDER</h3><p>Los requisitos, las cuotas (si las hubiera) y el proceso formal de afiliación deben ser definidos y validados por el equipo institucional de ATRAHDOM antes de publicarse.</p></div>'
        outputs[route[1:]+"index.html"]=render_static(tpl,route,name,desc,eyebrow,intro,body)
    for slug,route in RECORDS.items():
        post=by_slug.get(slug)
        if not post: raise ValueError(f"Missing site record: {slug}")
        rel=route[1:]+"index.html"; outputs[rel]=render_record(tpl,post,slug)
    # Preserve the already circulated clean Blog URL as an alias; it is not a
    # second canonical copy. The post remains listed in Blog, while its clean
    # individual URL is the approved /sindicatos/ route.
    alias_target=RECORDS["sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom"]
    alias=page_shell(tpl,"Publicación trasladada","Esta publicación tiene una nueva URL canónica.",BASE+alias_target,
        f'<main id="contenido"><section class="section"><div class="wrap"><p>Esta publicación se encuentra en <a href="{alias_target}">su nueva URL</a>.</p></div></section></main>')
    alias=alias.replace("</head>",'<meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0;url='+alias_target+'">\n</head>')
    alias=alias.replace("</body>",'<script>location.replace("'+alias_target+'");</script>\n</body>')
    outputs[BLOG_ALIAS+"index.html"]=alias
    return outputs


def main() -> int:
    parser=argparse.ArgumentParser(); parser.add_argument("--check",action="store_true"); parser.add_argument("--only",action="append",default=[],help="Generate or check only these repository-relative outputs"); args=parser.parse_args()
    outputs=generated(); stale=[]
    selected=set(args.only)
    for rel,text in outputs.items():
        if selected and rel not in selected: continue
        path=ROOT/rel
        if args.check:
            if not path.is_file() or path.read_text(encoding="utf-8")!=text: stale.append(rel)
        else:
            path.parent.mkdir(parents=True,exist_ok=True); path.write_text(text,encoding="utf-8",newline="\n")
    if stale: raise SystemExit("Stale clean route pages: "+", ".join(stale))
    count=len(selected.intersection(outputs)) if selected else len(outputs)
    if selected-selected.intersection(outputs): raise SystemExit("Unknown output(s): "+", ".join(sorted(selected-set(outputs))))
    print(("Checked" if args.check else "Generated")+f" {count} clean route pages")
    return 0

if __name__=="__main__": raise SystemExit(main())
