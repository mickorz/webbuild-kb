(function () {
  const API_BASE_KEY = "lf_api_base";
  const TOKEN_KEYS = ["lf_tokens", "novelbuilt.tokens"];
  const SNAPSHOT_KEY = "lf_portal_snapshot";
  const SELECTED_BOOK_KEY = "lf_selected_book";
  const SELECTED_CHAPTER_KEY = "lf_selected_chapter";
  const TASK_SYNC_LEASE_KEY = "lf_task_sync_leader_v2:";
  const TASK_SYNC_RESULT_KEY = "lf_task_sync_result_v1";
  const TASK_SYNC_CHANNEL_NAME = "lf_task_sync_v1";
  const TASK_SYNC_LEASE_MS = 20000;
  // Monotonic load token: switching books fires overlapping loadPortalSnapshot
  // calls; only the most recent one may apply, otherwise a slow stale response
  // for the previous book clobbers the freshly selected book's data.
  let loadSeq = 0;
  let chapterTargetEpoch = 0;
  let assistantShelfRefreshSequence = 0;
  let assistantCharactersRefreshSequence = 0;
  let runningTaskSyncPromise = null;
  let taskSyncUserId = null;
  let ownedTaskSyncLeaseKey = null;
  let nextTaskListRefreshAt = 0;
  let taskSyncChannel = null;
  let lastTaskSyncMessageId = null;
  const taskStatusSyncFlights = new Map();
  const taskEventFlights = new Map();
  const taskSyncOwner = (window.crypto && typeof window.crypto.randomUUID === "function")
    ? window.crypto.randomUUID()
    : "tab_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);

  function singleFlight(registry, key, operation) {
    const active = registry.get(key);
    if (active) return active;
    const promise = Promise.resolve().then(operation).finally(() => {
      if (registry.get(key) === promise) registry.delete(key);
    });
    registry.set(key, promise);
    return promise;
  }

  function currentTaskSyncUserId() {
    const snapshot = window.LF_PORTAL_STATE;
    const id = snapshot && snapshot.me && snapshot.me.id;
    return id == null ? "" : String(id);
  }

  function readTaskSyncLease(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch (error) { return null; }
  }

  function claimTaskSyncLeadership(userId) {
    const key = TASK_SYNC_LEASE_KEY + encodeURIComponent(userId);
    const now = Date.now();
    const current = readTaskSyncLease(key);
    if (current && current.owner !== taskSyncOwner && Number(current.expiresAt) > now) {
      return false;
    }
    try {
      localStorage.setItem(key, JSON.stringify({
        owner: taskSyncOwner,
        expiresAt: now + TASK_SYNC_LEASE_MS
      }));
      const confirmed = readTaskSyncLease(key);
      const owned = !!confirmed && confirmed.owner === taskSyncOwner;
      if (owned) ownedTaskSyncLeaseKey = key;
      return owned;
    } catch (error) {
      return true;
    }
  }

  function releaseTaskSyncLeadership() {
    const key = ownedTaskSyncLeaseKey;
    ownedTaskSyncLeaseKey = null;
    if (!key) return;
    const current = readTaskSyncLease(key);
    if (!current || current.owner !== taskSyncOwner) return;
    try { localStorage.removeItem(key); } catch (error) {}
  }

  function prepareTaskSyncUser(userId) {
    if (taskSyncUserId === userId) return;
    releaseTaskSyncLeadership();
    taskSyncUserId = userId;
    runningTaskSyncPromise = null;
    nextTaskListRefreshAt = 0;
    lastTaskSyncMessageId = null;
  }

  // ---- Switch caches (memory only) -----------------------------------------
  // SNAPSHOT_KEY stays the refresh anti-blank fallback; these layered caches
  // make book/chapter switches stale-while-revalidate: a switch renders cached
  // data instantly, then revalidates in the background. Writes invalidate via
  // invalidate(). Freshness is guaranteed by write-on-invalidate (defenses 1/2)
  // plus the background revalidate self-heal (defense 3) — see
  // docs/portal-data-cache-plan.md.
  const SWITCH_SOFT_TTL = 5 * 60 * 1000; // soft: stale entries still render, then refresh
  const accountCache = { data: null, ts: 0 }; // single account-level entry (me/books/tasks/billing/...)
  const bookCache = new Map();           // bookId -> { data, ts }
  const chapterCache = new Map();         // `${bookId}:${n}` -> { data, ts }
  function switchCacheKey(bookId, n) { return String(bookId) + ":" + String(n); }
  function switchCacheStale(entry) { return !entry || (Date.now() - entry.ts) > SWITCH_SOFT_TTL; }
  function accountStale() { return !accountCache.data || (Date.now() - accountCache.ts) > SWITCH_SOFT_TTL; }
  function chapterIdentity(value) {
    if (!value || typeof value !== "object") return { revisionId: null, version: null };
    const rawRevisionId = value.revision_id;
    const revisionId = rawRevisionId == null || String(rawRevisionId).trim() === ""
      ? null : String(rawRevisionId).trim();
    const rawVersion = value.version;
    const version = rawVersion == null || String(rawVersion).trim() === "" || !Number.isFinite(Number(rawVersion))
      ? null : Number(rawVersion);
    return { revisionId, version };
  }
  function chapterIdentityChanged(authoritative, candidate) {
    const expected = chapterIdentity(authoritative);
    const actual = chapterIdentity(candidate);
    if (expected.revisionId && actual.revisionId) return expected.revisionId !== actual.revisionId;
    if (expected.version != null && actual.version != null) return expected.version !== actual.version;
    return false;
  }
  function reconcileChapterCache(bookId, chapters) {
    if (!bookId || !Array.isArray(chapters)) return;
    chapters.forEach((chapter) => {
      const no = Number(chapter && chapter.chapter_number);
      if (!no) return;
      const key = switchCacheKey(bookId, no);
      const hit = chapterCache.get(key);
      const cachedChapter = hit && hit.data && hit.data.chapter;
      if (chapterIdentityChanged(chapter, cachedChapter)) chapterCache.delete(key);
    });
  }
  function chapterBundleMatchesCurrentIdentity(bookId, n, bundle) {
    const currentBookId = window.CONSOLE_DATA && window.CONSOLE_DATA.book
      && window.CONSOLE_DATA.book.id;
    if (String(currentBookId || "") !== String(bookId || "")) return false;
    const chapters = (window.CONSOLE_DATA && window.CONSOLE_DATA.chapters) || [];
    const authoritative = chapters.find((chapter) => Number(chapter.no) === Number(n));
    const selectedChapter = window.LF_PORTAL_STATE
      && Number(window.LF_PORTAL_STATE.selectedChapter);
    if (selectedChapter !== Number(n)) return false;
    if (!authoritative || !("chapter" in (bundle || {}))) return false;
    return !chapterIdentityChanged(authoritative, bundle.chapter);
  }
  function currentPortalSelection() {
    const state = window.LF_PORTAL_STATE || {};
    const currentBookId = state.selectedBookId
      || (window.CONSOLE_DATA && window.CONSOLE_DATA.book && window.CONSOLE_DATA.book.id)
      || null;
    const selectedChapter = Number(state.selectedChapter);
    return {
      bookId: currentBookId,
      chapterNumber: Number.isFinite(selectedChapter) ? selectedChapter : 0
    };
  }
  function chapterTargetIsCurrent(bookId, chapterNumber) {
    const current = currentPortalSelection();
    return String(current.bookId || "") === String(bookId || "")
      && Number(current.chapterNumber) === Number(chapterNumber);
  }
  function navigationChangedError() {
    const error = new Error("页面已切换，旧作品内容未保存");
    error.code = "navigation_superseded";
    return error;
  }
  function detailTargetMatches(det, bookId, chapterNumber) {
    if (!det || det._bookId == null) return false;
    return String(det._bookId) === String(bookId || "")
      && Number(det.no) === Number(chapterNumber);
  }
  function invalidate(opts) {
    opts = opts || {};
    if (opts.account) accountCache.data = null;
    if (opts.book) bookCache.delete(String(opts.book));
    if (opts.chapter) chapterCache.delete(switchCacheKey(opts.chapter[0], opts.chapter[1]));
    if (opts.allChapters != null) {
      const prefix = String(opts.allChapters) + ":";
      Array.from(chapterCache.keys()).forEach((k) => { if (k.indexOf(prefix) === 0) chapterCache.delete(k); });
    }
  }

  const CONTENT_ACCESS_CODES = [
    "content_access_soft_restricted",
    "content_access_hard_restricted"
  ];
  function contentAccessDetail(error) {
    const body = error && error.body;
    const detail = body && body.detail && typeof body.detail === "object"
      ? body.detail
      : (error && error.detail && typeof error.detail === "object" ? error.detail : null);
    return detail && CONTENT_ACCESS_CODES.indexOf(detail.code) >= 0 ? detail : null;
  }
  function localizedContentAccess(detail) {
    const hard = detail && detail.code === "content_access_hard_restricted";
    return {
      code: hard ? "content_access_hard_restricted" : "content_access_soft_restricted",
      message: window.CLANG === "en"
        ? (hard
          ? "This account may be at risk. Restore the credit balance above zero or contact support."
          : "This chapter is temporarily unavailable. Please try again later.")
        : (detail && detail.message) || (hard
          ? "当前账户存在风险，请将笔力补至正数或联系客服"
          : "暂时无法读取正文，请稍后重试")
    };
  }

  function portalCacheApi() {
    try { return window.LF_PORTAL_CACHE || null; }
    catch (error) { return null; }
  }

  function summarizePortalTask(task) {
    const cache = portalCacheApi();
    if (cache && typeof cache.summarizeTask === "function") {
      try { return cache.summarizeTask(task) || task; }
      catch (error) { return task; }
    }
    return task;
  }

  function retainPortalTasks(tasks) {
    const cache = portalCacheApi();
    if (cache && typeof cache.retainTasks === "function") {
      try { return cache.retainTasks(tasks); }
      catch (error) { return Array.isArray(tasks) ? tasks : []; }
    }
    return Array.isArray(tasks) ? tasks : [];
  }

  // The refresh fallback must never become a durable copy of server-delivered
  // chapter text. Persistence is bounded and quota-tolerant; chapter bodies stay
  // in the in-memory switch cache for the current authenticated session only.
  function persistSnapshot(snapshot) {
    const cache = portalCacheApi();
    try { return !!(cache && cache.writeSnapshot(snapshot)); }
    catch (error) { return false; }
  }

  function readPersistedSnapshot() {
    const cache = portalCacheApi();
    try { return cache ? cache.readSnapshot() : null; }
    catch (error) { return null; }
  }

  // A failed preference write must not change the current session's selection.
  let selectedBookHint;
  let selectedChapterHint;

  function persistSelectedBook(bookId) {
    if (!bookId) return;
    selectedBookHint = String(bookId);
    try { localStorage.setItem(SELECTED_BOOK_KEY, String(bookId)); }
    catch (error) {}
  }

  function persistSelectedChapter(chapterNumber) {
    if (chapterNumber == null || chapterNumber === "") return;
    selectedChapterHint = Number(chapterNumber);
    try { localStorage.setItem(SELECTED_CHAPTER_KEY, String(chapterNumber)); }
    catch (error) {}
  }

  function clearPersistedChapterSelection() {
    selectedChapterHint = 0;
    try { localStorage.removeItem(SELECTED_CHAPTER_KEY); }
    catch (error) {}
  }

  function readPersistedBookId() {
    if (selectedBookHint !== undefined) return selectedBookHint;
    try { return localStorage.getItem(SELECTED_BOOK_KEY); }
    catch (error) { return null; }
  }

  function readPersistedChapterNumber() {
    if (selectedChapterHint !== undefined) return selectedChapterHint;
    try {
      const value = Number(localStorage.getItem(SELECTED_CHAPTER_KEY) || 0);
      return Number.isFinite(value) ? value : 0;
    } catch (error) {
      return 0;
    }
  }

  // Chapter generation is sent over the wire as task_type "chapter_draft", but
  // the backend persists a fine-grained execution-mode/writer-type type. Reads
  // of a returned task's type must match the whole family (incl. the legacy
  // coarse names for tasks created before the migration).
  const CHAPTER_DRAFT_TASK_TYPES = [
    "chapter_draft", "chapter_draft_single",
    "chapter_world_state", "chapter_outline_director", "chapter_character_state",
    "chapter_writer_muti", "chapter_writer_single",
    "chapter_full_muti", "chapter_full_single"
  ];
  function isChapterDraftTask(taskType) {
    return CHAPTER_DRAFT_TASK_TYPES.indexOf(String(taskType || "")) !== -1;
  }

  function apiBase() {
    if (window.NBSite) return window.NBSite.apiBase();
    try { return localStorage.getItem(API_BASE_KEY) || ""; }
    catch (error) { return ""; }
  }

  function invalidJsonResponse(response, cause) {
    const error = new Error(window.CLANG === "en"
      ? "The service returned an invalid response. Refresh the page and try again."
      : "服务返回了无效响应，请刷新页面后重试");
    error.status = response && response.status;
    error.code = "invalid_json_response";
    if (cause) error.cause = cause;
    return error;
  }

  async function jsonResponse(response) {
    const contentType = response && response.headers && response.headers.get
      ? String(response.headers.get("Content-Type") || "").toLowerCase()
      : "";
    if (contentType && contentType.indexOf("application/json") === -1 && contentType.indexOf("+json") === -1) {
      throw invalidJsonResponse(response);
    }
    try {
      return await response.json();
    } catch (error) {
      throw invalidJsonResponse(response, error);
    }
  }

  function readTokens() {
    for (const key of TOKEN_KEYS) {
      try {
        const value = localStorage.getItem(key);
        if (!value) continue;
        const parsed = JSON.parse(value);
        if (parsed && (parsed.access_token || parsed.accessToken)) return parsed;
      } catch (error) {}
    }
    return null;
  }

  function clearAuthState() {
    prepareTaskSyncUser(null);
    selectedBookHint = null;
    selectedChapterHint = 0;
    TOKEN_KEYS.forEach((key) => {
      try { localStorage.removeItem(key); } catch (error) {}
    });
    try { localStorage.removeItem(SNAPSHOT_KEY); } catch (error) {}
    try { localStorage.removeItem(SELECTED_BOOK_KEY); } catch (error) {}
    try { localStorage.removeItem(SELECTED_CHAPTER_KEY); } catch (error) {}
    window.LF_AUTH_EXPIRED = true;
  }

  function redirectToLogin() {
    if (window.location.pathname !== "/login.html") window.location.replace("/login.html");
  }

  window.LF_CLEAR_AUTH_STATE = clearAuthState;

  function writeTokens(tokens) {
    var merged = tokens || {};
    // Preserve existing refresh_token if the new payload doesn't include one
    // (some flows only return an access_token).
    if (!merged.refresh_token && !merged.refreshToken) {
      var prev = readTokens();
      if (prev && (prev.refresh_token || prev.refreshToken)) {
        merged.refresh_token = prev.refresh_token || prev.refreshToken;
        if (merged.access_token || merged.accessToken) {
          // Only persist when we have an access token to pair with the old refresh
        } else {
          merged = prev; // nothing new — keep the old object as-is
        }
      }
    }
    localStorage.setItem("lf_tokens", JSON.stringify(merged));
  }

  // ---- token refresh ----
  var _refreshPromise = null;

  function refreshAccessToken() {
    if (_refreshPromise) return _refreshPromise;
    var tokens = readTokens();
    var refreshToken = tokens && (tokens.refresh_token || tokens.refreshToken);
    if (!refreshToken) {
      window.LF_AUTH_EXPIRED = true;
      return Promise.reject(new Error("Session expired"));
    }
    _refreshPromise = fetch(apiBase() + "/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    }).then(function (res) {
      if (!res.ok) throw new Error("refresh failed");
      return jsonResponse(res);
    }).then(function (newTokens) {
      writeTokens(newTokens);
      window.LF_AUTH_EXPIRED = false;
      return newTokens;
    }).catch(function (err) {
      clearAuthState();
      throw err;
    }).finally(function () {
      _refreshPromise = null;
    });
    return _refreshPromise;
  }

  function authHeader() {
    const tokens = readTokens();
    const token = tokens && (tokens.access_token || tokens.accessToken);
    return token ? { Authorization: "Bearer " + token } : {};
  }

  function errorText(value, fallback, nested) {
    if (!value) return fallback || (nested ? "" : "Request failed");
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.map((item) => errorText(item, "", true)).filter(Boolean).join("；") || fallback || (nested ? "" : "Request failed");
    if (typeof value === "object") {
      const message = value.message || value.msg || value.detail || value.error;
      const engineDetail = value.engine_detail || value.details;
      const engineStatus = value.engine_status ? "HTTP " + value.engine_status : "";
      const traceCode = value.trace_code ? "追溯码：" + String(value.trace_code) : "";
      return [errorText(message, "", true), engineStatus, errorText(engineDetail, "", true), traceCode]
        .filter(Boolean)
        .join(" · ") || fallback || (nested ? "" : "Request failed");
    }
    return fallback || (nested ? "" : "Request failed");
  }

  function statusMessage(status, detail) {
    const text = errorText(detail, "");
    if (status === 401) return text || "登录已过期，请重新登录";
    if (status === 403) return text || "权限不足";
    if (status >= 500) return text || "服务器繁忙，请稍后再试";
    return text || "请求失败";
  }

  const DEFAULT_ENGINE_ADMISSION = {
    mode: "normal",
    accepting_new_jobs: true,
    reason: "",
    changed_at: null,
    retry_after_seconds: 30,
    source: "portal_default"
  };
  window.LF_ENGINE_ADMISSION = Object.assign({}, DEFAULT_ENGINE_ADMISSION);
  window.LF_ENGINE_BLOCKED = function () {
    return !!(window.LF_ENGINE_ADMISSION
      && window.LF_ENGINE_ADMISSION.accepting_new_jobs === false);
  };
  function applyEngineAdmission(value) {
    if (!value || typeof value !== "object") return false;
    if (typeof value.accepting_new_jobs !== "boolean") return false;
    window.LF_ENGINE_ADMISSION = Object.assign({}, DEFAULT_ENGINE_ADMISSION, value);
    if (window.LF_RERENDER) window.LF_RERENDER();
    return true;
  }
  function captureEngineAdmission(status, body, headers) {
    if (status !== 503 || !body || typeof body !== "object") return false;
    var detail = body.detail && typeof body.detail === "object" ? body.detail : body;
    var code = detail.code || detail.error;
    if (code !== "engine_draining" && code !== "engine_unavailable") return false;
    var details = detail.details && typeof detail.details === "object" ? detail.details : {};
    var retryHeader = headers && headers.get ? Number(headers.get("Retry-After")) : 0;
    var unavailable = code === "engine_unavailable";
    return applyEngineAdmission({
      mode: "draining",
      accepting_new_jobs: false,
      reason: details.reason || (unavailable ? "engine_unavailable" : "runtime_draining"),
      changed_at: details.changed_at || null,
      retry_after_seconds: Number(details.retry_after_seconds) || retryHeader || 30,
      source: unavailable ? "engine_unavailable" : (details.source || "engine")
    });
  }
  function rejectWhenEngineDraining() {
    if (!window.LF_ENGINE_BLOCKED()) return null;
    var admission = window.LF_ENGINE_ADMISSION || DEFAULT_ENGINE_ADMISSION;
    var unavailable = admission.source === "engine_unavailable";
    var code = unavailable ? "engine_unavailable" : "engine_draining";
    var detail = {
      code: code,
      error: code,
      message: window.CLANG === "en"
        ? (unavailable
          ? "The engine is temporarily unavailable. New generation tasks are paused."
          : "The engine is being updated. New generation tasks are temporarily paused.")
        : (unavailable
          ? "引擎暂不可用，新的生成任务已暂停。"
          : "引擎正在更新，暂时不能开始新的生成任务。"),
      details: admission
    };
    var error = new Error(detail.message);
    error.status = 503;
    error.body = { detail: detail };
    error.detail = detail;
    return Promise.reject(error);
  }

  async function request(path, options) {
    const init = options || {};
    const headers = Object.assign(
      { Accept: "application/json" },
      init.body ? { "Content-Type": "application/json" } : {},
      authHeader(),
      init.headers || {}
    );
    const response = await fetch(apiBase() + path, Object.assign({}, init, { headers }));
    if (!response.ok) {
      let detail = response.statusText;
      let parsedBody = null;
      try {
        const body = await response.json();
        parsedBody = body;
        captureEngineAdmission(response.status, body, response.headers);
        detail = errorText(body.detail || body.message || body, detail);
      } catch (error) {}
      // 401: try refresh once, then retry the original request. Only a failed
      // refresh means the session expired — the retried request's own error
      // (403/404/409/500/…) must propagate with its status/body/detail intact,
      // not be masked as "session expired".
      if (response.status === 401 && !(init._retried)) {
        try {
          await refreshAccessToken();
        } catch (refreshError) {
          clearAuthState();
          throw new Error("登录已过期，请重新登录");
        }
        var retryHeaders = Object.assign({}, headers, authHeader());
        var retryResponse = await fetch(apiBase() + path, Object.assign({}, init, { headers: retryHeaders, _retried: true }));
        if (retryResponse.ok) {
          if (retryResponse.status === 204) return null;
          return jsonResponse(retryResponse);
        }
        var retryDetail = retryResponse.statusText;
        var retryBody = null;
        try { retryBody = await retryResponse.json(); captureEngineAdmission(retryResponse.status, retryBody, retryResponse.headers); retryDetail = errorText(retryBody.detail || retryBody.message || retryBody, retryDetail); } catch (e) {}
        var retryErr = new Error(statusMessage(retryResponse.status, retryDetail));
        retryErr.status = retryResponse.status;
        retryErr.body = retryBody;
        retryErr.detail = retryDetail;
        throw retryErr;
      }
      const err = new Error(statusMessage(response.status, detail));
      err.status = response.status;
      err.body = parsedBody;
      err.detail = detail;
      throw err;
    }
    if (response.status === 204) return null;
    return jsonResponse(response);
  }

  async function downloadRequest(path, options) {
    const init = options || {};
    if (init.deliveryCheck) init.deliveryCheck();
    const makeHeaders = () => Object.assign(
      { Accept: "application/octet-stream" },
      init.body ? { "Content-Type": "application/json" } : {},
      authHeader(),
      init.headers || {}
    );
    let response = await fetch(apiBase() + path, Object.assign({}, init, { headers: makeHeaders() }));
    if (response.status === 401) {
      try {
        await refreshAccessToken();
      } catch (refreshError) {
        clearAuthState();
        throw new Error("登录已过期，请重新登录");
      }
      response = await fetch(apiBase() + path, Object.assign({}, init, { headers: makeHeaders() }));
    }
    if (!response.ok) {
      let detail = response.statusText;
      let parsedBody = null;
      try {
        parsedBody = await response.json();
        captureEngineAdmission(response.status, parsedBody, response.headers);
        detail = errorText(parsedBody.detail || parsedBody.message || parsedBody, detail);
      } catch (error) {}
      const err = new Error(statusMessage(response.status, detail));
      err.status = response.status;
      err.body = parsedBody;
      err.detail = detail;
      throw err;
    }
    const disposition = response.headers.get("Content-Disposition") || "";
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
    let filename = "novel-export";
    if (utf8Match) {
      try { filename = decodeURIComponent(utf8Match[1]); } catch (error) { filename = utf8Match[1]; }
    } else if (plainMatch) filename = plainMatch[1];
    if (init.deliveryCheck) init.deliveryCheck();
    const blob = await response.blob();
    if (init.deliveryCheck) init.deliveryCheck();
    if (init.previewImage) {
      return window.AssistantReferenceCore.imageBlob(blob);
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { filename, size: blob.size };
  }

  function parseSseChunk(buffer, emit) {
    const normalized = buffer.replace(/\r\n/g, "\n");
    const parts = normalized.split("\n\n");
    const rest = parts.pop() || "";
    parts.forEach((part) => {
      const lines = part.split("\n");
      const event = { id: null, event: "message", data: "" };
      lines.forEach((line) => {
        if (!line || line.startsWith(":")) return;
        const index = line.indexOf(":");
        const key = index >= 0 ? line.slice(0, index) : line;
        const value = index >= 0 ? line.slice(index + 1).replace(/^ /, "") : "";
        if (key === "id") event.id = value;
        else if (key === "event") event.event = value || "message";
        else if (key === "data") event.data += (event.data ? "\n" : "") + value;
      });
      let data = event.data;
      try {
        data = event.data ? JSON.parse(event.data) : null;
      } catch (error) {}
      emit({ id: event.id, event: event.event, data });
    });
    return rest;
  }

  async function streamRequest(path, handlers, options) {
    const opts = options || {};
    const controller = new AbortController();
    if (opts.signal) {
      if (opts.signal.aborted) controller.abort();
      opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    const headers = Object.assign(
      { Accept: "text/event-stream" },
      opts.body ? { "Content-Type": "application/json" } : {},
      authHeader(),
      opts.headers || {}
    );
    const response = await fetch(apiBase() + path, {
      method: opts.method || "GET",
      headers,
      body: opts.body,
      signal: controller.signal
    });
    if (!response.ok) {
      if (response.status === 401 && !opts._retried) {
        await refreshAccessToken();
        return streamRequest(path, handlers, Object.assign({}, opts, { _retried: true }));
      }
      let detail = response.statusText;
      let parsedBody = null;
      try {
        const body = await response.json();
        parsedBody = body;
        detail = errorText(body.detail || body.message || body, detail);
      } catch (error) {}
      const streamError = new Error(errorText(detail, "Stream failed"));
      streamError.status = response.status;
      streamError.body = parsedBody;
      streamError.detail = detail;
      throw streamError;
    }
    const reader = response.body && response.body.getReader ? response.body.getReader() : null;
    if (!reader) throw new Error("Streaming is not supported by this browser");
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value && value.length && handlers && handlers.onActivity) handlers.onActivity();
        buffer += decoder.decode(value, { stream: true });
        buffer = parseSseChunk(buffer, (event) => {
          const shouldStop = handlers && handlers.onEvent && handlers.onEvent(event);
          if (shouldStop === false) controller.abort();
        });
        if (controller.signal.aborted) break;
      }
    } catch (error) {
      controller.abort();
      throw error;
    }
    buffer += decoder.decode();
    if (buffer.trim()) parseSseChunk(buffer + "\n\n", (event) => handlers && handlers.onEvent && handlers.onEvent(event));
    return true;
  }

  function assistantStreamIncompleteError() {
    const error = new Error("Assistant stream ended before completion");
    error.code = "assistant_stream_incomplete";
    return error;
  }

  function streamAssistantRequest(path, handlers, options) {
    let completed = false;
    let terminalError = null;
    const streamHandlers = Object.assign({}, handlers || {}, {
      onEvent(event) {
        if (event.event === "done") completed = true;
        // Keep reading the server's terminal events after the consumer reports
        // an error. Throwing here aborts fetch before the following done arrives.
        if (terminalError && event.event !== "done" && event.event !== "stream_end") return;
        try {
          return handlers && handlers.onEvent ? handlers.onEvent(event) : undefined;
        } catch (error) {
          if (event.event !== "error") throw error;
          terminalError = error;
        }
      }
    });
    return streamRequest(path, streamHandlers, options).then((value) => {
      if (terminalError) throw terminalError;
      if (!completed) throw assistantStreamIncompleteError();
      return value;
    }, (error) => {
      throw terminalError || error;
    });
  }

  function normalizeList(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.items)) return payload.items;
    if (payload && Array.isArray(payload.results)) return payload.results;
    return [];
  }

  function zhEn(value, fallback) {
    const text = value || fallback || "";
    return { zh: text, en: text };
  }

  function formatWords(value) {
    const n = Number(value || 0);
    if (n >= 10000) return { zh: (n / 10000).toFixed(1) + "万", en: Math.round(n / 1000) + "k" };
    return { zh: String(n), en: String(n) };
  }

  // 题材展示：建书时把 题材/玩法/风格/关系 多选合成了一段结构化文案塞进 genre
  // （形如「【题材类型】：…\n【核心玩法】：…」，且换行可能是字面 \n）。这里把它拆成
  // 干净的 {label,value} 分块用于卡片小标签；门户 BookLink 自己的 core_mech/style/
  // relationship 列若有值则优先取，没有再回退解析 genre。普通单值 genre 原样作题材。
  const GENRE_FIELDS = [
    { keys: ["题材类型", "题材", "世界类型", "世界观"], col: null, label: { zh: "题材", en: "Genre" } },
    { keys: ["核心玩法", "玩法"], col: "core_mech", label: { zh: "玩法", en: "Mechanic" } },
    { keys: ["风格", "基调"], col: "style", label: { zh: "风格", en: "Style" } },
    { keys: ["关系线", "关系", "感情线"], col: "relationship", label: { zh: "关系", en: "Relationship" } }
  ];
  function parseGenreParts(book) {
    const raw = String(book.genre || "").trim();
    // 先按换行/分号拆，再在每个「【标签】：」前补拆一刀（防换行被吞时也能分开）
    const segs = raw
      .split(/\\n|\r?\n|；|;/)
      .reduce((acc, s) => acc.concat(s.split(/(?=【[^】]+?】\s*[：:])/)), [])
      .map((s) => s.trim())
      .filter(Boolean);
    const parsed = {};
    let plain = "";
    segs.forEach((seg) => {
      const m = seg.match(/^[【\[]?\s*([^】\]：:]+?)\s*[】\]]?\s*[：:]\s*(.+)$/);
      if (m) parsed[m[1].trim()] = m[2].trim();
      else if (!plain) plain = seg;
    });
    const parts = [];
    GENRE_FIELDS.forEach((field) => {
      let val = field.col && book[field.col] ? String(book[field.col]).trim() : "";
      if (!val) { for (const key of field.keys) { if (parsed[key]) { val = parsed[key]; break; } } }
      // 普通无标签的 genre（如「东方仙侠」）归到题材一档
      if (!val && field.col === null && plain) val = plain;
      if (val) parts.push({ label: field.label, value: zhEn(val) });
    });
    if (!parts.length && raw) parts.push({ label: GENRE_FIELDS[0].label, value: zhEn(raw) });
    return parts;
  }

  function shelfCard(book, index, selectedBookId) {
    const title = book.title || book.name || "Untitled";
    return {
      id: book.id,
      engine_book_id: book.engine_book_id || book.engineBookId,
      title: zhEn(title),
      genre: zhEn(book.genre || "Novel"),
      status: zhEn(book.status || "Ongoing"),
      chap: book.current_chapter || book.chapter_count || 0,
      words: formatWords(book.word_count || book.words || 0),
      vol: zhEn(book.volume_title || "Portal book"),
      latest_chapter_title: book.latest_chapter_title || null,
      tint: ["gold", "slate", "terra"][index % 3],
      cur: book.id === selectedBookId,
      blurb: zhEn(book.description || book.subtitle || "Connected to the Novelbuilt portal backend."),
      genre_raw: book.genre || "",
      genre_parts: parseGenreParts(book),
      core_mech: book.core_mech || "",
      style: book.style || "",
      relationship: book.relationship || "",
      estimated_length: book.estimated_length || "",
      words_per_chapter: book.words_per_chapter || ""
    };
  }

  function newBookCard() {
    return {
      title: { zh: "新建作品", en: "New work" },
      genre: { zh: "", en: "" },
      status: { zh: "new", en: "new" },
      chap: 0,
      words: { zh: "", en: "" },
      vol: { zh: "", en: "" },
      tint: "new",
      blurb: { zh: "", en: "" }
    };
  }

  function updateShelfText(snapshot) {
    if (!window.I18N_C) return;
    const books = Array.isArray(snapshot.books) ? snapshot.books : [];
    const count = books.length;
    const displayName = snapshot.me && (snapshot.me.display_name || snapshot.me.email);
    const zhName = displayName ? String(displayName).split("@")[0] : "创作者";
    const enName = displayName ? String(displayName).split("@")[0] : "Writer";
    const first = books[0];
    window.I18N_C.zh.greeting = "晚上好，" + zhName + "。";
    window.I18N_C.en.greeting = "Good evening, " + enName + ".";
    window.I18N_C.zh.shelf_sub = count
      ? count + " 部作品已接入门户" + (first && first.title ? " · 最近更新《" + first.title + "》" : "")
      : "还没有作品 · 从一条世界规则开始创建。";
    window.I18N_C.en.shelf_sub = count
      ? count + " " + (count === 1 ? "work" : "works") + " connected" + (first && first.title ? " · latest: " + first.title : "")
      : "No works yet · start from one world rule.";
  }

  // Sync the authenticated identity into CONSOLE_DATA.user so the settings
  // surface (and the admin-only nav entry) reflect the real account. The rich
  // almanac/devices fields stay demo until wired separately.
  function applyUser(snapshot) {
    const me = snapshot && snapshot.me;
    if (!me || !window.CONSOLE_DATA || !window.CONSOLE_DATA.user) return;
    const user = window.CONSOLE_DATA.user;
    const name = me.display_name || (me.email ? String(me.email).split("@")[0] : "");
    if (name) {
      user.penName = { zh: name, en: name };
      user.seal = name[0] || user.seal;
      user.handle = "@" + (me.email ? String(me.email).split("@")[0] : name);
      // Creator home shows the pen name verbatim (中英文原文), not an email slug.
      user.home = "novelbuilt.ai/@" + name;
    }
    if (me.email) user.email = me.email;
    if (me.bio != null) user.motto = { zh: me.bio || "", en: me.bio || "" };
    user.isAdmin = !!me.is_admin;
    user.isPartner = !!me.is_partner;
    user.id = me.id || user.id;
  }

  const dimensionMeta = {
    core_laws: { zh: "核心法则", en: "Core Laws", agentZh: "世界观架构师", agentEn: "Worldbuilder" },
    space_time: { zh: "时空地理", en: "Space & Geography", agentZh: "地理志官", agentEn: "Cartographer" },
    society: { zh: "社会权力", en: "Power & Society", agentZh: "设定考据员", agentEn: "Lore Keeper" },
    history_culture: { zh: "历史文化", en: "History & Culture", agentZh: "设定考据员", agentEn: "Lore Keeper" },
    existence: { zh: "存在基础", en: "Foundations of Being", agentZh: "世界观架构师", agentEn: "Worldbuilder" },
    information: { zh: "信息传播", en: "Information Flow", agentZh: "信息志官", agentEn: "Signal Keeper" }
  };

  function humanKey(key) {
    return String(key || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }

  const fieldLabels = {
    title: { zh: "标题", en: "Title" },
    name: { zh: "名称", en: "Name" },
    summary: { zh: "摘要", en: "Summary" },
    description: { zh: "描述", en: "Description" },
    content: { zh: "内容", en: "Content" },
    rules: { zh: "规则", en: "Rules" },
    tags: { zh: "标签", en: "Tags" },
    notes: { zh: "备注", en: "Notes" },
    statement: { zh: "表述", en: "Statement" },
    cost: { zh: "代价", en: "Cost" },
    boundary: { zh: "边界", en: "Boundary" },
    enforcement: { zh: "执行机制", en: "Enforcement" },
    core_laws: { zh: "核心法则", en: "Core Laws" },
    space_time: { zh: "时空地理", en: "Space & Geography" },
    society: { zh: "社会权力", en: "Power & Society" },
    history_culture: { zh: "历史文化", en: "History & Culture" },
    existence: { zh: "存在基础", en: "Foundations of Being" },
    information: { zh: "信息传播", en: "Information Flow" },
    death: { zh: "死亡", en: "Death" },
    calendar: { zh: "历法", en: "Calendar" },
    lifespan: { zh: "寿命", en: "Lifespan" },
    disease_and_birth: { zh: "疾病与繁衍", en: "Disease & Birth" },
    disease: { zh: "疾病", en: "Disease" },
    birth: { zh: "出生", en: "Birth" },
    fertility: { zh: "生育", en: "Fertility" },
    axioms: { zh: "世界公理", en: "Axioms" },
    taboos: { zh: "禁忌红线", en: "Taboos" },
    power_system: { zh: "力量体系", en: "Power System" },
    power_manifestation: { zh: "力量表现", en: "Power Manifestation" },
    power_visibility: { zh: "权力可见性", en: "Power Visibility" },
    era: { zh: "时代背景", en: "Era" },
    ecology: { zh: "生态", en: "Ecology" },
    world_layout: { zh: "世界格局", en: "World Layout" },
    key_locations: { zh: "关键地点", en: "Key Locations" },
    terrain: { zh: "地貌", en: "Terrain" },
    feature: { zh: "特征", en: "Feature" },
    risk: { zh: "风险", en: "Risk" },
    controlling_force: { zh: "控制势力", en: "Controlling Force" },
    environment_texture: { zh: "环境质感", en: "Environment Texture" },
    class_structure: { zh: "阶层结构", en: "Class Structure" },
    political_system: { zh: "政治体制", en: "Political System" },
    population: { zh: "人口", en: "Population" },
    races: { zh: "种族", en: "Races" },
    traits: { zh: "特征", en: "Traits" },
    forces: { zh: "主要势力", en: "Forces" },
    force_relations: { zh: "势力关系", en: "Force Relations" },
    source: { zh: "来源", en: "Source" },
    target: { zh: "对象", en: "Target" },
    relation: { zh: "关系", en: "Relation" },
    tension_point: { zh: "张力点", en: "Tension Point" },
    social_status: { zh: "社会地位", en: "Social Status" },
    base_of_power: { zh: "权力基础", en: "Base of Power" },
    goals: { zh: "目标", en: "Goals" },
    methods: { zh: "手段", en: "Methods" },
    follower_scope: { zh: "追随者范围", en: "Follower Scope" },
    customs: { zh: "风俗习惯", en: "Customs" },
    economy: { zh: "经济体系", en: "Economy" },
    religions: { zh: "宗教", en: "Religions" },
    daily_slice: { zh: "日常切片", en: "Daily Slice" },
    major_events: { zh: "重大事件", en: "Major Events" },
    event: { zh: "事件", en: "Event" },
    lasting_impact: { zh: "长期影响", en: "Lasting Impact" },
    historical_cycles: { zh: "历史周期", en: "Historical Cycles" },
    myths: { zh: "神话传说", en: "Myths" },
    core_belief: { zh: "核心信念", en: "Core Belief" },
    cultural_memory: { zh: "文化记忆", en: "Cultural Memory" },
    info_speed: { zh: "信息速度", en: "Information Speed" },
    info_barriers: { zh: "信息壁垒", en: "Information Barriers" },
    rumor_and_truth: { zh: "流言与真相", en: "Rumor & Truth" },
    knowledge_medium: { zh: "知识载体", en: "Knowledge Medium" },
    gender: { zh: "性别", en: "Gender" },
    age: { zh: "年龄", en: "Age" },
    role: { zh: "叙事职责", en: "Role" },
    identity: { zh: "身份", en: "Identity" },
    identity_profile: { zh: "角色身份", en: "Character identity" },
    true_name: { zh: "真名", en: "True name" },
    aliases: { zh: "别称", en: "Aliases" },
    narrative_function: { zh: "叙事功能", en: "Narrative Function" },
    type: { zh: "类型", en: "Type" },
    motivation: { zh: "动机", en: "Motivation" },
    goal: { zh: "目标", en: "Goal" },
    flaw: { zh: "缺陷", en: "Flaw" },
    arc: { zh: "成长弧", en: "Arc" },
    relationship: { zh: "关系", en: "Relationship" },
    relationships: { zh: "关系网", en: "Relationships" },
    theme: { zh: "主题", en: "Theme" },
    main_arc: { zh: "主线", en: "Main Arc" },
    conflict: { zh: "核心冲突", en: "Conflict" },
    plot_points: { zh: "关键情节点", en: "Plot Points" },
    turning_points: { zh: "转折点", en: "Turning Points" },
    ending: { zh: "结局方向", en: "Ending" },
    volume: { zh: "卷", en: "Volume" },
    chapters: { zh: "章节", en: "Chapters" },
    version: { zh: "版本", en: "Version" },
    /* story plan (engine wf-nvl-story-plan content) */
    surface: { zh: "表层设定", en: "Surface" },
    engine: { zh: "故事引擎", en: "Story Engine" },
    payoff: { zh: "兑现系统", en: "Payoff" },
    constraints: { zh: "约束红线", en: "Constraints" },
    issues: { zh: "待解决问题", en: "Open Issues" },
    expanded_premise: { zh: "扩展立意", en: "Expanded Premise" },
    core_conflict: { zh: "核心冲突", en: "Core Conflict" },
    reader_promise: { zh: "读者承诺", en: "Reader Promise" },
    target_readers: { zh: "目标读者", en: "Target Readers" },
    commercial_tags: { zh: "商业标签", en: "Commercial Tags" },
    tone_reference: { zh: "基调参照", en: "Tone Reference" },
    conflict_engine: { zh: "冲突引擎", en: "Conflict Engine" },
    conflict_layers: { zh: "冲突层级", en: "Conflict Layers" },
    external: { zh: "外部", en: "External" },
    internal: { zh: "内部", en: "Internal" },
    relational: { zh: "关系", en: "Relational" },
    dual_story: { zh: "明暗双线", en: "Dual Story" },
    foreground: { zh: "明线", en: "Foreground" },
    background: { zh: "暗线", en: "Background" },
    mystery_box: { zh: "悬念盒子", en: "Mystery Box" },
    progression_loop: { zh: "推进循环", en: "Progression Loop" },
    protagonist_trap: { zh: "主角困局", en: "Protagonist Trap" },
    emotional_rhythm: { zh: "情绪节奏", en: "Emotional Rhythm" },
    ending_flavor: { zh: "结局质感", en: "Ending Flavor" },
    growth_path: { zh: "成长路径", en: "Growth Path" },
    payoff_grammar: { zh: "兑现语法", en: "Payoff Grammar" },
    tension_archetypes: { zh: "张力原型", en: "Tension Archetypes" },
    /* character (engine wf-nvl-character content) */
    world_position: { zh: "世界位置", en: "World Position" },
    origin_class: { zh: "出身阶层", en: "Origin Class" },
    affiliation: { zh: "阵营归属", en: "Affiliation" },
    social_role: { zh: "社会角色", en: "Social Role" },
    stance_on_core_conflict: { zh: "核心冲突立场", en: "Stance on Core Conflict" },
    world_anchor: { zh: "世界锚点", en: "World Anchor" },
    embodies_rule: { zh: "体现法则", en: "Embodies Rule" },
    shaped_by_rule: { zh: "受塑于", en: "Shaped by Rule" },
    may_challenge_rule: { zh: "或将挑战", en: "May Challenge Rule" },
    surface_goal: { zh: "表层目标", en: "Surface Goal" },
    deep_desire: { zh: "深层欲望", en: "Deep Desire" },
    deep_fear: { zh: "深层恐惧", en: "Deep Fear" },
    beliefs: { zh: "信念生态", en: "Beliefs" },
    belief_source: { zh: "信念来源", en: "Belief Source" },
    author_perspective: { zh: "作者视角", en: "Author Perspective" },
    secrets: { zh: "秘密", en: "Secrets" },
    exposure_consequence: { zh: "暴露后果", en: "Exposure Consequence" },
    who_knows: { zh: "知情者", en: "Who Knows" },
    who_doesnt_know_but_should: { zh: "应知未知者", en: "Should Know" },
    bottom_line: { zh: "底线", en: "Bottom Line" },
    condition: { zh: "触发条件", en: "Condition" },
    reaction_when_crossed: { zh: "越线反应", en: "Reaction When Crossed" },
    traumas: { zh: "创伤", en: "Traumas" },
    wound: { zh: "伤口", en: "Wound" },
    trigger: { zh: "触发", en: "Trigger" },
    stress_response: { zh: "应激反应", en: "Stress Response" },
    impact_on_behavior: { zh: "行为影响", en: "Behavioral Impact" },
    contradictions: { zh: "内在矛盾", en: "Contradictions" },
    conflicting_elements: { zh: "矛盾元素", en: "Conflicting Elements" },
    possible_direction: { zh: "演化方向", en: "Possible Direction" },
    arc_description: { zh: "成长弧线", en: "Arc" },
    growth_direction: { zh: "成长方向", en: "Growth Direction" },
    corruption_direction: { zh: "堕落方向", en: "Corruption Direction" },
    key_choice: { zh: "关键抉择", en: "Key Choice" },
    voice: { zh: "声线", en: "Voice" },
    essence: { zh: "精要", en: "Essence" },
    voice_positioning: { zh: "声线定位", en: "Voice Positioning" },
    syntax_fingerprint: { zh: "句法指纹", en: "Syntax Fingerprint" },
    emotion_patterns: { zh: "情绪模式", en: "Emotion Patterns" },
    forbidden_speech: { zh: "言语禁区", en: "Forbidden Speech" },
    cognitive_bias: { zh: "认知偏向", en: "Cognitive Bias" },
    hidden_tension: { zh: "暗涌张力", en: "Hidden Tension" },
    nature: { zh: "关系性质", en: "Nature" },
    extras: { zh: "附加设定", en: "Extras" },
    positioning: { zh: "定位", en: "Positioning" },
    acts: { zh: "三幕结构", en: "Acts" },
    establish: { zh: "建置", en: "Establish" },
    confront: { zh: "对抗", en: "Confront" },
    resolve: { zh: "解决", en: "Resolve" },
    conflicts: { zh: "冲突层级", en: "Conflicts" },
    nodes: { zh: "关键节点", en: "Nodes" },
    consequence: { zh: "后果", en: "Consequence" },
    style_tone: { zh: "文风约束", en: "Style Tone" },
    chapter_range: { zh: "章节范围", en: "Chapter Range" },
    volume_number: { zh: "卷号", en: "Volume Number" },
    arc_name: { zh: "故事弧", en: "Arc Name" },
    character_arcs: { zh: "人物弧线", en: "Character Arcs" },
    decision_points: { zh: "决策点", en: "Decision Points" },
    moral_dilemma: { zh: "道德困境", en: "Moral Dilemma" },
    anchors: { zh: "叙事锚点", en: "Anchors" },
    opening_hook: { zh: "开篇钩子", en: "Opening Hook" },
    climax: { zh: "高潮", en: "Climax" },
    next_bridge: { zh: "章末衔接", en: "Next Bridge" },
    info_boundary: { zh: "信息边界", en: "Information Boundary" },
    protagonist_knows: { zh: "主角已知", en: "Protagonist Knows" },
    protagonist_doesnt_know: { zh: "主角未知", en: "Protagonist Does Not Know" },
    info_voids: { zh: "信息空洞", en: "Information Voids" },
    hook_ops_summary: { zh: "伏笔操作", en: "Hook Operations" },
    debt_ops_summary: { zh: "债务操作", en: "Debt Operations" },
    target_word_count: { zh: "目标字数", en: "Target Word Count" },
    world_time_advance: { zh: "世界时间推进", en: "World Time Advance" },
    tension_level: { zh: "张力", en: "Tension" }
  };

  function fieldLabel(key) {
    const fallback = humanKey(key);
    const label = fieldLabels[String(key || "")] || {};
    return { zh: label.zh || fallback, en: label.en || fallback };
  }

  function labelText(key, lang) {
    const label = fieldLabel(key);
    return label[lang] || label.en || label.zh || humanKey(key);
  }

  function summarize(value, depth, lang) {
    const level = depth || 0;
    const locale = lang || (window.CLANG === "en" ? "en" : "zh");
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.slice(0, 4).map((item) => summarize(item, level + 1, locale)).filter(Boolean).join(" · ");
    if (typeof value === "object") {
      return Object.entries(value).slice(0, level ? 3 : 5)
        .map(([key, item]) => labelText(key, locale) + ": " + summarize(item, level + 1, locale))
        .filter((item) => !item.endsWith(": "))
        .join("；");
    }
    return String(value);
  }

  function localizedSummary(value) {
    return { zh: summarize(value, 0, "zh"), en: summarize(value, 0, "en") };
  }

  function contentObject(value) {
    if (!value || typeof value !== "object") return {};
    const content = value.content;
    return content && typeof content === "object" && !Array.isArray(content) ? content : value;
  }

  // Server-managed envelope keys that must not be echoed back in an edit PUT
  // (e.g. created_at/updated_at are datetimes the engine cannot re-serialize).
  const RESOURCE_META_KEYS = ["id", "book_id", "resource_type", "resource_key", "revision_id", "base_version", "version", "status", "created_at", "updated_at"];
  function stripResourceMeta(content) {
    if (!content || typeof content !== "object" || Array.isArray(content)) return content;
    const out = {};
    Object.keys(content).forEach((k) => { if (RESOURCE_META_KEYS.indexOf(k) < 0) out[k] = content[k]; });
    return out;
  }

  function objectFields(value, skipKeys) {
    const skip = new Set(skipKeys || []);
    return Object.entries(contentObject(value))
      .filter(([key, item]) => !skip.has(key) && item != null && typeof item !== "function")
      .map(([key, item]) => ({
        k: fieldLabel(key),
        v: localizedSummary(item)
      }))
      .filter((field) => field.v.zh || field.v.en);
  }

  /* ---- empty-but-shape-complete skeletons ----
     Screens render CONSOLE_DATA without null checks (the design seed is always
     full), so "no data" must be expressed as blank fields inside the same
     shape, never as null. Every mutable field cleared at bootstrap and every
     applyX() merge goes through these builders. */
  function detailSkeleton(bookId, chapterNumber) {
    return {
      _bookId: bookId == null ? null : String(bookId),
      _syncStatus: "pending",
      no: Number(chapterNumber) || 0, title: zhEn(""), status: zhEn(""), target: "", tension: 0,
      pos: zhEn(""),
      anchors: { hook: zhEn(""), climax: zhEn(""), close: zhEn(""), nextlink: zhEn("") },
      dilemma: zhEn(""), points: [], foreshadow: [], debts: [],
      know: [], dontknow: [], worldtime: zhEn(""),
      calls: [], info_voids: [], agents: [],
      hooks: [], debt_ledger: []
    };
  }

  function wsmSkeleton(bookId, chapterNumber) {
    return {
      _bookId: bookId == null ? null : String(bookId),
      no: Number(chapterNumber) || 0, world_time: zhEn(""), time_advanced: zhEn(""),
      forces: [], undercurrents: [], on_camera: [], off_camera: [], power_shift: zhEn("")
    };
  }

  function chapterDetailSnapshot(bookId, chapterNumber) {
    const detail = window.CONSOLE_DATA && window.CONSOLE_DATA.detail;
    return detail && String(detail._bookId || "") === String(bookId || "")
      && Number(detail.no) === Number(chapterNumber)
      ? JSON.parse(JSON.stringify(detail)) : detailSkeleton(bookId, chapterNumber);
  }

  // The single book/chapter state boundary used by console navigation. Planned
  // chapters get the same complete empty shape as materialized chapters.
  function chapterViewSnapshot(bookId, chapterNumber) {
    const data = window.CONSOLE_DATA || {};
    const sameBook = String(data.book && data.book.id || "") === String(bookId || "");
    const detail = chapterDetailSnapshot(bookId, chapterNumber);
    const generated = new Set(sameBook
      ? (data.chapters || []).filter(chapter => chapter && (chapter.guide_ready === true
        || (chapter.guide_ready == null && chapter.state === "done"))).map(chapter => Number(chapter.no)) : []);
    // The identity-checked guide is stronger evidence than a missing list
    // summary. Re-entering the workbench must not demote an already read guide.
    if (sameBook && detail._syncStatus === "ready") generated.add(Number(chapterNumber));
    return {
      bookId: String(bookId || ""), chap: Number(chapterNumber) || 0,
      detail,
      generated
    };
  }

  function captureChapterTarget(bookId, chapterNumber) {
    const epoch = chapterTargetEpoch, seq = loadSeq;
    return () => epoch === chapterTargetEpoch && seq === loadSeq
      && chapterTargetIsCurrent(bookId, chapterNumber);
  }

  function proseSkeleton(bookId, chapterNumber) {
    return {
      _bookId: bookId == null ? null : String(bookId),
      no: Number(chapterNumber) || 0, title: zhEn(""), words: 0, target: 0, consistency: zhEn(""),
      version: 0, updated_at: "", _bodyLoaded: false,
      access_error: null,
      paras: [], revIndex: -1, rev: { orig: zhEn(""), sug: zhEn("") },
      side: { present: [], relations: [], setups: [] }
    };
  }

  function worldLedgerSkeleton(bookId) {
    var seed = window.CONSOLE_DATA && window.CONSOLE_DATA.world;
    var stages = seed && Array.isArray(seed.stages) && seed.stages.length
      ? seed.stages
      : [{ zh: "暗示", en: "Hint" }, { zh: "半明", en: "Half" }, { zh: "明牌", en: "Open" }, { zh: "收束", en: "Close" }];
    return {
      _bookId: bookId == null ? null : String(bookId),
      nodes: [], edges: [], threads: [], stages: stages, foreshadows: [], debts: []
    };
  }

  function volOutlineSkeleton() {
    return {
      no: zhEn(""), name: zhEn(""), range: zhEn(""), chapters: 0, words_est: zhEn(""),
      positioning: zhEn(""),
      acts: {
        establish: { chapters: zhEn(""), content: zhEn("") },
        confront: { chapters: zhEn(""), content: zhEn("") },
        resolve: { chapters: zhEn(""), content: zhEn("") }
      },
      conflicts: { external: zhEn(""), internal: zhEn(""), underlying: zhEn("") },
      nodes: [], characters: [],
      ending: { character_state: zhEn(""), suspense: zhEn(""), emotional_aftertaste: zhEn("") },
      style_tone: zhEn("")
    };
  }

  function arcOutlineSkeleton() {
    return {
      arc_name: zhEn(""), volume: zhEn(""), range: zhEn(""), more: zhEn(""),
      chapters: [], character_arcs: [], decision_points: []
    };
  }

  // Create data is a shared render buffer. Every reset advances its generation so
  // delayed responses captured for a previous book can no longer write into it.
  let createDataGeneration = 0;

  function captureCreateDataTarget(bookId) {
    return { bookId: bookId == null ? null : String(bookId), generation: createDataGeneration };
  }

  function createDataTargetIsCurrent(target) {
    if (!target || !target.bookId || target.generation !== createDataGeneration) return false;
    const stateBookId = window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.selectedBookId;
    const renderedBookId = window.CONSOLE_DATA && window.CONSOLE_DATA.book && window.CONSOLE_DATA.book.id;
    if (stateBookId != null && String(stateBookId) !== target.bookId) return false;
    if (renderedBookId != null && String(renderedBookId) !== target.bookId) return false;
    return true;
  }

  // Portal create data — clear mutable fields, keep static reference data intact
  function resetPortalCreateData() {
    createDataGeneration += 1;
    if (!window.CONSOLE_DATA || !window.CONSOLE_DATA.create) return;
    window.CONSOLE_DATA.create.worldDims = [];
    window.CONSOLE_DATA.create.cast = [];
    window.CONSOLE_DATA.create.castExtra = zhEn("");
    window.CONSOLE_DATA.create.story = [];
    window.CONSOLE_DATA.create.volOne = volOutlineSkeleton();
    window.CONSOLE_DATA.create.briefOne = arcOutlineSkeleton();
    window.CONSOLE_DATA.create.stats = { dims: 0, chars: 0, fields: 0, conflict: 0 };
    window.CONSOLE_DATA.create.styleProfile = null;
  }

  // Reroll: wipe one phase's cached output so the regenerated content replaces
  // the previous cards instead of rendering on top of stale data.
  function clearPhaseData(kind) {
    createDataGeneration += 1;
    if (!window.CONSOLE_DATA || !window.CONSOLE_DATA.create) return;
    const create = window.CONSOLE_DATA.create;
    if (kind === "world") create.worldDims = [];
    else if (kind === "cast") { create.cast = []; create.castExtra = zhEn(""); }
    else if (kind === "story") create.story = [];
    else if (kind === "outline") {
      create.volOne = volOutlineSkeleton();
      create.briefOne = arcOutlineSkeleton();
      window.CONSOLE_DATA.volOutline = volOutlineSkeleton();
      window.CONSOLE_DATA.arcOutline = arcOutlineSkeleton();
    }
    updateCreateStats();
  }

  // Clear ALL mutable seed data that data-console.js injected for design-time preview.
  // Called unconditionally at bootstrap so stale demo content never leaks into the live portal.
  // Replaces demo content (沈砚/青冥录/青冥剑 etc.) with shape-complete blanks.
  function clearMutableSeedData() {
    if (!window.CONSOLE_DATA) return;
    // Shelf: keep only the "new book" placeholder
    var newCard = null;
    if (Array.isArray(window.CONSOLE_DATA.shelf)) {
      newCard = window.CONSOLE_DATA.shelf.find(function (c) { return c.tint === "new"; });
    }
    window.CONSOLE_DATA.shelf = [newCard || newBookCard()];
    // Book detail — blank skeleton
    window.CONSOLE_DATA.book = { id: null, engine_book_id: null, title: zhEn(""), genre: zhEn(""), status: zhEn(""), chap: 0, words: zhEn("") };
    window.CONSOLE_DATA.volumes = [];
    window.CONSOLE_DATA.chapters = [];
    // Outlines, chapter detail, world-state machine, prose, cross-chapter ledger
    window.CONSOLE_DATA.volOutline = volOutlineSkeleton();
    window.CONSOLE_DATA.arcOutline = arcOutlineSkeleton();
    window.CONSOLE_DATA.detail = detailSkeleton();
    window.CONSOLE_DATA.wsm = wsmSkeleton();
    window.CONSOLE_DATA.prose = proseSkeleton();
    window.CONSOLE_DATA.world = worldLedgerSkeleton();
    // Create wizard — empty arrays so UI shows 0/0 rather than crashing
    resetPortalCreateData();
    // Clear world/premise display hints
    window.CONSOLE_DATA.create.worldName = zhEn("");
    window.CONSOLE_DATA.create.coreRule = zhEn("");
    window.CONSOLE_DATA.create.protagonist = zhEn("");
  }

  function resetBookScopedView(bookId, chapterNumber) {
    if (!window.CONSOLE_DATA) return;
    const n = Number(chapterNumber) || 0;
    window.CONSOLE_DATA.volumes = [];
    window.CONSOLE_DATA.chapters = [];
    window.CONSOLE_DATA.volOutline = volOutlineSkeleton();
    window.CONSOLE_DATA.arcOutline = arcOutlineSkeleton();
    window.CONSOLE_DATA.detail = detailSkeleton(bookId, n);
    window.CONSOLE_DATA.wsm = wsmSkeleton(bookId, n);
    window.CONSOLE_DATA.prose = proseSkeleton(bookId, n);
    window.CONSOLE_DATA.world = worldLedgerSkeleton(bookId);
  }

  function updateCreateStats() {
    if (!window.CONSOLE_DATA || !window.CONSOLE_DATA.create) return;
    const create = window.CONSOLE_DATA.create;
    const worldDims = Array.isArray(create.worldDims) ? create.worldDims : [];
    const cast = Array.isArray(create.cast) ? create.cast : [];
    const story = Array.isArray(create.story) ? create.story : [];
    create.stats = {
      dims: worldDims.length,
      chars: cast.length,
      fields: story.reduce((total, item) => total + ((item.fields && item.fields.length) || 0), 0),
      conflict: 0
    };
    // Extract ReadyStep highlights from real data
    var coreDim = worldDims.find(function (d) { return d.key === "core_laws"; });
    if (coreDim && coreDim.lead) {
      create.coreRule = coreDim.lead;
      // worldName from core_laws essence (lead) first 8-12 chars
      var leadZh = (coreDim.lead.zh || "").trim();
      var leadEn = (coreDim.lead.en || "").trim();
      if (leadZh || leadEn) {
        create.worldName = {
          zh: leadZh ? leadZh.split(/[。——；，,\n]/)[0].slice(0, 20) : leadEn.split(/[.—;,\n]/)[0].slice(0, 20),
          en: leadEn ? leadEn.split(/[.—;,\n]/)[0].slice(0, 24) : leadZh.split(/[。——；，,\n]/)[0].slice(0, 24)
        };
      }
    }
    create.protagonist = cast.length ? cast[0].name : zhEn("");
  }

  let createDataLocked = false;

  function setCreateDataLocked(value) {
    createDataLocked = !!value;
    window.LF_PORTAL_CREATE_LOCK = { active: createDataLocked };
  }

  function isCreateDataLocked() {
    return createDataLocked || !!(window.LF_PORTAL_CREATE_LOCK && window.LF_PORTAL_CREATE_LOCK.active);
  }

  function localizedValue(value) {
    return { zh: summarize(value, 0, "zh"), en: summarize(value, 0, "en") };
  }

  function isRelItem(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const hasPair = ("a" in item && "b" in item) ||
      ("from" in item && "to" in item) ||
      ("source" in item && "target" in item);
    return hasPair;
  }

  function relTone(item) {
    const raw = String(item.tone || "").toLowerCase();
    return ["hostile", "ally", "secret", "shadow", "mixed", "slate"].includes(raw) ? raw : "";
  }

  function relBlock(label, arr) {
    const items = arr.map((item) => ({
      a: localizedValue(item.a != null ? item.a : item.from != null ? item.from : item.source),
      b: localizedValue(item.b != null ? item.b : item.to != null ? item.to : item.target),
      rel: localizedValue(item.rel != null ? item.rel : item.relation != null ? item.relation : item.type),
      tone: relTone(item),
      v: localizedValue(item.v != null ? item.v : item.tension_point != null ? item.tension_point : item.desc != null ? item.desc : item.description != null ? item.description : item.note)
    }));
    return { type: "rel", k: label, items };
  }

  function cardsBlock(label, arr) {
    const items = arr.map((item, idx) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return { t: localizedValue(item), rows: [] };
      }
      const entries = Object.entries(item);
      const titleEntry = entries.find(([k]) => /name|title|名|标题|key/i.test(k)) || entries[0] || [];
      const title = titleEntry[1] != null ? localizedValue(titleEntry[1]) : zhEn(String(idx + 1));
      const rows = entries
        .filter(([k]) => k !== titleEntry[0])
        .map(([k, v]) => ({ key: k, k: fieldLabel(k), v: localizedValue(v) }));
      return { t: title, rows };
    });
    return { type: "cards", k: label, items, cols: items.length <= 2 ? 1 : 2 };
  }

  // Tag every block with its source content field key so editors can splice the
  // raw value back into the full dimension JSON on save.
  function blockFromField(fieldKey, fieldValue) {
    const block = blockFromFieldInner(fieldKey, fieldValue);
    if (block && typeof block === "object") block.key = fieldKey;
    return block;
  }

  function blockFromFieldInner(fieldKey, fieldValue) {
    const label = fieldLabel(fieldKey);
    if (Array.isArray(fieldValue) && fieldValue.length) {
      const allStrings = fieldValue.every((item) => typeof item === "string" || typeof item === "number");
      if (allStrings) {
        return { type: "list", k: label, items: fieldValue.map((item) => zhEn(String(item))) };
      }
      if (fieldValue.every(isRelItem)) return relBlock(label, fieldValue);
      if (fieldValue.every((item) => item && typeof item === "object")) return cardsBlock(label, fieldValue);
    }
    if (fieldValue && typeof fieldValue === "object" && !Array.isArray(fieldValue)) {
      const entries = Object.entries(fieldValue).filter(([, v]) => v != null);
      if (entries.length > 1) {
        const rows = entries.map(([k, v]) => ({ k: fieldLabel(k), v: localizedValue(v) }));
        return { type: "cards", k: label, items: [{ t: label, rows }], cols: 1, singleObject: true };
      }
    }
    return { type: "text", k: label, v: localizedValue(fieldValue) };
  }

  function unwrapWorldDimension(key, payload) {
    if (!payload || typeof payload !== "object") return payload;
    if (payload.dimensions && payload.dimensions[key]) return payload.dimensions[key];
    if (payload.world && payload.world[key]) return payload.world[key];
    if (payload[key]) return payload[key];
    if (payload.content && typeof payload.content === "object") return payload.content;
    return payload;
  }

  function mapWorldDimension(key, payload) {
    const meta = dimensionMeta[key] || {};
    const value = unwrapWorldDimension(key, payload);
    if (!value || typeof value !== "object") return null;
    const skip = new Set([
      "id",
      "book_id",
      "resource_type",
      "resource_key",
      "revision_id",
      "base_version",
      "version",
      "status",
      "created_at",
      "updated_at",
      "essence"
    ]);
    const entries = Object.entries(contentObject(value)).filter(([fieldKey, fieldValue]) => {
      return !skip.has(fieldKey) && fieldValue != null && typeof fieldValue !== "function";
    });
    const fields = entries.map(([fieldKey, fieldValue]) => ({
      k: fieldLabel(fieldKey),
      v: localizedSummary(fieldValue)
    })).filter((field) => field.v.zh || field.v.en);
    if (!fields.length) return null;
    const blocks = entries
      .map(([fieldKey, fieldValue]) => blockFromField(fieldKey, fieldValue))
      .filter((block) => block && (block.type !== "text" || block.v.zh || block.v.en));
    var essence = contentObject(value).essence;
    var lead = (essence != null) ? localizedSummary(essence) : fields.length ? fields[0].v : localizedSummary(value);
    return {
      key,
      name: { zh: meta.zh || fieldLabel(key).zh, en: meta.en || fieldLabel(key).en },
      agent: { zh: meta.agentZh || "小说引擎", en: meta.agentEn || "Novel engine" },
      sub: fields.length,
      sample: fields.length ? fields[0].v : localizedSummary(value),
      lead: lead,
      leadKey: essence != null ? "essence" : null,
      fields,
      blocks
    };
  }

  function worldDimensionLabel(key) {
    const meta = dimensionMeta[key] || {};
    const fallback = fieldLabel(key);
    return { zh: meta.zh || fallback.zh, en: meta.en || fallback.en };
  }

  function worldDimensionAgent(key) {
    const meta = dimensionMeta[key] || {};
    return { zh: meta.agentZh || "小说引擎", en: meta.agentEn || "Novel engine" };
  }

  function mergeWorldDimensionItems(items, item) {
    const byKey = {};
    const unknown = [];
    (Array.isArray(items) ? items : []).forEach((entry) => {
      if (entry && entry.key) byKey[entry.key] = entry;
      else if (entry) unknown.push(entry);
    });
    if (item && item.key) byKey[item.key] = item;
    const ordered = Object.keys(dimensionMeta).filter((key) => byKey[key]).map((key) => byKey[key]);
    Object.keys(byKey).forEach((key) => {
      if (!dimensionMeta[key]) ordered.push(byKey[key]);
    });
    return ordered.concat(unknown);
  }

  function mapWorld(world) {
    const dimensions = world && (world.dimensions || (world.world && world.world.dimensions) || world.world);
    if (!dimensions || typeof dimensions !== "object" || !Object.keys(dimensions).length) return [];
    return Object.entries(dimensionMeta)
      .filter(([key]) => dimensions[key] && typeof dimensions[key] === "object")
      .map(([key]) => mapWorldDimension(key, dimensions[key]))
      .filter(Boolean);
  }

  function mapCharacterRels(content) {
    const extras = content.extras && typeof content.extras === "object" ? content.extras : {};
    const raw = content.relationships || content.relations || content.rels || extras.relationships;
    if (!Array.isArray(raw)) return [];
    return raw.map((rel) => {
      if (!rel || typeof rel !== "object") {
        return { target: zhEn(String(rel || "")), nature: zhEn(""), attitude: zhEn(""), meaning: zhEn(""), tension: zhEn("") };
      }
      const text = (value) => zhEn(value != null ? summarize(value) : "");
      return {
        target: text(rel.target || rel.name || rel.to || rel.character),
        nature: text(rel.nature || rel.relation || rel.type),
        attitude: text(rel.default_attitude || rel.attitude),
        meaning: text(rel.meaning_to_character || rel.meaning || rel.description || rel.note),
        tension: text(rel.hidden_tension || rel.tension || rel.tension_point)
      };
    });
  }

  function mapCharacters(payload) {
    const characters = normalizeList(payload);
    return characters.map((item, index) => {
      const content = contentObject(item);
      const name = content.name || item.name || item.id || "Character " + (index + 1);
      const role = content.role || content.identity || content.narrative_function || content.type || "";
      const sample = content.summary || content.description || content.profile || summarize(content);
      var essence = content.essence;
      var lead = (essence != null) ? localizedSummary(essence) : zhEn(sample);
      const fields = objectFields(content, ["id", "name", "role", "identity", "summary", "description", "profile", "type", "essence"]);
      if (!lead.zh && !lead.en && fields.length) lead = fields[0].v;
      const blank = { zh: "", en: "" };
      const text = (...values) => {
        for (const value of values) {
          if (value != null && value !== "") return zhEn(summarize(value));
        }
        return blank;
      };
      const names = (value) => Array.isArray(value) ? value.map((item) => zhEn(String(item))) : [];
      const obj = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
      // Engine character schema (wf-nvl-character): skeleton fields are flat;
      // beliefs/deep dimensions arrive as nested objects (world_position,
      // extras.world_anchor, beliefs, deep_fear, secrets, bottom_line, traumas,
      // contradictions, arc_description). CastProfile renders pos/anchor/rels/
      // depth unconditionally — always emit the full三段式 shape, blank where
      // the engine has no data yet.
      const wp = obj(content.world_position);
      const extras = obj(content.extras);
      const anchorSrc = obj(extras.world_anchor || content.world_anchor);
      const beliefs = obj(content.beliefs);
      const fear = obj(content.deep_fear);
      const secrets = obj(content.secrets);
      const bottom = obj(content.bottom_line);
      const traumas = obj(content.traumas);
      const contra = obj(content.contradictions);
      const arc = obj(content.arc_description);
      const voice = obj(content.voice);
      const syntax = obj(voice.syntax_fingerprint);
      const emotions = obj(voice.emotion_patterns);
      const epithetRaw = content.epithet || content.title || content.archetype
        || (Array.isArray(content.aliases) && content.aliases[0]) || "";
      return {
        rawName: String(name),
        rawContent: content,
        name: zhEn(String(name)),
        role: zhEn(String(role)),
        epithet: epithetRaw ? zhEn(String(epithetRaw)) : blank,
        agent: zhEn("Novel engine"),
        tint: ["gold", "terra", "slate"][index % 3],
        sub: fields.length,
        sample: zhEn(sample),
        lead: lead,
        fields,
        true_name: zhEn(String(content.true_name || "")),
        aliases: names(content.aliases),
        gender: text(content.gender),
        age: text(content.age),
        pos: {
          origin: text(wp.origin_class, content.origin, content.background),
          aff: text(wp.affiliation, content.affiliation, content.faction, content.camp),
          srole: text(wp.social_role, content.social_status, content.social_role, content.occupation),
          stance: text(wp.stance_on_core_conflict, content.stance, content.position)
        },
        anchor: {
          embody: text(anchorSrc.embodies_rule, content.embody, content.theme_embodiment),
          shaped: text(anchorSrc.shaped_by_rule, content.shaped_by, content.shaped),
          challenge: text(anchorSrc.may_challenge_rule, content.challenge, content.core_challenge)
        },
        rels: mapCharacterRels(content),
        belief: {
          core: text(beliefs.core_belief, content.belief, content.core_belief, content.motto),
          persp: String(beliefs.author_perspective || content.author_perspective || "ambiguous"),
          source: text(beliefs.belief_source, content.belief_source)
        },
        voice: {
          voice_positioning: text(voice.voice_positioning, content.voice_positioning),
          cognitive_bias: text(voice.cognitive_bias, content.cognitive_bias),
          syntax_fingerprint: {
            sentence_preference: text(syntax.sentence_preference),
            catchphrases: names(syntax.catchphrases),
            pause_habit: text(syntax.pause_habit),
            dominant_sentence_type: text(syntax.dominant_sentence_type)
          },
          forbidden_speech: names(voice.forbidden_speech),
          emotion_patterns: {
            anger: text(emotions.anger),
            nervous: text(emotions.nervous),
            lying: text(emotions.lying)
          }
        },
        depth: {
          desire: { surface: text(content.surface_goal, content.surface_desire), deep: text(content.deep_desire, content.desire) },
          fear: { fear: text(fear.fear, content.fear), source: text(fear.source, content.fear_source) },
          secret: {
            content: text(secrets.content, content.secret),
            knows: names(secrets.who_knows),
            should: names(secrets.who_doesnt_know_but_should),
            expose: text(secrets.exposure_consequence, content.secret_expose)
          },
          bottom: {
            cond: text(bottom.condition, content.bottom_line),
            source: text(bottom.source, content.bottom_source),
            react: text(bottom.reaction_when_crossed, content.bottom_react)
          },
          trauma: {
            wound: text(traumas.wound, content.trauma, content.wound),
            trigger: text(traumas.trigger, content.trigger),
            stress: text(traumas.stress_response, content.stress),
            impact: text(traumas.impact_on_behavior, content.impact)
          },
          contra: {
            elements: text(contra.conflicting_elements, content.contradiction, content.contra),
            source: text(contra.source, content.contra_source),
            direction: text(contra.possible_direction, content.contra_direction)
          },
          arc: {
            growth: text(arc.growth_direction, content.growth),
            fall: text(arc.corruption_direction, content.fall),
            choice: text(arc.key_choice, content.choice)
          }
        }
      };
    }).filter((item) => item.name.zh || item.fields.length);
  }

  // Engine story plan content: { surface, engine, payoff, constraints[], issues[] }.
  // Render in narrative order with zh labels and structured blocks (DimBlocks),
  // not the raw key dump. `issues` is an internal QA field — never shown.
  const STORY_SECTION_ORDER = ["surface", "engine", "payoff", "constraints"];
  const STORY_SECTION_SKIP = new Set([
    "id", "title", "name", "summary", "description", "created_at", "updated_at", "version", "issues"
  ]);
  const storySectionMeta = {
    surface: { agentZh: "立意策划", agentEn: "Premise Planner" },
    engine: { agentZh: "冲突设计师", agentEn: "Conflict Designer" },
    payoff: { agentZh: "节奏编排师", agentEn: "Pacing Director" },
    constraints: { agentZh: "红线审定官", agentEn: "Guardrail Warden" }
  };

  function storySectionAgent(key) {
    const meta = storySectionMeta[key] || {};
    return { zh: meta.agentZh || "故事架构师", en: meta.agentEn || "Story Architect" };
  }

  function storyPlanSections(plan) {
    const content = contentObject(plan);
    const keys = Object.keys(content).filter((key) =>
      !STORY_SECTION_SKIP.has(key) && content[key] != null && typeof content[key] === "object");
    keys.sort((a, b) => {
      const ia = STORY_SECTION_ORDER.indexOf(a);
      const ib = STORY_SECTION_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    const sections = [];
    keys.forEach((key) => {
      const value = content[key];
      if (Array.isArray(value)) {
        if (!value.length) return;
        var leadArr = localizedSummary(value[0]);
        sections.push({
          key,
          name: fieldLabel(key),
          agent: storySectionAgent(key),
          sub: value.length,
          sample: leadArr,
          lead: leadArr,
          fields: value.map((item, index) => ({ k: zhEn(String(index + 1)), v: localizedSummary(item) })),
          blocks: [blockFromField(key, value)]
        });
        return;
      }
      const fields = objectFields(value, ["essence"]);
      if (!fields.length) return;
      const blocks = Object.entries(contentObject(value))
        .filter(([, item]) => item != null && typeof item !== "function")
        .filter(([fieldKey]) => fieldKey !== "essence")
        .map(([fieldKey, item]) => blockFromField(fieldKey, item))
        .filter((block) => block && (block.type !== "text" || block.v.zh || block.v.en));
      var essence = contentObject(value).essence;
      var lead = (essence != null) ? localizedSummary(essence) : localizedSummary(value);
      sections.push({
        key,
        name: fieldLabel(key),
        agent: storySectionAgent(key),
        sub: fields.length,
        sample: localizedSummary(value),
        lead: lead,
        leadKey: essence != null ? "essence" : null,
        fields,
        blocks
      });
    });
    if (sections.length) return sections;
    const fields = objectFields(content, ["id", "title", "name", "summary", "description", "created_at", "updated_at", "version"]);
    if (!fields.length) return [];
    return [{
      name: zhEn(content.title || content.name || "Story plan"),
      agent: zhEn("Novel engine"),
      sub: fields.length,
      sample: content.summary || content.description ? zhEn(content.summary || content.description) : localizedSummary(content),
      fields
    }];
  }

  function mapStoryPlan(plan) {
    if (!plan || typeof plan !== "object") return [];
    return storyPlanSections(plan).slice(0, 8);
  }

  const DISTANCE_MAP = { "近": "near", "中": "mid", "远": "far" };

  function mapDistance(value) {
    const raw = String(value == null ? "" : value).trim();
    return DISTANCE_MAP[raw] || "far";
  }

  function mapWsm(world) {
    if (!world || typeof world !== "object") return null;
    const state = world.world_state && typeof world.world_state === "object" ? world.world_state : {};
    const events = world.world_events && typeof world.world_events === "object" ? world.world_events : {};
    const forces = (Array.isArray(state.forces) ? state.forces : []).map((force) => ({
      name: zhEn(String(force.name || "")),
      status: zhEn(String(force.status || "")),
      distance: mapDistance(force.distance),
      source: String(force.source || "")
    }));
    const progressByName = {};
    (Array.isArray(events.undercurrent_progress) ? events.undercurrent_progress : []).forEach((item) => {
      if (item && item.name) progressByName[String(item.name)] = item;
    });
    const undercurrents = (Array.isArray(state.undercurrents) ? state.undercurrents : []).map((flow) => {
      const progress = progressByName[String(flow.name || "")] || {};
      return {
        name: zhEn(String(flow.name || "")),
        status: zhEn(String(flow.status || "")),
        last: String(flow.last_active_chapter || ""),
        source: String(flow.source || "")
      };
    });
    const onCamera = (Array.isArray(events.on_camera_events) ? events.on_camera_events : []).map((item) => zhEn(String(item)));
    const offCamera = (Array.isArray(events.off_camera_events) ? events.off_camera_events : []).map((item) => zhEn(String(item)));
    return {
      world_time: zhEn(String(state.world_time || events.world_time || "")),
      time_advanced: zhEn(
        state.time_advanced_days != null ? "+" + state.time_advanced_days + " 天" : ""
      ),
      forces,
      undercurrents,
      on_camera: onCamera,
      off_camera: offCamera,
      power_shift: zhEn(String(events.power_shift || ""))
    };
  }

  function opItems(summary, op) {
    const group = summary && Array.isArray(summary[op === "new" ? "new" : op === "adv" ? "advance" : "resolve"])
      ? summary[op === "new" ? "new" : op === "adv" ? "advance" : "resolve"]
      : [];
    return group.map((item) => ({
      op,
      id: String(item.id || item.item_id || ""),
      t: zhEn(String(item.description || item.t || "")),
      when: zhEn(String(item.expected_payoff || ""))
    }));
  }

  function mapDetail(guidePayload) {
    if (!guidePayload || typeof guidePayload !== "object") return null;
    const guide = contentObject(guidePayload.guide != null ? guidePayload.guide : guidePayload);
    if (!guide || typeof guide !== "object" || Array.isArray(guide)
        || !Object.keys(stripResourceMeta(guide)).length) return null;
    const anchors = guide.anchors && typeof guide.anchors === "object" ? guide.anchors : {};
    const boundary = guide.info_boundary && typeof guide.info_boundary === "object" ? guide.info_boundary : {};
    const hookSummary = guide.hook_ops_summary || {};
    const debtSummary = guide.debt_ops_summary || {};
    const points = (Array.isArray(guide.plot_points) ? guide.plot_points : []).map((item) => zhEn(String(item)));
    const foreshadow = opItems(hookSummary, "new")
      .concat(opItems(hookSummary, "adv"))
      .concat(opItems(hookSummary, "pay"));
    const debts = opItems(debtSummary, "new")
      .concat(opItems(debtSummary, "adv"))
      .concat(opItems(debtSummary, "pay"));
    const knows = boundary.protagonist_knows
      ? [zhEn(String(boundary.protagonist_knows))]
      : [];
    const dontknow = boundary.protagonist_doesnt_know
      ? [zhEn(String(boundary.protagonist_doesnt_know))]
      : [];
    return {
      _resourceVersion: guidePayload.version != null ? Number(guidePayload.version) : null,
      title: zhEn(String(guide.title || "")),
      status: zhEn(""),
      target: String(guide.target_word_count || ""),
      tension: Number(guide.tension_level || 0),
      pos: zhEn(String(guide.positioning || "")),
      anchors: {
        hook: zhEn(String(anchors.opening_hook || "")),
        climax: zhEn(String(anchors.climax || "")),
        close: zhEn(String(anchors.ending || "")),
        nextlink: zhEn(String(anchors.next_bridge || ""))
      },
      dilemma: zhEn(String(guide.moral_dilemma || "")),
      points,
      foreshadow,
      debts,
      know: knows,
      dontknow,
      worldtime: zhEn(String(guide.world_time_advance || "")),
      hooks: Array.isArray(guidePayload.hooks) ? guidePayload.hooks : [],
      debt_ledger: Array.isArray(guidePayload.debts) ? guidePayload.debts : []
    };
  }

  // Unwrap a {zh,en} display leaf back to the plain string the engine stores.
  // After a user edit a leaf may already be a plain string (editDetail replaces
  // non-localized leaves verbatim), so handle both shapes.
  function unZhEn(value) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      const zh = value.zh != null ? String(value.zh) : "";
      return zh !== "" ? zh : (value.en != null ? String(value.en) : "");
    }
    return String(value);
  }

  // Write edited foreshadow/debt rows back into a guide's hook/debt ops summary,
  // matching by id within the new/advance/resolve groups (the same groups
  // opItems() reads from). Items the UI doesn't carry are left untouched.
  function writeOpsSummary(guide, key, rows) {
    if (!Array.isArray(rows)) return;
    const groupKey = { "new": "new", "adv": "advance", "pay": "resolve" };
    const summary = guide[key] && typeof guide[key] === "object" ? guide[key] : {};
    rows.forEach((row) => {
      if (!row || !row.id) return;
      const gk = groupKey[row.op] || "new";
      const arr = Array.isArray(summary[gk]) ? summary[gk] : (summary[gk] = []);
      let rec = arr.find((item) => String(item.id || item.item_id || "") === String(row.id));
      if (!rec) { rec = { id: row.id }; arr.push(rec); }
      rec.description = unZhEn(row.t);
      const when = unZhEn(row.when);
      if (when !== "") rec.expected_payoff = when;
    });
    guide[key] = summary;
  }

  // Inverse of mapDetail: fold the edited 细纲 view back onto the freshly-fetched
  // raw guide JSON so unmapped fields (and ops-summary metadata) survive the PUT.
  function detailToGuide(det, rawGuide) {
    const guide = rawGuide && typeof rawGuide === "object" ? JSON.parse(JSON.stringify(rawGuide)) : {};
    if (!det || typeof det !== "object") return guide;
    guide.title = unZhEn(det.title);
    guide.positioning = unZhEn(det.pos);
    guide.moral_dilemma = unZhEn(det.dilemma);
    guide.world_time_advance = unZhEn(det.worldtime);
    guide.target_word_count = String(det.target == null ? "" : det.target);
    if (det.tension != null && det.tension !== "") guide.tension_level = Number(det.tension);
    guide.anchors = Object.assign({}, guide.anchors, {
      opening_hook: unZhEn(det.anchors && det.anchors.hook),
      climax: unZhEn(det.anchors && det.anchors.climax),
      ending: unZhEn(det.anchors && det.anchors.close),
      next_bridge: unZhEn(det.anchors && det.anchors.nextlink)
    });
    guide.plot_points = (Array.isArray(det.points) ? det.points : []).map(unZhEn);
    guide.info_boundary = Object.assign({}, guide.info_boundary, {
      protagonist_knows: Array.isArray(det.know) ? det.know.map(unZhEn).join("；") : unZhEn(det.know),
      protagonist_doesnt_know: Array.isArray(det.dontknow) ? det.dontknow.map(unZhEn).join("；") : unZhEn(det.dontknow)
    });
    writeOpsSummary(guide, "hook_ops_summary", det.foreshadow);
    writeOpsSummary(guide, "debt_ops_summary", det.debts);
    return guide;
  }

  function chapterCountFromRange(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
    const start = Number(value.start);
    const end = Number(value.end);
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start + 1 : 0;
  }

  function mapVolume(volumePayload) {
    if (!volumePayload || typeof volumePayload !== "object") return null;
    const content = contentObject(volumePayload);
    if (!content || typeof content !== "object") return null;
    const rest = {};
    Object.entries(content).forEach(([key, value]) => {
      if (["title", "chapter_range", "volume_number"].includes(key)) return;
      rest[key] = value;
    });
    return Object.assign({
      no: content.volume_number != null ? content.volume_number : volumePayload.volume_number,
      name: content.title != null ? content.title : null,
      range: content.chapter_range != null ? content.chapter_range : null,
      chapters: Number(content.chapter_count != null ? content.chapter_count : content.chapters)
        || chapterCountFromRange(content.chapter_range)
    }, rest);
  }

  const RHYTHM_KEYS = { "铺垫": "setup", "蓄力": "build", "释放": "release", "后效": "after", setup: "setup", build: "build", release: "release", aftermath: "after", after: "after" };

  function mapBriefChapter(item) {
    if (!item || typeof item !== "object") return null;
    const rhythmRaw = item.rhythm;
    let rhythm;
    if (rhythmRaw && typeof rhythmRaw === "object") {
      rhythm = Object.assign({ k: RHYTHM_KEYS[String(rhythmRaw.zh || rhythmRaw.en || "").toLowerCase()] || "setup" }, rhythmRaw);
    } else {
      const text = String(rhythmRaw || "");
      rhythm = Object.assign(zhEn(text), { k: RHYTHM_KEYS[text.toLowerCase()] || RHYTHM_KEYS[text] || "setup" });
    }
    return {
      number: Number(item.number != null ? item.number : item.chapter_number) || 0,
      title: zhEn(summarize(item.title)),
      summary: zhEn(summarize(item.summary || item.gist)),
      rhythm,
      time_advance: zhEn(summarize(item.time_advance || ""))
    };
  }

  function mapNearTerm(nearTermPayload) {
    if (!nearTermPayload || typeof nearTermPayload !== "object") return null;
    const content = contentObject(nearTermPayload);
    if (!content || typeof content !== "object") return null;
    const mapped = Object.assign({}, content);
    // BriefTab/VolumeOutlineStep index c.rhythm.k and c.number directly —
    // normalize chapter rows to the seed shape.
    mapped.chapters = (Array.isArray(content.chapters) ? content.chapters : [])
      .map(mapBriefChapter).filter(Boolean);
    if (!Array.isArray(mapped.character_arcs)) mapped.character_arcs = [];
    if (!Array.isArray(mapped.decision_points)) mapped.decision_points = [];
    return mapped;
  }

  function mapOutline(volumePayload, nearTermPayload) {
    const volume = mapVolume(volumePayload);
    const nearTerm = mapNearTerm(nearTermPayload);
    return { volume, nearTerm };
  }

  function outlineVolumeNumber(payload) {
    const content = contentObject(payload);
    return Number(payload && payload.volume_number != null
      ? payload.volume_number
      : (content && content.volume_number)) || 0;
  }

  function mapOutlineVolumes(payload) {
    const grouped = new Map();
    normalizeList(payload).forEach((item) => {
      const number = outlineVolumeNumber(item);
      if (!number) return;
      const row = grouped.get(number) || { number, volumePayload: null, nearTermPayload: null };
      if (String(item && item.type) === "volume") row.volumePayload = item;
      if (String(item && item.type) === "near_term") row.nearTermPayload = item;
      grouped.set(number, row);
    });
    return Array.from(grouped.values()).sort((left, right) => left.number - right.number).map((row) => {
      const mapped = mapOutline(row.volumePayload, row.nearTermPayload);
      return {
        number: row.number,
        volume: mapped.volume ? mergeVolumeOutline(mapped.volume) : null,
        nearTerm: mapped.nearTerm ? mergeArcOutline(mapped.nearTerm) : null,
        volumeVersion: row.volumePayload && row.volumePayload.version != null ? row.volumePayload.version : null,
        nearTermVersion: row.nearTermPayload && row.nearTermPayload.version != null ? row.nearTermPayload.version : null,
        complete: !!(mapped.volume && mapped.nearTerm)
      };
    });
  }

  function outlineVolumeForChapter(chapterNumber, chapters, outlines) {
    const no = Number(chapterNumber);
    const chapter = (Array.isArray(chapters) ? chapters : []).find((item) => Number(item && item.no) === no);
    if (chapter && Number(chapter.vol) > 0) return Number(chapter.vol);
    const record = volumeRecords(outlines).find((item) => no >= item.start && no <= item.end);
    return record ? record.vnum : 0;
  }

  function applyOutlineForChapter(chapterNumber, outlines) {
    if (!Array.isArray(outlines) || !outlines.length) return false;
    const volumeNumber = outlineVolumeForChapter(
      chapterNumber,
      window.CONSOLE_DATA && window.CONSOLE_DATA.chapters,
      outlines
    );
    const row = mapOutlineVolumes(outlines).find((item) => item.number === volumeNumber);
    if (!row) return false;
    window.CONSOLE_DATA.volOutline = row.volume || volOutlineSkeleton();
    window.CONSOLE_DATA.arcOutline = row.nearTerm || arcOutlineSkeleton();
    return !!(row.volume || row.nearTerm);
  }

  function applyWorld(snapshot) {
    const mapped = mapWorld(snapshot.world) || [];
    window.CONSOLE_DATA.create.worldDims = mapped;
    updateCreateStats();
    return mapped.length > 0;
  }

  function applyCharacters(snapshot) {
    const mapped = mapCharacters(snapshot.characters) || [];
    window.CONSOLE_DATA.create.cast = mapped;
    window.CONSOLE_DATA.create.castExtra = zhEn("");
    updateCreateStats();
    return mapped.length > 0;
  }

  function applyCharacterCollection(createTarget, characters) {
    if (!createDataTargetIsCurrent(createTarget)) return null;
    const normalized = normalizeList(characters);
    const snapshot = window.LF_PORTAL_STATE;
    if (snapshot && String(snapshot.selectedBookId || "") === createTarget.bookId) {
      snapshot.characters = normalized;
      patchSnapshot({ characters: normalized });
    }
    applyCharacters({ characters: normalized });
    return window.CONSOLE_DATA.create.cast;
  }

  function localCharactersAfterMutation(createTarget, name, deleted) {
    if (!createDataTargetIsCurrent(createTarget)) return null;
    const current = Array.isArray(window.CONSOLE_DATA.create.cast)
      ? window.CONSOLE_DATA.create.cast
      : [];
    const rawCharacters = current.map(function (character) {
      const rawName = character && character.rawName ? character.rawName : "";
      if (character && character.rawContent && typeof character.rawContent === "object") {
        return Object.assign({}, character.rawContent, {
          name: character.rawContent.name || rawName
        });
      }
      return { name: rawName };
    });
    const next = deleted
      ? rawCharacters.filter(function (character) {
          return String(character && character.name || "") !== String(name);
        })
      : rawCharacters.concat(
          rawCharacters.some(function (character) {
            return String(character && character.name || "") === String(name);
          }) ? [] : [{ name: String(name) }]
        );
    return applyCharacterCollection(createTarget, next);
  }

  async function refreshCharactersAfterMutation(createTarget, name, deleted) {
    try {
      const characters = await fetchFullCharacters(createTarget.bookId, { strict: true });
      return applyCharacterCollection(createTarget, characters);
    } catch (strictError) {
      try {
        const characters = await fetchFullCharacters(createTarget.bookId);
        return applyCharacterCollection(createTarget, characters);
      } catch (listError) {
        // The mutation already succeeded. Apply its deterministic list effect so
        // the dialog can close without inviting a duplicate create/delete.
        return localCharactersAfterMutation(createTarget, name, deleted);
      }
    }
  }

  function applyStoryPlan(snapshot) {
    const mapped = mapStoryPlan(snapshot.storyPlan) || [];
    window.CONSOLE_DATA.create.story = mapped;
    updateCreateStats();
    return mapped.length > 0;
  }

  // Screens render outline leaves as React children via L(); anything that is
  // not a string/number/{zh,en} object would crash the tree. Coerce every
  // display leaf to the localized seed shape.
  function locText(value) {
    if (value == null) return zhEn("");
    if (typeof value === "object" && !Array.isArray(value) && ("zh" in value || "en" in value)) {
      const zh = value.zh != null ? value.zh : value.en;
      const en = value.en != null ? value.en : value.zh;
      return { zh: String(zh == null ? "" : zh), en: String(en == null ? "" : en) };
    }
    return localizedSummary(value);
  }

  function chapterRangeText(value) {
    if (value && typeof value === "object" && !Array.isArray(value) && (value.start != null || value.end != null)) {
      const lo = value.start != null ? value.start : "?";
      const hi = value.end != null ? value.end : "?";
      return { zh: "第 " + lo + "–" + hi + " 章", en: "Ch. " + lo + "–" + hi };
    }
    return locText(value);
  }

  // Merge engine output over the skeleton so nested objects screens index into
  // (acts.establish, conflicts.external, ending.character_state …) always exist.
  function mergeVolumeOutline(mapped) {
    const skeleton = volOutlineSkeleton();
    const merged = Object.assign({}, skeleton, mapped);
    merged.acts = Object.assign({}, skeleton.acts, mapped.acts || {});
    ["establish", "confront", "resolve"].forEach((key) => {
      const act = Object.assign({}, skeleton.acts[key], merged.acts[key] || {});
      merged.acts[key] = { chapters: chapterRangeText(act.chapters), content: locText(act.content) };
    });
    merged.conflicts = Object.assign({}, skeleton.conflicts, mapped.conflicts || {});
    merged.ending = Object.assign({}, skeleton.ending, mapped.ending || {});
    ["external", "internal", "underlying"].forEach((key) => { merged.conflicts[key] = locText(merged.conflicts[key]); });
    ["character_state", "suspense", "emotional_aftertaste"].forEach((key) => { merged.ending[key] = locText(merged.ending[key]); });
    merged.name = locText(merged.name);
    merged.range = chapterRangeText(merged.range);
    merged.words_est = locText(merged.words_est);
    merged.positioning = locText(merged.positioning);
    merged.style_tone = locText(merged.style_tone);
    merged.chapters = Number(merged.chapters) || 0;
    merged.nodes = (Array.isArray(merged.nodes) ? merged.nodes : []).map((node, index) => ({
      id: String(node && node.id != null ? node.id : "N" + (index + 1)),
      description: locText(node && node.description),
      consequence: locText(node && (node.consequence != null ? node.consequence : node.consequences))
    }));
    merged.characters = (Array.isArray(merged.characters) ? merged.characters : []).map((ch) => ({
      name: locText(ch && ch.name),
      identity: locText(ch && ch.identity),
      narrative_function: locText(ch && (ch.narrative_function != null ? ch.narrative_function : ch.function))
    }));
    return merged;
  }

  function mergeArcOutline(mapped) {
    const merged = Object.assign(arcOutlineSkeleton(), mapped);
    merged.arc_name = locText(merged.arc_name);
    merged.volume = locText(merged.volume);
    merged.range = chapterRangeText(merged.range);
    merged.more = locText(merged.more);
    merged.character_arcs = (Array.isArray(merged.character_arcs) ? merged.character_arcs : []).map((arc) => ({
      name: locText(arc && arc.name),
      from: locText(arc && arc.from),
      to: locText(arc && arc.to),
      change: locText(arc && arc.change)
    }));
    merged.decision_points = (Array.isArray(merged.decision_points) ? merged.decision_points : []).map((point) => ({
      chapter: Number(point && point.chapter) || 0,
      character: locText(point && point.character),
      choice: locText(point && point.choice),
      impact: locText(point && point.impact)
    }));
    return merged;
  }

  function applyOutline(volumePayload, nearTermPayload) {
    const mapped = mapOutline(volumePayload, nearTermPayload);
    if (mapped.volume) {
      const volume = mergeVolumeOutline(mapped.volume);
      window.CONSOLE_DATA.volOutline = volume;
      if (window.CONSOLE_DATA.create) window.CONSOLE_DATA.create.volOne = volume;
    }
    if (mapped.nearTerm) {
      const nearTerm = mergeArcOutline(mapped.nearTerm);
      window.CONSOLE_DATA.arcOutline = nearTerm;
      if (window.CONSOLE_DATA.create) window.CONSOLE_DATA.create.briefOne = nearTerm;
    }
    return !!(mapped.volume || mapped.nearTerm);
  }

  function publishOutlinePackage(bookId, volumeNumber, volumePayload, nearTermPayload, allowedKinds) {
    if (typeof window.CustomEvent !== "function" || typeof window.dispatchEvent !== "function") return;
    const contents = {};
    if (!allowedKinds || allowedKinds.has("volume")) contents.volume = stripResourceMeta(contentObject(volumePayload) || {});
    if (!allowedKinds || allowedKinds.has("near_term")) contents.near_term = stripResourceMeta(contentObject(nearTermPayload) || {});
    window.dispatchEvent(new window.CustomEvent("lf:outline-package-updated", {
      detail: {
        bookId: String(bookId || ""),
        volumeNumber: Number(volumeNumber) || 0,
        contents,
        versions: {
          volume: volumePayload && volumePayload.version != null ? volumePayload.version : null,
          near_term: nearTermPayload && nearTermPayload.version != null ? nearTermPayload.version : null
        }
      }
    }));
  }

  function publishOutlinePackageResult(bookId, volumeNumber, result) {
    const contents = result && result.contents && typeof result.contents === "object" ? result.contents : null;
    const versions = result && result.versions && typeof result.versions === "object" ? result.versions : {};
    if (!contents || !contents.volume || !contents.near_term) return false;
    publishOutlinePackage(
      bookId,
      volumeNumber,
      { content: contents.volume, version: versions.volume },
      { content: contents.near_term, version: versions.near_term }
    );
    return true;
  }

  async function refreshOutlinePackage(bookId, volumeNumber, createTarget) {
    const selectedVolume = Number(volumeNumber) || 1;
    const [volume, nearTerm] = await Promise.all([
      window.LF_API.bookVolumeOutline(bookId, selectedVolume),
      window.LF_API.bookNearTermOutline(bookId, selectedVolume)
    ]);
    if (!createTarget || createDataTargetIsCurrent(createTarget)) applyOutline(volume, nearTerm);
    publishOutlinePackage(bookId, selectedVolume, volume, nearTerm);
    return { volume, nearTerm };
  }

  function applyWsm(world) {
    const mapped = mapWsm(world);
    if (!mapped) return false;
    window.CONSOLE_DATA.wsm = Object.assign(wsmSkeleton(), window.CONSOLE_DATA.wsm, mapped);
    return true;
  }

  function applyDetail(guidePayload) {
    const mapped = mapDetail(guidePayload);
    if (!mapped) return false;
    window.CONSOLE_DATA.detail = Object.assign(detailSkeleton(), window.CONSOLE_DATA.detail, mapped);
    // Cache this chapter's tension so the cruise tension curve can plot real
    // 细纲 values across chapters as their guides load.
    try {
      var bid = window.CONSOLE_DATA.book && window.CONSOLE_DATA.book.id;
      var dno = Number(window.CONSOLE_DATA.detail.no || mapped.no);
      var tlvl = Number(window.CONSOLE_DATA.detail.tension || 0);
      if (bid && dno && tlvl > 0) {
        var key = "lf_tension_" + bid;
        var store = {};
        try { store = JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) {}
        store[dno] = tlvl;
        localStorage.setItem(key, JSON.stringify(store));
      }
    } catch (e) {}
    return true;
  }

  function markChapterGuideReady(bookId, n) {
    const targetNo = Number(n);
    const markReady = (chapter) => {
      if (chapter) chapter.guide_ready = true;
    };

    const bookHit = bookCache.get(bookId) || bookCache.get(String(bookId));
    if (bookHit && bookHit.data && Array.isArray(bookHit.data.chapters)) {
      markReady(bookHit.data.chapters.find(
        (chapter) => Number(chapter.chapter_number) === targetNo
      ));
    }

    const currentBookId = window.CONSOLE_DATA && window.CONSOLE_DATA.book
      && window.CONSOLE_DATA.book.id;
    if (String(currentBookId || "") === String(bookId || "")) {
      markReady((window.CONSOLE_DATA.chapters || []).find(
        (chapter) => Number(chapter.no) === targetNo
      ));
    }

    const snapshot = window.LF_PORTAL_STATE;
    if (snapshot && String(snapshot.selectedBookId || "") === String(bookId || "")) {
      markReady((snapshot.chapters || []).find(
        (chapter) => Number(chapter.chapter_number) === targetNo
      ));
      try { persistSnapshot(snapshot); } catch (error) {}
    }
  }

  const guideSyncStates = new Map();
  const guideSyncEpochs = new Map();
  function readableGuide(payload) {
    const guide = payload && (payload.guide != null ? payload.guide : payload);
    const content = guide && (guide.content || guide);
    const meaningful = value => typeof value === "string" ? !!value.trim()
      : Array.isArray(value) ? value.some(meaningful)
      : value && typeof value === "object" ? Object.values(value).some(meaningful) : false;
    return !!content && typeof content === "object" && Object.keys(content).some(key =>
      !["id", "chapter_number", "version", "revision_id", "book_id", "resource_key", "resource_type", "status", "created_at", "updated_at"].includes(key)
      && meaningful(content[key]));
  }
  function completedGuideTask(bookId, chapterNumber) {
    return ((window.LF_PORTAL_STATE || {}).tasks || []).some(task => {
      const mode = task.request_payload && task.request_payload.execution_mode;
      const guideTask = ["chapter_outline_director", "chapter_full_single", "chapter_full_muti"].includes(task.task_type)
        || (["chapter_draft", "chapter_draft_single"].includes(task.task_type) && mode === "outline_director");
      return String(task.book_link_id) === String(bookId) && task.status === "completed" && guideTask
        && stageChapterNumber(task, null) === Number(chapterNumber);
    });
  }
  function guideIdentityMatches(payload, chapterNumber) {
    const guide = payload && payload.guide;
    const actual = payload && (payload.chapter_number ?? (guide && guide.chapter_number));
    const key = payload && (payload.resource_key || guide && guide.resource_key);
    return (actual == null || Number(actual) === Number(chapterNumber))
      && (!key || !/^\d+:guide$/.test(String(key)) || Number(String(key).split(":")[0]) === Number(chapterNumber));
  }
  function notifyGuideSync(bookId, chapterNumber, status, taskCompleted, reading) {
    const key = switchCacheKey(bookId, chapterNumber);
    const previous = guideSyncStates.get(key);
    const next = { bookId: String(bookId), chapterNumber: Number(chapterNumber), status, reading: !!reading, taskCompleted: !!(taskCompleted || completedGuideTask(bookId, chapterNumber) || previous && previous.taskCompleted) };
    guideSyncStates.set(key, next);
    if (guideSyncStates.size > 256) {
      const evicted = guideSyncStates.keys().next().value;
      guideSyncStates.delete(evicted);
      guideSyncEpochs.delete(evicted);
    }
    if ((!previous || previous.status !== status || previous.taskCompleted !== next.taskCompleted || previous.reading !== next.reading || status === "ready")
      && typeof window.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
      window.dispatchEvent(new window.CustomEvent("lf:chapter-guide-sync", { detail: next }));
    }
  }

  function applyChapterGuide(bookId, n, guidePayload) {
    const currentBookId = window.CONSOLE_DATA && window.CONSOLE_DATA.book
      && window.CONSOLE_DATA.book.id;
    if (String(currentBookId || "") !== String(bookId || "") || !guideIdentityMatches(guidePayload, n) || !readableGuide(guidePayload) || !applyDetail(guidePayload)) {
      return false;
    }
    markChapterGuideReady(bookId, n);
    window.CONSOLE_DATA.detail._bookId = String(bookId || "");
    window.CONSOLE_DATA.detail.no = Number(n);
    window.CONSOLE_DATA.detail._syncStatus = "ready";
    return true;
  }

  const chapterReadinessFields = [
    "world_state_ready",
    "guide_ready",
    "character_state_ready",
    "body_ready",
    "post_hoc_ready"
  ];

  function chapterHasReadableBody(chapter) {
    if (!chapter) return false;
    if (chapter.body_ready === true) return true;
    if (chapter.body_ready === false) return false;
    const status = String(chapter.status || "").toLowerCase();
    return status === "completed" || Number(chapter.word_count || 0) > 0;
  }

  function chapterCruiseReady(chapter) {
    if (!chapter) return false;
    const hasReadiness = chapterReadinessFields.some((field) => chapter[field] != null);
    if (hasReadiness) {
      return chapterReadinessFields.every((field) => chapter[field] === true);
    }
    const status = String(chapter.status || "").toLowerCase();
    const postHocStatus = String(chapter.post_hoc_status || "").toLowerCase();
    return chapterHasReadableBody(chapter)
      && (status === "completed" || postHocStatus === "completed");
  }

  function chapterState(chapter) {
    const status = String(chapter.status || "").toLowerCase();
    if (chapterHasReadableBody(chapter)) return "done";
    if (["planned", "todo"].includes(status)) return "todo";
    return "writing";
  }

  // Extract the volume-type outline records from the /outlines list, normalized
  // to {vnum, name, start, end} and sorted by volume number. Each record carries
  // chapter_start/chapter_end so we can group chapters into the right volume.
  function volumeRecords(outlines) {
    const rows = (Array.isArray(outlines) ? outlines : [])
      .filter((row) => row && row.type === "volume")
      .map((row) => {
        const content = (row.content && typeof row.content === "object") ? row.content : {};
        const vnum = Number(row.volume_number != null ? row.volume_number : content.volume_number) || 0;
        const range = content.chapter_range || {};
        const start = Number(row.chapter_start != null ? row.chapter_start : range.start) || 0;
        const end = Number(row.chapter_end != null ? row.chapter_end : range.end) || 0;
        return { vnum, name: content.title != null ? locText(content.title) : zhEn(""), start, end };
      })
      .filter((row) => row.vnum > 0);
    rows.sort((a, b) => a.vnum - b.vnum);
    // De-dup by volume number (the engine may return multiple revisions); keep
    // the last (highest version, which the list orders later) per volume.
    const byNo = {};
    rows.forEach((row) => { byNo[row.vnum] = row; });
    return Object.keys(byNo).map((k) => byNo[k]).sort((a, b) => a.vnum - b.vnum);
  }

  // Build the volume tree from real per-volume outline records, grouping each
  // chapter into the volume whose [start, end] range contains it. Each chapter
  // gets a `vol` number so the tree renders chapters under the right volume
  // instead of dumping every chapter into the latest one. A trailing "plan"
  // volume keeps the 预先生成卷纲 / 生成新一卷 action (PreGenVol) reachable.
  function buildVolumes(chapters, outlines, volumeOutline) {
    if (!chapters.length) {
      chapters.forEach((c) => { c.vol = 1; });
      return [];
    }
    const numbers = chapters.map((chapter) => chapter.no);
    const loAll = Math.min(...numbers);
    const hiAll = Math.max(...numbers);
    const doneNos = chapters.filter((c) => c.state === "done").map((c) => c.no);
    const frontier = doneNos.length ? Math.max(...doneNos) + 1 : loAll;

    let records = volumeRecords(outlines);
    // Fallback: no /outlines list (older engine) — derive a single volume from
    // the latest volume-outline payload, preserving prior behavior.
    if (!records.length) {
      const outline = mapVolume(volumeOutline);
      const curNo = outline && outline.no != null ? Number(outline.no) : 1;
      records = [{
        vnum: Number.isFinite(curNo) ? curNo : 1,
        name: outline && outline.name != null ? locText(outline.name) : zhEn(""),
        start: loAll,
        end: hiAll
      }];
    }

    // Close open-ended ranges: a volume's end defaults to the next volume's
    // start-1, and the last volume stretches to cover every remaining chapter.
    records.forEach((rec, i) => {
      if (!rec.start) rec.start = i === 0 ? loAll : (records[i - 1].end || 0) + 1;
      const next = records[i + 1];
      if (!rec.end) rec.end = next && next.start ? next.start - 1 : Math.max(rec.start, hiAll);
    });
    const last = records[records.length - 1];
    if (hiAll > last.end) last.end = hiAll;

    // Which volume holds the writing frontier? That one is "active"; earlier
    // volumes are "done", and later real volumes remain expandable as
    // "planned". The separate trailing action below alone uses "plan".
    let activeVnum = last.vnum;
    for (const rec of records) {
      if (frontier >= rec.start && frontier <= rec.end) { activeVnum = rec.vnum; break; }
    }

    // Assign every chapter to a volume by range; chapters past the last range
    // (freshly planned todo rows) fold into the active volume.
    chapters.forEach((c) => {
      const hit = records.find((rec) => c.no >= rec.start && c.no <= rec.end);
      c.vol = hit ? hit.vnum : activeVnum;
    });

    const rangeNos = (rec) => {
      const out = [];
      for (let n = rec.start; n <= rec.end; n++) out.push(n);
      return out;
    };
    const volumes = records.map((rec) => ({
      no: { zh: "卷" + rec.vnum, en: "Vol." + rec.vnum },
      name: rec.name && (rec.name.zh || rec.name.en) ? rec.name : zhEn(""),
      range: { zh: "第 " + rec.start + "–" + rec.end + " 章", en: "Ch. " + rec.start + "–" + rec.end },
      range_nos: rangeNos(rec),
      start: rec.start,
      end: rec.end,
      vnum: rec.vnum,
      state: rec.vnum < activeVnum ? "done" : (rec.vnum === activeVnum ? "active" : "planned"),
      gist: zhEn("")
    }));

    // Ensure a trailing planned volume so 生成新一卷 stays reachable.
    const maxVnum = records[records.length - 1].vnum;
    volumes.push({
      no: { zh: "卷" + (maxVnum + 1), en: "Vol." + (maxVnum + 1) },
      name: { zh: "规划中", en: "Planned" },
      range: zhEn(""),
      range_nos: [],
      state: "plan",
      vnum: maxVnum + 1,
      gist: zhEn("")
    });
    return volumes;
  }

  function plannedChapterRow(item, afterNumber) {
    const no = Number(item && (item.number != null ? item.number : item.chapter_number)) || 0;
    if (!no || no <= afterNumber) return null;
    return {
      no,
      title: zhEn(summarize(item.title) || "待生成"),
      gist: zhEn(summarize(item.summary || item.gist || "")),
      state: "todo",
      words: ""
    };
  }

  // Planned-but-not-yet-written chapters live in near-term outlines. For a
  // multi-volume book, use the already-fetched /outlines list so every volume
  // remains reachable before any chapter has been generated. Volume ranges own
  // chapter placement and remove overlap between adjacent near-term outlines.
  // Incomplete or older outline payloads retain the previous latest-only path.
  function plannedChapterRows(nearTermOutline, outlines, afterNumber) {
    const volumes = volumeRecords(outlines);
    const usableRanges = volumes.length > 1
      && volumes.every((volume) => volume.start > 0 && volume.end >= volume.start);
    if (usableRanges) {
      const nearTermByVolume = new Map();
      (Array.isArray(outlines) ? outlines : []).forEach((outline) => {
        if (!outline || outline.type !== "near_term") return;
        const content = contentObject(outline);
        const vnum = Number(
          outline.volume_number != null ? outline.volume_number : content.volume_number
        ) || 0;
        if (vnum > 0) nearTermByVolume.set(vnum, content);
      });

      const plannedByNo = new Map();
      const lastVolume = volumes[volumes.length - 1];
      nearTermByVolume.forEach((content, vnum) => {
        if (!volumes.some((volume) => volume.vnum === vnum)) return;
        const rows = Array.isArray(content && content.chapters) ? content.chapters : [];
        rows.forEach((item) => {
          const planned = plannedChapterRow(item, afterNumber);
          if (!planned) return;
          const owner = volumes.find(
            (volume) => planned.no >= volume.start && planned.no <= volume.end
          );
          const extendsLastVolume = !owner
            && vnum === lastVolume.vnum
            && planned.no > lastVolume.end;
          if ((owner && owner.vnum === vnum) || extendsLastVolume) {
            plannedByNo.set(planned.no, planned);
          }
        });
      });
      if (plannedByNo.size) {
        return Array.from(plannedByNo.values()).sort((a, b) => a.no - b.no);
      }
    }

    const content = contentObject(nearTermOutline);
    const rows = Array.isArray(content && content.chapters) ? content.chapters : [];
    return rows.map((item) => plannedChapterRow(item, afterNumber)).filter(Boolean);
  }

  function chapterTitleText(chapter) {
    var title = chapter && Object.prototype.hasOwnProperty.call(chapter, "title")
      ? chapter.title : chapter;
    if (title && typeof title === "object") title = title.zh != null ? title.zh : title.en;
    return title == null ? "" : String(title).trim();
  }

  function chapterTitleMissing(chapter) {
    var title = chapterTitleText(chapter);
    return !title
      || title === "—"
      || title === "Untitled chapter"
      || /^第\s*(?:\d+|x)\s*章\s*[（(]\s*待补完\s*[）)]$/i.test(title);
  }

  function applyChapters(snapshot, options) {
    if (!Array.isArray(snapshot.chapters)) return;
    reconcileChapterCache(snapshot.selectedBookId, snapshot.chapters);
    var prev = window.CONSOLE_DATA.chapters;
    var prevByNo = {};
    if (!(options && options.bookChanged) && Array.isArray(prev)) {
      prev.forEach(function (c) { if (c && c.no) prevByNo[c.no] = c; });
    }
    const plannedTitles = new Map();
    plannedChapterRows(snapshot.nearTermOutline, snapshot.outlines, 0).forEach(function (chapter) {
      if (!chapterTitleMissing(chapter)) plannedTitles.set(chapter.no, chapter.title.zh);
    });
    const real = snapshot.chapters.map((chapter) => {
      var no = Number(chapter.chapter_number);
      var title = chapter.title;
      if (chapterTitleMissing({ title: title }) && plannedTitles.has(no)) {
        title = plannedTitles.get(no);
      }
      // Carry forward a previously-resolved title so the tree doesn't blink
      // back to "Untitled chapter" on every loadPortalSnapshot / selectChapter.
      if (chapterTitleMissing({ title: title }) && prevByNo[no] && !chapterTitleMissing(prevByNo[no])) {
        title = prevByNo[no].title.zh;
      }
      if (chapterTitleMissing({ title: title })) title = "第 " + no + " 章（待补完）";
      const bodyReadable = chapterHasReadableBody(chapter);
      const cruiseReady = chapterCruiseReady(chapter);
      return {
        no: no,
        title: zhEn(title),
        gist: zhEn(""),
        state: chapterState(chapter),
        body_readable: bodyReadable,
        cruise_ready: cruiseReady,
        word_count: Number(chapter.word_count || 0),
        words: chapter.word_count ? formatWords(chapter.word_count).en : "",
        revision_id: chapter.revision_id != null && String(chapter.revision_id).trim() !== ""
          ? String(chapter.revision_id).trim() : null,
        version: chapter.version != null && Number.isFinite(Number(chapter.version))
          ? Number(chapter.version) : null,
        // 后验状态来自章节列表（单章 GET 该字段始终为 null，列表才可靠）。
        post_hoc_status: chapter.post_hoc_status != null ? String(chapter.post_hoc_status) : null,
        world_state_ready: chapter.world_state_ready == null ? null : chapter.world_state_ready === true,
        guide_ready: chapter.guide_ready == null ? null : chapter.guide_ready === true,
        character_state_ready: chapter.character_state_ready == null ? null : chapter.character_state_ready === true,
        body_ready: chapter.body_ready == null ? null : chapter.body_ready === true,
        post_hoc_ready: chapter.post_hoc_ready == null ? null : chapter.post_hoc_ready === true
      };
    });
    const maxReal = real.length ? Math.max(...real.map((chapter) => chapter.no)) : 0;
    const planned = plannedChapterRows(snapshot.nearTermOutline, snapshot.outlines, maxReal);
    const combined = real.concat(planned).sort((a, b) => a.no - b.no);
    window.CONSOLE_DATA.chapters = combined;
    window.CONSOLE_DATA.volumes = buildVolumes(combined, snapshot.outlines, snapshot.volumeOutline);
    window.CONSOLE_DATA.book.chap = maxReal;
    window.CONSOLE_DATA.book.words = formatWords(
      snapshot.chapters.reduce((total, chapter) => total + Number(chapter.word_count || 0), 0)
    );
    const selected = combined.find((chapter) => chapter.no === Number(snapshot.selectedChapter));
    if (selected && !(options && options.skipProse)) {
      const chapterPayload = snapshot.chapter
        && (snapshot.chapter.chapter_number == null || Number(snapshot.chapter.chapter_number) === selected.no)
        && !chapterIdentityChanged(selected, snapshot.chapter)
        ? snapshot.chapter : null;
      setProseFromChapter(selected, chapterPayload, snapshot.selectedBookId);
    }
  }

  // Build CONSOLE_DATA.prose from a chapter row + its body payload. Shared by
  // the full-snapshot apply and the per-chapter switch path so both render prose
  // identically. chapterPayload null = body unavailable → empty prose shell.
  function setProseFromChapter(selected, chapterPayload, bookId) {
    if (!selected) return;
    const body = chapterPayload && chapterPayload.body != null ? String(chapterPayload.body) : "";
    const paragraphs = body.split(/\n\s*\n|\n+/).map((part) => part.trim()).filter(Boolean);
    window.CONSOLE_DATA.prose = Object.assign({}, window.CONSOLE_DATA.prose, {
      _bookId: bookId == null
        ? String(window.CONSOLE_DATA.book && window.CONSOLE_DATA.book.id || "")
        : String(bookId),
      no: selected.no,
      title: selected.title,
      words: chapterPayload ? Number(chapterPayload.word_count || body.length) : 0,
      revision_id: chapterPayload && chapterPayload.revision_id != null
        ? String(chapterPayload.revision_id) : null,
      version: chapterPayload && chapterPayload.version != null ? Number(chapterPayload.version) : 0,
      updated_at: chapterPayload && chapterPayload.updated_at != null ? String(chapterPayload.updated_at) : "",
      _bodyLoaded: !!(chapterPayload && typeof chapterPayload.body === "string"),
      post_hoc_status: (selected && selected.post_hoc_status != null) ? String(selected.post_hoc_status)
        : (chapterPayload && chapterPayload.post_hoc_status != null ? String(chapterPayload.post_hoc_status) : null),
      access_error: null,
      paras: paragraphs.map((paragraph) => zhEn(paragraph))
    });
  }

  function restrictProse(bookId, n, detail) {
    chapterCache.clear();
    const chapters = (window.CONSOLE_DATA && window.CONSOLE_DATA.chapters) || [];
    const selected = chapters.find((chapter) => Number(chapter.no) === Number(n));
    window.CONSOLE_DATA.prose = proseSkeleton(bookId, n);
    if (selected) setProseFromChapter(selected, null, bookId);
    window.CONSOLE_DATA.prose.access_error = localizedContentAccess(detail);
    const snapshot = window.LF_PORTAL_STATE;
    if (snapshot) snapshot.chapter = null;
    try {
      const stored = readPersistedSnapshot();
      if (stored) persistSnapshot(Object.assign({}, stored, { chapter: null }));
    } catch (error) {}
  }

  // Apply a chapter-level bundle ({chapter?, guide?, world?}) to CONSOLE_DATA.
  // Only keys present are applied — a missing key means that fetch was not
  // attempted/failed and the on-screen value must survive (降级铁律). null
  // values (fulfilled-but-empty) go through the apply* null-guards unchanged.
  function applyChapterBundle(bookId, n, bundle) {
    bundle = bundle || {};
    const chapters = (window.CONSOLE_DATA && window.CONSOLE_DATA.chapters) || [];
    const selected = chapters.find((c) => Number(c.no) === Number(n));
    if ("chapter" in bundle && selected) {
      const cp = bundle.chapter
        && (bundle.chapter.chapter_number == null || Number(bundle.chapter.chapter_number) === selected.no)
        && !chapterIdentityChanged(selected, bundle.chapter)
        ? bundle.chapter : null;
      setProseFromChapter(selected, cp, bookId);
    }
    if ("guide" in bundle) {
      // A guarded navigation/read has committed this newer snapshot. Older
      // in-flight refresh status must not demote it when its response arrives.
      guideSyncEpochs.delete(switchCacheKey(bookId, n));
      if (applyChapterGuide(bookId, n, bundle.guide)) notifyGuideSync(bookId, n, "ready");
      else notifyGuideSync(bookId, n, !guideIdentityMatches(bundle.guide, n) ? "failed"
        : !readableGuide(bundle.guide) ? "missing" : "pending");
    }
    if (bundle.guideSyncStatus) notifyGuideSync(bookId, n, bundle.guideSyncStatus);
    if ("world" in bundle && applyWsm(bundle.world)) {
      window.CONSOLE_DATA.wsm._bookId = String(bookId || "");
      window.CONSOLE_DATA.wsm.no = Number(n);
    }
    if (bundle.contentAccess) restrictProse(bookId, n, bundle.contentAccess);
  }

  function resetChapterView(bookId, n) {
    const chapters = (window.CONSOLE_DATA && window.CONSOLE_DATA.chapters) || [];
    const selected = chapters.find((c) => Number(c.no) === Number(n));
    window.CONSOLE_DATA.prose = proseSkeleton(bookId, n);
    if (selected) setProseFromChapter(selected, null, bookId);
    window.CONSOLE_DATA.detail = detailSkeleton(bookId, n);
    window.CONSOLE_DATA.wsm = wsmSkeleton(bookId, n);
  }

  // Fetch the chapter-level trio (body/guide/world). The caller validates its
  // navigation epoch and the current list identity before caching so a
  // late response cannot overwrite a newer detail bundle.
  async function loadChapter(bookId, n) {
    const [bodyR, guideR, worldR] = await Promise.allSettled([
      window.LF_API.bookChapter(bookId, n),
      window.LF_API.bookChapterGuide(bookId, n),
      window.LF_API.bookChapterWorld(bookId, n)
    ]);
    const bundle = {};
    if (bodyR.status === "fulfilled") bundle.chapter = bodyR.value;
    else {
      const restriction = contentAccessDetail(bodyR.reason);
      if (restriction) {
        bundle.chapter = null;
        bundle.contentAccess = restriction;
      }
    }
    if (guideR.status === "fulfilled") bundle.guide = guideR.value;
    else if (guideR.reason && guideR.reason.status === 404) bundle.guide = null;
    else bundle.guideSyncStatus = "failed";
    if (worldR.status === "fulfilled") bundle.world = worldR.value;
    return bundle;
  }

  async function verifyChapterBody(bookId, chapterNumber, options) {
    const opts = options || {};
    const attempts = Math.max(1, Math.min(5, Number(opts.attempts) || 3));
    const requestedDelay = Number(opts.delayMs);
    const delayMs = Math.max(0, Math.min(5000, Number.isFinite(requestedDelay) ? requestedDelay : 600));
    const expected = Number(chapterNumber);
    let lastChapter = null;
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const chapter = await window.LF_API.bookChapter(bookId, expected);
        lastChapter = chapter;
        const actual = chapter && chapter.chapter_number != null
          ? Number(chapter.chapter_number) : expected;
        const body = chapter && chapter.body != null ? String(chapter.body) : "";
        if (actual === expected && body.trim()) {
          return { verified: true, chapter };
        }
        lastError = new Error(actual !== expected
          ? "Chapter response identity mismatch"
          : "Chapter body is empty");
      } catch (error) {
        lastError = error;
      }
      if (attempt < attempts - 1 && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    return { verified: false, chapter: lastChapter, error: lastError };
  }

  async function verifyChapterResult(bookId, chapterNumber, kind, options = {}) {
    if (kind === 'guide') {
      const guide = await window.LF_API.bookChapterGuide(bookId, chapterNumber, options);
      return { verified: guideIdentityMatches(guide, chapterNumber) && readableGuide(guide) };
    }
    const field = { world_state: 'world_state_ready', character_state: 'character_state_ready' }[kind];
    if (!field) return { verified: false };
    const rows = normalizeList(await window.LF_API.bookChapters(bookId, true, options));
    const chapter = rows.find(item => Number(item.chapter_number) === Number(chapterNumber));
    return { verified: chapter?.[field] === true };
  }

  // Patch refresh-fallback metadata in place; chapter text remains memory-only.
  function patchSnapshot(patch) {
    try {
      const snap = readPersistedSnapshot();
      if (snap) { Object.assign(snap, patch, { chapter: null }); persistSnapshot(snap); }
    } catch (error) {}
  }

  function applySavedChapterBody(bookId, n, body, result) {
    const version = result && result.version != null && Number.isFinite(Number(result.version))
      ? Number(result.version) : null;
    const revisionId = result && result.revision_id != null
      && String(result.revision_id).trim() !== ""
      ? String(result.revision_id).trim() : null;
    const key = switchCacheKey(bookId, n);
    const previousHit = chapterCache.get(key);
    const previousChapter = previousHit && previousHit.data && previousHit.data.chapter;
    const visible = window.CONSOLE_DATA && window.CONSOLE_DATA.prose;
    if (!refreshVersionAllowed(result, previousChapter)
      || (visible && String(visible._bookId) === String(bookId) && Number(visible.no) === Number(n)
        && !refreshVersionAllowed(result, visible))) return;
    const chapterPayload = Object.assign({}, previousChapter || {}, {
      chapter_number: Number(n),
      body: String(body || ""),
      word_count: Array.from(String(body || "")).length,
      revision_id: revisionId,
      version: version,
      updated_at: result && result.updated_at != null ? String(result.updated_at) : ""
    });
    const updateIdentity = (chapter) => {
      if (!chapter) return;
      chapter.revision_id = revisionId;
      chapter.version = version;
      chapter.word_count = chapterPayload.word_count;
    };

    const bookHit = bookCache.get(bookId) || bookCache.get(String(bookId));
    if (bookHit && bookHit.data && Array.isArray(bookHit.data.chapters)) {
      const summary = bookHit.data.chapters.find(
        (chapter) => Number(chapter.chapter_number) === Number(n)
      );
      updateIdentity(summary);
    }

    const currentBookId = window.CONSOLE_DATA && window.CONSOLE_DATA.book
      && window.CONSOLE_DATA.book.id;
    if (String(currentBookId || "") === String(bookId || "")) {
      const summary = (window.CONSOLE_DATA.chapters || []).find(
        (chapter) => Number(chapter.no) === Number(n)
      );
      updateIdentity(summary);
      if (summary && window.LF_PORTAL_STATE
          && Number(window.LF_PORTAL_STATE.selectedChapter) === Number(n)) {
        setProseFromChapter(summary, chapterPayload, bookId);
      }
    }

    const snapshot = window.LF_PORTAL_STATE;
    if (snapshot && String(snapshot.selectedBookId || "") === String(bookId || "")) {
      const summary = Array.isArray(snapshot.chapters)
        ? snapshot.chapters.find((chapter) => Number(chapter.chapter_number) === Number(n))
        : null;
      updateIdentity(summary);
      if (Number(snapshot.selectedChapter) === Number(n)) snapshot.chapter = chapterPayload;
      try { persistSnapshot(snapshot); } catch (error) {}
    }

    if (version != null || revisionId) {
      const data = Object.assign({}, previousHit && previousHit.data, { chapter: chapterPayload });
      chapterCache.set(key, { data, ts: 0 });
    } else {
      chapterCache.delete(key);
      bookCache.delete(bookId);
      bookCache.delete(String(bookId));
    }
  }

  function applySnapshot(snapshot) {
    if (!snapshot || !window.CONSOLE_DATA) return false;
    if (Array.isArray(snapshot.chapters) && !snapshot.chapters.length) {
      const planned = plannedChapterRows(snapshot.nearTermOutline, snapshot.outlines, 0);
      if (planned.length && !planned.some(row => Number(row.no) === Number(snapshot.selectedChapter))) {
        snapshot.selectedChapter = planned[0].no;
      }
    }
    const previousBookId = window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.selectedBookId;
    const bookChanged = previousBookId !== (snapshot.selectedBookId || null);
    if (bookChanged || Number(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.selectedChapter) !== Number(snapshot.selectedChapter)) chapterTargetEpoch += 1;
    if (bookChanged) resetBookScopedView(snapshot.selectedBookId, snapshot.selectedChapter);
    updateShelfText(snapshot);
    applyUser(snapshot);
    // Track whether we have a real identity so the UI can distinguish
    // "never logged in" from "loaded with data".
    window.LF_AUTH_EXPIRED = !(snapshot.me && snapshot.me.id);
    // A lock protects in-progress data only while the same book remains selected.
    // A real book switch must always replace the old book's create buffer.
    const canApplyCreateData = bookChanged || !isCreateDataLocked();
    if (bookChanged) resetPortalCreateData();
    if (Array.isArray(snapshot.books)) {
      const selected = snapshot.books.find((book) => book.id === snapshot.selectedBookId) || snapshot.books[0];
      window.CONSOLE_DATA.shelf = snapshot.books
        .map((book, index) => shelfCard(book, index, selected && selected.id))
        .concat(newBookCard());
      if (snapshot.books.length) {
        const first = selected;
        window.CONSOLE_DATA.book = Object.assign({}, window.CONSOLE_DATA.book, {
          id: first.id,
          engine_book_id: first.engine_book_id || first.engineBookId,
          title: zhEn(first.title || first.name || "Untitled"),
          genre: zhEn(first.genre || "Novel"),
          genre_parts: parseGenreParts(first),
          status: zhEn(first.status || "Ongoing"),
          chap: first.current_chapter || first.chapter_count || 0,
          words: formatWords(first.word_count || first.words || 0)
        });
      } else {
        // No books — clear book/chapter data to prevent stale demo content
        window.CONSOLE_DATA.book = Object.assign({}, window.CONSOLE_DATA.book, {
          id: null, engine_book_id: null, title: zhEn(""),
          genre: zhEn(""), genre_parts: [], status: zhEn(""), chap: 0, words: zhEn("")
        });
        window.CONSOLE_DATA.chapters = [];
        window.CONSOLE_DATA.volumes = [];
        window.CONSOLE_DATA.volOutline = volOutlineSkeleton();
        window.CONSOLE_DATA.arcOutline = arcOutlineSkeleton();
        window.CONSOLE_DATA.detail = detailSkeleton(null, 0);
        window.CONSOLE_DATA.wsm = wsmSkeleton(null, 0);
        window.CONSOLE_DATA.prose = proseSkeleton(null, 0);
        window.CONSOLE_DATA.world = worldLedgerSkeleton(null);
      }
    }
    if (canApplyCreateData) {
      // null = the proxied engine read FAILED (engine unreachable), not "no
      // data" — keep whatever is on screen. Only a fulfilled empty response
      // may write empty fields.
      if (snapshot.world != null) applyWorld(snapshot);
      if (snapshot.characters != null) applyCharacters(snapshot);
      if (snapshot.storyPlan != null) applyStoryPlan(snapshot);
      // null = engine unreachable; only write outline when the proxied read
      // actually returned (an empty/absent outline still leaves skeletons).
      if (snapshot.volumeOutline != null || snapshot.nearTermOutline != null) {
        applyOutline(snapshot.volumeOutline, snapshot.nearTermOutline);
      }
    }
    applyChapters(snapshot, { bookChanged });
    applyOutlineForChapter(snapshot.selectedChapter, snapshot.outlines);
    window.LF_PORTAL_STATE = snapshot;
    return true;
  }

  // The /characters list endpoint returns skeleton fields only (name/role/
  // gender/age/aliases/goals); the nested profile dimensions (world_position,
  // beliefs, secrets, traumas …) live on /characters/{name}. Cast cards need
  // the full content, so fan out per name and fall back to the list row.
  const CHARACTER_DETAIL_CONCURRENCY = 4;
  async function mapWithConcurrency(items, limit, mapper) {
    const list = Array.isArray(items) ? items : [];
    const results = new Array(list.length);
    let nextIndex = 0;
    async function worker() {
      while (nextIndex < list.length) {
        const index = nextIndex++;
        results[index] = await mapper(list[index], index);
      }
    }
    const workerCount = Math.min(Math.max(1, Number(limit) || 1), list.length);
    await Promise.all(Array.from({ length: workerCount }, worker));
    return results;
  }

  async function fetchFullCharacters(bookId, options) {
    const strict = !!(options && options.strict);
    const list = normalizeList(await request("/api/books/" + encodeURIComponent(bookId) + "/characters"));
    return mapWithConcurrency(list, CHARACTER_DETAIL_CONCURRENCY, async (item) => {
      const content = contentObject(item);
      const name = content.name || item.name;
      if (!name) return item;
      try {
        return await request(
          "/api/books/" + encodeURIComponent(bookId) + "/characters/" + encodeURIComponent(String(name))
        );
      } catch (error) {
        if (strict && (!error || error.status !== 404)) throw error;
        return item;
      }
    });
  }

  // Account-level fetch (7 requests, independent of which book/chapter is open).
  // Returns the snapshot's account fields, or null when /api/books failed —
  // "backend unreachable", not "zero books"; applying it would wipe live data.
  async function fetchAccount(options) {
    const opts = options || {};
    const mePromise = request("/api/auth/me").then(function (me) {
      // Identity and permission gates must not depend on the selected book's
      // Engine-backed resources. Apply the authenticated user as soon as it is
      // known so an Engine outage cannot hide admin-only navigation or panels.
      if (me && me.id && typeof opts.onIdentity === "function") opts.onIdentity(me);
      return me;
    });
    const booksPromise = request("/api/books");
    const tasksPromise = request("/api/engine-tasks");
    const billingPromise = request("/api/billing/me");
    const notificationsPromise = request("/api/notifications");
    const unreadPromise = request("/api/notifications/unread-count");
    const couponsPromise = request("/api/promotions/coupons");
    const secondaryPromise = Promise.allSettled([
      tasksPromise, billingPromise, notificationsPromise, unreadPromise, couponsPromise
    ]);
    const [me, books] = await Promise.allSettled([mePromise, booksPromise]);
    if (me.status !== "fulfilled" || !(me.value && me.value.id)) {
      if (window.LF_AUTH_EXPIRED) clearAuthState();
      return null;
    }
    if (books.status !== "fulfilled") return null;
    const core = { me: me.value, books: normalizeList(books.value) };
    if (typeof opts.onCore === "function") opts.onCore(core);
    const [tasks, billing, notifications, unreadCount, coupons] = await secondaryPromise;
    const previousTasks = window.LF_PORTAL_STATE && Array.isArray(window.LF_PORTAL_STATE.tasks)
      ? window.LF_PORTAL_STATE.tasks
      : (accountCache.data && Array.isArray(accountCache.data.tasks)
        ? accountCache.data.tasks
        : []);
    const data = {
      me: core.me,
      books: core.books,
      tasks: tasks.status === "fulfilled"
        ? retainPortalTasks(normalizeList(tasks.value))
        : previousTasks,
      tasksKnown: tasks.status === "fulfilled",
      billing: billing.status === "fulfilled" ? billing.value : null,
      notifications: notifications.status === "fulfilled" ? normalizeList(notifications.value) : [],
      unreadCount: unreadCount.status === "fulfilled" ? unreadCount.value : null,
      coupons: coupons.status === "fulfilled" ? normalizeList(coupons.value) : []
    };
    accountCache.data = data;
    accountCache.ts = Date.now();
    return data;
  }

  // Book-level fetch (world/chapters/characters/story-plan/outlines + the
  // selected chapter's trio). Pure: returns data, applies nothing. The caller
  // resolves seq, assembles the snapshot, applySnapshot, then applyChapterBundle.
  async function fetchBookLevel(bookId, opts) {
    opts = opts || {};
    const refreshChapters = !!opts.refreshChapters;
    const requestedChapter = opts.selectedChapter != null
      ? Number(opts.selectedChapter)
      : readPersistedChapterNumber();
    const chaptersPath = "/api/books/" + encodeURIComponent(bookId) + "/chapters"
      + (refreshChapters ? "?refresh=true" : "");
    const [worldResult, chaptersResult, charactersResult, storyPlanResult, outlineResult] = await Promise.allSettled([
      request("/api/books/" + encodeURIComponent(bookId) + "/world"),
      request(chaptersPath),
      fetchFullCharacters(bookId, { strict: true }),
      request("/api/books/" + encodeURIComponent(bookId) + "/story-plan"),
      Promise.allSettled([
        window.LF_API.bookVolumeOutlineLatest(bookId),
        window.LF_API.bookNearTermOutlineLatest(bookId),
        window.LF_API.bookOutlines(bookId)
      ])
    ]);
    const blocking = [
      ["world", worldResult, true],
      ["chapters", chaptersResult, false],
      ["characters", charactersResult, false],
      ["story-plan", storyPlanResult, true]
    ].filter((entry) => entry[1].status === "rejected"
      && !(entry[2] && entry[1].reason && entry[1].reason.status === 404));
    if (outlineResult.status === "fulfilled" && Array.isArray(outlineResult.value)) {
      outlineResult.value.forEach((result, index) => {
        if (result && result.status === "rejected" && (!result.reason || result.reason.status !== 404)) {
          blocking.push([["volume-outline", "near-term-outline", "outlines"][index] || "outline", result, true]);
        }
      });
    }
    if (blocking.length) {
      const failure = blocking[0];
      const error = failure[1].reason || new Error("Book data load failed");
      error.portalLoadStage = failure[0];
      throw error;
    }
    const out = {
      world: worldResult.status === "fulfilled" ? worldResult.value : null,
      chapters: chaptersResult.status === "fulfilled" ? normalizeList(chaptersResult.value) : null,
      characters: charactersResult.status === "fulfilled" ? normalizeList(charactersResult.value) : null,
      storyPlan: storyPlanResult.status === "fulfilled" ? storyPlanResult.value : null,
      volumeOutline: null,
      nearTermOutline: null,
      outlines: null,
      chapter: null,
      chapterBundle: {},
      selectedChapter: Number.isFinite(requestedChapter) ? requestedChapter : 0
    };
    if (outlineResult.status === "fulfilled" && Array.isArray(outlineResult.value)) {
      out.volumeOutline = outlineResult.value[0] && outlineResult.value[0].status === "fulfilled" ? outlineResult.value[0].value : null;
      out.nearTermOutline = outlineResult.value[1] && outlineResult.value[1].status === "fulfilled" ? outlineResult.value[1].value : null;
      out.outlines = outlineResult.value[2] && outlineResult.value[2].status === "fulfilled" ? normalizeList(outlineResult.value[2].value) : null;
    }
    if (Array.isArray(out.chapters) && out.chapters.length) {
      if (!out.chapters.some((item) => Number(item.chapter_number) === out.selectedChapter)) {
        out.selectedChapter = Math.max(...out.chapters.map((item) => Number(item.chapter_number) || 0));
      }
      const trio = await Promise.allSettled([
        window.LF_API.bookChapter(bookId, out.selectedChapter),
        window.LF_API.bookChapterGuide(bookId, out.selectedChapter),
        window.LF_API.bookChapterWorld(bookId, out.selectedChapter)
      ]);
      const chapterBlocking = [
        ["chapter", trio[0], false],
        ["chapter-guide", trio[1], true],
        ["chapter-world", trio[2], true]
      ].find((entry) => entry[1].status === "rejected"
        && !contentAccessDetail(entry[1].reason)
        && !(entry[2] && entry[1].reason && entry[1].reason.status === 404));
      if (chapterBlocking) {
        const error = chapterBlocking[1].reason || new Error("Chapter data load failed");
        error.portalLoadStage = chapterBlocking[0];
        throw error;
      }
      if (trio[0].status === "fulfilled") { out.chapter = trio[0].value; out.chapterBundle.chapter = trio[0].value; }
      else {
        const restriction = contentAccessDetail(trio[0].reason);
        if (restriction) {
          out.chapter = null;
          out.chapterBundle.chapter = null;
          out.chapterBundle.contentAccess = restriction;
        }
      }
      if (trio[1].status === "fulfilled") out.chapterBundle.guide = trio[1].value;
      if (trio[2].status === "fulfilled") out.chapterBundle.world = trio[2].value;
    }
    return out;
  }

  // Cache the book-level fields (chapter-specific data lives in chapterCache).
  // Only cache when the chapters fetch succeeded, so an unreachable engine does
  // not poison the cache with an empty book.
  function cacheBookLevel(bookId, book) {
    if (!bookId || !book || book.chapters == null) return;
    bookCache.set(bookId, { data: {
      world: book.world, characters: book.characters, storyPlan: book.storyPlan,
      chapters: book.chapters, volumeOutline: book.volumeOutline,
      nearTermOutline: book.nearTermOutline, outlines: book.outlines
    }, ts: Date.now() });
  }

  // Assemble the full snapshot shape from account + book-level parts.
  function assembleSnapshot(account, selectedBookId, book) {
    return Object.assign({}, account, {
      selectedBookId,
      selectedChapter: book.selectedChapter,
      world: book.world,
      characters: book.characters,
      storyPlan: book.storyPlan,
      chapters: book.chapters,
      chapter: book.chapter,
      volumeOutline: book.volumeOutline,
      nearTermOutline: book.nearTermOutline,
      outlines: book.outlines
    });
  }

  // Persist caches + render a book+chapter snapshot. Shared by the full load and
  // the book-switch path.
  async function commitBookSnapshot(snapshot, book) {
    const bookId = snapshot.selectedBookId;
    persistSelectedBook(bookId);
    if (book.selectedChapter) persistSelectedChapter(book.selectedChapter);
    cacheBookLevel(bookId, book);
    if (bookId && book.selectedChapter && ("chapter" in book.chapterBundle)) {
      chapterCache.set(switchCacheKey(bookId, book.selectedChapter), { data: book.chapterBundle, ts: Date.now() });
    }
    const ok = applySnapshot(snapshot);
    persistSnapshot(snapshot);
    if (ok && bookId && book.selectedChapter) applyChapterBundle(bookId, book.selectedChapter, book.chapterBundle);
    if (ok && bookId) await prefetchMissingTitles(bookId);
    return ok;
  }

  const EMPTY_BOOK = { selectedChapter: 0, chapterBundle: {}, chapter: null,
    world: null, characters: null, storyPlan: null, chapters: null,
    volumeOutline: null, nearTermOutline: null, outlines: null };

  // Full load: account + selected book + chapter. Used on bootstrap, login,
  // book create, and after engine tasks. Book/chapter switches use the lighter
  // loadBook / selectChapter paths.
  async function loadPortalSnapshot(options) {
    const shouldApply = options && options.shouldApply;
    if (shouldApply && !shouldApply()) return false;
    const tokens = readTokens();
    if (!tokens) return false;
    const requestedBookId = options && options.selectedBookId != null
      ? String(options.selectedBookId)
      : null;
    const requestedChapter = options && options.selectedChapter != null
      ? Number(options.selectedChapter)
      : readPersistedChapterNumber();
    const seq = ++loadSeq;
    let selectedBookId = null;
    let bookPromise = null;
    const account = await fetchAccount({
      onIdentity(me) {
        if (seq !== loadSeq) return;
        applyUser({ me });
        rerender();
      },
      onCore(core) {
        selectedBookId = requestedBookId || readPersistedBookId();
        if (!core.books.some((book) => book.id === selectedBookId)) {
          selectedBookId = core.books[0] && core.books[0].id;
        }
        bookPromise = selectedBookId
          ? fetchBookLevel(selectedBookId, options)
          : Promise.resolve(Object.assign({}, EMPTY_BOOK, { selectedChapter: 0 }));
      }
    });
    if (!account) return false;
    let book = Object.assign({}, EMPTY_BOOK, {
      selectedChapter: Number.isFinite(requestedChapter) ? requestedChapter : 0
    });
    if (bookPromise) book = await bookPromise;
    // A slower load for a previously-selected book must not overwrite the
    // book the user has since switched to.
    if (seq !== loadSeq) return false;
    if (shouldApply && !shouldApply()) return false;
    return commitBookSnapshot(assembleSnapshot(account, selectedBookId, book), book);
  }

  // Book switch: refetch only the book + chapter level, reusing the cached
  // account-level snapshot (me/books/tasks/billing/...) — no account refetch.
  async function loadBook(bookId, options) {
    const shouldApply = options && options.shouldApply;
    if (shouldApply && !shouldApply()) return false;
    const tokens = readTokens();
    if (!tokens) return false;
    const seq = ++loadSeq;
    // Reuse the cached account level; refetch it only when stale or invalidated
    // (e.g. after a billing write), so a book switch normally costs 0 account
    // requests but still picks up account changes within one switch.
    let account = accountCache.data;
    const refreshAccount = !(options && options.refreshAccount === false);
    const missingTarget = !account || !Array.isArray(account.books)
      || !account.books.some(item => String(item.id) === String(bookId));
    const accountPromise = refreshAccount && (accountStale() || missingTarget)
      ? fetchAccount()
      : Promise.resolve(account);
    const bookPromise = fetchBookLevel(bookId, options);
    const [freshAccount, book] = await Promise.all([accountPromise, bookPromise]);
    if (freshAccount) account = freshAccount;
    if (seq !== loadSeq || (shouldApply && !shouldApply())) return false;
    // No account context at all (cold open / deep-link / unreachable) → full load.
    if (!account || !Array.isArray(account.books)) return shouldApply ? false : loadPortalSnapshot();
    if (seq !== loadSeq) return false;
    return commitBookSnapshot(assembleSnapshot(account, bookId, book), book);
  }

  // Instant render of a book from cached book-level data (+ cached chapter trio
  // if present). Reuses the cached account snapshot. Returns the resolved
  // selected chapter number so the caller can revalidate that chapter via SWR.
  function renderBookFromCache(bookId, data) {
    const prev = accountCache.data || window.LF_PORTAL_STATE || {};
    const chs = Array.isArray(data.chapters) ? data.chapters : [];
    let n = readPersistedChapterNumber();
    if (chs.length && !chs.some((c) => Number(c.chapter_number) === n)) {
      n = Math.max(...chs.map((c) => Number(c.chapter_number) || 0));
    }
    if (n) persistSelectedChapter(n);
    const chHit = chapterCache.get(switchCacheKey(bookId, n));
    const book = {
      selectedChapter: n,
      world: data.world, characters: data.characters, storyPlan: data.storyPlan,
      chapters: data.chapters,
      chapter: chHit && chHit.data && ("chapter" in chHit.data) ? chHit.data.chapter : null,
      volumeOutline: data.volumeOutline, nearTermOutline: data.nearTermOutline, outlines: data.outlines,
      chapterBundle: chHit ? chHit.data : {}
    };
    const snapshot = assembleSnapshot(prev, bookId, book);
    const ok = applySnapshot(snapshot);
    persistSnapshot(snapshot);
    if (ok && n) applyChapterBundle(bookId, n, book.chapterBundle);
    rerender();
    return n;
  }

  // Bootstrap: restore from localStorage cache first. Only when there is no
  // cached snapshot do we clear the demo seed from data-console.js, so
  // empty-backend = empty-ui. With a cache, the restored snapshot is the
  // fallback and must NOT be wiped — otherwise a reachable-backend reload
  // flashes empty and an unreachable backend loses the last-known shelf.
  try {
    if (!applySnapshot(readPersistedSnapshot())) {
      clearMutableSeedData();
    }
  } catch (error) {
    clearMutableSeedData();
  }
  if (typeof window.LF_PORTAL_STATE !== "undefined") { window.LF_PORTAL_STATE = null; }

  function assistantMessagePayload(content, pageContext, currentBookId, options) {
    const payload = {
      content: content,
      page_context: pageContext || null,
      current_book_id: currentBookId || null
    };
    if (options && Object.prototype.hasOwnProperty.call(options, "expectedVersionId")) {
      payload.expected_version_id = options.expectedVersionId;
    }
    const source = options && options.workspaceFiles;
    if (Array.isArray(source) && source.length) {
      const files = [];
      const seen = new Set();
      for (let index = 0; index < source.length && files.length < 8; index += 1) {
        const file = source[index];
        const version = file && typeof file.version === "string" ? file.version : "";
        if (!/^[A-Za-z0-9._:-]{1,128}$/.test(version)) continue;
        const rawId = file.file_id;
        let reference = null;
        if (rawId != null && rawId !== "") {
          if (typeof rawId !== "string" || !/^[0-9a-f]{32}$/.test(rawId)) continue;
          let name = String(file.name_snapshot || file.name || "").split(/[/\\]/).pop().replace(/[\u0000-\u001f\u007f]/g, "").trim();
          if (!name || name === "." || name === "..") name = typeof file.path === "string" ? file.path.split("/").pop() : "";
          if (!name || name.length > 180) continue;
          reference = { file_id: rawId, version: version, name_snapshot: name };
          if (typeof file.path === "string" && file.path.indexOf("materials/") === 0) reference.path = file.path;
        } else if (typeof file.path === "string" && file.path.indexOf("materials/") === 0) {
          reference = { path: file.path, version: version };
        }
        if (!reference) continue;
        const key = reference.file_id ? "id\0" + reference.file_id + "\0" + version : "path\0" + reference.path + "\0" + version;
        if (seen.has(key)) continue;
        seen.add(key);
        files.push(reference);
      }
      if (files.length) payload.workspace_files = files;
    }
    return payload;
  }

  window.LF_API = {
    ...(window.CustomSettingsBridge ? window.CustomSettingsBridge.createApi(request, bookId => {
      window.dispatchEvent(new CustomEvent("lf:book-data-updated", {detail: {bookId}}));
    }) : {}),
    baseUrl: apiBase,
    setBaseUrl(url) { localStorage.setItem(API_BASE_KEY, url); },
    tokens: readTokens,
    setTokens: writeTokens,
    request,
    login(email, password) {
      return request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      }).then((tokens) => {
        writeTokens(tokens);
        return tokens;
      });
    },
    register(payload) {
      return request("/api/auth/register/init", { method: "POST", body: JSON.stringify(payload) });
    },
    verifyRegister(email, code, password, registrationToken) {
      return request("/api/auth/register/verify", {
        method: "POST",
        body: JSON.stringify({ email, code, password, registration_token: registrationToken })
      });
    },
    resendRegisterCode(email, registrationToken) {
      return request("/api/auth/register/resend-code", {
        method: "POST",
        body: JSON.stringify({ email, registration_token: registrationToken })
      });
    },
    me() { return request("/api/auth/me"); },
    invitationsMe() { return request("/api/invitations/me"); },
    partnerDashboard() { return request("/api/invitations/partner"); },
    partnerAddMaintenance(userId, payload) { return request("/api/invitations/partner/users/" + encodeURIComponent(userId) + "/maintenance", { method: "POST", body: JSON.stringify(payload) }); },
    getProfile() { return request("/api/users/me/profile"); },
    updateProfile(patch) {
      return request("/api/users/me/profile", { method: "PATCH", body: JSON.stringify(patch) });
    },
    getSettings() { return request("/api/users/me/settings"); },
    getMessageNotificationSettings() { return request("/api/users/me/message-notifications"); },
    runtimeStatus() { return request("/api/runtime-status").then(function (value) { applyEngineAdmission(value); return value; }); },
    updateSettings(patch) {
      return request("/api/users/me/settings", { method: "PATCH", body: JSON.stringify(patch) });
    },
    updateMessageNotificationSettings(patch) {
      return request("/api/users/me/message-notifications", { method: "PATCH", body: JSON.stringify(patch) });
    },
    changePassword(current_password, new_password) {
      return request("/api/auth/password/change", {
        method: "POST",
        body: JSON.stringify({ current_password, new_password })
      });
    },
    changeEmail(current_password, new_email) {
      return request("/api/auth/email/change", {
        method: "POST",
        body: JSON.stringify({ current_password, new_email })
      });
    },
    requestPasswordReset(email) {
      return request("/api/auth/password/reset/request", {
        method: "POST",
        body: JSON.stringify({ email })
      });
    },
    confirmPasswordReset(token, newPassword) {
      return request("/api/auth/password/reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, new_password: newPassword })
      });
    },
    requestEmailVerification() {
      return request("/api/auth/email/verification/request", { method: "POST" });
    },
    confirmEmailVerification(token) {
      return request("/api/auth/email/verification/confirm", {
        method: "POST",
        body: JSON.stringify({ token })
      });
    },
    logout() {
      return request("/api/auth/logout", { method: "POST" }).catch(() => {});
    },
    apiKeys() { return request("/api/api-keys"); },
    createApiKey(payload) {
      return request("/api/api-keys", { method: "POST", body: JSON.stringify(payload) });
    },
    revokeApiKey(id) {
      return request("/api/api-keys/" + encodeURIComponent(id), { method: "DELETE" });
    },
    books() { return request("/api/books"); },
    createBook(payload) {
      // 同步保存 core_mech / style / relationship 到本地 BookLink
      var extra = {};
      if (payload.core_mech) extra.core_mech = payload.core_mech;
      if (payload.style) extra.style = payload.style;
      if (payload.relationship) extra.relationship = payload.relationship;
      var body = Object.assign({}, payload, extra);
      return request("/api/books", { method: "POST", body: JSON.stringify(body) });
    },
    updateBook(bookId, patch) {
      return request("/api/books/" + encodeURIComponent(bookId),
        { method: "PATCH", body: JSON.stringify(patch) });
    },
    archiveBook(bookId) {
      return request("/api/books/" + encodeURIComponent(bookId), { method: "DELETE" });
    },
    bookChapters(bookId, refresh, options) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/chapters" + (refresh ? "?refresh=true" : ""), options);
    },
    bookHooks(bookId) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/hooks");
    },
    bookDebts(bookId) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/debts");
    },
    downloadBookExport(bookId, payload) {
      return downloadRequest("/api/books/" + encodeURIComponent(bookId) + "/export", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    bookDataUsage(bookId) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/data-usage");
    },
    bookTaskQuote(bookId, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/task-quote", {
        method: "POST",
        body: JSON.stringify(payload || {})
      });
    },
    previewBookDataUsage(bookId, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/data-usage/preview", {
        method: "POST",
        body: JSON.stringify(payload || {})
      });
    },
    engineTasks() { return request("/api/engine-tasks"); },
    engineTaskHistory(limit, offset) {
      const query = new URLSearchParams({ limit: String(limit || 50), offset: String(offset || 0) });
      return request("/api/engine-tasks/history?" + query.toString());
    },
    engineTask(id, options) { return request("/api/engine-tasks/" + encodeURIComponent(id), options); },
    createEngineTask(payload, idempotencyKey) {
      var blocked = rejectWhenEngineDraining();
      if (blocked) return blocked;
      var headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
      return request("/api/engine-tasks", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      }).catch(function (error) {
        var detail = error && error.body && error.body.detail;
        var activeTask = detail && typeof detail === "object"
          && detail.code === "active_chapter_task" ? detail.task : null;
        if (activeTask && activeTask.id) rememberPortalTask(activeTask);
        throw error;
      });
    },
    productionReadiness(bookId, operation, executionMode, chapterNumber) {
      var params = new URLSearchParams({ operation: operation });
      if (executionMode) params.set("execution_mode", executionMode);
      if (chapterNumber != null) params.set("chapter_number", String(chapterNumber));
      return request(
        "/api/books/" + encodeURIComponent(bookId) + "/production-readiness?" + params.toString()
      );
    },
    syncEngineTask(id) {
      return request("/api/engine-tasks/" + encodeURIComponent(id) + "/sync", { method: "POST" });
    },
    syncEngineTaskStatus(id) {
      return request("/api/engine-tasks/" + encodeURIComponent(id) + "/sync-status", { method: "POST" });
    },
    taskEvents(id, afterId) {
      const query = afterId != null ? "?after_id=" + encodeURIComponent(afterId) : "";
      return request("/api/engine-tasks/" + encodeURIComponent(id) + "/events" + query);
    },
    streamTask(id, handlers, options) {
      const afterId = options && options.afterId != null ? "?after_id=" + encodeURIComponent(options.afterId) : "";
      return streamRequest("/api/engine-tasks/" + encodeURIComponent(id) + "/stream" + afterId, handlers, options);
    },
    bookWorld(bookId, refresh) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/world" + (refresh ? "?refresh=true" : ""));
    },
    bookWorldDimension(bookId, dimension) {
      return request(
        "/api/books/" + encodeURIComponent(bookId) + "/world/" + encodeURIComponent(dimension)
      );
    },
    updateWorldDimension(bookId, dimension, payload) {
      return request(
        "/api/books/" + encodeURIComponent(bookId) + "/world/" + encodeURIComponent(dimension),
        { method: "PUT", body: JSON.stringify(payload) }
      );
    },
    bookCharacter(bookId, name) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/characters/" + encodeURIComponent(name));
    },
    createCharacter(bookId, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/characters", { method: "POST", body: JSON.stringify(payload) });
    },
    updateCharacter(bookId, name, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/characters/" + encodeURIComponent(name), { method: "PUT", body: JSON.stringify(payload) });
    },
    renameCharacter(bookId, name, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/characters/" + encodeURIComponent(name) + "/rename", { method: "POST", body: JSON.stringify(payload) });
    },
    deleteCharacter(bookId, name, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/characters/" + encodeURIComponent(name), { method: "DELETE", body: JSON.stringify(payload) });
    },
    updateStoryPlan(bookId, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/story-plan", { method: "PUT", body: JSON.stringify(payload) });
    },
    updateVolumeOutline(bookId, volumeNumber, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/outlines/volume/" + encodeURIComponent(volumeNumber), { method: "PUT", body: JSON.stringify(payload) });
    },
    updateNearTermOutline(bookId, volumeNumber, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/outlines/near-term/" + encodeURIComponent(volumeNumber), { method: "PUT", body: JSON.stringify(payload) });
    },
    startRewrite(bookId, payload) {
      var blocked = rejectWhenEngineDraining();
      if (blocked) return blocked;
      return request("/api/books/" + encodeURIComponent(bookId) + "/rewrite", { method: "POST", body: JSON.stringify(payload) });
    },
    rewriteJob(bookId, jobId) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/rewrite/job/" + encodeURIComponent(jobId));
    },
    bookCharacters(bookId) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/characters");
    },
    bookStoryPlan(bookId) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/story-plan");
    },
    bookStyleProfile(bookId) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/style-profile");
    },
    bookChapterWorld(bookId, chapterNumber) {
      return request(
        "/api/books/" + encodeURIComponent(bookId) + "/chapters/" + encodeURIComponent(chapterNumber) + "/world"
      );
    },
    bookChapterGuide(bookId, chapterNumber, options) {
      return request(
        "/api/books/" + encodeURIComponent(bookId) + "/chapters/" + encodeURIComponent(chapterNumber) + "/guide", options
      );
    },
    bookOutlines(bookId) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/outlines");
    },
    bookVolumeOutline(bookId, volumeNumber) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/outlines/volume/" + encodeURIComponent(volumeNumber));
    },
    bookNearTermOutline(bookId, volumeNumber) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/outlines/near-term/" + encodeURIComponent(volumeNumber));
    },
    bookVolumeOutlineLatest(bookId) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/outlines/volume/latest");
    },
    bookNearTermOutlineLatest(bookId) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/outlines/near-term/latest");
    },
    billing() { return request("/api/billing/me"); },
    billingSummary() { return request("/api/billing/summary"); },
    billingCapacity() { return request("/api/billing/capacity"); },
    // Server-side cruise
    getActiveCruise() { return request("/api/cruise/active"); },
    startCruise(payload) {
      var blocked = rejectWhenEngineDraining();
      if (blocked) return blocked;
      return request("/api/cruise/start", { method: "POST", body: JSON.stringify(payload) });
    },
    estimateCruise(payload) { return request("/api/cruise/estimate", { method: "POST", body: JSON.stringify(payload) }); },
    pauseCruise() { return request("/api/cruise/pause", { method: "POST" }); },
    resumeCruise(payload) { return request("/api/cruise/resume", { method: "POST", body: payload ? JSON.stringify(payload) : undefined }); },
    requoteCruise() { return request("/api/cruise/requote", { method: "POST" }); },
    stopCruise() { return request("/api/cruise/stop", { method: "POST" }); },
    usageSummary() { return request("/api/billing/usage-summary"); },
    subscription() { return request("/api/billing/subscription"); },
    billingCatalog() { return request("/api/billing/catalog"); },
    billingOrders(limit) { return request("/api/billing/orders" + (limit ? "?limit=" + limit : "")); },
    billingTransactions(limit) { return request("/api/billing/transactions" + (limit ? "?limit=" + limit : "")); },
    billingTransactionsPage(filters) {
      const query = new URLSearchParams();
      ["limit", "offset", "sort_by", "sort_dir"].forEach(key => {
        if (filters && filters[key] != null) query.set(key, String(filters[key]));
      });
      if (filters && Array.isArray(filters.types)) filters.types.forEach(type => query.append("types", type));
      return request("/api/billing/transactions-page?" + query.toString());
    },
    buyCreditPack(packCode, idempotencyKey, provider) {
      return request("/api/billing/orders/credit-pack", {
        method: "POST",
        body: JSON.stringify({ pack_code: packCode, idempotency_key: idempotencyKey || null, provider: provider || "mock" })
      });
    },
    upgradePlan(planCode, idempotencyKey, provider) {
      return request("/api/billing/subscription/upgrade", {
        method: "POST",
        body: JSON.stringify({ plan_code: planCode, idempotency_key: idempotencyKey || null, provider: provider || "mock" })
      });
    },
    syncBillingOrder(orderId) {
      return request("/api/billing/orders/" + encodeURIComponent(orderId) + "/sync", { method: "POST" });
    },
    redeemCode(code) {
      return request("/api/promotions/redemption-codes/redeem", {
        method: "POST",
        body: JSON.stringify({ code })
      });
    },
    redemptions() { return request("/api/promotions/redemptions"); },
    // ---- admin (only succeed for is_admin accounts) ----
    adminAnalytics(days, options) { return request("/api/admin/analytics" + (days ? "?days=" + days : ""), options); },
    adminAnalyticsTasks(days, options) {
      return request("/api/admin/analytics/tasks" + (days != null ? "?days=" + days : ""), options);
    },
    adminAnalyticsNodes(hours, nodeKind, options) {
      var params = new URLSearchParams();
      if (hours != null) params.set("hours", String(hours));
      params.set("node_kind", nodeKind || "llm");
      return request("/api/admin/analytics/nodes?" + params.toString(), options);
    },
    adminPayingUsers(days, orderKind, options) {
      var params = new URLSearchParams();
      params.set("days", String(days == null ? 30 : days));
      params.set("order_kind", orderKind || "all");
      return request("/api/admin/analytics/paying-users?" + params.toString(), options);
    },
    adminUserActivity(days, options) {
      var params = new URLSearchParams();
      params.set("days", String(days == null ? 7 : days));
      return request("/api/admin/analytics/user-activity?" + params.toString(), options);
    },
    trackCreationEvent(name, action, reason) {
      var payload = { name: name, action: action };
      if (reason) payload.reason = reason;
      return request("/api/creation-analytics/events", {
        method: "POST",
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () { return null; });
    },
    adminModelRates() {
      return request("/api/admin/model-rates");
    },
    adminUpsertModelRate(modelName, payload) {
      return request("/api/admin/model-rates/" + encodeURIComponent(modelName), {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    },
    adminTaskEstimates() {
      return request("/api/admin/task-estimates");
    },
    adminUpsertTaskEstimate(taskType, payload) {
      return request("/api/admin/task-estimates/" + encodeURIComponent(taskType), {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    },
    adminTokenSummary(days) {
      return request("/api/admin/analytics/token-summary" + (days != null ? "?days=" + days : ""));
    },
    adminAuditLogs(filters) {
      const params = new URLSearchParams();
      Object.entries(filters || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
      });
      const query = params.toString();
      return request("/api/admin/audit-logs" + (query ? "?" + query : ""));
    },
    adminEngagement() {
      return request("/api/admin/analytics/engagement");
    },
    adminPerformance(hours, options) {
      const params = new URLSearchParams();
      if (hours != null) params.set("hours", String(hours));
      if (options && options.audience) params.set("audience", options.audience);
      params.set("sort", options && options.sort ? options.sort : "risk");
      const query = params.toString();
      const requestOptions = {};
      if (options && options.signal) requestOptions.signal = options.signal;
      return request("/api/admin/analytics/performance" + (query ? "?" + query : ""), requestOptions);
    },
    adminSeoAcquisition(days, options) {
      return request("/api/admin/analytics/seo-acquisition" + (days != null ? "?days=" + days : ""), options);
    },
    adminTokenUsage(params) {
      const qs = [];
      if (params.days != null) qs.push("days=" + params.days);
      if (params.user_id) qs.push("user_id=" + encodeURIComponent(params.user_id));
      if (params.task_id) qs.push("task_id=" + encodeURIComponent(params.task_id));
      if (params.limit) qs.push("limit=" + params.limit);
      if (params.offset) qs.push("offset=" + params.offset);
      return request("/api/admin/analytics/token-usage" + (qs.length ? "?" + qs.join("&") : ""));
    },
    adminTokenTracking(params, options) {
      const qs = new URLSearchParams();
      const values = params || {};
      qs.set("days", String(values.days == null ? 30 : values.days));
      qs.set("limit", String(values.limit == null ? 50 : values.limit));
      qs.set("offset", String(values.offset == null ? 0 : values.offset));
      if (values.q) qs.set("q", values.q);
      if (values.task_type) qs.set("task_type", values.task_type);
      if (values.model_name) qs.set("model_name", values.model_name);
      if (values.state && values.state !== "all") qs.set("state", values.state);
      return request("/api/admin/analytics/token-tracking?" + qs.toString(), options);
    },
    adminCreditPacks(options) { return request("/api/admin/packs", options); },
    adminUpsertCreditPack(code, payload) {
      return request("/api/admin/packs/" + encodeURIComponent(code), { method: "PUT", body: JSON.stringify(payload) });
    },
    adminCreditPackAccess(code, options) {
      return request("/api/admin/packs/" + encodeURIComponent(code) + "/access", options);
    },
    adminGrantCreditPackAccess(code, userId, reason) {
      return request("/api/admin/packs/" + encodeURIComponent(code) + "/access/" + encodeURIComponent(userId), {
        method: "PUT", body: JSON.stringify({ reason })
      });
    },
    adminRevokeCreditPackAccess(code, userId, reason) {
      return request("/api/admin/packs/" + encodeURIComponent(code) + "/access/" + encodeURIComponent(userId), {
        method: "DELETE", body: JSON.stringify({ reason })
      });
    },
    adminUsers(params, options) {
      const query = new URLSearchParams();
      const values = params || {};
      if (values.q) query.set("q", values.q);
      if (values.siteCode && values.siteCode !== "all") query.set("site_code", values.siteCode);
      query.set("limit", String(values.limit == null ? 25 : values.limit));
      query.set("offset", String(values.offset == null ? 0 : values.offset));
      query.set("days", String(values.days == null ? 30 : values.days));
      if (values.isActive != null) query.set("is_active", String(values.isActive));
      if (values.segment && values.segment !== "all") query.set("segment", values.segment);
      if (values.commercial && values.commercial !== "all") query.set("commercial", values.commercial);
      if (values.source && values.source !== "all") query.set("source", values.source);
      if (values.lifecycle && values.lifecycle !== "all") query.set("lifecycle", values.lifecycle);
      if (values.sort) query.set("sort", values.sort);
      if (values.direction) query.set("direction", values.direction);
      return request("/api/admin/users?" + query.toString(), options);
    },
    downloadAdminUsers(params) {
      const query = new URLSearchParams();
      const values = params || {};
      if (values.q) query.set("q", values.q);
      if (values.siteCode && values.siteCode !== "all") query.set("site_code", values.siteCode);
      query.set("days", String(values.days == null ? 30 : values.days));
      if (values.isActive != null) query.set("is_active", String(values.isActive));
      if (values.segment && values.segment !== "all") query.set("segment", values.segment);
      if (values.commercial && values.commercial !== "all") query.set("commercial", values.commercial);
      if (values.source && values.source !== "all") query.set("source", values.source);
      if (values.lifecycle && values.lifecycle !== "all") query.set("lifecycle", values.lifecycle);
      if (values.sort) query.set("sort", values.sort);
      if (values.direction) query.set("direction", values.direction);
      return downloadRequest("/api/admin/users/export.csv?" + query.toString());
    },
    downloadAdminCreditLedger(params) {
      const query = new URLSearchParams();
      const values = params || {};
      if (values.createdFrom) query.set("created_from", values.createdFrom);
      if (values.createdTo) query.set("created_to", values.createdTo);
      return downloadRequest("/api/admin/credit-ledger/export.csv?" + query.toString());
    },
    adminCreditTransactions(params, options) {
      const query = new URLSearchParams();
      const values = params || {};
      query.set("limit", String(values.limit == null ? 50 : values.limit));
      query.set("offset", String(values.offset == null ? 0 : values.offset));
      if (values.q) query.set("q", values.q);
      if (values.ledgerType && values.ledgerType !== "all") query.set("ledger_type", values.ledgerType);
      if (values.action && values.action !== "all") query.set("action", values.action);
      if (values.source && values.source !== "all") query.set("source", values.source);
      if (values.createdFrom) query.set("created_from", values.createdFrom);
      if (values.sort) query.set("sort", values.sort);
      if (values.direction) query.set("direction", values.direction);
      return request("/api/admin/credit-ledger?" + query.toString(), options);
    },
    adminUser(userId, days, options) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + (days ? "?days=" + days : ""), options);
    },
    adminUserEvidence(userId, limit, options) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/evidence" + (limit ? "?limit=" + limit : ""), options);
    },
    adminUserInvitations(userId, params, options) {
      const query = new URLSearchParams();
      const values = params || {};
      query.set("limit", String(values.limit == null ? 25 : values.limit));
      query.set("offset", String(values.offset == null ? 0 : values.offset));
      if (values.sort) query.set("sort", values.sort);
      if (values.direction) query.set("direction", values.direction);
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/invitations?" + query.toString(), options);
    },
    adminUserBooks(userId) { return request("/api/admin/users/" + encodeURIComponent(userId) + "/books"); },
    adminUserTasks(userId, limit) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/tasks" + (limit ? "?limit=" + limit : ""));
    },
    adminUserTransactions(userId, limit) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/transactions" + (limit ? "?limit=" + limit : ""));
    },
    adminUserOrders(userId, limit) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/orders" + (limit ? "?limit=" + limit : ""));
    },
    adminUserNotifications(userId, limit) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/notifications" + (limit ? "?limit=" + limit : ""));
    },
    adminSetUserActive(userId, active, reason) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + (active ? "/enable" : "/disable"), {
        method: "POST",
        body: JSON.stringify({ reason: reason || null })
      });
    },
    adminGrantCredits(userId, amountMillis, reason, validDays, idempotencyKey) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/credits/grant", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ amount_millis: amountMillis, reason: reason || null, valid_days: validDays })
      });
    },
    adminRefundableOrders(userId) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/refundable-orders");
    },
    adminPreviewOrderRefund(userId, orderId) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/orders/" + encodeURIComponent(orderId) + "/refund/preview", {
        method: "POST"
      });
    },
    adminApplyOrderRefund(userId, orderId, payload) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/orders/" + encodeURIComponent(orderId) + "/refund/apply", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    adminPreviewCreditPenalty(userId, payload) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/credits/penalty/preview", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    adminApplyCreditPenalty(userId, payload) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/credits/penalty/apply", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    adminUpdateContentRestriction(userId, manualRestriction, reason) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/content-restriction", {
        method: "POST",
        body: JSON.stringify({ manual_restriction: manualRestriction, reason: reason })
      });
    },
    adminUpdateInvitationFreeze(userId, frozen, reason) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/invitation-freeze", {
        method: "POST",
        body: JSON.stringify({ frozen: !!frozen, reason: reason })
      });
    },
    adminSetSubscription(userId, planCode, reason) {
      return request("/api/admin/users/" + encodeURIComponent(userId) + "/subscription", {
        method: "POST",
        body: JSON.stringify({ plan_code: planCode, reason: reason || null })
      });
    },
    adminBulkGrant(amountMillis, reason, onlyActive, validDays, idempotencyKey) {
      return request("/api/admin/credits/bulk-grant", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ amount_millis: amountMillis, reason: reason || null, only_active: onlyActive !== false, valid_days: validDays })
      });
    },
    adminReconcile() { return request("/api/admin/reconcile", { method: "POST" }); },
    adminSubscriptions(limit) { return request("/api/admin/subscriptions" + (limit ? "?limit=" + limit : "")); },
    adminRedemptionCodes() { return request("/api/admin/promotions/redemption-codes"); },
    adminCreateRedemptionCode(payload) {
      return request("/api/admin/promotions/redemption-codes", { method: "POST", body: JSON.stringify(payload) });
    },
    adminCreateRedemptionCodesBatch(payload) {
      return request("/api/admin/promotions/redemption-codes/batch", { method: "POST", body: JSON.stringify(payload) });
    },
    adminDeactivateRedemptionCode(id) {
      return request("/api/admin/promotions/redemption-codes/" + encodeURIComponent(id) + "/deactivate", { method: "POST" });
    },
    adminRedemptionDetails(codeId) {
      return request("/api/admin/promotions/redemption-codes/" + encodeURIComponent(codeId) + "/details");
    },
    notifications() { return request("/api/notifications"); },
    notificationsUnread() { return request("/api/notifications/unread-count"); },
    notificationPopupClaim(accountId, signal) {
      return request("/api/notifications/popup/claim", {
        method: "POST", body: JSON.stringify({ account_id: accountId }), signal
      });
    },
    notificationRead(id) { return request("/api/notifications/" + encodeURIComponent(id) + "/read", { method: "POST" }); },
    notificationsReadAll() { return request("/api/notifications/read-all", { method: "POST" }); },
    notificationDelete(id) { return request("/api/notifications/" + encodeURIComponent(id), { method: "DELETE" }); },
    announcements() { return request("/api/announcements"); },
    announcementsUnread() { return request("/api/announcements/unread-count"); },
    announcementRead(id) { return request("/api/announcements/" + encodeURIComponent(id) + "/read", { method: "POST" }); },
    announcementsReadAll() { return request("/api/announcements/read-all", { method: "POST" }); },
    adminAnnouncements(limit) { return request("/api/admin/announcements" + (limit ? "?limit=" + limit : "")); },
    adminCreateAnnouncement(payload) { return request("/api/admin/announcements", { method: "POST", body: JSON.stringify(payload) }); },
    adminUpdateAnnouncement(id, payload) { return request("/api/admin/announcements/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(payload) }); },
    adminDeleteAnnouncement(id) { return request("/api/admin/announcements/" + encodeURIComponent(id), { method: "DELETE" }); },
    adminImportMessageActivity(file) {
      return request("/api/admin/message-activities/import", {
        method: "POST", headers: { "Content-Type": "text/csv; charset=utf-8" }, body: file
      });
    },
    adminPreviewMessageActivity(payload) {
      return request("/api/admin/message-activities/preview", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    adminSendMessageActivity(payload, idempotencyKey) {
      return request("/api/admin/message-activities", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload)
      });
    },
    adminSendMessage(userId, payload) { return request("/api/admin/users/" + encodeURIComponent(userId) + "/messages", { method: "POST", body: JSON.stringify(payload) }); },
    adminPublicApiSettings() { return request("/api/admin/public-api-settings"); },
    adminUpdatePublicApiSettings(payload) {
      return request("/api/admin/public-api-settings", { method: "PUT", body: JSON.stringify(payload) });
    },
    adminOutputBudgets() { return request("/api/admin/output-budgets"); },
    adminUpdateOutputBudgets(payload) {
      return request("/api/admin/output-budgets", { method: "PUT", body: JSON.stringify(payload) });
    },
    adminOtherSettings() { return request("/api/admin/other-settings"); },
    adminUpdateOtherSettings(payload) {
      return request("/api/admin/other-settings", { method: "PUT", body: JSON.stringify(payload) });
    },
    adminAssistantSettings() { return request("/api/admin/assistant-settings"); },
    adminUpdateAssistantSettings(payload) {
      return request("/api/admin/assistant-settings", { method: "PUT", body: JSON.stringify(payload) });
    },
    adminAssistantPricing(options) { return request("/api/admin/assistant-settings/pricing", options || {}); },
    adminUpdateAssistantPricing(payload, options) {
      return request("/api/admin/assistant-settings/pricing", Object.assign({}, options || {}, {
        method: "PATCH", body: JSON.stringify(payload)
      }));
    },
    adminAssistantPricingUsers(params, options) {
      const values = params || {};
      const query = new URLSearchParams({ limit: String(values.limit == null ? 25 : values.limit), offset: String(values.offset == null ? 0 : values.offset) });
      return request("/api/admin/assistant-settings/pricing/users?" + query.toString(), options || {});
    },
    adminAssistantUserPricing(userId, options) {
      return request("/api/admin/assistant-settings/pricing/users/" + encodeURIComponent(userId), options || {});
    },
    adminUpdateAssistantUserPricing(userId, payload, options) {
      return request("/api/admin/assistant-settings/pricing/users/" + encodeURIComponent(userId), Object.assign({}, options || {}, {
        method: "PUT", body: JSON.stringify(payload)
      }));
    },
    adminCouponCampaigns(limit = 200, offset = 0) {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      return request("/api/admin/promotions/coupon-campaigns?" + params.toString());
    },
    adminCreateCouponCampaign(payload) {
      return request("/api/admin/promotions/coupon-campaigns", { method: "POST", body: JSON.stringify(payload) });
    },
    adminDeactivateCouponCampaign(id) {
      return request("/api/admin/promotions/coupon-campaigns/" + encodeURIComponent(id) + "/deactivate", { method: "POST" });
    },
    adminUserLimits() { return request("/api/admin/user-limits"); },
    adminUpdateUserLimits(payload) {
      return request("/api/admin/user-limits", { method: "PUT", body: JSON.stringify(payload) });
    },
    adminPublicApiAnnouncements(limit) {
      return request("/api/admin/public-api-announcements" + (limit ? "?limit=" + limit : ""));
    },
    adminCreatePublicApiAnnouncement(payload) {
      return request("/api/admin/public-api-announcements", { method: "POST", body: JSON.stringify(payload) });
    },
    adminUpdatePublicApiAnnouncement(id, payload) {
      return request("/api/admin/public-api-announcements/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(payload) });
    },
    adminDeletePublicApiAnnouncement(id) {
      return request("/api/admin/public-api-announcements/" + encodeURIComponent(id), { method: "DELETE" });
    },
    adminPaymentChannels() { return request("/api/admin/payment-channels"); },
    adminUpdatePaymentChannels(payload) {
      return request("/api/admin/payment-channels", { method: "PUT", body: JSON.stringify(payload) });
    },
    adminRegistrationAccess() { return request("/api/admin/registration-access"); },
    adminUpdateRegistrationAccess(payload) {
      return request("/api/admin/registration-access", { method: "PUT", body: JSON.stringify(payload) });
    },
    adminPartnerships(partnerUserId, limit, offset, options) {
      const params = new URLSearchParams();
      if (partnerUserId) params.set("partner_user_id", partnerUserId);
      params.set("limit", String(limit || 100));
      params.set("offset", String(offset || 0));
      return request("/api/admin/partnerships?" + params.toString(), options);
    },
    adminSavePartner(payload) { return request("/api/admin/partnerships/partner", { method: "PUT", body: JSON.stringify(payload) }); },
    adminSaveInvitationSettings(payload) { return request("/api/admin/partnerships/settings", { method: "PUT", body: JSON.stringify(payload) }); },
    adminPartnerAddMaintenance(partnerId, userId, payload) { return request("/api/admin/partnerships/partners/" + encodeURIComponent(partnerId) + "/users/" + encodeURIComponent(userId) + "/maintenance", { method: "POST", body: JSON.stringify(payload) }); },
    adminSettleCommission(id, note) { return request("/api/admin/partnerships/commissions/" + encodeURIComponent(id) + "/settle", { method: "POST", body: JSON.stringify({ note }) }); },
    adminVoidCommission(id, note) { return request("/api/admin/partnerships/commissions/" + encodeURIComponent(id) + "/void", { method: "POST", body: JSON.stringify({ note }) }); },
    adminModelRouting() { return request("/api/admin/model-routing"); },
    adminAdvancedWriterModels() { return request("/api/admin/advanced-writer-models"); },
    adminSaveAdvancedWriterModel(modelRef, payload) {
      return request("/api/admin/advanced-writer-models/" + encodeURIComponent(modelRef), { method: "PUT", body: JSON.stringify(payload) });
    },
    adminMemoryModels() { return request("/api/admin/model-routing/memory"); },
    adminProbeMemoryModel(payload) { return request("/api/admin/model-routing/memory/probe", { method: "POST", body: JSON.stringify(payload) }); },
    adminUpdateMemoryModels(payload) { return request("/api/admin/model-routing/memory", { method: "PATCH", body: JSON.stringify(payload) }); },
    adminMemoryModelDeployment() { return request("/api/admin/model-routing/memory/deployment"); },
    adminProbeModel(model, model_params) {
      return request("/api/admin/model-routing/probe", { method: "POST", body: JSON.stringify({ model, model_params: model_params || {} }) });
    },
    adminUpdateModelRouting(payload) {
      return request("/api/admin/model-routing", { method: "PUT", body: JSON.stringify(payload) });
    },
    adminPatchModelRouting(payload) {
      return request("/api/admin/model-routing", { method: "PATCH", body: JSON.stringify(payload) });
    },
    adminUpdateModelRoutingCanaries(payload) {
      return request("/api/admin/model-routing/canaries", { method: "PUT", body: JSON.stringify(payload) });
    },
    coupons() { return request("/api/promotions/coupons"); },
    updateChapterBody(bookId, chapterNumber, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/chapters/" + encodeURIComponent(chapterNumber) + "/body", { method: "PUT", body: JSON.stringify(payload) });
    },
    updateChapterGuide(bookId, chapterNumber, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/chapters/" + encodeURIComponent(chapterNumber) + "/guide", { method: "PUT", body: JSON.stringify(payload) });
    },
    bookChapter(bookId, chapterNumber) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/chapters/" + encodeURIComponent(chapterNumber));
    },
    bookChapterBodyRevisions(bookId, chapterNumber) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/chapters/" + encodeURIComponent(chapterNumber) + "/body/revisions");
    },
    bookChapterBodyRevision(bookId, chapterNumber, revisionId) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/chapters/" + encodeURIComponent(chapterNumber) + "/body/revisions/" + encodeURIComponent(revisionId));
    },
    bookResourceRevisions(bookId, resourceType, resourceKey) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/resources/" + encodeURIComponent(resourceType) + "/" + encodeURIComponent(resourceKey) + "/revisions");
    },
    bookResourceRevision(bookId, resourceType, resourceKey, revisionId) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/resources/" + encodeURIComponent(resourceType) + "/" + encodeURIComponent(resourceKey) + "/revisions/" + encodeURIComponent(revisionId));
    },
    restoreBookResource(bookId, resourceType, resourceKey, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/resources/" + encodeURIComponent(resourceType) + "/" + encodeURIComponent(resourceKey) + "/restore", { method: "POST", body: JSON.stringify(payload) });
    },
    bookPlanningPackageRevisions(bookId, volumeNumber) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/outlines/package/" + encodeURIComponent(volumeNumber) + "/revisions");
    },
    bookPlanningPackageRevision(bookId, volumeNumber, packageRevisionId) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/outlines/package/" + encodeURIComponent(volumeNumber) + "/revisions/" + encodeURIComponent(packageRevisionId));
    },
    restoreBookPlanningPackage(bookId, volumeNumber, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/outlines/package/" + encodeURIComponent(volumeNumber) + "/restore", { method: "POST", body: JSON.stringify(payload) });
    },
    updateHook(bookId, hookId, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/hooks/" + encodeURIComponent(hookId), { method: "PUT", body: JSON.stringify(payload) });
    },
    updateDebt(bookId, debtId, payload) {
      return request("/api/books/" + encodeURIComponent(bookId) + "/debts/" + encodeURIComponent(debtId), { method: "PUT", body: JSON.stringify(payload) });
    },
    assistantAvailability() {
      return request("/api/assistant/availability");
    },
    assistantCapabilities() {
      return request("/api/assistant/capabilities");
    },
    createAssistantSession() {
      return request("/api/assistant/sessions", { method: "POST", body: JSON.stringify({}) });
    },
    async openAssistantWelcome(sessionId) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      try {
        return await request("/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/welcome?locale=" + (CLANG === "en" ? "en" : "zh-CN"), { method: "POST", signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    },
    assistantSession(sessionId, options) {
      return request("/api/assistant/sessions/" + encodeURIComponent(sessionId), options || {});
    },
    assistantCheckpointStatus(sessionId, options) {
      return request("/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/checkpoint-status", options || {});
    },
    stopAssistantCheckpoint(sessionId, expectedVersionId, idempotencyKey, options) {
      const { rejectPendingActions, ...requestOptions } = options || {};
      return request("/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/checkpoint-stop", {
        ...requestOptions, method: "POST", headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ expected_version_id: expectedVersionId,
          ...(rejectPendingActions === true ? { reject_pending_actions: true } : {}) })
      });
    },
    streamAssistantCheckpointResume(sessionId, expectedVersionId, sourceMessageId, idempotencyKey, handlers, options) {
      const { protectionKey, ...requestOptions } = options || {};
      return streamAssistantRequest("/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/checkpoint-resume/stream",
        handlers || {}, { ...requestOptions, method: "POST", headers: { "Idempotency-Key": idempotencyKey },
          body: JSON.stringify({ expected_version_id: expectedVersionId, source_message_id: sourceMessageId,
            ...(protectionKey ? { protection_key: protectionKey } : {}) }) });
    },
    streamAssistantMessageEdit(sessionId, messageId, expectedVersionId, content, idempotencyKey, handlers, options) {
      return streamAssistantRequest("/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/messages/"
        + encodeURIComponent(messageId) + "/edit/stream", handlers || {}, {
        ...options, method: "POST", headers: { "Idempotency-Key": idempotencyKey },
        // Omitted context and files inherit the original message on the server.
        body: JSON.stringify({ expected_version_id: expectedVersionId, content })
      });
    },
    assistantNavigationRequest(sessionId, callId) {
      return request("/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/navigation/" + encodeURIComponent(callId));
    },
    acknowledgeAssistantNavigation(sessionId, callId, receipt) {
      return request("/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/navigation/" + encodeURIComponent(callId),
        {method:"POST", body:JSON.stringify(receipt)});
    },
    assistantSessionMessages(sessionId, query, options) {
      const params = new URLSearchParams();
      const cursor = query && query.before_sequence;
      const limit = query && query.limit;
      if (cursor != null) params.set("before_sequence", String(cursor));
      if (limit != null) params.set("limit", String(limit));
      const suffix = params.toString();
      return request(
        "/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/messages" + (suffix ? "?" + suffix : ""),
        options || {}
      );
    },
    assistantMessageReceipt(sessionId, requestKey, options) {
      const params = new URLSearchParams();
      params.set("request_key", String(requestKey || ""));
      return request(
        "/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/messages/receipt?" + params.toString(),
        options || {}
      );
    },
    resetAssistantSession(sessionId) {
      return request("/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/reset", {
        method: "POST"
      });
    },
    consolidateAssistantMemory(sessionId, options) {
      return request("/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/memory/consolidate", {
        ...options, method: "POST", body: JSON.stringify({})
      });
    },
    assistantMemoryTasks(sessionId, options) {
      return request('/api/assistant/sessions/' + encodeURIComponent(sessionId) + '/memory/tasks', options);
    },
    sendAssistantMessage(sessionId, content, pageContext, currentBookId, idempotencyKey, options) {
      return request("/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/messages", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(assistantMessagePayload(content, pageContext, currentBookId, options))
      });
    },
    streamAssistantMessage(sessionId, content, pageContext, currentBookId, idempotencyKey, handlers, options) {
      return streamAssistantRequest(
        "/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/messages/stream",
        handlers || {},
        Object.assign({}, options || {}, {
          method: "POST",
          headers: Object.assign(
            { "Idempotency-Key": idempotencyKey },
            options && options.headers || {}
          ),
          body: JSON.stringify(assistantMessagePayload(content, pageContext, currentBookId, options))
        })
      );
    },
    confirmAssistantAction(actionId, argumentsHash) {
      return request("/api/assistant/actions/" + encodeURIComponent(actionId) + "/confirm", {
        method: "POST",
        body: JSON.stringify({ arguments_hash: argumentsHash })
      });
    },
    streamAssistantActionConfirmation(actionId, argumentsHash, handlers, options) {
      return streamAssistantRequest(
        "/api/assistant/actions/" + encodeURIComponent(actionId) + "/confirm/stream",
        handlers || {},
        Object.assign({}, options || {}, {
          method: "POST",
          body: JSON.stringify({ arguments_hash: argumentsHash })
        })
      );
    },
    rejectAssistantAction(actionId) {
      return request("/api/assistant/actions/" + encodeURIComponent(actionId) + "/reject", {
        method: "POST"
      });
    },
    streamAssistantActionRejection(actionId, handlers, options) {
      return streamAssistantRequest(
        "/api/assistant/actions/" + encodeURIComponent(actionId) + "/reject/stream",
        handlers || {},
        Object.assign({}, options || {}, { method: "POST" })
      );
    },
    streamAssistantActionResume(sessionId, actionId, handlers, options) {
      return streamAssistantRequest(
        "/api/assistant/sessions/" + encodeURIComponent(sessionId)
          + "/actions/" + encodeURIComponent(actionId) + "/resume/stream",
        handlers || {},
        Object.assign({}, options || {}, { method: "POST" })
      );
    },
    assistantActionFieldReview(actionId, options) {
      return request(
        "/api/assistant/actions/" + encodeURIComponent(actionId) + "/field-review", options || {}
      );
    },
    assistantActionCustomSettingsReview(actionId, options) {
      return request(
        "/api/assistant/actions/" + encodeURIComponent(actionId) + "/custom-settings-review", options || {}
      );
    },
    streamAssistantActionRevise(actionId, argumentsHash, instruction, handlers, options) {
      return streamAssistantRequest(
        "/api/assistant/actions/" + encodeURIComponent(actionId) + "/revise/stream",
        handlers || {},
        Object.assign({}, options || {}, {
          method: "POST",
          body: JSON.stringify({ arguments_hash: argumentsHash, instruction })
        })
      );
    },
    streamAssistantFieldGroupDecision(body, handlers, options) {
      return streamAssistantRequest(
        "/api/assistant/actions/field-groups/decide/stream",
        handlers || {},
        Object.assign({}, options || {}, { method: "POST", body: JSON.stringify(body) })
      );
    },
    assistantActionBodyReview(sessionId, actionId, options) {
      return request(
        "/api/assistant/sessions/" + encodeURIComponent(sessionId)
          + "/actions/" + encodeURIComponent(actionId) + "/body-review", options || {}
      );
    },
    assistantActionBodyUndo(sessionId, actionId, options) {
      return request(
        "/api/assistant/sessions/" + encodeURIComponent(sessionId)
          + "/actions/" + encodeURIComponent(actionId) + "/body-undo",
        Object.assign({}, options || {}, { method: "POST", body: JSON.stringify({}) })
      );
    },
    assistantTaskEvents(sessionId, options) {
      return request(
        "/api/assistant/sessions/" + encodeURIComponent(sessionId) + "/task-events",
        options || {}
      );
    },
    streamAssistantTaskCompletion(sessionId, taskId, handlers, options) {
      return streamAssistantRequest(
        "/api/assistant/sessions/" + encodeURIComponent(sessionId)
          + "/tasks/" + encodeURIComponent(taskId) + "/complete/stream",
        handlers || {},
        Object.assign({}, options || {}, { method: "POST" })
      );
    },
    assistantWorkspaceRequest(endpoint, options) {
      const allowed = ["status", "files", "file", "text", "search", "versions", "upload-check", "move"];
      const name = String(endpoint || "").split("?")[0];
      if (!allowed.includes(name)) return Promise.reject(new Error("Invalid workspace operation"));
      return request("/api/assistant/workspace/" + endpoint, options || {});
    },
    assistantWorkspaceImage(query, options) {
      return window.AssistantWorkspaceDelivery.deliver(query, Object.assign({}, options, { previewImage: true }), {
        request, proxy: downloadRequest, identity: () => readTokens() && !window.LF_AUTH_EXPIRED && window.LF_PORTAL_STATE?.me?.id
      });
    },
    assistantWorkspaceDownload(query) {
      return window.AssistantWorkspaceDelivery.deliver(query, {}, {
        request, proxy: downloadRequest, identity: () => readTokens() && !window.LF_AUTH_EXPIRED && window.LF_PORTAL_STATE?.me?.id
      });
    },
    assistantSettings(options) {
      return request("/api/assistant/settings?refresh_usage=true", options || {});
    },
    updateAssistantSettings(payload, options) {
      return request("/api/assistant/settings", Object.assign({}, options || {}, {
        method: "PATCH",
        body: JSON.stringify(payload || {})
      }));
    },
    adminAssistantAnalysisSettings(options) {
      return request("/api/admin/assistant-analysis/settings", options || {});
    },
    updateAdminAssistantAnalysisSettings(payload, options) {
      return request("/api/admin/assistant-analysis/settings", Object.assign({}, options || {}, {
        method: "PATCH",
        body: JSON.stringify(payload || {})
      }));
    },
    adminAssistantAnalysis(query, options) {
      const core = window.AssistantAnalysisCore;
      if (!core || typeof core.analysisPath !== "function") {
        return Promise.reject(new Error("Assistant analysis is unavailable"));
      }
      return request(core.analysisPath(query), options || {});
    },
    adminAssistantAnalysisUnblock(userId, payload, options) {
      const id = String(userId || "").trim();
      if (!id) return Promise.reject(new Error("Invalid user"));
      return request(
        "/api/admin/assistant-analysis/users/" + encodeURIComponent(id) + "/unblock",
        Object.assign({}, options || {}, {
          method: "POST",
          body: JSON.stringify({ reason: payload && payload.reason || "" })
        })
      );
    },
    adminAssistantAudit(query, options) {
      const source = window.AssistantAnalysisCore.analysisPath(query);
      const params = new URLSearchParams(source.split("?")[1]);
      params.set("offset", String(query && query.offset || 0));
      params.set("limit", String(query && query.limit || 50));
      if (query && ["queued", "running", "pending", "completed", "failed", "cancelled", "rejected"].includes(query.turnStatus)) params.set("turn_status", query.turnStatus);
      return request("/api/admin/assistant-analysis/audit?" + params, Object.assign({}, options || {}, { cache: "no-store" }));
    },
    adminAssistantAuditTurn(turnId, query, options) {
      const params = new URLSearchParams({ offset: String(query && query.offset || 0), limit: String(query && query.limit || 100) });
      return request("/api/admin/assistant-analysis/audit/turns/" + encodeURIComponent(turnId) + "?" + params, Object.assign({}, options || {}, { cache: "no-store" }));
    },
    assistantPersonalization(options) {
      return request("/api/assistant/personalization", options || {});
    },
    assistantPersonalizationSave(payload, options) {
      return request(
        "/api/assistant/personalization",
        Object.assign({}, options || {}, { method: "PUT", body: JSON.stringify(payload || {}) })
      );
    },
    assistantPersonalizationVersions(query, options) {
      const params = new URLSearchParams();
      if (query && query.before_version != null) params.set("before_version", String(query.before_version));
      var limit = 50;
      if (query && query.limit != null) {
        var parsed = Number(query.limit);
        if (Number.isFinite(parsed)) limit = Math.max(1, Math.min(50, Math.floor(parsed)));
      }
      params.set("limit", String(limit));
      return request("/api/assistant/personalization/versions?" + params.toString(), options || {});
    },
    assistantPersonalizationVersion(version, options) {
      var parsed = Number(version);
      if (!Number.isInteger(parsed) || parsed < 1) return Promise.reject(new Error("Invalid personalization version"));
      return request("/api/assistant/personalization/versions/" + String(parsed), options || {});
    },
    assistantPersonalizationRestore(payload, options) {
      return request(
        "/api/assistant/personalization/restore",
        Object.assign({}, options || {}, { method: "POST", body: JSON.stringify(payload || {}) })
      );
    },
    assistantMemoryItem(id, options) {
      return request("/api/assistant/memory/items/" + encodeURIComponent(id), options || {});
    },
    assistantMemoryUpdate(id, payload, options) {
      return request("/api/assistant/memory/items/" + encodeURIComponent(id),
        Object.assign({}, options || {}, { method: "PATCH", body: JSON.stringify(payload) }));
    },
    assistantMemoryGraph(options) {
      var limit = 200;
      if (options && options.limit != null) {
        var parsed = Number(options.limit);
        if (Number.isFinite(parsed)) limit = Math.max(1, Math.min(300, Math.floor(parsed)));
      }
      var requestOptions = {};
      if (options && options.signal) requestOptions.signal = options.signal;
      return request("/api/assistant/memory/graph?limit=" + String(limit), requestOptions);
    }
  };


  function rerender() {
    if (typeof window.LF_RERENDER === "function") {
      try { window.LF_RERENDER(); } catch (error) {}
    }
  }

  // For chapters the engine generated in a prior session, the snapshot may
  // carry no title ("Untitled chapter").  Fetch each one's guide in the
  // background and patch D.chapters so the tree shows real titles.
  async function prefetchMissingTitles(bookId) {
    if (!window.CONSOLE_DATA || !Array.isArray(window.CONSOLE_DATA.chapters)) return;
    var stale = window.CONSOLE_DATA.chapters.filter(function (c) {
      return c && c.state === "done" && chapterTitleMissing(c);
    });
    if (!stale.length) return;
    await Promise.all(stale.map(async function (ch) {
      try {
        var payload = await window.LF_API.bookChapterGuide(bookId, ch.no);
        var guide = payload && (payload.guide != null ? payload.guide : payload);
        if (guide && typeof guide === "object") {
          var g = (guide.content && typeof guide.content === "object") ? guide.content : guide;
          if (g.title) {
            ch.title = { zh: String(g.title), en: String(g.title) };
          }
        }
      } catch (e) {}
    }));
    rerender();
    // If React hasn't mounted yet (LF_RERENDER undefined), defer so the
    // mount-time useEffect can pick up the change.
    if (!window.LF_RERENDER) setTimeout(rerender, 0);
  }

  function stageChapterNumber(task, data) {
    const payload = data && data.payload;
    const fromPayload = payload && (payload.chapter_number || payload.chapter);
    if (fromPayload != null) return Number(fromPayload);
    if (task && task.chapter_number != null) return Number(task.chapter_number);
    const req = task && task.request_payload;
    const enginePayload = req && req.engine_payload;
    const candidate = (enginePayload && enginePayload.chapter_number) || (req && req.chapter_number);
    return candidate != null ? Number(candidate) : null;
  }

  async function dispatchStageReady(task, event) {
    const data = event && event.data;
    if (!data) return;
    const eventType = String(data.event_type || event.event || "").toLowerCase();
    if (eventType !== "stage_ready") return;
    if (!(task && task.book_link_id)) return;
    try {
      const refresh = portalResourceRefresh();
      if (refresh) await refresh.refreshStage(task, event);
    } catch (error) {
      if (window.LF_PORTAL_STAGE_ERROR) window.LF_PORTAL_STAGE_ERROR(error);
    }
  }

  /* Run an engine task to completion, translating raw SSE/job events into the
     {progress, stage_name} / {done} / {error} shape the screen anchors consume.
     runEngineTask itself reloads the portal snapshot before resolving. */
  async function awaitEngineTask(task, onProgress) {
    let seen = 0;
    const handlers = {
      onEvent(event) {
        if (typeof onProgress !== "function") return;
        seen += 1;
        const data = event && event.data ? event.data : {};
        const payload = data.payload && typeof data.payload === "object" ? data.payload : {};
        const progress = typeof payload.progress === "number" ? payload.progress
          : typeof data.progress === "number" ? data.progress : null;
        onProgress({
          task: task,
          progress: progress != null ? progress : Math.min(0.95, seen / 12),
          stage_name: data.stage_id || data.stage || null,
          event: String(data.event_type || (event && event.event) || "").toLowerCase()
        });
      }
    };
    try {
      const result = await window.LF_PORTAL.runEngineTask(task, handlers);
      if (typeof onProgress === "function") onProgress({ done: true, task: result && result.task, resourceSync: result && result.resourceSync });
      return result;
    } catch (error) {
      if (typeof onProgress === "function") onProgress({ error });
      throw error;
    }
  }

  const PHASE_TASK_TYPES = { world: "world_build", cast: "character", story: "story_plan", outline: "outline" };
  const PHASE_BY_TASK_TYPE = { world_build: "world", character: "cast", story_plan: "story", outline: "outline" };
  const ACTIVE_TASK_STATUSES = ["queued", "running"];
  const FAILED_TASK_STATUSES = ["failed", "cancelled", "canceled"];
  const TERMINAL_TASK_STATUSES = ["completed", "failed", "cancelled", "canceled"];
  function dispatchTerminalTask(task) {
    if (!task || !task.id || !TERMINAL_TASK_STATUSES.includes(String(task.status || "").toLowerCase())) return;
    if (typeof window.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("lf:task-terminal", { detail: { task } }));
    }
  }
  function taskNewestFirst(left, right) {
    const leftCreated = Date.parse(left && left.created_at || "");
    const rightCreated = Date.parse(right && right.created_at || "");
    if (Number.isFinite(leftCreated) && Number.isFinite(rightCreated) && leftCreated !== rightCreated) {
      return rightCreated - leftCreated;
    }
    if (Number.isFinite(leftCreated) !== Number.isFinite(rightCreated)) return Number.isFinite(rightCreated) ? 1 : -1;
    const leftUpdated = Date.parse(left && left.updated_at || "");
    const rightUpdated = Date.parse(right && right.updated_at || "");
    if (Number.isFinite(leftUpdated) && Number.isFinite(rightUpdated) && leftUpdated !== rightUpdated) {
      return rightUpdated - leftUpdated;
    }
    const leftId = Number(left && left.id);
    const rightId = Number(right && right.id);
    if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) return rightId - leftId;
    return 0;
  }
  function creationPhaseTaskState(bookId, phase) {
    const state = window.LF_PORTAL_STATE;
    const tasks = state && Array.isArray(state.tasks) ? state.tasks : [];
    const known = !!(state && state.tasksKnown === true);
    const taskType = PHASE_TASK_TYPES[phase] || phase;
    const matches = tasks.filter((task) => task && task.book_link_id === bookId && task.task_type === taskType);
    matches.sort(taskNewestFirst);
    const latestTask = matches[0] || null;
    const latestStatus = latestTask && latestTask.status || null;
    const hasCompleted = matches.some((task) => task.status === "completed");
    const running = ACTIVE_TASK_STATUSES.includes(latestStatus);
    const latestFailed = FAILED_TASK_STATUSES.includes(latestStatus);
    // Characters added outside the wizard (assistant or manual) complete the
    // cast phase only when no cast generation ever ran; a failed run's partial
    // cast stays failed so retrying goes through the replacement confirmation.
    const adoptedExisting = phase === "cast" && known && !latestTask && existingCharacterCount(bookId) > 0;
    return {
      known,
      hasCompleted,
      adoptedExisting,
      latestTask,
      latestStatus,
      // A reroll in progress temporarily owns the phase. Once it fails, the
      // last readable completed resource remains authoritative and must not be
      // demoted by the failed attempt.
      done: latestStatus === "completed" || (hasCompleted && !running) || adoptedExisting,
      running,
      failed: latestFailed && !hasCompleted,
      latestFailed
    };
  }
  function rememberPortalTask(task) {
    const state = window.LF_PORTAL_STATE;
    if (!state || !task || task.id == null) return;
    const remembered = summarizePortalTask(task) || task;
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    const next = retainPortalTasks(
      [remembered].concat(tasks.filter((item) => item && String(item.id) !== String(task.id)))
    );
    state.tasks = next;
    if (accountCache.data) accountCache.data.tasks = next;
    patchSnapshot({ tasks: next });
    rerender();
  }

  async function refreshCompletedCharacterCreate(bookId) {
    const createTarget = captureCreateDataTarget(bookId);
    const characters = normalizeList(await fetchFullCharacters(bookId, { strict: true }));
    if (!createDataTargetIsCurrent(createTarget)) return false;
    const snapshot = window.LF_PORTAL_STATE;
    if (snapshot && String(snapshot.selectedBookId || "") === String(bookId || "")) {
      snapshot.characters = characters;
      patchSnapshot({ characters });
    }
    applyCharacters({ characters });
    rerender();
    return true;
  }

  async function applyTaskSummaries(summaries) {
    const snapshot = window.LF_PORTAL_STATE;
    if (!snapshot || !Array.isArray(summaries)) return false;
    const currentTasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
    const previousById = new Map(
      currentTasks.filter((task) => task && task.id != null)
        .map((task) => [String(task.id), task])
    );
    const seen = new Set();
    const completedTasks = [];
    let refreshBalanceOnly = false;
    const mergedTasks = summaries.filter((task) => task && task.id != null).map((task) => {
      const key = String(task.id);
      const previous = previousById.get(key) || null;
      const merged = Object.assign({}, previous || {}, task);
      seen.add(key);
      const previousStatus = String(previous && previous.status || "").toLowerCase();
      const nextStatus = String(merged.status || "").toLowerCase();
      const becameTerminal = ["queued", "running"].includes(previousStatus)
        && ["completed", "failed", "cancelled", "canceled"].includes(nextStatus);
      if (becameTerminal && merged.book_link_id) {
        dispatchTerminalTask(merged);
        if (nextStatus === "completed") completedTasks.push(merged);
        else refreshBalanceOnly = true;
      } else if (becameTerminal && merged.task_type === "memory_extract") {
        refreshBalanceOnly = true;
      }
      return merged;
    });
    currentTasks.forEach((task) => {
      if (task && task.id != null && !seen.has(String(task.id))) mergedTasks.push(task);
    });
    const retainedTasks = retainPortalTasks(mergedTasks);
    snapshot.tasks = retainedTasks;
    snapshot.tasksKnown = true;
    if (accountCache.data) {
      accountCache.data.tasks = retainedTasks;
      accountCache.data.tasksKnown = true;
    }
    persistSnapshot(snapshot);
    rerender();
    const refresh = portalResourceRefresh();
    if (refresh && completedTasks.length) {
      try { await refresh.refreshTasks(completedTasks, { channel: "background" }); } catch (error) {}
    } else if (refresh && refreshBalanceOnly) {
      try { await refresh.refreshBalance(); } catch (error) {}
    }
    return true;
  }

  function handleTaskSyncMessage(message) {
    if (!message || message.type !== "tasks" || !Array.isArray(message.tasks)) return;
    if (!message.id || message.id === lastTaskSyncMessageId) return;
    const currentUserId = currentTaskSyncUserId();
    if (!message.userId || !currentUserId || String(message.userId) !== currentUserId) return;
    prepareTaskSyncUser(currentUserId);
    lastTaskSyncMessageId = message.id;
    nextTaskListRefreshAt = Math.max(nextTaskListRefreshAt, Number(message.at || 0) + 10000);
    applyTaskSummaries(message.tasks).catch(function () {});
  }

  function ensureTaskSyncCoordination() {
    if (!document || typeof document.addEventListener !== "function") return;
    if (!taskSyncChannel && typeof window.BroadcastChannel === "function") {
      try {
        taskSyncChannel = new window.BroadcastChannel(TASK_SYNC_CHANNEL_NAME);
        taskSyncChannel.onmessage = (event) => handleTaskSyncMessage(event && event.data);
      } catch (error) { taskSyncChannel = null; }
    }
  }

  function publishTaskSummaries(tasks, userId) {
    const message = {
      type: "tasks",
      id: taskSyncOwner + ":" + Date.now().toString(36) + ":" + Math.random().toString(36).slice(2),
      owner: taskSyncOwner,
      userId,
      at: Date.now(),
      tasks
    };
    ensureTaskSyncCoordination();
    try { localStorage.setItem(TASK_SYNC_RESULT_KEY, JSON.stringify(message)); } catch (error) {}
    if (taskSyncChannel) {
      try { taskSyncChannel.postMessage(message); } catch (error) {}
    }
  }

  function chapterChainKind(stages) {
    var signature = Array.isArray(stages) ? stages.join(",") : "";
    if (signature === "world_state,outline_director") return "outline";
    if (signature === "character_state,writer_group") return "prose";
    return null;
  }

  function chapterChainStorageKey(kind, bookId, chapterNumber) {
    return "lf_chapter_chain_" + kind + "_" + bookId + "_" + Number(chapterNumber);
  }

  function chapterSubmissionStorageKey(kind, bookId, chapterNumber) {
    return "lf_chapter_submission_" + kind + "_" + bookId + "_" + Number(chapterNumber);
  }

  var CHAPTER_SUBMISSION_TTL_MS = 10 * 60 * 1000;

  function purgeLegacyChapterChainKeys() {
    try {
      for (var index = localStorage.length - 1; index >= 0; index -= 1) {
        var key = localStorage.key(index);
        if (key && key.indexOf("lf_chapter_chain_") === 0) localStorage.removeItem(key);
      }
    } catch (error) {}
  }

  function stableSubmissionValue(value) {
    if (Array.isArray(value)) return value.map(stableSubmissionValue);
    if (!value || typeof value !== "object") return value;
    return Object.keys(value).sort().reduce(function (result, key) {
      result[key] = stableSubmissionValue(value[key]);
      return result;
    }, {});
  }

  async function chapterSubmissionFingerprint(value) {
    var serialized = JSON.stringify(stableSubmissionValue(value));
    if (window.crypto && window.crypto.subtle && typeof window.TextEncoder === "function") {
      var bytes = new window.TextEncoder().encode(serialized);
      var digest = await window.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map(function (byte) {
        return byte.toString(16).padStart(2, "0");
      }).join("");
    }
    return serialized;
  }

  async function chapterSubmissionCredential(kind, bookId, chapterNumber, requestPayload) {
    purgeLegacyChapterChainKeys();
    var storageKey = chapterSubmissionStorageKey(kind, bookId, chapterNumber);
    var fingerprint = await chapterSubmissionFingerprint(requestPayload);
    var existing = null;
    try { existing = JSON.parse(localStorage.getItem(storageKey) || "null"); } catch (error) {}
    var age = existing ? Date.now() - Number(existing.created_at) : NaN;
    if (existing && existing.version === 1 && existing.fingerprint === fingerprint
      && Number.isFinite(age) && age >= 0 && age <= CHAPTER_SUBMISSION_TTL_MS
      && typeof existing.chain_id === "string" && existing.chain_id) {
      return { storageKey: storageKey, chainId: existing.chain_id };
    }
    var credential = {
      version: 1,
      chain_id: newChapterChainId(),
      fingerprint: fingerprint,
      created_at: Date.now()
    };
    try { localStorage.setItem(storageKey, JSON.stringify(credential)); } catch (error) {}
    return { storageKey: storageKey, chainId: credential.chain_id };
  }

  function clearChapterSubmission(storageKey) {
    if (!storageKey) return;
    try { localStorage.removeItem(storageKey); } catch (error) {}
  }

  function submissionOutcomeIsAmbiguous(error) {
    var detail = error && error.body && error.body.detail;
    if (detail && detail.code === "idempotency_in_progress") return true;
    var status = error && Number(error.status);
    return !Number.isFinite(status) || status <= 0 || status === 408 || status === 429 || status >= 500;
  }

  function newChapterChainId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "chain_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
  }

  function taskChapterChain(task) {
    var payload = task && task.request_payload;
    var chain = payload && payload.chapter_chain;
    return chain && typeof chain === "object" ? chain : null;
  }
  purgeLegacyChapterChainKeys();
  let portalReadyPromise = null;

  async function refreshStructuredRewriteDisplay(bookId,payload,shouldApply) {
    const createTarget = captureCreateDataTarget(bookId);
    const canApply = () => createDataTargetIsCurrent(createTarget) && (!shouldApply || shouldApply());
    if (!payload || !canApply()) return false;
    if (payload.resource_type === "world") {
      const raw = await window.LF_API.bookWorldDimension(bookId, payload.resource_key);
      const mapped = mapWorldDimension(payload.resource_key, raw);
      if (mapped && canApply()) {
        window.CONSOLE_DATA.create.worldDims = mergeWorldDimensionItems(window.CONSOLE_DATA.create.worldDims, mapped);
        updateCreateStats();
      }
    } else if (payload.resource_type === "book" && payload.resource_key === "story_plan") {
      const plan = await window.LF_API.bookStoryPlan(bookId);
      if (canApply()) applyStoryPlan({ storyPlan: plan });
    } else if (payload.resource_type === "character") {
      const characters = await fetchFullCharacters(bookId);
      if (canApply()) applyCharacters({ characters });
    } else if (payload.resource_type === "outline") {
      const Cite = window.AssistantCiteCore;
      const parsed = Cite && Cite.parseOutlineKey ? Cite.parseOutlineKey(payload.resource_key) : null;
      const volumeNumber = parsed && parsed.volume
        ? parsed.volume
        : (Number(String(payload.resource_key || "").split(":")[1]) || 0);
      if (!volumeNumber) return false;
      await refreshOutlinePackage(bookId, volumeNumber, createTarget);
    } else if (payload.resource_type === "chapter") {
      const Cite = window.AssistantCiteCore;
      const parsed = Cite && Cite.parseChapterGuideKey ? Cite.parseChapterGuideKey(payload.resource_key) : null;
      if (!parsed) return false;
      const chapterCurrent = captureChapterTarget(bookId, parsed.chapter);
      if (!chapterCurrent()) return false;
      const guide = await window.LF_API.bookChapterGuide(bookId, parsed.chapter);
      // Check the frozen navigation before any detail/readiness mutation. A
      // return to the same book/chapter must not revive an earlier response.
      if (!canApply() || !chapterCurrent()) return false;
      const detail = window.CONSOLE_DATA.detail;
      if (!refreshVersionAllowed(guide, {version: detail && detail._resourceVersion})) return false;
      if (!applyChapterGuide(bookId, parsed.chapter, guide)) return false;
    } else {
      return false;
    }
    if (!canApply()) return false;
    rerender();
    return true;
  }

  async function refreshAssistantPlanningDisplay(bookId, payload, shouldApply) {
    const Cite = window.AssistantCiteCore;
    const createTarget = captureCreateDataTarget(bookId);
    const current = () => shouldApply() && createDataTargetIsCurrent(createTarget);
    const capture = key => Cite.editGuard.capture({book_id:bookId, resource_type:payload.resource_type, resource_key:key});
    const freshVersion = (incoming, existing) => Number.isInteger(incoming) && incoming >= 0
      && (existing == null || incoming >= Number(existing));
    if (payload.resource_type === "outline") {
      const parsed = Cite.parseOutlineKey(payload.resource_key);
      if (!parsed) return false;
      const guards = {volume:capture("volume:"+parsed.volume), near_term:capture("near_term:"+parsed.volume)};
      if (!guards.volume && !guards.near_term) return false;
      const [volume, nearTerm] = await Promise.all([
        window.LF_API.bookVolumeOutline(bookId, parsed.volume),
        window.LF_API.bookNearTermOutline(bookId, parsed.volume)
      ]);
      if (!current()) return false;
      const snapshot = window.LF_PORTAL_STATE;
      const previous = Array.isArray(snapshot.outlines) ? snapshot.outlines : [];
      const responses = {volume, near_term:nearTerm};
      const allowed = new Set(["volume", "near_term"].filter(kind => {
        const old = previous.find(row => row.type === kind && outlineVolumeNumber(row) === parsed.volume);
        return guards[kind] && guards[kind]() && freshVersion(responses[kind] && responses[kind].version, old && old.version);
      }));
      if (!allowed.size) return false;
      snapshot.outlines = previous.filter(row => !(allowed.has(row.type) && outlineVolumeNumber(row) === parsed.volume));
      allowed.forEach(kind => snapshot.outlines.push(Object.assign({}, responses[kind], {type:kind, volume_number:parsed.volume})));
      patchSnapshot({outlines:snapshot.outlines});
      const visibleVolume = outlineVolumeForChapter(currentPortalSelection().chapterNumber, window.CONSOLE_DATA.chapters, snapshot.outlines);
      if (visibleVolume === parsed.volume) applyOutline(allowed.has("volume") ? volume : null, allowed.has("near_term") ? nearTerm : null);
      publishOutlinePackage(bookId, parsed.volume, volume, nearTerm, allowed);
      invalidate({book:bookId});
      rerender();
      return true;
    }
    const guard = capture(payload.resource_key);
    const canApply = () => current() && guard && guard();
    if (!canApply()) return false;
    if (payload.resource_type === "book") {
      const result = await refreshStructuredRewriteDisplay(bookId, payload, canApply);
      invalidate({book:bookId});
      return result;
    }
    const parsed = Cite.parseChapterGuideKey(payload.resource_key);
    if (!parsed || !chapterTargetIsCurrent(bookId, parsed.chapter)) return false;
    const guide = await window.LF_API.bookChapterGuide(bookId, parsed.chapter);
    if (!canApply() || !chapterTargetIsCurrent(bookId, parsed.chapter)) return false;
    const detail = window.CONSOLE_DATA.detail;
    if (!freshVersion(guide && guide.version, detail && detail._resourceVersion)) return false;
    if (!applyChapterGuide(bookId, parsed.chapter, guide)) return false;
    const raw = contentObject(guide && guide.guide);
    const title = raw && typeof raw.title === "string" ? raw.title.trim() : "";
    if (title) {
      const chapter = (window.CONSOLE_DATA.chapters || []).find(row => Number(row.no) === parsed.chapter);
      if (chapter) chapter.title = zhEn(title);
      const snapshot = window.LF_PORTAL_STATE;
      (snapshot.chapters || []).forEach(row => {if (Number(row.chapter_number) === parsed.chapter) row.title = title;});
      if (snapshot.chapter && Number(snapshot.chapter.chapter_number) === parsed.chapter) snapshot.chapter.title = title;
      patchSnapshot({chapters:snapshot.chapters});
    }
    invalidate({book:bookId, chapter:[bookId, parsed.chapter]});
    rerender();
    return true;
  }

  function chapterStagePayload(chapterNumber, executionMode, options) {
    var opts = options || {};
    var payload = Object.assign({
      chapter_number: chapterNumber,
      execution_mode: executionMode
    }, opts.payload || {});
    // The prose root carries the selected writer as server continuation input.
    if (opts.writerType && (executionMode === "writer_group" || executionMode === "full"
      || (opts.chain && opts.chain.kind === "prose"))) {
      payload.writer_type = opts.writerType;
    }
    if (opts.chain) payload.chapter_chain = opts.chain;
    return payload;
  }

  function nestCreateQuoteToken(createPayload, token) {
    var next = createPayload || {};
    if (!token) return next;
    var bookData = window.LF_BOOK_DATA_VOLUME;
    if (bookData && typeof bookData.attachQuoteToken === "function") {
      return bookData.attachQuoteToken(next, { quoteToken: token });
    }
    next.request_payload = Object.assign({}, next.request_payload || {}, { quote_token: token });
    if (Object.prototype.hasOwnProperty.call(next, "quote_token")) delete next.quote_token;
    return next;
  }

  async function quotedCreateEngineTask(payload, idempotencyKey, quoteOpts) {
    var opts = Object.assign({confirmation: {}}, quoteOpts || {});
    var next = payload;
    var bookData = window.LF_BOOK_DATA_VOLUME;
    if (bookData && typeof bookData.preparePaidCreate === "function") {
      next = await bookData.preparePaidCreate(payload, opts);
    }
    try {
      return await window.LF_API.createEngineTask(next, idempotencyKey);
    } catch (error) {
      if (!bookData || !bookData.isStaleQuoteError || !bookData.isStaleQuoteError(error) || opts._staleRetried) {
        if (bookData && bookData.isStaleQuoteError && bookData.isStaleQuoteError(error)) error.preserveDrafts = true;
        throw error;
      }
      error.preserveDrafts = true;
      var bookId = next && (next.book_link_id || next.book_id);
      var refreshed = bookData.updatedQuoteFromError && bookData.updatedQuoteFromError(error);
      if (!refreshed || !refreshed.quoteToken) {
        refreshed = await bookData.requestQuote(bookId, bookData.quoteRequestFromPayload(next, opts));
      }
      var accepted = await bookData.confirmQuote(refreshed, {reason: "stale", bookId: bookId, confirmation: opts.confirmation});
      if (!accepted) throw bookData.cancelledError();
      return quotedCreateEngineTask(
        bookData.attachQuoteToken(payload, refreshed),
        idempotencyKey,
        Object.assign({}, opts, { quote: refreshed, _staleRetried: true })
      );
    }
  }

  async function quotedStartRewrite(bookId, payload, quoteOpts) {
    var opts = Object.assign({confirmation: {}}, quoteOpts || {});
    const assertCurrent = () => {
      if (opts.isCurrent && !opts.isCurrent()) {
        const error = new Error(window.CLANG === "en" ? "Chapter target changed." : "章节目标已变化，请重新打开目标章节。");
        error.code = "navigation_target_changed";
        error.preserveDrafts = true;
        throw error;
      }
    };
    assertCurrent();
    var next = payload || {};
    var bookData = window.LF_BOOK_DATA_VOLUME;
    if (bookData && typeof bookData.preparePaidCreate === "function") {
      var envelope = await bookData.preparePaidCreate({
        book_link_id: bookId,
        task_type: "field_rewrite",
        request_payload: next,
        quote_token: next.quote_token
      }, Object.assign({
        spec: { task_type: "field_rewrite" }
      }, opts));
      next = Object.assign({}, next);
      var rewriteToken = bookData && bookData.quoteTokenOf
        ? bookData.quoteTokenOf(envelope)
        : (envelope && (envelope.quote_token || (envelope.request_payload && envelope.request_payload.quote_token)));
      if (rewriteToken) next.quote_token = rewriteToken;
    }
    assertCurrent();
    try {
      return await window.LF_API.startRewrite(bookId, next);
    } catch (error) {
      if (!bookData || !bookData.isStaleQuoteError || !bookData.isStaleQuoteError(error) || opts._staleRetried) {
        if (bookData && bookData.isStaleQuoteError && bookData.isStaleQuoteError(error)) error.preserveDrafts = true;
        throw error;
      }
      error.preserveDrafts = true;
      var refreshed = bookData.updatedQuoteFromError && bookData.updatedQuoteFromError(error);
      if (!refreshed || !refreshed.quoteToken) {
        refreshed = await bookData.requestQuote(bookId, { task_type: "field_rewrite" });
      }
      var accepted = await bookData.confirmQuote(refreshed, {reason: "stale", bookId: bookId, confirmation: opts.confirmation});
      if (!accepted) throw bookData.cancelledError();
      return quotedStartRewrite(
        bookId,
        bookData.attachQuoteToken(next, refreshed),
        Object.assign({}, opts, { quote: refreshed, _staleRetried: true })
      );
    }
  }

  async function submitChapterStageTask(bookId, chapterNumber, executionMode, options) {
    var opts = options || {};
    var readiness = opts.readiness || await window.LF_API.productionReadiness(
      bookId,
      "chapter_generate",
      executionMode,
      chapterNumber
    );
    if (!readiness || readiness.ready !== true) {
      var readinessDetail = {
        error: "prerequisite_missing",
        message: (readiness && readiness.message) || "当前资料不完整，暂时不能执行。",
        details: readiness || {}
      };
      var readinessError = new Error(errorText(readinessDetail, "当前资料不完整，暂时不能执行。"));
      readinessError.status = 409;
      readinessError.body = { detail: readinessDetail };
      readinessError.detail = readinessDetail;
      throw readinessError;
    }
    var createPayload = {
      book_link_id: bookId,
      task_type: "chapter_draft",
      request_payload: chapterStagePayload(chapterNumber, executionMode, opts),
      run_immediately: true
    };
    createPayload = nestCreateQuoteToken(createPayload, opts.quoteToken);
    var task = await quotedCreateEngineTask(createPayload, opts.idempotencyKey, {
      quote: opts.quote,
      writerType: opts.writerType
    });
    rememberPortalTask(task);
    if ((executionMode === "writer_group" || executionMode === "full")
      && window.LF_CREATION_ANALYTICS) {
      window.LF_CREATION_ANALYTICS.submitted("submit_prose");
    }
    return task;
  }

  async function followChapterChainSuccessor(completed, expectedChain, onProgress) {
    var chain = taskChapterChain(completed) || expectedChain;
    if (!chain || Number(chain.step) !== 0 || Number(chain.total) !== 2) return completed;

    var deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      var root = await window.LF_API.engineTask(completed.id);
      var chainResult = root && root.result_cache && root.result_cache.chapter_chain;
      var nextTaskId = chainResult && chainResult.next_task_id;
      if (nextTaskId) {
        var successor = await window.LF_API.engineTask(nextTaskId);
        rememberPortalTask(successor);
        var successorResult = await awaitEngineTask(successor, onProgress);
        return successorResult && successorResult.task ? successorResult.task : successor;
      }
      await new Promise(function (resolve) { setTimeout(resolve, 750); });
    }
    throw new Error("章节后续任务尚未启动，请稍后重试");
  }

  function mapLedgerStatus(value, paid, advancing, planted) {
    const raw = String(value || "").toLowerCase();
    if (/pay|resolv|close|done|complete|settled/.test(raw)) return paid;
    if (/advanc|progress/.test(raw)) return advancing;
    return planted;
  }

  function mapHookLedger(item) {
    if (!item || typeof item !== "object") return null;
    item = Object.assign({}, contentObject(item.content), item);
    return {
      id: String(item.item_id || item.id || ""),
      t: zhEn(item.title || item.description || item.t || ""),
      status: mapLedgerStatus(item.status, "paid", "advancing", "planted"),
      planted: String(item.chapter_created || item.planted || item.planted_chapter || item.origin_chapter || ""),
      last: String(item.last_advanced || item.last || item.last_chapter || item.updated_chapter || ""),
      payoff: zhEn(item.expected_payoff || item.payoff || ""),
      trail: Array.isArray(item.trail) ? item.trail.map(String) : []
    };
  }

  function mapDebtLedger(item) {
    if (!item || typeof item !== "object") return null;
    item = Object.assign({}, contentObject(item.content), item);
    return {
      from: zhEn(item.from || item.creditor || ""),
      to: zhEn(item.to || item.debtor || ""),
      t: zhEn(item.title || item.description || item.t || ""),
      status: mapLedgerStatus(item.status, "settled", "progress", "open"),
      incur: String(item.chapter_created || item.incur || item.chapter || item.origin_chapter || "")
    };
  }

  function refreshVersionAllowed(incoming, previous) {
    const before = previous && previous.version;
    const after = incoming && incoming.version;
    if (before == null) return after == null || (Number.isInteger(Number(after)) && Number(after) >= 0);
    return after != null && Number.isInteger(Number(after)) && Number(after) >= Number(before);
  }

  function patchBookCacheFields(bookId, patch) {
    if (!bookId || !patch) return;
    const hit = bookCache.get(String(bookId)) || bookCache.get(bookId);
    if (!hit || !hit.data) return;
    Object.assign(hit.data, patch);
  }

  function patchChapterCacheFields(bookId, chapterNumber, patch) {
    if (!bookId || !chapterNumber || !patch) return;
    const key = switchCacheKey(bookId, chapterNumber);
    const hit = chapterCache.get(key);
    const data = Object.assign({}, hit && hit.data, patch);
    chapterCache.set(key, { data: data, ts: hit ? hit.ts : 0 });
  }

  function liveSnapshotForBook(bookId) {
    const snapshot = window.LF_PORTAL_STATE;
    if (!snapshot || String(snapshot.selectedBookId || "") !== String(bookId || "")) return null;
    return snapshot;
  }

  function existingCharacterCount(bookId) {
    const live = liveSnapshotForBook(bookId);
    const loaded = live && Array.isArray(live.characters) ? live.characters.length : 0;
    const data = window.CONSOLE_DATA;
    const rendered = data && data.book && String(data.book.id || "") === String(bookId || "")
      && data.create && Array.isArray(data.create.cast) ? data.create.cast.length : 0;
    return Math.max(loaded, rendered);
  }

  function persistLiveSnapshot(snapshot) {
    if (!snapshot) return;
    try { persistSnapshot(snapshot); } catch (error) {}
  }

  let resourceRefreshController = null;
  function portalResourceRefresh() {
    const factory = window.LF_PORTAL_RESOURCE_REFRESH;
    if (!factory || typeof factory.create !== "function") return null;
    if (resourceRefreshController) return resourceRefreshController;
    const freshChapterLists = new Map();
    const citeGuard = function (identity) {
      const Cite = window.AssistantCiteCore;
      if (!Cite || !Cite.editGuard || typeof Cite.editGuard.capture !== "function") return function allow() { return true; };
      if (identity && identity.resource_key === "*") {
        const names = ((window.CONSOLE_DATA.create && window.CONSOLE_DATA.create.cast) || [])
          .map(function (character) {
            return character && (character.rawName || (character.name && character.name.zh) || "");
          })
          .filter(Boolean);
        const checks = names.map(function (name) {
          const captured = Cite.editGuard.capture({
            book_id: identity.book_id,
            resource_type: "character",
            resource_key: name
          });
          return captured || function blocked() { return false; };
        });
        if (!checks.length) return function allow() { return true; };
        return function () { return checks.every(function (check) { return check(); }); };
      }
      const captured = Cite.editGuard.capture(identity);
      return captured || function blocked() { return false; };
    };
    resourceRefreshController = factory.create({
      getSelection: currentPortalSelection,
      getUserId: () => window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id,
      captureCreateTarget: captureCreateDataTarget,
      isCreateTargetCurrent: createDataTargetIsCurrent,
      captureEdit: citeGuard,
      onSync(plan, result) {
        plan.reads.filter(read => read.kind === "chapter_guide").forEach(read => {
          const key = switchCacheKey(read.bookId, read.chapterNumber);
          if (result.reading) guideSyncEpochs.set(key, plan.syncSequence);
          if (guideSyncEpochs.get(key) !== plan.syncSequence) return;
          const failed = (result.failed || []).find(item => item.read.kind === "chapter_guide");
          const applied = (result.applied || []).some(item => item.kind === "chapter_guide");
          const skipped = (result.skipped || []).some(item => item.kind === "chapter_guide");
          notifyGuideSync(read.bookId, read.chapterNumber, applied ? "ready"
            : failed ? (failed.error && (failed.error.status === 404 || failed.error.code === "chapter_guide_empty") ? "missing" : "failed")
            : skipped ? "skipped" : "pending", plan.taskCompleted, result.reading);
        });
      },
      captureNavigation: function () {
        const Cite = window.AssistantCiteCore;
        if (!Cite || !Cite.editGuard || typeof Cite.editGuard.captureNavigation !== "function") {
          return function allow() { return true; };
        }
        const capture = Cite.editGuard.captureRefresh || Cite.editGuard.captureNavigation;
        const captured = capture.call(Cite.editGuard);
        const selectionEpoch = loadSeq, targetEpoch = chapterTargetEpoch;
        return function () { return selectionEpoch === loadSeq && targetEpoch === chapterTargetEpoch && !!captured && captured(); };
      },
      fetchTaskDetail: function (id) { return window.LF_API.engineTask(id); },
      async read(kind, spec) {
        const bookId = spec && spec.bookId;
        const chapterNumber = spec && spec.chapterNumber;
        const volumeNumber = spec && spec.volumeNumber;
        if (kind === "world") return window.LF_API.bookWorld(bookId);
        if (kind === "world_dimension") return window.LF_API.bookWorldDimension(bookId, spec.dimension);
        if (kind === "characters") return fetchFullCharacters(bookId, { strict: true });
        if (kind === "character") {
          const current = liveSnapshotForBook(bookId);
          const cached = bookCache.get(String(bookId));
          const previous = normalizeList(current && current.characters || cached && cached.data && cached.data.characters);
          const nameOf = item => String(item && (item.name || contentObject(item).name) || "");
          const list = normalizeList(await window.LF_API.bookCharacters(bookId));
          const detail = await window.LF_API.bookCharacter(bookId, spec.name);
          const next = await mapWithConcurrency(list, CHARACTER_DETAIL_CONCURRENCY, async item => {
            const name = nameOf(item);
            if (name === String(spec.name)) return detail;
            const old = previous.find(row => nameOf(row) === name);
            if (old) return Object.assign({}, old, item, old.content ? { content: old.content } : {});
            return name ? window.LF_API.bookCharacter(bookId, name) : item;
          });
          if (!next.some(item => nameOf(item) === String(spec.name))) next.push(detail);
          return next;
        }
        if (kind === "story_plan") return window.LF_API.bookStoryPlan(bookId);
        if (kind === "style_profile") return window.LF_API.bookStyleProfile(bookId);
        if (kind === "outline_pair") {
          if (volumeNumber) {
            const [volume, nearTerm] = await Promise.all([
              window.LF_API.bookVolumeOutline(bookId, volumeNumber),
              window.LF_API.bookNearTermOutline(bookId, volumeNumber)
            ]);
            return { volume, nearTerm, volumeNumber };
          }
          const [volume, nearTerm] = await Promise.all([
            window.LF_API.bookVolumeOutlineLatest(bookId),
            window.LF_API.bookNearTermOutlineLatest(bookId)
          ]);
          return {
            volume: volume,
            nearTerm: nearTerm,
            volumeNumber: outlineVolumeNumber(volume) || outlineVolumeNumber(nearTerm) || 0
          };
        }
        if (kind === "outlines") return window.LF_API.bookOutlines(bookId);
        if (kind === "chapter_body") return window.LF_API.bookChapter(bookId, chapterNumber);
        if (kind === "chapter_guide") {
          const guide = await window.LF_API.bookChapterGuide(bookId, chapterNumber);
          if (!guideIdentityMatches(guide, chapterNumber)) throw new Error("Chapter guide identity mismatch");
          if (!readableGuide(guide)) {
            const missing = new Error("Chapter guide is empty");
            missing.code = "chapter_guide_empty";
            throw missing;
          }
          return guide;
        }
        if (kind === "chapter_world") return window.LF_API.bookChapterWorld(bookId, chapterNumber);
        if (kind === "chapters") return window.LF_API.bookChapters(bookId, true);
        if (kind === "hooks") return window.LF_API.bookHooks(bookId);
        if (kind === "debts") return window.LF_API.bookDebts(bookId);
        if (kind === "billing") return window.LF_API.billing();
        if (kind === "books") return window.LF_API.books();
        return null;
      },
      async apply(kind, spec, value, ctx) {
        const allowDisplay = !!(ctx && ctx.allowDisplay);
        const bookId = spec && spec.bookId;
        const chapterNumber = spec && spec.chapterNumber;
        const snapshot = liveSnapshotForBook(bookId);
        if (kind === "billing") {
          if (window.LF_PORTAL_STATE) window.LF_PORTAL_STATE.billing = value;
          if (accountCache.data) accountCache.data.billing = value;
          persistLiveSnapshot(window.LF_PORTAL_STATE);
          return true;
        }
        if (kind === "books") {
          const books = normalizeList(value);
          if (accountCache.data) accountCache.data.books = books;
          const live = window.LF_PORTAL_STATE;
          if (live) {
            live.books = books;
            persistLiveSnapshot(live);
            updateShelfText(live);
            if (Array.isArray(books) && live.selectedBookId) {
              window.CONSOLE_DATA.shelf = books
                .map(function (book, index) { return shelfCard(book, index, live.selectedBookId); })
                .concat(newBookCard());
              const selected = books.find(function (book) { return book.id === live.selectedBookId; });
              if (selected && window.CONSOLE_DATA.book) {
                // The chapter directory owns current-book statistics. The
                // lighter book-list response can lag the just-refreshed rows.
                if (Array.isArray(live.chapters)) {
                  window.CONSOLE_DATA.book.chap = live.chapters.reduce(function (max, chapter) {
                    return Math.max(max, Number(chapter.chapter_number) || 0);
                  }, 0);
                  window.CONSOLE_DATA.book.words = formatWords(live.chapters.reduce(function (total, chapter) {
                    return total + (Number(chapter.word_count) || 0);
                  }, 0));
                } else {
                  window.CONSOLE_DATA.book.chap = selected.current_chapter || selected.chapter_count || 0;
                  window.CONSOLE_DATA.book.words = formatWords(selected.word_count || selected.words || 0);
                }
              }
            }
          }
          return true;
        }
        if (kind === "world") {
          patchBookCacheFields(bookId, { world: value });
          if (snapshot) { snapshot.world = value; persistLiveSnapshot(snapshot); }
          if (allowDisplay) applyWorld({ world: value });
          return true;
        }
        if (kind === "world_dimension") {
          const source = snapshot && snapshot.world || {};
          const dimensions = Object.assign({}, source.dimensions || source.world && source.world.dimensions || source.world || {});
          if (!refreshVersionAllowed(value, dimensions[spec.dimension])) return false;
          dimensions[spec.dimension] = value;
          const world = Object.assign({}, source, { dimensions });
          patchBookCacheFields(bookId, { world });
          if (snapshot) { snapshot.world = world; persistLiveSnapshot(snapshot); }
          const mapped = mapWorldDimension(spec.dimension, value);
          if (allowDisplay && mapped) {
            window.CONSOLE_DATA.create.worldDims = mergeWorldDimensionItems(window.CONSOLE_DATA.create.worldDims, mapped);
            updateCreateStats();
          }
          return true;
        }
        if (kind === "characters" || kind === "character") {
          const oldCharacters = normalizeList(snapshot && snapshot.characters);
          const characters = normalizeList(value).map(item => {
            const old = oldCharacters.find(row => row.name === item.name);
            return refreshVersionAllowed(item, old) ? item : old;
          });
          patchBookCacheFields(bookId, { characters: characters });
          if (snapshot) { snapshot.characters = characters; persistLiveSnapshot(snapshot); }
          if (allowDisplay) applyCharacters({ characters: characters });
          return true;
        }
        if (kind === "story_plan") {
          if (!refreshVersionAllowed(value, snapshot && snapshot.storyPlan)) return false;
          patchBookCacheFields(bookId, { storyPlan: value });
          if (snapshot) { snapshot.storyPlan = value; persistLiveSnapshot(snapshot); }
          if (allowDisplay) applyStoryPlan({ storyPlan: value });
          return true;
        }
        if (kind === "style_profile") {
          if (allowDisplay && window.CONSOLE_DATA.create) {
            window.CONSOLE_DATA.create.styleProfile = contentObject(value);
          }
          return true;
        }
        if (kind === "outlines") {
          const previous = normalizeList(snapshot && snapshot.outlines);
          const outlines = normalizeList(value).map(row => {
            const old = previous.find(item => item.type === row.type && outlineVolumeNumber(item) === outlineVolumeNumber(row));
            return refreshVersionAllowed(row, old) ? row : old;
          });
          patchBookCacheFields(bookId, { outlines: outlines });
          if (snapshot) { snapshot.outlines = outlines; persistLiveSnapshot(snapshot); }
          if (allowDisplay) applyOutlineForChapter(currentPortalSelection().chapterNumber, outlines);
          return true;
        }
        if (kind === "outline_pair") {
          if (!snapshot) return false;
          const pair = value || {};
          const volume = pair.volume;
          const nearTerm = pair.nearTerm;
          const volumeNumber = pair.volumeNumber || outlineVolumeNumber(volume) || outlineVolumeNumber(nearTerm);
          if (!volumeNumber) return false;
          const previous = Array.isArray(snapshot.outlines) ? snapshot.outlines : [];
          const responses = { volume, near_term: nearTerm };
          const allowed = new Set(["volume", "near_term"].filter(type => {
            const old = previous.find(row => row.type === type && outlineVolumeNumber(row) === volumeNumber);
            return responses[type] && refreshVersionAllowed(responses[type], old)
              && (!ctx.canApplyResource || ctx.canApplyResource({ book_id: bookId,
                resource_type: "outline", resource_key: type + ":" + volumeNumber }));
          }));
          if (!allowed.size) return false;
          snapshot.outlines = previous.filter(row => !(allowed.has(row.type) && outlineVolumeNumber(row) === volumeNumber));
          allowed.forEach(type => snapshot.outlines.push(Object.assign({}, responses[type], { type, volume_number: volumeNumber })));
          const visibleVolume = outlineVolumeForChapter(currentPortalSelection().chapterNumber,
            window.CONSOLE_DATA.chapters, snapshot.outlines);
          const patch = { outlines: snapshot.outlines };
          if (!visibleVolume || visibleVolume === volumeNumber) {
            if (allowed.has("volume")) patch.volumeOutline = volume;
            if (allowed.has("near_term")) patch.nearTermOutline = nearTerm;
          }
          Object.assign(snapshot, patch);
          patchBookCacheFields(bookId, patch);
          persistLiveSnapshot(snapshot);
          if (allowDisplay) {
            if (!visibleVolume || visibleVolume === volumeNumber) {
              applyOutline(allowed.has("volume") ? volume : null, allowed.has("near_term") ? nearTerm : null);
            }
            applyChapters(snapshot, { skipProse: true });
            publishOutlinePackage(bookId, volumeNumber, volume, nearTerm, allowed);
          }
          return true;
        }
        if (kind === "chapters") {
          const previous = normalizeList(snapshot && snapshot.chapters);
          const chapters = normalizeList(value).map(row => {
            const old = previous.find(item => Number(item.chapter_number) === Number(row.chapter_number));
            return refreshVersionAllowed(row, old) ? row : old;
          });
          freshChapterLists.set(String(bookId), chapters);
          patchBookCacheFields(bookId, { chapters: chapters });
          reconcileChapterCache(bookId, chapters);
          if (snapshot) {
            snapshot.chapters = chapters;
            persistLiveSnapshot(snapshot);
          }
          if (allowDisplay) {
            applyChapters({
              selectedBookId: bookId,
              selectedChapter: currentPortalSelection().chapterNumber,
              chapters: chapters,
              outlines: snapshot && snapshot.outlines,
              volumeOutline: snapshot && snapshot.volumeOutline,
              nearTermOutline: snapshot && snapshot.nearTermOutline
            }, { skipProse: true });
          }
          return true;
        }
        if (kind === "chapter_body" || kind === "chapter_guide" || kind === "chapter_world") {
          const oldHit = chapterCache.get(switchCacheKey(bookId, chapterNumber));
          const oldBundle = oldHit && oldHit.data || {};
          if (kind === "chapter_guide") {
            const detail = window.CONSOLE_DATA.detail;
            const visible = detailTargetMatches(detail, bookId, chapterNumber)
              ? { version: detail._resourceVersion } : null;
            if (!refreshVersionAllowed(value, oldBundle.guide) || !refreshVersionAllowed(value, visible)) return false;
          }
          if (kind === "chapter_world" && !refreshVersionAllowed(value, oldBundle.world)) return false;
          if (kind === "chapter_body") {
            const prose = window.CONSOLE_DATA && window.CONSOLE_DATA.prose;
            const visibleBody = prose && String(prose._bookId || "") === String(bookId || "")
              && Number(prose.no) === Number(chapterNumber)
              // The display mapper uses zero when legacy responses omit a
              // version; that sentinel is not authoritative version evidence.
              && Number(prose.version) > 0
              ? { version: prose.version } : null;
            if (!refreshVersionAllowed(value, oldBundle.chapter) || !refreshVersionAllowed(value, visibleBody)) {
              return false;
            }
          }
          const bundle = {};
          if (kind === "chapter_body") bundle.chapter = value;
          if (kind === "chapter_guide") bundle.guide = value;
          if (kind === "chapter_world") bundle.world = value;
          if (kind === "chapter_body") {
            const list = freshChapterLists.get(String(bookId))
              || (snapshot && Array.isArray(snapshot.chapters) ? snapshot.chapters : null)
              || ((bookCache.get(String(bookId)) || {}).data || {}).chapters;
            const row = Array.isArray(list) ? list.find(function (chapter) {
              return Number(chapter && chapter.chapter_number) === Number(chapterNumber);
            }) : null;
            if (row && chapterIdentityChanged(row, value)) return false;
          }
          patchChapterCacheFields(bookId, chapterNumber, bundle);
          if (kind === "chapter_body" && snapshot && Number(snapshot.selectedChapter) === Number(chapterNumber)) {
            snapshot.chapter = value;
            persistLiveSnapshot(snapshot);
          }
          if (allowDisplay) applyChapterBundle(bookId, chapterNumber, bundle);
          return true;
        }
        if (kind === "hooks" || kind === "debts") {
          if (allowDisplay && window.CONSOLE_DATA.world) {
            if (kind === "hooks") {
              window.CONSOLE_DATA.world.foreshadows = normalizeList(value).map(mapHookLedger).filter(Boolean);
            } else {
              window.CONSOLE_DATA.world.debts = normalizeList(value).map(mapDebtLedger).filter(Boolean);
            }
          }
          return true;
        }
        return false;
      },
      markStale(read) {
        if (!read) return;
        if (read.kind === "billing" || read.kind === "books") {
          if (accountCache.data) accountCache.ts = 0;
          return;
        }
        if (read.kind === "chapter_body" || read.kind === "chapter_guide" || read.kind === "chapter_world") {
          const hit = chapterCache.get(switchCacheKey(read.bookId, read.chapterNumber));
          if (hit) hit.ts = 0;
          return;
        }
        if (read.bookId) {
          const hit = bookCache.get(String(read.bookId));
          if (hit) hit.ts = 0;
        }
      },
      invalidateReads(reads) {
        (Array.isArray(reads) ? reads : []).forEach(function (read) {
          if (!read) return;
          if (read.kind === "billing") {
            if (accountCache.data) accountCache.data.billing = null;
            return;
          }
          if (read.kind === "books") {
            if (accountCache.data) accountCache.ts = 0;
            return;
          }
          if (read.kind === "chapter_body" || read.kind === "chapter_guide" || read.kind === "chapter_world") {
            if (read.bookId && read.chapterNumber) invalidate({ chapter: [read.bookId, read.chapterNumber] });
            return;
          }
          if (read.bookId) {
            const hit = bookCache.get(String(read.bookId));
            if (hit) hit.ts = 0;
          }
        });
      },
      invalidateBook(bookId, opts) {
        invalidate({ book: bookId, allChapters: opts && opts.allChapters ? bookId : null });
      },
      reloadBook(bookId, chapterNumber) {
        return loadBook(bookId, { refreshAccount: false, selectedChapter: chapterNumber });
      },
      rerender: rerender
    });
    return resourceRefreshController;
  }

  window.LF_PORTAL = {
    load: loadPortalSnapshot,
    loadBook,
    // Resolves once the bootstrap snapshot load settles — resume logic must not
    // make stage decisions (start/skip/attach) before tasks are known.
    ready() { return portalReadyPromise || Promise.resolve(false); },
    // Refresh only the account level (billing/credits/unread/...) and merge it
    // into the live snapshot. Called after billing writes (redeem/upgrade/buy):
    // BillingPanel reloads its own view, but the portal-wide balance/badge reads
    // the snapshot's account fields, which this brings up to date.
    async refreshAccount() {
      invalidate({ account: true });
      const account = await fetchAccount();
      if (!account) return false;
      const merged = Object.assign({}, window.LF_PORTAL_STATE || {}, account);
      const ok = applySnapshot(merged);
      persistSnapshot(merged);
      if (ok) rerender();
      return ok;
    },
    applySnapshot,
    persistSnapshot,
    resetCreateData: resetPortalCreateData,
    clearPhaseData,
    updateCreateStats,
    setCreateDataLocked,
    fieldLabel,
    chapterTitleMissing,
    // Build display blocks (with .key) from an arbitrary content object — used by
    // the shared editor for resources that lack a pre-mapped block list (e.g. cast).
    contentBlocks(content, skipKeys) {
      const skip = new Set(skipKeys || ["id", "book_id", "resource_type", "resource_key", "revision_id", "base_version", "version", "status", "created_at", "updated_at", "name", "role", "identity", "summary", "description", "profile", "type", "essence", "true_name"]);
      const obj = contentObject(content);
      if (!obj || typeof obj !== "object") return [];
      return Object.entries(obj)
        .filter(([k, v]) => !skip.has(k) && v != null && typeof v !== "function")
        .map(([k, v]) => blockFromField(k, v))
        .filter((b) => b && (b.type !== "text" || b.v.zh || b.v.en));
    },
    mapCreate: {
      world: mapWorld,
      worldDimension: mapWorldDimension,
      worldDimensionLabel,
      worldDimensionAgent,
      cast: mapCharacters,
      story: mapStoryPlan,
      storySectionAgent,
      wsm: mapWsm,
      detail: mapDetail,
      outline: mapOutline,
      outlineVolumes: mapOutlineVolumes,
      outlineVolumeForChapter,
      mergeVolumeOutline,
      mergeArcOutline
    },
    worldDimensionKeys: Object.keys(dimensionMeta),
    storySectionKeys: STORY_SECTION_ORDER.slice(),
    bookCreationStage(bookId) {
      const order = ["world", "cast", "story", "outline"];
      const stepByPhase = { world: 1, cast: 2, story: 3, outline: 4 };
      const phases = {};
      const done = {};
      const running = {};
      const failed = {};
      order.forEach((phase) => {
        phases[phase] = creationPhaseTaskState(bookId, phase);
        done[phase] = phases[phase].done;
        running[phase] = phases[phase].running;
        failed[phase] = phases[phase].failed;
      });
      const tasksKnown = order.every((phase) => phases[phase].known);
      const newestPhase = (candidates) => candidates.slice().sort((left, right) =>
        taskNewestFirst(phases[left].latestTask, phases[right].latestTask))[0] || null;
      const activePhase = newestPhase(order.filter((phase) => running[phase]));
      const failedPhase = newestPhase(order.filter((phase) => failed[phase]));
      const firstIncomplete = order.find((phase) => !done[phase]);
      const resumePhase = activePhase || firstIncomplete || null;
      return {
        phases,
        tasksKnown,
        done,
        running,
        failed,
        complete: !firstIncomplete,
        activePhase,
        activeStep: activePhase ? stepByPhase[activePhase] : null,
        failedPhase,
        failedStep: failedPhase ? stepByPhase[failedPhase] : null,
        resumePhase,
        // Active generation takes recovery focus; otherwise use the first phase
        // whose latest attempt is not completed. Step 5 is the ready screen.
        resumeStep: resumePhase ? stepByPhase[resumePhase] : 5
      };
    },
    // 续建向导时若本地没有 lf_create_progress（换了浏览器/清了缓存/换了书），
    // 从门户 book 表反推立意表单，回填到 PremiseStep——立意页面不再是空的。
    // 建书时 worldType 拼进 genre 的【题材类型】分块，其余三项各有专用列。
    premiseFromBook(bookId) {
      const state = window.LF_PORTAL_STATE;
      const books = state && Array.isArray(state.books) ? state.books : [];
      const book = books.find((b) => b && b.id === bookId);
      if (!book) return null;
      const splitList = (s) => String(s || "").split(/[，,、]/).map((x) => x.trim()).filter(Boolean);
      const parts = parseGenreParts(book);
      const findPart = (labelZh) => {
        const p = parts.find((x) => x.label && x.label.zh === labelZh);
        return p && p.value ? p.value.zh || "" : "";
      };
      const lengthMap = { 短: 0, 中: 1, 长: 2 };
      const wordsMap = { "2000-2500": 0, "3000-4000": 1, "4000-5000": 2, "5000-6000": 3 };
      const lengthIdx = lengthMap[book.estimated_length];
      const wordsIdx = wordsMap[book.words_per_chapter];
      return {
        bookId: book.id,
        bookTitle: typeof book.title === "string" ? book.title : "",
        idea: book.premise || book.subtitle || "",
        conflict: book.conflict || "",
        worldType: splitList(findPart("题材")),
        coreMech: splitList(book.core_mech),
        style: splitList(book.style),
        relationship: splitList(book.relationship),
        bookLength: lengthIdx != null ? lengthIdx : 1,
        bookWords: wordsIdx != null ? wordsIdx : 1
      };
    },
    findPhaseTask(bookId, kind, statuses) {
      const allowed = Array.isArray(statuses) && statuses.length ? statuses : ["queued", "running"];
      const phase = PHASE_BY_TASK_TYPE[kind] || kind;
      const latest = creationPhaseTaskState(bookId, phase).latestTask;
      return latest && allowed.includes(latest.status) ? latest : null;
    },
    // Re-attach to an already queued/running phase task (after back/next or a
    // page refresh) instead of creating a duplicate engine task.
    async attachPhase(bookId, kind, options) {
      const task = window.LF_PORTAL.findPhaseTask(bookId, kind);
      if (!task) return null;
      if (options && typeof options.onTask === "function") options.onTask(task);
      await awaitEngineTask(task, options && options.onProgress);
      return task;
    },
    // 切书复用已缓存的账户级快照(不再重拉 me/books/tasks/billing/...)。命中
    // bookCache 即时渲染书级数据,再按 SWR 校验所选章节;过期则后台 loadBook
    // 刷新。无账户上下文(冷启动/深链)时退回全量 loadPortalSnapshot。
    async selectBook(bookId, options) {
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      const captured = guard && guard.captureNavigation ? guard.captureNavigation() : () => true;
      const shouldApply = () => !!captured && captured()
        && !(options && options.shouldApply && !options.shouldApply());
      if (!shouldApply()) return false;
      const loadOptions = Object.assign({}, options || {}, { shouldApply });
      ++loadSeq;
      persistSelectedBook(bookId);
      clearPersistedChapterSelection();
      const prev = window.LF_PORTAL_STATE;
      if (!prev || !Array.isArray(prev.books)) return loadPortalSnapshot(loadOptions);
      const hit = bookCache.get(bookId);
      if (!hit) return loadBook(bookId, loadOptions);
      const n = renderBookFromCache(bookId, hit.data);
      // Book cache fresh but account invalidated (e.g. after a billing write) →
      // still revalidate so the account-level fields refresh within this switch.
      if (switchCacheStale(hit) || accountStale()) return loadBook(bookId, loadOptions);
      if (n >= 1) return window.LF_PORTAL.selectChapter(n, { isCurrent: shouldApply });
      return shouldApply();
    },
    // Engine admission recovery is a read-only synchronization boundary.
    // Refresh the selected book's authoritative resources, but never create or
    // resume a generation task from the availability transition itself.
    async refreshAfterEngineRecovery() {
      const selected = currentPortalSelection();
      if (!selected.bookId) return false;
      const refresh = portalResourceRefresh();
      if (!refresh) {
        invalidate({ book: selected.bookId });
        return loadBook(selected.bookId, {
          refreshAccount: false,
          selectedChapter: selected.chapterNumber
        });
      }
      const result = await refresh.refreshAfterRecovery(selected.bookId, selected.chapterNumber);
      return !!(result && result.ok);
    },
    // 切章只拉章级三件套(正文/细纲/世界状态机),账户级与书级一律走缓存,不再
    // 全量重拉。SWR:命中缓存即时渲染,过期/未命中再后台刷新。已生成章节在
    // 引擎不可达时保留屏幕内容；未生成的计划章节必须先切到对应空状态。
    chapterDetailSnapshot,
    chapterViewSnapshot,
    captureChapterTarget,
    chapterGuideSyncState(bookId, chapterNumber) {
      const state = guideSyncStates.get(switchCacheKey(bookId, chapterNumber));
      const taskCompleted = completedGuideTask(bookId, chapterNumber);
      const detail = chapterDetailSnapshot(bookId, chapterNumber);
      if (state) return Object.assign({}, state, {
        status: state.status === "ready" && detail._syncStatus !== "ready" ? "pending" : state.status,
        taskCompleted: !!(state.taskCompleted || taskCompleted)
      });
      return { bookId: String(bookId), chapterNumber: Number(chapterNumber), status: detail._syncStatus || "pending", taskCompleted };
    },
    async refreshChapterGuide(bookId, chapterNumber) {
      const refresh = portalResourceRefresh();
      if (!refresh) return { ok: false, pending: true };
      const Core = window.ChapterGuideStateCore;
      const state = window.LF_PORTAL_STATE || {};
      const targetCurrent = captureChapterTarget(bookId, chapterNumber);
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      const editCurrent = guard && (guard.captureRefresh || guard.captureNavigation).call(guard);
      const userId = state.me && state.me.id;
      const identityCurrent = () => targetCurrent()
        && String((window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me || {}).id) === String(userId);
      const isCurrent = () => identityCurrent() && (!guard || editCurrent && editCurrent());
      const skippedMetadata = () => ({ ok: false, pending: true, metadataSkipped: identityCurrent() });
      const taskState = Core && Core.taskState(state.tasks, bookId, chapterNumber, state.tasksKnown);
      // The real task-list API omits payload/result metadata. Hydrate only the
      // current completed world root; an unknown continuation never grants a
      // new generation. A root revision can reveal a server-stopped chain.
      if (isCurrent() && taskState && (taskState.unknown || taskState.waiting) && taskState.latest.id) {
        const original = taskState.latest;
        try {
          const task = await window.LF_API.engineTask(original.id);
          const latest = (window.LF_PORTAL_STATE.tasks || []).find(item => String(item.id) === String(original.id));
          if (!isCurrent()) return skippedMetadata();
          const detailUpdated = Date.parse(task && task.updated_at || '');
          const latestUpdated = Date.parse(latest && latest.updated_at || '');
          if (task && String(task.id) === String(original.id) && String(task.book_link_id) === String(bookId)
            && stageChapterNumber(task, null) === Number(chapterNumber)
            && latest && String(latest.updated_at || '') === String(original.updated_at || '')
            && (!Number.isFinite(detailUpdated) || !Number.isFinite(latestUpdated) || detailUpdated >= latestUpdated)
            && String(task.status).toLowerCase() === String(latest.status).toLowerCase()) rememberPortalTask(task);
        } catch (error) { if (!isCurrent()) return skippedMetadata(); }
      }
      if (!identityCurrent() || (!isCurrent() && editCurrent)) return skippedMetadata();
      const current = window.LF_PORTAL_STATE || {};
      const guideTaskKey = Core && Core.taskState(current.tasks, bookId, chapterNumber, current.tasksKnown).key;
      const result = await refresh.refreshWrite("chapter_guide", { bookId, chapterNumber });
      return Object.assign({}, result, { guideTaskKey });
    },
    async selectChapter(chapterNumber, options) {
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      const capture = guard && (guard.captureRefresh || guard.captureNavigation);
      const captured = capture ? capture.call(guard) : () => true;
      const isCurrent = () => !!captured && captured()
        && !(options && options.isCurrent && !options.isCurrent());
      if (!isCurrent()) return false;
      const previousTarget = currentPortalSelection();
      const seq = ++loadSeq;
      const n = Number(chapterNumber);
      if (!Number.isInteger(n) || n < 1) return false;
      const bookId = window.CONSOLE_DATA && window.CONSOLE_DATA.book && window.CONSOLE_DATA.book.id;
      if (!bookId) return loadPortalSnapshot();
      const hit = chapterCache.get(switchCacheKey(bookId, n));
      // Keep the existing editor and selection intact while reading. A user may
      // start a draft during this wait; no navigation/cache mutation may precede
      // the final guard check, and our own remount must not invalidate the read.
      const fetched = !hit || switchCacheStale(hit);
      const bundle = fetched ? await loadChapter(bookId, n) : hit.data;
      if (seq !== loadSeq || !isCurrent()
        || String(window.CONSOLE_DATA.book && window.CONSOLE_DATA.book.id) !== String(bookId)) return false;
      const selected = (window.CONSOLE_DATA.chapters || []).find(chapter => Number(chapter.no) === n);
      const bodyMatches = selected && ("chapter" in bundle) && !chapterIdentityChanged(selected, bundle.chapter);
      const applicable = bodyMatches || !("chapter" in bundle)
        ? bundle : Object.assign({}, bundle, { chapter: null });
      persistSelectedChapter(n);
      if (window.LF_PORTAL_STATE) window.LF_PORTAL_STATE.selectedChapter = n;
      applyOutlineForChapter(n, window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.outlines);
      const targetChanged = String(previousTarget.bookId || "") !== String(bookId || "")
        || Number(previousTarget.chapterNumber) !== n;
      if (targetChanged) resetChapterView(bookId, n);
      if (fetched && bodyMatches) chapterCache.set(switchCacheKey(bookId, n), { data: bundle, ts: Date.now() });
      applyChapterBundle(bookId, n, applicable);
      patchSnapshot({ selectedChapter: n, chapter: ("chapter" in applicable ? applicable.chapter : null) });
      rerender();
      return true;
    },
    // 某章是否已完成后验(回归校验)。已读取章节状态优先：
    //  1) 章节列表的 post_hoc_status === 'completed'（引擎权威）
    //  2) 未取得章节状态时才使用本会话已完成任务（chapterTaskState.postHocDone）——
    //     覆盖引擎章节状态滞后、刚定稿即想推进的情况。
    // no<1（无上一章）视为已满足。
    // One volume's outline and chapter plan from the loaded outlines, without changing the selection.
    // Null parts mean that volume has not been generated yet.
    volumeOutlineRow(volumeNumber) {
      const outlines = window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.outlines;
      if (!Array.isArray(outlines)) return null;
      const row = mapOutlineVolumes(outlines).find((item) => item.number === Number(volumeNumber));
      return row ? { volume: row.volume || null, nearTerm: row.nearTerm || null } : null;
    },
    chapterFinalized(bookId, no) {
      if (!no || no < 1) return true;
      var chaps = (window.CONSOLE_DATA && window.CONSOLE_DATA.chapters) || [];
      var c = chaps.find(function (x) { return Number(x.no) === Number(no); });
      if (c && Object.prototype.hasOwnProperty.call(c, "post_hoc_status")) return c.post_hoc_status === "completed";
      try {
        var st = window.LF_PORTAL.chapterTaskState(bookId, no);
        if (st && st.postHocDone) return true;
      } catch (e) {}
      return false;
    },
    async createBook(title, extra) {
      const book = await window.LF_API.createBook(Object.assign({ title }, extra || {}));
      persistSelectedBook(book.id);
      clearPersistedChapterSelection();
      await loadPortalSnapshot();
      return book;
    },
    async startWorldBuild(bookLinkId, payload) {
      const task = await quotedCreateEngineTask({
        book_link_id: bookLinkId,
        task_type: "world_build",
        request_payload: payload || {},
        run_immediately: true
      });
      await loadPortalSnapshot();
      return task;
    },
    async startCreatePhase(bookLinkId, taskType, payload) {
      const task = await quotedCreateEngineTask({
        book_link_id: bookLinkId,
        task_type: taskType,
        request_payload: payload || {},
        run_immediately: true
      });
      persistSelectedBook(bookLinkId);
      await loadPortalSnapshot();
      return task;
    },
    async fetchWorldDimension(bookId, dimension) {
      const createTarget = captureCreateDataTarget(bookId);
      const payload = await window.LF_API.bookWorldDimension(bookId, dimension);
      const mapped = mapWorldDimension(dimension, payload);
      if (mapped && createDataTargetIsCurrent(createTarget)) {
        window.CONSOLE_DATA.create.worldDims = mergeWorldDimensionItems(
          window.CONSOLE_DATA.create.worldDims,
          mapped
        );
        updateCreateStats();
      }
      return mapped;
    },
    // Raw dimension content + optimistic-lock version, for manual field editing.
    async getWorldDimensionRaw(bookId, dimension) {
      const payload = await window.LF_API.bookWorldDimension(bookId, dimension);
      const content = unwrapWorldDimension(dimension, payload);
      const version = payload && payload.version != null
        ? payload.version
        : (content && content.version != null ? content.version : null);
      return {
        content: content && typeof content === "object" ? stripResourceMeta(contentObject(content)) : {},
        version
      };
    },
    // Replace one validated JSON subtree. A stale base_version is surfaced and
    // must never be retried with the stale local value.
    async saveWorldDimension(bookId, dimension, options) {
      const opts = options || {};
      const result = await window.LF_API.updateWorldDimension(bookId, dimension, {
        base_version: opts.base_version,
        path: opts.path,
        value: opts.value,
        reason: opts.reason || "用户编辑世界观维度"
      });
      try {
        const refresh = portalResourceRefresh();
        if (refresh) await refresh.refreshWrite("world", { bookId: bookId, dimension: dimension });
        else await window.LF_PORTAL.fetchWorldDimension(bookId, dimension);
      } catch (e) {}
      rerender();
      return result;
    },
    // Field-rewrite agent: Engine loads authoritative context, validates the
    // task-specific result and atomically applies it before the job completes.
    // options.signal (AbortSignal) cancels polling; options.onProgress(job) per poll tick.
    async rewriteField(bookId, payload, options) {
      const opts = options || {};
      const started = await quotedStartRewrite(bookId, payload, { isCurrent: opts.isCurrent });
      const jobId = started && (started.job_id || started.id);
      if (!jobId) throw new Error("改写任务未返回 job_id");
      const deadline = Date.now() + (opts.timeoutMs || 90000);
      let interval = Math.max(1, Number(opts.intervalMs) || 2500);
      const maxInterval = Math.max(interval, Number(opts.maxIntervalMs) || 10000);
      while (Date.now() < deadline) {
        if (opts.signal && opts.signal.aborted) throw new Error("已取消");
        await new Promise((r) => setTimeout(r, interval));
        let job;
        try { job = await window.LF_API.rewriteJob(bookId, jobId); }
        catch (e) {
          interval = Math.min(maxInterval, Math.round(interval * 1.5));
          continue;
        }
        if (typeof opts.onProgress === "function") { try { opts.onProgress(job); } catch (e) {} }
        const status = String((job && job.status) || "").toLowerCase();
        if (status === "completed") {
          const result = job && job.result_payload && job.result_payload.rewrite;
          if (!result || !("value" in result)) throw new Error("改写任务缺少已校验结果");
          const bodyMode = payload && (payload.full_context || payload.rewritable_scope);
          if (!bodyMode) {
            if (payload.resource_type === "chapter" && String(payload.resource_key || "").endsWith(":guide")) {
              const chapterNumber = Number(String(payload.resource_key).split(":", 1)[0]);
              invalidate({ chapter: [bookId, chapterNumber] });
            } else {
              const hit = bookCache.get(String(bookId));
              if (hit) hit.ts = 0;
            }
            try { await refreshStructuredRewriteDisplay(bookId, payload, opts.isCurrent); } catch (error) {}
          }
          return bodyMode ? result.value : result;
        }
        if (status === "failed" || status === "cancelled" || status === "canceled") {
          const failure = job && job.error;
          const detail = failure && (failure.message || failure.detail);
          const message = detail ? String(detail) : "改写任务失败";
          const creditsRefunded = status === "failed" && job.credits_refunded === true;
          const error = new Error(window.LF_ERROR?.withRefund?.(message, creditsRefunded) || message);
          error.creditsRefunded = creditsRefunded;
          error.code = status === "failed" ? (failure && failure.code ? String(failure.code) : "") : "task_cancelled";
          error.details = failure && failure.details ? failure.details : null;
          error.body = {
            engine_status: status,
            engine_detail: failure || { message: error.message },
            trace_code: failure && failure.trace_code || ""
          };
          if (error.code === "version_conflict") {
            error.status = 409;
          } else {
            error.engine = true;
          }
          throw error;
        }
        interval = Math.min(maxInterval, Math.round(interval * 1.5));
      }
      throw new Error("改写超时，请重试");
    },
    // Story-plan raw content + version, for the shared structured editor.
    async getStoryPlanRaw(bookId) {
      const payload = await window.LF_API.bookStoryPlan(bookId);
      const content = contentObject(payload);
      const version = payload && payload.version != null ? payload.version : (content && content.version != null ? content.version : null);
      return { content: content && typeof content === "object" ? stripResourceMeta(content) : {}, version };
    },
    async saveStoryPlan(bookId, options) {
      const createTarget = captureCreateDataTarget(bookId);
      const opts = options || {};
      const result = await window.LF_API.updateStoryPlan(bookId, {
        base_version: opts.base_version, path: opts.path, value: opts.value, reason: opts.reason || "用户编辑故事规划"
      });
      try {
        const refresh = portalResourceRefresh();
        if (refresh) await refresh.refreshWrite("story_plan", { bookId: bookId });
        else {
          const plan = await window.LF_API.bookStoryPlan(bookId);
          if (createDataTargetIsCurrent(createTarget)) applyStoryPlan({ storyPlan: plan });
        }
      } catch (e) {}
      rerender();
      return result;
    },
    // 细纲自动保存：将变化过的顶层 JSON 块逐个精确写回。发生 409
    // 时立即停止，由调用方刷新，绝不把旧快照套用到新版本重试。
    async saveChapterDetail(bookId, no, det, options) {
      const opts = options || {};
      const reason = opts.reason || "用户编辑章纲";
      const baseVersion = opts.base_version;
      if (!chapterTargetIsCurrent(bookId, no) || !detailTargetMatches(det, bookId, no)) {
        throw navigationChangedError();
      }
      if (baseVersion == null) throw new Error("章纲版本缺失，请刷新后再编辑");
      const payload = await window.LF_API.bookChapterGuide(bookId, no);
      if (!chapterTargetIsCurrent(bookId, no) || !detailTargetMatches(det, bookId, no)) {
        throw navigationChangedError();
      }
      const rawGuide = contentObject(payload && payload.guide != null ? payload.guide : payload);
      let version = payload && payload.version != null
        ? payload.version
        : (rawGuide && rawGuide.version != null ? rawGuide.version : null);
      if (Number(version) !== Number(baseVersion)) {
        applyChapterGuide(bookId, no, payload);
        invalidate({ chapter: [bookId, no] });
        rerender();
        const conflict = new Error("内容已被修改，请刷新后重试");
        conflict.status = 409;
        throw conflict;
      }
      const content = detailToGuide(det, rawGuide);
      const changedKeys = Object.keys(content).filter((key) => (
        Object.prototype.hasOwnProperty.call(rawGuide, key)
        && JSON.stringify(content[key]) !== JSON.stringify(rawGuide[key])
      ));
      const newKeys = Object.keys(content).filter((key) => !Object.prototype.hasOwnProperty.call(rawGuide, key));
      if (newKeys.length) throw new Error("章纲结构已变化，请刷新后再编辑：" + newKeys.join("、"));
      let result = { version: baseVersion };
      for (const key of changedKeys) {
        result = await window.LF_API.updateChapterGuide(bookId, no, {
          base_version: version, path: key, value: content[key], reason
        });
        version = result && result.version != null ? result.version : version + 1;
      }
      invalidate({ chapter: [bookId, no] });
      return result;
    },
    async getChapterGuideRaw(bookId, no) {
      const payload = await window.LF_API.bookChapterGuide(bookId, no);
      const rawGuide = contentObject(payload && payload.guide != null ? payload.guide : payload);
      const version = payload && payload.version != null
        ? payload.version
        : (rawGuide && rawGuide.version != null ? rawGuide.version : null);
      return { content: rawGuide && typeof rawGuide === "object" ? rawGuide : {}, version };
    },
    // Single character raw content + version.
    async getCharacterRaw(bookId, name) {
      const payload = await window.LF_API.bookCharacter(bookId, name);
      const content = contentObject(payload);
      const version = payload && payload.version != null ? payload.version : (content && content.version != null ? content.version : null);
      return { content: content && typeof content === "object" ? stripResourceMeta(content) : {}, version };
    },
    async createBlankCharacter(bookId, name) {
      const createTarget = captureCreateDataTarget(bookId);
      const normalizedName = String(name || "").trim();
      const result = await window.LF_API.createCharacter(bookId, {
        name: normalizedName, content: {}, reason: "用户创建空白角色卡"
      });
      const mapped = await refreshCharactersAfterMutation(
        createTarget, normalizedName, false
      );
      const live = liveSnapshotForBook(bookId);
      if (live) patchBookCacheFields(bookId, { characters: live.characters });
      rerender();
      return { result, characters: mapped };
    },
    async createAICharacter(bookId, characterBrief, options) {
      const opts = options || {};
      const createPayload = {
        book_link_id: bookId,
        task_type: "character_create",
        request_payload: { character_brief: String(characterBrief || "").trim() },
        run_immediately: true
      };
      if (opts.quoteToken) createPayload.request_payload = Object.assign({}, createPayload.request_payload || {}, { quote_token: opts.quoteToken });
      const task = await quotedCreateEngineTask(createPayload, opts.idempotencyKey, {
        quote: opts.quote
      });
      rememberPortalTask(task);
      return { task };
    },
    async deleteCharacter(bookId, name) {
      const createTarget = captureCreateDataTarget(bookId);
      const current = await this.getCharacterRaw(bookId, name);
      if (current.version == null) throw new Error("角色版本缺失，请刷新后重试");
      const result = await window.LF_API.deleteCharacter(bookId, name, {
        base_version: current.version, reason: "用户删除角色卡"
      });
      const mapped = await refreshCharactersAfterMutation(createTarget, name, true);
      const live = liveSnapshotForBook(bookId);
      if (live) patchBookCacheFields(bookId, { characters: live.characters });
      rerender();
      return { result, characters: mapped };
    },
    async saveCharacter(bookId, name, options) {
      const createTarget = captureCreateDataTarget(bookId);
      const opts = options || {};
      const result = await window.LF_API.updateCharacter(bookId, name, {
        base_version: opts.base_version, path: opts.path, value: opts.value, reason: opts.reason || "用户编辑角色卡"
      });
      try {
        const refresh = portalResourceRefresh();
        if (refresh) await refresh.refreshWrite("character", { bookId: bookId, name: name });
        else {
          const characters = await fetchFullCharacters(bookId);
          if (createDataTargetIsCurrent(createTarget)) applyCharacters({ characters });
        }
      } catch (e) {}
      rerender();
      return result;
    },
    async renameCharacter(bookId, name, options) {
      const createTarget = captureCreateDataTarget(bookId);
      const opts = options || {};
      const result = await window.LF_API.renameCharacter(bookId, name, {
        base_version: opts.base_version, new_name: opts.new_name, reason: opts.reason || "用户修改角色姓名"
      });
      try {
        const refresh = portalResourceRefresh();
        if (refresh) await refresh.refreshWrite("character", { bookId: bookId });
        else {
          const characters = await fetchFullCharacters(bookId);
          if (createDataTargetIsCurrent(createTarget)) applyCharacters({ characters });
        }
      } catch (e) {}
      rerender();
      return result;
    },
    // Volume / near-term outline raw content + version + volume number (for PUT path).
    async getOutlineVolumes(bookId) {
      const payload = normalizeList(await window.LF_API.bookOutlines(bookId));
      const snapshot = window.LF_PORTAL_STATE;
      if (snapshot && String(snapshot.selectedBookId || "") === String(bookId)) snapshot.outlines = payload;
      patchSnapshot({ outlines: payload });
      return mapOutlineVolumes(payload);
    },
    async getVolumeOutlineRaw(bookId, requestedVolumeNumber) {
      const payload = requestedVolumeNumber != null
        ? await window.LF_API.bookVolumeOutline(bookId, requestedVolumeNumber)
        : await window.LF_API.bookVolumeOutlineLatest(bookId);
      const content = contentObject(payload);
      const version = payload && payload.version != null ? payload.version : null;
      const volumeNumber = outlineVolumeNumber(payload) || Number(requestedVolumeNumber) || 1;
      return { content: content && typeof content === "object" ? stripResourceMeta(content) : {}, version, volumeNumber };
    },
    async saveVolumeOutline(bookId, volumeNumber, options) {
      const createTarget = captureCreateDataTarget(bookId);
      const opts = options || {};
      const result = await window.LF_API.updateVolumeOutline(bookId, volumeNumber, {
        base_version: opts.base_version, path: opts.path, value: opts.value, reason: opts.reason || "用户编辑卷纲"
      });
      publishOutlinePackageResult(bookId, volumeNumber, result);
      try {
        const refresh = portalResourceRefresh();
        if (refresh) await refresh.refreshWrite("outline", { bookId: bookId, volumeNumber: volumeNumber });
        else await refreshOutlinePackage(bookId, volumeNumber, createTarget);
      } catch (e) {}
      rerender();
      return result;
    },
    async getNearTermOutlineRaw(bookId, requestedVolumeNumber) {
      const payload = requestedVolumeNumber != null
        ? await window.LF_API.bookNearTermOutline(bookId, requestedVolumeNumber)
        : await window.LF_API.bookNearTermOutlineLatest(bookId);
      const content = contentObject(payload);
      const version = payload && payload.version != null ? payload.version : null;
      const volumeNumber = outlineVolumeNumber(payload) || Number(requestedVolumeNumber) || 1;
      return { content: content && typeof content === "object" ? stripResourceMeta(content) : {}, version, volumeNumber };
    },
    async saveNearTermOutline(bookId, volumeNumber, options) {
      const createTarget = captureCreateDataTarget(bookId);
      const opts = options || {};
      const result = await window.LF_API.updateNearTermOutline(bookId, volumeNumber, {
        base_version: opts.base_version, path: opts.path, value: opts.value, reason: opts.reason || "用户编辑近纲"
      });
      publishOutlinePackageResult(bookId, volumeNumber, result);
      try {
        const refresh = portalResourceRefresh();
        if (refresh) await refresh.refreshWrite("outline", { bookId: bookId, volumeNumber: volumeNumber });
        else await refreshOutlinePackage(bookId, volumeNumber, createTarget);
      } catch (e) {}
      rerender();
      return result;
    },
    async runEngineTask(task, handlers, options) {
      const opts = options || {};
      const emit = handlers && handlers.onEvent ? handlers.onEvent : function () {};
      let lastId = opts.afterId != null ? opts.afterId : null;
      let terminalEventSeen = false;
      let syncResult = null;
      let syncPromise = null;
      let eventsPromise = null;
      let stageDispatchPromise = Promise.resolve();
      let touchTransport = function () {};
      let touchProgress = function () {};
      let reconnectAttempt = 0;
      const seenEventIds = new Set();
      const terminalStatuses = ["completed", "failed", "cancelled", "canceled"];
      const activeStatuses = ["queued", "running"];
      const pollInterval = Math.max(1, Number(opts.pollInterval) || 10000);
      const reconnectInterval = Math.max(
        pollInterval,
        Number(opts.reconnectIntervalMs) || 10000
      );
      const maxReconnectInterval = Math.max(
        reconnectInterval,
        Number(opts.maxReconnectIntervalMs) || 30000
      );
      const reconnectJitter = opts.reconnectJitterMs == null
        ? 3000
        : Math.max(0, Number(opts.reconnectJitterMs) || 0);
      const statusSyncInterval = Math.max(
        pollInterval,
        Number(opts.statusSyncIntervalMs) || 60 * 1000
      );
      const transportTimeout = Math.max(
        pollInterval,
        Number(opts.transportTimeoutMs) || 60 * 1000
      );
      const progressTimeout = Math.max(
        pollInterval,
        Number(opts.progressTimeoutMs) || Number(opts.streamTimeoutMs) || 5 * 60 * 1000
      );
      const abortError = () => {
        const error = new Error("任务状态跟踪已取消");
        error.name = "AbortError";
        return error;
      };
      const throwIfStopped = () => {
        if (opts.signal && opts.signal.aborted) throw abortError();
      };
      const wait = (duration) => {
        throwIfStopped();
        return new Promise((resolve, reject) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            if (opts.signal) opts.signal.removeEventListener("abort", stop);
            resolve();
          };
          const stop = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (opts.signal) opts.signal.removeEventListener("abort", stop);
            reject(abortError());
          };
          const timer = setTimeout(finish, Math.max(0, duration));
          if (opts.signal) {
            opts.signal.addEventListener("abort", stop, { once: true });
            if (opts.signal.aborted) stop();
          }
        });
      };
      const reportRecoverable = (error) => {
        if (handlers && handlers.onRecoverableError) handlers.onRecoverableError(error);
      };
      const isTerminal = (event) => {
        const data = event && event.data;
        const status = String((data && data.status) || "").toLowerCase();
        const eventName = String((data && (data.event_type || data.event)) || (event && event.event) || "").toLowerCase();
        const terminalStatus = ["completed", "failed", "cancelled", "canceled"].includes(status);
        return /(job|task)_(completed|failed|cancelled|canceled)$/.test(eventName)
          || /^(completed|failed|cancelled|canceled)$/.test(eventName)
          || (terminalStatus && /^(job|task|engine_task)_/.test(eventName));
      };
      const remember = (event) => {
        touchTransport();
        const eventName = String((event && event.data && event.data.event_type) || (event && event.event) || "").toLowerCase();
        if (eventName === "heartbeat") return true;
        reconnectAttempt = 0;
        const rawId = event && (event.id || (event.data && event.data.id));
        const numericId = rawId == null || rawId === "" ? Number.NaN : Number(rawId);
        if (Number.isFinite(numericId)) {
          if (seenEventIds.has(numericId)) return terminalEventSeen ? false : true;
          seenEventIds.add(numericId);
          if (numericId > Number(lastId || 0)) lastId = numericId;
          touchProgress();
        }
        emit(event);
        if (eventName === "stage_ready") {
          stageDispatchPromise = stageDispatchPromise.then(() => dispatchStageReady(task, event));
        }
        if (isTerminal(event)) terminalEventSeen = true;
        return terminalEventSeen ? false : true;
      };
      const fetchNewEvents = async () => {
        const afterId = lastId;
        const eventKey = String(task.id) + ":" + String(afterId == null ? "" : afterId);
        const latest = await singleFlight(
          taskEventFlights,
          eventKey,
          () => window.LF_API.taskEvents(task.id, afterId)
        );
        normalizeList(latest).forEach((item) => remember({
          id: item.id || item.sequence,
          event: item.event_type || item.event || "job_event",
          data: item
        }));
      };
      const serializedEvents = () => {
        if (!eventsPromise) {
          eventsPromise = fetchNewEvents().finally(() => { eventsPromise = null; });
        }
        return eventsPromise;
      };
      const syncedStatus = (result) => {
        const syncedTask = result && result.task;
        return syncedTask ? String(syncedTask.status || "").toLowerCase() : "";
      };
      const jobProgressSignature = (result) => {
        const cached = result && result.task && result.task.result_cache;
        const job = (result && result.engine_task) || (cached && cached.engine_job);
        if (!job || typeof job !== "object") return null;
        return JSON.stringify([
          String(job.status || "").toLowerCase(),
          job.current_stage == null ? null : String(job.current_stage),
          job.progress == null ? null : Number(job.progress),
          job.updated_at || null
        ]);
      };
      let lastJobProgress = jobProgressSignature({ task });
      const syncOnce = async () => {
        const result = await singleFlight(
          taskStatusSyncFlights,
          String(task.id),
          () => window.LF_API.syncEngineTask(task.id)
        );
        const status = syncedStatus(result);
        if (status && !activeStatuses.includes(status) && !terminalStatuses.includes(status)) {
          const invalid = new Error("Novel engine task returned unknown status: " + status);
          invalid.engine = true;
          invalid.engineStatus = status;
          throw invalid;
        }
        const progressSignature = jobProgressSignature(result);
        if (progressSignature && progressSignature !== lastJobProgress) {
          if (lastJobProgress !== null) touchProgress();
          lastJobProgress = progressSignature;
        }
        if (terminalStatuses.includes(status)) syncResult = result;
        return result;
      };
      const serializedSync = () => {
        if (!syncPromise) {
          syncPromise = syncOnce().finally(() => { syncPromise = null; });
        }
        return syncPromise;
      };
      const catchUpAuthority = async () => {
        try {
          await serializedSync();
        } catch (error) {
          if (error && error.engine) throw error;
          reportRecoverable(error);
        }
        try {
          await serializedEvents();
        } catch (error) {
          reportRecoverable(error);
        }
      };
      try {
        await serializedEvents();
      } catch (error) {
        reportRecoverable(error);
      }
      while (!syncResult) {
        throwIfStopped();
        const streamStartedAt = Date.now();
        const streamController = new AbortController();
        let transportTimer = null;
        let progressTimer = null;
        let statusTimer = null;
        let fatalError = null;
        let localAbortReason = null;
        const abortStream = (reason) => {
          if (streamController.signal.aborted) return;
          localAbortReason = reason;
          streamController.abort();
        };
        const stopFromCaller = () => abortStream("caller");
        if (opts.signal) opts.signal.addEventListener("abort", stopFromCaller, { once: true });
        touchTransport = () => {
          if (transportTimer) clearTimeout(transportTimer);
          if (!streamController.signal.aborted) {
            transportTimer = setTimeout(() => abortStream("transport_inactive"), transportTimeout);
          }
        };
        touchProgress = () => {
          if (progressTimer) clearTimeout(progressTimer);
          if (!streamController.signal.aborted) {
            progressTimer = setTimeout(() => abortStream("progress_inactive"), progressTimeout);
          }
        };
        touchTransport();
        touchProgress();
        statusTimer = setInterval(async () => {
          if (syncResult || syncPromise || streamController.signal.aborted) return;
          try {
            await serializedSync();
            if (syncResult) abortStream("terminal");
          } catch (error) {
            if (error && error.engine) {
              fatalError = error;
              abortStream("fatal");
              return;
            }
            reportRecoverable(error);
          }
        }, statusSyncInterval);
        try {
          if (!terminalEventSeen) {
            await window.LF_API.streamTask(task.id, {
              onActivity: () => touchTransport(),
              onEvent: remember
            }, {
              afterId: lastId,
              signal: streamController.signal
            });
          }
        } catch (error) {
          if (opts.signal && opts.signal.aborted) throw abortError();
          if (fatalError) throw fatalError;
          if (!localAbortReason && !terminalEventSeen && !syncResult) reportRecoverable(error);
        } finally {
          if (statusTimer) clearInterval(statusTimer);
          if (transportTimer) clearTimeout(transportTimer);
          if (progressTimer) clearTimeout(progressTimer);
          if (opts.signal) opts.signal.removeEventListener("abort", stopFromCaller);
          touchTransport = function () {};
          touchProgress = function () {};
          if (Date.now() - streamStartedAt >= reconnectInterval) reconnectAttempt = 0;
        }
        if (fatalError) throw fatalError;
        throwIfStopped();
        if (!syncResult) await catchUpAuthority();
        if (syncResult) break;
        const backoff = Math.min(
          maxReconnectInterval,
          reconnectInterval * Math.pow(2, reconnectAttempt)
        );
        reconnectAttempt += 1;
        const jitter = reconnectJitter > 0 ? Math.floor(Math.random() * reconnectJitter) : 0;
        await wait(backoff + jitter);
      }
      if (!syncResult) {
        try {
          await catchUpAuthority();
        } catch (error) {
          if (error && error.engine) throw error;
          reportRecoverable(error);
        }
      }
      try {
        await serializedEvents();
      } catch (error) {
        reportRecoverable(error);
      }
      await stageDispatchPromise;
      const finalTask = syncResult && syncResult.task;
      const finalStatus = finalTask && String(finalTask.status || "").toLowerCase();
      if (finalTask && terminalStatuses.includes(finalStatus)) {
        rememberPortalTask(finalTask);
        dispatchTerminalTask(finalTask);
      }
      if (["failed", "cancelled", "canceled"].includes(finalStatus)) {
        var jobError = finalTask && finalTask.result_cache && finalTask.result_cache.engine_job
          ? finalTask.result_cache.engine_job.error
          : null;
        var engineErr = new Error(finalTask.error_message || "Novel engine task " + finalStatus);
        engineErr.engine = true;
        engineErr.engineStatus = finalStatus;
        engineErr.creditsRefunded = finalStatus === "failed" && finalTask.credits_refunded === true;
        if (finalStatus !== "failed") engineErr.code = "task_cancelled";
        if (jobError && typeof jobError === "object") {
          engineErr.engineCode = jobError.code ? String(jobError.code) : "";
          engineErr.body = {
            engine_status: finalStatus,
            engine_detail: jobError,
            trace_code: jobError.trace_code || ""
          };
        }
        try {
          const refresh = portalResourceRefresh();
          if (refresh) await refresh.refreshBalance();
        } catch (error) {}
        throw engineErr;
      }
      let resourceSync = { ok: false, pending: true };
      try {
        const refresh = portalResourceRefresh();
        if (refresh) resourceSync = await refresh.refreshTask(Object.assign({}, task, finalTask), { channel: "foreground" });
      } catch (error) { resourceSync = { ok: false, pending: true, error }; }
      return Object.assign({}, syncResult, { resourceSync });
    },
    async fetchCreatePhaseResult(bookId, kind, options) {
      const createTarget = captureCreateDataTarget(bookId);
      if (kind === "world") {
        const world = await window.LF_API.bookWorld(bookId, true);
        const mapped = mapWorld(world);
        if (createDataTargetIsCurrent(createTarget)) {
          if (mapped.length) window.CONSOLE_DATA.create.worldDims = mapped;
          updateCreateStats();
        }
        return mapped;
      }
      if (kind === "cast") {
        const characters = await fetchFullCharacters(bookId);
        const mapped = mapCharacters(characters);
        if (createDataTargetIsCurrent(createTarget)) {
          if (mapped.length) {
            window.CONSOLE_DATA.create.cast = mapped;
            window.CONSOLE_DATA.create.castExtra = zhEn("");
          }
          updateCreateStats();
        }
        return mapped;
      }
      if (kind === "story") {
        const storyPlan = await window.LF_API.bookStoryPlan(bookId);
        const mapped = mapStoryPlan(storyPlan);
        if (createDataTargetIsCurrent(createTarget)) {
          if (mapped.length) window.CONSOLE_DATA.create.story = mapped;
          updateCreateStats();
        }
        return mapped;
      }
      if (kind === "outline") {
        const volumeNumber = options && options.volumeNumber != null ? Number(options.volumeNumber) : null;
        const [volume, nearTerm] = await Promise.all([
          volumeNumber != null
            ? window.LF_API.bookVolumeOutline(bookId, volumeNumber).catch(() => null)
            : window.LF_API.bookVolumeOutlineLatest(bookId).catch(() => null),
          volumeNumber != null
            ? window.LF_API.bookNearTermOutline(bookId, volumeNumber).catch(() => null)
            : window.LF_API.bookNearTermOutlineLatest(bookId).catch(() => null)
        ]);
        if (createDataTargetIsCurrent(createTarget)) applyOutline(volume, nearTerm);
        await this.getOutlineVolumes(bookId).catch(() => []);
        return mapOutline(volume, nearTerm);
      }
      return [];
    },
    async syncRunningTasks(options) {
      const opts = options || {};
      const userId = currentTaskSyncUserId();
      if (!userId) return false;
      prepareTaskSyncUser(userId);
      if (runningTaskSyncPromise) {
        if (!opts.authoritative) return runningTaskSyncPromise;
        try { await runningTaskSyncPromise; } catch (error) {}
        if (currentTaskSyncUserId() !== userId) return false;
      }
      const snapshot = window.LF_PORTAL_STATE;
      if (!snapshot) return false;
      const tasks = snapshot && Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
      const running = tasks.filter((task) => task && (task.status === "queued" || task.status === "running" || task.status === "retrying"));
      const now = Date.now();
      if (!opts.force && now < nextTaskListRefreshAt) return false;
      if (opts.coordinated !== false && !claimTaskSyncLeadership(userId)) {
        ensureTaskSyncCoordination();
        return false;
      }
      nextTaskListRefreshAt = now + 10000 + Math.floor(Math.random() * 3000);
      const syncPromise = (async () => {
        let summaries;
        if (opts.authoritative && running.length) {
          summaries = [];
          for (const task of running) {
            if (currentTaskSyncUserId() !== userId) return false;
            try {
              const result = await window.LF_API.syncEngineTaskStatus(task.id);
              if (result && result.task) summaries.push(result.task);
            } catch (error) {}
          }
        } else {
          summaries = normalizeList(await window.LF_API.engineTasks());
        }
        if (currentTaskSyncUserId() !== userId) return false;
        publishTaskSummaries(summaries, userId);
        return await applyTaskSummaries(summaries);
      })().finally(() => {
        if (runningTaskSyncPromise === syncPromise) runningTaskSyncPromise = null;
      });
      runningTaskSyncPromise = syncPromise;
      return syncPromise;
    },
    async createChapterDraft(bookId, options) {
      const input = typeof options === "string" ? { human_intent: options } : (options || {});
      const task = await quotedCreateEngineTask({
        book_link_id: bookId,
        task_type: "chapter_draft",
        request_payload: input,
        run_immediately: true
      });
      await loadPortalSnapshot();
      return task;
    },
    rememberTask(task) {
      rememberPortalTask(task);
      return task;
    },

    /* -- High-level convenience methods consumed by LF_PORTAL anchors -- */

    async runPhase(bookId, taskType, options) {
      var engineType = PHASE_TASK_TYPES[taskType] || taskType;
      var payload = (options && options.payload) || {};
      var createPayload = {
        book_link_id: bookId,
        task_type: engineType,
        request_payload: payload,
        run_immediately: true
      };
      if (options && options.quoteToken) createPayload.request_payload = Object.assign({}, createPayload.request_payload || {}, { quote_token: options.quoteToken });
      var task = await quotedCreateEngineTask(createPayload, options && options.idempotencyKey, {
        quote: options && options.quote
      });
      rememberPortalTask(task);
      if (options && typeof options.onTask === "function") options.onTask(task);
      await awaitEngineTask(task, options && options.onProgress);
      return task;
    },

    async polishChapter(bookId, no, options) {
      var opts = options || {};
      var createPayload = {
        book_link_id: bookId,
        task_type: "polish",
        request_payload: Object.assign({ chapter_number: no }, opts.payload || {}),
        run_immediately: true
      };
      if (opts.quoteToken) createPayload.request_payload = Object.assign({}, createPayload.request_payload || {}, { quote_token: opts.quoteToken });
      var task = await quotedCreateEngineTask(createPayload, opts.idempotencyKey, {
        quote: opts.quote
      });
      await awaitEngineTask(task, opts.onProgress);
      return task;
    },

    /* Run one chapter execution scheme (world_state / outline_director /
       character_state / writer_group) on a fixed chapter number. chapter_number
       is always pinned so every stage targets the same chapter instead of
       auto-incrementing into a new one. */
    async runChapterStage(bookId, no, executionMode, options) {
      var opts = options || {};
      var task = await submitChapterStageTask(bookId, no, executionMode, opts);
      await awaitEngineTask(task, opts.onProgress);
      return task;
    },

    /* The browser submits only the chain root. The Portal worker owns durable
       successor creation; this client follows next_task_id for progress only. */
    async runChapterStages(bookId, no, stages, options) {
      var opts = options || {};
      var emit = typeof opts.onProgress === "function" ? opts.onProgress : function () {};
      var kind = chapterChainKind(stages);
      if (!kind) {
        var finalTask = null;
        for (var fallbackIndex = 0; fallbackIndex < stages.length; fallbackIndex += 1) {
          let index = fallbackIndex;
          let stage = stages[index];
          let total = stages.length;
          finalTask = await window.LF_PORTAL.runChapterStage(bookId, no, stage, {
            payload: opts.payload,
            writerType: opts.writerType,
            quoteToken: opts.quoteToken,
            quote: opts.quote,
            onProgress: function (event) {
              if (event && event.error) { emit(event); return; }
              if (event && event.done) {
                if (index === total - 1) emit(Object.assign({}, event, { done: true }));
                else emit({ phase: stage, phaseIndex: index, phaseTotal: total, progress: (index + 1) / total });
                return;
              }
              var progress = event && typeof event.progress === "number" ? event.progress : 0;
              emit({
                phase: stage,
                phaseIndex: index,
                phaseTotal: total,
                task: event && event.task,
                stage_name: event && event.stage_name,
                event: event && event.event,
                progress: (index + progress) / total
              });
            }
          });
        }
        return finalTask;
      }

      var rootStage = stages[0];
      var credential = await chapterSubmissionCredential(kind, bookId, no, {
        book_link_id: bookId,
        task_type: "chapter_draft",
        request_payload: chapterStagePayload(no, rootStage, opts),
        run_immediately: true,
        stages: stages
      });
      var chain = { id: credential.chainId, kind: kind, step: 0, total: stages.length };
      var rootTask;
      try {
        rootTask = await submitChapterStageTask(bookId, no, rootStage, {
          payload: opts.payload,
          writerType: opts.writerType,
          chain: chain,
          idempotencyKey: "chapter-chain:" + credential.chainId + ":0",
          quoteToken: opts.quoteToken,
          quote: opts.quote
        });
      } catch (error) {
        if (!submissionOutcomeIsAmbiguous(error)) clearChapterSubmission(credential.storageKey);
        throw error;
      }
      // Once POST returns 201, the durable task replaces the local transport credential.
      clearChapterSubmission(credential.storageKey);

      var rootResult = await awaitEngineTask(rootTask, function (event) {
        if (event && event.error) { emit(event); return; }
        if (event && event.done) {
          emit({ phase: rootStage, phaseIndex: 0, phaseTotal: 2, progress: 0.5, task: event.task });
          return;
        }
        var progress = event && typeof event.progress === "number" ? event.progress : 0;
        emit({
          phase: rootStage,
          phaseIndex: 0,
          phaseTotal: 2,
          task: event && event.task,
          stage_name: event && event.stage_name,
          event: event && event.event,
          progress: progress / 2
        });
      });
      var completedRoot = rootResult && rootResult.task ? rootResult.task : rootTask;
      return followChapterChainSuccessor(completedRoot, chain, function (event) {
        if (event && event.error) { emit(event); return; }
        if (event && event.done) { emit(Object.assign({}, event, { done: true })); return; }
        var progress = event && typeof event.progress === "number" ? event.progress : 0;
        emit({
          phase: stages[1],
          phaseIndex: 1,
          phaseTotal: 2,
          task: event && event.task,
          stage_name: event && event.stage_name,
          event: event && event.event,
          progress: (1 + progress) / 2
        });
      });
    },

    // "生成单章细纲": refresh stale task summaries first, then let Engine
    // readiness decide whether world state is still missing. A retry after an
    // outline-only failure must not regenerate or recharge the completed world
    // state stage.
    async generateChapterOutline(bookId, no, options) {
      var opts = options || {};
      await window.LF_PORTAL.syncRunningTasks({
        force: true,
        coordinated: false,
        authoritative: true
      });

      var active = window.LF_PORTAL.activeChapterTask(bookId);
      var activeChapter = stageChapterNumber(active, null);
      if (active && Number(activeChapter) === Number(no)) {
        if (active.task_type === "chapter_outline_director") {
          return window.LF_PORTAL.attachEngineTask(active, opts);
        }
        if (active.task_type === "chapter_world_state") {
          var activeDetail = active.request_payload
            ? active
            : await window.LF_API.engineTask(active.id);
          var activeChain = taskChapterChain(activeDetail);
          if (activeChain && activeChain.kind === "outline") {
            return window.LF_PORTAL.attachEngineTask(activeDetail, opts);
          }
        }
      }

      var readiness = await window.LF_API.productionReadiness(
        bookId,
        "chapter_generate",
        "outline_director",
        no
      );
      var chainKey = chapterChainStorageKey("outline", bookId, no);
      if (readiness && readiness.ready === true) {
        try { localStorage.removeItem(chainKey); } catch (error) {}
        return window.LF_PORTAL.runChapterStage(
          bookId,
          no,
          "outline_director",
          Object.assign({}, opts, { readiness: readiness })
        );
      }

      var missing = readiness && Array.isArray(readiness.missing) ? readiness.missing : [];
      if (missing.some(function (item) { return item && item.code === "chapter_world_state"; })) {
        try { localStorage.removeItem(chainKey); } catch (error) {}
        return window.LF_PORTAL.runChapterStages(
          bookId,
          no,
          ["world_state", "outline_director"],
          opts
        );
      }

      return window.LF_PORTAL.runChapterStage(
        bookId,
        no,
        "outline_director",
        Object.assign({}, opts, { readiness: readiness })
      );
    },

    // "运行成文": persist any user-edited hooks/debts (partial update), then run
    // character state maintenance followed by the writer group.
    async runChapterProse(bookId, no, patch, options) {
      await saveHooksDebts(bookId, patch);
      return window.LF_PORTAL.runChapterStages(bookId, no, ["character_state", "writer_group"], options);
    },

    activeChapterTasks(bookId) {
      var state = window.LF_PORTAL_STATE;
      var tasks = state && Array.isArray(state.tasks) ? state.tasks : [];
      var matches = tasks.filter(function (task) {
        return task && task.book_link_id === bookId && isChapterDraftTask(task.task_type)
          && (task.status === "queued" || task.status === "running");
      });
      matches.sort(function (a, b) {
        return String(b.created_at || b.id || "").localeCompare(String(a.created_at || a.id || ""));
      });
      return matches;
    },

    activeChapterTask(bookId) {
      return window.LF_PORTAL.activeChapterTasks(bookId)[0] || null;
    },

    activeProseTask(bookId, no) {
      var matches = window.LF_PORTAL.activeChapterTasks(bookId).filter(function (task) {
        if (window.ProseStageCore.resultTarget(task)?.kind !== 'body') return false;
        return no == null || Number(stageChapterNumber(task, null)) === Number(no);
      });
      return matches[0] || null;
    },

    chapterTaskNumber(task) {
      return stageChapterNumber(task, null);
    },

    async attachEngineTask(task, options) {
      if (!task || !task.id) return null;
      var detail = task.request_payload ? task : await window.LF_API.engineTask(task.id);
      var result = await awaitEngineTask(detail, options && options.onProgress);
      var completed = result && result.task ? result.task : detail;
      var chain = taskChapterChain(completed);
      return followChapterChainSuccessor(completed, chain, options && options.onProgress);
    },

    verifyChapterBody,
    verifyChapterResult,

    async refreshAssistantTask(bookId, task, shouldApply) {
      if (typeof shouldApply !== "function" || !shouldApply()) return false;
      const selected = currentPortalSelection();
      if (String(selected.bookId || "") !== String(bookId || "")) return false;
      if (!task || !task.id) return false;
      const current = await window.LF_API.engineTask(task.id);
      if (!shouldApply() || String(currentPortalSelection().bookId || "") !== String(bookId || "")) return false;
      if (!current || String(current.id || "") !== String(task.id) || String(current.book_link_id || "") !== String(bookId)) return false;
      rememberPortalTask(current);
      return shouldApply();
    },

    async refreshAssistantCruise(bookId, session, shouldApply) {
      if (typeof shouldApply !== "function" || !shouldApply()) return false;
      const selected = currentPortalSelection();
      if (String(selected.bookId || "") !== String(bookId || "")) return false;
      if (!session || typeof session !== "object") return false;
      const response = await window.LF_API.getActiveCruise();
      if (!shouldApply() || String(currentPortalSelection().bookId || "") !== String(bookId || "")) return false;
      const current = response && response.session || null;
      if (typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new CustomEvent("lf:assistant-cruise-updated", {
          detail: { bookId: bookId, controlledId: session.id, session: current }
        }));
      }
      rerender();
      return shouldApply();
    },

    async refreshAssistantShelf() {
      const accountId = window.LF_PORTAL_STATE?.me?.id;
      if (!accountId) return false;
      const sequence = ++assistantShelfRefreshSequence;
      const books = normalizeList(await window.LF_API.books());
      const live = window.LF_PORTAL_STATE;
      if (!live || String(live.me?.id || '') !== String(accountId) || sequence !== assistantShelfRefreshSequence) return false;
      live.books = books;
      if (accountCache.data) accountCache.data.books = books;
      updateShelfText(live);
      if (window.CONSOLE_DATA) {
        window.CONSOLE_DATA.shelf = books.map((book, index) => shelfCard(book, index, live.selectedBookId)).concat(newBookCard());
        const selected = books.find(book => String(book.id) === String(live.selectedBookId));
        if (selected && window.CONSOLE_DATA.book) window.CONSOLE_DATA.book.title = zhEn(selected.title);
      }
      persistLiveSnapshot(live);
      rerender();
      return true;
    },

    async refreshAssistantCharacters(bookId, shouldApply) {
      invalidate({ book: bookId });
      const accountId = window.LF_PORTAL_STATE?.me?.id;
      const sequence = ++assistantCharactersRefreshSequence;
      const current = () => typeof shouldApply === 'function' && shouldApply()
        && String(currentPortalSelection().bookId || '') === String(bookId)
        && accountId === window.LF_PORTAL_STATE?.me?.id && sequence === assistantCharactersRefreshSequence;
      const guard = window.AssistantCiteCore?.editGuard?.captureNavigation();
      if (!current() || !guard) return false;
      const createTarget = captureCreateDataTarget(bookId);
      const characters = await fetchFullCharacters(bookId, { strict: true });
      if (!current() || !guard()) return false;
      patchBookCacheFields(bookId, { characters });
      const live = liveSnapshotForBook(bookId);
      if (live) { live.characters = characters; persistLiveSnapshot(live); }
      if (createDataTargetIsCurrent(createTarget)) applyCharacters({ characters });
      rerender();
      return true;
    },

    // Refresh assistant results without selecting a different book or chapter.
    async refreshAssistantBook(bookId, shouldApply) {
      if (typeof shouldApply !== "function" || !shouldApply()) return false;
      const selected = currentPortalSelection();
      if (String(selected.bookId || "") !== String(bookId || "")) return false;
      invalidate({ book: bookId, allChapters: bookId });
      return loadBook(bookId, {
        refreshChapters: true,
        refreshAccount: false,
        selectedChapter: selected.chapterNumber,
        shouldApply
      });
    },

    async refreshAssistantResource(bookId, resource, shouldApply) {
      if (typeof shouldApply !== "function" || !shouldApply()) return false;
      const selected = currentPortalSelection();
      if (String(selected.bookId || "") !== String(bookId || "")) return false;
      const payload = resource && typeof resource === "object" ? resource : {};
      const Cite = window.AssistantCiteCore;
      const targets = Cite && Cite.relatedRefreshResources
        ? Cite.relatedRefreshResources(payload)
        : [payload];
      if (!Cite || !Cite.canonicalResourceKey(payload.resource_type, payload.resource_key)) return false;
      invalidate({book:bookId});
      if (payload.resource_type === "chapter") {
        const chapter = Cite.parseChapterGuideKey(payload.resource_key);
        invalidate({chapter:[bookId, chapter.chapter]});
      }
      let applied;
      if (["book", "outline", "chapter"].includes(payload.resource_type)) {
        applied = await refreshAssistantPlanningDisplay(bookId, payload, shouldApply);
      } else {
        const guard = Cite.editGuard.capture({book_id:bookId, resource_type:payload.resource_type, resource_key:payload.resource_key});
        if (!guard) return false;
        applied = await refreshStructuredRewriteDisplay(bookId, payload, () => shouldApply() && guard());
      }
      if (applied === false || !shouldApply()) return false;
      if (typeof window.dispatchEvent === "function") {
        (Array.isArray(targets) && targets.length ? targets : [payload]).forEach((target) => {
          window.dispatchEvent(new CustomEvent("lf:assistant-resource-updated", {
            detail: {
              bookId,
              resource_type: target && target.resource_type,
              resource_key: target && target.resource_key,
              path: (target && target.path) || payload.path || null
            }
          }));
        });
      }
      return applied !== false;
    },

    async refreshChapter(bookId, chapterNumber) {
      const refresh = portalResourceRefresh();
      if (!refresh) return false;
      const result = await refresh.refreshChapter(bookId, chapterNumber);
      return !!(result && result.ok !== false && result.applied
        && result.applied.some(read => read.kind === "chapter_body"));
    },

    // Read only the saved prose and its directory identity. A skipped body is
    // pending synchronization, never proof that the visible prose is current.
    async refreshProse(bookId, chapterNumber) {
      const refresh = portalResourceRefresh();
      if (!refresh) return { ok: false, applied: [], skipped: [] };
      return refresh.refreshWrite("chapter_body", { bookId, chapterNumber });
    },

    // "定稿本章": post-hoc settlement pipeline (hooks/debts/world rulings).
    activePostHocTask(bookId, no) {
      var state = window.LF_PORTAL_STATE;
      var tasks = state && Array.isArray(state.tasks) ? state.tasks : [];
      var matches = tasks.filter(function (task) {
        return task && task.book_link_id === bookId && task.task_type === "post_hoc"
          && Number(stageChapterNumber(task, 0)) === Number(no)
          && (task.status === "queued" || task.status === "running");
      });
      matches.sort(taskNewestFirst);
      return matches[0] || null;
    },

    async finalizeChapter(bookId, no, options) {
      var opts = options || {};
      var task = window.LF_PORTAL.activePostHocTask(bookId, no);
      if (!task) {
        var createPayload = {
          book_link_id: bookId,
          task_type: "post_hoc",
          request_payload: { chapter_number: no },
          run_immediately: true
        };
        if (opts.quoteToken) createPayload.request_payload = Object.assign({}, createPayload.request_payload || {}, { quote_token: opts.quoteToken });
        task = await quotedCreateEngineTask(createPayload, opts.idempotencyKey, {
          quote: opts.quote
        });
      }
      rememberPortalTask(task);
      await awaitEngineTask(task, opts.onProgress);
      return task;
    },

    // True while any post-hoc settlement is queued/running for this book — the
    // UI blocks starting the next chapter until regression check completes.
    postHocRunning(bookId) {
      var state = window.LF_PORTAL_STATE;
      var tasks = state && Array.isArray(state.tasks) ? state.tasks : [];
      return tasks.some(function (task) {
        return task && task.book_link_id === bookId && task.task_type === "post_hoc"
          && (task.status === "queued" || task.status === "running");
      });
    },

    // Derive a chapter's workbench state from the engine task list so the UI can
    // gate the next chapter until post-hoc regression has settled.
    chapterTaskState(bookId, no) {
      var state = window.LF_PORTAL_STATE;
      var tasks = state && Array.isArray(state.tasks) ? state.tasks : [];
      var result = { draftRunning: false, postHocRunning: false, postHocDone: false };
      tasks.forEach(function (task) {
        if (!task || task.book_link_id !== bookId) return;
        var payload = task.request_payload || {};
        var enginePayload = payload.engine_payload || {};
        var taskChapter = Number(task.chapter_number || enginePayload.chapter_number || payload.chapter_number);
        if (taskChapter !== Number(no)) return;
        var running = task.status === "queued" || task.status === "running";
        if (isChapterDraftTask(task.task_type) && running) result.draftRunning = true;
        if (task.task_type === "post_hoc") {
          if (running) result.postHocRunning = true;
          if (task.status === "completed") result.postHocDone = true;
        }
      });
      return result;
    },

    // Compute the chapter-number targets for a cruise from current snapshot data.
    // Pure + synchronous so the config panel can preview the count/cost and
    // runCruise can reuse the exact same logic. Volume spanning is modeled off
    // the book's own history because the portal carries a single synthetic volume.
    //   scope 0: finish the current volume (remaining todo chapters)
    //   scope 1: write through volume `scopeVol` (projected by per-volume size)
    //   scope 2: write `scopeMore` more chapters past the last fully-ready one
    cruiseTargets: function (cfg) {
      cfg = cfg || {};
      var all = Array.isArray(window.CONSOLE_DATA.chapters) ? window.CONSOLE_DATA.chapters.slice() : [];
      var maxReady = all.filter(function (c) { return c.cruise_ready === true; })
        .reduce(function (m, c) { return Math.max(m, c.no); }, 0);
      var maxAny = all.reduce(function (m, c) { return Math.max(m, c.no || 0); }, 0);
      var startFrom = maxReady + 1;
      var span = function (from, to) { var out = []; for (var n = from; n <= to; n++) out.push(n); return out; };
      if (cfg.scope === 2) {
        // 续写 N 章 from the last chapter whose full cruise pipeline is ready.
        return span(startFrom, startFrom + (cfg.scopeMore || 5) - 1);
      }
      // Real volumes carry vnum + chapter range [start,end]; the trailing
      // synthetic "plan" volume has an empty range and is excluded here.
      var vols = (window.CONSOLE_DATA.volumes || []).filter(function (v) {
        return v && v.vnum != null && Array.isArray(v.range_nos) && v.range_nos.length;
      });
      var activeVol = vols.find(function (v) { return v.state === "active"; }) || vols[vols.length - 1] || null;
      if (cfg.scope === 1) {
        // 写完至第 x 卷. If volume x is already planned, stop at its real end;
        // otherwise project from the average size of known volumes — the backend
        // auto-plans (卷纲规划) each unplanned volume as the cruise reaches it.
        var baseVnum = (activeVol && activeVol.vnum) || 1;
        var targetVnum = Math.max(baseVnum, cfg.scopeVol || baseVnum + 1);
        var known = vols.filter(function (v) { return v.end; });
        var targetVol = known.find(function (v) { return v.vnum === targetVnum; });
        var endChapter;
        if (targetVol) {
          endChapter = targetVol.end;
        } else {
          var lastKnown = known.length ? known[known.length - 1] : null;
          var avg = known.length
            ? Math.max(1, Math.round(known.reduce(function (s, v) { return s + (v.end - v.start + 1); }, 0) / known.length))
            : 40;
          var lastEnd = lastKnown ? lastKnown.end : maxAny;
          var lastVnum = lastKnown ? lastKnown.vnum : 1;
          endChapter = lastEnd + Math.max(0, targetVnum - lastVnum) * avg;
        }
        return span(startFrom, Math.max(startFrom, endChapter));
      }
      // scope 0: 写完本卷 — through the active volume's last chapter.
      if (activeVol && activeVol.end && activeVol.end >= startFrom) {
        return span(startFrom, activeVol.end);
      }
      // No volume info (or this volume already finished): fall back to the
      // remaining planned (todo) chapters.
      return all.filter(function (c) { return c.state === "todo"; })
        .map(function (c) { return c.no; })
        .sort(function (a, b) { return a - b; });
    },

    // 巡航编排：服务端后台跑。前端只负责启动 → 轮询 → 读取进度。
    // onSession hands observation to the mounted cruise view's existing loop.
    async runCruise(bookId, cfg, handlers) {
      cfg = cfg || {}; handlers = handlers || {};
      var emit = function (ev) { try { if (handlers.onProgress) handlers.onProgress(ev); } catch (e) {} };

      // 1) 计算 targets。卷纲规划由后端按需自动运行（跨卷时先跑 outline 任务），
      //    前端不再预跑会误规划第一卷的 outline。
      var listChaps = function () { return Array.isArray(window.CONSOLE_DATA.chapters) ? window.CONSOLE_DATA.chapters.slice() : []; };
      var maxReady = listChaps().filter(function (c) { return c.cruise_ready === true; }).reduce(function (m, c) { return Math.max(m, c.no); }, 0);
      var targets = window.LF_PORTAL.cruiseTargets(cfg);
      // Brand-new book with no volume/chapter info yet: seed the next chapter so
      // the backend plans volume 1 (via _ensure_volume_plan) before drafting it.
      if (!targets.length) targets = [maxReady + 1];
      if (!targets.length) {
        emit({ done: true });
        return;
      }

      // 2) writer_type：优先用 cfg（配置面板新增写手类型选项），回退 localStorage。
      var writerType = cfg.writerType || "single";
      try { if (!cfg.writerType) writerType = localStorage.getItem("lf_writer_type") || "single"; } catch (e) {}

      emit({ phase: "plan", total: targets.length });

      // 获取报价并确认高倍率，再提交巡航。
      try {
        var cruisePayload = {
          book_id: bookId,
          cfg: cfg,
          writer_type: writerType,
          targets: targets
        };
        var cruiseQuoteToken = cfg.quote_token || (handlers && handlers.quoteToken);
        if (cruiseQuoteToken) cruisePayload.quote_token = cruiseQuoteToken;
        var bookData = window.LF_BOOK_DATA_VOLUME;
        if (bookData && typeof bookData.preparePaidCreate === "function") {
          var quotedCruise = await bookData.preparePaidCreate({
            book_link_id: bookId,
            book_id: bookId,
            task_type: "cruise",
            request_payload: { writer_type: writerType, targets: targets, polish: !!(cfg && cfg.polish) }
          }, {
            spec: {
              task_type: "cruise",
              writer_type: writerType,
              targets: targets,
              polish: !!(cfg && cfg.polish)
            }
          });
          var quotedCruiseToken = bookData.quoteTokenOf
            ? bookData.quoteTokenOf(quotedCruise)
            : (quotedCruise && (quotedCruise.quote_token || (quotedCruise.request_payload && quotedCruise.request_payload.quote_token)));
          if (quotedCruiseToken) {
            cruisePayload.quote_token = quotedCruiseToken;
            cruisePayload.cfg = Object.assign({}, cruisePayload.cfg || cfg, { quote_token: quotedCruiseToken });
          }
        }
        var resp = await window.LF_API.startCruise(cruisePayload);
        var session = resp && resp.session;
        if (!session) { emit({ error: "巡航启动失败" }); return; }
        // 启动成功后再更新快照；取消倍率提醒不改变章节状态。
        try {
          var portalSnapshot = window.LF_PORTAL_STATE || {};
          if (!portalSnapshot.chapters) portalSnapshot.chapters = [];
          var bookChaps = portalSnapshot.chapters.filter(function (c) { return c.book_link_id === bookId; });
          if (!bookChaps.length) bookChaps = portalSnapshot.chapters;
          // 将 target 中剩余的章节设为 "todo"
          for (var ti = 0; ti < targets.length; ti++) {
            var found = bookChaps.find(function (c) { return c.no === targets[ti]; });
            if (found) found.state = "todo";
          }
          // 强制刷新屏幕
          if (window.CONSOLE_DATA && window.CONSOLE_DATA.chapters) {
            window.CONSOLE_DATA.chapters = bookChaps;
          }
        } catch (e) {}

        if (Array.isArray(session.targets) && session.targets.length) targets = session.targets.slice();
        if (typeof handlers.onSession === "function") {
          handlers.onSession(session);
          return session;
        }
        emit({ phase: "chapter_start", chapter: session.current_chapter, index: session.current_index, total: targets.length });
      } catch (e) { emit({ error: e }); return; }

      // 5) 轮询进度
      var pollTimer = null;
      var done = false;
      return new Promise(function (resolve, reject) {
        var poll = async function () {
          try {
            var r = await window.LF_API.getActiveCruise();
            var s = r && r.session;
            // 暂停是暂态(继续巡航会重新进入 running)：保持轮询并发一个 paused tick，
            // 否则会被当成停止 → 清掉定时器并 resolve，驾驶舱掉回空闲、隐藏「继续巡航」。
            if (s && s.status === "paused") {
              emit({
                paused: true,
                phase: "paused",
                chapter: s.current_chapter,
                index: s.current_index,
                total: s.total || targets.length,
                spent: s.spent
              });
              return;
            }
            if (!s || s.status !== "running") {
              if (pollTimer) clearInterval(pollTimer);
              if (s && s.status === "done") { emit({ done: true }); resolve(); }
              else if (s && s.status === "stopped") { emit({ stopped: true, reason: s.error_message ? "budget" : "stop" }); resolve(); }
              else if (s && s.status === "error") { emit({ error: s.error_message || "巡航错误" }); resolve(); }
              else { emit({ stopped: true }); resolve(); }
              return;
            }
            emit({
              phase: "chapter_start",
              chapter: s.current_chapter,
              index: s.current_index,
              total: s.total || targets.length,
              spent: s.spent
            });
          } catch (e) {
            if (pollTimer) clearInterval(pollTimer);
            emit({ error: e });
            reject(e);
          }
        };
        poll();  // 首次立即查
        pollTimer = setInterval(poll, 3000);
      });
    },
    stopCruise() { window.LF_API.stopCruise().catch(function(){}); },
    // Pause holds after the current chapter finishes (engine task not cancelled).
    pauseCruise() { return window.LF_API.pauseCruise(); },
    async resumeCruise() {
      try { return await window.LF_API.resumeCruise(); }
      catch (error) {
        var detail = (error && error.body && error.body.detail) || (error && error.detail);
        var volume = window.LF_BOOK_DATA_VOLUME;
        if (!detail || detail.code !== "quote_required" || !volume) throw error;
        var quote = volume.parseTaskQuote(await window.LF_API.requoteCruise());
        var accepted = await volume.confirmQuote(quote, {reason: "cruise_resume"});
        if (!accepted) throw volume.cancelledError();
        return window.LF_API.resumeCruise({quote_token: quote.quoteToken});
      }
    },
    // Precise 笔力 estimate for the configured run, computed server-side.
    estimateCruise(bookId, cfg) {
      var targets = window.LF_PORTAL.cruiseTargets(cfg || {});
      return window.LF_API.estimateCruise({
        book_id: bookId,
        targets: targets,
        writer_type: (cfg && cfg.writerType) || "single",
        polish: !!(cfg && cfg.polish)
      });
    },
    // Load one chapter's world-state-machine snapshot into D.wsm and rerender —
    // used by the cruise tension curve so clicking a chapter swaps the WSM view
    // in place instead of leaving the cockpit.
    async loadChapterWsm(bookId, chapterNumber) {
      var world = await window.LF_API.bookChapterWorld(bookId, chapterNumber);
      if (!chapterTargetIsCurrent(bookId, chapterNumber)) return false;
      var ok = applyWsm(world);
      if (ok) {
        window.CONSOLE_DATA.wsm._bookId = String(bookId);
        window.CONSOLE_DATA.wsm.no = Number(chapterNumber);
      }
      rerender();
      return ok;
    },

    // 从后端拉取活跃的巡航会话 (刷新后恢复用)
    async cruiseSession() {
      try {
        var r = await window.LF_API.getActiveCruise();
        var s = r && r.session;
        if (!s || !s.book_id || !s.targets) return null;
        return {
          id: s.id,
          updated_at: s.updated_at,
          bookId: s.book_id,
          cfg: s.cfg,
          writerType: s.writer_type,
          targets: s.targets,
          currentIndex: s.current_index,
          total: s.total,
          chapter: s.current_chapter,
          spent: s.spent,
          status: s.status
        };
      } catch (e) { return null; }
    },

    async polishChapter(bookId, no, options) {
      var opts = options || {};
      var createPayload = {
        book_link_id: bookId,
        task_type: "polish",
        request_payload: Object.assign({ chapter_number: no }, opts.payload || {}),
        run_immediately: true
      };
      if (opts.quoteToken) createPayload.request_payload = Object.assign({}, createPayload.request_payload || {}, { quote_token: opts.quoteToken });
      var task = await quotedCreateEngineTask(createPayload, opts.idempotencyKey, {
        quote: opts.quote
      });
      await awaitEngineTask(task, opts.onProgress);
      return task;
    },

    // Full replacement is always tied to the version the user edited. Never
    // upgrade the base and replay an old body after a conflict (including when
    // a trace code happens to contain "409").
    async saveProse(bookId, no, paras, options) {
      var opts = options || {};
      if (!chapterTargetIsCurrent(bookId, no)) throw navigationChangedError();
      var body = Array.isArray(paras) ? paras.join("\n\n") : String(paras || "");
      var accountId = window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id;
      var base = opts.baseVersion != null ? Number(opts.baseVersion)
        : window.CONSOLE_DATA.prose && Number(window.CONSOLE_DATA.prose.version) || 0;
      var requestBody = { base_version: base, body: body, reason: opts.reason || "用户编辑正文" };
      try {
        var res = await window.LF_API.updateChapterBody(bookId, no, requestBody);
        if (accountId === (window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id)) {
          applySavedChapterBody(bookId, no, body, res);
        }
        return res;
      } catch (error) {
        if (error && Number(error.status) === 409) error.code = "version_conflict";
        throw error;
      }
    },

    // ---- 正文历史版本 (chapter body revisions) ----
    // List the revision history for a chapter's body. Metadata only (no content);
    // shape: { chapter_number, current_version, revisions: [{revision_id, version,
    // base_version, source, source_detail, edit_intensity, diff_stats, created_at}] }.
    bodyRevisions(bookId, no) {
      return window.LF_API.bookChapterBodyRevisions(bookId, no);
    },
    // One revision with full before/after content + diff. The body lives at
    // after_content.body (engine stores the body resource as an object).
    bodyRevision(bookId, no, revisionId) {
      return window.LF_API.bookChapterBodyRevision(bookId, no, revisionId);
    },
    // Extract a revision's body text without forcing the caller to know the shape.
    revisionBodyText(rev) {
      var c = rev && (rev.after_content != null ? rev.after_content : rev.content);
      if (c == null) return "";
      if (typeof c === "string") return c;
      if (typeof c === "object" && typeof c.body === "string") return c.body;
      return "";
    },
    // Restore a chapter body to a past revision: pull that revision's text and
    // write it back through the normal body-save path (records a fresh
    // portal_user revision with the confirmed baseline), then refresh
    // the snapshot so the editor shows the restored text + new version.
    async restoreBodyRevision(bookId, no, revisionId, options) {
      var opts = options || {};
      var targetCurrent = captureChapterTarget(bookId, no);
      var accountId = window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id;
      var guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      var navigationCurrent = guard && guard.captureNavigation ? guard.captureNavigation() : () => true;
      var visible = window.CONSOLE_DATA && window.CONSOLE_DATA.prose;
      var base = opts.baseVersion != null ? opts.baseVersion : visible && visible.version;
      var validBase = (typeof base === "number" || (typeof base === "string" && base.trim() !== ""))
        && Number.isSafeInteger(Number(base)) && Number(base) >= 0;
      var canWrite = () => validBase && targetCurrent() && navigationCurrent && navigationCurrent()
        && accountId === (window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id)
        && (!opts.isCurrent || opts.isCurrent())
        && String(window.CONSOLE_DATA.prose && window.CONSOLE_DATA.prose._bookId || "") === String(bookId || "")
        && Number(window.CONSOLE_DATA.prose && window.CONSOLE_DATA.prose.no) === Number(no)
        && Number(window.CONSOLE_DATA.prose && window.CONSOLE_DATA.prose.version) === Number(base);
      if (!canWrite()) throw navigationChangedError();
      var rev = await window.LF_API.bookChapterBodyRevision(bookId, no, revisionId);
      var text = window.LF_PORTAL.revisionBodyText(rev);
      if (!text) throw new Error("该版本没有可恢复的正文内容");
      var ver = rev && (rev.version != null ? rev.version : "");
      if (!canWrite()) throw navigationChangedError();
      await window.LF_PORTAL.saveProse(bookId, no, text, { baseVersion: Number(base), reason: "恢复正文版本" + (ver !== "" ? (" v" + ver) : "") });
      const refresh = portalResourceRefresh();
      if (refresh) {
        try { await refresh.refreshWrite("chapter_body", { bookId: bookId, chapterNumber: no }); } catch (error) {}
      }
      return text;
    },

    // ---- 建书资源修订记录 ----
    resourceRevisions(bookId, resourceType, resourceKey) {
      return window.LF_API.bookResourceRevisions(bookId, resourceType, resourceKey);
    },
    resourceRevision(bookId, resourceType, resourceKey, revisionId) {
      return window.LF_API.bookResourceRevision(bookId, resourceType, resourceKey, revisionId);
    },
    planningPackageRevisions(bookId, volumeNumber) {
      return window.LF_API.bookPlanningPackageRevisions(bookId, volumeNumber);
    },
    planningPackageRevision(bookId, volumeNumber, packageRevisionId) {
      return window.LF_API.bookPlanningPackageRevision(bookId, volumeNumber, packageRevisionId);
    },
    async restorePlanningPackageRevision(bookId, volumeNumber, revision, currentVersions) {
      var packageRevisionId = revision && revision.package_revision_id;
      var versions = currentVersions && typeof currentVersions === "object" ? currentVersions : {};
      if (!packageRevisionId || versions.volume == null || versions.near_term == null) {
        throw new Error("规划包版本信息不完整，请刷新后重试");
      }
      var result = await window.LF_API.restoreBookPlanningPackage(bookId, volumeNumber, {
        base_versions: { volume: Number(versions.volume), near_term: Number(versions.near_term) },
        target_package_revision_id: packageRevisionId,
        reason: "恢复本卷规划版本 v" + (Number(revision.package_version) || "")
      });
      publishOutlinePackageResult(bookId, volumeNumber, result);
      try { await refreshOutlinePackage(bookId, volumeNumber, captureCreateDataTarget(bookId)); } catch (e) {}
      return result;
    },
    async restoreResourceRevision(bookId, resourceType, resourceKey, revision) {
      var revisions = await window.LF_API.bookResourceRevisions(bookId, resourceType, resourceKey);
      var list = Array.isArray(revisions) ? revisions : [];
      var currentVersion = list.reduce(function (latest, item) {
        return Math.max(latest, Number(item && item.version) || 0);
      }, 0);
      var targetVersion = Number(revision && revision.version) || 0;
      if (!currentVersion || !targetVersion) throw new Error("修订版本信息不完整，请刷新后重试");
      return window.LF_API.restoreBookResource(bookId, resourceType, resourceKey, {
        base_version: currentVersion,
        target_version: targetVersion,
        reason: "恢复建书资源版本 v" + targetVersion
      });
    }
  };

  if (document && typeof document.addEventListener === "function") {
    ensureTaskSyncCoordination();
    window.addEventListener("storage", function (event) {
      if (!event || event.key !== TASK_SYNC_RESULT_KEY || !event.newValue) return;
      try { handleTaskSyncMessage(JSON.parse(event.newValue)); } catch (error) {}
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        releaseTaskSyncLeadership();
        return;
      }
      const snapshot = window.LF_PORTAL_STATE;
      if (!snapshot) return;
      window.LF_PORTAL.syncRunningTasks({ force: true }).catch(function () {});
    });
    window.addEventListener("pagehide", releaseTaskSyncLeadership);
  }

  // Hooks/debts are partial updates (UpdateHookRequest / UpdateDebtRequest), not
  // full replacement — only changed fields are sent.
  async function saveHooksDebts(bookId, patch) {
    var foreshadow = (patch && Array.isArray(patch.foreshadow)) ? patch.foreshadow : [];
    var debts = (patch && Array.isArray(patch.debts)) ? patch.debts : [];
    if (!foreshadow.some(item => item && item.id) && !debts.some(item => item && item.id)) return;
    await Promise.allSettled(
      foreshadow.filter(function (h) { return h && h.id; }).map(function (h) { return window.LF_API.updateHook(bookId, h.id, h); })
        .concat(debts.filter(function (d) { return d && d.id; }).map(function (d) { return window.LF_API.updateDebt(bookId, d.id, d); }))
    );
    const refresh = portalResourceRefresh();
    if (refresh) {
      try { await refresh.refreshWrite("hooks_debts", { bookId: bookId }); } catch (error) {}
    } else {
      const hit = bookCache.get(String(bookId));
      if (hit) hit.ts = 0;
    }
  }

  // Bootstrap: the synchronous applySnapshot above only restores the cached
  // localStorage snapshot. Without this, a freshly logged-in user (no cache)
  // stays on the static seed in data-console.js. Pull a live snapshot from the
  // backend and rerender once React has mounted (rerender no-ops until then).
  // clearMutableSeedData is deferred until the live snapshot succeeds, so the UI
  // falls back to the cached snapshot instead of going permanently blank when
  // the backend is unreachable.
  if (readTokens()) {
    portalReadyPromise = loadPortalSnapshot()
      .then(function (applied) {
        // applySnapshot inside loadPortalSnapshot already replaced shelf/book/
        // chapters with the live data — do NOT clearMutableSeedData here or it
        // wipes the books we just loaded and the shelf renders empty.
        if (applied) { rerender(); }
        else if (window.LF_AUTH_EXPIRED) { clearAuthState(); redirectToLogin(); }
        return applied;
      })
      .catch(function () {
        if (window.LF_AUTH_EXPIRED) { clearAuthState(); redirectToLogin(); }
        return false;
      });
  } else {
    // No token at all — no cached snapshot to fall back to; keep demo seed as
    // the only known-good state and mark auth as expired.
    clearAuthState();
  }

  document.documentElement.dataset.portalBridge = "ready";
})();
