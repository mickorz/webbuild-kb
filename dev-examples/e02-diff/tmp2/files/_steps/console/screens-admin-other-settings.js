{
(function () {
  const {
    useCallback,
    useEffect,
    useState
  } = React;
  const TC = window.TC;
  function RegistrationAccessSection({
    toast
  }) {
    const [saved, setSaved] = useState(null);
    const [mode, setMode] = useState('open');
    const [patterns, setPatterns] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const applyValue = value => {
      setSaved(value);
      setMode(value.mode || 'open');
      setPatterns((value.allowed_email_patterns || []).join('\n'));
    };
    const parsePatterns = value => Array.from(new Set(value.split(/[\n,]/).map(item => item.trim().toLowerCase()).filter(Boolean)));
    const load = useCallback(() => {
      setLoading(true);
      setError('');
      return window.LF_API.adminRegistrationAccess().then(applyValue).catch(loadError => setError(loadError.message || TC('adm_registration_load_failed'))).finally(() => setLoading(false));
    }, []);
    useEffect(() => {
      load();
    }, [load]);
    const parsedPatterns = parsePatterns(patterns);
    const dirty = !!saved && (mode !== saved.mode || parsedPatterns.join('\n') !== (saved.allowed_email_patterns || []).join('\n'));
    const save = async () => {
      if (!saved || !dirty || saving) return;
      if (mode === 'allowlist' && parsedPatterns.length === 0) {
        setError(TC('adm_registration_empty'));
        return;
      }
      setSaving(true);
      setError('');
      try {
        const value = await window.LF_API.adminUpdateRegistrationAccess({
          mode,
          allowed_email_patterns: parsedPatterns,
          expected_revision: saved.revision
        });
        applyValue(value);
        toast(TC('adm_registration_saved'));
      } catch (saveError) {
        setError(saveError.message || TC('adm_registration_save_failed'));
      } finally {
        setSaving(false);
      }
    };
    if (loading && !saved) return /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-registration-state"
    }, TC('set_loading'));
    if (!saved) return /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-registration-state error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: load
    }, TC('adm_retry')));
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-registration-card"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-registration-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, TC('adm_registration_title')), /*#__PURE__*/React.createElement("span", null, parsedPatterns.length, " ", TC('adm_registration_count'))), /*#__PURE__*/React.createElement("label", {
      className: "adm-registration-switch"
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, TC('adm_registration_allowlist')), /*#__PURE__*/React.createElement("small", null, TC('adm_registration_existing'))), /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      role: "switch",
      checked: mode === 'allowlist',
      onChange: event => setMode(event.target.checked ? 'allowlist' : 'open')
    }))), /*#__PURE__*/React.createElement("label", {
      className: "adm-registration-field"
    }, /*#__PURE__*/React.createElement("span", null, TC('adm_registration_patterns')), /*#__PURE__*/React.createElement("textarea", {
      value: patterns,
      onChange: event => setPatterns(event.target.value),
      placeholder: TC('adm_registration_placeholder'),
      spellCheck: "false"
    })), error && /*#__PURE__*/React.createElement("p", {
      className: "adm-registration-error",
      role: "alert"
    }, error), /*#__PURE__*/React.createElement("footer", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: !dirty || saving,
      onClick: () => applyValue(saved)
    }, TC('adm_reset')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary sm",
      disabled: !dirty || saving,
      onClick: save
    }, saving ? TC('adm_registration_saving') : TC('adm_registration_save'))));
  }
  const PAY_ICONS = {
    alipay_page: '../site/images/pay/alipay.svg',
    wechat_native: '../site/images/pay/wechat-pay.svg'
  };
  function PaymentChannelsSection({
    toast
  }) {
    const [saved, setSaved] = useState(null);
    const [channels, setChannels] = useState([]);
    const [defaultProvider, setDefaultProvider] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [conflict, setConflict] = useState(false);
    const applyValue = value => {
      setSaved(value);
      setChannels(value.channels.map(item => ({
        ...item
      })));
      setDefaultProvider(value.default_provider || '');
      setConflict(false);
      setError('');
    };
    const load = useCallback(() => {
      setLoading(true);
      setError('');
      return window.LF_API.adminPaymentChannels().then(applyValue).catch(loadError => setError(loadError.message || TC('adm_pay_load_failed'))).finally(() => setLoading(false));
    }, []);
    useEffect(() => {
      load();
    }, [load]);
    const shown = channels.filter(item => item.visible && item.configured).map(item => item.provider);
    const effectiveDefault = shown.includes(defaultProvider) ? defaultProvider : shown[0] || '';
    const signature = (list, chosen) => JSON.stringify([list.map(item => [item.provider, item.visible]), chosen]);
    const dirty = !!saved && signature(channels, effectiveDefault) !== signature(saved.channels, (() => {
      const savedShown = saved.channels.filter(item => item.visible && item.configured).map(item => item.provider);
      return savedShown.includes(saved.default_provider) ? saved.default_provider : savedShown[0] || '';
    })());
    const move = (index, step) => setChannels(list => {
      const next = list.slice();
      const [item] = next.splice(index, 1);
      next.splice(index + step, 0, item);
      return next;
    });
    const toggle = (provider, visible) => setChannels(list => list.map(item => item.provider === provider ? {
      ...item,
      visible
    } : item));
    const save = async () => {
      if (!saved || !dirty || saving) return;
      if (!shown.length) {
        setError(TC('adm_pay_need_one'));
        return;
      }
      setSaving(true);
      setError('');
      try {
        applyValue(await window.LF_API.adminUpdatePaymentChannels({
          channels: channels.map(item => ({
            provider: item.provider,
            visible: item.visible
          })),
          default_provider: effectiveDefault || null,
          expected_revision: saved.revision
        }));
        toast(TC('adm_pay_saved'));
      } catch (saveError) {
        setError(saveError.message || TC('adm_pay_save_failed'));
        setConflict(saveError.status === 409);
      } finally {
        setSaving(false);
      }
    };
    if (loading && !saved) return /*#__PURE__*/React.createElement("div", {
      className: "adm-card adm-other-state"
    }, TC('set_loading'));
    if (!saved) return /*#__PURE__*/React.createElement("div", {
      className: "adm-card adm-other-state error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: load
    }, TC('adm_retry')));
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-pay-card",
      "aria-labelledby": "adm-pay-title"
    }, /*#__PURE__*/React.createElement("h2", {
      id: "adm-pay-title"
    }, TC('adm_pay_title')), /*#__PURE__*/React.createElement("ol", {
      className: "adm-pay-list"
    }, channels.map((item, index) => {
      const on = item.visible && item.configured;
      return /*#__PURE__*/React.createElement("li", {
        key: item.provider,
        className: 'adm-pay-row' + (on ? '' : ' off')
      }, /*#__PURE__*/React.createElement("span", {
        className: "adm-pay-name"
      }, PAY_ICONS[item.provider] ? /*#__PURE__*/React.createElement("img", {
        src: PAY_ICONS[item.provider],
        alt: "",
        width: "22",
        height: "22"
      }) : null, /*#__PURE__*/React.createElement("b", null, item.label), item.configured ? null : /*#__PURE__*/React.createElement("em", null, TC('adm_pay_unwired'))), /*#__PURE__*/React.createElement("label", {
        className: "adm-pay-default"
      }, /*#__PURE__*/React.createElement("input", {
        type: "radio",
        name: "adm-pay-default",
        checked: on && effectiveDefault === item.provider,
        disabled: !on || saving,
        onChange: () => setDefaultProvider(item.provider)
      }), TC('adm_pay_default')), /*#__PURE__*/React.createElement("span", {
        className: "adm-pay-move"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        "aria-label": TC('adm_pay_up') + ' ' + item.label,
        disabled: index === 0 || saving,
        onClick: () => move(index, -1)
      }, "\u2191"), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        "aria-label": TC('adm_pay_down') + ' ' + item.label,
        disabled: index === channels.length - 1 || saving,
        onClick: () => move(index, 1)
      }, "\u2193")), /*#__PURE__*/React.createElement("label", {
        className: "set-mail-switch"
      }, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        role: "switch",
        "aria-label": TC('adm_pay_show') + ' ' + item.label,
        checked: on,
        disabled: !item.configured || saving,
        onChange: event => toggle(item.provider, event.target.checked)
      }), /*#__PURE__*/React.createElement("span", {
        "aria-hidden": "true"
      })));
    })), error ? /*#__PURE__*/React.createElement("div", {
      className: "adm-other-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), conflict ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: loading || saving,
      onClick: load
    }, TC('adm_other_reload')) : null) : null, /*#__PURE__*/React.createElement("footer", {
      className: "adm-other-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: !dirty || saving,
      onClick: () => applyValue(saved)
    }, TC('adm_reset')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      disabled: !dirty || saving,
      onClick: save
    }, saving ? TC('adm_other_saving') : TC('adm_other_save'))));
  }
  function GeneralSettingsSection({
    toast
  }) {
    const [saved, setSaved] = useState(null);
    const [enabled, setEnabled] = useState(false);
    const [billingMode, setBillingMode] = useState('');
    const [analytics, setAnalytics] = useState({});
    const analyticsFields = ['analytics_popup_enabled', 'analytics_default_enabled', 'analytics_buttons_affect_collection'];
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [conflict, setConflict] = useState(false);
    const billingModes = ['off', 'shadow', 'enforce'];
    const applyValue = value => {
      setSaved(value);
      setEnabled(!!value.notification_emails_enabled);
      setBillingMode(billingModes.includes(value.book_data_billing_mode) ? value.book_data_billing_mode : '');
      setAnalytics(Object.fromEntries(analyticsFields.map(key => [key, value[key]])));
      setConflict(false);
      setError('');
    };
    const load = useCallback(() => {
      setLoading(true);
      setError('');
      return window.LF_API.adminOtherSettings().then(applyValue).catch(loadError => setError(loadError.message || TC('adm_other_load_failed'))).finally(() => setLoading(false));
    }, []);
    useEffect(() => {
      load();
    }, [load]);
    const dirty = !!saved && (enabled !== saved.notification_emails_enabled || billingMode && billingMode !== saved.book_data_billing_mode || analyticsFields.some(key => analytics[key] !== saved[key]));
    const save = async () => {
      if (!saved || !dirty || saving || loading) return;
      setSaving(true);
      setError('');
      try {
        const value = await window.LF_API.adminUpdateOtherSettings({
          ...(enabled !== saved.notification_emails_enabled ? {
            notification_emails_enabled: enabled
          } : {}),
          ...(billingMode && billingMode !== saved.book_data_billing_mode ? {
            book_data_billing_mode: billingMode
          } : {}),
          ...Object.fromEntries(analyticsFields.filter(key => analytics[key] !== saved[key]).map(key => [key, analytics[key]])),
          expected_revision: saved.revision
        });
        applyValue(value);
        toast(TC('adm_other_saved'));
      } catch (saveError) {
        setError(saveError.message || TC('adm_other_save_failed'));
        setConflict(saveError.status === 409);
      } finally {
        setSaving(false);
      }
    };
    if (loading && !saved) return /*#__PURE__*/React.createElement("div", {
      className: "adm-card adm-other-state"
    }, TC('set_loading'));
    if (!saved) return /*#__PURE__*/React.createElement("div", {
      className: "adm-card adm-other-state error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: load
    }, TC('adm_retry')));
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-other-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-other-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-other-copy"
    }, /*#__PURE__*/React.createElement("h2", null, TC('adm_other_email_title')), /*#__PURE__*/React.createElement("p", null, TC('adm_other_email_note'))), /*#__PURE__*/React.createElement("label", {
      className: "set-mail-switch"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      role: "switch",
      "aria-label": TC('adm_other_email_title'),
      checked: enabled,
      disabled: saving || loading,
      onChange: event => setEnabled(event.target.checked)
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }))), analyticsFields.map(key => /*#__PURE__*/React.createElement("div", {
      className: "adm-other-row",
      key: key
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-other-copy"
    }, /*#__PURE__*/React.createElement("h2", null, TC('adm_other_' + key)), /*#__PURE__*/React.createElement("p", null, TC(typeof analytics[key] === 'boolean' ? 'adm_other_' + key + '_note' : 'adm_other_analytics_unavailable'))), /*#__PURE__*/React.createElement("label", {
      className: "set-mail-switch"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      role: "switch",
      "aria-label": TC('adm_other_' + key),
      checked: analytics[key] === true,
      disabled: saving || loading || typeof analytics[key] !== 'boolean',
      onChange: event => setAnalytics(previous => ({
        ...previous,
        [key]: event.target.checked
      }))
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    })))), /*#__PURE__*/React.createElement("div", {
      className: "adm-other-billing"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-other-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-other-copy"
    }, /*#__PURE__*/React.createElement("h2", {
      id: "adm-book-data-mode-label"
    }, TC('adm_other_billing_title')), /*#__PURE__*/React.createElement("p", {
      id: "adm-book-data-mode-note"
    }, TC(billingMode ? 'adm_other_billing_' + billingMode + '_note' : 'adm_other_billing_unavailable'))), /*#__PURE__*/React.createElement("select", {
      className: "adm-other-mode",
      "aria-labelledby": "adm-book-data-mode-label",
      "aria-describedby": "adm-book-data-mode-note",
      value: billingMode,
      disabled: saving || loading || !billingMode,
      onChange: event => setBillingMode(event.target.value)
    }, !billingMode ? /*#__PURE__*/React.createElement("option", {
      value: ""
    }, TC('adm_other_billing_unavailable')) : null, billingModes.map(mode => /*#__PURE__*/React.createElement("option", {
      key: mode,
      value: mode
    }, TC('adm_other_billing_' + mode)))))), error ? /*#__PURE__*/React.createElement("div", {
      className: "adm-other-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), conflict ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: loading || saving,
      onClick: load
    }, TC('adm_other_reload')) : null) : null, /*#__PURE__*/React.createElement("footer", {
      className: "adm-other-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      disabled: !dirty || saving || loading,
      onClick: () => applyValue(saved)
    }, TC('adm_reset')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      disabled: !dirty || saving || loading,
      onClick: save
    }, saving ? TC('adm_other_saving') : TC('adm_other_save'))));
  }
  function AdminOtherSettingsTab({
    toast
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-other-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-other-heading"
    }, /*#__PURE__*/React.createElement("h1", null, TC('adm_other_title'))), /*#__PURE__*/React.createElement(GeneralSettingsSection, {
      toast: toast
    }), /*#__PURE__*/React.createElement(PaymentChannelsSection, {
      toast: toast
    }), /*#__PURE__*/React.createElement(RegistrationAccessSection, {
      toast: toast
    }), /*#__PURE__*/React.createElement(window.AdminReportingKeysPanel, {
      toast: toast
    }));
  }
  window.AdminOtherSettingsTab = AdminOtherSettingsTab;
})();
}
