import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SITE = 'https://www.atrahdom.org';
const controlledRoots = ['blog', 'donar', 'quienes-somos', 'organizacion', 'que-hacemos', 'contacto'];

const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const decode = value => String(value ?? '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const strip = html => decode(String(html ?? '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const slugOf = item => item.slug || String(item.id || 'contenido');
const dateOf = item => item.publication_date || item.date || '';
const formatDate = value => value ? new Intl.DateTimeFormat('es-GT', { day:'numeric', month:'long', year:'numeric' }).format(new Date(value)) : '';
const categoriesOf = item => Array.isArray(item.categories) ? item.categories.map(category => typeof category === 'string' ? category : '').filter(Boolean) : [];
const imageOf = item => item.featured_image || (item.images || [])[0] || '';
const readContent = item => item.content_file && fs.existsSync(path.join(ROOT, item.content_file)) ? read(item.content_file) : (item.content_html || '');
const descriptionOf = item => {
  const source = item.excerpt_html || readContent(item);
  const text = strip(source);
  return text.length > 160 ? `${text.slice(0, 157).replace(/\s+\S*$/, '')}…` : text;
};
const canonicalFor = route => `${SITE}${String(route).startsWith('/') ? route : `/${route}`}`;
const cleanRoute = item => {
  const slug = slugOf(item);
  const map = { contactanos:'/contacto/', organizacion:'/organizacion/', 'ejes-de-trabajo':'/que-hacemos/', 'espacios-de-participacion':'/espacios-de-participacion/', sitradom:'/sitradom/', 'has-una-donacion':'/donar/' };
  if (map[slug]) return map[slug];
  if (item.type === 'post' && categoriesOf(item).some(category => category.toLowerCase() === 'blog')) return `/blog/${slug}/`;
  return `#/post/${slug}`;
};
const rewriteLinks = html => String(html || '')
  .replace(/(?:src|href)=(['"])(?:\.\.\/)?assets\//gi, '$1/assets/')
  .replace(/href=(['"])#\/blog\1/gi, (_, quote) => `href=${quote}/blog/${quote}`)
  .replace(/href=(['"])#\/donar\1/gi, (_, quote) => `href=${quote}/donar/${quote}`)
  .replace(/href=(['"])#\/quienes-somos\1/gi, (_, quote) => `href=${quote}/quienes-somos/${quote}`)
  .replace(/href=(['"])#\/organizacion\1/gi, (_, quote) => `href=${quote}/organizacion/${quote}`)
  .replace(/href=(['"])#\/que-hacemos\1/gi, (_, quote) => `href=${quote}/que-hacemos/${quote}`)
  .replace(/href=(['"])#\/contacto\1/gi, (_, quote) => `href=${quote}/contacto/${quote}`)
  .replace(/href=(['"])#\/page\/contactanos\1/gi, (_, quote) => `href=${quote}/contacto/${quote}`)
  .replace(/href=(['"])#\/post\/([^'"]+)\1/gi, (_, quote, slug) => `href=${quote}/blog/${slug}/${quote}`);

const context = { window: {} };
vm.createContext(context);
vm.runInContext(read('content/site-data.js'), context);
vm.runInContext(read('content/blog-posts.js'), context);
const site = context.window.ATRAHDOM_SITE;
const migratedPosts = (site.posts || []).map(item => ({ ...item, type:'post' }));
const editorialPosts = (context.window.ATRAHDOM_BLOG || []).map(item => ({ ...item, type:'post', categories:[...new Set(['Blog', ...(item.categories || [])])], local_route:item.local_route || `#/post/${item.slug}` }));
const posts = [...migratedPosts, ...editorialPosts.filter(item => !migratedPosts.some(existing => existing.slug === item.slug))];
const blogPosts = posts.filter(item => categoriesOf(item).some(category => category.toLowerCase() === 'blog'));
const pages = (site.pages || []).map(item => ({ ...item, type:'page' }));

const header = `
<header class="site-header"><div class="utility-bar"><div class="wrap utility-inner"></div></div><div class="wrap main-nav">
  <a class="brand" href="/" aria-label="ATRAHDOM, inicio"><span class="brand-mark"><img src="/assets/images/logo-atrahdom-2022.png" alt="ATRAHDOM — Asociación de Trabajadoras del Hogar, a Domicilio y de Maquila"></span><span class="brand-tagline">Trabajo digno. Derechos para todas.</span></a>
  <nav id="primary-menu" class="primary-menu" aria-label="Navegación principal"><a href="/">Inicio</a><div class="nav-group"><span class="nav-trigger">Presentación</span><div class="dropdown"><a href="/quienes-somos/">Quiénes somos</a><a href="/organizacion/">Organización</a><a href="/que-hacemos/">Ejes de trabajo</a><a href="/#/espacios-de-participacion">Espacios de participación</a><a href="/#/organizaciones">Sindicatos</a></div></div><a href="/#/recursos">Biblioteca</a><a href="/blog/">Blog</a><div class="nav-group"><span class="nav-trigger">Infórmate</span><div class="dropdown"><a href="/#/ayuda">Solicita apoyo</a><a href="/#/participa">Afíliate</a><a href="/calculadora.html">Calculadora laboral</a><a href="/contacto/">Contacto</a></div></div><a class="nav-donate" href="/donar/">Donar</a></nav>
</div></header>`;
const footer = `<section class="contact-band"><div class="wrap contact-inner"><div><h2>¿Necesitas orientación laboral?</h2></div><a class="btn" href="/#/ayuda">Escríbenos hoy</a></div></section><footer class="site-footer"><div class="wrap footer-grid"><section><h2>ATRAHDOM</h2><p>Organización de mujeres trabajadoras guatemaltecas dedicada a la formación, defensa de derechos humanos laborales y acompañamiento jurídico.</p></section><section class="footer-contact"><h3>Contacto</h3><a href="mailto:coordinacion@atrahdom.org">coordinacion@atrahdom.org</a><a href="mailto:amarroquin@atrahdom.org">amarroquin@atrahdom.org</a><a href="tel:+50222532382">(502) 2253 2382</a></section><section><h3>Explora</h3><a href="/#/recursos">Biblioteca</a><a href="/blog/">Blog</a><a href="/#/privacidad">Privacidad</a></section><section class="footer-address"><h3>Dirección</h3><p>10 avenida 4-18, Zona 1, Ciudad de Guatemala.</p></section></div></footer>`;
const head = ({ title, description, canonical, image='', type='website' }) => `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${esc(description)}"><title>${esc(title)}</title><link rel="canonical" href="${canonical}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">${image ? `<meta property="og:image" content="${canonicalFor(image)}">` : ''}<meta property="og:url" content="${canonical}"><meta property="og:type" content="${type}"><meta property="og:site_name" content="ATRAHDOM"><meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}">${image ? `<meta name="twitter:image" content="${canonicalFor(image)}">` : ''}<link rel="stylesheet" href="/styles.css?v=propuesta-f12"><link rel="icon" type="image/png" href="/assets/images/logotipo-2019-500-5c7b24eb84.png"></head>`;
const page = (meta, body) => `<!doctype html><html lang="es">${head(meta)}<body><a class="skip-link" href="#contenido">Saltar al contenido</a>${header}<main id="contenido">${body}</main>${footer}</body></html>`;
const writeControlled = (route, html) => { const target = path.join(ROOT, route, 'index.html'); fs.mkdirSync(path.dirname(target), { recursive:true }); fs.writeFileSync(target, html); };
const card = item => { const route = `/blog/${slugOf(item)}/`; const categories = categoriesOf(item).slice(0, 2); const image = imageOf(item); return `<article class="card"><div class="card-media">${image ? `<img src="${image.startsWith('/') ? image : `/${image}`}" alt="" loading="lazy" decoding="async">` : ''}</div><div class="card-body"><div class="meta">${categories.map(category => `<span>${esc(category)}</span>`).join('')}${dateOf(item) ? `<span>${esc(formatDate(dateOf(item)))}</span>` : ''}</div><h3>${esc(item.title || 'Sin título')}</h3><p>${esc(descriptionOf(item))}</p><a class="read" href="${route}">Leer contenido completo →</a></div></article>`; };

writeControlled('blog', page({ title:'Blog | ATRAHDOM', description:'Ideas, experiencias y sentires de nuestras bases.', canonical:canonicalFor('/blog/') }, `<section class="page-hero blog-hero"><div class="wrap"><p class="eyebrow">Columnas · Análisis · Reflexiones</p><h1>Blog</h1><p>Ideas, experiencias y sentires de nuestras bases.</p></div></section><section class="section"><div class="wrap"><div class="grid blog-grid">${blogPosts.map(card).join('')}</div></div></section>`));

for (const item of blogPosts) {
  const slug = slugOf(item); const route = `/blog/${slug}/`; const title = item.title || 'Sin título'; const description = descriptionOf(item); const image = imageOf(item); const categories = categoriesOf(item); let content = rewriteLinks(readContent(item));
  if (image) content = `<figure class="editorial-featured"><img src="/${image.replace(/^\//, '')}" alt="${esc(title)}" loading="eager" decoding="async"></figure>${content}`;
  const attachments = (item.attachments || []).filter(attachment => !content.includes(attachment));
  if (attachments.length) content += `<section class="media-embed file-fallback"><h3>Archivos relacionados</h3>${attachments.map(attachment => `<p><a href="/${attachment.replace(/^\//, '')}" target="_blank" rel="noopener">Abrir ${esc(path.basename(attachment))}</a></p>`).join('')}</section>`;
  const author = item.internal_author || item.wordpress_user || '';
  const sidebar = `<aside class="sidebar"><h3>Sobre este documento</h3>${item.editorial_type ? `<p><strong>Tipo:</strong><br>${esc(item.editorial_type)}</p>` : ''}${author ? `<p><strong>Autoría:</strong><br>${esc(author)}</p>` : ''}${dateOf(item) ? `<p><strong>Fecha:</strong><br>${esc(formatDate(dateOf(item)))}</p>` : ''}${categories.length ? `<p><strong>Categorías:</strong><br>${categories.map(esc).join(', ')}</p>` : ''}<a href="/blog/">← Volver al Blog</a></aside>`;
  writeControlled(path.join('blog', slug), page({ title:`${title} | ATRAHDOM`, description, canonical:canonicalFor(route), image, type:'article' }, `<section class="page-hero"><div class="wrap"><p class="eyebrow">${categories.map(esc).join(' · ')}</p><h1>${esc(title)}</h1><div class="meta">${dateOf(item) ? `<span>${esc(formatDate(dateOf(item)))}</span>` : ''}${author ? `<span>Por ${esc(author)}</span>` : ''}</div></div></section><section class="section"><div class="wrap content-layout"><article class="prose">${content}</article>${sidebar}</div></section>`));
}

const donation = posts.find(item => /donacion/i.test(item.title || '') || /donacion/i.test(slugOf(item)));
if (donation) {
  let content = rewriteLinks(readContent(donation));
  const pdf = (donation.attachments || []).find(attachment => /\.pdf$/i.test(attachment));
  if (pdf && !content.includes(pdf)) content += `<p><a href="/${pdf.replace(/^\//, '')}" target="_blank" rel="noopener">Ver datos bancarios</a></p>`;
  writeControlled('donar', page({ title:'Haz una donación | ATRAHDOM', description:descriptionOf(donation), canonical:canonicalFor('/donar/') }, `<section class="page-hero"><div class="wrap"><p class="eyebrow">Apoya nuestro trabajo</p><h1>Haz una donación</h1></div></section><section class="section"><div class="wrap content-layout"><article class="prose">${content}</article><aside class="sidebar"><div class="placeholder"><h3>PLACEHOLDER</h3><p>Los datos bancarios y mecanismos actuales de donación deben ser validados con la organización antes de publicarse.</p></div></aside></div></section>`));
}

const findPage = slug => pages.find(item => slugOf(item) === slug);
const renderInstitutional = (slug, route, label, fallback) => { const item = findPage(slug); if (!item) return; let content = rewriteLinks(readContent(item)); if (slug === 'contactanos') content = content.replace(/<li[^>]*wp-social-link-wordpress[\s\S]*?<\/li>/i, ''); writeControlled(route.slice(1, -1), page({ title:`${item.title || label} | ATRAHDOM`, description:descriptionOf(item), canonical:canonicalFor(route) }, `<section class="page-hero"><div class="wrap"><p class="eyebrow">${esc(label)}</p><h1>${esc(item.title || fallback)}</h1></div></section><section class="section"><div class="wrap ${slug === 'contactanos' ? 'contact-page' : 'content-layout'}"><article class="prose">${content}</article></div></section>`)); };
renderInstitutional('organizacion', '/organizacion/', 'Identidad institucional', 'Organización');
renderInstitutional('ejes-de-trabajo', '/que-hacemos/', 'Ejes de trabajo', 'Ejes de trabajo');
renderInstitutional('contactanos', '/contacto/', 'Información de contacto', 'Contáctanos');

const org = findPage('organizacion'); const axes = findPage('ejes-de-trabajo'); const spaces = findPage('espacios-de-participacion');
const institutionalCard = item => { if (!item) return ''; const slug = slugOf(item); const route = slug === 'ejes-de-trabajo' ? '/que-hacemos/' : slug === 'organizacion' ? '/organizacion/' : '/#/espacios-de-participacion'; return `<article class="card"><div class="card-body"><div class="meta"><span>Información institucional</span></div><h3>${esc(item.title)}</h3><p>${esc(descriptionOf(item))}</p><a class="read" href="${route}">Leer contenido completo →</a></div></article>`; };
writeControlled('quienes-somos', page({ title:'Quiénes somos | ATRAHDOM', description:'Conoce la organización, los ejes de trabajo y los espacios de participación de ATRAHDOM.', canonical:canonicalFor('/quienes-somos/') }, `<section class="page-hero"><div class="wrap"><p class="eyebrow">Identidad institucional</p><h1>Quiénes somos</h1></div></section><section class="section"><div class="wrap"><div class="grid">${institutionalCard(org)}${institutionalCard(axes)}${institutionalCard(spaces)}</div></div></section><section class="section tint"><div class="wrap"><h2>Nuestra historia</h2><p>ATRAHDOM es una organización de mujeres trabajadoras guatemaltecas, legalmente constituida y con experiencia en formación y capacitación en derechos humanos y laborales, así como en acompañamiento jurídico para la defensa de las mujeres trabajadoras.</p></div></section>`));

console.log(`Generated ${blogPosts.length} Blog pages plus blog index, donation and institutional pages.`);
