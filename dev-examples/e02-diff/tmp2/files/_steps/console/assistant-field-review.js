{
/* ===== Assistant resource field review and pending-proposal revise ===== */
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const Core = window.AssistantFieldReviewCore;
  function copyText(copy, key, values) {
    const text = typeof copy === "function" ? copy(key) : window.TC ? TC(key) : key;
    if (!values) return text;
    return Object.entries(values).reduce((result, [name, value]) => result.replaceAll("{" + name + "}", String(value)), String(text == null ? "" : text));
  }
  function FieldDiff(props) {
    const Surface = window.AssistantInteractionUI?.ReviewSurface;
    const diff = /*#__PURE__*/React.createElement(FullFieldDiff, props);
    return Surface ? /*#__PURE__*/React.createElement(Surface, {
      identity: props.after,
      title: copyText(props.copy, "asst_field_diff")
    }, diff) : diff;
  }
  function FullFieldDiff({
    kind,
    before,
    after,
    copy
  }) {
    const Diff = window.LF_REWRITE_DIFF;
    const fullText = Core.needsFullText(before, after);
    if (kind === "text" && fullText) {
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, copyText(copy, "asst_review_before")), /*#__PURE__*/React.createElement("pre", {
        className: "asst-action__body"
      }, Core.asText(before)), /*#__PURE__*/React.createElement("h3", null, copyText(copy, "asst_review_after")), /*#__PURE__*/React.createElement("pre", {
        className: "asst-action__body"
      }, Core.asText(after)));
    }
    if (kind === "text" && Diff && Diff.InlineTextDiff) {
      return /*#__PURE__*/React.createElement(Diff.InlineTextDiff, {
        before: Core.asText(before),
        after: Core.asText(after),
        showOriginal: false
      });
    }
    if (kind === "list" && Diff && Diff.InlineListDiff) {
      return /*#__PURE__*/React.createElement(Diff.InlineListDiff, {
        before: before,
        after: after,
        showOriginal: false
      });
    }
    if (Diff && Diff.InlineStructuredDiff) {
      return /*#__PURE__*/React.createElement(Diff.InlineStructuredDiff, {
        before: before,
        after: after,
        showOriginal: false
      });
    }
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, copyText(copy, "asst_review_before")), /*#__PURE__*/React.createElement("div", {
      className: "asst-action__field-value"
    }, Core.asText(before) || copyText(copy, "asst_field_empty")), /*#__PURE__*/React.createElement("h3", null, copyText(copy, "asst_review_after")), /*#__PURE__*/React.createElement("div", {
      className: "asst-action__field-value"
    }, Core.asText(after) || copyText(copy, "asst_field_empty")));
  }
  function FieldReviewView({
    action,
    review,
    loading,
    error,
    copy,
    onRetry,
    expired
  }) {
    const isExpired = expired || review?.status === "expired";
    if (loading && !isExpired) {
      return /*#__PURE__*/React.createElement("p", {
        className: "asst-action__note",
        role: "status"
      }, copyText(copy, "asst_field_loading"));
    }
    const messageKey = Core.reviewCopyKey(review, error) || (isExpired ? "asst_proposal_expired" : null);
    const localize = window.L || (value => value && value.zh);
    const objectMeta = Core.objectCopy ? Core.objectCopy(review, action, localize) : {
      text: Core.objectLabel(review, action, localize)
    };
    const objectName = objectMeta && objectMeta.key ? copyText(copy, objectMeta.key, objectMeta.values) : objectMeta && objectMeta.text || "";
    const fieldName = Core.fieldLabel(review, action, localize);
    const packageNote = Core.fieldReviewNoteKey ? Core.fieldReviewNoteKey(review, action) : null;
    const ready = review && (Core.reviewConfirmEnabled(review) || isExpired && review.before != null && Object.prototype.hasOwnProperty.call(review, "after"));
    const kind = ready ? Core.inferFieldKind(review.before, review.after) : Core.inferFieldKind(review && review.before, review && review.after);
    const headingKey = packageNote ? "asst_field_proposed" : "asst_field_diff";
    return /*#__PURE__*/React.createElement("section", {
      className: "asst-action__field-review",
      "aria-label": copyText(copy, headingKey)
    }, objectName || fieldName ? /*#__PURE__*/React.createElement("dl", {
      className: "asst-action__facts"
    }, objectName ? /*#__PURE__*/React.createElement("div", {
      className: "asst-action__fact"
    }, /*#__PURE__*/React.createElement("dt", null, copyText(copy, "asst_field_object")), /*#__PURE__*/React.createElement("dd", null, objectName)) : null, fieldName ? /*#__PURE__*/React.createElement("div", {
      className: "asst-action__fact"
    }, /*#__PURE__*/React.createElement("dt", null, copyText(copy, "asst_field_name")), /*#__PURE__*/React.createElement("dd", null, fieldName)) : null) : null, messageKey ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__review-error",
      role: messageKey === "asst_proposal_expired" ? "status" : "alert"
    }, copyText(copy, messageKey)) : null, !isExpired && error && onRetry ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: onRetry
    }, copyText(copy, "asst_retry")) : null, packageNote ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__note"
    }, copyText(copy, packageNote)) : null, ready ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, copyText(copy, headingKey)), Core.needsFullText(review.before, review.after) ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__note"
    }, copyText(copy, "asst_field_full_text")) : null, /*#__PURE__*/React.createElement(FieldDiff, {
      kind: kind,
      before: review.before,
      after: review.after,
      copy: copy
    })) : review && Object.prototype.hasOwnProperty.call(review, "after") ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, copyText(copy, "asst_field_proposed")), /*#__PURE__*/React.createElement(FieldDiff, {
      kind: kind,
      before: kind === "list" ? [] : kind === "structured" ? {} : "",
      after: review.after,
      copy: copy
    })) : null);
  }
  function ReviseForm({
    action,
    busy,
    disabled,
    disabledReasonId,
    copy,
    onRevise
  }) {
    const [instruction, setInstruction] = useState("");
    const [open, setOpen] = useState(false);
    const input = useRef(null),
      trigger = useRef(null);
    const [error, setError] = useState("");
    const identity = Core.reviseIdentity(action);
    useEffect(() => {
      setInstruction("");
      setError("");
      setOpen(false);
    }, [identity]);
    useEffect(() => {
      if (open) input.current?.focus();
    }, [open]);
    if (!Core.canReviseAction(action) || typeof onRevise !== "function") return null;
    async function submit(event) {
      if (event && typeof event.preventDefault === "function") event.preventDefault();
      if (busy || disabled) return;
      const next = Core.normalizeInstruction(instruction);
      if (!next) {
        setError(copyText(copy, "asst_revise_needed"));
        return;
      }
      setError("");
      if ((await onRevise(action, next)) === true) {
        setInstruction('');
        setOpen(false);
      }
    }
    return /*#__PURE__*/React.createElement("details", {
      className: "asst-action__revise-disclosure",
      open: open,
      onToggle: event => setOpen(event.currentTarget.open)
    }, /*#__PURE__*/React.createElement("summary", {
      ref: trigger,
      "aria-disabled": busy || disabled,
      "aria-describedby": disabledReasonId,
      onClick: event => {
        if (busy || disabled) event.preventDefault();
      }
    }, copyText(copy, "asst_revise")), /*#__PURE__*/React.createElement("form", {
      className: "asst-action__revise",
      onSubmit: submit
    }, /*#__PURE__*/React.createElement("label", {
      className: "asst-action__revise-label",
      htmlFor: "assistant-revise-" + action.id
    }, copyText(copy, "asst_revise")), /*#__PURE__*/React.createElement("textarea", {
      ref: input,
      id: "assistant-revise-" + action.id,
      "aria-label": copyText(copy, "asst_revise"),
      value: instruction,
      maxLength: Core.REVISE_MAX,
      rows: 2,
      disabled: busy || disabled,
      placeholder: copyText(copy, "asst_revise_placeholder"),
      onChange: event => {
        setInstruction(event.target.value);
        if (error) setError("");
      }
    }), error ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__review-error",
      role: "alert"
    }, error) : null, /*#__PURE__*/React.createElement("div", {
      className: "asst-action__buttons"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      disabled: busy || disabled,
      onClick: () => {
        setOpen(false);
        trigger.current?.focus();
      }
    }, window.CLANG === 'en' ? 'Cancel adjustment' : '取消调整'), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn primary",
      disabled: busy || disabled || !instruction.trim()
    }, busy ? copyText(copy, "asst_executing") : copyText(copy, "asst_revise_submit")))));
  }
  function useFieldReview(action, enabled, onBusyChange, adapter) {
    const [loading, setLoading] = useState(() => !!enabled);
    const [review, setReview] = useState(null);
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const busyRef = useRef(onBusyChange);
    busyRef.current = onBusyChange;
    const identity = action && action.id && action.arguments_hash ? action.id + ":" + action.arguments_hash : "";
    useEffect(() => {
      if (!enabled) {
        setLoading(false);
        setReview(null);
        setError(null);
        return undefined;
      }
      const api = adapter || window.LF_API;
      if (!action || !action.id || !api || typeof api.assistantActionFieldReview !== "function") {
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
      Promise.resolve().then(() => api.assistantActionFieldReview(action.id, {
        signal: controller.signal
      })).then(payload => {
        if (cancelled) return;
        if (!payload || payload.action_id !== action.id) throw new Error("Mismatched review target");
        setReview(Object.assign({}, payload, {
          reviewIdentity: identity
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
    const currentReview = review && review.reviewIdentity === identity ? review : null;
    return {
      loading,
      review: currentReview,
      error,
      retry: () => setAttempt(value => value + 1)
    };
  }
  window.AssistantFieldReview = {
    FieldDiff,
    FieldReviewView,
    ReviseForm,
    useFieldReview
  };
})();
}
