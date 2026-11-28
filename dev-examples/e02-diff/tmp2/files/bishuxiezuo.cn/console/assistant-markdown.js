{
/* Safe Markdown rendering for Assistant model replies. */
(function () {
  const {
    useMemo
  } = React;
  function inlineNodes(nodes, prefix) {
    return nodes.map((node, index) => {
      const key = prefix + "-" + index;
      if (node.type === "break") return /*#__PURE__*/React.createElement("br", {
        key: key
      });
      if (node.type === "code") return /*#__PURE__*/React.createElement("code", {
        key: key
      }, node.value);
      if (node.type === "strong") return /*#__PURE__*/React.createElement("strong", {
        key: key
      }, inlineNodes(node.children, key));
      if (node.type === "em") return /*#__PURE__*/React.createElement("em", {
        key: key
      }, inlineNodes(node.children, key));
      if (node.type === "link") {
        const external = /^https?:/i.test(node.href);
        return /*#__PURE__*/React.createElement("a", {
          key: key,
          href: node.href,
          target: external ? "_blank" : undefined,
          rel: external ? "noreferrer" : undefined
        }, inlineNodes(node.children, key));
      }
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: key
      }, node.value);
    });
  }
  function blockNode(block, index, prefix) {
    const key = prefix + "-" + index;
    if (block.type === "heading") {
      const Tag = "h" + block.level;
      return /*#__PURE__*/React.createElement(Tag, {
        key: key
      }, inlineNodes(block.children, key));
    }
    if (block.type === "list") {
      const Tag = block.ordered ? "ol" : "ul";
      return /*#__PURE__*/React.createElement(Tag, {
        key: key
      }, block.items.map((item, itemIndex) => /*#__PURE__*/React.createElement("li", {
        key: key + "-" + itemIndex
      }, inlineNodes(item, key + "-" + itemIndex))));
    }
    if (block.type === "table") {
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        className: "asst-markdown__table",
        role: "region",
        "aria-label": window.CLANG === "en" ? "Reply table" : "回复表格",
        tabIndex: 0
      }, /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, block.headers.map((cell, column) => /*#__PURE__*/React.createElement("th", {
        key: column,
        scope: "col",
        style: {
          textAlign: block.align[column]
        }
      }, inlineNodes(cell, key + "-head-" + column))))), /*#__PURE__*/React.createElement("tbody", null, block.rows.map((row, rowIndex) => /*#__PURE__*/React.createElement("tr", {
        key: rowIndex
      }, row.map((cell, column) => /*#__PURE__*/React.createElement("td", {
        key: column,
        style: {
          textAlign: block.align[column]
        }
      }, inlineNodes(cell, key + "-" + rowIndex + "-" + column))))))));
    }
    if (block.type === "blockquote") {
      return /*#__PURE__*/React.createElement("blockquote", {
        key: key
      }, block.children.map((child, childIndex) => blockNode(child, childIndex, key)));
    }
    if (block.type === "code") {
      return /*#__PURE__*/React.createElement("pre", {
        key: key
      }, /*#__PURE__*/React.createElement("code", {
        "data-language": block.language || undefined
      }, block.text));
    }
    if (block.type === "rule") return /*#__PURE__*/React.createElement("hr", {
      key: key
    });
    return /*#__PURE__*/React.createElement("p", {
      key: key
    }, inlineNodes(block.children, key));
  }
  function AssistantMarkdown({
    text
  }) {
    const blocks = useMemo(() => window.AssistantMarkdownCore.parseBlocks(text), [text]);
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-markdown"
    }, blocks.map((block, index) => blockNode(block, index, "md")));
  }
  window.AssistantMarkdown = AssistantMarkdown;
})();
}
