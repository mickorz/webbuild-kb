{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* ===== 统一消息中心：公告 + 系统 + 权益 + 账户 ===== */
(function () {
  const {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef
  } = React;
  const SWIPE_REVEAL = 84;
  const COPY = {
    zh: {
      title: '消息中心',
      subtitle: '公告、系统进度、权益与账户动态按时间汇总',
      all: '全部',
      system: '系统',
      benefit: '权益',
      announcement: '公告',
      account: '账户',
      readAll: '全部标为已读',
      empty: '这里暂时没有消息',
      loading: '正在读取消息…',
      retry: '重新加载',
      loadFailed: '消息暂时无法读取，现有记录没有被修改。',
      delete: '删除消息',
      pinned: '置顶',
      ledger: '已到账，以余额账本为准',
      credit: '笔力',
      taskFallbackTitle: '创作任务已完成',
      taskFallbackBody: '任务结果已经保存，可以返回作品继续创作。',
      labels: {
        system: '系统',
        benefit: '权益',
        announcement: '公告',
        account: '账户'
      }
    },
    en: {
      title: 'Messages',
      subtitle: 'Announcements, system progress, benefits, and account events in one timeline',
      all: 'All',
      system: 'System',
      benefit: 'Benefits',
      announcement: 'Announcements',
      account: 'Account',
      readAll: 'Mark all as read',
      empty: 'No messages here yet',
      loading: 'Loading messages…',
      retry: 'Retry',
      loadFailed: 'Messages are temporarily unavailable. Existing records were not changed.',
      delete: 'Delete message',
      pinned: 'Pinned',
      ledger: 'Credited; the account ledger is authoritative',
      credit: 'credits',
      taskFallbackTitle: 'Creative task completed',
      taskFallbackBody: 'The result has been saved. Return to the book to continue.',
      labels: {
        system: 'System',
        benefit: 'Benefit',
        announcement: 'Announcement',
        account: 'Account'
      }
    }
  };
  const TASK_NOTICE_TYPES = {
    world_build: {
      title: ['世界观生成已完成', ' worldbuilding is ready'],
      body: ['世界规则已经准备好，可以继续创建角色。', 'World rules are ready. You can continue with the cast.'],
      action: ['查看世界观', 'View world'],
      target: 'world'
    },
    character: {
      title: ['角色创建已完成', ' cast is ready'],
      body: ['角色档案已经准备好，可以继续故事规划。', 'Character profiles are ready. You can continue with story planning.'],
      action: ['查看角色', 'View cast'],
      target: 'world'
    },
    story_plan: {
      title: ['故事规划已完成', ' story plan is ready'],
      body: ['故事规划已经保存，可以继续生成大纲。', 'The story plan has been saved. You can continue with the outline.'],
      action: ['查看规划', 'View plan'],
      target: 'world'
    },
    outline: {
      title: ['卷钢已完成', ' outline is ready'],
      body: ['卷纲与近纲已经保存，可以开始章节创作。', 'The volume and near-term outlines are ready. You can start writing chapters.'],
      action: ['查看卷钢', 'View outline'],
      target: 'outline'
    },
    chapter_world_state: {
      title: ['世界状态已更新', ' world state is ready'],
      body: ['本章世界状态已经准备好，可以继续生成细纲。', 'The chapter world state is ready. You can continue with the outline.'],
      action: ['继续创作', 'Continue'],
      target: 'detail',
      chapter: true
    },
    chapter_outline_director: {
      title: ['单章细纲已完成', ' outline is ready'],
      body: ['单章细纲已经保存，可以继续生成正文。', 'The chapter outline has been saved. You can continue with the draft.'],
      action: ['查看单章细纲', 'View outline'],
      target: 'detail',
      chapter: true
    },
    chapter_character_state: {
      title: ['角色状态已更新', ' character state is ready'],
      body: ['本章角色状态已经准备好，可以继续生成正文。', 'Character state is ready. You can continue with the draft.'],
      action: ['继续创作', 'Continue'],
      target: 'detail',
      chapter: true
    },
    chapter_draft: {
      title: ['正文已完成', ' draft is ready'],
      body: ['正文已经保存，可以继续查看、润色或定稿。', 'The draft has been saved. You can review, polish, or finalize it.'],
      action: ['查看正文', 'View draft'],
      target: 'writing',
      chapter: true
    },
    chapter_draft_single: {
      title: ['正文已完成', ' draft is ready'],
      body: ['正文已经保存，可以继续查看、润色或定稿。', 'The draft has been saved. You can review, polish, or finalize it.'],
      action: ['查看正文', 'View draft'],
      target: 'writing',
      chapter: true
    },
    chapter_writer_single: {
      title: ['正文已完成', ' draft is ready'],
      body: ['正文已经保存，可以继续查看、润色或定稿。', 'The draft has been saved. You can review, polish, or finalize it.'],
      action: ['查看正文', 'View draft'],
      target: 'writing',
      chapter: true
    },
    chapter_writer_muti: {
      title: ['正文已完成', ' draft is ready'],
      body: ['正文已经保存，可以继续查看、润色或定稿。', 'The draft has been saved. You can review, polish, or finalize it.'],
      action: ['查看正文', 'View draft'],
      target: 'writing',
      chapter: true
    },
    chapter_full_single: {
      title: ['正文已完成', ' draft is ready'],
      body: ['正文已经保存，可以继续查看、润色或定稿。', 'The draft has been saved. You can review, polish, or finalize it.'],
      action: ['查看正文', 'View draft'],
      target: 'writing',
      chapter: true
    },
    chapter_full_muti: {
      title: ['正文已完成', ' draft is ready'],
      body: ['正文已经保存，可以继续查看、润色或定稿。', 'The draft has been saved. You can review, polish, or finalize it.'],
      action: ['查看正文', 'View draft'],
      target: 'writing',
      chapter: true
    },
    prose_draw_writer: {
      title: ['候选正文已生成', ' candidate draft is ready'],
      body: ['候选正文已经保存，可以返回本章查看本轮状态并选稿。', 'A candidate has been saved. Return to the chapter to review the round.'],
      action: ['查看候选', 'View candidates'],
      target: 'writing',
      chapter: true
    },
    prose_draw_post_process: {
      title: ['候选采用已完成', ' draft adoption is complete'],
      body: ['正文和后处理已完成，可以返回本章查看。', 'Prose and post-processing are complete. Return to the chapter.'],
      action: ['查看正文', 'View prose'],
      target: 'writing',
      chapter: true
    },
    character_create: {
      title: ['新角色已创建', ' character is ready'],
      body: ['新角色已经加入角色表，可以继续审阅和编辑。', 'The new character has joined the cast and is ready to review.'],
      action: ['查看角色表', 'View cast'],
      target: 'world'
    },
    polish: {
      title: ['润色已完成', ' polish is ready'],
      body: ['润色结果已经保存，可以查看正文。', 'The polished draft has been saved and is ready to review.'],
      action: ['查看正文', 'View draft'],
      target: 'writing',
      chapter: true
    },
    post_hoc: {
      title: ['后验已完成', ' review is complete'],
      body: ['章节状态已经更新，可以继续下一章。', 'Chapter state has been updated. You can continue with the next chapter.'],
      action: ['查看正文', 'View draft'],
      target: 'writing',
      chapter: true
    }
  };
  function dateOf(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(window.CLANG === 'en' ? 'en' : 'zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
  function kindOfNotification(notification) {
    if (notification.type === 'promotion' || (notification.data || {}).benefit) return 'benefit';
    if (['billing', 'low_balance', 'subscription'].includes(notification.type)) return 'account';
    return 'system';
  }
  function taskCompletionOf(notification, copy) {
    const data = notification.data || {};
    const portal = window.LF_PORTAL_STATE || {};
    const tasks = Array.isArray(portal.tasks) ? portal.tasks : [];
    const task = tasks.find(row => String(row.id) === String(data.task_id)) || {};
    const books = Array.isArray(portal.books) ? portal.books : [];
    const bookId = data.book_link_id || task.book_link_id || null;
    const book = books.find(row => String(row.id) === String(bookId)) || {};
    const bookTitle = data.book_title || book.title || book.name || '';
    const rawChapter = data.chapter_number != null ? data.chapter_number : task.chapter_number;
    const chapterNumber = Number(rawChapter) > 0 ? Number(rawChapter) : null;
    const taskType = data.task_type || task.task_type || '';
    const presentation = TASK_NOTICE_TYPES[taskType];
    if (!presentation) {
      return {
        title: copy.taskFallbackTitle,
        body: copy.taskFallbackBody,
        taskAction: null
      };
    }
    const en = window.CLANG === 'en';
    const languageIndex = en ? 1 : 0;
    const bookLabel = bookTitle ? en ? `“${bookTitle}”` : `《${bookTitle}》` : '';
    let subject = bookLabel;
    if (presentation.chapter) {
      const chapterLabel = chapterNumber ? en ? `Chapter ${chapterNumber}` : `第 ${chapterNumber} 章` : en ? 'Chapter' : '章节';
      subject = [bookLabel, chapterLabel].filter(Boolean).join(en ? ' · ' : '');
    }
    const drawFailure = notification.type === 'task_failed' && taskType.startsWith('prose_draw_');
    const title = drawFailure ? subject + (en ? ' draw task did not complete' : '抽卡任务未完成') : `${subject}${presentation.title[languageIndex]}` || copy.taskFallbackTitle;
    const target = data.target || presentation.target;
    const canOpen = Boolean(bookId) && (!presentation.chapter || Boolean(chapterNumber));
    return {
      title,
      body: drawFailure ? en ? 'Return to the chapter to read the saved result and current status.' : '可以返回本章读取已保存的结果及当前状态。' : presentation.body[languageIndex],
      taskAction: canOpen ? {
        bookId,
        chapterNumber,
        target,
        roundId: taskType === 'prose_draw_writer' || drawFailure ? data.round_id || null : null,
        label: drawFailure ? en ? 'View round status' : '查看本轮状态' : presentation.action[languageIndex]
      } : null
    };
  }
  function normalize(announcements, notifications) {
    const announcementItems = announcements.map(item => ({
      key: `announcement:${item.id}`,
      id: item.id,
      source: 'announcement',
      kind: 'announcement',
      title: item.title,
      body: item.body,
      createdAt: item.created_at,
      unread: !item.read,
      pinned: Boolean(item.pinned),
      benefitMillis: 0
    }));
    const notificationItems = notifications.map(item => {
      const data = item.data || {};
      const benefit = data.benefit || {};
      const taskCompletion = item.type === 'task_completed' || item.type === 'task_failed' && ['prose_draw_writer', 'prose_draw_post_process'].includes(data.task_type) ? taskCompletionOf(item, COPY[window.CLANG === 'en' ? 'en' : 'zh']) : null;
      return {
        key: `notification:${item.id}`,
        id: item.id,
        source: 'notification',
        kind: kindOfNotification(item),
        title: taskCompletion ? taskCompletion.title : item.title,
        body: taskCompletion ? taskCompletion.body : item.message,
        createdAt: item.created_at,
        unread: !item.read_at,
        pinned: false,
        benefitMillis: Number(benefit.amount_millis || data.amount_millis || 0),
        taskAction: taskCompletion && taskCompletion.taskAction,
        creditsRefunded: ['task_failed', 'cruise_failed'].includes(item.type) && data.credits_refunded === true
      };
    });
    return announcementItems.concat(notificationItems).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /* Phone frame (FD-176): swipe a deletable message left to reveal its delete action; focus reveals it too. */
  function useSwipeReveal(enabled) {
    const [offset, setOffset] = useState(0);
    const drag = useRef(null);
    if (!enabled) return {
      offset: 0,
      setOffset,
      handlers: {}
    };
    const handlers = {
      onTouchStart: event => {
        const touch = event.touches[0];
        drag.current = {
          x: touch.clientX,
          y: touch.clientY,
          base: offset,
          horizontal: null
        };
      },
      onTouchMove: event => {
        const current = drag.current;
        if (!current) return;
        const touch = event.touches[0],
          dx = touch.clientX - current.x,
          dy = touch.clientY - current.y;
        if (current.horizontal === null) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          current.horizontal = Math.abs(dx) > Math.abs(dy);
        }
        if (current.horizontal) setOffset(Math.max(-SWIPE_REVEAL - 24, Math.min(0, current.base + dx)));
      },
      onTouchEnd: () => {
        const current = drag.current;
        drag.current = null;
        if (current && current.horizontal) setOffset(value => value < -SWIPE_REVEAL / 2 ? -SWIPE_REVEAL : 0);
      },
      // A tap on an opened card closes it instead of activating its content.
      onClickCapture: event => {
        if (offset) {
          event.preventDefault();
          event.stopPropagation();
          setOffset(0);
        }
      }
    };
    return {
      offset,
      setOffset,
      handlers
    };
  }
  function MessageCard({
    item,
    copy,
    onRead,
    onDelete,
    onOpenTask
  }) {
    const onPhone = !!(window.useMobileChromeState && window.useMobileChromeState());
    const deletable = item.source === 'notification';
    const swipe = useSwipeReveal(onPhone && deletable);
    const amount = item.benefitMillis > 0 ? item.benefitMillis / 1000 : 0;
    const kindIcon = {
      system: '系',
      benefit: '权',
      announcement: '告',
      account: '账'
    }[item.kind];
    const markRead = () => item.unread && onRead(item);
    const openTask = () => {
      markRead();
      if (item.taskAction && onOpenTask) onOpenTask(item.taskAction);
    };
    const titleInteractive = Boolean(item.unread || item.taskAction && onOpenTask);
    const titleContent = /*#__PURE__*/React.createElement("span", {
      role: "heading",
      "aria-level": "3"
    }, item.title);
    const card = /*#__PURE__*/React.createElement("article", _extends({
      className: `inbox-card ${item.unread ? 'unread' : ''} ${item.kind}`,
      style: swipe.offset ? {
        transform: `translateX(${swipe.offset}px)`
      } : undefined
    }, swipe.handlers), /*#__PURE__*/React.createElement("span", {
      className: `inbox-type-icon ${item.kind}`,
      "aria-hidden": "true"
    }, kindIcon), /*#__PURE__*/React.createElement("div", {
      className: "inbox-card-main"
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("span", {
      className: `inbox-kind ${item.kind}`
    }, copy.labels[item.kind]), item.pinned ? /*#__PURE__*/React.createElement("span", {
      className: "inbox-pinned"
    }, copy.pinned) : null, titleInteractive ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "inbox-card-title",
      onClick: item.taskAction ? openTask : markRead
    }, titleContent) : /*#__PURE__*/React.createElement("div", {
      className: "inbox-card-title"
    }, titleContent), /*#__PURE__*/React.createElement("time", null, dateOf(item.createdAt)), item.unread ? /*#__PURE__*/React.createElement("span", {
      className: "inbox-unread",
      "aria-label": window.CLANG === 'en' ? 'Unread' : '未读'
    }) : null), /*#__PURE__*/React.createElement("div", {
      className: "inbox-card-detail"
    }, /*#__PURE__*/React.createElement("span", {
      className: "inbox-card-body"
    }, item.body), item.taskAction ? /*#__PURE__*/React.createElement("footer", {
      className: "inbox-card-actions"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: openTask
    }, item.taskAction.label, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u2192"))) : null), item.creditsRefunded ? /*#__PURE__*/React.createElement("div", {
      className: "inbox-card-detail"
    }, TC('generation_credits_refunded')) : null, amount > 0 ? /*#__PURE__*/React.createElement("span", {
      className: "inbox-benefit"
    }, /*#__PURE__*/React.createElement("strong", null, "+", amount.toLocaleString(), " ", copy.credit), /*#__PURE__*/React.createElement("small", null, copy.ledger)) : null), deletable && !onPhone ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "inbox-delete",
      "aria-label": copy.delete,
      title: copy.delete,
      onClick: () => onDelete(item)
    }, "\xD7") : null);
    if (!onPhone || !deletable) return card;
    return /*#__PURE__*/React.createElement("div", {
      className: 'inbox-swipe' + (swipe.offset ? ' is-open' : '')
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "inbox-swipe-delete",
      onClick: () => onDelete(item),
      onFocus: () => swipe.setOffset(-SWIPE_REVEAL),
      onBlur: () => swipe.setOffset(0)
    }, copy.delete), card);
  }
  function InboxView({
    toast,
    onOpenTask
  }) {
    const copy = COPY[window.CLANG === 'en' ? 'en' : 'zh'];
    const [filter, setFilter] = useState('all');
    const [announcements, setAnnouncements] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const reload = useCallback(() => {
      if (!window.LF_API) return Promise.resolve();
      setLoading(true);
      setError('');
      return Promise.all([window.LF_API.announcements(), window.LF_API.notifications()]).then(([nextAnnouncements, nextNotifications]) => {
        setAnnouncements(Array.isArray(nextAnnouncements) ? nextAnnouncements : []);
        setNotifications(Array.isArray(nextNotifications) ? nextNotifications : []);
        if (window.LF_INBOX_REFRESH) window.LF_INBOX_REFRESH();
      }).catch(() => setError(copy.loadFailed)).finally(() => setLoading(false));
    }, [copy.loadFailed]);
    useEffect(() => {
      reload();
    }, [reload]);
    const items = useMemo(() => normalize(announcements, notifications), [announcements, notifications]);
    const counts = useMemo(() => items.reduce((value, item) => {
      value.all += 1;
      value[item.kind] += 1;
      return value;
    }, {
      all: 0,
      system: 0,
      benefit: 0,
      announcement: 0,
      account: 0
    }), [items]);
    const visible = filter === 'all' ? items : items.filter(item => item.kind === filter);
    const readItem = item => {
      if (item.source === 'announcement') {
        setAnnouncements(value => value.map(row => row.id === item.id ? {
          ...row,
          read: true
        } : row));
        window.LF_API.announcementRead(item.id).catch(reload);
      } else {
        setNotifications(value => value.map(row => row.id === item.id ? {
          ...row,
          read_at: new Date().toISOString()
        } : row));
        window.LF_API.notificationRead(item.id).catch(reload);
      }
      if (window.LF_INBOX_REFRESH) window.LF_INBOX_REFRESH();
    };
    const deleteItem = item => {
      setNotifications(value => value.filter(row => row.id !== item.id));
      window.LF_API.notificationDelete(item.id).then(() => {
        if (window.LF_INBOX_REFRESH) window.LF_INBOX_REFRESH();
      }).catch(errorValue => {
        reload();
        if (toast) toast(errorValue.message);
      });
    };
    const readAll = () => {
      setAnnouncements(value => value.map(row => ({
        ...row,
        read: true
      })));
      setNotifications(value => value.map(row => ({
        ...row,
        read_at: row.read_at || new Date().toISOString()
      })));
      Promise.all([window.LF_API.announcementsReadAll(), window.LF_API.notificationsReadAll()]).then(() => {
        if (window.LF_INBOX_REFRESH) window.LF_INBOX_REFRESH();
      }).catch(reload);
    };
    const filters = ['all', 'system', 'benefit', 'announcement', 'account'];
    // Phone frame (FD-176): the frame title bar carries the inbox title and mark-all-read; the desktop header is hidden there.
    (window.useMobileChrome || (() => {}))({
      key: 'inbox',
      header: [{
        key: 'readAll',
        label: copy.readAll,
        disabled: !items.some(item => item.unread),
        onClick: readAll
      }]
    });
    return /*#__PURE__*/React.createElement("main", {
      className: "inbox-page"
    }, /*#__PURE__*/React.createElement("header", {
      className: "inbox-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, copy.title), /*#__PURE__*/React.createElement("p", null, copy.subtitle)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      disabled: !items.some(item => item.unread),
      onClick: readAll
    }, copy.readAll)), /*#__PURE__*/React.createElement("nav", {
      className: "inbox-filters",
      "aria-label": copy.title
    }, filters.map(key => /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: key,
      className: filter === key ? 'selected' : '',
      "aria-pressed": filter === key,
      onClick: () => setFilter(key)
    }, copy[key], /*#__PURE__*/React.createElement("span", null, counts[key])))), loading ? /*#__PURE__*/React.createElement("div", {
      className: "inbox-state"
    }, copy.loading) : error ? /*#__PURE__*/React.createElement("div", {
      className: "inbox-state error"
    }, /*#__PURE__*/React.createElement("p", null, error), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn",
      onClick: reload
    }, copy.retry)) : visible.length ? /*#__PURE__*/React.createElement("section", {
      className: "inbox-list"
    }, visible.map(item => /*#__PURE__*/React.createElement(MessageCard, {
      key: item.key,
      item: item,
      copy: copy,
      onRead: readItem,
      onDelete: deleteItem,
      onOpenTask: onOpenTask
    }))) : /*#__PURE__*/React.createElement("div", {
      className: "inbox-state"
    }, copy.empty));
  }
  function InboxNotificationDialog({
    notification,
    dismiss
  }) {
    const close = useRef(null);
    const ack = useRef(null);
    const en = window.CLANG === 'en';
    const benefit = notification.data?.benefit;
    const amount = Number(benefit?.amount_millis || 0) / 1000;
    const expiry = dateOf(benefit?.expires_at);
    useEffect(() => {
      const previous = document.activeElement;
      close.current.focus();
      return () => {
        if (previous?.isConnected) previous.focus();
      };
    }, []);
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }
      if (event.key === 'Tab' && (event.shiftKey && document.activeElement === close.current || !event.shiftKey && document.activeElement === ack.current)) {
        event.preventDefault();
        (event.shiftKey ? ack : close).current.focus();
      }
    };
    return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
      className: "lf-update-overlay",
      onMouseDown: event => {
        if (event.target === event.currentTarget) dismiss();
      }
    }, /*#__PURE__*/React.createElement("section", {
      className: "lf-update-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "lf-notification-popup-title",
      onKeyDown: onKeyDown
    }, /*#__PURE__*/React.createElement("header", {
      className: "lf-update-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "lf-update-eyebrow"
    }, en ? 'Notification' : '通知'), /*#__PURE__*/React.createElement("h2", {
      className: "lf-update-title",
      id: "lf-notification-popup-title"
    }, notification.title)), /*#__PURE__*/React.createElement("button", {
      ref: close,
      className: "lf-update-close",
      type: "button",
      onClick: dismiss,
      "aria-label": en ? 'Close' : '关闭'
    }, "\xD7")), /*#__PURE__*/React.createElement("div", {
      className: "lf-update-content"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lf-update-markdown inbox-popup-body"
    }, notification.message), amount > 0 ? /*#__PURE__*/React.createElement("p", {
      className: "inbox-benefit"
    }, /*#__PURE__*/React.createElement("strong", null, "+", amount.toLocaleString(), " ", COPY[en ? 'en' : 'zh'].credit), /*#__PURE__*/React.createElement("small", null, expiry ? en ? `Expires ${expiry}` : `有效期至 ${expiry}` : COPY[en ? 'en' : 'zh'].ledger)) : null), /*#__PURE__*/React.createElement("footer", {
      className: "lf-update-actions"
    }, /*#__PURE__*/React.createElement("button", {
      ref: ack,
      className: "lf-update-ack",
      type: "button",
      onClick: dismiss
    }, en ? 'Got it' : '知道了')))), document.body);
  }
  function InboxNotificationPopup({
    accountId
  }) {
    const [notification, setNotification] = useState(null);
    const pending = useRef(null);
    const shown = useRef(false);
    useEffect(() => {
      if (!window.LF_API?.notificationPopupClaim) return;
      let request = null;
      let observer = null;
      let stopped = false;
      const isCurrent = () => !stopped && !window.LF_AUTH_EXPIRED && window.LF_PORTAL_STATE?.me?.id === accountId;
      const check = async () => {
        if (!isCurrent() || shown.current || request || document.visibilityState === 'hidden') return;
        if (document.querySelector('[role="dialog"][aria-modal="true"],dialog[open]')) {
          if (!observer) {
            observer = new MutationObserver(check);
            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['aria-modal', 'open']
            });
          }
          return;
        }
        observer?.disconnect();
        observer = null;
        if (pending.current) {
          shown.current = true;
          setNotification(pending.current);
          pending.current = null;
          return;
        }
        request = new AbortController();
        try {
          const value = await window.LF_API.notificationPopupClaim(accountId, request.signal);
          if (isCurrent()) pending.current = value;
        } catch (_error) {
          // Notifications stay accessible in the inbox if the popup cannot be loaded.
        } finally {
          request = null;
        }
        if (pending.current) check();
      };
      check();
      const timer = window.setInterval(check, 60000);
      document.addEventListener('visibilitychange', check);
      return () => {
        stopped = true;
        request?.abort();
        observer?.disconnect();
        window.clearInterval(timer);
        document.removeEventListener('visibilitychange', check);
      };
    }, [accountId]);
    const dismiss = () => {
      shown.current = false;
      setNotification(null);
    };
    return notification && !window.LF_AUTH_EXPIRED && window.LF_PORTAL_STATE?.me?.id === accountId ? /*#__PURE__*/React.createElement(InboxNotificationDialog, {
      notification: notification,
      dismiss: dismiss
    }) : null;
  }
  window.InboxView = InboxView;
  window.InboxNotificationPopup = InboxNotificationPopup;
})();
}
