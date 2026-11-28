{
(function () {
  const {
    useCallback,
    useEffect,
    useRef,
    useState
  } = React;
  const Core = window.AdminCouponsCore,
    DataTable = window.AdminDataTable;
  const Dialog = window.ConfirmDialog,
    Form = window.AdminCouponForm;
  const PAGE_SIZE = 200;
  function AdminCouponsTab({
    lang,
    toast
  }) {
    const t = (zh, en) => lang === 'en' ? en : zh;
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true),
      [error, setError] = useState('');
    const [hasMore, setHasMore] = useState(false),
      [offset, setOffset] = useState(0);
    const [catalog, setCatalog] = useState(null),
      [catalogError, setCatalogError] = useState(false);
    const [creating, setCreating] = useState(false),
      [created, setCreated] = useState(null);
    const [copyError, setCopyError] = useState('');
    const [target, setTarget] = useState(null),
      [stopping, setStopping] = useState(false),
      [stopError, setStopError] = useState('');
    const [now, setNow] = useState(Date.now);
    const requestRef = useRef(0),
      alive = useRef(true),
      stoppingRef = useRef(false),
      codeRef = useRef(null);
    const load = useCallback(async (nextOffset = 0) => {
      const request = ++requestRef.current;
      setLoading(true);
      setError('');
      try {
        const result = await window.LF_API.adminCouponCampaigns(PAGE_SIZE, nextOffset);
        if (!alive.current || request !== requestRef.current) return;
        if (!Array.isArray(result)) throw new Error('Invalid campaign response');
        setRows(current => nextOffset ? [...new Map(current.concat(result).map(row => [row.id, row])).values()] : result);
        setOffset(nextOffset + result.length);
        setHasMore(result.length === PAGE_SIZE && nextOffset + result.length <= 10000);
      } catch (failure) {
        if (alive.current && request === requestRef.current) setError(failure.message);
      } finally {
        if (alive.current && request === requestRef.current) setLoading(false);
      }
    }, []);
    const loadCatalog = useCallback(async () => {
      setCatalogError(false);
      try {
        const value = await window.LF_API.billingCatalog();
        if (alive.current) setCatalog(value);
      } catch (_) {
        if (alive.current) setCatalogError(true);
      }
    }, []);
    useEffect(() => {
      alive.current = true;
      load();
      loadCatalog();
      const timer = setInterval(() => setNow(Date.now()), 30000);
      return () => {
        alive.current = false;
        requestRef.current++;
        clearInterval(timer);
      };
    }, [load, loadCatalog]);
    const products = Core.productOptions(catalog);
    const scopeNames = {
      all: t('全场', 'All products'),
      subscription: t('全部订阅', 'All subscriptions'),
      subscription_monthly: t('月付订阅', 'Monthly subscriptions'),
      subscription_yearly: t('年付订阅', 'Annual subscriptions'),
      credit_pack: t('笔力加量包', 'Credit packs')
    };
    const scopeText = row => (row.applicable_task_types || []).length ? row.applicable_task_types.map(tag => scopeNames[tag] || (products.find(item => item.value === tag) || {}).name || tag).join('、') : scopeNames.all;
    const statusNames = {
      active: t('领取中', 'Open'),
      inactive: t('已停用', 'Inactive'),
      scheduled: t('未开始', 'Scheduled'),
      expired: t('已过期', 'Expired'),
      closed: t('领取已截止', 'Claims closed'),
      exhausted: t('已领完', 'Fully claimed')
    };
    const date = value => value ? new Date(value).toLocaleString(lang === 'en' ? 'en-GB' : 'zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }) : t('不限', 'No deadline');
    const stop = async () => {
      if (!target || stoppingRef.current) return;
      stoppingRef.current = true;
      setStopping(true);
      setStopError('');
      try {
        const result = await window.LF_API.adminDeactivateCouponCampaign(target.id);
        if (!alive.current) return;
        // An older list response must not restore the just-deactivated row.
        requestRef.current++;
        setLoading(false);
        setRows(current => current.map(row => row.id === result.id ? result : row));
        setTarget(null);
        if (toast) toast(t('优惠券活动已停用', 'Campaign deactivated'));
      } catch (failure) {
        if (alive.current) setStopError(failure.message || t('停用失败，请重试。', 'Could not deactivate. Please retry.'));
      } finally {
        stoppingRef.current = false;
        if (alive.current) setStopping(false);
      }
    };
    const copy = async () => {
      setCopyError('');
      try {
        await navigator.clipboard.writeText(created.claim_code);
        if (alive.current && toast) toast(t('领券码已复制', 'Claim code copied'));
      } catch (_) {
        if (codeRef.current) {
          codeRef.current.focus();
          codeRef.current.select();
        }
        if (alive.current) setCopyError(t('复制失败，请手动复制选中的领券码。', 'Copy failed. Copy the selected code manually.'));
      }
    };
    const columns = [{
      key: 'name',
      header: t('活动', 'Campaign'),
      priority: 'primary',
      sortValue: row => row.name,
      render: row => /*#__PURE__*/React.createElement("div", {
        className: "adm-coupons-cell"
      }, /*#__PURE__*/React.createElement("strong", null, row.name), /*#__PURE__*/React.createElement("code", null, row.claim_code_prefix), row.description ? /*#__PURE__*/React.createElement("small", null, row.description) : null)
    }, {
      key: 'discount',
      header: t('优惠', 'Discount'),
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("div", {
        className: "adm-coupons-cell"
      }, /*#__PURE__*/React.createElement("strong", null, row.discount_type === 'fixed' ? t('减 ', 'Save ') : '', Core.discountText(row, lang)), /*#__PURE__*/React.createElement("small", null, row.min_spend_millis ? t('满 ¥', 'Minimum ¥') + (row.min_spend_millis / 5000).toLocaleString() : t('无门槛', 'No minimum')), /*#__PURE__*/React.createElement("small", null, scopeText(row)))
    }, {
      key: 'claims',
      header: t('领取', 'Claims'),
      numeric: true,
      sortValue: row => row.claim_count,
      render: row => /*#__PURE__*/React.createElement("div", {
        className: "adm-coupons-cell"
      }, /*#__PURE__*/React.createElement("span", null, row.claim_count, " / ", row.max_claims == null ? t('不限', 'Unlimited') : row.max_claims), /*#__PURE__*/React.createElement("small", null, t('每人 ', 'Per person: '), row.per_user_claim_limit))
    }, {
      key: 'validity',
      header: t('有效期', 'Validity'),
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("div", {
        className: "adm-coupons-cell"
      }, /*#__PURE__*/React.createElement("small", null, t('开始：', 'Starts: '), row.starts_at ? date(row.starts_at) : t('创建后', 'On creation')), /*#__PURE__*/React.createElement("small", null, t('领券截止：', 'Claim until: '), date(row.claim_expires_at)), /*#__PURE__*/React.createElement("small", null, t('用券截止：', 'Use until: '), date(row.coupon_expires_at)))
    }, {
      key: 'status',
      header: t('状态', 'Status'),
      sortValue: row => Core.campaignStatus(row, now),
      render: row => statusNames[Core.campaignStatus(row, now)]
    }, {
      key: 'actions',
      header: t('操作', 'Actions'),
      sortable: false,
      render: row => row.active ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        "aria-label": t('停用 ', 'Deactivate ') + row.name,
        disabled: stopping,
        onClick: () => {
          setTarget(row);
          setStopError('');
        }
      }, t('停用', 'Deactivate')) : '—'
    }];
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-coupons-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-coupons-heading"
    }, /*#__PURE__*/React.createElement("h1", null, t('优惠券', 'Coupons')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: loading || stopping,
      onClick: () => load()
    }, t('刷新', 'Refresh')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      disabled: !!created,
      onClick: () => setCreating(true)
    }, t('新建优惠券', 'New campaign')))), created ? /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-coupons-created",
      "aria-label": t('优惠券创建成功', 'Campaign created')
    }, /*#__PURE__*/React.createElement("strong", null, created.name, " \xB7 ", t('创建成功', 'Created')), /*#__PURE__*/React.createElement("label", {
      htmlFor: "coupon-created-code"
    }, t('完整领券码仅本次显示，请保存后关闭。', 'The full code is shown only now. Save it before closing.')), /*#__PURE__*/React.createElement("div", {
      className: "adm-coupons-code"
    }, /*#__PURE__*/React.createElement("input", {
      ref: codeRef,
      id: "coupon-created-code",
      readOnly: true,
      value: created.claim_code,
      onFocus: event => event.target.select()
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      onClick: copy
    }, t('复制领券码', 'Copy code')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      onClick: () => {
        setCreated(null);
        setCopyError('');
      }
    }, t('已保存，关闭', 'Saved, close'))), copyError ? /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-coupons-error"
    }, copyError) : null) : null, error ? /*#__PURE__*/React.createElement("div", {
      role: "alert",
      className: "adm-coupons-error"
    }, error, " ", /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: loading,
      onClick: () => load()
    }, t('重试', 'Retry'))) : null, /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-coupons-list",
      "aria-busy": loading
    }, loading && !rows.length ? /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, t('正在加载优惠券…', 'Loading campaigns…')) : /*#__PURE__*/React.createElement(DataTable, {
      rows: rows,
      columns: columns,
      rowKey: "id",
      pageSize: 20,
      search: {
        placeholder: t('搜索已加载活动', 'Search loaded campaigns')
      },
      ariaLabel: t('优惠券活动', 'Coupon campaigns'),
      empty: error ? t('优惠券未能加载', 'Campaigns could not be loaded') : t('暂无优惠券活动', 'No campaigns yet')
    }), hasMore ? /*#__PURE__*/React.createElement("footer", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: loading || stopping,
      onClick: () => load(offset)
    }, loading ? t('加载中…', 'Loading…') : t('加载更多活动', 'Load more campaigns'))) : null), /*#__PURE__*/React.createElement(Form, {
      open: creating,
      lang: lang,
      products: products,
      catalogError: catalogError,
      onCatalogRetry: loadCatalog,
      onClose: () => setCreating(false),
      onCreated: result => {
        if (!alive.current) return;
        setCreating(false);
        setCreated(result);
        load();
      }
    }), /*#__PURE__*/React.createElement(Dialog, {
      open: !!target,
      title: t('停用优惠券活动', 'Deactivate campaign'),
      tone: "danger",
      message: target ? t('停用“', 'Deactivate “') + target.name + t('”后，不能继续领取，已领取的券也无法再使用。此操作没有恢复入口。', '”? Claiming will stop and already claimed coupons will no longer work. This cannot be undone here.') : '',
      cancelLabel: t('取消', 'Cancel'),
      confirmLabel: stopping ? t('停用中…', 'Deactivating…') : t('确认停用', 'Deactivate'),
      confirmDisabled: stopping,
      onClose: () => {
        if (!stoppingRef.current) setTarget(null);
      },
      onConfirm: stop
    }, stopError ? /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-coupons-error"
    }, stopError) : null));
  }
  window.AdminCouponsTab = AdminCouponsTab;
})();
}
