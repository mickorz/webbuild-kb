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
  const CartesianChart = window.AdminCartesianChart;
  const MetricBars = window.AdminMetricBars;
  const number = value => (Number(value) || 0).toLocaleString();
  const compact = value => {
    const n = Number(value) || 0;
    if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    return number(n);
  };
  const credits = millis => ((Number(millis) || 0) / 1000).toLocaleString(undefined, {
    maximumFractionDigits: 2
  });
  const rmb = micros => {
    if (micros == null) return '—';
    const value = Number(micros) / 1000000;
    const digits = value !== 0 && Math.abs(value) < 0.01 ? 4 : 2;
    return '¥' + value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: digits
    });
  };
  const pct = value => value == null ? '—' : Number(value).toFixed(1).replace(/\.0$/, '') + '%';
  const dateTime = value => value ? value.slice(0, 19).replace('T', ' ') : '—';
  const COST_FIELDS = {
    model_cost_micros: 'discounted_model_cost_micros',
    daily_average_cost_micros: 'discounted_daily_average_cost_micros',
    average_cost_per_usage_task_micros: 'discounted_average_cost_per_usage_task_micros',
    failed_model_cost_micros: 'failed_discounted_model_cost_micros',
    failure_cost_share_pct: 'discounted_failure_cost_share_pct',
    cost_per_credit_micros: 'discounted_cost_per_credit_micros'
  };
  const costValue = (row, field, discounted) => {
    const target = discounted && COST_FIELDS[field] ? COST_FIELDS[field] : field;
    return row && row[target] != null ? row[target] : null;
  };
  const TASK_LABELS = {
    world_build: '世界观生成',
    character: '角色生成',
    character_create: 'AI 新增角色',
    story_plan: '故事规划',
    outline: '大纲生成',
    chapter_draft: '章节初稿',
    polish: '润色',
    post_hoc: '后验结算',
    chapter_world_state: '章节世界状态',
    chapter_outline_director: '章节导演大纲',
    chapter_character_state: '章节角色状态',
    chapter_writer_muti: '多写手',
    chapter_writer_single: '单写手',
    rewrite: '改写',
    field_rewrite: '字段改写',
    memory_extract: '会话记忆提取'
  };
  const MEMORY_TRIGGER = {
    token_threshold: '长度达到阈值',
    idle: '一段时间没有新对话',
    manual: '手动'
  };
  const memoryCount = value => value == null ? '—' : number(value);
  const memoryCost = memory => memory && memory.reported_cost_status === 'known' && memory.reported_cost_rmb != null ? '¥' + memory.reported_cost_rmb : '未知';
  const memoryRange = memory => {
    const range = memory && memory.source_range || {};
    const parts = [];
    if (range.turn_count != null) parts.push(range.turn_count + ' 轮');
    if (range.first_message_id || range.last_message_id) parts.push([range.first_message_id, range.last_message_id].filter(Boolean).join(' – '));
    return parts.join(' · ') || '—';
  };
  const STAGE_GROUPS = [['建书四阶段', ['world_build', 'character', 'story_plan', 'outline']], ['角色增补', ['character_create']], ['单写手章节', ['chapter_world_state', 'chapter_character_state', 'chapter_outline_director', 'chapter_writer_single']], ['多写手正价', ['chapter_writer_muti']], ['后处理及其他', ['post_hoc', 'polish', 'field_rewrite', 'memory_extract']]];
  const taskLabel = value => TASK_LABELS[value] || value || '未分类';
  const FLAG_LABELS = {
    missing_usage: '缺 Token 用量',
    missing_rate: '缺人民币费率',
    invalid_usage: '用量字段异常',
    high_reasoning: '推理占比较高'
  };
  function Flags({
    values
  }) {
    if (!(values || []).length) return /*#__PURE__*/React.createElement("span", {
      className: "tok-status normal"
    }, "\u6B63\u5E38");
    return /*#__PURE__*/React.createElement("span", {
      className: "tok-flags"
    }, values.map(value => /*#__PURE__*/React.createElement("span", {
      className: 'tok-status ' + value,
      key: value
    }, FLAG_LABELS[value] || value)));
  }
  function Cost({
    row,
    discounted
  }) {
    const value = costValue(row, 'model_cost_micros', discounted);
    return /*#__PURE__*/React.createElement("span", {
      className: "tok-cost"
    }, /*#__PURE__*/React.createElement("strong", null, rmb(value)), value != null && !row.cost_complete && /*#__PURE__*/React.createElement("small", null, "\u5DF2\u77E5\u90E8\u5206 \xB7 \u8986\u76D6 ", pct(row.rate_coverage_pct)));
  }
  function Summary({
    row,
    days,
    discounted
  }) {
    const totalCost = costValue(row, 'model_cost_micros', discounted);
    const failedCost = costValue(row, 'failed_model_cost_micros', discounted);
    return /*#__PURE__*/React.createElement("section", {
      className: "tok-summary",
      "aria-label": "\u6210\u672C\u6458\u8981"
    }, /*#__PURE__*/React.createElement("div", {
      className: "tok-summary-lead"
    }, /*#__PURE__*/React.createElement("span", null, discounted ? '折扣后模型成本预览' : '模型成本估算'), /*#__PURE__*/React.createElement("strong", null, rmb(totalCost)), /*#__PURE__*/React.createElement("small", null, discounted ? '按模型折扣比例预览' : '按当前官方公开价重估', " \xB7 \u8D39\u7387\u8986\u76D6 ", pct(row.rate_coverage_pct))), /*#__PURE__*/React.createElement("dl", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u65E5\u5747\u6210\u672C"), /*#__PURE__*/React.createElement("dd", null, rmb(costValue(row, 'daily_average_cost_micros', discounted))), /*#__PURE__*/React.createElement("small", null, "\u6309 ", days, " \u5929\u5747\u644A")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u7269\u7406 Token"), /*#__PURE__*/React.createElement("dd", null, compact(row.total_tokens)), /*#__PURE__*/React.createElement("small", null, compact(row.input_tokens), " \u8F93\u5165 / ", compact(row.output_tokens), " \u8F93\u51FA")), /*#__PURE__*/React.createElement("div", {
      className: failedCost ? 'warn' : ''
    }, /*#__PURE__*/React.createElement("dt", null, "\u5931\u8D25\u6D88\u8017"), /*#__PURE__*/React.createElement("dd", null, rmb(failedCost)), /*#__PURE__*/React.createElement("small", null, "\u5360\u5DF2\u77E5\u6210\u672C ", pct(costValue(row, 'failure_cost_share_pct', discounted)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u7528\u6237\u5B9E\u6263\u7B14\u529B"), /*#__PURE__*/React.createElement("dd", null, credits(row.user_debit_millis)), /*#__PURE__*/React.createElement("small", null, "\u5DF2\u7ED3\u7B97 consume \u6D41\u6C34"))));
  }
  function CostTrend({
    rows,
    discounted
  }) {
    const visible = (rows || []).slice(-30);
    return /*#__PURE__*/React.createElement("section", {
      className: "tok-panel tok-trend"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "\u6BCF\u65E5\u6210\u672C"), /*#__PURE__*/React.createElement("p", null, "\u67F1\u4F53\u4E3A\u5DF2\u77E5\u6A21\u578B\u6210\u672C\uFF0C\u7EA2\u8272\u4E3A\u5931\u8D25\u4EFB\u52A1\u6D88\u8017")), /*#__PURE__*/React.createElement("span", null, visible.length, " \u4E2A\u6709\u4EFB\u52A1\u65E5\u671F")), /*#__PURE__*/React.createElement("div", {
      className: "tok-chart"
    }, /*#__PURE__*/React.createElement(CartesianChart, {
      rows: visible,
      xKey: "date",
      xTickFormatter: value => String(value).slice(5),
      ariaLabel: "\u6BCF\u65E5\u6A21\u578B\u6210\u672C\u8D8B\u52BF\u56FE",
      empty: "\u5F53\u524D\u8303\u56F4\u6CA1\u6709\u4EFB\u52A1\u6570\u636E",
      series: [{
        key: 'totalCost',
        label: '已知模型成本',
        type: 'bar',
        tone: 'gold',
        value: row => costValue(row, 'model_cost_micros', discounted),
        format: rmb
      }, {
        key: 'failedCost',
        label: '失败任务消耗',
        type: 'bar',
        tone: 'terra',
        overlay: true,
        widthRatio: .46,
        value: row => costValue(row, 'failed_model_cost_micros', discounted),
        format: rmb
      }]
    })));
  }
  function ModelStructure({
    rows,
    discounted
  }) {
    const items = (rows || []).slice(0, 6).map(row => ({
      key: row.model_name,
      label: row.model_name,
      value: costValue(row, 'model_cost_micros', discounted),
      detail: `${compact(row.total_tokens)} Token · 缓存 ${pct(row.cache_share_pct)} · 失败 ${rmb(costValue(row, 'failed_model_cost_micros', discounted))}`
    }));
    return /*#__PURE__*/React.createElement("section", {
      className: "tok-panel tok-model-structure"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "\u6A21\u578B\u6210\u672C\u7ED3\u6784"), /*#__PURE__*/React.createElement("p", null, "\u770B\u6E05\u8D35\u5728\u54EA\u91CC\uFF0C\u4EE5\u53CA\u7F13\u5B58\u662F\u5426\u771F\u6B63\u751F\u6548"))), /*#__PURE__*/React.createElement("div", {
      className: "tok-model-bars"
    }, /*#__PURE__*/React.createElement(MetricBars, {
      items: items,
      ariaLabel: "\u6A21\u578B\u6210\u672C\u7ED3\u6784",
      format: rmb,
      tone: "sage",
      empty: "\u5F53\u524D\u8303\u56F4\u6CA1\u6709\u6A21\u578B\u7528\u91CF"
    })));
  }
  function StageRows({
    rows,
    discounted
  }) {
    const columns = [{
      key: 'stage',
      header: '二级环节',
      priority: 'primary',
      sortValue: row => taskLabel(row.task_type),
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, taskLabel(row.task_type)), /*#__PURE__*/React.createElement("small", null, row.task_type))
    }, {
      key: 'success',
      header: '成功 / 尝试',
      numeric: true,
      defaultDirection: 'desc',
      sortValue: row => row.success_rate_pct,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, number(row.completed_tasks), " / ", number(row.tasks), /*#__PURE__*/React.createElement("small", null, "\u6210\u529F\u7387 ", pct(row.success_rate_pct)))
    }, {
      key: 'tokens',
      header: '单次平均 Token',
      numeric: true,
      sortValue: row => row.average_tokens_per_usage_task,
      render: row => compact(row.average_tokens_per_usage_task)
    }, {
      key: 'averageCost',
      header: '单次平均成本',
      numeric: true,
      sortValue: row => costValue(row, 'average_cost_per_usage_task_micros', discounted),
      render: row => rmb(costValue(row, 'average_cost_per_usage_task_micros', discounted))
    }, {
      key: 'reasoning',
      header: 'Reasoning / Output',
      numeric: true,
      priority: 'optional',
      sortValue: row => row.reasoning_ratio_pct,
      render: row => pct(row.reasoning_ratio_pct)
    }, {
      key: 'failedCost',
      header: '失败成本',
      numeric: true,
      sortValue: row => costValue(row, 'failed_model_cost_micros', discounted),
      render: row => rmb(costValue(row, 'failed_model_cost_micros', discounted))
    }, {
      key: 'status',
      header: '数据状态',
      sortValue: row => row.cost_incomplete_tasks,
      render: row => row.cost_incomplete_tasks ? /*#__PURE__*/React.createElement("span", {
        className: "tok-status missing_usage"
      }, row.cost_incomplete_tasks, " \u9879\u4E0D\u5B8C\u6574") : /*#__PURE__*/React.createElement("span", {
        className: "tok-status normal"
      }, "\u5B8C\u6574")
    }];
    return /*#__PURE__*/React.createElement(DataTable, {
      rows: rows,
      columns: columns,
      rowKey: "task_type",
      ariaLabel: "\u4E8C\u7EA7\u751F\u4EA7\u73AF\u8282",
      initialSort: {
        key: 'failedCost',
        direction: 'desc'
      },
      className: "tok-table",
      wrapClassName: "tok-table-wrap",
      compact: true
    });
  }
  function StageTable({
    rows,
    discounted
  }) {
    const available = new Map((rows || []).map(row => [row.task_type, row]));
    const groups = STAGE_GROUPS.map(([label, types]) => {
      const entries = types.map(type => available.get(type)).filter(Boolean);
      types.forEach(type => available.delete(type));
      return [label, entries];
    });
    groups[groups.length - 1][1].push(...available.values());
    return /*#__PURE__*/React.createElement("div", {
      className: "tok-stage-groups"
    }, groups.map(([label, entries]) => /*#__PURE__*/React.createElement("section", {
      className: "tok-stage-group",
      key: label
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, label), /*#__PURE__*/React.createElement("p", null, entries.length ? `${entries.length} 个二级环节` : '当前范围暂无数据')), /*#__PURE__*/React.createElement("span", null, number(entries.reduce((sum, row) => sum + row.tasks, 0)), " \u6B21\u5C1D\u8BD5")), entries.length ? /*#__PURE__*/React.createElement(StageRows, {
      rows: entries,
      discounted: discounted
    }) : /*#__PURE__*/React.createElement("div", {
      className: "tok-empty"
    }, "\u5F53\u524D\u7B5B\u9009\u8303\u56F4\u6CA1\u6709\u8BE5\u7C7B\u4EFB\u52A1"))));
  }
  function ModelTable({
    rows,
    discounted
  }) {
    const columns = [{
      key: 'model',
      header: '模型',
      priority: 'primary',
      sortValue: row => row.model_name,
      render: row => /*#__PURE__*/React.createElement("strong", null, row.model_name)
    }, {
      key: 'tasks',
      header: '调用任务',
      numeric: true,
      sortValue: row => row.usage_tasks,
      render: row => number(row.usage_tasks)
    }, {
      key: 'tokens',
      header: 'Token',
      numeric: true,
      defaultDirection: 'desc',
      sortValue: row => row.total_tokens,
      render: row => compact(row.total_tokens)
    }, {
      key: 'cost',
      header: '模型成本',
      numeric: true,
      defaultDirection: 'desc',
      sortValue: row => costValue(row, 'model_cost_micros', discounted),
      render: row => /*#__PURE__*/React.createElement(Cost, {
        row: row,
        discounted: discounted
      })
    }, {
      key: 'averageCost',
      header: '单次平均成本',
      numeric: true,
      sortValue: row => costValue(row, 'average_cost_per_usage_task_micros', discounted),
      render: row => rmb(costValue(row, 'average_cost_per_usage_task_micros', discounted))
    }, {
      key: 'cache',
      header: '缓存占输入',
      numeric: true,
      priority: 'optional',
      sortValue: row => row.cache_share_pct,
      render: row => pct(row.cache_share_pct)
    }, {
      key: 'failedCost',
      header: '失败成本',
      numeric: true,
      sortValue: row => costValue(row, 'failed_model_cost_micros', discounted),
      render: row => rmb(costValue(row, 'failed_model_cost_micros', discounted))
    }];
    return /*#__PURE__*/React.createElement(DataTable, {
      rows: rows || [],
      columns: columns,
      rowKey: "model_name",
      ariaLabel: "\u6A21\u578B\u6210\u672C\u660E\u7EC6",
      initialSort: {
        key: 'cost',
        direction: 'desc'
      },
      className: "tok-table",
      wrapClassName: "tok-table-wrap",
      empty: "\u5F53\u524D\u8303\u56F4\u6CA1\u6709\u6A21\u578B\u7528\u91CF",
      compact: true
    });
  }
  function UserBookTable({
    rows,
    discounted
  }) {
    const columns = [{
      key: 'book',
      header: '用户 / 作品',
      priority: 'primary',
      sortValue: row => `${row.book_title || ''} ${row.display_name || row.email || ''}`,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, row.book_title || '未关联作品'), /*#__PURE__*/React.createElement("small", null, row.display_name || row.email))
    }, {
      key: 'tasks',
      header: '任务',
      numeric: true,
      sortValue: row => row.tasks,
      render: row => number(row.tasks)
    }, {
      key: 'tokens',
      header: 'Token',
      numeric: true,
      sortValue: row => row.total_tokens,
      render: row => compact(row.total_tokens)
    }, {
      key: 'cost',
      header: '模型成本',
      numeric: true,
      defaultDirection: 'desc',
      sortValue: row => costValue(row, 'model_cost_micros', discounted),
      render: row => /*#__PURE__*/React.createElement(Cost, {
        row: row,
        discounted: discounted
      })
    }, {
      key: 'debit',
      header: '用户实扣',
      numeric: true,
      sortValue: row => row.user_debit_millis,
      render: row => `${credits(row.user_debit_millis)} 笔力`
    }, {
      key: 'failedCost',
      header: '失败成本',
      numeric: true,
      priority: 'optional',
      sortValue: row => costValue(row, 'failed_model_cost_micros', discounted),
      render: row => rmb(costValue(row, 'failed_model_cost_micros', discounted))
    }, {
      key: 'coverage',
      header: '费率覆盖',
      numeric: true,
      sortValue: row => row.rate_coverage_pct,
      render: row => pct(row.rate_coverage_pct)
    }];
    return /*#__PURE__*/React.createElement(DataTable, {
      rows: rows || [],
      columns: columns,
      rowKey: (row, index) => (row.book_link_id || row.user_id || 'row') + index,
      ariaLabel: "\u7528\u6237\u4F5C\u54C1\u6210\u672C\u660E\u7EC6",
      pageSize: 20,
      initialSort: {
        key: 'cost',
        direction: 'desc'
      },
      className: "tok-table",
      wrapClassName: "tok-table-wrap",
      empty: "\u5F53\u524D\u8303\u56F4\u6CA1\u6709\u7528\u6237\u6216\u4F5C\u54C1\u7528\u91CF",
      compact: true
    });
  }
  function LedgerTable({
    ledger,
    onSelect,
    onPage,
    discounted
  }) {
    const rows = ledger.items || [];
    const pages = Math.max(1, Math.ceil((ledger.total || 0) / (ledger.limit || 50)));
    const page = Math.floor((ledger.offset || 0) / (ledger.limit || 50)) + 1;
    const columns = [{
      key: 'time',
      header: '时间',
      sortValue: row => Date.parse(row.created_at || 0),
      render: row => dateTime(row.created_at).slice(5, 16)
    }, {
      key: 'book',
      header: '用户 / 作品',
      priority: 'primary',
      sortValue: row => `${row.book_title || ''} ${row.display_name || row.email || ''}`,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, row.book_title || '未关联作品'), /*#__PURE__*/React.createElement("small", null, row.display_name || row.email))
    }, {
      key: 'stage',
      header: '生产环节',
      sortValue: row => taskLabel(row.task_type),
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, taskLabel(row.task_type)), /*#__PURE__*/React.createElement("small", null, row.task_id.slice(0, 8)))
    }, {
      key: 'model',
      header: '模型',
      priority: 'optional',
      sortValue: row => (row.models || []).map(model => model.model_name).join('、'),
      render: row => /*#__PURE__*/React.createElement("span", {
        className: "tok-model-list"
      }, (row.models || []).map(model => model.model_name).join('、') || '—')
    }, {
      key: 'tokens',
      header: 'Token',
      numeric: true,
      sortValue: row => row.total_tokens,
      render: row => compact(row.total_tokens)
    }, {
      key: 'cost',
      header: '模型成本',
      numeric: true,
      defaultDirection: 'desc',
      sortValue: row => costValue(row, 'model_cost_micros', discounted),
      render: row => /*#__PURE__*/React.createElement(Cost, {
        row: row,
        discounted: discounted
      })
    }, {
      key: 'status',
      header: '任务状态',
      sortValue: row => row.status,
      render: row => /*#__PURE__*/React.createElement("span", {
        className: 'tok-job-state ' + row.status
      }, row.status)
    }, {
      key: 'flags',
      header: '数据状态',
      sortable: false,
      render: row => /*#__PURE__*/React.createElement(Flags, {
        values: row.flags
      })
    }];
    return /*#__PURE__*/React.createElement(DataTable, {
      rows: rows,
      columns: columns,
      rowKey: "task_id",
      ariaLabel: "\u4EFB\u52A1\u6210\u672C\u6D41\u6C34",
      className: "tok-table tok-ledger",
      wrapClassName: "tok-table-wrap",
      onRowActivate: onSelect,
      pagination: {
        total: ledger.total || 0,
        page,
        pages,
        pageSize: ledger.limit || 50,
        onPageChange: nextPage => onPage((nextPage - 1) * (ledger.limit || 50))
      },
      empty: "\u5F53\u524D\u8303\u56F4\u6CA1\u6709\u4EFB\u52A1\u6D41\u6C34",
      compact: true
    });
  }
  function Attention({
    rows,
    onSelect
  }) {
    return /*#__PURE__*/React.createElement("section", {
      className: "tok-attention"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, "\u6570\u636E\u5F85\u8865\u9F50"), /*#__PURE__*/React.createElement("span", null, (rows || []).length)), /*#__PURE__*/React.createElement("div", null, (rows || []).map(row => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: row.task_id,
      onClick: () => onSelect(row)
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, taskLabel(row.task_type)), /*#__PURE__*/React.createElement("small", null, row.book_title || '未关联作品', " \xB7 ", row.email)), /*#__PURE__*/React.createElement(Flags, {
      values: row.flags
    }))), !(rows || []).length && /*#__PURE__*/React.createElement("p", null, "\u5F53\u524D\u6CA1\u6709\u5F85\u5904\u7406\u7684\u6570\u636E\u5F02\u5E38")));
  }
  function DetailDrawer({
    task,
    onClose,
    discounted
  }) {
    useEffect(() => {
      const close = event => {
        if (event.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', close);
      return () => window.removeEventListener('keydown', close);
    }, [onClose]);
    return /*#__PURE__*/React.createElement("div", {
      className: "tok-drawer-layer",
      onMouseDown: event => {
        if (event.target === event.currentTarget) onClose();
      }
    }, /*#__PURE__*/React.createElement("aside", {
      className: "tok-drawer",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "\u4EFB\u52A1\u6210\u672C\u660E\u7EC6"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "\u4EFB\u52A1\u6210\u672C\u660E\u7EC6"), /*#__PURE__*/React.createElement("h2", null, taskLabel(task.task_type)), /*#__PURE__*/React.createElement("p", null, task.task_id)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onClose,
      "aria-label": "\u5173\u95ED"
    }, "\xD7")), /*#__PURE__*/React.createElement("div", {
      className: "tok-drawer-body"
    }, /*#__PURE__*/React.createElement("dl", {
      className: "tok-detail-grid"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u7528\u6237 / \u4F5C\u54C1"), /*#__PURE__*/React.createElement("dd", null, task.display_name || task.email), /*#__PURE__*/React.createElement("small", null, task.book_title || '未关联作品')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u72B6\u6001"), /*#__PURE__*/React.createElement("dd", null, task.status), /*#__PURE__*/React.createElement("small", null, task.billing_status)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, discounted ? '折扣后成本' : '模型成本'), /*#__PURE__*/React.createElement("dd", null, rmb(costValue(task, 'model_cost_micros', discounted))), /*#__PURE__*/React.createElement("small", null, "\u8986\u76D6 ", pct(task.rate_coverage_pct))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u7528\u6237\u5B9E\u6263"), /*#__PURE__*/React.createElement("dd", null, credits(task.user_debit_millis), " \u7B14\u529B"), /*#__PURE__*/React.createElement("small", null, "\u4E24\u5957\u8D26\u672C\u4E0D\u7B49\u540C\u6536\u5165\u4E0E\u6210\u672C")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u7269\u7406 Token"), /*#__PURE__*/React.createElement("dd", null, number(task.total_tokens)), /*#__PURE__*/React.createElement("small", null, number(task.input_tokens), " \u8F93\u5165 / ", number(task.output_tokens), " \u8F93\u51FA")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u63A8\u7406\u5360\u8F93\u51FA"), /*#__PURE__*/React.createElement("dd", null, task.reasoning_ratio == null ? '—' : pct(task.reasoning_ratio * 100)), /*#__PURE__*/React.createElement("small", null, number(task.reasoning_tokens), " reasoning"))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, "\u6570\u636E\u72B6\u6001"), /*#__PURE__*/React.createElement(Flags, {
      values: task.flags
    })), task.memory ? /*#__PURE__*/React.createElement("dl", {
      className: "tok-detail-grid"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u4F1A\u8BDD"), /*#__PURE__*/React.createElement("dd", null, task.memory.source_session_id || '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u89E6\u53D1"), /*#__PURE__*/React.createElement("dd", null, MEMORY_TRIGGER[task.memory.trigger] || task.memory.trigger || '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u8303\u56F4"), /*#__PURE__*/React.createElement("dd", null, memoryRange(task.memory))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u5199\u5165 / \u53BB\u91CD"), /*#__PURE__*/React.createElement("dd", null, memoryCount(task.memory.written_count), " / ", memoryCount(task.memory.deduplicated_count))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u6A21\u578B\u8D39\u7528"), /*#__PURE__*/React.createElement("dd", null, memoryCost(task.memory))), task.memory.error_message ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "\u5931\u8D25"), /*#__PURE__*/React.createElement("dd", null, task.memory.error_message)) : null) : null, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, "\u5206\u6A21\u578B\u7528\u91CF"), /*#__PURE__*/React.createElement("div", {
      className: "tok-model-detail"
    }, (task.models || []).map(model => /*#__PURE__*/React.createElement("article", {
      key: model.model_name
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("strong", null, model.model_name), /*#__PURE__*/React.createElement("span", null, rmb(discounted ? model.discounted_known_cost_micros : model.known_cost_micros))), /*#__PURE__*/React.createElement("p", null, number(model.input_tokens), " \u8F93\u5165 \xB7 ", number(model.output_tokens), " \u8F93\u51FA \xB7 ", number(model.cached_input_tokens), " \u7F13\u5B58 \xB7 ", number(model.reasoning_tokens), " \u63A8\u7406"), /*#__PURE__*/React.createElement("small", null, discounted ? `折扣 ${pct(model.cost_discount_bps / 100)}` : model.price_checked_at ? `价格核验 ${model.price_checked_at.slice(0, 10)}` : '未记录价格核验时间', model.missing_rate_dimensions.length ? ' · 缺少费率' : ''))))))));
  }
  const RATE_FIELDS = [['input_rmb_per_mtok', '输入', '每百万 input Token'], ['cached_input_rmb_per_mtok', '缓存输入', '每百万 cached input Token'], ['output_rmb_per_mtok', '输出', '每百万 output Token'], ['reasoning_rmb_per_mtok', '推理', '每百万 reasoning Token']];
  function PriceDrawer({
    rates,
    drafts,
    loading,
    error,
    saving,
    onChange,
    onSave,
    onClose
  }) {
    useEffect(() => {
      const close = event => {
        if (event.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', close);
      return () => window.removeEventListener('keydown', close);
    }, [onClose]);
    return /*#__PURE__*/React.createElement("div", {
      className: "tok-drawer-layer",
      onMouseDown: event => {
        if (event.target === event.currentTarget) onClose();
      }
    }, /*#__PURE__*/React.createElement("aside", {
      className: "tok-drawer tok-rate-drawer",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "\u6A21\u578B\u4EF7\u683C\u914D\u7F6E"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "\u6210\u672C\u53E3\u5F84\u914D\u7F6E"), /*#__PURE__*/React.createElement("h2", null, "\u6A21\u578B\u4EF7\u683C\u4E0E\u6298\u6263"), /*#__PURE__*/React.createElement("p", null, "\u4EF7\u683C\u5355\u4F4D\uFF1A\u4EBA\u6C11\u5E01 / \u767E\u4E07 Token")), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onClose,
      "aria-label": "\u5173\u95ED"
    }, "\xD7")), /*#__PURE__*/React.createElement("div", {
      className: "tok-drawer-body"
    }, /*#__PURE__*/React.createElement("p", {
      className: "tok-rate-note"
    }, "\u5B98\u65B9\u4EF7\u7528\u4E8E\u6807\u51C6\u6210\u672C\uFF1B\u6298\u6263\u6BD4\u4F8B\u8868\u793A\u4F9B\u5E94\u5546\u5B9E\u4ED8\u5360\u516C\u5F00\u4EF7\uFF0C100% \u4E3A\u4E0D\u6253\u6298\u3002\u4FDD\u5B58\u540E\u5386\u53F2\u770B\u677F\u4F1A\u6309\u5F53\u524D\u8D39\u7387\u91CD\u4F30\uFF0C\u4E0D\u6539\u53D8\u7528\u6237\u7B14\u529B\u3001\u8D26\u5355\u6216 Token \u6570\u636E\u3002"), loading && /*#__PURE__*/React.createElement("div", {
      className: "tok-empty"
    }, "\u6B63\u5728\u8BFB\u53D6\u6A21\u578B\u4EF7\u683C\u2026"), error && /*#__PURE__*/React.createElement("div", {
      className: "tok-error"
    }, /*#__PURE__*/React.createElement("span", null, error)), !loading && (rates || []).map(rate => {
      const draft = drafts[rate.model_name] || {};
      return /*#__PURE__*/React.createElement("section", {
        className: "tok-rate-card",
        key: rate.model_name
      }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, rate.model_name), /*#__PURE__*/React.createElement("p", null, rate.rmb_price_checked_at ? `官方价核验 ${rate.rmb_price_checked_at.slice(0, 10)}` : '未记录官方价核验时间')), /*#__PURE__*/React.createElement("label", {
        className: "tok-rate-active"
      }, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: draft.active !== false,
        onChange: event => onChange(rate.model_name, 'active', event.target.checked)
      }), "\u542F\u7528")), /*#__PURE__*/React.createElement("div", {
        className: "tok-rate-fields"
      }, RATE_FIELDS.map(([field, label, hint]) => /*#__PURE__*/React.createElement("label", {
        key: field
      }, /*#__PURE__*/React.createElement("span", null, label, /*#__PURE__*/React.createElement("small", null, hint)), /*#__PURE__*/React.createElement("span", {
        className: "tok-money-input"
      }, "\xA5", /*#__PURE__*/React.createElement("input", {
        type: "number",
        min: "0",
        step: "0.000001",
        value: draft[field] ?? '',
        onChange: event => onChange(rate.model_name, field, event.target.value)
      }))))), /*#__PURE__*/React.createElement("label", {
        className: "tok-discount-field"
      }, /*#__PURE__*/React.createElement("span", null, "\u6298\u6263\u6BD4\u4F8B", /*#__PURE__*/React.createElement("small", null, "\u4F9B\u5E94\u5546\u5B9E\u4ED8\u5360\u516C\u5F00\u4EF7")), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("input", {
        type: "number",
        min: "0",
        max: "100",
        step: "0.01",
        value: draft.discount_pct ?? '',
        onChange: event => onChange(rate.model_name, 'discount_pct', event.target.value)
      }), "%")), /*#__PURE__*/React.createElement("footer", null, /*#__PURE__*/React.createElement("button", {
        type: "button",
        disabled: saving === rate.model_name,
        onClick: () => onSave(rate)
      }, saving === rate.model_name ? '保存中…' : '保存该模型')));
    }), !loading && !(rates || []).length && !error && /*#__PURE__*/React.createElement("div", {
      className: "tok-empty"
    }, "\u8FD8\u6CA1\u6709\u53EF\u914D\u7F6E\u7684\u6A21\u578B\u8D39\u7387"))));
  }
  function TokenTrackingTab({
    toast
  }) {
    const defaults = {
      days: 30,
      q: '',
      task_type: '',
      model_name: '',
      state: 'all'
    };
    const [filters, setFilters] = useState(defaults);
    const [applied, setApplied] = useState(defaults);
    const [offset, setOffset] = useState(0);
    const [data, setData] = useState(null);
    const [facets, setFacets] = useState({
      task_types: [],
      models: []
    });
    const [activeTab, setActiveTab] = useState('task_type');
    const [selected, setSelected] = useState(null);
    const [discountedPreview, setDiscountedPreview] = useState(false);
    const [priceOpen, setPriceOpen] = useState(false);
    const [rates, setRates] = useState(null);
    const [rateDrafts, setRateDrafts] = useState({});
    const [rateLoading, setRateLoading] = useState(false);
    const [rateError, setRateError] = useState('');
    const [savingRate, setSavingRate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const toastRef = useRef(toast);
    const pendingRequestRef = useRef(null);
    const limit = 50;
    useEffect(() => {
      toastRef.current = toast;
    }, [toast]);
    const load = useCallback(() => {
      const requestKey = JSON.stringify({
        ...applied,
        limit,
        offset
      });
      const pending = pendingRequestRef.current;
      if (pending && pending.key === requestKey) return pending.promise;
      if (pending) pending.controller.abort();
      const controller = new AbortController();
      setLoading(true);
      setError('');
      const promise = window.LF_API.adminTokenTracking({
        ...applied,
        limit,
        offset
      }, {
        signal: controller.signal
      }).then(result => {
        if (controller.signal.aborted) return;
        setData(result);
        setFacets(previous => ({
          task_types: Array.from(new Set([...(previous.task_types || []), ...((result.facets || {}).task_types || [])])).sort(),
          models: Array.from(new Set([...(previous.models || []), ...((result.facets || {}).models || [])])).sort()
        }));
      }).catch(error => {
        if (error.name === 'AbortError') return;
        setError(error.message || '加载失败');
        if (toastRef.current) toastRef.current(error.message || '加载失败');
      }).finally(() => {
        if (!pendingRequestRef.current || pendingRequestRef.current.controller !== controller) return;
        pendingRequestRef.current = null;
        setLoading(false);
      });
      pendingRequestRef.current = {
        key: requestKey,
        controller,
        promise
      };
      return promise;
    }, [applied, offset]);
    useEffect(() => {
      load();
      return () => {
        const controller = pendingRequestRef.current && pendingRequestRef.current.controller;
        if (controller) controller.abort();
      };
    }, [load]);
    const loadRates = useCallback(() => {
      setRateLoading(true);
      setRateError('');
      return window.LF_API.adminModelRates().then(result => {
        const next = result || [];
        setRates(next);
        setRateDrafts(Object.fromEntries(next.map(rate => [rate.model_name, {
          input_rmb_per_mtok: String(rate.input_rmb_per_mtok ?? 0),
          cached_input_rmb_per_mtok: String(rate.cached_input_rmb_per_mtok ?? 0),
          output_rmb_per_mtok: String(rate.output_rmb_per_mtok ?? 0),
          reasoning_rmb_per_mtok: String(rate.reasoning_rmb_per_mtok ?? 0),
          discount_pct: String((Number(rate.cost_discount_bps ?? 10000) / 100).toFixed(2).replace(/\.00$/, '')),
          active: rate.active !== false
        }])));
      }).catch(error => {
        setRateError(error.message || '模型价格加载失败');
      }).finally(() => setRateLoading(false));
    }, []);
    const openPrices = () => {
      setPriceOpen(true);
      if (!rates && !rateLoading) loadRates();
    };
    const updateRate = (modelName, field, value) => setRateDrafts(current => ({
      ...current,
      [modelName]: {
        ...(current[modelName] || {}),
        [field]: value
      }
    }));
    const saveRate = async rate => {
      const draft = rateDrafts[rate.model_name] || {};
      const discount = Number(draft.discount_pct);
      const prices = Object.fromEntries(RATE_FIELDS.map(([field]) => [field, Number(draft[field])]));
      if (!Number.isFinite(discount) || discount < 0 || discount > 100 || Object.values(prices).some(value => !Number.isFinite(value) || value < 0)) {
        if (toastRef.current) toastRef.current('价格需大于等于 0，折扣比例需在 0% 到 100% 之间');
        return;
      }
      setSavingRate(rate.model_name);
      try {
        const saved = await window.LF_API.adminUpsertModelRate(rate.model_name, {
          input_token_micros: rate.input_token_micros,
          output_token_micros: rate.output_token_micros,
          reasoning_token_micros: rate.reasoning_token_micros,
          cached_input_token_micros: rate.cached_input_token_micros,
          ...prices,
          rmb_price_source: rate.rmb_price_source,
          rmb_price_checked_at: rate.rmb_price_checked_at,
          cost_discount_bps: Math.round(discount * 100),
          active: draft.active !== false
        });
        setRates(current => (current || []).map(item => item.model_name === saved.model_name ? saved : item));
        updateRate(saved.model_name, 'discount_pct', String((Number(saved.cost_discount_bps) / 100).toFixed(2).replace(/\.00$/, '')));
        if (toastRef.current) toastRef.current(`${saved.model_name} 价格配置已保存`);
        await load();
      } catch (error) {
        if (toastRef.current) toastRef.current(error.message || '模型价格保存失败');
      } finally {
        setSavingRate('');
      }
    };
    const update = (key, value) => setFilters(current => ({
      ...current,
      [key]: value
    }));
    const apply = () => {
      setOffset(0);
      setApplied({
        ...filters,
        q: filters.q.trim()
      });
    };
    const reset = () => {
      setFilters(defaults);
      setOffset(0);
      setApplied(defaults);
    };
    const setRange = days => {
      const next = {
        ...filters,
        days,
        q: filters.q.trim()
      };
      setFilters(next);
      setOffset(0);
      setApplied(next);
    };
    const summary = (data || {}).summary || {};
    const ledger = (data || {}).ledger || {
      items: [],
      total: 0,
      limit,
      offset
    };
    const taskOptions = useMemo(() => facets.task_types || [], [facets]);
    const tabs = [['task_type', '生产环节'], ['model', '模型'], ['user_book', '用户 / 作品'], ['ledger', '任务流水']];
    return /*#__PURE__*/React.createElement("main", {
      className: "tok-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "tok-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "\u6A21\u578B\u6210\u672C\u4E0E Token"), /*#__PURE__*/React.createElement("p", null, "\u56DE\u7B54\u6210\u672C\u82B1\u4E86\u591A\u5C11\u3001\u82B1\u5728\u54EA\u4E2A\u73AF\u8282\u3001\u5931\u8D25\u6D6A\u8D39\u4E86\u591A\u5C11\u3002")), /*#__PURE__*/React.createElement("div", {
      className: "tok-head-actions"
    }, /*#__PURE__*/React.createElement("label", {
      className: "tok-preview-switch"
    }, /*#__PURE__*/React.createElement("span", null, "\u6298\u6263\u4EF7\u9884\u89C8", /*#__PURE__*/React.createElement("small", null, "\u4EC5\u5207\u6362\u5C55\u793A\uFF0C\u4E0D\u91CD\u65B0\u67E5\u8BE2")), /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: discountedPreview,
      onChange: event => setDiscountedPreview(event.target.checked)
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "tok-config-button",
      onClick: openPrices
    }, "\u914D\u7F6E\u6A21\u578B\u4EF7\u683C"), /*#__PURE__*/React.createElement("details", {
      className: "tok-scope"
    }, /*#__PURE__*/React.createElement("summary", null, "\u7EDF\u8BA1\u53E3\u5F84"), /*#__PURE__*/React.createElement("p", null, "\u7269\u7406 Token = input + output\uFF1Bcached \u662F input \u5B50\u96C6\uFF0Creasoning \u662F output \u5B50\u96C6\u3002\u6A21\u578B\u6210\u672C\u6309\u5F53\u524D\u751F\u6548\u7684\u5B98\u65B9\u516C\u5F00\u4EF7\u91CD\u4F30\uFF0C\u5931\u8D25\u6210\u672C\u4EC5\u7EDF\u8BA1\u5DF2\u56DE\u6536\u7528\u91CF\uFF0C\u662F\u4E0B\u754C\u3002\u6A21\u578B\u7B5B\u9009\u6309\u201C\u5305\u542B\u8BE5\u6A21\u578B\u7684\u4EFB\u52A1\u201D\u8FC7\u6EE4\uFF0C\u4FDD\u7559\u4EFB\u52A1\u5168\u94FE\u8DEF\u6210\u672C\u3002\u7B14\u529B\u53D6\u5DF2\u7ED3\u7B97\u6D41\u6C34\uFF0C\u4E0E\u6A21\u578B\u6210\u672C\u5206\u8D26\u5C55\u793A\uFF0C\u672C\u9875\u4E0D\u8BA1\u7B97\u6BDB\u5229\u3002")))), /*#__PURE__*/React.createElement("div", {
      className: "tok-range",
      "aria-label": "\u65F6\u95F4\u8303\u56F4"
    }, [[7, '7 天'], [30, '30 天'], [90, '90 天']].map(([days, label]) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: days,
      className: Number(filters.days) === days ? 'on' : '',
      onClick: () => setRange(days)
    }, label))), /*#__PURE__*/React.createElement("section", {
      className: "tok-filters",
      "aria-label": "\u7B5B\u9009\u6761\u4EF6"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, "\u751F\u4EA7\u73AF\u8282"), /*#__PURE__*/React.createElement("select", {
      value: filters.task_type,
      onChange: event => update('task_type', event.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u5168\u90E8\u73AF\u8282"), taskOptions.map(value => /*#__PURE__*/React.createElement("option", {
      value: value,
      key: value
    }, taskLabel(value))))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, "\u6A21\u578B"), /*#__PURE__*/React.createElement("select", {
      value: filters.model_name,
      onChange: event => update('model_name', event.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u5168\u90E8\u6A21\u578B"), (facets.models || []).map(value => /*#__PURE__*/React.createElement("option", {
      value: value,
      key: value
    }, value)))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, "\u6570\u636E\u72B6\u6001"), /*#__PURE__*/React.createElement("select", {
      value: filters.state,
      onChange: event => update('state', event.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, "\u5168\u90E8\u72B6\u6001"), /*#__PURE__*/React.createElement("option", {
      value: "attention"
    }, "\u4EC5\u5F02\u5E38"), /*#__PURE__*/React.createElement("option", {
      value: "missing_usage"
    }, "\u7F3A Token \u7528\u91CF"), /*#__PURE__*/React.createElement("option", {
      value: "missing_rate"
    }, "\u7F3A\u4EBA\u6C11\u5E01\u8D39\u7387"), /*#__PURE__*/React.createElement("option", {
      value: "invalid_usage"
    }, "\u7528\u91CF\u5B57\u6BB5\u5F02\u5E38"), /*#__PURE__*/React.createElement("option", {
      value: "high_reasoning"
    }, "\u63A8\u7406\u5360\u6BD4\u8F83\u9AD8"), /*#__PURE__*/React.createElement("option", {
      value: "normal"
    }, "\u6B63\u5E38"))), /*#__PURE__*/React.createElement("label", {
      className: "tok-search"
    }, /*#__PURE__*/React.createElement("span", null, "\u68C0\u7D22"), /*#__PURE__*/React.createElement("input", {
      value: filters.q,
      onChange: event => update('q', event.target.value),
      onKeyDown: event => {
        if (event.key === 'Enter') apply();
      },
      placeholder: "\u7528\u6237\u3001\u4F5C\u54C1\u6216\u4EFB\u52A1 ID"
    })), /*#__PURE__*/React.createElement("div", {
      className: "tok-filter-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "secondary",
      onClick: reset
    }, "\u91CD\u7F6E"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: apply
    }, "\u5E94\u7528"))), error && /*#__PURE__*/React.createElement("div", {
      className: "tok-error"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: load
    }, "\u91CD\u8BD5")), data && data.scope && data.scope.truncated && /*#__PURE__*/React.createElement("div", {
      className: "tok-warning"
    }, "\u5F53\u524D\u7B5B\u9009\u7ED3\u679C\u8D85\u8FC7 ", number(data.scope.max_analyzed_tasks), " \u4E2A\u4EFB\u52A1\uFF1B\u4E3A\u4FDD\u62A4\u6570\u636E\u5E93\uFF0C\u672C\u9875\u53EA\u7EDF\u8BA1\u6700\u8FD1\u7684\u4E0A\u9650\u8303\u56F4\uFF0C\u8BF7\u7F29\u77ED\u65F6\u95F4\u6216\u589E\u52A0\u7B5B\u9009\u6761\u4EF6\u3002"), loading && !data ? /*#__PURE__*/React.createElement("div", {
      className: "tok-loading"
    }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null)) : data && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Summary, {
      row: summary,
      days: Number(applied.days),
      discounted: discountedPreview
    }), /*#__PURE__*/React.createElement(CostTrend, {
      rows: data.trend,
      discounted: discountedPreview
    }), /*#__PURE__*/React.createElement("section", {
      className: "tok-secondary-grid"
    }, /*#__PURE__*/React.createElement("div", {
      className: "tok-open-space",
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement(ModelStructure, {
      rows: data.by_model,
      discounted: discountedPreview
    })), !!summary.cost_incomplete_tasks && /*#__PURE__*/React.createElement(Attention, {
      rows: data.attention,
      onSelect: setSelected
    }), /*#__PURE__*/React.createElement("section", {
      className: "tok-panel tok-breakdown"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "\u6210\u672C\u62C6\u89E3"), /*#__PURE__*/React.createElement("p", null, "\u4ECE\u751F\u4EA7\u73AF\u8282\u3001\u6A21\u578B\u3001\u7528\u6237\u4E0E\u5355\u6B21\u4EFB\u52A1\u56DB\u4E2A\u7EF4\u5EA6\u5B9A\u4F4D\u6210\u672C")), /*#__PURE__*/React.createElement("span", null, number(ledger.total), " \u4E2A\u4EFB\u52A1")), /*#__PURE__*/React.createElement("nav", {
      className: "tok-tabs",
      "aria-label": "\u6210\u672C\u62C6\u89E3\u7EF4\u5EA6"
    }, tabs.map(tab => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: tab[0],
      className: activeTab === tab[0] ? 'on' : '',
      "aria-pressed": activeTab === tab[0],
      onClick: () => setActiveTab(tab[0])
    }, tab[1]))), activeTab === 'task_type' && /*#__PURE__*/React.createElement(StageTable, {
      rows: data.by_task_type,
      discounted: discountedPreview
    }), activeTab === 'model' && /*#__PURE__*/React.createElement(ModelTable, {
      rows: data.by_model,
      discounted: discountedPreview
    }), activeTab === 'user_book' && /*#__PURE__*/React.createElement(UserBookTable, {
      rows: data.by_user_book,
      discounted: discountedPreview
    }), activeTab === 'ledger' && /*#__PURE__*/React.createElement(LedgerTable, {
      ledger: ledger,
      onSelect: setSelected,
      onPage: setOffset,
      discounted: discountedPreview
    }))), selected && /*#__PURE__*/React.createElement(DetailDrawer, {
      task: selected,
      discounted: discountedPreview,
      onClose: () => setSelected(null)
    }), priceOpen && /*#__PURE__*/React.createElement(PriceDrawer, {
      rates: rates || [],
      drafts: rateDrafts,
      loading: rateLoading,
      error: rateError,
      saving: savingRate,
      onChange: updateRate,
      onSave: saveRate,
      onClose: () => setPriceOpen(false)
    }));
  }
  window.AdminTokenTrackingTab = TokenTrackingTab;
})();
}
