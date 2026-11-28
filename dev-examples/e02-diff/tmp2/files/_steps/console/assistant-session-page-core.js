(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantSessionPageCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const DEFAULT_LIMIT = 40;
  const MAX_LIMIT = 100;

  function emptyPage() {
    return { has_more: false, before_sequence: null };
  }

  function normalizePage(value) {
    if (!value || typeof value !== "object") return emptyPage();
    const before = Number(value.before_sequence);
    const hasMore = value.has_more === true;
    return {
      has_more: hasMore,
      before_sequence: hasMore && Number.isInteger(before) && before > 0 ? before : null
    };
  }

  function pageFromPayload(payload) {
    if (!payload || typeof payload !== "object") return emptyPage();
    if (payload.message_page) return normalizePage(payload.message_page);
    if (payload.session && payload.session.message_page) return normalizePage(payload.session.message_page);
    return emptyPage();
  }

  function payloadSessionId(payload) {
    if (!payload || typeof payload !== "object") return null;
    if (payload.session_id) return String(payload.session_id);
    if (payload.session && payload.session.id) return String(payload.session.id);
    if (payload.id && payload.messages) return String(payload.id);
    return null;
  }

  function isCurrentSessionPage(payload, sessionId) {
    const id = payloadSessionId(payload);
    return !!(sessionId && id && String(id) === String(sessionId));
  }

  function messageSequence(message) {
    const sequence = Number(message && message.sequence);
    return Number.isInteger(sequence) ? sequence : null;
  }

  function minSequence(messages) {
    let min = null;
    (Array.isArray(messages) ? messages : []).forEach((message) => {
      const sequence = messageSequence(message);
      if (sequence == null) return;
      min = min == null ? sequence : Math.min(min, sequence);
    });
    return min;
  }

  function sortMessages(messages) {
    const list = Array.isArray(messages) ? messages.slice() : [];
    list.sort((left, right) => {
      const leftSequence = messageSequence(left);
      const rightSequence = messageSequence(right);
      if (leftSequence != null && rightSequence != null && leftSequence !== rightSequence) {
        return leftSequence - rightSequence;
      }
      if (leftSequence != null && rightSequence == null) return -1;
      if (leftSequence == null && rightSequence != null) return 1;
      return 0;
    });
    return list;
  }

  function isLocalFragment(message, streamingId) {
    const id = message && message.id;
    if (!id) return false;
    if (streamingId && (id === streamingId || message.stream_id === streamingId)) return true;
    const text = String(id);
    return text.indexOf("local-") === 0 || text.indexOf("stream-") === 0;
  }

  function mergeMessageRecord(local, remote) {
    const Stream = typeof globalThis === "object" ? globalThis.AssistantStreamCore : null;
    const hydratedRemote = Stream && typeof Stream.hydrateMessage === "function"
      ? Stream.hydrateMessage(remote, { authoritative: true })
      : remote;
    const next = Object.assign({}, local || {}, hydratedRemote || {});
    if (Stream && Stream.presentationOf && Stream.presentationOf(remote)) {
      next.stream_segments = hydratedRemote.stream_segments;
      next.presentation_status = hydratedRemote.presentation_status || next.presentation_status;
    } else if (local && Array.isArray(local.stream_segments) && !Array.isArray(remote && remote.stream_segments)) {
      next.stream_segments = local.stream_segments;
      if (local.presentation_status && !next.presentation_status) next.presentation_status = local.presentation_status;
    }
    if (local && local.stream_id && !next.stream_id) next.stream_id = local.stream_id;
    return next;
  }

  function uniqueById(messages) {
    const seen = new Set();
    const next = [];
    (Array.isArray(messages) ? messages : []).forEach((message) => {
      if (!message || !message.id) return;
      if (seen.has(message.id)) return;
      seen.add(message.id);
      next.push(message);
    });
    return next;
  }

  function keepEarlierMessages(current, snapshot) {
    const authoritative = Array.isArray(snapshot) ? snapshot : [];
    const currentList = Array.isArray(current) ? current : [];
    if (!authoritative.length) return [];
    const snapshotIds = new Set(authoritative.map((message) => message && message.id).filter(Boolean));
    const earliest = minSequence(authoritative);
    return currentList.filter((message) => {
      if (!message || !message.id || snapshotIds.has(message.id)) return false;
      const sequence = messageSequence(message);
      if (earliest != null && sequence != null) return sequence < earliest;
      return sequence != null;
    });
  }

  function mergeSnapshotMessages(current, snapshot, finalMessage, streamingId, reconcile) {
    const currentList = Array.isArray(current) ? current : [];
    const authoritative = Array.isArray(snapshot) ? snapshot : [];
    const earlier = keepEarlierMessages(currentList, authoritative);
    const windowCurrent = currentList.filter((message) => {
      if (!message) return false;
      if (isLocalFragment(message, streamingId)) return true;
      return authoritative.some((item) => item && item.id === message.id);
    });
    const reconciled = typeof reconcile === "function"
      ? reconcile(windowCurrent, authoritative, finalMessage, streamingId)
      : uniqueById(authoritative.concat(windowCurrent.filter((message) => isLocalFragment(message, streamingId))));
    return sortMessages(uniqueById(earlier.concat(reconciled)));
  }

  function mergeOlderMessages(current, older) {
    const map = new Map();
    (Array.isArray(older) ? older : []).forEach((message) => {
      if (message && message.id) map.set(message.id, message);
    });
    (Array.isArray(current) ? current : []).forEach((message) => {
      if (!message || !message.id) return;
      map.set(message.id, mergeMessageRecord(map.get(message.id), message));
    });
    return sortMessages(Array.from(map.values()));
  }

  function isBlockingAction(action, actionApi) {
    if (actionApi && typeof actionApi.isActionBlocking === "function") {
      return actionApi.isActionBlocking(action);
    }
    const state = action && action.state;
    return !!(action && (action.continuation_pending
      || ["pending", "pending_confirmation", "executing", "ambiguous", "unknown"].includes(state)));
  }

  function mergeSnapshotActions(current, incoming, actionApi) {
    const incomingList = Array.isArray(incoming) ? incoming : [];
    const incomingById = new Map();
    incomingList.forEach((action) => {
      if (action && action.id) incomingById.set(action.id, action);
    });
    const historical = [];
    (Array.isArray(current) ? current : []).forEach((action) => {
      if (!action || !action.id || incomingById.has(action.id)) return;
      if (isBlockingAction(action, actionApi)) return;
      historical.push(action);
    });
    const mergedIncoming = incomingList.map((action) => {
      if (!action || !action.id) return action;
      const local = (Array.isArray(current) ? current : []).find((item) => item && item.id === action.id);
      return local ? Object.assign({}, local, action) : action;
    });
    return historical.concat(mergedIncoming);
  }

  function mergeOlderActions(current, incoming) {
    const map = new Map();
    (Array.isArray(incoming) ? incoming : []).forEach((action) => {
      if (action && action.id && !isBlockingAction(action)) map.set(action.id, action);
    });
    (Array.isArray(current) ? current : []).forEach((action) => {
      if (action && action.id) map.set(action.id, action);
    });
    return Array.from(map.values());
  }

  function mergeSnapshotPage(currentPage, snapshotPage, currentMessages, snapshotMessages) {
    const currentEarliest = minSequence(currentMessages);
    const snapshotEarliest = minSequence(snapshotMessages);
    if (currentEarliest != null && snapshotEarliest != null && currentEarliest < snapshotEarliest) {
      const currentIds = new Set((currentMessages || []).map(message => message.id));
      // Walk back from the new window until it reconnects to loaded history.
      if (!(snapshotMessages || []).some(message => currentIds.has(message.id))) {
        return normalizePage(snapshotPage);
      }
      return normalizePage(currentPage);
    }
    return normalizePage(snapshotPage);
  }

  function pageQuery(beforeSequence, limit) {
    const before = Number(beforeSequence);
    if (!Number.isInteger(before) || before < 1) return null;
    const size = Number(limit);
    const nextLimit = Number.isInteger(size) && size > 0 ? Math.min(MAX_LIMIT, size) : DEFAULT_LIMIT;
    return { before_sequence: before, limit: nextLimit };
  }

  function canLoadEarlier(page, options) {
    const opts = options || {};
    if (opts.loading || opts.resetting) return false;
    const cursor = normalizePage(page);
    return !!(cursor.has_more && cursor.before_sequence);
  }

  function receiptAcknowledges(pendingSend, receipt, sessionId) {
    if (!pendingSend || !pendingSend.key || !receipt || typeof receipt !== "object") return false;
    if (String(receipt.client_request_key || "") !== String(pendingSend.key)) return false;
    if (sessionId && receipt.session_id && String(receipt.session_id) !== String(sessionId)) return false;
    if (pendingSend.sessionId && receipt.session_id && String(receipt.session_id) !== String(pendingSend.sessionId)) {
      return false;
    }
    return receipt.message_id != null && String(receipt.message_id) !== "";
  }

  return {
    DEFAULT_LIMIT,
    MAX_LIMIT,
    emptyPage,
    normalizePage,
    pageFromPayload,
    payloadSessionId,
    isCurrentSessionPage,
    messageSequence,
    minSequence,
    sortMessages,
    mergeSnapshotMessages,
    mergeOlderMessages,
    mergeSnapshotActions,
    mergeOlderActions,
    mergeSnapshotPage,
    pageQuery,
    canLoadEarlier,
    receiptAcknowledges
  };
});
