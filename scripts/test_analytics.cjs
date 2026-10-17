const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const analyticsSource = fs.readFileSync(path.join(root, 'js', 'analytics.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const appRouteBlock = appSource.match(/const routeWithAnalytics=route;[\s\S]*?\n};(?=\nconst unionsWithHistoricalCards)/)?.[0];
assert.ok(appRouteBlock, 'the real SPA analytics wrapper must remain identifiable for execution in this test');

function loadAnalytics(url, spa = false, run = true) {
  const location = new URL(url);
  const listeners = {};
  const appendedScripts = [];
  const scriptElement = { hasAttribute: name => spa && name === 'data-spa-hash' };
  const window = {
    location,
    addEventListener: (name, callback) => { listeners[name] = callback; }
  };
  const document = {
    title: 'Prueba ATRAHDOM',
    currentScript: scriptElement,
    head: { appendChild: script => appendedScripts.push(script) },
    createElement: tag => ({ tagName: tag.toUpperCase() })
  };
  const context = vm.createContext({ window, document, Date });
  if (run) vm.runInContext(analyticsSource, context, { filename: 'analytics.js' });
  return { window, document, context, location, listeners, appendedScripts, get dataLayer() { return window.dataLayer; } };
}

function loadSpaApp(url, { analytics, ready = true } = {}) {
  const location = new URL(url);
  const headings = {
    '#/organizacion': 'Organización',
    '#/blog': 'Blog',
    '#/donar': 'Donar',
    '#/post/ejemplo': 'Publicación de ejemplo'
  };
  let headingText = '';
  const document = {
    title: 'ATRAHDOM — Trabajo digno, derechos para todas',
    getElementById: () => null
  };
  const window = { location };
  if (analytics) window.ATRAHDOM_ANALYTICS = analytics;
  const context = vm.createContext({
    window,
    location,
    document,
    state: { ready },
    cleanLegacyRoutes: {},
    main: { querySelector: selector => selector === 'h1' && headingText ? { textContent: headingText } : null },
    route: () => { headingText = headings[location.hash.split('?')[0]] || 'Página no encontrada'; }
  });
  vm.runInContext(appRouteBlock, context, { filename: 'app-route-wrapper.js' });
  return { context, window, document, location, render: () => context.route(), setReady: value => { context.state.ready = value; } };
}

function pageViews(dataLayer) {
  return Array.from(dataLayer).filter(command => command[0] === 'event' && command[1] === 'page_view').map(command => command[2]);
}

for (const host of ['localhost', '127.0.0.1', '[::1]']) {
  for (const port of [8090, 8091]) {
    const result = loadAnalytics(`http://${host}:${port}/`);
    assert.equal(result.appendedScripts.length, 0, `${host}:${port} must not load gtag.js`);
    assert.equal(result.window.dataLayer, undefined, `${host}:${port} must not initialize dataLayer`);
    assert.equal(result.window.__atrahdomGa4Initialized, undefined, `${host}:${port} must not initialize GA4`);
    const app = loadSpaApp(`http://${host}:${port}/#/organizacion`);
    app.render();
    assert.equal(app.window.ATRAHDOM_PENDING_PAGE_VIEWS, undefined, `${host}:${port} must not queue analytics events`);
  }
}

for (const host of ['www.atrahdom.org', 'atrahdom.org']) {
  const staticPage = loadAnalytics(`https://${host}/cendoc/`);
  assert.equal(staticPage.appendedScripts.length, 1, `${host} must load gtag.js exactly once`);
  assert.equal(staticPage.appendedScripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-FXM438VJSP');
  assert.equal(staticPage.dataLayer.length, 3, `${host} must queue js, one config, and one initial page_view`);
  assert.equal(staticPage.dataLayer[1][0], 'config');
  assert.equal(staticPage.dataLayer[1][1], 'G-FXM438VJSP');
  assert.equal(staticPage.dataLayer[1][2].send_page_view, false);
  assert.equal(pageViews(staticPage.dataLayer).length, 1, `${host} static pages must record one view`);
  assert.equal(pageViews(staticPage.dataLayer)[0].page_location, `https://${host}/cendoc/`);

  vm.runInContext(analyticsSource, staticPage.context, { filename: 'analytics.js' });
  assert.equal(staticPage.appendedScripts.length, 1, `${host} duplicate inclusion must not load gtag.js twice`);
  assert.equal(pageViews(staticPage.dataLayer).length, 1, `${host} duplicate inclusion must not send another view`);

  // Analytics runs first, then the app renders the directly requested hash route.
  const analyticsFirst = loadAnalytics(`https://${host}/#/organizacion`, true);
  assert.equal(pageViews(analyticsFirst.dataLayer).length, 0, 'a direct SPA hash must wait for the rendered route');
  const appAfterAnalytics = loadSpaApp(analyticsFirst.location.href, { analytics: analyticsFirst.window.ATRAHDOM_ANALYTICS });
  appAfterAnalytics.render();
  assert.equal(pageViews(analyticsFirst.dataLayer).length, 1, 'analytics-first startup must record the first SPA view once');
  assert.equal(pageViews(analyticsFirst.dataLayer)[0].page_title, 'Organización | ATRAHDOM');
  assert.equal(pageViews(analyticsFirst.dataLayer)[0].page_location, `https://${host}/#/organizacion`);

  // The app renders before deferred analytics becomes available; its event is queued and drained later.
  const appFirst = loadSpaApp(`https://${host}/#/organizacion`);
  appFirst.render();
  assert.equal(appFirst.window.ATRAHDOM_PENDING_PAGE_VIEWS.length, 1, 'app-first startup must retain the rendered view');
  const analyticsAfterApp = loadAnalytics(appFirst.location.href, true, false);
  analyticsAfterApp.window.ATRAHDOM_PENDING_PAGE_VIEWS = appFirst.window.ATRAHDOM_PENDING_PAGE_VIEWS;
  vm.runInContext(analyticsSource, analyticsAfterApp.context, { filename: 'analytics.js' });
  assert.equal(pageViews(analyticsAfterApp.dataLayer).length, 1, 'analytics must drain the pending first view once');
  assert.equal(pageViews(analyticsAfterApp.dataLayer)[0].page_title, 'Organización | ATRAHDOM');
  assert.equal(pageViews(analyticsAfterApp.dataLayer)[0].page_location, `https://${host}/#/organizacion`);
  assert.equal(analyticsAfterApp.window.ATRAHDOM_PENDING_PAGE_VIEWS.length, 0, 'drained events must be cleared');

  const routeApp = loadSpaApp(`https://${host}/#/organizacion`, { analytics: analyticsAfterApp.window.ATRAHDOM_ANALYTICS });
  // Reuse the live tracker/dataLayer with route snapshots produced by the actual app wrapper.
  routeApp.render();
  routeApp.location.hash = '#/blog';
  routeApp.render();
  routeApp.location.hash = '#/donar';
  routeApp.render();
  routeApp.location.hash = '#/post/ejemplo';
  routeApp.render();
  const navigatedViews = pageViews(analyticsAfterApp.dataLayer);
  assert.equal(navigatedViews.length, 4, 'distinct SPA navigations must each send one view; the initial repeated route is deduplicated');
  assert.deepEqual(navigatedViews.map(view => view.page_title), [
    'Organización | ATRAHDOM', 'Blog | ATRAHDOM', 'Donar | ATRAHDOM', 'Publicación de ejemplo | ATRAHDOM'
  ]);
  assert.deepEqual(navigatedViews.map(view => view.page_location), [
    `https://${host}/#/organizacion`, `https://${host}/#/blog`, `https://${host}/#/donar`, `https://${host}/#/post/ejemplo`
  ]);
  assert.deepEqual(navigatedViews.map(view => view.page_path), [
    '/#/organizacion', '/#/blog', '/#/donar', '/#/post/ejemplo'
  ]);
  routeApp.render();
  assert.equal(pageViews(analyticsAfterApp.dataLayer).length, 4, 'rerendering the same route must not duplicate its view');

  const delayed = loadSpaApp(`https://${host}/#/organizacion`, { ready: false });
  delayed.render();
  assert.equal(delayed.window.ATRAHDOM_PENDING_PAGE_VIEWS, undefined, 'loading state must not send a view with the homepage title');
  delayed.setReady(true);
  delayed.render();
  assert.equal(delayed.window.ATRAHDOM_PENDING_PAGE_VIEWS.length, 1, 'the rendered route must be queued after app data is ready');

  const publicHome = loadAnalytics(`https://${host}/`, true);
  assert.equal(pageViews(publicHome.dataLayer).length, 1, `${host} static homepage must send its initial view`);
}

assert.doesNotMatch(analyticsSource, /addEventListener\(['"]hashchange['"]/, 'analytics.js must not independently track hash changes');
const expectedScript = '<script src="/js/analytics.js" defer></script>';
const routeFiles = [];
function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      const relative = path.relative(root, full).replaceAll('\\', '/');
      if (!relative.startsWith('content/') && !relative.startsWith('templates/')) routeFiles.push(full);
    }
  }
}
collect(root);
for (const file of routeFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const head = html.match(/<head\b[^>]*>[\s\S]*?<\/head\s*>/i)?.[0] || '';
  assert.equal((html.match(/<script src="\/js\/analytics\.js"(?: data-spa-hash)? defer><\/script>/g) || []).length, 1,
    `${path.relative(root, file)} must include one shared analytics script`);
  assert.equal((head.match(/<script src="\/js\/analytics\.js"(?: data-spa-hash)? defer><\/script>/g) || []).length, 1,
    `${path.relative(root, file)} must load shared analytics from the document head`);
  assert.doesNotMatch(html, /G-FXM438VJSP|UA-52447-2|_gaq\.push|google-analytics\.com\/ga\.js|gtag\('config'/,
    `${path.relative(root, file)} must not retain inline or legacy analytics`);
}
const blogPostFiles = routeFiles.filter(file => /^blog\/[^/]+\/index\.html$/.test(path.relative(root, file).replaceAll('\\', '/')));
assert.ok(blogPostFiles.length > 0, 'the static Blog post set must be discovered by the analytics check');
for (const file of blogPostFiles) {
  const html = fs.readFileSync(file, 'utf8');
  assert.equal((html.match(/<script src="\/js\/analytics\.js" defer><\/script>/g) || []).length, 1,
    `${path.relative(root, file)} must use shared analytics; new static Blog pages are included in this scan`);
}
const rootHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(rootHtml, /<script src="\/js\/analytics\.js" data-spa-hash defer><\/script>/,
  'the SPA entry point must opt in to hash-route page views');
assert.match(appSource, /ATRAHDOM_PENDING_PAGE_VIEWS/,
  'the SPA router must queue rendered views until analytics becomes available');
assert.match(appSource, /page_title:document\.title[\s\S]*page_location:window\.location\.href[\s\S]*page_path:window\.location\.pathname\+window\.location\.search\+window\.location\.hash/,
  'the SPA router must capture the title and URL after render');
assert.match(appRouteBlock, /if\(!state\.ready\)return;[\s\S]*const pageTitle=heading\?\.textContent\.trim\(\)/,
  'loading renders must not send a page view with a stale title');
assert.match(appSource, /history\.replaceState/,
  'filter updates must continue to use replaceState');
const updateUrlBody = appSource.match(/function updateUrl\(\)\{[\s\S]*?\}\s*function emptyState/)?.[0] || '';
assert.doesNotMatch(updateUrlBody, /ATRAHDOM_ANALYTICS|pageView|PENDING_PAGE_VIEWS/,
  'filter-only replaceState changes must not call or enqueue page views');
const updateUrlFunction = appSource.match(/function updateUrl\(\)\{[^\r\n]*\}/)?.[0];
assert.ok(updateUrlFunction, 'the actual filter URL updater must be available to exercise');
let filterReplaceCalls = 0;
let filterPageViews = 0;
const filterContext = vm.createContext({
  q: { value: 'trabajo digno' }, sel: { value: 'Informe' }, yearSel: { value: '2026' }, typeFilter: 'post', kind: 'resources',
  location: { pathname: '/cendoc/', search: '', hash: '' },
  history: { replaceState: (_state, _title, url) => { filterReplaceCalls++; filterContext.location.lastFilterUrl = url; } },
  URLSearchParams,
  window: { ATRAHDOM_ANALYTICS: { pageView: () => { filterPageViews++; } } }
});
vm.runInContext(updateUrlFunction, filterContext, { filename: 'filter-update.js' });
filterContext.updateUrl();
assert.equal(filterReplaceCalls, 1, 'filter changes must update the URL via replaceState');
assert.match(filterContext.location.lastFilterUrl, /q=trabajo\+digno/);
assert.equal(filterPageViews, 0, 'filter-only replaceState changes must not add a page view');

const rawDirectory = path.join(root, 'content', 'raw');
const rawFiles = fs.readdirSync(rawDirectory).filter(name => name.toLowerCase().endsWith('.html'));
for (const name of rawFiles) {
  const html = fs.readFileSync(path.join(rawDirectory, name), 'utf8');
  assert.equal((html.match(/<script src="\/js\/analytics\.js" defer><\/script>/g) || []).length, 1,
    `content/raw/${name} must include one shared analytics script`);
  assert.doesNotMatch(html, /UA-52447-2|_gaq\.push|google-analytics\.com\/ga\.js/,
    `content/raw/${name} must not retain Universal Analytics`);
}
for (const directory of ['content/posts', 'content/pages', 'content/attachments']) {
  for (const name of fs.readdirSync(path.join(root, directory)).filter(name => name.toLowerCase().endsWith('.html'))) {
    const html = fs.readFileSync(path.join(root, directory, name), 'utf8');
    assert.doesNotMatch(html, /<script src="\/js\/analytics\.js"/,
      `${directory}/${name} is a source fragment and must not be initialized as a page`);
  }
}
for (const template of ['clean-route-page.html', 'cendoc-page.html', 'comunicado-page.html']) {
  const html = fs.readFileSync(path.join(root, 'templates', template), 'utf8');
  assert.match(html, /<script src="\/js\/analytics\.js" defer><\/script>/,
    `templates/${template} must preserve the shared analytics script`);
  assert.match(html, /<base href="\/">\s*<script src="\/js\/analytics\.js" defer><\/script>/,
    `templates/${template} must place the shared script after base`);
}
const generatorTemplates = [
  ['generate_clean_routes.py', 'clean-route-page.html'],
  ['generate_cendoc_pages.py', 'cendoc-page.html'],
  ['generate_comunicados_pages.py', 'comunicado-page.html']
];
for (const [generator, template] of generatorTemplates) {
  const source = fs.readFileSync(path.join(root, 'scripts', generator), 'utf8');
  assert.ok(source.includes(template), `scripts/${generator} must render through ${template}`);
  const normalizer = source.match(/def _for_generator_check\([\s\S]*?(?=\n\ndef |\n\ndef main)/)?.[0] || '';
  assert.ok(normalizer, `scripts/${generator} must define a scoped generator-check normalizer`);
  assert.doesNotMatch(normalizer, /re\.sub\(r"\\s\+",\s*" "/,
    `scripts/${generator} must not normalize unrelated whitespace in generator checks`);
}

console.log(`Passed: both app/analytics startup orders, delayed route rendering, 4 SPA routes with titles and deduplication, static views, 6 loopback origins, 2 public domains, ${routeFiles.length} route HTML files including ${blogPostFiles.length} Blog posts, ${rawFiles.length} direct-open historical HTML files, source fragments, and 3 templates.`);
