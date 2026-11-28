{
/* ===== Assistant chapter body review and one-step undo ===== */
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const Core = window.AssistantBodyReviewCore;
  function copyText(copy, key) {
    return typeof copy === "function" ? copy(key) : window.TC ? TC(key) : key;
  }
  function InlineDiff({
    before,
    after
  }) {
    const Diff = window.LF_REWRITE_DIFF && window.LF_REWRITE_DIFF.InlineTextDiff;
    const texts = Core.diffTexts(before, after);
    if (Diff && !texts.fullText) return /*#__PURE__*/React.createElement(Diff, {
      before: texts.before,
      after: texts.after,
      showOriginal: false
    });
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, TC("asst_review_before")), /*#__PURE__*/React.createElement("pre", {
      className: "asst-action__body"
    }, texts.before), /*#__PURE__*/React.createElement("h3", null, TC("asst_review_after")), /*#__PURE__*/React.createElement("pre", {
      className: "asst-action__body"
    }, texts.after));
  }
  function ChapterBodyReviewView({
    review,
    loading,
    error,
    copy,
    onRetry,
    identity,
    required,
    onViewed,
    expired,
    proposal
  }) {
    const isExpired = expired || review?.status === "expired";
    if (loading && !isExpired) {
      return /*#__PURE__*/React.createElement("p", {
        className: "asst-action__note",
        role: "status"
      }, copyText(copy, "asst_review_loading"));
    }
    const messageKey = Core.reviewCopyKey(review, error) || (isExpired ? "asst_proposal_expired" : null);
    const message = messageKey ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__review-error",
      role: messageKey === "asst_proposal_expired" ? "status" : "alert"
    }, copyText(copy, messageKey)) : null;
    if (review && (Core.reviewConfirmEnabled(review) || isExpired && typeof review.before === "string" && typeof review.after === "string")) {
      const Surface = window.AssistantInteractionUI?.ReviewSurface;
      const diff = /*#__PURE__*/React.createElement(InlineDiff, {
        before: review.before,
        after: review.after
      });
      return /*#__PURE__*/React.createElement("section", {
        className: "asst-action__chapter-review",
        "aria-label": copyText(copy, "asst_review_diff")
      }, message, /*#__PURE__*/React.createElement("h3", null, copyText(copy, "asst_review_diff")), Surface ? /*#__PURE__*/React.createElement(Surface, {
        identity: identity || review,
        title: copyText(copy, "asst_review_diff"),
        required: !isExpired && required,
        onViewed: onViewed
      }, diff) : diff);
    }
    return /*#__PURE__*/React.createElement(React.Fragment, null, message, !isExpired && error && onRetry ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: onRetry
    }, copyText(copy, "asst_retry")) : null, typeof review?.after === "string" || isExpired && typeof proposal === "string" ? /*#__PURE__*/React.createElement("section", {
      className: "asst-action__chapter-review",
      "aria-label": copyText(copy, "asst_new_body")
    }, /*#__PURE__*/React.createElement("h3", null, copyText(copy, "asst_new_body")), /*#__PURE__*/React.createElement("pre", {
      className: "asst-action__body"
    }, typeof review?.after === "string" ? review.after : proposal)) : null);
  }
  function ChapterBodyUndoView({
    available,
    confirming,
    busy,
    undone,
    error,
    copy,
    onAsk,
    onCancel,
    onConfirm
  }) {
    if (undone || !available) return null;
    const errorKey = error ? Core.undoCopyKey(error) : null;
    if (confirming && window.ConfirmDialog) {
      const Dialog = window.ConfirmDialog;
      return /*#__PURE__*/React.createElement(Dialog, {
        open: true,
        title: copyText(copy, "asst_undo"),
        message: copyText(copy, "asst_undo_confirm"),
        tone: "danger",
        icon: null,
        className: "asst-confirm-dialog",
        cancelLabel: copyText(copy, "asst_undo_cancel"),
        confirmLabel: copyText(copy, busy ? "asst_undoing" : "asst_undo"),
        confirmDisabled: busy,
        onClose: () => {
          if (!busy) onCancel();
        },
        onConfirm: onConfirm
      }, errorKey && /*#__PURE__*/React.createElement("p", {
        className: "asst-action__review-error",
        role: "alert"
      }, copyText(copy, errorKey)));
    }
    if (confirming) {
      return /*#__PURE__*/React.createElement("div", {
        className: "asst-action__undo-confirm",
        role: "group",
        "aria-label": copyText(copy, "asst_undo_confirm")
      }, /*#__PURE__*/React.createElement("p", {
        className: "asst-action__note"
      }, copyText(copy, "asst_undo_confirm")), errorKey ? /*#__PURE__*/React.createElement("p", {
        className: "asst-action__review-error",
        role: "alert"
      }, copyText(copy, errorKey)) : null, /*#__PURE__*/React.createElement("div", {
        className: "asst-action__buttons"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn ghost",
        onClick: onCancel,
        disabled: busy
      }, copyText(copy, "asst_undo_cancel")), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn primary",
        onClick: onConfirm,
        disabled: busy
      }, busy ? copyText(copy, "asst_undoing") : copyText(copy, "asst_undo"))));
    }
    return /*#__PURE__*/React.createElement(React.Fragment, null, errorKey ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__review-error",
      role: "alert"
    }, copyText(copy, errorKey)) : null, /*#__PURE__*/React.createElement("div", {
      className: "asst-action__buttons"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: onAsk,
      disabled: busy
    }, copyText(copy, "asst_undo"))));
  }
  function useBodyReview(action, enabled, onBusyChange, adapter) {
    const [loading, setLoading] = useState(() => !!enabled);
    const [review, setReview] = useState(null);
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const busyRef = useRef(onBusyChange);
    busyRef.current = onBusyChange;
    useEffect(() => {
      if (!enabled) {
        setLoading(false);
        setReview(null);
        setError(null);
        return undefined;
      }
      const api = adapter || window.LF_API;
      if (!action || !action.id || !action.session_id || !api || typeof api.assistantActionBodyReview !== "function") {
        setLoading(false);
        setReview(null);
        setError({
          status: 0,
          message: "missing_review_api"
        });
        return undefined;
      }
      let cancelled = false;
      const controller = new AbortController();
      setReview(null);
      setLoading(true);
      setError(null);
      if (typeof busyRef.current === "function") busyRef.current(true);
      Promise.resolve().then(() => api.assistantActionBodyReview(action.session_id, action.id, {
        signal: controller.signal
      })).then(payload => {
        if (cancelled) return;
        if (!payload || payload.action_id !== action.id) throw new Error("Mismatched review target");
        setReview(Object.assign({}, payload, {
          reviewIdentity: action.id + ":" + action.arguments_hash
        }));
        setError(null);
        setLoading(false);
        if (typeof busyRef.current === "function") busyRef.current(false);
      }).catch(failed => {
        if (cancelled) return;
        setReview(null);
        setError(failed);
        setLoading(false);
        if (typeof busyRef.current === "function") busyRef.current(false);
      });
      return () => {
        cancelled = true;
        controller.abort();
        if (typeof busyRef.current === "function") busyRef.current(false);
      };
    }, [enabled, action && action.id, action && action.session_id, action && action.arguments_hash, attempt, adapter]);
    const currentReview = review && review.reviewIdentity === action.id + ":" + action.arguments_hash ? review : null;
    return {
      loading,
      review: currentReview,
      error,
      retry: () => setAttempt(value => value + 1)
    };
  }
  function useBodyUndo(action, onUndoComplete, onBusyChange, adapter) {
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [locallyUndone, setUndone] = useState(false);
    const undone = locallyUndone || Core.receiptSucceeded(action && action.result_json);
    const [error, setError] = useState(null);
    const completeRef = useRef(onUndoComplete);
    const busyCbRef = useRef(onBusyChange);
    const inflightRef = useRef(false);
    const undoneRef = useRef(false);
    const controllerRef = useRef(null);
    const generationRef = useRef(0);
    completeRef.current = onUndoComplete;
    busyCbRef.current = onBusyChange;
    const available = !undone && Core.isBodyUndoAvailable(action);
    useEffect(() => {
      generationRef.current += 1;
      return () => {
        generationRef.current += 1;
        if (controllerRef.current) controllerRef.current.abort();
        if (typeof busyCbRef.current === "function") busyCbRef.current(false);
      };
    }, [action && action.id, action && action.session_id]);
    function setUndoBusy(next) {
      setBusy(next);
      if (typeof busyCbRef.current === "function") busyCbRef.current(next);
    }
    async function confirm() {
      if (inflightRef.current || undoneRef.current || !available) return;
      const api = adapter || window.LF_API;
      if (!action || !action.id || !action.session_id || !api || typeof api.assistantActionBodyUndo !== "function") {
        setError({
          status: 0,
          message: "missing_undo_api"
        });
        return;
      }
      const generation = generationRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      inflightRef.current = true;
      setUndoBusy(true);
      setError(null);
      try {
        const payload = await api.assistantActionBodyUndo(action.session_id, action.id, {
          signal: controller.signal
        });
        if (generation !== generationRef.current || controller.signal.aborted) return;
        const nextAction = Core.undoReceiptAction(payload, action);
        if (!nextAction) throw new Error("Missing confirmed undo receipt");
        undoneRef.current = true;
        setUndone(true);
        setConfirming(false);
        if (typeof completeRef.current === "function") await completeRef.current(nextAction);
      } catch (failed) {
        if (generation === generationRef.current && !controller.signal.aborted) setError(failed);
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
        if (generation === generationRef.current) {
          inflightRef.current = false;
          setUndoBusy(false);
        }
      }
    }
    return {
      available,
      confirming,
      busy,
      undone,
      error,
      ask() {
        if (!inflightRef.current && !undoneRef.current) setConfirming(true);
      },
      cancel() {
        if (!inflightRef.current) {
          setConfirming(false);
          setError(null);
        }
      },
      confirm
    };
  }
  window.AssistantBodyReview = {
    ChapterBodyReviewView,
    ChapterBodyUndoView,
    useBodyReview,
    useBodyUndo
  };
})();
}
