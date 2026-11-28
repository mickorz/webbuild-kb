{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
(function () {
  const {
    useRef,
    useState
  } = React;
  const Core = window.AdminCouponsCore;
  const Dialog = window.ConfirmDialog;
  function CouponForm({
    open,
    lang,
    products,
    catalogError,
    onCatalogRetry,
    onClose,
    onCreated
  }) {
    const t = (zh, en) => lang === 'en' ? en : zh;
    const [draft, setDraft] = useState(() => Core.draft(Core.newCode()));
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false),
      formRef = useRef(null),
      firstRef = useRef(null);
    const messages = {
      name: t('请输入活动名称，最多 120 字符。', 'Enter a name of up to 120 characters.'),
      description: t('说明最多 500 字符。', 'Use up to 500 characters.'),
      code: t('领券码须为 4～128 字符。', 'Use 4–128 characters for the claim code.'),
      percent: t('请输入 0.01～100 的减免百分比，最多两位小数。', 'Enter a discount from 0.01 to 100%, with up to two decimals.'),
      money: t('请输入 0.01～1,000,000 元，最多两位小数。', 'Enter ¥0.01–1,000,000, with up to two decimals.'),
      minimum: t('请输入 0～1,000,000 元，最多两位小数。', 'Enter ¥0–1,000,000, with up to two decimals.'),
      limit: t('请输入 1～2,147,483,647 的整数。', 'Enter a whole number from 1 to 2,147,483,647.'),
      products: t('请至少选择一个当前在售商品。', 'Select at least one product currently on sale.'),
      scope: t('请选择适用范围。', 'Select a scope.'),
      type: t('请选择优惠类型。', 'Select a discount type.'),
      date: t('请输入有效时间。', 'Enter a valid date and time.'),
      future: t('截止时间必须晚于现在。', 'The deadline must be in the future.'),
      after_start: t('截止时间必须晚于开始时间。', 'The deadline must follow the start time.'),
      after_claim: t('用券截止时间不能早于领券截止时间。', 'Coupons must not expire before claiming ends.')
    };
    const update = (key, value) => {
      setDraft(current => ({
        ...current,
        [key]: value
      }));
      setErrors(current => ({
        ...current,
        [key]: undefined
      }));
      setError('');
    };
    const fieldError = key => errors[key] ? /*#__PURE__*/React.createElement("small", {
      id: 'coupon-' + key + '-error',
      className: "adm-coupons-error",
      role: "alert"
    }, messages[errors[key]]) : null;
    const attrs = key => ({
      id: 'coupon-' + key,
      value: draft[key],
      disabled: saving,
      'aria-invalid': errors[key] ? true : undefined,
      'aria-describedby': errors[key] ? 'coupon-' + key + '-error' : undefined,
      onChange: event => update(key, event.target.value)
    });
    const field = (key, label, props = {}) => /*#__PURE__*/React.createElement("label", {
      className: "adm-coupons-field",
      htmlFor: 'coupon-' + key
    }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("input", _extends({}, attrs(key), props)), fieldError(key));
    const submit = async event => {
      event.preventDefault();
      if (savingRef.current) return;
      const result = Core.validate(draft, products);
      setErrors(result.errors);
      if (!result.payload) {
        const invalid = formRef.current.querySelector('#coupon-' + Object.keys(result.errors)[0]);
        if (invalid) invalid.focus();
        return;
      }
      savingRef.current = true;
      setSaving(true);
      setError('');
      try {
        const created = await window.LF_API.adminCreateCouponCampaign(result.payload);
        onCreated(created);
        setDraft(Core.draft(Core.newCode()));
        setErrors({});
      } catch (failure) {
        setError(failure.status === 409 ? t('此领券码已存在。若刚才提交结果不明，请先返回列表核对活动。', 'This code already exists. If a previous submission was uncertain, check the campaign list first.') : !failure.status || failure.status >= 500 ? t('创建结果未确认，当前领券码和表单已保留。请先返回列表核对，避免重复创建。', 'Creation was not confirmed. The code and draft are kept. Check the list before trying again.') : failure.message || t('创建失败，请检查配置后重试。', 'Could not create the campaign. Check the settings and retry.'));
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    };
    const scopeLabels = {
      all: t('全场', 'All products'),
      subscription: t('全部订阅套餐', 'All subscriptions'),
      subscription_monthly: t('仅月付订阅', 'Monthly subscriptions'),
      subscription_yearly: t('仅年付订阅', 'Annual subscriptions'),
      credit_pack: t('笔力加量包', 'Credit packs'),
      products: t('指定商品', 'Selected products')
    };
    const percent = Core.decimal(draft.discount, 2);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return /*#__PURE__*/React.createElement(Dialog, {
      open: open,
      title: t('新建优惠券', 'New coupon campaign'),
      className: "adm-coupons-dialog",
      icon: null,
      initialFocusRef: firstRef,
      onClose: () => {
        if (!savingRef.current) onClose();
      },
      cancelLabel: t('取消', 'Cancel'),
      confirmLabel: saving ? t('创建中…', 'Creating…') : t('创建优惠券', 'Create campaign'),
      confirmDisabled: saving,
      onConfirm: () => formRef.current.requestSubmit()
    }, /*#__PURE__*/React.createElement("form", {
      ref: formRef,
      onSubmit: submit,
      noValidate: true
    }, /*#__PURE__*/React.createElement("fieldset", {
      disabled: saving,
      className: "adm-coupons-fields"
    }, field('name', t('活动名称', 'Campaign name'), {
      ref: firstRef,
      maxLength: 120,
      autoComplete: 'off'
    }), field('claim_code', t('领券码', 'Claim code'), {
      minLength: 4,
      maxLength: 128,
      autoComplete: 'off',
      spellCheck: false
    }), /*#__PURE__*/React.createElement("label", {
      className: "adm-coupons-field adm-coupons-wide",
      htmlFor: "coupon-description"
    }, /*#__PURE__*/React.createElement("span", null, t('活动说明（选填）', 'Description (optional)')), /*#__PURE__*/React.createElement("textarea", _extends({}, attrs('description'), {
      rows: "2",
      maxLength: 500
    })), fieldError('description')), /*#__PURE__*/React.createElement("label", {
      className: "adm-coupons-field",
      htmlFor: "coupon-discount_type"
    }, /*#__PURE__*/React.createElement("span", null, t('优惠类型', 'Discount type')), /*#__PURE__*/React.createElement("select", attrs('discount_type'), /*#__PURE__*/React.createElement("option", {
      value: "percent"
    }, t('比例折扣', 'Percentage discount')), /*#__PURE__*/React.createElement("option", {
      value: "fixed"
    }, t('固定减免', 'Fixed discount'))), fieldError('discount_type')), field('discount', draft.discount_type === 'percent' ? t('减免比例（%）', 'Discount (%)') : t('减免金额（元）', 'Discount (CNY)'), {
      type: 'number',
      min: '0.01',
      max: draft.discount_type === 'percent' ? '100' : '1000000',
      step: '0.01'
    }), draft.discount_type === 'percent' && percent > 0 && percent <= 10000 ? /*#__PURE__*/React.createElement("p", {
      className: "adm-coupons-preview adm-coupons-wide"
    }, Core.discountText({
      discount_type: 'percent',
      discount_percent_bps: percent
    }, lang), " \xB7 ", t('实付', 'Pay'), " ", Number(((10000 - percent) / 100).toFixed(2)), "%") : null, field('min_spend', t('最低消费金额（元）', 'Minimum spend (CNY)'), {
      type: 'number',
      min: '0',
      max: '1000000',
      step: '0.01'
    }), /*#__PURE__*/React.createElement("label", {
      className: "adm-coupons-field",
      htmlFor: "coupon-scope"
    }, /*#__PURE__*/React.createElement("span", null, t('适用范围', 'Applies to')), /*#__PURE__*/React.createElement("select", attrs('scope'), Core.SCOPES.map(scope => /*#__PURE__*/React.createElement("option", {
      key: scope,
      value: scope
    }, scopeLabels[scope]))), fieldError('scope')), draft.scope === 'products' ? /*#__PURE__*/React.createElement("div", {
      className: "adm-coupons-wide"
    }, /*#__PURE__*/React.createElement("fieldset", {
      id: "coupon-products",
      tabIndex: "-1",
      className: "adm-coupons-products",
      "aria-describedby": errors.products ? 'coupon-products-error' : undefined
    }, /*#__PURE__*/React.createElement("legend", null, t('选择商品', 'Select products')), products.map(item => /*#__PURE__*/React.createElement("label", {
      key: item.value
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: draft.products.includes(item.value),
      onChange: event => update('products', event.target.checked ? draft.products.concat(item.value) : draft.products.filter(value => value !== item.value))
    }), /*#__PURE__*/React.createElement("span", null, item.name, " ", /*#__PURE__*/React.createElement("small", null, item.kind === 'subscription' ? t('订阅', 'Subscription') : t('加量包', 'Credit pack'))))), !products.length && !catalogError ? /*#__PURE__*/React.createElement("span", null, t('暂无可选商品，或商品仍在加载。', 'No products available, or products are still loading.')) : null), fieldError('products'), catalogError ? /*#__PURE__*/React.createElement("p", {
      className: "adm-coupons-error",
      role: "alert"
    }, t('商品加载失败。', 'Could not load products.'), " ", /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: onCatalogRetry
    }, t('重试', 'Retry'))) : null) : null, /*#__PURE__*/React.createElement("details", {
      className: "adm-coupons-wide adm-coupons-rules"
    }, /*#__PURE__*/React.createElement("summary", null, t('优惠叠加与使用限制', 'Stacking and restrictions')), /*#__PURE__*/React.createElement("p", null, t('最低消费按系统优惠后的金额判断，再扣除此券。年付订阅和专业版不接受额外减免达到 30% 的券；固定减免也按实际比例判断。', 'Minimum spend is checked after system discounts, then this coupon is applied. Annual and Professional subscriptions reject coupons reducing that amount by 30% or more, including fixed discounts.'))), field('max_claims', t('总领取上限', 'Total claim limit'), {
      type: 'number',
      min: '1',
      step: '1',
      placeholder: t('不限', 'Unlimited')
    }), field('per_user_claim_limit', t('每人领取上限', 'Claims per person'), {
      type: 'number',
      min: '1',
      step: '1'
    }), /*#__PURE__*/React.createElement("div", {
      className: "adm-coupons-wide adm-coupons-time-title"
    }, t('有效期', 'Validity'), " ", /*#__PURE__*/React.createElement("small", null, timezone)), field('starts_at', t('开始时间（留空立即生效）', 'Starts at (blank = now)'), {
      type: 'datetime-local'
    }), field('claim_expires_at', t('领券截止（留空不限）', 'Claim deadline (blank = none)'), {
      type: 'datetime-local'
    }), field('coupon_expires_at', t('用券截止（留空不限）', 'Use deadline (blank = none)'), {
      type: 'datetime-local'
    })), error ? /*#__PURE__*/React.createElement("p", {
      className: "adm-coupons-error",
      role: "alert"
    }, error) : null, /*#__PURE__*/React.createElement("button", {
      type: "submit",
      hidden: true,
      tabIndex: "-1",
      disabled: saving
    })));
  }
  window.AdminCouponForm = CouponForm;
})();
}
