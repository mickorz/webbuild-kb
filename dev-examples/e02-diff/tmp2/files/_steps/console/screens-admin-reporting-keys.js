{
(function () {
  const {
    useCallback,
    useEffect,
    useRef,
    useState
  } = React;
  const endpoint = '/api/admin/reporting-keys';
  const copy = (zh, en) => window.CLANG === 'en' ? en : zh;
  function AdminReportingKeysPanel({
    toast
  }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [revealed, setRevealed] = useState(null);
    const [revoking, setRevoking] = useState(null);
    const sequence = useRef(0);
    const locked = useRef(false);
    const mounted = useRef(false);
    const secretInput = useRef(null);
    const nameInput = useRef(null);
    const hadRevealed = useRef(false);
    const focusAfterRevoke = useRef(false);
    const DataTable = window.AdminDataTable;
    const Dialog = window.ConfirmDialog;
    const load = useCallback(async () => {
      const current = ++sequence.current;
      setLoading(true);
      setError('');
      try {
        const values = await window.LF_API.request(endpoint);
        if (!mounted.current || sequence.current !== current) return;
        if (!Array.isArray(values)) throw new Error(copy('密钥列表格式无效', 'Invalid key list'));
        setRows(values);
      } catch (failure) {
        if (mounted.current && sequence.current === current) setError(failure.message);
      } finally {
        if (mounted.current && sequence.current === current) setLoading(false);
      }
    }, []);
    useEffect(() => {
      mounted.current = true;
      load();
      return () => {
        mounted.current = false;
        sequence.current += 1;
      };
    }, [load]);
    useEffect(() => {
      if (revealed) secretInput.current?.focus();else if (hadRevealed.current) nameInput.current?.focus();
      hadRevealed.current = !!revealed;
    }, [revealed]);
    useEffect(() => {
      if (!revoking && !busy && focusAfterRevoke.current) {
        nameInput.current?.focus();
        focusAfterRevoke.current = false;
      }
    }, [revoking, busy]);
    const create = async event => {
      event.preventDefault();
      if (locked.current || loading || error || revealed || !name.trim()) return;
      locked.current = true;
      setBusy(true);
      setError('');
      const current = ++sequence.current;
      try {
        const result = await window.LF_API.request(endpoint, {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim()
          })
        });
        if (!mounted.current || sequence.current !== current) return;
        const {
          api_key: secret,
          ...metadata
        } = result;
        if (!secret) throw new Error(copy('未收到完整密钥，请核对列表后撤销该密钥', 'Key value missing. Check the list and revoke this key.'));
        setRows(previous => [metadata, ...previous.filter(row => row.id !== metadata.id)]);
        setRevealed({
          id: metadata.id,
          secret
        });
        setName('');
      } catch (failure) {
        if (mounted.current && sequence.current === current) setError(failure.message);
      } finally {
        locked.current = false;
        if (mounted.current && sequence.current === current) setBusy(false);
      }
    };
    const revoke = async () => {
      if (!revoking || locked.current) return;
      locked.current = true;
      setBusy(true);
      setError('');
      const current = ++sequence.current;
      try {
        await window.LF_API.request(endpoint + '/' + encodeURIComponent(revoking.id), {
          method: 'DELETE'
        });
        if (!mounted.current || sequence.current !== current) return;
        setRows(previous => previous.map(row => row.id === revoking.id ? {
          ...row,
          revoked_at: new Date().toISOString()
        } : row));
        focusAfterRevoke.current = true;
        setRevoking(null);
      } catch (failure) {
        if (mounted.current && sequence.current === current) setError(failure.message);
      } finally {
        locked.current = false;
        if (mounted.current && sequence.current === current) setBusy(false);
      }
    };
    const copySecret = async () => {
      try {
        await navigator.clipboard.writeText(revealed.secret);
        toast(copy('密钥已复制', 'Key copied'));
      } catch {
        toast(copy('复制失败，请选中密钥手动复制', 'Copy failed. Select and copy the key manually.'));
      }
    };
    const dismissSecret = () => {
      setRevealed(null);
    };
    const stamp = value => value ? new Intl.DateTimeFormat(window.CLANG === 'en' ? 'en' : 'zh-CN', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(value)) : copy('尚未使用', 'Never used');
    const columns = [{
      key: 'name',
      header: copy('名称', 'Name'),
      priority: 'primary',
      render: row => row.name
    }, {
      key: 'key_prefix',
      header: copy('前缀', 'Prefix'),
      render: row => /*#__PURE__*/React.createElement("code", null, row.key_prefix, "\u2026")
    }, {
      key: 'created_at',
      header: copy('创建时间', 'Created'),
      sortValue: row => Date.parse(row.created_at),
      render: row => stamp(row.created_at)
    }, {
      key: 'last_used_at',
      header: copy('最后使用', 'Last used'),
      sortValue: row => row.last_used_at ? Date.parse(row.last_used_at) : 0,
      render: row => stamp(row.last_used_at)
    }, {
      key: 'actions',
      header: copy('操作', 'Actions'),
      sortable: false,
      render: row => row.revoked_at ? /*#__PURE__*/React.createElement("span", null, copy('已撤销', 'Revoked')) : /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm danger",
        disabled: busy || loading || !!revealed,
        "aria-label": copy('撤销密钥：', 'Revoke key: ') + row.name,
        onClick: () => {
          setError('');
          setRevoking(row);
        }
      }, copy('撤销', 'Revoke'))
    }];
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-reporting-keys"
    }, /*#__PURE__*/React.createElement("h2", null, copy('数据接口密钥', 'Reporting API keys')), /*#__PURE__*/React.createElement("p", {
      className: "adm-reporting-permission"
    }, copy('可读取全部用户资料（含完整邮箱）和财务流水。', 'Can read all user records, including full email addresses, and financial ledger entries.')), /*#__PURE__*/React.createElement("form", {
      onSubmit: create,
      className: "adm-reporting-create"
    }, /*#__PURE__*/React.createElement("label", {
      htmlFor: "reporting-key-name"
    }, copy('名称', 'Name')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
      id: "reporting-key-name",
      ref: nameInput,
      value: name,
      maxLength: 120,
      required: true,
      autoComplete: "off",
      disabled: busy || loading || !!revealed,
      onChange: event => setName(event.target.value)
    }), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn primary sm",
      disabled: busy || loading || !!error || !!revealed || !name.trim()
    }, busy && !revoking ? copy('创建中…', 'Creating…') : copy('创建密钥', 'Create key')))), revealed && /*#__PURE__*/React.createElement("div", {
      className: "adm-reporting-secret"
    }, /*#__PURE__*/React.createElement("label", {
      htmlFor: "reporting-key-secret"
    }, copy('完整密钥仅显示一次，请保存后关闭。', 'The full key is shown once. Save it before closing.')), /*#__PURE__*/React.createElement("input", {
      id: "reporting-key-secret",
      ref: secretInput,
      value: revealed.secret,
      readOnly: true,
      autoComplete: "off",
      spellCheck: false
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: copySecret
    }, copy('复制密钥', 'Copy key')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: dismissSecret
    }, copy('已保存，关闭', 'Saved, close')))), error && !revoking && /*#__PURE__*/React.createElement("div", {
      className: "adm-reporting-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: load
    }, copy('重新加载', 'Reload'))), /*#__PURE__*/React.createElement(DataTable, {
      rows: rows,
      columns: columns,
      rowKey: "id",
      loading: loading,
      pageSize: 10,
      compact: true,
      ariaLabel: copy('数据接口密钥', 'Reporting API keys'),
      empty: copy('暂无密钥', 'No keys yet')
    }), /*#__PURE__*/React.createElement(Dialog, {
      open: !!revoking,
      title: copy('撤销密钥', 'Revoke key'),
      message: revoking ? copy(`撤销“${revoking.name}”后，接入系统将立即无法使用此密钥。`, `Revoking “${revoking.name}” immediately prevents the connected system from using this key.`) : '',
      tone: "danger",
      icon: null,
      cancelLabel: copy('取消', 'Cancel'),
      confirmLabel: busy ? copy('撤销中…', 'Revoking…') : copy('撤销密钥', 'Revoke key'),
      confirmDisabled: busy,
      onClose: () => {
        if (!locked.current) {
          setRevoking(null);
          setError('');
        }
      },
      onConfirm: revoke
    }, error && /*#__PURE__*/React.createElement("p", {
      role: "alert"
    }, error)));
  }
  window.AdminReportingKeysPanel = AdminReportingKeysPanel;
})();
}
