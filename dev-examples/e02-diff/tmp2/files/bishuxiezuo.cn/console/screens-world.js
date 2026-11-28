{
/* ===== 世界（world）页 · 一页两态（创世设定 ↔ 章节快照）===== */
const D = window.CONSOLE_DATA,
  L = window.L,
  TC = window.TC;
const {
  useState,
  useRef,
  useEffect
} = React;
const WorldContentActionButton = window.ContentActionButton;
const WorldConfirmDialog = window.ConfirmDialog;

/* The spine plays back real chapters: written ones plus any planned (todo) rows
   the near-term outline contributed. Coordinates are derived from D.chapters,
   not hardcoded, so the playhead lands on chapters that actually exist. */
function wdChaps() {
  return (D.chapters || []).map(c => c.no).filter(n => n > 0).sort((a, b) => a - b);
}
function wdNow() {
  const written = (D.chapters || []).filter(c => c && c.state !== 'todo').map(c => c.no);
  if (written.length) return Math.max(...written);
  const list = wdChaps();
  return list.length ? list[0] : 0;
}

/* Genre, status and active volume for the hero line. The stored genre keeps its field labels
   (【题材类型】：…) and an untranslated status is an internal code, so neither is shown raw. */
function wdHeroMeta() {
  const genre = String(L(D.book && D.book.genre) || '').split('\n')[0].replace(/【[^】]*】\s*[:：]\s*/g, '').trim();
  const status = String(L(D.book && D.book.status) || '').trim();
  const v = (D.volumes || []).find(x => x.state === 'active') || (D.volumes || [])[0];
  return [genre && genre !== 'Novel' ? genre : '', /^[a-z_]+$/.test(status) ? '' : status, v ? L(v.no) + ' ' + L(v.name) : ''].filter(Boolean).join(' · ');
}

/* ---------- timeline spine: 创世 cap + volume bands + draggable chapter playhead ---------- */
function WorldSpine({
  cursor,
  setCursor
}) {
  const canon = cursor === 'canon';
  const en = window.CLANG === 'en';
  const WD_CHAPS = wdChaps();
  const WD_NOW = wdNow();
  const trackRef = useRef(null);
  const dragRef = useRef(false);
  const volBy = st => (D.volumes || []).find(v => v && v.state === st) || {
    no: {
      zh: '',
      en: ''
    }
  };
  const vols = [{
    v: volBy('done'),
    w: 58,
    cls: 'done'
  }, {
    v: volBy('active'),
    w: 84,
    cls: 'active'
  }, {
    v: volBy('plan'),
    w: 34,
    cls: 'plan'
  }];
  const nearestChap = clientX => {
    if (!WD_CHAPS.length) return 'canon';
    const root = trackRef.current;
    if (!root) return WD_NOW || WD_CHAPS[0];
    const ticks = [...root.querySelectorAll('.wd-tick')];
    let best = WD_CHAPS[0],
      bd = Infinity;
    ticks.forEach(t => {
      const r = t.getBoundingClientRect();
      const d = Math.abs(clientX - (r.left + r.width / 2));
      if (d < bd) {
        bd = d;
        best = +t.dataset.ch;
      }
    });
    return best;
  };
  const onMove = e => {
    if (!dragRef.current) return;
    const c = nearestChap(e.clientX);
    if (c !== cursor) setCursor(c);
  };
  const onUp = () => {
    dragRef.current = false;
    try {
      document.body.style.cursor = '';
    } catch (_) {}
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  const startDrag = e => {
    dragRef.current = true;
    try {
      document.body.style.cursor = 'grabbing';
    } catch (_) {}
    const c = nearestChap(e.clientX);
    if (c !== cursor) setCursor(c);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    e.preventDefault();
  };
  const onKey = e => {
    const cur = canon ? -1 : WD_CHAPS.indexOf(cursor);
    if (e.key === 'ArrowRight') {
      const ni = Math.min(WD_CHAPS.length - 1, (cur < 0 ? -1 : cur) + 1);
      setCursor(WD_CHAPS[ni]);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      if (cur <= 0) setCursor('canon');else setCursor(WD_CHAPS[cur - 1]);
      e.preventDefault();
    }
  };
  const idx = WD_CHAPS.indexOf(cursor);
  /* Phones scroll the chapter row sideways, so a tap picks a chapter instead of a drag, and the
     picked (or current) chapter is kept in view. */
  const phone = window.useMobileLayout ? window.useMobileLayout() : false;
  const pick = e => {
    const c = nearestChap(e.clientX);
    if (c !== cursor) setCursor(c);
  };
  useEffect(() => {
    const track = trackRef.current;
    if (!phone || !track || track.scrollWidth <= track.clientWidth) return;
    const tick = track.querySelector('.wd-tick.sel') || track.querySelector('.wd-tick.now');
    if (!tick) return;
    const offset = tick.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    track.scrollLeft = Math.max(0, offset - track.clientWidth / 2);
  }, [phone, cursor]);
  return /*#__PURE__*/React.createElement("div", {
    className: "wd-spine",
    tabIndex: 0,
    onKeyDown: onKey,
    title: phone ? undefined : TC('wd_spine_drag')
  }, /*#__PURE__*/React.createElement("button", {
    className: 'wd-cap' + (canon ? ' on' : ''),
    onClick: () => setCursor('canon'),
    title: TC('wd_genesis')
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-cap-ic"
  }, "\u25C8"), /*#__PURE__*/React.createElement("span", {
    className: "wd-cap-l"
  }, TC('wd_genesis'))), /*#__PURE__*/React.createElement("div", {
    className: "wd-track",
    ref: trackRef,
    onPointerDown: phone ? undefined : startDrag,
    onClick: phone ? pick : undefined,
    style: {
      cursor: 'grab'
    }
  }, vols.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'wd-band ' + b.cls,
    style: {
      flex: b.w
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-band-l"
  }, L(b.v.no)), b.cls === 'active' && /*#__PURE__*/React.createElement("div", {
    className: "wd-ticks"
  }, WD_CHAPS.map(no => {
    const c = D.chapters.find(x => x.no === no);
    const sel = cursor === no;
    const future = c && c.state === 'todo';
    return /*#__PURE__*/React.createElement("span", {
      key: no,
      "data-ch": no,
      className: 'wd-tick' + (sel ? ' sel' : '') + (future ? ' future' : '') + (no === WD_NOW ? ' now' : '')
    }, sel && /*#__PURE__*/React.createElement("span", {
      className: "wd-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "wd-flag"
    }, no === WD_NOW ? TC('wd_now') + ' · ' + no : en ? 'ch.' + no : '第 ' + no + ' 章'), /*#__PURE__*/React.createElement("span", {
      className: "wd-stem"
    })), /*#__PURE__*/React.createElement("span", {
      className: "wd-tk-dot"
    }), /*#__PURE__*/React.createElement("span", {
      className: "wd-tk-no"
    }, no));
  }))))));
}

