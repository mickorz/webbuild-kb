/* Shared account popover for the public site and console; no React dependency. */
(function () {
  'use strict';
  var STR = {
    zh: {
      account: '个人中心', subscription: '我的订阅', creator: '创作者', refresh: '刷新余额', refreshing: '正在刷新余额',
      capacity: '预计可写', single_writer: '按单写手估算', chapters: '章', less_one: '不足 1', buy: '加购', overview: '订阅与笔力', redeem: 'CDK 兑换', quota: '套餐额度',
      activity: '活动笔力', permanent: '加量笔力', monthly: '月付', yearly: '年付',
      loading: '加载中…', signed_out: '登录后查看', error: '额度暂不可用', retry: '重试',
      remaining: '剩余 ', updating: '正在更新…', unknown: '额度未知', info: '说明',
      activity_info: '限时有效，会优先消耗', permanent_info: '永久有效，不随会员套餐重置',
    },
    en: {
      account: 'Account', subscription: 'My subscription', creator: 'Writer', refresh: 'Refresh credits', refreshing: 'Refreshing credits',
      capacity: 'Estimated writing', single_writer: 'Single-writer estimate', chapters: 'chapters', less_one: 'Less than 1', buy: 'Add credits', overview: 'Subscription and credits', redeem: 'Redeem CDK', quota: 'Plan credits',
      activity: 'Promo credits', permanent: 'Extra credits', monthly: 'Monthly', yearly: 'Yearly',
      loading: 'Loading…', signed_out: 'Sign in to view', error: 'Credits unavailable', retry: 'Retry',
      remaining: 'Left ', updating: 'Updating…', unknown: 'Credits unknown', info: ' info',
      activity_info: 'Expires; used first', permanent_info: 'Never expires; unaffected by plan resets',
    },
  };
  function lang() {
    if (window.NBSite && /\/site\//.test(window.location.pathname)) return window.NBSite.publicLanguage();
    if (window.CLANG === 'en' || window.CLANG === 'zh') return window.CLANG;
    try { return (localStorage.getItem('lf_clang') || localStorage.getItem('lf_lang') || 'zh') === 'en' ? 'en' : 'zh'; }
    catch (e) { return 'zh'; }
  }
  function t(key) { return STR[lang()][key] || key; }
  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  function token() {
    try { var x = JSON.parse(localStorage.getItem('lf_tokens') || 'null'); return (x && (x.access_token || x.accessToken)) || null; }
    catch (e) { return null; }
  }
  function apiBase() {
    try { return window.NBSite ? window.NBSite.apiBase() : localStorage.getItem('lf_api_base') || ''; } catch (e) { return ''; }
  }
  function clientNow() {
    return window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now();
  }
  function timestamp(value) {
    var result = typeof value === 'string' && value ? Date.parse(value) : NaN;
    return Number.isFinite(result) ? result : null;
  }
  function amount(value) { return Number.isSafeInteger(value) ? value : null; }
  function formatCredits(value, locale) {
    var millis = amount(value);
    return millis == null ? '—' : (millis / 1000).toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN', { maximumFractionDigits: 3 });
  }
  function percent(available, total) {
    if (amount(available) == null || available < 0 || amount(total) == null || total < 0) return null;
    if (!total) return available === 0 ? 0 : null;
    return available / total * 100;
  }
  function calibratedNow(serverNow, receivedAt, localNow) {
    var server = timestamp(serverNow);
    return server == null ? null : server + Math.max(0, localNow - receivedAt);
  }
  function countdown(resetAt, now, locale) {
    var deadline = timestamp(resetAt);
    if (deadline == null || now == null) return '—';
    var remaining = deadline - now;
    if (remaining <= 0) return STR[locale === 'en' ? 'en' : 'zh'].updating;
    if (remaining < 3600000) return locale === 'en' ? 'Resets in <1h' : '不足1小时后重置';
    var hours = Math.floor(remaining / 3600000), days = Math.floor(hours / 24);
    return locale === 'en' ? 'Resets in ' + days + 'd ' + (hours % 24) + 'h' : days + '天' + (hours % 24) + '小时后重置';
  }
  function fetchOverview(options) {
    options = options || {};
    var tk = options.accessToken === undefined ? token() : options.accessToken;
    if (!tk) return Promise.resolve(null);
    return fetch((options.base === undefined ? apiBase() : options.base) + '/api/billing/overview', {
      headers: { Authorization: 'Bearer ' + tk }, cache: 'no-store', signal: options.signal,
    }).then(function (response) {
      if (!response.ok) throw new Error('billing_overview_unavailable');
      return response.json();
    });
  }

  function capacityHTML(data, pricingHref) {
    var cap = data.capacity;
    var count = cap && amount(cap.chapters_single), available = cap && amount(cap.available_millis);
    var known = count != null && count >= 0 && available != null && available >= 0;
    var text = !known ? '—' : count === 0 && available > 0 ? t('less_one') : count.toLocaleString(lang() === 'en' ? 'en-US' : 'zh-CN');
    return '<div class="lfav-capacity"><div class="lfav-capacity-top"><span>' + t('capacity') + '</span><strong>' + escapeHTML(text)
      + (known ? '<small> ' + t('chapters') + '</small>' : '') + '</strong></div><div class="lfav-mode"><span>' + t('single_writer') + '</span>'
      + (known && count === 0 ? '<a class="lfav-buy" href="' + escapeHTML(pricingHref + '#packs') + '">' + t('buy') + '</a>' : '') + '</div></div>';
  }

  function injectStyle() {
    if (document.getElementById('lfav-style')) return;
    var style = document.createElement('style');
    style.id = 'lfav-style';
    style.textContent = [
      '.lfav-root{position:relative;display:inline-flex;font-family:var(--sans,system-ui,sans-serif)}',
      '.lfav-root[hidden]{display:none!important}',
      '.lfav-circle{box-sizing:border-box;appearance:none;width:36px;height:36px;min-width:36px;min-height:36px;padding:0;border-radius:50%;background:var(--gold-deep,#9a6a2f);color:#fff;display:grid;place-items:center;font-family:var(--serif,serif);font-size:16px;cursor:pointer;border:1.5px solid rgba(255,255,255,.45);box-shadow:0 1px 3px rgba(0,0,0,.18);transition:transform .18s ease,box-shadow .18s ease}',
      '.lfav-circle:hover{transform:translateY(-1px);box-shadow:0 6px 16px -6px var(--gold-deep,#9a6a2f)}',
      '.lfav-circle:focus-visible,.lfav-entry:focus-visible,.lfav-retry:focus-visible,.lfav-info-button:focus-visible,.lfav-meter:focus-visible,.lfav-refresh:focus-visible,.lfav-buy:focus-visible{outline:2px solid var(--gold-deep,#9a6a2f);outline-offset:2px}',
      '.lfav-pop{box-sizing:border-box;position:absolute;top:calc(100% + 10px);right:0;z-index:200;width:280px;max-width:calc(100vw - 24px);background:var(--card,#fff);color:var(--ink,#222);border:1px solid var(--line,rgba(0,0,0,.1));border-radius:10px;box-shadow:0 24px 60px -28px rgba(0,0,0,.4);font-size:13px;line-height:1.4}',
      '.lfav-pop[hidden],.lfav-bridge[hidden]{display:none}',
      '.lfav-bridge{position:absolute;top:100%;right:0;width:280px;max-width:calc(100vw - 24px);height:10px;z-index:199}',
      '.lfav-named .lfav-circle{width:auto;min-width:0;height:38px;display:flex;align-items:center;gap:8px;padding:2px 9px 2px 3px;border:1px solid transparent;border-radius:7px;background:var(--paper-2,#f8f4eb);color:var(--ink,#222);font-family:var(--sans,system-ui,sans-serif);box-shadow:inset 0 0 0 1px var(--line-2,rgba(34,29,22,.055));transform:none;transition:background-color .16s ease,box-shadow .16s ease,transform .12s ease}',
      '.lfav-named .lfav-circle:hover,.lfav-named .lfav-circle[aria-expanded=true]{background:var(--paper-3,#f1e9da);box-shadow:inset 0 0 0 1px var(--line,rgba(34,29,22,.1))}',
      '.lfav-named .lfav-circle:active{transform:translateY(1px)}',
      '.lfav-trigger-seal{width:32px;height:32px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--gold-deep,#9a6a2f);color:#fff;font-family:var(--serif,serif);font-size:15px}',
      '.lfav-trigger-name{min-width:0;max-width:8em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px;font-weight:500;line-height:20px}',
      '.lfav-trigger-chevron{width:12px;height:12px;flex:none;color:var(--ink-3,#888);transition:transform .18s ease}.lfav-circle[aria-expanded=true] .lfav-trigger-chevron{transform:rotate(180deg)}',
      '.lfav-named .lfav-pop,.lfav-named .lfav-bridge{width:308px;right:var(--lfav-right,-52px)}',
      '.lfav-named .lfav-pop{display:block;opacity:1;visibility:visible;transform:translateY(0) scale(1);transform-origin:top right;box-shadow:0 12px 32px -14px rgba(34,29,22,.22),0 2px 6px rgba(34,29,22,.04);transition:opacity .16s ease,transform .18s cubic-bezier(.2,.8,.2,1),visibility 0s}',
      '.lfav-named .lfav-pop[hidden]{display:block;opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-4px) scale(.985);transition:opacity .12s ease,transform .14s ease,visibility 0s .14s}',
      '.lfav-named .lfav-entry,.lfav-named .lfav-refresh{transition:background-color .14s ease,color .14s ease}',
      '.lfav-named .lfav-entry svg{transition:transform .14s ease}.lfav-named .lfav-entry:hover svg{transform:translateX(2px)}',
      '.lfav-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px 10px}',
      '.lfav-profile-avatar{box-sizing:border-box;width:32px;height:32px;min-width:32px;flex:none;border-radius:50%;display:grid;place-items:center;background:var(--gold-deep,#9a6a2f);color:#fff;font-family:var(--serif,serif);font-size:15px}',
      '.lfav-identity{min-width:0;flex:1}',
      '.lfav-name{display:block;font-size:13px;font-weight:600;line-height:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.lfav-membership{display:flex;align-items:center;flex-wrap:wrap;gap:4px 6px;margin-top:2px;font-size:11px;line-height:16px;color:var(--ink-3,#888)}',
      '.lfav-plan{min-width:0;overflow-wrap:anywhere}',
      '.lfav-refresh{box-sizing:border-box;appearance:none;display:grid;place-items:center;width:26px;height:26px;min-width:26px;min-height:26px;max-width:26px;max-height:26px;flex:none;padding:0;border:0;border-radius:5px;background:transparent;box-shadow:none;color:var(--ink-3,#888);cursor:pointer}',
      '.lfav-refresh svg{display:block;width:14px;height:14px}',
      '.lfav-refresh:hover{background:var(--paper-2,#f6f3ed)}.lfav-refresh:disabled{opacity:.6;cursor:wait}',
      '.lfav-refresh[aria-busy="true"] svg{animation:lfav-spin .8s linear infinite}@keyframes lfav-spin{to{transform:rotate(360deg)}}',
      '.lfav-summary{margin:0 10px;padding:0 12px;background:var(--paper-2,#f6f3ed);border-radius:5px}',
      '.lfav-capacity{padding:11px 0 10px}.lfav-capacity-top{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px}',
      '.lfav-capacity-top strong{font-size:16px;font-weight:600;font-variant-numeric:tabular-nums}.lfav-capacity-top small{font-size:12px;font-weight:400}',
      '.lfav-mode{display:flex;justify-content:space-between;gap:8px;margin-top:4px;font-size:11px;line-height:16px;color:var(--ink-3,#888)}',
      '.lfav-buy{color:var(--gold-deep,#9a6a2f);text-decoration:none;white-space:nowrap}.lfav-buy:hover{text-decoration:underline}',
      '.lfav-cycle{flex:none;font-size:11px;color:var(--ink-3,#888)}',
      '.lfav-quota{padding:9px 0 10px;border-top:1px solid var(--line,rgba(0,0,0,.1))}',
      '.lfav-quota-top{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--ink-3,#888);font-size:12px}',
      '.lfav-value{font-size:14px;font-weight:500;color:var(--ink,#222);font-variant-numeric:tabular-nums}.lfav-quota-top strong{font-size:12px;font-weight:500;color:var(--ink,#222)}',
      '.lfav-countdown{display:block;font-size:11.5px;line-height:14px;color:var(--ink-3,#888);margin-top:5px;min-height:14px}',
      '.lfav-meter{position:relative;height:10px;display:flex;align-items:flex-end;border-radius:2px;cursor:default}',
      '.lfav-details{position:absolute;right:0;bottom:14px;visibility:hidden;color:var(--ink-3,#888);font-size:11.5px;line-height:14px;white-space:nowrap;font-variant-numeric:tabular-nums;pointer-events:none}',
      '.lfav-meter:hover .lfav-details,.lfav-meter:focus-visible .lfav-details{visibility:visible}',
      '.lfav-bar{display:block;width:100%;height:3px;border-radius:2px;background:var(--line,rgba(0,0,0,.1));overflow:hidden}',
      '.lfav-fill{display:block;height:100%;border-radius:inherit;background:var(--ink-3,#a8987c)}',
      '.lfav-balances{padding:11px 0}',
      '.lfav-row{position:relative;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 16px;min-height:28px;box-sizing:border-box}',
      '.lfav-label{display:inline-flex;align-items:center;gap:3px;color:var(--ink-3,#888);font-size:13px}',
      '.lfav-info{display:inline-flex;align-items:center}',
      '.lfav-info-button{box-sizing:border-box;appearance:none;display:grid;place-items:center;width:20px;height:20px;min-width:20px;min-height:20px;max-width:20px;max-height:20px;padding:0;margin:0;border:0;border-radius:3px;background:transparent;box-shadow:none;color:var(--ink-3,#888);line-height:1;cursor:help}',
      '.lfav-info-button:hover{background:transparent}',
      '.lfav-info-button svg{display:block;width:13px;height:13px;min-width:13px;min-height:13px;flex:none;fill:none;stroke:currentColor;stroke-width:1;transform:translate(-2px,1px);opacity:.78}',
      '.lfav-info-button:hover svg,.lfav-info-button:focus-visible svg{opacity:1}',
      '.lfav-info-dot{fill:currentColor;stroke:none}',
      '.lfav-tooltip{display:none;position:absolute;bottom:calc(100% + 3px);left:16px;right:16px;z-index:2;padding:8px 10px;border-radius:5px;background:var(--ink,#302d28);color:var(--card,#fff);font-size:12px;line-height:1.4;box-sizing:border-box}',
      '.lfav-info:hover .lfav-tooltip,.lfav-info:focus-within .lfav-tooltip{display:block}',
      '.lfav-actions{border-top:1px solid var(--line,rgba(0,0,0,.1));padding:0 0 2px}',
      '.lfav-entry{box-sizing:border-box;appearance:none;display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:40px;background:none;border:none;cursor:pointer;font-size:13px;color:var(--ink,#222);padding:10px 16px;font-family:inherit;text-decoration:none;border-radius:0}',
      '.lfav-entry:last-child{border-radius:0 0 9px 9px}',
      '.lfav-entry:hover{background:var(--paper-2,rgba(0,0,0,.04))}',
      '.lfav-entry svg{flex:none;color:var(--ink-3,#888)}',
      '.lfav-empty{padding:4px 16px 14px;color:var(--ink-3,#888);font-size:13px}',
      '.lfav-retry{appearance:none;padding:0;margin-left:8px;min-height:0;background:none;border:none;color:var(--gold-deep,#9a6a2f);font:inherit;cursor:pointer}',
      '@media (prefers-reduced-motion: reduce){.lfav-circle,.lfav-named .lfav-circle,.lfav-trigger-chevron,.lfav-named .lfav-pop,.lfav-named .lfav-pop[hidden],.lfav-named .lfav-entry,.lfav-named .lfav-entry svg,.lfav-named .lfav-refresh{transition:none}.lfav-named .lfav-pop[hidden],.lfav-named .lfav-circle:active,.lfav-named .lfav-entry:hover svg{transform:none}.lfav-refresh[aria-busy="true"] svg{animation:none}}',
    ].join('');
    document.head.appendChild(style);
  }

  var REFRESH = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 5v5h-5M4 19v-5h5M5.6 8a7 7 0 0 1 12-2L20 10M4 14l2.4 4a7 7 0 0 0 12-2"/></svg>';
  var INFO = '<svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5.5"/><path d="M6.5 6v3"/><circle class="lfav-info-dot" cx="6.5" cy="3.5" r=".6"/></svg>';
  var CHEVRON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  var instances = new Set(), nextId = 0;
  function balanceHTML(kind, value, id) {
    var tip = id + '-' + kind;
    return '<div class="lfav-row"><span class="lfav-label">' + t(kind)
      + '<span class="lfav-info"><button type="button" class="lfav-info-button" data-lfav-focus="' + kind + '" aria-label="' + t(kind) + t('info') + '" aria-describedby="' + tip + '">' + INFO + '</button>'
      + '<span class="lfav-tooltip" id="' + tip + '" role="tooltip">' + t(kind + '_info') + '</span></span></span>'
      + '<strong class="lfav-value">' + formatCredits(value, lang()) + '</strong></div>';
  }
  function overviewHTML(data, now, id, pricingHref) {
    var sub = data.subscription, ratio = percent(sub.available_millis, sub.total_millis);
    var available = formatCredits(sub.available_millis, lang()), total = formatCredits(sub.total_millis, lang());
    var description = ratio == null ? t('unknown') + ' · ' + available + '/' + total
      : (lang() === 'en' ? available + ' of ' + total + ' credits remaining' : '剩余' + available + '笔力，总额度' + total + '笔力');
    var meter = ratio == null ? 'role="img" aria-label="' + escapeHTML(t('quota') + ' · ' + description) + '"'
      : 'role="meter" aria-label="' + t('quota') + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.min(100, ratio) + '" aria-valuetext="' + escapeHTML(description) + '"';
    return '<div class="lfav-summary">' + capacityHTML(data, pricingHref) + '<div class="lfav-quota"><div class="lfav-quota-top"><span>' + t('quota') + '</span><strong>' + t('remaining') + (ratio == null ? '—' : Math.round(ratio) + '%') + '</strong></div>'
      + '<span class="lfav-countdown">' + escapeHTML(countdown(sub.reset_at, now, lang())) + '</span>'
      + '<div class="lfav-meter" tabindex="0" data-lfav-focus="quota" ' + meter + '>'
      + '<span class="lfav-details" aria-hidden="true">' + available + '/' + total + '</span><span class="lfav-bar"><span class="lfav-fill" style="width:' + (ratio == null ? 0 : Math.min(100, ratio)) + '%"></span></span></div></div>'
      + '</div><div class="lfav-balances">' + (data.activity == null ? '' : balanceHTML('activity', data.activity.available_millis, id))
      + balanceHTML('permanent', data.permanent.available_millis, id) + '</div>';
  }

  function mount(el, options) {
    if (!el) return null;
    if (el._lfavController) { el._lfavController.update(options || {}); return el._lfavController; }
    var opts = options || {}, id = 'lfav-' + (++nextId), disposed = false;
    var data = null, state = 'idle', receivedAt = 0, dataIdentity = null, requestId = 0;
    var timer = null, hoverTimer = null, hovered = false, isOpen = false, pinned = false, requestController = null, listeners = [];
    injectStyle();
    el._lfavMounted = true;
    el.classList.add('lfav-root');
    el.innerHTML = '<button type="button" class="lfav-circle" aria-expanded="false" aria-controls="' + id + '"></button><div class="lfav-bridge" hidden></div>'
      + '<div class="lfav-pop" id="' + id + '" role="region" hidden inert><div class="lfav-header"><span class="lfav-profile-avatar" aria-hidden="true"></span><div class="lfav-identity"><strong class="lfav-name"></strong><div class="lfav-membership"><span class="lfav-plan"></span><span aria-hidden="true">·</span><span class="lfav-cycle"></span></div></div><button type="button" class="lfav-refresh" data-lfav-action="refresh" data-lfav-focus="refresh">' + REFRESH + '</button></div><div class="lfav-body"></div><div class="lfav-actions"></div></div>';
    var circle = el.querySelector('.lfav-circle'), pop = el.querySelector('.lfav-pop'), bridge = el.querySelector('.lfav-bridge');
    var body = el.querySelector('.lfav-body'), actions = el.querySelector('.lfav-actions');
    function identity() { return apiBase() + '\n' + (token() || ''); }
    function currentTime() { return data ? calibratedNow(data.server_now, receivedAt, clientNow()) : null; }
    function stopTimer() { if (timer != null) clearInterval(timer); timer = null; }
    function listen(target, name, callback) {
      target.addEventListener(name, callback);
      listeners.push(function () { target.removeEventListener(name, callback); });
    }
    function entry(kind, callback, href) {
      var attrs = ' class="lfav-entry" data-lfav-action="' + kind + '" data-lfav-focus="' + kind + '"';
      return (typeof callback === 'function' ? '<button type="button"' + attrs + '>' : '<a' + attrs + ' href="' + escapeHTML(href) + '">')
        + t(kind) + CHEVRON + (typeof callback === 'function' ? '</button>' : '</a>');
    }
    function positionPopover() {
      if (!opts.namedTrigger || !isOpen) return;
      var viewport = document.documentElement.clientWidth || window.innerWidth;
      var width = Math.min(308, Math.max(0, viewport - 24)), right = el.getBoundingClientRect().right;
      var edge = Math.max(12 + width, Math.min(viewport - 12, right + 52));
      el.style.setProperty('--lfav-right', (right - edge) + 'px');
    }
    function render() {
      if (disposed) return;
      var active = el.contains(document.activeElement) && document.activeElement.getAttribute('data-lfav-focus');
      var seal = opts.seal || (lang() === 'en' ? 'N' : '砚');
      el.querySelector('.lfav-profile-avatar').textContent = seal;
      var penName = opts.penName;
      if (penName && typeof penName === 'object') penName = penName[lang()] || penName.zh || penName.en;
      el.classList.toggle('lfav-named', !!opts.namedTrigger);
      if (opts.namedTrigger) circle.setAttribute('aria-pressed', String(pinned));
      else { pinned = false; circle.removeAttribute('aria-pressed'); }
      if (opts.namedTrigger) {
        if (!circle.querySelector('.lfav-trigger-name')) circle.innerHTML = '<span class="lfav-trigger-seal" aria-hidden="true"></span><span class="lfav-trigger-name"></span><svg class="lfav-trigger-chevron" aria-hidden="true" viewBox="0 0 12 12" fill="none" stroke="currentColor"><path d="m3 4.5 3 3 3-3"/></svg>';
        circle.querySelector('.lfav-trigger-seal').textContent = seal;
        circle.querySelector('.lfav-trigger-name').textContent = penName || t('creator');
        circle.title = penName || t('creator');
      } else { circle.textContent = seal; circle.removeAttribute('title'); }
      positionPopover();
      var nameLabel = el.querySelector('.lfav-name');
      nameLabel.textContent = penName || t('creator'); nameLabel.title = nameLabel.textContent;
      var refresh = el.querySelector('.lfav-refresh'), busy = state === 'loading';
      refresh.disabled = busy || state === 'signed_out';
      refresh.setAttribute('aria-busy', String(busy));
      refresh.setAttribute('aria-label', t(busy ? 'refreshing' : 'refresh')); refresh.title = t(busy ? 'refreshing' : 'refresh');
      circle.setAttribute('aria-label', (opts.namedTrigger ? (penName || t('creator')) + ' · ' : '') + t('overview'));
      pop.setAttribute('aria-label', t('overview'));
      var name = data && data.subscription.plan_name;
      if (name && typeof name === 'object') name = name[lang()] || name.zh || name.en;
      el.querySelector('.lfav-plan').textContent = name || (data && data.subscription.plan_code) || '—';
      var cycle = data && data.subscription.billing_cycle;
      el.querySelector('.lfav-cycle').textContent = cycle === 'monthly' || cycle === 'yearly' ? t(cycle) : '—';
      body.innerHTML = data ? overviewHTML(data, currentTime(), id, opts.pricingHref || '/site/pricing.html') : '<div class="lfav-empty" role="status">'
        + t(state === 'error' ? 'error' : state === 'signed_out' ? 'signed_out' : 'loading')
        + (state === 'error' ? '<button type="button" class="lfav-retry" data-lfav-action="retry" data-lfav-focus="retry">' + t('retry') + '</button>' : '') + '</div>';
      body.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
      actions.innerHTML = entry('redeem', opts.onRedeem, opts.redeemHref || '/console/console.html#settings/billing/redeem')
        + entry('subscription', null, opts.pricingHref || '/site/pricing.html')
        + entry('account', opts.onAccount, opts.accountHref || '/console/console.html#settings');
      if (active) {
        var restored = el.querySelector('[data-lfav-focus="' + active + '"]');
        (restored || circle).focus({ preventScroll: true });
      }
    }
    function syncIdentity() {
      if (disposed || dataIdentity === identity()) return;
      if (isOpen) load();
      else {
        requestId++;
        if (requestController) requestController.abort();
        data = null; dataIdentity = null; state = 'idle'; stopTimer(); render();
      }
    }
    function tick() {
      if (disposed || !isOpen) return;
      if (dataIdentity !== identity()) { syncIdentity(); return; }
      if (!data) return;
      var now = currentTime(), reset = timestamp(data.subscription.reset_at);
      if (reset != null && now != null && reset <= now) { load(); return; }
      var label = body.querySelector('.lfav-countdown'), text = countdown(data.subscription.reset_at, now, lang());
      if (label && label.textContent !== text) label.textContent = text;
    }
    function startTimer() {
      stopTimer();
      if (isOpen && data && !document.hidden) timer = setInterval(tick, 1000);
    }
    function load(preserve) {
      if (disposed) return Promise.resolve(null);
      var seq = ++requestId, key = identity(), tk = token();
      if (requestController) requestController.abort();
      requestController = new AbortController();
      var reset = data && timestamp(data.subscription.reset_at), now = currentTime();
      var keep = preserve === true && tk && data && dataIdentity === key && (reset == null || (now != null && reset > now));
      stopTimer(); if (!keep) data = null; dataIdentity = key; state = tk ? 'loading' : 'signed_out'; render();
      if (!tk) return Promise.resolve(null);
      return fetchOverview({ accessToken: tk, base: apiBase(), signal: requestController.signal }).then(function (result) {
        if (disposed || seq !== requestId) return null;
        if (identity() !== key) { syncIdentity(); return null; }
        if (!result || !result.subscription || !result.permanent) throw new Error('billing_overview_invalid');
        receivedAt = clientNow();
        var now = calibratedNow(result.server_now, receivedAt, receivedAt), reset = timestamp(result.subscription.reset_at);
        // An already expired response cannot assert the next period's balance.
        if (reset != null && now != null && reset <= now) throw new Error('billing_overview_expired');
        data = result; state = 'ready'; render(); startTimer();
        return result;
      }).catch(function () {
        if (disposed || seq !== requestId) return null;
        if (identity() !== key) { syncIdentity(); return null; }
        data = null; state = 'error'; render(); return null;
      });
    }
    function open() {
      if (disposed) return;
      clearTimeout(hoverTimer);
      var wasOpen = isOpen;
      isOpen = true; pop.inert = false; pop.hidden = false; bridge.hidden = false; circle.setAttribute('aria-expanded', 'true');
      if (dataIdentity !== identity() || state === 'idle' || (!wasOpen && data && clientNow() - receivedAt > 30000)) load();
      else { render(); tick(); startTimer(); }
    }
    function close() {
      clearTimeout(hoverTimer); stopTimer(); isOpen = false; pinned = false; if (opts.namedTrigger) circle.setAttribute('aria-pressed', 'false'); pop.inert = true; pop.hidden = true; bridge.hidden = true; circle.setAttribute('aria-expanded', 'false');
    }
    function scheduleClose() {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { if (!pinned && !hovered && !el.contains(document.activeElement)) close(); }, 120);
    }
    listen(el, 'mouseenter', function () { hovered = true; open(); });
    listen(el, 'mouseleave', function () { hovered = false; scheduleClose(); });
    listen(el, 'focusin', function () { clearTimeout(hoverTimer); });
    listen(el, 'focusout', scheduleClose);
    listen(circle, 'click', function () {
      if (opts.namedTrigger) {
        if (pinned) close();
        else { pinned = true; open(); }
      } else if (isOpen) close(); else open();
    });
    listen(el, 'keydown', function (event) {
      if (event.key === 'Escape' && isOpen) { event.preventDefault(); event.stopPropagation(); close(); circle.focus(); }
      if (event.key === 'ArrowDown' && event.target === circle) { event.preventDefault(); open(); actions.querySelector('.lfav-entry').focus(); }
    });
    listen(el, 'click', function (event) {
      var action = event.target.closest('[data-lfav-action]');
      if (!action || !el.contains(action)) return;
      var kind = action.getAttribute('data-lfav-action');
      if (kind === 'retry' || kind === 'refresh') { event.preventDefault(); if (state !== 'loading') load(kind === 'refresh'); return; }
      if (kind === 'subscription') { close(); return; }
      var callback = kind === 'redeem' ? opts.onRedeem : opts.onAccount;
      close();
      if (typeof callback === 'function') { event.preventDefault(); callback(); }
    });
    listen(document, 'pointerdown', function (event) { if (isOpen && !el.contains(event.target)) close(); });
    listen(window, 'resize', positionPopover);
    listen(window, 'storage', function (event) { if (!event.key || ['lf_tokens', 'lf_api_base'].includes(event.key)) syncIdentity(); else if (['lf_clang', 'lf_lang'].includes(event.key)) render(); });
    listen(document, 'visibilitychange', function () { if (document.hidden) stopTimer(); else if (isOpen) load(); });
    var controller = {
      reload: load,
      update: function (next) { opts = Object.assign({}, opts, next); render(); },
      destroy: function () {
        if (disposed) return;
        disposed = true; requestId++; if (requestController) requestController.abort();
        clearTimeout(hoverTimer); stopTimer(); listeners.forEach(function (remove) { remove(); }); instances.delete(controller);
        delete el._lfavController; delete el._lfavMounted; el.classList.remove('lfav-root', 'lfav-named'); el.style.removeProperty('--lfav-right'); el.replaceChildren();
      },
    };
    el._lfavController = controller; instances.add(controller); render();
    return controller;
  }
  window.LFAvatar = {
    mount: mount, fetchOverview: fetchOverview,
    reloadAll: function () { return Promise.allSettled(Array.from(instances, function (instance) { return instance.reload(); })); },
    core: { formatCredits: formatCredits, percent: percent, calibratedNow: calibratedNow, countdown: countdown },
  };
})();
