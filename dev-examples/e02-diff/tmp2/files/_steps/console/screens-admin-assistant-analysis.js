{
/* Admin assistant usage, cost, quota, and abuse workbench. */
(function () {
  const Core = window.AssistantAnalysisCore;
  const DataTable = window.AdminDataTable;
  const CartesianChart = window.AdminCartesianChart;
  const MetricBars = window.AdminMetricBars;
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const PLANS = [["free", "免费", "Free"], ["basic", "基础", "Basic"], ["standard", "标准", "Standard"], ["pro", "专业", "Pro"]];
  const SUMMARY = [["activity", "active_users", "活跃用户", "Active users", "integer"], ["activity", "sessions", "会话", "Sessions", "integer"], ["activity", "turns", "轮次", "Turns", "integer"], ["activity", "failed_turns", "失败轮次", "Failed turns", "integer"], ["activity", "protection_hits", "保护触发", "Protection stops", "integer"], ["model", "model_calls", "模型调用", "Model calls", "integer"], ["model", "input_tokens", "输入 Token", "Input tokens", "integer"], ["model", "output_tokens", "输出 Token", "Output tokens", "integer"], ["model", "cached_tokens", "缓存 Token", "Cached tokens", "integer"], ["model", "cost_rmb", "模型费用（元）", "Model cost (CNY)", "decimal"], ["model", "known_cost_rmb", "已核实模型费用（元）", "Known model cost (CNY)", "decimal"], ["model", "charged_credits", "已扣笔力", "Charged credits", "decimal"], ["model", "unfunded_credits", "待扣笔力", "Unfunded credits", "decimal"], ["model", "cost_known_calls", "已有费用的调用", "Calls with cost", "integer"], ["model", "cost_missing_calls", "缺少费用的调用", "Calls missing cost", "integer"], ["memory", "background_cost_rmb", "后台记忆费用（元）", "Background memory cost (CNY)", "decimal"], ["memory", "known_background_cost_rmb", "已核实记忆费用（元）", "Known memory cost (CNY)", "decimal"], ["transfer", "uploads", "上传", "Uploads", "integer"], ["transfer", "download_requests", "内容读取", "Content reads", "integer"], ["transfer", "download_bytes", "读取字节", "Read bytes", "integer"], ["transfer", "origin_bytes", "源站字节", "Origin bytes", "integer"], ["transfer", "blocked_requests", "拦截请求", "Blocked requests", "integer"]];
  const GROUPS = [["activity", "对话", "Conversation"], ["model", "模型与费用", "Models and cost"], ["memory", "后台记忆", "Background memory"], ["transfer", "传输与拦截", "Transfer and blocks"]];
  const COVERAGE = {
    coverage_unknown: ["覆盖范围未知", "Coverage is unknown"],
    collection_unknown: ["采集起点未知", "Collection start is unknown"],
    legacy_unknown: ["采集前的轮次数量未知", "Turns before collection are unknown"],
    legacy_turns: ["有些轮次发生在采集开始之前", "Some turns predate collection"],
    cost_unavailable: ["模型费用来源未覆盖", "Model cost source is not covered"],
    memory_cost_unavailable: ["后台记忆费用来源未覆盖", "Background memory cost is not covered"],
    origin_unavailable: ["源站字节来源未覆盖", "Origin byte source is not covered"],
    origin_no_observations: ["窗口内无源站读取记录，字节数未知", "No origin reads recorded in this window; byte count is unknown"]
  };
  function AdminAssistantAnalysisTab({
    toast,
    lang
  }) {
    const en = lang === "en";
    const tr = (zh, text) => en ? text : zh;
    const [hours, setHours] = useState(168);
    const [view, setView] = useState("overview");
    const [auditStatus, setAuditStatus] = useState("");
    const [refreshToken, setRefreshToken] = useState(0);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [costMissingOnly, setCostMissingOnly] = useState(false);
    const [userDraft, setUserDraft] = useState("");
    const [planDraft, setPlanDraft] = useState("");
    const [applied, setApplied] = useState({
      hours: 168,
      userId: "",
      planCode: ""
    });
    const [data, setData] = useState(null);
    const [settings, setSettings] = useState(null);
    const [draft, setDraft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [settingsError, setSettingsError] = useState("");
    const [unblockUser, setUnblockUser] = useState("");
    const [reason, setReason] = useState("");
    const [unblocking, setUnblocking] = useState(false);
    const [unblockError, setUnblockError] = useState("");
    const analysisSeq = useRef(0);
    const settingsSeq = useRef(0);
    const loadAnalysis = query => {
      if (!Core || !window.LF_API) return Promise.resolve();
      const current = ++analysisSeq.current;
      setLoading(true);
      setError("");
      return window.LF_API.adminAssistantAnalysis(query).then(value => {
        if (current === analysisSeq.current) setData(value || {});
      }).catch(loadError => {
        if (current === analysisSeq.current) setError(loadError.message || tr("用量暂时无法读取", "Usage could not be loaded"));
      }).finally(() => {
        if (current === analysisSeq.current) setLoading(false);
      });
    };
    const loadSettings = () => {
      if (!Core || !window.LF_API) return Promise.resolve();
      const current = ++settingsSeq.current;
      setSettingsLoading(true);
      setSettingsError("");
      return window.LF_API.adminAssistantAnalysisSettings().then(value => {
        if (current !== settingsSeq.current) return;
        setSettings(value || {});
        setDraft(Core.draftFromSettings(value || {}));
      }).catch(loadError => {
        if (current === settingsSeq.current) setSettingsError(loadError.message || tr("限额暂时无法读取", "Limits could not be loaded"));
      }).finally(() => {
        if (current === settingsSeq.current) setSettingsLoading(false);
      });
    };
    useEffect(() => {
      loadAnalysis(applied);
      return () => {
        ++analysisSeq.current;
      };
    }, [applied, lang]);
    useEffect(() => {
      loadSettings();
      return () => {
        ++settingsSeq.current;
      };
    }, [lang]);
    if (!Core || !DataTable || !CartesianChart || !MetricBars) {
      return /*#__PURE__*/React.createElement("section", {
        className: "adm-card",
        role: "alert"
      }, tr("用量页暂时无法打开", "The usage page cannot be opened"));
    }
    const summary = data && data.summary || {};
    const users = Array.isArray(data && data.users) ? data.users : [];
    const events = Array.isArray(data && data.events) ? data.events : [];
    const models = Array.isArray(data && data.models) ? data.models : [];
    const trend = data ? Core.trendRows(data.trend) : [];
    const costTrend = trend.some(row => row.cost_rmb != null) ? trend : [];
    const coverage = data ? Core.coverageItems(data.coverage) : [];
    const limits = data ? Core.truncation(data) : {
      events: false,
      users: false
    };
    const pressure = data && data.quota_pressure || Core.limitPressure(users);
    const plans = data && data.plan_distribution || Core.planDistribution(users);
    const operations = Array.isArray(data && data.operations) ? data.operations : null;
    const tools = operations ? operations.filter(row => row.category === "tool" || row.category === "workspace") : Core.toolRows(events);
    const memoryOperations = operations ? operations.filter(row => row.category === "memory") : Core.memoryRows(events);
    const capacityPoints = data && data.capacity_trend && data.capacity_trend.points || [];
    const outcome = settings && draft ? Core.settingsPatch(settings, draft) : null;
    const windowText = Core.windowLabel(data && data.window, en);
    const applyQuery = query => {
      setData(null);
      setApplied(query);
      setAuditStatus("");
    };
    const navigate = (next, filter) => {
      setView(next);
      setAuditStatus(next === "audit" ? filter || "" : "");
      setCostMissingOnly(next === "cost" && filter === "missing");
    };
    const resetFilters = () => {
      setUserDraft("");
      setPlanDraft("");
      applyQuery({
        hours,
        userId: "",
        planCode: ""
      });
    };
    const openUserAudit = userId => {
      setUserDraft(userId);
      setPlanDraft("");
      applyQuery({
        hours,
        userId,
        planCode: ""
      });
      navigate("audit");
    };
    const showInteger = state => state.kind === "unknown" ? tr("未知", "Unknown") : state.value.toLocaleString();
    const showDecimal = state => state.kind === "unknown" ? tr("未知", "Unknown") : state.text;
    const showCell = (state, decimal) => state.kind === "unknown" ? /*#__PURE__*/React.createElement("em", {
      className: "is-unknown"
    }, tr("未知", "Unknown")) : state.kind === "zero" ? /*#__PURE__*/React.createElement("span", {
      className: "is-zero"
    }, "0") : decimal ? state.text : state.value.toLocaleString();
    const fieldError = code => code === "order" ? tr("限制值需要高于告警值", "The block value has to be higher than the alert") : code ? tr("请填写大于 0 的数", "Enter a number greater than 0") : "";
    const setPlanField = (plan, key, value) => setDraft(current => ({
      ...current,
      allowances: {
        ...current.allowances,
        [plan]: {
          ...current.allowances[plan],
          [key]: value
        }
      }
    }));
    const saveSettings = async () => {
      if (!outcome || !outcome.ok || !outcome.dirty || saving) return;
      const current = settingsSeq.current;
      setSaving(true);
      setSettingsError("");
      try {
        const value = await window.LF_API.updateAdminAssistantAnalysisSettings(outcome.patch);
        if (current === settingsSeq.current) {
          setSettings(value || {});
          setDraft(Core.draftFromSettings(value || {}));
          if (toast) toast(tr("限额已保存", "Limits saved"));
        }
      } catch (saveError) {
        const kind = Core.classifyError(saveError);
        setSettingsError(kind === "conflict" ? tr("限额刚被更新。草稿还在，请重新读取后再保存。", "These limits changed elsewhere. The draft is kept. Reload before saving again.") : kind === "forbidden" ? tr("没有修改限额的权限", "You cannot change these limits") : tr("限额暂时无法保存", "Limits could not be saved"));
      } finally {
        setSaving(false);
      }
    };
    const submitUnblock = async event => {
      event.preventDefault();
      const note = reason.trim();
      if (!unblockUser || !note || unblocking) return;
      setUnblocking(true);
      setUnblockError("");
      try {
        await window.LF_API.adminAssistantAnalysisUnblock(unblockUser, {
          reason: note
        });
        setReason("");
        setUnblockUser("");
        if (toast) toast(tr("已解除临时限制", "Temporary limit cleared"));
        await loadAnalysis(applied);
      } catch (unblockFailure) {
        setUnblockError(unblockFailure.message || tr("暂时无法解除限制", "The limit could not be cleared"));
      } finally {
        setUnblocking(false);
      }
    };
    const modelColumns = [{
      key: "model",
      header: tr("模型", "Model"),
      value: row => row.model || tr("未知", "Unknown")
    }, {
      key: "calls",
      header: tr("调用", "Calls"),
      numeric: true,
      sortValue: row => Core.integerState(row.calls).value,
      render: row => showCell(Core.integerState(row.calls))
    }, {
      key: "input_tokens",
      header: tr("输入", "Input"),
      numeric: true,
      sortValue: row => Core.integerState(row.input_tokens).value,
      render: row => showCell(Core.integerState(row.input_tokens))
    }, {
      key: "output_tokens",
      header: tr("输出", "Output"),
      numeric: true,
      sortValue: row => Core.integerState(row.output_tokens).value,
      render: row => showCell(Core.integerState(row.output_tokens))
    }, {
      key: "cached_tokens",
      header: tr("缓存", "Cached"),
      numeric: true,
      sortValue: row => Core.integerState(row.cached_tokens).value,
      render: row => showCell(Core.integerState(row.cached_tokens))
    }, {
      key: "cost_rmb",
      header: tr("费用（元）", "Cost (CNY)"),
      numeric: true,
      sortValue: row => {
        const state = Core.decimalState(row.cost_rmb);
        return state.kind === "unknown" ? null : Number(state.text);
      },
      render: row => showCell(Core.decimalState(row.cost_rmb), true)
    }, {
      key: "known_cost_calls",
      header: tr("已有费用", "Cost known"),
      numeric: true,
      sortValue: row => Core.integerState(row.known_cost_calls).value,
      render: row => showCell(Core.integerState(row.known_cost_calls))
    }];
    const operationColumns = [{
      key: "operation",
      header: tr("操作", "Operation"),
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, row.operation), /*#__PURE__*/React.createElement("small", null, row.category))
    }, {
      key: "calls",
      header: tr("次数", "Count"),
      numeric: true,
      sortValue: row => row.calls,
      render: row => row.calls.toLocaleString()
    }, {
      key: "tokens",
      header: tr("Token", "Tokens"),
      numeric: true,
      render: row => row.input_tokens == null || row.output_tokens == null ? tr("未知", "Unknown") : (row.input_tokens + row.output_tokens).toLocaleString()
    }, {
      key: "bytes",
      header: tr("字节", "Bytes"),
      numeric: true,
      sortValue: row => row.bytes,
      render: row => showCell(Core.integerState(row.bytes))
    }, {
      key: "cost",
      header: tr("已知费用（元）", "Known cost (CNY)"),
      render: row => row.cost_known ? row.known_cost : tr("未知", "Unknown")
    }, {
      key: "missing_cost",
      header: tr("缺少费用", "Missing cost"),
      numeric: true,
      sortValue: row => row.missing_cost,
      render: row => row.missing_cost.toLocaleString()
    }];
    const userColumns = [{
      key: "user_id",
      header: tr("用户", "User"),
      value: row => row.user_id
    }, {
      key: "plan_code",
      header: tr("方案", "Plan"),
      render: row => (PLANS.find(item => item[0] === row.plan_code) || [null, tr("未知", "Unknown"), "Unknown"])[en ? 2 : 1]
    }, {
      key: "turns",
      header: tr("轮次", "Turns"),
      numeric: true,
      sortValue: row => Core.integerState(row.turns).value,
      render: row => showCell(Core.integerState(row.turns))
    }, {
      key: "memory",
      header: tr("记忆", "Memory"),
      render: row => quotaCell(row.memory_used, row.memory_limit)
    }, {
      key: "storage",
      header: tr("空间", "Storage"),
      render: row => quotaCell(row.storage_used_bytes, row.storage_limit_bytes, true)
    }, {
      key: "download_bytes",
      header: tr("读取字节", "Read bytes"),
      numeric: true,
      sortValue: row => Core.integerState(row.download_bytes).value,
      render: row => showCell(Core.integerState(row.download_bytes))
    }, {
      key: "origin_bytes",
      header: tr("源站", "Origin"),
      numeric: true,
      sortValue: row => Core.integerState(row.origin_bytes).value,
      render: row => showCell(Core.integerState(row.origin_bytes))
    }, {
      key: "blocked_requests",
      header: tr("拦截", "Blocked"),
      numeric: true,
      sortValue: row => Core.integerState(row.blocked_requests).value,
      render: row => showCell(Core.integerState(row.blocked_requests))
    }, {
      key: "flags",
      header: tr("标记", "Flags"),
      render: row => (Array.isArray(row.flags) ? row.flags : []).map(flag => Core.flagLabel(flag, en)).join(" · ")
    }, {
      key: "actions",
      header: tr("操作", "Actions"),
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("div", {
        className: "adm-usage-row-actions"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        onClick: () => openUserAudit(String(row.user_id || ""))
      }, tr("查看对话", "View conversations")), Core.userBlocked(row) ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        onClick: () => {
          setReason("");
          setUnblockError("");
          setUnblockUser(String(row.user_id || ""));
        }
      }, tr("解除限制", "Clear limit")) : null)
    }];
    const eventColumns = [{
      key: "created_at",
      header: tr("时间", "Time"),
      sortValue: row => Date.parse(row.created_at || "") || 0,
      render: row => stamp(row.created_at, tr, en)
    }, {
      key: "id",
      header: tr("事件", "Event"),
      value: row => row.id
    }, {
      key: "user_id",
      header: tr("用户", "User"),
      value: row => row.user_id
    }, {
      key: "category",
      header: tr("类别", "Category"),
      value: row => row.category
    }, {
      key: "operation",
      header: tr("操作", "Operation"),
      value: row => row.operation
    }, {
      key: "status",
      header: tr("状态", "Status"),
      value: row => row.status
    }, {
      key: "model",
      header: tr("模型", "Model"),
      value: row => row.model
    }, {
      key: "tokens",
      header: tr("Token", "Tokens"),
      render: row => tokenPair(row, tr)
    }, {
      key: "cost_rmb",
      header: tr("费用（元）", "Cost (CNY)"),
      render: row => showCell(Core.decimalState(row.cost_rmb), true)
    }, {
      key: "bytes",
      header: tr("字节", "Bytes"),
      render: row => showCell(Core.integerState((row.flags || []).includes("bytes_unknown") ? null : row.bytes))
    }, {
      key: "flags",
      header: tr("标记", "Flags"),
      render: row => (Array.isArray(row.flags) ? row.flags : []).map(flag => Core.flagLabel(flag, en)).join(" · ")
    }];
    function quotaCell(used, limit, bytes) {
      const usedState = Core.integerState(used);
      const limitState = Core.integerState(limit);
      const usedText = usedState.kind === "unknown" ? tr("未知", "Unknown") : bytes && Core.humanBytes(usedState.value) || usedState.value.toLocaleString();
      const limitText = limitState.kind === "unknown" ? tr("未知", "Unknown") : bytes && Core.humanBytes(limitState.value) || limitState.value.toLocaleString();
      return usedText + " / " + limitText;
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-usage-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, tr("助手分析", "Assistant analysis")), windowText ? /*#__PURE__*/React.createElement("p", null, windowText, " \xB7 ", tr("北京时间", "UTC+8")) : null), /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-head-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => setSettingsOpen(true)
    }, tr("配额与限额", "Quotas and limits")), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: loading && view !== "audit",
      onClick: () => {
        if (view !== "audit") loadAnalysis(applied);
        setRefreshToken(value => value + 1);
      }
    }, tr("刷新", "Refresh")))), /*#__PURE__*/React.createElement("form", {
      className: "adm-usage-filters",
      onSubmit: event => {
        event.preventDefault();
        applyQuery({
          hours,
          userId: userDraft.trim(),
          planCode: planDraft
        });
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-analysis-segment adm-usage-time-range",
      role: "group",
      "aria-label": tr("时间范围", "Time range")
    }, Core.HOURS.map(value => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: value,
      className: hours === value ? "on" : "",
      "aria-pressed": hours === value,
      onClick: () => {
        setHours(value);
        applyQuery({
          ...applied,
          hours: value
        });
      }
    }, value >= 24 ? tr(value / 24 + " 天", value / 24 + "d") : tr(value + " 小时", value + "h")))), /*#__PURE__*/React.createElement("label", null, tr("用户", "User"), /*#__PURE__*/React.createElement("input", {
      value: userDraft,
      placeholder: tr("用户编号", "User ID"),
      autoComplete: "off",
      onChange: event => setUserDraft(event.target.value)
    })), /*#__PURE__*/React.createElement("label", null, tr("方案", "Plan"), /*#__PURE__*/React.createElement("select", {
      value: planDraft,
      onChange: event => setPlanDraft(event.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, tr("全部方案", "All plans")), PLANS.map(item => /*#__PURE__*/React.createElement("option", {
      key: item[0],
      value: item[0]
    }, en ? item[2] : item[1])))), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn sm"
    }, tr("筛选", "Filter")), applied.userId || applied.planCode ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: resetFilters
    }, tr("清除", "Clear")) : null), /*#__PURE__*/React.createElement("nav", {
      className: "adm-usage-tabs",
      role: "tablist",
      "aria-label": tr("分析内容", "Analysis view")
    }, [["overview", "总览", "Overview"], ["cost", "费用与调用", "Costs and calls"], ["users", "用户与配额", "Users and quotas"], ["audit", "行为与审计", "Behavior and audit"]].map(([key, zh, english]) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: key,
      id: "assistant-analysis-tab-" + key,
      role: "tab",
      "aria-selected": view === key,
      "aria-controls": "assistant-analysis-view-" + key,
      onClick: () => navigate(key)
    }, tr(zh, english)))), /*#__PURE__*/React.createElement("div", {
      id: "assistant-analysis-view-" + view,
      role: "tabpanel",
      "aria-labelledby": "assistant-analysis-tab-" + view,
      className: "adm-usage-content",
      "aria-busy": view !== "audit" && loading
    }, view === "audit" ? window.AdminAssistantAuditPanel ? /*#__PURE__*/React.createElement(window.AdminAssistantAuditPanel, {
      query: applied,
      lang: lang,
      initialStatus: auditStatus,
      refreshToken: refreshToken
    }) : /*#__PURE__*/React.createElement("p", {
      role: "alert"
    }, tr("审计页暂时无法打开", "Audit view cannot be opened")) : /*#__PURE__*/React.createElement(React.Fragment, null, error ? /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-error",
      role: "alert"
    }, error, " ", /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => loadAnalysis(applied)
    }, tr("重新读取", "Retry"))) : null, loading && !data ? /*#__PURE__*/React.createElement("p", {
      className: "adm-usage-loading",
      role: "status"
    }, tr("加载中…", "Loading…")) : null, coverage.length ? /*#__PURE__*/React.createElement("details", {
      className: "adm-usage-coverage-detail"
    }, /*#__PURE__*/React.createElement("summary", null, /*#__PURE__*/React.createElement("span", null, tr("统计覆盖不完整", "Incomplete coverage")), /*#__PURE__*/React.createElement("span", null, tr("查看覆盖", "View coverage"))), /*#__PURE__*/React.createElement("ul", {
      className: "adm-usage-coverage",
      "aria-label": tr("覆盖范围", "Coverage")
    }, coverage.map(item => /*#__PURE__*/React.createElement("li", {
      key: item
    }, tr(COVERAGE[item][0], COVERAGE[item][1]))))) : null, view === "overview" && window.AdminAssistantOverview ? /*#__PURE__*/React.createElement(window.AdminAssistantOverview, {
      data: data,
      query: applied,
      lang: lang,
      refreshToken: refreshToken,
      onNavigate: navigate,
      tools: tools,
      operationColumns: operationColumns,
      pressure: pressure,
      pressureIsComplete: !!(data && data.quota_pressure)
    }) : null, data && view === "cost" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-cost-facts"
    }, /*#__PURE__*/React.createElement("dl", {
      className: "adm-assistant-facts"
    }, /*#__PURE__*/React.createElement("dt", null, tr("已核实合计（元）", "Verified subtotal (CNY)")), /*#__PURE__*/React.createElement("dd", null, showDecimal(Core.decimalState(Core.knownCostTotal(summary)))), /*#__PURE__*/React.createElement("dt", null, tr("总费用（元）", "Total cost (CNY)")), /*#__PURE__*/React.createElement("dd", null, showDecimal(Core.decimalState(Core.totalCost(summary)))), /*#__PURE__*/React.createElement("dt", null, tr("已有费用的模型调用", "Model calls with cost")), /*#__PURE__*/React.createElement("dd", null, showInteger(Core.integerState(summary.cost_known_calls)), " / ", showInteger(Core.integerState(summary.model_calls))))), Core.totalCost(summary) == null ? /*#__PURE__*/React.createElement("p", {
      className: "adm-usage-cost-note"
    }, tr("费用尚未完整，已核实合计仅包含已有费用记录。", "Cost coverage is incomplete; the verified subtotal includes confirmed records only.")) : null, /*#__PURE__*/React.createElement("details", {
      className: "adm-usage-metric-detail"
    }, /*#__PURE__*/React.createElement("summary", null, tr("完整用量指标", "All usage metrics")), GROUPS.map(group => /*#__PURE__*/React.createElement("section", {
      className: "adm-usage-section",
      key: group[0]
    }, /*#__PURE__*/React.createElement("h2", null, tr(group[1], group[2])), /*#__PURE__*/React.createElement("dl", {
      className: "adm-assistant-facts"
    }, SUMMARY.filter(item => item[0] === group[0]).map(item => /*#__PURE__*/React.createElement(React.Fragment, {
      key: item[1]
    }, /*#__PURE__*/React.createElement("dt", null, tr(item[2], item[3])), /*#__PURE__*/React.createElement("dd", null, item[4] === "decimal" ? showDecimal(Core.decimalState(summary[item[1]])) : showInteger(Core.integerState(summary[item[1]]))))))))), /*#__PURE__*/React.createElement("section", {
      className: "adm-usage-section"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-section-head"
    }, /*#__PURE__*/React.createElement("h2", null, tr("模型", "Models")), /*#__PURE__*/React.createElement("label", {
      className: "adm-usage-inline-check"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: costMissingOnly,
      onChange: event => setCostMissingOnly(event.target.checked)
    }), tr("仅看费用缺失", "Only missing costs"))), /*#__PURE__*/React.createElement(DataTable, {
      rows: costMissingOnly ? models.filter(row => Core.integerState(row.calls).kind !== "unknown" && Core.integerState(row.known_cost_calls).kind !== "unknown" && Number(row.calls) > Number(row.known_cost_calls)) : models,
      columns: modelColumns,
      rowKey: (row, index) => row.model || "model-" + index,
      ariaLabel: tr("模型统计", "Model statistics"),
      pageSize: 10,
      empty: tr("这个窗口没有模型记录", "No model records in this window")
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-usage-section"
    }, /*#__PURE__*/React.createElement("h2", null, tr("工具与读取", "Tools and reads")), /*#__PURE__*/React.createElement(DataTable, {
      rows: tools,
      columns: operationColumns,
      rowKey: "key",
      ariaLabel: tr("工具与读取", "Tools and reads"),
      pageSize: 10,
      empty: tr("这个窗口没有工具记录", "No tool records in this window")
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-usage-section"
    }, /*#__PURE__*/React.createElement("h2", null, tr("后台记忆记录", "Background memory records")), /*#__PURE__*/React.createElement(DataTable, {
      rows: memoryOperations,
      columns: operationColumns,
      rowKey: "key",
      ariaLabel: tr("后台记忆记录", "Background memory records"),
      pageSize: 8,
      empty: tr("这个窗口没有后台记忆记录", "No background memory records in this window")
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-usage-section"
    }, /*#__PURE__*/React.createElement("h2", null, tr("趋势", "Trend")), /*#__PURE__*/React.createElement(CartesianChart, {
      rows: trend,
      xKey: "date",
      ariaLabel: tr("用量趋势", "Usage trend"),
      empty: tr("这个窗口没有趋势", "No trend in this window"),
      series: [{
        key: "turns",
        label: tr("轮次", "Turns"),
        tone: "gold"
      }, {
        key: "model_calls",
        label: tr("模型调用", "Model calls"),
        tone: "slate"
      }, {
        key: "blocked_requests",
        label: tr("拦截", "Blocked"),
        tone: "terra"
      }, {
        key: "download_bytes",
        label: tr("读取字节", "Read bytes"),
        tone: "sage",
        axis: "right"
      }]
    }), /*#__PURE__*/React.createElement(CartesianChart, {
      rows: costTrend,
      xKey: "date",
      ariaLabel: tr("费用趋势", "Cost trend"),
      empty: tr("费用未知", "Cost unknown"),
      series: [{
        key: "cost_rmb",
        label: tr("费用（人民币）", "Cost (CNY)"),
        tone: "gold"
      }]
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-usage-section"
    }, /*#__PURE__*/React.createElement("h2", null, limits.events ? tr("已加载事件", "Loaded events") : tr("事件", "Events")), /*#__PURE__*/React.createElement(DataTable, {
      rows: events,
      columns: eventColumns,
      rowKey: "id",
      ariaLabel: tr("用量事件", "Usage events"),
      pageSize: 20,
      empty: tr("这个窗口没有事件", "No events in this window")
    }))) : null, data && view === "users" ? /*#__PURE__*/React.createElement(React.Fragment, null, "        ", /*#__PURE__*/React.createElement("section", {
      className: "adm-usage-section"
    }, /*#__PURE__*/React.createElement("h2", null, data.quota_pressure ? tr("配额", "Quotas") : tr("已加载用户的配额", "Quotas for loaded users")), /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-split"
    }, /*#__PURE__*/React.createElement(MetricBars, {
      ariaLabel: tr("方案分布", "Plan mix"),
      tone: "gold",
      items: PLANS.map(item => ({
        key: item[0],
        label: en ? item[2] : item[1],
        value: plans[item[0]]
      })).concat(plans.unknown ? [{
        key: "unknown",
        label: tr("未知", "Unknown"),
        value: plans.unknown
      }] : [])
    }), /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-pressure"
    }, /*#__PURE__*/React.createElement(Pressure, {
      title: tr("记忆", "Memory"),
      side: pressure.memory,
      tr: tr
    }), /*#__PURE__*/React.createElement(Pressure, {
      title: tr("空间", "Storage"),
      side: pressure.storage,
      tr: tr
    }))), /*#__PURE__*/React.createElement(DataTable, {
      rows: capacityPoints,
      rowKey: row => row.date + row.kind,
      pageSize: 10,
      ariaLabel: tr("容量快照", "Capacity snapshots"),
      empty: tr("尚无容量历史快照", "No capacity history yet"),
      columns: [{
        key: "date",
        header: tr("日期", "Date")
      }, {
        key: "kind",
        header: tr("资源", "Resource"),
        render: row => row.kind === "memory" ? tr("记忆条数", "Memories") : tr("资料字节", "Storage bytes")
      }, {
        key: "observed_accounts",
        header: tr("当日采集账号", "Accounts observed"),
        numeric: true
      }, {
        key: "used",
        header: tr("采集账号用量", "Observed usage"),
        numeric: true
      }, {
        key: "capacity",
        header: tr("采集账号配额", "Observed allowance"),
        numeric: true
      }]
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-usage-section"
    }, /*#__PURE__*/React.createElement("h2", null, limits.users ? tr("已加载用户", "Loaded users") : tr("用户", "Users")), /*#__PURE__*/React.createElement(DataTable, {
      rows: users,
      columns: userColumns,
      rowKey: "user_id",
      ariaLabel: tr("用户用量", "User usage"),
      pageSize: 20,
      empty: tr("这个窗口没有用户记录", "No user records in this window")
    }))) : null)), settingsOpen && window.AdminAssistantDrawer ? /*#__PURE__*/React.createElement(window.AdminAssistantDrawer, {
      title: tr("配额与限额", "Quotas and limits"),
      busy: saving,
      onClose: () => setSettingsOpen(false)
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-section"
    }, settingsLoading && !settings ? /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, tr("加载中…", "Loading…")) : null, settingsError ? /*#__PURE__*/React.createElement("p", {
      className: "adm-usage-error",
      role: "alert"
    }, settingsError) : null, settings && draft ? /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-settings"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-plans"
    }, PLANS.map(item => /*#__PURE__*/React.createElement("fieldset", {
      key: item[0]
    }, /*#__PURE__*/React.createElement("legend", null, en ? item[2] : item[1]), /*#__PURE__*/React.createElement("label", null, tr("记忆条数", "Memories"), /*#__PURE__*/React.createElement("input", {
      inputMode: "numeric",
      autoComplete: "off",
      "aria-invalid": outcome && outcome.errors[item[0] + "_memory"] ? "true" : "false",
      value: draft.allowances[item[0]].memory_items,
      onChange: event => setPlanField(item[0], "memory_items", event.target.value)
    }), outcome && outcome.errors[item[0] + "_memory"] ? /*#__PURE__*/React.createElement("em", {
      role: "alert"
    }, tr("请填写大于或等于 0 的整数", "Enter zero or a positive whole number")) : null), /*#__PURE__*/React.createElement("label", null, tr("存储字节", "Storage bytes"), /*#__PURE__*/React.createElement("input", {
      inputMode: "numeric",
      autoComplete: "off",
      "aria-invalid": outcome && outcome.errors[item[0] + "_storage"] ? "true" : "false",
      value: draft.allowances[item[0]].storage_bytes,
      onChange: event => setPlanField(item[0], "storage_bytes", event.target.value)
    }), /*#__PURE__*/React.createElement("small", null, Core.humanBytes(draft.allowances[item[0]].storage_bytes) || ""), outcome && outcome.errors[item[0] + "_storage"] ? /*#__PURE__*/React.createElement("em", {
      role: "alert"
    }, tr("请填写大于或等于 0 的整数", "Enter zero or a positive whole number")) : null)))), /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-thresholds"
    }, /*#__PURE__*/React.createElement(NumberField, {
      id: "assistant-analysis-reads",
      label: tr("每分钟内容读取", "Content reads per minute"),
      value: draft.workspaceRequestsPerMinute,
      error: fieldError(outcome && outcome.errors.workspaceRequestsPerMinute),
      onChange: value => setDraft(current => ({
        ...current,
        workspaceRequestsPerMinute: value
      }))
    }), /*#__PURE__*/React.createElement(NumberField, {
      id: "assistant-analysis-repeats",
      label: tr("10 分钟内相同版本读取", "Same-version reads in 10 minutes"),
      value: draft.repeatedReadsPer10Minutes,
      error: fieldError(outcome && outcome.errors.repeatedReadsPer10Minutes),
      onChange: value => setDraft(current => ({
        ...current,
        repeatedReadsPer10Minutes: value
      }))
    }), /*#__PURE__*/React.createElement(NumberField, {
      id: "assistant-analysis-alert",
      label: tr("每日源站流量告警", "Daily origin alert"),
      value: draft.downloadAlertBytesPerDay,
      error: fieldError(outcome && outcome.errors.downloadAlertBytesPerDay),
      suffix: Core.humanBytes(draft.downloadAlertBytesPerDay),
      onChange: value => setDraft(current => ({
        ...current,
        downloadAlertBytesPerDay: value
      }))
    }), /*#__PURE__*/React.createElement(NumberField, {
      id: "assistant-analysis-block",
      label: tr("每日源站流量限制", "Daily origin block"),
      value: draft.downloadBlockBytesPerDay,
      error: fieldError(outcome && outcome.errors.downloadBlockBytesPerDay),
      suffix: Core.humanBytes(draft.downloadBlockBytesPerDay),
      onChange: value => setDraft(current => ({
        ...current,
        downloadBlockBytesPerDay: value
      }))
    })), /*#__PURE__*/React.createElement("div", {
      className: "adm-usage-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: loadSettings,
      disabled: saving || settingsLoading
    }, tr("重新读取", "Reload")), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      onClick: saveSettings,
      disabled: !outcome || !outcome.dirty || !outcome.ok || saving
    }, saving ? tr("保存中…", "Saving…") : tr("保存", "Save")))) : null)) : null, unblockUser && window.AdminAssistantDrawer ? /*#__PURE__*/React.createElement(window.AdminAssistantDrawer, {
      title: tr("解除临时限制", "Clear temporary limit"),
      busy: unblocking,
      onClose: () => {
        setUnblockUser("");
        setUnblockError("");
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "adm-audit-note"
    }, tr("解除后恢复助手使用；已记录的次数和审计记录会保留。", "Clearing restores assistant access; recorded counts and audit history remain.")), "          ", /*#__PURE__*/React.createElement("form", {
      className: "adm-usage-unblock",
      onSubmit: submitUnblock
    }, /*#__PURE__*/React.createElement("label", null, tr("用户", "User"), /*#__PURE__*/React.createElement("strong", null, unblockUser)), /*#__PURE__*/React.createElement("label", null, tr("原因", "Reason"), /*#__PURE__*/React.createElement("input", {
      value: reason,
      maxLength: 500,
      autoComplete: "off",
      onChange: event => setReason(event.target.value)
    })), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn sm",
      disabled: !unblockUser || !reason.trim() || unblocking
    }, tr("解除临时限制", "Clear temporary limit")), /*#__PURE__*/React.createElement("small", {
      id: "assistant-analysis-unblock-note"
    }, tr("不清除已记录的次数", "Recorded counts stay")), unblockError ? /*#__PURE__*/React.createElement("p", {
      role: "alert"
    }, unblockError) : null)) : null);
  }
  function Pressure({
    title,
    side,
    tr
  }) {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, title), /*#__PURE__*/React.createElement("p", null, tr("接近上限", "Near limit"), " ", side.near, "/", side.known), /*#__PURE__*/React.createElement("p", null, tr("已满", "Full"), " ", side.over), /*#__PURE__*/React.createElement("p", {
      className: side.unknown ? "is-unknown" : ""
    }, tr("未知", "Unknown"), " ", side.unknown));
  }
  function NumberField({
    id,
    label,
    value,
    error,
    suffix,
    onChange
  }) {
    return /*#__PURE__*/React.createElement("label", {
      htmlFor: id
    }, label, /*#__PURE__*/React.createElement("input", {
      id: id,
      inputMode: "numeric",
      autoComplete: "off",
      value: value,
      "aria-invalid": error ? "true" : "false",
      "aria-describedby": error ? id + "-error" : undefined,
      onChange: event => onChange(event.target.value)
    }), suffix ? /*#__PURE__*/React.createElement("small", null, suffix) : null, error ? /*#__PURE__*/React.createElement("em", {
      id: id + "-error",
      role: "alert"
    }, error) : null);
  }
  function stamp(value, tr, en) {
    return Core.formatTimestamp(value, en) || tr("未知", "Unknown");
  }
  function tokenPair(row, tr) {
    const input = Core.integerState(row.input_tokens);
    const output = Core.integerState(row.output_tokens);
    if (input.kind === "unknown" && output.kind === "unknown") return tr("未知", "Unknown");
    return (input.kind === "unknown" ? tr("未知", "Unknown") : input.value.toLocaleString()) + " / " + (output.kind === "unknown" ? tr("未知", "Unknown") : output.value.toLocaleString());
  }
  window.AdminAssistantAnalysisTab = AdminAssistantAnalysisTab;
})();
}
