/* Adapted from Hindsight constellation layout/zoom/hit-test at
   https://github.com/vectorize-io/hindsight
   commit 92f433c90409636804c0797071a4abbe141f76c5 (0.8.4).
   Original: hindsight-control-plane/src/components/constellation.tsx
   Licensed under the MIT License. See vendor/hindsight-constellation.NOTICE. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantMemoryGraphCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const GRAPH_PATH = "/api/assistant/memory/graph";
  const GRAPH_LIMIT_DEFAULT = 200;
  const GRAPH_LIMIT_MIN = 1;
  const GRAPH_LIMIT_MAX = 300;
  const NODE_TYPES = Object.freeze(["world", "experience", "observation", "unknown"]);
  const LINK_TYPES = Object.freeze(["semantic", "temporal", "entity", "causal", "unknown"]);
  const NODE_TYPE_SET = new Set(NODE_TYPES);
  const LINK_TYPE_SET = new Set(LINK_TYPES);
  const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
  const LABEL_MAX = 200;
  const TEXT_MAX = 8000;
  const CONTEXT_MAX = 400;
  const ID_MAX = 200;
  const LIST_MAX = 24;
  const LIST_ITEM_MAX = 80;
  const UPSTREAM_PIN = "92f433c90409636804c0797071a4abbe141f76c5";

  function clampLimit(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return GRAPH_LIMIT_DEFAULT;
    return Math.max(GRAPH_LIMIT_MIN, Math.min(GRAPH_LIMIT_MAX, Math.floor(parsed)));
  }

  function graphRequestPath(options) {
    return GRAPH_PATH + "?limit=" + String(clampLimit(options && options.limit));
  }

  function sanitizeText(value, max) {
    if (value == null) return "";
    const text = String(value).replace(CONTROL_CHARS, "").trim();
    if (!text) return "";
    const limit = max == null ? TEXT_MAX : max;
    return text.length > limit ? text.slice(0, limit) : text;
  }

  function sanitizeId(value) {
    return sanitizeText(value, ID_MAX);
  }

  function sanitizeList(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    const seen = new Set();
    for (let i = 0; i < value.length && out.length < LIST_MAX; i += 1) {
      const item = sanitizeText(value[i], LIST_ITEM_MAX);
      if (!item || seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
    return out;
  }

  function sanitizeType(value, allowed, fallback) {
    const text = sanitizeText(value, 32).toLowerCase();
    return allowed.has(text) ? text : fallback;
  }

  function sanitizeOccurredAt(value) {
    if (value == null || value === "") return null;
    const text = sanitizeText(value, 64);
    return text || null;
  }

  function sanitizeWeight(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    if (parsed < 0) return 0;
    return parsed;
  }

  function normalizeNode(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = sanitizeId(raw.id);
    if (!id) return null;
    const label = sanitizeText(raw.label, LABEL_MAX);
    const text = sanitizeText(raw.text, TEXT_MAX) || label;
    return {
      id: id,
      label: label || text.slice(0, LABEL_MAX) || id,
      text: text,
      type: sanitizeType(raw.type, NODE_TYPE_SET, "unknown"),
      context: sanitizeText(raw.context, CONTEXT_MAX),
      entities: sanitizeList(raw.entities),
      tags: sanitizeList(raw.tags),
      occurred_at: sanitizeOccurredAt(raw.occurred_at),
      document_id: raw.document_id == null || raw.document_id === ""
        ? null
        : sanitizeId(raw.document_id)
    };
  }

  function normalizeLink(raw, nodeIds) {
    if (!raw || typeof raw !== "object") return null;
    const source = sanitizeId(raw.source);
    const target = sanitizeId(raw.target);
    if (!source || !target || source === target) return null;
    if (nodeIds && (!nodeIds.has(source) || !nodeIds.has(target))) return null;
    return {
      source: source,
      target: target,
      type: sanitizeType(raw.type, LINK_TYPE_SET, "unknown"),
      weight: sanitizeWeight(raw.weight)
    };
  }

  function normalizeGraph(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { ok: false, reason: "invalid" };
    }
    if (!Array.isArray(payload.nodes)) return { ok: false, reason: "invalid" };
    if (payload.links != null && !Array.isArray(payload.links)) {
      return { ok: false, reason: "invalid" };
    }
    const nodes = [];
    const nodeIds = new Set();
    for (let i = 0; i < payload.nodes.length; i += 1) {
      const node = normalizeNode(payload.nodes[i]);
      if (!node || nodeIds.has(node.id)) continue;
      nodeIds.add(node.id);
      nodes.push(node);
    }
    if (payload.nodes.length > 0 && nodes.length === 0) {
      return { ok: false, reason: "invalid" };
    }
    const links = [];
    const rawLinks = Array.isArray(payload.links) ? payload.links : [];
    const seenLinks = new Set();
    for (let i = 0; i < rawLinks.length; i += 1) {
      const link = normalizeLink(rawLinks[i], nodeIds);
      if (!link) continue;
      const key = link.source + "\0" + link.target + "\0" + link.type;
      if (seenLinks.has(key)) continue;
      seenLinks.add(key);
      links.push(link);
    }
    return {
      ok: true,
      graph: {
        nodes: nodes,
        links: links,
        truncated: payload.truncated === true
      }
    };
  }

  function pairLinks(links, type) {
    const pairs = new Map();
    (links || []).forEach(link => {
      const types = link.types || [link.type];
      if (type && !types.includes(type)) return;
      const key = [link.source, link.target].sort().join("\0");
      const prior = pairs.get(key);
      if (!prior) pairs.set(key, { ...link, types: type ? [type] : [...types] });
      else {
        (type ? [type] : types).forEach(t => { if (!prior.types.includes(t)) prior.types.push(t); });
        if (link.weight > prior.weight) prior.weight = link.weight;
      }
    });
    return [...pairs.values()].sort((a, b) => b.weight - a.weight
      || a.source.localeCompare(b.source) || a.target.localeCompare(b.target));
  }

  // A maximum spanning forest keeps real connectivity without drawing the
  // complete similarity mesh. Extra strong edges are bounded by graph size.
  function overviewLinks(nodes, links) {
    const ids = new Set(nodes.map(node => node.id));
    const pairs = pairLinks(links).filter(link => ids.has(link.source) && ids.has(link.target));
    const parent = new Map(nodes.map(node => [node.id, node.id]));
    const find = id => {
      let root = id;
      while (parent.get(root) !== root) root = parent.get(root);
      while (parent.get(id) !== id) { const next = parent.get(id); parent.set(id, root); id = next; }
      return root;
    };
    const chosen = new Set();
    pairs.forEach(link => {
      const a = find(link.source), b = find(link.target);
      if (a !== b) { parent.set(a, b); chosen.add(link); }
    });
    const degree = new Map();
    chosen.forEach(link => [link.source, link.target].forEach(id => degree.set(id, (degree.get(id) || 0) + 1)));
    const budget = Math.ceil(nodes.length * 1.4);
    pairs.forEach(link => {
      if (chosen.size >= budget || chosen.has(link)) return;
      if ((degree.get(link.source) || 0) >= 3 && (degree.get(link.target) || 0) >= 3) return;
      chosen.add(link);
      [link.source, link.target].forEach(id => degree.set(id, (degree.get(id) || 0) + 1));
    });
    return [...chosen];
  }

  function layoutGraph(graph) {
    const raw = (graph && graph.nodes) || [];
    const links = pairLinks((graph && graph.links) || []);
    const ranks = new Map([...raw].sort((a, b) => a.id.localeCompare(b.id)).map((n, i) => [n.id, i]));
    const degree = new Map();
    links.forEach(link => [link.source, link.target].forEach(id => degree.set(id, (degree.get(id) || 0) + 1)));
    const nodes = raw.map(node => {
      const rank = ranks.get(node.id), angle = rank * 2.3999632297;
      const radius = 60 * Math.sqrt(rank + 0.5);
      return { ...node, wx: Math.cos(angle) * radius, wy: Math.sin(angle) * radius,
        linkCount: degree.get(node.id) || 0 };
    });
    const index = new Map(nodes.map((n, i) => [n.id, i]));
    const placed = links.filter(l => index.has(l.source) && index.has(l.target))
      .map(l => ({ ...l, a: index.get(l.source), b: index.get(l.target) }));
    const skeleton = overviewLinks(raw, links).map(l => ({ ...l, a: index.get(l.source), b: index.get(l.target) }));
    // Bounded deterministic relaxation; no idle simulation or data mutations.
    const fx = new Float64Array(nodes.length), fy = new Float64Array(nodes.length);
    for (let step = 0; step < 100; step++) {
      fx.fill(0); fy.fill(0);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].wx - nodes[j].wx, dy = nodes[i].wy - nodes[j].wy;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const force = Math.min(14, 4200 / (dist * dist)) + Math.max(0, 52 - dist) * 0.16;
          fx[i] += dx / dist * force; fy[i] += dy / dist * force;
          fx[j] -= dx / dist * force; fy[j] -= dy / dist * force;
        }
      }
      skeleton.forEach(link => {
        const a = nodes[link.a], b = nodes[link.b];
        const dx = b.wx - a.wx, dy = b.wy - a.wy, dist = Math.max(1, Math.hypot(dx, dy));
        const force = (dist - 105) * 0.025;
        fx[link.a] += dx / dist * force; fy[link.a] += dy / dist * force;
        fx[link.b] -= dx / dist * force; fy[link.b] -= dy / dist * force;
      });
      const cooling = 1 - step / 125;
      nodes.forEach((node, i) => {
        node.wx += Math.max(-14, Math.min(14, fx[i] - node.wx * 0.004)) * cooling;
        node.wy += Math.max(-14, Math.min(14, fy[i] - node.wy * 0.004)) * cooling;
      });
    }
    if (nodes.length) {
      const cx = (Math.min(...nodes.map(n => n.wx)) + Math.max(...nodes.map(n => n.wx))) / 2;
      const cy = (Math.min(...nodes.map(n => n.wy)) + Math.max(...nodes.map(n => n.wy))) / 2;
      nodes.forEach(n => { n.wx -= cx; n.wy -= cy; });
    }
    return { nodes, links: placed, overview: skeleton };
  }

  function fitZoom(layout, width, height) {
    const nodes = (layout && layout.nodes) || [];
    if (!nodes.length || !(width > 0 && height > 0)) return 1;
    const spanX = Math.max(...nodes.map(n => n.wx)) - Math.min(...nodes.map(n => n.wx));
    const spanY = Math.max(...nodes.map(n => n.wy)) - Math.min(...nodes.map(n => n.wy));
    return Math.max(0.08, Math.min(1.5, Math.max(60, width - 100) / Math.max(100, spanX),
      Math.max(60, height - 100) / Math.max(100, spanY)));
  }

  function screenPosition(node, camera) {
    return { x: camera.width / 2 + camera.panX + node.wx * camera.zoom,
      y: camera.height / 2 + camera.panY + node.wy * camera.zoom };
  }

  function zoomAt(camera, zoom, x, y) {
    const next = Math.max(0.08, Math.min(8, zoom));
    const ratio = next / camera.zoom;
    return { ...camera, zoom: next,
      panX: x - camera.width / 2 - (x - camera.width / 2 - camera.panX) * ratio,
      panY: y - camera.height / 2 - (y - camera.height / 2 - camera.panY) * ratio };
  }

  function hitTest(layout, camera, mouseX, mouseY, visibleIds) {
    const nodes = (layout && layout.nodes) || [];
    if (!camera || mouseX == null || mouseY == null) return -1;
    let best = 15, index = -1;
    nodes.forEach((node, i) => {
      if (visibleIds && !visibleIds.has(node.id)) return;
      const point = screenPosition(node, camera);
      const dist = Math.hypot(mouseX - point.x, mouseY - point.y);
      if (dist < best) { best = dist; index = i; }
    });
    return index;
  }

  function nodeRadius(linkCount, zoom) {
    return Math.max(4, Math.min(7, 4 + Math.sqrt(linkCount || 0) * 0.25)) * Math.min(1.2, Math.max(0.85, zoom || 1));
  }

  function neighbors(graph, id, type) {
    const map = new Map(((graph && graph.nodes) || []).map(n => [n.id, n]));
    return pairLinks((graph && graph.links) || [], type)
      .filter(link => link.source === id || link.target === id)
      .map(link => ({ node: map.get(link.source === id ? link.target : link.source), types: link.types, weight: link.weight }))
      .filter(item => item.node);
  }

  function visibleLinks(layout, ids, focusId, type, all) {
    const links = (layout.links || []).filter(link => ids.has(link.source) && ids.has(link.target)
      && (!type || link.types.includes(type)));
    if (focusId) return links.filter(l => l.source === focusId || l.target === focusId);
    return all ? links : overviewLinks(layout.nodes.filter(n => ids.has(n.id)), links);
  }

  function compactLabel(value, limit = 12) {
    const chars = Array.from(String(value || ""));
    return chars.length > limit ? chars.slice(0, limit).join("") + "…" : chars.join("");
  }

  // Screen-space bend stays subtle at every zoom; type separates parallel links.
  function curveControl(a, b, type) {
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    const lane = { semantic: 1, temporal: -1, entity: 0.6, causal: -0.6, unknown: 0.3 }[type] || 1;
    const bend = Math.min(26, length * 0.065) * lane;
    return { x: (a.x + b.x) / 2 - (length ? dy / length * bend : 0),
      y: (a.y + b.y) / 2 + (length ? dx / length * bend : 0) };
  }

  function previewPosition(point, width, height, side) {
    const w = Math.min(300, Math.max(0, width - 24)), h = Math.min(260, Math.max(0, height - 24));
    const placement = side || (point.x + 20 + w <= width - 12 ? "right" : "left");
    const x = placement === "right" ? point.x + 20 : point.x - w - 20;
    return { x: Math.max(12, Math.min(width - w - 12, x)),
      y: Math.max(12, Math.min(height - h - 12, point.y - 28)), width: w, maxHeight: h, side: placement };
  }

  function labelBox(item, side, width) {
    const w = Math.min(item.width, Math.max(20, width - 16)), h = 22;
    const positions = [[item.x + 12, item.y - h / 2], [item.x - w - 12, item.y - h / 2],
      [item.x - w / 2, item.y + 10], [item.x - w / 2, item.y - h - 10]];
    const [x, y] = positions[side];
    return { ...item, x, y, width: w, height: h, side };
  }

  function labelFits(box, candidates, placed, width, height) {
    const { x, y, width: w, height: h } = box;
    return x >= 6 && y >= 6 && x + w <= width - 6 && y + h <= height - 6
      && !candidates.some(point => point.id !== box.id && point.x > x - 8 && point.x < x + w + 8
        && point.y > y - 8 && point.y < y + h + 8)
      && !placed.some(p => x < p.x + p.width + 7 && x + w + 7 > p.x && y < p.y + p.height + 5 && y + h + 5 > p.y);
  }

  function placeLabels(candidates, width, height, previous = [], limit = Infinity) {
    const placed = [];
    const sides = new Map(previous.map(item => [item.id, item.side]));
    candidates.forEach(item => {
      if (placed.length >= limit) return;
      const preferred = sides.get(item.id);
      const attempts = Number.isInteger(preferred) ? [preferred, ...[0, 1, 2, 3].filter(side => side !== preferred)] : [0, 1, 2, 3];
      for (const side of attempts) {
        const box = labelBox(item, side, width);
        if (!labelFits(box, candidates, placed, width, height)) continue;
        placed.push(box); break;
      }
    });
    return placed;
  }

  // Keep label identities and sides through a camera gesture; only opacity and anchors move.
  function updateLabels(state, candidates, width, height, { moving, camera, now, reducedMotion, limit }) {
    const initial = !state.items, byId = new Map(candidates.map(item => [item.id, item]));
    if (initial || !moving && (state.moving || state.camera !== camera)) {
      state.targets = placeLabels(candidates, width, height, state.targets, limit);
      state.camera = camera;
    }
    const targets = new Set(state.targets.map(item => item.id + ':' + item.side));
    const items = (state.items || []).filter(item => byId.has(item.id));
    const existing = new Set(items.map(item => item.id + ':' + item.side));
    state.targets.forEach(item => {
      if (byId.has(item.id) && !existing.has(item.id + ':' + item.side)) items.push({ id: item.id, side: item.side, opacity: initial ? 1 : 0 });
    });
    const step = reducedMotion ? 1 : Math.min(32, Math.max(0, now - (state.at ?? now - 16))) / 120;
    const occupied = [], labels = []; let animating = false;
    items.forEach(item => {
      const box = labelBox(byId.get(item.id), item.side, width);
      const wanted = targets.has(item.id + ':' + item.side);
      const opacity = wanted && labelFits(box, candidates, occupied, width, height) ? 1 : 0;
      if (opacity) occupied.push(box);
      item.opacity = item.opacity < opacity ? Math.min(opacity, item.opacity + step) : Math.max(opacity, item.opacity - step);
      if (item.opacity !== opacity) animating = true;
      if (item.opacity > 0 && box.x < width && box.x + box.width > 0 && box.y < height && box.y + box.height > 0) labels.push({ ...box, opacity: item.opacity });
      item.wanted = wanted;
    });
    state.items = items.filter(item => item.wanted || item.opacity > 0);
    state.at = now; state.moving = moving;
    return { labels, animating };
  }

  function directionalNode(nodes, currentId, direction) {
    const current = nodes.find(n => n.id === currentId);
    if (!current) return nodes[0] || null;
    const vector = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[direction];
    if (!vector) return current;
    let best = null, score = Infinity;
    nodes.forEach(n => {
      if (n.id === current.id) return;
      const dx = n.wx - current.wx, dy = n.wy - current.wy;
      const forward = dx * vector[0] + dy * vector[1];
      if (forward <= 0) return;
      const next = Math.hypot(dx, dy) + Math.abs(dx * vector[1] - dy * vector[0]) * 2;
      if (next < score) { score = next; best = n; }
    });
    return best || current;
  }

  function prefersReducedMotion(media) {
    const query = media || (typeof window !== "undefined" ? window : null);
    try {
      return !!(query.matchMedia && query.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (_) {
      return false;
    }
  }

  function exampleGraph() {
    return {
      nodes: [
        {
          id: "example-world",
          label: "偏好简洁直接的中文回复",
          text: "用户希望创作助手用简洁直接的中文交流，技术名词可中英混用。",
          type: "world",
          context: "助手对话",
          entities: ["用户"],
          tags: ["偏好"],
          occurred_at: "2026-09-01T10:00:00Z",
          document_id: null
        },
        {
          id: "example-experience",
          label: "上次在设定页改过力量体系",
          text: "用户曾在世界观设定里改过力量体系，并要求后续章节保持一致。",
          type: "experience",
          context: "作品设定",
          entities: ["力量体系"],
          tags: ["设定"],
          occurred_at: "2026-09-02T14:20:00Z",
          document_id: null
        },
        {
          id: "example-observation",
          label: "近期更常从细纲开始",
          text: "最近几次打开作品后，用户会先查看细纲再进入正文。",
          type: "observation",
          context: "使用习惯",
          entities: [],
          tags: ["工作流"],
          occurred_at: "2026-09-03T08:12:00Z",
          document_id: null
        },
        {
          id: "example-world-2",
          label: "不希望助手改写未确认的正文",
          text: "在确认前，助手不应改写已经存在的章节正文。",
          type: "world",
          context: "助手对话",
          entities: ["正文"],
          tags: ["边界"],
          occurred_at: null,
          document_id: null
        },
        {
          id: "example-unknown",
          label: "还想保留一个本地对照样本",
          text: "这条只用于检查星图在空记忆时的视觉效果，不是真实记忆。",
          type: "unknown",
          context: "",
          entities: [],
          tags: [],
          occurred_at: null,
          document_id: "example-doc"
        }
      ],
      links: [
        { source: "example-world", target: "example-experience", type: "semantic", weight: 0.8 },
        { source: "example-experience", target: "example-observation", type: "temporal", weight: 0.6 },
        { source: "example-world", target: "example-world-2", type: "entity", weight: 0.7 },
        { source: "example-observation", target: "example-unknown", type: "causal", weight: 0.4 }
      ],
      truncated: false
    };
  }

  function filterNodes(nodes, query, type) {
    const term = String(query || "").trim().toLocaleLowerCase();
    return (nodes || []).filter(function (node) {
      if (type && node.type !== type) return false;
      return !term || [node.label, node.text, node.context, ...(node.entities || []), ...(node.tags || [])]
        .join(" ").toLocaleLowerCase().includes(term);
    });
  }

  function isAbortError(error) {
    if (!error) return false;
    if (error.name === "AbortError") return true;
    const message = String(error.message || "");
    return message === "Aborted" || /aborted|abort/i.test(error.name || "");
  }

  function loadErrorKind(error) {
    if (isAbortError(error)) return "aborted";
    const status = error && error.status;
    if (status === 401) return "auth";
    if (status === 403) return "forbidden";
    return "unavailable";
  }

  function edgeStyle(count, zoom, focused, all) {
    const density = Math.max(0.35, Math.min(1, Math.sqrt(700 / Math.max(1, count))));
    return focused ? { alpha: 0.38, width: 0.75 }
      : { alpha: (0.06 + Math.min(Math.max(0, zoom) * 0.04, 0.1)) * (all ? density : 1.4), width: 0.4 };
  }

  return {
    edgeStyle,
    GRAPH_PATH: GRAPH_PATH,
    GRAPH_LIMIT_DEFAULT: GRAPH_LIMIT_DEFAULT,
    GRAPH_LIMIT_MIN: GRAPH_LIMIT_MIN,
    GRAPH_LIMIT_MAX: GRAPH_LIMIT_MAX,
    NODE_TYPES: NODE_TYPES,
    LINK_TYPES: LINK_TYPES,
    UPSTREAM_PIN: UPSTREAM_PIN,
    clampLimit: clampLimit,
    graphRequestPath: graphRequestPath,
    sanitizeText: sanitizeText,
    normalizeNode: normalizeNode,
    normalizeLink: normalizeLink,
    normalizeGraph: normalizeGraph,
    pairLinks, overviewLinks, neighbors, visibleLinks, placeLabels, updateLabels, zoomAt, directionalNode,
    compactLabel, curveControl, previewPosition,
    layoutGraph: layoutGraph,
    fitZoom: fitZoom,
    screenPosition: screenPosition,
    hitTest: hitTest,
    nodeRadius: nodeRadius,
    prefersReducedMotion: prefersReducedMotion,
    exampleGraph: exampleGraph,
    filterNodes: filterNodes,
    isAbortError: isAbortError,
    loadErrorKind: loadErrorKind
  };
});
