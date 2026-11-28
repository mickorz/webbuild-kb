(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantActionCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const UNRESOLVED_ACTION_STATES = new Set([
    "pending",
    "pending_confirmation",
    "executing",
    "ambiguous",
    "unknown"
  ]);
  const EXECUTION_MODE_COPY = {
    full: "asst_exec_mode_full",
    world_state: "asst_exec_mode_world_state",
    outline_director: "asst_exec_mode_outline_director",
    character_state: "asst_exec_mode_character_state",
    writer_group: "asst_exec_mode_writer_group"
  };
  const TASK_TITLE_KEYS = {
    world_build: "asst_action_world_build",
    character: "asst_action_character",
    story_plan: "asst_action_story_plan",
    outline: "asst_action_outline",
    chapter_draft: "asst_action_chapter_draft",
    polish: "asst_action_polish",
    post_hoc: "asst_action_post_hoc"
  };
  const FIELD_UPDATE = "resource_field_update";
  const CUSTOM_SETTING_TITLES = Object.fromEntries([
    "create_definition", "update_definition", "remove_definition", "restore_definition",
    "create_entry", "update_entry", "remove_entry", "restore_entry"
  ].map((name) => ["custom_settings_" + name, "asst_custom_" + name]));
  const ASSISTANT_CONTINUE = "assistant_continue";
  const ASSISTANT_CONTINUE_TEXT = "请继续未完成的任务";
  const TASK_CANCEL = "tasks_cancel";
  const CRUISE_START = "cruise_start";
  const CRUISE_PAUSE = "cruise_pause";
  const CRUISE_RESUME = "cruise_resume";
  const CRUISE_STOP = "cruise_stop";
  const CONTROL_OPERATIONS = new Set([
    TASK_CANCEL,
    CRUISE_START,
    CRUISE_PAUSE,
    CRUISE_RESUME,
    CRUISE_STOP
  ]);
  const CRUISE_CONTROL_OPERATIONS = new Set([
    CRUISE_START,
    CRUISE_PAUSE,
    CRUISE_RESUME,
    CRUISE_STOP
  ]);
  const CONTROL_TITLE_KEYS = {
    tasks_cancel: "asst_action_task_cancel",
    cruise_start: "asst_action_cruise_start",
    cruise_pause: "asst_action_cruise_pause",
    cruise_resume: "asst_action_cruise_resume",
    cruise_stop: "asst_action_cruise_stop"
  };
  const CONTROL_NOTE_KEYS = {
    tasks_cancel: ["asst_task_cancel_note", "asst_task_cancel_note_unavailable"],
    cruise_start: ["asst_cruise_start_note", "asst_cruise_start_note_unavailable"],
    cruise_pause: ["asst_cruise_pause_note", "asst_cruise_pause_note_unavailable"],
    cruise_resume: ["asst_cruise_resume_note", "asst_cruise_resume_note_unavailable"],
    cruise_stop: ["asst_cruise_stop_note", "asst_cruise_stop_note_unavailable"]
  };
  const GATEWAY_COPY = {
    checkpoint_approval_pending: "asst_stop_approval_note",
    checkpoint_approval_settling: "asst_stop_approval_settling",
    checkpoint_resume_required: "asst_checkpoint_resume_required",
    checkpoint_resume_blocked: "asst_checkpoint_resume_blocked",
    checkpoint_stopping: "asst_checkpoint_stopping",
    checkpoint_disabled: "asst_checkpoint_disabled",
    checkpoint_binding_pending: "asst_checkpoint_binding_pending",
    checkpoint_context_required: "asst_checkpoint_context_required",
    checkpoint_not_resumable: "asst_checkpoint_not_resumable",
    assistant_version_conflict: "asst_checkpoint_version_conflict",
    checkpoint_fork_unconfirmed: "asst_checkpoint_fork_unconfirmed",
    checkpoint_unavailable: "asst_checkpoint_unavailable",
    input_not_received: "asst_checkpoint_input_missing",
    session_not_found: "asst_checkpoint_session_not_found",
    cruise_targets_changed: "asst_cruise_targets_changed",
    cruise_budget_unavailable: "asst_cruise_budget_unavailable",
    cruise_managed_task: "asst_cruise_managed_task",
    task_dispatch_pending: "asst_task_dispatch_pending",
    assistant_book_context_required: "asst_book_context_required",
    assistant_session_closed: "asst_session_closed",
    assistant_binding_conflict: "asst_binding_conflict",
    assistant_turn_conflict: "asst_turn_conflict",
    assistant_permission_denied: "asst_permission_denied",
    assistant_resource_version_conflict: "asst_field_conflict",
    assistant_resource_not_found: "asst_resource_not_found",
    assistant_tool_arguments_rejected: "asst_tool_arguments_rejected",
    tool_arguments_invalid: "asst_tool_invalid_arguments",
    tool_arguments_repeated: "asst_tool_arguments_repeated",
    tool_recovery_stopped: "asst_tool_recovery_stopped",
    tool_round_limit: "asst_tool_round_limit",
    assistant_action_pending: "asst_action_pending",
    assistant_invocation_conflict: "asst_binding_conflict",
    assistant_invocation_failed: "asst_unavailable",
    assistant_invocation_interrupted: "asst_stream_incomplete",
    assistant_invocation_outcome_unknown: "asst_unknown",
    assistant_invocation_rejected: "asst_unavailable",
    assistant_payload_too_large: "asst_payload_too_large",
    assistant_rate_limited: "asst_rate_limited",
    assistant_provider_quota_exhausted: "asst_provider_quota_exhausted",
    assistant_provider_auth_failed: "asst_provider_configuration",
    assistant_provider_permission_denied: "asst_provider_configuration",
    assistant_provider_bad_request: "asst_provider_bad_request",
    assistant_runtime_timeout: "asst_runtime_timeout",
    assistant_tool_authorization_failed: "asst_tool_authorization_failed",
    assistant_tool_request_timeout: "asst_tool_request_timeout",
    assistant_tool_resolution_conflict: "asst_tool_resolution_conflict",
    assistant_runtime_response_too_large: "asst_response_too_large",
    assistant_runtime_stream_too_large: "asst_response_too_large",
    assistant_runtime_event_too_large: "asst_response_too_large",
    assistant_runtime_unavailable: "asst_unavailable",
    assistant_turn_superseded: "asst_turn_conflict",
    assistant_stream_incomplete: "asst_stream_incomplete",
    cost_policy_drift: "asst_cost_changed",
    insufficient_balance: "asst_insufficient_balance",
    receipt_pending: "asst_receipt_pending",
    call_in_progress: "asst_call_in_progress",
    admission_unavailable: "asst_admission_unavailable",
    assistant_protection_scope: "asst_protection_scope",
    assistant_protection_references: "asst_protection_references",
    assistant_protection_text: "asst_protection_text",
    assistant_protection_unavailable: "asst_protection_unavailable"
  };
  const TERMINAL_INVOCATION_CODES = [
    "assistant_action_pending",
    "assistant_invocation_conflict",
    "assistant_invocation_failed",
    "assistant_invocation_interrupted",
    "assistant_invocation_outcome_unknown",
    "assistant_invocation_rejected",
    "assistant_payload_too_large",
    "assistant_rate_limited",
    "assistant_provider_quota_exhausted",
    "assistant_provider_auth_failed",
    "assistant_provider_permission_denied",
    "assistant_provider_bad_request",
    "assistant_runtime_timeout",
    "assistant_tool_authorization_failed",
    "assistant_tool_request_timeout",
    "assistant_tool_resolution_conflict",
    "assistant_runtime_response_too_large",
    "assistant_runtime_stream_too_large",
    "assistant_runtime_event_too_large",
    "assistant_runtime_unavailable",
    "assistant_turn_superseded"
  ];

  function interpolate(text, values) {
    return Object.entries(values || {}).reduce(
      (result, [name, value]) => result.replaceAll("{" + name + "}", String(value)),
      String(text == null ? "" : text)
    );
  }

  function isPendingAction(action) {
    if (action?.version_current === false) return false;
    return ["pending", "pending_confirmation"].includes(action && action.state || "pending");
  }

  function isUnresolvedAction(action) {
    if (action?.version_current === false) return false;
    return UNRESOLVED_ACTION_STATES.has(action && action.state || "pending");
  }

  function isContinuationPending(action) {
    if (action?.version_current === false) return false;
    return !!(action && action.continuation_pending);
  }

  function isActionBlocking(action) {
    return isUnresolvedAction(action) || isContinuationPending(action);
  }

  function isSessionRunning(session) {
    return !!(session && session.reply_state === "running");
  }

  function canDiscardSession(error) {
    return [404, 410].includes(Number(error && error.status));
  }

  function sessionValue(payload) {
    return payload && payload.session ? payload.session : payload;
  }

  function messagesValue(payload) {
    const session = sessionValue(payload);
    if (session && Array.isArray(session.messages)) return session.messages;
    if (payload && Array.isArray(payload.messages)) return payload.messages;
    return null;
  }

  function actionValue(payload) {
    if (!payload) return null;
    if (payload.pending_action) return payload.pending_action;
    if (payload.action) return payload.action;
    const session = sessionValue(payload);
    const actions = session && Array.isArray(session.actions) ? session.actions : [];
    return actions.length ? actions[actions.length - 1] : null;
  }

  function actionListValue(payload) {
    if (!payload) return null;
    if (payload.session && payload.session.message_page && Array.isArray(payload.session.actions)) {
      return payload.session.actions;
    }
    if (Array.isArray(payload.actions)) return payload.actions;
    if (payload.action) return [payload.action];
    const session = sessionValue(payload);
    if (session && Array.isArray(session.actions)) return session.actions;
    return null;
  }

  function assistantMessage(payload) {
    if (!payload) return null;
    return payload.assistant_message || payload.message || null;
  }

  function actionArguments(action) {
    if (!action) return {};
    if (action.arguments && typeof action.arguments === "object") return action.arguments;
    if (action.arguments_json && typeof action.arguments_json === "object") return action.arguments_json;
    return {};
  }

  function actionOperation(action) {
    const args = actionArguments(action);
    return action.operation || args.operation || action.tool_name || "—";
  }

  function actionHash(action) {
    return String(action && (action.arguments_hash || action.args_hash) || "");
  }

  function actionBookTitle(action) {
    if (!action || action.book_title == null) return null;
    const title = String(action.book_title).trim();
    return title || null;
  }

  function formatCredits(value, inMillis) {
    if (value == null || value === "") return null;
    const raw = Number(value);
    const amount = inMillis ? raw / 1000 : raw;
    if (!Number.isFinite(amount)) return null;
    return Number.isInteger(amount) ? String(amount) : amount.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  }

  function trimmedText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function isAssistantContinue(action) {
    return actionOperation(action) === ASSISTANT_CONTINUE;
  }

  function assistantContinueKey(action) {
    const explicit = String(action && action.idempotency_key || "").trim();
    if (explicit && explicit.length <= 200) return explicit;
    const id = String(action && action.id || "").trim();
    if (!id || id.length > 200) return "";
    return "assistant-continue-" + id;
  }

  function assistantContinueText(action) {
    const args = actionArguments(action);
    const explicit = String(args.submit_text || (action && action.submit_text) || "").trim();
    return explicit || ASSISTANT_CONTINUE_TEXT;
  }

  function normalizeProtectionAction(data) {
    const source = data && data.action && typeof data.action === "object" ? data.action : data;
    if (!source || typeof source !== "object" || source.operation !== ASSISTANT_CONTINUE) return null;
    const sessionId = String(source.session_ref || source.session_id || "").trim();
    const sourceRequest = String(source.source_request_id || "").trim();
    const key = String(source.idempotency_key || "").trim();
    if (!sessionId || !sourceRequest || !key || key.length > 200) return null;
    if (key !== "assistant-protection:" + sessionId + ":" + sourceRequest) return null;
    const explicit = String(source.submit_text || "").trim();
    if (explicit && explicit !== ASSISTANT_CONTINUE_TEXT) return null;
    return {
      id: key,
      session_id: sessionId,
      operation: ASSISTANT_CONTINUE,
      state: "pending_confirmation",
      idempotency_key: key,
      arguments: {
        operation: ASSISTANT_CONTINUE,
        submit_text: ASSISTANT_CONTINUE_TEXT,
        source_request_id: sourceRequest
      },
      turn_protection_credits: source.turn_protection_credits,
      spent_credits: source.spent_credits
    };
  }

  function explicitDecimal(value) {
    if (value == null || value === "") return null;
    const text = String(value).trim();
    if (!/^\d+(\.\d+)?$/.test(text)) return null;
    return text.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "").replace(/^0+(?=\d)/, "") || "0";
  }

  function isControlOperation(operation) {
    return CONTROL_OPERATIONS.has(operation);
  }

  function isCruiseControlOperation(operation) {
    return CRUISE_CONTROL_OPERATIONS.has(operation);
  }

  function actionResult(action) {
    return action && action.result_json && typeof action.result_json === "object"
      ? action.result_json
      : null;
  }

  function isProseDraw(action) {
    const args = actionArguments(action);
    return !!action && actionOperation(action) === "tasks_start" && args.task_type === "chapter_draft" && args.prose_draw === true;
  }

  function proseDrawReceipt(action) {
    const result = actionResult(action), args = actionArguments(action);
    return isProseDraw(action) && result?.kind === "prose_draw"
      && typeof result.round_id === "string" && !!result.round_id.trim() && result.round_id.length <= 128
      && typeof result.status === "string" && !!result.status
      && !!action.book_link_id && String(result.book_link_id) === String(action.book_link_id)
      && Number.isInteger(Number(args.chapter_number)) && Number(args.chapter_number) > 0
      && Number(result.chapter_number) === Number(args.chapter_number) ? result : null;
  }

  function proseDrawQuote(action) {
    const value = isProseDraw(action) && action.presentation?.prose_draw_quote;
    if (!value || !Number.isSafeInteger(value.total_credits_millis) || value.total_credits_millis < 0
      || typeof value.expires_at !== "string" || !Number.isFinite(Date.parse(value.expires_at))) return null;
    return value;
  }

  function startedGenerationTask(action) {
    if (!["tasks_start", "rewrite_start"].includes(actionOperation(action))) return null;
    if (isProseDraw(action)) return null;
    const result = actionResult(action);
    return result && result.id ? result : null;
  }

  function cancelledTaskSummary(action) {
    if (actionOperation(action) !== TASK_CANCEL) return null;
    const result = actionResult(action);
    return result && result.id ? result : null;
  }

  function cruiseControlSession(action) {
    if (!isCruiseControlOperation(actionOperation(action))) return null;
    const result = actionResult(action);
    if (!result) return null;
    if (result.session && typeof result.session === "object") return result.session;
    if (result.id && (result.status || result.targets)) return result;
    return null;
  }

  function firstPresent(...values) {
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (value == null || value === "") continue;
      return value;
    }
    return null;
  }

  function shortTargetId(value) {
    const text = String(value == null ? "" : value).trim();
    if (!text) return null;
    const compact = text.replace(/-/g, "");
    if (compact.length <= 8) return text;
    return compact.slice(0, 8);
  }

  function controlTargetId(action) {
    const args = actionArguments(action);
    const result = actionResult(action) || {};
    const session = cruiseControlSession(action) || {};
    const task = cancelledTaskSummary(action) || {};
    if (actionOperation(action) === TASK_CANCEL) {
      return firstPresent(args.task_id, args.taskId, task.id);
    }
    return firstPresent(args.cruise_id, args.cruiseId, args.session_id, session.id, result.id);
  }

  function millisValue(...values) {
    for (let index = 0; index < values.length; index += 1) {
      const raw = values[index];
      if (raw == null || raw === "") continue;
      const amount = Number(raw);
      if (Number.isFinite(amount) && amount >= 0) return amount;
    }
    return null;
  }

  function remainingBudgetMillis(action) {
    // Portal freezes the verified remaining hold in this existing action field.
    return millisValue(action && action.estimated_cost_millis);
  }

  function chapterRangeText(targets, copy) {
    if (!Array.isArray(targets) || !targets.length) return null;
    const numbers = targets.map(Number).filter((value) => Number.isInteger(value) && value > 0);
    if (!numbers.length) return null;
    const consecutive = numbers.every((value, index) => index === 0 || value === numbers[index - 1] + 1);
    if (numbers.length === 1) return copy("asst_chapter_one", { chapter: numbers[0] });
    if (consecutive) {
      return copy("asst_chapter_range", { start: numbers[0], end: numbers[numbers.length - 1] });
    }
    return copy("asst_chapter_list", { chapters: numbers.join(" · ") });
  }

  function controlMetadata(action, copy) {
    const proposed = actionArguments(action);
    const target = action.control_target;
    const expectedId = controlTargetId(action);
    const args = target && String(target.id || "") === String(expectedId || "")
      ? target : actionOperation(action) === CRUISE_START ? proposed : {};
    const metadata = [];
    const range = chapterRangeText(args.targets, copy);
    if (range) metadata.push(range);
    if (["muti", "multi"].includes(args.writer_type)) metadata.push(copy("wr_muti"));
    if (args.writer_type === "single") metadata.push(copy("wr_single"));
    if (args.polish === true) metadata.push(copy("asst_polish_on"));
    if (args.polish === false) metadata.push(copy("asst_polish_off"));
    if (actionOperation(action) === TASK_CANCEL) {
      const taskTitle = TASK_TITLE_KEYS[args.task_type];
      if (taskTitle) metadata.push(copy(taskTitle, { chapter: args.chapter_number, volume: args.volume_number }));
      else if (args.chapter_number) metadata.push(copy("asst_chapter_one", { chapter: args.chapter_number }));
    }
    return metadata;
  }

  function controlFacts(action, copy) {
    const facts = actionFacts(action, copy);
    const operation = actionOperation(action);
    const targetId = shortTargetId(controlTargetId(action));
    if (targetId) {
      facts.unshift({
        key: "target_id",
        label: copy(operation === TASK_CANCEL ? "asst_task_id_label" : "asst_cruise_id_label"),
        text: copy(operation === TASK_CANCEL ? "asst_task_id" : "asst_cruise_id", { id: targetId })
      });
    } else if (operation !== CRUISE_START) {
      facts.unshift({
        key: "target_id",
        label: copy(operation === TASK_CANCEL ? "asst_task_id_label" : "asst_cruise_id_label"),
        text: copy("asst_target_id_unavailable")
      });
    }
    return facts;
  }

  function actionCostPresentation(action, copy) {
    const operation = actionOperation(action);
    if (isProseDraw(action)) {
      const quote = proseDrawQuote(action);
      const offer = quote?.prose_draw_promotion;
      return { kind: "estimate", label: copy("asst_draw_total"), prefix: copy("asst_draw_round"),
        amount: quote ? formatCredits(quote.total_credits_millis, true) : null,
        text: quote ? null : copy("asst_no_estimate_short"), requiresEstimate: true,
        promotion: !!(quote && offer?.applied === true && Number.isSafeInteger(offer.daily_limit) && offer.daily_limit > 0
          && Number.isSafeInteger(offer.used_today) && offer.used_today >= 0 && offer.used_today < offer.daily_limit
          && Date.parse(offer.resets_at) > Date.now() && !confirmationExpired(action) && Date.parse(quote.expires_at) > Date.now()) };
    }
    if (operation === CRUISE_RESUME) {
      const remaining = remainingBudgetMillis(action);
      return {
        kind: "remaining",
        label: copy("asst_remaining_budget"),
        amount: remaining == null ? null : formatCredits(remaining, true),
        text: remaining == null ? copy("asst_remaining_budget_unknown") : null,
        requiresEstimate: true
      };
    }
    const risk = action.risk || action.kind;
    if (risk !== "spend") return { kind: "none", requiresEstimate: false };
    const estimatedMillis = action.estimated_cost_millis != null
      ? action.estimated_cost_millis
      : action.estimated_credits_millis;
    const amount = estimatedMillis != null
      ? formatCredits(estimatedMillis, true)
      : formatCredits(action.estimated_credits, false);
    return {
      kind: "estimate",
      label: copy("asst_estimate"),
      amount,
      text: amount == null ? copy("asst_no_estimate_short") : null,
      requiresEstimate: true
    };
  }

  function actionFacts(action, copy) {
    const args = actionArguments(action);
    const facts = [];
    if (actionOperation(action) === "chapter_bodies_import") {
      facts.push({ key: "import_source", label: copy("asst_import_source"),
        text: String(action.presentation?.source_file_name || args.file_id || "") });
      for (const item of Array.isArray(args.chapters) ? args.chapters : []) {
        facts.push({ key: "import_" + item.chapter_number,
          label: copy("asst_import_chapter", { chapter: item.chapter_number, title: item.title || "" }),
          text: copy("asst_import_lines", { start: item.start_line, end: item.end_line })
            + " · " + copy("asst_import_mode_" + item.mode) });
      }
      const saved = (actionResult(action) || {}).chapters;
      if (Array.isArray(saved) && saved.length) facts.push({ key: "import_saved",
        label: copy("asst_import_saved"), text: saved.map(item => String(item.chapter_number)).join(", ") });
    }
    const intent = trimmedText(args.human_intent);
    if (intent) facts.push({ key: "human_intent", label: copy("asst_human_intent"), text: intent });
    const modeKey = EXECUTION_MODE_COPY[args.execution_mode];
    if (modeKey && actionOperation(action) !== "tasks_start") {
      facts.push({
        key: "execution_mode",
        label: copy("asst_execution_mode"),
        text: copy(modeKey)
      });
    }
    const reason = trimmedText(args.reason);
    if (reason) facts.push({ key: "reason", label: copy("asst_change_reason"), text: reason });
    return facts;
  }

  function citeHelpers() {
    return (typeof window !== "undefined" && window.AssistantCiteCore) || {};
  }

  function creationHelpers() {
    return (typeof globalThis !== "undefined" && globalThis.AssistantCreationCore) || {};
  }

  function fieldUpdateTitle(args) {
    const resourceType = args && args.resource_type;
    if (resourceType === "character") return { key: "asst_action_character_field" };
    if (resourceType === "book") return { key: "asst_action_story_plan_field" };
    const Cite = citeHelpers();
    if (resourceType === "outline") {
      const outline = Cite.parseOutlineKey ? Cite.parseOutlineKey(args.resource_key) : null;
      if (outline && outline.kind === "near_term") {
        return { key: "asst_action_near_term_field", volume: outline.volume };
      }
      return { key: "asst_action_volume_outline_field", volume: outline && outline.volume };
    }
    if (resourceType === "chapter") {
      const guide = Cite.parseChapterGuideKey ? Cite.parseChapterGuideKey(args.resource_key) : null;
      return { key: "asst_action_chapter_guide_field", chapter: guide && guide.chapter };
    }
    return { key: "asst_action_world_field" };
  }

  function protectionFacts(action, copy) {
    const args = actionArguments(action);
    const protection = explicitDecimal(firstPresent(args.turn_protection_credits, action && action.turn_protection_credits));
    const spent = explicitDecimal(firstPresent(args.spent_credits, action && action.spent_credits));
    return [
      {
        key: "turn_protection",
        label: copy("asst_turn_protection"),
        text: protection == null ? copy("asst_value_unknown") : protection
      },
      {
        key: "turn_spent",
        label: copy("asst_turn_spent"),
        text: spent == null ? copy("asst_value_unknown") : spent
      }
    ];
  }

  function actionPresentation(action, copy) {
    const args = actionArguments(action);
    const operation = actionOperation(action);
    if (operation === ASSISTANT_CONTINUE) {
      return {
        title: copy("asst_action_continue"),
        metadata: [],
        facts: protectionFacts(action, copy),
        bookTitle: null,
        bookAvailable: false,
        bookLabel: "",
        showBook: false,
        note: copy("asst_continue_note"),
        cost: { kind: "none", requiresEstimate: false },
        confirmLabel: copy("asst_continue"),
        rejectLabel: copy("asst_continue_decline"),
        resumeLabel: copy("asst_resume_reply"),
        continuation: false
      };
    }
    const fieldTitle = operation === FIELD_UPDATE ? fieldUpdateTitle(args) : null;
    const customTitleKey = CUSTOM_SETTING_TITLES[operation];
    const controlTitleKey = CONTROL_TITLE_KEYS[operation];
    const draw = isProseDraw(action);
    const chapterResult = operation === 'tasks_start' && globalThis.ProseStageCore?.resultTarget(action.result_json, args);
    const chapterScope = operation === "tasks_start" && args.task_type === "chapter_draft" && args.chapter_scope;
    const chapterTitleKey = chapterScope === "world_state_outline"
      ? (args.execution_mode === "world_state" ? "asst_action_chapter_world_outline" : "asst_action_chapter_guide")
      : chapterScope === "prose" ? (draw ? "asst_action_chapter_character_draw" : "asst_action_chapter_character_prose")
      : chapterScope === "rewrite_prose" ? (draw ? "asst_action_chapter_redraw" : "asst_action_chapter_rewrite")
      : chapterScope === "full" && !draw ? "asst_action_chapter_full" : null;
    const titleKey = operation === "chapter_bodies_import" ? "asst_action_body_import" : chapterTitleKey || (draw ? "asst_action_prose_draw" : operation === "chapter_body_update"
      ? "asst_action_chapter_update"
      : fieldTitle
        ? fieldTitle.key
        : customTitleKey || controlTitleKey || chapterResult?.titleKey || TASK_TITLE_KEYS[args.task_type] || "asst_action_generic");
    const metadata = isControlOperation(operation) ? controlMetadata(action, copy) : [];
    if (!isControlOperation(operation)) {
      const wordRange = typeof args.target_word_count === "string"
        && /^(?:[1-9][0-9]{2,4}|100000)-(?:[1-9][0-9]{2,4}|100000)$/.test(args.target_word_count)
        && Number(args.target_word_count.split("-")[0]) <= Number(args.target_word_count.split("-")[1]);
      const targetWords = Number(args.target_word_count);
      const writesProse = ["prose", "rewrite_prose", "full"].includes(chapterScope);
      if (writesProse && !draw) metadata.push(copy(args.writer_type === "muti" ? "asst_chapter_multi_writer" : "asst_chapter_single_writer"));
      if ((writesProse || !chapterResult || chapterResult.kind === 'body') && (wordRange || (Number.isFinite(targetWords) && targetWords > 0))) {
        metadata.push(copy("asst_about_words", {
          count: wordRange ? args.target_word_count : targetWords.toLocaleString()
        }));
      }
    }
    const bookTitle = actionBookTitle(action);
    const bookAvailable = !!bookTitle;
    const chapter = fieldTitle && fieldTitle.chapter != null ? fieldTitle.chapter : args.chapter_number;
    const volume = fieldTitle && fieldTitle.volume != null ? fieldTitle.volume : args.volume_number;
    const noteValues = { title: bookTitle || "", chapter: chapter, volume: volume };
    const controlNotes = CONTROL_NOTE_KEYS[operation];
    let note;
    if (operation === "chapter_bodies_import") {
      note = copy("asst_import_note");
    } else if (chapterScope === "full") {
      note = copy(draw ? "asst_chapter_full_draw_note" : "asst_chapter_full_note");
    } else if (draw) {
      note = copy("asst_draw_note");
    } else if (customTitleKey) {
      note = copy(operation.includes("_remove_") ? "asst_custom_remove_note" : "asst_custom_save_note");
    } else if (controlNotes) {
      note = copy(bookAvailable ? controlNotes[0] : controlNotes[1], noteValues);
    } else if (operation === "chapter_body_update") {
      note = copy(bookAvailable ? "asst_update_note" : "asst_update_note_unavailable", noteValues);
    } else if (operation === FIELD_UPDATE) {
      note = copy(bookAvailable ? "asst_field_note" : "asst_field_note_unavailable", noteValues);
    } else if (operation === "tasks_start") {
      note = "";
    } else {
      note = copy(bookAvailable ? "asst_generate_note" : "asst_generate_note_unavailable", noteValues);
    }
    const cost = actionCostPresentation(action, copy);
    const creation = creationHelpers().presentation?.(action, typeof window !== "undefined" && window.CLANG === "en");
    return {
      title: copy(titleKey, { chapter: chapter, volume: volume }),
      metadata,
      facts: isControlOperation(operation) ? controlFacts(action, copy) : actionFacts(action, copy),
      bookTitle,
      bookAvailable,
      bookLabel: bookAvailable
        ? copy("asst_action_book", { title: bookTitle })
        : copy("asst_action_book_unavailable"),
      note,
      cost,
      confirmLabel: copy(
        (draw ? "asst_confirm_draw" : null)
        || (customTitleKey ? operation.includes("_remove_") ? "asst_custom_confirm_remove" : "asst_custom_confirm_save" : null)
        || controlTitleKey
        || (operation === "chapter_bodies_import" ? "asst_confirm_import" : operation === "chapter_body_update" || operation === FIELD_UPDATE
          ? "asst_confirm_update"
          : "asst_confirm_generate")
      ),
      rejectLabel: copy("asst_reject"),
      resumeLabel: copy("asst_resume_reply"),
      continuation: isContinuationPending(action),
      ...(creation || {}),
      ...(creation ? { facts: creation.facts.concat(actionFacts(action, copy)) } : {})
    };
  }

  function successCopyKey(action) {
    if (!action || !["succeeded", "completed"].includes(action.state)) return null;
    const operation = actionOperation(action);
    const result = actionResult(action) || {};
    const task = cancelledTaskSummary(action) || {};
    if (operation === ASSISTANT_CONTINUE) return "asst_continue_sent";
    if (operation === "chapter_bodies_import") return "asst_import_done";
    if (operation === "chapter_body_update") return "asst_saved";
    if (operation === FIELD_UPDATE) return "asst_field_saved";
    if (["books_create", "books_update", "character_create", "character_rename"].includes(operation)) return "asst_field_saved";
    if (operation === "character_delete") return "asst_custom_removed";
    if (operation === "rewrite_start") return "asst_task_submitted";
    if (CUSTOM_SETTING_TITLES[operation]) return operation.includes("_remove_") ? "asst_custom_removed" : "asst_custom_saved";
    if (operation === "tasks_start") return "asst_task_submitted";
    if (operation === CRUISE_START) return "asst_cruise_started";
    if (operation === CRUISE_PAUSE) return "asst_cruise_paused";
    if (operation === CRUISE_RESUME) return "asst_cruise_resumed";
    if (operation === CRUISE_STOP) {
      return result.cancellation_pending ? "asst_cruise_stop_pending" : "asst_cruise_stopped";
    }
    if (operation === TASK_CANCEL) {
      const status = String(task.status || result.status || "").toLowerCase();
      if (["completed", "failed"].includes(status)) return "asst_task_already_ended";
      if (["cancelling", "canceling"].includes(status)) return "asst_task_cancelling";
      if (["cancelled", "canceled"].includes(status)) return "asst_task_cancelled";
      if (!status) return "asst_task_cancel_unknown";
      return "asst_task_cancel_unknown";
    }
    return "asst_succeeded";
  }

  function actionStateCopyKey(action) {
    const success = successCopyKey(action);
    if (success) return success;
    if (action && action.error_code === "revision_requested") return "asst_revision_requested";
    if (action && action.error_code === "prerequisite_missing") return "asst_prerequisite_missing";
    if (action && action.error_code === "book_data_pin_active") return "asst_book_generation_active";
    if (action && action.error_code === "cost_policy_drift") return "asst_cost_changed";
    if (action && GATEWAY_COPY[action.error_code]) return GATEWAY_COPY[action.error_code];
    return {
      rejected: "asst_rejected", expired: "asst_expired", conflict: "asst_conflict",
      failed: "asst_failed", ambiguous: "asst_unknown", unknown: "asst_unknown"
    }[action && action.state] || "asst_executing";
  }

  function confirmationExpiresAt(action, review, approvalExpiresAt) {
    const times = [action && action.expires_at, review && review.expires_at, approvalExpiresAt,
      isProseDraw(action) && action.presentation?.prose_draw_quote?.expires_at,
      isProseDraw(action) && action.presentation?.prose_draw_quote?.prose_draw_promotion?.applied === true
        && action.presentation.prose_draw_quote.prose_draw_promotion.resets_at]
      .map(value => typeof value === "number" && Number.isFinite(value) ? value * 1000
        : typeof value === "string" && value ? Date.parse(value) : NaN)
      .filter(Number.isFinite);
    return times.length ? Math.min(...times) : null;
  }

  function confirmationExpired(action, review, approvalExpiresAt, now = Date.now()) {
    if (!action || isContinuationPending(action)) return false;
    if (action.state === "expired") return true;
    if (!["pending", "pending_confirmation"].includes(action.state || "pending_confirmation")) return false;
    const deadline = confirmationExpiresAt(action, review, approvalExpiresAt);
    return !!(review && review.status === "expired") || (deadline != null && deadline <= now);
  }

  function capabilityState(payload) {
    if (payload && payload.enabled === false) return "disabled";
    const value = payload && payload.runtime ? payload.runtime : payload || {};
    const status = String(value.status || value.runtime_status || "").toLowerCase();
    if (status === "configured") return "configured";
    if (status === "unconfigured" || value.configured === false) return "unconfigured";
    return "unavailable";
  }

  function messageText(error, copy) {
    const status = Number(error && error.status);
    const detail = error && error.body && error.body.detail;
    const detailState = detail && typeof detail === "object"
      ? String(detail.state || "").toLowerCase()
      : "";
    const detailCode = detail && typeof detail === "object"
      ? String(detail.code || "")
      : "";
    const errorCode = error && error.code ? String(error.code) : "";
    const hasCopy = key => Object.prototype.hasOwnProperty.call(GATEWAY_COPY, key);
    const code = hasCopy(detailCode) ? detailCode : errorCode;
    if (
      code === "assistant_stream_incomplete"
      || (error && error.message === "Assistant stream ended before completion")
    ) {
      return copy("asst_stream_incomplete");
    }
    if (hasCopy(code)) return copy(GATEWAY_COPY[code]);
    if (status === 409 && detailState === "executing") return copy("asst_recovery_wait");
    if (status === 409 && detailState === "expired") return copy("asst_expired");
    if (status === 409 && detailState === "conflict") return copy("asst_conflict");
    if (status === 409 && detail && typeof detail === "object" && !code && !detailState) return copy("asst_conflict");
    return copy("asst_unavailable");
  }

  function terminalInvocationError(error) {
    const detail = error && error.body && error.body.detail;
    const code = detail && typeof detail === "object" ? String(detail.code || "") : "";
    return TERMINAL_INVOCATION_CODES.includes(code);
  }

  function createAssistantTargetRefresher(options) {
    const opts = options || {};
    const matches = (bookId) => {
      const identity = typeof opts.getIdentity === "function" ? opts.getIdentity() : null;
      return !!(
        identity
        && (identity.view === "book" || identity.view === "create")
        && identity.bookId
        && bookId
        && String(identity.bookId) === String(bookId)
      );
    };
    return async function refreshAssistantTarget(action) {
      const operation = actionOperation(action);
      if (["books_create", "books_update"].includes(operation) && typeof opts.refreshShelf === "function") {
        const applied = await opts.refreshShelf();
        if (applied && typeof opts.onApplied === "function") opts.onApplied();
        return { refreshed: !!applied, reason: "shelf_updated" };
      }
      const targetBookId = action && action.book_link_id;
      if (!targetBookId) return { refreshed: false, reason: "missing_target" };
      const args = actionArguments(action);
      if (isProseDraw(action)) {
        const round = proseDrawReceipt(action);
        if (round && typeof opts.onDrawStarted === "function") opts.onDrawStarted(action, round);
        return { refreshed: false, reason: round ? "draw_submitted" : "draw_unconfirmed" };
      }
      const startedTask = startedGenerationTask(action);
      if (startedTask && typeof opts.rememberTask === "function") opts.rememberTask(startedTask);
      if (startedTask && typeof opts.onTaskStarted === "function") opts.onTaskStarted(action, startedTask);
      if (operation === "rewrite_start") return { refreshed: false, reason: "task_submitted" };
      const stillCurrent = () => matches(targetBookId);
      if (["character_create", "character_rename", "character_delete"].includes(operation)) {
        const applied = typeof opts.refreshCharacters === "function" && await opts.refreshCharacters(targetBookId, stillCurrent);
        return { refreshed: !!applied, bookId: targetBookId };
      }
      if (!matches(targetBookId)) return { refreshed: false, reason: "page_mismatch" };
      if (CUSTOM_SETTING_TITLES[operation]) {
        const applied = typeof opts.refreshCustomSettings === "function"
          && await opts.refreshCustomSettings(action, stillCurrent);
        return applied && stillCurrent() ? { refreshed: true, bookId: targetBookId }
          : { refreshed: false, reason: "custom_settings_saved" };
      }
      if (isControlOperation(operation)) {
        let applied = false;
        if (operation === TASK_CANCEL) {
          const task = cancelledTaskSummary(action);
          if (task && typeof opts.refreshTask === "function") {
            applied = await opts.refreshTask(targetBookId, task, stillCurrent);
          } else if (task && typeof opts.rememberTask === "function") {
            opts.rememberTask(task);
            applied = true;
          }
        } else if (typeof opts.refreshCruise === "function") {
          const session = cruiseControlSession(action);
          if (session) {
            applied = await opts.refreshCruise(targetBookId, session, stillCurrent);
          }
        }
        if (applied === false) return { refreshed: false, reason: "page_changed" };
        if (!matches(targetBookId)) return { refreshed: false, reason: "page_changed" };
        return { refreshed: true, bookId: targetBookId };
      }
      const chapterNumber = Number(args.chapter_number || 0);
      if (operation === FIELD_UPDATE && typeof opts.refreshResource === "function") {
        const applied = await opts.refreshResource(targetBookId, {
          resource_type: args.resource_type,
          resource_key: args.resource_key,
          path: args.path
        }, stillCurrent);
        if (applied === false) return { refreshed: false, reason: "page_changed" };
      } else if (typeof opts.refreshBook === "function") {
        const applied = await opts.refreshBook(targetBookId, stillCurrent);
        if (applied === false) return { refreshed: false, reason: "page_changed" };
      } else if (chapterNumber && typeof opts.refreshChapter === "function") {
        await opts.refreshChapter(targetBookId, chapterNumber);
      } else if (typeof opts.selectBook === "function") {
        await opts.selectBook(targetBookId);
      }
      if (!matches(targetBookId)) return { refreshed: false, reason: "page_changed" };
      if (typeof opts.onApplied === "function") opts.onApplied();
      return { refreshed: true, bookId: targetBookId };
    };
  }

  return {
    UNRESOLVED_ACTION_STATES,
    interpolate,
    isPendingAction,
    isUnresolvedAction,
    isContinuationPending,
    isActionBlocking,
    isSessionRunning,
    canDiscardSession,
    sessionValue,
    messagesValue,
    actionValue,
    actionListValue,
    assistantMessage,
    actionArguments,
    ASSISTANT_CONTINUE,
    ASSISTANT_CONTINUE_TEXT,
    actionOperation,
    isAssistantContinue,
    assistantContinueKey,
    assistantContinueText,
    normalizeProtectionAction,
    actionHash,
    actionBookTitle,
    formatCredits,
    actionFacts,
    actionPresentation,
    remainingBudgetMillis,
    shortTargetId,
    isControlOperation,
    isCruiseControlOperation,
    isProseDraw,
    proseDrawReceipt,
    proseDrawQuote,
    startedGenerationTask,
    cancelledTaskSummary,
    cruiseControlSession,
    successCopyKey,
    actionStateCopyKey,
    confirmationExpiresAt,
    confirmationExpired,
    capabilityState,
    messageText,
    terminalInvocationError,
    createAssistantTargetRefresher
  };
});
