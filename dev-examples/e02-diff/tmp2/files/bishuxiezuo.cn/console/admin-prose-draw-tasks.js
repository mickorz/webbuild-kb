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
      Table,
      Detail,
      Empty,
      Tag,
      Facts,
      SchemeLabel,
      shortId,
      date,
      useRead,
      ReadState,
      RoutingFields,
      useFormGuard
    } = A;
  function Exposure({
    app,
    task,
    member
  }) {
    const allocation = app.allocationFor(task.id),
      candidate = allocation && (allocation.candidate_probabilities || []).find(item => item.config_id === member.config_id);
    let text;
    if (member.superseded_by_config_id) text = '历史版本';else if (member.pause_reason) text = A.reasonLabel(member.pause_reason);else if (!member.enabled) text = '手动暂停';else if (!app.settings.enabled) text = '全局未开放';else if (task.status !== 'active') text = A.reasonLabel('task_' + task.status);else if (!allocation) text = '资格待核验';else if (candidate && candidate.eligible && allocation.eligible) text = '参与投放';else text = A.reasonLabel(candidate && candidate.reason || allocation.reason);
    return /*#__PURE__*/React.createElement(Tag, {
      warning: !!member.pause_reason || text === '资源不匹配'
    }, text);
  }
  function Tasks({
    app
  }) {
    const [query, setQuery] = React.useState(''),
      [status, setStatus] = React.useState('');
    const rows = app.tasks.filter(task => (!status || status === task.status) && (!query || (task.name + task.id).toLowerCase().includes(query.toLowerCase())));
    function toggleGlobal() {
      app.confirm({
        title: app.settings.enabled ? '关闭正文抽卡开放？' : '向用户开放正文抽卡？',
        label: app.settings.enabled ? '关闭开放' : '开放功能',
        message: app.settings.enabled ? '停止新报价与新接纳。已受理轮次继续执行，已有候选仍可选择。' : '用户可按作品开启。单写手每轮生成两篇，按生成前显示的实际报价计费。',
        action: () => app.api.setEnabled({
          enabled: !app.settings.enabled,
          expected_revision: app.settings.revision
        })
      });
    }
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "apd-setting"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, t('向用户开放正文抽卡', 'Enable prose draws')), /*#__PURE__*/React.createElement("small", null, t('单写手 · 每轮两篇 · 用户按作品开启', 'Single writer · Two candidates · Enabled per book'))), /*#__PURE__*/React.createElement(Tag, null, app.settings.enabled ? '已开放' : '未开放'), /*#__PURE__*/React.createElement(Button, {
      disabled: app.busy,
      onClick: toggleGlobal
    }, app.settings.enabled ? '关闭开放' : '开放功能')), /*#__PURE__*/React.createElement(PromotionSettings, {
      app: app
    }), /*#__PURE__*/React.createElement("div", {
      className: "apd-toolbar"
    }, /*#__PURE__*/React.createElement(Field, {
      label: t('搜索任务', 'Search evaluations')
    }, /*#__PURE__*/React.createElement("input", {
      type: "search",
      value: query,
      onChange: e => setQuery(e.target.value)
    })), /*#__PURE__*/React.createElement(Field, {
      label: t('任务状态', 'Status')
    }, /*#__PURE__*/React.createElement("select", {
      value: status,
      onChange: e => setStatus(e.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u5168\u90E8\u72B6\u6001"), ['draft', 'active', 'paused', 'completed'].map(value => /*#__PURE__*/React.createElement("option", {
      key: value,
      value: value
    }, A.statusLabel(value))))), /*#__PURE__*/React.createElement(Button, {
      primary: true,
      disabled: !app.context || !app.configs.length || app.busy,
      onClick: () => app.open('newTask')
    }, t('新建评估任务', 'Create evaluation'))), !app.officialConfig && /*#__PURE__*/React.createElement(Notice, {
      action: /*#__PURE__*/React.createElement(Button, {
        disabled: app.busy,
        onClick: app.refresh
      }, "\u5237\u65B0\u6570\u636E")
    }, "\u6B63\u5F0F\u914D\u7F6E\u7248\u672C\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u5237\u65B0\u91CD\u8BD5\uFF1B\u65E0\u9700\u91CD\u590D\u521B\u5EFA\u65B9\u6848\u3002"), /*#__PURE__*/React.createElement(Panel, {
      title: t('评估任务', 'Evaluations')
    }, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u4EFB\u52A1\u6743\u91CD\u5206\u6D41",
      rows: rows,
      rowKey: "id",
      empty: query || status ? '没有匹配的任务' : '还没有评估任务',
      columns: [{
        key: 'name',
        header: '任务 / 基准',
        render: task => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
          link: true,
          onClick: () => app.open('task', task.id)
        }, task.name), /*#__PURE__*/React.createElement("small", null, shortId(task.id), " \xB7 ", C.versionLabel(app.scheme(task.baseline_config_id))))
      }, {
        key: 'status',
        header: '状态 / 候选',
        render: task => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Tag, null, A.statusLabel(task.status)), /*#__PURE__*/React.createElement("small", null, (task.candidates || []).filter(c => c.enabled && !c.superseded_by_config_id).length, " / ", (task.candidates || []).filter(c => !c.superseded_by_config_id).length, " \u5019\u9009\u5141\u8BB8\u6295\u653E"))
      }, {
        key: 'traffic_weight',
        header: '权重'
      }, {
        key: 'share',
        header: '预计流量',
        headerDescription: '在全部可投放任务中按权重分流，不代表全站流量配额。',
        render: task => C.percent(app.allocationFor(task.id)?.task_selection_probability)
      }, {
        key: 'exploration',
        header: '探索 / 优先',
        render: task => C.percent(task.exploration_probability) + ' / ' + C.percent(C.number(task.exploration_probability) ? 1 - task.exploration_probability : null)
      }, {
        key: 'allocated',
        header: '累计投放',
        render: task => {
          const values = (task.candidates || []).map(member => member.statistics && member.statistics.allocated);
          return values.length && values.every(C.number) ? C.count(values.reduce((a, b) => a + b, 0)) : '—';
        }
      }, {
        key: 'action',
        header: '操作',
        render: task => /*#__PURE__*/React.createElement(Button, {
          link: true,
          onClick: () => app.showAnalysis(task.id)
        }, "\u67E5\u770B\u6548\u679C")
      }]
    }), /*#__PURE__*/React.createElement("div", {
      className: "apd-footnote"
    }, "\u9884\u8BA1\u6BD4\u4F8B\u5728\u5168\u90E8\u53EF\u6295\u653E\u4EFB\u52A1\u4E2D\u5F52\u4E00\uFF1B\u5217\u8868\u7B5B\u9009\u4E0D\u6539\u53D8\u5206\u6BCD\u3002\u7D2F\u8BA1\u8F6E\u6B21\u6765\u81EA\u4E0A\u6B21\u7EDF\u8BA1\u3002")));
  }
  function PromotionSettings({
    app
  }) {
    const [draft, setDraft] = React.useState(null);
    const saved = {
      enabled: app.settings.second_candidate_free_enabled === true,
      limit: String(app.settings.second_candidate_free_daily_limit ?? 1),
      revision: app.settings.revision
    };
    const form = draft || saved;
    const changed = form.enabled !== saved.enabled || form.limit !== saved.limit;
    const conflict = !!draft && form.revision !== saved.revision;
    const limit = Number(form.limit);
    const valid = /^\d+$/.test(form.limit) && Number.isSafeInteger(limit) && limit >= 1 && limit <= 2147483647;
    function save() {
      if (!changed || !valid || conflict || app.busy) return;
      app.confirm({
        title: '保存抽卡免费设置？',
        label: '保存设置',
        message: form.enabled ? `每位用户每天可享受 ${limit} 次第二篇免费，超出后收取两份费用。每日北京时间 00:00 重置。` : '关闭第二篇免费，新轮次恢复两份费用；已受理轮次价格不变。',
        action: async () => {
          await app.api.setEnabled({
            second_candidate_free_enabled: form.enabled,
            second_candidate_free_daily_limit: limit,
            expected_revision: form.revision
          });
          setDraft(null);
        }
      });
    }
    return /*#__PURE__*/React.createElement("section", {
      className: "apd-setting apd-promotion",
      "aria-label": "\u62BD\u5361\u514D\u8D39\u8BBE\u7F6E"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "apd-promotion-toggle"
    }, /*#__PURE__*/React.createElement("h2", {
      id: "apd-free-label"
    }, t('抽卡第二篇免费', 'Free second candidate')), /*#__PURE__*/React.createElement("label", {
      className: "set-mail-switch"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      role: "switch",
      "aria-labelledby": "apd-free-label",
      checked: form.enabled,
      disabled: app.busy,
      onChange: e => setDraft({
        ...form,
        enabled: e.target.checked
      })
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }))), /*#__PURE__*/React.createElement("small", null, t('每日北京时间 00:00 重置，额度用完后恢复两份费用。', 'Resets at 00:00 Beijing time; regular pricing applies after the daily limit.'))), /*#__PURE__*/React.createElement(Field, {
      label: t('每用户每日免费次数', 'Free draws per user per day')
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      max: "2147483647",
      step: "1",
      value: form.limit,
      disabled: app.busy,
      "aria-invalid": !valid,
      onChange: e => setDraft({
        ...form,
        limit: e.target.value
      })
    })), /*#__PURE__*/React.createElement(Button, {
      primary: true,
      disabled: app.busy || !changed || !valid || conflict,
      onClick: save
    }, "\u4FDD\u5B58\u8BBE\u7F6E"), !valid && /*#__PURE__*/React.createElement(Notice, {
      error: true
    }, "\u6BCF\u65E5\u514D\u8D39\u6B21\u6570\u987B\u4E3A\u6B63\u6574\u6570\u3002"), conflict && /*#__PURE__*/React.createElement(Notice, {
      error: true,
      action: /*#__PURE__*/React.createElement(Button, {
        onClick: () => setDraft(null)
      }, "\u91CD\u65B0\u8F7D\u5165")
    }, "\u8BBE\u7F6E\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u8F7D\u5165\u540E\u518D\u4FEE\u6539\u3002"));
  }
  function TaskDetail({
    app,
    route
  }) {
    const task = app.task(route.id),
      allocation = app.allocationFor(task.id),
      closed = task.status === 'completed';
    const history = useRead(signal => app.api.history(task.id, signal), task.id + ':' + task.routing_revision);
    function status(next) {
      app.confirm({
        title: next === 'completed' ? '结束评估任务？' : next === 'paused' ? '暂停评估任务？' : '启用评估任务？',
        label: next === 'completed' ? '结束任务' : next === 'paused' ? '暂停任务' : '启用任务',
        danger: next === 'completed',
        message: next === 'completed' ? '结束后不能恢复或修改候选池；历史结果、候选正文和行为继续保留。' : next === 'paused' ? '停止此任务的新投放；已受理轮次继续执行和接收选择。' : '任务将按当前基准与投放参数参与分流，实际接纳仍受全局和作品开关控制。',
        action: () => app.api.updateTask(task.id, {
          status: next
        })
      });
    }
    return /*#__PURE__*/React.createElement(Detail, {
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
        danger: true,
        disabled: closed || app.busy,
        onClick: () => status('completed')
      }, "\u7ED3\u675F\u4EFB\u52A1"), /*#__PURE__*/React.createElement(Button, {
        onClick: () => app.showAnalysis(task.id)
      }, "\u67E5\u770B\u6548\u679C"), !closed && /*#__PURE__*/React.createElement(Button, {
        primary: true,
        disabled: app.busy || task.status !== 'active' && !(task.candidates || []).some(c => c.enabled && !c.superseded_by_config_id),
        onClick: () => status(task.status === 'active' ? 'paused' : 'active')
      }, task.status === 'active' ? '暂停任务' : task.activated_at ? '恢复任务' : '启用任务'))
    }, /*#__PURE__*/React.createElement("div", {
      className: "apd-baseline"
    }, /*#__PURE__*/React.createElement("span", null, task.baseline_mode === 'follow_official' ? '自动跟进正式方案' : '固定版本基准'), /*#__PURE__*/React.createElement(SchemeLabel, {
      scheme: app.scheme(task.baseline_config_id),
      onClick: () => app.open('scheme', task.baseline_config_id)
    }), /*#__PURE__*/React.createElement(Tag, null, A.statusLabel(task.status))), allocation && allocation.reason && /*#__PURE__*/React.createElement(Notice, null, A.reasonLabel(allocation.reason)), /*#__PURE__*/React.createElement(Panel, {
      title: "\u5206\u6D41\u4E0E\u8C03\u5EA6",
      action: /*#__PURE__*/React.createElement(Button, {
        disabled: closed || app.busy,
        onClick: () => app.open('routing', task.id)
      }, "\u8C03\u6574\u6295\u653E")
    }, /*#__PURE__*/React.createElement("div", {
      className: "apd-metrics three"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("small", null, "\u4EFB\u52A1\u6743\u91CD"), /*#__PURE__*/React.createElement("strong", null, task.traffic_weight)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("small", null, "\u9884\u8BA1\u6D41\u91CF"), /*#__PURE__*/React.createElement("strong", null, C.percent(allocation && allocation.task_selection_probability))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("small", null, "\u63A2\u7D22 / \u4F18\u5148"), /*#__PURE__*/React.createElement("strong", null, C.percent(task.exploration_probability), " / ", C.percent(1 - task.exploration_probability)))), /*#__PURE__*/React.createElement("div", {
      className: "apd-footnote"
    }, /*#__PURE__*/React.createElement("span", null, C.isV2(task) ? '优先依据当前版本对的大盘反馈' : '沿用旧版优先排序口径', " \xB7 K = ", task.policy.user_vote_cap || 1, " \xB7 R", task.routing_revision), /*#__PURE__*/React.createElement(Button, {
      link: true,
      onClick: () => app.open('preferenceHelp', null, {
        taskId: task.id
      })
    }, "\u7EDF\u8BA1\u53E3\u5F84"))), /*#__PURE__*/React.createElement(Panel, {
      title: "\u5019\u9009\u6C60",
      action: /*#__PURE__*/React.createElement(Button, {
        disabled: closed,
        onClick: () => app.open('candidatePool', task.id)
      }, "\u6DFB\u52A0\u5019\u9009")
    }, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u4EFB\u52A1\u5019\u9009\u6C60",
      rows: C.candidatesFor(task, app.configs).filter(row => !row.superseded_by_config_id),
      rowKey: "config_id",
      empty: "\u5019\u9009\u6C60\u4E3A\u7A7A",
      columns: [{
        key: 'scheme',
        header: '候选方案',
        render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SchemeLabel, {
          scheme: row.scheme,
          onClick: () => app.open('scheme', row.config_id)
        }), /*#__PURE__*/React.createElement("small", null, C.changes(row.scheme, app.scheme(task.baseline_config_id)).join(' + ')))
      }, {
        key: 'state',
        header: '当前投放',
        render: row => /*#__PURE__*/React.createElement(Exposure, {
          app: app,
          task: task,
          member: row
        })
      }, {
        key: 'probability',
        header: '任务内预计',
        render: row => C.percent(allocation?.eligible ? allocation.candidate_probabilities.find(c => c.config_id === row.config_id)?.probability : allocation ? 0 : null)
      }, {
        key: 'action',
        header: '操作',
        render: row => ['posterior_stop', 'cluster_stop'].includes(row.pause_reason) ? /*#__PURE__*/React.createElement(Button, {
          link: true,
          onClick: () => app.open('candidate', row.config_id, {
            taskId: task.id,
            guidance: null
          })
        }, "\u67E5\u770B\u4F9D\u636E") : /*#__PURE__*/React.createElement(Button, {
          disabled: closed || app.busy,
          onClick: () => app.changeCandidate(task.id, row.config_id, !row.enabled)
        }, row.enabled ? '暂停候选' : '恢复候选')
      }]
    })), /*#__PURE__*/React.createElement("details", {
      className: "apd-help"
    }, /*#__PURE__*/React.createElement("summary", null, "\u5206\u914D\u89C4\u5219\u4E0E\u53C2\u6570\u8BB0\u5F55"), /*#__PURE__*/React.createElement("div", {
      className: "apd-copy"
    }, /*#__PURE__*/React.createElement("p", null, "\u63A2\u7D22\u5728\u53EF\u7528\u5019\u9009\u95F4\u5747\u5206\uFF0C\u4F18\u5148\u6D41\u91CF\u7ED9\u5F97\u5206\u6700\u9AD8\u7684\u5019\u9009\uFF0C\u5E76\u5217\u65F6\u5747\u5206\u3002\u65B0\u4EFB\u52A1\u5F97\u5206 =\uFF08\u5927\u76D8\u80DC\u6570 + 1\uFF09\xF7\uFF08\u5927\u76D8\u80DC\u8D1F\u603B\u6570 + 2\uFF09\u3002"), /*#__PURE__*/React.createElement("p", null, "\u6B63\u5F0F\u57FA\u51C6\u81EA\u52A8\u8DDF\u8FDB\u65B0\u7248\u672C\uFF0C\u5176\u4ED6\u57FA\u51C6\u56FA\u5B9A\u6240\u9009\u7248\u672C\uFF1B\u5404\u7248\u672C\u5BF9\u5355\u72EC\u7EDF\u8BA1\uFF0C\u5DF2\u62A5\u4EF7\u8F6E\u6B21\u4E0D\u5207\u6362\u3002\u6743\u91CD\u3001\u63A2\u7D22\u6BD4\u4F8B\u53EF\u8C03\u6574\u3002"), /*#__PURE__*/React.createElement(ReadState, {
      state: history
    }, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u6295\u653E\u53C2\u6570\u8BB0\u5F55",
      rows: history.data && history.data.items || [],
      rowKey: "revision",
      empty: "\u5C1A\u65E0\u53C2\u6570\u8C03\u6574",
      columns: [{
        key: 'revision',
        header: '修订',
        render: row => 'R' + row.revision
      }, {
        key: 'time',
        header: '时间 / 操作者',
        render: row => /*#__PURE__*/React.createElement(React.Fragment, null, date(row.created_at), /*#__PURE__*/React.createElement("small", null, shortId(row.actor_user_id)))
      }, {
        key: 'weight',
        header: '权重',
        render: row => row.before.traffic_weight + ' → ' + row.after.traffic_weight
      }, {
        key: 'explore',
        header: '探索',
        render: row => C.percent(row.before.exploration_probability) + ' → ' + C.percent(row.after.exploration_probability)
      }]
    })))));
  }
  function CandidateChoices({
    app,
    baseline,
    existing = [],
    selected,
    onChange,
    disabled
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "apd-choices"
    }, app.configs.filter(config => !config.scheme_deleted && config.is_current !== false && config.id !== baseline.id).map(config => {
      const member = existing.find(item => !item.superseded_by_config_id && item.config_id === config.id),
        same = C.equivalent(config, baseline),
        duplicate = existing.some(item => !item.superseded_by_config_id && C.equivalent(config, app.scheme(item.config_id))) || selected.some(id => id !== config.id && C.equivalent(config, app.scheme(id)));
      return /*#__PURE__*/React.createElement("label", {
        className: "apd-choice",
        key: config.id
      }, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        disabled: disabled || !!member || same || duplicate,
        checked: selected.includes(config.id),
        onChange: event => onChange(event.target.checked ? selected.concat(config.id) : selected.filter(id => id !== config.id))
      }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, C.versionLabel(config)), /*#__PURE__*/React.createElement("small", null, config.model_ref, " \xB7 ", config.inject_intent ? '注入意图' : '不注入意图')), (member || same || duplicate) && /*#__PURE__*/React.createElement("small", null, member ? ['posterior_stop', 'cluster_stop'].includes(member.pause_reason) ? '本任务已停投' : '已在池中' : same ? '与基准相同' : '已有相同配置'));
    }));
  }
  function NewTask({
    app,
    route
  }) {
    const initialChoice = 'official';
    const [baselineChoice, setBaselineChoice] = React.useState(initialChoice),
      [form, setForm] = React.useState({
        ...C.routingForm(),
        name: '',
        selected: []
      }),
      [created, setCreated] = React.useState(null),
      [remaining, setRemaining] = React.useState([]),
      [error, setError] = React.useState(''),
      [uncertain, setUncertain] = React.useState(false);
    const key = React.useRef(null),
      frozen = React.useRef(null);
    const baseline = uncertain && frozen.current ? app.scheme(frozen.current.baseline_config_id) : baselineChoice === 'official' ? app.officialConfig : app.scheme(baselineChoice);
    const officialOption = uncertain && baselineChoice === 'official' ? baseline : app.officialConfig;
    const lastBaseline = React.useRef(baseline?.id);
    React.useEffect(() => {
      if (lastBaseline.current !== baseline?.id && !uncertain && !created) setForm(previous => ({
        ...previous,
        selected: []
      }));
      lastBaseline.current = baseline?.id;
    }, [baseline?.id, uncertain, created]);
    React.useEffect(() => {
      if (uncertain || created) return;
      setForm(previous => {
        const selected = previous.selected.filter(id => {
          const config = app.scheme(id);
          return config && !config.scheme_deleted && config.is_current !== false;
        });
        return C.same(selected, previous.selected) ? previous : {
          ...previous,
          selected
        };
      });
    }, [app.configs, app.context, uncertain, created]);
    useFormGuard(app, route, uncertain ? '上次创建结果尚未确认，可重试同一请求核对。退出不会删除已创建的任务。' : created ? '任务已创建，尚未加入的候选可在任务详情继续添加。退出不会删除任务。' : !!(baselineChoice !== initialChoice || form.name || form.selected.length || !C.same({
      weight: form.weight,
      exploration: form.exploration,
      cap: form.cap
    }, C.routingForm())));
    if (!baseline) return /*#__PURE__*/React.createElement(Detail, null, /*#__PURE__*/React.createElement(Notice, null, "\u6BD4\u8F83\u57FA\u51C6\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u5173\u95ED\u5E76\u5237\u65B0\u3002"));
    function update(next) {
      setForm(next);
      setError('');
    }
    async function save() {
      if (app.busy || !created && !uncertain && (baseline.scheme_deleted || baseline.is_current === false || !form.name.trim() || !form.selected.length || !C.validRouting(form, true))) return;
      try {
        await app.mutate(async () => {
          let record = created;
          if (!record) {
            const payload = uncertain && frozen.current ? frozen.current : {
              name: form.name.trim(),
              baseline_config_id: baseline.id,
              baseline_mode: baselineChoice === 'official' ? 'follow_official' : 'fixed',
              traffic_weight: Number(form.weight),
              exploration_probability: Number(form.exploration) / 100,
              user_vote_cap: Number(form.cap)
            };
            if (!key.current || !C.same(frozen.current, payload)) {
              key.current = app.newKey();
              frozen.current = payload;
            }
            record = await app.api.createTask(payload, key.current);
            setUncertain(false);
            setCreated(record);
            app.upsertTask(record);
          }
          const missing = created ? remaining : form.selected;
          const failed = [];
          for (const id of missing) {
            try {
              await app.api.candidate(record.id, {
                config_id: id,
                enabled: true
              });
            } catch (e) {
              failed.push(id);
            }
          }
          setRemaining(failed);
          if (failed.length) {
            setError('任务已创建，' + failed.length + ' 个候选尚未加入。重试会继续使用原任务。');
            await app.refresh();
          } else {
            await app.refresh();
            app.replace('task', record.id, {
              taskId: record.id
            });
          }
        });
      } catch (e) {
        setError(e.message);
        if (!created) setUncertain(!e.status || e.status >= 500);
      }
    }
    return /*#__PURE__*/React.createElement(Detail, {
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
        disabled: app.busy,
        onClick: app.back
      }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement(Button, {
        primary: true,
        disabled: app.busy || !created && !uncertain && (baseline.scheme_deleted || baseline.is_current === false || !form.name.trim() || !form.selected.length || !C.validRouting(form, true)),
        onClick: save
      }, app.busy ? '正在保存…' : created ? '重试加入候选' : uncertain ? '重试核对创建' : '保存任务草稿'))
    }, /*#__PURE__*/React.createElement("fieldset", {
      className: "apd-form",
      disabled: app.busy || !!created || uncertain
    }, /*#__PURE__*/React.createElement(Field, {
      label: "\u4EFB\u52A1\u540D\u79F0"
    }, /*#__PURE__*/React.createElement("input", {
      maxLength: "120",
      value: form.name,
      onChange: e => update({
        ...form,
        name: e.target.value
      })
    })), /*#__PURE__*/React.createElement(Field, {
      label: "\u6BD4\u8F83\u57FA\u51C6"
    }, !uncertain && (baseline.scheme_deleted || baseline.is_current === false) && /*#__PURE__*/React.createElement(Notice, null, "\u6240\u9009\u57FA\u51C6\u5DF2\u66F4\u65B0\u6216\u5220\u9664\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002"), /*#__PURE__*/React.createElement("select", {
      value: baselineChoice,
      onChange: e => {
        setBaselineChoice(e.target.value);
        update({
          ...form,
          selected: []
        });
      }
    }, officialOption && /*#__PURE__*/React.createElement("option", {
      value: "official"
    }, C.versionLabel(officialOption), "\uFF08\u81EA\u52A8\u8DDF\u8FDB\uFF09"), app.configs.filter(config => config.id !== app.officialConfig?.id && (config.id === baselineChoice || !config.scheme_deleted && config.is_current !== false)).map(config => /*#__PURE__*/React.createElement("option", {
      key: config.id,
      value: config.id,
      disabled: config.scheme_deleted || config.is_current === false
    }, C.versionLabel(config), "\uFF08\u56FA\u5B9A\u7248\u672C\uFF09")))), /*#__PURE__*/React.createElement(RoutingFields, {
      form: form,
      onChange: update,
      cap: true
    }), /*#__PURE__*/React.createElement("fieldset", {
      className: "apd-choices-fieldset"
    }, /*#__PURE__*/React.createElement("legend", null, "\u53C2\u4E0E\u62BD\u5361\u7684\u5019\u9009\u65B9\u6848"), /*#__PURE__*/React.createElement(CandidateChoices, {
      app: app,
      baseline: baseline,
      selected: form.selected,
      onChange: selected => update({
        ...form,
        selected
      })
    }))), !created && !C.validRouting(form, true) && /*#__PURE__*/React.createElement(Notice, {
      error: true
    }, "\u6743\u91CD\u548C K \u9700\u4E3A 1\u20132147483647 \u7684\u6574\u6570\uFF0C\u63A2\u7D22\u6BD4\u4F8B\u9700\u5728 0\u2013100% \u4E4B\u95F4\u3002"), error && /*#__PURE__*/React.createElement(Notice, {
      error: true
    }, error), created && /*#__PURE__*/React.createElement("p", null, "\u5DF2\u521B\u5EFA\u4EFB\u52A1 ", shortId(created.id)));
  }
  function CandidatePool({
    app,
    route
  }) {
    const task = app.task(route.taskId),
      [selected, setSelected] = React.useState([]),
      [error, setError] = React.useState('');
    React.useEffect(() => {
      if (app.busy) return;
      setSelected(previous => {
        const next = previous.filter(id => {
          const config = app.scheme(id);
          return config && !config.scheme_deleted && config.is_current !== false;
        });
        return C.same(previous, next) ? previous : next;
      });
    }, [app.configs, app.context, app.busy]);
    useFormGuard(app, route, selected.length > 0);
    async function save() {
      try {
        await app.mutate(async () => {
          const failed = [];
          for (const id of selected) {
            try {
              await app.api.candidate(task.id, {
                config_id: id,
                enabled: true
              });
            } catch (e) {
              failed.push(id);
              setError(e.message);
            }
          }
          setSelected(failed);
          await app.refresh();
          if (!failed.length) app.pop();
        });
      } catch (e) {
        setError(e.message);
      }
    }
    return /*#__PURE__*/React.createElement(Detail, {
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
        disabled: app.busy,
        onClick: app.back
      }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement(Button, {
        primary: true,
        disabled: app.busy || !selected.length || task.status === 'completed',
        onClick: save
      }, "\u52A0\u5165\u5019\u9009\u6C60"))
    }, /*#__PURE__*/React.createElement("div", {
      className: "apd-row between"
    }, /*#__PURE__*/React.createElement("p", null, task.name), /*#__PURE__*/React.createElement(Button, {
      disabled: !app.catalog,
      onClick: () => app.open('newScheme')
    }, "\u521B\u5EFA\u65B0\u65B9\u6848")), /*#__PURE__*/React.createElement(CandidateChoices, {
      app: app,
      baseline: app.scheme(task.baseline_config_id),
      existing: task.candidates,
      selected: selected,
      disabled: app.busy || task.status === 'completed',
      onChange: setSelected
    }), task.status === 'active' && /*#__PURE__*/React.createElement("p", {
      className: "apd-footnote"
    }, "\u52A0\u5165\u6210\u529F\u540E\u5373\u53EF\u53C2\u4E0E\u672C\u4EFB\u52A1\u7684\u65B0\u6295\u653E\u3002"), error && /*#__PURE__*/React.createElement(Notice, {
      error: true
    }, error));
  }
  function Routing({
    app,
    route
  }) {
    const [baseline, setBaseline] = React.useState(() => app.task(route.taskId)),
      [form, setForm] = React.useState(() => C.routingForm(app.task(route.taskId))),
      [error, setError] = React.useState('');
    const valid = C.validRouting(form),
      changed = Number(form.weight) !== baseline.traffic_weight || Number(form.exploration) / 100 !== baseline.exploration_probability;
    useFormGuard(app, route, changed);
    const preview = valid ? C.draftAllocation(app.tasks, app.allocations.tasks || [], baseline, form) : null;
    function review() {
      const payload = {
        traffic_weight: Number(form.weight),
        exploration_probability: Number(form.exploration) / 100,
        expected_routing_revision: baseline.routing_revision
      };
      app.confirm({
        title: '保存投放参数？',
        label: '确认保存',
        message: '仅影响新报价；已受理轮次保留原任务、候选和分配记录。',
        content: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Table, {
          ariaLabel: "\u6295\u653E\u53C2\u6570\u53D8\u66F4",
          rows: [{
            id: 'weight',
            label: '任务权重',
            before: baseline.traffic_weight,
            after: payload.traffic_weight
          }, {
            id: 'explore',
            label: '探索比例',
            before: C.percent(baseline.exploration_probability),
            after: C.percent(payload.exploration_probability)
          }, {
            id: 'revision',
            label: '修订',
            before: 'R' + baseline.routing_revision,
            after: 'R' + (baseline.routing_revision + 1)
          }],
          rowKey: "id",
          columns: [{
            key: 'label',
            header: '配置项'
          }, {
            key: 'before',
            header: '当前'
          }, {
            key: 'after',
            header: '保存后'
          }]
        }), /*#__PURE__*/React.createElement(Table, {
          ariaLabel: "\u4FDD\u5B58\u540E\u7684\u4EFB\u52A1\u6D41\u91CF\u5BF9\u7167",
          rows: preview.tasks,
          rowKey: "evaluation_task_id",
          columns: [{
            key: 'name',
            header: '可投放任务',
            render: row => app.task(row.evaluation_task_id)?.name || shortId(row.evaluation_task_id)
          }, {
            key: 'before',
            header: '当前预计',
            render: row => C.percent(row.task_selection_probability)
          }, {
            key: 'after',
            header: '修改后预计',
            render: row => C.percent(row.next)
          }]
        })),
        action: async () => {
          try {
            await app.api.updateTask(baseline.id, payload);
            app.pop();
          } catch (e) {
            if (e.status === 409) setError('投放参数已被修改，请重新读取当前值；草稿会保留。');
            throw e;
          }
        }
      });
    }
    async function refreshBase() {
      try {
        const tasks = await app.api.tasks();
        const fresh = tasks.find(task => task.id === baseline.id);
        if (fresh) setBaseline(fresh);
        await app.refresh();
        setError('已更新对照值，草稿保留，请重新核对。');
      } catch (e) {
        setError(e.message);
      }
    }
    return /*#__PURE__*/React.createElement(Detail, {
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
        disabled: app.busy,
        onClick: app.back
      }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement(Button, {
        primary: true,
        disabled: !valid || !changed || app.busy || !preview || baseline.status === 'completed',
        onClick: review
      }, "\u6838\u5BF9\u53D8\u66F4"))
    }, /*#__PURE__*/React.createElement("p", {
      className: "apd-muted"
    }, baseline.name, " \xB7 R", baseline.routing_revision), /*#__PURE__*/React.createElement(RoutingFields, {
      form: form,
      onChange: setForm
    }), !valid && /*#__PURE__*/React.createElement(Notice, {
      error: true
    }, "\u6743\u91CD\u9700\u4E3A 1\u20132147483647 \u7684\u6574\u6570\uFF0C\u63A2\u7D22\u6BD4\u4F8B\u9700\u5728 0\u2013100% \u4E4B\u95F4\u3002"), valid && Number(form.exploration) === 0 && /*#__PURE__*/React.createElement(Notice, null, "\u63A2\u7D22\u5DF2\u5173\u95ED\u3002\u65B0\u5019\u9009\u5982\u679C\u6CA1\u6709\u6210\u4E3A\u5F53\u524D\u6700\u9AD8\u5206\uFF0C\u53EF\u80FD\u4E00\u76F4\u5F97\u4E0D\u5230\u6D41\u91CF\u3002"), valid && Number(form.exploration) === 100 && /*#__PURE__*/React.createElement(Notice, null, "\u5168\u90E8\u6D41\u91CF\u5747\u5300\u63A2\u7D22\uFF0C\u5F53\u524D\u80DC\u7387\u4E0D\u5F71\u54CD\u5206\u914D\u3002"), error && /*#__PURE__*/React.createElement(Notice, {
      error: true,
      action: /*#__PURE__*/React.createElement(Button, {
        disabled: app.busy,
        onClick: refreshBase
      }, "\u91CD\u65B0\u8BFB\u53D6\u5F53\u524D\u503C")
    }, error), preview ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Panel, {
      title: "\u53EF\u6295\u653E\u4EFB\u52A1\u5206\u6D41\u9884\u89C8"
    }, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u4EFB\u52A1\u5206\u6D41\u9884\u89C8",
      rows: preview.tasks,
      rowKey: "evaluation_task_id",
      columns: [{
        key: 'name',
        header: '任务',
        render: row => app.task(row.evaluation_task_id)?.name || shortId(row.evaluation_task_id)
      }, {
        key: 'before',
        header: '当前预计',
        render: row => C.percent(row.task_selection_probability)
      }, {
        key: 'after',
        header: '修改后预计',
        render: row => C.percent(row.next)
      }]
    })), /*#__PURE__*/React.createElement(Panel, {
      title: "\u4EFB\u52A1\u5185\u5019\u9009\u5206\u914D"
    }, /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u5019\u9009\u5206\u914D\u9884\u89C8",
      rows: preview.candidates,
      rowKey: "config_id",
      empty: "\u6CA1\u6709\u53EF\u5206\u914D\u7684\u5019\u9009",
      columns: [{
        key: 'name',
        header: '方案',
        render: row => app.scheme(row.config_id)?.name || shortId(row.config_id)
      }, {
        key: 'exploration',
        header: '探索部分',
        render: row => C.percent(row.exploration)
      }, {
        key: 'priority',
        header: '优先部分',
        render: row => C.percent(row.priority)
      }, {
        key: 'next',
        header: '任务内合计',
        render: row => C.percent(row.next)
      }]
    })), /*#__PURE__*/React.createElement("p", {
      className: "apd-footnote"
    }, "\u9884\u8BA1\u6982\u7387\u4F9D\u636E\u5F53\u524D\u57FA\u51C6\u7248\u672C\u7684\u7F13\u5B58\u7EDF\u8BA1\uFF1B\u53CD\u9988\u4E0E\u6295\u653E\u8D44\u683C\u53D8\u5316\u4F1A\u6539\u53D8\u5B9E\u9645\u5206\u914D\u3002")) : /*#__PURE__*/React.createElement(Notice, {
      action: /*#__PURE__*/React.createElement(Button, {
        disabled: app.busy,
        onClick: app.refresh
      }, "\u91CD\u65B0\u8BFB\u53D6")
    }, "\u5206\u6D41\u9884\u89C8\u6682\u4E0D\u53EF\u7528\uFF0C\u8BFB\u53D6\u6210\u529F\u540E\u518D\u6838\u5BF9\u4FDD\u5B58\u3002"));
  }
  Object.assign(A, {
    Exposure,
    Tasks,
    TaskDetail,
    CandidateChoices,
    NewTask,
    CandidatePool,
    Routing
  });
})();
}
