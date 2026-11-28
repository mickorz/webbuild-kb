{
/* Phone layout of a book-creation generation step (FD-176): one status card, a vertical list of
   dimensions or characters, and a full-screen detail per item. Generation, review and saving stay in
   the desktop step components; they pass their computed rows and their own detail renderer here. */
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const en = () => window.CLANG === 'en';

  /**
   * rows: [{ key, name, sub, chip, ready, active, avatar }]
   * status: { title, sub, tone: 'run' | 'done' | 'error' }
   */
  function MobileCreatePhase({
    status,
    rows,
    notes,
    actions,
    detailIndex,
    onOpen,
    onClose,
    renderDetail
  }) {
    const open = detailIndex != null && rows[detailIndex] ? detailIndex : null;
    // Each item, and the list, starts at the top of the wizard's scroll area.
    const root = useRef(null);
    // The detail's page-level actions (revision history, editing its header) render into the bar.
    const [tools, setTools] = useState(null);
    const ToolsContext = window.LFDetailToolsContext;
    useEffect(() => {
      const scroller = root.current && root.current.closest('.cr-bodyw');
      if (scroller) scroller.scrollTop = 0;
    }, [open]);
    if (open != null) {
      const row = rows[open];
      const step = direction => {
        for (let i = open + direction; i >= 0 && i < rows.length; i += direction) if (rows[i].ready) return i;
        return null;
      };
      const previous = step(-1),
        next = step(1);
      return /*#__PURE__*/React.createElement("div", {
        className: "m-cr-detail",
        ref: root
      }, /*#__PURE__*/React.createElement("div", {
        className: "m-cr-detail-bar"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "m-icon-button",
        "aria-label": en() ? 'Back to list' : '返回列表',
        onClick: onClose
      }, /*#__PURE__*/React.createElement("span", {
        className: "m-cr-back"
      }, /*#__PURE__*/React.createElement(window.Icon, {
        n: "caret",
        s: 20,
        w: 2
      }))), /*#__PURE__*/React.createElement("div", {
        className: "m-cr-detail-title"
      }, /*#__PURE__*/React.createElement("b", {
        className: "c-serif"
      }, row.name), row.sub ? /*#__PURE__*/React.createElement("span", {
        className: "m-muted"
      }, row.sub) : null), /*#__PURE__*/React.createElement("div", {
        className: "m-cr-detail-tools",
        ref: setTools
      })), /*#__PURE__*/React.createElement("div", {
        className: "m-cr-detail-body"
      }, ToolsContext ? /*#__PURE__*/React.createElement(ToolsContext.Provider, {
        value: tools
      }, renderDetail(open)) : renderDetail(open)), /*#__PURE__*/React.createElement("div", {
        className: "m-cr-detail-nav"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn",
        disabled: previous == null,
        onClick: () => onOpen(previous)
      }, "\u2039 ", en() ? 'Previous' : '上一项'), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn",
        disabled: next == null,
        onClick: () => onOpen(next)
      }, next == null ? en() ? 'Last item' : '已是最后一项' : (en() ? 'Next: ' : '下一项：') + rows[next].name, " \u203A")));
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "m-cr-phase",
      ref: root
    }, /*#__PURE__*/React.createElement("section", {
      className: 'm-cr-status is-' + status.tone,
      role: "status"
    }, /*#__PURE__*/React.createElement("span", {
      className: 'c-dot ' + (status.tone === 'done' ? 'done' : status.tone === 'error' ? 'todo' : 'writing'),
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, status.title), status.sub ? /*#__PURE__*/React.createElement("span", {
      className: "m-muted"
    }, status.sub) : null)), notes, rows.length ? /*#__PURE__*/React.createElement("div", {
      className: "m-cr-list"
    }, rows.map((row, index) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: row.key || index,
      className: 'm-cr-row' + (row.active ? ' is-active' : ''),
      disabled: !row.ready,
      onClick: () => onOpen(index)
    }, row.avatar ? /*#__PURE__*/React.createElement("span", {
      className: "cr-cav",
      style: {
        background: row.avatar.tint
      },
      "aria-hidden": "true"
    }, row.avatar.mark) : /*#__PURE__*/React.createElement("span", {
      className: 'c-dot ' + (row.ready ? 'done' : row.active ? 'writing' : 'todo'),
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", {
      className: "m-cr-row-main"
    }, /*#__PURE__*/React.createElement("b", null, row.name), row.sub ? /*#__PURE__*/React.createElement("span", {
      className: "m-muted"
    }, row.sub) : null), row.chip ? /*#__PURE__*/React.createElement("span", {
      className: 'm-stage m-stage--' + row.chip.tone
    }, row.chip.label) : null, row.ready ? /*#__PURE__*/React.createElement("span", {
      className: "m-row-chevron",
      "aria-hidden": "true"
    }, "\u203A") : null))) : null, actions);
  }
  window.MobileCreatePhase = MobileCreatePhase;
})();
}
