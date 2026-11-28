/* ===== Assistant thread scrolling: follow the bottom, respect reading history ===== */
(function (root) {
  const BOTTOM_GAP = 12;
  function create(thread, { position } = {}) {
    let following = position ? Boolean(position.following) : true, frame = null, destroyed = false, touchY = null;
    let lastTop = thread.scrollTop, lastMax = Math.max(0, thread.scrollHeight - thread.clientHeight);
    const observed = new Set();
    const maximum = () => Math.max(0, thread.scrollHeight - thread.clientHeight);
    const atBottom = () => maximum() - Math.max(0, thread.scrollTop) <= BOTTOM_GAP;
    const remember = () => { lastTop = thread.scrollTop; lastMax = maximum(); };
    function pause() {
      following = false;
      if (frame !== null) root.cancelAnimationFrame(frame);
      frame = null;
      remember();
    }
    function schedule() {
      if (destroyed || !following || frame !== null) return;
      frame = root.requestAnimationFrame(() => {
        frame = null;
        if (destroyed || !following) return;
        const top = maximum();
        if (Math.abs(thread.scrollTop - top) > 1) thread.scrollTop = top;
        remember();
      });
    }
    function onScroll() {
      const top = thread.scrollTop, max = maximum();
      // Content collapsing can clamp scrollTop; it is not an upward user scroll.
      if (top < lastTop - 1 && !(max < lastMax && atBottom())) pause();
      else if (top > lastTop + 1 && atBottom()) following = true;
      remember();
      schedule();
    }
    function onWheel(event) {
      if (event.deltaY < 0) pause();
      else if (event.deltaY > 0 && atBottom()) { following = true; schedule(); }
    }
    function onTouchStart(event) { touchY = event.touches[0]?.clientY ?? null; }
    function onTouchMove(event) {
      const y = event.touches[0]?.clientY;
      if (touchY != null && y != null && y > touchY) pause();
      touchY = y ?? null;
    }
    function onKeyDown(event) {
      if (event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (["ArrowUp", "PageUp", "Home"].includes(event.key) || (event.key === " " && event.shiftKey)) pause();
    }
    const resize = typeof root.ResizeObserver === "function" ? new root.ResizeObserver(schedule) : null;
    function observeChildren() {
      if (!resize) return;
      const children = new Set(thread.children);
      observed.forEach(node => { if (!children.has(node)) { resize.unobserve(node); observed.delete(node); } });
      children.forEach(node => { if (!observed.has(node)) { resize.observe(node); observed.add(node); } });
    }
    const mutation = typeof root.MutationObserver === "function" ? new root.MutationObserver(records => {
      if (records.some(record => record.type === "childList" && record.target === thread)) observeChildren();
      schedule();
    }) : null;
    const events = { scroll: onScroll, wheel: onWheel, touchstart: onTouchStart, touchmove: onTouchMove, keydown: onKeyDown, load: schedule };
    Object.entries(events).forEach(([name, listener]) => thread.addEventListener(name, listener, { passive: true, capture: name === "load" }));
    resize?.observe(thread);
    observeChildren();
    mutation?.observe(thread, { childList: true, subtree: true, characterData: true });
    schedule();
    return {
      pause,
      position: () => ({ top: thread.scrollTop, following }),
      destroy() {
        destroyed = true;
        pause();
        mutation?.disconnect();
        resize?.disconnect();
        observed.clear();
        Object.entries(events).forEach(([name, listener]) => thread.removeEventListener(name, listener, { capture: name === "load" }));
      }
    };
  }
  root.AssistantThreadScroll = { create };
})(typeof window !== "undefined" ? window : globalThis);
