{
/* Task submission and generated content have separate lifecycles. */
(function () {
  function useAssistantTaskProgress({
    open,
    sessionId,
    accountId,
    branchId,
    revoked = false,
    actionsRef,
    actionsVersion,
    onDrawTerminal
  }) {
    const Core = window.AssistantTaskProgressCore;
    const scope = JSON.stringify([accountId, sessionId, branchId, revoked]);
    const owner = React.useRef(null),
      latest = React.useRef(null);
    const [observed, setObserved] = React.useState({
      scope,
      items: {}
    });
    latest.current = {
      open,
      revoked,
      actionsRef,
      onDrawTerminal
    };
    if (owner.current?.scope !== scope) {
      owner.current?.monitor.stop();
      const entry = {
        scope,
        active: false,
        staged: null
      };
      entry.monitor = Core.createMonitor({
        fetchTask: (id, options) => window.LF_API.engineTask(id, options),
        fetchRound: (bookId, roundId, options) => window.LF_API.request(window.ProseDrawFlowCore.path(bookId, roundId), options),
        verifyBody: (id, chapter, options) => window.LF_PORTAL.verifyChapterBody(id, chapter, {
          ...options,
          attempts: 1
        }),
        verifyResult: (id, chapter, kind, options) => window.LF_PORTAL.verifyChapterResult(id, chapter, kind, options),
        onDrawTerminal: (action, round) => {
          if (owner.current === entry && entry.active && latest.current.open && !latest.current.revoked && action.version_current !== false) latest.current.onDrawTerminal?.(action, round);
        },
        onChange: items => {
          if (owner.current === entry && entry.active && !latest.current.revoked) setObserved(previous => {
            const next = {
              ...items
            };
            if (previous.scope === scope) for (const action of latest.current.actionsRef.current || []) {
              const key = Core.taskIdentity(action),
                retained = previous.items[action.id];
              if (retained?._task_identity === key && next[action.id]?._task_identity !== key) next[action.id] = retained;
            }
            return {
              scope,
              items: next
            };
          });
        }
      });
      owner.current = entry;
    }
    const entry = owner.current;
    const selected = actions => (actions || []).filter(action => action.session_id === sessionId && Core.isSubmitted(action));
    const currentActions = selected(actionsRef.current);
    const identity = JSON.stringify(currentActions.map(Core.taskIdentity));
    if (entry.staged && identity === JSON.stringify(entry.staged.map(Core.taskIdentity))) entry.staged = null;
    React.useEffect(() => {
      if (!open || !sessionId || revoked) {
        entry.monitor.pause();
        return;
      }
      let active = true,
        timer = null;
      entry.active = true;
      entry.monitor.resume();
      // The staged first-display dependencies take priority over the old display
      // while a replacement is being prepared; both paths remain read-only.
      const refresh = () => entry.monitor.poll(entry.staged || selected(latest.current.actionsRef.current));
      const tick = async () => {
        await refresh();
        if (active) timer = setTimeout(tick, 5000);
      };
      void tick();
      window.addEventListener('lf:assistant-task-started', refresh);
      window.addEventListener('lf:assistant-draw-started', refresh);
      window.addEventListener('lf:task-terminal', refresh);
      return () => {
        active = false;
        entry.active = false;
        clearTimeout(timer);
        entry.monitor.pause();
        window.removeEventListener('lf:assistant-task-started', refresh);
        window.removeEventListener('lf:assistant-draw-started', refresh);
        window.removeEventListener('lf:task-terminal', refresh);
      };
    }, [open, scope]);
    React.useEffect(() => () => entry.monitor.pause(), [scope]);
    React.useEffect(() => {
      if (open && !revoked) void entry.monitor.poll(entry.staged || selected(actionsRef.current));
    }, [identity, actionsVersion, open, scope]);
    const items = React.useMemo(() => {
      const known = entry.monitor.current(),
        retained = observed.scope === scope ? observed.items : {},
        values = {};
      if (!revoked) for (const action of currentActions) {
        const key = Core.taskIdentity(action);
        const progress = known[action.id]?._task_identity === key ? known[action.id] : retained[action.id]?._task_identity === key ? retained[action.id] : null;
        if (progress) values[action.id] = progress;
      }
      return values;
    }, [scope, identity, observed, revoked]);
    return {
      items,
      prepare: async (actions, options = {}) => {
        const valid = () => owner.current === entry && latest.current.open && !latest.current.revoked && !options.signal?.aborted && (!options.isCurrent || options.isCurrent());
        if (!valid()) throw Object.assign(Error('read_cancelled'), {
          code: 'read_cancelled'
        });
        entry.staged = selected(actions);
        entry.monitor.resume();
        await entry.monitor.poll(entry.staged);
        if (!valid()) throw Object.assign(Error('read_cancelled'), {
          code: 'read_cancelled'
        });
      },
      check: actionId => {
        if (!open || revoked) return;
        entry.monitor.invalidate(actionId);
        void entry.monitor.poll(currentActions);
      }
    };
  }
  window.useAssistantTaskProgress = useAssistantTaskProgress;
  function AssistantTaskProgress({
    action,
    progress,
    onView,
    onResume,
    onCheck,
    busy
  }) {
    const Core = window.AssistantTaskProgressCore;
    const Action = window.AssistantActionCore;
    const en = window.CLANG === 'en';
    const copy = (zh, english) => en ? english : zh;
    const view = progress || Core.projection(action, action.result_json);
    const drawing = Core.isProseDraw(action);
    const roundView = drawing ? window.ProseDrawProgressCore.project(view.draw, window.CLANG, action.arguments?.chapter_number) : null;
    // Until a current task read has returned, never advertise an old submission as a ready result.
    const ready = !!progress?.ready && !view.syncError;
    const labels = {
      queued: copy('等待处理', 'Queued'),
      running: copy('正在生成', 'Generating'),
      retrying: copy('正在重试', 'Retrying'),
      cancelling: copy('正在取消', 'Cancelling'),
      cancelled: copy('已取消', 'Cancelled'),
      canceled: copy('已取消', 'Cancelled'),
      failed: copy('生成未完成', 'Generation failed'),
      result_unavailable: copy('已完成，结果暂未读取', 'Completed, result not loaded'),
      completed: ready ? action.operation === 'rewrite_start' && action.arguments?.rewrite_mode === 'body' ? copy('候选正文已生成，尚未保存', 'Draft ready, not saved') : copy('已完成', 'Completed') : copy('结果同步中', 'Syncing result')
    };
    const title = !drawing && view.result ? Action.interpolate(TC(view.result.titleKey), {
      chapter: action.arguments?.chapter_number
    }) : Action.actionPresentation(action, (key, values) => Action.interpolate(TC(key), values)).title;
    const drawLabels = {
      running: roundView?.preparing ? copy('正在准备', 'Preparing') : copy('正在生成', 'Generating'),
      ready: copy('候选已生成，尚未采用', 'Candidates ready, not adopted'),
      partial: copy('一篇已生成，一篇生成未完成', 'One candidate ready, one failed'),
      failed: copy('生成未完成', 'Generation failed'),
      verifying: copy('正在核对状态', 'Checking status'),
      stopping: copy('正在确认停止', 'Confirming stop'),
      cancelled: copy('本轮已结束', 'Round ended'),
      cancel_unknown: copy('停止请求待确认', 'Stop request unconfirmed'),
      unknown: copy('进度暂未同步', 'Progress unavailable'),
      read_failed: copy('进度暂未同步', 'Progress unavailable'),
      closed: ['adopted', 'ready', 'post_process_failed'].includes(view.draw?.round?.status) ? copy('候选已采用', 'Candidate adopted') : view.draw?.round?.current_adoption_id ? copy('正在采用', 'Adopting') : copy('本轮已结束', 'Round ended')
    };
    const status = view.syncError ? copy('进度暂未同步', 'Progress unavailable') : drawing ? drawLabels[roundView.kind] || copy('正在核对状态', 'Checking status') : labels[view.status] || copy('正在核对状态', 'Checking status');
    const creditsRefunded = !view.syncError && (drawing ? roundView?.creditsRefunded : view.creditsRefunded);
    const target = ready ? window.AssistantReceiptCore.viewTarget(action, {
      taskReady: true,
      resultTarget: view.result
    }) : null;
    const stage = !drawing && view.status === 'running' && !view.syncError ? view.stage : null;
    const percentage = !drawing && view.status === 'running' && !view.syncError ? view.progress : null;
    const showRows = drawing && !view.syncError && ['running', 'ready', 'partial', 'failed', 'closed', 'cancelled'].includes(roundView.kind) && (view.draw?.round?.display_order?.length === 2 || roundView.kind === 'failed');
    return /*#__PURE__*/React.createElement("section", {
      className: "asst-task-progress",
      "aria-label": title,
      "data-status": view.status
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-task-progress__heading"
    }, /*#__PURE__*/React.createElement("strong", null, title), /*#__PURE__*/React.createElement("span", {
      role: "status"
    }, status, percentage != null ? ` · ${percentage}%` : '')), /*#__PURE__*/React.createElement("div", {
      className: "asst-task-progress__meta"
    }, /*#__PURE__*/React.createElement("span", null, action.book_title ? `《${action.book_title}》` : copy('目标作品', 'Target book')), target && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: () => onView(action, target)
    }, drawing ? copy(roundView.kind === 'partial' ? '查看可用候选' : '查看候选', roundView.kind === 'partial' ? 'View available candidate' : 'View candidates') : view.result ? TC(view.result.labelKey) : copy(view.body ? '查看正文' : '查看结果', view.body ? 'Read chapter' : 'View result')), (view.status === 'result_unavailable' || drawing && (view.syncError || roundView.canRefresh)) && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: onCheck
    }, drawing ? copy('检查结果', 'Check result') : copy('重新读取', 'Reload result')), action.version_current !== false && action.continuation_pending && !busy && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: onResume
    }, copy('继续回复', 'Continue reply')), stage && /*#__PURE__*/React.createElement("span", {
      className: "asst-task-progress__stage",
      role: "status",
      "data-stage": stage.id
    }, en ? stage.en : stage.zh)), creditsRefunded && /*#__PURE__*/React.createElement("div", {
      className: "asst-task-progress__candidates",
      role: "status"
    }, TC('generation_credits_refunded')), showRows && /*#__PURE__*/React.createElement("div", {
      className: "asst-task-progress__candidates"
    }, roundView.rows.map(row => /*#__PURE__*/React.createElement("span", {
      key: row.letter
    }, row.label, " \xB7 ", row.statusLabel, !creditsRefunded && row.creditsRefunded && /*#__PURE__*/React.createElement(React.Fragment, null, " \xB7 ", TC('generation_credits_refunded'))))), percentage != null && /*#__PURE__*/React.createElement("progress", {
      value: percentage,
      max: "100",
      "aria-label": copy('生成进度', 'Generation progress')
    }));
  }
  window.AssistantTaskProgress = AssistantTaskProgress;
})();
}
