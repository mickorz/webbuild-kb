(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AdminModelControls = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  function paramsForSchema(schema, current) {
    const params = {};
    const removed = [];
    Object.entries(current || {}).forEach(([name, original]) => {
      const field = schema[name];
      let value = original;
      let valid = !!field;
      if (valid && value == null) {
        valid = !!field.nullable || field.type === 'json_mode' || name === 'reasoning_effort';
      } else if (valid && field.type === 'select') {
        value = (field.aliases || {})[value] || value;
        valid = (field.options || []).includes(value);
      } else if (valid && field.type === 'boolean') {
        valid = typeof value === 'boolean';
      } else if (valid && (field.type === 'number' || field.type === 'range')) {
        valid = typeof value === 'number' && Number.isFinite(value)
          && (field.min == null || value >= field.min) && (field.max == null || value <= field.max);
      } else if (valid && field.type === 'json_mode') {
        valid = value && value.type === 'json_object' && Object.keys(value).length === 1;
      }
      if (!valid) removed.push(name);
      else if (!(name === 'reasoning_effort' && value == null)) params[name] = value;
    });
    // Existing budget-mode configurations retain their runtime meaning.
    const effort = schema.reasoning_effort || {};
    if ((effort.exclusive_with || []).some(name => params[name] != null)) {
      delete params.reasoning_effort;
    }
    return { params, removed };
  }

  function updateParam(schema, current, name, value) {
    const params = { ...current };
    if (value === undefined) delete params[name];
    else params[name] = value;
    if (value != null) (schema[name].exclusive_with || []).forEach(other => {
      if (schema[other] && schema[other].nullable) params[other] = null;
      else delete params[other];
    });
    return params;
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === 'object') return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, stableValue(value[key])])
    );
    return value;
  }

  function configurationKey(catalog, entry) {
    return JSON.stringify(stableValue([
      entry.model_ref, entry.model_params || {},
      (catalog.model_capabilities || {})[entry.model_ref] || {},
    ]));
  }

  function effortValue(schema, params) {
    const field = schema.reasoning_effort || {};
    if ((field.exclusive_with || []).some(name => params[name] != null)) return '';
    const value = params.reasoning_effort;
    return (field.aliases || {})[value] || value || '';
  }

  return { paramsForSchema, updateParam, configurationKey, effortValue };
});
