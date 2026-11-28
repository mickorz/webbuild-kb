/* Admin assistant cost, quota, and abuse view models. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantAnalysisCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const DAYS = [7, 30, 90];
  const HOURS = [720, 168, 72, 24, 12, 3, 1];
  const PLANS = ["free", "basic", "standard", "pro"];
  const BLOCK_FLAGS = ["temporary_limit", "temporary_block", "blocked", "origin_block", "origin_blocked", "download_block", "rate_limited"];
  const FLAG_LABELS = {
    temporary_limit: ["临时限流", "Temporary limit"],
    temporary_block: ["临时限制", "Temporary block"],
    blocked: ["已限制", "Blocked"],
    origin_block: ["源站已限制", "Origin blocked"],
    origin_blocked: ["源站已限制", "Origin blocked"],
    download_block: ["下载已限制", "Downloads blocked"],
    rate_limited: ["读取过快", "Read rate limited"],
    repeated_read: ["重复读取", "Repeated read"],
    download_alert: ["下载告警", "Download alert"]
  };

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function analysisPath(query) {
    const source = query || {};
    const days = DAYS.indexOf(Number(source.days)) >= 0 ? Number(source.days) : 7;
    const params = new URLSearchParams();
    if (source.hours != null) {
      params.set("hours", String(HOURS.indexOf(Number(source.hours)) >= 0 ? Number(source.hours) : 168));
    } else {
      params.set("days", String(days));
    }
    const userId = text(source.userId);
    if (userId) params.set("user_id", userId);
    const plan = text(source.planCode);
    if (PLANS.indexOf(plan) >= 0) params.set("plan_code", plan);
    return "/api/admin/assistant-analysis?" + params.toString();
  }

  function integerState(value) {
    if (value == null || value === "") return { kind: "unknown" };
    const number = typeof value === "number" ? value : Number(text(value));
    if (!Number.isInteger(number) || number < 0) return { kind: "unknown" };
    return { kind: number === 0 ? "zero" : "known", value: number };
  }

  function decimalState(value) {
    if (value == null || value === "") return { kind: "unknown" };
    const raw = text(value);
    if (!/^\d+(\.\d+)?$/.test(raw)) return { kind: "unknown" };
    const canonical = raw.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "").replace(/^0+(?=\d)/, "") || "0";
    return { kind: canonical === "0" ? "zero" : "known", text: canonical };
  }

  function decimalNumber(value) {
    const state = decimalState(value);
    if (state.kind === "unknown") return null;
    const number = Number(state.text);
    return Number.isFinite(number) ? number : null;
  }

  function integerOrNull(value) {
    const state = integerState(value);
    return state.kind === "unknown" ? null : state.value;
  }

  function canonicalInteger(value) {
    const raw = text(value);
    if (!/^\d+$/.test(raw)) return null;
    const number = Number(raw);
    if (!Number.isSafeInteger(number)) return null;
    return String(number);
  }

  function draftFromSettings(saved) {
    const source = saved || {};
    const allowances = source.allowances || {};
    const plans = {};
    PLANS.forEach((plan) => {
      const row = allowances[plan] || {};
      plans[plan] = {
        memory_items: row.memory_items == null ? "" : String(row.memory_items),
        storage_bytes: row.storage_bytes == null ? "" : String(row.storage_bytes)
      };
    });
    return {
      allowances: plans,
      workspaceRequestsPerMinute: source.workspace_requests_per_minute == null ? "" : String(source.workspace_requests_per_minute),
      repeatedReadsPer10Minutes: source.repeated_reads_per_10_minutes == null ? "" : String(source.repeated_reads_per_10_minutes),
      downloadAlertBytesPerDay: source.download_alert_bytes_per_day == null ? "" : String(source.download_alert_bytes_per_day),
      downloadBlockBytesPerDay: source.download_block_bytes_per_day == null ? "" : String(source.download_block_bytes_per_day)
    };
  }

  function settingsPatch(saved, draft) {
    const source = saved || {};
    const current = draftFromSettings(source);
    const form = draft || current;
    const errors = {};
    const patch = { expected_revision: source.revision };
    let allowanceChanged = false;
    const allowances = {};
    PLANS.forEach((plan) => {
      const nextRow = form.allowances && form.allowances[plan] || {};
      const savedRow = current.allowances[plan];
      const nextMemory = canonicalInteger(nextRow.memory_items);
      const nextStorage = canonicalInteger(nextRow.storage_bytes);
      const savedMemory = canonicalInteger(savedRow.memory_items);
      const savedStorage = canonicalInteger(savedRow.storage_bytes);
      const memoryChanged = text(nextRow.memory_items) !== text(savedRow.memory_items);
      const storageChanged = text(nextRow.storage_bytes) !== text(savedRow.storage_bytes);
      if (memoryChanged && nextMemory == null) errors[plan + "_memory"] = "invalid";
      if (storageChanged && nextStorage == null) errors[plan + "_storage"] = "invalid";
      if (memoryChanged || storageChanged) allowanceChanged = true;
      const memory = memoryChanged ? nextMemory : savedMemory;
      const storage = storageChanged ? nextStorage : savedStorage;
      allowances[plan] = {
        memory_items: memory == null ? null : Number(memory),
        storage_bytes: storage == null ? null : Number(storage)
      };
    });
    if (allowanceChanged && !PLANS.some((plan) => errors[plan + "_memory"] || errors[plan + "_storage"])) {
      const complete = PLANS.every((plan) => allowances[plan].memory_items != null && allowances[plan].storage_bytes != null);
      if (!complete) errors.allowances = "invalid";
      else patch.allowances = allowances;
    }
    const fields = [
      ["workspaceRequestsPerMinute", "workspace_requests_per_minute", false],
      ["repeatedReadsPer10Minutes", "repeated_reads_per_10_minutes", false],
      ["downloadAlertBytesPerDay", "download_alert_bytes_per_day", false],
      ["downloadBlockBytesPerDay", "download_block_bytes_per_day", false]
    ];
    fields.forEach((entry) => {
      const key = entry[0];
      const wire = entry[1];
      if (text(form[key]) === text(current[key])) return;
      const canonical = canonicalInteger(form[key]);
      if (canonical == null || canonical === "0") errors[key] = "invalid";
      else patch[wire] = Number(canonical);
    });
    const alert = canonicalInteger(form.downloadAlertBytesPerDay);
    const block = canonicalInteger(form.downloadBlockBytesPerDay);
    const thresholdChanged = text(form.downloadAlertBytesPerDay) !== text(current.downloadAlertBytesPerDay)
      || text(form.downloadBlockBytesPerDay) !== text(current.downloadBlockBytesPerDay);
    if (thresholdChanged && alert != null && block != null && Number(block) <= Number(alert)) {
      errors.downloadBlockBytesPerDay = "order";
    }
    if (errors.downloadBlockBytesPerDay) delete patch.download_block_bytes_per_day;
    if (errors.downloadAlertBytesPerDay) delete patch.download_alert_bytes_per_day;
    return {
      ok: Object.keys(errors).length === 0,
      patch: patch,
      errors: errors,
      dirty: Object.keys(patch).some((key) => key !== "expected_revision")
    };
  }

  function classifyError(error) {
    const status = Number(error && error.status);
    if (status === 409) return "conflict";
    if (status === 403) return "forbidden";
    if (status === 422) return "invalid";
    return "unavailable";
  }

  function coverageItems(coverage) {
    if (!coverage || typeof coverage !== "object") return ["coverage_unknown"];
    const items = [];
    if (coverage.collection_started_at == null || coverage.collection_started_at === "") items.push("collection_unknown");
    if (coverage.legacy_turns == null || coverage.legacy_turns === "") items.push("legacy_unknown");
    else if (Number(coverage.legacy_turns) > 0) items.push("legacy_turns");
    if (coverage.newapi_cost_available === false) items.push("cost_unavailable");
    if (coverage.memory_cost_available === false) items.push("memory_cost_unavailable");
    if (coverage.origin_bytes_available === false) items.push(coverage.origin_reads === 0 ? "origin_no_observations" : "origin_unavailable");
    return items;
  }

  function truncation(payload) {
    const page = payload && payload.page && typeof payload.page === "object" ? payload.page : {};
    const generic = !!(payload && payload.truncated);
    return {
      events: !!(generic || (payload && payload.events_truncated) || page.events_truncated),
      users: !!(generic || (payload && payload.users_truncated) || page.users_truncated)
    };
  }

  function trendRows(trend) {
    return (Array.isArray(trend) ? trend : []).map((row) => ({
      date: row && row.date || "",
      turns: integerOrNull(row && row.turns),
      model_calls: integerOrNull(row && row.model_calls),
      blocked_requests: integerOrNull(row && row.blocked_requests),
      download_bytes: integerOrNull(row && row.download_bytes),
      cost_rmb: decimalNumber(row && row.cost_rmb)
    }));
  }

  function pressureSide(users, usedKey, limitKey) {
    const result = { known: 0, near: 0, over: 0, unknown: 0 };
    (Array.isArray(users) ? users : []).forEach((user) => {
      const used = integerState(user && user[usedKey]);
      const limit = integerState(user && user[limitKey]);
      if (used.kind === "unknown" || limit.kind === "unknown") {
        result.unknown += 1;
        return;
      }
      result.known += 1;
      if (limit.value === 0) {
        if (used.value > 0) result.over += 1;
        return;
      }
      const ratio = used.value / limit.value;
      if (ratio >= 1) result.over += 1;
      else if (ratio >= 0.8) result.near += 1;
    });
    return result;
  }

  function limitPressure(users) {
    return {
      memory: pressureSide(users, "memory_used", "memory_limit"),
      storage: pressureSide(users, "storage_used_bytes", "storage_limit_bytes")
    };
  }

  function planDistribution(users) {
    const counts = { free: 0, basic: 0, standard: 0, pro: 0, unknown: 0 };
    (Array.isArray(users) ? users : []).forEach((user) => {
      const plan = text(user && user.plan_code);
      if (Object.prototype.hasOwnProperty.call(counts, plan) && plan !== "unknown") counts[plan] += 1;
      else counts.unknown += 1;
    });
    return counts;
  }

  function addDecimal(left, right) {
    const a = decimalState(left);
    const b = decimalState(right);
    if (a.kind === "unknown" || b.kind === "unknown") return null;
    const parts = [a.text.split("."), b.text.split(".")];
    const scale = Math.max((parts[0][1] || "").length, (parts[1][1] || "").length);
    const sum = parts.reduce((total, part) =>
      total + BigInt(part[0] + (part[1] || "").padEnd(scale, "0")), BigInt(0));
    const digits = sum.toString().padStart(scale + 1, "0");
    return decimalState(scale ? digits.slice(0, -scale) + "." + digits.slice(-scale) : digits).text;
  }

  function operationRows(events, categories) {
    const allowed = new Set(categories);
    const grouped = new Map();
    (Array.isArray(events) ? events : []).forEach((event) => {
      const category = text(event && event.category);
      if (!allowed.has(category)) return;
      const operation = text(event && event.operation) || category;
      const key = category + "\n" + operation;
      const current = grouped.get(key) || {
        key: key, category: category, operation: operation, calls: 0,
        input_tokens: null, output_tokens: null, bytes: null, known_cost: "0", missing_cost: 0, cost_known: false
      };
      current.calls += 1;
      const input = integerState(event.input_tokens);
      const output = integerState(event.output_tokens);
      const bytes = integerState(event.bytes);
      if (input.kind !== "unknown") current.input_tokens = (current.input_tokens || 0) + input.value;
      if (output.kind !== "unknown") current.output_tokens = (current.output_tokens || 0) + output.value;
      if (bytes.kind !== "unknown") current.bytes = (current.bytes || 0) + bytes.value;
      const cost = decimalState(event.cost_rmb);
      if (cost.kind === "unknown") current.missing_cost += 1;
      else {
        current.cost_known = true;
        current.known_cost = addDecimal(current.known_cost, cost.text) || current.known_cost;
      }
      grouped.set(key, current);
    });
    return Array.from(grouped.values());
  }

  function toolRows(events) {
    const categories = [];
    (Array.isArray(events) ? events : []).forEach((event) => {
      const category = text(event && event.category);
      if (category && category !== "model" && category !== "memory" && categories.indexOf(category) < 0) {
        categories.push(category);
      }
    });
    return operationRows(events, categories);
  }

  function memoryRows(events) {
    return operationRows(events, ["memory"]);
  }

  function knownCostTotal(summary) {
    const source = summary || {};
    return addDecimal(source.known_cost_rmb, source.known_background_cost_rmb);
  }

  function totalCost(summary) {
    const source = summary || {};
    return addDecimal(source.cost_rmb, source.background_cost_rmb);
  }

  function formatTimestamp(value, english) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toLocaleString(english ? "en-US" : "zh-CN", {
      timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
  }

  function windowLabel(window, english) {
    if (!window) return "";
    const start = formatTimestamp(window.start, english), end = formatTimestamp(window.end, english);
    return start && end ? start + " – " + end : "";
  }

  function userBlocked(user) {
    if (!user || typeof user !== "object") return false;
    if (user.blocked === true || user.temporarily_blocked === true || user.temporary_block === true) return true;
    const flags = Array.isArray(user.flags) ? user.flags : [];
    return flags.some((flag) => BLOCK_FLAGS.indexOf(String(flag)) >= 0);
  }

  function flagLabel(flag, english) {
    const pair = FLAG_LABELS[String(flag || "")];
    if (!pair) return text(flag);
    return english ? pair[1] : pair[0];
  }

  function humanBytes(bytes) {
    const state = integerState(bytes);
    if (state.kind === "unknown") return null;
    let value = state.value;
    const units = ["B", "KiB", "MiB", "GiB", "TiB"];
    let unit = 0;
    while (unit < units.length - 1 && value >= 1024) {
      value /= 1024;
      unit += 1;
    }
    return String(Number(value.toFixed(2))) + " " + units[unit];
  }

  return {
    DAYS: DAYS,
    HOURS: HOURS,
    PLANS: PLANS,
    BLOCK_FLAGS: BLOCK_FLAGS,
    analysisPath: analysisPath,
    integerState: integerState,
    decimalState: decimalState,
    draftFromSettings: draftFromSettings,
    settingsPatch: settingsPatch,
    classifyError: classifyError,
    coverageItems: coverageItems,
    truncation: truncation,
    trendRows: trendRows,
    limitPressure: limitPressure,
    planDistribution: planDistribution,
    toolRows: toolRows,
    memoryRows: memoryRows,
    knownCostTotal: knownCostTotal,
    totalCost: totalCost,
    windowLabel: windowLabel,
    formatTimestamp: formatTimestamp,
    userBlocked: userBlocked,
    flagLabel: flagLabel,
    humanBytes: humanBytes
  };
});
