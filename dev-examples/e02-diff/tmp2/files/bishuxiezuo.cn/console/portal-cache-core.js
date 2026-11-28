(function (root, factory) {
  "use strict";
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LF_PORTAL_CACHE = api;
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (root) {
  var SNAPSHOT_KEY = "lf_portal_snapshot";
  var MAX_UTF16_BYTES = 3 * 1024 * 1024;
  var LATEST_TERMINAL_LIMIT = 30;
  var PHASE_TASK_TYPES = {
    world_build: true,
    character: true,
    story_plan: true,
    outline: true
  };
  var ACTIVE_STATUSES = { queued: true, running: true, retrying: true };
  var TERMINAL_STATUSES = {
    completed: true,
    failed: true,
    cancelled: true,
    canceled: true
  };
  var CHAIN_KEYS = ["id", "kind", "step", "total", "stages"];
  var COMPOSITE_KEYS = ["id", "kind", "step", "start_step", "total", "root_task_id"];
  var CHAPTER_DROP_KEYS = {
    body: true,
    paras: true,
    content: true,
    guide: true,
    world: true,
    text: true
  };

  function createPortalCache(options) {
    var storageOverride = options && options.storage;

    function storageOf() {
      if (storageOverride) return storageOverride;
      try { return root && root.localStorage ? root.localStorage : null; }
      catch (error) { return null; }
    }

    function estimatedUtf16Bytes(text) {
      return String(text == null ? "" : text).length * 2;
    }

    function isQuotaError(error) {
      if (!error) return false;
      var name = String(error.name || "");
      var code = error.code;
      return name === "QuotaExceededError"
        || name === "NS_ERROR_DOM_QUOTA_REACHED"
        || code === 22
        || code === 1014;
    }

    function safeGet(key) {
      var storage = storageOf();
      if (!storage || typeof storage.getItem !== "function") return null;
      try { return storage.getItem(key); }
      catch (error) { return null; }
    }

    function safeSet(key, value) {
      var storage = storageOf();
      if (!storage || typeof storage.setItem !== "function") {
        return { ok: false, quota: false };
      }
      try {
        storage.setItem(key, value);
        return { ok: true, quota: false };
      } catch (error) {
        return { ok: false, quota: isQuotaError(error) };
      }
    }

    function safeRemove(key) {
      var storage = storageOf();
      if (!storage || typeof storage.removeItem !== "function") return false;
      try {
        storage.removeItem(key);
        return true;
      } catch (error) {
        return false;
      }
    }

    function finiteNumber(value) {
      if (value == null || value === "" || typeof value === "boolean") return null;
      var number = Number(value);
      return Number.isFinite(number) ? number : null;
    }

    function slimObject(value, keys) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      var out = {};
      var wrote = false;
      keys.forEach(function (key) {
        if (value[key] == null) return;
        out[key] = value[key];
        wrote = true;
      });
      return wrote ? out : null;
    }

    function slimEnginePayload(payload) {
      if (!payload || typeof payload !== "object") return null;
      var out = {};
      var chapterNumber = finiteNumber(payload.chapter_number);
      if (chapterNumber != null) out.chapter_number = chapterNumber;
      else if (payload.chapter != null) {
        var chapter = finiteNumber(payload.chapter);
        if (chapter != null) out.chapter = chapter;
      }
      return Object.keys(out).length ? out : null;
    }

    function slimRequestPayload(payload) {
      if (!payload || typeof payload !== "object") return null;
      var out = {};
      if (payload.chapter_number != null) {
        var chapterNumber = finiteNumber(payload.chapter_number);
        if (chapterNumber != null) out.chapter_number = chapterNumber;
      }
      if (payload.chapter != null && out.chapter_number == null) {
        var chapter = finiteNumber(payload.chapter);
        if (chapter != null) out.chapter = chapter;
      }
      if (payload.execution_mode != null) out.execution_mode = payload.execution_mode;
      if (payload.writer_type != null) out.writer_type = payload.writer_type;
      if (payload.volume_number != null) out.volume_number = payload.volume_number;
      var chain = slimObject(payload.chapter_chain, CHAIN_KEYS);
      if (chain) out.chapter_chain = chain;
      var composite = slimObject(payload.composite_action, COMPOSITE_KEYS);
      if (composite) out.composite_action = composite;
      var engine = slimEnginePayload(payload.engine_payload);
      if (engine) out.engine_payload = engine;
      return Object.keys(out).length ? out : null;
    }

    function chapterNumberFromTask(task) {
      if (!task || typeof task !== "object") return null;
      var direct = finiteNumber(task.chapter_number);
      if (direct != null) return direct;
      var payload = task.request_payload;
      if (payload && typeof payload === "object") {
        var fromPayload = finiteNumber(payload.chapter_number);
        if (fromPayload != null) return fromPayload;
        var fromChapter = finiteNumber(payload.chapter);
        if (fromChapter != null) return fromChapter;
        var engine = payload.engine_payload;
        if (engine && typeof engine === "object") {
          var fromEngine = finiteNumber(engine.chapter_number);
          if (fromEngine != null) return fromEngine;
        }
      }
      return null;
    }

    function summarizeTask(task) {
      if (!task || typeof task !== "object" || task.id == null) return null;
      var summary = {
        id: task.id,
        book_link_id: task.book_link_id != null ? task.book_link_id : null,
        task_type: task.task_type != null ? String(task.task_type) : "",
        status: task.status != null ? String(task.status) : ""
      };
      if (task.created_at != null) summary.created_at = task.created_at;
      if (task.updated_at != null) summary.updated_at = task.updated_at;
      if (task.error_message != null) {
        var message = String(task.error_message);
        summary.error_message = message.length > 500 ? message.slice(0, 500) : task.error_message;
      }
      if (task.engine_task_id != null) summary.engine_task_id = task.engine_task_id;
      if (task.billing_status != null) summary.billing_status = task.billing_status;
      if (typeof task.credits_refunded === "boolean") summary.credits_refunded = task.credits_refunded;
      var chapterNumber = chapterNumberFromTask(task);
      if (chapterNumber != null) summary.chapter_number = chapterNumber;
      var payload = slimRequestPayload(task.request_payload);
      if (payload) summary.request_payload = payload;
      // Only the terminal chain control receipt survives. Never persist the
      // task's generated results, engine job, events or arbitrary result data.
      var chainResult = task.result_cache && task.result_cache.chapter_chain;
      if (chainResult && chainResult.state === "stopped") {
        var stopped = { state: "stopped" };
        if (typeof chainResult.reason === "string") stopped.reason = chainResult.reason.slice(0, 500);
        summary.result_cache = { chapter_chain: stopped };
      }
      return summary;
    }

    function newestFirst(left, right, arrival) {
      // Match creationPhaseTaskState: a late update to an older attempt must
      // not displace the newest attempt's status during retention.
      for (var field of ["created_at", "updated_at"]) {
        var leftTime = Date.parse(left && left[field] || "");
        var rightTime = Date.parse(right && right[field] || "");
        if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
          return rightTime - leftTime;
        }
        if (Number.isFinite(leftTime) !== Number.isFinite(rightTime)) return Number.isFinite(rightTime) ? 1 : -1;
      }
      var leftId = Number(left && left.id);
      var rightId = Number(right && right.id);
      if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) return rightId - leftId;
      return arrival ? (arrival.get(String(left && left.id)) || 0) - (arrival.get(String(right && right.id)) || 0) : 0;
    }

    function retainTasks(tasks) {
      if (!Array.isArray(tasks)) return [];
      var byId = new Map();
      var arrival = new Map();
      tasks.forEach(function (task, index) {
        var summary = summarizeTask(task);
        if (!summary) return;
        var key = String(summary.id);
        var existing = byId.get(key);
        if (!existing) {
          byId.set(key, summary);
          arrival.set(key, index);
          return;
        }
        if (newestFirst(summary, existing, arrival) < 0) byId.set(key, summary);
      });
      var unique = Array.from(byId.values());
      var keep = new Map();
      function keepTask(task) {
        if (!task) return;
        keep.set(String(task.id), task);
      }
      unique.forEach(function (task) {
        if (ACTIVE_STATUSES[String(task.status || "").toLowerCase()]) keepTask(task);
      });
      var phaseGroups = new Map();
      unique.forEach(function (task) {
        var type = String(task.task_type || "");
        if (!PHASE_TASK_TYPES[type]) return;
        var groupKey = String(task.book_link_id || "") + ":" + type;
        var group = phaseGroups.get(groupKey);
        if (!group) {
          group = { latest: task, completed: null };
          phaseGroups.set(groupKey, group);
        }
        if (newestFirst(task, group.latest, arrival) < 0) group.latest = task;
        if (String(task.status || "").toLowerCase() === "completed") {
          if (!group.completed || newestFirst(task, group.completed, arrival) < 0) {
            group.completed = task;
          }
        }
      });
      phaseGroups.forEach(function (group) {
        keepTask(group.latest);
        keepTask(group.completed);
      });
      unique.filter(function (task) {
        return TERMINAL_STATUSES[String(task.status || "").toLowerCase()];
      }).sort(function (left, right) {
        return newestFirst(left, right, arrival);
      }).slice(0, LATEST_TERMINAL_LIMIT).forEach(keepTask);
      return Array.from(keep.values()).sort(function (left, right) {
        return newestFirst(left, right, arrival);
      });
    }

    function slimChapter(chapter) {
      if (!chapter || typeof chapter !== "object") return chapter;
      var out = {};
      Object.keys(chapter).forEach(function (key) {
        if (CHAPTER_DROP_KEYS[key]) return;
        out[key] = chapter[key];
      });
      return out;
    }

    function slimBook(book) {
      if (!book || typeof book !== "object") return book;
      var out = {};
      Object.keys(book).forEach(function (key) {
        if (key === "world" || key === "characters" || key === "storyPlan"
          || key === "chapters" || key === "content") return;
        out[key] = book[key];
      });
      return out;
    }

    function hasBookContent(snapshot) {
      if (!snapshot || typeof snapshot !== "object") return false;
      if (Array.isArray(snapshot.chapters)) return true;
      return snapshot.world != null
        || snapshot.characters != null
        || snapshot.storyPlan != null
        || snapshot.volumeOutline != null
        || snapshot.nearTermOutline != null
        || (Array.isArray(snapshot.outlines) && snapshot.outlines.length > 0);
    }

    function lightSnapshot(snapshot) {
      var source = snapshot && typeof snapshot === "object" ? snapshot : {};
      var light = {
        snapshotKind: "light",
        selectedBookId: source.selectedBookId != null ? source.selectedBookId : null,
        selectedChapter: finiteNumber(source.selectedChapter) || 0,
        tasks: retainTasks(source.tasks),
        tasksKnown: source.tasksKnown === true
      };
      if (source.me != null) light.me = source.me;
      if (Array.isArray(source.books)) light.books = source.books.map(slimBook);
      if (source.billing != null) light.billing = source.billing;
      if (source.unreadCount != null) light.unreadCount = source.unreadCount;
      return light;
    }

    function durableSnapshot(snapshot) {
      if (!snapshot || typeof snapshot !== "object") return null;
      if (snapshot.snapshotKind === "light" && !hasBookContent(snapshot)) {
        return lightSnapshot(snapshot);
      }
      var next = {};
      Object.keys(snapshot).forEach(function (key) {
        if (key === "chapter" || key === "tasks" || key === "chapters" || key === "snapshotKind") return;
        next[key] = snapshot[key];
      });
      next.chapter = null;
      next.tasks = retainTasks(snapshot.tasks);
      if (Array.isArray(snapshot.chapters)) {
        next.chapters = snapshot.chapters.map(slimChapter);
      }
      return next;
    }

    function serializeSnapshot(value) {
      return JSON.stringify(value);
    }

    function persistSerialized(text) {
      if (estimatedUtf16Bytes(text) > MAX_UTF16_BYTES) return { ok: false, quota: false, oversized: true };
      var result = safeSet(SNAPSHOT_KEY, text);
      result.oversized = false;
      return result;
    }

    function writePrepared(prepared) {
      var text;
      try { text = serializeSnapshot(prepared); }
      catch (error) { return { ok: false, quota: false, circular: true }; }
      return persistSerialized(text);
    }

    function writeSnapshot(snapshot) {
      if (!snapshot || typeof snapshot !== "object") return false;
      var durable = null;
      try { durable = durableSnapshot(snapshot); }
      catch (error) { durable = null; }
      if (durable) {
        var written = writePrepared(durable);
        if (written.ok) return true;
        if (!written.quota && !written.oversized && !written.circular) return false;
      }
      var light;
      try { light = lightSnapshot(snapshot); }
      catch (error) { return false; }
      if (writePrepared(light).ok) return true;
      // Replacing an item may fail while the old value still occupies quota.
      // This cache is disposable; never evict credentials, drafts or undo.
      safeRemove(SNAPSHOT_KEY);
      return false;
    }

    function readSnapshot() {
      var raw = safeGet(SNAPSHOT_KEY);
      if (raw == null || raw === "") return null;
      var parsed;
      try { parsed = JSON.parse(raw); }
      catch (error) { safeRemove(SNAPSHOT_KEY); return null; }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      var sanitized;
      try { sanitized = durableSnapshot(parsed); }
      catch (error) {
        try { sanitized = lightSnapshot(parsed); }
        catch (inner) { return null; }
      }
      if (!sanitized) return null;
      var serialized = serializeSnapshot(sanitized);
      if (estimatedUtf16Bytes(serialized) > MAX_UTF16_BYTES) {
        sanitized = lightSnapshot(sanitized);
        serialized = serializeSnapshot(sanitized);
      }
      if (serialized !== raw) writeSnapshot(sanitized);
      return sanitized;
    }

    function removeSnapshot() {
      return safeRemove(SNAPSHOT_KEY);
    }

    return {
      summarizeTask: summarizeTask,
      retainTasks: retainTasks,
      writeSnapshot: writeSnapshot,
      readSnapshot: readSnapshot,
      removeSnapshot: removeSnapshot
    };
  }

  var api = createPortalCache();
  api.create = createPortalCache;
  api.SNAPSHOT_KEY = SNAPSHOT_KEY;
  api.MAX_UTF16_BYTES = MAX_UTF16_BYTES;
  return api;
}));
