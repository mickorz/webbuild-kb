{
(function () {
  const A = window.AdminProseDraw;
  const {
    C,
    t,
    Button,
    Notice,
    Tabs
  } = A;
  const {
    useState,
    useRef,
    useMemo,
    useCallback,
    useEffect
  } = React;
  function AdminProseDrawTab() {
    const api = useMemo(() => C.createApi(window.LF_API.request), []);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true),
      [errors, setErrors] = useState({});
    const [tab, setTab] = useState('analysis'),
      [selectedTask, setSelectedTask] = useState('');
    const [analysisScope, setAnalysisScope] = useState('official');
    const [guidance, setGuidance] = useState(null),
      [stack, setStack] = useState([]);
    const [busy, setBusy] = useState(false),
      [confirmation, setConfirmation] = useState(null);
    const [confirmError, setConfirmError] = useState(''),
      [actionError, setActionError] = useState('');
    const [epoch, setEpoch] = useState(0);
    const pending = useRef(false),
      mounted = useRef(true),
      generation = useRef(0),
      readController = useRef(null),
      readyGeneration = useRef(0),
      extraReads = useRef(new Map());
    const routeSequence = useRef(0),
      stackRef = useRef(stack),
      dirty = useRef(new Map());
    stackRef.current = stack;
    const denyRead = useCallback(() => {
      ++generation.current;
      readyGeneration.current = 0;
      readController.current?.abort();
      setLoading(false);
      setData(null);
      setStack([]);
      dirty.current.clear();
      setErrors({
        permission: '无法读取管理员数据，请确认登录状态与管理员权限。'
      });
    }, []);
    const loadExtra = useCallback(key => {
      const serial = readyGeneration.current;
      if (!serial || serial !== generation.current) return;
      const existing = extraReads.current.get(key);
      if (existing?.serial === serial) return existing.promise;
      const promise = (async () => {
        try {
          const result = key === 'catalog' ? await window.LF_API.adminModelRouting() : key === 'context' ? await api.context(readController.current.signal) : await api.allocations(readController.current.signal);
          if (!mounted.current || serial !== generation.current) return;
          setData(old => old && {
            ...old,
            [key]: result
          });
          setErrors(old => {
            const next = {
              ...old
            };
            delete next[key];
            return next;
          });
        } catch (error) {
          if (!mounted.current || serial !== generation.current) return;
          if ([401, 403].includes(error.status)) denyRead();else setErrors(old => ({
            ...old,
            [key]: error.message || '读取失败'
          }));
        }
      })();
      extraReads.current.set(key, {
        serial,
        promise
      });
      return promise;
    }, [api, denyRead]);
    const loadAllocations = useCallback(() => loadExtra('allocations'), [loadExtra]);
    const loadContext = useCallback(() => loadExtra('context'), [loadExtra]);
    const refresh = useCallback(async () => {
      const serial = ++generation.current;
      readyGeneration.current = 0;
      extraReads.current.clear();
      if (readController.current) readController.current.abort();
      const controller = new AbortController();
      readController.current = controller;
      if (mounted.current) setLoading(true);
      const reads = {
        settings: () => api.settings(controller.signal),
        configs: () => api.configs(controller.signal),
        tasks: () => api.tasks(controller.signal),
        // An open form refreshes its baseline and live context together so an
        // intermediate missing context cannot discard candidate selections.
        ...(stackRef.current.length ? {
          context: () => api.context(controller.signal)
        } : {})
      };
      const keys = Object.keys(reads),
        results = await Promise.allSettled(keys.map(key => reads[key]()));
      if (!mounted.current || serial !== generation.current) return;
      const next = {},
        failures = {};
      results.forEach((result, index) => {
        const key = keys[index];
        if (result.status === 'fulfilled') next[key] = result.value;else failures[key] = result.reason?.message || '读取失败';
      });
      const denied = results.some(result => result.status === 'rejected' && [401, 403].includes(result.reason?.status));
      setLoading(false);
      setErrors(denied ? {
        permission: '无法读取管理员数据，请确认登录状态与管理员权限。'
      } : failures);
      if (denied) {
        denyRead();
        return;
      }
      readyGeneration.current = serial;
      if (reads.context) extraReads.current.set('context', {
        serial,
        promise: Promise.resolve(next.context)
      });
      setData(old => {
        if (!old && ['settings', 'configs', 'tasks'].some(key => failures[key])) return null;
        return {
          ...old,
          ...next,
          // Failed eligibility/catalog reads cannot authorize a mutation using stale resources.
          context: next.context || null,
          catalog: null,
          allocations: {
            tasks: []
          }
        };
      });
      if (next.tasks) setSelectedTask(previous => next.tasks.some(task => task.id === previous) ? previous : next.tasks[0]?.id || '');
      setEpoch(value => value + 1);
      return next;
    }, [api, denyRead]);
    useEffect(() => {
      mounted.current = true;
      refresh();
      return () => {
        mounted.current = false;
        ++generation.current;
        readController.current?.abort();
      };
    }, [refresh]);
    useEffect(() => {
      const unload = event => {
        if (!pending.current && !Array.from(dirty.current.values()).some(Boolean)) return;
        event.preventDefault();
        event.returnValue = '';
      };
      window.addEventListener('beforeunload', unload);
      return () => window.removeEventListener('beforeunload', unload);
    }, []);
    const mutate = async action => {
      if (pending.current) throw new Error('正在保存，请等待当前操作完成。');
      pending.current = true;
      setBusy(true);
      setActionError('');
      try {
        return await action();
      } finally {
        pending.current = false;
        if (mounted.current) setBusy(false);
      }
    };
    const configs = data?.configs || [],
      tasks = data?.tasks || [];
    const scheme = id => configs.find(item => item.id === id),
      task = id => tasks.find(item => item.id === id);
    const officialConfig = data?.context?.resource_status === 'valid' ? scheme(data.context.official?.config_id) : null;
    const analysisOfficialConfig = data?.context ? officialConfig : configs.find(row => row.scheme_kind === 'official' && row.is_current);
    function makeRoute(kind, id, extra = {}) {
      return {
        kind,
        id,
        taskId: extra.taskId || id,
        key: 'prose-route-' + ++routeSequence.current,
        source: kind === 'newScheme' ? scheme(id) || data?.context?.official : undefined,
        baseline: kind === 'newTask' ? officialConfig : undefined,
        ...extra
      };
    }
    function open(kind, id, extra) {
      if (!pending.current) setStack(previous => [...previous, makeRoute(kind, id, extra)]);
    }
    function pop() {
      const current = stackRef.current.at(-1);
      if (current) dirty.current.delete(current.key);
      setStack(previous => previous.slice(0, -1));
    }
    function replace(kind, id, extra) {
      const current = stackRef.current.at(-1);
      if (current) dirty.current.delete(current.key);
      setStack(previous => [...previous.slice(0, -1), makeRoute(kind, id, extra)]);
    }
    function confirm(options) {
      setConfirmError('');
      setConfirmation(options);
    }
    function back() {
      if (pending.current) return;
      const unsaved = dirty.current.get(stackRef.current.at(-1)?.key);
      if (unsaved) confirm({
        title: '离开当前编辑？',
        label: '离开编辑',
        message: typeof unsaved === 'string' ? unsaved : '未保存的修改将丢失。',
        refresh: false,
        action: pop
      });else pop();
    }
    async function submitConfirmation() {
      if (pending.current || !confirmation) return;
      const active = confirmation;
      try {
        await mutate(async () => {
          await active.action();
          if (mounted.current) setConfirmation(null);
          if (active.refresh !== false) await refresh();
        });
      } catch (error) {
        if (mounted.current) setConfirmError(error.message || '保存失败，请重试。');
      }
    }
    function upsert(key, record) {
      setData(previous => previous && {
        ...previous,
        [key]: previous[key].some(row => row.id === record.id) ? previous[key].map(row => row.id === record.id ? record : row) : [...previous[key], record]
      });
    }
    const allocationSnapshot = data?.allocations;
    const allocationRows = allocationSnapshot?.tasks || [];
    const allocations = allocationRows.length === tasks.length && new Set(allocationRows.map(row => row.evaluation_task_id)).size === tasks.length && allocationRows.every(row => row.baseline_config_id && row.baseline_config_id === task(row.evaluation_task_id)?.baseline_config_id && C.same((row.candidate_probabilities || []).map(member => member.config_id).sort(), (task(row.evaluation_task_id)?.candidates || []).filter(member => !member.superseded_by_config_id).map(member => member.config_id).sort())) ? allocationSnapshot : {
      tasks: []
    };
    const app = {
      ...(data || {}),
      catalog: data?.context?.resource_status === 'valid' ? data.catalog : null,
      configs,
      tasks,
      api,
      refresh,
      busy,
      epoch,
      selectedTask,
      setSelectedTask,
      analysisScope,
      setAnalysisScope,
      guidance,
      setGuidance,
      officialConfig,
      analysisOfficialConfig,
      scheme,
      task,
      open,
      pop,
      replace,
      back,
      confirm,
      mutate,
      allocations,
      loadAllocations,
      loadContext,
      allocationFor: id => allocations.tasks.find(item => item.evaluation_task_id === id),
      markDirty: (key, value) => {
        dirty.current.set(key, value);
      },
      newKey: () => window.crypto.randomUUID(),
      upsertTask: record => upsert('tasks', record),
      upsertConfig: record => upsert('configs', record),
      showAnalysis: id => {
        if (pending.current) return;
        setSelectedTask(id);
        setAnalysisScope('task');
        setGuidance(null);
        setTab('analysis');
        setStack([]);
        dirty.current.clear();
      },
      changeCandidate: async (id, configId, enabled) => {
        try {
          await mutate(async () => {
            await api.candidate(id, {
              config_id: configId,
              enabled
            });
            await refresh();
          });
        } catch (error) {
          if (mounted.current) setActionError(error.message);
        }
      }
    };
    const titles = {
      candidate: '候选表现',
      round: '轮次详情',
      preferenceHelp: '两种胜率口径',
      costHelp: '模型成本明细',
      task: '评估任务',
      newTask: '新建评估任务',
      candidatePool: '添加候选',
      routing: '调整投放',
      scheme: '生成方案',
      deleteScheme: '删除方案',
      newScheme: stack.at(-1)?.mode === 'edit' ? '编辑方案' : stack.at(-1)?.mode === 'copy' ? '复制方案' : '创建生成方案'
    };
    const views = {
      candidate: A.Candidate,
      round: A.Round,
      preferenceHelp: A.PreferenceHelp,
      costHelp: A.CostHelp,
      task: A.TaskDetail,
      newTask: A.NewTask,
      candidatePool: A.CandidatePool,
      routing: A.Routing,
      scheme: A.SchemeDetail,
      deleteScheme: A.DeleteScheme,
      newScheme: A.NewScheme
    };
    const active = stack.at(-1),
      Drawer = window.AdminAssistantDrawer,
      Confirm = window.ConfirmDialog;
    useEffect(() => {
      if (!data) return;
      if (tab !== 'analysis' || active) loadContext();
      if (tab === 'schemes' || ['scheme', 'newScheme', 'candidatePool'].includes(active?.kind)) loadExtra('catalog');
      if (tab === 'tasks' || ['task', 'routing', 'candidatePool', 'candidate'].includes(active?.kind)) loadAllocations();
    }, [epoch, tab, active?.kind, !!data, loadExtra, loadAllocations, loadContext]);
    useEffect(() => {
      if (active) document.querySelector('.apd-drawer > header button')?.focus();
    }, [active?.key]);
    const errorLabels = {
      settings: '开放设置',
      configs: '方案版本',
      tasks: '评估任务',
      context: '正式配置与资源',
      catalog: '模型目录',
      allocations: '投放预览',
      permission: '管理员权限'
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "apd"
    }, /*#__PURE__*/React.createElement("div", {
      className: "apd-main",
      ref: node => {
        node?.toggleAttribute('inert', !!(active || confirmation));
      }
    }, /*#__PURE__*/React.createElement("header", {
      className: "apd-heading"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, t('正文抽卡', 'Prose draws')), /*#__PURE__*/React.createElement("p", null, t('对照用户偏好，管理方案与投放。', 'Compare user preferences and manage evaluation traffic.'))), /*#__PURE__*/React.createElement(Button, {
      disabled: loading || busy,
      onClick: refresh
    }, loading ? '正在读取…' : '刷新数据')), Object.entries(errors).map(([key, message]) => /*#__PURE__*/React.createElement(Notice, {
      error: true,
      key: key,
      action: /*#__PURE__*/React.createElement(Button, {
        disabled: loading,
        onClick: refresh
      }, "\u91CD\u8BD5")
    }, errorLabels[key], "\uFF1A", message)), data && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Tabs, {
      label: "\u6B63\u6587\u62BD\u5361\u7BA1\u7406",
      items: [{
        id: 'analysis',
        label: '效果分析'
      }, {
        id: 'tasks',
        label: '评估任务'
      }, {
        id: 'schemes',
        label: '生成方案'
      }],
      value: tab,
      onChange: setTab
    }), tab === 'analysis' ? /*#__PURE__*/React.createElement(A.Analysis, {
      app: app
    }) : tab === 'tasks' ? /*#__PURE__*/React.createElement(A.Tasks, {
      app: app
    }) : /*#__PURE__*/React.createElement(A.Schemes, {
      app: app
    })), !data && loading && /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, "\u6B63\u5728\u8BFB\u53D6\u7BA1\u7406\u5458\u6570\u636E\u2026"), actionError && !active && /*#__PURE__*/React.createElement(Notice, {
      error: true
    }, actionError)), active && data && /*#__PURE__*/React.createElement(Drawer, {
      title: titles[active.kind],
      className: 'apd-drawer' + (active.kind === 'round' ? ' apd-drawer-wide' : ''),
      onClose: back,
      closeLabel: stack.length > 1 ? '返回' : '关闭',
      busy: busy || !!confirmation
    }, actionError && /*#__PURE__*/React.createElement(Notice, {
      error: true
    }, actionError), stack.map(route => {
      const View = views[route.kind];
      return /*#__PURE__*/React.createElement("div", {
        key: route.key,
        className: "apd-route",
        hidden: route.key !== active.key,
        ref: node => {
          node?.toggleAttribute('inert', !!(route.key !== active.key || confirmation));
        }
      }, /*#__PURE__*/React.createElement(View, {
        app: app,
        route: route
      }));
    })), /*#__PURE__*/React.createElement(Confirm, {
      open: !!confirmation,
      title: confirmation?.title,
      message: confirmation?.message,
      confirmLabel: busy ? '正在处理…' : confirmation?.label,
      cancelLabel: "\u53D6\u6D88",
      confirmDisabled: busy,
      tone: confirmation?.danger ? 'danger' : 'default',
      className: "apd-confirm",
      onClose: () => {
        if (!pending.current) {
          setConfirmation(null);
          setConfirmError('');
        }
      },
      onConfirm: submitConfirmation
    }, confirmation?.content, confirmError && /*#__PURE__*/React.createElement(Notice, {
      error: true
    }, confirmError)));
  }
  window.AdminProseDrawTab = AdminProseDrawTab;
})();
}
