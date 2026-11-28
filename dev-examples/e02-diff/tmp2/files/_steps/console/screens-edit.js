{
/* ===== 工作台 · 可编辑细纲 + 视图层级 + 重生成 + 简纲（双语） ===== */
const L = window.L,
  TC = window.TC,
  D = window.CONSOLE_DATA;
const {
  useState,
  useRef
} = React;

/* immutable path helpers (shared with app.jsx via window) */
function setIn(obj, path, fn) {
  if (!path.length) return fn(obj);
  const [k, ...rest] = path;
  const clone = Array.isArray(obj) ? obj.slice() : {
    ...obj
  };
  clone[k] = setIn(obj[k], rest, fn);
  return clone;
}

/* ---------- portal helper: render fixed overlays on <body> so they escape any
   transformed / stacking-context ancestor (keeps floats above + edge tab flush) ---------- */
function Portal({
  children
}) {
  if (typeof ReactDOM === 'undefined' || !ReactDOM.createPortal) return children;
  return ReactDOM.createPortal(children, document.body);
}
window.Portal = Portal;

/* ---------- drag-to-resize handle (shared by tree column & ledger rail) ---------- */
function ResizeHandle({
  side = 'right',
  getWidth,
  setWidth,
  min = 200,
  max = 560,
  onDouble
}) {
  const onDown = e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX,
      startW = getWidth();
    document.body.classList.add('rsz-active');
    const move = ev => {
      let dx = ev.clientX - startX;
      if (side === 'left') dx = -dx;
      setWidth(Math.max(min, Math.min(max, Math.round(startW + dx))));
    };
    const up = () => {
      document.body.classList.remove('rsz-active');
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: 'rsz rsz-' + side,
    onMouseDown: onDown,
    onDoubleClick: onDouble,
    title: "\u62D6\u52A8\u8C03\u6574\u5BBD\u5EA6 \xB7 \u53CC\u51FB\u590D\u4F4D"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rsz-grip"
  }));
}
window.ResizeHandle = ResizeHandle;

/* ---------- edge tab shown when the ledger rail is collapsed ---------- */
function RailEdgeTab({
  onOpen
}) {
  return /*#__PURE__*/React.createElement(Portal, null, /*#__PURE__*/React.createElement("button", {
    className: "wb2-edgetab",
    onClick: onOpen,
    title: TC('wb_expand')
  }, /*#__PURE__*/React.createElement("span", {
    className: "et-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "eye",
    s: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "et-tx"
  }, TC('wb_rail')), /*#__PURE__*/React.createElement("span", {
    className: "et-caret"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  }))));
}
window.RailEdgeTab = RailEdgeTab;
function getIn(obj, path) {
  return path.reduce((a, k) => a == null ? a : a[k], obj);
}
window.setIn = setIn;
window.getIn = getIn;

/* LF_PORTAL[1] AI rewrite gateway — engine has no snippet-rewrite capability,
   so claude.complete is the primary path; engine polish used for whole-chapter only */
async function aiRewrite(original, intent, label) {
  const en = window.CLANG === 'en';
  const prompt = en ? `You are an outline editor for a Chinese serialized novel. Rewrite the following "${label || 'text'}" according to the instruction. Keep a similar length, the SAME language as the original, and the same narrative voice. Output ONLY the rewritten text — no quotes, no labels, no explanation.\nOriginal: ${original}\nInstruction: ${intent}` : `你是一名中文网络小说的细纲编辑。请按下面的「修改意图」改写这段「${label || '文本'}」。保持与原文相近的长度、完全相同的语言、一致的叙事口吻；只输出改写后的正文，不要加引号、不要加标签、不要任何解释。\n原文：${original}\n修改意图：${intent}`;
  try {
    if (window.claude && window.claude.complete) {
      const r = await window.claude.complete(prompt);
      let t = (r || '').trim().replace(/^[「『"'""]+/, '').replace(/[」』"'""]+$/, '').trim();
      if (t) return t;
    }
  } catch (e) {}
  return null;
}
window.aiRewrite = aiRewrite;
const AGENT_FLOAT_SIZE = {
  width: 360,
  height: 122
};
const AGENT_FLOAT_INPUT_MAX_HEIGHT = 180;
const REWRITE_INTENT_MAX_CHARS = 20000;
window.LF_REWRITE_INTENT_MAX_CHARS = REWRITE_INTENT_MAX_CHARS;
function clampAgentFloatPosition(pos, size) {
  const gap = 8,
    w = size && size.width || AGENT_FLOAT_SIZE.width,
    h = size && size.height || AGENT_FLOAT_SIZE.height;
  return {
    x: Math.max(gap, Math.min(Math.round(pos.x), Math.max(gap, window.innerWidth - w - gap))),
    y: Math.max(gap, Math.min(Math.round(pos.y), Math.max(gap, window.innerHeight - h - gap)))
  };
}
function agentFloatPositionFor(anchor, size) {
  const w = size && size.width || AGENT_FLOAT_SIZE.width,
    h = size && size.height || AGENT_FLOAT_SIZE.height,
    gap = 12;
  if (!anchor) return clampAgentFloatPosition({
    x: window.innerWidth - w - 16,
    y: 96
  }, {
    width: w,
    height: h
  });
  let x = anchor.right + gap;
  if (x + w > window.innerWidth - 8) x = anchor.right - w;
  let y = anchor.top - h - gap;
  if (y < 8) y = anchor.bottom + gap;
  return clampAgentFloatPosition({
    x,
    y
  }, {
    width: w,
    height: h
  });
}
window.agentFloatPositionFor = agentFloatPositionFor;

/* ---------- reusable floating Agent dialog (draggable + closable) ----------
   used by the writing page for selection-rewrite and chapter-regenerate. */
function AgentFloat({
  title,
  label,
  original,
  snippet,
  chips,
  startPos,
  placeholder,
  onRun,
  onClose,
  closing,
  onCopy
}) {
  const {
    useState,
    useRef,
    useEffect
  } = React;
  const [intent, setIntent] = useState('');
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState(true); // focused → opaque; blurred → translucent so the prose stays readable
  const [pos, setPos] = useState(() => clampAgentFloatPosition(startPos || agentFloatPositionFor(null), AGENT_FLOAT_SIZE));
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const inputHeight = intent ? Math.min(el.scrollHeight, AGENT_FLOAT_INPUT_MAX_HEIGHT) : 56;
    el.style.height = inputHeight + 'px';
    el.style.overflowY = intent && el.scrollHeight > AGENT_FLOAT_INPUT_MAX_HEIGHT ? 'auto' : 'hidden';
  }, [intent]);
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const keepVisible = () => {
      const rect = el.getBoundingClientRect();
      setPos(current => {
        const next = clampAgentFloatPosition(current, {
          width: rect.width,
          height: rect.height
        });
        return next.x === current.x && next.y === current.y ? current : next;
      });
    };
    keepVisible();
    const observer = window.ResizeObserver ? new ResizeObserver(keepVisible) : null;
    if (observer) observer.observe(el);
    window.addEventListener('resize', keepVisible);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', keepVisible);
    };
  }, []);
  const headDown = e => {
    if (e.target.closest('.edt-x')) return;
    e.preventDefault();
    const sx = e.clientX,
      sy = e.clientY,
      ox = pos.x,
      oy = pos.y;
    const rect = panelRef.current ? panelRef.current.getBoundingClientRect() : AGENT_FLOAT_SIZE;
    const mv = ev => setPos(clampAgentFloatPosition({
      x: ox + ev.clientX - sx,
      y: oy + ev.clientY - sy
    }, {
      width: rect.width,
      height: rect.height
    }));
    const up = () => {
      window.removeEventListener('mousemove', mv);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
  };
  const run = async () => {
    const ins = intent.trim();
    if (!ins || busy) return;
    setBusy(true);
    let ok = false;
    try {
      ok = await onRun(ins);
    } catch (e) {}
    setBusy(false);
    if (ok) onClose();
  };
  const noBlur = e => e.preventDefault();
  return /*#__PURE__*/React.createElement(Portal, null, /*#__PURE__*/React.createElement("div", {
    ref: panelRef,
    className: 'edt-agent af' + (lit ? '' : ' dim') + (closing ? ' out' : ''),
    style: {
      left: pos.x,
      top: pos.y
    },
    onFocus: () => setLit(true),
    onBlur: e => {
      if (!e.currentTarget.contains(e.relatedTarget)) setLit(false);
    },
    onMouseDown: () => setLit(true)
  }, /*#__PURE__*/React.createElement("div", {
    className: "edt-aghead",
    onMouseDown: headDown
  }, /*#__PURE__*/React.createElement("span", {
    className: "edt-aiad"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 12
  })), /*#__PURE__*/React.createElement("span", {
    className: "edt-agtitle"
  }, title), /*#__PURE__*/React.createElement("span", {
    className: "edt-ailab"
  }, label), onCopy && /*#__PURE__*/React.createElement("button", {
    className: "edt-agcopy",
    onMouseDown: noBlur,
    onClick: onCopy,
    title: (window.TC && TC('wsel_copy') || '复制') + ' · ⌘/Ctrl+C'
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "copy",
    s: 12
  })), /*#__PURE__*/React.createElement("button", {
    className: "edt-x",
    "aria-label": window.CLANG === 'en' ? 'Close AI rewrite' : '关闭 AI 改写',
    onClick: onClose
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "edt-agbody"
  }, original && /*#__PURE__*/React.createElement("div", {
    className: "af-orig"
  }, original), snippet && (() => {
    const s = snippet.replace(/\s+/g, ' ').trim();
    const cut = s.length > 24 ? 12 : 0;
    const head = cut ? s.slice(0, -cut) : s;
    const tail = cut ? s.slice(-cut) : '';
    return /*#__PURE__*/React.createElement("div", {
      className: "af-snip"
    }, /*#__PURE__*/React.createElement("span", {
      className: "a"
    }, head), tail && /*#__PURE__*/React.createElement("span", {
      className: "b"
    }, tail));
  })(), !!(chips && chips.length) && /*#__PURE__*/React.createElement("div", {
    className: "edt-chips"
  }, chips.map((c, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "edt-chip",
    onMouseDown: noBlur,
    onClick: () => setIntent((intent ? intent + '，' + c : c).slice(0, REWRITE_INTENT_MAX_CHARS))
  }, c))), /*#__PURE__*/React.createElement("div", {
    className: "edt-airow"
  }, /*#__PURE__*/React.createElement("textarea", {
    ref: inputRef,
    className: "edt-aiinput",
    autoFocus: true,
    rows: 1,
    maxLength: REWRITE_INTENT_MAX_CHARS,
    placeholder: placeholder || TC('wre_ph'),
    value: intent,
    onChange: e => setIntent(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        run();
      }
      if (e.key === 'Escape') onClose();
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold sm edt-go",
    disabled: !intent.trim() || busy || window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED(),
    onMouseDown: noBlur,
    onClick: run
  }, busy ? /*#__PURE__*/React.createElement("span", {
    className: "edt-spin sm"
  }) : /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 12
  }), busy ? TC('wre_going') : TC('wre_go'))))));
}
window.AgentFloat = AgentFloat;
const EditCtx = React.createContext({});
window.EditCtx = EditCtx;

