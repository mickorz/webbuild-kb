{
(function () {
  const {
    useCallback,
    useEffect,
    useRef,
    useState
  } = React;
  const TC = window.TC;
  const Core = window.AdminUserLimitsCore;
  const DataTable = window.AdminDataTable;
  function LimitEditor({
    row,
    disabled,
    error,
    onInput,
    onUnlimited
  }) {
    const inputId = 'adm-user-limit-' + row.code;
    const errorId = inputId + '-error';
    const unlimitedId = inputId + '-unlimited';
    const errorText = error ? TC(Core.errorKey(error)) : '';
    return /*#__PURE__*/React.createElement("div", {
      className: 'adm-limits-edit' + (error ? ' is-invalid' : '')
    }, /*#__PURE__*/React.createElement("label", {
      className: "sr-only",
      htmlFor: inputId
    }, row.name, " ", TC('adm_limits_characters')), /*#__PURE__*/React.createElement("div", {
      className: "adm-limits-number"
    }, /*#__PURE__*/React.createElement("input", {
      id: inputId,
      type: "number",
      inputMode: "numeric",
      min: "1",
      max: Core.MAX_LIMIT,
      step: "1",
      value: row.unlimited ? '' : row.input,
      disabled: disabled || row.unlimited,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? errorId : undefined,
      onChange: event => onInput(row.code, event.target.value)
    }), /*#__PURE__*/React.createElement("span", null, TC('adm_limits_unit'))), /*#__PURE__*/React.createElement("label", {
      className: "adm-limits-unlimited",
      htmlFor: unlimitedId
    }, /*#__PURE__*/React.createElement("input", {
      id: unlimitedId,
      type: "checkbox",
      role: "switch",
      checked: row.unlimited,
      disabled: disabled,
      onChange: event => onUnlimited(row.code, event.target.checked)
    }), /*#__PURE__*/React.createElement("span", null, TC('adm_limits_unlimited'))), error ? /*#__PURE__*/React.createElement("p", {
      id: errorId,
      className: "adm-limits-field-error",
      role: "alert"
    }, errorText) : null);
  }
  function AdminUserLimitsTab({
    toast
  }) {
    const [saved, setSaved] = useState(null);
    const [draft, setDraft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const savingRef = useRef(false);
    const applyCanonical = value => {
      const snapshot = Core.normalizeSnapshot(value);
      if (!snapshot) return false;
      setSaved(snapshot);
      setDraft(Core.createDraft(snapshot));
      return true;
    };
    const load = useCallback(() => {
      setLoading(true);
      setError('');
      return window.LF_API.adminUserLimits().then(value => {
        if (!applyCanonical(value)) setError(TC('adm_limits_load_failed'));
      }).catch(loadError => setError(loadError.message || TC('adm_limits_load_failed'))).finally(() => setLoading(false));
    }, []);
    useEffect(() => {
      load();
    }, [load]);
    const locked = saving || !!(draft && draft.conflict);
    const dirty = Core.isDirty(saved, draft);
    const saveEnabled = Core.canSave(saved, draft, {
      saving: saving || savingRef.current
    });
    const updateUnlimited = (code, unlimited) => {
      if (locked) return;
      setDraft(current => Core.setUnlimited(current, code, unlimited));
    };
    const updateInput = (code, text) => {
      if (locked) return;
      setDraft(current => Core.setInput(current, code, text));
    };
    const save = async () => {
      if (savingRef.current || !Core.canSave(saved, draft, {
        saving: savingRef.current
      })) return;
      const payload = Core.savePayload(saved, draft);
      if (!payload) return;
      savingRef.current = true;
      setSaving(true);
      setError('');
      try {
        const value = await window.LF_API.adminUpdateUserLimits(payload);
        if (!applyCanonical(value)) setError(TC('adm_limits_save_failed'));else toast(TC('adm_limits_saved'));
      } catch (saveError) {
        if (Core.failureKind(saveError) === 'conflict') {
          setDraft(current => Core.markConflict(current));
          setError(TC('adm_limits_conflict'));
        } else {
          setError(saveError.message || TC('adm_limits_save_failed'));
        }
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    };
    const columns = [{
      key: 'name',
      header: TC('adm_limits_plan'),
      priority: 'primary',
      sortValue: row => String(row.name || ''),
      render: row => /*#__PURE__*/React.createElement("div", {
        className: "adm-limits-plan"
      }, /*#__PURE__*/React.createElement("strong", null, row.name), row.active ? null : /*#__PURE__*/React.createElement("small", null, TC('adm_limits_inactive')))
    }, {
      key: 'limit',
      header: TC('adm_limits_characters'),
      numeric: true,
      sortable: false,
      render: row => /*#__PURE__*/React.createElement(LimitEditor, {
        row: row,
        disabled: locked,
        error: Core.rowError(row),
        onInput: updateInput,
        onUnlimited: updateUnlimited
      })
    }];
    if (loading && !draft) return /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-limits-state"
    }, TC('set_loading'));
    if (!draft) return /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-limits-state error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error || TC('adm_limits_load_failed')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: load
    }, TC('adm_retry')));
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-limits-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-limits-heading"
    }, /*#__PURE__*/React.createElement("h1", null, TC('adm_limits_title'))), /*#__PURE__*/React.createElement("p", {
      className: "adm-limits-note"
    }, TC('adm_limits_note')), error ? /*#__PURE__*/React.createElement("div", {
      className: "adm-limits-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), draft.conflict ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: saving,
      onClick: load
    }, TC('adm_limits_reload')) : null) : null, /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-limits-card"
    }, /*#__PURE__*/React.createElement(DataTable, {
      rows: draft.rows,
      columns: columns,
      rowKey: "code",
      compact: true,
      ariaLabel: TC('adm_limits_table'),
      empty: TC('adm_limits_empty')
    }), /*#__PURE__*/React.createElement("footer", {
      className: "adm-limits-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: !dirty || locked,
      onClick: () => {
        setError('');
        setDraft(Core.createDraft(saved));
      }
    }, TC('adm_reset')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      disabled: !saveEnabled,
      onClick: save
    }, saving ? TC('adm_limits_saving') : TC('adm_limits_save')))));
  }
  window.AdminUserLimitsTab = AdminUserLimitsTab;
})();
}
