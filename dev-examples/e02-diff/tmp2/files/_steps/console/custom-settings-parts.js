{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const Core = window.CustomSettingsCore;
  const Review = window.AssistantCustomSettingsReview || {};
  const label = (zh, en) => Core.text(zh, en);
  function copy(key) {
    if (typeof window.TC === "function") {
      const text = window.TC(key);
      if (text && text !== key) return text;
    }
    const map = {
      asst_custom_unset: label("未填写", "Not set"),
      asst_field_empty: label("空", "Empty"),
      asst_custom_yes: label("是", "Yes"),
      asst_custom_no: label("否", "No"),
      asst_custom_list_item: label("列表项", "List item"),
      asst_custom_type_string: label("文本", "Text"),
      asst_custom_type_number: label("数字", "Number"),
      asst_custom_type_integer: label("整数", "Integer"),
      asst_custom_type_boolean: label("是或否", "Yes or no"),
      asst_custom_type_object: label("字段组", "Field group"),
      asst_custom_type_array: label("列表", "List"),
      asst_custom_required: label("字段必须保留", "Field must be present"),
      asst_custom_required_empty_allowed: label("必须保留，可留空", "Must be present; may be empty"),
      asst_custom_minLength: label("最少字符数", "Min characters"),
      asst_custom_maxLength: label("最多字符数", "Max characters"),
      asst_custom_minimum: label("最小值", "Minimum"),
      asst_custom_maximum: label("最大值", "Maximum"),
      asst_custom_minItems: label("最少项数", "Min items"),
      asst_custom_maxItems: label("最多项数", "Max items")
    };
    return map[key] || key;
  }
  function problemText(problem) {
    const code = problem && problem.code;
    if (code === "unknown_field") return label("存在无法按当前结构识别的字段，内容未丢弃。", "A field is outside the current structure. It was not dropped.");
    if (code === "missing_historical_definition") return label("缺少保存该版本时的类别结构，不能用当前结构阅读历史。", "The historical category structure is missing. The current structure cannot be used to read this version.");
    if (code === "invalid_schema") return label("类别结构无法完整解析。", "The category structure could not be fully parsed.");
    return label("内容无法按当前结构完整解析，未丢弃已有字段。", "This content could not be fully parsed against the current structure. Existing fields were not dropped.");
  }
  function problemsText(problems) {
    return (problems || []).map(problemText).filter((text, index, all) => all.indexOf(text) === index).join(" ");
  }
  function Note({
    children,
    tone
  }) {
    return /*#__PURE__*/React.createElement("p", {
      role: tone === "alert" ? "alert" : "status",
      className: "cs-note" + (tone ? " cs-note-" + tone : "")
    }, children);
  }
  function Button(props) {
    const Action = window.ContentActionButton;
    return Action ? /*#__PURE__*/React.createElement(Action, props) : /*#__PURE__*/React.createElement("button", _extends({
      type: "button",
      className: "c-btn ghost"
    }, props));
  }

  // Page-local overflow menu: one open menu at a time, closed by selection, outside click or Escape.
  function ActionMenu({
    label: menuLabel,
    items
  }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    useEffect(() => {
      if (!open || typeof document === "undefined") return undefined;
      const first = rootRef.current && rootRef.current.querySelector("[role=menuitem]:not(:disabled)");
      if (first) first.focus();
      const onPointer = event => {
        if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
      };
      const onKey = event => {
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          rootRef.current?.querySelector('[aria-haspopup="menu"]')?.focus();
        }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && rootRef.current?.contains(event.target)) {
          const buttons = Array.from(rootRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)'));
          if (!buttons.length) return;
          event.preventDefault();
          const at = buttons.indexOf(document.activeElement);
          const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (at + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next].focus();
        }
      };
      document.addEventListener("mousedown", onPointer);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onPointer);
        document.removeEventListener("keydown", onKey);
      };
    }, [open]);
    const visible = items.filter(Boolean);
    if (!visible.length) return null;
    return /*#__PURE__*/React.createElement("span", {
      className: "cs-menu",
      ref: rootRef
    }, /*#__PURE__*/React.createElement(Button, {
      className: "cs-menu-trigger",
      "aria-haspopup": "menu",
      "aria-expanded": open,
      "aria-label": menuLabel,
      title: menuLabel,
      onClick: () => setOpen(!open)
    }, "\u22EF"), open ? /*#__PURE__*/React.createElement("span", {
      className: "cs-menu-list",
      role: "menu",
      "aria-label": menuLabel
    }, visible.map(item => /*#__PURE__*/React.createElement("button", {
      type: "button",
      role: "menuitem",
      key: item.label,
      disabled: item.disabled,
      className: item.danger ? "is-danger" : "",
      title: item.hint || undefined,
      onClick: () => {
        setOpen(false);
        item.onClick();
      }
    }, /*#__PURE__*/React.createElement("span", null, item.label), item.hint ? /*#__PURE__*/React.createElement("small", null, item.hint) : null))) : null);
  }
  function CategoryNav({
    definitions,
    selectedRef,
    onSelect,
    onCreate,
    assistantEnabled,
    hasMore,
    loadingMore,
    onMore,
    outline,
    onJump
  }) {
    const [query, setQuery] = useState("");
    const [showOutline, setShowOutline] = useState(false);
    const searchable = definitions.length > 7;
    const visible = searchable ? definitions.filter(item => (item.name || "").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : definitions;
    const page = Review.useDisplayPage(visible.length, visible.findIndex(item => item.definition_ref === selectedRef));
    const outlinePage = Review.useDisplayPage(outline?.length || 0);
    return /*#__PURE__*/React.createElement("nav", {
      className: "cs-nav",
      "aria-label": label("设定类别", "Categories")
    }, /*#__PURE__*/React.createElement("div", {
      className: "cs-nav-heading"
    }, label("类别", "Categories")), searchable ? /*#__PURE__*/React.createElement("input", {
      className: "cs-nav-search",
      type: "search",
      value: query,
      onChange: event => setQuery(event.target.value),
      "aria-label": label("查找类别", "Find a category"),
      placeholder: label("查找类别", "Find a category")
    }) : null, /*#__PURE__*/React.createElement("div", {
      className: "cs-nav-list"
    }, visible.slice(page.start, page.end).map(item => {
      const on = item.definition_ref === selectedRef;
      return /*#__PURE__*/React.createElement("button", {
        type: "button",
        key: item.definition_ref,
        className: "cs-nav-item" + (on ? " on" : ""),
        "aria-current": on ? "true" : undefined,
        onClick: () => onSelect(item.definition_ref)
      }, /*#__PURE__*/React.createElement("span", {
        className: "cs-nav-name"
      }, item.name || label("未命名类别", "Untitled category")), item.status === "removed" ? /*#__PURE__*/React.createElement("small", null, label("已移除", "Removed")) : !on && item.enabled_for_generation === false ? /*#__PURE__*/React.createElement("small", null, label("不参与生成", "Not in generation")) : null);
    }), !visible.length ? /*#__PURE__*/React.createElement("p", {
      className: "cs-nav-empty"
    }, hasMore ? label("当前列表中没有匹配的类别", "No matches in this part of the list") : label("没有匹配的类别", "No matching categories")) : null, hasMore ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "cs-nav-item cs-nav-more",
      disabled: loadingMore,
      onClick: onMore
    }, loadingMore ? label("正在读取…", "Loading…") : query.trim() ? label("继续查找", "Search more") : label("更多类别", "More categories")) : null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn cs-nav-add",
      disabled: !assistantEnabled,
      onClick: onCreate,
      title: assistantEnabled ? undefined : label("创作助手当前未开放，暂时无法新建类别", "The assistant is unavailable, so categories cannot be created now")
    }, label("新建类别", "New category"))), /*#__PURE__*/React.createElement(Review.PageControls, {
      page: page,
      name: label("类别", "Categories")
    }), outline && outline.length > 2 ? /*#__PURE__*/React.createElement("div", {
      className: "cs-outline" + (showOutline ? " open" : "")
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "cs-outline-toggle",
      "aria-expanded": showOutline,
      onClick: () => setShowOutline(!showOutline)
    }, label("本页内容", "On this page")), /*#__PURE__*/React.createElement("div", {
      className: "cs-outline-heading"
    }, label("本页内容", "On this page")), /*#__PURE__*/React.createElement("div", {
      className: "cs-outline-list"
    }, outline.slice(outlinePage.start, outlinePage.end).map((item, index) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: item.key,
      "aria-label": label("定位到", "Go to ") + item.title,
      onClick: () => {
        onJump(outlinePage.start + index);
        setShowOutline(false);
      }
    }, /*#__PURE__*/React.createElement("span", null, item.title), item.count !== undefined ? /*#__PURE__*/React.createElement("small", null, item.count) : null))), /*#__PURE__*/React.createElement(Review.PageControls, {
      page: outlinePage,
      name: label("内容目录", "Contents")
    })) : null);
  }
  function GenerationSwitch({
    checked,
    disabled,
    pending,
    onChange
  }) {
    return /*#__PURE__*/React.createElement("label", {
      className: "cs-generation" + (checked ? " on" : ""),
      title: label("开启后，之后新建的卷纲与章节生成任务会读取这个类别的设定", "When on, new outline and chapter generation tasks read this category")
    }, /*#__PURE__*/React.createElement("span", {
      className: "set-mail-switch"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      role: "switch",
      checked: checked,
      disabled: disabled || pending,
      "aria-label": label("参与生成", "Use in generation"),
      onChange: event => onChange(event.target.checked)
    }), /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement("span", null, pending ? label("保存中…", "Saving…") : checked ? label("参与生成", "Used in generation") : label("不参与生成", "Not in generation")));
  }
  function CategoryHeader({
    definition,
    assistantEnabled,
    editor,
    includeRemoved,
    generationPending,
    generationError,
    onToggleGeneration,
    onGenerate,
    onAskStructure,
    onHistory,
    onAskRemove,
    onToggleRemoved
  }) {
    const removed = definition.status === "removed";
    const editing = editor.active();
    const assistantHint = assistantEnabled ? undefined : label("创作助手当前未开放", "The assistant is unavailable");
    return /*#__PURE__*/React.createElement("header", {
      className: "cs-head" + (editing ? " editing" : "")
    }, /*#__PURE__*/React.createElement("div", {
      className: "cs-head-title"
    }, /*#__PURE__*/React.createElement("h1", {
      className: "c-serif"
    }, definition.name || label("未命名类别", "Untitled category")), removed ? /*#__PURE__*/React.createElement("span", {
      className: "cs-flag"
    }, label("已移除", "Removed")) : /*#__PURE__*/React.createElement(GenerationSwitch, {
      checked: !!definition.enabled_for_generation,
      disabled: editing,
      pending: generationPending,
      onChange: onToggleGeneration
    })), /*#__PURE__*/React.createElement("span", {
      className: "cs-head-actions"
    }, !editing && !removed ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      icon: "sparkle",
      disabled: !assistantEnabled || generationPending,
      title: assistantHint,
      onClick: onGenerate
    }, label("让助手完善", "Ask assistant to improve"))) : null, /*#__PURE__*/React.createElement(ActionMenu, {
      label: label("类别操作", "Category actions"),
      items: [!removed && {
        label: label("让助手修改结构", "Ask assistant to change structure"),
        disabled: !assistantEnabled || editing || generationPending,
        hint: assistantHint,
        onClick: onAskStructure
      }, {
        label: removed ? label("修订记录与恢复", "History and restore") : label("修订记录", "Revision history"),
        disabled: generationPending,
        onClick: onHistory
      }, {
        label: includeRemoved ? label("隐藏已移除", "Hide removed") : label("查看已移除", "View removed"),
        disabled: generationPending,
        onClick: onToggleRemoved
      }, !removed && {
        label: label("让助手移除类别", "Ask assistant to remove"),
        danger: true,
        disabled: !assistantEnabled || editing || generationPending,
        hint: assistantHint,
        onClick: onAskRemove
      }]
    })), generationError ? /*#__PURE__*/React.createElement(Note, {
      tone: "alert"
    }, generationError) : null);
  }
  function constraintText(row) {
    const parts = [];
    if (row.description) parts.push(row.description);
    row.constraints.forEach(({
      key,
      value
    }) => parts.push(copy("asst_custom_" + key) + " " + value));
    if (row.enum) parts.push(label("可选：", "Choices: ") + row.enum.map(value => typeof value === "boolean" ? copy(value ? "asst_custom_yes" : "asst_custom_no") : String(value)).join(" / "));
    return parts.join(" · ");
  }
  function RulesPanel({
    definition
  }) {
    const [open, setOpen] = useState(false);
    const id = React.useId();
    const table = React.useMemo(() => Core.fieldTable(definition), [definition]);
    const page = Review.useDisplayPage(table.rows.length);
    const spec = definition.content_spec || "";
    return /*#__PURE__*/React.createElement("section", {
      className: "cs-rules" + (open ? " open" : "")
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "cs-rules-toggle",
      "aria-expanded": open,
      "aria-controls": id,
      onClick: () => setOpen(!open)
    }, /*#__PURE__*/React.createElement("b", null, label("类别规则", "Category rules")), !open && spec ? /*#__PURE__*/React.createElement("em", null, spec) : null, /*#__PURE__*/React.createElement("i", null, open ? label("收起", "Collapse") : label("展开", "Expand"))), open ? /*#__PURE__*/React.createElement("div", {
      className: "cs-rules-body",
      id: id
    }, spec ? /*#__PURE__*/React.createElement("p", {
      className: "cs-rules-spec"
    }, spec) : /*#__PURE__*/React.createElement("p", {
      className: "cs-note"
    }, label("未填写内容规范。", "No content rules.")), table.incomplete ? /*#__PURE__*/React.createElement(Note, {
      tone: "alert"
    }, problemText({
      code: "invalid_schema"
    })) : /*#__PURE__*/React.createElement("table", {
      className: "cs-rules-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, label("字段", "Field")), /*#__PURE__*/React.createElement("th", null, label("类型", "Type")), /*#__PURE__*/React.createElement("th", null, label("字段要求", "Field requirement")), /*#__PURE__*/React.createElement("th", null, label("说明", "Notes")))), /*#__PURE__*/React.createElement("tbody", null, table.rows.slice(page.start, page.end).map(row => /*#__PURE__*/React.createElement("tr", {
      key: row.path + ":" + row.depth + ":" + row.label
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        paddingInlineStart: Math.min(row.depth - 2, 5) * 14 + 10 + "px"
      }
    }, row.label || copy("asst_custom_list_item")), /*#__PURE__*/React.createElement("td", null, copy("asst_custom_type_" + row.type)), /*#__PURE__*/React.createElement("td", null, row.required ? copy(window.AssistantCustomSettingsCore.presenceKey(row)) : ""), /*#__PURE__*/React.createElement("td", null, constraintText(row)))))), /*#__PURE__*/React.createElement(Review.PageControls, {
      page: page,
      name: label("字段", "Fields")
    })) : null);
  }
  function FirstRun({
    assistantEnabled,
    includeRemoved,
    onCreate,
    onToggleRemoved
  }) {
    const examples = [label("法宝", "Artifacts"), label("宗门", "Sects"), label("功法", "Techniques"), label("灵兽", "Spirit beasts")];
    return /*#__PURE__*/React.createElement("section", {
      className: "cs-first"
    }, /*#__PURE__*/React.createElement("h1", {
      className: "c-serif"
    }, label("为这本书建立自己的设定类别", "Create setting categories for this book")), /*#__PURE__*/React.createElement("p", null, label("从一个类别开始。助手拟定结构，经你确认后保存；之后可在这里编辑内容，并选择是否参与生成。", "Start with a category. The assistant proposes its structure for your approval. Then edit the content here and choose whether generation uses it.")), /*#__PURE__*/React.createElement("div", {
      className: "cs-first-examples"
    }, examples.map(name => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: name,
      disabled: !assistantEnabled,
      onClick: () => onCreate(name)
    }, name))), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: "sparkle",
      disabled: !assistantEnabled,
      onClick: () => onCreate()
    }, label("让助手新建类别", "Ask the assistant to create one")), /*#__PURE__*/React.createElement(Button, {
      onClick: onToggleRemoved
    }, includeRemoved ? label("返回新建类别", "Back to creating categories") : label("找回已移除类别", "Find removed categories")), includeRemoved ? /*#__PURE__*/React.createElement(Note, null, label("这本书没有已移除的类别。", "This book has no removed categories.")) : null, !assistantEnabled ? /*#__PURE__*/React.createElement(Note, null, label("创作助手当前未开放，暂时无法新建类别。", "The assistant is unavailable, so categories cannot be created now.")) : null);
  }
  function ObjectList({
    name,
    title,
    schema,
    value,
    path,
    active,
    editing,
    locked,
    actions,
    feedback,
    onChange,
    issues
  }) {
    const Collection = window.CardCollection;
    const Fields = window.CustomSettingFields;
    const Edit = window.CustomSettingsEditorCore;
    const items = Array.isArray(value) ? value : [];
    const view = window.useCardCollectionState({
      count: items.length,
      initialViewState: {
        layout: "side"
      }
    });
    const page = Review.useDisplayPage(items.length, view.selected);
    useEffect(() => {
      if (!editing) return;
      const issue = (issues || []).find(item => item.path.startsWith(path + "/"));
      const index = issue && Number(issue.path.slice(path.length + 1).split("/")[0]);
      if (Number.isInteger(index) && index >= 0 && index < items.length) view.setSelected(index);
    }, [issues, editing, path]);
    const titleOf = (item, index) => {
      const key = Core.firstStringKey(schema.items, item);
      return key ? item[key] : label("第 " + (index + 1) + " 项", "Item " + (index + 1));
    };
    const errors = (issues || []).filter(issue => issue.path === path);
    return /*#__PURE__*/React.createElement(Collection, {
      items: items.slice(page.start, page.end),
      selected: Math.max(0, view.selected - page.start),
      onSelect: index => view.setSelected(page.start + index),
      expanded: view.expanded,
      multi: items.length > 1,
      layout: view.layout,
      onLayoutChange: view.chooseLayout,
      onExpandedChange: view.setExpanded,
      editing: active,
      className: "cs-document-list c-content-panel c-editable-surface cr-wbe",
      title: title,
      fitContent: true,
      expandedVariant: "uniform",
      actions: /*#__PURE__*/React.createElement(React.Fragment, null, editing ? /*#__PURE__*/React.createElement(Button, {
        variant: "add",
        icon: "plus",
        "data-cs-add": true,
        disabled: locked || items.length >= Edit.itemLimit(schema),
        onClick: () => {
          onChange(items.concat([Edit.initial(schema.items)]));
          view.setSelected(items.length);
        }
      }, label("新增", "Add")) : null, actions),
      body: !items.length ? /*#__PURE__*/React.createElement("div", {
        className: "cs-document-empty"
      }, label("还没有内容", "Nothing here yet")) : undefined,
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Review.PageControls, {
        page: page,
        name: name,
        disabled: locked,
        onPage: view.setSelected
      }), errors.length ? /*#__PURE__*/React.createElement(Note, {
        tone: "alert"
      }, label("列表项数不符合类别规则。", "The number of items does not meet the category rules.")) : null, feedback),
      getTitle: (item, index) => titleOf(item, page.start + index),
      showIndexNumbers: items.length <= window.AssistantCustomSettingsCore.DISPLAY_PAGE_SIZE,
      renderCard: (item, localIndex, {
        compact
      }) => {
        const index = page.start + localIndex;
        const titleKey = Core.firstStringKey(schema.items, item);
        const tree = editing ? null : window.AssistantCustomSettingsCore.valueTree(schema.items, item, true, 3, path);
        const body = tree && {
          ...tree,
          rows: tree.rows.filter(row => row.key !== titleKey)
        };
        return /*#__PURE__*/React.createElement("article", {
          key: index,
          className: (compact ? "dbk-card-reader-card" : "dbk-card-reader-detail") + " cs-document-item"
        }, /*#__PURE__*/React.createElement("div", {
          className: compact ? "dbk-card-reader-card-head" : "dbk-card-reader-detail-head"
        }, /*#__PURE__*/React.createElement("h3", {
          className: "c-serif"
        }, titleOf(item, index)), editing ? /*#__PURE__*/React.createElement(Button, {
          variant: "remove",
          disabled: locked || items.length <= (schema.minItems || 0),
          "aria-label": label("删除", "Delete ") + titleOf(item, index),
          onClick: () => onChange(items.filter((_, at) => at !== index))
        }, "\xD7") : null), /*#__PURE__*/React.createElement("div", {
          className: "dbk-card-reader-fields"
        }, editing ? /*#__PURE__*/React.createElement("fieldset", {
          className: "cs-editor-fields",
          disabled: locked
        }, /*#__PURE__*/React.createElement(Fields, {
          schema: schema.items,
          value: item,
          name: name + " " + (index + 1),
          path: Edit.pointer(path, index),
          issues: issues,
          onChange: next => onChange(items.map((old, at) => at === index ? next : old))
        })) : body.rows.length ? /*#__PURE__*/React.createElement(Review.Value, {
          node: body,
          copy: copy,
          fieldPath: path,
          arrayPath: path
        }) : null));
      }
    });
  }
  function DocumentBlocks({
    definition,
    editor,
    onEdit,
    onCiteField,
    editDisabled,
    notice,
    flash,
    focus
  }) {
    const Edit = window.CustomSettingsEditorCore;
    const Schema = window.AssistantCustomSettingsCore;
    const TextBlock = window.TitledTextBlock;
    const Fields = window.CustomSettingFields;
    const Actions = window.CustomSettingEditorActions;
    const EditButton = window.EditActionButton;
    const Status = window.CustomSettingDocumentEditorStatus;
    const state = editor.state;
    const source = state?.definition || definition;
    const rootRef = useRef(null);
    const display = React.useMemo(() => Core.displayDefinition(source), [source]);
    const properties = display.incomplete ? [] : Schema.orderedProperties(source.json_schema);
    const page = Review.useDisplayPage(properties.length, properties.findIndex(([key]) => key === (state?.fieldKey ?? focus?.key)));
    useEffect(() => {
      if (!focus || state) return;
      const section = Array.from(rootRef.current?.querySelectorAll('[data-cs-section]') || []).find(node => node.getAttribute('data-cs-section') === focus.key);
      section?.scrollIntoView({
        block: 'start',
        behavior: 'auto'
      });
      section?.focus({
        preventScroll: true
      });
    }, [focus, page.start, !!state]);
    if (display.incomplete) return /*#__PURE__*/React.createElement("div", {
      className: "cs-document"
    }, /*#__PURE__*/React.createElement(Note, {
      tone: "alert"
    }, problemsText(display.problems)), /*#__PURE__*/React.createElement(Review.Value, {
      node: display.tree,
      copy: copy
    }));
    return /*#__PURE__*/React.createElement("div", {
      ref: rootRef,
      className: "cs-document",
      role: "region",
      "aria-label": label("设定内容", "Setting content")
    }, !properties.length ? /*#__PURE__*/React.createElement(Note, null, label("当前类别尚未定义内容，请让助手补充结构。", "Ask the assistant to define the category structure.")) : null, properties.slice(page.start, page.end).map(([key, schema]) => {
      const active = state?.fieldKey === key;
      const editing = !!(active && state.definition && !state.loading);
      const locked = !!(state && (state.saving || state.uncertain || state.conflict));
      const content = editing ? state.draft : source.content;
      const value = Edit.own(content, key) ? content[key] : undefined;
      const title = schema.title || key;
      const head = /*#__PURE__*/React.createElement("div", {
        className: "dbk-h"
      }, /*#__PURE__*/React.createElement("span", {
        className: "dbk-k"
      }, title));
      const path = Edit.pointer("", key);
      const citePath = Edit.pointer("/content", key);
      const cite = !state && onCiteField ? onCiteField : undefined;
      const change = next => editor.changeField(next);
      const required = (source.json_schema.required || []).includes(key);
      const actions = active ? /*#__PURE__*/React.createElement(Actions, {
        editor: editor
      }) : source.status !== "removed" ? /*#__PURE__*/React.createElement(React.Fragment, null, flash?.fieldKey === key ? /*#__PURE__*/React.createElement("span", {
        className: "cs-flash",
        role: "status"
      }, flash.text) : null, cite ? /*#__PURE__*/React.createElement(Button, {
        icon: "sparkle",
        "aria-label": label("询问助手：", "Ask assistant: ") + title,
        onClick: () => cite(citePath)
      }, label("询问助手", "Ask assistant")) : null, /*#__PURE__*/React.createElement(EditButton, {
        "aria-label": label("编辑", "Edit ") + title,
        disabled: !!state || editDisabled,
        title: state ? label("请先保存或取消当前区块", "Save or cancel the current block first") : undefined,
        onClick: () => onEdit(key)
      })) : null;
      const feedback = active ? /*#__PURE__*/React.createElement(Status, {
        key: key,
        editor: editor,
        notice: notice
      }) : null;
      const compact = schema.type === "boolean" || schema.type === "integer" || schema.type === "number" || !!schema.enum;
      const sectionProps = {
        className: "cs-document-section" + (compact ? " is-compact" : "") + (active ? " is-editing" : ""),
        "data-cs-section": key,
        "data-kind": schema.type,
        tabIndex: -1,
        "aria-label": title
      };
      if (schema.type === "array" && schema.items.type === "object") {
        return /*#__PURE__*/React.createElement("section", _extends({
          key: key
        }, sectionProps), /*#__PURE__*/React.createElement(ObjectList, {
          name: title,
          title: head,
          schema: schema,
          value: value,
          path: path,
          active: active,
          editing: editing,
          locked: locked,
          actions: actions,
          feedback: /*#__PURE__*/React.createElement(React.Fragment, null, editing && !required && value !== undefined ? /*#__PURE__*/React.createElement(Button, {
            disabled: locked,
            onClick: () => change(undefined)
          }, label("清除", "Clear ") + title) : null, feedback),
          onChange: change,
          issues: active ? state.issues : []
        }));
      }
      const node = editing ? null : Schema.valueTree(schema, value, value !== undefined, 2, citePath);
      return /*#__PURE__*/React.createElement("section", _extends({
        key: key
      }, sectionProps), /*#__PURE__*/React.createElement(TextBlock, {
        head: head,
        editing: active,
        actions: actions,
        className: "c-editable-surface cr-wbe"
      }, editing ? /*#__PURE__*/React.createElement("fieldset", {
        className: "cs-editor-fields",
        disabled: locked
      }, /*#__PURE__*/React.createElement(Fields, {
        schema: schema,
        value: value,
        name: title,
        path: path,
        required: required,
        issues: state.issues,
        onChange: change
      })) : schema.type === "array" && value !== undefined && schema.items.type !== "array" ? /*#__PURE__*/React.createElement(ScalarList, {
        value: value
      }) : /*#__PURE__*/React.createElement(Review.Value, {
        node: node,
        copy: copy
      }), feedback));
    }), /*#__PURE__*/React.createElement(Review.PageControls, {
      page: page,
      name: label("内容区块", "Content blocks"),
      disabled: !!state
    }));
  }
  function ScalarList({
    value
  }) {
    const page = Review.useDisplayPage(value.length);
    const List = window.StructuredList;
    return value.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(List, {
      mode: "list",
      items: value.slice(page.start, page.end).map(item => typeof item === "boolean" ? copy(item ? "asst_custom_yes" : "asst_custom_no") : item === "" ? copy("asst_field_empty") : String(item))
    }), /*#__PURE__*/React.createElement(Review.PageControls, {
      page: page
    })) : /*#__PURE__*/React.createElement("span", null, copy("asst_field_empty"));
  }
  window.CustomSettingsParts = {
    DocumentBlocks,
    copy,
    problemText,
    problemsText,
    Note,
    Button,
    ActionMenu,
    CategoryNav,
    CategoryHeader,
    RulesPanel,
    FirstRun
  };
})();
}
