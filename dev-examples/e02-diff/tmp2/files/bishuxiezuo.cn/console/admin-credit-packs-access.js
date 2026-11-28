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
  const PAGE_SIZE = 20;
  function CreditPackAccess({
    pack,
    lang,
    onClose,
    toast
  }) {
    const t = (zh, en) => lang === 'en' ? en : zh;
    const [rows, setRows] = useState([]),
      [loading, setLoading] = useState(true),
      [error, setError] = useState('');
    const [query, setQuery] = useState(''),
      [searchedQuery, setSearchedQuery] = useState('');
    const [users, setUsers] = useState(null),
      [searching, setSearching] = useState(false),
      [searchError, setSearchError] = useState('');
    const [action, setAction] = useState(null),
      [reason, setReason] = useState(''),
      [reasonError, setReasonError] = useState(false);
    const [saving, setSaving] = useState(false),
      [saveError, setSaveError] = useState(''),
      [notice, setNotice] = useState('');
    const alive = useRef(true),
      listRequest = useRef(null),
      searchRequest = useRef(null),
      savingRef = useRef(false);
    const reasonRef = useRef(null),
      formRef = useRef(null),
      searchRef = useRef(null);
    const load = useCallback(async () => {
      if (listRequest.current) listRequest.current.abort();
      const controller = new AbortController();
      listRequest.current = controller;
      setLoading(true);
      setError('');
      try {
        const result = await window.LF_API.adminCreditPackAccess(pack.code, {
          signal: controller.signal
        });
        if (!alive.current || controller.signal.aborted) return;
        if (!Array.isArray(result)) throw new Error(t('购买名单响应无效，请重试。', 'The access list response is invalid. Please retry.'));
        setRows(result);
      } catch (failure) {
        if (alive.current && !controller.signal.aborted) setError(failure.message || t('名单加载失败。', 'Could not load the access list.'));
      } finally {
        if (alive.current && !controller.signal.aborted) setLoading(false);
        if (listRequest.current === controller) listRequest.current = null;
      }
    }, [pack.code, lang]);
    useEffect(() => {
      alive.current = true;
      setSearching(false);
      load();
      if (searchRef.current) searchRef.current.focus();
      return () => {
        alive.current = false;
        if (listRequest.current) listRequest.current.abort();
        if (searchRequest.current) searchRequest.current.abort();
      };
    }, [load]);
    const search = async (text, page = 1) => {
      if (savingRef.current) return;
      if (searchRequest.current) searchRequest.current.abort();
      setSearchError('');
      const q = text.trim();
      if (!q) {
        setUsers(null);
        setSearching(false);
        setSearchedQuery('');
        return;
      }
      const controller = new AbortController();
      searchRequest.current = controller;
      setSearching(true);
      setUsers(null);
      setSearchedQuery(q);
      try {
        const result = await window.LF_API.adminUsers({
          q,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE
        }, {
          signal: controller.signal
        });
        if (!alive.current || controller.signal.aborted) return;
        if (!result || !Array.isArray(result.items) || !Number.isInteger(result.total)) throw new Error(t('用户搜索响应无效，请重试。', 'The user search response is invalid. Please retry.'));
        setUsers({
          ...result,
          page
        });
      } catch (failure) {
        if (alive.current && !controller.signal.aborted) setSearchError(failure.message || t('搜索失败，请重试。', 'Search failed. Please retry.'));
      } finally {
        if (alive.current && !controller.signal.aborted) setSearching(false);
        if (searchRequest.current === controller) searchRequest.current = null;
      }
    };
    const choose = (kind, user) => {
      if (savingRef.current) return;
      setAction({
        kind,
        user
      });
      setReason('');
      setReasonError(false);
      setSaveError('');
    };
    const submit = async event => {
      event.preventDefault();
      if (!action || savingRef.current) return;
      const note = Core.reason(reason);
      setReasonError(!note);
      if (!note) {
        reasonRef.current.focus();
        return;
      }
      savingRef.current = true;
      setSaving(true);
      setSaveError('');
      setNotice('');
      try {
        const userId = action.user.user_id || action.user.id;
        if (action.kind === 'grant') await window.LF_API.adminGrantCreditPackAccess(pack.code, userId, note);else await window.LF_API.adminRevokeCreditPackAccess(pack.code, userId, note);
        if (!alive.current) return;
        if (listRequest.current) listRequest.current.abort();
        setAction(null);
        const message = action.kind === 'grant' ? t('购买资格已授权', 'Purchase access granted') : t('购买资格已撤销', 'Purchase access revoked');
        setNotice(action.kind);
        if (toast) toast(message);
        await load();
      } catch (failure) {
        if (alive.current) setSaveError(!failure.status || failure.status >= 500 ? t('操作结果未确认。请刷新本包名单核对后重试。', 'The result was not confirmed. Refresh this pack’s access list before retrying.') : failure.message || t('操作失败，请重试。', 'Could not update access. Please retry.'));
      } finally {
        savingRef.current = false;
        if (alive.current) setSaving(false);
      }
    };
    const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(lang === 'en' ? 'en-GB' : 'zh-CN') : '—';
    const authorized = userId => rows.some(row => row.user_id === userId);
    const listColumns = [{
      key: 'email',
      header: t('用户', 'User'),
      priority: 'primary',
      sortValue: row => row.email,
      render: row => /*#__PURE__*/React.createElement("span", {
        className: "adm-packs-wrap"
      }, row.email)
    }, {
      key: 'created_at',
      header: t('授权时间', 'Granted at'),
      sortValue: row => row.created_at,
      render: row => date(row.created_at)
    }, {
      key: 'reason',
      header: t('授权原因', 'Grant reason'),
      sortValue: row => row.reason,
      render: row => /*#__PURE__*/React.createElement("span", {
        className: "adm-packs-wrap"
      }, row.reason || '—')
    }, {
      key: 'actions',
      header: t('操作', 'Actions'),
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        disabled: saving || loading,
        "aria-label": t('撤销 ', 'Revoke ') + row.email,
        onClick: () => choose('revoke', row)
      }, t('撤销授权', 'Revoke access'))
    }];
    const userColumns = [{
      key: 'email',
      header: t('用户', 'User'),
      priority: 'primary',
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("div", {
        className: "adm-packs-cell"
      }, /*#__PURE__*/React.createElement("strong", null, row.email), row.display_name ? /*#__PURE__*/React.createElement("small", null, row.display_name) : null)
    }, {
      key: 'state',
      header: t('账号状态', 'Account status'),
      sortable: false,
      render: row => row.is_active === false ? t('已停用', 'Disabled') : t('正常', 'Active')
    }, {
      key: 'actions',
      header: t('操作', 'Actions'),
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        disabled: saving || loading || !!error || authorized(row.id),
        "aria-label": t('授权 ', 'Grant access to ') + row.email,
        onClick: () => choose('grant', row)
      }, authorized(row.id) ? t('已授权', 'Already granted') : t('选择授权', 'Grant access'))
    }];
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-packs-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-packs-heading"
    }, /*#__PURE__*/React.createElement("h1", null, pack.name, " \xB7 ", t('购买名单', 'Purchase access')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: saving,
      onClick: onClose
    }, t('返回加量包', 'Back to credit packs'))), /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-packs-search",
      "aria-label": t('添加购买资格', 'Grant purchase access')
    }, /*#__PURE__*/React.createElement("form", {
      onSubmit: event => {
        event.preventDefault();
        search(query);
      },
      className: "adm-packs-search-form"
    }, /*#__PURE__*/React.createElement("label", {
      className: "adm-packs-field",
      htmlFor: "pack-access-search"
    }, /*#__PURE__*/React.createElement("span", null, t('搜索用户', 'Search users')), /*#__PURE__*/React.createElement("input", {
      id: "pack-access-search",
      ref: searchRef,
      type: "search",
      value: query,
      disabled: saving,
      placeholder: t('邮箱或显示名', 'Email or display name'),
      onChange: event => setQuery(event.target.value)
    })), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn",
      disabled: saving || !query.trim()
    }, searching ? t('搜索中…', 'Searching…') : t('搜索', 'Search'))), searchError ? /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-packs-error"
    }, searchError, " ", /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: saving || searching,
      onClick: () => search(searchedQuery)
    }, t('重试搜索', 'Retry search'))) : null, searching ? /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, t('正在搜索用户…', 'Searching users…')) : null, users ? /*#__PURE__*/React.createElement(DataTable, {
      rows: users.items,
      columns: userColumns,
      rowKey: "id",
      compact: true,
      ariaLabel: t('用户搜索结果', 'User search results'),
      empty: t('未找到用户', 'No users found'),
      pagination: {
        page: users.page,
        pageSize: PAGE_SIZE,
        total: users.total,
        pages: Math.max(1, Math.ceil(users.total / PAGE_SIZE)),
        onPageChange: page => search(searchedQuery, page)
      }
    }) : null), /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-packs-list",
      "aria-busy": loading
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-packs-subheading"
    }, /*#__PURE__*/React.createElement("h2", null, t('已授权用户', 'Granted users')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: loading || saving,
      onClick: load
    }, t('刷新名单', 'Refresh access list'))), notice ? /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "adm-packs-notice"
    }, notice === 'grant' ? t('购买资格已授权', 'Purchase access granted') : t('购买资格已撤销', 'Purchase access revoked')) : null, error ? /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-packs-error"
    }, error, " ", /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: loading || saving,
      onClick: load
    }, t('重试名单', 'Retry access list'))) : null, /*#__PURE__*/React.createElement(DataTable, {
      rows: rows,
      columns: listColumns,
      rowKey: "user_id",
      pageSize: 20,
      loading: loading && !rows.length,
      ariaLabel: t('本包购买名单', 'This pack’s purchase access list'),
      empty: error ? t('名单未能加载', 'Access list could not be loaded') : t('暂无已授权用户', 'No users have access yet')
    })), /*#__PURE__*/React.createElement(Dialog, {
      open: !!action,
      title: action && action.kind === 'revoke' ? t('撤销购买资格', 'Revoke purchase access') : t('授权购买资格', 'Grant purchase access'),
      tone: action && action.kind === 'revoke' ? 'danger' : 'default',
      icon: null,
      initialFocusRef: reasonRef,
      onClose: () => {
        if (!savingRef.current) setAction(null);
      },
      cancelLabel: t('取消', 'Cancel'),
      confirmLabel: saving ? t('处理中…', 'Updating…') : action && action.kind === 'revoke' ? t('确认撤销', 'Revoke access') : t('确认授权', 'Grant access'),
      confirmDisabled: saving,
      onConfirm: () => formRef.current.requestSubmit()
    }, action ? /*#__PURE__*/React.createElement("form", {
      ref: formRef,
      noValidate: true,
      onSubmit: submit
    }, /*#__PURE__*/React.createElement("p", {
      className: "adm-packs-wrap"
    }, action.kind === 'revoke' ? t(action.user.email + ' 将无法再购买「' + pack.name + '」。', action.user.email + ' will no longer be able to buy “' + pack.name + '”.') : t(action.user.email + ' 将获得「' + pack.name + '」的购买资格，仍按本包限购规则结算。', action.user.email + ' will be able to buy “' + pack.name + '”, subject to this pack’s purchase limit.')), /*#__PURE__*/React.createElement("label", {
      className: "adm-packs-field",
      htmlFor: "pack-access-reason"
    }, /*#__PURE__*/React.createElement("span", null, action.kind === 'revoke' ? t('撤销原因', 'Revocation reason') : t('授权原因', 'Grant reason')), /*#__PURE__*/React.createElement("input", {
      id: "pack-access-reason",
      ref: reasonRef,
      value: reason,
      maxLength: 255,
      disabled: saving,
      "aria-invalid": reasonError || undefined,
      "aria-describedby": reasonError ? 'pack-access-reason-error' : undefined,
      onChange: event => {
        setReason(event.target.value);
        setReasonError(false);
        setSaveError('');
      }
    }), reasonError ? /*#__PURE__*/React.createElement("small", {
      role: "alert",
      id: "pack-access-reason-error",
      className: "adm-packs-error"
    }, t('请输入原因，最多 255 字符。', 'Enter a reason of up to 255 characters.')) : null), saveError ? /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-packs-error"
    }, saveError) : null, /*#__PURE__*/React.createElement("button", {
      type: "submit",
      hidden: true,
      tabIndex: "-1",
      disabled: saving
    })) : null));
  }
  window.AdminCreditPackAccess = CreditPackAccess;
})();
}
