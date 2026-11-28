{
/* Phone work home and chapter directory (FD-176). They read the same console data as the desktop
   workbench and tree; only the presentation is phone-specific. */
(function () {
  const {
    useState
  } = React;
  const D = window.CONSOLE_DATA,
    L = window.L,
    TC = window.TC;
  const en = () => window.CLANG === 'en';

  // Only a parsed genre is shown; the raw field falls back to a generic placeholder when empty.
  function genreOf(book) {
    const parts = book && Array.isArray(book.genre_parts) ? book.genre_parts : [];
    return parts.length ? L(parts[0].value) : '';
  }
  function chapterNumber(no) {
    return en() ? 'Ch. ' + no : '第 ' + no + ' 章';
  }
  function chapterName(chapter) {
    const title = chapter && L(chapter.title);
    return title && title !== '—' ? title : '';
  }

  /** Phone label for a chapter's production state, from the same fields the desktop tree uses. */
  // Same rule as the writing page's finalized state, so the list never disagrees with the chapter.
  function finalized(chapter) {
    if (chapter.post_hoc_ready === true || chapter.post_hoc_status === 'completed') return true;
    const portal = window.LF_PORTAL,
      book = D.book;
    return !!(portal && portal.chapterFinalized && book && book.id && portal.chapterFinalized(book.id, chapter.no));
  }
  function chapterStage(chapter) {
    if (!chapter) return {
      key: 'todo',
      label: ''
    };
    if (chapter.state === 'done') return finalized(chapter) ? {
      key: 'final',
      label: en() ? 'Final' : '定稿'
    } : {
      key: 'prose',
      label: en() ? 'Prose' : '正文'
    };
    if (chapter.state === 'writing' && chapter.guide_ready === true) return {
      key: 'outline',
      label: en() ? 'Outline' : '细纲'
    };
    if (chapter.state === 'writing') return {
      key: 'pending',
      label: en() ? 'In progress' : '待生成'
    };
    return {
      key: 'todo',
      label: en() ? 'Not started' : '未生成'
    };
  }
  function currentChapter(state) {
    const chapters = D.chapters || [];
    return chapters.find(chapter => Number(chapter.no) === Number(state.chap)) || chapters.find(chapter => chapter.state !== 'done') || chapters[chapters.length - 1] || null;
  }
  function StageChip({
    chapter
  }) {
    const stage = chapterStage(chapter);
    return stage.label ? /*#__PURE__*/React.createElement("span", {
      className: 'm-stage m-stage--' + stage.key
    }, stage.label) : null;
  }
  function ChapterRow({
    chapter,
    current,
    onOpen
  }) {
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: 'm-chapter-row' + (current ? ' is-current' : ''),
      "aria-current": current ? 'true' : undefined,
      onClick: () => onOpen(chapter)
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-chapter-no"
    }, chapterNumber(chapter.no)), /*#__PURE__*/React.createElement("span", {
      className: "m-chapter-name"
    }, chapterName(chapter) || '—'), chapter.words ? /*#__PURE__*/React.createElement("span", {
      className: "m-chapter-words"
    }, chapter.words) : null, /*#__PURE__*/React.createElement(StageChip, {
      chapter: chapter
    }));
  }
  function MobileBookHome({
    state,
    nav
  }) {
    const book = D.book || {};
    const shelfEntry = (D.shelf || []).find(entry => String(entry.id) === String(book.id));
    const chapters = D.chapters || [];
    const current = currentChapter(state);
    const done = chapters.filter(chapter => chapter.state === 'done').length;
    const next = current ? chapters.find(chapter => Number(chapter.no) > Number(current.no) && chapter.state !== 'done') : null;
    const hasProse = !!(current && current.state === 'done');
    const volume = (D.volumes || []).find(item => item.state === 'active');
    const index = current ? chapters.indexOf(current) : -1;
    const recent = index < 0 ? chapters.slice(0, 4) : chapters.slice(Math.max(0, index - 1), Math.max(0, index - 1) + 4);
    const meta = [genreOf(shelfEntry || book), volume ? L(volume.no) + ' ' + L(volume.name) : ''].filter(Boolean).join(' · ');
    const open = chapter => nav.openChapter(chapter.state === 'done' ? 'prose' : 'outline', chapter.no);
    return /*#__PURE__*/React.createElement("div", {
      className: "m-home"
    }, meta ? /*#__PURE__*/React.createElement("div", {
      className: "m-home-meta"
    }, meta) : null, current ? /*#__PURE__*/React.createElement("section", {
      className: "m-continue",
      "aria-label": en() ? 'Continue writing' : '继续写作'
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-continue-label"
    }, en() ? 'Continue writing' : '继续写作'), /*#__PURE__*/React.createElement("span", {
      className: "m-continue-title c-serif"
    }, chapterNumber(current.no), "\u3000", chapterName(current)), /*#__PURE__*/React.createElement("span", {
      className: "m-continue-meta"
    }, chapterStage(current).label, current.words ? ' · ' + current.words + (en() ? '' : ' 字') : ''), /*#__PURE__*/React.createElement("div", {
      className: "m-continue-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: 'c-btn' + (hasProse ? '' : ' gold'),
      onClick: () => nav.openChapter('outline', current.no)
    }, en() ? 'Outline' : '看细纲'), hasProse ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold",
      onClick: () => nav.openChapter('prose', current.no)
    }, en() ? 'Read prose' : '读正文') : null)) : null, chapters.length ? /*#__PURE__*/React.createElement("section", {
      className: "m-card m-progress"
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-progress-top"
    }, /*#__PURE__*/React.createElement("span", {
      className: "m-card-title"
    }, en() ? 'Progress' : '写作进度'), /*#__PURE__*/React.createElement("span", {
      className: "m-muted"
    }, done, " / ", chapters.length, " ", en() ? 'ch' : '章', book.words ? ' · ' + L(book.words) + ' ' + TC('words_unit') : '')), /*#__PURE__*/React.createElement("div", {
      className: "m-meter",
      role: "meter",
      "aria-valuemin": "0",
      "aria-valuemax": chapters.length,
      "aria-valuenow": done,
      "aria-label": en() ? 'Chapters with prose' : '已成文章节'
    }, /*#__PURE__*/React.createElement("i", {
      style: {
        width: Math.round(done / chapters.length * 100) + '%'
      }
    })), next ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-progress-next",
      onClick: () => open(next)
    }, /*#__PURE__*/React.createElement("span", null, en() ? 'Next: ' : '下一章：', chapterNumber(next.no), " ", chapterName(next)), /*#__PURE__*/React.createElement(StageChip, {
      chapter: next
    })) : null) : null, /*#__PURE__*/React.createElement("div", {
      className: "m-group"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-row",
      onClick: () => nav.openBookPage('cruise')
    }, /*#__PURE__*/React.createElement("span", null, en() ? 'Cruise' : '巡航'), /*#__PURE__*/React.createElement("span", {
      className: "m-row-chevron",
      "aria-hidden": "true"
    }, "\u203A"))), recent.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h2", {
      className: "m-section-label"
    }, en() ? 'Chapters' : '最近章节'), /*#__PURE__*/React.createElement("div", {
      className: "m-group"
    }, recent.map(chapter => /*#__PURE__*/React.createElement(ChapterRow, {
      key: chapter.no,
      chapter: chapter,
      current: current && chapter.no === current.no,
      onOpen: open
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-row m-row-more",
      onClick: () => nav.openDirectory('home')
    }, en() ? 'All ' + chapters.length + ' chapters' : '全部 ' + chapters.length + ' 章', " \u203A"))) : null, /*#__PURE__*/React.createElement("h2", {
      className: "m-section-label"
    }, en() ? 'Materials' : '作品资料'), /*#__PURE__*/React.createElement("div", {
      className: "m-group"
    }, [['volumes', en() ? 'Volumes' : '卷纲', (D.volumes || []).length ? D.volumes.length + (en() ? ' vol' : ' 卷') : ''], ['world', TC('world'), ''], ['custom_settings', TC('custom_settings'), '']].map(([key, label, value]) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: key,
      className: "m-row",
      onClick: () => nav.openBookPage(key)
    }, /*#__PURE__*/React.createElement("span", null, label), value ? /*#__PURE__*/React.createElement("span", {
      className: "m-row-value"
    }, value) : null, /*#__PURE__*/React.createElement("span", {
      className: "m-row-chevron",
      "aria-hidden": "true"
    }, "\u203A")))));
  }
  const FILTERS = [['all', '全部', 'All'], ['todo', '待写', 'To write'], ['done', '已成文', 'Written']];
  function MobileDirectory({
    state,
    nav
  }) {
    const chapters = D.chapters || [];
    const current = currentChapter(state);
    const [filter, setFilter] = useState('all');
    // While filtering every group starts open; a tap still folds it, and changing the filter reopens them.
    const [filterClosed, setFilterClosed] = useState(() => new Set());
    const groups = (D.volumes || []).length ? D.volumes.map(volume => ({
      key: 'v' + (volume.vnum != null ? volume.vnum : L(volume.no)),
      title: L(volume.no) + ' · ' + L(volume.name),
      chapters: chapters.filter(chapter => volume.vnum == null || chapter.vol == null || chapter.vol === volume.vnum)
    })) : [{
      key: 'all',
      title: en() ? 'Chapters' : '全部章节',
      chapters
    }];
    const holding = group => current && group.chapters.some(chapter => chapter.no === current.no);
    const [openGroups, setOpenGroups] = useState(() => new Set(groups.filter(holding).map(group => group.key).concat(groups.length === 1 ? [groups[0].key] : [])));
    const visible = chapter => filter === 'all' || (filter === 'done' ? chapter.state === 'done' : chapter.state !== 'done');
    const count = key => chapters.filter(chapter => key === 'all' || (key === 'done' ? chapter.state === 'done' : chapter.state !== 'done')).length;
    const pick = chapter => nav.pickChapter(chapter, state.mDirFrom === 'chapter' ? state.section === 'writing' ? 'prose' : 'outline' : chapter.state === 'done' ? 'prose' : 'outline');
    (window.useMobileChrome || (() => {}))(current ? {
      key: 'directory',
      primary: [{
        key: 'current',
        label: (en() ? 'Back to ' : '回到当前：') + chapterNumber(current.no),
        onClick: () => pick(current)
      }]
    } : null);
    const flip = key => previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);else next.add(key);
      return next;
    };
    const toggle = key => (filter === 'all' ? setOpenGroups : setFilterClosed)(flip(key));
    return /*#__PURE__*/React.createElement("div", {
      className: "m-directory"
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-filters",
      role: "group",
      "aria-label": en() ? 'Filter chapters' : '筛选章节'
    }, FILTERS.map(([key, zh, english]) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: key,
      "aria-pressed": filter === key,
      className: filter === key ? 'on' : '',
      onClick: () => {
        setFilter(key);
        setFilterClosed(new Set());
      }
    }, en() ? english : zh, " ", count(key)))), groups.map(group => {
      const rows = group.chapters.filter(visible);
      const opened = filter === 'all' ? openGroups.has(group.key) : !filterClosed.has(group.key);
      const written = group.chapters.filter(chapter => chapter.state === 'done').length;
      return /*#__PURE__*/React.createElement("section", {
        key: group.key,
        className: "m-dir-group"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "m-dir-head",
        "aria-expanded": opened,
        onClick: () => toggle(group.key)
      }, /*#__PURE__*/React.createElement("span", null, group.title), /*#__PURE__*/React.createElement("span", {
        className: "m-muted"
      }, written, " / ", group.chapters.length), /*#__PURE__*/React.createElement("span", {
        "aria-hidden": "true"
      }, opened ? '▾' : '▸')), opened && rows.length ? /*#__PURE__*/React.createElement("div", {
        className: "m-group"
      }, rows.map(chapter => /*#__PURE__*/React.createElement(ChapterRow, {
        key: chapter.no,
        chapter: chapter,
        current: current && chapter.no === current.no,
        onOpen: pick
      }))) : null);
    }));
  }

  // A volume without an outline yet: its name, that it is not generated, and the existing pre-generation entry.
  function MobilePlannedVolume({
    volume,
    toast
  }) {
    if (!volume) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "m-planned-volume"
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-planned-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "c-latin"
    }, L(volume.no)), /*#__PURE__*/React.createElement("b", null, L(volume.name))), /*#__PURE__*/React.createElement("p", {
      className: "m-muted"
    }, en() ? 'This volume has no outline yet. It is generated when writing reaches it.' : '这一卷的卷纲还没有生成，写到本卷时会自动生成。'), volume.state === 'plan' && window.PreGenVol ? /*#__PURE__*/React.createElement(window.PreGenVol, {
      toast: toast,
      book: D.book && D.book.id,
      volNo: volume.vnum
    }) : null);
  }

  // Volume page: one row of volumes.
  function MobileVolumeSwitch({
    state,
    onPick
  }) {
    const volumes = D.volumes || [];
    if (volumes.length < 2) return null;
    const choices = window.MobileLayoutCore.volumeChoices(volumes, D.chapters, state.chap, state.mVol);
    return /*#__PURE__*/React.createElement("div", {
      className: "m-filters m-vol-switch",
      role: "group",
      "aria-label": en() ? 'Volume' : '切换卷'
    }, choices.map((choice, index) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: choice.vnum,
      "aria-pressed": choice.on,
      className: choice.on ? 'on' : '',
      onClick: () => {
        if (!choice.on) onPick(choice);
      }
    }, L(volumes[index].no) || (en() ? 'Vol. ' + choice.vnum : '卷' + choice.vnum))));
  }
  window.MobileBookHome = MobileBookHome;
  window.MobileVolumeSwitch = MobileVolumeSwitch;
  window.MobilePlannedVolume = MobilePlannedVolume;
  window.MobileDirectory = MobileDirectory;
  window.MobileBookCore = Object.freeze({
    chapterStage,
    genreOf
  });
})();
}
