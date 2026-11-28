{
/* Draw-specific lifecycle. Recovery only reads; paid POSTs require an explicit confirmation. */
function useProseDrawSettings({
  accountId,
  bookId
}) {
  const C = window.ProseDrawFlowCore,
    identity = String(accountId || '') + ':' + String(bookId || '');
  const [state, setState] = React.useState({
    identity: null,
    phase: 'loading',
    enabled: null,
    globallyEnabled: null,
    secondCandidateFreeEnabled: false,
    error: ''
  });
  const sequence = React.useRef(0),
    saving = React.useRef(null),
    runtime = React.useRef({});
  runtime.current = {
    identity,
    accountId,
    bookId
  };
  const current = () => runtime.current.identity === identity && String(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id || '') === String(accountId || '');
  const load = async () => {
    if (!accountId || !bookId || !current() || saving.current && saving.current.identity === identity) return false;
    const request = ++sequence.current;
    setState(old => ({
      ...old,
      identity,
      phase: 'loading',
      error: ''
    }));
    try {
      const value = await window.LF_API.request(C.settingsPath(bookId));
      if (!current() || request !== sequence.current) return false;
      if (!C.validSettings(value)) throw Error('settings');
      setState({
        identity,
        phase: 'ready',
        enabled: value.enabled,
        globallyEnabled: value.globally_enabled,
        secondCandidateFreeEnabled: value.second_candidate_free_enabled === true,
        error: ''
      });
      return true;
    } catch (error) {
      if (current() && request === sequence.current) setState(old => ({
        ...old,
        identity,
        phase: 'failed',
        error: window.CLANG === 'en' ? 'Unable to read the book’s draw setting.' : '作品抽卡设置读取失败。'
      }));
      return false;
    }
  };
  React.useEffect(() => {
    saving.current = null;
    setState({
      identity,
      phase: 'loading',
      enabled: null,
      globallyEnabled: null,
      secondCandidateFreeEnabled: false,
      error: ''
    });
    load();
    const focus = () => load();
    window.addEventListener('focus', focus);
    return () => {
      sequence.current++;
      window.removeEventListener('focus', focus);
    };
  }, [identity]);
  const ready = state.identity === identity && state.phase === 'ready';
  const isSaving = state.identity === identity && state.phase === 'saving';
  const change = async enabled => {
    if (!current() || !ready && !isSaving || enabled && !state.globallyEnabled) return false;
    enabled = !!enabled;
    const pending = saving.current;
    if (pending && pending.identity === identity) {
      pending.desired = enabled;
      setState(old => ({
        ...old,
        enabled
      }));
      return pending.promise;
    }
    if (enabled === state.enabled) return true;
    const request = ++sequence.current;
    const flight = {
      identity,
      request,
      desired: enabled
    };
    saving.current = flight;
    // Selection is immediate; only a confirmed write can unlock generation.
    setState(old => ({
      ...old,
      enabled,
      phase: 'saving',
      error: ''
    }));
    flight.promise = (async () => {
      try {
        while (current() && request === sequence.current) {
          const selected = flight.desired;
          const value = await window.LF_API.request(C.settingsPath(bookId), {
            method: 'PUT',
            body: JSON.stringify({
              enabled: selected
            })
          });
          if (!current() || request !== sequence.current) return false;
          if (!C.validSettings(value) || value.enabled !== selected) throw Error('settings');
          if (flight.desired !== selected) continue;
          setState({
            identity,
            phase: 'ready',
            enabled: value.enabled,
            globallyEnabled: value.globally_enabled,
            secondCandidateFreeEnabled: value.second_candidate_free_enabled === true,
            error: ''
          });
          return true;
        }
        return false;
      } catch (error) {
        if (current() && request === sequence.current) setState(old => ({
          ...old,
          phase: 'failed',
          error: window.CLANG === 'en' ? 'The setting was not confirmed. Refresh it before generating.' : '设置保存结果未确认，请重新读取后再生成。'
        }));
        return false;
      } finally {
        if (saving.current === flight) saving.current = null;
      }
    })();
    return flight.promise;
  };
  const enabled = state.identity === identity && state.enabled === true;
  const unavailable = !ready ? state.identity === identity ? state.error : '' : !state.globallyEnabled ? window.CLANG === 'en' ? 'Prose draw is temporarily unavailable.' : '正文抽卡暂不可用。' : '';
  return {
    ready,
    enabled,
    globallyEnabled: (ready || isSaving) && state.globallyEnabled,
    saving: isSaving,
    secondCandidateFreeEnabled: (ready || isSaving) && state.secondCandidateFreeEnabled === true,
    error: state.identity === identity ? state.error : '',
    unavailable,
    change,
    refresh: load
  };
}
function useProseDrawRun({
  accountId,
  bookId,
  chapterNumber,
  onRecord,
  onClear
}) {
  const C = window.ProseDrawFlowCore,
    identity = String(accountId || '') + ':' + String(bookId || '');
  const [record, setRecord] = React.useState(null),
    active = React.useRef(null),
    life = React.useRef(0),
    runtime = React.useRef({});
  const readFlight = React.useRef(null),
    listFlight = React.useRef(null),
    sendFlight = React.useRef(false),
    cancelFlight = React.useRef(false);
  const dismissed = React.useRef(new Set());
  runtime.current = {
    identity,
    accountId,
    bookId,
    chapterNumber,
    onRecord,
    onClear
  };
  const alive = generation => life.current === generation && runtime.current.identity === identity && String(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id || '') === String(accountId || '');
  const persist = value => {
    try {
      const key = C.storageKey(accountId, bookId);
      if (value) localStorage.setItem(key, JSON.stringify(C.saved(value, accountId)));else localStorage.removeItem(key);
    } catch (error) {}
  };
  const publish = (value, show = false) => {
    if (!alive(life.current)) return null;
    active.current = value;
    setRecord(value);
    persist(value);
    if (value) {
      runtime.current.onRecord(value, show);
    } else if (runtime.current.onClear) runtime.current.onClear();
    return value;
  };
  const attach = (round, show = false) => {
    if (!round || !C.validRound(round, round.round_id, round.chapter_number) || !Number.isInteger(Number(round.chapter_number))) return null;
    const previous = active.current && active.current.draw.round.round_id === round.round_id ? active.current : null;
    const cancellation = round.cancel_state || {};
    const draw = {
      ...(previous && previous.draw),
      ...C.stageState(round),
      round,
      creationState: null,
      createCommand: null,
      readState: 'ready',
      cancelState: cancellation.requested || round.status === 'cancelled' ? 'pending' : previous && previous.draw.cancelState || null,
      cancelError: cancellation.requested ? '' : previous && previous.draw.cancelError || '',
      stopConfirmed: cancellation.confirmed === true
    };
    const value = {
      operationId: 'draw_' + round.round_id,
      accountId: String(accountId),
      bookId: String(bookId),
      chapterNumber: Number(round.chapter_number),
      status: window.ProseDrawProgressCore.project(draw, window.CLANG, round.chapter_number).dockStatus,
      draw
    };
    return publish(value, show);
  };
  const patch = (value, expected) => {
    const current = active.current;
    if (!current || expected && current.operationId !== expected.operationId) return null;
    return publish({
      ...current,
      draw: {
        ...current.draw,
        ...value
      }
    });
  };
  const refresh = async () => {
    const current = active.current,
      generation = life.current;
    if (!current || !alive(generation)) return null;
    if (readFlight.current && readFlight.current.id === current.operationId) return readFlight.current.promise;
    const flight = {
      id: current.operationId
    };
    flight.promise = (async () => {
      try {
        const value = await window.LF_API.request(C.path(bookId, current.draw.round.round_id));
        if (!alive(generation) || active.current?.operationId !== current.operationId) return null;
        if (!C.validRound(value, current.draw.round.round_id, current.chapterNumber)) throw Error('identity');
        attach(value);
        return value;
      } catch (error) {
        if (alive(generation) && active.current?.operationId === current.operationId) patch({
          readState: 'failed'
        }, current);
        return null;
      } finally {
        if (readFlight.current === flight) readFlight.current = null;
      }
    })();
    readFlight.current = flight;
    return flight.promise;
  };
  const discover = async (no = chapterNumber, {
    fresh = false
  } = {}) => {
    const generation = life.current;
    if (!alive(generation) || !accountId || !bookId) return {
      known: false
    };
    if (active.current && (!fresh || active.current.draw.createCommand)) return {
      known: true,
      record: active.current
    };
    if (active.current && Number(active.current.chapterNumber) !== Number(no) && C.needsRead(active.current)) return {
      known: true,
      record: active.current
    };
    if (listFlight.current && listFlight.current.chapter === Number(no)) return listFlight.current.promise;
    const flight = {
      chapter: Number(no)
    };
    flight.promise = (async () => {
      try {
        let offset = 0,
          round = null;
        do {
          const result = await window.LF_API.request(C.path(bookId) + '?chapter_number=' + encodeURIComponent(no) + '&limit=20&offset=' + offset);
          if (!alive(generation) || Number(runtime.current.chapterNumber) !== Number(no)) return {
            known: false
          };
          if (!Array.isArray(result.items) || !Number.isInteger(result.total) || result.total < 0) throw Error('list');
          for (const item of result.items) {
            if (!C.validRound(item, item.round_id, no)) throw Error('identity');
            if (C.closed(item) || fresh && item.status === 'preparation_failed' || item.status === 'cancelled' && item.cancel_state?.confirmed === true) continue;
            if (fresh && item.status === 'awaiting_selection' && !C.pendingSelection(item) && !C.needsRead({
              draw: {
                round: item
              }
            })) continue;
            if (C.pendingSelection(item) || !dismissed.current.has(item.round_id)) {
              round = item;
              break;
            }
          }
          offset += result.items.length;
          if (round || offset >= result.total) break;
          if (!result.items.length) throw Error('incomplete list');
        } while (true);
        if (round) attach(round);else if (fresh && active.current && !active.current.draw.createCommand) {
          if (Number(active.current.chapterNumber) !== Number(no) && C.needsRead(active.current)) return {
            known: true,
            record: active.current
          };
          publish(null);
        }
        return {
          known: true,
          record: active.current
        };
      } catch (error) {
        return {
          known: false
        };
      } finally {
        if (listFlight.current === flight) listFlight.current = null;
      }
    })();
    listFlight.current = flight;
    return flight.promise;
  };
  React.useEffect(() => {
    life.current++;
    active.current = null;
    setRecord(null);
    readFlight.current = null;
    listFlight.current = null;
    sendFlight.current = false;
    cancelFlight.current = false;
    dismissed.current.clear();
    if (accountId && bookId) {
      try {
        const saved = C.restore(JSON.parse(localStorage.getItem(C.storageKey(accountId, bookId)) || 'null'), accountId, bookId);
        if (saved) {
          publish(saved);
          refresh();
        }
      } catch (error) {}
    }
    const focus = () => {
      if (active.current) refresh();else discover(runtime.current.chapterNumber);
    };
    const assistantStarted = event => {
      const action = event && event.detail && event.detail.action;
      const round = window.AssistantActionCore?.proseDrawReceipt(action);
      if (!round || String(round.book_link_id) !== String(bookId) || !alive(life.current)) return;
      const current = active.current;
      if (current && current.draw.round.round_id === round.round_id) {
        refresh();
        return;
      }
      if (C.needsRead(current)) return;
      attach({
        ...round,
        candidates: [],
        display_order: []
      });
      patch({
        readState: 'loading'
      });
      refresh();
    };
    window.addEventListener('focus', focus);
    window.addEventListener('lf:assistant-draw-started', assistantStarted);
    return () => {
      life.current++;
      window.removeEventListener('focus', focus);
      window.removeEventListener('lf:assistant-draw-started', assistantStarted);
    };
  }, [identity]);
  React.useEffect(() => {
    if (accountId && bookId) discover(chapterNumber);
  }, [identity, chapterNumber]);
  const reading = C.needsRead(record) || C.awaitingFailureClose(record?.draw.round);
  React.useEffect(() => {
    if (!reading) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'hidden') refresh();
    }, 3000);
    return () => clearInterval(timer);
  }, [identity, record && record.operationId, reading]);
  const send = async current => {
    if (sendFlight.current || !current || !current.draw.createCommand || !alive(life.current)) return {
      unknown: true
    };
    sendFlight.current = true;
    const generation = life.current,
      command = current.draw.createCommand;
    patch({
      creationState: 'submitting'
    }, current);
    try {
      const result = await window.LF_API.request(C.path(bookId), {
        method: 'POST',
        headers: {
          'Idempotency-Key': command.key
        },
        body: JSON.stringify(C.createPayload(command))
      });
      if (!alive(generation) || active.current?.operationId !== current.operationId) return {
        unknown: true
      };
      if (!result || result.round_id !== current.draw.round.round_id || typeof result.status !== 'string') throw Error('receipt');
      patch({
        creationState: null,
        createCommand: null,
        readState: 'loading',
        round: {
          ...current.draw.round,
          status: result.status
        }
      }, current);
      await refresh();
      return {
        accepted: true
      };
    } catch (error) {
      if (!alive(generation) || active.current?.operationId !== current.operationId) return {
        unknown: true
      };
      if (C.knownRejection(error)) {
        publish(null);
        return {
          error: C.errorText(error, window.CLANG === 'en'),
          invalidateQuote: true
        };
      }
      patch({
        creationState: 'unknown',
        readState: 'failed'
      }, current);
      await refresh();
      return {
        unknown: true
      };
    } finally {
      if (alive(generation)) sendFlight.current = false;
    }
  };
  const start = async (quote, target, guidance) => {
    const generation = life.current;
    if (!alive(generation) || String(target.bookId) !== String(bookId) || C.needsRead(active.current)) return {
      error: window.CLANG === 'en' ? 'Refresh the existing round first.' : '请先读取已有抽卡轮次。'
    };
    const value = C.quote(quote);
    if (!value || !value.quote_token) return {
      error: window.CLANG === 'en' ? 'Get a draw quote first.' : '请先获取抽卡报价。',
      invalidateQuote: true
    };
    const input = C.input(target, guidance),
      hash = await C.inputHash(input);
    if (!alive(generation) || Number(runtime.current.chapterNumber) !== Number(target.chapterNumber)) return {
      error: window.CLANG === 'en' ? 'The target changed. Confirm again.' : '目标已变化，请重新确认。'
    };
    const existing = await discover(target.chapterNumber, {
      fresh: true
    });
    if (!alive(generation) || Number(runtime.current.chapterNumber) !== Number(target.chapterNumber)) return {
      unknown: true
    };
    if (!existing.known) return {
      error: window.CLANG === 'en' ? 'Unable to verify existing rounds. Please retry.' : '暂时无法确认已有抽卡轮次，请重新读取后再试。'
    };
    if (existing.record) return {
      existing: existing.record
    };
    const roundId = C.roundId();
    const current = {
      operationId: 'draw_' + roundId,
      accountId: String(accountId),
      bookId: String(bookId),
      chapterNumber: Number(target.chapterNumber),
      status: 'verifying',
      draw: {
        round: {
          round_id: roundId,
          chapter_number: Number(target.chapterNumber),
          status: 'unknown',
          candidates: [],
          display_order: []
        },
        creationState: 'submitting',
        createCommand: {
          key: C.key(),
          quote_token: value.quote_token,
          round_id: roundId,
          input_hash: hash,
          input
        },
        readState: 'loading'
      }
    };
    publish(current, true);
    return send(current);
  };
  const retryCreate = async () => {
    if (sendFlight.current) return;
    // A readable admitted round wins over a lost POST response. Never replay it after that evidence.
    await refresh();
    const current = active.current;
    if (current && current.draw.createCommand) return send(current);
  };
  const cancel = async () => {
    const current = active.current;
    if (!current || current.draw.createCommand || cancelFlight.current || !alive(life.current)) return;
    const generation = life.current,
      key = current.draw.cancelKey || C.key(),
      previousUnknown = current.draw.cancelState === 'unknown';
    cancelFlight.current = true;
    patch({
      cancelKey: key,
      cancelState: 'pending',
      cancelError: '',
      stopConfirmed: false
    }, current);
    try {
      await window.LF_API.request(C.path(bookId, current.draw.round.round_id) + '/events', {
        method: 'POST',
        headers: {
          'Idempotency-Key': key
        },
        body: JSON.stringify({
          type: 'cancel',
          candidate_ids: []
        })
      });
      if (alive(generation) && active.current?.operationId === current.operationId) await refresh();
    } catch (error) {
      if (alive(generation) && active.current?.operationId === current.operationId) {
        const rejected = [400, 401, 403, 404, 422, 429].includes(Number(error && error.status));
        patch({
          cancelState: rejected && !previousUnknown ? null : 'unknown',
          cancelError: rejected ? previousUnknown ? window.CLANG === 'en' ? 'This retry was rejected; the previous stop request is still unconfirmed.' : '本次重试未被接受，前次结束请求仍待确认。' : window.CLANG === 'en' ? 'The stop request was rejected. Refresh the round before trying again.' : '结束请求未被接受，请重新读取本轮后再试。' : ''
        }, current);
      }
    } finally {
      if (alive(generation)) cancelFlight.current = false;
    }
  };
  return {
    record,
    discover,
    start,
    refresh,
    cancel,
    retryCreate,
    patch,
    dismiss: () => {
      if (active.current) dismissed.current.add(active.current.draw.round.round_id);
      publish(null);
    }
  };
}
window.useProseDrawSettings = useProseDrawSettings;
window.useProseDrawRun = useProseDrawRun;
}
