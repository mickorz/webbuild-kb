{
function ProseDrawPromotionSpark() {
  return /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z"
  }));
}
function ProseDrawPromotion({
  eligible,
  expanded,
  promotion
}) {
  const en = window.CLANG === 'en';
  return /*#__PURE__*/React.createElement("div", {
    className: 'prose-draw-promotion' + (eligible ? ' is-eligible' : '') + (expanded ? ' is-expanded' : ''),
    lang: en ? 'en' : 'zh-CN',
    "aria-hidden": !eligible,
    "data-shape": !eligible ? 'hidden' : expanded ? 'card' : 'badge'
  }, /*#__PURE__*/React.createElement("span", {
    className: "prose-promotion-star",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(ProseDrawPromotionSpark, null)), /*#__PURE__*/React.createElement("span", {
    className: "prose-promotion-pages",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement(ProseDrawPromotionSpark, null)), /*#__PURE__*/React.createElement("strong", {
    className: "prose-promotion-title"
  }, en ? 'Second draft free' : '本次第二篇免费'), /*#__PURE__*/React.createElement("small", {
    className: "prose-promotion-details",
    "aria-hidden": !expanded
  }, promotion ? /*#__PURE__*/React.createElement(React.Fragment, null, en ? 'During the promotion, the first ' + promotion.dailyLimit + ' daily draws cost one writer fee. ' : '活动期间，每日前' + promotion.dailyLimit + '次抽卡只收取一份写手费用，', /*#__PURE__*/React.createElement("span", {
    className: "prose-promotion-today"
  }, en ? 'Today (' + promotion.usedToday + '/' + promotion.dailyLimit + ')' : '今日（' + promotion.usedToday + '/' + promotion.dailyLimit + '）')) : null), /*#__PURE__*/React.createElement("span", {
    className: "prose-promotion-seal",
    "aria-hidden": "true"
  }, en ? 'Gift' : '赠'), /*#__PURE__*/React.createElement("i", {
    className: "prose-promotion-shine",
    "aria-hidden": "true"
  }));
}
function ProseRunConfirmDialog({
  open,
  target,
  onClose,
  onConfirm,
  confirmDisabled = false,
  writerType = 'single',
  onToggleWriter,
  drawEnabled = false,
  onDrawChange,
  drawSettings,
  accountId
}) {
  const [guidance, setGuidance] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [exampleIndex, setExampleIndex] = React.useState(0);
  const [submitError, setSubmitError] = React.useState('');
  const submitRef = React.useRef(false);
  const targetKey = target ? [target.bookId, target.chapterNumber, target.mode, target.requestId].join(':') : '';
  const quoteAccountId = accountId || window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id;
  const defaultKey = window.ProseDrawFlowCore.inputKey(quoteAccountId, target);
  const defaultDrawRef = React.useRef(null);
  if (!open) defaultDrawRef.current = null;else if (defaultDrawRef.current?.key !== defaultKey) defaultDrawRef.current = {
    key: defaultKey,
    decided: false
  };
  const keepSelection = () => {
    if (defaultDrawRef.current) defaultDrawRef.current.decided = true;
  };
  const selectDraw = value => {
    keepSelection();
    onDrawChange?.(value);
  };
  const selectWriter = () => {
    keepSelection();
    onToggleWriter?.();
  };
  const examples = window.CLANG === 'en' ? ['Bring the danger forward and strengthen the pressure in this chapter.', 'Keep the dialogue restrained; do not state the characters’ motives directly.', 'Emphasize the protagonist’s physical reaction when they first sense something is wrong.', 'End on the reply from behind the door and preserve the suspense.'] : ['加强本章的压迫感，让危险更早出现。', '对白更克制，不要直接说出角色的真实动机。', '突出主角第一次察觉异常时的身体反应。', '结尾停在门后回应的瞬间，保留悬念。'];
  React.useEffect(() => {
    if (!open) return;
    setGuidance(target && target.mode === 'first' ? target.guidance || '' : '');
    setFocused(false);
    setExampleIndex(0);
    submitRef.current = false;
    setSubmitError('');
  }, [open, targetKey]);
  React.useEffect(() => {
    if (!open || focused || guidance) return;
    const timer = setInterval(() => setExampleIndex(index => (index + 1) % examples.length), 3200);
    return () => clearInterval(timer);
  }, [open, focused, guidance, examples.length]);
  const multi = writerType === 'muti';
  const draw = !!drawEnabled && !multi;
  const settings = drawSettings || {
    ready: true,
    enabled: drawEnabled,
    globallyEnabled: true
  };
  const promotionEnabled = !multi && settings.globallyEnabled && settings.secondCandidateFreeEnabled === true;
  const drawQuote = window.useProseTaskQuote({
    open: open && (!draw || settings.globallyEnabled),
    accountId: quoteAccountId,
    target,
    writerType,
    draw,
    prefetchDraw: promotionEnabled && settings.ready
  });
  const promotion = drawQuote.promotion;
  const freeEligible = promotionEnabled && (settings.ready || settings.saving) && promotion?.applied === true && promotion.usedToday < promotion.dailyLimit;
  const freeExpanded = freeEligible && draw;
  React.useEffect(() => {
    const choice = defaultDrawRef.current;
    if (!open || !target || !choice || choice.key !== defaultKey || choice.decided || !settings.ready || settings.saving || confirmDisabled || submitRef.current) return;
    if (!promotionEnabled) {
      choice.decided = true;
      return;
    }
    if (!promotion) return;
    // Apply the opening default once; later quotes must preserve an explicit choice.
    choice.decided = true;
    if (freeEligible && !draw) onDrawChange?.(true);
  }, [open, defaultKey, settings.ready, settings.saving, confirmDisabled, promotionEnabled, promotion, freeEligible, draw, onDrawChange]);
  const cost = drawQuote;
  const unavailable = !multi && !settings.ready ? settings.unavailable || settings.error : draw && !settings.globallyEnabled ? settings.unavailable : '';
  const disabled = confirmDisabled || !multi && !settings.ready || draw && (!settings.globallyEnabled || !drawQuote.quote || drawQuote.pending);
  if (!target) return null;
  const existing = target.mode === 'replace';
  const chapterLabel = window.CLANG === 'en' ? 'Chapter ' + target.chapterNumber : '第 ' + target.chapterNumber + ' 章';
  const title = existing ? window.CLANG === 'en' ? 'Regenerate ' + chapterLabel : '重新生成' + chapterLabel + '正文' : window.CLANG === 'en' ? 'Generate ' + chapterLabel : '生成' + chapterLabel + '正文';
  const message = window.CLANG === 'en' ? 'Confirm the target chapter and add optional writing guidance.' : '确认目标章节，可补充本章写作指导后开始生成。';
  const submit = async () => {
    if (submitRef.current || disabled) return;
    keepSelection();
    submitRef.current = true;
    setSubmitError('');
    try {
      const result = await onConfirm(guidance.trim(), draw ? drawQuote.quote : null);
      if (result && result.error) {
        setSubmitError(result.error);
        submitRef.current = false;
      }
      if (result && result.invalidateQuote) drawQuote.refresh();
    } catch (error) {
      submitRef.current = false;
      setSubmitError(window.CLANG === 'en' ? 'The request was not confirmed. Please read its status before retrying.' : '请求结果未确认，请先重新读取状态。');
    }
  };
  const notice = submitError || unavailable || (draw ? drawQuote.error : '');
  return /*#__PURE__*/React.createElement(ConfirmDialog, {
    open: open,
    className: "prose-confirm-dialog",
    tone: existing && !draw ? 'danger' : 'default',
    icon: null,
    title: title,
    message: message,
    cancelLabel: window.CLANG === 'en' ? 'Cancel' : '取消',
    confirmLabel: existing ? window.CLANG === 'en' ? 'Regenerate ' + chapterLabel : '重新生成第 ' + target.chapterNumber + ' 章正文' : window.CLANG === 'en' ? 'Generate ' + chapterLabel : '生成第 ' + target.chapterNumber + ' 章正文',
    confirmDisabled: disabled,
    footerStart: notice ? /*#__PURE__*/React.createElement("div", {
      className: "prose-confirm-unavailable",
      role: "alert"
    }, notice, !confirmDisabled && (!settings.ready && settings.refresh ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: settings.refresh
    }, window.CLANG === 'en' ? 'Read settings again' : '重新读取设置') : draw && settings.globallyEnabled ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      disabled: drawQuote.pending,
      onClick: () => {
        setSubmitError('');
        drawQuote.refresh();
      }
    }, window.CLANG === 'en' ? 'Get a new quote' : '重新获取报价') : null)) : null,
    onClose: onClose,
    onConfirm: submit
  }, /*#__PURE__*/React.createElement("div", {
    className: "prose-confirm-compose",
    "aria-busy": confirmDisabled
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "prose-confirm-close c-ic",
    "aria-label": window.CLANG === 'en' ? 'Close' : '关闭',
    disabled: confirmDisabled,
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "close",
    s: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "prose-confirm-target"
  }, /*#__PURE__*/React.createElement("span", null, window.CLANG === 'en' ? 'Target' : '本次操作对象'), /*#__PURE__*/React.createElement("small", null, "\u300A", target.bookTitle || '', "\u300B"), /*#__PURE__*/React.createElement("strong", null, /*#__PURE__*/React.createElement("span", null, chapterLabel), /*#__PURE__*/React.createElement("i", null, target.chapterTitle || ''))), existing && /*#__PURE__*/React.createElement("div", {
    className: "prose-confirm-warning",
    role: "note"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "clock",
    s: 14
  }), /*#__PURE__*/React.createElement("span", null, draw ? window.CLANG === 'en' ? 'The current prose remains until you adopt a candidate.' : '检测到本章已有正文。当前正文会保留，选择采用后才替换。' : window.CLANG === 'en' ? 'This chapter already has prose. Regeneration will replace it; the previous version remains available in revision history.' : '检测到本章已有正文。重新生成会覆盖当前正文，旧版本仍可在修订记录中恢复。')), /*#__PURE__*/React.createElement("fieldset", {
    className: "prose-confirm-config",
    disabled: confirmDisabled
  }, /*#__PURE__*/React.createElement("legend", null, window.CLANG === 'en' ? 'Generation settings' : '生成配置'), /*#__PURE__*/React.createElement("div", {
    className: "prose-config-row"
  }, /*#__PURE__*/React.createElement("span", null, window.CLANG === 'en' ? 'Enable multiple writers' : '开启多写手'), /*#__PURE__*/React.createElement(WriterToggle, {
    writerType: writerType,
    onToggle: selectWriter,
    showLabels: false,
    disabled: confirmDisabled
  })), /*#__PURE__*/React.createElement("div", {
    className: 'prose-config-row prose-draw-row' + (freeExpanded ? ' is-open' : ''),
    "data-promotion-eligible": !!freeEligible
  }, /*#__PURE__*/React.createElement("div", {
    className: "prose-draw-copy"
  }, /*#__PURE__*/React.createElement("span", null, window.CLANG === 'en' ? 'Prose draw' : '正文抽卡'), /*#__PURE__*/React.createElement("small", null, window.CLANG === 'en' ? 'Generate two prose drafts with different writing approaches, then choose either one to adopt.' : '使用两种写法，生成两篇正文候选，任选一篇采用')), /*#__PURE__*/React.createElement(GenerationToggle, {
    checked: draw,
    onChange: selectDraw,
    icon: "copy",
    disabled: multi || confirmDisabled || !settings.ready && !settings.saving || !settings.globallyEnabled && !drawEnabled,
    label: window.CLANG === 'en' ? 'Prose draw' : '正文抽卡',
    title: multi ? window.CLANG === 'en' ? 'Single writer only' : '仅单写手可用' : undefined
  }), /*#__PURE__*/React.createElement(ProseDrawPromotion, {
    eligible: !!freeEligible,
    expanded: !!freeExpanded,
    promotion: promotion
  }), /*#__PURE__*/React.createElement("div", {
    className: 'prose-promotion-slot' + (freeExpanded ? ' is-open' : ''),
    "aria-hidden": "true"
  }))), /*#__PURE__*/React.createElement("label", {
    className: "prose-confirm-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "prose-confirm-label"
  }, /*#__PURE__*/React.createElement("strong", null, window.CLANG === 'en' ? 'Writing guidance for this chapter' : '本章写作指导'), /*#__PURE__*/React.createElement("small", null, window.CLANG === 'en' ? 'Optional' : '可选')), /*#__PURE__*/React.createElement("span", {
    className: "prose-confirm-input"
  }, /*#__PURE__*/React.createElement("textarea", {
    rows: 3,
    disabled: confirmDisabled,
    "aria-label": window.CLANG === 'en' ? 'Writing guidance for this chapter' : '本章写作指导',
    value: guidance,
    maxLength: 20000,
    onChange: event => {
      setGuidance(event.target.value);
      setSubmitError('');
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false)
  }), !guidance && !focused && /*#__PURE__*/React.createElement("span", {
    key: exampleIndex,
    className: "prose-confirm-example",
    "aria-hidden": "true"
  }, examples[exampleIndex])))), /*#__PURE__*/React.createElement("aside", {
    className: 'prose-confirm-summary' + (draw ? ' is-draw' : ''),
    "aria-label": window.CLANG === 'en' ? 'Generation summary' : '本轮生成'
  }, /*#__PURE__*/React.createElement("strong", {
    className: "prose-summary-label"
  }, window.CLANG === 'en' ? 'This generation' : '本轮生成'), /*#__PURE__*/React.createElement("div", {
    className: "prose-summary-papers",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("i", {
    className: "prose-summary-paper back"
  }), /*#__PURE__*/React.createElement("i", {
    className: "prose-summary-paper front"
  })), /*#__PURE__*/React.createElement("div", {
    className: "prose-summary-count",
    "aria-live": "polite",
    "aria-atomic": "true"
  }, /*#__PURE__*/React.createElement(ProseMotionNumber, {
    value: draw ? 2 : 1
  }), /*#__PURE__*/React.createElement("span", null, window.CLANG === 'en' ? ' drafts' : '篇正文')), /*#__PURE__*/React.createElement("div", {
    className: "prose-summary-cost",
    "aria-live": "polite",
    "aria-atomic": "true",
    "aria-busy": cost.pending
  }, /*#__PURE__*/React.createElement("span", null, window.CLANG === 'en' ? 'Credits' : '本次笔力'), /*#__PURE__*/React.createElement("strong", null, /*#__PURE__*/React.createElement("span", {
    className: "prose-cost-value"
  }, cost.pending ? /*#__PURE__*/React.createElement("span", {
    className: "prose-cost-placeholder",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(ProseMotionNumber, {
    value: cost.text
  })), /*#__PURE__*/React.createElement("small", null, window.CLANG === 'en' ? ' credits' : '笔力')))));
}
window.ProseRunConfirmDialog = ProseRunConfirmDialog;
}
