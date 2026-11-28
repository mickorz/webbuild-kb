(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantCustomSettingsCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const OPERATIONS = new Set([
    "create_definition", "update_definition", "remove_definition", "restore_definition"
  ].map((name) => "custom_settings_" + name));
  const TYPES = new Set(["string", "number", "integer", "boolean", "object", "array"]);
  const CONTAINER_TYPES = new Set(["object", "array"]);
  const MAX_CONTAINER_DEPTH = 32;
  const MAX_SCHEMA_FIELDS = 10000;
  const MAX_ENUM_ITEMS = 10000;
  const MAX_ARRAY_ITEMS = 100000;
  const MAX_TEXT_CHARS = 1000000;
  const DISPLAY_PAGE_SIZE = 100;
  const CONSTRAINTS = ["minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems"];
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const object = (value) => value && typeof value === "object" && !Array.isArray(value);
  const itemLimit = (schema) => Math.min(schema.maxItems ?? MAX_ARRAY_ITEMS, MAX_ARRAY_ITEMS);
  const textLimit = (schema) => Math.min(schema.maxLength ?? MAX_TEXT_CHARS, MAX_TEXT_CHARS);

  function allowsEmptyText(rule) {
    const minimum = rule.minLength ?? (rule.constraints || []).find(item => item.key === "minLength")?.value ?? 0;
    return rule.type === "string" && minimum === 0 && (!Array.isArray(rule.enum) || rule.enum.includes(""));
  }

  function presenceKey(row) {
    return !row.required ? "" : allowsEmptyText(row) ? "asst_custom_required_empty_allowed" : "asst_custom_required";
  }

  function nextContainerDepth(child, depth) {
    return child && CONTAINER_TYPES.has(child.type) ? depth + 1 : depth;
  }

  function operation(action) {
    return action && (action.operation || (action.arguments || {}).operation) || "";
  }

  function isCustomAction(action) { return OPERATIONS.has(operation(action)); }

  function needsReview(action) {
    return isCustomAction(action) && ["pending", "pending_confirmation"].includes(action.state)
      && !action.continuation_pending;
  }

  function identity(action) {
    return action && action.id && action.arguments_hash ? action.id + ":" + action.arguments_hash : "";
  }

  function pointerToken(value) {
    return String(value).replace(/~/g, "~0").replace(/\//g, "~1");
  }

  function pointerJoin(base, key) {
    return (base || "") + "/" + pointerToken(key);
  }

  function orderedProperties(schema) {
    const properties = schema.properties || {};
    const keys = Object.keys(properties);
    const order = schema.propertyOrder;
    if (order !== undefined && (!Array.isArray(order) || order.length !== keys.length
      || new Set(order).size !== keys.length || order.some(key => typeof key !== "string" || !own(properties, key)))) {
      throw new Error("invalid_property_order");
    }
    return (order || keys).map(key => [key, properties[key]]);
  }

  function schemaRows(schema, path, depth, rows, label, required, containerDepth, budget) {
    const containers = containerDepth == null ? depth : containerDepth;
    const counted = budget || { fields: 0 };
    if (!object(schema) || !TYPES.has(schema.type) || containers > MAX_CONTAINER_DEPTH) {
      throw new Error("invalid_schema");
    }
    if ((own(schema, "title") && typeof schema.title !== "string")
      || (own(schema, "description") && typeof schema.description !== "string")) throw new Error("invalid_schema");
    const row = {
      path, label: schema.title || label, type: schema.type, required,
      description: schema.description || "", constraints: [], depth
    };
    CONSTRAINTS.forEach((key) => {
      if (own(schema, key)) {
        if (!Number.isFinite(schema[key])) throw new Error("invalid_schema");
        row.constraints.push({ key, value: schema[key] });
      }
    });
    if (own(schema, "enum")) {
      if (!Array.isArray(schema.enum) || schema.enum.length > MAX_ENUM_ITEMS
        || schema.enum.some((item) => !["string", "boolean", "number"].includes(typeof item))) throw new Error("invalid_schema");
      row.enum = schema.enum;
    }
    rows.push(row);
    if (schema.type === "object") {
      const properties = own(schema, "properties") ? schema.properties : {};
      if (!object(properties) || schema.additionalProperties !== false) throw new Error("invalid_schema");
      counted.fields += Object.keys(properties).length;
      if (counted.fields > MAX_SCHEMA_FIELDS) throw new Error("invalid_schema");
      const requiredKeys = new Set(schema.required || []);
      orderedProperties(schema).forEach(([key, child]) => {
        schemaRows(
          child,
          pointerJoin(path, key),
          depth + 1,
          rows,
          key,
          requiredKeys.has(key),
          nextContainerDepth(child, containers),
          counted
        );
      });
    } else if (schema.type === "array") {
      schemaRows(
        schema.items,
        pointerJoin(path, "items"),
        depth + 1,
        rows,
        "",
        false,
        nextContainerDepth(schema.items, containers),
        counted
      );
    }
    return rows;
  }

  function valueTree(schema, value, present, depth, path, containerDepth) {
    if (!present) return { kind: "missing" };
    const containers = containerDepth == null ? depth : containerDepth;
    if (containers > MAX_CONTAINER_DEPTH) throw new Error("invalid_content");
    const pointer = path || "";
    if (schema.type === "object") {
      const properties = schema.properties || {};
      if (!object(value) || Object.keys(value).some((key) => !own(properties, key))) throw new Error("invalid_content");
      return { kind: "object", path: pointer, rows: orderedProperties(schema).map(([key, child]) => {
        const childPath = pointerJoin(pointer, key);
        return {
          key,
          path: childPath,
          label: child.title || key,
          value: valueTree(
            child,
            value[key],
            own(value, key),
            depth + 1,
            childPath,
            nextContainerDepth(child, containers)
          )
        };
      }) };
    }
    if (schema.type === "array") {
      if (!Array.isArray(value) || value.length > itemLimit(schema)) throw new Error("invalid_content");
      return {
        kind: "list",
        path: pointer,
        items: value.map((item) => valueTree(
          schema.items,
          item,
          true,
          depth + 1,
          pointer,
          nextContainerDepth(schema.items, containers)
        ))
      };
    }
    if ((schema.type === "string" && typeof value !== "string")
      || (schema.type === "boolean" && typeof value !== "boolean")
      || (["integer", "number"].includes(schema.type) && (typeof value !== "number" || !Number.isFinite(value)))) {
      throw new Error("invalid_content");
    }
    if (schema.type === "integer" && !Number.isSafeInteger(value)) throw new Error("invalid_content");
    return { kind: schema.type, path: pointer, value };
  }

  function snapshot(value) {
    if (value === null) return null;
    if (!object(value) || !object(value.definition) || own(value, "entries")) throw new Error("invalid_snapshot");
    const definition = value.definition;
    if (typeof definition.name !== "string" || typeof definition.content_spec !== "string"
      || typeof definition.enabled_for_generation !== "boolean" || !Number.isInteger(definition.sort_order)
      || definition.json_schema?.type !== "object" || !object(definition.content)) throw new Error("invalid_definition");
    const rows = schemaRows(definition.json_schema, "", 1, [], definition.name, false);
    return { definition, rows, value: valueTree(definition.json_schema, definition.content, true, 1, "/content") };
  }

  function reviewModel(action, review) {
    if (!isCustomAction(action) || !identity(action) || !object(review)
      || review.action_id !== action.id || review.arguments_hash !== action.arguments_hash
      || review.operation !== operation(action)) return null;
    try {
      const before = snapshot(review.before);
      const after = snapshot(review.after);
      const verb = operation(action).replace("custom_settings_", "").split("_")[0];
      if (verb === "create" ? after === null || before !== null
        : verb === "remove" ? before === null || after !== null
          : before === null || after === null) return null;
      return { before, after, status: review.status, canConfirm: review.status === "ready" && review.can_confirm === true };
    } catch (_) { return null; }
  }

  function canConfirm(action, review) {
    const model = reviewModel(action, review);
    return needsReview(action) && !!(model && model.canConfirm);
  }

  function messageKey(action, review, error) {
    if (review && review.status === "expired") return "asst_proposal_expired";
    if (error) return "asst_custom_unavailable";
    if (review && review.status === "version_conflict") return "asst_custom_conflict";
    const model = reviewModel(action, review);
    return model && model.canConfirm ? null : "asst_custom_unavailable";
  }

  return {
    isCustomAction, needsReview, identity, operation, reviewModel, canConfirm, messageKey,
    snapshot, orderedProperties, schemaRows, valueTree, pointerToken, pointerJoin, nextContainerDepth, MAX_CONTAINER_DEPTH,
    MAX_SCHEMA_FIELDS, MAX_ENUM_ITEMS, MAX_ARRAY_ITEMS, MAX_TEXT_CHARS, DISPLAY_PAGE_SIZE,
    allowsEmptyText, presenceKey, itemLimit, textLimit
  };
});
