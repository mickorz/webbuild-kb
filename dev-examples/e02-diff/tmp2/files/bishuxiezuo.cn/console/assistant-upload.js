{
/* Shared materials upload queue. File bytes stay in memory until a confirmed save. */
(function () {
  const {
    useRef
  } = React;
  function language(lang) {
    if (lang === "en" || lang === "zh") return lang;
    return window.CLANG === "en" ? "en" : "zh";
  }
  function AssistantUploadTrigger({
    lang,
    className,
    disabled,
    onFiles,
    label
  }) {
    const Core = window.AssistantUploadCore;
    const copy = Core.uploadCopy(language(lang));
    const inputRef = useRef(null);
    const limitId = "assistant-upload-limit";
    const Icon = window.Icon;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: className || "asst-function-button",
      disabled: !!disabled,
      title: copy.limit,
      "aria-describedby": limitId,
      onClick: () => inputRef.current && inputRef.current.click()
    }, Icon ? /*#__PURE__*/React.createElement(Icon, {
      n: "upload",
      s: 16
    }) : null, /*#__PURE__*/React.createElement("span", null, label || copy.upload)), /*#__PURE__*/React.createElement("span", {
      id: limitId,
      className: "asst-upload-sr"
    }, copy.limit), /*#__PURE__*/React.createElement("input", {
      ref: inputRef,
      className: "asst-upload-input",
      type: "file",
      multiple: true,
      hidden: true,
      "aria-label": copy.limit,
      title: copy.limit,
      onChange: event => onFiles && onFiles(Core.selectedFiles(event))
    }));
  }
  function AssistantUploadQueue({
    lang,
    items,
    notice,
    dragging,
    disabled,
    onRetry,
    onCopy,
    onSkip,
    onRemove,
    onDownload
  }) {
    const Core = window.AssistantUploadCore;
    const copy = Core.uploadCopy(language(lang));
    const rows = items || [];
    const live = notice || (dragging ? copy.drop : "");
    if (!rows.length && !live) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-upload"
    }, live ? /*#__PURE__*/React.createElement("p", {
      className: "asst-upload-notice",
      role: "status"
    }, live) : null, rows.length ? /*#__PURE__*/React.createElement("ul", {
      className: "asst-upload-list",
      "aria-live": "polite"
    }, rows.map(item => {
      const label = item.name || item.path;
      const text = Core.statusText(item, copy);
      return /*#__PURE__*/React.createElement("li", {
        key: item.id,
        className: "asst-upload-item asst-upload-item--" + item.status,
        "data-upload-id": item.id,
        "data-upload-status": item.status
      }, /*#__PURE__*/React.createElement("strong", null, label), /*#__PURE__*/React.createElement("span", null, text), /*#__PURE__*/React.createElement("span", {
        className: "asst-upload-actions"
      }, item.retryable ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        disabled: disabled,
        onClick: () => onRetry && onRetry(item)
      }, copy.retry) : null, item.status === "conflict" ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        disabled: disabled,
        onClick: () => onCopy && onCopy(item)
      }, copy.copy) : null, item.status === "conflict" ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        disabled: disabled,
        onClick: () => onSkip && onSkip(item)
      }, copy.skip) : null, item.citable && onDownload ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        onClick: () => onDownload(item)
      }, copy.download) : null, item.status === "saved" ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        disabled: disabled,
        onClick: () => onRemove && onRemove(item)
      }, copy.dismiss) : null, item.status === "queued" || item.status === "failed" || item.status === "uncertain" ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "c-btn sm",
        disabled: disabled,
        onClick: () => onRemove && onRemove(item)
      }, copy.remove) : null));
    })) : null);
  }
  function AssistantComposerAttachments({
    lang,
    files,
    items,
    notice,
    dragging,
    actions,
    disabled
  }) {
    const Core = window.AssistantUploadCore;
    const copy = Core.uploadCopy(language(lang));
    const saved = Core.normalizeWorkspaceFiles(files).map(file => ({
      ...file,
      name: file.name_snapshot || (file.path ? file.path.split("/").pop() : ""),
      status: "saved",
      parseStatus: file.parse_status
    }));
    const rows = (items || []).filter(item => item.status !== "saved").concat(saved);
    const live = notice || (dragging ? copy.drop : "");
    if (!rows.length && !live) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-compose-attachments"
    }, rows.length ? /*#__PURE__*/React.createElement("ul", {
      className: "asst-attachment-list",
      "aria-label": language(lang) === "en" ? "Attachments" : "附件",
      "aria-live": "polite"
    }, rows.map(item => {
      const hint = item.status === "saved" ? Core.parseHint(item.parseStatus, copy) : Core.statusText(item, copy);
      return /*#__PURE__*/React.createElement("li", {
        key: item.id || (item.file_id || item.path) + "\0" + item.version,
        className: "asst-attachment asst-attachment--" + item.status,
        "data-reference-color": item.status === "saved" ? window.AssistantInlineCore?.color(item) : undefined
      }, /*#__PURE__*/React.createElement("span", {
        className: "asst-attachment-label",
        title: item.name
      }, item.name, hint ? /*#__PURE__*/React.createElement("small", null, hint) : null), item.retryable ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        disabled: disabled,
        onClick: () => actions.onRetry(item)
      }, copy.retry) : null, item.status === "conflict" ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        disabled: disabled,
        onClick: () => actions.onCopy(item)
      }, copy.copy) : null, /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "asst-attachment-remove",
        disabled: disabled,
        "aria-label": copy.remove + " " + item.name,
        title: copy.remove,
        onClick: () => actions.onRemove(item)
      }, "\xD7"));
    })) : null, live ? /*#__PURE__*/React.createElement("p", {
      className: "asst-upload-notice",
      role: "status"
    }, live) : null);
  }
  function createDrawerActions(host) {
    function core() {
      return window.AssistantUploadCore;
    }
    function copy() {
      return core().uploadCopy(host.lang());
    }
    function ctrl() {
      return host.ensureUpload();
    }
    return {
      onFiles(files) {
        const current = ctrl();
        if (!current) {
          host.setNotice(copy().unavailable);
          return null;
        }
        host.setNotice("");
        return current.enqueue(files);
      },
      onAttach(files) {
        const library = window.AssistantReferenceCore;
        const current = ctrl();
        if (!library || !current) return {
          accepted: false,
          reason: "invalid"
        };
        const result = library.merge(host.citations(), files, current.snapshot().length);
        if (result.accepted) {
          host.setCitations(result.files);
          host.setNotice("");
        }
        return result;
      },
      onRetry(item) {
        const current = ctrl();
        return current ? current.retry(item.id) : null;
      },
      onCopy(item) {
        const current = ctrl();
        return current ? current.saveCopy(item.id) : null;
      },
      onSkip(item) {
        const current = ctrl();
        if (!current) return;
        current.skip(item.id);
      },
      onRemove(item) {
        const current = ctrl();
        if (!current) return;
        host.setNotice("");
        if (item.status === "saved") {
          host.setCitations(core().subtractWorkspaceFiles(host.citations(), [item]));
        }
        const result = current.remove(item.id);
        if (result && result.uncertain) host.setNotice(copy().removedUncertain);
      },
      onDownload(item) {
        return host.download(item).catch(() => host.setNotice(copy().downloadFailed));
      }
    };
  }
  function installDrawerUpload(host) {
    const Core = window.AssistantUploadCore;
    const Workspace = window.AssistantWorkspaceCore;
    const api = window.LF_API;
    if (!Core || !Workspace || !api || typeof api.assistantWorkspaceRequest !== "function") return null;
    const controller = Core.createController({
      workspace: Workspace,
      request: (name, params, options) => api.assistantWorkspaceRequest(name + (params ? "?" + Workspace.query(params) : ""), options),
      newKey: host.newKey,
      onChange: items => {
        if (controller.accountId !== host.accountId()) return;
        host.setItems(items);
      },
      onSaved: saved => {
        host.setCitations(Core.normalizeWorkspaceFiles(host.citations().concat([saved])));
        // The committed reference is now the bubble; no separate upload receipt remains.
        controller.snapshot().filter(item => saved.file_id && item.file_id ? item.file_id === saved.file_id && item.version === saved.version : item.path === saved.path && item.version === saved.version).forEach(item => controller.remove(item.id));
        if (host.onSaved) host.onSaved(saved);
      }
    });
    controller.bindAccount(host.accountId());
    const actions = createDrawerActions({
      lang: host.lang,
      ensureUpload: () => controller,
      citations: host.citations,
      setNotice: host.setNotice,
      setCitations: host.setCitations,
      download: host.download
    });
    return {
      controller,
      actions,
      drop: Core.createDropHandlers(actions.onFiles)
    };
  }

  // Wait for session recovery before adding references to an existing composer draft.
  function acceptWorkspaceReferenceRequest(host) {
    const {
      request,
      open,
      capability
    } = host;
    if (!request?.id || !request.workspaceFiles || !open || capability === "idle" || capability === "loading") return;
    host.consume?.(request.id);
    if (request.accountId !== host.accountId()) return;
    if (capability !== "configured" || host.locked()) {
      host.notify({
        zh: '请先处理当前助手任务或待发送消息，再添加参考资料。',
        en: 'Finish the current task or pending message before adding references.'
      });
      return;
    }
    const result = host.attach(request.workspaceFiles);
    if (!result?.accepted) host.notify({
      zh: '资料未添加，请重新选择。',
      en: 'The reference was not added. Please select it again.'
    });else host.focus();
  }
  window.AssistantUploadTrigger = AssistantUploadTrigger;
  window.AssistantUploadQueue = AssistantUploadQueue;
  window.AssistantComposerAttachments = AssistantComposerAttachments;
  window.AssistantUpload = {
    acceptWorkspaceReferenceRequest,
    createDrawerActions: createDrawerActions,
    installDrawerUpload: installDrawerUpload
  };
})();
}
