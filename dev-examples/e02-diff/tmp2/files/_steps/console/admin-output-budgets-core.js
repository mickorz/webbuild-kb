(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AdminOutputBudgetsCore = api;
})(typeof window !== 'undefined' ? window : this, function () {
  const MAX = 2147483647;
  const OPERATIONS = ['world_build', 'character_build', 'character_create', 'story_plan_build',
    'outline_build', 'chapter_generate', 'chapter_polish', 'post_hoc', 'field_rewrite'];
  const FIELDS = ['max_output_tokens_per_call', 'max_completion_tokens'];
  const validCap = value => value === null || (Number.isInteger(value) && value > 0 && value <= MAX);

  function normalize(value) {
    if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
      !Array.isArray(value.operations) || value.operations.length !== OPERATIONS.length) return null;
    const seen = new Set();
    for (const row of value.operations) {
      if (!row || !OPERATIONS.includes(row.operation) || seen.has(row.operation) ||
        !FIELDS.every(field => validCap(row[field]))) return null;
      seen.add(row.operation);
    }
    return { revision: value.revision, operations: OPERATIONS.map(operation => {
      const row = value.operations.find(item => item.operation === operation);
      return { operation, max_output_tokens_per_call: row.max_output_tokens_per_call,
        max_completion_tokens: row.max_completion_tokens };
    }) };
  }

  function createDraft(value) {
    const canonical = normalize(value);
    return canonical ? canonical.operations.map(row => {
      const draft = { operation: row.operation };
      FIELDS.forEach(field => { draft[field] = { inherit: row[field] === null, text: row[field] === null ? '' : String(row[field]) }; });
      return draft;
    }) : null;
  }

  function fieldError(value) {
    if (value && value.inherit) return false;
    return !value || !/^[1-9]\d*$/.test(value.text) || !validCap(Number(value.text));
  }

  function serialize(saved, draft) {
    if (!saved || !Array.isArray(draft) || draft.length !== OPERATIONS.length) return null;
    const operations = [];
    for (let i = 0; i < OPERATIONS.length; i += 1) {
      const row = draft[i];
      if (!row || row.operation !== OPERATIONS[i] || FIELDS.some(field => fieldError(row[field]))) return null;
      const result = { operation: row.operation };
      FIELDS.forEach(field => { result[field] = row[field].inherit ? null : Number(row[field].text); });
      operations.push(result);
    }
    return { expected_revision: saved.revision, operations };
  }

  function dirty(saved, draft) {
    return !!saved && JSON.stringify(createDraft(saved)) !== JSON.stringify(draft);
  }

  function update(draft, operation, field, changes) {
    if (!FIELDS.includes(field)) return draft;
    return draft.map(row => row.operation === operation ? { ...row, [field]: { ...row[field], ...changes } } : row);
  }

  function followCore(draft) {
    return draft.map(row => ({ operation: row.operation,
      max_output_tokens_per_call: { inherit: true, text: '' },
      max_completion_tokens: { inherit: true, text: '' } }));
  }

  return { MAX, OPERATIONS, FIELDS, normalize, createDraft, fieldError, serialize, dirty, update, followCore };
});
