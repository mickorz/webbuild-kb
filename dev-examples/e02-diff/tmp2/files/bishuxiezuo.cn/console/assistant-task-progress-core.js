(function (root, factory) {
  const api = factory(root.ProseStageCore, root.AssistantActionCore, root.ProseDrawProgressCore);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AssistantTaskProgressCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function (Stage, Action, Draw) {
  const isGeneration = action => ['tasks_start', 'rewrite_start'].includes(action?.operation);
  const isProseDraw = action => Action ? Action.isProseDraw(action) : action?.operation === 'tasks_start'
    && action.arguments?.task_type === 'chapter_draft' && action.arguments?.prose_draw === true;
  const isSubmitted = action => isGeneration(action) && ['succeeded', 'completed'].includes(action.state)
    && (isProseDraw(action) || !!action.result_json?.id);
  const taskIdentity = action => JSON.stringify([action.id, action.session_id, action.book_link_id, action.operation,
    action.arguments_hash, action.arguments, isProseDraw(action) ? action.result_json : action.result_json?.id]);
  const taskOptions = (action, task) => Stage.taskOptions(task, action?.arguments);
  const resultTarget = (action, task = action?.result_json) => Stage.resultTarget(task, action?.arguments);
  const isBody = (action, task) => resultTarget(action, task)?.kind === 'body'
    || ['polish', 'post_hoc'].includes(action?.arguments?.task_type);
  const identities = tool => [tool?.id, tool?.call_id, tool?.tool_call_id, tool?.run_id].filter(Boolean);
  function toolIndex(action, segments) {
    const id = action.runtime_tool_call_id || action.call_id;
    return (segments || []).findIndex(segment => segment.type === 'tool' && identities(segment.tool).includes(id));
  }
  function segmentsOf(message) {
    return message.stream_segments || message.content_json?.presentation?.segments || [];
  }
  function anchor(action, messages) {
    const assistants = (messages || []).filter(message => message.role === 'assistant');
    return assistants.find(message => toolIndex(action, segmentsOf(message)) >= 0)
      || assistants.find(message => message.content_json?.presentation?.source_message_id === action.source_message_id);
  }
  // Split before folding process segments so the approval never disappears inside a disclosure.
  function insertCards(segments, cards, group, folded) {
    const output = [], remaining = new Set(cards || []);
    let start = 0;
    (segments || []).forEach((segment, index) => {
      const matches = [...remaining].filter(action => toolIndex(action, segments) === index);
      if (!matches.length) return;
      output.push(...group(segments.slice(start, index + 1), { folded }));
      matches.forEach(action => { output.push({ type: 'action_card', action }); remaining.delete(action); });
      start = index + 1;
    });
    output.push(...group((segments || []).slice(start), { folded }));
    remaining.forEach(action => output.push({ type: 'action_card', action }));
    return output;
  }
  function drawProjection(action, round, verified) {
    const receipt = Action?.proseDrawReceipt(action);
    const valid = receipt && round?.round_id === receipt.round_id
      && Number(round.chapter_number) === Number(receipt.chapter_number);
    const draw = { round: valid ? round : {}, readState: verified ? 'ready' : 'loading',
      cancelState: round?.cancel_state?.requested ? 'pending' : null,
      stopConfirmed: round?.cancel_state?.confirmed === true };
    const result = Draw?.project(draw, 'zh', action.arguments?.chapter_number);
    const kind = result?.kind || 'unknown';
    return { kind: 'prose_draw', roundId: receipt?.round_id, draw,
      status: ({ready:'completed',partial:'partial',closed:'closed',cancelled:'cancelled',failed:'failed'})[kind] || 'running',
      ready: !!(verified && valid && ['ready', 'partial'].includes(kind)), body: false, progress: null, stage: null };
  }
  function drawTerminal(round) {
    if (round.status === 'failed') return true;
    if (round.cancel_state?.requested || round.status === 'cancelled') return round.cancel_state?.confirmed === true;
    if (round.status === 'preparation_failed') return false;
    const rows = Draw.project({round}, 'zh', round.chapter_number).rows;
    return rows.some(row => ['ready', 'verifying'].includes(row.status))
      && rows.every(row => ['ready', 'verifying', 'failed', 'stopped'].includes(row.status));
  }
  function projection(action, task, verified = false) {
    if (isProseDraw(action)) return drawProjection(action, task, verified);
    const status = String(task?.status || 'queued').toLowerCase();
    const job = task?.result_cache?.engine_job;
    const options = taskOptions(action, task), body = isBody(action, task), result = resultTarget(action, task);
    const stage = status === 'running' ? Stage.current(options, job?.current_stage) : null;
    const numeric = typeof job?.progress === 'number' && job.progress >= 0 && job.progress <= 1
      ? Math.round(job.progress * 100) : null;
    const progress = Stage.supported(options) ? (stage ? Math.round(stage.p * 100) : null) : numeric;
    return { taskId: task?.id, status, progress: status === 'running' ? progress : null, stage,
      creditsRefunded: status === 'failed' && task?.credits_refunded === true,
      stageOptions: options, result, ready: status === 'completed' && (!(body || result) || verified), body };
  }
  function createMonitor(options) {
    const cache = new Map();
    let stopped = false, paused = false, flight = null, flightIdentity = null, epoch = 0;
    let controller = new AbortController();
    async function read(action) {
      const identity = taskIdentity(action), previous = cache.get(action.id), old = previous?._task_identity === identity ? previous : null;
      if (!isProseDraw(action) && old && !old.syncError && (old.ready || ['failed', 'cancelled', 'canceled', 'result_unavailable'].includes(old.status))) return;
      const owner = epoch, signal = controller.signal, current = () => !stopped && !paused && epoch === owner && !signal.aborted;
      try {
        if (isProseDraw(action)) {
          const receipt = Action?.proseDrawReceipt(action);
          if (!receipt || !Draw) throw new Error('Invalid draw receipt');
          const round = await options.fetchRound(receipt.book_link_id, receipt.round_id, { signal });
          if (!current()) return;
          if (!round || round.round_id !== receipt.round_id || Number(round.chapter_number) !== Number(receipt.chapter_number)
            || round.book_link_id != null && String(round.book_link_id) !== String(receipt.book_link_id)) throw new Error('Draw target mismatch');
          cache.set(action.id, { ...projection(action, round, true), _task_identity: identity });
          // Engine readiness can precede Portal's durable terminal receipt. Keep
          // using this observer until the existing delivery pump can see it.
          if (drawTerminal(round)) options.onDrawTerminal?.(action, round);
          return;
        }
        let task = await options.fetchTask(action.result_json.id, { signal });
        if (!current()) return;
        const visited = new Set();
        let awaitingSuccessor = false;
        let stoppedChain = false;
        while (task?.status === 'completed') {
          if (visited.has(task.id) || visited.size >= 8) throw new Error('Invalid task chain');
          visited.add(task.id);
          const chain = task.request_payload?.chapter_chain;
          const next = task.result_cache?.chapter_chain?.next_task_id;
          if (next) { task = await options.fetchTask(next, { signal }); if (!current()) return; continue; }
          stoppedChain = task.result_cache?.chapter_chain?.state === "stopped";
          awaitingSuccessor = !!(chain && Number(chain.step) + 1 < Number(chain.total));
          break;
        }
        if (!task || String(task.book_link_id) !== String(action.book_link_id)) throw new Error('Task target mismatch');
        let verified = false;
        if (task.status === 'completed' && !awaitingSuccessor && (isBody(action, task) || resultTarget(action, task))) {
          const chapter = Number(action.arguments.chapter_number);
          if (Number.isInteger(chapter) && chapter > 0) {
            const target = resultTarget(action, task);
            const result = isBody(action, task)
              ? await options.verifyBody(action.book_link_id, chapter, { signal })
              : await options.verifyResult(action.book_link_id, chapter, target.kind, { signal });
            if (!current()) return;
            verified = !!result?.verified;
          }
        }
        const view = projection(action, task, verified);
        if (task.status === "completed" && !awaitingSuccessor && !view.ready) {
          view.readAttempts = (old?.readAttempts || 0) + 1;
          if (view.readAttempts >= 3) view.status = "result_unavailable";
        }
        if (awaitingSuccessor) {
          view.status = stoppedChain ? 'failed' : 'running';
          view.ready = false;
          view.progress = null;
          view.stage = null;
        }
        if (current()) cache.set(action.id, { ...view, _task_identity: identity });
      } catch (error) {
        if (current()) cache.set(action.id, { ...(old || projection(action, action.result_json)), _task_identity: identity,
          ready: false, stage: null, progress: null, syncError: true });
      }
    }
    return {
      poll(actions) {
        if (stopped || paused) return Promise.resolve();
        const list = (actions || []).filter(isSubmitted);
        const identity = JSON.stringify(list.map(taskIdentity));
        if (flight) return identity === flightIdentity ? flight : flight.then(() => this.poll(actions));
        const ids = new Set(list.map(action => action.id));
        for (const id of cache.keys()) if (!ids.has(id)) cache.delete(id);
        const owner = epoch;
        flightIdentity = identity;
        const pending = (async () => {
          for (let i = 0; i < list.length && !stopped && !paused && epoch === owner; i += 4) await Promise.all(list.slice(i, i + 4).map(read));
          if (!stopped && !paused && epoch === owner) options.onChange(Object.fromEntries(cache));
        })().finally(() => { if (flight === pending) { flight = null; flightIdentity = null; } });
        flight = pending;
        return flight;
      },
      invalidate(actionId) { cache.delete(actionId); },
      current: () => Object.fromEntries(cache),
      pause() { paused = true; epoch++; controller.abort(); flight = null; flightIdentity = null; },
      resume() { if (stopped) return; paused = false; if (controller.signal.aborted) controller = new AbortController(); },
      stop() { stopped = true; epoch++; controller.abort(); cache.clear(); flight = null; flightIdentity = null; }
    };
  }
  return { isGeneration, isSubmitted, isProseDraw, taskIdentity, resultTarget, isBody, toolIndex, anchor, insertCards, projection, createMonitor };
});
