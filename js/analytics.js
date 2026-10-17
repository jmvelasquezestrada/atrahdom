(function (window, document) {
  'use strict';

  var hostname = String(window.location.hostname || '')
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
  var localHosts = ['localhost', '127.0.0.1', '::1'];

  if (localHosts.indexOf(hostname) !== -1 || window.__atrahdomGa4Initialized) {
    return;
  }

  window.__atrahdomGa4Initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', 'G-FXM438VJSP', { send_page_view: false });

  var lastPageLocation = '';
  function sendPageView(pageView) {
    pageView = pageView || {};
    var pageLocation = pageView.page_location || window.location.href;
    if (pageLocation === lastPageLocation) return;
    lastPageLocation = pageLocation;
    window.gtag('event', 'page_view', {
      page_title: pageView.page_title || document.title,
      page_location: pageLocation,
      page_path: pageView.page_path || window.location.pathname + window.location.search + window.location.hash
    });
  }

  var scriptElement = document.currentScript;
  var isSpaRoute = scriptElement && scriptElement.hasAttribute('data-spa-hash') && /^#\//.test(window.location.hash || '');
  window.ATRAHDOM_ANALYTICS = { pageView: sendPageView };
  if (!isSpaRoute) sendPageView();
  var pendingPageViews = window.ATRAHDOM_PENDING_PAGE_VIEWS || [];
  pendingPageViews.forEach(sendPageView);
  pendingPageViews.length = 0;
  window.ATRAHDOM_PENDING_PAGE_VIEWS = pendingPageViews;

  var gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-FXM438VJSP';
  document.head.appendChild(gaScript);
})(window, document);
