/* Docked resizing keeps the bottom anchored; floating windows share the assistant layer. */
(function () {
  window.useAssistantReferenceWindow = function (panel, open, anchor) {
    const { useRef, useState, useEffect, useLayoutEffect } = React;
    const [floating, setFloating] = useState(true);
    const saved = useRef(null), dockHeight = useRef(460), gesture = useRef(null), cleanup = useRef(null);
    function bounds(rect) {
      const width = Math.min(Math.max(300, rect.width), Math.max(0, window.innerWidth - 16));
      const height = Math.min(Math.max(240, rect.height), Math.max(0, window.innerHeight - 16));
      return { width, height, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top: Math.max(8, Math.min(rect.top, window.innerHeight - height - 8)) };
    }
    function place(rect) {
      const next = bounds(rect); saved.current = next;
      if (panel.current) Object.assign(panel.current.style, { left: next.left + 'px', top: next.top + 'px', width: next.width + 'px', height: next.height + 'px' });
      return next;
    }
    function centered() {
      const size = bounds({ width: 560, height: 460, left: 8, top: 8 });
      return { ...size, left: (window.innerWidth - size.width) / 2, top: (window.innerHeight - size.height) / 2 };
    }
    function placeDock(height) {
      const el = panel.current, drawer = el?.closest('.asst-drawer'), nav = el?.parentElement;
      if (!drawer || !nav) return;
      const header = drawer.querySelector('.asst-heading')?.getBoundingClientRect();
      const top = (header?.bottom ?? drawer.getBoundingClientRect().top + (header?.height || 60)) + 8;
      const bottom = nav.getBoundingClientRect().top - 6;
      const maximum = Math.max(0, bottom - top);
      dockHeight.current = Math.min(maximum, Math.max(240, height));
      el.style.setProperty('--reference-height', maximum + 'px');
      el.style.setProperty('--reference-dock-height', dockHeight.current + 'px');
    }
    function detach() {
      cleanup.current?.();
      if (floating) { if (panel.current) place(panel.current.getBoundingClientRect()); setFloating(false); return; }
      const el = panel.current;
      if (!el) return;
      setFloating(true);
    }
    function start(event) {
      if (event.button !== 0 || event.target.closest('button,input,select')) return;
      event.preventDefault(); cleanup.current?.();
      const rect = bounds(panel.current.getBoundingClientRect()), x = event.clientX, y = event.clientY, height = dockHeight.current;
      const handle = event.currentTarget, pointerId = event.pointerId;
      handle.setPointerCapture?.(pointerId);
      gesture.current = { pointerId: event.pointerId };
      const move = current => {
        if (!gesture.current || current.pointerId !== gesture.current.pointerId) return;
        if (floating) place({ ...rect, left: rect.left + current.clientX - x, top: rect.top + current.clientY - y });
        else placeDock(height - (current.clientY - y));
      };
      const end = current => {
        if (current && current.pointerId !== gesture.current?.pointerId) return;
        gesture.current = null;
        if (handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId);
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end);
        window.removeEventListener('blur', cancel); cleanup.current = null;
      };
      const cancel = () => end();
      cleanup.current = cancel;
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
      window.addEventListener('blur', cancel);
    }
    function keyMove(event) {
      if (event.target !== event.currentTarget || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      if (!floating && ['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = { ArrowUp: [0, -12], ArrowDown: [0, 12], ArrowLeft: [-12, 0], ArrowRight: [12, 0] }[event.key];
      if (floating) { const rect = panel.current.getBoundingClientRect(); place({ ...bounds(rect), left: rect.left + direction[0], top: rect.top + direction[1] }); }
      else placeDock(dockHeight.current - direction[1]);
    }
    useLayoutEffect(() => {
      if (!open || !panel.current) return;
      const el = panel.current;
      window.AssistantWindow?.activateWindow({ target: el });
      const resized = () => {
        if (!panel.current || gesture.current) return;
        if (floating) place(panel.current.getBoundingClientRect()); else placeDock(dockHeight.current);
      };
      if (floating) place(saved.current || centered()); else placeDock(dockHeight.current);
      const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resized) : null;
      if (floating) observer?.observe(el);
      else {
        const drawer = el.closest('.asst-drawer'), composer = drawer?.querySelector('.asst-compose');
        if (drawer) observer?.observe(drawer);
        observer?.observe(el.parentElement);
        if (composer) observer?.observe(composer);
      }
      window.addEventListener('resize', resized);
      return () => { observer?.disconnect(); window.removeEventListener('resize', resized); cleanup.current?.(); };
    }, [floating, open]);
    useEffect(() => () => cleanup.current?.(), []);
    const layer = anchor?.current?.closest('.asst-layer');
    return { floating, detach, start, keyMove,
      style: floating ? Object.fromEntries(Object.entries(saved.current || centered()).map(([key, value]) => [key, value + 'px'])) : { '--reference-dock-height': dockHeight.current + 'px' },
      wrap: content => floating && layer && window.ReactDOM?.createPortal ? window.ReactDOM.createPortal(content, layer) : content };
  };
})();
