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
  const RefundDrawer = props => React.createElement(window.AdminOrderRefundDrawer, props);
  const TC = window.TC;
  const PAGE_SIZE = 25;
  const SEGMENTS = [['all', '全部', 'All'], ['new', '邮箱待激活', 'Email pending'], ['stuck', '已建书未出章', 'Book, no chapter'], ['paid-risk', '付费后异常', 'Paid with failures'], ['inactive', '7日未活跃', 'Inactive 7 days']];
  const TABS = [['overview', '概览', 'Overview'], ['billing', '付费与权益', 'Billing'], ['creation', '作品与任务', 'Creation'], ['messages', '消息与运营', 'Messages'], ['audit', '账户与审计', 'Account & audit'], ['invitations', '邀请看板', 'Invitations']];
  const isEnglish = () => window.CLANG === 'en';
  const cp = (zh, en) => isEnglish() ? en : zh;
  const millisToCredits = value => Number(((Number(value) || 0) / 1000).toFixed(3));
  const money = cents => `¥${((Number(cents) || 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
  const stamp = value => value ? new Date(value).toLocaleString(isEnglish() ? 'en-US' : 'zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }) : '—';
  const fullStamp = value => value ? new Date(value).toLocaleString(isEnglish() ? 'en-US' : 'zh-CN') : '—';
  const daysSince = value => value ? Math.floor((Date.now() - new Date(value).getTime()) / 86400000) : Infinity;
  const rawAttribution = user => user.registration_attribution || '—';
  const siteName = code => code === 'global' ? cp('国际站', 'International') : code === 'cn' ? cp('中文站', 'China') : cp('未知站点', 'Unknown site');
  const defaultSite = () => window.NBSite ? window.NBSite.current.code : 'cn';
  const userName = user => user.display_name || String(user.email || '').split('@')[0] || cp('未命名用户', 'Unnamed user');
  const taskRate = user => user.task_success_rate == null ? '—' : `${user.task_success_rate}%`;
  const taskSuccessSummary = user => {
    if (!user.terminal_task_count) return '—';
    return `${taskRate(user)} · ${user.completed_task_count}/${user.terminal_task_count}`;
  };
  const AUDIT_ACTION_LABELS = {
    'admin.user_updated': ['更新用户资料', 'User profile updated'],
    'admin.user_disabled': ['停用账号', 'Account disabled'],
    'admin.user_enabled': ['恢复账号', 'Account enabled'],
    'admin.credits_granted': ['调整笔力', 'Credits adjusted'],
    'admin.credit_penalty_applied': ['追缴笔力并限制账户', 'Credits clawed back and account restricted'],
    'admin.content_restriction_updated': ['调整正文限制', 'Content restriction updated'],
    'admin.invitation_freeze_updated': ['调整邀请冻结', 'Invitation freeze updated'],
    'admin.subscription_set': ['设置订阅', 'Subscription set'],
    'admin.message_sent': ['发送站内信', 'Message sent'],
    'admin.message_broadcast': ['群发站内信', 'Message broadcast'],
    'admin.message_activity_sent': ['发送活动消息', 'Activity message sent'],
    'admin.bulk_grant': ['批量发放笔力', 'Bulk credits granted'],
    'admin.reconcile': ['执行对账', 'Reconciliation run'],
    'admin.model_rate_upserted': ['更新模型费率', 'Model rate updated'],
    'admin.task_estimate_upserted': ['更新任务定价', 'Task estimate updated'],
    'admin.redemption_code_created': ['创建兑换码', 'Redemption code created'],
    'admin.redemption_codes_batch_created': ['批量创建兑换码', 'Redemption codes batch created'],
    'admin.redemption_code_deactivated': ['停用兑换码', 'Redemption code deactivated'],
    'admin.coupon_campaign_created': ['创建优惠券活动', 'Coupon campaign created'],
    'admin.coupon_campaign_deactivated': ['停用优惠券活动', 'Coupon campaign deactivated'],
    'admin.announcement_created': ['创建公告', 'Announcement created'],
    'admin.announcement_updated': ['更新公告', 'Announcement updated'],
    'admin.announcement_deleted': ['删除公告', 'Announcement deleted'],
    'admin.public_api_settings_updated': ['更新公益模型配置', 'Public API settings updated'],
    'admin.public_api_announcement_created': ['创建公益模型公告', 'Public API announcement created'],
    'admin.public_api_announcement_updated': ['更新公益模型公告', 'Public API announcement updated'],
    'admin.public_api_announcement_deleted': ['删除公益模型公告', 'Public API announcement deleted'],
    'admin.other_settings_updated': ['更新其他设置', 'Other settings updated'],
    'admin.registration_access_updated': ['更新注册访问策略', 'Registration access updated'],
    'admin.partner_updated': ['更新合作方', 'Partner updated'],
    'admin.invitation_settings_updated': ['更新邀请设置', 'Invitation settings updated'],
    'admin.partner_user_maintenance_added': ['添加合作维护用户', 'Partner maintenance user added'],
    'admin.plan_upserted': ['更新订阅套餐', 'Subscription plan updated'],
    'admin.pack_upserted': ['更新笔力包', 'Credit pack updated'],
    'admin.model_routing_updated': ['更新模型路由', 'Model routing updated'],
    'ops.admin_granted': ['授予管理员权限', 'Admin access granted'],
    'auth.register_init': ['发起注册', 'Registration started'],
    'auth.register_verify': ['完成注册验证', 'Registration verified'],
    'auth.login': ['登录', 'Signed in'],
    'auth.login_failed': ['登录失败', 'Sign-in failed'],
    'auth.logout': ['退出登录', 'Signed out'],
    'auth.password_changed': ['修改密码', 'Password changed'],
    'auth.email_change_requested': ['申请更换邮箱', 'Email change requested'],
    'auth.password_reset_requested': ['申请重置密码', 'Password reset requested'],
    'auth.password_reset_confirmed': ['确认重置密码', 'Password reset confirmed'],
    'desktop_auth.authorized': ['授权桌面客户端', 'Desktop client authorized'],
    'desktop_auth.session_created': ['建立桌面会话', 'Desktop session created'],
    'desktop_auth.session_refreshed': ['刷新桌面会话', 'Desktop session refreshed'],
    'desktop_auth.logout': ['退出桌面客户端', 'Desktop client signed out'],
    'api_key.created': ['创建 API Key', 'API key created'],
    'api_key.revoked': ['撤销 API Key', 'API key revoked'],
    'public_api.credential_issued': ['领取公益模型凭证', 'Public API credential issued'],
    'public_api.top_up_started': ['发起公益模型充值', 'Public API top-up started'],
    'public_api.top_up_fulfilled': ['公益模型充值到账', 'Public API top-up fulfilled'],
    'engine_task.started': ['启动创作任务', 'Creation task started'],
    'engine_task.chain_continued': ['继续章节任务链', 'Chapter chain continued'],
    'engine_task.chain_stopped': ['停止章节任务链', 'Chapter chain stopped'],
    'cruise.started': ['启动巡航', 'Cruise started'],
    'book.archived': ['归档作品', 'Book archived'],
    'book.rewrite.started': ['启动改写', 'Rewrite started'],
    'assistant.session.created': ['开启创作助手会话', 'Assistant session started'],
    'assistant.action.created': ['创建助手动作', 'Assistant action created'],
    'assistant.action.executed': ['执行助手动作', 'Assistant action executed'],
    'assistant.action.rejected': ['拒绝助手动作', 'Assistant action rejected'],
    'assistant.action.confirmed': ['确认助手动作', 'Assistant action confirmed'],
    'assistant.action.recovery_confirmed': ['确认助手恢复动作', 'Assistant recovery confirmed'],
    'promotion.redemption_code_redeemed': ['兑换码兑换', 'Redemption code redeemed'],
    'promotion.coupon_claimed': ['领取优惠券', 'Coupon claimed'],
    'partner.user_maintenance_added': ['添加合作维护用户', 'Partner maintenance user added']
  };
  function auditActionLabel(action) {
    const labels = AUDIT_ACTION_LABELS[action];
    if (labels) return cp(labels[0], labels[1]);
    const [scope, name] = String(action || '').split('.');
    if (scope && name) return cp(`${scope} · ${name.replace(/_/g, ' ')}`, `${scope} · ${name.replace(/_/g, ' ')}`);
    return action || '—';
  }
  function auditJourneyCategory(action) {
    const value = String(action || '');
    if (value.startsWith('admin.') || value.startsWith('ops.')) return cp('管理员操作', 'Admin action');
    if (value.startsWith('auth.') || value.startsWith('desktop_auth.') || value.startsWith('api_key.')) {
      return cp('账户与安全', 'Account & security');
    }
    if (value.startsWith('public_api.')) return cp('公益模型', 'Public API');
    if (value.startsWith('engine_task.') || value.startsWith('cruise.') || value.startsWith('book.')) {
      return cp('创作', 'Creation');
    }
    if (value.startsWith('assistant.')) return cp('创作助手', 'Assistant');
    if (value.startsWith('promotion.') || value.startsWith('partner.')) return cp('权益与推广', 'Benefits & promotion');
    return cp('系统记录', 'System record');
  }
  function auditActorLabel(audit, userId) {
    const action = String(audit.action || '');
    if (action.startsWith('admin.') || action.startsWith('ops.')) {
      return audit.actor_user_id ? cp('管理员', 'Admin') : cp('系统', 'System');
    }
    if (audit.actor_user_id && audit.actor_user_id === userId) return cp('用户本人', 'User');
    if (audit.actor_user_id) return cp('其他操作者', 'Other actor');
    return cp('系统', 'System');
  }
  function auditJourneyEntry(audit) {
    return {
      at: audit.created_at,
      tone: audit.success ? 'history' : 'risk',
      title: auditActionLabel(audit.action),
      detail: auditJourneyCategory(audit.action)
    };
  }
  function attentionFor(user) {
    if (user.paid_cents > 0 && user.failed_task_count > 0) return {
      key: 'paid-risk',
      label: cp('付费后异常', 'Paid with failures'),
      tone: 'risk'
    };
    if (user.book_count > 0 && user.chapter_count === 0) return {
      key: 'stuck',
      label: cp('已建书未出章', 'Book, no chapter'),
      tone: 'warning'
    };
    if (daysSince(user.last_active_at) >= 7) return {
      key: 'inactive',
      label: cp('7日未活跃', 'Inactive 7 days'),
      tone: 'warning'
    };
    if (!user.email_verified_at) return {
      key: 'new',
      label: cp('邮箱待激活', 'Email pending'),
      tone: 'neutral'
    };
    if (user.book_count === 0) return {
      key: 'new',
      label: cp('待创建作品', 'No book yet'),
      tone: 'neutral'
    };
    return {
      key: 'stable',
      label: cp('体验稳定', 'Stable'),
      tone: 'stable'
    };
  }
  function UserOperationsTab({
    toast,
    plans,
    focusUserId,
    onFocusConsumed
  }) {
    const [result, setResult] = useState({
      items: [],
      total: 0,
      limit: PAGE_SIZE,
      offset: 0,
      segment_counts: {},
      attribution_values: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [queryInput, setQueryInput] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [segment, setSegment] = useState('all');
    const [days, setDays] = useState(30);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [account, setAccount] = useState('active');
    const [commercial, setCommercial] = useState('all');
    const [source, setSource] = useState('all');
    const [siteCode, setSiteCode] = useState(defaultSite);
    const [lifecycle, setLifecycle] = useState('all');
    const [sort, setSort] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [selected, setSelected] = useState(null);
    const pendingRequest = useRef(null);
    const users = result.items || [];
    const pages = Math.max(1, Math.ceil((Number(result.total) || 0) / (Number(result.limit) || PAGE_SIZE)));
    const listParams = useCallback(includePage => ({
      limit: includePage ? PAGE_SIZE : undefined,
      offset: includePage ? (page - 1) * PAGE_SIZE : undefined,
      days,
      isActive: account === 'all' ? null : account === 'active',
      segment,
      commercial,
      source,
      lifecycle,
      siteCode,
      q: query,
      sort: sort ? sort.key : 'created_at',
      direction: sort ? sort.direction : 'desc'
    }), [account, commercial, days, lifecycle, page, query, segment, sort, source, siteCode]);
    const load = useCallback(async () => {
      if (pendingRequest.current) pendingRequest.current.abort();
      const controller = new AbortController();
      pendingRequest.current = controller;
      setLoading(true);
      setError('');
      try {
        const data = await window.LF_API.adminUsers(listParams(true), {
          signal: controller.signal
        });
        if (!controller.signal.aborted) setResult(data);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError.message || cp('用户列表载入失败', 'Could not load users'));
      } finally {
        if (pendingRequest.current === controller) {
          pendingRequest.current = null;
          setLoading(false);
        }
      }
    }, [listParams]);
    useEffect(() => {
      load();
      return () => {
        if (pendingRequest.current) pendingRequest.current.abort();
      };
    }, [load]);
    useEffect(() => {
      if (!focusUserId || !window.LF_API) return undefined;
      let cancelled = false;
      window.LF_API.adminUser(focusUserId, days).then(profile => {
        if (!cancelled && profile && profile.id) setSelected(profile);
      }).catch(() => {}).finally(() => {
        if (!cancelled && onFocusConsumed) onFocusConsumed();
      });
      return () => {
        cancelled = true;
      };
    }, [days, focusUserId, onFocusConsumed]);
    useEffect(() => {
      if (page > pages) setPage(pages);
    }, [page, pages]);
    useEffect(() => {
      const timer = window.setTimeout(() => {
        setPage(1);
        setQuery(queryInput.trim());
      }, 250);
      return () => window.clearTimeout(timer);
    }, [queryInput]);
    const counts = result.segment_counts || {};
    const segmentCount = key => counts[key === 'paid-risk' ? 'paid_risk' : key] || 0;
    const exportUsers = async () => {
      setExporting(true);
      setError('');
      try {
        const exported = await window.LF_API.downloadAdminUsers(listParams(false));
        toast(cp(`已导出 ${result.total} 位用户`, `Exported ${result.total} users`));
        return exported;
      } catch (exportError) {
        setError(exportError.message || cp('用户列表导出失败', 'Could not export users'));
      } finally {
        setExporting(false);
      }
    };
    if (selected) return /*#__PURE__*/React.createElement(UserOperationsDetail, {
      initialUser: selected,
      days: days,
      plans: plans,
      toast: toast,
      onBack: () => setSelected(null),
      onChanged: load
    });
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-userops-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-userops-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, cp('用户管理', 'User management')), /*#__PURE__*/React.createElement("p", null, cp(`${result.total} 位符合当前条件`, `${result.total} users match`), " \xB7 ", siteName(siteCode))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, cp('统计窗口', 'Window')), /*#__PURE__*/React.createElement("select", {
      value: days,
      onChange: event => {
        setPage(1);
        setDays(Number(event.target.value));
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "7"
    }, cp('近 7 天', 'Last 7 days')), /*#__PURE__*/React.createElement("option", {
      value: "30"
    }, cp('近 30 天', 'Last 30 days')), /*#__PURE__*/React.createElement("option", {
      value: "90"
    }, cp('近 90 天', 'Last 90 days'))))), /*#__PURE__*/React.createElement("nav", {
      className: "adm-userops-segments",
      "aria-label": cp('运营分群', 'Operations segments')
    }, SEGMENTS.map(([key, zh, en]) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: segment === key ? 'on' : '',
      key: key,
      onClick: () => {
        setPage(1);
        setSegment(key);
      }
    }, /*#__PURE__*/React.createElement("span", null, cp(zh, en)), /*#__PURE__*/React.createElement("b", null, segmentCount(key))))), /*#__PURE__*/React.createElement("div", {
      className: "adm-userops-commands"
    }, /*#__PURE__*/React.createElement("label", {
      className: "adm-userops-search"
    }, /*#__PURE__*/React.createElement("input", {
      type: "search",
      "aria-label": cp('搜索全部用户邮箱', 'Search all user emails'),
      value: queryInput,
      maxLength: 255,
      onChange: event => setQueryInput(event.target.value),
      placeholder: cp('搜索全部用户邮箱', 'Search all user emails')
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setFiltersOpen(value => !value),
      "aria-expanded": filtersOpen
    }, cp('筛选', 'Filters'), " ", filtersOpen ? '−' : '+'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: exportUsers,
      disabled: exporting
    }, exporting ? cp('正在导出…', 'Exporting…') : cp('导出 CSV', 'Export CSV'))), filtersOpen ? /*#__PURE__*/React.createElement("div", {
      className: "adm-userops-filters"
    }, /*#__PURE__*/React.createElement("label", null, cp('站点', 'Site'), /*#__PURE__*/React.createElement("select", {
      "aria-label": cp('筛选用户站点', 'Filter user site'),
      value: siteCode,
      onChange: event => {
        setPage(1);
        setSiteCode(event.target.value);
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "cn"
    }, siteName('cn')), /*#__PURE__*/React.createElement("option", {
      value: "global"
    }, siteName('global')))), /*#__PURE__*/React.createElement("label", null, cp('账号状态', 'Account'), /*#__PURE__*/React.createElement("select", {
      value: account,
      onChange: event => {
        setPage(1);
        setAccount(event.target.value);
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "active"
    }, cp('正常', 'Active')), /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, cp('全部', 'All')), /*#__PURE__*/React.createElement("option", {
      value: "disabled"
    }, cp('已停用', 'Disabled')))), /*#__PURE__*/React.createElement("label", null, cp('生命周期', 'Lifecycle'), /*#__PURE__*/React.createElement("select", {
      value: lifecycle,
      onChange: event => {
        setPage(1);
        setLifecycle(event.target.value);
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, cp('全部阶段', 'All stages')), /*#__PURE__*/React.createElement("option", {
      value: "email-pending"
    }, cp('待验证邮箱', 'Email pending')), /*#__PURE__*/React.createElement("option", {
      value: "verified-no-book"
    }, cp('已验证未建书', 'Verified, no book')), /*#__PURE__*/React.createElement("option", {
      value: "book-no-chapter"
    }, cp('已建书未出章', 'Book, no chapter')), /*#__PURE__*/React.createElement("option", {
      value: "writing"
    }, cp('已开始创作', 'Writing')))), /*#__PURE__*/React.createElement("label", null, cp('商业关系', 'Commercial'), /*#__PURE__*/React.createElement("select", {
      value: commercial,
      onChange: event => {
        setPage(1);
        setCommercial(event.target.value);
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, cp('全部', 'All')), /*#__PURE__*/React.createElement("option", {
      value: "paid"
    }, cp('真实付费', 'Paid')), /*#__PURE__*/React.createElement("option", {
      value: "free"
    }, cp('未付费', 'Free')))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        setPage(1);
        setAccount('active');
        setLifecycle('all');
        setCommercial('all');
        setSource('all');
        setSiteCode(defaultSite());
      }
    }, cp('重置', 'Reset'))) : null, error ? /*#__PURE__*/React.createElement("div", {
      className: "adm-userops-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: load
    }, TC('adm_retry'))) : null, loading && users.length === 0 ? /*#__PURE__*/React.createElement(UserTableLoading, null) : /*#__PURE__*/React.createElement(UserTable, {
      users: users,
      onOpen: setSelected,
      loading: loading,
      sort: sort,
      onSortChange: next => {
        setPage(1);
        setSort(next);
      },
      source: source,
      attributionValues: result.attribution_values || [],
      onSourceChange: value => {
        setPage(1);
        setSource(value);
      },
      pagination: {
        total: result.total,
        page,
        pages,
        pageSize: result.limit || PAGE_SIZE,
        onPageChange: setPage
      }
    }));
  }
  function UserTableLoading() {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-userops-loading",
      "aria-label": TC('set_loading')
    }, Array.from({
      length: 6
    }, (_, index) => /*#__PURE__*/React.createElement("i", {
      key: index
    })));
  }
  function UserTable({
    users,
    onOpen,
    loading,
    sort,
    onSortChange,
    source,
    attributionValues,
    onSourceChange,
    pagination
  }) {
    const columns = [{
      key: 'user',
      header: cp('用户', 'User'),
      priority: 'primary',
      sortable: false,
      render: user => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, userName(user)), /*#__PURE__*/React.createElement("small", null, user.email || '—', " \xB7 ", /*#__PURE__*/React.createElement("span", {
        "data-user-site": user.site_code
      }, siteName(user.site_code)), user.is_admin ? ` · ${cp('管理员', 'Admin')}` : '', !user.is_active ? ` · ${cp('已停用', 'Disabled')}` : ''))
    }, {
      key: 'lifecycle',
      header: cp('生命周期', 'Lifecycle'),
      sortable: false,
      render: user => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, user.chapter_count > 0 ? cp(`已写 ${user.chapter_count} 章`, `${user.chapter_count} chapters`) : user.book_count > 0 ? cp('已创建作品', 'Book created') : user.email_verified_at ? cp('已验证邮箱', 'Email verified') : cp('待验证邮箱', 'Email pending')), /*#__PURE__*/React.createElement("small", null, user.book_count > 0 ? cp(`${user.book_count} 本作品 · ${user.word_count.toLocaleString()} 字`, `${user.book_count} books · ${user.word_count.toLocaleString()} words`) : cp('下一步：创建作品', 'Next: create a book')))
    }, {
      key: 'commercial_value',
      header: cp('商业价值', 'Commercial value'),
      numeric: true,
      defaultDirection: 'desc',
      sortValue: user => user.paid_cents,
      render: user => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, money(user.paid_cents)), /*#__PURE__*/React.createElement("small", null, user.plan_name || cp('未订阅', 'No subscription'), " \xB7 ", user.paid_order_count, " ", cp('笔订单', 'orders')))
    }, {
      key: 'credits',
      header: cp('笔力', 'Credits'),
      numeric: true,
      defaultDirection: 'desc',
      sortValue: user => user.credit_account_ready ? user.balance_millis - user.reserved_millis : null,
      render: user => user.credit_account_ready ? /*#__PURE__*/React.createElement("strong", null, millisToCredits(user.balance_millis - user.reserved_millis)) : /*#__PURE__*/React.createElement("strong", null, cp('待初始化', 'Pending'))
    }, {
      key: 'consumed_credits',
      header: cp('消耗笔力', 'Credits spent'),
      numeric: true,
      defaultDirection: 'desc',
      sortValue: user => user.consumed_millis,
      render: user => /*#__PURE__*/React.createElement("strong", null, millisToCredits(user.consumed_millis))
    }, {
      key: 'last_active',
      header: cp('上次活跃', 'Last active'),
      defaultDirection: 'desc',
      sortValue: user => user.last_active_at ? Date.parse(user.last_active_at) : null,
      render: user => /*#__PURE__*/React.createElement("strong", null, stamp(user.last_active_at))
    }, {
      key: 'task_count',
      header: cp('任务数量', 'Tasks'),
      numeric: true,
      defaultDirection: 'desc',
      sortValue: user => user.task_count,
      render: user => /*#__PURE__*/React.createElement("strong", null, user.task_count)
    }, {
      key: 'task_success_rate',
      header: cp('成功率', 'Success rate'),
      numeric: true,
      defaultDirection: 'desc',
      sortValue: user => user.task_success_rate,
      render: user => taskSuccessSummary(user)
    }, {
      key: 'invite_count',
      header: cp('邀请人数', 'Invites'),
      numeric: true,
      defaultDirection: 'desc',
      sortValue: user => user.invite_count,
      render: user => /*#__PURE__*/React.createElement("strong", null, user.invite_count)
    }, {
      key: 'source',
      header: cp('注册归因', 'Registration attribution'),
      priority: 'optional',
      sortable: false,
      filter: {
        label: cp('筛选注册归因', 'Filter registration attribution'),
        value: source,
        allValue: 'all',
        allLabel: cp('全部原始值', 'All raw values'),
        options: attributionValues,
        onChange: onSourceChange
      },
      render: user => /*#__PURE__*/React.createElement("strong", {
        title: rawAttribution(user)
      }, rawAttribution(user))
    }, {
      key: 'action',
      header: '',
      sortable: false,
      render: user => /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: () => onOpen(user)
      }, cp('查看档案', 'View profile'))
    }];
    return /*#__PURE__*/React.createElement(DataTable, {
      rows: users,
      columns: columns,
      rowKey: "id",
      ariaLabel: cp('用户管理列表', 'User management list'),
      pagination: pagination,
      loading: loading,
      serverSort: true,
      controlledSort: sort,
      onSortChange: onSortChange,
      className: "adm-userops-table",
      wrapClassName: "adm-userops-table-wrap",
      onRowActivate: onOpen,
      empty: {
        default: cp('没有符合条件的用户，请切换分群或清除筛选条件。', 'No users match. Change the segment or clear filters.')
      }
    });
  }
  function UserOperationsDetail({
    initialUser,
    days,
    plans,
    toast,
    onBack,
    onChanged
  }) {
    const [tab, setTab] = useState('overview');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [partial, setPartial] = useState([]);
    const [drawer, setDrawer] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const pendingRequest = useRef(null);
    const closeDrawer = useCallback(() => setDrawer(null), []);
    const load = useCallback(async () => {
      if (pendingRequest.current) pendingRequest.current.abort();
      const controller = new AbortController();
      pendingRequest.current = controller;
      setError('');
      const requests = [window.LF_API.adminUser(initialUser.id, days, {
        signal: controller.signal
      }), window.LF_API.adminUserEvidence(initialUser.id, 50, {
        signal: controller.signal
      })];
      const settled = await Promise.allSettled(requests);
      if (controller.signal.aborted) return;
      if (settled[0].status === 'rejected') {
        setError(settled[0].reason && settled[0].reason.message || cp('用户档案载入失败', 'Could not load user profile'));
        return;
      }
      const evidenceNames = ['books', 'tasks', 'orders', 'transactions', 'notifications', 'audits'];
      const next = {
        profile: settled[0].value
      };
      const failed = [];
      if (settled[1].status === 'fulfilled') Object.assign(next, settled[1].value || {});else evidenceNames.forEach(name => {
        next[name] = [];
        failed.push(name);
      });
      setData(next);
      setPartial(failed);
      if (pendingRequest.current === controller) pendingRequest.current = null;
    }, [days, initialUser.id]);
    useEffect(() => {
      load();
      return () => {
        if (pendingRequest.current) pendingRequest.current.abort();
      };
    }, [load]);
    const finished = async () => {
      await Promise.all([load(), onChanged()]);
      toast(TC('adm_done'));
    };
    if (error) return /*#__PURE__*/React.createElement("div", {
      className: "adm-userops-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: load
    }, TC('adm_retry')));
    if (!data) return /*#__PURE__*/React.createElement(UserTableLoading, null);
    const user = {
      ...initialUser,
      ...data.profile
    };
    const attention = attentionFor(user);
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-user-detail"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-user-detail-context"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onBack
    }, "\u2190 ", cp('返回用户列表', 'Back to users')), /*#__PURE__*/React.createElement("span", null, cp(`来源：${attention.label} · 近 ${days} 天`, `Source: ${attention.label} · ${days} days`))), /*#__PURE__*/React.createElement("header", {
      className: "adm-user-profile-head"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-user-identity"
    }, /*#__PURE__*/React.createElement("span", null, userName(user).slice(0, 1)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, userName(user)), /*#__PURE__*/React.createElement("p", null, user.email, " \xB7 ", /*#__PURE__*/React.createElement("span", {
      "data-user-site": user.site_code
    }, siteName(user.site_code)), " \xB7 ", cp('注册于', 'Registered'), " ", fullStamp(user.created_at))), /*#__PURE__*/React.createElement("b", {
      className: `is-${attention.tone}`
    }, attention.label)), /*#__PURE__*/React.createElement("div", {
      className: "adm-user-profile-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setDrawer('message')
    }, cp('发送消息', 'Send message')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "primary",
      onClick: () => setMenuOpen(value => !value),
      "aria-expanded": menuOpen
    }, cp('运营操作', 'Operations')), menuOpen ? /*#__PURE__*/React.createElement("div", {
      className: "adm-user-operation-menu"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: !user.credit_account_ready,
      onClick: () => {
        setDrawer('credit');
        setMenuOpen(false);
      }
    }, cp('增加笔力', 'Add credits')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        setDrawer('restriction');
        setMenuOpen(false);
      }
    }, cp('调整正文限制', 'Content restriction')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        setDrawer('invitation');
        setMenuOpen(false);
      }
    }, cp('调整邀请冻结', 'Invitation freeze')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        setDrawer('subscription');
        setMenuOpen(false);
      }
    }, cp('设置订阅', 'Set subscription')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "danger",
      onClick: () => {
        setDrawer('refund');
        setMenuOpen(false);
      }
    }, cp('退款回收', 'Refund & revoke')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "danger",
      disabled: !user.credit_account_ready,
      onClick: () => {
        setDrawer('penalty');
        setMenuOpen(false);
      }
    }, cp('追缴笔力并限制', 'Claw back and restrict')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "danger",
      onClick: () => {
        setDrawer(user.is_active ? 'disable' : 'enable');
        setMenuOpen(false);
      }
    }, user.is_active ? cp('停用账号', 'Disable account') : cp('恢复账号', 'Enable account'))) : null))), /*#__PURE__*/React.createElement("section", {
      className: "adm-user-summary"
    }, /*#__PURE__*/React.createElement(Summary, {
      label: cp('生命周期', 'Lifecycle'),
      value: user.chapter_count ? cp(`已写 ${user.chapter_count} 章`, `${user.chapter_count} chapters`) : cp(`${user.book_count} 本作品`, `${user.book_count} books`),
      detail: cp(`${user.word_count.toLocaleString()} 字`, `${user.word_count.toLocaleString()} words`)
    }), /*#__PURE__*/React.createElement(Summary, {
      label: cp('累计真实实付', 'Fulfilled payments'),
      value: money(user.paid_cents),
      detail: cp(`${user.paid_order_count} 笔已履约订单`, `${user.paid_order_count} fulfilled orders`)
    }), /*#__PURE__*/React.createElement(Summary, {
      label: cp('当前订阅', 'Subscription'),
      value: user.plan_name || cp('未订阅', 'None'),
      detail: user.subscription_ends_at ? fullStamp(user.subscription_ends_at) : '—'
    }), /*#__PURE__*/React.createElement(Summary, {
      label: cp('可用笔力', 'Available credits'),
      value: user.credit_account_ready ? millisToCredits(user.balance_millis - user.reserved_millis).toLocaleString() : '—',
      detail: user.credit_account_ready ? cp(`冻结 ${millisToCredits(user.reserved_millis)} · 正文 ${user.effective_content_restriction || 'normal'}`, `${millisToCredits(user.reserved_millis)} reserved · content ${user.effective_content_restriction || 'normal'}`) : cp('权益账户待初始化', 'Credit account pending setup')
    }), /*#__PURE__*/React.createElement(Summary, {
      label: cp('最近活跃', 'Last active'),
      value: stamp(user.last_active_at),
      detail: cp(`${user.task_count} 个历史任务`, `${user.task_count} lifetime tasks`)
    }), /*#__PURE__*/React.createElement(Summary, {
      label: cp(`近 ${days} 天任务成功率`, `${days}-day task success`),
      value: taskRate(user),
      detail: user.terminal_task_count ? `${user.completed_task_count} / ${user.terminal_task_count}` : cp('尚无终态任务', 'No terminal tasks')
    })), user.failed_task_count > 0 ? /*#__PURE__*/React.createElement("div", {
      className: "adm-user-attention"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, cp('需要关注', 'Needs attention')), /*#__PURE__*/React.createElement("span", null, cp(`近 ${days} 天有 ${user.failed_task_count} 个失败任务。`, `${user.failed_task_count} failed tasks in ${days} days.`))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setTab('creation')
    }, cp('查看失败证据', 'View evidence'))) : null, partial.length ? /*#__PURE__*/React.createElement("div", {
      className: "adm-user-partial",
      role: "status"
    }, cp('部分明细暂不可用，已保留可读取的账户事实。', 'Some details are unavailable; available account facts remain visible.')) : null, /*#__PURE__*/React.createElement("div", {
      className: "adm-user-tabs",
      role: "tablist"
    }, TABS.map(([key, zh, en]) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      role: "tab",
      "aria-selected": tab === key,
      className: tab === key ? 'on' : '',
      key: key,
      onClick: () => setTab(key)
    }, cp(zh, en)))), tab === 'overview' ? /*#__PURE__*/React.createElement(Overview, {
      data: data
    }) : null, tab === 'billing' ? /*#__PURE__*/React.createElement(BillingEvidence, {
      orders: data.orders,
      transactions: data.transactions
    }) : null, tab === 'creation' ? /*#__PURE__*/React.createElement(CreationEvidence, {
      books: data.books,
      tasks: data.tasks
    }) : null, tab === 'messages' ? /*#__PURE__*/React.createElement(MessageEvidence, {
      rows: data.notifications
    }) : null, tab === 'audit' ? /*#__PURE__*/React.createElement(AuditEvidence, {
      user: user,
      rows: data.audits
    }) : null, tab === 'invitations' ? /*#__PURE__*/React.createElement(InvitationDashboard, {
      userId: user.id
    }) : null, drawer === 'refund' ? /*#__PURE__*/React.createElement(RefundDrawer, {
      user: user,
      onClose: closeDrawer,
      onDone: finished
    }) : drawer ? /*#__PURE__*/React.createElement(OperationDrawer, {
      type: drawer,
      user: user,
      plans: plans,
      onClose: closeDrawer,
      onDone: finished
    }) : null);
  }
  function Summary({
    label,
    value,
    detail
  }) {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("strong", null, value), /*#__PURE__*/React.createElement("small", null, detail));
  }
  function Overview({
    data
  }) {
    const bookById = Object.fromEntries((data.books || []).map(book => [book.id, book]));
    const entries = [...(data.tasks || []).map(task => ({
      at: task.created_at,
      tone: task.status === 'failed' ? 'risk' : task.status === 'completed' ? 'success' : 'neutral',
      title: cp('创作任务', 'Creation task'),
      detail: `${task.task_type} · ${task.status}${bookById[task.book_link_id] ? ` · ${bookById[task.book_link_id].title}` : ''}`
    })), ...(data.orders || []).map(order => ({
      at: order.fulfilled_at || order.created_at,
      tone: order.status === 'fulfilled' ? 'value' : 'neutral',
      title: cp('订单', 'Order'),
      detail: `${order.product_code} · ${money(order.amount_cents)} · ${order.status}`
    })), ...(data.notifications || []).map(note => ({
      at: note.created_at,
      tone: 'history',
      title: cp('消息', 'Message'),
      detail: note.title
    })), ...(data.audits || []).map(audit => auditJourneyEntry(audit))].sort((left, right) => new Date(right.at) - new Date(left.at)).slice(0, 18);
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-user-overview-grid"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-user-card"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, cp('用户旅程', 'User journey'))), entries.length ? /*#__PURE__*/React.createElement("ol", {
      className: "adm-user-timeline"
    }, entries.map((entry, index) => /*#__PURE__*/React.createElement("li", {
      className: `is-${entry.tone}`,
      key: `${entry.at}-${index}`
    }, /*#__PURE__*/React.createElement("time", null, stamp(entry.at)), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, entry.title), /*#__PURE__*/React.createElement("p", null, entry.detail))))) : /*#__PURE__*/React.createElement(EvidenceEmpty, null)), /*#__PURE__*/React.createElement("aside", {
      className: "adm-user-overview-side"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-user-card"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, cp('商业关系', 'Commercial relationship'))), /*#__PURE__*/React.createElement("dl", null, /*#__PURE__*/React.createElement(Fact, {
      label: cp('首次付费', 'First payment'),
      value: stamp(data.profile.first_paid_at)
    }), /*#__PURE__*/React.createElement(Fact, {
      label: cp('最近付费', 'Latest payment'),
      value: stamp(data.profile.last_paid_at)
    }), /*#__PURE__*/React.createElement(Fact, {
      label: cp('累计消费笔力', 'Credits consumed'),
      value: millisToCredits(data.profile.consumed_millis).toLocaleString()
    }), /*#__PURE__*/React.createElement(Fact, {
      label: cp('未读消息', 'Unread messages'),
      value: data.profile.unread_notification_count
    }))), /*#__PURE__*/React.createElement("section", {
      className: "adm-user-card"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, cp('当前作品', 'Current books'))), data.books.length ? data.books.slice(0, 3).map(book => /*#__PURE__*/React.createElement("article", {
      className: "adm-user-book",
      key: book.id
    }, /*#__PURE__*/React.createElement("strong", null, "\u300A", book.title, "\u300B"), /*#__PURE__*/React.createElement("span", null, book.genre || '—', " \xB7 ", book.chapter_count || 0, " ", cp('章', 'chapters'), " \xB7 ", (book.word_count || 0).toLocaleString(), " ", cp('字', 'words')))) : /*#__PURE__*/React.createElement(EvidenceEmpty, null))));
  }
  function Fact({
    label,
    value
  }) {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, label), /*#__PURE__*/React.createElement("dd", null, value == null ? '—' : value));
  }
  function EvidenceEmpty() {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-user-evidence-empty"
    }, cp('暂无可显示记录', 'No records'));
  }
  function BillingEvidence({
    orders,
    transactions
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-user-evidence-grid"
    }, /*#__PURE__*/React.createElement(EvidenceTable, {
      title: cp('订单', 'Orders'),
      columns: [cp('时间', 'Time'), cp('商品', 'Product'), cp('金额', 'Amount'), cp('状态', 'Status')],
      rows: orders.map(order => [stamp(order.created_at), order.product_code, money(order.amount_cents), order.status])
    }), /*#__PURE__*/React.createElement(EvidenceTable, {
      title: cp('权益流水', 'Credit ledger'),
      columns: [cp('时间', 'Time'), cp('类型', 'Type'), cp('变动', 'Change'), cp('余额', 'Balance')],
      rows: transactions.map(row => [stamp(row.created_at), row.reason || row.type, `${row.amount_millis > 0 ? '+' : ''}${millisToCredits(row.amount_millis)}`, millisToCredits(row.balance_after_millis)])
    }));
  }
  function CreationEvidence({
    books,
    tasks
  }) {
    const names = Object.fromEntries(books.map(book => [book.id, book.title]));
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-user-evidence-grid"
    }, /*#__PURE__*/React.createElement(EvidenceTable, {
      title: cp('作品', 'Books'),
      columns: [cp('作品', 'Book'), cp('类型', 'Genre'), cp('章节', 'Chapters'), cp('字数', 'Words')],
      rows: books.map(book => [book.title, book.genre || '—', book.chapter_count || 0, (book.word_count || 0).toLocaleString()])
    }), /*#__PURE__*/React.createElement(EvidenceTable, {
      title: cp('任务', 'Tasks'),
      columns: [cp('时间', 'Time'), cp('类型', 'Type'), cp('作品', 'Book'), cp('结果', 'Result')],
      rows: tasks.map(task => [stamp(task.created_at), task.task_type, names[task.book_link_id] || '—', task.status])
    }));
  }
  function MessageEvidence({
    rows
  }) {
    return /*#__PURE__*/React.createElement(EvidenceTable, {
      title: cp('消息与运营记录', 'Messages & operations'),
      columns: [cp('时间', 'Time'), cp('类型', 'Type'), cp('标题', 'Title'), cp('状态', 'State')],
      rows: rows.map(row => [stamp(row.created_at), row.type, row.title, row.read_at ? cp('已读', 'Read') : cp('未读', 'Unread')])
    });
  }
  function AuditEvidence({
    user,
    rows
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-user-evidence-grid"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-user-card"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, cp('账户事实', 'Account facts'))), /*#__PURE__*/React.createElement("dl", {
      className: "adm-user-account-facts"
    }, /*#__PURE__*/React.createElement(Fact, {
      label: cp('账号状态', 'Account state'),
      value: user.is_active ? cp('正常', 'Active') : cp('已停用', 'Disabled')
    }), /*#__PURE__*/React.createElement(Fact, {
      label: cp('邮箱验证', 'Email verification'),
      value: fullStamp(user.email_verified_at)
    }), /*#__PURE__*/React.createElement(Fact, {
      label: cp('正文限制', 'Content restriction'),
      value: `${user.manual_content_restriction || 'normal'} → ${user.effective_content_restriction || 'normal'}`
    }), /*#__PURE__*/React.createElement(Fact, {
      label: cp('邀请状态', 'Invitations'),
      value: user.invitation_frozen ? cp('已冻结', 'Frozen') : cp('正常', 'Active')
    }), /*#__PURE__*/React.createElement(Fact, {
      label: cp('最近登录', 'Last login'),
      value: fullStamp(user.last_login_at)
    }), /*#__PURE__*/React.createElement(Fact, {
      label: cp('API Key', 'API keys'),
      value: user.api_key_count
    }))), /*#__PURE__*/React.createElement(EvidenceTable, {
      title: cp('操作记录', 'Activity log'),
      columns: [cp('时间', 'Time'), cp('操作', 'Action'), cp('结果', 'Result'), cp('操作者', 'Actor')],
      rows: rows.map(row => [stamp(row.created_at), auditActionLabel(row.action), row.success ? cp('成功', 'Success') : cp('失败', 'Failed'), auditActorLabel(row, user.id)])
    }));
  }
  function InvitationDashboard({
    userId
  }) {
    const [result, setResult] = useState({
      summary: {},
      trend: [],
      items: [],
      total: 0,
      limit: PAGE_SIZE,
      offset: 0
    });
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState({
      key: 'registered_at',
      direction: 'desc'
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const pending = useRef(null);
    const pages = Math.max(1, Math.ceil((Number(result.total) || 0) / (Number(result.limit) || PAGE_SIZE)));
    const load = useCallback(async () => {
      if (pending.current) pending.current.abort();
      const controller = new AbortController();
      pending.current = controller;
      setLoading(true);
      setError('');
      try {
        const next = await window.LF_API.adminUserInvitations(userId, {
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          sort: sort.key,
          direction: sort.direction
        }, {
          signal: controller.signal
        });
        if (!controller.signal.aborted) setResult(next);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError.message || cp('邀请看板载入失败', 'Could not load invitation dashboard'));
      } finally {
        if (pending.current === controller) {
          pending.current = null;
          setLoading(false);
        }
      }
    }, [page, sort, userId]);
    useEffect(() => {
      load();
      return () => {
        if (pending.current) pending.current.abort();
      };
    }, [load]);
    useEffect(() => {
      if (page > pages) setPage(pages);
    }, [page, pages]);
    const summary = result.summary || {};
    const rewardLabel = status => ({
      pending: cp('待完成建书', 'Pending setup'),
      granted: cp('已发奖励', 'Rewarded'),
      revoked: cp('已撤销', 'Revoked')
    })[status] || status || '—';
    const columns = useMemo(() => [{
      key: 'user',
      header: cp('受邀用户', 'Invited user'),
      priority: 'primary',
      sortable: false,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, row.display_name || String(row.email).split('@')[0]), /*#__PURE__*/React.createElement("small", null, row.email))
    }, {
      key: 'registered_at',
      header: cp('注册时间', 'Registered'),
      defaultDirection: 'desc',
      sortValue: row => Date.parse(row.registered_at),
      render: row => fullStamp(row.registered_at)
    }, {
      key: 'last_active_at',
      header: cp('最近活跃', 'Last active'),
      defaultDirection: 'desc',
      sortValue: row => row.last_active_at ? Date.parse(row.last_active_at) : null,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, stamp(row.last_active_at)), /*#__PURE__*/React.createElement("small", null, cp(`近 30 天活跃 ${row.active_days_30d} 天`, `${row.active_days_30d} active days in 30d`)))
    }, {
      key: 'active_days_30d',
      header: cp('30 日活跃', '30-day activity'),
      numeric: true,
      defaultDirection: 'desc',
      sortValue: row => row.active_days_30d,
      render: row => `${row.active_days_30d} ${cp('天', 'days')}`
    }, {
      key: 'build_progress',
      header: cp('建书与创作', 'Setup & creation'),
      defaultDirection: 'desc',
      sortValue: row => row.build_progress,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, row.build_completed ? cp('已完成建书', 'Setup completed') : `${row.build_progress} / 4`), /*#__PURE__*/React.createElement("small", null, row.book_count, " ", cp('本作品', 'books'), " \xB7 ", row.chapter_count, " ", cp('章', 'chapters')))
    }, {
      key: 'paid_cents',
      header: cp('商业价值', 'Commercial value'),
      description: cp('只统计金额大于零且已履约的订阅与笔力包订单。', 'Only fulfilled subscription and credit-pack orders above zero.'),
      numeric: true,
      defaultDirection: 'desc',
      sortValue: row => row.paid_cents,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, money(row.paid_cents)), /*#__PURE__*/React.createElement("small", null, row.paid_order_count, " ", cp('笔已履约订单', 'fulfilled orders')))
    }, {
      key: 'reward_status',
      header: cp('奖励状态', 'Reward'),
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("span", {
        className: `adm-user-invite-reward is-${row.reward_status}`
      }, rewardLabel(row.reward_status))
    }], []);
    const trendSeries = useMemo(() => [{
      key: 'new_invite_count',
      label: cp('新增邀请', 'New invites'),
      tone: 'gold',
      format: value => Number(value || 0).toLocaleString()
    }, {
      key: 'active_invitee_count',
      label: cp('活跃邀请用户', 'Active invitees'),
      tone: 'sage',
      format: value => Number(value || 0).toLocaleString()
    }, {
      key: 'paid_cents',
      label: cp('已履约实付', 'Fulfilled payments'),
      type: 'bar',
      axis: 'right',
      tone: 'terra',
      format: money
    }], []);
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-user-invitations"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-user-invite-summary"
    }, /*#__PURE__*/React.createElement(Summary, {
      label: cp('邀请注册数', 'Invited registrations'),
      value: Number(summary.invited_count || 0).toLocaleString(),
      detail: cp('按普通邀请人归因', 'Ordinary inviter attribution')
    }), /*#__PURE__*/React.createElement(Summary, {
      label: cp('30 日活跃率', '30-day activity rate'),
      value: summary.active_30d_pct == null ? '—' : `${summary.active_30d_pct}%`,
      detail: `${summary.active_30d_count || 0} / ${summary.invited_count || 0}`
    }), /*#__PURE__*/React.createElement(Summary, {
      label: cp('完成建书', 'Completed setup'),
      value: Number(summary.completed_build_count || 0).toLocaleString(),
      detail: cp('世界观、角色、故事计划与卷一大纲齐全', 'World, characters, plan, and volume-one outline')
    }), /*#__PURE__*/React.createElement(Summary, {
      label: cp('付费邀请用户', 'Paid invitees'),
      value: Number(summary.paid_invitee_count || 0).toLocaleString(),
      detail: cp('至少一笔已履约实付', 'At least one fulfilled payment')
    }), /*#__PURE__*/React.createElement(Summary, {
      label: cp('累计已履约实付', 'Fulfilled payments'),
      value: money(summary.paid_cents),
      detail: cp('订阅与笔力包', 'Subscriptions and credit packs')
    })), error ? /*#__PURE__*/React.createElement("div", {
      className: "adm-userops-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: load
    }, TC('adm_retry'))) : null, /*#__PURE__*/React.createElement("section", {
      className: "adm-user-card adm-user-invite-table"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, cp('邀请用户明细', 'Invited user details')), /*#__PURE__*/React.createElement("p", null, cp('管理员视角显示完整邮箱；商业价值仅取已履约实付。', 'Admin view shows full email; commercial value uses fulfilled payments only.'))), /*#__PURE__*/React.createElement("span", null, result.total || 0)), /*#__PURE__*/React.createElement(DataTable, {
      rows: result.items || [],
      columns: columns,
      rowKey: "user_id",
      ariaLabel: cp('邀请用户明细', 'Invited user details'),
      loading: loading,
      serverSort: true,
      controlledSort: sort,
      onSortChange: next => {
        setPage(1);
        setSort(next);
      },
      pagination: {
        total: result.total || 0,
        page,
        pages,
        pageSize: result.limit || PAGE_SIZE,
        onPageChange: setPage
      },
      empty: cp('该用户暂未邀请其他用户。', 'This user has not invited anyone yet.'),
      compact: true
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-user-card adm-user-invite-trend"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, cp('近 30 天趋势', '30-day trend')), /*#__PURE__*/React.createElement("p", null, cp('新增邀请、活跃邀请用户与已履约实付', 'New invites, active invitees, and fulfilled payments')))), /*#__PURE__*/React.createElement(CartesianChart, {
      rows: result.trend || [],
      xKey: "date",
      xTickFormatter: value => String(value).slice(5).replace('-', '/'),
      series: trendSeries,
      ariaLabel: cp('邀请看板近 30 天趋势', 'Invitation dashboard 30-day trend'),
      empty: cp('近 30 天暂无邀请活动', 'No invitation activity in the last 30 days'),
      height: 220
    })));
  }
  function EvidenceTable({
    title,
    columns,
    rows
  }) {
    const tableColumns = columns.map((column, index) => ({
      key: String(index),
      header: column,
      value: row => row[index],
      render: row => row[index] == null ? '—' : row[index]
    }));
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-user-card adm-user-evidence"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, title), /*#__PURE__*/React.createElement("span", null, rows.length)), rows.length ? /*#__PURE__*/React.createElement(DataTable, {
      rows: rows,
      columns: tableColumns,
      ariaLabel: title,
      compact: true
    }) : /*#__PURE__*/React.createElement(EvidenceEmpty, null));
  }
  function OperationDrawer({
    type,
    user,
    plans,
    onClose,
    onDone
  }) {
    const [reason, setReason] = useState('');
    const [amount, setAmount] = useState('50');
    const [validDays, setValidDays] = useState('');
    const creditRequest = useRef(null);
    const [restriction, setRestriction] = useState(type === 'penalty' ? 'hard' : user.manual_content_restriction || 'normal');
    const [invitationFrozen, setInvitationFrozen] = useState(!!user.invitation_frozen);
    const [evidence, setEvidence] = useState('');
    const [penaltyPreview, setPenaltyPreview] = useState(null);
    const [idempotencyKey] = useState(() => `credit-penalty:${window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`);
    const [plan, setPlan] = useState(user.plan_code || plans[0] && plans[0].code || '');
    const [title, setTitle] = useState(cp('关于近期创作任务的跟进', 'Follow-up on recent creation tasks'));
    const [message, setMessage] = useState(cp('您好，我们注意到您近期有创作任务未成功，正在进一步核查。如仍遇到问题，您可以直接回复这条消息。', 'We noticed that some recent creation tasks did not complete. Please reply if the issue continues.'));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [completed, setCompleted] = useState(false);
    const initialFocus = useRef(null);
    useEffect(() => {
      if (initialFocus.current) initialFocus.current.focus();
      const closeOnEscape = event => {
        if (event.key === 'Escape' && !busy) onClose();
      };
      window.addEventListener('keydown', closeOnEscape);
      return () => window.removeEventListener('keydown', closeOnEscape);
    }, [busy, onClose]);
    const labels = {
      message: cp('发送消息', 'Send message'),
      credit: cp('增加笔力', 'Add credits'),
      penalty: cp('追缴笔力并限制', 'Claw back and restrict'),
      restriction: cp('调整正文限制', 'Content restriction'),
      invitation: cp('调整邀请冻结', 'Invitation freeze'),
      subscription: cp('设置订阅', 'Set subscription'),
      disable: cp('停用账号', 'Disable account'),
      enable: cp('恢复账号', 'Enable account')
    };
    const valid = reason.trim() && (type !== 'message' || title.trim() && message.trim()) && (!['credit', 'penalty'].includes(type) || Number(amount) > 0) && (type !== 'credit' || Number.isInteger(Number(validDays)) && Number(validDays) > 0 && Number(validDays) <= 36500) && (type !== 'penalty' || ['soft', 'hard'].includes(restriction)) && (type !== 'subscription' || plan);
    const penaltyPayload = () => ({
      amount_millis: Math.round(Number(amount) * 1000),
      manual_restriction: restriction,
      reason: reason.trim(),
      evidence: evidence.trim() ? {
        note: evidence.trim()
      } : null
    });
    const submit = async () => {
      if (!valid || busy) return;
      setBusy(true);
      setError('');
      try {
        if (type === 'message') await window.LF_API.adminSendMessage(user.id, {
          title: title.trim(),
          message: message.trim(),
          reason: reason.trim()
        });
        if (type === 'credit') {
          const amountMillis = Math.round(Number(amount) * 1000);
          const signature = JSON.stringify([user.id, amountMillis, reason.trim(), Number(validDays)]);
          if (!creditRequest.current || creditRequest.current.signature !== signature) creditRequest.current = {
            signature,
            key: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`
          };
          await window.LF_API.adminGrantCredits(user.id, amountMillis, reason.trim(), Number(validDays), creditRequest.current.key);
        }
        if (type === 'penalty' && (!penaltyPreview || !penaltyPreview.can_apply)) {
          const preview = await window.LF_API.adminPreviewCreditPenalty(user.id, penaltyPayload());
          setPenaltyPreview(preview);
          return;
        }
        if (type === 'penalty') await window.LF_API.adminApplyCreditPenalty(user.id, {
          ...penaltyPayload(),
          idempotency_key: idempotencyKey,
          expected_balance_millis: penaltyPreview.balance_millis,
          expected_pending_reward_count: penaltyPreview.pending_rewards_to_revoke
        });
        if (type === 'restriction') await window.LF_API.adminUpdateContentRestriction(user.id, restriction, reason.trim());
        if (type === 'invitation') await window.LF_API.adminUpdateInvitationFreeze(user.id, invitationFrozen, reason.trim());
        if (type === 'subscription') await window.LF_API.adminSetSubscription(user.id, plan, reason.trim());
        if (type === 'disable') await window.LF_API.adminSetUserActive(user.id, false, reason.trim());
        if (type === 'enable') await window.LF_API.adminSetUserActive(user.id, true, reason.trim());
        setCompleted(true);
        await onDone();
      } catch (submitError) {
        const detail = submitError && submitError.body && submitError.body.detail;
        if (type === 'penalty' && detail && detail.code === 'penalty_preview_stale') setPenaltyPreview(null);
        setError(submitError.message || cp('操作失败', 'Operation failed'));
      } finally {
        setBusy(false);
      }
    };
    const changePenaltyInput = setter => event => {
      setter(event.target.value);
      setPenaltyPreview(null);
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-user-drawer-layer",
      role: "presentation",
      onMouseDown: event => {
        if (event.target === event.currentTarget && !busy) onClose();
      }
    }, /*#__PURE__*/React.createElement("aside", {
      className: "adm-user-drawer",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "adm-user-drawer-title"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, userName(user), " \xB7 ", user.email || '—'), /*#__PURE__*/React.createElement("h2", {
      id: "adm-user-drawer-title"
    }, labels[type])), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": cp('关闭操作抽屉', 'Close operation drawer'),
      onClick: onClose,
      disabled: busy
    }, "\xD7")), completed ? /*#__PURE__*/React.createElement("div", {
      className: "adm-user-operation-complete"
    }, /*#__PURE__*/React.createElement("b", null, cp('完成', 'Done')), /*#__PURE__*/React.createElement("h3", null, cp('操作已完成并写入审计', 'Operation completed and audited')), /*#__PURE__*/React.createElement("p", null, cp('用户档案已按最新事实刷新。', 'The user profile has been refreshed.')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onClose
    }, cp('返回用户档案', 'Back to profile'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "adm-user-drawer-body"
    }, type === 'credit' ? /*#__PURE__*/React.createElement("section", {
      className: "adm-user-impact"
    }, /*#__PURE__*/React.createElement("h3", null, cp('余额影响', 'Balance impact')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, millisToCredits(user.balance_millis - user.reserved_millis)), /*#__PURE__*/React.createElement("i", null, "\u2192"), /*#__PURE__*/React.createElement("strong", null, millisToCredits(user.balance_millis - user.reserved_millis) + (Number(amount) || 0)))) : null, type === 'penalty' ? /*#__PURE__*/React.createElement("div", {
      className: "adm-user-danger-note"
    }, /*#__PURE__*/React.createElement("strong", null, cp('只追缴有证据支持的违规奖励', 'Claw back only rewards supported by evidence')), /*#__PURE__*/React.createElement("span", null, cp('预览不会写库；确认后将扣减余额、冻结邀请并撤销待发邀请奖励。存在冻结笔力或运行中任务时不会执行。', 'Preview does not write. Confirmation deducts credits, freezes invitations, and revokes pending rewards. Reserved credits or active tasks block the action.'))) : null, type === 'penalty' && penaltyPreview ? /*#__PURE__*/React.createElement("section", {
      className: "adm-user-impact"
    }, /*#__PURE__*/React.createElement("h3", null, cp('处罚预览', 'Penalty preview')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, millisToCredits(penaltyPreview.balance_millis)), /*#__PURE__*/React.createElement("i", null, "\u2192"), /*#__PURE__*/React.createElement("strong", null, millisToCredits(penaltyPreview.resulting_balance_millis))), /*#__PURE__*/React.createElement("small", null, cp(`正文限制 ${penaltyPreview.resulting_effective_restriction} · 撤销 ${penaltyPreview.pending_rewards_to_revoke} 笔待发奖励`, `Content ${penaltyPreview.resulting_effective_restriction} · ${penaltyPreview.pending_rewards_to_revoke} pending rewards revoked`)), !penaltyPreview.can_apply ? /*#__PURE__*/React.createElement("p", {
      className: "adm-user-operation-error"
    }, cp(`当前不可执行：冻结 ${millisToCredits(penaltyPreview.blocking.reserved_millis)} 笔力，${penaltyPreview.blocking.active_task_count} 个运行中任务`, `Blocked: ${millisToCredits(penaltyPreview.blocking.reserved_millis)} reserved, ${penaltyPreview.blocking.active_task_count} active tasks`)) : null) : null, type === 'disable' ? /*#__PURE__*/React.createElement("div", {
      className: "adm-user-danger-note"
    }, /*#__PURE__*/React.createElement("strong", null, cp('停用后用户将无法登录或创建任务', 'The user will not be able to sign in or create tasks')), /*#__PURE__*/React.createElement("span", null, cp('作品、订单、权益和审计记录不会删除。', 'Books, orders, credits, and audit records remain.'))) : null, type === 'message' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", null, cp('标题', 'Title'), /*#__PURE__*/React.createElement("input", {
      ref: initialFocus,
      value: title,
      onChange: event => setTitle(event.target.value)
    })), /*#__PURE__*/React.createElement("label", null, cp('消息正文', 'Message'), /*#__PURE__*/React.createElement("textarea", {
      value: message,
      onChange: event => setMessage(event.target.value)
    }))) : null, type === 'credit' ? /*#__PURE__*/React.createElement("label", null, cp('增加笔力', 'Credits to add'), /*#__PURE__*/React.createElement("input", {
      ref: initialFocus,
      type: "number",
      min: "0.001",
      step: "0.001",
      value: amount,
      onChange: event => setAmount(event.target.value)
    })) : null, type === 'credit' ? /*#__PURE__*/React.createElement("label", null, cp('有效天数', 'Valid days'), /*#__PURE__*/React.createElement("input", {
      id: "admin-user-credit-valid-days",
      type: "number",
      min: "1",
      max: "36500",
      step: "1",
      required: true,
      disabled: busy,
      value: validDays,
      onChange: event => setValidDays(event.target.value)
    })) : null, type === 'penalty' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", null, cp('追缴笔力', 'Credits to claw back'), /*#__PURE__*/React.createElement("input", {
      ref: initialFocus,
      type: "number",
      min: "0.001",
      step: "0.001",
      value: amount,
      onChange: changePenaltyInput(setAmount)
    })), /*#__PURE__*/React.createElement("label", null, cp('人工正文限制', 'Manual content restriction'), /*#__PURE__*/React.createElement("select", {
      value: restriction,
      onChange: changePenaltyInput(setRestriction)
    }, /*#__PURE__*/React.createElement("option", {
      value: "soft"
    }, "soft \xB7 ", cp('暂时不可读取', 'Temporary unavailable')), /*#__PURE__*/React.createElement("option", {
      value: "hard"
    }, "hard \xB7 ", cp('风险账户禁止读取', 'Risk account blocked')))), /*#__PURE__*/React.createElement("label", null, cp('证据摘要（可选）', 'Evidence note (optional)'), /*#__PURE__*/React.createElement("textarea", {
      value: evidence,
      onChange: changePenaltyInput(setEvidence),
      placeholder: cp('记录邀请归因、流水或工单编号', 'Record attribution, ledger, or ticket references')
    }))) : null, type === 'restriction' ? /*#__PURE__*/React.createElement("label", null, cp('人工正文限制', 'Manual content restriction'), /*#__PURE__*/React.createElement("select", {
      ref: initialFocus,
      value: restriction,
      onChange: event => setRestriction(event.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: "normal"
    }, "normal \xB7 ", cp('仅按余额判断', 'Balance-derived only')), /*#__PURE__*/React.createElement("option", {
      value: "soft"
    }, "soft \xB7 ", cp('暂时不可读取', 'Temporary unavailable')), /*#__PURE__*/React.createElement("option", {
      value: "hard"
    }, "hard \xB7 ", cp('风险账户禁止读取', 'Risk account blocked')))) : null, type === 'invitation' ? /*#__PURE__*/React.createElement("label", null, cp('邀请状态', 'Invitation state'), /*#__PURE__*/React.createElement("select", {
      ref: initialFocus,
      value: invitationFrozen ? 'frozen' : 'active',
      onChange: event => setInvitationFrozen(event.target.value === 'frozen')
    }, /*#__PURE__*/React.createElement("option", {
      value: "active"
    }, cp('正常', 'Active')), /*#__PURE__*/React.createElement("option", {
      value: "frozen"
    }, cp('冻结新归因和奖励', 'Freeze attribution and rewards')))) : null, type === 'subscription' ? /*#__PURE__*/React.createElement("label", null, cp('目标套餐', 'Target plan'), /*#__PURE__*/React.createElement("select", {
      ref: initialFocus,
      value: plan,
      onChange: event => setPlan(event.target.value)
    }, plans.map(item => /*#__PURE__*/React.createElement("option", {
      value: item.code,
      key: item.code
    }, item.name)))) : null, /*#__PURE__*/React.createElement("label", null, cp('处理原因', 'Reason'), /*#__PURE__*/React.createElement("textarea", {
      ref: ['message', 'credit', 'penalty', 'restriction', 'invitation', 'subscription'].includes(type) ? null : initialFocus,
      value: reason,
      onChange: event => {
        setReason(event.target.value);
        if (type === 'penalty') setPenaltyPreview(null);
      },
      placeholder: cp('记录可核验的业务依据', 'Record a verifiable business reason')
    })), type === 'credit' && valid ? /*#__PURE__*/React.createElement("p", null, cp(`本次发放活动笔力，有效期 ${Number(validDays)} 天。`, `Activity credits valid for ${Number(validDays)} days.`)) : null, error ? /*#__PURE__*/React.createElement("p", {
      className: "adm-user-operation-error",
      role: "alert"
    }, error) : null), /*#__PURE__*/React.createElement("footer", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onClose,
      disabled: busy
    }, cp('取消', 'Cancel')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: type === 'disable' || type === 'penalty' && penaltyPreview && penaltyPreview.can_apply ? 'danger' : 'primary',
      onClick: submit,
      disabled: !valid || busy
    }, busy ? cp('处理中…', 'Working…') : type === 'penalty' && !penaltyPreview ? cp('预览影响', 'Preview impact') : type === 'penalty' && !penaltyPreview.can_apply ? cp('重新预览', 'Refresh preview') : cp(`确认${labels[type]}`, `Confirm ${labels[type]}`))))));
  }
  window.AdminUsersTab = UserOperationsTab;
})();
}
