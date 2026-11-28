{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const base = '/api/admin/ai-rewrite';
  const statuses = {
    pending: '待审核',
    approved: '已通过',
    declined: '已拒绝',
    revoked: '已撤销'
  };
  const questions = [['identity', '创作身份', {
    signed: '签约作者',
    serializing: '连载中，未签约',
    beginner: '刚开始写',
    studio: '编辑、工作室或其他'
  }], ['platforms', '主要发布平台', {
    fanqie: '番茄小说',
    qidian: '起点中文网',
    jjwxc: '晋江文学城',
    qimao: '七猫小说',
    other: '其他'
  }], ['workflow', '写作方式', {
    self: '自己写为主，AI 辅助',
    edit: 'AI 生成后自己修改',
    ai: '基本由 AI 生成'
  }], ['volume', '每月字数', {
    lt50k: '5 万字以内',
    '50k-200k': '5–20 万字',
    '200k-500k': '20–50 万字',
    gt500k: '50 万字以上'
  }], ['pains', '最想解决的问题', {
    detect: '平台 AI 率检测不过',
    flavor: '读起来 AI 味重',
    drift: '改写后情节跑偏',
    time: '手动改稿太费时间'
  }], ['rewrite_depth', '期望改写程度', {
    light: '轻改，保留我的写法',
    rephrase: '调整句式，让正文更顺',
    rewrite: '按原情节重写正文'
  }]];
  const pageSize = 25;
  const maxSettingValue = 2147483647;
  const date = value => value ? new Date(value).toLocaleString('zh-CN', {
    hour12: false
  }) : '—';
  const write = (path, body) => window.LF_API.request(base + path, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
  function useRead(path, refresh = 0) {
    const [version, setVersion] = useState(0);
    const [snapshot, setSnapshot] = useState(null);
    useEffect(() => {
      const controller = new AbortController();
      window.LF_API.request(base + path, {
        signal: controller.signal,
        cache: 'no-store'
      }).then(data => {
        if (!controller.signal.aborted) setSnapshot({
          path,
          version,
          refresh,
          data
        });
      }, error => {
        if (!controller.signal.aborted) setSnapshot({
          path,
          version,
          refresh,
          error: error.message || '读取失败'
        });
      });
      return () => controller.abort();
    }, [path, version, refresh]);
    const current = snapshot && snapshot.path === path && snapshot.version === version && snapshot.refresh === refresh ? snapshot : {};
    return {
      ...current,
      reload: () => setVersion(n => n + 1)
    };
  }
  function ReadError({
    error,
    retry
  }) {
    return /*#__PURE__*/React.createElement("div", {
      role: "alert",
      className: "adm-other-error"
    }, error, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: retry
    }, "\u91CD\u65B0\u8BFB\u53D6"));
  }
  function ReviewHistory({
    path
  }) {
    const [page, setPage] = useState(0);
    const {
      data,
      error,
      reload
    } = useRead(path + '/history?limit=' + (pageSize + 1) + '&offset=' + page * pageSize);
    if (error) return /*#__PURE__*/React.createElement(ReadError, {
      error: error,
      retry: reload
    });
    if (!data) return /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, "\u6B63\u5728\u8BFB\u53D6\u64CD\u4F5C\u8BB0\u5F55\u2026");
    return /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, "\u64CD\u4F5C\u8BB0\u5F55"), data.length ? /*#__PURE__*/React.createElement("ul", null, data.slice(0, pageSize).map((item, index) => /*#__PURE__*/React.createElement("li", {
      key: index
    }, date(item.reviewed_at), " \xB7 ", statuses[item.status], " \xB7 ", item.source === 'auto_policy' ? '系统自动放通' : item.reviewer_email || '未记录审核人'))) : /*#__PURE__*/React.createElement("p", null, "\u6682\u65E0\u5BA1\u6838\u8BB0\u5F55"), (page > 0 || data.length > pageSize) && /*#__PURE__*/React.createElement("div", {
      className: "adm-other-actions"
    }, /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      disabled: !page,
      onClick: () => setPage(page - 1)
    }, "\u4E0A\u4E00\u9875"), /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      disabled: data.length <= pageSize,
      onClick: () => setPage(page + 1)
    }, "\u4E0B\u4E00\u9875")));
  }
  function ApplicationDrawer({
    row,
    onClose,
    onReviewed,
    onConflict
  }) {
    const Drawer = window.AdminAssistantDrawer,
      Dialog = window.ConfirmDialog;
    const path = '/applications/' + encodeURIComponent(row.user_id);
    const [confirm, setConfirm] = useState(false),
      [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const submitting = useRef(false);
    async function decide(status) {
      if (submitting.current) return;
      submitting.current = true;
      setSaving(true);
      setError('');
      try {
        await write(path, {
          status,
          expected_status: row.status
        });
        onReviewed();
      } catch (failure) {
        if (failure.status === 409) onConflict();else {
          setConfirm(false);
          setError(failure.message || '资格变更失败');
        }
      } finally {
        submitting.current = false;
        setSaving(false);
      }
    }
    const footer = /*#__PURE__*/React.createElement(React.Fragment, null, row.status === 'approved' ? /*#__PURE__*/React.createElement("button", {
      className: "c-btn",
      disabled: saving,
      onClick: () => setConfirm(true)
    }, "\u64A4\u9500\u8D44\u683C") : /*#__PURE__*/React.createElement("button", {
      className: "c-btn primary",
      disabled: saving,
      onClick: () => decide('approved')
    }, row.status === 'pending' ? '通过申请' : '重新开通'), row.status === 'pending' && /*#__PURE__*/React.createElement("button", {
      className: "c-btn",
      disabled: saving,
      onClick: () => decide('declined')
    }, "\u62D2\u7EDD\u7533\u8BF7"));
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Drawer, {
      title: row.email,
      onClose: onClose,
      busy: saving || confirm,
      footer: footer
    }, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, "\u7533\u8BF7\u95EE\u5377"), /*#__PURE__*/React.createElement("dl", {
      className: "adm-assistant-facts"
    }, /*#__PURE__*/React.createElement("dt", null, "\u8D44\u683C\u72B6\u6001"), /*#__PURE__*/React.createElement("dd", null, statuses[row.status]), /*#__PURE__*/React.createElement("dt", null, "\u7533\u8BF7\u65F6\u95F4"), /*#__PURE__*/React.createElement("dd", null, date(row.created_at)), questions.map(([key, label, options]) => {
      const value = row.answers[key];
      const values = Array.isArray(value) ? value : [value];
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: key
      }, /*#__PURE__*/React.createElement("dt", null, label), /*#__PURE__*/React.createElement("dd", null, values.filter(Boolean).map(code => Object.hasOwn(options, code) ? options[code] : String(code)).join('、') || '未填写'));
    }), row.answers.pen_name && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("dt", null, "\u5386\u53F2\u7B14\u540D\u6216\u4F5C\u54C1\u94FE\u63A5"), /*#__PURE__*/React.createElement("dd", null, row.answers.pen_name)), /*#__PURE__*/React.createElement("dt", null, "\u77E5\u60C5\u786E\u8BA4"), /*#__PURE__*/React.createElement("dd", null, row.answers.ack === 'yes' ? '已确认' : '未记录'))), /*#__PURE__*/React.createElement(ReviewHistory, {
      path: path
    }), error && /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-other-error"
    }, error)), /*#__PURE__*/React.createElement(Dialog, {
      open: confirm,
      title: "\u64A4\u9500\u6539\u5199\u8D44\u683C",
      message: row.email + ' 将无法发起新的改写。',
      cancelLabel: "\u53D6\u6D88",
      confirmLabel: "\u786E\u8BA4\u64A4\u9500",
      tone: "danger",
      confirmDisabled: saving,
      onClose: () => {
        if (!saving) setConfirm(false);
      },
      onConfirm: () => decide('revoked')
    }));
  }
  function Applications({
    toast,
    refreshOverview
  }) {
    const Table = window.AdminDataTable;
    const [input, setInput] = useState('');
    const [query, setQuery] = useState({
      status: 'pending',
      q: '',
      page: 1
    });
    const [row, setRow] = useState(null);
    const params = new URLSearchParams({
      status: query.status,
      q: query.q,
      include_total: 'true',
      limit: String(pageSize),
      offset: String((query.page - 1) * pageSize)
    });
    const {
      data,
      error,
      reload
    } = useRead('/applications?' + params);
    const pages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));
    useEffect(() => {
      if (data && query.page > pages) setQuery(current => ({
        ...current,
        page: pages
      }));
    }, [data, pages, query.page]);
    const filter = patch => setQuery(current => ({
      ...current,
      ...patch,
      page: 1
    }));
    const columns = [{
      key: 'email',
      header: '账号邮箱',
      render: item => item.email
    }, {
      key: 'status',
      header: '资格状态',
      render: item => statuses[item.status]
    }, {
      key: 'created_at',
      header: '申请时间',
      render: item => date(item.created_at)
    }];
    function changed(message) {
      setRow(null);
      reload();
      refreshOverview();
      toast?.(message);
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-card adm-other-card"
    }, /*#__PURE__*/React.createElement("form", {
      className: "rw-admin-filters",
      onSubmit: event => {
        event.preventDefault();
        filter({
          q: input.trim()
        });
      }
    }, /*#__PURE__*/React.createElement("select", {
      "aria-label": "\u8D44\u683C\u72B6\u6001",
      className: "adm-other-mode",
      value: query.status,
      onChange: event => filter({
        status: event.target.value
      })
    }, /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, "\u5168\u90E8\u72B6\u6001"), Object.entries(statuses).map(([value, label]) => /*#__PURE__*/React.createElement("option", {
      key: value,
      value: value
    }, label))), /*#__PURE__*/React.createElement("input", {
      className: "adm-input",
      type: "search",
      "aria-label": "\u8D26\u53F7\u90AE\u7BB1",
      placeholder: "\u6309\u90AE\u7BB1\u641C\u7D22",
      value: input,
      onChange: event => setInput(event.target.value)
    }), /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      type: "submit"
    }, "\u641C\u7D22")), error ? /*#__PURE__*/React.createElement(ReadError, {
      error: error,
      retry: reload
    }) : /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u6539\u5199\u8D44\u683C\u7533\u8BF7",
      rows: data?.items || [],
      columns: columns,
      rowKey: "user_id",
      compact: true,
      onRowActivate: setRow,
      selectedRowKey: row?.user_id,
      loading: !data,
      empty: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u7533\u8BF7",
      pagination: {
        page: query.page,
        pages,
        pageSize,
        total: data?.total || 0,
        onPageChange: page => setQuery(current => ({
          ...current,
          page
        }))
      }
    }), row && /*#__PURE__*/React.createElement(ApplicationDrawer, {
      key: row.user_id,
      row: row,
      onClose: () => setRow(null),
      onReviewed: () => changed('资格已更新'),
      onConflict: () => changed('资格已发生变化，请查看最新记录')
    }));
  }
  function SettingsForm({
    settings,
    reload,
    onBusy,
    toast
  }) {
    const [daily, setDaily] = useState(String(settings.daily_limit)),
      [chars, setChars] = useState(String(settings.max_chars));
    const [error, setError] = useState(''),
      [conflict, setConflict] = useState(false),
      [saving, setSaving] = useState(false);
    const pending = useRef(false);
    const [enabled, setEnabled] = useState(settings.service_enabled === true);
    const [message, setMessage] = useState(settings.closed_message ?? '');
    const withinRange = (value, min) => Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= maxSettingValue;
    const valid = withinRange(daily, 1) && withinRange(chars, 50) && message.trim().length > 0 && Array.from(message.trim()).length <= 300;
    const dirty = Number(daily) !== settings.daily_limit || Number(chars) !== settings.max_chars || enabled !== settings.service_enabled || message.trim() !== settings.closed_message;
    async function save(event) {
      event.preventDefault();
      if (pending.current || !valid || !dirty || conflict) return;
      pending.current = true;
      setSaving(true);
      onBusy(true);
      setError('');
      try {
        await write('/settings', {
          daily_limit: Number(daily),
          max_chars: Number(chars),
          service_enabled: enabled,
          closed_message: message.trim(),
          revision: settings.revision
        });
        toast?.('改写配置已保存');
        reload();
      } catch (failure) {
        setConflict(failure.status === 409);
        setError(failure.status === 409 ? '配置已变更，请重新读取后再保存。' : failure.message || '保存失败');
      } finally {
        pending.current = false;
        setSaving(false);
        onBusy(false);
      }
    }
    return /*#__PURE__*/React.createElement("form", {
      className: "adm-card adm-other-card",
      onSubmit: save
    }, /*#__PURE__*/React.createElement("label", {
      className: "rw-policy-check"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: enabled,
      disabled: saving,
      onChange: e => setEnabled(e.target.checked)
    }), "\u5F00\u542F\u6539\u5199\u670D\u52A1"), /*#__PURE__*/React.createElement("label", {
      className: "adm-other-row rw-closed-message"
    }, "\u670D\u52A1\u5173\u95ED\u65F6\u7684\u63D0\u793A", /*#__PURE__*/React.createElement("textarea", {
      className: "adm-input",
      required: true,
      maxLength: 300,
      rows: 2,
      disabled: saving,
      value: message,
      onChange: e => setMessage(e.target.value)
    })), /*#__PURE__*/React.createElement("label", {
      className: "adm-other-row"
    }, "\u6BCF\u4EBA\u6BCF\u65E5\u514D\u8D39\u6B21\u6570", /*#__PURE__*/React.createElement("input", {
      className: "adm-input",
      required: true,
      type: "number",
      min: "1",
      step: "1",
      max: maxSettingValue,
      disabled: saving,
      value: daily,
      onChange: e => setDaily(e.target.value)
    })), /*#__PURE__*/React.createElement("label", {
      className: "adm-other-row"
    }, "\u5355\u6B21\u6700\u591A\u5B57\u6570", /*#__PURE__*/React.createElement("input", {
      className: "adm-input",
      required: true,
      type: "number",
      min: "50",
      step: "1",
      max: maxSettingValue,
      disabled: saving,
      value: chars,
      onChange: e => setChars(e.target.value)
    })), error && /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-other-error"
    }, error, conflict && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: reload
    }, "\u91CD\u65B0\u8BFB\u53D6")), /*#__PURE__*/React.createElement("footer", {
      className: "adm-other-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn primary",
      disabled: saving || !dirty || !valid || conflict
    }, "\u4FDD\u5B58\u914D\u7F6E")));
  }
  function Settings(props) {
    const {
      data,
      error,
      reload
    } = useRead('/settings');
    if (error) return /*#__PURE__*/React.createElement(ReadError, {
      error: error,
      retry: reload
    });
    if (!data) return /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, "\u6B63\u5728\u8BFB\u53D6\u914D\u7F6E\u2026");
    return /*#__PURE__*/React.createElement(SettingsForm, _extends({
      settings: data,
      reload: reload
    }, props));
  }
  function Overview({
    snapshot
  }) {
    const {
      data,
      error,
      reload
    } = snapshot;
    if (error) return /*#__PURE__*/React.createElement(ReadError, {
      error: error,
      retry: reload
    });
    if (!data) return /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, "\u6B63\u5728\u8BFB\u53D6\u6539\u5199\u6982\u51B5\u2026");
    const metrics = [['累计问卷', data.applications, '今日新增 ' + data.applications_today], ['待审核', data.pending, '当前已获资格 ' + data.approved], ['今日自动放通', data.auto_approved_today, '按北京时间计'], ['今日改写调用', data.calls_today, '其中成功 ' + data.succeeded_today], ['累计改写调用', data.calls, '按已受理请求计']];
    return /*#__PURE__*/React.createElement("dl", {
      className: "adm-card rw-admin-overview",
      "aria-label": "\u6539\u5199\u6982\u51B5\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09"
    }, metrics.map(([label, count, note]) => /*#__PURE__*/React.createElement("div", {
      key: label
    }, /*#__PURE__*/React.createElement("dt", null, label), /*#__PURE__*/React.createElement("dd", null, count.toLocaleString('zh-CN'), /*#__PURE__*/React.createElement("small", null, note)))));
  }
  function PolicyForm({
    policy,
    reload,
    toast,
    onBusy
  }) {
    const [draft, setDraft] = useState(policy);
    const [error, setError] = useState(''),
      [conflict, setConflict] = useState(false);
    const [saving, setSaving] = useState(false);
    const pending = useRef(false);
    const set = (key, value) => setDraft(current => ({
      ...current,
      [key]: value
    }));
    function toggleAnswer(key, value) {
      setDraft(current => {
        const choices = current.answers[key] || [];
        const selected = choices.includes(value) ? choices.filter(x => x !== value) : [...choices, value];
        return {
          ...current,
          answers: {
            ...current.answers,
            [key]: selected
          }
        };
      });
    }
    const numberFields = [['daily_limit', '每日自动放通人数上限', 1], ['min_books', '最少作品数', 0], ['min_chapters', '最少已写章数（有正文）', 0]];
    const valid = numberFields.every(([key,, min]) => draft[key] !== '' && Number.isInteger(Number(draft[key])) && Number(draft[key]) >= min && Number(draft[key]) <= maxSettingValue);
    const hasFilters = draft.paid_only || Number(draft.min_books) > 0 || Number(draft.min_chapters) > 0 || Object.values(draft.answers).some(values => values.length);
    async function save(event) {
      event.preventDefault();
      if (pending.current || !valid || conflict) return;
      pending.current = true;
      setSaving(true);
      onBusy(true);
      setError('');
      try {
        await write('/auto-policy', {
          ...draft,
          daily_limit: Number(draft.daily_limit),
          min_books: Number(draft.min_books),
          min_chapters: Number(draft.min_chapters)
        });
        toast?.('自动放通策略已保存');
        reload();
      } catch (failure) {
        setConflict(failure.status === 409);
        setError(failure.status === 409 ? '策略已被其他管理员修改，请重新读取。' : failure.message || '保存失败');
      } finally {
        pending.current = false;
        setSaving(false);
        onBusy(false);
      }
    }
    return /*#__PURE__*/React.createElement("form", {
      className: "adm-card adm-other-card rw-policy",
      onSubmit: save
    }, /*#__PURE__*/React.createElement("fieldset", {
      disabled: saving
    }, /*#__PURE__*/React.createElement("label", {
      className: "rw-policy-check"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: draft.enabled,
      onChange: e => set('enabled', e.target.checked)
    }), "\u542F\u7528\u81EA\u52A8\u653E\u901A"), /*#__PURE__*/React.createElement("p", null, "\u65B0\u7533\u8BF7\u5339\u914D\u540E\u6309\u987A\u5E8F\u653E\u901A\u3002\u5F53\u5929\u540D\u989D\u5DF2\u6EE1\u65F6\u8FDB\u5165\u5019\u8865\uFF0C\u5317\u4EAC\u65F6\u95F4\u6B21\u65E5\u6216\u8C03\u9AD8\u4E0A\u9650\u540E\u4F9D\u6B21\u8865\u653E\u3002"), numberFields.map(([key, label, min]) => /*#__PURE__*/React.createElement("label", {
      className: "adm-other-row",
      key: key
    }, label, /*#__PURE__*/React.createElement("input", {
      className: "adm-input",
      type: "number",
      required: true,
      min: min,
      max: maxSettingValue,
      step: "1",
      value: draft[key],
      onChange: e => set(key, e.target.value)
    }))), /*#__PURE__*/React.createElement("label", {
      className: "rw-policy-check"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: draft.paid_only,
      onChange: e => set('paid_only', e.target.checked)
    }), "\u4EC5\u9650\u6709\u5DF2\u5B8C\u6210\u4ED8\u8D39\u8BA2\u5355\u7684\u7528\u6237")), /*#__PURE__*/React.createElement("div", {
      className: "rw-policy-answers"
    }, /*#__PURE__*/React.createElement("h3", null, "\u95EE\u5377\u6761\u4EF6"), /*#__PURE__*/React.createElement("p", null, "\u672A\u9009\u7684\u9898\u76EE\u4E0D\u9650\u3002\u540C\u4E00\u9898\u5339\u914D\u4EFB\u4E00\u9009\u9879\u5373\u53EF\uFF0C\u4E0D\u540C\u9898\u76EE\u548C\u8D26\u53F7\u6761\u4EF6\u987B\u540C\u65F6\u6EE1\u8DB3\u3002"), questions.map(([key, label, options]) => /*#__PURE__*/React.createElement("fieldset", {
      key: key,
      disabled: saving
    }, /*#__PURE__*/React.createElement("legend", null, label), Object.entries(options).map(([value, title]) => /*#__PURE__*/React.createElement("label", {
      key: value,
      className: "rw-policy-choice"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: (draft.answers[key] || []).includes(value),
      onChange: () => toggleAnswer(key, value)
    }), title))))), draft.enabled && !hasFilters && /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, "\u5F53\u524D\u6240\u6709\u65B0\u7533\u8BF7\u5747\u53EF\u81EA\u52A8\u901A\u8FC7\uFF0C\u76F4\u81F3\u7528\u5B8C\u5F53\u65E5\u540D\u989D\u3002"), error && /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-other-error"
    }, error, conflict && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: reload
    }, "\u91CD\u65B0\u8BFB\u53D6")), /*#__PURE__*/React.createElement("footer", {
      className: "adm-other-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn primary",
      disabled: !valid || saving || conflict || draft === policy
    }, "\u4FDD\u5B58\u7B56\u7565")));
  }
  function AutoPolicy(props) {
    const {
      data,
      error,
      reload
    } = useRead('/auto-policy');
    if (error) return /*#__PURE__*/React.createElement(ReadError, {
      error: error,
      retry: reload
    });
    if (!data) return /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, "\u6B63\u5728\u8BFB\u53D6\u81EA\u52A8\u653E\u901A\u7B56\u7565\u2026");
    return /*#__PURE__*/React.createElement(PolicyForm, _extends({
      policy: data,
      reload: reload
    }, props));
  }
  const dispatchFields = [['单卡推理', [['max_active_chapters', '同时处理的文本数', 1, 32], ['gen_batch_size', '每批生成块数', 1, 32], ['score_batch_size', '每批评分段落数', 4, 64]]], ['队列与租约', [['max_queued_jobs', '新单排队上限（篇）', 1, 10000], ['job_timeout_sec', '从受理到交付的时限（秒）', 30, 300], ['lease_ttl_sec', '领单租约时长（秒）', 15, 300], ['max_attempts', '每篇最多领取次数', 1, 10], ['worker_offline_sec', '节点离线判定（秒）', 10, 300]]]];
  const numericControls = dispatchFields.flatMap(([, fields]) => fields);
  function WorkerCapacity({
    workers,
    settings
  }) {
    const Table = window.AdminDataTable;
    const applied = (row, field) => row.applied_config?.[field] ?? '—';
    const columns = [{
      key: 'worker_id',
      header: '推理节点',
      render: row => /*#__PURE__*/React.createElement(React.Fragment, null, row.worker_id, /*#__PURE__*/React.createElement("small", {
        className: "rw-worker-model"
      }, row.model_version))
    }, {
      key: 'online',
      header: '状态',
      render: row => row.online ? '在线' : '离线'
    }, {
      key: 'slots',
      header: '占用 / 可用',
      render: row => row.online ? row.active_slots + ' / ' + row.free_slots : '—'
    }, {
      key: 'limits',
      header: '已生效并发 / 生成 / 评分',
      render: row => row.applied_config ? ['max_active_chapters', 'gen_batch_size', 'score_batch_size'].map(key => applied(row, key)).join(' / ') : '尚未上报'
    }, {
      key: 'revision',
      header: '配置同步',
      render: row => {
        if (!row.online) return '—';
        if (!row.applied_config) return '待确认';
        const matches = row.applied_config.revision === settings.revision && ['max_active_chapters', 'gen_batch_size', 'score_batch_size'].every(key => row.applied_config[key] === settings[key]);
        return matches ? '已生效' : '待同步';
      }
    }, {
      key: 'last_seen_at',
      header: '最近通信',
      render: row => date(row.last_seen_at)
    }];
    return /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u63A8\u7406\u8282\u70B9\u5BB9\u91CF",
      columns: columns,
      rows: workers,
      compact: true,
      rowKey: "worker_id",
      empty: "\u5C1A\u65E0\u63A8\u7406\u8282\u70B9\u63A5\u5165"
    });
  }
  function Dispatch({
    onBusy,
    toast
  }) {
    const [snapshot, setSnapshot] = useState(null);
    const [loadError, setLoadError] = useState(''),
      [version, setVersion] = useState(0);
    const [edit, setEdit] = useState(null),
      [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false),
      [conflict, setConflict] = useState(false);
    const pending = useRef(false);
    const reload = () => setVersion(n => n + 1);
    useEffect(() => {
      const controller = new AbortController();
      let timer;
      async function refresh() {
        try {
          const result = await window.LF_API.request(base + '/dispatch', {
            signal: controller.signal,
            cache: 'no-store'
          });
          if (!controller.signal.aborted) {
            setSnapshot(prior => prior && prior.settings.revision > result.settings.revision ? prior : result);
            setLoadError('');
          }
        } catch (failure) {
          if (!controller.signal.aborted) setLoadError(failure.message || '读取调度状态失败');
        } finally {
          if (!controller.signal.aborted) timer = setTimeout(refresh, 8000);
        }
      }
      refresh();
      return () => {
        controller.abort();
        clearTimeout(timer);
      };
    }, [version]);
    if (!snapshot) return loadError ? /*#__PURE__*/React.createElement(ReadError, {
      error: loadError,
      retry: reload
    }) : /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, "\u6B63\u5728\u8BFB\u53D6\u961F\u5217\u4E0E\u8282\u70B9\u2026");
    const {
      settings,
      workers,
      queue
    } = snapshot;
    const draft = edit || settings;
    const setField = (key, value) => setEdit(current => ({
      ...(current || settings),
      [key]: value
    }));
    const stale = conflict || draft.revision !== settings.revision;
    const valid = numericControls.every(([key,, min, max]) => draft[key] !== '' && Number.isInteger(Number(draft[key])) && Number(draft[key]) >= min && Number(draft[key]) <= max);
    const dirty = draft.mode !== settings.mode || numericControls.some(([key]) => Number(draft[key]) !== settings[key]);
    async function save(event) {
      event.preventDefault();
      if (!valid || !dirty || stale || pending.current) return;
      const body = {
        revision: draft.revision,
        mode: draft.mode
      };
      numericControls.forEach(([key]) => {
        body[key] = Number(draft[key]);
      });
      pending.current = true;
      setSaving(true);
      onBusy(true);
      setSaveError('');
      try {
        const updated = await write('/dispatch', body);
        setSnapshot(current => ({
          ...current,
          settings: updated
        }));
        setEdit(null);
        reload();
        toast?.('调度参数已保存');
      } catch (failure) {
        if (failure.status === 409) {
          setConflict(true);
          reload();
        } else setSaveError(failure.message || '调度参数保存失败');
      } finally {
        pending.current = false;
        setSaving(false);
        onBusy(false);
      }
    }
    return /*#__PURE__*/React.createElement(React.Fragment, null, loadError && /*#__PURE__*/React.createElement(ReadError, {
      error: loadError,
      retry: reload
    }), /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-other-card"
    }, /*#__PURE__*/React.createElement("h3", null, "\u5F53\u524D\u4EFB\u52A1"), /*#__PURE__*/React.createElement("dl", {
      className: "rw-admin-overview",
      "aria-label": "\u4EFB\u52A1\u961F\u5217"
    }, [['排队中', queue.queued], ['推理中', queue.running], ['待交付', queue.ready]].map(([label, count]) => /*#__PURE__*/React.createElement("div", {
      key: label
    }, /*#__PURE__*/React.createElement("dt", null, label), /*#__PURE__*/React.createElement("dd", null, count)))), /*#__PURE__*/React.createElement(WorkerCapacity, {
      workers: workers,
      settings: settings
    })), /*#__PURE__*/React.createElement("form", {
      className: "adm-card adm-other-card rw-policy",
      onSubmit: save
    }, dispatchFields.map(([title, fields], index) => /*#__PURE__*/React.createElement("fieldset", {
      key: title,
      disabled: saving
    }, /*#__PURE__*/React.createElement("legend", null, title), fields.map(([key, label, min, max]) => /*#__PURE__*/React.createElement("label", {
      key: key,
      className: "adm-other-row"
    }, label, /*#__PURE__*/React.createElement("input", {
      className: "adm-input",
      type: "number",
      name: key,
      required: true,
      min: min,
      max: max,
      step: "1",
      value: draft[key],
      onChange: event => setField(key, event.target.value)
    }))), index === 0 && /*#__PURE__*/React.createElement("label", {
      className: "adm-other-row"
    }, "\u6539\u5199\u6A21\u5F0F", /*#__PURE__*/React.createElement("select", {
      className: "adm-other-mode",
      value: draft.mode,
      onChange: event => setField('mode', event.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: "auto_dual"
    }, "\u7A33\u59A5\u6539\u5199\u540E\u6309\u9700\u7CBE\u7B80"), /*#__PURE__*/React.createElement("option", {
      value: "steady_only"
    }, "\u4EC5\u7A33\u59A5\u6539\u5199"))))), saveError && /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-other-error"
    }, saveError), stale && /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-other-error"
    }, "\u5176\u4ED6\u7BA1\u7406\u5458\u5DF2\u4FEE\u6539\u914D\u7F6E\u3002", /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => {
        setEdit(null);
        setConflict(false);
        setSaveError('');
        reload();
      }
    }, "\u91CD\u65B0\u8BFB\u53D6")), /*#__PURE__*/React.createElement("footer", {
      className: "adm-other-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "c-btn primary",
      disabled: saving || stale || !dirty || !valid
    }, "\u4FDD\u5B58\u8C03\u5EA6\u53C2\u6570"))));
  }
  const taskStates = {
    queued: '排队中',
    running: '推理中',
    ready: '待交付',
    succeeded: '已交付',
    failed: '失败',
    timed_out: '超时',
    cancelled: '已取消'
  };
  const taskStages = {
    queued: '等待生成',
    steady_wave: '稳妥改写',
    score_steady: '稳妥稿评分',
    concise_batch: '精简改写',
    finalize_gate: '结果复检'
  };
  const taskErrors = {
    inference_error: '推理异常',
    invalid_input: '输入校验失败',
    request_cancelled: '请求中断',
    rewrite_quota_lost: '预占额度失效',
    rewrite_timeout: '超过交付时限',
    worker_attempts_exhausted: '已达领取上限',
    worker_lease_expired: '领单租约过期',
    other: '其他异常'
  };
  const quotaStates = {
    reserved: '已预占',
    succeeded: '已使用',
    released: '已释放',
    expired: '已过期'
  };
  const attemptStates = {
    running: '处理中',
    ready: '已回传',
    retry: '等待重派',
    failed: '失败',
    expired: '租约过期',
    cancelled: '已取消',
    timed_out: '超时'
  };
  const duration = value => value == null ? '—' : value < 1000 ? value.toLocaleString('zh-CN') + ' 毫秒' : (value / 1000).toLocaleString('zh-CN', {
    maximumFractionDigits: 1
  }) + ' 秒';
  const labelled = (labels, key) => key ? labels[key] || '未知' : '—';
  const grid = items => /*#__PURE__*/React.createElement("dl", {
    className: "adm-assistant-facts rw-task-facts"
  }, items.map(([label, value]) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: label
  }, /*#__PURE__*/React.createElement("dt", null, label), /*#__PURE__*/React.createElement("dd", null, value))));
  function TasksOverview({
    hours,
    version
  }) {
    const Table = window.AdminDataTable;
    const {
      data,
      error,
      reload
    } = useRead('/dispatch/tasks/overview?hours=' + hours, version);
    if (error) return /*#__PURE__*/React.createElement(ReadError, {
      error: error,
      retry: reload
    });
    if (!data) return /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, "\u6B63\u5728\u8BFB\u53D6\u4EFB\u52A1\u603B\u89C8\u2026");
    const closed = ['succeeded', 'failed', 'cancelled', 'timed_out'].reduce((count, status) => count + (data.states[status] || 0), 0);
    const successRate = closed ? ((data.states.succeeded || 0) / closed).toLocaleString('zh-CN', {
      style: 'percent',
      maximumFractionDigits: 1
    }) : '—';
    const counts = [['已受理', data.total], ['已交付', data.states.succeeded || 0], ['成功率', successRate, '按已结束任务计'], ['失败', data.states.failed || 0], ['超时', data.states.timed_out || 0], ['再次领单', data.repicked]];
    const timings = [{
      label: '首次排队',
      ...data.first_queue_wait
    }, {
      label: '节点处理',
      ...data.worker_processing
    }, {
      label: '成功交付',
      ...data.successful_delivery
    }];
    const timingColumns = [{
      key: 'label',
      header: '耗时',
      priority: 'primary'
    }, {
      key: 'p50_ms',
      header: '中位数',
      render: row => duration(row.p50_ms)
    }, {
      key: 'p95_ms',
      header: '95% 分位',
      render: row => duration(row.p95_ms)
    }, {
      key: 'samples',
      header: '样本数'
    }];
    const failureColumns = [{
      key: 'code',
      header: '原因',
      priority: 'primary',
      render: row => labelled(taskErrors, row.code)
    }, {
      key: 'count',
      header: '任务数'
    }];
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("dl", {
      className: "adm-card rw-admin-overview",
      "aria-label": "\u4EFB\u52A1\u603B\u89C8"
    }, counts.map(([name, count, note]) => /*#__PURE__*/React.createElement("div", {
      key: name
    }, /*#__PURE__*/React.createElement("dt", null, name), /*#__PURE__*/React.createElement("dd", null, count.toLocaleString('zh-CN'), note && /*#__PURE__*/React.createElement("small", null, note))))), /*#__PURE__*/React.createElement("div", {
      className: "rw-task-overview-grid"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-other-card"
    }, /*#__PURE__*/React.createElement("h3", null, "\u9636\u6BB5\u8017\u65F6"), /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u9636\u6BB5\u8017\u65F6",
      compact: true,
      columns: timingColumns,
      rows: timings,
      rowKey: "label"
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-other-card"
    }, /*#__PURE__*/React.createElement("h3", null, "\u5931\u8D25\u4E0E\u8D85\u65F6\u539F\u56E0"), /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u5931\u8D25\u4E0E\u8D85\u65F6\u539F\u56E0",
      compact: true,
      columns: failureColumns,
      rows: data.failures,
      rowKey: "code",
      empty: "\u5F53\u524D\u65F6\u6BB5\u65E0\u5931\u8D25\u6216\u8D85\u65F6\u4EFB\u52A1"
    }))));
  }
  function TaskDetail({
    jobId,
    onClose
  }) {
    const Drawer = window.AdminAssistantDrawer;
    const {
      data,
      error,
      reload
    } = useRead('/dispatch/tasks/' + encodeURIComponent(jobId));
    return /*#__PURE__*/React.createElement(Drawer, {
      title: "\u6539\u5199\u4EFB\u52A1\u8BE6\u60C5",
      onClose: onClose,
      footer: /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn",
        onClick: reload
      }, "\u5237\u65B0\u8BE6\u60C5")
    }, error ? /*#__PURE__*/React.createElement(ReadError, {
      error: error,
      retry: reload
    }) : !data ? /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, "\u6B63\u5728\u8BFB\u53D6\u4EFB\u52A1\u8BE6\u60C5\u2026") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, "\u4EFB\u52A1\u4E0E\u989D\u5EA6"), grid([['任务编号', data.job_id], ['请求编号', data.request_id], ['账号 ID', data.user_id || '—'], ['任务状态', labelled(taskStates, data.status)], ...(data.status === 'running' ? [['推理进度', labelled(taskStages, data.stage) + ' · ' + Math.round(data.progress_ratio * 100) + '%']] : []), ...(data.error_code ? [['结束原因', labelled(taskErrors, data.error_code)]] : []), ['改写模式', data.mode === 'steady_only' ? '仅稳妥改写' : '稳妥改写后按需精简'], ['受理时间', date(data.created_at)], ['交付截止', date(data.deadline_at)], ['结果就绪', date(data.ready_at)], ['结束时间', date(data.finished_at)], ['首次排队', duration(data.first_queue_wait_ms)], ['总耗时', duration(data.elapsed_ms)], ['免费额度', labelled(quotaStates, data.quota_status)], ['额度归属日', data.quota_date || '—'], ['额度结算时间', date(data.quota_finished_at)]])), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", null, "\u9886\u53D6\u8BB0\u5F55"), data.attempts.length ? /*#__PURE__*/React.createElement("ol", {
      className: "rw-task-attempts"
    }, data.attempts.map(attempt => {
      const metrics = attempt.metrics;
      return /*#__PURE__*/React.createElement("li", {
        key: attempt.attempt_no
      }, /*#__PURE__*/React.createElement("h4", null, "\u7B2C ", attempt.attempt_no, " \u6B21 \xB7 ", labelled(attemptStates, attempt.outcome)), grid([['节点', attempt.worker_id], ['领取时间', date(attempt.leased_at)], ['租约到期', date(attempt.lease_expires_at)], ['本次结束', date(attempt.finished_at)], ['收到稿件', date(attempt.received_at)], ['稿件处理', attempt.result_accepted == null ? '—' : attempt.result_accepted ? '已接收' : '已归档，未采用'], ...(attempt.error_code ? [['失败原因', labelled(taskErrors, attempt.error_code)]] : []), ...(metrics ? [['模型版本', attempt.model_version || '—'], ['节点处理耗时', duration(metrics.latency_ms)], ['原文 / 改写字数', metrics.source_chars + ' / ' + metrics.output_chars], ['文本块 / 采纳精简块', metrics.blocks_total + ' / ' + metrics.blocks_kept_concise]] : [])]));
    })) : /*#__PURE__*/React.createElement("p", null, "\u5C1A\u65E0\u9886\u53D6\u8BB0\u5F55"))));
  }
  function TaskRecords() {
    const Table = window.AdminDataTable;
    const [hours, setHours] = useState('24'),
      [version, setVersion] = useState(0);
    const [status, setStatus] = useState(''),
      [reference, setReference] = useState(''),
      [workerId, setWorkerId] = useState('');
    const [filter, setFilter] = useState({
      reference: '',
      workerId: ''
    });
    const [page, setPage] = useState(1),
      [selection, setSelection] = useState(null);
    const params = new URLSearchParams({
      hours,
      offset: String((page - 1) * pageSize),
      limit: String(pageSize)
    });
    if (status) params.set('status', status);
    if (filter.reference) params.set('reference', filter.reference);
    if (filter.workerId) params.set('worker_id', filter.workerId);
    const {
      data,
      error,
      reload
    } = useRead('/dispatch/tasks?' + params, version);
    const pages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));
    useEffect(() => {
      if (data && page > pages) setPage(pages);
    }, [data, page, pages]);
    const columns = [{
      key: 'created_at',
      header: '受理时间',
      priority: 'primary',
      render: row => date(row.created_at)
    }, {
      key: 'job_id',
      header: '任务编号',
      render: row => /*#__PURE__*/React.createElement("span", {
        title: row.job_id
      }, row.job_id.slice(0, 12))
    }, {
      key: 'status',
      header: '状态',
      render: row => labelled(taskStates, row.status)
    }, {
      key: 'worker_id',
      header: '当前或最后节点',
      render: row => row.worker_id || '—'
    }, {
      key: 'attempt_count',
      header: '领取次数'
    }, {
      key: 'elapsed_ms',
      header: '耗时',
      render: row => duration(row.elapsed_ms)
    }, {
      key: 'quota_status',
      header: '额度',
      render: row => labelled(quotaStates, row.quota_status)
    }];
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
      "aria-label": "\u4EFB\u52A1\u7EDF\u8BA1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rw-task-toolbar"
    }, /*#__PURE__*/React.createElement("h2", null, "\u603B\u89C8"), /*#__PURE__*/React.createElement("select", {
      "aria-label": "\u53D7\u7406\u65F6\u95F4\u8303\u56F4",
      className: "adm-other-mode",
      value: hours,
      onChange: event => {
        setHours(event.target.value);
        setPage(1);
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: "1"
    }, "\u6700\u8FD1 1 \u5C0F\u65F6"), /*#__PURE__*/React.createElement("option", {
      value: "24"
    }, "\u6700\u8FD1 24 \u5C0F\u65F6"), /*#__PURE__*/React.createElement("option", {
      value: "168"
    }, "\u6700\u8FD1 7 \u5929")), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => setVersion(n => n + 1)
    }, "\u5237\u65B0")), /*#__PURE__*/React.createElement(TasksOverview, {
      hours: hours,
      version: version
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-card adm-other-card rw-task-list"
    }, /*#__PURE__*/React.createElement("h2", null, "\u4EFB\u52A1\u660E\u7EC6"), /*#__PURE__*/React.createElement("form", {
      className: "rw-admin-filters",
      onSubmit: event => {
        event.preventDefault();
        setFilter({
          reference: reference.trim(),
          workerId: workerId.trim()
        });
        setPage(1);
        reload();
      }
    }, /*#__PURE__*/React.createElement("select", {
      "aria-label": "\u4EFB\u52A1\u72B6\u6001",
      className: "adm-other-mode",
      value: status,
      onChange: event => {
        setStatus(event.target.value);
        setPage(1);
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u5168\u90E8\u72B6\u6001"), Object.entries(taskStates).map(([key, label]) => /*#__PURE__*/React.createElement("option", {
      key: key,
      value: key
    }, label))), /*#__PURE__*/React.createElement("input", {
      className: "adm-input",
      type: "search",
      "aria-label": "\u4EFB\u52A1\u6216\u8BF7\u6C42\u7F16\u53F7",
      placeholder: "\u4EFB\u52A1\u6216\u8BF7\u6C42\u7F16\u53F7",
      value: reference,
      maxLength: 36,
      onChange: event => setReference(event.target.value)
    }), /*#__PURE__*/React.createElement("input", {
      className: "adm-input",
      type: "search",
      "aria-label": "\u8282\u70B9 ID",
      placeholder: "\u8282\u70B9 ID",
      value: workerId,
      maxLength: 128,
      onChange: event => setWorkerId(event.target.value)
    }), /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      type: "submit"
    }, "\u7B5B\u9009")), error ? /*#__PURE__*/React.createElement(ReadError, {
      error: error,
      retry: reload
    }) : /*#__PURE__*/React.createElement(Table, {
      ariaLabel: "\u6539\u5199\u4EFB\u52A1\u660E\u7EC6",
      rows: data?.items || [],
      columns: columns,
      rowKey: "job_id",
      compact: true,
      onRowActivate: row => setSelection(row.job_id),
      selectedRowKey: selection,
      loading: !data,
      empty: "\u5F53\u524D\u6761\u4EF6\u4E0B\u6CA1\u6709\u5DF2\u53D7\u7406\u7684\u4EFB\u52A1",
      pagination: {
        page,
        pages,
        pageSize,
        total: data?.total || 0,
        onPageChange: setPage
      }
    })), selection && /*#__PURE__*/React.createElement(TaskDetail, {
      key: selection,
      jobId: selection,
      onClose: () => setSelection(null)
    }));
  }
  function AdminRewritePreviewTab({
    toast
  }) {
    const [tab, setTab] = useState('applications'),
      [busy, setBusy] = useState(false);
    const overview = useRead('/overview');
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-other-page rw-admin-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-other-heading"
    }, /*#__PURE__*/React.createElement("h1", null, "\u964D AI \u6539\u5199")), /*#__PURE__*/React.createElement("nav", {
      className: "adm-usage-tabs",
      role: "tablist",
      "aria-label": "\u964D AI \u6539\u5199\u7BA1\u7406"
    }, [['applications', '申请与资格'], ['settings', '改写配置'], ['policy', '自动放通策略'], ['dispatch', '队列与调度'], ['tasks', '任务记录']].map(([id, label]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      type: "button",
      role: "tab",
      id: 'rw-tab-' + id,
      "aria-controls": 'rw-panel-' + id,
      "aria-selected": tab === id,
      disabled: busy,
      onClick: () => {
        if (id === 'applications' && tab !== id) overview.reload();
        setTab(id);
      }
    }, label))), /*#__PURE__*/React.createElement("section", {
      role: "tabpanel",
      id: 'rw-panel-' + tab,
      "aria-labelledby": 'rw-tab-' + tab
    }, tab === 'applications' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Overview, {
      snapshot: overview
    }), /*#__PURE__*/React.createElement(Applications, {
      toast: toast,
      refreshOverview: overview.reload
    })), tab === 'settings' && /*#__PURE__*/React.createElement(Settings, {
      onBusy: setBusy,
      toast: toast
    }), tab === 'policy' && /*#__PURE__*/React.createElement(AutoPolicy, {
      onBusy: setBusy,
      toast: toast
    }), tab === 'dispatch' && /*#__PURE__*/React.createElement(Dispatch, {
      onBusy: setBusy,
      toast: toast
    }), tab === 'tasks' && /*#__PURE__*/React.createElement(TaskRecords, null)));
  }
  window.AdminRewritePreviewTab = AdminRewritePreviewTab;
})();
}
