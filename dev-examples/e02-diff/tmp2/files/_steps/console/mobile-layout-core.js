/* Phone layout routing: which tab and page a console state shows, and where back leads.
   The phone frame keeps the desktop state model; `mPage` is the only phone-specific key. */
(function () {
  // Same width at which the assistant window already turns full-screen.
  const BREAKPOINT = 620;
  const QUERY = '(max-width: ' + BREAKPOINT + 'px)';
  const ME_SECTIONS = ['settings', 'assistant', 'admin', 'partnerships'];
  const BOOK_SECTIONS = ['workbench', 'writing', 'world', 'custom_settings'];

  function matches(media) {
    try { return !!(media && media(QUERY).matches); } catch (e) { return false; }
  }

  /** Bottom tab owning the state: shelf, write, inbox or me. */
  function tabOf(state) {
    if (!state || state.view !== 'book') return 'shelf';
    if (state.section === 'inbox') return 'inbox';
    if (ME_SECTIONS.includes(state.section)) return 'me';
    return 'write';
  }

  /**
   * Page inside the current tab.
   * write: home | directory | chapter | volumes | cruise | world | custom_settings
   * me: home | settings | assistant | admin | partnerships
   */
  function pageOf(state) {
    const tab = tabOf(state);
    if (tab === 'me') return state.mPage === 'home' || state.section === 'settings' && !state.mPage ? 'home' : state.section;
    if (tab !== 'write') return 'home';
    if (state.mPage === 'home') return 'home';
    if (state.mPage === 'directory') return 'directory';
    if (state.section === 'world' || state.section === 'custom_settings') return state.section;
    if (state.section === 'workbench' && state.wbMode === 'cruise') return 'cruise';
    if (state.section === 'workbench' && (state.tab === 'vol' || state.tab === 'brief')) return 'volumes';
    return 'chapter';
  }

  /** First-level pages show the tab bar; pushed pages show back and their own actions. */
  function isTopLevel(state) {
    return pageOf(state) === 'home';
  }

  /** State patch that shows a tab's first page, or null when the tab needs a book that is not loaded. */
  function tabTarget(tab, state, hasBook) {
    if (tab === 'shelf') return { view: 'shelf', mPage: 'home' };
    if (tab === 'inbox') return { view: 'book', section: 'inbox', mPage: 'home' };
    if (tab === 'me') return { view: 'book', section: 'settings', settingsTarget: null, mPage: 'home' };
    if (tab === 'write') {
      if (!hasBook) return null;
      const section = BOOK_SECTIONS.includes(state && state.section) ? state.section : 'workbench';
      return { view: 'book', section, mPage: 'home' };
    }
    return null;
  }

  /** Parent page for the back control and the system back gesture; null at a tab root. */
  function backTarget(state) {
    if (isTopLevel(state)) return null;
    const tab = tabOf(state);
    if (tab === 'me') return { section: 'settings', settingsTarget: null, mPage: 'home' };
    // The directory returns to the chapter it was opened from; every other book page returns to the work home.
    if (tab === 'write' && pageOf(state) === 'directory' && state.mDirFrom === 'chapter') return { mPage: 'chapter', mDirFrom: null, treeOpen: false };
    // A chapter opened from the volume page's outline level returns to that volume page and level.
    if (tab === 'write' && pageOf(state) === 'chapter' && (state.mVolFrom === 'vol' || state.mVolFrom === 'brief')) {
      return { section: 'workbench', tab: state.mVolFrom, wbMode: 'edit', mPage: 'volumes', mVolFrom: null, treeOpen: false };
    }
    if (tab === 'write') return { mPage: 'home', mDirFrom: null, treeOpen: false };
    return null;
  }

  /** Volumes the volume page can switch to. A volume with chapters opens through its first chapter, as the desktop tree
      does; one without chapters yet is shown directly (`viewed`), so a planned volume's outline is still readable. */
  function volumeChoices(volumes, chapters, chapterNumber, viewed) {
    const list = Array.isArray(volumes) ? volumes : [], rows = Array.isArray(chapters) ? chapters : [];
    const current = rows.find(item => Number(item.no) === Number(chapterNumber));
    const active = list.find(item => item.state === 'active');
    const shown = viewed != null && list.some(item => Number(item.vnum) === Number(viewed)) ? Number(viewed) : null;
    const selected = shown != null ? shown : current && current.vol != null ? Number(current.vol) : active ? Number(active.vnum) : list[0] && Number(list[0].vnum);
    return list.map(volume => {
      const first = rows.filter(item => Number(item.vol) === Number(volume.vnum)).sort((a, b) => a.no - b.no)[0];
      return { vnum: Number(volume.vnum), first: first ? Number(first.no) : null, on: Number(volume.vnum) === selected };
    });
  }

  /** Chapter page segment: outline (workbench detail) or prose (writing). */
  function chapterTarget(segment, chapterNumber) {
    const patch = segment === 'prose'
      ? { view: 'book', section: 'writing', mPage: 'chapter', treeOpen: false }
      : { view: 'book', section: 'workbench', tab: 'detail', wbMode: 'edit', mPage: 'chapter', treeOpen: false };
    if (chapterNumber != null) patch.chap = Number(chapterNumber);
    return patch;
  }

  /** Full-page chapter directory; `from` decides where back leads. */
  function directoryTarget(from) {
    return { mPage: 'directory', mDirFrom: from === 'chapter' ? 'chapter' : 'home', treeOpen: false };
  }

  /** Book pages opened from the work home. */
  function bookPageTarget(page) {
    if (page === 'volumes') return { view: 'book', section: 'workbench', tab: 'vol', wbMode: 'edit', mPage: 'volumes' };
    if (page === 'cruise') return { view: 'book', section: 'workbench', wbMode: 'cruise', mPage: 'cruise' };
    if (page === 'world' || page === 'custom_settings') return { view: 'book', section: page, mPage: page };
    return null;
  }

  /** Navigation identity without the phone page key; a change made elsewhere leaves the home page. */
  function navigationKey(state) {
    if (!state) return '';
    return [state.view, state.section, state.chap, state.tab, state.wbMode, state.bookId].join('|');
  }

  window.MobileLayoutCore = Object.freeze({
    BREAKPOINT, QUERY, matches, tabOf, pageOf, isTopLevel, tabTarget, backTarget, chapterTarget, directoryTarget, bookPageTarget, navigationKey, volumeChoices,
  });
})();
