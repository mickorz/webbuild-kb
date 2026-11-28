{
/* Memory task notices are view-only events, never model conversation messages. */
(function () {
  const active = status => ['queued', 'running', 'retrying'].includes(status);
  function useMemoryTasks({
    accountId,
    sessionId,
    open,
    messages,
    api = window.LF_API,
    branchId
  }) {
    const scope = String(accountId) + ':' + (sessionId || '') + (branchId ? ':' + branchId : '');
    const [state, setState] = React.useState({
      scope,
      items: [],
      pending: null
    });
    const live = React.useRef(scope),
      refresh = React.useRef(null),
      serial = React.useRef(0);
    live.current = scope;
    React.useEffect(() => {
      if (!open) setState(previous => previous.scope === scope && previous.pending?.status === 'submitting' ? {
        ...previous,
        pending: {
          ...previous.pending,
          status: 'memory_request_unknown'
        }
      } : previous);
      if (!open || !sessionId || !api?.assistantMemoryTasks) return;
      let stopped = false,
        timer,
        flight,
        afterSubmit,
        followUp = false;
      const controller = new AbortController();
      const current = () => !stopped && live.current === scope;
      async function load(fresh = false) {
        if (!current()) return;
        if (flight) {
          if (fresh) followUp = true;
          return flight;
        }
        clearTimeout(timer);
        flight = Promise.resolve().then(async () => {
          try {
            if (document.hidden) return;
            const result = await api.assistantMemoryTasks(sessionId, {
              signal: controller.signal
            });
            if (!current() || !Array.isArray(result?.items)) return;
            const items = branchId ? result.items.filter(item => !item.branch_id || item.branch_id === branchId) : result.items;
            setState(previous => {
              const prior = previous.scope === scope ? previous : {
                items: [],
                pending: null
              };
              let pending = prior.pending;
              if (pending && ['submitting', 'queued', 'already_running', 'memory_request_unknown'].includes(pending.status)) {
                const requestedAt = pending.requested_at || pending.created_at;
                const matched = items.find(item => pending.status === 'already_running' && (active(item.status) || Date.parse(item.updated_at) >= Date.parse(requestedAt)) || Date.parse(item.created_at) >= Date.parse(requestedAt));
                if (matched) pending = null;
              }
              return {
                scope,
                items,
                pending
              };
            });
            const owner = window.LF_PORTAL_STATE?.me?.id;
            if (String(owner) === String(accountId)) items.forEach(item => window.LF_PORTAL?.rememberTask?.({
              id: item.id,
              status: item.status,
              created_at: item.created_at,
              updated_at: item.updated_at,
              book_link_id: null,
              task_type: 'memory_extract'
            }));
          } catch (_) {/* Keep the last confirmed state; a read failure is not task failure. */}
        }).finally(() => {
          flight = null;
          if (current()) timer = setTimeout(load, followUp ? 0 : 5000);
          followUp = false;
        });
        return flight;
      }
      refresh.current = () => {
        clearTimeout(afterSubmit);
        // Give the scheduler a short chance to publish its task. If a prior
        // read is in flight, query again afterwards instead of reusing it.
        afterSubmit = setTimeout(() => load(true), 700);
      };
      load();
      return () => {
        stopped = true;
        controller.abort();
        clearTimeout(timer);
        clearTimeout(afterSubmit);
        refresh.current = null;
      };
    }, [scope, open, api, branchId]);
    function onStatus(result) {
      if (live.current !== scope) return;
      setState(previous => {
        const prior = previous.scope === scope ? previous : {
          items: [],
          pending: null
        };
        if (result.status === 'submitting') return {
          scope,
          items: prior.items,
          pending: {
            id: 'memory-request-' + ++serial.current,
            status: 'submitting',
            anchor_message_id: messages?.at(-1)?.id || null,
            created_at: new Date().toISOString()
          }
        };
        return {
          scope,
          items: prior.items,
          pending: prior.pending ? {
            ...prior.pending,
            ...result
          } : null
        };
      });
      if (result.status !== 'submitting') {
        refresh.current?.();
        if (['queued', 'already_running'].includes(result.status)) {
          Promise.resolve().then(() => window.LF_PORTAL?.syncRunningTasks?.({
            force: true,
            coordinated: false
          })).catch(() => {});
        }
      }
    }
    const value = state.scope === scope ? state : {
      items: [],
      pending: null
    };
    return {
      items: [...value.items, ...(value.pending ? [value.pending] : [])],
      onStatus
    };
  }
  function Notice({
    item
  }) {
    const en = window.CLANG === 'en';
    let text;
    const copy = {
      submitting: ['正在提交记忆整理…', 'Submitting memory organization…'],
      queued: ['记忆整理已提交，等待处理', 'Memory organization queued'],
      already_running: ['正在整理记忆', 'Organizing memory'],
      running: ['正在整理记忆', 'Organizing memory'],
      retrying: ['记忆整理正在重试', 'Retrying memory organization'],
      failed: ['记忆整理失败，暂时无法确定原因', 'Memory organization failed; the cause is not yet known.'],
      completed: ['记忆整理已完成', 'Memory organization completed'],
      cancelled: ['记忆整理已取消', 'Memory organization cancelled'],
      canceled: ['记忆整理已取消', 'Memory organization cancelled'],
      no_new_content: ['当前会话没有需要整理的新内容', 'No new conversation content to organize'],
      memory_request_unknown: ['暂时无法确认提交结果，请稍后检查后台任务', 'Submission is unconfirmed. Check background tasks shortly.']
    };
    text = item.message || (copy[item.status] || copy.memory_request_unknown)[en ? 1 : 0];
    if (item.status === 'failed') {
      const reasons = {
        memory_limited: ['记忆条数已达上限，请清理旧记忆或扩容后再整理', 'Memory limit reached. Remove old memories or increase capacity before organizing again.'],
        memory_capacity_unavailable: ['暂时无法核对记忆容量，请稍后重试', 'Memory capacity could not be checked. Try again later.'],
        invalid_source: ['提炼内容的来源不一致，未能完成整理', 'Memory organization failed because the extracted sources were inconsistent.'],
        invalid_output: ['提炼结果格式异常，未能完成整理', 'Memory organization failed because the extraction format was invalid.'],
        provider_auth: ['记忆服务配置异常，修复后才能继续整理', 'Memory service configuration needs to be fixed before organizing again.'],
        timeout: ['记忆整理超时，请稍后查看结果', 'Memory organization timed out. Check the result later.'],
        unauthorized: ['没有权限整理这段会话的记忆', 'You do not have permission to organize this conversation’s memory.'],
        budget: ['这段会话内容过长，暂时无法整理', 'This conversation is too long to organize at present.'],
        retain_unconfirmed: ['记忆写入结果尚未确认，请稍后查看', 'Memory writes are not yet confirmed. Check again later.']
      };
      text = (reasons[item.error_code] || copy.failed)[en ? 1 : 0];
      if (Number.isInteger(item.written_count) && item.written_count > 0) {
        text = (en ? `${item.written_count} saved · ` : `已写入 ${item.written_count} 条 · `) + text;
      }
    }
    if (item.status === 'failed' && item.credits_refunded === true) {
      text += ' ' + TC('generation_credits_refunded');
    }
    if (item.status === 'completed' && Number.isInteger(item.written_count)) {
      text = en ? `Memory organized · ${item.written_count} saved` : `记忆整理完成 · 已写入 ${item.written_count} 条`;
      if (item.deduplicated_count > 0) text += en ? ` · ${item.deduplicated_count} duplicates skipped` : ` · 跳过 ${item.deduplicated_count} 条重复`;
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-memory-notice",
      role: "status",
      "data-memory-task": item.id,
      "data-status": item.status,
      "aria-busy": item.status === 'submitting' || active(item.status)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: item.status === 'completed' ? 'check' : 'layers',
      s: 14
    }), /*#__PURE__*/React.createElement("span", null, text));
  }
  function place(items, messages) {
    const ids = new Set((messages || []).map(message => message.id));
    const result = {
      earlier: [],
      bySource: {},
      pending: []
    };
    (items || []).forEach(item => {
      if (ids.has(item.anchor_message_id)) (result.bySource[item.anchor_message_id] ||= []).push(item);else if (messages?.length && Date.parse(item.created_at) < Date.parse(messages[0].created_at)) result.earlier.push(item);else result.pending.push(item);
    });
    return result;
  }
  window.AssistantMemoryStatus = {
    useMemoryTasks,
    Notice,
    place
  };
})();
}