/* ---------- domain header (section heading inside hub) ---------- */
function WdDom({
  tone,
  t,
  s,
  enter,
  onEnter
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "wd-dom"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'wd-dom-d ' + tone
  }), /*#__PURE__*/React.createElement("span", {
    className: "wd-dom-t"
  }, t), /*#__PURE__*/React.createElement("span", {
    className: "wd-dom-s"
  }, s), enter && /*#__PURE__*/React.createElement("button", {
    className: "wd-enter",
    onClick: onEnter
  }, enter, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  })));
}

/* ---------- HUB · 设定态（创世底座）---------- */
function WorldHub({
  openReader,
  onEditWorld
}) {
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const en = window.CLANG === 'en';
  const cr = D.create;
  const story = Array.isArray(cr.story) ? cr.story : [];
  const engine = story.find(m => m.name.zh === '引擎层') || story[1] || {
    fields: []
  };
  const front = engine.fields.find(f => f.k.zh === '前台故事');
  const back = engine.fields.find(f => f.k.zh === '后台暗线');
  const conflict = ((story[0] || {
    fields: []
  }).fields.find(f => f.k.zh === '核心冲突') || {}).v;
  const blurb = D.shelf && D.shelf[0] && D.shelf[0].blurb || {
    zh: '',
    en: ''
  };
  const dist = {
    near: 'dist_near',
    mid: 'dist_mid',
    far: 'dist_far'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "wd-hub wd-stagger"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-hero-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-hero-bk c-serif"
  }, "\u300A", L(D.book.title), "\u300B"), /*#__PURE__*/React.createElement("span", {
    className: "wd-hero-meta"
  }, wdHeroMeta()), onEditWorld && WorldContentActionButton && /*#__PURE__*/React.createElement(WorldContentActionButton, {
    variant: "primary",
    icon: "pen",
    className: "wd-hero-edit",
    title: L({
      zh: '进入建书流程重新编辑世界观',
      en: 'Re-edit worldbuilding in the book creation flow'
    }),
    onClick: () => setEditConfirmOpen(true)
  }, L({
    zh: '重新编辑世界观',
    en: 'Re-edit worldbuilding'
  }))), /*#__PURE__*/React.createElement("div", {
    className: "wd-hero-prem c-serif"
  }, L(blurb)), /*#__PURE__*/React.createElement("div", {
    className: "wd-hero-counts"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-cnt"
  }, /*#__PURE__*/React.createElement("b", null, cr.worldDims.length), TC('wd_c_dims')), /*#__PURE__*/React.createElement("span", {
    className: "wd-cnt"
  }, /*#__PURE__*/React.createElement("b", null, cr.stats.chars), TC('wd_c_chars')), /*#__PURE__*/React.createElement("span", {
    className: "wd-cnt"
  }, /*#__PURE__*/React.createElement("b", null, D.wsm.forces.length), TC('wd_c_forces')), /*#__PURE__*/React.createElement("span", {
    className: "wd-cnt"
  }, /*#__PURE__*/React.createElement("b", null, D.wsm.undercurrents.length), TC('wd_c_under')), /*#__PURE__*/React.createElement("span", {
    className: "wd-cnt"
  }, /*#__PURE__*/React.createElement("b", null, D.create.story.reduce((n, m) => n + m.fields.length, 0)), TC('wd_c_bp')))), onEditWorld && WorldConfirmDialog && /*#__PURE__*/React.createElement(WorldConfirmDialog, {
    open: editConfirmOpen,
    title: L({
      zh: '重新编辑世界观',
      en: 'Re-edit worldbuilding'
    }),
    message: L({
      zh: '修改后的世界观只会用于尚未生成的章节。已经生成的卷纲、简纲、细纲和正文不会自动改变；如需同步新世界观，需要分别重新生成。',
      en: 'Worldbuilding changes apply only to chapters that have not been generated. Existing volume, brief and detailed outlines, and prose will not change unless you regenerate them.'
    }),
    cancelLabel: L({
      zh: '取消',
      en: 'Cancel'
    }),
    confirmLabel: L({
      zh: '进入编辑',
      en: 'Continue to edit'
    }),
    icon: "world",
    onClose: () => setEditConfirmOpen(false),
    onConfirm: () => {
      setEditConfirmOpen(false);
      onEditWorld();
    }
  }), /*#__PURE__*/React.createElement(WdDom, {
    tone: "gold",
    t: TC('wd_blueprint'),
    s: TC('wd_bp_sub').replace('{n}', cr.story.length),
    enter: TC('wd_enter'),
    onEnter: () => openReader({
      type: 'story'
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "wd-dna"
  }, conflict && /*#__PURE__*/React.createElement("div", {
    className: "wd-dna-lead c-serif"
  }, L(conflict)), /*#__PURE__*/React.createElement("div", {
    className: "wd-dna-cols"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-dna-col front"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-dna-l"
  }, TC('wd_front')), /*#__PURE__*/React.createElement("span", {
    className: "wd-dna-x"
  }, front ? L(front.v) : '')), /*#__PURE__*/React.createElement("div", {
    className: "wd-dna-col back"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-dna-l"
  }, TC('wd_back')), /*#__PURE__*/React.createElement("span", {
    className: "wd-dna-x"
  }, back ? L(back.v) : '')))), /*#__PURE__*/React.createElement(WdDom, {
    tone: "slate",
    t: TC('wd_worldview'),
    s: TC('wd_wv_sub').replace('{n}', cr.worldDims.length),
    enter: TC('wd_enter'),
    onEnter: () => openReader({
      type: 'dim',
      idx: 0
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "wd-dimgrid"
  }, cr.worldDims.map((d, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "wd-dim",
    onClick: () => openReader({
      type: 'dim',
      idx: i
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-dim-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-dim-n"
  }, L(d.name)), /*#__PURE__*/React.createElement("span", {
    className: "wd-dim-c"
  }, d.blocks.length, " ", TC('wd_fields'))), /*#__PURE__*/React.createElement("div", {
    className: "wd-dim-e"
  }, L(d.lead || d.sample)), /*#__PURE__*/React.createElement("div", {
    className: "wd-dim-tags"
  }, d.blocks.slice(0, 3).map((f, j) => /*#__PURE__*/React.createElement("span", {
    key: j,
    className: "wd-chip"
  }, L(f.k))), d.blocks.length > 3 && /*#__PURE__*/React.createElement("span", {
    className: "wd-chip more"
  }, "+", d.blocks.length - 3))))), /*#__PURE__*/React.createElement(WdDom, {
    tone: "terra",
    t: TC('wd_cast'),
    s: TC('wd_cast_sub').replace('{n}', cr.stats.chars),
    enter: TC('wd_enter_all').replace('{n}', cr.stats.chars),
    onEnter: () => openReader({
      type: 'cast',
      idx: 0
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "wd-castgrid"
  }, cr.cast.map((c, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "wd-cchip",
    onClick: () => openReader({
      type: 'cast',
      idx: i
    })
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-av",
    style: {
      background: avTint(c.tint)
    }
  }, L(c.name).replace(/\s/g, '')[0]), /*#__PURE__*/React.createElement("span", {
    className: "wd-cb"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-cn"
  }, L(c.name)), /*#__PURE__*/React.createElement("span", {
    className: "wd-crole"
  }, L(c.role), " \xB7 ", L(c.epithet)))))), /*#__PURE__*/React.createElement(WdDom, {
    tone: "terra",
    t: TC('wd_factions'),
    s: TC('wd_factions_sub').replace('{n}', D.wsm.forces.length),
    enter: TC('wd_enter'),
    onEnter: () => openReader({
      type: 'factions'
    })
  }), /*#__PURE__*/React.createElement("button", {
    className: "wd-teaser",
    onClick: () => openReader({
      type: 'factions'
    })
  }, D.wsm.forces.map((f, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "wd-trow"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'wsm-dist ' + f.distance
  }, TC(dist[f.distance])), /*#__PURE__*/React.createElement("span", {
    className: "wd-trow-n"
  }, L(f.name)))), /*#__PURE__*/React.createElement("span", {
    className: "wd-teaser-go"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  }))));
}

