{
(function () {
  const {
    useCallback,
    useEffect,
    useMemo,
    useState
  } = React;
  const TC = window.TC;
  const PublicApiAnnouncements = window.AdminPublicApiAnnouncements;
  const fields = [['provider_display_name', 'adm_public_provider_name', 'text'], ['attribution', 'adm_public_attribution', 'text'], ['official_url', 'adm_public_official_url', 'url'], ['service_notice', 'adm_public_service_notice', 'textarea'], ['top_up_title', 'adm_public_topup_title', 'text'], ['top_up_subtitle', 'adm_public_topup_subtitle', 'textarea'], ['top_up_ratio_notice', 'adm_public_ratio_notice', 'textarea'], ['payment_product_template', 'adm_public_product_template', 'text']];
  const switches = [['service_enabled', 'adm_public_service_enabled', 'adm_public_service_enabled_note'], ['login_enabled', 'adm_public_login_enabled', 'adm_public_login_enabled_note'], ['payment_enabled', 'adm_public_payment_enabled', 'adm_public_payment_enabled_note'], ['header_recharge_enabled', 'adm_public_header_recharge', 'adm_public_header_recharge_note'], ['model_page_recharge_enabled', 'adm_public_page_recharge', 'adm_public_page_recharge_note']];
  function PublicApiTab({
    toast
  }) {
    const [saved, setSaved] = useState(null);
    const [draft, setDraft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const load = useCallback(() => {
      setLoading(true);
      setError('');
      return window.LF_API.adminPublicApiSettings().then(value => {
        setSaved(value);
        setDraft(Object.assign({}, value));
      }).catch(loadError => setError(loadError.message || TC('adm_public_load_failed'))).finally(() => setLoading(false));
    }, []);
    useEffect(() => {
      load();
    }, [load]);
    const dirty = useMemo(() => {
      if (!saved || !draft) return false;
      return JSON.stringify(saved) !== JSON.stringify(draft);
    }, [saved, draft]);
    const update = (key, value) => setDraft(current => Object.assign({}, current, {
      [key]: value
    }));
    const save = async () => {
      if (!draft || !saved || saving) return;
      setSaving(true);
      setError('');
      try {
        const payload = Object.assign({}, draft, {
          expected_revision: saved.revision
        });
        delete payload.revision;
        delete payload.runtime_managed;
        delete payload.deployment_allowed;
        delete payload.updated_by;
        delete payload.updated_at;
        const value = await window.LF_API.adminUpdatePublicApiSettings(payload);
        setSaved(value);
        setDraft(Object.assign({}, value));
        toast(TC('adm_public_saved'));
      } catch (saveError) {
        setError(saveError.message || TC('adm_public_save_failed'));
      } finally {
        setSaving(false);
      }
    };
    if (loading && !draft) return /*#__PURE__*/React.createElement("div", {
      className: "adm-card adm-public-state"
    }, TC('set_loading'));
    if (!draft) return /*#__PURE__*/React.createElement("div", {
      className: "adm-card adm-public-state error"
    }, /*#__PURE__*/React.createElement("b", null, TC('adm_public_load_failed')), /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      onClick: load
    }, TC('adm_retry')));
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-public-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-public-heading"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, TC('adm_public_kicker')), /*#__PURE__*/React.createElement("h1", null, TC('adm_public_title')), /*#__PURE__*/React.createElement("span", null, TC('adm_public_intro'))), /*#__PURE__*/React.createElement("div", {
      className: "adm-public-actions"
    }, /*#__PURE__*/React.createElement("span", null, TC('adm_public_revision'), " ", draft.revision || 0), /*#__PURE__*/React.createElement("button", {
      className: "c-btn",
      disabled: !dirty || saving,
      onClick: () => setDraft(Object.assign({}, saved))
    }, TC('adm_reset')), /*#__PURE__*/React.createElement("button", {
      className: "c-btn primary",
      disabled: !dirty || saving,
      onClick: save
    }, saving ? TC('adm_public_saving') : TC('adm_public_publish')))), !draft.deployment_allowed && /*#__PURE__*/React.createElement("section", {
      className: "adm-public-gate"
    }, /*#__PURE__*/React.createElement("b", null, TC('adm_public_gate_off')), /*#__PURE__*/React.createElement("span", null, TC('adm_public_gate_off_note'))), error && /*#__PURE__*/React.createElement("section", {
      className: "adm-public-error",
      role: "alert"
    }, error), /*#__PURE__*/React.createElement("section", {
      className: "adm-public-section"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-public-section-title"
    }, /*#__PURE__*/React.createElement("h2", null, TC('adm_public_switches')), /*#__PURE__*/React.createElement("p", null, TC('adm_public_switches_note'))), /*#__PURE__*/React.createElement("div", {
      className: "adm-public-switch-list"
    }, switches.map(item => /*#__PURE__*/React.createElement("label", {
      key: item[0],
      className: "adm-public-switch"
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, TC(item[1])), /*#__PURE__*/React.createElement("small", null, TC(item[2]))), /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!draft[item[0]],
      disabled: item[0] === 'service_enabled' && !draft.deployment_allowed,
      onChange: event => update(item[0], event.target.checked)
    })))), /*#__PURE__*/React.createElement("label", {
      className: "adm-public-field compact"
    }, /*#__PURE__*/React.createElement("span", null, TC('adm_public_ratio')), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0.0001",
      max: "1",
      step: "0.01",
      value: draft.recharge_ratio,
      onChange: event => update('recharge_ratio', Number(event.target.value))
    }), /*#__PURE__*/React.createElement("small", null, TC('adm_public_ratio_note')))), /*#__PURE__*/React.createElement("section", {
      className: "adm-public-section"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-public-section-title"
    }, /*#__PURE__*/React.createElement("h2", null, TC('adm_public_copy')), /*#__PURE__*/React.createElement("p", null, TC('adm_public_copy_note'))), /*#__PURE__*/React.createElement("div", {
      className: "adm-public-fields"
    }, fields.map(item => /*#__PURE__*/React.createElement("label", {
      key: item[0],
      className: 'adm-public-field' + (item[2] === 'textarea' ? ' wide' : '')
    }, /*#__PURE__*/React.createElement("span", null, TC(item[1])), item[2] === 'textarea' ? /*#__PURE__*/React.createElement("textarea", {
      value: draft[item[0]] || '',
      maxLength: item[0] === 'service_notice' ? 600 : 240,
      onChange: event => update(item[0], event.target.value)
    }) : /*#__PURE__*/React.createElement("input", {
      type: item[2],
      value: draft[item[0]] || '',
      maxLength: item[0] === 'official_url' ? 512 : 160,
      onChange: event => update(item[0], event.target.value)
    }), item[0] === 'top_up_ratio_notice' && /*#__PURE__*/React.createElement("small", null, TC('adm_public_ratio_placeholder')), item[0] === 'payment_product_template' && /*#__PURE__*/React.createElement("small", null, TC('adm_public_order_placeholder')))))), /*#__PURE__*/React.createElement(PublicApiAnnouncements, {
      toast: toast
    }));
  }
  window.AdminPublicApiTab = PublicApiTab;
})();
}
