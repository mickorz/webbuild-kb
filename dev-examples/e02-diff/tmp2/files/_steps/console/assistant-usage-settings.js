{
/* Quota, turn protection, and memory injection budget. */
(function () {
  const Core = window.AssistantUsageCore;
  const {
    useEffect,
    useRef,
    useState
  } = React;
  function copyFor(lang) {
    const en = lang === "en";
    return {
      title: en ? "Usage and limits" : "使用与额度",
      controls: en ? "Session controls" : "会话控制",
      myUsage: en ? "My usage" : "我的用量",
      manageMemory: en ? "Manage memory" : "管理记忆",
      manageFiles: en ? "Manage materials" : "管理资料",
      membersOnly: en ? "Members can adjust" : "会员可调整",
      protectionHint: en ? "Pauses before the next step at the limit; confirm to continue." : "达到额度后暂停下一步，确认后继续。",
      memoryHint: en ? "Saved memory included when a new conversation starts." : "每个新会话带入的长期记忆上限。",
      planUnknown: en ? "Unknown" : "未知",
      memory: en ? "Memories" : "长期记忆",
      storage: en ? "Material storage" : "资料空间",
      unknown: en ? "Unknown" : "未知",
      near: en ? "Near the limit" : "接近上限",
      over: en ? "No more can be added" : "不能再新增",
      protection: en ? "Turn protection" : "单轮消耗保护",
      protectionUnit: en ? "credits" : "笔力",
      protectionLocked: en ? "An active paid subscription is required to change turn protection." : "有效付费订阅才能修改单轮消耗保护。",
      memoryBudget: en ? "Initial memory budget" : "首轮记忆预算",
      memoryUnit: "Token",
      save: en ? "Save changes" : "保存修改",
      saving: en ? "Saving…" : "保存中…",
      reload: en ? "Reload" : "重新读取",
      loading: en ? "Loading…" : "加载中…",
      loadFailed: en ? "Usage settings could not be loaded." : "助手设置暂时无法读取。",
      retry: en ? "Retry" : "重试",
      saved: en ? "Usage settings saved." : "助手设置已保存。",
      conflict: en ? "These settings changed elsewhere. The draft is kept. Reload before saving again." : "这些设置刚被更新。草稿还在，请重新读取后再保存。",
      discardTitle: en ? "Discard the draft and reload?" : "放弃草稿并重新读取？",
      discardBody: en ? "Unsaved changes will be discarded." : "未保存的修改将被放弃。",
      keepEditing: en ? "Keep editing" : "继续编辑",
      forbidden: en ? "The current subscription cannot change turn protection." : "当前订阅不能修改单轮消耗保护。",
      invalid: en ? "Correct the highlighted values before saving." : "请先修正标出的数值再保存。",
      unavailable: en ? "Usage settings could not be saved." : "助手设置暂时无法保存。",
      creditsEmpty: en ? "Enter the turn protection amount." : "请填写单轮消耗保护笔力。",
      creditsInvalid: en ? "Enter an amount above 0 and up to 100,000, with at most 3 decimal places." : "请填写大于 0 且不超过 100,000 的笔力，最多 3 位小数。",
      tokensInvalid: en ? "Enter a whole number." : "请填写整数。",
      tokensRange: en ? "Enter a whole number from {min} to {max}." : "请填写 {min} 到 {max} 的整数。",
      tokensMin: en ? "Enter a whole number of at least {min}." : "请填写大于或等于 {min} 的整数。",
      tokensMax: en ? "Enter a whole number up to {max}." : "请填写不超过 {max} 的整数。",
      explainSummary: en ? "How does memory affect cost?" : "记忆预算怎样影响费用？",
      explainExceed: en ? "A single model call can still cost more than this amount." : "单次模型调用仍可能超过这个额度。",
      explainCost: en ? "The memory budget caps how much saved memory is added to a new conversation. Injected memory counts toward input usage and can increase the cost. Lowering the budget does not delete saved memories." : "预算是上限，实际带入可能更少。带入的记忆计入对话输入用量；降低预算不会删除已保存的记忆。"
    };
  }
  function tokenMessage(error, copy) {
    if (!error) return "";
    if (error.code === "range" && error.min != null && error.max != null) {
      return copy.tokensRange.replace("{min}", String(error.min)).replace("{max}", String(error.max));
    }
    if (error.code === "range" && error.min != null) return copy.tokensMin.replace("{min}", String(error.min));
    if (error.code === "range" && error.max != null) return copy.tokensMax.replace("{max}", String(error.max));
    return copy.tokensInvalid;
  }
  function integerAttr(value) {
    if (value == null || value === "") return undefined;
    const number = Number(value);
    return Number.isInteger(number) ? number : undefined;
  }
  function amountText(numberValue, unknown) {
    if (numberValue == null) return unknown;
    return Number(numberValue).toLocaleString();
  }
  function blankDraft() {
    return {
      turnProtection: "",
      memoryTokens: ""
    };
  }
  function draftFrom(value) {
    return {
      turnProtection: value && value.turn_protection_credits == null ? "" : String(value.turn_protection_credits),
      memoryTokens: value && value.memory_context_tokens == null ? "" : String(value.memory_context_tokens)
    };
  }
  function creditsLabel(raw, unit) {
    const parsed = Core.normalizeCredits(raw);
    if (!parsed.ok) return raw ? String(raw) + " " + unit : "—";
    return Number(parsed.text).toLocaleString(undefined, {
      maximumFractionDigits: 3
    }) + " " + unit;
  }
  function tokensLabel(raw, limits, unit) {
    const parsed = Core.normalizeTokens(raw, limits);
    if (!parsed.ok) return raw ? String(raw) + " " + unit : "—";
    return parsed.value.toLocaleString() + " " + unit;
  }
  function UsageMeter({
    label,
    view,
    usedText,
    limitText,
    status
  }) {
    const percent = Core.meterPercent(view);
    const valueText = usedText + " / " + limitText;
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-meter is-" + view.kind,
      role: "meter",
      "aria-label": label,
      "aria-valuemin": 0,
      "aria-valuemax": view.limit == null ? undefined : view.limit,
      "aria-valuenow": view.used == null ? undefined : view.used,
      "aria-valuetext": status ? valueText + " " + status : valueText
    }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("strong", null, valueText), /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-meter-track",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("i", {
      style: percent == null ? undefined : {
        width: percent + "%"
      }
    })), status ? /*#__PURE__*/React.createElement("em", null, status) : null);
  }
  function MemoryBudgetHelp({
    label,
    text
  }) {
    const [open, setOpen] = useState(false),
      ref = useRef(null);
    useEffect(() => {
      if (!open) return;
      const outside = event => {
        if (!ref.current?.contains(event.target)) setOpen(false);
      };
      const escape = event => {
        if (event.key === "Escape") {
          event.stopPropagation();
          setOpen(false);
        }
      };
      document.addEventListener("pointerdown", outside);
      document.addEventListener("keydown", escape);
      return () => {
        document.removeEventListener("pointerdown", outside);
        document.removeEventListener("keydown", escape);
      };
    }, [open]);
    return /*#__PURE__*/React.createElement("span", {
      className: "asst-usage-help",
      ref: ref,
      onMouseEnter: () => setOpen(true),
      onMouseLeave: () => setOpen(false),
      onBlur: event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm asst-usage-help-button",
      "aria-label": label,
      "aria-expanded": open,
      "aria-describedby": open ? "assistant-memory-budget-help" : undefined,
      onFocus: () => setOpen(true),
      onClick: () => setOpen(true)
    }, "?"), open ? /*#__PURE__*/React.createElement("span", {
      className: "asst-usage-help-popover",
      role: "tooltip",
      id: "assistant-memory-budget-help"
    }, text) : null);
  }
  function AssistantUsageSettingsPanel({
    lang,
    userId,
    active = true,
    onManage
  }) {
    const copy = copyFor(lang);
    const [saved, setSaved] = useState(null);
    const [draft, setDraft] = useState(null);
    const [phase, setPhase] = useState("loading");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [conflict, setConflict] = useState(false);
    const [open, setOpen] = useState(null);
    const [confirm, setConfirm] = useState(false);
    const sequence = useRef(0);
    const editGeneration = useRef(0);
    const savedRef = useRef(null);
    const draftRef = useRef(null);
    const dirtyRef = useRef(false);
    const conflictRef = useRef(false);
    const savingRef = useRef(false);
    const activeRef = useRef(active);
    const userRef = useRef(userId);
    const protectionButtonRef = useRef(null);
    const budgetButtonRef = useRef(null);
    const protectionInputRef = useRef(null);
    const budgetInputRef = useRef(null);
    const focusReturn = useRef(null);
    const dialogRef = useRef(null);
    const inflight = useRef(null);
    const startLoadRef = useRef(null);
    const result = Core && saved && draft ? Core.usagePatch(saved, draft) : {
      ok: false,
      dirty: false,
      patch: {},
      errors: {}
    };
    activeRef.current = active;
    userRef.current = userId;
    savedRef.current = saved;
    draftRef.current = draft;
    dirtyRef.current = !!result.dirty;
    conflictRef.current = conflict;
    savingRef.current = saving;
    function applySnapshot(value) {
      const next = draftFrom(value);
      savedRef.current = value;
      draftRef.current = next;
      setSaved(value);
      setDraft(next);
    }
    function changeDraft(partial) {
      if (savingRef.current) return;
      editGeneration.current += 1;
      setNotice("");
      setError(current => current === "conflict" || current === "load" ? current : "");
      setDraft(current => {
        const base = current || blankDraft();
        const next = {
          turnProtection: base.turnProtection,
          memoryTokens: base.memoryTokens
        };
        if (Object.prototype.hasOwnProperty.call(partial, "turnProtection")) next.turnProtection = partial.turnProtection;
        if (Object.prototype.hasOwnProperty.call(partial, "memoryTokens")) next.memoryTokens = partial.memoryTokens;
        draftRef.current = next;
        return next;
      });
    }
    function startLoad(options) {
      const opts = options || {};
      const force = opts.force === true;
      const silent = opts.silent === true;
      const initial = opts.initial === true;
      if (!initial && !force && (savingRef.current || dirtyRef.current || conflictRef.current)) return function stopIdle() {};
      if (inflight.current) inflight.current.abort();
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      inflight.current = controller;
      const seenGeneration = editGeneration.current;
      const seenUser = userRef.current;
      const current = ++sequence.current;
      if (initial) setError("");
      if (initial && !savedRef.current) setPhase("loading");
      const api = window.LF_API;
      if (!api || typeof api.assistantSettings !== "function") {
        setPhase(savedRef.current ? "ready" : "error");
        setError("load");
        return function stopMissing() {};
      }
      let pending;
      try {
        pending = api.assistantSettings(controller ? {
          signal: controller.signal
        } : {});
      } catch (loadError) {
        setPhase(savedRef.current ? "ready" : "error");
        setError("load");
        return function stopSync() {};
      }
      Promise.resolve(pending).then(value => {
        if (inflight.current === controller) inflight.current = null;
        if (current !== sequence.current || seenUser !== userRef.current) return;
        if (seenGeneration !== editGeneration.current) return;
        if (!force && (dirtyRef.current || conflictRef.current)) return;
        if (!value || typeof value !== "object") {
          setPhase(savedRef.current ? "ready" : "error");
          setError("load");
          return;
        }
        applySnapshot(value);
        conflictRef.current = false;
        setConflict(false);
        setConfirm(false);
        setError("");
        if (force || initial) {
          setOpen(null);
          setNotice("");
        }
        setPhase("ready");
      }).catch(loadError => {
        if (inflight.current === controller) inflight.current = null;
        if (current !== sequence.current || loadError && loadError.name === "AbortError") return;
        if (seenUser !== userRef.current) return;
        if (silent && savedRef.current) return;
        setPhase(savedRef.current ? "ready" : "error");
        setError("load");
      });
      return function stop() {
        sequence.current += 1;
        if (controller) controller.abort();
        if (inflight.current === controller) inflight.current = null;
      };
    }
    startLoadRef.current = startLoad;
    function askReload() {
      if (savingRef.current) return;
      if (dirtyRef.current) setConfirm(true);else startLoad({
        force: true
      });
    }
    async function save() {
      if (!Core || savingRef.current || conflictRef.current) return;
      const currentResult = Core.usagePatch(savedRef.current, draftRef.current);
      if (!currentResult.dirty || !currentResult.ok) return;
      const seen = sequence.current;
      const seenGeneration = editGeneration.current;
      const seenUser = userRef.current;
      savingRef.current = true;
      setSaving(true);
      setError("");
      try {
        const value = await window.LF_API.updateAssistantSettings(currentResult.patch);
        if (seen !== sequence.current || seenUser !== userRef.current || seenGeneration !== editGeneration.current) return;
        applySnapshot(value);
        conflictRef.current = false;
        setConflict(false);
        setConfirm(false);
        setOpen(null);
        setError("");
        setNotice("saved");
        setPhase("ready");
      } catch (saveError) {
        if (seen !== sequence.current || seenUser !== userRef.current) return;
        const kind = Core.classifyError(saveError);
        // A revision conflict must not submit another PATCH until the author reloads.
        if (kind === "conflict") {
          conflictRef.current = true;
          setConflict(true);
        }
        setError(kind);
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    }
    function collapseOnEscape(event) {
      if (event.key !== "Escape" || !open) return;
      event.preventDefault();
      event.stopPropagation();
      focusReturn.current = open;
      setOpen(null);
    }
    function dialogKeys(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirm(false);
        return;
      }
      if (event.key !== "Tab") return;
      const node = dialogRef.current;
      if (!node || typeof node.querySelectorAll !== "function") return;
      const items = Array.from(node.querySelectorAll("button:not([disabled])"));
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    useEffect(() => {
      const protect = event => {
        if (!savingRef.current && !dirtyRef.current) return;
        event.preventDefault();
        event.returnValue = "";
      };
      window.addEventListener("beforeunload", protect);
      const guard = window.AssistantCiteCore && window.AssistantCiteCore.editGuard;
      const release = guard && typeof guard.registerNavigationBlocker === "function" ? guard.registerNavigationBlocker(() => savingRef.current || dirtyRef.current) : function releaseGuard() {};
      return () => {
        release();
        window.removeEventListener("beforeunload", protect);
      };
    }, []);
    useEffect(() => {
      const stop = startLoadRef.current({
        initial: true
      });
      return stop;
    }, [userId]);
    useEffect(() => {
      const onFocus = () => {
        if (document.visibilityState === "hidden") return;
        startLoadRef.current({
          silent: true
        });
      };
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onFocus);
      return () => {
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onFocus);
      };
    }, [userId]);
    useEffect(() => {
      if (active === false || !open) return undefined;
      const node = open === "protection" ? protectionInputRef.current : budgetInputRef.current;
      if (node && !node.disabled && typeof node.focus === "function") node.focus();else if (node?.disabled) node.closest?.(".asst-usage-row-control")?.focus();
      return undefined;
    }, [open, active]);
    useEffect(() => {
      if (active === false) {
        focusReturn.current = null;
        return undefined;
      }
      if (open) return undefined;
      const which = focusReturn.current;
      if (!which) return undefined;
      focusReturn.current = null;
      const button = which === "protection" ? protectionButtonRef.current : budgetButtonRef.current;
      if (button && typeof button.focus === "function") button.focus();
      return undefined;
    }, [open, active]);
    useEffect(() => {
      if (window.ConfirmDialog || !confirm || active === false) return undefined;
      document.addEventListener("keydown", dialogKeys);
      return () => document.removeEventListener("keydown", dialogKeys);
    }, [confirm, active]);
    if (!Core) return /*#__PURE__*/React.createElement("p", {
      className: "asst-settings-error",
      role: "alert"
    }, copy.loadFailed);
    if (phase === "loading" && !saved) return /*#__PURE__*/React.createElement("p", {
      className: "asst-settings-loading",
      role: "status"
    }, copy.loading);
    if (!saved || !draft) {
      return /*#__PURE__*/React.createElement("div", {
        className: "asst-settings-state",
        role: "alert"
      }, /*#__PURE__*/React.createElement("p", null, copy.loadFailed), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        onClick: () => startLoadRef.current({
          initial: true
        })
      }, copy.retry));
    }
    const locked = saved.can_configure_protection !== true;
    const memory = saved.allowances && saved.allowances.memory || {};
    const storage = saved.allowances && saved.allowances.storage || {};
    const memoryView = Core.quotaView(memory.used, memory.limit);
    const storageView = Core.quotaView(storage.used_bytes, storage.limit_bytes);
    const storageUsed = storageView.used == null ? copy.unknown : Core.formatBytes(storageView.used) || amountText(storageView.used, copy.unknown);
    const storageLimit = storageView.limit == null ? copy.unknown : Core.formatBytes(storageView.limit) || amountText(storageView.limit, copy.unknown);
    const statusFor = view => view.kind === "near" ? copy.near : view.kind === "over" ? copy.over : "";
    const protectionCode = result.errors.turnProtection;
    const protectionError = protectionCode === "empty" ? copy.creditsEmpty : protectionCode ? copy.creditsInvalid : "";
    const tokenError = tokenMessage(result.errors.memoryTokens, copy);
    const protectionOpen = open === "protection";
    const budgetOpen = open === "budget";
    const tokenMin = integerAttr(saved.limits && saved.limits.memory_context_tokens_min);
    const tokenMax = integerAttr(saved.limits && saved.limits.memory_context_tokens_max);
    const presets = typeof Core.budgetPresets === "function" ? Core.budgetPresets(saved.limits) : [];
    const protectionText = creditsLabel(draft.turnProtection, copy.protectionUnit);
    const budgetText = tokensLabel(draft.memoryTokens, saved.limits, copy.memoryUnit);
    const banner = error === "conflict" ? copy.conflict : error === "load" ? copy.loadFailed : error === "forbidden" ? copy.forbidden : error === "invalid" ? copy.invalid : error === "unavailable" ? copy.unavailable : "";
    const showDialog = confirm && active !== false;
    const Confirm = window.ConfirmDialog;
    const selectedPreset = preset => {
      const parsed = Core.normalizeTokens(draft.memoryTokens, saved.limits);
      return parsed.ok && parsed.value === preset;
    };
    return /*#__PURE__*/React.createElement("section", {
      className: "asst-usage",
      "aria-labelledby": "assistant-usage-heading",
      "aria-busy": saving ? "true" : "false"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-editor-block"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-settings-section-head asst-page-head"
    }, /*#__PURE__*/React.createElement("h2", {
      className: "set-panel-t",
      id: "assistant-usage-heading"
    }, copy.title), /*#__PURE__*/React.createElement("div", {
      className: "asst-settings-actions"
    }, notice === "saved" && !result.dirty && !error ? /*#__PURE__*/React.createElement("span", {
      className: "asst-usage-saved",
      role: "status"
    }, copy.saved) : null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      onClick: save,
      disabled: saving || conflict || !result.dirty || !result.ok
    }, saving ? copy.saving : copy.save))), banner ? /*#__PURE__*/React.createElement("div", {
      className: "asst-settings-error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("p", null, banner), error === "conflict" || error === "load" ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: askReload,
      disabled: saving
    }, copy.reload) : null) : null, /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-section-title"
    }, /*#__PURE__*/React.createElement("h3", null, copy.controls), /*#__PURE__*/React.createElement("span", {
      className: "asst-usage-badge"
    }, Core.planLabel(saved.plan_code, lang === "en") || copy.planUnknown)), /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-rows"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-row-copy"
    }, /*#__PURE__*/React.createElement("label", {
      id: "assistant-turn-protection-label",
      htmlFor: protectionOpen ? "assistant-turn-protection" : undefined
    }, copy.protection, locked ? /*#__PURE__*/React.createElement("span", {
      className: "asst-usage-lock"
    }, copy.membersOnly) : null), /*#__PURE__*/React.createElement("p", null, copy.protectionHint)), /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-row-control",
      id: "assistant-turn-protection-editor",
      "aria-labelledby": "assistant-turn-protection-label",
      tabIndex: protectionOpen ? -1 : undefined,
      onKeyDown: protectionOpen ? collapseOnEscape : undefined
    }, protectionOpen ? /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-inline"
    }, /*#__PURE__*/React.createElement("input", {
      id: "assistant-turn-protection",
      ref: protectionInputRef,
      inputMode: "decimal",
      autoComplete: "off",
      "aria-invalid": protectionError ? "true" : "false",
      "aria-describedby": locked || protectionError ? "assistant-turn-protection-note" : undefined,
      disabled: locked || saving,
      value: draft.turnProtection,
      onChange: event => {
        if (locked) return;
        changeDraft({
          turnProtection: event.target.value
        });
      }
    }), /*#__PURE__*/React.createElement("span", null, copy.protectionUnit)) : /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      ref: protectionButtonRef,
      id: "assistant-turn-protection-value",
      "aria-labelledby": "assistant-turn-protection-label assistant-turn-protection-value",
      "aria-expanded": false,
      "aria-controls": "assistant-turn-protection-editor",
      "aria-describedby": protectionError ? "assistant-turn-protection-note" : undefined,
      disabled: saving,
      onClick: () => setOpen("protection")
    }, protectionText), protectionOpen ? /*#__PURE__*/React.createElement("small", null, copy.explainExceed) : null, locked && protectionOpen || protectionError ? /*#__PURE__*/React.createElement("small", {
      id: "assistant-turn-protection-note",
      className: protectionError ? "asst-usage-error" : undefined
    }, protectionError || copy.protectionLocked) : null)), /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-row-copy"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-budget-label"
    }, /*#__PURE__*/React.createElement("label", {
      id: "assistant-memory-context-label",
      htmlFor: budgetOpen ? "assistant-memory-context-tokens" : undefined
    }, copy.memoryBudget), /*#__PURE__*/React.createElement(MemoryBudgetHelp, {
      label: copy.explainSummary,
      text: copy.explainCost
    })), /*#__PURE__*/React.createElement("p", null, copy.memoryHint)), /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-row-control",
      id: "assistant-memory-editor",
      onKeyDown: budgetOpen ? collapseOnEscape : undefined
    }, budgetOpen ? /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-inline"
    }, /*#__PURE__*/React.createElement("input", {
      id: "assistant-memory-context-tokens",
      ref: budgetInputRef,
      inputMode: "numeric",
      autoComplete: "off",
      min: tokenMin,
      max: tokenMax,
      step: 1,
      "aria-invalid": tokenError ? "true" : "false",
      "aria-describedby": tokenError ? "assistant-memory-context-note" : undefined,
      disabled: saving,
      value: draft.memoryTokens,
      onChange: event => changeDraft({
        memoryTokens: event.target.value
      })
    }), /*#__PURE__*/React.createElement("span", null, copy.memoryUnit)) : /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      ref: budgetButtonRef,
      id: "assistant-memory-context-value",
      "aria-labelledby": "assistant-memory-context-label assistant-memory-context-value",
      "aria-expanded": false,
      "aria-controls": "assistant-memory-editor",
      "aria-describedby": tokenError ? "assistant-memory-context-note" : undefined,
      disabled: saving,
      onClick: () => setOpen("budget")
    }, budgetText), budgetOpen && presets.length ? /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-presets"
    }, presets.map(preset => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: preset,
      className: "c-btn sm",
      "aria-pressed": selectedPreset(preset),
      disabled: saving,
      onClick: () => changeDraft({
        memoryTokens: String(preset)
      })
    }, preset.toLocaleString()))) : null, tokenError ? /*#__PURE__*/React.createElement("small", {
      id: "assistant-memory-context-note",
      className: "asst-usage-error"
    }, tokenError) : null)))), /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-quotas"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-section-title"
    }, /*#__PURE__*/React.createElement("h3", null, copy.myUsage)), /*#__PURE__*/React.createElement(UsageMeter, {
      label: copy.memory,
      view: memoryView,
      status: statusFor(memoryView),
      usedText: amountText(memoryView.used, copy.unknown),
      limitText: amountText(memoryView.limit, copy.unknown)
    }), /*#__PURE__*/React.createElement(UsageMeter, {
      label: copy.storage,
      view: storageView,
      status: statusFor(storageView),
      usedText: storageUsed,
      limitText: storageLimit
    }), onManage ? /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-links"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => onManage("memory")
    }, copy.manageMemory, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u2197")), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => onManage("workspace")
    }, copy.manageFiles, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u2192"))) : null), showDialog && Confirm ? /*#__PURE__*/React.createElement(Confirm, {
      open: true,
      className: "asst-usage-confirm",
      title: copy.discardTitle,
      message: copy.discardBody,
      cancelLabel: copy.keepEditing,
      confirmLabel: copy.reload,
      tone: "danger",
      onClose: () => setConfirm(false),
      onConfirm: () => {
        setConfirm(false);
        startLoadRef.current({
          force: true
        });
      }
    }) : null, showDialog && !Confirm ? /*#__PURE__*/React.createElement("div", {
      ref: dialogRef,
      className: "asst-usage-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "assistant-usage-reload-title",
      onKeyDown: dialogKeys
    }, /*#__PURE__*/React.createElement("h2", {
      id: "assistant-usage-reload-title"
    }, copy.discardTitle), /*#__PURE__*/React.createElement("p", null, copy.discardBody), /*#__PURE__*/React.createElement("div", {
      className: "asst-usage-dialog-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn sm",
      onClick: () => setConfirm(false)
    }, copy.keepEditing), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn gold sm",
      onClick: () => {
        setConfirm(false);
        startLoadRef.current({
          force: true
        });
      }
    }, copy.reload))) : null);
  }
  window.AssistantUsageSettingsPanel = AssistantUsageSettingsPanel;
})();
}
