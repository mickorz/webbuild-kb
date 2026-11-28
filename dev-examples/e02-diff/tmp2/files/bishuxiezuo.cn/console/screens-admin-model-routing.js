{
(function () {
  const {
    useCallback,
    useEffect,
    useMemo,
    useState
  } = React;
  const TC = window.TC;
  const controls = window.AdminModelControls;
  const nodeKey = (workflowId, nodeId) => workflowId + '::' + nodeId;
  const assistantKey = agentType => 'assistant::' + agentType;
  const clone = value => JSON.parse(JSON.stringify(value));
  const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const newId = () => window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : 'canary-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  const FIELD_LABELS = {
    active_days_30d: 'adm_models_rule_active_days',
    days_since_last_active: 'adm_models_rule_inactive_days',
    is_paid: 'adm_models_rule_is_paid',
    paid_order_count: 'adm_models_rule_paid_orders',
    paid_cents: 'adm_models_rule_paid_cents',
    username: 'adm_models_rule_username',
    email: 'adm_models_rule_email',
    plan_code: 'adm_models_rule_plan',
    user_id: 'adm_models_rule_user_id',
    account_age_days: 'adm_models_rule_account_age',
    stable_bucket: 'adm_models_rule_bucket'
  };
  const OPERATOR_LABELS = {
    equals: 'adm_models_op_equals',
    not_equals: 'adm_models_op_not_equals',
    contains: 'adm_models_op_contains',
    not_contains: 'adm_models_op_not_contains',
    starts_with: 'adm_models_op_starts',
    ends_with: 'adm_models_op_ends',
    greater_than: 'adm_models_op_gt',
    greater_or_equal: 'adm_models_op_gte',
    less_than: 'adm_models_op_lt',
    less_or_equal: 'adm_models_op_lte',
    between: 'adm_models_op_between',
    in: 'adm_models_op_in',
    not_in: 'adm_models_op_not_in',
    is_true: 'adm_models_op_true',
    is_false: 'adm_models_op_false'
  };
  function mappingFrom(value) {
    const mapping = {};
    (value && value.workflows || []).forEach(workflow => (workflow.nodes || []).forEach(node => {
      mapping[nodeKey(workflow.workflow_id, node.node_id)] = {
        model_ref: node.model_ref,
        model_params: clone(node.model_params || {})
      };
    }));
    (value && value.assistants || []).forEach(assistant => {
      mapping[assistantKey(assistant.agent_type)] = {
        model_ref: assistant.model_ref,
        model_params: clone(assistant.model_params || {})
      };
    });
    return mapping;
  }
  function canariesFrom(value) {
    return clone((value && value.canary_configs || []).map(config => ({
      id: config.id,
      name: config.name,
      enabled: !!config.enabled,
      rule: config.rule,
      overrides: config.overrides || []
    })));
  }
  function routingGroups(value) {
    const workflows = value && value.workflows || [];
    const assistants = value && value.assistants || [];
    if (!assistants.length) return workflows;
    return workflows.concat([{
      workflow_id: 'assistant',
      task_type: 'assistant',
      name: TC('adm_models_assistant_group'),
      nodes: assistants.map(assistant => ({
        node_id: assistant.agent_type,
        label: assistant.label,
        agent_type: assistant.agent_type,
        model_ref: assistant.model_ref,
        model_params: assistant.model_params,
        model_params_schema: assistant.model_params_schema,
        registry_status: assistant.registry_status,
        assistant: true
      }))
    }]);
  }
  function workflowNodes(value) {
    return (value && value.workflows || []).flatMap(workflow => (workflow.nodes || []).map(node => ({
      workflow_id: workflow.workflow_id,
      workflow_name: workflow.name,
      task_type: workflow.task_type,
      node_id: node.node_id,
      label: node.label,
      agent_type: node.agent_type
    })));
  }
  function ParamInput({
    name,
    field,
    value,
    onChange
  }) {
    if (field.type === 'boolean') return /*#__PURE__*/React.createElement("select", {
      value: value == null ? '' : String(value),
      onChange: event => onChange(event.target.value === '' ? undefined : event.target.value === 'true')
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Default"), /*#__PURE__*/React.createElement("option", {
      value: "true"
    }, TC('adm_models_enabled')), /*#__PURE__*/React.createElement("option", {
      value: "false"
    }, TC('adm_models_disabled')));
    if (field.type === 'select') return /*#__PURE__*/React.createElement("select", {
      value: value == null ? '' : value,
      onChange: event => onChange(event.target.value || undefined)
    }, name === 'reasoning_effort' && /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Default"), value && !(field.options || []).includes(value) && /*#__PURE__*/React.createElement("option", {
      value: value,
      disabled: true
    }, value, " (", TC('adm_models_unsupported'), ")"), (field.options || []).map(option => /*#__PURE__*/React.createElement("option", {
      value: option,
      key: option
    }, name === 'reasoning_effort' ? option : field.option_labels && field.option_labels[option] || option)));
    if (field.type === 'json_mode') return /*#__PURE__*/React.createElement("select", {
      value: value === undefined ? '' : value ? 'json' : 'off',
      onChange: event => onChange(event.target.value === '' ? undefined : event.target.value === 'json' ? {
        type: 'json_object'
      } : null)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Default"), /*#__PURE__*/React.createElement("option", {
      value: "off"
    }, TC('adm_models_disabled')), /*#__PURE__*/React.createElement("option", {
      value: "json"
    }, "JSON object"));
    return /*#__PURE__*/React.createElement("input", {
      "aria-label": name,
      type: "number",
      min: field.min,
      max: field.max,
      step: field.step || 'any',
      value: value == null ? '' : value,
      placeholder: value === undefined ? 'Default' : field.nullable ? TC('adm_models_unlimited') : 'Default',
      onChange: event => onChange(event.target.value === '' ? field.nullable ? null : undefined : Number(event.target.value))
    });
  }
  function ModelNodeEditor({
    entry,
    baseline,
    catalog,
    meta,
    probes,
    probing,
    onChange,
    onProbe,
    onRemove
  }) {
    const modelOptions = (catalog.providers || []).flatMap(provider => (provider.models || []).map(model => ({
      value: model,
      label: provider.name + ' · ' + model.split(':').slice(1).join(':')
    })));
    const available = modelOptions.some(option => option.value === entry.model_ref);
    const changedModel = entry.model_ref !== baseline.model_ref;
    const key = controls.configurationKey(catalog, entry);
    const result = probes[key];
    const [adjustment, setAdjustment] = useState(null);
    const removed = adjustment && adjustment.model === entry.model_ref && entry.model_ref !== baseline.model_ref ? adjustment.removed : [];
    const schema = catalog.model_params_schemas[entry.model_ref] || {};
    const updateModel = model => {
      const next = controls.paramsForSchema(catalog.model_params_schemas[model] || {}, entry.model_params);
      setAdjustment({
        model,
        removed: next.removed.map(name => schema[name] && schema[name].label || name)
      });
      onChange({
        ...entry,
        model_ref: model,
        model_params: next.params
      });
    };
    const updateParam = (name, value) => onChange({
      ...entry,
      model_params: controls.updateParam(schema, entry.model_params, name, value)
    });
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-model-node"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-model-node-main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-model-node-meta"
    }, /*#__PURE__*/React.createElement("b", null, meta.label), /*#__PURE__*/React.createElement("span", null, meta.node_id, " \xB7 ", meta.agent_type)), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, TC('adm_models_model')), /*#__PURE__*/React.createElement("select", {
      "aria-invalid": !available,
      value: entry.model_ref,
      onChange: event => updateModel(event.target.value)
    }, !available && /*#__PURE__*/React.createElement("option", {
      value: entry.model_ref,
      disabled: true
    }, entry.model_ref, " \xB7 ", TC('adm_models_unavailable')), modelOptions.map(option => /*#__PURE__*/React.createElement("option", {
      key: option.value,
      value: option.value
    }, option.label)))), /*#__PURE__*/React.createElement("div", {
      className: "adm-model-probe"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: !available || !!probing,
      onClick: () => onProbe(entry)
    }, probing === key ? TC('adm_models_probing') : TC('adm_models_probe')), !available && /*#__PURE__*/React.createElement("span", {
      className: "bad",
      role: "status"
    }, TC('adm_models_unavailable_hint')), result && result.receipt && /*#__PURE__*/React.createElement("span", {
      className: "ok"
    }, TC('adm_models_probe_ok'), " \xB7 ", result.latency_ms || 0, " ms"), result && result.error && /*#__PURE__*/React.createElement("span", {
      className: "bad"
    }, result.error), changedModel && !(result && result.receipt) && /*#__PURE__*/React.createElement("span", null, TC('adm_models_wait_probe')), onRemove && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm danger",
      onClick: onRemove
    }, TC('adm_models_remove_override')))), removed.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "adm-model-notice",
      role: "status"
    }, TC('adm_models_params_removed'), " ", removed.join(', ')), /*#__PURE__*/React.createElement("details", {
      className: "adm-model-params"
    }, /*#__PURE__*/React.createElement("summary", null, TC('adm_models_params'), " ", /*#__PURE__*/React.createElement("b", null, Object.keys(schema).length)), /*#__PURE__*/React.createElement("div", null, Object.entries(schema).map(([name, field]) => /*#__PURE__*/React.createElement("label", {
      key: name
    }, /*#__PURE__*/React.createElement("span", null, field.label || name, /*#__PURE__*/React.createElement("code", null, name)), /*#__PURE__*/React.createElement(ParamInput, {
      name: name,
      field: field,
      value: name === 'reasoning_effort' ? controls.effortValue(schema, entry.model_params) : entry.model_params[name],
      onChange: value => updateParam(name, value)
    }))))));
  }
  function defaultValue(field, operator) {
    if (!field || field.value_type === 'boolean') return null;
    if (operator === 'between') return [0, 0];
    if (operator === 'in' || operator === 'not_in') return [];
    return field.value_type === 'number' ? 0 : '';
  }
  function RuleValue({
    field,
    operator,
    value,
    onChange
  }) {
    if (!field || field.value_type === 'boolean') return null;
    if (operator === 'between') {
      const values = Array.isArray(value) ? value : [0, 0];
      return /*#__PURE__*/React.createElement("div", {
        className: "adm-rule-between"
      }, /*#__PURE__*/React.createElement("input", {
        type: "number",
        value: values[0] == null ? '' : values[0],
        onChange: event => onChange([Number(event.target.value), values[1]])
      }), /*#__PURE__*/React.createElement("span", null, "\u2014"), /*#__PURE__*/React.createElement("input", {
        type: "number",
        value: values[1] == null ? '' : values[1],
        onChange: event => onChange([values[0], Number(event.target.value)])
      }));
    }
    if (operator === 'in' || operator === 'not_in') {
      const text = Array.isArray(value) ? value.join(', ') : '';
      return /*#__PURE__*/React.createElement("input", {
        type: "text",
        value: text,
        placeholder: TC('adm_models_rule_list_placeholder'),
        onChange: event => onChange(event.target.value.split(',').map(item => item.trim()).filter(Boolean).map(item => field.value_type === 'number' ? Number(item) : item))
      });
    }
    return /*#__PURE__*/React.createElement("input", {
      type: field.value_type === 'number' ? 'number' : 'text',
      value: value == null ? '' : value,
      onChange: event => onChange(field.value_type === 'number' ? Number(event.target.value) : event.target.value)
    });
  }
  function RuleNode({
    node,
    catalog,
    depth,
    onChange,
    onRemove
  }) {
    if (node.type === 'condition') {
      const field = catalog.find(item => item.key === node.field) || catalog[0];
      const operators = field && field.operators || [];
      const changeField = key => {
        const nextField = catalog.find(item => item.key === key);
        const operator = nextField.operators[0];
        onChange({
          type: 'condition',
          field: key,
          operator,
          value: defaultValue(nextField, operator)
        });
      };
      const changeOperator = operator => onChange({
        ...node,
        operator,
        value: defaultValue(field, operator)
      });
      return /*#__PURE__*/React.createElement("div", {
        className: "adm-rule-condition"
      }, /*#__PURE__*/React.createElement("select", {
        "aria-label": TC('adm_models_rule_field'),
        value: node.field,
        onChange: event => changeField(event.target.value)
      }, catalog.map(item => /*#__PURE__*/React.createElement("option", {
        key: item.key,
        value: item.key
      }, TC(FIELD_LABELS[item.key])))), /*#__PURE__*/React.createElement("select", {
        "aria-label": TC('adm_models_rule_operator'),
        value: node.operator,
        onChange: event => changeOperator(event.target.value)
      }, operators.map(operator => /*#__PURE__*/React.createElement("option", {
        key: operator,
        value: operator
      }, TC(OPERATOR_LABELS[operator])))), /*#__PURE__*/React.createElement(RuleValue, {
        field: field,
        operator: node.operator,
        value: node.value,
        onChange: value => onChange({
          ...node,
          value
        })
      }), onRemove && /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-ic adm-rule-remove",
        "aria-label": TC('adm_models_rule_remove'),
        onClick: onRemove
      }, "\xD7"));
    }
    const updateChild = (index, child) => onChange({
      ...node,
      children: node.children.map((item, childIndex) => childIndex === index ? child : item)
    });
    const removeChild = index => onChange({
      ...node,
      children: node.children.filter((_, childIndex) => childIndex !== index)
    });
    const firstField = catalog[0];
    const newCondition = () => ({
      type: 'condition',
      field: firstField.key,
      operator: firstField.operators[0],
      value: defaultValue(firstField, firstField.operators[0])
    });
    const addCondition = () => onChange({
      ...node,
      children: node.children.concat([newCondition()])
    });
    const addGroup = () => onChange({
      ...node,
      children: node.children.concat([{
        type: 'group',
        combinator: 'all',
        negate: false,
        children: [newCondition()]
      }])
    });
    return /*#__PURE__*/React.createElement("fieldset", {
      className: "adm-rule-group"
    }, /*#__PURE__*/React.createElement("legend", null, depth === 0 ? TC('adm_models_rules') : TC('adm_models_rule_group')), /*#__PURE__*/React.createElement("div", {
      className: "adm-rule-group-toolbar"
    }, /*#__PURE__*/React.createElement("select", {
      value: node.combinator,
      onChange: event => onChange({
        ...node,
        combinator: event.target.value
      })
    }, /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, TC('adm_models_rule_all')), /*#__PURE__*/React.createElement("option", {
      value: "any"
    }, TC('adm_models_rule_any'))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!node.negate,
      onChange: event => onChange({
        ...node,
        negate: event.target.checked
      })
    }), TC('adm_models_rule_negate')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: addCondition
    }, TC('adm_models_rule_add')), depth < 4 && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: addGroup
    }, TC('adm_models_rule_add_group')), onRemove && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm danger",
      onClick: onRemove
    }, TC('adm_models_rule_remove_group')))), /*#__PURE__*/React.createElement("div", {
      className: "adm-rule-children"
    }, node.children.map((child, index) => /*#__PURE__*/React.createElement(RuleNode, {
      key: index,
      node: child,
      catalog: catalog,
      depth: depth + 1,
      onChange: value => updateChild(index, value),
      onRemove: node.children.length > 1 ? () => removeChild(index) : null
    }))));
  }
  function CanaryEditor({
    catalog,
    config,
    globalSaved,
    probes,
    probing,
    onChange,
    onProbe,
    onDelete
  }) {
    const nodes = workflowNodes(catalog);
    const overrides = config.overrides || [];
    const used = new Set(overrides.map(item => nodeKey(item.workflow_id, item.node_id)));
    const nodeByKey = Object.fromEntries(nodes.map(node => [nodeKey(node.workflow_id, node.node_id), node]));
    const updateOverride = (index, value) => onChange({
      ...config,
      overrides: overrides.map((item, itemIndex) => itemIndex === index ? value : item)
    });
    const addOverride = key => {
      if (!key) return;
      const node = nodeByKey[key];
      const baseline = globalSaved[key];
      onChange({
        ...config,
        overrides: overrides.concat([{
          workflow_id: node.workflow_id,
          node_id: node.node_id,
          model_ref: baseline.model_ref,
          model_params: clone(baseline.model_params),
          registry_version: catalog.registry_version
        }])
      });
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-canary-editor"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-canary-identity"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, TC('adm_models_canary_name')), /*#__PURE__*/React.createElement("input", {
      type: "text",
      maxLength: "120",
      value: config.name,
      onChange: event => onChange({
        ...config,
        name: event.target.value
      })
    })), /*#__PURE__*/React.createElement("label", {
      className: "adm-canary-enabled"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: config.enabled,
      onChange: event => onChange({
        ...config,
        enabled: event.target.checked
      })
    }), /*#__PURE__*/React.createElement("span", null, TC('adm_models_canary_enabled'))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn danger",
      onClick: onDelete
    }, TC('adm_models_canary_delete'))), /*#__PURE__*/React.createElement(RuleNode, {
      node: config.rule,
      catalog: catalog.rule_catalog || [],
      depth: 0,
      onChange: rule => onChange({
        ...config,
        rule
      })
    }), /*#__PURE__*/React.createElement("section", {
      className: "adm-canary-overrides"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, TC('adm_models_canary_overrides')), /*#__PURE__*/React.createElement("span", null, TC('adm_models_canary_overrides_note'))), /*#__PURE__*/React.createElement("select", {
      value: "",
      onChange: event => addOverride(event.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, TC('adm_models_canary_add_node')), nodes.filter(node => !used.has(nodeKey(node.workflow_id, node.node_id))).map(node => /*#__PURE__*/React.createElement("option", {
      key: nodeKey(node.workflow_id, node.node_id),
      value: nodeKey(node.workflow_id, node.node_id)
    }, node.workflow_name, " \xB7 ", node.label)))), !overrides.length && /*#__PURE__*/React.createElement("div", {
      className: "adm-canary-empty"
    }, TC('adm_models_canary_no_overrides')), /*#__PURE__*/React.createElement("div", {
      className: "adm-model-node-list"
    }, overrides.map((entry, index) => {
      const key = nodeKey(entry.workflow_id, entry.node_id);
      const meta = nodeByKey[key];
      if (!meta) return null;
      const existingConfig = (catalog.canary_configs || []).find(item => item.id === config.id);
      const existing = existingConfig && (existingConfig.overrides || []).find(item => nodeKey(item.workflow_id, item.node_id) === key);
      return /*#__PURE__*/React.createElement(ModelNodeEditor, {
        key: key,
        entry: entry,
        baseline: existing || globalSaved[key],
        catalog: catalog,
        meta: meta,
        probes: probes,
        probing: probing,
        onProbe: onProbe,
        onChange: value => updateOverride(index, value),
        onRemove: () => onChange({
          ...config,
          overrides: overrides.filter((_, itemIndex) => itemIndex !== index)
        })
      });
    }))));
  }
  const writerCopy = (zh, en) => window.CLANG === 'en' ? en : zh;
  const writerTabName = () => writerCopy('高级写手', 'Advanced writers');
  function AdvancedWriterPanel({
    toast
  }) {
    const t = writerCopy;
    const DataTable = window.AdminDataTable;
    const [catalog, setCatalog] = useState(null);
    const [draft, setDraft] = useState(null);
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState('');
    const load = useCallback(async () => {
      setBusy(true);
      setError('');
      try {
        setCatalog(await window.LF_API.adminAdvancedWriterModels());
      } catch (failure) {
        setError(failure.message || TC('adm_models_load_failed'));
      } finally {
        setBusy(false);
      }
    }, []);
    useEffect(() => {
      load();
    }, [load]);
    const rows = catalog?.models || [];
    const available = new Set(catalog?.available_models || []);
    const choices = [...available].filter(ref => !rows.some(row => row.model_ref === ref));
    const edit = row => {
      setDraft(row ? {
        model_ref: row.model_ref,
        credits: String(row.price_millis / 1000),
        enabled: row.enabled,
        existing: true
      } : {
        model_ref: '',
        credits: '',
        enabled: true,
        existing: false
      });
      setError('');
    };
    const amount = Number(draft?.credits);
    const priceMillis = amount * 1000;
    const valid = !!draft?.model_ref && Number.isInteger(amount * 2) && priceMillis >= 500 && priceMillis <= 2147483647 && (!draft.enabled || available.has(draft.model_ref));
    const save = async event => {
      event.preventDefault();
      if (busy || !valid) return;
      setBusy(true);
      setError('');
      try {
        const saved = await window.LF_API.adminSaveAdvancedWriterModel(draft.model_ref, {
          price_millis: priceMillis,
          enabled: draft.enabled
        });
        setCatalog(current => ({
          ...current,
          models: current.models.some(row => row.model_ref === saved.model_ref) ? current.models.map(row => row.model_ref === saved.model_ref ? saved : row) : [...current.models, saved]
        }));
        setDraft(null);
        toast(TC('adm_models_saved'));
      } catch (failure) {
        setError(failure.message || TC('adm_models_save_failed'));
      } finally {
        setBusy(false);
      }
    };
    const columns = [{
      key: 'model_ref',
      header: t('模型', 'Model'),
      priority: 'primary'
    }, {
      key: 'price_millis',
      header: t('基础总价（笔力）', 'Base total (credits)'),
      numeric: true,
      render: row => row.price_millis / 1000
    }, {
      key: 'enabled',
      header: t('状态', 'Status'),
      sortable: false,
      render: row => !row.enabled ? TC('adm_models_disabled') : available.has(row.model_ref) ? TC('adm_models_enabled') : t('引擎中不可用', 'Unavailable in Engine')
    }, {
      key: 'actions',
      header: t('操作', 'Actions'),
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        disabled: busy,
        "aria-label": t('编辑 ', 'Edit ') + row.model_ref,
        onClick: () => edit(row)
      }, t('编辑', 'Edit'))
    }];
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("header", {
      className: "adm-model-heading"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, writerTabName()), /*#__PURE__*/React.createElement("span", null, t('基础总价包含角色状态和正文两步，按作品设定量档位计费。', 'The base total covers character state and prose and scales with the book-data tier.'))), /*#__PURE__*/React.createElement("div", {
      className: "adm-model-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: busy,
      onClick: load
    }, t('刷新', 'Refresh')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      disabled: busy || !choices.length,
      onClick: () => edit(null)
    }, t('添加模型', 'Add model')))), error && /*#__PURE__*/React.createElement("div", {
      role: "alert",
      className: "adm-model-error"
    }, error), catalog?.catalog_status === 'unavailable' && /*#__PURE__*/React.createElement("div", {
      role: "status",
      className: "adm-model-notice"
    }, t('模型目录暂不可用，已配置模型仍可停用。', 'The model catalog is unavailable. Existing entries can still be disabled.')), draft && /*#__PURE__*/React.createElement("form", {
      className: "adm-card adm-model-node adm-advanced-writer-form",
      onSubmit: save
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, t('模型', 'Model')), draft.existing ? /*#__PURE__*/React.createElement("strong", null, draft.model_ref) : /*#__PURE__*/React.createElement("select", {
      className: "adm-input",
      required: true,
      disabled: busy,
      value: draft.model_ref,
      onChange: event => setDraft({
        ...draft,
        model_ref: event.target.value
      })
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, t('选择模型', 'Select model')), choices.map(ref => /*#__PURE__*/React.createElement("option", {
      key: ref,
      value: ref
    }, ref)))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, t('基础总价（笔力）', 'Base total (credits)')), /*#__PURE__*/React.createElement("input", {
      className: "adm-input",
      type: "number",
      min: "0.5",
      step: "0.5",
      required: true,
      disabled: busy,
      value: draft.credits,
      onChange: event => setDraft({
        ...draft,
        credits: event.target.value
      })
    })), /*#__PURE__*/React.createElement("label", {
      className: "adm-canary-enabled"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: draft.enabled,
      disabled: busy,
      onChange: event => setDraft({
        ...draft,
        enabled: event.target.checked
      })
    }), TC('adm_models_enabled')), /*#__PURE__*/React.createElement("div", {
      className: "adm-model-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: busy,
      onClick: () => {
        setDraft(null);
        setError('');
      }
    }, t('取消', 'Cancel')), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn primary",
      disabled: busy || !valid
    }, busy ? TC('adm_models_saving') : TC('adm_models_save')))), catalog && /*#__PURE__*/React.createElement(DataTable, {
      rows: rows,
      columns: columns,
      rowKey: "model_ref",
      compact: true,
      ariaLabel: writerTabName(),
      empty: t('暂无已配置模型', 'No models configured')
    }), !catalog && busy && /*#__PURE__*/React.createElement("div", {
      role: "status",
      className: "adm-card adm-model-state"
    }, TC('set_loading')));
  }
  function ModelRoutingTab({
    toast
  }) {
    const [catalog, setCatalog] = useState(null);
    const [saved, setSaved] = useState({});
    const [draft, setDraft] = useState({});
    const [savedCanaries, setSavedCanaries] = useState([]);
    const [draftCanaries, setDraftCanaries] = useState([]);
    const [selectedCanaryId, setSelectedCanaryId] = useState('');
    const [mode, setMode] = useState('global');
    const [probes, setProbes] = useState({});
    const [probing, setProbing] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const load = useCallback(() => {
      setLoading(true);
      setError('');
      return window.LF_API.adminModelRouting().then(value => {
        const mapping = mappingFrom(value);
        const canaries = canariesFrom(value);
        setCatalog(value);
        setSaved(mapping);
        setDraft(mapping);
        setSavedCanaries(canaries);
        setDraftCanaries(canaries);
        setSelectedCanaryId(current => current && canaries.some(item => item.id === current) ? current : canaries[0] && canaries[0].id || '');
        setProbes({});
      }).catch(loadError => setError(loadError.message || TC('adm_models_load_failed'))).finally(() => setLoading(false));
    }, []);
    useEffect(() => {
      load();
    }, [load]);
    const groups = useMemo(() => routingGroups(catalog), [catalog]);
    const registryIssues = useMemo(() => groups.flatMap(workflow => workflow.nodes.filter(node => node.registry_status !== 'ready').map(node => ({
      workflow: workflow.name,
      label: node.label,
      status: node.registry_status
    }))), [groups]);
    const registryReady = registryIssues.length === 0;
    const globalDirty = useMemo(() => Object.keys(draft).some(key => !same(draft[key], saved[key])), [draft, saved]);
    const canaryDirty = useMemo(() => !same(draftCanaries, savedCanaries), [draftCanaries, savedCanaries]);
    const globalProbeReady = useMemo(() => !catalog || groups.every(workflow => workflow.nodes.every(node => {
      const key = node.assistant ? assistantKey(node.agent_type) : nodeKey(workflow.workflow_id, node.node_id);
      const changedModel = draft[key] && draft[key].model_ref !== saved[key].model_ref;
      return !changedModel || !!(probes[controls.configurationKey(catalog, draft[key])] && probes[controls.configurationKey(catalog, draft[key])].receipt);
    })), [catalog, draft, groups, probes, saved]);
    const canaryProbeReady = useMemo(() => draftCanaries.every(config => (config.overrides || []).every(entry => {
      const key = nodeKey(entry.workflow_id, entry.node_id);
      const originalConfig = savedCanaries.find(item => item.id === config.id);
      const original = originalConfig && (originalConfig.overrides || []).find(item => nodeKey(item.workflow_id, item.node_id) === key);
      const baseline = original || saved[key];
      return entry.model_ref === baseline.model_ref || !!(probes[controls.configurationKey(catalog, entry)] && probes[controls.configurationKey(catalog, entry)].receipt);
    })), [catalog, draftCanaries, probes, saved, savedCanaries]);
    const selectedCanary = draftCanaries.find(item => item.id === selectedCanaryId) || null;
    const dirty = mode === 'global' ? globalDirty : canaryDirty;
    const probeReady = mode === 'global' ? globalProbeReady : canaryProbeReady;
    const ready = registryReady && probeReady;
    const updateEntry = (key, value) => {
      setDraft(current => Object.assign({}, current, {
        [key]: value
      }));
      setError('');
    };
    const updateCanary = value => {
      setDraftCanaries(current => current.map(item => item.id === value.id ? value : item));
      setError('');
    };
    const probe = async entry => {
      if (!entry.model_ref || probing) return;
      const key = controls.configurationKey(catalog, entry);
      setProbing(key);
      setError('');
      try {
        const result = await window.LF_API.adminProbeModel(entry.model_ref, entry.model_params);
        setProbes(current => Object.assign({}, current, {
          [key]: result
        }));
      } catch (probeError) {
        setProbes(current => Object.assign({}, current, {
          [key]: {
            error: probeError.message || TC('adm_models_probe_failed')
          }
        }));
      } finally {
        setProbing('');
      }
    };
    const saveGlobal = async () => {
      const overrides = [];
      catalog.workflows.forEach(workflow => workflow.nodes.forEach(node => {
        const key = nodeKey(workflow.workflow_id, node.node_id);
        const entry = draft[key];
        if (same(entry, saved[key])) return;
        const probeResult = probes[controls.configurationKey(catalog, entry)];
        overrides.push({
          workflow_id: workflow.workflow_id,
          node_id: node.node_id,
          model_ref: entry.model_ref,
          model_params: entry.model_params,
          registry_version: catalog.registry_version,
          probe_receipt: probeResult && probeResult.receipt || null
        });
      }));
      const assistant_overrides = (catalog.assistants || []).filter(assistant => !same(draft[assistantKey(assistant.agent_type)], saved[assistantKey(assistant.agent_type)])).map(assistant => {
        const entry = draft[assistantKey(assistant.agent_type)];
        const probeResult = probes[controls.configurationKey(catalog, entry)];
        return {
          agent_type: assistant.agent_type,
          model_ref: entry.model_ref,
          model_params: entry.model_params,
          probe_receipt: probeResult && probeResult.receipt || null
        };
      });
      const value = await window.LF_API.adminPatchModelRouting({
        overrides,
        assistant_overrides
      });
      const mapping = mappingFrom(value);
      setCatalog(value);
      setSaved(mapping);
      setDraft(mapping);
      toast(TC('adm_models_saved'));
    };
    const saveCanaries = async () => {
      const configs = draftCanaries.map(config => ({
        ...config,
        overrides: (config.overrides || []).map(entry => ({
          ...entry,
          registry_version: catalog.registry_version,
          probe_receipt: probes[controls.configurationKey(catalog, entry)] && probes[controls.configurationKey(catalog, entry)].receipt || null
        }))
      }));
      const value = await window.LF_API.adminUpdateModelRoutingCanaries({
        configs
      });
      const canaries = canariesFrom(value);
      setCatalog(value);
      setSavedCanaries(canaries);
      setDraftCanaries(canaries);
      setSelectedCanaryId(current => canaries.some(item => item.id === current) ? current : canaries[0] && canaries[0].id || '');
      toast(TC('adm_models_canary_saved'));
    };
    const save = async () => {
      if (!catalog || !dirty || !ready || saving) return;
      setSaving(true);
      setError('');
      try {
        if (mode === 'global') await saveGlobal();else await saveCanaries();
        setProbes({});
      } catch (saveError) {
        setError(saveError.message || TC(mode === 'global' ? 'adm_models_save_failed' : 'adm_models_canary_save_failed'));
      } finally {
        setSaving(false);
      }
    };
    const createCanary = () => {
      const id = newId();
      const field = (catalog.rule_catalog || [])[0];
      const config = {
        id,
        name: TC('adm_models_canary_new_name'),
        enabled: false,
        rule: {
          type: 'group',
          combinator: 'all',
          negate: false,
          children: [{
            type: 'condition',
            field: field.key,
            operator: field.operators[0],
            value: defaultValue(field, field.operators[0])
          }]
        },
        overrides: []
      };
      setDraftCanaries(current => current.concat([config]));
      setSelectedCanaryId(id);
    };
    const moveCanary = (index, direction) => {
      const target = index + direction;
      if (target < 0 || target >= draftCanaries.length) return;
      const next = draftCanaries.slice();
      [next[index], next[target]] = [next[target], next[index]];
      setDraftCanaries(next);
    };
    const deleteCanary = config => {
      if (!window.confirm(TC('adm_models_canary_delete_confirm'))) return;
      const next = draftCanaries.filter(item => item.id !== config.id);
      setDraftCanaries(next);
      setSelectedCanaryId(next[0] && next[0].id || '');
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-model-page"
    }, /*#__PURE__*/React.createElement("nav", {
      className: "adm-model-mode-tabs",
      role: "tablist",
      "aria-label": TC('adm_models_mode')
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      role: "tab",
      "aria-selected": mode === 'global',
      className: mode === 'global' ? 'on' : '',
      onClick: () => setMode('global')
    }, TC('adm_models_global')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      role: "tab",
      "aria-selected": mode === 'canary',
      className: mode === 'canary' ? 'on' : '',
      onClick: () => setMode('canary')
    }, TC('adm_models_canary')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      role: "tab",
      "aria-selected": mode === 'writer',
      className: mode === 'writer' ? 'on' : '',
      onClick: () => setMode('writer')
    }, writerTabName())), mode === 'writer' ? /*#__PURE__*/React.createElement(AdvancedWriterPanel, {
      toast: toast
    }) : loading && !catalog ? /*#__PURE__*/React.createElement("div", {
      className: "adm-card adm-model-state"
    }, TC('set_loading')) : !catalog ? /*#__PURE__*/React.createElement("div", {
      className: "adm-card adm-model-state error"
    }, /*#__PURE__*/React.createElement("b", null, TC('adm_models_load_failed')), /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      onClick: load
    }, TC('adm_retry'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("header", {
      className: "adm-model-heading"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, TC('adm_models_kicker')), /*#__PURE__*/React.createElement("h1", null, TC(mode === 'global' ? 'adm_models_title' : 'adm_models_canary_title')), /*#__PURE__*/React.createElement("span", null, TC(mode === 'global' ? 'adm_models_intro' : 'adm_models_canary_intro')), /*#__PURE__*/React.createElement("code", null, catalog.registry_version)), /*#__PURE__*/React.createElement("div", {
      className: "adm-model-actions"
    }, mode === 'canary' && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      onClick: createCanary
    }, TC('adm_models_canary_create')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: !dirty || saving,
      onClick: () => {
        if (mode === 'global') setDraft(clone(saved));else {
          setDraftCanaries(clone(savedCanaries));
          setSelectedCanaryId(savedCanaries[0] && savedCanaries[0].id || '');
        }
        setProbes({});
      }
    }, TC('adm_reset')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      disabled: !dirty || !ready || saving,
      onClick: save
    }, saving ? TC('adm_models_saving') : TC(mode === 'global' ? 'adm_models_save' : 'adm_models_canary_save')))), error && /*#__PURE__*/React.createElement("section", {
      className: "adm-model-error",
      role: "alert"
    }, error), !registryReady && /*#__PURE__*/React.createElement("section", {
      className: "adm-model-error adm-model-registry-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("b", null, TC('adm_models_registry_mismatch')), /*#__PURE__*/React.createElement("ul", null, registryIssues.slice(0, 5).map((issue, index) => /*#__PURE__*/React.createElement("li", {
      key: issue.workflow + issue.label + index
    }, issue.workflow, " / ", issue.label, "\uFF1A", TC(issue.status === 'missing' ? 'adm_models_registry_missing' : 'adm_models_registry_agent_changed')))), registryIssues.length > 5 && /*#__PURE__*/React.createElement("span", null, "+ ", registryIssues.length - 5, " ", TC('adm_models_registry_more'))), registryReady && !probeReady && /*#__PURE__*/React.createElement("section", {
      className: "adm-model-notice"
    }, TC('adm_models_probe_required')), mode === 'global' ? /*#__PURE__*/React.createElement("div", {
      className: "adm-model-workflows"
    }, groups.map(workflow => /*#__PURE__*/React.createElement("section", {
      className: "adm-model-workflow",
      key: workflow.workflow_id
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, workflow.name), /*#__PURE__*/React.createElement("span", null, workflow.task_type, " \xB7 ", workflow.workflow_id)), /*#__PURE__*/React.createElement("b", null, workflow.nodes.length, " ", TC('adm_models_nodes'))), /*#__PURE__*/React.createElement("div", {
      className: "adm-model-node-list"
    }, workflow.nodes.map(node => {
      const key = node.assistant ? assistantKey(node.agent_type) : nodeKey(workflow.workflow_id, node.node_id);
      return /*#__PURE__*/React.createElement(ModelNodeEditor, {
        key: node.node_id,
        entry: draft[key],
        baseline: saved[key],
        catalog: catalog,
        meta: node,
        probes: probes,
        probing: probing,
        onProbe: probe,
        onChange: value => updateEntry(key, value)
      });
    })))), window.AdminMemoryModelsPanel && /*#__PURE__*/React.createElement(window.AdminMemoryModelsPanel, null)) : /*#__PURE__*/React.createElement("div", {
      className: "adm-canary-layout"
    }, /*#__PURE__*/React.createElement("aside", {
      className: "adm-canary-list",
      "aria-label": TC('adm_models_canary_configs')
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("b", null, TC('adm_models_canary_configs')), /*#__PURE__*/React.createElement("span", null, TC('adm_models_canary_order_note'))), !draftCanaries.length && /*#__PURE__*/React.createElement("div", {
      className: "adm-canary-empty"
    }, TC('adm_models_canary_empty')), draftCanaries.map((config, index) => /*#__PURE__*/React.createElement("div", {
      className: 'adm-canary-list-item' + (config.id === selectedCanaryId ? ' on' : ''),
      key: config.id
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setSelectedCanaryId(config.id)
    }, /*#__PURE__*/React.createElement("b", null, config.name || TC('adm_models_canary_unnamed')), /*#__PURE__*/React.createElement("span", null, config.enabled ? TC('adm_models_enabled') : TC('adm_models_disabled'), " \xB7 ", (config.overrides || []).length, " ", TC('adm_models_canary_nodes'))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-ic",
      "aria-label": TC('adm_models_canary_move_up'),
      disabled: index === 0,
      onClick: () => moveCanary(index, -1)
    }, "\u2191"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-ic",
      "aria-label": TC('adm_models_canary_move_down'),
      disabled: index === draftCanaries.length - 1,
      onClick: () => moveCanary(index, 1)
    }, "\u2193"))))), /*#__PURE__*/React.createElement("main", {
      className: "adm-canary-main"
    }, selectedCanary ? /*#__PURE__*/React.createElement(CanaryEditor, {
      catalog: catalog,
      config: selectedCanary,
      globalSaved: saved,
      probes: probes,
      probing: probing,
      onProbe: probe,
      onChange: updateCanary,
      onDelete: () => deleteCanary(selectedCanary)
    }) : /*#__PURE__*/React.createElement("div", {
      className: "adm-canary-empty adm-canary-empty-main"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      onClick: createCanary
    }, TC('adm_models_canary_create')))))));
  }
  window.AdminModelParamInput = ParamInput;
  window.AdminModelRoutingTab = ModelRoutingTab;
})();
}
