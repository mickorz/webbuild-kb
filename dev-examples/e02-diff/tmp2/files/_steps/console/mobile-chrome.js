{
/* Pages declare their phone title-bar and bottom actions here; desktop renders without a provider and ignores it.
   Handlers stay in the page (always the latest closure); the frame re-renders only when labels or availability change. */
(function () {
  const {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
  } = React;
  const MobileChromeContext = createContext(null);
  function signature(config) {
    if (!config) return '';
    const items = list => (list || []).map(item => [item.key, item.label, item.icon, !!item.disabled, !!item.tone].join(':')).join(',');
    return [config.key, items(config.header), items(config.primary), items(config.more)].join('|');
  }
  function MobileChromeProvider({
    children
  }) {
    const [published, setPublished] = useState(null);
    const latest = useRef(null);
    const publish = useCallback((owner, config) => {
      latest.current = config ? {
        owner,
        config
      } : latest.current && latest.current.owner === owner ? null : latest.current;
      setPublished(current => {
        const next = latest.current;
        if (!next) return null;
        const key = owner + '#' + signature(next.config);
        return current && current.key === key ? current : {
          key,
          owner
        };
      });
    }, []);
    // Run the newest handler of an item so pages never need to re-publish closures.
    const run = useCallback((group, key) => {
      const config = latest.current && latest.current.config;
      const item = config && (config[group] || []).find(entry => entry.key === key);
      if (item && !item.disabled && item.onClick) item.onClick();
    }, []);
    const value = useMemo(() => ({
      publish,
      run,
      current: published && latest.current ? latest.current.config : null
    }), [publish, run, published]);
    return /*#__PURE__*/React.createElement(MobileChromeContext.Provider, {
      value: value
    }, children);
  }
  let ownerSequence = 0;
  /** Declare `{ key, header: [...], primary: [...], more: [...] }` for the phone frame (header shows on tab roots, primary in the action bar of pushed pages); each item is `{ key, label, icon?, disabled?, tone?, onClick }`. */
  function useMobileChrome(config) {
    const chrome = useContext(MobileChromeContext);
    const owner = useRef(null);
    if (owner.current === null) owner.current = 'chrome-' + ++ownerSequence;
    useEffect(() => {
      if (chrome) chrome.publish(owner.current, config);
    });
    useEffect(() => () => {
      if (chrome) chrome.publish(owner.current, null);
    }, [chrome]);
  }
  function useMobileChromeState() {
    return useContext(MobileChromeContext);
  }
  window.MobileChromeProvider = MobileChromeProvider;
  window.useMobileChrome = useMobileChrome;
  window.useMobileChromeState = useMobileChromeState;
})();
}
