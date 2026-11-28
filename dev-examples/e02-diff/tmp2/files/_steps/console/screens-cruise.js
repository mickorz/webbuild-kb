{
/* ===== 笔枢 · 巡航工作台（自动 / 批量模式 · 驾驶舱）===== */
/* 方案 A：生产流水线时间线 + 待审车道 + 世界状态机实时流。架在精修之上的编排层。 */
const D = window.CONSOLE_DATA,
  L = window.L,
  TC = window.TC;
const {
  useState: cUseState,
  useEffect: cUseEffect,
  useRef: cUseRef
} = React;

/* 本模块自带 zh/en 文案（结构强制两边都有），与 TC 同构 */
const CR_DICT = {
  zh: {
    mode_edit: '精修',
    mode_cruise: '巡航',
    running: '巡航中',
    paused: '已暂停',
    preparing: '准备中',
    btn_pause: '暂停',
    btn_resume: '继续巡航',
    guard: '护栏',
    worldtime: '世界时间',
    cur: '当前',
    chap_unit: '章',
    gen_this: '本次已生成',
    queue_lbl: '队列',
    autonomy: '自治',
    crumb: '巡航编排',
    g_fore: '未结伏笔',
    g_debt: '未结债务',
    g_tension: '张力达标',
    g_consist: '世界一致性',
    g_prog: '本卷进度',
    g_nocon: '无冲突',
    g_open: '未结',
    cfg_btn: '巡航配置',
    // 巡航配置（精简版）
    cfg2_t: '巡航配置 · 启动前设定',
    cfg2_sub: '设一次，自动写一片',
    cfg_scope: '范围',
    scope_vol: '写完本卷',
    scope_to: '写完至第',
    scope_to_unit: '卷',
    scope_more: '续写',
    scope_more_unit: '章',
    cfg_polish: '润色',
    polish_on: '开启',
    polish_off: '关闭',
    polish_hint: '每章成文后自动润色',
    cfg_budget2: '预算',
    budget_none: '不限',
    budget_cap: '指定',
    budget_unit: '¥',
    cfg_writer: '写手',
    writer_single: '单写手',
    writer_muti: '写手群',
    writer_hint: '写手群多智能体协作，单写手更省',
    cfg_cost: '预计花费',
    cost_per: '每章',
    cost_total: '合计',
    cost_unit: '笔力',
    cost_balance: '余额',
    cost_chaps: '章',
    cost_insufficient: '余额不足',
    cost_calc: '计算中…',
    cost_outline: '含最多 {n} 次卷纲规划 · {cost} 笔力',
    pause_confirm_t: '确认暂停巡航？',
    pause_confirm_b: '已发送到引擎的当前章会继续写完并入库，暂停只会停下后续章节。',
    pause_confirm_ok: '暂停',
    pause_confirm_cancel: '继续巡航',
    cruise_start: '开始巡航',
    cruise_running: '巡航进行中…',
    cruise_stop: '停止巡航',
    cruise_done: '巡航完成 ✓',
    other_book_cruise: '《{book}》正在巡航，请先切回该作品处理。',
    track_t: '生产流水线 · 张力曲线',
    track_flow: '排队 → 推演 → 成文 → 待审 → 落库',
    track_hint: '点击任一章，查看该章结束时的世界状态',
    lane_t: '待审车道 · 巡航停下来问你',
    view: '查看',
    review: '审阅',
    rerun: '退回重跑',
    reject: '退回',
    lane_expand: '展开',
    lane_collapse: '收起',
    lane_dock: '待审车道',
    spark_band: '护栏区 60–85',
    spark_hi: '高',
    spark_lo: '低',
    feed_t: '世界状态机 · 实时',
    feed_per: '每章推进',
    feed_sum: '本章 → 下章 推演摘要',
    st_queue: '排队',
    st_run: '推演 / 成文中',
    st_review: '待审',
    st_done: '已落库',
    st_stop: '红线',
    feed_force: '势力',
    feed_under: '暗线',
    feed_oncam: '镜头内',
    feed_offcam: '镜头外',
    feed_shift: '格局',
    feed_empty: '本章世界状态待推演',
    feed_ch: '第 {n} 章',
    deep_toast: '已切到精修 · 第 {n} 章',
    resume_toast: '巡航继续 · 从第 143 章起',
    pause_toast: '已暂停 · 当前章生成完即停',
    guard_saved: '护栏已更新 · 对后续章节即时生效',
    auto_tight: '紧',
    auto_bal: '平衡',
    auto_loose: '松',
    cfg_t: '巡航护栏 · 启动前配置',
    cfg_sub: '给整段批量生成立规矩 —— 设一次，跑一片',
    p_loose: '放养',
    p_bal: '平衡',
    p_strict: '严格',
    c1: '范围 · 推进',
    c1_sub: '写哪些 / 写多深',
    c1_range: '章节范围',
    c1_depth: '生成深度',
    c1_lead: '领先量',
    c1_lead_unit: '章',
    c2: '护栏 · 写成什么样',
    c2_sub: '复用现有字段',
    c2_words: '每章字数',
    c2_tension: '张力区间',
    c2_tension_v: '守 60–85',
    c2_hook: '章末留钩',
    c2_hook_v: '每章必须',
    c2_climax: '高潮节奏',
    c2_climax_pre: '每',
    c2_climax_post: '章一峰',
    c3: '账本规则',
    c3_sub: '护城河 · 伏笔/债务',
    c3_fore: '未结伏笔上限',
    c3_fore_v: '≤ 8 条',
    c3_debt: '债务回收',
    c3_debt_v: '12 章内',
    c3_presence: '人物在场',
    c3_consist: '世界一致性硬校验',
    c4: '停下来问我',
    c4_sub: '方向盘 · 最关键',
    c4_autonomy: '自治档位',
    c4_triggers: '必审触发',
    c5: '审批策略 · 预算',
    c5_sub: '怎么落库 / 花多少',
    c5_commit: '落库方式',
    c5_model: '模型档位',
    c5_concur: '并发章数',
    c5_budget: '花费上限',
    cfg_start: '开始巡航',
    cfg_done: '规矩立好后',
    cfg_note: '随时可在巡航条点「护栏」回到此处微调，改动对后续章节即时生效。',
    close: '收起'
  },
  en: {
    mode_edit: 'Refine',
    mode_cruise: 'Cruise',
    running: 'Cruising',
    paused: 'Paused',
    preparing: 'Preparing',
    btn_pause: 'Pause',
    btn_resume: 'Resume',
    guard: 'Guardrails',
    worldtime: 'World time',
    cur: 'Now',
    chap_unit: 'ch.',
    gen_this: 'Generated',
    queue_lbl: 'queued',
    autonomy: 'Autonomy',
    crumb: 'Cruise pipeline',
    g_fore: 'Open setups',
    g_debt: 'Open debts',
    g_tension: 'Tension on-target',
    g_consist: 'World consistency',
    g_prog: 'Volume progress',
    g_nocon: 'no conflict',
    g_open: 'open',
    cfg_btn: 'Cruise config',
    cfg2_t: 'Cruise config · setup',
    cfg2_sub: 'Set once, auto-write a stretch',
    cfg_scope: 'Scope',
    scope_vol: 'Finish this volume',
    scope_to: 'Finish through vol.',
    scope_to_unit: '',
    scope_more: 'Write',
    scope_more_unit: 'ch',
    cfg_polish: 'Polish',
    polish_on: 'On',
    polish_off: 'Off',
    polish_hint: 'Auto-polish each chapter after drafting',
    cfg_budget2: 'Budget',
    budget_none: 'Unlimited',
    budget_cap: 'Capped',
    budget_unit: '$',
    cfg_writer: 'Writer',
    writer_single: 'Solo',
    writer_muti: 'Writer group',
    writer_hint: 'A writer group collaborates as multiple agents; solo is cheaper',
    cfg_cost: 'Estimated cost',
    cost_per: 'per ch.',
    cost_total: 'total',
    cost_unit: '笔力',
    cost_balance: 'Balance',
    cost_chaps: 'ch.',
    cost_insufficient: 'Insufficient balance',
    cost_calc: 'Calculating…',
    cost_outline: 'Includes up to {n} volume plans · {cost} 笔力',
    pause_confirm_t: 'Pause the cruise?',
    pause_confirm_b: 'The current chapter already sent to the engine finishes and commits; pausing only holds the chapters after it.',
    pause_confirm_ok: 'Pause',
    pause_confirm_cancel: 'Keep cruising',
    cruise_start: 'Start cruise',
    cruise_running: 'Cruising…',
    cruise_stop: 'Stop cruise',
    cruise_done: 'Cruise complete ✓',
    other_book_cruise: '“{book}” has the active cruise. Switch back to manage it.',
    track_t: 'Production line · tension curve',
    track_flow: 'queued → deduce → draft → review → committed',
    track_hint: 'Click any chapter to see the world state at its end',
    lane_t: 'Review lane · cruise paused to ask you',
    view: 'View',
    review: 'Review',
    rerun: 'Send back',
    reject: 'Reject',
    lane_expand: 'Expand',
    lane_collapse: 'Collapse',
    lane_dock: 'Review lane',
    spark_band: 'guard 60–85',
    spark_hi: 'hi',
    spark_lo: 'lo',
    feed_t: 'World State Machine · live',
    feed_per: 'advances each chapter',
    feed_sum: 'this → next deduction',
    st_queue: 'queued',
    st_run: 'deducing / drafting',
    st_review: 'review',
    st_done: 'committed',
    st_stop: 'red line',
    feed_force: 'Force',
    feed_under: 'Undercurrent',
    feed_oncam: 'On-camera',
    feed_offcam: 'Off-camera',
    feed_shift: 'Power shift',
    feed_empty: 'World state pending for this chapter',
    feed_ch: 'ch.{n}',
    deep_toast: 'Switched to Refine · ch.{n}',
    resume_toast: 'Cruise resumed · from ch.143',
    pause_toast: 'Paused · stops after the current chapter',
    guard_saved: 'Guardrails updated · effective for upcoming chapters',
    auto_tight: 'Tight',
    auto_bal: 'Balanced',
    auto_loose: 'Loose',
    cfg_t: 'Cruise guardrails · setup',
    cfg_sub: 'Set the rules once, run a whole stretch',
    p_loose: 'Loose',
    p_bal: 'Balanced',
    p_strict: 'Strict',
    c1: 'Scope · cadence',
    c1_sub: 'what to write / how deep',
    c1_range: 'Chapter range',
    c1_depth: 'Depth',
    c1_lead: 'Lead',
    c1_lead_unit: 'ch',
    c2: 'Guardrails · how it reads',
    c2_sub: 'reuses existing fields',
    c2_words: 'Words/ch',
    c2_tension: 'Tension band',
    c2_tension_v: 'hold 60–85',
    c2_hook: 'End hook',
    c2_hook_v: 'every chapter',
    c2_climax: 'Peak cadence',
    c2_climax_pre: 'a peak every',
    c2_climax_post: 'ch',
    c3: 'Ledger rules',
    c3_sub: 'moat · setups/debts',
    c3_fore: 'Open-setup cap',
    c3_fore_v: '≤ 8',
    c3_debt: 'Debt payoff',
    c3_debt_v: 'within 12 ch',
    c3_presence: 'Cast on-camera',
    c3_consist: 'Hard consistency check',
    c4: 'Stop & ask me',
    c4_sub: 'the wheel · most important',
    c4_autonomy: 'Autonomy',
    c4_triggers: 'Must-review triggers',
    c5: 'Approval · budget',
    c5_sub: 'how to commit / spend',
    c5_commit: 'Commit mode',
    c5_model: 'Model tier',
    c5_concur: 'Concurrency',
    c5_budget: 'Spend cap',
    cfg_start: 'Start cruise',
    cfg_done: 'Once the rules are set',
    cfg_note: 'Reopen “Guardrails” from the cruise bar anytime; changes take effect for upcoming chapters.',
    close: 'Close'
  }
};
const T = k => CR_DICT[window.CLANG === 'en' ? 'en' : 'zh'][k] || k;
function cruiseContinuityMessage(plan, en) {
  if (!plan || !plan.chapter_number) return '';
  const ready = [];
  if (plan.world_state_ready) ready.push(en ? 'world state' : '世界状态');
  if (plan.guide_ready) ready.push(en ? 'chapter outline' : '细纲');
  if (plan.character_state_ready) ready.push(en ? 'character state' : '角色状态');
  if (plan.body_ready) ready.push(en ? 'draft prose' : '正文草稿');
  const next = {
    full: en ? 'chapter generation' : '章节生成',
    outline_director: en ? 'chapter outline' : '细纲',
    character_state: en ? 'character state' : '角色状态',
    writer_group: en ? 'prose' : '正文',
    polish: en ? 'final prose polish' : '正文定稿',
    post_hoc: en ? 'post-chapter updates' : '章后整理'
  }[plan.next_stage] || (en ? 'remaining stages' : '剩余流程');
  if (en) {
    const existing = ready.length ? ' already has ' + ready.join(', ') : ' has an unfinished generation record';
    return 'Chapter ' + plan.chapter_number + existing + ', but ' + next + ' is incomplete. Cruise will finish this chapter first, then continue with later chapters.';
  }
  const existing = ready.length ? '已有' + ready.join('、') : '存在未完成的生成记录';
  return '检测到第 ' + plan.chapter_number + ' 章' + existing + '，但' + next + '尚未完成。巡航会先补完本章剩余流程，再继续后续章节。';
}

/* ---- cruise demo data (derives chapter titles from D.chapters where present) ---- */
const _ct = no => {
  const c = D.chapters.find(x => x.no === no);
  return c ? c.title : {
    zh: '—',
    en: '—'
  };
};
/* CRUISE.lane 仍为占位（审批车道未上线，CruiseLaneDock 暂隐藏）。
   track / feed 已改用真实数据（CruiseTrack 读 D.chapters，CruiseFeed 读 D.wsm）。 */
const CRUISE = {
  lane: [{
    no: 148,
    kind: 'stop',
    tag: {
      zh: '大事 · 必审',
      en: 'major · review'
    },
    title: {
      zh: '感情线推进',
      en: 'Romance advances'
    },
    why: {
      zh: '沈砚向沈惊鸿吐露半截身世，触发「感情线推进」审批。',
      en: 'Shen Yan reveals part of his past to Shen Jinghong — triggers the romance-advance gate.'
    }
  }, {
    no: 146,
    kind: 'review',
    tag: {
      zh: '一致性',
      en: 'consistency'
    },
    title: {
      zh: '「影卫」身份',
      en: 'The “Shadowguard” identity'
    },
    why: {
      zh: '与第 131 章「影卫不识水性」的设定疑似冲突。',
      en: 'Possible conflict with ch.131 (“shadowguards can’t swim”).'
    }
  }]
};

/* ============== small low-fi-but-real controls ============== */
function CrSeg({
  opts,
  value,
  onChange,
  blue
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: 'cr-seg' + (blue ? ' blue' : '')
  }, opts.map((o, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: i === value ? 'on' : '',
    onClick: () => onChange(i)
  }, o)));
}
function CrToggle({
  on,
  onChange
}) {
  return /*#__PURE__*/React.createElement("button", {
    className: 'cr-tgl' + (on ? ' on' : ''),
    onClick: () => onChange(!on),
    "aria-pressed": on
  }, /*#__PURE__*/React.createElement("i", null));
}
function CrSlider({
  pct,
  onChange
}) {
  const ref = cUseRef(null);
  const setFromEvent = e => {
    const r = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width));
    onChange(Math.round(x * 100));
  };
  const down = e => {
    e.preventDefault();
    setFromEvent(e);
    const mv = ev => setFromEvent(ev);
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-sld",
    ref: ref,
    onPointerDown: down
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-sld-fill",
    style: {
      width: pct + '%'
    }
  }), /*#__PURE__*/React.createElement("i", {
    style: {
      left: pct + '%'
    }
  }));
}

