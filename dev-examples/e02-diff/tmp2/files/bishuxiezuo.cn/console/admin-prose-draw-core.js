(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AdminProseDrawCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const number = value => typeof value === 'number' && Number.isFinite(value);
  const percent = value => number(value) ? (100 * value).toFixed(1) + '%' : '—';
  const count = value => number(value) ? value.toLocaleString() : '—';
  const weight = value => number(value) ? value.toFixed(2) : '—';
  const versionLabel = scheme => scheme ? scheme.name + (scheme.version_number ? ' · V' + scheme.version_number : '') : '方案不可用';
  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    return value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
  }
  const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
  function equivalent(a, b) {
    if (!a || !b) return false;
    return same([a.model_ref, a.model_params, a.inject_intent], [b.model_ref, b.model_params, b.inject_intent]);
  }
  function changes(a, b) {
    if (!a || !b) return [];
    const result = [];
    if (a.model_ref !== b.model_ref) result.push('模型');
    if (!same(a.model_params, b.model_params)) result.push('参数');
    if (a.inject_intent !== b.inject_intent) result.push('意图');
    return result;
  }
  const isV2 = task => task && task.policy_version === 'prose-draw-policy.v2';
  function routingForm(task) {
    return {
      weight: String(task ? task.traffic_weight : 1),
      exploration: String(task ? task.exploration_probability * 100 : 20),
      cap: String(task && task.policy ? task.policy.user_vote_cap || 1 : 1)
    };
  }
  function validRouting(form, includeCap) {
    return form.weight !== '' && Number.isSafeInteger(Number(form.weight)) && Number(form.weight) > 0 && Number(form.weight) <= 2147483647 && form.exploration !== '' && Number.isFinite(Number(form.exploration)) && Number(form.exploration) >= 0 && Number(form.exploration) <= 100 && (!includeCap || form.cap !== '' && Number.isSafeInteger(Number(form.cap)) && Number(form.cap) >= 1 && Number(form.cap) <= 2147483647);
  }
  function draftAllocation(tasks, allocations, task, form) {
    if (!validRouting(form)) return null;
    const current = allocations.find(row => row.evaluation_task_id === task.id);
    if (!current) return null;
    const peers = allocations;
    const weights = Object.fromEntries(tasks.map(t => [t.id, t.id === task.id ? Number(form.weight) : t.traffic_weight]));
    const denominator = peers.reduce((sum, row) => sum + (row.eligible ? weights[row.evaluation_task_id] || 0 : 0), 0);
    const candidates = (current.candidate_probabilities || []).filter(row => row.eligible);
    if (candidates.some(row => !number(row.score))) return null;
    const best = Math.max(...candidates.map(row => row.score));
    const bestCount = candidates.filter(row => row.score === best).length,
      epsilon = Number(form.exploration) / 100;
    return {
      tasks: peers.map(row => ({
        ...row,
        next: row.eligible && denominator > 0 ? weights[row.evaluation_task_id] / denominator : 0
      })),
      candidates: candidates.map(row => ({
        ...row,
        exploration: epsilon / candidates.length,
        priority: row.score === best ? (1 - epsilon) / bestCount : 0,
        next: epsilon / candidates.length + (row.score === best ? (1 - epsilon) / bestCount : 0)
      }))
    };
  }
  function candidatesFor(task, schemes) {
    return (task && task.candidates || []).map(member => ({
      ...member,
      scheme: schemes.find(s => s.id === member.config_id)
    }));
  }
  function feedbackRows(task, schemes, report) {
    const empty = report && report.statistics_version === 'prose-draw-statistics.v2' ? {
      market_wins: 0,
      market_losses: 0,
      market_win_rate: null,
      capped_wins: 0,
      capped_losses: 0,
      capped_win_rate: null,
      feedback_users: 0,
      presented: 0,
      rejected_all: 0,
      pending_feedback: 0,
      current_adoptions: 0,
      reselection_count: 0,
      allocated: 0,
      execution_success: 0,
      execution_failure: 0,
      in_flight: 0
    } : {};
    return candidatesFor(task, schemes).map(member => ({
      ...member,
      id: member.config_id,
      statistics: (report && report.configs || []).find(item => item.config_id === member.config_id) || empty,
      policy: (report && report.candidate_policies || []).find(item => item.config_id === member.config_id) || (report?.candidate_policies_scope === 'historical_baseline_uncached' ? {config_id: member.config_id} : member)
    }));
  }
  function displayChoice(round, id) {
    const index = (round.display_order || []).indexOf(id);
    return id && index >= 0 ? String.fromCharCode(65 + index) : '未取得选择身份';
  }
  function firstFeedback(events) {
    return events.find(event => event.type === 'reject_all' || event.type === 'adopted' && event.payload?.reselection !== true);
  }
  function selectionLabel(round, id) {
    if (!id) return null;
    const item = (round.candidates || []).find(candidate => candidate.candidate_id === id);
    return item ? item.role === 'official' ? '比较基准' : '候选方案' : null;
  }
  function createApi(request) {
    const base = '/api/admin/prose-draw';
    function read(path, params, signal) {
      const query = new URLSearchParams();
      Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') query.set(key, String(value));
      });
      return request(base + path + (query.size ? '?' + query.toString() : ''), {
        signal
      });
    }
    function write(method, path, body, key) {
      return request(base + path, {
        method,
        body: JSON.stringify(body),
        ...(key ? {
          headers: {
            'Idempotency-Key': key
          }
        } : {})
      });
    }
    const taskPath = id => '/evaluation-tasks/' + encodeURIComponent(id);
    return {
      settings: signal => read('/settings', null, signal),
      context: signal => read('/context', null, signal),
      configs: signal => read('/config-versions', null, signal),
      tasks: signal => read('/evaluation-tasks', null, signal),
      allocations: signal => read('/allocation-preview', null, signal),
      statistics: (id, guided, signal, baselineId) => read('/statistics/' + encodeURIComponent(id), {
        has_chapter_guidance: guided,
        baseline_config_id: baselineId
      }, signal),
      rounds: (id, params, signal) => read(taskPath(id) + '/rounds', params, signal),
      round: (id, roundId, signal) => read(taskPath(id) + '/rounds/' + encodeURIComponent(roundId), null, signal),
      history: (id, signal) => read(taskPath(id) + '/routing-history', null, signal),
      setEnabled: body => write('PUT', '/settings', body),
      schemeReferences: (id, signal) => read('/schemes/' + encodeURIComponent(id) + '/references', null, signal),
      deleteScheme: id => write('DELETE', '/schemes/' + encodeURIComponent(id)),
      createConfig: (body, key) => write('POST', '/config-versions', body, key),
      createTask: (body, key) => write('POST', '/evaluation-tasks', body, key),
      updateTask: (id, body) => write('PATCH', taskPath(id), body),
      candidate: (id, body) => write('PUT', taskPath(id) + '/candidates', body)
    };
  }
  return {
    number,
    percent,
    count,
    weight,
    versionLabel,
    same,
    equivalent,
    changes,
    isV2,
    routingForm,
    validRouting,
    draftAllocation,
    candidatesFor,
    feedbackRows,
    selectionLabel,
    displayChoice,
    firstFeedback,
    createApi
  };
});
