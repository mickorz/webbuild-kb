{
/* ===== Page Assistant thread and earlier-page loading ===== */
(function () {
  function AssistantThread({
    threadRef,
    endRef,
    messages,
    assistantName,
    welcomeReveal,
    memoryTasks,
    messagePage,
    pageLoading,
    pageError,
    onLoadEarlier,
    showExamples,
    pageContext,
    examplesLocked,
    onExample,
    actionCards,
    renderActionCard,
    sending,
    executing,
    remoteRunning,
    syncError,
    onRetryReply,
    failedMessageId,
    onRestoreFailedMessage,
    checkpoint,
    onResumeCheckpoint,
    onEditMessage,
    onRestoreCheckpointInput,
    restoreDisabled,
    error,
    resetConfirmOpen,
    resetError,
    resetting,
    resetCancelRef,
    onCloseReset,
    onConfirmReset,
    onOpenReset
  }) {
    const MessageRow = window.AssistantMessageRow;
    const Examples = window.AssistantExamples;
    const Notice = window.AssistantInteractionUI?.Notice || (({
      children,
      title,
      actions,
      className,
      role
    }) => /*#__PURE__*/React.createElement("div", {
      className: className,
      role: role
    }, title && /*#__PURE__*/React.createElement("p", null, title), children, actions));
    const Dialog = window.ConfirmDialog;
    const [restoredMessageId, setRestoredMessageId] = React.useState(null);
    const hasVisibleMessages = (messages || []).some(message => message.role !== "system");
    const latestUserMessage = (messages || []).slice().reverse().find(message => message.role === "user");
    const showFailedReply = checkpoint?.enabled !== true && !checkpoint?.stopping && failedMessageId && failedMessageId === latestUserMessage?.id && failedMessageId !== restoredMessageId && !sending && !executing && !remoteRunning;
    const canLoadEarlier = !!(messagePage && messagePage.has_more);
    const memories = window.AssistantMemoryStatus.place(memoryTasks, messages);
    const renderMemory = item => /*#__PURE__*/React.createElement(window.AssistantMemoryStatus.Notice, {
      key: item.id,
      item: item
    });
    const cards = window.AssistantReceiptCore.placeCards(actionCards, messages, window.AssistantActionCore.isActionBlocking);
    return /*#__PURE__*/React.createElement("section", {
      ref: threadRef,
      className: "asst-thread",
      "aria-label": TC("asst_title"),
      "aria-live": "polite"
    }, canLoadEarlier ? /*#__PURE__*/React.createElement("div", {
      className: "asst-load-earlier"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: onLoadEarlier,
      disabled: !!pageLoading
    }, TC(pageLoading ? "asst_loading_earlier" : pageError ? "asst_retry" : "asst_load_earlier")), pageError && !pageLoading ? /*#__PURE__*/React.createElement("p", {
      className: "asst-load-earlier__error",
      role: "alert"
    }, TC("asst_load_earlier_failed")) : null) : null, cards.earlier.map(renderActionCard), memories.earlier.map(renderMemory), messages && messages.length ? messages.map((message, index) => {
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: message.stream_id || message.id || index
      }, message.role === "system" ? null : message.role === "user" && checkpoint && window.AssistantCheckpointControl ? /*#__PURE__*/React.createElement(window.AssistantCheckpointControl.Message, {
        assistantName: assistantName,
        message: message,
        control: checkpoint,
        locked: sending || executing || resetting || resetConfirmOpen,
        onEdit: onEditMessage
      }) : /*#__PURE__*/React.createElement(MessageRow, {
        assistantName: assistantName,
        message: message,
        welcomeReveal: welcomeReveal?.id === message.id ? welcomeReveal : null,
        actionCards: cards.inline?.[message.id],
        renderActionCard: renderActionCard
      }), (cards.bySource[message.id] || []).map(renderActionCard), (memories.bySource[message.id] || []).map(renderMemory));
    }) : null, !hasVisibleMessages && /*#__PURE__*/React.createElement("div", {
      className: "asst-empty-block"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "asst-empty"
    }, TC("asst_empty")), showExamples ? /*#__PURE__*/React.createElement(Examples, {
      pageContext: pageContext,
      locked: examplesLocked,
      onPick: onExample
    }) : null), cards.pending.map(renderActionCard), memories.pending.map(renderMemory), checkpoint && window.AssistantCheckpointControl && /*#__PURE__*/React.createElement(window.AssistantCheckpointControl.Notice, {
      control: (actionCards || []).some(item => window.AssistantActionCore?.isAssistantContinue(item) && item.state === "pending_confirmation") ? {
        ...checkpoint,
        canResume: false
      } : checkpoint,
      busy: sending || executing || resetting || resetConfirmOpen,
      onResume: onResumeCheckpoint,
      onRestoreInput: onRestoreCheckpointInput,
      restoreDisabled: restoreDisabled,
      onNewSession: onOpenReset
    }), sending ? /*#__PURE__*/React.createElement("div", {
      className: "asst-thinking",
      role: "status"
    }, /*#__PURE__*/React.createElement("span", null, TC("asst_sending")), /*#__PURE__*/React.createElement("span", {
      className: "asst-thinking__dots",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null))) : null, remoteRunning && !sending && !executing ? /*#__PURE__*/React.createElement("div", {
      className: "asst-thinking",
      role: "status"
    }, /*#__PURE__*/React.createElement("span", null, TC(syncError ? "asst_reply_sync_failed" : "asst_reply_running")), syncError ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: onRetryReply
    }, TC("asst_check_reply")) : null) : null, showFailedReply ? /*#__PURE__*/React.createElement(Notice, {
      className: "asst-inline-error",
      role: "alert",
      title: window.CLANG === "en" ? "This reply was interrupted." : "这次回复已中断",
      actions: /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn ghost",
        disabled: restoreDisabled || sending || executing || remoteRunning,
        onClick: () => {
          if (onRestoreFailedMessage(failedMessageId)) setRestoredMessageId(failedMessageId);
        }
      }, window.CLANG === "en" ? "Restore message to composer" : "将原消息放回输入框")
    }, error && /*#__PURE__*/React.createElement("p", null, error), restoreDisabled && /*#__PURE__*/React.createElement("p", null, window.CLANG === "en" ? "Keep or send your current draft first." : "输入框中已有草稿，请先处理当前内容。")) : error && !checkpoint?.resumeBlocked ? /*#__PURE__*/React.createElement(Notice, {
      className: "asst-inline-error",
      role: "alert"
    }, error) : null, resetConfirmOpen && Dialog ? /*#__PURE__*/React.createElement(Dialog, {
      open: true,
      title: TC("asst_clear_title"),
      message: TC("asst_clear_confirm"),
      icon: null,
      className: "asst-confirm-dialog",
      initialFocusRef: resetCancelRef,
      cancelLabel: TC("asst_clear_cancel"),
      confirmLabel: TC(resetting ? "asst_clearing" : "asst_clear_action"),
      confirmDisabled: resetting,
      onClose: () => {
        if (!resetting) onCloseReset();
      },
      onConfirm: onConfirmReset
    }, resetError && /*#__PURE__*/React.createElement("p", {
      className: "asst-reset-error",
      role: "alert"
    }, resetError)) : resetConfirmOpen ? /*#__PURE__*/React.createElement("section", {
      className: "asst-session-dialog",
      role: "dialog",
      "aria-modal": "false",
      "aria-labelledby": "assistant-reset-title",
      "aria-describedby": "assistant-reset-description"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-session-dialog__copy"
    }, /*#__PURE__*/React.createElement("strong", {
      id: "assistant-reset-title"
    }, TC("asst_clear_title")), /*#__PURE__*/React.createElement("p", {
      id: "assistant-reset-description"
    }, TC("asst_clear_confirm")), resetError ? /*#__PURE__*/React.createElement("p", {
      className: "asst-reset-error",
      role: "alert"
    }, resetError) : null), /*#__PURE__*/React.createElement("div", {
      className: "asst-session-dialog__actions"
    }, /*#__PURE__*/React.createElement("button", {
      ref: resetCancelRef,
      type: "button",
      className: "c-btn ghost",
      onClick: onCloseReset,
      disabled: resetting
    }, TC("asst_clear_cancel")), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      onClick: onConfirmReset,
      disabled: resetting
    }, TC(resetting ? "asst_clearing" : "asst_clear_action")))) : null, /*#__PURE__*/React.createElement("div", {
      ref: endRef
    }));
  }
  window.AssistantThread = AssistantThread;
})();
}
