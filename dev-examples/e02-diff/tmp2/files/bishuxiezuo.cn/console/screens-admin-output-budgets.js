{
(function () {
  const {
    useCallback,
    useEffect,
    useRef,
    useState
  } = React;
  const TC = window.TC;
  const Core = window.AdminOutputBudgetsCore;
  const DataTable = window.AdminDataTable;
  function OutputCapEditor({
    row,
    field,
    locked,
    onChange
  }) {
    const value = row[field];
    const invalid = Core.fieldError(value);
    const id = 'output-budget-' + row.operation + '-' + field;
    const label = TC('adm_output_' + row.operation) + ' · ' + TC('adm_output_' + field);
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-output-editor"
    }, /*#__PURE__*/React.createElement("label", {
      className: "adm-output-choice"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: value.inherit,
      disabled: locked,
      "aria-label": label + ' · ' + TC(field === Core.FIELDS[0] ? 'adm_output_follow' : 'adm_output_unlimited'),
      onChange: event => onChange(row.operation, field, {
        inherit: event.target.checked
      })
    }), /*#__PURE__*/React.createElement("span", null, TC(field === Core.FIELDS[0] ? 'adm_output_follow' : 'adm_output_unlimited'))), !value.inherit ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
      className: "sr-only",
      htmlFor: id
    }, label), /*#__PURE__*/React.createElement("input", {
      id: id,
      type: "number",
      min: "1",
      max: Core.MAX,
      step: "1",
      inputMode: "numeric",
      value: value.text,
      disabled: locked,
      "aria-invalid": invalid || undefined,
      "aria-describedby": invalid ? id + '-error' : undefined,
      onChange: event => onChange(row.operation, field, {
        text: event.target.value
      })
    }), invalid ? /*#__PURE__*/React.createElement("p", {
      id: id + '-error',
      className: "adm-output-error",
      role: "alert"
    }, TC('adm_output_invalid')) : null) : null);
  }
  function AdminOutputBudgetsTab({
    toast,
    onNavigateModelRouting
  }) {
    const [saved, setSaved] = useState(null);
    const [draft, setDraft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [conflict, setConflict] = useState(false);
    const [error, setError] = useState('');
    const savingRef = useRef(false);
    const loadId = useRef(0);
    const mounted = useRef(true);
    const apply = value => {
      const canonical = Core.normalize(value);
      if (!canonical) return false;
      setSaved(canonical);
      setDraft(Core.createDraft(canonical));
      setConflict(false);
      return true;
    };
    const load = useCallback(async () => {
      if (savingRef.current) return;
      const id = ++loadId.current;
      setLoading(true);
      setError('');
      try {
        const value = await window.LF_API.adminOutputBudgets();
        if (mounted.current && id === loadId.current && !apply(value)) setError(TC('adm_output_load_failed'));
      } catch (err) {
        if (mounted.current && id === loadId.current) setError(err.message || TC('adm_output_load_failed'));
      } finally {
        if (mounted.current && id === loadId.current) setLoading(false);
      }
    }, []);
    useEffect(() => {
      mounted.current = true;
      load();
      return () => {
        mounted.current = false;
        loadId.current += 1;
      };
    }, [load]);
    const locked = loading || saving || conflict;
    const dirty = Core.dirty(saved, draft);
    const save = async () => {
      const payload = Core.serialize(saved, draft);
      if (locked || savingRef.current || !dirty || !payload) return;
      savingRef.current = true;
      setSaving(true);
      setError('');
      try {
        const value = await window.LF_API.adminUpdateOutputBudgets(payload);
        if (!mounted.current) return;
        if (apply(value)) toast(TC('adm_output_saved'));else {
          setConflict(true);
          setError(TC('adm_output_unconfirmed'));
        }
      } catch (err) {
        if (!mounted.current) return;
        if (err.status === 409) {
          setConflict(true);
          setError(TC('adm_output_conflict'));
        } else setError(err.message || TC('adm_output_save_failed'));
      } finally {
        savingRef.current = false;
        if (mounted.current) setSaving(false);
      }
    };
    const change = (operation, field, changes) => {
      if (!locked) setDraft(value => Core.update(value, operation, field, changes));
    };
    const columns = [{
      key: 'operation',
      header: TC('adm_output_operation'),
      priority: 'primary',
      sortable: false,
      render: row => /*#__PURE__*/React.createElement("strong", null, TC('adm_output_' + row.operation))
    }, ...Core.FIELDS.map(field => ({
      key: field,
      header: TC('adm_output_' + field),
      sortable: false,
      description: TC(field === Core.FIELDS[0] ? 'adm_output_per_call_help' : 'adm_output_total_help'),
      render: row => /*#__PURE__*/React.createElement(OutputCapEditor, {
        row: row,
        field: field,
        locked: locked,
        onChange: change
      })
    }))];
    if (loading && !draft) return /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-output-state"
    }, TC('set_loading'));
    if (!draft) return /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-output-state",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error || TC('adm_output_load_failed')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: load
    }, TC('adm_retry')));
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-output-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-output-heading"
    }, /*#__PURE__*/React.createElement("h1", null, TC('adm_output_title')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: onNavigateModelRouting
    }, TC('adm_tab_model_routing'))), /*#__PURE__*/React.createElement("p", {
      className: "adm-output-note"
    }, TC('adm_output_note')), error ? /*#__PURE__*/React.createElement("div", {
      className: "adm-output-feedback",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: saving || loading,
      onClick: load
    }, TC('adm_output_reload'))) : null, /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-output-card"
    }, /*#__PURE__*/React.createElement(DataTable, {
      rows: draft,
      columns: columns,
      rowKey: "operation",
      compact: true,
      ariaLabel: TC('adm_output_title')
    }), /*#__PURE__*/React.createElement("footer", {
      className: "adm-output-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: locked || draft.every(row => Core.FIELDS.every(field => row[field].inherit)),
      onClick: () => setDraft(Core.followCore(draft))
    }, TC('adm_output_follow_all')), /*#__PURE__*/React.createElement("span", {
      className: "sp"
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: locked || !dirty,
      onClick: () => {
        setDraft(Core.createDraft(saved));
        setError('');
      }
    }, TC('adm_reset')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      disabled: locked || !dirty || !Core.serialize(saved, draft),
      onClick: save
    }, TC(saving ? 'adm_output_saving' : 'adm_output_save')))));
  }
  window.AdminOutputBudgetsTab = AdminOutputBudgetsTab;
})();
}
