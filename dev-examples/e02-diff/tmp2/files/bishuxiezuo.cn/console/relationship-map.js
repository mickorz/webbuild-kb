{
/* ===== 通用实体关系图 =====
   阅读态把 source/target/relation/detail 投影为确定性关系图；编辑态使用同一组件的关系目录。
   不使用力导向布局，避免节点在阅读时漂移。自由文本仅用于推断阅读态线型，不回写领域数据。 */
(function () {
  const L = window.L;
  function relationshipText(value) {
    const localized = L ? L(value) : value;
    return localized == null ? '' : String(localized).trim();
  }
  function relationshipToneFromText(value) {
    const text = relationshipText(value).toLowerCase();
    const cooperative = /合作|协作|同盟|盟友|互助|友好|受托|旧约|cooperat|alliance|ally|partner|friend/.test(text);
    const competitive = /竞争|敌对|冲突|对立|战争|仇|忌惮|争夺|hostile|enemy|rival|conflict|war/.test(text);
    if (cooperative && competitive) return 'mixed';
    if (/从属|附属|臣属|隶属|依附|控制|监督|宗主|辖制|subordin|vassal|control|supervis/.test(text)) return 'shadow';
    if (/秘密|暗结|渗透|幕后|隐瞒|密约|secret|covert|infiltrat/.test(text)) return 'secret';
    if (competitive) return 'hostile';
    if (cooperative) return 'ally';
    if (/孤立|疏远|中立|隔绝|isolat|neutral|distant/.test(text)) return 'shadow';
    return 'slate';
  }
  function normalizedRelationships(items) {
    return (Array.isArray(items) ? items : []).map((item, index) => {
      const source = item && typeof item === 'object' ? item : {};
      const take = (...keys) => {
        for (const key of keys) {
          if (source[key] != null && relationshipText(source[key])) return relationshipText(source[key]);
        }
        return '';
      };
      const relation = take('rel', 'relation', 'type');
      const rawTone = take('tone');
      const tone = ['hostile', 'ally', 'secret', 'shadow', 'mixed', 'slate'].includes(rawTone) ? rawTone : relationshipToneFromText(relation);
      return {
        id: index,
        a: take('a', 'from', 'source'),
        b: take('b', 'to', 'target'),
        relation,
        detail: take('v', 'tension_point', 'description', 'desc', 'note'),
        tone
      };
    }).filter(item => item.a && item.b);
  }
  function relationshipBadgeTone(tone) {
    return {
      hostile: 'terra',
      ally: 'gold',
      secret: 'slate',
      shadow: 'ghost',
      mixed: 'terra'
    }[tone] || 'slate';
  }
  function relationshipInitial(name) {
    return Array.from(String(name || '').replace(/[\s·・]/g, ''))[0] || '·';
  }
  function relationshipLabelUnits(value) {
    return Array.from(relationshipText(value)).reduce((units, char) => units + (/[\u0000-\u00ff]/.test(char) ? .56 : 1), 0);
  }
  function relationshipGraphModel(relations) {
    const nodeOrder = [];
    const adjacency = new Map();
    const degree = new Map();
    const ensure = name => {
      if (adjacency.has(name)) return;
      nodeOrder.push(name);
      adjacency.set(name, new Set());
      degree.set(name, 0);
    };
    relations.forEach(relation => {
      ensure(relation.a);
      ensure(relation.b);
      adjacency.get(relation.a).add(relation.b);
      adjacency.get(relation.b).add(relation.a);
      degree.set(relation.a, (degree.get(relation.a) || 0) + 1);
      degree.set(relation.b, (degree.get(relation.b) || 0) + 1);
    });
    const seen = new Set();
    const components = [];
    nodeOrder.forEach((root, first) => {
      if (seen.has(root)) return;
      const names = [];
      const queue = [root];
      seen.add(root);
      while (queue.length) {
        const name = queue.shift();
        names.push(name);
        adjacency.get(name).forEach(next => {
          if (!seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        });
      }
      components.push({
        names,
        first
      });
    });
    components.sort((left, right) => right.names.length - left.names.length || left.first - right.first);
    const rows = [];
    for (let index = 0; index < components.length;) {
      if (components[index].names.length >= 3) {
        rows.push([components[index]]);
        index += 1;
        continue;
      }
      rows.push(components.slice(index, index + 2));
      index += 2;
    }
    const denseNodeNames = new Set(components.filter(component => component.names.length >= 6).flatMap(component => component.names));
    const positions = new Map();
    rows.forEach((row, rowIndex) => {
      const rowHeight = 100 / rows.length;
      const centerY = rowHeight * (rowIndex + .5);
      row.forEach((component, columnIndex) => {
        const cellWidth = 100 / row.length;
        const centerX = cellWidth * (columnIndex + .5);
        const names = component.names.slice().sort((left, right) => (degree.get(right) || 0) - (degree.get(left) || 0) || nodeOrder.indexOf(left) - nodeOrder.indexOf(right));
        const horizontalRadius = row.length === 1 ? Math.min(30, cellWidth * .31) : row.length === 2 ? Math.min(15, cellWidth * .28) : Math.min(8.5, cellWidth * .27);
        const verticalRadius = component.names.length >= 6 ? Math.min(30, rowHeight * .3) : Math.min(15, rowHeight * .28);
        if (names.length === 1) {
          positions.set(names[0], {
            x: centerX,
            y: centerY
          });
          return;
        }
        if (names.length === 2) {
          const pairLabelUnits = relations.reduce((units, relation) => {
            const matches = relation.a === names[0] && relation.b === names[1] || relation.a === names[1] && relation.b === names[0];
            return matches ? Math.max(units, relationshipLabelUnits(relation.relation)) : units;
          }, 0);
          const diagonal = pairLabelUnits > 4;
          if (diagonal) {
            const direction = (rowIndex + columnIndex) % 2 === 0 ? 1 : -1;
            positions.set(names[0], {
              x: centerX - horizontalRadius * .82,
              y: centerY - verticalRadius * .72 * direction
            });
            positions.set(names[1], {
              x: centerX + horizontalRadius * .82,
              y: centerY + verticalRadius * .72 * direction
            });
          } else {
            positions.set(names[0], {
              x: centerX - horizontalRadius * .72,
              y: centerY
            });
            positions.set(names[1], {
              x: centerX + horizontalRadius * .72,
              y: centerY
            });
          }
          return;
        }
        const firstDegree = degree.get(names[0]) || 0;
        const secondDegree = degree.get(names[1]) || 0;
        const hasHub = firstDegree > 1 && firstDegree > secondDegree;
        const ring = hasHub ? names.slice(1) : names;
        if (hasHub && ring.length === 2) {
          positions.set(names[0], {
            x: centerX,
            y: centerY - verticalRadius * .45
          });
          positions.set(ring[0], {
            x: centerX - horizontalRadius * .68,
            y: centerY + verticalRadius * .62
          });
          positions.set(ring[1], {
            x: centerX + horizontalRadius * .68,
            y: centerY + verticalRadius * .62
          });
          return;
        }
        if (hasHub) positions.set(names[0], {
          x: centerX,
          y: centerY
        });
        ring.forEach((name, index) => {
          const angle = -Math.PI / 2 + Math.PI * 2 * index / ring.length;
          positions.set(name, {
            x: centerX + horizontalRadius * Math.cos(angle),
            y: centerY + verticalRadius * Math.sin(angle)
          });
        });
      });
    });
    const nodes = nodeOrder.map(name => ({
      name,
      degree: degree.get(name) || 0,
      position: positions.get(name)
    }));
    const edges = relations.map((relation, index) => {
      const start = positions.get(relation.a),
        end = positions.get(relation.b);
      const denseEdge = denseNodeNames.has(relation.a) && denseNodeNames.has(relation.b);
      const labelProgress = denseEdge ? [.54, .38, .62][index % 3] : .5;
      const midpoint = {
        x: start.x + (end.x - start.x) * labelProgress,
        y: start.y + (end.y - start.y) * labelProgress
      };
      const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
      const stagger = (index % 3 - 1) * 1.4;
      midpoint.x += (start.y - end.y) / length * stagger;
      midpoint.y += (end.x - start.x) / length * stagger;
      return {
        ...relation,
        start,
        end,
        midpoint
      };
    });
    return {
      nodes,
      edges,
      rows: Math.max(1, rows.length)
    };
  }
  function RelationshipList({
    relations,
    clamp
  }) {
    const ClampText = window.ClampText;
    return /*#__PURE__*/React.createElement("div", {
      className: "dbk-rels c-relationship-list"
    }, relations.map((relation, index) => /*#__PURE__*/React.createElement("article", {
      key: relation.id + '-' + index,
      className: "dbk-rel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "dbk-rel-top"
    }, /*#__PURE__*/React.createElement("b", {
      className: "dbk-rel-n"
    }, relation.a), /*#__PURE__*/React.createElement("span", {
      className: "dbk-rel-arr"
    }, "\u21C4"), /*#__PURE__*/React.createElement("b", {
      className: "dbk-rel-n"
    }, relation.b), relation.relation && /*#__PURE__*/React.createElement("span", {
      className: 'c-badge ' + relationshipBadgeTone(relation.tone)
    }, relation.relation)), relation.detail && (clamp && ClampText ? /*#__PURE__*/React.createElement(ClampText, {
      text: relation.detail,
      lines: 4,
      className: "dbk-rel-v"
    }) : /*#__PURE__*/React.createElement("div", {
      className: "dbk-rel-v"
    }, relation.detail)))));
  }
  const relationshipFieldAliases = {
    source: ['source', 'a', 'from'],
    target: ['target', 'b', 'to'],
    relation: ['relation', 'rel', 'type'],
    tension: ['tension_point', 'v', 'description', 'desc', 'note']
  };
  function relationshipFieldKey(item, field) {
    const source = item && typeof item === 'object' ? item : {};
    return relationshipFieldAliases[field].find(key => Object.prototype.hasOwnProperty.call(source, key)) || relationshipFieldAliases[field][0];
  }
  function relationshipFieldValue(item, field) {
    const source = item && typeof item === 'object' ? item : {};
    return relationshipText(source[relationshipFieldKey(source, field)]);
  }
  function relationshipEditorTitle(item) {
    const source = relationshipFieldValue(item, 'source');
    const target = relationshipFieldValue(item, 'target');
    const relation = relationshipFieldValue(item, 'relation');
    const pair = source && target ? source + ' ⇄ ' + target : source || target;
    return [pair, relation].filter(Boolean).join(' · ') || L({
      zh: '新关系',
      en: 'New relationship'
    });
  }
  function RelationshipEditorCard({
    item,
    index,
    onUpdate,
    onDelete
  }) {
    const ContentActionButton = window.ContentActionButton;
    const AutoGrowTextarea = window.AutoGrowTextarea;
    const update = (field, value) => {
      const source = item && typeof item === 'object' ? item : {};
      onUpdate(index, Object.assign({}, source, {
        [relationshipFieldKey(source, field)]: value
      }));
    };
    const field = (name, label, wide = false) => {
      const value = relationshipFieldValue(item, name);
      const className = 'c-relationship-edit-field' + (wide ? ' wide' : '');
      return /*#__PURE__*/React.createElement("label", {
        className: className
      }, /*#__PURE__*/React.createElement("span", null, L(label)), wide ? /*#__PURE__*/React.createElement(AutoGrowTextarea, {
        rows: 1,
        className: "c-relationship-edit-input",
        value: value,
        onChange: event => update(name, event.target.value)
      }) : /*#__PURE__*/React.createElement("input", {
        type: "text",
        className: "c-relationship-edit-input",
        value: value,
        onChange: event => update(name, event.target.value)
      }));
    };
    return /*#__PURE__*/React.createElement("article", {
      className: "dbk-card-reader-detail c-relationship-edit-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "dbk-card-reader-detail-head"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "c-serif"
    }, relationshipEditorTitle(item)), /*#__PURE__*/React.createElement(ContentActionButton, {
      variant: "danger",
      icon: "trash",
      className: "dbk-card-reader-delete",
      onMouseDown: event => event.preventDefault(),
      onClick: () => onDelete(index)
    }, L({
      zh: '删除',
      en: 'Delete'
    }))), /*#__PURE__*/React.createElement("div", {
      className: "c-relationship-edit-fields"
    }, field('source', {
      zh: '来源',
      en: 'Source'
    }), field('relation', {
      zh: '关系',
      en: 'Relationship'
    }), field('target', {
      zh: '对象',
      en: 'Target'
    }), field('tension', {
      zh: '张力点',
      en: 'Tension point'
    }, true)));
  }
  function RelationshipMapEditor({
    head,
    items,
    initialViewState,
    onViewStateChange,
    onItemsChange,
    onFinish,
    canRewrite,
    onRewrite,
    askAction
  }) {
    const CardCollection = window.CardCollection;
    const useCardCollectionState = window.useCardCollectionState;
    const ContentActionButton = window.ContentActionButton;
    const DoneActionButton = window.DoneActionButton;
    const ConfirmDialog = window.ConfirmDialog;
    const list = Array.isArray(items) ? items : [];
    const view = useCardCollectionState({
      count: list.length,
      initialViewState
    });
    const {
      selected,
      setSelected
    } = view;
    const [deleteAsk, setDeleteAsk] = React.useState(null);
    React.useEffect(() => {
      if (onViewStateChange) onViewStateChange(Object.assign({}, initialViewState, {
        selected,
        layout: 'side',
        expanded: false
      }));
    }, [selected]);
    const stopBlur = event => event.preventDefault();
    const updateItem = (index, value) => onItemsChange(list.map((item, itemIndex) => itemIndex === index ? value : item));
    const addItem = () => {
      const next = list.concat([{
        source: '',
        target: '',
        relation: '',
        tension_point: ''
      }]);
      onItemsChange(next);
      setSelected(next.length - 1);
    };
    const deleteItem = () => {
      if (deleteAsk == null) return;
      const next = list.filter((_, index) => index !== deleteAsk);
      onItemsChange(next);
      setSelected(Math.min(selected > deleteAsk ? selected - 1 : selected, Math.max(0, next.length - 1)));
      setDeleteAsk(null);
    };
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CardCollection, {
      className: "c-relationship-editor",
      items: list,
      selected: selected,
      onSelect: setSelected,
      expanded: false,
      layout: "side",
      editing: true,
      onLayoutChange: () => {},
      onExpandedChange: () => {},
      showLayoutControls: false,
      allowExpanded: false,
      showIndexNumbers: false,
      title: head,
      getTitle: relationshipEditorTitle,
      getKey: (_item, index) => index,
      onControlMouseDown: stopBlur,
      actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ContentActionButton, {
        variant: "add",
        icon: "plus",
        className: "dbk-card-reader-add",
        onMouseDown: stopBlur,
        onClick: addItem
      }, L({
        zh: '新增',
        en: 'New'
      })), askAction, canRewrite && /*#__PURE__*/React.createElement(ContentActionButton, {
        icon: "bolt",
        className: "cr-wbe-ai",
        disabled: window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED(),
        onMouseDown: stopBlur,
        onClick: onRewrite
      }, L({
        zh: 'AI 改写',
        en: 'AI rewrite'
      })), /*#__PURE__*/React.createElement(DoneActionButton, {
        onMouseDown: stopBlur,
        onClick: onFinish
      })),
      renderCard: (item, index) => /*#__PURE__*/React.createElement(RelationshipEditorCard, {
        key: index,
        item: item,
        index: index,
        onUpdate: updateItem,
        onDelete: setDeleteAsk
      })
    }), ConfirmDialog && /*#__PURE__*/React.createElement(ConfirmDialog, {
      open: deleteAsk != null,
      tone: "danger",
      icon: "trash",
      title: L({
        zh: '删除「' + relationshipEditorTitle(list[deleteAsk]) + '」？',
        en: 'Delete “' + relationshipEditorTitle(list[deleteAsk]) + '”?'
      }),
      message: L({
        zh: '删除后会随本区块保存，当前页面无法恢复这项内容。',
        en: 'The relationship will be removed when this block is saved and cannot be restored on this page.'
      }),
      cancelLabel: L({
        zh: '取消',
        en: 'Cancel'
      }),
      confirmLabel: L({
        zh: '确认删除',
        en: 'Delete'
      }),
      onClose: () => setDeleteAsk(null),
      onConfirm: deleteItem
    }));
  }
  function RelationshipMapReader({
    head,
    items,
    clamp = true,
    onEdit,
    editDisabled = false,
    initialViewState
  }) {
    const ContentToolbar = window.ContentToolbar;
    const ContentActionButton = window.ContentActionButton;
    const EditActionButton = window.EditActionButton;
    const relations = React.useMemo(() => normalizedRelationships(items), [items]);
    const model = React.useMemo(() => relationshipGraphModel(relations), [relations]);
    const [mode, setMode] = React.useState(() => initialViewState && ['graph', 'list'].includes(initialViewState.mode) ? initialViewState.mode : 'graph');
    const [selected, setSelected] = React.useState(() => initialViewState && Number.isInteger(initialViewState.selected) ? initialViewState.selected : 0);
    const activeIndex = relations.length ? Math.min(selected, relations.length - 1) : 0;
    const active = relations[activeIndex];
    React.useEffect(() => {
      if (selected >= relations.length) setSelected(Math.max(0, relations.length - 1));
    }, [relations.length, selected]);
    const selectNode = name => {
      const index = relations.findIndex(relation => relation.a === name || relation.b === name);
      if (index >= 0) setSelected(index);
    };
    if (!relations.length) return /*#__PURE__*/React.createElement("section", {
      className: "c-relationship-map c-content-panel c-content-toolbar-owner"
    }, /*#__PURE__*/React.createElement(ContentToolbar, {
      title: head
    }, onEdit && /*#__PURE__*/React.createElement(EditActionButton, {
      disabled: editDisabled,
      onClick: () => onEdit({
        selected: 0,
        mode
      })
    })), /*#__PURE__*/React.createElement("div", {
      className: "c-relationship-empty"
    }, L({
      zh: '暂无关系记录',
      en: 'No relationships yet'
    })));
    return /*#__PURE__*/React.createElement("section", {
      className: 'c-relationship-map c-content-panel c-content-toolbar-owner mode-' + mode
    }, /*#__PURE__*/React.createElement(ContentToolbar, {
      title: head
    }, /*#__PURE__*/React.createElement("span", {
      className: "c-relationship-mode",
      role: "group",
      "aria-label": L({
        zh: '关系展示方式',
        en: 'Relationship view'
      })
    }, /*#__PURE__*/React.createElement(ContentActionButton, {
      active: mode === 'graph',
      onClick: () => setMode('graph')
    }, L({
      zh: '图谱',
      en: 'Map'
    })), /*#__PURE__*/React.createElement(ContentActionButton, {
      active: mode === 'list',
      onClick: () => setMode('list')
    }, L({
      zh: '列表',
      en: 'List'
    }))), onEdit && /*#__PURE__*/React.createElement(EditActionButton, {
      disabled: editDisabled,
      onClick: () => onEdit({
        selected: activeIndex,
        mode
      })
    })), /*#__PURE__*/React.createElement("div", {
      className: "c-relationship-graph-panel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "c-relationship-canvas",
      style: {
        height: Math.min(560, Math.max(320, model.rows * 170)) + 'px'
      },
      "aria-label": L({
        zh: '势力关系图',
        en: 'Force relationship map'
      })
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 100 100",
      preserveAspectRatio: "none",
      "aria-hidden": "true"
    }, model.edges.map((edge, index) => /*#__PURE__*/React.createElement("line", {
      key: edge.id + '-' + index,
      className: 'c-relationship-edge ' + edge.tone + (index === activeIndex ? ' selected' : ''),
      x1: edge.start.x,
      y1: edge.start.y,
      x2: edge.end.x,
      y2: edge.end.y
    }))), model.edges.map((edge, index) => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: 'edge-' + edge.id + '-' + index,
      className: 'c-relationship-edge-label ' + edge.tone + (index === activeIndex ? ' selected' : ''),
      style: {
        left: edge.midpoint.x + '%',
        top: edge.midpoint.y + '%'
      },
      "aria-pressed": index === activeIndex,
      onClick: () => setSelected(index)
    }, edge.relation || L({
      zh: '关系未定',
      en: 'Undefined'
    }))), model.nodes.map(node => {
      const selectedNode = active && (active.a === node.name || active.b === node.name);
      return /*#__PURE__*/React.createElement("button", {
        type: "button",
        key: node.name,
        className: 'c-relationship-node' + (selectedNode ? ' selected' : ''),
        style: {
          left: node.position.x + '%',
          top: node.position.y + '%'
        },
        "aria-pressed": !!selectedNode,
        onClick: () => selectNode(node.name)
      }, /*#__PURE__*/React.createElement("span", {
        className: "c-relationship-node-avatar",
        "aria-hidden": "true"
      }, relationshipInitial(node.name)), /*#__PURE__*/React.createElement("span", {
        className: "c-relationship-node-copy"
      }, /*#__PURE__*/React.createElement("b", null, node.name), /*#__PURE__*/React.createElement("small", null, L({
        zh: node.degree + ' 条关系',
        en: node.degree + ' ' + (node.degree === 1 ? 'tie' : 'ties')
      }))));
    })), active && /*#__PURE__*/React.createElement("div", {
      className: "c-relationship-detail"
    }, /*#__PURE__*/React.createElement("div", {
      className: "c-relationship-detail-head"
    }, /*#__PURE__*/React.createElement("b", null, active.a), /*#__PURE__*/React.createElement("span", null, "\u21C4"), /*#__PURE__*/React.createElement("b", null, active.b), active.relation && /*#__PURE__*/React.createElement("span", {
      className: 'c-badge ' + relationshipBadgeTone(active.tone)
    }, active.relation)), active.detail && /*#__PURE__*/React.createElement("div", {
      className: "c-relationship-detail-body"
    }, /*#__PURE__*/React.createElement("span", null, L({
      zh: '张力点',
      en: 'Tension point'
    })), /*#__PURE__*/React.createElement("p", null, active.detail)))), /*#__PURE__*/React.createElement(RelationshipList, {
      relations: relations,
      clamp: clamp
    }));
  }
  function RelationshipMap(props) {
    return props.editing ? /*#__PURE__*/React.createElement(RelationshipMapEditor, props) : /*#__PURE__*/React.createElement(RelationshipMapReader, props);
  }
  window.RelationshipMap = RelationshipMap;
  window.relationshipGraphModel = relationshipGraphModel;
})();
}
