{
/* ===== Page Assistant stream segments ===== */
(function () {
  const TOOL_COPY_KEYS = {
    personalization_read: "asst_tool_preferences_read",
    personalization_patch: "asst_tool_preferences_patch",
    personalization_versions: "asst_tool_preferences_versions",
    personalization_restore: "asst_tool_preferences_restore",
    recall: "asst_tool_memory_recall",
    reflect: "asst_tool_memory_reflect",
    retain: "asst_tool_memory_retain",
    workspace_list: "asst_tool_files_list",
    workspace_search: "asst_tool_files_search",
    workspace_read: "asst_tool_files_read",
    workspace_read_image: "asst_tool_image_read",
    workspace_write: "asst_tool_files_write",
    workspace_delete: "asst_tool_files_delete",
    workspace_move: "asst_tool_files_move",
    workspace_versions: "asst_tool_files_versions",
    novelbuilt_docs: "asst_tool_docs",
    get_skills: "asst_tool_skills",
    novelbuilt_account: "asst_tool_account",
    novelbuilt_books: "asst_tool_books",
    novelbuilt_read: "asst_tool_read",
    novelbuilt_chapters: "asst_tool_chapters",
    novelbuilt_story: "asst_tool_story",
    novelbuilt_custom_settings: "asst_tool_custom_settings",
    novelbuilt_outlines: "asst_tool_outlines",
    novelbuilt_continuity: "asst_tool_continuity",
    novelbuilt_revisions: "asst_tool_revisions",
    novelbuilt_tasks: "asst_tool_tasks",
    novelbuilt_task: "asst_tool_tasks",
    novelbuilt_cruise: "asst_tool_cruise",
    novelbuilt_navigation: "asst_tool_navigation",
    novelbuilt_spend: "asst_tool_spend",
    novelbuilt_write: "asst_tool_write"
  };
  function toolLabel(name) {
    return TC(Object.prototype.hasOwnProperty.call(TOOL_COPY_KEYS, name) ? TOOL_COPY_KEYS[name] : "asst_tool_generic");
  }
  function toolStatus(status) {
    if (status === "building") return L({
      zh: "准备中",
      en: "Preparing"
    });
    if (status === "completed") return TC("asst_tool_completed");
    if (status === "partial") return TC("asst_process_partial");
    if (status === "failed") return TC("asst_tool_failed");
    if (status === "cancelled") return TC("asst_tool_cancelled");
    if (status === "pending") return TC("asst_tool_pending");
    if (status === "expired") return TC("asst_expired_title");
    if (status === "queued") return TC("asst_tool_queued");
    if (status === "blocked") return TC("asst_tool_blocked");
    return TC("asst_tool_running");
  }
  function monologueStatus(status) {
    if (status === "completed") return TC("asst_monologue_completed");
    if (status === "truncated") return TC("asst_monologue_truncated");
    if (status === "incomplete") return TC("asst_monologue_incomplete");
    return TC("asst_monologue_running");
  }
  function AssistantToolEvent({
    tool,
    renderToolStatus
  }) {
    const status = tool && tool.status || "running";
    const label = toolLabel(tool && tool.name);
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-tool-event asst-tool-event--" + status,
      role: "article",
      "aria-label": label
    }, /*#__PURE__*/React.createElement("span", {
      className: "asst-tool-event__mark",
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", {
      className: "asst-tool-event__body"
    }, /*#__PURE__*/React.createElement("span", {
      className: "asst-tool-event__label"
    }, label), status === "failed" && !tool.errorInFooter && /*#__PURE__*/React.createElement("span", {
      className: "asst-tool-event__detail"
    }, TC(tool.errorKey || "asst_tool_error_generic")), renderToolStatus?.(tool)), /*#__PURE__*/React.createElement("span", {
      className: "asst-tool-event__status",
      role: "status"
    }, toolStatus(status)));
  }
  function StreamText({
    content,
    className
  }) {
    if (!content) return null;
    const markdown = /*#__PURE__*/React.createElement(AssistantMarkdown, {
      text: content
    });
    return className ? /*#__PURE__*/React.createElement("div", {
      className: className
    }, markdown) : markdown;
  }
  function useAssistantWelcomeReveal({
    messages,
    accountId,
    open,
    interrupted
  }) {
    const welcome = messages?.length === 1 && messages[0].welcome_reveal && messages[0].content_json?.kind === "personalization_welcome" ? messages[0] : null;
    const id = welcome?.id;
    const content = welcome?.content || "";
    const [frame, setFrame] = React.useState(null);
    const played = React.useRef(null);
    React.useLayoutEffect(() => {
      setFrame(null);
      if (!id || !content) return;
      const key = String(accountId) + ":" + id;
      if (played.current === key) return;
      played.current = key;
      const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      if (!open || interrupted || motion?.matches || document.hidden) return;
      let timer,
        stopped = false,
        count = 0;
      const characters = Array.from(content);
      const chunk = Math.max(1, Math.ceil(characters.length / 20));
      const finish = () => {
        stopped = true;
        window.clearTimeout(timer);
        setFrame(null);
      };
      const tick = () => {
        if (stopped) return;
        count = Math.min(characters.length, count + chunk);
        if (count === characters.length) {
          finish();
          return;
        }
        setFrame({
          id,
          content: characters.slice(0, count).join("")
        });
        timer = window.setTimeout(tick, 70);
      };
      const onMotion = event => {
        if (event.matches) finish();
      };
      const onVisibility = () => {
        if (document.hidden) finish();
      };
      setFrame({
        id,
        content: ""
      });
      timer = window.setTimeout(tick, 450);
      motion?.addEventListener?.("change", onMotion);
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        stopped = true;
        window.clearTimeout(timer);
        motion?.removeEventListener?.("change", onMotion);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }, [id, content, accountId, open, interrupted]);
    return open && !interrupted && frame?.id === id ? frame : null;
  }
  function processChildren(items, renderToolStatus) {
    return (items || []).map((item, index) => {
      if (item && item.type === "tool") {
        return /*#__PURE__*/React.createElement(AssistantToolEvent, {
          key: item.tool && (item.tool.run_id || item.tool.call_id || item.tool.id) || "tool-" + index,
          tool: item.tool,
          renderToolStatus: renderToolStatus
        });
      }
      if (item && item.type === "text" && item.content) {
        return /*#__PURE__*/React.createElement(StreamText, {
          key: item.key || "process-text-" + index,
          className: "asst-process-group__text",
          content: item.content
        });
      }
      if (item && item.type === "monologue") return /*#__PURE__*/React.createElement(AssistantMonologue, {
        key: item.key || item.monologue_id || "monologue-" + index,
        segment: item
      });
      return null;
    });
  }
  function AssistantProcessGroup({
    group,
    renderToolStatus,
    onProcessOpen,
    renderProcessDetails,
    initialOpen = false
  }) {
    const status = group && group.status || "completed";
    const defaultOpen = group?.keepOpen || (AssistantStreamCore.defaultProcessOpen ? AssistantStreamCore.defaultProcessOpen(status) : status === "pending" || status === "failed");
    const [open, setOpen] = React.useState(defaultOpen || initialOpen);
    const chosen = React.useRef(initialOpen);
    React.useEffect(() => {
      if (!chosen.current) setOpen(defaultOpen);
    }, [defaultOpen]);
    return /*#__PURE__*/React.createElement("details", {
      className: "asst-process-group asst-process-group--" + status,
      open: open,
      onToggle: event => {
        const next = event.currentTarget.open;
        if (next !== open) {
          chosen.current = true;
          setOpen(next);
          if (next) onProcessOpen?.();
        }
      }
    }, /*#__PURE__*/React.createElement("summary", null, /*#__PURE__*/React.createElement("span", {
      className: "asst-tool-event__mark",
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", {
      className: "asst-process-group__label"
    }, TC("asst_process")), /*#__PURE__*/React.createElement("span", {
      className: "asst-tool-event__status",
      role: "status"
    }, toolStatus(status))), /*#__PURE__*/React.createElement("div", {
      className: "asst-process-group__items"
    }, processChildren(group && group.items, renderToolStatus), renderProcessDetails?.()));
  }
  function AssistantMonologue({
    segment
  }) {
    const status = segment && segment.status || "running";
    const [open, setOpen] = React.useState(false);
    return /*#__PURE__*/React.createElement("details", {
      className: "asst-monologue asst-monologue--" + status,
      open: open,
      onToggle: event => {
        const next = event.currentTarget.open;
        if (next !== open) setOpen(next);
      }
    }, /*#__PURE__*/React.createElement("summary", null, /*#__PURE__*/React.createElement("span", {
      className: "asst-monologue__label"
    }, TC("asst_monologue")), /*#__PURE__*/React.createElement("span", {
      className: "asst-monologue__status",
      role: "status"
    }, monologueStatus(status))), /*#__PURE__*/React.createElement("div", {
      className: "asst-monologue__body"
    }, segment && segment.content ? /*#__PURE__*/React.createElement(AssistantMarkdown, {
      text: segment.content
    }) : null));
  }
  function AssistantMessageFile({
    file,
    inline = false
  }) {
    const upload = window.AssistantUploadCore;
    const copy = upload ? upload.uploadCopy(window.CLANG === "en" ? "en" : "zh") : {};
    const name = file.name_snapshot || String(file.path || "").split("/").pop();
    const hint = upload && !window.AssistantReferenceCore?.isImage(file) ? upload.parseHint(file.parse_status, copy) : "";
    const Tag = inline ? "span" : "li";
    return /*#__PURE__*/React.createElement(Tag, {
      className: inline ? "asst-inline-reference" : undefined,
      title: name,
      "data-reference-color": window.AssistantInlineCore?.color(file)
    }, /*#__PURE__*/React.createElement("span", null, name, hint ? " " + hint : ""));
  }
  function AssistantMessageRow({
    message,
    actionCards,
    presentationSegments,
    renderActionCard,
    renderToolStatus,
    onProcessOpen,
    renderProcessDetails,
    processInitiallyOpen,
    assistantName,
    welcomeReveal,
    showIdentity = true,
    footer
  }) {
    if (message.role === "system") return null;
    const role = message.role === "user" ? "user" : "assistant";
    const resolved = role === "assistant" && AssistantStreamCore.hydrateMessage ? AssistantStreamCore.hydrateMessage(message) : message;
    const text = resolved.content || resolved.text || "";
    const segments = role === "assistant" && Array.isArray(resolved.stream_segments) ? resolved.stream_segments : [];
    const files = role === "user" && window.AssistantUploadCore ? window.AssistantUploadCore.messageFiles(resolved) : [];
    const inlineParts = window.AssistantInlineCore ? window.AssistantInlineCore.parts(text, files) : [{
      text
    }];
    const trailingFiles = files.filter(file => !inlineParts.some(part => part.file === file));
    const folded = role === "assistant" && AssistantStreamCore.shouldFold(resolved);
    const visibleSegments = presentationSegments || (actionCards?.length && window.AssistantTaskProgressCore ? window.AssistantTaskProgressCore.insertCards(segments, actionCards, AssistantStreamCore.groupVisibleSegments, folded) : AssistantStreamCore.groupVisibleSegments(segments, {
      folded
    }));
    if (!text && !segments.length && !files.length && !visibleSegments.length) return null;
    return /*#__PURE__*/React.createElement("article", {
      className: "asst-message asst-message--" + role,
      "aria-busy": welcomeReveal ? true : undefined,
      "aria-live": welcomeReveal ? "off" : undefined
    }, showIdentity && /*#__PURE__*/React.createElement("strong", null, role === "user" ? TC("asst_you") : assistantName || TC("asst_agent")), welcomeReveal ? welcomeReveal.content ? /*#__PURE__*/React.createElement(AssistantMarkdown, {
      text: welcomeReveal.content
    }) : /*#__PURE__*/React.createElement("div", {
      className: "asst-thinking",
      role: "status"
    }, /*#__PURE__*/React.createElement("span", null, TC("asst_typing")), /*#__PURE__*/React.createElement("span", {
      className: "asst-thinking__dots",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null))) : role === "user" ? /*#__PURE__*/React.createElement("p", null, inlineParts.map((part, index) => part.file ? /*#__PURE__*/React.createElement(AssistantMessageFile, {
      key: index,
      file: part.file,
      inline: true
    }) : part.text)) : visibleSegments.length ? /*#__PURE__*/React.createElement("div", {
      className: "asst-stream-segments"
    }, visibleSegments.map((segment, index) => {
      if (segment.type === "action_card") return /*#__PURE__*/React.createElement(React.Fragment, {
        key: segment.action.id
      }, renderActionCard(segment.action));
      if (segment.type === "process_group") {
        return /*#__PURE__*/React.createElement(AssistantProcessGroup, {
          key: segment.key || "process-" + index,
          group: segment,
          renderToolStatus: renderToolStatus,
          onProcessOpen: onProcessOpen,
          renderProcessDetails: renderProcessDetails,
          initialOpen: processInitiallyOpen
        });
      }
      if (segment.type === "monologue") {
        return /*#__PURE__*/React.createElement(AssistantMonologue, {
          key: segment.key || (segment.monologue_id ? "monologue-" + segment.monologue_id : "monologue-" + index),
          segment: segment
        });
      }
      if (segment.type === "tool") {
        return /*#__PURE__*/React.createElement(AssistantToolEvent, {
          key: segment.tool && segment.tool.run_id || "tool-" + index,
          tool: segment.tool,
          renderToolStatus: renderToolStatus
        });
      }
      if (segment.type === "text" && segment.content) {
        return /*#__PURE__*/React.createElement(StreamText, {
          key: segment.key || "text-" + index,
          content: segment.content
        });
      }
      return null;
    })) : /*#__PURE__*/React.createElement(AssistantMarkdown, {
      text: text
    }), trailingFiles.length ? /*#__PURE__*/React.createElement("ul", {
      className: "asst-message-files"
    }, trailingFiles.map(file => /*#__PURE__*/React.createElement(AssistantMessageFile, {
      key: (file.file_id || file.path) + "\0" + file.version,
      file: file
    }))) : null, footer);
  }
  window.AssistantMessageRow = AssistantMessageRow;
  window.AssistantProcessGroup = AssistantProcessGroup;
  window.useAssistantWelcomeReveal = useAssistantWelcomeReveal;
})();
}
