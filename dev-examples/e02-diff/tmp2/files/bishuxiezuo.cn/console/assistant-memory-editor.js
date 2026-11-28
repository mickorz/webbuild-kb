{
(function () {
  const Text = window.AssistantMemoryTextCore;
  const {
    useState,
    useEffect,
    useRef,
    useMemo
  } = React;
  function MemoryTextEditor({
    id,
    lang,
    onClose,
    onSaved
  }) {
    const en = lang === "en",
      Dialog = window.ConfirmDialog;
    const [base, setBase] = useState(null),
      [draft, setDraft] = useState({
        content: "",
        involving: "",
        when: ""
      });
    const parsed = useMemo(() => Text.parse(base?.text || ""), [base]);
    const composed = useMemo(() => Text.compose(parsed, draft), [parsed, draft]);
    const dirty = !!base && (!composed.ok || composed.text !== base.text);
    const [busy, setBusy] = useState(false),
      [error, setError] = useState("");
    const [latest, setLatest] = useState(null),
      [discard, setDiscard] = useState(false);
    const [checkRequired, setCheckRequired] = useState(false);
    const live = useRef(true),
      working = useRef(false),
      protectedRef = useRef(false),
      inputRef = useRef(null);
    protectedRef.current = busy || dirty;
    const message = code => ({
      memory_conflict: en ? "This memory changed. Review the latest text below; your draft is kept." : "记忆已被修改。请核对下方最新正文，草稿已保留。",
      memory_not_editable: en ? "This memory cannot be edited directly." : "这条记忆当前不能直接编辑。",
      memory_not_found: en ? "This memory no longer exists." : "这条记忆已不存在。",
      memory_save_unknown: en ? "Save outcome is unknown. Check the saved text before retrying." : "尚不能确认保存结果，请先核对已保存内容再继续。",
      memory_unauthorized: en ? "You no longer have access to this memory." : "当前已无权访问这条记忆。"
    })[code] || (en ? "Could not load or save memory. Your draft is kept." : "暂时无法读取或保存记忆，草稿已保留。");
    const checked = value => {
      if (!value || value.id !== id || typeof value.text !== "string" || !/^[a-f0-9]{64}$/.test(value.version)) throw Error("invalid item");
      return value;
    };
    const read = async (initial = false) => {
      if (working.current) return;
      working.current = true;
      setBusy(true);
      setLatest(null);
      try {
        const item = checked(await window.LF_API.assistantMemoryItem(id));
        if (!live.current) return;
        if (!item.editable) {
          setError("memory_not_editable");
          setCheckRequired(true);
          return;
        }
        if (initial) {
          setBase(item);
          setDraft(Text.parse(item.text));
          setError("");
        } else if (composed.ok && item.text === composed.text) {
          onSaved(item);
          return;
        } else {
          setLatest(item);
          setError("memory_conflict");
        }
      } catch (e) {
        if (live.current) setError(e?.detail?.code || "memory_unavailable");
      } finally {
        working.current = false;
        if (live.current) setBusy(false);
      }
    };
    useEffect(() => {
      live.current = true;
      read(true);
      const protect = event => {
        if (protectedRef.current) {
          event.preventDefault();
          event.returnValue = "";
        }
      };
      window.addEventListener?.("beforeunload", protect);
      const release = window.AssistantCiteCore?.editGuard?.registerNavigationBlocker(() => protectedRef.current);
      return () => {
        live.current = false;
        release?.();
        window.removeEventListener?.("beforeunload", protect);
      };
    }, [id]);
    const save = async () => {
      if (working.current || !base?.editable || !composed.ok || !dirty || checkRequired) return;
      working.current = true;
      setBusy(true);
      setError("");
      try {
        const item = checked(await window.LF_API.assistantMemoryUpdate(id, {
          text: composed.text,
          base_version: base.version
        }));
        if (item.text !== composed.text) throw Error("invalid saved text");
        if (live.current) onSaved(item);
      } catch (e) {
        if (live.current) {
          setError(e?.detail?.code || "memory_save_unknown");
          setCheckRequired(true);
        }
      } finally {
        working.current = false;
        if (live.current) setBusy(false);
      }
    };
    const close = () => {
      if (working.current) return;
      if (dirty) setDiscard(true);else onClose();
    };
    const change = key => event => {
      const value = event.target.value;
      setDraft(prior => ({
        ...prior,
        [key]: value
      }));
      setDiscard(false);
    };
    const invalid = base && !composed.ok ? {
      empty: en ? "Content cannot be empty." : "内容不能为空。",
      length: en ? "The combined memory exceeds 20,000 characters." : "合并后的记忆不能超过 20,000 字符。",
      ambiguous: en ? "Field separators are ambiguous. Check Content and the two fields before saving." : "字段分隔格式有歧义，请检查内容、涉及对象和发生时间后再保存。"
    }[composed.error] : "";
    return /*#__PURE__*/React.createElement(Dialog, {
      open: true,
      title: en ? "Edit memory" : "编辑记忆",
      icon: null,
      className: "asst-memory-editor",
      initialFocusRef: inputRef,
      onClose: close,
      onConfirm: save,
      cancelLabel: en ? "Cancel" : "取消",
      confirmLabel: busy ? en ? "Processing…" : "处理中…" : en ? "Save" : "保存",
      confirmDisabled: busy || !base?.editable || !composed.ok || !dirty || checkRequired
    }, base ? /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-editor-fields"
    }, /*#__PURE__*/React.createElement("label", null, en ? "Content" : "内容", /*#__PURE__*/React.createElement("textarea", {
      ref: inputRef,
      name: "content",
      value: draft.content,
      disabled: busy,
      onChange: change("content"),
      maxLength: 20000
    })), /*#__PURE__*/React.createElement("label", null, en ? "Involving" : "涉及对象", /*#__PURE__*/React.createElement("input", {
      type: "text",
      name: "involving",
      value: draft.involving,
      disabled: busy,
      onChange: change("involving"),
      maxLength: 20000,
      placeholder: en ? "People or entities, including aliases and roles" : "人物或实体，可保留别名和角色说明"
    })), /*#__PURE__*/React.createElement("label", null, en ? "When" : "发生时间", /*#__PURE__*/React.createElement("input", {
      type: "text",
      name: "when",
      value: draft.when,
      disabled: busy,
      onChange: change("when"),
      maxLength: 20000,
      placeholder: en ? "A date or description, such as after the battle" : "日期或时间描述，如大战之后"
    }))) : null, invalid ? /*#__PURE__*/React.createElement("p", {
      role: "alert"
    }, invalid) : null, !base && busy ? /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, en ? "Loading full text…" : "正在读取完整正文…") : null, error ? /*#__PURE__*/React.createElement("p", {
      role: "alert"
    }, message(error)) : null, error ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: () => read(!base)
    }, en ? "Check saved text" : "核对已保存内容") : null, latest ? /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-latest"
    }, /*#__PURE__*/React.createElement("strong", null, en ? "Latest saved memory" : "最新已保存记忆"), [['content', en ? 'Content' : '内容'], ['involving', en ? 'Involving' : '涉及对象'], ['when', en ? 'When' : '发生时间']].map(([key, label]) => {
      const value = Text.parse(latest.text)[key];
      return value ? /*#__PURE__*/React.createElement("div", {
        key: key
      }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("p", null, value)) : null;
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: () => {
        setBase(latest);
        setLatest(null);
        setCheckRequired(false);
        setError("");
      }
    }, en ? "Keep my draft and continue editing" : "保留我的草稿，继续编辑")) : null, discard ? /*#__PURE__*/React.createElement("div", {
      role: "alert"
    }, /*#__PURE__*/React.createElement("p", null, en ? "Discard your unsaved changes?" : "放弃尚未保存的修改？"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => setDiscard(false)
    }, en ? "Keep editing" : "继续编辑"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn danger sm",
      onClick: onClose
    }, en ? "Discard" : "放弃修改")) : null);
  }
  window.AssistantMemoryTextEditor = MemoryTextEditor;
})();
}
