(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.AssistantCiteCore = api;
    root.LF_ASSISTANT_CITE = api.store;
  }
})(typeof globalThis === "object" ? globalThis : this, function () {
  const CITEABLE_TYPES = { world: true, character: true, book: true, outline: true, chapter: true, custom_setting_definition: true };
  const RESOURCE_KEY_MAX = 200;
  const FIELD_PATH_MAX = 256;
  const CUSTOM_POINTER_SEGMENTS_MAX = 32;
  const WORLD_DIMENSIONS = ["core_laws", "space_time", "society", "history_culture", "existence", "information"];
  const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
  const BLOCKED_SEGMENTS = {
    __proto__: true,
    prototype: true,
    constructor: true,
    "*": true
  };
  const CHAPTER_GUIDE_UI_PATHS = {
    target: "target_word_count",
    worldtime: "world_time_advance",
    pos: "positioning",
    dilemma: "moral_dilemma",
    know: "info_boundary.protagonist_knows",
    dontknow: "info_boundary.protagonist_doesnt_know"
  };
  const CHAPTER_GUIDE_ANCHORS = {
    hook: "opening_hook",
    climax: "climax",
    close: "ending",
    nextlink: "next_bridge"
  };
  const CHAPTER_GUIDE_ARRAY_ROOTS = {
    points: "plot_points",
    info_voids: "info_voids",
    foreshadow: "hook_ops_summary",
    debts: "debt_ops_summary"
  };

  function trimmed(value) {
    return typeof value === "string" ? value.trim() : (value == null ? "" : String(value).trim());
  }

  function hasControlChars(value) {
    return CONTROL_CHARS.test(value);
  }

  function validResourceType(value) {
    return Object.prototype.hasOwnProperty.call(CITEABLE_TYPES, trimmed(value));
  }

  function validResourceKey(value) {
    const key = trimmed(value);
    if (!key || key.length > RESOURCE_KEY_MAX || hasControlChars(key)) return "";
    return key;
  }

  function canonicalPositiveInteger(value) {
    const text = trimmed(value);
    if (!/^[1-9][0-9]*$/.test(text)) return 0;
    const number = Number(text);
    return Number.isSafeInteger(number) ? number : 0;
  }

  function chapterGuideKey(chapterNumber) {
    const number = Number(chapterNumber);
    if (!Number.isInteger(number) || number < 1 || number > 1000000) return "";
    return String(number).padStart(4, "0") + ":guide";
  }

  function parseOutlineKey(value) {
    const key = validResourceKey(value);
    const match = /^(volume|near_term):([1-9][0-9]*)$/.exec(key);
    if (!match) return null;
    const volume = canonicalPositiveInteger(match[2]);
    if (!volume || volume > 100000) return null;
    return { kind: match[1], volume: volume, key: match[1] + ":" + volume };
  }

  function parseChapterGuideKey(value) {
    const key = validResourceKey(value);
    const match = /^([0-9]+):guide$/.exec(key);
    if (!match) return null;
    const canonical = chapterGuideKey(Number(match[1]));
    if (!canonical || canonical !== key) return null;
    return { chapter: Number(match[1]), key: canonical };
  }

  function canonicalResourceKey(resourceType, value) {
    const type = trimmed(resourceType);
    const key = validResourceKey(value);
    if (!key || !validResourceType(type)) return "";
    if (type === "world") return WORLD_DIMENSIONS.includes(key) ? key : "";
    if (type === "character") return key;
    if (type === "custom_setting_definition") {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(key) ? key : "";
    }
    if (type === "book") return key === "story_plan" ? key : "";
    if (type === "outline") {
      const parsed = parseOutlineKey(key);
      return parsed ? parsed.key : "";
    }
    if (type === "chapter") {
      const parsed = parseChapterGuideKey(key);
      return parsed ? parsed.key : "";
    }
    return "";
  }

  function relatedRefreshResources(resource) {
    const source = resource && typeof resource === "object" ? resource : null;
    if (!source) return [];
    const parsed = trimmed(source.resource_type) === "outline" ? parseOutlineKey(source.resource_key) : null;
    if (!parsed) return [source];
    return [
      Object.assign({}, source, { resource_type: "outline", resource_key: "volume:" + parsed.volume }),
      Object.assign({}, source, { resource_type: "outline", resource_key: "near_term:" + parsed.volume })
    ];
  }

  function chapterGuideFieldPath(uiPath) {
    const parts = Array.isArray(uiPath) ? uiPath.map((part) => trimmed(part)).filter((part) => part !== "") : [trimmed(uiPath)];
    if (!parts.length) return "";
    if (CHAPTER_GUIDE_UI_PATHS[parts[0]]) return validFieldPath(CHAPTER_GUIDE_UI_PATHS[parts[0]]);
    if (parts[0] === "anchors" && CHAPTER_GUIDE_ANCHORS[parts[1]]) {
      return validFieldPath("anchors." + CHAPTER_GUIDE_ANCHORS[parts[1]]);
    }
    if (CHAPTER_GUIDE_ARRAY_ROOTS[parts[0]]) return validFieldPath(CHAPTER_GUIDE_ARRAY_ROOTS[parts[0]]);
    return validFieldPath(parts.join("."));
  }

  function mayApplyResourceRefresh(identity, options) {
    const opts = options || {};
    if (opts.saving || opts.hasDraft) return null;
    const guard = opts.guard || (typeof window !== "undefined" && window.AssistantCiteCore
      ? window.AssistantCiteCore.editGuard
      : null);
    if (!guard || typeof guard.capture !== "function") return function allow() { return true; };
    return guard.capture(identity);
  }

  function validFieldPath(value) {
    const path = trimmed(value);
    if (!path) return "";
    if (path.length > FIELD_PATH_MAX || hasControlChars(path) || path.indexOf("..") >= 0) return "";
    const segments = path.split(".");
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (!/^[A-Za-z0-9_]+$/.test(segment) || BLOCKED_SEGMENTS[segment] || /^\d+$/.test(segment)) {
        return "";
      }
    }
    return path;
  }

  // Custom settings use a read-only JSON Pointer, never the built-in field write path.
  function parseCustomPointer(value) {
    if (typeof value !== "string" || !value.startsWith("/") || hasControlChars(value)
      || /~(?:[^01]|$)/.test(value)) return null;
    const segments = value.slice(1).split("/");
    if (!segments.length || segments.some((segment) => !segment)) return null;
    return segments;
  }

  function customFieldPath(value) {
    const segments = parseCustomPointer(value);
    if (!segments) return "";
    const kept = segments.slice(0, CUSTOM_POINTER_SEGMENTS_MAX + (segments[0] === "content" ? 1 : 0));
    while (kept.length) {
      const path = "/" + kept.join("/");
      if (Array.from(path).length <= FIELD_PATH_MAX) return path;
      kept.pop();
    }
    return "";
  }

  function citationPath(type, value) {
    return type === "custom_setting_definition"
      ? customFieldPath(value) : pathFromParts(value);
  }

  function pathFromParts(path) {
    if (Array.isArray(path)) return validFieldPath(path.map((part) => trimmed(part)).filter(Boolean).join("."));
    return validFieldPath(path);
  }

  function fieldOwner(bookId, resourceType, resourceKey, fieldPath) {
    return ["field", trimmed(bookId), trimmed(resourceType), trimmed(resourceKey), trimmed(fieldPath)].join(":");
  }

  function normalizeCitation(input, expectedBookId) {
    const source = input && typeof input === "object" ? input : null;
    if (!source) return null;
    const bookId = trimmed(source.bookId || source.book_id);
    if (!bookId) return null;
    if (expectedBookId != null && expectedBookId !== "" && String(expectedBookId) !== bookId) return null;
    const resourceType = trimmed(source.resource_type);
    const resourceKey = canonicalResourceKey(resourceType, source.resource_key);
    if (!resourceKey) return null;
    const fieldPath = citationPath(resourceType, source.field_path || source.path);
    const immutable = {character:"name", outline:"volume_number", chapter:"chapter_number"};
    if (fieldPath && fieldPath.split(".")[0] === immutable[resourceType]) return null;
    const citation = {
      bookId,
      resource_type: resourceType,
      resource_key: resourceKey,
      owner: trimmed(source.owner) || null
    };
    if (fieldPath) {
      citation.field_path = fieldPath;
      citation.fieldOwner = trimmed(source.fieldOwner) || (citation.owner && fieldPath ? fieldOwner(bookId, resourceType, resourceKey, fieldPath) : null);
    }
    return citation;
  }

  function omitEmpty(value) {
    if (!value || typeof value !== "object") return value;
    const next = {};
    Object.keys(value).forEach((key) => {
      if (value[key] != null && value[key] !== "") next[key] = value[key];
    });
    return next;
  }

  function localizedText(value, localize) {
    if (typeof localize === "function") {
      const text = localize(value);
      return typeof text === "string" && text.trim() ? text.trim() : null;
    }
    if (value && typeof value === "object" && (value.zh != null || value.en != null)) {
      const text = String(value.zh || value.en || "").trim();
      return text || null;
    }
    if (typeof value === "string" && value.trim()) return value.trim();
    return null;
  }

  function navigationContext(state, options) {
    const chapters = options && Array.isArray(options.chapters) ? options.chapters : [];
    const localize = options && options.localize;
    if (!state) return null;
    if (state.view === "shelf") {
      return { surface: "shelf", chapter_number: null, resource_type: "bookshelf", resource_key: null };
    }
    if (state.view === "create") {
      return { surface: "create", chapter_number: null, resource_type: "book_creation", resource_key: null };
    }
    if (state.view !== "book") return null;
    if (state.section === "assistant") {
      return { surface: "settings", chapter_number: null, resource_type: "settings", resource_key: "assistant" };
    }
    const surface = ["workbench", "writing", "world", "custom_settings", "settings", "inbox", "admin"].includes(state.section)
      ? state.section
      : "workbench";
    const resourceType = {
      workbench: "chapter_outline",
      writing: "chapter_body",
      world: "world",
      custom_settings: "custom_settings",
      settings: "settings",
      inbox: "inbox",
      admin: "admin"
    }[surface] || "book";
    const chapterNumber = surface !== "custom_settings" && Number(state.chap) > 0 ? Number(state.chap) : null;
    const chapter = chapterNumber ? chapters.find((item) => Number(item.no) === chapterNumber) : null;
    const volumeNumber = chapter && Number(chapter.vol) > 0 ? Number(chapter.vol) : null;
    const localizedChapterTitle = chapter && chapter.title && chapter.title.zh !== "—"
      ? localizedText(chapter.title, localize)
      : null;
    const chapterTitle = typeof localizedChapterTitle === "string" && localizedChapterTitle.trim()
      ? localizedChapterTitle.trim()
      : null;
    const resourceKey = surface === "workbench"
      ? [state.wbMode, state.tab].filter(Boolean).join(":") || null
      : null;
    return {
      surface,
      volume_number: volumeNumber,
      chapter_number: chapterNumber,
      chapter_title: chapterTitle,
      resource_type: resourceType,
      resource_key: resourceKey
    };
  }

  function applyCitation(context, citation, bookId) {
    const base = context && typeof context === "object" ? Object.assign({}, context) : null;
    const next = bookId ? normalizeCitation(citation, bookId) : null;
    if (!base) return next ? {
      resource_type: next.resource_type,
      resource_key: next.resource_key,
      field_path: next.field_path || undefined
    } : null;
    if (!next) return base;
    base.resource_type = next.resource_type;
    base.resource_key = next.resource_key;
    if (next.field_path) base.field_path = next.field_path;
    else delete base.field_path;
    return base;
  }

  function buildPageContext(state, options) {
    const opts = options || {};
    const nav = navigationContext(state, opts);
    return applyCitation(nav, opts.citation, opts.bookId);
  }

  function retainIfBook(citation, bookId) {
    return bookId ? normalizeCitation(citation, bookId) : null;
  }

  function createEditGuard() {
    const entries = new Map();
    const navigationBlockers = new Map();
    const releaseListeners = new Set();
    let generation = 0;
    const notifyRelease = () => releaseListeners.forEach(listener => { try { listener(); } catch (error) {} });
    const key = (identity) => JSON.stringify([
      identity && (identity.book_id || identity.bookId),
      identity && identity.resource_type,
      identity && identity.resource_key
    ]);
    function acquire(identity) {
      const id = key(identity);
      const entry = entries.get(id) || { active: 0, generation: 0 };
      entry.active += 1;
      entry.generation = ++generation;
      entries.set(id, entry);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        entry.active -= 1;
        entry.generation = ++generation;
        if (!entry.active) entries.delete(id);
        notifyRelease();
      };
    }
    function capture(identity) {
      if (entries.has(key(identity))) return null;
      const captured = generation;
      return () => captured === generation && !entries.has(key(identity));
    }
    function registerNavigationBlocker(blocked, options) {
      // A clean editor may lock navigation for its own task while still accepting
      // that task's authoritative result. Draft protection remains mandatory.
      navigationBlockers.set(blocked, options && options.refreshBlocked || blocked);
      generation += 1;
      return () => { navigationBlockers.delete(blocked); generation += 1; notifyRelease(); };
    }
    function captureGuard(refresh) {
      const blocked = () => entries.size > 0 || Array.from(refresh
        ? navigationBlockers.values() : navigationBlockers.keys()).some(check => check());
      if (blocked()) return null;
      const captured = generation;
      return () => captured === generation && !blocked();
    }
    function captureNavigation() { return captureGuard(false); }
    function captureRefresh() { return captureGuard(true); }
    function invalidate() { generation += 1; }
    function subscribeRelease(listener) {
      releaseListeners.add(listener);
      return () => releaseListeners.delete(listener);
    }
    return { acquire, capture, registerNavigationBlocker, captureNavigation, captureRefresh, invalidate, subscribeRelease };
  }

  function createStore(dispatch) {
    let current = null;
    function emit(open) {
      const detail = { citation: current, open: !!open };
      if (typeof dispatch === "function") dispatch(detail);
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new CustomEvent("lf:assistant-cite", { detail }));
      }
      return detail;
    }
    function setObject(input) {
      const next = normalizeCitation(input, input && input.bookId);
      if (!next) return null;
      if (current
        && current.bookId === next.bookId
        && current.resource_type === next.resource_type
        && current.resource_key === next.resource_key
        && current.field_path
        && (!next.owner || current.owner === next.owner || current.fieldOwner)) {
        next.field_path = current.field_path;
        next.fieldOwner = current.fieldOwner;
      }
      next.owner = trimmed(input && input.owner) || next.owner;
      current = next;
      emit(false);
      return current;
    }
    function citeField(input) {
      const path = citationPath(input && input.resource_type, input && (input.field_path || input.path));
      if (!path) return null;
      const fieldOwnerName = trimmed(input && input.owner) || fieldOwner(
        input && input.bookId,
        input && input.resource_type,
        input && input.resource_key,
        path
      );
      const bookId = trimmed(input && input.bookId);
      const objectOwner = (current && current.bookId === bookId && current.owner)
        || trimmed(input && input.objectOwner)
        || fieldOwnerName;
      const next = normalizeCitation(Object.assign({}, input, {
        field_path: path,
        owner: objectOwner,
        fieldOwner: fieldOwnerName
      }), input && input.bookId);
      if (!next) return null;
      current = next;
      emit(true);
      return current;
    }
    function clear(input) {
      const source = input || {};
      if (!current) return null;
      if (source.owner && current.owner !== source.owner && current.fieldOwner !== source.owner) return current;
      if (source.fieldOnly) {
        if (source.owner && current.fieldOwner !== source.owner) return current;
        if (!current.field_path) return current;
        current = {
          bookId: current.bookId,
          resource_type: current.resource_type,
          resource_key: current.resource_key,
          owner: current.owner && current.owner !== current.fieldOwner ? current.owner : null
        };
        emit(false);
        return current;
      }
      current = null;
      emit(false);
      return null;
    }
    function read(bookId) {
      return retainIfBook(current, bookId);
    }
    return { setObject, citeField, clear, read, get: read };
  }

  const store = createStore();

  return {
    CITEABLE_TYPES,
    RESOURCE_KEY_MAX,
    FIELD_PATH_MAX,
    CUSTOM_POINTER_SEGMENTS_MAX,
    validResourceType,
    validResourceKey,
    canonicalPositiveInteger,
    chapterGuideKey,
    parseOutlineKey,
    parseChapterGuideKey,
    canonicalResourceKey,
    relatedRefreshResources,
    chapterGuideFieldPath,
    mayApplyResourceRefresh,
    validFieldPath,
    pathFromParts,
    parseCustomPointer,
    customFieldPath,
    fieldOwner,
    normalizeCitation,
    omitEmpty,
    navigationContext,
    applyCitation,
    buildPageContext,
    retainIfBook,
    createStore,
    createEditGuard,
    editGuard: createEditGuard(),
    store
  };
});
