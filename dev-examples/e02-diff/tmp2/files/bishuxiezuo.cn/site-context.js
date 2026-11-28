(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NBSite = api;
}(typeof window === 'object' ? window : null, function (root) {
  'use strict';
  var sites = {
    cn: { code: 'cn', language: 'zh', origin: 'https://bishuxiezuo.cn', checkout: true },
    global: { code: 'global', language: 'en', origin: 'https://www.novelbuilt.com', checkout: false }
  };
  var publicPages = ['home', 'world-state', 'roadmap', 'pricing', 'credit-pricing', 'tools', 'community', 'docs', 'about', 'terms', 'privacy', 'billing-policy', 'public-api-top-up'];
  function resolve(hostname, renderedSite) {
    var host = String(hostname || '').toLowerCase().replace(/\.$/, '');
    if (host === 'www.novelbuilt.com' || host === 'novelbuilt.com') return sites.global;
    if (host === 'bishuxiezuo.cn' || host === 'www.bishuxiezuo.cn') return sites.cn;
    return sites[renderedSite] || sites.cn;
  }
  var current = resolve(root && root.location.hostname, root && root.document.documentElement.dataset.site);
  function read(key) {
    try { return root && root.localStorage.getItem(key); } catch (_error) { return null; }
  }
  function interfaceLanguage() {
    var preference = read('lf_clang') || read('lf_lang');
    return preference === 'zh' || preference === 'en' ? preference : current.language;
  }
  function rememberLanguage(language) {
    if (language !== 'zh' && language !== 'en') return;
    try { root.localStorage.setItem('lf_clang', language); root.localStorage.setItem('lf_lang', language); } catch (_error) { /* Storage is optional. */ }
  }
  function languageUrl(language, href) {
    var target = language === 'en' ? sites.global : sites.cn;
    var url = new URL(href || (root && root.location.href) || '/', current.origin);
    var match = /^\/(?:public\/)?site\/([a-z-]+)\.html$/.exec(url.pathname);
    var pathname = match && publicPages.includes(match[1]) ? '/site/' + match[1] + '.html' : '/site/home.html';
    // Only docs identity and fragment have meaning across the independent sites.
    var doc = pathname === '/site/docs.html' ? url.searchParams.get('doc') : '';
    return target.origin + pathname + (doc && /^[a-z0-9-]+$/.test(doc) ? '?doc=' + encodeURIComponent(doc) : '') + (pathname === '/site/docs.html' ? '' : url.hash);
  }
  function switchPublicLanguage(language) {
    if (language !== 'zh' && language !== 'en') return;
    if (language === current.language) return;
    root.location.assign(languageUrl(language));
  }
  function apiBase() {
    var host = root && root.location.hostname;
    if (host === 'bishuxiezuo.cn' || host === 'www.bishuxiezuo.cn' || host === 'www.novelbuilt.com' || host === 'novelbuilt.com') return '';
    return read('lf_api_base') || '';
  }
  function pageCopy() {
    var page = root && root.location.pathname.split('/').pop();
    var content = root && root.NB_ENGLISH_CONTENT || {};
    return { dictionary: content.dictionaries && content.dictionaries[page] || {}, texts: content.texts && content.texts[page] || {} };
  }
  function englishDictionary(dictionary) {
    if (current.language === 'en') Object.assign(dictionary, pageCopy().dictionary);
    return dictionary;
  }
  function translateDocument() {
    if (!root || current.language !== 'en') return;
    var texts = pageCopy().texts;
    var walker = root.document.createTreeWalker(root.document.body, root.NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('script,style')) continue;
      var value = node.textContent.trim();
      if (Object.prototype.hasOwnProperty.call(texts, value)) node.textContent = node.textContent.replace(value, texts[value]);
    }
    root.document.querySelectorAll('[title],[alt],[placeholder],[aria-label]').forEach(function (element) {
      ['title', 'alt', 'placeholder', 'aria-label'].forEach(function (attribute) {
        var value = element.getAttribute(attribute);
        if (Object.prototype.hasOwnProperty.call(texts, value)) element.setAttribute(attribute, texts[value]);
      });
    });
  }
  if (root) root.document.addEventListener('DOMContentLoaded', translateDocument);
  return {
    current: current, sites: sites, resolve: resolve, publicPages: publicPages,
    publicLanguage: function () { return current.language; },
    interfaceLanguage: interfaceLanguage, rememberLanguage: rememberLanguage,
    languageUrl: languageUrl, switchPublicLanguage: switchPublicLanguage,
    checkoutAvailable: function () { return current.checkout; }, apiBase: apiBase,
    englishDictionary: englishDictionary, translateDocument: translateDocument
  };
}));
