(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ProseStageCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  // These anchors mirror the chapter workflow's public stage IDs, not elapsed time.
  const PROSE_STAGE_SEQ = [
    { id: 'prepare_context', p: 0.05, zh: '翻阅前情与设定卷宗', en: 'Reviewing the story so far' },
    { id: 'world_state', p: 0.12, zh: '世界状态机推演时局', en: 'World state machine deducing' },
    { id: 'world_ready', p: 0.18, zh: '世界推演已就绪', en: 'World deduction ready' },
    { id: 'intent_dispatch', p: 0.22, zh: '意图分发器正在领命', en: 'Intent dispatcher taking orders' },
    { id: 'chapter_guide', p: 0.32, zh: '大纲导演为本章布局', en: 'Outline director plotting' },
    { id: 'guide_ready', p: 0.38, zh: '章节大纲已成形', en: 'Chapter guide ready' },
    { id: 'character_state', p: 0.42, zh: '角色状态维护师梳理群像', en: 'Maintaining character state' },
    { id: 'storyboard', p: 0.55, zh: '分镜师编排场景调度', en: 'Storyboarding the scenes' },
    { id: 'skeleton', p: 0.65, zh: '骨架写手搭起章节骨干', en: 'Skeleton writer framing' },
    { id: 'compose', p: 0.90, zh: '整合写手落笔成文', en: 'Composing the prose' },
    { id: 'body_ready', p: 1.0, zh: '本章正文已就绪', en: 'Chapter body ready' }
  ];
  const POLISH_STAGE_SEQ = [
    { id: 'prepare_context', p: 0.10, zh: '下拉本章正文', en: 'Pulling chapter prose' },
    { id: 'self_critique', p: 0.30, zh: '自审师扫描十维 AI 痕迹', en: 'Self-critique scanning 10 AI tells' },
    { id: 'humanize', p: 0.60, zh: '人文化润色师打磨字句', en: 'Humanizing the prose' },
    { id: 'professional_polish', p: 0.85, zh: '专业润色师精修成稿', en: 'Professional polish pass' },
    { id: 'polish_ready', p: 1.0, zh: '润色稿已就绪', en: 'Polished draft ready' }
  ];
  const MODE_STAGES = {
    full: PROSE_STAGE_SEQ.map(stage => stage.id),
    world_state: ['prepare_context', 'world_state', 'world_ready'],
    outline_director: ['prepare_context', 'intent_dispatch', 'chapter_guide', 'guide_ready'],
    character_state: ['prepare_context', 'character_state'],
    writer_group: ['prepare_context', 'intent_dispatch', 'storyboard', 'skeleton', 'compose', 'body_ready']
  };
  const DRAW_FROM_OUTLINE_STAGES = ['prepare_context', 'intent_dispatch', 'character_state', 'storyboard', 'compose'];
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const concreteType = value => {
    const match = /^chapter_(writer|full)_(single|muti)$/.exec(String(value || ''));
    if (match) return { execution_mode: match[1] === 'writer' ? 'writer_group' : 'full', writer_type: match[2] };
    const mode = /^chapter_(world_state|outline_director|character_state)$/.exec(String(value || ''));
    return mode ? { execution_mode: mode[1] } : {};
  };
  function taskOptions(task, fallback = {}) {
    fallback = object(fallback);
    const req = object(task?.request_payload), engine = object(req.engine_payload);
    const hints = concreteType(task?.task_type);
    const get = key => engine[key] ?? req[key] ?? hints[key] ?? fallback[key];
    const customValue = key => Object.hasOwn(engine, key) ? engine[key]
      : Object.hasOwn(req, key) ? req[key] : fallback[key];
    const rawType = req.engine_operation || task?.task_type || fallback.task_type;
    const taskType = rawType === 'chapter_draft_single' || Object.keys(concreteType(rawType)).length
      ? 'chapter_draft' : rawType;
    return {
      task_type: taskType,
      execution_mode: get('execution_mode') || 'full',
      writer_type: get('writer_type') || 'single',
      chapter_number: engine.chapter_number ?? req.chapter_number ?? task?.chapter_number ?? fallback.chapter_number,
      custom: !!(customValue('custom') || customValue('scheme_id') || customValue('from_node_id')
        || customValue('selected_node_ids')?.length || customValue('disabled_node_ids')?.length)
    };
  }
  // The promised artifact belongs to the complete chain, not its first step.
  function resultTarget(task, fallback = {}) {
    const options = taskOptions(task, fallback);
    if (!isChapter(options)) return null;
    const chain = task?.request_payload?.chapter_chain || fallback.chapter_chain;
    const mode = chain?.kind === 'prose' ? 'writer_group'
      : chain?.kind === 'outline' ? 'outline_director' : options.execution_mode;
    const targets = {
      world_state: { kind: 'world_state', titleKey: 'asst_action_chapter_world_state', destination: 'book_world', labelKey: 'asst_view_world_state' },
      outline_director: { kind: 'guide', titleKey: 'asst_action_chapter_guide', destination: 'chapter_outline', labelKey: 'asst_view_guide' },
      character_state: { kind: 'character_state', titleKey: 'asst_action_chapter_character_state', destination: 'book_world', labelKey: 'asst_view_character_state' },
      writer_group: { kind: 'body', titleKey: 'asst_action_chapter_draft', destination: 'chapter_body', labelKey: 'asst_view_body' },
      full: { kind: 'body', titleKey: 'asst_action_chapter_draft', destination: 'chapter_body', labelKey: 'asst_view_body' }
    };
    return targets[mode] || null;
  }
  const isChapter = options => options?.task_type === 'chapter_draft'
    || options?.task_type === 'chapter_draft_single' || Object.keys(concreteType(options?.task_type)).length > 0;
  const supported = options => isChapter(options) || options?.task_type === 'polish';
  function catalog(options) {
    if (options?.task_type === 'polish') return POLISH_STAGE_SEQ;
    if (!isChapter(options)) return [];
    return PROSE_STAGE_SEQ.filter(stage => stage.id !== 'skeleton' || options.writer_type === 'muti')
      .map(stage => stage.id === 'compose' && options.writer_type !== 'muti'
        ? { ...stage, p: 0.85, zh: '单写手落笔成文', en: 'Single writer composing the prose' } : stage);
  }
  function sequence(options) {
    if (options?.custom) return [];
    const all = catalog(options);
    if (options?.task_type === 'polish') return all;
    const mode = options?.execution_mode;
    const ids = mode === 'character_state' && options.prose_draw ? DRAW_FROM_OUTLINE_STAGES : MODE_STAGES[mode];
    return ids ? all.filter(stage => ids.includes(stage.id)) : [];
  }
  function current(options, stageId) {
    // A custom selection proves only its reported current stage, not earlier steps.
    const stages = options?.custom ? catalog(options) : sequence(options);
    return stages.find(stage => stage.id === stageId) || null;
  }
  function project(options, stageId) {
    const stages = sequence(options), stage = current(options, stageId);
    return { stages, stage, index: stage ? stages.findIndex(item => item.id === stage.id) : -1,
      progress: stage ? Math.round(stage.p * 100) : null };
  }
  return { PROSE_STAGE_SEQ, POLISH_STAGE_SEQ, taskOptions, resultTarget, isChapter, supported, sequence, current, project };
});
