{
/* Account personalization. Markdown is the only document; drafts stay in this tab until committed. */
(function () {
  const Core = window.AssistantPersonalizationCore;
  const Sync = window.AssistantPersonalizationSync;
  const AutoGrowTextarea = window.AutoGrowTextarea;
  const {
    useState,
    useEffect,
    useRef
  } = React;
  function copyFor(lang) {
    const en = lang === 'en';
    return {
      title: en ? 'Personalization' : '个性化',
      more: en ? 'More' : '更多',
      subtitle: en ? 'These preferences apply to future conversations with the assistant.' : '这些偏好用于后续与助手的会话。',
      hideHistory: en ? 'Close history' : '收起历史',
      loading: en ? 'Loading…' : '正在读取…',
      retry: en ? 'Retry' : '重试',
      save: en ? 'Save changes' : '保存修改',
      saving: en ? 'Saving…' : '正在保存…',
      saved: en ? 'Saved' : '已保存',
      unsaved: en ? 'Unsaved' : '未保存',
      discard: en ? 'Discard draft' : '放弃修改',
      history: en ? 'Version history' : '历史版本',
      earlier: en ? 'Earlier' : '更早',
      restore: en ? 'Restore this version' : '恢复此版本',
      current: en ? 'Back to current' : '返回当前',
      download: en ? 'Download' : '下载',
      reset: en ? 'Restore defaults' : '恢复默认',
      resetTitle: en ? 'Restore default settings?' : '恢复默认设置？',
      resetBody: en ? 'Your personalization will be cleared. Saved settings remain available in version history.' : '将清空个性化设置。原设置仍可从历史版本恢复。',
      resetDraftBody: en ? ' Unsaved changes will also be discarded.' : '未保存的修改也会丢弃。',
      resetDone: en ? 'Defaults restored' : '已恢复默认',
      historical: en ? 'Historical version' : '历史版本（只读）',
      emptyHistory: en ? 'No earlier versions.' : '还没有更早的版本。',
      oversize: en ? 'Too many characters.' : '字数超出上限。',
      unavailable: en ? 'Could not load. Try again later.' : '暂时无法读取，请稍后重试。',
      forbidden: en ? 'You do not have access.' : '暂无权限。',
      missing: en ? 'This version is no longer available.' : '找不到该版本。',
      invalid: en ? 'Check the content and try again.' : '请检查内容后重试。',
      auth: en ? 'Sign in again to continue.' : '请重新登录后再继续。',
      conflict: en ? 'This content changed elsewhere. Your draft is preserved. Reload before saving again.' : '内容已在别处修改，当前草稿已保留。请重新读取后再保存。',
      reload: en ? 'Reload latest' : '重新读取最新版本',
      cancel: en ? 'Cancel' : '取消',
      discardTitle: en ? 'Discard unsaved changes?' : '放弃未保存的修改？',
      discardBody: en ? 'These changes have not been saved.' : '这些修改尚未保存。',
      restoreTitle: en ? 'Restore this version?' : '恢复此版本？',
      restoreBody: en ? 'The current settings will be replaced. Earlier versions stay in history.' : '将用此版本替换当前设置。更早的版本仍留在历史中。',
      custom: en ? 'Custom instructions' : '自定义说明',
      customPlaceholder: en ? 'Additional preferences, boundaries, or requirements for future conversations.' : '补充希望在后续会话中持续生效的偏好、边界或要求。',
      emptyGroup: en ? 'Not filled yet' : '尚未填写',
      actors: {
        user: en ? 'You' : '你',
        assistant: en ? 'Assistant' : '助手',
        import: en ? 'Import' : '导入'
      }
    };
  }
  function formatWhen(value, lang) {
    if (!value) return '';
    const stamp = Date.parse(value);
    if (!Number.isFinite(stamp)) return String(value).slice(0, 16).replace('T', ' ');
    try {
      return new Intl.DateTimeFormat(lang === 'en' ? 'en' : 'zh-CN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(stamp));
    } catch (_) {
      return String(value).slice(0, 16).replace('T', ' ');
    }
  }
  function AssistantPersonalizationPanel({
    lang,
    userId,
    active = true
  }) {
    const copy = copyFor(lang);
    const [phase, setPhase] = useState(userId ? 'loading' : 'unavailable');
    const [editor, setEditor] = useState(null);
    const [error, setError] = useState(userId ? '' : 'auth');
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    function markBusy(value) {
      busyRef.current = value;
      setBusy(value);
    }
    const [notice, setNotice] = useState('');
    const [history, setHistory] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [openGroup, setOpenGroup] = useState(null);
    const editorRef = useRef(editor),
      liveRef = useRef(null),
      sequence = useRef(0),
      currentUser = useRef(userId);
    const moreRef = useRef(null),
      drawerRef = useRef(null),
      activeRef = useRef(active);
    activeRef.current = active;
    editorRef.current = editor;
    currentUser.current = userId;
    const api = window.LF_API;
    const newKey = () => 'personalization-' + crypto.randomUUID();
    const isCurrent = token => token === sequence.current && currentUser.current === userId;
    function show(next, extras = {}) {
      editorRef.current = next;
      setEditor(next);
      if (extras.error !== undefined) setError(extras.error);
      if (extras.notice !== undefined) setNotice(extras.notice);
      if (extras.history !== undefined) setHistory(extras.history);
      if (extras.phase) setPhase(extras.phase);
    }
    useEffect(() => {
      const protect = event => {
        if (!busyRef.current && (!editorRef.current || !editorRef.current.dirty)) return;
        event.preventDefault();
        event.returnValue = '';
      };
      window.addEventListener('beforeunload', protect);
      const onFocus = () => {
        const current = editorRef.current;
        if (busyRef.current || !current || current.dirty || current.historical || current.conflict) return;
        load({
          silent: true
        });
      };
      window.addEventListener('focus', onFocus);
      const onVisible = () => {
        if (document.visibilityState === 'visible') onFocus();
      };
      document.addEventListener('visibilitychange', onVisible);
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      const release = guard ? guard.registerNavigationBlocker(() => busyRef.current || !!(editorRef.current && editorRef.current.dirty)) : () => {};
      return () => {
        sequence.current += 1;
        Core.saveDraft(userId, editorRef.current);
        release();
        window.removeEventListener('beforeunload', protect);
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVisible);
      };
    }, [userId]);
    useEffect(() => {
      if (active === false && moreRef.current) moreRef.current.open = false;
    }, [active]);
    useEffect(() => {
      if (active === false || !history) return;
      const trigger = moreRef.current && moreRef.current.querySelector('summary');
      if (drawerRef.current) drawerRef.current.focus();
      return () => {
        if (activeRef.current !== false && trigger && trigger.isConnected) trigger.focus();
      };
    }, [active, !!history]);
    useEffect(() => {
      sequence.current += 1;
      liveRef.current = null;
      setHistory(null);
      setConfirm(null);
      markBusy(false);
      setNotice('');
      setOpenGroup(null);
      if (!userId) {
        show(null, {
          error: 'auth',
          phase: 'unavailable'
        });
        return;
      }
      const draft = Core.readDraft(userId);
      if (draft) show(draft, {
        error: draft.conflict ? 'conflict' : '',
        phase: 'ready'
      });else {
        show(null, {
          error: ''
        });
        load();
      }
    }, [userId]);
    useEffect(() => Sync.store.subscribe(userId, snapshot => {
      if (currentUser.current !== userId) return;
      const current = editorRef.current;
      if (current && snapshot.version <= current.version) return;
      liveRef.current = snapshot;
      if (busyRef.current || current?.historical || current?.conflict) return;
      if (current?.dirty) {
        const next = {
          ...current,
          conflict: true
        };
        Core.saveDraft(userId, next);
        show(next, {
          error: 'conflict'
        });
      } else show(Core.cleanState(snapshot), {
        error: '',
        notice: '',
        phase: 'ready'
      });
    }), [userId]);
    function abandonDraft() {
      Core.clearDraft(userId);
      if (editorRef.current) editorRef.current = {
        ...editorRef.current,
        dirty: false
      };
    }
    async function load(options) {
      if (!userId || busyRef.current) return;
      if (!api || typeof api.assistantPersonalization !== 'function') {
        setError('unavailable');
        setPhase(editorRef.current ? 'ready' : 'unavailable');
        return;
      }
      const force = options && options.force;
      if (!force && editorRef.current && editorRef.current.dirty) return;
      const silent = options && options.silent;
      const token = ++sequence.current;
      if (!silent) {
        setError('');
        setPhase(editorRef.current ? 'ready' : 'loading');
      }
      try {
        let snapshot = Core.normalizeSnapshot(await api.assistantPersonalization());
        if (!isCurrent(token)) return;
        if (!force && editorRef.current && editorRef.current.dirty) return;
        if (!snapshot) throw Object.assign(new Error('invalid'), {
          status: 422
        });
        snapshot = Sync.store.publish(userId, snapshot) || snapshot;
        liveRef.current = snapshot;
        if (!silent) setHistory(null);
        show(Core.cleanState(snapshot), {
          error: '',
          notice: '',
          phase: 'ready'
        });
      } catch (cause) {
        if (!isCurrent(token)) return;
        setError(Core.failure(cause));
        setPhase(editorRef.current ? 'ready' : 'unavailable');
      }
    }
    function discardThen(action) {
      if (editor && editor.dirty) setConfirm({
        kind: 'discard',
        action: () => {
          abandonDraft();
          action();
        }
      });else action();
    }
    async function save(reset = false) {
      if (busyRef.current || !editor || editor.conflict || editor.historical) return;
      if (reset ? editorRef.current !== editor || !editor.markdown && !editor.baseMarkdown : !editor.dirty || Core.tooLong(editor.markdown)) return;
      const token = ++sequence.current;
      const saveKey = (reset ? editor.resetKey : editor.saveKey) || newKey();
      const next = reset ? {
        ...editor,
        resetKey: saveKey
      } : {
        ...editor,
        saveKey
      };
      const target = reset ? {
        ...next,
        markdown: ''
      } : next;
      show(next, {
        error: '',
        notice: ''
      });
      markBusy(true);
      try {
        const snapshot = Core.normalizeSnapshot(await api.assistantPersonalizationSave(Core.writeRequest(target, saveKey)));
        if (!isCurrent(token)) return;
        if (snapshot && snapshot.markdown !== target.markdown) throw Object.assign(new Error('invalid'), {
          status: 503
        });
        if (!snapshot || snapshot.version <= next.version) throw Object.assign(new Error('invalid'), {
          status: 503
        });
        Core.clearDraft(userId);
        liveRef.current = Sync.store.publish(userId, snapshot) || snapshot;
        if (reset) setOpenGroup(null);
        show(Core.cleanState(liveRef.current), {
          error: '',
          notice: reset ? copy.resetDone : copy.saved,
          phase: 'ready'
        });
      } catch (cause) {
        if (!isCurrent(token)) return;
        const kind = Core.failure(cause);
        const conflicted = kind === 'conflict' ? {
          ...next,
          conflict: true
        } : next;
        if (kind === 'conflict') Core.saveDraft(userId, conflicted);
        show(conflicted, {
          error: kind
        });
      } finally {
        if (isCurrent(token)) markBusy(false);
      }
    }
    async function restore() {
      if (busyRef.current || !editor || !editor.historical) return;
      const token = ++sequence.current;
      const restoreKey = editor.restoreKey || newKey();
      const next = {
        ...editor,
        restoreKey
      };
      show(next, {
        error: ''
      });
      markBusy(true);
      try {
        const snapshot = Core.normalizeSnapshot(await api.assistantPersonalizationRestore(Core.restoreRequest(next, restoreKey)));
        if (!isCurrent(token)) return;
        if (snapshot && snapshot.markdown !== next.markdown) throw Object.assign(new Error('invalid'), {
          status: 503
        });
        if (!snapshot || snapshot.version <= next.version) throw Object.assign(new Error('invalid'), {
          status: 503
        });
        Core.clearDraft(userId);
        liveRef.current = Sync.store.publish(userId, snapshot) || snapshot;
        show(Core.cleanState(liveRef.current), {
          error: '',
          notice: copy.saved,
          history: null,
          phase: 'ready'
        });
      } catch (cause) {
        if (!isCurrent(token)) return;
        const kind = Core.failure(cause);
        show(kind === 'conflict' ? {
          ...next,
          conflict: true
        } : next, {
          error: kind
        });
      } finally {
        if (isCurrent(token)) markBusy(false);
      }
    }
    async function openHistory(before) {
      if (busyRef.current || !editor) return;
      const token = ++sequence.current;
      markBusy(true);
      setError('');
      try {
        const result = Core.normalizeHistory(await api.assistantPersonalizationVersions({
          limit: 50,
          before_version: before || undefined
        }));
        if (!isCurrent(token)) return;
        setHistory(before && history ? {
          versions: history.versions.concat(result.versions),
          next_before_version: result.next_before_version
        } : result);
      } catch (cause) {
        if (isCurrent(token)) setError(Core.failure(cause));
      } finally {
        if (isCurrent(token)) markBusy(false);
      }
    }
    async function preview(version) {
      if (busyRef.current) return;
      discardThen(async () => {
        markBusy(true);
        setError('');
        const token = ++sequence.current;
        try {
          const snapshot = Core.normalizeSnapshot(await api.assistantPersonalizationVersion(version));
          if (!isCurrent(token)) return;
          const live = liveRef.current;
          const next = Core.previewState(live || editor && {
            version: editor.version,
            template_markdown: editor.template_markdown
          }, snapshot, version);
          if (!next) throw Object.assign(new Error('invalid'), {
            status: 422
          });
          Core.clearDraft(userId);
          show(next, {
            error: '',
            notice: ''
          });
        } catch (cause) {
          if (isCurrent(token)) setError(Core.failure(cause));
        } finally {
          if (isCurrent(token)) markBusy(false);
        }
      });
    }
    function download() {
      const payload = Core.downloadPayload(editor ? editor.markdown : '');
      const blob = new Blob([payload.text], {
        type: payload.type
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = payload.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function message() {
      if (editor && Core.tooLong(editor.markdown)) return copy.oversize;
      if (!error) return '';
      return copy[error] || copy.unavailable;
    }
    function changeField(id, value) {
      if (busyRef.current || !editor || editor.conflict || editor.historical) return;
      const next = Core.editState(editor, Core.editForm(editor.markdown, id, value));
      editorRef.current = next;
      setEditor(next);
      setNotice('');
      Core.saveDraft(userId, next);
    }
    function showCurrent() {
      if (liveRef.current) show(Core.cleanState(liveRef.current), {
        error: '',
        notice: ''
      });else load({
        force: true
      });
    }
    function closeHistory() {
      if (!busyRef.current) setHistory(null);
    }
    function historyKeys(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeHistory();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const items = Array.from(drawerRef.current.querySelectorAll('button:not([disabled]),[tabindex="0"]'));
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === drawerRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    const form = editor ? Core.readForm(editor.markdown) : null;
    const oversize = !!(editor && Core.tooLong(editor.markdown));
    const Confirm = window.ConfirmDialog;
    const Icon = window.Icon;
    const Overlay = window.Portal || React.Fragment;
    const shown = active !== false;
    const historyOpen = !!(history && shown);
    const customOpen = openGroup === 'custom';
    function toggleGroup(id) {
      setOpenGroup(current => current === id ? null : id);
    }
    return /*#__PURE__*/React.createElement("section", {
      className: "asst-personalization",
      "aria-labelledby": "assistant-personalization-heading"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-settings-section-head asst-page-head"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-page-title"
    }, /*#__PURE__*/React.createElement("h2", {
      className: "set-panel-t",
      id: "assistant-personalization-heading"
    }, copy.title), /*#__PURE__*/React.createElement("p", null, copy.subtitle)), editor && phase !== 'loading' ? /*#__PURE__*/React.createElement("div", {
      className: "asst-settings-actions"
    }, /*#__PURE__*/React.createElement("details", {
      ref: moreRef,
      className: "asst-settings-more",
      onBlur: event => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      },
      onKeyDown: event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector('summary').focus();
        }
      },
      onClick: event => {
        if (event.target.closest('button')) event.currentTarget.open = false;
      }
    }, /*#__PURE__*/React.createElement("summary", {
      className: "c-btn sm"
    }, copy.more), /*#__PURE__*/React.createElement("div", {
      className: "asst-settings-more-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: () => openHistory()
    }, copy.history), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: download
    }, copy.download), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy || editor.conflict || editor.historical || !editor.markdown && !editor.baseMarkdown,
      onClick: () => setConfirm({
        kind: 'reset',
        action: () => save(true)
      })
    }, copy.reset))), editor.conflict ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      disabled: busy,
      onClick: () => discardThen(() => load({
        force: true
      }))
    }, copy.reload) : editor.historical ? historyOpen ? null : /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      disabled: busy,
      onClick: () => setConfirm({
        kind: 'restore',
        action: restore
      })
    }, copy.restore) : /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      disabled: busy || !editor.dirty || oversize,
      onClick: () => save()
    }, busy ? copy.saving : copy.save)) : null), phase === 'loading' ? /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "asst-settings-loading"
    }, copy.loading) : null, phase === 'unavailable' ? /*#__PURE__*/React.createElement("div", {
      className: "asst-personalization-empty asst-settings-state",
      role: "alert"
    }, /*#__PURE__*/React.createElement("p", null, message() || copy.unavailable), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: !userId,
      onClick: () => load()
    }, copy.retry)) : message() ? /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "asst-settings-error"
    }, message()) : null, editor && phase !== 'loading' ? /*#__PURE__*/React.createElement(React.Fragment, null, editor.historical && !historyOpen ? /*#__PURE__*/React.createElement("p", null, copy.historical) : null, editor.historical && !historyOpen ? /*#__PURE__*/React.createElement("pre", {
      tabIndex: "0"
    }, editor.markdown) : editor.historical ? null : /*#__PURE__*/React.createElement("div", {
      className: "asst-personalization-overview"
    }, Core.FORM_GROUPS.map(group => {
      const open = openGroup === group.title;
      const fieldsId = 'assistant-personalization-fields-' + group.title;
      return /*#__PURE__*/React.createElement("section", {
        key: group.title,
        className: 'asst-personalization-group' + (open ? ' is-open' : ''),
        "data-group": group.title
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        "aria-expanded": open,
        "aria-controls": open ? fieldsId : undefined,
        onClick: () => toggleGroup(group.title)
      }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, lang === 'en' ? group.en : group.title), /*#__PURE__*/React.createElement("small", null, Core.groupSummary(group, form, copy.emptyGroup))), Icon ? /*#__PURE__*/React.createElement(Icon, {
        n: open ? 'close' : 'pen',
        s: 16
      }) : null), open ? /*#__PURE__*/React.createElement("div", {
        id: fieldsId,
        className: "asst-personalization-fields"
      }, group.fields.map(field => /*#__PURE__*/React.createElement("label", {
        key: field.id,
        className: 'asst-personalization-field' + (field.wide ? ' asst-personalization-field--wide' : '')
      }, /*#__PURE__*/React.createElement("span", null, lang === 'en' ? field.en : field.label), /*#__PURE__*/React.createElement(AutoGrowTextarea, {
        "data-field": field.id,
        value: form.fields[field.id],
        disabled: busy || editor.conflict,
        onChange: event => changeField(field.id, event.target.value)
      })))) : null);
    }), /*#__PURE__*/React.createElement("section", {
      className: 'asst-personalization-group' + (customOpen ? ' is-open' : ''),
      "data-group": "custom"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      "aria-expanded": customOpen,
      "aria-controls": customOpen ? 'assistant-personalization-fields-custom' : undefined,
      onClick: () => toggleGroup('custom')
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, copy.custom), /*#__PURE__*/React.createElement("small", null, Core.customSummary(form, copy.emptyGroup))), Icon ? /*#__PURE__*/React.createElement(Icon, {
      n: customOpen ? 'close' : 'pen',
      s: 16
    }) : null), customOpen ? /*#__PURE__*/React.createElement("div", {
      id: "assistant-personalization-fields-custom",
      className: "asst-personalization-custom"
    }, /*#__PURE__*/React.createElement("textarea", {
      "data-field": "custom",
      "aria-label": copy.custom,
      placeholder: copy.customPlaceholder,
      value: form.custom,
      disabled: busy || editor.conflict,
      onChange: event => changeField('custom', event.target.value)
    })) : null)), /*#__PURE__*/React.createElement("div", {
      className: "asst-personalization-savebar"
    }, /*#__PURE__*/React.createElement("span", {
      role: "status"
    }, editor.dirty ? copy.unsaved : notice || (editor.historical ? copy.historical : copy.saved)), editor.dirty ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: () => discardThen(showCurrent)
    }, copy.discard) : null, editor.historical && !historyOpen ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: showCurrent
    }, copy.current) : null, editor.dirty ? /*#__PURE__*/React.createElement("span", {
      className: "asst-settings-count"
    }, Core.countChars(editor.markdown).toLocaleString(), " / ", Core.MAX_MARKDOWN.toLocaleString()) : null)) : null, historyOpen ? /*#__PURE__*/React.createElement(Overlay, null, /*#__PURE__*/React.createElement("div", {
      className: "cr-drawer-scrim asst-personalization-history-scrim",
      onMouseDown: event => {
        if (event.target === event.currentTarget) closeHistory();
      }
    }, /*#__PURE__*/React.createElement("aside", {
      ref: drawerRef,
      className: "cr-drawer asst-personalization-history",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "assistant-personalization-history-title",
      tabIndex: "-1",
      onMouseDown: event => event.stopPropagation(),
      onKeyDown: historyKeys
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-drawer-head"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ht"
    }, /*#__PURE__*/React.createElement("b", {
      id: "assistant-personalization-history-title"
    }, copy.history)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: closeHistory
    }, copy.hideHistory)), /*#__PURE__*/React.createElement("div", {
      className: "asst-personalization-history-body"
    }, /*#__PURE__*/React.createElement("ul", {
      className: "asst-personalization-versions"
    }, !history.versions.length ? /*#__PURE__*/React.createElement("li", null, copy.emptyHistory) : history.versions.map(item => /*#__PURE__*/React.createElement("li", {
      key: item.version
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: 'c-btn sm' + (editor && editor.previewVersion === item.version ? ' is-selected' : ''),
      disabled: busy,
      "aria-current": editor && editor.previewVersion === item.version ? 'true' : undefined,
      onClick: () => preview(item.version)
    }, (formatWhen(item.updated_at, lang) || copy.history) + (item.updated_by ? ' · ' + copy.actors[item.updated_by] : ''))))), history.next_before_version ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: () => openHistory(history.next_before_version)
    }, copy.earlier) : null, editor && editor.historical ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", null, copy.historical), /*#__PURE__*/React.createElement("pre", {
      tabIndex: "0"
    }, editor.markdown), /*#__PURE__*/React.createElement("div", {
      className: "asst-personalization-history-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: showCurrent
    }, copy.current), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      disabled: busy,
      onClick: () => setConfirm({
        kind: 'restore',
        action: restore
      })
    }, copy.restore))) : null)))) : null, Confirm && confirm && shown ? /*#__PURE__*/React.createElement(Confirm, {
      open: true,
      icon: null,
      className: "asst-personalization-confirm asst-confirm-dialog",
      title: confirm.kind === 'reset' ? copy.resetTitle : confirm.kind === 'restore' ? copy.restoreTitle : copy.discardTitle,
      message: confirm.kind === 'reset' ? copy.resetBody + (editor?.dirty ? copy.resetDraftBody : '') : confirm.kind === 'restore' ? copy.restoreBody : copy.discardBody,
      cancelLabel: copy.cancel,
      confirmLabel: confirm.kind === 'reset' ? copy.reset : confirm.kind === 'restore' ? copy.restore : copy.discard,
      tone: "danger",
      onClose: () => setConfirm(null),
      onConfirm: () => {
        const action = confirm;
        setConfirm(null);
        action.action();
      }
    }) : null);
  }
  window.AssistantPersonalizationPanel = AssistantPersonalizationPanel;
})();
}
