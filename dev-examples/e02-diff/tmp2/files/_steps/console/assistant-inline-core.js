/* Serializable inline references. IDs and immutable versions, never filenames, identify tokens. */
(function(root, factory) {
  const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api;
  root.AssistantInlineCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function() {
  function token(file) {
    return file && /^[a-f0-9]{32}$/.test(file.file_id || '') && /^[A-Za-z0-9._:-]{1,128}$/.test(file.version || '')
      ? '[[workspace:' + file.file_id + ':' + file.version + ']]' : '';
  }
  function parts(value, files) {
    const known = new Map((files || []).map(file => [token(file), file]).filter(([key]) => key));
    const result = [], pattern = /\[\[workspace:[a-f0-9]{32}:[A-Za-z0-9._:-]{1,128}\]\]/g;
    let offset = 0;
    for (const match of String(value || '').matchAll(pattern)) {
      if (!known.has(match[0])) continue;
      if (match.index > offset) result.push({ text: value.slice(offset, match.index) });
      result.push({ file: known.get(match[0]), text: match[0] }); offset = match.index + match[0].length;
    }
    if (offset < value.length) result.push({ text: value.slice(offset) });
    return result;
  }
  function active(value, files) { return (files || []).filter(file => !token(file) || parts(value, [file]).some(part => part.file)); }
  function migrate(value, files) {
    const missing = (files || []).filter(file => token(file) && !String(value).includes(token(file)));
    return value + (missing.length ? (value ? ' ' : '') + missing.map(token).join(' ') : '');
  }
  function color(file) {
    const identity = String(file.file_id || file.path || file.name_snapshot || '');
    let hash = 2166136261;
    for (const char of identity) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
    return ['sage', 'slate', 'terra', 'gold'][((hash ^ (hash >>> 16)) >>> 0) % 4];
  }
  function unplaced(value, files, pendingFiles) {
    const sameFile = (a, b) => (a.file_id ? a.file_id === b.file_id : !b.file_id && a.path === b.path) && a.version === b.version;
    return (files || []).filter(file => {
      if (token(file) && String(value).includes(token(file))) return false;
      // Retain the recovery snapshot, but do not display this turn's submitted files in the empty composer.
      return String(value).trim() || !(pendingFiles || []).some(pending => sameFile(file, pending));
    });
  }
  return { token, parts, active, migrate, color, unplaced };
});
