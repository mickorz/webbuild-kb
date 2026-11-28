{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const Core = window.CustomSettingsEditorCore;
  const label = (zh, en) => window.CLANG === 'en' ? en : zh;
  function issueText(issue) {
    const n = issue.limit;
    const text = {
      missing_required: label('请填写此项。', 'This field is required.'),
      number_required: label('请输入有效数字。', 'Enter a valid number.'),
      integer_required: label('请输入有效整数。', 'Enter a valid integer.'),
      minimum: label('不能小于 ' + n, 'Must be at least ' + n),
      maximum: label('不能大于 ' + n, 'Must be at most ' + n),
      too_short: label('至少填写 ' + n + ' 个字符。', 'Use at least ' + n + ' characters.'),
      too_long: label('最多填写 ' + n + ' 个字符。', 'Use at most ' + n + ' characters.'),
      too_few_items: label('至少添加 ' + n + ' 项。', 'Add at least ' + n + ' items.'),
      too_many_items: label('最多添加 ' + n + ' 项。', 'Use at most ' + n + ' items.'),
      enum_mismatch: label('请选择允许的值。', 'Choose an allowed value.')
    };
    return issue.message || text[issue.code] || label('此项不符合字段规则。', 'This field does not match its rules.');
  }
  function Fields({
    schema,
    value,
    onChange,
    path = '',
    name = '',
    required = true,
    issues = [],
    depth = 0
  }) {
    const Review = window.AssistantCustomSettingsReview;
    const List = window.StructuredList;
    const Textarea = window.AutoGrowTextarea;
    const Button = window.ContentActionButton;
    const id = React.useId();
    const errors = issues.filter(issue => issue.path === path || !path && issue.path === '/');
    const allowsEmpty = window.AssistantCustomSettingsCore.allowsEmptyText(schema);
    const attrs = {
      id,
      'aria-label': name,
      'aria-required': required && !allowsEmpty,
      'aria-invalid': errors.length > 0,
      'aria-describedby': errors.length ? id + '-error' : undefined,
      title: schema.description || undefined
    };
    const group = schema.type === 'object' || schema.type === 'array';
    const entries = schema.type === 'object' ? window.AssistantCustomSettingsCore.orderedProperties(schema) : [];
    const count = schema.type === 'object' ? entries.length : Array.isArray(value) ? value.length : 0;
    const firstIssue = issues.find(issue => issue.path.startsWith(path + '/'));
    const token = firstIssue?.path.slice(path.length + 1).split('/')[0];
    const focusIndex = schema.type === 'object' ? firstIssue ? entries.findIndex(([key]) => Core.pointer('', key) === '/' + token) : -1 : token === undefined ? -1 : Number(token);
    const page = Review.useDisplayPage(count, focusIndex);
    let control;
    if (value === undefined && group) {
      control = /*#__PURE__*/React.createElement(Button, {
        icon: "plus",
        onClick: () => onChange(Core.initial(schema))
      }, label('填写', 'Fill in'));
    } else if (schema.type === 'object') {
      const requiredKeys = new Set(schema.required || []);
      const rows = entries.slice(page.start, page.end).map(([key, child]) => ({
        key,
        label: (child.title || key) + (requiredKeys.has(key) ? window.AssistantCustomSettingsCore.allowsEmptyText(child) ? label('（可留空）', ' (may be empty)') : ' *' : ''),
        value: value && Core.own(value, key) ? value[key] : undefined
      }));
      control = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(List, {
        mode: "kv",
        embedded: true,
        controlled: true,
        items: rows,
        onDraftChange: next => onChange(next.reduce((result, row) => Core.field(result, row.key, row.value), {
          ...value
        })),
        renderEditValue: (childValue, row, index, change) => /*#__PURE__*/React.createElement(Fields, {
          schema: schema.properties[row.key],
          value: childValue,
          name: schema.properties[row.key].title || row.key,
          path: Core.pointer(path, row.key),
          required: requiredKeys.has(row.key),
          issues: issues,
          onChange: change,
          depth: depth + 1
        })
      }), /*#__PURE__*/React.createElement(Review.PageControls, {
        page: page,
        name: name
      }));
    } else if (schema.type === 'array') {
      const items = Array.isArray(value) ? value : [];
      const visible = items.slice(page.start, page.end);
      control = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(List, {
        mode: "list",
        embedded: true,
        controlled: true,
        items: visible,
        minItems: Math.max(0, (schema.minItems || 0) - (items.length - visible.length)),
        maxItems: visible.length + Math.max(0, Core.itemLimit(schema) - items.length),
        createItem: () => Core.initial(schema.items),
        onDraftChange: next => {
          if (next.length > visible.length) {
            onChange(items.concat(next.slice(visible.length)));
            page.setPage(Math.floor(items.length / window.AssistantCustomSettingsCore.DISPLAY_PAGE_SIZE));
          } else onChange(items.slice(0, page.start).concat(next, items.slice(page.end)));
        },
        renderEditValue: (item, row, index, change) => /*#__PURE__*/React.createElement(Fields, {
          schema: schema.items,
          value: item,
          required: true,
          path: Core.pointer(path, page.start + index),
          name: name + ' ' + (page.start + index + 1),
          issues: issues,
          onChange: change,
          depth: depth + 1
        })
      }), /*#__PURE__*/React.createElement(Review.PageControls, {
        page: page,
        name: name
      }));
    } else if (schema.enum || schema.type === 'boolean') {
      const options = schema.enum || [true, false];
      control = /*#__PURE__*/React.createElement("select", _extends({}, attrs, {
        className: "c-structured-list-input",
        value: value === undefined ? '' : String(options.indexOf(value)),
        onChange: event => onChange(event.target.value === '' ? undefined : options[Number(event.target.value)])
      }), /*#__PURE__*/React.createElement("option", {
        value: ""
      }, label('请选择', 'Choose')), options.map((item, index) => /*#__PURE__*/React.createElement("option", {
        key: index,
        value: String(index)
      }, typeof item === 'boolean' ? item ? label('是', 'Yes') : label('否', 'No') : String(item))));
    } else if (schema.type === 'number' || schema.type === 'integer') {
      control = /*#__PURE__*/React.createElement("input", _extends({}, attrs, {
        className: "c-structured-list-input",
        type: "text",
        inputMode: "decimal",
        value: value === undefined ? '' : value,
        placeholder: schema.description || label('未填写', 'Not set'),
        onChange: event => onChange(event.target.value === '' ? undefined : event.target.value)
      }));
    } else {
      control = /*#__PURE__*/React.createElement(Textarea, _extends({}, attrs, {
        className: "c-structured-list-input",
        value: value === undefined ? '' : value,
        placeholder: schema.description || label('未填写', 'Not set'),
        onChange: event => onChange(event.target.value)
      }));
    }
    // Clearing deletes an optional key; an empty string, zero or "no" stays a saved value.
    const clear = !required && value !== undefined ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "cs-field-clear",
      onClick: () => onChange(undefined),
      "aria-label": label('清除', 'Clear ') + name,
      title: label('清除此项', 'Clear this field')
    }, "\xD7") : null;
    return /*#__PURE__*/React.createElement("div", {
      className: 'cs-field cs-field-' + schema.type + (group ? ' cs-field-group' : '') + (group && depth >= 3 ? ' is-deep' : '') + (clear ? ' cs-field-clearable' : '')
    }, control, clear, errors.length ? /*#__PURE__*/React.createElement("p", {
      id: id + '-error',
      className: "cs-note cs-note-alert",
      role: "alert"
    }, errors.map(issueText).join(' ')) : null);
  }
  function useEditor({
    bookId,
    onSaved,
    onClosed
  }) {
    const [state, setState] = useState(null);
    const ref = useRef(null),
      epoch = useRef(0),
      release = useRef(null);
    const currentBook = useRef(bookId);
    currentBook.current = bookId;
    const update = next => {
      ref.current = next;
      setState(next);
    };
    const finish = () => {
      epoch.current++;
      update(null);
      if (release.current) release.current();
      release.current = null;
    };
    useEffect(() => {
      update(null);
      const protect = event => {
        const active = ref.current;
        if (!active || !active.dirty && !active.saving) return;
        event.preventDefault();
        event.returnValue = '';
      };
      window.addEventListener('beforeunload', protect);
      return () => {
        epoch.current++;
        ref.current = null;
        if (release.current) release.current();
        release.current = null;
        window.removeEventListener('beforeunload', protect);
      };
    }, [bookId]);
    const begin = (resourceType, resourceKey, session, load) => {
      if (ref.current) return;
      const token = ++epoch.current;
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      if (guard) release.current = guard.acquire({
        book_id: bookId,
        resource_type: resourceType,
        resource_key: resourceKey
      });
      update({
        bookId,
        loading: true,
        issues: [],
        ...session
      });
      return load().then(data => {
        if (epoch.current !== token || currentBook.current !== bookId) return;
        const Display = window.CustomSettingsCore;
        if (Display.displayDefinition(data.definition).incomplete || data.definition.status === 'removed' || !Core.own(data.definition.json_schema.properties, session.fieldKey)) throw new Error('unreadable_document');
        update({
          ...ref.current,
          ...data,
          baseline: Core.clone(data.draft),
          loading: false,
          dirty: false,
          error: ''
        });
      }).catch(() => {
        if (epoch.current === token && currentBook.current === bookId) update({
          ...ref.current,
          loading: false,
          error: label('无法读取可编辑的完整设定，请关闭后刷新重试。', 'Could not load the complete document. Close and refresh to retry.')
        });
      });
    };
    const open = (definitionRef, fieldKey) => begin('custom_setting_definition', definitionRef, {
      definitionRef,
      fieldKey
    }, () => Core.read(window.LF_API, bookId, definitionRef));
    const changeField = value => {
      const active = ref.current;
      if (!active || active.loading || !active.definition || active.saving || active.uncertain || active.conflict) return;
      const draft = Core.field(active.draft, active.fieldKey, value);
      update({
        ...active,
        draft,
        dirty: JSON.stringify(draft) !== JSON.stringify(active.baseline),
        issues: [],
        outsideIssues: false,
        error: ''
      });
    };
    const remoteUpdate = () => {
      if (!ref.current) return false;
      update({
        ...ref.current,
        remoteChanged: true
      });
      return true;
    };
    const close = () => {
      if (ref.current && ref.current.saving) return;
      const fieldKey = ref.current?.fieldKey;
      finish();
      if (onClosed) onClosed(fieldKey);
    };
    const save = async () => {
      const active = ref.current;
      if (!active || active.loading || active.saving || !active.definition || active.conflict) return;
      const prepared = Core.prepare(active.definition.json_schema, active.draft);
      if (prepared.issues.length) {
        const outside = Object.entries(active.definition.json_schema.properties).filter(([key]) => key !== active.fieldKey && prepared.issues.some(issue => issue.path === Core.pointer('', key) || issue.path.startsWith(Core.pointer('', key) + '/'))).map(([key, schema]) => schema.title || key);
        update({
          ...active,
          issues: prepared.issues,
          outsideIssues: outside.length > 0,
          error: outside.length ? label('其他区块（' + outside.join('、') + '）也不符合规则，当前修改尚未保存。可先复制草稿，取消后处理这些区块。', 'Other blocks (' + outside.join(', ') + ') also need corrections. This edit is not saved. Copy your draft, then cancel to correct those blocks.') : label('请检查标出的字段。', 'Check the highlighted fields.')
        });
        return;
      }
      if (JSON.stringify(prepared.content) === JSON.stringify(active.definition.content)) {
        close();
        return;
      }
      const attempt = Core.attempt(active, prepared.content, active.attempt, () => 'custom-content-' + window.crypto.randomUUID());
      const token = epoch.current;
      update({
        ...active,
        attempt,
        saving: true,
        error: '',
        issues: []
      });
      try {
        await window.LF_API.saveCustomSettingContent(bookId, active.definitionRef, attempt.body, {
          idempotencyKey: attempt.key
        });
        if (epoch.current !== token || currentBook.current !== bookId) return;
        finish();
        if (onSaved) onSaved(active.definitionRef, active.fieldKey);
      } catch (error) {
        if (epoch.current !== token || currentBook.current !== bookId) return;
        const result = Core.failure(error);
        const conflict = result.status === 409;
        const uncertain = !result.status || result.status >= 500;
        update({
          ...ref.current,
          saving: false,
          conflict,
          uncertain,
          issues: result.issues,
          error: conflict ? label('设定内容或结构已变化。草稿已保留，请取消编辑并重新读取后再修改。', 'The content or structure changed. Your draft is retained. Cancel and reload before editing again.') : uncertain ? label('保存结果暂未确认，草稿已保留。重试会核对同一次保存。', 'Save result is unconfirmed. Your draft is retained. Retry checks the same save.') : label('保存失败，草稿已保留。请检查字段或权限后重试。', 'Save failed. Your draft is retained. Check the fields or permissions and retry.')
        });
      }
    };
    return {
      state: state && state.bookId === bookId ? state : null,
      open,
      changeField,
      close,
      save,
      remoteUpdate,
      active: () => !!ref.current
    };
  }
  function EditorActions({
    editor
  }) {
    const state = editor.state;
    const [confirm, setConfirm] = useState(false);
    const Confirm = window.ConfirmDialog;
    const Button = window.ContentActionButton;
    if (!state) return null;
    const cancel = () => state.dirty ? setConfirm(true) : editor.close();
    const ready = state.definition && !state.loading;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      "data-cs-cancel": true,
      disabled: state.saving,
      onClick: cancel
    }, label('取消', 'Cancel')), ready ? /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: "check",
      disabled: state.saving || state.conflict,
      onClick: editor.save
    }, state.saving ? label('保存中…', 'Saving…') : state.uncertain ? label('重试保存', 'Retry save') : label('保存', 'Save')) : null, confirm && Confirm ? /*#__PURE__*/React.createElement(Confirm, {
      open: true,
      tone: "danger",
      icon: null,
      className: "cs-discard-dialog",
      title: state.uncertain ? label('离开当前编辑？', 'Leave this edit?') : label('放弃未保存的修改？', 'Discard unsaved changes?'),
      message: state.uncertain ? label('本次保存结果尚未确认。离开后会重新读取已保存内容。', 'This save is unconfirmed. Leaving will reload the saved content.') : label('未保存的修改将丢失，已保存的内容不受影响。', 'Unsaved changes will be lost. Saved content will stay unchanged.'),
      cancelLabel: label('继续编辑', 'Keep editing'),
      confirmLabel: label('放弃修改', 'Discard changes'),
      onClose: () => setConfirm(false),
      onConfirm: () => {
        setConfirm(false);
        editor.close();
      }
    }) : null);
  }
  function DocumentEditorStatus({
    editor,
    notice
  }) {
    const state = editor.state;
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);
    const copyEpoch = useRef(0);
    useEffect(() => {
      copyEpoch.current++;
      setCopied(false);
      setCopyFailed(false);
      return () => {
        copyEpoch.current++;
      };
    }, [state?.definitionRef, state?.fieldKey, state?.draft, state?.conflict]);
    const copyDraft = async () => {
      const token = ++copyEpoch.current;
      try {
        await window.navigator.clipboard.writeText(JSON.stringify(state.draft, null, 2));
        if (copyEpoch.current === token) {
          setCopied(true);
          setCopyFailed(false);
        }
      } catch (_) {
        if (copyEpoch.current === token) setCopyFailed(true);
      }
    };
    const Button = window.ContentActionButton;
    if (!state) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "cs-entry-editor"
    }, state.loading ? /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "cs-note"
    }, label('正在读取…', 'Loading…')) : null, notice ? /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "cs-note cs-note-warn"
    }, notice) : null, state.error ? /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "cs-note cs-note-alert"
    }, state.error) : null, state.conflict || state.outsideIssues ? /*#__PURE__*/React.createElement("div", {
      className: "cs-draft-recovery"
    }, /*#__PURE__*/React.createElement(Button, {
      onClick: copyDraft
    }, copied ? label('草稿已复制', 'Draft copied') : label('复制草稿', 'Copy draft')), copyFailed ? /*#__PURE__*/React.createElement("label", null, label('复制未成功，可从这里选取草稿。', 'Copy failed. Select your draft here.'), /*#__PURE__*/React.createElement("textarea", {
      readOnly: true,
      "aria-label": label('草稿备份', 'Draft backup'),
      value: JSON.stringify(state.draft, null, 2),
      onFocus: event => event.target.select()
    })) : null) : null, state.remoteChanged && !state.conflict ? /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "cs-note"
    }, label('已有新的保存结果；当前草稿已保留。', 'New saved content is available; your draft is retained.')) : null);
  }
  window.CustomSettingFields = Fields;
  window.useCustomSettingEditor = useEditor;
  window.CustomSettingDocumentEditorStatus = DocumentEditorStatus;
  window.CustomSettingEditorActions = EditorActions;
})();
}
