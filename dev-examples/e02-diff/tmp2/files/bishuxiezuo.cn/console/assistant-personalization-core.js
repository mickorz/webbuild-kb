(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AssistantPersonalizationCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const drafts = new Map();
  const MAX_MARKDOWN = 8000;
  const ACTORS = { user: true, assistant: true, import: true };

  // These are a view over the Markdown document, never a second persisted schema.
  const FORM_GROUPS = [
    { title: '助手形象', en: 'Assistant identity', fields: [
      { id: 'name', label: '名称', en: 'Name' },
      { id: 'role', label: '角色', en: 'Role' },
      { id: 'tone', label: '交流风格', en: 'Communication style', wide: true }
    ] },
    { title: '关于我', en: 'About me', fields: [
      { id: 'address', label: '如何称呼我', en: 'What to call me' },
      { id: 'language', label: '默认交流语言', en: 'Language' },
      { id: 'background', label: '希望助手了解的背景', en: 'Background', wide: true }
    ] },
    { title: '回答方式', en: 'Responses', fields: [
      { id: 'detail', label: '默认详略', en: 'Level of detail' },
      { id: 'format', label: '排版偏好', en: 'Formatting' },
      { id: 'terms', label: '专业术语', en: 'Technical terms' },
      { id: 'responseOther', label: '其他要求', en: 'Other response preferences' }
    ] },
    { title: '合作方式', en: 'Collaboration', fields: [
      { id: 'initiative', label: '主动程度', en: 'Initiative' },
      { id: 'disagreement', label: '存在不同意见时', en: 'When we disagree' },
      { id: 'feedback', label: '创作反馈', en: 'Writing feedback' },
      { id: 'collaborationOther', label: '其他要求', en: 'Other collaboration preferences' }
    ] }
  ];
  const TEMPLATE_COMMENT = '<!-- 补充希望在后续会话中持续生效的要求。 -->';

  function readForm(markdown) {
    const fields = Object.fromEntries(FORM_GROUPS.flatMap(group => group.fields.map(field => [field.id, ''])));
    const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
    const extra = [], seen = new Set();
    let group = null, fence = null, residual = [], customTail = null;
    function keepResidual() {
      const text = residual.join('\n').replace(/^\n+|\n+$/g, '');
      if (text) extra.push((group ? '## ' + group.title + '\n' : '') + text);
      residual = [];
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (fence) {
        residual.push(line);
        if (new RegExp('^ {0,3}' + fence.char + '{' + fence.length + ',}\\s*$').test(line)) fence = null;
        continue;
      }
      if (fenceMatch) {
        fence = { char: fenceMatch[1][0], length: fenceMatch[1].length };
        residual.push(line); continue;
      }
      if (/^##\s+自定义说明\s*$/.test(line)) {
        keepResidual();
        customTail = lines.slice(i + 1).join('\n'); group = null; break;
      }
      if (line === '# 助手个性化配置' && !lines.slice(0, i).some(item => item.trim())) continue;
      const heading = /^##\s+(.+?)\s*$/.exec(line);
      if (heading) {
        keepResidual();
        group = FORM_GROUPS.find(item => item.title === heading[1]) || null;
        if (!group) residual.push(line);
        continue;
      }
      if (/^#{1,6}\s/.test(line)) { keepResidual(); group = null; }
      const bullet = /^[-*]\s+([^:：]+)[：:][ \t]?(.*)$/.exec(line);
      const field = bullet && group && group.fields.find(item => item.label === bullet[1].trim());
      if (field && !seen.has(field.id)) {
        const value = [bullet[2]];
        while (i + 1 < lines.length && lines[i + 1].startsWith('  ')) value.push(lines[++i].slice(2));
        fields[field.id] = value.join('\n'); seen.add(field.id);
      } else residual.push(line);
    }
    keepResidual();
    const prefix = extra.join('\n\n');
    const custom = customTail === null ? prefix : (prefix ? prefix + '\n\n' : '') + customTail;
    return { fields, custom: custom.trim() === TEMPLATE_COMMENT ? '' : custom };
  }

  function editForm(markdown, id, value) {
    const form = readForm(markdown);
    const text = String(value == null ? '' : value).replace(/\r\n/g, '\n');
    const old = id === 'custom' ? form.custom : form.fields[id];
    if (old === undefined || old === text) return markdown;
    if (id === 'custom') form.custom = text;
    else form.fields[id] = text;
    if (!Object.values(form.fields).some(Boolean) && !form.custom) return '';
    const sections = ['# 助手个性化配置'];
    for (const group of FORM_GROUPS) {
      const rows = group.fields.map(field => '- ' + field.label + '： ' + form.fields[field.id].replace(/\n/g, '\n  '));
      sections.push('## ' + group.title + '\n' + rows.join('\n'));
    }
    // Unknown sections, duplicates and free Markdown stay editable below this boundary.
    sections.push('## 自定义说明\n' + form.custom);
    return sections.join('\n\n');
  }

  function countChars(text) {
    return Array.from(String(text || '')).length;
  }

  function tooLong(text) {
    return countChars(text) > MAX_MARKDOWN;
  }

  function key(user) {
    return String(user || '');
  }

  function readDraft(user) {
    if (!user) return null;
    return drafts.get(key(user)) || null;
  }

  function saveDraft(user, state) {
    if (!user || !state) return;
    if (!state.dirty) { drafts.delete(key(user)); return; }
    drafts.set(key(user), { ...state });
  }

  function clearDraft(user) {
    drafts.delete(key(user));
  }

  function actor(value) {
    return ACTORS[value] ? value : null;
  }

  function versionOf(value, fallback) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return fallback;
    return value;
  }

  function normalizeSnapshot(payload) {
    if (!payload || typeof payload !== 'object') return null;
    const markdown = typeof payload.markdown === 'string' ? payload.markdown : null;
    const version = versionOf(payload.version, null);
    if (markdown == null || version == null) return null;
    return {
      markdown,
      version,
      updated_at: payload.updated_at == null ? null : String(payload.updated_at),
      updated_by: actor(payload.updated_by),
      template_markdown: typeof payload.template_markdown === 'string' ? payload.template_markdown : ''
    };
  }

  function normalizeHistory(payload) {
    const rows = Array.isArray(payload && payload.versions) ? payload.versions : [];
    const versions = [];
    for (let i = 0; i < rows.length; i += 1) {
      const item = rows[i];
      const version = versionOf(item && item.version, null);
      if (version == null || version < 1) continue;
      versions.push({
        version,
        updated_at: item && item.updated_at == null ? null : String(item.updated_at),
        updated_by: actor(item && item.updated_by)
      });
    }
    const next = payload && payload.next_before_version;
    return {
      versions,
      next_before_version: next == null ? null : versionOf(next, null)
    };
  }

  function cleanState(snapshot) {
    const markdown = snapshot.markdown;
    return {
      markdown,
      baseMarkdown: markdown,
      version: snapshot.version,
      updated_at: snapshot.updated_at,
      updated_by: snapshot.updated_by,
      template_markdown: snapshot.template_markdown || '',
      dirty: false,
      conflict: false,
      historical: false,
      previewVersion: null,
      saveKey: null,
      restoreKey: null,
      importKey: null
    };
  }

  function previewState(live, snapshot, previewVersion) {
    const preview = versionOf(previewVersion, null);
    if (!live || !snapshot || preview == null || preview < 1) return null;
    return {
      ...cleanState({
        markdown: snapshot.markdown,
        version: live.version,
        updated_at: snapshot.updated_at,
        updated_by: snapshot.updated_by,
        template_markdown: live.template_markdown || ''
      }),
      historical: true,
      previewVersion: preview
    };
  }

  function editState(state, markdown) {
    if (!state || state.historical) return state;
    const text = typeof markdown === 'string' ? markdown : '';
    return {
      ...state,
      markdown: text,
      dirty: text !== state.baseMarkdown,
      saveKey: null
    };
  }

  function writeRequest(state, id) {
    if (!state || state.historical || state.conflict || tooLong(state.markdown) || typeof id !== 'string' || !id) {
      throw new Error('Invalid draft');
    }
    return {
      markdown: state.markdown,
      expected_version: state.version,
      idempotency_key: id
    };
  }

  function restoreRequest(state, id) {
    const target = state && state.previewVersion;
    if (!state || !state.historical || state.dirty || state.conflict || !Number.isInteger(target) || target < 1 || typeof id !== 'string' || !id) {
      throw new Error('Invalid restore');
    }
    return { version: target, expected_version: state.version, idempotency_key: id };
  }

  function failure(error) {
    const detail = error && error.body && error.body.detail;
    const code = detail && detail.code;
    if (code === 'personalization_conflict' || (error && error.status === 409)) return 'conflict';
    if (code === 'personalization_not_found' || (error && error.status === 404)) return 'missing';
    if (code === 'personalization_forbidden' || (error && error.status === 403)) return 'forbidden';
    if (code === 'personalization_invalid' || (error && error.status === 422)) return 'invalid';
    if (error && error.status === 401) return 'auth';
    return 'unavailable';
  }

  function query(fields) {
    const params = new URLSearchParams();
    Object.entries(fields || {}).forEach(([name, value]) => {
      if (value != null) params.set(name, String(value));
    });
    return params.toString();
  }

  function downloadPayload(markdown) {
    return {
      filename: 'personalization.md',
      text: markdown == null ? '' : String(markdown),
      type: 'text/markdown;charset=utf-8'
    };
  }

  function firstLine(value) {
    return String(value || '').replace(/\r\n/g, '\n').split('\n').map(line => line.trim()).find(Boolean) || '';
  }

  function groupSummary(group, form, empty) {
    if (!group || !form) return empty || '';
    const parts = [];
    for (const field of group.fields) {
      const line = firstLine(form.fields && form.fields[field.id]);
      if (line) parts.push(line);
      if (parts.length === 3) break;
    }
    return parts.length ? parts.join(' · ') : (empty || '');
  }

  function customSummary(form, empty) {
    return firstLine(form && form.custom) || empty || '';
  }

  return {
    FORM_GROUPS, readForm, editForm, MAX_MARKDOWN, countChars, tooLong, readDraft, saveDraft, clearDraft,
    normalizeSnapshot, normalizeHistory, cleanState, previewState, editState,
    writeRequest, restoreRequest, failure, query,
    downloadPayload, groupSummary, customSummary
  };
});
