const assert=require('node:assert/strict');
const fs=require('node:fs');
const S=require('../js/search.js');
const index=JSON.parse(fs.readFileSync('content/search-index.json','utf8'));
const editorial=JSON.parse(fs.readFileSync('content/editorial-config.json','utf8'));
const site=JSON.parse(fs.readFileSync('content/site.json','utf8'));
const subset=c=>index.records.filter(r=>r.collection===c);
for(const c of ['cendoc','comunicados']){
 for(const r of subset(c)) assert(S.search(subset(c),r.title).some(x=>x.local_route===r.local_route),r.title);
 for(const r of subset(c)) assert(S.search(index.records,r.title).some(x=>x.local_route===r.local_route),r.title);
 console.log(c,subset(c).length,'all titles found locally and globally');
}
const has=(q,slug)=>assert(S.search(index.records,q).some(r=>r.slug===slug),q);
const control='el-control-de-convencionalidad-una-herramienta-estrategica';
for(const q of ['Ingrid Zurama Urizar','Friedrich Ebert Stiftung','2024','estrategica','ESTRATÉGICA','Control herramienta','herramienta, estratégica','Convencional'])has(q,control);
has('Acta constitutiva del Sindicato','primera-acta-constitutiva-sitradomsa');
has('Revista Sindical SITRADOM','revista-sindical-sitradom');
const revista=subset('cendoc').find(r=>r.slug==='revista-sindical-sitradom');
assert.equal(revista?.local_route,'/cendoc/revista-sindical-sitradom/');
assert.equal(revista?.author,'Amory Marroquín; Sherly Najarro; Vicenta Montes; Gladis Castro; Cecilia Pérez');
assert.equal(revista?.institutions,'SITRADOM');
assert.equal(revista?.date,'15 de octubre de 2026');
has('Presentaciones 2009 - 2010','presentaciones-2009-2010');
has('Diagnostico','diagnostico');
has('Donar','donar');has('Quiénes somos','quienes-somos');
assert.equal(S.search(index.records,'zzzauditoria8090').length,0);
const polluted=S.search(index.records,'coordinacion@atrahdom.org');
assert(!index.records.some(r=>r.collection==='blog'&&r.body.includes('coordinacion@atrahdom.org')),'footer contamination');
assert(S.search(index.records,'trabajo').length>12);
assert(S.search(index.records,'Convencionalidad')[0].slug===control);
assert.equal(new Set(index.records.map(r=>r.local_route)).size,index.records.length);
assert.equal(index.counts.cendoc,76);assert.equal(index.counts.comunicados,41);
has('Comunicado 20 de octubre de 2026','comunicado-20-de-octubre-de-2026');
const revolucion=subset('comunicados').find(r=>r.slug==='comunicado-20-de-octubre-de-2026');
assert.equal(revolucion?.local_route,'/comunicados/comunicado-20-de-octubre-de-2026/');
assert.equal(revolucion?.author,'ATRAHDOM; SITRADOM');
assert.equal(revolucion?.date,'2026-10-20');
assert(revolucion?.attachments.includes('assets/documents/conmemoracion-gesta-revolucionaria-20-octubre-1944-2026.pdf'));
const alimentacion=subset('comunicados').find(r=>r.slug==='comunicado-dia-internacional-alimentacion-2026');
assert.equal(alimentacion?.local_route,'/comunicados/comunicado-dia-internacional-alimentacion-2026/');
assert.equal(alimentacion?.title,'Comunicado en el Día Internacional de la Alimentación, 2026.');
assert.equal(alimentacion?.author,'ATRAHDOM');
assert.equal(alimentacion?.date,'2026-10-16');
assert(alimentacion?.attachments.includes('assets/documents/comunicado-dia-internacional-alimentacion-2026.pdf'));
const restoredCommunications=[
 'comunicado-30-de-marzo-dia-latinoamericano-de-las-trabajadoras-del-hogar',
 'comunicado-30-de-marzo-dia-latinoamericano-de-las-trabajadoras-del-hogar-2'
];
for(const slug of restoredCommunications){
 const record=subset('comunicados').find(r=>r.slug===slug);
 assert(record,`${slug} missing from Comunicados search`);
 assert.equal(record.local_route,`/comunicados/${slug}/`);
 assert.equal(record.author,'SITRADOM; ATRAHDOM');
 assert.match(record.date,/^2024-04-02/);
 assert(fs.existsSync(`comunicados/${slug}/index.html`),`${slug} direct page is missing`);
 assert(fs.readFileSync('comunicados/index.html','utf8').includes(`href="/comunicados/${slug}/"`),`${slug} missing from Comunicados index`);
 assert(!subset('cendoc').some(r=>r.slug===slug),`${slug} leaked into CENDOC`);
}
const standalone=['plataforma-politica-2010-2011','approval-of-15-non-governmental-organizations-for-association-with-un-public','por-un-convenio-y-recomendacion-a-favor-del-trabajo-domestico'];
for(const slug of standalone){
 assert(editorial.cendoc_excluded_slugs.includes(slug),`${slug} must be excluded from CENDOC`);
 assert(editorial.communication_excluded_slugs.includes(slug),`${slug} must be excluded from Comunicados`);
 assert(editorial.cendoc_standalone_slugs.includes(slug),`${slug} must retain an individual CENDOC page`);
 assert(site.editorial.cendoc_excluded_slugs.includes(slug),`${slug} exclusion must reach the browser site data`);
 assert(site.editorial.communication_excluded_slugs.includes(slug),`${slug} communication exclusion must reach the browser site data`);
 assert(!subset('cendoc').some(r=>r.slug===slug),`${slug} leaked into the CENDOC collection`);
 assert(!subset('comunicados').some(r=>r.slug===slug),`${slug} leaked into the Comunicados collection`);
 assert(!editorial.communication_slugs.includes(slug),`${slug} must not be an active Comunicados card`);
 assert(!fs.readFileSync('comunicados/index.html','utf8').includes(`/comunicados/${slug}/`),`${slug} leaked into the Comunicados index`);
 const global=S.search(index.records,slug.replaceAll('-',' ')).find(r=>r.slug===slug);
 assert(global,`${slug} must remain in general search`);
 assert.equal(global.local_route,`/cendoc/${slug}/`);
 assert(fs.existsSync(`cendoc/${slug}/index.html`),`${slug} direct page is missing`);
}
const renamed=site.posts.find(r=>r.slug===standalone[1]);
assert(renamed?.legacy_local_route==='#/post/noticias-internacionales','historical noticias-internacionales route alias was lost');
assert(fs.readFileSync('app.js','utf8').includes('legacy_local_route'),'app route resolver no longer handles legacy aliases');
for(const file of fs.readdirSync('cendoc').filter(name=>fs.existsSync(`cendoc/${name}/index.html`))){
 const html=fs.readFileSync(`cendoc/${file}/index.html`,'utf8');
 const related=html.match(/<section class="section tint"><div class="wrap"><h2>Documentos relacionados<\/h2>[\s\S]*?<\/section>/)?.[0]||'';
 for(const slug of standalone)assert(!new RegExp(`href=["'](?:/cendoc/${slug}/|#\/post\/${slug})["']`).test(related),`${slug} leaked into automatic CENDOC related links on ${file}`);
}
console.log('Normalization, metadata, description, ranking, routes and contamination checks passed');
// Failure-path tests use an in-memory fake fetch, never the live server.
(async()=>{
 const originalFetch=global.fetch, originalError=console.error;
 const S=require('../js/search.js');
 const digest=s=>require('node:crypto').createHash('sha256').update(s).digest('hex');
 const catalogs={'content/site.json':'{}','content/editorial-config.json':'{}','content/blog-posts.js':'[]'};
 const valid={version:1,counts:{cendoc:1},records:[{title:'A',local_route:'/a/',collection:'cendoc'}],sources:Object.fromEntries(Object.entries(catalogs).map(([p,s])=>[p,digest(s)]))};
 let payload=valid, unavailable=false;const requests=[];
 global.fetch=async (path,options)=>{assert.equal(options.cache,'no-store');requests.push(path);return {ok:!unavailable,status:unavailable?503:200,text:async()=>path.endsWith('search-index.json')?JSON.stringify(payload):catalogs[path.slice(1)]};};
 console.error=()=>{};
 try{
  assert.equal((await S.load(true)).records.length,1);
  unavailable=true;await assert.rejects(S.load(true),/SEARCH_SOURCE_HTTP 503/);unavailable=false;
  payload={...valid,counts:{cendoc:2}};await assert.rejects(S.load(true),/SEARCH_COLLECTION_INCOMPLETE/);
  payload={...valid,sources:{...valid.sources,'content/site.json':'old'}};await assert.rejects(S.load(true),/SEARCH_INDEX_STALE/);
  payload=valid;assert.equal((await S.load(true)).records.length,1);
  console.log('HTTP failure, incomplete collection, stale index and retry passed');
 }finally{global.fetch=originalFetch;console.error=originalError;}
})().catch(error=>{console.error(error);process.exitCode=1;});
for(const record of index.records){
 if(record.local_route.startsWith('/')){
  const relative=record.local_route.slice(1);
  assert(fs.existsSync(relative.endsWith('/')?relative+'index.html':relative),'Missing route: '+record.local_route);
 }
}
console.log('Every clean result route resolves to an existing public file');
