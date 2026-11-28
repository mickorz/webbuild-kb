{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* ===== 控制台共享组件（双语） ===== */
const D = window.CONSOLE_DATA;
const L = window.L,
  TC = window.TC;
const PATHS = {
  file: 'M14 3H5v18h14V8z M14 3v5h5 M8 12h8 M8 16h6',
  image: 'M3 4h18v16H3z M3 16l5-5 4 4 3-3 6 6 M16 8h.01',
  shelf: 'M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M4 19h16M8 3v16M8 7h12M8 12h12',
  book: 'M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z M18 17H6',
  agents: 'M9 7a3 3 0 1 0 0-.01M17 9a2.5 2.5 0 1 0 0-.01M5 20c0-3 2-5 4-5s4 2 4 5M14 20c0-2.2 1.5-4 3-4s3 1.8 3 4',
  world: 'M12 3v18M3 12h18M12 3a9 9 0 0 1 0 18 9 9 0 0 1 0-18 M5 7c4 2 10 2 14 0 M5 17c4-2 10-2 14 0',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L14.5 2h-5l-.3 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.5L3 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h5l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.5L19 13z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-4-4',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  layers: 'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5 M3 17l9 5 9-5',
  caret: 'M9 6l6 6-6 6',
  run: 'M5 3l14 9-14 9z',
  check: 'M20 6L9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  pen: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  hook: 'M18 4v8a6 6 0 0 1-12 0V8 M6 8a2 2 0 1 0 0-.01',
  peak: 'M3 20h18 M6 20l5-12 3 6 2-4 5 10',
  door: 'M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17 M4 21h16 M12 12h.01',
  link: 'M9 12a3 3 0 0 1 3-3h3a3 3 0 0 1 0 6h-1 M15 12a3 3 0 0 1-3 3H9a3 3 0 0 1 0-6h1',
  scale: 'M12 3v18 M7 7h10 M7 7l-3 7a3 3 0 0 0 6 0z M17 7l-3 7a3 3 0 0 0 6 0z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  close: 'M6 6l12 12M18 6L6 18',
  send: 'M22 2L11 13 M22 2l-7 20-4-9-9-4z',
  stop: 'M7 7h10v10H7z',
  dock: 'M4 4h16v16H4z M15 4v16',
  float: 'M5 7V4h15v15h-3 M4 9h13v11H4z',
  copy: 'M9 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 21h16',
  upload: 'M12 16V4 M8 8l4-4 4 4 M4 20h16',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0',
  trash: 'M3 6h18 M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2 M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6'
};
function Icon({
  n,
  s = 20,
  w = 1.7
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: w,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: PATHS[n]
  }));
}
window.Icon = Icon;
function ConfirmDialog({
  open,
  title,
  message,
  children,
  cancelLabel,
  confirmLabel,
  onClose,
  onConfirm,
  confirmDisabled = false,
  tone = 'default',
  icon = 'bolt',
  initialFocusRef = null,
  className = '',
  footerStart = null
}) {
  const dialogRef = React.useRef(null),
    cancelRef = React.useRef(null),
    returnFocusRef = React.useRef(null),
    onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const dialogId = React.useId().replace(/:/g, '');
  const titleId = dialogId + '-title',
    messageId = dialogId + '-message';
  React.useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement;
    const focusTimer = setTimeout(() => {
      const target = initialFocusRef && initialFocusRef.current;
      if (target && !target.disabled) target.focus();else if (cancelRef.current) cancelRef.current.focus();
    }, 0);
    const onKeyDown = event => {
      const dialogs = document.querySelectorAll('.c-confirm-dialog');
      if (dialogs.length && dialogs[dialogs.length - 1] !== dialogRef.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary,[tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      const target = returnFocusRef.current;
      if (target && target.isConnected) setTimeout(() => target.focus(), 0);
    };
  }, [open, initialFocusRef]);
  if (!open) return null;
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "c-confirm-scrim",
    onMouseDown: event => event.target === event.currentTarget && onClose()
  }, /*#__PURE__*/React.createElement("section", {
    className: 'c-confirm-dialog ' + tone + (className ? ' ' + className : ''),
    ref: dialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": titleId,
    "aria-describedby": message ? messageId : undefined
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-confirm-head"
  }, icon && /*#__PURE__*/React.createElement("span", {
    className: "c-confirm-icon",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: icon,
    s: 16
  })), /*#__PURE__*/React.createElement("h2", {
    id: titleId
  }, title)), message && /*#__PURE__*/React.createElement("p", {
    id: messageId
  }, message), children && /*#__PURE__*/React.createElement("div", {
    className: "c-confirm-content"
  }, children), /*#__PURE__*/React.createElement("div", {
    className: "c-confirm-actions"
  }, footerStart && /*#__PURE__*/React.createElement("div", {
    className: "c-confirm-footer-start"
  }, footerStart), /*#__PURE__*/React.createElement("button", {
    type: "button",
    ref: cancelRef,
    className: "c-btn",
    onClick: onClose
  }, cancelLabel), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: 'c-btn ' + (tone === 'danger' ? 'danger' : 'gold'),
    onClick: onConfirm,
    disabled: confirmDisabled
  }, confirmLabel)))), document.fullscreenElement || document.body);
}
window.ConfirmDialog = ConfirmDialog;
function avTint(t) {
  return t === 'gold' ? 'var(--gold-deep)' : t === 'terra' ? 'var(--terra)' : t === 'slate' ? 'var(--slate)' : 'var(--gold-deep)';
}
window.avTint = avTint;
function VolCard() {
  const v = D.volumes && D.volumes.length ? D.volumes.find(x => x.state === 'active') : null;
  if (!v) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "c-volcard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-dot active"
  }), /*#__PURE__*/React.createElement("span", {
    className: "c-latin",
    style: {
      fontStyle: 'italic',
      color: 'var(--gold-deep)',
      fontSize: 13
    }
  }, L(v.no)), /*#__PURE__*/React.createElement("span", {
    className: "nm"
  }, L(v.name)), /*#__PURE__*/React.createElement("span", {
    className: "c-badge gold"
  }, TC('cur_vol')), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontSize: 12,
      color: 'var(--ink-3)'
    }
  }, L(v.range))), /*#__PURE__*/React.createElement("p", null, L(v.gist)));
}
window.VolCard = VolCard;
function ChapterList({
  compact
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: compact ? 2 : 8
    }
  }, D.chapters.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.no,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 13,
      padding: compact ? '9px 12px' : '12px 16px',
      background: c.state === 'writing' ? 'var(--gold-wash)' : 'var(--card)',
      border: '1px solid ' + (c.state === 'writing' ? 'var(--gold-soft)' : 'var(--line)'),
      borderRadius: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: 'c-dot ' + c.state
  }), /*#__PURE__*/React.createElement("span", {
    className: "c-latin",
    style: {
      color: 'var(--ink-3)',
      fontSize: 13,
      minWidth: 30
    }
  }, c.no), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      fontSize: 13.5,
      minWidth: 64,
      color: c.state === 'todo' ? 'var(--ink-3)' : 'var(--ink)'
    }
  }, L(c.title)), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 12.5,
      color: 'var(--ink-2)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, L(c.gist)), c.state === 'writing' && /*#__PURE__*/React.createElement("span", {
    className: "c-badge terra"
  }, TC('writing_badge')), c.words && /*#__PURE__*/React.createElement("span", {
    className: "c-latin",
    style: {
      fontSize: 12,
      color: 'var(--ink-3)',
      minWidth: 34,
      textAlign: 'right'
    }
  }, c.words))));
}
window.ChapterList = ChapterList;

/* ---- 单章细纲 子组件 ---- */
function TensionMeter() {
  const v = D.detail.tension;
  const band = TC('tband')[Math.min(4, Math.floor((v - 1) / 20))];
  return /*#__PURE__*/React.createElement("div", {
    className: "c-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-stat-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-stat-lab"
  }, TC('tension')), /*#__PURE__*/React.createElement("span", {
    className: "c-latin c-stat-num"
  }, v, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--ink-3)'
    }
  }, "/100"))), /*#__PURE__*/React.createElement("div", {
    className: "c-tmeter"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: v + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "c-stat-sub"
  }, band));
}
function AnchorGrid() {
  const a = D.detail.anchors;
  const rows = [['hook', 'hook'], ['peak', 'climax'], ['door', 'close'], ['link', 'nextlink']];
  return /*#__PURE__*/React.createElement("div", {
    className: "c-anchorgrid"
  }, rows.map(([ic, key]) => /*#__PURE__*/React.createElement("div", {
    key: key,
    className: "c-anchor"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ah"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ai"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: ic,
    s: 15
  })), TC(key)), /*#__PURE__*/React.createElement("p", null, L(a[key])))));
}
function PlotPoints() {
  return /*#__PURE__*/React.createElement("ol", {
    className: "c-plot"
  }, D.detail.points.map((p, i) => {
    const s = L(p).split('→');
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      className: "c-plot-item"
    }, /*#__PURE__*/React.createElement("span", {
      className: "pn c-latin"
    }, i + 1), /*#__PURE__*/React.createElement("span", {
      className: "pt"
    }, s[0], /*#__PURE__*/React.createElement("span", {
      className: "arr"
    }, "\u2192"), /*#__PURE__*/React.createElement("b", null, s[1])));
  }));
}
function Foreshadow() {
  const m = {
    new: 'op_new',
    adv: 'op_adv',
    pay: 'op_pay'
  };
  const cls = {
    new: 'terra',
    adv: 'slate',
    pay: 'gold'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "c-fsd-list"
  }, D.detail.foreshadow.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "c-fsd"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'c-badge ' + cls[f.op]
  }, TC(m[f.op])), /*#__PURE__*/React.createElement("span", {
    className: "c-latin fid"
  }, f.id), /*#__PURE__*/React.createElement("span", {
    className: "ft"
  }, L(f.t), f.when && /*#__PURE__*/React.createElement("span", {
    className: "fw"
  }, " \xB7 ", L(f.when))))));
}
function Debts() {
  return /*#__PURE__*/React.createElement("div", {
    className: "c-fsd-list"
  }, D.detail.debts.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "c-fsd"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'c-badge ' + (d.op === 'new' ? 'terra' : 'gold')
  }, TC(d.op === 'new' ? 'debt_new' : 'debt_pay')), /*#__PURE__*/React.createElement("span", {
    className: "ft"
  }, L(d.t), /*#__PURE__*/React.createElement("span", {
    className: "fw"
  }, " \xB7 ", L(d.who))))));
}
function InfoBound() {
  const d = D.detail;
  return /*#__PURE__*/React.createElement("div", {
    className: "c-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-ib know"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ibh"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "eye",
    s: 14
  }), TC('know')), d.know.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ibr"
  }, L(x)))), /*#__PURE__*/React.createElement("div", {
    className: "c-ib dont"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ibh"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "eye",
    s: 14
  }), TC('dontknow')), d.dontknow.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ibr"
  }, L(x)))));
}
function WorldCalls() {
  return /*#__PURE__*/React.createElement("div", {
    className: "c-calls"
  }, D.detail.calls.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "c-call"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ck"
  }, L(c.k)), /*#__PURE__*/React.createElement("span", {
    className: 'cv ' + c.t
  }, L(c.v)))));
}
window.WorldCalls = WorldCalls;
function AgentRun() {
  return /*#__PURE__*/React.createElement("div", {
    className: "c-agents-run"
  }, D.detail.agents.map((a, i) => {
    const nm = L(a);
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, /*#__PURE__*/React.createElement("span", {
      className: "c-arun"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ad"
    }, nm[0]), nm), i < D.detail.agents.length - 1 && /*#__PURE__*/React.createElement("span", {
      className: "arrow"
    }, "\u2192"));
  }));
}
window.AgentRun = AgentRun;

