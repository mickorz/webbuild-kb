{
/* ===== 成文页 · 运行态推理框（润色/重生）+ 定稿礼成全屏弹层 ===== */
const L = window.L,
  TC = window.TC,
  D = window.CONSOLE_DATA;

/* ---------- ProseTaskDock：润色/重生运行时的醒目推理框 ----------
   mode  'polish' | 'regen'（金/赭两套配色与文案，区分两种任务）
   phase 'think'（引擎推理中，逐条点亮思考步骤）| 'swap'（新旧逐段替换中，显示进度） */
function ProseTaskDock({
  mode,
  phase,
  pct
}) {
  const {
    useState,
    useEffect
  } = React;
  const lines = TC(mode === 'polish' ? 'pt_lines_polish' : 'pt_lines_regen');
  const [li, setLi] = useState(0);
  useEffect(() => {
    if (phase !== 'think') return;
    const t = setInterval(() => setLi(i => Math.min(i + 1, lines.length - 1)), 1750);
    return () => clearInterval(t);
  }, [phase]);
  const swapping = phase === 'swap';
  return /*#__PURE__*/React.createElement("div", {
    className: 'ptask ' + mode
  }, /*#__PURE__*/React.createElement("div", {
    className: "pt-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pt-ava"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: mode === 'polish' ? 'sparkle' : 'bolt',
    s: 15
  })), /*#__PURE__*/React.createElement("div", {
    className: "pt-id"
  }, /*#__PURE__*/React.createElement("b", null, TC(mode === 'polish' ? 'pt_polish' : 'pt_regen')), /*#__PURE__*/React.createElement("i", null, TC(mode === 'polish' ? 'pt_mode_polish' : 'pt_mode_regen'))), /*#__PURE__*/React.createElement("span", {
    className: "pt-lock"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "pen",
    s: 11
  }), TC('pt_locked'))), /*#__PURE__*/React.createElement("div", {
    className: "pt-lines"
  }, lines.map((t, k) => {
    const st = swapping || k < li ? 'done' : k === li ? 'on' : 'wait';
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      className: 'pt-line ' + st
    }, /*#__PURE__*/React.createElement("span", {
      className: "pt-dot"
    }, st === 'done' ? /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 10,
      w: 3
    }) : st === 'on' ? /*#__PURE__*/React.createElement("span", {
      className: "edt-spin sm"
    }) : /*#__PURE__*/React.createElement("span", {
      className: "pt-n c-latin"
    }, k + 1)), /*#__PURE__*/React.createElement("span", {
      className: st === 'on' ? 'c-shimmer' : ''
    }, t));
  }), swapping && /*#__PURE__*/React.createElement("div", {
    className: "pt-line on pt-swapline"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pt-dot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edt-spin sm"
  })), /*#__PURE__*/React.createElement("span", {
    className: "c-shimmer"
  }, TC(mode === 'polish' ? 'pt_swap_polish' : 'pt_swap_regen')), /*#__PURE__*/React.createElement("span", {
    className: "pt-pct c-latin"
  }, pct, "%"))), swapping && /*#__PURE__*/React.createElement("div", {
    className: "pt-prog"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: pct + '%'
    }
  })));
}
window.ProseTaskDock = ProseTaskDock;

/* Shared vocabulary and stage anchors are also used by the assistant's compact card. */
const PROSE_STAGE_SEQ = window.ProseStageCore.PROSE_STAGE_SEQ;
function ProseDrawCandidateRows({
  view,
  showRefund = true
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "prose-draw-writers",
    "aria-label": window.CLANG === 'en' ? 'Draft generation status' : '两篇正文生成状态',
    "aria-live": "polite"
  }, view.rows.map(row => /*#__PURE__*/React.createElement("div", {
    key: row.letter,
    className: 'prose-draw-writer ' + row.status
  }, /*#__PURE__*/React.createElement("span", null, row.label), /*#__PURE__*/React.createElement("span", {
    className: "prose-draw-writer-status"
  }, ['active', 'stopping', 'verifying'].includes(row.status) && /*#__PURE__*/React.createElement("span", {
    className: "edt-spin sm",
    "aria-hidden": "true"
  }), row.status === 'ready' && /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 12
  }), /*#__PURE__*/React.createElement("span", null, row.statusLabel)), showRefund && row.creditsRefunded && !view.creditsRefunded && /*#__PURE__*/React.createElement("span", {
    className: "prose-draw-refund",
    role: "status"
  }, TC('generation_credits_refunded')))));
}

