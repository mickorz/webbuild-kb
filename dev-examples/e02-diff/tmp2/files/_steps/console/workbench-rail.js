{
/* Keep the narrative readable when the workbench's own container narrows. */
(function () {
  const MIN_NARRATIVE_WIDTH = 360;
  const COLUMN_GAP = 22;
  const REOPEN_BUFFER = 24;
  function clampWidth(value) {
    const width = Number(value);
    return Number.isFinite(width) && width > 0 ? Math.max(300, Math.min(560, width)) : 360;
  }
  function readPreference(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }
  function savePreference(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (error) {}
  }
  function useWorkbenchRail() {
    const {
      useState,
      useRef,
      useLayoutEffect
    } = React;
    const bodyRef = useRef(null);
    const [preferredOpen, setPreferredOpen] = useState(() => readPreference('lf_wb_rail') !== '0');
    const [railW, setRailW] = useState(() => clampWidth(readPreference('lf_wb_railw')));
    const [hasRoom, setHasRoom] = useState(false);
    const [compactOpen, setCompactOpen] = useState(false);
    useLayoutEffect(() => {
      const element = bodyRef.current;
      if (!element) return undefined;
      const threshold = MIN_NARRATIVE_WIDTH + COLUMN_GAP + railW;
      const measure = () => {
        const width = element.clientWidth;
        setHasRoom(previous => width >= threshold + (previous ? 0 : REOPEN_BUFFER));
      };
      measure();
      if (typeof window.ResizeObserver === 'function') {
        const observer = new window.ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
      }
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }, [railW]);
    useLayoutEffect(() => {
      if (hasRoom) setCompactOpen(false);
    }, [hasRoom]);
    const railOpen = preferredOpen && (hasRoom || compactOpen);
    const toggleRail = () => {
      const next = !railOpen;
      setPreferredOpen(next);
      setCompactOpen(next && !hasRoom);
      savePreference('lf_wb_rail', next ? '1' : '0');
    };
    const setRailWidth = value => {
      const width = clampWidth(value);
      setRailW(width);
      savePreference('lf_wb_railw', width);
    };
    return {
      bodyRef,
      railOpen,
      railStacked: railOpen && !hasRoom,
      railW,
      toggleRail,
      setRailWidth
    };
  }
  window.WorkbenchRail = {
    useWorkbenchRail
  };
})();
}
