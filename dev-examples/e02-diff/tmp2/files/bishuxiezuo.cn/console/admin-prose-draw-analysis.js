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
      Tabs,
      Table,
      Detail,
      Empty,
      Facts,
      Tag,
      SchemeLabel,
      shortId,
      date,
      useRead,
      ReadState
    } = A;
  function Baseline({
    app,
    task,
    financial
  }) {
    const scheme = app.scheme(task.baseline_config_id);
    const metrics = financial?.configs?.[task.baseline_config_id];
    return /*#__PURE__*/React.createElement("div", {
      className: "apd-baseline"
    }, /*#__PURE__*/React.createElement("span", null, t('比较基准', 'Comparison baseline')), /*#__PURE__*/React.createElement(SchemeLabel, {
      scheme: scheme,
      onClick: () => app.open('scheme', scheme && scheme.id)
    }), /*#__PURE__*/React.createElement("span", null, t('平均/P95耗时', 'Mean/P95 duration'), " ", /*#__PURE__*/React.createElement(DurationPair, {
      value: metrics
    })), /*#__PURE__*/React.createElement("span", null, t('平均/P95费用', 'Mean/P95 cost'), " ", /*#__PURE__*/React.createElement(CostPair, {
      value: metrics
    })), /*#__PURE__*/React.createElement(Button, {
      link: true,
      onClick: () => app.open('task', task.id)
    }, t('管理此任务', 'Manage task')));
  }
  function DurationPair({
    value
  }) {
    const format = ms => C.number(ms) && ms >= 0 ? (ms / 1000).toFixed(1) + ' s' : '—';
    return /*#__PURE__*/React.createElement("span", {
      title: t('执行耗时；已知样本 ', 'Execution duration; known samples ') + C.count(value?.execution_duration_known_tasks) + '/' + C.count(value?.task_count)
    }, format(value?.execution_duration_mean_ms), " / ", format(value?.execution_duration_p95_ms), value?.execution_duration_availability === 'partial' && /*#__PURE__*/React.createElement("small", null, t('部分已知', 'Partial')));
  }
  function CostPair({
    value
  }) {
    const entries = Object.entries(value?.cost_statistics || {});
    const format = amount => amount !== null && amount !== undefined && amount !== '' && Number.isFinite(Number(amount)) && Number(amount) >= 0 ? Number(amount).toLocaleString('en-US', {
      maximumFractionDigits: 6
    }) : '—';
    return /*#__PURE__*/React.createElement("span", {
      title: t('模型计价成本；仅完整计价样本', 'Model pricing cost; fully priced samples only')
    }, entries.length ? entries.map(([currency, stats], i) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: currency
    }, i > 0 && /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
      title: t('样本 ', 'Samples ') + C.count(stats.sample_count)
    }, currency, " ", format(stats.mean), " / ", format(stats.p95)))) : '— / —', entries.length > 0 && value.cost_status !== 'known' && /*#__PURE__*/React.createElement("small", null, t('部分已知', 'Partial')));
  }
  function Analysis({
    app
  }) {
    const eligibleTasks = app.analysisScope === 'official' ? app.tasks.filter(row => row.baseline_config_id === app.analysisOfficialConfig?.id) : app.tasks;
    const task = eligibleTasks.find(row => row.id === app.selectedTask) || eligibleTasks[0],
      [tab, setTab] = React.useState('feedback'),
      [selectedBaseline, setSelectedBaseline] = React.useState(null);
    const historical = app.analysisScope === 'task' && selectedBaseline?.taskId === task?.id;
    const baselineId = historical ? selectedBaseline.id : task?.baseline_config_id;
    const viewedTask = task && {
      ...task,
      baseline_config_id: baselineId
    };
    const baselineVersions = task ? task.baseline_versions || [app.scheme(task.baseline_config_id)].filter(Boolean) : [];
    const report = useRead(signal => app.api.statistics(task.id, app.guidance, signal, baselineId), (task?.id || '') + ':' + baselineId + ':' + app.guidance + ':' + app.epoch, !!task);
    React.useEffect(() => {
      if (!task || !report.loading && (report.data || report.error)) app.loadContext();
      if (report.data && !report.loading && !report.error) app.loadAllocations();
    }, [!!task, report.data, report.loading, report.error, app.epoch, app.loadAllocations, app.loadContext]);
    const rows = task ? C.feedbackRows(viewedTask, app.configs, report.data) : [];
    const isHistorical = baselineId !== task?.baseline_config_id || report.data?.candidate_policies_scope === 'historical_baseline_uncached';
    const scopeControl = /*#__PURE__*/React.createElement(Field, {
      label: "\u5206\u6790\u8303\u56F4"
    }, /*#__PURE__*/React.createElement("select", {
      value: app.analysisScope,
      onChange: e => {
        app.setAnalysisScope(e.target.value);
        setSelectedBaseline(null);
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "official"
    }, "\u6700\u65B0\u6B63\u5F0F\u7248\u672C"), /*#__PURE__*/React.createElement("option", {
      value: "task"
    }, "\u6309\u4EFB\u52A1\u67E5\u770B")));
    if (!task) return /*#__PURE__*/React.createElement(React.Fragment, null, scopeControl, /*#__PURE__*/React.createElement(Empty, {
      action: /*#__PURE__*/React.createElement(Button, {
        primary: true,
        disabled: !app.context || !app.configs.length,
        onClick: () => app.open('newTask')
      }, t('新建评估任务', 'Create evaluation'))
    }, app.analysisScope === 'official' ? '暂无与最新正式版本直接比较的任务；可切换范围查看其他任务。' : t('还没有评估任务', 'No evaluations yet')));
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "apd-toolbar"
    }, scopeControl, /*#__PURE__*/React.createElement(Field, {
      label: t('评估任务', 'Evaluation')
    }, /*#__PURE__*/React.createElement("select", {
      value: task.id,
      onChange: e => {
        app.setSelectedTask(e.target.value);
        setSelectedBaseline(null);
      }
    }, eligibleTasks.map(row => /*#__PURE__*/React.createElement("option", {
      value: row.id,
      key: row.id
    }, row.name)))), app.analysisScope === 'task' && /*#__PURE__*/React.createElement(Field, {
      label: "\u57FA\u51C6\u7248\u672C"
    }, /*#__PURE__*/React.createElement("select", {
      value: baselineId,
      onChange: e => setSelectedBaseline({
        taskId: task.id,
        id: e.target.value
      })
    }, baselineVersions.map(version => /*#__PURE__*/React.createElement("option", {
      key: version.id,
      value: version.id
    }, C.versionLabel(version), version.id === task.baseline_config_id ? '（当前）' : '')))), /*#__PURE__*/React.createElement(Field, {
      label: t('本章指导', 'Chapter guidance')
    }, /*#__PURE__*/React.createElement("select", {
      value: app.guidance === null ? '' : String(app.guidance),
      onChange: e => app.setGuidance(e.target.value === '' ? null : e.target.value === 'true')
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, t('全部', 'All')), /*#__PURE__*/React.createElement("option", {
      value: "true"
    }, t('有本章指导', 'With guidance')), /*#__PURE__*/React.createElement("option", {
      value: "false"
    }, t('无本章指导', 'Without guidance')))), /*#__PURE__*/React.createElement("small", {
      className: "apd-push"
    }, report.data ? t('数据截至 ', 'As of ') + date(report.data.computed_at) : ''), /*#__PURE__*/React.createElement(Button, {
      disabled: report.loading,
      onClick: report.refresh
    }, t('刷新', 'Refresh'))), /*#__PURE__*/React.createElement(Baseline, {
      app: app,
      task: viewedTask,
      financial: !report.loading && !report.error ? report.data?.financial : null
    }), isHistorical && /*#__PURE__*/React.createElement(Notice, null, "\u5386\u53F2\u7248\u672C\u5BF9\u7684\u7EDF\u8BA1\uFF0C\u4E0D\u53C2\u4E0E\u5F53\u524D\u6295\u653E\u51B3\u7B56\u3002"), !app.settings.enabled && /*#__PURE__*/React.createElement(Notice, null, t('全局未开放；已有轮次继续执行和接收选择。', 'New draws are disabled. Accepted rounds and feedback continue.')), !C.isV2(task) && /*#__PURE__*/React.createElement(Notice, null, t('此任务沿用旧版调度口径。双胜率用于分析；新的评估任务使用大盘调度。', 'This evaluation retains its original scheduling policy. New evaluations use market preference.')), /*#__PURE__*/React.createElement(ReadState, {
      state: report
    }, /*#__PURE__*/React.createElement(Panel, {
      title: t('用户偏好', 'User preference'),
      action: /*#__PURE__*/React.createElement(Button, {
        link: true,
        onClick: () => app.open('preferenceHelp', null, {
          taskId: task.id
        })
      }, t('两种口径怎么算', 'How votes are counted'))
    }, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: t('候选偏好比较', 'Candidate preference comparison'),
      rows: rows,
      rowKey: "id",
      empty: t('候选池为空', 'No candidates'),
      columns: [{
        key: 'scheme',
        header: t('候选方案 / 变化项', 'Candidate / changes'),
        render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
          link: true,
          onClick: () => app.open('candidate', row.id, {
            taskId: task.id,
            guidance: app.guidance,
            baselineId
          })
        }, row.scheme ? C.versionLabel(row.scheme) : shortId(row.id)), /*#__PURE__*/React.createElement("small", null, shortId(row.id), " \xB7 ", C.changes(app.scheme(baselineId), row.scheme).join(' + ')))
      }, {
        key: 'market',
        header: t('大盘胜率', 'Market win rate'),
        headerDescription: t('每轮首次有效盲选；用于新任务的优先流量排序。', 'All valid first choices, used for priority allocation.'),
        render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", {
          className: "apd-rate"
        }, C.percent(row.statistics.market_win_rate)), /*#__PURE__*/React.createElement("small", null, C.count(row.statistics.market_wins), " ", t('胜', 'wins'), " / ", C.count(row.statistics.market_losses), " ", t('负', 'losses')))
      }, {
        key: 'capped',
        header: t('受限胜率', 'Capped win rate'),
        headerDescription: 'K = ' + (task.policy.user_vote_cap || 1),
        render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", {
          className: "apd-rate secondary"
        }, C.percent(row.statistics.capped_win_rate)), /*#__PURE__*/React.createElement("small", null, t('折算 ', 'Weighted '), C.weight(row.statistics.capped_wins), " / ", C.weight(row.statistics.capped_losses)))
      }, {
        key: 'users',
        header: t('参与用户', 'Users'),
        render: row => C.count(row.statistics.feedback_users)
      }, {
        key: 'duration',
        header: t('平均/P95耗时', 'Mean/P95 duration'),
        render: row => /*#__PURE__*/React.createElement(DurationPair, {
          value: report.data?.financial?.configs?.[row.id]
        })
      }, {
        key: 'cost',
        header: t('平均/P95费用', 'Mean/P95 cost'),
        render: row => /*#__PURE__*/React.createElement(CostPair, {
          value: report.data?.financial?.configs?.[row.id]
        })
      }, {
        key: 'state',
        header: t('当前投放', 'Delivery'),
        render: row => !isHistorical ? /*#__PURE__*/React.createElement(A.Exposure, {
          app: app,
          task: task,
          member: row.policy
        }) : '历史统计'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      className: "apd-footnote"
    }, t('均不满意、待反馈、失败不计胜负；改选不追加票。', 'Rejection, pending feedback and failure are separate; reselections do not add votes.'))), /*#__PURE__*/React.createElement(Panel, {
      title: t('补充指标', 'Other metrics'),
      action: /*#__PURE__*/React.createElement(Tabs, {
        label: t('补充指标', 'Metrics'),
        items: [{
          id: 'feedback',
          label: t('用户反馈', 'Feedback')
        }, {
          id: 'cost',
          label: t('生成与成本', 'Generation and cost')
        }],
        value: tab,
        onChange: setTab
      })
    }, tab === 'feedback' ? /*#__PURE__*/React.createElement(Table, {
      ariaLabel: t('轮次反馈', 'Round feedback'),
      rows: rows,
      rowKey: "id",
      columns: [{
        key: 'name',
        header: t('方案', 'Version'),
        render: row => row.scheme ? C.versionLabel(row.scheme) : shortId(row.id)
      }, ...[['presented', '已展示轮次'], ['rejected_all', '两篇均不满意'], ['pending_feedback', '待反馈'], ['current_adoptions', '当前采用'], ['reselection_count', '改选次数']].map(([key, header]) => ({
        key,
        header,
        render: row => C.count(row.statistics[key])
      }))]
    }) : /*#__PURE__*/React.createElement(Table, {
      ariaLabel: t('生成与成本', 'Generation and costs'),
      rows: rows,
      rowKey: "id",
      columns: [{
        key: 'name',
        header: t('方案', 'Version'),
        render: row => row.scheme ? C.versionLabel(row.scheme) : shortId(row.id)
      }, ...[['allocated', '分配轮次'], ['execution_success', '生成成功'], ['execution_failure', '生成失败'], ['in_flight', '进行中']].map(([key, header]) => ({
        key,
        header,
        render: row => C.count(row.statistics[key])
      })), {
        key: 'cost',
        header: t('已知模型成本', 'Known model cost'),
        render: row => /*#__PURE__*/React.createElement(Cost, {
          value: report.data && report.data.financial && report.data.financial.configs && report.data.financial.configs[row.id]
        })
      }]
    }), /*#__PURE__*/React.createElement("div", {
      className: "apd-footnote"
    }, tab === 'feedback' ? t('当前采用与首次偏好分别保留。', 'Current adoption and first preference remain separate.') : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, t('模型计价记录；不等同支付结算回执。', 'Model pricing records, not payment settlement receipts.')), /*#__PURE__*/React.createElement(Button, {
      link: true,
      onClick: () => app.open('costHelp', null, {
        taskId: task.id,
        baselineId
      })
    }, t('成本明细', 'Cost details')))))));
  }
  function Cost({
    value
  }) {
    const totals = value && value.known_cost_subtotals || {};
    return /*#__PURE__*/React.createElement(React.Fragment, null, Object.keys(totals).length ? Object.entries(totals).map(([currency, amount]) => /*#__PURE__*/React.createElement("span", {
      key: currency
    }, currency, " ", amount, /*#__PURE__*/React.createElement("br", null))) : t('未知', 'Unknown'), /*#__PURE__*/React.createElement("small", null, value && value.cost_status === 'known' ? t('完整覆盖', 'Complete') : value && value.cost_status === 'partial' ? t('部分已知', 'Partial') : t('无成本记录', 'No cost record')));
  }
  function Candidate({
    app,
    route
  }) {
    const task = app.task(route.taskId),
      scheme = app.scheme(route.id),
      baselineId = route.baselineId || task.baseline_config_id;
    const report = useRead(signal => app.api.statistics(task.id, route.guidance, signal, baselineId), task.id + ':' + baselineId + ':' + route.id + ':' + route.guidance + ':' + app.epoch);
    const [page, setPage] = React.useState(1);
    const records = useRead(signal => app.api.rounds(task.id, {
      config_id: route.id,
      baseline_config_id: baselineId,
      has_chapter_guidance: route.guidance,
      limit: 20,
      offset: (page - 1) * 20
    }, signal), task.id + ':' + baselineId + ':' + route.id + ':' + route.guidance + ':' + page + ':' + app.epoch);
    const row = C.feedbackRows(task, app.configs, report.data).find(item => item.id === route.id),
      stats = row && row.statistics || {},
      evidence = row && row.policy.statistics || {};
    const isHistorical = !!(row?.superseded_by_config_id || row?.policy?.superseded_by_config_id) || baselineId !== task.baseline_config_id || report.data?.candidate_policies_scope === 'historical_baseline_uncached';
    const allocation = app.allocationFor(task.id),
      projected = allocation?.candidate_probabilities?.find(item => item.config_id === route.id);
    const joint = C.number(allocation?.task_selection_probability) && C.number(projected?.probability) ? allocation.task_selection_probability * projected.probability : null;
    return /*#__PURE__*/React.createElement(Detail, {
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
        onClick: () => app.open('scheme', route.id)
      }, t('查看方案版本', 'View version')), /*#__PURE__*/React.createElement(Button, {
        primary: true,
        onClick: () => app.open('task', task.id)
      }, t('管理候选池', 'Manage candidates')))
    }, /*#__PURE__*/React.createElement("div", {
      className: "apd-baseline"
    }, /*#__PURE__*/React.createElement("span", null, task.name, " / ", scheme && scheme.model_ref), /*#__PURE__*/React.createElement(Tag, null, route.guidance === null || route.guidance === undefined ? '全部' : route.guidance ? '有本章指导' : '无本章指导')), /*#__PURE__*/React.createElement(ReadState, {
      state: report
    }, /*#__PURE__*/React.createElement(Panel, {
      title: t('首次偏好', 'First preference'),
      action: /*#__PURE__*/React.createElement(Button, {
        link: true,
        onClick: () => app.open('preferenceHelp', null, {
          taskId: task.id
        })
      }, t('统计口径', 'Definition'))
    }, /*#__PURE__*/React.createElement("div", {
      className: "apd-metrics"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("small", null, t('大盘胜率', 'Market win rate')), /*#__PURE__*/React.createElement("strong", null, C.percent(stats.market_win_rate)), /*#__PURE__*/React.createElement("small", null, C.count(stats.market_wins), " / ", C.count(stats.market_losses))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("small", null, t('受限胜率', 'Capped win rate'), " \xB7 K = ", task.policy.user_vote_cap || 1), /*#__PURE__*/React.createElement("strong", null, C.percent(stats.capped_win_rate)), /*#__PURE__*/React.createElement("small", null, C.weight(stats.capped_wins), " / ", C.weight(stats.capped_losses))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("small", null, t('有效轮次', 'Valid rounds')), /*#__PURE__*/React.createElement("strong", null, C.number(stats.market_wins) && C.number(stats.market_losses) ? C.count(stats.market_wins + stats.market_losses) : '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("small", null, t('参与用户', 'Users')), /*#__PURE__*/React.createElement("strong", null, C.count(stats.feedback_users))))), !isHistorical && /*#__PURE__*/React.createElement(Panel, {
      title: "\u5F53\u524D\u5206\u914D\u9884\u89C8"
    }, /*#__PURE__*/React.createElement("div", {
      className: "apd-metrics three"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("small", null, "\u4EFB\u52A1\u547D\u4E2D\u6982\u7387"), /*#__PURE__*/React.createElement("strong", null, C.percent(allocation?.task_selection_probability))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("small", null, "\u4EFB\u52A1\u5185\u5019\u9009\u6982\u7387"), /*#__PURE__*/React.createElement("strong", null, C.percent(projected?.probability))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("small", null, "\u8054\u5408\u6982\u7387"), /*#__PURE__*/React.createElement("strong", null, C.percent(joint)))), /*#__PURE__*/React.createElement("p", {
      className: "apd-footnote"
    }, "\u5168\u4EFB\u52A1\u7F13\u5B58\u7EDF\u8BA1\uFF0C\u622A\u81F3 ", date(projected?.statistics_computed_at), "\uFF1B\u6307\u5BFC\u7B5B\u9009\u4E0D\u6539\u53D8\u6295\u653E\u3002")), isHistorical ? /*#__PURE__*/React.createElement(Notice, null, "\u5386\u53F2\u7248\u672C\u5BF9\u7684\u7EDF\u8BA1\uFF0C\u4E0D\u663E\u793A\u5F53\u524D\u505C\u6295\u5224\u636E\u3002") : evidence.availability === 'not_calibrated' ? /*#__PURE__*/React.createElement(Notice, null, t('新版自动停投判据待校准，可在候选池中手动暂停。受限胜率不触发停投。', 'Automatic stopping awaits calibration. Manual pausing remains available; capped preference does not trigger stopping.')) : row && row.policy.pause_reason === 'posterior_stop' ? /*#__PURE__*/React.createElement(Notice, null, /*#__PURE__*/React.createElement("strong", null, t('已自动停投 · 历史旧口径', 'Automatically stopped under the original policy')), /*#__PURE__*/React.createElement("p", null, t('全量独立用户 ', 'Full independent users '), C.count(evidence.independent_users), " \xB7 ", t('偏好率低于 45% 的后验概率 ', 'Posterior probability below 45% '), C.percent(evidence.probability_below_45_percent))) : row && row.policy.pause_reason && /*#__PURE__*/React.createElement(Notice, null, A.reasonLabel(row.policy.pause_reason))), /*#__PURE__*/React.createElement(ReadState, {
      state: records
    }, /*#__PURE__*/React.createElement(Panel, {
      title: t('抽卡记录', 'Draw records')
    }, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: t('抽卡记录', 'Draw records'),
      rows: records.data && records.data.items || [],
      rowKey: "round_id",
      pagination: records.data ? {
        page,
        pageSize: 20,
        total: records.data.total,
        pages: Math.max(1, Math.ceil(records.data.total / 20)),
        onPageChange: setPage
      } : null,
      columns: [{
        key: 'round',
        header: t('轮次 / 章节', 'Round / chapter'),
        render: item => /*#__PURE__*/React.createElement(React.Fragment, null, shortId(item.round_id), /*#__PURE__*/React.createElement("small", null, t('第 ', 'Chapter '), item.chapter_number, t(' 章', ''), " \xB7 ", date(item.created_at)))
      }, {
        key: 'first',
        header: t('首次反馈', 'First feedback'),
        render: item => item.first_feedback === 'reject_all' ? '两篇均不满意' : item.first_feedback === 'pending' ? '待反馈' : C.displayChoice(item, item.first_choice_candidate_id)
      }, {
        key: 'selected',
        header: t('当前采用', 'Current adoption'),
        render: item => item.selected_candidate_id ? C.displayChoice(item, item.selected_candidate_id) : '未采用'
      }, {
        key: 'reselect',
        header: t('改选', 'Reselections'),
        render: item => C.count(item.reselection_count)
      }, {
        key: 'open',
        header: t('操作', 'Actions'),
        render: item => /*#__PURE__*/React.createElement(Button, {
          link: true,
          onClick: () => app.open('round', item.round_id, {
            taskId: task.id
          })
        }, t('正文对照', 'Compare prose'))
      }]
    }))));
  }
  function Round({
    app,
    route
  }) {
    const state = useRead(signal => app.api.round(route.taskId, route.id, signal), route.taskId + ':' + route.id),
      [tab, setTab] = React.useState('prose');
    const round = state.data && state.data.round,
      events = state.data && state.data.events || [];
    const first = C.firstFeedback(events);
    const current = round && C.selectionLabel(round, round.selected_candidate_id),
      snapshot = round && round.allocation_snapshot;
    return /*#__PURE__*/React.createElement(Detail, {
      footer: /*#__PURE__*/React.createElement(Button, {
        onClick: app.back
      }, t('返回候选表现', 'Back'))
    }, /*#__PURE__*/React.createElement(ReadState, {
      state: state
    }, round && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "apd-row"
    }, /*#__PURE__*/React.createElement(Tag, null, t('首次反馈：', 'First feedback: '), first ? first.type === 'reject_all' ? '两篇均不满意' : C.selectionLabel(round, first.candidate_id || first.payload?.candidate_id) || '未取得选择身份' : '待反馈'), /*#__PURE__*/React.createElement(Tag, null, t('当前采用：', 'Current adoption: '), current || t('未采用', 'None')), /*#__PURE__*/React.createElement("small", null, t('第 ', 'Chapter '), round.chapter_number, t(' 章', ''))), /*#__PURE__*/React.createElement(Tabs, {
      label: t('轮次详情', 'Round details'),
      items: [{
        id: 'prose',
        label: t('正文对照', 'Prose')
      }, {
        id: 'events',
        label: t('用户行为', 'Events')
      }, {
        id: 'generation',
        label: t('生成信息', 'Generation')
      }],
      value: tab,
      onChange: setTab
    }), tab === 'prose' ? /*#__PURE__*/React.createElement(React.Fragment, null, round.request_parameters && round.request_parameters.human_intent && /*#__PURE__*/React.createElement("details", {
      className: "apd-help"
    }, /*#__PURE__*/React.createElement("summary", null, t('本章指导', 'Chapter guidance')), /*#__PURE__*/React.createElement("p", {
      className: "apd-prewrap"
    }, round.request_parameters.human_intent)), /*#__PURE__*/React.createElement("div", {
      className: "apd-readers"
    }, (round.display_order || []).map((id, index) => {
      const candidate = (round.candidates || []).find(item => item.candidate_id === id);
      if (!candidate) return null;
      const scheme = app.scheme(candidate.config_id);
      return /*#__PURE__*/React.createElement("article", {
        className: "apd-reader",
        key: id
      }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("strong", null, index === 0 ? 'A' : 'B', " \xB7 ", candidate.role === 'official' ? t('比较基准', 'Baseline') : t('候选方案', 'Challenger')), /*#__PURE__*/React.createElement(SchemeLabel, {
        scheme: scheme,
        onClick: () => app.open('scheme', candidate.config_id)
      }), first && (first.candidate_id || first.payload?.candidate_id) === id && /*#__PURE__*/React.createElement(Tag, null, "\u9996\u6B21\u9009\u62E9"), round.selected_candidate_id === id && /*#__PURE__*/React.createElement(Tag, null, "\u5F53\u524D\u91C7\u7528")), /*#__PURE__*/React.createElement("div", {
        className: "apd-prose",
        tabIndex: 0,
        "aria-label": (index === 0 ? 'A' : 'B') + ' 正文'
      }, candidate.body || t('暂无正文', 'No prose')), /*#__PURE__*/React.createElement("details", null, /*#__PURE__*/React.createElement("summary", null, t('原始输出', 'Original output')), /*#__PURE__*/React.createElement("pre", null, candidate.original_output || t('未取得', 'Unavailable'))));
    }))) : tab === 'events' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: t('用户行为时间线', 'Event timeline'),
      rows: events,
      rowKey: "id",
      columns: [{
        key: 'time',
        header: '时间',
        render: event => date(event.created_at)
      }, {
        key: 'kind',
        header: '行为',
        render: event => ({
          allocated: '分配方案',
          presented: '展示候选',
          reject_all: '两篇都不满意',
          adopted: event.payload && event.payload.reselection ? '改选正文' : '首次采用',
          cancel: '取消'
        })[event.type] || event.type
      }, {
        key: 'candidate',
        header: '对象',
        render: event => C.selectionLabel(round, event.candidate_id || event.payload && event.payload.candidate_id) || '—'
      }]
    }), state.data.events_truncated && /*#__PURE__*/React.createElement(Notice, null, "\u4EC5\u663E\u793A\u63A5\u53E3\u8FD4\u56DE\u7684\u90E8\u5206\u884C\u4E3A\u8BB0\u5F55\u3002")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Panel, {
      title: t('本轮分配快照', 'Allocation snapshot')
    }, /*#__PURE__*/React.createElement("div", {
      className: "apd-padding"
    }, /*#__PURE__*/React.createElement(Facts, {
      entries: [[t('任务', 'Task'), app.task(route.taskId).name], [t('用户', 'User'), round.actor_ref], [t('调度版本', 'Policy'), round.policy_version], [t('投放修订', 'Routing revision'), snapshot?.routing_revision ? 'R' + snapshot.routing_revision : null], [t('任务命中概率', 'Task probability'), C.percent(snapshot && snapshot.task_selection_probability)], [t('任务内候选概率', 'Conditional probability'), C.percent(round.selection_probability)], [t('联合概率', 'Joint probability'), C.percent(snapshot && snapshot.joint_selection_probability)], ['任务权重 / 合格权重和', snapshot ? snapshot.traffic_weight + ' / ' + snapshot.eligible_weight_sum : null], ['探索比例', C.percent(snapshot?.exploration_probability)], ['每用户总票权 K', snapshot?.user_vote_cap], ['统计截至', date(snapshot?.statistics_computed_at)], ['当时合格候选', snapshot?.eligible_candidate_ids?.map(id => app.scheme(id)?.name || id).join('、')]]
    }))), /*#__PURE__*/React.createElement(Table, {
      ariaLabel: t('生成结果', 'Generation result'),
      rows: round.candidates || [],
      rowKey: "candidate_id",
      columns: [{
        key: 'config',
        header: '配置版本',
        render: item => /*#__PURE__*/React.createElement(Button, {
          link: true,
          onClick: () => app.open('scheme', item.config_id)
        }, app.scheme(item.config_id) ? app.scheme(item.config_id).name : shortId(item.config_id))
      }, {
        key: 'status',
        header: '生成状态',
        render: item => item.status === 'completed' ? '已完成' : A.statusLabel(item.status)
      }, {
        key: 'match',
        header: '配置校验',
        render: item => item.execution_match === true ? '一致' : item.execution_match === false ? '未确认一致' : '未取得'
      }, {
        key: 'duration',
        header: '执行耗时',
        render: item => C.number(item.execution_duration_ms) ? (item.execution_duration_ms / 1000).toFixed(1) + ' s' : '未取得'
      }]
    })))));
  }
  function PreferenceHelp({
    app,
    route
  }) {
    const task = app.task(route.taskId);
    return /*#__PURE__*/React.createElement(Detail, null, /*#__PURE__*/React.createElement(Panel, {
      title: "\u540C\u4E00\u6279\u53CD\u9988\uFF0C\u4E24\u79CD\u53E3\u5F84"
    }, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u80DC\u7387\u53E3\u5F84",
      rowKey: "id",
      rows: [{
        id: 'market',
        name: '大盘胜率',
        method: '每轮首次有效盲选计 1 票；同用户不限轮次',
        use: '优先流量排序（先做小样本平滑）'
      }, {
        id: 'cap',
        name: '受限胜率 · K = ' + (task.policy.user_vote_cap || 1),
        method: '同用户胜负共用总票权 K，超额等比例缩放',
        use: '辅助对照，不覆盖大盘或单独停投'
      }],
      columns: [{
        key: 'name',
        header: '口径'
      }, {
        key: 'method',
        header: '计票方法'
      }, {
        key: 'use',
        header: '用途'
      }]
    })), /*#__PURE__*/React.createElement(Panel, {
      title: "\u540C\u4E00\u7528\u6237 80 \u80DC\u300120 \u8D1F"
    }, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u6BD4\u4F8B\u6298\u7B97\u6837\u4F8B",
      rowKey: "id",
      rows: [{
        id: 'raw',
        name: '大盘',
        w: '80',
        l: '20'
      }, {
        id: '10',
        name: '受限 K = 10',
        w: '8',
        l: '2'
      }, {
        id: '1',
        name: '受限 K = 1',
        w: '0.80',
        l: '0.20'
      }],
      columns: [{
        key: 'name',
        header: '口径'
      }, {
        key: 'w',
        header: '候选胜'
      }, {
        key: 'l',
        header: '基准胜'
      }]
    })), /*#__PURE__*/React.createElement("div", {
      className: "apd-copy"
    }, /*#__PURE__*/React.createElement("p", null, "\u7F29\u653E\u7CFB\u6570 = min(1, K \xF7 \u8BE5\u7528\u6237\u6709\u6548\u8F6E\u6B21)\u3002\u540C\u4E00\u7528\u6237\u5728\u540C\u4E00\u4EFB\u52A1\u3001\u540C\u4E00\u57FA\u51C6\u4E0E\u5019\u9009\u7248\u672C\u5BF9\u7684\u80DC\u3001\u8D1F\u4E58\u540C\u4E00\u4E2A\u7CFB\u6570\uFF0C\u518D\u6C47\u603B\u8BA1\u7B97\u80DC\u7387\u3002\u5C0F\u6570\u8868\u793A\u7968\u6743\uFF0C\u6240\u6709\u539F\u59CB\u9009\u62E9\u5B8C\u6574\u4FDD\u5B58\u3002"), /*#__PURE__*/React.createElement("p", null, "\u672A\u8D85\u989D\u4E0D\u653E\u5927\uFF1B\u4E0D\u5206\u522B\u5C01\u9876\u6B63\u8D1F\u7968\uFF0C\u4E5F\u4E0D\u53EA\u4FDD\u7559\u524D K \u7968\u3002\u672C\u7AE0\u6307\u5BFC\u7B5B\u9009\u5148\u7528\u540C\u4E00\u7248\u672C\u5BF9\u7684\u5168\u90E8\u53CD\u9988\u8BA1\u7B97\u7CFB\u6570\uFF0C\u518D\u5206\u7EC4\u6C47\u603B\uFF0C\u4E0D\u91CD\u65B0\u83B7\u5F97\u989D\u5EA6\u3002"), /*#__PURE__*/React.createElement("p", null, "\u4E24\u7BC7\u5747\u4E0D\u6EE1\u610F\u3001\u5F85\u53CD\u9988\u3001\u5931\u8D25\u5355\u5217\uFF1B\u6539\u9009\u4FDD\u7559\u884C\u4E3A\uFF0C\u4E0D\u8FFD\u52A0\u9996\u6B21\u504F\u597D\u7968\u3002\u4E0D\u540C\u5019\u9009\u7684\u7528\u6237\u53EF\u80FD\u91CD\u53E0\uFF0C\u4E0D\u80FD\u628A\u5404\u884C\u4EBA\u6570\u76F8\u52A0\u4F5C\u4E3A\u603B\u7528\u6237\u6570\u3002")));
  }
  function CostHelp({
    app,
    route
  }) {
    const baseline = route.baselineId || app.task(route.taskId).baseline_config_id;
    const state = useRead(signal => app.api.statistics(route.taskId, null, signal, baseline), route.taskId + ':' + baseline);
    const financial = state.data?.financial;
    const rows = [{
      stage: 'baseline',
      value: financial?.configs?.[baseline]
    }, ...Object.entries(financial?.shared_stages || {}).map(([stage, value]) => ({
      stage,
      value
    }))];
    return /*#__PURE__*/React.createElement(Detail, null, /*#__PURE__*/React.createElement("p", {
      className: "apd-muted"
    }, "\u672C\u4EFB\u52A1\u6240\u9009\u57FA\u51C6\u7248\u672C\u7684\u6210\u672C\uFF0C\u4E0D\u968F\u6307\u5BFC\u7B5B\u9009\u53D8\u5316\u3002"), /*#__PURE__*/React.createElement(ReadState, {
      state: state
    }, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u57FA\u51C6\u4E0E\u5171\u7528\u6A21\u578B\u6210\u672C",
      rowKey: "stage",
      rows: rows,
      columns: [{
        key: 'stage',
        header: '阶段',
        render: row => ({
          baseline: '比较基准写手',
          prose_draw_prepare: '共用前置准备',
          prose_draw_post_hoc: '采用后处理'
        })[row.stage] || row.stage
      }, {
        key: 'cost',
        header: '已知成本',
        render: row => /*#__PURE__*/React.createElement(Cost, {
          value: row.value
        })
      }]
    }), /*#__PURE__*/React.createElement("p", {
      className: "apd-footnote"
    }, "\u672A\u77E5\u6210\u672C\u4E0D\u8BA1\u4E3A 0\uFF0C\u4E0D\u636E\u6B64\u4F30\u7B97\u5B8C\u6574\u603B\u6210\u672C\uFF1B\u4E0D\u540C\u5E01\u79CD\u5206\u522B\u663E\u793A\u3002\u6A21\u578B\u8BA1\u4EF7\u8BB0\u5F55\u4E0D\u7B49\u540C\u652F\u4ED8\u7ED3\u7B97\u56DE\u6267\u3002")));
  }
  Object.assign(A, {
    Analysis,
    Candidate,
    Round,
    PreferenceHelp,
    CostHelp,
    Cost,
    Baseline
  });
})();
}
