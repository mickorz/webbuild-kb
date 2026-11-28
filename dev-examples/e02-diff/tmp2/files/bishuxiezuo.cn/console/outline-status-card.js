{
/* Shared recovery surface for empty and already readable chapter outlines. */
function OutlineStatusCard({
  kind = 'pending',
  reading = false,
  readable = false,
  creditsRefunded = false,
  onRead,
  onGen
}) {
  const en = window.CLANG === 'en';
  const descriptions = {
    missing: ['根据本章简纲生成完整细纲。', 'Generate a full outline from this chapter brief.'],
    generation_failed: ['本次生成未完成，可以继续生成细纲。', 'This attempt did not finish. You can continue outline generation.'],
    cancelled: ['本次生成已取消，可以继续生成细纲。', 'This attempt was cancelled. You can continue outline generation.'],
    stopped: ['后续生成已停止，可以继续生成细纲。', 'The remaining generation stopped. You can continue outline generation.'],
    running: ['任务结束后会读取细纲，请勿重复生成。', 'The outline will be read when the task finishes. Do not start a duplicate.'],
    task_running: ['请等待当前章节任务结束后再生成细纲。', 'Wait for the current chapter task to finish before generating an outline.'],
    completed_pending: ['生成任务已完成，正在等待可读取的细纲结果。', 'Generation has completed. The outline result is not yet available to read.'],
    read_failed: ['暂时无法取得细纲，请重新读取。', 'The outline could not be retrieved. Retry reading.'],
    task_unknown: ['先重新读取，确认任务状态后再继续生成。', 'Retry reading to verify the task status before continuing generation.'],
    pending: ['尚未取得细纲结果，请重新读取。', 'The outline result has not been retrieved. Retry reading.']
  };
  const canGenerate = typeof onGen === 'function' && !readable && ['missing', 'generation_failed', 'cancelled', 'stopped'].includes(kind);
  const retry = kind !== 'missing';
  const tone = ['generation_failed', 'read_failed'].includes(kind) ? 'error' : canGenerate ? 'gold' : 'neutral';
  const icon = reading ? 'clock' : tone === 'error' ? 'bolt' : canGenerate ? 'run' : kind === 'completed_pending' ? 'check' : 'clock';
  const title = reading ? en ? 'Reading outline…' : '正在读取细纲…' : window.ChapterGuideStateCore.message(kind, en);
  const description = reading ? readable ? en ? 'Updating the status. The current outline is preserved.' : '正在更新状态，当前细纲已保留。' : en ? 'Retrieving this chapter outline. Please wait.' : '正在获取本章细纲，请稍候。' : readable ? en ? 'The current outline is preserved. Retry reading to update its status.' : '当前细纲已保留，可重新读取以更新状态。' : (descriptions[kind] || descriptions.pending)[en ? 1 : 0];
  return /*#__PURE__*/React.createElement("section", {
    className: "outline-status",
    "data-outline-state": kind,
    "data-tone": tone,
    "aria-busy": reading
  }, /*#__PURE__*/React.createElement("span", {
    className: "outline-status-icon",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: icon,
    s: 22
  })), /*#__PURE__*/React.createElement("div", {
    className: "outline-status-copy"
  }, /*#__PURE__*/React.createElement("div", {
    className: "outline-status-title",
    role: "status"
  }, title), /*#__PURE__*/React.createElement("p", {
    className: "outline-status-description"
  }, description, kind === 'generation_failed' && !reading && !readable && creditsRefunded && /*#__PURE__*/React.createElement(React.Fragment, null, " ", TC('generation_credits_refunded')))), /*#__PURE__*/React.createElement("div", {
    className: "outline-status-actions"
  }, onRead && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: 'c-btn' + (canGenerate ? '' : ' gold'),
    onClick: onRead,
    disabled: reading
  }, reading ? en ? 'Reading…' : '读取中…' : en ? 'Retry reading' : '重新读取'), canGenerate && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn gold",
    onClick: onGen,
    disabled: reading || !!(window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED())
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "run",
    s: 14,
    w: 2
  }), retry ? en ? 'Continue outline generation' : '继续生成细纲' : window.TC('bf_gen'))));
}
window.OutlineStatusCard = OutlineStatusCard;
}
