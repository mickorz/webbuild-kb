(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AssistantWorkspaceCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const drafts = new Map();
  const MAX_UPLOAD = 8 * 1024 * 1024;
  const FILE_ID = /^[0-9a-f]{32}$/;
  const KIND_BY_DIRECTORY = { materials: 'material', notes: 'note', outputs: 'output', other: 'other' };

  function validPath(path) {
    return typeof path === 'string' && path.length > 0 && path.length <= 512
      && !/[\\\u0000-\u001f\u007f]/.test(path)
      && path.split('/').every(part => part && part !== '.' && part !== '..');
  }
  function validFileId(value) {
    return typeof value === 'string' && FILE_ID.test(value);
  }
  function validKind(value) {
    return value === 'material' || value === 'note' || value === 'output' || value === 'other';
  }
  function topDirectory(path) {
    const value = String(path || '');
    const slash = value.indexOf('/');
    return slash === -1 ? '' : value.slice(0, slash);
  }
  function kindFromPath(path) {
    return KIND_BY_DIRECTORY[topDirectory(path)] || 'other';
  }
  function sameDirectory(left, right) {
    const source = topDirectory(left);
    return !!source && source === topDirectory(right);
  }
  function safeLeaf(name) {
    const leaf = String(name || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!leaf || leaf === '.' || leaf === '..' || leaf.length > 180) return '';
    return leaf;
  }
  function leafName(path) {
    return safeLeaf(String(path || '').split('/').pop());
  }
  function displayName(file) {
    if (!file) return '';
    if (typeof file === 'string') return leafName(file);
    return safeLeaf(file.name_snapshot) || safeLeaf(file.name) || leafName(file.path);
  }
  function destinationPath(currentPath, nextName) {
    const raw = String(nextName || '').trim();
    if (!raw || /[\\/]/.test(raw) || !validPath(currentPath)) return '';
    const leaf = safeLeaf(raw);
    const slash = currentPath.lastIndexOf('/');
    if (!leaf || slash <= 0) return '';
    const next = currentPath.slice(0, slash + 1) + leaf;
    if (!validPath(next) || !sameDirectory(currentPath, next)) return '';
    return next;
  }
  function pathKey(user, path) { return JSON.stringify([String(user), path]); }
  function idKey(user, fileId) { return JSON.stringify([String(user), 'file', fileId]); }
  function readDraft(user, path) { return drafts.get(pathKey(user, path)) || null; }
  function readDraftById(user, fileId) {
    if (!validFileId(fileId)) return null;
    return drafts.get(idKey(user, fileId)) || null;
  }
  function readDraftForFile(user, file) {
    if (!file || typeof file !== 'object') return null;
    if (file.file_id != null && file.file_id !== '') {
      if (!validFileId(file.file_id)) return null;
      const identified = readDraftById(user, file.file_id);
      if (identified) return identified;
      const legacy = readDraft(user, file.path);
      if (!legacy) return null;
      if (legacy.file_id) return legacy.file_id === file.file_id ? legacy : null;
      // Upgrade an old path draft only when its content snapshot proves it
      // belongs to this file, rather than a later reuse of the same name.
      return legacy.version && legacy.version === file.version ? legacy : null;
    }
    return readDraft(user, file.path);
  }
  function saveDraft(user, state) {
    if (!user || !state || !state.path || !state.dirty) return;
    const copy = { ...state };
    drafts.set(pathKey(user, state.path), copy);
    if (validFileId(state.file_id)) drafts.set(idKey(user, state.file_id), copy);
  }
  function latestDraft(user) {
    return [...drafts.entries()].filter(([id]) => JSON.parse(id)[0] === String(user)).map(([, value]) => value).pop() || null;
  }
  function clearDraft(user, path, fileId) {
    const existing = path ? drafts.get(pathKey(user, path)) : null;
    const id = validFileId(fileId) ? fileId : (existing && validFileId(existing.file_id) ? existing.file_id : '');
    if (path && (!id || !existing || !existing.file_id || existing.file_id === id)) drafts.delete(pathKey(user, path));
    if (!id) return;
    const keyed = drafts.get(idKey(user, id));
    drafts.delete(idKey(user, id));
    if (keyed && keyed.path && keyed.path !== path) {
      const alias = drafts.get(pathKey(user, keyed.path));
      if (alias && alias.file_id === id) drafts.delete(pathKey(user, keyed.path));
    }
  }
  function cleanState(path, response) {
    const file = response && response.file ? response.file : {};
    // A malformed id must not fall back to the path and become a different file.
    if (file.file_id != null && file.file_id !== '' && !validFileId(file.file_id)) return null;
    if (file.kind && !validKind(file.kind)) return null;
    const canonical = validPath(file.path) ? file.path : path;
    if (validKind(file.kind) && kindFromPath(canonical) && file.kind !== kindFromPath(canonical)) return null;
    return {
      path: canonical,
      file_id: validFileId(file.file_id) ? file.file_id : '',
      name: safeLeaf(file.name) || leafName(canonical),
      kind: validKind(file.kind) ? file.kind : kindFromPath(canonical),
      text: response.text || '',
      version: file.version || null,
      contentType: file.content_type || 'text/markdown',
      parse_status: file.parse_status || (typeof response.text === 'string' ? (response.truncated ? 'truncated' : 'ok') : ''),
      dirty: false, conflict: false, truncated: response.truncated === true,
      nextOffset: response.truncated === true && Number.isInteger(response.next_offset) && response.next_offset > (response.offset || 0) ? response.next_offset : null,
      historical: false
    };
  }
  function editState(state, text) {
    // preferences.md is an existing historical file. It is readable, not a preference editor.
    if (state.truncated || state.historical || state.path === 'preferences.md') return state;
    return { ...state, text, dirty: true, requestKey: null };
  }
  function writeRequest(state, id) {
    if (!validPath(state.path) || state.path === 'preferences.md' || state.truncated || state.historical || state.conflict) throw new Error('Invalid draft');
    if (state.file_id != null && state.file_id !== '' && !validFileId(state.file_id)) throw new Error('Invalid file identity');
    const body = { path: state.path, text: state.text, expected_version: state.version, idempotency_key: id };
    if (state.version && validFileId(state.file_id)) body.file_id = state.file_id;
    return body;
  }
  function moveRequest(state, destination, id) {
    if (!state || state.historical || state.isNew || !validFileId(state.file_id) || !state.version) throw new Error('Invalid move');
    if (!validPath(state.path) || !validPath(destination) || !sameDirectory(state.path, destination)) throw new Error('Invalid move');
    return {
      file_id: state.file_id,
      expected_version: state.version,
      expected_path: state.path,
      destination_path: destination,
      idempotency_key: id
    };
  }
  function acceptMove(state, result) {
    if (!result || result.committed !== true || !result.file || !state) return null;
    const file = result.file;
    if (!validFileId(file.file_id) || file.file_id !== state.file_id) return null;
    if (file.version !== state.version || !validPath(file.path) || !sameDirectory(state.path, file.path)) return null;
    if (file.kind && (!validKind(file.kind) || (kindFromPath(file.path) && file.kind !== kindFromPath(file.path)))) return null;
    return {
      path: file.path,
      file_id: file.file_id,
      version: file.version,
      name: safeLeaf(file.name) || leafName(file.path),
      kind: validKind(file.kind) ? file.kind : kindFromPath(file.path)
    };
  }
  function downloadQuery(file) {
    if (!file || typeof file !== 'object') return null;
    if (file.file_id != null && file.file_id !== '') {
      if (!validFileId(file.file_id)) return null;
      const query = { file_id: file.file_id };
      if (typeof file.version === 'string' && file.version) query.version = file.version;
      return query;
    }
    if (typeof file.path !== 'string' || !file.path) return null;
    const query = { path: file.path };
    if (typeof file.version === 'string' && file.version) query.version = file.version;
    return query;
  }
  function locatedFields(file, extra) {
    const fields = { ...(extra || {}) };
    if (!file || typeof file !== 'object') return null;
    if (file.file_id != null && file.file_id !== '') {
      if (!validFileId(file.file_id)) return null;
      fields.file_id = file.file_id;
      return fields;
    }
    if (!validPath(file.path)) return null;
    fields.path = file.path;
    return fields;
  }
  function failure(error) {
    const code = error && error.body && error.body.detail && error.body.detail.code;
    if (code === 'workspace_storage_limited') return 'capacity';
    if (code === 'workspace_rate_limited') return 'rateLimited';
    if (code === 'workspace_origin_blocked') return 'originBlocked';
    if (code === 'workspace_conflict' || (error && error.status === 409)) return 'conflict';
    if (code === 'workspace_not_found' || (error && error.status === 404)) return 'missing';
    if (code === 'workspace_unsupported' || (error && error.status === 415)) return 'unsupported';
    if (error && error.status === 403) return 'forbidden';
    if (error && error.status === 413) return 'large';
    if (error && error.status === 422) return 'invalid';
    return 'unavailable';
  }
  function query(fields) {
    const params = new URLSearchParams();
    Object.entries(fields || {}).forEach(([name, value]) => {
      if (value != null) params.set(name, String(value));
    });
    return params.toString();
  }
  return {
    MAX_UPLOAD, validPath, validFileId, validKind, kindFromPath, topDirectory, sameDirectory,
    safeLeaf, leafName, displayName, destinationPath, downloadQuery, locatedFields,
    readDraft, readDraftById, readDraftForFile, saveDraft, latestDraft, clearDraft,
    cleanState, editState, writeRequest, moveRequest, acceptMove, failure, query
  };
});
