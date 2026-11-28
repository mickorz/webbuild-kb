{
(function () {
  const {
    useCallback,
    useMemo,
    useRef,
    useState,
    useEffect
  } = React;
  const DataTable = window.AdminDataTable;
  const CartesianChart = window.AdminCartesianChart;
  const COPY = {
    zh: {
      title: '体验与稳定性',
      readonly: '只读',
      updated: '更新于',
      refresh: '刷新',
      refreshing: '刷新中…',
      windows: {
        1: '近 1 小时',
        6: '近 6 小时',
        24: '近 24 小时',
        168: '近 7 天',
        720: '近 30 天'
      },
      audience: '统计对象',
      audienceUser: '创作入口',
      audienceAll: '含管理面',
      layersLabel: '观测层',
      current: '当前',
      healthy: '未见失败',
      attention: '需关注',
      unavailable: '暂不可用',
      layers: {
        portal: {
          name: '查询响应',
          unit: '请求',
          fail: '5xx'
        },
        logical: {
          name: '用户任务',
          unit: '次任务',
          fail: '任务失败'
        },
        engine_jobs: {
          name: 'Workflow',
          unit: '个 Workflow',
          fail: '失败'
        },
        engine_nodes: {
          name: '节点',
          unit: '次节点执行',
          fail: '失败'
        }
      },
      requests: '请求量',
      p99: 'P99',
      peak: '峰值',
      average: '平均耗时',
      count: '次数',
      success: '成功',
      failure: '失败',
      delivered: '任务完成',
      exhausted: '任务失败',
      recovery: '自动重建',
      unknown: '未知',
      jobs: 'Workflow 数',
      jobFailed: 'Workflow 失败',
      cancelled: '已取消',
      executions: '节点执行',
      firstSuccess: '首次成功',
      retrySuccess: '重试后成功',
      nodeFailed: '最终失败',
      waitingRetry: '等待重试',
      partial: '覆盖不完整',
      stale: '数据延迟',
      rate: '成功率',
      active: '进行中',
      logicalCountNote: '一次页面操作，可包含一个或多个 Workflow',
      workflowCountNote: '实际运行的 Workflow Task',
      nodeCountNote: '同一 Workflow 中的节点执行',
      successNote: '已到达成功终态',
      failureNote: '已到达失败终态',
      rateNote: '成功 /（成功 + 失败）',
      logicalDurationNote: '页面操作发起到逻辑任务终态',
      workflowDurationNote: 'Task 创建到成功或失败终态',
      nodeDurationNote: '节点执行耗时',
      portalRate: '5xx 率',
      portalRateNote: '5xx / 查询请求',
      portalDurationNote: '查询响应平均耗时',
      accessory: '查询调用',
      timeline: '趋势',
      noSamples: '当前窗口无采样',
      details: '明细',
      abnormal: '异常优先',
      volume: '最多',
      slowest: '最慢',
      action: '对象',
      view: '查看',
      evidence: '证据',
      selectedWindow: '当前窗口',
      noRows: '当前层暂无数据',
      requestDataUnavailable: '指标载入失败',
      retry: '重试',
      loading: '正在载入分层指标',
      close: '关闭',
      assessUnavailable: '层不可用',
      assessAttention: '需关注',
      assessHealthy: '当前窗口平稳'
    },
    en: {
      title: 'Experience & stability',
      readonly: 'Read only',
      updated: 'Updated',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      windows: {
        1: 'Last hour',
        6: 'Last 6 hours',
        24: 'Last 24 hours',
        168: 'Last 7 days',
        720: 'Last 30 days'
      },
      audience: 'Population',
      audienceUser: 'User entry',
      audienceAll: 'Include admin',
      layersLabel: 'Observation layers',
      current: 'Now',
      healthy: 'No failures',
      attention: 'Needs attention',
      unavailable: 'Unavailable',
      layers: {
        portal: {
          name: 'Query responses',
          unit: 'requests',
          fail: '5xx'
        },
        logical: {
          name: 'User tasks',
          unit: 'logical tasks',
          fail: 'task failures'
        },
        engine_jobs: {
          name: 'Workflows',
          unit: 'workflows',
          fail: 'Failures'
        },
        engine_nodes: {
          name: 'Nodes',
          unit: 'node runs',
          fail: 'Failures'
        }
      },
      requests: 'Requests',
      p99: 'P99',
      peak: 'Peak',
      average: 'Avg duration',
      count: 'Count',
      success: 'Success',
      failure: 'Failure',
      delivered: 'Tasks completed',
      exhausted: 'Tasks failed',
      recovery: 'Auto rebuilds',
      unknown: 'Unknown',
      jobs: 'Workflows',
      jobFailed: 'Workflow failures',
      cancelled: 'Cancelled',
      executions: 'Node runs',
      firstSuccess: 'First-try success',
      retrySuccess: 'Success after retry',
      nodeFailed: 'Final failure',
      waitingRetry: 'Waiting to retry',
      partial: 'Partial coverage',
      stale: 'Data delayed',
      rate: 'Success rate',
      active: 'In progress',
      logicalCountNote: 'One page action; may include one or more workflows',
      workflowCountNote: 'Workflow Tasks actually started',
      nodeCountNote: 'Node runs within workflows',
      successNote: 'Reached a successful terminal state',
      failureNote: 'Reached a failed terminal state',
      rateNote: 'Success / (success + failure)',
      logicalDurationNote: 'Page action to logical-task terminal state',
      workflowDurationNote: 'Task creation to success or failure',
      nodeDurationNote: 'Node execution duration',
      portalRate: '5xx rate',
      portalRateNote: '5xx / query requests',
      portalDurationNote: 'Average query response time',
      accessory: 'Query calls',
      timeline: 'Trend',
      noSamples: 'No samples in this window',
      details: 'Details',
      abnormal: 'Risk first',
      volume: 'Most',
      slowest: 'Slowest',
      action: 'Object',
      view: 'View',
      evidence: 'Evidence',
      selectedWindow: 'Current window',
      noRows: 'No rows for this layer',
      requestDataUnavailable: 'Metrics are unavailable',
      retry: 'Retry',
      loading: 'Loading layered metrics',
      close: 'Close',
      assessUnavailable: 'layer unavailable',
      assessAttention: 'needs attention',
      assessHealthy: 'stable in this window'
    }
  };
  const LAYER_ORDER = ['portal', 'logical', 'engine_jobs', 'engine_nodes'];
  const ROUTE_NAMES = {
    '/api/admin/analytics/performance': ['体验指标查询', 'Performance analytics'],
    '/api/admin/analytics': ['运营分析查询', 'Admin analytics'],
    '/api/engine-tasks': ['引擎任务代理', 'Engine task proxy'],
    '/api/auth/login': ['登录', 'Sign in'],
    '/api/auth/me': ['会话校验', 'Session check'],
    '/api/books': ['作品查询', 'Books']
  };
  const OBJECT_NAMES = {
    'chapter_chain:prose': ['章节正文链', 'Chapter prose chain'],
    'chapter_chain:outline': ['章节大纲链', 'Chapter outline chain'],
    chapter_outline_director: ['章节细纲导演', 'Chapter outline director'],
    chapter_writer_single: ['单写手章节', 'Single-writer chapter'],
    chapter_writer_muti: ['多写手章节', 'Multi-writer chapter'],
    cruise_chapter: ['巡航章节', 'Cruise chapter'],
    character: ['角色构建', 'Character build'],
    world_build: ['世界观构建', 'World build'],
    outline: ['卷纲 / 近纲构建', 'Volume / near-term outline'],
    post_hoc: ['章节后验', 'Chapter post-hoc'],
    story_plan: ['故事规划', 'Story plan'],
    field_rewrite: ['字段改写', 'Field rewrite'],
    character_create: ['新建角色', 'Create character'],
    polish: ['章节润色', 'Chapter polish']
  };
  function layerBlock(data, layer) {
    if (!data) return null;
    if (layer === 'portal') return data.portal || null;
    if (layer === 'logical') return data.logical || null;
    if (layer === 'engine_jobs') return data.engine_jobs || null;
    return data.engine_nodes || null;
  }
  function layerUnavailable(layer, block) {
    if (layer === 'portal') return false;
    return !block || block.available !== true;
  }
  function displayMetric(value, unavailable) {
    if (unavailable || value == null || value === '') return '—';
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return number.toLocaleString();
  }
  function durationOf(value, unavailable) {
    if (unavailable || value == null || value === '') return '—';
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    if (number < 1000) return Math.round(number).toLocaleString() + ' ms';
    if (number < 90000) return (number / 1000).toFixed(1) + ' s';
    return (number / 60000).toFixed(1) + ' min';
  }
  function pctOf(value, unavailable) {
    if (unavailable || value == null || value === '') return '—';
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return number.toFixed(1) + '%';
  }
  function layerFailures(layer, block) {
    if (!block) return null;
    if (layer === 'portal') return Number(block.errors) || 0;
    if (layer === 'logical') return Number(block.exhausted) || 0;
    if (layer === 'engine_jobs') return Number(block.failed) || 0;
    const summary = block.summary || {};
    return Number(summary.final_failed) || 0;
  }
  function layerAttention(layer, block) {
    if (!block) return 0;
    if (layer === 'logical') return Number(block.unknown) || 0;
    const coverage = block.coverage || {};
    if (layer === 'engine_jobs') {
      return (Number(block.waiting_retry) || 0) + (Number(block.unknown) || 0) + Number(Boolean(coverage.stale || coverage.partial));
    }
    if (layer === 'engine_nodes') {
      const summary = block.summary || {};
      return (Number(summary.waiting_retry) || 0) + (Number(summary.unknown) || 0) + Number(Boolean(coverage.stale || coverage.partial));
    }
    return 0;
  }
  function rowRisk(row) {
    const extra = row.extra || {};
    return (Number(row.fail) || 0) * 1000 + (Number(extra.waiting_retry) || 0) * 10 + (Number(extra.unknown) || 0);
  }
  function assessmentText(assessment, copy) {
    const assessLayer = copy.layers[assessment.layer] ? copy.layers[assessment.layer].name : copy.layers.logical.name;
    if (assessment.tone === 'unavailable') return assessLayer + ' · ' + copy.assessUnavailable;
    if (assessment.tone !== 'attention') return copy.assessHealthy;
    const count = (Number(assessment.failures) || 0) + (Number(assessment.attention) || 0);
    return assessLayer + ' · ' + copy.assessAttention + (count ? ' ' + displayMetric(count, false) : '');
  }
  function layerCount(layer, block) {
    if (!block) return null;
    if (layer === 'engine_nodes') {
      const summary = block.summary || {};
      return summary.executions == null ? null : Number(summary.executions);
    }
    return block.count == null ? null : Number(block.count);
  }
  function layerStatus(layer, block, copy) {
    const meta = copy.layers[layer];
    if (layerUnavailable(layer, block)) {
      return {
        tone: 'unavailable',
        text: copy.unavailable,
        volume: ''
      };
    }
    const summary = block.summary || {};
    const unknown = layer === 'engine_nodes' ? Number(summary.unknown) || 0 : Number(block.unknown) || 0;
    const waitingRetry = layer === 'engine_nodes' ? Number(summary.waiting_retry) || 0 : Number(block.waiting_retry) || 0;
    const coverage = block.coverage || {};
    const visibleFail = layerFailures(layer, block);
    const volume = displayMetric(layerCount(layer, block), false) + ' ' + meta.unit;
    if (coverage.stale || block.availability === 'stale') return {
      tone: 'attention',
      text: copy.stale,
      volume
    };
    if (coverage.partial || block.availability === 'partial') return {
      tone: 'attention',
      text: copy.partial,
      volume
    };
    if (visibleFail) return {
      tone: 'attention',
      text: meta.fail + ' ' + displayMetric(visibleFail, false),
      volume
    };
    if (waitingRetry) return {
      tone: 'attention',
      text: copy.waitingRetry + ' ' + displayMetric(waitingRetry, false),
      volume
    };
    if (unknown) return {
      tone: 'attention',
      text: copy.unknown + ' ' + displayMetric(unknown, false),
      volume
    };
    if (coverage.truncated) return {
      tone: 'attention',
      text: copy.partial,
      volume
    };
    return {
      tone: 'healthy',
      text: copy.healthy,
      volume
    };
  }
  function displayName(path, isEn) {
    const names = ROUTE_NAMES[path];
    return names ? names[isEn ? 1 : 0] : path;
  }
  function objectName(value, isEn) {
    const names = OBJECT_NAMES[value];
    return names ? names[isEn ? 1 : 0] : value;
  }
  function layerSuccess(layer, block) {
    if (!block) return null;
    if (layer === 'logical') return Number(block.delivered) || 0;
    if (layer === 'engine_jobs') return Number(block.completed) || 0;
    if (layer === 'engine_nodes') {
      const summary = block.summary || {};
      return (Number(summary.first_success) || 0) + (Number(summary.retry_then_success) || 0);
    }
    return null;
  }
  function layerRate(layer, block) {
    if (!block) return null;
    if (layer === 'portal') return block.error_rate_pct;
    return block.success_rate_pct;
  }
  function layerAverage(layer, block) {
    if (!block) return null;
    return block.avg_ms;
  }
  function LayerCard({
    layer,
    selected,
    block,
    copy,
    onSelect,
    onKeyDown
  }) {
    const meta = copy.layers[layer];
    const status = layerStatus(layer, block, copy);
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: 'adm-perf-layer ' + status.tone + (selected ? ' selected' : ''),
      "data-layer": layer,
      "aria-pressed": selected,
      onClick: () => onSelect(layer),
      onKeyDown: onKeyDown
    }, /*#__PURE__*/React.createElement("strong", null, meta.name), /*#__PURE__*/React.createElement("span", null, status.text), status.volume ? /*#__PURE__*/React.createElement("small", null, status.volume) : null);
  }
  function SummaryMetric({
    label,
    value,
    note,
    tone
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: 'adm-perf-metric' + (tone ? ' ' + tone : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-metric-label"
    }, label), /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-metric-value"
    }, value), /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-metric-note"
    }, note));
  }
  function LayerMetrics({
    layer,
    block,
    copy
  }) {
    const unavailable = layerUnavailable(layer, block);
    if (layer === 'portal') {
      return /*#__PURE__*/React.createElement("section", {
        className: "adm-perf-metrics",
        "aria-label": copy.layers.portal.name
      }, /*#__PURE__*/React.createElement(SummaryMetric, {
        label: copy.requests,
        value: displayMetric(block && block.count, false),
        note: copy.layers.portal.unit
      }), /*#__PURE__*/React.createElement(SummaryMetric, {
        label: copy.layers.portal.fail,
        value: displayMetric(block && block.errors, false),
        note: copy.failureNote,
        tone: block && block.errors ? 'warning' : ''
      }), /*#__PURE__*/React.createElement(SummaryMetric, {
        label: copy.portalRate,
        value: pctOf(block && block.error_rate_pct, false),
        note: copy.portalRateNote
      }), /*#__PURE__*/React.createElement(SummaryMetric, {
        label: copy.average,
        value: durationOf(block && block.avg_ms, false),
        note: copy.portalDurationNote
      }), /*#__PURE__*/React.createElement(SummaryMetric, {
        label: copy.p99,
        value: durationOf(block && block.p99_ms, false),
        note: copy.peak
      }));
    }
    const failure = layerFailures(layer, block);
    const countNote = layer === 'logical' ? copy.logicalCountNote : layer === 'engine_jobs' ? copy.workflowCountNote : copy.nodeCountNote;
    const durationNote = layer === 'logical' ? copy.logicalDurationNote : layer === 'engine_jobs' ? copy.workflowDurationNote : copy.nodeDurationNote;
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-perf-metrics",
      "aria-label": copy.layers[layer].name
    }, /*#__PURE__*/React.createElement(SummaryMetric, {
      label: copy.count,
      value: displayMetric(layerCount(layer, block), unavailable),
      note: countNote
    }), /*#__PURE__*/React.createElement(SummaryMetric, {
      label: copy.success,
      value: displayMetric(layerSuccess(layer, block), unavailable),
      note: copy.successNote
    }), /*#__PURE__*/React.createElement(SummaryMetric, {
      label: copy.failure,
      value: displayMetric(failure, unavailable),
      note: copy.failureNote,
      tone: failure ? 'warning' : ''
    }), /*#__PURE__*/React.createElement(SummaryMetric, {
      label: copy.rate,
      value: pctOf(layerRate(layer, block), unavailable),
      note: copy.rateNote
    }), /*#__PURE__*/React.createElement(SummaryMetric, {
      label: copy.average,
      value: durationOf(layerAverage(layer, block), unavailable),
      note: durationNote
    }));
  }
  function LayerTimeline({
    layer,
    block,
    hours,
    fetchedAt,
    copy
  }) {
    const unavailable = layerUnavailable(layer, block);
    const series = unavailable ? [] : block && block.timeseries || [];
    const valueKey = layer === 'portal' ? 'avg_ms' : 'count';
    const failureKey = layer === 'logical' ? 'exhausted' : 'errors';
    const endAt = fetchedAt ? fetchedAt.getTime() : Date.now();
    const startAt = endAt - hours * 3600000;
    const primaryLabel = layer === 'portal' ? copy.average : copy.layers[layer].unit;
    const primaryFormat = layer === 'portal' ? value => durationOf(value, false) : value => displayMetric(value, false);
    const timeLabel = value => {
      const date = new Date(typeof value === 'number' ? value : Date.parse(value));
      return hours > 48 ? date.toLocaleDateString(undefined, {
        month: '2-digit',
        day: '2-digit'
      }) : date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-perf-timeline"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, copy.timeline)), /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-plot"
    }, series.length ? /*#__PURE__*/React.createElement(CartesianChart, {
      rows: series,
      xKey: "t",
      xDomain: [startAt, endAt],
      xTickFormatter: timeLabel,
      height: 110,
      compact: true,
      legend: true,
      ariaLabel: copy.layers[layer].name + ' ' + copy.timeline,
      series: [{
        key: valueKey,
        label: primaryLabel,
        tone: 'gold',
        format: primaryFormat
      }, {
        key: failureKey,
        label: copy.layers[layer].fail,
        type: 'bar',
        tone: 'terra',
        axis: 'right',
        format: value => displayMetric(value, false)
      }]
    }) : /*#__PURE__*/React.createElement("span", {
      className: "adm-perf-no-samples"
    }, unavailable ? copy.unavailable : copy.noSamples)));
  }
  function detailRows(layer, block, sort, isEn) {
    if (layerUnavailable(layer, block) || !block) return [];
    let rows = [];
    if (layer === 'portal') rows = (block.by_route || []).map(row => ({
      key: row.route,
      label: displayName(row.route, isEn),
      count: row.count,
      fail: row.errors,
      extra: row
    }));else if (layer === 'logical') rows = (block.by_kind || []).map(row => ({
      key: row.label,
      label: objectName(row.label, isEn),
      count: row.count,
      success: row.delivered || 0,
      fail: row.exhausted || 0,
      extra: row
    }));else if (layer === 'engine_jobs') rows = (block.by_operation || []).map(row => ({
      key: row.operation,
      label: objectName(row.operation, isEn),
      count: row.count,
      success: row.completed || 0,
      fail: row.failed || 0,
      extra: row
    }));else rows = (block.by_node || []).map(row => ({
      key: row.node_id,
      label: row.label || row.node_id,
      count: row.executions,
      success: (Number(row.first_success) || 0) + (Number(row.retry_then_success) || 0),
      fail: row.final_failed || 0,
      extra: row
    }));
    if (layer === 'portal') return rows;
    return [...rows].sort((left, right) => {
      if (sort === 'volume') return (right.count || 0) - (left.count || 0);
      if (sort === 'slow') return (Number(right.extra && right.extra.avg_ms) || 0) - (Number(left.extra && left.extra.avg_ms) || 0);
      return rowRisk(right) - rowRisk(left) || (right.count || 0) - (left.count || 0);
    });
  }
  function DetailTable({
    layer,
    rows,
    selectedKey,
    sort,
    copy,
    unavailable,
    onSort,
    onSelect
  }) {
    const objectColumn = {
      key: 'action',
      header: copy.action,
      priority: 'primary',
      sortable: false,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, row.label), row.label !== row.key ? /*#__PURE__*/React.createElement("code", null, row.key) : null)
    };
    const viewColumn = {
      key: 'view',
      header: '',
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: event => onSelect(row, event.currentTarget)
      }, copy.view)
    };
    const columns = layer === 'portal' ? [objectColumn, {
      key: 'count',
      header: copy.requests,
      numeric: true,
      sortable: false,
      render: row => displayMetric(row.count, false)
    }, {
      key: 'average',
      header: copy.average,
      numeric: true,
      sortable: false,
      render: row => durationOf(row.extra.avg_ms, false)
    }, {
      key: 'peak',
      header: copy.peak,
      numeric: true,
      sortable: false,
      render: row => durationOf(row.extra.max_ms, false)
    }, {
      key: 'failures',
      header: copy.layers.portal.fail,
      numeric: true,
      sortable: false,
      cellClassName: row => row.fail ? 'bad' : '',
      render: row => displayMetric(row.fail, false)
    }, viewColumn] : [objectColumn, {
      key: 'count',
      header: copy.count,
      numeric: true,
      sortable: false,
      render: row => displayMetric(row.count, false)
    }, {
      key: 'success',
      header: copy.success,
      numeric: true,
      sortable: false,
      render: row => displayMetric(row.success, false)
    }, {
      key: 'failures',
      header: copy.failure,
      numeric: true,
      sortable: false,
      cellClassName: row => row.fail ? 'bad' : '',
      render: row => displayMetric(row.fail, false)
    }, {
      key: 'rate',
      header: copy.rate,
      numeric: true,
      sortable: false,
      render: row => pctOf(row.extra.success_rate_pct, false)
    }, {
      key: 'average',
      header: copy.average,
      numeric: true,
      sortable: false,
      render: row => durationOf(row.extra.avg_ms, false)
    }, viewColumn];
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-perf-table-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, copy.details), /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-sort",
      role: "group",
      "aria-label": copy.details
    }, [['risk', copy.abnormal], ['volume', copy.volume], ['slow', copy.slowest]].map(([key, label]) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: key,
      className: sort === key ? 'on' : '',
      "aria-pressed": sort === key,
      onClick: () => onSort(key)
    }, label)))), unavailable ? /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-empty"
    }, copy.unavailable) : /*#__PURE__*/React.createElement(DataTable, {
      rows: rows,
      columns: columns,
      rowKey: "key",
      ariaLabel: `${copy.details} · ${copy.layers[layer].name}`,
      wrapClassName: "adm-perf-table-wrap",
      selectedRowKey: selectedKey,
      onRowActivate: row => onSelect(row, null),
      empty: copy.noRows,
      compact: true
    }));
  }
  function EvidencePanel({
    layer,
    row,
    block,
    copy,
    compact
  }) {
    const unavailable = layerUnavailable(layer, block);
    if (unavailable) {
      return /*#__PURE__*/React.createElement("aside", {
        className: 'adm-perf-evidence' + (compact ? ' compact' : '')
      }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, copy.evidence)), /*#__PURE__*/React.createElement("p", null, copy.unavailable));
    }
    if (!row) return /*#__PURE__*/React.createElement("aside", {
      className: 'adm-perf-evidence' + (compact ? ' compact' : '')
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, copy.evidence)), /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-empty"
    }, copy.noRows));
    const extra = row.extra || {};
    const accessory = block && block.portal_to_engine || {};
    return /*#__PURE__*/React.createElement("aside", {
      className: 'adm-perf-evidence' + (compact ? ' compact' : '')
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, copy.evidence)), /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-evidence-title"
    }, /*#__PURE__*/React.createElement("strong", null, row.label)), /*#__PURE__*/React.createElement("dl", null, layer === 'portal' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.layers.portal.fail), /*#__PURE__*/React.createElement("dd", {
      className: row.fail ? 'bad' : ''
    }, displayMetric(row.fail, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.average), /*#__PURE__*/React.createElement("dd", null, durationOf(extra.avg_ms, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.peak), /*#__PURE__*/React.createElement("dd", null, durationOf(extra.max_ms, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.requests), /*#__PURE__*/React.createElement("dd", null, displayMetric(row.count, false)))) : null, layer === 'logical' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.delivered), /*#__PURE__*/React.createElement("dd", null, displayMetric(extra.delivered, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.exhausted), /*#__PURE__*/React.createElement("dd", {
      className: extra.exhausted ? 'bad' : ''
    }, displayMetric(extra.exhausted, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.rate), /*#__PURE__*/React.createElement("dd", null, pctOf(extra.success_rate_pct, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.average), /*#__PURE__*/React.createElement("dd", null, durationOf(extra.avg_ms, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.recovery), /*#__PURE__*/React.createElement("dd", null, displayMetric(extra.recovery_count, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.unknown), /*#__PURE__*/React.createElement("dd", null, displayMetric(extra.unknown, false)))) : null, layer === 'engine_jobs' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.jobs), /*#__PURE__*/React.createElement("dd", null, displayMetric(extra.count, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.jobFailed), /*#__PURE__*/React.createElement("dd", {
      className: extra.failed ? 'bad' : ''
    }, displayMetric(extra.failed, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.rate), /*#__PURE__*/React.createElement("dd", null, pctOf(extra.success_rate_pct, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.average), /*#__PURE__*/React.createElement("dd", null, durationOf(extra.avg_ms, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.waitingRetry), /*#__PURE__*/React.createElement("dd", null, displayMetric(extra.waiting_retry, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.active), /*#__PURE__*/React.createElement("dd", null, displayMetric((Number(extra.queued) || 0) + (Number(extra.running) || 0), false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.cancelled), /*#__PURE__*/React.createElement("dd", null, displayMetric(extra.cancelled, false))), extra.unknown ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.unknown), /*#__PURE__*/React.createElement("dd", null, displayMetric(extra.unknown, false))) : null) : null, layer === 'engine_nodes' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.executions), /*#__PURE__*/React.createElement("dd", null, displayMetric(extra.executions, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.firstSuccess), /*#__PURE__*/React.createElement("dd", null, displayMetric(extra.first_success, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.retrySuccess), /*#__PURE__*/React.createElement("dd", null, displayMetric(extra.retry_then_success, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.nodeFailed), /*#__PURE__*/React.createElement("dd", {
      className: extra.final_failed ? 'bad' : ''
    }, displayMetric(extra.final_failed, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.rate), /*#__PURE__*/React.createElement("dd", null, pctOf(extra.success_rate_pct, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.average), /*#__PURE__*/React.createElement("dd", null, durationOf(extra.avg_ms, false))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.waitingRetry), /*#__PURE__*/React.createElement("dd", null, displayMetric(extra.waiting_retry, false))), extra.unknown ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.unknown), /*#__PURE__*/React.createElement("dd", null, displayMetric(extra.unknown, false))) : null) : null), layer === 'portal' ? /*#__PURE__*/React.createElement("p", null, copy.accessory, " ", displayMetric(accessory.count, false)) : null);
  }
  function FailureDrawer({
    title,
    body,
    copy,
    onClose
  }) {
    const closeButton = useRef(null);
    const dialog = useRef(null);
    useEffect(() => {
      if (closeButton.current) closeButton.current.focus();
      const onKey = event => {
        if (event.key === 'Escape') onClose();
        if (event.key !== 'Tab' || !dialog.current) return;
        const nodes = dialog.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-overlay",
      onMouseDown: event => {
        if (event.target === event.currentTarget) onClose();
      }
    }, /*#__PURE__*/React.createElement("aside", {
      ref: dialog,
      className: "adm-perf-drawer",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "adm-perf-drawer-title"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", {
      id: "adm-perf-drawer-title"
    }, title), /*#__PURE__*/React.createElement("button", {
      ref: closeButton,
      type: "button",
      "aria-label": copy.close,
      onClick: onClose
    }, "\xD7")), /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-drawer-body"
    }, body)));
  }
  function PerformanceSkeleton({
    copy
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-skeleton",
      "aria-busy": "true",
      "aria-label": copy.loading
    }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null));
  }
  function PerformanceTab() {
    const isEn = window.CLANG === 'en';
    const copy = COPY[isEn ? 'en' : 'zh'];
    const [hours, setHours] = useState(24);
    const [audience, setAudience] = useState('user');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [fetchedAt, setFetchedAt] = useState(null);
    const [layer, setLayer] = useState('logical');
    const [sort, setSort] = useState('risk');
    const [selectedKey, setSelectedKey] = useState('');
    const [drawerRow, setDrawerRow] = useState(null);
    const lastTrigger = useRef(null);
    const pendingRequest = useRef(null);
    const userPickedLayer = useRef(false);
    const layersRef = useRef(null);
    const load = useCallback(async (windowHours, windowAudience, windowSort) => {
      const requestKey = [windowHours, windowAudience, windowSort].join(':');
      const pending = pendingRequest.current;
      if (pending && pending.key === requestKey) return pending.promise;
      if (pending) pending.controller.abort();
      const controller = new AbortController();
      setLoading(true);
      setError('');
      const promise = window.LF_API.adminPerformance(windowHours, {
        audience: windowAudience,
        sort: windowSort,
        signal: controller.signal
      }).then(result => {
        if (controller.signal.aborted) return;
        const next = result || {};
        setData(next);
        setFetchedAt(new Date());
        if (!userPickedLayer.current && next.assessment && next.assessment.layer) setLayer(next.assessment.layer);
      }).catch(loadError => {
        if (loadError.name === 'AbortError') return;
        setError(loadError && loadError.message ? loadError.message : copy.requestDataUnavailable);
      }).finally(() => {
        if (!pendingRequest.current || pendingRequest.current.controller !== controller) return;
        pendingRequest.current = null;
        setLoading(false);
      });
      pendingRequest.current = {
        key: requestKey,
        controller,
        promise
      };
      return promise;
    }, [copy.requestDataUnavailable]);
    useEffect(() => {
      load(hours, audience, sort);
      return () => {
        const controller = pendingRequest.current && pendingRequest.current.controller;
        if (controller) controller.abort();
      };
    }, []);
    const block = layerBlock(data, layer);
    const unavailable = layerUnavailable(layer, block);
    const rows = useMemo(() => detailRows(layer, block, sort, isEn), [layer, block, sort, isEn]);
    const selectLayer = nextLayer => {
      userPickedLayer.current = true;
      setLayer(nextLayer);
      setSelectedKey('');
      setSort('risk');
      setDrawerRow(null);
      if (nextLayer === 'portal' && (!data || data.sort !== 'risk')) load(hours, audience, 'risk');
    };
    const changeSort = nextSort => {
      setSort(nextSort);
      if (layer === 'portal') load(hours, audience, nextSort);
    };
    const focusLayer = name => {
      const node = layersRef.current && layersRef.current.querySelector('[data-layer="' + name + '"]');
      if (node) node.focus();
    };
    const moveLayer = (delta, edge) => {
      const index = LAYER_ORDER.indexOf(layer);
      const nextIndex = edge === 'home' ? 0 : edge === 'end' ? LAYER_ORDER.length - 1 : Math.max(0, Math.min(LAYER_ORDER.length - 1, index + delta));
      const next = LAYER_ORDER[nextIndex];
      selectLayer(next);
      focusLayer(next);
    };
    const onLayersKeyDown = event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        moveLayer(1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveLayer(-1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        moveLayer(0, 'home');
      } else if (event.key === 'End') {
        event.preventDefault();
        moveLayer(0, 'end');
      }
    };
    const selectRow = (row, trigger) => {
      setSelectedKey(row.key);
      lastTrigger.current = trigger || (typeof document !== 'undefined' ? document.activeElement : null);
      setDrawerRow(row);
    };
    const closeDrawer = useCallback(() => {
      setDrawerRow(null);
      window.setTimeout(() => {
        if (lastTrigger.current) lastTrigger.current.focus();
      }, 0);
    }, []);
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-performance",
      "aria-busy": loading ? 'true' : 'false'
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-perf-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, copy.title)), /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-controls"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-sort",
      role: "group",
      "aria-label": copy.audience
    }, [['user', copy.audienceUser], ['all', copy.audienceAll]].map(([key, label]) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: key,
      className: audience === key ? 'on' : '',
      "aria-pressed": audience === key,
      disabled: loading,
      onClick: () => {
        setAudience(key);
        load(hours, key, sort);
      }
    }, label))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("select", {
      value: hours,
      disabled: loading,
      "aria-label": copy.selectedWindow,
      onChange: event => {
        const next = Number(event.target.value);
        setHours(next);
        load(next, audience, sort);
      }
    }, Object.entries(copy.windows).map(([value, label]) => /*#__PURE__*/React.createElement("option", {
      key: value,
      value: value
    }, label)))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: loading,
      onClick: () => load(hours, audience, sort)
    }, loading ? copy.refreshing : copy.refresh))), fetchedAt ? /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-updated"
    }, copy.updated, " ", fetchedAt.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }), " \xB7 ", copy.windows[hours]) : null, error && !data ? /*#__PURE__*/React.createElement("section", {
      className: "adm-perf-error"
    }, /*#__PURE__*/React.createElement("strong", null, copy.requestDataUnavailable), /*#__PURE__*/React.createElement("p", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => load(hours, audience, sort)
    }, copy.retry)) : null, !data && !error ? /*#__PURE__*/React.createElement(PerformanceSkeleton, {
      copy: copy
    }) : null, data ? /*#__PURE__*/React.createElement(React.Fragment, null, error ? /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-inline-error",
      role: "status"
    }, error) : null, /*#__PURE__*/React.createElement("div", {
      ref: layersRef,
      className: "adm-perf-layers",
      role: "group",
      "aria-label": copy.layersLabel
    }, LAYER_ORDER.map(name => /*#__PURE__*/React.createElement(LayerCard, {
      key: name,
      layer: name,
      selected: layer === name,
      block: layerBlock(data, name),
      copy: copy,
      onSelect: selectLayer,
      onKeyDown: onLayersKeyDown
    }))), /*#__PURE__*/React.createElement(LayerMetrics, {
      layer: layer,
      block: block,
      copy: copy
    }), /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-board"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-perf-detail-grid"
    }, /*#__PURE__*/React.createElement(DetailTable, {
      layer: layer,
      rows: rows,
      selectedKey: selectedKey,
      sort: sort,
      copy: copy,
      unavailable: unavailable,
      onSort: changeSort,
      onSelect: selectRow
    })), /*#__PURE__*/React.createElement(LayerTimeline, {
      layer: layer,
      block: block,
      hours: hours,
      fetchedAt: fetchedAt,
      copy: copy
    }))) : null, drawerRow ? /*#__PURE__*/React.createElement(FailureDrawer, {
      title: drawerRow.label,
      copy: copy,
      onClose: closeDrawer,
      body: /*#__PURE__*/React.createElement(EvidencePanel, {
        layer: layer,
        row: drawerRow,
        block: block,
        copy: copy,
        compact: true
      })
    }) : null);
  }
  window.AdminPerformanceTab = PerformanceTab;
  window.AdminPerformanceModel = {
    LAYER_ORDER,
    layerUnavailable,
    displayMetric,
    durationOf,
    layerStatus,
    layerFailures,
    layerAttention,
    layerCount,
    layerSuccess,
    layerRate,
    layerAverage,
    layerBlock,
    detailRows,
    rowRisk,
    assessmentText
  };
})();
}
