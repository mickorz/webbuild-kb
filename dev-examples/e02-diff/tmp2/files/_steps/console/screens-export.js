{
/* ===== 通用作品导出对话框 ===== */
function exportVolumeGroups(chapters, outlines, en) {
  const rows = Array.isArray(outlines) ? outlines : [];
  const records = rows.filter(row => row && row.type === 'volume').map(row => {
    const content = row.content && typeof row.content === 'object' ? row.content : {};
    const range = content.chapter_range && typeof content.chapter_range === 'object' ? content.chapter_range : {};
    const rangeMatch = typeof content.chapter_range === 'string' ? content.chapter_range.match(/(\d+)\D+(\d+)/) : null;
    return {
      no: Number(row.volume_number != null ? row.volume_number : content.volume_number) || 0,
      title: content.title ? L(content.title) : '',
      start: Number(row.chapter_start != null ? row.chapter_start : content.chapter_start != null ? content.chapter_start : range.start != null ? range.start : rangeMatch && rangeMatch[1]) || 0,
      end: Number(row.chapter_end != null ? row.chapter_end : content.chapter_end != null ? content.chapter_end : range.end != null ? range.end : rangeMatch && rangeMatch[2]) || 0
    };
  }).filter(record => record.no > 0);
  const byNumber = new Map();
  records.forEach(record => byNumber.set(record.no, record));
  const normalized = Array.from(byNumber.values()).sort((a, b) => a.no - b.no);
  const available = normalized.length ? normalized : [{
    no: 1,
    title: '',
    start: 0,
    end: 0
  }];
  const groups = new Map(available.map(record => [record.no, {
    ...record,
    chapters: []
  }]));
  chapters.forEach(chapter => {
    let record = available.find(item => item.start > 0 && item.end >= item.start && chapter.no >= item.start && chapter.no <= item.end);
    if (!record) {
      const started = available.filter(item => item.start > 0 && item.start <= chapter.no);
      record = started[started.length - 1] || available[0];
    }
    groups.get(record.no).chapters.push(chapter);
  });
  return Array.from(groups.values()).filter(group => group.chapters.length).map(group => {
    const prefix = en ? `Volume ${group.no}` : `第 ${group.no} 卷`;
    return {
      ...group,
      label: group.title ? `${prefix} · ${group.title}` : prefix
    };
  });
}
function BookExportModal({
  book,
  currentChapter,
  defaultScope = 'all',
  onClose,
  toast
}) {
  const en = window.CLANG === 'en';
  const modalRef = React.useRef(null);
  const savingRef = React.useRef(false);
  const [chapters, setChapters] = React.useState([]);
  const [outlines, setOutlines] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [scope, setScope] = React.useState(defaultScope);
  const [selected, setSelected] = React.useState([]);
  const [organization, setOrganization] = React.useState('single');
  const [format, setFormat] = React.useState('docx');
  const currentNo = Number(currentChapter) || null;
  const bookTitle = typeof book.title === 'object' ? L(book.title) : String(book.title || '');
  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const outlinesRequest = window.LF_API.bookOutlines ? window.LF_API.bookOutlines(book.id).catch(() => []) : Promise.resolve([]);
    Promise.all([window.LF_API.bookChapters(book.id, true), outlinesRequest]).then(([payload, outlineRows]) => {
      if (!alive) return;
      const items = (payload && Array.isArray(payload.items) ? payload.items : []).map(item => ({
        no: Number(item.chapter_number),
        title: String(item.title || ''),
        words: Number(item.word_count) || 0
      })).filter(item => item.no > 0).sort((a, b) => a.no - b.no);
      setChapters(items);
      setOutlines(Array.isArray(outlineRows) ? outlineRows : []);
      const currentExists = currentNo && items.some(item => item.no === currentNo);
      const nextScope = defaultScope === 'current' && currentExists ? 'current' : 'all';
      setScope(nextScope);
      setSelected(currentExists ? [currentNo] : items[0] ? [items[0].no] : []);
    }).catch(err => {
      if (alive) setError(err && err.message ? err.message : en ? 'Unable to load chapters.' : '章节清单加载失败。');
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [book.id, currentNo, defaultScope, en]);
  React.useEffect(() => {
    const previous = document.activeElement;
    const timer = setTimeout(() => {
      const first = modalRef.current && modalRef.current.querySelector('button:not([disabled])');
      if (first) first.focus();
    }, 0);
    const keydown = event => {
      if (event.key === 'Escape' && !savingRef.current) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = Array.from(modalRef.current.querySelectorAll('button:not([disabled]),input:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', keydown);
      if (previous && previous.focus) previous.focus();
    };
  }, [onClose]);
  const chosen = scope === 'all' ? chapters.map(item => item.no) : scope === 'current' ? currentNo ? [currentNo] : [] : selected.filter(no => chapters.some(item => item.no === no));
  const volumeGroups = React.useMemo(() => exportVolumeGroups(chapters, outlines, en), [chapters, outlines, en]);
  const split = chosen.length > 1 && organization === 'split';
  const formatLabel = {
    docx: 'DOCX',
    txt: 'TXT',
    markdown: 'Markdown'
  }[format];
  const summary = en ? split ? `${chosen.length} chapters will be exported as separate ${formatLabel} files in one ZIP archive.` : organization === 'split' && chosen.length === 1 ? `Only one chapter is selected, so one ${formatLabel} file will be exported.` : `${chosen.length} chapter${chosen.length === 1 ? '' : 's'} will be exported as one ${formatLabel} file.` : split ? `将导出 ${chosen.length} 章为独立 ${formatLabel} 文件，并打包为 ZIP。` : organization === 'split' && chosen.length === 1 ? `当前仅选 1 章，将直接导出一个 ${formatLabel} 文件。` : `将导出 ${chosen.length} 章为一个 ${formatLabel} 文件。`;
  const toggleChapter = no => setSelected(value => value.includes(no) ? value.filter(item => item !== no) : [...value, no].sort((a, b) => a - b));
  const toggleVolume = numbers => setSelected(value => {
    const selectedSet = new Set(value);
    const remove = numbers.every(number => selectedSet.has(number));
    numbers.forEach(number => remove ? selectedSet.delete(number) : selectedSet.add(number));
    return Array.from(selectedSet).sort((a, b) => a - b);
  });
  const submit = async () => {
    if (!chosen.length || saving) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const result = await window.LF_API.downloadBookExport(book.id, {
        chapter_numbers: chosen,
        file_format: format,
        split_by_chapter: organization === 'split'
      });
      if (toast) toast(en ? `Downloaded ${result.filename}` : `已下载 ${result.filename}`);
      onClose();
    } catch (err) {
      const detail = err && err.body && err.body.detail;
      if (!en && detail && Array.isArray(detail.chapter_numbers)) {
        const numbers = detail.chapter_numbers.join('、');
        setError(detail.message === 'Some selected chapters have no body' ? `第 ${numbers} 章尚无正文，未生成导出文件。` : `第 ${numbers} 章不存在，请刷新章节清单后重试。`);
      } else setError(err && err.message ? err.message : en ? 'Export failed.' : '导出失败，请稍后重试。');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "export-scrim",
    onMouseDown: event => {
      if (event.target === event.currentTarget && !saving) onClose();
    }
  }, /*#__PURE__*/React.createElement("section", {
    className: "export-modal",
    ref: modalRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "export-title"
  }, /*#__PURE__*/React.createElement("header", {
    className: "export-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "export-kicker"
  }, en ? 'EXPORT WORK' : '导出作品'), /*#__PURE__*/React.createElement("h2", {
    id: "export-title"
  }, en ? bookTitle : `《${bookTitle}》`)), /*#__PURE__*/React.createElement("button", {
    className: "export-close",
    onClick: onClose,
    disabled: saving,
    "aria-label": en ? 'Close' : '关闭'
  }, "\xD7")), loading ? /*#__PURE__*/React.createElement("div", {
    className: "export-loading"
  }, /*#__PURE__*/React.createElement("span", {
    className: "export-spinner"
  }), en ? 'Loading chapters…' : '正在读取章节…') : /*#__PURE__*/React.createElement("div", {
    className: "export-body"
  }, /*#__PURE__*/React.createElement("fieldset", {
    className: "export-field"
  }, /*#__PURE__*/React.createElement("legend", null, en ? 'Chapters' : '导出范围'), /*#__PURE__*/React.createElement("div", {
    className: "export-options"
  }, currentNo && chapters.some(item => item.no === currentNo) && /*#__PURE__*/React.createElement("button", {
    "aria-pressed": scope === 'current',
    className: scope === 'current' ? 'on' : '',
    onClick: () => setScope('current')
  }, /*#__PURE__*/React.createElement("b", null, en ? 'Current' : '当前章'), /*#__PURE__*/React.createElement("span", null, en ? `Chapter ${currentNo}` : `第 ${currentNo} 章`)), /*#__PURE__*/React.createElement("button", {
    "aria-pressed": scope === 'selected',
    className: scope === 'selected' ? 'on' : '',
    onClick: () => setScope('selected')
  }, /*#__PURE__*/React.createElement("b", null, en ? 'Selected' : '指定章节'), /*#__PURE__*/React.createElement("span", null, en ? 'Choose multiple' : '可多选、不连续')), /*#__PURE__*/React.createElement("button", {
    "aria-pressed": scope === 'all',
    className: scope === 'all' ? 'on' : '',
    onClick: () => setScope('all')
  }, /*#__PURE__*/React.createElement("b", null, en ? 'All' : '全部章节'), /*#__PURE__*/React.createElement("span", null, en ? `${chapters.length} chapters` : `共 ${chapters.length} 章`)))), scope === 'selected' && /*#__PURE__*/React.createElement("div", {
    className: "export-chapter-picker"
  }, /*#__PURE__*/React.createElement("div", {
    className: "export-picker-head"
  }, /*#__PURE__*/React.createElement("span", null, en ? `${selected.length} selected` : `已选 ${selected.length} 章`), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelected(chapters.map(item => item.no))
  }, en ? 'Select all' : '全选'), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelected([])
  }, en ? 'Clear' : '清空'))), /*#__PURE__*/React.createElement("div", {
    className: "export-chapter-list"
  }, volumeGroups.map(group => {
    const numbers = group.chapters.map(item => item.no);
    const selectedCount = numbers.filter(number => selected.includes(number)).length;
    const allSelected = selectedCount === numbers.length;
    const partlySelected = selectedCount > 0 && !allSelected;
    return /*#__PURE__*/React.createElement("div", {
      className: "export-volume-group",
      key: group.no
    }, /*#__PURE__*/React.createElement("label", {
      className: "export-volume-head"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: allSelected,
      ref: node => {
        if (node) node.indeterminate = partlySelected;
      },
      onChange: () => toggleVolume(numbers)
    }), /*#__PURE__*/React.createElement("span", {
      className: "export-volume-title"
    }, group.label), /*#__PURE__*/React.createElement("span", {
      className: "export-volume-count"
    }, en ? `${numbers.length} chapters` : `${numbers.length} 章`)), /*#__PURE__*/React.createElement("div", {
      className: "export-volume-chapters"
    }, group.chapters.map(item => /*#__PURE__*/React.createElement("label", {
      key: item.no,
      className: selected.includes(item.no) ? 'on' : ''
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: selected.includes(item.no),
      onChange: () => toggleChapter(item.no)
    }), /*#__PURE__*/React.createElement("span", {
      className: "export-chapter-no"
    }, item.no), /*#__PURE__*/React.createElement("span", {
      className: "export-chapter-title"
    }, item.title || `${en ? 'Chapter' : '第'} ${item.no}${en ? '' : ' 章'}`), !!item.words && /*#__PURE__*/React.createElement("span", {
      className: "export-chapter-words"
    }, item.words.toLocaleString(), " ", en ? 'words' : '字')))));
  }))), /*#__PURE__*/React.createElement("fieldset", {
    className: "export-field"
  }, /*#__PURE__*/React.createElement("legend", null, en ? 'Files' : '文件组织'), /*#__PURE__*/React.createElement("div", {
    className: "export-options export-organizations"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-pressed": organization === 'single',
    className: organization === 'single' ? 'on' : '',
    onClick: () => setOrganization('single')
  }, /*#__PURE__*/React.createElement("b", null, en ? 'Single file' : '单文件'), /*#__PURE__*/React.createElement("span", null, en ? 'Combine selected chapters' : '合并所选章节')), /*#__PURE__*/React.createElement("button", {
    "aria-pressed": organization === 'split',
    className: organization === 'split' ? 'on' : '',
    onClick: () => setOrganization('split')
  }, /*#__PURE__*/React.createElement("b", null, en ? 'Multiple files' : '多文件'), /*#__PURE__*/React.createElement("span", null, en ? 'One chapter per file, zipped' : '每章一个，打包 ZIP')))), /*#__PURE__*/React.createElement("fieldset", {
    className: "export-field"
  }, /*#__PURE__*/React.createElement("legend", null, en ? 'Format' : '文件格式'), /*#__PURE__*/React.createElement("div", {
    className: "export-formats"
  }, [['docx', 'DOCX', en ? 'Best for editing' : '适合继续编辑'], ['txt', 'TXT', en ? 'Plain text' : '纯文本'], ['markdown', 'Markdown', en ? 'Structured text' : '保留标题结构']].map(item => /*#__PURE__*/React.createElement("button", {
    key: item[0],
    "aria-pressed": format === item[0],
    className: format === item[0] ? 'on' : '',
    onClick: () => setFormat(item[0])
  }, /*#__PURE__*/React.createElement("b", null, item[1]), /*#__PURE__*/React.createElement("span", null, item[2]))))), /*#__PURE__*/React.createElement("div", {
    className: "export-summary",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "download",
    s: 16
  }), /*#__PURE__*/React.createElement("span", null, chosen.length ? summary : en ? 'Select at least one chapter.' : '请至少选择一章。'))), error && /*#__PURE__*/React.createElement("div", {
    className: "export-error",
    role: "alert"
  }, error), /*#__PURE__*/React.createElement("footer", {
    className: "export-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn",
    onClick: onClose,
    disabled: saving
  }, en ? 'Cancel' : '取消'), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold",
    onClick: submit,
    disabled: loading || saving || !chosen.length
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "download",
    s: 14
  }), saving ? en ? 'Exporting…' : '正在导出…' : en ? 'Export' : '导出')))), document.body);
}
window.BookExportModal = BookExportModal;
}
