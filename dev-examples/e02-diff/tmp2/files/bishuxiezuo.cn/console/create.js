{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* ===== 建书向导 · 铸造一个世界（混合式） ===== */
const Dc = window.CONSOLE_DATA,
  Lc = window.L,
  TCc = window.TC;
const {
  useState: uS,
  useEffect: uE,
  useRef: uR
} = React;
const PREMISE_MAX_CHARS = 20000;
function creationPremise(state) {
  return (state.idea || '').trim() || (state.conflict || '').trim();
}
function requiresPremise(state) {
  return state.step === 0 && !creationPremise(state);
}
function characterSelectionAfterDelete(characters, currentName, deletedIndex) {
  if (!Array.isArray(characters) || !characters.length) return 0;
  const keptIndex = characters.findIndex(character => character.rawName === currentName);
  return keptIndex >= 0 ? keptIndex : Math.max(0, Math.min(deletedIndex, characters.length - 1));
}
function phaseRunDecision(stage, phase, options) {
  const opts = options || {};
  if (!stage || stage.tasksKnown !== true) return 'unknown';
  if (!opts.force && stage.done && stage.done[phase]) return 'done';
  if (!opts.force && !opts.retry && stage.failed && stage.failed[phase]) return 'failed';
  if (!opts.force && stage.activePhase && stage.activePhase !== phase) return 'wait';
  if (!opts.force && stage.running && stage.running[phase]) return 'attach';
  return opts.allowCreate ? 'create' : 'resume_missing';
}
function castReplacementDetail(error) {
  const detail = error && (error.detail || error.body && error.body.detail);
  return error && Number(error.status) === 409 && detail && detail.code === 'characters_exist' ? detail : null;
}
function castReplacementRequired(error) {
  return !!castReplacementDetail(error);
}
function castReplacementCount(error) {
  const detail = castReplacementDetail(error);
  return Math.max(0, Number(detail && detail.character_count) || 0);
}
/* 服务端拒绝未确认的整组覆盖时：从未生成过角色的书沿用现有角色并完成本阶段；
   失败生成留下的角色只加载出来，由用户经覆盖确认后再重新生成。 */
function resolveExistingCast(bookId, stage) {
  const portal = window.LF_PORTAL;
  const cast = stage && stage.phases && stage.phases.cast;
  const neverGenerated = !!(cast && !cast.latestTask);
  if (!portal || !portal.fetchCreatePhaseResult) return Promise.resolve(false);
  return portal.fetchCreatePhaseResult(bookId, 'cast').then(rows => neverGenerated && Array.isArray(rows) && rows.length > 0, () => false);
}
function Chips({
  list,
  val,
  set
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-chips"
  }, list.map((x, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: 'chip' + (val === i ? ' on' : ''),
    onClick: () => set(i)
  }, Lc(x))));
}

/* Multi-select chips with collapse/expand (show first VISIBLE items, fold rest) */
function ChipsMulti({
  items,
  selected,
  onToggle,
  onCustom,
  placeholder
}) {
  const [input, setInput] = uS('');
  const [open, setOpen] = uS(false);
  const addCustom = function () {
    var v = input.trim();
    setInput('');
    if (v && onCustom) onCustom(v);
  };
  var visible = open ? items.slice() : items.slice(0, 6);
  var hidden = items.length - 6;
  // 已选但不在可见集合里的（折叠的标准项 + 自定义项）补进来，确保选中状态始终可见，
  // 自定义输入提交后会作为选中 chip 出现，不再凭空消失。
  selected.forEach(function (x) {
    if (visible.indexOf(x) < 0) visible.push(x);
  });
  var inputLen = Math.min(Math.max(input.length || 8, 8), 40);
  // 单一输入框：回车或失焦即提交为选中 chip（不再额外渲染预览 chip 造成「两个样式」）。
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-chips"
  }, visible.map(function (x, i) {
    var on = selected.includes(x);
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: 'chip' + (on ? ' on' : ''),
      onClick: function () {
        onToggle(x);
      }
    }, x);
  }), !open && hidden > 0 && /*#__PURE__*/React.createElement("span", {
    className: "chip chip-more",
    onClick: function () {
      setOpen(true);
    }
  }, TCc('cr_expand') || '展开', " (", hidden, ")"), open && /*#__PURE__*/React.createElement("span", {
    className: "chip chip-less",
    onClick: function () {
      setOpen(false);
    }
  }, TCc('cr_collapse') || '收起'), /*#__PURE__*/React.createElement("input", {
    className: "cr-chip-input",
    value: input,
    onChange: function (e) {
      setInput(e.target.value);
    },
    onKeyDown: function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustom();
      }
    },
    onBlur: addCustom,
    placeholder: placeholder || TCc('cr_custom') || '自定义',
    size: inputLen
  }));
}

/* coverage radial graph (on-brand mini world-seed) */
function CoverageGraph({
  coveredKeys
}) {
  const fields = Dc.create.stdFields;
  const n = fields.length,
    cx = 130,
    cy = 118,
    R = 86;
  const covered = fields.filter(f => coveredKeys.has(f.key)).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "cov-graph"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 260 236",
    style: {
      width: '100%'
    }
  }, fields.map((f, i) => {
    const ang = i / n * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(ang) * R,
      y = cy + Math.sin(ang) * R;
    const on = coveredKeys.has(f.key);
    return /*#__PURE__*/React.createElement("line", {
      key: 'e' + i,
      x1: cx,
      y1: cy,
      x2: x,
      y2: y,
      className: 'cov-edge' + (on ? ' on' : '')
    });
  }), /*#__PURE__*/React.createElement("circle", {
    cx: cx,
    cy: cy,
    r: "26",
    className: "cov-core"
  }), /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: cy - 2,
    textAnchor: "middle",
    className: "cov-ctext",
    fontWeight: "600"
  }, covered, "/", n), /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: cy + 12,
    textAnchor: "middle",
    className: "cov-ctext2",
    fontSize: "8.5"
  }, TCc('cr_covered')), fields.map((f, i) => {
    const ang = i / n * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(ang) * R,
      y = cy + Math.sin(ang) * R;
    const on = coveredKeys.has(f.key);
    return /*#__PURE__*/React.createElement("g", {
      key: 'n' + i,
      className: 'cov-node' + (on ? ' on' : ' sug')
    }, /*#__PURE__*/React.createElement("circle", {
      cx: x,
      cy: y,
      r: "16"
    }), /*#__PURE__*/React.createElement("text", {
      x: x,
      y: y + 3,
      textAnchor: "middle",
      fontSize: "8.5"
    }, Lc(f.name).slice(0, 4)));
  })));
}

/* live analyst sidebar */
function AnalystSide({
  coveredKeys
}) {
  const fields = Dc.create.stdFields;
  const missing = fields.filter(f => !coveredKeys.has(f.key));
  const sug = TCc('cr_assist_sug');
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-pside-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-analyst"
  }, /*#__PURE__*/React.createElement("div", {
    className: "an-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "an-av"
  }, "\u6790"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "an-name"
  }, TCc('cr_analyst')), /*#__PURE__*/React.createElement("div", {
    className: "an-status"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-dot writing"
  }), TCc('cr_analyst_on')))), /*#__PURE__*/React.createElement("div", {
    className: "an-bubble"
  }, missing.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", null, TCc('cr_suggest')), /*#__PURE__*/React.createElement("ul", null, missing.slice(0, 3).map((f, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, Lc(f.name))))) : /*#__PURE__*/React.createElement("span", null, Lc({
    zh: '立意已相当完整，可以开始铸造了。',
    en: 'Your premise is quite complete — ready to forge.'
  }))), /*#__PURE__*/React.createElement("div", {
    className: "an-tips"
  }, sug.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "an-tip"
  }, t)))), /*#__PURE__*/React.createElement("div", {
    className: "cr-covwrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-flab"
  }, TCc('cr_coverage')), /*#__PURE__*/React.createElement(CoverageGraph, {
    coveredKeys: coveredKeys
  }), /*#__PURE__*/React.createElement("div", {
    className: "cr-oneline"
  }, TCc('cr_oneline'))));
}

/* ---------- Step 1 立意（稿纸式 + 可展开边栏） ---------- */
function PremiseStep({
  s,
  set
}) {
  const C = Dc.create;
  const taRef = uR(null);
  const fitTa = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };
  uE(() => {
    fitTa();
  }, [s.idea]);
  uE(() => {
    const t = setTimeout(fitTa, 420);
    return () => clearTimeout(t);
  }, [s.sidebarOpen]);
  const covered = new Set();
  covered.add('worldType');
  covered.add('coreMech');
  covered.add('style');
  covered.add('relationship');
  if (s.idea.trim()) covered.add('idea');
  if (s.idea.length > 80) {
    covered.add('conflict');
    covered.add('hook');
  }
  if (s.idea.length > 40) covered.add('motive');
  const toggle = key => v => {
    var arr = s[key] || [];
    set({
      [key]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
    });
  };
  const addCustom = key => v => {
    var arr = s[key] || [];
    if (!arr.includes(v)) set({
      [key]: [...arr, v]
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: 'cr-premise' + (s.sidebarOpen ? ' open' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-pmain"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-manus"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-kick"
  }, "\u2460 ", TCc('cr_step1'), " \xB7 Premise"), /*#__PURE__*/React.createElement("h1", {
    className: "cr-bigq"
  }, TCc('cr_head')), /*#__PURE__*/React.createElement("p", {
    className: "cr-bigsub"
  }, TCc('cr_sub')), /*#__PURE__*/React.createElement("div", {
    className: "cr-field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-flab"
  }, TCc('cr_booktitle')), /*#__PURE__*/React.createElement("input", {
    className: "cr-input",
    value: s.bookTitle,
    onChange: e => set({
      bookTitle: e.target.value
    }),
    placeholder: TCc('cr_booktitle_ph')
  })), /*#__PURE__*/React.createElement("textarea", {
    id: "cr-premise-input",
    className: "cr-textarea",
    ref: taRef,
    rows: 3,
    maxLength: PREMISE_MAX_CHARS,
    "aria-required": "true",
    placeholder: TCc('cr_ph'),
    value: s.idea,
    onChange: e => set({
      idea: e.target.value
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "cr-inline"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-flab"
  }, TCc('cr_worldType')), /*#__PURE__*/React.createElement(ChipsMulti, {
    items: C.worldTypes,
    selected: s.worldType || [],
    onToggle: toggle('worldType'),
    onCustom: addCustom('worldType')
  })), /*#__PURE__*/React.createElement("div", {
    className: "cr-field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-flab"
  }, TCc('cr_coreMech')), /*#__PURE__*/React.createElement(ChipsMulti, {
    items: C.coreMechs,
    selected: s.coreMech || [],
    onToggle: toggle('coreMech'),
    onCustom: addCustom('coreMech')
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cr-inline"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-flab"
  }, TCc('cr_style')), /*#__PURE__*/React.createElement(ChipsMulti, {
    items: C.styles,
    selected: s.style || [],
    onToggle: toggle('style'),
    onCustom: addCustom('style')
  })), /*#__PURE__*/React.createElement("div", {
    className: "cr-field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-flab"
  }, TCc('cr_relationship')), /*#__PURE__*/React.createElement(ChipsMulti, {
    items: C.relationships,
    selected: s.relationship || [],
    onToggle: toggle('relationship'),
    onCustom: addCustom('relationship')
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cr-inline"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-flab"
  }, TCc('cr_length')), /*#__PURE__*/React.createElement(Chips, {
    list: [{
      zh: '短',
      en: 'Short'
    }, {
      zh: '中',
      en: 'Medium'
    }, {
      zh: '长',
      en: 'Long'
    }],
    val: s.bookLength,
    set: i => set({
      bookLength: i
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "cr-field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-flab"
  }, TCc('cr_words')), /*#__PURE__*/React.createElement(Chips, {
    list: ['2000-2500', '3000-4000', '4000-5000', '5000-6000'],
    val: s.bookWords,
    set: i => set({
      bookWords: i
    })
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cr-opts"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-flab"
  }, TCc('cr_opts')), /*#__PURE__*/React.createElement("div", {
    className: "cr-optgrid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-opt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "opt-lab"
  }, TCc('cr_booklang')), /*#__PURE__*/React.createElement(Chips, {
    list: C.bookLangs,
    val: s.bookLang,
    set: i => set({
      bookLang: i
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "cr-opt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "opt-lab"
  }, TCc('cr_gmode')), /*#__PURE__*/React.createElement("div", {
    className: "cr-mseg"
  }, /*#__PURE__*/React.createElement("button", {
    className: s.mode === 'copilot' ? 'on' : '',
    onClick: () => set({
      mode: 'copilot'
    })
  }, TCc('cr_review')), /*#__PURE__*/React.createElement("button", {
    className: s.mode === 'auto' ? 'on' : '',
    onClick: () => set({
      mode: 'auto'
    })
  }, TCc('cr_autorun'))), /*#__PURE__*/React.createElement("div", {
    className: "opt-d"
  }, s.mode === 'auto' ? TCc('cr_autorun_d') : TCc('cr_review_d'))))))), /*#__PURE__*/React.createElement("button", {
    className: "cr-pside-tab",
    onClick: () => set({
      sidebarOpen: !s.sidebarOpen
    }),
    title: TCc('cr_assist')
  }, /*#__PURE__*/React.createElement("span", {
    className: "tab-ico"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: s.sidebarOpen ? 'caret' : 'bolt',
    s: 16
  })), /*#__PURE__*/React.createElement("span", {
    className: "tab-t"
  }, TCc('cr_assist'))), /*#__PURE__*/React.createElement("div", {
    className: "cr-pside"
  }, /*#__PURE__*/React.createElement(AnalystSide, {
    coveredKeys: covered
  })));
}