/* ---------- SNAPSHOT · 状态态（章节快照）---------- */
function WorldSnapshot({
  chap,
  setCursor,
  openReader
}) {
  const en = window.CLANG === 'en';
  const WD_NOW = wdNow();
  const c = D.chapters.find(x => x.no === chap);
  const title = c && c.title && c.title.zh !== '—' ? L(c.title) : '';
  const bookId = D.book && D.book.id;
  const written = !!(c && (c.world_state_ready === true || c.state !== 'todo'));
  const portal = !!(window.LF_PORTAL && window.LF_PORTAL.loadChapterWsm && bookId);
  // The loaded world-state machine matches this chapter when its no aligns.
  const wsmReady = !!(D.wsm && Number(D.wsm.no) === Number(chap));
  // Written chapters can pull their own world snapshot from the backend so
  // clicking a drafted chapter swaps the forces/undercurrents view in place.
  const [phase, setPhase] = useState(wsmReady ? 'ready' : written && portal ? 'loading' : 'none');
  React.useEffect(() => {
    if (wsmReady) {
      setPhase('ready');
      return;
    }
    if (!written || !portal) {
      setPhase('none');
      return;
    }
    let alive = true;
    setPhase('loading');
    window.LF_PORTAL.loadChapterWsm(bookId, chap).then(function (ok) {
      if (alive) setPhase(ok ? 'ready' : 'none');
    }).catch(function () {
      if (alive) setPhase('none');
    });
    return function () {
      alive = false;
    };
  }, [chap]);
  const head = /*#__PURE__*/React.createElement("div", {
    className: "wd-chaphead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-latin",
    style: {
      color: 'var(--gold-deep)',
      fontStyle: 'italic',
      fontSize: 13
    }
  }, (en ? 'ch.' : '第 ') + chap + (en ? '' : ' 章')), title && /*#__PURE__*/React.createElement("span", {
    className: "wd-chaphead-t c-serif"
  }, title), chap === WD_NOW ? /*#__PURE__*/React.createElement("span", {
    className: "c-badge gold"
  }, TC('wd_now')) : c && /*#__PURE__*/React.createElement("span", {
    className: 'c-badge ' + (c.state === 'writing' ? 'terra' : c.state === 'todo' ? 'ghost' : 'slate')
  }, c.state === 'writing' ? TC('writing_badge') : c.state === 'todo' ? en ? 'planned' : '待生成' : en ? 'drafted' : '已成文'), c && c.words && /*#__PURE__*/React.createElement("span", {
    className: "c-latin",
    style: {
      marginLeft: 'auto',
      fontSize: 12,
      color: 'var(--ink-3)'
    }
  }, c.words));
  if (phase !== 'ready') {
    const loading = phase === 'loading';
    return /*#__PURE__*/React.createElement("div", {
      className: "wd-snap wd-stagger"
    }, head, c && c.gist && L(c.gist) && /*#__PURE__*/React.createElement("div", {
      className: "c-lead slate"
    }, L(c.gist)), c && c.brief && /*#__PURE__*/React.createElement("div", {
      className: "c-block"
    }, /*#__PURE__*/React.createElement("div", {
      className: "c-label"
    }, TC('bf_beats')), /*#__PURE__*/React.createElement("ol", {
      className: "wd-beats"
    }, c.brief.beats.map((b, i) => /*#__PURE__*/React.createElement("li", {
      key: i
    }, L(b))))), /*#__PURE__*/React.createElement("div", {
      className: "wd-snapnote"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "clock",
      s: 15
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, loading ? TC('wd_snap_loading') : TC('wd_no_snapshot')), /*#__PURE__*/React.createElement("span", null, loading ? TC('wd_snap_loading_d') : TC('wd_no_snapshot_d'))), !loading && chap !== WD_NOW && /*#__PURE__*/React.createElement("button", {
      className: "c-btn gold sm",
      onClick: () => setCursor(WD_NOW)
    }, TC('wd_view_now').replace('{n}', WD_NOW))));
  }
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
  const deltaReady = !!(D.detail && Number(D.detail.no) === Number(chap));
  return /*#__PURE__*/React.createElement("div", {
    className: "wd-snap wd-stagger"
  }, head, /*#__PURE__*/React.createElement("div", {
    className: "wd-snapstat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-st"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, TC('wsm_time')), /*#__PURE__*/React.createElement("span", {
    className: "v c-latin"
  }, L(D.wsm.world_time))), /*#__PURE__*/React.createElement("div", {
    className: "wd-st"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, TC('wsm_adv')), /*#__PURE__*/React.createElement("span", {
    className: "v c-latin"
  }, L(D.wsm.time_advanced))), /*#__PURE__*/React.createElement("div", {
    className: "wd-st"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, TC('wsm_forces')), /*#__PURE__*/React.createElement("span", {
    className: "v c-latin"
  }, D.wsm.forces.length)), /*#__PURE__*/React.createElement("div", {
    className: "wd-st"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, TC('wsm_under')), /*#__PURE__*/React.createElement("span", {
    className: "v c-latin"
  }, D.wsm.undercurrents.length))), /*#__PURE__*/React.createElement(WSMPanel, {
    wsm: D.wsm
  }), /*#__PURE__*/React.createElement("div", {
    className: "wd-snaplinks",
    style: {
      display: 'none'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "wd-snaplink",
    onClick: () => openReader({
      type: 'factions'
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "agents",
    s: 14
  }), TC('wd_open_graph'), /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 12,
    w: 2
  })), /*#__PURE__*/React.createElement("button", {
    className: "wd-snaplink",
    onClick: () => openReader({
      type: 'under'
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "hook",
    s: 14
  }), TC('wd_open_ledger'), /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 12,
    w: 2
  })), /*#__PURE__*/React.createElement("button", {
    className: "wd-snaplink",
    onClick: () => openReader({
      type: 'ledger'
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "scale",
    s: 14
  }), TC('wd_open_book'), /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 12,
    w: 2
  }))), deltaReady && /*#__PURE__*/React.createElement("div", {
    className: "c-2col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('foreshadow')), /*#__PURE__*/React.createElement("div", {
    className: "c-fsd-list"
  }, D.detail.foreshadow.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "c-fsd"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'c-badge ' + fcls[f.op]
  }, TC(fmap[f.op])), /*#__PURE__*/React.createElement("span", {
    className: "c-latin fid"
  }, f.id), /*#__PURE__*/React.createElement("span", {
    className: "ft"
  }, L(f.t), f.when && /*#__PURE__*/React.createElement("span", {
    className: "fw"
  }, " \xB7 ", L(f.when))))))), /*#__PURE__*/React.createElement("div", {
    className: "c-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-label"
  }, TC('debts')), /*#__PURE__*/React.createElement("div", {
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
  }, " \xB7 ", L(d.who)))))))));
}

