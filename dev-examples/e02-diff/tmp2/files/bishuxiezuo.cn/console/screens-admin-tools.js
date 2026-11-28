{
(function () {
  const {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
  } = React;
  const EMPTY_CDK = {
    name: '',
    reward_type: 'credit',
    reward: '',
    plan_code: '',
    duration_days: '',
    count: '10',
    max_redemptions: '1',
    per_user_limit: '',
    prefix: 'LF-RD',
    expires: ''
  };
  const COPY = {
    zh: {
      title: '运营工具',
      subtitle: '创建权益、交付兑换码，并持续追踪兑换结果。',
      refresh: '刷新',
      bulkGrant: '批量发放笔力',
      createBatch: '创建兑换码批次',
      activeBatches: '发放中的批次',
      validCodes: '当前可用兑换码',
      redeemed: '累计已兑换',
      expiring: '7 天内到期',
      batchCount: '个批次',
      codesUnit: '个码',
      noExpiry: '长期有效',
      batchLibrary: '兑换码批次',
      batchLibraryNote: '按创建批次聚合；进入批次后查看和停用单个兑换码。',
      all: '全部',
      active: '发放中',
      ended: '已结束',
      search: '搜索批次名称或兑换码前缀',
      batch: '活动批次',
      reward: '权益',
      progress: '兑换进度',
      expiry: '有效期',
      status: '状态',
      created: '创建于',
      generated: '生成',
      available: '仍可用',
      rule: '兑换规则',
      perCode: '单码权益',
      perCodeUses: '每码次数',
      perUserLimit: '同用户上限',
      unlimited: '不限',
      codeRecords: '码记录',
      viewAll: '查看全部',
      collapse: '收起',
      codeHistoryWarning: '历史记录不能还原完整兑换码',
      codeHistoryWarningNote: '完整码只在生成成功时交付，之后仅保留可核对的前缀。',
      createAnother: '再建一批',
      deactivateSelected: '停用所选兑换码',
      noCodeSelected: '请选择一个仍有效的兑换码',
      redeemedAt: '兑换时间',
      noRedemptions: '该兑换码尚未被使用。',
      loadingDetails: '正在读取兑换明细…',
      detailFailed: '兑换明细暂不可用',
      maintenance: '系统维护',
      reconcileLabel: '任务与订单对账',
      expand: '展开',
      close: '关闭',
      reconcileNote: '检查异常任务、待确认订单和订阅周期，并可能同步状态或释放冻结笔力。',
      runReconcile: '运行对账',
      loadFailed: '暂时无法读取兑换码批次',
      loadFailedNote: '现有记录没有被修改，可以重试读取。',
      retry: '重试',
      empty: '还没有兑换码批次',
      emptyNote: '创建第一批兑换码后，可在这里持续追踪兑换与到期情况。',
      createTitle: '创建兑换码批次',
      createLabel: '创建权益',
      activityName: '活动名称',
      activityNamePlaceholder: '例如：8 月新用户激活',
      benefitType: '发放权益',
      credit: '笔力',
      subscription: '订阅',
      amountPerCode: '每个码发放',
      credits: '笔力',
      plan: '订阅方案',
      choosePlan: '选择订阅方案',
      extraDays: '额外有效天数（可选）',
      generateCount: '生成数量',
      prefix: '兑换码前缀',
      maxUses: '每码可兑换',
      userBatchLimit: '同用户批次上限（可选）',
      expiryDate: '到期日期（可选）',
      createSummary: '本次生成',
      completeCodes: '完整兑换码',
      maxBenefit: '最大可发放',
      maxPerUser: '单用户最多',
      invalidAt: '失效时间',
      oneTimeWarning: '生成后请立即复制并安全交付',
      oneTimeWarningNote: '完整兑换码只显示在成功结果中，关闭后不能从历史记录再次取回。',
      cancel: '取消',
      generating: '正在生成…',
      confirmGenerate: '确认并生成',
      requiredName: '请填写活动名称',
      requiredReward: '请输入大于 0 的笔力',
      requiredPlan: '请选择订阅方案',
      invalidCount: '生成数量必须为 1–500',
      generatedTitle: '个兑换码已生成',
      generatedLabel: '生成完成',
      visibleOnce: '完整码仅在本页可见',
      visibleOnceNote: '离开后只能查看批次与前缀，不能再次恢复完整码。',
      copyAll: '复制全部',
      downloadTxt: '下载 TXT',
      deliveryAck: '我已复制或下载，并完成安全交付',
      doneClose: '完成交付并关闭',
      saveCodesFirst: '请先复制或下载完整兑换码，并确认已经安全交付。',
      copied: '已复制全部兑换码',
      copyFailed: '复制失败，请使用下载文件。',
      validDays: '有效天数',
      grantValidity: '活动笔力有效天数',
      grantTitle: '确认批量发放',
      amountPerUser: '每人发放',
      grantScope: '发放范围',
      activeUsersOnly: '仅活跃用户',
      allUsers: '全部用户',
      grantReason: '发放原因',
      grantReasonPlaceholder: '例如：内测用户补偿',
      estimatedUsers: '预计影响人数',
      estimatedTotal: '预计发放总量',
      unavailableBeforeRun: '当前无法预估',
      grantWarning: '确认后会直接到账并发送站内通知',
      grantWarningNote: '系统会在执行时按账号状态计算目标用户，完成后返回准确人数和总笔力；当前没有预执行或撤回能力。',
      invalidGrant: '请填写大于 0 的笔力、有效天数和发放原因',
      granting: '正在发放…',
      confirmGrant: '确认发放',
      grantDone: '批量发放完成',
      users: '位用户',
      total: '总计',
      deactivateTitle: '停用兑换码',
      deactivateNote: '停用后该兑换码不能再被使用；已经完成的兑换不会撤回。',
      batchScope: '所属批次',
      usage: '当前使用',
      oneCodeOnly: '这里只停用一个兑换码',
      oneCodeOnlyNote: '当前接口不支持整批停用，批次中其他有效码不受影响。',
      deactivating: '正在停用…',
      confirmDeactivate: '确认停用此码',
      reconcileTitle: '运行任务与订单对账',
      reconcileWarning: '对账可能同步任务和订单状态，并释放冻结笔力。请只在需要修复异常状态时运行。',
      reconciling: '正在对账…',
      confirmReconcile: '确认运行对账',
      reconcileDone: '对账完成',
      subscriptions: '订阅',
      tasks: '任务',
      payments: '订单',
      rolled: '续期',
      granted: '补发',
      synced: '同步',
      settled: '结算',
      refunded: '退款',
      released: '释放',
      errors: '错误',
      checked: '检查',
      fulfilled: '履约',
      expired: '已过期',
      expiringSoon: '即将到期',
      disabled: '已停用',
      usedUp: '已兑完',
      mixed: '部分有效',
      longTerm: '长期有效',
      refreshDone: '数据已刷新',
      codeInactive: '该兑换码已经停用或兑完',
      error: '操作失败',
      noPlans: '暂无可用订阅方案'
    },
    en: {
      title: 'Operations tools',
      subtitle: 'Create benefits, deliver redemption codes, and track results.',
      refresh: 'Refresh',
      bulkGrant: 'Bulk grant credits',
      createBatch: 'Create code batch',
      activeBatches: 'Active batches',
      validCodes: 'Available codes',
      redeemed: 'Total redemptions',
      expiring: 'Expiring in 7 days',
      batchCount: 'batches',
      codesUnit: 'codes',
      noExpiry: 'No expiry',
      batchLibrary: 'Redemption code batches',
      batchLibraryNote: 'Grouped by creation batch; inspect and deactivate individual codes inside a batch.',
      all: 'All',
      active: 'Active',
      ended: 'Ended',
      search: 'Search batch name or code prefix',
      batch: 'Batch',
      reward: 'Benefit',
      progress: 'Redemptions',
      expiry: 'Expires',
      status: 'Status',
      created: 'Created',
      generated: 'Generated',
      available: 'Available',
      rule: 'Redemption rules',
      perCode: 'Per code',
      perCodeUses: 'Uses per code',
      perUserLimit: 'Per-user batch cap',
      unlimited: 'Unlimited',
      codeRecords: 'Code records',
      viewAll: 'View all',
      collapse: 'Collapse',
      codeHistoryWarning: 'Full codes cannot be restored from history',
      codeHistoryWarningNote: 'Full codes are shown only after creation; history retains a verifiable prefix.',
      createAnother: 'Create another',
      deactivateSelected: 'Deactivate selected code',
      noCodeSelected: 'Select an active code',
      redeemedAt: 'Redeemed',
      noRedemptions: 'This code has not been redeemed.',
      loadingDetails: 'Loading redemption details…',
      detailFailed: 'Redemption details unavailable',
      maintenance: 'System maintenance',
      reconcileLabel: 'Task and order reconciliation',
      expand: 'Expand',
      close: 'Close',
      reconcileNote: 'Checks abnormal tasks, pending orders, and subscription periods; may sync state or release reserved credits.',
      runReconcile: 'Run reconciliation',
      loadFailed: 'Redemption batches are unavailable',
      loadFailedNote: 'Existing records were not changed. Try loading again.',
      retry: 'Retry',
      empty: 'No redemption code batches yet',
      emptyNote: 'Create the first batch to track redemptions and expiry here.',
      createTitle: 'Create redemption code batch',
      createLabel: 'Create benefit',
      activityName: 'Campaign name',
      activityNamePlaceholder: 'e.g. August activation',
      benefitType: 'Benefit type',
      credit: 'Credits',
      subscription: 'Subscription',
      amountPerCode: 'Credits per code',
      credits: 'credits',
      plan: 'Subscription plan',
      choosePlan: 'Choose a plan',
      extraDays: 'Extra days (optional)',
      generateCount: 'Number of codes',
      prefix: 'Code prefix',
      maxUses: 'Uses per code',
      userBatchLimit: 'Per-user batch cap (optional)',
      expiryDate: 'Expiry date (optional)',
      createSummary: 'Generation summary',
      completeCodes: 'Full codes',
      maxBenefit: 'Maximum benefit',
      maxPerUser: 'Maximum per user',
      invalidAt: 'Expires',
      oneTimeWarning: 'Copy and deliver immediately after creation',
      oneTimeWarningNote: 'Full codes appear only in the success result and cannot be retrieved from history after closing.',
      cancel: 'Cancel',
      generating: 'Generating…',
      confirmGenerate: 'Confirm and generate',
      requiredName: 'Enter a campaign name',
      requiredReward: 'Enter credits greater than 0',
      requiredPlan: 'Choose a subscription plan',
      invalidCount: 'Code count must be between 1 and 500',
      generatedTitle: 'codes generated',
      generatedLabel: 'Generation complete',
      visibleOnce: 'Full codes are visible only here',
      visibleOnceNote: 'After leaving, only batch metadata and code prefixes remain.',
      copyAll: 'Copy all',
      downloadTxt: 'Download TXT',
      deliveryAck: 'I copied or downloaded the codes and delivered them securely',
      doneClose: 'Finish delivery and close',
      saveCodesFirst: 'Copy or download the full codes and confirm secure delivery first.',
      copied: 'All codes copied',
      copyFailed: 'Copy failed. Download the file instead.',
      validDays: 'Valid days',
      grantValidity: 'Activity credit validity (days)',
      grantTitle: 'Confirm bulk grant',
      amountPerUser: 'Credits per user',
      grantScope: 'Recipients',
      activeUsersOnly: 'Active users only',
      allUsers: 'All users',
      grantReason: 'Reason',
      grantReasonPlaceholder: 'e.g. Beta compensation',
      estimatedUsers: 'Estimated users',
      estimatedTotal: 'Estimated total',
      unavailableBeforeRun: 'Unavailable before execution',
      grantWarning: 'Credits arrive immediately and users receive a notification',
      grantWarningNote: 'Recipients are resolved from account state during execution. Accurate counts and totals are returned afterward; there is no preview or rollback.',
      invalidGrant: 'Enter positive credits, whole valid days, and a reason',
      granting: 'Granting…',
      confirmGrant: 'Confirm grant',
      grantDone: 'Bulk grant complete',
      users: 'users',
      total: 'Total',
      deactivateTitle: 'Deactivate redemption code',
      deactivateNote: 'The code cannot be used afterward; completed redemptions are not reversed.',
      batchScope: 'Batch',
      usage: 'Current usage',
      oneCodeOnly: 'Only this code will be deactivated',
      oneCodeOnlyNote: 'Batch-level deactivation is not supported. Other active codes remain available.',
      deactivating: 'Deactivating…',
      confirmDeactivate: 'Confirm deactivation',
      reconcileTitle: 'Run task and order reconciliation',
      reconcileWarning: 'Reconciliation may sync task and order state and release reserved credits. Run it only to repair abnormal states.',
      reconciling: 'Reconciling…',
      confirmReconcile: 'Confirm reconciliation',
      reconcileDone: 'Reconciliation complete',
      subscriptions: 'Subscriptions',
      tasks: 'Tasks',
      payments: 'Orders',
      rolled: 'Rolled',
      granted: 'Granted',
      synced: 'Synced',
      settled: 'Settled',
      refunded: 'Refunded',
      released: 'Released',
      errors: 'Errors',
      checked: 'Checked',
      fulfilled: 'Fulfilled',
      expired: 'Expired',
      expiringSoon: 'Expiring soon',
      disabled: 'Disabled',
      usedUp: 'Used',
      mixed: 'Partially active',
      longTerm: 'No expiry',
      refreshDone: 'Data refreshed',
      codeInactive: 'This code is inactive or fully redeemed',
      error: 'Operation failed',
      noPlans: 'No active subscription plans'
    }
  };
  const creditsOf = millis => ((Number(millis) || 0) / 1000).toLocaleString(undefined, {
    maximumFractionDigits: 3
  });
  const dateOf = value => value ? new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }) : '—';
  const timeOf = value => value ? new Date(value).toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }) : '—';
  const isExpired = value => !!value && new Date(value).getTime() < Date.now();
  const isAvailableCode = code => !!code.active && !isExpired(code.expires_at) && (code.max_redemptions == null || code.redemption_count < code.max_redemptions);
  function rewardOf(code, copy) {
    if (code.reward_type === 'subscription') {
      return `${String(code.plan_code || '—').toUpperCase()}${code.duration_days ? ` +${code.duration_days}d` : ''}`;
    }
    return `${creditsOf(code.reward_millis)} ${copy.credits}`;
  }
  function groupCodes(codes, copy) {
    const groups = new Map();
    (codes || []).forEach(code => {
      const key = code.batch_id || `single:${code.id}`;
      if (!groups.has(key)) groups.set(key, {
        id: key,
        batchId: code.batch_id,
        codes: []
      });
      groups.get(key).codes.push(code);
    });
    return Array.from(groups.values()).map(group => {
      const first = group.codes[0];
      const redeemed = group.codes.reduce((sum, code) => sum + (Number(code.redemption_count) || 0), 0);
      const finiteCapacity = group.codes.every(code => code.max_redemptions != null);
      const capacity = finiteCapacity ? group.codes.reduce((sum, code) => sum + Number(code.max_redemptions || 0), 0) : null;
      const available = group.codes.filter(isAvailableCode).length;
      const activeRows = group.codes.filter(code => code.active).length;
      const expiry = first.expires_at || null;
      const daysLeft = expiry ? (new Date(expiry).getTime() - Date.now()) / 86400000 : null;
      let status = 'active';
      let statusLabel = copy.active;
      if (expiry && isExpired(expiry)) {
        status = 'ended';
        statusLabel = copy.expired;
      } else if (available === 0 && activeRows === 0) {
        status = 'ended';
        statusLabel = copy.disabled;
      } else if (available === 0) {
        status = 'ended';
        statusLabel = copy.usedUp;
      } else if (available < group.codes.length) {
        status = 'mixed';
        statusLabel = copy.mixed;
      } else if (daysLeft != null && daysLeft <= 7) {
        status = 'warning';
        statusLabel = copy.expiringSoon;
      }
      return {
        ...group,
        name: first.name,
        reward: rewardOf(first, copy),
        rewardType: first.reward_type,
        expiresAt: expiry,
        createdAt: first.created_at,
        perUserLimit: first.per_user_batch_limit,
        maxRedemptions: first.max_redemptions,
        count: group.codes.length,
        redeemed,
        capacity,
        available,
        status,
        statusLabel
      };
    });
  }
  function Status({
    tone,
    children
  }) {
    return /*#__PURE__*/React.createElement("span", {
      className: `adm-tool-status ${tone || ''}`
    }, children);
  }
  function Metric({
    label,
    value,
    meta,
    tone
  }) {
    return /*#__PURE__*/React.createElement("article", {
      className: `adm-tool-metric ${tone || ''}`
    }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("strong", null, value), /*#__PURE__*/React.createElement("small", null, meta));
  }
  function ToolModal({
    label,
    title,
    children,
    footer,
    onClose,
    size,
    tone,
    closeLabel
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-overlay",
      onMouseDown: event => {
        if (event.target === event.currentTarget) onClose();
      }
    }, /*#__PURE__*/React.createElement("section", {
      className: `adm-tool-modal ${size || ''} ${tone || ''}`,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "adm-tool-modal-title"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("h2", {
      id: "adm-tool-modal-title"
    }, title)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": closeLabel,
      onClick: onClose
    }, "\xD7")), /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-modal-body"
    }, children), /*#__PURE__*/React.createElement("footer", null, footer)));
  }
  function BatchTable({
    batches,
    selectedId,
    onSelect,
    copy
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-batch-table"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-batch-head"
    }, /*#__PURE__*/React.createElement("span", null, copy.batch), /*#__PURE__*/React.createElement("span", null, copy.reward), /*#__PURE__*/React.createElement("span", null, copy.progress), /*#__PURE__*/React.createElement("span", null, copy.expiry), /*#__PURE__*/React.createElement("span", null, copy.status)), batches.map(batch => /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: batch.id === selectedId ? 'selected' : '',
      key: batch.id,
      onClick: () => onSelect(batch.id)
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, batch.name), /*#__PURE__*/React.createElement("small", null, batch.count, " ", copy.codesUnit, " \xB7 ", timeOf(batch.createdAt))), /*#__PURE__*/React.createElement("span", null, batch.reward), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, batch.redeemed, " / ", batch.capacity == null ? '∞' : batch.capacity), /*#__PURE__*/React.createElement("i", null, /*#__PURE__*/React.createElement("em", {
      style: {
        width: `${batch.capacity ? Math.min(100, batch.redeemed * 100 / batch.capacity) : 0}%`
      }
    }))), /*#__PURE__*/React.createElement("span", null, batch.expiresAt ? dateOf(batch.expiresAt) : copy.noExpiry), /*#__PURE__*/React.createElement(Status, {
      tone: batch.status
    }, batch.statusLabel))));
  }
  function BatchInspector({
    batch,
    selectedCodeId,
    onSelectCode,
    details,
    detailsLoading,
    detailsError,
    showAll,
    setShowAll,
    onCreate,
    onDeactivate,
    copy
  }) {
    if (!batch) return null;
    const selectedCode = batch.codes.find(code => code.id === selectedCodeId) || null;
    const visibleCodes = showAll ? batch.codes : batch.codes.slice(0, 6);
    return /*#__PURE__*/React.createElement("aside", {
      className: "adm-tool-inspector"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("span", null, copy.batch), /*#__PURE__*/React.createElement("h2", null, batch.name), /*#__PURE__*/React.createElement("p", null, batch.batchId ? batch.batchId.slice(0, 13) : batch.codes[0].code_prefix, " \xB7 ", copy.created, " ", timeOf(batch.createdAt))), /*#__PURE__*/React.createElement("section", {
      className: "adm-tool-inspector-metrics"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.generated), /*#__PURE__*/React.createElement("strong", null, batch.count)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.redeemed), /*#__PURE__*/React.createElement("strong", null, batch.redeemed)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.available), /*#__PURE__*/React.createElement("strong", null, batch.available))), /*#__PURE__*/React.createElement("section", {
      className: "adm-tool-rules"
    }, /*#__PURE__*/React.createElement("h3", null, copy.rule), /*#__PURE__*/React.createElement("dl", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.perCode), /*#__PURE__*/React.createElement("dd", null, batch.reward)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.perCodeUses), /*#__PURE__*/React.createElement("dd", null, batch.maxRedemptions == null ? copy.unlimited : batch.maxRedemptions)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.perUserLimit), /*#__PURE__*/React.createElement("dd", null, batch.perUserLimit || copy.unlimited)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.expiry), /*#__PURE__*/React.createElement("dd", null, batch.expiresAt ? dateOf(batch.expiresAt) : copy.longTerm)))), /*#__PURE__*/React.createElement("section", {
      className: "adm-tool-code-section"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("h3", null, copy.codeRecords), batch.codes.length > 6 ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setShowAll(value => !value)
    }, showAll ? copy.collapse : `${copy.viewAll} ${batch.codes.length}`) : null), /*#__PURE__*/React.createElement("div", {
      className: `adm-tool-code-list ${showAll ? 'expanded' : ''}`
    }, visibleCodes.map(code => /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: code.id === selectedCodeId ? 'selected' : '',
      key: code.id,
      onClick: () => onSelectCode(code.id)
    }, /*#__PURE__*/React.createElement("code", null, code.code_prefix), /*#__PURE__*/React.createElement("span", null, code.redemption_count, " / ", code.max_redemptions == null ? '∞' : code.max_redemptions), /*#__PURE__*/React.createElement(Status, {
      tone: isAvailableCode(code) ? 'active' : code.active ? 'ended' : 'disabled'
    }, isAvailableCode(code) ? copy.active : code.active ? copy.usedUp : copy.disabled))))), selectedCode ? /*#__PURE__*/React.createElement("section", {
      className: "adm-tool-redemptions"
    }, /*#__PURE__*/React.createElement("h3", null, copy.redeemedAt), detailsLoading ? /*#__PURE__*/React.createElement("p", null, copy.loadingDetails) : detailsError ? /*#__PURE__*/React.createElement("p", {
      className: "error"
    }, copy.detailFailed) : details.length ? /*#__PURE__*/React.createElement("div", null, details.slice(0, 4).map(item => /*#__PURE__*/React.createElement("p", {
      key: item.id
    }, /*#__PURE__*/React.createElement("span", null, item.user_email || '—'), /*#__PURE__*/React.createElement("b", null, timeOf(item.redeemed_at))))) : /*#__PURE__*/React.createElement("p", null, copy.noRedemptions)) : null, /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-history-warning"
    }, /*#__PURE__*/React.createElement("strong", null, copy.codeHistoryWarning), /*#__PURE__*/React.createElement("span", null, copy.codeHistoryWarningNote)), /*#__PURE__*/React.createElement("footer", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: onCreate
    }, copy.createAnother), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm danger-outline",
      disabled: !selectedCode || !isAvailableCode(selectedCode),
      title: !selectedCode || !isAvailableCode(selectedCode) ? copy.noCodeSelected : undefined,
      onClick: () => onDeactivate(selectedCode)
    }, copy.deactivateSelected)));
  }
  function CreateBatchModal({
    form,
    setForm,
    plans,
    formError,
    busy,
    onClose,
    onSubmit,
    copy
  }) {
    const isSubscription = form.reward_type === 'subscription';
    const count = Math.max(0, Number(form.count) || 0);
    const reward = Math.max(0, Number(form.reward) || 0);
    const maxBenefit = isSubscription ? `${count} ${copy.subscription}` : `${(count * reward).toLocaleString()} ${copy.credits}`;
    return /*#__PURE__*/React.createElement(ToolModal, {
      label: copy.createLabel,
      title: copy.createTitle,
      onClose: onClose,
      closeLabel: copy.close,
      size: "large",
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn",
        disabled: busy,
        onClick: onClose
      }, copy.cancel), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn gold",
        disabled: busy,
        onClick: onSubmit
      }, busy ? copy.generating : `${copy.confirmGenerate} ${count || ''}`))
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-create-grid"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-form"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.activityName), /*#__PURE__*/React.createElement("input", {
      autoFocus: true,
      value: form.name,
      placeholder: copy.activityNamePlaceholder,
      onChange: event => setForm(value => ({
        ...value,
        name: event.target.value
      }))
    })), /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", null, copy.benefitType), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: !isSubscription ? 'selected' : '',
      onClick: () => setForm(value => ({
        ...value,
        reward_type: 'credit'
      }))
    }, copy.credit), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: isSubscription ? 'selected' : '',
      onClick: () => setForm(value => ({
        ...value,
        reward_type: 'subscription'
      }))
    }, copy.subscription)), isSubscription ? /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-field-pair"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.plan), /*#__PURE__*/React.createElement("select", {
      value: form.plan_code,
      onChange: event => setForm(value => ({
        ...value,
        plan_code: event.target.value
      }))
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, plans.length ? copy.choosePlan : copy.noPlans), plans.map(plan => /*#__PURE__*/React.createElement("option", {
      key: plan.code,
      value: plan.code
    }, plan.name)))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.extraDays), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      value: form.duration_days,
      onChange: event => setForm(value => ({
        ...value,
        duration_days: event.target.value
      }))
    }))) : /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.amountPerCode), /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-input-unit"
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0.001",
      step: "0.1",
      value: form.reward,
      onChange: event => setForm(value => ({
        ...value,
        reward: event.target.value
      }))
    }), /*#__PURE__*/React.createElement("b", null, copy.credits))), /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-field-pair"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.generateCount), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      max: "500",
      value: form.count,
      onChange: event => setForm(value => ({
        ...value,
        count: event.target.value
      }))
    })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.prefix), /*#__PURE__*/React.createElement("input", {
      maxLength: "12",
      value: form.prefix,
      onChange: event => setForm(value => ({
        ...value,
        prefix: event.target.value.toUpperCase()
      }))
    }))), /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-field-pair"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.maxUses), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      value: form.max_redemptions,
      onChange: event => setForm(value => ({
        ...value,
        max_redemptions: event.target.value
      }))
    })), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.userBatchLimit), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      value: form.per_user_limit,
      onChange: event => setForm(value => ({
        ...value,
        per_user_limit: event.target.value
      }))
    }))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.expiryDate), /*#__PURE__*/React.createElement("input", {
      type: "date",
      value: form.expires,
      onChange: event => setForm(value => ({
        ...value,
        expires: event.target.value
      }))
    })), formError ? /*#__PURE__*/React.createElement("p", {
      className: "adm-tool-form-error",
      role: "alert"
    }, formError) : null), /*#__PURE__*/React.createElement("aside", {
      className: "adm-tool-create-summary"
    }, /*#__PURE__*/React.createElement("h3", null, copy.createSummary), /*#__PURE__*/React.createElement("dl", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.completeCodes), /*#__PURE__*/React.createElement("dd", null, count || 0)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.maxBenefit), /*#__PURE__*/React.createElement("dd", null, maxBenefit)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.maxPerUser), /*#__PURE__*/React.createElement("dd", null, form.per_user_limit || copy.unlimited)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.invalidAt), /*#__PURE__*/React.createElement("dd", null, form.expires || copy.longTerm))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, copy.oneTimeWarning), /*#__PURE__*/React.createElement("p", null, copy.oneTimeWarningNote)))));
  }
  function GeneratedCodesModal({
    codes,
    ack,
    setAck,
    onClose,
    onCopy,
    onDownload,
    copy
  }) {
    return /*#__PURE__*/React.createElement(ToolModal, {
      label: copy.generatedLabel,
      title: `${codes.length} ${copy.generatedTitle}`,
      onClose: onClose,
      closeLabel: copy.close,
      size: "large",
      tone: "success",
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn",
        onClick: onDownload
      }, copy.downloadTxt), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn gold",
        onClick: onCopy
      }, copy.copyAll), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn",
        disabled: !ack,
        onClick: onClose
      }, copy.doneClose))
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-once"
    }, /*#__PURE__*/React.createElement("strong", null, copy.visibleOnce), /*#__PURE__*/React.createElement("span", null, copy.visibleOnceNote)), /*#__PURE__*/React.createElement("textarea", {
      className: "adm-tool-generated-codes mono",
      readOnly: true,
      value: codes.join('\n'),
      "aria-label": copy.completeCodes
    }), /*#__PURE__*/React.createElement("label", {
      className: "adm-tool-delivery-check"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: ack,
      onChange: event => setAck(event.target.checked)
    }), " ", copy.deliveryAck));
  }
  function BulkGrantModal({
    form,
    setForm,
    busy,
    error,
    result,
    onClose,
    onSubmit,
    copy
  }) {
    return /*#__PURE__*/React.createElement(ToolModal, {
      label: copy.bulkGrant,
      title: result ? copy.grantDone : copy.grantTitle,
      onClose: onClose,
      closeLabel: copy.close,
      tone: "warning",
      footer: result ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn gold",
        onClick: onClose
      }, copy.close) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn",
        disabled: busy,
        onClick: onClose
      }, copy.cancel), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn gold",
        disabled: busy,
        onClick: onSubmit
      }, busy ? copy.granting : copy.confirmGrant))
    }, result ? /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-grant-result"
    }, /*#__PURE__*/React.createElement("strong", null, result.user_count.toLocaleString(), " ", copy.users), /*#__PURE__*/React.createElement("span", null, copy.total, " ", creditsOf(result.total_millis), " ", copy.credits)) : /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-form adm-tool-grant-form"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.amountPerUser), /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-input-unit"
    }, /*#__PURE__*/React.createElement("input", {
      autoFocus: true,
      type: "number",
      min: "0.001",
      step: "0.1",
      value: form.amount,
      onChange: event => setForm(value => ({
        ...value,
        amount: event.target.value
      }))
    }), /*#__PURE__*/React.createElement("b", null, copy.credits))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.validDays), /*#__PURE__*/React.createElement("input", {
      id: "admin-bulk-credit-valid-days",
      type: "number",
      min: "1",
      max: "36500",
      step: "1",
      required: true,
      disabled: busy,
      value: form.validDays,
      onChange: event => setForm(value => ({
        ...value,
        validDays: event.target.value
      }))
    })), /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", null, copy.grantScope), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: "adm-tool-scope",
      checked: form.onlyActive,
      onChange: () => setForm(value => ({
        ...value,
        onlyActive: true
      }))
    }), " ", copy.activeUsersOnly), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: "adm-tool-scope",
      checked: !form.onlyActive,
      onChange: () => setForm(value => ({
        ...value,
        onlyActive: false
      }))
    }), " ", copy.allUsers)), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, copy.grantReason), /*#__PURE__*/React.createElement("input", {
      value: form.reason,
      placeholder: copy.grantReasonPlaceholder,
      onChange: event => setForm(value => ({
        ...value,
        reason: event.target.value
      }))
    })), /*#__PURE__*/React.createElement("section", {
      className: "adm-tool-unknown"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.estimatedUsers), /*#__PURE__*/React.createElement("strong", null, copy.unavailableBeforeRun)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, copy.estimatedTotal), /*#__PURE__*/React.createElement("strong", null, copy.unavailableBeforeRun))), /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-risk"
    }, /*#__PURE__*/React.createElement("strong", null, copy.grantWarning), /*#__PURE__*/React.createElement("p", null, copy.grantWarningNote), Number(form.validDays) > 0 ? /*#__PURE__*/React.createElement("p", null, copy.grantValidity, ": ", form.validDays) : null), error ? /*#__PURE__*/React.createElement("p", {
      className: "adm-tool-form-error",
      role: "alert"
    }, error) : null));
  }
  function DeactivateModal({
    code,
    batch,
    busy,
    onClose,
    onConfirm,
    copy
  }) {
    return /*#__PURE__*/React.createElement(ToolModal, {
      label: copy.deactivateSelected,
      title: `${copy.deactivateTitle} ${code.code_prefix}`,
      onClose: onClose,
      closeLabel: copy.close,
      tone: "danger",
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn",
        disabled: busy,
        onClick: onClose
      }, copy.cancel), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn danger",
        disabled: busy,
        onClick: onConfirm
      }, busy ? copy.deactivating : copy.confirmDeactivate))
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-deactivate"
    }, /*#__PURE__*/React.createElement("p", null, copy.deactivateNote), /*#__PURE__*/React.createElement("dl", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.batchScope), /*#__PURE__*/React.createElement("dd", null, batch.name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.reward), /*#__PURE__*/React.createElement("dd", null, rewardOf(code, copy))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, copy.usage), /*#__PURE__*/React.createElement("dd", null, code.redemption_count, " / ", code.max_redemptions == null ? '∞' : code.max_redemptions))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, copy.oneCodeOnly), /*#__PURE__*/React.createElement("span", null, copy.oneCodeOnlyNote))));
  }
  function ReconcileModal({
    busy,
    result,
    onClose,
    onConfirm,
    copy
  }) {
    const tasks = (result || {}).tasks || {};
    const subscriptions = (result || {}).subscriptions || {};
    const payments = (result || {}).payments || {};
    return /*#__PURE__*/React.createElement(ToolModal, {
      label: copy.reconcileLabel,
      title: result ? copy.reconcileDone : copy.reconcileTitle,
      onClose: onClose,
      closeLabel: copy.close,
      tone: "warning",
      footer: result ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn gold",
        onClick: onClose
      }, copy.close) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn",
        disabled: busy,
        onClick: onClose
      }, copy.cancel), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn gold",
        disabled: busy,
        onClick: onConfirm
      }, busy ? copy.reconciling : copy.confirmReconcile))
    }, result ? /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-reconcile-result"
    }, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("strong", null, copy.subscriptions), /*#__PURE__*/React.createElement("span", null, copy.rolled, " ", subscriptions.rolled || 0, " \xB7 ", copy.granted, " ", subscriptions.granted || 0)), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("strong", null, copy.tasks), /*#__PURE__*/React.createElement("span", null, copy.synced, " ", tasks.synced || 0, " \xB7 ", copy.settled, " ", tasks.settled || 0, " \xB7 ", copy.refunded, " ", tasks.refunded || 0, " \xB7 ", copy.released, " ", tasks.released || 0, " \xB7 ", copy.errors, " ", tasks.errors || 0)), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("strong", null, copy.payments), /*#__PURE__*/React.createElement("span", null, copy.checked, " ", payments.checked || 0, " \xB7 ", copy.fulfilled, " ", payments.fulfilled || 0, " \xB7 ", copy.errors, " ", payments.errors || 0))) : /*#__PURE__*/React.createElement("p", {
      className: "adm-tool-reconcile-warning"
    }, copy.reconcileWarning));
  }
  function ToolsTab({
    toast
  }) {
    const copy = COPY[window.CLANG === 'en' ? 'en' : 'zh'];
    const [codes, setCodes] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedBatchId, setSelectedBatchId] = useState(null);
    const [selectedCodeId, setSelectedCodeId] = useState(null);
    const [details, setDetails] = useState([]);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState(false);
    const [showAllCodes, setShowAllCodes] = useState(false);
    const [maintenanceOpen, setMaintenanceOpen] = useState(false);
    const [modal, setModal] = useState(null);
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState('');
    const [cdk, setCdk] = useState(EMPTY_CDK);
    const [generatedCodes, setGeneratedCodes] = useState([]);
    const [generatedAck, setGeneratedAck] = useState(false);
    const [grant, setGrant] = useState({
      amount: '',
      onlyActive: true,
      reason: '',
      validDays: ''
    });
    const [grantResult, setGrantResult] = useState(null);
    const grantRequest = useRef(null);
    const [deactivateTarget, setDeactivateTarget] = useState(null);
    const [reconcileResult, setReconcileResult] = useState(null);
    const lastTrigger = useRef(null);
    const batches = useMemo(() => groupCodes(codes, copy), [codes, copy]);
    const visibleBatches = useMemo(() => {
      const needle = query.trim().toLocaleLowerCase();
      return batches.filter(batch => {
        if (filter === 'active' && !['active', 'mixed', 'warning'].includes(batch.status)) return false;
        if (filter === 'ended' && batch.status !== 'ended') return false;
        return !needle || batch.name.toLocaleLowerCase().includes(needle) || batch.codes.some(code => String(code.code_prefix || '').toLocaleLowerCase().includes(needle));
      });
    }, [batches, filter, query]);
    const selectedBatch = batches.find(batch => batch.id === selectedBatchId) || batches[0] || null;
    const selectedCode = selectedBatch && selectedBatch.codes.find(code => code.id === selectedCodeId);
    const activeBatchCount = batches.filter(batch => ['active', 'mixed', 'warning'].includes(batch.status)).length;
    const validCodeCount = codes.filter(isAvailableCode).length;
    const totalRedemptions = codes.reduce((sum, code) => sum + (Number(code.redemption_count) || 0), 0);
    const expiringBatchCount = batches.filter(batch => {
      if (!batch.available || !batch.expiresAt) return false;
      const remaining = new Date(batch.expiresAt).getTime() - Date.now();
      return remaining >= 0 && remaining <= 7 * 86400000;
    }).length;
    const load = useCallback(async notify => {
      setLoading(true);
      setLoadError('');
      const [codesResult, catalogResult] = await Promise.allSettled([window.LF_API.adminRedemptionCodes(), window.LF_API.billingCatalog()]);
      if (codesResult.status === 'fulfilled') setCodes(codesResult.value || []);else setLoadError(codesResult.reason && codesResult.reason.message ? codesResult.reason.message : copy.loadFailed);
      if (catalogResult.status === 'fulfilled') setPlans((catalogResult.value.plans || []).filter(plan => plan.active && plan.code !== 'free'));else setPlans([]);
      setLoading(false);
      if (notify && codesResult.status === 'fulfilled') toast(copy.refreshDone);
    }, [copy.loadFailed, copy.refreshDone, toast]);
    useEffect(() => {
      load(false);
    }, [load]);
    useEffect(() => {
      if (!batches.length) {
        setSelectedBatchId(null);
        return;
      }
      if (!batches.some(batch => batch.id === selectedBatchId)) setSelectedBatchId(batches[0].id);
    }, [batches, selectedBatchId]);
    useEffect(() => {
      setShowAllCodes(false);
      setDetails([]);
      setDetailsError(false);
      if (!selectedBatch) {
        setSelectedCodeId(null);
        return;
      }
      const next = selectedBatch.codes.find(isAvailableCode) || selectedBatch.codes[0] || null;
      if (!selectedBatch.codes.some(code => code.id === selectedCodeId)) setSelectedCodeId(next ? next.id : null);
    }, [selectedBatch && selectedBatch.id]);
    useEffect(() => {
      if (!selectedCodeId) {
        setDetails([]);
        return undefined;
      }
      let active = true;
      setDetailsLoading(true);
      setDetailsError(false);
      window.LF_API.adminRedemptionDetails(selectedCodeId).then(value => {
        if (active) setDetails(value || []);
      }).catch(() => {
        if (active) {
          setDetails([]);
          setDetailsError(true);
        }
      }).finally(() => {
        if (active) setDetailsLoading(false);
      });
      return () => {
        active = false;
      };
    }, [selectedCodeId]);
    useEffect(() => {
      if (!modal) return undefined;
      const onKey = event => {
        if (event.key === 'Escape' && !busy) closeModal();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [modal, busy, generatedAck]);
    const openModal = (kind, event) => {
      lastTrigger.current = event && event.currentTarget ? event.currentTarget : document.activeElement;
      setFormError('');
      setModal(kind);
    };
    const closeModal = () => {
      if (modal === 'generated' && !generatedAck) {
        toast(copy.saveCodesFirst);
        return;
      }
      setModal(null);
      setBusy(false);
      setFormError('');
      setGrantResult(null);
      setReconcileResult(null);
      setDeactivateTarget(null);
      window.setTimeout(() => {
        if (lastTrigger.current && lastTrigger.current.focus) lastTrigger.current.focus();
      }, 0);
    };
    const createBatch = async () => {
      const count = Math.round(Number(cdk.count) || 0);
      const rewardMillis = Math.round((Number(cdk.reward) || 0) * 1000);
      if (!cdk.name.trim()) {
        setFormError(copy.requiredName);
        return;
      }
      if (count < 1 || count > 500) {
        setFormError(copy.invalidCount);
        return;
      }
      if (cdk.reward_type === 'credit' && rewardMillis <= 0) {
        setFormError(copy.requiredReward);
        return;
      }
      if (cdk.reward_type === 'subscription' && !cdk.plan_code) {
        setFormError(copy.requiredPlan);
        return;
      }
      const payload = {
        name: cdk.name.trim(),
        reward_type: cdk.reward_type,
        reward_millis: cdk.reward_type === 'credit' ? rewardMillis : 0,
        count,
        max_redemptions: Math.max(1, Math.round(Number(cdk.max_redemptions) || 1)),
        prefix: cdk.prefix.trim().toUpperCase() || 'LF-RD'
      };
      const perUserLimit = Math.round(Number(cdk.per_user_limit) || 0);
      const durationDays = Math.round(Number(cdk.duration_days) || 0);
      if (perUserLimit > 0) payload.per_user_batch_limit = perUserLimit;
      if (cdk.reward_type === 'subscription') {
        payload.plan_code = cdk.plan_code;
        if (durationDays > 0) payload.duration_days = durationDays;
      }
      if (cdk.expires) payload.expires_at = new Date(`${cdk.expires}T23:59:59`).toISOString();
      setBusy(true);
      setFormError('');
      try {
        const result = await window.LF_API.adminCreateRedemptionCodesBatch(payload);
        setGeneratedCodes(result.map(item => item.code));
        setGeneratedAck(false);
        setModal('generated');
        setCdk(EMPTY_CDK);
        load(false);
      } catch (error) {
        setFormError(error.message || String(error));
      } finally {
        setBusy(false);
      }
    };
    const copyGeneratedCodes = async () => {
      try {
        await navigator.clipboard.writeText(generatedCodes.join('\n'));
        toast(copy.copied);
      } catch (_error) {
        toast(copy.copyFailed);
      }
    };
    const downloadGeneratedCodes = () => {
      const blob = new Blob([generatedCodes.join('\n')], {
        type: 'text/plain;charset=utf-8'
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `redemption-codes-${new Date().toISOString().slice(0, 10)}.txt`;
      anchor.click();
      URL.revokeObjectURL(url);
    };
    const submitGrant = async () => {
      const amountMillis = Math.round((Number(grant.amount) || 0) * 1000);
      if (busy) return;
      if (amountMillis <= 0 || !grant.reason.trim() || !Number.isInteger(Number(grant.validDays)) || Number(grant.validDays) <= 0 || Number(grant.validDays) > 36500) {
        setFormError(copy.invalidGrant);
        return;
      }
      setBusy(true);
      setFormError('');
      try {
        const signature = JSON.stringify([amountMillis, grant.reason.trim(), grant.onlyActive, Number(grant.validDays)]);
        if (!grantRequest.current || grantRequest.current.signature !== signature) grantRequest.current = {
          signature,
          key: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`
        };
        const result = await window.LF_API.adminBulkGrant(amountMillis, grant.reason.trim(), grant.onlyActive, Number(grant.validDays), grantRequest.current.key);
        grantRequest.current = null;
        setGrantResult(result);
        setGrant({
          amount: '',
          onlyActive: true,
          reason: '',
          validDays: ''
        });
        toast(`${copy.grantDone} · ${result.user_count} ${copy.users}`);
      } catch (error) {
        setFormError(error.message || String(error));
      } finally {
        setBusy(false);
      }
    };
    const openDeactivate = (code, event) => {
      if (!code || !isAvailableCode(code)) {
        toast(copy.codeInactive);
        return;
      }
      setDeactivateTarget(code);
      openModal('deactivate', event);
    };
    const confirmDeactivate = async () => {
      if (!deactivateTarget) return;
      setBusy(true);
      try {
        await window.LF_API.adminDeactivateRedemptionCode(deactivateTarget.id);
        toast(window.TC('adm_done'));
        setModal(null);
        setDeactivateTarget(null);
        await load(false);
      } catch (error) {
        toast(error.message || String(error));
      } finally {
        setBusy(false);
      }
    };
    const confirmReconcile = async () => {
      setBusy(true);
      try {
        setReconcileResult(await window.LF_API.adminReconcile());
      } catch (error) {
        toast(error.message || String(error));
      } finally {
        setBusy(false);
      }
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-tools"
    }, /*#__PURE__*/React.createElement("header", {
      className: "adm-tool-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, copy.title), /*#__PURE__*/React.createElement("p", null, copy.subtitle)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: loading,
      onClick: () => load(true)
    }, loading ? '…' : copy.refresh), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm sage",
      onClick: event => {
        setGrantResult(null);
        openModal('grant', event);
      }
    }, copy.bulkGrant), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm gold",
      onClick: event => openModal('create', event)
    }, copy.createBatch))), /*#__PURE__*/React.createElement("section", {
      className: "adm-tool-metrics"
    }, /*#__PURE__*/React.createElement(Metric, {
      label: copy.activeBatches,
      value: activeBatchCount,
      meta: `${validCodeCount} ${copy.codesUnit}`,
      tone: "primary"
    }), /*#__PURE__*/React.createElement(Metric, {
      label: copy.validCodes,
      value: validCodeCount,
      meta: `${batches.length} ${copy.batchCount}`
    }), /*#__PURE__*/React.createElement(Metric, {
      label: copy.redeemed,
      value: totalRedemptions.toLocaleString(),
      meta: `${codes.length} ${copy.codesUnit}`
    }), /*#__PURE__*/React.createElement(Metric, {
      label: copy.expiring,
      value: expiringBatchCount,
      meta: expiringBatchCount ? copy.expiringSoon : '—',
      tone: expiringBatchCount ? 'warning' : ''
    })), loadError ? /*#__PURE__*/React.createElement("section", {
      className: "adm-tool-load-error"
    }, /*#__PURE__*/React.createElement("strong", null, copy.loadFailed), /*#__PURE__*/React.createElement("p", null, copy.loadFailedNote), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => load(false)
    }, copy.retry)) : loading && !codes.length ? /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-skeleton",
      "aria-busy": "true",
      "aria-label": copy.refresh
    }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null)) : !batches.length ? /*#__PURE__*/React.createElement("section", {
      className: "adm-tool-empty"
    }, /*#__PURE__*/React.createElement("strong", null, copy.empty), /*#__PURE__*/React.createElement("p", null, copy.emptyNote), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm gold",
      onClick: event => openModal('create', event)
    }, copy.createBatch)) : /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-workspace"
    }, /*#__PURE__*/React.createElement("section", {
      className: "adm-tool-library"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, copy.batchLibrary), /*#__PURE__*/React.createElement("p", null, copy.batchLibraryNote)), /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-filters"
    }, /*#__PURE__*/React.createElement("div", null, ['all', 'active', 'ended'].map(key => /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: filter === key ? 'selected' : '',
      key: key,
      onClick: () => setFilter(key)
    }, copy[key]))), /*#__PURE__*/React.createElement("input", {
      value: query,
      "aria-label": copy.search,
      placeholder: copy.search,
      onChange: event => setQuery(event.target.value)
    }))), visibleBatches.length ? /*#__PURE__*/React.createElement(BatchTable, {
      batches: visibleBatches,
      selectedId: selectedBatchId,
      onSelect: setSelectedBatchId,
      copy: copy
    }) : /*#__PURE__*/React.createElement("div", {
      className: "adm-tool-filter-empty"
    }, copy.empty)), /*#__PURE__*/React.createElement(BatchInspector, {
      batch: selectedBatch,
      selectedCodeId: selectedCodeId,
      onSelectCode: setSelectedCodeId,
      details: details,
      detailsLoading: detailsLoading,
      detailsError: detailsError,
      showAll: showAllCodes,
      setShowAll: setShowAllCodes,
      onCreate: event => openModal('create', event),
      onDeactivate: openDeactivate,
      copy: copy
    })), /*#__PURE__*/React.createElement("section", {
      className: `adm-tool-maintenance ${maintenanceOpen ? 'open' : ''}`
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-expanded": maintenanceOpen,
      onClick: () => setMaintenanceOpen(value => !value)
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, copy.maintenance), /*#__PURE__*/React.createElement("small", null, copy.reconcileLabel)), /*#__PURE__*/React.createElement("em", null, maintenanceOpen ? copy.close : copy.expand)), maintenanceOpen ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, copy.reconcileNote), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: event => {
        setReconcileResult(null);
        openModal('reconcile', event);
      }
    }, copy.runReconcile)) : null), modal === 'create' ? /*#__PURE__*/React.createElement(CreateBatchModal, {
      form: cdk,
      setForm: setCdk,
      plans: plans,
      formError: formError,
      busy: busy,
      onClose: closeModal,
      onSubmit: createBatch,
      copy: copy
    }) : null, modal === 'generated' ? /*#__PURE__*/React.createElement(GeneratedCodesModal, {
      codes: generatedCodes,
      ack: generatedAck,
      setAck: setGeneratedAck,
      onClose: closeModal,
      onCopy: copyGeneratedCodes,
      onDownload: downloadGeneratedCodes,
      copy: copy
    }) : null, modal === 'grant' ? /*#__PURE__*/React.createElement(BulkGrantModal, {
      form: grant,
      setForm: setGrant,
      busy: busy,
      error: formError,
      result: grantResult,
      onClose: closeModal,
      onSubmit: submitGrant,
      copy: copy
    }) : null, modal === 'deactivate' && deactivateTarget && selectedBatch ? /*#__PURE__*/React.createElement(DeactivateModal, {
      code: deactivateTarget,
      batch: selectedBatch,
      busy: busy,
      onClose: closeModal,
      onConfirm: confirmDeactivate,
      copy: copy
    }) : null, modal === 'reconcile' ? /*#__PURE__*/React.createElement(ReconcileModal, {
      busy: busy,
      result: reconcileResult,
      onClose: closeModal,
      onConfirm: confirmReconcile,
      copy: copy
    }) : null);
  }
  window.AdminToolsTab = ToolsTab;
})();
}