/* ---------- 通用生成段（世界观 / 角色表 / 故事规划） ---------- */
function genPositions(n, cx, cy, R) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = i / Math.max(n, 3) * Math.PI * 2 - Math.PI / 2;
    out.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
  }
  return out;
}
function seqTag(kind, i) {
  const en = window.CLANG === 'en';
  if (kind === 'world') {
    return i > 0 ? en ? 'on prior ' + i : '承接前 ' + i + ' 维' : null;
  }
  if (kind === 'cast') {
    return en ? 'reads world' : '基于已铸世界';
  }
  return i === 0 ? en ? 'reads world+cast' : '读取世界·角色' : en ? '+prior ' + i : '+前 ' + i + ' 层';
}
function phaseCfg(kind) {
  if (kind === 'cast') return {
    items: Dc.create.cast,
    center: Lc({
      zh: '人物',
      en: 'Cast'
    }),
    tf: TCc('cr_cast_forging'),
    td: TCc('cr_cast_done'),
    seq: TCc('cr_seq_note_cast')
  };
  if (kind === 'story') return {
    items: Dc.create.story,
    center: Lc({
      zh: '故事',
      en: 'Story'
    }),
    tf: TCc('cr_story_forging'),
    td: TCc('cr_story_done'),
    seq: TCc('cr_seq_note_story')
  };
  return {
    items: Dc.create.worldDims,
    center: Lc({
      zh: '世界',
      en: 'World'
    }),
    tf: TCc('cr_forging'),
    td: TCc('cr_forge_done'),
    seq: TCc('cr_seq_note')
  };
}
/* 维度专属「正在做什么」动词——占位卡片下方那行不再是冷冰冰的「小说引擎」 */
const WORLD_DIM_VERB = {
  core_laws: {
    zh: '正在立法',
    en: 'drafting laws'
  },
  space_time: {
    zh: '正在勘舆',
    en: 'mapping the world'
  },
  society: {
    zh: '正在考据',
    en: 'researching society'
  },
  history_culture: {
    zh: '正在修史',
    en: 'compiling history'
  },
  existence: {
    zh: '正在参详',
    en: 'contemplating being'
  },
  information: {
    zh: '正在采风',
    en: 'gathering signals'
  }
};
function worldDimAgentLine(key, working) {
  const portal = window.LF_PORTAL;
  const agent = portal && portal.mapCreate && portal.mapCreate.worldDimensionAgent ? portal.mapCreate.worldDimensionAgent(key) : {
    zh: '小说引擎',
    en: 'Novel engine'
  };
  if (!working) return agent;
  const v = WORLD_DIM_VERB[key] || {
    zh: '正在推演',
    en: 'reasoning'
  };
  return {
    zh: Lc(agent) + v.zh + '…',
    en: Lc(agent) + ' · ' + v.en
  };
}
function expectedWorldDims(items, activeIdx) {
  const actual = Array.isArray(items) ? items : [];
  const portal = window.LF_PORTAL;
  const keys = portal && Array.isArray(portal.worldDimensionKeys) ? portal.worldDimensionKeys : [];
  if (!keys.length) return actual;
  const byKey = {};
  actual.forEach(d => {
    if (d && d.key) byKey[d.key] = d;
  });
  const live = actual.length;
  return keys.map((key, i) => {
    if (byKey[key]) return byKey[key];
    const label = portal.mapCreate && portal.mapCreate.worldDimensionLabel ? portal.mapCreate.worldDimensionLabel(key) : {
      zh: key,
      en: key
    };
    const working = i === live; // 第一个尚未到达的维度即正在生成
    return {
      key,
      name: label,
      agent: worldDimAgentLine(key, working),
      sub: 0,
      sample: working ? {
        zh: '本维度正在生成，稍候即可预览。',
        en: 'This dimension is being generated…'
      } : {
        zh: '等待前序维度完成后再生成。',
        en: 'Waiting for previous dimensions.'
      },
      fields: [{
        k: {
          zh: '状态',
          en: 'Status'
        },
        v: working ? worldDimAgentLine(key, true) : {
          zh: '排队中',
          en: 'Queued'
        }
      }]
    };
  });
}
function worldEditingReady(items, phaseDone) {
  const portal = window.LF_PORTAL;
  const keys = portal && Array.isArray(portal.worldDimensionKeys) ? portal.worldDimensionKeys : [];
  if (!phaseDone || !keys.length) return false;
  const readyKeys = new Set((Array.isArray(items) ? items : []).filter(Boolean).map(item => item.key));
  return keys.every(key => readyKeys.has(key));
}
/* 故事规划占位骨架——所有信息一次到达，前端按维度做分步假加载（见 GenPhase） */
function expectedStorySections(items) {
  const actual = Array.isArray(items) ? items : [];
  const portal = window.LF_PORTAL;
  const keys = portal && Array.isArray(portal.storySectionKeys) ? portal.storySectionKeys : [];
  if (!keys.length) return actual;
  const byKey = {};
  actual.forEach(d => {
    if (d && d.key) byKey[d.key] = d;
  });
  const names = {
    surface: {
      zh: '表层设定',
      en: 'Surface'
    },
    engine: {
      zh: '故事引擎',
      en: 'Story Engine'
    },
    payoff: {
      zh: '兑现系统',
      en: 'Payoff'
    },
    constraints: {
      zh: '约束红线',
      en: 'Constraints'
    }
  };
  return keys.map(key => {
    if (byKey[key]) return byKey[key];
    const agent = portal.mapCreate && portal.mapCreate.storySectionAgent ? portal.mapCreate.storySectionAgent(key) : {
      zh: '故事架构师',
      en: 'Story Architect'
    };
    return {
      key,
      name: names[key] || {
        zh: key,
        en: key
      },
      agent,
      sub: 0,
      sample: {
        zh: '本维度正在推演，稍候即可预览。',
        en: 'This dimension is being reasoned…'
      },
      fields: [{
        k: {
          zh: '状态',
          en: 'Status'
        },
        v: {
          zh: Lc(agent) + '正在推演…',
          en: Lc(agent) + ' reasoning…'
        }
      }]
    };
  });
}
function phaseDisplayItems(kind, items, activeIdx) {
  if (kind === 'world') return expectedWorldDims(items, activeIdx);
  if (kind === 'story') return expectedStorySections(items);
  return items;
}
function PhaseBandMini({
  filled,
  total,
  done,
  error,
  center,
  titleForging,
  titleDone,
  onReroll
}) {
  const pos = genPositions(total, 60, 52, 38);
  const generationBlocked = !!(window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED());
  return /*#__PURE__*/React.createElement("div", {
    className: 'cr-bandmini' + (error ? ' failed' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-bandmini-top"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 120 104",
    style: {
      width: 84,
      height: 'auto',
      flex: 'none'
    }
  }, pos.map((p, i) => i < filled && /*#__PURE__*/React.createElement("line", {
    key: 'e' + i,
    x1: "60",
    y1: "52",
    x2: p[0],
    y2: p[1],
    className: 'cr-sedge' + (i === filled - 1 ? ' live' : '')
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "60",
    cy: "52",
    r: "16",
    className: "cr-score"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "60",
    cy: "52",
    r: "4.5",
    className: "cr-spulse"
  }), /*#__PURE__*/React.createElement("text", {
    x: "60",
    y: "55",
    textAnchor: "middle",
    className: "cr-stext",
    fontSize: "9",
    fontWeight: "600"
  }, center), pos.map((p, i) => i < filled && /*#__PURE__*/React.createElement("g", {
    key: 'n' + i,
    className: "cr-snode"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: p[0],
    cy: p[1],
    r: "9",
    className: "cr-ssat"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "cr-bandmini-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-serif cr-bandmini-t"
  }, done ? titleDone : error ? TCc('cr_gen_failed') : titleForging), /*#__PURE__*/React.createElement("div", {
    className: "cr-band-sub c-latin"
  }, Math.min(filled, total), " / ", total), done && /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm cr-reroll",
    onClick: onReroll,
    disabled: generationBlocked
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 12
  }), TCc('cr_reroll')))));
}
function RevisionHistoryButton({
  onClick
}) {
  const Button = window.ContentActionButton,
    Tools = window.DetailTools;
  if (!Button) return null;
  const button = /*#__PURE__*/React.createElement(Button, {
    icon: "clock",
    className: "cr-history-trigger",
    onClick: onClick
  }, Lc({
    zh: '修订记录',
    en: 'Revision history'
  }));
  return Tools ? /*#__PURE__*/React.createElement(Tools, null, button) : button;
}
function revisionSourceLabel(revision) {
  const source = String(revision && revision.source_detail || '') + ' ' + String(revision && revision.source || '');
  if (/field_rewrite|rewrite/i.test(source)) return Lc({
    zh: 'AI 改写',
    en: 'AI rewrite'
  });
  if (/rollback|restore/i.test(source)) return Lc({
    zh: '版本恢复',
    en: 'Restored'
  });
  if (/workflow|generat/i.test(source)) return Lc({
    zh: 'AI 生成',
    en: 'AI generated'
  });
  if (/portal_user|manual/i.test(source)) return Lc({
    zh: '手工编辑',
    en: 'Manual edit'
  });
  return Lc({
    zh: '其他修订',
    en: 'Other change'
  });
}
function revisionProgressLabel(revision) {
  const metadata = revision && revision.metadata && typeof revision.metadata === 'object' ? revision.metadata : {};
  if (metadata.latest_written_chapter == null) return Lc({
    zh: '进度未记录',
    en: 'Progress not recorded'
  });
  const chapter = Math.max(0, Number(metadata.latest_written_chapter) || 0);
  return chapter === 0 ? Lc({
    zh: '正文未开始',
    en: 'Prose not started'
  }) : Lc({
    zh: '当时正文至第 ' + chapter + ' 章',
    en: 'Prose was at chapter ' + chapter
  });
}
function CreateRevisionHistory({
  bookId,
  config,
  onClose,
  onRestored
}) {
  const resources = config && Array.isArray(config.resources) ? config.resources : [];
  const packageConfig = config && config.package && typeof config.package === 'object' ? config.package : null;
  const packageMode = !!packageConfig;
  const [resourceIndex, setResourceIndex] = uS(0);
  const [list, setList] = uS(null);
  const [currentVersions, setCurrentVersions] = uS(null);
  const [selected, setSelected] = uS(null);
  const [detail, setDetail] = uS(null);
  const [loadingDetail, setLoadingDetail] = uS(false);
  const [showOriginal, setShowOriginal] = uS(false);
  const [error, setError] = uS('');
  const [confirm, setConfirm] = uS(false);
  const [restoring, setRestoring] = uS(false);
  const listToken = uR(0);
  const detailToken = uR(0);
  const resource = resources[resourceIndex] || resources[0];
  const revisionId = revision => packageMode ? revision && revision.package_revision_id : revision && revision.revision_id;
  const revisionVersion = revision => packageMode ? revision && revision.package_version : revision && revision.version;
  const formatTime = value => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString(window.CLANG === 'en' ? 'en-US' : 'zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(value);
    }
  };
  const pick = async (revision, targetResource = resource) => {
    if (!packageMode && !targetResource || !revision) return;
    const token = ++detailToken.current;
    setSelected(revision);
    setDetail(null);
    setLoadingDetail(true);
    setError('');
    setShowOriginal(false);
    try {
      const value = packageMode ? await window.LF_PORTAL.planningPackageRevision(bookId, packageConfig.volumeNumber, revision.package_revision_id) : await window.LF_PORTAL.resourceRevision(bookId, targetResource.type, targetResource.key, revision.revision_id);
      if (token === detailToken.current) setDetail(value);
    } catch (e) {
      if (token === detailToken.current) setError(String(e && e.message || e || Lc({
        zh: '修订详情读取失败',
        en: 'Could not load revision'
      })));
    } finally {
      if (token === detailToken.current) setLoadingDetail(false);
    }
  };
  const loadList = async () => {
    if (!packageMode && !resource || !bookId) return;
    const targetResource = resource;
    const token = ++listToken.current;
    ++detailToken.current;
    setList(null);
    setSelected(null);
    setDetail(null);
    setError('');
    try {
      const response = packageMode ? await window.LF_PORTAL.planningPackageRevisions(bookId, packageConfig.volumeNumber) : await window.LF_PORTAL.resourceRevisions(bookId, targetResource.type, targetResource.key);
      const revisions = packageMode && response && Array.isArray(response.revisions) ? response.revisions : response;
      const next = Array.isArray(revisions) ? revisions : [];
      if (token !== listToken.current) return;
      setCurrentVersions(packageMode && response && response.current_versions ? response.current_versions : null);
      setList(next);
      if (next.length) await pick(next[0], targetResource);
    } catch (e) {
      if (token === listToken.current) {
        setList([]);
        setError(String(e && e.message || e || Lc({
          zh: '修订记录读取失败',
          en: 'Could not load revision history'
        })));
      }
    }
  };
  uE(() => {
    loadList();
  }, [bookId, packageMode, packageConfig && packageConfig.volumeNumber, resource && resource.type, resource && resource.key]);
  const restore = async () => {
    if (!packageMode && !resource || !selected || restoring || selected.restorable === false) return;
    setRestoring(true);
    setError('');
    try {
      if (packageMode) await window.LF_PORTAL.restorePlanningPackageRevision(bookId, packageConfig.volumeNumber, selected, currentVersions);else await window.LF_PORTAL.restoreResourceRevision(bookId, resource.type, resource.key, selected);
      if (onRestored) await onRestored(config.phase, config);
      setConfirm(false);
      await loadList();
    } catch (e) {
      setConfirm(false);
      setError(String(e && e.message || e || Lc({
        zh: '版本恢复失败',
        en: 'Could not restore revision'
      })));
    } finally {
      setRestoring(false);
    }
  };
  const Diff = window.LF_REWRITE_DIFF && window.LF_REWRITE_DIFF.InlineStructuredDiff;
  const packageDiff = value => {
    const source = value && typeof value === 'object' ? value : {};
    const result = {};
    result[Lc({
      zh: '卷纲',
      en: 'Volume outline'
    })] = source.volume || {};
    result[Lc({
      zh: '简纲',
      en: 'Brief outline'
    })] = source.near_term || {};
    return result;
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "cr-drawer-scrim",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("aside", {
    className: "cr-drawer cr-revision-drawer",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": Lc({
      zh: '建书修订记录',
      en: 'Creation revision history'
    }),
    onClick: event => event.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-drawer-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ad"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "clock",
    s: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "ht"
  }, /*#__PURE__*/React.createElement("b", null, config.title), /*#__PURE__*/React.createElement("i", null, Lc({
    zh: '每次修改都保留为独立版本，可查看差异或恢复',
    en: 'Every change is retained and can be reviewed or restored'
  }))), /*#__PURE__*/React.createElement("button", {
    className: "edt-x",
    onClick: onClose,
    title: Lc({
      zh: '关闭',
      en: 'Close'
    })
  }, "\xD7")), !packageMode && resources.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "cr-revision-tabs",
    role: "tablist"
  }, resources.map((item, index) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "tab",
    "aria-selected": resourceIndex === index,
    className: resourceIndex === index ? 'on' : '',
    key: item.type + item.key,
    onClick: () => setResourceIndex(index)
  }, item.label))), /*#__PURE__*/React.createElement("div", {
    className: "cr-revision-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-revision-list"
  }, list === null && /*#__PURE__*/React.createElement("div", {
    className: "cr-revision-msg c-shimmer"
  }, Lc({
    zh: '正在读取修订记录…',
    en: 'Loading revisions…'
  })), list !== null && !list.length && /*#__PURE__*/React.createElement("div", {
    className: "cr-revision-msg"
  }, Lc({
    zh: '暂无修订记录',
    en: 'No revisions yet'
  })), (list || []).map(revision => /*#__PURE__*/React.createElement("button", {
    type: "button",
    key: revisionId(revision),
    className: 'cr-revision-item' + (selected && revisionId(selected) === revisionId(revision) ? ' on' : ''),
    onClick: () => pick(revision)
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-revision-item-top"
  }, /*#__PURE__*/React.createElement("b", {
    className: "c-latin"
  }, "v", revisionVersion(revision)), /*#__PURE__*/React.createElement("span", null, revisionSourceLabel(revision))), /*#__PURE__*/React.createElement("time", null, formatTime(revision.created_at)), /*#__PURE__*/React.createElement("small", null, revisionProgressLabel(revision))))), /*#__PURE__*/React.createElement("div", {
    className: "cr-revision-detail"
  }, error && /*#__PURE__*/React.createElement("div", {
    className: "cr-revision-error",
    role: "alert"
  }, error), !selected && !error && /*#__PURE__*/React.createElement("div", {
    className: "cr-revision-msg"
  }, Lc({
    zh: '选择一个版本查看改动',
    en: 'Choose a revision to inspect'
  })), selected && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "cr-revision-detailbar"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", {
    className: "c-latin"
  }, "v", revisionVersion(selected)), /*#__PURE__*/React.createElement("span", null, revisionSourceLabel(selected), " \xB7 ", formatTime(selected.created_at))), /*#__PURE__*/React.createElement("div", {
    className: "cr-revision-detail-actions"
  }, detail && Diff && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn sm",
    onClick: () => setShowOriginal(value => !value)
  }, showOriginal ? Lc({
    zh: '查看差异',
    en: 'Show diff'
  }) : Lc({
    zh: '查看原版',
    en: 'Show original'
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn gold sm",
    disabled: loadingDetail || restoring || !detail || selected.restorable === false,
    onClick: () => setConfirm(true)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "clock",
    s: 12
  }), selected.restorable === false ? Lc({
    zh: '此版本不可恢复',
    en: 'Unavailable'
  }) : Lc({
    zh: '恢复此版本',
    en: 'Restore this version'
  })))), /*#__PURE__*/React.createElement("div", {
    className: "cr-revision-progress"
  }, /*#__PURE__*/React.createElement("span", null, Lc({
    zh: '写入这个版本时',
    en: 'When this version was saved'
  })), /*#__PURE__*/React.createElement("b", null, revisionProgressLabel(selected))), /*#__PURE__*/React.createElement("div", {
    className: "cr-revision-diff"
  }, loadingDetail ? /*#__PURE__*/React.createElement("div", {
    className: "cr-revision-msg c-shimmer"
  }, Lc({
    zh: '正在读取版本内容…',
    en: 'Loading revision…'
  })) : detail && Diff ? /*#__PURE__*/React.createElement(Diff, {
    before: packageMode ? packageDiff(detail.before_content) : detail.before_content,
    after: packageMode ? packageDiff(detail.after_content) : detail.after_content,
    showOriginal: showOriginal
  }) : null)))))), /*#__PURE__*/React.createElement(ConfirmDialog, {
    open: confirm,
    icon: "clock",
    tone: "danger",
    title: packageMode ? Lc({
      zh: '恢复第 ' + packageConfig.volumeNumber + ' 卷规划 v' + (selected ? revisionVersion(selected) : ''),
      en: 'Restore volume ' + packageConfig.volumeNumber + ' plan v' + (selected ? revisionVersion(selected) : '')
    }) : Lc({
      zh: '恢复 ' + (resource ? resource.label : '') + ' v' + (selected ? revisionVersion(selected) : ''),
      en: 'Restore ' + (resource ? resource.label : '') + ' v' + (selected ? revisionVersion(selected) : '')
    }),
    message: packageMode ? Lc({
      zh: '恢复后会同时替换本卷的卷纲和简纲，并生成一个新的整体修订版本。已经生成的细纲和正文不会自动改变。',
      en: 'Both outlines in this volume will be restored as one new revision. Existing chapter plans and prose will not change.'
    }) : Lc({
      zh: '恢复后会把当前内容替换为所选版本，并生成一条新的修订记录。已经生成的卷纲、简纲、细纲和正文不会自动改变，除非你重新生成它们。',
      en: 'The selected content will become a new revision. Existing outlines and prose will not change unless regenerated.'
    }),
    cancelLabel: Lc({
      zh: '取消',
      en: 'Cancel'
    }),
    confirmLabel: restoring ? Lc({
      zh: '恢复中…',
      en: 'Restoring…'
    }) : Lc({
      zh: '确认恢复',
      en: 'Restore'
    }),
    confirmDisabled: restoring,
    onClose: () => !restoring && setConfirm(false),
    onConfirm: restore
  }));
}
function ItemRow({
  dim,
  i,
  filled,
  done,
  error,
  kind,
  sel,
  onSel
}) {
  const isFilled = i < filled,
    active = !error && i === filled && !done;
  return /*#__PURE__*/React.createElement("div", {
    className: 'cr-itemrow' + (isFilled ? ' filled' : '') + (active ? ' active' : '') + (sel ? ' sel' : ''),
    onClick: () => isFilled && onSel(i)
  }, /*#__PURE__*/React.createElement("span", {
    className: 'c-dot ' + (isFilled ? 'done' : active ? 'writing' : 'todo')
  }), kind === 'cast' && (isFilled || active) && /*#__PURE__*/React.createElement("span", {
    className: "cr-cav",
    style: {
      background: avTint(dim.tint)
    }
  }, Lc(dim.name).replace(/\s/g, '')[0]), /*#__PURE__*/React.createElement("div", {
    className: "cr-itemmid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-itemnm"
  }, Lc(dim.name), (isFilled || active) && /*#__PURE__*/React.createElement("span", {
    className: "cr-itemsub c-latin"
  }, " \xD7", dim.sub)), /*#__PURE__*/React.createElement("div", {
    className: "cr-itemag"
  }, isFilled || active ? (active ? '⟳ ' : '') + Lc(dim.agent) : '—', kind === 'cast' && (isFilled || active) ? ' · ' + Lc(dim.role) : '')), active && /*#__PURE__*/React.createElement("span", {
    className: "cr-minibar"
  }, /*#__PURE__*/React.createElement("i", null)));
}

/* 世界观 / 故事规划等可编辑维度统一走共享层 window.LF_EDIT.BlocksEditor
   （结构化编辑 + 增删 + 退出自动保存 + AI 改写）。各资源差异仅在 adapter 与 pathFor。 */

