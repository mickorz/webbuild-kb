{
/* Optional user workspace. Drafts are local to this tab and never become facts until committed. */
(function () {
  const Core = window.AssistantWorkspaceCore;
  const {
    useState,
    useEffect,
    useRef
  } = React;
  function copyFor(lang) {
    const en = lang === 'en';
    return {
      title: en ? 'Materials and notes' : '资料与手记',
      selectFile: en ? 'Select a file to view it.' : '选择文件后查看内容。',
      detail: en ? 'File details' : '文件详情',
      more: en ? 'More actions' : '更多操作',
      reference: en ? 'Use as reference' : '作为参考',
      referenceUnavailable: en ? 'Save changes before using this file as a reference.' : '保存修改后才能作为参考。',
      noteName: en ? 'Note name' : '手记名称',
      drop: en ? 'Drop files to upload' : '松开以上传资料',
      image: en ? 'Image' : '图片',
      file: en ? 'File' : '文件',
      unavailable: en ? 'Workspace is not enabled or is temporarily unavailable.' : '工作区尚未开启或暂时不可用。',
      capacity: en ? 'Storage is full. Delete unused files or increase your allowance.' : '资料空间已满，请删除不用的文件或提高配额。',
      rateLimited: en ? 'Content was read too frequently. Try again shortly.' : '内容读取过于频繁，请稍后重试。',
      originBlocked: en ? 'New file fetches are paused. Cached content is still available.' : '新的文件取回已暂停，缓存内容仍可读取。',
      forbidden: en ? 'You do not have access to this workspace.' : '暂无权限访问工作区。',
      missing: en ? 'This file no longer exists.' : '此文件已不存在。',
      unsupported: en ? 'Preview is unavailable. You can download the original file.' : '暂不支持预览，可以下载原文件。',
      large: en ? 'The file exceeds the 8 MiB upload limit.' : '文件超过 8 MiB 上传限制。',
      limit: en ? 'Each file must be 8 MiB or smaller.' : '每个文件不超过 8 MiB。',
      invalid: en ? 'Check the file path and try again.' : '请检查文件路径后重试。',
      conflict: en ? 'This file changed elsewhere. Your draft is preserved. Reload before editing again.' : '文件已在别处修改，当前草稿已保留。请重新读取后再编辑。',
      retry: en ? 'Retry' : '重试',
      refresh: en ? 'Refresh' : '刷新',
      upload: en ? 'Upload' : '上传资料',
      newNote: en ? 'New note' : '新建手记',
      search: en ? 'Search files and text' : '搜索文件和内容',
      empty: en ? 'No files here yet.' : '这里还没有文件。',
      loading: en ? 'Loading…' : '正在读取…',
      all: en ? 'All files' : '全部文件',
      materials: en ? 'Materials' : '资料',
      notes: en ? 'Notes' : '手记',
      outputs: en ? 'Outputs' : '产出',
      download: en ? 'Download' : '下载',
      remove: en ? 'Delete' : '删除',
      edit: en ? 'Edit' : '编辑',
      save: en ? 'Save' : '保存',
      saved: en ? 'Saved' : '已保存',
      close: en ? 'Close' : '关闭',
      path: en ? 'File path' : '文件路径',
      text: en ? 'File content' : '文件内容',
      cancel: en ? 'Cancel' : '取消',
      discard: en ? 'Discard draft' : '放弃草稿',
      discardTitle: en ? 'Discard unsaved changes?' : '放弃未保存的修改？',
      discardBody: en ? 'These changes have not been saved.' : '这些修改尚未保存。',
      removeTitle: en ? 'Delete this file?' : '删除这个文件？',
      removeBody: en ? 'It will be removed from the workspace. Saved versions are retained.' : '文件将从工作区移除，已保存的历史版本保留。',
      reload: en ? 'Reload latest' : '重新读取最新版本',
      previous: en ? 'Previous' : '上一页',
      next: en ? 'Next' : '下一页',
      partial: en ? 'Large file: read by sections. Download the original to edit it in full.' : '长文件按段预览，完整编辑请下载原文件。',
      versions: en ? 'Version history' : '历史版本',
      historical: en ? 'Historical version' : '历史版本（只读）',
      unsaved: en ? 'Unsaved' : '未保存',
      saving: en ? 'Saving…' : '正在保存…',
      rename: en ? 'Rename' : '重命名',
      renameName: en ? 'File name' : '文件名',
      renamed: en ? 'Renamed' : '已改名',
      nameTaken: en ? 'A file with this name already exists. It was not overwritten.' : '已有同名文件，未覆盖。',
      invalidName: en ? 'This file name cannot be used.' : '这个文件名无法使用。'
    };
  }
  function fileName(path) {
    const parts = String(path || '').split('/');
    return parts[parts.length - 1] || path;
  }
  function fileLabel(file) {
    if (!file) return '';
    if (typeof file === 'string') return fileName(file);
    return Core.displayName(file) || fileName(file.path);
  }
  function sameFile(editor, file) {
    if (!editor || editor.isNew || !file) return false;
    if (Core.validFileId(editor.file_id) && file.file_id != null && file.file_id !== '') return editor.file_id === file.file_id;
    return editor.path === file.path;
  }
  function sourceOf(path, copy) {
    const folder = String(path || '').split('/')[0];
    if (folder === 'materials' || folder === 'notes' || folder === 'outputs') return copy[folder];
    return copy.all;
  }
  function sizeLabel(file) {
    return typeof file.size === 'number' ? Math.ceil(file.size / 1024) + ' kb' : '';
  }
  function formatWhen(value, lang) {
    const stamp = Date.parse(value);
    if (!Number.isFinite(stamp)) return '';
    try {
      return new Intl.DateTimeFormat(lang === 'en' ? 'en' : 'zh-CN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(stamp));
    } catch (_) {
      return String(value).slice(0, 16).replace('T', ' ');
    }
  }
  function AssistantWorkspaceDialog({
    label,
    children,
    onClose,
    returnFocus,
    activeRef,
    busy,
    suspended
  }) {
    const ref = useRef(null);
    const Overlay = window.Portal || React.Fragment;
    useEffect(() => {
      ref.current?.focus();
      return () => {
        if (activeRef.current !== false && returnFocus.current?.isConnected) returnFocus.current.focus();
      };
    }, []);
    const keys = event => {
      if (suspended) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(ref.current?.querySelectorAll('button:not([disabled]),input:not([disabled]):not([hidden]),textarea:not([disabled]),summary,[tabindex="0"]') || []).filter(item => !item.closest('details:not([open])') || item.tagName === 'SUMMARY');
      const first = items[0],
        last = items[items.length - 1];
      if (!first) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) {
        event.preventDefault();
        first.focus();
      }
    };
    return /*#__PURE__*/React.createElement(Overlay, null, /*#__PURE__*/React.createElement("div", {
      className: "asst-workspace-overlay"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-drawer-scrim",
      "aria-hidden": "true",
      onClick: () => {
        if (!busy && !suspended) onClose();
      }
    }), /*#__PURE__*/React.createElement("section", {
      className: "asst-workspace-detail",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": label,
      tabIndex: -1,
      ref: ref,
      onKeyDown: keys
    }, children)));
  }
  function AssistantWorkspacePanel({
    enabled,
    lang,
    userId,
    active = true,
    onReference
  }) {
    const copy = copyFor(lang);
    const [phase, setPhase] = useState('loading');
    const [page, setPage] = useState({
      files: [],
      total: 0,
      offset: 0
    });
    const [folder, setFolder] = useState('');
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [editor, setEditor] = useState(null);
    const [renameDraft, setRenameDraft] = useState(null);
    const [editing, setEditing] = useState(false);
    const [versions, setVersions] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [notice, setNotice] = useState('');
    const fileInput = useRef(null),
      editorRef = useRef(editor),
      sequence = useRef(0),
      currentUser = useRef(userId);
    editorRef.current = editor;
    currentUser.current = userId;
    const deleteAttempts = useRef(new Map());
    const renameAttempts = useRef(new Map());
    const uploader = useRef(null),
      afterSave = useRef(null);
    const [uploads, setUploads] = useState([]);
    const [uploadNotice, setUploadNotice] = useState('');
    useEffect(() => {
      setUploadNotice('');
    }, [userId]);
    const api = window.LF_API;
    const [dragging, setDragging] = useState(false);
    const detailSequence = useRef(0),
      listSequence = useRef(0),
      imageUrl = useRef(null);
    const activeRef = useRef(active),
      triggerRef = useRef(null);
    activeRef.current = active;
    const Reference = window.AssistantReferenceCore;
    const [refreshing, setRefreshing] = useState(false);
    const [previewStore, setPreviewStore] = useState(null);
    const loaded = useRef(false),
      loadedFolder = useRef('');
    const Preview = window.AssistantWorkspacePreview,
      Reader = window.AssistantWorkspaceReader;
    const previewCache = previewStore && previewStore.userId === userId ? previewStore.cache : null;
    useEffect(() => {
      const cache = enabled && userId ? window.AssistantWorkspacePreviewCore?.createCache(api, Core) : null;
      setPreviewStore(cache ? {
        userId,
        cache
      } : null);
      return () => cache?.dispose();
    }, [enabled, userId]);
    function releaseImage() {
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
      imageUrl.current = null;
    }
    useEffect(() => () => {
      detailSequence.current++;
      listSequence.current++;
      releaseImage();
    }, [userId]);
    const newKey = () => 'workspace-' + crypto.randomUUID();
    const request = (name, params, options) => api.assistantWorkspaceRequest(name + (params ? '?' + Core.query(params) : ''), options);
    const isCurrent = token => token === sequence.current && currentUser.current === userId;
    useEffect(() => {
      const protect = event => {
        if (!editorRef.current || !editorRef.current.dirty) return;
        event.preventDefault();
        event.returnValue = '';
      };
      const onWorkspaceFiles = () => {
        if (afterSave.current) afterSave.current();
      };
      window.addEventListener('lf:workspace-files-changed', onWorkspaceFiles);
      window.addEventListener('beforeunload', protect);
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      const release = guard ? guard.registerNavigationBlocker(() => !!(editorRef.current && editorRef.current.dirty)) : () => {};
      return () => {
        sequence.current += 1;
        Core.saveDraft(userId, editorRef.current);
        release();
        window.removeEventListener('lf:workspace-files-changed', onWorkspaceFiles);
        window.removeEventListener('beforeunload', protect);
      };
    }, [userId]);
    useEffect(() => {
      let draft = enabled ? Core.latestDraft(userId) : null;
      if (draft && draft.path === 'preferences.md') {
        draft = {
          ...draft,
          historical: true
        };
      }
      setEditor(draft);
      setRenameDraft(null);
      setEditing(!!(draft && !draft.historical));
      setVersions(null);
      setConfirm(null);
      setBusy(false);
      setError('');
      if (uploader.current) uploader.current.bindAccount(userId);
      loaded.current = false;
      setPhase('loading');
      setPage({
        files: [],
        total: 0,
        offset: 0
      });
      if (enabled && userId) load(0);else {
        sequence.current += 1;
        setPhase('unavailable');
      }
    }, [enabled, userId]);
    async function load(offset, nextFolder = folder, term = search) {
      const token = sequence.current,
        listToken = ++listSequence.current;
      const current = () => isCurrent(token) && listToken === listSequence.current;
      setError('');
      setRefreshing(true);
      if (!loaded.current) setPhase('loading');
      try {
        if (!loaded.current) await request('status');
        if (!current()) return;
        const result = await request(term.trim() ? 'search' : 'files', {
          path: nextFolder,
          query: term.trim(),
          offset,
          limit: 30
        });
        if (!current()) return;
        setPage({
          ...result,
          files: result.files || result.matches || []
        });
        loaded.current = true;
        loadedFolder.current = nextFolder;
        setPhase('ready');
      } catch (cause) {
        if (current()) {
          setError(Core.failure(cause));
          if (!loaded.current) setPhase('unavailable');else setFolder(loadedFolder.current);
        }
      } finally {
        if (current()) setRefreshing(false);
      }
    }
    function replaceEditor(next, edit = false) {
      if (next?.image !== imageUrl.current) releaseImage();
      setEditor(next);
      editorRef.current = next;
      setRenameDraft(null);
      setEditing(edit);
      setVersions(null);
      setNotice('');
      setError('');
    }
    async function openFile(target, version = null, fresh = false) {
      const file = typeof target === 'string' ? {
        path: target
      } : target || {};
      const path = typeof file.path === 'string' ? file.path : '';
      const fileId = Core.validFileId(file.file_id) ? file.file_id : '';
      if (file.file_id != null && file.file_id !== '' && !fileId) {
        setError('invalid');
        return;
      }
      if (busy) return;
      if (!fresh && editorRef.current && editorRef.current.dirty) {
        setConfirm({
          kind: 'discard',
          action: () => {
            Core.clearDraft(userId, editorRef.current.path, editorRef.current.file_id);
            openFile(file, version, true);
          }
        });
        return;
      }
      setBusy(true);
      setError('');
      const token = sequence.current,
        detailToken = ++detailSequence.current;
      const current = () => isCurrent(token) && detailToken === detailSequence.current;
      try {
        const savedDraft = !version && !fresh && Core.readDraftForFile(userId, file);
        if (savedDraft) {
          const historical = savedDraft.historical || savedDraft.path === 'preferences.md' || path === 'preferences.md';
          const merged = {
            ...savedDraft
          };
          if (fileId && !Core.validFileId(merged.file_id)) merged.file_id = fileId;
          if (!merged.name) merged.name = fileLabel(file);
          replaceEditor({
            ...merged,
            historical
          }, !historical);
          return;
        }
        const fields = Core.locatedFields({
          path,
          file_id: fileId
        }, {
          limit: 12000
        });
        if (!fields) {
          setError('invalid');
          return;
        }
        if (version) fields.version = version;
        if (Reference?.isImage(file) && api.assistantWorkspaceImage) {
          const imageFile = {
            ...file,
            version: version || file.version
          };
          const lease = previewCache?.acquire(imageFile, true);
          let blob;
          try {
            blob = lease ? (await lease.promise).blob : await api.assistantWorkspaceImage(Core.downloadQuery(imageFile));
          } finally {
            lease?.release();
          }
          if (!current()) return;
          releaseImage();
          imageUrl.current = URL.createObjectURL(blob);
          replaceEditor({
            ...file,
            contentType: file.content_type,
            version: version || file.version,
            image: imageUrl.current,
            text: '',
            dirty: false,
            historical: !!version
          });
          return;
        }
        let result;
        try {
          result = await request('text', fields);
        } catch (cause) {
          if (Core.failure(cause) === 'unsupported') {
            if (current()) {
              const listed = (page.files || []).find(entry => fileId && entry.file_id === fileId || entry.path === path);
              replaceEditor({
                path: listed && listed.path || path,
                file_id: fileId,
                name: fileLabel(listed || file),
                version: version || listed && listed.version || null,
                historical: !!version,
                unsupported: true,
                text: '',
                dirty: false
              });
              setError('unsupported');
            }
            return;
          } else throw cause;
        }
        if (!current()) return;
        const state = Core.cleanState(path, result);
        if (!state || fileId && state.file_id !== fileId) {
          setError('invalid');
          return;
        }
        replaceEditor({
          ...state,
          historical: !!version || state.path === 'preferences.md'
        }, false);
      } catch (cause) {
        if (current()) setError(Core.failure(cause));
      } finally {
        if (current()) setBusy(false);
      }
    }
    async function save() {
      if (busy || !editor || editor.conflict || editor.historical || editor.path === 'preferences.md') return;
      const token = sequence.current;
      const state = {
        ...editor,
        requestKey: editor.requestKey || newKey()
      };
      setEditor(state);
      setBusy(true);
      setError('');
      try {
        const result = await request('text', null, {
          method: 'PUT',
          body: JSON.stringify(Core.writeRequest(state, state.requestKey))
        });
        if (!isCurrent(token)) return;
        if (result.committed !== true) throw new Error('Uncommitted write');
        const cleaned = Core.cleanState(state.path, {
          text: state.text,
          file: result.file
        });
        if (!cleaned || state.file_id && cleaned.file_id !== state.file_id) throw new Error('Invalid file');
        Core.clearDraft(userId, state.path, state.file_id);
        setEditor({
          ...cleaned,
          contentType: result.file.content_type || state.contentType || 'text/markdown'
        });
        setRenameDraft(null);
        setEditing(false);
        setNotice(copy.saved);
        await load(page.offset);
      } catch (cause) {
        if (isCurrent(token)) {
          const kind = Core.failure(cause);
          setError(kind);
          if (kind === 'conflict') {
            const conflicted = {
              ...state,
              conflict: true
            };
            setEditor(conflicted);
            Core.saveDraft(userId, conflicted);
          }
        }
      } finally {
        setBusy(false);
      }
    }
    afterSave.current = () => {
      if (currentUser.current === userId) load(page.offset);
    };
    function controller() {
      if (!uploader.current && window.AssistantUploadCore) {
        uploader.current = window.AssistantUploadCore.createController({
          workspace: Core,
          request: request,
          newKey: newKey,
          onChange: items => {
            if (uploader.current && uploader.current.accountId === currentUser.current) setUploads(items);
          },
          onSaved: () => {
            try {
              window.dispatchEvent(new CustomEvent('lf:workspace-files-changed'));
            } catch (ignored) {
              if (afterSave.current) afterSave.current();
            }
          }
        });
        uploader.current.bindAccount(currentUser.current);
      }
      return uploader.current;
    }
    function enqueueUploads(files) {
      setUploadNotice('');
      const current = controller();
      return current ? current.enqueue(files) : null;
    }
    async function remove(file) {
      setConfirm(null);
      setBusy(true);
      setError('');
      const token = sequence.current;
      const identity = (Core.validFileId(file.file_id) ? file.file_id : file.path) + '\0' + file.version;
      if (!deleteAttempts.current.has(identity)) deleteAttempts.current.set(identity, newKey());
      const fields = Core.locatedFields(file, {
        expected_version: file.version,
        idempotency_key: deleteAttempts.current.get(identity)
      });
      if (!fields) {
        setError('invalid');
        setBusy(false);
        return;
      }
      try {
        await request('file', fields, {
          method: 'DELETE'
        });
        if (!isCurrent(token)) return;
        deleteAttempts.current.delete(identity);
        Core.clearDraft(userId, file.path, file.file_id);
        if (editor && sameFile(editor, file)) replaceEditor(null);
        await load(0);
      } catch (cause) {
        setError(Core.failure(cause));
      } finally {
        setBusy(false);
      }
    }
    function discardThen(action) {
      if (editor && editor.dirty) setConfirm({
        kind: 'discard',
        action: () => {
          Core.clearDraft(userId, editor.path, editor.file_id);
          action();
        }
      });else action();
    }
    async function history() {
      setBusy(true);
      setError('');
      const fields = Core.locatedFields(editor, {
        limit: 30
      });
      if (!fields) {
        setError('invalid');
        setBusy(false);
        return;
      }
      try {
        const result = await request('versions', fields);
        setVersions(result.versions);
      } catch (cause) {
        setError(Core.failure(cause));
      } finally {
        setBusy(false);
      }
    }
    async function download(file) {
      setBusy(true);
      setError('');
      const query = Core.downloadQuery(file);
      if (!query) {
        setError('invalid');
        setBusy(false);
        return;
      }
      try {
        await api.assistantWorkspaceDownload(query);
      } catch (cause) {
        setError(Core.failure(cause));
      } finally {
        setBusy(false);
      }
    }
    async function renameTo(nextName) {
      if (busy || !editor || editor.isNew || editor.historical || !Core.validFileId(editor.file_id) || !editor.version) return;
      const destination = Core.destinationPath(editor.path, nextName);
      if (!destination) {
        setError('invalidName');
        return;
      }
      if (destination === editor.path) {
        setRenameDraft(null);
        return;
      }
      const token = sequence.current;
      const attemptKey = [editor.file_id, editor.version, editor.path, destination].join('\0');
      if (!renameAttempts.current.has(attemptKey)) renameAttempts.current.set(attemptKey, newKey());
      setBusy(true);
      setError('');
      try {
        const result = await request('move', null, {
          method: 'POST',
          body: JSON.stringify(Core.moveRequest(editor, destination, renameAttempts.current.get(attemptKey)))
        });
        if (!isCurrent(token)) return;
        const accepted = Core.acceptMove(editor, result);
        if (!accepted) throw new Error('Uncommitted move');
        renameAttempts.current.delete(attemptKey);
        const next = {
          ...editor,
          ...accepted,
          requestKey: null
        };
        Core.clearDraft(userId, editor.path, editor.file_id);
        if (next.dirty) Core.saveDraft(userId, next);
        setEditor(next);
        setRenameDraft(null);
        setNotice(copy.renamed);
        await load(page.offset);
      } catch (cause) {
        if (isCurrent(token)) {
          const kind = Core.failure(cause);
          setError(kind === 'conflict' ? 'nameTaken' : kind);
        }
      } finally {
        setBusy(false);
      }
    }
    function closeDetail() {
      if (busy) return;
      discardThen(() => {
        detailSequence.current++;
        if (editor) Core.clearDraft(userId, editor.path, editor.file_id);
        replaceEditor(null);
      });
    }
    function newNote() {
      if (busy || phase !== 'ready') return;
      discardThen(() => {
        if (editor) Core.clearDraft(userId, editor.path, editor.file_id);
        replaceEditor({
          path: 'notes/',
          text: '',
          version: null,
          dirty: true,
          isNew: true
        }, true);
      });
    }
    const Icon = window.Icon;
    const Dialog = AssistantWorkspaceDialog;
    const Confirm = window.ConfirmDialog;
    const shown = active !== false;
    const listed = editor && !editor.isNew ? (page.files || []).find(item => sameFile(editor, item) && item.version) : null;
    const removable = listed ? {
      path: listed.path || editor.path,
      version: listed.version,
      file_id: editor.file_id || listed.file_id || '',
      name: fileLabel(editor)
    } : editor && !editor.isNew && !editor.historical && editor.version ? {
      path: editor.path,
      version: editor.version,
      file_id: editor.file_id || '',
      name: fileLabel(editor)
    } : null;
    const canRename = !!(editor && !editor.isNew && !editor.historical && Core.validFileId(editor.file_id) && editor.version && Core.topDirectory(editor.path));
    const when = file => file.updated_at ? formatWhen(file.updated_at, lang) : '';
    return /*#__PURE__*/React.createElement("section", {
      className: "asst-workspace",
      "aria-labelledby": "assistant-workspace-heading"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-settings-section-head asst-page-head"
    }, /*#__PURE__*/React.createElement("h2", {
      className: "set-panel-t",
      id: "assistant-workspace-heading"
    }, copy.title, phase === 'ready' && page.total > 0 ? /*#__PURE__*/React.createElement("small", {
      className: "asst-workspace-count"
    }, page.total) : null), phase === 'ready' || editor ? /*#__PURE__*/React.createElement("div", {
      className: "asst-settings-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy || phase !== 'ready',
      onClick: event => {
        triggerRef.current = event?.currentTarget;
        newNote();
      }
    }, Icon ? /*#__PURE__*/React.createElement(Icon, {
      n: "plus",
      s: 16
    }) : null, copy.newNote), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      title: copy.limit,
      disabled: busy || phase !== 'ready',
      onClick: () => fileInput.current.click()
    }, Icon ? /*#__PURE__*/React.createElement(Icon, {
      n: "upload",
      s: 16
    }) : null, copy.upload), /*#__PURE__*/React.createElement("input", {
      ref: fileInput,
      type: "file",
      multiple: true,
      hidden: true,
      "aria-label": copy.limit,
      title: copy.limit,
      onChange: event => enqueueUploads(window.AssistantUploadCore.selectedFiles(event))
    })) : null), phase === 'ready' || editor ? /*#__PURE__*/React.createElement("div", {
      className: "asst-workspace-discovery"
    }, /*#__PURE__*/React.createElement("form", {
      className: "asst-workspace-search",
      onSubmit: event => {
        event.preventDefault();
        load(0);
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn sm asst-workspace-search-submit",
      title: copy.search,
      "aria-label": copy.search,
      disabled: busy
    }, Icon ? /*#__PURE__*/React.createElement(Icon, {
      n: "search",
      s: 18
    }) : lang === 'en' ? 'Search' : '搜索'), /*#__PURE__*/React.createElement("input", {
      type: "search",
      "aria-label": copy.search,
      placeholder: copy.search,
      value: search,
      onChange: event => setSearch(event.target.value)
    })), /*#__PURE__*/React.createElement("div", {
      className: "asst-workspace-filterbar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-workspace-filters",
      role: "group",
      "aria-label": lang === 'en' ? 'File category' : '文件分类'
    }, ['', 'materials', 'notes', 'outputs'].map(value => /*#__PURE__*/React.createElement("button", {
      key: value,
      type: "button",
      className: "c-btn sm",
      "aria-pressed": folder === value,
      disabled: busy,
      onClick: () => {
        setFolder(value);
        load(0, value);
      }
    }, value ? copy[value] : copy.all))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy || refreshing,
      onClick: () => load(page.offset)
    }, copy.refresh))) : null, window.AssistantUploadQueue ? /*#__PURE__*/React.createElement(window.AssistantUploadQueue, {
      lang: lang,
      items: uploads,
      onRetry: item => {
        const current = controller();
        return current ? current.retry(item.id) : null;
      },
      onCopy: item => {
        const current = controller();
        return current ? current.saveCopy(item.id) : null;
      },
      onSkip: item => {
        const current = controller();
        if (current) current.skip(item.id);
      },
      onRemove: item => {
        const result = controller()?.remove(item.id);
        setUploadNotice(result?.uncertain ? window.AssistantUploadCore.uploadCopy(lang).removedUncertain : '');
      },
      onDownload: item => {
        const query = Core.downloadQuery(item);
        return query ? api.assistantWorkspaceDownload(query) : Promise.reject(new Error('Invalid file'));
      }
    }) : null, uploadNotice && /*#__PURE__*/React.createElement("p", {
      className: "asst-action__note",
      role: "status"
    }, uploadNotice), phase === 'loading' ? /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "asst-settings-loading"
    }, copy.loading) : null, phase === 'unavailable' ? /*#__PURE__*/React.createElement("div", {
      className: "asst-workspace-empty asst-settings-state",
      role: "alert"
    }, /*#__PURE__*/React.createElement("p", null, copy[error] || copy.unavailable), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: !enabled,
      onClick: () => load(0)
    }, copy.retry)) : error ? /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "asst-settings-error"
    }, copy[error] || copy.unavailable) : null, phase === 'ready' || editor ? /*#__PURE__*/React.createElement("div", {
      className: 'asst-workspace-gallery' + (dragging ? ' is-dragging' : ''),
      "aria-busy": refreshing,
      onDragOver: event => {
        if (enabled && phase === 'ready' && Array.from(event.dataTransfer.types || []).includes('Files')) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setDragging(true);
        }
      },
      onDragLeave: event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
      },
      onDrop: event => {
        if (!enabled || phase !== 'ready' || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
        event.preventDefault();
        setDragging(false);
        enqueueUploads(Array.from(event.dataTransfer.files));
      }
    }, dragging ? /*#__PURE__*/React.createElement("p", {
      className: "asst-workspace-drop",
      role: "status"
    }, copy.drop) : null, /*#__PURE__*/React.createElement("div", {
      className: "asst-workspace-list"
    }, phase === 'ready' ? /*#__PURE__*/React.createElement(React.Fragment, null, !page.files.length ? /*#__PURE__*/React.createElement("p", {
      className: "asst-workspace-empty"
    }, search.trim() || folder ? lang === 'en' ? 'No matching files. Try another search or category.' : '没有匹配的文件，可更换搜索词或分类。' : copy.empty) : /*#__PURE__*/React.createElement("ul", {
      className: "asst-workspace-files"
    }, page.files.map(file => {
      const picked = sameFile(editor, file);
      const meta = [sourceOf(file.path, copy), sizeLabel(file)].filter(Boolean).join(' · ');
      const type = fileLabel(file).includes('.') ? fileLabel(file).split('.').pop().slice(0, 6).toUpperCase() : Core.topDirectory(file.path) === 'notes' ? 'NOTE' : 'FILE';
      return /*#__PURE__*/React.createElement("li", {
        key: file.file_id || file.path
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        title: fileLabel(file),
        className: 'asst-workspace-file' + (picked ? ' is-selected' : ''),
        "data-path": file.path,
        "data-file-id": file.file_id || '',
        "aria-current": picked ? 'true' : undefined,
        disabled: busy,
        onClick: event => {
          triggerRef.current = event?.currentTarget;
          return openFile(file);
        }
      }, Preview ? /*#__PURE__*/React.createElement(Preview, {
        file: file,
        cache: previewCache,
        active: shown,
        lang: lang
      }) : /*#__PURE__*/React.createElement("span", {
        className: "asst-workspace-tile-preview",
        "aria-hidden": "true"
      }, file.snippet || ''), /*#__PURE__*/React.createElement("span", {
        className: "asst-workspace-file-type",
        "aria-hidden": "true"
      }, type), /*#__PURE__*/React.createElement("span", {
        className: "asst-workspace-file-caption"
      }, /*#__PURE__*/React.createElement("strong", null, fileLabel(file)), /*#__PURE__*/React.createElement("small", null, meta, when(file) ? /*#__PURE__*/React.createElement(React.Fragment, null, " \xB7 ", /*#__PURE__*/React.createElement("time", {
        dateTime: file.updated_at
      }, when(file))) : null))));
    })), page.total > 30 || page.offset > 0 ? /*#__PURE__*/React.createElement("div", {
      className: "asst-workspace-toolbar asst-workspace-pagination"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy || page.offset === 0,
      onClick: () => load(Math.max(0, page.offset - 30))
    }, copy.previous), /*#__PURE__*/React.createElement("span", null, page.files.length ? page.offset + 1 : 0, "\u2013", page.offset + page.files.length, " / ", page.total), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy || page.offset + page.files.length >= page.total,
      onClick: () => load(page.offset + 30)
    }, copy.next)) : null) : null), editor && shown ? /*#__PURE__*/React.createElement(Dialog, {
      label: copy.detail,
      onClose: closeDetail,
      returnFocus: triggerRef,
      activeRef: activeRef,
      busy: busy,
      suspended: !!confirm
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-workspace-editor"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-workspace-toolbar"
    }, /*#__PURE__*/React.createElement("h3", null, editor.isNew ? copy.newNote : fileLabel(editor)), editor.dirty ? /*#__PURE__*/React.createElement("span", null, copy.unsaved) : notice ? /*#__PURE__*/React.createElement("span", {
      role: "status"
    }, notice) : null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: closeDetail
    }, copy.close)), editor.isNew ? /*#__PURE__*/React.createElement("label", null, copy.noteName, /*#__PURE__*/React.createElement("input", {
      "aria-label": copy.noteName,
      value: editor.path.slice('notes/'.length),
      disabled: busy,
      onChange: event => {
        Core.clearDraft(userId, editor.path, editor.file_id);
        const next = {
          ...editor,
          path: 'notes/' + event.target.value,
          requestKey: null
        };
        setEditor(next);
        Core.saveDraft(userId, next);
      }
    })) : null, renameDraft != null ? /*#__PURE__*/React.createElement("form", {
      className: "asst-workspace-rename",
      onSubmit: event => {
        event.preventDefault();
        renameTo(renameDraft);
      }
    }, /*#__PURE__*/React.createElement("label", null, copy.renameName, /*#__PURE__*/React.createElement("input", {
      "aria-label": copy.renameName,
      value: renameDraft,
      disabled: busy,
      onChange: event => setRenameDraft(event.target.value)
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy || !String(renameDraft || '').trim(),
      onClick: () => renameTo(renameDraft)
    }, copy.rename), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: () => setRenameDraft(null)
    }, copy.cancel)) : null, error ? /*#__PURE__*/React.createElement("p", {
      className: "asst-settings-error",
      role: "alert"
    }, copy[error] || copy.unavailable) : null, editor.historical ? /*#__PURE__*/React.createElement("p", null, copy.historical) : null, editor.truncated ? /*#__PURE__*/React.createElement("p", null, copy.partial) : null, editor.image ? /*#__PURE__*/React.createElement("img", {
      className: "asst-workspace-image",
      src: editor.image,
      alt: fileLabel(editor),
      onError: () => {
        setError('unsupported');
        setEditor(current => ({
          ...current,
          image: null,
          unsupported: true
        }));
        releaseImage();
      }
    }) : !editor.unsupported ? editing ? /*#__PURE__*/React.createElement("textarea", {
      "aria-label": copy.text,
      value: editor.text,
      disabled: busy || editor.conflict,
      onChange: event => {
        const next = Core.editState(editor, event.target.value);
        setEditor(next);
        Core.saveDraft(userId, next);
      }
    }) : Reader ? /*#__PURE__*/React.createElement(Reader, {
      key: (editor.file_id || editor.path) + ":" + editor.version,
      editor: editor,
      lang: lang
    }) : /*#__PURE__*/React.createElement("pre", {
      tabIndex: "0"
    }, editor.text) : null, /*#__PURE__*/React.createElement("div", {
      className: "asst-workspace-toolbar"
    }, editor.conflict ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      disabled: busy,
      onClick: () => discardThen(() => {
        Core.clearDraft(userId, editor.path, editor.file_id);
        openFile({
          path: editor.path,
          file_id: editor.file_id
        }, null, true);
      })
    }, copy.reload) : editing ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      disabled: busy || !editor.dirty || editor.path === 'preferences.md' || !Core.validPath(editor.path) || phase !== 'ready',
      onClick: save
    }, busy ? copy.saving : copy.save) : /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      disabled: busy || editor.path === 'preferences.md' || editor.truncated || editor.historical || editor.unsupported || editor.image || !String(editor.contentType || '').startsWith('text/') || phase !== 'ready',
      onClick: () => setEditing(true)
    }, copy.edit), editing && !editor.isNew ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: () => discardThen(() => openFile(editor, null, true))
    }, copy.cancel) : null, !editor.isNew ? /*#__PURE__*/React.createElement("details", {
      className: "asst-settings-more",
      onKeyDown: event => {
        if (event.key === 'Escape' && event.currentTarget.open) {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.open = false;
          event.currentTarget.querySelector('summary').focus();
        }
      }
    }, /*#__PURE__*/React.createElement("summary", {
      className: "c-btn sm"
    }, copy.more), /*#__PURE__*/React.createElement("div", {
      className: "asst-settings-more-actions",
      onClick: event => {
        if (event.target.closest('button')) event.currentTarget.closest('details').open = false;
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      "aria-label": copy.download + ' ' + fileLabel(editor),
      onClick: () => download(editor)
    }, copy.download), canRename && renameDraft == null ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy || editor.conflict || phase !== 'ready',
      onClick: () => setRenameDraft(fileLabel(editor))
    }, copy.rename) : null, editor.version ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: history
    }, copy.versions) : null, removable ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      "aria-label": copy.remove + ' ' + fileLabel(removable),
      onClick: () => setConfirm({
        kind: 'delete',
        file: removable
      })
    }, copy.remove) : null)) : null), onReference && Reference ? /*#__PURE__*/React.createElement("div", {
      className: "asst-workspace-reference"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      disabled: busy || editor.dirty || editor.isNew || editor.historical || !Reference.readable({
        ...editor,
        content_type: editor.contentType
      }),
      title: editor.dirty ? copy.referenceUnavailable : undefined,
      onClick: () => {
        onReference({
          ...editor,
          content_type: editor.contentType
        });
        closeDetail();
      }
    }, copy.reference)) : null, versions ? /*#__PURE__*/React.createElement("ul", {
      className: "asst-workspace-versions"
    }, versions.map(item => /*#__PURE__*/React.createElement("li", {
      key: item.version
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: () => openFile({
        path: item.path || editor.path,
        file_id: Core.validFileId(item.file_id) ? item.file_id : editor.file_id
      }, item.version)
    }, new Date(item.updated_at).toLocaleString(lang === 'en' ? 'en' : 'zh-CN'))))) : null)) : null) : null, Confirm && confirm && shown ? /*#__PURE__*/React.createElement(Confirm, {
      open: true,
      icon: null,
      className: "asst-workspace-confirm asst-confirm-dialog",
      title: confirm.kind === 'delete' ? copy.removeTitle : copy.discardTitle,
      message: confirm.kind === 'delete' ? copy.removeBody + '\n' + fileLabel(confirm.file) : copy.discardBody,
      cancelLabel: copy.cancel,
      confirmLabel: confirm.kind === 'delete' ? copy.remove : copy.discard,
      tone: "danger",
      onClose: () => setConfirm(null),
      onConfirm: () => {
        const action = confirm;
        setConfirm(null);
        if (action.kind === 'delete') return remove(action.file);
        action.action();
      }
    }) : null);
  }
  window.AssistantWorkspacePanel = AssistantWorkspacePanel;
  window.AssistantWorkspaceDialog = AssistantWorkspaceDialog;
})();
}
