(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantCheckpointCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  function versionOf(payload) {
    const value = payload && (payload.session || payload);
    return value && Object.prototype.hasOwnProperty.call(value, "current_version_id")
      ? value.current_version_id : undefined;
  }

  function compatibleVersion(expected, session) {
    const current = versionOf(session);
    if (expected === undefined || current === expected) return true;
    // A first input can acquire its root binding while that same stream is open.
    return expected === null && current != null && Array.isArray(session?.versions)
      && session.versions.some(version => version.id === current && version.parent_version_id == null);
  }

  function errorCode(error) {
    return String(error?.body?.detail?.code || error?.code || "");
  }

  function drained(status) {
    return status?.capabilities?.enabled === true
      && ["idle", "stopped", "resumable"].includes(status.control_state);
  }

  function controls(state) {
    const value = state || {};
    const status = value.status;
    const enabled = status ? status.capabilities?.enabled === true : null;
    const stopping = !!value.stopping || status?.control_state === "stopping";
    const blocked = stopping || !!value.stopPending;
    const trusted = !!status && !value.readError && !blocked;
    return {
      ...value, enabled, stopping,
      canSend: !blocked && (enabled === false || (trusted && status.can_send === true)),
      canResume: enabled === true && trusted && status.can_resume === true && !!status.source_message_id,
      // Continuing would fail the same way again; the notice offers a new session instead.
      resumeBlocked: enabled === true && trusted && typeof status.resume_blocked === "string"
        ? status.resume_blocked : null,
      canEdit: enabled === true && trusted && status.can_edit === true,
      canStop: enabled === true && !value.stopPending
        && (!stopping || !!value.stopError && !value.readError && !value.loading)
        && value.stopError !== "checkpoint_binding_pending"
        && (status.control_state === "running" || status.reason === "checkpoint_binding_pending"),
      tools: Array.isArray(status?.active_tools) ? status.active_tools : [],
      missingInput: (status?.input_receipts || []).find(receipt => receipt.state === "not_received"
        && receipt.code === "input_not_received") || null
    };
  }

  function createMonitor(options) {
    const opts = options || {};
    const setTimer = opts.setTimer || setTimeout;
    const clearTimer = opts.clearTimer || clearTimeout;
    let active = true, timer = null, request = null, readAgain = false, revision = 0, failures = 0;
    let state = { status: null, stopping: !!opts.initialStopping, stopPending: !!opts.initialStopPending,
      readError: false, stopError: opts.initialStopError || "", loading: true, recovery: null };
    const live = () => active && (!opts.isCurrent || opts.isCurrent());
    const publish = next => {
      if (!live()) return;
      state = { ...state, ...next };
      opts.onChange?.(state);
    };
    const cancelTimer = () => { if (timer != null) clearTimer(timer); timer = null; };
    function schedule(delay) {
      cancelTimer();
      if (live()) timer = setTimer(() => { timer = null; return read(); }, delay);
    }
    async function accept(status, expectedRevision) {
      if (!live() || expectedRevision !== revision) return false;
      if (!status || status.session_id !== opts.sessionId) throw new Error("Checkpoint session mismatch");
      if (versionOf(status) !== opts.versionId) {
        await opts.onVersion?.(status);
        if (live() && expectedRevision === revision) publish({ readError: true, loading: false });
        return false;
      }
      publish({ status, readError: false, loading: false,
        stopping: drained(status) ? false : state.stopping || status.control_state === "stopping",
        stopError: status.control_state === "stopping" || drained(status) && state.stopping ? "" : state.stopError });
      opts.onSnapshot?.(status);
      return true;
    }
    async function read() {
      if (!live()) return null;
      if (request) { readAgain = true; return request.promise; }
      cancelTimer();
      const currentRevision = revision;
      const owned = { controller: new AbortController(), promise: null };
      request = owned;
      owned.promise = (async () => {
        try {
          const status = await opts.read({ signal: owned.controller.signal });
          if (await accept(status, currentRevision)) failures = 0;
          return status;
        } catch (error) {
          if (live() && currentRevision === revision && !owned.controller.signal.aborted) {
            failures += 1;
            publish({ readError: true, loading: false });
          }
          return null;
        } finally {
          if (request === owned) request = null;
          if (live()) {
            if (readAgain) { readAgain = false; schedule(0); }
            else if (failures < 3 && (state.readError || state.stopping
              || ["running", "stopping", "unavailable"].includes(state.status?.control_state)
                && state.status?.capabilities?.enabled === true)) schedule(opts.interval || 1500);
          }
        }
      })();
      return owned.promise;
    }
    async function requestStop(key, options = {}, onFailure) {
      const current = controls(state);
      const confirmedPending = options.rejectPendingActions === true && current.enabled === true
        && !current.stopping && !state.stopPending && !state.readError && !state.loading;
      if (!live() || !(current.canStop || confirmedPending)) return null;
      const priorStopping = state.stopping;
      const currentRevision = ++revision;
      request?.controller.abort();
      publish({ stopPending: true, stopping: true, stopError: "" });
      let settled = { stopping: true, stopError: "checkpoint_unavailable" };
      try {
        const status = await opts.stop(key, options);
        const matches = status?.session_id === opts.sessionId && versionOf(status) === opts.versionId;
        settled = { stopping: !matches || !drained(status),
          stopError: matches && (status.control_state === "stopping" || drained(status)) ? "" : "checkpoint_unavailable" };
        if (!await accept(status, currentRevision)) return null;
        if (status.control_state !== "stopping" && !drained(status)) {
          onFailure?.("checkpoint_unavailable");
          publish({ stopError: "checkpoint_unavailable" });
          return null;
        }
        return status;
      } catch (error) {
        const code = errorCode(error);
        settled = { stopError: code || "checkpoint_unavailable",
          stopping: ["checkpoint_binding_pending", "checkpoint_disabled", "session_not_found",
            "checkpoint_approval_pending", "checkpoint_approval_settling"].includes(code)
            ? priorStopping : true };
        if (!live() || currentRevision !== revision) return null;
        onFailure?.(settled.stopError);
        publish(settled);
        return null;
      } finally {
        opts.onStopSettled?.(settled);
        if (live() && currentRevision === revision) {
          publish({ stopPending: false });
          void read();
        }
      }
    }
    return {
      read,
      retry() { failures = 0; return read(); },
      settleStop(next) {
        revision += 1;
        request?.controller.abort();
        publish({ ...next, stopPending: false });
        void read();
      },
      requestStop,
      event(event) {
        if (!live()) return;
        if (event?.event === "stream_start" && event.data?.checkpoint_recovery) {
          const tools = event.data.checkpoint_recovery.unknown_tool_calls;
          publish({ recovery: Array.isArray(tools) ? tools.map(tool => ({ name: tool.name, tool_call_id: tool.tool_call_id })) : [] });
        }
        if (["runtime_binding", "stream_start", "input_receipt", "error", "done", "stream_end"].includes(event?.event)) {
          failures = 0;
          void read();
        }
      },
      snapshot: () => state,
      dispose() { active = false; revision += 1; cancelTimer(); request?.controller.abort(); }
    };
  }

  return { versionOf, compatibleVersion, errorCode, drained, controls, createMonitor };
});