const WORLD_CARD_ROW_ORDERS = {
  core_laws: ['statement', 'boundary', 'cost', 'enforcement']
};
function DetailPane({
  dim,
  kind,
  index,
  filled,
  error,
  bookId,
  worldEditReady,
  onHistory
}) {
  if (!dim) {
    return /*#__PURE__*/React.createElement("div", {
      className: "cr-dp-empty"
    }, /*#__PURE__*/React.createElement("span", {
      className: error ? '' : 'c-shimmer'
    }, error ? TCc('cr_gen_failed') : TCc('cr_forging')));
  }
  const tag = seqTag(kind, index);
  const E = window.LF_EDIT,
    P = window.LF_PORTAL;
  const canWorld = kind === 'world' && worldEditReady && bookId && dim.key && E && P && P.getWorldDimensionRaw;
  const canStory = kind === 'story' && bookId && dim.key && E && P && P.getStoryPlanRaw;
  const editableBlocks = (canWorld || canStory) && Array.isArray(dim.blocks) && dim.blocks.length > 0;
  const cardRowOrder = kind === 'world' ? WORLD_CARD_ROW_ORDERS[dim.key] : undefined;
  const blocksProps = canWorld ? {
    makeAdapter: () => E.adapters.worldDimension(bookId, dim.key),
    deps: [bookId, dim.key],
    pathFor: b => [b.key],
    resourceType: '世界观·' + Lc(dim.name)
  } : {
    makeAdapter: () => E.adapters.storyPlan(bookId),
    deps: [bookId],
    pathFor: b => b.key === dim.key ? [dim.key] : [dim.key, b.key],
    resourceType: '故事规划·' + Lc(dim.name)
  };
  const leadField = dim.leadKey && (canWorld || canStory) ? {
    path: canStory ? [dim.key, dim.leadKey] : [dim.leadKey],
    label: {
      zh: '一句话立意',
      en: 'One-line premise'
    },
    fallback: dim.lead || dim.sample
  } : null;
  return /*#__PURE__*/React.createElement("div", {
    className: 'cr-dp' + (dim.blocks ? ' wide' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-dp-head"
  }, kind === 'cast' && /*#__PURE__*/React.createElement("span", {
    className: "cr-dp-av",
    style: {
      background: avTint(dim.tint)
    }
  }, Lc(dim.name).replace(/\s/g, '')[0]), /*#__PURE__*/React.createElement("div", {
    className: "cr-dp-htext"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-dp-title c-serif"
  }, Lc(dim.name), kind === 'cast' && /*#__PURE__*/React.createElement("span", {
    className: "cr-dp-role"
  }, Lc(dim.role))), /*#__PURE__*/React.createElement("div", {
    className: "cr-dp-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-badge gold"
  }, Lc(dim.agent)), tag && /*#__PURE__*/React.createElement("span", {
    className: "cr-seqtag"
  }, tag), /*#__PURE__*/React.createElement("span", {
    className: "cr-dp-cnt c-latin"
  }, (dim.blocks || dim.fields).length, " ", Lc({
    zh: '个字段',
    en: 'fields'
  })))), bookId && onHistory && /*#__PURE__*/React.createElement(RevisionHistoryButton, {
    onClick: () => onHistory(kind === 'world' ? {
      title: Lc({
        zh: '世界观 · ' + Lc(dim.name),
        en: 'World · ' + Lc(dim.name)
      }),
      phase: 'world',
      resources: [{
        type: 'world',
        key: dim.key,
        label: Lc(dim.name)
      }]
    } : {
      title: Lc({
        zh: '故事规划修订记录',
        en: 'Story plan revisions'
      }),
      phase: 'story',
      resources: [{
        type: 'book',
        key: 'story_plan',
        label: Lc({
          zh: '故事规划',
          en: 'Story plan'
        })
      }]
    })
  })), !leadField && /*#__PURE__*/React.createElement(LeadText, {
    value: dim.lead || dim.sample
  }), editableBlocks ? /*#__PURE__*/React.createElement(E.BlocksEditor, {
    makeAdapter: blocksProps.makeAdapter,
    deps: blocksProps.deps,
    blocks: dim.blocks,
    pathFor: blocksProps.pathFor,
    resourceType: blocksProps.resourceType,
    bookId: bookId,
    cardRowOrder: cardRowOrder,
    leadField: leadField
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, dim.blocks ? /*#__PURE__*/React.createElement(DimBlocks, {
    dim: dim,
    clamp: true,
    cardRowOrder: cardRowOrder
  }) : /*#__PURE__*/React.createElement("div", {
    className: "cr-dp-fields"
  }, dim.fields.map((f, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    className: "cr-dpf"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dpk"
  }, Lc(f.k)), /*#__PURE__*/React.createElement("div", {
    className: "dpv"
  }, Lc(f.v))))), kind === 'world' && !worldEditReady && /*#__PURE__*/React.createElement("div", {
    className: "cr-edit-gate",
    role: "status"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "clock",
    s: 14
  }), /*#__PURE__*/React.createElement("span", null, Lc({
    zh: '世界观六个维度全部构建完成后，才能手工编辑或使用 AI 改写。',
    en: 'Manual editing and AI rewrite unlock after all six world dimensions finish building.'
  }))), (kind !== 'world' || worldEditReady) && /*#__PURE__*/React.createElement("div", {
    className: "cr-dp-editwrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-dp-editlab"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "pen",
    s: 13
  }), dim.blocks ? Lc({
    zh: '对本维度提出修改意见 · 指定字段亦可',
    en: 'Give revision notes on this dimension · you can name specific fields'
  }) : Lc({
    zh: '编辑本项 · 或让 AI 协助扩写',
    en: 'Edit this item · or let AI expand it'
  })), /*#__PURE__*/React.createElement("textarea", {
    className: "cr-dp-edita",
    placeholder: dim.blocks ? Lc({
      zh: '例：「禁忌红线」再狠一点；势力关系里补一条商盟与守渊人的裂痕…',
      en: 'e.g. make the taboos harsher; add a crack between Guild and Gorge-keepers to the relations…'
    }) : TCc('cr_edit_ph'),
    defaultValue: dim.blocks ? undefined : Lc(dim.sample)
  }), /*#__PURE__*/React.createElement("div", {
    className: "cr-dp-editacts"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-dp-hint"
  }, dim.blocks ? Lc({
    zh: '提交后由「' + Lc(dim.agent) + '」重铸对应字段，其余字段与后续维度会同步校订。',
    en: 'On submit, ' + Lc(dim.agent) + ' recasts the named fields; the rest — and later dimensions — are reconciled.'
  }) : Lc({
    zh: '正式生成时此处为完整设定文本，可达数千字。',
    en: 'In production this holds the full setting text — up to thousands of words.'
  }))))));
}
function GenPhase({
  kind,
  phaseIndex,
  s,
  set,
  doReroll,
  bookId,
  onHistory
}) {
  const cfg = phaseCfg(kind),
    items = phaseDisplayItems(kind, cfg.items);
  const phone = window.useMobileLayout ? window.useMobileLayout() : false;
  const worldEditReady = kind !== 'world' || worldEditingReady(cfg.items, s.done);
  const actualReadyCount = Array.isArray(cfg.items) ? cfg.items.length : 0;
  /* done 态一律全量填充。world 逐维真实落库，用「已到达条数」兜底进度；story 一次性
     到达，改由 s.filled 的分步假加载驱动（见 CreateFlow 的 story reveal effect），
     不能用 actualReadyCount 否则会一次点亮全部维度。 */
  const visibleFilled = s.done ? items.length : kind === 'story' ? Math.min(s.filled, items.length) : Math.max(s.filled, actualReadyCount);
  const selIdx = s.sel != null ? s.sel : Math.max(0, Math.min(visibleFilled - 1, items.length - 1));
  const selReady = items.length > 0 && selIdx >= 0 && (kind === 'world' ? selIdx < Math.max(visibleFilled, s.error ? 0 : 1) : visibleFilled > 0 && selIdx < visibleFilled);
  /* 动态监测：堆叠布局下，左栏自然高度超过容器 45% 时切紧凑横轨模式（.compact）。
     测量时先同步摘掉 compact 量"自然高度"再决定，同一帧内完成，无闪烁、无振荡。 */
  const genRef = uR(null);
  uE(() => {
    const el = genRef.current;
    if (!el) return;
    const check = () => {
      const nav = el.querySelector('.cr-gennav');
      if (!nav) return;
      const stacked = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length < 2;
      el.classList.remove('compact');
      if (!stacked) return; // 双栏布局不需要紧凑模式
      const ratio = nav.scrollHeight / Math.max(el.clientHeight, 1);
      if (ratio > 0.45) el.classList.add('compact');
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener('resize', check);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', check);
    };
  }, [s.filled, s.done, kind]);
  /* 紧凑横向滑轨：自动把选中/正在生成的条目滚到可视中央（仅当列表横向溢出时生效） */
  const railRef = uR(null);
  uE(() => {
    const rail = railRef.current;
    if (!rail || rail.scrollWidth <= rail.clientWidth + 4) return;
    const el = rail.querySelector('.cr-itemrow.sel') || rail.querySelector('.cr-itemrow.active');
    if (!el) return;
    const left = el.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft;
    rail.scrollTo({
      left: Math.max(0, left - (rail.clientWidth - el.offsetWidth) / 2),
      behavior: 'smooth'
    });
  }, [s.filled, selIdx, kind, s.done]);
  uE(() => {
    const cite = window.LF_ASSISTANT_CITE;
    if (!cite) return undefined;
    const dim = selReady ? items[selIdx] : null;
    if (kind === 'world' && bookId && dim && dim.key) {
      cite.setObject({
        bookId,
        owner: 'create-world',
        resource_type: 'world',
        resource_key: dim.key
      });
      return () => cite.clear({
        owner: 'create-world'
      });
    }
    if (kind === 'story' && bookId) {
      cite.setObject({
        bookId,
        owner: 'create-story',
        resource_type: 'book',
        resource_key: 'story_plan'
      });
      return () => cite.clear({
        owner: 'create-story'
      });
    }
    cite.clear({
      owner: 'create-world'
    });
    cite.clear({
      owner: 'create-story'
    });
    return undefined;
  }, [kind, bookId, selIdx, selReady, items[selIdx] && items[selIdx].key]);
  /* Phone frame (FD-176): status once, a vertical item list and a full-screen detail per item. */
  if (phone && window.MobileCreatePhase) {
    const rows = items.map((d, i) => {
      const filled = i < visibleFilled,
        active = !s.error && i === visibleFilled && !s.done;
      return {
        key: d.key || i,
        name: Lc(d.name),
        sub: filled ? Lc(d.agent) : active ? Lc(d.agent) : '',
        ready: filled,
        active,
        chip: filled ? {
          tone: 'final',
          label: Lc({
            zh: d.sub + ' 项',
            en: d.sub + ' items'
          })
        } : active ? {
          tone: 'prose',
          label: Lc({
            zh: '生成中',
            en: 'Writing'
          })
        } : {
          tone: 'todo',
          label: Lc({
            zh: '等待',
            en: 'Waiting'
          })
        }
      };
    });
    const notes = /*#__PURE__*/React.createElement(React.Fragment, null, kind === 'world' && !worldEditReady && visibleFilled > 0 && /*#__PURE__*/React.createElement("div", {
      className: "m-muted m-cr-note"
    }, Lc({
      zh: '世界观六个维度全部构建完成后，才能手工编辑或使用 AI 改写；已完成的维度可以先点开看。',
      en: 'Editing and AI rewrite unlock after all six world dimensions finish; finished ones can be opened now.'
    })), s.done && s.mode === 'copilot' && /*#__PURE__*/React.createElement("div", {
      className: "m-muted m-cr-note"
    }, TCc('cr_review_pause')), s.done && s.mode === 'auto' && /*#__PURE__*/React.createElement("div", {
      className: "m-muted m-cr-note"
    }, TCc('cr_autorun')));
    return /*#__PURE__*/React.createElement(window.MobileCreatePhase, {
      status: {
        title: s.done ? cfg.td : s.error ? TCc('cr_gen_failed') : cfg.tf,
        sub: Math.min(visibleFilled, items.length) + ' / ' + items.length,
        tone: s.done ? 'done' : s.error ? 'error' : 'run'
      },
      rows: rows,
      notes: notes,
      detailIndex: s.mDetail,
      onOpen: i => set({
        sel: i,
        mDetail: i
      }),
      onClose: () => set({
        mDetail: null
      }),
      renderDetail: i => /*#__PURE__*/React.createElement(DetailPane, {
        key: kind + i,
        dim: items[i],
        kind: kind,
        index: i,
        filled: visibleFilled,
        error: s.error,
        bookId: bookId,
        worldEditReady: worldEditReady,
        onHistory: onHistory
      })
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-gen",
    ref: genRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-gennav"
  }, /*#__PURE__*/React.createElement(PhaseBandMini, {
    filled: visibleFilled,
    total: items.length,
    done: s.done,
    error: s.error,
    center: cfg.center,
    titleForging: cfg.tf,
    titleDone: cfg.td,
    onReroll: () => set({
      rerollWarn: true
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "cr-phasebar"
  }, [0, 1, 2].map(p => /*#__PURE__*/React.createElement("span", {
    key: p,
    className: 'pbi' + (p < phaseIndex ? ' done' : '') + (p === phaseIndex ? ' on' : '')
  }, [TCc('cr_step_world'), TCc('cr_step_cast'), TCc('cr_step_story')][p]))), /*#__PURE__*/React.createElement("div", {
    className: "cr-seqnote"
  }, cfg.seq), /*#__PURE__*/React.createElement("div", {
    className: "cr-itemlist",
    ref: railRef
  }, !items.length && !s.done && /*#__PURE__*/React.createElement("div", {
    className: "cr-itemrow ck-waitrow"
  }, !s.error && /*#__PURE__*/React.createElement("span", {
    className: "c-dot writing"
  }), /*#__PURE__*/React.createElement("span", {
    className: s.error ? '' : 'c-shimmer'
  }, s.error ? TCc('cr_gen_failed') : cfg.tf)), items.map((d, i) => /*#__PURE__*/React.createElement(ItemRow, {
    key: d.key || i,
    dim: d,
    i: i,
    kind: kind,
    filled: visibleFilled,
    done: s.done,
    error: s.error,
    sel: selReady && i === selIdx,
    onSel: v => set({
      sel: v
    })
  }))), s.done && s.mode === 'copilot' && /*#__PURE__*/React.createElement("div", {
    className: "cr-pause"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-badge gold"
  }, TCc('cr_review_badge')), TCc('cr_review_pause')), s.done && s.mode === 'auto' && /*#__PURE__*/React.createElement("div", {
    className: "cr-autorun"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-dot writing"
  }), TCc('cr_autorun'))), /*#__PURE__*/React.createElement("div", {
    className: "cr-gendetail"
  }, /*#__PURE__*/React.createElement(DetailPane, {
    key: selReady ? kind + selIdx : 'empty',
    dim: selReady ? items[selIdx] : null,
    kind: kind,
    index: selIdx,
    filled: visibleFilled,
    error: s.error,
    bookId: bookId,
    worldEditReady: worldEditReady,
    onHistory: onHistory
  })));
}

/* ---------- 角色表专属生成段：①阵容骨架(批量) → ②信念生态(批量) → ③深层维度(逐个) = 1+1+n 次调用
   左栏：三段进度自成一块（非列表行，避免与角色卡同级混淆）；列表只放角色名卡。
   不随生成进度自动跳转选中；右侧详情卡分层到达时对占位做替换动画。 ---------- */
