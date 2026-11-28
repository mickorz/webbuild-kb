{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* ===== Page Assistant window geometry ===== */
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const WINDOW_STORAGE_KEY = "lf_assistant_window_v2";
  const DOCK_TOP = 58;
  const DOCK_SNAP_MARGIN = 8;
  const FLOATING_MIN_WIDTH = 360;
  const FLOATING_MIN_HEIGHT = 420;
  const Layout = window.CreationLayout;
  const DOCK_MIN_WIDTH = Layout.DOCK_MIN_WIDTH;
  function compactViewport() {
    return window.matchMedia && window.matchMedia("(max-width: 620px)").matches;
  }
  function defaultWindowRect() {
    const width = Math.min(480, Math.max(FLOATING_MIN_WIDTH, window.innerWidth - 32));
    const height = Math.min(760, Math.max(440, window.innerHeight - 32));
    return {
      x: Math.max(16, window.innerWidth - width - 24),
      y: Math.max(16, Math.min(32, window.innerHeight - height - 16)),
      width,
      height
    };
  }
  function clampWindowRect(value) {
    const margin = 12;
    const maxWidth = Math.max(320, window.innerWidth - margin * 2);
    const maxHeight = Math.max(360, window.innerHeight - margin * 2);
    const width = Math.min(maxWidth, Math.max(FLOATING_MIN_WIDTH, Number(value.width) || 480));
    const height = Math.min(maxHeight, Math.max(FLOATING_MIN_HEIGHT, Number(value.height) || 760));
    return {
      x: Math.min(window.innerWidth - width - margin, Math.max(margin, Number(value.x) || margin)),
      y: Math.min(window.innerHeight - height - margin, Math.max(margin, Number(value.y) || margin)),
      width,
      height
    };
  }
  function clampDockWidth(value) {
    return Layout.clampDockWidth(value, window.innerWidth);
  }
  function persistableDockWidth(value) {
    return Layout.persistableDockWidth(value);
  }
  function defaultDockWidth() {
    return Layout.defaultDockWidth(window.innerWidth);
  }
  function displayedDockWidth(value) {
    return clampDockWidth(value);
  }
  function savedWindowState() {
    try {
      const saved = JSON.parse(localStorage.getItem(WINDOW_STORAGE_KEY));
      if (saved && typeof saved === "object" && saved.rect) {
        return {
          mode: saved.mode === "docked" ? "docked" : "floating",
          rect: clampWindowRect(saved.rect),
          dockWidth: persistableDockWidth(saved.dockWidth)
        };
      }
      if (saved && typeof saved === "object") {
        return {
          mode: "floating",
          rect: clampWindowRect(saved),
          dockWidth: defaultDockWidth()
        };
      }
    } catch (ignored) {}
    return {
      mode: "floating",
      rect: defaultWindowRect(),
      dockWidth: defaultDockWidth()
    };
  }
  function resizedWindowRect(value, edge, deltaX, deltaY) {
    const margin = 12;
    const right = value.x + value.width;
    const bottom = value.y + value.height;
    const next = Object.assign({}, value);
    if (edge.includes("left")) {
      next.x = Math.min(right - FLOATING_MIN_WIDTH, Math.max(margin, value.x + deltaX));
      next.width = right - next.x;
    }
    if (edge.includes("right")) {
      next.width = Math.min(window.innerWidth - margin - value.x, Math.max(FLOATING_MIN_WIDTH, value.width + deltaX));
    }
    if (edge.includes("top")) {
      next.y = Math.min(bottom - FLOATING_MIN_HEIGHT, Math.max(margin, value.y + deltaY));
      next.height = bottom - next.y;
    }
    if (edge.includes("bottom")) {
      next.height = Math.min(window.innerHeight - margin - value.y, Math.max(FLOATING_MIN_HEIGHT, value.height + deltaY));
    }
    return clampWindowRect(next);
  }
  function useAssistantWindow(open) {
    const [windowState, setWindowState] = useState(savedWindowState);
    const [resizing, setResizing] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [dockPreview, setDockPreview] = useState(false);
    const interactionRef = useRef(null);
    const dockPreviewRef = useRef(false);
    useEffect(() => {
      if (!open || compactViewport()) return undefined;
      const keepInViewport = () => {
        if (compactViewport()) return;
        setWindowState(current => ({
          mode: current.mode,
          rect: clampWindowRect(current.rect),
          dockWidth: persistableDockWidth(current.dockWidth)
        }));
      };
      window.addEventListener("resize", keepInViewport);
      return () => window.removeEventListener("resize", keepInViewport);
    }, [open]);
    useEffect(() => {
      if (compactViewport()) return;
      try {
        localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify(windowState));
      } catch (ignored) {}
    }, [windowState]);
    const dock = () => {
      setWindowState(current => ({
        mode: "docked",
        rect: current.rect,
        dockWidth: persistableDockWidth(current.dockWidth)
      }));
      dockPreviewRef.current = false;
      setDockPreview(false);
    };
    const undock = () => {
      setWindowState(current => ({
        mode: "floating",
        rect: clampWindowRect(current.rect),
        dockWidth: current.dockWidth
      }));
    };
    const toggleDock = () => {
      if (windowState.mode === "docked") undock();else dock();
    };
    const beginDrag = event => {
      if (compactViewport() || windowState.mode === "docked" || event.button !== 0 || event.target.closest("button")) return;
      event.preventDefault();
      interactionRef.current = {
        kind: "drag",
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        rect: windowState.rect
      };
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    };
    const moveDrag = event => {
      const start = interactionRef.current;
      if (!start || start.kind !== "drag" || event.pointerId !== start.pointerId) return;
      const rawX = start.rect.x + event.clientX - start.clientX;
      const nextRect = clampWindowRect(Object.assign({}, start.rect, {
        x: rawX,
        y: start.rect.y + event.clientY - start.clientY
      }));
      const nextDockPreview = rawX + start.rect.width >= window.innerWidth - DOCK_SNAP_MARGIN;
      dockPreviewRef.current = nextDockPreview;
      setDockPreview(nextDockPreview);
      setWindowState(current => ({
        mode: current.mode,
        rect: nextRect,
        dockWidth: current.dockWidth
      }));
    };
    const endDrag = event => {
      const start = interactionRef.current;
      if (!start || start.kind !== "drag" || event.pointerId !== start.pointerId) return;
      interactionRef.current = null;
      setDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (event.type !== "pointercancel" && dockPreviewRef.current) dock();else {
        dockPreviewRef.current = false;
        setDockPreview(false);
      }
    };
    const beginResize = (edge, event) => {
      if (compactViewport() || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      interactionRef.current = {
        kind: "resize",
        edge,
        mode: windowState.mode,
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        rect: windowState.rect,
        dockWidth: displayedDockWidth(windowState.dockWidth)
      };
      setResizing(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    };
    const moveResize = event => {
      const start = interactionRef.current;
      if (!start || start.kind !== "resize" || event.pointerId !== start.pointerId) return;
      const deltaX = event.clientX - start.clientX;
      const deltaY = event.clientY - start.clientY;
      setWindowState(current => start.mode === "docked" ? {
        mode: current.mode,
        rect: current.rect,
        dockWidth: persistableDockWidth(start.dockWidth - deltaX)
      } : {
        mode: current.mode,
        rect: resizedWindowRect(start.rect, start.edge, deltaX, deltaY),
        dockWidth: current.dockWidth
      });
    };
    const endResize = event => {
      const start = interactionRef.current;
      if (!start || start.kind !== "resize" || event.pointerId !== start.pointerId) return;
      interactionRef.current = null;
      setResizing(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };
    const resizeWithKeyboard = (edge, event) => {
      const step = 12;
      if (windowState.mode === "docked") {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        setWindowState(current => ({
          mode: current.mode,
          rect: current.rect,
          dockWidth: persistableDockWidth(displayedDockWidth(current.dockWidth) + (event.key === "ArrowLeft" ? step : -step))
        }));
        return;
      }
      let deltaX = 0;
      let deltaY = 0;
      if (event.key === "ArrowLeft") deltaX = -step;
      if (event.key === "ArrowRight") deltaX = step;
      if (event.key === "ArrowUp") deltaY = -step;
      if (event.key === "ArrowDown") deltaY = step;
      if (!deltaX && !deltaY) return;
      event.preventDefault();
      setWindowState(current => ({
        mode: current.mode,
        rect: resizedWindowRect(current.rect, edge, deltaX, deltaY),
        dockWidth: current.dockWidth
      }));
    };
    const dockWidth = displayedDockWidth(windowState.dockWidth);
    const windowStyle = compactViewport() ? undefined : windowState.mode === "docked" ? {
      top: DOCK_TOP,
      right: 0,
      width: dockWidth,
      height: Math.max(360, window.innerHeight - DOCK_TOP)
    } : {
      left: windowState.rect.x,
      top: windowState.rect.y,
      width: windowState.rect.width,
      height: windowState.rect.height
    };
    return {
      mode: windowState.mode,
      windowRect: windowState.rect,
      dockWidth,
      windowStyle,
      dockPreview,
      dockPreviewStyle: compactViewport() ? undefined : {
        width: dockWidth
      },
      resizing,
      dragging,
      toggleDock,
      beginDrag,
      moveDrag,
      endDrag,
      beginResize,
      moveResize,
      endResize,
      resizeWithKeyboard
    };
  }
  function ResizeHandles({
    controller
  }) {
    if (compactViewport()) return null;
    const edges = controller.mode === "docked" ? ["left"] : ["top", "right", "bottom", "left", "top-left", "top-right", "bottom-right", "bottom-left"];
    return edges.map(edge => {
      const diagonal = edge.includes("-");
      const horizontal = edge === "top" || edge === "bottom";
      const dimension = horizontal ? controller.windowRect.height : controller.mode === "docked" ? controller.dockWidth : controller.windowRect.width;
      const accessibility = diagonal ? {
        "aria-valuetext": Math.round(controller.windowRect.width) + " × " + Math.round(controller.windowRect.height)
      } : {
        "aria-orientation": horizontal ? "horizontal" : "vertical",
        "aria-valuemin": horizontal ? FLOATING_MIN_HEIGHT : controller.mode === "docked" ? DOCK_MIN_WIDTH : FLOATING_MIN_WIDTH,
        "aria-valuemax": horizontal ? window.innerHeight - 24 : controller.mode === "docked" ? Layout.dockViewportMaximum(window.innerWidth) : window.innerWidth - 24,
        "aria-valuenow": Math.round(dimension)
      };
      return /*#__PURE__*/React.createElement("span", _extends({
        key: edge,
        className: "asst-resize-handle asst-resize-handle--" + edge,
        role: "separator",
        "aria-label": TC("asst_resize_" + edge.replace("-", "_")),
        tabIndex: "0"
      }, accessibility, {
        onPointerDown: event => controller.beginResize(edge, event),
        onPointerMove: controller.moveResize,
        onPointerUp: controller.endResize,
        onPointerCancel: controller.endResize,
        onKeyDown: event => controller.resizeWithKeyboard(edge, event)
      }));
    });
  }
  function activateWindow(event) {
    const owner = event.target.closest?.('[data-assistant-window]');
    const layer = owner?.closest('.asst-layer');
    if (!layer || owner.parentElement !== layer) return;
    // Keep both windows inside the assistant layer, below global blocking dialogs.
    Array.from(layer.children).filter(node => node.hasAttribute('data-assistant-window')).forEach(node => {
      node.style.zIndex = node === owner ? '3' : '2';
    });
  }
  window.AssistantWindow = {
    compactViewport,
    clampWindowRect,
    useAssistantWindow,
    ResizeHandles,
    activateWindow
  };
})();
}
