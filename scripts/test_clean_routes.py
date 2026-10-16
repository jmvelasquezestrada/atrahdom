"""Read-only integrity checks for the clean legacy-route conversion."""
from __future__ import annotations
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE="https://www.atrahdom.org"
ROUTES={
    "sitradom":"/sindicatos/sitradom/",
    "sitradomsa":"/sindicatos/sitradomsa/",
    "nuevo-sindicato-de-trabajadoras-domesticas-similares-y-a-cuenta-propia-sitradomsa":"/sindicatos/nuevo-sindicato-de-trabajadoras-domesticas-similares-y-a-cuenta-propia-sitradomsa/",
    "sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom":"/sindicatos/sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom/",
}
STATIC=["/sindicatos/","/solicita-apoyo/","/afiliate/"]

def displayed_date_key(value: str) -> tuple[int,int,int]:
    value=value.strip()
    if re.fullmatch(r"\d{4}",value): return (int(value),1,1)
    iso=re.match(r"^(\d{4})-(\d{2})-(\d{2})",value)
    if iso: return tuple(map(int,iso.groups()))
    spanish=re.match(r"^(\d{1,2}) de ([^\W\d_]+) de (\d{4})$",value,re.I)
    if spanish:
        months={name:index for index,name in enumerate("enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split(),1)}
        month=months.get(spanish.group(2).casefold())
        if month: return (int(spanish.group(3)),month,int(spanish.group(1)))
    return (0,0,0)

def main() -> None:
    site=json.loads((ROOT/"content/site.json").read_text(encoding="utf-8"))
    data=json.loads((ROOT/"content/search-index.json").read_text(encoding="utf-8"))
    records={p["slug"]:p for p in [*site["pages"],*site["posts"]]}
    indexed={p["slug"]:p for p in data["records"]}
    for slug,route in ROUTES.items():
        source=records[slug]
        assert source["local_route"]==route and source["canonical_url"]==BASE+route
        assert source.get("legacy_local_route","").startswith("#/")
        assert indexed[slug]["local_route"]==route
        path=ROOT/route.strip("/")/"index.html"
        page=path.read_text(encoding="utf-8")
        assert page.count(f'<link rel="canonical" href="{BASE+route}">')==1
        assert page.count(f'<meta property="og:url" content="{BASE+route}">')==1
        assert "noindex" not in page.lower()
        body=source.get("content_html") or (ROOT/source["content_file"]).read_text(encoding="utf-8")
        assert body in page, f"Source content drift for {slug}"
        if source.get("type")=="post":
            assert "Cita sugerida (datos disponibles)" in page
            assert not re.search(r"Cita sugerida[^<]*</strong></p><blockquote>[^<]*\(\d{4}-\d{2}-\d{2}T",page)
            assert not re.search(r"<p class=\"eyebrow\">[^<]*<h1",page)
    for route in STATIC:
        page=(ROOT/route.strip("/")/"index.html").read_text(encoding="utf-8")
        assert page.count(f'<link rel="canonical" href="{BASE+route}">')==1
        assert page.count(f'<meta property="og:url" content="{BASE+route}">')==1
        assert route in {r["local_route"] for r in data["records"]}
    support=(ROOT/"solicita-apoyo/index.html").read_text(encoding="utf-8")
    assert all(f"PASO {n}" in support for n in range(1,4))
    assert "Los detalles de cada paso deben ser validados" not in support
    union_index=(ROOT/"sindicatos/index.html").read_text(encoding="utf-8")
    assert "<h1>Sindicatos</h1>" in union_index
    assert "Instituciones sindicales" not in union_index
    assert '<article class="card org-index-card">' not in union_index
    assert "Publicaciones históricas relacionadas con SITRADOM y SITRADOMSA" in union_index
    history_section=union_index.split('<section class="historical-publications">',1)[1]
    history_cards=re.findall(r'<article class="card">[\s\S]*?</article>',history_section)
    assert len(history_cards)==7,f"Expected all seven related historical publication cards, found {len(history_cards)}"
    card_dates=[]
    for card in history_cards:
        meta=re.search(r'<div class="meta">([\s\S]*?)</div>',card).group(1)
        dates=[displayed_date_key(value) for value in re.findall(r'<span>(.*?)</span>',meta)]
        dates=[value for value in dates if value!=(0,0,0)]
        assert dates,f"Missing date in historical card: {card[:160]}"
        card_dates.append(dates[0])
    assert card_dates==sorted(card_dates,reverse=True),f"Historical cards are not newest-first: {card_dates}"
    acta=next(card for card in history_cards if "Primera Acta Constitutiva del SITRADOMSA" in card)
    logo='assets/images/cropped-atrahdom-logo-2019-91a74affa5.png'
    assert f'src="{logo}"' in acta and (ROOT/logo).is_file()
    sitradom_page=(ROOT/"sindicatos/sitradom/index.html").read_text(encoding="utf-8")
    assert "<h1>SITRADOM</h1>" in sitradom_page and "<div class=\"org-card\">" not in sitradom_page
    js=("const fs=require('fs'),vm=require('vm');const x={window:{}};"
        "vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),x);"
        "process.stdout.write(JSON.stringify(x.window.ATRAHDOM_BLOG||[]));")
    blog_records=json.loads(subprocess.run(["node","-e",js,str(ROOT/"content/blog-posts.js")],check=True,capture_output=True,text=True).stdout)
    union_sources=[*site["posts"],*blog_records]
    for slug in ["sitradomsa","sitradomsa-2011","nuevo-sindicato-de-trabajadoras-domesticas-similares-y-a-cuenta-propia-sitradomsa","sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom"]:
        source=next((p for p in union_sources if p.get("slug")==slug),None)
        assert source and source.get("title")
        assert source["slug"] in indexed
        assert source["title"] in union_index
        target=source.get("local_route")
        if target and target.startswith("/"):
            assert (ROOT/target.strip("/")/"index.html").is_file() or target.startswith("/blog/")
    affiliate=(ROOT/"afiliate/index.html").read_text(encoding="utf-8")
    assert "<h1>Afíliate y participa</h1>" in affiliate
    assert all(text in affiliate for text in ["Trabajadora afiliada","Organización aliada","Voluntariado y colaboración"])
    affiliate_cards=re.findall(r'<article class="affiliate-card[^\"]*"',affiliate)
    assert len(affiliate_cards)==3 and all("reveal" not in card for card in affiliate_cards)
    assert all(url in affiliate for url in ["mailto:coordinacion@atrahdom.org?subject=Quiero%20afiliarme","mailto:coordinacion@atrahdom.org?subject=Proponer%20alianza","mailto:coordinacion@atrahdom.org?subject=Quiero%20colaborar"])
    alias=(ROOT/"blog/sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom/index.html").read_text(encoding="utf-8")
    assert f'<link rel="canonical" href="{BASE+ROUTES["sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom"]}">' in alias
    assert 'name="robots" content="noindex,follow"' in alias
    assert 'http-equiv="refresh"' in alias
    ns={"s":"http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemap=ET.parse(ROOT/"sitemap.xml").getroot()
    urls=[e.text for e in sitemap.findall("s:url/s:loc",ns)]
    assert len(urls)==len(set(urls)),"Duplicate sitemap URLs"
    expected={BASE+r for r in [*STATIC,*ROUTES.values()]}
    assert expected.issubset(set(urls))
    assert BASE+"/blog/sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom/" not in urls
    for url in expected:
        rel=url.removeprefix(BASE+"/")
        assert (ROOT/rel/"index.html").is_file(),f"Missing sitemap target: {url}"
    app=(ROOT/"app.js").read_text(encoding="utf-8")
    for old,new in {"/organizaciones":"/sindicatos/","/ayuda":"/solicita-apoyo/","/participa":"/afiliate/"}.items():
        assert f"'{old}':'{new}'" in app
    for slug,route in ROUTES.items():
        legacy=records[slug].get("legacy_local_route","").lstrip("#")
        assert f"'{legacy}':'{route}'" in app
    assert "if(cleanLegacyRoutes[old]){location.replace(cleanLegacyRoutes[old]);return;}" in app
    print(f"Clean route integrity passed: {len(STATIC)} section pages, {len(ROUTES)} record pages, {len(urls)} unique sitemap URLs")

if __name__=="__main__": main()
