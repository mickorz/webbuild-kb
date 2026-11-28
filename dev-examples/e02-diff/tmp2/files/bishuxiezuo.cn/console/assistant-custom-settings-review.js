{
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const Core = window.AssistantCustomSettingsCore;
  const label = (zh, en) => window.CLANG === "en" ? en : zh;

  // Only the visible page is mounted. The complete model and draft stay intact.
  function useDisplayPage(count, focusIndex) {
    const [page, setPage] = useState(0);
    const size = Core.DISPLAY_PAGE_SIZE;
    const last = Math.max(0, Math.ceil(count / size) - 1);
    useEffect(() => {
      if (Number.isInteger(focusIndex) && focusIndex >= 0 && focusIndex < count) setPage(Math.floor(focusIndex / size));
    }, [focusIndex]);
    const current = Math.min(page, last);
    return {
      page: current,
      start: current * size,
      end: Math.min(count, (current + 1) * size),
      count,
      setPage: next => setPage(Math.max(0, next))
    };
  }
  function PageControls({
    page,
    disabled,
    name = "",
    onPage
  }) {
    const [draft, setDraft] = useState(String(page.page + 1));
    useEffect(() => setDraft(String(page.page + 1)), [page.page]);
    if (page.count <= Core.DISPLAY_PAGE_SIZE) return null;
    const pages = Math.ceil(page.count / Core.DISPLAY_PAGE_SIZE);
    const choose = next => {
      page.setPage(next);
      if (onPage) onPage(next * Core.DISPLAY_PAGE_SIZE);
    };
    const go = () => {
      const next = Number(draft);
      if (Number.isInteger(next) && next >= 1 && next <= pages) choose(next - 1);else setDraft(String(page.page + 1));
    };
    return /*#__PURE__*/React.createElement("nav", {
      className: "cs-display-pages",
      "aria-label": name + label("分页", " pages")
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      disabled: disabled || page.page === 0,
      onClick: () => choose(page.page - 1)
    }, label("上一页", "Previous")), /*#__PURE__*/React.createElement("span", {
      role: "status"
    }, page.start + 1, "\u2013", page.end, " / ", page.count), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: 1,
      max: pages,
      step: 1,
      value: draft,
      disabled: disabled,
      "aria-label": name + label("页码", " page number"),
      onChange: event => setDraft(event.target.value),
      onBlur: go,
      onKeyDown: event => {
        if (event.key === "Enter") {
          event.preventDefault();
          go();
        }
      }
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      disabled: disabled || page.end >= page.count,
      onClick: () => choose(page.page + 1)
    }, label("下一页", "Next")));
  }
  function citeLabel(label, path, onCiteField) {
    if (typeof onCiteField !== "function" || !path) return label;
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "asst-custom__cite",
      onClick: () => onCiteField(path)
    }, label);
  }
  function Value({
    node,
    copy,
    onCiteField,
    fieldPath,
    arrayPath,
    depth = 0
  }) {
    const count = node?.kind === "object" ? node.rows.length : node?.kind === "list" ? node.items.length : 0;
    const page = useDisplayPage(count);
    if (!node) return null;
    const citePath = arrayPath || fieldPath || node.path || "";
    if (node.kind === "missing") return /*#__PURE__*/React.createElement("span", null, copy("asst_custom_unset"));
    if (node.kind === "unparsed") {
      const text = node.value === "" ? copy("asst_field_empty") : node.value == null ? copy("asst_custom_unset") : String(node.value);
      return /*#__PURE__*/React.createElement("span", {
        className: "asst-custom__text"
      }, text);
    }
    if (node.kind === "object") return node.rows.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("dl", {
      className: "asst-custom__values" + (depth >= 3 ? " is-deep" : "")
    }, node.rows.slice(page.start, page.end).map((row, index) => {
      const rowPath = row.path || (row.key != null ? Core.pointerJoin(fieldPath || "", row.key) : citePath);
      const childArrayPath = arrayPath || (row.value && row.value.kind === "list" ? rowPath : undefined);
      const kind = row.value?.kind;
      const wide = kind === "object" || kind === "list" || typeof row.value?.value === "string" && (row.value.value.length > 32 || row.value.value.includes("\n"));
      return /*#__PURE__*/React.createElement("div", {
        key: row.key || index,
        className: "asst-custom__field" + (wide ? " is-wide" : "") + (kind === "object" ? " is-group" : "")
      }, /*#__PURE__*/React.createElement("dt", null, citeLabel(row.label, arrayPath || rowPath, onCiteField)), /*#__PURE__*/React.createElement("dd", null, /*#__PURE__*/React.createElement(Value, {
        node: row.value,
        copy: copy,
        onCiteField: onCiteField,
        fieldPath: rowPath,
        arrayPath: childArrayPath,
        depth: depth + 1
      })));
    })), /*#__PURE__*/React.createElement(PageControls, {
      page: page
    })) : /*#__PURE__*/React.createElement("span", null, copy("asst_field_empty"));
    if (node.kind === "list") {
      const listPath = arrayPath || fieldPath || node.path || citePath;
      return node.items.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("ol", {
        className: "asst-custom__list" + (depth >= 3 ? " is-deep" : ""),
        start: page.start + 1
      }, node.items.slice(page.start, page.end).map((item, index) => /*#__PURE__*/React.createElement("li", {
        key: page.start + index
      }, /*#__PURE__*/React.createElement(Value, {
        node: item,
        copy: copy,
        onCiteField: onCiteField,
        fieldPath: listPath,
        arrayPath: listPath,
        depth: depth + 1
      })))), /*#__PURE__*/React.createElement(PageControls, {
        page: page
      })) : /*#__PURE__*/React.createElement("span", null, copy("asst_field_empty"));
    }
    if (node.kind === "boolean") return /*#__PURE__*/React.createElement("span", null, copy(node.value ? "asst_custom_yes" : "asst_custom_no"));
    return /*#__PURE__*/React.createElement("span", {
      className: "asst-custom__text"
    }, node.value === "" ? copy("asst_field_empty") : String(node.value));
  }
  function Definition({
    model,
    copy,
    onCiteField
  }) {
    const definition = model.definition;
    const page = useDisplayPage(model.rows.length);
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("dl", {
      className: "asst-action__facts"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-action__fact"
    }, /*#__PURE__*/React.createElement("dt", null, citeLabel(copy("asst_custom_name"), "/name", onCiteField)), /*#__PURE__*/React.createElement("dd", null, definition.name)), /*#__PURE__*/React.createElement("div", {
      className: "asst-action__fact"
    }, /*#__PURE__*/React.createElement("dt", null, citeLabel(copy("asst_custom_spec"), "/content_spec", onCiteField)), /*#__PURE__*/React.createElement("dd", {
      className: "asst-custom__text"
    }, definition.content_spec || copy("asst_custom_unset"))), /*#__PURE__*/React.createElement("div", {
      className: "asst-action__fact"
    }, /*#__PURE__*/React.createElement("dt", null, citeLabel(copy("asst_custom_generation"), "/enabled_for_generation", onCiteField)), /*#__PURE__*/React.createElement("dd", null, copy(definition.enabled_for_generation ? "asst_custom_yes" : "asst_custom_no"))), /*#__PURE__*/React.createElement("div", {
      className: "asst-action__fact"
    }, /*#__PURE__*/React.createElement("dt", null, citeLabel(copy("asst_custom_order"), "/sort_order", onCiteField)), /*#__PURE__*/React.createElement("dd", null, definition.sort_order))), definition.status === "removed" ? /*#__PURE__*/React.createElement("p", null, copy("asst_custom_removed")) : null, /*#__PURE__*/React.createElement("h4", null, copy("asst_custom_fields")), /*#__PURE__*/React.createElement("ul", {
      className: "asst-custom__schema"
    }, model.rows.slice(page.start, page.end).map(row => /*#__PURE__*/React.createElement("li", {
      key: row.path,
      style: {
        paddingInlineStart: Math.min(row.depth - 1, 5) + "em"
      }
    }, /*#__PURE__*/React.createElement("strong", null, citeLabel(row.label || copy("asst_custom_list_item"), "/json_schema", onCiteField)), /*#__PURE__*/React.createElement("span", null, copy("asst_custom_type_" + row.type), row.required ? " · " + copy(Core.presenceKey(row)) : ""), row.description ? /*#__PURE__*/React.createElement("p", null, row.description) : null, row.constraints.length ? /*#__PURE__*/React.createElement("p", null, row.constraints.map(({
      key,
      value
    }) => copy("asst_custom_" + key) + ": " + value).join(" · ")) : null, row.enum ? /*#__PURE__*/React.createElement("p", null, copy("asst_custom_choices"), ": ", row.enum.map(value => typeof value === "boolean" ? copy(value ? "asst_custom_yes" : "asst_custom_no") : value === "" ? copy("asst_field_empty") : String(value)).join(" / ")) : null))), /*#__PURE__*/React.createElement(PageControls, {
      page: page,
      name: copy("asst_custom_fields")
    }));
  }
  function Snapshot({
    model,
    showDefinition,
    copy,
    onCiteField
  }) {
    if (!model) return null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, showDefinition ? /*#__PURE__*/React.createElement(Definition, {
      model: model,
      copy: copy,
      onCiteField: onCiteField
    }) : /*#__PURE__*/React.createElement("h4", null, model.definition.name), /*#__PURE__*/React.createElement(Value, {
      node: model.value,
      copy: copy,
      onCiteField: onCiteField,
      fieldPath: "/content"
    }));
  }
  function ReviewContent({
    identity,
    copy,
    children
  }) {
    const Surface = window.AssistantInteractionUI?.ReviewSurface;
    return Surface ? /*#__PURE__*/React.createElement(Surface, {
      identity: identity,
      title: copy("asst_custom_review")
    }, children) : children;
  }
  function ReviewView({
    action,
    review,
    loading,
    error,
    onRetry,
    copy,
    expired
  }) {
    const isExpired = expired || review?.status === "expired";
    if (loading && !isExpired) return /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "asst-action__note"
    }, copy("asst_custom_loading"));
    const messageKey = isExpired && (!review || review.status === "ready") && !error ? "asst_proposal_expired" : Core.messageKey(action, review, error);
    const model = Core.reviewModel(action, review);
    const showDefinition = Core.operation(action).endsWith("_definition");
    return /*#__PURE__*/React.createElement("section", {
      className: "asst-action__field-review asst-custom",
      "aria-label": copy("asst_custom_review")
    }, messageKey ? /*#__PURE__*/React.createElement("p", {
      role: messageKey === "asst_proposal_expired" ? "status" : "alert",
      className: "asst-action__review-error"
    }, copy(messageKey)) : null, !isExpired && error && onRetry ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: onRetry
    }, copy("asst_retry")) : null, model ? /*#__PURE__*/React.createElement(ReviewContent, {
      identity: review,
      copy: copy
    }, !showDefinition && (model.after || model.before).definition.content_spec ? /*#__PURE__*/React.createElement("dl", {
      className: "asst-action__facts"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-action__fact"
    }, /*#__PURE__*/React.createElement("dt", null, copy("asst_custom_spec")), /*#__PURE__*/React.createElement("dd", {
      className: "asst-custom__text"
    }, (model.after || model.before).definition.content_spec))) : null, model.before ? /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, copy("asst_review_before")), /*#__PURE__*/React.createElement(Snapshot, {
      model: model.before,
      showDefinition: showDefinition,
      copy: copy
    })) : null, model.after ? /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, copy("asst_field_proposed")), /*#__PURE__*/React.createElement(Snapshot, {
      model: model.after,
      showDefinition: showDefinition,
      copy: copy
    })) : null) : null);
  }
  function useReview(action, enabled, onBusyChange, adapter) {
    const [result, setResult] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const busyRef = useRef(onBusyChange);
    busyRef.current = onBusyChange;
    const identity = Core.identity(action);
    useEffect(() => {
      if (!enabled) {
        setResult(null);
        return undefined;
      }
      const controller = new AbortController();
      let cancelled = false;
      setResult(null);
      if (busyRef.current) busyRef.current(true);
      Promise.resolve().then(() => {
        const api = adapter || window.LF_API;
        if (!api || typeof api.assistantActionCustomSettingsReview !== "function") throw new Error("missing_review_api");
        return api.assistantActionCustomSettingsReview(action.id, {
          signal: controller.signal
        });
      }).then(review => {
        if (cancelled) return;
        if (!review || review.action_id !== action.id || review.arguments_hash !== action.arguments_hash || review.operation !== Core.operation(action)) throw new Error("mismatched_review");
        setResult({
          identity,
          attempt,
          review,
          error: null
        });
      }).catch(error => {
        if (!cancelled) setResult({
          identity,
          attempt,
          review: null,
          error
        });
      }).finally(() => {
        if (!cancelled && busyRef.current) busyRef.current(false);
      });
      return () => {
        cancelled = true;
        controller.abort();
        if (busyRef.current) busyRef.current(false);
      };
    }, [enabled, identity, action && action.session_id, attempt, adapter]);
    const current = enabled && result && result.identity === identity && result.attempt === attempt ? result : null;
    return {
      loading: enabled && !current,
      review: current && current.review,
      error: current && current.error,
      retry: () => setAttempt(value => value + 1)
    };
  }
  window.AssistantCustomSettingsReview = {
    ReviewView,
    useReview,
    Value,
    Definition,
    Snapshot,
    useDisplayPage,
    PageControls
  };
})();
}
