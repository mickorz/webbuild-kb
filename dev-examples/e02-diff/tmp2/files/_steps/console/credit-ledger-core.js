/* Personal credit ledger: translate system events without rewriting ledger data. */
(function (root) {
  'use strict';
  const TYPES = {
    consume: ['消费', 'Spend'], refund: ['解冻', 'Hold release'], reserve: ['冻结', 'Hold'],
    grant: ['发放', 'Grant'], expire: ['到期清零', 'Expired'],
    clawback: ['追回', 'Clawback'],
  };
  const TASKS = {
    world_build: ['世界观构建', 'World building'], character: ['角色塑造', 'Character building'],
    character_create: ['AI 新增角色', 'Add a character'], story_plan: ['故事规划', 'Story planning'],
    outline: ['卷纲与近纲', 'Arc and near-term outline'], field_rewrite: ['AI 改写', 'AI rewrite'],
    chapter_draft: ['章节生成', 'Chapter generation'], chapter_world_state: ['世界状态更新', 'World-state update'],
    chapter_outline_director: ['单章细纲', 'Chapter outline'], chapter_character_state: ['角色状态更新', 'Character-state update'],
    chapter_writer_single: ['正文生成 · 单写手', 'Draft · Single writer'],
    chapter_writer_muti: ['正文生成 · 写手群', 'Draft · Writer room'],
    chapter_full_single: ['整章生成 · 单写手', 'Full chapter · Single writer'],
    chapter_full_muti: ['整章生成 · 写手群', 'Full chapter · Writer room'],
    prose_draw_writer: ['抽卡正文 · 单篇', 'Draw draft · One candidate'],
    prose_draw_prepare: ['抽卡准备', 'Draw preparation'],
    prose_draw_post_process: ['候选采用后处理', 'Draft adoption processing'],
    polish: ['全章润色', 'Full-chapter polish'], post_hoc: ['回归后验', 'Post-hoc review'],
    memory_extract: ['会话记忆提取', 'Session memory'],
    automatic_book_create: ['自动建书', 'Automatic book creation'], cruise: ['自动巡航', 'Automatic cruise'],
  };
  const EXACT = [
    ['Reserve complete cruise', '冻结自动巡航笔力', 'Hold credits for automatic cruise'],
    ['Cruise stopped before completion', '巡航提前停止，释放剩余冻结笔力', 'Cruise stopped early; release unused held credits'],
    ['Release unused cruise authorization for confirmed reprice', '巡航重新计价，释放原冻结笔力', 'Cruise repriced; release the previous credit hold'],
    ['Automatic book creation was interrupted', '自动建书中断，释放剩余冻结笔力', 'Automatic book creation interrupted; release unused held credits'],
    ['Cruise dispatch deferred for controlled Engine release', '服务维护，延后巡航并释放本次冻结笔力', 'Service maintenance; defer cruise and release this credit hold'],
    ['Cruise Engine dispatch failed', '巡航任务提交失败，退还冻结笔力', 'Cruise submission failed; refund held credits'],
    ['排队任务未创建引擎作业，超时标记失败', '排队任务未能启动，超时退还冻结笔力', 'Queued task could not start; refund held credits after timeout'],
    ['排队任务引擎无响应，标记失败并释放冻结', '排队任务无响应，退还冻结笔力', 'Queued task did not respond; refund held credits'],
    ['排队任务超时未启动，标记失败并释放冻结', '排队任务启动超时，退还冻结笔力', 'Queued task timed out before starting; refund held credits'],
    ['任务长期无响应，标记失败并释放冻结', '任务长时间无响应，退还冻结笔力', 'Task stopped responding; refund held credits'],
    ['任务超时未完成，标记失败并释放冻结', '任务超时未完成，退还冻结笔力', 'Task timed out; refund held credits'],
    ['结算无用量，释放冻结笔力', '任务未产生用量，释放冻结笔力', 'No task usage recorded; release held credits'],
    ['订阅周期变更，清除旧周期未使用笔力', '订阅周期变更，清除旧周期未使用笔力', 'Subscription cycle changed; expire unused credits from the previous cycle'],
    ['订阅笔力周期到期，清除未使用笔力', '订阅笔力周期到期，清除未使用笔力', 'Subscription credit cycle ended; expire unused credits'],
    ['订阅权益期结束，清除当前笔力周期未使用笔力', '订阅权益期结束，清除当前笔力周期未使用笔力', 'Subscription ended; expire unused credits from the current cycle'],
    ['订阅周期已结束，未消费的冻结笔力不再回流', '订阅周期已结束，未消费的冻结笔力不再回流', 'Subscription cycle ended; unused held credits expire'],
    ['订阅周期已结束，未分配的冻结笔力不再回流', '订阅周期已结束，未分配的冻结笔力不再回流', 'Subscription cycle ended; unallocated held credits expire'],
    ['邀请好友完成建书奖励', '邀请好友完成建书奖励', 'Reward for an invited friend completing book setup'],
    ['管理员全员发放', '管理员全员发放', 'Administrator credit grant to all users'],
  ];
  const pick = (pair, lang) => pair[lang === 'en' ? 1 : 0];
  const typeLabel = (type, lang) => TYPES[type] ? pick(TYPES[type], lang) : pick(['其他', 'Other'], lang);
  const taskLabel = (type, lang) => TASKS[type] ? pick(TASKS[type], lang) : pick(['创作任务', 'Writing task'], lang);
  const withTask = (pair, task, lang) => pick(pair, lang) + (lang === 'en' ? ': ' : '：') + taskLabel(task, lang);
  const formatCredits = (value, lang) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'zh-CN', { maximumFractionDigits: 3 }).format(value / 1000);
  const knownInteger = value => Number.isSafeInteger(value);

  function operationAmount(row, lang) {
    if (!knownInteger(row.amount_millis)) return '—';
    const labels = {
      reserve: ['冻结', 'Held'], refund: ['释放冻结', 'Hold released'],
      consume: ['消费', 'Spent'], grant: ['发放', 'Granted'],
      expire: ['到期清零', 'Expired'], clawback: ['追回', 'Clawed back']
    };
    // A refund's legacy amount is a reduction in held credits, not a debit.
    // Unknown event kinds do not inherit a made-up monetary interpretation.
    if (!labels[row.type]) return '—';
    if (['reserve', 'grant'].includes(row.type) ? row.amount_millis < 0 : row.amount_millis > 0) return '—';
    return pick(labels[row.type], lang) + ' ' + formatCredits(Math.abs(row.amount_millis), lang);
  }

  function orderTitle(order, lang) {
    if (order.kind === 'public_api_wallet') return pick(['公益模型余额充值', 'Model API balance top-up'], lang);
    if (order.kind === 'credit_pack') return pick(['笔力加量包', 'Credit pack'], lang);
    if (order.kind === 'subscription') {
      const name = typeof order.product_name === 'string' ? order.product_name.trim() : '';
      return name ? pick(['订阅 · ', 'Subscription · '], lang) + name : pick(['历史订阅', 'Historical subscription'], lang);
    }
    return pick(['其他订单', 'Other order'], lang);
  }

  function orderStatus(order, lang) {
    const status = typeof order === 'string' ? order : order && order.status;
    const syncState = order && typeof order === 'object' ? order.payment_sync_state : null;
    // The confirmed terminal result wins over stale synchronization metadata.
    if (status === 'fulfilled') return pick(['已完成', 'Completed'], lang);
    if (syncState === 'manual_review') return pick(['需人工核对', 'Needs manual review'], lang);
    if (syncState === 'retryable') return pick(['等待重试', 'Retry pending'], lang);
    const labels = {
      pending: ['待支付', 'Awaiting payment'], paid: ['已支付，待入账', 'Paid; awaiting delivery'],
      fulfilling: ['正在入账', 'Delivering'], fulfilled: ['已完成', 'Completed'],
      cancelled: ['已取消', 'Cancelled'], failed: ['失败', 'Failed'],
      expired: ['已过期', 'Expired'], superseded: ['已替换', 'Replaced'],
      refunded: ['已退款', 'Refunded']
    };
    return labels[status] ? pick(labels[status], lang) : pick(['状态待确认', 'Status unconfirmed'], lang);
  }

  function orderBenefit(order, lang) {
    if (order.kind === 'public_api_wallet') {
      const cents = order.wallet_credit_amount_cents;
      const value = knownInteger(cents) && cents >= 0 ? '¥' + (cents / 100).toFixed(2) : '—';
      return pick(order.status === 'fulfilled' ? ['已到账', 'Credited'] : ['充值金额', 'Top-up amount'], lang) + ' ' + value;
    }
    if (!['subscription', 'credit_pack'].includes(order.kind)) return '—';
    const value = knownInteger(order.credit_millis) && order.credit_millis >= 0 ? formatCredits(order.credit_millis, lang) : '—';
    let label = ['购买额度', 'Credits'];
    if (order.status === 'fulfilled') {
      if (order.credit_delivery_state === 'scheduled') label = ['下一周期额度', 'Next-cycle credits'];
      else if (order.kind === 'credit_pack' || order.credit_delivery_state === 'granted') label = ['已发放', 'Granted'];
    }
    return pick(label, lang) + ' ' + value + pick([' 笔力', ' credits'], lang);
  }

  function reason(row, lang) {
    const text = String(row.reason || '').trim();
    const details = row.details && typeof row.details === 'object' ? row.details : {};
    const localized = details[lang === 'en' ? 'reason_en' : 'reason_zh'];
    if (typeof localized === 'string' && localized.trim()) return localized;
    const exact = EXACT.find(item => item[0] === text);
    if (exact) return exact[lang === 'en' ? 2 : 1];
    const patterns = [
      [/^Engine task usage: (.+)$/, ['创作消费', 'Writing credits spent']],
      [/^Reserve for engine task: (.+)$/, ['冻结笔力', 'Credits held']],
      [/^Refund reserve for engine task: (.+)$/, ['退还冻结笔力', 'Held credits refunded']],
      [/^(?:Cruise )?Engine task failed: (.+)$/, ['任务失败，退还冻结笔力', 'Task failed; held credits refunded']],
      [/^Engine task cancel(?:led|ed): (.+)$/, ['任务取消，退还冻结笔力', 'Task cancelled; held credits refunded']],
      [/^Task failed: (.+)$/, ['任务失败，退还冻结笔力', 'Task failed; held credits refunded']],
      [/^Task cancel(?:led|ed): (.+)$/, ['任务取消，退还冻结笔力', 'Task cancelled; held credits refunded']],
      [/^Reserve complete action: (.+)$/, ['冻结完整创作流程笔力', 'Credits held for the complete writing action']],
      [/^Release interrupted complete action: (.+)$/, ['创作流程中断，释放剩余冻结笔力', 'Writing action interrupted; release unused held credits']],
    ];
    for (const [pattern, label] of patterns) {
      const match = text.match(pattern);
      if (match) return withTask(label, row.task_type || match[1], lang);
    }
    const status = text.match(/^(?:引擎)?任务(failed|cancelled|canceled|completed|succeeded)，释放冻结笔力$/)
      || text.match(/^Cruise terminal task cleanup: (.+)$/)
      || text.match(/^Cruise stopped; Engine task (.+)$/)
      || text.match(/^Cruise finished with status (.+)$/);
    if (status) {
      const labels = { failed: ['任务失败', 'Task failed'], cancelled: ['任务取消', 'Task cancelled'], canceled: ['任务取消', 'Task cancelled'], completed: ['任务完成', 'Task completed'], succeeded: ['任务完成', 'Task completed'], stopped: ['巡航停止', 'Cruise stopped'] };
      return `${pick(labels[status[1]] || ['任务已结束', 'Task ended'], lang)}${pick(['，释放剩余冻结笔力', '; release unused held credits'], lang)}`;
    }
    if (/^Release stopped chapter chain:/.test(text)) return pick(['连续创作停止，释放剩余冻结笔力', 'Chapter chain stopped; release unused held credits'], lang);
    const grantPatterns = [
      [/^(?:购买笔力包：|Credit pack purchase: )(.*)$/, ['购买笔力包', 'Credit pack purchase']],
      [/^(?:订阅周期发放：|Subscription cycle grant: )(.*)$/, ['订阅周期发放', 'Subscription cycle grant']],
      [/^(?:付费订阅发放：|Paid subscription grant: )(.*)$/, ['付费订阅发放', 'Paid subscription grant']],
      [/^(?:Redemption code: |兑换码[：:]\s*)(.*)$/, ['兑换码发放', 'Redemption code grant']],
    ];
    for (const [pattern, label] of grantPatterns) {
      const match = text.match(pattern);
      if (match) return pick(label, lang) + (lang === 'en' ? ': ' : '：') + match[1];
    }
    // Preserve authored notes. Unknown machine errors use the structured ledger event,
    // instead of exposing provider output or inventing a translated failure cause.
    if (row.task_id || row.task_type) return withTask([typeLabel(row.type, 'zh'), typeLabel(row.type, 'en')], row.task_type, lang);
    return text || typeLabel(row.type, lang);
  }

  const api = { reason, typeLabel, taskLabel, operationAmount, orderTitle, orderStatus, orderBenefit,
    types: Object.keys(TYPES), defaultTypes: ['consume', 'refund'] };
  root.CreditLedgerCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