/* 成文/润色运行框：运行中可最小化；成文完成后保留明确结果，由用户主动查看正文。*/
function ProseRunOverlay({
  mode,
  stage,
  stageOptions,
  status,
  chapterNumber,
  onClose,
  onView,
  onRetry,
  draw,
  onDrawChange,
  onDrawCancel,
  onDrawRefresh,
  onDrawRetryCreate,
  onDrawRetryCancel,
  onDrawView,
  onDrawBilling
}) {
  const [confirmRound, setConfirmRound] = React.useState(null);
  const submitted = React.useRef(null);
  const card = React.useRef(null);
  const roundId = draw && draw.round && draw.round.round_id;
  const drawView = draw ? window.ProseDrawProgressCore.project(draw, window.CLANG, chapterNumber) : null;
  const confirming = !!(drawView && drawView.canCancel && confirmRound === roundId);
  React.useEffect(() => {
    setConfirmRound(null);
    submitted.current = null;
  }, [roundId]);
  React.useEffect(() => {
    if (draw && card.current) {
      const target = confirming ? card.current.querySelector('.prose-draw-actions button') : card.current.querySelector('.prose-run-x');
      if (target) target.focus();
    }
  }, [roundId, confirming]);
  const requestCancel = () => {
    if (!drawView || !drawView.canCancel || !onDrawCancel || !onDrawChange || submitted.current === roundId) return;
    submitted.current = roundId;
    setConfirmRound(null);
    onDrawChange({
      cancelState: 'pending'
    });
    Promise.resolve().then(() => onDrawCancel()).catch(() => onDrawChange({
      cancelState: 'unknown'
    }));
  };
  var en = window.CLANG === 'en';
  var state = drawView ? drawView.running ? 'running' : drawView.kind === 'ready' ? 'completed' : drawView.busy ? 'verifying' : 'read_failed' : status || 'running';
  if (confirming) state = 'read_failed';
  var options = stageOptions || window.ProseStageCore.taskOptions(null, {
    task_type: mode === 'polish' ? 'polish' : 'chapter_draft'
  });
  var view = window.ProseStageCore.project(options, drawView && (!drawView.showStageProgress || stage === 'body_ready') ? null : stage);
  if (drawView && !stageOptions) view = {
    stages: [],
    index: -1,
    stage: null,
    progress: null
  };
  var seq = view.stages,
    idx = view.index,
    cur = view.stage,
    pct = view.progress;
  var currentLabel = cur ? en ? cur.en : cur.zh : drawView ? drawView.title : en ? 'Generating' : '正在生成';
  if (drawView) seq = seq.map(s => s.id === 'body_ready' ? {
    ...s,
    zh: '候选正文已就绪',
    en: 'Draft candidates ready'
  } : s);
  var resultTitle = state === 'completed' ? TC('prose_done_title').replace('{n}', chapterNumber) : state === 'read_failed' ? TC('prose_read_failed_title') : TC('prose_verifying_title').replace('{n}', chapterNumber);
  var resultDesc = state === 'completed' ? TC('prose_done_desc') : state === 'read_failed' ? TC('prose_read_failed_desc') : TC('prose_verifying_desc');
  if (drawView) {
    resultTitle = confirming ? en ? 'End this generation round?' : '结束本轮生成？' : drawView.title;
    resultDesc = confirming ? en ? 'Candidates from this round cannot be adopted after ending it. Generated drafts are kept and charged. Other charges depend on the confirmed settlement.' : '结束后，本轮候选不能再采用。已生成的正文会保留并正常计费，其他部分以停止确认后的结算结果为准。' : drawView.creditsRefunded ? TC('generation_credits_refunded') : drawView.description;
  }
  const close = () => confirming ? setConfirmRound(null) : onClose && onClose();
  const keys = event => {
    if (!drawView) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab' || !card.current) return;
    const buttons = Array.from(card.current.querySelectorAll('button:not(:disabled)'));
    const first = buttons[0],
      last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last && last.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first && first.focus();
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "c-runoverlay"
  }, /*#__PURE__*/React.createElement("div", {
    ref: card,
    onKeyDown: keys,
    className: 'c-runcard rs-card prose-run ' + (mode || '') + ' ' + state + (drawView ? ' is-draw' : ''),
    role: "dialog",
    "aria-modal": "true",
    "aria-label": state === 'running' ? currentLabel : resultTitle
  }, /*#__PURE__*/React.createElement("button", {
    className: "edt-x prose-run-x",
    onClick: close,
    title: confirming ? en ? 'Continue waiting' : '继续等待' : TC('run_minimize') || '最小化到右下角'
  }, "\xD7"), draw && draw.cancelError && /*#__PURE__*/React.createElement("p", {
    className: "prose-result-desc",
    role: "alert"
  }, draw.cancelError), state === 'running' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "c-runspin"
  }), /*#__PURE__*/React.createElement("div", {
    className: "c-runline c-shimmer"
  }, currentLabel, "\u2026\u2026"), seq.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rs-steps prose-run-steps"
  }, seq.map(function (s, k) {
    var st = k < idx ? 'done' : k === idx ? 'active' : 'wait';
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: s.id
    }, /*#__PURE__*/React.createElement("div", {
      className: 'rs-step ' + st
    }, /*#__PURE__*/React.createElement("span", {
      className: "rs-dot"
    }, k < idx ? /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 11,
      w: 3
    }) : k === idx ? /*#__PURE__*/React.createElement("span", {
      className: "edt-spin sm"
    }) : /*#__PURE__*/React.createElement("span", {
      className: "rs-n c-latin"
    }, k + 1)), /*#__PURE__*/React.createElement("span", {
      className: "rs-t"
    }, en ? s.en : s.zh)), drawView && s.id === 'compose' && /*#__PURE__*/React.createElement(ProseDrawCandidateRows, {
      view: drawView
    }));
  })), drawView && !seq.some(s => s.id === 'compose') && /*#__PURE__*/React.createElement(ProseDrawCandidateRows, {
    view: drawView
  }), pct != null && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "pt-prog",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: pct + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "prose-run-foot c-latin"
  }, pct, "%")), drawView && onDrawCancel && onDrawChange && /*#__PURE__*/React.createElement("div", {
    className: "prose-draw-actions running"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "prose-draw-stop",
    onClick: () => {
      submitted.current = null;
      setConfirmRound(roundId);
    }
  }, en ? 'End round' : '结束本轮'))) : /*#__PURE__*/React.createElement("div", {
    className: "prose-result"
  }, /*#__PURE__*/React.createElement("div", {
    className: 'prose-result-mark ' + state
  }, state === 'completed' ? /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 25,
    w: 2.4
  }) : state === 'verifying' ? /*#__PURE__*/React.createElement("span", {
    className: "edt-spin"
  }) : /*#__PURE__*/React.createElement("span", {
    className: "prose-result-alert"
  }, "!")), /*#__PURE__*/React.createElement("div", {
    className: "prose-result-title"
  }, resultTitle), /*#__PURE__*/React.createElement("p", {
    className: "prose-result-desc"
  }, resultDesc), drawView && /*#__PURE__*/React.createElement(ProseDrawCandidateRows, {
    view: drawView,
    showRefund: !confirming
  }), !drawView && state === 'completed' && /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold prose-result-action",
    onClick: onView
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "book",
    s: 15
  }), TC('prose_view')), !drawView && state === 'read_failed' && /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold prose-result-action",
    onClick: onRetry
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "book",
    s: 15
  }), TC('prose_retry_read')), !drawView && state === 'verifying' && /*#__PURE__*/React.createElement("div", {
    className: "prose-result-wait"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edt-spin sm"
  }), TC('run_write_verifying')), drawView && (confirming ? /*#__PURE__*/React.createElement("div", {
    className: "prose-draw-actions"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn",
    onClick: () => setConfirmRound(null)
  }, en ? 'Continue waiting' : '继续等待'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn prose-draw-danger",
    onClick: requestCancel
  }, en ? 'End round' : '结束本轮')) : /*#__PURE__*/React.createElement("div", {
    className: "prose-draw-actions"
  }, drawView.canCancel && onDrawCancel && onDrawChange && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn",
    onClick: () => {
      submitted.current = null;
      setConfirmRound(roundId);
    }
  }, en ? 'End round' : '结束本轮'), drawView.canRefresh && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn gold prose-result-action",
    disabled: !onDrawRefresh,
    onClick: onDrawRefresh
  }, en ? 'Refresh progress' : '重新读取进度'), drawView.kind === 'submission_unknown' && onDrawRetryCreate && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn prose-result-action",
    onClick: onDrawRetryCreate
  }, en ? 'Retry original request' : '重试原请求'), drawView.kind === 'cancel_unknown' && onDrawRetryCancel && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn prose-result-action",
    onClick: onDrawRetryCancel
  }, en ? 'Retry stop request' : '重试结束请求'), drawView.resultAction && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn gold prose-result-action",
    disabled: !onDrawView,
    title: !onDrawView ? en ? 'Candidate reading is not available yet' : '候选阅读暂未开放' : undefined,
    onClick: () => onDrawView(drawView.resultAction)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "book",
    s: 15
  }), drawView.resultLabel), ['failed', 'partial', 'cancelled'].includes(drawView.kind) && onDrawBilling && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn prose-result-action",
    onClick: onDrawBilling
  }, en ? 'View credit details' : '查看笔力明细'), drawView.busy && /*#__PURE__*/React.createElement("div", {
    className: "prose-result-wait"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edt-spin sm"
  }), drawView.kind === 'stopping' ? en ? 'Awaiting stop confirmation' : '等待停止确认' : en ? 'Loading draft candidates' : '正在读取候选正文'))))));
}
window.ProseRunOverlay = ProseRunOverlay;
window.PROSE_STAGE_SEQ = PROSE_STAGE_SEQ;

