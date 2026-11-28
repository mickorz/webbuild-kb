(function (root, factory) {
  "use strict";
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LF_BOOK_DATA_VOLUME = api;
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (root) {
  var UNIT_TOKENS = 1000;
  var MODES = { off: true, shadow: true, enforce: true };
  var TIER_ORDER = ["standard", "extended", "large", "extra_large", "unsupported"];
  var TIER_BOUNDS = [
    { key: "standard", upper: 32000, multiplier: 1 },
    { key: "extended", upper: 64000, multiplier: 2 },
    { key: "large", upper: 128000, multiplier: 4 },
    { key: "extra_large", upper: 256000, multiplier: 8 },
    { key: "unsupported", upper: null, multiplier: null }
  ];
  var STALE_CODES = {
    quote_stale: true,
    quote_expired: true,
    quote_mismatch: true,
    stale_quote: true,
    book_data_quote_stale: true,
    book_data_quote_expired: true,
    book_data_quote_mismatch: true
  };
  var COMPONENT_KEYS = {
    world: "bdv_comp_world",
    characters: "bdv_comp_characters",
    custom_settings: "bdv_comp_custom_settings",
    story_plan_and_style: "bdv_comp_story",
    story_plan: "bdv_comp_story",
    style: "bdv_comp_story",
    outline: "bdv_comp_outline",
    outlines: "bdv_comp_outline"
  };
  var QUOTE_REQUEST_KEYS = [
    "task_type",
    "writer_type",
    "execution_mode",
    "composite_action",
    "chapter_chain",
    "targets",
    "count",
    "polish",
    "prose_draw"
  ];
  var DEFAULT_COPY = {
    zh: {
      bdv_usage: "设定用量",
      bdv_next_tier: "下一档 · {tier}",
      bdv_range_limit: "支持上限",
      bdv_range_value: "{amount}k 标准 Token，区间 {lower}k–{upper}k",
      bdv_details: "构成",
      bdv_unknown: "暂不可用",
      bdv_credits: "笔力",
      bdv_quote_title: "确认笔力消耗",
      bdv_reminder_message: "本书当前按 {multiplier} 倍消耗笔力，是否继续？",
      bdv_remember: "此倍率不再提醒",
      bdv_pricing: "笔力定价",
      bdv_multiplier_label: "消耗倍率 {multiplier}",
      bdv_quote_confirm: "开始",
      bdv_quote_cancel: "取消",
      bdv_unsupported: "超出支持范围",
      bdv_unsupported_note: "可继续阅读、导出或删减设定",
      bdv_tier_standard: "标准",
      bdv_tier_extended: "扩展",
      bdv_tier_large: "大型",
      bdv_tier_extra_large: "超大型",
      bdv_tier_unsupported: "超出支持范围",
      bdv_comp_world: "世界观",
      bdv_comp_characters: "角色",
      bdv_comp_custom_settings: "自定义设定",
      bdv_comp_story: "规划与风格",
      bdv_comp_outline: "大纲"
    },
    en: {
      bdv_usage: "Settings volume",
      bdv_next_tier: "Next · {tier}",
      bdv_range_limit: "Supported limit",
      bdv_range_value: "{amount}k standard tokens, range {lower}k–{upper}k",
      bdv_details: "Breakdown",
      bdv_unknown: "Unavailable",
      bdv_credits: "credits",
      bdv_quote_title: "Confirm credit usage",
      bdv_reminder_message: "This book currently uses {multiplier}× credits. Continue?",
      bdv_remember: "Do not remind me at this multiplier",
      bdv_pricing: "Credit pricing",
      bdv_multiplier_label: "Credit multiplier {multiplier}",
      bdv_quote_confirm: "Start",
      bdv_quote_cancel: "Cancel",
      bdv_unsupported: "Beyond supported range",
      bdv_unsupported_note: "Reading, export, and reduction remain available",
      bdv_tier_standard: "Standard",
      bdv_tier_extended: "Extended",
      bdv_tier_large: "Large",
      bdv_tier_extra_large: "Extra large",
      bdv_tier_unsupported: "Beyond supported range",
      bdv_comp_world: "World",
      bdv_comp_characters: "Characters",
      bdv_comp_custom_settings: "Custom settings",
      bdv_comp_story: "Plan and style",
      bdv_comp_outline: "Outline"
    }
  };

  var confirmer = null;

  function langOf() {
    return root && root.CLANG === "en" ? "en" : "zh";
  }

  function defaultCopy(key, values) {
    var table = DEFAULT_COPY[langOf()] || DEFAULT_COPY.zh;
    var text = table[key] || (DEFAULT_COPY.zh[key] || key);
    if (!values) return text;
    return String(text).replace(/\{(\w+)\}/g, function (_, name) {
      return values[name] == null ? "" : String(values[name]);
    });
  }

  function copyOf(copy) {
    return typeof copy === "function" ? copy : defaultCopy;
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function firstPresent() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];
      if (value == null || value === "") continue;
      return value;
    }
    return null;
  }

  function asNonnegInt(value) {
    if (value == null || value === "") return null;
    var n = Number(value);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n);
  }

  function asPositiveNumber(value) {
    if (value == null || value === "") return null;
    var n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  function parseMode(value) {
    var mode = String(value || "").toLowerCase();
    return MODES[mode] ? mode : null;
  }

  function detailCode(error) {
    if (!error) return "";
    if (error.code) return String(error.code);
    var body = error.body;
    var detail = body && body.detail;
    if (isObject(detail) && detail.code) return String(detail.code);
    if (typeof detail === "string") return detail;
    if (typeof error.detail === "string") return error.detail;
    return "";
  }

  function isStaleQuoteError(error) {
    var code = String(detailCode(error) || "").toLowerCase();
    if (STALE_CODES[code]) return true;
    if (error && error.status === 409 && /quote.*(stale|expir|mismatch)|stale.*quote/.test(code)) return true;
    var text = String((error && (error.message || error.detail)) || "").toLowerCase();
    return /quote.*(stale|expir|mismatch)|报价(过期|失效|已变化)/.test(text);
  }

  function updatedQuoteFromError(error) {
    var body = error && error.body;
    var detail = body && body.detail;
    if (isObject(detail) && isObject(detail.updated_quote)) return parseTaskQuote(detail.updated_quote);
    if (isObject(body) && isObject(body.updated_quote)) return parseTaskQuote(body.updated_quote);
    if (error && isObject(error.updated_quote)) return parseTaskQuote(error.updated_quote);
    return null;
  }

  function isQuoteMissingError(error) {
    if (!error) return false;
    if (error.status === 404) return true;
    var code = String(detailCode(error) || "").toLowerCase();
    return code === "not_found" || code === "quote_unavailable";
  }

  function formatCreditsMillis(millis) {
    var amount = asNonnegInt(millis);
    if (amount == null) return null;
    var credits = amount / 1000;
    if (Number.isInteger(credits)) return String(credits);
    return credits.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  }

  function formatUsageUnits(tokens) {
    var amount = asNonnegInt(tokens);
    if (amount == null) return null;
    var units = amount / UNIT_TOKENS;
    if (Number.isInteger(units)) return String(units);
    return units.toFixed(1).replace(/\.0$/, "");
  }

  function inferTierKey(billableTokens) {
    var amount = asNonnegInt(billableTokens);
    if (amount == null) return null;
    for (var i = 0; i < TIER_BOUNDS.length; i += 1) {
      var bound = TIER_BOUNDS[i];
      if (bound.upper == null || amount <= bound.upper) return bound.key;
    }
    return "unsupported";
  }

  function parseTier(raw, billableTokens) {
    var source = isObject(raw) ? raw : {};
    var key = String(firstPresent(source.key, source.tier, source.id, typeof raw === "string" ? raw : "") || "").toLowerCase();
    if (!key && billableTokens != null) key = inferTierKey(billableTokens) || "";
    if (!key) return null;
    var known = TIER_ORDER.indexOf(key) !== -1;
    var bound = TIER_BOUNDS.filter(function (item) { return item.key === key; })[0];
    var multiplier = asPositiveNumber(firstPresent(source.multiplier, bound && bound.multiplier));
    return {
      key: key,
      labelKey: known ? ("bdv_tier_" + key) : null,
      label: firstPresent(source.label, source.name) || null,
      multiplier: multiplier,
      upperBound: asNonnegInt(firstPresent(source.upper_bound, source.upperBound, bound && bound.upper)),
      known: known
    };
  }

  function parseComponents(raw) {
    if (!isObject(raw)) return [];
    return Object.keys(raw).map(function (name) {
      var tokens = asNonnegInt(raw[name]);
      return {
        key: name,
        labelKey: COMPONENT_KEYS[name] || null,
        tokens: tokens,
        units: formatUsageUnits(tokens)
      };
    }).filter(function (item) { return item.tokens != null; });
  }

  function unknownUsage(raw) {
    raw = raw || {};
    return {
      unknown: true,
      available: false,
      bookId: raw.book_id != null ? String(raw.book_id) : null,
      status: raw.status != null ? String(raw.status) : "unavailable",
      billingMode: parseMode(raw.billing_mode) || parseMode(raw.mode),
      billableTokens: null,
      rawTokens: null,
      units: null,
      tier: null,
      components: [],
      nextThreshold: null,
      previewSupported: raw.preview_supported === true,
      crossingPreview: null,
      enforcementReady: raw.enforcement_ready === true
    };
  }

  function parseThreshold(raw) {
    if (raw == null || raw === "") return null;
    if (typeof raw === "number" || typeof raw === "string") {
      var scalar = asNonnegInt(raw);
      if (scalar == null) return null;
      return { tokens: scalar, units: formatUsageUnits(scalar), tier: null };
    }
    if (!isObject(raw)) return null;
    var tokens = asNonnegInt(firstPresent(raw.billable_tokens, raw.tokens, raw.upper_bound));
    var tier = parseTier(firstPresent(raw.tier, raw), tokens);
    if (!tier && tokens == null) return null;
    return { tokens: tokens, units: formatUsageUnits(tokens), tier: tier };
  }

  function parseDataUsage(raw) {
    if (!isObject(raw)) return unknownUsage();
    var status = String(raw.status || "").toLowerCase();
    var billingMode = parseMode(raw.billing_mode) || parseMode(raw.mode);
    if (status === "unknown" || status === "engine_book_missing") return unknownUsage(raw);
    if (status && status !== "ready" && status !== "unsupported") return unknownUsage(raw);
    var billable = asNonnegInt(raw.billable_tokens);
    if (billable == null) return unknownUsage(raw);
    return {
      unknown: false,
      available: true,
      bookId: raw.book_id != null ? String(raw.book_id) : null,
      status: status || "ready",
      billingMode: billingMode,
      meterVersion: raw.meter_version != null ? String(raw.meter_version) : null,
      contentRevision: raw.content_revision != null ? String(raw.content_revision) : null,
      billableTokens: billable,
      rawTokens: asNonnegInt(raw.raw_tokens),
      units: formatUsageUnits(billable),
      tier: parseTier(raw.tier, billable),
      components: parseComponents(raw.components),
      nextThreshold: parseThreshold(raw.next_threshold),
      previewSupported: raw.preview_supported === true,
      crossingPreview: null,
      preview: raw.preview === true,
      enforcementReady: raw.enforcement_ready !== false
    };
  }

  function parseProseDrawPromotion(raw) {
    if (!isObject(raw) || typeof raw.applied !== "boolean"
      || !Number.isSafeInteger(raw.daily_limit) || raw.daily_limit < 1
      || !Number.isSafeInteger(raw.used_today) || raw.used_today < 0
      || typeof raw.resets_at !== "string"
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|\+00:00)$/.test(raw.resets_at)
      || !Number.isFinite(Date.parse(raw.resets_at))) return null;
    return { applied: raw.applied, dailyLimit: raw.daily_limit,
      usedToday: raw.used_today, resetsAt: raw.resets_at };
  }

  function parseTaskQuote(raw) {
    if (!isObject(raw)) return { available: false, unknown: true };
    var token = firstPresent(raw.quote_token, raw.quoteToken);
    var mode = parseMode(raw.billing_mode) || parseMode(raw.mode);
    var base = asNonnegInt(firstPresent(raw.base_credits_millis, raw.baseCreditsMillis));
    var finalMillis = asNonnegInt(firstPresent(raw.final_credits_millis, raw.finalCreditsMillis, raw.credits_millis));
    var candidate = asNonnegInt(firstPresent(
      raw.candidate_credits_millis,
      raw.candidate_final_credits_millis,
      raw.shadow_credits_millis
    ));
    var charged = asNonnegInt(firstPresent(raw.charged_credits_millis, raw.debit_credits_millis));
    var explicitFree = raw.free === true || raw.is_free === true;
    var billable = asNonnegInt(raw.billable_tokens);
    var tier = parseTier(raw.tier, billable);
    var multiplier = asPositiveNumber(firstPresent(raw.multiplier, tier && tier.multiplier));
    var taskType = firstPresent(raw.task_type, raw.operation);
    var fixedRate = taskType === "polish" && multiplier === 1;
    var status = String(firstPresent(raw.measurement_status, raw.status) || "").toLowerCase();
    var unknownPrice = !explicitFree && finalMillis == null && charged == null && base == null;
    if (status && status !== "ready" && status !== "quoted" && status !== "ok"
      && !(fixedRate && status === "unsupported")) {
      unknownPrice = true;
    }
    if (raw.error && (raw.error.code || raw.error.message)) unknownPrice = true;
    return {
      available: true,
      unknown: unknownPrice,
      quoteToken: token != null ? String(token) : null,
      bookId: raw.book_id != null ? String(raw.book_id) : null,
      taskType: taskType,
      fixedRate: fixedRate,
      mode: mode,
      meterVersion: raw.meter_version != null ? String(raw.meter_version) : null,
      pricingVersion: raw.pricing_version != null ? String(raw.pricing_version) : null,
      contentRevision: raw.content_revision != null ? String(raw.content_revision) : null,
      tier: tier,
      multiplier: multiplier,
      baseCreditsMillis: base,
      finalCreditsMillis: finalMillis,
      candidateCreditsMillis: candidate,
      chargedCreditsMillis: charged,
      explicitFree: explicitFree,
      expiry: raw.expiry || raw.expires_at || null,
      proseDrawPromotion: parseProseDrawPromotion(raw.prose_draw_promotion),
      billableTokens: billable,
      usage: parseDataUsage(Object.assign({}, raw, {status: status === "ready" || status === "quoted" || status === "ok" ? "ready" : status}))
    };
  }

  function quoteFromAction(action) {
    if (!isObject(action)) return null;
    var raw = firstPresent(action.quote, action.book_data_quote, action.task_quote);
    if (isObject(raw)) return parseTaskQuote(raw);
    if (action.quote_token || action.final_credits_millis != null || action.base_credits_millis != null) {
      return parseTaskQuote(action);
    }
    return null;
  }

  function isSurchargeActive(mode, multiplier) {
    return parseMode(mode) === "enforce" && asPositiveNumber(multiplier) != null && Number(multiplier) > 1;
  }

  function chargeView(quote, copy) {
    var text = copyOf(copy);
    if (!quote || quote.available === false) {
      return {
        unknown: true,
        explicitFree: false,
        surchargeActive: false,
        owedMillis: null,
        owedText: null,
        candidateMillis: null,
        multiplierText: null,
        confirmEnabled: false,
        mode: quote && quote.mode || null
      };
    }
    var mode = quote.mode;
    var multiplier = quote.multiplier;
    var surchargeActive = isSurchargeActive(mode, multiplier);
    var explicitFree = !!quote.explicitFree;
    var owedMillis = null;
    var candidateMillis = null;
    if (mode === "enforce") {
      owedMillis = explicitFree ? 0 : firstPresent(quote.finalCreditsMillis, quote.chargedCreditsMillis);
    } else {
      owedMillis = firstPresent(quote.chargedCreditsMillis, quote.baseCreditsMillis);
      candidateMillis = firstPresent(quote.candidateCreditsMillis, quote.finalCreditsMillis);
      if (candidateMillis != null && owedMillis != null && Number(candidateMillis) === Number(owedMillis)) {
        candidateMillis = null;
      }
    }
    var unknown = !explicitFree && owedMillis == null;
    if (mode === "enforce" && quote.unknown) unknown = true;
    var tierLabel = quote.tier && (quote.tier.label || (quote.tier.labelKey && text(quote.tier.labelKey)));
    return {
      unknown: unknown,
      explicitFree: explicitFree,
      surchargeActive: surchargeActive,
      owedMillis: unknown ? null : owedMillis,
      owedText: unknown ? null : formatCreditsMillis(owedMillis),
      candidateMillis: mode === "enforce" ? null : candidateMillis,
      multiplier: surchargeActive ? multiplier : null,
      multiplierText: surchargeActive && tierLabel
        ? (tierLabel + " ×" + String(multiplier))
        : (surchargeActive ? ("×" + String(multiplier)) : null),
      confirmEnabled: explicitFree || (!unknown && (mode !== "enforce" || owedMillis != null)),
      mode: mode,
      tier: quote.tier,
      unsupported: !quote.fixedRate && !!(quote.tier && quote.tier.key === "unsupported")
    };
  }

  function usageProgress(usage, text) {
    var index = usage.tier ? TIER_ORDER.indexOf(usage.tier.key) : -1;
    if (index < 0 || usage.billableTokens == null) return null;
    var unsupported = usage.tier.key === "unsupported";
    var lastSupported = TIER_BOUNDS.length - 2;
    var lower = unsupported || index === 0 ? 0 : TIER_BOUNDS[index - 1].upper;
    var upper = unsupported ? TIER_BOUNDS[lastSupported].upper : usage.tier.upperBound;
    if (upper == null || upper <= lower) return null;
    var amount = usage.billableTokens;
    var value = Math.min(upper, Math.max(lower, amount));
    var nextTier = !unsupported && index < lastSupported ? TIER_BOUNDS[index + 1].key : null;
    return {
      min: lower / UNIT_TOKENS,
      max: upper / UNIT_TOKENS,
      value: value / UNIT_TOKENS,
      percent: (value - lower) / (upper - lower) * 100,
      lowerText: formatUsageUnits(lower) + "k",
      upperText: formatUsageUnits(upper) + "k",
      nextText: nextTier ? text("bdv_next_tier", { tier: text("bdv_tier_" + nextTier) }) : text("bdv_range_limit"),
      valueText: text("bdv_range_value", {
        amount: amount / UNIT_TOKENS,
        lower: formatUsageUnits(lower),
        upper: formatUsageUnits(upper)
      })
    };
  }

  function usageView(usage, copy) {
    var text = copyOf(copy);
    if (!usage || usage.unknown) {
      return {
        unknown: true,
        amountText: null,
        tierText: null,
        candidate: false,
        unsupported: false,
        progress: null,
        components: [],
        title: text("bdv_usage"),
        unknownText: text("bdv_unknown")
      };
    }
    var mode = usage.billingMode;
    var candidate = false;
    var tier = usage.tier;
    var multiplier = mode === "enforce" ? tier && tier.multiplier : (mode ? 1 : null);
    var tierText = multiplier ? String(multiplier) + "×" : null;
    return {
      unknown: false,
      amountText: usage.units + "k",
      progress: usageProgress(usage, text),
      tierText: tierText || null,
      candidate: candidate,
      unsupported: !!(tier && tier.key === "unsupported"),
      components: usage.components || [],
      title: text("bdv_usage"),
      detailsLabel: text("bdv_details"),
      unsupportedNote: text("bdv_unsupported_note")
    };
  }

  function normalizeQuoteRequest(spec) {
    var body = {};
    var source = isObject(spec) ? spec : {};
    QUOTE_REQUEST_KEYS.forEach(function (key) {
      var value = source[key];
      if (value == null || value === "") return;
      if (key === "composite_action" || key === "chapter_chain") {
        if (isObject(value)) body[key] = value;
        return;
      }
      if (key === "targets") {
        if (Array.isArray(value)) body[key] = value;
        return;
      }
      body[key] = value;
    });
    return body;
  }

  function quoteRequestFromPayload(payload, extra) {
    extra = extra || {};
    payload = payload || {};
    var req = isObject(payload.request_payload) ? payload.request_payload : {};
    return normalizeQuoteRequest({
      task_type: firstPresent(extra.task_type, payload.task_type, req.task_type),
      writer_type: firstPresent(extra.writer_type, extra.writerType, req.writer_type, payload.writer_type),
      execution_mode: firstPresent(extra.execution_mode, req.execution_mode, payload.execution_mode),
      composite_action: firstPresent(extra.composite_action, req.composite_action, payload.composite_action),
      chapter_chain: firstPresent(extra.chapter_chain, req.chapter_chain, payload.chapter_chain),
      targets: firstPresent(extra.targets, req.targets, payload.targets),
      count: firstPresent(extra.count, req.count, payload.count),
      polish: extra.polish != null ? extra.polish : (req.polish != null ? req.polish : payload.polish)
    });
  }

  function quoteTokenOf(payload) {
    if (!isObject(payload)) return null;
    var nested = isObject(payload.request_payload) ? payload.request_payload.quote_token : null;
    var cfg = isObject(payload.cfg) ? payload.cfg.quote_token : null;
    var token = firstPresent(payload.quote_token, nested, cfg);
    return token != null ? String(token) : null;
  }

  function isEngineTaskCreatePayload(payload) {
    return isObject(payload)
      && !!payload.book_link_id
      && !!payload.task_type
      && payload.cfg == null
      && payload.targets == null;
  }

  function attachQuoteToken(payload, quote) {
    var next = Object.assign({}, payload || {});
    var token = quote && (quote.quoteToken || quote.quote_token);
    if (!token) return next;
    if (isEngineTaskCreatePayload(next)) {
      next.request_payload = Object.assign({}, next.request_payload || {}, { quote_token: token });
      if (Object.prototype.hasOwnProperty.call(next, "quote_token")) delete next.quote_token;
      return next;
    }
    next.quote_token = token;
    if (isObject(next.request_payload) || next.task_type) {
      next.request_payload = Object.assign({}, next.request_payload || {}, { quote_token: token });
    }
    if (isObject(next.cfg)) {
      next.cfg = Object.assign({}, next.cfg, { quote_token: token });
    }
    return next;
  }

  function isCompositeFollowup(payload) {
    var req = isObject(payload) && isObject(payload.request_payload) ? payload.request_payload : payload;
    var action = req && req.composite_action;
    if (!isObject(action) || action.kind !== "automatic_book_creation") return false;
    var step = Number(action.step);
    var start = Number(action.start_step);
    return Number.isFinite(step) && Number.isFinite(start) && step > start;
  }

  function cancelledError() {
    var error = new Error("quote_cancelled");
    error.code = "quote_cancelled";
    error.preserveDrafts = true;
    return error;
  }

  function unknownPriceError(quote) {
    var error = new Error("quote_price_unknown");
    error.code = "quote_price_unknown";
    error.quote = quote || null;
    error.preserveDrafts = true;
    return error;
  }

  function registerConfirmer(fn) {
    confirmer = typeof fn === "function" ? fn : null;
    return function () {
      if (confirmer === fn) confirmer = null;
    };
  }

  // A preference is scoped to this signed-in account and book in this browser.
  // Observe every fresh quote/usage, including 1x, so returning to a former tier
  // never reuses an acknowledgement cleared by an intervening tier change.
  var reminderMemory = Object.create(null);
  var reminderMemoryOnly = Object.create(null);
  function reminderKey(bookId) {
    var me = root && root.LF_PORTAL_STATE && root.LF_PORTAL_STATE.me;
    return me && me.id && bookId ? "lf:book-multiplier:" + encodeURIComponent(me.id) + ":" + encodeURIComponent(bookId) : null;
  }

  function readReminder(key) {
    if (!key) return null;
    if (reminderMemoryOnly[key]) return reminderMemory[key] || null;
    try {
      var stored = root.localStorage && root.localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
      if (root.localStorage) return null;
    } catch (error) { /* Storage may be unavailable; keep the in-memory choice. */ }
    return reminderMemory[key] || null;
  }

  function writeReminder(key, value) {
    if (!key) return;
    reminderMemory[key] = value;
    try { if (root.localStorage) root.localStorage.setItem(key, JSON.stringify(value)); } catch (error) { reminderMemoryOnly[key] = true; }
  }

  function observeMultiplier(bookId, mode, multiplier) {
    var effective = parseMode(mode) === "enforce"
      ? (multiplier === "unsupported" ? "unsupported" : asPositiveNumber(multiplier))
      : (parseMode(mode) ? 1 : null);
    var key = reminderKey(bookId);
    var previous = readReminder(key);
    if (effective == null) return {key: key, multiplier: null, muted: false};
    var value = previous && previous.multiplier === effective ? previous : {multiplier: effective, muted: false};
    if (key && value !== previous) writeReminder(key, value);
    return {key: key, multiplier: effective, muted: value.muted === true};
  }

  function bookMultiplier(quote) {
    if (quote.tier && quote.tier.key === "unsupported") return "unsupported";
    return quote.tier ? quote.tier.multiplier : (quote.fixedRate ? null : quote.multiplier);
  }

  function rememberMultiplier(quote, options) {
    var bookId = quote.bookId || options && options.bookId;
    if (options && options.reminderScope !== undefined && options.reminderScope !== reminderKey(bookId)) return;
    var state = observeMultiplier(bookId, quote.mode, bookMultiplier(quote));
    if (isSurchargeActive(quote.mode, quote.multiplier) && state.multiplier > 1) writeReminder(state.key, {multiplier: state.multiplier, muted: true});
  }

  async function confirmQuote(quote, options) {
    options = options || {};
    if (!quote || quote.available === false) return true;
    var bookId = quote.bookId || options.bookId;
    var state = observeMultiplier(bookId, quote.mode, bookMultiplier(quote));
    var view = chargeView(quote);
    if (!view.surchargeActive || view.explicitFree || view.unknown || !(view.owedMillis > 0)) return true;
    // Only a confirmation inside this operation may survive a same-tier retry.
    // Legacy skipConfirm/quoteToken flags do not bypass the multiplier reminder.
    var confirmation = options.confirmation;
    var identity = reminderKey(bookId) || String(bookId || "");
    if (state.muted || confirmation && confirmation.identity === identity && confirmation.multiplier === state.multiplier) return true;
    if (!confirmer) {
      var error = new Error("quote_confirm_unavailable");
      error.code = "quote_confirm_unavailable";
      error.preserveDrafts = true;
      throw error;
    }
    var scope = reminderKey(bookId);
    var accepted = await confirmer(quote, Object.assign({}, options, {bookId: bookId, reminderScope: scope}));
    if (scope !== reminderKey(bookId)) return false;
    if (accepted && confirmation) {
      confirmation.identity = identity;
      confirmation.multiplier = state.multiplier;
    }
    return !!accepted;
  }

  async function confirmAssistantAction(action) {
    if (!action || action.risk !== "spend") return true;
    var args = action.arguments || {};
    var operation = action.operation || args.operation;
    // Resume uses an existing reservation. New reservations go through start.
    if (operation !== "tasks_start" && operation !== "cruise_start") return true;
    var bookId = action.book_link_id || args.book_id;
    var spec = Object.assign({}, args, {task_type: operation === "cruise_start" ? "cruise" : args.task_type});
    var quote = await requestQuote(bookId, spec);
    if (quote.mode === "enforce" && (chargeView(quote).unknown || chargeView(quote).unsupported)) throw unknownPriceError(quote);
    return confirmQuote(quote, {bookId: bookId});
  }

  function isSoftQuoteError(error) {
    var code = String(detailCode(error) || "").toLowerCase();
    return code === "quote_unknown_usage"
      || code === "quote_unsupported"
      || code === "quote_enforcement_unavailable";
  }

  async function requestQuote(bookId, spec) {
    var api = root && root.LF_API;
    if (!bookId || !api || typeof api.bookTaskQuote !== "function") {
      return { available: false, reason: "api_missing" };
    }
    try {
      var raw = await api.bookTaskQuote(bookId, normalizeQuoteRequest(spec || {}));
      var quote = parseTaskQuote(raw);
      if (!quote.bookId) quote.bookId = String(bookId);
      observeMultiplier(bookId, quote.mode, bookMultiplier(quote));
      return quote;
    } catch (error) {
      if (isQuoteMissingError(error)) return { available: false, reason: "not_found" };
      if (isSoftQuoteError(error)) {
        return updatedQuoteFromError(error) || parseTaskQuote({
          billing_mode: "shadow",
          measurement_status: "unknown",
          error: { code: detailCode(error) || "quote_unknown_usage" }
        });
      }
      throw error;
    }
  }

  async function fetchDataUsage(bookId) {
    var api = root && root.LF_API;
    if (!bookId || !api || typeof api.bookDataUsage !== "function") return unknownUsage();
    try {
      var raw = await api.bookDataUsage(bookId);
      var usage = parseDataUsage(raw);
      if (!usage.unknown) observeMultiplier(bookId, usage.billingMode, bookMultiplier(usage));
      return usage;
    } catch (error) {
      if (isQuoteMissingError(error)) return unknownUsage();
      throw error;
    }
  }

  async function preparePaidCreate(payload, options) {
    options = options || {};
    payload = payload || {};
    if (isCompositeFollowup(payload)) return payload;
    var bookId = firstPresent(options.bookId, payload.book_link_id, payload.book_id);
    var spec = options.spec ? normalizeQuoteRequest(Object.assign({
      task_type: options.spec.task_type
    }, quoteRequestFromPayload(payload, options), options.spec)) : quoteRequestFromPayload(payload, options);
    var quote = options.quote || await requestQuote(bookId, spec);
    if (!quote || quote.available === false) return payload;
    if (!quote.quoteToken) {
      if (quote.mode === "enforce" && !quote.explicitFree) throw unknownPriceError(quote);
      return payload;
    }
    var view = chargeView(quote);
    if (view.unknown && quote.mode === "enforce" && !view.explicitFree) throw unknownPriceError(quote);
    if (view.unsupported && quote.mode === "enforce") throw unknownPriceError(quote);
    var accepted = await confirmQuote(quote, Object.assign({}, options, {bookId: bookId}));
    if (!accepted) throw cancelledError();
    return attachQuoteToken(payload, quote);
  }

  function markStale(error, quote) {
    if (!error) return error;
    error.preserveDrafts = true;
    if (quote) error.newQuote = quote;
    return error;
  }

  return {
    UNIT_TOKENS: UNIT_TOKENS,
    parseMode: parseMode,
    parseDataUsage: parseDataUsage,
    parseTaskQuote: parseTaskQuote,
    quoteFromAction: quoteFromAction,
    isSurchargeActive: isSurchargeActive,
    isStaleQuoteError: isStaleQuoteError,
    updatedQuoteFromError: updatedQuoteFromError,
    isQuoteMissingError: isQuoteMissingError,
    formatCreditsMillis: formatCreditsMillis,
    formatUsageUnits: formatUsageUnits,
    chargeView: chargeView,
    usageView: usageView,
    quoteRequestFromPayload: quoteRequestFromPayload,
    normalizeQuoteRequest: normalizeQuoteRequest,
    quoteTokenOf: quoteTokenOf,
    attachQuoteToken: attachQuoteToken,
    isCompositeFollowup: isCompositeFollowup,
    registerConfirmer: registerConfirmer,
    confirmQuote: confirmQuote,
    confirmAssistantAction: confirmAssistantAction,
    rememberMultiplier: rememberMultiplier,
    requestQuote: requestQuote,
    fetchDataUsage: fetchDataUsage,
    preparePaidCreate: preparePaidCreate,
    markStale: markStale,
    cancelledError: cancelledError,
    unknownPriceError: unknownPriceError,
    defaultCopy: defaultCopy
  };
}));