/* ---------- READER · field blocks ---------- */
function FieldBlock({
  k,
  v,
  tone
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: 'wd-fblock' + (tone ? ' ' + tone : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-fk"
  }, k), /*#__PURE__*/React.createElement("div", {
    className: "wd-fv"
  }, v));
}

/* ---------- scroll-spy section nav: all sections stacked; tabs jump to anchor ---------- */
function useSectionNav(initialIdx) {
  const {
    useRef,
    useState,
    useEffect,
    useCallback
  } = React;
  const rootRef = useRef(null),
    navRef = useRef(null),
    secRefs = useRef([]);
  const [active, setActive] = useState(initialIdx || 0);
  // Desktop scrolls the world body; the phone frame scrolls its own content area instead.
  const scroller = () => {
    const root = rootRef.current;
    if (!root) return null;
    const body = root.closest('.wd-body');
    const phone = root.closest('.lf-mobile .mobile-shell-content');
    const bodyScrolls = body && /(auto|scroll)/.test(getComputedStyle(body).overflowY);
    return phone && !bodyScrolls ? phone : body;
  };
  const headOffset = () => (navRef.current ? navRef.current.getBoundingClientRect().height : 46) + 14;
  const navTo = useCallback(i => {
    const sc = scroller(),
      el = secRefs.current[i];
    if (!sc || !el) return;
    const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - headOffset();
    sc.scrollTo({
      top: Math.max(0, top),
      behavior: 'smooth'
    });
    setActive(i);
  }, []);
  useEffect(() => {
    const sc = scroller();
    if (!sc) return;
    if (initialIdx) {
      const el = secRefs.current[initialIdx];
      if (el) sc.scrollTop = Math.max(0, el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - headOffset());
    }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const line = sc.getBoundingClientRect().top + headOffset() + 10;
        let cur = 0;
        secRefs.current.forEach((el, i) => {
          if (el && el.getBoundingClientRect().top <= line) cur = i;
        });
        setActive(cur);
      });
    };
    sc.addEventListener('scroll', onScroll, {
      passive: true
    });
    return () => {
      sc.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  const setRef = i => el => {
    secRefs.current[i] = el;
  };
  return {
    rootRef,
    navRef,
    setRef,
    active,
    navTo
  };
}
function DimReader({
  idx,
  back,
  onResource
}) {
  const cr = D.create;
  const nav = useSectionNav(idx || 0);
  useEffect(() => {
    const dim = cr.worldDims[nav.active];
    if (onResource) onResource(dim && dim.key ? {
      resource_type: 'world',
      resource_key: dim.key
    } : null);
  }, [nav.active, D.book && D.book.id, cr.worldDims[nav.active] && cr.worldDims[nav.active].key]);
  useEffect(() => () => {
    if (onResource) onResource(null);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "wd-reader",
    ref: nav.rootRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-stick",
    ref: nav.navRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-bc"
  }, /*#__PURE__*/React.createElement("button", {
    className: "wd-back",
    onClick: back
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  }), TC('wd_back_hub')), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), /*#__PURE__*/React.createElement("b", null, TC('wd_worldview'))), /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-tabs"
  }, cr.worldDims.map((x, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: 'wd-rtab' + (i === nav.active ? ' on' : ''),
    onClick: () => nav.navTo(i)
  }, L(x.name))))), cr.worldDims.map((d, i) => /*#__PURE__*/React.createElement("section", {
    key: i,
    ref: nav.setRef(i),
    className: "wd-rsec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-rd-ic slate"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "world",
    s: 18
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-t"
  }, L(d.name)), /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-m"
  }, d.blocks.length, " ", TC('wd_fields'), " \xB7 ", TC('wd_forged_by').replace('{a}', L(d.agent))))), /*#__PURE__*/React.createElement("div", {
    className: "wd-fblock lead slate"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-fv c-serif",
    style: {
      fontSize: 15
    }
  }, L(d.lead || d.sample))), /*#__PURE__*/React.createElement(DimBlocks, {
    dim: d,
    tone: "slate"
  }))));
}
function CastReader({
  idx,
  back,
  onResource
}) {
  const cr = D.create;
  const en = window.CLANG === 'en';
  const nav = useSectionNav(idx || 0);
  useEffect(() => {
    const character = cr.cast[nav.active];
    const key = character && (character.rawName || character.name && (character.name.zh || character.name.en));
    if (onResource) onResource(key ? {
      resource_type: 'character',
      resource_key: String(key)
    } : null);
  }, [nav.active, D.book && D.book.id, cr.cast[nav.active] && cr.cast[nav.active].rawName]);
  useEffect(() => () => {
    if (onResource) onResource(null);
  }, []);
  // grounded runtime @142 (from on_camera / forces / hook)
  const runtimeMap = {
    '沈　砚': {
      on: true,
      line: {
        zh: '被人潮卷入主街，腰间残剑首度自鸣。',
        en: 'Swept into the main street; the shard sings for the first time.'
      }
    },
    '柳明远': {
      on: true,
      line: {
        zh: '北码头鸣锣示警，旋即港门失守。',
        en: 'Sounds the gong at the north pier as the gate falls.'
      }
    },
    '赫连戈': {
      on: true,
      line: {
        zh: '率北境铁骑撞破港门。',
        en: 'Breaks the harbor gate at the head of the cavalry.'
      }
    },
    '执棋者': {
      on: false,
      line: {
        zh: '隐于幕后，剑鸣正回应街上的他。',
        en: 'Hidden behind the board; the blade answers him in the street.'
      }
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "wd-reader",
    ref: nav.rootRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-stick",
    ref: nav.navRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-bc"
  }, /*#__PURE__*/React.createElement("button", {
    className: "wd-back",
    onClick: back
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  }), TC('wd_back_hub')), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), /*#__PURE__*/React.createElement("b", null, TC('wd_cast'))), /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-tabs"
  }, cr.cast.map((x, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: 'wd-rtab' + (i === nav.active ? ' on' : ''),
    onClick: () => nav.navTo(i)
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-rtab-av",
    style: {
      background: avTint(x.tint)
    }
  }), L(x.name))))), cr.cast.map((c, i) => {
    const rt = runtimeMap[c.name.zh];
    return /*#__PURE__*/React.createElement("section", {
      key: i,
      ref: nav.setRef(i),
      className: "wd-rsec"
    }, /*#__PURE__*/React.createElement("div", {
      className: "wd-rd-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "wd-rd-ic",
      style: {
        background: avTint(c.tint)
      }
    }, L(c.name).replace(/\s/g, '')[0]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "wd-rd-t"
    }, L(c.name), " ", /*#__PURE__*/React.createElement("span", {
      className: "wd-rd-role"
    }, L(c.role), " \xB7 ", L(c.epithet))), /*#__PURE__*/React.createElement("div", {
      className: "wd-rd-m"
    }, TC('ck_prov')))), /*#__PURE__*/React.createElement("div", {
      className: "wd-fblock lead terra"
    }, /*#__PURE__*/React.createElement("div", {
      className: "wd-fv c-serif",
      style: {
        fontSize: 15
      }
    }, L(c.lead || c.sample))), /*#__PURE__*/React.createElement(CastProfile, {
      c: c
    }), rt && /*#__PURE__*/React.createElement("div", {
      className: "wd-runtime"
    }, /*#__PURE__*/React.createElement("div", {
      className: "wd-rt-h"
    }, /*#__PURE__*/React.createElement("span", {
      className: "c-dot active"
    }), TC('wd_runtime'), " \xB7 ", (en ? 'ch.' : '第 ') + wdNow() + (en ? '' : ' 章'), /*#__PURE__*/React.createElement("span", {
      className: "wd-rt-sub"
    }, rt.on ? TC('wd_oncam') : TC('wd_offcam'), " \xB7 ", TC('wd_runtime_sub'))), /*#__PURE__*/React.createElement("div", {
      className: "wd-rt-line"
    }, L(rt.line))));
  }));
}
function StoryReader({
  back,
  onResource
}) {
  const cr = D.create;
  const tone = ['gold', 'gold', 'terra'];
  useEffect(() => {
    if (onResource) onResource({
      resource_type: 'book',
      resource_key: 'story_plan'
    });
  }, [D.book && D.book.id]);
  useEffect(() => () => {
    if (onResource) onResource(null);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "wd-reader"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-bc"
  }, /*#__PURE__*/React.createElement("button", {
    className: "wd-back",
    onClick: back
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  }), TC('wd_back_hub')), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), /*#__PURE__*/React.createElement("b", null, TC('wd_blueprint'))), /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-rd-ic gold"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 18
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-t"
  }, TC('wd_blueprint')), /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-m"
  }, cr.story.length, " ", TC('wd_modules'), " \xB7 ", TC('wd_forged_by').replace('{a}', cr.story[0] ? L(cr.story[0].agent) : '')))), cr.story.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'wd-bpmod' + (m.name.zh === '引擎层' ? ' engine' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-bpmod-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'wd-bpmod-d ' + tone[i]
  }), /*#__PURE__*/React.createElement("span", {
    className: "wd-bpmod-n"
  }, L(m.name)), /*#__PURE__*/React.createElement("span", {
    className: "wd-bpmod-c"
  }, m.fields.length, " ", TC('wd_fields'))), /*#__PURE__*/React.createElement("div", {
    className: "wd-bpmod-lead c-serif"
  }, L(m.lead || m.sample)), /*#__PURE__*/React.createElement("div", {
    className: "wd-fgrid tri"
  }, m.fields.map((f, j) => /*#__PURE__*/React.createElement(FieldBlock, {
    key: j,
    k: L(f.k),
    v: L(f.v),
    tone: tone[i]
  }))))));
}
function worldForceRelations() {
  const dimensions = D.create && Array.isArray(D.create.worldDims) ? D.create.worldDims : [];
  for (const dimension of dimensions) {
    const blocks = Array.isArray(dimension && dimension.blocks) ? dimension.blocks : [];
    const exact = blocks.find(block => block && block.key === 'force_relations');
    if (exact && Array.isArray(exact.items)) return exact.items;
  }
  for (const dimension of dimensions) {
    const blocks = Array.isArray(dimension && dimension.blocks) ? dimension.blocks : [];
    const relationBlock = blocks.find(block => block && block.type === 'rel');
    if (relationBlock && Array.isArray(relationBlock.items)) return relationBlock.items;
  }
  return [];
}

