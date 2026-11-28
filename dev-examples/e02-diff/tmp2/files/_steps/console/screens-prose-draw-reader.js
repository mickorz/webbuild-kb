{
/* Shared anonymous reader; layout and reading positions belong to this surface. */
function ProseDrawReader({
  round,
  onAdopt,
  onReject,
  disabled = false,
  rejectDisabled = false,
  history = false,
  heading
}) {
  const en = window.CLANG === 'en',
    C = window.ProseDrawSelectionCore;
  const view = C.policy(round),
    rows = view.rows,
    roundId = round && round.round_id || '';
  const [selection, setSelection] = React.useState({
      roundId,
      index: 0
    }),
    [preferredDual, setPreferredDual] = React.useState(true),
    [width, setWidth] = React.useState(0);
  const shell = React.useRef(null),
    scrolls = React.useRef({}),
    contents = React.useRef({}),
    tabs = React.useRef({}),
    positions = React.useRef({}),
    animations = React.useRef([]),
    lastView = React.useRef(null),
    focusDraft = React.useRef(false);
  const identity = React.useId().replace(/:/g, ''),
    valid = rows.length === 2;
  const active = selection.roundId === roundId ? selection.index : 0;
  const compact = width > 0 && width < 720,
    dual = !history && !compact && preferredDual;
  const visible = valid ? dual ? rows : [rows[active]] : [];
  const label = row => (en ? 'Draft ' : '正文 ') + row.letter;
  const wordCount = row => row.body.trim() ? Array.from(row.body.replace(/\s/g, '')).length.toLocaleString() + (en ? ' characters' : ' 字') : '';
  const cancelAnimations = () => {
    animations.current.forEach(animation => animation.cancel());
    animations.current = [];
  };
  const padding = node => parseFloat(window.getComputedStyle(node).paddingTop) || 0;
  const remember = (id, node) => {
    if (!node) return;
    const paragraphs = node.querySelectorAll('.pd-text p'),
      top = node.scrollTop,
      edge = top + padding(node);
    let index = 0;
    paragraphs.forEach((paragraph, i) => {
      if (paragraph.offsetTop <= edge) index = i;
    });
    const paragraph = paragraphs[index];
    positions.current[id] = {
      index,
      fraction: paragraph && paragraph.offsetHeight ? (edge - paragraph.offsetTop) / paragraph.offsetHeight : 0,
      top
    };
  };
  const capture = () => visible.forEach(row => remember(row.id, scrolls.current[row.id]));
  const changeActive = index => {
    capture();
    setSelection({
      roundId,
      index
    });
  };
  const changeLayout = next => {
    capture();
    setPreferredDual(next);
  };
  const readSingle = index => {
    capture();
    focusDraft.current = true;
    setSelection({
      roundId,
      index
    });
    setPreferredDual(false);
  };
  React.useLayoutEffect(() => {
    const node = shell.current;
    if (!node) return;
    const update = value => {
      const next = Math.round(value);
      if (next > 0) setWidth(next);
    };
    const measure = () => update(node.getBoundingClientRect().width);
    measure();
    if (typeof window.ResizeObserver === 'function') {
      const observer = new window.ResizeObserver(entries => {
        const entry = entries[0];
        if (entry && entry.contentRect) update(entry.contentRect.width);else measure();
      });
      observer.observe(node);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  React.useLayoutEffect(() => {
    cancelAnimations();
    const previous = lastView.current,
      key = dual ? 'dual' : 'single-' + active;
    if (previous && previous.roundId !== roundId) positions.current = {};
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = previous && previous.roundId === roundId && previous.key !== key && !reduced;
    visible.forEach(row => {
      const node = scrolls.current[row.id],
        saved = positions.current[row.id];
      if (!node) return;
      const paragraph = saved && node.querySelectorAll('.pd-text p')[saved.index];
      node.scrollTop = saved ? Math.max(0, paragraph && paragraph.offsetHeight ? paragraph.offsetTop + saved.fraction * paragraph.offsetHeight - padding(node) : saved.top) : 0;
      remember(row.id, node);
      const content = contents.current[row.id];
      if (animate && content && typeof content.animate === 'function') {
        const animation = content.animate([{
          opacity: 0,
          transform: 'translateY(5px)'
        }, {
          opacity: 1,
          transform: 'translateY(0)'
        }], {
          duration: 220,
          easing: 'cubic-bezier(.22,1,.36,1)'
        });
        if (animation) {
          if (animation.finished) animation.finished.catch(() => {});
          animations.current.push(animation);
        }
      }
    });
    lastView.current = {
      roundId,
      key
    };
    if (focusDraft.current && !dual && valid) {
      tabs.current[rows[active].id] && tabs.current[rows[active].id].focus({
        preventScroll: true
      });
      focusDraft.current = false;
    }
    return cancelAnimations;
  }, [roundId, dual, active, width, valid, rows[0] && rows[0].body, rows[1] && rows[1].body]);
  const adoptButton = row => {
    const selected = row.selected && !view.modified;
    const text = selected ? en ? 'Adopted' : '已采用' : (en ? 'Adopt draft ' : '采用正文 ') + row.letter;
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      "aria-label": selected ? (en ? 'Adopted draft ' : '已采用正文 ') + row.letter : undefined,
      disabled: disabled || !view.canAdopt || row.status !== 'completed' || !row.body.trim() || selected,
      onClick: () => onAdopt(row)
    }, text);
  };
  const draftTabs = /*#__PURE__*/React.createElement("div", {
    className: "pd-tabs",
    role: "tablist",
    "aria-label": en ? 'Draft' : '正文'
  }, /*#__PURE__*/React.createElement("i", {
    className: "pd-segment-indicator",
    "aria-hidden": "true",
    style: {
      transform: 'translateX(' + active * 100 + '%)'
    }
  }), rows.map((row, i) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    key: row.id,
    ref: node => tabs.current[row.id] = node,
    id: identity + '-tab-' + i,
    role: "tab",
    "aria-label": label(row),
    "aria-controls": identity + '-panel',
    "aria-selected": active === i,
    tabIndex: active === i ? 0 : -1,
    className: active === i ? 'active' : '',
    onClick: () => changeActive(i),
    onKeyDown: event => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - active;
        changeActive(next);
        tabs.current[rows[next].id].focus();
      }
    }
  }, /*#__PURE__*/React.createElement("span", null, label(row)), /*#__PURE__*/React.createElement("small", null, wordCount(row)))));
  return /*#__PURE__*/React.createElement("div", {
    className: "pd-reader-shell",
    "data-compact": compact ? 'true' : undefined,
    ref: shell
  }, !history && /*#__PURE__*/React.createElement("div", {
    className: "pd-workspace-head"
  }, heading && /*#__PURE__*/React.createElement("div", {
    className: "pd-workspace-context"
  }, heading), valid && !compact && /*#__PURE__*/React.createElement("div", {
    className: "pd-layout",
    role: "group",
    "aria-label": en ? 'Reading layout' : '阅读布局'
  }, /*#__PURE__*/React.createElement("i", {
    className: "pd-segment-indicator",
    "aria-hidden": "true",
    style: {
      transform: 'translateX(' + (dual ? 100 : 0) + '%)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": !dual,
    onClick: () => changeLayout(false)
  }, en ? 'Single' : '单栏'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": dual,
    onClick: () => changeLayout(true)
  }, en ? 'Compare' : '双栏'))), /*#__PURE__*/React.createElement("section", {
    className: "pd-reader",
    "aria-label": en ? 'Candidate drafts' : '候选正文'
  }, !valid ? /*#__PURE__*/React.createElement("div", {
    className: "pd-empty",
    role: "status"
  }, en ? 'Candidates are not available yet.' : '候选正文尚未就绪。') : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: 'pd-pages' + (dual ? ' dual' : ''),
    "data-layout": dual ? 'dual' : 'single'
  }, visible.map(row => /*#__PURE__*/React.createElement("article", {
    className: "pd-page",
    key: dual ? row.id : 'single',
    role: dual ? undefined : 'tabpanel',
    id: dual ? undefined : identity + '-panel',
    "aria-labelledby": dual ? undefined : identity + '-tab-' + active,
    "aria-label": label(row)
  }, /*#__PURE__*/React.createElement("header", {
    className: "pd-page-head"
  }, dual ? /*#__PURE__*/React.createElement("div", {
    className: "pd-page-identity"
  }, /*#__PURE__*/React.createElement("b", null, label(row)), /*#__PURE__*/React.createElement("small", null, wordCount(row))) : draftTabs, /*#__PURE__*/React.createElement("div", {
    className: "pd-page-actions"
  }, view.modified && row.selected && /*#__PURE__*/React.createElement("small", null, en ? 'Previously adopted' : '曾采用'), dual && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "pd-read-single",
    "aria-label": (en ? 'Read draft ' : '单栏阅读正文 ') + row.letter + (en ? ' in single view' : ''),
    onClick: () => readSingle(rows.indexOf(row))
  }, en ? 'Read single' : '单栏阅读'), adoptButton(row))), /*#__PURE__*/React.createElement("div", {
    className: "pd-text-scroll",
    role: "region",
    "aria-label": label(row) + (en ? ' reading area' : ' 阅读区'),
    tabIndex: 0,
    ref: node => scrolls.current[row.id] = node,
    onScroll: event => remember(row.id, event.currentTarget)
  }, /*#__PURE__*/React.createElement("div", {
    className: "pd-page-content",
    ref: node => contents.current[row.id] = node
  }, row.status === 'completed' && row.body.trim() ? /*#__PURE__*/React.createElement("div", {
    className: "pd-text"
  }, row.body.split(/\r?\n[\t ]*\r?\n/).map((text, i) => /*#__PURE__*/React.createElement("p", {
    key: i
  }, text))) : /*#__PURE__*/React.createElement("p", {
    className: "pd-empty",
    role: "status"
  }, row.status === 'failed' ? en ? 'This draft failed to generate.' : '此篇正文生成失败。' : row.status === 'cancelled' ? en ? 'Generation stopped.' : '此篇生成已停止。' : en ? 'Waiting for this draft.' : '此篇正文尚未就绪。'), !disabled && row.creditsRefunded && /*#__PURE__*/React.createElement("p", {
    className: "pd-empty",
    role: "status"
  }, TC('generation_credits_refunded'))))))), /*#__PURE__*/React.createElement("footer", {
    className: "pd-reader-foot"
  }, /*#__PURE__*/React.createElement("small", null, en ? 'Original candidate drafts' : '原始候选正文'), view.canReject && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn sm",
    disabled: disabled || rejectDisabled,
    onClick: onReject
  }, en ? 'Neither is satisfactory' : '两篇都不满意')))));
}
function ProseDrawHistory({
  items,
  selected,
  onSelect,
  loading,
  error,
  more,
  onMore,
  children
}) {
  const en = window.CLANG === 'en';
  const time = value => {
    const date = new Date(value);
    return value && !Number.isNaN(date.getTime()) ? date.toLocaleString(en ? 'en-US' : 'zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }) : en ? 'Time unavailable' : '时间未记录';
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "wh-body pd-history"
  }, /*#__PURE__*/React.createElement("nav", {
    className: "wh-list",
    "aria-label": en ? 'Rounds' : '抽卡轮次'
  }, items.map(round => /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: 'pd-round' + (round.round_id === selected ? ' active' : ''),
    key: round.round_id,
    onClick: () => onSelect(round.round_id),
    "aria-current": round.round_id === selected ? 'true' : undefined
  }, /*#__PURE__*/React.createElement("b", null, time(round.created_at)), /*#__PURE__*/React.createElement("span", null, window.ProseDrawSelectionCore.label(round, en)))), loading && /*#__PURE__*/React.createElement("p", {
    role: "status"
  }, en ? 'Loading…' : '正在读取…'), error && /*#__PURE__*/React.createElement("p", {
    role: "alert"
  }, en ? 'Unable to read records.' : '记录读取失败。'), !loading && !error && !items.length && /*#__PURE__*/React.createElement("p", null, more ? en ? 'No chapter records on this page.' : '本页暂无本章记录。' : en ? 'No draw history.' : '本章暂无抽卡记录。'), (more || error) && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn sm",
    disabled: loading,
    onClick: onMore
  }, error ? en ? 'Retry' : '重新读取' : en ? 'Load earlier records' : '加载更早记录')), /*#__PURE__*/React.createElement("div", {
    className: "wh-detail"
  }, children));
}
window.ProseDrawReader = ProseDrawReader;
window.ProseDrawHistory = ProseDrawHistory;
}