/* ============== cruise bar (mode switch + run state + position + throughput) ============== */
function WbModeSwitch({
  mode,
  setMode
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-modeseg"
  }, /*#__PURE__*/React.createElement("button", {
    className: mode === 'edit' ? 'on' : '',
    onClick: () => setMode('edit')
  }, T('mode_edit')), /*#__PURE__*/React.createElement("button", {
    className: mode === 'cruise' ? 'on' : '',
    onClick: () => setMode('cruise')
  }, T('mode_cruise')));
}
window.WbModeSwitch = WbModeSwitch;
function CruiseBar({
  paused,
  onToggle,
  onGuard,
  prog,
  cruising
}) {
  var en = window.CLANG === 'en';
  var chaps = Array.isArray(D.chapters) ? D.chapters : [];
  // 实时数据优先用巡航运行时进度，回退到静态数据
  var doneCnt,
    todoCnt,
    curNo,
    awaitingDispatch = false;
  if (prog && cruising) {
    // cruising=true + prog 有值 → 用 session 数据
    var idx = typeof prog.index === 'number' ? prog.index : -1;
    var total = prog.total || 0;
    awaitingDispatch = idx < 0 || !prog.chapter;
    doneCnt = Math.max(0, idx); // 本次已生成 = 已完成章数
    curNo = prog.chapter || null; // 当前 = 正在生成的章
    todoCnt = awaitingDispatch ? total : Math.max(0, total - idx - 1);
  } else {
    // 未巡航或已结束 → 静态统计
    doneCnt = chaps.filter(function (c) {
      return c && c.state === 'done';
    }).length;
    todoCnt = chaps.filter(function (c) {
      return c && c.state === 'todo';
    }).length;
    curNo = D.prose && D.prose.no || D.detail && D.detail.no || 0;
  }
  var wtime = L(D.wsm && D.wsm.world_time) || '';
  var running = cruising && !paused;
  // Button label: idle → 开始巡航; running → 暂停; paused → 继续巡航.
  var actionLabel = !cruising ? T('cruise_start') : paused ? T('btn_resume') : T('btn_pause');
  var actionIcon = running ? /*#__PURE__*/React.createElement(Icon, {
    n: "clock",
    s: 13
  }) : /*#__PURE__*/React.createElement(Icon, {
    n: "run",
    s: 13,
    w: 2
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: 'cr-state' + (running ? '' : ' paused')
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-play"
  }, running ? /*#__PURE__*/React.createElement(Icon, {
    n: "run",
    s: 11,
    w: 2
  }) : /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 12
  })), running ? T('running') : T('paused')), /*#__PURE__*/React.createElement("div", {
    className: "cr-pos"
  }, wtime && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, T('worldtime')), /*#__PURE__*/React.createElement("b", null, wtime), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "\xB7")), /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, T('cur')), /*#__PURE__*/React.createElement("b", {
    className: "c-latin"
  }, awaitingDispatch ? T('preparing') : en ? 'ch.' + curNo : '第 ' + curNo + ' 章')), /*#__PURE__*/React.createElement("span", {
    className: "cr-throughput"
  }, T('gen_this'), " ", /*#__PURE__*/React.createElement("b", null, doneCnt), " ", T('chap_unit'), " \xB7 ", T('queue_lbl'), " ", /*#__PURE__*/React.createElement("b", null, todoCnt)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), cruising && /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: onGuard
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "scale",
    s: 14
  }), T('cfg_btn')), /*#__PURE__*/React.createElement("button", {
    className: 'c-btn sm' + (running ? '' : ' gold'),
    onClick: onToggle,
    disabled: !cruising && window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED()
  }, actionIcon, actionLabel));
}

