(function (root) {
  const activeStatuses = ['queued', 'running', 'retrying'];
  const failedStatuses = ['failed', 'cancelled', 'canceled'];
  const messages = {
    missing: ['细纲尚未生成', 'Outline not generated yet'],
    generation_failed: ['细纲生成失败', 'Outline generation failed'],
    cancelled: ['细纲生成已取消', 'Outline generation cancelled'],
    stopped: ['细纲生成已停止', 'Outline generation stopped'],
    running: ['细纲生成中', 'Generating outline'],
    task_running: ['章节任务进行中', 'Chapter task in progress'],
    completed_pending: ['细纲生成已完成，待同步', 'Outline completed, pending synchronization'],
    read_failed: ['细纲读取失败', 'Unable to read outline'],
    pending: ['细纲待同步', 'Outline pending synchronization'],
    task_unknown: ['章节任务状态待确认', 'Chapter task status not yet verified']
  };
  const statusOf = task => String(task && task.status || '').toLowerCase();
  const payloadOf = task => task && task.request_payload || {};
  const chainOf = task => payloadOf(task).chapter_chain || {};
  const chainResult = task => task && task.result_cache && task.result_cache.chapter_chain || {};
  const typeOf = task => String(task && task.task_type || '');
  const isChapterTask = task => /^chapter_(draft|world_state|outline_director|character_state|writer|full)/.test(typeOf(task));
  function taskChapter(task) {
    const payload = payloadOf(task);
    return Number(task.chapter_number ?? (payload.engine_payload || {}).chapter_number ?? payload.chapter_number ?? payload.chapter);
  }
  function guideStage(task) {
    const type = typeOf(task), mode = payloadOf(task).execution_mode;
    if (type === 'chapter_world_state' || mode === 'world_state') return 'world';
    if (type === 'chapter_outline_director' || /^chapter_full_/.test(type)) return 'guide';
    if (['chapter_draft', 'chapter_draft_single'].includes(type)) {
      if (mode === 'outline_director' || mode === 'full' || !mode) return 'guide';
    }
    return null;
  }
  function newestFirst(a, b) {
    for (const field of ['created_at', 'updated_at']) {
      const left = Date.parse(a[field] || ''), right = Date.parse(b[field] || '');
      if (Number.isFinite(left) && Number.isFinite(right) && left !== right) return right - left;
      if (Number.isFinite(left) !== Number.isFinite(right)) return Number.isFinite(right) ? 1 : -1;
    }
    const left = Number(a.id), right = Number(b.id);
    return Number.isFinite(left) && Number.isFinite(right) ? right - left : 0;
  }
  function taskState(tasks, bookId, chapterNumber, known) {
    const bookTasks = (Array.isArray(tasks) ? tasks : []).filter(task => task
      && String(task.book_link_id) === String(bookId) && isChapterTask(task));
    const targetTasks = bookTasks.filter(task => taskChapter(task) === Number(chapterNumber));
    const candidates = targetTasks.filter(task => {
      const stage = guideStage(task), chain = chainOf(task);
      if (stage === 'guide') return true;
      if (stage !== 'world') return false;
      if (statusOf(task) !== 'completed') return true;
      if (!task.request_payload) return true;
      // The successful world root is waiting for its server-owned outline
      // successor. A known successor owns the outcome of this same attempt.
      if (chain.kind !== 'outline' || Number(chain.step) !== 0 || Number(chain.total) !== 2) return false;
      return !targetTasks.some(other => other !== task && chain.id
        && String(chainOf(other).id) === String(chain.id) && Number(chainOf(other).step) > 0);
    }).sort(newestFirst);
    const latest = candidates[0] || null;
    const worldRoot = !!(latest && guideStage(latest) === 'world' && statusOf(latest) === 'completed');
    const unknown = worldRoot && !latest.request_payload;
    const stopped = worldRoot && String(chainResult(latest).state || '').toLowerCase() === 'stopped';
    const waiting = worldRoot && !unknown && !stopped;
    const active = bookTasks.filter(task => activeStatuses.includes(statusOf(task)));
    const status = stopped ? 'stopped' : unknown ? 'awaiting_metadata' : waiting ? 'waiting_successor' : statusOf(latest);
    const activeKey = active.map(task => [String(task.id), statusOf(task)]).sort();
    return {
      known: known === true, latest, status, waiting, unknown, active: active.length > 0,
      targetActive: active.some(task => taskChapter(task) === Number(chapterNumber) && guideStage(task)),
      completed: !!(latest && guideStage(latest) === 'guide' && status === 'completed'),
      hasCompleted: targetTasks.some(task => guideStage(task) === 'guide' && statusOf(task) === 'completed'),
      key: JSON.stringify([known === true, latest && String(latest.id), statusOf(latest),
        worldRoot && chainResult(latest).state || '', worldRoot && chainResult(latest).reason || '',
        worldRoot && latest.updated_at || '', activeKey])
    };
  }
  function project(options) {
    const opts = options || {}, sync = opts.sync || {}, tasks = opts.taskState || {};
    const completed = tasks.completed || (!tasks.latest && !!sync.taskCompleted);
    const active = !!(tasks.active || tasks.waiting || opts.localRunning);
    let kind;
    if (active) kind = tasks.targetActive || tasks.waiting || opts.localRunning ? 'running' : 'task_running';
    else if (completed) kind = 'completed_pending';
    else if (sync.status === 'failed') kind = 'read_failed';
    else if (tasks.unknown) kind = 'task_unknown';
    else if (sync.status !== 'missing') kind = 'pending';
    else if (!tasks.known) kind = 'task_unknown';
    else if (tasks.status === 'stopped') kind = 'stopped';
    else if (failedStatuses.includes(tasks.status)) kind = tasks.status === 'failed' ? 'generation_failed' : 'cancelled';
    else kind = 'missing';
    const readable = !!opts.readable;
    return {
      kind: readable ? 'ready' : kind,
      noticeKind: readable && tasks.unknown ? 'task_unknown' : readable && tasks.waiting ? 'running'
        : readable && sync.status !== 'ready' ? (completed ? 'completed_pending' : sync.status === 'failed' ? 'read_failed' : 'pending') : null,
      canGenerate: !readable && !active && !tasks.unknown && !completed && tasks.known === true && sync.status === 'missing',
      active, busy: active || !!tasks.unknown, completed, reading: !!sync.reading,
      shouldRead: !sync.reading && (tasks.unknown || tasks.waiting || (sync.status !== 'ready'
        && (['pending', 'skipped'].includes(sync.status) || completed))),
      creditsRefunded: kind === 'generation_failed' && tasks.latest?.credits_refunded === true,
      taskKey: tasks.key
    };
  }
  const api = { taskState, project, message: (kind, en) => (messages[kind] || messages.pending)[en ? 1 : 0] };
  if (root) root.ChapterGuideStateCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
