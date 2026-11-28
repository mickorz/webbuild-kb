{
/* Uses existing round APIs and chapter revision guards; candidates never enter the editor draft. */
function useProseDrawSelection({
  accountId,
  bookId,
  chapterNumber,
  blocked,
  enabled = true,
  bodyVersion,
  onRefreshBody,
  initialRoundId,
  initialRoundRequest,
  historyOpen = false,
  onCloseHistory
}) {
  const C = window.ProseDrawSelectionCore,
    en = window.CLANG === 'en',
    T = (zh, english) => en ? english : zh;
  const [items, setItems] = React.useState([]),
    [listLoading, setListLoading] = React.useState(false),
    [listError, setListError] = React.useState(false),
    [more, setMore] = React.useState(false);
  const [round, setRound] = React.useState(null),
    [readLoading, setReadLoading] = React.useState(false),
    [error, setError] = React.useState('');
  const [reading, setReading] = React.useState(false),
    [confirm, setConfirm] = React.useState(null);
  const history = historyOpen;
  const [command, setCommand] = React.useState(null),
    [sending, setSending] = React.useState(false),
    [syncNeeded, setSyncNeeded] = React.useState(false);
  const [presentationPending, setPresentationPending] = React.useState(false),
    [presentationError, setPresentationError] = React.useState(''),
    [bodyLoading, setBodyLoading] = React.useState(false);
  const identity = [accountId, bookId, chapterNumber].join(':'),
    storageKey = 'lf_draw_command:' + identity;
  const runtime = React.useRef({}),
    life = React.useRef(0),
    listFlight = React.useRef(false),
    readSeq = React.useRef(0),
    offset = React.useRef(0),
    selected = React.useRef(null),
    lock = React.useRef(false),
    commandRef = React.useRef(null),
    presented = React.useRef(new Set()),
    presenting = React.useRef(new Set()),
    readFlight = React.useRef(false);
  runtime.current = {
    blocked,
    enabled,
    bodyVersion,
    onRefreshBody,
    onCloseHistory,
    accountId,
    identity
  };
  const alive = generation => life.current === generation && runtime.current.enabled && runtime.current.identity === identity && String(window.LF_PORTAL_STATE && window.LF_PORTAL_STATE.me && window.LF_PORTAL_STATE.me.id || '') === String(accountId || '');
  const request = (url, options) => window.LF_API.request(url, options);
  const saveCommand = value => {
    commandRef.current = value;
    setCommand(value);
    try {
      if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));else sessionStorage.removeItem(storageKey);
    } catch (e) {}
  };
  const applyRound = value => {
    setRound(value);
    setItems(old => old.map(item => item.round_id === value.round_id ? value : item));
  };
  const returnToProse = () => {
    setReading(false);
    runtime.current.onCloseHistory?.();
  };
  const refreshBody = async () => {
    const generation = life.current;
    if (runtime.current.blocked) {
      setSyncNeeded(true);
      return;
    }
    setBodyLoading(true);
    try {
      const ok = await runtime.current.onRefreshBody();
      if (alive(generation)) setSyncNeeded(!ok);
      return ok;
    } catch (e) {
      if (alive(generation)) setSyncNeeded(true);
      return false;
    } finally {
      if (alive(generation)) setBodyLoading(false);
    }
  };
  const load = async (id, quiet = false) => {
    if (!id || !enabled || quiet && readFlight.current) return null;
    readFlight.current = true;
    const generation = life.current,
      sequence = ++readSeq.current;
    if (selected.current !== id) {
      setRound(null);
      setError('');
      setPresentationError('');
    }
    selected.current = id;
    if (!quiet) setReadLoading(true);
    try {
      const value = await request(C.path(bookId, id));
      if (!alive(generation) || sequence !== readSeq.current || selected.current !== id) return null;
      if (value.round_id !== id || Number(value.chapter_number) !== Number(chapterNumber)) throw Error('identity');
      applyRound(value);
      setError('');
      const pending = commandRef.current;
      if (pending && pending.roundId === id) {
        const adoption = value.adoption_request;
        if (pending.type === 'reject_all' && value.status === 'rejected') {
          saveCommand(null);
          returnToProse();
        }
        if (pending.type === 'adopt' && pending.adoptionId && value.current_adoption_id === pending.adoptionId && ['adopted', 'ready', 'post_process_failed'].includes(value.status) && !C.policy(value).busy) {
          saveCommand(null);
          if ((await refreshBody()) && alive(generation)) returnToProse();
        } else if (pending.type === 'adopt' && pending.adoptionId && adoption && adoption.adoption_id === pending.adoptionId) {
          if (['failed', 'cancelled'].includes(adoption.status)) {
            saveCommand(null);
            setError(T('采用未完成。请重新读取后再确认重试。', 'Adoption did not complete. Refresh before retrying.'));
          }
        }
      }
      return value;
    } catch (e) {
      if (alive(generation) && sequence === readSeq.current) setError(T('轮次读取失败，请重新读取。', 'Unable to read this round. Please retry.'));
      return null;
    } finally {
      if (alive(generation) && sequence === readSeq.current) {
        readFlight.current = false;
        setReadLoading(false);
      }
    }
  };
  const list = async (reset = false) => {
    if (!enabled || !bookId || !accountId || listFlight.current) return;
    listFlight.current = true;
    setListLoading(true);
    setListError(false);
    const generation = life.current,
      start = reset ? 0 : offset.current;
    try {
      const value = await request(C.path(bookId) + '?limit=' + (reset ? 1 : 5) + '&chapter_number=' + encodeURIComponent(chapterNumber) + '&offset=' + start);
      if (!alive(generation)) return;
      if (!Array.isArray(value.items) || !Number.isInteger(value.total)) throw Error('invalid list');
      offset.current = start + value.items.length;
      setMore(offset.current < value.total);
      const filtered = value.items.filter(item => Number(item.chapter_number) === Number(chapterNumber));
      setItems(old => {
        const all = reset ? filtered : old.concat(filtered);
        return all.filter((item, index) => all.findIndex(x => x.round_id === item.round_id) === index);
      });
      if (!selected.current && filtered.length) {
        selected.current = filtered[0].round_id;
        applyRound(filtered[0]);
      }
    } catch (e) {
      if (alive(generation)) setListError(true);
    } finally {
      if (alive(generation)) {
        listFlight.current = false;
        setListLoading(false);
      }
    }
  };
  React.useEffect(() => {
    life.current++;
    const generation = life.current;
    readFlight.current = false;
    setBodyLoading(false);
    setPresentationPending(false);
    setPresentationError('');
    presented.current.clear();
    presenting.current.clear();
    lock.current = false;
    setSending(false);
    selected.current = null;
    offset.current = 0;
    setItems([]);
    setRound(null);
    setReading(false);
    setConfirm(null);
    setError('');
    commandRef.current = null;
    setCommand(null);
    if (enabled && accountId && bookId) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
        if (saved && saved.identity === identity && ['adopt', 'reject_all'].includes(saved.type) && saved.roundId && saved.key && saved.payload) {
          saveCommand(saved);
          load(saved.roundId);
        }
      } catch (e) {}
      if (initialRoundId && !commandRef.current) {
        load(initialRoundId);
        setReading(true);
      }
      list(true);
    }
    const focus = () => {
      if (alive(generation)) {
        if (selected.current) load(selected.current, true);else list(true);
      }
    };
    window.addEventListener('focus', focus);
    return () => {
      life.current++;
      readSeq.current++;
      listFlight.current = false;
      window.removeEventListener('focus', focus);
    };
  }, [identity, enabled]);
  React.useEffect(() => {
    if (!initialRoundId) {
      setReading(false);
      return;
    }
    if (enabled && !runtime.current.blocked && !commandRef.current) {
      load(initialRoundId);
      setReading(true);
    }
  }, [initialRoundId, initialRoundRequest]);
  const view = C.policy(round),
    pending = !!command || view.busy || sending || bodyLoading;
  React.useEffect(() => {
    if (!enabled || !selected.current) return;
    const generating = round && !['adopted', 'ready', 'rejected', 'cancelled', 'post_process_failed', 'preparation_failed', 'awaiting_selection'].includes(round.status);
    const unfinished = round && C.rows(round).some(row => !['completed', 'failed', 'cancelled'].includes(row.status));
    if (!pending && !generating && !unfinished) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'hidden' && !lock.current) load(selected.current, true);
    }, 3000);
    return () => clearInterval(timer);
  }, [enabled, round && round.status, round && round.round_id, pending, JSON.stringify(round && round.candidates && round.candidates.map(row => row.status))]);
  React.useEffect(() => {
    if (!(reading || history) || !round || !view.canReject || !enabled) {
      setPresentationPending(false);
      return;
    }
    const id = round.round_id;
    if (presented.current.has(id)) {
      setPresentationPending(false);
      return;
    }
    setPresentationPending(true);
    if (presenting.current.has(id)) return;
    presenting.current.add(id);
    const generation = life.current;
    request(C.path(bookId, id) + '/events', {
      method: 'POST',
      headers: {
        'Idempotency-Key': 'draw-presented-' + id
      },
      body: JSON.stringify({
        type: 'presented',
        candidate_ids: C.rows(round).map(row => row.id)
      })
    }).then(() => {
      if (alive(generation)) {
        presented.current.add(id);
        if (selected.current === id) setPresentationError('');
      }
    }).catch(() => {
      if (alive(generation) && selected.current === id) setPresentationError(T('阅读记录未确认，请重新读取后再评价。', 'Reading record not confirmed. Refresh before rejecting both drafts.'));
    }).finally(() => {
      if (alive(generation)) {
        presenting.current.delete(id);
        if (selected.current === id) setPresentationPending(false);
      }
    });
  }, [reading, history, round]);
  const prepare = async row => {
    if (runtime.current.blocked || pending || lock.current || !round) return;
    lock.current = true;
    setError('');
    const id = round.round_id,
      value = await load(id);
    lock.current = false;
    if (!value || runtime.current.blocked || !C.policy(value).canAdopt) return;
    if (value.current_body_version !== runtime.current.bodyVersion) {
      setError(T('正式正文版本已变化，请先重新读取正文，再确认采用。', 'The current prose has changed. Refresh it before confirming.'));
      setSyncNeeded(true);
      return;
    }
    setConfirm({
      type: 'adopt',
      roundId: id,
      row,
      payload: {
        candidate_id: row.id,
        expected_body_version: value.current_body_version,
        expected_adoption_id: value.current_adoption_id || null,
        allow_overwrite_edited_body: value.body_modified_since_adoption === true
      },
      modified: value.body_modified_since_adoption === true
    });
  };
  const send = async next => {
    if (lock.current || runtime.current.blocked || !enabled) return;
    // An exact frozen command is replayable. Never give an uncertain POST a new key.
    lock.current = true;
    setSending(true);
    saveCommand(next);
    setConfirm(null);
    const generation = life.current;
    try {
      const response = await request(C.path(bookId, next.roundId) + (next.type === 'adopt' ? '/adopt' : '/events'), {
        method: 'POST',
        headers: {
          'Idempotency-Key': next.key
        },
        body: JSON.stringify(next.payload)
      });
      if (!alive(generation)) return;
      if (next.type === 'adopt') {
        if (!response.adoption_id) throw Error('missing acknowledgement');
        saveCommand({
          ...next,
          adoptionId: response.adoption_id
        });
      } else {
        if (response?.round_id !== next.roundId || response.type !== 'reject_all') throw Error('missing rejection acknowledgement');
        if (commandRef.current?.key !== next.key) return;
        saveCommand(null);
        if (selected.current === next.roundId) {
          // A read started before the acknowledgement may still contain the open round.
          readSeq.current++;
          readFlight.current = false;
          setReadLoading(false);
          if (round?.round_id === next.roundId) applyRound({
            ...round,
            status: 'rejected'
          });
          setError('');
          returnToProse();
        }
        return;
      }
      await load(next.roundId, true);
    } catch (e) {
      if (alive(generation)) {
        if (e.status >= 400 && e.status < 500) {
          saveCommand(null);
          setError(T('请求未接受，请重新读取后再确认。', 'Request was not accepted. Refresh before confirming.'));
        } else setError(T('提交结果待确认。可重新读取，或重试原请求。', 'Submission is unconfirmed. Refresh or retry the original request.'));
      }
    } finally {
      if (alive(generation)) {
        lock.current = false;
        setSending(false);
      }
    }
  };
  const submit = () => {
    if (!confirm || runtime.current.blocked || pending || lock.current) return;
    if (confirm.type === 'adopt' && confirm.payload.expected_body_version !== runtime.current.bodyVersion) {
      setConfirm(null);
      setSyncNeeded(true);
      return;
    }
    send({
      identity,
      roundId: confirm.roundId,
      type: confirm.type,
      payload: confirm.payload,
      key: C.key()
    });
  };
  const reject = () => {
    if (!round || !view.canReject || runtime.current.blocked || pending || presentationPending || !presented.current.has(round.round_id)) return;
    setConfirm({
      type: 'reject_all',
      roundId: round.round_id,
      payload: {
        type: 'reject_all',
        candidate_ids: view.rows.map(row => row.id)
      }
    });
  };
  const open = id => {
    if (runtime.current.blocked) return;
    setReading(true);
    if (id) load(id);
  };
  const selectHistory = id => {
    if (pending || lock.current) return;
    setConfirm(null);
    setRound(null);
    load(id);
  };
  const noticeRound = items[0] || round;
  const adopted = noticeRound && ['adopted', 'ready', 'post_process_failed'].includes(noticeRound.status);
  const notice = /*#__PURE__*/React.createElement("div", {
    className: "pd-notice"
  }, /*#__PURE__*/React.createElement("span", {
    role: "status"
  }, noticeRound ? C.label(noticeRound, en) : listError ? T('抽卡记录读取失败', 'Unable to read draw records') : T('正文抽卡', 'Prose draw')), /*#__PURE__*/React.createElement("div", null, noticeRound && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn sm",
    disabled: blocked,
    onClick: () => open(noticeRound.round_id)
  }, T('查看候选', 'View drafts'))));
  const status = /*#__PURE__*/React.createElement(React.Fragment, null, error && /*#__PURE__*/React.createElement("div", {
    className: "pd-message",
    role: "alert"
  }, error), presentationError && /*#__PURE__*/React.createElement("div", {
    className: "pd-message",
    role: "alert"
  }, presentationError), round && round.status === 'post_process_failed' && /*#__PURE__*/React.createElement("div", {
    className: "pd-message",
    role: "alert"
  }, T('正文已采用，后验未完成。请返回编辑台，定稿时重试后验。', 'Draft adopted; post-processing is incomplete. Return to the editor and retry finalization.')), (error || presentationError || syncNeeded || command && !command.adoptionId && !sending) && /*#__PURE__*/React.createElement("div", {
    className: "pd-recovery"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn sm",
    disabled: readLoading || sending,
    onClick: () => selected.current ? load(selected.current) : list(true)
  }, T('重新读取轮次', 'Refresh round')), syncNeeded && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn sm",
    disabled: blocked,
    onClick: refreshBody
  }, T('重新读取正文', 'Refresh prose')), command && !command.adoptionId && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn sm",
    disabled: sending || blocked,
    onClick: () => send(command)
  }, T('重试原请求', 'Retry original request'))), bodyLoading && /*#__PURE__*/React.createElement("div", {
    className: "pd-message",
    role: "status"
  }, T('正在同步正文…', 'Syncing prose…')), readLoading && /*#__PURE__*/React.createElement("div", {
    className: "pd-message",
    role: "status"
  }, T('正在读取候选…', 'Loading drafts…')));
  const heading = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-btn sm",
    onClick: () => setReading(false)
  }, T('返回当前正文', 'Current prose')), /*#__PURE__*/React.createElement("h2", null, T('第 ' + chapterNumber + ' 章 · 候选正文', 'Chapter ' + chapterNumber + ' · Drafts')));
  const reader = isHistory => /*#__PURE__*/React.createElement(React.Fragment, null, status, (round || !isHistory) && /*#__PURE__*/React.createElement(ProseDrawReader, {
    round: round,
    history: isHistory,
    heading: isHistory ? undefined : heading,
    disabled: blocked || pending || readLoading || !!error,
    rejectDisabled: presentationPending || !round || !presented.current.has(round.round_id),
    onAdopt: prepare,
    onReject: reject
  }));
  const historyContent = enabled && history ? /*#__PURE__*/React.createElement(ProseDrawHistory, {
    items: items,
    selected: round && round.round_id,
    onSelect: selectHistory,
    loading: listLoading,
    error: listError,
    more: more,
    onMore: () => list(listError && !items.length)
  }, reader(true)) : null;
  const panels = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ConfirmDialog, {
    open: !!confirm,
    title: confirm && confirm.type === 'reject_all' ? T('两篇都不满意', 'Neither is satisfactory') : T('采用正文 ' + (confirm && confirm.row ? confirm.row.letter : ''), 'Adopt draft ' + (confirm && confirm.row ? confirm.row.letter : '')),
    message: confirm && confirm.type === 'reject_all' ? T('本轮将结束，当前正文保持不变。已生成的两篇正文仍分别计费，可在抽卡记录中查看。', 'This closes the round and preserves current prose. Generated drafts remain charged and available in history.') : T('采用后将替换当前正文。当前正文及已保存的修改保留在历史版本中；尚未保存的修改须先保存。', 'Adopting replaces the current prose. Its saved edits remain in revision history. Save any unsaved edits first.'),
    confirmLabel: T('确认', 'Confirm'),
    cancelLabel: T('取消', 'Cancel'),
    confirmDisabled: blocked || pending,
    onClose: () => setConfirm(null),
    onConfirm: submit,
    tone: "danger"
  }));
  return {
    busy: pending,
    reading,
    historyContent,
    notice: enabled && !reading && !adopted && (round || items.length || listError) ? notice : null,
    content: enabled && reading ? /*#__PURE__*/React.createElement("section", {
      className: "pd-workspace"
    }, reader(false)) : null,
    panels: enabled ? panels : null
  };
}
window.useProseDrawSelection = useProseDrawSelection;
}
