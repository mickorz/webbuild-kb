{
/* Phone layout of the chapter outline (FD-176): positioning and the world state lead, long fields show a
   few lines and open the shared field sheet to read in full, edit and rewrite. The run, writer and
   regenerate actions live in the frame's action bar and bottom sheets. Saving and rewriting are the
   desktop outline's own handlers, reached through its EditCtx. */
(function () {
  const {
    useState
  } = React;
  const L = window.L,
    TC = window.TC;
  const en = () => window.CLANG === 'en';
  const DIST = {
    near: 'dist_near',
    mid: 'dist_mid',
    far: 'dist_far'
  };
  const ANCHOR_ICONS = {
    hook: 'hook',
    climax: 'peak',
    close: 'door',
    nextlink: 'link'
  };
  function Clamp({
    lines,
    children
  }) {
    return /*#__PURE__*/React.createElement("span", {
      className: 'm-ol-clamp' + lines
    }, children);
  }
  function PenButton({
    label,
    onClick
  }) {
    const Icon = window.Icon;
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-ol-pen",
      "aria-label": label,
      onClick: onClick
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "pen",
      s: 14,
      w: 1.8
    }));
  }
  function PointText({
    text
  }) {
    const parts = String(text || '').split('→');
    return /*#__PURE__*/React.createElement(React.Fragment, null, parts[0], parts[1] !== undefined ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "arr"
    }, "\u2192"), /*#__PURE__*/React.createElement("b", null, parts[1])) : null);
  }
  function MobileOutlineLayout(props) {
    const {
      det,
      no,
      title,
      edit,
      dk,
      tension,
      band,
      saving,
      saveErr,
      fmap,
      fcls,
      wsmOpen,
      toggleWsm,
      sheet,
      setSheet,
      writerType,
      chooseWriter,
      run,
      runLabel,
      runDisabled
    } = props;
    const Kit = window.LFMobileKit,
      Icon = window.Icon,
      IVRow = window.IVRow,
      Core = window.MobileOutlineCore;
    const Sheet = window.MobileFieldSheet;
    const data = window.CONSOLE_DATA || {};
    const [fieldKey, setFieldKey] = useState(null);
    const [allPoints, setAllPoints] = useState(false);
    const text = value => L(value) || '';
    const book = data.book;
    const finalized = !!(book && book.id && window.LF_PORTAL && window.LF_PORTAL.chapterFinalized && window.LF_PORTAL.chapterFinalized(book.id, no));
    const volume = Core.volumeLabel(data, no, text);
    const world = Core.worldSummary(data.wsm, no, text);
    const ledger = Core.ledgerSummary(det);
    const points = det.points || [];
    const shownPoints = allPoints ? points : points.slice(0, Core.POINTS_PREVIEW);
    const chapterName = (en() ? 'Ch. ' + no : '第 ' + no + ' 章') + (title ? ' · ' + title : '');
    const openField = key => setFieldKey(key);
    const dirtyMark = path => dk(path) ? /*#__PURE__*/React.createElement("span", {
      className: "m-ol-dirty",
      title: TC('ed_dirty')
    }) : null;
    const field = (() => {
      const path = Core.fieldPath(fieldKey);
      const value = Core.fieldValue(det, path, text);
      if (!path || value == null) return null;
      const titles = {
        pos: TC('pos'),
        target: TC('target'),
        worldtime: TC('worldtime'),
        dilemma: TC('dilemma'),
        know: TC('know'),
        dontknow: TC('dontknow')
      };
      let title = titles[path[0]];
      if (path[0] === 'anchors') title = TC(path[1]);
      if (path[0] === 'points') title = TC('plotpts');
      if (path[0] === 'foreshadow' || path[0] === 'debts') {
        const item = det[path[0]][path[1]];
        title = TC(path[0] === 'foreshadow' ? 'foreshadow' : 'debts') + (item.id ? ' · ' + item.id : '');
      }
      const label = path[0] === 'points' ? TC('plotpts') + ' ' + (path[1] + 1) : title;
      return {
        key: fieldKey,
        title,
        subtitle: chapterName,
        value,
        label,
        rewritePath: path,
        multiline: !(path[0] === 'target' || path[0] === 'worldtime'),
        step: Core.fieldStep(det, fieldKey),
        onCommit: value => edit(path, value)
      };
    })();
    const ledgerRows = (group, kind) => /*#__PURE__*/React.createElement(React.Fragment, null, group.listed.map(item => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: item.index,
      className: "m-ol-ledger-item",
      onClick: () => openField(kind + '.' + item.index)
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-ol-ledger-meta"
    }, /*#__PURE__*/React.createElement("span", {
      className: 'c-badge ' + (kind === 'debts' ? 'terra' : fcls[item.op])
    }, TC(kind === 'debts' ? 'debt_new' : fmap[item.op])), item.id ? /*#__PURE__*/React.createElement("span", {
      className: "c-latin"
    }, item.id) : null, dirtyMark([kind, item.index, 't'])), /*#__PURE__*/React.createElement(Clamp, {
      lines: 2
    }, text(item.t)), text(item.when) ? /*#__PURE__*/React.createElement("span", {
      className: "m-muted"
    }, text(item.when)) : null)), group.others.map(other => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: other.op,
      className: "m-ol-ledger-ids",
      onClick: () => setSheet('ledger')
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-muted"
    }, TC(kind === 'debts' && other.op === 'pay' ? 'debt_pay' : fmap[other.op])), /*#__PURE__*/React.createElement("span", {
      className: "c-latin"
    }, other.items.map(item => item.id).filter(Boolean).join(' · ') || other.items.length))));
    return /*#__PURE__*/React.createElement("div", {
      className: "m-outline"
    }, saving || saveErr ? /*#__PURE__*/React.createElement("div", {
      className: "m-muted m-outline-status",
      role: "status"
    }, saving ? L({
      zh: '保存中…',
      en: 'Saving…'
    }) : L({
      zh: '保存失败：',
      en: 'Save failed: '
    }) + saveErr) : null, /*#__PURE__*/React.createElement("section", {
      className: "m-ol-pos"
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-ol-pos-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-ol-label"
    }, TC('pos')), volume ? /*#__PURE__*/React.createElement("span", {
      className: "m-ol-vol c-latin"
    }, volume) : null, finalized ? /*#__PURE__*/React.createElement("span", {
      className: "m-ol-final"
    }, en() ? 'Final' : '正文已定稿') : null, dirtyMark(['pos']), /*#__PURE__*/React.createElement(PenButton, {
      label: en() ? 'Edit chapter role' : '编辑本章定位',
      onClick: () => openField('pos')
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-ol-pos-text",
      onClick: () => openField('pos')
    }, /*#__PURE__*/React.createElement(Clamp, {
      lines: 3
    }, text(det.pos)), /*#__PURE__*/React.createElement("span", {
      className: "m-ol-more",
      "aria-hidden": "true"
    }, en() ? 'Full' : '全文', /*#__PURE__*/React.createElement(Icon, {
      n: "caret",
      s: 13,
      w: 2
    }))), /*#__PURE__*/React.createElement("div", {
      className: "m-ol-stats"
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-ol-tension"
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-muted"
    }, TC('tension')), /*#__PURE__*/React.createElement("span", {
      className: "m-ol-stat-row"
    }, /*#__PURE__*/React.createElement("b", {
      className: "c-latin"
    }, tension), /*#__PURE__*/React.createElement("span", {
      className: "m-ol-meter",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("i", {
      style: {
        width: Math.max(0, Math.min(100, Number(tension) || 0)) + '%'
      }
    })), band ? /*#__PURE__*/React.createElement("span", {
      className: "m-ol-band"
    }, band) : null)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-ol-target",
      onClick: () => openField('target')
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-muted"
    }, TC('target')), /*#__PURE__*/React.createElement("span", {
      className: "m-ol-stat-row"
    }, /*#__PURE__*/React.createElement("b", {
      className: "c-latin"
    }, text(det.target)), dirtyMark(['target']))))), world || text(det.worldtime) ? /*#__PURE__*/React.createElement("section", {
      className: "m-ol-world"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-ol-world-main",
      onClick: () => setSheet('ledger')
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-ol-world-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-ol-globe",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "world",
      s: 16
    })), /*#__PURE__*/React.createElement("span", {
      className: "m-ol-world-title"
    }, /*#__PURE__*/React.createElement("b", null, TC('wsm_title')), world && world.time ? /*#__PURE__*/React.createElement("span", {
      className: "m-ol-world-time"
    }, world.time) : null)), world ? /*#__PURE__*/React.createElement("span", {
      className: "m-ol-world-counts"
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      className: "m-muted"
    }, en() ? 'Forces' : '势力'), /*#__PURE__*/React.createElement("b", {
      className: "c-latin"
    }, world.forces)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      className: "m-muted"
    }, TC('wsm_under')), /*#__PURE__*/React.createElement("b", {
      className: "c-latin"
    }, world.undercurrents)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      className: "m-muted"
    }, en() ? 'Off camera' : '镜头外'), /*#__PURE__*/React.createElement("b", {
      className: "c-latin"
    }, world.offCamera))) : null, world && world.changes.length ? /*#__PURE__*/React.createElement("span", {
      className: "m-ol-world-changes"
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-muted"
    }, en() ? 'Changed this chapter' : '本章变动'), world.changes.map((change, index) => /*#__PURE__*/React.createElement("span", {
      key: index,
      className: "m-ol-change"
    }, /*#__PURE__*/React.createElement("span", {
      className: 'm-ol-tag ' + (change.kind === 'under' ? 'is-under' : 'is-' + (change.distance || 'near'))
    }, change.kind === 'under' ? en() ? 'Hidden' : '暗' : TC(DIST[change.distance] || 'dist_near')), /*#__PURE__*/React.createElement("span", {
      className: "m-ol-change-text"
    }, /*#__PURE__*/React.createElement("b", null, change.name), change.status ? '　' + change.status : '')))) : null), text(det.worldtime) ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-ol-world-adv c-latin",
      "aria-label": TC('worldtime') + ' ' + text(det.worldtime),
      onClick: () => openField('worldtime')
    }, text(det.worldtime)) : null) : null, points.length ? /*#__PURE__*/React.createElement("section", {
      className: "m-ol-sec"
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-ol-sec-head"
    }, /*#__PURE__*/React.createElement("h3", null, TC('plotpts')), /*#__PURE__*/React.createElement("span", {
      className: "m-ol-count c-latin"
    }, points.length), /*#__PURE__*/React.createElement(PenButton, {
      label: en() ? 'Edit plot points' : '编辑关键情节点',
      onClick: () => openField('points.0')
    })), /*#__PURE__*/React.createElement("ol", {
      className: "m-ol-points"
    }, shownPoints.map((point, index) => /*#__PURE__*/React.createElement("li", {
      key: index
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => openField('points.' + index)
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-ol-node c-latin"
    }, index + 1), /*#__PURE__*/React.createElement(Clamp, {
      lines: 2
    }, /*#__PURE__*/React.createElement(PointText, {
      text: text(point)
    })), dirtyMark(['points', index]))))), points.length > Core.POINTS_PREVIEW ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-link m-ol-expand",
      "aria-expanded": allPoints,
      onClick: () => setAllPoints(value => !value)
    }, allPoints ? en() ? 'Show fewer' : '收起' : en() ? 'Show the other ' + (points.length - Core.POINTS_PREVIEW) : '展开其余 ' + (points.length - Core.POINTS_PREVIEW) + ' 条') : null) : null, /*#__PURE__*/React.createElement("section", {
      className: "m-ol-sec"
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-ol-sec-head"
    }, /*#__PURE__*/React.createElement("h3", null, TC('anchors'))), /*#__PURE__*/React.createElement("div", {
      className: "m-ol-anchors"
    }, Core.ANCHORS.map(key => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: key,
      onClick: () => openField('anchors.' + key)
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-ol-anchor-head"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: ANCHOR_ICONS[key],
      s: 14
    }), TC(key), dirtyMark(['anchors', key])), /*#__PURE__*/React.createElement(Clamp, {
      lines: 3
    }, text(det.anchors && det.anchors[key])))))), /*#__PURE__*/React.createElement("section", {
      className: "m-ol-sec"
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-ol-sec-head"
    }, /*#__PURE__*/React.createElement("h3", null, TC('infobound'))), /*#__PURE__*/React.createElement("div", {
      className: "m-ol-bounds"
    }, ['know', 'dontknow'].map(key => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: key,
      className: 'is-' + key,
      onClick: () => openField(key)
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-ol-bound-head"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "eye",
      s: 14
    }), TC(key), dirtyMark([key])), /*#__PURE__*/React.createElement(Clamp, {
      lines: 3
    }, Core.joined(det[key], text)))))), text(det.dilemma) ? /*#__PURE__*/React.createElement("section", {
      className: "m-ol-sec"
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-ol-sec-head"
    }, /*#__PURE__*/React.createElement("h3", null, TC('dilemma')), dirtyMark(['dilemma'])), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-ol-dilemma",
      onClick: () => openField('dilemma')
    }, /*#__PURE__*/React.createElement(Clamp, {
      lines: 3
    }, text(det.dilemma)))) : null, (det.info_voids || []).length ? /*#__PURE__*/React.createElement("section", {
      className: "m-ol-sec"
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-ol-sec-head"
    }, /*#__PURE__*/React.createElement("h3", null, TC('iv_title')), /*#__PURE__*/React.createElement("span", {
      className: "m-ol-count c-latin"
    }, det.info_voids.length)), /*#__PURE__*/React.createElement("div", {
      className: "iv-list"
    }, det.info_voids.map((item, index) => /*#__PURE__*/React.createElement(IVRow, {
      key: index,
      v: item,
      idx: index,
      edit: edit,
      dk: dk
    })))) : null, ledger.total ? /*#__PURE__*/React.createElement("section", {
      className: "m-ol-sec m-ol-ledger"
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-ol-sec-head"
    }, /*#__PURE__*/React.createElement("h3", null, en() ? 'Setups & debts' : '伏笔与债务'), /*#__PURE__*/React.createElement("span", {
      className: "m-muted"
    }, en() ? ledger.total + ' this chapter' : '本章 ' + ledger.total + ' 条'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-link m-ol-ledger-all",
      onClick: () => setSheet('ledger')
    }, TC('wb_rail'), /*#__PURE__*/React.createElement(Icon, {
      n: "caret",
      s: 13,
      w: 2
    }))), ledger.foreshadow.count ? /*#__PURE__*/React.createElement("div", {
      className: "m-ol-ledger-group"
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-ol-label"
    }, en() ? 'Setups' : '伏笔'), ledgerRows(ledger.foreshadow, 'foreshadow')) : null, ledger.debts.count ? /*#__PURE__*/React.createElement("div", {
      className: "m-ol-ledger-group"
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-ol-label"
    }, en() ? 'Debts' : '债务'), ledgerRows(ledger.debts, 'debts')) : null) : null, Sheet ? /*#__PURE__*/React.createElement(Sheet, {
      field: field,
      onClose: () => setFieldKey(null),
      onOpen: openField
    }) : null, /*#__PURE__*/React.createElement(Kit.Drawer, {
      open: sheet === 'writer',
      placement: "bottom",
      title: en() ? 'Writer' : '选择写手',
      onClose: () => setSheet(null)
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-choice-list",
      role: "radiogroup",
      "aria-label": en() ? 'Writer' : '选择写手'
    }, [['single', TC('wr_single'), TC('wr_single_tip')], ['muti', TC('wr_muti'), TC('wr_muti_tip')]].map(([key, label, tip]) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      role: "radio",
      key: key,
      "aria-checked": writerType === key,
      className: writerType === key ? 'on' : '',
      onClick: () => chooseWriter(key)
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-choice-mark",
      "aria-hidden": "true"
    }, writerType === key ? '◉' : '○'), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, label), /*#__PURE__*/React.createElement("span", {
      className: "m-muted"
    }, tip))))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold m-sheet-primary",
      disabled: runDisabled,
      onClick: () => {
        setSheet(null);
        run();
      }
    }, runLabel)), /*#__PURE__*/React.createElement(Kit.Drawer, {
      open: sheet === 'ledger',
      placement: "bottom",
      title: TC('wb_track'),
      onClose: () => setSheet(null)
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-ledger"
    }, /*#__PURE__*/React.createElement(window.WSMPanel, {
      wsm: data.wsm,
      collapsible: true,
      open: wsmOpen,
      onToggle: toggleWsm
    }), /*#__PURE__*/React.createElement("h3", {
      className: "m-section-label"
    }, TC('foreshadow')), /*#__PURE__*/React.createElement("div", {
      className: "c-fsd-list"
    }, (det.foreshadow || []).map((item, index) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: index,
      className: "c-fsd m-ledger-row",
      onClick: () => {
        setSheet(null);
        openField('foreshadow.' + index);
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: 'c-badge ' + fcls[item.op]
    }, TC(fmap[item.op])), /*#__PURE__*/React.createElement("span", {
      className: "c-latin fid"
    }, item.id), /*#__PURE__*/React.createElement("span", {
      className: "ft"
    }, text(item.t), text(item.when) ? /*#__PURE__*/React.createElement("span", {
      className: "fw"
    }, " \xB7 ", text(item.when)) : null)))), /*#__PURE__*/React.createElement("h3", {
      className: "m-section-label"
    }, TC('debts')), /*#__PURE__*/React.createElement("div", {
      className: "c-fsd-list"
    }, (det.debts || []).map((item, index) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: index,
      className: "c-fsd m-ledger-row",
      onClick: () => {
        setSheet(null);
        openField('debts.' + index);
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: 'c-badge ' + (item.op === 'new' ? 'terra' : 'gold')
    }, TC(item.op === 'new' ? 'debt_new' : 'debt_pay')), /*#__PURE__*/React.createElement("span", {
      className: "ft"
    }, text(item.t), text(item.when) ? /*#__PURE__*/React.createElement("span", {
      className: "fw"
    }, " \xB7 ", text(item.when)) : null)))), /*#__PURE__*/React.createElement("h3", {
      className: "m-section-label"
    }, TC('agent_line')), /*#__PURE__*/React.createElement(window.AgentRun, null))));
  }
  window.MobileOutlineLayout = MobileOutlineLayout;
})();
}
