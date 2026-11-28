{
(function () {
  const {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
  } = React;
  const DataTable = window.AdminDataTable;
  const MetricBars = window.AdminMetricBars;
  const GROUPS = [{
    key: 'book',
    zh: '建书准备',
    en: 'Book setup'
  }, {
    key: 'full',
    zh: '一键成章',
    en: 'Full chapter'
  }, {
    key: 'staged',
    zh: '分步生产',
    en: 'Staged writing'
  }, {
    key: 'enhance',
    zh: '编辑增强',
    en: 'Editing'
  }, {
    key: 'other',
    zh: '其他行为',
    en: 'Other'
  }, {
    key: 'history',
    zh: '历史口径',
    en: 'Historical'
  }];
  const RATE_META = {
    world_build: {
      group: 'book',
      zh: '构建世界观',
      en: 'Build world'
    },
    character: {
      group: 'book',
      zh: '构建人物',
      en: 'Build characters'
    },
    character_create: {
      group: 'book',
      zh: 'AI 新增角色',
      en: 'AI character creation'
    },
    story_plan: {
      group: 'book',
      zh: '故事规划',
      en: 'Story plan'
    },
    outline: {
      group: 'book',
      zh: '卷纲与近纲',
      en: 'Volume and arc outline'
    },
    chapter_full_single: {
      group: 'full',
      zh: '一键成章 · 单写手',
      en: 'Full chapter · Single writer'
    },
    chapter_full_muti: {
      group: 'full',
      zh: '一键成章 · 写手群',
      en: 'Full chapter · Writer group'
    },
    chapter_world_state: {
      group: 'staged',
      zh: '世界观状态机',
      en: 'World state'
    },
    chapter_outline_director: {
      group: 'staged',
      zh: '细纲导演',
      en: 'Outline director'
    },
    chapter_character_state: {
      group: 'staged',
      zh: '角色状态维护',
      en: 'Character state'
    },
    chapter_writer_single: {
      group: 'staged',
      zh: '分步成文 · 单写手',
      en: 'Staged prose · Single writer'
    },
    chapter_writer_muti: {
      group: 'staged',
      zh: '分步成文 · 写手群',
      en: 'Staged prose · Writer group'
    },
    polish: {
      group: 'enhance',
      zh: '章节润色',
      en: 'Chapter polish'
    },
    post_hoc: {
      group: 'enhance',
      zh: '章节后验',
      en: 'Post-hoc analysis'
    },
    field_rewrite: {
      group: 'enhance',
      zh: '字段改写',
      en: 'Field rewrite'
    },
    memory_extract: {
      group: 'other',
      zh: '会话记忆提取',
      en: 'Session memory'
    },
    chapter_draft: {
      group: 'history',
      zh: '旧版写手群成章',
      en: 'Legacy writer-group draft',
      legacy: true
    },
    chapter_draft_single: {
      group: 'history',
      zh: '旧版单写手成章',
      en: 'Legacy single-writer draft',
      legacy: true
    }
  };
  const COPY = {
    zh: {
      title: '行为定价',
      subtitle: '管理新任务的固定笔力价格，并在保存前核对运营影响。',
      refresh: '刷新数据',
      charging: '收费行为',
      chargingMeta: '按固定价格计费',
      calls: '近 30 天任务',
      callsMeta: '来自任务类型汇总',
      projected: '按当前价折算',
      projectedMeta: '笔力 · 非实际收入',
      history: '历史口径',
      historyMeta: '仅用于历史记录匹配',
      search: '搜索行为名称或内部 key',
      all: '全部',
      statusAll: '收费状态：全部',
      statusCharging: '计费中',
      statusFree: '免计费',
      tableTitle: '当前行为价格',
      tableNote: '业务名称负责决策，内部 key 负责排障；价格支持 0.1 笔力精度。',
      updated: '数据更新于',
      action: '行为',
      price: '笔力 / 次',
      callsCol: '30 天次数',
      projectedCol: '按当前价折算',
      status: '收费状态',
      changed: '最近调整',
      edit: '编辑',
      guardrails: '定价护栏',
      immediate: '新任务即时生效',
      immediateNote: '保存后的下一笔任务使用新价格',
      frozen: '已创建任务不改价',
      frozenNote: '排队中与运行中任务保留创建时价格',
      freeWarning: '停止收费 ≠ 停用行为',
      freeWarningNote: '关闭收费后，行为仍可执行且新任务为 0 笔力',
      structure: '近 30 天定价结构',
      structureMeta: '按当前固定价折算',
      notRevenue: '调用量影响估算，不代表实际收入或毛利。',
      recent: '最近调整',
      noHistory: '暂无调价记录',
      auditUnavailable: '调整记录暂不可用',
      summaryUnavailable: '调用汇总暂不可用',
      summaryUnavailableNote: '价格表仍可编辑，保存前不展示 30 天影响估算。',
      retry: '重试',
      noMatch: '没有匹配的行为',
      clear: '清除筛选',
      loadFailed: '暂时无法读取当前价格',
      loadFailedNote: '为避免误操作，本页已进入只读错误态。',
      editPrice: '编辑行为价格',
      currentPrice: '当前价格',
      share: '折算占比',
      fixedPrice: '固定价格',
      configuredPrice: '配置价',
      billingOn: '按固定价格计费',
      billingOffNote: '关闭后行为仍可执行，但新任务不收取笔力。',
      notes: '内部备注',
      notesPlaceholder: '记录调价依据或运营口径',
      impact: '本次影响预览',
      unitChange: '单次变化',
      windowImpact: '按近 30 天调用估算',
      scope: '生效范围',
      scopeValue: '保存后新建任务',
      frozenDetail: '已创建、排队中和运行中的任务继续使用创建时冻结的价格。',
      cancel: '取消',
      review: '保存并检查影响',
      confirmTitle: '确认调整',
      confirmNote: '这不是草稿；确认后会立即影响新创建的任务。',
      current: '当前',
      after: '调整后',
      unaffected: '不受影响',
      back: '返回修改',
      confirm: '确认并立即生效',
      saving: '保存中…',
      freeValue: '免计费（0 笔力）',
      historical: '历史口径',
      startsCharging: '开始收费'
    },
    en: {
      title: 'Action pricing',
      subtitle: 'Manage fixed credit prices for new tasks and review operational impact before saving.',
      refresh: 'Refresh',
      charging: 'Charged actions',
      chargingMeta: 'Fixed-price billing',
      calls: 'Tasks · 30 days',
      callsMeta: 'Task-type rollup',
      projected: 'At current prices',
      projectedMeta: 'credits · not revenue',
      history: 'Historical keys',
      historyMeta: 'Historical matching only',
      search: 'Search action or internal key',
      all: 'All',
      statusAll: 'Billing: all',
      statusCharging: 'Charging',
      statusFree: 'Free',
      tableTitle: 'Current action prices',
      tableNote: 'Business names support decisions; internal keys remain diagnostic evidence. Prices support 0.1-credit precision.',
      updated: 'Updated',
      action: 'Action',
      price: 'Credits / use',
      callsCol: '30-day tasks',
      projectedCol: 'At current price',
      status: 'Billing',
      changed: 'Updated',
      edit: 'Edit',
      guardrails: 'Pricing guardrails',
      immediate: 'Applies to new tasks immediately',
      immediateNote: 'The next created task uses the new price',
      frozen: 'Existing tasks keep their price',
      frozenNote: 'Queued and running tasks retain their creation-time price',
      freeWarning: 'Stop charging ≠ disable action',
      freeWarningNote: 'The action remains available and new tasks cost 0 credits',
      structure: '30-day pricing mix',
      structureMeta: 'At current fixed prices',
      notRevenue: 'An impact estimate, not realized revenue or margin.',
      recent: 'Recent changes',
      noHistory: 'No pricing changes yet',
      auditUnavailable: 'Change history unavailable',
      summaryUnavailable: 'Usage summary unavailable',
      summaryUnavailableNote: 'Prices remain editable; the 30-day impact estimate is hidden.',
      retry: 'Retry',
      noMatch: 'No matching actions',
      clear: 'Clear filters',
      loadFailed: 'Current prices are unavailable',
      loadFailedNote: 'The page is read-only to prevent accidental changes.',
      editPrice: 'Edit action price',
      currentPrice: 'Current price',
      share: 'Projected share',
      fixedPrice: 'Fixed price',
      configuredPrice: 'Configured price',
      billingOn: 'Charge a fixed price',
      billingOffNote: 'When off, the action stays available and new tasks cost 0 credits.',
      notes: 'Internal note',
      notesPlaceholder: 'Record the pricing rationale',
      impact: 'Impact preview',
      unitChange: 'Per use',
      windowImpact: 'Estimated from 30-day tasks',
      scope: 'Applies to',
      scopeValue: 'New tasks after save',
      frozenDetail: 'Created, queued, and running tasks keep their frozen creation-time price.',
      cancel: 'Cancel',
      review: 'Save and review impact',
      confirmTitle: 'Confirm change to',
      confirmNote: 'This is not a draft. New tasks are affected immediately after confirmation.',
      current: 'Current',
      after: 'After change',
      unaffected: 'Unaffected',
      back: 'Back',
      confirm: 'Confirm and apply now',
      saving: 'Saving…',
      freeValue: 'Free (0 credits)',
      historical: 'Historical',
      startsCharging: 'Starts charging'
    }
  };
  const creditsOf = millis => ((Number(millis) || 0) / 1000).toLocaleString(undefined, {
    maximumFractionDigits: 3
  });
  const timeOf = value => value ? new Date(value).toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }) : '—';
  function RateMetric({
    label,
    value,
    meta,
    tone
  }) {
    return /*#__PURE__*/React.createElement("article", {
      className: 'adm-rate-metric ' + (tone || '')
    }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("strong", null, value), /*#__PURE__*/React.createElement("small", null, meta));
  }
  function RateSkeleton() {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-rate-skeleton",
      "aria-busy": "true",
      "aria-label": "Loading"
    }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null));
  }
  function RateDrawer({
    row,
    calls,
    share,
    form,
    setForm,
    onClose,
    onReview,
    copy
  }) {
    const currentMillis = row.active ? row.estimated_credits_millis : 0;
    const proposedMillis = form.active ? Math.max(0, Math.round((Number(form.credits) || 0) * 1000)) : 0;
    const delta = proposedMillis - currentMillis;
    const percent = currentMillis > 0 ? Math.round(delta / currentMillis * 100) : null;
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-rate-overlay",
      onMouseDown: e => {
        if (e.target === e.currentTarget) onClose();
      }
    }, /*#__PURE__*/React.createElement("aside", {
      className: "adm-rate-drawer",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "adm-rate-drawer-title"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.editPrice), /*#__PURE__*/React.createElement("h2", {
      id: "adm-rate-drawer-title"
    }, row.name), /*#__PURE__*/React.createElement("code", null, row.task_type)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": copy.cancel,
      onClick: onClose
    }, "\xD7")), /*#__PURE__*/React.createElement("div", {
      className: "adm-rate-drawer-body"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-rate-context"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.currentPrice), /*#__PURE__*/React.createElement("strong", null, creditsOf(row.estimated_credits_millis), " \xB7 ", row.active ? copy.statusCharging : copy.statusFree)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.callsCol), /*#__PURE__*/React.createElement("strong", null, calls == null ? '—' : calls.toLocaleString())), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.share), /*#__PURE__*/React.createElement("strong", null, share == null ? '—' : share.toFixed(1) + '%'))), /*#__PURE__*/React.createElement("label", {
      className: "adm-rate-field"
    }, /*#__PURE__*/React.createElement("span", null, copy.fixedPrice), /*#__PURE__*/React.createElement("div", {
      className: "adm-rate-number"
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      step: "0.1",
      autoFocus: true,
      value: form.credits,
      onChange: e => setForm(prev => ({
        ...prev,
        credits: e.target.value
      }))
    }), /*#__PURE__*/React.createElement("b", null, copy.price))), /*#__PURE__*/React.createElement("label", {
      className: "adm-rate-switch"
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, copy.billingOn), /*#__PURE__*/React.createElement("small", null, copy.billingOffNote)), /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: form.active,
      onChange: e => setForm(prev => ({
        ...prev,
        active: e.target.checked
      }))
    })), /*#__PURE__*/React.createElement("label", {
      className: "adm-rate-field"
    }, /*#__PURE__*/React.createElement("span", null, copy.notes), /*#__PURE__*/React.createElement("textarea", {
      maxLength: "255",
      placeholder: copy.notesPlaceholder,
      value: form.notes,
      onChange: e => setForm(prev => ({
        ...prev,
        notes: e.target.value
      }))
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-rate-impact"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("strong", null, copy.impact), /*#__PURE__*/React.createElement("span", null, row.active ? creditsOf(row.estimated_credits_millis) : '0', " \u2192 ", form.active ? creditsOf(proposedMillis) : '0')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.unitChange), /*#__PURE__*/React.createElement("b", null, delta > 0 ? '+' : '', creditsOf(delta), " ", percent == null ? copy.startsCharging : '(' + (percent > 0 ? '+' : '') + percent + '%)')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.windowImpact), /*#__PURE__*/React.createElement("b", null, calls == null ? '—' : (delta > 0 ? '+' : '') + creditsOf(delta * calls))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.scope), /*#__PURE__*/React.createElement("b", null, copy.scopeValue)), /*#__PURE__*/React.createElement("p", null, copy.frozenDetail))), /*#__PURE__*/React.createElement("footer", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      onClick: onClose
    }, copy.cancel), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold",
      disabled: form.credits === '' || Number(form.credits) < 0,
      onClick: onReview
    }, copy.review))));
  }
  function RateConfirm({
    row,
    calls,
    form,
    saving,
    onBack,
    onConfirm,
    copy
  }) {
    const nextMillis = form.active ? Math.max(0, Math.round((Number(form.credits) || 0) * 1000)) : 0;
    const oldMillis = row.active ? row.estimated_credits_millis : 0;
    const delta = nextMillis - oldMillis;
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-rate-confirm-layer"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-rate-confirm",
      role: "alertdialog",
      "aria-modal": "true",
      "aria-labelledby": "adm-rate-confirm-title"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("span", null, "!"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      id: "adm-rate-confirm-title"
    }, copy.confirmTitle, " ", row.name), /*#__PURE__*/React.createElement("p", null, copy.confirmNote))), /*#__PURE__*/React.createElement("div", {
      className: "adm-rate-change"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.current), /*#__PURE__*/React.createElement("strong", null, row.active ? creditsOf(row.estimated_credits_millis) + ' ' + copy.price : copy.freeValue + ' · ' + copy.configuredPrice + ' ' + creditsOf(row.estimated_credits_millis))), /*#__PURE__*/React.createElement("b", null, "\u2192"), /*#__PURE__*/React.createElement("div", {
      className: "next"
    }, /*#__PURE__*/React.createElement("span", null, copy.after), /*#__PURE__*/React.createElement("strong", null, form.active ? creditsOf(nextMillis) + ' ' + copy.price : copy.freeValue + ' · ' + copy.configuredPrice + ' ' + creditsOf(nextMillis)))), /*#__PURE__*/React.createElement("dl", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.status), /*#__PURE__*/React.createElement("dd", null, form.active ? copy.statusCharging : copy.statusFree)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.windowImpact), /*#__PURE__*/React.createElement("dd", null, calls == null ? '—' : (delta > 0 ? '+' : '') + creditsOf(delta * calls) + ' · ' + copy.projectedMeta)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.unaffected), /*#__PURE__*/React.createElement("dd", null, copy.frozenDetail))), /*#__PURE__*/React.createElement("footer", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      autoFocus: true,
      disabled: saving,
      onClick: onBack
    }, copy.back), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold",
      disabled: saving,
      onClick: onConfirm
    }, saving ? copy.saving : copy.confirm))));
  }
  function RatesTab({
    toast
  }) {
    const isEn = window.CLANG === 'en';
    const copy = COPY[isEn ? 'en' : 'zh'];
    const [estimates, setEstimates] = useState([]);
    const [summary, setSummary] = useState(null);
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summaryError, setSummaryError] = useState(false);
    const [auditError, setAuditError] = useState(false);
    const [pricingError, setPricingError] = useState('');
    const [updatedAt, setUpdatedAt] = useState(null);
    const [query, setQuery] = useState('');
    const [group, setGroup] = useState('all');
    const [billing, setBilling] = useState('all');
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({
      credits: '',
      active: true,
      notes: ''
    });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const lastTrigger = useRef(null);
    const load = useCallback(async () => {
      setLoading(true);
      setPricingError('');
      setSummaryError(false);
      setAuditError(false);
      const [pricesResult, summaryResult, auditResult] = await Promise.allSettled([window.LF_API.adminTaskEstimates(), window.LF_API.adminTokenSummary(30), window.LF_API.adminAuditLogs({
        action: 'admin.task_estimate_upserted',
        limit: 3
      })]);
      if (pricesResult.status === 'fulfilled') {
        setEstimates(pricesResult.value || []);
        setUpdatedAt(new Date());
      } else {
        setPricingError(pricesResult.reason && pricesResult.reason.message ? pricesResult.reason.message : copy.loadFailed);
      }
      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value || null);else {
        setSummary(null);
        setSummaryError(true);
      }
      if (auditResult.status === 'fulfilled') setAudits(auditResult.value || []);else {
        setAudits([]);
        setAuditError(true);
      }
      setLoading(false);
    }, [copy.loadFailed]);
    useEffect(() => {
      load();
    }, [load]);
    useEffect(() => {
      if (!selected) return undefined;
      const onKey = e => {
        if (e.key === 'Escape') confirmOpen ? setConfirmOpen(false) : closeEditor();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [selected, confirmOpen]);
    const metaOf = useCallback(taskType => {
      const meta = RATE_META[taskType] || {
        group: 'other',
        zh: taskType,
        en: taskType
      };
      return {
        ...meta,
        name: isEn ? meta.en : meta.zh
      };
    }, [isEn]);
    const callsByType = useMemo(() => new Map(((summary || {}).by_task_type || []).map(row => [row.task_type, Number(row.calls) || 0])), [summary]);
    const rows = useMemo(() => estimates.map(row => ({
      ...row,
      ...metaOf(row.task_type),
      calls: callsByType.get(row.task_type) || 0
    })), [estimates, metaOf, callsByType]);
    const nonLegacyRows = useMemo(() => rows.filter(row => !row.legacy), [rows]);
    const projectedMillis = useMemo(() => nonLegacyRows.reduce((sum, row) => sum + (row.active ? row.calls * row.estimated_credits_millis : 0), 0), [nonLegacyRows]);
    const totalCalls = useMemo(() => ((summary || {}).by_task_type || []).reduce((sum, row) => sum + (Number(row.calls) || 0), 0), [summary]);
    const groupedImpact = useMemo(() => {
      const values = new Map();
      nonLegacyRows.forEach(row => values.set(row.group, (values.get(row.group) || 0) + (row.active ? row.calls * row.estimated_credits_millis : 0)));
      return values;
    }, [nonLegacyRows]);
    const groupCounts = useMemo(() => {
      const values = new Map([['all', nonLegacyRows.length], ['history', rows.filter(row => row.legacy).length]]);
      nonLegacyRows.forEach(row => values.set(row.group, (values.get(row.group) || 0) + 1));
      return values;
    }, [rows, nonLegacyRows]);
    const visibleRows = useMemo(() => {
      const needle = query.trim().toLocaleLowerCase();
      return rows.filter(row => {
        if (group === 'history' ? !row.legacy : row.legacy || group !== 'all' && row.group !== group) return false;
        if (billing === 'charging' && !row.active) return false;
        if (billing === 'free' && row.active) return false;
        return !needle || row.name.toLocaleLowerCase().includes(needle) || row.task_type.toLocaleLowerCase().includes(needle) || String(row.notes || '').toLocaleLowerCase().includes(needle);
      });
    }, [rows, group, billing, query]);
    const openEditor = (row, trigger) => {
      lastTrigger.current = trigger;
      setSelected(row);
      setForm({
        credits: creditsOf(row.estimated_credits_millis).replace(/,/g, ''),
        active: !!row.active,
        notes: row.notes || ''
      });
      setConfirmOpen(false);
    };
    const closeEditor = () => {
      setSelected(null);
      setConfirmOpen(false);
      window.setTimeout(() => {
        if (lastTrigger.current) lastTrigger.current.focus();
      }, 0);
    };
    const confirmSave = async () => {
      if (!selected || saving) return;
      setSaving(true);
      try {
        await window.LF_API.adminUpsertTaskEstimate(selected.task_type, {
          estimated_credits_millis: Math.max(0, Math.round((Number(form.credits) || 0) * 1000)),
          active: !!form.active,
          notes: form.notes.trim() || null
        });
        toast(window.TC('adm_done'));
        closeEditor();
        await load();
      } catch (error) {
        toast(error.message || String(error));
      } finally {
        setSaving(false);
      }
    };
    const filterGroups = [{
      key: 'all',
      label: copy.all
    }, ...GROUPS.filter(item => item.key !== 'other' || groupCounts.get('other')).map(item => ({
      key: item.key,
      label: isEn ? item.en : item.zh
    }))];
    const selectedCalls = selected && summary ? callsByType.get(selected.task_type) || 0 : null;
    const selectedShare = selected && projectedMillis > 0 ? (selected.active ? selected.estimated_credits_millis * (callsByType.get(selected.task_type) || 0) : 0) * 100 / projectedMillis : null;
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-rates"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-rate-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, copy.title), /*#__PURE__*/React.createElement("p", null, copy.subtitle)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: loading,
      onClick: load
    }, loading ? '…' : copy.refresh)), /*#__PURE__*/React.createElement("section", {
      className: "adm-rate-metrics"
    }, /*#__PURE__*/React.createElement(RateMetric, {
      label: copy.charging,
      value: nonLegacyRows.filter(row => row.active).length,
      meta: copy.chargingMeta + ' · ' + copy.statusFree + ' ' + nonLegacyRows.filter(row => !row.active).length,
      tone: "primary"
    }), /*#__PURE__*/React.createElement(RateMetric, {
      label: copy.calls,
      value: summary ? totalCalls.toLocaleString() : '—',
      meta: summaryError ? copy.summaryUnavailable : copy.callsMeta
    }), /*#__PURE__*/React.createElement(RateMetric, {
      label: copy.projected,
      value: summary ? creditsOf(projectedMillis) : '—',
      meta: copy.projectedMeta,
      tone: "success"
    }), /*#__PURE__*/React.createElement(RateMetric, {
      label: copy.history,
      value: rows.filter(row => row.legacy).length,
      meta: copy.historyMeta,
      tone: "muted"
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-rate-filters"
    }, /*#__PURE__*/React.createElement("input", {
      type: "search",
      value: query,
      onChange: e => setQuery(e.target.value),
      placeholder: copy.search,
      "aria-label": copy.search
    }), /*#__PURE__*/React.createElement("div", {
      className: "adm-rate-groups"
    }, filterGroups.map(item => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: item.key,
      className: group === item.key ? 'on' : '',
      "aria-pressed": group === item.key,
      onClick: () => setGroup(item.key)
    }, item.label, /*#__PURE__*/React.createElement("small", null, groupCounts.get(item.key) || 0)))), /*#__PURE__*/React.createElement("select", {
      value: billing,
      onChange: e => setBilling(e.target.value),
      "aria-label": copy.status
    }, /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, copy.statusAll), /*#__PURE__*/React.createElement("option", {
      value: "charging"
    }, copy.statusCharging), /*#__PURE__*/React.createElement("option", {
      value: "free"
    }, copy.statusFree))), loading && estimates.length === 0 ? /*#__PURE__*/React.createElement(RateSkeleton, null) : pricingError ? /*#__PURE__*/React.createElement("section", {
      className: "adm-rate-error"
    }, /*#__PURE__*/React.createElement("strong", null, copy.loadFailed), /*#__PURE__*/React.createElement("p", null, copy.loadFailedNote), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: load
    }, copy.retry)) : /*#__PURE__*/React.createElement("div", {
      className: "adm-rate-workspace"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-rate-list"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, copy.tableTitle), /*#__PURE__*/React.createElement("p", null, copy.tableNote)), /*#__PURE__*/React.createElement("span", null, copy.updated, " ", updatedAt ? timeOf(updatedAt) : '—')), /*#__PURE__*/React.createElement(DataTable, {
      rows: visibleRows,
      columns: [{
        key: 'action',
        header: copy.action,
        priority: 'primary',
        sortValue: row => row.name,
        render: row => {
          const category = GROUPS.find(item => item.key === row.group);
          return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, row.name), /*#__PURE__*/React.createElement("code", null, row.task_type), category ? /*#__PURE__*/React.createElement("small", null, isEn ? category.en : category.zh) : null);
        }
      }, {
        key: 'price',
        header: copy.price,
        numeric: true,
        defaultDirection: 'desc',
        sortValue: row => row.estimated_credits_millis,
        render: row => /*#__PURE__*/React.createElement("b", null, creditsOf(row.estimated_credits_millis))
      }, {
        key: 'calls',
        header: copy.callsCol,
        numeric: true,
        defaultDirection: 'desc',
        sortValue: row => row.calls,
        render: row => summary ? row.calls.toLocaleString() : '—'
      }, {
        key: 'projected',
        header: copy.projectedCol,
        numeric: true,
        defaultDirection: 'desc',
        sortValue: row => row.active ? row.calls * row.estimated_credits_millis : 0,
        render: row => summary ? creditsOf(row.active ? row.calls * row.estimated_credits_millis : 0) : '—'
      }, {
        key: 'status',
        header: copy.status,
        sortValue: row => row.legacy ? 0 : row.active ? 2 : 1,
        render: row => /*#__PURE__*/React.createElement("span", {
          className: 'adm-rate-badge ' + (row.legacy ? 'history' : row.active ? 'charging' : 'free')
        }, row.legacy ? copy.historical : row.active ? copy.statusCharging : copy.statusFree)
      }, {
        key: 'changed',
        header: copy.changed,
        priority: 'optional',
        sortValue: row => Date.parse(row.updated_at || 0),
        render: row => timeOf(row.updated_at)
      }, {
        key: 'edit',
        header: '',
        sortable: false,
        render: row => /*#__PURE__*/React.createElement("button", {
          type: "button",
          className: "c-btn sm",
          disabled: row.legacy,
          onClick: event => openEditor(row, event.currentTarget)
        }, copy.edit)
      }],
      rowKey: "task_type",
      ariaLabel: copy.tableTitle,
      pageSize: 20,
      className: "adm-rate-table",
      wrapClassName: "adm-rate-table-wrap",
      empty: copy.noMatch
    })), /*#__PURE__*/React.createElement("aside", {
      className: "adm-rate-rail"
    }, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("strong", null, copy.guardrails)), /*#__PURE__*/React.createElement("ul", {
      className: "adm-rate-guardrails"
    }, /*#__PURE__*/React.createElement("li", {
      className: "warning"
    }, /*#__PURE__*/React.createElement("b", null, copy.immediate), /*#__PURE__*/React.createElement("span", null, copy.immediateNote)), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, copy.frozen), /*#__PURE__*/React.createElement("span", null, copy.frozenNote)), /*#__PURE__*/React.createElement("li", {
      className: "warning"
    }, /*#__PURE__*/React.createElement("b", null, copy.freeWarning), /*#__PURE__*/React.createElement("span", null, copy.freeWarningNote)))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("strong", null, copy.structure), /*#__PURE__*/React.createElement("small", null, copy.structureMeta)), summaryError ? /*#__PURE__*/React.createElement("div", {
      className: "adm-rate-partial"
    }, /*#__PURE__*/React.createElement("b", null, copy.summaryUnavailable), /*#__PURE__*/React.createElement("span", null, copy.summaryUnavailableNote), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: load
    }, copy.retry)) : /*#__PURE__*/React.createElement("div", {
      className: "adm-rate-mix"
    }, /*#__PURE__*/React.createElement(MetricBars, {
      items: GROUPS.filter(item => !['history', 'other'].includes(item.key)).map(item => {
        const value = groupedImpact.get(item.key) || 0;
        return {
          key: item.key,
          label: isEn ? item.en : item.zh,
          value: projectedMillis > 0 ? value * 100 / projectedMillis : 0
        };
      }),
      ariaLabel: copy.structure,
      max: 100,
      format: value => value.toFixed(1) + '%',
      tone: "gold",
      compact: true
    }), /*#__PURE__*/React.createElement("p", null, copy.notRevenue))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("strong", null, copy.recent)), auditError ? /*#__PURE__*/React.createElement("div", {
      className: "adm-rate-partial"
    }, /*#__PURE__*/React.createElement("b", null, copy.auditUnavailable), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: load
    }, copy.retry)) : audits.length === 0 ? /*#__PURE__*/React.createElement("div", {
      className: "adm-rate-history empty"
    }, copy.noHistory) : /*#__PURE__*/React.createElement("div", {
      className: "adm-rate-history"
    }, audits.map(log => {
      const details = log.details || {};
      const meta = metaOf(details.task_type || '');
      return /*#__PURE__*/React.createElement("div", {
        key: log.id
      }, /*#__PURE__*/React.createElement("b", null, meta.name), /*#__PURE__*/React.createElement("span", null, details.active === false ? copy.statusFree : creditsOf(details.estimated_credits_millis) + ' ' + copy.price, " \xB7 ", timeOf(log.created_at)));
    }))))), selected ? /*#__PURE__*/React.createElement(RateDrawer, {
      row: selected,
      calls: selectedCalls,
      share: selectedShare,
      form: form,
      setForm: setForm,
      onClose: closeEditor,
      onReview: () => setConfirmOpen(true),
      copy: copy
    }) : null, selected && confirmOpen ? /*#__PURE__*/React.createElement(RateConfirm, {
      row: selected,
      calls: selectedCalls,
      form: form,
      saving: saving,
      onBack: () => setConfirmOpen(false),
      onConfirm: confirmSave,
      copy: copy
    }) : null);
  }
  window.AdminRatesTab = RatesTab;
})();
}
