{
/* ===== Page Assistant confirmation / recovery card ===== */
(function () {
  const Action = window.AssistantActionCore;
  const BodyReview = window.AssistantBodyReview || {};
  const BodyCore = window.AssistantBodyReviewCore;
  const FieldReview = window.AssistantFieldReview || {};
  const FieldCore = window.AssistantFieldReviewCore;
  const CustomReview = window.AssistantCustomSettingsReview || {};
  const CustomCore = window.AssistantCustomSettingsCore;
  function assistantCopy(key, values) {
    return Action.interpolate(TC(key), values);
  }
  function useExpiryClock(deadline, identity, enabled = true) {
    const [clock, updateClock] = React.useState(0);
    React.useEffect(() => {
      if (deadline == null || !enabled) return undefined;
      const refresh = () => updateClock(value => value + 1);
      const remaining = deadline - Date.now();
      const timer = remaining > 0 ? window.setTimeout(refresh, Math.min(remaining + 1, 2147483647)) : null;
      window.addEventListener?.("focus", refresh);
      window.document?.addEventListener("visibilitychange", refresh);
      return () => {
        if (timer != null) window.clearTimeout(timer);
        window.removeEventListener?.("focus", refresh);
        window.document?.removeEventListener("visibilitychange", refresh);
      };
    }, [identity, enabled, deadline]);
    return clock;
  }
  function useConfirmationExpiry(action, review, approvalExpiresAt) {
    useExpiryClock(Action.confirmationExpiresAt(action, review, approvalExpiresAt), JSON.stringify([action.id, action.session_id, action.arguments_hash]), ["pending", "pending_confirmation"].includes(action.state || "pending_confirmation") && !Action.isContinuationPending(action));
    return Action.confirmationExpired(action, review, approvalExpiresAt);
  }
  function ActionCard({
    action,
    busy,
    waiting,
    approveEnabled = true,
    rejectEnabled = true,
    reviseEnabled = true,
    approvalExpiresAt,
    availability,
    availabilityId,
    onConfirm,
    onReject,
    onResume,
    onRevise,
    onUndoComplete,
    onReviewBusyChange,
    onReviewRead,
    onOpenProtectionSettings,
    api
  }) {
    function onReviewBusy(next) {
      if (onReviewBusyChange) onReviewBusyChange(!!next, "review");
    }
    function onUndoBusy(next) {
      if (onReviewBusyChange) onReviewBusyChange(!!next, "undo");
    }
    const [viewedReview, setViewedReview] = React.useState(null);
    const args = Action.actionArguments(action);
    const risk = action.risk || action.kind || "write";
    const state = action.state || "pending_confirmation";
    const hash = Action.actionHash(action);
    const operation = Action.actionOperation(action);
    const drawing = Action.isProseDraw(action);
    const idempotencyKey = action.idempotency_key || "";
    const isChapterBodyUpdate = operation === "chapter_body_update";
    const chapterBody = isChapterBodyUpdate && typeof args.body === "string" ? args.body : "";
    const presentation = Action.actionPresentation(action, assistantCopy);
    const cost = presentation.cost || {};
    const continueTurn = Action.isAssistantContinue(action);
    const historical = action.version_current === false;
    const pending = !historical && (state === "pending" || state === "pending_confirmation");
    const ambiguous = state === "unknown" || state === "ambiguous";
    const executionRecovery = state === "executing";
    const continuation = Action.isContinuationPending(action);
    const revisionRequested = !!(FieldCore && FieldCore.isRevisionRequested(action));
    const reviewable = !historical && (pending || state === "expired");
    const recoveryLabel = ambiguous ? TC("asst_recover") : TC("asst_check_recover");
    const cannotEstimate = cost.requiresEstimate === true && cost.amount == null;
    const needsBody = isChapterBodyUpdate && reviewable && !continuation;
    const needsField = !historical && !!(FieldCore && FieldCore.needsFieldReview(action));
    const needsCustom = operation.startsWith("custom_settings_") && reviewable && !continuation;
    const customReviewState = CustomReview.useReview ? CustomReview.useReview(action, needsCustom, onReviewBusy, api) : {
      loading: false,
      review: null,
      error: null
    };
    const fieldReviewState = FieldReview.useFieldReview ? FieldReview.useFieldReview(action, needsField, onReviewBusy, api) : {
      loading: false,
      review: null,
      error: null
    };
    const bodyReviewState = BodyReview.useBodyReview ? BodyReview.useBodyReview(action, needsBody, onReviewBusy, api) : {
      loading: false,
      review: null,
      error: null
    };
    const reviewState = needsCustom ? customReviewState : needsField ? fieldReviewState : bodyReviewState;
    React.useEffect(() => {
      if (reviewState.review) onReviewRead?.(action, reviewState.review);
    }, [action.id, hash, reviewState.review, onReviewRead]);
    const expired = useConfirmationExpiry(action, reviewState.review, approvalExpiresAt) && !historical;
    const canConfirm = !historical && !expired && !continuation && (pending || ambiguous || executionRecovery);
    const undoState = BodyReview.useBodyUndo ? BodyReview.useBodyUndo(action, onUndoComplete, onUndoBusy, api) : {
      available: false,
      confirming: false,
      busy: false,
      undone: false,
      error: null,
      ask() {},
      cancel() {},
      confirm() {}
    };
    const heading = expired ? TC("asst_expired_title") : waiting ? TC("asst_wait_others") : continuation ? TC("asst_continuation_pending") : revisionRequested ? TC("asst_revision_requested") : state === "succeeded" || state === "completed" ? TC(undoState.undone ? "asst_undone" : Action.successCopyKey(action) || "asst_succeeded") : pending ? TC("asst_pending") : TC(Action.actionStateCopyKey(action));
    const fieldBlocksConfirm = needsField && (reviewState.loading || !!reviewState.error || !(FieldCore && FieldCore.reviewConfirmEnabled(reviewState.review)));
    const bodyBlocksConfirm = needsBody && (reviewState.loading || !!reviewState.error || !(BodyCore && BodyCore.reviewConfirmEnabled(reviewState.review)));
    const customBlocksConfirm = needsCustom && (reviewState.loading || !!reviewState.error || !(CustomCore && CustomCore.canConfirm(action, reviewState.review)));
    const reviewBlocksConfirm = fieldBlocksConfirm || bodyBlocksConfirm || customBlocksConfirm;
    const locked = busy || waiting || historical;
    const UI = window.AssistantInteractionUI;
    const reviewIdentity = action.id + ':' + hash;
    const needsFullReview = !!(UI && window.ConfirmDialog && needsBody && reviewState.review && Math.max((reviewState.review.before || '').length, (reviewState.review.after || '').length) > 1200);
    const unreadReview = needsFullReview && viewedReview !== reviewIdentity;
    const terminal = !expired && !canConfirm && !continuation;
    const danger = operation === 'tasks_cancel' || operation === 'cruise_stop' || operation === 'custom_settings_remove_definition' || operation === 'character_delete';
    const characterContent = React.useMemo(() => operation === 'character_create' && window.AssistantCreationCore?.parseObject(args.content_json), [operation, args.content_json]);
    const stateText = TC(historical ? 'asst_checkpoint_historical_action' : undoState.undone ? 'asst_undone' : Action.actionStateCopyKey(action));
    const optionalFact = fact => ['human_intent', 'reason', 'character_brief', 'instruction', 'premise', 'conflict'].includes(fact.key) || fact.key === 'execution_mode' && args.execution_mode === 'full';
    const detailFacts = drawing ? presentation.facts : presentation.facts.filter(optionalFact);
    const contextFacts = drawing ? [] : presentation.facts.filter(fact => !optionalFact(fact));
    const savedImportFacts = operation === "chapter_bodies_import" ? contextFacts.filter(fact => fact.key === "import_saved") : [];
    const factsView = items => /*#__PURE__*/React.createElement("dl", {
      className: "asst-action__facts"
    }, items.map(fact => /*#__PURE__*/React.createElement("div", {
      key: fact.key,
      className: "asst-action__fact"
    }, /*#__PURE__*/React.createElement("dt", null, fact.label), /*#__PURE__*/React.createElement("dd", null, fact.text, continueTurn && fact.text !== TC('asst_value_unknown') ? ' ' + TC('asst_credits_unit') : ''))));
    return /*#__PURE__*/React.createElement("section", {
      className: "asst-action asst-action--" + risk + (terminal ? " asst-action--settled" : "") + (continueTurn ? " asst-action--protection" : "") + (danger ? " asst-action--danger" : ""),
      "aria-label": heading
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", {
      className: "asst-action__heading"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "asst-action__title"
    }, presentation.title), (pending || expired) && !continueTurn ? /*#__PURE__*/React.createElement("span", {
      className: "asst-action__badge"
    }, heading) : null, presentation.showBook === false ? null : /*#__PURE__*/React.createElement("p", {
      className: "asst-action__book" + (presentation.bookAvailable ? "" : " asst-action__book--unavailable")
    }, presentation.bookLabel)), cost.kind === "estimate" || cost.kind === "remaining" ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__cost",
      "aria-label": cost.label || TC("asst_estimate")
    }, cost.amount == null ? /*#__PURE__*/React.createElement("span", null, cost.text || TC("asst_no_estimate_short")) : /*#__PURE__*/React.createElement(React.Fragment, null, cost.kind === "remaining" || cost.prefix ? /*#__PURE__*/React.createElement("span", null, cost.prefix || cost.label, " ") : /*#__PURE__*/React.createElement("span", null, window.CLANG === "en" ? "Est. " : "预计 "), /*#__PURE__*/React.createElement("strong", null, cost.amount), /*#__PURE__*/React.createElement("span", null, TC("asst_credits_unit")))) : null), !terminal && !expired && cost.promotion ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__meta"
    }, TC("asst_draw_promotion")) : null, !terminal && !drawing && presentation.metadata.length ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__meta"
    }, presentation.metadata.join(" · ")) : null, terminal && savedImportFacts.length ? /*#__PURE__*/React.createElement("div", {
      className: "asst-action__context"
    }, factsView(savedImportFacts)) : null, !terminal && contextFacts.length ? /*#__PURE__*/React.createElement("div", {
      className: continueTurn ? "asst-action__protection" : "asst-action__context"
    }, factsView(contextFacts)) : null, !terminal && (detailFacts.length || drawing && presentation.metadata.length) ? /*#__PURE__*/React.createElement("details", {
      className: "asst-action__details"
    }, /*#__PURE__*/React.createElement("summary", null, window.CLANG === 'en' ? 'View requirements' : '查看要求'), drawing && presentation.metadata.length ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__meta"
    }, presentation.metadata.join(" · ")) : null, factsView(detailFacts)) : null, !terminal && characterContent && Object.keys(characterContent).length > 0 && FieldReview.FieldDiff ? /*#__PURE__*/React.createElement(FieldReview.FieldDiff, {
      kind: "structured",
      before: {},
      after: characterContent,
      copy: TC
    }) : null, needsCustom && CustomReview.ReviewView ? /*#__PURE__*/React.createElement(CustomReview.ReviewView, {
      action: action,
      review: reviewState.review,
      loading: reviewState.loading,
      error: reviewState.error,
      onRetry: reviewState.retry,
      copy: TC,
      expired: expired
    }) : needsField && FieldReview.FieldReviewView ? /*#__PURE__*/React.createElement(FieldReview.FieldReviewView, {
      action: action,
      review: reviewState.review,
      loading: reviewState.loading,
      error: reviewState.error,
      onRetry: reviewState.retry,
      copy: TC,
      expired: expired
    }) : needsBody && BodyReview.ChapterBodyReviewView ? /*#__PURE__*/React.createElement(BodyReview.ChapterBodyReviewView, {
      review: reviewState.review,
      loading: reviewState.loading,
      error: reviewState.error,
      onRetry: reviewState.retry,
      copy: TC,
      identity: reviewIdentity,
      required: unreadReview,
      onViewed: setViewedReview,
      expired: expired,
      proposal: chapterBody
    }) : isChapterBodyUpdate && pending ? /*#__PURE__*/React.createElement("section", {
      className: "asst-action__chapter-review",
      "aria-label": TC("asst_new_body")
    }, /*#__PURE__*/React.createElement("h3", null, TC("asst_new_body")), /*#__PURE__*/React.createElement("pre", {
      className: "asst-action__body"
    }, chapterBody)) : null, expired ? /*#__PURE__*/React.createElement(React.Fragment, null, !needsBody && !needsField && !needsCustom ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__note",
      role: "status"
    }, TC(drawing ? "asst_draw_expired" : "asst_proposal_expired")) : null, onReject ? /*#__PURE__*/React.createElement("div", {
      className: "asst-action__buttons"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: onReject,
      disabled: locked || !rejectEnabled,
      "aria-describedby": availabilityId
    }, presentation.rejectLabel || TC("asst_reject"))) : null) : continuation ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "asst-action__state asst-action__state--" + state
    }, TC(undoState.undone ? "asst_undone" : Action.actionStateCopyKey(action))), /*#__PURE__*/React.createElement("p", {
      className: "asst-action__note"
    }, TC("asst_resume_note")), /*#__PURE__*/React.createElement("div", {
      className: "asst-action__buttons"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      onClick: onResume,
      disabled: locked || undoState.busy
    }, busy ? TC("asst_executing") : presentation.resumeLabel)), BodyReview.ChapterBodyUndoView ? /*#__PURE__*/React.createElement(BodyReview.ChapterBodyUndoView, {
      available: undoState.available,
      confirming: undoState.confirming,
      busy: undoState.busy || locked,
      undone: undoState.undone,
      error: undoState.error,
      copy: TC,
      onAsk: undoState.ask,
      onCancel: undoState.cancel,
      onConfirm: undoState.confirm
    }) : null) : canConfirm ? /*#__PURE__*/React.createElement(React.Fragment, null, waiting ? !availability && /*#__PURE__*/React.createElement("p", {
      className: "asst-action__note"
    }, TC("asst_wait_others")) : pending && !(reviewBlocksConfirm && !reviewState.loading) && (cannotEstimate || presentation.note || continueTurn && onOpenProtectionSettings) ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__note"
    }, cannotEstimate ? TC(drawing ? "asst_draw_unavailable" : "asst_no_estimate") : presentation.note, continueTurn && onOpenProtectionSettings ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "asst-action__note-link",
      onClick: onOpenProtectionSettings
    }, TC("asst_continue_settings")) : null) : pending ? null : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "asst-action__state asst-action__state--" + state
    }, ambiguous ? TC("asst_unknown") : TC("asst_executing_recovery"))), /*#__PURE__*/React.createElement("div", {
      className: "asst-action__buttons"
    }, pending ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: onReject,
      disabled: locked || !rejectEnabled,
      "aria-describedby": availabilityId
    }, presentation.rejectLabel || TC("asst_reject")) : null, pending && !continueTurn && FieldReview.ReviseForm ? /*#__PURE__*/React.createElement(FieldReview.ReviseForm, {
      action: action,
      busy: busy,
      disabled: waiting || !reviseEnabled,
      disabledReasonId: availabilityId,
      copy: key => TC(drawing && key === "asst_revise" ? "asst_draw_revise" : key),
      onRevise: onRevise && ((...args) => Action.confirmationExpired(action, reviewState.review, approvalExpiresAt) ? false : onRevise(...args))
    }) : null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn " + (danger ? "danger" : "primary"),
      "aria-describedby": availabilityId,
      onClick: () => {
        if (!Action.confirmationExpired(action, reviewState.review, approvalExpiresAt)) onConfirm?.();
      },
      disabled: locked || !approveEnabled || !canConfirm || (continueTurn ? !Action.assistantContinueKey(action) : !hash || !idempotencyKey) || cannotEstimate || reviewBlocksConfirm || unreadReview
    }, busy ? TC("asst_executing") : pending ? presentation.confirmLabel : recoveryLabel))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "asst-action__state asst-action__state--" + state
    }, stateText), BodyReview.ChapterBodyUndoView ? /*#__PURE__*/React.createElement(BodyReview.ChapterBodyUndoView, {
      available: undoState.available,
      confirming: undoState.confirming,
      busy: undoState.busy || locked,
      undone: undoState.undone,
      error: undoState.error,
      copy: TC,
      onAsk: undoState.ask,
      onCancel: undoState.cancel,
      onConfirm: undoState.confirm
    }) : null), (pending || expired) && availability);
  }
  ActionCard.useExpiryClock = useExpiryClock;
  window.AssistantActionCard = ActionCard;
})();
}
