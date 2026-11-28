(function () {
  'use strict';

  // Existing operational announcements have no English edition yet.
  if (window.NBSite && window.NBSite.current.code === 'global') return;

  const STORAGE_KEY = 'lf_public_update_seen_v1';
  const MAX_SEEN = 20;
  const EMOJI_SHORTCODES = Object.freeze({
    books: '📚', sparkles: '✨', bell: '🔔', shield: '🛡️',
    repeat: '🔄', writing: '✍️', compass: '🧭', moon: '🌙',
    rocket: '🚀', check: '✅', bulb: '💡', heart: '❤️',
  });
  let opened = false;

  function readSeen() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value.filter(item => typeof item === 'string').slice(-MAX_SEEN) : [];
    } catch (error) {
      return [];
    }
  }

  function isSeen(id) {
    return readSeen().includes(id);
  }

  function markSeen(id) {
    try {
      const next = readSeen().filter(item => item !== id);
      next.push(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-MAX_SEEN)));
    } catch (error) {
      // Storage may be unavailable in privacy modes; the popup remains usable.
    }
  }

  function text(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value || '';
    return node;
  }

  function expandEmoji(value) {
    return String(value || '').replace(/:([a-z0-9_+-]+):/gi, (match, name) => (
      EMOJI_SHORTCODES[name.toLowerCase()] || match
    ));
  }

  function safeHref(value) {
    const href = String(value || '').trim();
    if (/^https?:\/\//i.test(href) || /^\/(?!\/)/.test(href) || href.startsWith('#')) return href;
    return null;
  }

  function appendInlineMarkdown(parent, value) {
    const source = expandEmoji(value);
    const tokenPattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\n]+\))/g;
    let cursor = 0;
    let match;
    while ((match = tokenPattern.exec(source))) {
      if (match.index > cursor) parent.append(document.createTextNode(source.slice(cursor, match.index)));
      const token = match[0];
      if (token.startsWith('**')) {
        const strong = document.createElement('strong');
        appendInlineMarkdown(strong, token.slice(2, -2));
        parent.append(strong);
      } else if (token.startsWith('`')) {
        parent.append(text('code', '', token.slice(1, -1)));
      } else if (token.startsWith('*')) {
        const emphasis = document.createElement('em');
        appendInlineMarkdown(emphasis, token.slice(1, -1));
        parent.append(emphasis);
      } else {
        const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        const href = linkMatch && safeHref(linkMatch[2]);
        if (!linkMatch || !href) {
          parent.append(document.createTextNode(token));
        } else {
          const link = document.createElement('a');
          link.href = href;
          appendInlineMarkdown(link, linkMatch[1]);
          if (/^https?:\/\//i.test(href)) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          }
          parent.append(link);
        }
      }
      cursor = tokenPattern.lastIndex;
    }
    if (cursor < source.length) parent.append(document.createTextNode(source.slice(cursor)));
  }

  function markdown(value, className) {
    const root = document.createElement('div');
    root.className = ['lf-update-markdown', className].filter(Boolean).join(' ');
    const lines = String(value || '').replace(/\r\n?/g, '\n').split('\n');
    let paragraph = null;
    let list = null;

    function resetFlow() {
      paragraph = null;
      list = null;
    }

    function ensureList(tagName) {
      if (list && list.tagName.toLowerCase() === tagName) return list;
      paragraph = null;
      list = document.createElement(tagName);
      root.append(list);
      return list;
    }

    lines.forEach(line => {
      if (!line.trim()) {
        resetFlow();
        return;
      }

      const continuation = line.match(/^\s{2,}(.+)$/);
      if (continuation && list && list.lastElementChild) {
        list.lastElementChild.append(document.createElement('br'));
        appendInlineMarkdown(list.lastElementChild, continuation[1]);
        return;
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        resetFlow();
        const node = document.createElement(heading[1].length === 1 ? 'h3' : 'h4');
        appendInlineMarkdown(node, heading[2]);
        root.append(node);
        return;
      }

      const unordered = line.match(/^[-*]\s+(.+)$/);
      if (unordered) {
        const item = document.createElement('li');
        appendInlineMarkdown(item, unordered[1]);
        ensureList('ul').append(item);
        return;
      }

      const ordered = line.match(/^\d+\.\s+(.+)$/);
      if (ordered) {
        const item = document.createElement('li');
        appendInlineMarkdown(item, ordered[1]);
        ensureList('ol').append(item);
        return;
      }

      const quote = line.match(/^>\s?(.+)$/);
      if (quote) {
        resetFlow();
        const node = document.createElement('blockquote');
        appendInlineMarkdown(node, quote[1]);
        root.append(node);
        return;
      }

      if (/^\s*---+\s*$/.test(line)) {
        resetFlow();
        root.append(document.createElement('hr'));
        return;
      }

      list = null;
      if (!paragraph) {
        paragraph = document.createElement('p');
        root.append(paragraph);
      } else {
        paragraph.append(document.createElement('br'));
      }
      appendInlineMarkdown(paragraph, line);
    });
    return root;
  }

  function dateLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const lang = document.documentElement.lang || 'zh-CN';
    return new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  }

  function copy() {
    const english = (document.documentElement.lang || '').toLowerCase().startsWith('en');
    return english ? {
      eyebrow: 'Product update', history: 'Recent updates',
      close: 'Close update', ack: 'Got it',
    } : {
      eyebrow: '产品更新', history: '最近更新',
      close: '关闭更新公告', ack: '知道了',
    };
  }

  function hasBlockingDialog() {
    return Boolean(document.querySelector('[role="dialog"][aria-modal="true"],dialog[open]'));
  }

  function render(payload) {
    const latest = payload && payload.latest;
    if (!latest || opened || isSeen(latest.id)) return;
    if (document.visibilityState === 'hidden') {
      document.addEventListener('visibilitychange', () => render(payload), { once: true });
      return;
    }
    if (hasBlockingDialog()) {
      const observer = new MutationObserver(() => {
        if (!hasBlockingDialog()) {
          observer.disconnect();
          render(payload);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      return;
    }

    opened = true;
    markSeen(latest.id);
    const labels = copy();
    const activeBeforeOpen = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'lf-update-overlay';
    const dialog = document.createElement('section');
    dialog.className = 'lf-update-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'lf-update-title');

    const head = document.createElement('header');
    head.className = 'lf-update-head';
    const heading = document.createElement('div');
    heading.append(text('span', 'lf-update-eyebrow', labels.eyebrow));
    const title = text('h2', 'lf-update-title', latest.title);
    title.id = 'lf-update-title';
    heading.append(title);
    const close = text('button', 'lf-update-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', labels.close);
    head.append(heading, close);

    const content = document.createElement('div');
    content.className = 'lf-update-content';
    content.append(text('p', 'lf-update-date', dateLabel(latest.published_at)));
    content.append(markdown(latest.body, 'lf-update-body'));

    const recent = Array.isArray(payload.recent) ? payload.recent : [];
    if (recent.length) {
      const history = document.createElement('section');
      history.className = 'lf-update-history';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'lf-update-history-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'lf-update-history-list');
      toggle.append(text('span', '', `${labels.history}（${recent.length}）`), text('span', '', '⌄'));
      const list = document.createElement('div');
      list.id = 'lf-update-history-list';
      list.className = 'lf-update-history-list';
      list.hidden = true;
      recent.forEach(item => {
        const article = document.createElement('article');
        article.className = 'lf-update-history-item';
        const itemHead = document.createElement('header');
        itemHead.append(text('strong', '', item.title), text('time', '', dateLabel(item.published_at)));
        article.append(itemHead, markdown(item.body, 'lf-update-history-body'));
        list.append(article);
      });
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        list.hidden = expanded;
      });
      history.append(toggle, list);
      content.append(history);
    }

    const actions = document.createElement('footer');
    actions.className = 'lf-update-actions';
    const ack = text('button', 'lf-update-ack', labels.ack);
    ack.type = 'button';
    actions.append(ack);
    dialog.append(head, content, actions);
    overlay.append(dialog);

    function dismiss() {
      overlay.remove();
      opened = false;
      if (activeBeforeOpen && typeof activeBeforeOpen.focus === 'function') activeBeforeOpen.focus();
    }

    close.addEventListener('click', dismiss);
    ack.addEventListener('click', dismiss);
    overlay.addEventListener('mousedown', event => {
      if (event.target === overlay) dismiss();
    });
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll('button:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    document.body.append(overlay);
    close.focus();
  }

  async function init() {
    if (document.getElementById('lf-update-title')) return;
    try {
      const response = await fetch('/api/public/announcements/popup', {
        credentials: 'same-origin', cache: 'no-cache', headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;
      render(await response.json());
    } catch (error) {
      // Public updates are optional and must never block the page.
    }
  }

  window.LFAnnouncementMarkdown = { markdown, expandEmoji };
  window.LFPublicUpdates = { init, isSeen };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
