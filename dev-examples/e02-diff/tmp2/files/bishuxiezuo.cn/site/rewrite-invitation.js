(function () {
  'use strict';
  if (!window.NBSite || window.NBSite.current.code !== 'cn') return;
  const onTool = Boolean(document.getElementById('rwText'));
  const editor = 'textarea,input:not([type]),input[type="text"],input[type="search"],input[type="email"],input[type="password"],input[type="number"],[contenteditable]:not([contenteditable="false"]),[role="textbox"]';
  const modal = 'dialog[open],[aria-modal="true"]:not([hidden]),[role="dialog"]:not([hidden])';
  let receipt, checkedToken, inflight, observer, deferred = false;

  function account() {
    try {
      const raw = localStorage.getItem('lf_tokens') || localStorage.getItem('novelbuilt.tokens');
      const value = JSON.parse(raw);
      return value && (value.access_token || value.accessToken);
    } catch (_) { return null; }
  }

  function busy() {
    return document.hidden || document.activeElement?.closest(editor) || document.querySelector(modal);
  }

  function stopWaiting() {
    observer?.disconnect();
    observer = null;
    deferred = false;
  }

  function waitUntilFree() {
    deferred = true;
    if (!observer && document.querySelector(modal)) {
      observer = new MutationObserver(() => {
        if (!document.querySelector(modal)) {
          observer.disconnect();
          observer = null;
          check();
        }
      });
      observer.observe(document.body, { subtree: true, childList: true, attributes: true,
        attributeFilter: ['open', 'hidden', 'aria-modal', 'role'] });
    }
  }

  function open(data) {
    const holder = document.createElement('template');
    holder.innerHTML = `<dialog class="rw-invite" id="rwWelcome" aria-labelledby="rwWelcomeTitle" aria-describedby="rwWelcomeQuota">
  <div class="rw-invite-sheet">
    <button class="rw-invite-close" type="button" aria-label="关闭邀请函">×</button>
    <div class="rw-invite-mark" aria-hidden="true">先行</div>
    <p class="rw-invite-kicker">笔枢 · 先行体验邀请函</p>
    <h2 id="rwWelcomeTitle">你的改写席位已开启</h2>
    <p id="rwWelcomeQuota" class="rw-invite-quota"></p>
    <a class="rw-invite-enter" href="/site/ai-rewrite.html" autofocus>进入改写工作台<span aria-hidden="true"> →</span></a>
  </div>
</dialog>`;
    const dialog = holder.content.firstElementChild;
    dialog.querySelector('#rwWelcomeQuota').textContent = '今日免费剩余 ' +
      Math.max(0, data.quota.limit - data.quota.used) + ' 次，每次最多 ' + data.max_chars.toLocaleString('zh-CN') + ' 字。';
    if (onTool) dialog.querySelector('.rw-invite-enter').onclick = event => {
      event.preventDefault();
      dialog.close();
    };
    dialog.querySelector('.rw-invite-close').onclick = () => dialog.close();
    dialog.addEventListener('close', () => { dialog.remove(); if (onTool) document.getElementById('rwText').focus(); });
    document.body.append(dialog);
    dialog.showModal();
  }

  async function check() {
    const token = account();
    if (!token || typeof HTMLDialogElement === 'undefined' ||
        typeof HTMLDialogElement.prototype.showModal !== 'function') return;
    if (receipt && receipt.token !== token) receipt = null;
    if (checkedToken === token && !receipt) return;
    if (busy()) { waitUntilFree(); return; }
    stopWaiting();
    if (!receipt) {
      if (inflight) return inflight;
      inflight = (async () => {
        try {
          const response = await fetch(window.NBSite.apiBase() + '/api/tools/ai-rewrite/welcome', {
            method: 'POST', cache: 'no-store', headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
          });
          if (!response.ok) return;
          const result = await response.json();
          if (account() !== token) return;
          if (result.show) {
            checkedToken = token;
            receipt = { token, data: result };
          }
        } catch (_) { /* Optional invitation; a subsequent visit retries. */ }
      })();
      try { await inflight; } finally { inflight = null; }
    }
    if (!receipt || account() !== receipt.token) return;
    if (busy()) { waitUntilFree(); return; }
    const data = receipt.data;
    receipt = null;
    open(data);
  }

  window.NBRewriteInvitation = { check };
  document.addEventListener('focusout', () => { if (deferred) setTimeout(check, 0); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (deferred || !onTool)) check(); });
  window.addEventListener('storage', event => {
    if (event.key === 'lf_tokens' || event.key === 'novelbuilt.tokens') {
      if (checkedToken && account() !== checkedToken) document.getElementById('rwWelcome')?.close();
      if (!onTool) check();
    }
  });
  if (!onTool) {
    window.addEventListener('hashchange', check);
    check();
  }
})();
