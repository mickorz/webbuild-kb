{
/* Non-modal, message-scoped workspace picker. Uploads reuse the existing hash/version pipeline. */
(function () {
  const {
    useState,
    useRef,
    useEffect,
    useLayoutEffect
  } = React;
  const Core = window.AssistantReferenceCore,
    Upload = window.AssistantUploadCore,
    Workspace = window.AssistantWorkspaceCore;
  const parkedUploads = new Map();
  function useComposerDrop(inputRef, owner, add) {
    const active = useRef(null),
      latest = useRef({
        owner,
        add
      });
    latest.current = {
      owner,
      add
    };
    useEffect(() => {
      const element = inputRef.current?.closest('.asst-compose-input');
      if (!element) return;
      const clear = () => {
        active.current = null;
        element.removeAttribute('data-reference-drop');
      };
      const accepts = event => !latest.current.owner.disabled && active.current && active.current.scope === latest.current.owner.scope && Array.from(event.dataTransfer?.types || []).includes(Core.MIME);
      const over = event => {
        if (!accepts(event)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
        element.setAttribute('data-reference-drop', latest.current.owner.copy.drop);
      };
      const leave = event => {
        if (!element.contains(event.relatedTarget)) element.removeAttribute('data-reference-drop');
      };
      const drop = event => {
        if (!accepts(event)) return;
        event.preventDefault();
        event.stopPropagation();
        const snapshot = active.current;
        clear();
        if (event.dataTransfer.getData(Core.MIME) === snapshot.token) {
          inputRef.current?.setDropCaret?.(event.clientX, event.clientY);
          latest.current.add(snapshot.files);
        }
      };
      element.addEventListener('dragover', over);
      element.addEventListener('dragenter', over);
      element.addEventListener('dragleave', leave);
      element.addEventListener('drop', drop);
      document.addEventListener('dragend', clear);
      return () => {
        clear();
        element.removeEventListener('dragover', over);
        element.removeEventListener('dragenter', over);
        element.removeEventListener('dragleave', leave);
        element.removeEventListener('drop', drop);
        document.removeEventListener('dragend', clear);
      };
    }, [inputRef]);
    return (event, files) => {
      if (latest.current.owner.disabled || !files.length) {
        event.preventDefault();
        return;
      }
      const token = window.crypto.randomUUID();
      active.current = {
        token,
        files,
        scope: latest.current.owner.scope
      };
      event.dataTransfer.setData(Core.MIME, token);
      event.dataTransfer.effectAllowed = 'copy';
    };
  }
  function AssistantReferenceLibrary({
    accountId,
    scope = accountId,
    lang,
    disabled,
    attachmentsDisabled = disabled,
    citations,
    inputRef,
    onAdd,
    onPendingChange,
    controlRef
  }) {
    const copy = Core.copyFor(lang);
    const editingDisabled = disabled || attachmentsDisabled;
    const [open, setOpen] = useState(false),
      [query, setQuery] = useState(''),
      [folder, setFolder] = useState('');
    const [page, setPage] = useState({
        files: [],
        total: 0,
        offset: 0
      }),
      [phase, setPhase] = useState('idle'),
      [error, setError] = useState('');
    const [selection, setSelection] = useState([]),
      [preview, setPreview] = useState(null),
      [notice, setNotice] = useState('');
    const [uploads, setUploads] = useState([]),
      [dragging, setDragging] = useState(false);
    const [checking, setChecking] = useState([]),
      checkingRef = useRef(new Set()),
      failedOffset = useRef(0);
    const trigger = useRef(null),
      panel = useRef(null),
      search = useRef(null),
      selectionRef = useRef([]);
    const floatingWindow = window.useAssistantReferenceWindow(panel, open, trigger);
    const sequence = useRef(0),
      previewSequence = useRef(0),
      listAbort = useRef(null),
      previewAbort = useRef(null);
    const controller = useRef(null),
      uploadEntry = useRef(null),
      live = useRef(true),
      props = useRef(null);
    props.current = {
      accountId,
      scope,
      disabled,
      editingDisabled,
      citations,
      onAdd,
      onPendingChange,
      open,
      query,
      folder,
      copy
    };
    function select(files) {
      selectionRef.current = files;
      setSelection(files);
    }
    function close(focus = true) {
      setOpen(false);
      if (focus) trigger.current?.focus();
    }
    function request(name, params, options) {
      return window.LF_API.assistantWorkspaceRequest(name + (params ? '?' + Workspace.query(params) : ''), options);
    }
    async function load(offset = 0) {
      const token = ++sequence.current;
      listAbort.current?.abort();
      const abort = new AbortController();
      listAbort.current = abort;
      const current = props.current;
      failedOffset.current = offset;
      if (!offset) setPage({
        files: [],
        total: 0,
        offset: 0
      });
      setPhase(offset ? 'more' : 'loading');
      setError('');
      try {
        const status = await request('status', null, {
          signal: abort.signal
        });
        if (status.available !== true) throw Error('Unavailable');
        if (!live.current || token !== sequence.current || !props.current.open) return;
        const term = current.query.trim();
        const result = Core.pageOf(await request(term ? 'search' : 'files', {
          path: current.folder,
          query: term,
          offset,
          limit: 30
        }, {
          signal: abort.signal
        }));
        if (!live.current || token !== sequence.current || !props.current.open) return;
        setPage(prior => ({
          files: offset ? [...new Map([...prior.files, ...result.files].map(file => [Core.identity(file), file])).values()] : result.files,
          total: result.total,
          offset: offset + result.files.length
        }));
        setPhase('ready');
      } catch (cause) {
        if (live.current && token === sequence.current && !abort.signal.aborted) {
          const reason = Workspace.failure(cause);
          setError(reason);
          setPhase('error');
          if (reason === 'forbidden') {
            setPage({
              files: [],
              total: 0,
              offset: 0
            });
            select([]);
            setPreview(null);
          }
        }
      }
    }
    function chosen() {
      return selectionRef.current.filter(file => !Core.contains(props.current.citations, file));
    }
    async function toggle(file) {
      const owner = props.current.scope;
      if (props.current.editingDisabled || !Core.selectable(file) || Core.contains(props.current.citations, file)) return;
      if (!Core.contains(selectionRef.current, file) && !Core.readable(file)) {
        const id = Core.identity(file);
        if (checkingRef.current.has(id)) return;
        const checks = checkingRef.current;
        checks.add(id);
        setChecking([...checks]);
        try {
          const result = await request('text', Workspace.locatedFields(file, {
            version: file.version,
            limit: 1
          }));
          Core.previewOf(file, result);
          if (!live.current || !props.current.open || props.current.editingDisabled || props.current.scope !== owner) return;
          file = result.file;
          setPage(prior => ({
            ...prior,
            files: prior.files.map(item => Core.identity(item) === id ? file : item)
          }));
          if (!Core.readable(file)) {
            setNotice(copy.unsupported);
            return;
          }
        } catch (cause) {
          if (live.current && props.current.scope === owner) setNotice(copy[Workspace.failure(cause)] || copy.unavailable);
          return;
        } finally {
          checks.delete(id);
          if (live.current && checkingRef.current === checks) setChecking([...checks]);
        }
      }
      if (Core.contains(selectionRef.current, file)) select(selectionRef.current.filter(item => Core.identity(item) !== Core.identity(file)));else {
        const result = Core.merge(props.current.citations, [...chosen(), file], controller.current?.snapshot().length || 0);
        if (!result.accepted) {
          setNotice(copy[result.reason]);
          return;
        }
        select([...selectionRef.current, file]);
      }
      setNotice('');
    }
    async function add(files = chosen()) {
      const owner = props.current.scope;
      if (!live.current || props.current.editingDisabled || checkingRef.current.size || !files.length) return;
      const unknown = files.filter(file => !Core.readable(file) && !Core.contains(props.current.citations, file));
      if (unknown.length) {
        const checks = checkingRef.current;
        unknown.forEach(file => checks.add(Core.identity(file)));
        setChecking([...checks]);
        try {
          const verified = await Promise.all(unknown.map(async file => {
            const response = await request('text', Workspace.locatedFields(file, {
              version: file.version,
              limit: 1
            }));
            Core.previewOf(file, response);
            if (!Core.readable(response.file)) throw {
              status: 415
            };
            return response.file;
          }));
          if (!live.current || !props.current.open || props.current.editingDisabled || props.current.scope !== owner) return;
          files = files.map(file => verified.find(item => Core.identity(item) === Core.identity(file)) || file);
        } catch (cause) {
          if (live.current && props.current.scope === owner) setNotice(copy[Workspace.failure(cause)] || copy.unavailable);
          return;
        } finally {
          unknown.forEach(file => checks.delete(Core.identity(file)));
          if (live.current && checkingRef.current === checks) setChecking([...checks]);
        }
      }
      const result = props.current.onAdd(files);
      if (!result?.accepted) {
        setNotice(copy[result?.reason] || copy.invalid);
        return;
      }
      select(selectionRef.current.filter(item => !Core.contains(files, item)));
      setNotice('');
      if (!floatingWindow.floating) close(false);
      inputRef.current?.focus();
    }
    const startDrag = useComposerDrop(inputRef, {
      disabled: editingDisabled,
      copy,
      scope
    }, add);
    async function read(file) {
      if (props.current.disabled) return;
      previewAbort.current?.abort();
      const abort = new AbortController();
      previewAbort.current = abort;
      const token = ++previewSequence.current;
      setPreview({
        file,
        phase: 'loading'
      });
      try {
        const params = Workspace.locatedFields(file, {
          version: file.version,
          limit: 12000
        });
        if (!params) throw Error('Invalid file');
        if (Core.isImage(file)) {
          const blob = await window.LF_API.assistantWorkspaceImage(Workspace.downloadQuery(file), {
            signal: abort.signal
          });
          if (live.current && token === previewSequence.current) setPreview({
            file,
            phase: 'ready',
            image: URL.createObjectURL(blob)
          });
          return;
        }
        const response = await request('text', params, {
          signal: abort.signal
        });
        const result = Core.previewOf(file, response);
        if (live.current && token === previewSequence.current) setPreview({
          file: response.file,
          phase: 'ready',
          ...result
        });
      } catch (cause) {
        if (live.current && token === previewSequence.current && !abort.signal.aborted) setPreview({
          file,
          phase: 'error',
          reason: Workspace.failure(cause)
        });
      }
    }
    useEffect(() => () => {
      if (preview?.image) URL.revokeObjectURL(preview.image);
    }, [preview?.image]);
    function back() {
      previewSequence.current++;
      previewAbort.current?.abort();
      setPreview(null);
    }
    function uploader() {
      if (controller.current && controller.current.accountId !== String(accountId)) return null;
      if (!controller.current) {
        const entry = parkedUploads.get(accountId) || {
          controller: null,
          sink: null
        };
        entry.sink = {
          canEnqueue: items => Core.merge(props.current.citations, chosen(), items.length + 1).accepted,
          onLimit: () => {
            if (live.current) setNotice(props.current.copy.limit);
          },
          onChange: items => {
            if (!live.current) return;
            setUploads(items);
            props.current.onPendingChange?.(items.filter(item => item.status !== 'saved').length);
          },
          onSaved: file => {
            if (!live.current) return;
            if (Core.readable(file)) {
              if (!Core.contains(selectionRef.current, file) && !Core.contains(props.current.citations, file)) select([...selectionRef.current, file]);
              controller.current.snapshot().filter(item => Core.identity(item) === Core.identity(file) && item.version === file.version).forEach(item => controller.current.remove(item.id));
            }
            window.dispatchEvent(new CustomEvent('lf:workspace-files-changed'));
          }
        };
        entry.controller ||= Upload.createController({
          workspace: Workspace,
          request,
          newKey: () => 'workspace-' + window.crypto.randomUUID(),
          canEnqueue: items => entry.sink?.canEnqueue(items) || false,
          onLimit: () => entry.sink?.onLimit(),
          onChange: items => entry.sink?.onChange(items),
          onSaved: file => entry.sink?.onSaved(file)
        });
        controller.current = entry.controller;
        uploadEntry.current = entry;
        controller.current.bindAccount(accountId);
      }
      return controller.current;
    }
    function upload(files) {
      if (props.current.editingDisabled) return;
      back();
      setNotice('');
      setQuery('');
      setFolder('');
      return uploader()?.enqueue(files);
    }
    const drop = useRef(null);
    props.current.upload = upload;
    if (!drop.current) drop.current = Upload.createDropHandlers(files => {
      if (!props.current.editingDisabled) props.current.upload(files);
    });
    if (controlRef) controlRef.current = {
      cancelUnfinished: () => controller.current?.cancelUnfinished()
    };
    useEffect(() => drop.current.subscribe(setDragging), []);
    useEffect(() => {
      live.current = true;
      controller.current = null;
      uploadEntry.current = null;
      setUploads([]);
      if (parkedUploads.has(accountId)) uploader();
      return () => {
        live.current = false;
        sequence.current++;
        previewSequence.current++;
        listAbort.current?.abort();
        previewAbort.current?.abort();
        controller.current?.cancelUnfinished();
        controller.current?.bindAccount(null);
        if (controller.current?.snapshot(accountId).some(item => item.status === 'uncertain')) parkedUploads.set(accountId, uploadEntry.current);else parkedUploads.delete(accountId);
        if (uploadEntry.current) uploadEntry.current.sink = null;
        props.current.onPendingChange?.(0);
        if (controlRef) controlRef.current = null;
      };
    }, [accountId]);
    useEffect(() => {
      if (!open) {
        sequence.current++;
        previewSequence.current++;
        listAbort.current?.abort();
        previewAbort.current?.abort();
        return;
      }
      back();
      const timer = window.setTimeout(() => load(0), query.trim() ? 250 : 0);
      return () => {
        window.clearTimeout(timer);
        sequence.current++;
        listAbort.current?.abort();
      };
    }, [open, query, folder]);
    useEffect(() => {
      if (disabled) close(false);
    }, [disabled]);
    useEffect(() => {
      select([]);
      checkingRef.current = new Set();
      setChecking([]);
    }, [scope]);
    useEffect(() => {
      const changed = () => {
        if (props.current.open) load(0);
      };
      window.addEventListener('lf:workspace-files-changed', changed);
      return () => window.removeEventListener('lf:workspace-files-changed', changed);
    }, []);
    useLayoutEffect(() => {
      if (!open || !panel.current) return;
      const el = panel.current;
      search.current?.focus();
      const outside = event => {
        if (!document.querySelector('.lf-err-scrim, .c-confirm-scrim') && !floatingWindow.floating && !el.contains(event.target) && !trigger.current?.contains(event.target)) close(false);
      };
      const escape = event => {
        if (event.key !== 'Escape' || document.querySelector('.lf-err-scrim, .c-confirm-scrim')) return;
        event.preventDefault();
        event.stopPropagation();
        close();
      };
      document.addEventListener('pointerdown', outside);
      document.addEventListener('keydown', escape, true);
      return () => {
        document.removeEventListener('pointerdown', outside);
        document.removeEventListener('keydown', escape, true);
      };
    }, [open, inputRef, floatingWindow.floating]);
    const selected = chosen(),
      pending = uploads.filter(item => item.status !== 'saved').length;
    const queue = uploads.length ? /*#__PURE__*/React.createElement(window.AssistantUploadQueue, {
      lang: lang,
      items: uploads,
      disabled: editingDisabled,
      onRetry: item => uploader()?.retry(item.id),
      onCopy: item => uploader()?.saveCopy(item.id),
      onSkip: item => uploader()?.skip(item.id),
      onRemove: item => {
        const result = uploader()?.remove(item.id);
        if (result?.uncertain) setNotice(window.AssistantUploadCore.uploadCopy(lang).removedUncertain);
      }
    }) : null;
    function row(file) {
      const attached = Core.contains(citations, file),
        checked = Core.contains(selection, file),
        available = Core.selectable(file),
        verifying = checking.includes(Core.identity(file));
      const name = Workspace.displayName(file);
      const kind = file.kind || Workspace.kindFromPath(file.path);
      const when = file.updated_at && !Number.isNaN(Date.parse(file.updated_at)) ? new Date(file.updated_at).toLocaleDateString(lang === 'en' ? 'en' : 'zh-CN') : '';
      return /*#__PURE__*/React.createElement("div", {
        key: Core.identity(file),
        className: 'asst-reference-row' + (checked || attached ? ' is-selected' : ''),
        draggable: available && !editingDisabled && !attached && !verifying,
        onDragStart: event => startDrag(event, checked ? selected : [file])
      }, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: checked || attached,
        disabled: editingDisabled || attached || !available || verifying,
        "aria-label": copy.select + ' ' + name,
        title: !available ? copy.unsupported : undefined,
        onChange: () => toggle(file)
      }), /*#__PURE__*/React.createElement("span", {
        className: "asst-reference-filetype",
        "aria-hidden": "true"
      }, name.split('.').pop().slice(0, 4).toUpperCase()), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "asst-reference-name",
        onClick: () => read(file),
        title: name
      }, /*#__PURE__*/React.createElement("strong", null, name), /*#__PURE__*/React.createElement("small", null, [verifying ? copy.loading : copy[kind], typeof file.size === 'number' ? Math.max(1, Math.ceil(file.size / 1024)) + ' KiB' : '', when].filter(Boolean).join(' · '))), attached ? /*#__PURE__*/React.createElement("small", null, copy.attached) : !available ? /*#__PURE__*/React.createElement("small", {
        title: copy.unsupported
      }, copy.unreadable) : /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "asst-reference-preview-button",
        onClick: () => read(file),
        "aria-label": copy.preview + ' ' + name
      }, copy.preview));
    }
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      ref: trigger,
      type: "button",
      className: "asst-function-button",
      disabled: disabled,
      "aria-label": copy.trigger,
      "aria-expanded": open,
      "aria-haspopup": "dialog",
      onClick: () => setOpen(value => !value)
    }, /*#__PURE__*/React.createElement(window.Icon, {
      n: "file",
      s: 16
    }), /*#__PURE__*/React.createElement("span", null, copy.trigger), pending ? /*#__PURE__*/React.createElement("small", null, "(", pending, ")") : null), open ? floatingWindow.wrap(/*#__PURE__*/React.createElement("section", {
      ref: panel,
      style: floatingWindow.style,
      className: "asst-reference-library" + (floatingWindow.floating ? " is-floating" : ""),
      role: "dialog",
      "aria-label": copy.title,
      "aria-modal": "false",
      "data-assistant-window": floatingWindow.floating ? 'library' : undefined,
      onDragEnter: drop.current.onDragEnter,
      onDragOver: drop.current.onDragOver,
      onDragLeave: drop.current.onDragLeave,
      onDrop: drop.current.onDrop
    }, /*#__PURE__*/React.createElement("header", {
      className: "asst-reference-heading",
      tabIndex: 0,
      "aria-label": floatingWindow.floating ? lang === 'en' ? 'Move library' : '移动资料库' : lang === 'en' ? 'Resize library height' : '调整资料库高度',
      onPointerDown: floatingWindow.start,
      onKeyDown: floatingWindow.keyMove
    }, /*#__PURE__*/React.createElement("h3", null, copy.title), /*#__PURE__*/React.createElement(window.AssistantUploadTrigger, {
      lang: lang,
      className: "c-btn sm",
      disabled: editingDisabled,
      label: copy.upload,
      onFiles: upload
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "asst-icon-button",
      onClick: floatingWindow.detach,
      "data-tooltip": floatingWindow.floating ? lang === 'en' ? 'Dock library' : '收回资料库' : lang === 'en' ? 'Float library' : '浮动资料库',
      "aria-label": floatingWindow.floating ? lang === 'en' ? 'Dock library' : '收回资料库' : lang === 'en' ? 'Float library' : '浮动资料库'
    }, /*#__PURE__*/React.createElement(window.Icon, {
      n: floatingWindow.floating ? 'dock' : 'float',
      s: 18
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "asst-icon-button",
      onClick: () => close(),
      "data-tooltip": copy.close,
      "aria-label": copy.close
    }, /*#__PURE__*/React.createElement(window.Icon, {
      n: "close",
      s: 18
    }))), preview ? /*#__PURE__*/React.createElement("div", {
      className: "asst-reference-preview"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: back
    }, "\u2039 ", copy.back), /*#__PURE__*/React.createElement("strong", null, Workspace.displayName(preview.file))), preview.phase === 'loading' ? /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, copy.loading) : preview.phase === 'error' ? /*#__PURE__*/React.createElement("div", {
      role: "alert"
    }, /*#__PURE__*/React.createElement("p", null, copy[preview.reason] || copy.unavailable), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => read(preview.file)
    }, copy.retry)) : /*#__PURE__*/React.createElement(React.Fragment, null, preview.image ? /*#__PURE__*/React.createElement("img", {
      className: "asst-reference-image",
      src: preview.image,
      onError: () => setPreview(current => ({
        file: current.file,
        phase: "error",
        reason: "unsupported"
      })),
      alt: Workspace.displayName(preview.file)
    }) : /*#__PURE__*/React.createElement("pre", null, preview.text), preview.truncated ? /*#__PURE__*/React.createElement("small", null, copy.partial) : null), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: editingDisabled || !Core.selectable(preview.file) || preview.phase !== 'ready' || Core.contains(citations, preview.file),
      onClick: () => toggle(preview.file)
    }, Core.contains(citations, preview.file) ? copy.attached : Core.contains(selection, preview.file) ? copy.deselect : copy.select)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "asst-reference-search"
    }, /*#__PURE__*/React.createElement("input", {
      ref: search,
      type: "search",
      "aria-label": copy.search,
      placeholder: copy.search,
      maxLength: 500,
      value: query,
      onChange: event => setQuery(event.target.value)
    }), /*#__PURE__*/React.createElement("select", {
      "aria-label": copy.all,
      value: folder,
      onChange: event => setFolder(event.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, copy.all), /*#__PURE__*/React.createElement("option", {
      value: "materials"
    }, copy.material), /*#__PURE__*/React.createElement("option", {
      value: "notes"
    }, copy.note), /*#__PURE__*/React.createElement("option", {
      value: "outputs"
    }, copy.output)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => load(0)
    }, copy.refresh)), /*#__PURE__*/React.createElement("div", {
      className: "asst-reference-files"
    }, queue, phase === 'loading' || phase === 'idle' ? /*#__PURE__*/React.createElement("p", {
      className: "asst-reference-empty",
      role: "status"
    }, copy.loading) : error ? /*#__PURE__*/React.createElement("div", {
      className: "asst-reference-empty",
      role: "alert"
    }, /*#__PURE__*/React.createElement("p", null, copy[error] || copy.unavailable), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => load(failedOffset.current)
    }, copy.retry)) : null, phase !== 'loading' ? page.files.map(row) : null, phase === 'ready' && !page.files.length ? /*#__PURE__*/React.createElement("div", {
      className: "asst-reference-empty"
    }, /*#__PURE__*/React.createElement("p", null, query || folder ? copy.noMatch : copy.empty), query || folder ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => {
        setQuery('');
        setFolder('');
      }
    }, copy.clear) : null) : null, !error && page.offset < page.total ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm asst-reference-more",
      disabled: phase !== 'ready',
      onClick: () => load(page.offset)
    }, phase === 'more' ? copy.loading : copy.more) : null)), notice ? /*#__PURE__*/React.createElement("p", {
      className: "asst-reference-notice",
      role: "status"
    }, notice) : null, /*#__PURE__*/React.createElement("footer", null, /*#__PURE__*/React.createElement("span", null, selected.length ? copy.selected(selected.length) : ''), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      disabled: editingDisabled || !!checking.length || !selected.length,
      onClick: () => add()
    }, copy.add, selected.length ? ' (' + selected.length + ')' : '')), dragging ? /*#__PURE__*/React.createElement("div", {
      className: "asst-reference-drop",
      "aria-live": "polite"
    }, copy.uploadDrop) : null)) : null);
  }
  window.AssistantReferenceLibrary = AssistantReferenceLibrary;
})();
}
