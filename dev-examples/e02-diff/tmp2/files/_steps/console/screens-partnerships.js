{
const {
  useCallback: pUseCallback,
  useEffect: pUseEffect,
  useMemo: pUseMemo,
  useRef: pUseRef,
  useState: pUseState
} = React;
const PartnerDataTable = window.AdminDataTable;
function pYuan(cents) {
  return '¥' + ((Number(cents) || 0) / 100).toFixed(2);
}
function pPercent(bps) {
  return ((Number(bps) || 0) / 100).toFixed(2).replace(/\.00$/, '') + '%';
}
function pDate(value) {
  return value ? new Date(value).toLocaleDateString(window.CLANG === 'en' ? 'en-US' : 'zh-CN') : '—';
}
function pStatus(value) {
  const en = window.CLANG === 'en';
  return {
    pending: en ? 'Pending' : '待结算',
    settled: en ? 'Settled' : '已结算',
    void: en ? 'Voided' : '已作废'
  }[value] || value;
}
function pMaintenanceStatus(value) {
  const en = window.CLANG === 'en';
  return {
    stable: en ? 'Stable' : '稳定创作',
    attention: en ? 'Follow up' : '需要维护',
    core: en ? 'Community core' : '社区核心'
  }[value] || value;
}
function PartnerSummaryCards({
  summary
}) {
  const en = window.CLANG === 'en';
  const rows = [[summary.invitee_count, en ? 'Attributed users' : '归因用户'], [summary.active_30d_pct == null ? '—' : summary.active_30d_pct + '%', en ? '30-day active' : '30 日活跃'], [summary.completed_build_count, en ? 'Completed first setup' : '完成首次建书'], [pYuan(summary.paid_order_cents), en ? 'Fulfilled payments' : '已履约充值'], [pYuan(summary.pending_commission_cents), en ? 'Pending commission' : '待结算返现']];
  return /*#__PURE__*/React.createElement("div", {
    className: "partner-metrics"
  }, rows.map(row => /*#__PURE__*/React.createElement("div", {
    key: row[1]
  }, /*#__PURE__*/React.createElement("strong", null, row[0]), /*#__PURE__*/React.createElement("span", null, row[1]))));
}
function PartnerLifecyclePanel({
  lifecycle
}) {
  const en = window.CLANG === 'en';
  const rows = [[en ? 'Attributed' : '注册归因', lifecycle.attributed], [en ? 'Started setup' : '开始建书', lifecycle.started_build], [en ? 'Completed setup' : '完成建书', lifecycle.completed_build], [en ? 'Writing' : '持续创作', lifecycle.sustained_writing], [en ? 'Paid' : '已付费', lifecycle.paid]];
  const maximum = Math.max(1, lifecycle.attributed);
  return /*#__PURE__*/React.createElement("section", {
    className: "partner-card partner-lifecycle"
  }, /*#__PURE__*/React.createElement("h2", null, en ? 'User lifecycle' : '用户生命周期'), /*#__PURE__*/React.createElement("div", null, rows.map((row, index) => /*#__PURE__*/React.createElement("div", {
    key: row[0],
    className: index === rows.length - 1 ? 'paid' : ''
  }, /*#__PURE__*/React.createElement("span", null, row[0]), /*#__PURE__*/React.createElement("strong", null, row[1]), /*#__PURE__*/React.createElement("i", {
    style: {
      width: Math.max(4, row[1] / maximum * 100) + '%'
    }
  })))));
}
function PartnerChangesPanel({
  summary
}) {
  const en = window.CLANG === 'en';
  const rows = [[en ? 'New attribution' : '新增归因', summary.attributed_30d_count], [en ? 'Active users' : '活跃用户', summary.active_30d_count], [en ? 'Paid users' : '充值用户', summary.paid_invitee_count]];
  return /*#__PURE__*/React.createElement("section", {
    className: "partner-card partner-changes"
  }, /*#__PURE__*/React.createElement("h2", null, en ? 'Last 30 days' : '近 30 天变化'), rows.map((row, index) => /*#__PURE__*/React.createElement("div", {
    key: row[0]
  }, /*#__PURE__*/React.createElement("span", null, row[0]), /*#__PURE__*/React.createElement("strong", null, row[1]), /*#__PURE__*/React.createElement("i", {
    className: 'spark spark-' + index
  }))));
}
function CommissionTable({
  rows,
  admin,
  onChanged,
  toast
}) {
  const en = window.CLANG === 'en';
  const [notes, setNotes] = pUseState({});
  const [busy, setBusy] = pUseState('');
  const change = async (row, action) => {
    const note = String(notes[row.id] || '').trim();
    if (!note) {
      toast(en ? 'Add a settlement note first' : '请先填写处理备注');
      return;
    }
    setBusy(row.id + action);
    try {
      if (action === 'settle') await window.LF_API.adminSettleCommission(row.id, note);else await window.LF_API.adminVoidCommission(row.id, note);
      setNotes(current => ({
        ...current,
        [row.id]: ''
      }));
      await onChanged();
      toast(en ? 'Saved' : '已保存');
    } catch (err) {
      toast(err.message || (en ? 'Save failed' : '保存失败'));
    } finally {
      setBusy('');
    }
  };
  if (!rows.length) return /*#__PURE__*/React.createElement("div", {
    className: "partner-empty"
  }, en ? 'No commission records yet.' : '暂无返现记录。');
  const columns = [...(admin ? [{
    key: 'partner',
    header: en ? 'Partner' : '合作商',
    sortable: false,
    value: row => row.partner_label
  }] : []), {
    key: 'user',
    header: en ? 'User' : '归因用户',
    priority: 'primary',
    sortable: false,
    value: row => row.invitee_label
  }, {
    key: 'paid',
    header: en ? 'Paid' : '充值',
    numeric: true,
    sortValue: row => row.order_amount_cents,
    render: row => pYuan(row.order_amount_cents)
  }, {
    key: 'rate',
    header: en ? 'Rate' : '比例',
    numeric: true,
    sortValue: row => row.commission_rate_bps,
    render: row => pPercent(row.commission_rate_bps)
  }, {
    key: 'commission',
    header: en ? 'Commission' : '返现',
    numeric: true,
    sortValue: row => row.commission_amount_cents,
    render: row => /*#__PURE__*/React.createElement("strong", null, pYuan(row.commission_amount_cents))
  }, {
    key: 'date',
    header: en ? 'Date' : '日期',
    sortValue: row => Date.parse(row.created_at),
    render: row => pDate(row.created_at)
  }, {
    key: 'status',
    header: en ? 'Status' : '状态',
    sortable: false,
    render: row => /*#__PURE__*/React.createElement("span", {
      className: 'partner-status ' + row.status
    }, pStatus(row.status))
  }, ...(admin ? [{
    key: 'settlement',
    header: en ? 'Settlement' : '人工处理',
    sortable: false,
    render: row => row.status === 'pending' ? /*#__PURE__*/React.createElement("div", {
      className: "partner-settle"
    }, /*#__PURE__*/React.createElement("input", {
      "aria-label": en ? 'Settlement note' : '处理备注',
      value: notes[row.id] || '',
      onChange: event => setNotes(current => ({
        ...current,
        [row.id]: event.target.value
      })),
      placeholder: en ? 'Payment note' : '付款凭证或作废原因',
      maxLength: "500"
    }), /*#__PURE__*/React.createElement("button", {
      disabled: !!busy,
      onClick: () => change(row, 'settle')
    }, busy === row.id + 'settle' ? '…' : en ? 'Settle' : '确认已返现'), /*#__PURE__*/React.createElement("button", {
      className: "void",
      disabled: !!busy,
      onClick: () => change(row, 'void')
    }, en ? 'Void' : '作废')) : /*#__PURE__*/React.createElement("span", {
      className: "partner-note"
    }, row.settlement_note || '—')
  }] : [])];
  return /*#__PURE__*/React.createElement(PartnerDataTable, {
    rows: rows,
    columns: columns,
    rowKey: "id",
    ariaLabel: en ? 'Commission records' : '返现记录',
    wrapClassName: "partner-table-wrap",
    className: "partner-table",
    compact: true
  });
}
function PartnerUserTable({
  users,
  admin,
  onUser,
  pagination
}) {
  const en = window.CLANG === 'en';
  const [statusFilter, setStatusFilter] = pUseState('all');
  const visibleUsers = pUseMemo(() => statusFilter === 'all' ? users : users.filter(user => user.maintenance_status === statusFilter), [statusFilter, users]);
  const columns = [{
    key: 'user',
    header: en ? 'User' : '用户',
    priority: 'primary',
    sortable: false,
    render: user => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, user.display_name), /*#__PURE__*/React.createElement("small", null, user.email_label))
  }, ...(admin ? [{
    key: 'partner',
    header: en ? 'Partner' : '合作商',
    sortable: false,
    value: user => user.partner_label || '—'
  }] : []), {
    key: 'registered',
    header: en ? 'Registered / active' : '注册 / 最近活跃',
    sortValue: user => Date.parse(user.registered_at),
    render: user => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, pDate(user.registered_at)), /*#__PURE__*/React.createElement("small", null, pDate(user.last_active_at)))
  }, {
    key: 'active',
    header: en ? '30-day active' : '30 日活跃',
    numeric: true,
    sortValue: user => user.active_days_30d,
    render: user => `${user.active_days_30d} ${en ? 'days' : '天'}`
  }, {
    key: 'creation',
    header: en ? 'Creation' : '创作',
    sortValue: user => user.chapter_count,
    render: user => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, user.book_count, " ", en ? 'books' : '本', " \xB7 ", user.chapter_count, " ", en ? 'chapters' : '章'), /*#__PURE__*/React.createElement("small", null, user.build_completed ? en ? 'Setup completed' : '已完成建书' : `${user.build_progress} / 4`))
  }, {
    key: 'paid',
    header: en ? 'Paid' : '充值',
    numeric: true,
    sortValue: user => user.paid_order_cents,
    render: user => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, pYuan(user.paid_order_cents)), /*#__PURE__*/React.createElement("small", null, user.order_count, " ", en ? 'orders' : '笔订单'))
  }, {
    key: 'rate',
    header: en ? 'Locked rate' : '锁定比例',
    numeric: true,
    sortValue: user => user.locked_commission_rate_bps,
    render: user => pPercent(user.locked_commission_rate_bps)
  }, {
    key: 'community',
    header: en ? 'Community' : '社区状态',
    sortable: false,
    render: user => /*#__PURE__*/React.createElement("span", {
      className: 'partner-maintenance ' + user.maintenance_status
    }, pMaintenanceStatus(user.maintenance_status))
  }, {
    key: 'action',
    header: '',
    sortable: false,
    render: user => /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => onUser(user)
    }, en ? 'View' : '查看')
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "partner-card partner-users"
  }, /*#__PURE__*/React.createElement("div", {
    className: "partner-section-head"
  }, /*#__PURE__*/React.createElement("h2", null, en ? 'Attributed users' : '归因用户'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("select", {
    "aria-label": en ? 'Community status' : '社区状态',
    value: statusFilter,
    onChange: event => setStatusFilter(event.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, en ? 'All statuses' : '全部状态'), /*#__PURE__*/React.createElement("option", {
    value: "attention"
  }, en ? 'Follow up' : '需要维护'), /*#__PURE__*/React.createElement("option", {
    value: "stable"
  }, en ? 'Stable' : '稳定创作'), /*#__PURE__*/React.createElement("option", {
    value: "core"
  }, en ? 'Community core' : '社区核心')))), /*#__PURE__*/React.createElement(PartnerDataTable, {
    rows: visibleUsers,
    columns: columns,
    rowKey: "user_id",
    ariaLabel: en ? 'Attributed users' : '归因用户',
    search: {
      placeholder: en ? 'Pen name or email' : '搜索笔名或邮箱',
      getText: user => [user.display_name, user.email_label, user.partner_label]
    },
    pagination: pagination,
    wrapClassName: "partner-user-table-wrap",
    className: "partner-user-table",
    onRowActivate: onUser,
    empty: en ? 'No users match these filters.' : '没有符合条件的归因用户。',
    compact: true
  }));
}
function PartnerUserDrawer({
  user,
  admin,
  busy,
  onClose,
  onSave
}) {
  const en = window.CLANG === 'en';
  const [statusValue, setStatusValue] = pUseState(user.maintenance_status);
  const [tags, setTags] = pUseState((user.maintenance_tags || []).join('，'));
  const [note, setNote] = pUseState('');
  const submit = event => {
    event.preventDefault();
    const cleanNote = note.trim();
    if (!cleanNote) return;
    onSave(user, {
      status: statusValue,
      tags: tags.split(/[，,]/).map(value => value.trim()).filter(Boolean).slice(0, 8),
      note: cleanNote
    }).then(saved => {
      if (saved) setNote('');
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "partner-drawer-layer",
    role: "presentation",
    onMouseDown: event => {
      if (event.target === event.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("aside", {
    className: "partner-drawer",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "partner-user-title"
  }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: 'partner-maintenance ' + user.maintenance_status
  }, pMaintenanceStatus(user.maintenance_status)), /*#__PURE__*/React.createElement("h2", {
    id: "partner-user-title"
  }, user.display_name), /*#__PURE__*/React.createElement("p", null, user.email_label, admin && user.partner_label ? ` · ${user.partner_label}` : '')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": en ? 'Close user details' : '关闭用户详情',
    onClick: onClose
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "partner-drawer-body"
  }, /*#__PURE__*/React.createElement("dl", {
    className: "partner-user-facts"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, en ? 'Registered' : '注册时间'), /*#__PURE__*/React.createElement("dd", null, pDate(user.registered_at))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, en ? 'Last active' : '最近活跃'), /*#__PURE__*/React.createElement("dd", null, pDate(user.last_active_at))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, en ? 'Book setup' : '首次建书'), /*#__PURE__*/React.createElement("dd", null, user.build_progress, " / 4")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, en ? '30-day active' : '30 日活跃'), /*#__PURE__*/React.createElement("dd", null, user.active_days_30d, " ", en ? 'days' : '天')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, en ? 'Fulfilled payments' : '已履约充值'), /*#__PURE__*/React.createElement("dd", null, pYuan(user.paid_order_cents))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, en ? 'Commission' : '应返现'), /*#__PURE__*/React.createElement("dd", null, pYuan(user.commission_amount_cents))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, en ? 'Locked rate' : '锁定返现比例'), /*#__PURE__*/React.createElement("dd", null, pPercent(user.locked_commission_rate_bps))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, en ? 'Creation' : '创作'), /*#__PURE__*/React.createElement("dd", null, user.book_count, " ", en ? 'books' : '本', " \xB7 ", user.chapter_count, " ", en ? 'chapters' : '章'))), user.attention_reasons.length ? /*#__PURE__*/React.createElement("section", {
    className: "partner-attention"
  }, /*#__PURE__*/React.createElement("h3", null, en ? 'Needs attention' : '需要关注'), user.attention_reasons.map(reason => /*#__PURE__*/React.createElement("span", {
    key: reason
  }, reason))) : null, /*#__PURE__*/React.createElement("section", {
    className: "partner-maintenance-history"
  }, /*#__PURE__*/React.createElement("h3", null, en ? 'Maintenance history' : '维护记录'), user.maintenance_history.length ? user.maintenance_history.map(item => /*#__PURE__*/React.createElement("article", {
    key: item.id
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, pMaintenanceStatus(item.status)), /*#__PURE__*/React.createElement("time", null, pDate(item.created_at), " \xB7 ", item.author_label)), /*#__PURE__*/React.createElement("p", null, item.note), item.tags.length ? /*#__PURE__*/React.createElement("footer", null, item.tags.map(tag => /*#__PURE__*/React.createElement("span", {
    key: tag
  }, tag))) : null)) : /*#__PURE__*/React.createElement("p", {
    className: "partner-empty-inline"
  }, en ? 'No maintenance records yet.' : '尚无维护记录。')), /*#__PURE__*/React.createElement("form", {
    className: "partner-maintenance-form",
    onSubmit: submit
  }, /*#__PURE__*/React.createElement("h3", null, en ? 'Add maintenance record' : '添加维护记录'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, en ? 'Status' : '社区状态'), /*#__PURE__*/React.createElement("select", {
    value: statusValue,
    onChange: event => setStatusValue(event.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "attention"
  }, pMaintenanceStatus('attention')), /*#__PURE__*/React.createElement("option", {
    value: "stable"
  }, pMaintenanceStatus('stable')), /*#__PURE__*/React.createElement("option", {
    value: "core"
  }, pMaintenanceStatus('core')))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, en ? 'Tags' : '标签'), /*#__PURE__*/React.createElement("input", {
    value: tags,
    onChange: event => setTags(event.target.value),
    maxLength: "120",
    placeholder: en ? 'Comma separated' : '用逗号分隔，最多 8 个'
  }))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, en ? 'Note' : '维护记录'), /*#__PURE__*/React.createElement("textarea", {
    value: note,
    onChange: event => setNote(event.target.value),
    maxLength: "500",
    required: true
  })), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold",
    disabled: busy || !note.trim()
  }, busy ? en ? 'Saving…' : '保存中…' : en ? 'Save record' : '保存记录')))));
}
function InvitationRulesDrawer({
  settings,
  busy,
  onClose,
  onSave
}) {
  const en = window.CLANG === 'en';
  const [reward, setReward] = pUseState(String(Math.round(settings.ordinary_reward_millis / 1000)));
  const submit = event => {
    event.preventDefault();
    onSave({
      expected_revision: settings.revision,
      ordinary_reward_credits: Number(reward)
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "partner-drawer-layer",
    role: "presentation"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "partner-drawer partner-rule-drawer",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "partner-rule-title"
  }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    id: "partner-rule-title"
  }, en ? 'Invitation rules' : '邀请规则'), /*#__PURE__*/React.createElement("p", null, en ? 'New registrations use the saved value.' : '保存后只影响之后注册的新邀请关系')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": en ? 'Close invitation rules' : '关闭邀请规则',
    onClick: onClose
  }, "\xD7")), /*#__PURE__*/React.createElement("form", {
    className: "partner-rule-form",
    onSubmit: submit
  }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, en ? 'Reward for each person' : '双方每人奖励'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "100000",
    step: "1",
    value: reward,
    onChange: event => setReward(event.target.value),
    required: true
  }), /*#__PURE__*/React.createElement("b", null, en ? 'credits' : '笔力'))), /*#__PURE__*/React.createElement("p", null, en ? 'Existing relationships keep the reward locked at registration.' : `已有邀请继续按注册时锁定的金额发放，当前版本为第 ${settings.revision} 版。`), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold",
    disabled: busy
  }, busy ? en ? 'Saving…' : '保存中…' : en ? 'Save rules' : '保存规则'))));
}
function PartnerConfigDrawer({
  partner,
  busy,
  onClose,
  onSave
}) {
  const en = window.CLANG === 'en';
  const [email, setEmail] = pUseState(partner ? partner.email : '');
  const [rate, setRate] = pUseState(partner ? String(partner.commission_rate_bps / 100) : '10');
  const [active, setActive] = pUseState(partner ? partner.active : true);
  const submit = event => {
    event.preventDefault();
    onSave({
      email: email.trim(),
      commission_rate_bps: Math.round(Number(rate) * 100),
      active
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "partner-drawer-layer",
    role: "presentation"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "partner-drawer partner-rule-drawer",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "partner-config-title"
  }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    id: "partner-config-title"
  }, en ? 'Partner account' : '合作商账户')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": en ? 'Close partner settings' : '关闭合作商设置',
    onClick: onClose
  }, "\xD7")), /*#__PURE__*/React.createElement("form", {
    className: "partner-rule-form",
    onSubmit: submit
  }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, en ? 'Bishu account email' : '笔枢账户邮箱'), /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: email,
    onChange: event => setEmail(event.target.value),
    required: true
  })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, en ? 'Commission rate' : '返现比例'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    max: "100",
    step: "0.01",
    value: rate,
    onChange: event => setRate(event.target.value),
    required: true
  }), /*#__PURE__*/React.createElement("b", null, "%"))), /*#__PURE__*/React.createElement("label", {
    className: "partner-active-check"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: active,
    onChange: event => setActive(event.target.checked)
  }), /*#__PURE__*/React.createElement("span", null, en ? 'Accept new attribution' : '接受新的合作商归因')), /*#__PURE__*/React.createElement("p", null, en ? 'Rate changes only affect users who register later.' : '返现比例在用户注册时锁定，修改不会追溯历史归因。'), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold",
    disabled: busy
  }, busy ? en ? 'Saving…' : '保存中…' : en ? 'Save partner' : '保存合作商'))));
}
function PartnerInviteLink({
  code,
  invitePath,
  active,
  toast
}) {
  const en = window.CLANG === 'en';
  const link = window.location.origin + invitePath;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast(en ? 'Copied' : '已复制');
    } catch (err) {
      toast(en ? 'Copy failed' : '复制失败');
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "partner-link"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, en ? 'Shared invitation link' : '统一邀请链接'), /*#__PURE__*/React.createElement("strong", {
    className: "mono"
  }, code), /*#__PURE__*/React.createElement("small", null, link)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: 'partner-role ' + (active ? 'active' : '')
  }, active ? en ? 'Accepting attribution' : '接受新归因' : en ? 'Paused' : '已暂停'), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold",
    onClick: copy
  }, en ? 'Copy link' : '复制邀请链接')));
}
function PartnershipDashboard({
  data,
  admin,
  scope,
  setScope,
  reload,
  toast,
  onUserPage
}) {
  const en = window.CLANG === 'en';
  const [user, setUser] = pUseState(null);
  const [rulesOpen, setRulesOpen] = pUseState(false);
  const [partnerOpen, setPartnerOpen] = pUseState(false);
  const [busy, setBusy] = pUseState(false);
  const selectedPartner = admin ? data.partners.find(item => item.user_id === data.selected_partner_user_id) : null;
  const saveMaintenance = async (target, payload) => {
    setBusy(true);
    try {
      const refreshed = admin ? await window.LF_API.adminPartnerAddMaintenance(target.partner_user_id, target.user_id, payload) : await window.LF_API.partnerAddMaintenance(target.user_id, payload);
      await reload();
      const refreshedUser = refreshed.users.find(item => item.user_id === target.user_id);
      if (refreshedUser) setUser(refreshedUser);
      toast(en ? 'Maintenance record saved' : '维护记录已保存');
      return true;
    } catch (err) {
      toast(err.message || (en ? 'Save failed' : '保存失败'));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const saveRules = async payload => {
    setBusy(true);
    try {
      await window.LF_API.adminSaveInvitationSettings(payload);
      await reload();
      setRulesOpen(false);
      toast(en ? 'Invitation rules saved' : '邀请规则已保存');
    } catch (err) {
      toast(err.message || (en ? 'Save failed' : '保存失败'));
    } finally {
      setBusy(false);
    }
  };
  const savePartner = async payload => {
    if (!payload.email || !Number.isFinite(payload.commission_rate_bps) || payload.commission_rate_bps < 0 || payload.commission_rate_bps > 10000) {
      toast(en ? 'Enter a valid account and rate' : '请填写有效账户与返现比例');
      return;
    }
    setBusy(true);
    try {
      const saved = await window.LF_API.adminSavePartner(payload);
      const nextScope = saved.selected_partner_user_id || scope;
      if (nextScope === scope) await reload();else setScope(nextScope);
      setPartnerOpen(false);
      toast(en ? 'Partner saved' : '合作商配置已保存');
    } catch (err) {
      toast(err.message || (en ? 'Save failed' : '保存失败'));
    } finally {
      setBusy(false);
    }
  };
  const partnerCode = admin ? selectedPartner && selectedPartner.code : data.code;
  const invitePath = partnerCode ? '/login.html?invite=' + partnerCode : '';
  return /*#__PURE__*/React.createElement("div", {
    className: "partner-page-inner"
  }, /*#__PURE__*/React.createElement("header", {
    className: "partner-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, en ? 'Partner operations' : '合作运营'), /*#__PURE__*/React.createElement("p", null, admin ? en ? 'Compare partners or focus on one partner’s attributed users.' : '比较合作商质量，或下钻查看指定合作商的归因用户。' : en ? 'Your attributed users, creation progress, payments, and maintenance history.' : '查看归因用户的创作、活跃、充值与维护记录。')), /*#__PURE__*/React.createElement("div", {
    className: "partner-head-actions"
  }, admin && /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, en ? 'Data scope' : '数据范围'), /*#__PURE__*/React.createElement("select", {
    value: scope,
    onChange: event => setScope(event.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, en ? 'All partners' : '全部合作商'), data.partners.map(item => /*#__PURE__*/React.createElement("option", {
    value: item.user_id,
    key: item.user_id
  }, item.display_name || item.email)))), admin && /*#__PURE__*/React.createElement("button", {
    className: "c-btn",
    onClick: () => setRulesOpen(true)
  }, en ? 'Invitation rules' : '邀请规则'), admin && /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold",
    onClick: () => setPartnerOpen(true)
  }, selectedPartner ? en ? 'Edit partner' : '编辑合作商' : en ? 'Add partner' : '设置合作商'))), partnerCode ? /*#__PURE__*/React.createElement(PartnerInviteLink, {
    code: partnerCode,
    invitePath: invitePath,
    active: admin ? selectedPartner.active : data.summary.active,
    toast: toast
  }) : null, /*#__PURE__*/React.createElement(PartnerSummaryCards, {
    summary: data.summary
  }), /*#__PURE__*/React.createElement("div", {
    className: "partner-analysis-grid"
  }, /*#__PURE__*/React.createElement(PartnerLifecyclePanel, {
    lifecycle: data.lifecycle
  }), /*#__PURE__*/React.createElement(PartnerChangesPanel, {
    summary: data.summary
  })), /*#__PURE__*/React.createElement(PartnerUserTable, {
    users: data.users,
    admin: admin,
    onUser: setUser,
    pagination: admin ? {
      total: data.users_total,
      page: Math.floor(data.users_offset / data.users_limit) + 1,
      pages: Math.max(1, Math.ceil(data.users_total / data.users_limit)),
      pageSize: data.users_limit,
      onPageChange: page => onUserPage((page - 1) * data.users_limit)
    } : null
  }), /*#__PURE__*/React.createElement("section", {
    className: "partner-card"
  }, /*#__PURE__*/React.createElement("h2", null, en ? 'Commission records' : '返现记录'), /*#__PURE__*/React.createElement(CommissionTable, {
    rows: data.commissions,
    admin: admin,
    onChanged: reload,
    toast: toast
  })), user && /*#__PURE__*/React.createElement(PartnerUserDrawer, {
    user: user,
    admin: admin,
    busy: busy,
    onClose: () => setUser(null),
    onSave: saveMaintenance
  }), admin && rulesOpen && /*#__PURE__*/React.createElement(InvitationRulesDrawer, {
    settings: data.settings,
    busy: busy,
    onClose: () => setRulesOpen(false),
    onSave: saveRules
  }), admin && partnerOpen && /*#__PURE__*/React.createElement(PartnerConfigDrawer, {
    partner: selectedPartner,
    busy: busy,
    onClose: () => setPartnerOpen(false),
    onSave: savePartner
  }));
}
function PartnershipsView({
  ctl
}) {
  const isAdmin = !!(window.CONSOLE_DATA.user && window.CONSOLE_DATA.user.isAdmin);
  const [scope, setScope] = pUseState('');
  const [data, setData] = pUseState(null);
  const [error, setError] = pUseState('');
  const [offset, setOffset] = pUseState(0);
  const pendingRequest = pUseRef(null);
  const reload = pUseCallback(() => {
    if (pendingRequest.current) pendingRequest.current.abort();
    const controller = new AbortController();
    pendingRequest.current = controller;
    setError('');
    const promise = isAdmin ? window.LF_API.adminPartnerships(scope || null, 100, offset, {
      signal: controller.signal
    }) : window.LF_API.partnerDashboard();
    return promise.then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(err => {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Load failed');
      throw err;
    }).finally(() => {
      if (pendingRequest.current === controller) pendingRequest.current = null;
    });
  }, [isAdmin, offset, scope]);
  pUseEffect(() => {
    reload().catch(() => {});
    return () => {
      if (pendingRequest.current) pendingRequest.current.abort();
    };
  }, [reload]);
  const changeScope = value => {
    setScope(value);
    setOffset(0);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "partner-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "partner-top"
  }, /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement(LangSeg, {
    lang: ctl.lang,
    setLang: ctl.setLang
  })), error ? /*#__PURE__*/React.createElement("div", {
    className: "partner-load-error"
  }, /*#__PURE__*/React.createElement("span", null, error), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: () => reload().catch(() => {})
  }, window.CLANG === 'en' ? 'Retry' : '重试')) : !data ? /*#__PURE__*/React.createElement("div", {
    className: "partner-loading"
  }, TC('set_loading')) : /*#__PURE__*/React.createElement(PartnershipDashboard, {
    data: data,
    admin: isAdmin,
    scope: scope,
    setScope: changeScope,
    reload: reload,
    toast: ctl.toast,
    onUserPage: setOffset
  }));
}
window.PartnershipsView = PartnershipsView;
}
