{
(function () {
  const TC = window.TC;
  const {
    useState,
    useEffect,
    useCallback,
    useRef
  } = React;
  const OverviewTab = window.AdminOverviewTab;
  const UserActivityTab = window.AdminUserActivityTab;
  const PayingUsersTab = window.PayingUsersTab;
  const RatesTab = window.AdminRatesTab;
  const PerfTab = window.AdminPerformanceTab;
  const SeoTab = window.AdminSeoTab;
  const AdminToolsTab = window.AdminToolsTab;
  const AdminMessagesTab = window.AdminMessagesTab;
  const AnalysisTab = window.AdminAnalysisTab;
  const AssistantAnalysisTab = window.AdminAssistantAnalysisTab;
  const TokenTrackingTab = window.AdminTokenTrackingTab;
  const PublicApiTab = window.AdminPublicApiTab;
  const ModelRoutingTab = window.AdminModelRoutingTab;
  const ProseDrawTab = window.AdminProseDrawTab;
  const OutputBudgetsTab = window.AdminOutputBudgetsTab;
  const AssistantSettingsTab = window.AdminAssistantSettingsTab;
  const OtherSettingsTab = window.AdminOtherSettingsTab;
  const UsersTab = window.AdminUsersTab;
  const UserLimitsTab = window.AdminUserLimitsTab;
  const CouponsTab = window.AdminCouponsTab;
  const CreditPacksTab = window.AdminCreditPacksTab;
  const CreditLedgerTab = window.AdminCreditLedgerTab;

  // Top-level page shell with collapsible sidebar navigation.
  function AdminFullView({
    ctl
  }) {
    const [collapsed, setCollapsed] = useState(false);
    // Mobile (≤860px) turns the sidebar into a slide-out drawer; this drives the
    // .show class + scrim so it can actually be opened on a phone in portrait.
    const [mobileOpen, setMobileOpen] = useState(false);
    const [tab, setTab] = useState('overview');
    const [focusUserId, setFocusUserId] = useState(null);
    const [days, setDays] = useState(7);
    const [d, setD] = useState(null);
    const [plans, setPlans] = useState([]);
    const [err, setErr] = useState(null);
    const [loading, setLoading] = useState(false);
    const dashboardRequest = useRef(null);
    const plansLoaded = useRef(false);
    const loadDashboard = useCallback(windowDays => {
      const requestKey = String(windowDays);
      const pending = dashboardRequest.current;
      if (pending && pending.key === requestKey && !pending.controller.signal.aborted) return pending.promise;
      if (pending) pending.controller.abort();
      const controller = new AbortController();
      setLoading(true);
      setErr(null);
      const promise = window.LF_API.adminAnalytics(windowDays, {
        signal: controller.signal
      }).then(result => {
        if (!controller.signal.aborted) setD(result);
      }).catch(e => {
        if (e.name !== 'AbortError') setErr(e.message || TC('adm_forbidden'));
      }).finally(() => {
        if (!dashboardRequest.current || dashboardRequest.current.controller !== controller) return;
        dashboardRequest.current = null;
        setLoading(false);
      });
      dashboardRequest.current = {
        key: requestKey,
        controller,
        promise
      };
      return promise;
    }, []);
    useEffect(() => {
      if (!window.LF_API || tab !== 'users' || plansLoaded.current) return;
      plansLoaded.current = true;
      window.LF_API.billingCatalog().then(c => setPlans(c.plans || [])).catch(() => {});
    }, [tab]);
    useEffect(() => {
      if (!window.LF_API || tab !== 'overview') return undefined;
      loadDashboard(days);
      return () => {
        const controller = dashboardRequest.current && dashboardRequest.current.controller;
        if (controller) controller.abort();
        dashboardRequest.current = null;
      };
    }, [days, loadDashboard, tab]);
    const groups = [{
      label: ctl.lang === 'en' ? 'Business' : '经营',
      items: [{
        key: 'overview',
        label: TC('adm_tab_over'),
        ico: 'G'
      }, {
        key: 'activity',
        label: TC('adm_tab_activity'),
        ico: '活'
      }, {
        key: 'paying',
        label: TC('adm_tab_paying'),
        ico: '¥'
      }, {
        key: 'credit-packs',
        label: ctl.lang === 'en' ? 'Credit pack management' : '加量包管理',
        ico: '包'
      }, {
        key: 'analysis',
        label: TC('adm_tab_analysis'),
        ico: 'A'
      }, {
        key: 'assistant-analysis',
        label: TC('adm_tab_assistant_analysis'),
        ico: '量'
      }, ...(window.NBSite?.current?.code === 'cn' ? [{
        key: 'rewrite-preview',
        label: '降 AI 改写',
        ico: '改'
      }] : []), {
        key: 'prose-draw',
        label: ctl.lang === 'en' ? 'Prose draws' : '正文抽卡',
        ico: '抽'
      }, {
        key: 'perf',
        label: TC('adm_tab_perf'),
        ico: 'P'
      }, {
        key: 'seo',
        label: TC('adm_tab_seo'),
        ico: 'S'
      }]
    }, {
      label: ctl.lang === 'en' ? 'Users' : '用户',
      items: [{
        key: 'users',
        label: TC('adm_tab_users'),
        ico: 'U'
      }, {
        key: 'user-limits',
        label: TC('adm_tab_user_limits'),
        ico: '限'
      }, {
        key: 'coupons',
        label: ctl.lang === 'en' ? 'Coupons' : '优惠券',
        ico: '券'
      }, {
        key: 'credit-ledger',
        label: TC('adm_tab_credit_ledger'),
        ico: '流'
      }, {
        key: 'partnership',
        label: TC('partnership'),
        ico: '合',
        onSelect: ctl.onPartnership
      }, {
        key: 'announce',
        label: TC('adm_tab_announce'),
        ico: 'N'
      }]
    }, {
      label: ctl.lang === 'en' ? 'System' : '系统',
      items: [{
        key: 'tokens',
        label: TC('adm_tab_tokens'),
        ico: 'T'
      }, {
        key: 'rates',
        label: TC('adm_tab_rates'),
        ico: 'R'
      }, {
        key: 'tools',
        label: TC('adm_tab_tools'),
        ico: 'W'
      }, {
        key: 'public-api',
        label: TC('adm_tab_public_api'),
        ico: '公'
      }, {
        key: 'model-routing',
        label: TC('adm_tab_model_routing'),
        ico: 'M'
      }, {
        key: 'output-budgets',
        label: TC('adm_output_title'),
        ico: '额'
      }, {
        key: 'assistant-settings',
        label: TC('adm_tab_assistant'),
        ico: '助'
      }, {
        key: 'other-settings',
        label: TC('adm_tab_other'),
        ico: 'O'
      }]
    }];
    const themeBtn = /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-ic",
      style: {
        width: 32,
        height: 32
      },
      "aria-label": ctl.lang === 'en' ? ctl.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme' : ctl.theme === 'dark' ? '切换到浅色主题' : '切换到深色主题',
      onClick: () => ctl.setTheme(ctl.theme === 'dark' ? 'light' : 'dark')
    }, ctl.theme === 'dark' ? /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"
    })) : /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"
    })));
    const renderTab = () => {
      const selfFetch = ['analysis', 'assistant-analysis', 'rewrite-preview', 'prose-draw', 'activity', 'paying', 'credit-packs', 'users', 'user-limits', 'coupons', 'credit-ledger', 'tools', 'tokens', 'rates', 'perf', 'seo', 'announce', 'public-api', 'model-routing', 'output-budgets', 'assistant-settings', 'other-settings'];
      if (err && !selfFetch.includes(tab)) return /*#__PURE__*/React.createElement("div", {
        className: "adm-card",
        style: {
          color: 'var(--terra)'
        }
      }, err);
      if (!err && !d && !selfFetch.includes(tab)) return /*#__PURE__*/React.createElement("div", {
        className: "adm-card",
        style: {
          color: 'var(--ink-3)'
        }
      }, TC('set_loading'));
      if (tab === 'overview' && d) return /*#__PURE__*/React.createElement(OverviewTab, {
        d: d,
        days: days,
        loading: loading,
        onDaysChange: setDays,
        onRefresh: () => loadDashboard(days),
        onNavigate: setTab
      });
      if (tab === 'activity') return /*#__PURE__*/React.createElement(UserActivityTab, {
        onOpenUser: userId => {
          setFocusUserId(userId);
          setTab('users');
        }
      });
      if (tab === 'analysis') return /*#__PURE__*/React.createElement(AnalysisTab, null);
      if (tab === 'assistant-analysis') return /*#__PURE__*/React.createElement(AssistantAnalysisTab, {
        toast: ctl.toast,
        lang: ctl.lang
      });
      if (tab === 'rewrite-preview' && window.NBSite?.current?.code === 'cn') return /*#__PURE__*/React.createElement(window.AdminRewritePreviewTab, {
        toast: ctl.toast
      });
      if (tab === 'prose-draw') return /*#__PURE__*/React.createElement(ProseDrawTab, null);
      if (tab === 'paying') return /*#__PURE__*/React.createElement(PayingUsersTab, {
        onNavigateUsers: () => setTab('users')
      });
      if (tab === 'credit-packs') return /*#__PURE__*/React.createElement(CreditPacksTab, {
        toast: ctl.toast,
        lang: ctl.lang
      });
      if (tab === 'perf') return /*#__PURE__*/React.createElement(PerfTab, {
        toast: ctl.toast
      });
      if (tab === 'seo') return /*#__PURE__*/React.createElement(SeoTab, null);
      if (tab === 'users') return /*#__PURE__*/React.createElement(UsersTab, {
        toast: ctl.toast,
        plans: plans,
        focusUserId: focusUserId,
        onFocusConsumed: () => setFocusUserId(null)
      });
      if (tab === 'user-limits') return /*#__PURE__*/React.createElement(UserLimitsTab, {
        toast: ctl.toast
      });
      if (tab === 'coupons') return /*#__PURE__*/React.createElement(CouponsTab, {
        toast: ctl.toast,
        lang: ctl.lang
      });
      if (tab === 'credit-ledger') return /*#__PURE__*/React.createElement(CreditLedgerTab, null);
      if (tab === 'tokens') return /*#__PURE__*/React.createElement(TokenTrackingTab, {
        toast: ctl.toast
      });
      if (tab === 'rates') return /*#__PURE__*/React.createElement(RatesTab, {
        toast: ctl.toast
      });
      if (tab === 'announce') return /*#__PURE__*/React.createElement(AdminMessagesTab, {
        toast: ctl.toast
      });
      if (tab === 'tools') return /*#__PURE__*/React.createElement(AdminToolsTab, {
        toast: ctl.toast
      });
      if (tab === 'public-api') return /*#__PURE__*/React.createElement(PublicApiTab, {
        toast: ctl.toast
      });
      if (tab === 'model-routing') return /*#__PURE__*/React.createElement(ModelRoutingTab, {
        toast: ctl.toast
      });
      if (tab === 'output-budgets') return /*#__PURE__*/React.createElement(OutputBudgetsTab, {
        toast: ctl.toast,
        onNavigateModelRouting: () => setTab('model-routing')
      });
      if (tab === 'assistant-settings') return /*#__PURE__*/React.createElement(AssistantSettingsTab, {
        toast: ctl.toast,
        onNavigateModelRouting: () => setTab('model-routing'),
        onSettingsChange: ctl.onAssistantSettingsChange
      });
      if (tab === 'other-settings') return /*#__PURE__*/React.createElement(OtherSettingsTab, {
        toast: ctl.toast
      });
      return null;
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-wrap"
    }, /*#__PURE__*/React.createElement("div", {
      className: 'adm-scrim' + (mobileOpen ? ' show' : ''),
      onClick: () => setMobileOpen(false)
    }), /*#__PURE__*/React.createElement("div", {
      className: 'adm-side' + (collapsed ? ' collapsed' : '') + (mobileOpen ? ' show' : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-side-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-side-ico"
    }, "\u2B50"), !collapsed && /*#__PURE__*/React.createElement("span", {
      className: "adm-side-t"
    }, TC('adm_title'))), /*#__PURE__*/React.createElement("div", {
      className: "adm-nav"
    }, groups.map(group => /*#__PURE__*/React.createElement("section", {
      className: "adm-nav-group",
      key: group.label
    }, !collapsed && /*#__PURE__*/React.createElement("h2", null, group.label), group.items.map(item => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: item.key,
      className: 'nv' + (tab === item.key ? ' on' : ''),
      "aria-current": tab === item.key ? 'page' : undefined,
      onClick: () => {
        if (item.onSelect) item.onSelect();else setTab(item.key);
        setMobileOpen(false);
      },
      title: collapsed ? item.label : undefined
    }, /*#__PURE__*/React.createElement("span", {
      className: "adm-nav-ico"
    }, item.ico), !collapsed && /*#__PURE__*/React.createElement("span", null, item.label)))))), /*#__PURE__*/React.createElement("div", {
      className: "sp"
    }), /*#__PURE__*/React.createElement("div", {
      className: "adm-side-toggle",
      onClick: () => setCollapsed(c => !c)
    }, /*#__PURE__*/React.createElement("svg", {
      width: "14",
      height: "14",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2"
    }, /*#__PURE__*/React.createElement("polyline", {
      points: "15 18 9 12 15 6"
    })), !collapsed && /*#__PURE__*/React.createElement("span", null, TC('adm_collapse') || '收起侧栏'))), /*#__PURE__*/React.createElement("div", {
      className: "adm-body"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "c-ic adm-menu-btn",
      style: {
        width: 32,
        height: 32
      },
      onClick: () => setMobileOpen(true),
      title: TC('adm_title')
    }, /*#__PURE__*/React.createElement("svg", {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2"
    }, /*#__PURE__*/React.createElement("line", {
      x1: "3",
      y1: "6",
      x2: "21",
      y2: "6"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "3",
      y1: "12",
      x2: "21",
      y2: "12"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "3",
      y1: "18",
      x2: "21",
      y2: "18"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), window.LangSeg && /*#__PURE__*/React.createElement(window.LangSeg, {
      lang: ctl.lang,
      setLang: ctl.setLang
    }), themeBtn), /*#__PURE__*/React.createElement("div", {
      className: "adm-body-inner"
    }, renderTab())));
  }
  window.AdminFullView = AdminFullView;
})();
}