/* ============== live guardrail gauges ============== */
function CruiseGauges() {
  const det = D.detail || {};
  // 未结伏笔 / 未结债务：取本章细纲账本中尚未回收的条目
  const isOpen = x => {
    var s = String(x && (x.status || x.state || x.s) || '').toLowerCase();
    return !/(resolved|paid|closed|done|回收|已结|已回收|已偿)/.test(s);
  };
  const hooks = Array.isArray(det.hooks) ? det.hooks : Array.isArray(det.foreshadow) ? det.foreshadow : [];
  const debts = Array.isArray(det.debt_ledger) && det.debt_ledger.length ? det.debt_ledger : Array.isArray(det.debts) ? det.debts : [];
  const openHooks = hooks.filter(isOpen).length;
  const openDebts = debts.filter(isOpen).length;
  // 本卷进度：本卷已落库章数 / 本卷章数
  const chaps = Array.isArray(D.chapters) ? D.chapters : [];
  const vol = (D.volumes || []).find(v => v.state === 'active') || (D.volumes || [])[0];
  const inVol = vol && Array.isArray(vol.range_nos) ? chaps.filter(c => vol.range_nos.includes(c.no)) : chaps;
  const volTotal = inVol.length || chaps.length || 1;
  const volDone = inVol.filter(c => c && c.state === 'done').length;
  const g = [{
    k: T('g_fore'),
    v: openHooks + ' ' + T('g_open'),
    tone: 'ok',
    pct: Math.min(100, openHooks * 14),
    dot: 'review'
  }, {
    k: T('g_debt'),
    v: openDebts + ' ' + T('g_open'),
    tone: openDebts > 6 ? 'warn' : 'ok',
    pct: Math.min(100, openDebts * 14),
    dot: 'review'
  }, {
    k: T('g_tension'),
    v: '100%',
    tone: 'ok',
    pct: 100,
    dot: 'done'
  }, {
    k: T('g_consist'),
    v: '✓ ' + T('g_nocon'),
    tone: 'ok',
    pct: 100,
    dot: 'done'
  }, {
    k: T('g_prog'),
    v: volDone + ' / ' + volTotal,
    tone: 'ok',
    pct: Math.round(volDone / volTotal * 100),
    dot: 'run'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-gauges"
  }, g.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'cr-gauge ' + x.tone
  }, /*#__PURE__*/React.createElement("span", {
    className: "gk"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'cr-sdot ' + x.dot
  }), x.k), /*#__PURE__*/React.createElement("span", {
    className: "gv c-latin"
  }, x.v), /*#__PURE__*/React.createElement("span", {
    className: "gbar"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: x.pct + '%'
    }
  })))));
}

