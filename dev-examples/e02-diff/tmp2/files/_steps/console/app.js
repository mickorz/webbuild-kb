{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* ===== 笔枢创作控制台 · 可运行交互应用 ===== */
const D = window.CONSOLE_DATA,
  L = window.L,
  TC = window.TC;
// Phone frame (FD-176) and shared inbox hooks load before this script; isolated test harnesses may omit them.
const lfUseInboxUnread = window.useInboxUnread || (() => 0);
const lfUseMobileLayout = window.useMobileLayout || (() => false);
const {
  useState,
  useEffect,
  useRef,
  useCallback
} = React;

/* 运行态全局镜像：供右下角 BgTaskCard 在运行框被关闭后接管显示（标题 + 进度条）。
   由各运行入口（细纲/成文/重生/润色）写入，不依赖运行框是否挂载。 */
function lfRunLabel(kind) {
  var en = window.CLANG === 'en';
  return {
    outline: en ? 'Generating outline' : '生成细纲中',
    prose: en ? 'Drafting chapter' : '生成正文中',
    regen: en ? 'Redrafting chapter' : '重写本章中',
    polish: en ? 'Polishing' : '润色中',
    cruise: en ? 'Cruising' : '巡航编排中'
  }[kind] || (en ? 'Working…' : '处理中…');
}
function lfRunStart(kind, meta) {
  window.LF_RUN_ACTIVE = Object.assign({
    kind: kind,
    label: lfRunLabel(kind),
    status: 'running'
  }, meta || {});
  window.LF_RUN_PROGRESS = 0;
}
function lfRunProg(p) {
  if (typeof p === 'number') window.LF_RUN_PROGRESS = Math.max(0, Math.min(1, p));
}
function lfRunUpdate(patch) {
  if (!window.LF_RUN_ACTIVE) return;
  window.LF_RUN_ACTIVE = Object.assign({}, window.LF_RUN_ACTIVE, patch || {});
  if (window.LF_RERENDER) window.LF_RERENDER();
}
function lfRunEnd() {
  window.LF_RUN_ACTIVE = null;
  window.LF_RUN_PROGRESS = null;
  if (window.LF_RERENDER) window.LF_RERENDER();
}
function useToast() {
  const [msg, setMsg] = useState(null);
  const t = useRef();
  const show = useCallback(m => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 2200);
  }, []);
  return [msg, show];
}
function engineGenerationBlocked() {
  return !!(window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED());
}
function chapterHasGuide(chapter) {
  return !!(chapter && (chapter.guide_ready === true || chapter.guide_ready == null && chapter.state === 'done'));
}

// A guide reaches React only after the bridge's guarded authoritative read.
// Preserve draft/save state and reject a response older than the visible editor.
function adoptOutlineSnapshot(state, bookId, chapterNumber) {
  const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
  const captured = guard && (guard.captureRefresh || guard.captureNavigation).call(guard);
  if (guard && (!captured || !captured())) return {};
  if (state.detSaving || Object.keys(state.dirty || {}).length) return {};
  if (String(D.book && D.book.id || '') !== String(bookId || '') || Number(state.chap) !== Number(chapterNumber)) return {};
  const detail = window.LF_PORTAL.chapterDetailSnapshot(bookId, chapterNumber);
  if (detail._syncStatus !== 'ready') return {};
  const previous = state.detail;
  if (previous && String(previous._bookId) === String(bookId) && Number(previous.no) === Number(chapterNumber) && Number(previous._resourceVersion) > Number(detail._resourceVersion || 0)) return {};
  if (previous && JSON.stringify(previous) === JSON.stringify(detail) && state.generated && state.generated.has(Number(chapterNumber))) return {};
  return {
    detail,
    generated: new Set([...(state.generated || []), Number(chapterNumber)]),
    treeVersion: (state.treeVersion || 0) + 1
  };
}
function newOutlineSubmitKey() {
  var id = window.crypto && typeof window.crypto.randomUUID === 'function' ? window.crypto.randomUUID() : Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
  return 'outline-submit:' + id;
}
function RuntimeAdmissionBanner() {
  if (!engineGenerationBlocked()) return null;
  const en = window.CLANG === 'en';
  const unavailable = window.LF_ENGINE_ADMISSION && window.LF_ENGINE_ADMISSION.source === 'engine_unavailable';
  return /*#__PURE__*/React.createElement("div", {
    className: "runtime-admission-banner",
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "clock",
    s: 14
  }), /*#__PURE__*/React.createElement("span", null, en ? unavailable ? 'Engine temporarily unavailable. New generation tasks are paused; editing, history, and cancellation remain available.' : 'Engine update in progress. New generation tasks are paused; active tasks, editing, history, and cancellation remain available.' : unavailable ? '引擎暂不可用，新的生成任务已暂停；编辑、历史与取消仍可使用。' : '引擎更新中，暂不能开始新的生成任务；进行中的任务、编辑、历史与取消仍可使用。'));
}
function TopCtl({
  lang,
  setLang,
  theme,
  setTheme,
  onSettings,
  onRedeem
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0
    }
  }, onSettings && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AvatarSlot, {
    onAccount: onSettings,
    onRedeem: onRedeem,
    lang: lang,
    namedTrigger: true
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      height: 20,
      borderLeft: '1px solid var(--line)',
      margin: '0 4px'
    }
  })), /*#__PURE__*/React.createElement(LangSeg, {
    lang: lang,
    setLang: setLang
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-ic",
    style: {
      width: 32,
      height: 32
    },
    "aria-label": lang === 'en' ? theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme' : theme === 'dark' ? '切换到浅色主题' : '切换到深色主题',
    onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark')
  }, theme === 'dark' ? /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"
  }))));
}

/* ---------- avatar slot: mounts the shared vanilla LFAvatar (same component
   used by the marketing site) so subscription and credits look identical
   everywhere. onAccount drives in-app nav to 个人中心. ---------- */
function AvatarSlot({
  onAccount,
  onRedeem,
  seal,
  lang,
  namedTrigger = false
}) {
  const ref = useRef(),
    mounted = useRef(null),
    callbacks = useRef({
      onAccount,
      onRedeem
    });
  callbacks.current = {
    onAccount,
    onRedeem
  };
  const accountId = String(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id || D.user && D.user.id || '');
  const mark = seal || D.user && D.user.seal || '砚';
  const penName = D.user && D.user.penName;
  useEffect(() => {
    if (ref.current && window.LFAvatar) {
      mounted.current = window.LFAvatar.mount(ref.current, {
        seal: mark,
        penName,
        namedTrigger,
        onAccount: () => callbacks.current.onAccount && callbacks.current.onAccount(),
        onRedeem: onRedeem ? () => callbacks.current.onRedeem && callbacks.current.onRedeem() : null
      });
    }
    return () => {
      if (mounted.current) mounted.current.destroy();
      mounted.current = null;
    };
  }, [accountId]);
  useEffect(() => {
    if (mounted.current) mounted.current.update({
      seal: mark,
      penName,
      namedTrigger
    });
  }, [mark, penName, lang, namedTrigger]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref
  });
}
window.AvatarSlot = AvatarSlot;

/* ---------- shelf ---------- */
function ShelfView({
  onOpen,
  ctl
}) {
  const books = D.shelf;
  const [search, setSearch] = useState('');
  const normalizeTitle = value => String(value || '').normalize('NFKC').toLowerCase();
  const query = normalizeTitle(search.trim());
  const visibleBooks = query ? books.filter(b => b.status.zh !== 'new' && (typeof b.title === 'object' ? Object.values(b.title || {}) : [b.title]).some(title => normalizeTitle(title).includes(query))) : books;
  const en = window.CLANG === 'en';
  const [editBook, setEditBook] = useState(null);
  const [exportBook, setExportBook] = useState(null);
  const tintBg = t => t === 'gold' ? 'linear-gradient(150deg,oklch(0.72 0.13 72),oklch(0.58 0.14 45))' : t === 'slate' ? 'linear-gradient(150deg,oklch(0.6 0.05 250),oklch(0.42 0.05 255))' : t === 'terra' ? 'linear-gradient(150deg,oklch(0.62 0.15 38),oklch(0.5 0.13 28))' : '';
  return /*#__PURE__*/React.createElement("div", {
    className: "cscreen col",
    style: {
      height: '100vh'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-topbar"
  }, /*#__PURE__*/React.createElement("a", {
    className: "shelf-brand",
    href: "../site/home.html",
    title: TC('to_home') || '首页'
  }, /*#__PURE__*/React.createElement("span", {
    className: "logo"
  }, "\u7B14\u67A2"), /*#__PURE__*/React.createElement("span", {
    className: "shelf-brand-en"
  }, "NOVELBUILT")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("label", {
    className: "c-search shelf-search",
    style: {
      margin: 0,
      width: 200
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "search",
    s: 15
  }), /*#__PURE__*/React.createElement("input", {
    type: "search",
    value: search,
    placeholder: TC('search_book'),
    "aria-label": en ? 'Search works by title' : '按书名搜索作品',
    onInput: event => setSearch(event.currentTarget.value),
    onKeyDown: event => {
      if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
        event.preventDefault();
        setSearch('');
      }
    }
  })), /*#__PURE__*/React.createElement(TopCtl, ctl)), /*#__PURE__*/React.createElement("div", {
    className: "shelf-body",
    style: {
      flex: 1,
      overflow: 'auto',
      padding: '40px 56px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "shelf-head",
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 32,
      gap: 20,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--gold-deep)',
      fontFamily: 'var(--latin)',
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      marginBottom: 10
    }
  }, TC('my_shelf')), /*#__PURE__*/React.createElement("h1", {
    className: "c-serif",
    style: {
      fontSize: 36,
      fontWeight: 600,
      margin: 0,
      letterSpacing: '-.01em'
    }
  }, TC('greeting')), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--ink-2)',
      fontSize: 15,
      margin: '10px 0 0'
    }
  }, TC('shelf_sub'))), /*#__PURE__*/React.createElement("button", {
    className: "c-btn primary",
    style: {
      padding: '12px 20px',
      fontSize: 14
    },
    onClick: () => ctl.onCreate()
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "plus",
    s: 16,
    w: 2
  }), TC('new_book'))), query && visibleBooks.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "shelf-search-empty",
    role: "status"
  }, en ? 'No matching works' : '没有匹配的作品'), /*#__PURE__*/React.createElement("div", {
    className: "shelf-grid"
  }, visibleBooks.map((b, i) => b.status.zh === 'new' ? /*#__PURE__*/React.createElement("div", {
    key: "new-book",
    className: "book-card-new",
    onClick: () => ctl.onCreate()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 52,
      height: 52,
      borderRadius: '50%',
      border: '1.5px solid var(--line)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "plus",
    s: 22,
    w: 2
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500
    }
  }, TC('new_book_t')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      maxWidth: 170,
      textAlign: 'center'
    }
  }, TC('new_book_d'))) : /*#__PURE__*/React.createElement("div", {
    key: b.id || i,
    className: "book-card",
    onClick: () => onOpen(b)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bc-cover",
    style: {
      background: tintBg(b.tint)
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-serif",
    style: {
      writingMode: en ? 'horizontal-tb' : 'vertical-rl',
      color: 'rgba(255,255,255,.96)',
      fontSize: en ? 22 : 30,
      fontWeight: 600,
      letterSpacing: '.08em',
      textShadow: '0 2px 12px rgba(0,0,0,.3)',
      lineHeight: 1.15
    }
  }, L(b.title)), b.cur && /*#__PURE__*/React.createElement("span", {
    className: "c-badge bc-status"
  }, "\u25CF ", TC('writing_now')), /*#__PURE__*/React.createElement("div", {
    className: "bc-actions",
    onClick: event => event.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    className: "bc-action",
    onClick: () => setExportBook(b)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "download",
    s: 14
  }), en ? 'Export' : '导出'), /*#__PURE__*/React.createElement("button", {
    className: "bc-action",
    onClick: () => setEditBook(b)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "pen",
    s: 14
  }), TC('edit_book'))), /*#__PURE__*/React.createElement("span", {
    className: "bc-open"
  }, TC('open_book'), " \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 18px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: 'c-badge ' + b.tint
  }, Array.isArray(b.genre_parts) && b.genre_parts.length ? L(b.genre_parts[0].value) : L(b.genre))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: 'var(--ink-2)',
      margin: '0 0 10px',
      lineHeight: 1.6,
      flex: 1,
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden'
    }
  }, L(b.blurb)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      fontSize: 12,
      color: 'var(--ink-3)',
      borderTop: '1px solid var(--line-2)',
      paddingTop: 11,
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-latin",
    style: {
      color: 'var(--ink)'
    }
  }, b.chap, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-3)',
      fontFamily: 'var(--sans)'
    }
  }, " ", TC('chap') === 'ch.' ? 'ch' : '章')), /*#__PURE__*/React.createElement("span", {
    className: "c-latin",
    style: {
      color: 'var(--ink)'
    }
  }, L(b.words), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-3)',
      fontFamily: 'var(--sans)'
    }
  }, " ", TC('words_unit'))), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, b.latest_chapter_title || L(b.vol)))))))), editBook && /*#__PURE__*/React.createElement(BookEditModal, {
    book: editBook,
    onClose: () => setEditBook(null),
    onSaved: () => {
      if (window.LF_PORTAL) window.LF_PORTAL.load();
    },
    toast: ctl.toast
  }), exportBook && /*#__PURE__*/React.createElement(BookExportModal, {
    book: exportBook,
    defaultScope: "all",
    onClose: () => setExportBook(null),
    toast: ctl.toast
  }));
}

/* ---------- BookEditModal ---------- */
function BookEditModal({
  book,
  onClose,
  onSaved,
  toast
}) {
  const LENGTHS = ['短', '中', '长'];
  const WORDS = ['2000-2500', '3000-4000', '4000-5000', '5000-6000'];
  const [title, setTitle] = useState(L(book.title) || '');
  const [genre, setGenre] = useState(book.genre_raw || '');
  const [estLen, setEstLen] = useState(book.estimated_length || '');
  const [words, setWords] = useState(book.words_per_chapter || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const handleSave = async () => {
    var patch = {};
    if (title !== L(book.title)) patch.title = title;
    if (genre !== (book.genre_raw || '')) patch.genre = genre;
    if (estLen !== (book.estimated_length || '')) patch.estimated_length = estLen;
    if (words !== (book.words_per_chapter || '')) patch.words_per_chapter = words;
    setSaving(true);
    try {
      if (Object.keys(patch).length) {
        await window.LF_API.updateBook(book.id, patch);
      }
      if (onSaved) onSaved();
      toast(TC('saved'));
      onClose();
    } catch (e) {
      if (window.LF_ERROR) {
        var err = {
          status: 500,
          body: {
            detail: e && e.message || 'Update failed'
          }
        };
        if (e && typeof e.status !== 'undefined') err.status = e.status;
        if (e && e.body) err.body = e.body;
        window.LF_ERROR(err);
      }
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    setSaving(true);
    try {
      await window.LF_API.archiveBook(book.id);
      if (onSaved) onSaved();
      toast(TC('deleted'));
      onClose();
      window.location.reload();
    } catch (e) {
      if (window.LF_ERROR) {
        var err = {
          status: 500,
          body: {
            detail: e && e.message || 'Delete failed'
          }
        };
        if (e && typeof e.status !== 'undefined') err.status = e.status;
        if (e && e.body) err.body = e.body;
        window.LF_ERROR(err);
      }
    } finally {
      setSaving(false);
    }
  };
  return React.createElement('div', {
    className: 'rg-scrim',
    onClick: onClose
  }, React.createElement('div', {
    className: 'be-modal',
    onClick: e => e.stopPropagation()
  }, React.createElement('div', {
    className: 'rg-flab'
  }, React.createElement('div', {
    className: 'c-serif',
    style: {
      fontSize: 22,
      fontWeight: 600
    }
  }, TC('edit_book_title'))), React.createElement('div', {
    className: 'be-body'
  }, React.createElement('div', {
    className: 'be-field'
  }, React.createElement('label', {
    className: 'be-lab'
  }, TC('f_title')), React.createElement('input', {
    className: 'be-inp',
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: TC('f_title')
  })), React.createElement('div', {
    className: 'be-field'
  }, React.createElement('label', {
    className: 'be-lab'
  }, TC('f_genre')), React.createElement('input', {
    className: 'be-inp',
    value: genre,
    onChange: e => setGenre(e.target.value),
    placeholder: TC('f_genre')
  })), React.createElement('div', {
    className: 'be-field'
  }, React.createElement('label', {
    className: 'be-lab'
  }, TC('f_length')), React.createElement('span', {
    className: 'be-chips'
  }, LENGTHS.map(function (l) {
    return React.createElement('button', {
      key: l,
      className: 'be-chip' + (estLen === l ? ' on' : ''),
      onClick: function () {
        setEstLen(estLen === l ? '' : l);
      }
    }, l);
  }))), React.createElement('div', {
    className: 'be-field'
  }, React.createElement('label', {
    className: 'be-lab'
  }, TC('f_words')), React.createElement('span', {
    className: 'be-chips'
  }, WORDS.map(function (w) {
    return React.createElement('button', {
      key: w,
      className: 'be-chip' + (words === w ? ' on' : ''),
      onClick: function () {
        setWords(words === w ? '' : w);
      }
    }, w);
  }))), window.BookDataUsagePanel ? React.createElement(window.BookDataUsagePanel, {
    bookId: book.id,
    open: true
  }) : null), React.createElement('div', {
    className: 'be-acts'
  }, confirmDelete ? React.createElement(React.Fragment, null, React.createElement('p', {
    className: 'be-confirm'
  }, TC('delete_confirm')), React.createElement('button', {
    className: 'c-btn danger',
    onClick: handleDelete,
    disabled: saving
  }, TC('delete_ok')), React.createElement('button', {
    className: 'c-btn ghost',
    onClick: function () {
      setConfirmDelete(false);
    },
    disabled: saving
  }, TC('cancel'))) : React.createElement(React.Fragment, null, React.createElement('button', {
    className: 'c-btn danger-outline',
    onClick: function () {
      setConfirmDelete(true);
    }
  }, TC('delete_book')), React.createElement('div', {
    style: {
      flex: 1
    }
  }), React.createElement('button', {
    className: 'c-btn ghost',
    onClick: onClose
  }, TC('cancel')), React.createElement('button', {
    className: 'c-btn primary',
    onClick: handleSave,
    disabled: saving
  }, TC('save'))))));
}

/* ---------- rail + tree ---------- */
function AppRail({
  section,
  go,
  onShelf,
  unread
}) {
  const items = [['workbench', 'book', 'book'], ['writing', 'pen', 'pen'], ['world', 'world', 'world'], ['custom_settings', 'layers', 'custom_settings'], ['assistant', 'sparkle', 'assistant'], ['settings', 'settings', 'settings']];
  const isAdmin = !!(D.user && D.user.isAdmin);
  const isPartner = !!(D.user && D.user.isPartner);
  const authed = !window.LF_AUTH_EXPIRED && D.user && D.user.email;
  const avSeal = authed ? D.user.seal || '砚' : '?';
  const avStyle = authed ? {
    cursor: 'pointer'
  } : {
    cursor: 'pointer',
    background: 'var(--ink-3)',
    color: 'var(--paper-2)'
  };
  const avTitle = authed ? TC('set_title') : window.CLANG === 'en' ? 'Not signed in' : '未登录，点击前往登录';
  const avClick = authed ? () => go('settings') : () => {
    window.location.href = '/login.html';
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "c-rail"
  }, /*#__PURE__*/React.createElement("div", {
    className: "logo",
    style: {
      cursor: 'pointer'
    },
    onClick: onShelf,
    title: TC('to_shelf')
  }, "\u7B14"), /*#__PURE__*/React.createElement("div", {
    className: "ri",
    onClick: onShelf,
    title: TC('shelf')
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "shelf",
    s: 20
  })), items.map(([sec, ic, lab]) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    key: sec,
    className: 'ri' + (section === sec ? ' active' : ''),
    onClick: () => go(sec),
    title: TC(lab),
    "aria-label": TC(lab),
    "aria-current": section === sec ? 'page' : undefined
  }, /*#__PURE__*/React.createElement(Icon, {
    n: ic,
    s: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: 'ri' + (section === 'inbox' ? ' active' : ''),
    onClick: () => go('inbox'),
    title: TC('inbox'),
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bell",
    s: 20
  }), unread > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 15,
      height: 15,
      padding: '0 3px',
      borderRadius: 8,
      background: 'var(--terra)',
      color: '#fff',
      fontSize: 9,
      fontWeight: 700,
      display: 'grid',
      placeItems: 'center',
      lineHeight: 1
    }
  }, unread > 99 ? '99+' : unread)), isAdmin && /*#__PURE__*/React.createElement("div", {
    className: 'ri' + (section === 'admin' ? ' active' : ''),
    onClick: () => go('admin'),
    title: TC('adm_title')
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "grid",
    s: 20
  })), (isAdmin || isPartner) && /*#__PURE__*/React.createElement("div", {
    className: 'ri' + (section === 'partnerships' ? ' active' : ''),
    onClick: () => go('partnerships'),
    title: TC('partnership')
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "link",
    s: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "sp"
  }), /*#__PURE__*/React.createElement("div", {
    className: "av",
    style: avStyle,
    onClick: avClick,
    title: avTitle
  }, avSeal));
}

