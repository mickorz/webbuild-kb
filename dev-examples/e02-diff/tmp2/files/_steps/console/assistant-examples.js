{
/* ===== Page Assistant empty-session examples ===== */
(function () {
  const Action = window.AssistantActionCore;
  const Examples = window.AssistantExamplesCore;
  function assistantCopy(key, values) {
    return Action.interpolate(TC(key), values);
  }
  function AssistantExamples({
    pageContext,
    locked,
    onPick
  }) {
    const items = Examples.examplesForPage(pageContext);
    if (!items.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-examples",
      role: "group",
      "aria-label": TC("asst_examples")
    }, items.map(item => {
      const text = assistantCopy(item.copyKey, item.values);
      return /*#__PURE__*/React.createElement("button", {
        key: item.id,
        type: "button",
        className: "asst-example",
        disabled: !!locked,
        onClick: () => {
          if (onPick) onPick(text);
        }
      }, /*#__PURE__*/React.createElement("span", null, text), /*#__PURE__*/React.createElement("span", {
        className: "asst-example__arrow",
        "aria-hidden": "true"
      }, "\u2192"));
    }));
  }
  window.AssistantExamples = AssistantExamples;
})();
}
