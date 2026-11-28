(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantNavigation = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const DESTINATIONS = Object.freeze([
    "shelf",
    "create_book",
    "book_workbench",
    "chapter_outline",
    "chapter_body",
    "book_world",
    "book_custom_settings",
    "book_inbox",
    "book_settings",
    "assistant_memory", "assistant_workspace", "assistant_personalization", "assistant_settings"
  ]);
  const SECTION_BY_DESTINATION = Object.freeze({
    book_workbench: "workbench",
    chapter_outline: "workbench",
    chapter_body: "writing",
    book_world: "world",
    book_custom_settings: "custom_settings",
    book_inbox: "inbox",
    book_settings: "settings"
  });
  const CODES = Object.freeze({
    draft: "navigation_draft",
    changed: "navigation_target_changed",
    missing: "navigation_target_missing",
    loadFailed: "navigation_load_failed",
    blocked: "navigation_blocked"
  });

  let navigationEpoch = 0;

  function navigationError(code, message) {
    const error = new Error(message || code);
    error.code = code;
    return error;
  }

  function host() {
    return typeof window === "undefined" ? null : window;
  }

  function copy(ctx, key, fallback) {
    if (ctx && typeof ctx.TC === "function") {
      const text = ctx.TC(key);
      if (text) return text;
    }
    const win = host();
    if (win && typeof win.TC === "function") {
      const text = win.TC(key);
      if (text) return text;
    }
    return fallback || key;
  }

  function english(ctx) {
    if (ctx && ctx.lang) return ctx.lang === "en";
    const win = host();
    return !!(win && win.CLANG === "en");
  }

  function portalOf(ctx) {
    if (ctx && ctx.portal) return ctx.portal;
    if (ctx && typeof ctx.getPortal === "function") return ctx.getPortal();
    const win = host();
    return win && win.LF_PORTAL ? win.LF_PORTAL : null;
  }

  function streamOf(ctx) {
    if (ctx && ctx.stream) return ctx.stream;
    const win = host();
    return win && win.AssistantStreamCore ? win.AssistantStreamCore : null;
  }

  function citeOf(ctx) {
    if (ctx && ctx.cite) return ctx.cite;
    const win = host();
    return win && win.AssistantCiteCore ? win.AssistantCiteCore : null;
  }

  function apiOf(ctx) {
    if (ctx && ctx.api) return ctx.api;
    const win = host();
    return win && win.LF_API ? win.LF_API : null;
  }

  function dataOf(ctx) {
    if (ctx && typeof ctx.getData === "function") return ctx.getData() || {};
    if (ctx && ctx.data) return ctx.data;
    const win = host();
    return (win && win.CONSOLE_DATA) || {};
  }

  function stateOf(ctx) {
    if (ctx && typeof ctx.getState === "function") return ctx.getState() || {};
    return (ctx && ctx.state) || {};
  }

  function trimmedId(value) {
    if (value == null) return "";
    const text = String(value).trim();
    return text;
  }

  function positiveChapter(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : 0;
  }

  function destinationAllowed(destination, ctx) {
    if (!destination || DESTINATIONS.indexOf(destination) < 0) return false;
    const stream = streamOf(ctx);
    if (stream && typeof stream.isClientNavigationDestination === "function") {
      return stream.isClientNavigationDestination(destination);
    }
    return true;
  }

  function currentPageBookId(state, data) {
    const bookId = data && data.book && data.book.id ? String(data.book.id) : "";
    if (!bookId) return "";
    if (state && state.view === "book") return bookId;
    if (state && state.view === "create" && state.createResume
      && String(state.createResume.bookId || "") === bookId) {
      return bookId;
    }
    return "";
  }

  function loadedBookId(data) {
    return data && data.book && data.book.id ? String(data.book.id) : "";
  }

  function chapterHasGuide(chapter, ctx) {
    if (ctx && typeof ctx.chapterHasGuide === "function") return ctx.chapterHasGuide(chapter);
    return !!(chapter && (chapter.guide_ready === true
      || (chapter.guide_ready == null && chapter.state === "done")));
  }

  function generatedChapters(data, ctx) {
    return new Set((data && data.chapters || []).filter(function (chapter) {
      return chapterHasGuide(chapter, ctx);
    }).map(function (chapter) { return chapter.no; }));
  }

  function inferredChapter(data, fallback) {
    const bookId = loadedBookId(data);
    const detail = data && data.detail;
    const loadedChapter = detail && positiveChapter(detail.no);
    if (bookId && detail && String(detail._bookId || "") === bookId && loadedChapter) {
      return loadedChapter;
    }
    const fromBook = data && data.book && (data.book.current_chapter || data.book.chap);
    if (Number(fromBook) > 0) return Number(fromBook);
    const first = data && data.chapters && data.chapters.length ? data.chapters[0].no : 0;
    if (Number(first) > 0) return Number(first);
    return positiveChapter(fallback);
  }

  function outlineSnapshot(portal, bookId, chapterNumber, data) {
    if (portal && typeof portal.chapterDetailSnapshot === "function") {
      return portal.chapterDetailSnapshot(bookId, chapterNumber);
    }
    const detail = data && data.detail;
    if (detail && String(detail._bookId || "") === String(bookId || "")
      && Number(detail.no) === Number(chapterNumber)) {
      return JSON.parse(JSON.stringify(detail));
    }
    const copyDetail = detail ? JSON.parse(JSON.stringify(detail)) : {};
    if (!copyDetail.no) copyDetail.no = chapterNumber;
    return copyDetail;
  }

  function committedResult(destination, bookId, chapterNumber) {
    return {
      destination: destination,
      book_id: bookId || null,
      chapter_number: positiveChapter(chapterNumber) || null
    };
  }

  function captureGuard(ctx) {
    const cite = citeOf(ctx);
    const guard = cite && cite.editGuard;
    if (guard && typeof guard.captureNavigation === "function") {
      const captured = guard.captureNavigation();
      return captured || function () { return false; };
    }
    return function () { return true; };
  }

  function canLeavePage(ctx, navigationGuard) {
    const state = stateOf(ctx);
    return !!navigationGuard && navigationGuard()
      && !state.detSaving && !Object.keys(state.dirty || {}).length;
  }

  function draftError(ctx) {
    return navigationError(CODES.draft, copy(ctx, "asst_navigation_draft"));
  }

  function changedError(ctx) {
    return navigationError(CODES.changed, copy(ctx, "asst_navigation_target_changed"));
  }

  function loadFailure(ctx, error) {
    const status = Number(error && error.status) || 0;
    if (status === 404) {
      return navigationError(CODES.missing, english(ctx)
        ? "Book not found."
        : "没有找到目标作品。");
    }
    return navigationError(
      CODES.loadFailed,
      (error && error.message) || copy(ctx, "book_open_fail")
    );
  }

  function beginEpoch() {
    navigationEpoch += 1;
    return navigationEpoch;
  }

  async function loadOpenedBook(portal, bookId, options) {
    const opts = options || {};
    const shouldApply = opts.shouldApply;
    const chapterNumber = positiveChapter(opts.chapterNumber);
    const preferCache = !!opts.preferCache;
    // 跨作品助手跳转优先 loadBook({shouldApply, selectedChapter})，等读取完成再宣称成功。
    // 书架仍走 cache-first 的 selectBook；loadBook 尚未挂到 LF_PORTAL 时同样回退到它。
    if (preferCache && portal && typeof portal.selectBook === "function") {
      if (shouldApply && !shouldApply()) return false;
      const loaded = await portal.selectBook(bookId, { shouldApply: shouldApply });
      if (loaded === false || (shouldApply && !shouldApply())) return false;
      return loaded;
    }
    if (portal && typeof portal.loadBook === "function") {
      const loadOptions = { shouldApply: shouldApply };
      if (chapterNumber > 0) loadOptions.selectedChapter = chapterNumber;
      return portal.loadBook(bookId, loadOptions);
    }
    if (portal && typeof portal.selectBook === "function") {
      if (shouldApply && !shouldApply()) return false;
      const loaded = await portal.selectBook(bookId, { shouldApply: shouldApply });
      if (loaded === false || (shouldApply && !shouldApply())) return false;
      return loaded;
    }
    throw navigationError(CODES.loadFailed, opts.missingLoaderMessage || "navigation_load_failed");
  }

  async function ensureBookReady(ctx, bookId, chapterNumber, shouldApply, preferCache) {
    const portal = portalOf(ctx);
    const alreadyOpen = loadedBookId(dataOf(ctx)) === String(bookId)
      && stateOf(ctx).view === "book";
    if (!alreadyOpen) {
      let loaded;
      try {
        loaded = await loadOpenedBook(portal, bookId, {
          shouldApply: shouldApply,
          chapterNumber: chapterNumber,
          preferCache: preferCache,
          missingLoaderMessage: copy(ctx, "book_open_fail")
        });
      } catch (error) {
        if (error && error.code) throw error;
        throw loadFailure(ctx, error);
      }
      if (loaded === false) return false;
      if (loadedBookId(dataOf(ctx)) !== String(bookId)) {
        throw navigationError(CODES.missing, english(ctx)
          ? "Book not found."
          : "没有找到目标作品。");
      }
    }
    if (chapterNumber > 0 && portal && typeof portal.selectChapter === "function") {
      if (!(dataOf(ctx).chapters || []).some(chapter => Number(chapter.no) === chapterNumber)) {
        throw navigationError(CODES.missing, english(ctx) ? "Chapter not found." : "没有找到目标章节。");
      }
      const selected = await portal.selectChapter(chapterNumber, { isCurrent: shouldApply });
      if (selected === false) return false;
    }
    return { alreadyOpen: alreadyOpen };
  }

  function bookPagePatch(ctx, destination, bookId, chapterNumber, options) {
    const opts = options || {};
    const state = stateOf(ctx);
    const data = dataOf(ctx);
    const portal = portalOf(ctx);
    const section = SECTION_BY_DESTINATION[destination] || "workbench";
    const reuseChapter = !opts.fromShelf && !opts.crossBook && state.view === "book";
    const committedChap = chapterNumber > 0
      ? chapterNumber
      : (reuseChapter ? (positiveChapter(state.chap) || inferredChapter(data, 0)) : inferredChapter(data, state.chap));
    const patch = {
      view: "book",
      section: opts.fromShelf ? "workbench" : section,
      chap: committedChap,
      tab: destination === "chapter_outline" || opts.fromShelf || (destination === "book_workbench" && state.view !== "book")
        ? "detail"
        : (state.tab || "detail"),
      generated: generatedChapters(data, ctx),
      createResume: null,
      customSettingsTarget: null,
      drawSelectionTarget: null,
      chapterStateTarget: null
    };
    if (committedChap > 0) {
      patch.detail = outlineSnapshot(portal, bookId, committedChap, data);
    }
    return patch;
  }

  function showCapacityError(maxBooks, ctx) {
    const win = host();
    if (ctx && typeof ctx.showCapacityError === "function") {
      ctx.showCapacityError(maxBooks);
      return;
    }
    if (!win || !win.LF_ERROR) return;
    const en = english(ctx);
    const msg = en
      ? ("You have reached your plan's book limit (" + maxBooks + ").")
      : ("已达当前套餐的作品数量上限（" + maxBooks + " 本）。");
    win.LF_ERROR({ status: 403, body: { detail: msg } });
  }

  async function tryEnterCreate(ctx, beforeEnter) {
    const enterCreate = ctx && ctx.enterCreate;
    if (typeof enterCreate !== "function") {
      throw navigationError(CODES.blocked, english(ctx)
        ? "Cannot open book creation."
        : "无法进入建书。");
    }
    try {
      const api = apiOf(ctx);
      if (api && typeof api.billingCapacity === "function") {
        const cap = await api.billingCapacity();
        const books = cap && cap.books;
        if (books && books.max_books > 0 && books.owned >= books.max_books) {
          showCapacityError(books.max_books, ctx);
          return false;
        }
      }
    } catch (ignored) { /* 校验失败不阻塞，交由后端建书时兜底 */ }
    if (beforeEnter) beforeEnter();
    await enterCreate();
    return true;
  }

  function finishOverlay() {
    const win = host();
    const done = function () {
      if (win && win.LFOverlay) win.LFOverlay.hide();
    };
    if (win && win.requestAnimationFrame) win.requestAnimationFrame(done);
    else setTimeout(done, 0);
  }

  function restorePreviousBook(previous) {
    const win = host();
    try {
      if (previous.bookId) localStorage.setItem("lf_selected_book", previous.bookId);
      else localStorage.removeItem("lf_selected_book");
      if (previous.chapterId != null) localStorage.setItem("lf_selected_chapter", previous.chapterId);
      else localStorage.removeItem("lf_selected_chapter");
    } catch (ignored) {}
    const portal = win && win.LF_PORTAL;
    if (previous.snapshot && portal && portal.applySnapshot) {
      portal.applySnapshot(previous.snapshot);
      if (typeof portal.persistSnapshot === "function") {
        try { portal.persistSnapshot(previous.snapshot); } catch (ignored) {}
      } else {
        const cache = win && win.LF_PORTAL_CACHE;
        if (cache && typeof cache.writeSnapshot === "function") {
          try { cache.writeSnapshot(previous.snapshot); } catch (ignored) {}
        }
      }
      if (win.LF_RERENDER) win.LF_RERENDER();
    }
    if (win && win.LFOverlay) win.LFOverlay.hide();
  }

  function failOpen(error, previous, ctx) {
    restorePreviousBook(previous);
    const win = host();
    if (win && win.LF_ERROR && win.LF_ERROR.isBackendError && win.LF_ERROR.isBackendError(error)) {
      win.LF_ERROR(error);
      return;
    }
    if (ctx && typeof ctx.toast === "function") {
      ctx.toast((error && error.message) || copy(ctx, "book_open_fail"));
    }
  }

  function capturePreviousBook(data) {
    const win = host();
    let chapterId = null;
    try { chapterId = localStorage.getItem("lf_selected_chapter"); } catch (ignored) {}
    return {
      bookId: data && data.book && data.book.id,
      chapterId: chapterId,
      snapshot: win && win.LF_PORTAL_STATE
    };
  }

  function incompleteCreateStage(portal, book, hasChapters) {
    const win = host();
    // 路由判定走已加载数据（任务摘要与书架章节数），避免每次点击都阻塞在引擎往返上。
    // LF_PORTAL_STATE 为空说明后端不可达，此时不强拉进向导。
    if (!portal || !win || !win.LF_PORTAL_STATE || typeof portal.bookCreationStage !== "function") {
      return null;
    }
    const stage = portal.bookCreationStage(book.id);
    if (stage && !stage.complete && !hasChapters) return stage;
    return null;
  }

  function createResumePatch(bookId, stage, portal) {
    const cache = (host() || {}).LF_PORTAL_CACHE;
    if (cache && typeof cache.removeSnapshot === "function") {
      try { cache.removeSnapshot(); } catch (ignored) {}
    } else {
      try { localStorage.removeItem("lf_portal_snapshot"); } catch (ignored) {}
    }
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("lf_create_progress") || "null"); } catch (ignored) {}
    if (saved && saved.bookId !== bookId) saved = null;
    if (!saved && portal && portal.premiseFromBook) saved = portal.premiseFromBook(bookId);
    // 活动/失败任务直接停在对应步骤；没有运行或失败时才回到最后已完成步骤，避免打开书就自动开下一阶段。
    const fallbackStep = Math.max(0, Number(stage && stage.resumeStep || 1) - 1);
    const step = (stage && (stage.activeStep || stage.failedStep)) || (
      saved && typeof saved.step === "number" ? Math.min(saved.step, fallbackStep) : fallbackStep
    );
    return {
      view: "create",
      createResume: { step: step, bookId: bookId, saved: saved }
    };
  }

  async function openBookFromShelf(book, ctx) {
    if (!(book && book.id)) return null;
    const portal = portalOf(ctx);
    const data = dataOf(ctx);
    const previous = capturePreviousBook(data);
    const epoch = beginEpoch();
    const shouldApply = function () { return epoch === navigationEpoch; };
    const hasChapters = Number(book.chap || 0) > 0;
    let stage = incompleteCreateStage(portal, book, hasChapters);
    const win = host();

    if (stage) {
      if (win && win.LFOverlay) win.LFOverlay.show();
      try {
        const loaded = await loadOpenedBook(portal, book.id, {
          shouldApply: shouldApply,
          preferCache: true,
          missingLoaderMessage: copy(ctx, "book_open_fail")
        });
        if (!shouldApply()) return null;
        if (loaded === false) throw navigationError(CODES.loadFailed, copy(ctx, "book_open_fail"));
        // selectBook / loadBook 可能拉到比书架快照更新的任务状态，续建步骤必须基于刷新后的 latest attempt。
        stage = portal.bookCreationStage ? portal.bookCreationStage(book.id) : stage;
        ctx.set(createResumePatch(book.id, stage, portal));
        finishOverlay();
        return committedResult("create_book", book.id, null);
      } catch (error) {
        if (!shouldApply()) return null;
        failOpen(error, previous, ctx);
        return null;
      }
    }

    /* 成品书：统一全屏加载，必需数据到位后再进入工作台；失败留在书架。 */
    if (win && win.LFOverlay) win.LFOverlay.show();
    try {
      const loaded = await loadOpenedBook(portal, book.id, {
        shouldApply: shouldApply,
        preferCache: true,
        missingLoaderMessage: copy(ctx, "book_open_fail")
      });
      if (!shouldApply()) return null;
      if (loaded === false) throw navigationError(CODES.loadFailed, copy(ctx, "book_open_fail"));
      const latest = dataOf(ctx);
      if (Number(book.chap || 0) > 0 && !(latest.chapters && latest.chapters.length)) {
        throw navigationError(CODES.loadFailed, copy(ctx, "book_open_fail"));
      }
      const patch = bookPagePatch(ctx, "book_workbench", book.id, 0, { fromShelf: true, crossBook: true });
      if (!patch.chap) patch.chap = Number(book.chap || 0) || 1;
      if (patch.chap > 0 && !patch.detail) {
        patch.detail = outlineSnapshot(portal, book.id, patch.chap, latest);
      }
      ctx.set(patch);
      finishOverlay();
      return committedResult("book_workbench", book.id, patch.chap);
    } catch (error) {
      if (!shouldApply()) return null;
      failOpen(error, previous, ctx);
      return null;
    }
  }

  async function navigateFromAssistant(navigation, ctx) {
    const destination = String(navigation && navigation.destination || "");
    if (navigation && navigation.kind && navigation.kind !== "client_navigation") {
      throw navigationError(CODES.blocked, english(ctx)
        ? "Unsupported destination."
        : "暂不支持这个页面跳转。");
    }
    if (!destinationAllowed(destination, ctx)) {
      throw navigationError(CODES.blocked, english(ctx)
        ? "Unsupported destination."
        : "暂不支持这个页面跳转。");
    }

    const navigationGuard = captureGuard(ctx);
    const canNavigate = function () { return canLeavePage(ctx, navigationGuard); };
    if (!canNavigate()) throw draftError(ctx);
    const epoch = beginEpoch();
    const pageKey = () => {
      const state = stateOf(ctx);
      return JSON.stringify([state.view, state.section, state.tab, state.chap,
        state.createResume && state.createResume.bookId]);
    };
    const originPage = pageKey();
    const attached = () => !navigation || !navigation.isCurrent || navigation.isCurrent();
    const shouldApply = () => epoch === navigationEpoch && attached()
      && pageKey() === originPage && canNavigate();
    const assertCurrent = () => {
      if (epoch !== navigationEpoch || !attached() || pageKey() !== originPage) throw changedError(ctx);
      if (!canNavigate()) throw draftError(ctx);
    };
    const commit = async patch => {
      assertCurrent();
      await (ctx.commit ? ctx.commit(patch) : ctx.set(patch));
      if (epoch !== navigationEpoch || !attached()) throw changedError(ctx);
      if (ctx.commit && (stateOf(ctx).view !== patch.view
        || (patch.section && stateOf(ctx).section !== patch.section)
        || (patch.chap && Number(stateOf(ctx).chap) !== patch.chap))) throw changedError(ctx);
    };

    if (destination === "shelf") {
      const portal = portalOf(ctx);
      if (portal && portal.load && await portal.load({shouldApply}) === false) {
        assertCurrent();
        throw navigationError(CODES.loadFailed, copy(ctx, "book_open_fail"));
      }
      await commit({ view: "shelf", running: null, createResume: null });
      return committedResult("shelf", null, null);
    }

    if (destination === "create_book") {
      const entered = await tryEnterCreate(ctx, assertCurrent);
      if (!entered) {
        throw navigationError(CODES.blocked, english(ctx)
          ? "Cannot open book creation."
          : "无法进入建书。");
      }
      if (epoch !== navigationEpoch || !attached()) throw changedError(ctx);
      if (ctx.commit && stateOf(ctx).view !== "create") throw changedError(ctx);
      return committedResult("create_book", null, null);
    }

    const assistantTabs = { assistant_memory: "memory", assistant_workspace: "workspace",
      assistant_personalization: "personalization", assistant_settings: "usage" };
    if (assistantTabs[destination]) {
      await commit({ view: "book", section: "assistant",
        assistantTarget: { tab: assistantTabs[destination], request_id: epoch } });
      return committedResult(destination, null, null);
    }

    const requestedBookId = trimmedId(navigation && navigation.book_id);
    const currentBookId = currentPageBookId(stateOf(ctx), dataOf(ctx));
    const bookId = requestedBookId || currentBookId;
    if (!bookId) {
      throw navigationError(CODES.missing, english(ctx)
        ? "Choose a target book first."
        : "请先明确要打开哪本作品。");
    }

    const chapterNumber = positiveChapter(navigation && navigation.chapter_number);
    const chapterState = navigation && navigation.chapter_state;
    if (chapterState != null && (destination !== 'book_world' || !chapterNumber
      || !['world_state','character_state'].includes(chapterState))) {
      throw navigationError(CODES.missing, copy(ctx, 'book_open_fail'));
    }
    const roundId = navigation && navigation.round_id;
    if (roundId != null && (destination !== "chapter_body" || !chapterNumber
      || typeof roundId !== "string" || !roundId.trim() || roundId.length > 128)) {
      throw navigationError(CODES.missing, copy(ctx, "book_open_fail"));
    }
    const ready = await ensureBookReady(ctx, bookId, chapterNumber, shouldApply, false);
    assertCurrent();
    if (!ready) throw navigationError(CODES.loadFailed, copy(ctx, "book_open_fail"));

    if (loadedBookId(dataOf(ctx)) !== String(bookId)) {
      throw navigationError(CODES.missing, english(ctx)
        ? "Book not found."
        : "没有找到目标作品。");
    }

    const patch = bookPagePatch(ctx, destination, bookId, chapterNumber, {
      fromShelf: false,
      crossBook: !ready.alreadyOpen
    });
    if (chapterState) patch.chapterStateTarget = { bookId, chapterNumber, kind: chapterState, requestId: epoch };
    if (roundId) patch.drawSelectionTarget = { bookId, chapterNumber, roundId, requestId: epoch };
    if (destination === "book_custom_settings") {
      const api = apiOf(ctx);
      const cite = citeOf(ctx);
      const definitionRef = navigation.definition_ref;
      const validRef = (type, ref) => cite && cite.canonicalResourceKey(type, ref) === ref;
      if (navigation.entry_ref || (definitionRef && !validRef("custom_setting_definition", definitionRef))) {
        throw navigationError(CODES.missing, copy(ctx, "book_open_fail"));
      }
      try {
        let definition = definitionRef;
        if (definition) {
          const resource = await api.bookCustomSettingDefinition(bookId, definition);
          assertCurrent();
          if (resource.definition_ref !== definition) throw navigationError(CODES.missing, copy(ctx, "book_open_fail"));
        }
        patch.customSettingsTarget = { bookId, definition_ref: definition || null,
          request_id: epoch };
      } catch (error) {
        assertCurrent();
        if (error && error.code) throw error;
        throw loadFailure(ctx, error);
      }
    }
    await commit(patch);
    return committedResult(destination, bookId,
      destination === "chapter_body" || destination === "chapter_outline" ? patch.chap : null);
  }

  return {
    DESTINATIONS: DESTINATIONS,
    SECTION_BY_DESTINATION: SECTION_BY_DESTINATION,
    CODES: CODES,
    navigationError: navigationError,
    tryEnterCreate: tryEnterCreate,
    loadOpenedBook: loadOpenedBook,
    openBookFromShelf: openBookFromShelf,
    navigateFromAssistant: navigateFromAssistant
  };
});
