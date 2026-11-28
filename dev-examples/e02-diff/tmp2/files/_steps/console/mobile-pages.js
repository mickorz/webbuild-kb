{
/* Phone first-level pages that have no desktop equivalent layout: the shelf list and the "me" page.
   Data and actions come from the same console state and handlers as desktop. */
(function () {
  const {
    useState
  } = React;
  const D = window.CONSOLE_DATA,
    L = window.L,
    TC = window.TC;
  const en = () => window.CLANG === 'en';
  // Only a parsed genre is shown; the raw field carries its label, or a generic placeholder when empty.
  const genre = book => book && Array.isArray(book.genre_parts) && book.genre_parts.length ? L(book.genre_parts[0].value) : '';
  const tint = t => t === 'gold' ? 'linear-gradient(150deg,oklch(0.72 0.13 72),oklch(0.58 0.14 45))' : t === 'slate' ? 'linear-gradient(150deg,oklch(0.6 0.05 250),oklch(0.42 0.05 255))' : t === 'terra' ? 'linear-gradient(150deg,oklch(0.62 0.15 38),oklch(0.5 0.13 28))' : 'var(--ink-2)';
  function MobileShelf({
    onOpen,
    ctl
  }) {
    const Kit = window.LFMobileKit;
    const [menuBook, setMenuBook] = useState(null);
    const [editBook, setEditBook] = useState(null);
    const [exportBook, setExportBook] = useState(null);
    const books = (D.shelf || []).filter(book => !(book.status && book.status.zh === 'new'));
    if (!books.length) return /*#__PURE__*/React.createElement("div", {
      className: "m-empty"
    }, /*#__PURE__*/React.createElement("p", null, en() ? 'No works yet' : '还没有作品'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      onClick: () => ctl.onCreate()
    }, TC('new_book')));
    return /*#__PURE__*/React.createElement("div", {
      className: "m-shelf"
    }, books.map((book, index) => /*#__PURE__*/React.createElement("article", {
      key: book.id || index,
      className: "m-book"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-book-open",
      onClick: () => onOpen(book)
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-book-cover c-serif",
      style: {
        background: tint(book.tint)
      },
      "aria-hidden": "true"
    }, L(book.title)), /*#__PURE__*/React.createElement("span", {
      className: "m-book-main"
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-book-title c-serif"
    }, "\u300A", L(book.title), "\u300B"), genre(book) ? /*#__PURE__*/React.createElement("span", {
      className: "m-book-meta"
    }, genre(book)) : null, /*#__PURE__*/React.createElement("span", {
      className: "m-book-meta"
    }, book.chap, " ", en() ? 'ch' : '章', " \xB7 ", L(book.words), " ", TC('words_unit'), book.latest_chapter_title ? ' · ' + book.latest_chapter_title : ''), book.cur ? /*#__PURE__*/React.createElement("span", {
      className: "c-badge gold m-book-badge"
    }, "\u25CF ", TC('writing_now')) : null)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-icon-button",
      "aria-label": (en() ? 'Actions for ' : '作品操作：') + L(book.title),
      onClick: () => setMenuBook(book)
    }, "\u22EF"))), /*#__PURE__*/React.createElement(Kit.Drawer, {
      open: !!menuBook,
      placement: "bottom",
      title: menuBook ? '《' + L(menuBook.title) + '》' : '',
      onClose: () => setMenuBook(null)
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-action-list"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        setEditBook(menuBook);
        setMenuBook(null);
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "pen",
      s: 18
    }), TC('edit_book')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        setExportBook(menuBook);
        setMenuBook(null);
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "download",
      s: 18
    }), en() ? 'Export' : '导出'))), editBook && /*#__PURE__*/React.createElement(BookEditModal, {
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

  /** Credits and plan from the same billing overview as the desktop avatar popover. */
  function CreditCard({
    nav
  }) {
    const Avatar = window.LFAvatar;
    const [view, setView] = useState({
      status: 'loading',
      data: null
    });
    const load = () => {
      if (!Avatar || !Avatar.fetchOverview) {
        setView({
          status: 'error',
          data: null
        });
        return () => {};
      }
      let live = true;
      setView(current => ({
        status: 'loading',
        data: current.data
      }));
      Avatar.fetchOverview().then(data => {
        if (live) setView({
          status: data ? 'ready' : 'error',
          data
        });
      }, () => {
        if (live) setView(current => ({
          status: 'error',
          data: current.data
        }));
      });
      return () => {
        live = false;
      };
    };
    React.useEffect(load, []);
    const data = view.data,
      format = value => Avatar.core.formatCredits(value, en() ? 'en' : 'zh');
    const sub = data && data.subscription;
    const plan = sub && (typeof sub.plan_name === 'object' && sub.plan_name ? sub.plan_name[en() ? 'en' : 'zh'] || sub.plan_name.zh : sub.plan_name || sub.plan_code);
    const total = data ? [sub && sub.available_millis, data.activity && data.activity.available_millis, data.permanent && data.permanent.available_millis].reduce((sum, value) => sum + (Number(value) || 0), 0) : null;
    const reset = data ? Avatar.core.countdown(sub && sub.reset_at, Avatar.core.calibratedNow(data.server_now, Date.now(), Date.now()), en() ? 'en' : 'zh') : '';
    return /*#__PURE__*/React.createElement("section", {
      className: "m-card m-credits",
      "aria-label": en() ? 'Credits' : '笔力',
      "aria-busy": view.status === 'loading'
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-progress-top"
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-card-title"
    }, en() ? 'Credits' : '笔力'), plan ? /*#__PURE__*/React.createElement("span", {
      className: "c-badge gold"
    }, plan) : null), data ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "m-credits-total c-latin"
    }, format(total)), /*#__PURE__*/React.createElement("div", {
      className: "m-muted"
    }, [en() ? 'Plan ' + format(sub.available_millis) : '订阅 ' + format(sub.available_millis), data.activity ? (en() ? 'Promo ' : '活动 ') + format(data.activity.available_millis) : '', data.permanent ? (en() ? 'Extra ' : '加量 ') + format(data.permanent.available_millis) : ''].filter(Boolean).join(' · '), reset && reset !== '—' ? ' · ' + reset : '')) : /*#__PURE__*/React.createElement("div", {
      className: "m-muted",
      role: "status"
    }, view.status === 'error' ? /*#__PURE__*/React.createElement(React.Fragment, null, en() ? 'Credits are unavailable.' : '笔力读取失败。', /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-link",
      onClick: load
    }, en() ? 'Retry' : '重试')) : en() ? 'Loading…' : '读取中…'), /*#__PURE__*/React.createElement("div", {
      className: "m-continue-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      onClick: () => nav.openSettings('billing', {
        focus: 'redeem'
      })
    }, en() ? 'Redeem CDK' : '兑换 CDK'), /*#__PURE__*/React.createElement("a", {
      className: "c-btn gold",
      href: "/site/pricing.html"
    }, en() ? 'Plans & credits' : '充值 / 升级')));
  }
  function MobileMine({
    ctl,
    nav
  }) {
    const user = D.user || {};
    const sections = [['profile', 'set_profile'], ['billing', 'set_billing'], ['invite', 'set_invite'], ['prefs', 'set_prefs'], ['notifications', 'set_notifications'], ['security', 'set_security'], ['api_keys', 'set_api_keys']];
    const Row = ({
      label,
      onClick,
      children
    }) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-row",
      onClick: onClick
    }, /*#__PURE__*/React.createElement("span", null, label), children, /*#__PURE__*/React.createElement("span", {
      className: "m-row-chevron",
      "aria-hidden": "true"
    }, "\u203A"));
    return /*#__PURE__*/React.createElement("div", {
      className: "m-mine"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-profile",
      onClick: () => nav.openSettings('profile')
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-profile-seal c-serif"
    }, user.seal || '砚'), /*#__PURE__*/React.createElement("span", {
      className: "m-profile-main"
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-profile-name"
    }, L(user.penName)), /*#__PURE__*/React.createElement("span", {
      className: "m-profile-handle"
    }, user.handle)), /*#__PURE__*/React.createElement("span", {
      className: "m-row-chevron",
      "aria-hidden": "true"
    }, "\u203A")), /*#__PURE__*/React.createElement(CreditCard, {
      nav: nav
    }), /*#__PURE__*/React.createElement("div", {
      className: "m-group"
    }, sections.map(([key, label]) => /*#__PURE__*/React.createElement(Row, {
      key: key,
      label: TC(label),
      onClick: () => nav.openSettings(key)
    }))), /*#__PURE__*/React.createElement("div", {
      className: "m-group"
    }, /*#__PURE__*/React.createElement(Row, {
      label: TC('assistant'),
      onClick: () => nav.openMine('assistant')
    }), /*#__PURE__*/React.createElement("div", {
      className: "m-row m-row-static"
    }, /*#__PURE__*/React.createElement("span", null, en() ? 'Language' : '语言'), /*#__PURE__*/React.createElement(LangSeg, {
      lang: ctl.lang,
      setLang: ctl.setLang
    })), /*#__PURE__*/React.createElement("div", {
      className: "m-row m-row-static"
    }, /*#__PURE__*/React.createElement("span", null, en() ? 'Theme' : '主题'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => ctl.setTheme(ctl.theme === 'dark' ? 'light' : 'dark')
    }, ctl.theme === 'dark' ? en() ? 'Dark' : '深色' : en() ? 'Light' : '浅色'))), user.isAdmin || user.isPartner ? /*#__PURE__*/React.createElement("div", {
      className: "m-group"
    }, user.isAdmin || user.isPartner ? /*#__PURE__*/React.createElement(Row, {
      label: TC('partnership'),
      onClick: () => nav.openMine('partnerships')
    }) : null, user.isAdmin ? /*#__PURE__*/React.createElement(Row, {
      label: TC('adm_title'),
      onClick: () => nav.openMine('admin')
    }) : null) : null);
  }
  window.MobileShelf = MobileShelf;
  window.MobileMine = MobileMine;
})();
}