/* ---------- READER · 势力关系图谱（复用建书阶段标准组件）---------- */
function FactionGraph({
  back
}) {
  const relations = worldForceRelations();
  return /*#__PURE__*/React.createElement("div", {
    className: "wd-reader"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-bc"
  }, /*#__PURE__*/React.createElement("button", {
    className: "wd-back",
    onClick: back
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  }), TC('wd_back_hub')), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), /*#__PURE__*/React.createElement("b", null, TC('wd_graph_title'))), /*#__PURE__*/React.createElement(window.RelationshipMap, {
    head: TC('wd_graph_title'),
    items: relations,
    clamp: false
  }));
}

/* ---------- READER · 暗线生命周期台账 ---------- */
function UndercurrentLedger({
  back
}) {
  const W = D.world;
  const ust = {
    dormant: 'ust_dormant',
    active: 'ust_active',
    accel: 'ust_accel',
    closing: 'ust_closing'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "wd-reader"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-bc"
  }, /*#__PURE__*/React.createElement("button", {
    className: "wd-back",
    onClick: back
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  }), TC('wd_back_hub')), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), /*#__PURE__*/React.createElement("b", null, TC('wd_ledger_title'))), /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-rd-ic",
    style: {
      background: 'var(--slate)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "hook",
    s: 18
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-t"
  }, TC('wd_ledger_title')), /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-m"
  }, TC('wd_ledger_note')))), W.threads.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "wd-thread"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-thread-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-thread-n"
  }, L(t.name)), /*#__PURE__*/React.createElement("span", {
    className: 'wsm-ust ' + t.status
  }, TC(ust[t.status])), /*#__PURE__*/React.createElement("span", {
    className: "c-latin fid"
  }, t.fid), /*#__PURE__*/React.createElement("span", {
    className: "wd-thread-rng"
  }, TC('wd_origin'), " ", t.origin, " \xB7 ", TC('wd_last'), " ", t.last)), /*#__PURE__*/React.createElement("div", {
    className: "wd-life"
  }, W.stages.map((s, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    className: 'wd-life-st' + (j < t.stage ? ' done' : '') + (j === t.stage ? ' cur' : '')
  }, j < W.stages.length - 1 && /*#__PURE__*/React.createElement("span", {
    className: "wd-life-line"
  }), /*#__PURE__*/React.createElement("span", {
    className: "wd-life-dot"
  }), /*#__PURE__*/React.createElement("span", {
    className: "wd-life-lab"
  }, L(s), j === t.stage ? ' · ' + TC('wd_stage_cur') : '')))), /*#__PURE__*/React.createElement("div", {
    className: "wd-thread-desc"
  }, L(t.desc)), /*#__PURE__*/React.createElement("div", {
    className: "wd-foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-foot-l"
  }, TC('wd_footprints')), t.footprints.map((f, j) => /*#__PURE__*/React.createElement("span", {
    key: j,
    className: 'wd-foot-chip' + (f.stage >= t.stage ? ' on' : '')
  }, /*#__PURE__*/React.createElement("b", {
    className: "c-latin"
  }, f.ch), L(f.note)))))));
}

