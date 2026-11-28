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
  const COPY = {
    zh: {
      title: 'SEO 与获客',
      subtitle: '增长结果、优化机会与站点健康',
      refresh: '刷新',
      refreshing: '刷新中…',
      days: {
        7: '近 7 天',
        28: '近 28 天',
        90: '近 90 天'
      },
      unknown: '—',
      previous: '对比前期',
      kpis: {
        organic_sessions: '自然搜索访次',
        search_clicks: '搜索点击',
        seo_registrations: 'SEO 新注册',
        seo_books: '创建作品',
        seo_revenue_cents: '真实付费'
      },
      notes: {
        organic_sessions: '站内采集 · 访次',
        search_clicks: 'Search Console · 完整日',
        seo_registrations: '自然搜索首访归因',
        seo_books: '归因用户 · 本期创建',
        seo_revenue_cents: '已支付并履约'
      },
      trend: '搜索、访问与转化趋势',
      trendNote: '自然搜索访次与 SEO 注册按日',
      organic: '自然搜索访次',
      registrations: 'SEO 注册',
      opportunities: 'SEO 优化机会',
      opportunityNote: '按曝光、CTR 与平均位置排序',
      noOpportunities: '当前窗口没有可判断的搜索机会',
      impressions: '曝光',
      ctr: 'CTR',
      position: '位置',
      high: '高',
      medium: '中',
      landings: '落地页价值',
      landingNote: '访次来源与 Portal 业务事实按首访页面连接',
      page: '落地页',
      sessions: '访次',
      multiPage: '多页访问',
      books: '作品',
      paid: '实付',
      judgment: '判断',
      stable: '稳定',
      attention: '需检查',
      searchUnknown: '搜索未知',
      noLandings: '尚无真实落地页样本',
      acquisitionSources: '获客来源',
      acquisitionSourcesNote: 'source 参数优先，域名级 referrer 兜底',
      source: '来源',
      registrationsAll: '注册',
      noSources: '尚无来源样本',
      journeys: '访问路径与停留',
      journeysNote: '按来源聚合页面流转；时长只统计前台活跃时间',
      pathFlow: '常见路径',
      pageEngagement: '页面停留',
      activeTime: '中位活跃时长',
      exits: '退出率',
      noJourneys: '尚无多页访问路径',
      sources: '数据可信度',
      sourcesNote: '来源独立降级，未知不显示为 0',
      siteHealth: '站点健康',
      siteHealthNote: '搜索可见性与访问体验',
      keyPages: '关键页可用',
      noHealth: '未检测',
      vitals: 'Core Web Vitals',
      limited: '样本不足',
      samples: '样本',
      checkDuration: '检测耗时',
      actions: '待处理',
      noActions: '当前没有明确待处理项',
      coverage: '口径说明',
      firstTouch: '业务转化采用首访来源归因；访次保持会话口径。',
      loadFailed: 'SEO 与获客数据载入失败',
      retry: '重试',
      loading: '正在载入获客与健康事实',
      close: '关闭',
      pageDiagnosis: '页面诊断',
      searchPerformance: '搜索表现',
      businessValue: '业务价值',
      technicalHealth: '技术健康',
      pageHealthy: '关键检查通过',
      pageUnhealthy: '关键检查未通过',
      pageUnknown: '尚未执行页面健康检测',
      clickPriority: '主要机会在搜索点击效率',
      technicalPriority: '先修复页面可见性或可用性',
      insufficient: '当前证据不足，暂不下结论',
      searchQueries: '相关搜索机会',
      noQueries: '没有可判断的查询样本',
      firstVisitPath: '首访归因路径'
    },
    en: {
      title: 'SEO & acquisition',
      subtitle: 'Growth outcomes, opportunities, and site health',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      days: {
        7: 'Last 7 days',
        28: 'Last 28 days',
        90: 'Last 90 days'
      },
      unknown: '—',
      previous: 'vs prior period',
      kpis: {
        organic_sessions: 'Organic sessions',
        search_clicks: 'Search clicks',
        seo_registrations: 'SEO registrations',
        seo_books: 'Books created',
        seo_revenue_cents: 'Fulfilled revenue'
      },
      notes: {
        organic_sessions: 'First-party sessions',
        search_clicks: 'Search Console · final days',
        seo_registrations: 'Organic first-touch',
        seo_books: 'Attributed users · created now',
        seo_revenue_cents: 'Paid and fulfilled'
      },
      trend: 'Search, visits, and conversion',
      trendNote: 'Daily organic sessions and registrations',
      organic: 'Organic sessions',
      registrations: 'SEO registrations',
      opportunities: 'SEO opportunities',
      opportunityNote: 'Ranked by impressions, CTR, and average position',
      noOpportunities: 'No search opportunity can be judged in this window',
      impressions: 'Impressions',
      ctr: 'CTR',
      position: 'Position',
      high: 'High',
      medium: 'Medium',
      landings: 'Landing-page value',
      landingNote: 'First-touch pages joined to Portal business facts',
      page: 'Landing page',
      sessions: 'Sessions',
      multiPage: 'Multi-page',
      books: 'Books',
      paid: 'Paid',
      judgment: 'Assessment',
      stable: 'Stable',
      attention: 'Check',
      searchUnknown: 'Search unknown',
      noLandings: 'No real landing-page samples yet',
      acquisitionSources: 'Acquisition sources',
      acquisitionSourcesNote: 'source parameter first, referrer domain as fallback',
      source: 'Source',
      registrationsAll: 'Registrations',
      noSources: 'No source samples yet',
      journeys: 'Paths and engagement',
      journeysNote: 'Page transitions by source; duration counts foreground-active time only',
      pathFlow: 'Common paths',
      pageEngagement: 'Page engagement',
      activeTime: 'Median active time',
      exits: 'Exit rate',
      noJourneys: 'No multi-page paths yet',
      sources: 'Data confidence',
      sourcesNote: 'Sources degrade independently; unknown is never zero',
      siteHealth: 'Site health',
      siteHealthNote: 'Search visibility and visit experience',
      keyPages: 'Healthy key pages',
      noHealth: 'Not checked',
      vitals: 'Core Web Vitals',
      limited: 'Limited sample',
      samples: 'samples',
      checkDuration: 'Check duration',
      actions: 'Actions',
      noActions: 'No clear action right now',
      coverage: 'Metric boundary',
      firstTouch: 'Business outcomes use first-touch attribution; visits remain session-based.',
      loadFailed: 'SEO and acquisition data unavailable',
      retry: 'Retry',
      loading: 'Loading acquisition and health facts',
      close: 'Close',
      pageDiagnosis: 'Page diagnosis',
      searchPerformance: 'Search performance',
      businessValue: 'Business value',
      technicalHealth: 'Technical health',
      pageHealthy: 'Key checks passed',
      pageUnhealthy: 'A key check failed',
      pageUnknown: 'Page health has not run',
      clickPriority: 'Search click efficiency is the main opportunity',
      technicalPriority: 'Fix visibility or availability first',
      insufficient: 'Evidence is insufficient for a conclusion',
      searchQueries: 'Related search opportunities',
      noQueries: 'No query sample can be judged',
      firstVisitPath: 'First-touch path'
    }
  };
  const PAGE_NAMES = {
    '/site/home.html': ['首页', 'Home'],
    '/': ['首页', 'Home'],
    '/site/pricing.html': ['定价页', 'Pricing'],
    '/site/tools.html': ['免费工具', 'Free tool'],
    '/site/world-state.html': ['世界状态机', 'World state'],
    '/site/community.html': ['社群', 'Community'],
    '/site/roadmap.html': ['开发计划', 'Roadmap'],
    '/login.html': ['登录注册', 'Sign in'],
    '/desktop-authorize.html': ['公益插件授权', 'Plugin authorization']
  };
  function fmt(value) {
    return value == null ? '—' : Number(value).toLocaleString();
  }
  function money(cents) {
    return cents == null ? '—' : '¥' + (Number(cents) / 100).toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  }
  function pct(value) {
    return value == null ? '—' : Number(value).toLocaleString(undefined, {
      maximumFractionDigits: 1
    }) + '%';
  }
  function pageName(path, isEn) {
    const names = PAGE_NAMES[path];
    return names ? names[isEn ? 1 : 0] : path;
  }
  function timestamp(value) {
    return value ? new Date(value).toLocaleString(undefined, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }) : '—';
  }
  function duration(ms) {
    const seconds = Math.round(Number(ms || 0) / 1000);
    return seconds < 60 ? seconds + 's' : Math.floor(seconds / 60) + 'm ' + seconds % 60 + 's';
  }
  function deltaText(kpi, isMoney) {
    const change = kpi && kpi.change || {};
    if (change.absolute == null) return '—';
    if (change.pct != null) return (change.pct > 0 ? '+' : '') + change.pct + '%';
    const absolute = isMoney ? money(change.absolute) : fmt(change.absolute);
    return (change.absolute > 0 ? '+' : '') + absolute;
  }
  function KpiGrid({
    rows,
    copy
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-kpis"
    }, rows.map((item, index) => {
      const revenue = item.key === 'seo_revenue_cents';
      return /*#__PURE__*/React.createElement("article", {
        key: item.key,
        className: index < 2 ? 'search' : 'business'
      }, /*#__PURE__*/React.createElement("span", null, copy.kpis[item.key]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, revenue ? money(item.value) : fmt(item.value)), /*#__PURE__*/React.createElement("b", {
        className: (item.change && item.change.absolute || 0) < 0 ? 'down' : ''
      }, deltaText(item, revenue))), /*#__PURE__*/React.createElement("small", null, copy.notes[item.key], " \xB7 ", copy.previous));
    }));
  }
  function Trend({
    rows,
    copy
  }) {
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-seo-panel adm-seo-trend"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, copy.trend), /*#__PURE__*/React.createElement("p", null, copy.trendNote))), /*#__PURE__*/React.createElement(CartesianChart, {
      rows: rows,
      xKey: "date",
      xTickFormatter: value => new Date(value + 'T00:00:00').toLocaleDateString(undefined, {
        month: '2-digit',
        day: '2-digit'
      }),
      ariaLabel: copy.trend,
      empty: "\u2014",
      series: [{
        key: 'organic_sessions',
        label: copy.organic,
        tone: 'slate',
        axis: 'left',
        format: fmt
      }, {
        key: 'seo_registrations',
        label: copy.registrations,
        tone: 'sage',
        axis: 'right',
        format: fmt
      }]
    }));
  }
  function Opportunities({
    rows,
    copy,
    onOpen
  }) {
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-seo-panel adm-seo-opportunities"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, copy.opportunities), /*#__PURE__*/React.createElement("p", null, copy.opportunityNote))), /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-opportunity-list"
    }, rows.length ? rows.slice(0, 5).map(row => /*#__PURE__*/React.createElement("button", {
      key: row.query + row.page_path,
      onClick: () => onOpen(row.page_path)
    }, /*#__PURE__*/React.createElement("span", {
      className: 'priority ' + row.priority
    }, row.priority === 'high' ? copy.high : copy.medium), /*#__PURE__*/React.createElement("span", {
      className: "query"
    }, /*#__PURE__*/React.createElement("strong", null, row.query), /*#__PURE__*/React.createElement("small", null, pageName(row.page_path, copy === COPY.en), " \xB7 ", row.action)), /*#__PURE__*/React.createElement("span", {
      className: "metrics"
    }, /*#__PURE__*/React.createElement("i", null, /*#__PURE__*/React.createElement("small", null, copy.impressions), /*#__PURE__*/React.createElement("b", null, fmt(row.impressions))), /*#__PURE__*/React.createElement("i", null, /*#__PURE__*/React.createElement("small", null, copy.ctr), /*#__PURE__*/React.createElement("b", null, pct(row.ctr_pct))), /*#__PURE__*/React.createElement("i", null, /*#__PURE__*/React.createElement("small", null, copy.position), /*#__PURE__*/React.createElement("b", null, row.position))))) : /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-inline-empty"
    }, copy.noOpportunities)));
  }
  function LandingTable({
    rows,
    copy,
    onOpen
  }) {
    const columns = [{
      key: 'page',
      header: copy.page,
      priority: 'primary',
      sortValue: row => pageName(row.path, copy === COPY.en),
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, pageName(row.path, copy === COPY.en)), /*#__PURE__*/React.createElement("small", null, row.path))
    }, {
      key: 'sessions',
      header: copy.sessions,
      numeric: true,
      defaultDirection: 'desc',
      sortValue: row => row.sessions,
      render: row => fmt(row.sessions)
    }, {
      key: 'multiPage',
      header: copy.multiPage,
      numeric: true,
      sortValue: row => row.multi_page_pct,
      render: row => pct(row.multi_page_pct)
    }, {
      key: 'registrations',
      header: copy.kpis.seo_registrations,
      numeric: true,
      sortValue: row => row.registrations,
      render: row => fmt(row.registrations)
    }, {
      key: 'books',
      header: copy.books,
      numeric: true,
      sortValue: row => row.books,
      render: row => fmt(row.books)
    }, {
      key: 'paid',
      header: copy.paid,
      numeric: true,
      defaultDirection: 'desc',
      sortValue: row => row.revenue_cents,
      render: row => money(row.revenue_cents)
    }, {
      key: 'judgment',
      header: copy.judgment,
      sortValue: row => row.health && row.health.healthy === false ? 2 : !row.search ? 1 : 0,
      render: row => {
        const state = row.health && row.health.healthy === false ? 'attention' : !row.search ? 'unknown' : 'stable';
        return /*#__PURE__*/React.createElement("span", {
          className: state
        }, state === 'attention' ? copy.attention : state === 'unknown' ? copy.searchUnknown : copy.stable);
      }
    }];
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-seo-panel adm-seo-landings"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, copy.landings), /*#__PURE__*/React.createElement("p", null, copy.landingNote))), /*#__PURE__*/React.createElement(DataTable, {
      rows: rows,
      columns: columns,
      rowKey: "path",
      ariaLabel: copy.landings,
      initialSort: {
        key: 'sessions',
        direction: 'desc'
      },
      wrapClassName: "adm-seo-table-wrap",
      onRowActivate: row => onOpen(row.path),
      empty: copy.noLandings
    }));
  }
  function AcquisitionSources({
    rows,
    copy
  }) {
    const columns = [{
      key: 'source',
      header: copy.source,
      priority: 'primary',
      sortValue: row => row.label,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, row.label), /*#__PURE__*/React.createElement("small", null, row.source_key))
    }, {
      key: 'sessions',
      header: copy.sessions,
      numeric: true,
      defaultDirection: 'desc',
      sortValue: row => row.sessions,
      render: row => fmt(row.sessions)
    }, {
      key: 'registrations',
      header: copy.registrationsAll,
      numeric: true,
      sortValue: row => row.registrations,
      render: row => fmt(row.registrations)
    }, {
      key: 'books',
      header: copy.books,
      numeric: true,
      sortValue: row => row.books,
      render: row => fmt(row.books)
    }, {
      key: 'paid',
      header: copy.paid,
      numeric: true,
      defaultDirection: 'desc',
      sortValue: row => row.revenue_cents,
      render: row => money(row.revenue_cents)
    }];
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-seo-panel adm-seo-source-performance"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, copy.acquisitionSources), /*#__PURE__*/React.createElement("p", null, copy.acquisitionSourcesNote))), /*#__PURE__*/React.createElement(DataTable, {
      rows: rows,
      columns: columns,
      rowKey: "source_key",
      ariaLabel: copy.acquisitionSources,
      initialSort: {
        key: 'sessions',
        direction: 'desc'
      },
      wrapClassName: "adm-seo-table-wrap",
      empty: copy.noSources
    }));
  }
  function JourneyInsights({
    journeys,
    pages,
    copy
  }) {
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-seo-panel adm-seo-journeys"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, copy.journeys), /*#__PURE__*/React.createElement("p", null, copy.journeysNote))), /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-journey-grid"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, copy.pathFlow), journeys.length ? journeys.slice(0, 8).map(row => /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-journey-row",
      key: row.source_key + row.from_path + row.to_path
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, row.source_label), /*#__PURE__*/React.createElement("small", null, pageName(row.from_path, copy === COPY.en), " \u2192 ", pageName(row.to_path, copy === COPY.en))), /*#__PURE__*/React.createElement("strong", null, fmt(row.count)))) : /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-inline-empty"
    }, copy.noJourneys)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, copy.pageEngagement), pages.slice(0, 8).map(row => /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-engagement-row",
      key: row.path
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, pageName(row.path, copy === COPY.en)), /*#__PURE__*/React.createElement("small", null, fmt(row.pageviews), " PV")), /*#__PURE__*/React.createElement("strong", null, duration(row.median_engaged_ms)), /*#__PURE__*/React.createElement("em", null, pct(row.exit_pct)))))));
  }
  function SourceHealth({
    data,
    copy
  }) {
    const pageRows = data.page_health || [];
    const healthy = pageRows.filter(row => row.healthy).length;
    const vitals = data.web_vitals || {};
    const metric = (value, suffix) => value == null ? '—' : value + suffix;
    const actions = [];
    (data.opportunities || []).slice(0, 1).forEach(row => actions.push({
      tone: row.priority,
      title: row.query,
      detail: row.action
    }));
    pageRows.filter(row => !row.healthy).slice(0, 2).forEach(row => actions.push({
      tone: 'high',
      title: pageName(row.page_path, copy === COPY.en),
      detail: row.error_summary || 'HTTP ' + (row.status_code == null ? '—' : row.status_code)
    }));
    return /*#__PURE__*/React.createElement("aside", {
      className: "adm-seo-rail"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-seo-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, copy.sources), /*#__PURE__*/React.createElement("p", null, copy.sourcesNote))), /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-source-list"
    }, (data.sources || []).map(source => /*#__PURE__*/React.createElement("div", {
      key: source.source,
      className: 'adm-seo-source ' + source.status
    }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, source.label), /*#__PURE__*/React.createElement("small", null, source.data_through ? String(source.data_through) : timestamp(source.freshness_at))), /*#__PURE__*/React.createElement("b", null, source.summary))))), /*#__PURE__*/React.createElement("section", {
      className: "adm-seo-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, copy.siteHealth), /*#__PURE__*/React.createElement("p", null, copy.siteHealthNote))), /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-health-count"
    }, /*#__PURE__*/React.createElement("span", null, copy.keyPages), /*#__PURE__*/React.createElement("strong", null, pageRows.length ? healthy + ' / ' + pageRows.length : '—'), /*#__PURE__*/React.createElement("small", null, pageRows.length ? healthy === pageRows.length ? copy.stable : copy.attention : copy.noHealth)), /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-vitals"
    }, /*#__PURE__*/React.createElement("span", null, copy.vitals), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "LCP ", metric(vitals.lcp_p75_ms, 'ms')), /*#__PURE__*/React.createElement("b", null, "INP ", metric(vitals.inp_p75_ms, 'ms')), /*#__PURE__*/React.createElement("b", null, "CLS ", metric(vitals.cls_p75, ''))), /*#__PURE__*/React.createElement("small", null, vitals.sample_count < 20 ? copy.limited + ' · ' : '', "LCP ", fmt(vitals.lcp_samples), " / INP ", fmt(vitals.inp_samples), " / CLS ", fmt(vitals.cls_samples), " ", copy.samples))), /*#__PURE__*/React.createElement("section", {
      className: "adm-seo-panel adm-seo-actions"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, copy.actions)), /*#__PURE__*/React.createElement("b", null, actions.length)), actions.length ? actions.map((action, index) => /*#__PURE__*/React.createElement("div", {
      key: index
    }, /*#__PURE__*/React.createElement("span", {
      className: action.tone
    }, action.tone === 'high' ? copy.high : copy.medium), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, action.title), /*#__PURE__*/React.createElement("small", null, action.detail)))) : /*#__PURE__*/React.createElement("p", {
      className: "adm-seo-inline-empty"
    }, copy.noActions)));
  }
  function PageDrawer({
    row,
    opportunities,
    copy,
    onClose
  }) {
    useEffect(() => {
      const close = event => {
        if (event.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', close);
      return () => window.removeEventListener('keydown', close);
    }, [onClose]);
    const queries = opportunities.filter(item => item.page_path === row.path).slice(0, 4);
    const health = row.health;
    const title = health && health.healthy === false ? copy.technicalPriority : row.search && row.search.position <= 10 && row.search.ctr_pct < 3 ? copy.clickPriority : copy.insufficient;
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-drawer-layer",
      onClick: onClose
    }, /*#__PURE__*/React.createElement("aside", {
      className: "adm-seo-drawer",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": copy.pageDiagnosis,
      onClick: event => event.stopPropagation()
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: health && health.healthy === false ? 'attention' : 'stable'
    }, health ? health.healthy ? copy.stable : copy.attention : copy.searchUnknown), /*#__PURE__*/React.createElement("h2", null, pageName(row.path, copy === COPY.en)), /*#__PURE__*/React.createElement("p", null, row.path)), /*#__PURE__*/React.createElement("button", {
      onClick: onClose,
      "aria-label": copy.close
    }, "\xD7")), /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-drawer-body"
    }, /*#__PURE__*/React.createElement("section", {
      className: "summary"
    }, /*#__PURE__*/React.createElement("strong", null, title), /*#__PURE__*/React.createElement("p", null, copy.firstTouch)), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, copy.searchPerformance), /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-detail-grid"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.impressions), /*#__PURE__*/React.createElement("b", null, row.search ? fmt(row.search.impressions) : '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.ctr), /*#__PURE__*/React.createElement("b", null, row.search ? pct(row.search.ctr_pct) : '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.kpis.search_clicks), /*#__PURE__*/React.createElement("b", null, row.search ? fmt(row.search.clicks) : '—')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.position), /*#__PURE__*/React.createElement("b", null, row.search && row.search.position != null ? row.search.position : '—')))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, copy.searchQueries), queries.length ? queries.map(query => /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-query-row",
      key: query.query
    }, /*#__PURE__*/React.createElement("span", null, query.query), /*#__PURE__*/React.createElement("b", null, fmt(query.impressions)), /*#__PURE__*/React.createElement("em", null, pct(query.ctr_pct)))) : /*#__PURE__*/React.createElement("p", {
      className: "muted"
    }, copy.noQueries)), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, copy.businessValue), /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-path"
    }, /*#__PURE__*/React.createElement("span", null, fmt(row.sessions), " ", copy.sessions), /*#__PURE__*/React.createElement("i", null, "\u2192"), /*#__PURE__*/React.createElement("span", null, fmt(row.registrations), " ", copy.kpis.seo_registrations), /*#__PURE__*/React.createElement("i", null, "\u2192"), /*#__PURE__*/React.createElement("span", null, fmt(row.books), " ", copy.books), /*#__PURE__*/React.createElement("i", null, "\u2192"), /*#__PURE__*/React.createElement("span", null, money(row.revenue_cents)))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, copy.technicalHealth), health ? /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-tech"
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, health.status_code == null ? '—' : health.status_code), " HTTP"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, health.duration_ms == null ? '—' : health.duration_ms + 'ms'), " ", copy.checkDuration), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, health.canonical_url ? '✓' : '—'), " canonical"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, health.indexable === true ? '✓' : health.indexable === false ? '×' : '—'), " indexable")) : /*#__PURE__*/React.createElement("p", {
      className: "muted"
    }, copy.pageUnknown)))));
  }
  function Skeleton({
    copy
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-skeleton",
      "aria-label": copy.loading
    }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", null));
  }
  function AdminSeoTab() {
    const isEn = window.CLANG === 'en';
    const copy = isEn ? COPY.en : COPY.zh;
    const [days, setDays] = useState(28);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPath, setSelectedPath] = useState(null);
    const pendingRef = useRef(null);
    const load = useCallback(windowDays => {
      if (pendingRef.current) pendingRef.current.abort();
      const controller = new AbortController();
      pendingRef.current = controller;
      setLoading(true);
      setError(null);
      return window.LF_API.adminSeoAcquisition(windowDays, {
        signal: controller.signal
      }).then(payload => {
        if (!controller.signal.aborted) setData(payload);
      }).catch(loadError => {
        if (loadError.name !== 'AbortError') setError(loadError.message || copy.loadFailed);
      }).finally(() => {
        if (pendingRef.current === controller) {
          pendingRef.current = null;
          setLoading(false);
        }
      });
    }, [copy.loadFailed]);
    useEffect(() => {
      load(days);
      return () => {
        if (pendingRef.current) pendingRef.current.abort();
      };
    }, [days, load]);
    const landingRows = data && data.landing_pages || [];
    const selected = useMemo(() => landingRows.find(row => row.path === selectedPath), [landingRows, selectedPath]);
    const judgmentPath = data && data.judgment && landingRows.some(row => row.path === data.judgment.action_page) ? data.judgment.action_page : null;
    const openPage = useCallback(path => {
      if (path) setSelectedPath(path);
    }, []);
    if (loading && !data) return /*#__PURE__*/React.createElement("div", {
      className: "adm-seo"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-seo-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, copy.title), /*#__PURE__*/React.createElement("p", null, copy.subtitle))), /*#__PURE__*/React.createElement(Skeleton, {
      copy: copy
    }));
    if (error && !data) return /*#__PURE__*/React.createElement("div", {
      className: "adm-seo"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-error"
    }, /*#__PURE__*/React.createElement("strong", null, copy.loadFailed), /*#__PURE__*/React.createElement("p", null, error), /*#__PURE__*/React.createElement("button", {
      onClick: () => load(days)
    }, copy.retry)));
    if (!data) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-seo"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-seo-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, copy.title), /*#__PURE__*/React.createElement("p", null, copy.subtitle)), /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-controls"
    }, /*#__PURE__*/React.createElement("select", {
      value: days,
      disabled: loading,
      onChange: event => setDays(Number(event.target.value))
    }, [7, 28, 90].map(value => /*#__PURE__*/React.createElement("option", {
      key: value,
      value: value
    }, copy.days[value]))), /*#__PURE__*/React.createElement("button", {
      onClick: () => load(days),
      disabled: loading
    }, loading ? copy.refreshing : copy.refresh))), error ? /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-degraded"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      onClick: () => load(days)
    }, copy.retry)) : null, /*#__PURE__*/React.createElement("button", {
      className: 'adm-seo-judgment ' + data.judgment.tone,
      onClick: () => openPage(judgmentPath),
      disabled: !judgmentPath
    }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("strong", null, data.judgment.title), /*#__PURE__*/React.createElement("small", null, data.judgment.detail), /*#__PURE__*/React.createElement("i", null, "\u203A")), /*#__PURE__*/React.createElement(KpiGrid, {
      rows: data.kpis || [],
      copy: copy
    }), /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-layout"
    }, /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("div", {
      className: "adm-seo-top"
    }, /*#__PURE__*/React.createElement(Trend, {
      rows: data.trend || [],
      copy: copy
    }), /*#__PURE__*/React.createElement(Opportunities, {
      rows: data.opportunities || [],
      copy: copy,
      onOpen: openPage
    })), /*#__PURE__*/React.createElement(AcquisitionSources, {
      rows: data.acquisition_sources || [],
      copy: copy
    }), /*#__PURE__*/React.createElement(JourneyInsights, {
      journeys: data.journeys || [],
      pages: data.page_engagement || [],
      copy: copy
    }), /*#__PURE__*/React.createElement(LandingTable, {
      rows: data.landing_pages || [],
      copy: copy,
      onOpen: openPage
    })), /*#__PURE__*/React.createElement(SourceHealth, {
      data: data,
      copy: copy
    })), /*#__PURE__*/React.createElement("footer", {
      className: "adm-seo-boundary"
    }, /*#__PURE__*/React.createElement("strong", null, copy.coverage), /*#__PURE__*/React.createElement("span", null, copy.firstTouch), data.coverage_note ? /*#__PURE__*/React.createElement("span", null, data.coverage_note) : null), selected ? /*#__PURE__*/React.createElement(PageDrawer, {
      row: selected,
      opportunities: data.opportunities || [],
      copy: copy,
      onClose: () => setSelectedPath(null)
    }) : null);
  }
  window.AdminSeoTab = AdminSeoTab;
})();
}
