(function (root) {
  const CHAPTER_DRAFT_TASK_TYPES = [
    "chapter_draft", "chapter_draft_single",
    "chapter_world_state", "chapter_outline_director", "chapter_character_state",
    "chapter_writer_muti", "chapter_writer_single",
    "chapter_full_muti", "chapter_full_single"
  ];
  const WORLD_DIMENSIONS = [
    "core_laws", "space_time", "society", "history_culture", "existence", "information"
  ];
  const WORLD_STAGE_IDS = WORLD_DIMENSIONS.slice();
  const CAST_STAGE_IDS = ["skeleton", "beliefs", "voice", "deep_profile"];
  const WRITER_TASK_TYPES = ["chapter_writer_muti", "chapter_writer_single"];
  const FULL_CHAPTER_TASK_TYPES = [
    "chapter_draft", "chapter_draft_single", "chapter_full_muti", "chapter_full_single"
  ];
  const TERMINAL_OK = ["completed"];
  const TERMINAL_ANY = ["completed", "failed", "cancelled", "canceled"];
  const APPLY_ORDER = [
    "chapters", "chapter_body", "chapter_guide", "chapter_world",
    "hooks", "debts", "world", "world_dimension", "characters", "character",
    "story_plan", "style_profile", "outlines", "outline_pair", "billing", "books"
  ];

  function asString(value) {
    return value == null ? "" : String(value).trim();
  }

  function asNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  function isChapterDraftTask(taskType) {
    return CHAPTER_DRAFT_TASK_TYPES.indexOf(String(taskType || "")) !== -1;
  }

  function taskTypeOf(task) {
    return asString(task && task.task_type);
  }

  function taskStatusOf(task) {
    return asString(task && task.status).toLowerCase();
  }

  function payloadBag(task) {
    const req = task && task.request_payload && typeof task.request_payload === "object"
      ? task.request_payload : {};
    const engine = req.engine_payload && typeof req.engine_payload === "object" ? req.engine_payload : {};
    const cache = task && task.result_cache && typeof task.result_cache === "object" ? task.result_cache : {};
    return { req, engine, cache };
  }

  function firstPositive() {
    for (let i = 0; i < arguments.length; i += 1) {
      const n = asNumber(arguments[i]);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  }

  function firstText() {
    for (let i = 0; i < arguments.length; i += 1) {
      const text = asString(arguments[i]);
      if (text) return text;
    }
    return "";
  }

  function taskBookId(task) {
    return firstText(task && task.book_link_id, task && task.bookId, task && task.book_id);
  }

  function taskChapterNumber(task, extra) {
    const data = extra && extra.data && typeof extra.data === "object" ? extra.data : extra;
    const payload = data && data.payload && typeof data.payload === "object" ? data.payload : {};
    const bag = payloadBag(task);
    return firstPositive(
      payload.chapter_number, payload.chapter,
      data && data.chapter_number, data && data.chapter,
      task && task.chapter_number,
      bag.engine.chapter_number, bag.req.chapter_number, bag.req.chapter,
      bag.cache.chapter_number
    );
  }

  function taskVolumeNumber(task) {
    const bag = payloadBag(task);
    return firstPositive(
      bag.req.volume_number, bag.engine.volume_number, bag.cache.volume_number,
      task && task.volume_number
    );
  }

  function taskCharacterName(task) {
    const bag = payloadBag(task);
    return firstText(
      bag.req.character_name, bag.req.name, bag.req.character,
      bag.engine.character_name, bag.engine.name,
      bag.cache.character_name, bag.cache.name, bag.cache.resource_key,
      task && task.character_name
    );
  }

  function classifyTask(taskType) {
    const t = String(taskType || "");
    if (t === "field_rewrite") return "rewrite";
    if (t === "world_build") return "world";
    if (t === "character" || t === "character_create") return "character";
    if (t === "story_plan") return "story";
    if (t === "outline") return "outline";
    if (isChapterDraftTask(t) || t === "polish" || t === "post_hoc") return "chapter";
    return "unknown";
  }

  function readKey(read) {
    if (!read || !read.kind) return "";
    return [
      read.kind,
      asString(read.bookId),
      read.chapterNumber != null ? String(read.chapterNumber) : "",
      read.volumeNumber != null ? String(read.volumeNumber) : "",
      asString(read.name || read.dimension)
    ].join(":");
  }

  function uniqueReads(reads) {
    const seen = new Set();
    const out = [];
    (Array.isArray(reads) ? reads : []).forEach((read) => {
      const key = readKey(read);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(read);
    });
    return out;
  }

  function withBook(bookId, kind, extra) {
    return Object.assign({ kind: kind, bookId: bookId }, extra || {});
  }

  function chapterContentReads(bookId, chapterNumber, kinds) {
    if (!bookId || !chapterNumber) return [];
    return kinds.map((kind) => withBook(bookId, kind, { chapterNumber: chapterNumber }));
  }

  function chapterStageKinds(taskType, stageId, executionMode) {
    let t = String(taskType || "");
    if (["chapter_draft", "chapter_draft_single"].includes(t)) {
      t = ({ world_state: "chapter_world_state", outline_director: "chapter_outline_director",
        character_state: "chapter_character_state", writer_group: "chapter_writer_single" })[executionMode] || t;
    }
    const stage = String(stageId || "");
    if (stage === "world_ready" || t === "chapter_world_state") return ["chapter_world"];
    if (stage === "guide_ready" || t === "chapter_outline_director") return ["chapter_guide"];
    if (t === "chapter_character_state") return [];
    if (stage === "body_ready" || stage === "polish_ready" || t === "polish" || WRITER_TASK_TYPES.indexOf(t) !== -1) {
      return ["chapter_body"];
    }
    if (stage === "post_hoc_ready" || t === "post_hoc") {
      return ["chapter_guide", "hooks", "debts"];
    }
    if (FULL_CHAPTER_TASK_TYPES.indexOf(t) !== -1) {
      return ["chapter_body", "chapter_guide", "chapter_world"];
    }
    return ["chapter_body", "chapter_guide", "chapter_world"];
  }

  function needsTaskDetail(task, category) {
    if (!task) return false;
    if (category === "rewrite") {
      const bag = payloadBag(task);
      return !Object.keys(bag.engine).length && !bag.req.payload;
    }
    if (category === "outline") return !taskVolumeNumber(task);
    if (category === "chapter") return !taskChapterNumber(task);
    if (taskTypeOf(task) === "character_create") return !taskCharacterName(task);
    return false;
  }

  function editIdentities(plan) {
    const bookId = plan && plan.bookId;
    const reads = plan && Array.isArray(plan.reads) ? plan.reads : [];
    const identities = [];
    reads.forEach((read) => {
      if (read.kind === "world") {
        WORLD_DIMENSIONS.forEach((dimension) => {
          identities.push({ book_id: bookId, resource_type: "world", resource_key: dimension });
        });
      } else if (read.kind === "world_dimension") {
        identities.push({ book_id: bookId, resource_type: "world", resource_key: read.dimension });
      } else if (read.kind === "story_plan") {
        identities.push({ book_id: bookId, resource_type: "book", resource_key: "story_plan" });
      } else if (read.kind === "outline_pair" || read.kind === "outlines") {
        const volume = read.volumeNumber || plan.volumeNumber;
        if (volume) {
          identities.push({ book_id: bookId, resource_type: "outline", resource_key: "volume:" + volume });
          identities.push({ book_id: bookId, resource_type: "outline", resource_key: "near_term:" + volume });
        }
      } else if (read.kind === "chapter_guide" && read.chapterNumber) {
        const padded = String(read.chapterNumber).padStart(4, "0");
        identities.push({
          book_id: bookId,
          resource_type: "chapter",
          resource_key: padded + ":guide"
        });
      } else if (read.kind === "characters" || read.kind === "character") {
        identities.push({
          book_id: bookId,
          resource_type: "character",
          resource_key: read.name || "*"
        });
      }
    });
    return identities;
  }

  function planFromReads(bookId, reads, extra) {
    return Object.assign({
      bookId: bookId || "",
      reads: uniqueReads(reads),
      volumeNumber: 0,
      chapterNumber: 0,
      characterName: "",
      captureNavigation: false,
      balance: false,
      booksSummary: false
    }, extra || {});
  }

  function addBalance(plan, options) {
    const opts = options || {};
    if (opts.balance) {
      plan.balance = true;
      plan.reads.push(withBook(plan.bookId, "billing"));
    }
    if (opts.booksSummary) {
      plan.booksSummary = true;
      plan.reads.push(withBook(plan.bookId, "books"));
    }
    plan.reads = uniqueReads(plan.reads);
    return plan;
  }

  function planTask(task, options) {
    const opts = options || {};
    const bookId = taskBookId(task);
    const type = taskTypeOf(task);
    const category = classifyTask(type);
    const status = taskStatusOf(task);
    if (!bookId) return planFromReads("", []);
    const completed = TERMINAL_OK.indexOf(status) !== -1 || !!opts.forceResources;
    if (TERMINAL_ANY.indexOf(status) !== -1 && !completed) {
      return addBalance(planFromReads(bookId, []), { balance: true });
    }
    if (status && !completed) return planFromReads(bookId, []);
    let reads = [];
    let volumeNumber = taskVolumeNumber(task);
    let chapterNumber = taskChapterNumber(task, opts.event);
    let characterName = taskCharacterName(task);
    let captureNavigation = false;
    if (category === "rewrite") {
      const bag = payloadBag(task);
      const payload = Object.keys(bag.engine).length ? bag.engine : bag.req.payload || {};
      // Body rewrites produce candidates. They do not replace the saved chapter.
      if (!payload.full_context && !payload.rewritable_scope) {
        const resource = payload.resource_type, key = String(payload.resource_key || '');
        if (resource === 'world' && WORLD_DIMENSIONS.includes(key)) reads = [withBook(bookId, 'world_dimension', { dimension: key })];
        else if (resource === 'character' && key) reads = [withBook(bookId, 'character', { name: key })];
        else if (resource === 'book' && key === 'story_plan') reads = [withBook(bookId, 'story_plan')];
        else if (resource === 'outline' && /^(volume|near_term):[1-9][0-9]*$/.test(key)) {
          volumeNumber = Number(key.split(':')[1]);
          reads = [withBook(bookId, 'outline_pair', { volumeNumber })];
        } else if (resource === 'chapter' && /^\d{4,}:guide$/.test(key)) {
          chapterNumber = Number(key.split(':')[0]);
          reads = chapterContentReads(bookId, chapterNumber, ['chapter_guide']).concat(withBook(bookId, 'chapters'));
        }
      }
    } else if (category === "world") {
      reads = [withBook(bookId, "world")];
    } else if (category === "character") {
      if (type === "character_create" && characterName) {
        reads = [withBook(bookId, "character", { name: characterName })];
      } else {
        reads = [withBook(bookId, "characters")];
      }
    } else if (category === "story") {
      reads = [withBook(bookId, "story_plan")];
    } else if (category === "outline") {
      if (volumeNumber) {
        reads = [
          withBook(bookId, "outline_pair", { volumeNumber: volumeNumber })
        ];
      } else {
        reads = [
          withBook(bookId, "outlines")
        ];
      }
    } else if (category === "chapter") {
      const bag = payloadBag(task);
      const kinds = chapterStageKinds(type, opts.stageId, bag.req.execution_mode || bag.engine.execution_mode);
      if (chapterNumber) reads = chapterContentReads(bookId, chapterNumber, kinds);
      reads.push(withBook(bookId, "chapters"));
      captureNavigation = kinds.some(kind => ["chapter_body", "chapter_guide"].includes(kind));
    } else {
      reads = [
        withBook(bookId, "world"),
        withBook(bookId, "characters"),
        withBook(bookId, "story_plan"),
        withBook(bookId, "outlines"),
        withBook(bookId, "chapters")
      ];
      if (opts.selectedChapter) {
        reads = reads.concat(chapterContentReads(bookId, opts.selectedChapter, [
          "chapter_body", "chapter_guide", "chapter_world"
        ]));
        captureNavigation = true;
        chapterNumber = opts.selectedChapter;
      }
    }
    return addBalance(planFromReads(bookId, reads, {
      volumeNumber: volumeNumber,
      chapterNumber: chapterNumber,
      characterName: characterName,
      captureNavigation: captureNavigation,
      category: category,
      taskType: type,
      taskCompleted: status === "completed"
    }), {
      balance: opts.balance !== false && TERMINAL_OK.indexOf(status) !== -1,
      booksSummary: category === "chapter"
    });
  }

  function planStage(task, event) {
    const data = event && event.data && typeof event.data === "object" ? event.data : {};
    const stageId = asString(data.stage_id || (event && event.stage_id));
    const bookId = taskBookId(task);
    if (!bookId || !stageId) return planFromReads(bookId, []);
    const chapterNumber = taskChapterNumber(task, data);
    if (WORLD_STAGE_IDS.indexOf(stageId) !== -1) {
      return planFromReads(bookId, [withBook(bookId, "world_dimension", { dimension: stageId })]);
    }
    if (CAST_STAGE_IDS.indexOf(stageId) !== -1) {
      return planFromReads(bookId, [withBook(bookId, "characters")]);
    }
    if (stageId === "story_plan") {
      return planFromReads(bookId, [withBook(bookId, "story_plan")]);
    }
    if (stageId === "style_profile") {
      return planFromReads(bookId, [withBook(bookId, "style_profile")]);
    }
    if (stageId === "persist_volume" || stageId === "persist_near_term") {
      const volumeNumber = firstPositive(data.payload && data.payload.volume_number, data.volume_number, taskVolumeNumber(task));
      return planFromReads(bookId, [volumeNumber
        ? withBook(bookId, "outline_pair", { volumeNumber })
        : withBook(bookId, "outlines")], { volumeNumber });
    }
    if (stageId === "world_ready" || stageId === "guide_ready" || stageId === "body_ready"
      || stageId === "polish_ready" || stageId === "post_hoc_ready") {
      const bag = payloadBag(task);
      const kinds = chapterStageKinds(taskTypeOf(task), stageId, bag.req.execution_mode || bag.engine.execution_mode);
      const reads = chapterNumber
        ? chapterContentReads(bookId, chapterNumber, kinds)
        : [];
      if (stageId === "body_ready" || stageId === "polish_ready" || stageId === "post_hoc_ready") {
        reads.push(withBook(bookId, "chapters"));
      }
      return planFromReads(bookId, reads, {
        chapterNumber: chapterNumber,
        captureNavigation: kinds.some(kind => ["chapter_body", "chapter_guide"].includes(kind))
      });
    }
    return planFromReads(bookId, []);
  }

  function planChapter(bookId, chapterNumber) {
    const n = firstPositive(chapterNumber);
    return planFromReads(bookId, chapterContentReads(bookId, n, [
      "chapter_body", "chapter_guide", "chapter_world"
    ]).concat([withBook(bookId, "chapters")]), {
      chapterNumber: n,
      captureNavigation: true,
      category: "chapter"
    });
  }

  function planWrite(type, spec) {
    const bookId = spec && spec.bookId;
    const volumeNumber = firstPositive(spec && spec.volumeNumber);
    const chapterNumber = firstPositive(spec && spec.chapterNumber);
    const name = asString(spec && spec.name);
    const dimension = asString(spec && spec.dimension);
    if (type === "world" && dimension) {
      return planFromReads(bookId, [withBook(bookId, "world_dimension", { dimension: dimension })]);
    }
    if (type === "world") return planFromReads(bookId, [withBook(bookId, "world")]);
    if (type === "story_plan") return planFromReads(bookId, [withBook(bookId, "story_plan")]);
    if (type === "character" && name) {
      return planFromReads(bookId, [withBook(bookId, "character", { name: name })]);
    }
    if (type === "character") return planFromReads(bookId, [withBook(bookId, "characters")]);
    if (type === "outline") {
      return planFromReads(bookId, [volumeNumber
        ? withBook(bookId, "outline_pair", { volumeNumber })
        : withBook(bookId, "outlines")], { volumeNumber });
    }
    if (type === "chapter_guide") {
      return planFromReads(bookId, chapterContentReads(bookId, chapterNumber, ["chapter_guide"])
        .concat([withBook(bookId, "chapters")]), { chapterNumber: chapterNumber, captureNavigation: true });
    }
    if (type === "chapter_body") {
      return planFromReads(bookId, chapterContentReads(bookId, chapterNumber, ["chapter_body"])
        .concat([withBook(bookId, "chapters")]), {
        chapterNumber: chapterNumber,
        captureNavigation: true
      });
    }
    if (type === "hooks_debts") {
      return planFromReads(bookId, [
        withBook(bookId, "hooks"),
        withBook(bookId, "debts")
      ]);
    }
    return planFromReads(bookId, []);
  }

  function planRecovery(bookId, chapterNumber) {
    const n = firstPositive(chapterNumber);
    const reads = [
      withBook(bookId, "world"),
      withBook(bookId, "characters"),
      withBook(bookId, "story_plan"),
      withBook(bookId, "outlines"),
      withBook(bookId, "chapters")
    ];
    if (n) {
      reads.push.apply(reads, chapterContentReads(bookId, n, [
        "chapter_body", "chapter_guide", "chapter_world"
      ]));
    }
    return planFromReads(bookId, reads, {
      chapterNumber: n,
      captureNavigation: !!n,
      category: "recovery"
    });
  }

  function outcomeStamp(task) {
    return [
      asString(task && task.id),
      taskStatusOf(task),
      asString(task && (task.updated_at || task.finished_at || task.completed_at)),
      asString(task && task.result_cache && (task.result_cache.revision_id || task.result_cache.version))
    ].join("|");
  }

  function outcomeKey(task, plan) {
    const reads = plan && Array.isArray(plan.reads) ? plan.reads.map(readKey).sort().join(",") : "";
    return outcomeStamp(task) + "#" + reads;
  }

  function sortReads(reads) {
    const rank = {};
    APPLY_ORDER.forEach((kind, index) => { rank[kind] = index; });
    return (Array.isArray(reads) ? reads.slice() : []).sort((left, right) => {
      const a = rank[left.kind] != null ? rank[left.kind] : 99;
      const b = rank[right.kind] != null ? rank[right.kind] : 99;
      return a - b;
    });
  }

  function create(host) {
    const taskFlights = new Map();
    const readEpochs = new Map();
    let readSequence = 0;
    const doneOutcomes = new Map();
    const stageQueues = new Map();

    function runExclusive(registry, key, operation) {
      const active = registry.get(key);
      if (active) return active;
      const promise = Promise.resolve().then(operation).finally(() => {
        if (registry.get(key) === promise) registry.delete(key);
      });
      registry.set(key, promise);
      return promise;
    }

    function selection() {
      return host.getSelection ? host.getSelection() : { bookId: null, chapterNumber: 0 };
    }

    function captureGuards(plan) {
      const createTarget = host.captureCreateTarget
        ? host.captureCreateTarget(plan.bookId)
        : { bookId: plan.bookId };
      const identities = editIdentities(plan);
      const identityChecks = new Map();
      function identityKey(identity) {
        return identity.resource_type + ":" + identity.resource_key;
      }
      identities.forEach(identity => {
        const check = host.captureEdit ? host.captureEdit(identity) : () => true;
        identityChecks.set(identityKey(identity), check || (() => false));
      });
      const nav = (plan.captureNavigation || plan.reads.some(read => read.kind === "outlines")) && host.captureNavigation
        ? host.captureNavigation() || (() => false) : () => true;
      const userId = host.getUserId ? host.getUserId() : null;
      function resourceAllowed(identity) {
        const check = identityChecks.get(identityKey(identity));
        return !check || check();
      }
      const startBook = plan.bookId;
      const startChapter = plan.chapterNumber || 0;
      return {
        createTarget: createTarget,
        resourceAllowed,
        allowApply(read) {
          if (host.getUserId && userId !== host.getUserId()) return false;
          if (read && (read.kind === "billing" || read.kind === "books")) return true;
          if (plan.bookId && host.isCreateTargetCurrent && !host.isCreateTargetCurrent(createTarget)) return false;
          const current = selection();
          if (plan.bookId && String(current.bookId || "") !== String(startBook || "")) return false;
          if (["chapter_body", "chapter_guide", "chapter_world"].includes(read.kind) && startChapter
            && Number(current.chapterNumber) !== Number(startChapter)) return false;
          if (["chapter_body", "chapter_guide", "outlines"].includes(read.kind) && !nav()) return false;
          const required = editIdentities(Object.assign({}, plan, { reads: [read] }));
          return read.kind === "outline_pair"
            ? !required.length || required.some(resourceAllowed)
            : required.every(resourceAllowed);
        }
      };
    }

    async function hydrateTask(task, category) {
      if (!needsTaskDetail(task, category) || typeof host.fetchTaskDetail !== "function") return task;
      try {
        const detail = await host.fetchTaskDetail(task.id);
        if (!detail || typeof detail !== "object" || String(detail.id) !== String(task.id)
          || (taskBookId(detail) && taskBookId(detail) !== taskBookId(task))) return task;
        return Object.assign({}, task, detail, {
          request_payload: detail.request_payload || task.request_payload,
          result_cache: detail.result_cache || task.result_cache
        });
      } catch (error) {
        return task;
      }
    }

    async function executePlan(plan, options) {
      const opts = options || {};
      const reads = sortReads(plan.reads);
      if (!reads.length) return { ok: true, applied: [], failed: [] };
      const guards = captureGuards(plan);
      plan.syncSequence = ++readSequence;
      if (host.onSync) host.onSync(plan, { pending: true, reading: true, applied: [], failed: [], skipped: [] });
      const fetched = [];
      const failed = [];
      const skipped = [];
      await Promise.all(reads.map(async (read) => {
        if (!guards.allowApply(read)) {
          skipped.push(read);
          if (host.markStale) host.markStale(read);
          return;
        }
        const key = readKey(read);
        const epoch = ++readSequence;
        readEpochs.set(key, epoch);
        try {
          const value = await host.read(read.kind, read);
          fetched.push({ read: read, value: value, key, epoch });
        } catch (error) {
          failed.push({ read: read, error: error, key, epoch });
        }
      }));
      fetched.sort((left, right) => {
        return APPLY_ORDER.indexOf(left.read.kind) - APPLY_ORDER.indexOf(right.read.kind);
      });
      const applied = [];
      for (let i = 0; i < fetched.length; i += 1) {
        const item = fetched[i];
        const allowDisplay = guards.allowApply(item.read) && readEpochs.get(item.key) === item.epoch;
        if (!allowDisplay) {
          skipped.push(item.read);
          if (host.markStale) host.markStale(item.read);
          continue;
        }
        try {
          const wrote = await host.apply(item.read.kind, item.read, item.value, {
            plan: plan,
            allowDisplay: true,
            canApplyResource: guards.resourceAllowed
          });
          if (wrote !== false) applied.push(item.read);
          else skipped.push(item.read);
        } catch (error) {
          failed.push({ read: item.read, error: error });
        }
      }
      fetched.concat(failed).forEach(item => {
        if (item.key && readEpochs.get(item.key) === item.epoch) readEpochs.delete(item.key);
      });
      if (failed.length && host.invalidateReads) host.invalidateReads(failed.map((item) => item.read));
      if (host.rerender && (applied.length || opts.forceRender)) host.rerender();
      const result = {
        ok: failed.length === 0,
        pending: failed.length > 0 || skipped.length > 0,
        applied: applied,
        failed: failed,
        skipped: skipped
      };
      if (host.onSync) host.onSync(plan, result);
      return result;
    }

    async function refreshTask(task, options) {
      const opts = options || {};
      if (!task || !task.id) return { ok: true, applied: [] };
      let working = task;
      const category = classifyTask(taskTypeOf(working));
      working = await hydrateTask(working, category);
      const plan = planTask(working, opts);
      const key = outcomeKey(working, plan);
      if (doneOutcomes.get(String(working.id)) === key) {
        return { ok: true, applied: [], deduped: true };
      }
      return runExclusive(taskFlights, key, async function () {
        if (doneOutcomes.get(String(working.id)) === key) {
          return { ok: true, applied: [], deduped: true };
        }
        const result = await executePlan(plan, opts);
        if (result.ok && !(result.skipped && result.skipped.length)) {
          doneOutcomes.delete(String(working.id));
          doneOutcomes.set(String(working.id), key);
          if (doneOutcomes.size > 256) doneOutcomes.delete(doneOutcomes.keys().next().value);
        }
        return result;
      });
    }

    async function refreshTasks(tasks, options) {
      const list = Array.isArray(tasks) ? tasks : [];
      const results = [];
      for (let i = 0; i < list.length; i += 1) {
        try {
          results.push(await refreshTask(list[i], options));
        } catch (error) {
          results.push({ ok: false, error: error });
        }
      }
      return results;
    }

    async function refreshStage(task, event) {
      const plan = planStage(task, event);
      if (!plan.reads.length) return { ok: true, applied: [] };
      const taskId = asString(task && task.id) || taskBookId(task);
      const run = function () { return executePlan(plan); };
      const previous = stageQueues.get(taskId) || Promise.resolve();
      const next = previous.then(run, run);
      stageQueues.set(taskId, next.then(function () {}, function () {}));
      return next;
    }

    async function refreshChapter(bookId, chapterNumber, options) {
      return executePlan(planChapter(bookId, chapterNumber), options);
    }

    async function refreshAfterRecovery(bookId, chapterNumber) {
      if (typeof host.reloadBook === "function") {
        if (host.invalidateBook) host.invalidateBook(bookId, { allChapters: true });
        try {
          return { ok: !!(await host.reloadBook(bookId, chapterNumber)), applied: [{ kind: "book" }] };
        } catch (error) {
          if (host.invalidateBook) host.invalidateBook(bookId, { allChapters: true });
          return { ok: false, error: error, applied: [] };
        }
      }
      return executePlan(planRecovery(bookId, chapterNumber));
    }

    async function refreshWrite(type, spec) {
      return executePlan(planWrite(type, spec));
    }

    async function refreshBalance() {
      return executePlan(planFromReads("", [withBook("", "billing"), withBook("", "books")]));
    }

    return {
      refreshTask: refreshTask,
      refreshTasks: refreshTasks,
      refreshStage: refreshStage,
      refreshChapter: refreshChapter,
      refreshAfterRecovery: refreshAfterRecovery,
      refreshWrite: refreshWrite,
      refreshBalance: refreshBalance,
      executePlan: executePlan
    };
  }

  const api = {
    CHAPTER_DRAFT_TASK_TYPES: CHAPTER_DRAFT_TASK_TYPES,
    WORLD_DIMENSIONS: WORLD_DIMENSIONS,
    create: create,
    planTask: planTask,
    planStage: planStage,
    planChapter: planChapter,
    planWrite: planWrite,
    planRecovery: planRecovery,
    classifyTask: classifyTask,
    isChapterDraftTask: isChapterDraftTask,
    taskBookId: taskBookId,
    taskChapterNumber: taskChapterNumber,
    taskVolumeNumber: taskVolumeNumber,
    taskCharacterName: taskCharacterName,
    needsTaskDetail: needsTaskDetail,
    outcomeKey: outcomeKey,
    readKey: readKey,
    editIdentities: editIdentities
  };

  if (root) root.LF_PORTAL_RESOURCE_REFRESH = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis === "object" ? globalThis : this);
