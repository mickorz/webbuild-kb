/* ===== 笔枢公开站统一导航 =====
   所有营销页只保留 #nav 挂载点；结构、当前页、登录态与头像统一由这里管理。 */
(function () {
  var NAV_ITEMS = [
    { page: 'home', href: 'home.html', key: 'nav.home', zh: '首页', en: 'Home' },
    { page: 'world-state', href: 'world-state.html', key: 'nav.world', zh: '世界状态机', en: 'World Engine' },
    { page: 'roadmap', href: 'roadmap.html', key: 'nav.roadmap', zh: '开发计划', en: 'Roadmap' },
    { page: 'pricing', href: 'pricing.html', key: 'nav.pricing', zh: '定价', en: 'Pricing' },
    { page: 'tools', href: 'tools.html', key: 'nav.tools', zh: '免费工具', en: 'Free Tools', children: [
      { page: 'tools', href: 'tools.html', key: 'nav.tools.detect', zh: 'AI 率检测', en: 'AI Detection' },
      { page: 'ai-rewrite', href: 'ai-rewrite.html', key: 'nav.tools.rewrite', zh: '降 AI 改写', en: 'AI Rewrite', tag: '预览', site: 'cn' },
    ] },
    { page: 'community', href: 'community.html', key: 'nav.community', zh: '社群', en: 'Community' },
    { page: 'docs', href: 'docs.html', key: 'nav.docs', zh: '使用文档', en: 'Docs' },
  ];

  function language() {
    if (window.NBSite) return window.NBSite.publicLanguage();
    try {
      return (localStorage.getItem('lf_lang') || localStorage.getItem('lf_clang') || 'zh') === 'en' ? 'en' : 'zh';
    } catch (e) {
      return 'zh';
    }
  }

  function token() {
    try {
      var value = JSON.parse(localStorage.getItem('lf_tokens') || 'null');
      return value && (value.access_token || value.accessToken) || null;
    } catch (e) {
      return null;
    }
  }

  function apiBase() {
    try {
      return window.NBSite ? window.NBSite.apiBase() : localStorage.getItem('lf_api_base') || '';
    } catch (e) {
      return '';
    }
  }

  function currentPage() {
    var file = (location.pathname.split('/').pop() || 'home.html').replace(/\.html$/, '');
    if (file === 'index') return 'home';
    return file === 'credit-pricing' ? 'pricing' : file;
  }

  function siteCode() {
    return window.NBSite && window.NBSite.current ? window.NBSite.current.code : 'cn';
  }

  function link(item, lang, active) {
    return '<a href="' + item.href + '"' + (item.page === active ? ' class="active" aria-current="page"' : '')
      + ' data-i18n="' + item.key + '">' + item[lang] + '</a>';
  }

  // A group whose children are all unavailable on this site degrades to its own plain link.
  function group(item, lang, active) {
    var site = siteCode();
    var children = item.children.filter(function (child) { return !child.site || child.site === site; });
    if (children.length < 2) return link(item, lang, active);
    var current = children.some(function (child) { return child.page === active; });
    var id = 'nav-menu-' + item.page;
    return '<div class="nav-menu" data-nav-menu>'
      + '<button type="button" class="nav-menu-trigger' + (current ? ' active' : '') + '" aria-expanded="false" aria-controls="' + id + '">'
      + '<span data-i18n="' + item.key + '">' + item[lang] + '</span>'
      + '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5"/></svg></button>'
      + '<div class="nav-menu-panel" id="' + id + '">'
      + children.map(function (child) {
        return '<a href="' + child.href + '"' + (child.page === active ? ' aria-current="page"' : '') + '>'
          + '<span data-i18n="' + child.key + '">' + child[lang] + '</span>'
          + (child.tag ? '<span class="nav-menu-tag">' + child.tag + '</span>' : '') + '</a>';
      }).join('')
      + '</div></div>';
  }

  function render(root) {
    var lang = language();
    var active = currentPage();
    var brand = lang === 'en' ? '<a class="brand" href="home.html"><span class="cn">Novelbuilt</span></a>' : '<a class="brand" href="home.html"><span class="cn">笔枢写作</span><span class="en">Novelbuilt</span></a>';
    var links = NAV_ITEMS.map(function (item) {
      return item.children ? group(item, lang, active) : link(item, lang, active);
    }).join('');
    root.innerHTML =
      '<div class="nav-inner">'
      + brand
      + '<div class="nav-links" id="navlinks">' + links
      + '<a href="/login.html" class="btn btn-ghost" data-nav-login data-i18n="nav.login">' + (lang === 'en' ? 'Sign in' : '登录') + '</a>'
      + '<a href="/login.html" class="btn btn-primary" data-nav-console data-i18n="nav.console">' + (lang === 'en' ? 'Open Console' : '进入控制台') + '</a>'
      + '</div>'
      + '<div class="nav-tools"><span id="lf-nav-av" hidden></span>'
      + '<button class="icon-btn" id="langBtn" type="button" aria-label="' + (lang === 'en' ? 'Switch language' : '切换语言 / language') + '">EN</button>'
      + '<button class="icon-btn" id="themeBtn" type="button" aria-label="' + (lang === 'en' ? 'Switch theme' : '切换主题 / theme') + '"></button>'
      + '<button class="menu-btn" id="menubtn" type="button" aria-label="' + (lang === 'en' ? 'Menu' : '菜单') + '" aria-controls="navlinks" aria-expanded="false"><span></span><span></span><span></span></button>'
      + '</div></div>';
  }

  function ensureAvatarScript() {
    if (window.LFAvatar) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.getElementById('lf-avatar-js');
      if (script) {
        script.addEventListener('load', resolve, { once: true });
        script.addEventListener('error', reject, { once: true });
        return;
      }
      script = document.createElement('script');
      script.id = 'lf-avatar-js';
      script.src = '/console/lf-avatar.js?v=creative_capacity_20261015_sans';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function profile(accessToken) {
    return fetch(apiBase() + '/api/auth/me', {
      headers: { Authorization: 'Bearer ' + accessToken },
    }).then(function (response) {
      if (response.status === 401 || response.status === 403) return { invalid: true };
      if (!response.ok) return null;
      return response.json();
    }).catch(function () { return null; });
  }

  function setHidden(element, hidden) {
    if (!element) return;
    element.hidden = hidden;
    element.style.display = hidden ? 'none' : '';
  }

  function setSignedOut(root) {
    var login = root.querySelector('[data-nav-login]');
    var consoleLink = root.querySelector('[data-nav-console]');
    var slot = root.querySelector('#lf-nav-av');
    setHidden(login, false);
    if (consoleLink) {
      consoleLink.href = '/login.html';
      consoleLink.classList.remove('nav-cta-right');
    }
    setHidden(slot, true);
  }

  function setSignedIn(root, accessToken) {
    var login = root.querySelector('[data-nav-login]');
    var consoleLink = root.querySelector('[data-nav-console]');
    var slot = root.querySelector('#lf-nav-av');
    setHidden(login, true);
    if (consoleLink) {
      consoleLink.href = '/console/console.html';
      consoleLink.classList.add('nav-cta-right');
    }
    if (!slot) return;
    setHidden(slot, false);
    Promise.all([ensureAvatarScript(), profile(accessToken)]).then(function (values) {
      if (!root.contains(slot)) return;
      var me = values[1];
      if (me && me.invalid) {
        setSignedOut(root);
        return;
      }
      var name = me && (me.display_name || (me.email ? String(me.email).split('@')[0] : ''));
      window.LFAvatar.mount(slot, {
        seal: name ? name.charAt(0) : (language() === 'en' ? 'N' : '砚'), penName: name || '',
        accountHref: '/console/console.html#settings',
      });
    }).catch(function () {
      if (!root.contains(slot)) return;
      if (window.LFAvatar) {
        window.LFAvatar.mount(slot, { accountHref: '/console/console.html#settings' });
      }
    });
  }

  function observeLayout(root) {
    var inner = root.querySelector('.nav-inner');
    var brand = root.querySelector('.brand');
    var links = root.querySelector('.nav-links');
    var tools = root.querySelector('.nav-tools');
    var menu = root.querySelector('.menu-btn');
    var frame = 0;
    var disposed = false;

    function setOpen(open) {
      if (links.classList.contains('open') !== open) links.classList.toggle('open', open);
      menu.setAttribute('aria-expanded', String(open));
    }

    function visibleChildren(element) {
      return Array.from(element.children).filter(function (child) {
        return child !== menu && getComputedStyle(child).display !== 'none';
      });
    }

    // A dropdown occupies its trigger's width in the row; the stacked menu may widen
    // the group to its panel, which must not feed back into the collapse decision.
    function rowWidth(children, gap) {
      return children.reduce(function (total, child) {
        var target = child.hasAttribute('data-nav-menu') ? child.querySelector('.nav-menu-trigger') : child;
        return total + target.getBoundingClientRect().width;
      }, 0) + Math.max(0, children.length - 1) * gap;
    }

    var groups = Array.from(root.querySelectorAll('[data-nav-menu]')).map(function (element) {
      return { element: element, trigger: element.querySelector('.nav-menu-trigger'), hovered: false };
    });

    function setGroup(entry, open) {
      if (!open) entry.hovered = false;
      if (entry.element.classList.contains('open') !== open) entry.element.classList.toggle('open', open);
      entry.trigger.setAttribute('aria-expanded', String(open));
    }

    function closeGroups(except) {
      groups.forEach(function (entry) { if (entry !== except) setGroup(entry, false); });
    }

    function bindGroup(entry) {
      function hoverable(event) {
        return event.pointerType === 'mouse' && !root.classList.contains('is-collapsed');
      }
      entry.element.addEventListener('pointerenter', function (event) {
        if (!hoverable(event) || entry.element.classList.contains('open')) return;
        closeGroups(entry);
        setGroup(entry, true);
        entry.hovered = true;
      });
      entry.element.addEventListener('pointerleave', function (event) {
        if (hoverable(event)) setGroup(entry, false);
      });
      // The first click after a hover preview keeps the panel open instead of closing it.
      entry.trigger.addEventListener('click', function () {
        if (entry.hovered) { entry.hovered = false; return; }
        var open = !entry.element.classList.contains('open');
        closeGroups(entry);
        setGroup(entry, open);
      });
      entry.element.addEventListener('focusout', function (event) {
        if (!entry.element.contains(event.relatedTarget)) setGroup(entry, false);
      });
    }
    groups.forEach(bindGroup);

    function closeOnOutsideClick(event) {
      groups.forEach(function (entry) {
        if (!entry.element.contains(event.target)) setGroup(entry, false);
      });
    }

    function measure() {
      frame = 0;
      if (disposed) return;
      var containerStyle = getComputedStyle(inner);
      var componentStyle = getComputedStyle(root);
      var items = visibleChildren(links);
      var linkGap = parseFloat(componentStyle.getPropertyValue('--nav-link-gap')) || 0;
      var actionGap = parseFloat(componentStyle.getPropertyValue('--nav-action-gap')) || 0;
      // Items retain their natural widths in the stacked menu. Read the desktop gaps
      // from CSS, never the mobile row's gap or the flex row's stretched width.
      var linksWidth = rowWidth(items, linkGap);
      if (items.some(function (item) { return item.hasAttribute('data-nav-login'); })
          && items.some(function (item) { return item.hasAttribute('data-nav-console'); })) {
        linksWidth += actionGap - linkGap;
      }
      var toolsWidth = rowWidth(visibleChildren(tools), parseFloat(getComputedStyle(tools).columnGap) || 0);
      var available = inner.getBoundingClientRect().width
        - parseFloat(containerStyle.paddingLeft) - parseFloat(containerStyle.paddingRight);
      if (available <= 0) return;
      var required = brand.getBoundingClientRect().width + linksWidth + toolsWidth
        + 2 * (parseFloat(containerStyle.columnGap) || 0);
      var collapsed = required > available + 0.5;
      if (root.classList.contains('is-collapsed') !== collapsed) {
        var focused = document.activeElement;
        root.classList.toggle('is-collapsed', collapsed);
        setOpen(false);
        closeGroups();
        if (collapsed && links.contains(focused)) menu.focus();
        else if (!collapsed && focused === menu) brand.focus();
      }
    }

    function schedule() {
      if (!disposed && !frame) frame = requestAnimationFrame(measure);
    }

    function toggleMenu() {
      setOpen(root.classList.contains('is-collapsed') && !links.classList.contains('open'));
    }

    function closeOnLink(event) {
      if (event.target.closest('a')) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key !== 'Escape') return;
      var openGroup = groups.filter(function (entry) { return entry.element.classList.contains('open'); })[0];
      if (openGroup) {
        event.preventDefault();
        setGroup(openGroup, false);
        openGroup.trigger.focus();
        return;
      }
      if (links.classList.contains('open')) {
        event.preventDefault();
        setOpen(false);
        menu.focus();
      }
    }

    var resize = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    if (resize) {
      [inner, brand].concat(Array.from(links.children), Array.from(tools.children)).forEach(function (element) {
        if (element !== menu) resize.observe(element);
      });
    }
    var mutation = new MutationObserver(schedule);
    [links, tools].forEach(function (element) {
      mutation.observe(element, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['hidden', 'style', 'class'],
      });
    });
    window.addEventListener('resize', schedule, { passive: true });
    menu.addEventListener('click', toggleMenu);
    links.addEventListener('click', closeOnLink);
    root.addEventListener('keydown', closeOnEscape);
    document.addEventListener('click', closeOnOutsideClick);
    if (document.fonts) {
      document.fonts.ready.then(schedule);
      document.fonts.addEventListener('loadingdone', schedule);
    }
    measure();

    return function () {
      disposed = true;
      cancelAnimationFrame(frame);
      if (resize) resize.disconnect();
      mutation.disconnect();
      window.removeEventListener('resize', schedule);
      menu.removeEventListener('click', toggleMenu);
      links.removeEventListener('click', closeOnLink);
      root.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('click', closeOnOutsideClick);
      if (document.fonts) document.fonts.removeEventListener('loadingdone', schedule);
    };
  }

  var stopLayout;
  function mount() {
    var root = document.getElementById('nav');
    if (!root) return;
    if (stopLayout) stopLayout();
    var avatar = root.querySelector('#lf-nav-av');
    if (avatar && avatar._lfavController) avatar._lfavController.destroy();
    render(root);
    var accessToken = token();
    if (accessToken) setSignedIn(root, accessToken); else setSignedOut(root);
    stopLayout = observeLayout(root);
  }

  window.LFSiteNav = { mount: mount };
  mount();
})();