function CastDetail({
  c,
  f,
  idx,
  bookId,
  phaseDone,
  characterOptions,
  onHistory
}) {
  const layers = {
    skeleton: f >= 1,
    belief: f >= 2,
    depth: f >= 3 + idx
  };
  const casting = f === 2 + idx;
  const nm = Lc(c.name).replace(/\s/g, '');
  const E = window.LF_EDIT,
    P = window.LF_PORTAL;
  const CharacterHeader = window.CharacterProfileHeader;
  const stages = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: 'c-badge ' + (layers.skeleton ? 'gold' : 'ghost')
  }, TCc('ck_skeleton')), /*#__PURE__*/React.createElement("span", {
    className: 'c-badge ' + (layers.belief ? 'gold' : 'ghost')
  }, TCc('ck_belief')), /*#__PURE__*/React.createElement("span", {
    className: 'c-badge ' + (layers.depth ? 'gold' : casting ? 'terra' : 'ghost')
  }, TCc('ck_depth'), casting ? ' ⟳' : ''));
  const headerProps = {
    value: {
      name: c.name,
      role: c.role,
      epithet: c.epithet
    },
    avatar: {
      text: nm[0],
      style: {
        background: avTint(c.tint)
      }
    },
    stages,
    actions: bookId && c.rawName && onHistory ? /*#__PURE__*/React.createElement(RevisionHistoryButton, {
      onClick: () => onHistory({
        title: Lc({
          zh: '角色 · ' + Lc(c.name),
          en: 'Character · ' + Lc(c.name)
        }),
        phase: 'cast',
        resources: [{
          type: 'character',
          key: c.rawName,
          label: Lc(c.name)
        }]
      })
    }) : null
  };
  // 角色元数据分段写入；必须等整个角色阶段（含全员声音）完成后才允许编辑。
  const canEdit = !!(bookId && c && c.rawName && E && P && P.getCharacterRaw && phaseDone);
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-dp wide"
  }, canEdit ? /*#__PURE__*/React.createElement(EditableCastProfile, {
    c: c,
    layers: layers,
    waitDepth: casting ? TCc('ck_s3_run').replace('{n}', nm) : undefined,
    bookId: bookId,
    leadFallback: c.lead || c.sample,
    headerProps: headerProps,
    characterOptions: characterOptions
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterHeader, headerProps), /*#__PURE__*/React.createElement(LeadText, {
    value: c.lead || c.sample
  }), /*#__PURE__*/React.createElement(CastProfile, {
    c: c,
    layers: layers,
    waitDepth: casting ? TCc('ck_s3_run').replace('{n}', nm) : undefined
  })));
}
function characterLeadPath(content) {
  const source = content && typeof content === 'object' ? content : {};
  const existing = ['essence', 'summary', 'description', 'profile'].find(key => source[key] != null && String(source[key]).trim() !== '');
  return [existing || 'essence'];
}
function editableCharacterRelationships(content) {
  const source = content && typeof content === 'object' ? content : {};
  const extras = source.extras && typeof source.extras === 'object' ? source.extras : {};
  const raw = Array.isArray(extras.relationships) ? extras.relationships : Array.isArray(source.relationships) ? source.relationships : [];
  const value = (relationship, ...keys) => {
    for (const key of keys) {
      if (relationship[key] != null) return String(relationship[key]);
    }
    return '';
  };
  return raw.filter(relationship => relationship && typeof relationship === 'object').map(relationship => ({
    target: value(relationship, 'target', 'name', 'to', 'character'),
    nature: value(relationship, 'nature', 'relation', 'type'),
    meaning_to_character: value(relationship, 'meaning_to_character', 'meaning', 'description', 'note'),
    hidden_tension: value(relationship, 'hidden_tension', 'tension', 'tension_point'),
    default_attitude: value(relationship, 'default_attitude', 'attitude')
  }));
}
function EditableCastProfile({
  c,
  layers,
  waitDepth,
  bookId,
  leadFallback,
  headerProps,
  characterOptions
}) {
  const E = window.LF_EDIT;
  const P = window.LF_PORTAL;
  const CharacterHeader = window.CharacterProfileHeader;
  const ctl = E.useResourceEditor(() => E.adapters.character(bookId, c.rawName), [bookId, c.rawName]);
  const content = ctl.state.content;
  const leadPath = characterLeadPath(content);
  const identityValues = content ? {
    true_name: content.true_name != null ? content.true_name : '',
    aliases: Array.isArray(content.aliases) ? content.aliases : c.aliases.map(alias => window.L(alias)),
    gender: content.gender != null ? content.gender : window.L(c.gender),
    age: content.age != null ? content.age : window.L(c.age)
  } : null;
  const rawPosition = content && content.world_position && typeof content.world_position === 'object' ? content.world_position : null;
  const positionValues = content ? {
    origin_class: rawPosition && rawPosition.origin_class != null ? rawPosition.origin_class : window.L(c.pos.origin),
    affiliation: rawPosition && rawPosition.affiliation != null ? rawPosition.affiliation : window.L(c.pos.aff),
    social_role: rawPosition && rawPosition.social_role != null ? rawPosition.social_role : window.L(c.pos.srole),
    stance_on_core_conflict: rawPosition && rawPosition.stance_on_core_conflict != null ? rawPosition.stance_on_core_conflict : window.L(c.pos.stance)
  } : null;
  const extras = content && content.extras && typeof content.extras === 'object' ? content.extras : null;
  const topAnchor = content && content.world_anchor && typeof content.world_anchor === 'object' ? content.world_anchor : null;
  const anchorPath = topAnchor && !(extras && extras.world_anchor) ? ['world_anchor'] : ['extras', 'world_anchor'];
  const rawAnchor = content ? window.getIn(content, anchorPath) : null;
  const relationshipValues = content ? editableCharacterRelationships(content) : null;
  const rawBeliefs = content && content.beliefs && typeof content.beliefs === 'object' ? content.beliefs : null;
  const beliefValues = content ? {
    core_belief: rawBeliefs && rawBeliefs.core_belief != null ? rawBeliefs.core_belief : window.L(c.belief.core),
    belief_source: rawBeliefs && rawBeliefs.belief_source != null ? rawBeliefs.belief_source : window.L(c.belief.source),
    author_perspective: rawBeliefs && rawBeliefs.author_perspective != null ? rawBeliefs.author_perspective : c.belief.persp
  } : null;
  const rawDeepFear = content && content.deep_fear && typeof content.deep_fear === 'object' ? content.deep_fear : null;
  const rawSecrets = content && content.secrets && typeof content.secrets === 'object' ? content.secrets : null;
  const rawBottomLine = content && content.bottom_line && typeof content.bottom_line === 'object' ? content.bottom_line : null;
  const rawTraumas = content && content.traumas && typeof content.traumas === 'object' ? content.traumas : null;
  const rawContradictions = content && content.contradictions && typeof content.contradictions === 'object' ? content.contradictions : null;
  const rawArc = content && content.arc_description && typeof content.arc_description === 'object' ? content.arc_description : null;
  const rawVoice = content && content.voice && typeof content.voice === 'object' ? content.voice : null;
  const voiceValues = content && window.canonicalCharacterVoice ? window.canonicalCharacterVoice(content.voice) : c.voice;
  const depthValues = content ? window.canonicalCharacterDepth({
    surface_goal: content.surface_goal != null ? content.surface_goal : window.L(c.depth.desire.surface),
    deep_desire: content.deep_desire != null ? content.deep_desire : window.L(c.depth.desire.deep),
    deep_fear: rawDeepFear || {
      fear: window.L(c.depth.fear.fear),
      source: window.L(c.depth.fear.source)
    },
    secrets: rawSecrets || {
      content: window.L(c.depth.secret.content),
      who_knows: c.depth.secret.knows.map(window.L),
      who_doesnt_know_but_should: c.depth.secret.should.map(window.L),
      exposure_consequence: window.L(c.depth.secret.expose)
    },
    bottom_line: rawBottomLine || {
      condition: window.L(c.depth.bottom.cond),
      source: window.L(c.depth.bottom.source),
      reaction_when_crossed: window.L(c.depth.bottom.react)
    },
    traumas: rawTraumas || {
      wound: window.L(c.depth.trauma.wound),
      trigger: window.L(c.depth.trauma.trigger),
      stress_response: window.L(c.depth.trauma.stress),
      impact_on_behavior: window.L(c.depth.trauma.impact)
    },
    contradictions: rawContradictions || {
      conflicting_elements: window.L(c.depth.contra.elements),
      source: window.L(c.depth.contra.source),
      possible_direction: window.L(c.depth.contra.direction)
    },
    arc_description: rawArc || {
      growth_direction: window.L(c.depth.arc.growth),
      corruption_direction: window.L(c.depth.arc.fall),
      key_choice: window.L(c.depth.arc.choice)
    }
  }) : null;
  const values = rawAnchor && typeof rawAnchor === 'object' ? {
    embodies_rule: rawAnchor.embodies_rule || '',
    shaped_by_rule: rawAnchor.shaped_by_rule || '',
    may_challenge_rule: rawAnchor.may_challenge_rule || ''
  } : null;
  const rowsToObject = rows => {
    const next = {};
    rows.forEach(row => {
      next[row.key] = row.value;
    });
    return next;
  };
  const saveIdentity = next => {
    const edits = [];
    ['true_name', 'aliases', 'gender', 'age'].forEach(key => {
      if (JSON.stringify(next[key]) !== JSON.stringify(identityValues[key])) edits.push({
        path: [key],
        value: next[key]
      });
    });
    return ctl.flushMany(edits);
  };
  const headerValues = content ? {
    name: c.rawName,
    role: content.role != null ? content.role : window.L(c.role),
    epithet: c.epithet
  } : headerProps.value;
  const saveHeader = async next => {
    let version = ctl.state.version;
    let result = null;
    if (next.role !== String(window.L(headerValues.role) || '')) {
      result = await ctl.flush(['role'], next.role);
      version = result && result.version != null ? result.version : version;
    }
    if (next.name !== c.rawName) {
      try {
        result = await P.renameCharacter(bookId, c.rawName, {
          base_version: version,
          new_name: next.name
        });
      } catch (error) {
        if (error && error.status === 409) await ctl.recoverConflict(error);
        throw error;
      }
    }
    return result;
  };
  const savePosition = rows => {
    const next = rowsToObject(rows);
    return ctl.flush(['world_position'], next).catch(error => {
      if (!error || error.status !== 409) ctl.update(['world_position'], rawPosition || {});
      throw error;
    });
  };
  const saveAnchor = rows => {
    const next = rowsToObject(rows);
    return ctl.flush(anchorPath, next).catch(error => {
      if (!error || error.status !== 409) ctl.update(anchorPath, rawAnchor || {});
      throw error;
    });
  };
  const saveRelationships = next => {
    const previous = extras && Array.isArray(extras.relationships) ? extras.relationships : [];
    return ctl.flush(['extras', 'relationships'], next).catch(error => {
      if (!error || error.status !== 409) ctl.update(['extras', 'relationships'], previous);
      throw error;
    });
  };
  const saveBelief = next => {
    const merged = {
      ...(rawBeliefs || {}),
      ...next
    };
    return ctl.flush(['beliefs'], merged).catch(error => {
      if (!error || error.status !== 409) ctl.update(['beliefs'], rawBeliefs || {});
      throw error;
    });
  };
  const saveVoice = next => {
    const previous = rawVoice || {};
    const merged = {
      ...previous,
      ...next,
      syntax_fingerprint: {
        ...(previous.syntax_fingerprint || {}),
        ...next.syntax_fingerprint
      },
      emotion_patterns: {
        ...(previous.emotion_patterns || {}),
        ...next.emotion_patterns
      }
    };
    return ctl.flush(['voice'], merged).catch(error => {
      if (!error || error.status !== 409) ctl.update(['voice'], previous);
      throw error;
    });
  };
  const saveDepth = next => {
    const edits = [];
    if (next.surface_goal !== depthValues.surface_goal) edits.push({
      path: ['surface_goal'],
      value: next.surface_goal
    });
    if (next.deep_desire !== depthValues.deep_desire) edits.push({
      path: ['deep_desire'],
      value: next.deep_desire
    });
    [['deep_fear', rawDeepFear], ['secrets', rawSecrets], ['bottom_line', rawBottomLine], ['traumas', rawTraumas], ['contradictions', rawContradictions], ['arc_description', rawArc]].forEach(([key, raw]) => {
      if (JSON.stringify(next[key]) !== JSON.stringify(depthValues[key])) edits.push({
        path: [key],
        value: {
          ...(raw || {}),
          ...next[key]
        }
      });
    });
    return ctl.flushMany(edits);
  };
  const editorDisabled = ctl.state.loading || ctl.state.saving || !content;
  const loadError = !ctl.state.loading && !content ? ctl.state.err : '';
  const rewriteBase = {
    loaded: !ctl.state.loading && !!content,
    disabled: editorDisabled,
    bookId,
    identity: ctl.identity(),
    baseVersion: ctl.state.version,
    onRewriteConflict: ctl.recoverConflict
  };
  const exactRewrite = (path, value) => ({
    ...rewriteBase,
    path,
    value,
    onRewriteApply: (next, result) => ctl.acceptRemote(path, next, result && result.version),
    onRewriteUndo: next => ctl.restore(path, next)
  });
  const identityFields = ['true_name', 'aliases', 'gender', 'age'];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterHeader, _extends({}, headerProps, {
    value: headerValues,
    onSave: saveHeader,
    onEditStart: ctl.beginEdit,
    editDisabled: editorDisabled,
    loadError: loadError
  })), /*#__PURE__*/React.createElement(E.LeadField, {
    ctl: ctl,
    path: leadPath,
    bookId: bookId,
    label: {
      zh: '角色引领句',
      en: 'Character premise'
    },
    fallback: leadFallback
  }), /*#__PURE__*/React.createElement(CastProfile, {
    c: c,
    layers: layers,
    waitDepth: waitDepth,
    voice: voiceValues,
    voiceEditor: {
      values: voiceValues,
      disabled: editorDisabled,
      loadError,
      onSave: saveVoice,
      capability: exactRewrite(['voice'], rawVoice || voiceValues)
    },
    identityEditor: {
      values: identityValues,
      disabled: editorDisabled,
      loadError,
      onSave: saveIdentity,
      capability: {
        ...rewriteBase,
        path: ['identity_profile'],
        onRewriteApply: (next, result) => ctl.acceptRemoteProjection(next, identityFields, result && result.version),
        onRewriteUndo: next => ctl.restoreProjection(['identity_profile'], next, identityFields)
      }
    },
    positionEditor: {
      values: positionValues,
      disabled: editorDisabled,
      loadError,
      onSave: savePosition,
      capability: exactRewrite(['world_position'], rawPosition || positionValues)
    },
    anchorEditor: {
      values,
      disabled: editorDisabled,
      loadError,
      onSave: saveAnchor,
      capability: exactRewrite(anchorPath, rawAnchor || values)
    },
    relationshipsEditor: {
      characterName: c.rawName,
      values: relationshipValues,
      options: characterOptions,
      disabled: editorDisabled,
      loadError,
      onSave: saveRelationships,
      capability: exactRewrite(['extras', 'relationships'], extras && Array.isArray(extras.relationships) ? extras.relationships : relationshipValues)
    },
    beliefEditor: {
      values: beliefValues,
      disabled: editorDisabled,
      loadError,
      onSave: saveBelief,
      capability: exactRewrite(['beliefs'], rawBeliefs || beliefValues)
    },
    depthEditor: {
      onEditStart: ctl.beginEdit,
      values: depthValues,
      disabled: editorDisabled,
      loadError,
      onSave: saveDepth
    }
  }));
}
function CharacterCreateDialog({
  open,
  existingNames,
  busy,
  error,
  onClose,
  onConfirm
}) {
  const [mode, setMode] = uS('ai');
  const [name, setName] = uS('');
  const [brief, setBrief] = uS('');
  const nameRef = uR(null);
  const briefRef = uR(null);
  uE(() => {
    if (open) {
      setMode('ai');
      setName('');
      setBrief('');
    }
  }, [open]);
  const normalized = name.trim();
  const normalizedBrief = brief.trim();
  const duplicate = !!normalized && existingNames.some(item => item === normalized);
  const confirmDisabled = busy || (mode === 'blank' ? !normalized || duplicate : !normalizedBrief);
  const confirmLabel = busy ? mode === 'ai' ? TCc('cr_ai_creating_character') : TCc('cr_creating_character') : mode === 'ai' ? TCc('cr_create_ai_ok') : TCc('cr_create_blank_ok');
  return /*#__PURE__*/React.createElement(ConfirmDialog, {
    open: open,
    className: "cr-character-create-dialog",
    title: TCc('cr_add_character'),
    message: TCc('cr_add_character_intro'),
    cancelLabel: TCc('cr_cancel'),
    confirmLabel: confirmLabel,
    confirmDisabled: confirmDisabled,
    icon: "plus",
    initialFocusRef: mode === 'ai' ? briefRef : nameRef,
    onClose: () => !busy && onClose(),
    onConfirm: () => onConfirm(mode, mode === 'ai' ? normalizedBrief : normalized)
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-create-choices",
    role: "radiogroup",
    "aria-label": TCc('cr_add_character')
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: 'cr-create-choice' + (mode === 'blank' ? ' on' : ''),
    role: "radio",
    "aria-checked": mode === 'blank',
    disabled: busy,
    onClick: () => setMode('blank')
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-create-choice-icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "plus",
    s: 15
  })), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, TCc('cr_create_blank')), /*#__PURE__*/React.createElement("small", null, TCc('cr_create_blank_desc')))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: 'cr-create-choice' + (mode === 'ai' ? ' on' : ''),
    role: "radio",
    "aria-checked": mode === 'ai',
    disabled: busy,
    onClick: () => setMode('ai')
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-create-choice-icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "sparkle",
    s: 15
  })), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, TCc('cr_create_ai')), /*#__PURE__*/React.createElement("small", null, TCc('cr_create_ai_desc'))))), mode === 'blank' ? /*#__PURE__*/React.createElement("label", {
    className: "cr-create-name"
  }, /*#__PURE__*/React.createElement("span", null, TCc('cr_character_name')), /*#__PURE__*/React.createElement("input", {
    ref: nameRef,
    value: name,
    maxLength: "200",
    disabled: busy,
    autoComplete: "off",
    placeholder: TCc('cr_character_name_ph'),
    "aria-invalid": duplicate || undefined,
    onChange: event => setName(event.target.value)
  }), duplicate && /*#__PURE__*/React.createElement("small", {
    role: "alert"
  }, TCc('cr_character_exists'))) : /*#__PURE__*/React.createElement("label", {
    className: "cr-create-name cr-create-brief"
  }, /*#__PURE__*/React.createElement("span", null, TCc('cr_character_brief')), /*#__PURE__*/React.createElement("textarea", {
    ref: briefRef,
    value: brief,
    maxLength: "8000",
    rows: "4",
    disabled: busy,
    placeholder: TCc('cr_character_brief_ph'),
    onChange: event => setBrief(event.target.value)
  })), error && /*#__PURE__*/React.createElement("div", {
    className: "cr-create-error",
    role: "alert"
  }, error));
}
function CharacterDeleteDialog({
  open,
  characters,
  busy,
  error,
  onClose,
  onConfirm
}) {
  const [name, setName] = uS('');
  const selectRef = uR(null);
  const selected = characters.find(character => character.rawName === name);
  const selectedName = selected ? Lc(selected.name) : '';
  return /*#__PURE__*/React.createElement(ConfirmDialog, {
    open: open,
    tone: "danger",
    icon: "trash",
    title: TCc('cr_delete_character'),
    message: TCc('cr_delete_character_warn'),
    cancelLabel: TCc('cr_cancel'),
    confirmLabel: busy ? TCc('cr_deleting_character') : selectedName ? TCc('cr_delete_character_title').replace('{name}', selectedName) : TCc('cr_delete_character_ok'),
    confirmDisabled: busy || !selected,
    initialFocusRef: selectRef,
    onClose: () => !busy && onClose(),
    onConfirm: () => selected && onConfirm(selected.rawName)
  }, /*#__PURE__*/React.createElement("label", {
    className: "cr-delete-select"
  }, /*#__PURE__*/React.createElement("span", null, TCc('cr_delete_character_select')), /*#__PURE__*/React.createElement("select", {
    ref: selectRef,
    value: name,
    onChange: event => setName(event.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, TCc('cr_delete_character_select_ph')), characters.map(character => /*#__PURE__*/React.createElement("option", {
    key: character.rawName,
    value: character.rawName
  }, Lc(character.name), Lc(character.role) ? ' · ' + Lc(character.role) : '')))), error && /*#__PURE__*/React.createElement("div", {
    className: "cr-create-error",
    role: "alert"
  }, error));
}
function CastPhase({
  s,
  set,
  doReroll,
  bookId,
  onHistory
}) {
  const cast = Dc.create.cast,
    n = cast.length,
    total = n + 2,
    f = s.done ? total : s.filled;
  const phone = window.useMobileLayout ? window.useMobileLayout() : false;
  const ContentActionButton = window.ContentActionButton;
  const [createOpen, setCreateOpen] = uS(false);
  const [deleteOpen, setDeleteOpen] = uS(false);
  const [lifecycleBusy, setLifecycleBusy] = uS(false);
  const [lifecycleError, setLifecycleError] = uS('');
  const characterCreateRunning = !!(window.LF_PORTAL_STATE && Array.isArray(window.LF_PORTAL_STATE.tasks) && window.LF_PORTAL_STATE.tasks.some(task => task && task.book_link_id === bookId && task.task_type === 'character_create' && (task.status === 'queued' || task.status === 'running')));
  const lifecycleLocked = lifecycleBusy || characterCreateRunning;
  const characterOptions = cast.map(character => ({
    value: character.rawName || Lc(character.name),
    label: Lc(character.name)
  }));
  const st1 = f > 0 ? 'done' : s.error ? 'todo' : 'run';
  const st2 = f > 1 ? 'done' : f === 1 ? s.error ? 'todo' : 'run' : 'todo';
  const st3 = f >= total ? 'done' : f > 1 ? s.error ? 'todo' : 'run' : 'todo';
  const castingIdx = !s.error && f >= 2 && f < total ? f - 2 : -1;
  /* 不随生成进度自动跳转：默认锁第一个角色，只响应用户点选 */
  const selIdx = s.sel != null ? s.sel : 0;
  const selReady = f >= 1;
  const charState = i => f >= 3 + i ? 'done' : f === 2 + i ? s.error ? 'skel' : 'run' : f >= 1 ? 'skel' : 'wait';
  const title = s.error ? TCc('cr_gen_failed') : f === 0 ? TCc('ck_s1_run') : f === 1 ? TCc('ck_s2_run') : f < total ? TCc('ck_s3_run').replace('{n}', Lc(cast[castingIdx].name).replace(/\s/g, '')) : TCc('cr_cast_done');
  /* 与 GenPhase 相同的紧凑模式监测 + 横轨自动居中 */
  const genRef = uR(null);
  uE(() => {
    const el = genRef.current;
    if (!el) return;
    const check = () => {
      const nav = el.querySelector('.cr-gennav');
      if (!nav) return;
      const stacked = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length < 2;
      el.classList.remove('compact');
      if (!stacked) return;
      const ratio = nav.scrollHeight / Math.max(el.clientHeight, 1);
      if (ratio > 0.45) el.classList.add('compact');
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener('resize', check);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', check);
    };
  }, [s.filled, s.done]);
  const railRef = uR(null);
  uE(() => {
    const rail = railRef.current;
    if (!rail || rail.scrollWidth <= rail.clientWidth + 4) return;
    const el = rail.querySelector('.cr-itemrow.sel') || rail.querySelector('.cr-itemrow.active');
    if (!el) return;
    const left = el.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft;
    rail.scrollTo({
      left: Math.max(0, left - (rail.clientWidth - el.offsetWidth) / 2),
      behavior: 'smooth'
    });
  }, [s.filled, selIdx, s.done]);
  uE(() => {
    const cite = window.LF_ASSISTANT_CITE;
    if (!cite) return undefined;
    const character = selReady ? cast[selIdx] : null;
    const key = character && (character.rawName || Lc(character.name));
    if (bookId && key) {
      cite.setObject({
        bookId,
        owner: 'create-cast',
        resource_type: 'character',
        resource_key: String(key)
      });
    } else {
      cite.clear({
        owner: 'create-cast'
      });
    }
    return () => cite.clear({
      owner: 'create-cast'
    });
  }, [bookId, selIdx, selReady, cast[selIdx] && cast[selIdx].rawName]);
  const openCreate = () => {
    setLifecycleError('');
    setCreateOpen(true);
  };
  const closeCreate = () => {
    setCreateOpen(false);
    setLifecycleError('');
  };
  const confirmCreate = async (mode, input) => {
    const portal = window.LF_PORTAL;
    const create = mode === 'ai' ? portal && portal.createAICharacter : portal && portal.createBlankCharacter;
    if (!create) return;
    setLifecycleBusy(true);
    setLifecycleError('');
    try {
      const outcome = await create.call(portal, bookId, input);
      if (mode === 'ai') {
        closeCreate();
        return;
      }
      const characters = outcome && outcome.characters;
      const index = Array.isArray(characters) ? characters.findIndex(character => character.rawName === input) : -1;
      set({
        sel: index >= 0 ? index : selIdx
      });
      closeCreate();
    } catch (error) {
      if (!error || error.code !== 'quote_cancelled') setLifecycleError(error && error.message ? error.message : TCc('cr_create_character_failed'));
    } finally {
      setLifecycleBusy(false);
    }
  };
  const openDelete = () => {
    setLifecycleError('');
    setDeleteOpen(true);
  };
  const closeDelete = () => {
    setDeleteOpen(false);
    setLifecycleError('');
  };
  const confirmDelete = async name => {
    const portal = window.LF_PORTAL;
    if (!name || !portal || !portal.deleteCharacter) return;
    const currentName = cast[selIdx] && cast[selIdx].rawName;
    const deletedIndex = cast.findIndex(character => character.rawName === name);
    setLifecycleBusy(true);
    setLifecycleError('');
    try {
      const outcome = await portal.deleteCharacter(bookId, name);
      const characters = outcome && outcome.characters;
      if (Array.isArray(characters)) set({
        sel: characterSelectionAfterDelete(characters, currentName, deletedIndex)
      });
      closeDelete();
    } catch (error) {
      setLifecycleError(error && error.message ? error.message : TCc('cr_delete_character_failed'));
    } finally {
      setLifecycleBusy(false);
    }
  };
  const passesView = /*#__PURE__*/React.createElement("div", {
    className: "ck-passes"
  }, [{
    st: st1,
    no: '①',
    lab: TCc('ck_skeleton'),
    badge: TCc('ck_batch1')
  }, {
    st: st2,
    no: '②',
    lab: TCc('ck_belief'),
    badge: TCc('ck_batch1')
  }, {
    st: st3,
    no: '③',
    lab: TCc('ck_depth'),
    badge: TCc('ck_eachn').replace('{n}', n),
    sub: castingIdx >= 0 ? Lc(cast[castingIdx].name).replace(/\s/g, '') + ' · ' + (castingIdx + 1) + '/' + n : st3 === 'done' ? n + '/' + n : null
  }].map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'ck-pass ' + p.st
  }, /*#__PURE__*/React.createElement("span", {
    className: 'c-dot ' + (p.st === 'done' ? 'done' : p.st === 'run' ? 'writing' : 'todo')
  }), /*#__PURE__*/React.createElement("span", {
    className: "ck-stno"
  }, p.no), /*#__PURE__*/React.createElement("span", {
    className: "nm"
  }, p.lab), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, p.st === 'run' && p.sub ? p.sub : p.badge), p.st === 'run' && /*#__PURE__*/React.createElement("span", {
    className: "cr-minibar"
  }, /*#__PURE__*/React.createElement("i", null)))));
  const addDisabled = lifecycleLocked || !!(window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED());
  const dialogs = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterCreateDialog, {
    open: createOpen,
    existingNames: cast.map(character => character.rawName),
    busy: lifecycleBusy,
    error: lifecycleError,
    onClose: closeCreate,
    onConfirm: confirmCreate
  }), deleteOpen && /*#__PURE__*/React.createElement(CharacterDeleteDialog, {
    open: true,
    characters: cast,
    busy: lifecycleBusy,
    error: lifecycleError,
    onClose: closeDelete,
    onConfirm: confirmDelete
  }));
  /* Phone frame (FD-176): the cast is a list of characters; each opens its full profile. */
  if (phone && window.MobileCreatePhase) {
    const rows = f === 0 ? [] : cast.map((c, i) => {
      const cs = charState(i),
        mark = Lc(c.name).replace(/\s/g, '')[0];
      return {
        key: c.rawName || i,
        name: Lc(c.name),
        sub: Lc(c.role) + (Lc(c.epithet) ? ' · ' + Lc(c.epithet) : ''),
        ready: selReady,
        active: cs === 'run',
        avatar: {
          tint: avTint(c.tint),
          mark
        },
        chip: cs === 'done' ? null : cs === 'run' ? {
          tone: 'prose',
          label: Lc({
            zh: '深化中',
            en: 'Deepening'
          })
        } : {
          tone: 'todo',
          label: Lc({
            zh: '待深化',
            en: 'Queued'
          })
        }
      };
    });
    const actions = s.done && ContentActionButton ? /*#__PURE__*/React.createElement("div", {
      className: "m-cr-actions"
    }, /*#__PURE__*/React.createElement(ContentActionButton, {
      variant: "add",
      icon: "plus",
      onClick: openCreate,
      disabled: addDisabled
    }, characterCreateRunning ? TCc('cr_ai_creating_character') : TCc('cr_add_character')), /*#__PURE__*/React.createElement(ContentActionButton, {
      variant: "danger",
      icon: "trash",
      onClick: openDelete,
      disabled: addDisabled || !n
    }, TCc('cr_delete_character'))) : null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.MobileCreatePhase, {
      status: {
        title,
        sub: s.done ? Lc({
          zh: n + ' 名角色',
          en: n + ' characters'
        }) : null,
        tone: s.done ? 'done' : s.error ? 'error' : 'run'
      },
      rows: rows,
      notes: /*#__PURE__*/React.createElement(React.Fragment, null, !s.done && passesView, s.done && s.mode === 'copilot' && /*#__PURE__*/React.createElement("div", {
        className: "m-muted m-cr-note"
      }, TCc('cr_review_pause'))),
      actions: actions,
      detailIndex: s.mDetail,
      onOpen: i => set({
        sel: i,
        mDetail: i
      }),
      onClose: () => set({
        mDetail: null
      }),
      renderDetail: i => /*#__PURE__*/React.createElement(CastDetail, {
        key: i,
        c: cast[i],
        f: f,
        idx: i,
        bookId: bookId,
        phaseDone: s.done,
        characterOptions: characterOptions,
        onHistory: onHistory
      })
    }), dialogs);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-gen",
    ref: genRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-gennav"
  }, /*#__PURE__*/React.createElement(PhaseBandMini, {
    filled: f,
    total: total,
    done: s.done,
    error: s.error,
    center: Lc({
      zh: '人物',
      en: 'Cast'
    }),
    titleForging: title,
    titleDone: TCc('cr_cast_done'),
    onReroll: () => set({
      rerollWarn: true
    })
  }), s.done && ContentActionButton && /*#__PURE__*/React.createElement("div", {
    className: "cr-cast-actions"
  }, /*#__PURE__*/React.createElement(ContentActionButton, {
    variant: "add",
    icon: "plus",
    onClick: openCreate,
    disabled: lifecycleLocked || !!(window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED())
  }, characterCreateRunning ? TCc('cr_ai_creating_character') : TCc('cr_add_character')), /*#__PURE__*/React.createElement(ContentActionButton, {
    variant: "danger",
    icon: "trash",
    onClick: openDelete,
    disabled: lifecycleLocked || !n || !!(window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED())
  }, TCc('cr_delete_character'))), passesView, /*#__PURE__*/React.createElement("div", {
    className: "cr-itemlist",
    ref: railRef
  }, f === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "cr-itemrow ck-waitrow"
  }, !s.error && /*#__PURE__*/React.createElement("span", {
    className: "c-dot writing"
  }), /*#__PURE__*/React.createElement("span", {
    className: s.error ? '' : 'c-shimmer'
  }, s.error ? TCc('cr_gen_failed') : TCc('ck_gen_chars'))) : cast.map((c, i) => {
    const cs = charState(i);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: 'cr-itemrow' + (cs === 'done' || cs === 'skel' ? ' filled' : '') + (cs === 'run' ? ' active' : '') + (i === selIdx ? ' sel' : ''),
      onClick: () => set({
        sel: i
      })
    }, /*#__PURE__*/React.createElement("span", {
      className: 'c-dot ' + (cs === 'done' ? 'done' : cs === 'run' ? 'writing' : 'todo')
    }), /*#__PURE__*/React.createElement("span", {
      className: "cr-cav",
      style: {
        background: avTint(c.tint)
      }
    }, Lc(c.name).replace(/\s/g, '')[0]), /*#__PURE__*/React.createElement("div", {
      className: "cr-itemmid"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-itemnm"
    }, Lc(c.name)), /*#__PURE__*/React.createElement("div", {
      className: "cr-itemag"
    }, Lc(c.role) + (Lc(c.epithet) ? ' · ' + Lc(c.epithet) : ''))), /*#__PURE__*/React.createElement("span", {
      className: "ck-pips"
    }, /*#__PURE__*/React.createElement("i", {
      className: f >= 1 ? 'on' : ''
    }), /*#__PURE__*/React.createElement("i", {
      className: f >= 2 ? 'on' : ''
    }), /*#__PURE__*/React.createElement("i", {
      className: cs === 'done' ? 'on' : cs === 'run' ? 'run' : ''
    })));
  })), s.done && s.mode === 'copilot' && /*#__PURE__*/React.createElement("div", {
    className: "cr-pause"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-badge gold"
  }, TCc('cr_review_badge')), TCc('cr_review_pause')), s.done && s.mode === 'auto' && /*#__PURE__*/React.createElement("div", {
    className: "cr-autorun"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-dot writing"
  }), TCc('cr_autorun'))), /*#__PURE__*/React.createElement("div", {
    className: "cr-gendetail"
  }, !selReady || !cast[selIdx] ? /*#__PURE__*/React.createElement("div", {
    className: "cr-dp-empty"
  }, /*#__PURE__*/React.createElement("span", {
    className: s.error ? '' : 'c-shimmer'
  }, s.error ? TCc('cr_gen_failed') : TCc('ck_gen_chars'))) : /*#__PURE__*/React.createElement(CastDetail, {
    key: selIdx,
    c: cast[selIdx],
    f: f,
    idx: selIdx,
    bookId: bookId,
    phaseDone: s.done,
    characterOptions: characterOptions,
    onHistory: onHistory
  })), dialogs);
}

