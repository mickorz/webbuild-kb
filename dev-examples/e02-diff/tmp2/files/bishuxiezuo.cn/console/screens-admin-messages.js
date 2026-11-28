{
(function () {
  const {
    useState,
    useEffect,
    useCallback,
    useRef
  } = React;
  const COPY = {
    zh: {
      title: '公告与通知',
      update: '公告',
      activity: '通知',
      newUpdate: '发布公告',
      subject: '标题',
      content: '内容',
      level: '提示级别',
      pinned: '置顶',
      publish: '立即发布',
      public: '官网公开',
      popup: '自动弹窗',
      recent: '折叠历史数量',
      publishAt: '定时发布',
      expiresAt: '自动下线',
      create: '创建公告',
      creating: '正在创建…',
      history: '公告记录',
      none: '暂无记录',
      draft: '草稿',
      live: '已发布',
      popupTag: '官网弹窗',
      unpublish: '下线',
      republish: '发布',
      remove: '删除',
      audience: '发送给',
      allActive: '全员',
      single: '单个用户',
      selected: '指定多人',
      target: '用户邮箱',
      targets: '用户邮箱列表',
      targetsHint: '每行一个邮箱，最多 200 个',
      site: '站点范围',
      currentSite: '当前站点',
      sites: {
        cn: '中文站',
        global: '英文站',
        all: '中英文站'
      },
      benefit: '同时发放笔力',
      amount: '每人笔力',
      reason: '账本原因',
      validDays: '有效天数',
      notificationPopup: '登录后弹窗',
      inboxOnly: '仅消息中心',
      newNotification: '发送通知',
      preview: '预览发送',
      previewing: '正在预览…',
      previewTitle: '发送前确认',
      recipient: '接收用户',
      total: '总发放',
      cancel: '取消',
      confirm: '确认发送',
      sending: '正在发送…',
      sent: '通知已发送',
      close: '完成',
      activityHistory: '发送记录',
      users: '人',
      credit: '笔力',
      missingUpdate: '请填写公告标题和内容',
      missingMessage: '请填写通知标题和内容',
      missingTarget: '请填写用户的完整邮箱',
      missingBenefit: '请填写大于 0 的笔力数量、有效天数和账本原因',
      importCsv: '导入 CSV',
      replaceCsv: '更换附件',
      csvTemplate: '下载模板',
      removeCsv: '移除附件',
      readingCsv: '正在解析…',
      importedRecipients: '附件收件人及笔力',
      noticeOnly: '仅发通知',
      missingImportBenefit: '请填写有效天数和账本原因。',
      csvIssues: {
        encoding: '请另存为 UTF-8 CSV。',
        header: '表头应为 email,credits。',
        columns: '每行应有邮箱和笔力两列。',
        amount: '笔力须为非负数，最多三位小数，并在允许范围内。',
        email: '邮箱格式无效。',
        duplicate: '邮箱重复。',
        format: 'CSV 格式有误。',
        empty: '请至少填写一个收件人。',
        too_many: '单个附件最多 200 个收件人。',
        too_large: '附件不能超过 64 KiB。'
      },
      csvRow: number => `第 ${number} 行`,
      tooManyTargets: '一次最多发送给 200 个指定用户。',
      noRecipients: '所选范围内没有启用账号。',
      recipientsUnavailable: '有邮箱不存在、账号已停用或不属于所选站点，请核对。',
      stalePreview: '名单或通知内容已变化，或预览已过期。请返回重新预览。',
      deleteTitle: '删除这条公告？',
      deleteNote: '删除后用户消息中心与官网历史都会立即失去这条记录。若只是暂时隐藏，请使用“下线”。',
      confirmDelete: '确认删除'
    },
    en: {
      title: 'Announcements & notifications',
      update: 'Announcements',
      activity: 'Notifications',
      newUpdate: 'Publish announcement',
      subject: 'Title',
      content: 'Content',
      level: 'Priority',
      pinned: 'Pinned',
      publish: 'Publish now',
      public: 'Public website',
      popup: 'Auto popup',
      recent: 'Collapsed history count',
      publishAt: 'Publish at',
      expiresAt: 'Unpublish at',
      create: 'Create announcement',
      creating: 'Creating…',
      history: 'Announcement history',
      none: 'No records yet',
      draft: 'Draft',
      live: 'Published',
      popupTag: 'Website popup',
      unpublish: 'Unpublish',
      republish: 'Publish',
      remove: 'Delete',
      audience: 'Send to',
      allActive: 'All enabled accounts',
      single: 'One user',
      selected: 'Selected users',
      target: 'User email',
      targets: 'User emails',
      targetsHint: 'One email per line, up to 200',
      site: 'Site scope',
      currentSite: 'Current site',
      sites: {
        cn: 'Chinese site',
        global: 'English site',
        all: 'Both sites'
      },
      benefit: 'Include credits',
      amount: 'Credits per user',
      reason: 'Ledger reason',
      validDays: 'Valid days',
      notificationPopup: 'Show after sign-in',
      inboxOnly: 'Inbox only',
      newNotification: 'Send notification',
      preview: 'Preview delivery',
      previewing: 'Preparing preview…',
      previewTitle: 'Confirm delivery',
      recipient: 'Recipients',
      total: 'Total grant',
      cancel: 'Cancel',
      confirm: 'Confirm send',
      sending: 'Sending…',
      sent: 'Notification sent',
      close: 'Done',
      activityHistory: 'Delivery history',
      users: 'users',
      credit: 'credits',
      missingUpdate: 'Enter an announcement title and body',
      missingMessage: 'Enter a notification title and body',
      missingTarget: 'Enter the full email address',
      missingBenefit: 'Enter positive credits, valid days, and a ledger reason',
      importCsv: 'Import CSV',
      replaceCsv: 'Replace attachment',
      csvTemplate: 'Download template',
      removeCsv: 'Remove attachment',
      readingCsv: 'Reading…',
      importedRecipients: 'Imported recipients and credits',
      noticeOnly: 'Notification only',
      missingImportBenefit: 'Enter the validity in days and a ledger reason.',
      csvIssues: {
        encoding: 'Save the file as UTF-8 CSV.',
        header: 'The header must be email,credits.',
        columns: 'Each row needs an email and a credits column.',
        amount: 'Use a non-negative amount within range and up to three decimal places.',
        email: 'Enter a valid email address.',
        duplicate: 'This email appears more than once.',
        format: 'The CSV format is invalid.',
        empty: 'Add at least one recipient.',
        too_many: 'An attachment can have up to 200 recipients.',
        too_large: 'The attachment must be 64 KiB or smaller.'
      },
      csvRow: number => `Row ${number}`,
      tooManyTargets: 'You can select up to 200 users per notification.',
      noRecipients: 'No enabled accounts match this audience.',
      recipientsUnavailable: 'An email is missing, disabled, or outside the selected sites. Check the addresses and site scope.',
      stalePreview: 'The recipients or notification changed, or the preview expired. Preview it again.',
      deleteTitle: 'Delete this announcement?',
      deleteNote: 'It will disappear from user messages and public history. Use Unpublish if it should only be hidden temporarily.',
      confirmDelete: 'Delete'
    }
  };
  const EMPTY_UPDATE = {
    title: '',
    body: '',
    level: 'activity',
    pinned: false,
    published: true,
    public_visible: true,
    show_popup: true,
    popup_recent_count: 5,
    publish_at: '',
    expires_at: ''
  };
  const EMPTY_ACTIVITY = {
    audience: 'active_users',
    site_scope: 'current',
    target_email: '',
    target_emails: '',
    title: '',
    message: '',
    show_popup: false,
    includeBenefit: false,
    amount: '',
    credit_reason: '',
    validDays: ''
  };
  const CSV_TEMPLATE = 'data:text/csv;charset=utf-8,email%2Ccredits%0D%0A';
  function audienceLabel(copy, audience) {
    return {
      active_users: copy.allActive,
      single_user: copy.single,
      selected_users: copy.selected
    }[audience];
  }
  function targetEmails(value) {
    return [...new Set(value.toLowerCase().split(/[\s,，;；]+/).filter(Boolean))];
  }
  function iso(value) {
    return value ? new Date(value).toISOString() : null;
  }
  function credits(value) {
    return (Number(value) || 0) / 1000;
  }
  function dateOf(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(window.CLANG === 'en' ? 'en' : 'zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
  function Modal({
    title,
    children,
    footer,
    onClose,
    busy
  }) {
    const dialogRef = useRef(null);
    const focusable = () => Array.from(dialogRef.current.querySelectorAll('button:not([disabled]),summary'));
    useEffect(() => {
      const active = document.activeElement;
      focusable()[0]?.focus();
      return () => {
        if (active?.isConnected) active.focus();
      };
    }, [title]);
    const close = () => {
      if (!busy) onClose();
    };
    const keydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = focusable();
      if (!controls.length) {
        event.preventDefault();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-message-overlay",
      onMouseDown: event => {
        if (event.target === event.currentTarget) close();
      }
    }, /*#__PURE__*/React.createElement("section", {
      ref: dialogRef,
      className: "adm-message-modal",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "adm-message-modal-title",
      onKeyDown: keydown
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", {
      id: "adm-message-modal-title"
    }, title), /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: busy,
      "aria-label": window.CLANG === 'en' ? 'Close' : '关闭',
      onClick: close
    }, "\xD7")), /*#__PURE__*/React.createElement("div", null, children), /*#__PURE__*/React.createElement("footer", null, footer)));
  }
  function AnnouncementComposer({
    copy,
    form,
    setForm,
    busy,
    error,
    onCreate
  }) {
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-message-card adm-message-compose"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, copy.newUpdate)), /*#__PURE__*/React.createElement("div", {
      className: "adm-message-form"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.subject), /*#__PURE__*/React.createElement("input", {
      value: form.title,
      maxLength: "255",
      onChange: event => setForm(value => ({
        ...value,
        title: event.target.value
      }))
    })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.content), /*#__PURE__*/React.createElement("textarea", {
      value: form.body,
      maxLength: "8000",
      onChange: event => setForm(value => ({
        ...value,
        body: event.target.value
      }))
    })), /*#__PURE__*/React.createElement("div", {
      className: "adm-message-fields four"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.level), /*#__PURE__*/React.createElement("select", {
      value: form.level,
      onChange: event => setForm(value => ({
        ...value,
        level: event.target.value
      }))
    }, /*#__PURE__*/React.createElement("option", {
      value: "info"
    }, "Info"), /*#__PURE__*/React.createElement("option", {
      value: "activity"
    }, "Activity"), /*#__PURE__*/React.createElement("option", {
      value: "maintenance"
    }, "Maintenance"), /*#__PURE__*/React.createElement("option", {
      value: "warning"
    }, "Warning"))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.recent), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      max: "10",
      value: form.popup_recent_count,
      onChange: event => setForm(value => ({
        ...value,
        popup_recent_count: event.target.value
      }))
    })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.publishAt), /*#__PURE__*/React.createElement("input", {
      type: "datetime-local",
      value: form.publish_at,
      onChange: event => setForm(value => ({
        ...value,
        publish_at: event.target.value
      }))
    })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.expiresAt), /*#__PURE__*/React.createElement("input", {
      type: "datetime-local",
      value: form.expires_at,
      onChange: event => setForm(value => ({
        ...value,
        expires_at: event.target.value
      }))
    }))), /*#__PURE__*/React.createElement("div", {
      className: "adm-message-checks"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: form.pinned,
      onChange: event => setForm(value => ({
        ...value,
        pinned: event.target.checked
      }))
    }), copy.pinned), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: form.published,
      onChange: event => setForm(value => ({
        ...value,
        published: event.target.checked
      }))
    }), copy.publish), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: form.public_visible,
      onChange: event => setForm(value => ({
        ...value,
        public_visible: event.target.checked,
        show_popup: event.target.checked ? value.show_popup : false
      }))
    }), copy.public), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: form.show_popup,
      disabled: !form.public_visible,
      onChange: event => setForm(value => ({
        ...value,
        show_popup: event.target.checked
      }))
    }), copy.popup)), error ? /*#__PURE__*/React.createElement("p", {
      className: "adm-message-error",
      role: "alert"
    }, error) : null, /*#__PURE__*/React.createElement("footer", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold",
      disabled: busy,
      onClick: onCreate
    }, busy ? copy.creating : copy.create))));
  }
  function AnnouncementHistory({
    copy,
    items,
    onToggle,
    onDelete
  }) {
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-message-card adm-message-history"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, copy.history), /*#__PURE__*/React.createElement("p", null, items.length, " records"))), items.length ? /*#__PURE__*/React.createElement("div", {
      className: "adm-message-records"
    }, items.map(item => /*#__PURE__*/React.createElement("article", {
      key: item.id
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: `adm-message-status ${item.published ? 'live' : ''}`
    }, item.published ? copy.live : copy.draft), item.show_popup ? /*#__PURE__*/React.createElement("span", {
      className: "adm-message-status popup"
    }, copy.popupTag) : null, /*#__PURE__*/React.createElement("strong", null, item.title), /*#__PURE__*/React.createElement("time", null, dateOf(item.created_at))), /*#__PURE__*/React.createElement("p", null, item.body), /*#__PURE__*/React.createElement("footer", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost sm",
      onClick: () => onToggle(item)
    }, item.published ? copy.unpublish : copy.republish), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn danger-outline sm",
      onClick: () => onDelete(item)
    }, copy.remove))))) : /*#__PURE__*/React.createElement("div", {
      className: "adm-message-empty"
    }, copy.none));
  }
  function ActivityComposer({
    copy,
    form,
    setForm,
    busy,
    error,
    onPreview,
    attachment,
    hasCredits,
    onImport,
    onRemove
  }) {
    const site = window.NBSite?.current.code || 'cn';
    const otherSite = site === 'cn' ? 'global' : 'cn';
    const fileInput = useRef(null);
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-message-card adm-message-compose"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, copy.newNotification)), /*#__PURE__*/React.createElement("div", {
      className: "adm-message-form"
    }, /*#__PURE__*/React.createElement("fieldset", {
      className: "adm-message-audience",
      disabled: busy
    }, /*#__PURE__*/React.createElement("legend", null, copy.audience), ['active_users', 'single_user', 'selected_users'].map(audience => /*#__PURE__*/React.createElement("label", {
      key: audience
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: "message-audience",
      checked: form.audience === audience,
      onChange: () => setForm(value => ({
        ...value,
        audience
      }))
    }), audienceLabel(copy, audience)))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.site), /*#__PURE__*/React.createElement("select", {
      value: form.site_scope,
      disabled: busy,
      onChange: event => setForm(value => ({
        ...value,
        site_scope: event.target.value
      }))
    }, /*#__PURE__*/React.createElement("option", {
      value: "current"
    }, copy.currentSite, " \xB7 ", copy.sites[site]), /*#__PURE__*/React.createElement("option", {
      value: otherSite
    }, copy.sites[otherSite]), /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, copy.sites.all))), form.audience === 'single_user' ? /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.target), /*#__PURE__*/React.createElement("input", {
      type: "email",
      value: form.target_email,
      onChange: event => setForm(value => ({
        ...value,
        target_email: event.target.value
      }))
    })) : null, form.audience === 'selected_users' ? /*#__PURE__*/React.createElement(React.Fragment, null, attachment ? null : /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.targets), /*#__PURE__*/React.createElement("textarea", {
      value: form.target_emails,
      placeholder: copy.targetsHint,
      onChange: event => setForm(value => ({
        ...value,
        target_emails: event.target.value
      }))
    })), /*#__PURE__*/React.createElement("div", {
      className: "adm-message-import"
    }, /*#__PURE__*/React.createElement("input", {
      ref: fileInput,
      type: "file",
      accept: ".csv,text/csv",
      hidden: true,
      disabled: busy,
      onChange: event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (file) onImport(file);
      }
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: () => fileInput.current.click()
    }, attachment ? copy.replaceCsv : copy.importCsv), /*#__PURE__*/React.createElement("a", {
      className: "c-btn ghost sm",
      href: CSV_TEMPLATE,
      download: "notification-recipients.csv"
    }, copy.csvTemplate)), attachment ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "adm-message-attachment"
    }, /*#__PURE__*/React.createElement("span", {
      role: "status"
    }, attachment.name, attachment.reading ? ` · ${copy.readingCsv}` : null, attachment.grants ? ` · ${attachment.grants.length} ${copy.users}` : null), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost sm",
      disabled: busy,
      onClick: onRemove
    }, copy.removeCsv)), attachment.error ? /*#__PURE__*/React.createElement("p", {
      className: "adm-message-error",
      role: "alert"
    }, attachment.error) : null) : null) : null, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.subject), /*#__PURE__*/React.createElement("input", {
      maxLength: "255",
      value: form.title,
      onChange: event => setForm(value => ({
        ...value,
        title: event.target.value
      }))
    })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.content), /*#__PURE__*/React.createElement("textarea", {
      maxLength: "1000",
      value: form.message,
      onChange: event => setForm(value => ({
        ...value,
        message: event.target.value
      }))
    })), /*#__PURE__*/React.createElement("div", {
      className: "adm-message-checks"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: form.show_popup,
      onChange: event => setForm(value => ({
        ...value,
        show_popup: event.target.checked
      }))
    }), copy.notificationPopup)), attachment ? null : /*#__PURE__*/React.createElement("label", {
      className: "adm-message-benefit-toggle"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: form.includeBenefit,
      onChange: event => setForm(value => ({
        ...value,
        includeBenefit: event.target.checked
      }))
    }), copy.benefit), hasCredits ? /*#__PURE__*/React.createElement("div", {
      className: "adm-message-benefit-fields"
    }, attachment ? null : /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.amount), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0.001",
      step: "0.1",
      value: form.amount,
      onChange: event => setForm(value => ({
        ...value,
        amount: event.target.value
      }))
    }), /*#__PURE__*/React.createElement("b", null, copy.credit))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.validDays), /*#__PURE__*/React.createElement("input", {
      id: "admin-activity-credit-valid-days",
      type: "number",
      min: "1",
      max: "36500",
      step: "1",
      required: true,
      disabled: busy,
      value: form.validDays,
      onChange: event => setForm(value => ({
        ...value,
        validDays: event.target.value
      }))
    })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.reason), /*#__PURE__*/React.createElement("input", {
      maxLength: "255",
      value: form.credit_reason,
      onChange: event => setForm(value => ({
        ...value,
        credit_reason: event.target.value
      }))
    }))) : null, error ? /*#__PURE__*/React.createElement("p", {
      className: "adm-message-error",
      role: "alert"
    }, error) : null, /*#__PURE__*/React.createElement("footer", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold",
      disabled: busy || Boolean(attachment && !attachment.grants),
      onClick: onPreview
    }, busy && !attachment?.reading ? copy.previewing : copy.preview))));
  }
  function ActivityHistory({
    copy,
    items
  }) {
    return /*#__PURE__*/React.createElement("section", {
      className: "adm-message-card adm-message-history"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, copy.activityHistory)), items.length ? /*#__PURE__*/React.createElement("div", {
      className: "adm-message-records compact"
    }, items.map(item => {
      const details = item.details || {};
      const scope = copy.sites[details.site_scope];
      const audience = scope ? audienceLabel(copy, details.audience) : details.audience_label;
      const delivery = details.show_popup ? copy.notificationPopup : null;
      return /*#__PURE__*/React.createElement("article", {
        key: item.id
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
        className: "adm-message-status live"
      }, details.total_credit_millis ? copy.benefit : copy.activity), /*#__PURE__*/React.createElement("strong", null, details.title || '—'), /*#__PURE__*/React.createElement("time", null, dateOf(item.created_at))), /*#__PURE__*/React.createElement("p", null, [scope, audience, `${details.user_count || 0} ${copy.users}`, delivery, details.total_credit_millis ? `${credits(details.total_credit_millis).toLocaleString()} ${copy.credit}` : null].filter(Boolean).join(' · ')));
    })) : /*#__PURE__*/React.createElement("div", {
      className: "adm-message-empty"
    }, copy.none));
  }
  function NotificationPreview({
    copy,
    preview,
    error
  }) {
    const payload = preview.dispatchPayload;
    const imported = payload.target_grants;
    const amount = value => `${credits(value).toLocaleString()} ${copy.credit}`;
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-message-preview"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-message-preview-body"
    }, /*#__PURE__*/React.createElement("strong", null, payload.title), /*#__PURE__*/React.createElement("div", null, payload.message)), /*#__PURE__*/React.createElement("dl", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.site), /*#__PURE__*/React.createElement("dd", null, copy.sites[preview.site_scope])), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.recipient), /*#__PURE__*/React.createElement("dd", null, audienceLabel(copy, payload.audience), " \xB7 ", preview.user_count, " ", copy.users)), payload.target_email ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.target), /*#__PURE__*/React.createElement("dd", null, payload.target_email)) : null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.activity), /*#__PURE__*/React.createElement("dd", null, payload.show_popup ? copy.notificationPopup : copy.inboxOnly)), payload.credit_millis > 0 ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.amount), /*#__PURE__*/React.createElement("dd", null, amount(preview.credit_per_user_millis))) : null, imported || preview.total_credit_millis > 0 ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.total), /*#__PURE__*/React.createElement("dd", null, amount(preview.total_credit_millis))) : null, preview.total_credit_millis > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.validDays), /*#__PURE__*/React.createElement("dd", null, payload.credit_valid_days)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.reason), /*#__PURE__*/React.createElement("dd", null, payload.credit_reason))) : null), imported ? /*#__PURE__*/React.createElement("table", {
      className: "adm-message-recipient-table",
      "aria-label": copy.importedRecipients
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      scope: "col"
    }, copy.target), /*#__PURE__*/React.createElement("th", {
      scope: "col"
    }, copy.credit))), /*#__PURE__*/React.createElement("tbody", null, imported.map(grant => /*#__PURE__*/React.createElement("tr", {
      key: grant.email
    }, /*#__PURE__*/React.createElement("td", null, grant.email), /*#__PURE__*/React.createElement("td", null, grant.credit_millis ? amount(grant.credit_millis) : copy.noticeOnly))))) : null, payload.target_emails.length ? /*#__PURE__*/React.createElement("details", {
      className: "adm-message-preview-targets"
    }, /*#__PURE__*/React.createElement("summary", null, copy.targets), /*#__PURE__*/React.createElement("ul", null, payload.target_emails.map(email => /*#__PURE__*/React.createElement("li", {
      key: email
    }, email)))) : null, error ? /*#__PURE__*/React.createElement("p", {
      className: "adm-message-error",
      role: "alert"
    }, error) : null);
  }
  function AdminMessagesTab({
    toast
  }) {
    const copy = COPY[window.CLANG === 'en' ? 'en' : 'zh'];
    const [mode, setMode] = useState('update');
    const [announcements, setAnnouncements] = useState([]);
    const [activities, setActivities] = useState([]);
    const [updateForm, setUpdateForm] = useState(EMPTY_UPDATE);
    const [activityForm, setActivityForm] = useState(EMPTY_ACTIVITY);
    const [attachment, setAttachment] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const activeAttachment = activityForm.audience === 'selected_users' ? attachment : null;
    const attachmentHasCredits = activeAttachment?.grants?.some(grant => grant.credit_millis > 0);
    const hasCredits = activeAttachment ? Boolean(attachmentHasCredits) : activityForm.includeBenefit;
    const load = useCallback(() => Promise.all([window.LF_API.adminAnnouncements(100), window.LF_API.adminAuditLogs({
      action: 'admin.message_activity_sent',
      limit: 50
    })]).then(([nextAnnouncements, nextActivities]) => {
      setAnnouncements(Array.isArray(nextAnnouncements) ? nextAnnouncements : []);
      setActivities(Array.isArray(nextActivities) ? nextActivities : []);
    }).catch(value => toast(value.message)), [toast]);
    useEffect(() => {
      load();
    }, [load]);
    const createUpdate = async () => {
      if (!updateForm.title.trim() || !updateForm.body.trim()) {
        setError(copy.missingUpdate);
        return;
      }
      setBusy(true);
      setError('');
      try {
        await window.LF_API.adminCreateAnnouncement({
          ...updateForm,
          category: 'product_update',
          popup_recent_count: Number(updateForm.popup_recent_count),
          publish_at: iso(updateForm.publish_at),
          expires_at: iso(updateForm.expires_at)
        });
        setUpdateForm(EMPTY_UPDATE);
        await load();
      } catch (value) {
        setError(value.message);
      } finally {
        setBusy(false);
      }
    };
    const toggleAnnouncement = item => window.LF_API.adminUpdateAnnouncement(item.id, {
      published: !item.published
    }).then(load).catch(value => toast(value.message));
    const removeAnnouncement = async () => {
      if (!deleteTarget) return;
      setBusy(true);
      try {
        await window.LF_API.adminDeleteAnnouncement(deleteTarget.id);
        setDeleteTarget(null);
        await load();
      } catch (value) {
        toast(value.message);
      } finally {
        setBusy(false);
      }
    };
    const importCsv = async file => {
      if (busy) return;
      setPreview(null);
      setError('');
      setBusy(true);
      setAttachment({
        name: file.name,
        reading: true
      });
      try {
        const grants = await window.LF_API.adminImportMessageActivity(file);
        if (!Array.isArray(grants) || !grants.length) throw new Error(copy.csvIssues.empty);
        setAttachment({
          name: file.name,
          grants
        });
      } catch (value) {
        const detail = value.body?.detail;
        const message = copy.csvIssues[detail?.issue] || value.message;
        const error = detail?.row ? `${copy.csvRow(detail.row)} · ${message}` : message;
        setAttachment({
          name: file.name,
          error
        });
      } finally {
        setBusy(false);
      }
    };
    const removeAttachment = () => {
      setAttachment(null);
      setPreview(null);
      setError('');
    };
    function activityPayload() {
      return {
        audience: activityForm.audience,
        site_scope: activityForm.site_scope,
        target_email: activityForm.audience === 'single_user' ? activityForm.target_email.trim() : null,
        target_emails: activityForm.audience === 'selected_users' && !activeAttachment ? targetEmails(activityForm.target_emails) : [],
        ...(activeAttachment?.grants ? {
          target_grants: activeAttachment.grants
        } : {}),
        title: activityForm.title.trim(),
        message: activityForm.message.trim(),
        show_popup: activityForm.show_popup,
        credit_millis: hasCredits && !activeAttachment ? Math.round(Number(activityForm.amount) * 1000) : 0,
        credit_reason: hasCredits ? activityForm.credit_reason.trim() : null,
        credit_valid_days: hasCredits ? Number(activityForm.validDays) : null
      };
    }
    const previewActivity = async () => {
      if (busy || activeAttachment && !activeAttachment.grants) return;
      const dispatchPayload = activityPayload();
      if (!dispatchPayload.title || !dispatchPayload.message) {
        setError(copy.missingMessage);
        return;
      }
      if (dispatchPayload.audience === 'single_user' && !dispatchPayload.target_email || dispatchPayload.audience === 'selected_users' && !dispatchPayload.target_emails.length && !dispatchPayload.target_grants?.length) {
        setError(copy.missingTarget);
        return;
      }
      if (dispatchPayload.target_emails.length > 200) {
        setError(copy.tooManyTargets);
        return;
      }
      if (hasCredits && (!activeAttachment && !(dispatchPayload.credit_millis > 0) || !dispatchPayload.credit_reason || !Number.isInteger(dispatchPayload.credit_valid_days) || dispatchPayload.credit_valid_days <= 0 || dispatchPayload.credit_valid_days > 36500)) {
        setError(activeAttachment ? copy.missingImportBenefit : copy.missingBenefit);
        return;
      }
      setBusy(true);
      setError('');
      try {
        const checked = await window.LF_API.adminPreviewMessageActivity(dispatchPayload);
        if (!checked.user_count) {
          setError(copy.noRecipients);
          return;
        }
        if (!checked.preview_token) {
          setError(copy.stalePreview);
          return;
        }
        setPreview({
          ...checked,
          dispatchPayload
        });
      } catch (value) {
        setError(value.body?.detail?.code === 'notification_recipients_unavailable' ? copy.recipientsUnavailable : value.message);
      } finally {
        setBusy(false);
      }
    };
    const sendActivity = async () => {
      if (!preview || preview.stale || busy) return;
      setBusy(true);
      setError('');
      try {
        const sent = await window.LF_API.adminSendMessageActivity({
          ...preview.dispatchPayload,
          expected_user_count: preview.user_count
        }, preview.preview_token);
        setResult(sent);
        await load();
      } catch (value) {
        const code = value.body?.detail?.code;
        if (code === 'notification_preview_stale' || code === 'notification_recipients_unavailable') {
          setPreview(current => ({
            ...current,
            stale: true
          }));
          setError(copy.stalePreview);
        } else setError(value.message);
      } finally {
        setBusy(false);
      }
    };
    const closeActivity = () => {
      setPreview(null);
      setResult(null);
      setError('');
      if (result) {
        setActivityForm(EMPTY_ACTIVITY);
        setAttachment(null);
      }
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-messages"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-message-page-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, copy.title)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-pressed": mode === 'update',
      disabled: busy,
      className: mode === 'update' ? 'selected' : '',
      onClick: () => {
        setMode('update');
        setError('');
      }
    }, copy.update), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-pressed": mode === 'activity',
      disabled: busy,
      className: mode === 'activity' ? 'selected' : '',
      onClick: () => {
        setMode('activity');
        setError('');
      }
    }, copy.activity))), /*#__PURE__*/React.createElement("div", {
      className: "adm-message-grid"
    }, mode === 'update' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AnnouncementComposer, {
      copy: copy,
      form: updateForm,
      setForm: setUpdateForm,
      busy: busy,
      error: error,
      onCreate: createUpdate
    }), /*#__PURE__*/React.createElement(AnnouncementHistory, {
      copy: copy,
      items: announcements,
      onToggle: toggleAnnouncement,
      onDelete: setDeleteTarget
    })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ActivityComposer, {
      copy: copy,
      form: activityForm,
      setForm: setActivityForm,
      busy: busy,
      error: error,
      onPreview: previewActivity,
      attachment: activeAttachment,
      hasCredits: hasCredits,
      onImport: importCsv,
      onRemove: removeAttachment
    }), /*#__PURE__*/React.createElement(ActivityHistory, {
      copy: copy,
      items: activities
    }))), preview ? /*#__PURE__*/React.createElement(Modal, {
      title: result ? copy.sent : copy.previewTitle,
      busy: busy,
      onClose: closeActivity,
      footer: result ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn gold",
        onClick: closeActivity
      }, copy.close) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn",
        disabled: busy,
        onClick: closeActivity
      }, copy.cancel), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn gold",
        disabled: busy || preview.stale,
        onClick: sendActivity
      }, busy ? copy.sending : copy.confirm))
    }, result ? /*#__PURE__*/React.createElement("div", {
      className: "adm-message-result"
    }, /*#__PURE__*/React.createElement("strong", null, result.user_count, " ", copy.users), result.total_credit_millis ? /*#__PURE__*/React.createElement("span", null, "+", credits(result.total_credit_millis).toLocaleString(), " ", copy.credit) : null) : /*#__PURE__*/React.createElement(NotificationPreview, {
      copy: copy,
      preview: preview,
      error: error
    })) : null, deleteTarget ? /*#__PURE__*/React.createElement(Modal, {
      title: copy.deleteTitle,
      onClose: () => setDeleteTarget(null),
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn",
        disabled: busy,
        onClick: () => setDeleteTarget(null)
      }, copy.cancel), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn danger",
        disabled: busy,
        onClick: removeAnnouncement
      }, copy.confirmDelete))
    }, /*#__PURE__*/React.createElement("p", {
      className: "adm-message-delete-note"
    }, copy.deleteNote)) : null);
  }
  window.AdminMessagesTab = AdminMessagesTab;
})();
}
