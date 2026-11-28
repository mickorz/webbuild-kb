{
(function () {
  const {
    useMemo
  } = React;
  const L = window.L;
  const Core = window.LF_REWRITE_DIFF_CORE;
  function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }
  function isLocalized(value) {
    return isObject(value) && ('zh' in value || 'en' in value) && Object.keys(value).every(key => key === 'zh' || key === 'en');
  }
  function displayText(value) {
    if (value == null) return '';
    if (isLocalized(value)) return String(L(value) || '');
    if (typeof value === 'boolean') return value ? L({
      zh: '是',
      en: 'Yes'
    }) : L({
      zh: '否',
      en: 'No'
    });
    if (['string', 'number'].includes(typeof value)) return String(value);
    return '';
  }
  function fieldLabel(key) {
    const portal = window.LF_PORTAL;
    return portal && portal.fieldLabel ? L(portal.fieldLabel(key)) : String(key);
  }
  function pathLabel(path) {
    if (!path.length) return L({
      zh: '当前字段',
      en: 'Current field'
    });
    return path.map(part => isObject(part) && part.kind === 'item' ? part.label : fieldLabel(part)).join(' · ');
  }
  function ValueView({
    value
  }) {
    const text = displayText(value);
    if (text) return /*#__PURE__*/React.createElement("span", null, text);
    if (Array.isArray(value)) {
      if (!value.length) return /*#__PURE__*/React.createElement("span", {
        className: "cr-rdiff-empty"
      }, L({
        zh: '空列表',
        en: 'Empty list'
      }));
      return /*#__PURE__*/React.createElement("ul", {
        className: "cr-rdiff-values"
      }, value.map((item, index) => /*#__PURE__*/React.createElement("li", {
        key: index
      }, /*#__PURE__*/React.createElement(ValueView, {
        value: item
      }))));
    }
    if (isObject(value)) {
      const entries = Object.entries(value);
      if (!entries.length) return /*#__PURE__*/React.createElement("span", {
        className: "cr-rdiff-empty"
      }, L({
        zh: '空内容',
        en: 'Empty'
      }));
      return /*#__PURE__*/React.createElement("dl", {
        className: "cr-rdiff-object"
      }, entries.map(([key, item]) => /*#__PURE__*/React.createElement(React.Fragment, {
        key: key
      }, /*#__PURE__*/React.createElement("dt", null, fieldLabel(key)), /*#__PURE__*/React.createElement("dd", null, /*#__PURE__*/React.createElement(ValueView, {
        value: item
      })))));
    }
    return /*#__PURE__*/React.createElement("span", {
      className: "cr-rdiff-empty"
    }, L({
      zh: '空',
      en: 'Empty'
    }));
  }
  function TextChange({
    before,
    after
  }) {
    const ops = useMemo(() => Core.textOps(displayText(before), displayText(after)), [before, after]);
    return /*#__PURE__*/React.createElement("div", {
      className: "cr-rdiff-text"
    }, ops.map((part, index) => part.type === 'remove' ? /*#__PURE__*/React.createElement("del", {
      className: "cr-rdiff-remove",
      key: index
    }, part.value) : part.type === 'add' ? /*#__PURE__*/React.createElement("ins", {
      className: "cr-rdiff-add",
      key: index
    }, part.value) : /*#__PURE__*/React.createElement("span", {
      key: index
    }, part.value)));
  }
  function InlineTextDiff({
    before,
    after,
    showOriginal
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "cr-rdiff-inline"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-rdiff-inline-stack"
    }, /*#__PURE__*/React.createElement("div", {
      className: 'cr-rdiff-inline-pane' + (showOriginal ? '' : ' active'),
      "aria-hidden": showOriginal
    }, /*#__PURE__*/React.createElement(TextChange, {
      before: before,
      after: after
    })), /*#__PURE__*/React.createElement("div", {
      className: 'cr-rdiff-inline-pane cr-rdiff-original' + (showOriginal ? ' active' : ''),
      "aria-hidden": !showOriginal
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-rdiff-text"
    }, displayText(before)))));
  }
  function PlainList({
    items
  }) {
    if (!items.length) return /*#__PURE__*/React.createElement("div", {
      className: "cr-rdiff-list-empty"
    }, L({
      zh: '空列表',
      en: 'Empty list'
    }));
    return /*#__PURE__*/React.createElement("ul", {
      className: "cr-rdiff-list cr-rdiff-list-original c-structured-list-rows"
    }, items.map((item, index) => /*#__PURE__*/React.createElement("li", {
      key: index,
      className: "c-structured-list-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "c-structured-list-key c-latin"
    }, index + 1), /*#__PURE__*/React.createElement("span", {
      className: "c-structured-list-value"
    }, /*#__PURE__*/React.createElement(ValueView, {
      value: item
    })))));
  }
  function ListChangeRow({
    row
  }) {
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
    const number = (row.afterIndex == null ? row.beforeIndex : row.afterIndex) + 1;
    return /*#__PURE__*/React.createElement("li", {
      className: 'c-structured-list-row cr-rdiff-list-item ' + row.kind
    }, /*#__PURE__*/React.createElement("span", {
      className: "c-structured-list-key c-latin"
    }, number), /*#__PURE__*/React.createElement("span", {
      className: "c-structured-list-value"
    }, row.kind === 'change' ? /*#__PURE__*/React.createElement(TextChange, {
      before: row.before,
      after: row.after
    }) : /*#__PURE__*/React.createElement(ValueView, {
      value: row.kind === 'remove' ? row.before : row.after
    })), row.kind !== 'equal' && /*#__PURE__*/React.createElement("span", {
      className: 'cr-rdiff-list-kind ' + row.kind
    }, labels[row.kind]));
  }
  function InlineListDiff({
    before,
    after,
    showOriginal
  }) {
    const beforeItems = Array.isArray(before) ? before : [];
    const afterItems = Array.isArray(after) ? after : [];
    const rows = useMemo(() => Core.listOps(beforeItems, afterItems), [before, after]);
    return /*#__PURE__*/React.createElement("div", {
      className: "cr-rdiff-inline cr-rdiff-list-inline"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-rdiff-inline-stack"
    }, /*#__PURE__*/React.createElement("div", {
      className: 'cr-rdiff-inline-pane' + (showOriginal ? '' : ' active'),
      "aria-hidden": showOriginal
    }, rows.length ? /*#__PURE__*/React.createElement("ul", {
      className: "cr-rdiff-list c-structured-list-rows"
    }, rows.map((row, index) => /*#__PURE__*/React.createElement(ListChangeRow, {
      row: row,
      key: row.kind + '@' + index
    }))) : /*#__PURE__*/React.createElement("div", {
      className: "cr-rdiff-list-empty"
    }, L({
      zh: '空列表',
      en: 'Empty list'
    }))), /*#__PURE__*/React.createElement("div", {
      className: 'cr-rdiff-inline-pane cr-rdiff-original' + (showOriginal ? ' active' : ''),
      "aria-hidden": !showOriginal
    }, /*#__PURE__*/React.createElement(PlainList, {
      items: beforeItems
    }))));
  }
  function InlineStructuredDiff({
    before,
    after,
    showOriginal
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "cr-rdiff-inline cr-rdiff-structured-inline"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-rdiff-inline-stack"
    }, /*#__PURE__*/React.createElement("div", {
      className: 'cr-rdiff-inline-pane' + (showOriginal ? '' : ' active'),
      "aria-hidden": showOriginal
    }, /*#__PURE__*/React.createElement(RewriteDiff, {
      before: before,
      after: after
    })), /*#__PURE__*/React.createElement("div", {
      className: 'cr-rdiff-inline-pane cr-rdiff-original' + (showOriginal ? ' active' : ''),
      "aria-hidden": !showOriginal
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-rdiff-structured-original"
    }, /*#__PURE__*/React.createElement(ValueView, {
      value: before
    })))));
  }
  function ChangeValue({
    entry
  }) {
    if (entry.kind === 'change' && displayText(entry.before) !== '' && displayText(entry.after) !== '') {
      return /*#__PURE__*/React.createElement(TextChange, {
        before: entry.before,
        after: entry.after
      });
    }
    const value = entry.kind === 'remove' ? entry.before : entry.after;
    return /*#__PURE__*/React.createElement("div", {
      className: 'cr-rdiff-value ' + (entry.kind === 'remove' ? 'removed' : 'added')
    }, /*#__PURE__*/React.createElement(ValueView, {
      value: value
    }));
  }
  function RewriteDiff({
    before,
    after
  }) {
    const model = useMemo(() => Core.build(before, after), [before, after]);
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
    if (!model.entries.length) return null;
    return /*#__PURE__*/React.createElement("section", {
      className: "cr-rdiff",
      role: "region",
      "aria-label": L({
        zh: 'AI 改写差异',
        en: 'AI rewrite changes'
      })
    }, /*#__PURE__*/React.createElement("header", {
      className: "cr-rdiff-head"
    }, /*#__PURE__*/React.createElement("strong", null, L({
      zh: '改动明细',
      en: 'Changes'
    })), /*#__PURE__*/React.createElement("span", {
      className: "cr-rdiff-summary"
    }, Object.entries(model.summary).filter(([, count]) => count > 0).map(([kind, count]) => /*#__PURE__*/React.createElement("span", {
      key: kind,
      className: 'cr-rdiff-count ' + kind
    }, labels[kind], " ", count)))), /*#__PURE__*/React.createElement("div", {
      className: "cr-rdiff-list"
    }, model.entries.map((entry, index) => /*#__PURE__*/React.createElement("article", {
      className: "cr-rdiff-row",
      key: index
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-rdiff-row-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "cr-rdiff-path"
    }, pathLabel(entry.path)), /*#__PURE__*/React.createElement("span", {
      className: 'cr-rdiff-kind ' + entry.kind
    }, labels[entry.kind])), /*#__PURE__*/React.createElement(ChangeValue, {
      entry: entry
    })))));
  }
  window.LF_REWRITE_DIFF = {
    RewriteDiff,
    InlineTextDiff,
    InlineListDiff,
    InlineStructuredDiff,
    TextChange
  };
})();
}
