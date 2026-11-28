{
(function () {
  const {
    useEffect,
    useState
  } = React;
  const DataTable = window.AdminDataTable;
  const Core = window.CreditLedgerCore;
  const PAGE_SIZE = 20;
  const credits = value => new Intl.NumberFormat(window.CLANG === 'en' ? 'en-US' : 'zh-CN', {
    maximumFractionDigits: 3
  }).format(Number(value) / 1000);
  function PersonalCreditLedger() {
    const lang = window.CLANG === 'en' ? 'en' : 'zh';
    const cp = (zh, en) => lang === 'en' ? en : zh;
    const [types, setTypes] = useState(Core.defaultTypes);
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState({
      key: 'created_at',
      direction: 'desc'
    });
    const [result, setResult] = useState({
      items: [],
      total: 0,
      type_counts: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
      let active = true;
      setError(false);
      if (!types.length) {
        setResult(previous => ({
          ...previous,
          items: [],
          total: 0
        }));
        setLoading(false);
        return () => {
          active = false;
        };
      }
      setLoading(true);
      Promise.resolve().then(() => window.LF_API.billingTransactionsPage({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        types,
        sort_by: sort.key,
        sort_dir: sort.direction
      })).then(next => {
        if (!active) return;
        if (!next || !Array.isArray(next.items) || !Array.isArray(next.type_counts) || !Number.isFinite(next.total)) throw new Error('invalid_ledger_page');
        setResult(next);
        const lastPage = Math.max(1, Math.ceil(next.total / PAGE_SIZE));
        if (page > lastPage) setPage(lastPage);
      }).catch(() => {
        if (active) setError(true);
      }).finally(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [types, page, sort, retry]);
    const counts = new Map(result.type_counts.map(item => [item.value, item.count]));
    const options = [...new Set([...Core.types, ...counts.keys()])].map(value => ({
      value,
      label: Core.typeLabel(value, lang),
      count: counts.get(value) || 0
    }));
    const columns = [{
      key: 'type',
      header: cp('类型', 'Type'),
      sortable: false,
      render: row => Core.typeLabel(row.type, lang),
      filter: {
        multiple: true,
        value: types,
        options,
        allCount: result.type_counts.reduce((total, item) => total + item.count, 0),
        label: cp('筛选流水类型', 'Filter transaction types'),
        onChange: next => {
          setPage(1);
          setTypes(next);
        }
      }
    }, {
      key: 'book_title',
      header: cp('书籍', 'Book'),
      priority: 'primary',
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("span", {
        className: "personal-ledger-book",
        title: row.book_title || undefined
      }, row.book_title || '—')
    }, {
      key: 'billing_multiplier',
      header: cp('倍率', 'Multiplier'),
      numeric: true,
      sortable: false,
      description: cp('记录当时实际计费的倍率；不适用、混合费率或无可靠记录时显示 —。', 'The multiplier charged at the time. — means not applicable, mixed rates, or no reliable record.'),
      render: row => Number.isInteger(row.billing_multiplier) && row.billing_multiplier > 0 ? `${row.billing_multiplier}×` : '—'
    }, {
      key: 'operation_amount',
      header: cp('操作金额', 'Operation amount'),
      numeric: true,
      sortable: false,
      render: row => Core.operationAmount(row, lang)
    }, {
      key: 'available_change_millis',
      header: cp('可用变化', 'Available change'),
      numeric: true,
      sortable: false,
      description: cp('相邻账户流水记录之间的可用余额变化；历史记录不足或顺序无法确定时显示 —。释放冻结与实际消费分别记录。', 'Available balance difference between adjacent account ledger records. — means insufficient or ambiguous history. Holds and spending are recorded separately.'),
      render: row => Number.isSafeInteger(row.available_change_millis) ? /*#__PURE__*/React.createElement("strong", {
        className: row.available_change_millis > 0 ? 'personal-ledger-positive' : ''
      }, row.available_change_millis > 0 ? '+' : '', credits(row.available_change_millis)) : '—'
    }, {
      key: 'available_after_millis',
      header: cp('可用余额', 'Available balance'),
      numeric: true,
      sortable: false,
      render: row => Number.isSafeInteger(row.available_after_millis) ? credits(row.available_after_millis) : '—'
    }, {
      key: 'balance_after_millis',
      header: cp('总余额', 'Total balance'),
      numeric: true,
      priority: 'optional',
      render: row => credits(row.balance_after_millis)
    }, {
      key: 'reserved_after_millis',
      header: cp('冻结余额', 'Held balance'),
      numeric: true,
      sortable: false,
      priority: 'optional',
      render: row => credits(row.reserved_after_millis)
    }, {
      key: 'reason',
      header: cp('说明', 'Note'),
      sortable: false,
      cellClassName: 'personal-ledger-reason',
      render: row => Core.reason(row, lang)
    }, {
      key: 'created_at',
      header: cp('时间', 'Time'),
      defaultDirection: 'desc',
      render: row => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(row.created_at))
    }];
    return /*#__PURE__*/React.createElement(React.Fragment, null, error ? /*#__PURE__*/React.createElement("div", {
      className: "personal-ledger-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, cp('笔力流水读取失败，请重试。', 'Could not load credit transactions. Please try again.')), /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      type: "button",
      onClick: () => setRetry(value => value + 1)
    }, cp('重试', 'Retry'))) : null, /*#__PURE__*/React.createElement(DataTable, {
      rows: error ? [] : result.items,
      columns: columns,
      rowKey: "id",
      ariaLabel: cp('笔力流水', 'Credit ledger'),
      className: "personal-ledger-table",
      compact: true,
      loading: loading,
      serverSort: true,
      controlledSort: sort,
      onSortChange: next => {
        setPage(1);
        setSort(next || {
          key: 'created_at',
          direction: 'desc'
        });
      },
      pagination: {
        total: error ? 0 : result.total,
        page,
        pages: Math.max(1, Math.ceil(result.total / PAGE_SIZE)),
        pageSize: PAGE_SIZE,
        onPageChange: setPage
      },
      empty: error ? cp('暂时无法显示流水', 'Transactions unavailable') : cp('没有符合所选类型的流水', 'No transactions match the selected types')
    }));
  }
  window.PersonalCreditLedger = PersonalCreditLedger;
})();
}
