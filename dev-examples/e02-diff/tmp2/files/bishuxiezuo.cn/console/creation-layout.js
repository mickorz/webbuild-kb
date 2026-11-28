/* Shared creation-area geometry: dock clamp, edge inset, world-side room. */
(function () {
  const ICON_RAIL_WIDTH = 62;
  const MIN_CREATION_WIDTH = 360;
  const DOCK_MIN_WIDTH = 300;
  const DOCK_MAX_WIDTH = 760;
  const DOCK_DEFAULT_CAP = 560;
  const DOCK_DEFAULT_RATIO = 0.28;
  const WORLD_MIN_WIDTH = 220;
  const WORLD_MAX_WIDTH = 400;
  const WORLD_DEFAULT_WIDTH = 260;
  const WORLD_GAP = 8;
  const REOPEN_BUFFER = 24;
  const WORLD_CLOSE_MS = 300;

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function dockViewportMaximum(viewportWidth) {
    const viewport = Math.max(0, finiteNumber(viewportWidth, 0));
    const available = viewport - ICON_RAIL_WIDTH - MIN_CREATION_WIDTH;
    return Math.min(DOCK_MAX_WIDTH, Math.max(DOCK_MIN_WIDTH, available));
  }

  function persistableDockWidth(value) {
    return Math.min(DOCK_MAX_WIDTH, Math.max(DOCK_MIN_WIDTH, finiteNumber(value, 360)));
  }

  function clampDockWidth(value, viewportWidth) {
    return Math.min(dockViewportMaximum(viewportWidth), persistableDockWidth(value));
  }

  function defaultDockWidth(viewportWidth) {
    const raw = Math.round(finiteNumber(viewportWidth, 0) * DOCK_DEFAULT_RATIO);
    return clampDockWidth(Math.min(DOCK_DEFAULT_CAP, raw || 360), viewportWidth);
  }

  function creationEdgeInset(dockWidth) {
    return Math.max(0, Math.round(finiteNumber(dockWidth, 0)));
  }

  function clampWorldWidth(value) {
    const width = finiteNumber(value, 0);
    return width > 0 ? Math.max(WORLD_MIN_WIDTH, Math.min(WORLD_MAX_WIDTH, width)) : WORLD_DEFAULT_WIDTH;
  }

  function readPreference(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }

  function savePreference(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (error) {}
  }

  function useWorldSideLayout(hostRef) {
    const { useState, useRef, useLayoutEffect } = React;
    const closeTimerRef = useRef(null);
    const [preferredOpen, setPreferredOpen] = useState(() => readPreference('lf_world_v2') === '1');
    const [width, setWidthState] = useState(() => clampWorldWidth(readPreference('lf_world_w')));
    const [hasRoom, setHasRoom] = useState(false);
    const [compactOpen, setCompactOpen] = useState(false);
    const [closing, setClosing] = useState(false);

    useLayoutEffect(() => {
      const host = hostRef && hostRef.current;
      const stage = host && host.parentElement;
      if (!stage) return undefined;
      const threshold = MIN_CREATION_WIDTH + WORLD_GAP + width;
      const measure = () => {
        const stageWidth = stage.clientWidth;
        setHasRoom(previous => stageWidth >= threshold + (previous ? 0 : REOPEN_BUFFER));
      };
      measure();
      if (typeof window.ResizeObserver === 'function') {
        const observer = new window.ResizeObserver(measure);
        observer.observe(stage);
        return () => observer.disconnect();
      }
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }, [hostRef, width]);

    useLayoutEffect(() => {
      if (hasRoom) setCompactOpen(false);
    }, [hasRoom]);

    useLayoutEffect(() => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    }, []);

    const displayed = preferredOpen && (hasRoom || compactOpen);
    const stacked = (displayed || closing) && !hasRoom;
    const toggle = () => {
      if (closing) return;
      if (displayed) {
        setClosing(true);
        setPreferredOpen(false);
        setCompactOpen(false);
        savePreference('lf_world_v2', '0');
        closeTimerRef.current = setTimeout(() => {
          closeTimerRef.current = null;
          setClosing(false);
        }, WORLD_CLOSE_MS);
        return;
      }
      setPreferredOpen(true);
      setCompactOpen(!hasRoom);
      savePreference('lf_world_v2', '1');
    };
    const setWidth = value => {
      const next = clampWorldWidth(value);
      setWidthState(next);
      savePreference('lf_world_w', next);
    };

    return {
      hostRef,
      open: displayed || closing,
      stacked,
      closing,
      width,
      toggle,
      setWidth
    };
  }

  window.CreationLayout = {
    ICON_RAIL_WIDTH,
    MIN_CREATION_WIDTH,
    DOCK_MIN_WIDTH,
    DOCK_MAX_WIDTH,
    DOCK_DEFAULT_CAP,
    dockViewportMaximum,
    persistableDockWidth,
    clampDockWidth,
    defaultDockWidth,
    creationEdgeInset,
    clampWorldWidth,
    useWorldSideLayout
  };
})();
