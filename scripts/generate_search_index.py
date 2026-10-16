"""Build only content/search-index.json; --check is read-only. No pages are regenerated."""
from __future__ import annotations
import argparse, hashlib, json, re, shutil, subprocess, sys
from html.parser import HTMLParser
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from editorial_data import apply_editorial_overrides, load_editorial_config

class Node:
    def __init__(self, tag="", attrs=(), parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []
    def find(self, predicate):
        return [n for child in self.children if isinstance(child, Node) for n in ([child] if predicate(child) else []) + child.find(predicate)]
    def text(self):
        if self.tag in {"script", "style", "nav", "header", "footer", "aside", "noscript", "template"} or self.attrs.get("aria-hidden") == "true" or "hidden" in self.attrs:
            return ""
        return " ".join(c.text() if isinstance(c, Node) else c for c in self.children)
class Tree(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True); self.root=Node(); self.current=self.root; self.feed(source)
    def handle_starttag(self, tag, attrs):
        n=Node(tag, attrs, self.current); self.current.children.append(n)
        if tag not in {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}: self.current=n
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.current.tag == tag: self.current=self.current.parent
    def handle_endtag(self, tag):
        n=self.current
        while n.parent is not None:
            if n.tag == tag: self.current=n.parent; return
            n=n.parent
    def handle_data(self, value): self.current.children.append(value)
def clean(s): return re.sub(r"\s+", " ", s).strip()
def html_text(source):
    tree=Tree(source).root
    mains=tree.find(lambda n:n.tag=="main")
    scope=mains[0] if mains else tree
    articles=scope.find(lambda n:n.tag=="article" and ("prose" in n.attrs.get("class", "").split() or "blog-editorial" in n.attrs.get("class", "").split()))
    return clean(" ".join(n.text() for n in articles) if articles else scope.text())
def title_of(source):
    h=Tree(source).root.find(lambda n:n.tag=="h1")
    return clean(h[0].text()) if h else ""
def page_metadata(source):
    result={}
    for aside in Tree(source).root.find(lambda n:n.tag=="aside"):
        for p in aside.find(lambda n:n.tag=="p"):
            label=p.find(lambda n:n.tag=="strong")
            if not label: continue
            key=clean(label[0].text()).lower().rstrip(":")
            text=clean(p.text()); value=text[len(clean(label[0].text())):].strip()
            if value: result[key]=value
    return result
def generate(check=False):
    sources={}
    def read(path):
        path=Path(path); text=(ROOT/path).read_text(encoding="utf-8-sig"); sources[path.as_posix()]=hashlib.sha256(text.encode("utf-8")).hexdigest(); return text
    raw=json.loads(read("content/site.json")); cfg=json.loads(read("content/editorial-config.json")); site=apply_editorial_overrides(raw,cfg)
    read("content/blog-posts.js")
    node=shutil.which("node")
    if not node: raise ValueError("Node.js is required to read the repository's blog catalog")
    code="const fs=require('fs'),vm=require('vm');const ctx={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),ctx);process.stdout.write(JSON.stringify(ctx.window.ATRAHDOM_BLOG));"
    blog=json.loads(subprocess.check_output([node,"-e",code,str(ROOT/"content/blog-posts.js")],text=True,encoding="utf-8"))
    excluded=set(cfg.get("cendoc_excluded_slugs",[])); comm_excluded=set(cfg.get("communication_excluded_slugs",[])); comm=set(cfg.get("communication_slugs",[]))-comm_excluded
    standalone=set(cfg.get("cendoc_standalone_slugs",[]))
    invalid_standalone=(standalone-excluded)|(standalone-comm_excluded)|(standalone&comm)
    if invalid_standalone: raise ValueError(f"Standalone CENDOC details must be excluded from both catalogs: {sorted(invalid_standalone)}")
    def cendoc(p): return p["slug"] not in excluded and (bool(p.get("attachments")) or any(re.search(r"document|publicaciones propias|investig|informe|manual|tesis",str(c),re.I) for c in p.get("categories",[])))
    static={}
    for path in sorted(ROOT.glob("**/index.html")):
        rel=path.relative_to(ROOT)
        if any(x.startswith(".") or x in {"assets","content","node_modules"} for x in rel.parts): continue
        if rel.as_posix()=="blog/sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom/index.html": continue
        if rel.as_posix()=="index.html" or len(rel.parts)==2 and rel.parts[0] in {"blog","cendoc","comunicados"}: continue
        source=read(rel); title=title_of(source)
        if title: static["/"+str(rel.parent).replace("\\","/")+"/"]=(rel,source,title)
    for path in sorted(ROOT.glob("*.html")):
        if path.name == "index.html": continue
        source=read(path.relative_to(ROOT)); title=title_of(source)
        if title: static["/"+path.name]=(path.relative_to(ROOT),source,title)
    posts=site.get("posts",[]); known={p["slug"] for p in posts}; records=[]; used=set()
    clean_routes={
        "sitradom":"/sindicatos/sitradom/",
        "sitradomsa":"/sindicatos/sitradomsa/",
        "nuevo-sindicato-de-trabajadoras-domesticas-similares-y-a-cuenta-propia-sitradomsa":"/sindicatos/nuevo-sindicato-de-trabajadoras-domesticas-similares-y-a-cuenta-propia-sitradomsa/",
        "sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom":"/sindicatos/sindicato-de-trabajadoras-domesticas-de-maquila-nexas-y-conexas-sitradom/",
    }
    for p in [*site.get("pages",[]),*posts,*[p for p in blog if p["slug"] not in known]]:
        slug=p["slug"]; collection="comunicados" if slug in comm else "cendoc" if cendoc(p) and p in posts else "blog" if "/blog/"+slug+"/" in static or slug in clean_routes and any(str(c).lower()=="blog" for c in p.get("categories",[])) else "pages" if p in site.get("pages",[]) else "archive"
        route=clean_routes.get(slug) or ("/"+collection+"/"+slug+"/" if collection in {"cendoc","comunicados","blog"} else "/cendoc/"+slug+"/" if slug in standalone and p in posts else p.get("local_route") or "#/post/"+slug)
        alias={"contactanos":"/contacto/","ejes-de-trabajo":"/que-hacemos/","organizacion":"/organizacion/","espacios-de-participacion":"/espacios-de-participacion/","sitradom":"/sindicatos/sitradom/"}
        if collection=="pages": route=alias.get(slug,route)
        body=p.get("content_html") or ""
        if route in static:
            used.add(route); body=static[route][1]
        elif p.get("content_file"):
            body_source=read(p["content_file"])
            if not body: body=body_source
        if collection in {"cendoc","comunicados"} and route not in static: raise ValueError("Missing public detail page: "+route)
        date=p.get("editorial_date") if p.get("editorial_metadata_reviewed") and p.get("editorial_date") else p.get("publication_date") or p.get("date") or ""
        author=p.get("editorial_author") if p.get("editorial_metadata_reviewed") else p.get("internal_author") or p.get("wordpress_user") or ""
        record={"slug":slug,"title":html_text(p.get("title") or ""),"local_route":route,"collection":collection,"type":"page" if collection=="pages" else "post","body":html_text(body),"description":html_text(p.get("excerpt_html") or ""),"author":author or "","institutions":p.get("editorial_institutions") or "","date":str(date),"categories":p.get("categories") or [],"keywords":p.get("tags") or [],"identifier":p.get("editorial_identifier"),"attachments":p.get("attachments") or [],"has_document":bool(p.get("attachments")) or bool(re.search(r"\.(pdf|docx?|pptx?|xlsx?)",body,re.I)),"has_video":bool(Tree(p.get("content_html") or body).root.find(lambda n:n.tag=="video" or n.tag=="iframe" and re.search(r"youtube|youtu\.be",n.attrs.get("src",""),re.I)))}
        if collection=="blog" and route in static:
            meta=page_metadata(body)
            record["author"]=meta.get("autoría") or meta.get("autora") or meta.get("autor") or record["author"]
            record["institutions"]=meta.get("institución(es)") or meta.get("institución editora") or record["institutions"]
            record["date"]=meta.get("fecha") or record["date"]
            if meta.get("categorías"): record["categories"]=[x.strip() for x in meta["categorías"].split(",")]
        records.append(record)
    for route,(rel,source,title) in static.items():
        if route in used: continue
        # Every remaining public static page is discoverable without a manual list.
        records.append({"slug":rel.stem if rel.name!="index.html" else rel.parent.name,"title":title,"local_route":route,"collection":"pages","type":"page","body":html_text(source),"description":"","categories":[]})
    routes=[p["local_route"] for p in records]
    if len(routes)!=len(set(routes)): raise ValueError("Duplicate public search routes")
    counts={c:sum(p["collection"]==c for p in records) for c in sorted({p["collection"] for p in records})}
    for collection in ["cendoc","comunicados"]:
        files={"/"+p.parent.relative_to(ROOT).as_posix()+"/" for p in (ROOT/collection).glob("*/index.html")}
        indexed={p["local_route"] for p in records if p["collection"]==collection}
        expected=indexed
        if collection=="cendoc":
            standalone_routes={f"/cendoc/{slug}/" for slug in standalone}
            missing_details=standalone_routes-files
            if missing_details: raise ValueError(f"CENDOC standalone detail pages are missing: {sorted(missing_details)}")
            expected=indexed|standalone_routes
        if files!=expected: raise ValueError(f"{collection}: detail pages and collection/search records differ: {files ^ expected}")
    result={"version":1,"sources":sources,"counts":counts,"records":records}
    output=json.dumps(result,ensure_ascii=False,indent=2)+"\n"; path=ROOT/"content/search-index.json"
    if check:
        if not path.exists() or path.read_text(encoding="utf-8")!=output: raise ValueError("Search index is stale. Run scripts/generate_search_index.py after generating pages.")
    else: path.write_text(output,encoding="utf-8",newline="\n")
    print(("Checked" if check else "Generated")+" search index: "+str(counts))
    return result
if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument("--check",action="store_true"); generate(parser.parse_args().check)
