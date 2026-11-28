(function () {
  'use strict';

  var endpoint = '/api/analytics/pageviews';
  var consentKey = 'lf_analytics_consent_2026-08-17';
  var started = false;
  var policy = null;
  var temporaryChoice = null;
  var dismissedKey = 'lf_analytics_notice_dismissed';
  var ready;
  var cleanupCollection = null;
  var pendingPageview = null;
  var withdrawalPending = false;
  var withdrawalPromise = null;

  function allowed() {
    return !!policy && policy.enabled && (choice() === 'granted' || (!choice() && policy.default_enabled));
  }

  function language() {
    if (window.NBSite) return /\/site\//.test(location.pathname) ? window.NBSite.publicLanguage() : window.NBSite.interfaceLanguage();
    try {
      return (localStorage.getItem('lf_lang') || localStorage.getItem('lf_clang') || 'zh') === 'en' ? 'en' : 'zh';
    } catch (_error) {
      return 'zh';
    }
  }

  function choice() {
    if (temporaryChoice) return temporaryChoice;
    try { return localStorage.getItem(consentKey); } catch (_error) { return 'denied'; }
  }

  function remember(value) {
    try { localStorage.setItem(consentKey, value); temporaryChoice = null; }
    catch (_error) { temporaryChoice = value; }
  }

  function noticeDismissed() {
    try { return sessionStorage.getItem(dismissedKey) === 'yes'; } catch (_error) { return false; }
  }

  function renderBanner(root) {
    var en = language() === 'en';
    var message = en
      ? 'With your permission, we collect first-party visit and performance data to improve the site. You can use necessary storage only without affecting registration or use.'
      : '经您允许后，我们才会收集第一方访问与性能数据，用于改进站点。您也可以仅使用必要存储，不影响注册和使用。';
    var left = en ? 'Necessary only' : '仅必要功能';
    var right = en ? 'Allow analytics' : '允许访问统计';
    root.innerHTML = '<p>' + message + ' <a href="/site/privacy.html#analytics">' +
      (en ? 'Privacy details' : '查看隐私说明') + '</a></p><div class="lf-privacy-actions">' +
      '<button type="button" data-analytics-deny>' + left + '</button>' +
      '<button type="button" data-analytics-allow>' + right + '</button></div>';
  }

  function ensureStyles() {
    if (document.getElementById('lf-privacy-choice-css')) return;
    var style = document.createElement('style');
    style.id = 'lf-privacy-choice-css';
    style.textContent = '.lf-privacy-choice{position:fixed;left:20px;right:20px;bottom:20px;z-index:1000;display:flex;align-items:center;justify-content:space-between;gap:22px;max-width:920px;margin:auto;padding:18px 20px;border:1px solid rgba(34,29,22,.16);border-radius:12px;background:#fefcf8;color:#221d16;box-shadow:0 22px 60px -28px rgba(34,29,22,.55);font-family:"Noto Sans SC","PingFang SC",system-ui,sans-serif}.lf-privacy-choice[hidden]{display:none}.lf-privacy-choice p{margin:0;font-size:13px;line-height:1.65;color:#5e5447}.lf-privacy-choice a{color:#6f511f;text-decoration:underline;text-underline-offset:3px}.lf-privacy-actions{display:flex;gap:8px;flex:none}.lf-privacy-actions button{min-height:40px;padding:0 15px;border:1px solid rgba(34,29,22,.18);border-radius:999px;background:transparent;color:#221d16;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer}.lf-privacy-actions button[data-analytics-allow]{background:#221d16;color:#fefcf8;border-color:#221d16}.lf-privacy-actions button:focus-visible,.lf-privacy-choice a:focus-visible{outline:2px solid #9b6c22;outline-offset:3px}@media(max-width:680px){.lf-privacy-choice{left:12px;right:12px;bottom:12px;display:block}.lf-privacy-actions{margin-top:14px;display:grid;grid-template-columns:1fr 1fr}.lf-privacy-actions button{padding:0 10px}}[data-theme="dark"] .lf-privacy-choice{background:#211b14;color:#f4ede0;border-color:rgba(244,237,224,.18)}[data-theme="dark"] .lf-privacy-choice p{color:#bcb2a1}[data-theme="dark"] .lf-privacy-choice a{color:#d8b36e}[data-theme="dark"] .lf-privacy-actions button{color:#f4ede0;border-color:rgba(244,237,224,.2)}[data-theme="dark"] .lf-privacy-actions button[data-analytics-allow]{background:#f4ede0;color:#17130e}';
    document.head.appendChild(style);
  }

  function banner() {
    var root = document.getElementById('lf-privacy-choice');
    if (root) return root;
    ensureStyles();
    root = document.createElement('section');
    root.id = 'lf-privacy-choice';
    root.className = 'lf-privacy-choice';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', language() === 'en' ? 'Analytics preference' : '访问统计偏好');
    renderBanner(root);
    root.addEventListener('click', function (event) {
      if (!event.target.closest('[data-analytics-allow], [data-analytics-deny]')) return;
      if (!policy || !policy.buttons_affect_collection) {
        root.hidden = true;
        try { sessionStorage.setItem(dismissedKey, 'yes'); } catch (_error) {}
        return;
      }
      if (event.target.closest('[data-analytics-allow]')) {
        remember('granted');
        root.hidden = true;
        start();
      }
      if (event.target.closest('[data-analytics-deny]')) {
        remember('denied');
        root.hidden = true;
        withdraw();
      }
    });
    document.body.appendChild(root);
    return root;
  }

  function withdraw() {
    if (cleanupCollection) { cleanupCollection(); cleanupCollection = null; }
    started = false;
    if (withdrawalPending) return withdrawalPromise;
    withdrawalPending = true;
    withdrawalPromise = Promise.resolve(pendingPageview).catch(function () {}).then(function () {
      return fetch('/api/analytics/consent', {
        method: 'DELETE', credentials: 'same-origin', keepalive: true
      });
    }).catch(function () {}).then(function () { withdrawalPending = false; });
    return withdrawalPromise;
  }

  function openPreferences() {
    var root = banner();
    renderBanner(root);
    root.hidden = false;
    var first = root.querySelector('button');
    if (first) first.focus();
  }

  function start() {
    if (started || !allowed()) return;
    if (withdrawalPending) return withdrawalPromise.then(start);
    started = true;
    var live = true;
    var observers = [];
    var pageViewId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (char) {
          var random = Math.random() * 16 | 0;
          return (char === 'x' ? random : (random & 3 | 8)).toString(16);
        });
    var lcp = null;
    var inp = null;
    var cls = 0;
    var clsObserved = false;
    var pageviewReady = false;
    var vitalsSent = false;
    var engagedMs = 0;
    var activeSince = null;
    var lastEngagementSent = 0;
    var heartbeatId = null;

    function deviceClass() {
      var width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    }

    function referrerHost() {
      if (!document.referrer) return null;
      try {
        var referrer = new URL(document.referrer);
        return referrer.origin === location.origin ? null : referrer.hostname;
      } catch (_error) { return null; }
    }

    function queryValue(params, key, maxLength) {
      var value = (params.get(key) || '').trim().replace(/\s+/g, ' ');
      return value ? value.slice(0, maxLength) : null;
    }

    function sourceCode(params) {
      var value = queryValue(params, 'source', 32);
      if (!value && (location.pathname === '/desktop-authorize.html' || location.pathname === '/oauth/authorize')) {
        if (params.get('client_id') === 'determinflow-public-api') value = 'dfp';
        if (params.get('client_id') === 'determinflow-resource-marketplace') value = 'dfm';
        if (params.get('client_id') === 'determinflow-core') value = 'dfc';
      }
      return value && /^[a-z0-9][a-z0-9_-]{0,31}$/.test(value.toLowerCase()) ? value.toLowerCase() : null;
    }

    function ttfb() {
      var navigation = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      return navigation ? Math.max(0, Math.round(navigation.responseStart - navigation.startTime)) : null;
    }

    function observe(type, callback, options) {
      if (typeof PerformanceObserver === 'undefined') return;
      try {
        var observer = new PerformanceObserver(callback);
        observer.observe(Object.assign({ type: type, buffered: true }, options || {}));
        observers.push(observer);
      } catch (_error) {}
    }

    observe('largest-contentful-paint', function (list) {
      var entries = list.getEntries();
      var latest = entries[entries.length - 1];
      if (latest) lcp = Math.round(latest.startTime);
    });
    observe('layout-shift', function (list) {
      list.getEntries().forEach(function (entry) {
        if (!entry.hadRecentInput) { cls += entry.value; clsObserved = true; }
      });
    });
    observe('event', function (list) {
      list.getEntries().forEach(function (entry) {
        if (entry.interactionId && (!inp || entry.duration > inp)) inp = Math.round(entry.duration);
      });
    }, { durationThreshold: 40 });

    var params = new URLSearchParams(location.search);
    pendingPageview = fetch(endpoint, {
      method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/json', 'X-LF-Analytics-Consent': choice() === 'granted' ? 'granted' : 'default' },
      body: JSON.stringify({
        page_view_id: pageViewId,
        path: location.pathname,
        referrer_host: referrerHost(),
        source: sourceCode(params),
        device_class: deviceClass(),
        ttfb_ms: ttfb()
      })
    }).then(function (response) {
      return response.ok ? response.json() : null;
    }).then(function (result) {
      pageviewReady = Boolean(live && allowed() && result && result.accepted);
      if (pageviewReady && activeSince === null && engagedMs > lastEngagementSent) sendEngagement();
    }).catch(function () {});

    function totalEngagedMs() {
      var current = engagedMs;
      if (activeSince !== null) current += Math.max(0, performance.now() - activeSince);
      return Math.min(43200000, Math.round(current));
    }

    function sendEngagement() {
      if (!pageviewReady || !allowed()) return;
      var total = totalEngagedMs();
      if (total <= lastEngagementSent) return;
      lastEngagementSent = total;
      var body = JSON.stringify({ engaged_ms: total });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint + '/' + pageViewId + '/engagement', new Blob([body], { type: 'application/json' }));
        return;
      }
      fetch(endpoint + '/' + pageViewId + '/engagement', {
        method: 'POST', credentials: 'same-origin', keepalive: true,
        headers: { 'Content-Type': 'application/json' }, body: body
      }).catch(function () {});
    }

    function startActiveTime() {
      if (!allowed() || activeSince !== null || document.visibilityState !== 'visible' || !document.hasFocus()) return;
      activeSince = performance.now();
      if (heartbeatId === null) heartbeatId = window.setInterval(sendEngagement, 60000);
    }

    function stopActiveTime() {
      if (activeSince !== null) { engagedMs += Math.max(0, performance.now() - activeSince); activeSince = null; }
      if (heartbeatId !== null) { window.clearInterval(heartbeatId); heartbeatId = null; }
      sendEngagement();
    }

    function sendVitals() {
      if (!allowed() || vitalsSent || !pageviewReady || (lcp === null && inp === null && !clsObserved)) return;
      vitalsSent = true;
      var body = JSON.stringify({
        lcp_ms: lcp,
        inp_ms: inp,
        cls: clsObserved ? Math.round(cls * 1000) / 1000 : null
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint + '/' + pageViewId + '/vitals', new Blob([body], { type: 'application/json' }));
        return;
      }
      fetch(endpoint + '/' + pageViewId + '/vitals', {
        method: 'POST', credentials: 'same-origin', keepalive: true,
        headers: { 'Content-Type': 'application/json' }, body: body
      }).catch(function () {});
    }

    function visibilityChanged() {
      if (document.visibilityState === 'hidden') { stopActiveTime(); sendVitals(); } else startActiveTime();
    }
    function pageHidden() { stopActiveTime(); sendVitals(); }
    document.addEventListener('visibilitychange', visibilityChanged);
    window.addEventListener('focus', startActiveTime);
    window.addEventListener('blur', stopActiveTime);
    window.addEventListener('pagehide', pageHidden);
    cleanupCollection = function () {
      live = false;
      pageviewReady = false;
      activeSince = null;
      if (heartbeatId !== null) { window.clearInterval(heartbeatId); heartbeatId = null; }
      observers.forEach(function (observer) { observer.disconnect(); });
      document.removeEventListener('visibilitychange', visibilityChanged);
      window.removeEventListener('focus', startActiveTime);
      window.removeEventListener('blur', stopActiveTime);
      window.removeEventListener('pagehide', pageHidden);
    };
    startActiveTime();
    return pendingPageview;
  }

  window.LFPrivacy = {
    consent: choice,
    collection: function () { return allowed() ? (choice() === 'granted' ? 'granted' : 'default') : null; },
    ready: function () { return ready; },
    open: openPreferences,
    set: function (value) {
      if (value === 'granted') { remember('granted'); return start(); }
      if (value === 'denied') { remember('denied'); return withdraw(); }
    }
  };

  ready = fetch('/api/analytics/config', { credentials: 'same-origin', cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('Analytics settings unavailable');
      return response.json();
    })
    .then(function (value) {
      policy = {
        enabled: value.enabled === true,
        popup_enabled: value.popup_enabled === true,
        default_enabled: value.default_enabled === true,
        buttons_affect_collection: value.buttons_affect_collection !== false
      };
      var existing = document.getElementById('lf-privacy-choice');
      if (existing) renderBanner(existing);
      if (allowed()) start();
      if (policy.popup_enabled && !choice() && !noticeDismissed()) banner();
    })
    .catch(function () { /* No collection or automatic popup without configuration. */ });
}());
