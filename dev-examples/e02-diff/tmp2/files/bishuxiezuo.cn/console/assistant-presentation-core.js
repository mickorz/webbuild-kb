(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantPresentationCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const PRESENTATION_VERSION = 1;
  const TERMINAL_MESSAGE = ["completed", "failed", "cancelled"];
  const OPEN_TOOL = ["building", "running"];
  const MONOLOGUE_END = ["completed", "incomplete", "truncated"];

  function presentationOf(message) {
    const document = message && message.content_json;
    const presentation = document && document.presentation;
    if (!presentation || typeof presentation !== "object") return null;
    if (presentation.version !== PRESENTATION_VERSION) return null;
    return presentation;
  }

  function monologueStatus(value) {
    const status = String(value || "").toLowerCase();
    if (MONOLOGUE_END.indexOf(status) >= 0 || status === "running") return status;
    return "running";
  }

  function profileVersion(value) {
    if (Number.isInteger(value)) return value;
    if (typeof value === "number" && Number.isFinite(value) && Math.floor(value) === value) return value;
    return null;
  }

  function hydrateTool(tool) {
    const current = tool && typeof tool === "object" ? tool : {};
    const status = current.status || "running";
    return {
      id: current.id || null,
      call_id: current.call_id || null,
      tool_call_id: current.tool_call_id || null,
      run_id: current.run_id || null,
      index: current.index == null ? null : current.index,
      name: current.name || "",
      status,
      error_code: current.error_code || null,
      error_status: current.error_status == null ? null : current.error_status,
      errorKey: current.errorKey || null
    };
  }

  function hydrateMonologue(segment) {
    const current = segment && typeof segment === "object" ? segment : {};
    const next = {
      type: "monologue",
      content: typeof current.content === "string" ? current.content : "",
      profile_id: typeof current.profile_id === "string" ? current.profile_id : "",
      profile_version: profileVersion(current.profile_version),
      status: monologueStatus(current.status)
    };
    if (typeof current.monologue_id === "string" && current.monologue_id) {
      next.monologue_id = current.monologue_id;
    }
    return next;
  }

  function splitLeadingMonologue(text) {
    if (typeof text !== "string" || !text) return null;
    let index = 0;
    while (index < text.length && index <= 64 && (text[index] === "\ufeff" || /\s/.test(text[index]))) {
      index += 1;
    }
    if (index > 64) return null;
    const rest = text.slice(index);
    const opening = rest.indexOf("<monologue>") === 0
      ? "<monologue>"
      : rest.indexOf("<yuan>") === 0 ? "<yuan>" : "";
    if (!opening) return null;
    const closing = opening === "<monologue>" ? "</monologue>" : "</yuan>";
    const afterOpen = index + opening.length;
    const closeAt = text.indexOf(closing, afterOpen);
    if (closeAt < 0) {
      return {
        monologue: hydrateMonologue({ content: text.slice(afterOpen), status: "incomplete" }),
        rest: ""
      };
    }
    let trailing = text.slice(closeAt + closing.length);
    trailing = trailing.replace(/^(?:\uFEFF|\s)+/, "");
    return {
      monologue: hydrateMonologue({ content: text.slice(afterOpen, closeAt), status: "completed" }),
      rest: trailing
    };
  }

  function restoreHistoricalMonologues(segments) {
    const list = Array.isArray(segments) ? segments : [];
    const next = [];
    list.forEach((segment) => {
      const previous = next[next.length - 1];
      const atBoundary = next.length === 0 || (previous && previous.type === "tool");
      if (!atBoundary || !segment || segment.type !== "text") {
        next.push(segment);
        return;
      }
      const split = splitLeadingMonologue(segment.content);
      if (!split) {
        next.push(segment);
        return;
      }
      next.push(split.monologue);
      if (split.rest) next.push({ type: "text", content: split.rest });
    });
    return next;
  }

  function hydrateSegments(raw) {
    if (!Array.isArray(raw)) return [];
    const next = [];
    raw.forEach((segment) => {
      if (!segment || typeof segment !== "object") return;
      if (segment.type === "text") {
        next.push({ type: "text", content: typeof segment.content === "string" ? segment.content : "" });
        return;
      }
      if (segment.type === "monologue" || segment.type === "yuan") {
        next.push(hydrateMonologue(segment));
        return;
      }
      if (segment.type === "tool") {
        next.push({ type: "tool", tool: hydrateTool(segment.tool) });
      }
    });
    return restoreHistoricalMonologues(next);
  }

  function hydrateMessage(message, options) {
    if (!message || typeof message !== "object") return message;
    const presentation = presentationOf(message);
    if (!presentation) {
      if (message.role === "assistant" && typeof message.content === "string" && !Array.isArray(message.stream_segments)) {
        const split = splitLeadingMonologue(message.content);
        if (!split) return message;
        const segments = [split.monologue];
        if (split.rest) segments.push({ type: "text", content: split.rest });
        return Object.assign({}, message, { stream_segments: segments });
      }
      return message;
    }
    const force = !!(options && options.authoritative);
    const live = Array.isArray(message.stream_segments) && message.stream_segments.length;
    if (live && !force) {
      return Object.assign({}, message, {
        presentation_status: message.presentation_status || presentation.status || null
      });
    }
    return Object.assign({}, message, {
      stream_segments: hydrateSegments(presentation.segments),
      presentation_status: presentation.status || message.presentation_status || null
    });
  }

  function processStatus(items) {
    const statuses = (Array.isArray(items) ? items : [])
      .filter((item) => item && item.type === "tool")
      .map((item) => item.tool && item.tool.status || "running");
    // Aggregate work still happening before summarizing earlier outcomes.
    if (statuses.some((status) => status === "running")) return "running";
    if (statuses.indexOf("building") >= 0) return "building";
    if (statuses.indexOf("pending") >= 0) return "pending";
    if (statuses.indexOf("queued") >= 0) return "queued";
    if (statuses.indexOf("blocked") >= 0) return "blocked";
    if (statuses.indexOf("failed") >= 0) return statuses.indexOf("completed") >= 0 ? "partial" : "failed";
    if (statuses.indexOf("expired") >= 0) return statuses.indexOf("completed") >= 0 ? "partial" : "expired";
    if (statuses.indexOf("cancelled") >= 0) return "cancelled";
    return "completed";
  }

  function lastToolIndex(segments) {
    for (let index = segments.length - 1; index >= 0; index -= 1) {
      if (segments[index] && segments[index].type === "tool") return index;
    }
    return -1;
  }

  function groupVisibleSegments(segments, options) {
    const list = (Array.isArray(segments) ? segments : []).filter((segment) => {
      return segment && (segment.type === "text" || segment.type === "tool" || segment.type === "monologue");
    });
    const folded = !!(options && options.folded);
    if (!folded) return list;
    return projectTurn(list, options);
  }

  // The same display projection serves a live turn, recovered prefix and history.
  // It owns no execution state: operation identities and business cards pass through.
  function projectTurn(segments, options = {}) {
    const list = (Array.isArray(segments) ? segments : []).filter(segment => segment
      && (segment.type === "tool" || (segment.type === "text" || segment.type === "monologue") && segment.content));
    const first = list.findIndex(segment => segment.type === "tool");
    let last = lastToolIndex(list);
    const cards = (options.cards || []).map(action => ({ type: "action_card", key: "action:" + action.id, action }));
    if (first < 0) return list.concat(cards);
    while (list[last + 1]?.type === "monologue") last++;
    const process = list.slice(first, last + 1);
    const status = processStatus(process);
    // A reply may still be streaming after its tools finish. Disclosure lifetime
    // is independent of the tool summary; never invent ongoing tool work.
    const keepOpen = ["running", "queued", "cancelling", "cancel_requested"].includes(options.runStatus);
    return list.slice(0, first).concat({ type: "process_group", key: options.key || "process", status, keepOpen, items: process }, cards, list.slice(last + 1));
  }

  function hasProcessContent(segments) {
    return (Array.isArray(segments) ? segments : []).some((segment) => segment && segment.type === "tool");
  }

  function isTerminalStatus(status) {
    return TERMINAL_MESSAGE.indexOf(status) >= 0;
  }

  function shouldFold(message) {
    const current = message || {};
    const segments = current.stream_segments;
    if (!hasProcessContent(segments)) return false;
    const status = current.presentation_status;
    if (status === "running") return false;
    if (status === "pending" || isTerminalStatus(status)) return true;
    const id = String(current.id || "");
    if (id.indexOf("stream-") === 0 || id.indexOf("local-") === 0) return false;
    return true;
  }

  function derivePresentationStatus(segments, data) {
    const tools = (Array.isArray(segments) ? segments : [])
      .filter((segment) => segment && segment.type === "tool")
      .map((segment) => segment.tool || {});
    if (tools.some((tool) => tool.status === "pending")) return "pending";
    const payload = data || {};
    const raw = String(payload.status || payload.terminal || "").toLowerCase();
    const terminal = String(payload.terminal || "").toLowerCase();
    if (terminal === "cancelled" || raw === "cancelled" || raw === "canceled" || raw === "aborted") {
      return "cancelled";
    }
    if (terminal === "error" || payload.errorKey) return "failed";
    if (tools.some((tool) => tool.status === "failed" || OPEN_TOOL.indexOf(tool.status) >= 0)) return "failed";
    return "completed";
  }

  function sameRequest(message, streamingId, persistentId) {
    if (!message) return false;
    if (persistentId && message.id === persistentId) return true;
    if (streamingId && (message.id === streamingId || message.stream_id === streamingId)) return true;
    return false;
  }

  function findBindIndex(messages, streamingId, persistentId) {
    const list = Array.isArray(messages) ? messages : [];
    const live = list.findIndex((message) => message && streamingId
      && (message.id === streamingId || message.stream_id === streamingId));
    if (live >= 0) return live;
    for (let index = 0; index < list.length; index += 1) {
      if (sameRequest(list[index], streamingId, persistentId)) return index;
    }
    return -1;
  }

  function bindPresentation(messages, streamingId, snapshotMessage) {
    const list = Array.isArray(messages) ? messages.slice() : [];
    if (!snapshotMessage || !snapshotMessage.id) return list;
    const persistentId = snapshotMessage.id;
    const existingPersistent = list.findIndex((message) => message && message.id === persistentId);
    if (existingPersistent >= 0) {
      const existing = list[existingPersistent];
      const existingStatus = existing.presentation_status || (presentationOf(existing) || {}).status;
      const sameLive = streamingId && (existing.stream_id === streamingId || existing.id === streamingId);
      if (existingStatus === "completed" && !sameLive) {
        return list;
      }
    }
    const liveIndex = findBindIndex(list, streamingId, persistentId);
    const live = liveIndex >= 0 ? list[liveIndex] : null;
    const hydrated = hydrateMessage(snapshotMessage, { authoritative: true });
    const merged = Object.assign({}, live || {}, hydrated, {
      id: persistentId,
      stream_id: streamingId || (live && (live.stream_id || live.id)) || hydrated.stream_id,
      stream_segments: Array.isArray(hydrated.stream_segments)
        ? hydrated.stream_segments
        : (live && live.stream_segments) || [],
      presentation_status: hydrated.presentation_status
        || (live && live.presentation_status)
        || "running",
      content: hydrated.content == null ? (live && live.content) || "" : hydrated.content
    });
    if (liveIndex >= 0) list.splice(liveIndex, 1);
    const leftover = list.findIndex((message) => message && message.id === persistentId);
    if (leftover >= 0) list.splice(leftover, 1);
    const insertAt = liveIndex >= 0 ? Math.min(liveIndex, list.length) : list.length;
    list.splice(insertAt, 0, merged);
    return list;
  }

  function defaultProcessOpen(status) {
    return status === "building" || status === "pending" || status === "expired" || status === "failed" || status === "partial" || status === "running" || status === "blocked" || status === "queued";
  }

  return {
    PRESENTATION_VERSION,
    presentationOf,
    hydrateSegments,
    hydrateMonologue,
    splitLeadingMonologue,
    restoreHistoricalMonologues,
    hydrateMessage,
    groupVisibleSegments,
    projectTurn,
    shouldFold,
    derivePresentationStatus,
    bindPresentation,
    isTerminalStatus,
    defaultProcessOpen,
    processStatus,
    hasProcessContent
  };
});
