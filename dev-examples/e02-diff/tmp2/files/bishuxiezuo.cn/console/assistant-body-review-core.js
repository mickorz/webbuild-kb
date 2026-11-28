(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantBodyReviewCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const BODY_UPDATE = "chapter_body_update";
  const INLINE_DIFF_MAX_CHARS = 12000;
  const REVIEW_ERROR_KEYS = {
    expired: "asst_proposal_expired",
    version_conflict: "asst_review_conflict",
    unknown_before: "asst_review_unknown",
    unavailable: "asst_review_unavailable"
  };
  const UNDO_ERROR_CODES = {
    assistant_body_undo_busy: "asst_undo_busy",
    assistant_body_undo_conflict: "asst_undo_conflict",
    assistant_body_undo_unavailable: "asst_undo_unavailable"
  };

  function actionOperation(action) {
    if (!action) return "";
    const args = action.arguments && typeof action.arguments === "object" ? action.arguments : {};
    return action.operation || args.operation || "";
  }

  function isChapterBodyUpdate(action) {
    return actionOperation(action) === BODY_UPDATE;
  }

  function isPendingConfirmation(action) {
    return ["pending", "pending_confirmation"].includes(action && action.state || "pending");
  }

  function needsBodyReview(action) {
    return isChapterBodyUpdate(action) && isPendingConfirmation(action) && !action.continuation_pending;
  }

  function receiptSucceeded(result) {
    const receipt = result && typeof result === "object" ? result.assistant_body_undo : null;
    return !!(receipt && receipt.status === "succeeded");
  }

  function hasSavedRevision(action) {
    const result = action && action.result_json;
    if (!result || typeof result !== "object") return false;
    const revisionId = typeof result.revision_id === "string" ? result.revision_id.trim() : "";
    const version = Number(result.version);
    return !!revisionId && Number.isSafeInteger(version) && version > 0;
  }

  function isBodyUndoAvailable(action) {
    if (action?.version_current === false) return false;
    if (!isChapterBodyUpdate(action)) return false;
    if (!["succeeded", "completed"].includes(action && action.state)) return false;
    if (action.body_undo_available === false) return false;
    if (action.body_undo_available === true) return true;
    return hasSavedRevision(action) && !receiptSucceeded(action.result_json);
  }

  function reviewConfirmEnabled(review) {
    return !!(review && review.status === "ready" && review.can_confirm === true && typeof review.before === "string" && typeof review.after === "string");
  }

  function reviewCopyKey(review, error) {
    if (review && REVIEW_ERROR_KEYS[review.status]) return REVIEW_ERROR_KEYS[review.status];
    if (error) return "asst_review_unavailable";
    return null;
  }

  function undoCopyKey(error) {
    const detail = error && error.body && error.body.detail;
    const code = detail && typeof detail === "object" ? String(detail.code || "") : "";
    if (UNDO_ERROR_CODES[code]) return UNDO_ERROR_CODES[code];
    if (Number(error && error.status) === 409) return "asst_undo_conflict";
    return "asst_undo_failed";
  }

  function diffTexts(before, after) {
    const rawBefore = typeof before === "string" ? before : "";
    const rawAfter = typeof after === "string" ? after : "";
    return { before: rawBefore, after: rawAfter,
      fullText: rawBefore.length > INLINE_DIFF_MAX_CHARS || rawAfter.length > INLINE_DIFF_MAX_CHARS };
  }

  function lastBodyReceipt(actions, sessionId) {
    return (Array.isArray(actions) ? actions : []).filter(action => action.session_id === sessionId && action.version_current !== false
      && isChapterBodyUpdate(action) && ["succeeded", "completed"].includes(action.state)
      && hasSavedRevision(action)).slice(-1)[0] || null;
  }

  function undoReceiptAction(payload, action) {
    const next = payload && payload.action;
    const receipt = next && next.result_json && next.result_json.assistant_body_undo;
    return payload && payload.undone === true && payload.status === "succeeded" && next
      && next.id === action.id && next.session_id === action.session_id
      && next.book_link_id === action.book_link_id && receipt && receipt.status === "succeeded"
      && Number.isSafeInteger(payload.version) && payload.version > 0
      && payload.version === receipt.version && payload.revision_id === receipt.revision_id
      && typeof payload.revision_id === "string" && payload.revision_id.length
      ? next : null;
  }

  return {
    BODY_UPDATE,
    INLINE_DIFF_MAX_CHARS,
    isChapterBodyUpdate,
    needsBodyReview,
    isBodyUndoAvailable,
    receiptSucceeded,
    reviewConfirmEnabled,
    reviewCopyKey,
    undoCopyKey,
    diffTexts,
    lastBodyReceipt,
    undoReceiptAction
  };
});
