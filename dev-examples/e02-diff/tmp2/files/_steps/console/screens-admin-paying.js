{
/* ===== 管理后台 / 付费用户服务追踪 ===== */
(function () {
  const {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
  } = React;
  const DataTable = window.AdminDataTable;
  const SharedFunnelChart = window.AdminFunnelChart;
  const MetricBars = window.AdminMetricBars;
  const tr = (zh, en) => window.CLANG === 'en' ? en : zh;
  const number = value => (Number(value) || 0).toLocaleString();
  const money = cents => '¥' + ((Number(cents) || 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  const credits = millis => ((Number(millis) || 0) / 1000).toLocaleString(undefined, {
    maximumFractionDigits: 1
  });
  const dateTime = value => value ? new Date(value).toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }) : '—';
  const duration = hours => {
    if (hours == null) return '—';
    if (hours < 1) return `${Math.round(hours * 60)} ${tr('分钟', 'min')}`;
    if (hours < 48) return `${Number(hours).toFixed(hours < 10 ? 1 : 0)} ${tr('小时', 'h')}`;
    return `${(hours / 24).toFixed(hours < 240 ? 1 : 0)} ${tr('天', 'd')}`;
  };
  const HEALTH = {
    attention: [tr('需关注', 'Attention'), 'attention'],
    new: [tr('观察中', 'New'), 'new'],
    healthy: [tr('稳定', 'Healthy'), 'healthy']
  };
  function HealthBadge({
    value
  }) {
    const item = HEALTH[value] || HEALTH.healthy;
    return /*#__PURE__*/React.createElement("span", {
      className: 'pay-health ' + item[1]
    }, /*#__PURE__*/React.createElement("i", null), item[0]);
  }
  function SummaryMetric({
    label,
    value,
    note,
    tone
  }) {
    return /*#__PURE__*/React.createElement("article", {
      className: 'pay-metric ' + (tone || '')
    }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("strong", null, value), /*#__PURE__*/React.createElement("small", null, note || '—'));
  }
  function ScopeBar({
    scope,
    engineAvailable
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "pay-scope",
      role: "note"
    }, /*#__PURE__*/React.createElement("strong", null, tr('统计口径', 'Definition')), /*#__PURE__*/React.createElement("span", null, scope.definition), /*#__PURE__*/React.createElement("span", {
      className: 'pay-source ' + (engineAvailable ? 'ok' : 'partial')
    }, engineAvailable ? tr('Portal + Engine 数据完整', 'Portal + Engine available') : tr('Engine 暂不可用，创作里程碑显示为待恢复', 'Engine unavailable; writing milestones are partial')), scope.details_truncated ? /*#__PURE__*/React.createElement("span", {
      className: "pay-source partial"
    }, tr(`服务明细仅展示最近付费的 ${scope.max_detail_users} 位；顶部人数、订单和实付为完整范围统计`, `Service details show the latest ${scope.max_detail_users} payers; headline users, orders, and revenue cover the full range`)) : null);
  }
  function PaymentAlert({
    alert,
    onRead
  }) {
    if (!alert) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "pay-alert",
      role: "status"
    }, /*#__PURE__*/React.createElement("div", {
      className: "pay-alert-mark"
    }, "\xA5"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, alert.title), /*#__PURE__*/React.createElement("p", null, alert.message)), /*#__PURE__*/React.createElement("time", null, dateTime(alert.created_at)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onRead
    }, tr('知道了', 'Dismiss')));
  }
  function ServiceQueue({
    users,
    selectedId,
    onSelect
  }) {
    const queue = users.filter(user => user.health !== 'healthy');
    return /*#__PURE__*/React.createElement("section", {
      className: "pay-panel pay-queue"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, tr('服务队列', 'Service queue')), /*#__PURE__*/React.createElement("p", null, tr('先处理首次价值和失败体验', 'Prioritize first value and failed experiences'))), /*#__PURE__*/React.createElement("b", null, queue.length)), /*#__PURE__*/React.createElement("div", {
      className: "pay-queue-list"
    }, queue.map(user => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: user.user_id,
      className: selectedId === user.user_id ? 'on' : '',
      onClick: () => onSelect(user)
    }, /*#__PURE__*/React.createElement("span", {
      className: "pay-avatar"
    }, user.display_name.slice(0, 1).toUpperCase()), /*#__PURE__*/React.createElement("span", {
      className: "pay-queue-main"
    }, /*#__PURE__*/React.createElement("strong", null, user.display_name), /*#__PURE__*/React.createElement("small", null, user.attention_reasons[0] || tr('等待首次价值信号', 'Waiting for first-value signal'))), /*#__PURE__*/React.createElement(HealthBadge, {
      value: user.health
    }))), !queue.length ? /*#__PURE__*/React.createElement("div", {
      className: "pay-empty-mini"
    }, tr('当前没有需要跟进的付费用户', 'No paying users need follow-up')) : null));
  }
  function BehaviorStrip({
    summary,
    durations
  }) {
    return /*#__PURE__*/React.createElement("section", {
      className: "pay-behavior",
      "aria-label": tr('付费前后关键行为', 'Key pre and post-payment behavior')
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, tr('付费前', 'Before payment')), /*#__PURE__*/React.createElement("strong", null, duration(durations.registration_to_payment_hours)), /*#__PURE__*/React.createElement("small", null, tr('注册至首次付费中位数', 'Median registration to first payment'))), /*#__PURE__*/React.createElement("i", {
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, tr('转化点', 'Conversion')), /*#__PURE__*/React.createElement("strong", null, duration(durations.checkout_to_payment_hours)), /*#__PURE__*/React.createElement("small", null, tr('发起结算至付费中位数', 'Median checkout to payment'))), /*#__PURE__*/React.createElement("i", {
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, tr('付费后', 'After payment')), /*#__PURE__*/React.createElement("strong", null, number(summary.needs_attention)), /*#__PURE__*/React.createElement("small", null, tr('当前需要主动服务', 'Currently need proactive service'))));
  }
  function UsersTable({
    users,
    onSelect
  }) {
    const columns = [{
      key: 'user',
      header: tr('用户', 'User'),
      priority: 'primary',
      sortValue: row => row.display_name,
      render: user => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, user.display_name), /*#__PURE__*/React.createElement("small", null, user.first_product))
    }, {
      key: 'firstPaid',
      header: tr('首次付费', 'First payment'),
      sortValue: row => Date.parse(row.first_paid_at || 0),
      render: user => /*#__PURE__*/React.createElement(React.Fragment, null, dateTime(user.first_paid_at), /*#__PURE__*/React.createElement("small", null, duration(user.time_to_pay_hours)))
    }, {
      key: 'revenue',
      header: tr('累计实付', 'Revenue'),
      numeric: true,
      defaultDirection: 'desc',
      sortValue: row => row.revenue_cents,
      render: user => /*#__PURE__*/React.createElement(React.Fragment, null, money(user.revenue_cents), /*#__PURE__*/React.createElement("small", null, user.order_count, " ", tr('笔订单', 'orders')))
    }, {
      key: 'firstValue',
      header: tr('首次价值', 'First value'),
      numeric: true,
      sortValue: row => row.first_value_hours,
      render: user => /*#__PURE__*/React.createElement(React.Fragment, null, duration(user.first_value_hours), /*#__PURE__*/React.createElement("small", null, user.completed_tasks, " ", tr('次成功任务', 'completed')))
    }, {
      key: 'active',
      header: tr('近 7 天活跃', 'Active 7d'),
      numeric: true,
      sortValue: row => row.active_days_7d,
      render: user => /*#__PURE__*/React.createElement(React.Fragment, null, user.active_days_7d, " ", tr('天', 'days'), /*#__PURE__*/React.createElement("small", null, credits(user.credits_consumed_millis), " ", tr('笔力消耗', 'credits used')))
    }, {
      key: 'success',
      header: tr('任务成功率', 'Task success'),
      numeric: true,
      sortValue: row => row.task_success_rate_pct,
      render: user => /*#__PURE__*/React.createElement(React.Fragment, null, user.task_success_rate_pct == null ? '—' : `${user.task_success_rate_pct}%`, /*#__PURE__*/React.createElement("small", null, user.post_payment_tasks, " ", tr('次付费后任务', 'post-pay tasks')))
    }, {
      key: 'health',
      header: tr('状态', 'Status'),
      sortValue: row => row.health,
      searchValue: row => (HEALTH[row.health] || HEALTH.healthy)[0],
      render: user => /*#__PURE__*/React.createElement(HealthBadge, {
        value: user.health
      })
    }];
    return /*#__PURE__*/React.createElement("section", {
      className: "pay-panel pay-users"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, tr('付费用户', 'Paying users')), /*#__PURE__*/React.createElement("p", null, tr('按表头排序，选择用户查看完整旅程', 'Sort by column, then select a user for the complete journey'))), /*#__PURE__*/React.createElement("span", null, number(users.length), " ", tr('人', 'users'))), /*#__PURE__*/React.createElement(DataTable, {
      rows: users,
      columns: columns,
      rowKey: "user_id",
      ariaLabel: tr('付费用户', 'Paying users'),
      search: {
        placeholder: tr('搜索用户、产品或状态', 'Search users, products, or status')
      },
      pageSize: 15,
      initialSort: {
        key: 'revenue',
        direction: 'desc'
      },
      wrapClassName: "pay-table-wrap",
      onRowActivate: onSelect,
      empty: tr('当前范围没有真实付费用户', 'No real paying users in this range')
    }));
  }
  function FunnelChart({
    activation,
    checkout,
    trackingStarted
  }) {
    const checkoutByKey = Object.fromEntries((checkout || []).map(item => [item.key, item]));
    const stages = [[tr('注册', 'Registered'), activation.registered], [tr('创建作品', 'Created book'), activation.created_book], [tr('完成建书', 'Book setup'), activation.book_setup_completed], [tr('写完首章', 'Chapter 1'), activation.chapter_1], [tr('查看定价', 'Viewed pricing'), trackingStarted ? checkoutByKey.pricing_viewed?.count : null], [tr('发起结算', 'Checkout started'), trackingStarted ? checkoutByKey.checkout_started?.count : null], [tr('完成实付', 'Paid'), activation.paid]];
    return /*#__PURE__*/React.createElement("section", {
      className: "pay-panel pay-chart"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, tr('付费前转化路径', 'Pre-payment conversion path')), /*#__PURE__*/React.createElement("p", null, tr('注册 Cohort，用户去重，同一作品里程碑', 'Registration cohort, deduplicated users, same-book milestones')))), /*#__PURE__*/React.createElement(SharedFunnelChart, {
      stages: stages.map(([label, value], index) => ({
        key: index,
        label,
        value
      })),
      ariaLabel: tr('付费前转化路径', 'Pre-payment conversion path'),
      compact: true
    }), !trackingStarted ? /*#__PURE__*/React.createElement("p", {
      className: "pay-tracking-note"
    }, tr('定价与结算行为从本次版本上线后开始累计，历史订单不反推。', 'Pricing and checkout events start accumulating with this release; historical orders are not inferred.')) : null);
  }
  function DurationChart({
    durations
  }) {
    const items = [[tr('注册 → 付费', 'Register → paid'), durations.registration_to_payment_hours], [tr('查看定价 → 付费', 'Pricing → paid'), durations.pricing_to_payment_hours], [tr('发起结算 → 付费', 'Checkout → paid'), durations.checkout_to_payment_hours]];
    return /*#__PURE__*/React.createElement("section", {
      className: "pay-panel pay-chart"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, tr('转化耗时', 'Conversion duration')), /*#__PURE__*/React.createElement("p", null, tr('中位数，避免少量极端值误导', 'Median, resistant to small-sample outliers')))), /*#__PURE__*/React.createElement(MetricBars, {
      items: items.map(([label, value], index) => ({
        key: index,
        label,
        value
      })),
      ariaLabel: tr('转化耗时', 'Conversion duration'),
      format: duration,
      tone: "slate"
    }));
  }
  function CheckoutLoss({
    checkout,
    trackingStarted
  }) {
    const items = (checkout || []).map((item, index) => {
      const previous = index ? checkout[index - 1].count : null;
      const rate = previous ? Math.round(item.count / previous * 100) : null;
      return {
        key: item.key,
        label: item.label,
        value: trackingStarted ? item.count : null,
        detail: rate == null ? '—' : `${rate}% · ${tr('较上一阶段', 'from previous stage')}`
      };
    });
    return /*#__PURE__*/React.createElement("section", {
      className: "pay-panel pay-chart"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, tr('结算流失', 'Checkout loss')), /*#__PURE__*/React.createElement("p", null, tr('识别支付链路的阻塞点', 'Locate friction in the payment journey')))), /*#__PURE__*/React.createElement(MetricBars, {
      items: items,
      ariaLabel: tr('结算流失', 'Checkout loss'),
      format: number,
      tone: "terra"
    }));
  }
  function UserDrawer({
    user,
    onClose,
    onNavigateUsers,
    engineAvailable
  }) {
    useEffect(() => {
      const close = event => {
        if (event.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', close);
      return () => document.removeEventListener('keydown', close);
    }, [onClose]);
    if (!user) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "pay-drawer-layer",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": tr('付费用户详情', 'Paying user detail'),
      onMouseDown: event => {
        if (event.target === event.currentTarget) onClose();
      }
    }, /*#__PURE__*/React.createElement("aside", {
      className: "pay-drawer"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(HealthBadge, {
      value: user.health
    }), /*#__PURE__*/React.createElement("h2", null, user.display_name), /*#__PURE__*/React.createElement("p", null, user.email_masked, " \xB7 ", user.first_product)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onClose,
      "aria-label": tr('关闭', 'Close')
    }, "\xD7")), /*#__PURE__*/React.createElement("div", {
      className: "pay-drawer-body"
    }, user.attention_reasons.length ? /*#__PURE__*/React.createElement("section", {
      className: "pay-followup"
    }, /*#__PURE__*/React.createElement("h3", null, tr('建议优先跟进', 'Priority follow-up')), user.attention_reasons.map(reason => /*#__PURE__*/React.createElement("p", {
      key: reason
    }, reason))) : null, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, tr('商业关系', 'Commercial relationship')), /*#__PURE__*/React.createElement("dl", {
      className: "pay-detail-grid"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, tr('累计实付', 'Revenue')), /*#__PURE__*/React.createElement("dd", null, money(user.revenue_cents))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, tr('订单数', 'Orders')), /*#__PURE__*/React.createElement("dd", null, user.order_count)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, tr('注册至付费', 'Time to pay')), /*#__PURE__*/React.createElement("dd", null, duration(user.time_to_pay_hours))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, tr('首次价值', 'First value')), /*#__PURE__*/React.createElement("dd", null, duration(user.first_value_hours))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, tr('付费后画像', 'Post-payment profile')), /*#__PURE__*/React.createElement("dl", {
      className: "pay-detail-grid"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, tr('近 7 天活跃', 'Active 7d')), /*#__PURE__*/React.createElement("dd", null, user.active_days_7d, " ", tr('天', 'days'))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, tr('任务成功率', 'Task success')), /*#__PURE__*/React.createElement("dd", null, user.task_success_rate_pct == null ? '—' : `${user.task_success_rate_pct}%`)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, tr('已消费笔力', 'Credits used')), /*#__PURE__*/React.createElement("dd", null, credits(user.credits_consumed_millis))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, tr('已写章节', 'Written chapters')), /*#__PURE__*/React.createElement("dd", null, engineAvailable ? number(user.written_chapters) : '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, tr('作品数', 'Books')), /*#__PURE__*/React.createElement("dd", null, user.book_count)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, tr('累计字数', 'Words')), /*#__PURE__*/React.createElement("dd", null, number(user.word_count)))), user.genres.length ? /*#__PURE__*/React.createElement("p", {
      className: "pay-genres"
    }, tr('题材', 'Genres'), "\uFF1A", user.genres.join('、')) : null), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, tr('关键旅程', 'Key journey')), /*#__PURE__*/React.createElement("ol", {
      className: "pay-timeline"
    }, user.timeline.map((item, index) => /*#__PURE__*/React.createElement("li", {
      key: `${item.label}-${index}`,
      className: item.tone
    }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, item.label), /*#__PURE__*/React.createElement("time", null, dateTime(item.at)))))))), /*#__PURE__*/React.createElement("footer", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onNavigateUsers
    }, tr('前往用户管理', 'Open user management')))));
  }
  function LoadingState() {
    return /*#__PURE__*/React.createElement("div", {
      className: "pay-loading",
      "aria-label": tr('加载中', 'Loading')
    }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null));
  }
  function PayingUsersTab({
    onNavigateUsers
  }) {
    const [days, setDays] = useState(30);
    const [kind, setKind] = useState('all');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(null);
    const pendingRequest = useRef(null);
    const load = useCallback(() => {
      const requestKey = `${days}:${kind}`;
      const pending = pendingRequest.current;
      if (pending && pending.key === requestKey) return pending.promise;
      if (pending) pending.controller.abort();
      const controller = new AbortController();
      setLoading(true);
      setError('');
      const promise = window.LF_API.adminPayingUsers(days, kind, {
        signal: controller.signal
      }).then(result => {
        if (controller.signal.aborted) return;
        setData(result);
        setSelected(current => current ? result.users.find(user => user.user_id === current.user_id) || null : null);
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
    }, [days, kind]);
    useEffect(() => {
      load();
      return () => {
        const controller = pendingRequest.current && pendingRequest.current.controller;
        if (controller) controller.abort();
      };
    }, [load]);
    const markAlertRead = async () => {
      if (!data?.alert) return;
      await window.LF_API.notificationRead(data.alert.id).catch(() => null);
      setData(current => Object.assign({}, current, {
        alert: null
      }));
    };
    const summary = data?.summary || {};
    const trackingStarted = !!data?.scope?.event_tracking_started_at;
    const trackingLabel = trackingStarted ? dateTime(data.scope.event_tracking_started_at) : tr('本次版本上线后', 'After this release');
    const orderedUsers = useMemo(() => data?.users || [], [data]);
    return /*#__PURE__*/React.createElement("div", {
      className: "pay-dashboard"
    }, /*#__PURE__*/React.createElement("div", {
      className: "pay-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, tr('付费用户服务追踪', 'Paying user service desk')), /*#__PURE__*/React.createElement("p", null, tr('理解付费前的转化点，持续改善付费后的服务体验', 'Understand conversion points and improve post-payment service'))), /*#__PURE__*/React.createElement("div", {
      className: "pay-filters"
    }, /*#__PURE__*/React.createElement("div", null, [7, 30, 90].map(value => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: value,
      className: days === value ? 'on' : '',
      onClick: () => setDays(value)
    }, `${value} ${tr('天', 'd')}`))), /*#__PURE__*/React.createElement("select", {
      value: kind,
      onChange: event => setKind(event.target.value),
      "aria-label": tr('付费类型', 'Payment type')
    }, /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, tr('全部付费', 'All payments')), /*#__PURE__*/React.createElement("option", {
      value: "subscription"
    }, tr('订阅', 'Subscription')), /*#__PURE__*/React.createElement("option", {
      value: "credit_pack"
    }, tr('笔力包', 'Credit pack'))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "pay-refresh",
      onClick: load,
      disabled: loading
    }, loading ? '…' : tr('刷新', 'Refresh')))), error ? /*#__PURE__*/React.createElement("div", {
      className: "pay-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("strong", null, tr('看板加载失败', 'Dashboard failed to load')), /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: load
    }, tr('重试', 'Retry'))) : null, !data && loading ? /*#__PURE__*/React.createElement(LoadingState, null) : null, data ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PaymentAlert, {
      alert: data.alert,
      onRead: markAlertRead
    }), /*#__PURE__*/React.createElement("div", {
      className: "pay-kpis"
    }, /*#__PURE__*/React.createElement(SummaryMetric, {
      label: tr('付费用户', 'Paying users'),
      value: number(summary.paying_users),
      note: `${number(summary.new_paying_users)} ${tr('位首次付费', 'first-time payers')}`,
      tone: "primary"
    }), /*#__PURE__*/React.createElement(SummaryMetric, {
      label: tr('累计实付', 'Revenue'),
      value: money(summary.revenue_cents),
      note: `${number(summary.orders)} ${tr('笔真实订单', 'real orders')}`
    }), /*#__PURE__*/React.createElement(SummaryMetric, {
      label: tr('客单价', 'ARPPU'),
      value: money(summary.average_revenue_per_user_cents),
      note: tr('范围内实付 / 付费用户', 'Revenue / paying users')
    }), /*#__PURE__*/React.createElement(SummaryMetric, {
      label: tr('复购用户', 'Repeat payers'),
      value: number(summary.repeat_paying_users),
      note: tr('历史真实订单超过 1 笔', 'More than one historical real order')
    }), /*#__PURE__*/React.createElement(SummaryMetric, {
      label: tr('需主动服务', 'Needs service'),
      value: number(summary.needs_attention),
      note: tr('首次价值、成功率或活跃异常', 'First value, success, or activity risk'),
      tone: summary.needs_attention ? 'attention' : ''
    })), /*#__PURE__*/React.createElement(ScopeBar, {
      scope: data.scope,
      engineAvailable: data.engine_available
    }), /*#__PURE__*/React.createElement(BehaviorStrip, {
      summary: summary,
      durations: data.durations || {}
    }), /*#__PURE__*/React.createElement("div", {
      className: "pay-workbench"
    }, /*#__PURE__*/React.createElement(ServiceQueue, {
      users: orderedUsers,
      selectedId: selected?.user_id,
      onSelect: setSelected
    }), /*#__PURE__*/React.createElement(UsersTable, {
      users: orderedUsers,
      onSelect: setSelected
    })), /*#__PURE__*/React.createElement("div", {
      className: "pay-charts"
    }, /*#__PURE__*/React.createElement(FunnelChart, {
      activation: data.activation_funnel || {},
      checkout: data.checkout_funnel || [],
      trackingStarted: trackingStarted
    }), /*#__PURE__*/React.createElement(DurationChart, {
      durations: data.durations || {}
    }), /*#__PURE__*/React.createElement(CheckoutLoss, {
      checkout: data.checkout_funnel || [],
      trackingStarted: trackingStarted
    })), /*#__PURE__*/React.createElement("p", {
      className: "pay-footnote"
    }, tr('行为埋点起始', 'Behavior tracking starts'), "\uFF1A", trackingLabel, " \xB7 ", tr('不采集正文、提示词或账户明文', 'No prose, prompts, or plaintext account identifiers are collected'))) : null, /*#__PURE__*/React.createElement(UserDrawer, {
      user: selected,
      onClose: () => setSelected(null),
      onNavigateUsers: () => {
        setSelected(null);
        onNavigateUsers();
      },
      engineAvailable: !!data?.engine_available
    }));
  }
  window.PayingUsersTab = PayingUsersTab;
})();
}
