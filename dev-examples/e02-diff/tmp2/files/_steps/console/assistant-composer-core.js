(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantComposerCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const SESSION_KEY_PREFIX = "lf_assistant_session_global";
  const COMPOSER_KEY_PREFIX = "lf_assistant_composer";
  const COMPOSER_VERSION = 1;
  const RETAIN_LOGICAL_SEND_CODES = {
    assistant_invocation_outcome_unknown: true,
    assistant_stream_incomplete: true
  };

  function accountScope(accountId) {
    if (accountId == null) return null;
    const scope = String(accountId).trim();
    return scope || null;
  }

  function sessionStorageKey(accountId, prefix) {
    const root = prefix || SESSION_KEY_PREFIX;
    const scope = accountScope(accountId);
    return scope ? root + ":" + scope : root;
  }

  function composerStorageKey(accountId) {
    const scope = accountScope(accountId);
    return scope ? COMPOSER_KEY_PREFIX + ":" + scope : null;
  }

  function storageGet(storage, key) {
    if (!storage || !key || typeof storage.getItem !== "function") return null;
    try {
      return storage.getItem(key);
    } catch (ignored) {
      return null;
    }
  }

  function storageSet(storage, key, value) {
    if (!storage || !key || typeof storage.setItem !== "function") return false;
    try {
      storage.setItem(key, value);
      return true;
    } catch (ignored) {
      return false;
    }
  }

  function storageRemove(storage, key) {
    if (!storage || !key || typeof storage.removeItem !== "function") return;
    try {
      storage.removeItem(key);
    } catch (ignored) {}
  }

  function readSessionId(storage, accountId, prefix) {
    const root = prefix || SESSION_KEY_PREFIX;
    const scoped = sessionStorageKey(accountId, root);
    const direct = storageGet(storage, scoped);
    if (direct) return direct;
    if (accountScope(accountId) && scoped !== root) return storageGet(storage, root);
    return null;
  }

  function writeSessionId(storage, accountId, sessionId, prefix) {
    const root = prefix || SESSION_KEY_PREFIX;
    const key = sessionStorageKey(accountId, root);
    if (!sessionId) {
      storageRemove(storage, key);
      return;
    }
    storageSet(storage, key, String(sessionId));
  }

  function freezePageContext(pageContext) {
    if (!pageContext || typeof pageContext !== "object") return null;
    try {
      return Object.freeze(JSON.parse(JSON.stringify(pageContext)));
    } catch (ignored) {
      return null;
    }
  }

  function freezeBookId(bookId) {
    if (bookId == null || bookId === "") return null;
    return String(bookId);
  }

  function userMessageCount(messages) {
    if (!Array.isArray(messages)) return 0;
    let count = 0;
    for (let index = 0; index < messages.length; index += 1) {
      if (messages[index] && messages[index].role === "user") count += 1;
    }
    return count;
  }

  function sessionReceivedPending(messages, pendingSend) {
    if (!pendingSend || !pendingSend.key || !Array.isArray(messages)) return false;
    return messages.some(message => message && message.role === "user"
      && message.content_json && message.content_json.client_request_key === pendingSend.key);
  }

  function uploadCore() {
    return typeof globalThis !== "undefined" ? globalThis.AssistantUploadCore : null;
  }

  function workspaceFilesOf(files) {
    const Upload = uploadCore();
    if (Upload && typeof Upload.wireWorkspaceFiles === "function") return Upload.wireWorkspaceFiles(files);
    return [];
  }

  function citationFilesOf(files) {
    const Upload = uploadCore();
    if (Upload && typeof Upload.normalizeWorkspaceFiles === "function") return Upload.normalizeWorkspaceFiles(files);
    return workspaceFilesOf(files);
  }

  function sameWorkspaceFiles(left, right) {
    const Upload = typeof globalThis !== "undefined" ? globalThis.AssistantUploadCore : null;
    if (Upload && typeof Upload.sameWorkspaceFiles === "function") return Upload.sameWorkspaceFiles(left, right);
    return workspaceFilesOf(left).length === 0 && workspaceFilesOf(right).length === 0;
  }

  function createLogicalSend(fields, invocationKey) {
    const source = fields || {};
    const key = source.key || invocationKey;
    if (!key) throw new Error("Assistant logical send is missing an invocation key");
    return {
      sessionId: source.sessionId || null,
      ...(Object.prototype.hasOwnProperty.call(source, "expectedVersionId") ? { expectedVersionId: source.expectedVersionId } : {}),
      content: String(source.content || ""),
      pageContext: freezePageContext(source.pageContext),
      bookId: freezeBookId(source.bookId),
      userMessageCount: Number(source.userMessageCount || 0),
      workspaceFiles: workspaceFilesOf(source.workspaceFiles),
      key,
      optimisticId: source.optimisticId || ("local-" + key),
      streamingId: source.streamingId || ("stream-" + key)
    };
  }

  function reuseOrCreateLogicalSend(current, next, newKey) {
    const incoming = next || {};
    if (
      current
      && current.key
      && current.sessionId
      && current.sessionId === incoming.sessionId
      && current.expectedVersionId === incoming.expectedVersionId
      && String(current.content || "") === String(incoming.content || "")
      && sameWorkspaceFiles(current.workspaceFiles, incoming.workspaceFiles)
    ) {
      return current;
    }
    const key = typeof newKey === "function" ? newKey() : newKey;
    return createLogicalSend({
      sessionId: incoming.sessionId,
      ...(Object.prototype.hasOwnProperty.call(incoming, "expectedVersionId") ? { expectedVersionId: incoming.expectedVersionId } : {}),
      content: incoming.content,
      pageContext: freezePageContext(incoming.pageContext),
      bookId: freezeBookId(incoming.bookId),
      userMessageCount: incoming.userMessageCount,
      workspaceFiles: incoming.workspaceFiles
    }, key);
  }

  function emptyComposerState() {
    return { draft: "", pendingSend: null, citations: [] };
  }

  function parsePendingSend(value) {
    if (!value || typeof value !== "object" || !value.key || !value.content || !value.sessionId) {
      return null;
    }
    return createLogicalSend({
      sessionId: value.sessionId,
      ...(Object.prototype.hasOwnProperty.call(value, "expectedVersionId") ? { expectedVersionId: value.expectedVersionId } : {}),
      content: value.content,
      pageContext: value.pageContext || null,
      bookId: value.bookId,
      userMessageCount: value.userMessageCount,
      workspaceFiles: value.workspaceFiles,
      key: value.key,
      optimisticId: value.optimisticId,
      streamingId: value.streamingId
    }, value.key);
  }

  function parseDraftContext(value) {
    if (!value || typeof value.bookId !== "string" || !value.bookId
      || value.pageContext?.surface !== "custom_settings") return null;
    return { bookId: value.bookId, bookTitle: value.bookTitle,
      pageContext: freezePageContext(value.pageContext) };
  }

  function parseComposerState(raw) {
    if (!raw) return emptyComposerState();
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!parsed || typeof parsed !== "object") return emptyComposerState();
      const draft = typeof parsed.draft === "string" ? parsed.draft : "";
      return {
        draft,
        ...(draft && parseDraftContext(parsed.draftContext) ? { draftContext: parseDraftContext(parsed.draftContext) } : {}),
        pendingSend: parsePendingSend(parsed.pendingSend),
        citations: citationFilesOf(parsed.citations)
      };
    } catch (ignored) {
      return emptyComposerState();
    }
  }

  function readState(storage, accountId) {
    const key = composerStorageKey(accountId);
    if (!key) return emptyComposerState();
    return parseComposerState(storageGet(storage, key));
  }

  function serializeComposerState(state) {
    const value = state || emptyComposerState();
    const citations = citationFilesOf(value.citations);
    const pendingSend = parsePendingSend(value.pendingSend);
    return JSON.stringify({
      v: COMPOSER_VERSION,
      draft: typeof value.draft === "string" ? value.draft : "",
      ...(value.draft && parseDraftContext(value.draftContext) ? { draftContext: parseDraftContext(value.draftContext) } : {}),
      pendingSend,
      ...(citations.length ? { citations: citations } : {})
    });
  }

  function writeState(storage, accountId, state) {
    const key = composerStorageKey(accountId);
    if (!key) return false;
    const next = state || emptyComposerState();
    const draft = typeof next.draft === "string" ? next.draft : "";
    const pendingSend = parsePendingSend(next.pendingSend);
    const citations = citationFilesOf(next.citations);
    if (!draft && !pendingSend && !citations.length) {
      storageRemove(storage, key);
      return true;
    }
    return storageSet(storage, key, serializeComposerState({ draft, pendingSend, draftContext: next.draftContext, citations: citations }));
  }

  function clearState(storage, accountId) {
    storageRemove(storage, composerStorageKey(accountId));
  }

  function reconcileCitations(citations, pendingSend, received) {
    const Upload = typeof globalThis !== "undefined" ? globalThis.AssistantUploadCore : null;
    const current = citationFilesOf(citations);
    if (!received || !pendingSend || !Upload || typeof Upload.subtractWorkspaceFiles !== "function") return current;
    return Upload.subtractWorkspaceFiles(current, pendingSend.workspaceFiles);
  }

  function reconcile(options) {
    const opts = options || {};
    const pendingSend = parsePendingSend(opts.pendingSend);
    const messages = Array.isArray(opts.messages) ? opts.messages : [];
    const liveDraft = typeof opts.draft === "string" ? opts.draft : "";
    const sessionId = opts.sessionId || null;
    const citations = citationFilesOf(opts.citations);

    if (!pendingSend) {
      return { draft: liveDraft, pendingSend: null, received: false, citations: citations };
    }
    if (sessionId && pendingSend.sessionId && pendingSend.sessionId !== sessionId) {
      const received = sessionReceivedPending(messages, pendingSend);
      if (received) {
        return {
          draft: liveDraft.trim() === pendingSend.content.trim() ? "" : liveDraft,
          pendingSend: null,
          received: true,
          citations: reconcileCitations(citations, pendingSend, true)
        };
      }
      return { draft: pendingSend.content, pendingSend: null, received: false, citations: citations };
    }
    if (sessionReceivedPending(messages, pendingSend)) {
      return {
        draft: liveDraft.trim() === pendingSend.content.trim() ? "" : liveDraft,
        pendingSend: null,
        received: true,
        citations: reconcileCitations(citations, pendingSend, true)
      };
    }
    if (Object.prototype.hasOwnProperty.call(opts, "expectedVersionId")
      && pendingSend.expectedVersionId !== opts.expectedVersionId) {
      return { draft: liveDraft || pendingSend.content, pendingSend: null, received: false, citations };
    }
    return {
      draft: liveDraft || pendingSend.content,
      pendingSend,
      received: false,
      citations: citations
    };
  }

  function reconcileWithReceipt(options, receipt) {
    const base = reconcile(options);
    if (!base.pendingSend || base.received) return base;
    if (!receipt || typeof receipt !== "object") return base;
    const sessionId = options && options.sessionId;
    if (sessionId && receipt.session_id && String(receipt.session_id) !== String(sessionId)) {
      return base;
    }
    if (String(receipt.client_request_key || "") !== String(base.pendingSend.key)) return base;
    if (Object.prototype.hasOwnProperty.call(receipt, "current_version_id")
      && Object.prototype.hasOwnProperty.call(base.pendingSend, "expectedVersionId")
      && receipt.current_version_id !== base.pendingSend.expectedVersionId) return base;
    if (receipt.message_id) {
      return {
        draft: base.draft.trim() === base.pendingSend.content.trim() ? "" : base.draft,
        pendingSend: null,
        received: true,
        citations: reconcileCitations(base.citations, base.pendingSend, true)
      };
    }
    return base;
  }

  function errorCode(error) {
    const detail = error && error.body && error.body.detail;
    if (detail && typeof detail === "object" && detail.code) return String(detail.code);
    if (error && error.code) return String(error.code);
    return "";
  }

  function isAbortError(error) {
    return !!(error && (error.name === "AbortError" || error.code === "ABORT_ERR"));
  }

  function shouldRetainLogicalSend(error) {
    if (!error) return false;
    if (isAbortError(error)) return true;
    const code = errorCode(error);
    if (RETAIN_LOGICAL_SEND_CODES[code]) return true;
    return error.message === "Assistant stream ended before completion";
  }

  function createOwnedStream(abortController) {
    const AbortCtor = abortController;
    if (typeof AbortCtor !== "function") {
      throw new Error("AbortController is unavailable");
    }
    let generation = 0;
    let controller = null;

    function begin() {
      const owner = generation + 1;
      generation = owner;
      if (controller) controller.abort();
      const next = new AbortCtor();
      controller = next;
      return { owner, controller: next };
    }

    function isCurrent(token) {
      return !!(token && token.owner === generation && token.controller === controller);
    }

    function release(token, onRelease) {
      if (!token) return false;
      if (controller === token.controller) controller = null;
      if (token.owner !== generation) return false;
      if (typeof onRelease === "function") onRelease();
      return true;
    }

    function abort() {
      if (controller) controller.abort();
    }

    return {
      begin,
      release,
      abort,
      isCurrent,
      get controller() {
        return controller;
      },
      get generation() {
        return generation;
      }
    };
  }

  return {
    SESSION_KEY_PREFIX,
    COMPOSER_KEY_PREFIX,
    COMPOSER_VERSION,
    accountScope,
    sessionStorageKey,
    composerStorageKey,
    readSessionId,
    writeSessionId,
    freezePageContext,
    freezeBookId,
    userMessageCount,
    sessionReceivedPending,
    createLogicalSend,
    reuseOrCreateLogicalSend,
    workspaceFilesOf,
    citationFilesOf,
    sameWorkspaceFiles,
    emptyComposerState,
    parseComposerState,
    readState,
    writeState,
    clearState,
    reconcile,
    reconcileWithReceipt,
    errorCode,
    isAbortError,
    shouldRetainLogicalSend,
    createOwnedStream
  };
});
