(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantMarkdownCore = api;
})(typeof globalThis === "object" ? globalThis : this, function (root) {
  const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
  let inlineParser;

  function chineseBold(engine) {
    const punctuation = /[、。，！？；：“”‘’（）《》〈〉【】「」『』〔〕［］｛｝…—]/u;
    engine.inline.ruler.before("emphasis", "chinese_bold", (state, silent) => {
      const start = state.pos;
      if (silent || state.src.slice(start, start + 2) !== "**") return false;
      const scanned = state.scanDelims(start, true);
      if (scanned.length !== 2) return false;
      const before = state.src.slice(Math.max(0, start - 2), start);
      const after = state.src.slice(start + 2, start + 4);
      const open = !scanned.can_open && /\p{Script=Han}$/u.test(before) && punctuation.test(after[0] || "");
      const close = !scanned.can_close && punctuation.test(before.slice(-1)) && /^\p{Script=Han}/u.test(after);
      if (!open && !close) return false;
      // Keep the source untouched and let markdown-it balance/nest delimiters.
      for (let index = 0; index < 2; index += 1) {
        state.push("text", "", 0).content = "*";
        state.delimiters.push({
          marker: 0x2A, length: 2, token: state.tokens.length - 1, end: -1,
          open: open || scanned.can_open, close: close || scanned.can_close,
          chineseBold: true,
        });
      }
      state.pos += 2;
      return true;
    });
    // A relaxed ** boundary must form a full bold pair, not consume a lone *
    // from an incomplete streamed reply and turn it into italic text.
    engine.inline.ruler2.before("emphasis", "chinese_bold_pairs", state => {
      function retainBoldPairs(delimiters) {
        const invalid = [];
        for (let index = 0; index < delimiters.length; index += 1) {
          const opener = delimiters[index];
          const closer = delimiters[opener.end];
          if (!closer || (!opener.chineseBold && !closer.chineseBold)) continue;
          const paired = [-1, 1].some(offset => {
            const adjacentOpen = delimiters[index + offset];
            const adjacentClose = delimiters[opener.end - offset];
            return adjacentOpen?.marker === 0x2A && adjacentClose?.marker === 0x2A
              && adjacentOpen.end === opener.end - offset
              && adjacentOpen.token === opener.token + offset
              && adjacentClose.token === closer.token - offset;
          });
          if (!paired) invalid.push(opener);
        }
        for (const opener of invalid) opener.end = -1;
      }
      retainBoldPairs(state.delimiters);
      for (const meta of state.tokens_meta) {
        if (meta?.delimiters) retainBoldPairs(meta.delimiters);
      }
    });
  }

  function parser() {
    if (!inlineParser && typeof root?.markdownit === "function") {
      // Reuse the pinned parser for safe inline tokens and table structure.
      // React owns rendering; raw HTML and images never become active elements.
      inlineParser = root.markdownit("commonmark", { html: false, linkify: false, typographer: false });
      inlineParser.disable("image");
      inlineParser.enable("table");
      inlineParser.validateLink = isSafeLink;
      inlineParser.use(chineseBold);
    }
    return inlineParser;
  }

  function isSafeLink(value) {
    const href = String(value || "").trim();
    if (!href) return false;
    if (href.startsWith("/") || href.startsWith("#")) return true;
    try {
      return SAFE_PROTOCOLS.has(new URL(href).protocol);
    } catch (error) {
      return false;
    }
  }

  function parseInline(value) {
    const text = String(value || "");
    const engine = parser();
    // A failed vendor load must preserve literal names instead of applying a
    // second, less capable Markdown grammar.
    if (!engine) return [{ type: "text", value: text }];
    const nodes = [];
    const stack = [nodes];
    const appendText = value => {
      if (!value) return;
      const target = stack[stack.length - 1];
      const previous = target[target.length - 1];
      if (previous?.type === "text") previous.value += value;
      else target.push({ type: "text", value });
    };
    for (const token of engine.parseInline(text, {})[0]?.children || []) {
      const target = stack[stack.length - 1];
      if (token.type === "em_open" || token.type === "strong_open" || token.type === "link_open") {
        const node = { type: token.type.slice(0, -5), children: [] };
        if (node.type === "link") {
          node.href = token.attrGet("href");
          if (!isSafeLink(node.href)) { node.type = "text_group"; delete node.href; }
        }
        target.push(node);
        stack.push(node.children);
      } else if (token.type === "em_close" || token.type === "strong_close" || token.type === "link_close") {
        stack.pop();
      } else if (token.type === "code_inline") {
        target.push({ type: "code", value: token.content });
      } else if (token.type === "hardbreak" || token.type === "softbreak") {
        target.push({ type: "break" });
      } else appendText(token.content);
    }
    function safeNodes(items) {
      return items.flatMap(node => {
        if (node.children) node.children = safeNodes(node.children);
        // Unsafe links cannot acquire a clickable target; keep their text.
        return node.type === "text_group" ? node.children : [node];
      });
    }
    return nodes.length ? safeNodes(nodes) : [{ type: "text", value: text }];
  }

  function fenceMatch(line) {
    return /^ {0,3}```([A-Za-z0-9_-]*)\s*$/.exec(line);
  }

  function headingMatch(line) {
    return /^(#{1,6})\s+(.+)$/.exec(line);
  }

  function listMatch(line) {
    const unordered = /^\s*[-+*]\s+(.+)$/.exec(line);
    if (unordered) return { ordered: false, text: unordered[1] };
    const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    return ordered ? { ordered: true, text: ordered[1] } : null;
  }

  function isHorizontalRule(line) {
    return /^\s*(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line);
  }

  function startsBlock(line) {
    return !line.trim()
      || Boolean(fenceMatch(line))
      || Boolean(headingMatch(line))
      || Boolean(listMatch(line))
      || /^\s*>/.test(line)
      || isHorizontalRule(line);
  }

  function tableStart(lines, index) {
    return lines[index]?.includes("|") && /^[\s:|\-]+$/.test(lines[index + 1] || "") && /-/.test(lines[index + 1] || "");
  }

  function tableAt(lines, index) {
    const engine = tableStart(lines, index) && parser();
    if (!engine) return null;
    let end = index + 2;
    while (end < lines.length && lines[end].trim() && lines[end].includes("|")) end += 1;
    const tokens = engine.parse(lines.slice(index, end).join("\n"), {});
    if (tokens[0]?.type !== "table_open") return null;
    const headers = [], rows = [], align = [];
    let head = false, row = [];
    for (const token of tokens) {
      if (token.type === "thead_open") head = true;
      else if (token.type === "thead_close") head = false;
      else if (token.type === "tr_open") row = [];
      else if (token.type === "th_open") {
        const value = (token.attrGet("style") || "").replace("text-align:", "");
        align.push(["left", "center", "right"].includes(value) ? value : undefined);
      } else if (token.type === "inline") row.push(parseInline(token.content));
      else if (token.type === "tr_close") { if (head) headers.push(...row); else rows.push(row); }
      else if (token.type === "table_close") break;
    }
    return { block: { type: "table", headers, rows, align }, next: index + tokens[0].map[1] };
  }

  function parseBlocks(value) {
    const lines = String(value || "").replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }
      const fence = fenceMatch(line);
      if (fence) {
        const content = [];
        index += 1;
        while (index < lines.length && !/^ {0,3}```\s*$/.test(lines[index])) {
          content.push(lines[index]);
          index += 1;
        }
        if (index < lines.length) index += 1;
        blocks.push({ type: "code", language: fence[1] || "", text: content.join("\n") });
        continue;
      }
      const table = tableAt(lines, index);
      if (table) { blocks.push(table.block); index = table.next; continue; }
      const heading = headingMatch(line);
      if (heading) {
        blocks.push({ type: "heading", level: heading[1].length, children: parseInline(heading[2]) });
        index += 1;
        continue;
      }
      const list = listMatch(line);
      if (list) {
        const items = [];
        const ordered = list.ordered;
        while (index < lines.length) {
          const item = listMatch(lines[index]);
          if (!item || item.ordered !== ordered) break;
          const itemNodes = parseInline(item.text);
          index += 1;
          while (
            index < lines.length
            && /^(?:\t| {2,})\S/.test(lines[index])
            && !listMatch(lines[index])
          ) {
            itemNodes.push({ type: "break" }, ...parseInline(lines[index].trim()));
            index += 1;
          }
          items.push(itemNodes);
        }
        blocks.push({ type: "list", ordered, items });
        continue;
      }
      if (/^\s*>/.test(line)) {
        const quoted = [];
        while (index < lines.length && /^\s*>/.test(lines[index])) {
          quoted.push(lines[index].replace(/^\s*>\s?/, ""));
          index += 1;
        }
        blocks.push({ type: "blockquote", children: parseBlocks(quoted.join("\n")) });
        continue;
      }
      if (isHorizontalRule(line)) {
        blocks.push({ type: "rule" });
        index += 1;
        continue;
      }
      const paragraph = [line.trim()];
      index += 1;
      while (index < lines.length && !startsBlock(lines[index]) && !tableStart(lines, index)) {
        paragraph.push(lines[index].trim());
        index += 1;
      }
      blocks.push({ type: "paragraph", children: parseInline(paragraph.join(" ")) });
    }
    return blocks;
  }

  return { isSafeLink, parseInline, parseBlocks };
});
