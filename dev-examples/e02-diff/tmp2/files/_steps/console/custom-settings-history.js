{
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const Core = window.CustomSettingsCore;
  const Review = window.AssistantCustomSettingsReview || {};
  const label = (zh, en) => Core.text(zh, en);
  function dateLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(window.CLANG === "en" ? "en-US" : "zh-CN");
  }
  function definitionFacts(definition) {
    if (!definition) return null;
    const facts = {};
    facts[label("类别名称", "Category")] = definition.name;
    facts[label("内容规范", "Content rules")] = definition.content_spec || "";
    facts[label("参与生成", "Used in generation")] = !!definition.enabled_for_generation;
    facts[label("显示顺序", "Display order")] = definition.sort_order;
    const copy = window.CustomSettingsParts.copy;
    const fields = {};
    const parents = [];
    Core.fieldTable(definition).rows.forEach((row, index) => {
      parents.length = row.depth - 2;
      parents.push(row.label || copy("asst_custom_list_item"));
      fields[index + 1 + ". " + parents.join(" / ")] = [row.label, copy("asst_custom_type_" + row.type), row.required ? copy(window.AssistantCustomSettingsCore.presenceKey(row)) : "", row.description || "", ...row.constraints.map(item => copy("asst_custom_" + item.key) + " " + item.value), row.enum ? row.enum.join(" / ") : ""].filter(Boolean).join(" · ");
    });
    facts[label("字段", "Fields")] = fields;
    facts[label("字段顺序", "Field order")] = Core.fieldTable(definition).rows.map(row => row.label || copy("asst_custom_list_item"));
    facts[label("内容", "Content")] = Core.labeledContent(definition.json_schema, definition.content);
    return facts;
  }
  function DefinitionValues({
    definition
  }) {
    const P = window.CustomSettingsParts;
    const rows = definition ? Core.fieldTable(definition).rows : [];
    const page = Review.useDisplayPage(rows.length);
    if (!definition) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "cs-entry-fields"
    }, /*#__PURE__*/React.createElement("dl", {
      className: "asst-custom__values"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, label("类别名称", "Category")), /*#__PURE__*/React.createElement("dd", null, definition.name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, label("内容规范", "Content rules")), /*#__PURE__*/React.createElement("dd", {
      className: "asst-custom__text"
    }, definition.content_spec || P.copy("asst_custom_unset"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, label("参与生成", "Used in generation")), /*#__PURE__*/React.createElement("dd", null, P.copy(definition.enabled_for_generation ? "asst_custom_yes" : "asst_custom_no"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, label("字段", "Fields")), /*#__PURE__*/React.createElement("dd", null, /*#__PURE__*/React.createElement("ul", {
      className: "dbk-card-reader-list"
    }, rows.slice(page.start, page.end).map(row => /*#__PURE__*/React.createElement("li", {
      key: row.path + ":" + row.depth
    }, (row.label || P.copy("asst_custom_list_item")) + " · " + P.copy("asst_custom_type_" + row.type) + (row.required ? " · " + P.copy(window.AssistantCustomSettingsCore.presenceKey(row)) : ""), row.constraints.length ? " · " + row.constraints.map(item => P.copy("asst_custom_" + item.key) + " " + item.value).join(" · ") : ""))), /*#__PURE__*/React.createElement(Review.PageControls, {
      page: page,
      name: label("字段", "Fields")
    })))), /*#__PURE__*/React.createElement(Review.Value, {
      node: Core.displayDefinition(definition).tree,
      copy: P.copy
    }));
  }
  function Side({
    detail,
    side
  }) {
    return /*#__PURE__*/React.createElement(DefinitionValues, {
      definition: detail[side]
    });
  }
  function largeRevision(detail, model) {
    return ["before", "after"].some(side => detail[side] && ((model[side]?.rows.length || 0) > window.AssistantCustomSettingsCore.DISPLAY_PAGE_SIZE || JSON.stringify(detail[side].content).length > 32768));
  }
  function RevisionBody({
    kind,
    detail,
    model,
    showOriginal
  }) {
    const Diff = window.LF_REWRITE_DIFF && window.LF_REWRITE_DIFF.InlineStructuredDiff;
    const removal = model.edit_mode === "remove";
    const large = largeRevision(detail, model);
    if (Diff && model.before && !removal && !large) {
      const before = definitionFacts(detail.before);
      const after = definitionFacts(detail.after);
      return /*#__PURE__*/React.createElement("div", {
        className: "cr-revision-diff"
      }, /*#__PURE__*/React.createElement(Diff, {
        before: before,
        after: after,
        showOriginal: showOriginal
      }));
    }
    if (!model.before || removal) {
      return /*#__PURE__*/React.createElement("div", {
        className: "cr-revision-diff"
      }, /*#__PURE__*/React.createElement("p", {
        className: "cs-note"
      }, removal ? label("这一版移除了这个类别，下面是移除前的内容。", "This version removed the category. Its content before removal is shown below.") : label("创建时保存的设定", "Settings when created")), /*#__PURE__*/React.createElement(Side, {
        kind: kind,
        detail: detail,
        side: removal ? "before" : "after"
      }));
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "cr-revision-diff"
    }, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, label("修改前", "Before")), /*#__PURE__*/React.createElement(Side, {
      kind: kind,
      detail: detail,
      side: "before"
    })), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, label("该版本保存结果", "Saved as")), /*#__PURE__*/React.createElement(Side, {
      kind: kind,
      detail: detail,
      side: "after"
    })));
  }
  function HistoryDrawer({
    bookId,
    kind,
    resourceKey,
    title,
    definition,
    loader,
    assistantEnabled,
    onClose,
    onAsk
  }) {
    const P = window.CustomSettingsParts;
    const Icon = window.Icon;
    const [list, setList] = useState(null);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState(null);
    const [result, setResult] = useState(null);
    const [loadingList, setLoadingList] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);
    const listGuard = useRef(null);
    const detailGuard = useRef(null);
    const drawerRef = useRef(null);
    const closeRef = useRef(onClose);
    const handedToAssistant = useRef(false);
    closeRef.current = onClose;
    if (!listGuard.current) listGuard.current = Core.createController();
    if (!detailGuard.current) detailGuard.current = Core.createController();
    const pick = revision => {
      const token = detailGuard.current.begin();
      setSelected(revision);
      setResult(null);
      setLoadingDetail(true);
      setError("");
      setShowOriginal(false);
      loader.revision(bookId, kind, resourceKey, revision.revision_ref, {
        signal: token.signal
      }).then(next => {
        if (!token.isCurrent() || next.ignored) return;
        if (!next.ok || next.model.version !== revision.version) throw new Error("invalid_revision");
        setResult(next);
      }).catch(() => {
        if (token.isCurrent()) setError(label("此版本暂时无法读取，请重新选择后重试。", "Could not read this version. Select it again to retry."));
      }).finally(() => {
        if (token.isCurrent()) setLoadingDetail(false);
      });
    };
    const loadList = (previous = null) => {
      const token = listGuard.current.begin();
      setLoadingList(true);
      setError("");
      if (!previous) {
        detailGuard.current.invalidate();
        setList(null);
        setSelected(null);
        setResult(null);
        setLoadingDetail(false);
      }
      loader.revisions(bookId, kind, resourceKey, {
        offset: previous ? previous.next_offset : 0,
        signal: token.signal
      }).then(next => {
        if (!token.isCurrent() || next.ignored) return;
        if (!next.ok) throw new Error("invalid_revisions");
        const revisions = previous ? Array.from(new Map(previous.revisions.concat(next.revisions).map(item => [item.revision_ref, item])).values()) : next.revisions;
        setList({
          ...next,
          revisions
        });
        if (!previous && revisions[0]) pick(revisions[0]);
      }).catch(() => {
        if (token.isCurrent()) setError(label("修订记录读取失败，请重试。", "Could not load revisions. Please retry."));
      }).finally(() => {
        if (token.isCurrent()) setLoadingList(false);
      });
    };
    useEffect(() => {
      loadList();
      return () => {
        listGuard.current.invalidate();
        detailGuard.current.invalidate();
      };
    }, [bookId, kind, resourceKey]);
    useEffect(() => {
      if (typeof document === "undefined") return undefined;
      const returnTarget = document.activeElement;
      const fallback = drawerRef.current?.closest('.cs-page')?.querySelector('.cs-menu-trigger');
      drawerRef.current?.querySelector('.edt-x')?.focus();
      const onKey = event => {
        if (event.key === "Escape") {
          event.preventDefault();
          closeRef.current();
          return;
        }
        if (event.key !== "Tab") return;
        const controls = Array.from(drawerRef.current?.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),[tabindex="0"]') || []);
        const first = controls[0],
          last = controls[controls.length - 1];
        if (!first) return;
        if (event.shiftKey && (document.activeElement === first || !drawerRef.current.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !drawerRef.current.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      };
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("keydown", onKey);
        if (handedToAssistant.current) return;
        if (returnTarget?.isConnected && returnTarget !== document.body) returnTarget.focus();else if (fallback?.isConnected) fallback.focus();
      };
    }, []);
    const model = result && result.model;
    const historyError = model && (model.error || model.before && model.before.error || model.after && model.after.error);
    const currentVersion = list && Number.isInteger(list.current_version) ? list.current_version : list && list.revisions[0] ? list.revisions[0].version : null;
    const isCurrent = selected && selected.version === currentVersion;
    const canRestore = selected && model && !loadingDetail && !historyError && model.after && !isCurrent && model.revision_ref === selected.revision_ref && model.version === selected.version;
    const askRestore = () => {
      if (typeof onAsk !== "function") return;
      handedToAssistant.current = true;
      closeRef.current();
      onAsk(Core.askRestore(Core.RESOURCE_DEFINITION, resourceKey, selected.version));
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "cr-drawer-scrim cs-history-scrim",
      onClick: onClose
    }, /*#__PURE__*/React.createElement("aside", {
      ref: drawerRef,
      className: "cr-drawer cr-revision-drawer cs-history",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": label("修订记录", "Revision history") + " · " + title,
      onClick: event => event.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-drawer-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ad"
    }, Icon ? /*#__PURE__*/React.createElement(Icon, {
      n: "clock",
      s: 18
    }) : null), /*#__PURE__*/React.createElement("div", {
      className: "ht"
    }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("i", null, label("修订记录", "Revision history"))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "edt-x",
      "aria-label": label("关闭", "Close"),
      title: label("关闭", "Close"),
      onClick: onClose
    }, "\xD7")), /*#__PURE__*/React.createElement("div", {
      className: "cr-revision-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-revision-list",
      "aria-label": label("版本列表", "Versions")
    }, loadingList && !list ? /*#__PURE__*/React.createElement("div", {
      className: "cr-revision-msg"
    }, label("正在读取修订记录…", "Loading revisions…")) : null, list && !list.revisions.length ? /*#__PURE__*/React.createElement("div", {
      className: "cr-revision-msg"
    }, label("暂无修订记录", "No revisions yet")) : null, (list && list.revisions || []).map(revision => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: revision.revision_ref,
      "aria-current": selected?.revision_ref === revision.revision_ref ? "true" : undefined,
      className: "cr-revision-item" + (selected && selected.revision_ref === revision.revision_ref ? " on" : ""),
      onClick: () => pick(revision)
    }, /*#__PURE__*/React.createElement("span", {
      className: "cr-revision-item-top"
    }, /*#__PURE__*/React.createElement("b", {
      className: "c-latin"
    }, "v", revision.version), revision.version === currentVersion ? /*#__PURE__*/React.createElement("span", {
      className: "cs-flag cs-flag-current"
    }, label("当前", "Current")) : /*#__PURE__*/React.createElement("span", null, Core.editModeLabel(revision.edit_mode))), revision.version === currentVersion ? /*#__PURE__*/React.createElement("small", null, Core.editModeLabel(revision.edit_mode)) : null, /*#__PURE__*/React.createElement("time", null, dateLabel(revision.created_at)))), list && list.has_more ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "cr-revision-item cs-history-more",
      disabled: loadingList,
      onClick: () => loadList(list)
    }, label("更早版本", "Earlier versions")) : null, !list && !loadingList && error ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "cr-revision-item cs-history-more",
      onClick: () => loadList()
    }, label("重试历史记录", "Retry history")) : null), /*#__PURE__*/React.createElement("div", {
      className: "cr-revision-detail"
    }, error ? /*#__PURE__*/React.createElement("div", {
      className: "cr-revision-error",
      role: "alert"
    }, error) : null, !selected && !error && list && list.revisions.length ? /*#__PURE__*/React.createElement("div", {
      className: "cr-revision-msg"
    }, label("选择一个版本查看改动", "Choose a version to inspect")) : null, selected ? /*#__PURE__*/React.createElement("div", {
      className: "cr-revision-detailbar"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", {
      className: "c-latin"
    }, "v", selected.version), /*#__PURE__*/React.createElement("span", null, Core.editModeLabel(selected.edit_mode), " \xB7 ", dateLabel(selected.created_at))), /*#__PURE__*/React.createElement("div", {
      className: "cr-revision-detail-actions"
    }, model && !historyError && model.before && window.LF_REWRITE_DIFF && !largeRevision(result.detail, model) ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => setShowOriginal(!showOriginal)
    }, showOriginal ? label("查看改动", "Show changes") : label("查看修改前", "Show before")) : null, canRestore && kind === "definition" ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: !assistantEnabled,
      onClick: askRestore
    }, label("让助手恢复此版本", "Ask assistant to restore")) : null)) : null, historyError ? /*#__PURE__*/React.createElement("div", {
      className: "cr-revision-error",
      role: "alert"
    }, P.problemText({
      code: historyError
    })) : null, loadingDetail ? /*#__PURE__*/React.createElement("div", {
      className: "cr-revision-msg"
    }, label("正在读取版本内容…", "Loading revision…")) : null, model && !historyError && !loadingDetail ? /*#__PURE__*/React.createElement(RevisionBody, {
      kind: kind,
      detail: result.detail,
      model: model,
      showOriginal: showOriginal
    }) : null))));
  }
  window.CustomSettingsHistory = HistoryDrawer;
})();
}
