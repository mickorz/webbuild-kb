(function (root, factory) {
  const api = factory(root.AssistantActionCore);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantReceiptCore = api;
})(typeof globalThis === "object" ? globalThis : this, function (Action) {
  const VIEW_DESTINATIONS = Object.freeze([
    "shelf",
    "create_book",
    "book_workbench",
    "chapter_outline",
    "chapter_body",
    "book_world",
    "book_custom_settings",
    "book_inbox",
    "book_settings"
  ]);
  const TERMINAL_STATES = {
    succeeded: true,
    completed: true,
    rejected: true,
    failed: true,
    expired: true,
    conflict: true
  };

  function isClientDestination(destination) {
    return VIEW_DESTINATIONS.indexOf(destination) >= 0;
  }

  function isTerminalAction(action) {
    return !!(action && TERMINAL_STATES[action.state] && !action.continuation_pending);
  }

  function isActiveSuccess(action, options) {
    return !!(action && action.id && options && options.activeActionId === action.id
      && ["succeeded", "completed"].includes(action.state));
  }

  function chapterNumber(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
  }

  function viewTarget(action, options) {
    if (action?.version_current === false) return null;
    const opts = options || {};
    const allowed = typeof opts.isDestination === "function" ? opts.isDestination : isClientDestination;
    if (!action || typeof action !== "object") return null;
    const args = opts.arguments && typeof opts.arguments === "object"
      ? opts.arguments
      : (action.arguments && typeof action.arguments === "object" ? action.arguments : {});
    const operation = opts.operation || action.operation || args.operation || "";
    if (operation === "assistant_continue") return null;
    if (operation === "books_create" && (!['succeeded', 'completed'].includes(action.state) || !action.result_json?.book_ref)) return null;
    if (operation === "rewrite_start" && (!opts.taskReady || args.rewrite_mode === "body")) return null;
    const cite = opts.cite || {};
    let destination = "book_workbench";
    let chapter = chapterNumber(args.chapter_number);
    let precise = false;
    let definitionRef = null;
    let roundId = null;
    let chapterState = null;
    const reference = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value) ? value : null;

    if (/^custom_settings_(create|update|remove|restore)_definition$/.test(operation)) {
      destination = "book_custom_settings";
      chapter = null;
      if (["succeeded", "completed"].includes(action.state)) {
        const result = action.result_json || {};
        definitionRef = reference(result.definition_ref) || reference(args.definition_ref);
        precise = !!definitionRef;
      }
    } else if (operation === "chapter_body_update") {
      destination = "chapter_body";
      precise = !!chapter;
    } else if (operation === "tasks_start") {
      if (!opts.taskReady) return null;
      const taskType = args.task_type;
      const result = opts.resultTarget || globalThis.ProseStageCore?.resultTarget(action.result_json, args);
      if (args.prose_draw === true) {
        const round = Action?.proseDrawReceipt(action);
        if (!round) return null;
        destination = "chapter_body";
        chapter = Number(round.chapter_number);
        roundId = round.round_id;
        precise = true;
      } else if (result) {
        destination = result.destination;
        if (['world_state','character_state'].includes(result.kind)) chapterState = result.kind;
        precise = !!chapter;
      } else if (["world_build", "character", "character_create"].includes(taskType)) {
        destination = "book_world";
      } else if (taskType === "story_plan") {
        destination = "book_workbench";
      } else if (taskType === "outline") {
        destination = "book_workbench";
      } else if (taskType === "chapter_draft" && args.execution_mode === "outline_director") {
        destination = "chapter_outline";
        precise = !!chapter;
      } else if (taskType === "chapter_draft" && args.execution_mode === "character_state") {
        destination = "book_world";
      } else if (["chapter_draft", "polish", "post_hoc"].includes(taskType)) {
        destination = "chapter_body";
        precise = !!chapter;
      }
    } else if (["character_create", "character_rename", "character_delete"].includes(operation)) {
      destination = "book_world";
    } else if (operation === "resource_field_update" || operation === "rewrite_start") {
      const resourceType = args.resource_type;
      if (resourceType === "world" || resourceType === "character") {
        destination = "book_world";
      } else if (resourceType === "book") {
        destination = "book_workbench";
      } else if (resourceType === "outline") {
        destination = "book_workbench";
      } else if (resourceType === "chapter") {
        destination = "chapter_outline";
        const guide = typeof cite.parseChapterGuideKey === "function"
          ? cite.parseChapterGuideKey(args.resource_key)
          : null;
        chapter = chapter || (guide && guide.chapter) || null;
        precise = !!chapter;
      }
    } else if (operation === "tasks_cancel") {
      destination = chapter ? "chapter_body" : "book_workbench";
      precise = !!chapter;
    } else if (["cruise_start", "cruise_pause", "cruise_resume", "cruise_stop"].includes(operation)) {
      destination = "book_workbench";
      precise = false;
    }

    if (!allowed(destination)) return null;
    if (["rejected", "failed", "expired", "conflict"].includes(action.state)) precise = false;
    const target = {
      kind: "client_navigation",
      destination,
      precise,
      labelKey: precise ? "asst_view_result" : "asst_view_book"
    };
    if (chapter) target.chapter_number = chapter;
    if (chapterState) target.chapter_state = chapterState;
    if (definitionRef) target.definition_ref = definitionRef;
    if (roundId) target.round_id = roundId;
    return target;
  }

  function navigationSignal(target) {
    if (!target || !isClientDestination(target.destination)) return null;
    const signal = { kind: "client_navigation", destination: target.destination };
    if (target.chapter_number) signal.chapter_number = target.chapter_number;
    if (target.chapter_state) signal.chapter_state = target.chapter_state;
    if (target.definition_ref) signal.definition_ref = target.definition_ref;
    if (target.destination === "chapter_body" && target.round_id) signal.round_id = target.round_id;
    return signal;
  }

  function canNavigateToBook(action, currentBookId) {
    const targetBookId = action && action.book_link_id;
    if (!targetBookId) return false;
    return String(targetBookId) === String(currentBookId || "");
  }

  function cardActions(actions, sessionId, options) {
    const opts = options || {};
    const list = Array.isArray(actions) ? actions : [];
    const lastBody = typeof opts.lastBodyReceipt === "function"
      ? opts.lastBodyReceipt(list, sessionId)
      : null;
    const isBlocking = typeof opts.isActionBlocking === "function"
      ? opts.isActionBlocking
      : function (action) {
        return !!(action && (action.continuation_pending
          || ["pending", "pending_confirmation", "executing", "ambiguous", "unknown"].includes(action.state)));
      };
    return list.filter((action) => {
      if (!action || action.session_id !== sessionId) return false;
      if (["tasks_start", "rewrite_start"].includes(action.operation)) return true;
      if (isActiveSuccess(action, opts)) return false;
      return isBlocking(action) || action === lastBody;
    });
  }

  function compactReceipts(actions, sessionId, options) {
    const cards = cardActions(actions, sessionId, options);
    const cardIds = new Set(cards.map((action) => action && action.id).filter(Boolean));
    const loadedIds = optsLoaded(options);
    return (Array.isArray(actions) ? actions : []).filter((action) => {
      if (!action || action.session_id !== sessionId || cardIds.has(action.id)) return false;
      if (!isTerminalAction(action) && !isActiveSuccess(action, options)) return false;
      if (!action.source_message_id || !loadedIds.has(action.source_message_id)) return false;
      return true;
    });
  }

  function optsLoaded(options) {
    const loaded = options && options.loadedMessageIds;
    if (loaded && typeof loaded.has === "function") return loaded;
    const messages = options && Array.isArray(options.messages) ? options.messages : [];
    return new Set(messages.map((message) => message && message.id).filter(Boolean));
  }

  function receiptsBySource(actions, sessionId, options) {
    const grouped = {};
    compactReceipts(actions, sessionId, options).forEach((action) => {
      const key = action.source_message_id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(action);
    });
    return grouped;
  }

  function placeCards(cards, messages, isBlocking) {
    const loaded = new Set((messages || []).map(message => message.id).filter(Boolean));
    const result = { bySource: {}, earlier: [], pending: [], inline: {} };
    (cards || []).forEach(action => {
      const taskCore = typeof globalThis === "object" && globalThis.AssistantTaskProgressCore;
      const anchor = taskCore && taskCore.isGeneration(action) && taskCore.anchor(action, messages);
      if (anchor) {
        if (!result.inline[anchor.id]) result.inline[anchor.id] = [];
        result.inline[anchor.id].push(action);
      } else if (["tasks_start", "rewrite_start"].includes(action.operation)) {
        // Missing historical presentation: stay on the assistant side, never on a user bubble.
        if (isBlocking(action)) result.pending.push(action);
        else result.earlier.push(action);
      } else if (isBlocking(action)) result.pending.push(action);
      else if (loaded.has(action.source_message_id)) {
        const key = action.source_message_id;
        if (!result.bySource[key]) result.bySource[key] = [];
        result.bySource[key].push(action);
      } else result.earlier.push(action);
    });
    return result;
  }

  function compactPresentation(action, copy, options) {
    const opts = options || {};
    const presentation = typeof opts.present === "function"
      ? opts.present(action, copy)
      : {
        title: copy("asst_action_generic"),
        bookLabel: action && action.book_title
          ? copy("asst_action_book", { title: action.book_title })
          : copy("asst_action_book_unavailable"),
        bookAvailable: !!(action && action.book_title)
      };
    const statusKey = typeof opts.statusKey === "function"
      ? opts.statusKey(action)
      : "asst_succeeded";
    const target = viewTarget(action, opts);
    return {
      title: presentation.title,
      showBook: presentation.showBook !== false,
      bookLabel: presentation.bookLabel,
      bookAvailable: presentation.bookAvailable !== false,
      status: copy(statusKey) + (
        action?.operation === "chapter_bodies_import" && ["failed", "conflict"].includes(action.state)
          && action.result_json?.chapters?.length
          ? " · " + copy("asst_import_saved") + ": "
            + action.result_json.chapters.map(item => String(item.chapter_number)).join(", ")
          : ""
      ),
      viewLabel: target ? copy(target.labelKey) : null,
      target
    };
  }

  return {
    VIEW_DESTINATIONS,
    isClientDestination,
    isTerminalAction,
    viewTarget,
    navigationSignal,
    canNavigateToBook,
    cardActions,
    compactReceipts,
    receiptsBySource,
    placeCards,
    compactPresentation
  };
});