/* ---------- Step 3 就位 ---------- */
function ReadyStep({
  s
}) {
  const C = Dc.create,
    st = C.stats;
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-ready"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-ready-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 30,
    w: 2.4
  })), /*#__PURE__*/React.createElement("h1", {
    className: "cr-bigq",
    style: {
      textAlign: 'center'
    }
  }, TCc('cr_ready')), /*#__PURE__*/React.createElement("p", {
    className: "cr-bigsub",
    style: {
      textAlign: 'center',
      maxWidth: '34em',
      margin: '0 auto'
    }
  }, TCc('cr_ready_sub')), /*#__PURE__*/React.createElement("div", {
    className: "cr-statrow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "n c-latin"
  }, st.dims), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, TCc('cr_s_dims'))), /*#__PURE__*/React.createElement("div", {
    className: "cr-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "n c-latin"
  }, st.chars), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, TCc('cr_s_chars'))), /*#__PURE__*/React.createElement("div", {
    className: "cr-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "n c-latin"
  }, st.fields), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, TCc('cr_s_fields'))), /*#__PURE__*/React.createElement("div", {
    className: "cr-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "n c-latin"
  }, st.conflict), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, TCc('cr_s_conflict')))), /*#__PURE__*/React.createElement("div", {
    className: "cr-glimpse"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-grow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gk"
  }, TCc('cr_world_name')), /*#__PURE__*/React.createElement("span", {
    className: "gv c-serif"
  }, Lc(C.worldName))), /*#__PURE__*/React.createElement("div", {
    className: "cr-grow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gk"
  }, TCc('cr_core_rule')), /*#__PURE__*/React.createElement("span", {
    className: "gv"
  }, Lc(C.coreRule))), /*#__PURE__*/React.createElement("div", {
    className: "cr-grow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gk"
  }, TCc('cr_protagonist')), /*#__PURE__*/React.createElement("span", {
    className: "gv"
  }, Lc(C.protagonist))), /*#__PURE__*/React.createElement("div", {
    className: "cr-gdims"
  }, C.worldDims.map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "c-badge gold"
  }, Lc(d.name))))), s.mode === 'auto' && s.autoChapters > 0 && /*#__PURE__*/React.createElement("div", {
    className: "cr-readychap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-dot writing"
  }), TCc('cr_autochap_note').replace('{n}', s.autoChapters)));
}

/* ---------- Step 4 第一卷大纲（铸世后 / 落笔前 · 方案 C 双栏：左卷纲 + 右简纲） ---------- */
const VOL_LEFT = 7,
  VOL_RIGHT = 3,
  VOL_SECTIONS = VOL_LEFT + VOL_RIGHT;