/* ---------- segmented language toggle: shows BOTH options, current one highlighted ---------- */
function LangSeg({
  lang,
  setLang
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "lang-seg",
    title: "\u4E2D\u6587 / English",
    "aria-label": lang === 'en' ? 'Interface language' : '界面语言'
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": lang === 'zh',
    className: lang === 'zh' ? 'on' : '',
    onClick: () => setLang('zh')
  }, "\u4E2D"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": lang === 'en',
    className: lang === 'en' ? 'on' : '',
    onClick: () => setLang('en')
  }, "EN"));
}
window.LangSeg = LangSeg;

/* One field AI rewrite through the edit context, shared by EditBlock and the phone field sheet (FD-176).
   Structured resources go through the backend rewrite gateway, which validates and writes atomically;
   an applied result is mirrored into the page. Returns the rewritten text, or null after a toast. */
async function runFieldRewrite(ctx, {
  text,
  intent,
  label,
  rewritePath
}) {
  const toast = ctx.toast || function () {};
  let out = null;
  let remoteApplied = false;
  let rewriteResult = null;
  if (typeof ctx.rewrite === 'function') {
    try {
      rewriteResult = await ctx.rewrite(text, intent, label, rewritePath);
      if (rewriteResult && typeof rewriteResult === 'object' && rewriteResult.applied) {
        out = rewriteResult.value;
        remoteApplied = true;
      } else out = rewriteResult;
    } catch (e) {
      toast(e && e.message || TC('ed_ai_fail'));
      return null;
    }
  } else {
    out = await aiRewrite(text, intent, label);
  }
  if (!out) {
    toast(TC('ed_ai_fail'));
    return null;
  }
  if (remoteApplied && typeof ctx.applyRewrite === 'function') ctx.applyRewrite(rewritePath, out, rewriteResult);
  toast(TC('ed_ai_done'));
  return out;
}
window.runFieldRewrite = runFieldRewrite;

/* ---------- EditBlock: double-click a large region → inline manual edit.
   A separate Agent-rewrite window FLOATS above the page (fixed, draggable,
   closable) so it never disturbs pure manual editing or shifts the layout.
   Blur only exits edit mode — committing requires Enter or the Save button. ---------- */
