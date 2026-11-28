(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AssistantCreationCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const metadataLabels = {
    title: ['书名', 'Title'], subtitle: ['简介', 'Synopsis'], genre: ['题材', 'Genre'],
    core_mech: ['核心设定', 'Core premise'], style: ['风格', 'Style'],
    relationship: ['人物关系', 'Relationships'], estimated_length: ['篇幅', 'Length'],
    words_per_chapter: ['每章字数', 'Words per chapter'], premise: ['创作立意', 'Premise'],
    conflict: ['核心冲突', 'Conflict']
  };
  function parseObject(value) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch (_) { return null; }
  }
  function targetBookId(action) {
    if (action?.operation === 'books_create') {
      return ['succeeded', 'completed'].includes(action.state) ? action.result_json?.book_ref || null : null;
    }
    return action?.book_link_id || null;
  }
  function presentation(action, english) {
    const args = action?.arguments || {};
    const operation = action?.operation || args.operation;
    const text = (zh, en) => english ? en : zh;
    const titles = {
      books_create: text('新建作品', 'Create book'), books_update: text('修改作品信息', 'Update book details'),
      character_create: text('新增人物', 'Add character'), character_rename: text('人物改名', 'Rename character'),
      character_delete: text('删除人物', 'Delete character'),
      rewrite_start: text(args.rewrite_mode === 'body' ? '专用正文改写' : '专用字段改写', 'Dedicated rewrite')
    };
    const singleCharacter = operation === 'tasks_start' && args.task_type === 'character_create';
    if (!titles[operation] && !singleCharacter) return null;
    const metadata = parseObject(args.metadata_json) || {};
    const savedTitle = ['succeeded', 'completed'].includes(action?.state)
      ? action.result_json?.title || metadata.title : null;
    const facts = [];
    const fact = (key, label, value) => {
      if (value != null) facts.push({ key, label, text: String(value) || text('清空', 'Clear') });
    };
    if (operation === 'books_create') fact('title', text('书名', 'Title'), args.title);
    if (operation === 'books_create' || operation === 'books_update') {
      Object.entries(metadataLabels).forEach(([key, labels]) => {
        if (Object.prototype.hasOwnProperty.call(metadata, key)) fact(key, labels[english ? 1 : 0], metadata[key]);
      });
    }
    fact('name', text('人物', 'Character'), args.name);
    fact('new_name', text('新名字', 'New name'), args.new_name);
    fact('character_brief', text('人物要求', 'Character brief'), args.character_brief);
    fact('instruction', text('改写要求', 'Rewrite instructions'), args.instruction);
    if (operation === 'rewrite_start') {
      if (args.rewrite_mode === 'body') fact('chapter', text('章节', 'Chapter'), args.chapter_number);
      else {
        const portal = typeof window !== 'undefined' && window.LF_PORTAL;
        const label = portal?.fieldLabel?.(String(args.path || '').split('.').pop());
        const readable = typeof label === 'object' ? label[english ? 'en' : 'zh'] : label;
        fact('field', text('修改范围', 'Target field'), readable || text('所选字段', 'Selected field'));
        if (args.resource_type === 'character') fact('character', text('人物', 'Character'), args.resource_key);
        const volume = /^(?:volume|near_term):([1-9][0-9]*)$/.exec(args.resource_key || '');
        if (volume) fact('volume', text('卷', 'Volume'), volume[1]);
        const guide = /^(\d+):guide$/.exec(args.resource_key || '');
        if (guide) fact('chapter', text('章节', 'Chapter'), Number(guide[1]));
      }
    }
    const notes = {
      books_create: text('确认后建立作品，内容生成另行发起。', 'Creates the book; content generation is a separate action.'),
      books_update: text('确认后保存以上信息。', 'Saves the details shown above.'),
      character_create: text('确认后加入人物表。', 'Adds this character to the cast.'),
      character_rename: text('确认后修改人物姓名。已有正文中的姓名不会自动替换。', 'Renames the character. Existing chapter text is not changed.'),
      character_delete: text('确认后从人物表移除该人物，已有正文中的出场不会删除。', 'Removes this character from the cast; existing chapter appearances remain.'),
      rewrite_start: args.rewrite_mode === 'body'
        ? text('生成候选正文，确认保存后才会替换原文。', 'Produces a draft; a separate save approval replaces the original.')
        : text('流程完成后会直接保存指定字段的改写结果。', 'The workflow saves the rewritten field when it completes.')
    };
    return {
      title: singleCharacter ? text('生成一个人物', 'Generate one character') : titles[operation], facts,
      note: singleCharacter ? text('生成后加入人物表，其他人物保持不变。', 'Adds one generated character and keeps the existing cast.') : notes[operation],
      confirmLabel: singleCharacter || operation === 'rewrite_start' ? text('确认生成', 'Generate')
        : operation === 'character_delete' ? text('确认删除', 'Delete')
          : operation === 'books_create' || operation === 'character_create' ? text('确认创建', 'Create') : text('确认保存', 'Save'),
      ...(operation === 'books_create' ? { showBook: !!targetBookId(action),
        bookTitle: savedTitle || args.title, bookAvailable: !!(savedTitle || args.title),
        bookLabel: savedTitle || args.title ? `《${savedTitle || args.title}》` : '' } : {}),
      ...(operation === 'books_update' && savedTitle ? { bookTitle: savedTitle, bookAvailable: true, bookLabel: `《${savedTitle}》` } : {})
    };
  }
  return { parseObject, targetBookId, presentation };
});