/* smooth a polyline into a Catmull-Rom → cubic-bezier SVG path */
function crSmooth(p) {
  if (p.length < 2) return p.length ? `M ${p[0][0]} ${p[0][1]}` : '';
  const f = (a, b) => `${(+a).toFixed(2)} ${(+b).toFixed(2)}`;
  let d = `M ${f(p[0][0], p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i],
      p1 = p[i],
      p2 = p[i + 1],
      p3 = p[i + 2] || p[i + 1];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6,
      c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6,
      c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${f(c1x, c1y)}, ${f(c2x, c2y)}, ${f(p2[0], p2[1])}`;
  }
  return d;
}

/* ============== production-line track + tension sparkline ============== */
function CruiseTrack({
  onPick
}) {
  // 真实数据：章节窗口取自 D.chapters，张力值读取各章细纲缓存（lf_tension_{book}）。
  const allChaps = (Array.isArray(D.chapters) ? D.chapters : []).slice().sort((a, b) => a.no - b.no);
  let tmap = {};
  try {
    tmap = JSON.parse(localStorage.getItem('lf_tension_' + (D.book && D.book.id || '')) || '{}');
  } catch (e) {}
  const curNo = D.prose && D.prose.no || D.detail && D.detail.no || 0;
  if (curNo && D.detail && Number(D.detail.tension) > 0) tmap[curNo] = Number(D.detail.tension);
  let win = allChaps;
  if (allChaps.length > 11) {
    let ci = allChaps.findIndex(c => c.no === curNo);
    if (ci < 0) ci = allChaps.length - 1;
    let start = Math.max(0, Math.min(ci - 5, allChaps.length - 11));
    win = allChaps.slice(start, start + 11);
  }
  const stMap = {
    done: 'done',
    writing: 'run',
    todo: 'queue'
  };
  const tr = win.map(c => ({
    no: c.no,
    st: stMap[c.state] || 'queue',
    t: Math.max(46, Math.min(88, tmap[c.no] || 68)),
    cur: c.no === curNo
  }));
  const n = tr.length;
  if (!n) return /*#__PURE__*/React.createElement("div", {
    className: "cr-track-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-secrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-seclab"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "peak",
    s: 14
  }), T('track_t'))), /*#__PURE__*/React.createElement("div", {
    className: "cr-track-hint"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "pen",
    s: 12
  }), T('track_hint')));
  const lo = 46,
    hi = 88,
    padT = 16,
    padB = 22; // normalized 0..100 chart box
  const nx = i => (i + 0.5) / n * 100;
  const ny = t => padT + (1 - (Math.max(lo, Math.min(hi, t)) - lo) / (hi - lo)) * (100 - padT - padB);
  const pts = tr.map((c, i) => [nx(i), ny(c.t)]);
  const line = crSmooth(pts);
  const area = line + ` L ${nx(n - 1).toFixed(2)} 100 L ${nx(0).toFixed(2)} 100 Z`;
  const bandTop = ny(85),
    bandBot = ny(60);
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-track-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-secrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-seclab"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "peak",
    s: 14
  }), T('track_t')), /*#__PURE__*/React.createElement("span", {
    className: "cr-flow"
  }, T('track_flow'))), /*#__PURE__*/React.createElement("div", {
    className: "cr-spark"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-spark-axis hi"
  }, T('spark_hi')), /*#__PURE__*/React.createElement("span", {
    className: "cr-spark-axis lo"
  }, T('spark_lo')), /*#__PURE__*/React.createElement("svg", {
    className: "cr-spark-svg",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "crGrad",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "var(--gold)",
    stopOpacity: "0.26"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "var(--gold)",
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: bandTop.toFixed(2),
    width: "100",
    height: (bandBot - bandTop).toFixed(2),
    fill: "var(--gold)",
    opacity: "0.07"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: bandTop.toFixed(2),
    x2: "100",
    y2: bandTop.toFixed(2),
    stroke: "var(--gold)",
    strokeWidth: "1",
    strokeDasharray: "2 3",
    opacity: "0.4",
    vectorEffect: "non-scaling-stroke"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: bandBot.toFixed(2),
    x2: "100",
    y2: bandBot.toFixed(2),
    stroke: "var(--gold)",
    strokeWidth: "1",
    strokeDasharray: "2 3",
    opacity: "0.4",
    vectorEffect: "non-scaling-stroke"
  }), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: "url(#crGrad)"
  }), /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    stroke: "var(--gold-deep)",
    strokeWidth: "2.25",
    strokeLinejoin: "round",
    strokeLinecap: "round",
    vectorEffect: "non-scaling-stroke"
  })), /*#__PURE__*/React.createElement("span", {
    className: "cr-spark-band"
  }, T('spark_band')), /*#__PURE__*/React.createElement("div", {
    className: "cr-spark-dots"
  }, tr.map((c, i) => /*#__PURE__*/React.createElement("span", {
    key: c.no,
    className: 'cr-spark-dot ' + c.st + (c.cur ? ' cur' : ''),
    style: {
      left: nx(i) + '%',
      top: ny(c.t) + '%'
    }
  }, c.cur && /*#__PURE__*/React.createElement("b", {
    className: "c-latin"
  }, c.t))))), /*#__PURE__*/React.createElement("div", {
    className: "cr-track"
  }, tr.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.no,
    className: 'cr-chip' + (c.cur ? ' cur' : ''),
    onClick: () => onPick(c.no),
    title: L(_ct(c.no))
  }, /*#__PURE__*/React.createElement("span", {
    className: "cno c-latin"
  }, c.no), /*#__PURE__*/React.createElement("span", {
    className: 'cbar ' + c.st
  }), /*#__PURE__*/React.createElement("span", {
    className: "cmk"
  }, c.st === 'stop' ? '⚑' : c.cur ? '◉' : '\u00A0')))), /*#__PURE__*/React.createElement("div", {
    className: "cr-track-hint"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "pen",
    s: 12
  }), T('track_hint')));
}