// full 单章细纲 body (per user's markdown format)
function DetailOutline(props) {
  props = props || {};
  const d = D.detail;
  const no = props.no || d.no;
  const title = props.title || L(d.title);
  return /*#__PURE__*/React.createElement("div", {
    className: "c-detail"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-secrow",
    style: {
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-latin",
    style: {
      color: 'var(--gold-deep)',
      fontStyle: 'italic'
    }
  }, TC('chap') === 'ch.' ? 'ch.' + no : '第 ' + no + ' 章'), /*#__PURE__*/React.createElement("span", {
    className: "c-h",
    style: {
      fontSize: 20
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    className: "c-badge gold"
  }, TC('detail_badge'))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--ink-3)',
      marginTop: 5
    }
  }, L(d.status))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: props.onRegen
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 13
  }), TC('regen')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold",
    onClick: props.onRun
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "run",
    s: 14,
    w: 2
  }), TC('run_write')))), /*#__PURE__*/React.createElement("div", {
    className: "c-statstrip"
  }, /*#__PURE__*/React.createElement(TensionMeter, null), /*#__PURE__*/React.createElement("div", {
    className: "c-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-stat-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-stat-lab"
  }, TC('target')), /*#__PURE__*/React.createElement("span", {
    className: "c-latin c-stat-num tgt"
  }, d.target)), /*#__PURE__*/React.createElement("div", {
    className: "c-stat-sub"
  }, TC('words_unit'))), /*#__PURE__*/React.createElement("div", {
    className: "c-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-stat-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-stat-lab"
  }, TC('worldtime'))), /*#__PURE__*/React.createElement("div", {
    className: "c-stat-big c-latin"
  }, L(d.worldtime)))), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('pos')), /*#__PURE__*/React.createElement("div", {
    className: "c-lead"
  }, L(d.pos))), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('anchors')), /*#__PURE__*/React.createElement(AnchorGrid, null)), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('dilemma')), /*#__PURE__*/React.createElement("div", {
    className: "c-dilemma"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dq"
  }, '“'), L(d.dilemma), '”')), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('plotpts'), /*#__PURE__*/React.createElement("span", {
    className: "c-note"
  }, TC('plotpts_note'))), /*#__PURE__*/React.createElement(PlotPoints, null)), /*#__PURE__*/React.createElement("div", {
    className: "c-2col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('foreshadow')), /*#__PURE__*/React.createElement(Foreshadow, null)), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('debts')), /*#__PURE__*/React.createElement(Debts, null))), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('infobound')), /*#__PURE__*/React.createElement(InfoBound, null)), /*#__PURE__*/React.createElement("div", {
    className: "c-2col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('world_calls')), /*#__PURE__*/React.createElement(WorldCalls, null)), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('agent_line')), /*#__PURE__*/React.createElement(AgentRun, null))));
}
window.DetailOutline = DetailOutline;

// world-state sidebar inner (writing screens)
function WorldSideInner() {
  const s = D.prose.side;
  const wsm = D.wsm || {};
  const forces = Array.isArray(wsm.forces) ? wsm.forces : [];
  const under = Array.isArray(wsm.undercurrents) ? wsm.undercurrents : [];
  const oncam = Array.isArray(wsm.on_camera) ? wsm.on_camera : [];
  const offcam = Array.isArray(wsm.off_camera) ? wsm.off_camera : [];
  const dl = {
    near: 'dist_near',
    mid: 'dist_mid',
    far: 'dist_far'
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "c-wsec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('relations')), (s.relations || []).map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "c-rel"
  }, /*#__PURE__*/React.createElement("span", {
    className: "a"
  }, L(r.a)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-3)'
    }
  }, "\u2014"), /*#__PURE__*/React.createElement("span", {
    className: "a"
  }, L(r.b)), /*#__PURE__*/React.createElement("span", {
    className: 's ' + r.t
  }, L(r.s))))), !!forces.length && /*#__PURE__*/React.createElement("div", {
    className: "c-wsec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('wsm_forces')), forces.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "c-rel"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'wsm-dist ' + (f.distance || 'mid')
  }, TC(dl[f.distance] || 'dist_mid')), /*#__PURE__*/React.createElement("span", {
    className: "a"
  }, L(f.name)), /*#__PURE__*/React.createElement("span", {
    className: "s"
  }, L(f.status))))), !!under.length && /*#__PURE__*/React.createElement("div", {
    className: "c-wsec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('wsm_under')), under.map((u, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "c-rel wsm-uder"
  }, /*#__PURE__*/React.createElement("span", {
    className: "a"
  }, L(u.name)), /*#__PURE__*/React.createElement("span", {
    className: "s"
  }, L(u.status)), u.last && /*#__PURE__*/React.createElement("span", {
    className: "c-latin"
  }, u.last)))), !!oncam.length && /*#__PURE__*/React.createElement("div", {
    className: "c-wsec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--gold)',
      marginRight: 6,
      verticalAlign: 'middle'
    }
  }), TC('wsm_oncam')), oncam.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "c-rel"
  }, /*#__PURE__*/React.createElement("span", {
    className: "s"
  }, L(e))))), !!offcam.length && /*#__PURE__*/React.createElement("div", {
    className: "c-wsec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: 7,
      height: 7,
      borderRadius: '50%',
      border: '1.5px solid var(--ink-3)',
      marginRight: 6,
      verticalAlign: 'middle'
    }
  }), TC('wsm_offcam')), offcam.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "c-rel"
  }, /*#__PURE__*/React.createElement("span", {
    className: "s",
    style: {
      color: 'var(--ink-3)'
    }
  }, L(e))))));
}
window.WorldSideInner = WorldSideInner;
function WorldSide() {
  const hostRef = React.useRef(null);
  const layout = window.CreationLayout.useWorldSideLayout(hostRef);
  const {
    open,
    stacked,
    closing,
    width,
    toggle,
    setWidth
  } = layout;
  return /*#__PURE__*/React.createElement("div", {
    ref: hostRef,
    className: 'c-worldhost' + (stacked ? ' is-stacked' : '')
  }, !open ? /*#__PURE__*/React.createElement("button", {
    className: "c-sidestrip right",
    onClick: toggle,
    title: TC('world_expand')
  }, /*#__PURE__*/React.createElement("span", {
    className: "ss-caret flip"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  })), /*#__PURE__*/React.createElement("span", {
    className: "ss-ic"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-dot active"
  })), /*#__PURE__*/React.createElement("span", {
    className: "ss-tx"
  }, TC('world_label'))) : /*#__PURE__*/React.createElement("div", {
    className: 'c-worldside' + (closing ? ' closing' : ''),
    style: stacked ? undefined : {
      width
    }
  }, window.ResizeHandle && /*#__PURE__*/React.createElement(window.ResizeHandle, {
    side: "left",
    getWidth: () => width,
    setWidth: setWidth,
    min: 220,
    max: 400,
    onDouble: () => setWidth(260)
  }), /*#__PURE__*/React.createElement("div", {
    className: "wh"
  }, /*#__PURE__*/React.createElement("span", {
    className: "t"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-dot active"
  }), TC('side_world')), /*#__PURE__*/React.createElement("span", {
    className: "wh-right"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-badge gold"
  }, TC('chap') === 'ch.' ? 'ch.' + (D.prose && D.prose.no || 0) : '第 ' + (D.prose && D.prose.no || 0) + ' 章'), /*#__PURE__*/React.createElement("button", {
    className: "c-sidecollapse inline",
    onClick: toggle,
    title: TC('world_collapse')
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 14,
    w: 2
  })))), /*#__PURE__*/React.createElement("div", {
    className: "scroll"
  }, /*#__PURE__*/React.createElement(WorldSideInner, null))));
}
window.WorldSide = WorldSide;

/* ---- 世界观维度 · 富字段块渲染（世界页 reader / 建书 detail 共用） ----
   block 类型：text 长文 / cards 结构卡组（rows 或 d）/ list 条目 / rel 势力关系 */
