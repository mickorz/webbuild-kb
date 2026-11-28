{
/* Decision metrics and task entry points for assistant analysis. */
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  function AdminAssistantOverview({
    data,
    query,
    lang,
    refreshToken,
    onNavigate,
    tools,
    operationColumns,
    pressure,
    pressureIsComplete
  }) {
    const en = lang === "en",
      tr = (zh, english) => en ? english : zh;
    const Core = window.AssistantAnalysisCore;
    const Table = window.AdminDataTable,
      Chart = window.AdminCartesianChart;
    const [auditResult, setAuditResult] = useState(null);
    const [trendMetric, setTrendMetric] = useState("turns");
    const seq = useRef(0);
    const key = JSON.stringify([query.hours, query.days, query.userId, query.planCode, lang, refreshToken]);
    useEffect(() => {
      const request = ++seq.current;
      if (!window.LF_API.adminAssistantAudit) return undefined;
      window.LF_API.adminAssistantAudit({
        ...query,
        offset: 0,
        limit: 1
      }).then(value => {
        if (request === seq.current) setAuditResult({
          key,
          data: value
        });
      }).catch(() => {
        if (request === seq.current) setAuditResult({
          key,
          data: null
        });
      });
      return () => {
        ++seq.current;
      };
    }, [key]);
    const audit = auditResult && auditResult.key === key ? auditResult.data : null;
    const summary = data && data.summary || {};
    const int = value => {
      const state = Core.integerState(value);
      return state.kind === "unknown" ? tr("未知", "Unknown") : state.value.toLocaleString();
    };
    const decimal = value => {
      const state = Core.decimalState(value);
      return state.kind === "unknown" ? tr("未知", "Unknown") : state.text;
    };
    const cost = Core.knownCostTotal(summary);
    const compactCost = cost == null ? tr("未知", "Unknown") : "¥ " + (Number(cost) >= .01 ? Number(cost).toLocaleString(en ? "en-US" : "zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) : cost);
    const metrics = [["users", tr("活跃用户", "Active users"), int(summary.active_users), tr("会话", "Sessions") + " " + int(summary.sessions)], ["audit", tr("对话轮次", "Conversation turns"), int(summary.turns), tr("模型调用", "Model calls") + " " + int(summary.model_calls)], ["cost", tr("已核实费用", "Verified cost"), compactCost, tr("总费用", "Total cost") + " " + decimal(Core.totalCost(summary))], ["failed", tr("失败轮次", "Failed turns"), int(summary.failed_turns), tr("保护触发", "Protection stops") + " " + int(summary.protection_hits)]];
    const failures = Core.integerState(summary.failed_turns),
      missing = Core.integerState(summary.cost_missing_calls);
    const auditTools = audit && Array.isArray(audit.tools) ? audit.tools : [];
    const auditColumns = [{
      key: "tool_name",
      header: tr("工具", "Tool"),
      priority: "primary"
    }, {
      key: "calls",
      header: tr("调用", "Calls"),
      numeric: true,
      render: row => int(row.calls)
    }, {
      key: "failed",
      header: tr("失败", "Failed"),
      numeric: true,
      render: row => int(row.failed)
    }, {
      key: "error_rate_pct",
      header: tr("错误率", "Error rate"),
      description: tr("失败 ÷（完成＋失败），不含取消、拒绝与未结束调用。", "Failed / (completed + failed), excluding cancelled, rejected and unfinished calls."),
      numeric: true,
      render: row => row.error_rate_pct == null ? tr("未知", "Unknown") : Number(row.error_rate_pct).toLocaleString(undefined, {
        maximumFractionDigits: 2
      }) + "%"
    }, {
      key: "p95_ms",
      header: tr("P95 耗时", "P95 duration"),
      description: tr("95% 的已采集耗时样本不超过此值。", "95% of collected duration samples are at or below this value."),
      numeric: true,
      render: row => row.p95_ms == null ? tr("未知", "Unknown") : (Number(row.p95_ms) / 1000).toLocaleString(undefined, {
        maximumFractionDigits: 2
      }) + tr(" 秒", " s")
    }];
    if (!data) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-overview"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-metrics"
    }, metrics.map(([target, label, value, note]) => /*#__PURE__*/React.createElement("button", {
      key: target,
      type: "button",
      onClick: () => onNavigate(target === "failed" ? "audit" : target, target === "failed" ? "failed" : ""),
      className: target === "failed" && failures.kind === "known" ? "is-attention" : ""
    }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("strong", null, value), /*#__PURE__*/React.createElement("small", null, note)))), failures.kind === "known" || missing.kind === "known" ? /*#__PURE__*/React.createElement("section", {
      className: "adm-assistant-attention"
    }, /*#__PURE__*/React.createElement("h2", null, tr("需要关注", "Needs attention")), failures.kind === "known" ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, tr(failures.value + " 轮失败", failures.value + " failed turns")), /*#__PURE__*/React.createElement("small", null, tr("查看对话与调用流程", "Review conversations and call flow"))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => onNavigate("audit", "failed")
    }, tr("查看失败", "Review failures"))) : null, missing.kind === "known" ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, tr(missing.value + " 次模型调用缺少费用", missing.value + " model calls missing cost")), /*#__PURE__*/React.createElement("small", null, tr("已核实模型费用", "Verified model cost"), " \xA5 ", decimal(summary.known_cost_rmb))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => onNavigate("cost", "missing")
    }, tr("核对费用", "Review costs"))) : null) : null, Core.integerState(summary.turns).kind === "zero" ? /*#__PURE__*/React.createElement("p", {
      className: "adm-audit-note",
      role: "status"
    }, tr("这个窗口没有对话记录。", "No conversations in this window.")) : null, /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-overview-grid"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-assistant-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, tr("使用趋势", "Usage trend")), /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-days"
    }, [["turns", "轮次", "Turns"], ["model_calls", "模型调用", "Model calls"]].map(([value, zh, english]) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: value,
      "aria-pressed": trendMetric === value,
      className: trendMetric === value ? "on" : "",
      onClick: () => setTrendMetric(value)
    }, tr(zh, english))))), /*#__PURE__*/React.createElement(Chart, {
      rows: Core.trendRows(data && data.trend),
      xKey: "date",
      height: 154,
      compact: true,
      ariaLabel: tr("用量趋势", "Usage trend"),
      empty: tr("这个窗口没有趋势", "No trend in this window"),
      series: [{
        key: trendMetric,
        label: trendMetric === "turns" ? tr("轮次", "Turns") : tr("模型调用", "Model calls"),
        tone: "gold"
      }]
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-assistant-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, tr("费用构成", "Cost breakdown")), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => onNavigate("cost")
    }, tr("查看明细", "View details"))), /*#__PURE__*/React.createElement("dl", {
      className: "adm-assistant-facts"
    }, /*#__PURE__*/React.createElement("dt", null, tr("已核实模型费用", "Verified model cost")), /*#__PURE__*/React.createElement("dd", null, "\xA5 ", decimal(summary.known_cost_rmb)), /*#__PURE__*/React.createElement("dt", null, tr("已核实后台记忆费用", "Verified memory cost")), /*#__PURE__*/React.createElement("dd", null, "\xA5 ", decimal(summary.known_background_cost_rmb)), /*#__PURE__*/React.createElement("dt", {
      className: "is-total"
    }, tr("已核实合计", "Verified subtotal")), /*#__PURE__*/React.createElement("dd", {
      className: "is-total"
    }, "\xA5 ", decimal(cost)), /*#__PURE__*/React.createElement("dt", null, tr("已扣笔力", "Charged credits")), /*#__PURE__*/React.createElement("dd", null, decimal(summary.charged_credits)), /*#__PURE__*/React.createElement("dt", null, tr("待扣笔力", "Unfunded credits")), /*#__PURE__*/React.createElement("dd", null, decimal(summary.unfunded_credits))))), /*#__PURE__*/React.createElement("section", {
      className: "adm-assistant-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, audit && audit.summary ? tr("工具表现", "Tool performance") : tr("工具与读取", "Tools and reads")), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => onNavigate(audit && audit.summary ? "audit" : "cost")
    }, tr("查看全部", "View all"))), audit && ["stale", "partial"].includes(audit.availability) ? /*#__PURE__*/React.createElement("p", {
      className: "adm-audit-note"
    }, tr("审计采集不完整，工具表现仅包含已采集记录。", "Audit collection is incomplete; tool metrics cover collected records only.")) : null, /*#__PURE__*/React.createElement(Table, {
      rows: (audit && audit.summary ? auditTools : tools).slice(0, 3),
      columns: audit && audit.summary ? auditColumns : operationColumns,
      rowKey: audit && audit.summary ? "tool_name" : "key",
      compact: true,
      ariaLabel: audit && audit.summary ? tr("工具表现摘要", "Tool performance summary") : tr("工具与读取", "Tools and reads"),
      empty: tr("这个窗口没有工具记录", "No tool records in this window")
    })), /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-resources"
    }, /*#__PURE__*/React.createElement("span", null, pressureIsComplete ? tr("资源与配额", "Resources and quotas") : tr("已加载用户的配额", "Loaded-user quotas")), /*#__PURE__*/React.createElement("span", null, tr("记忆告警", "Memory alerts"), " ", int(pressure.memory.near)), /*#__PURE__*/React.createElement("span", null, tr("空间告警", "Storage alerts"), " ", int(pressure.storage.near)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => onNavigate("users")
    }, tr("查看用户", "View users"))));
  }
  window.AdminAssistantOverview = AdminAssistantOverview;
})();
}
