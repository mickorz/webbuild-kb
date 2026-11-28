{
/* ===== 角色声线：完整呈现并原地编辑 Engine voice 对象 ===== */
const VoiceL = window.L;
const VoiceCardCollection = window.CardCollection;
const useVoiceCardCollectionState = window.useCardCollectionState;
const VoiceHeading = window.CkSh;
const VoiceEditButton = window.EditActionButton;
const VoiceDoneButton = window.DoneActionButton;
const VoiceTextarea = window.AutoGrowTextarea;
const VoiceList = window.StructuredList;
const VoiceIcon = window.Icon;
function voiceText(value) {
  return String(VoiceL(value) || '');
}
function voiceList(value) {
  return (Array.isArray(value) ? value : []).map(item => voiceText(item).trim()).filter(Boolean);
}
function canonicalCharacterVoice(value) {
  const source = value && typeof value === 'object' ? value : {};
  const syntax = source.syntax_fingerprint && typeof source.syntax_fingerprint === 'object' ? source.syntax_fingerprint : {};
  const emotions = source.emotion_patterns && typeof source.emotion_patterns === 'object' ? source.emotion_patterns : {};
  return {
    voice_positioning: voiceText(source.voice_positioning),
    cognitive_bias: voiceText(source.cognitive_bias),
    syntax_fingerprint: {
      sentence_preference: voiceText(syntax.sentence_preference),
      catchphrases: voiceList(syntax.catchphrases),
      pause_habit: voiceText(syntax.pause_habit),
      dominant_sentence_type: voiceText(syntax.dominant_sentence_type)
    },
    forbidden_speech: voiceList(source.forbidden_speech),
    emotion_patterns: {
      anger: voiceText(emotions.anger),
      nervous: voiceText(emotions.nervous),
      lying: voiceText(emotions.lying)
    }
  };
}
function hasCharacterVoice(value) {
  const voice = canonicalCharacterVoice(value);
  const syntax = voice.syntax_fingerprint;
  const emotions = voice.emotion_patterns;
  return !!(voice.voice_positioning || voice.cognitive_bias || voice.forbidden_speech.length || syntax.sentence_preference || syntax.catchphrases.length || syntax.pause_habit || syntax.dominant_sentence_type || emotions.anger || emotions.nervous || emotions.lying);
}
function characterVoiceCards(voice) {
  return [{
    key: 'positioning',
    title: VoiceL({
      zh: '声音定位',
      en: 'Voice identity'
    }),
    rows: [{
      label: VoiceL({
        zh: '声音定位',
        en: 'Positioning'
      }),
      value: voice.voice_positioning
    }, {
      label: VoiceL({
        zh: '认知滤镜',
        en: 'Cognitive lens'
      }),
      value: voice.cognitive_bias
    }]
  }, {
    key: 'syntax',
    title: VoiceL({
      zh: '句法指纹',
      en: 'Syntax fingerprint'
    }),
    rows: [{
      label: VoiceL({
        zh: '长短句偏好',
        en: 'Sentence preference'
      }),
      value: voice.syntax_fingerprint.sentence_preference
    }, {
      label: VoiceL({
        zh: '停顿习惯',
        en: 'Pause habit'
      }),
      value: voice.syntax_fingerprint.pause_habit
    }, {
      label: VoiceL({
        zh: '常用句式',
        en: 'Dominant sentence type'
      }),
      value: voice.syntax_fingerprint.dominant_sentence_type
    }, {
      label: VoiceL({
        zh: '口头禅',
        en: 'Catchphrases'
      }),
      value: voice.syntax_fingerprint.catchphrases,
      list: true
    }]
  }, {
    key: 'emotions',
    title: VoiceL({
      zh: '情绪变化',
      en: 'Emotional shifts'
    }),
    rows: [{
      label: VoiceL({
        zh: '愤怒时',
        en: 'When angry'
      }),
      value: voice.emotion_patterns.anger
    }, {
      label: VoiceL({
        zh: '紧张时',
        en: 'When nervous'
      }),
      value: voice.emotion_patterns.nervous
    }, {
      label: VoiceL({
        zh: '掩饰时',
        en: 'When concealing'
      }),
      value: voice.emotion_patterns.lying
    }]
  }, {
    key: 'forbidden',
    title: VoiceL({
      zh: '禁用表达',
      en: 'Forbidden speech'
    }),
    rows: [{
      label: VoiceL({
        zh: '不会说的话',
        en: 'Never says'
      }),
      value: voice.forbidden_speech,
      list: true
    }]
  }];
}
function CharacterVoiceReadRow({
  row
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-label"
  }, row.label), row.list ? row.value.length ? /*#__PURE__*/React.createElement("ul", {
    className: "dbk-card-reader-list"
  }, row.value.map((item, index) => /*#__PURE__*/React.createElement("li", {
    key: item + '-' + index
  }, item))) : /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-value"
  }, "\u2014") : /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-value"
  }, row.value || '—'));
}
function CharacterVoiceReadCard({
  card,
  compact
}) {
  return /*#__PURE__*/React.createElement("article", {
    className: compact ? 'dbk-card-reader-card' : 'dbk-card-reader-detail'
  }, /*#__PURE__*/React.createElement("div", {
    className: compact ? 'dbk-card-reader-card-head' : 'dbk-card-reader-detail-head'
  }, /*#__PURE__*/React.createElement("h3", null, card.title)), /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-fields"
  }, card.rows.map((row, index) => /*#__PURE__*/React.createElement(CharacterVoiceReadRow, {
    key: row.label + '-' + index,
    row: row
  }))));
}
function CharacterVoiceEditorField({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-label"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-editor-value"
  }, /*#__PURE__*/React.createElement(VoiceTextarea, {
    className: "se-ta",
    value: value,
    onChange: event => onChange(event.target.value)
  })));
}
function CharacterVoiceEditorList({
  label,
  value,
  onChange,
  addLabel
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-label"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-editor-value"
  }, /*#__PURE__*/React.createElement(VoiceList, {
    mode: "list",
    layout: "compact",
    items: value,
    embedded: true,
    onDraftChange: onChange,
    addLabel: addLabel
  })));
}
function CharacterVoiceEditorCard({
  card,
  compact,
  draft,
  onChangeTop,
  onChangeSyntax,
  onChangeEmotion
}) {
  let fields = null;
  if (card.key === 'positioning') fields = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterVoiceEditorField, {
    label: VoiceL({
      zh: '声音定位',
      en: 'Positioning'
    }),
    value: draft.voice_positioning,
    onChange: value => onChangeTop('voice_positioning', value)
  }), /*#__PURE__*/React.createElement(CharacterVoiceEditorField, {
    label: VoiceL({
      zh: '认知滤镜',
      en: 'Cognitive lens'
    }),
    value: draft.cognitive_bias,
    onChange: value => onChangeTop('cognitive_bias', value)
  }));else if (card.key === 'syntax') fields = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterVoiceEditorField, {
    label: VoiceL({
      zh: '长短句偏好',
      en: 'Sentence preference'
    }),
    value: draft.syntax_fingerprint.sentence_preference,
    onChange: value => onChangeSyntax('sentence_preference', value)
  }), /*#__PURE__*/React.createElement(CharacterVoiceEditorField, {
    label: VoiceL({
      zh: '停顿习惯',
      en: 'Pause habit'
    }),
    value: draft.syntax_fingerprint.pause_habit,
    onChange: value => onChangeSyntax('pause_habit', value)
  }), /*#__PURE__*/React.createElement(CharacterVoiceEditorField, {
    label: VoiceL({
      zh: '常用句式',
      en: 'Dominant sentence type'
    }),
    value: draft.syntax_fingerprint.dominant_sentence_type,
    onChange: value => onChangeSyntax('dominant_sentence_type', value)
  }), /*#__PURE__*/React.createElement(CharacterVoiceEditorList, {
    label: VoiceL({
      zh: '口头禅',
      en: 'Catchphrases'
    }),
    value: draft.syntax_fingerprint.catchphrases,
    onChange: value => onChangeSyntax('catchphrases', value),
    addLabel: {
      zh: '添加口头禅',
      en: 'Add catchphrase'
    }
  }));else if (card.key === 'emotions') fields = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CharacterVoiceEditorField, {
    label: VoiceL({
      zh: '愤怒时',
      en: 'When angry'
    }),
    value: draft.emotion_patterns.anger,
    onChange: value => onChangeEmotion('anger', value)
  }), /*#__PURE__*/React.createElement(CharacterVoiceEditorField, {
    label: VoiceL({
      zh: '紧张时',
      en: 'When nervous'
    }),
    value: draft.emotion_patterns.nervous,
    onChange: value => onChangeEmotion('nervous', value)
  }), /*#__PURE__*/React.createElement(CharacterVoiceEditorField, {
    label: VoiceL({
      zh: '掩饰时',
      en: 'When concealing'
    }),
    value: draft.emotion_patterns.lying,
    onChange: value => onChangeEmotion('lying', value)
  }));else if (card.key === 'forbidden') fields = /*#__PURE__*/React.createElement(CharacterVoiceEditorList, {
    label: VoiceL({
      zh: '不会说的话',
      en: 'Never says'
    }),
    value: draft.forbidden_speech,
    onChange: value => onChangeTop('forbidden_speech', value),
    addLabel: {
      zh: '添加禁用表达',
      en: 'Add forbidden phrase'
    }
  });
  return /*#__PURE__*/React.createElement("article", {
    className: compact ? 'dbk-card-reader-card' : 'dbk-card-reader-detail'
  }, /*#__PURE__*/React.createElement("div", {
    className: compact ? 'dbk-card-reader-card-head' : 'dbk-card-reader-detail-head'
  }, /*#__PURE__*/React.createElement("h3", null, card.title)), /*#__PURE__*/React.createElement("div", {
    className: "dbk-card-reader-fields"
  }, fields));
}
function CharacterVoiceProfile({
  value,
  onSave,
  editDisabled = false,
  loadError = '',
  saved = false,
  rewritten = false,
  actionPending = false,
  renderEditActions
}) {
  const current = canonicalCharacterVoice(value);
  const cards = characterVoiceCards(current);
  const view = useVoiceCardCollectionState({
    count: cards.length,
    initialViewState: {
      selected: 0,
      layout: 'side',
      expanded: false
    }
  });
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(current);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [localSaved, setLocalSaved] = React.useState(false);
  const selfEditable = typeof onSave === 'function';
  const beginEdit = () => {
    setDraft(canonicalCharacterVoice(current));
    setError('');
    setEditing(true);
  };
  const closeEdit = () => {
    setEditing(false);
    setError('');
  };
  const changeTop = (key, next) => setDraft(previous => ({
    ...previous,
    [key]: next
  }));
  const changeSyntax = (key, next) => setDraft(previous => ({
    ...previous,
    syntax_fingerprint: {
      ...previous.syntax_fingerprint,
      [key]: next
    }
  }));
  const changeEmotion = (key, next) => setDraft(previous => ({
    ...previous,
    emotion_patterns: {
      ...previous.emotion_patterns,
      [key]: next
    }
  }));
  const finishEdit = async () => {
    if (saving || actionPending) return;
    const next = canonicalCharacterVoice(draft);
    if (JSON.stringify(next) === JSON.stringify(current)) {
      closeEdit();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      setEditing(false);
      setLocalSaved(true);
      setTimeout(() => setLocalSaved(false), 1600);
    } catch (saveError) {
      setError(String(saveError && saveError.message || saveError || VoiceL({
        zh: '保存失败',
        en: 'Save failed'
      })));
    } finally {
      setSaving(false);
    }
  };
  const dirty = JSON.stringify(canonicalCharacterVoice(draft)) !== JSON.stringify(current);
  const failed = !!(error || loadError);
  const renderCard = editing ? (card, index, {
    compact
  }) => /*#__PURE__*/React.createElement(CharacterVoiceEditorCard, {
    key: card.key,
    card: card,
    compact: compact,
    draft: draft,
    onChangeTop: changeTop,
    onChangeSyntax: changeSyntax,
    onChangeEmotion: changeEmotion
  }) : (card, index, {
    compact
  }) => /*#__PURE__*/React.createElement(CharacterVoiceReadCard, {
    key: card.key,
    card: card,
    compact: compact
  });
  const actions = editing ? /*#__PURE__*/React.createElement(React.Fragment, null, renderEditActions && renderEditActions({
    dirty,
    close: closeEdit
  }), /*#__PURE__*/React.createElement(VoiceDoneButton, {
    saving: saving,
    disabled: saving || actionPending,
    onMouseDown: event => event.preventDefault(),
    onClick: finishEdit
  })) : selfEditable && /*#__PURE__*/React.createElement(VoiceEditButton, {
    disabled: editDisabled,
    onClick: beginEdit,
    title: {
      zh: '编辑角色声线',
      en: 'Edit character voice'
    }
  });
  const footer = /*#__PURE__*/React.createElement(React.Fragment, null, (error || loadError) && /*#__PURE__*/React.createElement("div", {
    className: "ck-voice-error",
    role: "alert"
  }, error || loadError), (saved || localSaved) && !editing && /*#__PURE__*/React.createElement("span", {
    className: "cr-wbe-flash"
  }, /*#__PURE__*/React.createElement(VoiceIcon, {
    n: "check",
    s: 11,
    w: 2.4
  }), VoiceL({
    zh: '已保存',
    en: 'Saved'
  })));
  return /*#__PURE__*/React.createElement(VoiceCardCollection, {
    items: cards,
    selected: view.selected,
    onSelect: view.setSelected,
    expanded: view.expanded,
    layout: view.layout,
    onLayoutChange: view.chooseLayout,
    onExpandedChange: view.setExpanded,
    editing: editing,
    expandedVariant: "waterfall",
    getTitle: card => card.title,
    getKey: card => card.key,
    title: /*#__PURE__*/React.createElement(VoiceHeading, {
      tone: "slate",
      t: VoiceL({
        zh: '角色声线',
        en: 'Character voice'
      }),
      extra: "\xD74"
    }),
    actions: actions,
    footer: footer,
    className: 'ck-voice c-content-panel cr-wbe c-editable-surface card-reading' + (selfEditable ? ' self-editable' : '') + (failed ? ' err' : '') + (saved || localSaved ? ' saved' : '') + (rewritten ? ' rewritten' : ''),
    renderCard: renderCard
  });
}
window.CharacterVoiceProfile = CharacterVoiceProfile;
window.canonicalCharacterVoice = canonicalCharacterVoice;
window.hasCharacterVoice = hasCharacterVoice;
}
