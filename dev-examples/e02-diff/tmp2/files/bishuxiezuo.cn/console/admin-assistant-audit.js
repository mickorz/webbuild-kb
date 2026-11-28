{
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const DataTable = window.AdminDataTable;
  const STATE = {
    queued: ["排队中", "Queued"],
    running: ["执行中", "Running"],
    pending: ["等待确认", "Awaiting confirmation"],
    completed: ["完成", "Completed"],
    failed: ["失败", "Failed"],
    cancelled: ["已取消", "Cancelled"],
    rejected: ["已拒绝", "Rejected"]
  };
  const EVENT = {
    turn_started: ["开始执行", "Started"],
    first_token: ["开始回复", "First response"],
    tool_started: ["调用工具", "Tool started"],
    tool_finished: ["工具结束", "Tool finished"],
    model_usage: ["模型用量", "Model usage"],
    turn_finished: ["本次执行结束", "Execution finished"]
  };
  function AdminAssistantAuditPanel({
    query,
    lang,
    initialStatus = "",
    refreshToken
  }) {
    const en = lang === "en";
    const tr = (zh, english) => en ? english : zh;
    const unknown = tr("未知", "Unknown");
    const label = value => STATE[value] ? STATE[value][en ? 1 : 0] : unknown;
    const count = value => value == null ? unknown : Number(value).toLocaleString();
    const duration = value => value == null ? unknown : (Number(value) / 1000).toLocaleString(undefined, {
      maximumFractionDigits: 2
    }) + tr(" 秒", " s");
    const percent = value => value == null ? unknown : Number(value).toLocaleString(undefined, {
      maximumFractionDigits: 2
    }) + "%";
    const stamp = value => window.AssistantAnalysisCore.formatTimestamp(value, en) || unknown;
    const [offset, setOffset] = useState(0);
    const [turnStatus, setTurnStatus] = useState(initialStatus);
    const [revision, setRevision] = useState(0);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");
    const [selected, setSelected] = useState(null);
    const requests = useRef(0);
    const detailRequests = useRef(0);
    const opener = useRef(null);
    const queryKey = JSON.stringify([query.hours, query.days, query.userId, query.planCode, turnStatus]);
    const scope = queryKey + ":" + offset;
    const data = result && result.scope === scope ? result.data : null;
    useEffect(() => {
      setOffset(0);
    }, [queryKey]);
    useEffect(() => {
      setTurnStatus(initialStatus);
      setOffset(0);
    }, [initialStatus]);
    useEffect(() => {
      const current = ++requests.current;
      ++detailRequests.current;
      setSelected(null);
      setDetail(null);
      setDetailError("");
      setLoading(true);
      setError("");
      window.LF_API.adminAssistantAudit({
        ...query,
        turnStatus,
        offset,
        limit: 50
      }).then(value => {
        if (current === requests.current) setResult({
          scope,
          data: value
        });
      }).catch(() => {
        if (current === requests.current) setError(tr("审计数据暂时无法读取", "Audit data could not be loaded"));
      }).finally(() => {
        if (current === requests.current) setLoading(false);
      });
      return () => {
        ++requests.current;
        ++detailRequests.current;
      };
    }, [queryKey, offset, revision, lang, refreshToken]);
    const openDetail = (turn, flowOffset = 0, button = null) => {
      const current = ++detailRequests.current;
      if (button) opener.current = button;
      setSelected(turn.turn_id);
      setDetailLoading(true);
      setDetailError("");
      if (!flowOffset) setDetail(null);
      window.LF_API.adminAssistantAuditTurn(turn.turn_id, {
        offset: flowOffset,
        limit: 100
      }).then(value => {
        if (current !== detailRequests.current) return;
        setDetail(previous => flowOffset && previous && previous.turn.turn_id === value.turn.turn_id ? {
          ...value,
          events: previous.events.concat(value.events)
        } : value);
      }).catch(() => {
        if (current === detailRequests.current) setDetailError(tr("对话详情暂时无法读取", "Conversation could not be loaded"));
      }).finally(() => {
        if (current === detailRequests.current) setDetailLoading(false);
      });
    };
    const closeDetail = () => {
      ++detailRequests.current;
      setSelected(null);
      setDetail(null);
      setDetailError("");
      if (opener.current && opener.current.isConnected) opener.current.focus();
    };
    const metrics = data && data.summary;
    const toolColumns = [{
      key: "tool_name",
      header: tr("工具", "Tool"),
      value: row => row.tool_name
    }, ...[["calls", "调用", "Calls"], ["failed", "失败", "Failed"], ["cancelled", "取消", "Cancelled"], ["rejected", "拒绝", "Rejected"], ["running", "未结束", "Unfinished"]].map(([key, zh, english]) => ({
      key,
      header: tr(zh, english),
      numeric: true,
      render: row => count(row[key])
    })), {
      key: "error_rate_pct",
      header: tr("错误率", "Error rate"),
      numeric: true,
      render: row => percent(row.error_rate_pct)
    }, {
      key: "duration_samples",
      header: tr("耗时样本", "Timed calls"),
      numeric: true,
      render: row => count(row.duration_samples)
    }, {
      key: "p50_ms",
      header: "P50",
      numeric: true,
      render: row => duration(row.p50_ms)
    }, {
      key: "p95_ms",
      header: "P95",
      numeric: true,
      render: row => duration(row.p95_ms)
    }];
    const turnColumns = [{
      key: "started_at",
      header: tr("时间", "Time"),
      render: row => stamp(row.started_at)
    }, {
      key: "user_id",
      header: tr("用户", "User"),
      value: row => row.user_id
    }, {
      key: "status",
      header: tr("状态", "Status"),
      render: row => label(row.status)
    }, {
      key: "tool_calls",
      header: tr("工具调用", "Tool calls"),
      numeric: true,
      render: row => count(row.tool_calls)
    }, {
      key: "response_ms",
      header: tr("整轮耗时", "Turn duration"),
      numeric: true,
      render: row => duration(row.response_ms)
    }, {
      key: "view",
      header: tr("审计", "Audit"),
      render: row => /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        onClick: event => openDetail(row, 0, event.currentTarget)
      }, tr("查看对话", "View conversation"))
    }].map(column => ({
      ...column,
      sortable: false
    }));
    const notices = {
      disabled: tr("助手审计尚未启用", "Assistant audit is not enabled"),
      unavailable: tr("助手审计暂时不可用", "Assistant audit is unavailable"),
      stale: tr("采集尚未完成或已延迟，以下是已采集的记录", "Collection is incomplete or delayed; showing collected records"),
      partial: tr("仍有记录等待采集，当前统计尚不完整", "Some records await collection; totals are incomplete")
    };
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-audit-panel",
      "aria-label": tr("行为与审计", "Behavior and audit"),
      "aria-busy": loading
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-audit-toolbar"
    }, data && data.coverage ? /*#__PURE__*/React.createElement("span", null, tr("最近采集", "Last collection"), " ", stamp(data.coverage.last_success_at)) : /*#__PURE__*/React.createElement("span", null), refreshToken == null ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: loading,
      onClick: () => setRevision(value => value + 1)
    }, tr("刷新审计", "Refresh audit")) : null), loading && !data ? /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, tr("加载中…", "Loading…")) : null, error ? /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-usage-error"
    }, error) : null, data && notices[data.availability] ? /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "adm-usage-coverage"
    }, notices[data.availability]) : null, metrics ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-kpis"
    }, [["审计轮次", "Audited turns", count(metrics.turns)], ["使用人数", "Active users", count(metrics.active_users)], ["工具调用", "Tool calls", count(metrics.tool_calls)], ["工具错误率", "Tool error rate", percent(metrics.tool_error_rate_pct)], ["首字响应 P95", "First response P95", duration(metrics.first_token_p95_ms)], ["整轮耗时 P95", "Turn duration P95", duration(metrics.response_p95_ms)]].map(([zh, english, value]) => /*#__PURE__*/React.createElement("article", {
      className: "adm-usage-kpi",
      key: english
    }, /*#__PURE__*/React.createElement("span", null, tr(zh, english)), /*#__PURE__*/React.createElement("strong", null, value)))), /*#__PURE__*/React.createElement("details", {
      className: "adm-audit-method"
    }, /*#__PURE__*/React.createElement("summary", null, tr("统计口径与覆盖", "Definitions and coverage")), /*#__PURE__*/React.createElement("p", null, tr("工具错误率按失败 ÷（完成＋失败）计算，取消、拒绝与未结束调用另计。整轮耗时包含等待确认；执行耗时扣除两次执行之间的等待。首字响应只计正文文本，独白和思考不计入。", "Tool error rate is failed / (completed + failed). Cancelled, rejected and unfinished calls are separate. Turn duration includes confirmation waits; active duration excludes time between executions. First response counts text tokens, excluding monologues and reasoning.")), /*#__PURE__*/React.createElement("p", null, tr("首字时长样本", "First-response samples"), " ", count(metrics.first_token_samples), " / ", count(metrics.turns), " \xB7 ", tr("完整响应样本", "Response samples"), " ", count(metrics.response_samples), " / ", count(metrics.turns), " \xB7 ", tr("执行耗时样本", "Active-duration samples"), " ", count(metrics.active_samples), " / ", count(metrics.completed)), /*#__PURE__*/React.createElement("p", null, tr("首字响应 P50", "First response P50"), " ", duration(metrics.first_token_p50_ms), " \xB7 ", tr("整轮耗时 P50", "Turn duration P50"), " ", duration(metrics.response_p50_ms), " \xB7 ", tr("执行耗时 P50", "Active duration P50"), " ", duration(metrics.active_p50_ms), " \xB7 ", tr("执行耗时 P95", "Active duration P95"), " ", duration(metrics.active_p95_ms)), /*#__PURE__*/React.createElement("p", null, tr("采集起点", "Collection starts"), " ", stamp(data.coverage && data.coverage.collection_started_at), " \xB7 ", tr("待采集记录", "Awaiting collection"), " ", count(data.coverage && data.coverage.remaining_events))), /*#__PURE__*/React.createElement("section", {
      className: "adm-usage-section"
    }, /*#__PURE__*/React.createElement("h2", null, tr("工具表现", "Tool performance")), /*#__PURE__*/React.createElement(DataTable, {
      rows: data.tools,
      columns: toolColumns,
      rowKey: "tool_name",
      pageSize: 10,
      ariaLabel: tr("工具表现", "Tool performance"),
      empty: tr("这个窗口没有工具调用记录", "No collected tool calls in this window")
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-usage-section"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-section-head"
    }, /*#__PURE__*/React.createElement("h2", null, tr("对话记录", "Conversations")), /*#__PURE__*/React.createElement("label", {
      className: "adm-usage-status-filter"
    }, tr("状态", "Status"), /*#__PURE__*/React.createElement("select", {
      value: turnStatus,
      onChange: event => {
        setTurnStatus(event.target.value);
        setOffset(0);
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, tr("全部", "All")), Object.keys(STATE).map(value => /*#__PURE__*/React.createElement("option", {
      key: value,
      value: value
    }, label(value)))))), /*#__PURE__*/React.createElement(DataTable, {
      rows: data.turns,
      columns: turnColumns,
      rowKey: "turn_id",
      selectedRowKey: selected,
      pagination: {
        total: data.total,
        page: offset / 50 + 1,
        pageSize: 50,
        pages: Math.max(1, Math.ceil((data.total || 0) / 50)),
        onPageChange: page => setOffset((page - 1) * 50)
      },
      ariaLabel: tr("对话记录", "Conversations"),
      empty: tr("这个窗口没有符合条件的已采集对话", "No collected conversations match these filters")
    }))) : null, selected && window.AdminAssistantDrawer ? /*#__PURE__*/React.createElement(window.AdminAssistantDrawer, {
      title: tr("对话详情", "Conversation detail"),
      closeLabel: tr("关闭详情", "Close detail"),
      onClose: closeDetail,
      className: "adm-audit-detail"
    }, /*#__PURE__*/React.createElement("p", {
      className: "adm-audit-note"
    }, tr("包含用户原文；本次查看会留存审计记录。", "Contains user text. This access is audited.")), detailLoading ? /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, tr("读取中…", "Loading…")) : null, detailError ? /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-usage-error"
    }, detailError, " ", /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => openDetail({
        turn_id: selected
      })
    }, tr("重试", "Retry"))) : null, detail ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "adm-audit-toolbar"
    }, /*#__PURE__*/React.createElement("span", null, stamp(detail.turn.started_at)), /*#__PURE__*/React.createElement("span", null, label(detail.turn.status))), /*#__PURE__*/React.createElement("h3", null, tr("用户输入", "User input")), (detail.user_messages && detail.user_messages.length ? detail.user_messages : [{
      event_id: "initial",
      text: detail.user_text
    }]).map(item => /*#__PURE__*/React.createElement("div", {
      key: item.event_id
    }, detail.user_messages && detail.user_messages.length > 1 ? /*#__PURE__*/React.createElement("time", {
      dateTime: item.occurred_at
    }, stamp(item.occurred_at)) : null, /*#__PURE__*/React.createElement("pre", {
      className: "adm-audit-text"
    }, item.text == null ? unknown : item.text))), /*#__PURE__*/React.createElement("h3", null, tr("最终回复", "Final reply")), /*#__PURE__*/React.createElement("pre", {
      className: "adm-audit-text"
    }, detail.final_text == null ? tr("没有已确认的最终回复", "No confirmed final reply") : detail.final_text), /*#__PURE__*/React.createElement("h3", null, tr("调用流程", "Call flow")), /*#__PURE__*/React.createElement("ol", {
      className: "adm-audit-flow"
    }, detail.events.map(item => /*#__PURE__*/React.createElement("li", {
      key: item.event_id
    }, /*#__PURE__*/React.createElement("time", {
      dateTime: item.occurred_at
    }, stamp(item.occurred_at)), /*#__PURE__*/React.createElement("strong", null, EVENT[item.event_type] ? EVENT[item.event_type][en ? 1 : 0] : unknown), item.tool_name || item.model ? /*#__PURE__*/React.createElement("span", null, item.tool_name || item.model) : null, item.status ? /*#__PURE__*/React.createElement("span", null, label(item.status)) : null, item.error_code ? /*#__PURE__*/React.createElement("code", null, item.error_code) : null))), detail.has_more ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: detailLoading,
      onClick: () => openDetail(detail.turn, detail.offset + detail.limit)
    }, tr("加载后续流程", "Load more events")) : null) : null) : null);
  }
  window.AdminAssistantAuditPanel = AdminAssistantAuditPanel;
})();
}
