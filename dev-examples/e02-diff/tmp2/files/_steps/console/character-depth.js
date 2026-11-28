{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* ===== 角色深层维度：七个命名维度，共用一个原地编辑生命周期 ===== */
const DepthL = window.L;
const DepthTC = window.TC;
const DepthEditButton = window.EditActionButton;
const DepthDoneButton = window.DoneActionButton;
const DepthTextarea = window.AutoGrowTextarea;
const DepthList = window.StructuredList;
const DepthHeading = window.CkSh;
const DepthIcon = window.Icon;
const DepthCardCollection = window.CardCollection;
const useDepthCardCollectionState = window.useCardCollectionState;
function depthText(value) {
  return String(DepthL(value) || '');
}
function depthList(value) {
  return (Array.isArray(value) ? value : []).map(item => depthText(item).trim()).filter(Boolean);
}
function canonicalCharacterDepth(value) {
  const source = value && typeof value === 'object' ? value : {};
  const fear = source.deep_fear && typeof source.deep_fear === 'object' ? source.deep_fear : {};
  const secrets = source.secrets && typeof source.secrets === 'object' ? source.secrets : {};
  const bottom = source.bottom_line && typeof source.bottom_line === 'object' ? source.bottom_line : {};
  const traumas = source.traumas && typeof source.traumas === 'object' ? source.traumas : {};
  const contradictions = source.contradictions && typeof source.contradictions === 'object' ? source.contradictions : {};
  const arc = source.arc_description && typeof source.arc_description === 'object' ? source.arc_description : {};
  return {
    surface_goal: depthText(source.surface_goal),
    deep_desire: depthText(source.deep_desire),
    deep_fear: {
      fear: depthText(fear.fear),
      source: depthText(fear.source)
    },
    secrets: {
      content: depthText(secrets.content),
      who_knows: depthList(secrets.who_knows),
      who_doesnt_know_but_should: depthList(secrets.who_doesnt_know_but_should),
      exposure_consequence: depthText(secrets.exposure_consequence)
    },
    bottom_line: {
      condition: depthText(bottom.condition),
      source: depthText(bottom.source),
      reaction_when_crossed: depthText(bottom.reaction_when_crossed)
    },
    traumas: {
      wound: depthText(traumas.wound),
      trigger: depthText(traumas.trigger),
      stress_response: depthText(traumas.stress_response),
      impact_on_behavior: depthText(traumas.impact_on_behavior)
    },
    contradictions: {
      conflicting_elements: depthText(contradictions.conflicting_elements),
      source: depthText(contradictions.source),
      possible_direction: depthText(contradictions.possible_direction)
    },
    arc_description: {
      growth_direction: depthText(arc.growth_direction),
      corruption_direction: depthText(arc.corruption_direction),
      key_choice: depthText(arc.key_choice)
    }
  };
}
function CharacterDepthReadRow({
  label,
  value,
  tone = '',
  chips = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: 'ck-depth-row' + (tone ? ' ' + tone : '')
  }, /*#__PURE__*/React.createElement("span", {
    className: "ck-depth-key"
  }, label), chips ? /*#__PURE__*/React.createElement("span", {
    className: "ck-depth-value ck-chiprow"
  }, value.length ? value.map((item, index) => /*#__PURE__*/React.createElement("span", {
    key: item + '-' + index,
    className: 'ck-chip' + (tone === 'warn' ? ' warn' : '')
  }, item)) : /*#__PURE__*/React.createElement("span", {
    className: "ck-depth-empty"
  }, "\u2014")) : /*#__PURE__*/React.createElement("span", {
    className: "ck-depth-value"
  }, value || '—'));
}
function characterDepthCards(current) {
  return [{
    key: 'desire',
    title: DepthTC('ck_desire'),
    rows: [{
      label: DepthTC('ck_surface'),
      value: current.surface_goal
    }, {
      label: DepthTC('ck_deep'),
      value: current.deep_desire
    }]
  }, {
    key: 'fear',
    title: DepthTC('ck_fear'),
    lead: current.deep_fear.fear,
    rows: [{
      label: DepthTC('ck_src'),
      value: current.deep_fear.source
    }]
  }, {
    key: 'secret',
    title: DepthTC('ck_secret'),
    lead: current.secrets.content,
    rows: [{
      label: DepthTC('ck_knows'),
      value: current.secrets.who_knows,
      chips: true
    }, {
      label: DepthTC('ck_should'),
      value: current.secrets.who_doesnt_know_but_should,
      chips: true,
      tone: 'warn'
    }, {
      label: DepthTC('ck_expose'),
      value: current.secrets.exposure_consequence
    }]
  }, {
    key: 'bottom',
    title: DepthTC('ck_bottom'),
    rows: [{
      label: DepthTC('ck_cond'),
      value: current.bottom_line.condition
    }, {
      label: DepthTC('ck_src'),
      value: current.bottom_line.source
    }, {
      label: DepthTC('ck_react'),
      value: current.bottom_line.reaction_when_crossed,
      tone: 'hot'
    }]
  }, {
    key: 'trauma',
    title: DepthTC('ck_trauma'),
    rows: [{
      label: DepthTC('ck_wound'),
      value: current.traumas.wound
    }, {
      label: DepthTC('ck_trigger'),
      value: current.traumas.trigger
    }, {
      label: DepthTC('ck_stress'),
      value: current.traumas.stress_response
    }, {
      label: DepthTC('ck_impact'),
      value: current.traumas.impact_on_behavior
    }]
  }, {
    key: 'contra',
    title: DepthTC('ck_contra'),
    rows: [{
      label: DepthTC('ck_elem'),
      value: current.contradictions.conflicting_elements
    }, {
      label: DepthTC('ck_src'),
      value: current.contradictions.source
    }, {
      label: DepthTC('ck_dir'),
      value: current.contradictions.possible_direction
    }]
  }, {
    key: 'arc',
    title: DepthTC('ck_arc'),
    rows: [{
      label: DepthTC('ck_grow'),
      value: current.arc_description.growth_direction,
      tone: 'grow'
    }, {
      label: DepthTC('ck_fall'),
      value: current.arc_description.corruption_direction,
      tone: 'fall'
    }, {
      label: DepthTC('ck_choice'),
      value: current.arc_description.key_choice,
      tone: 'choice'
    }]
  }];
}
function CharacterDepthReadCard({
  card,
  compact
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: compact ? 'ck-depth-group ck-depth-card' : 'ck-depth-group ck-depth-detail'
  }, /*#__PURE__*/React.createElement("h3", null, card.title), card.lead != null && /*#__PURE__*/React.createElement("p", {
    className: "ck-depth-lead"
  }, card.lead || '—'), /*#__PURE__*/React.createElement("div", {
    className: "ck-depth-rows"
  }, card.rows.map((row, index) => /*#__PURE__*/React.createElement(CharacterDepthReadRow, _extends({
    key: row.label + '-' + index
  }, row)))));
}
function renderCharacterDepthCard(card, index, {
  compact
}) {
  return /*#__PURE__*/React.createElement(CharacterDepthReadCard, {
    key: card.key,
    card: card,
    compact: compact
  });
}
function characterDepthCardTitle(card) {
  return card.title;
}
function characterDepthCardKey(card) {
  return card.key;
}
function CharacterDepthEditorField({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: "ck-depth-field"
  }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement(DepthTextarea, {
    className: "se-ta ck-depth-input",
    value: value,
    onChange: event => onChange(event.target.value)
  }));
}
function CharacterDepthEditorGroup({
  title,
  children,
  compact
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: (compact ? 'dbk-card-reader-card' : 'dbk-card-reader-detail') + ' ck-depth-edit-group'
  }, /*#__PURE__*/React.createElement("div", {
    className: compact ? 'dbk-card-reader-card-head' : 'dbk-card-reader-detail-head'
  }, /*#__PURE__*/React.createElement("h3", null, title)), /*#__PURE__*/React.createElement("div", {
    className: "ck-depth-edit-fields"
  }, children));
}
function CharacterDepthEditorCard({
  card,
  compact,
  draft,
  onChangeTop,
  onChangeNested
}) {
  let fields = null;
  if (card.key === 'desire') fields = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_surface'),
    value: draft.surface_goal,
    onChange: value => onChangeTop('surface_goal', value)
  }), /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_deep'),
    value: draft.deep_desire,
    onChange: value => onChangeTop('deep_desire', value)
  }));else if (card.key === 'fear') fields = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_fear'),
    value: draft.deep_fear.fear,
    onChange: value => onChangeNested('deep_fear', 'fear', value)
  }), /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_src'),
    value: draft.deep_fear.source,
    onChange: value => onChangeNested('deep_fear', 'source', value)
  }));else if (card.key === 'secret') fields = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthL({
      zh: '秘密内容',
      en: 'Secret'
    }),
    value: draft.secrets.content,
    onChange: value => onChangeNested('secrets', 'content', value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "ck-depth-list-field"
  }, /*#__PURE__*/React.createElement("span", null, DepthTC('ck_knows')), /*#__PURE__*/React.createElement(DepthList, {
    mode: "list",
    layout: "compact",
    items: draft.secrets.who_knows,
    embedded: true,
    onDraftChange: items => onChangeNested('secrets', 'who_knows', items),
    addLabel: {
      zh: '添加知情者',
      en: 'Add person'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "ck-depth-list-field"
  }, /*#__PURE__*/React.createElement("span", null, DepthTC('ck_should')), /*#__PURE__*/React.createElement(DepthList, {
    mode: "list",
    layout: "compact",
    items: draft.secrets.who_doesnt_know_but_should,
    embedded: true,
    onDraftChange: items => onChangeNested('secrets', 'who_doesnt_know_but_should', items),
    addLabel: {
      zh: '添加角色',
      en: 'Add person'
    }
  })), /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_expose'),
    value: draft.secrets.exposure_consequence,
    onChange: value => onChangeNested('secrets', 'exposure_consequence', value)
  }));else if (card.key === 'bottom') fields = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_cond'),
    value: draft.bottom_line.condition,
    onChange: value => onChangeNested('bottom_line', 'condition', value)
  }), /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_src'),
    value: draft.bottom_line.source,
    onChange: value => onChangeNested('bottom_line', 'source', value)
  }), /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_react'),
    value: draft.bottom_line.reaction_when_crossed,
    onChange: value => onChangeNested('bottom_line', 'reaction_when_crossed', value)
  }));else if (card.key === 'trauma') fields = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_wound'),
    value: draft.traumas.wound,
    onChange: value => onChangeNested('traumas', 'wound', value)
  }), /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_trigger'),
    value: draft.traumas.trigger,
    onChange: value => onChangeNested('traumas', 'trigger', value)
  }), /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_stress'),
    value: draft.traumas.stress_response,
    onChange: value => onChangeNested('traumas', 'stress_response', value)
  }), /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_impact'),
    value: draft.traumas.impact_on_behavior,
    onChange: value => onChangeNested('traumas', 'impact_on_behavior', value)
  }));else if (card.key === 'contra') fields = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_elem'),
    value: draft.contradictions.conflicting_elements,
    onChange: value => onChangeNested('contradictions', 'conflicting_elements', value)
  }), /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_src'),
    value: draft.contradictions.source,
    onChange: value => onChangeNested('contradictions', 'source', value)
  }), /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_dir'),
    value: draft.contradictions.possible_direction,
    onChange: value => onChangeNested('contradictions', 'possible_direction', value)
  }));else if (card.key === 'arc') fields = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_grow'),
    value: draft.arc_description.growth_direction,
    onChange: value => onChangeNested('arc_description', 'growth_direction', value)
  }), /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_fall'),
    value: draft.arc_description.corruption_direction,
    onChange: value => onChangeNested('arc_description', 'corruption_direction', value)
  }), /*#__PURE__*/React.createElement(CharacterDepthEditorField, {
    label: DepthTC('ck_choice'),
    value: draft.arc_description.key_choice,
    onChange: value => onChangeNested('arc_description', 'key_choice', value)
  }));
  return /*#__PURE__*/React.createElement(CharacterDepthEditorGroup, {
    title: card.title,
    compact: compact
  }, fields);
}
function CharacterDepthProfile({
  value,
  onSave,
  onEditStart,
  editDisabled = false,
  loadError = ''
}) {
  const current = canonicalCharacterDepth(value);
  const depthCards = characterDepthCards(current);
  const cardView = useDepthCardCollectionState({
    count: depthCards.length,
    initiallyExpanded: true
  });
  const [editing, setEditing] = React.useState(false);
  React.useEffect(() => editing && onEditStart ? onEditStart() : undefined, [editing, onEditStart]);
  const [draft, setDraft] = React.useState(current);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const selfEditable = typeof onSave === 'function';
  const beginEdit = () => {
    setDraft(canonicalCharacterDepth(current));
    setError('');
    setEditing(true);
  };
  const changeTop = (key, next) => setDraft(previous => ({
    ...previous,
    [key]: next
  }));
  const changeNested = (section, key, next) => setDraft(previous => ({
    ...previous,
    [section]: {
      ...previous[section],
      [key]: next
    }
  }));
  const finishEdit = async () => {
    if (saving) return;
    const next = canonicalCharacterDepth(draft);
    if (JSON.stringify(next) === JSON.stringify(current)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch (saveError) {
      setError(String(saveError && saveError.message || saveError || DepthL({
        zh: '保存失败',
        en: 'Save failed'
      })));
    } finally {
      setSaving(false);
    }
  };
  const failed = !!(error || loadError);
  const renderCard = editing ? (card, index, {
    compact
  }) => /*#__PURE__*/React.createElement(CharacterDepthEditorCard, {
    key: card.key,
    card: card,
    compact: compact,
    draft: draft,
    onChangeTop: changeTop,
    onChangeNested: changeNested
  }) : renderCharacterDepthCard;
  const actions = editing ? /*#__PURE__*/React.createElement(DepthDoneButton, {
    saving: saving,
    disabled: saving,
    onMouseDown: event => event.preventDefault(),
    onClick: finishEdit
  }) : selfEditable && /*#__PURE__*/React.createElement(DepthEditButton, {
    disabled: editDisabled,
    onClick: beginEdit,
    title: {
      zh: '编辑深层维度',
      en: 'Edit deep dimensions'
    }
  });
  const footer = /*#__PURE__*/React.createElement(React.Fragment, null, (error || loadError) && /*#__PURE__*/React.createElement("div", {
    className: "ck-depth-error",
    role: "alert"
  }, error || loadError), saved && !editing && /*#__PURE__*/React.createElement("span", {
    className: "cr-wbe-flash"
  }, /*#__PURE__*/React.createElement(DepthIcon, {
    n: "check",
    s: 11,
    w: 2.4
  }), DepthL({
    zh: '已保存',
    en: 'Saved'
  })));
  return /*#__PURE__*/React.createElement(DepthCardCollection, {
    items: depthCards,
    selected: cardView.selected,
    onSelect: cardView.setSelected,
    expanded: cardView.expanded,
    layout: cardView.layout,
    onLayoutChange: cardView.chooseLayout,
    onExpandedChange: cardView.setExpanded,
    editing: editing,
    expandedVariant: "waterfall",
    getTitle: characterDepthCardTitle,
    getKey: characterDepthCardKey,
    title: /*#__PURE__*/React.createElement(DepthHeading, {
      tone: "terra",
      t: DepthTC('ck_depth'),
      extra: "\xD77"
    }),
    actions: actions,
    footer: footer,
    className: 'ck-depth c-content-panel cr-wbe c-editable-surface card-reading' + (selfEditable ? ' self-editable' : '') + (failed ? ' err' : '') + (saved ? ' saved' : ''),
    renderCard: renderCard
  });
}
window.CharacterDepthProfile = CharacterDepthProfile;
window.canonicalCharacterDepth = canonicalCharacterDepth;
}
