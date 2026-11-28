(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantFieldReviewCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const FIELD_UPDATE = "resource_field_update";
  const REVIEW_ERROR_KEYS = {
    expired: "asst_proposal_expired",
    version_conflict: "asst_field_conflict",
    unknown_before: "asst_field_unknown",
    unavailable: "asst_field_unavailable"
  };
  const REVISE_MIN = 1;
  const REVISE_MAX = 2000;
  const INLINE_DIFF_MAX_CHARS = 12000;

  function actionArguments(action) {
    if (!action) return {};
    if (action.arguments && typeof action.arguments === "object") return action.arguments;
    if (action.arguments_json && typeof action.arguments_json === "object") return action.arguments_json;
    return {};
  }

  function actionOperation(action) {
    if (!action) return "";
    const args = actionArguments(action);
    return action.operation || args.operation || "";
  }

  function isResourceFieldUpdate(action) {
    return actionOperation(action) === FIELD_UPDATE;
  }

  function isPendingConfirmation(action) {
    return ["pending", "pending_confirmation"].includes(action && action.state || "pending");
  }

  function needsFieldReview(action) {
    return isResourceFieldUpdate(action) && (isPendingConfirmation(action) || action.state === "expired") && !action.continuation_pending;
  }

  function canReviseAction(action) {
    return isPendingConfirmation(action) && !action.continuation_pending;
  }

  function isRevisionRequested(action) {
    return !!(action && action.error_code === "revision_requested");
  }

  function reviewConfirmEnabled(review) {
    return !!(review && review.status === "ready" && review.can_confirm === true
      && Object.prototype.hasOwnProperty.call(review, "before")
      && Object.prototype.hasOwnProperty.call(review, "after"));
  }

  function reviewCopyKey(review, error) {
    if (review && REVIEW_ERROR_KEYS[review.status]) return REVIEW_ERROR_KEYS[review.status];
    if (error) return "asst_field_unavailable";
    return null;
  }

  function inferFieldKind(before, after) {
    const values = [before, after];
    if (values.some((value) => value && typeof value === "object")) {
      if (values.some((value) => Array.isArray(value) && value.some((item) => item && typeof item === "object"))) {
        return "structured";
      }
      if (values.some((value) => value && typeof value === "object" && !Array.isArray(value))) return "structured";
      return "list";
    }
    return "text";
  }

  function asText(value) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return "";
  }

  function textLen(value) {
    return asText(value).length;
  }

  function needsFullText(before, after) {
    return inferFieldKind(before, after) === "text"
      && (textLen(before) > INLINE_DIFF_MAX_CHARS || textLen(after) > INLINE_DIFF_MAX_CHARS);
  }

  function fieldLabelText(key, copy) {
    const portal = typeof window !== "undefined" ? window.LF_PORTAL : null;
    if (portal && typeof portal.fieldLabel === "function") {
      const label = portal.fieldLabel(key);
      if (label && typeof copy === "function") {
        const localized = copy(label);
        if (localized) return String(localized);
      }
      if (label && typeof label === "object") return String(label.zh || label.en || key);
      if (typeof label === "string" && label) return label;
    }
    return String(key == null ? "" : key);
  }

  function localize(value, copy) {
    if (typeof copy === "function" && value && typeof value === "object" && (value.zh != null || value.en != null)) {
      return String(copy(value) || value.zh || value.en || "");
    }
    return fieldLabelText(value, copy);
  }

  function citeHelpers() {
    return (typeof window !== "undefined" && window.AssistantCiteCore) || {};
  }

  function objectCopy(review, action, copy) {
    const resourceType = (review && review.resource_type) || actionArguments(action).resource_type;
    const resourceKey = (review && review.resource_key) || actionArguments(action).resource_key;
    if (!resourceKey) return { text: "" };
    if (resourceType === "character") return { text: String(resourceKey) };
    if (resourceType === "book" && resourceKey === "story_plan") return { key: "asst_object_story_plan" };
    const Cite = citeHelpers();
    const outline = Cite.parseOutlineKey ? Cite.parseOutlineKey(resourceKey) : null;
    if (resourceType === "outline" && outline) {
      return {
        key: outline.kind === "near_term" ? "asst_object_near_term" : "asst_object_volume_outline",
        values: { volume: outline.volume }
      };
    }
    const guide = Cite.parseChapterGuideKey ? Cite.parseChapterGuideKey(resourceKey) : null;
    if (resourceType === "chapter" && guide) {
      return { key: "asst_object_chapter_guide", values: { chapter: guide.chapter } };
    }
    return { text: fieldLabelText(resourceKey, copy) };
  }

  function objectLabel(review, action, copy) {
    const named = objectCopy(review, action, copy);
    if (named && named.key && typeof copy === "function") {
      const text = copy(named.key);
      if (text && text !== named.key) {
        return Object.entries(named.values || {}).reduce(
          (result, [name, value]) => result.replaceAll("{" + name + "}", String(value)),
          String(text)
        );
      }
    }
    return named && named.text ? named.text : "";
  }

  function fieldReviewNoteKey(review, action) {
    const args = actionArguments(action);
    const resourceType = (review && review.resource_type) || args.resource_type;
    const resourceKey = (review && review.resource_key) || args.resource_key;
    const path = String((review && review.path) || args.path || "");
    if (resourceType === "chapter" && path === "title") return "asst_field_guide_title_note";
    if (resourceType !== "outline") return null;
    const Cite = citeHelpers();
    const outline = Cite.parseOutlineKey ? Cite.parseOutlineKey(resourceKey) : null;
    if (!outline) return null;
    if (outline.kind === "near_term" && path.split(".")[0] === "chapters") return "asst_field_outline_chapters_note";
    return "asst_field_outline_package_note";
  }

  function fieldLabel(review, action, copy) {
    const path = (review && review.path) || actionArguments(action).path || "";
    if (!path) return "";
    return String(path).split(".").filter(Boolean).map((part) => fieldLabelText(part, copy)).join(" · ");
  }

  function normalizeInstruction(value) {
    const instruction = typeof value === "string" ? value.trim() : "";
    if (instruction.length < REVISE_MIN || instruction.length > REVISE_MAX) return "";
    return instruction;
  }

  function reviseIdentity(action) {
    if (!action || !action.id) return "";
    return String(action.id) + ":" + String(action.arguments_hash || "");
  }

  return {
    FIELD_UPDATE,
    INLINE_DIFF_MAX_CHARS,
    REVISE_MIN,
    REVISE_MAX,
    isResourceFieldUpdate,
    isPendingConfirmation,
    needsFieldReview,
    canReviseAction,
    isRevisionRequested,
    reviewConfirmEnabled,
    reviewCopyKey,
    inferFieldKind,
    asText,
    needsFullText,
    objectCopy,
    objectLabel,
    fieldReviewNoteKey,
    fieldLabel,
    localize,
    normalizeInstruction,
    reviseIdentity,
    actionArguments
  };
});