/* ---------- READER · 伏笔 · 债务 全局账本 ---------- */
function LedgerReader({
  back
}) {
  const W = D.world;
  const [filter, setFilter] = useState('all');
  const fsCls = {
    planted: 'terra',
    advancing: 'slate',
    paid: 'gold'
  };
  const fsKey = {
    planted: 'wd_fs_planted',
    advancing: 'wd_fs_advancing',
    paid: 'wd_fs_paid'
  };
  const dtCls = {
    open: 'terra',
    progress: 'slate',
    settled: 'gold'
  };
  const dtKey = {
    open: 'wd_dt_open',
    progress: 'wd_dt_progress',
    settled: 'wd_dt_settled'
  };
  const filters = [['all', 'wd_l_all'], ['planted', 'wd_fs_planted'], ['advancing', 'wd_fs_advancing'], ['paid', 'wd_fs_paid']];
  const shown = W.foreshadows.filter(f => filter === 'all' || f.status === filter);
  const cnt = s => W.foreshadows.filter(f => f.status === s).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "wd-reader"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-bc"
  }, /*#__PURE__*/React.createElement("button", {
    className: "wd-back",
    onClick: back
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  }), TC('wd_back_hub')), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), /*#__PURE__*/React.createElement("b", null, TC('wd_ledger2_title'))), /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wd-rd-ic gold"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "scale",
    s: 18
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-t"
  }, TC('wd_ledger2_title')), /*#__PURE__*/React.createElement("div", {
    className: "wd-rd-m"
  }, TC('wd_ledger2_note')))), /*#__PURE__*/React.createElement("div", {
    className: "wd-snapstat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-st"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, TC('wd_l_fore')), /*#__PURE__*/React.createElement("span", {
    className: "v c-latin"
  }, W.foreshadows.length)), /*#__PURE__*/React.createElement("div", {
    className: "wd-st"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, TC('wd_fs_planted')), /*#__PURE__*/React.createElement("span", {
    className: "v c-latin",
    style: {
      color: 'var(--terra)'
    }
  }, cnt('planted'))), /*#__PURE__*/React.createElement("div", {
    className: "wd-st"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, TC('wd_fs_paid')), /*#__PURE__*/React.createElement("span", {
    className: "v c-latin",
    style: {
      color: 'var(--gold-deep)'
    }
  }, cnt('paid'))), /*#__PURE__*/React.createElement("div", {
    className: "wd-st"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, TC('wd_dt_open'), " \xB7 ", TC('wd_l_debt')), /*#__PURE__*/React.createElement("span", {
    className: "v c-latin"
  }, W.debts.filter(d => d.status !== 'settled').length))), /*#__PURE__*/React.createElement("div", {
    className: "c-label",
    style: {
      marginTop: 4,
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, TC('wd_l_fore'), /*#__PURE__*/React.createElement("span", {
    className: "wd-filters"
  }, filters.map(([k, lab]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: 'wd-filter' + (filter === k ? ' on' : ''),
    onClick: () => setFilter(k)
  }, TC(lab))))), /*#__PURE__*/React.createElement("div", {
    className: "wd-fstable"
  }, shown.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "wd-fsrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'c-badge ' + fsCls[f.status]
  }, TC(fsKey[f.status])), /*#__PURE__*/React.createElement("span", {
    className: "c-latin fid"
  }, f.id), /*#__PURE__*/React.createElement("span", {
    className: "wd-fsrow-t"
  }, L(f.t)), /*#__PURE__*/React.createElement("span", {
    className: "wd-fstrail"
  }, f.trail.map((t, j) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: j
  }, j > 0 && /*#__PURE__*/React.createElement("span", {
    className: "wd-fstrail-arr"
  }, "\u203A"), /*#__PURE__*/React.createElement("span", {
    className: 'wd-fstrail-ch c-latin' + (j === f.trail.length - 1 ? ' last' : '')
  }, t)))), /*#__PURE__*/React.createElement("span", {
    className: "wd-fsrow-po"
  }, TC('wd_l_payoff'), " ", /*#__PURE__*/React.createElement("b", null, L(f.payoff)))))), /*#__PURE__*/React.createElement("div", {
    className: "c-label",
    style: {
      marginTop: 6
    }
  }, TC('wd_l_debt')), /*#__PURE__*/React.createElement("div", {
    className: "wd-fstable"
  }, W.debts.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "wd-dtrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'c-badge ' + dtCls[d.status]
  }, TC(dtKey[d.status])), /*#__PURE__*/React.createElement("span", {
    className: "wd-dtrow-p"
  }, /*#__PURE__*/React.createElement("b", null, L(d.from)), /*#__PURE__*/React.createElement("span", {
    className: "wd-dtrow-arr"
  }, TC('wd_l_owes')), /*#__PURE__*/React.createElement("b", null, L(d.to))), /*#__PURE__*/React.createElement("span", {
    className: "wd-dtrow-t"
  }, L(d.t)), /*#__PURE__*/React.createElement("span", {
    className: "c-latin wd-dtrow-ch"
  }, d.incur)))));
}

