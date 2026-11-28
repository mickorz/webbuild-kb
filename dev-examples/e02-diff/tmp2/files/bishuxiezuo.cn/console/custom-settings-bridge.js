(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CustomSettingsBridge = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const TYPES = new Set(["custom_setting_definition"]);

  function reference(value) { return typeof value === "string" && UUID.test(value) ? value : null; }

  function createApi(request, onSaved) {
    const base = bookId => "/api/books/" + encodeURIComponent(bookId) + "/custom-settings/";
    function read(bookId, path, options, paginated) {
      const opts = options || {};
      const query = new URLSearchParams();
      if (paginated) {
        ["include_removed", "limit", "offset"].forEach(key => {
          if (opts[key] != null) query.set(key, String(opts[key]));
        });
      }
      return request(base(bookId) + path + (query.size ? "?" + query.toString() : ""), { signal: opts.signal });
    }
    const resourcePath = (kind, ref) => {
      if (kind !== "definition" || !reference(ref)) throw new Error("invalid_custom_setting_target");
      return "definitions/" + ref;
    };
    const write = async (bookId, path, method, body, opts) => {
      const result = await request(base(bookId) + path, {
        method, body: JSON.stringify(body), headers: { "Idempotency-Key": opts.idempotencyKey }
      });
      // Refresh observers cannot turn a confirmed save into a failed write.
      try { if (onSaved) onSaved(String(bookId)); } catch (_) {}
      return result;
    };
    return {
      bookCustomSettingDefinitions: (bookId, opts) => read(bookId, "definitions", opts, true),
      bookCustomSettingDefinition: (bookId, ref, opts) => read(bookId, resourcePath("definition", ref), opts),
      saveCustomSettingContent: (bookId, ref, body, opts) => write(bookId, resourcePath("definition", ref) + "/content", "PUT", body, opts),
      setCustomSettingGeneration: (bookId, ref, body, opts) => write(bookId, resourcePath("definition", ref) + "/generation", "PUT", body, opts),
      bookCustomSettingRevisions: (bookId, kind, ref, opts) => read(bookId, resourcePath(kind, ref) + "/revisions", opts, true),
      bookCustomSettingRevision: (bookId, kind, ref, revision, opts) => {
        if (!reference(revision)) throw new Error("invalid_custom_setting_revision");
        return read(bookId, resourcePath(kind, ref) + "/revisions/" + revision, opts);
      }
    };
  }

  function requestDraft(book, request, cite) {
    if (!book || !book.id || !request || !cite) return null;
    const context = { surface: "custom_settings", resource_type: "custom_settings" };
    if (request.resource_type || request.resource_key || request.field_path) {
      if (!TYPES.has(request.resource_type)) return null;
      const payload = { ...request, bookId: book.id };
      if (request.field_path) {
        if (typeof cite.parseCustomPointer !== "function" || !cite.parseCustomPointer(request.field_path)) return null;
        const bounded = typeof cite.customFieldPath === "function" ? cite.customFieldPath(request.field_path) : "";
        if (bounded) payload.field_path = bounded;
        else delete payload.field_path;
      }
      const normalized = cite.normalizeCitation(payload, book.id);
      if (!normalized || (payload.field_path && normalized.field_path !== payload.field_path)) return null;
      context.resource_type = normalized.resource_type;
      context.resource_key = normalized.resource_key;
      if (normalized.field_path) context.field_path = normalized.field_path;
    }
    return { bookId: String(book.id), bookTitle: book.title, pageContext: context,
      prompt: typeof request.prompt === "string" ? request.prompt.slice(0, 8000) : "" };
  }

  function notifySaved(action, dispatch, shouldApply) {
    if (!action || !["succeeded", "completed"].includes(action.state)
      || !String(action.operation || action.arguments?.operation || "").startsWith("custom_settings_")
      || !action.book_link_id || (shouldApply && !shouldApply())) return false;
    const args = action.arguments || {};
    const result = action.result_json || {};
    dispatch({ bookId: String(action.book_link_id),
      definition_ref: reference(result.definition_ref) || reference(args.definition_ref) });
    return true;
  }

  return { reference, createApi, requestDraft, notifySaved };
});
