(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AdminCreditPacksCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const TYPES = ['public', 'lifetime_spend', 'allowlist'];
  const MAX_INT = 2147483647;

  function decimal(value, precision) {
    const raw = String(value == null ? '' : value).trim();
    if (!new RegExp('^\\d+(?:\\.\\d{1,' + precision + '})?$').test(raw)) return null;
    const parts = raw.split('.');
    const result = Number(parts[0] + (parts[1] || '').padEnd(precision, '0'));
    return Number.isSafeInteger(result) ? result : null;
  }

  function integer(value, minimum = 0) {
    const raw = String(value == null ? '' : value).trim();
    if (!/^-?\d+$/.test(raw)) return null;
    const result = Number(raw);
    return Number.isInteger(result) && result >= minimum && result <= MAX_INT ? result : null;
  }

  function units(value, scale) {
    if (!Number.isSafeInteger(value)) return '';
    const precision = String(scale).length - 1;
    const text = String(value).padStart(precision + 1, '0');
    const fraction = text.slice(-precision).replace(/0+$/, '');
    return text.slice(0, -precision) + (fraction ? '.' + fraction : '');
  }

  function newCode() {
    const bytes = new Uint8Array(8);
    globalThis.crypto.getRandomValues(bytes);
    return 'pack_' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function draft(row = {}) {
    return {
      code: row.code || newCode(), name: row.name || '',
      price: units(row.price_cents, 100), credits: units(row.credit_millis, 1000),
      bonus: units(row.bonus_millis == null ? 0 : row.bonus_millis, 1000), badge: row.badge || '',
      active: row.active === true, sort_order: String(row.sort_order == null ? 0 : row.sort_order),
      eligibility_type: row.eligibility_type || 'public',
      min_paid: units(row.min_paid_cents == null ? 0 : row.min_paid_cents, 100),
      requires_subscription: row.eligibility_type === 'lifetime_spend'
        || (row.eligibility_type !== 'allowlist' && row.requires_subscription === true),
      allow_activity_discount: row.allow_activity_discount !== false,
      allow_coupons: row.allow_coupons !== false,
      unlimited: row.per_user_limit == null, per_user_limit: String(row.per_user_limit == null ? 1 : row.per_user_limit),
    };
  }

  function change(current, key, value) {
    const next = { ...current, [key]: value };
    if (key === 'eligibility_type') {
      if (value !== 'lifetime_spend') next.min_paid = '0';
      next.requires_subscription = value === 'lifetime_spend';
      if (value === 'lifetime_spend') next.allow_coupons = false;
      if (value === 'allowlist') {
        next.allow_activity_discount = false;
        next.allow_coupons = false;
      }
    }
    return next;
  }

  function validate(value, existingCodes = [], editingCode = null) {
    const errors = {};
    const code = String(value.code || '').trim(), name = String(value.name || '').trim();
    const badge = String(value.badge || '').trim();
    if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(code)) errors.code = 'code';
    else if (!editingCode && existingCodes.includes(code)) errors.code = 'duplicate';
    else if (editingCode && code !== editingCode) errors.code = 'code';
    if (!name || name.length > 80) errors.name = 'name';
    if (badge.length > 32) errors.badge = 'badge';
    const price = decimal(value.price, 2), credits = decimal(value.credits, 3), bonus = decimal(value.bonus, 3);
    if (price == null || price <= 0 || price > MAX_INT) errors.price = 'money';
    if (credits == null || credits <= 0) errors.credits = 'credits';
    if (bonus == null || bonus < 0 || (credits != null && !Number.isSafeInteger(credits + bonus))) errors.bonus = 'bonus';
    const sort = integer(value.sort_order, -MAX_INT - 1);
    if (sort == null) errors.sort_order = 'sort';
    if (!TYPES.includes(value.eligibility_type)) errors.eligibility_type = 'type';
    const minimum = value.eligibility_type === 'lifetime_spend' ? decimal(value.min_paid, 2) : 0;
    if (minimum == null || (minimum <= 0 && value.eligibility_type === 'lifetime_spend')) errors.min_paid = 'minimum';
    const limit = value.unlimited ? null : integer(value.per_user_limit, 1);
    if (!value.unlimited && limit == null) errors.per_user_limit = 'limit';
    const fixed = value.eligibility_type === 'allowlist';
    return {
      errors,
      payload: Object.keys(errors).length ? null : {
        code, name, price_cents: price, credit_millis: credits, bonus_millis: bonus,
        badge: badge || null, active: value.active === true, sort_order: sort,
        eligibility_type: value.eligibility_type, min_paid_cents: minimum,
        requires_subscription: value.eligibility_type === 'lifetime_spend'
          || (!fixed && value.requires_subscription === true),
        allow_activity_discount: !fixed && value.allow_activity_discount === true,
        allow_coupons: value.eligibility_type === 'public' && value.allow_coupons === true, per_user_limit: limit,
      },
    };
  }

  function reason(value) {
    const text = String(value || '').trim();
    return text && text.length <= 255 ? text : null;
  }

  function money(value, lang) {
    return Number.isSafeInteger(value) ? '¥' + formatted(value, 100, lang) : '—';
  }

  function credits(value, lang) {
    return Number.isSafeInteger(value) ? formatted(value, 1000, lang) : '—';
  }

  function formatted(value, scale, lang) {
    const parts = units(value, scale).split('.');
    return Number(parts[0]).toLocaleString(lang === 'en' ? 'en-GB' : 'zh-CN') + (parts[1] ? '.' + parts[1] : '');
  }

  return Object.freeze({ TYPES, MAX_INT, decimal, integer, draft, change, validate, reason, money, credits });
});
