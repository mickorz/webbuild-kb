{
/* A phone detail page has one title bar (FD-176). Page-level actions of a detail, such as revision
   history and editing the detail's own header, render into that bar when the phone frame provides a
   slot, and stay where the desktop component placed them otherwise. */
(function () {
  const DetailToolsContext = React.createContext(null);
  function DetailTools({
    children
  }) {
    const slot = React.useContext(DetailToolsContext);
    if (!children) return null;
    return slot ? ReactDOM.createPortal(children, slot) : children;
  }
  window.LFDetailToolsContext = DetailToolsContext;
  window.DetailTools = DetailTools;
})();
}