function ClampText({
  text,
  lines,
  className
}) {
  lines = lines || 8;
  const ref = React.useRef(null);
  const [over, setOver] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* 新版 Chrome 的 line-clamp 行为下 scrollHeight 会随裁切收缩，
       须临时解除 clamp 量取全文高度再比较 */
    const prev = el.style.webkitLineClamp;
    el.style.webkitLineClamp = 'unset';
    const full = el.scrollHeight;
    el.style.webkitLineClamp = prev;
    setOver(full > el.clientHeight + 2);
  }, [text, lines]);
  return /*#__PURE__*/React.createElement("div", {
    className: className
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: 'dbk-clamp' + (open ? ' open' : ''),
    style: open ? undefined : {
      WebkitLineClamp: lines
    }
  }, text), (over || open) && /*#__PURE__*/React.createElement("button", {
    className: "dbk-xp",
    onClick: () => setOpen(!open)
  }, open ? TC('xp_less') : TC('xp_more')));
}
window.ClampText = ClampText;
const CARD_READER_LAYOUT_KEY = 'lf_card_reader_layout';
function initialCardReaderLayout() {
  try {
    return localStorage.getItem(CARD_READER_LAYOUT_KEY) === 'top' ? 'top' : 'side';
  } catch (e) {
    return 'side';
  }
}
function orderCardRows(rows, rowOrder) {
  if (!Array.isArray(rowOrder) || !rowOrder.length) return rows;
  const positions = new Map(rowOrder.map((key, index) => [key, index]));
  return rows.map((row, index) => ({
    row,
    index,
    position: positions.has(row && row.key) ? positions.get(row.key) : rowOrder.length + index
  })).sort((a, b) => a.position - b.position || a.index - b.index).map(item => item.row);
}
function sameCardReaderValue(left, right) {
  if (left === right) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch (e) {
    return false;
  }
}
function cardReaderRowKey(row, index) {
  return row && row.key != null ? String(row.key) : row && row.k ? L(row.k) : String(index);
}
function ContentActionButton({
  variant = 'utility',
  icon,
  active,
  className = '',
  children,
  ...props
}) {
  const classes = 'c-content-action ' + variant + (active ? ' active' : '') + (className ? ' ' + className : '');
  const pressed = props['aria-pressed'] != null ? props['aria-pressed'] : active == null ? undefined : !!active;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button"
  }, props, {
    className: classes,
    "aria-pressed": pressed
  }), icon && /*#__PURE__*/React.createElement(Icon, {
    n: icon,
    s: variant === 'primary' ? 12 : 11,
    w: variant === 'primary' ? 2.2 : undefined
  }), " ", children);
}
function EditActionButton({
  title,
  className = '',
  ...props
}) {
  const label = L({
    zh: '编辑',
    en: 'Edit'
  });
  return /*#__PURE__*/React.createElement(ContentActionButton, _extends({}, props, {
    variant: "edit",
    icon: "pen",
    className: className,
    title: L(title || {
      zh: '编辑本区块',
      en: 'Edit section'
    })
  }), label);
}
function DoneActionButton({
  saving = false,
  className = '',
  ...props
}) {
  return /*#__PURE__*/React.createElement(ContentActionButton, _extends({}, props, {
    variant: "primary",
    icon: "check",
    className: className
  }), saving ? L({
    zh: '保存中…',
    en: 'Saving…'
  }) : L({
    zh: '完成',
    en: 'Done'
  }));
}
function ContentToolbar({
  title,
  className = '',
  actionsClassName = '',
  children
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: 'c-content-toolbar' + (className ? ' ' + className : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-content-toolbar-title"
  }, title), children && /*#__PURE__*/React.createElement("div", {
    className: 'c-content-toolbar-actions' + (actionsClassName ? ' ' + actionsClassName : '')
  }, children));
}
window.ContentActionButton = ContentActionButton;
window.EditActionButton = EditActionButton;
window.DoneActionButton = DoneActionButton;
window.ContentToolbar = ContentToolbar;
function orderCardReviewFields(fields, rowOrder) {
  if (!Array.isArray(rowOrder) || !rowOrder.length) return fields;
  const positions = new Map(rowOrder.map((key, index) => [key, index]));
  return fields.map((field, index) => ({
    field,
    index,
    position: positions.has(field.row && field.row.key) ? positions.get(field.row.key) : rowOrder.length + index
  })).sort((a, b) => a.position - b.position || a.index - b.index).map(item => item.field);
}
function cardReaderReviewFields(card, reviewRow, rowOrder) {
  const rows = orderCardRows(Array.isArray(card && card.rows) ? card.rows : [], rowOrder);
  if (!reviewRow || reviewRow.kind === 'equal') return rows.map(row => ({
    kind: 'equal',
    row
  }));
  if (reviewRow.kind === 'add' || reviewRow.kind === 'remove') return rows.map(row => ({
    kind: reviewRow.kind,
    row
  }));
  const beforeRows = Array.isArray(reviewRow.before && reviewRow.before.rows) ? reviewRow.before.rows : [];
  const beforeMap = new Map(beforeRows.map((row, index) => [cardReaderRowKey(row, index), row]));
  const used = new Set();
  const result = rows.map((row, index) => {
    const key = cardReaderRowKey(row, index),
      before = beforeMap.get(key);
    if (!before) return {
      kind: 'add',
      row
    };
    used.add(key);
    return {
      kind: sameCardReaderValue(before.v, row.v) ? 'equal' : 'change',
      row,
      before
    };
  });
  beforeRows.forEach((row, index) => {
    const key = cardReaderRowKey(row, index);
    if (!used.has(key)) result.push({
      kind: 'remove',
      row
    });
  });
  return orderCardReviewFields(result, rowOrder);
}
function CardReaderValue({
  row,
  reviewField
}) {
  const Diff = window.LF_REWRITE_DIFF;
  if (reviewField && reviewField.kind === 'change' && Diff && Diff.TextChange) {
    return /*#__PURE__*/React.createElement(Diff.TextChange, {
      before: reviewField.before.v,
      after: row.v
    });
  }
  return Array.isArray(row.v) ? /*#__PURE__*/React.createElement("ul", {
    className: "dbk-card-reader-list"
  }, row.v.map((x, j) => /*#__PURE__*/React.createElement("li", {
    key: j
  }, L(x)))) : /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-value"
  }, L(row.v));
}
function CardReaderRows({
  card,
  rowOrder,
  reviewRow
}) {
  const fields = cardReaderReviewFields(card, reviewRow, rowOrder);
  const labels = {
    change: L({
      zh: '修改',
      en: 'Changed'
    }),
    add: L({
      zh: '新增',
      en: 'Added'
    }),
    remove: L({
      zh: '删除',
      en: 'Removed'
    })
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-fields"
  }, card && card.d && /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-desc"
  }, L(card.d)), fields.map((field, i) => {
    const r = field.row;
    return /*#__PURE__*/React.createElement("div", {
      key: cardReaderRowKey(r, i),
      className: 'dbk-card-reader-row dbk-card-review-row ' + field.kind
    }, /*#__PURE__*/React.createElement("div", {
      className: "dbk-card-reader-label"
    }, L(r.k)), /*#__PURE__*/React.createElement(CardReaderValue, {
      row: r,
      reviewField: field
    }), field.kind !== 'equal' && /*#__PURE__*/React.createElement("span", {
      className: 'dbk-card-review-field-kind ' + field.kind
    }, labels[field.kind]));
  }));
}
function CardReaderTitle({
  card,
  reviewRow
}) {
  const Diff = window.LF_REWRITE_DIFF;
  if (reviewRow && reviewRow.kind === 'change' && Diff && Diff.TextChange && !sameCardReaderValue(reviewRow.before && reviewRow.before.t, reviewRow.after && reviewRow.after.t)) {
    return /*#__PURE__*/React.createElement(Diff.TextChange, {
      before: reviewRow.before.t,
      after: reviewRow.after.t
    });
  }
  return L(card.t);
}
function CardReaderArticle({
  card,
  reviewRow,
  rowOrder,
  compact
}) {
  const kind = reviewRow && reviewRow.kind !== 'equal' ? reviewRow.kind : '';
  const labels = {
    change: L({
      zh: '修改',
      en: 'Changed'
    }),
    add: L({
      zh: '新增',
      en: 'Added'
    }),
    remove: L({
      zh: '删除',
      en: 'Removed'
    })
  };
  const articleClass = (compact ? 'dbk-card-reader-card' : 'dbk-card-reader-detail') + (kind ? ' dbk-card-review-item ' + kind : '');
  const headClass = compact ? 'dbk-card-reader-card-head' : 'dbk-card-reader-detail-head';
  return /*#__PURE__*/React.createElement("article", {
    className: articleClass
  }, /*#__PURE__*/React.createElement("div", {
    className: headClass
  }, /*#__PURE__*/React.createElement("h3", {
    className: "c-serif"
  }, /*#__PURE__*/React.createElement(CardReaderTitle, {
    card: card,
    reviewRow: reviewRow
  })), card.tag && /*#__PURE__*/React.createElement("span", {
    className: "dbk-tag"
  }, L(card.tag)), kind && /*#__PURE__*/React.createElement("span", {
    className: 'dbk-card-review-kind ' + kind
  }, labels[kind])), /*#__PURE__*/React.createElement(CardReaderRows, {
    card: card,
    rowOrder: rowOrder,
    reviewRow: reviewRow
  }));
}
function cardCollectionUsesFixedRows(items) {
  if (!Array.isArray(items) || !items.length) return true;
  const keys = card => Array.isArray(card && card.rows) ? card.rows.map((row, index) => cardReaderRowKey(row, index)) : [];
  const reference = keys(items[0]);
  return items.every(card => {
    const current = keys(card);
    return current.length === reference.length && current.every((key, index) => key === reference[index]);
  });
}
function useCardCollectionState({
  count,
  initialViewState,
  initiallyExpanded = false
}) {
  const [selected, setSelected] = React.useState(() => initialViewState && Number.isInteger(initialViewState.selected) ? initialViewState.selected : 0);
  const [layout, setLayout] = React.useState(() => initialViewState && ['side', 'top'].includes(initialViewState.layout) ? initialViewState.layout : initialCardReaderLayout());
  // Phone frame (FD-176): card collections open stacked, since a tab grid beside one card does not fit a phone.
  const onPhone = !!(window.MobileLayoutCore && window.MobileLayoutCore.matches(window.matchMedia && window.matchMedia.bind(window)));
  const [expanded, setExpanded] = React.useState(() => initialViewState && typeof initialViewState.expanded === 'boolean' ? initialViewState.expanded : initiallyExpanded || onPhone);
  React.useEffect(() => {
    if (selected < 0) setSelected(0);else if (selected >= count) setSelected(Math.max(0, count - 1));
  }, [selected, count]);
  const chooseLayout = next => {
    setLayout(next);
    try {
      localStorage.setItem(CARD_READER_LAYOUT_KEY, next);
    } catch (e) {}
  };
  return {
    selected,
    setSelected,
    layout,
    chooseLayout,
    expanded,
    setExpanded
  };
}
function CardCollectionControls({
  expanded,
  layout,
  onLayoutChange,
  onExpandedChange,
  showLayout = true,
  showExpanded = true,
  onMouseDown,
  onDoubleClick,
  expandedLabel,
  collapsedLabel
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, showLayout && /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-layout",
    role: "group",
    "aria-label": L({
      zh: '卡片阅读布局',
      en: 'Card reading layout'
    }),
    onMouseDown: onMouseDown,
    onDoubleClick: onDoubleClick
  }, /*#__PURE__*/React.createElement(ContentActionButton, {
    active: !expanded && layout === 'side',
    disabled: expanded,
    onClick: () => onLayoutChange('side')
  }, L({
    zh: '侧栏',
    en: 'Side'
  })), /*#__PURE__*/React.createElement(ContentActionButton, {
    active: !expanded && layout === 'top',
    disabled: expanded,
    onClick: () => onLayoutChange('top')
  }, L({
    zh: '顶部',
    en: 'Top'
  }))), showExpanded && /*#__PURE__*/React.createElement(ContentActionButton, {
    active: expanded,
    className: "dbk-card-reader-expand",
    onMouseDown: onMouseDown,
    onDoubleClick: onDoubleClick,
    onClick: () => onExpandedChange(!expanded)
  }, expanded ? L(collapsedLabel || {
    zh: '单项阅读',
    en: 'Read one'
  }) : L(expandedLabel || {
    zh: '全部展开',
    en: 'Expand all'
  })));
}
function renderCardCollectionBody({
  items,
  selected,
  onSelect,
  expanded,
  expandedVariant = 'uniform',
  columns,
  getTitle,
  getKey,
  renderCard,
  itemKinds,
  showIndexNumbers = true
}) {
  const list = Array.isArray(items) ? items : [];
  const multi = list.length > 1;
  const active = list[selected] || list[0];
  const activeIndex = list[selected] ? selected : 0;
  const kindLabels = {
    change: L({
      zh: '修改',
      en: 'Changed'
    }),
    add: L({
      zh: '新增',
      en: 'Added'
    }),
    remove: L({
      zh: '删除',
      en: 'Removed'
    })
  };
  if (!list.length) return /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-empty"
  }, L({
    zh: '暂无条目',
    en: 'No items yet'
  }));
  if (expanded) {
    const className = (expandedVariant === 'waterfall' ? 'dbk-card-reader-waterfall' : 'dbk-card-reader-grid') + (columns === 1 ? ' one' : '');
    return /*#__PURE__*/React.createElement("div", {
      className: className
    }, list.map((item, index) => renderCard(item, index, {
      compact: true,
      kind: itemKinds && itemKinds[index]
    })));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-body"
  }, multi && /*#__PURE__*/React.createElement("nav", {
    className: 'dbk-card-reader-index' + (showIndexNumbers ? '' : ' no-numbers'),
    "aria-label": L({
      zh: '卡片目录',
      en: 'Card index'
    })
  }, list.map((item, index) => {
    const kind = itemKinds && itemKinds[index];
    return /*#__PURE__*/React.createElement("button", {
      key: getKey ? getKey(item, index) : index,
      type: "button",
      className: (index === activeIndex ? 'on' : '') + (kind && kind !== 'equal' ? ' dbk-card-review-item ' + kind : ''),
      "aria-pressed": index === activeIndex,
      title: getTitle(item, index),
      onDoubleClick: event => event.stopPropagation(),
      onClick: () => onSelect(index)
    }, showIndexNumbers && /*#__PURE__*/React.createElement("span", {
      className: "dbk-card-reader-no c-latin"
    }, String(index + 1).padStart(2, '0')), /*#__PURE__*/React.createElement("span", {
      className: "dbk-card-reader-name"
    }, getTitle(item, index)), kind && kind !== 'equal' && /*#__PURE__*/React.createElement("span", {
      className: 'dbk-card-review-kind ' + kind
    }, kindLabels[kind]));
  })), renderCard(active, activeIndex, {
    compact: false,
    kind: itemKinds && itemKinds[activeIndex]
  }));
}
function CardCollection({
  items,
  selected,
  onSelect,
  expanded,
  layout,
  onLayoutChange,
  onExpandedChange,
  title,
  actions,
  leadingActions,
  className = '',
  editing = false,
  reviewing = false,
  fitContent = false,
  expandedVariant = 'uniform',
  columns,
  getTitle,
  getKey,
  renderCard,
  itemKinds,
  onControlMouseDown,
  onControlDoubleClick,
  body,
  footer,
  multi: multiOverride,
  showLayoutControls = true,
  allowExpanded = true,
  showIndexNumbers = true
}) {
  const list = Array.isArray(items) ? items : [];
  const multi = typeof multiOverride === 'boolean' ? multiOverride : list.length > 1;
  return /*#__PURE__*/React.createElement("section", {
    className: 'dbk-card-reader c-content-toolbar-owner ' + (editing ? 'editing ' : '') + (reviewing ? 'reviewing ' : '') + layout + (expanded ? ' expanded' : '') + (!multi ? ' single' : '') + (fitContent ? ' fit-content' : '') + (className ? ' ' + className : '')
  }, /*#__PURE__*/React.createElement(ContentToolbar, {
    className: "dbk-card-reader-head",
    title: title,
    actionsClassName: "dbk-card-reader-actions"
  }, leadingActions, multi && (showLayoutControls || allowExpanded) && /*#__PURE__*/React.createElement(CardCollectionControls, {
    expanded: expanded,
    layout: layout,
    onLayoutChange: onLayoutChange,
    onExpandedChange: onExpandedChange,
    showLayout: showLayoutControls,
    showExpanded: allowExpanded,
    onMouseDown: onControlMouseDown,
    onDoubleClick: onControlDoubleClick,
    expandedLabel: {
      zh: '全部展开',
      en: 'Expand all'
    },
    collapsedLabel: editing ? {
      zh: '单项编辑',
      en: 'Edit one'
    } : {
      zh: '单项阅读',
      en: 'Read one'
    }
  }), actions), body === undefined ? renderCardCollectionBody({
    items: list,
    selected,
    onSelect,
    expanded,
    expandedVariant,
    columns,
    getTitle,
    getKey,
    renderCard,
    itemKinds,
    showIndexNumbers
  }) : body, footer);
}
function CardReaderContent({
  block,
  items,
  selected,
  onSelect,
  expanded,
  rowOrder,
  reviewRows
}) {
  const expandedVariant = block.expandedVariant || (cardCollectionUsesFixedRows(items) ? 'uniform' : 'waterfall');
  const itemKinds = reviewRows && reviewRows.map(row => row.kind);
  return renderCardCollectionBody({
    items,
    selected,
    onSelect,
    expanded,
    expandedVariant,
    columns: block.cols,
    getTitle: card => L(card.t),
    renderCard: (card, index, {
      compact
    }) => /*#__PURE__*/React.createElement(CardReaderArticle, {
      key: index,
      card: card,
      reviewRow: reviewRows && reviewRows[index],
      rowOrder: rowOrder,
      compact: compact
    }),
    itemKinds
  });
}
function StructuredCardReader({
  block,
  head,
  onEdit,
  editDisabled,
  rowOrder,
  initialViewState,
  review
}) {
  const items = Array.isArray(block.items) ? block.items : [];
  const [originalSelected, setOriginalSelected] = React.useState(() => initialViewState && Number.isInteger(initialViewState.selected) ? initialViewState.selected : 0);
  const beforeItems = review && review.beforeBlock && Array.isArray(review.beforeBlock.items) ? review.beforeBlock.items : [];
  const Core = window.LF_REWRITE_DIFF_CORE;
  const reviewRows = React.useMemo(() => review && Core && Core.cardOps ? Core.cardOps(beforeItems, items) : [], [review, beforeItems, items]);
  const reviewItems = reviewRows.map(row => row.after || row.before);
  const view = useCardCollectionState({
    count: review ? reviewItems.length : items.length,
    initialViewState
  });
  const {
    selected,
    setSelected,
    layout,
    chooseLayout,
    expanded,
    setExpanded
  } = view;
  React.useEffect(() => {
    if (originalSelected >= beforeItems.length) setOriginalSelected(0);
  }, [originalSelected, beforeItems.length]);
  const multi = (review ? Math.max(reviewItems.length, beforeItems.length) : items.length) > 1;
  const stopDouble = e => e.stopPropagation();
  const body = review ? /*#__PURE__*/React.createElement("div", {
    className: "cr-rdiff-inline dbk-card-review-inline"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-rdiff-inline-stack dbk-card-review-stack"
  }, /*#__PURE__*/React.createElement("div", {
    className: 'cr-rdiff-inline-pane' + (review.showOriginal ? '' : ' active'),
    "aria-hidden": review.showOriginal
  }, /*#__PURE__*/React.createElement(CardReaderContent, {
    block: block,
    items: reviewItems,
    selected: selected,
    onSelect: setSelected,
    expanded: expanded,
    rowOrder: rowOrder,
    reviewRows: reviewRows
  })), /*#__PURE__*/React.createElement("div", {
    className: 'cr-rdiff-inline-pane cr-rdiff-original' + (review.showOriginal ? ' active' : ''),
    "aria-hidden": !review.showOriginal
  }, /*#__PURE__*/React.createElement(CardReaderContent, {
    block: review.beforeBlock || block,
    items: beforeItems,
    selected: originalSelected,
    onSelect: setOriginalSelected,
    expanded: expanded,
    rowOrder: rowOrder
  })))) : /*#__PURE__*/React.createElement(CardReaderContent, {
    block: block,
    items: items,
    selected: selected,
    onSelect: setSelected,
    expanded: expanded,
    rowOrder: rowOrder
  });
  return /*#__PURE__*/React.createElement(CardCollection, {
    items: review ? reviewItems : items,
    selected: selected,
    onSelect: setSelected,
    expanded: expanded,
    layout: layout,
    onLayoutChange: chooseLayout,
    onExpandedChange: setExpanded,
    title: head,
    reviewing: !!review,
    multi: multi,
    leadingActions: review && /*#__PURE__*/React.createElement("span", {
      className: "cr-wbe-review-state",
      role: "status",
      "aria-live": "polite"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 11,
      w: 2.2
    }), L({
      zh: 'AI 已改写',
      en: 'AI rewritten'
    })),
    actions: review ? review.controls : onEdit && /*#__PURE__*/React.createElement(EditActionButton, {
      className: "dbk-card-reader-edit",
      disabled: editDisabled,
      onDoubleClick: stopDouble,
      onClick: () => onEdit({
        layout,
        expanded,
        selected
      })
    }),
    onControlDoubleClick: stopDouble,
    body: body
  });
}
window.CardCollection = CardCollection;
window.useCardCollectionState = useCardCollectionState;
window.StructuredCardReader = StructuredCardReader;
function resizeAutoGrowTextarea(node) {
  if (!node) return;
  // Measuring a shorter textarea can clamp every scrollable ancestor to the top.
  // Restore their offsets before paint; the final height still shrinks on deletion.
  const positions = [];
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    if (parent.scrollTop || parent.scrollLeft) positions.push([parent, parent.scrollTop, parent.scrollLeft]);
  }
  const style = window.getComputedStyle(node);
  const px = value => parseFloat(value) || 0;
  const adjustment = style.boxSizing === 'border-box' ? px(style.borderTopWidth) + px(style.borderBottomWidth) : -px(style.paddingTop) - px(style.paddingBottom);
  node.style.height = 'auto';
  node.style.height = node.scrollHeight + adjustment + 'px';
  positions.forEach(([parent, top, left]) => {
    parent.scrollTop = top;
    parent.scrollLeft = left;
  });
}
window.resizeAutoGrowTextarea = resizeAutoGrowTextarea;
const AutoGrowTextarea = React.forwardRef(function AutoGrowTextarea({
  className = '',
  value,
  onChange,
  ...props
}, forwardedRef) {
  const innerRef = React.useRef(null);
  const setRef = React.useCallback(node => {
    innerRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  React.useLayoutEffect(() => resizeAutoGrowTextarea(innerRef.current), [value]);
  return /*#__PURE__*/React.createElement("textarea", _extends({}, props, {
    ref: setRef,
    className: (className ? className + ' ' : '') + 'c-auto-grow-textarea',
    rows: 1,
    value: value,
    onChange: event => {
      resizeAutoGrowTextarea(event.target);
      if (onChange) onChange(event);
    }
  }));
});
window.AutoGrowTextarea = AutoGrowTextarea;
const DetailTools = window.DetailTools || (({
  children
}) => children || null);
function CharacterProfileHeader({
  value,
  avatar,
  stages,
  onSave,
  onEditStart,
  editDisabled = false,
  loadError = '',
  actions
}) {
  const source = value && typeof value === 'object' ? value : {};
  const current = {
    name: String(L(source.name) || ''),
    role: String(L(source.role) || ''),
    epithet: String(L(source.epithet) || '')
  };
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({
    name: current.name,
    role: current.role
  });
  React.useEffect(() => editing && onEditStart ? onEditStart() : undefined, [editing, onEditStart]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const selfEditable = typeof onSave === 'function';
  const beginEdit = () => {
    setDraft({
      name: current.name,
      role: current.role
    });
    setError('');
    setEditing(true);
  };
  const closeEdit = () => {
    setEditing(false);
    setError('');
  };
  const finishEdit = async () => {
    if (saving) return;
    const next = {
      name: String(draft.name || '').trim(),
      role: String(draft.role || '').trim()
    };
    if (!next.name) {
      setError(L({
        zh: '角色名不能为空',
        en: 'Character name is required'
      }));
      return;
    }
    if (next.name === current.name && next.role === current.role) {
      closeEdit();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch (e) {
      setError(String(e && e.message || e || L({
        zh: '保存失败',
        en: 'Save failed'
      })));
    } finally {
      setSaving(false);
    }
  };
  const failed = !!(error || loadError);
  return /*#__PURE__*/React.createElement("div", {
    className: 'c-character-header cr-dp-head' + (selfEditable ? ' self-editable c-editable-surface c-editable-outset' : '') + (editing ? ' editing' : '') + (failed ? ' err' : '') + (saved ? ' saved' : '')
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-dp-av",
    style: avatar && avatar.style
  }, avatar && avatar.text), /*#__PURE__*/React.createElement("div", {
    className: "cr-dp-htext"
  }, editing ? /*#__PURE__*/React.createElement("div", {
    className: "c-character-header-fields"
  }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, L({
    zh: '姓名',
    en: 'Name'
  })), /*#__PURE__*/React.createElement("input", {
    value: draft.name,
    onChange: event => setDraft(previous => ({
      ...previous,
      name: event.target.value
    }))
  })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, L({
    zh: '定位',
    en: 'Role'
  })), /*#__PURE__*/React.createElement("input", {
    value: draft.role,
    onChange: event => setDraft(previous => ({
      ...previous,
      role: event.target.value
    }))
  }))) : /*#__PURE__*/React.createElement("div", {
    className: "cr-dp-title c-serif"
  }, current.name, /*#__PURE__*/React.createElement("span", {
    className: "cr-dp-role"
  }, current.role, current.epithet ? ' · ' + current.epithet : '')), /*#__PURE__*/React.createElement("div", {
    className: "cr-dp-meta"
  }, stages), (error || loadError) && /*#__PURE__*/React.createElement("div", {
    className: "c-character-header-error",
    role: "alert"
  }, error || loadError)), !editing && actions && /*#__PURE__*/React.createElement("div", {
    className: "c-character-header-actions"
  }, actions), selfEditable && (editing ? /*#__PURE__*/React.createElement(DoneActionButton, {
    className: "c-character-header-done",
    saving: saving,
    disabled: saving,
    onMouseDown: event => event.preventDefault(),
    onClick: finishEdit
  }) : /*#__PURE__*/React.createElement(DetailTools, null, /*#__PURE__*/React.createElement(EditActionButton, {
    className: "cr-wbe-edit c-character-header-edit",
    disabled: editDisabled,
    onClick: beginEdit,
    title: {
      zh: '编辑姓名与定位',
      en: 'Edit name and role'
    }
  }))), saved && !editing && /*#__PURE__*/React.createElement("span", {
    className: "cr-wbe-flash"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 11,
    w: 2.4
  }), L({
    zh: '已保存',
    en: 'Saved'
  })));
}
window.CharacterProfileHeader = CharacterProfileHeader;
function LeadText({
  value,
  onSave,
  editDisabled = false,
  loadError = '',
  editTitle,
  renderEditActions,
  actionPending = false,
  saved = false,
  rewritten = false,
  onEditStart
}) {
  const localized = L(value);
  const current = localized == null ? '' : String(localized);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const selfEditable = typeof onSave === 'function';
  const dirty = editing && draft.trim() !== current;
  React.useEffect(() => editing && onEditStart ? onEditStart() : undefined, [editing, onEditStart]);
  const beginEdit = () => {
    setDraft(current);
    setError('');
    setEditing(true);
  };
  const closeEdit = () => {
    setEditing(false);
    setError('');
  };
  const finishEdit = async () => {
    if (saving || actionPending) return;
    const next = draft.trim();
    if (next === current) {
      closeEdit();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      setEditing(false);
    } catch (e) {
      setError(String(e && e.message || e || L({
        zh: '保存失败',
        en: 'Save failed'
      })));
    } finally {
      setSaving(false);
    }
  };
  const failed = !!(error || loadError);
  const rootClass = 'c-lead-text' + (selfEditable ? ' cr-wbe c-editable-surface c-editable-outset lead-reading self-editable' : '') + (editing ? ' editing' : '') + (failed ? ' err' : '') + (saved ? ' saved' : '') + (rewritten ? ' rewritten' : '');
  return /*#__PURE__*/React.createElement("div", {
    className: rootClass
  }, editing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "cr-wbe-ehead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dbk-k"
  }, L(editTitle || {
    zh: '一句话立意',
    en: 'One-line premise'
  })), /*#__PURE__*/React.createElement("span", {
    className: "cr-wbe-spacer"
  }), renderEditActions && renderEditActions({
    dirty,
    close: closeEdit
  }), /*#__PURE__*/React.createElement(DoneActionButton, {
    saving: saving,
    disabled: saving || actionPending,
    onMouseDown: event => event.preventDefault(),
    onClick: finishEdit
  })), /*#__PURE__*/React.createElement("textarea", {
    className: "se-ta c-lead-text-input",
    rows: "3",
    value: draft,
    onChange: event => setDraft(event.target.value),
    "aria-label": L(editTitle || {
      zh: '一句话立意',
      en: 'One-line premise'
    })
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "cr-dp-lead"
  }, current), selfEditable && /*#__PURE__*/React.createElement(EditActionButton, {
    className: "cr-wbe-edit",
    disabled: editDisabled,
    onClick: beginEdit
  })), (error || loadError) && /*#__PURE__*/React.createElement("div", {
    className: "c-lead-text-error",
    role: "alert"
  }, error || loadError), saved && !editing && /*#__PURE__*/React.createElement("span", {
    className: "cr-wbe-flash"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 11,
    w: 2.4
  }), L({
    zh: '已保存',
    en: 'Saved'
  })));
}
window.LeadText = LeadText;
function structuredListValue(value) {
  const localized = L(value);
  if (localized == null) return '';
  if (typeof localized !== 'object') return String(localized);
  const children = Array.isArray(localized) ? localized : Object.values(localized);
  return children.map(structuredListValue).filter(Boolean).join(' · ');
}
function StructuredListRow({
  mode,
  row,
  index,
  onRemove,
  removeDisabled,
  editing,
  onValueChange,
  renderEditValue
}) {
  const isKv = mode === 'kv';
  const label = isKv ? row.label != null ? row.label : row.key : index + 1;
  const value = isKv ? row.value : row;
  const InlineEditor = editing && window.LF_EDIT && window.LF_EDIT.LeafText;
  const keyStyle = isKv && row.keyColor ? {
    '--structured-list-key-color': row.keyColor
  } : undefined;
  const rowClass = 'c-structured-list-row' + (isKv && row.variant ? ' ' + row.variant : '');
  return /*#__PURE__*/React.createElement("div", {
    className: rowClass,
    role: "listitem"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'c-structured-list-key' + (isKv ? '' : ' c-latin'),
    style: keyStyle
  }, L(label)), /*#__PURE__*/React.createElement("div", {
    className: "c-structured-list-value"
  }, editing ? renderEditValue ? renderEditValue(value, row, index, next => onValueChange(index, next)) : InlineEditor ? /*#__PURE__*/React.createElement(InlineEditor, {
    value: value,
    onChange: next => onValueChange(index, next)
  }) : /*#__PURE__*/React.createElement(AutoGrowTextarea, {
    className: "c-structured-list-input",
    value: value == null ? '' : String(value),
    onChange: event => onValueChange(index, event.target.value),
    "aria-label": L(isKv ? label : {
      zh: '第 ' + (index + 1) + ' 条',
      en: 'Item ' + (index + 1)
    })
  }) : structuredListValue(value)), !isKv && onRemove && /*#__PURE__*/React.createElement(ContentActionButton, {
    variant: "remove",
    className: "c-structured-list-remove",
    disabled: removeDisabled,
    onClick: () => onRemove(index),
    title: L({
      zh: '删除本条',
      en: 'Delete'
    }),
    "aria-label": L({
      zh: '删除第 ' + (index + 1) + ' 条',
      en: 'Delete item ' + (index + 1)
    })
  }, "\xD7"));
}
function StructuredList({
  mode = 'list',
  layout = 'stack',
  items,
  addLabel,
  onSave,
  editDisabled = false,
  loadError = '',
  header,
  editTitle,
  editHint,
  embedded = false,
  onDraftChange,
  renderEditValue,
  renderEditActions,
  actionPending = false,
  saved = false,
  rewritten = false,
  onEditStart,
  controlled = false,
  createItem,
  minItems = 0,
  maxItems = Infinity
}) {
  const isKv = mode === 'kv';
  const rows = isKv ? Array.isArray(items) ? items : Object.entries(items || {}).map(([key, value]) => ({
    key,
    label: key,
    value
  })) : Array.isArray(items) ? items : [];
  const cloneRows = () => isKv ? rows.map(row => Object.assign({}, row)) : rows.slice();
  const [editing, setEditing] = React.useState(!!embedded);
  const [draft, setDraft] = React.useState(() => embedded ? cloneRows() : []);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const selfEditable = typeof onSave === 'function';
  const activeRows = embedded && controlled ? rows : editing ? draft : rows;
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(rows);
  React.useEffect(() => editing && onEditStart ? onEditStart() : undefined, [editing, onEditStart]);
  const beginEdit = () => {
    setDraft(cloneRows());
    setError('');
    setEditing(true);
  };
  const emitDraft = next => {
    setDraft(next);
    if (embedded && onDraftChange) onDraftChange(next);
  };
  const changeValue = (index, value) => emitDraft(activeRows.map((row, rowIndex) => rowIndex !== index ? row : isKv ? Object.assign({}, row, {
    value
  }) : value));
  const removeDraft = index => {
    if (activeRows.length > minItems) emitDraft(activeRows.filter((_, rowIndex) => rowIndex !== index));
  };
  const addDraft = () => {
    if (activeRows.length < maxItems) emitDraft(activeRows.concat([createItem ? createItem() : '']));
  };
  const closeEdit = () => {
    setEditing(false);
    setError('');
  };
  const finishEdit = async () => {
    if (saving || actionPending) return;
    const next = isKv ? draft : draft.filter(value => String(value == null ? '' : value).trim());
    if (JSON.stringify(next) === JSON.stringify(rows)) {
      closeEdit();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      setEditing(false);
    } catch (e) {
      setError(String(e && e.message || e || L({
        zh: '保存失败',
        en: 'Save failed'
      })));
    } finally {
      setSaving(false);
    }
  };
  const failed = !!(error || loadError);
  const panel = selfEditable && !embedded && !!header;
  return /*#__PURE__*/React.createElement("div", {
    className: 'c-structured-list ' + mode + ' layout-' + layout + (editing ? ' editing' : '') + (selfEditable ? ' self-editable cr-wbe c-editable-surface' : '') + (panel ? ' c-content-panel c-content-toolbar-owner' : '') + (embedded ? ' embedded' : '') + (failed ? ' err' : '') + (saved ? ' saved' : '') + (rewritten ? ' rewritten' : '')
  }, !editing && (panel ? /*#__PURE__*/React.createElement(ContentToolbar, {
    title: header
  }, /*#__PURE__*/React.createElement(EditActionButton, {
    disabled: editDisabled,
    onClick: beginEdit
  })) : header), selfEditable && !editing && !panel && /*#__PURE__*/React.createElement(EditActionButton, {
    className: "cr-wbe-edit",
    disabled: editDisabled,
    onClick: beginEdit
  }), selfEditable && editing && /*#__PURE__*/React.createElement("div", {
    className: "cr-wbe-ehead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dbk-k"
  }, L(editTitle)), /*#__PURE__*/React.createElement("span", {
    className: "cr-wbe-spacer"
  }), renderEditActions && renderEditActions({
    dirty,
    close: closeEdit
  }), /*#__PURE__*/React.createElement(DoneActionButton, {
    saving: saving,
    disabled: saving || actionPending,
    onMouseDown: event => event.preventDefault(),
    onClick: finishEdit
  })), /*#__PURE__*/React.createElement("div", {
    className: "c-structured-list-rows",
    role: "list"
  }, activeRows.map((row, index) => /*#__PURE__*/React.createElement(StructuredListRow, {
    key: isKv ? row.id || row.key || index : index,
    mode: mode,
    row: row,
    index: index,
    editing: editing,
    onValueChange: changeValue,
    renderEditValue: renderEditValue,
    onRemove: editing && !isKv ? removeDraft : null,
    removeDisabled: activeRows.length <= minItems
  }))), !isKv && editing && /*#__PURE__*/React.createElement(ContentActionButton, {
    variant: "add",
    icon: "plus",
    className: "c-structured-list-add",
    disabled: activeRows.length >= maxItems,
    onClick: addDraft
  }, L(addLabel || {
    zh: '添加一条',
    en: 'Add item'
  })), editing && !embedded && editHint && /*#__PURE__*/React.createElement("div", {
    className: "cr-wbe-acts"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-dp-hint"
  }, L(editHint))), (error || loadError) && /*#__PURE__*/React.createElement("div", {
    className: "c-structured-list-error",
    role: "alert"
  }, error || loadError), saved && !editing && /*#__PURE__*/React.createElement("span", {
    className: "cr-wbe-flash"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 11,
    w: 2.4
  }), L({
    zh: '已保存',
    en: 'Saved'
  })));
}
window.StructuredList = StructuredList;
function TitledTextBlock({
  head,
  text,
  clamp,
  onEdit,
  editDisabled,
  children,
  editing = false,
  actions,
  className = ''
}) {
  const body = children !== undefined ? /*#__PURE__*/React.createElement("div", {
    className: "c-titled-text-body"
  }, children) : clamp ? /*#__PURE__*/React.createElement(ClampText, {
    text: text,
    lines: 6,
    className: "c-titled-text-body"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "c-titled-text-body"
  }, text);
  return /*#__PURE__*/React.createElement("section", {
    className: 'c-titled-text c-content-panel' + (editing ? ' editing' : '') + (onEdit || actions ? ' c-content-toolbar-owner' : '') + (className ? ' ' + className : '')
  }, /*#__PURE__*/React.createElement(ContentToolbar, {
    title: head
  }, actions !== undefined ? actions : onEdit && /*#__PURE__*/React.createElement(EditActionButton, {
    disabled: editDisabled,
    onClick: onEdit
  })), body);
}
window.TitledTextBlock = TitledTextBlock;
function DimBlocks({
  dim,
  tone,
  clamp,
  onEdit,
  editDisabled,
  cardRowOrder,
  initialCardView
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: 'dbk-wrap' + (tone ? ' ' + tone : '')
  }, dim.blocks.map((b, i) => {
    const n = b.items ? b.items.length : 0;
    const head = /*#__PURE__*/React.createElement("div", {
      className: "dbk-h"
    }, /*#__PURE__*/React.createElement("span", {
      className: "dbk-d"
    }), /*#__PURE__*/React.createElement("span", {
      className: "dbk-k"
    }, L(b.k)), n > 0 && /*#__PURE__*/React.createElement("span", {
      className: "dbk-c c-latin"
    }, "\xD7", n));
    if (b.type === 'text') return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "dbk"
    }, /*#__PURE__*/React.createElement(TitledTextBlock, {
      head: head,
      text: L(b.v),
      clamp: clamp,
      onEdit: onEdit,
      editDisabled: editDisabled
    }));
    if (b.type === 'list') return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "dbk"
    }, head, /*#__PURE__*/React.createElement(StructuredList, {
      mode: "list",
      items: b.items
    }));
    if (b.type === 'rel') return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "dbk"
    }, /*#__PURE__*/React.createElement(window.RelationshipMap, {
      head: head,
      items: b.items,
      clamp: clamp,
      onEdit: onEdit,
      editDisabled: editDisabled,
      initialViewState: initialCardView
    }));
    /* cards */
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "dbk"
    }, /*#__PURE__*/React.createElement(StructuredCardReader, {
      block: b,
      head: head,
      onEdit: onEdit,
      editDisabled: editDisabled,
      rowOrder: cardRowOrder,
      initialViewState: initialCardView
    }));
  }));
}
window.DimBlocks = DimBlocks;

