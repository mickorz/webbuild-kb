{
/* Quotes are cached only for this account and task dialog, not for prose inputs. */
function useProseTaskQuote({
  open,
  accountId,
  target,
  writerType,
  draw,
  prefetchDraw = false
}) {
  const C = window.ProseDrawFlowCore,
    service = window.LF_BOOK_DATA_VOLUME;
  const identity = C.inputKey(accountId, target),
    mode = draw ? 'draw' : writerType === 'muti' ? 'muti' : 'single';
  const store = React.useRef(null),
    [revision, setRevision] = React.useState(0);
  if (!store.current || store.current.identity !== identity || !open) store.current = {
    identity,
    entries: new Map()
  };
  const cache = store.current;
  const valid = entry => entry && (!entry.expiresAt || Date.now() < entry.expiresAt);
  const current = valid(cache.entries.get(mode)) ? cache.entries.get(mode) : null;
  const drawEntry = valid(cache.entries.get('draw')) ? cache.entries.get('draw') : null;
  React.useEffect(() => {
    if (!open || !target?.bookId || !accountId) return;
    let alive = true;
    const owned = () => alive && store.current === cache && String(window.LF_PORTAL_STATE?.me?.id || '') === String(accountId);
    const timers = [];
    // The optional draw read shares the same entry as an explicit draw selection.
    // Its error must never replace the selected ordinary mode's quote or status.
    const modes = prefetchDraw && mode !== 'draw' ? [mode, 'draw'] : [mode];
    for (const quoteMode of modes) {
      const drawing = quoteMode === 'draw';
      let entry = cache.entries.get(quoteMode);
      if (!valid(entry)) {
        entry = {
          pending: true,
          error: '',
          result: null,
          expiresAt: null
        };
        cache.entries.set(quoteMode, entry);
        entry.promise = (async () => {
          try {
            const execution = target.executionMode || 'character_state';
            const value = await service.requestQuote(target.bookId, {
              task_type: 'chapter_draft',
              execution_mode: execution,
              writer_type: drawing ? 'single' : quoteMode,
              ...(execution === 'character_state' ? {
                chapter_chain: {
                  kind: 'prose',
                  step: 0
                }
              } : {}),
              ...(drawing ? {
                prose_draw: true
              } : {})
            });
            if (store.current !== cache || cache.entries.get(quoteMode) !== entry || String(window.LF_PORTAL_STATE?.me?.id || '') !== String(accountId)) return;
            const charge = service.chargeView(value),
              amount = Number(charge.owedMillis);
            const known = !charge.unknown && !charge.unsupported && charge.owedMillis != null && Number.isSafeInteger(amount) && amount >= 0;
            const promotion = drawing ? value.proseDrawPromotion : null;
            let expiry = value.expiry ? Date.parse(value.expiry) : null;
            if (value.expiry && (!Number.isFinite(expiry) || expiry <= Date.now())) throw Error('quote expired');
            if (promotion) expiry = Math.min(expiry || Infinity, Date.parse(promotion.resetsAt));
            if (expiry && expiry <= Date.now()) throw Error('quote expired');
            const quote = drawing && known && value.taskType === 'prose_draw_writer' ? C.quote({
              quote_token: value.quoteToken,
              total_credits_millis: amount,
              expires_at: expiry ? new Date(expiry).toISOString() : null
            }) : null;
            if (drawing && !quote) throw Error('quote');
            entry.result = {
              text: known ? service.formatCreditsMillis(amount) : '—',
              quote: quote ? {
                ...quote,
                inputKey: identity
              } : null,
              promotion
            };
            entry.expiresAt = expiry;
          } catch (error) {
            entry.result = null;
            entry.expiresAt = null;
            entry.error = C.errorText(error, window.CLANG === 'en');
          } finally {
            entry.pending = false;
          }
        })();
      }
    }
    // Cached opportunities still expire while a preference write temporarily
    // pauses prefetching, or while another mode is selected.
    for (const [quoteMode, entry] of cache.entries) {
      if (entry.pending) entry.promise.then(() => {
        if (owned()) setRevision(value => value + 1);
      });else if (entry.expiresAt && entry.expiresAt > Date.now()) timers.push(setTimeout(() => {
        if (owned() && cache.entries.get(quoteMode) === entry) {
          cache.entries.delete(quoteMode);
          setRevision(value => value + 1);
        }
      }, Math.min(entry.expiresAt - Date.now(), 2147483647)));
    }
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [open, identity, mode, prefetchDraw, revision]);
  const refresh = () => {
    cache.entries.clear();
    setRevision(value => value + 1);
  };
  return {
    pending: !!open && (!current || current.pending),
    text: current?.result?.text || '—',
    quote: current?.result?.quote || null,
    error: current?.error || '',
    promotion: drawEntry?.result?.quote ? drawEntry.result.promotion : null,
    refresh
  };
}
window.useProseTaskQuote = useProseTaskQuote;
function ProseMotionNumber({
  value
}) {
  const current = String(value);
  const last = React.useRef(current);
  const [transition, setTransition] = React.useState(null);
  const [reduced, setReduced] = React.useState(() => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  React.useEffect(() => {
    const query = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const change = () => setReduced(query.matches);
    query.addEventListener?.('change', change);
    return () => query.removeEventListener?.('change', change);
  }, []);
  React.useLayoutEffect(() => {
    const previous = last.current;
    last.current = current;
    if (reduced || previous === current || !Number.isFinite(Number(previous)) || !Number.isFinite(Number(current))) {
      setTransition(null);
      return;
    }
    setTransition({
      previous,
      direction: Number(current) > Number(previous) ? 'up' : 'down'
    });
    const timer = setTimeout(() => setTransition(null), 460);
    return () => clearTimeout(timer);
  }, [current, reduced]);
  const active = transition && !reduced;
  return /*#__PURE__*/React.createElement("span", {
    className: 'prose-motion-number' + (active ? ' moving ' + transition.direction : ''),
    style: {
      minWidth: Math.max(current.length, active ? transition.previous.length : 0) + 'ch'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "prose-visually-hidden"
  }, current), /*#__PURE__*/React.createElement("span", {
    className: "prose-motion-stage",
    "aria-hidden": "true"
  }, active && /*#__PURE__*/React.createElement("span", {
    key: 'old-' + current,
    className: "prose-motion-old"
  }, transition.previous), /*#__PURE__*/React.createElement("span", {
    key: current,
    className: "prose-motion-current"
  }, current)));
}
window.ProseMotionNumber = ProseMotionNumber;
}
