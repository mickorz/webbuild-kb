/* 笔枢 · 统一页面切换动效
   纸面渐隐（cross-dissolve）：离场时内容淡入「纸色」幕布，入场时从纸色淡出为内容。
   主题感知（读 lf_theme，避免暗色闪白）、无 JS 时不隐藏内容、bfcache 安全。
   暴露 window.LFNav(url) 供程序化跳转复用。*/
(function () {
  if (window.__LF_TX) return;
  window.__LF_TX = true;

  var html = document.documentElement;

  // 1) 尽早确定主题，避免幕布闪色
  try {
    if (!html.getAttribute('data-theme')) {
      html.setAttribute('data-theme', localStorage.getItem('lf_theme') || 'light');
    }
  } catch (e) {}

  // 2) 注入样式（在 <head> 同步执行，故首帧即生效）
  var EXIT = 360, ENTER = 520;
  var EASE = 'cubic-bezier(.22,.7,.2,1)';
  var st = document.createElement('style');
  st.id = 'lf-tx-style';
  st.textContent =
    'html.lf-tx{background:var(--paper,#FEFCF8)}' +
    'html.lf-tx body{transition:opacity ' + ENTER + 'ms ' + EASE + '}' +
    'html.lf-tx.lf-hide body{opacity:0}' +
    'html.lf-noanim body{transition:none!important}' +
    '#lf-veil{position:fixed;inset:0;z-index:2147483600;background:var(--paper,#FEFCF8);' +
    'opacity:0;pointer-events:none;will-change:opacity;' +
    'transition:opacity ' + EXIT + 'ms ' + EASE + '}' +
    '#lf-veil.show{opacity:1;pointer-events:auto}' +
    // 程序化加载遮罩：立即全不透明覆盖（不淡入），避免内容透出与加载标记叠看。
    '#lf-veil.lf-cover{opacity:1;pointer-events:auto;transition:none}' +
    // 加载标记：离场（lf-leaving）与慢速入场（lf-hide）时显示
    '#lf-load{position:fixed;inset:0;z-index:2147483601;display:grid;place-items:center;' +
    'opacity:0;pointer-events:none;transition:opacity .45s ' + EASE + '}' +
    'html.lf-leaving #lf-load{opacity:1;transition-delay:0s}' +
    'html.lf-tx.lf-hide #lf-load{opacity:1;transition-delay:.28s}' +
    'html.lf-noanim #lf-load{transition:none!important}' +
    '.lf-seal{position:relative;width:72px;height:72px}' +
    '.lf-ring{position:absolute;inset:0;border-radius:50%;' +
    'background:conic-gradient(from 90deg,transparent 0 18%,var(--gold-deep,#A77B2E) 94%,transparent);' +
    '-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 3px));' +
    'mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 3px));' +
    'animation:lf-spin .9s linear infinite}' +
    '.lf-char{position:absolute;inset:0;display:grid;place-items:center;' +
    "font-family:var(--serif,'Noto Serif SC',serif);font-weight:600;font-size:30px;" +
    'color:var(--ink,#221D16);animation:lf-breathe 1.6s ease-in-out infinite}' +
    '.lf-cap{margin-top:20px;font-family:var(--latin,Georgia,serif);font-style:italic;' +
    'letter-spacing:.34em;text-indent:.34em;text-transform:uppercase;font-size:11px;' +
    'color:var(--ink-3,#938979)}' +
    '@keyframes lf-spin{to{transform:rotate(360deg)}}' +
    '@keyframes lf-breathe{0%,100%{opacity:.4}50%{opacity:1}}' +
    '@media (prefers-reduced-motion: reduce){' +
    'html.lf-tx body{transition:none!important}' +
    '#lf-veil{transition:none!important}' +
    '.lf-ring,.lf-char{animation:none!important}}';
  (document.head || html).appendChild(st);
  // lf-hide：入场前隐藏内容；reveal 时移除（移除式比覆盖式更稳，避免层叠怪异）
  html.classList.add('lf-tx', 'lf-hide');

  // 构建过渡层（幕布 + 加载标记）—— 尽早创建，让入场慢加载时也能显示
  var veil = null;
  function buildLayer() {
    var body = document.body;
    if (!body || veil) return veil;
    veil = document.createElement('div');
    veil.id = 'lf-veil';
    veil.setAttribute('aria-hidden', 'true');
    var load = document.createElement('div');
    load.id = 'lf-load';
    load.setAttribute('aria-hidden', 'true');
    load.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center">' +
      '<div class="lf-seal"><span class="lf-ring"></span><span class="lf-char">' + (window.NBSite && window.NBSite.current.code === 'global' ? 'N' : '笔') + '</span></div>' +
      '<div class="lf-cap">Novelbuilt</div></div>';
    body.appendChild(veil);
    body.appendChild(load);
    return veil;
  }
  function ensureVeil() { return buildLayer() || veil; }
  if (document.body) buildLayer();
  else document.addEventListener('DOMContentLoaded', buildLayer);

  // 3) 入场：内容从纸色淡入
  var revealed = false;
  function reveal(noAnim) {
    if (revealed) return;
    revealed = true;
    ensureVeil();
    // 隐藏标签页里 CSS 过渡不推进 → 会卡在 opacity:0；故隐藏/兜底时改为"无动画瞬显"。
    if (noAnim || document.hidden) html.classList.add('lf-noanim');
    html.classList.remove('lf-hide');
  }
  if (document.readyState === 'complete') reveal();
  else window.addEventListener('load', function () { reveal(); });
  setTimeout(function () { reveal(true); }, 1700); // 安全兜底，确保内容一定显示
  // 标签页从后台切回时，若仍未显示则无动画补显
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) reveal(true);
  });

  // 4) 离场：幕布升起后跳转
  var leaving = false;
  function leave(url) {
    if (leaving) return;
    leaving = true;
    html.classList.add('lf-leaving');
    var v = ensureVeil();
    // 幕布自 reveal 起即以 opacity:0 绘制过，直接加类即可触发淡入过渡
    v.classList.add('show');
    var done = false;
    function go() { if (done) return; done = true; window.location.href = url; }
    setTimeout(go, EXIT + 20);
  }
  // 暴露给程序化跳转
  window.LFNav = function (url) { leave(url); };

  // 程序化加载遮罩（不跳转）：复用同一纸色幕布 + 笔印加载标记，供 SPA 内
  // 「点击后需等数据到位才放行」的场景使用（如控制台书架开书）。
  window.LFOverlay = {
    show: function () {
      var v = ensureVeil();
      html.classList.add('lf-leaving');
      // lf-cover：立即全不透明覆盖（show 负责加载标记的显隐联动）。
      v.classList.add('show', 'lf-cover');
    },
    hide: function () {
      html.classList.remove('lf-leaving');
      // 先撤 lf-cover 恢复过渡，再撤 show → 内容随幕布柔和淡出显现。
      if (veil) { veil.classList.remove('lf-cover'); veil.classList.remove('show'); }
    },
  };

  // 5) 拦截站内 <a> 跳转
  function sameDoc(href) {
    // 仅本页锚点 → 不拦截
    return href.indexOf('#') === 0;
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (a.target && a.target !== '' && a.target !== '_self') return;        // 新窗口
    if (a.hasAttribute('download')) return;
    var raw = a.getAttribute('href') || '';
    if (!raw || sameDoc(raw)) return;                                        // 同页锚点
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;                             // 站外
    if (/^(mailto:|tel:|javascript:)/i.test(raw)) return;
    // 已安装局部路由的区域自行处理同路径导航；其它页面仍使用全站过渡。
    if (url.pathname === location.pathname && a.closest('[data-local-navigation]')) return;
    // 同页面 + 仅 hash 变化 → 不拦截（平滑滚动）
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    if (url.href === location.href) return;                                 // 指向当前页 → 不重载
    e.preventDefault();
    leave(a.href);
  }, true);

  // 6) bfcache：从历史返回时复位幕布与内容
  window.addEventListener('pageshow', function (ev) {
    if (ev.persisted) {
      leaving = false;
      html.classList.remove('lf-leaving');
      if (veil) veil.classList.remove('show');
      html.classList.add('lf-noanim');
      html.classList.remove('lf-hide');
    }
  });
})();
