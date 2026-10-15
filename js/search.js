/* Shared search: AND between tokens, substring matches, title/identity/body ranking. */
(function (root) {
  'use strict';
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  const values = value => value == null ? '' : Array.isArray(value) ? value.map(values).join(' ') : typeof value === 'object' ? Object.values(value).map(values).join(' ') : String(value);
  const prepared = new WeakMap();
  function fields(record) {
    if (!prepared.has(record)) {
      const title = normalize(record.title), identity = normalize([record.author, record.institutions, values(record.identifier), record.local_route, record.date, values(record.categories), values(record.keywords)].join(' '));
      const description = normalize(record.description), body = normalize(record.body);
      prepared.set(record, {title, identity, description, body, all: [title, identity, description, body].join(' ')});
    }
    return prepared.get(record);
  }
  function dateKey(value) {
    const raw=String(value||'');
    if (/^\d{4}$/.test(raw)) return Date.UTC(Number(raw),0,1);
    const spanish=normalize(raw).match(/^(\d{1,2}) de (\w+) de (\d{4})$/);
    if(spanish){const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];const month=months.indexOf(spanish[2]);if(month>=0)return Date.UTC(Number(spanish[3]),month,Number(spanish[1]));}
    return Date.parse(raw)||0;
  }
  function search(records, query) {
    const q = normalize(query), tokens = [...new Set(q.split(' ').filter(Boolean))];
    return records.map(record => {
      const f = fields(record);
      if (!tokens.every(token => f.all.includes(token))) return null;
      const score = !tokens.length ? 0 : (f.title === q ? 10000 : f.title.includes(q) ? 5000 : 0) + tokens.reduce((n, token) => n + (f.title.includes(token) ? 100 : f.identity.includes(token) ? 40 : f.description.includes(token) ? 15 : 1), 0);
      return {record, score};
    }).filter(Boolean).sort((a,b) => b.score-a.score || dateKey(b.record.date)-dateKey(a.record.date) || a.record.title.localeCompare(b.record.title, 'es') || a.record.local_route.localeCompare(b.record.local_route)).map(hit => hit.record);
  }
  let pending;
  async function readJSON(path) {
    const response = await fetch(path, {cache:'no-store'});
    if (!response.ok) throw new Error(`SEARCH_SOURCE_HTTP ${response.status}: ${path}`);
    return {data: await response.text(), path};
  }
  async function load(refresh=false) {
    if (refresh) pending = null;
    if (!pending) pending = (async () => {
      const response = await readJSON('/content/search-index.json');
      const index = JSON.parse(response.data);
      if (index.version !== 1 || !Array.isArray(index.records) || !index.counts || !index.sources) throw new Error('SEARCH_INDEX_INVALID');
      for (const [collection, count] of Object.entries(index.counts)) {
        if (index.records.filter(r=>r.collection===collection).length !== count) throw new Error(`SEARCH_COLLECTION_INCOMPLETE: ${collection}`);
      }
      if(index.records.some(r=>typeof r.title!=='string'||!r.title||typeof r.local_route!=='string'||!r.local_route||!Object.hasOwn(index.counts,r.collection))) throw new Error('SEARCH_RECORD_INVALID');
      if (new Set(index.records.map(r=>r.local_route)).size !== index.records.length) throw new Error('SEARCH_DUPLICATE_ROUTE');
      await Promise.all(['content/site.json','content/editorial-config.json','content/blog-posts.js'].map(async path => {
        const response = await readJSON('/'+path);
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(response.data.replace(/\r\n?/g,'\n'))))].map(n=>n.toString(16).padStart(2,'0')).join('');
        if (hash !== index.sources[path]) throw new Error(`SEARCH_INDEX_STALE: ${path}`);
      }));
      return index;
    })().catch(error => {pending=null; console.error('[ATRAHDOM_SEARCH]',error); throw error;});
    return pending;
  }
  const el = (tag, text, className) => {const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(className)n.className=className; return n;};
  function status(node, text, error=false) { node.replaceChildren(el('p',text)); node.setAttribute('role',error?'alert':'status'); }
  function failure(node, error, retry) {
    status(node, 'No se pudo cargar la búsqueda completa. '+error.message, true);
    const button=el('button','Reintentar','btn alt'); button.type='button'; button.onclick=retry; node.append(button);
  }
  function pagination(node, total, page, per, change) {
    node.replaceChildren();
    for(let i=1;i<=Math.ceil(total/per);i++) { const button=el('button',String(i),i===page?'active':'');button.type='button';button.setAttribute('aria-label','Página '+i);if(i===page)button.setAttribute('aria-current','page');button.onclick=()=>change(i);node.append(button); }
  }
  function bindGlobal() {
    const button=document.querySelector('.search-open');if(!button)return;
    let dialog=document.querySelector('#search-dialog');
    if(!dialog){dialog=el('dialog');dialog.id='search-dialog';dialog.innerHTML='<form method="dialog" class="search-panel"><button class="dialog-close" aria-label="Cerrar">×</button><label for="site-search">Buscar en todo el archivo</label><input id="site-search" type="search" placeholder="Escribe una palabra o tema…" autocomplete="off"><div id="search-results"></div></form>';document.body.append(dialog);}
    const input=dialog.querySelector('#site-search'), output=dialog.querySelector('#search-results');
    let records=null,page=1,request=0;
    function render(){
      if(!records)return;
      output.replaceChildren();if(!normalize(input.value))return;
      const found=search(records,input.value),per=12;page=Math.min(page,Math.max(1,Math.ceil(found.length/per)));
      const total=el('p',found.length?`${found.length} ${found.length===1?'resultado':'resultados'}`:'Sin resultados.','search-total');total.setAttribute('role','status');output.append(total);
      for(const record of found.slice((page-1)*per,page*per)){
        const hit=el('div',undefined,'search-hit'),link=el('a',record.title);link.href=record.local_route;link.onclick=()=>dialog.close();hit.append(link);
        const meta=[record.author,record.date].filter(Boolean).join(' · ');if(meta)hit.append(el('div',meta,'meta'));output.append(hit);
      }
      const pages=el('div',undefined,'pagination');pages.setAttribute('aria-label','Páginas de resultados');pagination(pages,found.length,page,per,n=>{page=n;render();input.focus();});output.append(pages);
    }
    async function open(){
      const current=++request;records=null;page=1;if(!dialog.open)dialog.showModal();input.disabled=true;status(output,'Cargando el índice de búsqueda…');
      try{const index=await load(true);if(current!==request)return;records=index.records;input.disabled=false;render();input.focus();}
      catch(error){if(current===request){input.disabled=true;failure(output,error,open);}}
    }
    button.onclick=open;input.oninput=()=>{page=1;render();};dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
    return open;
  }
  async function mountCollection(collection, renderCard) {
    const main=document.querySelector('#contenido');
    let grid=main.querySelector('#archive-grid'),count=main.querySelector('#archive-count'),pages=main.querySelector('#archive-pages'),input=main.querySelector('#archive-search');
    const cards=new Map();
    if(collection==='comunicados'){
      grid=main.querySelector('.grid');for(const card of grid.querySelectorAll('article.card')){const link=card.querySelector('a');if(link)cards.set(new URL(link.href).pathname,card.cloneNode(true));}
      grid.id='archive-grid';const tools=el('div',undefined,'archive-tools');input=el('input');input.id='archive-search';input.type='search';input.placeholder='Buscar por título, contenido o metadatos';input.setAttribute('aria-label','Buscar comunicados');tools.append(input);count=el('p');count.id='archive-count';count.setAttribute('role','status');pages=el('div',undefined,'pagination');pages.id='archive-pages';grid.before(tools,count);grid.after(pages);
    }
    count.setAttribute('role','status');
    input.setAttribute('aria-label',collection==='cendoc'?'Buscar documentos':'Buscar comunicados');input.placeholder='Buscar por título, contenido o metadatos';
    let source=[],page=1,selectedType='';const per=12;
    const cat=main.querySelector('#archive-cat'),year=main.querySelector('#archive-year'),pills=main.querySelectorAll('#archive-type-pills button');
    const params=new URLSearchParams(location.pathname.replace(/\/$/,'')==='/'+collection?location.search:location.hash.split('?')[1]||'');input.value=params.get('q')||'';
    function controls(disabled){input.disabled=disabled;if(cat)cat.disabled=disabled;if(year)year.disabled=disabled;pills.forEach(b=>b.disabled=disabled);}
    function url(){const p=new URLSearchParams();if(input.value)p.set('q',input.value);if(cat?.value)p.set('cat',cat.value);if(year?.value)p.set('año',year.value);if(selectedType)p.set('tipo',selectedType);const base=location.pathname.replace(/\/$/,'')==='/'+collection?'/'+collection+'/':'#/recursos';history.replaceState(null,'',base+(p.size?'?'+p:''));}
    function render(){
      const subset=source.filter(r=>(!cat?.value||r.categories.includes(cat.value))&&(!year?.value||String(r.date).match(/\b(?:18|19|20|21)\d{2}\b/)?.[0]===year.value)&&(!selectedType||(selectedType==='doc'?r.has_document:r.has_video)));
      const found=search(subset,input.value);page=Math.min(page,Math.max(1,Math.ceil(found.length/per)));count.textContent=`${found.length} ${found.length===1?'contenido encontrado':'contenidos encontrados'}`;grid.replaceChildren();
      for(const record of found.slice((page-1)*per,page*per)){
        if(renderCard){const template=document.createElement('template');template.innerHTML=renderCard({...record,editorial_metadata_reviewed:true,editorial_date:record.date,editorial_author:record.author,content_html:record.has_document?'.pdf':record.has_video?'youtube':''});grid.append(template.content);}
        else {const card=cards.get(record.local_route);if(!card)throw new Error('SEARCH_CARD_MISSING: '+record.local_route);grid.append(card.cloneNode(true));}
      }
      if(!found.length){const empty=el('div',undefined,'empty-state');empty.append(el('p','No hay resultados con esos filtros.'));const clear=el('button','Limpiar filtros','btn alt');clear.type='button';clear.onclick=()=>{input.value='';if(cat)cat.value='';if(year)year.value='';selectedType='';pills.forEach(b=>b.classList.toggle('active',!b.dataset.type));page=1;render();url();};empty.append(clear);grid.append(empty);}
      pagination(pages,found.length,page,per,n=>{page=n;render();});
    }
    function update(){page=1;render();url();}
    async function start(){
      controls(true);grid.replaceChildren();pages.replaceChildren();count.textContent='Cargando el catálogo completo…';
      try{
        const index=await load(true);if(!grid.isConnected)return;source=index.records.filter(r=>r.collection===collection);
        if(!source.length)throw new Error('SEARCH_COLLECTION_EMPTY: '+collection);
        if(collection==='comunicados'&&(source.length!==cards.size||source.some(r=>!cards.has(r.local_route))))throw new Error('SEARCH_CARDS_STALE: comunicados');
        if(cat){cat.replaceChildren(new Option('Todas las categorías',''));const counts=new Map();source.forEach(r=>r.categories.forEach(c=>counts.set(c,(counts.get(c)||0)+1)));[...counts].sort(([a],[b])=>a.localeCompare(b,'es')).forEach(([c,n])=>cat.add(new Option(`${c} (${n})`,c)));cat.value=params.get('cat')||'';cat.onchange=update;}
        if(year){year.replaceChildren(new Option('Todos los años',''));[...new Set(source.map(r=>String(r.date).match(/\b(?:18|19|20|21)\d{2}\b/)?.[0]).filter(Boolean))].sort().reverse().forEach(y=>year.add(new Option(y,y)));year.value=params.get('año')||'';year.onchange=update;}
        selectedType=['doc','video'].includes(params.get('tipo'))?params.get('tipo'):'';pills.forEach(b=>{b.classList.toggle('active',b.dataset.type===selectedType);b.onclick=()=>{selectedType=b.dataset.type;pills.forEach(x=>x.classList.toggle('active',x===b));update();};});input.oninput=update;controls(false);render();
      }catch(error){controls(true);count.textContent='Catálogo no disponible';failure(grid,error,start);}
    }
    await start();
  }
  const api={normalize,search,load,bindGlobal,mountCollection};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ATRAHDOM_SEARCH=api;
  if(typeof document!=='undefined') document.addEventListener('DOMContentLoaded',()=>{
    // Static pages without a dialog keep their existing redirect to /?buscar=1.
    if(document.querySelector('#search-dialog'))bindGlobal();
    if(location.pathname.replace(/\/$/,'')==='/comunicados')mountCollection('comunicados');
  });
})(typeof window==='undefined'?globalThis:window);
