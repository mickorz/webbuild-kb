{
(function () {
  const TC = window.TC;
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const DataTable = window.AdminDataTable;
  const CartesianChart = window.AdminCartesianChart;
  const MetricBars = window.AdminMetricBars;
  const TASK_TYPE_NAMES = {
    world_build: {
      zh: '世界构建',
      en: 'World build'
    },
    story_plan: {
      zh: '故事规划',
      en: 'Story plan'
    },
    outline: {
      zh: '大纲生成',
      en: 'Outline'
    },
    character: {
      zh: '人物生成',
      en: 'Character'
    },
    character_create: {
      zh: 'AI 新增角色',
      en: 'AI character creation'
    },
    polish: {
      zh: '章节润色',
      en: 'Polish'
    },
    post_hoc: {
      zh: '章后分析',
      en: 'Post-hoc review'
    },
    field_rewrite: {
      zh: '字段改写',
      en: 'Field rewrite'
    },
    chapter_draft: {
      zh: '章节草稿（历史）',
      en: 'Chapter draft (legacy)'
    },
    chapter_world_state: {
      zh: '章节·世界状态',
      en: 'Chapter · world state'
    },
    chapter_outline_director: {
      zh: '章节·细纲导演',
      en: 'Chapter · outline director'
    },
    chapter_character_state: {
      zh: '章节·人物状态',
      en: 'Chapter · character state'
    },
    chapter_writer_muti: {
      zh: '章节·写手群',
      en: 'Chapter · writer group'
    },
    chapter_writer_single: {
      zh: '章节·单写手',
      en: 'Chapter · single writer'
    },
    chapter_full_muti: {
      zh: '章节·完整写手群',
      en: 'Chapter · full group'
    },
    chapter_full_single: {
      zh: '章节·完整单写手',
      en: 'Chapter · full single writer'
    }
  };
  const localText = value => value && (value[window.CLANG] || value.zh || value.en) || '';
  const taskTypeName = taskType => TASK_TYPE_NAMES[taskType] ? localText(TASK_TYPE_NAMES[taskType]) : taskType;
  const num = value => value == null ? '—' : (Number(value) || 0).toLocaleString();
  const pct = value => value == null || value === '' ? '—' : Number(value).toFixed(1) + '%';
  const shortDate = value => String(value || '').slice(5);
  const duration = value => {
    if (value == null || value === '') return '—';
    const ms = Number(value) || 0;
    if (ms < 1000) return Math.round(ms) + 'ms';
    if (ms < 90000) return (ms / 1000).toFixed(1) + 's';
    return (ms / 60000).toFixed(1) + 'min';
  };
  const tokens = value => {
    if (value == null) return '—';
    const total = Number(value) || 0;
    if (total >= 1e6) return (total / 1e6).toFixed(1) + 'M';
    if (total >= 1e3) return (total / 1e3).toFixed(1) + 'k';
    return String(total);
  };
  const stamp = value => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(window.CLANG === 'en' ? 'en-US' : 'zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };
  const nodeLabel = row => {
    if (!row) return '—';
    if (row.node_id === 'unattributed') return TC('adm_analysis_unattributed');
    return row.label || row.node_id;
  };
  const totalTokens = row => row && row.prompt_tokens == null && row.completion_tokens == null ? null : (Number(row.prompt_tokens) || 0) + (Number(row.completion_tokens) || 0);
  const ratioNote = (numerator, denominator, note) => numerator == null || denominator == null ? note : `${num(numerator)} / ${num(denominator)} · ${note}`;
  const RateValue = ({
    value,
    numerator,
    denominator,
    bar,
    tone
  }) => {
    if (value == null || value === '') return '—';
    return /*#__PURE__*/React.createElement("div", {
      className: 'adm-analysis-rate-value' + (bar ? ' has-bar' : '') + (tone ? ' ' + tone : ''),
      "aria-label": `${pct(value)}，${num(numerator)} / ${num(denominator)}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-rate-main"
    }, bar && /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
      style: {
        width: Math.max(0, Math.min(100, Number(value) || 0)) + '%'
      }
    })), /*#__PURE__*/React.createElement("b", null, pct(value))), /*#__PURE__*/React.createElement("small", null, num(numerator), " / ", num(denominator)));
  };
  // 首过率低于 60% 视为问题节点，用赤陶色让它自己显形。
  const firstPassTone = value => value != null && Number(value) < 60 ? 'terra' : '';
  function AnalysisMetric({
    label,
    value,
    note,
    tone
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: 'adm-analysis-metric' + (tone ? ' ' + tone : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-metric-label"
    }, label), /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-metric-value"
    }, value), /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-metric-note"
    }, note));
  }
  const executionMetricColumns = () => [{
    key: 'executions',
    header: TC('adm_analysis_executions'),
    description: TC('adm_analysis_executions_description'),
    numeric: true,
    defaultDirection: 'desc',
    sortValue: row => row.executions == null ? -1 : row.executions,
    render: row => num(row.executions),
    cellClassName: row => row.executions == null ? 'is-unknown mono' : 'mono'
  }, {
    key: 'gateFailed',
    header: TC('adm_analysis_gate_failed'),
    description: TC('adm_analysis_gate_failed_description'),
    numeric: true,
    defaultDirection: 'desc',
    sortValue: row => row.gate_failed == null ? -1 : row.gate_failed,
    render: row => num(row.gate_failed),
    cellClassName: row => row.gate_failed == null ? 'is-unknown mono' : 'mono'
  }, {
    key: 'firstPass',
    header: TC('adm_analysis_first_pass'),
    description: TC('adm_analysis_first_pass_description'),
    numeric: true,
    defaultDirection: 'desc',
    sortValue: row => row.first_pass_rate_pct == null ? -1 : row.first_pass_rate_pct,
    render: row => /*#__PURE__*/React.createElement(RateValue, {
      value: row.first_pass_rate_pct,
      numerator: row.first_pass,
      denominator: row.terminal_executions,
      bar: true,
      tone: firstPassTone(row.first_pass_rate_pct)
    }),
    cellClassName: row => row.first_pass_rate_pct == null ? 'is-unknown' : ''
  }, {
    key: 'repair',
    header: TC('adm_analysis_repair_success'),
    description: TC('adm_analysis_repair_success_description'),
    numeric: true,
    defaultDirection: 'desc',
    sortValue: row => row.repair_success_rate_pct == null ? -1 : row.repair_success_rate_pct,
    render: row => /*#__PURE__*/React.createElement(RateValue, {
      value: row.repair_success_rate_pct,
      numerator: row.retry_succeeded,
      denominator: row.retry_terminal_executions
    }),
    cellClassName: row => row.repair_success_rate_pct == null ? 'is-unknown mono' : 'mono'
  }, {
    key: 'retry',
    header: TC('adm_analysis_retry_rate'),
    description: TC('adm_analysis_retry_rate_description'),
    numeric: true,
    defaultDirection: 'desc',
    sortValue: row => row.retry_rate_pct == null ? -1 : row.retry_rate_pct,
    render: row => /*#__PURE__*/React.createElement(RateValue, {
      value: row.retry_rate_pct,
      numerator: row.retried_executions,
      denominator: row.executions,
      tone: row.retry_rate_pct > 20 ? 'terra' : ''
    }),
    cellClassName: row => row.retry_rate_pct == null ? 'is-unknown mono' : row.retry_rate_pct > 20 ? 'is-failed mono' : 'mono'
  }, {
    key: 'failureRate',
    header: TC('adm_analysis_terminal_failure_rate'),
    description: TC('adm_analysis_terminal_failure_rate_description'),
    numeric: true,
    defaultDirection: 'desc',
    sortValue: row => row.terminal_failure_rate_pct == null ? -1 : row.terminal_failure_rate_pct,
    render: row => /*#__PURE__*/React.createElement(RateValue, {
      value: row.terminal_failure_rate_pct,
      numerator: row.final_failed,
      denominator: row.terminal_executions,
      tone: row.final_failed ? 'terra' : ''
    }),
    cellClassName: row => row.terminal_failure_rate_pct == null ? 'is-unknown mono' : 'mono'
  }, {
    key: 'avg',
    header: TC('adm_analysis_avg_ms'),
    description: TC('adm_analysis_avg_description'),
    numeric: true,
    priority: 'optional',
    defaultDirection: 'desc',
    sortValue: row => row.avg_ms == null ? -1 : row.avg_ms,
    render: row => duration(row.avg_ms),
    cellClassName: 'mono'
  }, {
    key: 'tokens',
    header: TC('adm_analysis_tokens'),
    description: TC('adm_analysis_tokens_description'),
    numeric: true,
    priority: 'optional',
    defaultDirection: 'desc',
    sortValue: row => totalTokens(row) == null ? -1 : totalTokens(row),
    render: row => tokens(totalTokens(row)),
    cellClassName: 'mono'
  }];
  function NodeTable({
    rows,
    selectedId,
    onSelect
  }) {
    const columns = [{
      key: 'node',
      header: TC('adm_analysis_node'),
      description: TC('adm_analysis_node_description'),
      priority: 'primary',
      sortValue: row => nodeLabel(row),
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, nodeLabel(row), !row.ledger && /*#__PURE__*/React.createElement("em", {
        className: "adm-analysis-tag"
      }, TC('adm_analysis_no_ledger'))), row.node_id !== 'unattributed' && /*#__PURE__*/React.createElement("code", null, row.node_id))
    }, ...executionMetricColumns(), {
      key: 'action',
      header: '',
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "adm-analysis-view",
        onClick: () => onSelect(row.node_id)
      }, TC('adm_analysis_view'))
    }];
    return /*#__PURE__*/React.createElement(DataTable, {
      rows: rows,
      columns: columns,
      rowKey: "node_id",
      ariaLabel: TC('adm_analysis_nodes'),
      pageSize: 15,
      initialSort: {
        key: 'failureRate',
        direction: 'desc'
      },
      className: "adm-analysis-type-table",
      empty: TC('adm_analysis_no_data'),
      onRowActivate: row => onSelect(row.node_id),
      selectedRowKey: selectedId,
      rowClassName: row => row.final_failed ? 'is-alert' : ''
    });
  }
  const TREND_SERIES = () => [{
    key: 'executions',
    label: TC('adm_analysis_executions'),
    tone: 'gold',
    format: num
  }, {
    key: 'gate_failed',
    label: TC('adm_analysis_gate_failed'),
    tone: 'slate',
    format: num
  }, {
    key: 'final_failed',
    label: TC('adm_analysis_final_failed'),
    tone: 'terra',
    format: num
  }];
  function TrendChart({
    series
  }) {
    return /*#__PURE__*/React.createElement(CartesianChart, {
      rows: series,
      xKey: "date",
      xTickFormatter: shortDate,
      ariaLabel: TC('adm_analysis_trend'),
      empty: TC('adm_analysis_no_data'),
      series: TREND_SERIES()
    });
  }
  function ModelTable({
    nodeRow,
    coverageSince,
    availability
  }) {
    const models = nodeRow.model_executions || [];
    const metricsAvailable = availability === 'available' || availability === 'stale' || availability === 'partial';
    if (!models.length) {
      return /*#__PURE__*/React.createElement("div", {
        className: "adm-analysis-empty"
      }, !metricsAvailable ? TC('adm_analysis_collection_unavailable_body') : !nodeRow.ledger ? TC('adm_analysis_no_ledger_detail') : coverageSince ? TC('adm_analysis_model_coverage').replace('{date}', stamp(coverageSince)) : TC('adm_analysis_no_model_data'));
    }
    const columns = [{
      key: 'model',
      header: TC('adm_analysis_model'),
      description: TC('adm_analysis_model_description'),
      priority: 'primary',
      sortValue: row => row.model_ref,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, row.model_ref), row.model_ref === nodeRow.configured_model && /*#__PURE__*/React.createElement("em", null, TC('adm_analysis_current_mark')))
    }, ...executionMetricColumns()];
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DataTable, {
      rows: models,
      columns: columns,
      rowKey: "model_ref",
      ariaLabel: TC('adm_analysis_models'),
      initialSort: {
        key: 'failureRate',
        direction: 'desc'
      },
      className: "adm-analysis-model-table",
      rowClassName: row => row.model_ref === nodeRow.configured_model ? 'is-current' : '',
      compact: true
    }), coverageSince && /*#__PURE__*/React.createElement("p", {
      className: "adm-analysis-coverage"
    }, TC('adm_analysis_model_coverage').replace('{date}', stamp(coverageSince))));
  }
  function ModelFailureModes({
    models
  }) {
    const withCodes = (models || []).filter(model => model.error_codes && model.error_codes.length);
    if (!withCodes.length) return null;
    const max = Math.max(...withCodes.flatMap(model => model.error_codes.map(item => item.count)));
    return /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, TC('adm_analysis_model_failures')), /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-model-failures"
    }, withCodes.map(model => /*#__PURE__*/React.createElement("div", {
      key: model.model_ref
    }, /*#__PURE__*/React.createElement("h4", null, model.model_ref), /*#__PURE__*/React.createElement(MetricBars, {
      items: model.error_codes.map(item => ({
        key: item.code,
        label: item.code,
        value: item.count
      })),
      ariaLabel: model.model_ref,
      format: num,
      tone: "terra",
      max: max,
      compact: true
    })))));
  }
  function NodeTrend({
    series
  }) {
    return /*#__PURE__*/React.createElement(CartesianChart, {
      rows: series,
      xKey: "date",
      xTickFormatter: shortDate,
      ariaLabel: TC('adm_analysis_node_trend'),
      empty: TC('adm_analysis_no_data'),
      height: 150,
      compact: true,
      series: TREND_SERIES()
    });
  }
  function NodeModal({
    nodeRow,
    coverageSince,
    availability,
    onClose
  }) {
    const closeRef = useRef(null);
    useEffect(() => {
      if (!nodeRow) return undefined;
      const previous = document.activeElement;
      if (closeRef.current) closeRef.current.focus();
      const onKey = event => {
        if (event.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('keydown', onKey);
        if (previous && previous.focus) previous.focus();
      };
    }, [nodeRow, onClose]);
    if (!nodeRow) return null;
    const taskTypes = (nodeRow.task_types || []).map(item => taskTypeName(item.task_type)).join('、');
    const errorCodes = nodeRow.error_codes || [];
    const trend = nodeRow.trend || [];
    const showSide = Boolean(nodeRow.ledger) || errorCodes.length > 0;
    const showFailureModes = (nodeRow.model_executions || []).some(model => model.error_codes && model.error_codes.length);
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-overlay",
      onMouseDown: event => {
        if (event.target === event.currentTarget) onClose();
      }
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-analysis-modal",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "adm-analysis-modal-title"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-modal-id"
    }, /*#__PURE__*/React.createElement("h2", {
      id: "adm-analysis-modal-title"
    }, nodeLabel(nodeRow)), nodeRow.node_id !== 'unattributed' && /*#__PURE__*/React.createElement("code", null, nodeRow.node_id), !nodeRow.ledger && /*#__PURE__*/React.createElement("em", {
      className: "adm-analysis-tag"
    }, TC('adm_analysis_no_ledger')), taskTypes && /*#__PURE__*/React.createElement("span", {
      className: "adm-analysis-modal-types"
    }, taskTypes)), /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-modal-config"
    }, /*#__PURE__*/React.createElement("span", null, TC('adm_analysis_configured_model')), /*#__PURE__*/React.createElement("code", null, nodeRow.configured_model || '—')), /*#__PURE__*/React.createElement("button", {
      ref: closeRef,
      type: "button",
      "aria-label": TC('adm_analysis_close'),
      onClick: onClose
    }, "\xD7")), /*#__PURE__*/React.createElement("dl", {
      className: "adm-analysis-modal-facts"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, TC('adm_analysis_executions')), /*#__PURE__*/React.createElement("dd", null, num(nodeRow.executions))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, TC('adm_analysis_gate_failed')), /*#__PURE__*/React.createElement("dd", null, num(nodeRow.gate_failed))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, TC('adm_analysis_first_pass')), /*#__PURE__*/React.createElement("dd", null, /*#__PURE__*/React.createElement(RateValue, {
      value: nodeRow.first_pass_rate_pct,
      numerator: nodeRow.first_pass,
      denominator: nodeRow.terminal_executions
    }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, TC('adm_analysis_repair_success')), /*#__PURE__*/React.createElement("dd", null, /*#__PURE__*/React.createElement(RateValue, {
      value: nodeRow.repair_success_rate_pct,
      numerator: nodeRow.retry_succeeded,
      denominator: nodeRow.retry_terminal_executions
    }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, TC('adm_analysis_retry_rate')), /*#__PURE__*/React.createElement("dd", null, /*#__PURE__*/React.createElement(RateValue, {
      value: nodeRow.retry_rate_pct,
      numerator: nodeRow.retried_executions,
      denominator: nodeRow.executions
    }))), /*#__PURE__*/React.createElement("div", {
      className: nodeRow.final_failed ? 'is-bad' : ''
    }, /*#__PURE__*/React.createElement("dt", null, TC('adm_analysis_terminal_failure_rate')), /*#__PURE__*/React.createElement("dd", null, /*#__PURE__*/React.createElement(RateValue, {
      value: nodeRow.terminal_failure_rate_pct,
      numerator: nodeRow.final_failed,
      denominator: nodeRow.terminal_executions
    }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, TC('adm_analysis_avg_ms')), /*#__PURE__*/React.createElement("dd", null, duration(nodeRow.avg_ms))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, TC('adm_analysis_p95')), /*#__PURE__*/React.createElement("dd", null, duration(nodeRow.p95_ms)))), /*#__PURE__*/React.createElement("div", {
      className: 'adm-analysis-modal-body' + (!showSide || !showFailureModes ? ' is-single-lower' : '')
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-analysis-modal-models"
    }, /*#__PURE__*/React.createElement("h3", null, TC('adm_analysis_models')), /*#__PURE__*/React.createElement(ModelTable, {
      nodeRow: nodeRow,
      coverageSince: coverageSince,
      availability: availability
    })), showFailureModes && /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-modal-main"
    }, /*#__PURE__*/React.createElement(ModelFailureModes, {
      models: nodeRow.model_executions
    })), showSide && /*#__PURE__*/React.createElement("aside", {
      className: "adm-analysis-modal-side"
    }, nodeRow.ledger && /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, TC('adm_analysis_node_trend')), /*#__PURE__*/React.createElement(NodeTrend, {
      series: trend
    })), errorCodes.length > 0 && /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, TC('adm_analysis_gate_reasons')), /*#__PURE__*/React.createElement(MetricBars, {
      items: errorCodes.map(item => ({
        key: item.code,
        label: item.code,
        value: item.count
      })),
      ariaLabel: TC('adm_analysis_gate_reasons'),
      format: num,
      tone: "terra",
      compact: true,
      empty: TC('adm_analysis_no_gate_failure')
    }))))));
  }
  function AdminAnalysisTab() {
    const [hours, setHours] = useState(7 * 24);
    const [nodeKind, setNodeKind] = useState('llm');
    const [refreshKey, setRefreshKey] = useState(0);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedNode, setSelectedNode] = useState(null);
    const pendingRequest = useRef(null);
    useEffect(() => {
      if (pendingRequest.current) pendingRequest.current.abort();
      const controller = new AbortController();
      pendingRequest.current = controller;
      setLoading(true);
      setError('');
      window.LF_API.adminAnalyticsNodes(hours, nodeKind, {
        signal: controller.signal
      }).then(result => {
        if (!controller.signal.aborted) setData(result);
      }).catch(reason => {
        if (reason.name !== 'AbortError') setError(reason.message || TC('adm_forbidden'));
      }).finally(() => {
        if (pendingRequest.current !== controller) return;
        pendingRequest.current = null;
        setLoading(false);
      });
      return () => controller.abort();
    }, [hours, nodeKind, refreshKey]);
    const availability = data && data.availability || 'available';
    const totals = data && data.totals || null;
    const byNode = data && data.by_node || [];
    const selectedRow = byNode.find(row => row.node_id === selectedNode) || null;
    const gateCodes = totals && totals.error_codes || [];
    const collector = data && data.collector || null;
    const metricsAvailable = availability === 'available' || availability === 'stale' || availability === 'partial';
    const invalidFiles = Number(collector && collector.invalid_files) || 0;
    const scopeTruncated = Boolean(data && data.scope_truncated);
    const collectorWarning = availability !== 'available' || invalidFiles > 0 || scopeTruncated;
    return /*#__PURE__*/React.createElement("div", {
      className: 'adm-analysis' + (loading ? ' is-loading' : '')
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-analysis-header"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, TC('adm_analysis_title')), /*#__PURE__*/React.createElement("p", null, TC('adm_analysis_subtitle'))), /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-controls"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-segment",
      role: "group",
      "aria-label": TC('adm_analysis_node_filter')
    }, [{
      value: 'llm',
      label: TC('adm_analysis_filter_llm')
    }, {
      value: 'script',
      label: TC('adm_analysis_filter_script')
    }, {
      value: 'all',
      label: TC('adm_analysis_filter_all')
    }].map(item => /*#__PURE__*/React.createElement("button", {
      key: item.value,
      type: "button",
      className: nodeKind === item.value ? 'on' : '',
      onClick: () => setNodeKind(item.value)
    }, item.label))), /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-segment",
      role: "group",
      "aria-label": TC('adm_analysis_range')
    }, [{
      value: 30 * 24,
      label: TC('adm_analysis_30d')
    }, {
      value: 7 * 24,
      label: TC('adm_analysis_7d')
    }, {
      value: 3 * 24,
      label: TC('adm_analysis_3d')
    }, {
      value: 24,
      label: TC('adm_analysis_1d')
    }, {
      value: 12,
      label: TC('adm_analysis_12h')
    }, {
      value: 3,
      label: TC('adm_analysis_3h')
    }, {
      value: 1,
      label: TC('adm_analysis_1h')
    }].map(item => /*#__PURE__*/React.createElement("button", {
      key: item.value,
      type: "button",
      className: hours === item.value ? 'on' : '',
      onClick: () => setHours(item.value)
    }, item.label))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: loading,
      onClick: () => setRefreshKey(key => key + 1)
    }, loading ? TC('set_loading') : TC('adm_analysis_refresh')))), error && /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-error"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setRefreshKey(key => key + 1)
    }, TC('adm_analysis_retry'))), data && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
      className: "adm-analysis-metrics",
      "aria-label": TC('adm_analysis_summary')
    }, /*#__PURE__*/React.createElement(AnalysisMetric, {
      label: TC('adm_analysis_executions'),
      value: num(totals && totals.executions),
      note: TC('adm_analysis_executions_note')
    }), /*#__PURE__*/React.createElement(AnalysisMetric, {
      label: TC('adm_analysis_first_pass'),
      value: pct(totals && totals.first_pass_rate_pct),
      note: ratioNote(totals && totals.first_pass, totals && totals.terminal_executions, TC('adm_analysis_first_pass_note'))
    }), /*#__PURE__*/React.createElement(AnalysisMetric, {
      label: TC('adm_analysis_repair_success'),
      value: pct(totals && totals.repair_success_rate_pct),
      note: ratioNote(totals && totals.retry_succeeded, totals && totals.retry_terminal_executions, TC('adm_analysis_repair_note'))
    }), /*#__PURE__*/React.createElement(AnalysisMetric, {
      label: TC('adm_analysis_retry_rate'),
      value: pct(totals && totals.retry_rate_pct),
      note: ratioNote(totals && totals.retried_executions, totals && totals.executions, TC('adm_analysis_retry_note')),
      tone: totals && totals.retry_rate_pct > 20 ? 'warning' : ''
    }), /*#__PURE__*/React.createElement(AnalysisMetric, {
      label: TC('adm_analysis_avg_ms'),
      value: duration(totals && totals.avg_ms),
      note: TC('adm_analysis_avg_note')
    })), collectorWarning && /*#__PURE__*/React.createElement("section", {
      className: "adm-analysis-alert warning"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-alert-mark",
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, availability === 'analytics_unreachable' ? TC('adm_analysis_engine_unreachable') : availability === 'unavailable' ? TC('adm_analysis_collection_unavailable') : availability === 'stale' ? TC('adm_analysis_collection_stale') : availability === 'partial' || scopeTruncated ? TC('adm_analysis_scope_partial') : TC('adm_analysis_collection_partial')), /*#__PURE__*/React.createElement("p", null, availability === 'analytics_unreachable' ? TC('adm_analysis_engine_unreachable_body') : availability === 'unavailable' ? TC('adm_analysis_collection_unavailable_body') : availability === 'stale' ? TC('adm_analysis_collection_stale_body').replace('{time}', stamp(collector && collector.last_success_at)) : availability === 'partial' || scopeTruncated ? TC('adm_analysis_scope_partial_body') : TC('adm_analysis_collection_partial_body').replace('{count}', num(invalidFiles)).replace('{time}', stamp(collector && collector.last_success_at))))), /*#__PURE__*/React.createElement("section", {
      className: "adm-analysis-card adm-analysis-types"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-card-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, TC('adm_analysis_nodes')), /*#__PURE__*/React.createElement("p", null, TC('adm_analysis_nodes_note'))), /*#__PURE__*/React.createElement("span", null, num(byNode.length))), /*#__PURE__*/React.createElement(NodeTable, {
      rows: byNode,
      selectedId: selectedNode,
      onSelect: setSelectedNode
    })), /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-lower-grid"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-analysis-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-card-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, TC('adm_analysis_gate_reasons')), /*#__PURE__*/React.createElement("p", null, TC('adm_analysis_gate_reasons_note')))), /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-reasons"
    }, /*#__PURE__*/React.createElement(MetricBars, {
      items: gateCodes.map(item => ({
        key: item.code,
        label: item.code,
        value: item.count
      })),
      ariaLabel: TC('adm_analysis_gate_reasons'),
      format: num,
      tone: "terra",
      empty: metricsAvailable ? TC('adm_analysis_no_gate_failure') : TC('adm_analysis_collection_unavailable_body')
    }))), /*#__PURE__*/React.createElement("section", {
      className: "adm-analysis-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-card-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, TC('adm_analysis_trend')), /*#__PURE__*/React.createElement("p", null, TC('adm_analysis_trend_note')))), /*#__PURE__*/React.createElement(TrendChart, {
      series: data && data.trend || []
    })))), !data && !error && /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-card adm-analysis-empty"
    }, TC('set_loading')), /*#__PURE__*/React.createElement(NodeModal, {
      nodeRow: selectedRow,
      coverageSince: data && data.model_metrics_since,
      availability: availability,
      onClose: () => setSelectedNode(null)
    }));
  }
  window.AdminAnalysisTab = AdminAnalysisTab;
})();
}
