{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
(function () {
  const Core = window.AssistantCheckpointCore;
  const legacy = {
    enabled: false,
    canSend: true,
    canResume: false,
    canEdit: false,
    stopping: false,
    canStop: false,
    tools: [],
    status: null,
    retry() {},
    event() {}
  };
  function useControl({
    open,
    accountId,
    session,
    sessionRef,
    actions = [],
    api,
    refreshSession,
    newKey
  }) {
    const scope = JSON.stringify([accountId, session?.id, Core.versionOf(session)]);
    const owner = React.useRef(null),
      latest = React.useRef(null),
      stoppingScopes = React.useRef(new Map());
    const [observed, setObserved] = React.useState(null);
    const [confirmation, setConfirmation] = React.useState(null);
    latest.current = {
      accountId,
      sessionRef,
      refreshSession,
      newKey,
      actions
    };
    const supported = typeof api?.assistantCheckpointStatus === "function";
    if (owner.current?.scope !== scope) {
      owner.current?.monitor.dispose();
      const entry = {
        scope,
        active: false,
        versionId: Core.versionOf(session),
        sessionId: session?.id
      };
      const current = () => owner.current === entry && entry.active && latest.current.accountId === accountId && latest.current.sessionRef.current?.id === entry.sessionId && Core.versionOf(latest.current.sessionRef.current) === entry.versionId;
      const priorStop = stoppingScopes.current.get(scope);
      entry.monitor = Core.createMonitor({
        sessionId: entry.sessionId,
        versionId: entry.versionId,
        initialStopping: priorStop?.stopping,
        initialStopError: priorStop?.stopError,
        initialStopPending: priorStop?.stopPending,
        isCurrent: current,
        onStopSettled: next => {
          if (next.stopping) stoppingScopes.current.set(scope, {
            ...next,
            stopPending: false
          });else stoppingScopes.current.delete(scope);
          const observer = owner.current;
          if (observer !== entry && observer?.scope === scope && observer.active) observer.monitor.settleStop(next);
        },
        read: options => api.assistantCheckpointStatus(entry.sessionId, options),
        stop: (key, options) => api.stopAssistantCheckpoint(entry.sessionId, entry.versionId ?? null, key, options),
        onVersion: status => latest.current.refreshSession(entry.versionId, status.current_version_id),
        onSnapshot: status => {
          if (Core.drained(status) && latest.current.sessionRef.current?.reply_state === "running") {
            void latest.current.refreshSession(entry.versionId);
          }
        },
        onChange: state => {
          if (state.stopping || state.stopPending) stoppingScopes.current.set(scope, {
            stopping: state.stopping,
            stopError: state.stopError,
            stopPending: state.stopPending
          });else if (Core.drained(state.status)) stoppingScopes.current.delete(scope);
          setObserved({
            scope,
            state
          });
        }
      });
      owner.current = entry;
    }
    const entry = owner.current;
    React.useEffect(() => {
      if (!open || !supported || !entry.sessionId) return undefined;
      entry.active = true;
      void entry.monitor.read();
      const retry = () => {
        if (!document.hidden) void entry.monitor.retry();
      };
      window.addEventListener("focus", retry);
      document.addEventListener("visibilitychange", retry);
      return () => {
        entry.active = false;
        entry.monitor.dispose();
        window.removeEventListener("focus", retry);
        document.removeEventListener("visibilitychange", retry);
      };
    }, [open, supported, scope]);
    const state = observed?.scope === scope ? observed.state : entry.monitor.snapshot();
    if (!supported) return legacy;
    const controls = Core.controls(state);
    const pending = actions.some(window.AssistantActionCore.isPendingAction);
    const dialog = confirmation?.scope === scope ? confirmation : null;
    const requestStop = async confirmed => {
      let failure = "";
      const result = await entry.monitor.requestStop(latest.current.newKey(), {
        rejectPendingActions: confirmed
      }, code => {
        failure = code;
      });
      if (owner.current !== entry || !entry.active) return;
      if (result) {
        setConfirmation(null);
        await latest.current.refreshSession(entry.versionId);
      } else if (confirmed || failure === "checkpoint_approval_pending") {
        setConfirmation({
          scope,
          error: failure,
          busy: false
        });
      }
    };
    return {
      ...controls,
      canStop: controls.canStop || pending && controls.enabled === true && !controls.stopping && !state.stopPending && !state.readError && !state.loading,
      retry: () => entry.monitor.retry(),
      stop: () => pending ? setConfirmation({
        scope,
        busy: false,
        error: ""
      }) : requestStop(false),
      stopConfirmation: dialog,
      cancelStop: () => {
        if (!dialog?.busy) setConfirmation(null);
      },
      confirmStop: () => {
        if (dialog?.busy) return;
        setConfirmation({
          scope,
          busy: true,
          error: ""
        });
        return requestStop(true);
      },
      event: event => entry.monitor.event(event)
    };
  }
  function StopConfirmation({
    control
  }) {
    const dialog = control.stopConfirmation,
      Dialog = window.ConfirmDialog;
    if (!dialog || !Dialog) return null;
    return /*#__PURE__*/React.createElement(Dialog, {
      open: true,
      title: TC("asst_stop_approval_title"),
      message: TC("asst_stop_approval_note"),
      icon: null,
      tone: "danger",
      cancelLabel: TC("cancel"),
      confirmLabel: TC("asst_stop_approval_confirm"),
      confirmDisabled: dialog.busy,
      onClose: control.cancelStop,
      onConfirm: control.confirmStop
    }, dialog.error && /*#__PURE__*/React.createElement("p", {
      role: "alert"
    }, window.AssistantActionCore.messageText({
      code: dialog.error
    }, TC)));
  }
  const BLOCKED_COPY = {
    upstream_moderation: ["asst_checkpoint_blocked_moderation", "asst_checkpoint_blocked_moderation_note"],
    model_output_empty: ["asst_checkpoint_blocked_empty", "asst_checkpoint_blocked_note"],
    resume_attempts_exhausted: ["asst_checkpoint_blocked_attempts", "asst_checkpoint_blocked_note"]
  };
  function Notice({
    control,
    busy,
    onResume,
    onRestoreInput,
    restoreDisabled,
    onNewSession
  }) {
    const UI = window.AssistantInteractionUI?.Notice;
    if (!UI) return null;
    const status = control.status;
    const unavailable = control.enabled !== false && control.readError || status?.control_state === "unavailable" && control.enabled;
    const missing = control.missingInput;
    const blockedCopy = BLOCKED_COPY[control.resumeBlocked];
    const reasonKey = status?.reason;
    const reason = reasonKey === "checkpoint_context_required" ? TC("asst_checkpoint_context_required") : reasonKey === "checkpoint_fork_unconfirmed" ? TC("asst_checkpoint_fork_unconfirmed") : reasonKey === "checkpoint_binding_pending" ? TC("asst_checkpoint_binding_pending") : TC("asst_checkpoint_unavailable");
    return /*#__PURE__*/React.createElement(React.Fragment, null, control.stopping ? /*#__PURE__*/React.createElement(UI, {
      className: "asst-checkpoint-notice",
      role: control.stopError ? "alert" : "status",
      title: TC(control.stopError ? "asst_checkpoint_stop_unconfirmed" : "asst_checkpoint_stopping")
    }, /*#__PURE__*/React.createElement("p", null, control.stopError ? window.AssistantActionCore.messageText({
      code: control.stopError
    }, TC) : TC("asst_checkpoint_drain_note")), control.tools.length > 0 && /*#__PURE__*/React.createElement("ul", null, control.tools.map(tool => /*#__PURE__*/React.createElement("li", {
      key: tool.tool_call_id
    }, tool.name, Number.isFinite(tool.elapsed_seconds) ? ` · ${Math.floor(tool.elapsed_seconds)}s` : "", tool.timed_out ? ` · ${TC("asst_checkpoint_tool_timeout")}` : ""))), control.readError && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: control.retry
    }, TC("asst_checkpoint_check"))) : blockedCopy ? /*#__PURE__*/React.createElement(UI, {
      className: "asst-checkpoint-notice",
      tone: "error",
      role: "alert",
      title: TC(blockedCopy[0]),
      actions: onNewSession && /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn primary",
        disabled: busy,
        onClick: onNewSession
      }, TC("asst_clear"))
    }, /*#__PURE__*/React.createElement("p", null, TC(blockedCopy[1]))) : control.canResume ? /*#__PURE__*/React.createElement(UI, {
      className: "asst-checkpoint-notice",
      role: "status",
      title: TC("asst_checkpoint_interrupted"),
      actions: /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn primary",
        disabled: busy,
        onClick: onResume
      }, TC("asst_checkpoint_resume"))
    }, /*#__PURE__*/React.createElement("p", null, TC("asst_checkpoint_resume_note"))) : unavailable ? /*#__PURE__*/React.createElement(UI, {
      className: "asst-checkpoint-notice",
      role: "status",
      title: reason,
      actions: /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn ghost",
        onClick: control.retry
      }, TC("asst_checkpoint_check"))
    }) : null, !control.stopping && control.stopError && /*#__PURE__*/React.createElement(UI, {
      className: "asst-checkpoint-notice",
      role: "alert"
    }, window.AssistantActionCore.messageText({
      code: control.stopError
    }, TC)), missing && /*#__PURE__*/React.createElement(UI, {
      className: "asst-checkpoint-notice",
      role: "alert",
      title: TC("asst_checkpoint_input_missing"),
      actions: missing.source_message_id && /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn ghost",
        disabled: busy || restoreDisabled,
        onClick: () => onRestoreInput(missing.source_message_id)
      }, TC("asst_checkpoint_restore_input"))
    }), control.recovery?.length > 0 && /*#__PURE__*/React.createElement("details", {
      className: "asst-checkpoint-unknown"
    }, /*#__PURE__*/React.createElement("summary", null, TC("asst_checkpoint_unknown_title")), /*#__PURE__*/React.createElement("p", null, TC("asst_checkpoint_unknown_note")), /*#__PURE__*/React.createElement("ul", null, control.recovery.map(tool => /*#__PURE__*/React.createElement("li", {
      key: tool.tool_call_id
    }, tool.name, " \xB7 ", tool.tool_call_id)))));
  }
  function Message({
    message,
    control,
    locked,
    onEdit,
    ...rowProps
  }) {
    const [editing, setEditing] = React.useState(false),
      [draft, setDraft] = React.useState(message.content || "");
    const [saving, setSaving] = React.useState(false),
      [error, setError] = React.useState("");
    const editor = React.useRef(null),
      active = React.useRef(true);
    React.useEffect(() => {
      active.current = true;
      return () => {
        active.current = false;
      };
    }, []);
    React.useEffect(() => {
      if (editing) editor.current?.focus();
    }, [editing]);
    const eligible = message.role === "user" && control.enabled === true;
    const mapped = message.editable === true && !!message.core_message_id;
    const stable = !locked && !control.stopping && !control.loading && !control.readError && ["idle", "stopped", "resumable"].includes(control.status?.control_state);
    const showUnmapped = stable && message.editable === false && !message.core_message_id && message.edit_unavailable_reason === "core_identity_unavailable";
    const disabled = locked || !control.canEdit || saving;
    const submit = async event => {
      event.preventDefault();
      if (disabled || !mapped || !draft.trim()) return;
      setSaving(true);
      setError("");
      try {
        const accepted = await onEdit(message, draft.trim());
        if (active.current && accepted !== false) setEditing(false);
      } catch (failure) {
        if (active.current) setError(window.AssistantActionCore.messageText(failure, TC));
      } finally {
        if (active.current) setSaving(false);
      }
    };
    const controls = !eligible ? null : editing ? /*#__PURE__*/React.createElement("form", {
      className: "asst-message-edit",
      onSubmit: submit
    }, /*#__PURE__*/React.createElement("textarea", {
      ref: editor,
      id: "assistant-edit-" + message.id,
      "aria-label": TC("asst_checkpoint_edit"),
      value: draft,
      maxLength: 8000,
      rows: 3,
      disabled: saving,
      onChange: event => setDraft(event.target.value)
    }), /*#__PURE__*/React.createElement("p", null, TC("asst_checkpoint_edit_note")), error && /*#__PURE__*/React.createElement("p", {
      role: "alert"
    }, error), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      disabled: saving,
      onClick: () => {
        setEditing(false);
        setError("");
      }
    }, TC("cancel")), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn primary",
      disabled: disabled || !draft.trim()
    }, TC(saving ? "asst_checkpoint_editing" : "asst_checkpoint_edit_send")))) : /*#__PURE__*/React.createElement("div", {
      className: "asst-message-controls"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      disabled: disabled || !mapped,
      title: showUnmapped ? TC("asst_checkpoint_edit_unmapped") : undefined,
      "aria-label": showUnmapped ? TC("asst_checkpoint_edit_unmapped") : TC("asst_checkpoint_edit"),
      onClick: () => {
        setDraft(message.content || "");
        setEditing(true);
      }
    }, TC("asst_checkpoint_edit")), showUnmapped && /*#__PURE__*/React.createElement("span", null, TC("asst_checkpoint_edit_unmapped")));
    return /*#__PURE__*/React.createElement(window.AssistantMessageRow, _extends({}, rowProps, {
      message: message,
      footer: controls
    }));
  }
  window.AssistantCheckpointControl = {
    useControl,
    StopConfirmation,
    Notice,
    Message,
    legacy
  };
})();
}
