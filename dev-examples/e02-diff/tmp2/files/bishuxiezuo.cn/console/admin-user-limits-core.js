(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AdminUserLimitsCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const MAX_LIMIT = 2147483647;
  const DEFAULT_LIMIT = 30;

  function isInt(value) {
    return typeof value === "number" && Number.isInteger(value);
  }

  function planCode(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function normalizePlan(plan) {
    if (!plan || typeof plan !== "object") return null;
    const code = planCode(plan.code);
    if (!code) return null;
    if (!isInt(plan.character_limit) || plan.character_limit < 0 || plan.character_limit > MAX_LIMIT) return null;
    return {
      code,
      name: typeof plan.name === "string" ? plan.name : "",
      tier: plan.tier,
      active: plan.active !== false,
      character_limit: plan.character_limit
    };
  }

  function normalizeSnapshot(value) {
    if (!value || typeof value !== "object" || !isInt(value.revision) || !Array.isArray(value.plans)) return null;
    const plans = [];
    const seen = new Set();
    for (let index = 0; index < value.plans.length; index += 1) {
      const plan = normalizePlan(value.plans[index]);
      if (!plan || seen.has(plan.code)) return null;
      seen.add(plan.code);
      plans.push(plan);
    }
    return {
      revision: value.revision,
      plans,
      updated_at: value.updated_at == null ? null : value.updated_at,
      updated_by: value.updated_by == null ? null : value.updated_by
    };
  }

  function parseInput(text) {
    if (text == null) return { error: "empty" };
    const raw = String(text).trim();
    if (!raw) return { error: "empty" };
    if (!/^(0|[1-9]\d*)$/.test(raw)) return { error: "invalid" };
    const value = Number(raw);
    if (value === 0) return { error: "zero" };
    if (value > MAX_LIMIT) return { error: "range" };
    return { value };
  }

  function rememberedOf(plan) {
    if (plan.character_limit >= 1) return plan.character_limit;
    return DEFAULT_LIMIT;
  }

  function createDraft(snapshot) {
    const canonical = normalizeSnapshot(snapshot);
    if (!canonical) return null;
    return {
      revision: canonical.revision,
      conflict: false,
      rows: canonical.plans.map(function (plan) {
        const unlimited = plan.character_limit === 0;
        return {
          code: plan.code,
          name: plan.name,
          tier: plan.tier,
          active: plan.active,
          unlimited: unlimited,
          input: unlimited ? "" : String(plan.character_limit),
          remembered: rememberedOf(plan)
        };
      })
    };
  }

  function replaceRow(draft, code, update) {
    if (!draft) return draft;
    return {
      revision: draft.revision,
      conflict: draft.conflict,
      rows: draft.rows.map(function (row) {
        return row.code === code ? update(row) : row;
      })
    };
  }

  function setUnlimited(draft, code, unlimited) {
    return replaceRow(draft, code, function (row) {
      if (unlimited) {
        const parsed = parseInput(row.input);
        return {
          code: row.code,
          name: row.name,
          tier: row.tier,
          active: row.active,
          unlimited: true,
          input: "",
          remembered: parsed.value || row.remembered
        };
      }
      const restored = isInt(row.remembered) && row.remembered >= 1 ? row.remembered : DEFAULT_LIMIT;
      return {
        code: row.code,
        name: row.name,
        tier: row.tier,
        active: row.active,
        unlimited: false,
        input: String(restored),
        remembered: restored
      };
    });
  }

  function setInput(draft, code, text) {
    return replaceRow(draft, code, function (row) {
      if (row.unlimited) return row;
      const parsed = parseInput(text);
      return {
        code: row.code,
        name: row.name,
        tier: row.tier,
        active: row.active,
        unlimited: false,
        input: text,
        remembered: parsed.value || row.remembered
      };
    });
  }

  function rowError(row) {
    if (!row || row.unlimited) return null;
    return parseInput(row.input).error || null;
  }

  function errorKey(error) {
    if (error === "empty") return "adm_limits_err_empty";
    if (error === "zero") return "adm_limits_err_zero";
    if (error === "range") return "adm_limits_err_range";
    if (error === "invalid") return "adm_limits_err_integer";
    return null;
  }

  function mappingFromDraft(draft) {
    if (!draft) return null;
    const result = {};
    for (let index = 0; index < draft.rows.length; index += 1) {
      const row = draft.rows[index];
      if (row.unlimited) {
        result[row.code] = 0;
        continue;
      }
      const parsed = parseInput(row.input);
      if (parsed.error) return null;
      result[row.code] = parsed.value;
    }
    return result;
  }

  function isDirty(snapshot, draft) {
    const canonical = normalizeSnapshot(snapshot);
    if (!canonical || !draft || canonical.plans.length !== draft.rows.length) return false;
    for (let index = 0; index < canonical.plans.length; index += 1) {
      const plan = canonical.plans[index];
      const row = draft.rows[index];
      if (!row || row.code !== plan.code) return true;
      if (row.unlimited) {
        if (plan.character_limit !== 0) return true;
      } else if (row.input !== String(plan.character_limit) || plan.character_limit === 0) {
        return true;
      }
    }
    return false;
  }

  function canSave(snapshot, draft, flags) {
    const state = flags || {};
    if (!snapshot || !draft || state.saving || draft.conflict) return false;
    if (!isDirty(snapshot, draft)) return false;
    for (let index = 0; index < draft.rows.length; index += 1) {
      if (rowError(draft.rows[index])) return false;
    }
    return true;
  }

  function savePayload(snapshot, draft) {
    const canonical = normalizeSnapshot(snapshot);
    const characterLimits = mappingFromDraft(draft);
    if (!canonical || !draft || draft.conflict || !characterLimits) return null;
    if (canonical.plans.length !== Object.keys(characterLimits).length) return null;
    for (let index = 0; index < canonical.plans.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(characterLimits, canonical.plans[index].code)) return null;
    }
    return {
      expected_revision: canonical.revision,
      character_limits: characterLimits
    };
  }

  function failureKind(error) {
    return error && error.status === 409 ? "conflict" : "error";
  }

  function markConflict(draft) {
    if (!draft) return draft;
    return { revision: draft.revision, conflict: true, rows: draft.rows };
  }

  return {
    MAX_LIMIT,
    DEFAULT_LIMIT,
    normalizeSnapshot,
    createDraft,
    setUnlimited,
    setInput,
    rowError,
    errorKey,
    isDirty,
    canSave,
    savePayload,
    failureKind,
    markConflict
  };
});
