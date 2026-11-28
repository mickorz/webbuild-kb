(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CustomSettingsCore = api;
})(typeof globalThis === "object" ? globalThis : this, function (root) {
  const PAGE_SIZE = 20;
  // Read the bounded category catalog in one page when possible.
  const DEFINITION_PAGE_SIZE = 50;
  const OWNER = "custom-settings-page";
  const RESOURCE_DEFINITION = "custom_setting_definition";
  const REFERENCE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const object = (value) => value && typeof value === "object" && !Array.isArray(value);

  function assistantCore() {
    return (root && root.AssistantCustomSettingsCore)
      || (typeof window !== "undefined" && window.AssistantCustomSettingsCore)
      || {};
  }

  function pointerToken(value) {
    const core = assistantCore();
    if (typeof core.pointerToken === "function") return core.pointerToken(value);
    return String(value).replace(/~/g, "~0").replace(/\//g, "~1");
  }

  function pointerJoin(base, key) {
    const core = assistantCore();
    if (typeof core.pointerJoin === "function") return core.pointerJoin(base, key);
    return (base || "") + "/" + pointerToken(key);
  }

  function text(zh, en) {
    const host = (typeof window !== "undefined" && window) || root || {};
    if (typeof host.L === "function") return host.L({ zh, en });
    return host.CLANG === "en" ? en : zh;
  }

  function isAbort(error) {
    return !!(error && (error.name === "AbortError" || error.code === "ABORT_ERR"));
  }

  function eventDetail(event) {
    if (!event) return null;
    if (object(event.detail)) return event.detail;
    return object(event) ? event : null;
  }

  function eventApplies(bookId, event) {
    const detail = eventDetail(event);
    return !!(detail && bookId && String(detail.bookId) === String(bookId));
  }

  function requireApi(api, name) {
    if (!api || typeof api[name] !== "function") throw new Error("missing_api");
    return api[name].bind(api);
  }

  function listShape(result, itemsKey, offset = 0) {
    const items = result && result[itemsKey || "items"];
    if (!object(result) || !Array.isArray(items) || items.some((item) => !object(item))
      || typeof result.has_more !== "boolean"
      || (result.has_more && (!items.length || !Number.isInteger(result.next_offset) || result.next_offset <= offset))) {
      throw new Error("invalid_page");
    }
    return { items, has_more: result.has_more, next_offset: result.next_offset ?? null };
  }

  function checkResource(value, key, expected) {
    if (!object(value) || !REFERENCE.test(value[key]) || (expected && value[key] !== expected)) {
      throw new Error("resource_ref_mismatch");
    }
    return value;
  }



  function mergeItems(existing, items, key) {
    const merged = new Map(existing.map((item) => [item[key], item]));
    items.forEach((item) => merged.set(item[key], item));
    return Array.from(merged.values());
  }

  function categorySummary(item) {
    return Object.fromEntries(["definition_ref", "name", "status", "enabled_for_generation", "version", "sort_order"]
      .filter(key => own(item, key)).map(key => [key, item[key]]));
  }

  async function collectUntil(fetchPage, options) {
    const opts = options || {};
    const limit = Number.isInteger(opts.limit) ? opts.limit : PAGE_SIZE;
    const match = typeof opts.match === "function" ? opts.match : null;
    const items = [];
    let offset = 0;
    let hasMore = true;
    let nextOffset = 0;
    const maxPages = match ? 60 : 1;
    for (let page = 0; page < maxPages; page += 1) {
      if (opts.isCurrent && !opts.isCurrent()) return { stale: true, items, has_more: hasMore, next_offset: nextOffset };
      const result = listShape(await fetchPage({ limit, offset, signal: opts.signal }), undefined, offset);
      items.push.apply(items, result.items);
      hasMore = result.has_more;
      nextOffset = result.next_offset;
      if (match && items.some(match)) break;
      if (!hasMore || !match) break;
      offset = Number.isInteger(nextOffset) ? nextOffset : items.length;
    }
    return { items, has_more: hasMore, next_offset: nextOffset, stale: false };
  }

  function createController() {
    let generation = 0;
    let abort = null;
    return {
      begin() {
        generation += 1;
        if (abort) abort.abort();
        abort = new AbortController();
        const id = generation;
        const signal = abort.signal;
        return {
          id,
          signal,
          isCurrent() { return id === generation; }
        };
      },
      current() { return generation; },
      isCurrent(id) { return id === generation; },
      invalidate() {
        generation += 1;
        if (abort) abort.abort();
        abort = null;
      }
    };
  }

  function extraKeys(schema, value) {
    const properties = object(schema) && object(schema.properties) ? schema.properties : {};
    if (!object(value)) return [];
    return Object.keys(value).filter((key) => !own(properties, key));
  }

  function nextContainerDepth(child, depth) {
    const core = assistantCore();
    if (typeof core.nextContainerDepth === "function") return core.nextContainerDepth(child, depth);
    return child && (child.type === "object" || child.type === "array") ? depth + 1 : depth;
  }

  function maxContainerDepth() {
    const core = assistantCore();
    return Number.isInteger(core.MAX_CONTAINER_DEPTH) ? core.MAX_CONTAINER_DEPTH : 32;
  }

  function genericTree(value, depth = 0) {
    if (depth > maxContainerDepth()) return { kind: "unparsed", value: JSON.stringify(value) };
    if (value === undefined) return { kind: "missing" };
    if (value === null) return { kind: "unparsed", value: null };
    if (Array.isArray(value)) return { kind: "list", items: value.map((item) => genericTree(item, depth + 1)) };
    if (typeof value === "object") {
      return {
        kind: "object",
        rows: Object.keys(value).map((key) => ({
          key,
          path: pointerJoin("", key),
          label: key,
          unknown: true,
          value: genericTree(value[key], depth + 1)
        }))
      };
    }
    if (typeof value === "boolean") return { kind: "boolean", value };
    if (typeof value === "number") return { kind: Number.isInteger(value) ? "integer" : "number", value };
    return { kind: "string", value: String(value) };
  }

  function lenientTree(schema, value, problems, depth, path, containerDepth) {
    const pointer = path || "";
    const visual = depth || 1;
    const containers = containerDepth == null ? visual : containerDepth;
    if (value === undefined) return { kind: "missing" };
    if (containers > maxContainerDepth()) {
      problems.push({ code: "too_deep", path: pointer });
      return genericTree(value);
    }
    if (!object(schema) || !["object", "array", "string", "boolean", "integer", "number"].includes(schema.type)) {
      problems.push({ code: "invalid_schema", path: pointer });
      return genericTree(value);
    }
    if (schema.type === "object") {
      if (!object(value)) {
        problems.push({ code: "invalid_content", path: pointer });
        return genericTree(value);
      }
      const properties = object(schema.properties) ? schema.properties : {};
      const rows = assistantCore().orderedProperties(schema).map(([key, child]) => {
        const childPath = pointerJoin(pointer, key);
        return {
          key,
          path: childPath,
          label: (child && child.title) || key,
          value: lenientTree(child, value[key], problems, visual + 1, childPath, nextContainerDepth(child, containers))
        };
      });
      extraKeys(schema, value).forEach((key) => {
        const childPath = pointerJoin(pointer, key);
        problems.push({ code: "unknown_field", key, path: childPath });
        rows.push({
          key,
          path: childPath,
          label: key,
          unknown: true,
          value: genericTree(value[key])
        });
      });
      return { kind: "object", path: pointer, rows };
    }
    if (schema.type === "array") {
      if (!Array.isArray(value)) {
        problems.push({ code: "invalid_content", path: pointer });
        return genericTree(value);
      }
      return {
        kind: "list",
        path: pointer,
        items: value.map((item) => lenientTree(
          schema.items,
          item,
          problems,
          visual + 1,
          pointer,
          nextContainerDepth(schema.items, containers)
        ))
      };
    }
    if ((schema.type === "string" && typeof value !== "string")
      || (schema.type === "boolean" && typeof value !== "boolean")
      || (["integer", "number"].includes(schema.type) && (typeof value !== "number" || !Number.isFinite(value)))
      || (schema.type === "integer" && !Number.isSafeInteger(value))) {
      problems.push({ code: "invalid_content", path: pointer });
      return genericTree(value);
    }
    if (schema.type === "boolean") return { kind: "boolean", path: pointer, value };
    return { kind: schema.type, path: pointer, value };
  }

  function firstStringKey(schema, value) {
    if (!object(schema) || !object(value) || !object(schema.properties)) return "";
    const required = Array.isArray(schema.required) ? schema.required : [];
    const keys = required.concat(Object.keys(schema.properties));
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const child = schema.properties[key];
      if (child && child.type === "string" && !child.enum && typeof value[key] === "string" && value[key]) return key;
    }
    return "";
  }

  // The title reuses one top-level text field; the reader hides that row so the value is not shown twice.








  function fieldTable(definition) {
    const core = assistantCore();
    try {
      if (typeof core.schemaRows !== "function") throw new Error("invalid_schema");
      const rows = core.schemaRows(definition.json_schema, "", 1, [], definition.name, false);
      return { rows: rows.filter((row) => row.path !== ""), incomplete: false };
    } catch (error) {
      return { rows: [], incomplete: true };
    }
  }

  // Revision diffs label values by field title instead of storage key.
  function labeledContent(schema, value, depth = 0) {
    if (depth > maxContainerDepth() || !object(schema)) return value;
    if (schema.type === "object" && object(value)) {
      const properties = object(schema.properties) ? schema.properties : {};
      const result = {};
      Object.keys(value).forEach((key) => {
        const child = properties[key];
        const label = child && child.title ? child.title : key;
        const name = own(result, label) ? label + " (" + key + ")" : label;
        Object.defineProperty(result, name, { value: labeledContent(child, value[key], depth + 1), enumerable: true });
      });
      return result;
    }
    if (schema.type === "array" && Array.isArray(value)) return value.map((item) => labeledContent(schema.items, item, depth + 1));
    return value;
  }

  // Undoing a removal restores the version saved just before the latest remove revision.


  function displayDefinition(definition) {
    const core = assistantCore();
    const problems = [];
    try {
      const model = core.snapshot({ definition });
      return { rows: model.rows, tree: model.value, problems, incomplete: false };
    } catch (error) {
      let tree;
      try { tree = lenientTree(definition && definition.json_schema, definition && definition.content, problems, 1, "/content"); }
      catch (_) { tree = genericTree(definition && definition.content); }
      if (!problems.length) problems.push({ code: "invalid_schema" });
      return { rows: [], tree, problems, incomplete: true };
    }
  }




  function askCreateDefinition(example) {
    if (typeof example === "string" && example) {
      return {
        prompt: text(
          "请为当前作品新建一个「" + example + "」设定类别，先和我确定字段结构、内容规范和是否用于后续生成。",
          "Create a \"" + example + "\" custom-setting category for this book. Agree on the fields, content rules, and whether later generation may use it first."
        )
      };
    }
    return {
      prompt: text(
        "请为当前作品新建一个自定义设定类别，先确定结构、内容规范和是否用于后续生成。",
        "Create a new custom-setting category for this book. Specify the structure, content rules, and whether later generation may use it."
      )
    };
  }

  function askGenerateContent(definitionRef) {
    return {
      resource_type: RESOURCE_DEFINITION, resource_key: definitionRef,
      prompt: text("请读取这个类别的结构、内容规范和完整内容，补充或完善设定，先给出待确认的完整文档提案。",
        "Read this category's structure, rules and complete content, then propose a complete document with the requested additions or improvements.")
    };
  }


  function editModeLabel(mode) {
    return {
      create: text("创建", "Created"),
      update: text("修改", "Updated"),
      remove: text("移除", "Removed"),
      restore: text("恢复", "Restored"),
      rollback: text("恢复", "Restored")
    }[mode] || text("保存", "Saved");
  }

  function askUpdateDefinition(definitionRef) {
    return {
      resource_type: RESOURCE_DEFINITION,
      resource_key: definitionRef,
      prompt: text("请读取该设定类别的当前结构与完整内容后提出修改提案。类别可直接组合文本、列表和对象，无需条目层；请同时提交调整后的结构和完整内容。", "Read this category's current structure, then propose an update.")
    };
  }

  function askRemoveDefinition(definitionRef) {
    return {
      resource_type: RESOURCE_DEFINITION,
      resource_key: definitionRef,
      prompt: text("请移除该设定类别。确认前不要写入。", "Remove this custom-setting category. Do not write before confirmation.")
    };
  }







  function askRestore(resourceType, resourceKey, version) {
    return {
      resource_type: resourceType,
      resource_key: resourceKey,
      prompt: text(
        "请将此对象恢复为版本 " + version + "。请先读取当前最新版本，再生成待确认的恢复提案，不要直接写入。",
        "Restore this object to version " + version + ". Read the latest version first and generate a confirmation proposal; do not write it directly."
      )
    };
  }

  function askField(resourceType, resourceKey, fieldPath) {
    return {
      resource_type: resourceType,
      resource_key: resourceKey,
      field_path: fieldPath,
      prompt: text("请查看并按需要修改该字段。", "Review this field and change it if needed.")
    };
  }

  function historySnapshot(kind, detail, side) {
    if (kind !== "definition") return { error: "invalid_revision" };
    const definition = detail && detail[side];
    if (!definition) return null;
    try { return assistantCore().snapshot({ definition }); }
    catch (_) { return { error: "invalid_snapshot", definition }; }
  }


  function historyModel(kind, detail) {
    if (!object(detail)) return { error: "invalid_revision" };
    return {
      revision_ref: detail.revision_ref,
      version: detail.version,
      base_version: detail.base_version,
      edit_mode: detail.edit_mode,
      reason: detail.reason,
      created_at: detail.created_at,
      before: historySnapshot(kind, detail, "before"),
      after: historySnapshot(kind, detail, "after")
    };
  }



  async function loadCatalog(api, request, token) {
    const bookId = request.bookId;
    const includeRemoved = !!request.includeRemoved;
    const wantedDefinition = request.target?.definition_ref || request.selectedDefinitionRef || null;
    if (wantedDefinition && !REFERENCE.test(wantedDefinition)) throw new Error("invalid_target");
    const list = requireApi(api, "bookCustomSettingDefinitions");
    const get = requireApi(api, "bookCustomSettingDefinition");
    const definitions = await collectUntil(page => list(bookId, { include_removed: includeRemoved, ...page }), {
      limit: DEFINITION_PAGE_SIZE,
      signal: token.signal, isCurrent: token.isCurrent
    });
    if (definitions.stale || !token.isCurrent()) return { stale: true };
    definitions.items.forEach(item => checkResource(item, "definition_ref"));
    definitions.items = definitions.items.map(categorySummary);
    const selected = wantedDefinition || definitions.items[0]?.definition_ref;
    const definition = selected ? checkResource(await get(bookId, selected, { signal: token.signal }), "definition_ref", selected) : null;
    if (!token.isCurrent()) return { stale: true };
    if (definition) definitions.items = mergeItems(definitions.items, [categorySummary(definition)], "definition_ref");
    return { bookId, definitions, definition, includeRemoved };
  }


  async function loadPage(api, request, controller) {
    const token = controller.begin();
    try {
      let result = await loadCatalog(api, request, token);
      if (result.stale || !token.isCurrent()) return { ignored: true, token };
      return { ok: true, token, ...result };
    } catch (error) {
      if (!token.isCurrent() || isAbort(error)) return { ignored: true, token, error };
      return { ok: false, token, error };
    }
  }

  async function loadMore(api, request, current, kind, controller) {
    const id = controller.current();
    if (!controller.isCurrent(id) || !current) return { ignored: true };
    const bookId = request.bookId;
    const includeRemoved = !!request.includeRemoved;
    const signal = request.signal;
    try {
      const offset = current.next_offset ?? current.items.length;
      if (kind === "definitions") {
        if (!current.has_more) return { ignored: true };
        const fetch = requireApi(api, "bookCustomSettingDefinitions");
        const page = listShape(await fetch(bookId, {
          include_removed: includeRemoved,
          limit: DEFINITION_PAGE_SIZE,
          offset,
          signal
        }), undefined, offset);
        page.items.forEach((item) => checkResource(item, "definition_ref"));
        if (!controller.isCurrent(id)) return { ignored: true };
        return {
          ok: true,
          items: mergeItems(current.items, page.items.map(categorySummary), "definition_ref"),
          has_more: page.has_more,
          next_offset: page.next_offset
        };
      }
      return { ignored: true };
    } catch (error) {
      if (!controller.isCurrent(id) || isAbort(error)) return { ignored: true, error };
      return { ok: false, error };
    }
  }

  async function loadRevisions(api, bookId, kind, ref, options, controller) {
    const opts = options || {};
    const id = controller ? controller.current() : 0;
    const fetch = requireApi(api, "bookCustomSettingRevisions");
    const result = await fetch(bookId, kind, ref, {
      limit: Number.isInteger(opts.limit) ? opts.limit : PAGE_SIZE,
      offset: Number.isInteger(opts.offset) ? opts.offset : 0,
      signal: opts.signal
    });
    if (controller && !controller.isCurrent(id)) return { ignored: true };
    const page = listShape(result, "revisions", opts.offset || 0);
    page.items.forEach((item) => {
      checkResource(item, "revision_ref");
      if (!Number.isInteger(item.version) || item.version < 1) throw new Error("invalid_revision");
    });
    return { ok: true, revisions: page.items, current_version: result.current_version,
      has_more: page.has_more, next_offset: page.next_offset };
  }

  async function loadRevision(api, bookId, kind, ref, revisionRef, options, controller) {
    const opts = options || {};
    const id = controller ? controller.current() : 0;
    const fetch = requireApi(api, "bookCustomSettingRevision");
    const detail = await fetch(bookId, kind, ref, revisionRef, { signal: opts.signal });
    if (controller && !controller.isCurrent(id)) return { ignored: true };
    checkResource(detail, "revision_ref", revisionRef);
    if (kind !== "definition") throw new Error("invalid_revision_kind");
    const key = "definition_ref";
    checkResource(detail.after, key, ref);
    if (detail.before) checkResource(detail.before, key, ref);
    if (!Number.isInteger(detail.version) || detail.version < 1) throw new Error("invalid_revision");
    return { ok: true, model: historyModel(kind, detail), detail };
  }

  function createLoader(getApi) {
    const controller = createController();
    let lastRequest = null;
    const apiOf = () => (typeof getApi === "function" ? getApi() : getApi);
    return {
      controller,
      abort() { controller.invalidate(); },
      load(request) {
        lastRequest = request;
        return loadPage(apiOf(), request, controller);
      },
      refresh() {
        return lastRequest ? loadPage(apiOf(), lastRequest, controller) : Promise.resolve({ ignored: true });
      },
      moreDefinitions(request, current) {
        return loadMore(apiOf(), request, current, "definitions", controller);
      },
      revisions(bookId, kind, ref, options) {
        return loadRevisions(apiOf(), bookId, kind, ref, options, controller);
      },
      revision(bookId, kind, ref, revisionRef, options) {
        return loadRevision(apiOf(), bookId, kind, ref, revisionRef, options, controller);
      }
    };
  }

  return {
    PAGE_SIZE,
    DEFINITION_PAGE_SIZE,
    OWNER,
    RESOURCE_DEFINITION,
    pointerToken,
    pointerJoin,
    text,
    eventApplies,
    createController,
    createLoader,
    collectUntil,
    loadPage,
    loadMore,
    displayDefinition,
    firstStringKey,
    fieldTable,
    labeledContent,
    editModeLabel,
    historyModel,
    askCreateDefinition,
    askGenerateContent,
    askUpdateDefinition,
    askRemoveDefinition,
    askRestore,
    askField
  };
});
