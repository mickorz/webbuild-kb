{
(function () {
  const {
    useCallback,
    useEffect,
    useState
  } = React;
  const TC = window.TC;
  const emptyDraft = () => ({
    title: '',
    body: '',
    level: 'info',
    published: true,
    publish_at: '',
    expires_at: ''
  });
  function toLocalInput(value) {
    if (!value) return '';
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
  function toApiDate(value) {
    return value ? new Date(value).toISOString() : null;
  }
  function AnnouncementManager({
    toast
  }) {
    const [items, setItems] = useState([]);
    const [draft, setDraft] = useState(emptyDraft);
    const [editingId, setEditingId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const load = useCallback(() => {
      setLoading(true);
      setError('');
      return window.LF_API.adminPublicApiAnnouncements(100).then(setItems).catch(loadError => setError(loadError.message || TC('adm_public_ann_load_failed'))).finally(() => setLoading(false));
    }, []);
    useEffect(() => {
      load();
    }, [load]);
    const update = (key, value) => setDraft(current => Object.assign({}, current, {
      [key]: value
    }));
    const reset = () => {
      setDraft(emptyDraft());
      setEditingId('');
      setError('');
    };
    const edit = item => {
      setEditingId(item.id);
      setDraft({
        title: item.title,
        body: item.body,
        level: item.level,
        published: item.published,
        publish_at: toLocalInput(item.publish_at),
        expires_at: toLocalInput(item.expires_at)
      });
    };
    const save = async () => {
      if (saving || !draft.title.trim() || !draft.body.trim()) return;
      setSaving(true);
      setError('');
      const payload = {
        title: draft.title.trim(),
        body: draft.body.trim(),
        level: draft.level,
        published: draft.published,
        publish_at: toApiDate(draft.publish_at),
        expires_at: toApiDate(draft.expires_at)
      };
      try {
        if (editingId) await window.LF_API.adminUpdatePublicApiAnnouncement(editingId, payload);else await window.LF_API.adminCreatePublicApiAnnouncement(payload);
        toast(TC('adm_public_ann_saved'));
        reset();
        await load();
      } catch (saveError) {
        setError(saveError.message || TC('adm_public_ann_save_failed'));
      } finally {
        setSaving(false);
      }
    };
    const remove = async item => {
      if (!window.confirm(TC('adm_public_ann_delete_confirm'))) return;
      setError('');
      try {
        await window.LF_API.adminDeletePublicApiAnnouncement(item.id);
        if (editingId === item.id) reset();
        await load();
      } catch (deleteError) {
        setError(deleteError.message || TC('adm_public_ann_delete_failed'));
      }
    };
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-public-section adm-public-announcements"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-public-section-title"
    }, /*#__PURE__*/React.createElement("h2", null, TC('adm_public_ann_title')), /*#__PURE__*/React.createElement("p", null, TC('adm_public_ann_boundary'))), error && /*#__PURE__*/React.createElement("div", {
      className: "adm-public-error",
      role: "alert"
    }, error), /*#__PURE__*/React.createElement("div", {
      className: "adm-public-ann-editor"
    }, /*#__PURE__*/React.createElement("label", {
      className: "adm-public-field wide"
    }, /*#__PURE__*/React.createElement("span", null, TC('adm_public_ann_subject')), /*#__PURE__*/React.createElement("input", {
      value: draft.title,
      maxLength: "255",
      onChange: event => update('title', event.target.value)
    })), /*#__PURE__*/React.createElement("label", {
      className: "adm-public-field wide"
    }, /*#__PURE__*/React.createElement("span", null, TC('adm_public_ann_body')), /*#__PURE__*/React.createElement("textarea", {
      value: draft.body,
      maxLength: "4000",
      onChange: event => update('body', event.target.value)
    })), /*#__PURE__*/React.createElement("label", {
      className: "adm-public-field"
    }, /*#__PURE__*/React.createElement("span", null, TC('adm_public_ann_level')), /*#__PURE__*/React.createElement("select", {
      value: draft.level,
      onChange: event => update('level', event.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: "info"
    }, TC('adm_public_ann_info')), /*#__PURE__*/React.createElement("option", {
      value: "maintenance"
    }, TC('adm_public_ann_maintenance')), /*#__PURE__*/React.createElement("option", {
      value: "warning"
    }, TC('adm_public_ann_warning')))), /*#__PURE__*/React.createElement("label", {
      className: "adm-public-field"
    }, /*#__PURE__*/React.createElement("span", null, TC('adm_public_ann_publish_at')), /*#__PURE__*/React.createElement("input", {
      type: "datetime-local",
      value: draft.publish_at,
      onChange: event => update('publish_at', event.target.value)
    })), /*#__PURE__*/React.createElement("label", {
      className: "adm-public-field"
    }, /*#__PURE__*/React.createElement("span", null, TC('adm_public_ann_expires_at')), /*#__PURE__*/React.createElement("input", {
      type: "datetime-local",
      value: draft.expires_at,
      onChange: event => update('expires_at', event.target.value)
    })), /*#__PURE__*/React.createElement("label", {
      className: "adm-public-ann-published"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: draft.published,
      onChange: event => update('published', event.target.checked)
    }), /*#__PURE__*/React.createElement("span", null, TC('adm_public_ann_published')))), /*#__PURE__*/React.createElement("div", {
      className: "adm-public-ann-actions"
    }, editingId && /*#__PURE__*/React.createElement("button", {
      className: "c-btn",
      onClick: reset
    }, TC('adm_public_ann_cancel_edit')), /*#__PURE__*/React.createElement("button", {
      className: "c-btn primary",
      disabled: saving || !draft.title.trim() || !draft.body.trim(),
      onClick: save
    }, saving ? TC('adm_public_ann_saving') : editingId ? TC('adm_public_ann_update') : TC('adm_public_ann_create'))), /*#__PURE__*/React.createElement("div", {
      className: "adm-public-ann-list"
    }, /*#__PURE__*/React.createElement("h3", null, TC('adm_public_ann_history')), loading && !items.length && /*#__PURE__*/React.createElement("p", {
      className: "adm-public-ann-empty"
    }, TC('set_loading')), !loading && !items.length && /*#__PURE__*/React.createElement("p", {
      className: "adm-public-ann-empty"
    }, TC('adm_public_ann_empty')), items.map(item => /*#__PURE__*/React.createElement("article", {
      key: item.id,
      className: 'adm-public-ann-item ' + item.level
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, item.published ? TC('adm_public_ann_live') : TC('adm_public_ann_draft')), /*#__PURE__*/React.createElement("h4", null, item.title), /*#__PURE__*/React.createElement("p", null, item.body), /*#__PURE__*/React.createElement("small", null, item.publish_at ? TC('adm_public_ann_scheduled') + ' ' + new Date(item.publish_at).toLocaleString() : TC('adm_public_ann_immediate'), item.expires_at ? ' · ' + TC('adm_public_ann_expires') + ' ' + new Date(item.expires_at).toLocaleString() : '')), /*#__PURE__*/React.createElement("div", {
      className: "adm-public-ann-item-actions"
    }, /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      onClick: () => edit(item)
    }, TC('adm_public_ann_edit')), /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      onClick: () => remove(item)
    }, TC('adm_public_ann_delete')))))));
  }
  window.AdminPublicApiAnnouncements = AnnouncementManager;
})();
}
