{
/* ===== API Key management (session-only settings surface) ===== */
const {
  useEffect: kUseEffect,
  useRef: kUseRef,
  useState: kUseState
} = React;
const KTC = window.TC;
const API_KEY_SCOPES = [{
  value: 'novel:read',
  label: 'key_scope_read'
}, {
  value: 'novel:write',
  label: 'key_scope_write'
}, {
  value: 'novel:generate',
  label: 'key_scope_generate'
}, {
  value: 'assistant:invoke',
  label: 'key_scope_assistant'
}];
function ApiKeysPanel({
  toast
}) {
  const en = window.CLANG === 'en';
  const [keys, setKeys] = kUseState([]);
  const [loading, setLoading] = kUseState(true);
  const [loadError, setLoadError] = kUseState(null);
  const [busy, setBusy] = kUseState(false);
  const [revokingId, setRevokingId] = kUseState(null);
  const [name, setName] = kUseState('');
  const [scopes, setScopes] = kUseState(['novel:read']);
  const [expiryDays, setExpiryDays] = kUseState('90');
  const [createdKey, setCreatedKey] = kUseState(null);
  const loadSequence = kUseRef(0);
  const revealRef = kUseRef(null);
  const load = async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await window.LF_API.apiKeys();
      if (sequence !== loadSequence.current) return;
      setKeys(Array.isArray(rows) ? rows : []);
    } catch (err) {
      if (sequence !== loadSequence.current) return;
      const message = err.message || KTC('key_load_error');
      setLoadError(message);
      toast(message);
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  };
  kUseEffect(() => {
    load();
  }, []);
  kUseEffect(() => {
    if (createdKey && revealRef.current) revealRef.current.focus();
  }, [createdKey]);
  const toggleScope = scope => {
    setScopes(current => {
      if (current.includes(scope)) return current.filter(item => item !== scope);
      if (scope === 'assistant:invoke') {
        return current.filter(item => !['novel:write', 'novel:generate'].includes(item)).concat(scope);
      }
      const next = ['novel:write', 'novel:generate'].includes(scope) ? current.filter(item => item !== 'assistant:invoke') : current.slice();
      return next.concat(scope);
    });
  };
  const createKey = async event => {
    event.preventDefault();
    if (busy || loading || loadError || revokingId || createdKey) return;
    const cleanName = name.trim();
    if (!cleanName) {
      toast(KTC('key_name_required'));
      return;
    }
    if (!scopes.length) {
      toast(KTC('key_scope_required'));
      return;
    }
    const expiresAt = new Date(Date.now() + Number(expiryDays) * 86400000).toISOString();
    loadSequence.current += 1;
    setBusy(true);
    try {
      const created = await window.LF_API.createApiKey({
        name: cleanName,
        scopes,
        expires_at: expiresAt
      });
      const {
        api_key: rawKey,
        ...keyMetadata
      } = created;
      if (!rawKey) throw new Error(KTC('key_missing_value'));
      setCreatedKey(rawKey);
      setName('');
      setScopes(['novel:read']);
      setExpiryDays('90');
      setKeys(current => [keyMetadata].concat(current.filter(item => item.id !== keyMetadata.id)));
    } catch (err) {
      toast(err.message || KTC('key_create_error'));
    } finally {
      setBusy(false);
    }
  };
  const revokeKey = async key => {
    if (busy || revokingId || createdKey) return;
    const confirmed = window.confirm(KTC('key_revoke_confirm').replace('{name}', key.name));
    if (!confirmed) return;
    loadSequence.current += 1;
    setRevokingId(key.id);
    try {
      await window.LF_API.revokeApiKey(key.id);
      setKeys(current => current.map(item => item.id === key.id ? {
        ...item,
        is_active: false,
        revoked_at: new Date().toISOString()
      } : item));
    } catch (err) {
      toast(err.message || KTC('key_revoke_error'));
    } finally {
      setRevokingId(null);
    }
  };
  const copyCreatedKey = async () => {
    try {
      await navigator.clipboard.writeText(createdKey);
      toast(KTC('key_copied'));
    } catch (err) {
      toast(KTC('key_copy_error'));
    }
  };
  const formatTime = value => value ? new Intl.DateTimeFormat(en ? 'en' : 'zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value)) : KTC('key_never');
  const keyState = key => {
    if (!key.is_active || key.revoked_at) {
      return {
        cls: 'revoked',
        label: KTC('key_status_revoked')
      };
    }
    if (key.expires_at && new Date(key.expires_at).getTime() <= Date.now()) {
      return {
        cls: 'expired',
        label: KTC('key_status_expired')
      };
    }
    return {
      cls: 'active',
      label: KTC('key_status_active')
    };
  };
  const mutationBusy = busy || Boolean(revokingId);
  const createBlocked = mutationBusy || loading || Boolean(loadError) || Boolean(createdKey);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "set-panel-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "set-panel-t"
  }, KTC('set_api_keys')), /*#__PURE__*/React.createElement("p", {
    className: "set-panel-d"
  }, KTC('key_intro')))), createdKey && /*#__PURE__*/React.createElement("div", {
    className: "set-key-reveal"
  }, /*#__PURE__*/React.createElement("div", {
    id: "set-key-reveal-note",
    role: "status"
  }, /*#__PURE__*/React.createElement("strong", null, KTC('key_reveal_title')), /*#__PURE__*/React.createElement("p", null, KTC('key_reveal_note'))), /*#__PURE__*/React.createElement("textarea", {
    ref: revealRef,
    readOnly: true,
    rows: "2",
    value: createdKey,
    "aria-label": KTC('key_new_label'),
    "aria-describedby": "set-key-reveal-note",
    onFocus: event => event.target.select()
  }), /*#__PURE__*/React.createElement("div", {
    className: "set-key-reveal-actions"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn gold sm",
    onClick: copyCreatedKey
  }, KTC('key_copy')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn sm",
    onClick: () => setCreatedKey(null)
  }, KTC('key_saved')))), /*#__PURE__*/React.createElement("form", {
    className: "set-key-create",
    onSubmit: createKey,
    "aria-busy": busy
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-key-create-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, KTC('key_create_title')), /*#__PURE__*/React.createElement("p", null, KTC('key_create_note'))), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "c-btn gold sm",
    disabled: createBlocked
  }, busy ? KTC('key_creating') : KTC('key_create'))), /*#__PURE__*/React.createElement("div", {
    className: "set-key-fields"
  }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, KTC('key_name')), /*#__PURE__*/React.createElement("input", {
    value: name,
    maxLength: "120",
    disabled: createBlocked,
    onChange: event => setName(event.target.value),
    placeholder: KTC('key_name_placeholder')
  })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, KTC('key_expiry')), /*#__PURE__*/React.createElement("select", {
    value: expiryDays,
    disabled: createBlocked,
    onChange: event => setExpiryDays(event.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "30"
  }, KTC('key_expiry_30')), /*#__PURE__*/React.createElement("option", {
    value: "90"
  }, KTC('key_expiry_90')), /*#__PURE__*/React.createElement("option", {
    value: "365"
  }, KTC('key_expiry_365'))))), /*#__PURE__*/React.createElement("fieldset", {
    className: "set-key-scopes",
    disabled: createBlocked
  }, /*#__PURE__*/React.createElement("legend", null, KTC('key_permissions')), API_KEY_SCOPES.map(scope => /*#__PURE__*/React.createElement("label", {
    key: scope.value
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: scopes.includes(scope.value),
    onChange: () => toggleScope(scope.value)
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, KTC(scope.label)), /*#__PURE__*/React.createElement("code", null, scope.value)))))), /*#__PURE__*/React.createElement("div", {
    className: "set-key-list-head"
  }, /*#__PURE__*/React.createElement("h3", null, KTC('key_existing')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn sm",
    onClick: load,
    disabled: loading || mutationBusy || Boolean(createdKey)
  }, KTC('key_refresh'))), loading ? /*#__PURE__*/React.createElement("div", {
    className: "set-key-empty"
  }, KTC('key_loading')) : loadError ? /*#__PURE__*/React.createElement("div", {
    className: "set-key-empty",
    role: "alert"
  }, /*#__PURE__*/React.createElement("p", null, KTC('key_load_error')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn sm",
    onClick: load
  }, KTC('key_retry'))) : keys.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "set-key-empty"
  }, KTC('key_empty')) : /*#__PURE__*/React.createElement("div", {
    className: "set-key-list",
    "aria-busy": Boolean(revokingId)
  }, keys.map(key => {
    const state = keyState(key);
    return /*#__PURE__*/React.createElement("article", {
      className: "set-key-row",
      key: key.id
    }, /*#__PURE__*/React.createElement("div", {
      className: "set-key-title"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, key.name), /*#__PURE__*/React.createElement("code", null, key.key_prefix, "...")), /*#__PURE__*/React.createElement("span", {
      className: 'set-key-state ' + state.cls
    }, state.label)), /*#__PURE__*/React.createElement("div", {
      className: "set-key-meta"
    }, /*#__PURE__*/React.createElement("span", null, KTC('key_scopes'), ": ", (key.scopes || []).join(', ') || '-'), /*#__PURE__*/React.createElement("span", null, KTC('key_expires'), ": ", formatTime(key.expires_at)), /*#__PURE__*/React.createElement("span", null, KTC('key_last_used'), ": ", formatTime(key.last_used_at))), state.cls === 'active' && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn danger-outline sm",
      disabled: mutationBusy || Boolean(createdKey),
      onClick: () => revokeKey(key)
    }, revokingId === key.id ? KTC('key_revoking') : KTC('key_revoke')));
  })));
}
window.ApiKeysPanel = ApiKeysPanel;
}
