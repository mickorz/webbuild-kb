/* ===== 笔枢 · 通用报错对话弹窗 =====
   门户侧常见错误（积分不足 / 建书额度 / 登录过期等）映射为定制化文案；
   模型内容审核失败单独分类，不得写成「生成引擎报错」；
   其余引擎侧错误（error_message / engine_detail）透传安全说明。
   用法：window.LF_ERROR(errOrString, opts?) → Promise（点击「确定」后 resolve）。
   仅当确实是后端/引擎错误时才弹窗：window.LF_ERROR.isBackendError(err)。 */
(function () {
  function isEn() { return window.CLANG === "en"; }
  function pick(zh, en) { return isEn() ? en : zh; }

  function bodyOf(err) {
    return (err && typeof err === "object" && err.body && typeof err.body === "object") ? err.body : null;
  }

  // 引擎侧错误：引擎任务直接失败（engine 标记），或后端透传的 engine_status / engine_detail。
  function isEngineError(err) {
    if (err && err.engine === true) return true;
    var body = bodyOf(err);
    if (!body) return false;
    return !!(body.engine_status || body.engine_detail || body.details);
  }

  function structuredCode(err) {
    function nestedCode(value, depth) {
      if (!value || typeof value !== "object" || depth > 4) return "";
      for (var key of ["engine_detail", "detail", "error"]) {
        var nested = nestedCode(value[key], depth + 1);
        if (nested) return nested;
      }
      if (typeof value.code === "string" && value.code.trim()) return value.code.trim();
      return typeof value.error === "string" && /^[a-z][a-z0-9_]+$/.test(value.error) ? value.error : "";
    }
    if (err && typeof err.engineCode === "string" && err.engineCode.trim()) return err.engineCode.trim();
    return nestedCode(bodyOf(err), 0) || (err && typeof err.code === "string" ? err.code.trim() : "");
  }

  function detailText(err) {
    var body = bodyOf(err);
    if (body) {
      var d = body.detail || body.message || body.error;
      if (typeof d === "string" && d.trim()) return d.trim();
      if (d && typeof d === "object") {
        var dm = d.message || d.detail || d.error;
        if (typeof dm === "string" && dm.trim()) return dm.trim();
      }
    }
    if (err && typeof err === "object" && typeof err.detail === "string" && err.detail.trim()) return err.detail.trim();
    if (err && typeof err.message === "string" && err.message.trim()) return err.message.trim();
    if (typeof err === "string") return err.trim();
    return "";
  }

  function engineMessage(err) {
    var body = bodyOf(err);
    if (body) {
      var ed = body.engine_detail || body.details;
      if (ed && typeof ed === "object") {
        var inner = ed.detail || ed.message || ed.error;
        if (typeof inner === "string" && inner.trim()) return inner.trim();
      }
      if (typeof ed === "string" && ed.trim()) return ed.trim();
    }
    return detailText(err) || pick("生成引擎返回了一个错误。", "The generation engine returned an error.");
  }

  function isContentInspection(err) {
    var code = structuredCode(err).toLowerCase().replace(/-/g, "_");
    if (
      code === "content_inspection_failed" ||
      code === "data_inspection_failed" ||
      code === "content_filter" ||
      code === "content_policy_violation" ||
      code === "prompt_blocked" ||
      code === "sensitive_words_detected" ||
      code === "prohibited_content"
    ) return true;
    // Explicit task classifications take precedence over legacy keyword matching.
    if (code) return false;
    var text = (engineMessage(err) + " " + detailText(err)).toLowerCase();
    return /未通过模型审核|内容审核不通过|内容安全|inappropriate content|data_inspection_failed|content_filter|content_policy_violation|responsibleaipolicyviolation|prohibited_content|sensitive_words|prompt_blocked|命中敏感|敏感词|绿网拦截/.test(text);
  }

  // err.status（HTTP）或 err.engine（引擎任务失败）才视作真正的后端错误，
  // 网络中断 / 离线（无 status、无 engine 标记）保留各调用点的 mock 兜底逻辑。
  function isBackendError(err) {
    if (!err) return false;
    if (err.engine === true) return true;
    return typeof err.status === "number" && err.status > 0;
  }

  function traceCode(value, depth) {
    if (depth > 4 || !value) return "";
    if (typeof value === "string") {
      var match = value.match(/\bBN-[A-Z0-9_-]+\b/i);
      return match ? match[0] : "";
    }
    if (typeof value !== "object") return "";
    if (typeof value.trace_code === "string" && value.trace_code.trim()) {
      return value.trace_code.trim();
    }
    var keys = ["body", "detail", "engine_detail", "error", "details", "message"];
    for (var i = 0; i < keys.length; i++) {
      var code = traceCode(value[keys[i]], depth + 1);
      if (code) return code;
    }
    return "";
  }

  // Classify first so fixed safety copy and HTTP-specific messages stay intact.
  function classifyMessage(err) {
    var generationCode = structuredCode(err);
    var generationCopy = {
      generation_input_too_large: ["参考资料过多", "Too much reference material",
        "本次生成需要参考的资料过多，暂时无法处理，请联系支持。",
        "This task needs too much reference material to process. Contact support."],
      generation_processing_limit: ["生成达到处理上限", "Processing limit reached",
        "本次生成已达到处理上限，仍未完成，请联系支持。",
        "This task reached its processing limit before it could finish. Contact support."],
      generation_interrupted: ["生成已中断", "Generation interrupted",
        "本次生成执行中断，请联系支持。",
        "This task was interrupted. Contact support."],
      generation_service_unavailable: ["生成服务暂不可用", "Generation service unavailable",
        "生成服务暂时繁忙或连接中断，请稍后重试。",
        "The generation service is busy or the connection was interrupted. Try again later."],
      model_output_missing: ["生成结果不完整", "Incomplete result",
        "本次生成未得到完整结果，请重试。",
        "This task did not produce a complete result. Try again."],
      model_output_invalid: ["生成结果校验失败", "Result validation failed",
        "本次生成结果未通过校验，请重试。",
        "The generated result did not pass validation. Try again."],
      version_conflict: ["内容已更新", "Content updated",
        "内容已被更新，请刷新后重试。",
        "The content has been updated. Refresh and try again."],
      resource_conflict: ["操作冲突", "Conflict",
        "当前内容状态存在冲突，请刷新后重试。",
        "The current content state conflicts with this action. Refresh and try again."],
      workflow_failed: ["生成引擎报错", "Engine error",
        "生成引擎暂时无法完成本次任务，请联系支持。",
        "The generation engine could not complete this task. Contact support."]
    };
    if (Object.prototype.hasOwnProperty.call(generationCopy, generationCode)) {
      var copy = generationCopy[generationCode];
      return { title: pick(copy[0], copy[1]), message: pick(copy[2], copy[3]), hint: "" };
    }
    if (isContentInspection(err)) {
      return {
        title: pick("内容未通过审核", "Content was blocked"),
        message: pick("本次生成内容未通过模型审核，请调整相关设定后重试。",
                      "The generated content did not pass model review. Adjust the related settings and try again."),
        hint: pick("可修改相关设定后重试。如反复出现，请联系支持。",
                   "Edit the related settings and retry. Contact support if this keeps happening.")
      };
    }

    if (isEngineError(err)) {
      return {
        title: pick("生成引擎报错", "Engine error"),
        message: engineMessage(err),
        hint: pick("这是创作引擎返回的原始信息。如反复出现，请稍后重试或联系支持。",
                   "This message comes directly from the engine. If it persists, retry later or contact support.")
      };
    }

    var status = err && err.status;
    var body = bodyOf(err);
    var structuredDetail = body && body.detail && typeof body.detail === "object"
      ? body.detail : null;
    var code = structuredCode(err) || (structuredDetail && structuredDetail.code);
    var detail = detailText(err);
    var low = detail.toLowerCase();

    if (status === 402 || /insufficient credit|余额不足|积分不足/.test(low) || /积分/.test(detail) && /不足/.test(detail)) {
      return {
        title: pick("积分余额不足", "Not enough credits"),
        message: pick("当前积分余额不足以完成本次生成。",
                      "Your credit balance is not enough to run this task."),
        hint: pick("请前往「设置 · 账单」充值算力包，或升级套餐后重试。",
                   "Top up a credit pack or upgrade your plan in Settings · Billing, then try again.")
      };
    }

    if (status === 403 && (/上限|额度|quota|limit/.test(low) || /作品/.test(detail))) {
      return {
        title: pick("作品数量已达上限", "Book limit reached"),
        // 后端文案已是友好中文，直接透传作为正文。
        message: detail || pick("已达当前套餐的作品数量上限。", "You have reached your plan's book limit."),
        hint: pick("升级套餐可创建更多作品，或删除不再需要的作品后重试。",
                   "Upgrade your plan to create more books, or remove an unused book and try again.")
      };
    }

    if (status === 401 || /登录|expired|unauthor/.test(low)) {
      return {
        title: pick("登录已过期", "Session expired"),
        message: pick("登录状态已失效。", "Your session is no longer valid."),
        hint: pick("请重新登录后再继续操作。", "Please sign in again to continue.")
      };
    }

    if (status === 403) {
      return {
        title: pick("权限不足", "Permission denied"),
        message: detail || pick("你没有执行该操作的权限。", "You don't have permission for this action."),
        hint: ""
      };
    }

    if (status === 409 && code === "active_chapter_task") {
      return {
        title: pick("已有任务进行中", "A task is already running"),
        message: pick("本作品已有一个生成任务在运行，请等待其完成后再试。",
                      "A generation task is already running for this book. Wait for it to finish."),
        hint: ""
      };
    }

    if (status === 409 && code === "idempotency_payload_mismatch") {
      return {
        title: pick("提交内容已变化", "Submission changed"),
        message: pick("本次提交与之前暂存的请求内容不同，请重新发起生成。",
                      "This submission differs from the pending request. Start generation again."),
        hint: ""
      };
    }

    if (status === 409 && (code === "quote_stale" || code === "quote_expired" || code === "quote_mismatch" || code === "book_data_quote_stale")) {
      return {
        title: pick("价格已更新", "Price updated"),
        message: pick("设定或价格已变化，请确认新的笔力后再开始。草稿仍保留。",
                      "Settings or price changed. Confirm the new credit cost to continue. Your draft is kept."),
        hint: ""
      };
    }

    if (code === "quote_price_unknown" || code === "quote_unknown_usage" || code === "quote_unpriced" || code === "quote_enforcement_unavailable") {
      return {
        title: pick("价格暂不可用", "Price unavailable"),
        message: pick("这次操作的笔力无法确认，不能按零消耗继续。",
                      "This action's credit cost is unavailable and cannot continue as free."),
        hint: pick("请稍后重试。", "Please try again later.")
      };
    }

    if (code === "quote_unsupported") {
      return {
        title: pick("超出支持范围", "Beyond supported range"),
        message: pick("当前设定用量超出可生成范围，可继续阅读、导出或删减设定。",
                      "Settings volume is beyond the supported range. Reading, export, and reduction remain available."),
        hint: ""
      };
    }

    if (status === 409 && code === "idempotency_in_progress") {
      return {
        title: pick("请求正在确认", "Submission is being confirmed"),
        message: pick("上一次提交仍在服务端确认中，请稍后使用当前操作重试。",
                      "The previous submission is still being confirmed. Retry this action shortly."),
        hint: pick("系统会复用同一个请求标识，避免重复生成和重复计费。",
                   "The same request identity will be reused to prevent duplicate generation and billing.")
      };
    }

    if (status === 409) {
      return {
        title: pick("操作冲突", "Conflict"),
        message: detail || pick("当前状态无法执行该操作。", "This action can't be performed in the current state."),
        hint: ""
      };
    }

    if (status === 404) {
      return {
        title: pick("资源不存在", "Not found"),
        message: detail || pick("请求的资源不存在或已被删除。", "The requested resource doesn't exist or was removed."),
        hint: ""
      };
    }

    if (status === 422) {
      return {
        title: pick("请求参数有误", "Invalid request"),
        message: detail || pick("提交的内容不符合要求，请检查后重试。", "The submitted data is invalid. Please check and retry."),
        hint: ""
      };
    }

    if (typeof status === "number" && status >= 500) {
      return {
        title: pick("服务器繁忙", "Server error"),
        message: pick("服务器暂时无法处理请求，请稍后再试。", "The server couldn't handle the request. Please try again later."),
        hint: detail && !/internal server error/i.test(detail) ? detail : ""
      };
    }

    return {
      title: pick("操作失败", "Something went wrong"),
      message: detail || pick("请求未能完成，请稍后重试。", "The request couldn't be completed. Please try again."),
      hint: ""
    };
  }

  function withRefund(message, creditsRefunded) {
    if (creditsRefunded !== true) return message;
    var notice = window.TC("generation_credits_refunded");
    return message.includes(notice) ? message : message + " " + notice;
  }

  // Trace identity is independent of whichever safe message the classifier chose.
  function classify(err) {
    var info = classifyMessage(err);
    var trace = traceCode(err, 0);
    if (trace && (info.message + info.hint).indexOf(trace) === -1) {
      info.message += pick("（追溯码：" + trace + "）", " (Trace code: " + trace + ")");
    }
    info.message = withRefund(info.message, err && err.creditsRefunded);
    return info;
  }

  var current = null; // 当前打开的弹窗，避免叠加
  var lastKey = "";
  var lastAt = 0;

  function dismiss() {
    if (!current) return;
    var node = current.scrim;
    current = null;
    node.classList.add("lf-err-out");
    setTimeout(function () { if (node && node.parentNode) node.parentNode.removeChild(node); }, 180);
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (!current) return;
    if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); resolveAndClose(); }
  }

  function resolveAndClose() {
    var cb = current && current.resolve;
    dismiss();
    if (typeof cb === "function") cb();
  }

  function show(errOrMessage, opts) {
    opts = opts || {};
    if (errOrMessage && (errOrMessage.code === "quote_cancelled" || errOrMessage.code === "task_cancelled")) return Promise.resolve();
    var info = (typeof errOrMessage === "string" && !opts.classify)
      ? { title: opts.title || pick("提示", "Notice"), message: errOrMessage, hint: opts.hint || "" }
      : classify(errOrMessage);
    if (opts.title) info.title = opts.title;

    // 1.2s 内相同错误去重，避免多阶段流程连环弹窗。
    var key = info.title + "|" + info.message;
    var now = Date.now();
    if (current && lastKey === key) return current.promise;
    if (key === lastKey && now - lastAt < 1200) return Promise.resolve();
    lastKey = key; lastAt = now;

    if (current) dismiss();

    var scrim = document.createElement("div");
    scrim.className = "lf-err-scrim";
    scrim.setAttribute("role", "alertdialog");
    scrim.setAttribute("aria-modal", "true");

    var modal = document.createElement("div");
    modal.className = "lf-err-modal";

    var head = document.createElement("div");
    head.className = "lf-err-head";
    var icon = document.createElement("div");
    icon.className = "lf-err-ic";
    icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';
    var titleEl = document.createElement("div");
    titleEl.className = "lf-err-t";
    titleEl.textContent = info.title;
    head.appendChild(icon);
    head.appendChild(titleEl);

    var msg = document.createElement("div");
    msg.className = "lf-err-msg";
    msg.textContent = info.message;

    modal.appendChild(head);
    modal.appendChild(msg);

    if (info.hint) {
      var hint = document.createElement("div");
      hint.className = "lf-err-hint";
      hint.textContent = info.hint;
      modal.appendChild(hint);
    }

    var acts = document.createElement("div");
    acts.className = "lf-err-acts";
    var ok = document.createElement("button");
    ok.className = "c-btn gold";
    ok.textContent = opts.okLabel || pick("我知道了", "Got it");
    ok.addEventListener("click", resolveAndClose);
    acts.appendChild(ok);
    modal.appendChild(acts);

    scrim.appendChild(modal);
    scrim.addEventListener("click", function (e) { if (e.target === scrim) resolveAndClose(); });
    document.body.appendChild(scrim);
    document.addEventListener("keydown", onKey);
    setTimeout(function () { try { ok.focus(); } catch (e) {} }, 30);

    var resolveFn;
    var promise = new Promise(function (res) { resolveFn = res; });
    current = { scrim: scrim, resolve: resolveFn, promise: promise };
    return promise;
  }

  show.classify = classify;
  show.withRefund = withRefund;
  show.isBackendError = isBackendError;
  show.isEngineError = isEngineError;
  window.LF_ERROR = show;
})();
