{
/* Assistant analysis drawers share keyboard and focus behavior. */
(function () {
  const {
    useEffect,
    useId,
    useRef
  } = React;
  function AdminAssistantDrawer({
    title,
    children,
    onClose,
    busy = false,
    footer,
    className = "",
    closeLabel
  }) {
    const panelRef = useRef(null);
    const closeRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const busyRef = useRef(busy);
    onCloseRef.current = onClose;
    busyRef.current = busy;
    const titleId = "assistant-drawer-" + useId().replace(/:/g, "");
    useEffect(() => {
      const previous = document.activeElement;
      const focusTimer = setTimeout(() => closeRef.current && closeRef.current.focus(), 0);
      const keydown = event => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (!busyRef.current) onCloseRef.current();
          return;
        }
        if (event.key !== "Tab" || !panelRef.current) return;
        const controls = Array.from(panelRef.current.querySelectorAll("button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary,[tabindex]:not([tabindex='-1'])")).filter(control => !control.closest('[hidden], [inert]'));
        const first = controls[0],
          last = controls[controls.length - 1];
        if (!first) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      const panel = panelRef.current;
      panel.addEventListener("keydown", keydown);
      return () => {
        clearTimeout(focusTimer);
        panel.removeEventListener("keydown", keydown);
        if (previous && previous.isConnected) previous.focus();
      };
    }, []);
    return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-drawer-scrim",
      onMouseDown: event => {
        if (event.target === event.currentTarget && !busy) onClose();
      }
    }, /*#__PURE__*/React.createElement("aside", {
      ref: panelRef,
      className: "adm-assistant-drawer " + className,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h2", {
      id: titleId
    }, title), /*#__PURE__*/React.createElement("button", {
      ref: closeRef,
      type: "button",
      className: "c-btn sm",
      disabled: busy,
      onClick: onClose
    }, closeLabel || (window.CLANG === "en" ? "Close" : "关闭"))), /*#__PURE__*/React.createElement("div", {
      className: "adm-assistant-drawer-body"
    }, children), footer ? /*#__PURE__*/React.createElement("footer", null, footer) : null)), document.fullscreenElement || document.body);
  }
  window.AdminAssistantDrawer = AdminAssistantDrawer;
})();
}