/* ===== 角色卡 · 三段式档案（阵容骨架 → 信念生态 → 深层维度）=====
   layers 控制各段显隐：未生成的段显示待生成占位（建书向导分步加载用）；
   世界页阅读器三段全开。waitDepth 可传"正在铸造"文案覆盖默认占位。 */
function CkPending({
  label,
  active
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: 'ck-pending' + (active ? ' active' : '')
  }, active && /*#__PURE__*/React.createElement("span", {
    className: "cr-minibar"
  }, /*#__PURE__*/React.createElement("i", null)), /*#__PURE__*/React.createElement("span", {
    className: active ? 'c-shimmer' : ''
  }, label));
}
function CkSh({
  tone,
  t,
  extra
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ck-sh"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'ck-shd' + (tone ? ' ' + tone : '')
  }), /*#__PURE__*/React.createElement("span", {
    className: "ck-sht"
  }, t), extra && /*#__PURE__*/React.createElement("span", {
    className: "ck-shx c-latin"
  }, extra));
}
window.CkSh = CkSh;
function CharacterIdentityMeta({
  value,
  onSave,
  editDisabled = false,
  loadError = '',
  saved = false,
  rewritten = false,
  actionPending = false,
  renderEditActions
}) {
  const source = value && typeof value === 'object' ? value : {};
  const current = {
    true_name: L(source.true_name) || '',
    aliases: (Array.isArray(source.aliases) ? source.aliases : []).map(item => String(L(item) || '')).filter(Boolean),
    gender: L(source.gender) || '',
    age: L(source.age) || ''
  };
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(current);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [localSaved, setLocalSaved] = React.useState(false);
  const selfEditable = typeof onSave === 'function';
  const beginEdit = () => {
    setDraft({
      ...current,
      aliases: current.aliases.slice()
    });
    setError('');
    setEditing(true);
  };
  const closeEdit = () => {
    setEditing(false);
    setError('');
  };
  const finishEdit = async () => {
    if (saving) return;
    const next = {
      true_name: String(draft.true_name || '').trim(),
      aliases: draft.aliases.map(item => String(item || '').trim()).filter(Boolean),
      gender: String(draft.gender || '').trim(),
      age: String(draft.age || '').trim()
    };
    if (JSON.stringify(next) === JSON.stringify(current)) {
      closeEdit();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      setEditing(false);
      setLocalSaved(true);
      setTimeout(() => setLocalSaved(false), 1600);
    } catch (e) {
      setError(String(e && e.message || e || L({
        zh: '保存失败',
        en: 'Save failed'
      })));
    } finally {
      setSaving(false);
    }
  };
  const failed = !!(error || loadError);
  const dirty = JSON.stringify(draft) !== JSON.stringify(current);
  const field = (key, label, multiline) => multiline ? /*#__PURE__*/React.createElement("label", {
    className: "ck-identity-field wide"
  }, /*#__PURE__*/React.createElement("span", null, L(label)), /*#__PURE__*/React.createElement(AutoGrowTextarea, {
    className: "se-ta",
    value: draft[key],
    onChange: event => setDraft(previous => ({
      ...previous,
      [key]: event.target.value
    }))
  })) : /*#__PURE__*/React.createElement("label", {
    className: "ck-identity-field"
  }, /*#__PURE__*/React.createElement("span", null, L(label)), /*#__PURE__*/React.createElement("input", {
    className: "ck-identity-input",
    value: draft[key],
    onChange: event => setDraft(previous => ({
      ...previous,
      [key]: event.target.value
    }))
  }));
  return /*#__PURE__*/React.createElement("div", {
    className: 'c-character-identity-surface' + (selfEditable ? ' cr-wbe c-editable-surface c-content-panel self-editable' : '') + (editing ? ' editing' : '') + (failed ? ' err' : '') + (saved || localSaved ? ' saved' : '') + (rewritten ? ' rewritten' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: 'ck-meta c-character-identity' + (editing ? ' editing' : '')
  }, editing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "cr-wbe-ehead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dbk-k"
  }, L({
    zh: '角色身份',
    en: 'Character identity'
  })), /*#__PURE__*/React.createElement("span", {
    className: "cr-wbe-spacer"
  }), renderEditActions && renderEditActions({
    dirty,
    close: closeEdit
  }), /*#__PURE__*/React.createElement(DoneActionButton, {
    saving: saving,
    disabled: saving || actionPending,
    onMouseDown: event => event.preventDefault(),
    onClick: finishEdit
  })), /*#__PURE__*/React.createElement("div", {
    className: "ck-identity-editor"
  }, field('true_name', {
    zh: '真名',
    en: 'True name'
  }), field('gender', {
    zh: '性别',
    en: 'Gender'
  }), /*#__PURE__*/React.createElement("div", {
    className: "ck-identity-field wide"
  }, /*#__PURE__*/React.createElement("span", null, L({
    zh: '别称',
    en: 'Aliases'
  })), /*#__PURE__*/React.createElement(StructuredList, {
    mode: "list",
    layout: "compact",
    items: draft.aliases,
    embedded: true,
    onDraftChange: aliases => setDraft(previous => ({
      ...previous,
      aliases
    })),
    addLabel: {
      zh: '添加别称',
      en: 'Add alias'
    }
  })), field('age', {
    zh: '年龄',
    en: 'Age'
  }, true))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "ck-mi"
  }, /*#__PURE__*/React.createElement("i", null, TC('ck_truename')), /*#__PURE__*/React.createElement("b", null, current.true_name || '—')), /*#__PURE__*/React.createElement("span", {
    className: "ck-mi"
  }, /*#__PURE__*/React.createElement("i", null, TC('ck_alias')), /*#__PURE__*/React.createElement("b", null, current.aliases.join(' · ') || '—')), /*#__PURE__*/React.createElement("span", {
    className: "ck-mi"
  }, /*#__PURE__*/React.createElement("i", null, L({
    zh: '性别',
    en: 'Gender'
  })), /*#__PURE__*/React.createElement("b", null, current.gender || '—')), /*#__PURE__*/React.createElement("span", {
    className: "ck-mi ck-mi-age"
  }, /*#__PURE__*/React.createElement("i", null, L({
    zh: '年龄',
    en: 'Age'
  })), /*#__PURE__*/React.createElement("b", null, current.age || '—')), selfEditable && /*#__PURE__*/React.createElement(EditActionButton, {
    className: "cr-wbe-edit",
    disabled: editDisabled,
    onClick: beginEdit,
    title: {
      zh: '编辑角色身份',
      en: 'Edit character identity'
    }
  })), (error || loadError) && /*#__PURE__*/React.createElement("div", {
    className: "ck-identity-error",
    role: "alert"
  }, error || loadError), (saved || localSaved) && !editing && /*#__PURE__*/React.createElement("span", {
    className: "cr-wbe-flash"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 11,
    w: 2.4
  }), L({
    zh: '已保存',
    en: 'Saved'
  }))));
}
window.CharacterIdentityMeta = CharacterIdentityMeta;
function canonicalRelationship(relationship) {
  const source = relationship && typeof relationship === 'object' ? relationship : {};
  const take = (...keys) => {
    for (const key of keys) {
      if (source[key] != null && String(L(source[key])).trim() !== '') return String(L(source[key])).trim();
    }
    return '';
  };
  return {
    target: take('target', 'name', 'to', 'character'),
    nature: take('nature', 'relation', 'type'),
    meaning_to_character: take('meaning_to_character', 'meaning', 'description', 'note'),
    hidden_tension: take('hidden_tension', 'tension', 'tension_point'),
    default_attitude: take('default_attitude', 'attitude')
  };
}
function relationshipGraphPositions(count) {
  if (count === 1) return [{
    x: 18,
    y: 50
  }];
  if (count === 2) return [{
    x: 20,
    y: 29
  }, {
    x: 80,
    y: 71
  }];
  return Array.from({
    length: count
  }, (_, index) => {
    const angle = -Math.PI / 2 + Math.PI * 2 * index / count;
    return {
      x: 50 + 34 * Math.cos(angle),
      y: 50 + 36 * Math.sin(angle)
    };
  });
}
function RelationshipGraph({
  characterName,
  relationships,
  selected,
  onSelect
}) {
  const shown = relationships.slice(0, 8);
  const positions = relationshipGraphPositions(shown.length);
  return /*#__PURE__*/React.createElement("div", {
    className: "c-character-rel-graph",
    "aria-label": L({
      zh: '角色关系图',
      en: 'Character relationship graph'
    })
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    "aria-hidden": "true"
  }, positions.map((position, index) => /*#__PURE__*/React.createElement("line", {
    key: index,
    className: index === selected ? 'selected' : '',
    x1: "50",
    y1: "50",
    x2: position.x,
    y2: position.y
  }))), /*#__PURE__*/React.createElement("div", {
    className: "c-character-rel-center"
  }, /*#__PURE__*/React.createElement("b", null, characterName || '—'), /*#__PURE__*/React.createElement("span", null, L({
    zh: '当前角色',
    en: 'Current'
  }))), shown.map((relationship, index) => {
    const position = positions[index];
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: relationship.target + '-' + index,
      className: 'c-character-rel-node' + (index === selected ? ' selected' : ''),
      style: {
        left: position.x + '%',
        top: position.y + '%'
      },
      "aria-pressed": index === selected,
      onClick: () => onSelect(index)
    }, /*#__PURE__*/React.createElement("b", null, relationship.target || L({
      zh: '未指定',
      en: 'Unassigned'
    })), /*#__PURE__*/React.createElement("span", null, relationship.nature || L({
      zh: '关系未定',
      en: 'Undefined'
    })));
  }), relationships.length > 8 && /*#__PURE__*/React.createElement("span", {
    className: "c-character-rel-more"
  }, "+", relationships.length - 8));
}
function RelationshipEditorRow({
  relationship,
  index,
  characterOptions,
  onChange,
  onRemove
}) {
  const targets = characterOptions.slice();
  if (relationship.target && !targets.some(option => option.value === relationship.target)) targets.unshift({
    value: relationship.target,
    label: relationship.target
  });
  const field = (key, value) => onChange(index, {
    ...relationship,
    [key]: value
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "c-character-rel-edit-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-character-rel-edit-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-character-rel-edit-no c-latin"
  }, index + 1), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, L({
    zh: '关联角色',
    en: 'Character'
  })), /*#__PURE__*/React.createElement("select", {
    value: relationship.target,
    onChange: event => field('target', event.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, L({
    zh: '请选择角色',
    en: 'Select a character'
  })), targets.map(option => /*#__PURE__*/React.createElement("option", {
    key: option.value,
    value: option.value
  }, option.label)))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, L({
    zh: '关系性质',
    en: 'Nature'
  })), /*#__PURE__*/React.createElement("input", {
    value: relationship.nature,
    onChange: event => field('nature', event.target.value)
  })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, L({
    zh: '默认态度',
    en: 'Default attitude'
  })), /*#__PURE__*/React.createElement("input", {
    value: relationship.default_attitude,
    onChange: event => field('default_attitude', event.target.value)
  })), /*#__PURE__*/React.createElement(ContentActionButton, {
    variant: "remove",
    className: "c-character-rel-remove",
    onClick: () => onRemove(index),
    "aria-label": L({
      zh: '删除这段关系',
      en: 'Remove relationship'
    })
  }, "\xD7")), /*#__PURE__*/React.createElement("label", {
    className: "c-character-rel-edit-text"
  }, /*#__PURE__*/React.createElement("span", null, L({
    zh: '对角色的意义',
    en: 'Meaning to character'
  })), /*#__PURE__*/React.createElement(AutoGrowTextarea, {
    className: "se-ta",
    value: relationship.meaning_to_character,
    onChange: event => field('meaning_to_character', event.target.value)
  })), /*#__PURE__*/React.createElement("label", {
    className: "c-character-rel-edit-text"
  }, /*#__PURE__*/React.createElement("span", null, L({
    zh: '隐藏张力',
    en: 'Hidden tension'
  })), /*#__PURE__*/React.createElement(AutoGrowTextarea, {
    className: "se-ta",
    value: relationship.hidden_tension,
    onChange: event => field('hidden_tension', event.target.value)
  })));
}
function CharacterRelationshipNetwork({
  characterName,
  relationships,
  characterOptions = [],
  onSave,
  editDisabled = false,
  loadError = '',
  saved = false,
  rewritten = false,
  actionPending = false,
  renderEditActions
}) {
  const current = (Array.isArray(relationships) ? relationships : []).map(canonicalRelationship);
  const options = characterOptions.map(option => typeof option === 'string' ? {
    value: option,
    label: option
  } : {
    value: String(option.value || ''),
    label: String(option.label || option.value || '')
  }).filter(option => option.value && option.value !== characterName);
  const [selected, setSelected] = React.useState(0);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [localSaved, setLocalSaved] = React.useState(false);
  const selfEditable = typeof onSave === 'function';
  const activeIndex = current.length ? Math.min(selected, current.length - 1) : 0;
  const active = current[activeIndex];
  const beginEdit = () => {
    setDraft(current.map(item => ({
      ...item
    })));
    setError('');
    setEditing(true);
  };
  const changeDraft = (index, next) => setDraft(previous => previous.map((item, itemIndex) => itemIndex === index ? next : item));
  const removeDraft = index => setDraft(previous => previous.filter((_, itemIndex) => itemIndex !== index));
  const addDraft = () => setDraft(previous => {
    const used = new Set(previous.map(item => item.target));
    const target = (options.find(option => !used.has(option.value)) || {}).value || '';
    return previous.concat([{
      target,
      nature: '',
      meaning_to_character: '',
      hidden_tension: '',
      default_attitude: ''
    }]);
  });
  const finishEdit = async () => {
    if (saving) return;
    const next = draft.map(canonicalRelationship).filter(item => item.target);
    const targets = next.map(item => item.target);
    if (new Set(targets).size !== targets.length) {
      setError(L({
        zh: '同一关联角色只能保留一条关系',
        en: 'Keep only one relationship per character'
      }));
      return;
    }
    if (JSON.stringify(next) === JSON.stringify(current)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      setEditing(false);
      setSelected(Math.min(activeIndex, Math.max(0, next.length - 1)));
      setLocalSaved(true);
      setTimeout(() => setLocalSaved(false), 1600);
    } catch (e) {
      setError(String(e && e.message || e || L({
        zh: '保存失败',
        en: 'Save failed'
      })));
    } finally {
      setSaving(false);
    }
  };
  const failed = !!(error || loadError);
  const dirty = JSON.stringify(draft) !== JSON.stringify(current);
  return /*#__PURE__*/React.createElement("div", {
    className: 'ck-sec c-character-relationships' + (selfEditable ? ' cr-wbe c-editable-surface c-content-panel c-content-toolbar-owner self-editable' : '') + (editing ? ' editing' : '') + (failed ? ' err' : '') + (saved || localSaved ? ' saved' : '') + (rewritten ? ' rewritten' : '')
  }, editing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "cr-wbe-ehead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dbk-k"
  }, TC('ck_rels')), /*#__PURE__*/React.createElement("span", {
    className: "cr-wbe-spacer"
  }), renderEditActions && renderEditActions({
    dirty,
    close: () => setEditing(false)
  }), /*#__PURE__*/React.createElement(DoneActionButton, {
    saving: saving,
    disabled: saving || actionPending,
    onMouseDown: event => event.preventDefault(),
    onClick: finishEdit
  })), /*#__PURE__*/React.createElement("div", {
    className: "c-character-rel-editor"
  }, draft.map((relationship, index) => /*#__PURE__*/React.createElement(RelationshipEditorRow, {
    key: index,
    relationship: relationship,
    index: index,
    characterOptions: options,
    onChange: changeDraft,
    onRemove: removeDraft
  }))), /*#__PURE__*/React.createElement(ContentActionButton, {
    variant: "add",
    icon: "plus",
    className: "c-character-rel-add",
    onClick: addDraft
  }, L({
    zh: '添加关系',
    en: 'Add relationship'
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, selfEditable ? /*#__PURE__*/React.createElement(ContentToolbar, {
    title: /*#__PURE__*/React.createElement(CkSh, {
      tone: "slate",
      t: TC('ck_rels'),
      extra: '×' + current.length
    })
  }, /*#__PURE__*/React.createElement(EditActionButton, {
    disabled: editDisabled,
    onClick: beginEdit,
    title: {
      zh: '编辑关系网络',
      en: 'Edit relationships'
    }
  })) : /*#__PURE__*/React.createElement(CkSh, {
    tone: "slate",
    t: TC('ck_rels'),
    extra: '×' + current.length
  }), current.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RelationshipGraph, {
    characterName: characterName,
    relationships: current,
    selected: activeIndex,
    onSelect: setSelected
  }), current.length > 8 && /*#__PURE__*/React.createElement("div", {
    className: "c-character-rel-index"
  }, current.map((relationship, index) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    key: relationship.target + '-' + index,
    className: index === activeIndex ? 'selected' : '',
    onClick: () => setSelected(index)
  }, relationship.target || index + 1))), /*#__PURE__*/React.createElement("div", {
    className: "c-character-rel-detail"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-character-rel-detail-top"
  }, /*#__PURE__*/React.createElement("b", {
    className: "c-serif"
  }, active.target), active.nature && /*#__PURE__*/React.createElement("span", {
    className: "c-badge slate"
  }, active.nature), active.default_attitude && /*#__PURE__*/React.createElement("span", {
    className: "ck-rel-att"
  }, TC('ck_att'), " \xB7 ", active.default_attitude)), active.meaning_to_character && /*#__PURE__*/React.createElement("div", {
    className: "ck-rel-m"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, L({
    zh: '对角色的意义',
    en: 'Meaning to character'
  })), /*#__PURE__*/React.createElement("span", null, active.meaning_to_character)), active.hidden_tension && /*#__PURE__*/React.createElement("div", {
    className: "ck-rel-t"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, L({
    zh: '隐藏张力',
    en: 'Hidden tension'
  })), /*#__PURE__*/React.createElement("span", null, active.hidden_tension)))) : /*#__PURE__*/React.createElement("div", {
    className: "c-character-rel-empty"
  }, L({
    zh: '暂无关系记录',
    en: 'No relationships yet'
  }))), (error || loadError) && /*#__PURE__*/React.createElement("div", {
    className: "c-character-rel-error",
    role: "alert"
  }, error || loadError), (saved || localSaved) && !editing && /*#__PURE__*/React.createElement("span", {
    className: "cr-wbe-flash"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 11,
    w: 2.4
  }), L({
    zh: '已保存',
    en: 'Saved'
  })));
}
window.CharacterRelationshipNetwork = CharacterRelationshipNetwork;
const CHARACTER_BELIEF_PERSPECTIVES = [{
  value: 'right',
  tone: 'gold',
  label: 'ck_p_right'
}, {
  value: 'wrong',
  tone: 'terra',
  label: 'ck_p_wrong'
}, {
  value: 'ambiguous',
  tone: 'slate',
  label: 'ck_p_amb'
}];
function canonicalCharacterBelief(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    core_belief: String(L(source.core_belief) || ''),
    belief_source: String(L(source.belief_source) || ''),
    author_perspective: ['right', 'wrong', 'ambiguous'].includes(source.author_perspective) ? source.author_perspective : 'ambiguous'
  };
}
function CharacterBeliefCard({
  value,
  onSave,
  editDisabled = false,
  loadError = '',
  saved = false,
  rewritten = false,
  actionPending = false,
  renderEditActions
}) {
  const current = canonicalCharacterBelief(value);
  const perspective = CHARACTER_BELIEF_PERSPECTIVES.find(option => option.value === current.author_perspective) || CHARACTER_BELIEF_PERSPECTIVES[2];
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(current);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [localSaved, setLocalSaved] = React.useState(false);
  const selfEditable = typeof onSave === 'function';
  const beginEdit = () => {
    setDraft({
      ...current
    });
    setError('');
    setEditing(true);
  };
  const finishEdit = async () => {
    if (saving) return;
    const next = {
      core_belief: String(draft.core_belief || '').trim(),
      belief_source: String(draft.belief_source || '').trim(),
      author_perspective: draft.author_perspective
    };
    if (JSON.stringify(next) === JSON.stringify(current)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      setEditing(false);
      setLocalSaved(true);
      setTimeout(() => setLocalSaved(false), 1600);
    } catch (e) {
      setError(String(e && e.message || e || L({
        zh: '保存失败',
        en: 'Save failed'
      })));
    } finally {
      setSaving(false);
    }
  };
  const failed = !!(error || loadError);
  const dirty = JSON.stringify(draft) !== JSON.stringify(current);
  return /*#__PURE__*/React.createElement("section", {
    className: 'ck-belief c-content-panel' + (selfEditable ? ' cr-wbe c-editable-surface c-content-toolbar-owner self-editable' : '') + (editing ? ' editing' : '') + (failed ? ' err' : '') + (saved || localSaved ? ' saved' : '') + (rewritten ? ' rewritten' : '')
  }, editing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "cr-wbe-ehead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dbk-k"
  }, TC('ck_belief_core')), /*#__PURE__*/React.createElement("span", {
    className: "cr-wbe-spacer"
  }), renderEditActions && renderEditActions({
    dirty,
    close: () => setEditing(false)
  }), /*#__PURE__*/React.createElement(DoneActionButton, {
    saving: saving,
    disabled: saving || actionPending,
    onMouseDown: event => event.preventDefault(),
    onClick: finishEdit
  })), /*#__PURE__*/React.createElement("div", {
    className: "ck-belief-editor"
  }, /*#__PURE__*/React.createElement("label", {
    className: "ck-belief-field"
  }, /*#__PURE__*/React.createElement("span", null, TC('ck_belief_core')), /*#__PURE__*/React.createElement(AutoGrowTextarea, {
    className: "se-ta ck-belief-input c-serif",
    value: draft.core_belief,
    onChange: event => setDraft(previous => ({
      ...previous,
      core_belief: event.target.value
    }))
  })), /*#__PURE__*/React.createElement("fieldset", {
    className: "ck-belief-perspective"
  }, /*#__PURE__*/React.createElement("legend", null, TC('ck_persp')), /*#__PURE__*/React.createElement("div", {
    className: "ck-belief-options"
  }, CHARACTER_BELIEF_PERSPECTIVES.map(option => /*#__PURE__*/React.createElement("label", {
    key: option.value,
    className: 'ck-belief-option ' + option.tone
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "character-belief-perspective",
    value: option.value,
    checked: draft.author_perspective === option.value,
    onChange: () => setDraft(previous => ({
      ...previous,
      author_perspective: option.value
    }))
  }), /*#__PURE__*/React.createElement("span", null, TC(option.label)))))), /*#__PURE__*/React.createElement("label", {
    className: "ck-belief-field"
  }, /*#__PURE__*/React.createElement("span", null, TC('ck_belief_src')), /*#__PURE__*/React.createElement(AutoGrowTextarea, {
    className: "se-ta ck-belief-input",
    value: draft.belief_source,
    onChange: event => setDraft(previous => ({
      ...previous,
      belief_source: event.target.value
    }))
  })))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ContentToolbar, {
    title: /*#__PURE__*/React.createElement(CkSh, {
      tone: "gold",
      t: TC('ck_belief_core')
    })
  }, selfEditable && /*#__PURE__*/React.createElement(EditActionButton, {
    disabled: editDisabled,
    onClick: beginEdit,
    title: {
      zh: '编辑核心信念',
      en: 'Edit core belief'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "ck-belief-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ck-bq c-serif"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ck-belief-quote"
  }, "\u300C", current.core_belief, "\u300D"), /*#__PURE__*/React.createElement("span", {
    className: 'c-badge ' + perspective.tone
  }, TC('ck_persp'), " \xB7 ", TC(perspective.label))), current.belief_source && /*#__PURE__*/React.createElement("div", {
    className: "ck-bsrc"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, TC('ck_belief_src')), /*#__PURE__*/React.createElement("span", null, current.belief_source)))), (error || loadError) && /*#__PURE__*/React.createElement("div", {
    className: "ck-belief-error",
    role: "alert"
  }, error || loadError), (saved || localSaved) && !editing && /*#__PURE__*/React.createElement("span", {
    className: "cr-wbe-flash"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 11,
    w: 2.4
  }), L({
    zh: '已保存',
    en: 'Saved'
  })));
}
window.CharacterBeliefCard = CharacterBeliefCard;
function CharacterFieldCapability({
  editor,
  kind = 'structured',
  value,
  label,
  children
}) {
  const capability = editor && editor.capability;
  if (!capability || !window.LF_EDIT || !window.LF_EDIT.FieldCapability) {
    return children({
      onSave: editor && editor.onSave,
      saved: false,
      rewritten: false,
      actionPending: false,
      renderEditActions: null
    });
  }
  const FieldCapability = window.LF_EDIT.FieldCapability;
  const capabilityValue = Object.prototype.hasOwnProperty.call(capability, 'value') ? capability.value : value;
  return /*#__PURE__*/React.createElement(FieldCapability, _extends({
    kind: kind,
    value: capabilityValue,
    label: label,
    onCommit: editor.onSave
  }, capability), bindings => children({
    ...bindings,
    onSave: bindings.onSave
  }));
}
function CastProfile({
  c,
  layers,
  waitDepth,
  voice,
  voiceEditor,
  identityEditor,
  positionEditor,
  anchorEditor,
  relationshipsEditor,
  beliefEditor,
  depthEditor
}) {
  const ly = layers || {
    skeleton: true,
    belief: true,
    depth: true
  };
  const d = c.depth;
  const identityValues = identityEditor && identityEditor.values;
  const positionValues = positionEditor && positionEditor.values;
  const anchorValues = anchorEditor && anchorEditor.values;
  const relationshipValues = relationshipsEditor && relationshipsEditor.values;
  const beliefValues = beliefEditor && beliefEditor.values || {
    core_belief: c.belief.core,
    belief_source: c.belief.source,
    author_perspective: c.belief.persp
  };
  const voiceValues = voiceEditor && voiceEditor.values || voice || c.voice;
  const voiceHasContent = !!(window.hasCharacterVoice && window.hasCharacterVoice(voiceValues));
  const voiceCanEdit = !!(voiceEditor && typeof voiceEditor.onSave === 'function');
  const showVoiceProfile = !!(window.CharacterVoiceProfile && (voiceHasContent || voiceCanEdit));
  const positionRows = [{
    key: 'origin_class',
    label: TC('ck_origin'),
    value: positionValues ? positionValues.origin_class : c.pos.origin,
    keyColor: 'var(--slate)'
  }, {
    key: 'affiliation',
    label: TC('ck_aff'),
    value: positionValues ? positionValues.affiliation : c.pos.aff,
    keyColor: 'var(--slate)'
  }, {
    key: 'social_role',
    label: TC('ck_srole'),
    value: positionValues ? positionValues.social_role : c.pos.srole,
    keyColor: 'var(--slate)'
  }, {
    key: 'stance_on_core_conflict',
    label: TC('ck_stance'),
    value: positionValues ? positionValues.stance_on_core_conflict : c.pos.stance,
    keyColor: 'var(--slate)'
  }];
  const anchorRows = [{
    key: 'embodies_rule',
    label: TC('ck_embody'),
    value: anchorValues ? anchorValues.embodies_rule : c.anchor.embody,
    keyColor: 'var(--gold-deep)'
  }, {
    key: 'shaped_by_rule',
    label: TC('ck_shaped'),
    value: anchorValues ? anchorValues.shaped_by_rule : c.anchor.shaped,
    keyColor: 'var(--slate)'
  }, {
    key: 'may_challenge_rule',
    label: TC('ck_challenge'),
    value: anchorValues ? anchorValues.may_challenge_rule : c.anchor.challenge,
    keyColor: 'var(--terra)',
    variant: 'dashed'
  }];
  const depthValues = depthEditor && depthEditor.values || {
    surface_goal: d.desire.surface,
    deep_desire: d.desire.deep,
    deep_fear: {
      fear: d.fear.fear,
      source: d.fear.source
    },
    secrets: {
      content: d.secret.content,
      who_knows: d.secret.knows,
      who_doesnt_know_but_should: d.secret.should,
      exposure_consequence: d.secret.expose
    },
    bottom_line: {
      condition: d.bottom.cond,
      source: d.bottom.source,
      reaction_when_crossed: d.bottom.react
    },
    traumas: {
      wound: d.trauma.wound,
      trigger: d.trauma.trigger,
      stress_response: d.trauma.stress,
      impact_on_behavior: d.trauma.impact
    },
    contradictions: {
      conflicting_elements: d.contra.elements,
      source: d.contra.source,
      possible_direction: d.contra.direction
    },
    arc_description: {
      growth_direction: d.arc.growth,
      corruption_direction: d.arc.fall,
      key_choice: d.arc.choice
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "ckp"
  }, ly.skeleton ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterFieldCapability, {
    editor: identityEditor,
    value: identityValues || {
      true_name: c.true_name,
      aliases: c.aliases,
      gender: c.gender,
      age: c.age
    },
    label: {
      zh: '角色身份',
      en: 'Character identity'
    }
  }, bindings => /*#__PURE__*/React.createElement(CharacterIdentityMeta, _extends({
    value: identityValues || {
      true_name: c.true_name,
      aliases: c.aliases,
      gender: c.gender,
      age: c.age
    }
  }, bindings, {
    editDisabled: !!(identityEditor && identityEditor.disabled),
    loadError: identityEditor && identityEditor.loadError
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ck-sec"
  }, /*#__PURE__*/React.createElement(CharacterFieldCapability, {
    editor: positionEditor,
    value: positionValues || Object.fromEntries(positionRows.map(row => [row.key, row.value])),
    label: TC('ck_pos')
  }, bindings => /*#__PURE__*/React.createElement(StructuredList, _extends({
    mode: "kv",
    layout: "grid",
    items: positionRows
  }, bindings, {
    editDisabled: !!(positionEditor && positionEditor.disabled),
    loadError: positionEditor && positionEditor.loadError,
    header: /*#__PURE__*/React.createElement(CkSh, {
      tone: "slate",
      t: TC('ck_pos')
    }),
    editTitle: TC('ck_pos')
  })))), /*#__PURE__*/React.createElement("div", {
    className: "ck-sec"
  }, /*#__PURE__*/React.createElement(CharacterFieldCapability, {
    editor: anchorEditor,
    value: anchorValues || Object.fromEntries(anchorRows.map(row => [row.key, row.value])),
    label: TC('ck_anchor')
  }, bindings => /*#__PURE__*/React.createElement(StructuredList, _extends({
    mode: "kv",
    items: anchorRows
  }, bindings, {
    editDisabled: !!(anchorEditor && anchorEditor.disabled),
    loadError: anchorEditor && anchorEditor.loadError,
    header: /*#__PURE__*/React.createElement(CkSh, {
      tone: "slate",
      t: TC('ck_anchor')
    }),
    editTitle: TC('ck_anchor'),
    editHint: {
      zh: '点击字段编辑，完成后保存。',
      en: 'Click a field to edit, then choose Done to save.'
    }
  })))), /*#__PURE__*/React.createElement(CharacterFieldCapability, {
    editor: relationshipsEditor,
    value: relationshipValues || c.rels,
    label: TC('ck_rels')
  }, bindings => /*#__PURE__*/React.createElement(CharacterRelationshipNetwork, _extends({
    characterName: relationshipsEditor && relationshipsEditor.characterName || String(L(c.name) || ''),
    relationships: relationshipValues || c.rels,
    characterOptions: relationshipsEditor && relationshipsEditor.options || []
  }, bindings, {
    editDisabled: !!(relationshipsEditor && relationshipsEditor.disabled),
    loadError: relationshipsEditor && relationshipsEditor.loadError
  })))) : /*#__PURE__*/React.createElement(CkPending, {
    label: TC('ck_wait_skel'),
    active: true
  }), ly.belief ? /*#__PURE__*/React.createElement(CharacterFieldCapability, {
    editor: beliefEditor,
    value: beliefValues,
    label: TC('ck_belief_core')
  }, bindings => /*#__PURE__*/React.createElement(CharacterBeliefCard, _extends({
    value: beliefValues
  }, bindings, {
    editDisabled: !!(beliefEditor && beliefEditor.disabled),
    loadError: beliefEditor && beliefEditor.loadError
  }))) : /*#__PURE__*/React.createElement(CkPending, {
    label: TC('ck_wait_belief')
  }), ly.depth ? /*#__PURE__*/React.createElement(window.CharacterDepthProfile, {
    value: depthValues,
    onSave: depthEditor && depthEditor.onSave,
    onEditStart: depthEditor && depthEditor.onEditStart,
    editDisabled: !!(depthEditor && depthEditor.disabled),
    loadError: depthEditor && depthEditor.loadError
  }) : /*#__PURE__*/React.createElement(CkPending, {
    label: waitDepth || TC('ck_wait_depth'),
    active: !!waitDepth
  }), showVoiceProfile ? /*#__PURE__*/React.createElement(CharacterFieldCapability, {
    editor: voiceEditor,
    value: voiceValues,
    label: {
      zh: '角色声线',
      en: 'Character voice'
    }
  }, bindings => /*#__PURE__*/React.createElement(window.CharacterVoiceProfile, _extends({
    value: voiceValues
  }, bindings, {
    editDisabled: !!(voiceEditor && voiceEditor.disabled),
    loadError: voiceEditor && voiceEditor.loadError
  }))) : null);
}
window.CastProfile = CastProfile;

