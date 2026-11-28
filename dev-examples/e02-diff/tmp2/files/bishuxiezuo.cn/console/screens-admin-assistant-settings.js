{
(function () {
  const {
    useCallback,
    useEffect,
    useRef,
    useState
  } = React;
  const DataTable = window.AdminDataTable;
  const PAGE_SIZE = 25;
  function multiplier(value) {
    const text = String(value == null ? '' : value).trim();
    if (!/^\d+(?:\.\d{1,4})?$/.test(text)) return null;
    const amount = Number(text);
    if (amount < 1 || amount > 100) return null;
    return text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '').replace(/^0+(?=\d)/, '');
  }
  function userId(user) {
    return String(user && (user.user_id || user.id) || '');
  }
  function userName(user) {
    return user && (user.email || user.display_name) || userId(user);
  }
  function validRevision(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }
  function validPage(value) {
    return value && Array.isArray(value.items) && Number.isSafeInteger(value.total) && value.total >= 0;
  }
  function validUser(value, id) {
    return value && value.user_id === id && validRevision(value.revision) && multiplier(value.effective_multiplier) && (value.cost_multiplier === null || multiplier(value.cost_multiplier));
  }
  function AdminAssistantPricingPanel({
    toast
  }) {
    const t = (zh, en) => window.CLANG === 'en' ? en : zh;
    const [saved, setSaved] = useState(null),
      [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true),
      [saving, setSaving] = useState(false);
    const [error, setError] = useState(''),
      [conflict, setConflict] = useState(false);
    const [list, setList] = useState(null),
      [page, setPage] = useState(1);
    const [listLoading, setListLoading] = useState(true),
      [listError, setListError] = useState('');
    const [query, setQuery] = useState(''),
      [search, setSearch] = useState(null);
    const [searching, setSearching] = useState(false),
      [searchError, setSearchError] = useState('');
    const [target, setTarget] = useState(null),
      [selected, setSelected] = useState(null),
      [userDraft, setUserDraft] = useState('');
    const [userLoading, setUserLoading] = useState(false),
      [userSaving, setUserSaving] = useState(false);
    const [userError, setUserError] = useState(''),
      [userConflict, setUserConflict] = useState(false);
    const globalSeq = useRef(0),
      listSeq = useRef(0),
      searchSeq = useRef(0),
      userSeq = useRef(0);
    const savingRef = useRef(false),
      userSavingRef = useRef(false);
    const globalApplied = useRef({
      generation: 0,
      multiplier: null
    });
    const applyGlobal = value => {
      globalApplied.current = {
        generation: globalApplied.current.generation + 1,
        multiplier: value.cost_multiplier
      };
      setSaved(value);
      setDraft(value.cost_multiplier);
      setSelected(current => current && current.cost_multiplier === null ? {
        ...current,
        effective_multiplier: value.cost_multiplier
      } : current);
    };
    const loadGlobal = useCallback(async () => {
      if (savingRef.current) return;
      const seq = ++globalSeq.current;
      setLoading(true);
      setError('');
      try {
        const value = await window.LF_API.adminAssistantPricing();
        if (seq !== globalSeq.current) return;
        if (!value || !multiplier(value.cost_multiplier) || !validRevision(value.revision)) throw new Error('invalid response');
        applyGlobal(value);
        setConflict(false);
      } catch (failure) {
        if (seq === globalSeq.current) setError(t('全局倍率暂时无法读取，请重试。', 'The global multiplier could not be loaded. Retry.'));
      } finally {
        if (seq === globalSeq.current) setLoading(false);
      }
    }, []);
    const loadList = useCallback(async nextPage => {
      const seq = ++listSeq.current;
      setListLoading(true);
      setListError('');
      try {
        const value = await window.LF_API.adminAssistantPricingUsers({
          limit: PAGE_SIZE,
          offset: (nextPage - 1) * PAGE_SIZE
        });
        if (seq !== listSeq.current) return;
        if (!validPage(value)) throw new Error('invalid response');
        const lastPage = Math.max(1, Math.ceil(value.total / PAGE_SIZE));
        if (nextPage > lastPage) {
          setPage(lastPage);
          return;
        }
        setList(value);
      } catch (failure) {
        if (seq === listSeq.current) setListError(t('专属倍率列表暂时无法读取，请重试。', 'User multipliers could not be loaded. Retry.'));
      } finally {
        if (seq === listSeq.current) setListLoading(false);
      }
    }, []);
    useEffect(() => {
      loadGlobal();
      return () => {
        ++globalSeq.current;
      };
    }, [loadGlobal]);
    useEffect(() => {
      loadList(page);
      return () => {
        ++listSeq.current;
      };
    }, [loadList, page]);
    useEffect(() => () => {
      ++searchSeq.current;
      ++userSeq.current;
    }, []);
    const failureMessage = failure => Number(failure && failure.status) === 409 ? t('倍率刚被更新。草稿已保留，请重新读取后再编辑。', 'The multiplier changed elsewhere. Your draft is kept. Reload before editing again.') : Number(failure && failure.status) === 403 ? t('没有修改助手倍率的权限。', 'You cannot change assistant multipliers.') : Number(failure && failure.status) === 422 ? t('倍率须为 1–100，最多 4 位小数。', 'Use a multiplier from 1 to 100 with up to 4 decimal places.') : t('保存结果未确认，请重新读取核对。', 'The save result is unconfirmed. Reload to check.');
    const nextMultiplier = multiplier(draft);
    const dirty = !!saved && nextMultiplier !== multiplier(saved.cost_multiplier);
    const invalid = !!saved && draft !== saved.cost_multiplier && !nextMultiplier;
    const saveGlobal = async event => {
      event.preventDefault();
      if (!saved || !dirty || !nextMultiplier || loading || conflict || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      setError('');
      const seq = globalSeq.current;
      try {
        const value = await window.LF_API.adminUpdateAssistantPricing({
          cost_multiplier: nextMultiplier,
          expected_revision: saved.revision
        });
        if (seq !== globalSeq.current) return;
        if (!value || !multiplier(value.cost_multiplier) || !validRevision(value.revision)) throw new Error('invalid response');
        applyGlobal(value);
        if (toast) toast(t('全局倍率已保存', 'Global multiplier saved'));
      } catch (failure) {
        if (seq === globalSeq.current) {
          setError(failureMessage(failure));
          setConflict(Number(failure && failure.status) === 409);
        }
      } finally {
        savingRef.current = false;
        if (seq === globalSeq.current) setSaving(false);
      }
    };
    const searchUsers = async (text, nextPage = 1) => {
      if (userSavingRef.current) return;
      const q = text.trim(),
        seq = ++searchSeq.current;
      setSearch(null);
      setSearchError('');
      if (!q) {
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const value = await window.LF_API.adminUsers({
          q,
          limit: PAGE_SIZE,
          offset: (nextPage - 1) * PAGE_SIZE
        });
        if (seq !== searchSeq.current) return;
        if (!validPage(value)) throw new Error('invalid response');
        setSearch({
          ...value,
          page: nextPage,
          q
        });
      } catch (failure) {
        if (seq === searchSeq.current) setSearchError(t('用户搜索失败，请重试。', 'User search failed. Retry.'));
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    };
    const chooseUser = async user => {
      if (userSavingRef.current) return;
      const id = userId(user);
      if (!id) return;
      const seq = ++userSeq.current,
        globalGeneration = globalApplied.current.generation;
      setTarget(user);
      setSelected(null);
      setUserDraft('');
      setUserError('');
      setUserConflict(false);
      setUserLoading(true);
      try {
        const value = await window.LF_API.adminAssistantUserPricing(id);
        if (seq !== userSeq.current) return;
        if (!validUser(value, id)) throw new Error('invalid response');
        const snapshot = value.cost_multiplier === null && globalGeneration !== globalApplied.current.generation ? {
          ...value,
          effective_multiplier: globalApplied.current.multiplier
        } : value;
        setTarget(snapshot);
        setSelected(snapshot);
        setUserDraft(snapshot.cost_multiplier || snapshot.effective_multiplier);
      } catch (failure) {
        if (seq === userSeq.current) setUserError(t('该用户的倍率暂时无法读取，请重试。', 'This user’s multiplier could not be loaded. Retry.'));
      } finally {
        if (seq === userSeq.current) setUserLoading(false);
      }
    };
    const nextUserMultiplier = multiplier(userDraft);
    const userDirty = !!selected && nextUserMultiplier !== multiplier(selected.cost_multiplier);
    const userInvalid = !!selected && !nextUserMultiplier;
    const saveUser = async restore => {
      if (!selected || userLoading || userConflict || userSavingRef.current) return;
      if (restore ? selected.cost_multiplier === null : !userDirty || !nextUserMultiplier) return;
      userSavingRef.current = true;
      setUserSaving(true);
      setUserError('');
      const id = selected.user_id,
        seq = userSeq.current,
        globalGeneration = globalApplied.current.generation;
      try {
        const value = await window.LF_API.adminUpdateAssistantUserPricing(id, {
          cost_multiplier: restore ? null : nextUserMultiplier,
          expected_revision: selected.revision
        });
        if (seq !== userSeq.current) return;
        if (!validUser(value, id)) throw new Error('invalid response');
        const snapshot = value.cost_multiplier === null && globalGeneration !== globalApplied.current.generation ? {
          ...value,
          effective_multiplier: globalApplied.current.multiplier
        } : value;
        setTarget(snapshot);
        setSelected(snapshot);
        setUserDraft(snapshot.cost_multiplier || snapshot.effective_multiplier);
        if (toast) toast(restore ? t('已恢复全局倍率', 'Global multiplier restored') : t('专属倍率已保存', 'User multiplier saved'));
        loadList(page);
      } catch (failure) {
        if (seq === userSeq.current) {
          setUserError(failureMessage(failure));
          setUserConflict(Number(failure && failure.status) === 409);
        }
      } finally {
        userSavingRef.current = false;
        if (seq === userSeq.current) setUserSaving(false);
      }
    };
    const identity = row => /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-pricing-identity"
    }, /*#__PURE__*/React.createElement("strong", null, userName(row)), row.email && row.display_name ? /*#__PURE__*/React.createElement("small", null, row.display_name) : null);
    const listColumns = [{
      key: 'user',
      header: t('用户', 'User'),
      priority: 'primary',
      sortable: false,
      render: identity
    }, {
      key: 'cost_multiplier',
      header: t('专属倍率', 'User multiplier'),
      numeric: true,
      sortable: false,
      render: row => row.cost_multiplier + '×'
    }, {
      key: 'actions',
      header: t('操作', 'Actions'),
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        disabled: userSaving || listLoading,
        "aria-label": t('编辑 ', 'Edit ') + userName(row),
        onClick: () => chooseUser(row)
      }, t('编辑', 'Edit'))
    }];
    const searchColumns = [{
      key: 'user',
      header: t('用户', 'User'),
      priority: 'primary',
      sortable: false,
      render: identity
    }, {
      key: 'actions',
      header: t('操作', 'Actions'),
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        disabled: userSaving,
        "aria-label": t('选择 ', 'Select ') + userName(row),
        onClick: () => chooseUser(row)
      }, t('选择', 'Select'))
    }];
    const effective = selected && selected.effective_multiplier;
    const validationMessage = t('倍率须为 1–100，最多 4 位小数。', 'Use a multiplier from 1 to 100 with up to 4 decimal places.');
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-assistant-card",
      "aria-labelledby": "admin-assistant-pricing-title",
      "aria-busy": loading
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-row"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      id: "admin-assistant-pricing-title"
    }, t('费用倍率', 'Cost multipliers')), /*#__PURE__*/React.createElement("p", null, t('倍率修改只影响新轮次；用户专属倍率优先于全局。', 'Multiplier changes apply to new turns. A user multiplier overrides the global value.')))), loading && !saved ? /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, t('加载中…', 'Loading…')) : null, saved ? /*#__PURE__*/React.createElement("form", {
      className: "adm-assistant-pricing-form",
      noValidate: true,
      onSubmit: saveGlobal
    }, /*#__PURE__*/React.createElement("label", {
      className: "adm-assistant-pricing-field",
      htmlFor: "admin-assistant-global-multiplier"
    }, /*#__PURE__*/React.createElement("span", null, t('全局倍率', 'Global multiplier')), /*#__PURE__*/React.createElement("input", {
      id: "admin-assistant-global-multiplier",
      className: "adm-input",
      inputMode: "decimal",
      autoComplete: "off",
      value: draft,
      disabled: saving || loading,
      "aria-invalid": invalid || undefined,
      "aria-describedby": invalid ? 'admin-assistant-global-multiplier-error' : undefined,
      onChange: event => setDraft(event.target.value)
    }), invalid ? /*#__PURE__*/React.createElement("small", {
      id: "admin-assistant-global-multiplier-error",
      className: "adm-assistant-error",
      role: "alert"
    }, validationMessage) : null), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn primary",
      disabled: !dirty || !nextMultiplier || saving || loading || conflict
    }, saving ? t('保存中…', 'Saving…') : t('保存全局倍率', 'Save global multiplier'))) : null, error ? /*#__PURE__*/React.createElement("p", {
      className: "adm-assistant-error",
      role: "alert"
    }, error) : null, /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-pricing-toolbar"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: loading || saving,
      onClick: loadGlobal
    }, t('重新读取全局倍率', 'Reload global multiplier'))), saved ? /*#__PURE__*/React.createElement("dl", {
      className: "adm-assistant-facts"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, t('笔力单价（元/笔力）', 'Credit price (CNY/credit)')), /*#__PURE__*/React.createElement("dd", null, saved.credit_price_rmb == null ? t('未配置', 'Not configured') : saved.credit_price_rmb))) : null), /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-assistant-card",
      "aria-labelledby": "admin-assistant-user-pricing-title"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-row"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      id: "admin-assistant-user-pricing-title"
    }, t('用户专属倍率', 'User multipliers'))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: listLoading || userSaving,
      onClick: () => loadList(page)
    }, t('刷新列表', 'Refresh list'))), listError ? /*#__PURE__*/React.createElement("p", {
      className: "adm-assistant-error",
      role: "alert"
    }, listError) : null, /*#__PURE__*/React.createElement(DataTable, {
      rows: list ? list.items : [],
      columns: listColumns,
      rowKey: "user_id",
      compact: true,
      loading: listLoading && !list,
      ariaLabel: t('已设置专属倍率的用户', 'Users with multipliers'),
      empty: listError ? t('列表未能读取', 'List could not be loaded') : t('暂无专属倍率', 'No user multipliers'),
      pagination: list && list.total > PAGE_SIZE ? {
        page,
        pageSize: PAGE_SIZE,
        total: list.total,
        pages: Math.max(1, Math.ceil(list.total / PAGE_SIZE)),
        onPageChange: nextPage => {
          if (!userSavingRef.current) setPage(nextPage);
        }
      } : undefined
    }), /*#__PURE__*/React.createElement("form", {
      className: "adm-assistant-pricing-form",
      onSubmit: event => {
        event.preventDefault();
        searchUsers(query);
      }
    }, /*#__PURE__*/React.createElement("label", {
      className: "adm-assistant-pricing-field",
      htmlFor: "admin-assistant-pricing-search"
    }, /*#__PURE__*/React.createElement("span", null, t('搜索用户', 'Search users')), /*#__PURE__*/React.createElement("input", {
      id: "admin-assistant-pricing-search",
      className: "adm-input",
      type: "search",
      autoComplete: "off",
      value: query,
      disabled: userSaving,
      placeholder: t('邮箱或显示名', 'Email or display name'),
      onChange: event => {
        ++searchSeq.current;
        setQuery(event.target.value);
        setSearch(null);
        setSearching(false);
        setSearchError('');
      }
    })), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn",
      disabled: userSaving || !query.trim()
    }, searching ? t('搜索中…', 'Searching…') : t('搜索', 'Search'))), searchError ? /*#__PURE__*/React.createElement("p", {
      className: "adm-assistant-error",
      role: "alert"
    }, searchError) : null, searching ? /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, t('正在搜索用户…', 'Searching users…')) : null, search ? /*#__PURE__*/React.createElement(DataTable, {
      rows: search.items,
      columns: searchColumns,
      rowKey: "id",
      compact: true,
      ariaLabel: t('用户搜索结果', 'User search results'),
      empty: t('未找到用户', 'No users found'),
      pagination: search.total > PAGE_SIZE ? {
        page: search.page,
        pageSize: PAGE_SIZE,
        total: search.total,
        pages: Math.max(1, Math.ceil(search.total / PAGE_SIZE)),
        onPageChange: nextPage => searchUsers(search.q, nextPage)
      } : undefined
    }) : null, target ? /*#__PURE__*/React.createElement("section", {
      className: "adm-assistant-pricing-editor",
      "aria-label": t('用户倍率编辑', 'Edit user multiplier'),
      "aria-busy": userLoading
    }, identity(target), userLoading ? /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, t('正在读取用户倍率…', 'Loading user multiplier…')) : null, selected ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("dl", {
      className: "adm-assistant-facts"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, t('当前生效', 'Effective multiplier')), /*#__PURE__*/React.createElement("dd", null, effective, "\xD7", selected.cost_multiplier === null ? ' · ' + t('跟随全局', 'Global value') : ''))), /*#__PURE__*/React.createElement("form", {
      className: "adm-assistant-pricing-form",
      noValidate: true,
      onSubmit: event => {
        event.preventDefault();
        saveUser(false);
      }
    }, /*#__PURE__*/React.createElement("label", {
      className: "adm-assistant-pricing-field",
      htmlFor: "admin-assistant-user-multiplier"
    }, /*#__PURE__*/React.createElement("span", null, t('专属倍率', 'User multiplier')), /*#__PURE__*/React.createElement("input", {
      id: "admin-assistant-user-multiplier",
      className: "adm-input",
      inputMode: "decimal",
      autoComplete: "off",
      value: userDraft,
      disabled: userSaving || userLoading,
      "aria-invalid": userInvalid || undefined,
      "aria-describedby": userInvalid ? 'admin-assistant-user-multiplier-error' : undefined,
      onChange: event => setUserDraft(event.target.value)
    }), userInvalid ? /*#__PURE__*/React.createElement("small", {
      id: "admin-assistant-user-multiplier-error",
      className: "adm-assistant-error",
      role: "alert"
    }, validationMessage) : null), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn primary",
      disabled: !userDirty || !nextUserMultiplier || userSaving || userLoading || userConflict
    }, userSaving ? t('保存中…', 'Saving…') : t('保存专属倍率', 'Save user multiplier')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: selected.cost_multiplier === null || userSaving || userLoading || userConflict,
      onClick: () => saveUser(true)
    }, t('恢复全局', 'Restore global')))) : null, userError ? /*#__PURE__*/React.createElement("p", {
      className: "adm-assistant-error",
      role: "alert"
    }, userError) : null, /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-pricing-toolbar"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: userSaving || userLoading,
      onClick: () => chooseUser(target)
    }, t('重新读取用户倍率', 'Reload user multiplier')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: userSaving,
      onClick: () => {
        if (!userSavingRef.current) {
          ++userSeq.current;
          setTarget(null);
          setSelected(null);
        }
      }
    }, t('取消编辑', 'Cancel editing')))) : null));
  }
  window.AdminAssistantPricingPanel = AdminAssistantPricingPanel;
})();
(function () {
  const {
    useCallback,
    useEffect,
    useState
  } = React;
  const TC = window.TC;
  function runtimeStatus(value) {
    const status = String(value && value.status || '').toLowerCase();
    if (status === 'configured') return {
      tone: 'ready',
      label: TC('adm_assistant_service_ready')
    };
    if (status === 'unconfigured') return {
      tone: 'muted',
      label: TC('adm_assistant_service_unconfigured')
    };
    return {
      tone: 'error',
      label: TC('adm_assistant_service_unavailable')
    };
  }
  function assistantModel(value) {
    const entry = value && Array.isArray(value.assistants) ? value.assistants[0] : null;
    return entry && entry.model_ref ? entry.model_ref : null;
  }
  function AdminAssistantSettingsTab({
    toast,
    onNavigateModelRouting,
    onSettingsChange
  }) {
    const [saved, setSaved] = useState(null);
    const [enabled, setEnabled] = useState(false);
    const [launcherVisible, setLauncherVisible] = useState(true);
    const [filterRepeatedMonologues, setFilterRepeatedMonologues] = useState(true);
    const [model, setModel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const applyValue = value => {
      setSaved(value);
      setEnabled(!!value.enabled);
      setLauncherVisible(value.launcher_visible === true);
      setFilterRepeatedMonologues(!!value.filter_repeated_monologues);
    };
    const load = useCallback(() => {
      setLoading(true);
      setError('');
      const settingsRequest = window.LF_API.adminAssistantSettings().then(applyValue);
      const modelRequest = window.LF_API.adminModelRouting().then(value => setModel(assistantModel(value))).catch(() => setModel(null));
      return Promise.all([settingsRequest, modelRequest]).catch(loadError => setError(loadError.message || TC('adm_assistant_load_failed'))).finally(() => setLoading(false));
    }, []);
    useEffect(() => {
      load();
    }, [load]);
    const dirty = !!saved && (enabled !== saved.enabled || launcherVisible !== saved.launcher_visible || filterRepeatedMonologues !== saved.filter_repeated_monologues);
    const save = async () => {
      if (!saved || !dirty || saving) return;
      setSaving(true);
      setError('');
      try {
        const value = await window.LF_API.adminUpdateAssistantSettings({
          enabled,
          launcher_visible: launcherVisible,
          filter_repeated_monologues: filterRepeatedMonologues,
          expected_revision: saved.revision
        });
        applyValue(value);
        if (onSettingsChange) onSettingsChange(value);
        toast(TC('adm_assistant_saved'));
      } catch (saveError) {
        setError(saveError.message || TC('adm_assistant_save_failed'));
      } finally {
        setSaving(false);
      }
    };
    if (loading && !saved) return /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-assistant-state"
    }, TC('set_loading'));
    if (!saved) return /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-assistant-state error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: load
    }, TC('adm_retry')));
    const service = runtimeStatus(saved.runtime);
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-assistant-heading"
    }, /*#__PURE__*/React.createElement("h1", null, TC('adm_assistant_title'))), /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-assistant-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-row"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      id: "admin-assistant-enabled-label"
    }, TC('adm_assistant_enabled')), /*#__PURE__*/React.createElement("p", {
      id: "admin-assistant-enabled-note"
    }, TC('adm_assistant_enabled_note'))), /*#__PURE__*/React.createElement("label", {
      className: "set-mail-switch"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      role: "switch",
      "aria-labelledby": "admin-assistant-enabled-label",
      "aria-describedby": "admin-assistant-enabled-note",
      checked: enabled,
      disabled: saving,
      onChange: event => setEnabled(event.target.checked)
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-row adm-assistant-row--secondary"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      id: "admin-assistant-launcher-label"
    }, TC('adm_assistant_launcher')), /*#__PURE__*/React.createElement("p", {
      id: "admin-assistant-launcher-note"
    }, TC('adm_assistant_launcher_note'))), /*#__PURE__*/React.createElement("label", {
      className: "set-mail-switch"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      role: "switch",
      "aria-labelledby": "admin-assistant-launcher-label",
      "aria-describedby": "admin-assistant-launcher-note",
      checked: launcherVisible,
      disabled: saving,
      onChange: event => setLauncherVisible(event.target.checked)
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-row adm-assistant-row--secondary"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      id: "admin-assistant-monologue-filter-label"
    }, TC('adm_assistant_monologue_filter')), /*#__PURE__*/React.createElement("p", {
      id: "admin-assistant-monologue-filter-note"
    }, TC('adm_assistant_monologue_filter_note'))), /*#__PURE__*/React.createElement("label", {
      className: "set-mail-switch"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      role: "switch",
      "aria-labelledby": "admin-assistant-monologue-filter-label",
      "aria-describedby": "admin-assistant-monologue-filter-note",
      checked: filterRepeatedMonologues,
      disabled: saving,
      onChange: event => setFilterRepeatedMonologues(event.target.checked)
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }))), /*#__PURE__*/React.createElement("dl", {
      className: "adm-assistant-facts"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, TC('adm_assistant_service')), /*#__PURE__*/React.createElement("dd", {
      className: service.tone
    }, service.label)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, TC('adm_assistant_model')), /*#__PURE__*/React.createElement("dd", null, model || TC('adm_assistant_model_unknown')))), error ? /*#__PURE__*/React.createElement("p", {
      className: "adm-assistant-error",
      role: "alert"
    }, error) : null, /*#__PURE__*/React.createElement("footer", {
      className: "adm-assistant-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      onClick: onNavigateModelRouting
    }, TC('adm_assistant_configure_model')), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: !dirty || saving,
      onClick: () => {
        setEnabled(saved.enabled);
        setLauncherVisible(saved.launcher_visible);
        setFilterRepeatedMonologues(saved.filter_repeated_monologues);
      }
    }, TC('adm_reset')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      disabled: !dirty || saving,
      onClick: save
    }, saving ? TC('adm_assistant_saving') : TC('adm_assistant_save')))), /*#__PURE__*/React.createElement(window.AdminAssistantPricingPanel, {
      toast: toast
    }));
  }
  window.AdminAssistantSettingsTab = AdminAssistantSettingsTab;
})();
}