/* ============== review lane · docked at the bottom, collapsible ============== */
function CruiseLaneDock({
  open,
  onToggle,
  onOpen
}) {
  const cnt = CRUISE.lane.length;
  return /*#__PURE__*/React.createElement("div", {
    className: 'cr-lanedock' + (open ? ' open' : '')
  }, /*#__PURE__*/React.createElement("button", {
    className: "cr-lanedock-h",
    onClick: onToggle,
    title: open ? T('lane_collapse') : T('lane_expand')
  }, /*#__PURE__*/React.createElement("span", {
    className: "ld-caret"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "caret",
    s: 13,
    w: 2
  })), /*#__PURE__*/React.createElement(Icon, {
    n: "bolt",
    s: 13
  }), /*#__PURE__*/React.createElement("b", null, T('lane_t')), /*#__PURE__*/React.createElement("span", {
    className: "cnt"
  }, cnt), /*#__PURE__*/React.createElement("span", {
    className: "ld-spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "ld-hint"
  }, open ? T('lane_collapse') : T('lane_expand'))), /*#__PURE__*/React.createElement("div", {
    className: "cr-lanedock-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-lanedock-rows"
  }, CRUISE.lane.map(item => /*#__PURE__*/React.createElement("div", {
    key: item.no,
    className: "cr-lane-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lr-no c-latin"
  }, item.no), /*#__PURE__*/React.createElement("div", {
    className: "lr-mid"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lr-title"
  }, L(item.title)), /*#__PURE__*/React.createElement("span", {
    className: "lr-why"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'lr-tag ' + item.kind
  }, L(item.tag)), L(item.why))), /*#__PURE__*/React.createElement("div", {
    className: "lr-act"
  }, /*#__PURE__*/React.createElement("button", {
    className: "cr-mini go",
    onClick: () => onOpen(item.no)
  }, T('review')), /*#__PURE__*/React.createElement("button", {
    className: "cr-mini"
  }, T('reject'))))))));
}

/* ============== world state machine live feed (right rail) ============== */
/* 真实数据：从 D.wsm（势力/暗线/镜头内外/格局）派生条目。空数据走骨架提示，
   绝不白屏。wsmChap 表示当前展示的是哪一章的世界状态（点击张力点动态切换）。 */
function CruiseFeed({
  paused,
  wsmChap
}) {
  const w = D.wsm && typeof D.wsm === 'object' ? D.wsm : {};
  const rows = [];
  // forces / undercurrents：状态机推演出的势力与暗线，status 映射到流光色点。
  const stDot = s => {
    var v = String(s || '').toLowerCase();
    return /(close|done|收束|已结|落库)/.test(v) ? 'done' : /(review|审|迷雾|fog)/.test(v) ? 'review' : /(queue|排队|隐现)/.test(v) ? 'queue' : 'run';
  };
  (Array.isArray(w.forces) ? w.forces : []).forEach(f => {
    var nm = L(f && f.name);
    if (!nm) return;
    rows.push({
      st: stDot(f && f.status),
      label: T('feed_force'),
      text: nm,
      status: L(f && f.status)
    });
  });
  (Array.isArray(w.undercurrents) ? w.undercurrents : []).forEach(u => {
    var nm = L(u && u.name);
    if (!nm) return;
    rows.push({
      st: stDot(u && u.status),
      label: T('feed_under'),
      text: nm,
      status: L(u && u.status)
    });
  });
  (Array.isArray(w.on_camera) ? w.on_camera : []).forEach(e => {
    var t = L(e);
    if (t) rows.push({
      st: 'run',
      label: T('feed_oncam'),
      text: t
    });
  });
  (Array.isArray(w.off_camera) ? w.off_camera : []).forEach(e => {
    var t = L(e);
    if (t) rows.push({
      st: 'review',
      label: T('feed_offcam'),
      text: t
    });
  });
  var shift = L(w.power_shift);
  if (shift) rows.push({
    st: 'queue',
    label: T('feed_shift'),
    text: shift
  });
  var chNo = wsmChap || w && w.no || 0;
  var chTag = chNo ? T('feed_ch').replace('{n}', chNo) : '';
  return /*#__PURE__*/React.createElement("div", {
    className: 'cr-feed' + (paused ? '' : ' live')
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-feed-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "world",
    s: 15
  })), T('feed_t'), chTag && /*#__PURE__*/React.createElement("span", {
    className: "tm c-latin"
  }, chTag)), /*#__PURE__*/React.createElement("div", {
    className: "cr-feed-list"
  }, rows.length ? rows.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "cr-fe"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'fb ' + f.st
  }), /*#__PURE__*/React.createElement("span", {
    className: "ft"
  }, /*#__PURE__*/React.createElement("b", null, f.label), " \xB7 ", f.text, f.status ? /*#__PURE__*/React.createElement(React.Fragment, null, " \u2014 ", f.status) : null))) : /*#__PURE__*/React.createElement("div", {
    className: "cr-fe cr-fe-empty"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fb queue"
  }), /*#__PURE__*/React.createElement("span", {
    className: "ft"
  }, T('feed_empty')))));
}