/* ---------- 后台任务通知卡片 ----------
   门户后台有任务在跑（建书阶段、章节生成、后验结算等）时，无论用户在哪个页面，
   右下角常驻一张提醒卡片；轮询 syncRunningTasks 刷新状态，任务清空后自动消失。 */
/* Inbox unread count (announcements + messages), shared by every subscriber with one refresh loop.
   Bridge/InboxView call LF_INBOX_REFRESH to re-sync. */
const LFInboxUnread = function () {
  let count = 0,
    timer = null;
  const subscribers = new Set();
  const refresh = () => {
    if (!window.LF_API) return;
    Promise.all([window.LF_API.announcementsUnread().catch(() => ({
      count: 0
    })), window.LF_API.notificationsUnread().catch(() => ({
      count: 0
    }))]).then(([a, n]) => {
      count = (a && a.count || 0) + (n && n.count || 0);
      subscribers.forEach(notify => notify(count));
    });
  };
  return {
    subscribe(notify) {
      subscribers.add(notify);
      notify(count);
      if (subscribers.size === 1) {
        window.LF_INBOX_REFRESH = refresh;
        refresh();
        timer = setInterval(refresh, 60000);
      }
      return () => {
        subscribers.delete(notify);
        if (subscribers.size) return;
        clearInterval(timer);
        timer = null;
        if (window.LF_INBOX_REFRESH === refresh) window.LF_INBOX_REFRESH = null;
      };
    }
  };
}();
function useInboxUnread() {
  const [unread, setUnread] = React.useState(0);
  React.useEffect(() => LFInboxUnread.subscribe(setUnread), []);
  return unread;
}
window.useInboxUnread = useInboxUnread;

