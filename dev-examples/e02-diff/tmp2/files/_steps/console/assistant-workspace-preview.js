{
/* Real gallery excerpts and a version-pinned, segmented reader. */
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const Core = window.AssistantWorkspaceCore;
  const Preview = window.AssistantWorkspacePreviewCore;
  function AssistantWorkspacePreview({
    file,
    cache,
    active,
    lang
  }) {
    const ref = useRef(null),
      [value, setValue] = useState(null);
    const image = window.AssistantReferenceCore?.isImage(file);
    const Icon = window.Icon;
    useEffect(() => {
      setValue(null);
      if (!active || !cache) return;
      let alive = true,
        lease = null;
      // Large originals remain explicit reads; gallery browsing must be bounded.
      if (image && file.size > 2 * 1024 * 1024) return;
      const load = () => {
        if (lease || !alive) return;
        lease = cache.acquire(file, image);
        lease.promise.then(result => {
          if (alive) setValue(result);
        }, () => {});
      };
      const Observer = window.IntersectionObserver;
      const observer = Observer ? new Observer(items => {
        if (items.some(item => item.isIntersecting)) {
          load();
          observer.disconnect();
        }
      }, {
        rootMargin: '80px'
      }) : null;
      if (observer) observer.observe(ref.current);else load();
      return () => {
        alive = false;
        observer?.disconnect();
        lease?.release();
      };
    }, [cache, active, file.file_id, file.path, file.version, image]);
    return /*#__PURE__*/React.createElement("span", {
      ref: ref,
      className: 'asst-workspace-tile-preview' + (value?.url ? ' is-image' : ''),
      "aria-hidden": "true"
    }, value?.url ? /*#__PURE__*/React.createElement("img", {
      src: value.url,
      alt: "",
      onError: () => setValue(null)
    }) : /*#__PURE__*/React.createElement(React.Fragment, null, Icon ? /*#__PURE__*/React.createElement(Icon, {
      n: image ? 'image' : 'file',
      s: 22
    }) : null, /*#__PURE__*/React.createElement("span", null, value?.text || file.snippet || (image ? lang === 'en' ? 'Open to view image' : '点击查看图片' : ''))));
  }
  function AssistantWorkspaceReader({
    editor,
    lang
  }) {
    const en = lang === 'en';
    const [pages, setPages] = useState(() => Preview.splitText(editor.text));
    const [index, setIndex] = useState(0),
      [next, setNext] = useState(editor.nextOffset);
    const [loading, setLoading] = useState(false),
      [error, setError] = useState(false);
    const body = useRef(null),
      pending = useRef(null);
    useEffect(() => () => {
      pending.current?.abort();
    }, []);
    useEffect(() => {
      if (body.current) body.current.scrollTop = 0;
    }, [index]);
    async function advance() {
      if (loading) return;
      if (index + 1 < pages.length) {
        setIndex(index + 1);
        return;
      }
      if (next == null || !editor.version) return;
      const controller = new AbortController();
      pending.current = controller;
      setLoading(true);
      setError(false);
      try {
        const fields = Core.locatedFields(editor, {
          version: editor.version,
          offset: next,
          limit: 12000
        });
        const result = await window.LF_API.assistantWorkspaceRequest('text?' + Core.query(fields), {
          signal: controller.signal
        });
        if (controller.signal.aborted) return;
        if (result.file?.version !== editor.version || editor.file_id && result.file?.file_id !== editor.file_id || result.offset !== next || !result.text || result.next_offset != null && result.next_offset <= next) throw new Error('Invalid text segment');
        setPages(current => current.concat(Preview.splitText(result.text)));
        setNext(result.truncated ? result.next_offset : null);
        setIndex(index + 1);
      } catch (_) {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    const hasNext = index + 1 < pages.length || next != null;
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-workspace-reader"
    }, /*#__PURE__*/React.createElement("pre", {
      ref: body,
      tabIndex: "0",
      "aria-busy": loading
    }, pages[index]), pages.length > 1 || next != null ? /*#__PURE__*/React.createElement("div", {
      className: "asst-workspace-reader-pages"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: !index || loading,
      onClick: () => {
        setError(false);
        setIndex(index - 1);
      }
    }, en ? 'Previous section' : '上一段'), /*#__PURE__*/React.createElement("span", {
      role: "status"
    }, en ? 'Section ' + (index + 1) : '第 ' + (index + 1) + ' 段', next == null ? ' / ' + pages.length : ''), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: !hasNext || loading,
      onClick: advance
    }, loading ? en ? 'Loading…' : '读取中…' : error ? en ? 'Retry' : '重试' : en ? 'Next section' : '下一段')) : null, error ? /*#__PURE__*/React.createElement("p", {
      className: "asst-settings-error",
      role: "alert"
    }, en ? 'Could not load the next section. Please retry.' : '下一段暂时无法读取，请重试。') : null);
  }
  window.AssistantWorkspacePreview = AssistantWorkspacePreview;
  window.AssistantWorkspaceReader = AssistantWorkspaceReader;
})();
}
