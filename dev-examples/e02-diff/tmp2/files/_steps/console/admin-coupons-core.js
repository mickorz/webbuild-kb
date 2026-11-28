(function (root) {
  const SCOPES = ['all', 'subscription', 'subscription_monthly', 'subscription_yearly', 'credit_pack', 'products'];
  const MONEY_MAX_CENTS = 100000000;
  function decimal(value, places) {
    const text = String(value == null ? '' : value).trim();
    if (!new RegExp('^\\d+(?:\\.\\d{1,' + places + '})?$').test(text)) return null;
    const [whole, fraction = ''] = text.split('.');
    const result = Number(whole) * (10 ** places) + Number(fraction.padEnd(places, '0'));
    return Number.isSafeInteger(result) ? result : null;
  }
  function newCode() {
    const bytes = new Uint8Array(10);
    root.crypto.getRandomValues(bytes);
    return 'LF-CP-' + Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function draft(code) {
    return { name: '', description: '', claim_code: code, discount_type: 'percent',
      discount: '20', min_spend: '0', scope: 'all', products: [], max_claims: '',
      per_user_claim_limit: '1', starts_at: '', claim_expires_at: '', coupon_expires_at: '' };
  }
  function productOptions(catalog) {
    return ['plans', 'packs'].flatMap(key => ((catalog && catalog[key]) || [])
      .filter(item => item.active !== false && item.price_cents > 0)
      .map(item => ({ value: (key === 'plans' ? 'subscription:' : 'credit_pack:') + item.code,
        name: item.name, kind: key === 'plans' ? 'subscription' : 'credit_pack' })));
  }
  function validate(value, products, now = Date.now()) {
    const errors = {};
    const name = value.name.trim(), code = value.claim_code.trim().toUpperCase();
    if (!name || name.length > 120) errors.name = 'name';
    if (value.description.length > 500) errors.description = 'description';
    if (code.length < 4 || code.length > 128) errors.claim_code = 'code';
    const discount = decimal(value.discount, 2), minimum = decimal(value.min_spend || '0', 2);
    if (value.discount_type === 'percent') {
      if (discount == null || discount < 1 || discount > 10000) errors.discount = 'percent';
    } else if (value.discount_type === 'fixed') {
      if (discount == null || discount < 1 || discount > MONEY_MAX_CENTS) errors.discount = 'money';
    } else errors.discount_type = 'type';
    if (minimum == null || minimum > MONEY_MAX_CENTS) errors.min_spend = 'minimum';
    const integer = text => /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) && Number(text) >= 1 && Number(text) <= 2147483647;
    if (value.max_claims && !integer(value.max_claims)) errors.max_claims = 'limit';
    if (!integer(value.per_user_claim_limit)) errors.per_user_claim_limit = 'limit';
    if (!SCOPES.includes(value.scope)) errors.scope = 'scope';
    const validProducts = new Set(products.map(item => item.value));
    if (value.scope === 'products' && (!value.products.length || value.products.some(item => !validProducts.has(item)))) errors.products = 'products';
    const dates = {};
    ['starts_at', 'claim_expires_at', 'coupon_expires_at'].forEach(key => {
      dates[key] = value[key] ? new Date(value[key]).getTime() : null;
      if (value[key] && !Number.isFinite(dates[key])) errors[key] = 'date';
      else if (key !== 'starts_at' && dates[key] != null && dates[key] <= now) errors[key] = 'future';
    });
    const start = dates.starts_at == null ? now : dates.starts_at;
    if (dates.claim_expires_at != null && dates.claim_expires_at <= start) errors.claim_expires_at = 'after_start';
    if (dates.coupon_expires_at != null && dates.coupon_expires_at <= start) errors.coupon_expires_at = 'after_start';
    if (dates.claim_expires_at != null && dates.coupon_expires_at != null && dates.coupon_expires_at < dates.claim_expires_at) errors.coupon_expires_at = 'after_claim';
    if (Object.keys(errors).length) return { errors, payload: null };
    return { errors, payload: {
      name, description: value.description.trim() || null, claim_code: code,
      discount_type: value.discount_type,
      discount_millis: value.discount_type === 'fixed' ? discount * 50 : null,
      discount_percent_bps: value.discount_type === 'percent' ? discount : null,
      min_spend_millis: minimum * 50,
      applicable_task_types: value.scope === 'all' ? [] : value.scope === 'products' ? [...new Set(value.products)] : [value.scope],
      max_claims: value.max_claims ? Number(value.max_claims) : null,
      per_user_claim_limit: Number(value.per_user_claim_limit),
      ...Object.fromEntries(Object.entries(dates).map(([key, date]) => [key, date == null ? null : new Date(date).toISOString()])),
    } };
  }
  function campaignStatus(row, now = Date.now()) {
    if (!row.active) return 'inactive';
    if (row.coupon_expires_at && Date.parse(row.coupon_expires_at) <= now) return 'expired';
    if (row.starts_at && Date.parse(row.starts_at) > now) return 'scheduled';
    if (row.claim_expires_at && Date.parse(row.claim_expires_at) <= now) return 'closed';
    if (row.max_claims != null && row.claim_count >= row.max_claims) return 'exhausted';
    return 'active';
  }
  function discountText(row, lang) {
    if (row.discount_type === 'fixed') return '¥' + Number((row.discount_millis || 0) / 5000).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const percent = (row.discount_percent_bps || 0) / 100;
    return lang === 'en' ? percent + '% off' : percent === 100 ? '全额减免' : Number(((100 - percent) / 10).toFixed(3)) + ' 折';
  }
  const api = { SCOPES, decimal, newCode, draft, productOptions, validate, campaignStatus, discountText };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AdminCouponsCore = api;
})(typeof window === 'object' ? window : globalThis);
