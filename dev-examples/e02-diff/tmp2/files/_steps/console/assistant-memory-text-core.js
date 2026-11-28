(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AssistantMemoryTextCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const KEYS = { Involving: "involving", When: "when" };
  const LABELS = { involving: "Involving", when: "When" };

  // Split only unescaped, spaced pipes outside quotes/code/brackets. Keep the exact separators.
  function partsOf(raw) {
    const parts = [], stack = [];
    const pairs = { '"': '"', "“": "”", "‘": "’", "`": "`", "(": ")", "（": "）", "[": "]", "{": "}" };
    let start = 0, separator = "", quote = "";
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c === "\\") { i++; continue; }
      if (quote) { if (c === quote) quote = ""; continue; }
      if (c === '"' || c === "“" || c === "‘" || c === "`") { quote = pairs[c]; continue; }
      if (c === "'" && (i === 0 || /[\s([{]/.test(raw[i - 1]))) { quote = "'"; continue; }
      if (stack.length && c === stack[stack.length - 1]) { stack.pop(); continue; }
      if (pairs[c]) { stack.push(pairs[c]); continue; }
      if (stack.length || c !== "|" || !/[ \t]/.test(raw[i - 1] || "") || !/[ \t]/.test(raw[i + 1] || "")) continue;
      let left = i, right = i + 1;
      while (left > start && /[ \t]/.test(raw[left - 1])) left--;
      while (right < raw.length && /[ \t]/.test(raw[right])) right++;
      parts.push({ raw: raw.slice(start, left), separator });
      separator = raw.slice(left, right); start = right; i = right - 1;
    }
    parts.push({ raw: raw.slice(start), separator });
    return parts;
  }

  function parse(raw) {
    raw = String(raw == null ? "" : raw);
    const parts = partsOf(raw), counts = {};
    parts.forEach((part, i) => {
      // The first segment is always prose. Multi-line/table fragments remain prose too.
      const match = i && part.raw.match(/^([ \t]*(Involving|When):[ \t]*)([^\r\n]*?)([ \t]*)$/);
      if (!match || !match[3].trim()) return;
      part.key = KEYS[match[2]]; part.prefix = match[1]; part.value = match[3].trim(); part.suffix = match[4];
      counts[part.key] = (counts[part.key] || 0) + 1;
    });
    // Repeated labels or an empty body are ambiguous: do not consume any text.
    if (Object.values(counts).some(count => count > 1) || !parts[0].raw.trim()) {
      return { raw, content: raw, involving: "", when: "", parts: [{ raw, separator: "" }] };
    }
    const content = parts.filter(part => !part.key).map((part, i) => (i ? part.separator : "") + part.raw).join("");
    return { raw, content, involving: parts.find(p => p.key === "involving")?.value || "",
      when: parts.find(p => p.key === "when")?.value || "", parts };
  }

  function compose(base, draft) {
    const fields = { content: String(draft.content || ""), involving: String(draft.involving || "").trim(), when: String(draft.when || "").trim() };
    if (!fields.content.trim()) return { ok: false, error: "empty" };
    if (Object.keys(fields).every(key => fields[key] === base[key])) {
      return base.raw.length <= 20000 ? { ok: true, text: base.raw } : { ok: false, error: "length" };
    }
    const parts = fields.content === base.content ? base.parts : [
      { raw: fields.content, separator: "" }, ...base.parts.filter(part => part.key)
    ];
    const present = new Set();
    let text = "";
    parts.forEach(part => {
      let raw = part.raw;
      if (part.key) {
        present.add(part.key);
        if (!fields[part.key]) return;
        if (fields[part.key] !== base[part.key]) raw = part.prefix + fields[part.key] + part.suffix;
      }
      text += (text ? part.separator : "") + raw;
    });
    for (const key of ["when", "involving"]) {
      if (!present.has(key) && fields[key]) text += " | " + LABELS[key] + ": " + fields[key];
    }
    if (text.length > 20000) return { ok: false, error: "length" };
    const roundTrip = parse(text);
    if (Object.keys(fields).some(key => roundTrip[key] !== fields[key])) return { ok: false, error: "ambiguous" };
    return { ok: true, text };
  }

  function present(raw, entities) {
    const parsed = parse(raw);
    // Only exact names (with an optional trailing role/alias) count as duplicates; never substring-match.
    const names = parsed.involving.split(/[、,，;；]/).map(name => name.trim().replace(/[（(][^()（）]*[)）]$/, "").trim());
    return { content: parsed.content, involving: parsed.involving, when: parsed.when,
      entities: (entities || []).filter(name => !names.includes(name.trim())) };
  }

  return { parse, compose, present };
});
