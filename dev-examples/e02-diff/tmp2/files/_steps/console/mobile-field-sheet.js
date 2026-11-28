{
/* Phone field sheet (FD-176): one bottom sheet that shows a long field in full, edits it in place and runs
   the field's AI rewrite, with no separate view and edit states. Saving and rewriting reuse the page's
   EditCtx exactly as EditBlock does; the sheet holds the assistant edit guard while it is open. */
(function () {
  const {
    useState,
    useEffect,
    useLayoutEffect,
    useContext,
    useRef
  } = React;
  const TC = window.TC;
  const en = () => window.CLANG === 'en';

  // field: { key, title, subtitle, value, label, rewritePath, multiline, onCommit, step }
  function MobileFieldSheet({
    field,
    onClose,
    onOpen
  }) {
    const Kit = window.LFMobileKit,
      Icon = window.Icon;
    const ctx = useContext(window.EditCtx) || {};
    const toast = ctx.toast || function () {};
    const cite = ctx.cite || null;
    const AskAssistant = window.LF_EDIT && window.LF_EDIT.AskAssistantButton;
    const [draft, setDraft] = useState('');
    const [intent, setIntent] = useState('');
    const [busy, setBusy] = useState(false);
    const key = field ? field.key : null;
    const textRef = useRef(null);
    const open = !!field;
    useEffect(() => {
      if (field) {
        setDraft(field.value || '');
        setIntent('');
        setBusy(false);
      }
    }, [key]);
    // The text box fits its content plus two empty lines, so short fields stay short and long ones grow.
    useLayoutEffect(() => {
      const node = textRef.current;
      if (!node || !window.resizeAutoGrowTextarea) return;
      window.resizeAutoGrowTextarea(node);
      if (field && field.multiline !== false) {
        const line = parseFloat(window.getComputedStyle(node).lineHeight) || 32;
        node.style.height = parseFloat(node.style.height) + line * 2 + 'px';
      }
    }, [draft, key]);
    useEffect(() => {
      if (!open || !cite || !cite.identity) return undefined;
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      return guard ? guard.acquire(cite.identity) : undefined;
    }, [open, cite && cite.identity && cite.identity.resource_key, cite && cite.bookId]);
    const saveDraft = () => {
      const value = (draft || '').trim();
      if (!field || !value || value === field.value) return false;
      field.onCommit(value);
      toast(TC('ed_saved'));
      return true;
    };
    const save = () => {
      saveDraft();
      onClose();
    };
    const go = target => {
      if (target) {
        saveDraft();
        onOpen(target);
      }
    };
    const rewrite = async () => {
      const instruction = intent.trim();
      if (!field || !instruction || busy) return;
      setBusy(true);
      const out = await window.runFieldRewrite(ctx, {
        text: draft || field.value,
        intent: instruction,
        label: field.label,
        rewritePath: field.rewritePath
      });
      setBusy(false);
      if (out) {
        setDraft(out);
        setIntent('');
      }
    };
    const blocked = !!(window.LF_ENGINE_BLOCKED && window.LF_ENGINE_BLOCKED());
    const citePath = field && cite && cite.pathFor ? cite.pathFor(field.rewritePath) : field && field.rewritePath;
    const step = field && field.step;
    return /*#__PURE__*/React.createElement(Kit.Drawer, {
      open: open,
      placement: "bottom",
      className: "m-field-sheet",
      bodyClassName: "m-field-sheet-body",
      title: field ? field.title : '',
      subtitle: field ? field.subtitle : undefined,
      onClose: onClose,
      headerActions: step && step.total > 1 ? /*#__PURE__*/React.createElement("div", {
        className: "m-field-step"
      }, /*#__PURE__*/React.createElement("span", {
        className: "c-latin"
      }, step.index + 1 + ' / ' + step.total), /*#__PURE__*/React.createElement("button", {
        type: "button",
        "aria-label": en() ? 'Previous' : '上一条',
        disabled: !step.prev,
        onClick: () => go(step.prev)
      }, /*#__PURE__*/React.createElement("span", {
        className: "m-field-up"
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "caret",
        s: 16,
        w: 2
      }))), /*#__PURE__*/React.createElement("button", {
        type: "button",
        "aria-label": en() ? 'Next' : '下一条',
        disabled: !step.next,
        onClick: () => go(step.next)
      }, /*#__PURE__*/React.createElement("span", {
        className: "m-field-down"
      }, /*#__PURE__*/React.createElement(Icon, {
        n: "caret",
        s: 16,
        w: 2
      })))) : null,
      footer: /*#__PURE__*/React.createElement("div", {
        className: "m-field-actions"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn",
        onClick: onClose
      }, TC('ed_cancel')), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn gold",
        onClick: save
      }, TC('ed_save')))
    }, field ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
      ref: textRef,
      className: 'm-field-text' + (field.multiline === false ? ' is-single' : ''),
      "aria-label": field.label,
      rows: 1,
      value: draft,
      onChange: event => setDraft(event.target.value)
    }), /*#__PURE__*/React.createElement("div", {
      className: "m-muted m-field-note"
    }, en() ? 'Changes apply the next time the chapter is written.' : '修改会在下次运行成文时生效'), /*#__PURE__*/React.createElement("div", {
      className: "m-field-ai"
    }, /*#__PURE__*/React.createElement("label", {
      htmlFor: "m-field-ai-input",
      className: "m-field-ai-label"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "bolt",
      s: 13
    }), en() ? 'AI rewrite' : 'AI 改写'), /*#__PURE__*/React.createElement("div", {
      className: "m-field-ai-row"
    }, /*#__PURE__*/React.createElement("input", {
      id: "m-field-ai-input",
      type: "text",
      value: intent,
      maxLength: window.LF_REWRITE_INTENT_MAX_CHARS || 20000,
      placeholder: TC('ed_ai_ph'),
      onChange: event => setIntent(event.target.value),
      onKeyDown: event => {
        if (event.key === 'Enter') rewrite();
      }
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "m-field-ai-go",
      disabled: !intent.trim() || busy || blocked,
      onClick: rewrite
    }, busy ? /*#__PURE__*/React.createElement("span", {
      className: "edt-spin sm"
    }) : null, busy ? TC('ed_genning') : TC('ed_gen'))), /*#__PURE__*/React.createElement("div", {
      className: "m-field-chips"
    }, AskAssistant && cite && cite.bookId && cite.identity && citePath ? /*#__PURE__*/React.createElement("span", {
      className: "m-field-ask"
    }, /*#__PURE__*/React.createElement(AskAssistant, {
      bookId: cite.bookId,
      identity: cite.identity,
      path: citePath
    })) : null, (TC('ed_chips') || []).map(chip => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: chip,
      onClick: () => setIntent(chip)
    }, chip))))) : null);
  }
  window.MobileFieldSheet = MobileFieldSheet;
})();
}
