{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* ===== 通用结构化编辑层 · 跨页面一致的编辑体验 =====
   StructuredEditor: 按数据形状渲染对用户友好的编辑器（字符串/字符串列表/对象/
   对象数组），带增删，绝不暴露 JSON。useResourceEditor: 统一加载 / 精确路径写入 /
   乐观锁冲突刷新。adapters: 每个可编辑资源一份薄封装。
   依赖运行时全局: React、Icon、window.L、window.LF_PORTAL（脚本顺序保证就绪）。 */
(function () {
  const L = window.L;
  const {
    useState,
    useEffect,
    useRef
  } = React;
  const {
    RewriteDiff,
    InlineTextDiff,
    InlineListDiff,
    InlineStructuredDiff
  } = window.LF_REWRITE_DIFF;
  const Undo = window.LF_REWRITE_UNDO;
  const ContentActionButton = window.ContentActionButton;
  const EditActionButton = window.EditActionButton;
  const DoneActionButton = window.DoneActionButton;
  const CardCollection = window.CardCollection;
  const useCardCollectionState = window.useCardCollectionState;
  const errMsg = e => String(e && e.message || e || '');
  const labelOf = k => window.LF_PORTAL && LF_PORTAL.fieldLabel ? LF_PORTAL.fieldLabel(k) : {
    zh: String(k),
    en: String(k)
  };
  const isPlainObject = v => v && typeof v === 'object' && !Array.isArray(v);
  const STRUCTURED_KEY_STYLES = {
    world_anchor: {
      embodies_rule: {
        keyColor: 'var(--gold-deep)'
      },
      shaped_by_rule: {
        keyColor: 'var(--slate)'
      },
      may_challenge_rule: {
        keyColor: 'var(--terra)',
        variant: 'dashed'
      }
    }
  };
  const structuredKeyStyles = fieldKey => STRUCTURED_KEY_STYLES[fieldKey] || null;
  function cloneRewriteValue(value) {
    if (value === undefined) return undefined;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      return value;
    }
  }
  function previewBlock(block, value) {
    const portal = window.LF_PORTAL;
    if (Array.isArray(value) && value.length === 0 && block && block.type !== 'text') {
      return Object.assign({}, block, {
        items: []
      });
    }
    if (portal && portal.contentBlocks && block && block.key) {
      const mapped = portal.contentBlocks({
        [block.key]: value
      }, []);
      if (mapped && mapped[0]) return Object.assign({}, mapped[0], {
        key: block.key,
        k: block.k
      });
    }
    return block;
  }

  /* ---- 空值判定 / 清理 / 残缺校验（数组项级，全页面一致） ---- */
  function isBlankVal(v) {
    if (v == null) return true;
    if (typeof v === 'string') return v.trim() === '';
    if (typeof v === 'number' || typeof v === 'boolean') return false;
    if (Array.isArray(v)) return v.every(isBlankVal);
    if (typeof v === 'object') return Object.keys(v).length === 0 || Object.values(v).every(isBlankVal);
    return false;
  }
  /* 保存时剔除完全为空的数组项（对象项/字符串项均适用） */
  function pruneBlanks(value) {
    return Array.isArray(value) ? value.filter(it => !isBlankVal(it)) : value;
  }
  /* 残缺项：对象数组里「写了一部分、还有字段为空」的项 → 返回其 1-based 序号，用于阻止退出 */
  function findIncomplete(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    value.forEach((it, i) => {
      if (isPlainObject(it)) {
        const vals = Object.values(it);
        if (vals.some(isBlankVal) && vals.some(x => !isBlankVal(x))) out.push(i + 1);
      }
    });
    return out;
  }

  /* ---- 叶子文本：点击进入编辑，失焦 / Enter 提交，Esc 取消 ---- */
  function LeafText({
    value,
    onChange,
    placeholder,
    multiline = true
  }) {
    const AutoGrowTextarea = window.AutoGrowTextarea;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const ref = useRef(null);
    const cur = value == null ? '' : String(value);
    const open = () => {
      setDraft(cur);
      setEditing(true);
      setTimeout(() => {
        const t = ref.current;
        if (t) {
          t.focus();
          t.setSelectionRange(t.value.length, t.value.length);
        }
      }, 10);
    };
    const commit = () => {
      setEditing(false);
      if (draft !== cur) onChange(draft);
    };
    if (!editing) {
      return /*#__PURE__*/React.createElement("div", {
        className: "se-leaf",
        onClick: open,
        title: L({
          zh: '点击编辑',
          en: 'Click to edit'
        })
      }, cur === '' ? /*#__PURE__*/React.createElement("span", {
        className: "se-empty"
      }, placeholder || L({
        zh: '空 · 点击填写',
        en: 'Empty · click to fill'
      })) : cur, /*#__PURE__*/React.createElement("span", {
        className: "se-pen"
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "pen",
        s: 10
      })));
    }
    // 实时上抛每次按键：上层「完成」按钮用 onMouseDown 阻止失焦（保留焦点），
    // 退出(finish)在 mousedown 阶段先于 blur 触发——若只在 blur 提交，退出时拿到的是
    // 旧值，编辑被丢弃。改为每次输入即上抛，退出时上层永远读到最新值。
    return /*#__PURE__*/React.createElement(AutoGrowTextarea, {
      ref: ref,
      className: "se-ta",
      value: draft,
      onChange: e => {
        const v = e.target.value;
        setDraft(v);
        if (v !== cur) onChange(v);
      },
      onBlur: commit,
      onKeyDown: e => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setEditing(false);
        }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Enter' && !e.shiftKey && !multiline) {
          e.preventDefault();
          commit();
        }
      }
    });
  }

  /* ---- 字符串列表：每条一行 + 删除 + 添加 ---- */
  function ListEditor({
    items,
    onChange
  }) {
    const arr = Array.isArray(items) ? items : [];
    const StructuredList = window.StructuredList;
    return /*#__PURE__*/React.createElement(StructuredList, {
      mode: "list",
      items: arr,
      embedded: true,
      onDraftChange: onChange
    });
  }

  /* ---- 对象：逐字段（键→标签，值→递归） ---- */
  function ObjectEditor({
    obj,
    onChange,
    depth,
    keyStyles
  }) {
    const o = isPlainObject(obj) ? obj : {};
    const keys = Object.keys(o);
    const StructuredList = window.StructuredList;
    const rows = keys.map(key => Object.assign({
      key,
      label: labelOf(key),
      value: o[key]
    }, keyStyles && keyStyles[key]));
    return /*#__PURE__*/React.createElement(StructuredList, {
      mode: "kv",
      items: rows,
      embedded: true,
      onDraftChange: nextRows => onChange(Object.fromEntries(nextRows.map(row => [row.key, row.value]))),
      renderEditValue: (value, _row, _index, change) => /*#__PURE__*/React.createElement(StructuredEditor, {
        value: value,
        onChange: change,
        depth: (depth || 0) + 1
      })
    });
  }

  /* ---- 对象数组：卡片 + 卡内逐字段 + 删卡 + 添卡 ---- */
  function CardsEditor({
    items,
    onChange,
    depth
  }) {
    const arr = Array.isArray(items) ? items : [];
    const template = () => {
      const base = arr.find(isPlainObject) || {};
      const o = {};
      Object.keys(base).forEach(k => {
        o[k] = Array.isArray(base[k]) ? [] : isPlainObject(base[k]) ? {} : '';
      });
      return o;
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "se-cards"
    }, arr.map((it, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "se-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "se-card-h"
    }, /*#__PURE__*/React.createElement("span", {
      className: "se-card-no c-latin"
    }, "#", i + 1), /*#__PURE__*/React.createElement(ContentActionButton, {
      variant: "remove",
      onClick: () => onChange(arr.filter((_, j) => j !== i)),
      title: L({
        zh: '删除本项',
        en: 'Delete'
      }),
      "aria-label": L({
        zh: '删除本项',
        en: 'Delete item'
      })
    }, "\xD7")), /*#__PURE__*/React.createElement(ObjectEditor, {
      obj: it,
      onChange: v => onChange(arr.map((x, j) => j === i ? v : x)),
      depth: (depth || 0) + 1
    }))), /*#__PURE__*/React.createElement(ContentActionButton, {
      variant: "add",
      icon: "plus",
      onClick: () => onChange(arr.concat([template()]))
    }, L({
      zh: '添加一项',
      en: 'Add item'
    })));
  }
  function cardTitleEntry(item) {
    if (!isPlainObject(item)) return null;
    const entries = Object.entries(item);
    return entries.find(([key]) => /name|title|名|标题|key/i.test(key)) || entries[0] || null;
  }
  function cardTitleText(item, index) {
    const entry = cardTitleEntry(item),
      value = entry && entry[1];
    if (value && typeof value === 'object' && !Array.isArray(value) && (value.zh != null || value.en != null)) {
      const localized = L(value);
      if (localized != null && String(localized).trim()) return String(localized);
    }
    if (value != null && typeof value !== 'object' && String(value).trim()) return String(value);
    if (!isPlainObject(item) && item != null && String(item).trim()) return String(item);
    return L({
      zh: '未命名 ' + (index + 1),
      en: 'Untitled ' + (index + 1)
    });
  }
  function blankCardFrom(items) {
    const base = (Array.isArray(items) ? items : []).find(isPlainObject);
    if (!base) return {
      name: ''
    };
    const next = {};
    Object.keys(base).forEach(key => {
      const value = base[key];
      next[key] = Array.isArray(value) ? [] : isPlainObject(value) ? Object.fromEntries(Object.keys(value).map(child => [child, ''])) : '';
    });
    return next;
  }
  function orderedCardEntries(item, rowOrder, keepAllFields) {
    const entries = isPlainObject(item) ? Object.entries(item) : [];
    const title = keepAllFields ? null : cardTitleEntry(item);
    const rows = entries.filter(([key]) => !title || key !== title[0]);
    if (!Array.isArray(rowOrder) || !rowOrder.length) return {
      title,
      rows
    };
    const positions = new Map(rowOrder.map((key, index) => [key, index]));
    return {
      title,
      rows: rows.map((entry, index) => ({
        entry,
        index,
        position: positions.has(entry[0]) ? positions.get(entry[0]) : rowOrder.length + index
      })).sort((a, b) => a.position - b.position || a.index - b.index).map(item => item.entry)
    };
  }
  function cardEditorVariant(items, rowOrder, singleObject) {
    if (singleObject || !Array.isArray(items) || !items.length) return 'uniform';
    const reference = orderedCardEntries(items[0], rowOrder).rows.map(([key]) => key);
    return items.every(item => {
      const keys = orderedCardEntries(item, rowOrder).rows.map(([key]) => key);
      return keys.length === reference.length && keys.every((key, index) => key === reference[index]);
    }) ? 'uniform' : 'waterfall';
  }
  function CardEditorCard({
    item,
    index,
    rowOrder,
    onUpdate,
    onDelete,
    compact,
    singleObject,
    blockTitle
  }) {
    const entries = orderedCardEntries(item, rowOrder, singleObject),
      title = entries.title;
    const updateField = (key, value) => onUpdate(index, Object.assign({}, item, {
      [key]: value
    }));
    return /*#__PURE__*/React.createElement("article", {
      className: compact ? 'dbk-card-reader-card' : 'dbk-card-reader-detail'
    }, /*#__PURE__*/React.createElement("div", {
      className: compact ? 'dbk-card-reader-card-head' : 'dbk-card-reader-detail-head'
    }, singleObject ? /*#__PURE__*/React.createElement("h3", {
      className: "c-serif"
    }, L(blockTitle)) : /*#__PURE__*/React.createElement("div", {
      className: "dbk-card-editor-title"
    }, title ? /*#__PURE__*/React.createElement(StructuredEditor, {
      value: title[1],
      onChange: value => updateField(title[0], value)
    }) : /*#__PURE__*/React.createElement("span", {
      className: "se-empty"
    }, cardTitleText(item, index))), !singleObject && /*#__PURE__*/React.createElement(ContentActionButton, {
      variant: "danger",
      icon: "trash",
      className: "dbk-card-reader-delete",
      onMouseDown: event => event.preventDefault(),
      onClick: () => onDelete(index)
    }, L({
      zh: '删除',
      en: 'Delete'
    }))), /*#__PURE__*/React.createElement("div", {
      className: "dbk-card-reader-fields"
    }, isPlainObject(item) ? entries.rows.map(([key, value]) => /*#__PURE__*/React.createElement("div", {
      key: key,
      className: "dbk-card-reader-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "dbk-card-reader-label"
    }, L(labelOf(key))), /*#__PURE__*/React.createElement("div", {
      className: "dbk-card-editor-value"
    }, /*#__PURE__*/React.createElement(StructuredEditor, {
      value: value,
      keyStyles: structuredKeyStyles(key),
      onChange: next => updateField(key, next)
    })))) : /*#__PURE__*/React.createElement("div", {
      className: "dbk-card-reader-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "dbk-card-reader-label"
    }, L({
      zh: '内容',
      en: 'Content'
    })), /*#__PURE__*/React.createElement(StructuredEditor, {
      value: item,
      onChange: value => onUpdate(index, value)
    }))));
  }
  function CardCollectionEditor({
    block,
    items,
    onChange,
    rowOrder,
    onFinish,
    canRewrite,
    onRewrite,
    askAction,
    initialViewState
  }) {
    const singleObject = !!block.singleObject;
    const arr = singleObject ? isPlainObject(items) ? [items] : [] : Array.isArray(items) ? items : [];
    const cardView = useCardCollectionState({
      count: arr.length,
      initialViewState
    });
    const {
      selected,
      setSelected,
      layout,
      chooseLayout,
      setExpanded
    } = cardView;
    const expanded = !singleObject && cardView.expanded;
    const [deleteAsk, setDeleteAsk] = useState(null);
    const emitItems = next => onChange(singleObject ? next[0] || {} : next);
    const updateItem = (index, value) => emitItems(arr.map((item, itemIndex) => itemIndex === index ? value : item));
    const addItem = () => {
      const next = arr.concat([blankCardFrom(arr)]);
      emitItems(next);
      setSelected(next.length - 1);
    };
    const deleteItem = () => {
      if (deleteAsk == null) return;
      const next = arr.filter((_, index) => index !== deleteAsk);
      emitItems(next);
      setSelected(Math.min(selected > deleteAsk ? selected - 1 : selected, Math.max(0, next.length - 1)));
      setDeleteAsk(null);
    };
    const Confirm = window.ConfirmDialog;
    const stopBlur = event => event.preventDefault();
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CardCollection, {
      items: arr,
      selected: selected,
      onSelect: setSelected,
      expanded: expanded,
      layout: layout,
      editing: true,
      onLayoutChange: chooseLayout,
      onExpandedChange: setExpanded,
      expandedVariant: block.expandedVariant || cardEditorVariant(arr, rowOrder, singleObject),
      columns: block.cols,
      title: /*#__PURE__*/React.createElement("div", {
        className: "dbk-h"
      }, /*#__PURE__*/React.createElement("span", {
        className: "dbk-d"
      }), /*#__PURE__*/React.createElement("span", {
        className: "dbk-k"
      }, L(block.k)), /*#__PURE__*/React.createElement("span", {
        className: "dbk-c c-latin"
      }, "\xD7", arr.length)),
      actions: /*#__PURE__*/React.createElement(React.Fragment, null, !singleObject && /*#__PURE__*/React.createElement(ContentActionButton, {
        variant: "add",
        icon: "plus",
        className: "dbk-card-reader-add",
        onMouseDown: stopBlur,
        onClick: addItem
      }, L({
        zh: '新增',
        en: 'New'
      })), askAction, canRewrite && /*#__PURE__*/React.createElement(ContentActionButton, {
        icon: "bolt",
        className: "cr-wbe-ai",
        disabled: window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED(),
        onMouseDown: stopBlur,
        onClick: onRewrite
      }, L({
        zh: 'AI 改写',
        en: 'AI rewrite'
      })), /*#__PURE__*/React.createElement(DoneActionButton, {
        onMouseDown: stopBlur,
        onClick: onFinish
      })),
      getTitle: cardTitleText,
      getKey: (_item, index) => index,
      onControlMouseDown: stopBlur,
      renderCard: (item, index, {
        compact
      }) => /*#__PURE__*/React.createElement(CardEditorCard, {
        key: index,
        item: item,
        index: index,
        rowOrder: rowOrder,
        onUpdate: updateItem,
        onDelete: setDeleteAsk,
        compact: compact,
        singleObject: singleObject,
        blockTitle: block.k
      })
    }), !singleObject && Confirm && /*#__PURE__*/React.createElement(Confirm, {
      open: deleteAsk != null,
      tone: "danger",
      icon: "trash",
      title: L({
        zh: '删除「' + cardTitleText(arr[deleteAsk], deleteAsk || 0) + '」？',
        en: 'Delete “' + cardTitleText(arr[deleteAsk], deleteAsk || 0) + '”?'
      }),
      message: L({
        zh: '删除后会随本区块保存，当前页面无法恢复这项内容。',
        en: 'The item will be removed when this block is saved and cannot be restored on this page.'
      }),
      cancelLabel: L({
        zh: '取消',
        en: 'Cancel'
      }),
      confirmLabel: L({
        zh: '确认删除',
        en: 'Delete'
      }),
      onClose: () => setDeleteAsk(null),
      onConfirm: deleteItem
    }));
  }

  /* ---- 形状分发 ---- */
  function StructuredEditor({
    value,
    onChange,
    depth,
    keyStyles
  }) {
    if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return /*#__PURE__*/React.createElement(LeafText, {
        value: value,
        onChange: onChange
      });
    }
    if (Array.isArray(value)) {
      const allScalar = value.every(x => x == null || typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean');
      return allScalar ? /*#__PURE__*/React.createElement(ListEditor, {
        items: value,
        onChange: onChange
      }) : /*#__PURE__*/React.createElement(CardsEditor, {
        items: value,
        onChange: onChange,
        depth: depth
      });
    }
    return /*#__PURE__*/React.createElement(ObjectEditor, {
      obj: value,
      onChange: onChange,
      depth: depth,
      keyStyles: keyStyles
    });
  }

  /* ---- 资源适配器：load()→{content,version}；save({content,base_version})→result ---- */
  const adapters = {
    worldDimension(bookId, dim) {
      return {
        identity: () => ({
          resource_type: 'world',
          resource_key: dim,
          book_id: bookId
        }),
        load: () => LF_PORTAL.getWorldDimensionRaw(bookId, dim).then(r => ({
          content: r.content,
          version: r.version
        })),
        save: p => LF_PORTAL.saveWorldDimension(bookId, dim, p)
      };
    },
    storyPlan(bookId) {
      return {
        identity: () => ({
          resource_type: 'book',
          resource_key: 'story_plan',
          book_id: bookId
        }),
        load: () => LF_PORTAL.getStoryPlanRaw(bookId),
        save: p => LF_PORTAL.saveStoryPlan(bookId, p)
      };
    },
    character(bookId, name) {
      return {
        identity: () => ({
          resource_type: 'character',
          resource_key: name,
          book_id: bookId
        }),
        load: () => LF_PORTAL.getCharacterRaw(bookId, name),
        save: p => LF_PORTAL.saveCharacter(bookId, name, p)
      };
    },
    outlineVolume(bookId, volumeNumber) {
      let vol = Number(volumeNumber) || 1;
      return {
        identity: () => ({
          resource_type: 'outline',
          resource_key: 'volume:' + vol,
          book_id: bookId
        }),
        load: () => bookId ? LF_PORTAL.getVolumeOutlineRaw(bookId, vol).then(r => {
          if (r.volumeNumber != null) vol = r.volumeNumber;
          return {
            content: r.content,
            version: r.version
          };
        }) : Promise.resolve({
          content: null,
          version: null
        }),
        save: p => LF_PORTAL.saveVolumeOutline(bookId, vol, p)
      };
    },
    outlineNearTerm(bookId, volumeNumber) {
      let vol = Number(volumeNumber) || 1;
      return {
        identity: () => ({
          resource_type: 'outline',
          resource_key: 'near_term:' + vol,
          book_id: bookId
        }),
        load: () => bookId ? LF_PORTAL.getNearTermOutlineRaw(bookId, vol).then(r => {
          if (r.volumeNumber != null) vol = r.volumeNumber;
          return {
            content: r.content,
            version: r.version
          };
        }) : Promise.resolve({
          content: null,
          version: null
        }),
        save: p => LF_PORTAL.saveNearTermOutline(bookId, vol, p)
      };
    }
  };
  /* ---- 编辑控制器：本地草稿 + 精确路径写入；409 时刷新并停止，不重放旧值 ---- */
  function contentSignature(value) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }
  function useResourceEditor(makeAdapter, deps) {
    const [st, setSt] = useState({
      loading: true,
      content: null,
      version: null,
      err: null,
      saving: false,
      flash: 0,
      conflict: false
    });
    const ref = useRef(st);
    ref.current = st;
    const adapterRef = useRef(null);
    const baselineRef = useRef(null);
    const identityRef = useRef(null);
    useEffect(() => {
      const a = adapterRef.current = makeAdapter();
      let alive = true;
      const identity = a.identity && a.identity();
      const identityKey = contentSignature(identity);
      const sameResource = identityRef.current === identityKey;
      identityRef.current = identityKey;
      const refreshGuard = identity => {
        const Cite = window.AssistantCiteCore;
        const hasDraft = contentSignature(ref.current.content) !== contentSignature(baselineRef.current);
        if (Cite && Cite.mayApplyResourceRefresh) {
          return Cite.mayApplyResourceRefresh(identity, {
            saving: ref.current.saving,
            hasDraft: hasDraft,
            guard: Cite.editGuard
          });
        }
        const guard = Cite && Cite.editGuard;
        if (ref.current.saving || hasDraft) return null;
        return guard ? guard.capture(identity) : () => true;
      };
      const applyLoaded = (identity, content, version, canApply) => {
        if (!alive || ref.current.saving || !canApply || !canApply()) return false;
        if (version != null && ref.current.version != null && version < ref.current.version) return false;
        if (contentSignature(ref.current.content) !== contentSignature(baselineRef.current)) return false;
        baselineRef.current = content;
        setSt(s => ({
          ...s,
          loading: false,
          content: content,
          version: version != null ? version : s.version,
          err: null,
          conflict: false
        }));
        return true;
      };
      const loadGuard = sameResource ? refreshGuard(identity) : () => true;
      if (loadGuard) {
        setSt(s => ({
          ...s,
          loading: true,
          err: null
        }));
        a.load().then(r => {
          if (!alive) return;
          if (sameResource) {
            if (!applyLoaded(identity, r.content, r.version, loadGuard)) setSt(s => ({
              ...s,
              loading: false
            }));
          } else {
            baselineRef.current = r.content;
            setSt(s => ({
              ...s,
              loading: false,
              content: r.content,
              version: r.version,
              conflict: false
            }));
          }
        }).catch(e => {
          if (alive) setSt(s => ({
            ...s,
            loading: false,
            err: errMsg(e)
          }));
        });
      }
      const syncOutlinePackage = event => {
        if (!alive || !event || !event.detail) return;
        const identity = a.identity && a.identity();
        if (!identity || identity.resource_type !== 'outline') return;
        const parts = String(identity.resource_key || '').split(':');
        const kind = parts[0],
          volumeNumber = Number(parts[1]) || 0;
        const detail = event.detail;
        if (String(detail.bookId || '') !== String(identity.book_id || '') || Number(detail.volumeNumber) !== volumeNumber) return;
        const contents = detail.contents && typeof detail.contents === 'object' ? detail.contents : {};
        const versions = detail.versions && typeof detail.versions === 'object' ? detail.versions : {};
        if (!Object.prototype.hasOwnProperty.call(contents, kind)) return;
        const canApply = refreshGuard(identity);
        if (!canApply) return;
        applyLoaded(identity, contents[kind], versions[kind], canApply);
      };
      const syncAssistantResource = event => {
        if (!alive || !event || !event.detail) return;
        const identity = a.identity && a.identity();
        const detail = event.detail;
        if (!identity || !detail) return;
        if (identity.resource_type !== detail.resource_type) return;
        if (String(identity.resource_key || '') !== String(detail.resource_key || '')) return;
        const bookId = identity.book_id || identity.bookId;
        if (bookId && String(bookId) !== String(detail.bookId || '')) return;
        const canApply = refreshGuard(identity);
        if (!canApply) return;
        a.load().then(r => {
          applyLoaded(identity, r.content, r.version, canApply);
        }).catch(() => {});
      };
      if (typeof window.addEventListener === 'function') {
        window.addEventListener('lf:outline-package-updated', syncOutlinePackage);
        window.addEventListener('lf:assistant-resource-updated', syncAssistantResource);
      }
      return () => {
        alive = false;
        if (typeof window.removeEventListener === 'function') {
          window.removeEventListener('lf:outline-package-updated', syncOutlinePackage);
          window.removeEventListener('lf:assistant-resource-updated', syncAssistantResource);
        }
      };
    }, deps || []);
    const recoverConflict = e => {
      const a = adapterRef.current;
      if (!a || !e || e.status !== 409) return Promise.resolve(false);
      return a.load().then(r => {
        baselineRef.current = r.content;
        setSt(s => ({
          ...s,
          saving: false,
          content: r.content,
          version: r.version,
          err: errMsg(e),
          conflict: true
        }));
        return true;
      }, e2 => {
        setSt(s => ({
          ...s,
          saving: false,
          err: errMsg(e2),
          conflict: true
        }));
        throw e2;
      });
    };
    const persist = (path, value, options) => {
      const a = adapterRef.current;
      if (!a) return Promise.resolve();
      const write = () => {
        const base = ref.current.version;
        setSt(s => ({
          ...s,
          saving: true,
          conflict: false,
          err: null
        }));
        const apply = res => {
          const nv = res && res.version != null ? res.version : base != null ? base + 1 : null;
          baselineRef.current = options && options.projectionFields ? applyProjection(baselineRef.current, value, options.projectionFields) : window.setIn(baselineRef.current || {}, path, () => value);
          setSt(s => ({
            ...s,
            saving: false,
            version: nv,
            flash: Date.now()
          }));
          return res;
        };
        return a.save({
          path: path.join('.'),
          value,
          base_version: base,
          reason: options && options.reason
        }).then(apply).catch(e => {
          if (e && e.status === 409) {
            return recoverConflict(e).then(() => {
              throw e;
            });
          }
          setSt(s => ({
            ...s,
            saving: false,
            err: errMsg(e)
          }));
          throw e;
        });
      };
      return write();
    };
    const update = (path, value) => {
      setSt(s => ({
        ...s,
        content: window.setIn(s.content || {}, path, function () {
          return value;
        })
      }));
    };
    const flush = (path, value) => {
      update(path, value);
      return persist(path, value);
    };
    const flushMany = async changes => {
      const edits = (Array.isArray(changes) ? changes : []).filter(edit => edit && Array.isArray(edit.path));
      const a = adapterRef.current;
      if (!a || !edits.length) return null;
      let version = ref.current.version;
      let content = ref.current.content || {};
      edits.forEach(edit => {
        content = window.setIn(content, edit.path, function () {
          return edit.value;
        });
      });
      setSt(s => ({
        ...s,
        content,
        saving: true,
        conflict: false,
        err: null
      }));
      let result = null;
      try {
        for (const edit of edits) {
          result = await a.save({
            path: edit.path.join('.'),
            value: edit.value,
            base_version: version,
            reason: edit.reason
          });
          version = result && result.version != null ? result.version : version != null ? version + 1 : null;
          baselineRef.current = window.setIn(baselineRef.current || {}, edit.path, () => edit.value);
        }
        setSt(s => ({
          ...s,
          content,
          saving: false,
          version,
          flash: Date.now()
        }));
        return result;
      } catch (error) {
        try {
          const loaded = await a.load();
          setSt(s => ({
            ...s,
            saving: false,
            content: loaded.content,
            version: loaded.version,
            err: errMsg(error),
            conflict: !!(error && error.status === 409)
          }));
        } catch (loadError) {
          setSt(s => ({
            ...s,
            saving: false,
            err: errMsg(error),
            conflict: !!(error && error.status === 409)
          }));
        }
        throw error;
      }
    };
    const restore = (path, value) => persist(path, value, {
      reason: '撤回 AI 字段改写'
    }).then(result => {
      if (result === false) return false;
      update(path, value);
      return result;
    });
    const applyProjection = (content, value, fields) => {
      const source = value && typeof value === 'object' ? value : {};
      return (Array.isArray(fields) ? fields : []).reduce((next, field) => window.setIn(next, [field], function () {
        return source[field];
      }), content || {});
    };
    const flushProjection = (path, value, fields, options) => {
      setSt(s => ({
        ...s,
        content: applyProjection(s.content, value, fields)
      }));
      return persist(path, value, {
        ...options,
        projectionFields: fields
      });
    };
    const restoreProjection = (path, value, fields) => persist(path, value, {
      reason: '撤回 AI 字段改写',
      projectionFields: fields
    }).then(result => {
      if (result === false) return false;
      setSt(s => ({
        ...s,
        content: applyProjection(s.content, value, fields)
      }));
      return result;
    });
    const acceptRemote = (path, value, version) => {
      setSt(s => {
        const content = window.setIn(s.content || {}, path, function () {
          return value;
        });
        baselineRef.current = window.setIn(baselineRef.current || {}, path, () => value);
        return {
          ...s,
          content,
          version: version != null ? version : s.version,
          flash: Date.now(),
          conflict: false,
          err: null
        };
      });
    };
    const acceptRemoteProjection = (value, fields, version) => {
      setSt(s => {
        const content = applyProjection(s.content, value, fields);
        baselineRef.current = applyProjection(baselineRef.current, value, fields);
        return {
          ...s,
          content,
          version: version != null ? version : s.version,
          flash: Date.now(),
          conflict: false,
          err: null
        };
      });
    };
    const identity = () => adapterRef.current && adapterRef.current.identity ? adapterRef.current.identity() : null;
    const beginEdit = React.useCallback(() => {
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      return guard ? guard.acquire(identity()) : undefined;
    }, []);
    return {
      state: st,
      update,
      flush,
      flushMany,
      flushProjection,
      restore,
      restoreProjection,
      acceptRemote,
      acceptRemoteProjection,
      recoverConflict,
      identity,
      beginEdit
    };
  }

  /* ---- 改写 agent 网关：浏览器只提交资源标识、版本、点路径和用户意图。
     Engine 负责读取完整上下文、校验同构结果并按路径原子写回。 ---- */
  function rewriteAvailable() {
    return !!(window.LF_PORTAL && LF_PORTAL.rewriteField && window.AgentFloat);
  }
  function canCiteAssistant(identity) {
    const Cite = window.AssistantCiteCore;
    const type = identity && identity.resource_type;
    const key = identity && identity.resource_key;
    if (Cite && Cite.canonicalResourceKey) return !!Cite.canonicalResourceKey(type, key);
    return type === 'world' || type === 'character';
  }
  function assistantFieldOwner(bookId, identity, path) {
    const Cite = window.AssistantCiteCore;
    if (Cite && Cite.fieldOwner) return Cite.fieldOwner(bookId, identity && identity.resource_type, identity && identity.resource_key, Array.isArray(path) ? path.join('.') : path);
    return ['field', bookId, identity && identity.resource_type, identity && identity.resource_key, Array.isArray(path) ? path.join('.') : path].join(':');
  }
  function AskAssistantButton({
    bookId,
    identity,
    path,
    disabled
  }) {
    useEffect(() => {
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      if (guard && bookId && canCiteAssistant(identity)) return guard.acquire({
        ...identity,
        book_id: bookId
      });
    }, [bookId, identity && identity.resource_type, identity && identity.resource_key]);
    if (window.LF_ASSISTANT_ENABLED === false) return null;
    if (!canCiteAssistant(identity) || !bookId) return null;
    const cite = () => {
      if (!window.LF_ASSISTANT_CITE || typeof window.LF_ASSISTANT_CITE.citeField !== 'function') return;
      window.LF_ASSISTANT_CITE.citeField({
        bookId,
        resource_type: identity.resource_type,
        resource_key: identity.resource_key,
        field_path: Array.isArray(path) ? path.join('.') : path,
        owner: assistantFieldOwner(bookId, identity, path)
      });
    };
    return /*#__PURE__*/React.createElement(ContentActionButton, {
      icon: "sparkle",
      className: "cr-wbe-ask",
      disabled: !!disabled,
      onMouseDown: event => event.preventDefault(),
      onClick: cite,
      title: L({
        zh: '向助手询问此字段',
        en: 'Ask the assistant about this field'
      }),
      "aria-label": L({
        zh: '询问助手',
        en: 'Ask assistant'
      })
    }, L({
      zh: '询问助手',
      en: 'Ask assistant'
    }));
  }
  function RewriteAgent({
    bookId,
    identity,
    baseVersion,
    path,
    label,
    startPos,
    onApply,
    onConflict,
    onClose
  }) {
    const AF = window.AgentFloat;
    const run = async intent => {
      const payload = {
        resource_type: identity.resource_type,
        resource_key: identity.resource_key,
        base_version: baseVersion,
        path: path.join('.'),
        user_intent: intent
      };
      try {
        const result = await LF_PORTAL.rewriteField(bookId, payload);
        if (!result || !Object.prototype.hasOwnProperty.call(result, 'value')) throw new Error('改写结果为空');
        onApply(result.value, result);
        return true;
      } catch (e) {
        if (e && e.code === 'quote_cancelled') return false;
        if (onConflict) try {
          await onConflict(e);
        } catch (reloadError) {
          if (!e?.creditsRefunded) e = reloadError;
        }
        if (window.LF_ERROR) window.LF_ERROR(e);
        return false;
      }
    };
    return /*#__PURE__*/React.createElement(AF, {
      title: L({
        zh: 'AI 改写',
        en: 'AI rewrite'
      }),
      label: L(label || labelOf(path[path.length - 1])),
      startPos: startPos,
      placeholder: L({
        zh: '描述你想怎么改这个字段，例：更精炼、更像物理定律…',
        en: 'Describe how to rewrite this field…'
      }),
      onRun: run,
      onClose: onClose
    });
  }

  /* ---- 字段能力协议：UI 组件拥有编辑态；此边界统一持久化、AI 改写、差异、撤回与冲突。 ---- */
  const FIELD_REVIEW_VIEWS = Object.create(null);
  function registerFieldReviewView(kind, view) {
    if (!kind || !view || typeof view.Diff !== 'function') throw new Error('Field review view requires kind and Diff');
    if (FIELD_REVIEW_VIEWS[kind]) throw new Error('Field review view already registered: ' + kind);
    FIELD_REVIEW_VIEWS[kind] = Object.freeze({
      className: view.className || 'cr-wbe reviewing',
      Diff: view.Diff
    });
  }
  registerFieldReviewView('text', {
    className: 'c-lead-text cr-wbe c-editable-surface lead-reading reviewing',
    Diff: InlineTextDiff
  });
  registerFieldReviewView('list', {
    className: 'cr-wbe c-editable-surface reviewing',
    Diff: InlineListDiff
  });
  registerFieldReviewView('structured', {
    className: 'cr-wbe c-editable-surface reviewing',
    Diff: InlineStructuredDiff
  });
  function useFieldCapabilities({
    kind,
    value,
    loaded,
    disabled = false,
    bookId,
    identity,
    baseVersion,
    path,
    label,
    onCommit,
    onRewriteApply,
    onRewriteUndo,
    onRewriteConflict
  }) {
    const protocol = window.LF_FIELD_PROTOCOL.resolve(kind);
    const [flash, setFlash] = useState(false);
    const [rewritePulse, setRewritePulse] = useState(false);
    const [rewriteReview, setRewriteReview] = useState(null);
    const [showOriginal, setShowOriginal] = useState(false);
    const [undoing, setUndoing] = useState(false);
    const [agent, setAgent] = useState(null);
    const undoKey = Undo.key(bookId, identity, path);
    const valueSignature = protocol.signature(protocol.normalize(value));
    const pulse = (setter, duration) => {
      setter(true);
      setTimeout(() => setter(false), duration);
    };
    const dismissRewrite = () => {
      Undo.remove(localStorage, undoKey);
      setRewriteReview(null);
      setShowOriginal(false);
    };
    useEffect(() => {
      if (!loaded || !undoKey) return;
      const cached = Undo.read(localStorage, undoKey);
      if (cached && Undo.matches(cached, protocol.normalize(value), baseVersion)) {
        setRewriteReview(window.LF_FIELD_PROTOCOL.createReview(kind, cached.before, cached.after, cached.version));
      } else if (cached) {
        Undo.remove(localStorage, undoKey);
        setRewriteReview(null);
      } else {
        setRewriteReview(current => current && current.version != null && baseVersion != null && Number(current.version) !== Number(baseVersion) ? null : current);
      }
    }, [loaded, undoKey, baseVersion, valueSignature, kind]);
    useEffect(() => {
      if (!canCiteAssistant(identity) || !bookId || !path) return undefined;
      const owner = assistantFieldOwner(bookId, identity, path);
      return () => {
        if (window.LF_ASSISTANT_CITE) window.LF_ASSISTANT_CITE.clear({
          owner,
          fieldOnly: true
        });
      };
    }, [bookId, identity && identity.resource_type, identity && identity.resource_key, Array.isArray(path) ? path.join('.') : '']);
    const beginCiteEdit = React.useCallback(() => {
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      if (!guard || !canCiteAssistant(identity) || !bookId) return undefined;
      return guard.acquire({
        ...identity,
        book_id: bookId
      });
    }, [bookId, identity && identity.resource_type, identity && identity.resource_key]);
    const save = next => {
      const value = protocol.normalize(next);
      return Promise.resolve(onCommit(value)).then(result => {
        if (result === false) return false;
        dismissRewrite();
        pulse(setFlash, 1600);
        return result;
      });
    };
    const undoRewrite = async () => {
      if (!rewriteReview || !onRewriteUndo || undoing) return;
      setUndoing(true);
      try {
        const result = await onRewriteUndo(protocol.clone(rewriteReview.before));
        if (result === false) return;
        dismissRewrite();
        pulse(setFlash, 1600);
      } catch (e) {
        if (window.LF_ERROR) window.LF_ERROR(e);
      } finally {
        setUndoing(false);
      }
    };
    const renderEditActions = ({
      dirty,
      close
    }) => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AskAssistantButton, {
      bookId: bookId,
      identity: identity,
      path: path,
      disabled: disabled
    }), rewriteAvailable() && /*#__PURE__*/React.createElement(ContentActionButton, {
      icon: "bolt",
      className: "cr-wbe-ai",
      disabled: disabled || !identity || baseVersion == null || dirty || window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED(),
      onMouseDown: event => event.preventDefault(),
      onClick: event => setAgent({
        position: window.agentFloatPositionFor(event.currentTarget.getBoundingClientRect()),
        close
      })
    }, L({
      zh: 'AI 改写',
      en: 'AI rewrite'
    })));
    const applyRewrite = (next, result) => {
      const review = window.LF_FIELD_PROTOCOL.createReview(kind, value, next, result && result.version);
      if (review.changed) Undo.write(localStorage, undoKey, review);
      setRewriteReview(review);
      setShowOriginal(false);
      onRewriteApply(protocol.clone(review.after), result);
      agent.close();
      pulse(setRewritePulse, 1800);
      setAgent(null);
    };
    return {
      protocol,
      flash,
      rewritePulse,
      rewriteReview,
      showOriginal,
      undoing,
      agent,
      save,
      dismissRewrite,
      undoRewrite,
      renderEditActions,
      applyRewrite,
      beginCiteEdit,
      toggleOriginal: () => setShowOriginal(current => !current),
      agentProps: agent ? {
        bookId,
        identity,
        baseVersion,
        path,
        label,
        startPos: agent.position,
        onApply: applyRewrite,
        onConflict: onRewriteConflict,
        onClose: () => setAgent(null)
      } : null
    };
  }
  function FieldRewriteReview({
    kind,
    label,
    capabilities
  }) {
    const {
      protocol,
      rewriteReview,
      showOriginal,
      undoing,
      dismissRewrite,
      undoRewrite,
      toggleOriginal
    } = capabilities;
    const view = FIELD_REVIEW_VIEWS[kind];
    const Diff = view.Diff;
    const shownValue = showOriginal ? rewriteReview.before : rewriteReview.after;
    const count = protocol.reviewCount(shownValue);
    return /*#__PURE__*/React.createElement("div", {
      className: view.className
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-wbe-ehead"
    }, /*#__PURE__*/React.createElement("span", {
      className: "dbk-k"
    }, L(label)), count != null && /*#__PURE__*/React.createElement("span", {
      className: "dbk-c c-latin"
    }, "\xD7", count), /*#__PURE__*/React.createElement("span", {
      className: "cr-wbe-review-state",
      role: "status",
      "aria-live": "polite"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 11,
      w: 2.2
    }), L({
      zh: 'AI 已改写',
      en: 'AI rewritten'
    })), /*#__PURE__*/React.createElement("span", {
      className: "cr-wbe-spacer"
    }), /*#__PURE__*/React.createElement("span", {
      className: "cr-wbe-review-controls"
    }, /*#__PURE__*/React.createElement(ContentActionButton, {
      active: showOriginal,
      onClick: toggleOriginal
    }, showOriginal ? L({
      zh: '显示差异',
      en: 'Show diff'
    }) : L({
      zh: '显示原文',
      en: 'Show original'
    })), /*#__PURE__*/React.createElement(ContentActionButton, {
      disabled: undoing,
      onClick: undoRewrite
    }, undoing ? L({
      zh: '撤回中…',
      en: 'Undoing…'
    }) : L({
      zh: '撤回改写',
      en: 'Undo rewrite'
    })), /*#__PURE__*/React.createElement(DoneActionButton, {
      onClick: dismissRewrite
    }))), /*#__PURE__*/React.createElement("div", {
      className: "cr-wbe-se"
    }, /*#__PURE__*/React.createElement(Diff, {
      before: rewriteReview.before,
      after: rewriteReview.after,
      showOriginal: showOriginal
    })));
  }
  function FieldCapability({
    kind,
    value,
    children,
    ...options
  }) {
    const capabilities = useFieldCapabilities(Object.assign({
      kind,
      value
    }, options));
    const review = capabilities.rewriteReview;
    if (review && review.changed) return /*#__PURE__*/React.createElement(FieldRewriteReview, {
      kind: kind,
      label: options.label,
      capabilities: capabilities
    });
    return /*#__PURE__*/React.createElement(React.Fragment, null, children({
      onSave: capabilities.save,
      saved: capabilities.flash,
      rewritten: capabilities.rewritePulse,
      actionPending: !!capabilities.agent,
      renderEditActions: capabilities.renderEditActions,
      onEditStart: capabilities.beginCiteEdit
    }), review && !review.changed && /*#__PURE__*/React.createElement("div", {
      className: "cr-wbe-review"
    }, /*#__PURE__*/React.createElement("span", {
      className: "cr-wbe-review-status",
      role: "status",
      "aria-live": "polite"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 12,
      w: 2.3
    }), L({
      zh: 'AI 返回内容无变化',
      en: 'AI returned no changes'
    })), /*#__PURE__*/React.createElement("span", {
      className: "cr-wbe-review-actions"
    }, /*#__PURE__*/React.createElement(ContentActionButton, {
      variant: "remove",
      "aria-label": L({
        zh: '关闭改写提示',
        en: 'Dismiss rewrite notice'
      }),
      onClick: capabilities.dismissRewrite
    }, "\xD7"))), capabilities.agentProps && /*#__PURE__*/React.createElement(RewriteAgent, capabilities.agentProps));
  }

  /* ---- 标准列表区块：组件只负责列表交互，通用边界挂载持久化能力。 ---- */
  function StructuredListBlock({
    block,
    path,
    value,
    loaded,
    bookId,
    identity,
    baseVersion,
    onCommit,
    onRewriteApply,
    onRewriteUndo,
    onRewriteConflict
  }) {
    const StructuredList = window.StructuredList;
    const items = window.LF_FIELD_PROTOCOL.resolve('list').normalize(value);
    const head = /*#__PURE__*/React.createElement("div", {
      className: "dbk-h"
    }, /*#__PURE__*/React.createElement("span", {
      className: "dbk-d"
    }), /*#__PURE__*/React.createElement("span", {
      className: "dbk-k"
    }, L(block.k)), items.length > 0 && /*#__PURE__*/React.createElement("span", {
      className: "dbk-c c-latin"
    }, "\xD7", items.length));
    return /*#__PURE__*/React.createElement(FieldCapability, {
      kind: "list",
      value: items,
      loaded: loaded,
      disabled: !loaded,
      bookId: bookId,
      identity: identity,
      baseVersion: baseVersion,
      path: path,
      label: block.k,
      onCommit: onCommit,
      onRewriteApply: onRewriteApply,
      onRewriteUndo: onRewriteUndo,
      onRewriteConflict: onRewriteConflict
    }, bindings => /*#__PURE__*/React.createElement(StructuredList, _extends({
      mode: "list",
      items: items,
      editDisabled: !loaded,
      header: head,
      editTitle: block.k,
      editHint: {
        zh: '点击字段编辑，完成后保存。全空的条目会自动剔除。',
        en: 'Edit fields in place, then choose Done to save. Empty items are removed.'
      }
    }, bindings)));
  }

  /* ---- 标准引领句：组件只负责文本交互，通用边界挂载持久化能力。 ---- */
  function LeadTextBlock({
    label,
    fallback,
    path,
    value,
    loaded,
    editDisabled,
    loadError,
    bookId,
    identity,
    baseVersion,
    onCommit,
    onRewriteApply,
    onRewriteUndo,
    onRewriteConflict
  }) {
    const LeadText = window.LeadText;
    const displayValue = value !== undefined ? value : fallback;
    return /*#__PURE__*/React.createElement(FieldCapability, {
      kind: "text",
      value: displayValue,
      loaded: loaded,
      disabled: editDisabled,
      bookId: bookId,
      identity: identity,
      baseVersion: baseVersion,
      path: path,
      label: label,
      onCommit: onCommit,
      onRewriteApply: onRewriteApply,
      onRewriteUndo: onRewriteUndo,
      onRewriteConflict: onRewriteConflict
    }, bindings => /*#__PURE__*/React.createElement(LeadText, _extends({
      value: displayValue,
      editDisabled: editDisabled,
      loadError: loadError,
      editTitle: label
    }, bindings)));
  }
  function LeadField({
    ctl,
    path,
    bookId,
    label,
    fallback
  }) {
    const content = ctl && ctl.state ? ctl.state.content : null;
    const loaded = !!(ctl && ctl.state && !ctl.state.loading && content);
    const editDisabled = !loaded || !!(ctl && ctl.state && ctl.state.saving);
    const loadError = ctl && ctl.state && !ctl.state.loading && !content ? ctl.state.err : '';
    const fieldPath = Array.isArray(path) ? path : [path];
    const value = content ? window.getIn(content, fieldPath) : undefined;
    return /*#__PURE__*/React.createElement(LeadTextBlock, {
      key: 'lead@' + fieldPath.join('.'),
      label: label,
      fallback: fallback,
      path: fieldPath,
      value: value,
      loaded: loaded,
      editDisabled: editDisabled,
      loadError: loadError,
      bookId: bookId,
      identity: ctl.identity(),
      baseVersion: ctl.state.version,
      onCommit: next => ctl.flush(fieldPath, next),
      onRewriteUndo: next => ctl.restore(fieldPath, next),
      onRewriteApply: (next, result) => ctl.acceptRemote(fieldPath, next, result && result.version),
      onRewriteConflict: ctl.recoverConflict
    });
  }

  /* ---- 通用区块编辑器：一个资源拆成若干「区块」，每块经 pathFor(block) 定位到
     content 中的子路径；标准列表自行维护编辑周期，其余结构仍由 BlockEdit 承接。
     pathFor 默认 [block.key]（世界观）；故事规划等嵌套资源传 [section,field]。 ---- */
  function BlocksEditor({
    makeAdapter,
    deps,
    blocks,
    pathFor,
    resourceType,
    bookId,
    cardRowOrder,
    leadField
  }) {
    const ctl = useResourceEditor(makeAdapter, deps);
    const {
      state,
      update,
      flush,
      restore,
      acceptRemote,
      recoverConflict,
      identity
    } = ctl;
    const list = Array.isArray(blocks) ? blocks : [];
    const pf = pathFor || (b => [b.key]);
    const leadPath = leadField && Array.isArray(leadField.path) ? leadField.path : null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, leadPath && /*#__PURE__*/React.createElement(LeadField, {
      ctl: ctl,
      path: leadPath,
      bookId: bookId,
      label: leadField.label,
      fallback: leadField.fallback
    }), /*#__PURE__*/React.createElement("div", {
      className: "cr-wbe-list"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cr-wbe-tip"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "pen",
      s: 12
    }), L({
      zh: '在区块内原地编辑 · 完成后保存',
      en: 'Edit in place within each block · choose Done to save'
    }), /*#__PURE__*/React.createElement("span", {
      className: "cr-wbe-state"
    }, state.saving ? L({
      zh: '保存中…',
      en: 'Saving…'
    }) : ''), /*#__PURE__*/React.createElement("span", {
      className: "cr-dpe-ver c-latin"
    }, "v", state.version != null ? state.version : '—')), state.err && /*#__PURE__*/React.createElement("div", {
      className: "cr-dpe-msg err"
    }, L({
      zh: '保存失败：',
      en: 'Save failed: '
    }), state.err), list.map((b, i) => {
      const path = pf(b);
      const value = state.content ? window.getIn(state.content, path) : undefined;
      const key = (b.key || i) + '@' + path.join('.');
      if (b.type === 'list') return /*#__PURE__*/React.createElement(StructuredListBlock, {
        key: key,
        block: b,
        path: path,
        value: value,
        loaded: !state.loading && !!state.content,
        bookId: bookId,
        identity: identity(),
        baseVersion: state.version,
        onCommit: next => flush(path, next),
        onRewriteUndo: next => restore(path, next),
        onRewriteApply: (next, result) => acceptRemote(path, next, result && result.version),
        onRewriteConflict: recoverConflict
      });
      return /*#__PURE__*/React.createElement(BlockEdit, {
        key: key,
        block: b,
        path: path,
        value: value,
        loaded: !state.loading && !!state.content,
        bookId: bookId,
        resourceType: resourceType,
        identity: identity(),
        baseVersion: state.version,
        cardRowOrder: cardRowOrder,
        onChange: v => update(path, v),
        onCommit: v => flush(path, v),
        onRewriteUndo: v => restore(path, v),
        onRewriteApply: (v, result) => acceptRemote(path, v, result && result.version),
        onRewriteConflict: recoverConflict
      });
    })));
  }
  function BlockEdit({
    block,
    path,
    value,
    loaded,
    bookId,
    resourceType,
    identity,
    baseVersion,
    onChange,
    onCommit,
    onRewriteApply,
    onRewriteUndo,
    onRewriteConflict,
    renderView,
    cardRowOrder
  }) {
    const [editing, setEditing] = useState(false);
    const [cardView, setCardView] = useState(null);
    const [flash, setFlash] = useState(false);
    const [rewritePulse, setRewritePulse] = useState(false);
    const [rewriteReview, setRewriteReview] = useState(null);
    const [showRewriteDiff, setShowRewriteDiff] = useState(false);
    const [showRewriteOriginal, setShowRewriteOriginal] = useState(false);
    const [undoing, setUndoing] = useState(false);
    const [incomplete, setIncomplete] = useState(null);
    const [agent, setAgent] = useState(null);
    const dirtyRef = useRef(false);
    const wrapRef = useRef(null);
    const canRw = rewriteAvailable();
    const inlineReviewCapable = !renderView && ['text', 'cards'].includes(block.type);
    const undoKey = inlineReviewCapable ? Undo.key(bookId, identity, path) : '';
    const valueSignature = (() => {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return String(value);
      }
    })();
    const dismissRewrite = () => {
      if (undoKey) Undo.remove(localStorage, undoKey);
      setRewriteReview(null);
      setShowRewriteDiff(false);
      setShowRewriteOriginal(false);
    };
    useEffect(() => {
      if (!loaded || !undoKey) return;
      const cached = Undo.read(localStorage, undoKey);
      if (cached && Undo.matches(cached, value, baseVersion)) setRewriteReview(cached);else if (cached) Undo.remove(localStorage, undoKey);
    }, [loaded, undoKey, baseVersion, valueSignature]);
    useEffect(() => {
      if (!canCiteAssistant(identity) || !bookId || !path) return undefined;
      const owner = assistantFieldOwner(bookId, identity, path);
      return () => {
        if (window.LF_ASSISTANT_CITE) window.LF_ASSISTANT_CITE.clear({
          owner,
          fieldOnly: true
        });
      };
    }, [bookId, identity && identity.resource_type, identity && identity.resource_key, Array.isArray(path) ? path.join('.') : '']);
    useEffect(() => {
      if (!editing || !canCiteAssistant(identity) || !bookId) return undefined;
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      if (!guard) return undefined;
      return guard.acquire({
        ...identity,
        book_id: bookId
      });
    }, [editing, bookId, identity && identity.resource_type, identity && identity.resource_key]);
    const open = viewState => {
      if (loaded) {
        if (viewState && typeof viewState === 'object') setCardView(viewState);
        dirtyRef.current = false;
        setIncomplete(null);
        dismissRewrite();
        setEditing(true);
      }
    };
    const openFromSurface = e => {
      if (e.target.closest && e.target.closest('button,a,input,textarea,select,[role="button"]')) return;
      open();
    };
    const undoRewrite = async () => {
      if (!rewriteReview || !onRewriteUndo || undoing) return;
      setUndoing(true);
      try {
        await onRewriteUndo(cloneRewriteValue(rewriteReview.before));
        dismissRewrite();
        setFlash(true);
        setTimeout(() => setFlash(false), 1600);
      } catch (e) {
        if (window.LF_ERROR) window.LF_ERROR(e);
      } finally {
        setUndoing(false);
      }
    };
    const finish = () => {
      if (agent) return;
      const bad = findIncomplete(value);
      if (bad.length) {
        setIncomplete(bad);
        return;
      }
      setIncomplete(null);
      const cleaned = pruneBlanks(value);
      const changed = dirtyRef.current || JSON.stringify(cleaned) !== JSON.stringify(value);
      setEditing(false);
      dirtyRef.current = false;
      if (!changed) return;
      Promise.resolve(onCommit(cleaned)).then(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 1600);
      }).catch(() => {});
    };
    useEffect(() => {
      if (!editing) return;
      const h = e => {
        if (wrapRef.current && !wrapRef.current.contains(e.target) && !(e.target.closest && e.target.closest('.edt-agent,.c-confirm-scrim'))) finish();
      };
      document.addEventListener('mousedown', h, true);
      return () => document.removeEventListener('mousedown', h, true);
    }, [editing, value, agent]);
    if (!editing) {
      const inlineComponentEdit = !renderView && ['text', 'cards', 'rel'].includes(block.type);
      const currentBlock = previewBlock(block, value);
      const rewriteChanged = !!(rewriteReview && JSON.stringify(rewriteReview.before) !== JSON.stringify(rewriteReview.after));
      const inlineReview = rewriteChanged && inlineReviewCapable;
      const reviewControls = /*#__PURE__*/React.createElement("span", {
        className: "cr-wbe-review-controls"
      }, /*#__PURE__*/React.createElement(ContentActionButton, {
        active: showRewriteOriginal,
        onClick: () => setShowRewriteOriginal(value => !value)
      }, showRewriteOriginal ? L({
        zh: '显示差异',
        en: 'Show diff'
      }) : L({
        zh: '显示原文',
        en: 'Show original'
      })), /*#__PURE__*/React.createElement(ContentActionButton, {
        disabled: undoing,
        onClick: undoRewrite
      }, undoing ? L({
        zh: '撤回中…',
        en: 'Undoing…'
      }) : L({
        zh: '撤回改写',
        en: 'Undo rewrite'
      })), /*#__PURE__*/React.createElement(DoneActionButton, {
        onClick: dismissRewrite
      }));
      const CardReader = window.StructuredCardReader;
      const cardReviewCount = showRewriteOriginal && Array.isArray(rewriteReview && rewriteReview.before) ? rewriteReview.before.length : Array.isArray(rewriteReview && rewriteReview.after) ? rewriteReview.after.length : 0;
      const cardReviewHead = /*#__PURE__*/React.createElement("div", {
        className: "dbk-h"
      }, /*#__PURE__*/React.createElement("span", {
        className: "dbk-d"
      }), /*#__PURE__*/React.createElement("span", {
        className: "dbk-k"
      }, L(block.k)), cardReviewCount > 0 && /*#__PURE__*/React.createElement("span", {
        className: "dbk-c c-latin"
      }, "\xD7", cardReviewCount));
      return /*#__PURE__*/React.createElement("div", {
        ref: wrapRef,
        className: 'cr-wbe c-editable-surface' + (inlineReview ? ' reviewing' : '') + (block.type === 'cards' ? ' card-reading' : '') + (block.type === 'text' ? ' text-reading' : '') + (block.type === 'rel' ? ' rel-reading' : '') + (flash ? ' saved' : '') + (rewritePulse ? ' rewritten' : '') + (loaded ? '' : ' loading'),
        onDoubleClick: inlineReview ? undefined : openFromSurface
      }, inlineReview ? block.type === 'cards' && CardReader ? /*#__PURE__*/React.createElement("div", {
        className: "dbk-wrap"
      }, /*#__PURE__*/React.createElement("div", {
        className: "dbk"
      }, /*#__PURE__*/React.createElement(CardReader, {
        block: currentBlock,
        head: cardReviewHead,
        rowOrder: cardRowOrder,
        initialViewState: cardView,
        review: {
          beforeBlock: previewBlock(block, rewriteReview.before),
          showOriginal: showRewriteOriginal,
          controls: reviewControls
        }
      }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        className: "cr-wbe-ehead"
      }, /*#__PURE__*/React.createElement("span", {
        className: "dbk-k"
      }, L(block.k)), /*#__PURE__*/React.createElement("span", {
        className: "cr-wbe-review-state",
        role: "status",
        "aria-live": "polite"
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "check",
        s: 11,
        w: 2.2
      }), L({
        zh: 'AI 已改写',
        en: 'AI rewritten'
      })), /*#__PURE__*/React.createElement("span", {
        className: "cr-wbe-spacer"
      }), reviewControls), /*#__PURE__*/React.createElement("div", {
        className: "cr-wbe-se"
      }, /*#__PURE__*/React.createElement(InlineTextDiff, {
        before: rewriteReview.before,
        after: rewriteReview.after,
        showOriginal: showRewriteOriginal
      }))) : renderView ? renderView : /*#__PURE__*/React.createElement(DimBlocks, {
        dim: {
          blocks: [currentBlock]
        },
        clamp: true,
        onEdit: inlineComponentEdit ? open : undefined,
        editDisabled: !loaded,
        cardRowOrder: cardRowOrder,
        initialCardView: cardView
      }), !inlineComponentEdit && !inlineReview && /*#__PURE__*/React.createElement(EditActionButton, {
        className: "cr-wbe-edit",
        onClick: open,
        disabled: !loaded
      }), flash && /*#__PURE__*/React.createElement("span", {
        className: "cr-wbe-flash"
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "check",
        s: 11,
        w: 2.4
      }), L({
        zh: '已保存',
        en: 'Saved'
      })), rewriteReview && !inlineReview && /*#__PURE__*/React.createElement("div", {
        className: "cr-wbe-review"
      }, /*#__PURE__*/React.createElement("span", {
        className: "cr-wbe-review-status",
        role: "status",
        "aria-live": "polite"
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "check",
        s: 12,
        w: 2.3
      }), rewriteChanged ? L({
        zh: 'AI 已改写',
        en: 'AI rewrite applied'
      }) : L({
        zh: 'AI 返回内容无变化',
        en: 'AI returned no changes'
      })), /*#__PURE__*/React.createElement("span", {
        className: "cr-wbe-review-actions"
      }, rewriteChanged && /*#__PURE__*/React.createElement(ContentActionButton, {
        "aria-expanded": showRewriteDiff,
        onClick: () => setShowRewriteDiff(v => !v)
      }, showRewriteDiff ? L({
        zh: '收起改动',
        en: 'Hide changes'
      }) : L({
        zh: '查看改动',
        en: 'View changes'
      })), /*#__PURE__*/React.createElement(ContentActionButton, {
        variant: "remove",
        "aria-label": L({
          zh: '关闭改写提示',
          en: 'Dismiss rewrite notice'
        }),
        onClick: dismissRewrite
      }, "\xD7"))), rewriteReview && !inlineReview && showRewriteDiff && /*#__PURE__*/React.createElement(RewriteDiff, {
        before: rewriteReview.before,
        after: rewriteReview.after
      }));
    }
    return /*#__PURE__*/React.createElement("div", {
      ref: wrapRef,
      className: 'cr-wbe c-editable-surface editing' + (block.type === 'cards' ? ' card-editing' : '') + (block.type === 'text' ? ' text-editing' : '') + (block.type === 'rel' ? ' rel-editing' : '') + (incomplete ? ' err' : '')
    }, block.type === 'rel' && window.RelationshipMap ? /*#__PURE__*/React.createElement("div", {
      className: "dbk-wrap"
    }, /*#__PURE__*/React.createElement("div", {
      className: "dbk"
    }, /*#__PURE__*/React.createElement(window.RelationshipMap, {
      editing: true,
      head: /*#__PURE__*/React.createElement("div", {
        className: "dbk-h"
      }, /*#__PURE__*/React.createElement("span", {
        className: "dbk-d"
      }), /*#__PURE__*/React.createElement("span", {
        className: "dbk-k"
      }, L(block.k)), /*#__PURE__*/React.createElement("span", {
        className: "dbk-c c-latin"
      }, "\xD7", Array.isArray(value) ? value.length : 0)),
      items: value,
      initialViewState: cardView,
      onViewStateChange: setCardView,
      onFinish: finish,
      canRewrite: canRw && !!identity && baseVersion != null && !dirtyRef.current,
      askAction: /*#__PURE__*/React.createElement(AskAssistantButton, {
        bookId: bookId,
        identity: identity,
        path: path
      }),
      onRewrite: e => setAgent(window.agentFloatPositionFor(e.currentTarget.getBoundingClientRect())),
      onItemsChange: v => {
        dirtyRef.current = true;
        if (incomplete) setIncomplete(null);
        onChange(v);
      }
    }))) : block.type === 'cards' ? /*#__PURE__*/React.createElement("div", {
      className: "dbk-wrap"
    }, /*#__PURE__*/React.createElement("div", {
      className: "dbk"
    }, /*#__PURE__*/React.createElement(CardCollectionEditor, {
      block: block,
      items: value,
      rowOrder: cardRowOrder,
      initialViewState: cardView,
      onFinish: finish,
      canRewrite: canRw && !!identity && baseVersion != null && !dirtyRef.current,
      askAction: /*#__PURE__*/React.createElement(AskAssistantButton, {
        bookId: bookId,
        identity: identity,
        path: path
      }),
      onRewrite: e => setAgent(window.agentFloatPositionFor(e.currentTarget.getBoundingClientRect())),
      onChange: v => {
        dirtyRef.current = true;
        if (incomplete) setIncomplete(null);
        onChange(v);
      }
    }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "cr-wbe-ehead"
    }, /*#__PURE__*/React.createElement("span", {
      className: "dbk-k"
    }, L(block.k)), /*#__PURE__*/React.createElement("span", {
      className: "cr-wbe-spacer"
    }), /*#__PURE__*/React.createElement(AskAssistantButton, {
      bookId: bookId,
      identity: identity,
      path: path
    }), canRw && /*#__PURE__*/React.createElement(ContentActionButton, {
      icon: "bolt",
      className: "cr-wbe-ai",
      disabled: !identity || baseVersion == null || dirtyRef.current || window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED(),
      onMouseDown: e => e.preventDefault(),
      onClick: e => setAgent(window.agentFloatPositionFor(e.currentTarget.getBoundingClientRect()))
    }, L({
      zh: 'AI 改写',
      en: 'AI rewrite'
    })), /*#__PURE__*/React.createElement(DoneActionButton, {
      onMouseDown: e => e.preventDefault(),
      onClick: finish
    })), /*#__PURE__*/React.createElement("div", {
      className: "cr-wbe-se"
    }, /*#__PURE__*/React.createElement(StructuredEditor, {
      value: value,
      onChange: v => {
        dirtyRef.current = true;
        if (incomplete) setIncomplete(null);
        onChange(v);
      }
    }))), incomplete ? /*#__PURE__*/React.createElement("div", {
      className: "cr-dpe-msg warn"
    }, L({
      zh: '第 ' + incomplete.join('、') + ' 项还有字段未填——请补全，或清空 / 删除该项后再退出。',
      en: 'Item ' + incomplete.join(', ') + ' has empty fields — fill them in, or clear/delete it before exiting.'
    })) : !['cards', 'rel'].includes(block.type) && /*#__PURE__*/React.createElement("div", {
      className: "cr-wbe-acts"
    }, /*#__PURE__*/React.createElement("span", {
      className: "cr-dp-hint"
    }, L({
      zh: '点击别处或「完成」即保存 · 全空的项会自动剔除 · 列表 / 卡片可增删',
      en: 'Click away or Done to save · fully-empty items are dropped · add/remove items'
    }))), agent && /*#__PURE__*/React.createElement(RewriteAgent, {
      bookId: bookId,
      identity: identity,
      baseVersion: baseVersion,
      path: path,
      label: block.k,
      startPos: agent,
      onApply: (val, result) => {
        dirtyRef.current = false;
        const review = {
          before: cloneRewriteValue(value),
          after: cloneRewriteValue(val),
          version: result && result.version
        };
        if (inlineReviewCapable && JSON.stringify(review.before) !== JSON.stringify(review.after)) Undo.write(localStorage, undoKey, review);
        setRewriteReview(review);
        setShowRewriteDiff(false);
        setShowRewriteOriginal(false);
        onRewriteApply(val, result);
        setEditing(false);
        setRewritePulse(true);
        setTimeout(() => setRewritePulse(false), 1800);
        setAgent(null);
      },
      onConflict: onRewriteConflict,
      onClose: () => setAgent(null)
    }));
  }

  /* ---- 单分区编辑：保留页面原排版作为查看态(renderView)，点铅笔就地展开为结构化
     编辑器(scope 到 ctl 内容的 path 子树) + 按分区 AI 改写 + 退出自动保存。 ---- */
  function SectionField({
    ctl,
    path,
    resourceType,
    bookId,
    label,
    renderView
  }) {
    const content = ctl && ctl.state ? ctl.state.content : null;
    const loaded = !!(ctl && ctl.state && !ctl.state.loading && content);
    const p = Array.isArray(path) ? path : [path];
    const value = content ? window.getIn(content, p) : undefined;
    const block = {
      k: label,
      key: p[p.length - 1]
    };
    return /*#__PURE__*/React.createElement(BlockEdit, {
      block: block,
      path: p,
      value: value,
      loaded: loaded,
      bookId: bookId,
      resourceType: resourceType,
      identity: ctl.identity(),
      baseVersion: ctl.state.version,
      onChange: v => ctl.update(p, v),
      onCommit: v => ctl.flush(p, v),
      onRewriteUndo: v => ctl.restore(p, v),
      onRewriteApply: (v, result) => ctl.acceptRemote(p, v, result && result.version),
      onRewriteConflict: ctl.recoverConflict,
      renderView: renderView
    });
  }
  window.LF_EDIT = {
    build: "editable-2026-06-14-sections",
    StructuredEditor,
    LeafText,
    useResourceEditor,
    adapters,
    labelOf,
    isBlankVal,
    pruneBlanks,
    findIncomplete,
    RewriteAgent,
    rewriteAvailable,
    useFieldCapabilities,
    FieldCapability,
    registerFieldReviewView,
    BlocksEditor,
    LeadField,
    SectionField,
    AskAssistantButton,
    canCiteAssistant
  };
})();
}