/* ---------- root world view ---------- */
function ChapterCharacterState({
  bookId,
  chapter,
  back
}) {
  const en = window.CLANG === 'en';
  const [read, setRead] = useState({
      loading: true
    }),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setRead({
      loading: true
    });
    window.LF_API.request('/api/books/' + encodeURIComponent(bookId) + '/chapters/' + chapter + '/state', {
      signal: controller.signal
    }).then(data => {
      if (!controller.signal.aborted) setRead({
        data
      });
    }).catch(() => {
      if (!controller.signal.aborted) setRead({
        error: true
      });
    });
    return () => controller.abort();
  }, [bookId, chapter, attempt]);
  const labels = {
    identity: ['身份', 'Identity'],
    core_tags: ['核心特征', 'Core traits'],
    contrast_detail: ['反差', 'Contrast'],
    speech_style: ['说话风格', 'Speech style'],
    drives: ['动机与底线', 'Drives'],
    core_desire: ['核心欲望', 'Core desire'],
    deep_fear: ['深层恐惧', 'Deep fear'],
    secret: ['秘密', 'Secret'],
    bottom_line: ['底线', 'Bottom line'],
    snapshot: ['当前状态', 'Current state'],
    location: ['位置', 'Location'],
    physical_state: ['身体状态', 'Physical state'],
    social_situation: ['处境', 'Social situation'],
    current_goal: ['当前目标', 'Current goal'],
    current_constraints: ['当前限制', 'Constraints'],
    emotional_baseline: ['情绪基调', 'Emotional baseline'],
    possessions: ['持有物', 'Possessions'],
    scars: ['创伤', 'Scars'],
    trigger_event: ['触发事件', 'Trigger event'],
    trigger_chapter: ['触发章节', 'Trigger chapter'],
    psychological_impact: ['心理影响', 'Psychological impact'],
    trigger_words: ['触发词', 'Trigger words'],
    original_intensity: ['初始强度', 'Original intensity'],
    current_intensity: ['当前强度', 'Current intensity'],
    status: ['状态', 'Status'],
    motivations: ['行动动机', 'Motivations'],
    description: ['描述', 'Description'],
    source_event: ['来源事件', 'Source event'],
    source_chapter: ['来源章节', 'Source chapter'],
    priority: ['优先级', 'Priority'],
    relationships: ['人物关系', 'Relationships'],
    target: ['对象', 'Target'],
    trust: ['信任', 'Trust'],
    conflict: ['冲突', 'Conflict'],
    intimacy: ['亲密', 'Intimacy'],
    dependency: ['依赖', 'Dependency'],
    surface_relation: ['表面关系', 'Surface relationship'],
    hidden_tension: ['潜在矛盾', 'Hidden tension'],
    last_change_chapter: ['最近变化章节', 'Last changed chapter'],
    pov_firewall: ['知情范围', 'Knowledge'],
    public_info: ['已知信息', 'Known information'],
    hidden_info: ['未知信息', 'Unknown information'],
    revealed_chapter: ['揭示章节', 'Revealed chapter'],
    first_appearance: ['首次出场', 'First appearance'],
    last_appearance: ['最近出场', 'Last appearance'],
    chapter: ['章节', 'Chapter'],
    scene: ['场景', 'Scene'],
    note: ['说明', 'Note'],
    lifecycle: ['角色历程', 'Lifecycle'],
    death_detail: ['死亡情况', 'Death'],
    departure_detail: ['离场情况', 'Departure'],
    story_role: ['故事作用', 'Story role'],
    key_tags: ['特征', 'Traits'],
    relation_to_protagonist: ['与主角关系', 'Relation to protagonist'],
    pending_promises: ['未兑现承诺', 'Pending promises'],
    return_constraints: ['回归条件', 'Return constraints']
  };
  const render = value => {
    if (value == null || value === '') return null;
    if (Array.isArray(value)) return /*#__PURE__*/React.createElement("div", null, value.map((item, i) => /*#__PURE__*/React.createElement("div", {
      className: "c-block",
      key: i
    }, render(item))));
    if (typeof value === 'object') return /*#__PURE__*/React.createElement("dl", {
      className: "asst-action__facts"
    }, Object.entries(value).filter(([key]) => labels[key]).map(([key, item]) => /*#__PURE__*/React.createElement("div", {
      key: key,
      className: "asst-action__fact"
    }, /*#__PURE__*/React.createElement("dt", null, labels[key][en ? 1 : 0]), /*#__PURE__*/React.createElement("dd", null, render(item)))));
    return String(value);
  };
  const major = read.data?.character_state?.content,
    minor = read.data?.character_minor?.content;
  const rows = [...(Array.isArray(major) ? major : []), ...(Array.isArray(minor) ? minor : [])];
  return /*#__PURE__*/React.createElement("div", {
    className: "wd-reader"
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn ghost",
    onClick: back
  }, TC('wd_back_hub')), /*#__PURE__*/React.createElement("h2", null, en ? 'Chapter ' + chapter + ' character state' : '第 ' + chapter + ' 章角色状态'), read.loading ? /*#__PURE__*/React.createElement("p", {
    role: "status"
  }, en ? 'Loading…' : '正在读取…') : read.error || !rows.length ? /*#__PURE__*/React.createElement("div", {
    role: "status"
  }, /*#__PURE__*/React.createElement("p", null, en ? 'Character state could not be read.' : '角色状态暂未读取。'), /*#__PURE__*/React.createElement("button", {
    className: "c-btn",
    onClick: () => setAttempt(n => n + 1)
  }, en ? 'Reload' : '重新读取')) : rows.map((row, i) => /*#__PURE__*/React.createElement("section", {
    className: "c-block",
    key: row.name || i
  }, /*#__PURE__*/React.createElement("h3", null, row.name), render(row))));
}
function WorldView({
  ctl,
  toast,
  onEditWorld,
  chapterStateTarget
}) {
  const en = window.CLANG === 'en';
  const [cursor, setCursorS] = useState(() => {
    try {
      const v = localStorage.getItem('lf_world_cursor');
      return v === 'canon' || !v ? 'canon' : +v || 'canon';
    } catch (e) {
      return 'canon';
    }
  });
  const setCursor = v => {
    setCursorS(v);
    try {
      localStorage.setItem('lf_world_cursor', String(v));
    } catch (e) {}
  };
  const [reader, setReader] = useState(null); // {type:'dim'|'cast'|'story', idx}
  const openReader = r => setReader(r);
  const back = () => setReader(null);
  const reportResource = resource => {
    const cite = window.LF_ASSISTANT_CITE;
    const bookId = D.book && D.book.id;
    if (!cite) return;
    if (!resource || !bookId) {
      cite.clear({
        owner: 'world-page'
      });
      return;
    }
    cite.setObject(Object.assign({
      bookId,
      owner: 'world-page'
    }, resource));
  };
  useEffect(() => () => {
    if (window.LF_ASSISTANT_CITE) window.LF_ASSISTANT_CITE.clear({
      owner: 'world-page'
    });
  }, []);
  const resultTarget = chapterStateTarget && String(chapterStateTarget.bookId) === String(D.book && D.book.id) ? chapterStateTarget : null;
  const [resultRequest, setResultRequest] = useState(null);
  useEffect(() => {
    if (!resultTarget) return;
    setCursor(resultTarget.chapterNumber);
    setReader(resultTarget.kind === 'character_state' ? {
      type: 'character_state',
      chapter: resultTarget.chapterNumber
    } : null);
    setResultRequest(resultTarget.requestId);
  }, [resultTarget && resultTarget.requestId]);
  const canon = cursor === 'canon';
  const swapKey = reader ? 'r-' + reader.type + '-' + (reader.idx == null ? 0 : reader.idx) : canon ? 'hub' : 'snap-' + cursor;
  // The phone frame scrolls one content area for every page; a newly opened world view starts at its top.
  // Layout effect: it runs before a reader's own effect scrolls to the section it opened on.
  React.useLayoutEffect(() => {
    const scroller = document.querySelector('.lf-mobile .mobile-shell-content');
    if (scroller) scroller.scrollTop = 0;
  }, [swapKey]);
  const crumbTail = reader ? reader.type === 'character_state' ? en ? 'Character state' : '角色状态' : reader.type === 'dim' ? TC('wd_worldview') : reader.type === 'cast' ? TC('wd_cast') : reader.type === 'factions' ? TC('wd_graph_title') : reader.type === 'under' ? TC('wd_ledger_title') : reader.type === 'ledger' ? TC('wd_ledger2_title') : TC('wd_blueprint') : canon ? TC('wd_setup_state') : TC('wd_snapshot').replace('{n}', cursor);
  return /*#__PURE__*/React.createElement("div", {
    className: "c-main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-crumb"
  }, "\u300A", L(D.book.title), "\u300B", /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), TC('world'), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), /*#__PURE__*/React.createElement("b", null, crumbTail)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(TopCtl, ctl)), /*#__PURE__*/React.createElement(WorldSpine, {
    cursor: cursor,
    setCursor: v => {
      setCursor(v);
      setReader(null);
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "c-body wd-body",
    style: {
      overflow: 'auto',
      padding: '24px 30px',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wd-swap",
    key: swapKey
  }, reader ? reader.type === 'character_state' ? /*#__PURE__*/React.createElement(ChapterCharacterState, {
    key: String(D.book && D.book.id) + '-' + reader.chapter + '-' + resultRequest,
    bookId: D.book && D.book.id,
    chapter: reader.chapter,
    back: back
  }) : reader.type === 'dim' ? /*#__PURE__*/React.createElement(DimReader, {
    idx: reader.idx,
    setIdx: i => setReader({
      type: 'dim',
      idx: i
    }),
    back: back,
    onResource: reportResource
  }) : reader.type === 'cast' ? /*#__PURE__*/React.createElement(CastReader, {
    idx: reader.idx,
    setIdx: i => setReader({
      type: 'cast',
      idx: i
    }),
    back: back,
    onResource: reportResource
  }) : reader.type === 'factions' ? /*#__PURE__*/React.createElement(FactionGraph, {
    back: back
  }) : reader.type === 'under' ? /*#__PURE__*/React.createElement(UndercurrentLedger, {
    back: back
  }) : reader.type === 'ledger' ? /*#__PURE__*/React.createElement(LedgerReader, {
    back: back
  }) : /*#__PURE__*/React.createElement(StoryReader, {
    back: back,
    onResource: reportResource
  }) : canon ? /*#__PURE__*/React.createElement(WorldHub, {
    openReader: openReader,
    onEditWorld: onEditWorld
  }) : /*#__PURE__*/React.createElement(WorldSnapshot, {
    chap: cursor,
    setCursor: setCursor,
    openReader: openReader
  }))));
}
window.WorldView = WorldView;
}
