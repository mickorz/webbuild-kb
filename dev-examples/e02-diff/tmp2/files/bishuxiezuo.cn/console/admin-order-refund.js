{
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const isEnglish = () => window.CLANG === 'en';
  const cp = (zh, en) => isEnglish() ? en : zh;
  const credits = value => Number(((Number(value) || 0) / 1000).toFixed(3)).toLocaleString();
  const money = cents => `¥${((Number(cents) || 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
  const stamp = value => value ? new Date(value).toLocaleString(isEnglish() ? 'en-US' : 'zh-CN') : '—';
  const userName = user => user.display_name || String(user.email || '').split('@')[0] || cp('未命名用户', 'Unnamed user');
  const cycleName = cycle => cycle === 'yearly' ? cp('年付', 'yearly') : cp('月付', 'monthly');
  function orderTitle(order) {
    if (order.kind === 'subscription') return `${order.plan_name || order.plan_code || order.product_code} · ${cycleName(order.billing_cycle)}`;
    if (order.kind === 'credit_pack') return cp(`加量包 · ${credits(order.credit_millis)} 笔力`, `Credit pack · ${credits(order.credit_millis)} credits`);
    if (order.kind === 'public_api_wallet') return cp('公益模型充值', 'Public model top-up');
    return order.product_code;
  }
  function orderState(order) {
    if (order.refund) return cp(`已退款 ${money(order.refund.refund_amount_cents)}`, `Refunded ${money(order.refund.refund_amount_cents)}`);
    if (order.unsupported_reason === 'external_wallet') return cp('余额在外部系统，不支持回收', 'External balance; not revocable');
    return null;
  }
  function effectText(preview, order) {
    const plan = order.plan_name || order.plan_code;
    if (preview.action === 'remove_queued_term') return cp(`撤销尚未生效的「${plan}」，当前权益不变`, `Cancel the queued ${plan} term; the current term stays`);
    if (preview.action === 'end_current_term') {
      const next = preview.next_plan_name || preview.next_plan_code;
      return preview.next_is_queued_term ? cp(`立即结束当前「${plan}」，排队中的「${next}」立即生效`, `End the current ${plan} term now; the queued ${next} term starts now`) : cp(`立即结束当前「${plan}」，回落免费版`, `End the current ${plan} term now and return to the free plan`);
    }
    if (preview.action === 'clawback_pack_credits') return cp(`扣回加量包剩余笔力，最多扣到 0（原发放 ${credits(preview.granted_millis)}）`, `Take back the pack's remaining credits, down to 0 (granted ${credits(preview.granted_millis)})`);
    return cp('该订单权益已不在账户中，仅标记退款', 'The order no longer provides entitlements; mark it refunded only');
  }
  function AdminOrderRefundDrawer({
    user,
    onClose,
    onDone
  }) {
    const [orders, setOrders] = useState(null);
    const [selected, setSelected] = useState(null);
    const [preview, setPreview] = useState(null);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [completed, setCompleted] = useState(false);
    const closeRef = useRef(null);
    useEffect(() => {
      if (closeRef.current) closeRef.current.focus();
      window.LF_API.adminRefundableOrders(user.id).then(rows => setOrders(rows || [])).catch(loadError => {
        setOrders([]);
        setError(loadError.message || cp('订单载入失败', 'Could not load orders'));
      });
    }, [user.id]);
    useEffect(() => {
      const closeOnEscape = event => {
        if (event.key === 'Escape' && !busy) onClose();
      };
      window.addEventListener('keydown', closeOnEscape);
      return () => window.removeEventListener('keydown', closeOnEscape);
    }, [busy, onClose]);
    const loadPreview = async order => {
      setBusy(true);
      try {
        setPreview(await window.LF_API.adminPreviewOrderRefund(user.id, order.id));
      } catch (previewError) {
        setPreview(null);
        setError(previewError.message || cp('影响预览失败', 'Could not preview the impact'));
      } finally {
        setBusy(false);
      }
    };
    const choose = order => {
      setSelected(order);
      setPreview(null);
      setError('');
      setReason('');
      setAmount(String((order.amount_cents || 0) / 100));
      loadPreview(order);
    };
    const back = () => {
      setSelected(null);
      setPreview(null);
      setError('');
    };
    const amountCents = Math.round(Number(amount) * 100);
    const valid = !!(selected && preview && preview.can_apply && reason.trim() && Number.isFinite(amountCents) && amountCents > 0 && amountCents <= selected.amount_cents);
    const submit = async () => {
      if (!valid || busy) return;
      setBusy(true);
      setError('');
      try {
        await window.LF_API.adminApplyOrderRefund(user.id, selected.id, {
          refund_amount_cents: amountCents,
          reason: reason.trim(),
          expected_fingerprint: preview.fingerprint
        });
        setCompleted(true);
        await onDone();
      } catch (submitError) {
        const detail = submitError && submitError.body && submitError.body.detail;
        setError(submitError.message || cp('退款回收失败', 'Refund failed'));
        if (detail && detail.code === 'refund_preview_stale') {
          setBusy(false);
          await loadPreview(selected);
          setError(cp('账户已变化，影响已重新预览，请核对后再确认', 'The account changed. The impact was refreshed; review it and confirm again.'));
          return;
        }
      } finally {
        setBusy(false);
      }
    };
    const list = /*#__PURE__*/React.createElement(React.Fragment, null, orders === null ? /*#__PURE__*/React.createElement("p", null, cp('载入中…', 'Loading…')) : null, orders && orders.length === 0 && !error ? /*#__PURE__*/React.createElement("p", null, cp('没有已履约的付费订单', 'No fulfilled paid orders')) : null, orders && orders.length ? /*#__PURE__*/React.createElement("ul", {
      className: "adm-refund-orders"
    }, orders.map(order => /*#__PURE__*/React.createElement("li", {
      key: order.id
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, orderTitle(order)), /*#__PURE__*/React.createElement("small", null, money(order.amount_cents), " \xB7 ", stamp(order.created_at))), order.refundable ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => choose(order),
      disabled: busy
    }, cp('退款', 'Refund')) : /*#__PURE__*/React.createElement("span", null, orderState(order))))) : null);
    const confirm = selected ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
      className: "adm-user-impact"
    }, /*#__PURE__*/React.createElement("h3", null, orderTitle(selected), " \xB7 ", money(selected.amount_cents)), preview ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "adm-refund-effect"
    }, effectText(preview, selected)), preview.can_apply ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, credits(preview.balance_millis)), /*#__PURE__*/React.createElement("i", null, "\u2192"), /*#__PURE__*/React.createElement("strong", null, credits(preview.resulting_balance_millis))) : null, preview.can_apply && preview.action === 'end_current_term' ? /*#__PURE__*/React.createElement("small", null, cp(`回收后套餐：${preview.resulting_plan_name || preview.resulting_plan_code}，至 ${stamp(preview.resulting_period_end)}`, `Plan after refund: ${preview.resulting_plan_name || preview.resulting_plan_code}, until ${stamp(preview.resulting_period_end)}`)) : null, !preview.can_apply ? /*#__PURE__*/React.createElement("p", {
      className: "adm-user-operation-error"
    }, cp(`暂不能回收：冻结 ${credits(preview.blocking.reserved_millis)} 笔力，${preview.blocking.active_task_count} 个运行中任务`, `Blocked: ${credits(preview.blocking.reserved_millis)} reserved, ${preview.blocking.active_task_count} active tasks`)) : null) : /*#__PURE__*/React.createElement("p", null, cp('正在预览影响…', 'Previewing impact…'))), /*#__PURE__*/React.createElement("div", {
      className: "adm-user-danger-note"
    }, /*#__PURE__*/React.createElement("strong", null, cp('只回收笔枢内的权益', 'Only Bishu entitlements are revoked')), /*#__PURE__*/React.createElement("span", null, cp('款项需在支付渠道手动退回。', 'Return the money manually in the payment channel.'))), /*#__PURE__*/React.createElement("label", null, cp('实际退款金额（元）', 'Refunded amount (CNY)'), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0.01",
      step: "0.01",
      max: selected.amount_cents / 100,
      value: amount,
      disabled: busy,
      onChange: event => setAmount(event.target.value)
    })), /*#__PURE__*/React.createElement("label", null, cp('处理原因', 'Reason'), /*#__PURE__*/React.createElement("textarea", {
      value: reason,
      disabled: busy,
      onChange: event => setReason(event.target.value),
      placeholder: cp('记录可核验的业务依据', 'Record a verifiable business reason')
    }))) : null;
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-user-drawer-layer",
      role: "presentation",
      onMouseDown: event => {
        if (event.target === event.currentTarget && !busy) onClose();
      }
    }, /*#__PURE__*/React.createElement("aside", {
      className: "adm-user-drawer",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "adm-refund-drawer-title"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, userName(user), " \xB7 ", user.email || '—'), /*#__PURE__*/React.createElement("h2", {
      id: "adm-refund-drawer-title"
    }, cp('退款回收', 'Refund & revoke'))), /*#__PURE__*/React.createElement("button", {
      ref: closeRef,
      type: "button",
      "aria-label": cp('关闭操作抽屉', 'Close operation drawer'),
      onClick: onClose,
      disabled: busy
    }, "\xD7")), completed ? /*#__PURE__*/React.createElement("div", {
      className: "adm-user-operation-complete"
    }, /*#__PURE__*/React.createElement("b", null, cp('完成', 'Done')), /*#__PURE__*/React.createElement("h3", null, cp('权益已回收并写入审计', 'Entitlements revoked and audited')), /*#__PURE__*/React.createElement("p", null, cp('用户档案已按最新事实刷新。', 'The user profile has been refreshed.')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onClose
    }, cp('返回用户档案', 'Back to profile'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "adm-user-drawer-body"
    }, selected ? confirm : list, error ? /*#__PURE__*/React.createElement("p", {
      className: "adm-user-operation-error",
      role: "alert"
    }, error) : null), /*#__PURE__*/React.createElement("footer", null, selected ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: back,
      disabled: busy
    }, cp('返回订单列表', 'Back to orders')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "danger",
      onClick: submit,
      disabled: !valid || busy
    }, busy ? cp('处理中…', 'Working…') : cp('确认退款回收', 'Confirm refund'))) : /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onClose
    }, cp('关闭', 'Close'))))));
  }
  window.AdminOrderRefundDrawer = AdminOrderRefundDrawer;
})();
}
