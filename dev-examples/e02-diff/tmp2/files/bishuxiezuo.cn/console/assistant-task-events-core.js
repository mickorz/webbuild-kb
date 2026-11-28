(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantTaskEventsCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const DEFAULT_CONFLICT_RETRY_DELAY_MS = 1200;
  const DEFAULT_MAX_CONFLICT_RETRIES = 3;

  function itemsFrom(payload) {
    if (!payload) return [];
    if (Array.isArray(payload.items)) return payload.items;
    return [];
  }

  function createAssistantTaskEventPump(options) {
    const opts = options || {};
    const conflictRetryDelayMs = opts.conflictRetryDelayMs == null
      ? DEFAULT_CONFLICT_RETRY_DELAY_MS
      : opts.conflictRetryDelayMs;
    const maxConflictRetries = opts.maxConflictRetries == null
      ? DEFAULT_MAX_CONFLICT_RETRIES
      : opts.maxConflictRetries;
    const delay = typeof opts.delay === "function"
      ? opts.delay
      : (ms) => new Promise((resolve) => {
        const signal = abortController.signal;
        if (signal.aborted) { resolve(); return; }
        let timer;
        const done = () => {
          clearTimeout(timer);
          signal.removeEventListener("abort", done);
          resolve();
        };
        timer = setTimeout(done, ms);
        signal.addEventListener("abort", done, { once: true });
      });
    const abortController = opts.abortController || new AbortController();
    let aborted = false;
    let inFlight = false;
    let deliveryRequested = false;
    let activeCompletion = null;
    const completing = new Set();
    const failedEvents = new Set();
    const deliveredEvents = new Set();

    async function waitUntilIdle() {
      while (!aborted && typeof opts.isBusy === "function" && opts.isBusy()) await delay(300);
      if (!aborted && typeof opts.waitUntilIdle === "function") {
        await opts.waitUntilIdle(abortController.signal);
      }
    }

    function isAbortError(error) {
      return !!(error && (error.name === "AbortError" || aborted || abortController.signal.aborted));
    }

    async function completeItem(sessionId, item) {
      const taskId = item && item.task_id;
      if (!sessionId || !taskId || completing.has(taskId) || aborted) return { status: "skipped" };
      const eventKey = sessionId + ":" + taskId + ":" + String(item.status || "terminal");
      if (failedEvents.has(eventKey) || deliveredEvents.has(eventKey)) return { status: "skipped" };
      completing.add(taskId);
      const streamingId = "stream-task-" + taskId + "-" + String(item.status || "terminal");
      let attempt = 0;
      try {
        while (!aborted) {
          await waitUntilIdle();
          if (aborted) return { status: "aborted" };
          const completionController = new AbortController();
          const abortCompletion = () => completionController.abort();
          abortController.signal.addEventListener("abort", abortCompletion, { once: true });
          activeCompletion = { controller: completionController, eventKey };
          if (typeof opts.onBusy === "function") opts.onBusy(true);
          const consumer = typeof opts.createConsumer === "function"
            ? opts.createConsumer(streamingId, item)
            : null;
          try {
            await opts.completeTask(
              sessionId,
              taskId,
              {
                onEvent(streamEvent) {
                  if (completionController.signal.aborted) return undefined;
                  if (consumer && consumer.handleEvent) return consumer.handleEvent(streamEvent);
                  return undefined;
                }
              },
              { signal: completionController.signal }
            );
            if (completionController.signal.aborted) return { status: "aborted" };
            if (consumer && consumer.finish) await consumer.finish();
            deliveredEvents.add(eventKey);
            return { status: "completed", taskId };
          } catch (error) {
            if (typeof opts.dropStreamingMessage === "function") {
              opts.dropStreamingMessage(streamingId);
            }
            if (completionController.signal.aborted || isAbortError(error)) return { status: "aborted" };
            if (Number(error && error.status) === 409 && attempt < maxConflictRetries) {
              attempt += 1;
              await delay(conflictRetryDelayMs);
              continue;
            }
            failedEvents.add(eventKey);
            if (typeof opts.onError === "function") opts.onError(error);
            return { status: "failed", error };
          } finally {
            abortController.signal.removeEventListener("abort", abortCompletion);
            if (activeCompletion && activeCompletion.controller === completionController) activeCompletion = null;
            if (typeof opts.onBusy === "function") opts.onBusy(false);
          }
        }
        return { status: "aborted" };
      } finally {
        completing.delete(taskId);
      }
    }

    async function requestDelivery(sessionId) {
      if (aborted || !sessionId) return { status: "idle", items: [] };
      if (inFlight) {
        deliveryRequested = true;
        return { status: "busy", items: [] };
      }
      inFlight = true;
      try {
        const items = [];
        const results = [];
        do {
          deliveryRequested = false;
          const payload = await opts.listTaskEvents(sessionId, { signal: abortController.signal });
          if (aborted) return { status: "aborted", items: [] };
          const pending = itemsFrom(payload);
          items.push(...pending);
          for (let index = 0; index < pending.length; index += 1) {
            if (aborted) break;
            results.push(await completeItem(sessionId, pending[index]));
          }
        } while (deliveryRequested && !aborted);
        return { status: "delivered", items, results };
      } catch (error) {
        if (!isAbortError(error) && typeof opts.onError === "function") opts.onError(error);
        return { status: isAbortError(error) ? "aborted" : "failed", error };
      } finally {
        inFlight = false;
      }
    }

    function start(getSessionId) {
      const sessionIdOf = typeof getSessionId === "function" ? getSessionId : () => getSessionId;
      // Recover undelivered receipts once on open; later work needs a task event.
      requestDelivery(sessionIdOf());
      return {
        requestDelivery() {
          return requestDelivery(sessionIdOf());
        },
        stopCurrent() {
          if (!activeCompletion) return false;
          failedEvents.add(activeCompletion.eventKey);
          activeCompletion.controller.abort();
          return true;
        },
        stop() {
          aborted = true;
          deliveryRequested = false;
          if (typeof abortController.abort === "function") abortController.abort();
        },
        get inFlight() {
          return inFlight;
        },
        get aborted() {
          return aborted;
        }
      };
    }

    return {
      start,
      requestDelivery,
      completeItem,
      get inFlight() {
        return inFlight;
      }
    };
  }

  return {
    DEFAULT_CONFLICT_RETRY_DELAY_MS,
    DEFAULT_MAX_CONFLICT_RETRIES,
    itemsFrom,
    createAssistantTaskEventPump
  };
});
