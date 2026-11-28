{
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const Core = window.CustomSettingsCore;
  const label = (zh, en) => Core.text(zh, en);
  function CustomSettingsView({
    bookId,
    bookTitle,
    controls,
    target,
    onAsk,
    assistantEnabled: assistantProp
  }) {
    const P = window.CustomSettingsParts;
    const History = window.CustomSettingsHistory;
    const assistantEnabled = assistantProp !== false;
    const loaderRef = useRef(null);
    if (!loaderRef.current) loaderRef.current = Core.createLoader(() => window.LF_API);
    const bookRef = useRef(bookId);
    bookRef.current = bookId;
    const [includeRemoved, setIncludeRemoved] = useState(false);
    const [savedView, setView] = useState({
      status: 'loading'
    });
    const [catalog, setCatalog] = useState(null);
    const [history, setHistory] = useState(false);
    const [notice, setNotice] = useState('');
    const [flash, setFlash] = useState('');
    const [op, setOp] = useState(null);
    const [opError, setOpError] = useState('');
    const [moreError, setMoreError] = useState('');
    const [loadingMore, setLoadingMore] = useState(false);
    const moreGuard = useRef(null);
    if (!moreGuard.current) moreGuard.current = Core.createController();
    const attempt = useRef(null);
    const operationEpoch = useRef(0);
    const selectedRef = useRef(null);
    const documentRef = useRef(null);
    const [returnFocus, setReturnFocus] = useState(null);
    const [blockFocus, setBlockFocus] = useState(null);
    const targetKey = [bookId, target?.definition_ref, target?.request_id].join(':');
    const requestKey = [targetKey, includeRemoved].join(':');
    const view = savedView.requestKey === requestKey ? savedView : {
      status: 'loading'
    };
    const editor = window.useCustomSettingEditor({
      bookId,
      onSaved: (ref, fieldKey) => {
        setFlash({
          fieldKey,
          text: label('已保存', 'Saved')
        });
        setReturnFocus({
          fieldKey
        });
        setNotice('');
        load(ref);
      },
      onClosed: fieldKey => {
        setReturnFocus({
          fieldKey
        });
        setNotice('');
        load(selectedRef.current);
      }
    });
    const mayNavigate = () => {
      if (!editor.active() && !op) return true;
      setNotice(label('请先保存或取消当前编辑。', 'Save or cancel the current edit first.'));
      return false;
    };
    const apply = result => {
      if (!result || result.ignored) return;
      if (!result.ok) {
        setView({
          status: 'error',
          error: result.error,
          requestKey
        });
        return;
      }
      selectedRef.current = result.definition?.definition_ref || null;
      setCatalog({
        bookId: result.bookId,
        definitions: result.definitions
      });
      setView({
        status: 'ready',
        ...result,
        requestKey
      });
    };
    const load = selectedDefinitionRef => {
      setHistory(false);
      setMoreError('');
      setLoadingMore(false);
      moreGuard.current.invalidate();
      const chosen = selectedDefinitionRef || selectedRef.current;
      return loaderRef.current.load({
        bookId,
        includeRemoved,
        target: chosen ? {
          definition_ref: chosen
        } : target,
        selectedDefinitionRef: chosen || null
      }).then(apply);
    };
    useEffect(() => {
      operationEpoch.current++;
      selectedRef.current = null;
      setCatalog(null);
      setNotice('');
      setFlash('');
      setOp(null);
      setOpError('');
      attempt.current = null;
    }, [targetKey]);
    useEffect(() => {
      setView({
        status: 'loading'
      });
      load(selectedRef.current);
      return () => {
        operationEpoch.current++;
        loaderRef.current.abort();
        moreGuard.current.invalidate();
      };
    }, [requestKey]);
    useEffect(() => {
      const refresh = event => {
        if (!Core.eventApplies(bookId, event) || editor.remoteUpdate()) return;
        load(selectedRef.current);
      };
      window.addEventListener('lf:custom-settings-updated', refresh);
      return () => window.removeEventListener('lf:custom-settings-updated', refresh);
    }, [bookId, requestKey]);
    const definition = view.definition;
    const outlineSource = editor.state?.definition || definition;
    const outlineContent = editor.state?.draft || definition?.content || {};
    const outlineReadable = React.useMemo(() => outlineSource && !Core.displayDefinition(outlineSource).incomplete, [outlineSource]);
    const outline = outlineReadable ? window.AssistantCustomSettingsCore.orderedProperties(outlineSource.json_schema).map(([key, schema]) => ({
      key,
      title: schema.title || key,
      count: Array.isArray(outlineContent[key]) ? outlineContent[key].length : undefined
    })) : [];
    const jump = index => {
      const key = outline[index]?.key;
      const section = Array.from(documentRef.current?.querySelectorAll('[data-cs-section]') || []).find(node => node.getAttribute('data-cs-section') === key);
      if (section) {
        section.scrollIntoView({
          block: 'start',
          behavior: 'auto'
        });
        section.focus({
          preventScroll: true
        });
      }
      if (editor.active()) return;
      if (key !== undefined) setBlockFocus({
        key,
        definitionRef: definition.definition_ref
      });
    };
    useEffect(() => {
      const key = editor.state?.fieldKey ?? returnFocus?.fieldKey;
      if (key === undefined) return;
      const section = Array.from(documentRef.current?.querySelectorAll('[data-cs-section]') || []).find(node => node.getAttribute('data-cs-section') === key);
      const control = editor.state ? section?.querySelector('textarea:not([readonly]), input, select') || section?.querySelector('.cs-field button:not(:disabled), [data-cs-add]:not(:disabled)') || section?.querySelector('[data-cs-cancel]:not(:disabled)') : section?.querySelector('.c-content-action.edit');
      control?.focus({
        preventScroll: true
      });
    }, [editor.state?.fieldKey, editor.state?.loading, returnFocus]);
    useEffect(() => {
      if (!editor.state?.error || !documentRef.current) return undefined;
      // Let object collections reveal the invalid item before moving keyboard focus.
      const timer = window.setTimeout(() => {
        const field = documentRef.current?.querySelector('[aria-invalid="true"]');
        const target = field || documentRef.current?.querySelector('.cs-entry-editor');
        if (!target) return;
        target.scrollIntoView({
          block: 'center',
          behavior: 'auto'
        });
        if (field) field.focus({
          preventScroll: true
        });
      }, 0);
      return () => window.clearTimeout(timer);
    }, [editor.state?.issues, editor.state?.error]);
    useEffect(() => {
      const cite = window.LF_ASSISTANT_CITE;
      if (!cite) return;
      if (view.status === 'ready' && definition && !history && !Core.displayDefinition(definition).incomplete) {
        cite.setObject({
          bookId,
          owner: Core.OWNER,
          resource_type: Core.RESOURCE_DEFINITION,
          resource_key: definition.definition_ref
        });
      } else cite.clear({
        owner: Core.OWNER
      });
      return () => cite.clear({
        owner: Core.OWNER
      });
    }, [bookId, view.status, definition, history]);
    const clearTransient = () => {
      setNotice('');
      setFlash('');
      setOpError('');
    };
    const ask = payload => {
      if (assistantEnabled && mayNavigate() && typeof onAsk === 'function') onAsk(payload);
    };
    const selectCategory = ref => {
      if (!mayNavigate() || definition?.definition_ref === ref) return;
      clearTransient();
      setView({
        status: 'loading'
      });
      load(ref);
    };
    const edit = fieldKey => {
      if (!definition || !mayNavigate()) return;
      loaderRef.current.abort();
      moreGuard.current.invalidate();
      setLoadingMore(false);
      clearTransient();
      return editor.open(definition.definition_ref, fieldKey);
    };
    const toggleRemoved = () => {
      if (!mayNavigate()) return;
      clearTransient();
      if (includeRemoved) selectedRef.current = view.definitions?.items.find(item => item.status === 'active')?.definition_ref || null;
      setIncludeRemoved(!includeRemoved);
    };
    const more = () => {
      if (loadingMore || !mayNavigate()) return;
      const token = moreGuard.current.begin();
      setLoadingMore(true);
      setMoreError('');
      loaderRef.current.moreDefinitions({
        bookId,
        includeRemoved,
        signal: token.signal
      }, view.definitions).then(result => {
        if (!token.isCurrent() || result.ignored) return;
        if (!result.ok) {
          setMoreError(label('更多类别暂时无法读取，请重试。', 'Could not load more categories. Please retry.'));
          return;
        }
        setView(current => current.status === 'ready' ? {
          ...current,
          definitions: result
        } : current);
        setCatalog({
          bookId,
          definitions: result
        });
      }).finally(() => {
        if (token.isCurrent()) setLoadingMore(false);
      });
    };
    const toggleGeneration = next => {
      if (!definition || !mayNavigate()) return;
      const ref = definition.definition_ref,
        book = bookId,
        epoch = operationEpoch.current;
      const body = {
        enabled_for_generation: next,
        base_version: definition.version
      };
      const signature = JSON.stringify([book, ref, body]);
      if (attempt.current?.signature !== signature) attempt.current = {
        signature,
        key: 'custom-generation-' + window.crypto.randomUUID()
      };
      setOp(ref);
      setOpError('');
      return Promise.resolve().then(() => window.LF_API.setCustomSettingGeneration(book, ref, body, {
        idempotencyKey: attempt.current.key
      })).then(() => {
        if (bookRef.current !== book || operationEpoch.current !== epoch) return;
        attempt.current = null;
        setOp(null);
        load(ref);
      }).catch(error => {
        if (bookRef.current !== book || operationEpoch.current !== epoch) return;
        const status = window.CustomSettingsEditorCore.failure(error).status;
        const uncertain = !status || status >= 500;
        if (!uncertain) attempt.current = null;
        setOp(null);
        setOpError(status === 409 ? label('设定刚被修改过，已重新读取，请确认后再切换。', 'The settings changed and were reloaded. Check them and switch again.') : uncertain ? label('切换结果未确认，已重新读取当前状态。', 'The result is unconfirmed; the current state was reloaded.') : label('开关没有保存，请重试。', 'The switch was not saved. Please retry.'));
        if (status === 409 || uncertain) load(ref);
      });
    };
    const nav = view.definitions || (catalog?.bookId === bookId ? catalog.definitions : null);
    const firstRun = view.status === 'ready' && !definition && !view.definitions.items.length;
    const retry = () => {
      if (mayNavigate()) {
        setView({
          status: 'loading'
        });
        load(selectedRef.current);
      }
    };
    const main = /*#__PURE__*/React.createElement("main", {
      className: "cs-main",
      ref: documentRef
    }, flash && view.status !== 'ready' ? /*#__PURE__*/React.createElement(P.Note, null, flash.text) : null, view.status === 'loading' ? /*#__PURE__*/React.createElement("div", {
      className: "cs-loading",
      role: "status",
      "aria-label": label('正在读取自定义设定', 'Loading custom settings')
    }, /*#__PURE__*/React.createElement("span", {
      className: "cs-loading-title",
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    })) : null, view.status === 'error' ? /*#__PURE__*/React.createElement("div", {
      className: "cs-state"
    }, /*#__PURE__*/React.createElement(P.Note, {
      tone: "alert"
    }, label('自定义设定暂时无法读取，请重试。', 'Could not load custom settings. Please retry.')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      onClick: retry
    }, label('重新加载', 'Retry'))) : null, view.status === 'ready' && definition ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(P.CategoryHeader, {
      definition: definition,
      assistantEnabled: assistantEnabled,
      editor: editor,
      includeRemoved: includeRemoved,
      generationPending: !!op,
      generationError: opError,
      onToggleGeneration: toggleGeneration,
      onGenerate: () => ask(Core.askGenerateContent(definition.definition_ref)),
      onAskStructure: () => ask(Core.askUpdateDefinition(definition.definition_ref)),
      onAskRemove: () => ask(Core.askRemoveDefinition(definition.definition_ref)),
      onHistory: () => {
        if (mayNavigate()) {
          clearTransient();
          setHistory(true);
        }
      },
      onToggleRemoved: toggleRemoved
    }), /*#__PURE__*/React.createElement(P.RulesPanel, {
      key: 'rules:' + definition.definition_ref,
      definition: definition
    }), notice && !editor.state ? /*#__PURE__*/React.createElement(P.Note, null, notice) : null, moreError ? /*#__PURE__*/React.createElement(P.Note, {
      tone: "alert"
    }, moreError) : null, /*#__PURE__*/React.createElement(P.DocumentBlocks, {
      key: 'document:' + definition.definition_ref,
      definition: definition,
      editor: editor,
      onEdit: edit,
      editDisabled: !!op,
      notice: notice,
      flash: flash,
      focus: blockFocus?.definitionRef === definition.definition_ref ? blockFocus : undefined,
      onCiteField: assistantEnabled ? fieldPath => ask(Core.askField(Core.RESOURCE_DEFINITION, definition.definition_ref, fieldPath)) : undefined
    })) : null);
    return /*#__PURE__*/React.createElement("div", {
      className: "c-main cs-page"
    }, /*#__PURE__*/React.createElement("div", {
      className: "c-top"
    }, /*#__PURE__*/React.createElement("div", {
      className: "c-crumb"
    }, bookTitle ? /*#__PURE__*/React.createElement(React.Fragment, null, "\u300A", bookTitle, "\u300B", /*#__PURE__*/React.createElement("span", {
      className: "sep"
    }, "/")) : null, /*#__PURE__*/React.createElement("b", null, label('自定义设定', 'Custom settings'))), /*#__PURE__*/React.createElement("div", {
      className: "cs-controls"
    }, controls)), /*#__PURE__*/React.createElement("div", {
      className: "c-body cs-body"
    }, firstRun ? /*#__PURE__*/React.createElement(P.FirstRun, {
      assistantEnabled: assistantEnabled,
      includeRemoved: includeRemoved,
      onCreate: example => ask(Core.askCreateDefinition(example)),
      onToggleRemoved: toggleRemoved
    }) : nav ? /*#__PURE__*/React.createElement("div", {
      className: "cs-layout"
    }, /*#__PURE__*/React.createElement(P.CategoryNav, {
      definitions: nav.items,
      selectedRef: definition?.definition_ref || selectedRef.current,
      onSelect: selectCategory,
      onCreate: () => ask(Core.askCreateDefinition()),
      assistantEnabled: assistantEnabled,
      outline: outline,
      onJump: jump,
      hasMore: view.status === 'ready' && nav.has_more,
      loadingMore: loadingMore,
      onMore: more
    }), main) : main), history && definition ? /*#__PURE__*/React.createElement(History, {
      key: [bookId, definition.definition_ref].join(':'),
      bookId: bookId,
      kind: "definition",
      resourceKey: definition.definition_ref,
      title: definition.name,
      definition: definition,
      loader: loaderRef.current,
      assistantEnabled: assistantEnabled,
      onClose: () => setHistory(false),
      onAsk: ask
    }) : null);
  }
  window.CustomSettingsView = CustomSettingsView;
})();
}
