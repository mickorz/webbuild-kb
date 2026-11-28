{
/* Explicit current-conversation memory request; completion belongs to task UI. */
(function () {
  const {
    useEffect,
    useRef,
    useState
  } = React;
  const copy = {
    label: ['整理记忆', 'Organize memory'],
    scope: ['整理当前会话中尚未保存的记忆', 'Organize unsaved memories from this conversation'],
    submitting: ['正在提交…', 'Submitting…'],
    queued: ['已提交记忆整理，进度将在后台任务中显示。', 'Memory organization queued. Follow progress in background tasks.'],
    already_running: ['当前会话正在整理记忆，请在后台任务中查看进度。', 'This conversation is already being organized. Check background tasks.'],
    no_new_content: ['当前会话没有需要整理的新内容。', 'There is no new conversation content to organize.'],
    memory_consolidation_failed: ['记忆整理未能恢复，请稍后重试；若持续失败，请联系支持。', 'Memory organization could not resume. Try again later; contact support if it keeps failing.'],
    memory_unavailable: ['记忆整理暂不可用，请稍后再试。', 'Memory organization is unavailable. Try again later.'],
    assistant_session_busy: ['请先完成当前回复或处理待确认操作。', 'Finish the reply or pending action first.'],
    assistant_session_closed: ['这次对话已结束，请开启新会话后再试。', 'This conversation has ended. Start a new conversation.'],
    memory_request_unknown: ['暂时无法确认是否已提交，请查看后台任务后再试。', 'Submission could not be confirmed. Check background tasks before retrying.'],
    memory_unauthorized: ['记忆访问权限已变化，请刷新后再试。', 'Memory access has changed. Refresh and try again.'],
    memory_conflict: ['会话状态已变化，请刷新后再试。', 'The conversation has changed. Refresh and try again.']
  };
  function AssistantMemoryControl({
    sessionId,
    disabled,
    disabledReason,
    toast,
    onStatus,
    api = window.LF_API
  }) {
    const [pending, setPending] = useState(false);
    const requestRef = useRef(null);
    const liveRef = useRef(sessionId);
    liveRef.current = sessionId;
    const text = key => copy[key][window.CLANG === 'en' ? 1 : 0];
    useEffect(() => () => {
      liveRef.current = null;
      requestRef.current?.abort();
    }, []);
    async function submit() {
      if (disabled || !sessionId || requestRef.current) return;
      const controller = new AbortController();
      requestRef.current = controller;
      setPending(true);
      onStatus?.({
        status: 'submitting'
      });
      const current = () => liveRef.current === sessionId && requestRef.current === controller;
      try {
        const result = await api.consolidateAssistantMemory(sessionId, {
          signal: controller.signal
        });
        if (!['queued', 'already_running', 'no_new_content'].includes(result?.status)) throw new Error('Invalid memory response');
        if (current()) {
          if (onStatus) onStatus(result);else toast?.(text(result.status));
        }
      } catch (error) {
        if (current() && !controller.signal.aborted) {
          const code = error?.body?.detail?.code || error?.detail?.code || error?.code;
          const status = Object.hasOwn(copy, code) ? code : 'memory_request_unknown';
          if (onStatus) onStatus({
            status,
            message: text(status)
          });else toast?.(text(status));
        }
      } finally {
        if (current()) setPending(false);
        if (requestRef.current === controller) requestRef.current = null;
      }
    }
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "asst-function-button",
      onClick: submit,
      disabled: disabled || !sessionId || pending,
      "aria-busy": pending,
      title: disabled && disabledReason ? disabledReason : text('scope'),
      "aria-description": disabled && disabledReason || undefined
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "layers",
      s: 16
    }), /*#__PURE__*/React.createElement("span", null, text(pending ? 'submitting' : 'label')));
  }
  window.AssistantMemoryControl = AssistantMemoryControl;
})();
}