function EditBlock({
  value,
  onCommit,
  label,
  children,
  variant = 'block',
  multiline = true,
  dirty,
  rewritePath
}) {
  // Phone frame (FD-176): no hover or double-click there, so the hint becomes a tappable edit control.
  // Book creation renders outside the frame, so the phone width itself also counts.
  const inPhoneFrame = !!(window.useMobileChromeState && window.useMobileChromeState());
  const phoneWidth = window.useMobileLayout ? window.useMobileLayout() : false;
  const onPhone = inPhoneFrame || phoneWidth;
  const ctx = React.useContext(EditCtx);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [intent, setIntent] = useState('');
  const [busy, setBusy] = useState(false);
  const [agentOpen, setAgentOpen] = useState(true);
  const [pos, setPos] = useState(null);
  const taRef = React.useRef(null);
  const wrapRef = React.useRef(null);
  const toast = ctx.toast || function () {};
  const cite = ctx.cite || null;
  const AskAssistant = window.LF_EDIT && window.LF_EDIT.AskAssistantButton;
  const citePath = cite && cite.pathFor ? cite.pathFor(rewritePath) : rewritePath;
  React.useEffect(() => {
    if (!editing || !cite || !cite.identity) return undefined;
    const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
    if (!guard) return undefined;
    return guard.acquire(cite.identity);
  }, [editing, cite && cite.identity && cite.identity.resource_key, cite && cite.bookId]);
  const defaultPos = () => {
    const r = wrapRef.current ? wrapRef.current.getBoundingClientRect() : null;
    const w = 344;
    let x = r ? Math.min(r.right - w, window.innerWidth - w - 16) : window.innerWidth - w - 24;
    x = Math.max(16, x);
    let y = r ? Math.min(r.bottom + 10, window.innerHeight - 210) : 200;
    y = Math.max(74, y);
    return {
      x,
      y
    };
  };
  const open = () => {
    // Phone frame (FD-176): the rewrite panel docks over the lower screen, so it opens on request there.
    setDraft(value);
    setIntent('');
    setBusy(false);
    setAgentOpen(!onPhone);
    setPos(defaultPos());
    setEditing(true);
    setTimeout(() => {
      const t = taRef.current;
      if (t) {
        t.focus();
        t.setSelectionRange(t.value.length, t.value.length);
      }
    }, 20);
  };
  const close = () => {
    setEditing(false);
    setBusy(false);
  }; // exit WITHOUT committing
  const commit = () => {
    const v = (draft || '').trim();
    if (v && v !== value) {
      onCommit(v);
      toast(TC('ed_saved'));
    }
    close();
  };
  const runAI = async () => {
    const ins = intent.trim();
    if (!ins || busy) return;
    setBusy(true);
    const out = await runFieldRewrite(ctx, {
      text: draft || value,
      intent: ins,
      label,
      rewritePath
    });
    setBusy(false);
    if (out) {
      setDraft(out);
      const t = taRef.current;
      if (t) {
        t.focus();
        t.setSelectionRange(t.value.length, t.value.length);
      }
    }
  };
  // 退出即保存：点击区块外即提交草稿（触发上层防抖自动保存）。点击悬浮的 Agent
  // 改写窗内部不算退出（它渲染在 body 的 Portal，不在 wrapRef 内）。Esc / 取消 仍
  // 走 close()，放弃改动。
  React.useEffect(() => {
    if (!editing) return;
    const onDocDown = e => {
      if (!wrapRef.current || wrapRef.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest('.edt-agent')) return;
      commit();
    };
    document.addEventListener('mousedown', onDocDown, true);
    return () => document.removeEventListener('mousedown', onDocDown, true);
  }, [editing, draft, value]);
  // On phones the docked rewrite panel covers the lower screen; keep the edited field above it.
  React.useEffect(() => {
    if (onPhone && editing && agentOpen && wrapRef.current && wrapRef.current.scrollIntoView) wrapRef.current.scrollIntoView({
      block: 'start',
      behavior: 'smooth'
    });
  }, [onPhone, editing, agentOpen]);
  const noBlur = e => e.preventDefault(); // keep edit focus when pressing buttons/chips
  const startDrag = e => {
    e.preventDefault();
    const sx = e.clientX,
      sy = e.clientY,
      base = pos || defaultPos();
    const move = ev => setPos({
      x: base.x + (ev.clientX - sx),
      y: base.y + (ev.clientY - sy)
    });
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };
  if (!editing) {
    return /*#__PURE__*/React.createElement("div", {
      ref: wrapRef,
      className: 'edt edt-' + variant + (dirty ? ' isdirty' : ''),
      onDoubleClick: open
    }, children || /*#__PURE__*/React.createElement("span", null, value), dirty && /*#__PURE__*/React.createElement("span", {
      className: "edt-dirty",
      title: TC('ed_dirty')
    }, /*#__PURE__*/React.createElement("span", {
      className: "edt-ddot"
    }), TC('ed_dirty')), onPhone ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "edt-hint edt-hint--tap",
      onClick: e => {
        e.stopPropagation();
        open();
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "pen",
      s: 11
    }), TC('ed_tap')) : /*#__PURE__*/React.createElement("span", {
      className: "edt-hint"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "pen",
      s: 10.5
    }), TC('ed_dbl')));
  }
  return /*#__PURE__*/React.createElement("div", {
    ref: wrapRef,
    className: 'edt edt-' + variant + ' editing'
  }, /*#__PURE__*/React.createElement("textarea", {
    ref: taRef,
    className: "edt-ta",
    value: draft,
    rows: multiline ? 3 : 1,
    onChange: e => setDraft(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commit();
      }
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "edt-acts"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edt-tip"
  }, "\u21B5 ", TC('ed_save'), multiline ? ' · ⇧↵' : ''), AskAssistant && cite && cite.bookId && cite.identity && citePath ? /*#__PURE__*/React.createElement(AskAssistant, {
    bookId: cite.bookId,
    identity: cite.identity,
    path: citePath
  }) : null, !agentOpen && /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onMouseDown: noBlur,
    onClick: () => {
      setAgentOpen(true);
      setPos(defaultPos());
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 12
  }), TC('ed_reopen')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onMouseDown: noBlur,
    onClick: close
  }, TC('ed_cancel')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold sm",
    onMouseDown: noBlur,
    onClick: commit
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 12,
    w: 2.4
  }), TC('ed_save'))), agentOpen && pos && /*#__PURE__*/React.createElement(Portal, null, /*#__PURE__*/React.createElement("div", {
    className: "edt-agent",
    style: {
      left: pos.x,
      top: pos.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "edt-aghead",
    onPointerDown: startDrag
  }, /*#__PURE__*/React.createElement("span", {
    className: "edt-aiad"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 12
  })), /*#__PURE__*/React.createElement("span", {
    className: "edt-agtitle"
  }, TC('ed_ai_title')), /*#__PURE__*/React.createElement("span", {
    className: "edt-ailab"
  }, label), /*#__PURE__*/React.createElement("button", {
    className: "edt-x",
    onPointerDown: e => e.stopPropagation(),
    onMouseDown: noBlur,
    onClick: () => setAgentOpen(false),
    title: TC('ed_close')
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "edt-agbody"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edt-chips"
  }, TC('ed_chips').map((c, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "edt-chip",
    onMouseDown: noBlur,
    onClick: () => setIntent(c)
  }, c))), /*#__PURE__*/React.createElement("div", {
    className: "edt-airow"
  }, /*#__PURE__*/React.createElement("input", {
    className: "edt-aiinput",
    placeholder: TC('ed_ai_ph'),
    value: intent,
    onChange: e => setIntent(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') runAI();
      if (e.key === 'Escape') close();
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold sm edt-go",
    disabled: !intent.trim() || busy || window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED(),
    onMouseDown: noBlur,
    onClick: runAI
  }, busy ? /*#__PURE__*/React.createElement("span", {
    className: "edt-spin sm"
  }) : /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 12
  }), busy ? TC('ed_genning') : TC('ed_gen')))))));
}
window.EditBlock = EditBlock;

/* ---------- Level switcher: 卷纲 › 简纲 › 细纲 zoom ladder ---------- */
function LevelSwitcher({
  level,
  setLevel,
  chap
}) {
  const chLab = TC('chap') === 'ch.' ? 'ch.' + chap : '第 ' + chap + ' 章';
  const items = [{
    k: 'vol',
    ic: 'shelf',
    t: TC('lvl_vol'),
    d: TC('lvl_vol_d')
  }, {
    k: 'brief',
    ic: 'book',
    t: TC('lvl_brief'),
    d: TC('lvl_brief_d')
  }, {
    k: 'detail',
    ic: 'eye',
    t: TC('lvl_detail'),
    d: TC('lvl_detail_d') + ' · ' + chLab
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "lvl-band"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lvl-lead"
  }, TC('lvl_label')), /*#__PURE__*/React.createElement("div", {
    className: "lvl-switch"
  }, items.map((it, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: it.k
  }, /*#__PURE__*/React.createElement("button", {
    className: 'lvl' + (level === it.k ? ' on' : ''),
    onClick: () => setLevel(it.k)
  }, /*#__PURE__*/React.createElement("span", {
    className: "lvl-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: it.ic,
    s: 16
  })), /*#__PURE__*/React.createElement("span", {
    className: "lvl-tx"
  }, /*#__PURE__*/React.createElement("b", null, it.t), /*#__PURE__*/React.createElement("i", null, it.d))), i < items.length - 1 && /*#__PURE__*/React.createElement("span", {
    className: "lvl-arrow"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  }))))));
}
window.LevelSwitcher = LevelSwitcher;

/* ---------- Brief view: shown when a chapter has no detail yet (2b) ---------- */
function BriefView({
  chap,
  onGen,
  onRead,
  generationState = 'missing',
  reading = false,
  creditsRefunded = false
}) {
  const c = D.chapters.find(x => x.no === chap);
  const b = c && c.brief;
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
  }, TC('chap') === 'ch.' ? 'ch.' + chap : '第 ' + chap + ' 章'), /*#__PURE__*/React.createElement("span", {
    className: "c-h",
    style: {
      fontSize: 20
    }
  }, c ? L(c.title) : ''), /*#__PURE__*/React.createElement("span", {
    className: "c-badge slate"
  }, TC('lvl_brief'))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--ink-3)',
      marginTop: 5
    }
  }, TC('bf_note')))), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('bf_title')), /*#__PURE__*/React.createElement("div", {
    className: "c-lead"
  }, c ? L(c.gist) : '')), b && /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('bf_role')), /*#__PURE__*/React.createElement("div", {
    className: "c-lead slate"
  }, L(b.role))), b && b.beats && /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('bf_beats')), /*#__PURE__*/React.createElement("ol", {
    className: "c-plot"
  }, b.beats.map((x, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    className: "c-plot-item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pn c-latin"
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    className: "pt"
  }, L(x)))))), /*#__PURE__*/React.createElement(OutlineStatusCard, {
    kind: generationState,
    reading: reading,
    creditsRefunded: creditsRefunded,
    onRead: onRead,
    onGen: onGen
  }));
}
window.BriefView = BriefView;