function VolSection({
  i,
  filled,
  icon,
  title,
  sub,
  children
}) {
  if (i > filled) return null;
  if (i === filled) {
    return /*#__PURE__*/React.createElement("div", {
      className: "cr-vol-sec forging"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-vol-sechead"
    }, /*#__PURE__*/React.createElement("span", {
      className: "cr-vol-secic"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: icon,
      s: 15
    })), /*#__PURE__*/React.createElement("span", {
      className: "cr-vol-sect c-serif"
    }, title), /*#__PURE__*/React.createElement("span", {
      className: "cr-vol-secsh c-shimmer"
    }, TCc('cr_vol_forging'))), /*#__PURE__*/React.createElement("div", {
      className: "cr-vol-skel"
    }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", {
      style: {
        width: '62%'
      }
    })));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-sec in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-sechead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-vol-secic"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: icon,
    s: 15
  })), /*#__PURE__*/React.createElement("span", {
    className: "cr-vol-sect c-serif"
  }, title), sub && /*#__PURE__*/React.createElement("span", {
    className: "cr-vol-secsub c-latin"
  }, sub)), children);
}
function RightBlock({
  i,
  filled,
  title,
  children
}) {
  if (i > filled) return null;
  if (i === filled) {
    return /*#__PURE__*/React.createElement("div", {
      className: "cr-vbk forging"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-vbk-h"
    }, title, /*#__PURE__*/React.createElement("span", {
      className: "cr-vbk-sh c-shimmer"
    }, TCc('cr_vol_brief_forging'))), /*#__PURE__*/React.createElement("div", {
      className: "cr-vol-skel"
    }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", {
      style: {
        width: '70%'
      }
    })));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-vbk in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vbk-h"
  }, title), children);
}
function volumeHeading(number, en) {
  if (en) return 'Vol.' + number;
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (number < 10) return '卷' + digits[number];
  if (number === 10) return '卷十';
  if (number < 20) return '卷十' + digits[number % 10];
  if (number < 100) return '卷' + digits[Math.floor(number / 10)] + '十' + (number % 10 ? digits[number % 10] : '');
  return '第 ' + number + ' 卷';
}
function latestWrittenChapter(chapters) {
  return (Array.isArray(chapters) ? chapters : []).reduce((latest, chapter) => {
    if (!chapter || chapter.state !== 'done') return latest;
    return Math.max(latest, Number(chapter.no) || 0);
  }, 0);
}
function rerollTargetLabel(step, volumeNumber) {
  if (step === 1) return Lc({
    zh: '世界观',
    en: 'worldbuilding'
  });
  if (step === 2) return Lc({
    zh: '角色表',
    en: 'character roster'
  });
  if (step === 3) return Lc({
    zh: '故事规划',
    en: 'story plan'
  });
  return Lc({
    zh: '第 ' + Math.max(1, Number(volumeNumber) || 1) + ' 卷的卷纲与简纲',
    en: 'volume ' + Math.max(1, Number(volumeNumber) || 1) + ' outlines'
  });
}
function rerollConfirmation(step, volumeNumber, chapters, characterCount) {
  const latestChapter = latestWrittenChapter(chapters);
  const target = rerollTargetLabel(step, volumeNumber);
  const castNote = step === 2 && characterCount > 0 ? TCc('cr_reroll_cast_count').replace('{n}', characterCount) : '';
  if (!latestChapter) return {
    hasProse: false,
    title: TCc('cr_reroll'),
    message: (step === 4 ? TCc('cr_vol_reroll_warn') : TCc('cr_reroll_warn')) + castNote
  };
  return {
    hasProse: true,
    title: Lc({
      zh: '确认重新抽取' + target,
      en: 'Confirm re-roll: ' + target
    }),
    message: Lc({
      zh: '当前正文已写至第 ' + latestChapter + ' 章。',
      en: 'Prose has been written through chapter ' + latestChapter + '.'
    }) + castNote,
    rows: [[Lc({
      zh: '你正在操作',
      en: 'You are doing'
    }), Lc({
      zh: '重新生成' + target + '；本阶段当前内容将由新版本替换。',
      en: 'Regenerating the ' + target + '; its current content will be replaced by a new version.'
    })], [Lc({
      zh: '影响范围',
      en: 'What stays unchanged'
    }), Lc({
      zh: '已生成的卷纲、简纲、细纲和正文不会自动更新；新结果只影响之后尚未生成的内容。',
      en: 'Existing volume, brief and chapter outlines and prose will not update automatically; the new result affects only content generated afterwards.'
    })], [Lc({
      zh: '主要风险',
      en: 'Main risk'
    }), Lc({
      zh: '新旧内容可能出现设定、人物或剧情冲突。完成后请按需依次重新生成受影响的下游内容；旧版本仍可从修订记录恢复。',
      en: 'Old and new content may conflict in lore, characters or plot. Regenerate affected downstream content in order when needed; prior versions remain recoverable from revision history.'
    })]]
  };
}
function VolumeOutlineStep({
  s,
  set,
  bookId,
  onHistory,
  onGenerateVolume,
  activeVolume,
  refreshToken
}) {
  const en = window.CLANG === 'en';
  const P = window.LF_PORTAL,
    E = window.LF_EDIT;
  const initialRows = () => P && P.mapCreate && P.mapCreate.outlineVolumes ? P.mapCreate.outlineVolumes(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.outlines) : [];
  const [rows, setRows] = uS(initialRows);
  const [selectedNumber, setSelectedNumber] = uS(() => {
    const initial = initialRows();
    const requested = Number(activeVolume) || 0;
    if (requested && initial.some(row => row.number === requested)) return requested;
    return initial.length ? initial[initial.length - 1].number : Number(activeVolume) || 1;
  });
  const [loadError, setLoadError] = uS('');
  uE(() => {
    if (!bookId || !P || !P.getOutlineVolumes) return;
    let alive = true;
    P.getOutlineVolumes(bookId).then(next => {
      if (!alive) return;
      setRows(next);
      setLoadError('');
      setSelectedNumber(current => {
        if (next.some(row => row.number === current)) return current;
        if (s.running && Number(activeVolume)) return Number(activeVolume);
        return next.length ? next[next.length - 1].number : current;
      });
    }).catch(error => {
      if (alive) setLoadError(String(error && error.message || error || TCc('cr_gen_failed_desc')));
    });
    return () => {
      alive = false;
    };
  }, [bookId, s.running, s.done, refreshToken]);
  uE(() => {
    if (s.running && Number(activeVolume)) setSelectedNumber(Number(activeVolume));
  }, [s.running, activeVolume]);
  const latestNumber = rows.length ? rows[rows.length - 1].number : 0;
  const navRows = rows.slice();
  if (s.running && Number(activeVolume) && !navRows.some(row => row.number === Number(activeVolume))) {
    navRows.push({
      number: Number(activeVolume),
      volume: null,
      nearTerm: null,
      complete: false,
      pending: true
    });
  }
  const selected = navRows.find(row => row.number === selectedNumber) || navRows[navRows.length - 1] || null;
  const selectedComplete = !!(selected && selected.complete);
  const isActive = !!(s.running && Number(activeVolume) === selectedNumber);
  const f = selectedComplete ? VOL_SECTIONS : isActive ? s.filled : 0;
  /* 分区就地编辑：面板原排版即查看态(renderView)，点铅笔展开共享结构化编辑器，
     scope 到卷纲/近纲 raw 内容的对应子树；退出自动保存、按分区 AI 改写。 */
  const volCtl = E.useResourceEditor(() => E.adapters.outlineVolume(bookId, selectedNumber), [bookId, selectedNumber, refreshToken, selected && selected.volumeVersion]);
  const ntCtl = E.useResourceEditor(() => E.adapters.outlineNearTerm(bookId, selectedNumber), [bookId, selectedNumber, refreshToken, selected && selected.nearTermVersion]);
  uE(() => {
    const cite = window.LF_ASSISTANT_CITE;
    if (!cite) return undefined;
    if (bookId && selectedNumber) {
      cite.setObject({
        bookId,
        owner: 'create-outline',
        resource_type: 'outline',
        resource_key: 'volume:' + selectedNumber
      });
    } else {
      cite.clear({
        owner: 'create-outline'
      });
    }
    return () => cite.clear({
      owner: 'create-outline'
    });
  }, [bookId, selectedNumber]);
  const editorOutline = P && P.mapCreate && (volCtl.state.content || ntCtl.state.content) ? P.mapCreate.outline(volCtl.state.content ? {
    content: volCtl.state.content
  } : null, ntCtl.state.content ? {
    content: ntCtl.state.content
  } : null) : null;
  const V = editorOutline && editorOutline.volume ? P.mapCreate.mergeVolumeOutline(editorOutline.volume) : selected && selected.volume || Dc.create.volOne;
  const B = editorOutline && editorOutline.nearTerm ? P.mapCreate.mergeArcOutline(editorOutline.nearTerm) : selected && selected.nearTerm || Dc.create.briefOne;
  const acts = [['vo_act_est', V.acts.establish], ['vo_act_con', V.acts.confront], ['vo_act_res', V.acts.resolve]];
  const confs = [['vo_c_ext', V.conflicts.external], ['vo_c_int', V.conflicts.internal], ['vo_c_und', V.conflicts.underlying]];
  const ends = [['vo_end_state', V.ending.character_state], ['vo_end_susp', V.ending.suspense], ['vo_end_after', V.ending.emotional_aftertaste]];
  const statusText = selectedComplete ? TCc('cr_vol_done_n').replace('{n}', selectedNumber) : s.error && isActive ? TCc('cr_gen_failed') : f < VOL_LEFT ? TCc('cr_vol_forging_n').replace('{n}', selectedNumber) : TCc('cr_vol_brief_forging');
  const editable = !!(selectedComplete && bookId && E && P && P.getVolumeOutlineRaw);
  const secEdit = (ctl, rtype, path, label, view) => editable ? /*#__PURE__*/React.createElement(E.SectionField, {
    ctl: ctl,
    path: path,
    resourceType: rtype,
    bookId: bookId,
    label: label,
    renderView: view
  }) : view;
  const canAppend = !!(rows.length && !s.running && !s.error && rows.every(row => row.complete));
  const canReroll = !!(selectedComplete && !s.running);
  const openHistory = () => onHistory && onHistory({
    title: Lc({
      zh: '第 ' + selectedNumber + ' 卷规划修订记录',
      en: 'Volume ' + selectedNumber + ' plan revisions'
    }),
    phase: 'outline',
    volumeNumber: selectedNumber,
    package: {
      volumeNumber: selectedNumber,
      label: Lc({
        zh: '本卷规划',
        en: 'Volume plan'
      })
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-vol"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-doc"
  }, !!navRows.length && /*#__PURE__*/React.createElement("div", {
    className: "cr-volume-nav",
    "aria-label": Lc({
      zh: '卷大纲导航',
      en: 'Volume outline navigation'
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-volume-tabs",
    role: "tablist"
  }, navRows.map(row => /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "tab",
    "aria-selected": row.number === selectedNumber,
    className: row.number === selectedNumber ? 'on' : '',
    key: row.number,
    onClick: () => {
      setSelectedNumber(row.number);
      set({
        outlineVolume: row.number
      });
    }
  }, /*#__PURE__*/React.createElement("span", null, en ? 'Vol. ' + row.number : '第 ' + row.number + ' 卷'), /*#__PURE__*/React.createElement("i", {
    className: 'c-dot ' + (row.complete ? 'done' : row.pending ? 'writing' : 'todo')
  })))), canAppend && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn gold sm cr-volume-add",
    onClick: () => onGenerateVolume(latestNumber + 1),
    disabled: window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED()
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "plus",
    s: 12
  }), TCc('cr_vol_generate_next'))), loadError && /*#__PURE__*/React.createElement("div", {
    className: "cr-outline-load-error",
    role: "alert"
  }, loadError), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-heroL"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-kicker"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-vol-no c-latin"
  }, volumeHeading(selectedNumber, en)), /*#__PURE__*/React.createElement("span", {
    className: "cr-vol-range c-latin"
  }, Lc(V.range)), /*#__PURE__*/React.createElement("span", {
    className: "cr-vol-separator",
    "aria-hidden": "true"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "cr-vol-chapter-count c-latin"
  }, en ? V.chapters + ' ch.' : '共' + V.chapters + '章')), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-nm c-serif"
  }, Lc(V.name))), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-heroR"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-actions"
  }, /*#__PURE__*/React.createElement("div", {
    className: 'cr-vol-status' + (selectedComplete ? ' done' : s.error && isActive ? ' failed' : '')
  }, /*#__PURE__*/React.createElement("span", {
    className: 'c-dot ' + (selectedComplete ? 'done' : s.error && isActive ? 'todo' : 'writing')
  }), statusText), selectedComplete && bookId && onHistory && /*#__PURE__*/React.createElement(RevisionHistoryButton, {
    onClick: openHistory
  }), canReroll && /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm cr-vol-reroll",
    onClick: () => set({
      rerollWarn: true,
      outlineVolume: selectedNumber
    }),
    disabled: window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED()
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 12
  }), TCc('cr_reroll'))), selectedComplete && selectedNumber < latestNumber && /*#__PURE__*/React.createElement("span", {
    className: "cr-vol-dependency-note"
  }, TCc('cr_vol_dependency_note')))), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-seqnote"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "sparkle",
    s: 14
  }), /*#__PURE__*/React.createElement("span", null, TCc('cr_vol_seq'))), !selectedComplete && f < 1 ? /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-loading"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-runspin"
  }), /*#__PURE__*/React.createElement("span", {
    className: "c-shimmer"
  }, TCc('cr_vol_forging'))) : /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-split"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-paneh"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ph-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "book",
    s: 13
  })), /*#__PURE__*/React.createElement("span", {
    className: "ph-t"
  }, TCc('cr_vol_skeleton'))), /*#__PURE__*/React.createElement(VolSection, {
    i: 0,
    filled: f,
    icon: "peak",
    title: TCc('cr_vol_sec_pos')
  }, secEdit(volCtl, '卷纲·' + TCc('cr_vol_sec_pos'), ['positioning'], TCc('cr_vol_sec_pos'), /*#__PURE__*/React.createElement("p", {
    className: "cr-vol-lead c-serif"
  }, Lc(V.positioning)))), /*#__PURE__*/React.createElement(VolSection, {
    i: 1,
    filled: f,
    icon: "clock",
    title: TCc('cr_vol_sec_acts')
  }, secEdit(volCtl, '卷纲·' + TCc('cr_vol_sec_acts'), ['acts'], TCc('cr_vol_sec_acts'), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-acts"
  }, acts.map(([k, a], j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    className: "cr-vol-act"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-actstep c-latin"
  }, j + 1), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-actbody"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-actk"
  }, TCc(k), /*#__PURE__*/React.createElement("span", {
    className: "cr-vol-actc c-latin"
  }, Lc(a.chapters))), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-actt"
  }, Lc(a.content)))))))), /*#__PURE__*/React.createElement(VolSection, {
    i: 2,
    filled: f,
    icon: "bolt",
    title: TCc('cr_vol_sec_conf')
  }, secEdit(volCtl, '卷纲·' + TCc('cr_vol_sec_conf'), ['conflicts'], TCc('cr_vol_sec_conf'), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-confs"
  }, confs.map(([k, c], j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    className: 'cr-vol-conf t' + j
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-confk"
  }, TCc(k)), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-confv"
  }, Lc(c))))))), /*#__PURE__*/React.createElement(VolSection, {
    i: 3,
    filled: f,
    icon: "link",
    title: TCc('cr_vol_sec_nodes')
  }, secEdit(volCtl, '卷纲·' + TCc('cr_vol_sec_nodes'), ['nodes'], TCc('cr_vol_sec_nodes'), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-nodes"
  }, V.nodes.map((nd, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    className: "cr-vol-node"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-nodeid c-latin"
  }, nd.id), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-nodebody"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-nodedesc"
  }, Lc(nd.description)), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-nodecons"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-vol-conslab"
  }, TCc('vo_node_cons')), Lc(nd.consequence)))))))), /*#__PURE__*/React.createElement(VolSection, {
    i: 4,
    filled: f,
    icon: "agents",
    title: TCc('cr_vol_sec_cast')
  }, secEdit(volCtl, '卷纲·' + TCc('cr_vol_sec_cast'), ['characters'], TCc('cr_vol_sec_cast'), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-cast"
  }, V.characters.map((ch, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    className: "cr-vol-ch"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-vol-chav c-serif"
  }, Lc(ch.name).replace(/\s/g, '')[0]), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-chbody"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-chnm c-serif"
  }, Lc(ch.name)), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-chrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-vol-chlab"
  }, TCc('cr_vol_identity')), Lc(ch.identity)), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-chrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-vol-chlab gold"
  }, TCc('cr_vol_function')), Lc(ch.narrative_function)))))))), /*#__PURE__*/React.createElement(VolSection, {
    i: 5,
    filled: f,
    icon: "door",
    title: TCc('cr_vol_sec_end')
  }, secEdit(volCtl, '卷纲·' + TCc('cr_vol_sec_end'), ['ending'], TCc('cr_vol_sec_end'), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-ends"
  }, ends.map(([k, v], j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    className: "cr-vol-end"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-endk"
  }, TCc(k)), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-endv"
  }, Lc(v))))))), /*#__PURE__*/React.createElement(VolSection, {
    i: 6,
    filled: f,
    icon: "pen",
    title: TCc('cr_vol_sec_tone')
  }, secEdit(volCtl, '卷纲·' + TCc('cr_vol_sec_tone'), ['style_tone'], TCc('cr_vol_sec_tone'), /*#__PURE__*/React.createElement("p", {
    className: "cr-vol-tone"
  }, Lc(V.style_tone))))), /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-paneh am"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ph-ic am"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "shelf",
    s: 13
  })), /*#__PURE__*/React.createElement("span", {
    className: "ph-t"
  }, TCc('cr_vol_brief')), /*#__PURE__*/React.createElement("span", {
    className: "ph-sub"
  }, TCc('cr_vol_brief_sub'))), f < VOL_LEFT && /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-rwait"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-shimmer"
  }, TCc('cr_vol_brief_wait'))), /*#__PURE__*/React.createElement(RightBlock, {
    i: 7,
    filled: f,
    title: TCc('br_chapters')
  }, secEdit(ntCtl, '简纲·' + TCc('br_chapters'), ['chapters'], TCc('br_chapters'), /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "cr-vbarc-tag"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-vbarc-tagl"
  }, TCc('br_arc')), /*#__PURE__*/React.createElement("b", {
    className: "c-serif"
  }, Lc(B.arc_name)), /*#__PURE__*/React.createElement("span", {
    className: "cr-vbarc-tagr c-latin"
  }, Lc(B.range))), /*#__PURE__*/React.createElement("div", {
    className: "cr-vbchs"
  }, B.chapters.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.number,
    className: "cr-vbch"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-vbch-no c-latin"
  }, c.number), /*#__PURE__*/React.createElement("div", {
    className: "cr-vbch-mid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vbch-t c-serif"
  }, Lc(c.title)), /*#__PURE__*/React.createElement("div", {
    className: "cr-vbch-s"
  }, Lc(c.summary)), /*#__PURE__*/React.createElement("div", {
    className: "cr-vbch-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'wbb-rhythm ' + c.rhythm.k
  }, Lc(c.rhythm)), /*#__PURE__*/React.createElement("span", {
    className: "cr-vbch-time c-latin"
  }, Lc(c.time_advance))))))), /*#__PURE__*/React.createElement("div", {
    className: "cr-vbmore"
  }, "\u22EF ", Lc(B.more))))), /*#__PURE__*/React.createElement(RightBlock, {
    i: 8,
    filled: f,
    title: TCc('br_arcs')
  }, secEdit(ntCtl, '简纲·' + TCc('br_arcs'), ['character_arcs'], TCc('br_arcs'), /*#__PURE__*/React.createElement("div", {
    className: "cr-vbarcs"
  }, B.character_arcs.map((a, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    className: "cr-vbarc"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vbarc-nm c-serif"
  }, Lc(a.name)), /*#__PURE__*/React.createElement("div", {
    className: "cr-vbarc-flow"
  }, /*#__PURE__*/React.createElement("span", null, Lc(a.from)), /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 12,
    w: 2
  }), /*#__PURE__*/React.createElement("span", {
    className: "to"
  }, Lc(a.to))), /*#__PURE__*/React.createElement("div", {
    className: "cr-vbarc-delta"
  }, Lc(a.change))))))), /*#__PURE__*/React.createElement(RightBlock, {
    i: 9,
    filled: f,
    title: TCc('br_decisions')
  }, secEdit(ntCtl, '简纲·' + TCc('br_decisions'), ['decision_points'], TCc('br_decisions'), /*#__PURE__*/React.createElement("div", {
    className: "cr-vbdecs"
  }, B.decision_points.map((d, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    className: "cr-vbdec"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-vbdec-ch c-latin"
  }, en ? 'ch.' + d.chapter : '第 ' + d.chapter + ' 章'), /*#__PURE__*/React.createElement("div", {
    className: "cr-vbdec-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-vbdec-who"
  }, Lc(d.character)), /*#__PURE__*/React.createElement("div", {
    className: "cr-vbdec-choice"
  }, Lc(d.choice)), /*#__PURE__*/React.createElement("div", {
    className: "cr-vbdec-impact"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-vbdec-il"
  }, TCc('br_dec_impact')), Lc(d.impact)))))))))), selectedComplete && /*#__PURE__*/React.createElement("div", {
    className: "cr-vol-foot"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "run",
    s: 13
  }), TCc('cr_vol_next_note'))));
}

