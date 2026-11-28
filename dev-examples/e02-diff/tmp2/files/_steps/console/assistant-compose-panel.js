{
/* Existing composer layout; state and persistence remain owned by the drawer. */
(function () {
  function AssistantComposePanel({
    accountId,
    session,
    remoteRunning,
    bodyActivity,
    sending,
    executing,
    resetting,
    resetConfirmOpen,
    actionUnresolved,
    referenceState,
    actions,
    citations,
    inputRef,
    uploadBundle,
    setReferenceState,
    openResetConfirmation,
    toast,
    memoryTasks,
    pendingSendRef,
    send,
    draftContextRef,
    input,
    removeDraftTarget,
    removeTargetDisabled,
    uploadItems,
    uploadNotice,
    fileDrag,
    citationsRef,
    setCitations,
    persistComposerSnapshot,
    setInput,
    inputValueRef,
    stopReply,
    actionPending,
    checkpoint
  }) {
    const Action = window.AssistantActionCore;
    const showStop = checkpoint.stopping || (checkpoint.enabled === true ? sending || executing || remoteRunning || actionPending || checkpoint.status?.control_state === "running" || checkpoint.status?.reason === "checkpoint_binding_pending" : sending || executing);
    const stopLabel = showStop ? TC(checkpoint.stopError && checkpoint.canStop ? "asst_checkpoint_stop_retry" : checkpoint.stopping ? "asst_checkpoint_stopping" : checkpoint.enabled === true ? "asst_checkpoint_stop" : "asst_stop") : TC("asst_send");
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("nav", {
      className: "asst-function-bar",
      "aria-label": TC("asst_tools")
    }, window.AssistantReferenceLibrary ? /*#__PURE__*/React.createElement(window.AssistantReferenceLibrary, {
      key: String(accountId) + ":" + (session?.id || "") + ":" + referenceState.epoch,
      accountId: accountId,
      lang: window.CLANG === "en" ? "en" : "zh",
      citations: citations,
      inputRef: inputRef,
      disabled: !session || remoteRunning || bodyActivity.undo || sending || executing || resetting || resetConfirmOpen || actionUnresolved,
      onPendingChange: pending => setReferenceState(prior => prior.pending === pending ? prior : {
        ...prior,
        pending
      }),
      onAdd: files => uploadBundle()?.actions.onAttach(files)
    }) : null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "asst-function-button",
      onClick: openResetConfirmation,
      disabled: !session || referenceState.pending || remoteRunning || bodyActivity.loading || bodyActivity.undo || sending || executing || resetting || actions.some(Action.isUnresolvedAction) || resetConfirmOpen
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "pen",
      s: 16
    }), /*#__PURE__*/React.createElement("span", null, TC("asst_clear"))), /*#__PURE__*/React.createElement(window.AssistantMemoryControl, {
      key: String(accountId) + ':' + (session?.id || ''),
      sessionId: session?.id,
      toast: toast,
      onStatus: memoryTasks.onStatus,
      disabled: referenceState.pending || remoteRunning || bodyActivity.undo || sending || executing || resetting || resetConfirmOpen || actionUnresolved || Boolean(pendingSendRef.current)
    })), /*#__PURE__*/React.createElement("form", {
      className: "asst-compose",
      onSubmit: send
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "asst-compose-input"
    }, /*#__PURE__*/React.createElement(window.AssistantDraftTarget, {
      context: draftContextRef.current,
      visible: Boolean(input),
      onRemove: removeDraftTarget,
      removeDisabled: removeTargetDisabled
    }), window.AssistantComposerAttachments ? /*#__PURE__*/React.createElement(window.AssistantComposerAttachments, {
      lang: window.CLANG === "en" ? "en" : "zh",
      files: window.AssistantInlineCore.unplaced(input, citations, pendingSendRef.current?.workspaceFiles),
      items: uploadItems,
      notice: uploadNotice,
      dragging: fileDrag,
      actions: uploadBundle()?.actions,
      disabled: resetting || resetConfirmOpen
    }) : null, /*#__PURE__*/React.createElement(window.AssistantInlineEditor, {
      inputRef: inputRef,
      key: String(accountId) + ":" + (session?.id || "draft"),
      files: citations,
      onFilesChange: files => {
        citationsRef.current = files;
        setCitations(files);
        persistComposerSnapshot();
      },
      id: "assistant-message",
      "aria-label": TC("asst_input"),
      value: input,
      onChange: event => {
        const next = event.target.value;
        setInput(next);
        if (pendingSendRef.current && next.trim() !== pendingSendRef.current.content) {
          pendingSendRef.current = null;
        }
        inputValueRef.current = next;
        persistComposerSnapshot();
      },
      onKeyDown: event => {
        const composing = event.isComposing || event.nativeEvent && event.nativeEvent.isComposing || event.keyCode === 229;
        if (event.key === "Enter" && !event.shiftKey && !composing) {
          event.preventDefault();
          if (!event.currentTarget.disabled && input.trim()) event.currentTarget.form.requestSubmit();
        }
      },
      placeholder: TC("asst_placeholder"),
      maxLength: 8000,
      rows: 2,
      disabled: !session || !checkpoint.canSend || remoteRunning || bodyActivity.undo || sending || resetting || resetConfirmOpen || actionUnresolved
    })), /*#__PURE__*/React.createElement("button", {
      type: showStop ? "button" : "submit",
      className: "asst-send",
      "aria-label": stopLabel,
      "data-tooltip": stopLabel,
      onClick: showStop ? stopReply : undefined,
      disabled: showStop ? checkpoint.enabled === true ? !checkpoint.canStop : checkpoint.stopping : !session || !checkpoint.canSend || remoteRunning || bodyActivity.undo || resetting || resetConfirmOpen || actionUnresolved || referenceState.pending > 0 || uploadItems.length > 0 || !input.trim()
    }, /*#__PURE__*/React.createElement(Icon, {
      n: showStop ? "close" : "send",
      s: 18
    }))), actionPending ? /*#__PURE__*/React.createElement("p", {
      className: "asst-compose__note"
    }, TC("asst_pending_block")) : actionUnresolved ? /*#__PURE__*/React.createElement("p", {
      className: "asst-compose__note"
    }, TC("asst_recovery_block")) : null));
  }
  window.AssistantComposePanel = AssistantComposePanel;
})();
}
