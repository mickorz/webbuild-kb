(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantSessionOps = api;
})(typeof globalThis === "object" ? globalThis : this, function (root) {
  async function withWelcome(payload, api, isCurrent) {
    const session = payload && (payload.session || payload);
    if (!isCurrent() || !session?.id || session.book_id !== null || !api.openAssistantWelcome) return payload;
    try {
      const next = await api.openAssistantWelcome(session.id);
      const returned = next && (next.session || next);
      if (!isCurrent() || returned?.id !== session.id || returned.book_id !== null) return payload;
      const known = new Set((session.messages || payload.messages || []).map(message => message.id));
      const owner = Array.isArray(returned.messages) ? returned : next;
      if (!Array.isArray(owner.messages)) return next;
      const messages = owner.messages.map(message => message.id && !known.has(message.id)
        && message.role === "assistant" && message.content_json?.kind === "personalization_welcome"
        ? { ...message, welcome_reveal: true } : message);
      // Presentation-only marker: the authoritative message remains complete on the server.
      return next.session && owner === returned
        ? { ...next, session: { ...returned, messages } } : { ...next, messages };
    } catch (_) {
      // Optional onboarding must not prevent restoring a conversation or sending a message.
      return payload;
    }
  }

  function create(ctx) {
    const Action = ctx.Action;
    const Composer = ctx.Composer;
    const versionCurrent = version => !root?.AssistantCheckpointCore
      || root.AssistantCheckpointCore.compatibleVersion(version, ctx.sessionRef.current);
    const invocationCurrent = (owned, sequence, version) => ctx.streamLock.isCurrent(owned)
      && sequence === ctx.loadSequenceRef.current && versionCurrent(version);

    function assignActions(updater) {
      ctx.setActions((current) => {
        const next = typeof updater === "function" ? updater(current) : updater;
        ctx.actionsRef.current = next;
        return next;
      });
    }

    function settleConsumer(consumer, error) {
      if (!consumer || typeof consumer.finalize !== "function") return;
      consumer.finalize(Composer.isAbortError(error) ? "cancelled" : "failed");
    }

    async function recoverAfterStream(streamingId, isCurrent) {
      try { return await ctx.refresh(isCurrent, streamingId); } catch (ignored) { return null; }
    }

    async function deliverMessage(logicalSend, options) {
      const preserveComposer = !!(options && options.preserveComposer);
      const sequence = ctx.loadSequenceRef.current;
      const versionId = ctx.sessionRef.current?.current_version_id;
      ctx.busyRef.current.sending = true;
      ctx.setSending(true);
      ctx.setError("");
      if (!preserveComposer) {
        ctx.inputValueRef.current = "";
        ctx.setInput("");
      }
      ctx.persistComposerSnapshot();
      ctx.replaceMessages((current) => current.some((message) => message.id === logicalSend.optimisticId)
        ? current
        : current.concat([{
          id: logicalSend.optimisticId,
          role: "user",
          content: logicalSend.content,
          workspace_files: logicalSend.workspaceFiles
        }]));
      const consumer = ctx.createStreamConsumer(logicalSend.streamingId, {
        targetBookId: logicalSend.bookId,
        onAction(nextAction) {
          if (nextAction) assignActions((current) => {
            const next = current.filter((item) => item.id !== nextAction.id);
            return next.concat([nextAction]);
          });
        }
      });
      const owned = ctx.beginStream();
      try {
        await ctx.api.streamAssistantMessage(
          logicalSend.sessionId,
          logicalSend.content,
          logicalSend.pageContext,
          logicalSend.bookId,
          logicalSend.key,
          { onEvent: (streamEvent) => consumer.handleEvent(streamEvent) },
          { signal: owned.controller.signal, workspaceFiles: logicalSend.workspaceFiles,
            ...(Object.prototype.hasOwnProperty.call(logicalSend, "expectedVersionId") ? { expectedVersionId: logicalSend.expectedVersionId } : {}) }
        );
        await consumer.finish();
        if (!invocationCurrent(owned, sequence, versionId)) return;
        ctx.pendingSendRef.current = null;
        if (ctx.citationsRef && typeof ctx.setCitations === "function") {
          const Upload = root && root.AssistantUploadCore;
          const remaining = Upload && typeof Upload.normalizeWorkspaceFiles === "function"
            ? Upload.normalizeWorkspaceFiles(ctx.citationsRef.current)
            : Composer.workspaceFilesOf(ctx.citationsRef.current);
          const nextCitations = Upload && typeof Upload.subtractWorkspaceFiles === "function"
            ? Upload.subtractWorkspaceFiles(remaining, logicalSend.workspaceFiles)
            : remaining;
          ctx.citationsRef.current = nextCitations;
          ctx.setCitations(nextCitations);
        }
        ctx.persistComposerSnapshot();
        if (preserveComposer && typeof ctx.refresh === "function") {
          try { await ctx.refresh(); } catch (ignored) {}
        }
      } catch (sendError) {
        if (!invocationCurrent(owned, sequence, versionId)) return;
        settleConsumer(consumer, sendError);
        const payload = await recoverAfterStream(logicalSend.streamingId);
        if (!invocationCurrent(owned, sequence, versionId)) return;
        if (Action.terminalInvocationError(sendError) && !Composer.shouldRetainLogicalSend(sendError)) {
          ctx.pendingSendRef.current = null;
        }
        if (Composer.errorCode(sendError) === "input_not_received") {
          ctx.pendingSendRef.current = null;
          ctx.applyComposerState({ draft: preserveComposer ? ctx.inputValueRef.current : logicalSend.content,
            pendingSend: null, citations: ctx.citationsRef?.current || logicalSend.workspaceFiles });
        } else if (payload) ctx.reconcileComposerWithPayload(payload, sequence);
        else ctx.applyComposerState({
          draft: preserveComposer ? ctx.inputValueRef.current : logicalSend.content,
          pendingSend: ctx.pendingSendRef.current
        });
        ctx.setError(Composer.isAbortError(sendError)
          ? ctx.assistantCopy("asst_stop_note")
          : Action.messageText(sendError, ctx.assistantCopy));
      } finally {
        ctx.releaseStream(owned, () => {
          ctx.busyRef.current.sending = false;
          ctx.setSending(false);
        });
      }
    }

    async function send(event) {
      event.preventDefault();
      const content = ctx.input.trim();
      if (!content || (ctx.checkpoint && !ctx.checkpoint.canSend) || (ctx.hasPendingUploads && ctx.hasPendingUploads()) || Action.isSessionRunning(ctx.sessionRef.current) || ctx.actionsRef.current.some(Action.isActionBlocking)
        || ctx.bodyUndoBusyRef.current || ctx.busyRef.current.sending || ctx.busyRef.current.executing
        || ctx.sending || ctx.resetting || ctx.resetConfirmOpen || !ctx.session) return;
      const workspaceFiles = Composer.workspaceFilesOf(ctx.citationsRef && ctx.citationsRef.current);
      const logicalSend = Composer.reuseOrCreateLogicalSend(ctx.pendingSendRef.current, {
        sessionId: ctx.session.id,
        ...(Object.prototype.hasOwnProperty.call(ctx.session, "current_version_id") ? { expectedVersionId: ctx.session.current_version_id } : {}),
        content,
        pageContext: ctx.pageContext || null,
        bookId: ctx.bookId || null,
        userMessageCount: Composer.userMessageCount(ctx.messages),
        workspaceFiles: workspaceFiles
      }, ctx.newInvocationKey);
      ctx.pendingSendRef.current = logicalSend;
      await deliverMessage(logicalSend);
    }

    async function continueProtectedTurn(action) {
      // A resumable checkpoint continues the paused work with one more allowance.
      const viaCheckpoint = !!(ctx.checkpoint?.canResume && ctx.resumeCheckpoint);
      if (action?.version_current === false || (!viaCheckpoint && ctx.checkpoint && !ctx.checkpoint.canSend)) return;
      const session = ctx.sessionRef.current || ctx.session;
      if (!Action.isAssistantContinue(action) || !session || !action || !action.id) return;
      if (action.session_id && action.session_id !== session.id) return;
      if ((ctx.hasPendingUploads && ctx.hasPendingUploads()) || Action.isSessionRunning(session)
        || ctx.bodyUndoBusyRef.current || ctx.executing
        || ctx.busyRef.current.sending || ctx.busyRef.current.executing
        || ctx.sending || ctx.resetting || ctx.resetConfirmOpen) return;
      const others = (ctx.actionsRef.current || []).some((item) => item && item.id !== action.id && Action.isActionBlocking(item));
      if (others) return;
      const key = Action.assistantContinueKey(action);
      if (!key) return;
      if (viaCheckpoint) {
        await ctx.resumeCheckpoint(key);
        return;
      }
      const pending = ctx.pendingSendRef.current;
      if (pending && pending.key && pending.key !== key) return;
      const logicalSend = Composer.createLogicalSend({
        sessionId: session.id,
        ...(Object.prototype.hasOwnProperty.call(session, "current_version_id") ? { expectedVersionId: session.current_version_id } : {}),
        content: Action.assistantContinueText(action),
        pageContext: ctx.pageContext || null,
        bookId: ctx.bookId || null,
        userMessageCount: Composer.userMessageCount(ctx.messages),
        workspaceFiles: [],
        key: key
      }, key);
      ctx.pendingSendRef.current = logicalSend;
      await deliverMessage(logicalSend, { preserveComposer: true });
    }

    async function confirm(action) {
      if (action?.version_current === false || ctx.checkpoint?.stopping) return;
      if (Action.isAssistantContinue(action)) {
        await continueProtectedTurn(action);
        return;
      }
      if (
        Action.isSessionRunning(ctx.sessionRef.current) || ctx.bodyUndoBusyRef.current
        || !action
        || !action.id
        || ctx.executing
        || ctx.busyRef.current.sending || ctx.busyRef.current.executing
        || !ctx.session
        || action.session_id !== ctx.session.id
        || Action.isContinuationPending(action)
      ) return;
      const sequence = ctx.loadSequenceRef.current;
      const versionId = ctx.sessionRef.current?.current_version_id;
      const streamingId = "stream-confirm-" + action.id;
      let actionCompletePromise = Promise.resolve();
      let actionCompleteError = null;
      let updatedAction = action;
      const consumer = ctx.createStreamConsumer(streamingId, {
        targetBookId: action.book_link_id,
        onAction(nextAction) {
          if (!nextAction) return;
          if (nextAction.id !== action.id) return;
          updatedAction = nextAction;
          assignActions((current) => current.map((item) => item.id === nextAction.id ? nextAction : item));
          if (Action.successCopyKey(nextAction) && ctx.onActionCompleteRef.current) {
            actionCompletePromise = Promise.resolve().then(() => ctx.onActionCompleteRef.current(nextAction))
              .catch((refreshError) => { actionCompleteError = refreshError; });
          }
        }
      });
      ctx.busyRef.current.executing = true;
      ctx.setExecutingActionId(action.id);
      ctx.setError("");
      const owned = ctx.beginStream();
      try {
        const volume = root && root.LF_BOOK_DATA_VOLUME;
        if (volume && typeof volume.confirmAssistantAction === "function") {
          if (!await volume.confirmAssistantAction(action)) return;
          if (!invocationCurrent(owned, sequence, versionId)) return;
        }
        await ctx.api.streamAssistantActionConfirmation(
          action.id,
          Action.actionHash(action),
          { onEvent: (streamEvent) => consumer.handleEvent(streamEvent) },
          { signal: owned.controller.signal }
        );
        await consumer.finish();
        if (!invocationCurrent(owned, sequence, versionId)) return;
        await actionCompletePromise;
        if (actionCompleteError) throw actionCompleteError;
        await ctx.refresh();
        if (!invocationCurrent(owned, sequence, versionId)) return;
        const successKey = Action.successCopyKey(updatedAction);
        if (ctx.toast && successKey) ctx.toast(ctx.TC(successKey));
      } catch (confirmError) {
        if (!invocationCurrent(owned, sequence, versionId)) return;
        settleConsumer(consumer, confirmError);
        await recoverAfterStream(streamingId);
        if (!invocationCurrent(owned, sequence, versionId)) return;
        ctx.setError(Composer.isAbortError(confirmError)
          ? ctx.assistantCopy("asst_stop_note")
          : Action.messageText(confirmError, ctx.assistantCopy));
      } finally {
        ctx.releaseStream(owned, () => {
          ctx.busyRef.current.executing = false;
          ctx.setExecutingActionId(null);
        });
      }
    }

    async function reject(action) {
      if (action?.version_current === false || ctx.checkpoint?.stopping) return;
      if (Action.isAssistantContinue(action)) {
        if (!action || !action.id) return;
        assignActions((current) => current.filter((item) => item.id !== action.id));
        return;
      }
      if (
        Action.isSessionRunning(ctx.sessionRef.current) || ctx.bodyUndoBusyRef.current
        || !action
        || !action.id
        || ctx.executing
        || ctx.busyRef.current.sending || ctx.busyRef.current.executing
        || !ctx.session
        || action.session_id !== ctx.session.id
      ) return;
      const sequence = ctx.loadSequenceRef.current;
      const versionId = ctx.sessionRef.current?.current_version_id;
      const streamingId = "stream-reject-" + action.id;
      const consumer = ctx.createStreamConsumer(streamingId, {
        targetBookId: action.book_link_id,
        onAction(nextAction) {
          if (nextAction) assignActions((current) => current.map((item) => item.id === nextAction.id ? nextAction : item));
        }
      });
      ctx.busyRef.current.executing = true;
      ctx.setExecutingActionId(action.id);
      ctx.setError("");
      const owned = ctx.beginStream();
      try {
        await ctx.api.streamAssistantActionRejection(
          action.id,
          { onEvent: (streamEvent) => consumer.handleEvent(streamEvent) },
          { signal: owned.controller.signal }
        );
        await consumer.finish();
        if (!invocationCurrent(owned, sequence, versionId)) return;
        await ctx.refresh();
      } catch (rejectError) {
        if (!invocationCurrent(owned, sequence, versionId)) return;
        settleConsumer(consumer, rejectError);
        await recoverAfterStream(streamingId);
        if (!invocationCurrent(owned, sequence, versionId)) return;
        ctx.setError(Composer.isAbortError(rejectError)
          ? ctx.assistantCopy("asst_stop_note")
          : Action.messageText(rejectError, ctx.assistantCopy));
      } finally {
        ctx.releaseStream(owned, () => {
          ctx.busyRef.current.executing = false;
          ctx.setExecutingActionId(null);
        });
      }
    }

    async function revise(action, instruction) {
      if (action?.version_current === false || ctx.checkpoint?.stopping) return;
      const FieldCore = ctx.FieldCore;
      const text = FieldCore && FieldCore.normalizeInstruction(instruction);
      if (
        !text
        || Action.isSessionRunning(ctx.sessionRef.current) || ctx.bodyUndoBusyRef.current
        || !action
        || !action.id
        || ctx.executing
        || ctx.busyRef.current.sending || ctx.busyRef.current.executing
        || !ctx.session
        || action.session_id !== ctx.session.id
        || Action.isContinuationPending(action)
        || !ctx.api || typeof ctx.api.streamAssistantActionRevise !== "function"
      ) return;
      const sequence = ctx.loadSequenceRef.current;
      const versionId = ctx.sessionRef.current?.current_version_id;
      const streamingId = "stream-revise-" + action.id;
      const requestedHash = Action.actionHash(action);
      const consumer = ctx.createStreamConsumer(streamingId, {
        targetBookId: action.book_link_id,
        onAction(nextAction) {
          if (!nextAction) return;
          assignActions((current) => {
            const exists = current.some((item) => item.id === nextAction.id);
            return exists
              ? current.map((item) => item.id === nextAction.id ? nextAction : item)
              : current.concat([nextAction]);
          });
        }
      });
      ctx.busyRef.current.executing = true;
      ctx.setExecutingActionId(action.id);
      ctx.setError("");
      const owned = ctx.beginStream();
      try {
        await ctx.api.streamAssistantActionRevise(
          action.id,
          requestedHash,
          text,
          { onEvent: (streamEvent) => consumer.handleEvent(streamEvent) },
          { signal: owned.controller.signal }
        );
        await consumer.finish();
        if (!invocationCurrent(owned, sequence, versionId)) return;
        await ctx.refresh();
        if (!invocationCurrent(owned, sequence, versionId)) return;
        if (ctx.toast) ctx.toast(ctx.TC("asst_revision_requested"));
      } catch (reviseError) {
        if (!invocationCurrent(owned, sequence, versionId)) return;
        settleConsumer(consumer, reviseError);
        await recoverAfterStream(streamingId);
        if (!invocationCurrent(owned, sequence, versionId)) return;
        ctx.setError(Composer.isAbortError(reviseError)
          ? ctx.assistantCopy("asst_stop_note")
          : Action.messageText(reviseError, ctx.assistantCopy));
      } finally {
        ctx.releaseStream(owned, () => {
          ctx.busyRef.current.executing = false;
          ctx.setExecutingActionId(null);
        });
      }
    }

    async function resume(action) {
      if (action?.version_current === false || ctx.checkpoint?.stopping) return;
      if (
        Action.isSessionRunning(ctx.sessionRef.current) || ctx.bodyUndoBusyRef.current
        || !action
        || !action.id
        || ctx.executing
        || ctx.busyRef.current.sending || ctx.busyRef.current.executing
        || !ctx.session
        || action.session_id !== ctx.session.id
        || !Action.isContinuationPending(action)
      ) return;
      const sequence = ctx.loadSequenceRef.current;
      const versionId = ctx.sessionRef.current?.current_version_id;
      const streamingId = "stream-resume-" + action.id;
      const consumer = ctx.createStreamConsumer(streamingId, {
        targetBookId: action.book_link_id,
        onAction(nextAction) {
          if (nextAction) assignActions((current) => current.map((item) => item.id === nextAction.id ? nextAction : item));
        }
      });
      ctx.busyRef.current.executing = true;
      ctx.setExecutingActionId(action.id);
      ctx.setError("");
      const owned = ctx.beginStream();
      try {
        await ctx.api.streamAssistantActionResume(
          ctx.session.id,
          action.id,
          { onEvent: (streamEvent) => consumer.handleEvent(streamEvent) },
          { signal: owned.controller.signal }
        );
        await consumer.finish();
        if (!invocationCurrent(owned, sequence, versionId)) return;
        await ctx.refresh();
      } catch (resumeError) {
        if (!invocationCurrent(owned, sequence, versionId)) return;
        settleConsumer(consumer, resumeError);
        await recoverAfterStream(streamingId);
        if (!invocationCurrent(owned, sequence, versionId)) return;
        ctx.setError(Composer.isAbortError(resumeError)
          ? ctx.assistantCopy("asst_stop_note")
          : Action.messageText(resumeError, ctx.assistantCopy));
      } finally {
        ctx.releaseStream(owned, () => {
          ctx.busyRef.current.executing = false;
          ctx.setExecutingActionId(null);
        });
      }
    }

    /* One decision for a merged field-edit card (BNM-058). */
    async function decideGroup(card, decision, options) {
      const Group = root && root.AssistantFieldGroupCore;
      const first = card && Array.isArray(card.actions) ? card.actions[0] : null;
      if (!Group || !first || first.version_current === false || ctx.checkpoint?.stopping) return false;
      if (
        Action.isSessionRunning(ctx.sessionRef.current) || ctx.bodyUndoBusyRef.current
        || ctx.executing || ctx.busyRef.current.sending || ctx.busyRef.current.executing
        || !ctx.session || first.session_id !== ctx.session.id
        || typeof ctx.api.streamAssistantFieldGroupDecision !== "function"
      ) return false;
      const memberIds = new Set(card.actions.map((member) => member.id));
      const sequence = ctx.loadSequenceRef.current;
      const versionId = ctx.sessionRef.current?.current_version_id;
      const streamingId = "stream-group-" + card.id;
      let refreshTarget = null;
      const consumer = ctx.createStreamConsumer(streamingId, {
        targetBookId: first.book_link_id,
        onAction(nextAction) {
          if (!nextAction || !memberIds.has(nextAction.id)) return;
          assignActions((current) => current.map((item) => item.id === nextAction.id ? nextAction : item));
          if (!refreshTarget && Action.successCopyKey(nextAction)) refreshTarget = nextAction;
        }
      });
      ctx.busyRef.current.executing = true;
      ctx.setExecutingActionId(card.id);
      ctx.setError("");
      const owned = ctx.beginStream();
      try {
        await ctx.api.streamAssistantFieldGroupDecision(
          Group.decisionBody(card, decision, options),
          { onEvent: (streamEvent) => consumer.handleEvent(streamEvent) },
          { signal: owned.controller.signal }
        );
        await consumer.finish();
        if (!invocationCurrent(owned, sequence, versionId)) return false;
        if (refreshTarget && ctx.onActionCompleteRef.current) await ctx.onActionCompleteRef.current(refreshTarget);
        await ctx.refresh();
        if (!invocationCurrent(owned, sequence, versionId)) return false;
        if (ctx.toast && decision !== "reject") {
          ctx.toast(ctx.TC(decision === "revise" ? "asst_revision_requested" : "asst_field_saved"));
        }
        return true;
      } catch (groupError) {
        if (!invocationCurrent(owned, sequence, versionId)) return false;
        settleConsumer(consumer, groupError);
        await recoverAfterStream(streamingId);
        if (!invocationCurrent(owned, sequence, versionId)) return false;
        ctx.setError(Composer.isAbortError(groupError)
          ? ctx.assistantCopy("asst_stop_note")
          : Action.messageText(groupError, ctx.assistantCopy));
        return false;
      } finally {
        ctx.releaseStream(owned, () => {
          ctx.busyRef.current.executing = false;
          ctx.setExecutingActionId(null);
        });
      }
    }

    function restoreFailedMessage(messageId) {
      if (ctx.sessionRef.current?.failed_message_id !== messageId || ctx.inputValueRef.current.trim()
        || ctx.busyRef.current.sending || ctx.busyRef.current.executing || Action.isSessionRunning(ctx.sessionRef.current)
        || ctx.actionsRef.current.some(Action.isActionBlocking) || ctx.resetConfirmOpen) return false;
      const message = ctx.messages.find(item => item.id === messageId && item.role === "user");
      if (!message) return false;
      ctx.applyComposerState({ draft: message.content || "", pendingSend: null,
        citations: message.content_json?.workspace_files || [] });
      ctx.setError("");
      ctx.inputRef?.current?.focus();
      return true;
    }

    return { send, confirm, reject, revise, resume, decideGroup, recoverAfterStream, restoreFailedMessage };
  }

  return { create, withWelcome };
});