/* ---------- FinalizeOverlay：定稿礼成 ----------
   全屏弹层：光晕 + 飞金 + 印章落定 + 随机箴言逐字显形 + 后验流程小字 + 3 秒倒计时
   倒计时在入场动画落定后（约 1.6s）才开始走；到点或点按钮 → 收束动画 → 跳下一章细纲 */
function FinalizeOverlay({
  chap,
  title,
  words,
  vol,
  nextNo,
  onNext,
  onStay,
  settling
}) {
  const {
    useState,
    useEffect,
    useRef
  } = React;
  const en = window.CLANG === 'en';
  const quotes = TC('fin_quotes');
  const [qi] = useState(() => Math.floor(Math.random() * quotes.length));
  const [sec, setSec] = useState(10);
  const [armed, setArmed] = useState(false); // countdown starts after the entrance settles
  const [leaving, setLeaving] = useState(null); // 'next' | 'stay' → play exit, then fire callback
  const lvRef = useRef(null);
  // 后验回归校验未结束前不放行下一章：倒计时与自动跳转都暂停
  const gated = !!settling;
  const leave = kind => {
    if (kind === 'next' && gated) return;
    setLeaving(k => {
      if (k) return k;
      lvRef.current = setTimeout(() => {
        (kind === 'next' ? onNext : onStay)();
      }, 560);
      return kind;
    });
  };
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 1600);
    return () => {
      clearTimeout(t);
      clearTimeout(lvRef.current);
    };
  }, []);
  useEffect(() => {
    if (!armed || leaving || gated) return;
    if (sec <= 0) {
      leave('next');
      return;
    }
    const t = setTimeout(() => setSec(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [armed, sec, leaving, gated]);
  const q = quotes[qi] || quotes[0];
  const chLab = en ? 'Ch.' + chap : '第 ' + chap + ' 章';
  return /*#__PURE__*/React.createElement(Portal, null, /*#__PURE__*/React.createElement("div", {
    className: 'fin-scrim' + (leaving ? ' leaving' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "fin-bloom"
  }), /*#__PURE__*/React.createElement("div", {
    className: "fin-sparks"
  }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => /*#__PURE__*/React.createElement("i", {
    key: i,
    style: {
      '--i': i
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "fin-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: 'fin-seal' + (en ? ' en' : '')
  }, /*#__PURE__*/React.createElement("span", null, en ? 'Fin.' : '定')), /*#__PURE__*/React.createElement("div", {
    className: "fin-kicker"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-latin fin-ch"
  }, chLab), /*#__PURE__*/React.createElement("span", {
    className: "fin-tt"
  }, title), /*#__PURE__*/React.createElement("span", {
    className: "fin-badge"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 11,
    w: 3
  }), TC('fin_done'))), /*#__PURE__*/React.createElement("div", {
    className: "fin-quote"
  }, q.split('').map((ch, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      animationDelay: 0.55 + i * 0.038 + 's'
    }
  }, ch === ' ' ? '\u00A0' : ch))), /*#__PURE__*/React.createElement("div", {
    className: "fin-stats"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-latin"
  }, words), " ", TC('fin_words'), /*#__PURE__*/React.createElement("span", {
    className: "dotsep"
  }, "\xB7"), vol), /*#__PURE__*/React.createElement("div", {
    className: "fin-note"
  }, TC('fin_note')), /*#__PURE__*/React.createElement("div", {
    className: "fin-acts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn fin-stay",
    onClick: () => leave('stay')
  }, TC('fin_stay')), /*#__PURE__*/React.createElement("button", {
    className: 'c-btn gold fin-go' + (gated ? ' is-gated' : ''),
    onClick: () => leave('next'),
    disabled: gated
  }, gated ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "edt-spin sm"
  }), /*#__PURE__*/React.createElement("span", null, TC('fin_settling'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "fin-ring"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 28 28"
  }, /*#__PURE__*/React.createElement("circle", {
    className: "bg",
    cx: "14",
    cy: "14",
    r: "11"
  }), /*#__PURE__*/React.createElement("circle", {
    className: 'fg' + (armed && !leaving ? ' run' : ''),
    cx: "14",
    cy: "14",
    r: "11"
  })), /*#__PURE__*/React.createElement("b", null, Math.max(0, sec))), /*#__PURE__*/React.createElement("span", null, TC('fin_next').replace('{n}', nextNo))))), /*#__PURE__*/React.createElement("div", {
    className: "fin-auto"
  }, gated ? TC('fin_settle_note') : TC('fin_auto').replace('{s}', String(Math.max(0, sec)))))));
}
window.FinalizeOverlay = FinalizeOverlay;
}
