{
/* Shared presentation only: domain components retain permission, version and retry rules. */
(function () {
  const copy = (zh, en) => window.CLANG === 'en' ? en : zh;
  function Notice({
    title,
    children,
    actions,
    tone = 'warning',
    className = '',
    role = 'status'
  }) {
    return /*#__PURE__*/React.createElement("section", {
      className: 'asst-notice asst-notice--' + tone + ' ' + className,
      role: role
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-notice__body"
    }, title && /*#__PURE__*/React.createElement("strong", null, title), children), actions && /*#__PURE__*/React.createElement("div", {
      className: "asst-notice__actions"
    }, actions));
  }
  function ReviewSurface({
    children,
    identity,
    title,
    required = false,
    onViewed
  }) {
    const [opened, setOpened] = React.useState(null);
    const open = !!opened && opened.identity === identity;
    const Dialog = window.ConfirmDialog;
    function show() {
      setOpened({
        identity
      });
      if (onViewed) onViewed(identity);
    }
    // Full content stays available; the card is a bounded preview, never a truncated replacement.
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-review-surface"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-review-surface__preview",
      tabIndex: 0,
      role: "region",
      "aria-label": title
    }, children), /*#__PURE__*/React.createElement("div", {
      className: "asst-review-surface__footer"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: show
    }, copy('查看完整对照', 'Read full comparison')), required && /*#__PURE__*/React.createElement("span", null, copy('查看后可确认保存', 'Read before saving'))), Dialog && /*#__PURE__*/React.createElement(Dialog, {
      open: open,
      title: title,
      icon: null,
      className: "asst-review-dialog",
      cancelLabel: copy('关闭', 'Close'),
      confirmLabel: copy('返回确认卡', 'Back to proposal'),
      onClose: () => setOpened(null),
      onConfirm: () => setOpened(null)
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-review-surface__full"
    }, children)));
  }
  function ActionAvailability({
    id,
    message,
    onRefresh
  }) {
    if (!message) return null;
    return /*#__PURE__*/React.createElement("div", {
      id: id,
      className: "asst-action__note asst-action__availability",
      role: "status"
    }, /*#__PURE__*/React.createElement("span", null, message), onRefresh && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: onRefresh
    }, copy('重新加载', 'Reload')));
  }
  window.AssistantInteractionUI = {
    Notice,
    ReviewSurface,
    ActionAvailability
  };
})();
}