/* 窄屏检测（<=860px：目录退化为抽屉） */
function useNarrow() {
  const [n, setN] = React.useState(() => window.matchMedia('(max-width:860px)').matches);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width:860px)');
    const f = e => setN(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', f);else mq.addListener(f);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', f);else mq.removeListener(f);
    };
  }, []);
  return n;
}
window.useNarrow = useNarrow;
function AppTree({
  open,
  setOpen,
  chap,
  pick,
  treeOpen,
  toast
}) {
  const narrow = useNarrow();
  const [w, setW] = React.useState(() => {
    try {
      return +localStorage.getItem('lf_tree_w') || 288;
    } catch (e) {
      return 288;
    }
  });
  const setWidth = x => {
    setW(x);
    try {
      localStorage.setItem('lf_tree_w', x);
    } catch (e) {}
  };
  const [colOpen, setColOpen] = React.useState(() => {
    try {
      return localStorage.getItem('lf_tree_open') !== '0';
    } catch (e) {
      return true;
    }
  });
  const [colClosing, setColClosing] = React.useState(false);
  const colMounted = colOpen || colClosing;
  const toggleCol = () => {
    if (colClosing) return;
    if (colOpen) {
      setColClosing(true);
      try {
        localStorage.setItem('lf_tree_open', '0');
      } catch (e) {}
      setTimeout(() => {
        setColOpen(false);
        setColClosing(false);
      }, 300);
    } else {
      setColOpen(true);
      try {
        localStorage.setItem('lf_tree_open', '1');
      } catch (e) {}
    }
  };
  if (!colMounted && !narrow) return /*#__PURE__*/React.createElement("button", {
    className: "c-sidestrip left",
    onClick: toggleCol,
    title: TC('tree_expand')
  }, /*#__PURE__*/React.createElement("span", {
    className: "ss-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "book",
    s: 16
  })), /*#__PURE__*/React.createElement("span", {
    className: "ss-tx"
  }, TC('tree_label')), /*#__PURE__*/React.createElement("span", {
    className: "ss-caret"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  })));
  return /*#__PURE__*/React.createElement("div", {
    className: 'c-tree' + (treeOpen ? ' tree-show' : '') + (colClosing && !narrow ? ' closing' : ''),
    style: narrow ? null : {
      width: w
    }
  }, !narrow && /*#__PURE__*/React.createElement("button", {
    className: "c-sidecollapse left",
    onClick: toggleCol,
    title: TC('tree_collapse')
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 14,
    w: 2
  })), /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt"
  }, /*#__PURE__*/React.createElement("span", null, "\u300A", L(D.book.title), "\u300B")), Array.isArray(D.book.genre_parts) && D.book.genre_parts.length ? /*#__PURE__*/React.createElement("div", {
    className: "btags"
  }, D.book.genre_parts.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "btrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "btk"
  }, L(p.label)), /*#__PURE__*/React.createElement("span", {
    className: "btvs"
  }, String(L(p.value)).split(/[、,，\/]+/).map(s => s.trim()).filter(Boolean).map((t, j) => /*#__PURE__*/React.createElement("span", {
    key: j,
    className: "btv"
  }, t)))))) : L(D.book.genre) ? /*#__PURE__*/React.createElement("div", {
    className: "bm"
  }, /*#__PURE__*/React.createElement("span", null, L(D.book.genre))) : null, /*#__PURE__*/React.createElement("div", {
    className: "bm"
  }, /*#__PURE__*/React.createElement("span", null, D.book.chap, " ", TC('chap') === 'ch.' ? 'ch' : '章'), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, L(D.book.words)))), /*#__PURE__*/React.createElement("div", {
    className: "c-search",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "search",
    s: 14
  }), TC('search_tree')), /*#__PURE__*/React.createElement("div", {
    className: "scroll",
    style: {
      overflow: 'auto'
    }
  }, D.volumes.map((v, i) => {
    const isOpen = open === i;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: 'c-vol' + (isOpen ? ' open' : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: 'vh' + (isOpen ? ' on' : ''),
      onClick: () => v.state !== 'plan' && setOpen(isOpen ? -1 : i)
    }, v.state !== 'plan' && /*#__PURE__*/React.createElement("span", {
      className: "vcaret"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "caret",
      s: 13
    })), /*#__PURE__*/React.createElement("span", {
      className: "vno"
    }, L(v.no)), /*#__PURE__*/React.createElement("span", {
      className: "vnm"
    }, L(v.name)), v.state === 'active' && /*#__PURE__*/React.createElement("span", {
      className: "c-dot active"
    })), v.state !== 'plan' && /*#__PURE__*/React.createElement("div", {
      className: 'c-chapswrap' + (isOpen ? ' open' : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "c-chaps-clip"
    }, /*#__PURE__*/React.createElement("div", {
      className: "c-chaps"
    }, D.chapters.filter(c => v.vnum == null || c.vol == null ? true : c.vol === v.vnum).map(c => /*#__PURE__*/React.createElement("div", {
      key: c.no,
      className: 'c-chap' + (c.no === chap ? ' on' : ''),
      onClick: () => pick(c.no)
    }, /*#__PURE__*/React.createElement("span", {
      className: 'c-dot ' + c.state
    }), /*#__PURE__*/React.createElement("span", {
      className: "cno"
    }, c.no), /*#__PURE__*/React.createElement("span", {
      className: "cnm"
    }, c.title.zh === '—' ? '—' : L(c.title))))))), v.state === 'plan' && /*#__PURE__*/React.createElement(PreGenVol, {
      toast: toast,
      book: D.book && D.book.id,
      volNo: v.vnum || v.no && parseInt(String(v.no.en || '').replace(/\D/g, ''), 10) || undefined
    }));
  })), !narrow && /*#__PURE__*/React.createElement(ResizeHandle, {
    side: "right",
    getWidth: () => w,
    setWidth: setWidth,
    min: 228,
    max: 460,
    onDouble: () => setWidth(288)
  }));
}

/* ---------- workbench tab contents ---------- */
function VolTab({
  onEdit,
  volume
}) {
  return /*#__PURE__*/React.createElement(VolOutlineView, {
    onEdit: onEdit,
    volume: volume,
    o: D.volOutline
  });
}
// The volume outline body; the phone volume page also renders a viewed volume's own outline through it.
function VolOutlineView({
  onEdit,
  volume,
  o
}) {
  if (!o || !o.acts || !o.conflicts || !o.ending) return null;
  const acts = [['est', o.acts.establish], ['con', o.acts.confront], ['res', o.acts.resolve]];
  const confs = [['ext', o.conflicts.external], ['int', o.conflicts.internal], ['und', o.conflicts.underlying]];
  return /*#__PURE__*/React.createElement("div", {
    className: "wbv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wbv-pos"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wbv-poshead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-latin wbv-vno"
  }, L(o.no)), /*#__PURE__*/React.createElement("span", {
    className: "wbv-vname"
  }, L(o.name)), /*#__PURE__*/React.createElement("span", {
    className: "c-latin wbv-vrange"
  }, L(o.range)), /*#__PURE__*/React.createElement("div", {
    className: "wb-outline-actions"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-badge gold"
  }, TC(volume && volume.state === 'active' ? 'vol_active' : 'vol_done')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: onEdit
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "pen",
    s: 12
  }), TC('edit_vol_outline')))), /*#__PURE__*/React.createElement("div", {
    className: "wbv-poslabel"
  }, TC('vo_positioning')), /*#__PURE__*/React.createElement("p", {
    className: "wbv-postext"
  }, L(o.positioning))), /*#__PURE__*/React.createElement("section", {
    className: "wbv-sec"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "wbv-h"
  }, TC('vo_acts')), /*#__PURE__*/React.createElement("div", {
    className: "wbv-acts"
  }, acts.map(([k, a], i) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: 'wbv-act ' + k
  }, /*#__PURE__*/React.createElement("div", {
    className: "wbv-acttop"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-latin wbv-actno"
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    className: "wbv-actk"
  }, TC('vo_act_' + k))), /*#__PURE__*/React.createElement("div", {
    className: "c-latin wbv-actrange"
  }, L(a.chapters)), /*#__PURE__*/React.createElement("p", null, L(a.content)))))), /*#__PURE__*/React.createElement("section", {
    className: "wbv-sec"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "wbv-h"
  }, TC('vo_conflict')), /*#__PURE__*/React.createElement("div", {
    className: "wbv-confs"
  }, confs.map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: 'wbv-conf ' + k
  }, /*#__PURE__*/React.createElement("div", {
    className: "wbv-confk"
  }, TC('vo_c_' + k)), /*#__PURE__*/React.createElement("p", null, L(v)))))), /*#__PURE__*/React.createElement("section", {
    className: "wbv-sec"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "wbv-h"
  }, TC('vo_nodes')), /*#__PURE__*/React.createElement("div", {
    className: "wbv-nodes"
  }, o.nodes.map(n => /*#__PURE__*/React.createElement("div", {
    key: n.id,
    className: "wbv-node"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-latin wbv-nodeid"
  }, n.id), /*#__PURE__*/React.createElement("div", {
    className: "wbv-nodebody"
  }, /*#__PURE__*/React.createElement("p", {
    className: "wbv-nodedesc"
  }, L(n.description)), /*#__PURE__*/React.createElement("p", {
    className: "wbv-nodecons"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wbv-conslab"
  }, TC('vo_node_cons')), L(n.consequence))))))), /*#__PURE__*/React.createElement("section", {
    className: "wbv-sec"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "wbv-h"
  }, TC('vo_cast')), /*#__PURE__*/React.createElement("div", {
    className: "wbv-cast"
  }, o.characters.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "wbv-char"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wbv-charname"
  }, L(c.name)), /*#__PURE__*/React.createElement("div", {
    className: "wbv-charid"
  }, L(c.identity)), /*#__PURE__*/React.createElement("span", {
    className: "wbv-fntag"
  }, L(c.narrative_function)))))), /*#__PURE__*/React.createElement("section", {
    className: "wbv-sec"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "wbv-h"
  }, TC('vo_ending')), /*#__PURE__*/React.createElement("div", {
    className: "wbv-end"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wbv-endrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wbv-endk"
  }, TC('vo_end_state')), /*#__PURE__*/React.createElement("p", null, L(o.ending.character_state))), /*#__PURE__*/React.createElement("div", {
    className: "wbv-endrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wbv-endk"
  }, TC('vo_end_susp')), /*#__PURE__*/React.createElement("p", null, L(o.ending.suspense))), /*#__PURE__*/React.createElement("div", {
    className: "wbv-endrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wbv-endk"
  }, TC('vo_end_after')), /*#__PURE__*/React.createElement("p", null, L(o.ending.emotional_aftertaste))))), /*#__PURE__*/React.createElement("section", {
    className: "wbv-sec"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "wbv-h"
  }, TC('vo_tone')), /*#__PURE__*/React.createElement("p", {
    className: "wbv-tone"
  }, L(o.style_tone))));
}
function BriefTab({
  pick,
  onEdit
}) {
  return /*#__PURE__*/React.createElement(BriefOutlineView, {
    pick: pick,
    onEdit: onEdit,
    o: D.arcOutline
  });
}
function BriefOutlineView({
  pick,
  onEdit,
  o
}) {
  const en = window.CLANG === 'en';
  if (!o || !Array.isArray(o.chapters)) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "wbb"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wbb-arc"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wbb-arctag"
  }, TC('br_arc')), /*#__PURE__*/React.createElement("span", {
    className: "wbb-arcname"
  }, L(o.arc_name)), /*#__PURE__*/React.createElement("span", {
    className: "c-latin wbb-arcvol"
  }, L(o.volume)), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm wb-outline-edit",
    onClick: onEdit
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "pen",
    s: 12
  }), TC('edit_brief_outline'))), /*#__PURE__*/React.createElement("section", {
    className: "wbb-sec"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "wbv-h"
  }, TC('br_chapters')), /*#__PURE__*/React.createElement("div", {
    className: "wbb-chaps"
  }, o.chapters.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.number,
    className: "wbb-chap",
    onClick: () => pick(c.number),
    title: TC('ed_dbl')
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-latin wbb-cno"
  }, c.number), /*#__PURE__*/React.createElement("span", {
    className: "wbb-ctitle"
  }, L(c.title)), /*#__PURE__*/React.createElement("span", {
    className: "wbb-csum"
  }, L(c.summary)), /*#__PURE__*/React.createElement("span", {
    className: 'wbb-rhythm ' + c.rhythm.k
  }, L(c.rhythm)), /*#__PURE__*/React.createElement("span", {
    className: "c-latin wbb-ctime"
  }, L(c.time_advance)))))), /*#__PURE__*/React.createElement("section", {
    className: "wbb-sec"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "wbv-h"
  }, TC('br_arcs')), /*#__PURE__*/React.createElement("div", {
    className: "wbb-carcs"
  }, o.character_arcs.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "wbb-carc"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wbb-caname"
  }, L(a.name)), /*#__PURE__*/React.createElement("div", {
    className: "wbb-caflow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wbb-from"
  }, L(a.from)), /*#__PURE__*/React.createElement("span", {
    className: "wbb-arrow"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  })), /*#__PURE__*/React.createElement("span", {
    className: "wbb-to"
  }, L(a.to))), /*#__PURE__*/React.createElement("div", {
    className: "wbb-cadelta"
  }, L(a.change)))))), /*#__PURE__*/React.createElement("section", {
    className: "wbb-sec"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "wbv-h"
  }, TC('br_decisions')), /*#__PURE__*/React.createElement("div", {
    className: "wbb-decs"
  }, o.decision_points.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "wbb-dec"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-latin wbb-decch"
  }, en ? 'ch.' + d.chapter : '第 ' + d.chapter + ' 章'), /*#__PURE__*/React.createElement("div", {
    className: "wbb-decbody"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wbb-decwho"
  }, L(d.character)), /*#__PURE__*/React.createElement("p", {
    className: "wbb-decchoice"
  }, L(d.choice)), /*#__PURE__*/React.createElement("p", {
    className: "wbb-decimpact"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wbb-implab"
  }, TC('br_dec_impact')), L(d.impact))))))));
}
function EmptyDetail({
  chap,
  onGen
}) {
  const c = D.chapters.find(x => x.no === chap);
  return /*#__PURE__*/React.createElement("div", {
    className: "c-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-empty-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "run",
    s: 26
  })), /*#__PURE__*/React.createElement("div", {
    className: "c-empty-t"
  }, TC('chap') === 'ch.' ? 'ch.' + chap : '第 ' + chap + ' 章', " \xB7 ", TC('empty_t')), /*#__PURE__*/React.createElement("div", {
    className: "c-empty-d"
  }, TC('empty_d')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold",
    style: {
      marginTop: 18
    },
    onClick: onGen,
    disabled: engineGenerationBlocked()
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "run",
    s: 14,
    w: 2
  }), TC('gen_outline')));
}
function RunOverlay({
  type
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "c-runoverlay"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-runcard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-runspin"
  }), /*#__PURE__*/React.createElement("div", {
    className: "c-runline c-shimmer"
  }, type === 'outline' ? TC('run_outline') : TC('run_prose')), /*#__PURE__*/React.createElement("div", {
    className: "c-runagents"
  }, (D.detail && D.detail.agents || []).map((a, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "c-arun"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ad"
  }, L(a)[0]), L(a))))));
}

/* ---------- chapter body history (view past versions + restore) ---------- */
function BodyHistory({
  bookId,
  no,
  currentText,
  canRestore,
  captureRestore,
  onClose,
  onRestored,
  toast,
  historyMode = 'body',
  onHistoryModeChange,
  drawHistory,
  drawBusy = false
}) {
  const {
    useState,
    useEffect
  } = React;
  const en = window.CLANG === 'en';
  const [list, setList] = useState(null); // null = loading, [] = empty
  const [sel, setSel] = useState(null); // selected revision_id
  const [detail, setDetail] = useState(null); // {body} of selected revision
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const drawerRef = React.useRef(null),
    closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement,
      element = drawerRef.current;
    const timer = setTimeout(() => element && element.querySelector('button').focus(), 0);
    const key = event => {
      if (document.querySelector('.c-confirm-dialog') || element.querySelector('.rg-scrim')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === 'Tab') {
        const nodes = Array.from(element.querySelectorAll('button:not(:disabled),[tabindex="0"]')),
          first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', key);
      if (previous && previous.isConnected) {
        if (previous.disabled) setTimeout(() => {
          if (previous.isConnected && document.activeElement === document.body) previous.focus();
        }, 0);else previous.focus();
      }
    };
  }, []);
  useEffect(() => {
    let alive = true;
    if (!bookId || !window.LF_PORTAL || !window.LF_PORTAL.bodyRevisions) {
      setList([]);
      return;
    }
    window.LF_PORTAL.bodyRevisions(bookId, no).then(r => {
      if (alive) setList(r && Array.isArray(r.revisions) ? r.revisions : []);
    }).catch(() => {
      if (alive) setList([]);
    });
    return () => {
      alive = false;
    };
  }, [bookId, no]);
  const srcLabel = s => {
    s = String(s || '');
    if (/polish/.test(s)) return TC('wh_src_polish');
    if (/workflow|generat/.test(s)) return TC('wh_src_workflow');
    if (/portal_user|manual/.test(s)) return TC('wh_src_manual');
    if (/restore|回滚|恢复/.test(s)) return TC('wh_src_restore');
    return TC('wh_src_other');
  };
  const fmtTime = t => {
    if (!t) return '';
    try {
      return new Date(t).toLocaleString(en ? 'en-US' : 'zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(t);
    }
  };
  const revWords = r => {
    var ds = r && r.diff_stats;
    if (ds && typeof ds === 'object') {
      var a = ds.after_chars != null ? ds.after_chars : ds.after_length != null ? ds.after_length : null;
      if (a != null) return Number(a);
    }
    return null;
  };
  const pick = async rev => {
    setSel(rev.revision_id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await window.LF_PORTAL.bodyRevision(bookId, no, rev.revision_id);
      setDetail({
        body: window.LF_PORTAL.revisionBodyText(d)
      });
    } catch (e) {
      setDetail({
        body: ''
      });
    } finally {
      setDetailLoading(false);
    }
  };
  const confirmRestore = () => {
    if (!canRestore) return;
    const captured = captureRestore && captureRestore();
    if (captured) setConfirm({
      ...captured,
      revisionId: sel
    });
  };
  const doRestore = async () => {
    if (restoring || !canRestore || !confirm || !confirm.isCurrent()) return;
    setRestoring(true);
    try {
      await window.LF_PORTAL.restoreBodyRevision(bookId, no, confirm.revisionId, {
        baseVersion: confirm.baseVersion,
        isCurrent: confirm.isCurrent
      });
      setConfirm(false);
      setRestoring(false);
      onRestored && onRestored();
    } catch (e) {
      setRestoring(false);
      setConfirm(false);
      if (window.LF_ERROR && window.LF_ERROR.isBackendError(e)) window.LF_ERROR(e);else toast && toast(TC('wh_restore_fail'));
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-drawer-scrim",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    ref: drawerRef,
    className: "cr-drawer wh-drawer",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": TC('wh_title'),
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-drawer-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ad"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "clock",
    s: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "ht"
  }, /*#__PURE__*/React.createElement("b", null, TC('wh_title')), /*#__PURE__*/React.createElement("i", null, TC('wh_sub'))), /*#__PURE__*/React.createElement("button", {
    className: "edt-x",
    onClick: onClose,
    "aria-label": TC('ed_close'),
    title: TC('ed_close')
  }, "\xD7")), onHistoryModeChange && /*#__PURE__*/React.createElement("div", {
    className: "pd-history-tabs",
    role: "group",
    "aria-label": en ? 'History type' : '历史类型'
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn sm",
    "aria-pressed": historyMode === 'body',
    disabled: drawBusy || restoring || confirm,
    onClick: () => onHistoryModeChange('body')
  }, en ? 'Prose versions' : '正文版本'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn sm",
    "aria-pressed": historyMode === 'draw',
    disabled: drawBusy || restoring || confirm,
    onClick: () => onHistoryModeChange('draw')
  }, en ? 'Draw history' : '抽卡记录')), historyMode === 'draw' ? drawHistory : /*#__PURE__*/React.createElement("div", {
    className: "wh-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wh-list"
  }, list === null && /*#__PURE__*/React.createElement("div", {
    className: "wh-msg c-shimmer"
  }, TC('wh_loading')), list !== null && list.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "wh-msg"
  }, TC('wh_empty')), list !== null && list.map(rev => {
    const w = revWords(rev);
    return /*#__PURE__*/React.createElement("button", {
      key: rev.revision_id,
      className: 'wh-item' + (sel === rev.revision_id ? ' on' : ''),
      onClick: () => pick(rev)
    }, /*#__PURE__*/React.createElement("span", {
      className: "wh-it-top"
    }, /*#__PURE__*/React.createElement("span", {
      className: "wh-ver c-latin"
    }, "v", rev.version), /*#__PURE__*/React.createElement("span", {
      className: 'wh-src ' + srcLabel(rev.source || rev.source_detail)
    }, srcLabel(rev.source || rev.source_detail))), /*#__PURE__*/React.createElement("span", {
      className: "wh-it-time c-latin"
    }, fmtTime(rev.created_at), w != null ? ' · ' + w + ' ' + TC('wh_words') : ''));
  })), /*#__PURE__*/React.createElement("div", {
    className: "wh-detail"
  }, !sel && /*#__PURE__*/React.createElement("div", {
    className: "wh-msg"
  }, TC('wh_pick')), sel && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "wh-detail-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold sm",
    disabled: !canRestore || detailLoading || restoring || !detail || !detail.body,
    onClick: confirmRestore
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 13
  }), TC('wh_restore'))), /*#__PURE__*/React.createElement("div", {
    className: "wh-panes"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wh-pane"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wh-pane-h"
  }, TC('wh_current')), /*#__PURE__*/React.createElement("div", {
    className: "wh-pane-body"
  }, currentText || '—')), /*#__PURE__*/React.createElement("div", {
    className: "wh-pane"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wh-pane-h"
  }, TC('wh_version'), " ", (() => {
    var r = (list || []).find(x => x.revision_id === sel);
    return r ? 'v' + r.version : '';
  })()), /*#__PURE__*/React.createElement("div", {
    className: "wh-pane-body"
  }, detailLoading ? /*#__PURE__*/React.createElement("span", {
    className: "c-shimmer"
  }, TC('wh_loading')) : detail && detail.body ? detail.body : '—')))))), confirm && /*#__PURE__*/React.createElement("div", {
    className: "rg-scrim",
    onClick: () => !restoring && setConfirm(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rg-ad"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-t"
  }, TC('wh_restore_t')))), /*#__PURE__*/React.createElement("p", {
    className: "rg-c",
    style: {
      padding: '4px 2px 14px'
    }
  }, TC('wh_restore_b')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 9,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: () => setConfirm(false),
    disabled: restoring
  }, TC('wh_restore_cancel')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold sm",
    onClick: doRestore,
    disabled: restoring || !canRestore || !confirm.isCurrent()
  }, restoring ? '…' : TC('wh_restore_ok')))))));
}

