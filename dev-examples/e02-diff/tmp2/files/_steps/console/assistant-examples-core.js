(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantExamplesCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const MAX_EXAMPLES = 3;

  function chapterNumber(pageContext) {
    const number = Number(pageContext && pageContext.chapter_number);
    return Number.isInteger(number) && number > 0 ? number : null;
  }

  function volumeNumber(pageContext) {
    const number = Number(pageContext && pageContext.volume_number);
    return Number.isInteger(number) && number > 0 ? number : null;
  }

  function example(id, copyKey, values) {
    return { id, copyKey, values: values || {} };
  }

  function examplesForPage(pageContext) {
    const context = pageContext && typeof pageContext === "object" ? pageContext : null;
    const surface = context && context.surface;
    const resourceType = context && context.resource_type;
    const chapter = chapterNumber(context);
    const volume = volumeNumber(context);
    let items = [];

    if (resourceType === "character") {
      items = [
        example("character-check", "asst_example_character_check"),
        example("character-voice", "asst_example_character_voice"),
        example("character-next", "asst_example_next_step")
      ];
    } else if (resourceType === "book" || (context && context.resource_key === "story_plan")) {
      items = [
        example("story-check", "asst_example_story_check"),
        example("story-next", "asst_example_next_step"),
        example("story-account", "asst_example_account")
      ];
    } else if (resourceType === "outline") {
      items = [
        example("outline-check", "asst_example_outline_check", volume ? { volume } : {}),
        example("outline-next", "asst_example_next_step"),
        example("outline-account", "asst_example_account")
      ];
    } else if (surface === "writing" || resourceType === "chapter_body") {
      items = chapter ? [
        example("writing-continuity", "asst_example_chapter_continuity", { chapter }),
        example("writing-opening", "asst_example_chapter_opening", { chapter }),
        example("writing-hook", "asst_example_chapter_hook", { chapter })
      ] : [
        example("writing-continuity", "asst_example_writing_continuity"),
        example("writing-opening", "asst_example_writing_opening"),
        example("writing-hook", "asst_example_writing_hook")
      ];
    } else if (surface === "workbench" || resourceType === "chapter_outline" || resourceType === "chapter") {
      items = chapter ? [
        example("guide-check", "asst_example_guide_check", { chapter }),
        example("guide-draft", "asst_example_guide_draft", { chapter }),
        example("guide-link", "asst_example_chapter_continuity", { chapter })
      ] : [
        example("guide-check", "asst_example_guide_check_generic"),
        example("guide-draft", "asst_example_guide_draft_generic"),
        example("guide-next", "asst_example_next_step")
      ];
    } else if (surface === "world" || resourceType === "world") {
      items = [
        example("world-check", "asst_example_world_check"),
        example("world-gap", "asst_example_world_gap"),
        example("world-conflict", "asst_example_world_conflict")
      ];
    } else if (surface === "create" || resourceType === "book_creation") {
      items = [
        example("create-progress", "asst_example_create_progress"),
        example("create-world", "asst_example_create_world"),
        example("create-cast", "asst_example_create_cast")
      ];
    } else if (surface === "shelf" || resourceType === "bookshelf") {
      items = [
        example("shelf-account", "asst_example_account"),
        example("shelf-next", "asst_example_shelf_next"),
        example("shelf-new", "asst_example_shelf_new")
      ];
    } else {
      items = [
        example("default-account", "asst_example_account"),
        example("default-next", "asst_example_next_step"),
        example("default-work", "asst_example_check_work")
      ];
    }

    return items.slice(0, MAX_EXAMPLES);
  }

  function canShowExamples(options) {
    const opts = options || {};
    if (Array.isArray(opts.messages) && opts.messages.length) return false;
    if (String(opts.draft || "").trim()) return false;
    if (opts.pendingSend) return false;
    return true;
  }

  function canApplyExample(options) {
    const opts = options || {};
    if (opts.locked) return false;
    if (String(opts.draft || "").trim()) return false;
    if (opts.pendingSend) return false;
    const text = String(opts.text || "").trim();
    return !!text;
  }

  function applyExampleDraft(options) {
    const opts = options || {};
    const text = String(opts.text || "").trim();
    if (!canApplyExample(opts)) {
      return { draft: typeof opts.draft === "string" ? opts.draft : "", applied: false };
    }
    return { draft: text, applied: true };
  }

  return {
    MAX_EXAMPLES,
    examplesForPage,
    canShowExamples,
    canApplyExample,
    applyExampleDraft
  };
});
