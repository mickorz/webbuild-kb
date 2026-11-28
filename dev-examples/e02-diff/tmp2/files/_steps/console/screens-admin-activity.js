{
/* ===== 管理后台 / 用户活跃与增长 ===== */
(function () {
  const {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
  } = React;
  const DataTable = window.AdminDataTable;
  const CartesianChart = window.AdminCartesianChart;
  const FunnelChart = window.AdminFunnelChart;
  const MetricBars = window.AdminMetricBars;
  const tr = (zh, en) => window.CLANG === 'en' ? en : zh;
  const number = value => value == null ? '—' : Number(value).toLocaleString();
  const intensity = value => value == null ? '—' : Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  const deltaText = item => {
    if (!item || item.delta == null) return '—';
    const sign = item.delta > 0 ? '+' : '';
    if (item.delta_pct == null) return sign + number(item.delta);
    return `${sign}${item.delta_pct}%`;
  };
  const stamp = value => value ? new Date(value).toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }) : '—';
  const SUMMARY_COPY = {
    active_users: ['活跃用户', 'Active users'],
    registrations: ['新注册', 'Registrations'],
    deep_users: ['深度活跃用户', 'Active deep users'],
    intensity: ['人均成文', 'Chapters / deep user'],
    paying_users: ['真实付费活跃', 'Active real payers'],
    logical_delivered: ['逻辑任务交付', 'Logical tasks delivered']
  };
  const FUNNEL_COPY = {
    registered: ['注册', 'Registered'],
    verified: ['验证邮箱', 'Verified'],
    created_book: ['创建作品', 'Created book'],
    book_setup_completed: ['完成建书', 'Book setup'],
    chapter_1: ['写成第 1 章', 'Chapter 1'],
    chapter_3: ['写成第 3 章', 'Chapter 3'],
    chapter_10: ['写成第 10 章', 'Chapter 10']
  };
  const CREATION_COPY = {
    creation_intent: ['创作意图', 'Creation intent'],
    creation_gate_blocked: ['本地拦截', 'Locally blocked'],
    creation_task_submitted: ['任务创建', 'Task submitted']
  };
  const QUEUE_REASON = {
    gate_no_prose: ['尚未成文', 'No prose yet'],
    gate_posthoc: ['后验未完成', 'Post-hoc pending'],
    gate_prevposthoc: ['上一章未定稿', 'Previous chapter open'],
    running_task: ['任务进行中', 'Task running'],
    tasks_unknown: ['任务状态未知', 'Task state unknown'],
    chapter_mismatch: ['章节已切换', 'Chapter changed'],
    creation_gate_blocked: ['创作被拦截', 'Creation blocked'],
    lapsed_deep: ['深度用户流失', 'Deep user lapsed'],
    no_book: ['尚未建书', 'No book yet'],
    no_activity: ['注册后未活跃', 'Registered, inactive']
  };
  function copyPair(map, key) {
    const item = map[key] || [key, key];
    return tr(item[0], item[1]);
  }
  function SummaryMetric({
    item
  }) {
    const unknown = item.current == null;
    return /*#__PURE__*/React.createElement("article", {
      className: 'act-metric' + (unknown ? ' is-unknown' : '')
    }, /*#__PURE__*/React.createElement("span", null, copyPair(SUMMARY_COPY, item.key)), /*#__PURE__*/React.createElement("strong", null, item.key === 'intensity' ? intensity(item.current) : number(item.current)), /*#__PURE__*/React.createElement("small", null, tr('对比上期', 'vs previous'), " ", deltaText(item)));
  }
  function LoadingState() {
    return /*#__PURE__*/React.createElement("div", {
      className: "act-loading",
      "aria-label": tr('加载中', 'Loading')
    }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null));
  }
  function UserActivityTab({
    onOpenUser
  }) {
    const [days, setDays] = useState(7);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const pendingRequest = useRef(null);
    const load = useCallback(() => {
      const requestKey = String(days);
      const pending = pendingRequest.current;
      if (pending && pending.key === requestKey) return pending.promise;
      if (pending) pending.controller.abort();
      const controller = new AbortController();
      setLoading(true);
      setError('');
      const promise = window.LF_API.adminUserActivity(days, {
        signal: controller.signal
      }).then(result => {
        if (!controller.signal.aborted) setData(result);
      }).catch(err => {
        if (err.name !== 'AbortError') setError(err.message || tr('加载失败', 'Failed to load'));
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
    }, [days]);
    useEffect(() => {
      load();
      return () => {
        const controller = pendingRequest.current && pendingRequest.current.controller;
        if (controller) controller.abort();
      };
    }, [load]);
    const summary = useMemo(() => {
      const byKey = Object.fromEntries((data?.summary || []).map(item => [item.key, item]));
      return ['active_users', 'registrations', 'deep_users', 'intensity', 'paying_users', 'logical_delivered'].map(key => byKey[key] || {
        key,
        current: null,
        previous: null,
        delta: null,
        delta_pct: null
      });
    }, [data]);
    const windows = data?.windows || {};
    const composition = data?.composition || {};
    const funnel = data?.value_funnel || {};
    const creation = data?.creation_funnel || {};
    const queues = data?.queues || {};
    const creationCoverage = creation.coverage || 'unavailable';
    const queueColumns = [{
      key: 'user',
      header: tr('用户', 'User'),
      priority: 'primary',
      sortValue: row => row.display_name,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, row.display_name), /*#__PURE__*/React.createElement("small", null, row.email_masked))
    }, {
      key: 'reason',
      header: tr('原因', 'Reason'),
      sortValue: row => row.reason_code,
      render: row => copyPair(QUEUE_REASON, row.reason_code)
    }, {
      key: 'active',
      header: tr('最近活跃', 'Last active'),
      numeric: true,
      sortValue: row => Date.parse(row.last_active_at || 0),
      render: row => stamp(row.last_active_at)
    }];
    const openProfile = row => {
      if (row && row.user_id && onOpenUser) onOpenUser(row.user_id);
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "act-dashboard"
    }, /*#__PURE__*/React.createElement("div", {
      className: "act-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, tr('用户活跃与增长', 'User activity & growth')), /*#__PURE__*/React.createElement("p", null, windows.current && windows.previous ? tr(`${windows.current.label} 对比 ${windows.previous.label}`, `${windows.current.label} vs ${windows.previous.label}`) : tr('比较两个完整窗口', 'Compare two complete windows'))), /*#__PURE__*/React.createElement("div", {
      className: "act-filters",
      "aria-label": tr('完整窗口', 'Complete window')
    }, /*#__PURE__*/React.createElement("div", null, [7, 30, 90].map(value => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: value,
      className: days === value ? 'on' : '',
      "aria-pressed": days === value,
      onClick: () => setDays(value)
    }, tr(`${value} 日`, `${value}d`)))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "act-refresh",
      onClick: load,
      disabled: loading
    }, loading ? '…' : tr('刷新', 'Refresh')))), error ? /*#__PURE__*/React.createElement("div", {
      className: "act-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("strong", null, tr('看板加载失败', 'Dashboard failed to load')), /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: load
    }, tr('重试', 'Retry'))) : null, !data && loading ? /*#__PURE__*/React.createElement(LoadingState, null) : null, data ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "act-kpis"
    }, summary.map(item => /*#__PURE__*/React.createElement(SummaryMetric, {
      key: item.key,
      item: item
    }))), /*#__PURE__*/React.createElement("div", {
      className: "act-grid"
    }, /*#__PURE__*/React.createElement("section", {
      className: "act-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, tr('注册 Cohort 价值漏斗', 'Registration cohort value funnel')), /*#__PURE__*/React.createElement("span", {
      className: funnel.engine_available === false ? 'is-warning' : ''
    }, funnel.engine_available === false ? tr('Engine 暂不可用', 'Engine unavailable') : tr('用户去重 · 同一作品', 'Deduped users · same book'))), /*#__PURE__*/React.createElement(FunnelChart, {
      stages: (funnel.stages || []).map(stage => ({
        key: stage.key,
        label: copyPair(FUNNEL_COPY, stage.key),
        value: stage.count
      })),
      ariaLabel: tr('注册 Cohort 价值漏斗', 'Registration cohort value funnel'),
      compact: true
    })), /*#__PURE__*/React.createElement("section", {
      className: "act-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, tr('当期活跃构成', 'Current active mix')), /*#__PURE__*/React.createElement("span", null, tr('新客 / 留存 / 回流', 'New / retained / returning'))), /*#__PURE__*/React.createElement(MetricBars, {
      items: [{
        key: 'new',
        label: tr('新客', 'New'),
        value: composition.new
      }, {
        key: 'retained',
        label: tr('留存', 'Retained'),
        value: composition.retained
      }, {
        key: 'returning',
        label: tr('回流', 'Returning'),
        value: composition.returning
      }],
      ariaLabel: tr('当期活跃构成', 'Current active mix'),
      tone: "gold"
    }))), /*#__PURE__*/React.createElement("section", {
      className: "act-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, tr('深度活跃用户与人均成文', 'Active deep users and intensity')), /*#__PURE__*/React.createElement("span", null, windows.current ? windows.current.label : '')), /*#__PURE__*/React.createElement(CartesianChart, {
      rows: data.depth_trend?.rows || [],
      xKey: "date",
      series: [{
        key: 'deep_users',
        label: tr('深度活跃用户', 'Active deep users'),
        tone: 'gold'
      }, {
        key: 'intensity',
        label: tr('人均成文', 'Chapters / deep user'),
        tone: 'slate',
        axis: 'right',
        format: value => intensity(value)
      }],
      ariaLabel: tr('深度活跃用户与人均成文', 'Active deep users and intensity'),
      empty: tr('当前完整窗口没有成文深度', 'No prose depth in this complete window')
    })), /*#__PURE__*/React.createElement("section", {
      className: "act-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, tr('创作意图到任务', 'Intent to task')), /*#__PURE__*/React.createElement("span", {
      className: creationCoverage === 'available' ? '' : 'is-warning'
    }, creationCoverage === 'available' ? tr('埋点可用', 'Tracking available') : creationCoverage === 'partial' ? tr('窗口内部分可用', 'Partial coverage') : tr('埋点暂不可用', 'Tracking unavailable'))), /*#__PURE__*/React.createElement(MetricBars, {
      items: (creation.stages || []).map(stage => ({
        key: stage.key,
        label: copyPair(CREATION_COPY, stage.key),
        value: stage.count
      })),
      ariaLabel: tr('创作意图到任务', 'Intent to task'),
      tone: "terra"
    })), /*#__PURE__*/React.createElement("div", {
      className: "act-queues"
    }, /*#__PURE__*/React.createElement("section", {
      className: "act-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, tr('创作被拦截', 'Blocked creators')), /*#__PURE__*/React.createElement("span", null, number((queues.blocked || []).length))), /*#__PURE__*/React.createElement(DataTable, {
      rows: queues.blocked || [],
      columns: queueColumns,
      rowKey: "user_id",
      ariaLabel: tr('创作被拦截', 'Blocked creators'),
      pageSize: 8,
      wrapClassName: "act-table-wrap",
      onRowActivate: openProfile,
      empty: creationCoverage === 'unavailable' ? tr('创作埋点尚未开始', 'Creation tracking has not started') : tr('当前窗口没有被拦截且未创建任务的用户', 'No blocked users without a submitted task')
    })), /*#__PURE__*/React.createElement("section", {
      className: "act-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, tr('深度用户流失', 'Lapsed deep users')), /*#__PURE__*/React.createElement("span", null, number((queues.lapsed_deep || []).length))), /*#__PURE__*/React.createElement(DataTable, {
      rows: queues.lapsed_deep || [],
      columns: queueColumns,
      rowKey: "user_id",
      ariaLabel: tr('深度用户流失', 'Lapsed deep users'),
      pageSize: 8,
      wrapClassName: "act-table-wrap",
      onRowActivate: openProfile,
      empty: tr('上期深度用户仍保持活跃', 'Previous deep users are still active')
    })), /*#__PURE__*/React.createElement("section", {
      className: "act-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, tr('新注册未活跃', 'New, not yet active')), /*#__PURE__*/React.createElement("span", null, number((queues.new_unactivated || []).length))), /*#__PURE__*/React.createElement(DataTable, {
      rows: queues.new_unactivated || [],
      columns: queueColumns,
      rowKey: "user_id",
      ariaLabel: tr('新注册未活跃', 'New, not yet active'),
      pageSize: 8,
      wrapClassName: "act-table-wrap",
      onRowActivate: openProfile,
      empty: tr('当期新注册均已活跃', 'New registrations in this window are already active')
    })))) : null);
  }
  window.AdminUserActivityTab = UserActivityTab;
})();
}
