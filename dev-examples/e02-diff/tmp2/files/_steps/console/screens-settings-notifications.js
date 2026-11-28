{
/* ===== 消息通知设置：站内信 + 邮件 ===== */
(function () {
  const {
    useCallback,
    useEffect,
    useRef,
    useState
  } = React;
  const TC = window.TC;
  const DATA = window.CONSOLE_DATA;
  const TASK_ROWS = [{
    key: 'world_build',
    stage: 'set_msg_stage_book',
    name: 'set_msg_task_world'
  }, {
    key: 'character',
    stage: 'set_msg_stage_book',
    name: 'set_msg_task_character'
  }, {
    key: 'story_plan',
    stage: 'set_msg_stage_book',
    name: 'set_msg_task_story'
  }, {
    key: 'outline',
    stage: 'set_msg_stage_book',
    name: 'set_msg_task_outline'
  }, {
    key: 'chapter_world_state',
    stage: 'set_msg_stage_chapter',
    name: 'set_msg_task_world_state'
  }, {
    key: 'chapter_outline',
    stage: 'set_msg_stage_chapter',
    name: 'set_msg_task_chapter_outline'
  }, {
    key: 'chapter_character_state',
    stage: 'set_msg_stage_chapter',
    name: 'set_msg_task_character_state'
  }, {
    key: 'chapter_draft',
    stage: 'set_msg_stage_chapter',
    name: 'set_msg_task_draft'
  }, {
    key: 'polish',
    stage: 'set_msg_stage_chapter',
    name: 'set_msg_task_polish'
  }, {
    key: 'post_hoc',
    stage: 'set_msg_stage_chapter',
    name: 'set_msg_task_post_hoc'
  }, {
    key: 'field_rewrite',
    stage: 'set_msg_stage_other',
    name: 'set_msg_task_rewrite'
  }, {
    key: 'other',
    stage: 'set_msg_stage_other',
    name: 'set_msg_task_other'
  }];
  function taskRowName(row) {
    return TC('set_msg_stage_task').replace('{stage}', TC(row.stage)).replace('{task}', TC(row.name));
  }
  function NotificationSwitch({
    name,
    checked,
    mixed = false,
    disabled,
    onChange
  }) {
    const inputRef = useRef(null);
    useEffect(() => {
      if (inputRef.current) inputRef.current.indeterminate = mixed;
    }, [mixed]);
    return /*#__PURE__*/React.createElement("label", {
      className: "set-mail-switch"
    }, /*#__PURE__*/React.createElement("input", {
      ref: inputRef,
      type: "checkbox",
      role: mixed ? 'checkbox' : 'switch',
      "aria-checked": mixed ? 'mixed' : checked,
      "aria-label": name,
      checked: checked,
      disabled: disabled,
      onChange: event => onChange(event.target.checked)
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }));
  }
  function Unavailable({
    compact = false
  }) {
    return /*#__PURE__*/React.createElement("span", {
      className: 'set-channel-na' + (compact ? ' compact' : ''),
      title: TC('set_msg_email_unsupported')
    }, compact ? '—' : TC('set_msg_unsupported'));
  }
  function PreferenceRow({
    name,
    desc,
    inApp,
    email,
    child = false
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: 'set-notification-row' + (child ? ' is-child' : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "set-notification-copy"
    }, /*#__PURE__*/React.createElement("div", {
      className: "pname"
    }, name), desc ? /*#__PURE__*/React.createElement("div", {
      className: "pdesc"
    }, desc) : null), /*#__PURE__*/React.createElement("div", {
      className: "set-channel-cell"
    }, inApp), /*#__PURE__*/React.createElement("div", {
      className: "set-channel-cell"
    }, email));
  }
  function TaskPreferenceGroup({
    eventKey,
    name,
    desc,
    values,
    saving,
    onToggle,
    onToggleAll
  }) {
    const [expanded, setExpanded] = useState(false);
    const enabledCount = TASK_ROWS.filter(row => values[row.key]).length;
    const allEnabled = enabledCount === TASK_ROWS.length;
    const mixed = enabledCount > 0 && !allEnabled;
    const regionId = `notification-${eventKey}-types`;
    return /*#__PURE__*/React.createElement("div", {
      className: "set-notification-task-group"
    }, /*#__PURE__*/React.createElement("div", {
      className: "set-notification-row is-parent"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "set-notification-expand",
      "aria-expanded": expanded,
      "aria-controls": regionId,
      onClick: () => setExpanded(value => !value)
    }, /*#__PURE__*/React.createElement("svg", {
      className: expanded ? 'open' : '',
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9 6l6 6-6 6"
    })), /*#__PURE__*/React.createElement("span", {
      className: "set-notification-copy"
    }, /*#__PURE__*/React.createElement("span", {
      className: "pname"
    }, name), /*#__PURE__*/React.createElement("span", {
      className: "pdesc"
    }, desc))), /*#__PURE__*/React.createElement("div", {
      className: "set-channel-cell"
    }, /*#__PURE__*/React.createElement(NotificationSwitch, {
      name: `${name} · ${TC('set_msg_in_app')}`,
      checked: allEnabled,
      mixed: mixed,
      disabled: !!saving,
      onChange: checked => onToggleAll(eventKey, checked)
    })), /*#__PURE__*/React.createElement("div", {
      className: "set-channel-cell"
    }, /*#__PURE__*/React.createElement(Unavailable, null))), expanded ? /*#__PURE__*/React.createElement("div", {
      id: regionId,
      className: "set-notification-children"
    }, TASK_ROWS.map(row => {
      const rowName = taskRowName(row);
      return /*#__PURE__*/React.createElement(PreferenceRow, {
        key: row.key,
        name: rowName,
        child: true,
        inApp: /*#__PURE__*/React.createElement(NotificationSwitch, {
          name: `${name} · ${rowName} · ${TC('set_msg_in_app')}`,
          checked: !!values[row.key],
          disabled: !!saving,
          onChange: checked => onToggle(eventKey, row.key, checked)
        }),
        email: /*#__PURE__*/React.createElement(Unavailable, {
          compact: true
        })
      });
    })) : null);
  }
  function MessageNotificationsPanel({
    toast
  }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState('');
    const load = useCallback(() => {
      setError('');
      window.LF_API.getMessageNotificationSettings().then(setData).catch(err => {
        setError(err.message || TC('set_msg_load_error'));
      });
    }, []);
    useEffect(() => {
      load();
    }, [load]);
    const savePatch = async (key, patch) => {
      if (saving) return;
      setSaving(key);
      try {
        const updated = await window.LF_API.updateMessageNotificationSettings(patch);
        setData(updated);
        toast(TC('set_msg_saved'));
      } catch (err) {
        toast(err.message || TC('set_msg_load_error'));
      } finally {
        setSaving('');
      }
    };
    const toggleTask = (eventKey, taskKey, checked) => savePatch(`${eventKey}:${taskKey}`, {
      in_app_preferences: {
        [eventKey]: {
          [taskKey]: checked
        }
      }
    });
    const toggleAllTasks = (eventKey, checked) => savePatch(`${eventKey}:all`, {
      in_app_preferences: {
        [eventKey]: Object.fromEntries(TASK_ROWS.map(row => [row.key, checked]))
      }
    });
    const toggle = (group, key, checked) => savePatch(`${group}:${key}`, {
      [group]: {
        [key]: checked
      }
    });
    if (error) return /*#__PURE__*/React.createElement("div", {
      className: "set-card set-mail-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: load
    }, TC('set_msg_retry')));
    if (!data) return /*#__PURE__*/React.createElement("div", {
      className: "set-card c-shimmer"
    }, TC('set_loading'));
    const inApp = data.in_app_preferences || {};
    const email = data.email_preferences || {};
    const adminInApp = data.admin_in_app_preferences || {};
    const adminEmail = data.admin_email_preferences || {};
    const row = (key, nameKey, descKey, inAppGroup = 'in_app_preferences', emailGroup = 'email_preferences') => {
      const name = TC(nameKey);
      const inAppValues = inAppGroup === 'in_app_preferences' ? inApp : adminInApp;
      const emailValues = emailGroup === 'email_preferences' ? email : adminEmail;
      return /*#__PURE__*/React.createElement(PreferenceRow, {
        key: key,
        name: name,
        desc: TC(descKey),
        inApp: /*#__PURE__*/React.createElement(NotificationSwitch, {
          name: `${name} · ${TC('set_msg_in_app')}`,
          checked: !!inAppValues[key],
          disabled: !!saving,
          onChange: checked => toggle(inAppGroup, key, checked)
        }),
        email: /*#__PURE__*/React.createElement(NotificationSwitch, {
          name: `${name} · ${TC('set_msg_email')}`,
          checked: !!emailValues[key],
          disabled: !!saving,
          onChange: checked => toggle(emailGroup, key, checked)
        })
      });
    };
    const globalEmailEnabled = data.notification_emails_enabled ?? data.email_service_enabled;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "set-panel-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      className: "set-panel-t"
    }, TC('set_notifications')), /*#__PURE__*/React.createElement("p", {
      className: "set-panel-d"
    }, TC('set_msg_sub'), " ", /*#__PURE__*/React.createElement("span", {
      className: "mono"
    }, data.email)))), !globalEmailEnabled ? /*#__PURE__*/React.createElement("div", {
      className: "set-mail-status",
      role: "status"
    }, TC('set_mail_disabled')) : null, /*#__PURE__*/React.createElement("div", {
      className: "set-notification-table"
    }, /*#__PURE__*/React.createElement("div", {
      className: "set-notification-header",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("span", null, TC('set_msg_event')), /*#__PURE__*/React.createElement("span", null, TC('set_msg_in_app')), /*#__PURE__*/React.createElement("span", null, TC('set_msg_email'))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, TC('set_msg_creative')), /*#__PURE__*/React.createElement("div", {
      className: "set-notification-rows"
    }, /*#__PURE__*/React.createElement(TaskPreferenceGroup, {
      eventKey: "task_completed",
      name: TC('set_msg_task_done'),
      desc: TC('set_msg_task_done_d'),
      values: inApp.task_completed || {},
      saving: saving,
      onToggle: toggleTask,
      onToggleAll: toggleAllTasks
    }), /*#__PURE__*/React.createElement(TaskPreferenceGroup, {
      eventKey: "task_failed",
      name: TC('set_msg_task_failed'),
      desc: TC('set_msg_task_failed_d'),
      values: inApp.task_failed || {},
      saving: saving,
      onToggle: toggleTask,
      onToggleAll: toggleAllTasks
    }))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, TC('set_msg_cruise')), /*#__PURE__*/React.createElement("div", {
      className: "set-notification-rows"
    }, row('cruise_completed', 'set_msg_cruise_done', 'set_msg_cruise_done_d'), row('cruise_failed', 'set_msg_cruise_failed', 'set_msg_cruise_failed_d'))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, TC('set_msg_account')), /*#__PURE__*/React.createElement("div", {
      className: "set-notification-rows"
    }, row('low_balance', 'set_mail_low_balance', 'set_mail_low_balance_d'))), DATA.user.isAdmin && data.admin_in_app_preferences && data.admin_email_preferences ? /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, TC('set_mail_payment')), /*#__PURE__*/React.createElement("div", {
      className: "set-notification-rows"
    }, row('bishu_payment', 'set_mail_bishu_payment', 'set_mail_bishu_payment_d', 'admin_in_app_preferences', 'admin_email_preferences'), row('public_api_payment', 'set_mail_public_payment', 'set_mail_public_payment_d', 'admin_in_app_preferences', 'admin_email_preferences'))) : null));
  }
  window.MessageNotificationsPanel = MessageNotificationsPanel;
})();
}