/* ---------- writing ---------- */
function WriteView({
  toast,
  lang,
  goNextOutline,
  toggleTree,
  drawRoundId,
  drawRoundRequest,
  onGenerateProse
}) {
  const p = D.prose;
  const en = window.CLANG === 'en';
  const accessError = p && p.access_error;
  const contentBlocked = !!(accessError && accessError.code);
  const accountId = window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id;
  const bookId = p && p._bookId,
    chapterNumber = p && p.no;
  const proseKey = 'lf_prose_' + String(accountId || '') + '_' + bookId + '_' + chapterNumber;
  const legacyProseKey = 'lf_prose_' + bookId + '_' + chapterNumber;
  const serverParas = () => contentBlocked ? [] : (p.paras || []).map(x => x[lang] || x.zh);
  const validVersion = v => (typeof v === 'number' || typeof v === 'string' && v.trim() !== '') && Number.isSafeInteger(Number(v)) && Number(v) >= 0;
  const serverBodyReady = !!accountId && !contentBlocked && p._bodyLoaded === true && validVersion(p.version) && String(D.book && D.book.id || '') === String(bookId || '') && String(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.selectedBookId || '') === String(bookId || '') && Number(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.selectedChapter) === Number(chapterNumber);
  const [seed] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(proseKey) || 'null');
      if (draft && draft.dirty && Array.isArray(draft.paras) && draft.paras.length) {
        if (serverBodyReady && draft.paras.join('\n\n') === serverParas().join('\n\n')) {
          localStorage.removeItem(proseKey);
          return {
            paras: serverParas(),
            version: Number(p.version),
            dirty: false,
            status: 'saved'
          };
        }
        const sameBase = serverBodyReady && validVersion(draft.baseVersion) && Number(draft.baseVersion) === Number(p.version);
        return {
          paras: draft.paras,
          version: draft.baseVersion,
          dirty: true,
          status: sameBase ? 'dirty' : 'conflict'
        };
      }
      // Preserve a pre-upgrade unsaved draft only when its exact server baseline
      // still matches. Leave the original entry intact until an explicit save.
      const legacy = JSON.parse(localStorage.getItem(legacyProseKey) || 'null');
      const tag = String(p.updated_at || '') + '#' + String(p.version || 0);
      if (legacy && legacy.tag === tag && Array.isArray(legacy[lang]) && legacy[lang].length) {
        if (serverBodyReady && legacy[lang].join('\n\n') === serverParas().join('\n\n')) localStorage.removeItem(legacyProseKey);else return {
          paras: legacy[lang],
          version: Number(p.version) || 0,
          dirty: true,
          legacy: true,
          status: serverBodyReady ? 'dirty' : 'conflict'
        };
      }
    } catch (e) {}
    return {
      paras: serverParas(),
      version: Number(p.version) || 0,
      dirty: false,
      status: 'saved'
    };
  });
  const [paras, setParas] = useState(seed.paras);
  const [dlg, setDlg] = useState(null);
  const [regen, setRegen] = useState(false);
  const [polishCf, setPolishCf] = useState(false);
  const [task, setTask] = useState(null);
  const [swap, setSwap] = useState(null);
  const [fin, setFin] = useState(false);
  const [run, setRun] = useState(null);
  const [rewriteBusy, setRewriteBusy] = useState(false);
  const rewriteFlightRef = useRef(false);
  const [drawBusy, setDrawBusy] = useState(false);
  const busy = !!task || !!run || rewriteBusy || drawBusy;
  const [docEdit, setDocEdit] = useState(false);
  const [docDraft, setDocDraft] = useState('');
  const docRef = useRef(false);
  const docStartRef = useRef(null);
  const editedRef = useRef(seed.dirty);
  const baseVersionRef = useRef(seed.version);
  const saveFlightRef = useRef(false);
  const editGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  const syncSequenceRef = useRef(0);
  const _saveTimer = useRef();
  const [saveStatus, setSaveStatus] = useState(seed.status);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [syncPending, setSyncPending] = useState(false);
  const [reloadConfirm, setReloadConfirm] = useState(false);
  const stateRef = useRef({});
  stateRef.current = {
    dlg,
    busy,
    task,
    paras,
    saveStatus
  };
  const _wbId = D.book && D.book.id;
  const currentTarget = () => mountedRef.current && String(D.book && D.book.id || '') === String(bookId || '') && String(D.prose && D.prose._bookId || '') === String(bookId || '') && Number(D.prose && D.prose.no) === Number(chapterNumber) && accountId === (window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id);
  const refreshBlocked = () => docRef.current || editedRef.current || saveFlightRef.current || rewriteFlightRef.current || !!stateRef.current.dlg || !!stateRef.current.task;
  const finalized = !!(p && p.post_hoc_status === 'completed' || window.LF_PORTAL && window.LF_PORTAL.chapterFinalized && _wbId && window.LF_PORTAL.chapterFinalized(_wbId, p.no));
  const [unlocked, setUnlocked] = useState(false);
  const unlockedRef = useRef(false);
  const [lock, setLock] = useState(null);
  const dtaRef = useRef(null),
    bodyRef = useRef(null);
  const [writerType, setWriterType] = useState(() => {
    try {
      return localStorage.getItem('lf_writer_type') || 'single';
    } catch (e) {
      return 'single';
    }
  });
  const toggleWriterType = () => {
    setWriterType(n0 => {
      const n = n0 === 'muti' ? 'single' : 'muti';
      try {
        localStorage.setItem('lf_writer_type', n);
      } catch (e) {}
      return n;
    });
  };
  const [histOpen, setHistOpen] = useState(false),
    [exportOpen, setExportOpen] = useState(false);
  const saveDraftCache = parts => {
    try {
      localStorage.setItem(proseKey, JSON.stringify({
        dirty: true,
        baseVersion: baseVersionRef.current,
        paras: parts
      }));
    } catch (e) {}
  };
  const readProse = async mayRetry => {
    if (!currentTarget() || !window.LF_PORTAL || !window.LF_PORTAL.refreshProse) return false;
    if (refreshBlocked()) {
      setSyncPending(true);
      return false;
    }
    const sequence = ++syncSequenceRef.current;
    try {
      const result = await window.LF_PORTAL.refreshProse(bookId, chapterNumber);
      if (!currentTarget() || sequence !== syncSequenceRef.current) return false;
      const applied = !!(result && result.ok && result.applied && result.applied.some(read => read.kind === 'chapter_body'));
      // A read overtaken by the page's own navigation load (entering from the inbox) is skipped, not failed.
      // While the same chapter is still shown and nothing blocks a refresh, read it once more under fresh guards.
      const overtaken = !applied && !!(result && result.ok && !(result.failed && result.failed.length) && (result.skipped || []).some(read => read.kind === 'chapter_body'));
      if (overtaken && mayRetry && !refreshBlocked()) return readProse(false);
      setSyncPending(!applied);
      return applied;
    } catch (e) {
      if (currentTarget() && sequence === syncSequenceRef.current) setSyncPending(true);
      return false;
    }
  };
  const readCurrentProse = () => readProse(true);
  const readCurrentRef = useRef(readCurrentProse);
  readCurrentRef.current = readCurrentProse;
  useEffect(() => {
    mountedRef.current = true;
    const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
    const release = guard && guard.registerNavigationBlocker ? guard.registerNavigationBlocker(() => refreshBlocked() || stateRef.current.busy, {
      refreshBlocked
    }) : () => {};
    const refresh = () => {
      readCurrentRef.current();
    };
    const beforeUnload = event => {
      if (docRef.current || editedRef.current || saveFlightRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('beforeunload', beforeUnload);
    refresh();
    return () => {
      mountedRef.current = false;
      syncSequenceRef.current += 1;
      release();
      clearTimeout(_saveTimer.current);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [accountId, bookId, chapterNumber]);
  useEffect(() => {
    if (refreshBlocked()) {
      if (Number(p.version) !== Number(baseVersionRef.current)) setSyncPending(true);
      return;
    }
    baseVersionRef.current = Number(p.version) || 0;
    setParas(serverParas());
  }, [lang, p && p._bookId, p && p.no, p && p.version, p && p.updated_at, accessError && accessError.code]);
  useEffect(() => {
    if (!editedRef.current || docRef.current || saveStatus === 'conflict' || saveStatus === 'error') return;
    saveDraftCache(paras);
    const submittedGeneration = editGenerationRef.current;
    clearTimeout(_saveTimer.current);
    _saveTimer.current = setTimeout(async () => {
      if (!currentTarget() || docRef.current || saveFlightRef.current) return;
      saveFlightRef.current = true;
      setSaveStatus('saving');
      try {
        const result = await window.LF_PORTAL.saveProse(bookId, chapterNumber, paras, {
          baseVersion: baseVersionRef.current
        });
        if (!currentTarget()) return;
        if (submittedGeneration !== editGenerationRef.current || docRef.current || stateRef.current.paras !== paras) {
          setSaveStatus('conflict');
          return;
        }
        baseVersionRef.current = Number(result.version);
        editedRef.current = false;
        try {
          localStorage.removeItem(proseKey);
          if (seed.legacy) localStorage.removeItem(legacyProseKey);
        } catch (e) {}
        setSaveStatus('saved');
        toast(TC('ed_saved'));
      } catch (e) {
        if (currentTarget()) setSaveStatus(e && (Number(e.status) === 409 || e.code === 'version_conflict') ? 'conflict' : 'error');
      } finally {
        saveFlightRef.current = false;
        if (currentTarget() && !editedRef.current) readCurrentRef.current();
      }
    }, 1200);
    return () => clearTimeout(_saveTimer.current);
  }, [paras, saveAttempt]);
  const reloadProse = async () => {
    setReloadConfirm(false);
    const previous = stateRef.current.paras;
    editedRef.current = false;
    docRef.current = false;
    setDocEdit(false);
    setDlg(null);
    const loaded = await readCurrentProse();
    if (!currentTarget()) return;
    if (loaded) {
      try {
        localStorage.removeItem(proseKey);
        if (seed.legacy) localStorage.removeItem(legacyProseKey);
      } catch (e) {}
      baseVersionRef.current = Number(D.prose.version) || 0;
      setParas((D.prose.paras || []).map(x => x[lang] || x.zh));
      setSaveStatus('saved');
    } else {
      editedRef.current = true;
      setParas(previous);
      setSaveStatus('conflict');
    }
  };

  /* --- whole-chapter manual edit: double-click anywhere, or the title-area toggle --- */
  const grow = window.resizeAutoGrowTextarea;
  const splitDoc = t => t.split(/\n+/).map(x => x.trim()).filter(Boolean);
  const invalidateReads = () => {
    const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
    if (guard && guard.invalidate) guard.invalidate();
  };
  const enterDoc = caret => {
    if (busy || visibleTask || contentBlocked || saveFlightRef.current || rewriteFlightRef.current || saveStatus === 'conflict') return;
    if (finalized && !unlockedRef.current) {
      setLock('edit');
      return;
    } // 已定稿 → 先提示

    invalidateReads();
    clearTimeout(_saveTimer.current);
    if (!editedRef.current) baseVersionRef.current = Number(p.version) || 0;
    setDlg(null);
    docRef.current = true;
    const txt = paras.join('\n\n');
    docStartRef.current = {
      text: txt,
      status: saveStatus
    };
    setDocDraft(txt);
    setDocEdit(true);
    setTimeout(() => {
      const s = window.getSelection();
      if (s) s.removeAllRanges();
      const t = dtaRef.current;
      if (t) {
        grow(t);
        t.focus();
        const c = typeof caret === 'number' ? Math.min(caret, txt.length) : txt.length;
        t.setSelectionRange(c, c);
      }
    }, 0);
  };
  const cancelDoc = () => {
    setDocEdit(false);
    docRef.current = false;
    if (editedRef.current) setSaveAttempt(n => n + 1);else {
      setSaveStatus('saved');
      readCurrentProse();
    }
  };
  const commitDoc = () => {
    const parts = splitDoc(docDraft),
      start = docStartRef.current;
    const changed = start && docDraft !== start.text && parts.length && parts.join('\n\n') !== paras.join('\n\n');
    if (changed) {
      editGenerationRef.current += 1;
      editedRef.current = true;
      saveDraftCache(parts);
      setParas(parts);
      setSaveStatus('dirty');
    } else if (start) {
      setSaveStatus(start.status);
      if (editedRef.current && start.status === 'dirty') setSaveAttempt(n => n + 1);
    }
    setDocEdit(false);
    docRef.current = false;
    if (!changed && start && start.status === 'saved' && !editedRef.current) readCurrentProse();
  };
  const dblPara = (i, ev) => {
    // map the double-clicked spot to a caret position in the joined text
    let off = 0;
    try {
      const s = window.getSelection();
      if (s && s.anchorNode && ev.currentTarget.contains(s.anchorNode)) {
        const r = document.createRange();
        r.setStart(ev.currentTarget, 0);
        r.setEnd(s.anchorNode, s.anchorOffset);
        off = r.toString().length;
      }
    } catch (e) {}
    enterDoc(paras.slice(0, i).reduce((a, t) => a + t.length + 2, 0) + off);
  };

  /* --- selection → agent float, snapped to sentence (in-paragraph) or paragraph (cross-paragraph) --- */
  const SENT_END = '。！？…!?；;',
    SENT_CLOSE = '”’』」）)】';
  const sentBounds = (text, s, e) => {
    const segs = [];
    let beg = 0;
    for (let i = 0; i < text.length; i++) {
      if (SENT_END.includes(text[i])) {
        let j = i + 1;
        while (j < text.length && SENT_CLOSE.includes(text[j])) j++;
        segs.push([beg, j]);
        beg = j;
        i = j - 1;
      }
    }
    if (beg < text.length) segs.push([beg, text.length]);
    let a = null,
      b = null;
    segs.forEach(seg => {
      if (seg[1] > s && seg[0] < e) {
        if (a == null) a = seg[0];
        b = seg[1];
      }
    });
    return a == null ? [0, text.length] : [a, b];
  };
  const offsetIn = (el, node, off) => {
    const r = document.createRange();
    r.setStart(el, 0);
    r.setEnd(node, off);
    return r.toString().length;
  };
  const onSelect = () => {
    if (docEdit || busy || visibleTask || saveFlightRef.current || editedRef.current) return;
    setTimeout(() => {
      if (!currentTarget() || docRef.current || saveFlightRef.current || editedRef.current || rewriteFlightRef.current || stateRef.current.busy) return;
      const s = window.getSelection();
      if (!s || s.isCollapsed || !s.rangeCount) return;
      if ((s.toString() || '').trim().length < 2) return;
      const r = s.getRangeAt(0);
      const elOf = n => {
        const e2 = n && n.nodeType === 3 ? n.parentElement : n;
        return e2 && e2.closest ? e2.closest('[data-pi]') : null;
      };
      const sEl = elOf(r.startContainer),
        eEl = elOf(r.endContainer);
      if (!sEl || !eEl) return;
      const sPi = +sEl.dataset.pi,
        ePi = +eEl.dataset.pi;
      const us = offsetIn(sEl, r.startContainer, r.startOffset);
      const ue = offsetIn(eEl, r.endContainer, r.endOffset);
      const rect = r.getBoundingClientRect();
      invalidateReads();
      setDlg(d => {
        if (dlgTimer.current) {
          clearTimeout(dlgTimer.current);
          dlgTimer.current = null;
        }
        const pos = d && !d.closing ? d.pos : {
          x: Math.max(12, Math.min(Math.round(rect.left), window.innerWidth - 372)),
          y: Math.min(Math.round(rect.bottom) + 14, window.innerHeight - 230)
        };
        if (sPi === ePi) {
          const sb = sentBounds(paras[sPi], us, ue);
          return {
            kind: 'sent',
            sPi,
            ePi,
            us,
            ue,
            scopeS: sb[0],
            scopeE: sb[1],
            pos
          };
        }
        return {
          kind: 'para',
          sPi,
          ePi,
          us,
          ue,
          pos
        };
      });
      s.removeAllRanges(); // our own two-layer highlight takes over
    }, 0);
  };
  const scopeText = d => d.kind === 'sent' ? paras[d.sPi].slice(d.scopeS, d.scopeE) : paras.slice(d.sPi, d.ePi + 1).join('\n');
  /* animated dismiss: float pops out + highlights fade, then unmount */
  const dlgTimer = useRef(null);
  const closeDlg = () => {
    setDlg(d => {
      if (!d || d.closing) return d;
      clearTimeout(dlgTimer.current);
      dlgTimer.current = setTimeout(() => {
        dlgTimer.current = null;
        setDlg(null);
      }, 240);
      return {
        ...d,
        closing: true
      };
    });
  };
  useEffect(() => () => clearTimeout(dlgTimer.current), []);
  /* click anywhere outside the float → clear selection highlight + close */
  useEffect(() => {
    if (!dlg || dlg.closing) return;
    const onDoc = e => {
      const t = e.target;
      if (t.closest && t.closest('.edt-agent')) return;
      closeDlg();
    };
    document.addEventListener('mousedown', onDoc, true);
    return () => document.removeEventListener('mousedown', onDoc, true);
  }, [dlg && !dlg.closing]);
  const userText = d => d.kind === 'sent' ? paras[d.sPi].slice(d.us, d.ue) : [paras[d.sPi].slice(d.us)].concat(paras.slice(d.sPi + 1, d.ePi)).concat([paras[d.ePi].slice(0, d.ue)]).join('\n');
  /* Portal 单字段改写上限 2 万字符：超长章节裁出以选段为中心的窗口作上下文，避免 422。 */
  const clampContext = (full, scope) => {
    const MAX = 19000;
    if (full.length <= MAX) return full;
    const at = full.indexOf(scope),
      center = at >= 0 ? at + scope.length / 2 : full.length / 2;
    let end = Math.min(full.length, Math.round(center + MAX / 2));
    let start = Math.max(0, end - MAX);
    end = Math.min(full.length, start + MAX);
    return (start > 0 ? '……' : '') + full.slice(start, end) + (end < full.length ? '……' : '');
  };
  /* 正文改写 agent：复用建书/细纲的后端改写网关（LF_PORTAL.rewriteField）。
     full_context = 本章全文，rewritable_scope = 用户框选的段（浅色高亮部分），
     引擎返回与 scope 同构的 {text}。无引擎时回退本地 aiRewrite，不白屏。 */
  const runRewrite = async intent => {
    const d = dlg;
    if (!d || docRef.current || busy || visibleTask || saveFlightRef.current || editedRef.current || rewriteFlightRef.current) return false;
    const rewriteBase = Number(p.version) || 0;
    rewriteFlightRef.current = true;
    setRewriteBusy(true);
    invalidateReads();
    try {
      const sc = scopeText(d),
        ut = userText(d);
      const focus = ut.trim() && ut.trim() !== sc.trim() ? en ? ` The user specifically selected this part: "${ut}" — focus the change there while keeping the whole passage coherent.` : `（用户具体框选的是「${ut}」，以此为改写重点，但保持整体连贯）` : '';
      const kindLab = en ? d.kind === 'sent' ? 'sentence' : 'paragraph' : d.kind === 'sent' ? '整句' : '整段';
      let out = null;
      const bookId = D.book && D.book.id;
      if (bookId && window.LF_PORTAL && window.LF_PORTAL.rewriteField) {
        const bk = D.book,
          bookName = bk && bk.title ? typeof bk.title === 'string' ? bk.title : bk.title.zh || bk.title.en || '' : '';
        try {
          const result = await window.LF_PORTAL.rewriteField(bookId, {
            book_name: bookName,
            resource_type: (en ? 'Chapter prose · ' : '章节正文·') + kindLab,
            full_context: {
              text: clampContext(paras.join('\n\n'), sc)
            },
            rewritable_scope: {
              text: sc
            },
            user_intent: intent.length + focus.length <= window.LF_REWRITE_INTENT_MAX_CHARS ? intent + focus : intent
          });
          out = result && typeof result.text === 'string' ? result.text : null;
        } catch (e) {
          if (window.LF_ERROR && window.LF_ERROR.isBackendError(e)) {
            window.LF_ERROR(e);
            return false;
          }
        }
      }
      if (out == null) {
        try {
          out = await window.aiRewrite(sc, intent + focus, kindLab);
        } catch (e) {}
      }
      if (!out) {
        toast(TC('wre_fail'));
        return false;
      }
      if (!currentTarget()) return false;
      baseVersionRef.current = rewriteBase;
      editGenerationRef.current += 1;
      editedRef.current = true;
      setSaveStatus('dirty');
      if (d.kind === 'sent') {
        setParas(ps => ps.map((t, i) => i === d.sPi ? t.slice(0, d.scopeS) + out + t.slice(d.scopeE) : t));
      } else {
        const parts = splitDoc(out);
        setParas(ps => ps.slice(0, d.sPi).concat(parts.length ? parts : [out], ps.slice(d.ePi + 1)));
      }
      toast(TC('wre_done'));
      return true;
    } finally {
      rewriteFlightRef.current = false;
      if (currentTarget()) setRewriteBusy(false);
    }
  };
  /* 复制：成文全文 / 框选选段 → 系统剪贴板 + 浮动通知（toast）。 */
  const copyToClipboard = async txt => {
    if (!txt) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(txt);
        return true;
      }
    } catch (e) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  };
  const copyChapter = async () => {
    const ok = await copyToClipboard(paras.join('\n\n'));
    toast(TC(ok ? 'w_copied' : 'w_copy_fail'));
  };
  const copyScene = async d => {
    if (!d) return;
    const ok = await copyToClipboard(scopeText(d));
    toast(TC(ok ? 'wsel_copied' : 'w_copy_fail'));
  };
  /* 框选浮窗开启时，⌘/Ctrl+C 复制选段（除非焦点在输入框且其自身有选区，则交给系统） */
  useEffect(() => {
    if (!dlg || dlg.closing) return;
    const onKey = e => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'c' && e.key !== 'C') return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT') && ae.selectionStart !== ae.selectionEnd) return;
      e.preventDefault();
      copyScene(dlg);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [dlg && !dlg.closing]);
  /* two-layer highlight: outer = rewrite scope (sentence/paragraph), inner = the user's exact selection */
  const renderPara = (para, i) => {
    const d = dlg;
    if (!d) return para;
    const sCls = 'hl-scope' + (d.closing ? ' hl-out' : ''),
      uCls = 'hl-user' + (d.closing ? ' hl-out' : '');
    if (d.kind === 'sent') {
      if (i !== d.sPi) return para;
      return /*#__PURE__*/React.createElement(React.Fragment, null, para.slice(0, d.scopeS), /*#__PURE__*/React.createElement("span", {
        className: sCls
      }, para.slice(d.scopeS, d.us), /*#__PURE__*/React.createElement("span", {
        className: uCls
      }, para.slice(d.us, d.ue)), para.slice(d.ue, d.scopeE)), para.slice(d.scopeE));
    }
    if (i < d.sPi || i > d.ePi) return para;
    const a = i === d.sPi ? d.us : 0,
      b = i === d.ePi ? d.ue : para.length;
    return /*#__PURE__*/React.createElement("span", {
      className: sCls
    }, para.slice(0, a), /*#__PURE__*/React.createElement("span", {
      className: uCls
    }, para.slice(a, b)), para.slice(b));
  };

  /* —— 润色 / 重生：二次确认 → 推理框（锁定正文）→ 新旧逐段替换动画 —— */
  const runTask = async (mode, intent) => {
    if (task || run || docRef.current || editedRef.current || saveFlightRef.current) {
      toast(TC('prose_finish_edit'));
      return;
    }
    const startVersion = Number(p.version) || 0;
    setRegen(false);
    setPolishCf(false);
    setDlg(null);
    const src = docEdit ? splitDoc(docDraft) : paras;
    if (docEdit) {
      if (src.length) setParas(src);
      setDocEdit(false);
      docRef.current = false;
    }
    var bookId = D.book && D.book.id,
      no = p.no;
    /* 引擎路径：重生→章节管线仅写手群(writer_group)，输入框作 human_intent；
       润色→润色管线。完成后从刷新的 D.prose 重载正文。 */
    if (window.LF_PORTAL && bookId) {
      const operationId = 'write_' + Date.now() + '_' + Math.random().toString(16).slice(2);
      const ownsRun = () => window.LF_RUN_ACTIVE && window.LF_RUN_ACTIVE.operationId === operationId;
      const endOwnedRun = () => {
        if (ownsRun()) lfRunEnd();
      };
      const stageOptions = window.ProseStageCore.taskOptions(null, {
        task_type: mode === 'polish' ? 'polish' : 'chapter_draft',
        execution_mode: 'writer_group',
        writer_type: writerType
      });
      setRun({
        mode,
        stage: null,
        progress: 0,
        stageOptions
      });
      lfRunStart(mode === 'polish' ? 'polish' : 'regen', {
        operationId,
        bookId,
        chapterNumber: no
      });
      var onProg = function (ev) {
        if (!ev || ev.error) return;
        if (ev.done) {
          if (currentTarget()) setRun(r => r ? {
            ...r,
            progress: 1
          } : r);
          if (ownsRun()) lfRunProg(1);
          return;
        }
        if (typeof ev.progress === 'number') {
          if (currentTarget()) setRun(r => r ? {
            ...r,
            stage: ev.stage_name || null,
            progress: ev.progress,
            stageOptions: ev.task ? window.ProseStageCore.taskOptions(ev.task, stageOptions) : stageOptions
          } : r);
          if (ownsRun()) lfRunProg(ev.progress);
        }
      };
      try {
        if (mode === 'regen') {
          await window.LF_PORTAL.runChapterStage(bookId, no, 'writer_group', {
            writerType: writerType,
            payload: intent ? {
              human_intent: intent
            } : {},
            onProgress: onProg
          });
        } else {
          await window.LF_PORTAL.polishChapter(bookId, no, {
            payload: {
              base_version: startVersion
            },
            onProgress: onProg
          });
        }
        if (!currentTarget()) {
          endOwnedRun();
          return;
        }
        const synced = Number(D.prose.version) > startVersion || (await readCurrentProse());
        if (!currentTarget()) return;
        setRun(null);
        endOwnedRun();
        setSyncPending(!synced);
        toast(TC(synced ? mode === 'regen' ? 'wrg_done' : 'wpol_done' : 'prose_result_pending'));
      } catch (e) {
        endOwnedRun();
        if (!currentTarget()) return;
        setRun(null);
        if (e && e.code === 'quote_cancelled') return;
        if (window.LF_ERROR && window.LF_ERROR.isBackendError(e)) window.LF_ERROR(e);else toast(TC(mode === 'polish' ? 'wpol_fail' : 'wre_fail'));
      }
      return;
    }
    /* —— 降级：无引擎时本地 aiRewrite + 逐段替换动画（不白屏）—— */
    setTask({
      mode,
      phase: 'think'
    });
    const text = src.join('\n\n');
    const base = TC('wpol_intent');
    const ins = mode === 'polish' ? intent ? base + (en ? ' Also: ' : '另外：') + intent : base : intent || base;
    let out = null;
    const t0 = Date.now();
    try {
      out = await window.aiRewrite(text, ins, en ? 'chapter prose' : '本章正文');
    } catch (e) {}
    const min = 3600,
      dt = Date.now() - t0; // keep the reasoning readable even if the engine is fast
    if (dt < min) await new Promise(r => setTimeout(r, min - dt));
    if (!out) {
      setTask(null);
      toast(TC(mode === 'polish' ? 'wpol_fail' : 'wre_fail'));
      return;
    }
    let parts = out.split(/\n{1,}/).map(s => s.trim()).filter(Boolean);
    if (!parts.length) parts = [out.trim()];
    setTask({
      mode,
      phase: 'swap'
    });
    setSwap({
      oldP: src,
      newP: parts,
      i: 0,
      total: Math.max(src.length, parts.length)
    });
  };
  /* slow old→new cascade: advance one paragraph at a time, then commit */
  useEffect(() => {
    if (!swap) return;
    if (swap.i >= swap.total) {
      const m = task && task.mode;
      const t = setTimeout(() => {
        setParas(swap.newP);
        setSwap(null);
        setTask(null);
        toast(TC(m === 'regen' ? 'wrg_done' : 'wpol_done'));
      }, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setSwap(s => s ? {
      ...s,
      i: s.i + 1
    } : s), swap.i === 0 ? 300 : 820);
    return () => clearTimeout(t);
  }, [swap]);
  /* follow the cascade: keep the transitioning paragraph in view */
  useEffect(() => {
    if (!swap || !bodyRef.current) return;
    const el = bodyRef.current.querySelector('.pr-slot');
    if (el) bodyRef.current.scrollTo({
      top: Math.max(0, el.offsetTop - bodyRef.current.clientHeight * 0.4),
      behavior: 'smooth'
    });
  }, [swap && swap.i]);
  const renderSwap = () => {
    const {
        oldP,
        newP,
        i,
        total
      } = swap,
      out = [];
    for (let k = 0; k < total; k++) {
      if (k < i) {
        if (newP[k] != null) out.push(/*#__PURE__*/React.createElement("p", {
          key: 'n' + k,
          className: "prose-p pr-done",
          style: {
            fontSize: 17
          }
        }, newP[k]));
      } else if (k === i) {
        out.push(/*#__PURE__*/React.createElement("div", {
          key: 's' + k,
          className: "pr-slot"
        }, oldP[k] != null && /*#__PURE__*/React.createElement("p", {
          className: "prose-p pr-old",
          style: {
            fontSize: 17
          }
        }, oldP[k]), newP[k] != null && /*#__PURE__*/React.createElement("p", {
          className: "prose-p pr-fresh",
          style: {
            fontSize: 17
          }
        }, newP[k])));
      } else {
        if (oldP[k] != null) out.push(/*#__PURE__*/React.createElement("p", {
          key: 'o' + k,
          className: "prose-p pr-wait",
          style: {
            fontSize: 17
          }
        }, oldP[k]));
      }
    }
    return out;
  };
  /* 定稿本章 — 仅已确认保存的正文可运行后验管线，结算完成前不放行下一章 */
  const [settling, setSettling] = useState(false);
  const settlingRef = useRef(false);
  const finishSettling = () => {
    settlingRef.current = false;
    setSettling(false);
  };
  const finalize = async () => {
    if (busy || settlingRef.current) return;
    if (docRef.current || editedRef.current || saveFlightRef.current) {
      toast(TC('prose_finish_edit'));
      return;
    }
    settlingRef.current = true;
    const src = docEdit ? splitDoc(docDraft) : paras;
    setFin(true);
    setSettling(true);
    const bookId = p && p._bookId,
      no = p.no;
    if (window.LF_PORTAL && bookId && String(bookId) === String(_wbId || '')) {
      window.LF_PORTAL.finalizeChapter(bookId, no, {
        onProgress: function (ev) {
          if (ev && ev.done) {
            finishSettling();
          } else if (ev && ev.error) {
            finishSettling();
            if (window.LF_ERROR && window.LF_ERROR.isBackendError(ev.error)) window.LF_ERROR(ev.error);else toast(TC('wpol_fail') || '后验失败');
          }
        }
      }).catch(function (err) {
        finishSettling();
        if (window.LF_ERROR && window.LF_ERROR.isBackendError(err)) window.LF_ERROR(err);
      });
    } else {
      setTimeout(finishSettling, 2400);
    }
  };
  const locked = finalized && !unlocked;
  const openProseRegenerate = () => {
    if (refreshBlocked() || busy) {
      toast(TC('prose_finish_edit'));
      return;
    }
    if (onGenerateProse) onGenerateProse();else setRegen(true);
  };
  const doUnlock = () => {
    var a = lock;
    setLock(null);
    setUnlocked(true);
    unlockedRef.current = true;
    if (a === 'edit') enterDoc();else if (a === 'regen') openProseRegenerate();else if (a === 'polish') setPolishCf(true);
  };
  const bodyTask = () => (window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.tasks || []).find(t => {
    const req = t.request_payload || {},
      engine = req.engine_payload || {};
    const no = t.chapter_number || engine.chapter_number || req.chapter_number || req.chapter;
    if (String(t.book_link_id) !== String(bookId) || !['queued', 'running'].includes(t.status) || Number(no) !== Number(chapterNumber)) return false;
    if (['polish', 'chapter_writer_single', 'chapter_writer_muti', 'chapter_full_single', 'chapter_full_muti'].includes(t.task_type)) return true;
    // Legacy coarse task types still exist. Only writer/full execution mutates
    // body; world, outline and character-state work must not lock prose editing.
    return ['chapter_draft', 'chapter_draft_single'].includes(t.task_type) && ['full', 'writer_group'].includes(req.execution_mode || engine.execution_mode || 'full');
  });
  const visibleTask = bodyTask();
  const canRestoreBody = () => currentTarget() && serverBodyReady && D.prose._bodyLoaded === true && !refreshBlocked() && !stateRef.current.busy && stateRef.current.saveStatus === 'saved' && !bodyTask() && !(D.prose && D.prose.access_error && D.prose.access_error.code);
  const captureBodyRestore = () => {
    if (!canRestoreBody()) return null;
    const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
    const navigationCurrent = guard && guard.captureNavigation ? guard.captureNavigation() : () => true;
    const targetCurrent = window.LF_PORTAL && window.LF_PORTAL.captureChapterTarget ? window.LF_PORTAL.captureChapterTarget(bookId, chapterNumber) : currentTarget;
    const baseVersion = Number(D.prose.version),
      generation = editGenerationRef.current;
    if (!navigationCurrent || !validVersion(baseVersion)) return null;
    return {
      baseVersion,
      isCurrent: () => canRestoreBody() && navigationCurrent() && targetCurrent() && generation === editGenerationRef.current && Number(D.prose.version) === baseVersion
    };
  };
  const drawSelection = window.useProseDrawSelection({
    accountId,
    bookId,
    chapterNumber,
    enabled: !contentBlocked && !!bookId && !!accountId,
    blocked: !!task || !!run || rewriteBusy || !!visibleTask || docEdit || saveStatus !== 'saved' || !!dlg || histOpen === 'body',
    historyOpen: histOpen === 'draw',
    onCloseHistory: () => setHistOpen(false),
    bodyVersion: Number(p.version) || 0,
    onRefreshBody: readCurrentProse,
    initialRoundId: drawRoundId,
    initialRoundRequest: drawRoundRequest
  });
  useEffect(() => {
    setDrawBusy(drawSelection.busy || drawSelection.reading);
  }, [drawSelection.busy, drawSelection.reading]);
  const writingStatus = run ? lfRunLabel(run.mode === 'polish' ? 'polish' : 'regen') : visibleTask ? lfRunLabel(visibleTask.task_type === 'polish' ? 'polish' : 'prose') : TC(finalized ? 'w_finalized' : 'prose_draft_ready');
  const activeVol = (D.volumes || []).find(v => v.state === 'active');
  const volLabel = activeVol ? L(activeVol.no) : '';
  const chLabel = (TC('chap') === 'ch.' ? 'ch.' + p.no : '第 ' + p.no + ' 章') + (L(p.title) ? ' · ' + L(p.title) : '');
  // Phone frame: the same six toolbar actions as labelled page actions (FD-176); ignored on desktop.
  const generationBlocked = contentBlocked || busy || !!visibleTask || docEdit || saveStatus !== 'saved' || engineGenerationBlocked();
  // Read from window: tests extract this component without the module-level aliases.
  const onPhone = !!(window.useMobileChromeState && window.useMobileChromeState());
  (window.useMobileChrome || (() => {}))({
    key: 'writing',
    primary: docEdit ? [{
      key: 'cancel',
      label: TC('ed_cancel'),
      onClick: cancelDoc
    }, {
      key: 'done',
      label: TC('wd_done'),
      tone: 'gold',
      onClick: commitDoc
    }] : [{
      key: 'edit',
      label: TC('wd_edit'),
      disabled: contentBlocked || busy || !!visibleTask || saveStatus === 'saving' || saveStatus === 'conflict',
      onClick: () => enterDoc()
    }, finalized ? {
      key: 'finalized',
      label: TC('w_finalized'),
      disabled: true
    } : {
      key: 'finalize',
      label: TC('w_finalize'),
      tone: 'gold',
      disabled: generationBlocked || settling,
      onClick: finalize
    }],
    more: [{
      key: 'copy',
      label: TC('w_copy'),
      disabled: contentBlocked,
      onClick: copyChapter
    }, {
      key: 'export',
      label: TC('export_book'),
      onClick: () => setExportOpen(true)
    }, {
      key: 'history',
      label: TC('w_history'),
      disabled: contentBlocked,
      onClick: () => setHistOpen('body')
    }, {
      key: 'regen',
      label: TC('w_regen'),
      disabled: generationBlocked,
      onClick: () => locked ? setLock('regen') : openProseRegenerate()
    }, {
      key: 'polish',
      label: TC('w_polish'),
      disabled: generationBlocked,
      onClick: () => locked ? setLock('polish') : setPolishCf(true)
    }]
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "c-write"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-top"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tree-toggle c-ic",
    "aria-label": TC('tree_label'),
    onClick: toggleTree
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "book",
    s: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "c-crumb"
  }, volLabel, volLabel && /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), /*#__PURE__*/React.createElement("b", null, chLabel), /*#__PURE__*/React.createElement("span", {
    className: "c-badge terra",
    style: {
      marginLeft: 4
    }
  }, writingStatus)), /*#__PURE__*/React.createElement("div", {
    className: "write-actions",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    "aria-label": TC('w_copy'),
    onClick: copyChapter,
    title: TC('w_copy'),
    disabled: contentBlocked
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "copy",
    s: 13
  }), /*#__PURE__*/React.createElement("span", {
    className: "write-action-label"
  }, TC('w_copy'))), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    "aria-label": TC('export_book'),
    onClick: () => setExportOpen(true),
    title: TC('export_book')
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "download",
    s: 13
  }), /*#__PURE__*/React.createElement("span", {
    className: "write-action-label"
  }, TC('export_book'))), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    "aria-label": TC('w_history'),
    onClick: () => setHistOpen('body'),
    title: TC('w_history'),
    disabled: contentBlocked
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "clock",
    s: 13
  }), /*#__PURE__*/React.createElement("span", {
    className: "write-action-label"
  }, TC('w_history'))), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    "aria-label": TC('w_regen'),
    title: TC('w_regen'),
    onClick: () => locked ? setLock('regen') : openProseRegenerate(),
    disabled: contentBlocked || busy || !!visibleTask || docEdit || saveStatus !== 'saved' || engineGenerationBlocked(),
    style: locked ? {
      opacity: .5
    } : undefined
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 13
  }), /*#__PURE__*/React.createElement("span", {
    className: "write-action-label"
  }, TC('w_regen'))), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    "aria-label": TC('w_polish'),
    title: TC('w_polish'),
    onClick: () => locked ? setLock('polish') : setPolishCf(true),
    disabled: contentBlocked || busy || !!visibleTask || docEdit || saveStatus !== 'saved' || engineGenerationBlocked(),
    style: locked ? {
      opacity: .5
    } : undefined
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "sparkle",
    s: 14
  }), /*#__PURE__*/React.createElement("span", {
    className: "write-action-label"
  }, TC('w_polish'))), finalized ? /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    "aria-label": TC('w_finalized'),
    title: TC('w_finalized'),
    disabled: true,
    style: {
      color: '#2f9e54',
      borderColor: '#2f9e54'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 13,
    w: 2.2
  }), /*#__PURE__*/React.createElement("span", {
    className: "write-action-label"
  }, TC('w_finalized'))) : /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold sm",
    "aria-label": TC('w_finalize'),
    title: TC('w_finalize'),
    onClick: finalize,
    disabled: contentBlocked || busy || !!visibleTask || docEdit || saveStatus !== 'saved' || settling || engineGenerationBlocked()
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 13,
    w: 2.2
  }), /*#__PURE__*/React.createElement("span", {
    className: "write-action-label"
  }, TC('w_finalize'))))), /*#__PURE__*/React.createElement("div", {
    className: "c-write-stage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-body",
    ref: bodyRef,
    style: {
      overflow: 'auto',
      padding: '34px 40px',
      position: 'relative'
    },
    onMouseUp: onSelect,
    onTouchEnd: onSelect
  }, drawSelection.notice, drawSelection.content, /*#__PURE__*/React.createElement("div", {
    hidden: drawSelection.reading,
    className: 'c-doc' + (task ? ' doc-locked doc-' + task.mode + (task.phase === 'think' ? ' doc-think' : '') : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "dtitle-row"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "dtitle"
  }, en ? 'Ch.' + p.no + (L(p.title) ? '　' + L(p.title) : '') : '第 ' + p.no + ' 章' + (L(p.title) ? '　' + L(p.title) : '')), !docEdit ? /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm wd-toggle",
    onClick: () => enterDoc(),
    disabled: contentBlocked || busy || !!visibleTask || saveStatus === 'saving' || saveStatus === 'conflict',
    style: locked ? {
      opacity: .5
    } : undefined
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "pen",
    s: 13
  }), TC('wd_edit')) : /*#__PURE__*/React.createElement("div", {
    className: "wd-acts"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edt-tip"
  }, TC('wd_tip')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: cancelDoc
  }, TC('ed_cancel')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold sm",
    onClick: commitDoc
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 12,
    w: 2.4
  }), TC('wd_done')))), contentBlocked ? /*#__PURE__*/React.createElement("div", {
    className: 'prose-access-error ' + (accessError.code === 'content_access_hard_restricted' ? 'is-hard' : 'is-soft'),
    role: "alert"
  }, accessError.message) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "dmeta"
  }, volLabel && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, volLabel), /*#__PURE__*/React.createElement("span", null, "\xB7")), /*#__PURE__*/React.createElement("span", {
    className: "c-latin"
  }, p.words, " ", TC('words_unit')), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", {
    role: "status"
  }, TC('prose_save_' + saveStatus))), (saveStatus === 'conflict' || saveStatus === 'error') && /*#__PURE__*/React.createElement("div", {
    className: "prose-access-error",
    role: "alert"
  }, /*#__PURE__*/React.createElement("p", null, TC(saveStatus === 'conflict' ? 'prose_conflict_kept' : 'prose_save_failed_kept')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: () => copyToClipboard(paras.join('\n\n')).then(ok => toast(TC(ok ? 'w_copied' : 'w_copy_fail')))
  }, TC('prose_copy_draft')), saveStatus === 'error' && /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: () => {
      setSaveStatus('dirty');
      setSaveAttempt(n => n + 1);
    }
  }, TC('prose_retry_save')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: () => setReloadConfirm(true)
  }, TC('prose_reload'))), syncPending && /*#__PURE__*/React.createElement("div", {
    role: "status"
  }, /*#__PURE__*/React.createElement("span", null, TC('prose_result_pending')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: readCurrentProse,
    disabled: docEdit || saveStatus !== 'saved'
  }, TC('prose_retry_read'))), !docEdit && /*#__PURE__*/React.createElement("div", {
    className: "sel-hint"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "pen",
    s: 12
  }), TC(onPhone ? 'wp_hint_touch' : 'wp_hint')), docEdit ? /*#__PURE__*/React.createElement("textarea", {
    ref: dtaRef,
    className: "wd-ta",
    value: docDraft,
    onChange: e => {
      editGenerationRef.current += 1;
      setDocDraft(e.target.value);
      setSaveStatus('dirty');
      grow(e.target);
    },
    onKeyDown: e => {
      if (e.key === 'Escape') cancelDoc();
    }
  }) : swap ? renderSwap() : paras.map((para, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    "data-pi": i,
    className: "prose-p",
    style: {
      fontSize: 17,
      '--k': i
    },
    onDoubleClick: e => dblPara(i, e)
  }, renderPara(para, i))))), task && /*#__PURE__*/React.createElement(ProseTaskDock, {
    mode: task.mode,
    phase: task.phase,
    pct: swap ? Math.min(100, Math.round(swap.i / swap.total * 100)) : 0
  }), run && /*#__PURE__*/React.createElement(ProseRunOverlay, {
    mode: run.mode,
    stage: run.stage,
    stageOptions: run.stageOptions,
    progress: run.progress,
    onClose: () => {
      setRun(null);
      if (window.LF_RERENDER) window.LF_RERENDER();
    }
  })), /*#__PURE__*/React.createElement(WorldSide, null)), drawSelection.panels, dlg && /*#__PURE__*/React.createElement(AgentFloat, {
    title: TC('wre_title'),
    label: dlg.kind === 'sent' ? en ? 'sentence · ¶' + (dlg.sPi + 1) : '整句 · 第 ' + (dlg.sPi + 1) + ' 段' : en ? '¶' + (dlg.sPi + 1) + '–' + (dlg.ePi + 1) : '整段 · 第 ' + (dlg.sPi + 1) + '–' + (dlg.ePi + 1) + ' 段',
    snippet: scopeText(dlg),
    chips: TC('wre_chips'),
    startPos: dlg.pos,
    closing: !!dlg.closing,
    onRun: runRewrite,
    onCopy: () => copyScene(dlg),
    onClose: closeDlg
  }), /*#__PURE__*/React.createElement(RegenModal, {
    open: regen,
    chap: p.no,
    title: L(p.title),
    onClose: () => setRegen(false),
    onConfirm: i2 => runTask('regen', i2),
    defaultIntent: "",
    writerType: writerType,
    onToggleWriter: toggleWriterType,
    titleText: TC('wrg_title'),
    subText: TC('wrg_sub'),
    ph: TC('wrg_ph'),
    chips: TC('wrg_chips'),
    notice: TC('run_locknote')
  }), /*#__PURE__*/React.createElement(RegenModal, {
    open: polishCf,
    chap: p.no,
    title: L(p.title),
    noIntent: true,
    onClose: () => setPolishCf(false),
    onConfirm: () => runTask('polish', ''),
    titleText: TC('wpol_title'),
    subText: TC('wpol_sub'),
    notice: TC('run_locknote'),
    confirmText: TC('wpol_go'),
    icon: "sparkle"
  }), histOpen && /*#__PURE__*/React.createElement(BodyHistory, {
    bookId: _wbId,
    no: p.no,
    currentText: docEdit ? docDraft : paras.join('\n\n'),
    canRestore: canRestoreBody(),
    captureRestore: captureBodyRestore,
    toast: toast,
    historyMode: histOpen,
    onHistoryModeChange: setHistOpen,
    drawHistory: drawSelection.historyContent,
    drawBusy: drawSelection.busy,
    onClose: () => setHistOpen(false),
    onRestored: () => {
      if (!currentTarget() || refreshBlocked() || stateRef.current.busy || stateRef.current.saveStatus !== 'saved') return;
      // restoreBodyRevision already saved + reloaded the snapshot; re-seed the
      // editor from the fresh server prose (server is source of truth).
      var fresh = D.prose && Array.isArray(D.prose.paras) && D.prose.paras.length ? D.prose.paras.map(function (x) {
        return x[lang] || x.zh;
      }) : paras;
      baseVersionRef.current = Number(D.prose.version) || 0;
      editedRef.current = false;
      try {
        localStorage.removeItem(proseKey);
        if (seed.legacy) localStorage.removeItem(legacyProseKey);
      } catch (e) {}
      setParas(fresh);
      setHistOpen(false);
      toast(TC('wh_restored'));
    }
  }), /*#__PURE__*/React.createElement(ConfirmDialog, {
    open: reloadConfirm,
    title: TC('prose_reload'),
    message: TC('prose_discard_confirm'),
    cancelLabel: TC('ed_cancel'),
    confirmLabel: TC('prose_reload'),
    onClose: () => setReloadConfirm(false),
    onConfirm: reloadProse
  }), exportOpen && /*#__PURE__*/React.createElement(BookExportModal, {
    book: D.book,
    currentChapter: p.no,
    defaultScope: "current",
    onClose: () => setExportOpen(false),
    toast: toast
  }), lock && /*#__PURE__*/React.createElement("div", {
    className: "rg-scrim",
    onClick: () => setLock(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rg-ad"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-t"
  }, TC('lock_title')), /*#__PURE__*/React.createElement("div", {
    className: "rg-c"
  }, chLabel)), /*#__PURE__*/React.createElement("button", {
    className: "edt-x",
    onClick: () => setLock(null)
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "rg-sub"
  }, TC('lock_sub')), /*#__PURE__*/React.createElement("div", {
    className: "rg-acts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn",
    onClick: () => setLock(null)
  }, TC('lock_cancel')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold",
    onClick: doUnlock
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "pen",
    s: 13
  }), TC('lock_open'))))), fin && /*#__PURE__*/React.createElement(FinalizeOverlay, {
    chap: p.no,
    title: L(p.title),
    words: p.words,
    vol: volLabel,
    nextNo: p.no + 1,
    settling: settling,
    onStay: () => {
      setFin(false);
      setSettling(false);
      toast(TC('toast_final').replace('{n}', p.no));
    },
    onNext: () => {
      setFin(false);
      setSettling(false);
      toast(TC('toast_final').replace('{n}', p.no));
      goNextOutline && goNextOutline();
    }
  }));
}

