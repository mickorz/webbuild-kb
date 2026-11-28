{
/* Adapted from Hindsight constellation canvas interaction at
   https://github.com/vectorize-io/hindsight
   commit 92f433c90409636804c0797071a4abbe141f76c5 (0.8.4).
   Original: hindsight-control-plane/src/components/constellation.tsx
   Licensed under the MIT License. See vendor/hindsight-constellation.NOTICE. */
(function () {
  const Core = window.AssistantMemoryGraphCore;
  const Text = window.AssistantMemoryTextCore;
  const MemoryTextEditor = window.AssistantMemoryTextEditor;
  const useState = React.useState;
  const useEffect = React.useEffect;
  const useMemo = React.useMemo;
  const useRef = React.useRef;
  const useCallback = React.useCallback;
  const TYPE_TOKEN = {
    world: "--gold-deep",
    experience: "--sage",
    observation: "--slate",
    unknown: "--ink-3"
  };
  function copyFor(lang) {
    const en = lang === "en";
    return {
      en: en,
      links: {
        semantic: en ? "Similar content" : "内容相近",
        temporal: en ? "Time" : "时间关联",
        entity: en ? "Shared entity" : "共同实体",
        causal: en ? "Cause and effect" : "因果关联",
        unknown: en ? "Other" : "其他关联"
      },
      keyEdges: en ? "Key links" : "主要连线",
      fullEdges: en ? "All links" : "全部连线",
      edgeHelp: en ? "Toggle all or key links" : "切换全部或主要连线",
      listView: en ? "List view" : "列表视图",
      closeDetails: en ? "Close details" : "关闭详情",
      stats: en ? "Map statistics" : "星图信息",
      totalCount: n => en ? `${n} loaded` : `${n} 条记忆`,
      inView: n => en ? `${n} visible` : `${n} 条可见`,
      labelCount: n => en ? `${n} labels` : `${n} 个标签`,
      linkCount: n => en ? `${n} links` : `${n} 条连线`,
      relatedCount: n => en ? `${n} related` : `${n} 条关联`,
      zoomLevel: en ? "Zoom" : "缩放",
      legend: {
        semantic: en ? "Semantic" : "语义",
        temporal: en ? "Time" : "时间",
        entity: en ? "Entity" : "实体",
        causal: en ? "Causal" : "因果",
        unknown: en ? "Other" : "其他"
      },
      zoom: en ? "Map navigation" : "星图导航",
      zoomIn: en ? "Zoom in" : "放大",
      zoomOut: en ? "Zoom out" : "缩小",
      fullscreen: en ? "Fullscreen" : "全屏",
      exitFullscreen: en ? "Exit fullscreen" : "退出全屏",
      refreshing: en ? "Refreshing" : "刷新中",
      refreshFailed: en ? "Refresh failed. Previously loaded memories are still shown." : "刷新失败，当前保留上次加载的记忆。",
      loadMore: en ? "Load more" : "加载更多",
      locate: en ? "Locate" : "在星图定位",
      related: en ? "Related memories" : "关联记忆",
      noRelated: en ? "No direct relationships in the current view." : "当前筛选下没有直接关联。",
      collapse: en ? "Show less" : "收起",
      moreRelated: en ? "Show all related" : "查看全部关联",
      selectionFiltered: en ? "The selected memory is hidden by filters." : "当前选中的记忆已被筛选隐藏。",
      topics: en ? "Explore topics" : "按主题浏览",
      recent: en ? "Recent memories" : "最近记忆",
      title: en ? "Memory" : "记忆",
      graph: en ? "Graph" : "星图",
      list: en ? "List" : "列表",
      view: en ? "Memory view" : "记忆显示方式",
      refresh: en ? "Refresh" : "刷新",
      search: en ? "Search loaded memories" : "搜索已加载的记忆",
      allTypes: en ? "All" : "全部",
      noMatches: en ? "No matching memories." : "没有匹配的记忆。",
      clear: en ? "Clear filters" : "清除筛选",
      select: en ? "Memory item" : "记忆条目",
      content: en ? "Content" : "内容",
      involving: en ? "Involving" : "涉及对象",
      when: en ? "When" : "发生时间",
      loading: en ? "Loading memory" : "正在读取记忆",
      empty: en ? "No memory to show yet." : "还没有可显示的记忆。",
      exampleAction: en ? "View example" : "查看示例",
      exampleBadge: en ? "Example · not your memory" : "示例 · 不属于你的记忆",
      exampleExit: en ? "Back to my memory" : "返回我的记忆",
      truncated: en ? "Showing part of your memory." : "仅显示部分记忆。",
      retry: en ? "Retry" : "重试",
      disabled: en ? "An administrator has not enabled the assistant." : "管理员尚未开放助手。",
      unavailable: en ? "Memory could not be loaded. Try again later." : "记忆暂时无法读取，请稍后重试。",
      forbidden: en ? "You do not have access to this memory." : "暂无权限读取记忆。",
      auth: en ? "Sign in again to view memory." : "请重新登录后再查看记忆。",
      invalid: en ? "Memory could not be loaded. Try again later." : "记忆暂时无法读取，请稍后重试。",
      noneSelected: en ? "Select an item to read it." : "选一项即可阅读。",
      type: en ? "Type" : "类型",
      context: en ? "Source" : "来源",
      occurred: en ? "When" : "时间",
      fit: en ? "Fit all" : "回到全图",
      gesture: en ? "Scroll to zoom · drag to pan" : "滚动缩放 · 拖动平移",
      entities: en ? "Entities" : "实体",
      tags: en ? "Tags" : "标签",
      types: {
        world: en ? "Facts" : "事实",
        experience: en ? "Experience" : "经历",
        observation: en ? "Observation" : "观察",
        unknown: en ? "Unclassified" : "未分类"
      }
    };
  }
  function tokenColor(name, fallback) {
    try {
      const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return value || fallback;
    } catch (_) {
      return fallback;
    }
  }
  function graphColors() {
    return {
      font: "12px " + tokenColor("--sans", "system-ui, sans-serif"),
      paper: tokenColor("--paper", "#FEFCF8"),
      ink: tokenColor("--ink", "#221D16"),
      ink2: tokenColor("--ink-2", "#5E5447"),
      ink3: tokenColor("--ink-3", "#938979"),
      line: tokenColor("--line", "rgba(34,29,22,.10)"),
      gold: tokenColor("--gold-deep", "#b8862a"),
      links: {
        semantic: tokenColor("--slate", "#5a6d86"),
        temporal: tokenColor("--sage", "#4a7a58"),
        entity: tokenColor("--gold-deep", "#b8862a"),
        causal: tokenColor("--terra", "#bd664a"),
        unknown: tokenColor("--ink-3", "#938979")
      },
      world: tokenColor(TYPE_TOKEN.world, "#b8862a"),
      experience: tokenColor(TYPE_TOKEN.experience, "#4a7a58"),
      observation: tokenColor(TYPE_TOKEN.observation, "#5a6d86"),
      unknown: tokenColor(TYPE_TOKEN.unknown, "#938979")
    };
  }
  function lerp(from, to, amount) {
    return from + (to - from) * amount;
  }
  function cameraMoving(s) {
    return Math.abs(s.panX - s.targetPanX) > 0.05 || Math.abs(s.panY - s.targetPanY) > 0.05 || Math.abs(s.zoom - s.targetZoom) > 0.002;
  }
  function formatOccurredAt(value, lang) {
    if (!value) return "";
    const stamp = Date.parse(value);
    if (!Number.isFinite(stamp)) return String(value).slice(0, 16).replace("T", " ");
    try {
      return new Intl.DateTimeFormat(lang === "en" ? "en" : "zh-CN", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(stamp));
    } catch (_) {
      return String(value).slice(0, 16).replace("T", " ");
    }
  }
  function nodeColor(type, colors) {
    if (type === "world") return colors.world;
    if (type === "experience") return colors.experience;
    if (type === "observation") return colors.observation;
    return colors.unknown;
  }
  function positionPreview(element, preview) {
    if (!element || !preview) return;
    element.style.transform = `translate3d(${preview.x.toFixed(2)}px, ${preview.y.toFixed(2)}px, 0)`;
    element.style.width = preview.width + "px";
    element.style.maxHeight = preview.maxHeight + "px";
  }
  function AssistantMemoryGraphCanvas({
    graph,
    selectedId,
    onSelect,
    reducedMotion,
    resetKey,
    active = true,
    visibleIds,
    allLinks = true,
    command,
    lang = "zh",
    onPreview,
    onViewChange,
    previewElementRef
  }) {
    const canvasRef = useRef(null);
    const layout = useMemo(() => Core.layoutGraph(graph), [graph]);
    const visible = useMemo(() => visibleIds || new Set(layout.nodes.map(n => n.id)), [visibleIds, layout]);
    const propsRef = useRef({});
    propsRef.current = {
      layout,
      visible,
      selectedId,
      onSelect,
      allLinks,
      lang,
      onPreview,
      onViewChange,
      previewElementRef
    };
    const stateRef = useRef({
      panX: 0,
      panY: 0,
      zoom: 1,
      width: 0,
      height: 0,
      dpr: 1,
      targetPanX: 0,
      targetPanY: 0,
      targetZoom: 1,
      hoverId: null,
      keyboardId: null,
      pointer: null,
      pointers: new Map(),
      gesture: null,
      moved: false
    });
    const activeRef = useRef(active);
    activeRef.current = active;
    const frameRef = useRef(0);
    const previewFrameRef = useRef(0);
    const reducedRef = useRef(reducedMotion);
    reducedRef.current = reducedMotion;
    const colorsRef = useRef(null);
    if (!colorsRef.current) colorsRef.current = graphColors();
    const edgesRef = useRef({});
    const labelsRef = useRef({}),
      labelTimerRef = useRef(0);
    const telemetryRef = useRef({
      previewNode: null,
      previewSide: null,
      view: "",
      viewAt: 0
    });
    const hoverTimersRef = useRef({
      open: 0,
      close: 0,
      candidate: null
    });
    const cancelHoverTimers = useCallback(() => {
      const timers = hoverTimersRef.current;
      clearTimeout(timers.open);
      clearTimeout(timers.close);
      timers.open = timers.close = 0;
      timers.candidate = null;
    }, []);
    const draw = useCallback(() => {
      frameRef.current = 0;
      const canvas = canvasRef.current;
      if (!canvas || !activeRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const s = stateRef.current,
        p = propsRef.current,
        colors = colorsRef.current;
      if (s.width < 24 || s.height < 24) return;
      const amount = reducedRef.current || s.pointers.size ? 1 : 0.3;
      s.panX = lerp(s.panX, s.targetPanX, amount);
      s.panY = lerp(s.panY, s.targetPanY, amount);
      s.zoom = lerp(s.zoom, s.targetZoom, amount);
      const moving = cameraMoving(s),
        now = Date.now();
      if (!moving) {
        s.panX = s.targetPanX;
        s.panY = s.targetPanY;
        s.zoom = s.targetZoom;
      }
      const focusId = s.hoverId || s.keyboardId || p.selectedId;
      const nodes = p.layout.nodes.filter(n => p.visible.has(n.id));
      const cache = edgesRef.current;
      if (cache.layout !== p.layout || cache.visible !== p.visible || cache.focusId !== focusId || cache.all !== p.allLinks) {
        const pairs = Core.visibleLinks(p.layout, p.visible, focusId, "", p.allLinks);
        edgesRef.current = {
          layout: p.layout,
          visible: p.visible,
          focusId,
          all: p.allLinks,
          links: pairs.flatMap(link => link.types.map(type => ({
            ...link,
            type
          })))
        };
      }
      const links = edgesRef.current.links;
      const neighbors = new Set();
      if (focusId) links.forEach(l => {
        neighbors.add(l.source);
        neighbors.add(l.target);
      });
      const points = new Map(nodes.map(n => [n.id, Core.screenPosition(n, s)]));
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, s.width, s.height);
      ctx.globalAlpha = 1;
      ctx.fillStyle = colors.paper;
      ctx.fillRect(0, 0, s.width, s.height);
      const edgeStyle = Core.edgeStyle(links.length, s.zoom, !!focusId, p.allLinks);
      links.forEach(link => {
        const a = points.get(link.source),
          b = points.get(link.target);
        if (!a || !b) return;
        ctx.globalAlpha = edgeStyle.alpha;
        ctx.strokeStyle = colors.links[link.type] || colors.links.unknown;
        ctx.lineWidth = edgeStyle.width;
        const control = Core.curveControl(a, b, link.type);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(control.x, control.y, b.x, b.y);
        ctx.stroke();
      });
      nodes.forEach(node => {
        const point = points.get(node.id),
          selected = node.id === p.selectedId;
        const focused = node.id === focusId;
        const faded = focusId && !focused && !neighbors.has(node.id);
        const r = Core.nodeRadius(node.linkCount, s.zoom);
        ctx.globalAlpha = faded ? 0.2 : 1;
        if (selected || focused) {
          ctx.globalAlpha = 0.13;
          ctx.fillStyle = colors.gold;
          ctx.beginPath();
          ctx.arc(point.x, point.y, r + 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = nodeColor(node.type, colors);
        ctx.beginPath();
        ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.font = colors.font;
      const ordered = [...nodes].sort((a, b) => {
        const priority = n => n.id === focusId ? 10000 : n.id === p.selectedId ? 9000 : neighbors.has(n.id) ? 1000 + n.linkCount : n.linkCount;
        return priority(b) - priority(a) || a.id.localeCompare(b.id);
      });
      const candidates = ordered.filter(n => !focusId || n.id === focusId || n.id === p.selectedId || neighbors.has(n.id)).map(n => {
        const point = points.get(n.id),
          text = Core.compactLabel(n.label);
        return {
          ...point,
          id: n.id,
          text,
          width: ctx.measureText(text).width + 10
        };
      });
      const context = [p.layout, p.visible, focusId, s.width, s.height];
      if (!labelsRef.current.context || context.some((value, i) => value !== labelsRef.current.context[i])) labelsRef.current = {
        context
      };
      const labelFrame = Core.updateLabels(labelsRef.current, candidates, s.width, s.height, {
        moving: moving || s.pointers.size > 0 || !!labelTimerRef.current,
        camera: [s.panX, s.panY, s.zoom].join(','),
        now,
        reducedMotion: reducedRef.current,
        limit: Math.max(5, Math.min(24, Math.floor(s.width * s.height / 35000)))
      });
      const labels = labelFrame.labels;
      labels.forEach(label => {
        ctx.globalAlpha = 0.94 * label.opacity;
        ctx.fillStyle = colors.paper;
        ctx.fillRect(label.x, label.y, label.width, label.height);
        ctx.globalAlpha = label.opacity;
        ctx.fillStyle = label.id === focusId ? colors.ink : colors.ink2;
        ctx.textBaseline = "middle";
        ctx.fillText(label.text, label.x + 5, label.y + 11, label.width - 10);
      });
      ctx.globalAlpha = 1;
      // Camera movement only changes the tooltip transform, never React content.
      const previewNode = !s.pointers.size && nodes.find(n => n.id === (s.hoverId || s.keyboardId));
      const point = previewNode && (s.hoverId && s.pointer || points.get(previewNode.id));
      const side = telemetryRef.current.previewSide;
      const preview = point && point.x >= 0 && point.x <= s.width && point.y >= 0 && point.y <= s.height ? {
        node: previewNode,
        ...Core.previewPosition(point, s.width, s.height, side)
      } : null;
      const element = p.previewElementRef?.current;
      if (element?.dataset.nodeId === preview?.node.id) positionPreview(element, preview);
      if (telemetryRef.current.previewNode !== (preview?.node || null)) {
        telemetryRef.current.previewNode = preview?.node || null;
        telemetryRef.current.previewSide = preview?.side || null;
        p.onPreview?.(preview);
      }
      const view = {
        visible: nodes.filter(n => {
          const pt = points.get(n.id);
          return pt.x >= 0 && pt.x <= s.width && pt.y >= 0 && pt.y <= s.height;
        }).length,
        labels: labels.length,
        links: links.length,
        zoom: Number(s.zoom.toFixed(2)),
        types: Core.LINK_TYPES.filter(type => links.some(link => link.type === type))
      };
      const viewKey = JSON.stringify(view);
      if (telemetryRef.current.view !== viewKey && (!moving && !s.pointers.size || !telemetryRef.current.view || now - telemetryRef.current.viewAt >= 100)) {
        telemetryRef.current.view = viewKey;
        telemetryRef.current.viewAt = now;
        p.onViewChange?.(view);
      }
      if (moving && !reducedRef.current || labelFrame.animating) frameRef.current = requestAnimationFrame(draw);
    }, []);
    const requestDraw = useCallback(() => {
      if (!frameRef.current && activeRef.current) frameRef.current = requestAnimationFrame(draw);
    }, [draw]);
    const movePreview = useCallback(() => {
      if (previewFrameRef.current || !activeRef.current) return;
      previewFrameRef.current = requestAnimationFrame(() => {
        previewFrameRef.current = 0;
        const s = stateRef.current,
          t = telemetryRef.current,
          element = propsRef.current.previewElementRef?.current;
        if (!activeRef.current || s.pointers.size || !s.hoverId || !s.pointer || element?.dataset.nodeId !== s.hoverId) return;
        positionPreview(element, Core.previewPosition(s.pointer, s.width, s.height, t.previewSide));
      });
    }, []);
    const fit = useCallback(() => {
      cancelHoverTimers();
      clearTimeout(labelTimerRef.current);
      labelTimerRef.current = 0;
      const s = stateRef.current,
        nodes = propsRef.current.layout.nodes.filter(n => propsRef.current.visible.has(n.id));
      const zoom = Core.fitZoom({
        nodes
      }, s.width, s.height);
      const cx = nodes.length ? (Math.min(...nodes.map(n => n.wx)) + Math.max(...nodes.map(n => n.wx))) / 2 : 0;
      const cy = nodes.length ? (Math.min(...nodes.map(n => n.wy)) + Math.max(...nodes.map(n => n.wy))) / 2 : 0;
      s.targetZoom = zoom;
      s.targetPanX = -cx * zoom;
      s.targetPanY = -cy * zoom;
      s.hoverId = null;
      s.keyboardId = null;
      requestDraw();
    }, [requestDraw, cancelHoverTimers]);
    const zoom = useCallback((factor, x, y) => {
      cancelHoverTimers();
      clearTimeout(labelTimerRef.current);
      labelTimerRef.current = setTimeout(() => {
        labelTimerRef.current = 0;
        requestDraw();
      }, 140);
      const s = stateRef.current;
      s.hoverId = null;
      s.keyboardId = null;
      const next = Core.zoomAt({
        ...s,
        panX: s.targetPanX,
        panY: s.targetPanY,
        zoom: s.targetZoom
      }, s.targetZoom * factor, x == null ? s.width / 2 : x, y == null ? s.height / 2 : y);
      s.targetZoom = next.zoom;
      s.targetPanX = next.panX;
      s.targetPanY = next.panY;
      requestDraw();
    }, [requestDraw, cancelHoverTimers]);
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !active) return undefined;
      const s = stateRef.current;
      const resize = () => {
        cancelHoverTimers();
        const rect = canvas.getBoundingClientRect(),
          first = !s.width || !s.height;
        s.width = rect.width;
        s.height = rect.height;
        s.dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.floor(s.width * s.dpr));
        canvas.height = Math.max(1, Math.floor(s.height * s.dpr));
        if (first) {
          fit();
          s.zoom = s.targetZoom;
          s.panX = s.targetPanX;
          s.panY = s.targetPanY;
        }
        requestDraw();
      };
      resize();
      const themeChanged = () => {
        colorsRef.current = graphColors();
        requestDraw();
      };
      const theme = new MutationObserver(themeChanged);
      theme.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"]
      });
      const media = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
      const onMotion = () => {
        reducedRef.current = Core.prefersReducedMotion();
        requestDraw();
      };
      if (media?.addEventListener) media.addEventListener("change", onMotion);
      const position = event => {
        const r = canvas.getBoundingClientRect();
        return {
          x: event.clientX - r.left,
          y: event.clientY - r.top
        };
      };
      const at = point => {
        const p = propsRef.current,
          i = Core.hitTest(p.layout, s, point.x, point.y, p.visible);
        return i < 0 ? null : p.layout.nodes[i].id;
      };
      const commitHover = id => {
        cancelHoverTimers();
        if (s.hoverId === id && !s.keyboardId) return;
        s.hoverId = id;
        s.keyboardId = null;
        requestDraw();
      };
      const queueHover = id => {
        const timers = hoverTimersRef.current;
        if (id && id === s.hoverId) {
          cancelHoverTimers();
          return;
        }
        if (!id) {
          clearTimeout(timers.open);
          timers.open = 0;
          timers.candidate = null;
          if (timers.close || !s.hoverId && !s.keyboardId) return;
          // Keep a short gap between nearby nodes from flashing the card closed.
          timers.close = setTimeout(() => commitHover(null), 150);
        } else {
          // Intent applies only on entry; continuous exploration updates on the next frame.
          if (s.hoverId || s.keyboardId) {
            commitHover(id);
            return;
          }
          clearTimeout(timers.close);
          timers.close = 0;
          if (timers.candidate === id) return;
          clearTimeout(timers.open);
          timers.candidate = id;
          timers.open = setTimeout(() => commitHover(id), 70);
        }
      };
      const onWheel = event => {
        event.preventDefault();
        const p = position(event);
        s.hoverId = null;
        zoom(Math.exp(-Math.max(-120, Math.min(120, event.deltaY)) * 0.003), p.x, p.y);
      };
      const startGesture = () => {
        const points = [...s.pointers.values()];
        s.gesture = points.length >= 2 ? {
          kind: "pinch",
          a: points[0],
          b: points[1],
          panX: s.panX,
          panY: s.panY,
          zoom: s.zoom
        } : {
          kind: "pan",
          a: points[0],
          panX: s.panX,
          panY: s.panY,
          zoom: s.zoom
        };
      };
      const onDown = event => {
        if (event.button != null && event.button !== 0) return;
        const point = position(event);
        canvas.focus?.({
          preventScroll: true
        });
        s.pointers.set(event.pointerId, point);
        if (s.pointers.size === 1) {
          s.targetZoom = s.zoom;
          s.targetPanX = s.panX;
          s.targetPanY = s.panY;
          s.moved = false;
          s.downId = at(point);
          s.origin = point;
        } else s.moved = true;
        cancelHoverTimers();
        s.hoverId = null;
        s.keyboardId = null;
        startGesture();
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch (_) {}
        canvas.style.cursor = "grabbing";
        requestDraw();
      };
      const onMove = event => {
        const point = position(event);
        if (s.pointers.has(event.pointerId)) {
          s.pointers.set(event.pointerId, point);
          const g = s.gesture,
            points = [...s.pointers.values()];
          if (g.kind === "pinch" && points.length >= 2) {
            const oldMid = {
              x: (g.a.x + g.b.x) / 2,
              y: (g.a.y + g.b.y) / 2
            };
            const mid = {
              x: (points[0].x + points[1].x) / 2,
              y: (points[0].y + points[1].y) / 2
            };
            const ratio = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) / Math.max(1, Math.hypot(g.a.x - g.b.x, g.a.y - g.b.y));
            const next = Core.zoomAt({
              ...s,
              ...g
            }, g.zoom * ratio, oldMid.x, oldMid.y);
            s.targetZoom = next.zoom;
            s.targetPanX = next.panX + mid.x - oldMid.x;
            s.targetPanY = next.panY + mid.y - oldMid.y;
          } else {
            s.targetPanX = g.panX + point.x - g.a.x;
            s.targetPanY = g.panY + point.y - g.a.y;
            if (Math.hypot(point.x - s.origin.x, point.y - s.origin.y) > 4) s.moved = true;
          }
        } else {
          if (labelTimerRef.current || cameraMoving(s)) return;
          let id = at(point);
          // A slightly wider exit radius prevents chatter at the hit boundary.
          const held = !id && propsRef.current.layout.nodes.find(n => n.id === s.hoverId && propsRef.current.visible.has(n.id));
          if (held) {
            const anchor = Core.screenPosition(held, s);
            if (Math.hypot(point.x - anchor.x, point.y - anchor.y) < 22) id = held.id;
          }
          // Follow within the hit area; do not drag the previous node's card across empty space.
          if (id) {
            s.pointer = point;
            if (id === s.hoverId) movePreview();
          }
          queueHover(id);
          canvas.style.cursor = id ? "pointer" : "grab";
          return;
        }
        requestDraw();
      };
      const onUp = event => {
        if (!s.pointers.has(event.pointerId)) return;
        const point = position(event);
        const tapped = !s.moved && event.type !== "pointercancel" && s.pointers.size === 1 && Math.hypot(point.x - s.origin.x, point.y - s.origin.y) < 4;
        s.pointers.delete(event.pointerId);
        if (tapped && at(point) === s.downId) propsRef.current.onSelect?.(s.downId);
        if (s.pointers.size) {
          s.moved = true;
          startGesture();
        } else {
          s.gesture = null;
          s.hoverId = null;
        }
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch (_) {}
        canvas.style.cursor = "grab";
        requestDraw();
      };
      const onLeave = event => {
        if (event?.type === "blur" || !s.pointers.size) commitHover(null);
      };
      const onKey = event => {
        cancelHoverTimers();
        const p = propsRef.current;
        if (event.key.startsWith("Arrow")) {
          event.preventDefault();
          const node = Core.directionalNode(p.layout.nodes.filter(n => p.visible.has(n.id)), s.keyboardId || p.selectedId, event.key);
          if (node) {
            s.keyboardId = node.id;
            s.hoverId = null;
            canvas.setAttribute?.("aria-label", node.label + (p.lang === "en" ? ". Enter to read; arrow keys to explore." : "。回车阅读，方向键继续探索。"));
            s.targetPanX = -node.wx * s.targetZoom;
            s.targetPanY = -node.wy * s.targetZoom;
          }
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const id = s.keyboardId || p.selectedId || p.layout.nodes.find(n => p.visible.has(n.id))?.id;
          if (id) p.onSelect?.(id);
        } else if (event.key === "Home" || event.key === "0") {
          event.preventDefault();
          fit();
        } else if (event.key === "+" || event.key === "=") {
          event.preventDefault();
          zoom(1.25);
        } else if (event.key === "-") {
          event.preventDefault();
          zoom(0.8);
        } else if (event.key === "Escape") {
          s.keyboardId = null;
          s.hoverId = null;
          p.onSelect?.(null);
        }
        requestDraw();
      };
      const listeners = {
        wheel: onWheel,
        pointerdown: onDown,
        pointermove: onMove,
        pointerup: onUp,
        pointercancel: onUp,
        pointerleave: onLeave,
        keydown: onKey,
        blur: onLeave
      };
      Object.entries(listeners).forEach(([name, fn]) => canvas.addEventListener(name, fn, name === "wheel" ? {
        passive: false
      } : undefined));
      const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
      observer?.observe(canvas);
      window.addEventListener("resize", resize);
      window.addEventListener("blur", onLeave);
      return () => {
        cancelHoverTimers();
        clearTimeout(labelTimerRef.current);
        labelTimerRef.current = 0;
        labelsRef.current = {};
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        if (previewFrameRef.current) cancelAnimationFrame(previewFrameRef.current);
        previewFrameRef.current = 0;
        frameRef.current = 0;
        s.pointers.clear();
        s.gesture = null;
        s.hoverId = null;
        s.keyboardId = null;
        telemetryRef.current.previewNode = null;
        propsRef.current.onPreview?.(null);
        theme.disconnect();
        observer?.disconnect();
        media?.removeEventListener?.("change", onMotion);
        window.removeEventListener("resize", resize);
        window.removeEventListener("blur", onLeave);
        Object.entries(listeners).forEach(([name, fn]) => canvas.removeEventListener(name, fn));
      };
    }, [active, fit, zoom, requestDraw, movePreview, cancelHoverTimers]);
    useEffect(() => {
      fit();
    }, [layout, resetKey, fit]);
    useEffect(() => {
      cancelHoverTimers();
      edgesRef.current = {};
      stateRef.current.hoverId = null;
      stateRef.current.keyboardId = null;
      requestDraw();
    }, [visible, selectedId, allLinks, requestDraw, cancelHoverTimers]);
    useEffect(() => {
      if (!command) return;
      if (command.type === "in") zoom(1.25);else if (command.type === "out") zoom(0.8);else if (command.type === "fit") fit();else if (command.type === "dismiss-preview") {
        cancelHoverTimers();
        stateRef.current.hoverId = null;
        stateRef.current.keyboardId = null;
        requestDraw();
      } else if (command.type === "focus") {
        cancelHoverTimers();
        const s = stateRef.current,
          node = layout.nodes.find(n => n.id === command.id);
        if (node) {
          s.targetZoom = Math.max(s.zoom, 1.1);
          s.targetPanX = -node.wx * s.targetZoom;
          s.targetPanY = -node.wy * s.targetZoom;
          requestDraw();
        }
      }
    }, [command, layout, zoom, fit, requestDraw, cancelHoverTimers]);
    return /*#__PURE__*/React.createElement("canvas", {
      ref: canvasRef,
      className: "asst-memory-canvas",
      tabIndex: 0,
      role: "img",
      "aria-label": lang === "en" ? "Memory map. Arrow keys explore, Enter selects, plus or minus zooms, Home fits all." : "记忆星图。方向键探索，回车选中，加减键缩放，Home 回到全图。"
    });
  }
  function DetailRow({
    label,
    children
  }) {
    if (children == null || children === "") return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-detail__row"
    }, /*#__PURE__*/React.createElement("dt", null, label), /*#__PURE__*/React.createElement("dd", null, children));
  }
  function ChipList({
    items,
    kind
  }) {
    if (!items || !items.length) return null;
    return /*#__PURE__*/React.createElement("ul", {
      className: "asst-memory-chips asst-memory-chips--" + kind
    }, items.map(function (item) {
      return /*#__PURE__*/React.createElement("li", {
        key: item
      }, item);
    }));
  }
  function MemoryDetails({
    node,
    copy
  }) {
    if (!node) {
      return /*#__PURE__*/React.createElement("p", {
        className: "asst-memory-detail__empty"
      }, copy.noneSelected);
    }
    const fields = node.display || Text.present(node.text || node.label, node.entities);
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-detail__list"
    }, /*#__PURE__*/React.createElement("dl", {
      className: "asst-memory-detail__list"
    }, /*#__PURE__*/React.createElement(DetailRow, {
      label: copy.content
    }, /*#__PURE__*/React.createElement("p", {
      className: "asst-memory-detail__text"
    }, fields.content)), /*#__PURE__*/React.createElement(DetailRow, {
      label: copy.involving
    }, fields.involving), /*#__PURE__*/React.createElement(DetailRow, {
      label: copy.when
    }, fields.when), /*#__PURE__*/React.createElement(DetailRow, {
      label: copy.type
    }, copy.types[node.type] || copy.types.unknown), /*#__PURE__*/React.createElement(DetailRow, {
      label: copy.context
    }, node.context), !fields.when ? /*#__PURE__*/React.createElement(DetailRow, {
      label: copy.occurred
    }, formatOccurredAt(node.occurred_at, copy.en ? "en" : "zh")) : null, fields.entities.length ? /*#__PURE__*/React.createElement(DetailRow, {
      label: copy.entities
    }, /*#__PURE__*/React.createElement(ChipList, {
      items: fields.entities,
      kind: "entity"
    })) : null, /*#__PURE__*/React.createElement(DetailRow, {
      label: copy.tags
    }, /*#__PURE__*/React.createElement(ChipList, {
      items: node.tags,
      kind: "tag"
    }))));
  }

  // Canvas telemetry belongs to these small leaves, not the searchable list/detail panel.
  function useCanvasSnapshot(updateRef) {
    const [snapshot, setSnapshot] = useState(null);
    React.useLayoutEffect(() => {
      updateRef.current = setSnapshot;
      return () => {
        updateRef.current = null;
      };
    }, [updateRef]);
    return snapshot;
  }
  function MemoryPreview({
    copy,
    elementRef,
    updateRef,
    visibleIds
  }) {
    const snapshot = useCanvasSnapshot(updateRef);
    const preview = snapshot && visibleIds.has(snapshot.node.id) ? snapshot : null;
    const retained = useRef(null);
    if (preview) retained.current = preview.node;
    const node = retained.current;
    const fields = useMemo(() => node && (node.display || Text.present(node.text || node.label, node.entities)), [node]);
    // Commit new content and its initial position together, before paint.
    React.useLayoutEffect(() => {
      positionPreview(elementRef.current, preview);
    }, [preview, elementRef]);
    return /*#__PURE__*/React.createElement("div", {
      ref: elementRef,
      className: "asst-memory-popover",
      role: "tooltip",
      "data-open": !!preview,
      "data-node-id": node?.id,
      "aria-hidden": !preview
    }, node ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-popover-head"
    }, /*#__PURE__*/React.createElement("strong", null, copy.types[node.type]), /*#__PURE__*/React.createElement("span", null, copy.relatedCount(node.linkCount))), /*#__PURE__*/React.createElement("p", null, Core.compactLabel(fields.content, 180)), fields.involving ? /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-popover-meta"
    }, /*#__PURE__*/React.createElement("span", null, copy.involving), /*#__PURE__*/React.createElement("span", null, Core.compactLabel(fields.involving, 48))) : null, fields.when ? /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-popover-meta"
    }, /*#__PURE__*/React.createElement("span", null, copy.when), /*#__PURE__*/React.createElement("span", null, Core.compactLabel(fields.when, 48))) : null, node.context ? /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-popover-meta"
    }, /*#__PURE__*/React.createElement("span", null, copy.context), /*#__PURE__*/React.createElement("span", null, Core.compactLabel(node.context, 48))) : null, !fields.when && node.occurred_at ? /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-popover-meta"
    }, /*#__PURE__*/React.createElement("span", null, copy.occurred), /*#__PURE__*/React.createElement("span", null, formatOccurredAt(node.occurred_at, copy.en ? "en" : "zh"))) : null, /*#__PURE__*/React.createElement(ChipList, {
      items: fields.entities.slice(0, 4),
      kind: "entity"
    })) : null);
  }
  function MemoryMapReadout({
    updateRef,
    total,
    filteredCount,
    viewMode,
    copy
  }) {
    const mapView = useCanvasSnapshot(updateRef);
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-stats"
    }, /*#__PURE__*/React.createElement("span", null, copy.totalCount(total)), /*#__PURE__*/React.createElement("span", null, copy.inView(viewMode === "graph" ? mapView?.visible ?? filteredCount : filteredCount)), viewMode === "graph" && mapView ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, copy.labelCount(mapView.labels)), /*#__PURE__*/React.createElement("span", null, copy.linkCount(mapView.links)), /*#__PURE__*/React.createElement("span", null, copy.zoomLevel, " ", mapView.zoom.toFixed(2), "\xD7")) : null), viewMode === "graph" && mapView ? /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-link-legend",
      "aria-label": copy.en ? "Relationship types (lines)" : "关联类型（连线）"
    }, Core.LINK_TYPES.filter(type => type !== "unknown" || mapView.types.includes(type)).map(type => /*#__PURE__*/React.createElement("span", {
      key: type,
      "data-link-type": type,
      "data-empty": !mapView.types.includes(type),
      title: !mapView.types.includes(type) ? copy.en ? "No links in this view" : "当前视图暂无此类连线" : copy.links[type]
    }, /*#__PURE__*/React.createElement("i", {
      "aria-hidden": "true"
    }), copy.legend[type]))) : null);
  }
  function statusCopy(kind, copy) {
    if (kind === "forbidden") return copy.forbidden;
    if (kind === "auth") return copy.auth;
    if (kind === "invalid") return copy.invalid;
    return copy.unavailable;
  }
  function AssistantMemoryGraphPanel({
    enabled,
    lang,
    active = true
  }) {
    const copy = copyFor(lang);
    const [status, setStatus] = useState(enabled ? "loading" : "disabled");
    const [graph, setGraph] = useState(null);
    const [errorKind, setErrorKind] = useState("");
    const [exampleOpen, setExampleOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [resetKey, setResetKey] = useState(0);
    const [viewMode, setViewMode] = useState("graph");
    const [query, setQuery] = useState("");
    const [filterType, setFilterType] = useState("");
    const [allLinks, setAllLinks] = useState(true);
    const [command, setCommand] = useState(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadLimit, setLoadLimit] = useState(Core.GRAPH_LIMIT_DEFAULT);
    const [showAllRelated, setShowAllRelated] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const sectionRef = useRef(null);
    const previewElementRef = useRef(null);
    const previewUpdateRef = useRef(null),
      viewUpdateRef = useRef(null);
    const setPreview = useCallback(value => previewUpdateRef.current?.(value), []);
    const setMapView = useCallback(value => viewUpdateRef.current?.(value), []);
    const graphRef = useRef(graph);
    graphRef.current = graph;
    const reducedMotion = Core.prefersReducedMotion();
    const navigate = (type, id) => setCommand(previous => ({
      type,
      id,
      sequence: (previous?.sequence || 0) + 1
    }));
    const select = id => {
      setSelectedId(id);
      setShowAllRelated(false);
    };
    const explore = id => {
      select(id);
      navigate("focus", id);
    };
    const clearFilters = () => {
      setQuery("");
      setFilterType("");
    };
    const toggleFullscreen = () => {
      if (typeof document === "undefined") return;
      const promise = document.fullscreenElement === sectionRef.current ? document.exitFullscreen?.() : sectionRef.current?.requestFullscreen?.();
      promise?.catch?.(() => {});
    };
    useEffect(() => {
      if (typeof document === "undefined" || !document.addEventListener) return undefined;
      const changed = () => setFullscreen(document.fullscreenElement === sectionRef.current);
      document.addEventListener("fullscreenchange", changed);
      return () => document.removeEventListener("fullscreenchange", changed);
    }, []);
    useEffect(() => {
      if (!enabled) {
        setStatus("disabled");
        setGraph(null);
        setExampleOpen(false);
        setSelectedId(null);
        setErrorKind("");
        setRefreshing(false);
        return undefined;
      }
      const api = window.LF_API;
      if (!api || typeof api.assistantMemoryGraph !== "function") {
        setStatus("error");
        setErrorKind("unavailable");
        setGraph(null);
        return undefined;
      }
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      let cancelled = false;
      if (!graphRef.current) setStatus("loading");
      setRefreshing(true);
      setErrorKind("");
      api.assistantMemoryGraph({
        limit: loadLimit,
        signal: controller && controller.signal
      }).then(payload => {
        if (cancelled) return;
        const normalized = Core.normalizeGraph(payload);
        if (!normalized.ok) {
          setErrorKind("invalid");
          setStatus(graphRef.current ? "ready" : "error");
          setRefreshing(false);
          return;
        }
        setGraph(normalized.graph);
        setSelectedId(prior => normalized.graph.nodes.some(n => n.id === prior) ? prior : null);
        setExampleOpen(false);
        setStatus("ready");
        setRefreshing(false);
      }).catch(error => {
        if (cancelled || Core.isAbortError(error)) return;
        setErrorKind(Core.loadErrorKind(error));
        setRefreshing(false);
        // An authorization failure must never retain the previous account's graph.
        if ([401, 403].includes(error?.status)) {
          setGraph(null);
          setSelectedId(null);
          setStatus("error");
        } else setStatus(graphRef.current ? "ready" : "error");
      });
      return () => {
        cancelled = true;
        if (controller) controller.abort();
      };
    }, [enabled, reloadKey, loadLimit]);
    const example = useMemo(() => Core.exampleGraph(), []);
    const realEmpty = status === "ready" && graph && graph.nodes.length === 0;
    const viewingExample = exampleOpen && realEmpty;
    const sourceGraph = viewingExample ? example : graph;
    const displayGraph = useMemo(() => sourceGraph && {
      ...sourceGraph,
      nodes: sourceGraph.nodes.map(node => {
        const display = Text.present(node.text || node.label, node.entities);
        return {
          ...node,
          display,
          label: Core.compactLabel(display.content, 120)
        };
      })
    }, [sourceGraph]);
    const selectedNode = displayGraph?.nodes.find(n => n.id === selectedId);
    const filteredNodes = useMemo(() => Core.filterNodes(displayGraph?.nodes, query, filterType), [displayGraph, query, filterType]);
    const visibleIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);
    const visibleSelected = visibleIds.has(selectedId) ? selectedNode : null;
    const related = useMemo(() => Core.neighbors(displayGraph, visibleSelected?.id).filter(item => visibleIds.has(item.node.id)), [displayGraph, visibleSelected, visibleIds]);
    const topics = useMemo(() => {
      const counts = new Map();
      (displayGraph?.nodes || []).forEach(node => new Set([...(node.entities || []), ...(node.tags || [])]).forEach(topic => counts.set(topic, (counts.get(topic) || 0) + 1)));
      return [...counts].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
    }, [displayGraph]);
    const recent = useMemo(() => [...filteredNodes].sort((a, b) => (Date.parse(b.occurred_at) || 0) - (Date.parse(a.occurred_at) || 0)).slice(0, 5), [filteredNodes]);
    const types = Core.NODE_TYPES.filter(type => displayGraph?.nodes.some(n => n.type === type));
    const hasData = status === "ready" && displayGraph?.nodes.length > 0;
    useEffect(() => {
      if (displayGraph && selectedId && !displayGraph.nodes.some(n => n.id === selectedId)) select(null);
    }, [displayGraph, selectedId]);
    let body = null;
    if (status === "disabled") body = /*#__PURE__*/React.createElement("p", {
      className: "asst-memory-status"
    }, copy.disabled);else if (status === "loading") body = /*#__PURE__*/React.createElement("p", {
      className: "asst-memory-status",
      "aria-live": "polite"
    }, copy.loading);else if (status === "error") body = /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-status asst-memory-status--error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("p", null, statusCopy(errorKind, copy)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => setReloadKey(n => n + 1)
    }, copy.retry));else if (realEmpty && !viewingExample) body = /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-status"
    }, /*#__PURE__*/React.createElement("p", null, copy.empty), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => {
        setExampleOpen(true);
        select(null);
      }
    }, copy.exampleAction));else if (hasData) body = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-discovery"
    }, /*#__PURE__*/React.createElement("input", {
      type: "search",
      "aria-label": copy.search,
      placeholder: copy.search,
      value: query,
      onChange: event => setQuery(event.target.value)
    }), /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-types",
      role: "group",
      "aria-label": copy.en ? "Memory types (nodes)" : "记忆类型（节点）"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      "aria-pressed": !filterType,
      onClick: () => setFilterType("")
    }, copy.allTypes), types.map(type => /*#__PURE__*/React.createElement("button", {
      key: type,
      type: "button",
      "data-type": type,
      className: "c-btn sm",
      "aria-pressed": filterType === type,
      onClick: () => setFilterType(filterType === type ? "" : type)
    }, /*#__PURE__*/React.createElement("i", {
      "aria-hidden": "true"
    }), copy.types[type]))), /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-view",
      role: "group",
      "aria-label": copy.view
    }, /*#__PURE__*/React.createElement("span", {
      "data-active": viewMode === "graph"
    }, copy.graph), /*#__PURE__*/React.createElement("label", {
      className: "set-mail-switch"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      role: "switch",
      "aria-label": copy.listView,
      checked: viewMode === "list",
      onChange: event => {
        setViewMode(event.target.checked ? "list" : "graph");
        setPreview(null);
      }
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    })), /*#__PURE__*/React.createElement("span", {
      "data-active": viewMode === "list"
    }, copy.list)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: refreshing,
      onClick: () => setReloadKey(v => v + 1)
    }, refreshing ? copy.refreshing : copy.refresh)), errorKind ? /*#__PURE__*/React.createElement("div", {
      role: "alert",
      className: "asst-memory-refresh-error"
    }, copy.refreshFailed) : null, /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-graph"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-stage"
    }, viewingExample ? /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-examplebar"
    }, /*#__PURE__*/React.createElement("span", null, copy.exampleBadge), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => {
        setExampleOpen(false);
        select(null);
      }
    }, copy.exampleExit)) : null, /*#__PURE__*/React.createElement("div", {
      hidden: viewMode !== "graph"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-toolbar"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      "aria-pressed": allLinks,
      onClick: () => setAllLinks(v => !v),
      title: copy.edgeHelp
    }, allLinks ? copy.fullEdges : copy.keyEdges), /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-camera",
      role: "group",
      "aria-label": copy.zoom
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      "aria-label": copy.zoomOut,
      title: copy.zoomOut,
      onClick: () => navigate("out")
    }, "\u2212"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      "aria-label": copy.zoomIn,
      title: copy.zoomIn,
      onClick: () => navigate("in")
    }, "+"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => {
        setResetKey(v => v + 1);
      }
    }, copy.fit), typeof document !== "undefined" && document.fullscreenEnabled ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: toggleFullscreen
    }, fullscreen ? copy.exitFullscreen : copy.fullscreen) : null)), /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-canvas-wrap"
    }, /*#__PURE__*/React.createElement(AssistantMemoryGraphCanvas, {
      active: active && viewMode === "graph",
      resetKey: resetKey,
      graph: displayGraph,
      selectedId: visibleSelected?.id || null,
      onSelect: select,
      reducedMotion: reducedMotion,
      visibleIds: visibleIds,
      allLinks: allLinks,
      command: command,
      lang: lang,
      onPreview: setPreview,
      onViewChange: setMapView,
      previewElementRef: previewElementRef
    }), active && viewMode === "graph" ? /*#__PURE__*/React.createElement(MemoryPreview, {
      visibleIds: visibleIds,
      copy: copy,
      elementRef: previewElementRef,
      updateRef: previewUpdateRef
    }) : null, !filteredNodes.length ? /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-no-matches"
    }, /*#__PURE__*/React.createElement("p", null, copy.noMatches), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: clearFilters
    }, copy.clear)) : null)), /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-list-view",
      hidden: viewMode !== "list"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-list",
      "aria-label": copy.list
    }, filteredNodes.map(node => /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn asst-memory-item",
      key: node.id,
      "aria-pressed": selectedId === node.id,
      onClick: () => select(node.id)
    }, /*#__PURE__*/React.createElement("strong", null, node.label), /*#__PURE__*/React.createElement("span", null, copy.types[node.type], node.occurred_at ? " · " + formatOccurredAt(node.occurred_at, lang) : ""))), !filteredNodes.length ? /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-no-matches"
    }, /*#__PURE__*/React.createElement("p", null, copy.noMatches), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: clearFilters
    }, copy.clear)) : null)), /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-footer",
      "aria-label": copy.stats
    }, /*#__PURE__*/React.createElement(MemoryMapReadout, {
      updateRef: viewUpdateRef,
      total: displayGraph.nodes.length,
      filteredCount: filteredNodes.length,
      viewMode: viewMode,
      copy: copy
    }), displayGraph.truncated && !viewingExample ? /*#__PURE__*/React.createElement("span", null, copy.truncated, " ", loadLimit < Core.GRAPH_LIMIT_MAX ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: refreshing,
      onClick: () => setLoadLimit(Core.GRAPH_LIMIT_MAX)
    }, copy.loadMore) : null) : null)), /*#__PURE__*/React.createElement("aside", {
      className: "asst-memory-side",
      "aria-label": copy.select
    }, visibleSelected ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-detail-head"
    }, /*#__PURE__*/React.createElement("span", null, copy.select), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => {
        setViewMode("graph");
        navigate("focus", visibleSelected.id);
      }
    }, copy.locate), !viewingExample && visibleSelected.type === "observation" ? /*#__PURE__*/React.createElement(ReadonlyMemoryEdit, {
      lang: lang
    }) : null, !viewingExample && ["world", "experience"].includes(visibleSelected.type) ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => {
        setPreview(null);
        navigate("dismiss-preview");
        setEditingId(visibleSelected.id);
      }
    }, copy.en ? "Edit" : "编辑") : null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm asst-memory-close",
      "aria-label": copy.closeDetails,
      title: copy.closeDetails,
      onClick: () => {
        select(null);
        setPreview(null);
        navigate("dismiss-preview");
      }
    }, "\xD7")), /*#__PURE__*/React.createElement("div", {
      "aria-live": "polite"
    }, /*#__PURE__*/React.createElement(MemoryDetails, {
      node: visibleSelected,
      copy: copy
    })), /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-related"
    }, /*#__PURE__*/React.createElement("h3", null, copy.related, " ", /*#__PURE__*/React.createElement("span", null, related.length)), related.length ? (showAllRelated ? related : related.slice(0, 6)).map(item => /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn asst-memory-related-item",
      key: item.node.id,
      onClick: () => explore(item.node.id)
    }, /*#__PURE__*/React.createElement("strong", null, item.node.label), /*#__PURE__*/React.createElement("span", null, item.types.map(t => copy.links[t]).join(" · ")))) : /*#__PURE__*/React.createElement("p", null, copy.noRelated), related.length > 6 ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => setShowAllRelated(v => !v)
    }, showAllRelated ? copy.collapse : copy.moreRelated) : null)) : /*#__PURE__*/React.createElement(React.Fragment, null, selectedNode ? /*#__PURE__*/React.createElement("p", {
      className: "asst-memory-selection-filtered"
    }, copy.selectionFiltered) : null, topics.length ? /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-topics"
    }, /*#__PURE__*/React.createElement("h3", null, copy.topics), /*#__PURE__*/React.createElement("div", null, topics.map(([topic, count]) => /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      key: topic,
      type: "button",
      onClick: () => {
        setQuery(topic);
        setFilterType("");
      }
    }, /*#__PURE__*/React.createElement("span", null, topic), /*#__PURE__*/React.createElement("small", null, count))))) : null, /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-related"
    }, /*#__PURE__*/React.createElement("h3", null, copy.recent), recent.map(node => /*#__PURE__*/React.createElement("button", {
      key: node.id,
      type: "button",
      className: "c-btn asst-memory-related-item",
      onClick: () => explore(node.id)
    }, /*#__PURE__*/React.createElement("strong", null, node.label), /*#__PURE__*/React.createElement("span", null, copy.types[node.type], node.occurred_at ? " · " + formatOccurredAt(node.occurred_at, lang) : ""))))))));
    return /*#__PURE__*/React.createElement("section", {
      ref: sectionRef,
      className: "asst-memory",
      "aria-labelledby": "assistant-memory-heading"
    }, /*#__PURE__*/React.createElement("h2", {
      className: "set-panel-t asst-memory-heading",
      id: "assistant-memory-heading"
    }, copy.title), !hasData && status === "ready" ? /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-empty-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: refreshing,
      onClick: () => setReloadKey(v => v + 1)
    }, refreshing ? copy.refreshing : copy.refresh)) : null, body, enabled && editingId ? /*#__PURE__*/React.createElement(MemoryTextEditor, {
      key: editingId,
      id: editingId,
      lang: lang,
      onClose: () => setEditingId(null),
      onSaved: item => {
        setGraph(prior => prior && {
          ...prior,
          nodes: prior.nodes.map(n => n.id === item.id ? {
            ...n,
            text: item.text,
            label: item.text.slice(0, 120),
            type: item.type
          } : n)
        });
        setEditingId(null);
        setReloadKey(v => v + 1);
      }
    }) : null);
  }
  function ReadonlyMemoryEdit({
    lang
  }) {
    const [dismissed, setDismissed] = useState(false);
    const label = lang === "en" ? "Edit" : "编辑";
    return /*#__PURE__*/React.createElement("span", {
      className: "asst-memory-disabled-edit",
      tabIndex: 0,
      role: "group",
      "aria-label": label,
      "aria-describedby": "assistant-memory-edit-reason",
      "data-dismissed": dismissed,
      onKeyDown: event => {
        if (event.key === "Escape") setDismissed(true);
      },
      onPointerLeave: () => setDismissed(false),
      onBlur: () => setDismissed(false)
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: true
    }, label), /*#__PURE__*/React.createElement("span", {
      id: "assistant-memory-edit-reason",
      className: "asst-memory-edit-tip",
      role: "tooltip"
    }, lang === "en" ? "Derived from facts and experiences; edit its sources to update it." : "由事实与经历归纳而来，修改来源记忆后会重新整理。"));
  }
  window.AssistantMemoryGraphCanvas = AssistantMemoryGraphCanvas;
  window.AssistantMemoryGraphPanel = AssistantMemoryGraphPanel;
})();
}
