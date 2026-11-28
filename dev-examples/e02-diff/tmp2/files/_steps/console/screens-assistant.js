{
/* ===== Global page Assistant ===== */
(function () {
  const {
    useEffect,
    useLayoutEffect,
    useRef,
    useState
  } = React;
  const AssistantStreamCore = window.AssistantStreamCore;
  const Action = window.AssistantActionCore;
  const TaskEvents = window.AssistantTaskEventsCore;
  const Composer = window.AssistantComposerCore;
  const Page = window.AssistantSessionPageCore;
  const Receipt = window.AssistantReceiptCore;
  const Examples = window.AssistantExamplesCore;
  const SessionOps = window.AssistantSessionOps;
  const Checkpoint = window.AssistantCheckpointCore || {
    versionOf: value => (value?.session || value)?.current_version_id,
    compatibleVersion: (version, value) => version === undefined || value?.current_version_id === version
  };
  const AssistantWindow = window.AssistantWindow;
  const ActionCard = window.AssistantActionCard;
  const AssistantThread = window.AssistantThread;
  function assistantCopy(key, values) {
    return Action.interpolate(TC(key), values);
  }
  function newInvocationKey() {
    if (!window.crypto || typeof window.crypto.randomUUID !== "function") {
      throw new Error("Secure browser randomness is unavailable");
    }
    return window.crypto.randomUUID();
  }
  function AssistantDrawer({
    open,
    book,
    pageContext,
    toast,
    onClose,
    onActionComplete,
    onNavigate,
    onDockLayoutChange,
    accountId,
    draftRequest,
    onDraftRequestConsumed
  }) {
    const bookId = book && book.id;
    const currentBookRef = useRef(bookId);
    currentBookRef.current = bookId;
    const accountIdRef = useRef(accountId);
    const storageKey = Composer.sessionStorageKey(accountId, "lf_assistant_session_global");
    const [capability, setCapability] = useState("loading");
    const [session, setSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const assistantName = window.AssistantPersonalizationSync.useAssistantName({
      accountId,
      open,
      messages
    });
    const memoryTasks = window.AssistantMemoryStatus.useMemoryTasks({
      accountId,
      sessionId: session?.id,
      open,
      messages
    });
    const [actions, setActions] = useState([]);
    const initialComposerRef = useRef(null);
    if (!initialComposerRef.current) initialComposerRef.current = Composer.readState(sessionStorage, accountId);
    const [input, setInput] = useState(() => !initialComposerRef.current.pendingSend && window.AssistantInlineCore ? window.AssistantInlineCore.migrate(initialComposerRef.current.draft, initialComposerRef.current.citations) : initialComposerRef.current.draft);
    const [citations, setCitations] = useState(() => initialComposerRef.current.citations || []);
    const citationsRef = useRef(citations);
    citationsRef.current = citations;
    const [uploadItems, setUploadItems] = useState([]);
    const [uploadNotice, setUploadNotice] = useState("");
    const [fileDrag, setFileDrag] = useState(false);
    const [referenceState, setReferenceState] = useState({
      pending: 0,
      epoch: 0
    });
    const draftContextRef = useRef(initialComposerRef.current.draftContext || null);
    const inputValueRef = useRef(input);
    inputValueRef.current = input;
    const [sending, setSending] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
    const [resetError, setResetError] = useState("");
    const assistantWindow = AssistantWindow.useAssistantWindow(open);
    const {
      mode,
      dockWidth,
      windowStyle,
      dockPreview,
      dockPreviewStyle,
      dragging,
      resizing
    } = assistantWindow;
    const [executingActionId, setExecutingActionId] = useState(null);
    const executing = executingActionId != null;
    const [error, setError] = useState("");
    const [bodyActivity, setBodyActivity] = useState({
      loading: false,
      undo: false
    });
    const [syncError, setSyncError] = useState(false);
    const [messagePage, setMessagePage] = useState(() => Page.emptyPage());
    const [pageStatus, setPageStatus] = useState({
      loading: false,
      error: false
    });
    const remoteRunning = Action.isSessionRunning(session);
    const welcomeReveal = window.useAssistantWelcomeReveal({
      messages,
      accountId,
      open,
      interrupted: !!input.trim() || sending || executing || remoteRunning
    });
    const bodyActivityRef = useRef(new Set());
    const bodyUndoBusyRef = useRef(false);
    const threadRef = useRef(null);
    const messagesRef = useRef([]);
    const messagePageRef = useRef(Page.emptyPage());
    const pageStatusRef = useRef({
      loading: false,
      error: false
    });
    const pageRequestRef = useRef(0);
    const threadScrollRef = useRef(null);
    const preserveScrollRef = useRef(null);
    const inputRef = useRef(null);
    const resetCancelRef = useRef(null);
    const previousFocusRef = useRef(null);
    const abortRef = useRef(null);
    const streamLockRef = useRef(null);
    if (!streamLockRef.current) streamLockRef.current = Composer.createOwnedStream(AbortController);
    const streamLock = streamLockRef.current;
    const loadSequenceRef = useRef(0);
    const renderSequence = loadSequenceRef.current;
    const pendingSendRef = useRef(initialComposerRef.current.pendingSend);
    const persistComposerSnapshot = () => {
      if (!inputValueRef.current && !pendingSendRef.current) draftContextRef.current = null;
      Composer.writeState(sessionStorage, accountIdRef.current, {
        draft: inputValueRef.current,
        draftContext: draftContextRef.current,
        pendingSend: pendingSendRef.current,
        citations: citationsRef.current
      });
    };
    const applyComposerState = next => {
      pendingSendRef.current = next && next.pendingSend ? next.pendingSend : null;
      const rawDraft = next && typeof next.draft === "string" ? next.draft : "";
      const draft = !next?.pendingSend && window.AssistantInlineCore ? window.AssistantInlineCore.migrate(rawDraft, next?.citations || citationsRef.current) : rawDraft;
      inputValueRef.current = draft;
      setInput(draft);
      if (next && Object.prototype.hasOwnProperty.call(next, "citations")) {
        const files = Composer.citationFilesOf(next.citations);
        citationsRef.current = files;
        setCitations(files);
      }
      persistComposerSnapshot();
    };
    const replaceMessages = next => {
      const value = typeof next === "function" ? next(messagesRef.current) : next;
      messagesRef.current = Array.isArray(value) ? value : [];
      setMessages(messagesRef.current);
    };
    const reconcileComposerWithPayload = (payload, expectedSequence) => {
      if (expectedSequence != null && expectedSequence !== loadSequenceRef.current) return Promise.resolve();
      const stored = Composer.readState(sessionStorage, accountIdRef.current);
      const sessionValue = Action.sessionValue(payload);
      const sessionId = sessionValue && sessionValue.id;
      const versionId = Checkpoint.versionOf(sessionRef.current);
      const messages = messagesRef.current.length ? messagesRef.current : Action.messagesValue(payload) || [];
      const reconciled = Composer.reconcile({
        draft: inputValueRef.current,
        pendingSend: pendingSendRef.current || stored.pendingSend,
        messages,
        sessionId,
        ...(versionId !== undefined ? {
          expectedVersionId: versionId
        } : {}),
        citations: citationsRef.current
      });
      if (!reconciled.pendingSend || reconciled.received || !sessionId || !window.LF_API || typeof window.LF_API.assistantMessageReceipt !== "function") {
        applyComposerState(reconciled);
        return Promise.resolve();
      }
      applyComposerState(reconciled);
      const requestKey = reconciled.pendingSend.key;
      return window.LF_API.assistantMessageReceipt(sessionId, requestKey).then(receipt => {
        if (expectedSequence != null && expectedSequence !== loadSequenceRef.current) return;
        if (!sessionRef.current || sessionRef.current.id !== sessionId || Checkpoint.versionOf(sessionRef.current) !== versionId || Checkpoint.versionOf(receipt) !== versionId || !pendingSendRef.current || pendingSendRef.current.key !== requestKey) return;
        applyComposerState(Composer.reconcileWithReceipt({
          draft: inputValueRef.current,
          pendingSend: pendingSendRef.current,
          messages: messagesRef.current,
          sessionId,
          ...(versionId !== undefined ? {
            expectedVersionId: versionId
          } : {}),
          citations: citationsRef.current
        }, receipt));
      }, () => {});
    };
    const sessionRef = useRef(session);
    const actionsRef = useRef(actions);
    actionsRef.current = actions;
    const busyRef = useRef({
      sending: false,
      executing: false
    });
    const navigationRunsRef = useRef(new Set());
    const taskPumpRef = useRef(null);
    const replyWatchRef = useRef(null);
    const checkpointRef = useRef(null);
    const onNavigateRef = useRef(onNavigate);
    onNavigateRef.current = onNavigate;
    const navigationPageRef = useRef(null);
    navigationPageRef.current = JSON.stringify([bookId, pageContext && pageContext.surface, pageContext && pageContext.chapter_number, pageContext && pageContext.resource_key]);
    const onActionCompleteRef = useRef(onActionComplete);
    onActionCompleteRef.current = onActionComplete;
    useLayoutEffect(() => {
      if (onDockLayoutChange) onDockLayoutChange(open && mode === "docked" ? dockWidth : 0);
    }, [open, mode, dockWidth, onDockLayoutChange]);
    useEffect(() => () => {
      if (onDockLayoutChange) onDockLayoutChange(0);
    }, [onDockLayoutChange]);
    const applySession = (payload, expectedSequence, streamingId, mode, expectedVersionId) => {
      if (expectedSequence != null && expectedSequence !== loadSequenceRef.current) return null;
      if (!Checkpoint.compatibleVersion(expectedVersionId, sessionRef.current)) return null;
      const value = Action.sessionValue(payload);
      const sessionChanged = !!(value && value.id && sessionRef.current && sessionRef.current.id && value.id !== sessionRef.current.id);
      const versionChanged = value?.id && sessionRef.current?.id === value.id && Checkpoint.versionOf(value) !== Checkpoint.versionOf(sessionRef.current);
      const resetSession = mode === "reset" || mode === "version" || sessionChanged || versionChanged;
      if (value && value.id) {
        if (value.book_id !== null) throw new Error("Assistant session scope mismatch");
        sessionRef.current = value;
        setSession(value);
        Composer.writeSessionId(sessionStorage, accountIdRef.current, value.id, "lf_assistant_session_global");
      }
      const nextMessages = Action.messagesValue(payload);
      const finalMessage = Action.assistantMessage(payload);
      if (resetSession) {
        pageRequestRef.current += 1;
        pageStatusRef.current = {
          loading: false,
          error: false
        };
        setPageStatus(pageStatusRef.current);
        preserveScrollRef.current = null;
        replaceMessages(AssistantStreamCore.reconcileMessages([], nextMessages || [], finalMessage, streamingId));
        const resetActions = Action.actionListValue(payload) || [];
        actionsRef.current = resetActions;
        setActions(resetActions);
        const page = Page.pageFromPayload(payload);
        messagePageRef.current = page;
        setMessagePage(page);
        return value;
      }
      if (nextMessages || finalMessage) {
        const previousMessages = messagesRef.current;
        const mergedMessages = Page.mergeSnapshotMessages(messagesRef.current, nextMessages || [], finalMessage, streamingId, AssistantStreamCore.reconcileMessages);
        const merged = window.AssistantUploadCore ? window.AssistantUploadCore.retainCitedMessages(previousMessages, mergedMessages) : mergedMessages;
        replaceMessages(merged);
        const page = Page.mergeSnapshotPage(messagePageRef.current, Page.pageFromPayload(payload), previousMessages, nextMessages || []);
        messagePageRef.current = page;
        setMessagePage(page);
      }
      const nextActions = Action.actionListValue(payload);
      if (nextActions) {
        const mergedActions = Page.mergeSnapshotActions(actionsRef.current, nextActions, Action);
        actionsRef.current = mergedActions;
        setActions(mergedActions);
      }
      return value;
    };
    useEffect(() => {
      sessionRef.current = session;
    }, [session]);
    useEffect(() => {
      busyRef.current = {
        sending,
        executing
      };
    }, [sending, executing]);
    const appendAssistantProgress = (streamingId, progress) => {
      if (!progress) return;
      replaceMessages(current => {
        const index = current.findIndex(message => message.id === streamingId || message.stream_id === streamingId);
        const existing = index < 0 ? {
          id: streamingId,
          stream_id: streamingId,
          role: "assistant",
          content: "",
          stream_segments: [],
          presentation_status: "running"
        } : current[index];
        const updated = AssistantStreamCore.reduceMessage(existing, progress);
        if (updated === existing) return current;
        if (index < 0) return current.concat([updated]);
        const next = current.slice();
        next[index] = updated;
        return next;
      });
    };
    const bindAssistantPresentation = (streamingId, snapshotMessage) => {
      replaceMessages(current => AssistantStreamCore.bindPresentation(current, streamingId, snapshotMessage));
    };
    const createStreamConsumer = (streamingId, extra) => {
      const expectedSequence = loadSequenceRef.current;
      let expectedVersionId = Checkpoint.versionOf(sessionRef.current);
      const originPage = navigationPageRef.current;
      const navigationSessionId = sessionRef.current && sessionRef.current.id;
      return AssistantStreamCore.createAssistantStreamConsumer(Object.assign({
        streamingId,
        navigationRuns: navigationRunsRef.current,
        appendProgress: appendAssistantProgress,
        bindPresentation: bindAssistantPresentation,
        onControlEvent: event => checkpointRef.current?.event?.(event),
        applySession(data, id, mode) {
          const returnedSession = Action.sessionValue(data);
          if (returnedSession && returnedSession.book_id !== null) throw new Error("Assistant session scope mismatch");
          const result = applySession(data, expectedSequence, id, mode, expectedVersionId);
          if (result?.id) expectedVersionId = Checkpoint.versionOf(result);
          return result;
        },
        actionFrom: Action.actionValue,
        protectionFrom: Action.normalizeProtectionAction,
        onNavigationStart: onNavigateRef.current && navigationSessionId ? (callId, lifecycle) => window.AssistantNavigationClient.run({
          isCurrent: lifecycle.isCurrent,
          canNavigate: () => originPage === navigationPageRef.current,
          read: () => window.LF_API.assistantNavigationRequest(navigationSessionId, callId),
          acknowledge: receipt => window.LF_API.acknowledgeAssistantNavigation(navigationSessionId, callId, receipt),
          navigate: target => onNavigateRef.current(Object.assign({}, target, {
            isCurrent: lifecycle.isCurrent
          }))
        }) : null
      }, extra || {}, {
        isOwned: () => expectedSequence === loadSequenceRef.current && Checkpoint.compatibleVersion(expectedVersionId, sessionRef.current) && !(extra && extra.isCurrent && !extra.isCurrent()),
        isCurrent: () => expectedSequence === loadSequenceRef.current && Checkpoint.compatibleVersion(expectedVersionId, sessionRef.current) && !(abortRef.current && abortRef.current.signal.aborted) && !(extra && extra.isCurrent && !extra.isCurrent())
      }));
    };
    const beginStream = () => {
      const owned = streamLock.begin();
      abortRef.current = owned.controller;
      return owned;
    };
    const releaseStream = (owned, onRelease) => {
      if (abortRef.current === (owned && owned.controller)) abortRef.current = null;
      streamLock.release(owned, onRelease);
    };
    const stopReply = event => {
      if (event && typeof event.preventDefault === "function") event.preventDefault();
      if (checkpointRef.current?.enabled === true || checkpointRef.current?.stopping) {
        void checkpointRef.current.stop?.();
        return;
      }
      if (abortRef.current) streamLock.abort();else if (taskPumpRef.current && taskPumpRef.current.stopCurrent) {
        taskPumpRef.current.stopCurrent();
        setError(TC("asst_stop_note"));
      }
    };
    const closeAssistant = () => {
      persistComposerSnapshot();
      loadSequenceRef.current += 1;
      streamLock.abort();
      if (taskPumpRef.current) taskPumpRef.current.stop();
      if (replyWatchRef.current) replyWatchRef.current.stop();
      onClose();
    };
    const createSession = async expectedSequence => {
      const payload = await SessionOps.withWelcome(await window.LF_API.createAssistantSession(), window.LF_API, () => expectedSequence === loadSequenceRef.current);
      return applySession(payload, expectedSequence);
    };
    const initialize = async expectedSequence => {
      setError("");
      setCapability("loading");
      try {
        const capabilities = await window.LF_API.assistantCapabilities();
        if (expectedSequence !== loadSequenceRef.current) return;
        const nextCapability = Action.capabilityState(capabilities);
        if (nextCapability !== "configured") {
          setCapability(nextCapability);
          return;
        }
        const savedId = Composer.readSessionId(sessionStorage, accountIdRef.current, "lf_assistant_session_global");
        if (savedId) {
          try {
            const payload = await SessionOps.withWelcome(await window.LF_API.assistantSession(savedId), window.LF_API, () => expectedSequence === loadSequenceRef.current);
            if (expectedSequence !== loadSequenceRef.current) return;
            const savedSession = Action.sessionValue(payload);
            if (!savedSession || savedSession.id !== savedId) throw new Error("Assistant session scope mismatch");
            if (savedSession.book_id === null) {
              applySession(payload, expectedSequence);
              reconcileComposerWithPayload(payload, expectedSequence);
              setCapability("configured");
              return;
            }
            if (typeof savedSession.book_id !== "string" || !savedSession.book_id) {
              throw new Error("Assistant session scope mismatch");
            }
          } catch (loadError) {
            if (expectedSequence !== loadSequenceRef.current) return;
            if (!Action.canDiscardSession(loadError)) throw loadError;
          }
          Composer.writeSessionId(sessionStorage, accountIdRef.current, null, "lf_assistant_session_global");
          try {
            sessionStorage.removeItem("lf_assistant_session_global");
          } catch (storageError) {}
        }
        const created = await createSession(expectedSequence);
        if (created) {
          reconcileComposerWithPayload({
            session: created,
            messages: created.messages
          }, expectedSequence);
          setCapability("configured");
        }
      } catch (loadError) {
        if (expectedSequence !== loadSequenceRef.current) return;
        setCapability("unavailable");
        setError(Action.messageText(loadError, assistantCopy));
      }
    };
    useEffect(() => {
      const sequence = ++loadSequenceRef.current;
      setSession(null);
      setMessages([]);
      messagesRef.current = [];
      setActions([]);
      actionsRef.current = [];
      messagePageRef.current = Page.emptyPage();
      setMessagePage(Page.emptyPage());
      pageStatusRef.current = {
        loading: false,
        error: false
      };
      setPageStatus({
        loading: false,
        error: false
      });
      pageRequestRef.current += 1;
      setSending(false);
      setResetting(false);
      setResetConfirmOpen(false);
      setResetError("");
      setExecutingActionId(null);
      setError("");
      setSyncError(false);
      busyRef.current = {
        sending: false,
        executing: false
      };
      bodyActivityRef.current.clear();
      bodyUndoBusyRef.current = false;
      setBodyActivity({
        loading: false,
        undo: false
      });
      navigationRunsRef.current = new Set();
      if (open) initialize(sequence);else setCapability("idle");
      return () => {
        persistComposerSnapshot();
        streamLock.abort();
        if (loadSequenceRef.current === sequence) loadSequenceRef.current += 1;
      };
    }, [open]);
    const uploadBundleRef = useRef(null);
    function uploadBundle() {
      if (uploadBundleRef.current) return uploadBundleRef.current;
      if (!window.AssistantUpload || typeof window.AssistantUpload.installDrawerUpload !== "function") return null;
      uploadBundleRef.current = window.AssistantUpload.installDrawerUpload({
        accountId: () => accountIdRef.current,
        newKey: () => "workspace-" + newInvocationKey(),
        lang: () => window.CLANG === "en" ? "en" : "zh",
        citations: () => citationsRef.current,
        setItems: setUploadItems,
        setNotice: setUploadNotice,
        setCitations: files => {
          const next = Composer.citationFilesOf(files);
          if (pendingSendRef.current && !Composer.sameWorkspaceFiles(pendingSendRef.current.workspaceFiles, next)) {
            pendingSendRef.current = null;
          }
          inputRef.current?.insertReferences?.(next);
          citationsRef.current = next;
          setCitations(next);
          persistComposerSnapshot();
        },
        download: item => {
          const core = window.AssistantWorkspaceCore;
          const query = core && typeof core.downloadQuery === "function" ? core.downloadQuery(item) : {
            path: item.path,
            version: item.version
          };
          if (!query) return Promise.reject(new Error("Invalid file"));
          return window.LF_API.assistantWorkspaceDownload(query);
        },
        onSaved: () => window.dispatchEvent(new CustomEvent("lf:workspace-files-changed"))
      });
      return uploadBundleRef.current;
    }
    useEffect(() => {
      const bundle = uploadBundle();
      if (!bundle) return undefined;
      return bundle.drop.subscribe(setFileDrag);
    }, []);
    useEffect(() => {
      if (Object.is(accountIdRef.current, accountId)) return;
      persistComposerSnapshot();
      accountIdRef.current = accountId;
      streamLock.abort();
      applyComposerState(Composer.readState(sessionStorage, accountId));
      if (uploadBundleRef.current) {
        uploadBundleRef.current.controller.bindAccount(accountId);
        setUploadItems(uploadBundleRef.current.controller.snapshot());
      }
      setUploadNotice("");
      setSending(false);
      setExecutingActionId(null);
      busyRef.current = {
        sending: false,
        executing: false
      };
      const sequence = ++loadSequenceRef.current;
      setSession(null);
      setMessages([]);
      messagesRef.current = [];
      setActions([]);
      actionsRef.current = [];
      messagePageRef.current = Page.emptyPage();
      setMessagePage(Page.emptyPage());
      pageStatusRef.current = {
        loading: false,
        error: false
      };
      setPageStatus({
        loading: false,
        error: false
      });
      pageRequestRef.current += 1;
      setError("");
      if (open) initialize(sequence);
    }, [accountId]);
    const taskProgress = window.useAssistantTaskProgress({
      open: open && capability === "configured",
      sessionId: session?.id,
      branchId: session?.current_version_id,
      accountId,
      actionsRef,
      onDrawTerminal: () => taskPumpRef.current?.requestDelivery()
    });
    useEffect(() => {
      if (!open || capability !== "configured" || !session || !session.id) {
        if (taskPumpRef.current) {
          taskPumpRef.current.stop();
          taskPumpRef.current = null;
        }
        return undefined;
      }
      const sessionId = session.id;
      let active = true;
      const pump = TaskEvents.createAssistantTaskEventPump({
        listTaskEvents: (id, options) => window.LF_API.assistantTaskEvents(id, options),
        completeTask: (id, taskId, handlers, options) => window.LF_API.streamAssistantTaskCompletion(id, taskId, handlers, options),
        isBusy: () => bodyUndoBusyRef.current || Action.isSessionRunning(sessionRef.current) || checkpointRef.current && !checkpointRef.current.canSend || busyRef.current.sending || busyRef.current.executing || actionsRef.current.some(Action.isActionBlocking),
        createConsumer: (streamingId, item) => createStreamConsumer(streamingId, {
          isCurrent: () => active,
          targetBookId: item.book_link_id
        }),
        onBusy: busy => {
          if (!active) return;
          busyRef.current.sending = busy;
          setSending(busy);
        },
        onError: taskError => {
          if (active) setError(Action.messageText(taskError, assistantCopy));
        },
        dropStreamingMessage: streamingId => {
          if (!active) return;
          replaceMessages(current => current.filter(message => message.id !== streamingId && message.stream_id !== streamingId));
        }
      });
      const handle = pump.start(sessionId);
      const onTerminal = () => handle.requestDelivery();
      window.addEventListener("lf:task-terminal", onTerminal);
      const stopPump = () => {
        active = false;
        window.removeEventListener("lf:task-terminal", onTerminal);
        handle.stop();
        if (taskPumpRef.current === control) taskPumpRef.current = null;
      };
      const control = {
        stop: stopPump,
        stopCurrent: handle.stopCurrent,
        requestDelivery: handle.requestDelivery
      };
      taskPumpRef.current = control;
      return stopPump;
    }, [open, capability, session && session.id, session?.current_version_id]);
    useEffect(() => {
      if (!open || capability !== "configured" || !remoteRunning || sending || executing) return undefined;
      const sequence = loadSequenceRef.current;
      const versionId = Checkpoint.versionOf(session);
      const handle = AssistantStreamCore.watchSessionReply({
        sessionId: session.id,
        readSession: (id, options) => window.LF_API.assistantSession(id, options),
        isCurrent: () => sequence === loadSequenceRef.current && Checkpoint.compatibleVersion(versionId, sessionRef.current) && !busyRef.current.sending && !busyRef.current.executing,
        onSnapshot(payload) {
          applySession(payload, sequence, null, null, versionId);
          reconcileComposerWithPayload(payload, sequence);
          setSyncError(false);
        },
        onError() {
          setSyncError(true);
        }
      });
      replyWatchRef.current = handle;
      return () => {
        handle.stop();
        if (replyWatchRef.current === handle) replyWatchRef.current = null;
      };
    }, [open, capability, session && session.id, session?.current_version_id, remoteRunning, sending, executing]);
    useEffect(() => {
      if (!open) return undefined;
      previousFocusRef.current = document.activeElement;
      return () => {
        const previousFocus = previousFocusRef.current;
        previousFocusRef.current = null;
        if (previousFocus && typeof previousFocus.focus === "function") {
          window.setTimeout(() => previousFocus.focus(), 0);
        }
      };
    }, [open]);
    useEffect(() => {
      if (!open) return undefined;
      const closeOnEscape = event => {
        if (event.key !== "Escape") return;
        if (document.querySelector(".lf-err-scrim, .c-confirm-scrim")) return;
        if (resetConfirmOpen && !resetting) {
          setResetConfirmOpen(false);
          setResetError("");
          return;
        }
        closeAssistant();
      };
      document.addEventListener("keydown", closeOnEscape);
      return () => {
        document.removeEventListener("keydown", closeOnEscape);
      };
    }, [open, resetConfirmOpen, resetting, sending, executing]);
    useLayoutEffect(() => {
      const preserve = preserveScrollRef.current;
      const thread = threadRef.current;
      if (!preserve || !thread) return;
      thread.scrollTop = thread.scrollHeight - preserve.height + preserve.top;
      threadScrollRef.current?.pause();
      preserveScrollRef.current = null;
    }, [messages.length, messagePage.before_sequence]);
    useLayoutEffect(() => {
      if (!open || capability !== "configured" || !threadRef.current) return;
      const controller = window.AssistantThreadScroll.create(threadRef.current);
      threadScrollRef.current = controller;
      return () => {
        controller.destroy();
        threadScrollRef.current = null;
      };
    }, [open, capability, accountId, session && session.id]);
    const refresh = async (isCurrent, streamingId, expectedVersionId, targetVersionId) => {
      const current = sessionRef.current;
      if (!current) return;
      const sequence = loadSequenceRef.current;
      const versionId = expectedVersionId === undefined ? Checkpoint.versionOf(current) : expectedVersionId;
      const payload = await window.LF_API.assistantSession(current.id);
      if (isCurrent && !isCurrent()) return null;
      if (targetVersionId !== undefined && Checkpoint.versionOf(payload) !== targetVersionId) return null;
      return applySession(payload, sequence, streamingId, null, versionId);
    };
    const checkpoint = window.AssistantCheckpointControl ? window.AssistantCheckpointControl.useControl({
      open: open && capability === "configured",
      accountId,
      session,
      sessionRef,
      actions,
      api: window.LF_API,
      newKey: newInvocationKey,
      refreshSession: (expected, target) => refresh(null, null, expected, target).catch(() => null)
    }) : {
      enabled: false,
      canSend: true,
      canEdit: false,
      stopping: false
    };
    checkpointRef.current = checkpoint;
    const {
      resumeCheckpoint,
      editMessage,
      restoreCheckpointInput
    } = window.AssistantCheckpointOps?.create({
      sessionRef,
      checkpoint,
      busyRef,
      bodyUndoBusyRef,
      resetting,
      resetConfirmOpen,
      loadSequenceRef,
      messagesRef,
      newInvocationKey,
      createStreamConsumer,
      beginStream,
      streamLock,
      releaseStream,
      setSending,
      setError,
      refresh,
      Composer,
      Action,
      assistantCopy,
      api: window.LF_API,
      inputValueRef,
      inputRef,
      applyComposerState
    }) || {};
    const loadEarlier = async () => {
      const current = sessionRef.current;
      if (!Page.canLoadEarlier(messagePageRef.current, {
        loading: pageStatusRef.current.loading,
        resetting
      })) return;
      const query = Page.pageQuery(messagePageRef.current.before_sequence);
      if (!current || !query || !window.LF_API || typeof window.LF_API.assistantSessionMessages !== "function") return;
      const sequence = loadSequenceRef.current;
      const versionId = Checkpoint.versionOf(current);
      const requestId = ++pageRequestRef.current;
      pageStatusRef.current = {
        loading: true,
        error: false
      };
      setPageStatus({
        loading: true,
        error: false
      });
      threadScrollRef.current?.pause();
      try {
        const payload = await window.LF_API.assistantSessionMessages(current.id, query);
        if (sequence !== loadSequenceRef.current || requestId !== pageRequestRef.current || Checkpoint.versionOf(sessionRef.current) !== versionId) return;
        if (!Page.isCurrentSessionPage(payload, current.id)) throw new Error("Assistant session scope mismatch");
        if (Checkpoint.versionOf(payload) !== versionId) {
          await refresh();
          return;
        }
        const thread = threadRef.current;
        preserveScrollRef.current = thread ? {
          height: thread.scrollHeight,
          top: thread.scrollTop
        } : null;
        replaceMessages(Page.mergeOlderMessages(messagesRef.current, Action.messagesValue(payload) || []));
        const mergedActions = Page.mergeOlderActions(actionsRef.current, Action.actionListValue(payload) || []);
        actionsRef.current = mergedActions;
        setActions(mergedActions);
        const nextPage = messagePageRef.current.before_sequence === query.before_sequence ? Page.pageFromPayload(payload) : messagePageRef.current;
        messagePageRef.current = nextPage;
        setMessagePage(nextPage);
        pageStatusRef.current = {
          loading: false,
          error: false
        };
        setPageStatus({
          loading: false,
          error: false
        });
      } catch (ignored) {
        if (sequence !== loadSequenceRef.current || requestId !== pageRequestRef.current) return;
        pageStatusRef.current = {
          loading: false,
          error: true
        };
        setPageStatus({
          loading: false,
          error: true
        });
      }
    };
    const viewResult = async (action, target) => {
      if (action?.version_current === false) return;
      const sequence = loadSequenceRef.current;
      const resolved = target || Receipt.viewTarget(action, {
        arguments: Action.actionArguments(action),
        operation: Action.actionOperation(action),
        cite: window.AssistantCiteCore || {}
      });
      const signal = Receipt.navigationSignal(resolved);
      if (!signal || !onNavigateRef.current) return;
      try {
        const targetBookId = window.AssistantCreationCore?.targetBookId(action) || action.book_link_id || null;
        await onNavigateRef.current(Object.assign({}, signal, {
          book_id: targetBookId
        }));
      } catch (navigationError) {
        if (sequence === loadSequenceRef.current) setError(Action.messageText(navigationError, assistantCopy));
      }
    };
    const applyExample = text => {
      const locked = Action.isSessionRunning(sessionRef.current) || bodyUndoBusyRef.current || busyRef.current.sending || busyRef.current.executing || resetting || resetConfirmOpen || actionsRef.current.some(Action.isActionBlocking);
      const next = Examples.applyExampleDraft({
        draft: inputValueRef.current,
        pendingSend: pendingSendRef.current,
        locked,
        text
      });
      if (!next.applied) return;
      inputValueRef.current = next.draft;
      setInput(next.draft);
      persistComposerSnapshot();
    };
    useEffect(() => window.AssistantUpload?.acceptWorkspaceReferenceRequest({
      request: draftRequest,
      open,
      capability,
      accountId: () => accountIdRef.current,
      consume: onDraftRequestConsumed,
      locked: () => !!pendingSendRef.current || busyRef.current.sending || busyRef.current.executing || bodyUndoBusyRef.current || Action.isSessionRunning(sessionRef.current) || actionsRef.current.some(Action.isActionBlocking) || resetting || resetConfirmOpen,
      attach: files => uploadBundle()?.actions.onAttach(files),
      focus: () => inputRef.current?.focus(),
      notify: value => toast && toast(L(value))
    }), [draftRequest?.id, open, capability]);
    useEffect(() => {
      if (!draftRequest || !draftRequest.id || draftRequest.workspaceFiles) return;
      if (onDraftRequestConsumed) onDraftRequestConsumed(draftRequest.id);
      if (draftRequest.accountId !== accountIdRef.current || String(draftRequest.bookId) !== String(currentBookRef.current)) return;
      const locked = busyRef.current.sending || busyRef.current.executing || bodyUndoBusyRef.current || Action.isSessionRunning(sessionRef.current) || actionsRef.current.some(Action.isActionBlocking) || resetting || resetConfirmOpen;
      const next = Examples.applyExampleDraft({
        draft: inputValueRef.current,
        pendingSend: pendingSendRef.current,
        locked,
        text: draftRequest.prompt
      });
      if (!next.applied) {
        if (draftRequest.prompt && toast) toast(L({
          zh: '请先处理当前助手草稿或操作，再选择这个入口。',
          en: 'Finish the current draft or action, then select this again.'
        }));
        return;
      }
      draftContextRef.current = {
        bookId: draftRequest.bookId,
        bookTitle: draftRequest.bookTitle,
        pageContext: Composer.freezePageContext(draftRequest.pageContext)
      };
      inputValueRef.current = next.draft;
      setInput(next.draft);
      persistComposerSnapshot();
    }, [draftRequest && draftRequest.id]);
    const {
      send,
      confirm,
      reject,
      revise,
      resume,
      decideGroup,
      restoreFailedMessage
    } = SessionOps.create({
      resumeCheckpoint,
      Action,
      Composer,
      session,
      sending,
      executing,
      resetting,
      resetConfirmOpen,
      messages,
      pageContext: draftContextRef.current?.pageContext || pageContext,
      bookId: draftContextRef.current?.bookId || bookId,
      input,
      hasPendingUploads: () => !!referenceState.pending || !!(uploadBundleRef.current && uploadBundleRef.current.controller.snapshot().length),
      toast,
      TC,
      assistantCopy,
      sessionRef,
      actionsRef,
      busyRef,
      bodyUndoBusyRef,
      pendingSendRef,
      inputValueRef,
      inputRef,
      loadSequenceRef,
      onActionCompleteRef,
      streamLock,
      setSending,
      setInput,
      setError,
      setActions,
      setExecutingActionId,
      persistComposerSnapshot,
      applyComposerState,
      reconcileComposerWithPayload,
      replaceMessages,
      createStreamConsumer,
      beginStream,
      releaseStream,
      refresh,
      newInvocationKey,
      citationsRef,
      setCitations,
      api: window.LF_API,
      FieldCore: window.AssistantFieldReviewCore,
      checkpoint
    });
    const openResetConfirmation = () => {
      if (bodyActivityRef.current.size || Action.isSessionRunning(sessionRef.current)) return;
      if (!session || sending || executing || resetting || referenceState.pending || actions.some(Action.isUnresolvedAction)) return;
      setResetError("");
      setResetConfirmOpen(true);
    };
    const closeResetConfirmation = () => {
      if (resetting) return;
      setResetConfirmOpen(false);
      setResetError("");
    };
    const clearContext = async () => {
      if (bodyActivityRef.current.size || Action.isSessionRunning(sessionRef.current)) return;
      if (!session || sending || executing || resetting || referenceState.pending || actions.some(Action.isUnresolvedAction)) return;
      const sequence = loadSequenceRef.current;
      setResetting(true);
      setResetError("");
      setError("");
      try {
        const payload = await SessionOps.withWelcome(await window.LF_API.resetAssistantSession(session.id), window.LF_API, () => sequence === loadSequenceRef.current);
        if (sequence !== loadSequenceRef.current) return;
        applySession(payload, sequence, null, "reset");
        pageRequestRef.current += 1;
        if (uploadBundleRef.current) uploadBundleRef.current.controller.reset();
        setReferenceState(prior => ({
          pending: 0,
          epoch: prior.epoch + 1
        }));
        setUploadNotice("");
        applyComposerState({
          draft: "",
          pendingSend: null,
          citations: []
        });
        Composer.clearState(sessionStorage, accountIdRef.current);
        setResetConfirmOpen(false);
        if (toast) toast(TC("asst_cleared"));
      } catch (resetError) {
        if (sequence === loadSequenceRef.current) setResetError(Action.messageText(resetError, assistantCopy));
      } finally {
        if (sequence === loadSequenceRef.current) setResetting(false);
      }
    };
    const onBodyActivity = (actionId, active, phase) => {
      if (renderSequence !== loadSequenceRef.current) return;
      const key = actionId + ":" + phase;
      if (active) bodyActivityRef.current.add(key);else bodyActivityRef.current.delete(key);
      const keys = Array.from(bodyActivityRef.current);
      bodyUndoBusyRef.current = keys.some(value => value.endsWith(":undo"));
      setBodyActivity({
        loading: keys.some(value => value.endsWith(":review")),
        undo: bodyUndoBusyRef.current
      });
    };
    const onBodyUndone = async action => {
      if (renderSequence !== loadSequenceRef.current || !session || action.session_id !== session.id) return;
      setActions(current => {
        const next = current.map(item => item.id === action.id ? action : item);
        actionsRef.current = next;
        return next;
      });
      if (toast) toast(TC("asst_undone"));
      try {
        if (onActionCompleteRef.current) await onActionCompleteRef.current(action);
      } catch (failure) {
        if (renderSequence === loadSequenceRef.current) setError(TC("asst_undo_refresh_failed"));
      }
    };
    const lastBodyReceipt = window.AssistantBodyReviewCore && session ? window.AssistantBodyReviewCore.lastBodyReceipt(actions, session.id) : null;
    const visibleCards = session ? Receipt.cardActions(actions, session.id, {
      lastBodyReceipt: () => lastBodyReceipt,
      isActionBlocking: Action.isActionBlocking,
      activeActionId: executingActionId
    }) : [];
    const receiptsBySource = session ? Receipt.receiptsBySource(actions, session.id, {
      messages,
      lastBodyReceipt: () => lastBodyReceipt,
      isActionBlocking: Action.isActionBlocking,
      activeActionId: executingActionId
    }) : {};
    const actionPending = actions.some(Action.isPendingAction);
    const actionUnresolved = actions.some(Action.isActionBlocking);
    const removeTargetDisabled = remoteRunning || bodyActivity.undo || sending || executing || resetting || resetConfirmOpen || actionUnresolved || Boolean(pendingSendRef.current);
    const removeDraftTarget = window.useAssistantDraftTargetRemoval({
      contextRef: draftContextRef,
      pendingSendRef,
      persist: persistComposerSnapshot,
      inputRef,
      disabled: removeTargetDisabled
    });
    const examplesLocked = !session || remoteRunning || bodyActivity.undo || sending || resetting || resetConfirmOpen || actionUnresolved;
    const showExamples = Examples.canShowExamples({
      messages,
      draft: input,
      pendingSend: pendingSendRef.current
    });
    useEffect(() => {
      if (!open || capability !== "configured" || resetConfirmOpen || remoteRunning || sending || executing || actionUnresolved) return undefined;
      const frame = window.requestAnimationFrame(() => {
        if (!inputRef.current || inputRef.current.disabled) return;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
      });
      return () => window.cancelAnimationFrame(frame);
    }, [open, capability, resetConfirmOpen, session && session.id, remoteRunning, sending, executing, actionUnresolved]);
    useEffect(() => {
      if (!resetConfirmOpen) return undefined;
      const frame = window.requestAnimationFrame(() => {
        if (resetCancelRef.current) resetCancelRef.current.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }, [resetConfirmOpen]);
    if (!open) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-layer",
      onPointerDownCapture: AssistantWindow.activateWindow,
      onFocusCapture: AssistantWindow.activateWindow
    }, dockPreview ? /*#__PURE__*/React.createElement("div", {
      className: "asst-dock-preview",
      style: dockPreviewStyle,
      "aria-hidden": "true"
    }) : null, /*#__PURE__*/React.createElement("aside", {
      "data-assistant-window": "assistant",
      className: "asst-drawer asst-drawer--" + mode + (dragging ? " asst-drawer--dragging" : "") + (resizing ? " asst-drawer--resizing" : "") + (fileDrag ? " asst-drawer--filedrop" : ""),
      style: windowStyle,
      role: "dialog",
      "aria-modal": "false",
      "aria-labelledby": "assistant-drawer-title",
      onDragEnter: event => {
        const bundle = uploadBundle();
        if (bundle) bundle.drop.onDragEnter(event);
      },
      onDragOver: event => {
        const bundle = uploadBundle();
        if (bundle) bundle.drop.onDragOver(event);
      },
      onDragLeave: event => {
        const bundle = uploadBundle();
        if (bundle) bundle.drop.onDragLeave(event);
      },
      onDrop: event => {
        const bundle = uploadBundle();
        if (bundle) bundle.drop.onDrop(event);
      }
    }, /*#__PURE__*/React.createElement(AssistantWindow.ResizeHandles, {
      controller: assistantWindow
    }), /*#__PURE__*/React.createElement("header", {
      className: "asst-heading",
      onPointerDown: assistantWindow.beginDrag,
      onPointerMove: assistantWindow.moveDrag,
      onPointerUp: assistantWindow.endDrag,
      onPointerCancel: assistantWindow.endDrag
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      id: "assistant-drawer-title"
    }, TC("asst_title")), book ? /*#__PURE__*/React.createElement("span", {
      className: "asst-book"
    }, "\u300A", L(book.title), "\u300B") : null), /*#__PURE__*/React.createElement("div", {
      className: "asst-toolbar"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "asst-icon-button asst-dock-button",
      "aria-label": TC(mode === "docked" ? "asst_undock" : "asst_dock"),
      "data-tooltip": TC(mode === "docked" ? "asst_undock" : "asst_dock"),
      onClick: assistantWindow.toggleDock
    }, /*#__PURE__*/React.createElement(Icon, {
      n: mode === "docked" ? "float" : "dock",
      s: 18
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "asst-icon-button",
      "aria-label": TC("asst_close"),
      "data-tooltip": TC("asst_close"),
      onClick: closeAssistant
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "close",
      s: 18
    })))), capability === "loading" ? /*#__PURE__*/React.createElement("div", {
      className: "asst-status",
      role: "status"
    }, TC("set_loading")) : null, capability === "disabled" ? /*#__PURE__*/React.createElement("div", {
      className: "asst-status",
      role: "status"
    }, TC("asst_disabled")) : null, capability === "unconfigured" ? /*#__PURE__*/React.createElement("div", {
      className: "asst-status",
      role: "status"
    }, TC("asst_unconfigured")) : null, capability === "unavailable" ? /*#__PURE__*/React.createElement("div", {
      className: "asst-status asst-status--error",
      role: "alert"
    }, /*#__PURE__*/React.createElement("p", null, error || TC("asst_unavailable")), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      onClick: () => {
        const sequence = ++loadSequenceRef.current;
        initialize(sequence);
      }
    }, TC("asst_retry"))) : null, capability === "configured" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AssistantThread, {
      threadRef: threadRef,
      messages: messages,
      assistantName: assistantName,
      welcomeReveal: welcomeReveal,
      memoryTasks: memoryTasks.items,
      receiptsBySource: receiptsBySource,
      onViewReceipt: viewResult,
      messagePage: messagePage,
      pageLoading: pageStatus.loading,
      pageError: pageStatus.error,
      onLoadEarlier: loadEarlier,
      showExamples: showExamples,
      pageContext: pageContext,
      examplesLocked: examplesLocked,
      onExample: applyExample,
      sending: sending,
      executing: executing,
      remoteRunning: remoteRunning,
      syncError: syncError,
      onRetryReply: () => {
        if (replyWatchRef.current) replyWatchRef.current.retry();
      },
      failedMessageId: session?.failed_message_id,
      onOpenReset: openResetConfirmation,
      restoreDisabled: !!input.trim() || actionUnresolved || resetConfirmOpen,
      onRestoreFailedMessage: restoreFailedMessage,
      checkpoint: checkpoint,
      onResumeCheckpoint: () => resumeCheckpoint && resumeCheckpoint(),
      onEditMessage: editMessage,
      onRestoreCheckpointInput: restoreCheckpointInput,
      error: error,
      resetConfirmOpen: resetConfirmOpen,
      resetError: resetError,
      resetting: resetting,
      resetCancelRef: resetCancelRef,
      onCloseReset: closeResetConfirmation,
      onConfirmReset: clearContext,
      actionCards: window.AssistantFieldGroupCore ? window.AssistantFieldGroupCore.groupCards(visibleCards) : visibleCards,
      renderActionCard: item => window.AssistantFieldGroupCore?.isGroupCard(item) ? /*#__PURE__*/React.createElement(window.AssistantFieldGroupCard, {
        key: item.id,
        card: item,
        busy: remoteRunning || sending || executing || bodyActivity.undo,
        waiting: executing && item.id !== executingActionId,
        onDecide: decideGroup
      }) : window.AssistantTaskProgressCore.isSubmitted(item) ? /*#__PURE__*/React.createElement(window.AssistantTaskProgress, {
        key: item.id,
        action: item,
        progress: taskProgress.items[item.id],
        onCheck: () => taskProgress.check(item.id),
        onView: viewResult,
        onResume: () => resume(item),
        busy: remoteRunning || sending || executing
      }) : /*#__PURE__*/React.createElement(ActionCard, {
        key: item.id,
        action: item,
        busy: remoteRunning || sending || executing || bodyActivity.undo,
        waiting: executing && item.id !== executingActionId,
        onConfirm: () => confirm(item),
        onReject: () => reject(item),
        onResume: () => resume(item),
        onRevise: revise,
        onUndoComplete: onBodyUndone,
        onReviewBusyChange: (active, phase) => onBodyActivity(item.id, active, phase),
        onOpenProtectionSettings: onNavigateRef.current ? () => onNavigateRef.current({
          kind: "client_navigation",
          destination: "assistant_settings"
        }).catch(navigationError => setError(Action.messageText(navigationError, assistantCopy))) : undefined
      })
    }), /*#__PURE__*/React.createElement(window.AssistantComposePanel, {
      accountId: accountId,
      session: session,
      remoteRunning: remoteRunning,
      bodyActivity: bodyActivity,
      sending: sending,
      executing: executing,
      resetting: resetting,
      resetConfirmOpen: resetConfirmOpen,
      actionUnresolved: actionUnresolved,
      referenceState: referenceState,
      actions: actions,
      citations: citations,
      inputRef: inputRef,
      uploadBundle: uploadBundle,
      setReferenceState: setReferenceState,
      openResetConfirmation: openResetConfirmation,
      toast: toast,
      memoryTasks: memoryTasks,
      pendingSendRef: pendingSendRef,
      send: send,
      draftContextRef: draftContextRef,
      input: input,
      removeDraftTarget: removeDraftTarget,
      removeTargetDisabled: removeTargetDisabled,
      uploadItems: uploadItems,
      uploadNotice: uploadNotice,
      fileDrag: fileDrag,
      citationsRef: citationsRef,
      setCitations: setCitations,
      persistComposerSnapshot: persistComposerSnapshot,
      setInput: setInput,
      inputValueRef: inputValueRef,
      stopReply: stopReply,
      actionPending: actionPending,
      checkpoint: checkpoint
    }), window.AssistantCheckpointControl && /*#__PURE__*/React.createElement(window.AssistantCheckpointControl.StopConfirmation, {
      control: checkpoint
    })) : null));
  }
  window.AssistantDrawer = AssistantDrawer;
})();
}
