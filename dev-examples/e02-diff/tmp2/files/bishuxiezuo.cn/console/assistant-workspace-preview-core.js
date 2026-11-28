/* Account-local, version-keyed previews. Never persist file contents in browser storage. */
(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.AssistantWorkspacePreviewCore = value;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function splitText(text, size = 2400) {
    const chars = Array.from(String(text || ''));
    const pages = [];
    for (let start = 0; start < chars.length;) {
      let end = Math.min(start + size, chars.length);
      if (end < chars.length) {
        for (let at = end; at > start + size / 2; at--) {
          if (chars[at - 1] === '\n') { end = at; break; }
        }
      }
      pages.push(chars.slice(start, end).join(''));
      start = end;
    }
    return pages.length ? pages : [''];
  }

  function createCache(api, Core, urls = URL) {
    const entries = new Map(), queue = [];
    let running = 0, disposed = false;
    const MAX_BYTES = 32 * 1024 * 1024, MAX_ENTRIES = 60;
    function key(file, image) { return JSON.stringify([file.file_id || file.path, file.version, image]); }
    function evict() {
      let bytes = Array.from(entries.values()).reduce((sum, entry) => sum + entry.bytes, 0);
      for (const [id, entry] of entries) {
        if (bytes <= MAX_BYTES && entries.size <= MAX_ENTRIES) break;
        if (entry.users || !entry.done) continue;
        if (entry.value?.url) urls.revokeObjectURL(entry.value.url);
        bytes -= entry.bytes; entries.delete(id);
      }
    }
    function pump() {
      while (!disposed && running < 2 && queue.length) {
        const entry = queue.shift();
        running++;
        Promise.resolve().then(entry.run).then(value => {
          if (disposed) { if (value?.url) urls.revokeObjectURL(value.url); throw new Error('Preview disposed'); }
          entry.value = value; entry.bytes = value.blob?.size || (value.text || '').length * 2;
          entry.resolve(value);
        }).catch(error => {
          // Failed previews never poison later explicit reads or retries.
          entries.delete(entry.id); entry.reject(error);
        }).finally(() => {
          entry.done = true; running--; evict(); pump();
        });
      }
    }
    function acquire(file, image = false) {
      if (disposed) throw new Error('Preview disposed');
      const id = key(file, image);
      let entry = entries.get(id);
      if (!entry) {
        const controller = new AbortController();
        entry = { id, users: 0, bytes: 0, done: false, controller };
        entry.promise = new Promise((resolve, reject) => { entry.resolve = resolve; entry.reject = reject; });
        entry.run = async () => {
          const fields = Core.downloadQuery(file);
          if (!fields) throw new Error('Invalid preview');
          if (image) {
            const blob = await api.assistantWorkspaceImage(fields, { signal: controller.signal });
            if (disposed) throw new Error('Preview disposed');
            return { blob, url: urls.createObjectURL(blob) };
          }
          const result = await api.assistantWorkspaceRequest('text?' + Core.query({ ...fields, limit: 600 }), { signal: controller.signal });
          if (file.file_id && result.file?.file_id !== file.file_id) throw new Error('Invalid preview identity');
          if (file.version && result.file?.version !== file.version) throw new Error('Invalid preview version');
          return { text: String(result.text || '').slice(0, 600) };
        };
        entries.set(id, entry); queue.push(entry);
      } else { entries.delete(id); entries.set(id, entry); }
      entry.users++; pump();
      let released = false;
      return { promise: entry.promise, release() {
        if (released) return;
        released = true; entry.users--;
        const queued = queue.indexOf(entry);
        if (!entry.users && queued >= 0) {
          queue.splice(queued, 1); entries.delete(id); entry.reject(new Error('Preview hidden'));
        }
        evict();
      } };
    }
    return { acquire, dispose() {
      disposed = true;
      for (const entry of entries.values()) {
        entry.controller.abort(); entry.reject(new Error('Preview disposed'));
        if (entry.value?.url) urls.revokeObjectURL(entry.value.url);
      }
      queue.length = 0; entries.clear();
    } };
  }
  return Object.freeze({ createCache, splitText });
});