/* ============== cruise config drawer（精简版：范围 / 写手 / 润色 / 预计花费） ============== */
function CruiseConfig({
  open,
  onClose,
  cfg,
  setCfg,
  toast,
  onStart,
  running,
  bookId
}) {
  const en = window.CLANG === 'en';
  const upd = p => setCfg(c => ({
    ...c,
    ...p
  }));
  const [est, setEst] = cUseState(null); // {per_chapter_millis,total_millis,balance_millis,sufficient,count,breakdown}
  const [estLoading, setEstLoading] = cUseState(false);
  // Re-estimate whenever the drawer is open and any cost-affecting field changes.
  cUseEffect(() => {
    if (!open || !bookId || !window.LF_PORTAL || !window.LF_PORTAL.estimateCruise) {
      setEst(null);
      return;
    }
    let alive = true;
    setEstLoading(true);
    window.LF_PORTAL.estimateCruise(bookId, cfg).then(r => {
      if (alive) {
        setEst(r);
        setEstLoading(false);
      }
    }).catch(() => {
      if (alive) {
        setEst(null);
        setEstLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [open, cfg.scope, cfg.scopeVol, cfg.scopeMore, cfg.polish, cfg.writerType, bookId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  const millis = n => (n / 1000).toFixed(n % 1000 ? 1 : 0);
  const insufficient = est && est.sufficient === false;
  const continuityMessage = cruiseContinuityMessage(est && est.continuity, en);
  return /*#__PURE__*/React.createElement("div", {
    className: "cr-drawer-scrim",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-drawer",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-drawer-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ad"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "scale",
    s: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "ht"
  }, /*#__PURE__*/React.createElement("b", null, T('cfg2_t')), /*#__PURE__*/React.createElement("i", null, T('cfg2_sub'))), /*#__PURE__*/React.createElement("button", {
    className: "edt-x",
    onClick: onClose,
    title: T('close')
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "cr-drawer-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-cfgcard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "no c-latin"
  }, "1"), T('cfg_scope')), /*#__PURE__*/React.createElement("div", {
    className: "cc-row"
  }, /*#__PURE__*/React.createElement(CrSeg, {
    blue: true,
    opts: [T('scope_vol'), T('scope_to') + '…' + T('scope_to_unit'), T('scope_more') + '…' + T('scope_more_unit')],
    value: cfg.scope,
    onChange: i => upd({
      scope: i
    })
  })), cfg.scope === 1 && /*#__PURE__*/React.createElement("div", {
    className: "cc-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cl"
  }, T('scope_to')), /*#__PURE__*/React.createElement(CrSeg, {
    opts: ['2', '3', '4', '5'],
    value: Math.max(0, (cfg.scopeVol || 2) - 2),
    onChange: i => upd({
      scopeVol: i + 2
    })
  }), /*#__PURE__*/React.createElement("span", {
    className: "cv-note"
  }, T('scope_to_unit'))), cfg.scope === 2 && /*#__PURE__*/React.createElement("div", {
    className: "cc-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cl"
  }, T('scope_more')), /*#__PURE__*/React.createElement(CrSeg, {
    opts: ['3', '5', '10', '20'],
    value: [3, 5, 10, 20].indexOf(cfg.scopeMore) < 0 ? 1 : [3, 5, 10, 20].indexOf(cfg.scopeMore),
    onChange: i => upd({
      scopeMore: [3, 5, 10, 20][i]
    })
  }), /*#__PURE__*/React.createElement("span", {
    className: "cv-note"
  }, T('scope_more_unit')))), /*#__PURE__*/React.createElement("div", {
    className: "cr-cfgcard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "no c-latin"
  }, "2"), T('cfg_writer')), /*#__PURE__*/React.createElement("div", {
    className: "cc-row cr-writer-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cl"
  }, T('writer_hint')), /*#__PURE__*/React.createElement(CrSeg, {
    blue: true,
    opts: [T('writer_single'), T('writer_muti')],
    value: cfg.writerType === 'muti' ? 1 : 0,
    onChange: i => upd({
      writerType: i === 1 ? 'muti' : 'single'
    })
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cr-cfgcard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "no c-latin"
  }, "3"), T('cfg_polish')), /*#__PURE__*/React.createElement("div", {
    className: "cc-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cl"
  }, T('polish_hint')), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(CrSeg, {
    opts: [T('polish_off'), T('polish_on')],
    value: cfg.polish ? 1 : 0,
    onChange: i => upd({
      polish: i === 1
    })
  }))), /*#__PURE__*/React.createElement("div", {
    className: 'cr-cfgcard cr-costcard' + (insufficient ? ' insufficient' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-h"
  }, /*#__PURE__*/React.createElement("span", {
    className: "no c-latin"
  }, "4"), T('cfg_cost')), estLoading && !est ? /*#__PURE__*/React.createElement("div", {
    className: "cc-row cr-cost-calc"
  }, T('cost_calc')) : est ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "cc-row cr-cost-main"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cr-cost-total"
  }, /*#__PURE__*/React.createElement("b", {
    className: "c-latin"
  }, millis(est.total_millis)), /*#__PURE__*/React.createElement("span", {
    className: "cr-cost-unit"
  }, T('cost_unit'))), /*#__PURE__*/React.createElement("span", {
    className: "cr-cost-sub c-latin"
  }, est.count, " ", T('cost_chaps'), " \xB7 ", T('cost_per'), " ", millis(est.per_chapter_millis)), est.outline_allowance_count > 0 && est.outline_allowance_millis > 0 && /*#__PURE__*/React.createElement("span", {
    className: "cr-cost-outline"
  }, T('cost_outline').replace('{n}', est.outline_allowance_count).replace('{cost}', millis(est.outline_allowance_millis)))), /*#__PURE__*/React.createElement("div", {
    className: "cc-row cr-cost-bal"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cl"
  }, T('cost_balance')), /*#__PURE__*/React.createElement("span", {
    className: "cv c-latin"
  }, millis(est.balance_millis), " ", T('cost_unit')), insufficient && /*#__PURE__*/React.createElement("span", {
    className: "cr-cost-warn"
  }, T('cost_insufficient')))) : null), /*#__PURE__*/React.createElement("div", {
    className: "cr-cfgcard ghost"
  }, continuityMessage && /*#__PURE__*/React.createElement("p", {
    className: "cr-continuity-note"
  }, continuityMessage), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold",
    style: {
      alignSelf: 'flex-start'
    },
    disabled: running || insufficient || window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED(),
    onClick: () => {
      onClose();
      onStart && onStart();
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "run",
    s: 14,
    w: 2
  }), running ? T('cruise_running') : T('cruise_start')), /*#__PURE__*/React.createElement("p", null, T('cfg_note'))))));
}

