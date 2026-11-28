{
/* ===== 管理后台 / 数据总览 ===== */
(function () {
  const {
    useMemo
  } = React;
  const CartesianChart = window.AdminCartesianChart;
  const FunnelChart = window.AdminFunnelChart;
  const COPY = {
    title: {
      zh: '数据总览',
      en: 'Overview'
    },
    subtitle: {
      zh: '注册 Cohort 到持续连载',
      en: 'From registration cohort to sustained writing'
    },
    refresh: {
      zh: '刷新',
      en: 'Refresh'
    },
    newUsers: {
      zh: '注册用户',
      en: 'Registered users'
    },
    activationRate: {
      zh: '作品创建率',
      en: 'Book creation rate'
    },
    setupRate: {
      zh: '建书完成率',
      en: 'Book setup rate'
    },
    firstChapterRate: {
      zh: '首章完成率',
      en: 'First chapter rate'
    },
    paidRate: {
      zh: '付费转化',
      en: 'Paid conversion'
    },
    activationHint: {
      zh: '创建作品',
      en: 'Created a book'
    },
    setupHint: {
      zh: '同一作品资料完整',
      en: 'Same book setup complete'
    },
    firstChapterHint: {
      zh: '同一作品写完首章',
      en: 'Same book reached chapter 1'
    },
    successAttention: {
      zh: '任务尝试成功率需关注',
      en: 'Task-attempt success needs attention'
    },
    successHealthy: {
      zh: '任务尝试成功率正常',
      en: 'Task-attempt success is healthy'
    },
    noFinishedTasks: {
      zh: '暂无已结束任务',
      en: 'No finished tasks yet'
    },
    belowTarget: {
      zh: '低于目标 90%',
      en: 'Below the 90% target'
    },
    viewTaskOps: {
      zh: '查看任务运行',
      en: 'View task operations'
    },
    funnel: {
      zh: '创作成长漏斗',
      en: 'Writing growth funnel'
    },
    funnelScope: {
      zh: '注册 Cohort · 用户去重 · 同一作品',
      en: 'Registration cohort · Deduplicated users · Same book'
    },
    registered: {
      zh: '注册',
      en: 'Registered'
    },
    verified: {
      zh: '完成验证',
      en: 'Verified'
    },
    createdBook: {
      zh: '创建作品',
      en: 'Created a book'
    },
    setupCompleted: {
      zh: '走完建书流程',
      en: 'Completed book setup'
    },
    chapter1: {
      zh: '写完第一章',
      en: 'Finished chapter 1'
    },
    chapter3: {
      zh: '写完三章',
      en: 'Finished 3 chapters'
    },
    chapter5: {
      zh: '写完五章',
      en: 'Finished 5 chapters'
    },
    chapter10: {
      zh: '写完 10 章',
      en: 'Finished 10 chapters'
    },
    chapter20: {
      zh: '写完 20 章',
      en: 'Finished 20 chapters'
    },
    chapter50: {
      zh: '写完 50 章',
      en: 'Finished 50 chapters'
    },
    ofRegistered: {
      zh: '占注册 Cohort',
      en: 'of registration cohort'
    },
    fromPrevious: {
      zh: '上一步',
      en: 'from previous'
    },
    engineUnavailable: {
      zh: 'Engine 里程碑暂不可用',
      en: 'Engine milestones unavailable'
    },
    trend: {
      zh: '新增与任务趋势',
      en: 'New users and task trend'
    },
    tasks: {
      zh: '任务',
      en: 'Tasks'
    },
    retention: {
      zh: '用户留存 Cohort',
      en: 'User retention cohorts'
    },
    cohortWeek: {
      zh: '注册周',
      en: 'Cohort'
    },
    production: {
      zh: '创作产出',
      en: 'Production output'
    },
    totalBooks: {
      zh: '累计作品',
      en: 'Total books'
    },
    totalChapters: {
      zh: '累计章节',
      en: 'Total chapters'
    },
    totalTasks: {
      zh: '累计任务',
      en: 'Total tasks'
    },
    engagement: {
      zh: '活跃与留存',
      en: 'Engagement and retention'
    },
    commercial: {
      zh: '商业转化',
      en: 'Commercial conversion'
    },
    payingUsers: {
      zh: '付费用户',
      en: 'Paying users'
    },
    revenue: {
      zh: '累计营收',
      en: 'Total revenue'
    },
    sampleSmall: {
      zh: '样本较小',
      en: 'Small sample'
    }
  };
  const t = key => {
    const value = COPY[key];
    return value ? value[window.CLANG === 'en' ? 'en' : 'zh'] : key;
  };
  const number = value => (Number(value) || 0).toLocaleString();
  const compact = value => {
    const n = Number(value) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k';
    return String(n);
  };
  const percentage = (value, total) => total ? (Number(value || 0) / total * 100).toFixed(1) : '0.0';
  const money = cents => '¥' + ((Number(cents) || 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  function OverviewMetric({
    label,
    value,
    meta,
    tone = 'neutral'
  }) {
    return /*#__PURE__*/React.createElement("article", {
      className: 'adm-overview-metric ' + tone
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-overview-metric-label"
    }, label), /*#__PURE__*/React.createElement("strong", null, value), meta ? /*#__PURE__*/React.createElement("div", {
      className: "adm-overview-metric-meta"
    }, meta) : null);
  }
  function PeriodControls({
    days,
    loading,
    onDaysChange,
    onRefresh
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-overview-controls",
      "aria-label": window.CLANG === 'en' ? 'Date range' : '时间范围'
    }, [1, 3, 7, 30].map(value => /*#__PURE__*/React.createElement("button", {
      key: value,
      type: "button",
      "aria-pressed": days === value,
      className: days === value ? 'on' : '',
      onClick: () => onDaysChange(value)
    }, window.CLANG === 'en' ? `Last ${value} days` : `近 ${value} 天`)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "refresh",
      onClick: onRefresh,
      disabled: loading
    }, /*#__PURE__*/React.createElement("svg", {
      className: loading ? 'spin' : '',
      width: "14",
      height: "14",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M20 11a8 8 0 1 0 2 5"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "20 4 20 11 13 11"
    })), t('refresh')));
  }
  const FUNNEL_STAGES = [['registered', 'registered'], ['verified', 'verified'], ['created_book', 'createdBook'], ['book_setup_completed', 'setupCompleted'], ['chapter_1', 'chapter1'], ['chapter_3', 'chapter3'], ['chapter_5', 'chapter5'], ['chapter_10', 'chapter10'], ['chapter_20', 'chapter20'], ['chapter_50', 'chapter50']];
  function GrowthFunnel({
    funnel
  }) {
    const stages = FUNNEL_STAGES.map(([key, labelKey]) => ({
      key,
      label: t(labelKey),
      value: funnel[key]
    }));
    return /*#__PURE__*/React.createElement(FunnelChart, {
      stages: stages,
      ariaLabel: t('funnel'),
      overallLabel: t('ofRegistered'),
      previousLabel: t('fromPrevious')
    });
  }
  function TrendLineChart({
    timeseries,
    days
  }) {
    const rows = useMemo(() => {
      const byDate = source => new Map((source || []).map(point => [point.date, Number(point.value) || 0]));
      const users = byDate(timeseries.new_users);
      const tasks = byDate(timeseries.tasks);
      const dates = [];
      const today = new Date();
      for (let offset = days - 1; offset >= 0; offset -= 1) {
        const current = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
        dates.push(current.toISOString().slice(0, 10));
      }
      return dates.map(date => ({
        date,
        users: users.get(date) || 0,
        tasks: tasks.get(date) || 0
      }));
    }, [timeseries, days]);
    return /*#__PURE__*/React.createElement(CartesianChart, {
      rows: rows,
      xKey: "date",
      xTickFormatter: value => String(value).slice(5).replace('-', '/'),
      ariaLabel: t('trend'),
      series: [{
        key: 'users',
        label: t('newUsers'),
        tone: 'gold',
        format: number
      }, {
        key: 'tasks',
        label: t('tasks'),
        tone: 'terra',
        dashed: true,
        format: number
      }]
    });
  }
  function RetentionTable({
    rows
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-retention-wrap"
    }, /*#__PURE__*/React.createElement("table", {
      className: "adm-retention-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, t('cohortWeek')), [0, 1, 2, 3, 4, 5].map(week => /*#__PURE__*/React.createElement("th", {
      key: week
    }, "W", week)))), /*#__PURE__*/React.createElement("tbody", null, (rows || []).map(row => /*#__PURE__*/React.createElement("tr", {
      key: row.cohort_start
    }, /*#__PURE__*/React.createElement("th", null, row.cohort_start.slice(5).replace('-', '/'), /*#__PURE__*/React.createElement("small", null, number(row.cohort_size))), (row.retention_pct || []).map((value, index) => /*#__PURE__*/React.createElement("td", {
      key: index,
      style: value == null ? undefined : {
        background: `color-mix(in srgb, var(--gold) ${Math.max(9, value * 0.62)}%, transparent)`
      }
    }, value == null ? '—' : `${value}%`)))))));
  }
  function SummaryRow({
    label,
    value,
    meta,
    tone
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: 'adm-summary-row' + (tone ? ' ' + tone : '')
    }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("strong", null, value), meta ? /*#__PURE__*/React.createElement("small", null, meta) : null);
  }
  function AdminOverviewTab({
    d,
    days,
    loading,
    onDaysChange,
    onRefresh,
    onNavigate
  }) {
    const overview = d.overview || {};
    const funnel = d.activation_funnel || {};
    const engagement = d.engagement || {};
    const taskWindow = d.task_window || {};
    const timeseries = d.timeseries || {};
    const registered = Number(funnel.registered) || 0;
    const successRate = taskWindow.success_rate_pct;
    const needsAttention = successRate != null && Number(successRate) < 90;
    const rate = value => value == null ? '—' : `${percentage(value, registered)}%`;
    const metricMeta = (value, hint) => value == null ? t('engineUnavailable') : `${number(value)} / ${number(registered)} · ${hint}`;
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-overview"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-overview-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, t('title')), /*#__PURE__*/React.createElement("p", null, t('subtitle'))), /*#__PURE__*/React.createElement(PeriodControls, {
      days: days,
      loading: loading,
      onDaysChange: onDaysChange,
      onRefresh: onRefresh
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: 'adm-success-alert ' + (needsAttention ? 'warning' : 'healthy'),
      onClick: () => onNavigate('analysis')
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", null), successRate == null ? t('noFinishedTasks') : `${days}${window.CLANG === 'en' ? 'd' : ' 天'} · ${needsAttention ? t('successAttention') : t('successHealthy')}`), /*#__PURE__*/React.createElement("strong", null, successRate == null ? '—' : `${successRate}%`), /*#__PURE__*/React.createElement("small", null, needsAttention ? t('belowTarget') : t('viewTaskOps')), /*#__PURE__*/React.createElement("svg", {
      width: "15",
      height: "15",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9 18l6-6-6-6"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "adm-overview-kpis"
    }, /*#__PURE__*/React.createElement(OverviewMetric, {
      label: `${days}${window.CLANG === 'en' ? 'd' : ' 天'} · ${t('newUsers')}`,
      value: number(registered),
      meta: t('funnelScope'),
      tone: "primary"
    }), /*#__PURE__*/React.createElement(OverviewMetric, {
      label: t('activationRate'),
      value: rate(funnel.created_book),
      meta: metricMeta(funnel.created_book, t('activationHint')),
      tone: "success"
    }), /*#__PURE__*/React.createElement(OverviewMetric, {
      label: t('setupRate'),
      value: rate(funnel.book_setup_completed),
      meta: metricMeta(funnel.book_setup_completed, t('setupHint')),
      tone: "success"
    }), /*#__PURE__*/React.createElement(OverviewMetric, {
      label: t('firstChapterRate'),
      value: rate(funnel.chapter_1),
      meta: metricMeta(funnel.chapter_1, t('firstChapterHint')),
      tone: "warning"
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-overview-panel adm-funnel-panel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-overview-panel-head"
    }, /*#__PURE__*/React.createElement("h2", null, t('funnel')), /*#__PURE__*/React.createElement("span", {
      className: funnel.engine_available === false ? 'warning' : ''
    }, funnel.engine_available === false ? t('engineUnavailable') : t('funnelScope'))), /*#__PURE__*/React.createElement(GrowthFunnel, {
      funnel: funnel
    })), /*#__PURE__*/React.createElement("div", {
      className: "adm-overview-analytics"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-overview-panel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-overview-panel-head"
    }, /*#__PURE__*/React.createElement("h2", null, t('trend')), /*#__PURE__*/React.createElement("span", null, days, window.CLANG === 'en' ? ' days' : ' 天')), /*#__PURE__*/React.createElement(TrendLineChart, {
      timeseries: timeseries,
      days: days
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-overview-panel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-overview-panel-head"
    }, /*#__PURE__*/React.createElement("h2", null, t('retention')), /*#__PURE__*/React.createElement("span", null, "W0\u2013W5")), /*#__PURE__*/React.createElement(RetentionTable, {
      rows: d.retention_cohorts || []
    }))), /*#__PURE__*/React.createElement("div", {
      className: "adm-overview-results"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-overview-panel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-overview-panel-head"
    }, /*#__PURE__*/React.createElement("h2", null, t('production'))), /*#__PURE__*/React.createElement(SummaryRow, {
      label: t('totalBooks'),
      value: number(overview.total_books)
    }), /*#__PURE__*/React.createElement(SummaryRow, {
      label: t('totalChapters'),
      value: number(overview.total_chapters),
      meta: compact(overview.total_words)
    }), /*#__PURE__*/React.createElement(SummaryRow, {
      label: t('totalTasks'),
      value: number(overview.total_tasks),
      meta: successRate == null ? '—' : `${successRate}%`,
      tone: needsAttention ? 'warning' : ''
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-overview-panel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-overview-panel-head"
    }, /*#__PURE__*/React.createElement("h2", null, t('engagement'))), /*#__PURE__*/React.createElement("div", {
      className: "adm-engagement-grid"
    }, /*#__PURE__*/React.createElement(OverviewMetric, {
      label: "DAU",
      value: number(engagement.dau)
    }), /*#__PURE__*/React.createElement(OverviewMetric, {
      label: "WAU",
      value: number(engagement.wau)
    }), /*#__PURE__*/React.createElement(OverviewMetric, {
      label: "MAU",
      value: number(engagement.mau)
    })), /*#__PURE__*/React.createElement(SummaryRow, {
      label: "DAU / MAU",
      value: engagement.stickiness_pct == null ? '—' : `${engagement.stickiness_pct}%`
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-overview-panel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-overview-panel-head"
    }, /*#__PURE__*/React.createElement("h2", null, t('commercial')), /*#__PURE__*/React.createElement("span", null, registered < 200 ? t('sampleSmall') : null)), /*#__PURE__*/React.createElement(SummaryRow, {
      label: t('payingUsers'),
      value: number(overview.paying_users)
    }), /*#__PURE__*/React.createElement(SummaryRow, {
      label: t('paidRate'),
      value: rate(funnel.paid)
    }), /*#__PURE__*/React.createElement(SummaryRow, {
      label: t('revenue'),
      value: money(overview.revenue_total_cents)
    }))));
  }
  window.AdminOverviewTab = AdminOverviewTab;
})();
}
