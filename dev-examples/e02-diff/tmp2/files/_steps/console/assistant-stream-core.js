(function (root, factory) {
  const Presentation = (root && root.AssistantPresentationCore) || {};
  const api = factory(Presentation);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantStreamCore = api;
})(typeof globalThis === "object" ? globalThis : this, function (Presentation) {
  const OPEN_TOOL_STATUSES = ["building", "running"];
  const TOOL_ERROR_KEYS = {
    assistant_book_context_required: "asst_tool_target_required",
    assistant_permission_denied: "asst_tool_permission_denied",
    assistant_resource_not_found: "asst_tool_resource_missing",
    navigation_draft: "asst_navigation_draft",
    navigation_target_changed: "asst_navigation_target_changed",
    navigation_target_missing: "asst_tool_target_required",
    navigation_load_failed: "asst_navigation_load_failed",
    navigation_blocked: "asst_navigation_blocked",
    navigation_timeout: "asst_navigation_timeout",
    assistant_tool_arguments_rejected: "asst_tool_invalid_arguments",
    tool_arguments_invalid: "asst_tool_invalid_arguments",
    workspace_invalid: "asst_tool_workspace_invalid",
    workspace_forbidden: "asst_tool_workspace_unavailable",
    tool_arguments_repeated: "asst_tool_arguments_repeated",
    tool_recovery_stopped: "asst_tool_recovery_stopped",
    tool_round_limit: "asst_tool_round_limit",
    assistant_rate_limited: "asst_rate_limited",
    // Tool-result envelope reasons and codes keep the copy their old HTTP statuses showed.
    book_context_required: "asst_tool_target_required",
    rate_limited: "asst_rate_limited",
    result_too_large: "asst_tool_error_generic",
    resource_locked: "asst_tool_error_generic",
    personalization_invalid: "asst_tool_error_generic",
    tool_scope_mismatch: "asst_tool_error_generic",
    tool_guard_rejected: "asst_tool_error_generic",
    repeated_invalid_call: "asst_tool_arguments_repeated",
    recovery_stopped: "asst_tool_recovery_stopped",
    invalid_argument: "asst_tool_invalid_arguments",
    not_found: "asst_tool_resource_missing",
    permission_denied: "asst_tool_permission_denied",
    aborted: "asst_tool_conflict",
    failed_precondition: "asst_tool_conflict"
  };
  const USER_DECISION_STATUSES = ["declined", "revision_requested", "expired"];
  const TOOL_ERROR_BY_STATUS = {
    403: "asst_tool_permission_denied",
    404: "asst_tool_resource_missing",
    409: "asst_tool_conflict",
    422: "asst_tool_invalid_arguments",
    429: "asst_rate_limited"
  };

  function own(object, key) {
    return object && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : null;
  }

  function firstIdentity() {
    for (let index = 0; index < arguments.length; index += 1) {
      const value = arguments[index];
      if (value != null && String(value) !== "") return value;
    }
    return null;
  }

  function identityValues(data) {
    if (!data || typeof data !== "object") return [];
    const values = [];
    ["call_id", "run_id", "id", "tool_call_id"].forEach((key) => {
      const value = data[key];
      if (value == null || value === "") return;
      const text = String(value);
      if (values.indexOf(text) < 0) values.push(text);
    });
    return values;
  }

  function identitiesMatch(tool, data) {
    const left = identityValues(tool);
    const right = identityValues(data);
    if (!left.length || !right.length) return false;
    return right.some((id) => left.indexOf(id) >= 0);
  }

  function normalizeEvent(streamEvent) {
    const rawEvent = streamEvent && streamEvent.event;
    const event = { yuan_start: "monologue_start", yuan_delta: "monologue_delta", yuan_end: "monologue_end" }[rawEvent] || rawEvent;
    const data = streamEvent && streamEvent.data || {};
    if (event === "token" && typeof data.content === "string") {
      return { kind: "text", content: data.content };
    }
    if (event === "text_delta" && typeof data.delta === "string") {
      return { kind: "text", content: data.delta };
    }
    if (event === "reasoning_token" && typeof data.content === "string") {
      return { kind: "reasoning", content: data.content };
    }
    if (event === "monologue_start" || event === "monologue_delta" || event === "monologue_end") {
      return { kind: event, data };
    }
    if (event === "tool_call_delta") return { kind: "tool_delta", data };
    if (["stream_start", "tool_start", "tool_end", "tool_pending", "llm_usage", "stream_end"].includes(event)) {
      return { kind: event, data };
    }
    return null;
  }

  function appendText(segments, content) {
    if (!content) return segments;
    const last = segments[segments.length - 1];
    if (last && last.type === "text") {
      return segments.slice(0, -1).concat([{ type: "text", content: last.content + content }]);
    }
    return segments.concat([{ type: "text", content }]);
  }

  function findToolIndex(segments, data, statuses, allowStartAlias) {
    const allowed = Array.isArray(statuses) ? statuses : null;
    if (data && identityValues(data).length) {
      for (let index = segments.length - 1; index >= 0; index -= 1) {
        const segment = segments[index];
        if (!segment || segment.type !== "tool") continue;
        if (identitiesMatch(segment.tool || {}, data)) return index;
      }
    }
    function canUseFallback(tool) {
      // A stable call ID wins over reusable per-model indices or tool names.
      // Only an anonymous placeholder may acquire its first identity this way.
      if (!identityValues(data).length) return true;
      if (allowStartAlias && data.index != null && tool.status === "building"
        && !data.id && !data.call_id && !data.tool_call_id) return true;
      return !identityValues(tool).some((id) => !/^(pending|running|terminal):/.test(id));
    }
    if (data && data.index != null) {
      for (let index = segments.length - 1; index >= 0; index -= 1) {
        const segment = segments[index];
        if (!segment || segment.type !== "tool") continue;
        const tool = segment.tool || {};
        if (tool.index !== data.index || !canUseFallback(tool)) continue;
        if (!allowed || allowed.includes(tool.status)) return index;
      }
    }
    if (data && data.name) {
      for (let index = segments.length - 1; index >= 0; index -= 1) {
        const segment = segments[index];
        if (!segment || segment.type !== "tool") continue;
        const tool = segment.tool || {};
        if (tool.name !== data.name || !canUseFallback(tool)) continue;
        if (allowed && !allowed.includes(tool.status)) continue;
        return index;
      }
    }
    return -1;
  }

  function replaceTool(segments, index, tool) {
    const next = segments.slice();
    const segment = { type: "tool", tool };
    if (index < 0) next.push(segment);
    else next[index] = segment;
    return next;
  }

  function assignTool(previous, data, status, segments, extra) {
    const prev = previous || {};
    const incoming = data || {};
    const runId = firstIdentity(
      incoming.run_id,
      prev.run_id,
      incoming.call_id,
      prev.call_id,
      incoming.id,
      prev.id,
      incoming.tool_call_id,
      prev.tool_call_id
    ) || (
      status === "building"
        ? "pending:" + String(incoming.index == null ? segments.length : incoming.index)
        : status === "running" ? "running:" + String(segments.length) : "terminal:" + String(segments.length)
    );
    const failure = extra && extra.errorKey != null ? extra : (status === "failed" ? toolFailure(incoming) : {});
    const failedKey = extra && extra.errorKey != null
      ? extra.errorKey
      : (status === "failed" ? failure.errorKey : null);
    return {
      id: firstIdentity(incoming.id, prev.id, incoming.tool_call_id, incoming.call_id),
      call_id: firstIdentity(incoming.call_id, prev.call_id),
      tool_call_id: firstIdentity(incoming.tool_call_id, prev.tool_call_id, incoming.id),
      index: incoming.index != null ? incoming.index : prev.index,
      run_id: runId,
      name: incoming.name || prev.name || "",
      status,
      error_code: status === "failed" ? (failure.error_code || incoming.error_code || prev.error_code || null) : null,
      error_status: status === "failed" ? (failure.error_status != null ? failure.error_status : (incoming.error_status != null ? incoming.error_status : prev.error_status)) : null,
      errorKey: status === "failed" ? failedKey : null
    };
  }

  function reduceToolDelta(segments, data) {
    const index = findToolIndex(segments, data, ["building"]);
    const previous = index >= 0 ? segments[index].tool : {};
    if (previous.status && previous.status !== "building") return segments;
    return replaceTool(segments, index, assignTool(previous, data, "building", segments));
  }

  function reduceToolStart(segments, data) {
    const index = findToolIndex(segments, data, ["building"], true);
    const previous = index >= 0 ? segments[index].tool : {};
    if (previous.status && !OPEN_TOOL_STATUSES.includes(previous.status)) return segments;
    return replaceTool(segments, index, assignTool(previous, data, "running", segments));
  }

  function reduceToolTerminal(segments, data, status) {
    const index = findToolIndex(segments, data, ["building", "running", "pending"]);
    const previous = index >= 0 ? segments[index].tool : {};
    return replaceTool(segments, index, assignTool(previous, data, status, segments));
  }

  function parsedToolResult(data) {
    if (!data || typeof data.result !== "string" || data.result.length > 20000) return null;
    try { return JSON.parse(data.result); } catch (_) { return null; }
  }

  function toolFailure(data) {
    const result = parsedToolResult(data);
    const output = result && result.output && typeof result.output === "object" ? result.output : result;
    const rejected = !!(output && output.ok === false);
    const decided = !!(output && output.ok === true && USER_DECISION_STATUSES.includes(output.status));
    const error = rejected && output.error || {};
    const code = error.reason && own(TOOL_ERROR_KEYS, error.reason) ? error.reason : error.code;
    return {
      rejected,
      cancelled: decided || (rejected && ["rejected_by_user", "revision_requested", "cancelled"].includes(error.code)),
      error_code: code || null,
      error_status: error.status == null ? null : error.status,
      errorKey: toolErrorKey(error.code, error.status, error.reason)
    };
  }

  function toolErrorKey(code, status, reason) {
    return own(TOOL_ERROR_KEYS, reason) || own(TOOL_ERROR_KEYS, code)
      || own(TOOL_ERROR_BY_STATUS, status) || "asst_tool_error_generic";
  }

  function streamErrorCode(data) {
    if (!data || typeof data !== "object") return "";
    if (typeof data.code === "string" && data.code) return data.code;
    const nested = data.error;
    if (nested && typeof nested === "object" && typeof nested.code === "string") return nested.code;
    return "";
  }

  function finalizeOpenTools(segments, status, errorKey) {
    const nextStatus = status === "cancelled" ? "cancelled" : "failed";
    const current = Array.isArray(segments) ? segments : [];
    let changed = false;
    const next = current.map((segment) => {
      if (!segment || segment.type !== "tool") return segment;
      const tool = segment.tool || {};
      if (!OPEN_TOOL_STATUSES.includes(tool.status)) return segment;
      changed = true;
      return {
        type: "tool",
        tool: Object.assign({}, tool, {
          status: nextStatus,
          errorKey: nextStatus === "failed" ? (errorKey || tool.errorKey || "asst_tool_error_generic") : null,
          error_code: nextStatus === "failed" ? (tool.error_code || null) : null,
          error_status: nextStatus === "failed" ? (tool.error_status == null ? null : tool.error_status) : null
        })
      };
    });
    return changed ? next : current;
  }

  function replaceSegment(segments, index, segment) {
    const next = segments.slice();
    if (index < 0) next.push(segment);
    else next[index] = segment;
    return next;
  }

  function monologueId(data) {
    const value = data && data.monologue_id;
    return typeof value === "string" && value ? value : null;
  }

  function findMonologueIndex(segments, data) {
    const id = monologueId(data);
    const list = Array.isArray(segments) ? segments : [];
    if (id) {
      for (let index = list.length - 1; index >= 0; index -= 1) {
        const segment = list[index];
        if (segment && segment.type === "monologue" && segment.monologue_id === id) return index;
      }
    }
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const segment = list[index];
      if (segment && segment.type === "monologue" && (!segment.status || segment.status === "running")) {
        if (id && segment.monologue_id && segment.monologue_id !== id) continue;
        return index;
      }
    }
    return -1;
  }

  function reduceMonologueStart(segments, data) {
    const incoming = data || {};
    const profileId = typeof incoming.profile_id === "string" ? incoming.profile_id : "";
    const version = Number.isInteger(incoming.profile_version) ? incoming.profile_version : null;
    const id = monologueId(incoming);
    const index = findMonologueIndex(segments, incoming);
    if (index >= 0) {
      const previous = segments[index];
      if (!previous.status || previous.status === "running") {
        return replaceSegment(segments, index, Object.assign({}, previous, {
          profile_id: previous.profile_id || profileId,
          profile_version: previous.profile_version == null ? version : previous.profile_version,
          monologue_id: previous.monologue_id || id || previous.monologue_id
        }));
      }
      if (id && previous.monologue_id === id) return segments;
    }
    const next = {
      type: "monologue",
      content: "",
      profile_id: profileId,
      profile_version: version,
      status: "running"
    };
    if (id) next.monologue_id = id;
    return segments.concat([next]);
  }

  function reduceMonologueDelta(segments, data) {
    const content = data && typeof data.content === "string" ? data.content : "";
    if (!content) return segments;
    let current = segments;
    let index = findMonologueIndex(current, data);
    if (index < 0) {
      const hasMonologue = current.some((segment) => segment && segment.type === "monologue");
      if (hasMonologue && !monologueId(data)) return current;
      current = reduceMonologueStart(current, data || {});
      index = findMonologueIndex(current, data);
    }
    const previous = current[index];
    if (!previous || (previous.status && previous.status !== "running")) return current;
    return replaceSegment(current, index, Object.assign({}, previous, {
      content: String(previous.content || "") + content
    }));
  }

  function reduceMonologueEnd(segments, data) {
    const index = findMonologueIndex(segments, data);
    if (index < 0) return segments;
    const previous = segments[index];
    if (previous.status && previous.status !== "running") return segments;
    const raw = data && data.status;
    const status = ["completed", "incomplete", "truncated"].indexOf(raw) >= 0 ? raw : "incomplete";
    return replaceSegment(segments, index, Object.assign({}, previous, { status }));
  }

  function reduceSegments(segments, progress) {
    const current = Array.isArray(segments) ? segments : [];
    if (!progress) return current;
    if (progress.kind === "stream_start" || progress.kind === "stream_end") return current;
    if (progress.kind === "text") return appendText(current, progress.content);
    if (progress.kind === "monologue_start") return reduceMonologueStart(current, progress.data || {});
    if (progress.kind === "monologue_delta") return reduceMonologueDelta(current, progress.data || {});
    if (progress.kind === "monologue_end") return reduceMonologueEnd(current, progress.data || {});
    if (progress.kind === "tool_delta") return reduceToolDelta(current, progress.data || {});
    if (progress.kind === "tool_start") return reduceToolStart(current, progress.data || {});
    if (progress.kind === "tool_pending") return reduceToolTerminal(current, progress.data || {}, "pending");
    if (progress.kind === "tool_end") {
      const data = progress.data || {};
      const rawStatus = String(data.status || "completed").toLowerCase();
      const failure = toolFailure(data);
      const status = failure.cancelled ? "cancelled" : failure.rejected || ["failed", "error", "failure"].includes(rawStatus)
        ? "failed" : ["cancelled", "canceled", "aborted"].includes(rawStatus)
          ? "cancelled" : ["completed", "success", "succeeded"].includes(rawStatus) ? "completed" : "failed";
      return reduceToolTerminal(current, data, status);
    }
    if (progress.kind === "stream_finalize") {
      const data = progress.data || {};
      const rawStatus = String(data.status || "failed").toLowerCase();
      const status = ["cancelled", "canceled", "aborted"].includes(rawStatus) ? "cancelled" : "failed";
      const code = streamErrorCode(data);
      const errorKey = data.errorKey || (code ? own(TOOL_ERROR_KEYS, code) : null);
      return finalizeOpenTools(current, status, errorKey);
    }
    return current;
  }

  function textContent(segments) {
    return (Array.isArray(segments) ? segments : [])
      .filter((segment) => segment && segment.type === "text")
      .map((segment) => segment.content)
      .join("");
  }

  function nextPresentationStatus(message, progress, segments) {
    if (progress && progress.kind === "stream_finalize") {
      return Presentation.derivePresentationStatus
        ? Presentation.derivePresentationStatus(segments, progress.data || {})
        : "completed";
    }
    if (Presentation.isTerminalStatus && Presentation.isTerminalStatus(message.presentation_status)) {
      return message.presentation_status;
    }
    return "running";
  }

  function reduceMessage(message, progress) {
    const current = message || { role: "assistant", content: "" };
    if (progress?.kind === "resume_text_start") {
      return { ...current, content: "", stream_segments: (current.stream_segments || []).filter(segment => segment.type !== "text"), presentation_status: "running" };
    }
    if (Presentation.isTerminalStatus && Presentation.isTerminalStatus(current.presentation_status)
      && (!progress || progress.kind !== "stream_finalize")) {
      return current;
    }
    const segments = reduceSegments(current.stream_segments, progress);
    const status = nextPresentationStatus(current, progress, segments);
    const content = textContent(segments);
    if (segments === current.stream_segments && status === current.presentation_status && content === current.content) {
      return current;
    }
    return Object.assign({}, current, {
      content,
      stream_segments: segments,
      presentation_status: status
    });
  }

  function attachToolErrors(segments) {
    return (Array.isArray(segments) ? segments : []).map((segment) => {
      if (!segment || segment.type !== "tool" || !segment.tool) return segment;
      const tool = segment.tool;
      if (tool.errorKey || tool.status !== "failed") return segment;
      return {
        type: "tool",
        tool: Object.assign({}, tool, { errorKey: toolErrorKey(tool.error_code, tool.error_status) })
      };
    });
  }

  function hydrateMessage(message, options) {
    const hydrated = Presentation.hydrateMessage ? Presentation.hydrateMessage(message, options) : message;
    if (!hydrated || !Array.isArray(hydrated.stream_segments)) return hydrated;
    return Object.assign({}, hydrated, { stream_segments: attachToolErrors(hydrated.stream_segments) });
  }

  function groupVisibleSegments(segments, options) {
    if (Presentation.groupVisibleSegments) return Presentation.groupVisibleSegments(segments, options);
    return Array.isArray(segments) ? segments : [];
  }

  function shouldFold(message) {
    return Presentation.shouldFold ? Presentation.shouldFold(hydrateMessage(message)) : false;
  }

  function bindPresentation(messages, streamingId, snapshotMessage) {
    const bound = Presentation.bindPresentation
      ? Presentation.bindPresentation(messages, streamingId, snapshotMessage)
      : (Array.isArray(messages) ? messages : []);
    return bound.map((message) => hydrateMessage(message, { authoritative: false }));
  }

  function mergeLocalSegments(messages, current) {
    const localById = new Map(
      current.filter((message) => message && message.id && Array.isArray(message.stream_segments))
        .map((message) => [message.id, message])
    );
    return messages.map((message) => {
      const hydrated = hydrateMessage(message, { authoritative: true });
      const local = message && localById.get(message.id);
      if (Presentation.presentationOf && Presentation.presentationOf(message)) {
        return local && local.stream_id
          ? Object.assign({}, hydrated, { stream_id: local.stream_id }) : hydrated;
      }
      return local && Array.isArray(local.stream_segments) && !Array.isArray(message.stream_segments)
        ? Object.assign({}, hydrated, {
          stream_segments: local.stream_segments,
          presentation_status: local.presentation_status || hydrated.presentation_status,
          stream_id: local.stream_id || hydrated.stream_id
        })
        : hydrated;
    });
  }

  function hasAuthoritativeText(visible, streamedText, last, text) {
    if (!text) return true;
    if (streamedText === text || streamedText.endsWith(text)) return true;
    if (last && last.type === "text" && (last.content === text || last.content.endsWith(text))) return true;
    return visible.some((segment) => segment && segment.type === "text" && segment.content === text);
  }

  function appendAuthoritativeText(visible, text) {
    const streamedText = visible
      .filter((segment) => segment.type === "text")
      .map((segment) => segment.content)
      .join("");
    const last = visible[visible.length - 1];
    if (hasAuthoritativeText(visible, streamedText, last, text)) return visible;
    if (last && last.type === "text" && text.startsWith(last.content)) {
      return visible.slice(0, -1).concat([{ type: "text", content: text }]);
    }
    return visible.concat([{ type: "text", content: text }]);
  }

  function matchesStreaming(message, streamingId) {
    if (!message || !streamingId) return false;
    return message.id === streamingId || message.stream_id === streamingId;
  }

  function terminalSegments(transient, finalMessage) {
    const hydrated = hydrateMessage(finalMessage, { authoritative: true });
    if (Presentation.presentationOf && Presentation.presentationOf(finalMessage)) {
      return Array.isArray(hydrated.stream_segments) ? hydrated.stream_segments : [];
    }
    if (!transient || !Array.isArray(transient.stream_segments)) return null;
    const visible = transient.stream_segments.filter((segment) => {
      return segment && (segment.type === "text" || segment.type === "tool" || segment.type === "monologue");
    });
    if (!visible.some((segment) => segment.type === "tool" || segment.type === "monologue")) return null;
    const settled = finalizeOpenTools(visible, "failed");
    const text = String(finalMessage && (finalMessage.content || finalMessage.text) || "");
    return appendAuthoritativeText(settled, text);
  }

  function reconcileMessages(currentValue, authoritativeValue, finalMessage, streamingId) {
    const current = Array.isArray(currentValue) ? currentValue : [];
    const authoritative = Array.isArray(authoritativeValue) ? authoritativeValue.slice() : current.slice();
    let next = mergeLocalSegments(authoritative, current);
    const transient = streamingId
      ? current.find((message) => matchesStreaming(message, streamingId))
      : null;
    if (!finalMessage && transient) {
      const sameMessage = authoritative.find((message) => message && message.id === transient.id);
      const source = (Presentation.presentationOf(transient) || {}).source_message_id;
      // Recovery snapshots may already contain a committed reply even when its
      // terminal stream event was lost. Associate only a newer server sequence.
      const knownSequence = current.reduce((latest, message) =>
        Math.max(latest, Number(message && message.sequence) || 0), 0);
      const recovered = sameMessage || authoritative.filter((message) => message && message.role === "assistant"
        && Number(message.sequence) > knownSequence).slice(-1)[0] || null;
      const recoveredPresentation = Presentation.presentationOf(recovered);
      if (sameMessage || !recoveredPresentation || (source && source === recoveredPresentation.source_message_id)
        || (recoveredPresentation && current.some((message) => message && message.role === "user"
          && message.id === recoveredPresentation.source_message_id))) {
        finalMessage = recovered;
      }
    }
    if (streamingId) {
      next = next.filter((message) => !message || !matchesStreaming(message, streamingId));
    }
    if (!finalMessage || !finalMessage.id) return transient ? next.concat([transient]) : next;

    const hydratedFinal = hydrateMessage(finalMessage, { authoritative: true });
    const segments = terminalSegments(transient, finalMessage);
    const finalValue = Object.assign({}, hydratedFinal, segments ? { stream_segments: segments } : {});
    if (transient && transient.stream_id) finalValue.stream_id = transient.stream_id;
    if (!finalValue.presentation_status && transient && transient.presentation_status) {
      finalValue.presentation_status = transient.presentation_status;
    }
    const index = next.findIndex((message) => message && message.id === finalValue.id);
    if (index < 0) return next.concat([finalValue]);
    const merged = Object.assign({}, next[index], finalValue);
    if (!segments && Array.isArray(next[index].stream_segments)
      && !(Presentation.presentationOf && Presentation.presentationOf(finalMessage))) {
      merged.stream_segments = finalizeOpenTools(next[index].stream_segments, "failed");
    }
    next[index] = merged;
    return next;
  }

  const CLIENT_NAVIGATION_DESTINATIONS = Object.freeze([
    "shelf",
    "create_book",
    "book_workbench",
    "chapter_outline",
    "chapter_body",
    "book_world",
    "book_custom_settings",
    "book_inbox",
    "book_settings",
    "assistant_memory", "assistant_workspace", "assistant_personalization", "assistant_settings"
  ]);

  function isClientNavigationDestination(destination) {
    return CLIENT_NAVIGATION_DESTINATIONS.indexOf(destination) >= 0;
  }

  function clientNavigationSignal(progress) {
    if (!progress || progress.kind !== "tool_end") return null;
    const data = progress.data || {};
    if (data.name !== "novelbuilt_navigation" || typeof data.result !== "string") return null;
    try {
      const document = JSON.parse(data.result);
      if (!document || document.kind !== "client_navigation" || typeof document.destination !== "string") {
        return null;
      }
      if (!isClientNavigationDestination(document.destination)) return null;
      const chapterNumber = Number(document.chapter_number || 0);
      const signal = { kind: "client_navigation", destination: document.destination };
      if (Number.isInteger(chapterNumber) && chapterNumber > 0) signal.chapter_number = chapterNumber;
      return signal;
    } catch (ignored) {
      return null;
    }
  }

  function navigationRunKey(progress, signal) {
    const data = progress && progress.data || {};
    const runId = data.run_id || data.id || data.call_id || "";
    if (runId) return String(runId);
    if (!signal) return "";
    return signal.destination + ":" + String(signal.chapter_number || "");
  }

  function takeNavigation(progress, seen) {
    const signal = clientNavigationSignal(progress);
    if (!signal) return null;
    const known = seen && typeof seen.has === "function" ? seen : null;
    const key = navigationRunKey(progress, signal);
    if (known && key) {
      if (known.has(key)) return null;
      known.add(key);
    }
    return signal;
  }

  function createStreamGate() {
    let completed = false;
    return {
      observe(event) {
        if (event && event.event === "done") completed = true;
      },
      assertComplete() {
        if (!completed) {
          const error = new Error("Assistant stream ended before completion");
          error.code = "assistant_stream_incomplete";
          throw error;
        }
      },
      get completed() {
        return completed;
      }
    };
  }

  function createSafeStreamError(data) {
    const code = streamErrorCode(data);
    const error = new Error("Assistant stream error");
    error.status = data && data.status;
    if (code) error.code = code;
    error.body = { detail: code ? { code: code } : {} };
    if (data && typeof data.source_message_id === "string") error.source_message_id = data.source_message_id;
    if (data && typeof data.message_id === "string") error.message_id = data.message_id;
    return error;
  }

  function createAssistantStreamConsumer(options) {
    const opts = options || {};
    const gate = createStreamGate();
    const pendingNavigations = [];
    const seen = opts.navigationRuns || new Set();
    const endedNavigations = new Set();
    const originalId = opts.streamingId;
    let boundId = opts.resumeMessageId || originalId;
    let resumeTextPending = !!opts.resumeMessageId;
    let terminalOutcome = null;

    function owned() {
      if (typeof opts.isOwned === "function") return opts.isOwned();
      return typeof opts.isCurrent !== "function" || opts.isCurrent();
    }

    function live() {
      return typeof opts.isCurrent !== "function" || opts.isCurrent();
    }

    function finalize(status, errorKey, terminal) {
      if (!owned()) return;
      if (typeof opts.appendProgress !== "function") return;
      const outcome = terminalOutcome || terminal || (status === "cancelled" ? "cancelled" : errorKey ? "error" : "done");
      if (outcome === "error" || outcome === "cancelled") terminalOutcome = outcome;
      opts.appendProgress(boundId || originalId, {
        kind: "stream_finalize",
        data: { status: status || "failed", errorKey: errorKey || null, terminal: outcome }
      });
    }

    function bindSnapshot(snapshot) {
      if (!snapshot || !snapshot.id) return;
      if (typeof opts.bindPresentation === "function") {
        opts.bindPresentation(originalId, snapshot);
      }
      boundId = snapshot.id;
    }

    function handleEvent(streamEvent) {
      if (!live()) return null;
      gate.observe(streamEvent);
      const data = streamEvent && streamEvent.data || {};
      if (streamEvent?.event === "stream_end" && ["cancelled", "canceled"].includes(data.status)) terminalOutcome = terminalOutcome || "cancelled";
      if (streamEvent?.event === "done" && ["failed", "cancelled"].includes(data.outcome)) terminalOutcome = terminalOutcome || (data.outcome === "failed" ? "error" : "cancelled");
      if (typeof opts.onControlEvent === "function") opts.onControlEvent(streamEvent);
      if (streamEvent && streamEvent.event === "version_changed") {
        return typeof opts.applySession === "function" ? opts.applySession(data, originalId, "version") : null;
      }
      if (streamEvent && streamEvent.event === "presentation") {
        bindSnapshot(data.message);
        return data.message || null;
      }
      const progress = normalizeEvent(streamEvent);
      if (progress) {
        if (resumeTextPending && progress.kind === "text") {
          resumeTextPending = false;
          opts.appendProgress?.(boundId, { kind: "resume_text_start" });
        }
        const callId = data.run_id || data.call_id || data.id;
        if (data.name === "novelbuilt_navigation" && callId) {
          if (progress.kind === "tool_end") endedNavigations.add(String(callId));
          const key = "request:" + callId;
          if (progress.kind === "tool_start" && typeof opts.onNavigationStart === "function" && !seen.has(key)) {
            seen.add(key);
            pendingNavigations.push(Promise.resolve().then(() => opts.onNavigationStart(String(callId), {
              isCurrent: () => live() && !endedNavigations.has(String(callId))
            })).then(() => null, error => ({error})));
          }
        }
        if (typeof opts.appendProgress === "function") {
          opts.appendProgress(boundId || originalId, progress);
        }
        const navigation = takeNavigation(progress, seen);
        if (navigation && typeof opts.onNavigate === "function") {
          // Observe rejection immediately, even when the stream later fails
          // before finish() or remains open for another model response.
          pendingNavigations.push(Promise.resolve().then(() => {
            if (!live()) return;
            return opts.onNavigate(navigation);
          }).then(() => null, (error) => ({ error })));
        }
        return progress;
      }
      if (!streamEvent || streamEvent.event === "done") {
        if (streamEvent && streamEvent.event === "done") finalize("failed", null, "done");
        return null;
      }
      if (streamEvent.event === "error") {
        const code = streamErrorCode(data);
        finalize("failed", code ? own(TOOL_ERROR_KEYS, code) : null, "error");
        throw createSafeStreamError(data);
      }
      if (streamEvent.event === "protection_required") {
        const protection = typeof opts.protectionFrom === "function" ? opts.protectionFrom(data) : null;
        if (protection && typeof opts.onAction === "function") opts.onAction(protection, data);
        return protection;
      }
      if (streamEvent.event === "message" || streamEvent.event === "action" || streamEvent.event === "actions") {
        if (streamEvent.event === "message" && data.message) bindSnapshot(data.message);
        const applied = typeof opts.applySession === "function"
          ? opts.applySession(data, originalId)
          : null;
        if (streamEvent.event === "action" && typeof opts.onAction === "function") {
          opts.onAction(typeof opts.actionFrom === "function" ? opts.actionFrom(data) : null, data);
        }
        return applied;
      }
      return null;
    }

    async function finish() {
      if (live()) finalize("failed", null, "done");
      if (!live()) return;
      let navigationError = null;
      if (pendingNavigations.length) {
        const results = await Promise.all(pendingNavigations);
        const rejected = results.find((result) => result && result.error);
        if (rejected) navigationError = rejected.error;
      }
      gate.assertComplete();
      if (navigationError) {
        const error = navigationError instanceof Error
          ? navigationError
          : new Error(String(navigationError));
        error.navigationFailed = true;
        throw error;
      }
    }

    return {
      handleEvent,
      finish,
      finalize,
      get completed() {
        return gate.completed;
      }
    };
  }

  // Observe a reply already owned by the server; this never starts an invocation.
  function watchSessionReply(options) {
    const opts = options || {};
    const setTimer = opts.setTimer || setTimeout;
    const clearTimer = opts.clearTimer || clearTimeout;
    const controller = new AbortController();
    let timer = null, reading = false, failures = 0, stopped = false;
    const isCurrent = () => !stopped && (!opts.isCurrent || opts.isCurrent());

    function schedule(delay) {
      if (!isCurrent()) return;
      if (timer != null) clearTimer(timer);
      timer = setTimer(poll, delay);
    }

    async function poll() {
      timer = null;
      if (!isCurrent() || reading) return;
      reading = true;
      try {
        const payload = await opts.readSession(opts.sessionId, { signal: controller.signal });
        if (!isCurrent()) return;
        const snapshot = payload && payload.session || payload;
        if (!snapshot || snapshot.id !== opts.sessionId || snapshot.book_id !== null) {
          throw new Error("Assistant session scope mismatch");
        }
        failures = 0;
        opts.onSnapshot(payload);
        if (snapshot.reply_state === "running") schedule(1500);
      } catch (error) {
        if (!isCurrent()) return;
        failures += 1;
        if (opts.onError) opts.onError(error);
        if (failures < 3) schedule(1500 * failures);
      } finally {
        reading = false;
      }
    }

    schedule(1500);
    return {
      retry() {
        if (!isCurrent() || reading) return;
        failures = 0;
        schedule(0);
      },
      stop() {
        stopped = true;
        if (timer != null) clearTimer(timer);
        timer = null;
        controller.abort();
      }
    };
  }

  return {
    CLIENT_NAVIGATION_DESTINATIONS,
    normalizeEvent,
    reduceSegments,
    reduceMessage,
    groupVisibleSegments,
    hydrateMessage,
    bindPresentation,
    shouldFold,
    presentationOf: Presentation.presentationOf,
    defaultProcessOpen: Presentation.defaultProcessOpen,
    reconcileMessages,
    isClientNavigationDestination,
    clientNavigationSignal,
    navigationRunKey,
    takeNavigation,
    createStreamGate,
    createAssistantStreamConsumer,
    watchSessionReply
  };
});
