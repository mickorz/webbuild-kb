(function (root, factory) {
  const api = factory(root && root.AssistantCustomSettingsCore);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CustomSettingsEditorCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function (schemaCore) {
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const pointer = (path, key) => path + '/' + String(key).replace(/~/g, '~0').replace(/\//g, '~1');
  const initial = schema => schema.type === 'object' ? {} : schema.type === 'array' ? [] : schema.type === 'string' ? '' : undefined;
  const itemLimit = schema => schemaCore ? schemaCore.itemLimit(schema) : Math.min(schema.maxItems ?? 100000, 100000);
  const textLimit = schema => schemaCore ? schemaCore.textLimit(schema) : Math.min(schema.maxLength ?? 1000000, 1000000);
  function field(value, key, next) {
    const result = { ...value };
    if (next === undefined) delete result[key];
    else Object.defineProperty(result, key, { value: next, enumerable: true, configurable: true, writable: true });
    return result;
  }

  // Numeric inputs keep incomplete text in the draft; only a valid submission becomes JSON numbers.
  function prepare(schema, draft) {
    const issues = [];
    const add = (path, code, limit) => issues.push({ path, code, limit });
    function visit(rule, value, path, required) {
      if (value === undefined) {
        if (required) add(path, 'missing_required');
        return undefined;
      }
      if (rule.type === 'object') {
        if (!object(value)) { add(path, 'type_mismatch'); return value; }
        const result = {};
        for (const [key, child] of Object.entries(rule.properties || {})) {
          const next = visit(child, own(value, key) ? value[key] : undefined, pointer(path, key), (rule.required || []).includes(key));
          if (next !== undefined) Object.defineProperty(result, key, { value: next, enumerable: true });
        }
        for (const key of Object.keys(value)) if (!own(rule.properties || {}, key)) add(pointer(path, key), 'extra_field');
        return result;
      }
      if (rule.type === 'array') {
        if (!Array.isArray(value)) { add(path, 'type_mismatch'); return value; }
        if (value.length < (rule.minItems || 0)) add(path, 'too_few_items', rule.minItems);
        const maximum = itemLimit(rule);
        if (value.length > maximum) add(path, 'too_many_items', maximum);
        return value.map((item, index) => visit(rule.items, item, pointer(path, index), true));
      }
      if (rule.type === 'number' || rule.type === 'integer') {
        if (typeof value === 'string' && /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) value = Number(value);
        if (typeof value !== 'number' || !Number.isFinite(value)
          || (Number.isInteger(value) && !Number.isSafeInteger(value))
          || (rule.type === 'integer' && !Number.isSafeInteger(value))) add(path, rule.type === 'integer' ? 'integer_required' : 'number_required');
        else {
          if (rule.minimum !== undefined && value < rule.minimum) add(path, 'minimum', rule.minimum);
          if (rule.maximum !== undefined && value > rule.maximum) add(path, 'maximum', rule.maximum);
        }
      } else if (rule.type === 'string') {
        if (typeof value !== 'string') add(path, 'type_mismatch');
        else {
          let length = 0;
          for (const character of value) length += 1;
          if (length < (rule.minLength || 0)) add(path, 'too_short', rule.minLength);
          const maximum = textLimit(rule);
          if (length > maximum) add(path, 'too_long', maximum);
        }
      } else if (rule.type === 'boolean') {
        if (typeof value !== 'boolean') add(path, 'type_mismatch');
      } else add(path, 'invalid_schema');
      if (Array.isArray(rule.enum) && !rule.enum.some(item => item === value)) add(path, 'enum_mismatch');
      return value;
    }
    const content = visit(schema, draft, '', true);
    return { content, issues };
  }

  function failure(error) {
    const detail = error && error.body && error.body.detail;
    const data = object(detail) ? detail : {};
    return { status: error && error.status, code: data.error || data.code,
      issues: Array.isArray(data.details && data.details.issues) ? data.details.issues : [] };
  }

  async function read(api, bookId, definitionRef) {
    const definition = await readDefinition(api, bookId, definitionRef);
    return { definition, draft: clone(definition.content) };
  }

  async function readDefinition(api, bookId, definitionRef) {
    const definition = await api.bookCustomSettingDefinition(bookId, definitionRef);
    if (!definition || definition.definition_ref !== definitionRef || definition.status !== 'active'
      || !Number.isInteger(definition.version) || definition.version < 1 || !object(definition.json_schema) || !object(definition.content)) throw new Error('invalid_definition');
    return definition;
  }

  // A failed/uncertain response retries the exact same payload with the same key.
  function attempt(session, content, previous, newKey) {
    const body = { content, base_version: session.definition.version };
    const signature = JSON.stringify(body);
    if (previous && previous.signature === signature) return previous;
    return { signature, body, key: newKey() };
  }
  return { own, clone, pointer, initial, field, prepare, failure, read, readDefinition, attempt, itemLimit, textLimit };
});
