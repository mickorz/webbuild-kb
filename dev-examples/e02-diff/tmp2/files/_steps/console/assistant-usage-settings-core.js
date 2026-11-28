/* User assistant quota, turn protection, and memory injection budget. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantUsageCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const PLAN_LABELS = {
    free: ["免费", "Free"],
    basic: ["基础", "Basic"],
    standard: ["标准", "Standard"],
    pro: ["专业", "Pro"]
  };

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function canonicalDecimal(value) {
    const raw = text(value);
    if (!/^\d+(\.\d{1,6})?$/.test(raw)) return null;
    const trimmed = raw.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "").replace(/^0+(?=\d)/, "");
    return trimmed || "0";
  }

  function normalizeCredits(value) {
    if (text(value) === "") return { ok: false, code: "empty" };
    const canonical = canonicalDecimal(value);
    if (canonical == null || !/^\d+(\.\d{1,3})?$/.test(canonical)
      || Number(canonical) <= 0 || Number(canonical) > 100000) return { ok: false, code: "invalid" };
    return { ok: true, text: canonical };
  }

  function integerBound(value) {
    if (value == null || value === "") return null;
    const number = Number(value);
    return Number.isInteger(number) ? number : null;
  }

  function normalizeTokens(value, limits) {
    const raw = text(value);
    if (!/^\d+$/.test(raw)) return { ok: false, code: "invalid" };
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed)) return { ok: false, code: "invalid" };
    const min = integerBound(limits && limits.memory_context_tokens_min);
    const max = integerBound(limits && limits.memory_context_tokens_max);
    if ((min != null && parsed < min) || (max != null && parsed > max)) {
      return { ok: false, code: "range", min: min, max: max };
    }
    return { ok: true, value: parsed };
  }

  function knownInteger(value) {
    if (value == null || value === "") return null;
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) return null;
    return number;
  }

  function quotaView(used, limit) {
    const usedN = knownInteger(used);
    const limitN = knownInteger(limit);
    if (usedN == null) return { kind: "unknown", used: null, limit: limitN, ratio: null };
    if (limitN == null) return { kind: usedN === 0 ? "zero" : "open", used: usedN, limit: null, ratio: null };
    if (limitN === 0) return { kind: usedN > 0 ? "over" : "zero", used: usedN, limit: 0, ratio: usedN > 0 ? 1 : 0 };
    const ratio = usedN / limitN;
    let kind = "ok";
    if (usedN === 0) kind = "zero";
    else if (ratio >= 1) kind = "over";
    else if (ratio >= 0.8) kind = "near";
    return { kind: kind, used: usedN, limit: limitN, ratio: ratio };
  }

  function meterPercent(view) {
    if (!view || view.kind === "unknown" || view.kind === "open" || view.ratio == null) return null;
    if (view.kind === "zero") return 0;
    return Math.max(0, Math.min(100, view.ratio * 100));
  }

  function formatBytes(bytes) {
    const number = knownInteger(bytes);
    if (number == null) return null;
    const units = ["B", "kb", "mb", "gb", "tb"];
    let value = number;
    let unit = 0;
    while (unit < units.length - 1 && value >= 1024) {
      value /= 1024;
      unit += 1;
    }
    return String(Number(value.toFixed(2))) + " " + units[unit];
  }

  function planLabel(code, english) {
    const pair = PLAN_LABELS[String(code || "")];
    if (!pair) return null;
    return english ? pair[1] : pair[0];
  }

  const BUDGET_PRESETS = [1024, 2048, 4096];

  function budgetPresets(limits) {
    const min = integerBound(limits && limits.memory_context_tokens_min);
    const max = integerBound(limits && limits.memory_context_tokens_max);
    if (min != null && max != null && min > max) return [];
    return BUDGET_PRESETS.filter((value) => (min == null || value >= min) && (max == null || value <= max));
  }

  function usagePatch(saved, draft) {
    const source = saved || {};
    const form = draft || {};
    const patch = { expected_revision: source.revision };
    const errors = {};
    if (source.can_configure_protection === true) {
      const next = normalizeCredits(form.turnProtection);
      const current = normalizeCredits(source.turn_protection_credits);
      if (!next.ok) errors.turnProtection = next.code;
      else if (!current.ok || next.text !== current.text) patch.turn_protection_credits = next.text;
    }
    const nextTokens = normalizeTokens(form.memoryTokens, source.limits);
    const currentTokens = normalizeTokens(source.memory_context_tokens, source.limits);
    if (!nextTokens.ok) errors.memoryTokens = nextTokens;
    else if (!currentTokens.ok || nextTokens.value !== currentTokens.value) {
      patch.memory_context_tokens = nextTokens.value;
    }
    return {
      ok: Object.keys(errors).length === 0,
      patch: patch,
      errors: errors,
      dirty: Object.keys(patch).some((key) => key !== "expected_revision")
        || !!(errors.turnProtection && String(form.turnProtection ?? "") !== String(source.turn_protection_credits ?? ""))
        || !!(errors.memoryTokens && String(form.memoryTokens ?? "") !== String(source.memory_context_tokens ?? ""))
    };
  }

  function classifyError(error) {
    const status = Number(error && error.status);
    const detail = error && error.body && error.body.detail;
    const code = detail && typeof detail === "object" ? String(detail.code || "") : "";
    if (status === 409 || code === "revision_conflict" || code === "assistant_settings_revision_conflict") return "conflict";
    if (status === 403 || code === "paid_only" || code === "protection_forbidden" || code === "assistant_protection_paid_only") return "forbidden";
    if (status === 422 || code === "invalid") return "invalid";
    return "unavailable";
  }

  return {
    PLAN_LABELS: PLAN_LABELS,
    canonicalDecimal: canonicalDecimal,
    normalizeCredits: normalizeCredits,
    normalizeTokens: normalizeTokens,
    quotaView: quotaView,
    meterPercent: meterPercent,
    formatBytes: formatBytes,
    planLabel: planLabel,
    budgetPresets: budgetPresets,
    usagePatch: usagePatch,
    classifyError: classifyError
  };
});
