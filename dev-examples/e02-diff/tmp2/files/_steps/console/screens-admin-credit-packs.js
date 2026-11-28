{
(function () {
  const {
    useCallback,
    useEffect,
    useRef,
    useState
  } = React;
  const Core = window.AdminCreditPacksCore,
    DataTable = window.AdminDataTable,
    Dialog = window.ConfirmDialog;
  const Form = window.AdminCreditPackForm,
    Access = window.AdminCreditPackAccess;
  function CreditPacksTab({
    lang,
    toast
  }) {
    const t = (zh, en) => lang === 'en' ? en : zh;
    const [rows, setRows] = useState([]),
      [loading, setLoading] = useState(true),
      [error, setError] = useState('');
    const [editor, setEditor] = useState(null),
      [access, setAccess] = useState(null),
      [target, setTarget] = useState(null);
    const [saving, setSaving] = useState(false),
      [saveError, setSaveError] = useState(''),
      [notice, setNotice] = useState('');
    const requestRef = useRef(null),
      alive = useRef(true),
      savingRef = useRef(false);
    const load = useCallback(async () => {
      if (requestRef.current) requestRef.current.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setLoading(true);
      setError('');
      try {
        const result = await window.LF_API.adminCreditPacks({
          signal: controller.signal
        });
        if (!alive.current || controller.signal.aborted) return;
        if (!Array.isArray(result)) throw new Error(t('加量包响应无效，请重试。', 'The credit pack response is invalid. Please retry.'));
        setRows(result);
      } catch (failure) {
        if (alive.current && !controller.signal.aborted) setError(failure.message || t('加量包加载失败。', 'Could not load credit packs.'));
      } finally {
        if (alive.current && !controller.signal.aborted) setLoading(false);
        if (requestRef.current === controller) requestRef.current = null;
      }
    }, [lang]);
    useEffect(() => {
      alive.current = true;
      load();
      return () => {
        alive.current = false;
        if (requestRef.current) requestRef.current.abort();
      };
    }, [load]);
    const saved = result => {
      if (!alive.current) return;
      if (requestRef.current) requestRef.current.abort();
      if (result && result.code) setRows(current => current.some(row => row.code === result.code) ? current.map(row => row.code === result.code ? result : row) : current.concat(result));
      setEditor(null);
      const message = t('加量包已保存', 'Credit pack saved');
      setNotice('saved');
      if (toast) toast(message);
      load();
    };
    const toggle = async () => {
      if (!target || savingRef.current) return;
      const result = Core.validate({
        ...Core.draft(target),
        active: !target.active
      }, [], target.code);
      if (!result.payload) {
        setSaveError(t('当前配置无效，请先编辑并保存加量包。', 'The current settings are invalid. Edit and save this pack first.'));
        return;
      }
      savingRef.current = true;
      setSaving(true);
      setSaveError('');
      try {
        const updated = await window.LF_API.adminUpsertCreditPack(target.code, result.payload);
        if (!alive.current) return;
        setTarget(null);
        saved(updated);
      } catch (failure) {
        if (alive.current) setSaveError(!failure.status || failure.status >= 500 ? t('操作结果未确认，请刷新商品核对后重试。', 'The result was not confirmed. Refresh the products before retrying.') : failure.message || t('操作失败，请重试。', 'Could not update this pack. Please retry.'));
      } finally {
        savingRef.current = false;
        if (alive.current) setSaving(false);
      }
    };
    const eligibility = row => /*#__PURE__*/React.createElement("div", {
      className: "adm-packs-cell"
    }, /*#__PURE__*/React.createElement("span", null, row.eligibility_type === 'allowlist' ? t('指定用户授权', 'Selected users') : row.eligibility_type === 'lifetime_spend' ? t('累计实付 ≥ ', 'Lifetime paid ≥ ') + Core.money(row.min_paid_cents, lang) : t('公开购买', 'Public purchase')), /*#__PURE__*/React.createElement("small", null, row.requires_subscription ? t('有效付费会员', 'Active paid members') : t('无需订阅', 'No membership required')));
    const columns = [{
      key: 'name',
      header: t('加量包', 'Credit pack'),
      priority: 'primary',
      sortValue: row => row.name,
      render: row => /*#__PURE__*/React.createElement("div", {
        className: "adm-packs-cell"
      }, /*#__PURE__*/React.createElement("strong", null, row.name), row.badge ? /*#__PURE__*/React.createElement("small", null, row.badge) : null)
    }, {
      key: 'price',
      header: t('售价', 'Price'),
      numeric: true,
      sortValue: row => row.price_cents,
      render: row => Core.money(row.price_cents, lang)
    }, {
      key: 'credits',
      header: t('到账笔力', 'Total credits'),
      numeric: true,
      sortValue: row => row.credit_millis + row.bonus_millis,
      render: row => /*#__PURE__*/React.createElement("div", {
        className: "adm-packs-cell"
      }, /*#__PURE__*/React.createElement("span", null, Core.credits(row.credit_millis + row.bonus_millis, lang)), row.bonus_millis > 0 ? /*#__PURE__*/React.createElement("small", null, t('含赠送 ', 'Includes bonus '), Core.credits(row.bonus_millis, lang)) : null)
    }, {
      key: 'eligibility',
      header: t('购买资格', 'Eligibility'),
      sortValue: row => row.eligibility_type,
      render: eligibility
    }, {
      key: 'discounts',
      header: t('优惠规则', 'Discount rules'),
      sortable: false,
      render: row => row.eligibility_type === 'allowlist' ? t('固定价', 'Fixed price') : [row.allow_activity_discount ? t('活动折扣', 'Campaign discounts') : null, row.allow_coupons ? t('优惠券', 'Coupons') : null].filter(Boolean).join(' · ') || t('无折扣', 'No discounts')
    }, {
      key: 'limit',
      header: t('每用户限购', 'Purchases per user'),
      sortValue: row => row.per_user_limit,
      render: row => row.per_user_limit == null ? t('不限', 'Unlimited') : t(row.per_user_limit + ' 次', String(row.per_user_limit))
    }, {
      key: 'status',
      header: t('销售状态', 'Sale status'),
      sortValue: row => row.active ? 1 : 0,
      render: row => row.active ? t('上架中', 'On sale') : t('已下架', 'Off sale')
    }, {
      key: 'sort_order',
      header: t('排序', 'Order'),
      numeric: true,
      priority: 'optional',
      sortValue: row => row.sort_order,
      render: row => row.sort_order
    }, {
      key: 'actions',
      header: t('操作', 'Actions'),
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("div", {
        className: "adm-packs-actions"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        disabled: loading || saving,
        "aria-label": t('编辑 ', 'Edit ') + row.name,
        onClick: () => setEditor({
          row
        })
      }, t('编辑', 'Edit')), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        disabled: loading || saving,
        "aria-label": (row.active ? t('下架 ', 'Take off sale ') : t('上架 ', 'Put on sale ')) + row.name,
        onClick: () => {
          setTarget(row);
          setSaveError('');
        }
      }, row.active ? t('下架', 'Take off sale') : t('上架', 'Put on sale')), row.eligibility_type === 'allowlist' ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        disabled: loading || saving,
        "data-pack-access": row.code,
        "aria-label": t('管理 ', 'Manage ') + row.name + t(' 购买名单', ' purchase access'),
        onClick: () => setAccess(row)
      }, t('购买名单', 'Purchase access')) : null)
    }];
    if (access) return /*#__PURE__*/React.createElement(Access, {
      key: access.code,
      pack: access,
      lang: lang,
      toast: toast,
      onClose: () => {
        setAccess(null);
        setTimeout(() => {
          const button = Array.from(document.querySelectorAll('[data-pack-access]')).find(element => element.dataset.packAccess === access.code);
          if (button) button.focus();
        }, 0);
      }
    });
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-packs-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-packs-heading"
    }, /*#__PURE__*/React.createElement("h1", null, t('加量包管理', 'Credit pack management')), /*#__PURE__*/React.createElement("div", {
      className: "adm-packs-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: loading || saving,
      onClick: load
    }, t('刷新', 'Refresh')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      disabled: loading || !!error || saving,
      onClick: () => setEditor({
        row: null
      })
    }, t('新增加量包', 'New credit pack')))), notice ? /*#__PURE__*/React.createElement("p", {
      className: "adm-packs-notice",
      role: "status"
    }, t('加量包已保存', 'Credit pack saved')) : null, error ? /*#__PURE__*/React.createElement("div", {
      role: "alert",
      className: "adm-packs-error"
    }, error, " ", /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: loading,
      onClick: load
    }, t('重试', 'Retry'))) : null, /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-packs-list",
      "aria-busy": loading
    }, /*#__PURE__*/React.createElement(DataTable, {
      rows: rows,
      columns: columns,
      rowKey: "code",
      pageSize: 20,
      initialSort: {
        key: 'sort_order',
        direction: 'asc'
      },
      loading: loading && !rows.length,
      search: {
        placeholder: t('搜索加量包', 'Search credit packs'),
        getText: row => [row.name, row.badge, row.code]
      },
      ariaLabel: t('全部加量包', 'All credit packs'),
      empty: error ? t('加量包未能加载', 'Credit packs could not be loaded') : t('暂无加量包', 'No credit packs yet')
    })), editor ? /*#__PURE__*/React.createElement(Form, {
      key: editor.row ? editor.row.code : 'new',
      row: editor.row,
      codes: rows.map(row => row.code),
      lang: lang,
      onClose: () => setEditor(null),
      onSaved: saved
    }) : null, /*#__PURE__*/React.createElement(Dialog, {
      open: !!target,
      title: target ? (target.active ? t('下架「', 'Take “') : t('上架「', 'Put “')) + target.name + (lang === 'en' ? target.active ? '” off sale' : '” on sale' : '」') : '',
      icon: null,
      tone: target && target.active ? 'danger' : 'default',
      cancelLabel: t('取消', 'Cancel'),
      message: target && target.active ? t('下架后暂停新的购买。', 'New purchases will be paused.') : t('上架后符合资格的用户可以购买。', 'Eligible users will be able to buy this pack.'),
      confirmLabel: saving ? t('处理中…', 'Updating…') : target && target.active ? t('确认下架', 'Take off sale') : t('确认上架', 'Put on sale'),
      confirmDisabled: saving,
      onClose: () => {
        if (!savingRef.current) setTarget(null);
      },
      onConfirm: toggle
    }, saveError ? /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-packs-error"
    }, saveError) : null));
  }
  window.AdminCreditPacksTab = CreditPacksTab;
})();
}