/* ============== cruise view (composes the cockpit) ============== */
/* 巡航配置（精简版）：范围 / 润色 / 预算 */
const CRUISE_CFG_DEFAULT = {
  scope: 0,
  scopeVol: 2,
  scopeMore: 5,
  polish: true,
  writerType: 'muti'
};
function CruiseView({
  state,
  set,
  ctl,
  toast
}) {
  const en = window.CLANG === 'en';
  const [paused, setPaused] = cUseState(false);
  const [guard, setGuard] = cUseState(false);
  const [laneOpen, setLaneOpen] = cUseState(() => {
    try {
      return localStorage.getItem('lf_cruise_lane') !== '0';
    } catch (e) {
      return true;
    }
  });
  const toggleLane = () => setLaneOpen(o => {
    const n = !o;
    try {
      localStorage.setItem('lf_cruise_lane', n ? '1' : '0');
    } catch (e) {}
    return n;
  });
  const [cfg, setCfgS] = cUseState(() => {
    try {
      return {
        ...CRUISE_CFG_DEFAULT,
        ...(JSON.parse(localStorage.getItem('lf_cruise_cfg') || 'null') || {})
      };
    } catch (e) {
      return CRUISE_CFG_DEFAULT;
    }
  });
  const setCfg = p => setCfgS(c => {
    const n = typeof p === 'function' ? p(c) : {
      ...c,
      ...p
    };
    try {
      localStorage.setItem('lf_cruise_cfg', JSON.stringify(n));
    } catch (e) {}
    // Keep the app-wide writer toggle in sync so 精修 and 巡航 agree.
    try {
      if (n.writerType) localStorage.setItem('lf_writer_type', n.writerType);
    } catch (e) {}
    return n;
  });
  const [cruising, setCruising] = cUseState(false);
  const [cruiseProg, setCruiseProg] = cUseState(null); // {phase,chapter,index,total,stagePhase,progress}
  const [pauseAsk, setPauseAsk] = cUseState(false); // pause confirm modal
  const bookId = D.book && D.book.id || null;
  const [otherCruise, setOtherCruise] = cUseState(null);
  const otherCruiseTitle = () => {
    var card = (D.shelf || []).find(function (item) {
      return item && String(item.id) === String(otherCruise && otherCruise.bookId);
    });
    return card ? L(card.title) : en ? 'another work' : '另一本作品';
  };
  const showCruiseError = error => {
    if (error && error.code === 'quote_cancelled') return;
    if (window.LF_ERROR && window.LF_ERROR.isBackendError(error)) window.LF_ERROR(error);else toast(TC('rg_fail') || '巡航操作失败');
  };
  // mount 时检查后端是否有活跃巡航会话，自动恢复（含 paused 态）
  cUseEffect(function () {
    var bid = bookId;
    if (!window.LF_PORTAL || !bid) return;
    // alive 守卫 + timer 句柄：组件卸载（切回精修 / 换书）后停止轮询，
    // 否则 poll 会一直每 3s 命中接口并对已卸载组件 setState，反复 mount 还会叠加多个轮询。
    var alive = true,
      pollTimer = null,
      polling = false,
      keepPolling = false;
    var readRevision = 0,
      currentSessionId = null,
      latestUpdatedAt = 0;
    var applyActiveSession = function (s, sourceBookId, controlledId) {
      if (!s) {
        if (controlledId && currentSessionId && String(controlledId) !== String(currentSessionId)) return null;
        currentSessionId = null;
        setOtherCruise(null);
        setCruising(false);
        setPaused(false);
        setCruiseProg(null);
        return false;
      }
      var updatedAt = Date.parse(s.updated_at || '') || 0;
      if (updatedAt && updatedAt < latestUpdatedAt) return null;
      latestUpdatedAt = Math.max(latestUpdatedAt, updatedAt);
      currentSessionId = s.id || currentSessionId;
      var sessionBookId = s.book_id || s.bookId || sourceBookId;
      if (sessionBookId && String(sessionBookId) !== String(bid)) {
        setOtherCruise({
          bookId: sessionBookId,
          status: s.status
        });
        setCruising(false);
        setPaused(false);
        setCruiseProg(null);
        return false;
      }
      setOtherCruise(null);
      if (s.cfg) setCfgS(function (prev) {
        return {
          ...CRUISE_CFG_DEFAULT,
          ...s.cfg
        };
      });
      if (s.status === 'paused') {
        setCruising(true);
        setPaused(true);
        setCruiseProg({
          phase: 'paused',
          chapter: s.current_chapter || s.chapter,
          index: s.current_index != null ? s.current_index : s.currentIndex,
          total: s.total,
          spent: s.spent
        });
        return true;
      }
      if (s.status === 'running') {
        setCruising(true);
        setPaused(false);
        setCruiseProg({
          phase: 'chapter_start',
          chapter: s.current_chapter || s.chapter,
          index: s.current_index != null ? s.current_index : s.currentIndex,
          total: s.total,
          spent: s.spent
        });
        return true;
      }
      setCruising(false);
      setCruiseProg(null);
      setPaused(false);
      if (s.status === 'done') toast(T('cruise_done'));
      return false;
    };
    var poll = async function () {
      if (!alive || polling) return;
      pollTimer = null;
      polling = true;
      var revision = readRevision;
      try {
        var r = await window.LF_API.getActiveCruise();
        if (!alive || revision !== readRevision) return;
        var keep = applyActiveSession(r && r.session);
        if (keep !== null) keepPolling = keep;
      } catch (e) {
        if (!alive) return;
      } finally {
        polling = false;
        if (alive && keepPolling && !pollTimer) pollTimer = setTimeout(poll, 3000);
      }
    };
    var ensurePoll = function () {
      if (!alive || polling || pollTimer) return;
      poll();
    };
    var onAssistantCruise = function (event) {
      if (!alive) return;
      var detail = event && event.detail || {};
      if (String(detail.bookId || '') !== String(bid)) return;
      var keep = applyActiveSession(detail.session, detail.bookId, detail.controlledId);
      if (keep === null) return;
      readRevision += 1;
      keepPolling = keep;
      if (keep) ensurePoll();else if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
    };
    window.addEventListener('lf:assistant-cruise-updated', onAssistantCruise);
    var bootTimer = setTimeout(async function () {
      if (!alive || !window.LF_PORTAL) return;
      var revision = readRevision;
      var session = null;
      try {
        session = await window.LF_PORTAL.cruiseSession();
      } catch (e) {}
      if (!alive || revision !== readRevision) return;
      var keep = applyActiveSession(session && {
        id: session.id,
        updated_at: session.updated_at,
        book_id: session.bookId,
        cfg: session.cfg,
        status: session.status,
        current_chapter: session.chapter,
        current_index: session.currentIndex,
        total: session.total,
        spent: session.spent
      }, session && session.bookId);
      if (keep !== null) keepPolling = keep;
      if (keepPolling) ensurePoll();
    }, 800);
    return function () {
      alive = false;
      clearTimeout(bootTimer);
      clearTimeout(pollTimer);
      window.removeEventListener('lf:assistant-cruise-updated', onAssistantCruise);
    };
  }, [bookId]); // eslint-disable-line react-hooks/exhaustive-deps
  // 巡航编排：按配置依次跑 卷纲 → 完整章节 → 润色 → 后验
  const startCruise = async () => {
    if (!window.LF_PORTAL || !bookId) {
      toast(T('cruise_stop'));
      return;
    }
    if (otherCruise) {
      toast(T('other_book_cruise').replace('{book}', otherCruiseTitle()));
      return;
    }
    var active = null;
    try {
      active = await window.LF_PORTAL.cruiseSession();
    } catch (error) {
      showCruiseError(error);
      return;
    }
    if (String((D.book || {}).id || '') !== String(bookId)) return;
    if (active && String(active.bookId) !== String(bookId)) {
      setOtherCruise(active);
      var card = (D.shelf || []).find(function (item) {
        return item && String(item.id) === String(active.bookId);
      });
      toast(T('other_book_cruise').replace('{book}', card ? L(card.title) : en ? 'another work' : '另一本作品'));
      return;
    }
    if (active) {
      setCruising(true);
      setPaused(active.status === 'paused');
      return;
    }
    setCruising(true);
    setPaused(false);
    setCruiseProg({
      phase: 'plan'
    });
    window.LF_PORTAL.runCruise(bookId, cfg, {
      onSession: function (session) {
        if (String((D.book || {}).id || '') !== String(bookId)) return;
        window.dispatchEvent(new CustomEvent('lf:assistant-cruise-updated', {
          detail: {
            bookId: bookId,
            session: session,
            controlledId: session.id
          }
        }));
      },
      onProgress: function (ev) {
        if (!ev || String((D.book || {}).id || '') !== String(bookId)) return;
        if (ev.done) {
          setCruising(false);
          setCruiseProg(null);
          setPaused(false);
          toast(T('cruise_done'));
        } else if (ev.stopped) {
          setCruising(false);
          setCruiseProg(null);
          setPaused(false);
        } else if (ev.error) {
          setCruising(false);
          setCruiseProg(null);
          setPaused(false);
          if (ev.error && ev.error.code === 'quote_cancelled') {
            setGuard(true);
            return;
          }
          if (window.LF_ERROR && window.LF_ERROR.isBackendError(ev.error)) window.LF_ERROR(ev.error);else toast(TC('rg_fail') || '巡航中断');
        } else {
          setCruiseProg(ev);
        }
      }
    }).catch(function (err) {
      if (String((D.book || {}).id || '') !== String(bookId)) return;
      setCruising(false);
      setCruiseProg(null);
      setPaused(false);
      if (window.LF_ERROR && window.LF_ERROR.isBackendError(err)) window.LF_ERROR(err);
    });
  };
  // Single entry: idle → open config; running → ask to pause; paused → resume.
  const onBarAction = async () => {
    if (otherCruise) {
      toast(T('other_book_cruise').replace('{book}', otherCruiseTitle()));
      return;
    }
    if (!cruising) {
      setGuard(true);
      return;
    }
    if (paused) {
      try {
        await window.LF_PORTAL.resumeCruise();
        setPaused(false);
        toast(T('btn_resume'));
      } catch (error) {
        showCruiseError(error);
      }
      return;
    }
    setPauseAsk(true);
  };
  const confirmPause = async () => {
    setPauseAsk(false);
    try {
      await window.LF_PORTAL.pauseCruise();
      setPaused(true);
      toast(T('pause_toast'));
    } catch (error) {
      showCruiseError(error);
    }
  };
  // deep-link into the Refine workbench for a chapter
  const openChap = no => {
    set({
      wbMode: 'edit',
      chap: no,
      tab: 'detail',
      treeOpen: false
    });
    toast(T('deep_toast').replace('{n}', no));
  };
  // #6b: clicking a tension point swaps the WSM view to that chapter in place
  // (no jump to Refine). Loads the chapter's world snapshot into D.wsm.
  const [wsmChap, setWsmChap] = cUseState(null);
  const pickWsmChapter = no => {
    if (!bookId || !window.LF_PORTAL || !window.LF_PORTAL.loadChapterWsm) return;
    setWsmChap(no);
    window.LF_PORTAL.loadChapterWsm(bookId, no).catch(function () {});
  };
  // 当前卷：真实数据通常只有一卷（索引 0）。旧代码硬编码 D.volumes[1]，单卷书会越界为 undefined 而崩溃。
  const crumbVol = (D.volumes || []).find(v => v.state === 'active') || (D.volumes || [])[0] || null;
  return /*#__PURE__*/React.createElement("div", {
    className: "c-main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-top"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tree-toggle c-ic",
    onClick: () => set({
      treeOpen: !state.treeOpen
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "book",
    s: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "c-crumb"
  }, "\u300A", L(D.book && D.book.title), "\u300B", crumbVol ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), L(crumbVol.no), " ", L(crumbVol.name)) : null, /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), /*#__PURE__*/React.createElement("b", null, T('crumb'))), /*#__PURE__*/React.createElement(WbModeSwitch, {
    mode: "cruise",
    setMode: m => set({
      wbMode: m
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(TopCtl, ctl)), /*#__PURE__*/React.createElement(CruiseBar, {
    paused: paused,
    cruising: cruising,
    prog: cruiseProg,
    onToggle: onBarAction,
    onGuard: () => setGuard(true)
  }), cruising && cruiseProg && (() => {
    var ph = cruiseProg.stagePhase,
      phl = {
        outline: '生成卷纲',
        draft: '完整章节生产',
        polish: '润色',
        posthoc: '后验结算'
      }[ph] || '编排中';
    var pe = {
      outline: 'Volume outline',
      draft: 'Full chapter',
      polish: 'Polish',
      posthoc: 'Post-hoc'
    }[ph] || 'Orchestrating';
    var pct = typeof cruiseProg.progress === 'number' ? Math.round(cruiseProg.progress * 100) : null;
    return /*#__PURE__*/React.createElement("div", {
      className: "cr-cruise-strip"
    }, /*#__PURE__*/React.createElement("span", {
      className: "edt-spin sm"
    }), /*#__PURE__*/React.createElement("b", null, en ? pe : phl), cruiseProg.chapter ? /*#__PURE__*/React.createElement("span", {
      className: "c-latin"
    }, en ? 'ch.' + cruiseProg.chapter : '第 ' + cruiseProg.chapter + ' 章') : null, cruiseProg.total ? /*#__PURE__*/React.createElement("span", {
      className: "cr-strip-idx c-latin"
    }, cruiseProg.index != null ? cruiseProg.index + 1 : 1, " / ", cruiseProg.total) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), pct != null && /*#__PURE__*/React.createElement("span", {
      className: "c-latin"
    }, pct, "%"), /*#__PURE__*/React.createElement("div", {
      className: "cr-strip-bar"
    }, /*#__PURE__*/React.createElement("i", {
      style: {
        width: (pct != null ? pct : 8) + '%'
      }
    })));
  })(), /*#__PURE__*/React.createElement("div", {
    className: 'c-body cr-body' + (paused && !cruising ? ' is-paused' : ''),
    style: {
      overflow: 'auto',
      padding: '18px 26px 22px'
    }
  }, /*#__PURE__*/React.createElement(CruiseGauges, null), /*#__PURE__*/React.createElement("div", {
    className: "cr-split"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-left"
  }, /*#__PURE__*/React.createElement(CruiseTrack, {
    onPick: pickWsmChapter
  })), /*#__PURE__*/React.createElement(CruiseFeed, {
    paused: paused,
    wsmChap: wsmChap
  }))), /*#__PURE__*/React.createElement(CruiseConfig, {
    open: guard,
    onClose: () => setGuard(false),
    cfg: cfg,
    setCfg: setCfg,
    toast: toast,
    onStart: startCruise,
    running: cruising,
    bookId: bookId
  }), pauseAsk && /*#__PURE__*/React.createElement("div", {
    className: "cr-modal-scrim",
    onClick: () => setPauseAsk(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "cr-modal-h"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "clock",
    s: 16
  }), /*#__PURE__*/React.createElement("b", null, T('pause_confirm_t'))), /*#__PURE__*/React.createElement("p", {
    className: "cr-modal-b"
  }, T('pause_confirm_b')), /*#__PURE__*/React.createElement("div", {
    className: "cr-modal-act"
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: () => setPauseAsk(false)
  }, T('pause_confirm_cancel')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm gold",
    onClick: confirmPause
  }, T('pause_confirm_ok'))))));
}
window.CruiseView = CruiseView;
}