/* variant="bar": phone task bar inside the frame, collapsed to a labelled strip by default. */
function BgTaskCard({
  variant = 'dock'
}) {
  const {
    useState,
    useEffect
  } = React;
  const bar = variant === 'bar';
  const [open, setOpen] = useState(!bar);
  const [, setTick] = useState(0);
  const state = window.LF_PORTAL_STATE;
  const running = (state && Array.isArray(state.tasks) ? state.tasks : []).filter(t => t && (t.status === 'queued' || t.status === 'running' || t.status === 'retrying'));
  const count = running.length;
  // 运行框关闭后由全局镜像接管：即使引擎任务尚未进入快照(tasks)，也能立刻显示进度卡片。
  const active = window.LF_RUN_ACTIVE || null;
  const hasWork = count > 0 || !!active;
  useEffect(() => {
    if (hasWork && !bar) setOpen(true);
  }, [hasWork]);
  useEffect(() => {
    let alive = true;
    const id = setInterval(async () => {
      if (!alive || document.hidden) return;
      try {
        if (window.LF_PORTAL && window.LF_PORTAL.syncRunningTasks) await window.LF_PORTAL.syncRunningTasks();
      } catch (e) {}
      if (alive) setTick(x => x + 1);
    }, 6000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [count]);
  // 1s 心跳：刷新进度条（镜像 window.LF_RUN_PROGRESS）。常驻但极轻量。
  useEffect(() => {
    const id = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!hasWork) return null;
  const label = t => TC('bg_' + t.task_type) || t.task_type;
  const drawView = active && active.draw && window.ProseDrawProgressCore ? window.ProseDrawProgressCore.project(active.draw, window.CLANG, active.chapterNumber) : null;
  const drawStage = drawView && drawView.showStageProgress && active.draw.stageOptions && active.draw.stage !== 'body_ready' ? window.ProseStageCore.project(active.draw.stageOptions, active.draw.stage) : null;
  const prog = drawView ? drawStage && drawStage.progress != null ? drawStage.progress / 100 : null : typeof window.LF_RUN_PROGRESS === 'number' ? Math.max(0, Math.min(1, window.LF_RUN_PROGRESS)) : null;
  const activeState = drawView ? drawView.dockStatus : active && active.status;
  const titleCount = count + (active && !running.some(t => t && active.taskId && t.id === active.taskId) ? 1 : 0);
  const activeTerminal = active && (activeState === 'completed' || activeState === 'read_failed');
  const dockTitle = activeTerminal && count === 0 ? TC('bg_action_ready') : TC('bg_title').replace('{n}', titleCount);
  const activeStatus = drawView ? drawView.dockLabel : active && active.status === 'completed' ? TC('bg_completed') : active && active.status === 'read_failed' ? TC('bg_read_failed') : active && active.status === 'verifying' ? TC('bg_verifying') : TC('bg_running');
  const activeRow = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: 'bg-dot ' + (activeState || 'running')
  }, activeState === 'completed' ? /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 10,
    w: 3
  }) : null), /*#__PURE__*/React.createElement("span", {
    className: "bg-name"
  }, active && active.label), /*#__PURE__*/React.createElement("span", {
    className: 'bg-st ' + (activeTerminal ? 'ready' : 'on')
  }, drawView ? drawView.dockLabel : active && active.actionLabel || activeStatus));
  return /*#__PURE__*/React.createElement("div", {
    className: 'bg-taskdock' + (bar ? ' bg-taskdock--bar' : '')
  }, open ? /*#__PURE__*/React.createElement("div", {
    className: "bg-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-head"
  }, activeTerminal && count === 0 ? /*#__PURE__*/React.createElement("span", {
    className: 'bg-ready' + (drawView && drawView.kind !== 'ready' ? ' prose-draw-dock-alert' : '')
  }, drawView && drawView.kind !== 'ready' ? /*#__PURE__*/React.createElement("span", null, "!") : /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 12,
    w: 3
  })) : /*#__PURE__*/React.createElement("span", {
    className: "bg-spin"
  }), /*#__PURE__*/React.createElement("span", {
    className: "bg-title"
  }, dockTitle), /*#__PURE__*/React.createElement("button", {
    className: "bg-min",
    onClick: () => setOpen(false),
    title: TC('bg_min')
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2.2
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-list"
  }, active && (active.onAction ? /*#__PURE__*/React.createElement("button", {
    className: "bg-row bg-row-action",
    onClick: active.onAction
  }, activeRow) : /*#__PURE__*/React.createElement("div", {
    className: "bg-row"
  }, activeRow)), running.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t.id || i,
    className: "bg-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-dot"
  }), /*#__PURE__*/React.createElement("span", {
    className: "bg-name"
  }, label(t)), /*#__PURE__*/React.createElement("span", {
    className: 'bg-st' + (t.status === 'running' || t.status === 'retrying' ? ' on' : '')
  }, t.status === 'running' ? TC('bg_running') : t.status === 'retrying' ? TC('bg_retrying') : TC('bg_queued'))))), !activeTerminal && /*#__PURE__*/React.createElement("div", {
    className: 'bg-prog' + (prog == null ? ' indet' : '')
  }, /*#__PURE__*/React.createElement("i", {
    style: prog != null ? {
      width: Math.round(prog * 100) + '%'
    } : undefined
  }))) : /*#__PURE__*/React.createElement("button", {
    className: 'bg-pill' + (activeTerminal ? ' ready' : ''),
    onClick: () => setOpen(true),
    title: dockTitle,
    "aria-label": bar ? undefined : dockTitle
  }, activeTerminal ? drawView && drawView.kind !== 'ready' ? /*#__PURE__*/React.createElement("span", null, "!") : /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 14,
    w: 3
  }) : /*#__PURE__*/React.createElement("span", {
    className: "bg-spin"
  }), bar ? /*#__PURE__*/React.createElement("span", {
    className: "bg-pill-label"
  }, dockTitle) : /*#__PURE__*/React.createElement("span", {
    className: "c-latin"
  }, titleCount)));
}
window.BgTaskCard = BgTaskCard;
}
