(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantCheckpointOps = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  function create(ctx) {
    const current = () => !ctx.busyRef.current.sending && !ctx.busyRef.current.executing
      && !ctx.bodyUndoBusyRef.current && !ctx.resetting && !ctx.resetConfirmOpen;
    async function run(kind, message, content, protectionKey) {
      const session = ctx.sessionRef.current;
      const control = ctx.checkpoint;
      if (!session || !current()) return false;
      if (kind === "edit" && (!control.canEdit || message?.role !== "user" || !message.editable || !message.core_message_id)) return false;
      if (kind === "resume" && !control.canResume) return false;
      if (control.status?.current_version_id !== session.current_version_id) return false;
      const sequence = ctx.loadSequenceRef.current;
      let versionId = session.current_version_id;
      const key = ctx.newInvocationKey();
      const streamingId = "stream-checkpoint-" + key;
      const prior = kind === "resume" ? ctx.messagesRef.current.slice().reverse().find(item => item.role === "assistant"
        && item.content_json?.presentation?.source_message_id === control.status.source_message_id
        && item.content_json?.presentation?.status !== "completed") : null;
      const consumer = ctx.createStreamConsumer(streamingId, { resumeMessageId: prior?.id });
      const owned = ctx.beginStream();
      const live = () => ctx.streamLock.isCurrent(owned) && sequence === ctx.loadSequenceRef.current
        && ctx.sessionRef.current?.id === session.id && ctx.sessionRef.current.current_version_id === versionId;
      ctx.busyRef.current.sending = true;
      ctx.setSending(true); ctx.setError("");
      try {
        const handlers = { onEvent: event => {
          const result = consumer.handleEvent(event);
          if (event?.event === "version_changed" && result?.id === session.id) versionId = result.current_version_id;
          return result;
        } };
        if (kind === "edit") {
          await ctx.api.streamAssistantMessageEdit(session.id, message.id, session.current_version_id, content, key, handlers,
            { signal: owned.controller.signal });
        } else {
          await ctx.api.streamAssistantCheckpointResume(session.id, session.current_version_id,
            control.status.source_message_id, key, handlers,
            { signal: owned.controller.signal, ...(protectionKey ? { protectionKey } : {}) });
        }
        await consumer.finish();
        if (live()) await ctx.refresh();
        return true;
      } catch (error) {
        if (!live()) return false;
        consumer.finalize?.(ctx.Composer.isAbortError(error) ? "cancelled" : "failed");
        try { await ctx.refresh(); } catch (_) {}
        if (!live()) return false;
        ctx.setError(ctx.Action.messageText(error, ctx.assistantCopy));
        if (kind === "edit") throw error;
        return false;
      } finally {
        ctx.releaseStream(owned, () => { ctx.busyRef.current.sending = false; ctx.setSending(false); });
        if (sequence === ctx.loadSequenceRef.current) ctx.checkpoint.retry();
      }
    }
    function restoreInput(sourceMessageId) {
      if (!current() || ctx.inputValueRef.current.trim() || ctx.checkpoint.stopping) return false;
      const source = ctx.messagesRef.current.find(message => message.id === sourceMessageId && message.role === "user");
      if (!source) return false;
      ctx.applyComposerState({ draft: source.content || "", pendingSend: null,
        citations: source.content_json?.workspace_files || source.workspace_files || [] });
      ctx.inputRef.current?.focus();
      return true;
    }
    return { resumeCheckpoint: protectionKey => run("resume", null, null, protectionKey), editMessage: (message, content) => run("edit", message, content), restoreCheckpointInput: restoreInput };
  }
  return { create };
});