/* ---------- wizard shell ---------- */
const GEN = {
  1: 'world',
  2: 'cast',
  3: 'story'
};
const CREATE_PROGRESS_KEY = 'lf_create_progress';
const CREATE_CREDIT_ACTION_KEY = 'lf_create_credit_action';
const STEP_BY_PHASE = {
  world: 1,
  cast: 2,
  story: 3,
  outline: 4
};
function phaseItems(kind) {
  return kind === 'cast' ? Dc.create.cast : kind === 'story' ? Dc.create.story : Dc.create.worldDims;
}
/* 角色表按真实管线计步：①骨架(批量1) + ②信念(批量1) + ③深层(逐个n) = n+2 步 */
function genTotal(kind) {
  if (kind === 'cast') return Dc.create.cast.length + 2;
  if (kind === 'story') {
    const sk = window.LF_PORTAL && window.LF_PORTAL.storySectionKeys;
    return sk && sk.length || Dc.create.story.length || 4;
  }
  return phaseItems(kind).length;
}

/* 引擎 SSE 阶段 → 向导步数（只认 stage_ready=已落库可读）。
   cast: skeleton=1 / beliefs=2 / 每个 deep_profile +1 / voice=全部;
   world: 维度顺序下标+1; outline: persist_volume=左栏 7 段 / persist_near_term=全部;
   story 单次 stage_ready 一次性写入，展示由数据到达驱动，不在此映射 */
