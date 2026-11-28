{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
(function () {
  const {
    useRef,
    useState
  } = React;
  const Core = window.AdminCreditPacksCore,
    Dialog = window.ConfirmDialog;
  function CreditPackForm({
    row,
    codes,
    lang,
    onClose,
    onSaved
  }) {
    const t = (zh, en) => lang === 'en' ? en : zh;
    const [draft, setDraft] = useState(() => Core.draft(row || {}));
    const [errors, setErrors] = useState({}),
      [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false),
      formRef = useRef(null),
      firstRef = useRef(null);
    const fixed = draft.eligibility_type === 'allowlist';
    const messages = {
      code: t('商品编号须为 1～32 位小写字母、数字、下划线或短横线，以字母或数字开头。', 'Use 1–32 lowercase letters, digits, underscores or hyphens, starting with a letter or digit.'),
      duplicate: t('此商品编号已存在，请使用新的编号。', 'This product code already exists. Choose another code.'),
      name: t('请输入名称，最多 80 字符。', 'Enter a name of up to 80 characters.'),
      badge: t('徽标最多 32 字符。', 'Use up to 32 characters for the badge.'),
      money: t('请输入大于 0 的金额，最多两位小数。', 'Enter an amount greater than zero, with up to two decimals.'),
      credits: t('请输入大于 0 的笔力，最多三位小数。', 'Enter credits greater than zero, with up to three decimals.'),
      bonus: t('请输入不小于 0 的赠送笔力，最多三位小数。', 'Enter bonus credits of zero or more, with up to three decimals.'),
      minimum: t('请输入大于 0 的累计实付金额，最多两位小数。', 'Enter a lifetime paid amount greater than zero, with up to two decimals.'),
      sort: t('请输入有效的排序整数。', 'Enter a valid whole number for the display order.'),
      limit: t('请输入 1～2,147,483,647 的限购次数。', 'Enter a purchase limit from 1 to 2,147,483,647.'),
      type: t('请选择购买资格。', 'Select a purchase eligibility rule.')
    };
    const update = (key, value) => {
      setDraft(current => Core.change(current, key, value));
      setErrors(current => ({
        ...current,
        [key]: undefined
      }));
      setError('');
    };
    const fieldError = key => errors[key] ? /*#__PURE__*/React.createElement("small", {
      role: "alert",
      className: "adm-packs-error",
      id: 'pack-' + key + '-error'
    }, messages[errors[key]]) : null;
    const attrs = key => ({
      id: 'pack-' + key,
      value: draft[key],
      disabled: saving,
      'aria-invalid': errors[key] ? true : undefined,
      'aria-describedby': errors[key] ? 'pack-' + key + '-error' : undefined,
      onChange: event => update(key, event.target.value)
    });
    const field = (key, label, props = {}) => /*#__PURE__*/React.createElement("label", {
      className: "adm-packs-field",
      htmlFor: 'pack-' + key
    }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("input", _extends({}, attrs(key), props)), fieldError(key));
    const toggle = (key, label, disabled = false) => /*#__PURE__*/React.createElement("label", {
      className: "adm-packs-toggle",
      htmlFor: 'pack-' + key
    }, /*#__PURE__*/React.createElement("input", {
      id: 'pack-' + key,
      type: "checkbox",
      checked: fixed && ['allow_activity_discount', 'allow_coupons'].includes(key) ? false : draft[key],
      disabled: saving || disabled,
      onChange: event => update(key, event.target.checked)
    }), /*#__PURE__*/React.createElement("span", null, label));
    const submit = async event => {
      event.preventDefault();
      if (savingRef.current) return;
      const result = Core.validate(draft, codes, row && row.code);
      setErrors(result.errors);
      if (!result.payload) {
        const element = formRef.current.querySelector('#pack-' + Object.keys(result.errors)[0]);
        if (element) element.focus();
        return;
      }
      savingRef.current = true;
      setSaving(true);
      setError('');
      try {
        const saved = await window.LF_API.adminUpsertCreditPack(result.payload.code, result.payload);
        onSaved(saved);
      } catch (failure) {
        setError(!failure.status || failure.status >= 500 ? t('保存结果未确认，表单已保留。请核对商品后重试。', 'Saving was not confirmed. Your draft is kept. Check the product before retrying.') : failure.message || t('保存失败，请检查配置后重试。', 'Could not save. Check the settings and retry.'));
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    };
    return /*#__PURE__*/React.createElement(Dialog, {
      open: true,
      title: row ? t('编辑加量包', 'Edit credit pack') : t('新增加量包', 'New credit pack'),
      icon: null,
      className: "adm-packs-dialog",
      initialFocusRef: firstRef,
      onClose: () => {
        if (!savingRef.current) onClose();
      },
      cancelLabel: t('取消', 'Cancel'),
      confirmLabel: saving ? t('保存中…', 'Saving…') : t('保存加量包', 'Save credit pack'),
      confirmDisabled: saving,
      onConfirm: () => formRef.current.requestSubmit()
    }, /*#__PURE__*/React.createElement("form", {
      ref: formRef,
      noValidate: true,
      onSubmit: submit
    }, /*#__PURE__*/React.createElement("fieldset", {
      className: "adm-packs-fields",
      disabled: saving
    }, field('name', t('名称', 'Name'), {
      ref: firstRef,
      maxLength: 80,
      autoComplete: 'off'
    }), field('code', t('商品编号', 'Product code'), {
      disabled: saving || !!row,
      maxLength: 32,
      autoComplete: 'off',
      spellCheck: false
    }), field('price', t('售价（元）', 'Price (CNY)'), {
      type: 'number',
      min: '0.01',
      step: '0.01',
      inputMode: 'decimal'
    }), field('credits', t('基础笔力', 'Base credits'), {
      type: 'number',
      min: '0.001',
      step: '0.001',
      inputMode: 'decimal'
    }), field('bonus', t('赠送笔力', 'Bonus credits'), {
      type: 'number',
      min: '0',
      step: '0.001',
      inputMode: 'decimal'
    }), field('sort_order', t('显示排序', 'Display order'), {
      type: 'number',
      step: '1',
      inputMode: 'numeric'
    }), field('badge', t('徽标（选填）', 'Badge (optional)'), {
      maxLength: 32,
      list: 'pack-badge-options'
    }), /*#__PURE__*/React.createElement("datalist", {
      id: "pack-badge-options"
    }, /*#__PURE__*/React.createElement("option", {
      value: "\u4E13\u4EAB"
    }), /*#__PURE__*/React.createElement("option", {
      value: "\u7279\u60E0\u4E13\u4EAB"
    })), /*#__PURE__*/React.createElement("label", {
      className: "adm-packs-field",
      htmlFor: "pack-eligibility_type"
    }, /*#__PURE__*/React.createElement("span", null, t('购买资格', 'Purchase eligibility')), /*#__PURE__*/React.createElement("select", attrs('eligibility_type'), /*#__PURE__*/React.createElement("option", {
      value: "public"
    }, t('公开购买', 'Public purchase')), /*#__PURE__*/React.createElement("option", {
      value: "lifetime_spend"
    }, t('累计实付达标', 'Lifetime spending threshold')), /*#__PURE__*/React.createElement("option", {
      value: "allowlist"
    }, t('指定用户授权（固定价）', 'Selected users (fixed price)'))), fieldError('eligibility_type')), draft.eligibility_type === 'lifetime_spend' ? field('min_paid', t('最低累计实付（元）', 'Minimum lifetime paid (CNY)'), {
      type: 'number',
      min: '0.01',
      step: '0.01',
      inputMode: 'decimal'
    }) : null, /*#__PURE__*/React.createElement("div", {
      className: "adm-packs-wide adm-packs-switches"
    }, draft.eligibility_type === 'public' ? toggle('requires_subscription', t('仅有效付费会员可购买', 'Active paid members only')) : /*#__PURE__*/React.createElement("span", {
      className: "adm-packs-membership"
    }, fixed ? t('无需订阅', 'No membership required') : t('仅有效付费会员可购买', 'Active paid members only')), toggle('active', t('上架销售', 'On sale'))), /*#__PURE__*/React.createElement("fieldset", {
      className: "adm-packs-wide adm-packs-options",
      disabled: saving
    }, /*#__PURE__*/React.createElement("legend", null, fixed ? t('固定价 · 不参加折扣', 'Fixed price · discounts excluded') : t('优惠规则', 'Discount rules')), toggle('allow_activity_discount', t('参加活动折扣', 'Allow campaign discounts'), fixed), toggle('allow_coupons', t('允许使用优惠券', 'Allow coupons'), draft.eligibility_type !== 'public')), /*#__PURE__*/React.createElement("div", {
      className: "adm-packs-wide adm-packs-limit"
    }, toggle('unlimited', t('不限购买次数', 'Unlimited purchases')), !draft.unlimited ? field('per_user_limit', t('每用户限购次数', 'Purchase limit per user'), {
      type: 'number',
      min: '1',
      max: String(Core.MAX_INT),
      step: '1',
      inputMode: 'numeric'
    }) : null)), error ? /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "adm-packs-error"
    }, error) : null, /*#__PURE__*/React.createElement("button", {
      type: "submit",
      hidden: true,
      tabIndex: "-1",
      disabled: saving
    })));
  }
  window.AdminCreditPackForm = CreditPackForm;
})();
}
