/* Run only the navigation attached to a live tool call, then report the observed page. */
(function () {
  const errorCodes = new Set(['navigation_draft', 'navigation_target_changed', 'navigation_target_missing',
    'navigation_load_failed', 'navigation_blocked', 'navigation_timeout']);
  async function run(options) {
    const now = options.now || Date.now;
    const wait = options.wait || (ms => new Promise(resolve => setTimeout(resolve, ms)));
    const deadline = now() + 50000;
    while (options.isCurrent() && now() < deadline) {
      const response = await options.read();
      if (!options.isCurrent()) return;
      const request = response && response.request;
      if (!request) { await wait(250); continue; }
      if (request.state !== 'pending' || request.expires_at * 1000 <= now()) return;
      let receipt;
      try {
        if (!options.canNavigate()) throw Object.assign(new Error('Page changed'), {code:'navigation_target_changed'});
        const observed = await options.navigate(Object.assign({kind:'client_navigation'}, request.target));
        receipt = {request_id:request.id, succeeded:true, observed};
      } catch (error) {
        receipt = {request_id:request.id, succeeded:false,
          error_code:errorCodes.has(error && error.code) ? error.code : 'navigation_load_failed'};
      }
      // Retry the same receipt, never the navigation. The server settles a request once.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try { return await options.acknowledge(receipt); }
        catch (error) {
          if (attempt === 2 || (error && error.status >= 400 && error.status < 500)) throw error;
          await wait(300);
        }
      }
    }
  }
  window.AssistantNavigationClient = {run};
})();
