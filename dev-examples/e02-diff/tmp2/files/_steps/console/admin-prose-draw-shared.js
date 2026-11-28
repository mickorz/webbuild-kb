{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
(function () {
  const C = window.AdminProseDrawCore;
  const t = (zh, en) => window.CLANG === 'en' && en ? en : zh;
  function Button({
    children,
    primary,
    danger,
    link,
    ...props
  }) {
    return /*#__PURE__*/React.createElement("button", _extends({
      type: "button",
      className: 'c-btn sm' + (primary ? ' gold' : '') + (danger ? ' danger' : '') + (link ? ' apd-link' : '')
    }, props), children);
  }
  function Notice({
    children,
    error = false,
    action
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: 'apd-notice' + (error ? ' is-error' : ''),
      role: error ? 'alert' : 'status'
    }, /*#__PURE__*/React.createElement("div", null, children), action);
  }
  function Panel({
    title,
    action,
    children
  }) {
    return /*#__PURE__*/React.createElement("section", {
      className: "apd-panel"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", null, title), action), children);
  }
  function Field({
    label,
    children,
    hint
  }) {
    return /*#__PURE__*/React.createElement("label", {
      className: "apd-field"
    }, /*#__PURE__*/React.createElement("span", null, label), children, hint && /*#__PURE__*/React.createElement("small", null, hint));
  }
  function Tabs({
    items,
    value,
    onChange,
    label
  }) {
    const ref = React.useRef([]);
    function key(event, index) {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % items.length;else if (event.key === 'ArrowLeft') next = (index + items.length - 1) % items.length;else if (event.key === 'Home') next = 0;else if (event.key === 'End') next = items.length - 1;else return;
      event.preventDefault();
      onChange(items[next].id);
      ref.current[next].focus();
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "apd-tabs",
      role: "tablist",
      "aria-label": label
    }, items.map((item, i) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      role: "tab",
      "aria-selected": value === item.id,
      tabIndex: value === item.id ? 0 : -1,
      ref: el => ref.current[i] = el,
      onKeyDown: e => key(e, i),
      onClick: () => onChange(item.id),
      key: item.id
    }, item.label)));
  }
  function Table({
    columns,
    ...props
  }) {
    const SharedTable = window.AdminDataTable;
    return /*#__PURE__*/React.createElement(SharedTable, _extends({}, props, {
      columns: columns.map(column => ({
        sortable: false,
        ...column
      })),
      compact: true,
      className: "apd-table"
    }));
  }
  function Detail({
    children,
    footer
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "apd-detail"
    }, /*#__PURE__*/React.createElement("div", {
      className: "apd-detail-body"
    }, children), footer && /*#__PURE__*/React.createElement("div", {
      className: "apd-actions"
    }, footer));
  }
  function Empty({
    children,
    action
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "apd-empty"
    }, /*#__PURE__*/React.createElement("p", null, children), action);
  }
  function Facts({
    entries
  }) {
    return /*#__PURE__*/React.createElement("dl", {
      className: "apd-facts"
    }, entries.map(([label, value]) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: label
    }, /*#__PURE__*/React.createElement("dt", null, label), /*#__PURE__*/React.createElement("dd", null, value == null ? '—' : value))));
  }
  const shortId = id => id ? id.slice(0, 8) : '—';
  const date = value => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.valueOf()) ? '—' : d.toLocaleString(window.CLANG === 'en' ? 'en-US' : 'zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const statusLabel = value => ({
    active: '运行中',
    draft: '草稿',
    paused: '已暂停',
    completed: '已结束',
    pending: '待处理',
    ready: '已就绪',
    cancelled: '已取消',
    rejected: '均不满意',
    failed: '失败',
    running: '进行中',
    queued: '排队中'
  })[value] || value || '—';
  const reasonLabel = value => ({
    task_draft: '任务尚未启用',
    task_paused: '任务已暂停',
    task_completed: '任务已结束',
    baseline_resource_mismatch: '基准资源不匹配',
    candidate_paused: '候选已暂停',
    no_eligible_candidate: '无可用候选',
    posterior_stop: '自动停投',
    cluster_stop: '自动停投',
    admin_paused: '手动暂停',
    resource_mismatch: '资源不匹配',
    baseline_mismatch: '基准不匹配',
    identical_to_baseline: '与基准相同',
    no_candidate: '无可用候选',
    global_disabled: '全局未开放',
    task_inactive: '任务未运行',
    completed: '任务已结束',
    not_calibrated: '停投判据待校准'
  })[value] || value || '—';
  function Tag({
    children,
    warning
  }) {
    return /*#__PURE__*/React.createElement("span", {
      className: 'apd-tag' + (warning ? ' is-warning' : '')
    }, children);
  }
  function SchemeLabel({
    scheme,
    onClick
  }) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      link: true,
      onClick: onClick
    }, scheme ? C.versionLabel(scheme) : t('方案不可用', 'Unavailable version')), /*#__PURE__*/React.createElement("small", null, shortId(scheme && scheme.id), scheme && ' · ' + scheme.model_ref));
  }
  function useRead(read, identity, enabled = true) {
    const readRef = React.useRef(read),
      generation = React.useRef(0),
      controller = React.useRef(null),
      alive = React.useRef(true);
    const [state, setState] = React.useState({
      data: null,
      loading: false,
      error: ''
    });
    readRef.current = read;
    const refresh = React.useCallback(async () => {
      if (!enabled) return;
      const current = ++generation.current;
      if (controller.current) controller.current.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      setState(old => ({
        ...old,
        loading: true,
        error: ''
      }));
      try {
        const data = await readRef.current(ctrl.signal);
        if (alive.current && current === generation.current) setState({
          data,
          loading: false,
          error: ''
        });
        return data;
      } catch (e) {
        if (alive.current && current === generation.current && e.name !== 'AbortError') setState(old => ({
          ...old,
          loading: false,
          error: e.message || t('读取失败', 'Read failed')
        }));
      }
    }, [identity, enabled]);
    React.useEffect(() => {
      alive.current = true;
      setState({
        data: null,
        loading: false,
        error: ''
      });
      refresh();
      return () => {
        alive.current = false;
        ++generation.current;
        if (controller.current) controller.current.abort();
      };
    }, [refresh]);
    return {
      ...state,
      refresh
    };
  }
  function ReadState({
    state,
    children
  }) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, state.error && /*#__PURE__*/React.createElement(Notice, {
      error: true,
      action: /*#__PURE__*/React.createElement(Button, {
        onClick: state.refresh
      }, t('重试', 'Retry'))
    }, state.error, state.data && ' · ' + t('保留上次读取结果', 'Showing previous data')), state.loading && !state.data ? /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "apd-loading"
    }, t('正在读取…', 'Loading…')) : state.data ? children : null);
  }
  function useFormGuard(app, route, dirty) {
    React.useEffect(() => {
      app.markDirty(route.key, dirty);
    }, [dirty, route.key]);
  }
  function RoutingFields({
    form,
    onChange,
    cap
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "apd-form-grid"
    }, /*#__PURE__*/React.createElement(Field, {
      label: t('任务权重', 'Task weight')
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      max: "2147483647",
      step: "1",
      value: form.weight,
      onChange: e => onChange({
        ...form,
        weight: e.target.value
      })
    })), /*#__PURE__*/React.createElement(Field, {
      label: t('探索比例（%）', 'Exploration (%)'),
      hint: form.exploration !== '' && Number(form.exploration) >= 0 && Number(form.exploration) <= 100 ? t('优先流量 ', 'Priority traffic ') + (100 - Number(form.exploration)) + '%' : null
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      max: "100",
      step: "any",
      value: form.exploration,
      onChange: e => onChange({
        ...form,
        exploration: e.target.value
      })
    })), cap && /*#__PURE__*/React.createElement(Field, {
      label: t('每用户总票权上限 K', 'Vote weight cap per user (K)')
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      max: "2147483647",
      step: "1",
      value: form.cap,
      onChange: e => onChange({
        ...form,
        cap: e.target.value
      })
    })));
  }
  window.AdminProseDraw = {
    C,
    t,
    Button,
    Notice,
    Panel,
    Field,
    Tabs,
    Table,
    Detail,
    Empty,
    Facts,
    shortId,
    date,
    statusLabel,
    reasonLabel,
    Tag,
    SchemeLabel,
    useRead,
    ReadState,
    useFormGuard,
    RoutingFields
  };
})();
}
