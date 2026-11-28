{
/* Display and explicitly release a draft's frozen page reference. */
(function () {
  const {
    useEffect,
    useState
  } = React;
  const text = (zh, en) => window.CLANG === "en" ? en : zh;
  function targetParts(context, definition) {
    const page = context.pageContext || {};
    const parts = [window.L(context.bookTitle) || text("已选作品", "Selected book")];
    if (!page.resource_key) return parts.concat(text("自定义设定", "Custom settings"));
    parts.push(definition?.name || text("设定类别", "Setting category"));
    const pointer = window.AssistantCiteCore.parseCustomPointer(page.field_path);
    const keys = (pointer || []).map(key => key.replace(/~1/g, "/").replace(/~0/g, "~"));
    if (keys[0] === "content") keys.shift();
    let schema = definition?.json_schema;
    for (const key of keys) {
      schema = schema?.type === "array" ? schema.items : schema?.properties?.[key];
      parts.push(schema?.title || key);
    }
    return parts;
  }
  function useAssistantDraftTargetRemoval({
    contextRef,
    pendingSendRef,
    persist,
    inputRef,
    disabled
  }) {
    const [, refresh] = useState(0);
    return () => {
      if (disabled || pendingSendRef.current || !contextRef.current) return;
      const context = contextRef.current,
        page = context.pageContext || {};
      const store = window.LF_ASSISTANT_CITE,
        citation = store?.read(context.bookId);
      contextRef.current = null;
      if (citation && ['resource_type', 'resource_key', 'field_path'].every(key => (citation[key] || null) === (page[key] || null))) store.clear({
        owner: 'custom-settings-page'
      });
      persist(context);
      refresh(value => value + 1);
      inputRef.current?.focus();
    };
  }
  function AssistantDraftTarget({
    context,
    visible,
    onRemove,
    removeDisabled = false
  }) {
    const [resolved, setResolved] = useState(null);
    const bookId = context?.bookId;
    const page = context?.pageContext;
    const ref = page?.resource_type === "custom_setting_definition" ? page.resource_key : null;
    const identity = JSON.stringify([bookId, ref]);
    const current = resolved?.identity === identity && resolved.context === context ? resolved : null;
    useEffect(() => {
      if (!visible || page?.surface !== 'custom_settings' || !bookId || !ref || current) return undefined;
      const read = window.LF_API?.bookCustomSettingDefinition;
      if (!read) return undefined;
      const controller = new AbortController();
      let cancelled = false;
      Promise.resolve().then(() => read(bookId, ref, {
        signal: controller.signal
      })).then(definition => {
        if (!cancelled) setResolved({
          identity,
          context,
          definition: definition?.definition_ref === ref ? {
            name: definition.name,
            json_schema: definition.json_schema
          } : null
        });
      }).catch(() => {
        if (!cancelled) setResolved({
          identity,
          context,
          definition: null
        });
      });
      return () => {
        cancelled = true;
        controller.abort();
      };
    }, [visible, page?.surface, bookId, ref, identity, current, context]);
    if (!visible || !context || !bookId || page?.surface !== 'custom_settings') return null;
    const parts = targetParts(context, current?.definition);
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-draft-target",
      role: "status",
      "aria-label": text("本次引用", "Draft reference"),
      "aria-busy": Boolean(ref && !current && window.LF_API?.bookCustomSettingDefinition)
    }, /*#__PURE__*/React.createElement("span", {
      className: "asst-draft-target-label"
    }, text("引用", "Reference")), /*#__PURE__*/React.createElement("span", {
      className: "asst-draft-target-path"
    }, parts.map((part, index) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: index
    }, index ? /*#__PURE__*/React.createElement("span", {
      className: "asst-draft-target-separator",
      "aria-hidden": "true"
    }, "\u203A") : null, /*#__PURE__*/React.createElement("span", {
      className: index === parts.length - 1 ? "asst-draft-target-leaf" : undefined
    }, index === 0 ? "《" + part + "》" : part)))), onRemove ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "asst-draft-target-remove",
      onClick: onRemove,
      disabled: removeDisabled,
      "aria-label": text("移除引用", "Remove reference"),
      title: removeDisabled ? text("请先处理当前发送，再移除引用", "Resolve the current send before removing this reference") : text("移除引用", "Remove reference")
    }, /*#__PURE__*/React.createElement(window.Icon, {
      n: "close",
      s: 14
    })) : null);
  }
  window.AssistantDraftTarget = AssistantDraftTarget;
  window.useAssistantDraftTargetRemoval = useAssistantDraftTargetRemoval;
})();
}
