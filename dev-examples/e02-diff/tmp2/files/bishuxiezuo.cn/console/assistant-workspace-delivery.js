/* Private download capabilities stay in this request, never in saved references. */
(function (root) {
  const MAX_BYTES = 8 * 1024 * 1024;
  function checkResult(result, query) {
    const file = result?.file, delivery = result?.delivery;
    const legacyAlias = query.version && /^[a-f0-9]{32}$/.test(file?.file_id || '') &&
      String(file?.path || '').split('/')[0] === String(query.path || '').split('/')[0];
    if (!file || !file.version || !Number.isInteger(file.size) || file.size < 0 || file.size > MAX_BYTES ||
        (query.file_id ? file.file_id !== query.file_id : file.path !== query.path && !legacyAlias) ||
        (query.version && file.version !== query.version)) throw Error('Invalid file delivery');
    if (delivery?.mode === 'proxy') return result;
    const url = delivery?.url;
    if (delivery?.mode !== 'direct' || typeof url !== 'string' || url.length > 8192 || /[\s\\\x00-\x1f\x7f]/.test(url)) throw Error('Invalid file delivery');
    const parsed = new URL(url);
    const now = Date.now() / 1000;
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash || url.includes('#') ||
        (parsed.port && parsed.port !== '443') || !parsed.search ||
        !Number.isInteger(delivery.expires_at) || delivery.expires_at <= now || delivery.expires_at > now + 900) throw Error('Invalid file delivery');
    return result;
  }
  async function deliver(query, options, api) {
    const opts = options || {}, owner = api.identity();
    const check = () => {
      if (opts.signal?.aborted || !owner || api.identity() !== owner) throw new DOMException('File request cancelled', 'AbortError');
    };
    check();
    if (opts.previewImage) {
      const blob = await api.proxy('/api/assistant/workspace/preview?' + new URLSearchParams(query), {...opts, deliveryCheck: check});
      check();
      return blob;
    }
    const result = checkResult(await api.request('/api/assistant/workspace/download?' + new URLSearchParams(query), {signal: opts.signal, cache: 'no-store'}), query);
    check();
    const file = result.file;
    if (result.delivery.mode === 'proxy') {
      const pinned = file.file_id ? {file_id: file.file_id, version: file.version} : {path: file.path, version: file.version};
      return api.proxy('/api/assistant/workspace/file?' + new URLSearchParams(pinned), {...opts, deliveryCheck: check});
    }
    // COS supplies attachment disposition. Browser navigation streams the file
    // without buffering it in Portal or sending the Portal bearer token.
    const anchor = root.document.createElement('a');
    anchor.href = result.delivery.url;
    anchor.rel = 'noopener noreferrer';
    anchor.referrerPolicy = 'no-referrer';
    anchor.target = '_blank';
    root.document.body.appendChild(anchor);
    try { check(); anchor.click(); } finally { anchor.remove(); }
    return {filename: file.name || file.path.split('/').pop(), size: file.size};
  }
  root.AssistantWorkspaceDelivery = {deliver};
})(typeof window !== 'undefined' ? window : globalThis);