/* ---------- Regenerate modal: intent box → confirm (3.3) ---------- */
/* worldField: also show a world_intent textarea; onConfirm receives
   {human_intent, world_intent} instead of a bare string.
   firstGen: first-time generation — use the dedicated copy and hide the
   "本次指导" quick chips. */
function RegenModal({
  open,
  chap,
  title,
  onClose,
  onConfirm,
  titleText,
  subText,
  ph,
  chips,
  notice,
  confirmText,
  icon,
  worldField,
  firstGen,
  noIntent,
  defaultIntent,
  writerType,
  onToggleWriter
}) {
  const [intent, setIntent] = useState('');
  const [worldIntent, setWorldIntent] = useState('');
  const [introOpen, setIntroOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitRef = useRef(false);
  React.useEffect(() => {
    if (open) {
      setIntent(defaultIntent || '');
      setWorldIntent('');
      setIntroOpen(false);
      setSubmitting(false);
      submitRef.current = false;
    }
  }, [open]);
  // 单/多写手切换：首次从单→群弹介绍弹层（与细纲页同一套交互），看过后直接切换。
  const showWriter = typeof onToggleWriter === 'function';
  const handleIntroWriter = () => {
    let seen = null;
    try {
      seen = localStorage.getItem('lf_wr_intro_seen');
    } catch (e) {}
    if (!seen) {
      setIntroOpen(true);
      return;
    }
    onToggleWriter();
  };
  const introConfirm = () => {
    try {
      localStorage.setItem('lf_wr_intro_seen', '1');
    } catch (e) {}
    setIntroOpen(false);
    onToggleWriter();
  };
  const introDismiss = () => {
    try {
      localStorage.setItem('lf_wr_intro_seen', '1');
    } catch (e) {}
    setIntroOpen(false);
  };
  if (!open) return null;
  const chLab = TC('chap') === 'ch.' ? 'ch.' + chap : '第 ' + chap + ' 章';
  const tT = titleText || (firstGen ? TC('rgf_title') : TC('rg_title'));
  const sT = subText || (firstGen ? TC('rgf_sub') : TC('rg_sub'));
  const phT = ph || TC('rg_ph');
  const chipsT = firstGen ? [] : chips || TC('rg_chips');
  const cfT = confirmText || (firstGen ? TC('rg_confirm_first') : TC('rg_confirm'));
  const submit = () => {
    if (submitRef.current) return;
    submitRef.current = true;
    setSubmitting(true);
    try {
      var pending = onConfirm(worldField ? {
        human_intent: intent.trim(),
        world_intent: worldIntent.trim()
      } : intent.trim());
      if (pending && typeof pending.catch === 'function') pending.catch(() => {
        submitRef.current = false;
        setSubmitting(false);
      });
    } catch (error) {
      submitRef.current = false;
      setSubmitting(false);
      throw error;
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "rg-scrim",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rg-ad"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: icon || 'bolt',
    s: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "rg-t"
  }, tT), /*#__PURE__*/React.createElement("div", {
    className: "rg-c"
  }, chLab, title ? ' · ' + title : '')), /*#__PURE__*/React.createElement("button", {
    className: "edt-x",
    onClick: onClose
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "rg-sub"
  }, sT), notice && /*#__PURE__*/React.createElement("div", {
    className: "rg-notice"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 13
  }), /*#__PURE__*/React.createElement("span", null, notice)), !noIntent && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "rg-flab"
  }, worldField ? TC('rg_human_lab') : TC('rg_with')), !!chipsT.length && /*#__PURE__*/React.createElement("div", {
    className: "edt-chips",
    style: {
      marginBottom: 10
    }
  }, chipsT.map((c, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "edt-chip",
    onClick: () => setIntent(intent ? intent + '，' + c : c)
  }, c))), /*#__PURE__*/React.createElement("textarea", {
    className: "rg-ta",
    autoFocus: true,
    rows: 3,
    placeholder: phT,
    value: intent,
    onChange: e => setIntent(e.target.value)
  }), worldField && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "rg-flab",
    style: {
      marginTop: 12
    }
  }, TC('rg_world_lab')), /*#__PURE__*/React.createElement("textarea", {
    className: "rg-ta",
    rows: 2,
    placeholder: TC('rg_world_ph'),
    value: worldIntent,
    onChange: e => setWorldIntent(e.target.value)
  }))), showWriter && /*#__PURE__*/React.createElement("div", {
    className: "rg-writer-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rg-flab",
    style: {
      margin: 0
    }
  }, TC('wr_mode')), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(WriterToggle, {
    writerType: writerType,
    onToggle: onToggleWriter,
    onIntro: handleIntroWriter
  })), /*#__PURE__*/React.createElement("div", {
    className: "rg-acts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn",
    onClick: onClose
  }, TC('rg_cancel')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold",
    onClick: submit,
    "aria-busy": submitting,
    disabled: submitting || window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED()
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "run",
    s: 14,
    w: 2
  }), cfT))), showWriter && /*#__PURE__*/React.createElement(WriterGroupIntroModal, {
    open: introOpen,
    onClose: introDismiss,
    onConfirm: introConfirm
  }));
}
window.RegenModal = RegenModal;

/* ---------- Run prose confirmation: exact target + optional guidance ---------- */
/* ---------- Pre-generate a future (planned) volume, with discouragement (2a) ---------- */
function PreGenVol({
  toast,
  book,
  volNo
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  const [done, setDone] = useState(false);
  const fail = err => {
    setBusy(false);
    if (window.LF_ERROR && window.LF_ERROR.isBackendError && window.LF_ERROR.isBackendError(err)) window.LF_ERROR(err);else toast && toast(TC('tg_fail'));
  };
  const run = () => {
    setOpen(false);
    const bookId = book && (book.id || book);
    // mock fallback: no portal/book wired (demo or offline) → keep optimistic toast
    if (!(window.LF_PORTAL && window.LF_PORTAL.runPhase && bookId)) {
      setDone(true);
      toast && toast(TC('tg_toast'));
      return;
    }
    setBusy(true);
    setProg(0);
    const payload = {};
    if (volNo) payload.volume_number = Number(volNo);
    window.LF_PORTAL.runPhase(bookId, 'outline', {
      payload,
      onProgress: function (ev) {
        if (ev && ev.error) {
          fail(ev.error);
        } else if (ev && ev.done) {
          setProg(1);
        } else if (ev && typeof ev.progress === 'number') {
          setProg(ev.progress);
        }
      }
    }).then(function () {
      return window.LF_PORTAL.load && window.LF_PORTAL.load();
    }).then(function () {
      setBusy(false);
      setDone(true);
      toast && toast(TC('tg_toast'));
    }).catch(fail);
  };
  if (done) return /*#__PURE__*/React.createElement("div", {
    className: "pgv"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pgv-done"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 12,
    w: 2.4
  }), TC('tg_toast')));
  if (busy) return /*#__PURE__*/React.createElement("div", {
    className: "pgv"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pgv-busy"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 12
  }), TC('tg_running'), /*#__PURE__*/React.createElement("i", null, Math.round((prog || 0) * 100), "%")));
  return /*#__PURE__*/React.createElement("div", {
    className: "pgv"
  }, !open ? /*#__PURE__*/React.createElement("button", {
    className: "pgv-btn",
    onClick: () => setOpen(true),
    disabled: window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED()
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "plus",
    s: 12,
    w: 2
  }), /*#__PURE__*/React.createElement("span", {
    className: "pgv-bt"
  }, TC('tg_pregen')), /*#__PURE__*/React.createElement("span", {
    className: "pgv-lock"
  }, TC('tg_locked'))) : /*#__PURE__*/React.createElement("div", {
    className: "pgv-warn"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pgv-wt"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 12
  }), TC('tg_warn_t')), /*#__PURE__*/React.createElement("div", {
    className: "pgv-wd"
  }, TC('tg_warn_d')), /*#__PURE__*/React.createElement("div", {
    className: "pgv-wa"
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: () => setOpen(false)
  }, TC('tg_later')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold sm",
    onClick: run,
    disabled: window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED()
  }, TC('tg_anyway')))));
}
window.PreGenVol = PreGenVol;

