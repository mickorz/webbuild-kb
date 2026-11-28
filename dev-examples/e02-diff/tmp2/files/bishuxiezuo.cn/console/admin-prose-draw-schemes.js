{
(function () {
  const A = window.AdminProseDraw,
    {
      C,
      t,
      Button,
      Notice,
      Panel,
      Field,
      Table,
      Detail,
      Facts,
      Tag,
      shortId,
      date,
      useFormGuard,
      useRead,
      ReadState
    } = A;
  function Schemes({
    app
  }) {
    const [query, setQuery] = React.useState(''),
      [intent, setIntent] = React.useState('');
    const rows = app.configs.filter(row => !row.scheme_deleted && row.is_current !== false && (!query || (row.name + row.id + row.model_ref).toLowerCase().includes(query.toLowerCase())) && (intent === '' || row.inject_intent === (intent === 'true')));
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "apd-baseline"
    }, /*#__PURE__*/React.createElement("span", null, "\u5F53\u524D\u9ED8\u8BA4\u6B63\u5F0F\u914D\u7F6E"), /*#__PURE__*/React.createElement("strong", null, app.context?.official?.model_ref || '未取得'), /*#__PURE__*/React.createElement("span", null, app.context?.official ? app.context.official.inject_intent ? '注入意图' : '不注入意图' : '')), /*#__PURE__*/React.createElement("div", {
      className: "apd-toolbar"
    }, /*#__PURE__*/React.createElement(Field, {
      label: "\u641C\u7D22\u65B9\u6848"
    }, /*#__PURE__*/React.createElement("input", {
      type: "search",
      value: query,
      onChange: e => setQuery(e.target.value)
    })), /*#__PURE__*/React.createElement(Field, {
      label: "\u610F\u56FE\u6CE8\u5165"
    }, /*#__PURE__*/React.createElement("select", {
      value: intent,
      onChange: e => setIntent(e.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u5168\u90E8"), /*#__PURE__*/React.createElement("option", {
      value: "true"
    }, "\u6CE8\u5165\u610F\u56FE"), /*#__PURE__*/React.createElement("option", {
      value: "false"
    }, "\u4E0D\u6CE8\u5165\u610F\u56FE"))), /*#__PURE__*/React.createElement(Button, {
      primary: true,
      disabled: !app.context || !app.catalog,
      onClick: () => app.open('newScheme')
    }, "\u521B\u5EFA\u751F\u6210\u65B9\u6848")), /*#__PURE__*/React.createElement(Panel, {
      title: "\u751F\u6210\u65B9\u6848"
    }, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u751F\u6210\u65B9\u6848",
      rows: rows,
      rowKey: "id",
      empty: "\u5C1A\u65E0\u65B9\u6848\u7248\u672C",
      columns: [{
        key: 'name',
        header: '方案',
        render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
          link: true,
          onClick: () => app.open('scheme', row.id)
        }, C.versionLabel(row)), /*#__PURE__*/React.createElement("small", null, shortId(row.id)))
      }, {
        key: 'model_ref',
        header: '写手模型'
      }, {
        key: 'intent',
        header: '意图注入',
        render: row => row.inject_intent ? '开启' : '关闭'
      }, {
        key: 'official',
        header: '用途',
        render: row => row.scheme_kind === 'official' ? /*#__PURE__*/React.createElement(Tag, null, row.is_current ? '系统正式 · 自动跟进' : '正式历史版本') : app.tasks.some(task => task.candidates.some(member => member.config_id === row.id)) ? '评估候选' : '已发布'
      }, {
        key: 'created',
        header: '创建时间',
        render: row => date(row.created_at)
      }, {
        key: 'action',
        header: '操作',
        render: row => /*#__PURE__*/React.createElement(SchemeActions, {
          app: app,
          scheme: row
        })
      }]
    })));
  }
  function SchemeActions({
    app,
    scheme
  }) {
    const latest = scheme.scheme_id && app.configs.find(row => row.scheme_id === scheme.scheme_id && row.is_current !== false) || scheme;
    return /*#__PURE__*/React.createElement("div", {
      className: "apd-row"
    }, /*#__PURE__*/React.createElement(Button, {
      link: true,
      disabled: !app.catalog,
      onClick: () => app.open('newScheme', scheme.id, {
        mode: 'copy'
      })
    }, "\u590D\u5236"), scheme.scheme_kind === 'official' ? /*#__PURE__*/React.createElement("span", {
      className: "apd-muted"
    }, "\u7531\u8282\u70B9\u6A21\u578B\u7BA1\u7406") : !scheme.scheme_deleted && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      link: true,
      disabled: !app.catalog,
      onClick: () => app.open('newScheme', latest.id, {
        mode: 'edit'
      })
    }, "\u7F16\u8F91"), /*#__PURE__*/React.createElement(Button, {
      link: true,
      danger: true,
      onClick: () => app.open('deleteScheme', latest.id)
    }, "\u5220\u9664")));
  }
  function DeleteScheme({
    app,
    route
  }) {
    const scheme = app.scheme(route.id);
    const references = useRead(signal => app.api.schemeReferences(scheme.scheme_id, signal), scheme.scheme_id);
    const [error, setError] = React.useState('');
    const blocked = !references.data || references.loading || !!references.error || references.data.items.length > 0;
    async function remove() {
      try {
        await app.mutate(async () => {
          await app.api.deleteScheme(scheme.scheme_id);
          await app.refresh();
          app.replace('scheme', scheme.id);
        });
      } catch (e) {
        setError(e.message);
        await references.refresh();
      }
    }
    return /*#__PURE__*/React.createElement(Detail, {
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
        onClick: app.back,
        disabled: app.busy
      }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement(Button, {
        danger: true,
        disabled: app.busy || blocked || scheme.scheme_kind === 'official',
        onClick: remove
      }, "\u786E\u8BA4\u5220\u9664"))
    }, /*#__PURE__*/React.createElement("p", null, "\u5220\u9664\u300C", scheme.name, "\u300D\u540E\uFF0C\u65B9\u6848\u4E0D\u518D\u51FA\u73B0\u5728\u53EF\u9009\u5217\u8868\u4E2D\u3002\u5386\u53F2\u7248\u672C\u3001\u8F6E\u6B21\u548C\u7EDF\u8BA1\u4ECD\u4FDD\u7559\u3002"), /*#__PURE__*/React.createElement(ReadState, {
      state: references
    }, references.data?.items.length > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Notice, null, "\u4ECD\u88AB\u4EE5\u4E0B\u672A\u7ED3\u675F\u4EFB\u52A1\u5F15\u7528\uFF0C\u6682\u4E0D\u80FD\u5220\u9664\u3002"), /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u5220\u9664\u5F15\u7528\u4EFB\u52A1",
      rows: references.data.items,
      rowKey: "id",
      columns: [{
        key: 'name',
        header: '任务'
      }, {
        key: 'status',
        header: '状态',
        render: row => A.statusLabel(row.status)
      }]
    })) : /*#__PURE__*/React.createElement("p", null, "\u6CA1\u6709\u672A\u7ED3\u675F\u4EFB\u52A1\u5F15\u7528\u6B64\u65B9\u6848\u3002")), references.error && /*#__PURE__*/React.createElement(Button, {
      onClick: references.refresh
    }, "\u91CD\u65B0\u8BFB\u53D6\u5F15\u7528"), error && /*#__PURE__*/React.createElement(Notice, {
      error: true
    }, error));
  }
  function SchemeDetail({
    app,
    route
  }) {
    const scheme = app.scheme(route.id);
    if (!scheme) return /*#__PURE__*/React.createElement(Detail, null, /*#__PURE__*/React.createElement(Notice, {
      error: true
    }, "\u65B9\u6848\u7248\u672C\u672A\u627E\u5230\uFF0C\u8BF7\u5237\u65B0\u3002"));
    const tasks = app.tasks.filter(task => task.baseline_config_id === scheme.id || (task.baseline_versions || []).some(version => version.id === scheme.id) || task.candidates.some(member => member.config_id === scheme.id));
    return /*#__PURE__*/React.createElement(Detail, {
      footer: /*#__PURE__*/React.createElement(SchemeActions, {
        app: app,
        scheme: scheme
      })
    }, scheme.scheme_deleted && /*#__PURE__*/React.createElement(Notice, null, "\u65B9\u6848\u5DF2\u5220\u9664\uFF0C\u5386\u53F2\u7248\u672C\u4E0E\u7EDF\u8BA1\u4FDD\u7559\u3002"), scheme.scheme_kind === 'official' && /*#__PURE__*/React.createElement(Notice, null, "\u7CFB\u7EDF\u6B63\u5F0F\u65B9\u6848\u968F\u8282\u70B9\u6A21\u578B\u4E2D\u7684\u5355\u5199\u624B\u914D\u7F6E\u81EA\u52A8\u66F4\u65B0\uFF0C\u5386\u53F2\u7248\u672C\u4FDD\u7559\uFF1B\u6B64\u5904\u4E0D\u53EF\u4FEE\u6539\u3002"), /*#__PURE__*/React.createElement(Panel, {
      title: "\u65B9\u6848\u7248\u672C"
    }, /*#__PURE__*/React.createElement("div", {
      className: "apd-row"
    }, app.configs.filter(row => scheme.scheme_id ? row.scheme_id === scheme.scheme_id : row.id === scheme.id).map(row => /*#__PURE__*/React.createElement(Button, {
      key: row.id,
      disabled: row.id === scheme.id,
      onClick: () => app.replace('scheme', row.id)
    }, C.versionLabel(row), row.is_current ? ' · 最新' : '')))), /*#__PURE__*/React.createElement(Facts, {
      entries: [["方案版本", C.versionLabel(scheme)], ["配置 ID", scheme.id], ["写手模型", scheme.model_ref], ["意图注入", scheme.inject_intent ? '开启' : '关闭'], ["创建时间", date(scheme.created_at)]]
    }), /*#__PURE__*/React.createElement(Panel, {
      title: "\u6A21\u578B\u53C2\u6570"
    }, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u6A21\u578B\u53C2\u6570",
      rows: Object.entries(scheme.model_params || {}).map(([name, value]) => ({
        name,
        value
      })),
      rowKey: "name",
      empty: "\u4F7F\u7528\u6A21\u578B\u9ED8\u8BA4\u53C2\u6570",
      columns: [{
        key: 'name',
        header: '参数',
        render: row => app.catalog?.model_params_schemas?.[scheme.model_ref]?.[row.name]?.label || row.name
      }, {
        key: 'value',
        header: '值',
        render: row => row.value === null ? '无限制 / 默认' : typeof row.value === 'object' ? JSON.stringify(row.value) : String(row.value)
      }]
    })), /*#__PURE__*/React.createElement("details", {
      className: "apd-help"
    }, /*#__PURE__*/React.createElement("summary", null, "\u8D44\u6E90\u4E0E\u914D\u7F6E\u8EAB\u4EFD"), /*#__PURE__*/React.createElement(Facts, {
      entries: [["注册表版本", scheme.registry_version], ["模型配置指纹", scheme.model_configuration_fingerprint], ["资源指纹", scheme.resource_manifest?.fingerprint]]
    })), /*#__PURE__*/React.createElement(Panel, {
      title: "\u5173\u8054\u4EFB\u52A1"
    }, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u65B9\u6848\u5173\u8054\u4EFB\u52A1",
      rows: tasks,
      rowKey: "id",
      empty: "\u5C1A\u672A\u7528\u4E8E\u8BC4\u4F30\u4EFB\u52A1",
      columns: [{
        key: 'name',
        header: '任务',
        render: task => /*#__PURE__*/React.createElement(Button, {
          link: true,
          onClick: () => app.open('task', task.id)
        }, task.name)
      }, {
        key: 'role',
        header: '用途',
        render: task => task.baseline_config_id === scheme.id ? '比较基准' : (task.baseline_versions || []).some(version => version.id === scheme.id) ? '历史比较基准' : '候选'
      }, {
        key: 'status',
        header: '状态',
        render: task => A.statusLabel(task.status)
      }]
    })));
  }
  function NewScheme({
    app,
    route
  }) {
    const source = route.source || app.context?.official || {},
      editing = route.mode === 'edit',
      [form, setForm] = React.useState(() => ({
        name: editing ? source.name : route.mode === 'copy' ? source.name.slice(0, 115) + ' · 副本' : '新生成方案',
        model_ref: source.model_ref || '',
        model_params: {
          ...source.model_params
        },
        inject_intent: !!source.inject_intent
      }));
    const references = useRead(signal => app.api.schemeReferences(source.scheme_id, signal), source.scheme_id, editing);
    const [selectedTasks, setSelectedTasks] = React.useState([]);
    const original = React.useRef(form),
      key = React.useRef(null),
      submitted = React.useRef(null),
      [error, setError] = React.useState(''),
      [removed, setRemoved] = React.useState([]),
      [uncertain, setUncertain] = React.useState(false);
    React.useEffect(() => {
      if (uncertain || !references.data) return;
      setSelectedTasks(previous => {
        const next = previous.filter(id => references.data.items.some(task => task.id === id));
        return C.same(next, previous) ? previous : next;
      });
    }, [references.data, uncertain]);
    useFormGuard(app, route, uncertain ? '上次发布结果尚未确认；可重试同一请求核对。退出不会撤销已完成的发布。' : selectedTasks.length > 0 || !C.same(original.current, form));
    const catalog = app.catalog,
      schema = catalog?.model_params_schemas?.[form.model_ref] || {},
      options = (catalog?.providers || []).flatMap(provider => (provider.models || []).map(model => ({
        value: model,
        label: provider.name + ' · ' + model.split(':').slice(1).join(':')
      })));
    const duplicate = app.configs.find(row => row.model_ref === form.model_ref && C.same(row.model_params, form.model_params) && row.inject_intent === form.inject_intent);
    function change(next) {
      setError('');
      setForm(next);
    }
    function modelChange(model) {
      const next = window.AdminModelControls.paramsForSchema(catalog.model_params_schemas[model] || {}, form.model_params);
      setRemoved(next.removed);
      change({
        ...form,
        model_ref: model,
        model_params: next.params
      });
    }
    const ParamInput = window.AdminModelParamInput;
    async function save() {
      if (!uncertain && (!form.name.trim() || !options.some(row => row.value === form.model_ref))) return;
      const payload = uncertain && submitted.current ? submitted.current : {
        ...form,
        name: form.name.trim(),
        ...(editing ? {
          scheme_id: source.scheme_id,
          expected_config_id: source.id,
          sync_task_ids: selectedTasks
        } : {})
      };
      if (!key.current || !C.same(submitted.current, payload)) {
        key.current = app.newKey();
        submitted.current = payload;
      }
      try {
        await app.mutate(async () => {
          const created = await app.api.createConfig(payload, key.current);
          app.upsertConfig(created);
          await app.refresh();
          setUncertain(false);
          app.replace('scheme', created.id);
        });
      } catch (e) {
        setError(e.message);
        setUncertain(!e.status || e.status >= 500);
      }
    }
    return /*#__PURE__*/React.createElement(Detail, {
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
        disabled: app.busy,
        onClick: app.back
      }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement(Button, {
        primary: true,
        disabled: app.busy || !uncertain && (!form.name.trim() || !options.some(row => row.value === form.model_ref) || editing && (!references.data || references.loading || !!references.error)),
        onClick: save
      }, app.busy ? '正在保存…' : uncertain ? '重试核对发布' : editing ? '保存修改' : '创建方案'))
    }, /*#__PURE__*/React.createElement("fieldset", {
      className: "apd-form",
      disabled: app.busy || uncertain
    }, /*#__PURE__*/React.createElement(Field, {
      label: "\u65B9\u6848\u540D\u79F0"
    }, /*#__PURE__*/React.createElement("input", {
      maxLength: "120",
      value: form.name,
      onChange: e => change({
        ...form,
        name: e.target.value
      })
    })), /*#__PURE__*/React.createElement(Field, {
      label: "\u5199\u624B\u6A21\u578B"
    }, /*#__PURE__*/React.createElement("select", {
      value: form.model_ref,
      onChange: e => modelChange(e.target.value)
    }, !options.some(row => row.value === form.model_ref) && /*#__PURE__*/React.createElement("option", {
      value: form.model_ref,
      disabled: true
    }, form.model_ref || '请选择模型'), options.map(option => /*#__PURE__*/React.createElement("option", {
      value: option.value,
      key: option.value
    }, option.label)))), /*#__PURE__*/React.createElement("label", {
      className: "apd-checkbox"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: form.inject_intent,
      onChange: e => change({
        ...form,
        inject_intent: e.target.checked
      })
    }), /*#__PURE__*/React.createElement("span", null, "\u5411\u5199\u624B\u6CE8\u5165\u610F\u56FE\u5BFC\u6F14\u4EA7\u7269")), removed.length > 0 && /*#__PURE__*/React.createElement(Notice, null, "\u6A21\u578B\u53D8\u5316\u540E\u79FB\u9664\u4E86\u4E0D\u652F\u6301\u7684\u53C2\u6570\uFF1A", removed.join('、')), /*#__PURE__*/React.createElement("fieldset", {
      className: "apd-choices-fieldset"
    }, /*#__PURE__*/React.createElement("legend", null, "\u6A21\u578B\u53C2\u6570"), /*#__PURE__*/React.createElement("div", {
      className: "apd-form-grid"
    }, Object.entries(schema).map(([name, field]) => /*#__PURE__*/React.createElement(Field, {
      label: field.label || name,
      key: name
    }, /*#__PURE__*/React.createElement(ParamInput, {
      name: name,
      field: field,
      value: name === 'reasoning_effort' ? window.AdminModelControls.effortValue(schema, form.model_params) : form.model_params[name],
      onChange: value => change({
        ...form,
        model_params: window.AdminModelControls.updateParam(schema, form.model_params, name, value)
      })
    })))))), editing && /*#__PURE__*/React.createElement(Panel, {
      title: "\u540C\u6B65\u66F4\u65B0\u5F15\u7528\u4EFB\u52A1"
    }, /*#__PURE__*/React.createElement("p", {
      className: "apd-footnote"
    }, "\u4FDD\u5B58\u540E\u81EA\u52A8\u751F\u6210\u65B0\u7248\u672C\u3002\u52FE\u9009\u8981\u540C\u6B65\u7684\u4EFB\u52A1\uFF1B\u4E0D\u52FE\u9009\u5219\u4FDD\u7559\u539F\u7248\u672C\uFF0C\u4EFB\u52A1\u6682\u505C\u72B6\u6001\u4E0D\u53D8\u3002"), /*#__PURE__*/React.createElement(ReadState, {
      state: references
    }, /*#__PURE__*/React.createElement("fieldset", {
      className: "apd-choices-fieldset",
      disabled: app.busy || uncertain
    }, (references.data?.items || []).map(task => /*#__PURE__*/React.createElement("label", {
      className: "apd-choice",
      key: task.id
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: selectedTasks.includes(task.id),
      onChange: e => setSelectedTasks(e.target.checked ? [...selectedTasks, task.id] : selectedTasks.filter(id => id !== task.id))
    }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, task.name), /*#__PURE__*/React.createElement("small", null, [app.configs.some(config => config.scheme_id === source.scheme_id && config.id === task.baseline_config_id) ? '比较基准' : null, task.candidate_config_ids.length ? '候选' : null].filter(Boolean).join('、'), " \xB7 ", A.statusLabel(task.status))))), references.data?.items.length === 0 && /*#__PURE__*/React.createElement("p", null, "\u6CA1\u6709\u672A\u7ED3\u675F\u4EFB\u52A1\u5F15\u7528\u6B64\u65B9\u6848\u3002"))), references.error && /*#__PURE__*/React.createElement(Button, {
      onClick: references.refresh
    }, "\u91CD\u65B0\u8BFB\u53D6\u5F15\u7528")), duplicate && /*#__PURE__*/React.createElement("p", {
      className: "apd-footnote"
    }, "\u6A21\u578B\u3001\u53C2\u6570\u4E0E\u610F\u56FE\u9009\u9879\u540C\u300C", duplicate.name, "\u300D\u3002\u53EF\u590D\u7528\u5DF2\u6709\u65B9\u6848\uFF1B\u65B0\u7248\u672C\u4F1A\u8BB0\u5F55\u5F53\u524D\u8D44\u6E90\u8EAB\u4EFD\u3002"), error && /*#__PURE__*/React.createElement(Notice, {
      error: true
    }, error));
  }
  Object.assign(A, {
    Schemes,
    SchemeDetail,
    DeleteScheme,
    NewScheme
  });
})();
}