function stageFilled(kind, ev, st) {
  if (!ev || ev.event !== 'stage_ready' || !ev.stage_name) return null;
  const stage = String(ev.stage_name);
  if (kind === 'cast') {
    if (stage === 'skeleton') return 1;
    if (stage === 'beliefs') return 2;
    if (stage === 'deep_profile') {
      st.deep = (st.deep || 0) + 1;
      return 2 + st.deep;
    }
    if (stage === 'voice') return genTotal('cast');
    return null;
  }
  if (kind === 'world') {
    const keys = window.LF_PORTAL && window.LF_PORTAL.worldDimensionKeys || [];
    const i = keys.indexOf(stage);
    return i >= 0 ? i + 1 : null;
  }
  if (kind === 'outline') {
    if (stage === 'persist_volume') return VOL_LEFT;
    if (stage === 'persist_near_term') return VOL_SECTIONS;
    return null;
  }
  return null;
}
function CreateFlow({
  ctl,
  onClose,
  onDone,
  resume
}) {
  const saved = resume && resume.saved ? resume.saved : null;
  const preferredLanguage = ctl.settings && ctl.settings.default_writing_language;
  const preferredCode = preferredLanguage && preferredLanguage.startsWith('zh') ? 'zh' : preferredLanguage;
  const preferredIndex = Math.max(0, Dc.create.bookLangs.findIndex(item => item.code === preferredCode));
  const [s, setS] = uS({
    step: resume && resume.step != null ? resume.step : 0,
    sidebarOpen: false,
    mode: saved && saved.mode || 'copilot',
    autoChapters: saved && saved.autoChapters != null ? saved.autoChapters : 3,
    bookLang: saved && saved.bookLang != null ? saved.bookLang : preferredIndex,
    bookLength: saved && saved.bookLength != null ? saved.bookLength : 1,
    // 0=短 1=中 2=长
    bookWords: saved && saved.bookWords != null ? saved.bookWords : 1,
    // 0=2000-2500 1=3000-4000 2=4000-5000 3=5000-6000
    idea: saved && saved.idea || '',
    worldType: saved && saved.worldType ? [...saved.worldType] : [],
    coreMech: saved && saved.coreMech ? [...saved.coreMech] : [],
    style: saved && saved.style ? [...saved.style] : [],
    relationship: saved && saved.relationship ? [...saved.relationship] : [],
    readers: 0,
    conflict: saved && saved.conflict || '',
    bookTitle: saved && saved.bookTitle || '',
    filled: 0,
    done: false,
    error: null,
    running: false,
    engineDone: false,
    sel: null,
    rerollWarn: false,
    outlineVolume: resume && resume.volumeNumber != null ? Math.max(1, Number(resume.volumeNumber) || 1) : null
  });
  const [history, setHistory] = uS(null);
  const [historyRefresh, setHistoryRefresh] = uS(0);
  const set = p => setS(x => ({
    ...x,
    ...(typeof p === 'function' ? p(x) : p)
  }));
  const bookIdRef = uR(resume && resume.bookId || saved && saved.bookId || null);
  const stepRef = uR(s.step);
  stepRef.current = s.step;
  const doneSteps = uR(new Set()); // 本会话已完成的步骤 — 上一步/下一步往返不再触发生成
  const activeRuns = uR({}); // 进行中的步骤 — 保存 run token，旧回调不得覆盖新任务
  const phaseViews = uR({}); // 每一步独立保存进度/完成/失败态，往返时不串用上一步 UI
  const startIntents = uR(new Set()); // 只有明确前进/自动模式推进才允许创建新阶段任务
  const runToken = uR(0);
  const flowAlive = uR(true);
  const creditAction = uR((() => {
    try {
      const value = JSON.parse(localStorage.getItem(CREATE_CREDIT_ACTION_KEY) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch (e) {
      return null;
    }
  })());
  const persistCreditAction = action => {
    creditAction.current = action;
    try {
      if (action) localStorage.setItem(CREATE_CREDIT_ACTION_KEY, JSON.stringify(action));else localStorage.removeItem(CREATE_CREDIT_ACTION_KEY);
    } catch (e) {}
  };
  const autoCreditAction = step => {
    const bookId = bookIdRef.current;
    let action = creditAction.current;
    if (!action || action.bookId !== bookId || action.nextStep !== step) {
      action = {
        id: 'auto_create_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10),
        bookId,
        startStep: step,
        nextStep: step,
        rootTaskId: null
      };
      persistCreditAction(action);
    }
    return action;
  };
  const blankPhaseView = () => ({
    filled: 0,
    done: false,
    error: null,
    running: false,
    engineDone: false,
    taskId: null,
    dataReady: false
  });
  const applyPhaseView = (step, patch) => {
    const previous = phaseViews.current[step] || blankPhaseView();
    const next = {
      ...previous,
      ...(typeof patch === 'function' ? patch(previous) : patch)
    };
    phaseViews.current[step] = next;
    if (flowAlive.current && stepRef.current === step) {
      set({
        filled: next.filled,
        done: next.done,
        error: next.error,
        running: next.running,
        engineDone: next.engineDone
      });
    }
    return next;
  };
  const showStep = step => {
    const view = phaseViews.current[step] || blankPhaseView();
    set({
      step,
      filled: view.filled,
      done: view.done,
      error: view.error,
      running: view.running,
      engineDone: view.engineDone,
      sel: null,
      mDetail: null,
      rerollWarn: false
    });
  };
  uE(() => {
    flowAlive.current = true;
    return () => {
      flowAlive.current = false;
    };
  }, []);

  /* 向导期间锁定 create 数据：快照轮询不得覆盖正在展示/生成的阶段内容 */
  uE(() => {
    if (!window.LF_PORTAL || !window.LF_PORTAL.setCreateDataLocked) return;
    window.LF_PORTAL.setCreateDataLocked(true);
    return () => window.LF_PORTAL.setCreateDataLocked(false);
  }, []);

  /* 续建：等快照就绪后恢复每个阶段的最新任务态。历史 completed 只表示已有
     可读数据；若同阶段有更新的 running/failed，页面仍以最新尝试为准。 */
  uE(() => {
    var alive = true;
    var bid = bookIdRef.current;
    if (!resume || !bid || !window.LF_PORTAL || !window.LF_PORTAL.ready) return () => {
      alive = false;
    };
    window.LF_PORTAL.ready().then(function () {
      if (!alive || bookIdRef.current !== bid) return;
      var books = window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.books;
      if (Array.isArray(books) && !books.some(function (b) {
        return b && b.id === bid;
      })) {
        clearProgress();
        onClose();
        return; // 续建目标已被删除 — 退出向导回书架
      }
      var stage = window.LF_PORTAL.bookCreationStage(bid);
      Object.keys(STEP_BY_PHASE).forEach(function (k) {
        var step = STEP_BY_PHASE[k],
          phase = stage.phases && stage.phases[k];
        var total = k === 'outline' ? VOL_SECTIONS : genTotal(k);
        if (phase && (phase.hasCompleted || phase.adoptedExisting)) window.LF_PORTAL.fetchCreatePhaseResult(bid, k).then(function () {
          if (alive && bookIdRef.current === bid && window.LF_RERENDER) window.LF_RERENDER();
        }).catch(function () {});
        if (stage.done[k]) {
          doneSteps.current.add(step);
          applyPhaseView(step, {
            filled: total,
            done: true,
            error: null,
            running: false,
            engineDone: true
          });
        } else if (stage.running[k]) {
          doneSteps.current.delete(step);
          applyPhaseView(step, {
            done: false,
            error: null,
            running: true,
            engineDone: false
          });
        } else if (stage.failed[k]) {
          doneSteps.current.delete(step);
          const message = TCc('cr_gen_failed_desc');
          const error = window.LF_ERROR?.withRefund?.(message, phase?.latestTask?.credits_refunded) || message;
          applyPhaseView(step, {
            filled: phase && phase.hasCompleted ? total : 0,
            done: false,
            error,
            running: false,
            engineDone: false
          });
        }
      });
      /* 刷新或从书架返回时，后台仍在生成的阶段必须成为当前可见步骤；
         runGen 随后只会 attach 最新任务，不会重复创建。 */
      if (stage.activeStep || stage.failedStep) {
        showStep(stage.activeStep || stage.failedStep);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  /* 刷新/断线兜底：建书后持久化向导位置与立意表单，刷新后据此回到向导续看进度 */
  uE(() => {
    if (!bookIdRef.current) return;
    try {
      localStorage.setItem(CREATE_PROGRESS_KEY, JSON.stringify({
        bookId: bookIdRef.current,
        step: s.step,
        mode: s.mode,
        autoChapters: s.autoChapters,
        bookLang: s.bookLang,
        bookLength: s.bookLength,
        bookWords: s.bookWords,
        idea: s.idea,
        worldType: s.worldType,
        coreMech: s.coreMech,
        style: s.style,
        relationship: s.relationship,
        conflict: s.conflict,
        bookTitle: s.bookTitle,
        ts: Date.now()
      }));
    } catch (e) {}
  }, [s.step, s.done, s.mode, s.autoChapters, s.bookLang, s.idea, s.worldType, s.coreMech, s.style, s.relationship, s.conflict, s.bookTitle, s.bookLength, s.bookWords]);
  const clearProgress = () => {
    try {
      localStorage.removeItem(CREATE_PROGRESS_KEY);
    } catch (e) {}
  };
  uE(() => {
    if (s.mode !== 'auto') persistCreditAction(null);
  }, [s.mode]);

  /* 引擎任务入参：world/cast/story 后端强制要求 premise（书上没有就 422），
     genre 必须是字符串标签而非下标。引擎输入固定走 zh 文案，与 UI 语言无关 */
  const phasePayload = (k, replaceExisting, outlineVolume) => {
    const C = Dc.create,
      p = {};
    const lng = C.bookLangs && C.bookLangs[s.bookLang];
    if (lng) p.language = lng.zh || Lc(lng);
    if (k === 'world' || k === 'cast' || k === 'story') {
      const premise = creationPremise(s);
      if (premise) p.premise = premise;
      // 拼接四字段为结构化 genre（发送给引擎的管线输入）
      var parts = [];
      var wt = (s.worldType || []).join('、');
      var cm = (s.coreMech || []).join('、');
      var sty = (s.style || []).join('、');
      var rel = (s.relationship || []).join('、');
      if (wt) parts.push('【题材类型】：' + wt);
      if (cm) parts.push('【核心玩法】：' + cm);
      if (sty) parts.push('【风格】：' + sty);
      if (rel) parts.push('【关系线】：' + rel);
      if (parts.length) p.genre = parts.join('\\n');
    }
    if (k === 'outline') {
      p.volume_number = Math.max(1, Number(outlineVolume) || 1);
      const lengths = {
        0: '短',
        1: '中',
        2: '长'
      };
      const wordsChaps = {
        0: '2000-2500',
        1: '3000-4000',
        2: '4000-5000',
        3: '5000-6000'
      };
      if (s.bookLength != null) p.estimated_length = lengths[s.bookLength];
      if (s.bookWords != null) p.words_per_chapter = wordsChaps[s.bookWords];
    }
    if (k === 'cast' && replaceExisting === true) p.replace_existing = true;
    return p;
  };

  /* 建书向导生成只以后端任务为真相：最新 completed → 完成；最新 running →
     重挂；最新 failed → 显式失败。任何错误都不能用本地计时器伪造成完成。 */
  const runGen = (total, force, retry, allowCreate, outlineVolume) => {
    var stepAtRun = s.step;
    var k = GEN[stepAtRun] || (stepAtRun === 4 ? 'outline' : null);
    var targetOutlineVolume = k === 'outline' ? Math.max(1, Number(outlineVolume) || Number(s.outlineVolume) || 1) : null;
    if (force) doneSteps.current.delete(stepAtRun);else {
      if (activeRuns.current[stepAtRun]) {
        applyPhaseView(stepAtRun, phaseViews.current[stepAtRun] || {
          running: true
        });
        return;
      }
      if (doneSteps.current.has(stepAtRun)) {
        applyPhaseView(stepAtRun, {
          done: true,
          filled: total,
          error: null,
          running: false,
          engineDone: true
        });
        return;
      }
      if (!retry && phaseViews.current[stepAtRun] && phaseViews.current[stepAtRun].error) {
        applyPhaseView(stepAtRun, phaseViews.current[stepAtRun]);
        return;
      }
    }
    var phaseBeforeRun = phaseViews.current[stepAtRun] ? {
      ...phaseViews.current[stepAtRun]
    } : {
      filled: 0,
      done: false,
      error: null,
      running: false,
      engineDone: false
    };
    var token = ++runToken.current;
    var runBookId = bookIdRef.current;
    activeRuns.current[stepAtRun] = {
      token,
      bookId: runBookId,
      phase: k
    };
    applyPhaseView(stepAtRun, {
      filled: 0,
      done: false,
      error: null,
      running: true,
      engineDone: false,
      taskId: null,
      dataReady: false,
      token
    });
    if (stepRef.current === stepAtRun) set({
      sel: null,
      rerollWarn: false,
      ...(k === 'outline' ? {
        outlineVolume: targetOutlineVolume
      } : {})
    });
    const isCurrentRun = () => {
      var current = activeRuns.current[stepAtRun];
      return flowAlive.current && current && current.token === token && (!runBookId || bookIdRef.current === runBookId);
    };
    const finish = () => {
      if (!isCurrentRun()) return;
      delete activeRuns.current[stepAtRun];
      /* story 数据一次性到达，先记录引擎已完成，再由 reveal effect 分步呈现；
         其余阶段收到真实完成事件后立即进入完成态。 */
      if (k === 'story') {
        if (s.mode === 'auto' && creditAction.current && creditAction.current.nextStep === stepAtRun - 1) {
          persistCreditAction({
            ...creditAction.current,
            nextStep: stepAtRun
          });
        }
        applyPhaseView(stepAtRun, {
          running: false,
          engineDone: true,
          error: null,
          dataReady: true
        });
        return;
      }
      if (s.mode === 'auto' && creditAction.current && creditAction.current.nextStep === stepAtRun - 1) {
        if (stepAtRun === 4) persistCreditAction(null);else persistCreditAction({
          ...creditAction.current,
          nextStep: stepAtRun
        });
      }
      doneSteps.current.add(stepAtRun);
      applyPhaseView(stepAtRun, {
        filled: total,
        done: true,
        error: null,
        running: false,
        engineDone: true
      });
      if (k === 'outline') setHistoryRefresh(value => value + 1);
    };
    const fail = (error, message) => {
      if (!isCurrentRun()) return false;
      delete activeRuns.current[stepAtRun];
      if (s.mode === 'auto') persistCreditAction(null);
      if (error && error.code === 'quote_cancelled') {
        if (phaseBeforeRun.done) doneSteps.current.add(stepAtRun);
        applyPhaseView(stepAtRun, phaseBeforeRun);
        return true;
      }
      const description = message || TCc('cr_gen_failed_desc');
      const creditsRefunded = error?.creditsRefunded === true || error?.status === 'failed' && error.credits_refunded === true;
      const errorText = window.LF_ERROR?.withRefund?.(description, creditsRefunded) || description;
      applyPhaseView(stepAtRun, {
        done: false,
        error: errorText,
        running: false,
        engineDone: false
      });
      if (error && window.LF_ERROR && window.LF_ERROR.isBackendError(error)) window.LF_ERROR(error);
      return true;
    };
    if (window.LF_PORTAL && k) {
      if (!bookIdRef.current) {
        /* no book yet — create one first on forge, then re-run.
        POST /api/books 的 genre 是字符串字段（数字下标会 422）；立意写进 subtitle 与
        display_cache.premise，后端 world/cast/story 任务从这里取 premise */
        var idea = (s.idea || '').trim();
        var pp = phasePayload('world');
        var extra = {};
        if (pp.genre) extra.genre = pp.genre;
        if (idea) extra.subtitle = idea.slice(0, 255);
        // 四字段保存到本地 BookLink（worldType 复用 genre 列；其余走新列）
        var cm = (s.coreMech || []).join(',');
        var sty = (s.style || []).join(',');
        var rel = (s.relationship || []).join(',');
        if (cm) extra.core_mech = cm;
        if (sty) extra.style = sty;
        if (rel) extra.relationship = rel;
        var lengths = {
          0: '短',
          1: '中',
          2: '长'
        };
        var wordsChaps = {
          0: '2000-2500',
          1: '3000-4000',
          2: '4000-5000',
          3: '5000-6000'
        };
        if (s.bookLength != null) extra.estimated_length = lengths[s.bookLength];
        if (s.bookWords != null) extra.words_per_chapter = wordsChaps[s.bookWords];
        var cache = {};
        if (idea) cache.premise = idea;
        if ((s.conflict || '').trim()) cache.conflict = s.conflict.trim();
        if (Object.keys(cache).length) extra.display_cache = cache;
        window.LF_PORTAL.createBook((s.bookTitle || '').trim() || idea.slice(0, 20) || '未命名', extra).then(function (b) {
          if (!isCurrentRun()) return;
          if (b && b.id) {
            delete activeRuns.current[stepAtRun];
            bookIdRef.current = b.id;
            runGen(total, force, retry, allowCreate, targetOutlineVolume);
          } else fail(new Error(TCc('cr_gen_failed_desc')));
        }).catch(function (err) {
          fail(err);
        });
        return;
      }
      var bookId = bookIdRef.current;
      runBookId = bookId;
      activeRuns.current[stepAtRun].bookId = bookId;
      var stageState = {
        deep: 0,
        seen: false
      };
      var onProgress = function (ev) {
        if (!isCurrentRun()) return;
        if (ev && ev.done) {
          finish();
          return;
        }
        if (ev && ev.error) {
          fail(ev.error);
          return;
        }
        if (k === 'story' && ev && ev.event === 'stage_ready' && ev.stage_name === 'story_plan') {
          applyPhaseView(stepAtRun, {
            dataReady: true
          });
        }
        var sf = stageFilled(k, ev, stageState);
        if (sf != null) {
          stageState.seen = true;
          applyPhaseView(stepAtRun, x => ({
            filled: Math.max(x.filled, sf)
          }));
          return;
        }
        /* 阶段事件出现前用引擎数值进度兜底；cast 步数语义 / story 假加载 / outline 一次到达
           都不能用数值进度（否则会提前点亮骨架字段） */
        if (!stageState.seen && k !== 'cast' && k !== 'story' && k !== 'outline' && ev && typeof ev.progress === 'number') {
          applyPhaseView(stepAtRun, x => ({
            filled: Math.max(x.filled, Math.round(ev.progress * total))
          }));
        }
      };
      var onTask = function (task) {
        if (!isCurrentRun()) return;
        applyPhaseView(stepAtRun, {
          taskId: task && task.id || null
        });
        if (k === 'outline' && task && task.request_payload && task.request_payload.volume_number != null) {
          targetOutlineVolume = Math.max(1, Number(task.request_payload.volume_number) || targetOutlineVolume);
          if (stepRef.current === stepAtRun) set({
            outlineVolume: targetOutlineVolume
          });
        }
        if (s.mode === 'auto' && task && task.id) {
          const payload = task.request_payload || {};
          const meta = payload.composite_action;
          if (meta && meta.kind === 'automatic_book_creation') {
            const action = {
              id: meta.id,
              bookId,
              startStep: Number(meta.start_step),
              nextStep: Number(meta.step),
              rootTaskId: meta.root_task_id || task.id
            };
            persistCreditAction(action);
          } else if (creditAction.current && !creditAction.current.rootTaskId) {
            persistCreditAction({
              ...creditAction.current,
              rootTaskId: task.id
            });
          }
        }
      };
      const taskPayload = () => {
        const value = phasePayload(k, force, targetOutlineVolume);
        if (s.mode !== 'auto') return value;
        const absoluteStep = stepAtRun - 1;
        const action = autoCreditAction(absoluteStep);
        value.composite_action = {
          id: action.id,
          kind: 'automatic_book_creation',
          step: absoluteStep,
          start_step: action.startStep,
          total: 4,
          root_task_id: absoluteStep === action.startStep ? null : action.rootTaskId
        };
        return value;
      };
      var ready = window.LF_PORTAL.ready ? window.LF_PORTAL.ready() : Promise.resolve(true);
      ready.then(function (readyOk) {
        if (!isCurrentRun()) return;
        if (readyOk !== true) {
          fail(new Error(TCc('cr_task_state_unavailable')), TCc('cr_task_state_unavailable'));
          return;
        }
        var stage = window.LF_PORTAL.bookCreationStage ? window.LF_PORTAL.bookCreationStage(bookId) : null;
        var decision = phaseRunDecision(stage, k, {
          force: force,
          retry: retry,
          allowCreate: allowCreate
        });
        if (decision === 'unknown') {
          fail(new Error(TCc('cr_task_state_unavailable')), TCc('cr_task_state_unavailable'));
          return;
        }
        if (decision === 'done') {
          doneSteps.current.add(stepAtRun);
          delete activeRuns.current[stepAtRun];
          applyPhaseView(stepAtRun, {
            done: true,
            filled: total,
            error: null,
            running: false,
            engineDone: true
          });
          return;
        }
        if (decision === 'failed') {
          fail(stage.phases && stage.phases[k] && stage.phases[k].latestTask);
          return;
        }
        /* 另一个阶段已有活动任务时，刷新保存的旧步骤不得抢先新建任务；
           恢复 effect 会把界面切到 stage.activeStep。 */
        if (decision === 'wait') {
          delete activeRuns.current[stepAtRun];
          applyPhaseView(stepAtRun, {
            running: false,
            error: null
          });
          return;
        }
        if (decision === 'attach') {
          if (window.LF_PORTAL.attachPhase) {
            return window.LF_PORTAL.attachPhase(bookId, k, {
              onTask: onTask,
              onProgress: onProgress
            }).then(function (task) {
              if (!task && isCurrentRun() && allowCreate) return window.LF_PORTAL.runPhase(bookId, k, {
                payload: taskPayload(),
                onTask: onTask,
                onProgress: onProgress
              });
              if (!task && isCurrentRun()) fail(new Error(TCc('cr_resume_task_missing')), TCc('cr_resume_task_missing'));
            });
          }
          fail(new Error(TCc('cr_gen_unavailable')), TCc('cr_gen_unavailable'));
          return;
        }
        if (decision === 'resume_missing') {
          fail(new Error(TCc('cr_resume_task_missing')), TCc('cr_resume_task_missing'));
          return;
        }
        return window.LF_PORTAL.runPhase(bookId, k, {
          payload: taskPayload(),
          onTask: onTask,
          onProgress: onProgress
        }).catch(function (err) {
          if (k !== 'cast' || !castReplacementRequired(err)) throw err;
          return resolveExistingCast(bookId, stage).then(function (adopted) {
            if (!isCurrentRun()) return;
            if (adopted) {
              doneSteps.current.add(stepAtRun);
              delete activeRuns.current[stepAtRun];
              applyPhaseView(stepAtRun, {
                done: true,
                filled: genTotal('cast'),
                error: null,
                running: false,
                engineDone: true
              });
              return;
            }
            const message = TCc('cr_cast_exists').replace('{n}', castReplacementCount(err));
            fail(new Error(message), message);
          });
        });
      }).catch(function (err) {
        fail(err);
      });
      return;
    }
    fail(new Error(TCc('cr_gen_unavailable')));
  };
  /* Entering a generation step may start or attach its task. Engine admission
     recovery must not replay this effect: recovery only refreshes resources,
     and a new generation remains tied to an explicit navigation/retry action. */
  uE(() => {
    if (window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED()) return;
    const allowCreate = startIntents.current.delete(s.step);
    const k = GEN[s.step];
    if (k) runGen(genTotal(k), false, false, allowCreate);else if (s.step === 4) runGen(VOL_SECTIONS, false, false, allowCreate);
  }, [s.step]);
  uE(() => {
    if ((GEN[s.step] || s.step === 4) && s.done && s.mode === 'auto') {
      const t = setTimeout(() => {
        startIntents.current.add(s.step + 1);
        showStep(s.step + 1);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [s.step, s.done, s.mode]);
  /* 故事规划分步假加载：引擎一次性返回全部维度，这里按维度逐个点亮，间隔 0.8–1.9s 带
     随机性；只有真实任务完成后最后一维才会置 done。 */
  uE(() => {
    if (s.step !== 3 || s.done || s.error || doneSteps.current.has(3)) return;
    const view = phaseViews.current[3] || blankPhaseView();
    if (!view.dataReady && !s.engineDone) return;
    const total = (Dc.create.story || []).length;
    if (!total) return; // 等数据到达
    if (s.filled >= total) {
      if (!s.engineDone) return;
      const t = setTimeout(() => {
        doneSteps.current.add(3);
        applyPhaseView(3, {
          done: true,
          running: false,
          error: null
        });
      }, 520);
      return () => clearTimeout(t);
    }
    const delay = 800 + Math.random() * 1100;
    const t = setTimeout(() => applyPhaseView(3, x => ({
      filled: Math.min(total, x.filled + 1)
    })), delay);
    return () => clearTimeout(t);
  }, [s.step, s.done, s.error, s.engineDone, s.filled, Dc.create.story.length]);
  const next = () => {
    if (requiresPremise(s)) {
      const title = Lc({
        zh: '请先填写立意',
        en: 'Premise required'
      });
      const message = Lc({
        zh: '请至少填写一句故事立意，再开始铸造世界。',
        en: 'Enter at least one sentence of your story premise before forging the world.'
      });
      const dialog = window.LF_ERROR ? window.LF_ERROR(message, {
        title
      }) : Promise.resolve(window.alert(message));
      Promise.resolve(dialog).then(() => {
        const input = document.getElementById('cr-premise-input');
        if (input) input.focus();
      });
      return;
    }
    if (s.step < 5) {
      startIntents.current.add(s.step + 1);
      showStep(s.step + 1);
    } else {
      clearProgress();
      onDone();
    }
  };
  const back = () => {
    if (s.step > 0) showStep(s.step - 1);else {
      clearProgress();
      onClose();
    }
  };
  const steps = [TCc('cr_step1'), TCc('cr_step_world'), TCc('cr_step_cast'), TCc('cr_step_story'), TCc('cr_step_vol'), TCc('cr_step3')];
  const isGen = !!GEN[s.step],
    isVol = s.step === 4;
  const rerollDialog = rerollConfirmation(s.step, s.outlineVolume, Dc.chapters, Dc.create.cast.length);
  const nextLabel = s.step === 0 ? TCc('cr_forge') : s.step === 5 ? TCc('cr_enter') : (isGen || isVol) && s.mode === 'copilot' ? TCc('cr_approve_next') : TCc('cr_next');
  const generationBlocked = !!(window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED());
  const canNext = !((isGen || isVol) && !s.done) && !(s.step === 0 && generationBlocked);
  const retryGeneration = () => {
    /* 已有角色时重试等同整组覆盖：必须先经覆盖确认，确认后走重新抽卡。 */
    if (GEN[s.step] === 'cast' && Dc.create.cast.length > 0) {
      set({
        rerollWarn: true
      });
      return;
    }
    if (isGen) runGen(genTotal(GEN[s.step]), false, true, true);else if (isVol) runGen(VOL_SECTIONS, false, true, true, s.outlineVolume);
  };
  /* 重新抽卡：先清掉本阶段已缓存的生成结果（否则旧卡片会残留在新结果之上），再强制重发 */
  const doReroll = () => {
    set({
      rerollWarn: false
    });
    const k = GEN[s.step] || (s.step === 4 ? 'outline' : null);
    if (window.LF_PORTAL && window.LF_PORTAL.clearPhaseData && k && k !== 'outline') window.LF_PORTAL.clearPhaseData(k);
    if (GEN[s.step]) runGen(genTotal(GEN[s.step]), true, false, true);else if (s.step === 4) runGen(VOL_SECTIONS, true, false, true, s.outlineVolume);
  };
  const generateOutlineVolume = volumeNumber => runGen(VOL_SECTIONS, true, false, true, volumeNumber);
  const historyRestored = async (phase, config) => {
    if (window.LF_PORTAL && window.LF_PORTAL.fetchCreatePhaseResult && phase) {
      await window.LF_PORTAL.fetchCreatePhaseResult(bookIdRef.current, phase, config && config.volumeNumber != null ? {
        volumeNumber: config.volumeNumber
      } : undefined);
    }
    setHistoryRefresh(value => value + 1);
    if (window.LF_RERENDER) window.LF_RERENDER();
  };
  const phone = window.useMobileLayout ? window.useMobileLayout() : false;
  const phoneReroll = phone && (isGen || isVol) && s.done;
  return /*#__PURE__*/React.createElement("div", {
    className: 'cr-shell' + (phone && s.mDetail != null && isGen ? ' is-phone-detail' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-brand"
  }, /*#__PURE__*/React.createElement("span", {
    className: "logo",
    style: {
      cursor: 'pointer'
    },
    onClick: () => {
      (window.LFNav || (u => window.location.href = u))('../site/home.html');
    },
    title: ctl.lang === 'en' ? 'Back to home' : '返回首页'
  }, "\u7B14"), /*#__PURE__*/React.createElement("span", {
    className: "cr-brandt"
  }, ctl.lang === 'en' ? 'Forge a world' : '铸造一个世界')), /*#__PURE__*/React.createElement("div", {
    className: "cr-phone-steps"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-phone-steps-label"
  }, s.step + 1 + ' / ' + steps.length + ' · ' + steps[s.step]), /*#__PURE__*/React.createElement("span", {
    className: "cr-phone-steps-bar",
    "aria-hidden": "true"
  }, steps.map((t, i) => /*#__PURE__*/React.createElement("i", {
    key: i,
    className: i <= s.step ? 'on' : ''
  })))), /*#__PURE__*/React.createElement("div", {
    className: "cr-steps"
  }, steps.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'cr-stepi' + (i === s.step ? ' on' : '') + (i < s.step ? ' done' : '')
  }, /*#__PURE__*/React.createElement("span", {
    className: "cs-no"
  }, i < s.step ? '✓' : i + 1), /*#__PURE__*/React.createElement("span", {
    className: "cs-t"
  }, t), i < 5 && /*#__PURE__*/React.createElement("span", {
    className: "cs-bar"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "cr-topr"
  }, phoneReroll && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "cr-phone-reroll",
    onClick: () => set({
      rerollWarn: true
    }),
    disabled: generationBlocked
  }, TCc('cr_reroll')), /*#__PURE__*/React.createElement(LangSeg, {
    lang: ctl.lang,
    setLang: ctl.setLang
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-ic",
    style: {
      width: 32,
      height: 32
    },
    "aria-label": ctl.lang === 'en' ? 'Close book creation' : '关闭新建书籍',
    onClick: () => {
      clearProgress();
      onClose();
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6L6 18M6 6l12 12"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "cr-bodyw"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-scene",
    key: s.step
  }, (isGen || isVol) && s.error && /*#__PURE__*/React.createElement("div", {
    className: "cr-runerror",
    role: "alert"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, TCc('cr_gen_failed')), /*#__PURE__*/React.createElement("span", null, s.error)), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: retryGeneration,
    disabled: generationBlocked
  }, TCc('cr_gen_retry'))), s.step === 0 && /*#__PURE__*/React.createElement(PremiseStep, {
    s: s,
    set: set
  }), isGen && (GEN[s.step] === 'cast' ? /*#__PURE__*/React.createElement(CastPhase, {
    key: 'cast:' + historyRefresh,
    s: s,
    set: set,
    doReroll: doReroll,
    bookId: bookIdRef.current,
    onHistory: setHistory
  }) : /*#__PURE__*/React.createElement(GenPhase, {
    key: GEN[s.step] + ':' + historyRefresh,
    kind: GEN[s.step],
    phaseIndex: s.step - 1,
    s: s,
    set: set,
    doReroll: doReroll,
    bookId: bookIdRef.current,
    onHistory: setHistory
  })), isVol && /*#__PURE__*/React.createElement(VolumeOutlineStep, {
    key: 'outline:' + historyRefresh,
    s: s,
    set: set,
    bookId: bookIdRef.current,
    onHistory: setHistory,
    onGenerateVolume: generateOutlineVolume,
    activeVolume: s.outlineVolume,
    refreshToken: historyRefresh
  }), s.step === 5 && /*#__PURE__*/React.createElement(ReadyStep, {
    s: s
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cr-nav"
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn",
    onClick: back
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 14
  }), s.step === 0 ? TCc('cr_close') : TCc('cr_back')), /*#__PURE__*/React.createElement("div", {
    className: "cr-navmid"
  }, s.step === 0 && /*#__PURE__*/React.createElement("span", {
    className: "cr-modetag"
  }, s.mode === 'auto' ? TCc('cr_autorun') : TCc('cr_review'), s.mode === 'auto' ? ' · ' + s.autoChapters + TCc('cr_chap_unit') : ''), isGen && /*#__PURE__*/React.createElement("span", {
    className: "cr-modetag"
  }, TCc('cr_phase_of').replace('{i}', s.step), s.mode === 'auto' ? ' · ' + TCc('cr_autorun') : ''), isVol && /*#__PURE__*/React.createElement("span", {
    className: "cr-modetag"
  }, TCc('cr_step_vol'), s.mode === 'auto' ? ' · ' + TCc('cr_autorun') : '')), /*#__PURE__*/React.createElement("button", {
    className: 'c-btn ' + (canNext ? 'gold' : ''),
    disabled: !canNext,
    style: canNext ? {} : {
      opacity: .5,
      cursor: 'not-allowed'
    },
    onClick: () => canNext && next()
  }, nextLabel, /*#__PURE__*/React.createElement(Icon, {
    n: "run",
    s: 13,
    w: 2
  }))), /*#__PURE__*/React.createElement(ConfirmDialog, {
    open: !!s.rerollWarn,
    title: rerollDialog.title,
    message: rerollDialog.message,
    cancelLabel: TCc('cr_cancel'),
    confirmLabel: TCc('cr_reroll_ok'),
    confirmDisabled: generationBlocked,
    tone: "danger",
    icon: "bolt",
    onClose: () => set({
      rerollWarn: false
    }),
    onConfirm: doReroll
  }, rerollDialog.hasProse && /*#__PURE__*/React.createElement("div", {
    className: "cr-reroll-risk"
  }, rerollDialog.rows.map((row, index) => /*#__PURE__*/React.createElement("div", {
    key: index
  }, /*#__PURE__*/React.createElement("strong", null, row[0]), /*#__PURE__*/React.createElement("span", null, row[1]))))), history && /*#__PURE__*/React.createElement(CreateRevisionHistory, {
    bookId: bookIdRef.current,
    config: history,
    onClose: () => setHistory(null),
    onRestored: historyRestored
  }));
}
window.CreateFlow = CreateFlow;
}