/* ---------- book view ---------- */
function BookView({
  state,
  set,
  ctl,
  toast
}) {
  const {
    section,
    tab,
    chap,
    vopen,
    generated,
    running,
    revOpen,
    treeOpen,
    detail,
    regenOpen,
    wbMode,
    treeVersion,
    proseRun
  } = state;
  const en = window.CLANG === 'en';
  const LV_ORDER = ['vol', 'brief', 'detail'];
  const prevTabRef = useRef(tab);
  const [runProg, setRunProg] = useState(null); // {progress,stage} from engine onEvent for RunSteps
  const [writerType, setWriterType] = useState(() => {
    try {
      return localStorage.getItem('lf_writer_type') || 'single';
    } catch (e) {
      return 'single';
    }
  });
  const toggleWriterType = () => {
    const n = writerType === 'muti' ? 'single' : 'muti';
    setWriterType(n);
    try {
      localStorage.setItem('lf_writer_type', n);
    } catch (e) {}
  };
  const drawAccountId = window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id;
  const drawSettings = window.useProseDrawSettings({
    accountId: drawAccountId,
    bookId: D.book && D.book.id
  });
  const proseDrawEnabled = drawSettings.enabled;
  const changeProseDraw = enabled => drawSettings.change(enabled);
  const proseModeRef = useRef(null);
  proseModeRef.current = {
    writerType,
    drawSettings
  };
  const outlineDoneRef = useRef(false); // task success only; guide synchronization may finish later
  const outlineRunRef = useRef(null); // immutable {bookId,chapterNumber} for the active outline task
  const outlineStartRef = useRef(false);
  const outlineSubmitKeyRef = useRef(null);
  const proseRunRef = useRef(proseRun || null);
  const proseStartRef = useRef(false);
  const [proseConfirm, setProseConfirm] = useState(null);
  const [proseConfirmBusy, setProseConfirmBusy] = useState(false);
  useEffect(() => {
    setProseConfirm(null);
    setProseConfirmBusy(false);
  }, [drawAccountId, D.book && D.book.id, chap]);
  const openWorldReview = () => {
    const bookId = D.book && D.book.id;
    if (!bookId) return;
    const saved = window.LF_PORTAL && window.LF_PORTAL.premiseFromBook ? window.LF_PORTAL.premiseFromBook(bookId) : null;
    set({
      view: 'create',
      createResume: {
        step: 1,
        bookId,
        saved,
        returnSection: 'world'
      }
    });
  };
  const selectedVolume = () => {
    // The phone volume page can show a volume that has no chapters yet.
    const viewed = state.mVol != null && (D.volumes || []).find(item => Number(item.vnum) === Number(state.mVol));
    if (viewed) return viewed;
    const chapter = (D.chapters || []).find(item => Number(item.no) === Number(chap));
    const volumeNumber = chapter && Number(chapter.vol);
    return (D.volumes || []).find(item => Number(item.vnum) === volumeNumber) || (D.volumes || []).find(item => item.state === 'active') || (D.volumes || [])[0] || null;
  };
  // A volume picked on the phone volume page that has no chapters: show its own outline, or that it has none yet.
  const viewedRow = state.mVol != null && window.LF_PORTAL && window.LF_PORTAL.volumeOutlineRow ? window.LF_PORTAL.volumeOutlineRow(state.mVol) || {
    volume: null,
    nearTerm: null
  } : null;
  const openOutlineReview = () => {
    const bookId = D.book && D.book.id;
    const volume = selectedVolume();
    if (!bookId || !volume || !volume.vnum) return;
    const saved = window.LF_PORTAL && window.LF_PORTAL.premiseFromBook ? window.LF_PORTAL.premiseFromBook(bookId) : null;
    set({
      view: 'create',
      createResume: {
        step: 4,
        bookId,
        saved,
        returnSection: 'workbench',
        volumeNumber: Number(volume.vnum)
      }
    });
  };
  useEffect(() => {
    proseRunRef.current = state.proseRun || null;
  }, [state.proseRun]);
  // Inbox unread badge (公告 + 站内信), shared with the phone tab bar.
  const unread = lfUseInboxUnread();
  const detSaveTimer = useRef(null); // 细纲退出即防抖自动保存 — 待定的保存定时器
  const detLatest = useRef(null); // 最近一次编辑后的完整 detail，供防抖/冲刷取用
  const guideDirtyRef = useRef(state.dirty);
  const guideSavingRef = useRef(state.detSaving);
  guideDirtyRef.current = state.dirty;
  guideSavingRef.current = state.detSaving;
  const hasGuideDraft = !!(state.dirty && Object.keys(state.dirty).length);
  useEffect(() => {
    const Cite = window.AssistantCiteCore;
    const bookId = D.book && D.book.id;
    if (!Cite || !bookId || !hasGuideDraft && !state.detSaving) return undefined;
    const key = Cite.chapterGuideKey(chap);
    return key ? Cite.editGuard.acquire({
      book_id: bookId,
      resource_type: 'chapter',
      resource_key: key
    }) : undefined;
  }, [hasGuideDraft, state.detSaving, chap, D.book && D.book.id]);
  const [outlineSync, setOutlineSync] = useState(null);
  const guideReadRef = useRef(false);
  const guideRetryRef = useRef(null);
  const guideReleaseReadRef = useRef(null);
  const guideRecoveryRef = useRef(null);
  const outlineStateRef = useRef(state);
  outlineStateRef.current = state;
  const GuideState = window.ChapterGuideStateCore;
  const guideBookId = D.book && D.book.id;
  const guideSync = window.LF_PORTAL && window.LF_PORTAL.chapterGuideSyncState(guideBookId, chap) || outlineSync;
  const guideTasks = GuideState.taskState((window.LF_PORTAL_STATE || {}).tasks, guideBookId, chap, (window.LF_PORTAL_STATE || {}).tasksKnown);
  const guideReadable = detail && detail._syncStatus === 'ready' && String(detail._bookId || '') === String(guideBookId || '') && Number(detail.no) === Number(chap) && (generated.has(chap) || chapterHasGuide((D.chapters || []).find(c => Number(c.no) === Number(chap))));
  const guideView = GuideState.project({
    sync: guideSync,
    taskState: guideTasks,
    readable: guideReadable,
    localRunning: !!(running && running.type === 'outline' && outlineRunRef.current && String(outlineRunRef.current.bookId) === String(guideBookId) && Number(outlineRunRef.current.chapterNumber) === Number(chap))
  });
  useEffect(() => {
    const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
    return guard && guard.registerNavigationBlocker ? guard.registerNavigationBlocker(() => !!guideSavingRef.current || Object.keys(guideDirtyRef.current || {}).length > 0) : undefined;
  }, [chap, D.book && D.book.id]);
  const retryGuideRead = async options => {
    const bookId = D.book && D.book.id;
    const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
    const captured = guard && (guard.captureRefresh || guard.captureNavigation).call(guard);
    if (!bookId || !chap) return;
    if (guideReadRef.current || guideSavingRef.current || Object.keys(guideDirtyRef.current || {}).length || guard && !captured) {
      guideReleaseReadRef.current = {
        bookId,
        chap,
        force: !!(options && options.force)
      };
      return;
    }
    const isCurrent = () => String(D.book && D.book.id) === String(bookId) && Number(outlineStateRef.current.chap) === Number(chap) && (!guard || captured && captured());
    guideReadRef.current = true;
    try {
      if (Number(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.selectedChapter) !== Number(chap)) {
        const applied = await window.LF_PORTAL.selectChapter(chap, {
          isCurrent
        });
        if (applied === false || !isCurrent()) return;
      }
      const sync = window.LF_PORTAL.chapterGuideSyncState(bookId, chap);
      if (sync.reading) {
        if (options && options.force) guideReleaseReadRef.current = {
          bookId,
          chap,
          force: true
        };
        return;
      }
      const tasksNow = window.LF_PORTAL_STATE || {};
      const taskState = window.ChapterGuideStateCore.taskState(tasksNow.tasks, bookId, chap, tasksNow.tasksKnown);
      if (sync.status === 'ready' && !(options && options.force) && !taskState.unknown && !taskState.waiting) {
        set(s => adoptOutlineSnapshot(s, bookId, chap));
        return;
      }
      if (document.hidden) {
        guideReleaseReadRef.current = {
          bookId,
          chap,
          force: !!(options && options.force)
        };
        return;
      }
      const result = await window.LF_PORTAL.refreshChapterGuide(bookId, chap);
      if (result && result.metadataSkipped) guideReleaseReadRef.current = {
        bookId,
        chap,
        force: true
      };
      const pending = guideReleaseReadRef.current;
      const snapshot = window.LF_PORTAL_STATE || {};
      if (result && result.guideTaskKey && String(D.book && D.book.id) === String(bookId) && Number(outlineStateRef.current.chap) === Number(chap) && window.ChapterGuideStateCore.taskState(snapshot.tasks, bookId, chap, snapshot.tasksKnown).key === result.guideTaskKey) {
        guideRecoveryRef.current = {
          target: String(bookId) + ':' + Number(chap),
          taskKey: result.guideTaskKey
        };
        if (pending && pending.force && String(pending.bookId) === String(bookId) && Number(pending.chap) === Number(chap)) guideReleaseReadRef.current = null;
      }
    } finally {
      guideReadRef.current = false;
      const released = guideReleaseReadRef.current;
      const current = outlineStateRef.current;
      if (!document.hidden) guideReleaseReadRef.current = null;
      if (!document.hidden && released && String(released.bookId) === String(D.book && D.book.id) && Number(released.chap) === Number(current.chap) && current.section === 'workbench' && current.tab === 'detail') {
        const sync = window.LF_PORTAL.chapterGuideSyncState(released.bookId, released.chap);
        if (sync.reading) guideReleaseReadRef.current = released;else if (released.force || ['pending', 'skipped'].includes(sync.status) || Number(chap) !== Number(current.chap)) {
          if (guideRetryRef.current) guideRetryRef.current({
            force: released.force
          }).catch(() => {});
        }
      }
    }
  };
  guideRetryRef.current = retryGuideRead;
  useEffect(() => {
    const bookId = D.book && D.book.id;
    const update = event => {
      const sync = event && event.detail;
      if (!sync || String(sync.bookId) !== String(bookId) || Number(sync.chapterNumber) !== Number(chap)) return;
      setOutlineSync(sync);
      if (sync.status === 'ready') set(s => adoptOutlineSnapshot(s, bookId, chap));
      const pending = guideReleaseReadRef.current;
      if (!sync.reading && !guideReadRef.current && pending && String(pending.bookId) === String(bookId) && Number(pending.chap) === Number(chap)) {
        guideReleaseReadRef.current = null;
        retryGuideRead({
          force: pending.force
        }).catch(() => {});
      }
    };
    window.addEventListener('lf:chapter-guide-sync', update);
    if (bookId && chap && window.LF_PORTAL) {
      update({
        detail: window.LF_PORTAL.chapterGuideSyncState(bookId, chap)
      });
    }
    return () => window.removeEventListener('lf:chapter-guide-sync', update);
  }, [chap, D.book && D.book.id]);
  useEffect(() => {
    if (section !== 'workbench' || tab !== 'detail' || !chap || hasGuideDraft || state.detSaving) return undefined;
    const target = String(D.book && D.book.id) + ':' + Number(chap);
    const previous = guideRecoveryRef.current;
    const taskChanged = !!(previous && previous.target === target && previous.taskKey !== guideView.taskKey);
    guideRecoveryRef.current = {
      target,
      taskKey: guideView.taskKey
    };
    const sync = window.LF_PORTAL && window.LF_PORTAL.chapterGuideSyncState(D.book && D.book.id, chap);
    const aligned = Number(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.selectedChapter) === Number(chap);
    if (!sync || aligned && !taskChanged && !guideView.shouldRead) return undefined;
    // One read per target, task outcome change or draft/save release. Empty or
    // failed reads settle until a real task update or an explicit user retry.
    retryGuideRead({
      force: taskChanged
    }).catch(() => {});
    return undefined;
  }, [section, tab, chap, D.book && D.book.id, hasGuideDraft, state.detSaving, guideView.taskKey]);
  useEffect(() => {
    const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
    if (!guard || !guard.subscribeRelease) return undefined;
    const bookId = D.book && D.book.id;
    let alive = true;
    const recover = () => Promise.resolve().then(() => {
      const current = outlineStateRef.current;
      if (!alive || String(D.book && D.book.id) !== String(bookId) || Number(current.chap) !== Number(chap) || current.section !== 'workbench' || current.tab !== 'detail' || document.hidden) return;
      if (guideReadRef.current) {
        guideReleaseReadRef.current = guideReleaseReadRef.current || {
          bookId,
          chap
        };
        return;
      }
      const sync = window.LF_PORTAL.chapterGuideSyncState(bookId, chap);
      const pending = guideReleaseReadRef.current;
      if (pending && String(pending.bookId) === String(bookId) && Number(pending.chap) === Number(chap)) {
        guideReleaseReadRef.current = null;
        retryGuideRead({
          force: pending.force
        }).catch(() => {});
      } else if (['pending', 'skipped'].includes(sync.status)) retryGuideRead().catch(() => {});
    });
    const unsubscribe = guard.subscribeRelease(recover);
    document.addEventListener('visibilitychange', recover);
    return () => {
      alive = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', recover);
    };
  }, [chap, D.book && D.book.id]);
  const lvDir = LV_ORDER.indexOf(tab) >= LV_ORDER.indexOf(prevTabRef.current) ? 'in' : 'out';
  useEffect(() => {
    prevTabRef.current = tab;
  }, [tab]);
  useEffect(() => {
    const cite = window.LF_ASSISTANT_CITE;
    const Cite = window.AssistantCiteCore;
    const bookId = D.book && D.book.id;
    if (!cite) return undefined;
    if (section !== 'workbench' || wbMode !== 'edit' || !bookId) {
      cite.clear({
        owner: 'workbench-page'
      });
      return () => cite.clear({
        owner: 'workbench-page'
      });
    }
    if (tab === 'detail') {
      const key = Cite && Cite.chapterGuideKey ? Cite.chapterGuideKey(chap) : '';
      if (key) cite.setObject({
        bookId,
        owner: 'workbench-page',
        resource_type: 'chapter',
        resource_key: key
      });else cite.clear({
        owner: 'workbench-page'
      });
    } else if (tab === 'vol' || tab === 'brief') {
      const volume = selectedVolume();
      const volumeNumber = volume && Number(volume.vnum);
      const kind = tab === 'brief' ? 'near_term' : 'volume';
      if (volumeNumber) cite.setObject({
        bookId,
        owner: 'workbench-page',
        resource_type: 'outline',
        resource_key: kind + ':' + volumeNumber
      });else cite.clear({
        owner: 'workbench-page'
      });
    } else {
      cite.clear({
        owner: 'workbench-page'
      });
    }
    return () => cite.clear({
      owner: 'workbench-page'
    });
  }, [section, wbMode, tab, chap, D.book && D.book.id]);
  useEffect(() => {
    const onUpdated = event => {
      const Cite = window.AssistantCiteCore;
      const detail = event && event.detail;
      if (!Cite || !detail || detail.resource_type !== 'chapter') return;
      const parsed = Cite.parseChapterGuideKey ? Cite.parseChapterGuideKey(detail.resource_key) : null;
      const bookId = D.book && D.book.id;
      if (!parsed || String(detail.bookId || '') !== String(bookId || '') || Number(parsed.chapter) !== Number(chap)) return;
      const dirty = guideDirtyRef.current && Object.keys(guideDirtyRef.current).length > 0;
      const canApply = Cite.mayApplyResourceRefresh ? Cite.mayApplyResourceRefresh({
        book_id: bookId,
        resource_type: 'chapter',
        resource_key: detail.resource_key
      }, {
        saving: !!guideSavingRef.current,
        hasDraft: !!dirty,
        guard: Cite.editGuard
      }) : () => true;
      if (!canApply) return;
      if (!D.detail || Number(D.detail.no) !== Number(parsed.chapter) || !canApply()) return;
      set(s => adoptOutlineSnapshot(s, bookId, parsed.chapter));
    };
    window.addEventListener('lf:assistant-resource-updated', onUpdated);
    return () => window.removeEventListener('lf:assistant-resource-updated', onUpdated);
  }, [chap, D.book && D.book.id, set]);
  /* deep-link mounts before the snapshot arrives → chap can be 0; adopt the
     first real chapter once the bridge fills D.chapters */
  useEffect(() => {
    if (!chap && D.chapters && D.chapters.length) set({
      chap: D.chapters[0].no
    });
  });
  const chTitle = () => {
    const c = D.chapters.find(x => x.no === chap);
    return c ? c.title.zh === '—' ? en ? 'ch.' + chap : '第' + chap + '章' : L(c.title) : '';
  };
  const chapterNavigationRef = useRef(0);
  const bookNavigationStateRef = useRef(state);
  bookNavigationStateRef.current = state;
  const captureBookNavigation = () => {
    const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
    const capture = guard && (state.section === 'writing' && guard.captureRefresh ? guard.captureRefresh : guard.captureNavigation);
    const captured = capture ? capture.call(guard) : () => true;
    const epoch = ++chapterNavigationRef.current;
    return () => !!captured && captured() && epoch === chapterNavigationRef.current && !bookNavigationStateRef.current.detSaving && !Object.keys(bookNavigationStateRef.current.dirty || {}).length;
  };
  const pickChap = async (no, opts) => {
    const isCurrent = captureBookNavigation();
    if (!isCurrent()) {
      toast(TC('asst_navigation_draft'));
      return;
    }
    var fromTree = opts && opts.fromTree;
    if (state.section === 'writing') {
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      const capture = guard && (guard.captureRefresh || guard.captureNavigation);
      if (capture && !capture.call(guard)) {
        toast(TC('prose_finish_edit'));
        return;
      }
    }
    // 正文目录中的未成文章节必须在本地拦截，不能先触发正文/世界状态/细纲读取。
    if (fromTree && state.section === 'writing') {
      var targetChapter = D.chapters.find(function (x) {
        return x.no === no;
      });
      if (!targetChapter || targetChapter.body_readable !== true) {
        if (window.LF_CREATION_ANALYTICS) {
          window.LF_CREATION_ANALYTICS.intent('chapter_directory');
          window.LF_CREATION_ANALYTICS.blocked('chapter_directory', 'gate_no_prose');
        }
        toast(TC('gate_no_prose'));
        return;
      }
    }
    // 切章一律全量加载：细纲、世界状态机、账本（伏笔/债务）都随章节动态刷新。
    var chapterApplied = true;
    if (window.LF_PORTAL && D.book && D.book.id) {
      try {
        chapterApplied = await window.LF_PORTAL.selectChapter(no, {
          isCurrent
        });
      } catch (e) {
        chapterApplied = false;
        toast(e.message || TC('book_open_fail'));
      }
    }
    // A newer book/chapter click superseded this request. Do not let the older
    // awaiting handler commit its stale chapter number into React state.
    if (chapterApplied === false || !isCurrent()) return;
    var bookId = String(D.book && D.book.id || '');
    var curDetail = window.LF_PORTAL.chapterDetailSnapshot(bookId, no);
    // 在正文页通过目录树切章 → 不跳细纲，直接加载该章正文（WriteView 以 chap 为 key 重挂载刷新）。
    if (fromTree && state.section === 'writing') {
      set({
        chap: no,
        treeOpen: false,
        detail: curDetail
      });
      if (window.LF_RERENDER) window.LF_RERENDER();
      return;
    }
    set({
      chap: no,
      section: 'workbench',
      tab: 'detail',
      treeOpen: false,
      detail: curDetail
    });
  };
  const openInboxTask = async action => {
    if (!action || !action.bookId || !window.LF_PORTAL) return;
    const isCurrent = captureBookNavigation();
    if (!isCurrent()) {
      toast(TC('asst_navigation_draft'));
      return;
    }
    if (window.LFOverlay) window.LFOverlay.show();
    try {
      var currentBookId = D.book && D.book.id;
      if (String(currentBookId || '') !== String(action.bookId)) {
        var bookApplied = await window.LF_PORTAL.selectBook(action.bookId, {
          shouldApply: isCurrent
        });
        if (bookApplied === false || !isCurrent()) throw new Error('book switch superseded');
      }
      if (action.chapterNumber) {
        var chapterApplied = await window.LF_PORTAL.selectChapter(action.chapterNumber, {
          isCurrent
        });
        if (chapterApplied === false || !isCurrent()) throw new Error('chapter switch superseded');
      }
      if (!isCurrent() || String(D.book && D.book.id || '') !== String(action.bookId)) return;
      let targetChapter = Number(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.selectedChapter) || 0;
      // Book-wide notices may have no chapter yet. Adopt a planned chapter via
      // the bridge before committing it, or preserve the genuine zero selection.
      if (!targetChapter && D.chapters && D.chapters.length) {
        targetChapter = Number(D.chapters[0].no);
        const applied = await window.LF_PORTAL.selectChapter(targetChapter, {
          isCurrent
        });
        if (applied === false || !isCurrent()) throw new Error('chapter switch superseded');
      }
      if (action.target === 'writing') {
        set({
          section: 'writing',
          chap: targetChapter,
          treeOpen: false,
          running: null,
          drawSelectionTarget: action.roundId ? {
            bookId: action.bookId,
            chapterNumber: targetChapter,
            roundId: action.roundId
          } : null
        });
      } else if (action.target === 'detail') {
        var taskDetail = window.LF_PORTAL.chapterDetailSnapshot(action.bookId, action.chapterNumber);
        set({
          section: 'workbench',
          tab: 'detail',
          chap: action.chapterNumber,
          treeOpen: false,
          detail: taskDetail
        });
      } else if (action.target === 'outline') {
        set({
          section: 'workbench',
          tab: 'vol',
          chap: targetChapter,
          treeOpen: false
        });
      } else {
        set({
          section: 'world',
          chap: targetChapter,
          treeOpen: false
        });
      }
      return true;
    } catch (error) {
      toast(en ? 'Unable to open this result. Please try again.' : '暂时无法打开该任务结果，请重试。');
    } finally {
      if (window.LFOverlay) window.LFOverlay.hide();
    }
  };
  /* 细纲自动保存：把最近编辑的 detail 折回章纲 JSON，PUT /chapters/{n}/guide。
     成功后清掉 dirty 标记（小圆点消失=已落盘）；失败保留 dirty 并提示。 */
  const saveDetailNow = () => {
    if (detSaveTimer.current) {
      clearTimeout(detSaveTimer.current);
      detSaveTimer.current = null;
    }
    var detail = detLatest.current,
      bookId = detail && detail._bookId,
      detailChapter = detail && Number(detail.no);
    var currentBookId = D.book && D.book.id;
    if (!detail || !bookId || String(bookId) !== String(currentBookId || '') || detailChapter !== Number(chap)) return Promise.resolve(false);
    if (!window.LF_PORTAL || !window.LF_PORTAL.saveChapterDetail) return Promise.resolve(false);
    set({
      detSaving: true,
      detSaveErr: null
    });
    return window.LF_PORTAL.saveChapterDetail(bookId, detailChapter, detail, {
      base_version: detail._resourceVersion
    }).then(function (result) {
      var version = result && result.version != null ? Number(result.version) : detail._resourceVersion;
      detLatest.current = Object.assign({}, detLatest.current || detail, {
        _resourceVersion: version
      });
      set(function (s) {
        return {
          detSaving: false,
          dirty: {},
          detail: Object.assign({}, s.detail, {
            _resourceVersion: version
          })
        };
      });
    }).catch(function (e) {
      if (e && e.status === 409 && D.detail) {
        var refreshed = JSON.parse(JSON.stringify(D.detail));
        detLatest.current = refreshed;
        set({
          detSaving: false,
          detSaveErr: e && e.message || String(e),
          detail: refreshed,
          dirty: {}
        });
        return;
      }
      set({
        detSaving: false,
        detSaveErr: e && e.message || String(e)
      });
    });
  };
  /* 编辑一个字段 → 更新草稿 + 标记 dirty，并安排 700ms 防抖自动保存。EditBlock
     在退出编辑（点击别处/Enter/保存）时提交，故等价于「退出即防抖自动保存」。 */
  const editDetail = (path, val, options) => {
    const opts = options || {};
    const detail = opts.replace ? Object.assign({}, val, {
      _bookId: state.detail && state.detail._bookId,
      no: state.detail && state.detail.no,
      _syncStatus: state.detail && state.detail._syncStatus
    }) : window.setIn(state.detail, path, leaf => leaf && typeof leaf === 'object' && 'zh' in leaf ? {
      ...leaf,
      [ctl.lang]: val
    } : val);
    if (String(detail && detail._bookId || '') !== String(D.book && D.book.id || '') || Number(detail && detail.no) !== Number(chap)) return;
    if (opts.version != null) detail._resourceVersion = Number(opts.version);
    detLatest.current = detail;
    set(s => ({
      detail,
      dirty: opts.persist === false ? s.dirty : {
        ...s.dirty,
        [path.join('.')]: true
      }
    }));
    if (opts.persist === false) return;
    if (detSaveTimer.current) clearTimeout(detSaveTimer.current);
    detSaveTimer.current = setTimeout(saveDetailNow, 700);
  };
  const updateProseRunState = (patch, operationId) => {
    var current = proseRunRef.current;
    if (operationId && (!current || current.operationId !== operationId)) return null;
    var next = Object.assign({}, current || {}, patch || {});
    proseRunRef.current = next;
    set({
      proseRun: next
    });
    return next;
  };
  const showProseRun = async () => {
    var record = proseRunRef.current;
    if (record && record.draw) {
      if (String(record.accountId) !== String(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id)) return;
      if (String(record.bookId) !== String(D.book && D.book.id) || Number(record.chapterNumber) !== Number(chap)) {
        if (!(await openInboxTask({
          bookId: record.bookId,
          chapterNumber: record.chapterNumber,
          target: 'detail'
        }))) return;
      }
    }
    set({
      view: 'book',
      section: 'workbench',
      chap: record && record.chapterNumber ? record.chapterNumber : chap,
      running: {
        type: 'prose'
      }
    });
  };
  const proseBodyVisible = no => {
    var prose = D.prose || {};
    var paras = Array.isArray(prose.paras) ? prose.paras : [];
    return Number(prose.no) === Number(no) && paras.some(function (para) {
      var value = para && typeof para === 'object' ? para.zh || para.en || '' : para;
      return String(value || '').trim().length > 0;
    });
  };
  const syncProseRunDock = record => {
    if (!record) return;
    if (record.draw) {
      var drawView = window.ProseDrawProgressCore.project(record.draw, window.CLANG, record.chapterNumber);
      lfRunUpdate({
        status: drawView.dockStatus,
        bookId: record.bookId,
        chapterNumber: record.chapterNumber,
        label: lfRunLabel('prose'),
        draw: record.draw,
        actionLabel: drawView.dockLabel,
        onAction: showProseRun
      });
      return;
    }
    var action = showProseRun;
    var actionLabel = TC('run_write_running');
    var label = TC('run_write_running');
    if (record.status === 'completed') {
      action = function () {
        openProseResult(record.operationId);
      };
      actionLabel = TC('prose_view');
      label = TC('prose_done_title').replace('{n}', record.chapterNumber);
    } else if (record.status === 'read_failed') {
      action = function () {
        retryProseRead(record.operationId);
      };
      actionLabel = TC('prose_retry_read');
      label = TC('prose_read_failed_title');
    } else if (record.status === 'verifying') {
      actionLabel = TC('run_write_verifying');
      label = TC('run_write_verifying');
    }
    lfRunUpdate({
      status: record.status,
      bookId: record.bookId,
      chapterNumber: record.chapterNumber,
      label: label,
      actionLabel: actionLabel,
      onAction: action
    });
  };
  const updateProseDrawState = (record, patch) => {
    var current = proseRunRef.current;
    if (!record || !current || current.operationId !== record.operationId || !current.draw || !record.draw || String(current.bookId) !== String(record.bookId) || current.chapterNumber !== record.chapterNumber || !current.draw.round || !record.draw.round || current.draw.round.round_id !== record.draw.round.round_id) return;
    if (patch.round && (patch.round.round_id !== current.draw.round.round_id || Number(patch.round.chapter_number) !== Number(record.chapterNumber))) return;
    var next = updateProseRunState({
      draw: Object.assign({}, current.draw, patch)
    }, record.operationId);
    syncProseRunDock(next);
  };
  const beginProseRun = (bookId, chapterNumber, taskId, stageOptions) => {
    var record = {
      operationId: 'prose_' + Date.now() + '_' + Math.random().toString(16).slice(2),
      bookId: bookId,
      chapterNumber: Number(chapterNumber),
      taskId: taskId || null,
      stageOptions: stageOptions,
      status: 'running'
    };
    proseRunRef.current = record;
    set({
      proseRun: record,
      running: {
        type: 'prose'
      }
    });
    setRunProg(null);
    lfRunStart('prose', {
      bookId: bookId,
      chapterNumber: Number(chapterNumber),
      status: 'running',
      label: TC('run_write_running'),
      actionLabel: TC('run_write_running'),
      onAction: showProseRun
    });
    return record;
  };
  const finishProseRead = async record => {
    var verifying = updateProseRunState({
      status: 'verifying'
    }, record.operationId);
    if (!verifying) return;
    syncProseRunDock(verifying);
    var result = await window.LF_PORTAL.verifyChapterBody(record.bookId, record.chapterNumber);
    if (!proseRunRef.current || proseRunRef.current.operationId !== record.operationId) return;
    if (result && result.verified) {
      var completed = updateProseRunState({
        status: 'completed',
        chapter: result.chapter
      }, record.operationId);
      set(function (s) {
        var currentBookId = D.book && D.book.id;
        var targetVisible = String(currentBookId || '') === String(record.bookId || '') && Number(s.chap) === Number(record.chapterNumber);
        return {
          generated: targetVisible ? new Set([...(s.generated || []), record.chapterNumber]) : s.generated,
          dirty: targetVisible ? {} : s.dirty,
          proseRun: completed
        };
      });
      window.LF_RUN_PROGRESS = 1;
      syncProseRunDock(completed);
      try {
        localStorage.removeItem('lf_wb_' + record.bookId + '_' + record.chapterNumber);
      } catch (e) {}
      return;
    }
    var failed = updateProseRunState({
      status: 'read_failed'
    }, record.operationId);
    syncProseRunDock(failed);
  };
  const openProseResult = async operationId => {
    var record = proseRunRef.current;
    if (!record || record.operationId !== operationId) return;
    if (record.draw) {
      showProseRun();
      return;
    }
    if (window.LFOverlay) window.LFOverlay.show();
    try {
      var loaded = await window.LF_PORTAL.refreshChapter(record.bookId, record.chapterNumber);
      if (loaded === false || !proseBodyVisible(record.chapterNumber)) throw new Error('Generated chapter body could not be loaded');
      proseRunRef.current = null;
      set({
        view: 'book',
        section: 'writing',
        chap: record.chapterNumber,
        running: null,
        proseRun: null,
        dirty: {}
      });
      lfRunEnd();
    } catch (error) {
      var failed = updateProseRunState({
        status: 'read_failed'
      }, operationId);
      syncProseRunDock(failed);
      set({
        running: {
          type: 'prose'
        }
      });
    } finally {
      if (window.LFOverlay) window.LFOverlay.hide();
    }
  };
  const retryProseRead = async operationId => {
    var record = proseRunRef.current;
    if (!record || record.operationId !== operationId) return;
    if (record.draw) {
      showProseRun();
      if (record.onDrawRefresh) await record.onDrawRefresh();
      return;
    }
    set({
      running: {
        type: 'prose'
      }
    });
    await finishProseRead(record);
  };
  const failProseRun = (record, error) => {
    if (!record || !proseRunRef.current || proseRunRef.current.operationId !== record.operationId) return;
    proseRunRef.current = null;
    set({
      running: null,
      proseRun: null
    });
    setRunProg(null);
    lfRunEnd();
    if (error && error.code === 'quote_cancelled') return;
    if (window.LF_ERROR && window.LF_ERROR.isBackendError(error)) window.LF_ERROR(error);else toast(TC('rg_fail') || 'Generation failed');
  };
  const trackProseProgress = ev => {
    if (ev && typeof ev.progress === 'number') {
      var record = proseRunRef.current;
      var options = ev.task ? window.ProseStageCore.taskOptions(ev.task, record && record.stageOptions) : record && record.stageOptions;
      setRunProg({
        progress: ev.progress,
        stage: ev.stage_name || null,
        stageOptions: options
      });
      lfRunProg(ev.progress);
    }
  };
  const attachProseTask = async task => {
    var no = window.LF_PORTAL && window.LF_PORTAL.chapterTaskNumber ? window.LF_PORTAL.chapterTaskNumber(task) : Number(task && task.chapter_number);
    if (!Number.isInteger(Number(no)) || Number(no) < 1) {
      toast(en ? 'The running task has no valid chapter target. Generation was blocked.' : '检测到运行任务的章节信息不一致，已阻止生成，请刷新后重试。');
      return;
    }
    var record = beginProseRun(task.book_link_id, no, task.id, window.ProseStageCore.taskOptions(task));
    try {
      await window.LF_PORTAL.attachEngineTask(task, {
        onProgress: trackProseProgress
      });
      await finishProseRead(record);
    } catch (error) {
      failProseRun(record, error);
    }
  };
  useEffect(() => {
    const handleAssistantTask = event => {
      var detail = event && event.detail || {},
        action = detail.action || {},
        task = detail.task || {};
      var args = action.arguments && typeof action.arguments === 'object' ? action.arguments : {};
      var bookId = D.book && D.book.id;
      if (!task.id || task.book_link_id !== bookId || action.operation !== 'tasks_start' || args.prose_draw || window.ProseStageCore.resultTarget(task, args)?.kind !== 'body') return;
      var current = proseRunRef.current;
      if (current && current.taskId === task.id) {
        showProseRun();
        return;
      }
      attachProseTask(Object.assign({}, task, {
        chapter_number: Number(args.chapter_number) || chap
      }));
    };
    window.addEventListener('lf:assistant-task-started', handleAssistantTask);
    return () => window.removeEventListener('lf:assistant-task-started', handleAssistantTask);
  }, [chap]);
  /* LF_PORTAL[3] 运行成文 — 编辑已自动落盘，冲刷待定的防抖后跑。
     角色状态维护 → 写手群依次执行；完成后先验证目标章节正文，再等待用户查看。 */
  const proseRunActive = record => record && ['running', 'verifying'].includes(record.status);
  const drawFlow = window.useProseDrawRun({
    accountId: drawAccountId,
    bookId: D.book && D.book.id,
    chapterNumber: chap,
    onRecord: (record, show) => {
      const current = proseRunRef.current;
      if (current && !current.draw && proseRunActive(current)) return;
      const next = {
        ...record,
        onDrawCancel: () => drawFlow.cancel(),
        onDrawRefresh: () => drawFlow.refresh(),
        onDrawBilling: () => set({
          section: 'settings',
          running: null,
          settingsTarget: {
            section: 'billing',
            requestId: window.crypto.randomUUID()
          }
        })
      };
      proseRunRef.current = next;
      set({
        proseRun: next,
        ...(show ? {
          running: {
            type: 'prose'
          }
        } : {})
      });
      if (!window.LF_RUN_ACTIVE || window.LF_RUN_ACTIVE.operationId !== next.operationId) lfRunStart('prose', {
        operationId: next.operationId,
        bookId: next.bookId,
        chapterNumber: next.chapterNumber,
        draw: next.draw
      });
      syncProseRunDock(next);
    },
    onClear: () => {
      const current = proseRunRef.current;
      if (!current || !current.draw) return;
      proseRunRef.current = null;
      set({
        proseRun: null,
        running: null
      });
      if (window.LF_RUN_ACTIVE && window.LF_RUN_ACTIVE.operationId === current.operationId) lfRunEnd();
    }
  });
  useEffect(() => {
    const current = proseRunRef.current;
    if (current && current.draw && (String(current.bookId) !== String(D.book && D.book.id) || String(current.accountId) !== String(drawAccountId))) {
      proseRunRef.current = null;
      set({
        proseRun: null,
        running: null
      });
      if (window.LF_RUN_ACTIVE && window.LF_RUN_ACTIVE.operationId === current.operationId) lfRunEnd();
    }
  }, [drawAccountId, D.book && D.book.id]);
  const proseTargetMatches = (bookId, no) => String(D.book && D.book.id || '') === String(bookId || '') && Number(outlineStateRef.current.chap) === Number(no) && String(drawAccountId || '') === String(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id || '') && String(detail && detail._bookId || '') === String(bookId || '') && Number(detail && detail.no) === Number(no);
  const blockBusyChapter = no => toast(en ? 'Chapter ' + no + ' already has an active generation task. Finish it before starting another chapter.' : '第 ' + no + ' 章已有生成任务，请等待该任务完成后再操作其他章节。');
  const noteProseBlocked = reason => {
    if (window.LF_CREATION_ANALYTICS) window.LF_CREATION_ANALYTICS.noteProseBlocked(reason);
  };
  const preflightPreviousChapter = async (bookId, no, executionMode) => {
    try {
      const readiness = await window.LF_API.productionReadiness(bookId, 'chapter_generate', executionMode, no);
      if (!readiness || typeof readiness.ready !== 'boolean' || !Array.isArray(readiness.missing) || readiness.missing.some(item => !item || typeof item.code !== 'string' || !item.code) || !readiness.ready && !readiness.missing.length) throw Error('readiness');
      // Other stage prerequisites remain with the stage runner, including the
      // outline's existing automatic world-state preparation.
      if (readiness.missing.some(item => ['previous_chapter_body', 'previous_chapter_post_hoc'].includes(item.code))) {
        noteProseBlocked('gate_prevposthoc');
        toast(readiness.message || TC('gate_prevposthoc'));
        return false;
      }
      return true;
    } catch (error) {
      noteProseBlocked('readiness_unknown');
      toast(en ? 'Unable to verify the previous chapter. Nothing was generated. Try again later.' : '暂时无法确认前章就绪状态，未开始生成，请稍后重试。');
      return false;
    }
  };
  const recoverPendingSelection = async record => {
    if (!record || !window.ProseDrawFlowCore.pendingSelection(record.draw?.round)) return false;
    setProseConfirm(null);
    if (await openInboxTask({
      bookId: record.bookId,
      chapterNumber: record.chapterNumber,
      target: 'writing',
      roundId: record.draw.round.round_id
    })) {
      toast(en ? 'This chapter has drafts awaiting your choice. Please finish this round first.' : '本章还有待选择的正文，请先处理本轮。');
    }
    return true;
  };
  const preflightProseTasks = async (bookId, no) => {
    if (!window.LF_PORTAL || !bookId) {
      toast(en ? 'Novel portal is unavailable.' : '创作服务暂不可用，请稍后重试。');
      return false;
    }
    const existing = await drawFlow.discover(no, {
      fresh: true
    });
    if (!existing.known) {
      toast(en ? 'Unable to verify existing draw rounds. Read the status and try again.' : '暂时无法确认已有抽卡轮次，请重新读取后再试。');
      return false;
    }
    if (await recoverPendingSelection(existing.record)) return false;
    var current = proseRunRef.current;
    if (proseRunActive(current)) {
      if (String(current.bookId || '') === String(bookId || '') && Number(current.chapterNumber) === Number(no)) showProseRun();else {
        noteProseBlocked('running_task');
        blockBusyChapter(current.chapterNumber || '?');
      }
      return false;
    }
    if (window.LF_PORTAL && window.LF_PORTAL.syncRunningTasks) {
      var syncFailed = false;
      try {
        await window.LF_PORTAL.syncRunningTasks({
          force: true,
          coordinated: false,
          authoritative: true
        });
      } catch (error) {
        syncFailed = true;
      }
      if (syncFailed) {
        noteProseBlocked('tasks_unknown');
        toast(en ? 'Unable to verify running chapter tasks. Generation was blocked.' : '暂时无法确认章节任务状态，已阻止生成，请稍后重试。');
        return false;
      }
    }
    if (!window.LF_PORTAL_STATE || window.LF_PORTAL_STATE.tasksKnown !== true) {
      noteProseBlocked('tasks_unknown');
      toast(en ? 'Unable to verify running chapter tasks. Generation was blocked.' : '暂时无法确认章节任务状态，已阻止生成，请稍后重试。');
      return false;
    }
    current = proseRunRef.current;
    if (proseRunActive(current)) {
      if (String(current.bookId || '') === String(bookId || '') && Number(current.chapterNumber) === Number(no)) showProseRun();else {
        noteProseBlocked('running_task');
        blockBusyChapter(current.chapterNumber || '?');
      }
      return false;
    }
    var activeTasks = window.LF_PORTAL && window.LF_PORTAL.activeChapterTasks ? window.LF_PORTAL.activeChapterTasks(bookId) : [];
    var taskNumber = task => window.LF_PORTAL && window.LF_PORTAL.chapterTaskNumber ? window.LF_PORTAL.chapterTaskNumber(task) : Number(task && task.chapter_number);
    var invalidTask = activeTasks.find(task => !Number.isInteger(Number(taskNumber(task))) || Number(taskNumber(task)) < 1);
    if (invalidTask) {
      noteProseBlocked('tasks_unknown');
      toast(en ? 'The running task has no valid chapter target. Generation was blocked.' : '检测到运行任务的章节信息不一致，已阻止生成，请刷新后重试。');
      return false;
    }
    var otherTask = activeTasks.find(task => Number(taskNumber(task)) !== Number(no));
    if (otherTask) {
      noteProseBlocked('running_task');
      blockBusyChapter(taskNumber(otherTask));
      return false;
    }
    var activeProse = window.LF_PORTAL && window.LF_PORTAL.activeProseTask ? window.LF_PORTAL.activeProseTask(bookId, no) : null;
    if (activeProse) {
      noteProseBlocked('running_task');
      attachProseTask(activeProse);
      return false;
    }
    if (activeTasks.length) {
      noteProseBlocked('running_task');
      blockBusyChapter(no);
      return false;
    }
    if (current && !current.draw) {
      proseRunRef.current = null;
      set({
        proseRun: null,
        running: null
      });
      lfRunEnd();
    }
    return true;
  };
  const runProse = async () => {
    if (proseStartRef.current) return;
    proseStartRef.current = true;
    var bookId = D.book && D.book.id;
    var no = Number(chap);
    try {
      if (!proseTargetMatches(bookId, no)) {
        noteProseBlocked('chapter_mismatch');
        toast(en ? 'The selected chapter changed. Refresh and try again.' : '当前章节信息已变化，未开始生成，请刷新后重试。');
        return;
      }
      if (window.LF_PORTAL.chapterGuideSyncState(bookId, no).status !== 'ready' || detail._syncStatus !== 'ready') {
        toast(en ? 'Outline pending synchronization. Retry reading first.' : '细纲待同步，请先重新读取。');
        return;
      }
      if (window.LF_CREATION_ANALYTICS) window.LF_CREATION_ANALYTICS.intent('run_prose');
      if (!(await preflightProseTasks(bookId, no))) return;
      if (window.LF_PORTAL && window.LF_PORTAL.postHocRunning && window.LF_PORTAL.postHocRunning(bookId)) {
        noteProseBlocked('gate_posthoc');
        toast(TC('gate_posthoc'));
        return;
      }
      if (!(await preflightPreviousChapter(bookId, no, 'character_state'))) return;
      // 细纲编辑退出即自动保存；若仍有未落盘的防抖，先冲刷再成文。
      if (detSaveTimer.current) await saveDetailNow();
      if (!proseTargetMatches(bookId, no)) return;
      var chapter = (D.chapters || []).find(item => Number(item.no) === no);
      var hasExistingBody = proseBodyVisible(no) || !!(chapter && chapter.body_readable === true);
      var guidance = '';
      if (!hasExistingBody && window.LF_CHAPTER_INTENT) {
        guidance = window.LF_CHAPTER_INTENT.read(localStorage, bookId, no);
      }
      setProseConfirm({
        requestId: window.crypto.randomUUID(),
        mode: hasExistingBody ? 'replace' : 'first',
        bookId: String(bookId),
        chapterNumber: no,
        chapterTitle: chTitle(),
        bookTitle: L(D.book && D.book.title),
        guidance: guidance
      });
    } finally {
      proseStartRef.current = false;
    }
  };
  const openWritingProse = async () => {
    if (proseStartRef.current) return;
    proseStartRef.current = true;
    const bookId = D.book && D.book.id,
      no = Number(chap),
      body = D.prose;
    try {
      if (!body || String(body._bookId) !== String(bookId) || Number(body.no) !== no) return;
      if (!(await preflightProseTasks(bookId, no))) return;
      if (window.LF_PORTAL.postHocRunning && window.LF_PORTAL.postHocRunning(bookId)) {
        noteProseBlocked('gate_posthoc');
        toast(TC('gate_posthoc'));
        return;
      }
      if (!(await preflightPreviousChapter(bookId, no, 'writer_group'))) return;
      const target = {
        requestId: window.crypto.randomUUID(),
        mode: 'replace',
        origin: 'writing',
        executionMode: 'writer_group',
        bookId: String(bookId),
        chapterNumber: no,
        chapterTitle: L(body.title),
        bookTitle: L(D.book.title),
        bodyVersion: Number(body.version) || 0,
        guidance: ''
      };
      if (confirmTargetMatches(target)) setProseConfirm(target);
    } finally {
      proseStartRef.current = false;
    }
  };
  const confirmTargetMatches = target => target.origin === 'writing' ? String(D.book && D.book.id) === String(target.bookId) && Number(outlineStateRef.current.chap) === Number(target.chapterNumber) && String(drawAccountId || '') === String(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id || '') && String(D.prose && D.prose._bookId) === String(target.bookId) && Number(D.prose && D.prose.no) === Number(target.chapterNumber) && Number(D.prose && D.prose.version || 0) === Number(target.bodyVersion) : proseTargetMatches(target.bookId, target.chapterNumber);
  const confirmProse = async (guidance, drawQuote) => {
    if (proseStartRef.current || !proseConfirm) return;
    const mode = proseModeRef.current,
      drawing = mode.drawSettings.enabled && mode.writerType !== 'muti';
    if (mode.writerType !== 'muti' && !mode.drawSettings.ready) return {
      error: en ? 'Read the draw setting before generating.' : '请先读取作品抽卡设置。'
    };
    if (drawing && (!mode.drawSettings.globallyEnabled || !drawQuote || drawQuote.inputKey !== window.ProseDrawFlowCore.inputKey(drawAccountId, proseConfirm, guidance))) return {
      error: en ? 'Confirm a current draw quote first.' : '请先确认当前抽卡报价。',
      invalidateQuote: true
    };
    proseStartRef.current = true;
    setProseConfirmBusy(true);
    var target = proseConfirm;
    try {
      if (!confirmTargetMatches(target)) {
        noteProseBlocked('chapter_mismatch');
        setProseConfirm(null);
        toast(en ? 'The selected chapter changed. Nothing was generated.' : '当前章节已切换，未开始生成，请重新确认。');
        return;
      }
      if (!(await preflightProseTasks(target.bookId, target.chapterNumber))) {
        setProseConfirm(null);
        return;
      }
      if (window.LF_PORTAL && window.LF_PORTAL.postHocRunning && window.LF_PORTAL.postHocRunning(target.bookId)) {
        noteProseBlocked('gate_posthoc');
        setProseConfirm(null);
        toast(TC('gate_posthoc'));
        return;
      }
      if (!(await preflightPreviousChapter(target.bookId, target.chapterNumber, target.executionMode || 'character_state'))) {
        setProseConfirm(null);
        return;
      }
      if (detSaveTimer.current) await saveDetailNow();
      if (!confirmTargetMatches(target) || String(drawAccountId) !== String(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id)) {
        setProseConfirm(null);
        toast(en ? 'The target changed. Nothing was generated.' : '目标已变化，未开始生成。');
        return;
      }
      if (!window.LF_PORTAL || !target.bookId) {
        setProseConfirm(null);
        toast(en ? 'Novel portal is unavailable.' : '创作服务暂不可用，请稍后重试。');
        return;
      }
      if (drawing) {
        const latest = proseModeRef.current.drawSettings;
        if (!latest.ready || !latest.enabled || !latest.globallyEnabled) return {
          error: en ? 'Read the draw setting and confirm again.' : '请重新读取抽卡设置后确认。',
          invalidateQuote: true
        };
        const result = await drawFlow.start(drawQuote, target, guidance);
        if (result.existing) {
          if (!(await recoverPendingSelection(result.existing))) showProseRun();
          setProseConfirm(null);
          return {
            recovered: true
          };
        }
        if (!result.error) setProseConfirm(null);
        return result;
      }
      if (target.mode === 'first' && window.LF_CHAPTER_INTENT) {
        window.LF_CHAPTER_INTENT.write(localStorage, target.bookId, target.chapterNumber, guidance);
      }
      setProseConfirm(null);
      var record = beginProseRun(target.bookId, target.chapterNumber, null, window.ProseStageCore.taskOptions(null, {
        task_type: 'chapter_draft',
        execution_mode: target.executionMode || 'character_state',
        writer_type: mode.writerType
      }));
      const options = {
        writerType: mode.writerType,
        payload: guidance ? {
          human_intent: guidance
        } : {},
        onProgress: trackProseProgress
      };
      const request = target.origin === 'writing' ? window.LF_PORTAL.runChapterStage(target.bookId, target.chapterNumber, 'writer_group', options) : window.LF_PORTAL.runChapterProse(target.bookId, target.chapterNumber, {}, options);
      request.then(async function (task) {
        if (task) updateProseRunState({
          taskId: task.id || null
        }, record.operationId);
        await finishProseRead(record);
      }).catch(function (error) {
        failProseRun(record, error);
        if (error && error.code === 'quote_cancelled' && proseTargetMatches(target.bookId, target.chapterNumber)) setProseConfirm({
          ...target,
          guidance: guidance
        });
      });
    } finally {
      proseStartRef.current = false;
      setProseConfirmBusy(false);
    }
  };
  /* Adopt the generated detail only while the same book/chapter is visible.
     A completed task may return after navigation; that result must never be
     rebound from the global bridge detail into another chapter's editor. */
  const finishOutline = (event, record) => {
    var target = record || outlineRunRef.current;
    if (!event || !event.done || !target || target !== outlineRunRef.current) return;
    if (!outlineDoneRef.current) {
      outlineDoneRef.current = true;
      set(s => s.running && s.running.operationId === target.operationId ? {
        running: null
      } : {});
      if (window.LF_RUN_ACTIVE && window.LF_RUN_ACTIVE.operationId === target.operationId) lfRunEnd();
      if (String(D.book && D.book.id) === String(target.bookId)) toast(TC('rg_done'));
    }
    // Duplicate terminal events may carry the later successful read. Never
    // clear dirty state, and never mark a skeleton as generated.
    set(s => adoptOutlineSnapshot(s, target.bookId, target.chapterNumber));
  };
  const failOutline = (error, record) => {
    var target = record || outlineRunRef.current;
    if (outlineDoneRef.current || !target || target !== outlineRunRef.current) return;
    outlineRunRef.current = null;
    set(s => s.running && s.running.operationId === target.operationId ? {
      running: null
    } : {});
    setRunProg(null);
    if (window.LF_RUN_ACTIVE && window.LF_RUN_ACTIVE.operationId === target.operationId) lfRunEnd();
    if (error && error.code === 'quote_cancelled') return;
    if (window.LF_ERROR && window.LF_ERROR.isBackendError(error)) window.LF_ERROR(error);else toast(TC('rg_fail') || 'Generation failed');
  };
  /* LF_PORTAL[4] 生成单章细纲 — 仅世界状态机 → 仅细纲导演，RunSteps 双阶段进度 */
  const openOutlineModal = firstGen => {
    outlineSubmitKeyRef.current = newOutlineSubmitKey();
    set({
      regenOpen: true,
      isFirstGen: !!firstGen
    });
  };
  const closeOutlineModal = () => {
    outlineSubmitKeyRef.current = null;
    set({
      regenOpen: false,
      isFirstGen: false
    });
  };
  const doRegen = async intent => {
    if (outlineStartRef.current) return;
    outlineStartRef.current = true;
    var outlineSubmitKey = outlineSubmitKeyRef.current || newOutlineSubmitKey();
    outlineSubmitKeyRef.current = outlineSubmitKey;
    var bookId = D.book && D.book.id;
    try {
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      const captured = guard && (guard.captureRefresh || guard.captureNavigation).call(guard);
      if (guideSavingRef.current || Object.keys(guideDirtyRef.current || {}).length || guard && !captured) {
        toast(TC('asst_navigation_draft'));
        return;
      }
      if (window.LF_PORTAL && Number(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.selectedChapter) !== Number(chap)) await retryGuideRead();
      if (String(D.book && D.book.id) !== String(bookId) || Number(outlineStateRef.current.chap) !== Number(chap) || guard && (!captured || !captured())) return;
      // intent may be a bare string (legacy) or {human_intent, world_intent}.
      var humanI = intent && typeof intent === 'object' ? intent.human_intent || '' : intent || '';
      var worldI = intent && typeof intent === 'object' ? intent.world_intent || '' : '';
      if (window.LF_PORTAL && bookId && window.LF_PORTAL.postHocRunning && window.LF_PORTAL.postHocRunning(bookId)) {
        set({
          regenOpen: false,
          isFirstGen: false
        });
        toast(TC('gate_posthoc'));
        return;
      }
      if (!(await preflightPreviousChapter(bookId, chap, 'outline_director'))) {
        set({
          regenOpen: false,
          isFirstGen: false
        });
        return;
      }
      if (String(D.book && D.book.id) !== String(bookId) || Number(outlineStateRef.current.chap) !== Number(chap) || String(drawAccountId || '') !== String(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id || '') || guard && (!captured || !captured())) return;
      var outlineRecord = {
        bookId: bookId,
        chapterNumber: Number(chap),
        operationId: outlineSubmitKey
      };
      set({
        regenOpen: false,
        isFirstGen: false,
        running: {
          type: 'outline',
          operationId: outlineSubmitKey
        }
      });
      setRunProg(null);
      lfRunStart('outline', outlineRecord);
      outlineDoneRef.current = false;
      outlineRunRef.current = outlineRecord;
      // Remember this chapter's human intent so 运行成文 (writer group) carries it too.
      if (bookId && window.LF_CHAPTER_INTENT) window.LF_CHAPTER_INTENT.write(localStorage, bookId, chap, humanI);
      if (window.LF_PORTAL && bookId) {
        var op = {};
        if (humanI) op.human_intent = humanI;
        if (worldI) op.world_intent = worldI;
        await window.LF_PORTAL.generateChapterOutline(bookId, chap, {
          payload: op,
          idempotencyKey: outlineSubmitKey,
          onProgress: function (ev) {
            if (outlineRunRef.current !== outlineRecord) return;
            if (ev && ev.done) {
              setRunProg({
                progress: 1
              });
              lfRunProg(1);
              finishOutline(ev, outlineRecord);
            } else if (ev && ev.error) {
              failOutline(ev.error, outlineRecord);
            } else if (ev && typeof ev.progress === 'number') {
              setRunProg({
                progress: ev.progress,
                stage: ev.stage_name || null
              });
              lfRunProg(ev.progress);
            }
          }
        });
      } else {
        throw new Error('Novel portal is unavailable');
      }
    } catch (err) {
      failOutline(err, outlineRecord);
    } finally {
      outlineStartRef.current = false;
      outlineSubmitKeyRef.current = null;
    }
  };
  const proseOverlay = running && running.type === 'prose' ? /*#__PURE__*/React.createElement(ProseRunOverlay, {
    mode: "regen",
    status: proseRun && proseRun.status || 'running',
    chapterNumber: proseRun && proseRun.chapterNumber || chap,
    stage: proseRun && proseRun.draw ? proseRun.draw.stage : runProg && runProg.stage,
    stageOptions: proseRun && proseRun.draw ? proseRun.draw.stageOptions : runProg && runProg.stageOptions || proseRun && proseRun.stageOptions,
    draw: proseRun && proseRun.draw,
    onDrawChange: patch => drawFlow.patch(patch, proseRun),
    onDrawCancel: proseRun && proseRun.onDrawCancel,
    onDrawRefresh: proseRun && proseRun.onDrawRefresh,
    onDrawRetryCreate: async () => {
      const result = await drawFlow.retryCreate();
      if (result && result.error) toast(result.error);
    },
    onDrawRetryCancel: () => drawFlow.cancel(),
    onDrawView: proseRun && proseRun.draw ? async () => {
      const record = proseRunRef.current;
      if (record && record.draw && record.draw.round && (await openInboxTask({
        bookId: record.bookId,
        chapterNumber: record.chapterNumber,
        target: 'writing',
        roundId: record.draw.round.round_id
      }))) drawFlow.dismiss();
    } : undefined,
    onDrawBilling: proseRun && proseRun.onDrawBilling,
    progress: runProg && runProg.progress,
    onView: () => proseRun && openProseResult(proseRun.operationId),
    onRetry: () => proseRun && retryProseRead(proseRun.operationId),
    onClose: () => {
      set({
        running: null
      });
      if (window.LF_RERENDER) window.LF_RERENDER();
    }
  }) : null;
  let main;
  if (section === 'workbench') {
    main = wbMode === 'cruise' ? /*#__PURE__*/React.createElement(CruiseView, {
      state: state,
      set: set,
      ctl: ctl,
      toast: toast
    }) : /*#__PURE__*/React.createElement("div", {
      className: "c-main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "c-top"
    }, /*#__PURE__*/React.createElement("button", {
      className: "tree-toggle c-ic",
      onClick: () => set({
        treeOpen: !treeOpen
      })
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "book",
      s: 16
    })), /*#__PURE__*/React.createElement("div", {
      className: "c-crumb"
    }, "\u300A", L(D.book && D.book.title), "\u300B", (() => {
      var v = selectedVolume();
      return v ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
        className: "sep"
      }, "/"), L(v.no), " ", L(v.name)) : null;
    })(), /*#__PURE__*/React.createElement("span", {
      className: "sep"
    }, "/"), /*#__PURE__*/React.createElement("b", null, chTitle())), /*#__PURE__*/React.createElement(WbModeSwitch, {
      mode: "edit",
      setMode: m => set({
        wbMode: m
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(TopCtl, ctl)), /*#__PURE__*/React.createElement(LevelSwitcher, {
      level: tab,
      setLevel: k => set(k === 'detail' && (tab === 'vol' || tab === 'brief') ? {
        tab: k,
        mVolFrom: tab
      } : {
        tab: k
      }),
      chap: chap
    }), /*#__PURE__*/React.createElement("div", {
      className: "c-body",
      style: {
        overflow: 'auto',
        padding: '26px 30px',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "wb-level",
      key: tab,
      "data-dir": lvDir
    }, tab === 'vol' && (viewedRow ? viewedRow.volume ? /*#__PURE__*/React.createElement(VolOutlineView, {
      onEdit: openOutlineReview,
      volume: selectedVolume(),
      o: viewedRow.volume
    }) : window.MobilePlannedVolume ? /*#__PURE__*/React.createElement(window.MobilePlannedVolume, {
      volume: selectedVolume(),
      toast: toast
    }) : null : /*#__PURE__*/React.createElement(VolTab, {
      onEdit: openOutlineReview,
      volume: selectedVolume()
    })), tab === 'brief' && (viewedRow && !viewedRow.nearTerm ? /*#__PURE__*/React.createElement("div", {
      className: "m-empty-note"
    }, L({
      zh: '这一卷还没有简纲。',
      en: 'This volume has no chapter plan yet.'
    })) : viewedRow ? /*#__PURE__*/React.createElement(BriefOutlineView, {
      pick: pickChap,
      onEdit: openOutlineReview,
      o: viewedRow.nearTerm
    }) : /*#__PURE__*/React.createElement(BriefTab, {
      pick: pickChap,
      onEdit: openOutlineReview
    })), tab === 'detail' && guideView.noticeKind && /*#__PURE__*/React.createElement(OutlineStatusCard, {
      kind: guideView.noticeKind,
      reading: guideView.reading,
      readable: true,
      onRead: retryGuideRead
    }), tab === 'detail' && (guideReadable ? /*#__PURE__*/React.createElement(EditableDetailOutline, {
      det: detail,
      edit: editDetail,
      dirty: state.dirty,
      onRegen: () => openOutlineModal(false),
      onRun: runProse,
      outlineBusy: guideView.busy,
      outlinePending: guideView.busy || !!(guideSync && guideSync.status !== 'ready'),
      proseRunStatus: proseRunActive(proseRun) && String(proseRun.bookId) === String(D.book && D.book.id) && Number(proseRun.chapterNumber) === Number(chap) && (!proseRun.draw || window.ProseDrawFlowCore.needsRead(proseRun)) ? proseRun.status : null,
      writerType: writerType,
      toggleWriterType: toggleWriterType,
      toast: toast,
      saving: state.detSaving,
      saveErr: state.detSaveErr
    }) : guideView.canGenerate ? /*#__PURE__*/React.createElement(BriefView, {
      chap: chap,
      generationState: guideView.kind,
      reading: guideView.reading,
      creditsRefunded: guideView.creditsRefunded,
      onRead: retryGuideRead,
      onGen: () => openOutlineModal(true)
    }) : /*#__PURE__*/React.createElement(OutlineStatusCard, {
      kind: guideView.kind,
      reading: guideView.reading,
      creditsRefunded: guideView.creditsRefunded,
      onRead: retryGuideRead
    }))), running && (running.type === 'outline' ? /*#__PURE__*/React.createElement(RunSteps, {
      onClose: () => {
        set({
          running: null
        });
        if (window.LF_RERENDER) window.LF_RERENDER();
      },
      progress: runProg && runProg.progress,
      stage: runProg && runProg.stage
    }) : running.type === 'prose' ? proseOverlay : /*#__PURE__*/React.createElement(RunOverlay, {
      type: running.type
    }))));
  } else if (section === 'writing') {
    main = /*#__PURE__*/React.createElement(WriteView, {
      onGenerateProse: openWritingProse,
      drawRoundId: state.drawSelectionTarget && String(state.drawSelectionTarget.bookId) === String(D.book && D.book.id) && Number(state.drawSelectionTarget.chapterNumber) === Number(state.chap) ? state.drawSelectionTarget.roundId : null,
      drawRoundRequest: state.drawSelectionTarget && state.drawSelectionTarget.requestId,
      key: String(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id || '') + ':' + String(D.book && D.book.id || '') + ':' + chap,
      toast: toast,
      lang: ctl.lang,
      goNextOutline: () => pickChap(D.prose.no + 1),
      toggleTree: () => set({
        treeOpen: !treeOpen
      })
    });
  } else if (section === 'custom_settings') {
    main = /*#__PURE__*/React.createElement(window.CustomSettingsView, {
      key: D.book && D.book.id,
      bookId: D.book && D.book.id,
      bookTitle: D.book && L(D.book.title),
      controls: /*#__PURE__*/React.createElement(TopCtl, ctl),
      target: state.customSettingsTarget && String(state.customSettingsTarget.bookId) === String(D.book && D.book.id) ? state.customSettingsTarget : null,
      onAsk: ctl.onCustomSettingsAsk,
      assistantEnabled: ctl.assistantEnabled
    });
  } else if (section === 'settings') {
    main = /*#__PURE__*/React.createElement(SettingsView, {
      ctl: ctl,
      target: state.settingsTarget
    });
  } else if (section === 'assistant') {
    main = /*#__PURE__*/React.createElement(window.AssistantSettingsView, {
      ctl: ctl,
      target: state.assistantTarget,
      controls: /*#__PURE__*/React.createElement(TopCtl, _extends({}, ctl, {
        onSettings: null
      }))
    });
  } else if (section === 'admin') {
    main = window.AdminFullView ? /*#__PURE__*/React.createElement(window.AdminFullView, {
      ctl: ctl
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 30
      }
    }, TC('set_loading'));
  } else if (section === 'partnerships') {
    main = window.PartnershipsView ? /*#__PURE__*/React.createElement(window.PartnershipsView, {
      ctl: ctl
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 30
      }
    }, TC('set_loading'));
  } else if (section === 'inbox') {
    main = window.InboxView ? /*#__PURE__*/React.createElement(window.InboxView, {
      toast: toast,
      onOpenTask: openInboxTask
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 30
      }
    }, TC('set_loading'));
  } else {
    main = /*#__PURE__*/React.createElement(WorldView, {
      ctl: ctl,
      toast: toast,
      onEditWorld: openWorldReview,
      chapterStateTarget: state.chapterStateTarget
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "cscreen",
    style: {
      height: '100vh'
    }
  }, /*#__PURE__*/React.createElement(AppRail, {
    section: section,
    go: k => set({
      section: k
    }),
    unread: unread,
    onShelf: async () => {
      if (set({
        view: 'shelf',
        running: null
      }) === false) return;
      if (window.LF_PORTAL) try {
        await window.LF_PORTAL.load();
      } catch (e) {}
    }
  }), (section === 'workbench' || section === 'writing') && /*#__PURE__*/React.createElement(AppTree, {
    key: treeVersion,
    open: vopen,
    setOpen: i => set({
      vopen: i
    }),
    chap: chap,
    pick: no => pickChap(no, {
      fromTree: true
    }),
    treeOpen: treeOpen,
    toast: toast
  }), /*#__PURE__*/React.createElement("div", {
    className: 'tree-scrim' + (treeOpen ? ' show' : ''),
    onClick: () => set({
      treeOpen: false
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "c-view",
    key: section
  }, main), running && running.type === 'prose' && (section !== 'workbench' || wbMode === 'cruise') && proseOverlay, /*#__PURE__*/React.createElement(RegenModal, {
    open: regenOpen,
    chap: chap,
    title: chTitle(),
    worldField: true,
    firstGen: !!state.isFirstGen,
    onClose: closeOutlineModal,
    onConfirm: doRegen
  }), /*#__PURE__*/React.createElement(ProseRunConfirmDialog, {
    open: !!proseConfirm,
    target: proseConfirm,
    confirmDisabled: proseConfirmBusy,
    writerType: writerType,
    onToggleWriter: toggleWriterType,
    drawEnabled: proseDrawEnabled,
    onDrawChange: changeProseDraw,
    drawSettings: drawSettings,
    accountId: drawAccountId,
    onClose: () => {
      if (!proseConfirmBusy) setProseConfirm(null);
    },
    onConfirm: confirmProse
  }));
}

/* ---------- root ---------- */
function assistantPageBookId(state) {
  if (!state) return null;
  if (state.view === 'book' && D.book && D.book.id) return D.book.id;
  if (state.view === 'create' && state.createResume && state.createResume.bookId && D.book && String(D.book.id) === String(state.createResume.bookId)) return D.book.id;
  return null;
}
function assistantPageContext(state, citation) {
  const Cite = window.AssistantCiteCore;
  const bookId = assistantPageBookId(state);
  if (Cite && typeof Cite.buildPageContext === 'function') {
    return Cite.buildPageContext(state, {
      chapters: D.chapters || [],
      localize: L,
      citation,
      bookId
    });
  }
  if (!state) return null;
  if (state.view === 'shelf') return {
    surface: 'shelf',
    chapter_number: null,
    resource_type: 'bookshelf',
    resource_key: null
  };
  if (state.view === 'create') return {
    surface: 'create',
    chapter_number: null,
    resource_type: 'book_creation',
    resource_key: null
  };
  if (state.view !== 'book') return null;
  if (state.section === 'assistant') return {
    surface: 'settings',
    chapter_number: null,
    resource_type: 'settings',
    resource_key: 'assistant'
  };
  const surface = ['workbench', 'writing', 'world', 'custom_settings', 'settings', 'inbox', 'admin'].includes(state.section) ? state.section : 'workbench';
  const resourceType = {
    workbench: 'chapter_outline',
    writing: 'chapter_body',
    world: 'world',
    custom_settings: 'custom_settings',
    settings: 'settings',
    inbox: 'inbox',
    admin: 'admin'
  }[surface] || 'book';
  const chapterNumber = surface !== 'custom_settings' && Number(state.chap) > 0 ? Number(state.chap) : null;
  const chapter = chapterNumber ? (D.chapters || []).find(item => Number(item.no) === chapterNumber) : null;
  const volumeNumber = chapter && Number(chapter.vol) > 0 ? Number(chapter.vol) : null;
  const localizedChapterTitle = chapter && chapter.title && chapter.title.zh !== '—' ? L(chapter.title) : null;
  const chapterTitle = typeof localizedChapterTitle === 'string' && localizedChapterTitle.trim() ? localizedChapterTitle.trim() : null;
  const resourceKey = surface === 'workbench' ? [state.wbMode, state.tab].filter(Boolean).join(':') || null : null;
  return {
    surface,
    volume_number: volumeNumber,
    chapter_number: chapterNumber,
    chapter_title: chapterTitle,
    resource_type: resourceType,
    resource_key: resourceKey
  };
}
function ConsoleApp() {
  const [lang, setLangS] = useState(window.CLANG || 'zh');
  const [theme, setThemeS] = useState(localStorage.getItem('lf_theme') || 'light');
  const [accountSettings, setAccountSettings] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const assistantAvailability = window.useAssistantAvailability();
  const assistantEnabled = assistantAvailability.enabled;
  window.LF_ASSISTANT_ENABLED = assistantEnabled;
  const [assistantCitation, setAssistantCitation] = useState(null);
  const [assistantDraftRequest, setAssistantDraftRequest] = useState(null);
  const shellRef = useRef(null);
  const syncAssistantDockLayout = useCallback(width => {
    const shell = shellRef.current;
    const dockWidth = Math.max(0, Math.round(Number(width) || 0));
    const inset = (window.CreationLayout ? window.CreationLayout.creationEdgeInset(dockWidth) : dockWidth) + 'px';
    document.documentElement.style.setProperty('--assistant-dock-width', inset);
    if (!shell) return;
    shell.style.setProperty('--assistant-dock-width', inset);
    if (dockWidth) shell.setAttribute('data-assistant-docked', 'true');else shell.removeAttribute('data-assistant-docked');
  }, []);
  const deep = typeof location !== 'undefined' && /settings/i.test(location.hash + location.search);
  const deepWorld = typeof location !== 'undefined' && /world/i.test(location.hash + location.search);
  const deepAssistant = typeof location !== 'undefined' && location.hash === '#assistant';
  // D6: per-book/per-chapter outline draft cache.
  const wbKey = 'lf_wb_' + (D.book && D.book.id || 'demo') + '_' + (D.detail && D.detail.no || 0);
  const safeChap = () => {
    var c = D.chapters && D.chapters.length ? D.chapters[0].no : 0;
    return c || D.book && D.book.chap || 0;
  };
  const cached = (() => {
    try {
      return JSON.parse(localStorage.getItem(wbKey) || 'null');
    } catch (e) {
      return null;
    }
  })();
  const initDetail = cached && cached.detail && D.detail && Number(cached.detail.no) === Number(safeChap()) ? Object.assign({}, cached.detail, {
    _bookId: D.detail._bookId,
    no: safeChap()
  }) : window.LF_PORTAL.chapterDetailSnapshot(D.book && D.book.id, safeChap());
  // 自动保存后后端即真相；不再从本地缓存恢复 dirty（否则会复活已落盘字段的小圆点）。
  const initDirty = {};
  // 工作台打开默认进入精修面板（不再从 localStorage 恢复上次的巡航模式）。
  const initMode = 'edit';
  const initVopen = (() => {
    var i = D.volumes ? D.volumes.findIndex(v => v.state === 'active') : -1;
    return i < 0 ? 0 : i;
  })();
  /* 兜底：上次会话在建书向导里中断（刷新/断线）→ 直接回到向导续看进度 */
  const savedCreate = (() => {
    try {
      var p = JSON.parse(localStorage.getItem('lf_create_progress') || 'null');
      return p && p.bookId ? p : null;
    } catch (e) {
      return null;
    }
  })();
  var initGen = new Set((D.chapters || []).filter(chapterHasGuide).map(c => c.no));
  const [st, setSt] = useState({
    bookId: String(D.book && D.book.id || ''),
    view: deep || deepWorld || deepAssistant ? 'book' : savedCreate ? 'create' : 'shelf',
    section: deep ? 'settings' : deepWorld ? 'world' : deepAssistant ? 'assistant' : 'workbench',
    wbMode: initMode,
    tab: 'detail',
    chap: safeChap(),
    vopen: initVopen,
    generated: initGen,
    running: null,
    proseRun: null,
    revOpen: true,
    treeOpen: false,
    detail: initDetail,
    dirty: initDirty,
    detSaving: false,
    detSaveErr: null,
    regenOpen: false,
    treeVersion: 0,
    createResume: savedCreate ? {
      step: savedCreate.step || 0,
      bookId: savedCreate.bookId,
      saved: savedCreate
    } : null
  });
  const [toast, showToast] = useToast();
  const mobile = lfUseMobileLayout();
  const assistantPageIdentityRef = useRef({
    view: null,
    bookId: null
  });
  const assistantNavigationStateRef = useRef(st);
  assistantNavigationStateRef.current = st;
  const navigationCommitRef = useRef(null);
  React.useLayoutEffect(() => {
    const pending = navigationCommitRef.current;
    navigationCommitRef.current = null;
    if (pending) pending.resolve();
  }, [st]);
  useEffect(() => () => {
    if (navigationCommitRef.current) navigationCommitRef.current.reject(Object.assign(new Error('Navigation detached'), {
      code: 'navigation_target_changed'
    }));
  }, []);
  assistantPageIdentityRef.current = {
    view: st.view,
    bookId: assistantPageBookId(st)
  };
  useEffect(() => {
    if (!assistantEnabled) setAssistantOpen(false);
  }, [assistantEnabled]);
  useEffect(() => {
    const onCite = event => {
      const detail = event && event.detail || {};
      setAssistantCitation(detail.citation || null);
      if (detail.open) setAssistantOpen(true);
    };
    window.addEventListener('lf:assistant-cite', onCite);
    return () => window.removeEventListener('lf:assistant-cite', onCite);
  }, []);
  useEffect(() => {
    const bookId = assistantPageBookId(st);
    setAssistantCitation(current => {
      const Cite = window.AssistantCiteCore;
      if (Cite && typeof Cite.retainIfBook === 'function') return Cite.retainIfBook(current, bookId);
      if (!current || !bookId || String(current.bookId) !== String(bookId)) return null;
      return current;
    });
  }, [st.view, st.section, st.createResume && st.createResume.bookId, D.book && D.book.id]);

  // NOTE: window.CLANG must be set BEFORE React re-renders (components read it during render),
  // so setLang updates it synchronously; this effect only keeps <html lang> + storage in sync.
  useEffect(() => {
    window.CLANG = lang;
    localStorage.setItem('lf_lang', lang);
    localStorage.setItem('lf_clang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lf_theme', theme);
  }, [theme]);
  useEffect(() => {
    let alive = true;
    if (!window.LFOverlay || !window.LF_PORTAL || !window.LF_PORTAL.ready) return () => {
      alive = false;
    };
    window.LFOverlay.show();
    Promise.resolve(window.LF_PORTAL.ready()).finally(() => {
      if (alive) window.LFOverlay.hide();
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    let alive = true;
    let timer = null;
    let polling = false;
    const schedule = () => {
      if (!alive || document.hidden) return;
      timer = setTimeout(poll, engineGenerationBlocked() ? 15000 : 60000);
    };
    const poll = () => {
      if (!alive || document.hidden || polling) return;
      if (!window.LF_API || !window.LF_API.runtimeStatus) return;
      polling = true;
      const wasBlocked = engineGenerationBlocked();
      window.LF_API.runtimeStatus().then(() => {
        if (wasBlocked && !engineGenerationBlocked() && window.LF_PORTAL && window.LF_PORTAL.refreshAfterEngineRecovery) {
          return window.LF_PORTAL.refreshAfterEngineRecovery();
        }
      }).catch(() => {}).finally(() => {
        polling = false;
        schedule();
      });
    };
    const onVisibility = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', onVisibility);
    poll();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  useEffect(() => {
    let alive = true;
    if (!window.LF_API || !window.LF_API.getSettings) return () => {
      alive = false;
    };
    window.LF_API.getSettings().then(settings => {
      if (!alive || !settings) return;
      setAccountSettings(settings);
      const nextLang = settings.locale === 'en' ? 'en' : 'zh';
      window.CLANG = nextLang;
      setLangS(nextLang);
      let nextTheme = settings.theme;
      if (nextTheme === 'system') nextTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      if (nextTheme === 'light' || nextTheme === 'dark') setThemeS(nextTheme);
      try {
        localStorage.removeItem('lf_set_prefs');
      } catch (e) {}
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(wbKey, JSON.stringify({
        detail: st.detail
      }));
    } catch (e) {}
  }, [st.detail]);
  useEffect(() => {
    try {
      localStorage.setItem('lf_wb_mode', st.wbMode);
    } catch (e) {}
  }, [st.wbMode]);
  // Re-render hook for api-bridge.js: bridge rewrites window.CONSOLE_DATA, then calls LF_RERENDER()
  // Also trigger a one-time title backfill for chapters whose outlines were
  // generated in a prior session (the snapshot may carry no title).
  useEffect(() => {
    var rerender = () => setSt(s => ({
      ...s
    }));
    window.LF_RERENDER = rerender;
    var bookId = D.book && D.book.id;
    if (bookId && window.LF_API && window.LF_API.bookChapterGuide) {
      // Fire-and-forget: fetch guide title for every done chapter missing a
      // readable title, patch D.chapters, then rerender.
      (async () => {
        var stale = (D.chapters || []).filter(function (c) {
          return c && c.state === 'done' && window.LF_PORTAL.chapterTitleMissing(c);
        });
        if (!stale.length) return;
        await Promise.all(stale.map(async function (c) {
          try {
            var payload = await window.LF_API.bookChapterGuide(bookId, c.no);
            var guide = payload && (payload.guide != null ? payload.guide : payload);
            if (guide && typeof guide === 'object') {
              var g = guide.content && typeof guide.content === 'object' ? guide.content : guide;
              if (g.title) {
                c.title = {
                  zh: String(g.title),
                  en: String(g.title)
                };
              }
            }
          } catch (e) {}
        }));
        rerender();
      })();
    }
    return () => {
      window.LF_RERENDER = undefined;
    };
  }, []);

  // All entries into a book/chapter adopt one identity-checked view snapshot.
  // Navigation checks happen before bridge reads as well as at this commit.
  const set = patch => {
    const current = assistantNavigationStateRef.current;
    const next = typeof patch === 'function' ? null : patch;
    const leaving = next && (next.section && next.section !== current.section || next.view && next.view !== current.view || next.tab && next.tab !== current.tab || next.chap != null && Number(next.chap) !== Number(current.chap) || String(current.bookId || '') !== String(D.book && D.book.id || '') && (next.view === 'book' || next.chap != null));
    const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
    const capture = guard && (current.section === 'writing' && guard.captureRefresh ? guard.captureRefresh : guard.captureNavigation);
    if (leaving && (current.detSaving || Object.keys(current.dirty || {}).length || capture && !capture.call(guard))) {
      showToast(current.section === 'writing' ? TC('prose_finish_edit') : TC('asst_navigation_draft'));
      return false;
    }
    if (leaving && guard && guard.invalidate) guard.invalidate();
    setSt(s => {
      var updates = typeof patch === 'function' ? patch(s) : patch;
      var targetBookId = String(D.book && D.book.id || '');
      var targetChap = updates.chap != null ? Number(updates.chap) : Number(s.chap);
      var enteringBook = (updates.view || s.view) === 'book';
      var identityChanged = String(s.bookId || '') !== targetBookId || Number(s.chap) !== targetChap;
      var enteringWorkbench = updates.section === 'workbench' && s.section !== 'workbench';
      if (enteringBook && (identityChanged || s.view !== 'book' || enteringWorkbench)) {
        updates = Object.assign({}, updates, window.LF_PORTAL.chapterViewSnapshot(targetBookId, targetChap));
      }
      return {
        ...s,
        ...updates
      };
    });
    return true;
  };
  const assistantAccountId = !window.LF_AUTH_EXPIRED && window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me ? window.LF_PORTAL_STATE.me.id : null;
  const refreshAssistantTarget = window.AssistantActionCore ? window.AssistantActionCore.createAssistantTargetRefresher({
    getIdentity: () => assistantPageIdentityRef.current,
    refreshShelf: () => window.LF_PORTAL?.refreshAssistantShelf?.() || false,
    refreshCharacters: (bookId, shouldApply) => window.LF_PORTAL?.refreshAssistantCharacters?.(bookId, shouldApply) || false,
    rememberTask: task => {
      if (window.LF_PORTAL && window.LF_PORTAL.rememberTask) window.LF_PORTAL.rememberTask(task);
    },
    refreshBook: (bookId, shouldApply) => window.LF_PORTAL && window.LF_PORTAL.refreshAssistantBook ? window.LF_PORTAL.refreshAssistantBook(bookId, shouldApply) : false,
    refreshResource: (bookId, resource, shouldApply) => window.LF_PORTAL && window.LF_PORTAL.refreshAssistantResource ? window.LF_PORTAL.refreshAssistantResource(bookId, resource, shouldApply) : false,
    refreshCustomSettings: (action, shouldApply) => window.CustomSettingsBridge.notifySaved(action, detail => window.dispatchEvent(new CustomEvent('lf:custom-settings-updated', {
      detail
    })), shouldApply),
    refreshTask: (bookId, task, shouldApply) => window.LF_PORTAL && window.LF_PORTAL.refreshAssistantTask ? window.LF_PORTAL.refreshAssistantTask(bookId, task, shouldApply) : false,
    refreshCruise: (bookId, session, shouldApply) => window.LF_PORTAL && window.LF_PORTAL.refreshAssistantCruise ? window.LF_PORTAL.refreshAssistantCruise(bookId, session, shouldApply) : false,
    onTaskStarted: (action, task) => {
      window.dispatchEvent(new CustomEvent('lf:assistant-task-started', {
        detail: {
          action: action,
          task: task
        }
      }));
    },
    onDrawStarted: (action, round) => {
      window.dispatchEvent(new CustomEvent('lf:assistant-draw-started', {
        detail: {
          action,
          round
        }
      }));
    },
    onApplied: () => setSt(current => ({
      ...current,
      treeVersion: (current.treeVersion || 0) + 1
    }))
  }) : async () => {};
  const updateSettings = async patch => {
    if (!window.LF_API || !window.LF_API.updateSettings) return null;
    try {
      const updated = await window.LF_API.updateSettings(patch);
      setAccountSettings(updated);
      return updated;
    } catch (error) {
      showToast(error.message || (window.CLANG === 'en' ? 'Failed to save settings' : '设置保存失败'));
      return null;
    }
  };
  const setLang = async l => {
    const previous = lang;
    window.CLANG = l;
    setLangS(l);
    const saved = await updateSettings({
      locale: l === 'en' ? 'en' : 'zh-CN'
    });
    if (!saved) {
      window.CLANG = previous;
      setLangS(previous);
    }
    return saved;
  };
  const setTheme = async nextTheme => {
    const previous = theme;
    setThemeS(nextTheme);
    const saved = await updateSettings({
      theme: nextTheme
    });
    if (!saved) setThemeS(previous);
    return saved;
  };
  /* 全新建书：清掉向导进度与快照缓存，重置 create 数据 — 不带任何缓存进向导 */
  const enterCreate = () => {
    if (set({
      view: 'create',
      createResume: null
    }) === false) return false;
    if (window.LF_PORTAL && window.LF_PORTAL.resetCreateData) window.LF_PORTAL.resetCreateData();
    try {
      localStorage.removeItem('lf_create_progress');
      localStorage.removeItem('lf_portal_snapshot');
    } catch (e) {}
    return true;
  };
  const createCompletionRef = useRef(0);
  const completeCreate = async () => {
    const bookId = String(D.book && D.book.id || '');
    const ch = (D.chapters && D.chapters.length ? D.chapters[0].no : 0) || D.book && D.book.chap || 1;
    const epoch = ++createCompletionRef.current;
    const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
    const captured = guard && guard.captureNavigation ? guard.captureNavigation() : () => true;
    const isCurrent = () => !!captured && captured() && epoch === createCompletionRef.current && assistantNavigationStateRef.current.view === 'create' && String(D.book && D.book.id || '') === bookId;
    if (!isCurrent()) return false;
    try {
      if (window.LF_PORTAL.selectChapter && (await window.LF_PORTAL.selectChapter(ch, {
        isCurrent
      })) === false) return false;
      if (!isCurrent()) return false;
      return set({
        view: 'book',
        section: 'workbench',
        tab: 'detail',
        chap: ch,
        createResume: null
      });
    } catch (error) {
      showToast(error.message || TC('book_open_fail'));
      return false;
    }
  };
  const ctl = {
    lang,
    setLang,
    theme,
    setTheme,
    settings: accountSettings,
    updateSettings,
    toast: showToast,
    assistantEnabled,
    onAssistantSettingsChange: assistantAvailability.applySettings,
    onAssistantReference: file => {
      if (!assistantEnabled) {
        showToast(TC('asst_disabled'));
        return;
      }
      const reference = window.AssistantReferenceCore?.reference(file);
      if (!reference || !window.AssistantReferenceCore.readable(file)) return;
      setAssistantDraftRequest({
        id: window.crypto.randomUUID(),
        accountId: assistantAccountId,
        workspaceFiles: [reference]
      });
      setAssistantOpen(true);
    },
    onCustomSettingsAsk: request => {
      if (!assistantEnabled) {
        showToast(TC('asst_disabled'));
        return;
      }
      const prepared = window.CustomSettingsBridge.requestDraft(D.book, request, window.AssistantCiteCore);
      if (!prepared) return;
      const cite = window.LF_ASSISTANT_CITE;
      cite.clear({
        owner: 'custom-settings-page'
      });
      if (prepared.pageContext.resource_key) {
        const identity = {
          bookId: prepared.bookId,
          owner: 'custom-settings-page',
          ...prepared.pageContext
        };
        if (identity.field_path) cite.citeField(identity);else cite.setObject(identity);
      }
      setAssistantOpen(true);
      if (prepared.prompt) setAssistantDraftRequest({
        ...prepared,
        accountId: assistantAccountId,
        id: window.crypto.randomUUID()
      });
    },
    onCreate: async () => {
      /* 作品上限前置校验：点击「新建作品」即检查，不等进向导点「开始铸造」。
         后端不可达 / 接口异常时放行（建书时后端仍会兜底拦截），保持离线不阻塞。 */
      if (window.AssistantNavigation && window.AssistantNavigation.tryEnterCreate) {
        await window.AssistantNavigation.tryEnterCreate({
          enterCreate,
          TC
        });
        return;
      }
      enterCreate();
    },
    onSettings: () => set({
      view: 'book',
      section: 'settings',
      settingsTarget: null
    }),
    onRedeem: () => set({
      view: 'book',
      section: 'settings',
      settingsTarget: {
        section: 'billing',
        focus: 'redeem',
        requestId: window.crypto.randomUUID()
      }
    })
  };
  const navigateFromAssistant = async navigation => {
    const waitForCommit = () => new Promise((resolve, reject) => {
      if (navigationCommitRef.current) navigationCommitRef.current.reject(Object.assign(new Error('Navigation replaced'), {
        code: 'navigation_target_changed'
      }));
      navigationCommitRef.current = {
        resolve,
        reject
      };
    });
    return window.AssistantNavigation.navigateFromAssistant(navigation, {
      getState: () => assistantNavigationStateRef.current,
      getData: () => D,
      set,
      commit: patch => {
        const pending = waitForCommit();
        set(patch);
        return pending;
      },
      TC,
      enterCreate: () => {
        const pending = waitForCommit();
        enterCreate();
        return pending;
      },
      chapterHasGuide
    });
  };
  const openBookFromShelf = async book => {
    return window.AssistantNavigation.openBookFromShelf(book, {
      getData: () => D,
      set,
      TC,
      toast: showToast,
      chapterHasGuide
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: shellRef,
    className: "runtime-admission-shell",
    "data-mobile": mobile ? '' : undefined,
    "data-assistant-launcher": assistantEnabled && assistantAvailability.launcherVisible && !assistantOpen ? 'visible' : undefined
  }, /*#__PURE__*/React.createElement(RuntimeAdmissionBanner, null), /*#__PURE__*/React.createElement("div", {
    className: "runtime-admission-content"
  }, mobile && st.view !== 'create' && /*#__PURE__*/React.createElement(window.MobileConsole, {
    st: st,
    set: set,
    ctl: ctl,
    openBook: openBookFromShelf,
    assistant: {
      enabled: assistantEnabled && assistantAvailability.launcherVisible,
      open: () => setAssistantOpen(true)
    },
    renderBook: () => /*#__PURE__*/React.createElement(BookView, {
      state: st,
      set: set,
      ctl: ctl,
      toast: showToast
    })
  }), !mobile && st.view === 'shelf' && /*#__PURE__*/React.createElement(ShelfView, {
    ctl: ctl,
    onOpen: openBookFromShelf
  }), !mobile && st.view === 'book' && /*#__PURE__*/React.createElement(BookView, {
    state: st,
    set: set,
    ctl: ctl,
    toast: showToast
  }), st.view === 'create' && /*#__PURE__*/React.createElement(CreateFlow, {
    ctl: ctl,
    resume: st.createResume,
    onClose: () => st.createResume && st.createResume.returnSection ? set({
      view: 'book',
      section: st.createResume.returnSection,
      createResume: null
    }) : set({
      view: 'shelf',
      createResume: null
    }),
    onDone: completeCreate
  })), !mobile && assistantEnabled && assistantAvailability.launcherVisible && !assistantOpen ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "asst-launch",
    "aria-label": TC('assistant'),
    title: TC('assistant'),
    onClick: () => setAssistantOpen(true)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "sparkle",
    s: 21
  })) : null, window.AssistantDrawer ? /*#__PURE__*/React.createElement(window.AssistantDrawer, {
    key: assistantAccountId || 'anonymous',
    accountId: assistantAccountId,
    draftRequest: assistantDraftRequest,
    onDraftRequestConsumed: id => setAssistantDraftRequest(current => current && current.id === id ? null : current),
    open: assistantOpen,
    onClose: () => setAssistantOpen(false),
    book: assistantPageBookId(st) ? D.book : null,
    pageContext: assistantPageContext(st, assistantCitation),
    toast: showToast,
    onActionComplete: refreshAssistantTarget,
    onNavigate: navigateFromAssistant,
    onDockLayoutChange: syncAssistantDockLayout
  }) : null, toast && /*#__PURE__*/React.createElement("div", {
    className: "c-toast",
    role: "status",
    "aria-live": "polite"
  }, toast), !mobile && /*#__PURE__*/React.createElement(BgTaskCard, null), window.BookDataQuoteHost ? /*#__PURE__*/React.createElement(window.BookDataQuoteHost, null) : null, assistantAccountId && window.InboxNotificationPopup ? /*#__PURE__*/React.createElement(window.InboxNotificationPopup, {
    key: assistantAccountId,
    accountId: assistantAccountId
  }) : null);
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(ConsoleApp, null));
}
