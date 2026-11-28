{
/* Phone frame for the console (FD-176): bottom tabs, title bar, back stack, task bar and page actions.
   Pages reuse the desktop screens; only the frame, the shelf list, the work home and the "me" page are phone-specific. */
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const D = window.CONSOLE_DATA,
    L = window.L,
    TC = window.TC;
  const Core = window.MobileLayoutCore;
  const en = () => window.CLANG === 'en';

  /** True while the viewport is phone-sized; follows rotation and window resizes. */
  function useMobileLayout() {
    const [mobile, setMobile] = useState(() => Core.matches(window.matchMedia && window.matchMedia.bind(window)));
    useEffect(() => {
      if (!window.matchMedia) return undefined;
      const query = window.matchMedia(Core.QUERY);
      const change = event => setMobile(event.matches);
      if (query.addEventListener) query.addEventListener('change', change);else query.addListener(change);
      return () => {
        if (query.removeEventListener) query.removeEventListener('change', change);else query.removeListener(change);
      };
    }, []);
    return mobile;
  }
  const PAGE_TITLES = {
    volumes: () => en() ? 'Volumes' : '卷纲',
    directory: () => TC('tree_label'),
    cruise: () => en() ? 'Cruise' : '巡航',
    world: () => TC('world'),
    custom_settings: () => TC('custom_settings'),
    assistant: () => TC('assistant'),
    admin: () => TC('adm_title'),
    partnerships: () => TC('partnership'),
    settings: () => TC('set_title')
  };

  /** The work's name as the title bar shows it, in book-title marks. */
  function bookName() {
    const title = L(D.book && D.book.title);
    return title ? '《' + title + '》' : '';
  }
  function chapterTitle(state) {
    const chapter = (D.chapters || []).find(item => Number(item.no) === Number(state.chap));
    const number = en() ? 'Ch. ' + state.chap : '第 ' + state.chap + ' 章';
    const title = chapter && chapter.title && L(chapter.title);
    return title && title !== '—' ? number + '　' + title : number;
  }
  function MobileFrame(props) {
    const Kit = window.LFMobileKit;
    const {
      st,
      set,
      ctl,
      assistant
    } = props;
    const chrome = window.useMobileChromeState();
    const unread = window.useInboxUnread ? window.useInboxUnread() : 0;
    const [moreOpen, setMoreOpen] = useState(false);
    const tab = Core.tabOf(st),
      page = Core.pageOf(st),
      top = Core.isTopLevel(st);
    const state = useRef(st);
    state.current = st;
    const mobileNav = useRef(false);
    const unwinding = useRef(false);
    const lastKey = useRef(Core.navigationKey(st));

    // A navigation made elsewhere (assistant, inbox task) leaves the work home for the page it targets.
    useEffect(() => {
      const key = Core.navigationKey(st);
      if (key !== lastKey.current) {
        lastKey.current = key;
        if (!mobileNav.current && st.mPage === 'home' && tab === 'write') set({
          mPage: null
        });
      }
      // The volume-page origin only matters while its chapter is open.
      if (st.mVolFrom && page !== 'chapter') set({
        mVolFrom: null
      });
      // A volume viewed without chapters is a volume-page choice only.
      if (st.mVol != null && page !== 'volumes') set({
        mVol: null
      });
      mobileNav.current = false;
    });
    const go = (patch, push) => {
      mobileNav.current = true;
      const ok = set(patch);
      if (ok !== false && push) window.history.pushState({
        lfMobile: true
      }, '');
      return ok;
    };
    /** Go to the parent page; reports whether it moved and whether it landed on a tab root. */
    const back = () => {
      const target = Core.backTarget(state.current);
      if (!target) return {
        ok: true,
        top: true
      };
      mobileNav.current = true;
      const ok = set(target) !== false;
      return {
        ok,
        top: ok && Core.isTopLevel(Object.assign({}, state.current, target))
      };
    };
    // The system back gesture returns to the parent page; an unsaved draft keeps the page and its history entry.
    useEffect(() => {
      // Once back reaches a tab root, phone entries still on the stack are stale (nested pages, or a page
      // left with the title-bar button); unwind them so one system back is enough.
      const unwindStale = () => {
        if (window.history.state && window.history.state.lfMobile) {
          unwinding.current = true;
          window.history.back();
        }
      };
      const pop = () => {
        if (unwinding.current) {
          unwinding.current = false;
          unwindStale();
          return;
        }
        if (Core.isTopLevel(state.current)) {
          unwindStale();
          return;
        }
        const result = back();
        if (!result.ok) window.history.pushState({
          lfMobile: true
        }, '');else if (result.top) unwindStale();
      };
      window.addEventListener('popstate', pop);
      return () => window.removeEventListener('popstate', pop);
    }, []);
    const onBack = () => {
      if (window.history.state && window.history.state.lfMobile) window.history.back();else back();
    };
    const hasBook = !!(D.book && D.book.id);
    const nav = {
      openChapter: (segment, chapterNumber) => go(Core.chapterTarget(segment, chapterNumber), page === 'home'),
      openDirectory: from => go(Core.directoryTarget(from), true),
      // Picking from the directory replaces it, so back from the chapter leaves both.
      pickChapter: (chapter, segment) => go(Object.assign(Core.chapterTarget(segment, chapter.no), {
        mDirFrom: null,
        mVolFrom: null
      })),
      openBookPage: key => go(Core.bookPageTarget(key), true),
      openSettings: (section, extra) => go({
        view: 'book',
        section: 'settings',
        mPage: 'settings',
        settingsTarget: Object.assign({}, extra, {
          section,
          requestId: window.crypto.randomUUID()
        })
      }, true),
      openMine: section => go({
        view: 'book',
        section,
        mPage: section
      }, true)
    };
    const openTab = key => {
      if (key === 'assistant') {
        assistant.open();
        return;
      }
      if (key === 'write' && !hasBook) {
        go(Core.tabTarget('shelf', st, hasBook));
        return;
      }
      const target = Core.tabTarget(key, st, hasBook);
      if (target) go(target);
    };
    const openBook = async book => {
      await props.openBook(book);
      go({
        mPage: 'home'
      });
    };
    const seal = D.user && D.user.seal || '砚';
    const tabs = [{
      id: 'shelf',
      label: TC('shelf'),
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "shelf",
        s: 20
      })
    }, {
      id: 'write',
      label: en() ? 'Write' : '创作',
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "pen",
        s: 20
      })
    }, ...(assistant.enabled ? [{
      id: 'assistant',
      label: en() ? 'Assistant' : '助手',
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "sparkle",
        s: 20
      }),
      prominent: true
    }] : []), {
      id: 'inbox',
      label: en() ? 'Inbox' : '消息',
      icon: /*#__PURE__*/React.createElement(Icon, {
        n: "bell",
        s: 20
      }),
      badge: unread > 0 ? unread > 99 ? '99+' : unread : undefined
    }, {
      id: 'me',
      label: en() ? 'Me' : '我的',
      icon: /*#__PURE__*/React.createElement("span", {
        className: "m-tab-seal c-serif"
      }, seal)
    }];
    const assistantAction = assistant.enabled ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-icon-button",
      "aria-label": TC('assistant'),
      onClick: assistant.open
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "sparkle",
      s: 18
    })) : null;
    const more = chrome && chrome.current && chrome.current.more && chrome.current.more.length ? chrome.current.more : null;
    const moreAction = more ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-icon-button",
      "aria-label": en() ? 'More actions' : '更多操作',
      onClick: () => setMoreOpen(true)
    }, "\u22EF") : null;
    let header;
    if (top) {
      const title = tab === 'shelf' ? TC('shelf') : tab === 'write' ? bookName() : tab === 'inbox' ? en() ? 'Inbox' : '消息中心' : en() ? 'Me' : '我的';
      // An empty shelf offers creation in its own empty state; one entry is enough.
      const hasWorks = (D.shelf || []).some(book => !(book.status && book.status.zh === 'new'));
      const published = chrome && chrome.current && chrome.current.header && chrome.current.header.length ? chrome.current.header : null;
      const actions = tab === 'shelf' && hasWorks ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm gold m-new-book",
        onClick: () => ctl.onCreate()
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "plus",
        s: 14,
        w: 2.2
      }), TC('new_book')) : published ? published.map(item => /*#__PURE__*/React.createElement("button", {
        type: "button",
        key: item.key,
        className: "c-btn sm",
        disabled: item.disabled,
        onClick: () => chrome.run('header', item.key)
      }, item.label)) : null;
      header = /*#__PURE__*/React.createElement(Kit.TitleBar, {
        size: "large",
        title: title,
        actions: actions
      });
    } else if (page === 'chapter') {
      header = /*#__PURE__*/React.createElement(Kit.TitleBar, {
        title: chapterTitle(st),
        onBack: onBack,
        onTitleClick: () => nav.openDirectory('chapter'),
        titleControlLabel: (en() ? 'Chapters, current ' : '目录，当前') + chapterTitle(st),
        actions: /*#__PURE__*/React.createElement(React.Fragment, null, assistantAction, moreAction)
      });
    } else {
      const section = page === 'settings' && st.settingsTarget && st.settingsTarget.section;
      header = /*#__PURE__*/React.createElement(Kit.TitleBar, {
        title: section ? TC('set_' + section) : (PAGE_TITLES[page] || PAGE_TITLES.settings)(),
        subtitle: tab === 'write' ? bookName() : undefined,
        onBack: onBack,
        actions: /*#__PURE__*/React.createElement(React.Fragment, null, tab === 'write' ? assistantAction : null, moreAction)
      });
    }
    const primary = !top && chrome && chrome.current && chrome.current.primary && chrome.current.primary.length ? chrome.current.primary : null;
    const footer = top ? /*#__PURE__*/React.createElement(Kit.Sidebar, {
      appearance: "tabbar",
      "aria-label": en() ? 'Main navigation' : '主导航',
      items: tabs,
      activeId: tab,
      onActivate: openTab
    }) : primary ? /*#__PURE__*/React.createElement("div", {
      className: "m-actionbar"
    }, primary.map(item => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: item.key,
      className: 'c-btn' + (item.tone ? ' ' + item.tone : ''),
      disabled: item.disabled,
      onClick: () => chrome.run('primary', item.key)
    }, item.label))) : null;
    let content;
    if (tab === 'shelf') content = /*#__PURE__*/React.createElement(window.MobileShelf, {
      onOpen: openBook,
      ctl: ctl
    });else if (tab === 'write' && page === 'home') content = /*#__PURE__*/React.createElement(window.MobileBookHome, {
      state: st,
      nav: nav
    });else if (tab === 'me' && page === 'home') content = /*#__PURE__*/React.createElement(window.MobileMine, {
      ctl: ctl,
      nav: nav
    });else if (page === 'directory') content = /*#__PURE__*/React.createElement(window.MobileDirectory, {
      state: st,
      nav: nav
    });else content = /*#__PURE__*/React.createElement("div", {
      className: "m-page",
      "data-m-page": page
    }, page === 'chapter' ? /*#__PURE__*/React.createElement("div", {
      className: "m-segment",
      role: "group",
      "aria-label": en() ? 'Chapter view' : '章节视图'
    }, [['outline', en() ? 'Outline' : '细纲'], ['prose', en() ? 'Prose' : '正文']].map(([key, label]) => {
      const selected = key === 'prose' ? st.section === 'writing' : st.section !== 'writing';
      return /*#__PURE__*/React.createElement("button", {
        type: "button",
        key: key,
        "aria-pressed": selected,
        className: selected ? 'on' : '',
        onClick: () => !selected && go(Core.chapterTarget(key))
      }, label);
    })) : null, page === 'volumes' && window.MobileVolumeSwitch ? /*#__PURE__*/React.createElement(window.MobileVolumeSwitch, {
      state: st,
      onPick: choice => go(choice.first != null ? {
        chap: choice.first,
        mVol: null
      } : {
        mVol: choice.vnum
      })
    }) : null, props.renderBook());
    const scopeTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    return /*#__PURE__*/React.createElement(Kit.UiScope, {
      domain: "bishu",
      theme: scopeTheme,
      locale: en() ? 'en' : 'zh'
    }, /*#__PURE__*/React.createElement(Kit.MobileShell, {
      className: "lf-mobile",
      contentKey: [tab, page, page === 'chapter' ? st.chap : ''].join(':'),
      header: header,
      footer: footer,
      accessory: window.BgTaskCard ? /*#__PURE__*/React.createElement(window.BgTaskCard, {
        variant: "bar"
      }) : null
    }, content), /*#__PURE__*/React.createElement(Kit.Drawer, {
      open: moreOpen && !!more,
      placement: "bottom",
      title: page === 'chapter' ? chapterTitle(st) : en() ? 'More actions' : '更多操作',
      onClose: () => setMoreOpen(false)
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-action-list"
    }, (more || []).map(item => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: item.key,
      disabled: item.disabled,
      onClick: () => {
        setMoreOpen(false);
        chrome.run('more', item.key);
      }
    }, item.icon ? /*#__PURE__*/React.createElement(Icon, {
      n: item.icon,
      s: 18
    }) : null, item.label)))));
  }
  function MobileConsole(props) {
    return /*#__PURE__*/React.createElement(window.MobileChromeProvider, null, /*#__PURE__*/React.createElement(MobileFrame, props));
  }
  window.useMobileLayout = useMobileLayout;
  window.MobileConsole = MobileConsole;
})();
}