/* ---------- World State Machine panel (read-only; runs before the outline) ---------- */
function WSMPanel({
  wsm,
  collapsible,
  open = true,
  onToggle
}) {
  const dl = {
    near: 'dist_near',
    mid: 'dist_mid',
    far: 'dist_far'
  };
  const ul = {
    dormant: 'ust_dormant',
    active: 'ust_active',
    accel: 'ust_accel',
    closing: 'ust_closing'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: 'wsm' + (collapsible ? ' wsm-collap' : '') + (open ? '' : ' closed')
  }, /*#__PURE__*/React.createElement("div", {
    className: "wsm-head",
    onClick: collapsible ? onToggle : undefined,
    style: collapsible ? {
      cursor: 'pointer'
    } : undefined
  }, collapsible && /*#__PURE__*/React.createElement("span", {
    className: "wsm-caret"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  })), /*#__PURE__*/React.createElement("span", {
    className: "wsm-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "world",
    s: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "wsm-ht"
  }, /*#__PURE__*/React.createElement("b", null, TC('wsm_title')), /*#__PURE__*/React.createElement("i", null, open ? TC('wsm_sub') : L(wsm.world_time))), open && /*#__PURE__*/React.createElement("div", {
    className: "wsm-time"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, TC('wsm_time')), /*#__PURE__*/React.createElement("span", {
    className: "v c-latin"
  }, L(wsm.world_time)), /*#__PURE__*/React.createElement("span", {
    className: "adv"
  }, L(wsm.time_advanced)))), open && /*#__PURE__*/React.createElement("div", {
    className: "wsm-bd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wsm-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wsm-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wsm-lab"
  }, TC('wsm_forces')), wsm.forces.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "wsm-force"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'wsm-dist ' + f.distance
  }, TC(dl[f.distance])), /*#__PURE__*/React.createElement("span", {
    className: "nm"
  }, L(f.name)), /*#__PURE__*/React.createElement("span", {
    className: "st"
  }, L(f.status))))), /*#__PURE__*/React.createElement("div", {
    className: "wsm-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wsm-lab"
  }, TC('wsm_under')), wsm.undercurrents.map((u, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "wsm-force wsm-uder"
  }, /*#__PURE__*/React.createElement("span", {
    className: "nm"
  }, L(u.name)), /*#__PURE__*/React.createElement("span", {
    className: "st"
  }, L(u.status)), /*#__PURE__*/React.createElement("span", {
    className: "src c-latin"
  }, u.last))))), /*#__PURE__*/React.createElement("div", {
    className: "wsm-events"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wsm-ev"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wsm-lab"
  }, /*#__PURE__*/React.createElement("span", {
    className: "camdot on"
  }), TC('wsm_oncam')), wsm.on_camera.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "wsm-evr"
  }, L(e)))), /*#__PURE__*/React.createElement("div", {
    className: "wsm-ev"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wsm-lab"
  }, /*#__PURE__*/React.createElement("span", {
    className: "camdot"
  }), TC('wsm_offcam')), wsm.off_camera.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "wsm-evr off"
  }, L(e))))), L(wsm.power_shift) && /*#__PURE__*/React.createElement("div", {
    className: "wsm-shift"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-badge terra"
  }, TC('wsm_shift')), /*#__PURE__*/React.createElement("span", {
    className: "wsm-shtx"
  }, L(wsm.power_shift)))));
}
window.WSMPanel = WSMPanel;

/* ---------- one information-void row (instruction editable; director note hidden) ---------- */
function IVRow({
  v,
  idx,
  edit,
  dk
}) {
  const [show, setShow] = useState(false);
  const tm = {
    motive_gap: 'iv_motive_gap',
    detail_gap: 'iv_detail_gap',
    rhythm_gap: 'iv_rhythm_gap'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "iv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "iv-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-badge slate"
  }, TC(tm[v.type] || 'iv_detail_gap'))), /*#__PURE__*/React.createElement(EditBlock, {
    value: L(v.instruction),
    label: TC('iv_title'),
    variant: "lead",
    dirty: dk(['info_voids', idx, 'instruction']),
    rewritePath: ['info_voids', idx, 'instruction'],
    onCommit: val => edit(['info_voids', idx, 'instruction'], val)
  }, /*#__PURE__*/React.createElement("div", {
    className: "iv-inst"
  }, L(v.instruction))), /*#__PURE__*/React.createElement("button", {
    className: "iv-toggle",
    onClick: () => setShow(!show)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "eye",
    s: 12
  }), show ? TC('iv_hide') : TC('iv_show')), show && /*#__PURE__*/React.createElement("div", {
    className: "iv-note"
  }, /*#__PURE__*/React.createElement("span", {
    className: "iv-nlab"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "eye",
    s: 11
  }), TC('iv_director')), /*#__PURE__*/React.createElement(EditBlock, {
    value: L(v.note),
    label: TC('iv_director'),
    variant: "row",
    dirty: dk(['info_voids', idx, 'note']),
    rewritePath: ['info_voids', idx, 'note'],
    onCommit: val => edit(['info_voids', idx, 'note'], val)
  }, /*#__PURE__*/React.createElement("span", {
    className: "iv-ntext"
  }, L(v.note)))));
}
window.IVRow = IVRow;

/* ---------- stepped loader: World State Machine first, then the outline ---------- */
/* LF_PORTAL[2] 进度动效 — accepts optional progress(0-1)/stage from engine onEvent;
   falls back to timer-based mock when progress is not provided */
function RunSteps({
  progress,
  stage,
  onClose
}) {
  const steps = [{
    ph: 0,
    t: TC('rs_w1')
  }, {
    ph: 0,
    t: TC('rs_w2')
  }, {
    ph: 1,
    t: TC('rs_d1')
  }, {
    ph: 1,
    t: TC('rs_d2')
  }];
  const useEngine = typeof progress === 'number';
  const engineI = useEngine ? Math.min(Math.floor(progress * steps.length), steps.length) : null;
  const [mockI, setMockI] = useState(0);
  React.useEffect(() => {
    if (useEngine || mockI >= steps.length - 1) return;
    const t = setTimeout(() => setMockI(mockI + 1), 680);
    return () => clearTimeout(t);
  }, [mockI, useEngine]);
  // Timers and numeric progress are presentation only. Completion belongs to
  // the authoritative task result, followed by a guarded guide read.
  var i = useEngine ? engineI : mockI;
  // Map raw engine stage_id → a playful localized line; never surface the raw
  // English id (e.g. "world_state") to the user.
  var en2 = window.CLANG === 'en';
  var STAGE_LINE = {
    prepare_context: {
      zh: '正在翻阅前情卷宗……',
      en: 'Leafing through the story so far…'
    },
    world_state: {
      zh: '世界状态机正在推演时局……',
      en: 'World State Machine is deducing the situation…'
    },
    world_ready: {
      zh: '世界推演已落定……',
      en: 'World deduction settled…'
    },
    intent_dispatch: {
      zh: '意图分发器正在领命……',
      en: 'Intent dispatcher is taking orders…'
    },
    chapter_guide: {
      zh: '大纲导演正在落子布局……',
      en: 'The outline director is laying out the moves…'
    },
    guide_ready: {
      zh: '本章细纲已成形……',
      en: 'The chapter outline has taken shape…'
    }
  };
  if (useEngine && typeof stage === 'string' && steps[engineI]) {
    var mapped = STAGE_LINE[stage];
    if (mapped) steps[engineI].t = en2 ? mapped.en : mapped.zh;
  }
  const phState = p => {
    const max = Math.min(i, steps.length - 1);
    const cur = steps[max] ? steps[max].ph : 1;
    if (i >= steps.length) return 'done';
    if (cur > p) return 'done';
    if (cur === p) return 'on';
    return 'wait';
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "c-runoverlay"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-runcard rs-card",
    style: {
      position: 'relative'
    }
  }, onClose && /*#__PURE__*/React.createElement("button", {
    className: "edt-x prose-run-x",
    onClick: onClose,
    title: TC('run_minimize') || '最小化到右下角'
  }, "\xD7"), /*#__PURE__*/React.createElement("div", {
    className: "rs-phases"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'rs-ph ' + phState(0)
  }, /*#__PURE__*/React.createElement("span", {
    className: "rs-icw"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "world",
    s: 14
  })), TC('rs_phase_wsm')), /*#__PURE__*/React.createElement("span", {
    className: "rs-arrow"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 12,
    w: 2
  })), /*#__PURE__*/React.createElement("span", {
    className: 'rs-ph ' + phState(1)
  }, /*#__PURE__*/React.createElement("span", {
    className: "rs-icw"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "eye",
    s: 14
  })), TC('rs_phase_outline'))), /*#__PURE__*/React.createElement("div", {
    className: "rs-steps"
  }, steps.map((s, k) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: 'rs-step ' + (k < i ? 'done' : k === i ? 'active' : 'wait')
  }, /*#__PURE__*/React.createElement("span", {
    className: "rs-dot"
  }, k < i ? /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 11,
    w: 3
  }) : k === i ? /*#__PURE__*/React.createElement("span", {
    className: "edt-spin sm"
  }) : /*#__PURE__*/React.createElement("span", {
    className: "rs-n"
  }, k + 1)), /*#__PURE__*/React.createElement("span", {
    className: "rs-t"
  }, s.t))))));
}
window.RunSteps = RunSteps;

