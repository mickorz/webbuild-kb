{
/* ===== 管理后台 / 全站账务流水审计 ===== */
(function () {
  const {
    useCallback,
    useEffect,
    useRef,
    useState
  } = React;
  const DataTable = window.AdminDataTable;
  const PAGE_SIZE = 50;
  const isEnglish = () => window.CLANG === 'en';
  const cp = (zh, en) => isEnglish() ? en : zh;
  const credits = value => Number(((Number(value) || 0) / 1000).toFixed(3)).toLocaleString();
  const money = cents => `¥${(Number(cents || 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
  const stamp = value => value ? new Date(value).toLocaleString(isEnglish() ? 'en-US' : 'zh-CN') : '—';
  const selectedCreatedFrom = days => days > 0 ? new Date(Date.now() - days * 86400000).toISOString() : '';
  const ledgerTypeLabel = value => ({
    credit: cp('笔力', 'Credits'),
    payment: cp('支付', 'Payment')
  })[value] || value || '—';
  const actionLabel = value => ({
    grant: cp('发放', 'Grant'),
    consume: cp('消费', 'Spend'),
    reserve: cp('冻结', 'Hold'),
    refund: cp('退回', 'Refund'),
    expire: cp('到期清零', 'Expire'),
    clawback: cp('追缴', 'Clawback'),
    purchase: cp('购买', 'Purchase'),
    top_up: cp('充值', 'Top-up')
  })[value] || value || '—';
  const sourceLabel = value => ({
    engine_task: cp('任务消费', 'Engine task'),
    cruise: cp('巡航任务', 'Cruise'),
    assistant_model: cp('助手模型调用', 'Assistant model call'),
    complete_action: cp('动作完成', 'Completed action'),
    admin_clawback: cp('管理员追缴', 'Admin clawback'),
    subscription_expiry: cp('订阅到期清零', 'Subscription expiry'),
    activity_expiry: cp('活动笔力到期', 'Activity credit expiry'),
    admin_activity_grant: cp('活动发放', 'Campaign grant'),
    admin_bulk_grant: cp('管理员批量发放', 'Admin bulk grant'),
    cdk_redemption: cp('CDK 兑换发放', 'CDK redemption'),
    invitation_reward: cp('邀请奖励', 'Invitation reward'),
    subscription_grant: cp('订阅', 'Subscription'),
    credit_pack_purchase: cp('笔力加量包', 'Credit pack'),
    admin_manual_grant: cp('管理员手动发放', 'Admin manual grant'),
    public_api_top_up: cp('公益模型充值', 'Public model top-up'),
    legacy_unclassified: cp('历史未分类', 'Legacy unclassified')
  })[value] || value || '—';
  const LEDGER_TYPES = ['credit', 'payment'];
  const ACTIONS = ['consume', 'grant', 'reserve', 'refund', 'clawback', 'expire', 'purchase', 'top_up'];
  const SOURCES = ['engine_task', 'assistant_model', 'cruise', 'complete_action', 'admin_clawback', 'subscription_expiry', 'activity_expiry', 'admin_activity_grant', 'admin_bulk_grant', 'cdk_redemption', 'invitation_reward', 'subscription_grant', 'credit_pack_purchase', 'admin_manual_grant', 'public_api_top_up', 'legacy_unclassified'];
  function AmountCell({
    row
  }) {
    if (row.ledger_type === 'payment') return row.credited_amount_cents == null ? /*#__PURE__*/React.createElement("strong", {
      className: "is-positive"
    }, cp('实付', 'Paid'), " ", money(row.paid_amount_cents)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", {
      className: "is-positive"
    }, cp('到账', 'Credited'), " ", money(row.credited_amount_cents)), /*#__PURE__*/React.createElement("small", null, cp('实付', 'Paid'), " ", money(row.paid_amount_cents)));
    return /*#__PURE__*/React.createElement("strong", {
      className: Number(row.amount_millis) < 0 ? 'is-negative' : 'is-positive'
    }, Number(row.amount_millis) > 0 ? '+' : '', credits(row.amount_millis), " ", cp('笔力', 'credits'));
  }
  function BalanceCell({
    row
  }) {
    if (row.ledger_type === 'payment') return row.wallet_balance_after_cents == null ? /*#__PURE__*/React.createElement("strong", null, "\u2014") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, money(row.wallet_balance_after_cents)), /*#__PURE__*/React.createElement("small", null, cp('公益模型余额', 'Public model balance')));
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, row.balance_before_millis == null ? '—' : credits(row.balance_before_millis), " \u2192 ", row.balance_after_millis == null ? '—' : credits(row.balance_after_millis)), /*#__PURE__*/React.createElement("small", null, cp('冻结', 'Held'), " ", credits(row.reserved_after_millis)));
  }
  function CreditLedgerTab() {
    const [result, setResult] = useState({
      items: [],
      total: 0,
      limit: PAGE_SIZE,
      offset: 0,
      ledger_type_counts: {},
      action_counts: {},
      source_counts: {},
      ledger_type_total: 0,
      action_total: 0,
      source_total: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');
    const [queryInput, setQueryInput] = useState('');
    const [query, setQuery] = useState('');
    const [ledgerType, setLedgerType] = useState('all');
    const [action, setAction] = useState('all');
    const [source, setSource] = useState('all');
    const [days, setDays] = useState(0);
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState({
      key: 'created_at',
      direction: 'desc'
    });
    const pendingRequest = useRef(null);
    const pages = Math.max(1, Math.ceil((Number(result.total) || 0) / (Number(result.limit) || PAGE_SIZE)));
    const load = useCallback(async () => {
      if (pendingRequest.current) pendingRequest.current.abort();
      const controller = new AbortController();
      pendingRequest.current = controller;
      setLoading(true);
      setError('');
      try {
        const data = await window.LF_API.adminCreditTransactions({
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          createdFrom: selectedCreatedFrom(days),
          q: query,
          ledgerType,
          action,
          source,
          sort: sort.key,
          direction: sort.direction
        }, {
          signal: controller.signal
        });
        if (!controller.signal.aborted) setResult(data);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError.message || cp('账务记录载入失败', 'Could not load accounting records'));
      } finally {
        if (pendingRequest.current === controller) {
          pendingRequest.current = null;
          setLoading(false);
        }
      }
    }, [action, days, ledgerType, page, query, sort.direction, sort.key, source]);
    useEffect(() => {
      load();
      return () => {
        if (pendingRequest.current) pendingRequest.current.abort();
      };
    }, [load]);
    useEffect(() => {
      const timer = window.setTimeout(() => {
        setPage(1);
        setQuery(queryInput.trim());
      }, 250);
      return () => window.clearTimeout(timer);
    }, [queryInput]);
    useEffect(() => {
      if (page > pages) setPage(pages);
    }, [page, pages]);
    const exportLedger = async () => {
      setExporting(true);
      setExportError('');
      try {
        return await window.LF_API.downloadAdminCreditLedger({
          createdFrom: selectedCreatedFrom(days)
        });
      } catch (downloadError) {
        setExportError(downloadError.message || cp('流水导出失败', 'Could not export transactions'));
      } finally {
        setExporting(false);
      }
      return null;
    };
    const ledgerTypeOptions = LEDGER_TYPES.map(value => ({
      value,
      label: ledgerTypeLabel(value),
      count: Number(result.ledger_type_counts?.[value] || 0)
    }));
    const actionOptions = ACTIONS.map(value => ({
      value,
      label: actionLabel(value),
      count: Number(result.action_counts?.[value] || 0)
    }));
    const sourceOptions = SOURCES.map(value => ({
      value,
      label: sourceLabel(value),
      count: Number(result.source_counts?.[value] || 0)
    }));
    const columns = [{
      key: 'created_at',
      header: cp('发生时间', 'Time'),
      priority: 'primary',
      defaultDirection: 'desc',
      sortValue: row => Date.parse(row.created_at),
      render: row => /*#__PURE__*/React.createElement("time", null, stamp(row.created_at))
    }, {
      key: 'user',
      header: cp('用户', 'User'),
      sortable: false,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, row.display_name || row.email || '—'), /*#__PURE__*/React.createElement("small", null, row.display_name ? `${row.email || '—'} · ` : '', String(row.user_id || '').slice(0, 8)))
    }, {
      key: 'ledger_type',
      header: cp('流水类型', 'Ledger type'),
      sortable: true,
      filter: {
        label: cp('筛选流水类型', 'Filter ledger type'),
        value: ledgerType,
        allValue: 'all',
        allLabel: cp('全部流水', 'All ledger types'),
        allCount: Number(result.ledger_type_total || 0),
        options: ledgerTypeOptions,
        onChange: value => {
          setPage(1);
          setLedgerType(value);
        }
      },
      render: row => /*#__PURE__*/React.createElement("strong", null, ledgerTypeLabel(row.ledger_type))
    }, {
      key: 'action',
      header: cp('动作', 'Action'),
      sortable: true,
      filter: {
        label: cp('筛选动作', 'Filter action'),
        value: action,
        allValue: 'all',
        allLabel: cp('全部动作', 'All actions'),
        allCount: Number(result.action_total || 0),
        options: actionOptions,
        onChange: value => {
          setPage(1);
          setAction(value);
        }
      },
      render: row => /*#__PURE__*/React.createElement("strong", null, actionLabel(row.action))
    }, {
      key: 'source',
      header: cp('来源', 'Source'),
      sortable: false,
      filter: {
        label: cp('筛选来源', 'Filter source'),
        value: source,
        allValue: 'all',
        allLabel: cp('全部来源', 'All sources'),
        allCount: Number(result.source_total || 0),
        options: sourceOptions,
        onChange: value => {
          setPage(1);
          setSource(value);
        }
      },
      render: row => /*#__PURE__*/React.createElement("strong", null, sourceLabel(row.source))
    }, {
      key: 'amount',
      header: cp('变动 / 到账', 'Change / credited'),
      numeric: true,
      sortable: false,
      render: row => /*#__PURE__*/React.createElement(AmountCell, {
        row: row
      })
    }, {
      key: 'balance',
      header: cp('余额', 'Balance'),
      numeric: true,
      sortable: false,
      render: row => /*#__PURE__*/React.createElement(BalanceCell, {
        row: row
      })
    }, {
      key: 'reference',
      header: cp('业务引用', 'Reference'),
      priority: 'optional',
      sortable: false,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, row.reference_id || '—'), row.reference_type ? /*#__PURE__*/React.createElement("small", null, row.reference_type === 'assistant_turn' ? cp('助手轮次', 'Assistant turn') : row.reference_type) : null, row.actor_user_id ? /*#__PURE__*/React.createElement("small", null, cp('操作人 ID', 'Actor ID'), "\uFF1A", row.actor_user_id) : null)
    }, {
      key: 'reason',
      header: cp('说明', 'Reason'),
      sortable: false,
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
        title: row.reason || ''
      }, row.reason || '—'), /*#__PURE__*/React.createElement("small", null, row.status === 'fulfilled' ? cp('已履约', 'Fulfilled') : cp('已记账', 'Recorded')))
    }];
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-credit-ledger-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-credit-ledger-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, cp('流水审计', 'Transaction audit')), /*#__PURE__*/React.createElement("p", null, cp(`共 ${result.total} 条账务记录`, `${result.total} accounting records`))), /*#__PURE__*/React.createElement("div", {
      className: "adm-credit-ledger-actions"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, cp('时间范围', 'Range')), /*#__PURE__*/React.createElement("select", {
      value: days,
      onChange: event => {
        setPage(1);
        setDays(Number(event.target.value));
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "1"
    }, cp('近 1 天', 'Last 1 day')), /*#__PURE__*/React.createElement("option", {
      value: "3"
    }, cp('近 3 天', 'Last 3 days')), /*#__PURE__*/React.createElement("option", {
      value: "7"
    }, cp('近 7 天', 'Last 7 days')), /*#__PURE__*/React.createElement("option", {
      value: "30"
    }, cp('近 30 天', 'Last 30 days')), /*#__PURE__*/React.createElement("option", {
      value: "90"
    }, cp('近 90 天', 'Last 90 days')), /*#__PURE__*/React.createElement("option", {
      value: "0"
    }, cp('全部时间', 'All time')))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: exportLedger,
      disabled: exporting
    }, exporting ? cp('正在导出…', 'Exporting…') : cp('导出 CSV', 'Export CSV')))), /*#__PURE__*/React.createElement("label", {
      className: "adm-credit-ledger-search"
    }, /*#__PURE__*/React.createElement("span", {
      className: "sr-only"
    }, cp('搜索用户邮箱', 'Search user email')), /*#__PURE__*/React.createElement("input", {
      type: "search",
      value: queryInput,
      onChange: event => setQueryInput(event.target.value),
      placeholder: cp('搜索用户邮箱', 'Search user email')
    })), error ? /*#__PURE__*/React.createElement("div", {
      className: "adm-credit-ledger-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: load
    }, cp('重试', 'Retry'))) : null, exportError ? /*#__PURE__*/React.createElement("div", {
      className: "adm-credit-ledger-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, exportError), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: exportLedger
    }, cp('重新导出', 'Export again'))) : null, /*#__PURE__*/React.createElement(DataTable, {
      rows: result.items || [],
      columns: columns,
      rowKey: "id",
      ariaLabel: cp('全站账务记录', 'All accounting records'),
      loading: loading,
      serverSort: true,
      controlledSort: sort,
      onSortChange: next => {
        setPage(1);
        setSort(next);
      },
      pagination: {
        total: result.total,
        page,
        pages,
        pageSize: result.limit || PAGE_SIZE,
        onPageChange: setPage
      },
      className: "adm-credit-ledger-table",
      wrapClassName: "adm-credit-ledger-table-wrap",
      empty: {
        default: cp('当前条件下没有账务记录。', 'No accounting records match the current filters.')
      }
    }));
  }
  window.AdminCreditLedgerTab = CreditLedgerTab;
})();
}
