/* Saved account preferences only. Drafts never enter this store. */
(function (root) {
  const Core = root.AssistantPersonalizationCore;
  function createStore() {
    const accounts = new Map();
    function entry(id) {
      if (!accounts.has(id)) accounts.set(id, { snapshot: null, revision: 0, request: 0, listeners: new Set() });
      return accounts.get(id);
    }
    function publish(id, value) {
      if (!id) return null;
      const snapshot = Core.normalizeSnapshot(value), state = entry(id);
      if (!snapshot || (state.snapshot && snapshot.version <= state.snapshot.version)) return state.snapshot;
      state.snapshot = snapshot;
      state.revision += 1;
      state.listeners.forEach(listener => listener(snapshot));
      return snapshot;
    }
    return {
      get: id => accounts.get(id)?.snapshot || null,
      publish,
      subscribe(id, listener) {
        const state = entry(id);
        state.listeners.add(listener);
        return () => state.listeners.delete(listener);
      },
      async refresh(id, read, isCurrent = () => true) {
        if (!id || !isCurrent()) return null;
        const state = entry(id), revision = state.revision, request = ++state.request;
        const snapshot = await read();
        if (isCurrent() && state.request === request && state.revision === revision) publish(id, snapshot);
        return state.snapshot;
      }
    };
  }
  const store = createStore();
  function assistantName(snapshot) {
    return snapshot ? Core.readForm(snapshot.markdown).fields.name.trim() : '';
  }
  function completedWrites(messages) {
    return (messages || []).flatMap(message => (message.stream_segments || []).flatMap(segment => {
      const tool = segment.type === 'tool' && segment.tool;
      const id = tool && (tool.run_id || tool.call_id || tool.id);
      return id && tool.status === 'completed' && ['personalization_patch', 'personalization_restore'].includes(tool.name)
        ? [String(message.id || message.stream_id || '') + ':' + id] : [];
    }));
  }
  function useAssistantName({ accountId, open, messages }) {
    const { useState, useEffect, useRef } = root.React;
    const [value, setValue] = useState(null);
    const owner = useRef(null), seen = useRef({ accountId: null, calls: new Set() });
    // Replacing the identity invalidates pending reads even before effects run.
    if (!owner.current || owner.current.accountId !== accountId) owner.current = { accountId, active: true };
    function refresh() {
      const identity = owner.current;
      const api = root.LF_API;
      if (!accountId || !api?.assistantPersonalization) return;
      store.refresh(accountId, () => api.assistantPersonalization(),
        () => identity.active && owner.current === identity).catch(() => {});
    }
    useEffect(() => {
      const identity = owner.current;
      identity.active = true;
      const accept = snapshot => setValue({ accountId, name: assistantName(snapshot) });
      accept(store.get(accountId));
      const unsubscribe = store.subscribe(accountId, accept);
      const onFocus = () => { if (open) refresh(); };
      const onVisible = () => { if (root.document.visibilityState === 'visible') onFocus(); };
      root.addEventListener('focus', onFocus);
      root.document.addEventListener('visibilitychange', onVisible);
      if (open) refresh();
      return () => {
        identity.active = false;
        unsubscribe();
        root.removeEventListener('focus', onFocus);
        root.document.removeEventListener('visibilitychange', onVisible);
      };
    }, [accountId, open]);
    useEffect(() => {
      if (seen.current.accountId !== accountId) seen.current = { accountId, calls: new Set() };
      const fresh = completedWrites(messages).filter(id => !seen.current.calls.has(id));
      fresh.forEach(id => seen.current.calls.add(id));
      if (fresh.length) refresh();
    }, [accountId, messages]);
    return value?.accountId === accountId ? value.name : '';
  }
  root.AssistantPersonalizationSync = { createStore, store, assistantName, completedWrites, useAssistantName };
})(typeof window === 'object' ? window : globalThis);