/* ---------- Writer mode toggle (single ↔ writer group) ---------- */
/* ---------- Editable single-chapter detailed outline · two-pane (B) ---------- */
function EditableDetailOutline({
  det,
  edit,
  dirty,
  onRegen,
  onRun,
  proseRunStatus,
  outlinePending,
  outlineBusy,
  writerType,
  toggleWriterType,
  toast,
  saving,
  saveErr
}) {
  const no = det.no,
    title = L(det.title);
  const tv = det.tension,
    band = TC('tband')[Math.min(4, Math.floor((tv - 1) / 20))];
  const [introOpen, setIntroOpen] = useState(false);
  const handleToggleWriter = function () {
    // First switch to writer group — show intro dialog
    var seen = null;
    try {
      seen = localStorage.getItem('lf_wr_intro_seen');
    } catch (e) {}
    if (!seen) {
      setIntroOpen(true);
      return;
    }
    toggleWriterType();
  };
  const handleConfirm = function () {
    try {
      localStorage.setItem('lf_wr_intro_seen', '1');
    } catch (e) {}
    setIntroOpen(false);
    toggleWriterType();
  };
  const handleDismiss = function () {
    try {
      localStorage.setItem('lf_wr_intro_seen', '1');
    } catch (e) {}
    setIntroOpen(false);
    // Dismiss without switching — stay on single
  };
  const anchorRows = [['hook', 'hook'], ['climax', 'peak'], ['close', 'door'], ['nextlink', 'link']];
  const fmap = {
      new: 'op_new',
      adv: 'op_adv',
      pay: 'op_pay'
    },
    fcls = {
      new: 'terra',
      adv: 'slate',
      pay: 'gold'
    };
  const dk = path => !!(dirty && dirty[path.join('.')]);
  const {
    bodyRef,
    railOpen,
    railStacked,
    railW,
    toggleRail,
    setRailWidth
  } = window.WorkbenchRail.useWorkbenchRail();
  // Phone frame (FD-176): a phone-only layout; run and writer sit in the action bar, the rest in sheets.
  const onPhone = !!(window.useMobileChromeState && window.useMobileChromeState());
  const [phoneSheet, setPhoneSheet] = useState(null);
  const [wsmOpen, setWsmOpen] = useState(() => {
    try {
      return localStorage.getItem('lf_wb_wsm') !== '0';
    } catch (e) {
      return true;
    }
  });
  const proseButtonLabel = proseRunStatus === 'running' ? TC('run_write_running') : proseRunStatus === 'verifying' ? TC('run_write_verifying') : proseRunStatus === 'completed' ? TC('run_write_done') : proseRunStatus === 'read_failed' ? TC('run_write_read_failed') : TC('run_write');
  const toggleWsm = () => setWsmOpen(o => {
    const n = !o;
    try {
      localStorage.setItem('lf_wb_wsm', n ? '1' : '0');
    } catch (e) {}
    return n;
  });
  const engineBlocked = !!(window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED());
  const runDisabled = !proseRunStatus && (outlinePending || engineBlocked);
  const chooseWriter = key => {
    if (key === writerType) return;
    if (key === 'muti') handleToggleWriter();else toggleWriterType();
  };
  (window.useMobileChrome || (() => {}))({
    key: 'outline',
    primary: [{
      key: 'writer',
      label: (writerType === 'muti' ? TC('wr_muti') : TC('wr_single')) + ' ▾',
      onClick: () => setPhoneSheet('writer')
    }, {
      key: 'run',
      label: proseButtonLabel,
      tone: 'gold',
      disabled: runDisabled,
      onClick: onRun
    }],
    more: [{
      key: 'regen',
      label: TC('regen'),
      icon: 'bolt',
      disabled: outlineBusy || engineBlocked,
      onClick: onRegen
    }, {
      key: 'ledger',
      label: TC('wb_rail'),
      icon: 'world',
      onClick: () => setPhoneSheet('ledger')
    }]
  });
  const rewriteTargetRef = useRef(null);
  const targetBookId = String(det && det._bookId || '');
  if (!rewriteTargetRef.current || rewriteTargetRef.current.bookId !== targetBookId || rewriteTargetRef.current.no !== Number(no)) {
    rewriteTargetRef.current = {
      bookId: targetBookId,
      no: Number(no)
    };
  }
  rewriteTargetRef.current.resourceVersion = det && det._resourceVersion;
  React.useEffect(() => () => {
    rewriteTargetRef.current = null;
  }, []);

  /* 章纲 AI 改写：UI 路径先映射到稳定 JSON 路径。数组 V1 按整个字段改写，
     Engine 读取完整章纲作为上下文、校验同构结果并直接写库。 */
  const rewriteField = async (text, intent, label, uiPath) => {
    const target = rewriteTargetRef.current;
    const bookId = target && target.bookId;
    const captured = window.LF_PORTAL && window.LF_PORTAL.captureChapterTarget ? window.LF_PORTAL.captureChapterTarget(bookId, no) : () => true;
    const isCurrent = () => {
      const data = window.CONSOLE_DATA || {};
      const selected = window.LF_PORTAL_STATE && Number(window.LF_PORTAL_STATE.selectedChapter);
      return captured() && rewriteTargetRef.current === target && !!bookId && Number(no) === target.no && String(data.book && data.book.id || '') === bookId && String(data.detail && data.detail._bookId || '') === bookId && Number(data.detail && data.detail.no) === Number(no) && (!selected || selected === Number(no));
    };
    if (!isCurrent() || !uiPath || !window.LF_PORTAL || !window.LF_PORTAL.rewriteField || !window.LF_PORTAL.getChapterGuideRaw) return null;
    const raw = await window.LF_PORTAL.getChapterGuideRaw(bookId, no);
    if (!isCurrent()) return null;
    const p = Array.isArray(uiPath) ? uiPath : [uiPath];
    const anchorMap = {
      hook: 'opening_hook',
      climax: 'climax',
      close: 'ending',
      nextlink: 'next_bridge'
    };
    let jsonPath = '',
      focus = '',
      extract = value => value;
    if (p[0] === 'target') jsonPath = 'target_word_count';else if (p[0] === 'worldtime') jsonPath = 'world_time_advance';else if (p[0] === 'pos') jsonPath = 'positioning';else if (p[0] === 'dilemma') jsonPath = 'moral_dilemma';else if (p[0] === 'anchors' && anchorMap[p[1]]) jsonPath = 'anchors.' + anchorMap[p[1]];else if (p[0] === 'know') jsonPath = 'info_boundary.protagonist_knows';else if (p[0] === 'dontknow') jsonPath = 'info_boundary.protagonist_doesnt_know';else if (p[0] === 'points') {
      const idx = Number(p[1]);
      jsonPath = 'plot_points';
      focus = '只修改数组第 ' + (idx + 1) + ' 项，其他项保持原样。';
      extract = value => Array.isArray(value) ? value[idx] : null;
    } else if (p[0] === 'info_voids') {
      const idx = Number(p[1]),
        field = p[2];
      jsonPath = 'info_voids';
      focus = '只修改数组第 ' + (idx + 1) + ' 项的 ' + field + '，其他内容保持原样。';
      extract = value => Array.isArray(value) && value[idx] ? value[idx][field] : null;
    } else if (p[0] === 'foreshadow' || p[0] === 'debts') {
      const row = (p[0] === 'foreshadow' ? det.foreshadow : det.debts)[Number(p[1])];
      const id = row && row.id,
        key = p[0] === 'foreshadow' ? 'hook_ops_summary' : 'debt_ops_summary';
      jsonPath = key;
      focus = '只修改 id 为 ' + id + ' 的 description，其他内容保持原样。';
      extract = value => {
        if (!value || typeof value !== 'object') return null;
        const groups = ['new', 'advance', 'resolve'];
        for (const group of groups) {
          const hit = (Array.isArray(value[group]) ? value[group] : []).find(item => String(item.id || item.item_id || '') === String(id));
          if (hit) return hit.description;
        }
        return null;
      };
    }
    if (!jsonPath) return null;
    if (!isCurrent()) return null;
    const result = await window.LF_PORTAL.rewriteField(bookId, {
      resource_type: 'chapter',
      resource_key: String(no).padStart(4, '0') + ':guide',
      base_version: raw.version,
      path: jsonPath,
      user_intent: focus ? intent + '\n\n范围约束：' + focus : intent
    }, {
      isCurrent
    });
    const validVersion = version => typeof version === 'number' && Number.isSafeInteger(version) && version >= 0;
    const versionIsCurrent = () => {
      const current = window.CONSOLE_DATA && window.CONSOLE_DATA.detail;
      return validVersion(result && result.version) && [raw.version, current && current._resourceVersion, target.resourceVersion].every(version => version == null || validVersion(version) && result.version >= version);
    };
    if (!isCurrent() || !versionIsCurrent()) return null;
    const value = result && Object.prototype.hasOwnProperty.call(result, 'value') ? extract(result.value) : null;
    let detail = null;
    try {
      const refreshed = await window.LF_API.bookChapterGuide(bookId, no);
      if (!isCurrent() || !versionIsCurrent() || !validVersion(refreshed && refreshed.version) || refreshed.version !== result.version) return null;
      detail = Object.assign({}, window.LF_PORTAL.mapCreate.detail(refreshed), {
        _bookId: bookId,
        no: Number(no)
      });
    } catch (e) {}
    if (!isCurrent() || !versionIsCurrent()) return null;
    return value == null ? null : {
      value: String(value),
      applied: true,
      version: result.version,
      detail
    };
  };
  const book = window.CONSOLE_DATA && window.CONSOLE_DATA.book;
  const bookId = book && book.id;
  const Cite = window.AssistantCiteCore;
  const guideKey = Cite && Cite.chapterGuideKey ? Cite.chapterGuideKey(no) : '';
  const citeIdentity = bookId && guideKey ? {
    resource_type: 'chapter',
    resource_key: guideKey,
    book_id: bookId
  } : null;
  React.useEffect(() => {
    const cite = window.LF_ASSISTANT_CITE;
    if (!cite) return undefined;
    if (bookId && guideKey) {
      cite.setObject({
        bookId,
        owner: 'chapter-guide',
        resource_type: 'chapter',
        resource_key: guideKey
      });
    } else {
      cite.clear({
        owner: 'chapter-guide'
      });
    }
    return () => cite.clear({
      owner: 'chapter-guide'
    });
  }, [bookId, guideKey]);
  const editContext = {
    toast,
    rewrite: rewriteField,
    applyRewrite: (path, value, result) => result && result.detail ? edit(null, result.detail, {
      persist: false,
      replace: true,
      version: result.version
    }) : edit(path, value, {
      persist: false,
      version: result && result.version
    }),
    cite: {
      bookId,
      identity: citeIdentity,
      pathFor: uiPath => Cite && Cite.chapterGuideFieldPath ? Cite.chapterGuideFieldPath(uiPath) : uiPath
    }
  };
  if (onPhone && window.MobileOutlineLayout) return /*#__PURE__*/React.createElement(EditCtx.Provider, {
    value: editContext
  }, /*#__PURE__*/React.createElement(window.MobileOutlineLayout, {
    det: det,
    no: no,
    title: title,
    edit: edit,
    dk: dk,
    tension: tv,
    band: band,
    saving: saving,
    saveErr: saveErr,
    fmap: fmap,
    fcls: fcls,
    anchorRows: anchorRows,
    wsmOpen: wsmOpen,
    toggleWsm: toggleWsm,
    sheet: phoneSheet,
    setSheet: setPhoneSheet,
    writerType: writerType,
    chooseWriter: chooseWriter,
    run: onRun,
    runLabel: proseButtonLabel,
    runDisabled: runDisabled
  }), /*#__PURE__*/React.createElement(WriterGroupIntroModal, {
    open: introOpen,
    onClose: handleDismiss,
    onConfirm: handleConfirm
  }));
  return /*#__PURE__*/React.createElement(EditCtx.Provider, {
    value: editContext
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-detail wb2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wb2-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-secrow",
    style: {
      marginBottom: 0
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
  }, L(det.status), /*#__PURE__*/React.createElement("span", {
    className: "edt-globalhint"
  }, " \xB7 ", TC('ed_hint')), saving && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 8,
      color: 'var(--gold-deep)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "edt-spin sm"
  }), L({
    zh: '保存中…',
    en: 'Saving…'
  })), !saving && saveErr && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 8,
      color: 'var(--terra,#b4452f)'
    }
  }, L({
    zh: '保存失败：',
    en: 'Save failed: '
  }), saveErr))), /*#__PURE__*/React.createElement("div", {
    className: "prose-generation-actions",
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: 'c-ic wb2-railbtn' + (railOpen ? ' on' : ''),
    onClick: toggleRail,
    "aria-expanded": railOpen,
    "aria-controls": "wb2-world-rail",
    title: railOpen ? TC('wb_collapse') : TC('wb_expand')
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "world",
    s: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: onRegen,
    disabled: outlineBusy || window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED()
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 13
  }), TC('regen')), /*#__PURE__*/React.createElement(WriterToggle, {
    writerType: writerType,
    onToggle: toggleWriterType,
    onIntro: handleToggleWriter
  }), /*#__PURE__*/React.createElement("button", {
    className: 'c-btn gold prose-run-trigger' + (proseRunStatus ? ' active' : ''),
    onClick: onRun,
    disabled: !proseRunStatus && (outlinePending || window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED()),
    "aria-haspopup": "dialog"
  }, proseRunStatus === 'running' || proseRunStatus === 'verifying' ? /*#__PURE__*/React.createElement("span", {
    className: "edt-spin sm"
  }) : /*#__PURE__*/React.createElement(Icon, {
    n: proseRunStatus === 'completed' ? 'check' : 'run',
    s: 14,
    w: 2
  }), " ", proseButtonLabel))), /*#__PURE__*/React.createElement("div", {
    className: "c-statstrip"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-stat-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-stat-lab"
  }, TC('tension')), /*#__PURE__*/React.createElement("span", {
    className: "c-latin c-stat-num"
  }, tv, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--ink-3)'
    }
  }, "/100"))), /*#__PURE__*/React.createElement("div", {
    className: "c-tmeter"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: tv + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "c-stat-sub"
  }, band)), /*#__PURE__*/React.createElement("div", {
    className: "c-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-stat-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-stat-lab"
  }, TC('target')), /*#__PURE__*/React.createElement(EditBlock, {
    value: L(det.target),
    label: TC('target'),
    variant: "stat",
    multiline: false,
    dirty: dk(['target']),
    rewritePath: ['target'],
    onCommit: v => edit(['target'], v)
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-latin c-stat-num tgt"
  }, L(det.target)))), /*#__PURE__*/React.createElement("div", {
    className: "c-stat-sub"
  }, TC('words_unit'))), /*#__PURE__*/React.createElement("div", {
    className: "c-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-stat-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-stat-lab"
  }, TC('worldtime'))), /*#__PURE__*/React.createElement(EditBlock, {
    value: L(det.worldtime),
    label: TC('worldtime'),
    variant: "stat",
    multiline: false,
    dirty: dk(['worldtime']),
    rewritePath: ['worldtime'],
    onCommit: v => edit(['worldtime'], v)
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-stat-big c-latin"
  }, L(det.worldtime)))))), /*#__PURE__*/React.createElement("div", {
    ref: bodyRef,
    className: 'wb2-body' + (!railOpen ? ' rail-closed' : railStacked ? ' rail-stacked' : ''),
    style: {
      '--rail-w': railW + 'px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wb2-spine"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wb2-zone primary"
  }, TC('wb_spine')), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('pos')), /*#__PURE__*/React.createElement(EditBlock, {
    value: L(det.pos),
    label: TC('pos'),
    variant: "lead",
    dirty: dk(['pos']),
    rewritePath: ['pos'],
    onCommit: v => edit(['pos'], v)
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-lead"
  }, L(det.pos)))), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('anchors')), /*#__PURE__*/React.createElement("div", {
    className: "c-anchorgrid"
  }, anchorRows.map(([key, ic]) => /*#__PURE__*/React.createElement("div", {
    key: key,
    className: "c-anchor"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ah"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ai"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: ic,
    s: 15
  })), TC(key)), /*#__PURE__*/React.createElement(EditBlock, {
    value: L(det.anchors[key]),
    label: TC(key),
    variant: "anchor",
    dirty: dk(['anchors', key]),
    rewritePath: ['anchors', key],
    onCommit: v => edit(['anchors', key], v)
  }, /*#__PURE__*/React.createElement("p", null, L(det.anchors[key]))))))), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('dilemma')), /*#__PURE__*/React.createElement(EditBlock, {
    value: L(det.dilemma),
    label: TC('dilemma'),
    variant: "lead",
    dirty: dk(['dilemma']),
    rewritePath: ['dilemma'],
    onCommit: v => edit(['dilemma'], v)
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-dilemma"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dq"
  }, '“'), L(det.dilemma), '”'))), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('plotpts'), /*#__PURE__*/React.createElement("span", {
    className: "c-note"
  }, TC('plotpts_note'))), /*#__PURE__*/React.createElement("ol", {
    className: "c-plot"
  }, det.points.map((p, i) => {
    const s = L(p).split('→');
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      className: "c-plot-item"
    }, /*#__PURE__*/React.createElement("span", {
      className: "pn c-latin"
    }, i + 1), /*#__PURE__*/React.createElement(EditBlock, {
      value: L(p),
      label: TC('plotpts') + ' ' + (i + 1),
      variant: "row",
      dirty: dk(['points', i]),
      rewritePath: ['points', i],
      onCommit: v => edit(['points', i], v)
    }, /*#__PURE__*/React.createElement("span", {
      className: "pt"
    }, s[0], s[1] !== undefined && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "arr"
    }, "\u2192"), /*#__PURE__*/React.createElement("b", null, s[1])))));
  })))), /*#__PURE__*/React.createElement("div", {
    id: "wb2-world-rail",
    className: "wb2-rail",
    hidden: !railOpen
  }, /*#__PURE__*/React.createElement(ResizeHandle, {
    side: "left",
    getWidth: () => railW,
    setWidth: setRailWidth,
    min: 300,
    max: 560,
    onDouble: () => setRailWidth(360)
  }), /*#__PURE__*/React.createElement("div", {
    className: "wb2-railhead"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "eye",
    s: 14
  }), /*#__PURE__*/React.createElement("span", null, TC('wb_track')), /*#__PURE__*/React.createElement("button", {
    className: "wb2-collapse",
    onClick: toggleRail,
    title: TC('wb_collapse')
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 14,
    w: 2
  }))), /*#__PURE__*/React.createElement("div", {
    className: "wb2-railscroll"
  }, /*#__PURE__*/React.createElement(WSMPanel, {
    wsm: D.wsm,
    collapsible: true,
    open: wsmOpen,
    onToggle: toggleWsm
  }), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('foreshadow')), /*#__PURE__*/React.createElement("div", {
    className: "c-fsd-list"
  }, det.foreshadow.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "c-fsd"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'c-badge ' + fcls[f.op]
  }, TC(fmap[f.op])), /*#__PURE__*/React.createElement("span", {
    className: "c-latin fid"
  }, f.id), /*#__PURE__*/React.createElement(EditBlock, {
    value: L(f.t),
    label: TC('foreshadow'),
    variant: "row",
    dirty: dk(['foreshadow', i, 't']),
    rewritePath: ['foreshadow', i, 't'],
    onCommit: v => edit(['foreshadow', i, 't'], v)
  }, /*#__PURE__*/React.createElement("span", {
    className: "ft"
  }, L(f.t), f.when && /*#__PURE__*/React.createElement("span", {
    className: "fw"
  }, " \xB7 ", L(f.when)))))))), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('debts')), /*#__PURE__*/React.createElement("div", {
    className: "c-fsd-list"
  }, det.debts.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "c-fsd"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'c-badge ' + (d.op === 'new' ? 'terra' : 'gold')
  }, TC(d.op === 'new' ? 'debt_new' : 'debt_pay')), /*#__PURE__*/React.createElement(EditBlock, {
    value: L(d.t),
    label: TC('debts'),
    variant: "row",
    dirty: dk(['debts', i, 't']),
    rewritePath: ['debts', i, 't'],
    onCommit: v => edit(['debts', i, 't'], v)
  }, /*#__PURE__*/React.createElement("span", {
    className: "ft"
  }, L(d.t), /*#__PURE__*/React.createElement("span", {
    className: "fw"
  }, " \xB7 ", L(d.who)))))))), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('infobound')), /*#__PURE__*/React.createElement("div", {
    className: "c-info wb2-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-ib know"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ibh"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "eye",
    s: 14
  }), TC('know')), (() => {
    const t = Array.isArray(det.know) ? det.know.map(x => L(x)).join('；') : L(det.know);
    return /*#__PURE__*/React.createElement(EditBlock, {
      value: t,
      label: TC('know'),
      variant: "ibrow",
      dirty: dk(['know']),
      rewritePath: ['know'],
      onCommit: v => edit(['know'], v)
    }, /*#__PURE__*/React.createElement("div", {
      className: "ibr"
    }, t));
  })()), /*#__PURE__*/React.createElement("div", {
    className: "c-ib dont"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ibh"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "eye",
    s: 14
  }), TC('dontknow')), (() => {
    const t = Array.isArray(det.dontknow) ? det.dontknow.map(x => L(x)).join('；') : L(det.dontknow);
    return /*#__PURE__*/React.createElement(EditBlock, {
      value: t,
      label: TC('dontknow'),
      variant: "ibrow",
      dirty: dk(['dontknow']),
      rewritePath: ['dontknow'],
      onCommit: v => edit(['dontknow'], v)
    }, /*#__PURE__*/React.createElement("div", {
      className: "ibr"
    }, t));
  })()))), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('iv_title'), /*#__PURE__*/React.createElement("span", {
    className: "c-note"
  }, TC('iv_note'))), /*#__PURE__*/React.createElement("div", {
    className: "iv-list"
  }, (det.info_voids || []).map((v, i) => /*#__PURE__*/React.createElement(IVRow, {
    key: i,
    v: v,
    idx: i,
    edit: edit,
    dk: dk
  })))), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('agent_line')), /*#__PURE__*/React.createElement(AgentRun, null))))), !railOpen && /*#__PURE__*/React.createElement(RailEdgeTab, {
    onOpen: toggleRail
  })), /*#__PURE__*/React.createElement(WriterGroupIntroModal, {
    open: introOpen,
    onClose: handleDismiss,
    onConfirm: handleConfirm
  }));
}
window.EditableDetailOutline = EditableDetailOutline;
}
