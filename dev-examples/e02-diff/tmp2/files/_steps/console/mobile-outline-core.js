/* Phone chapter outline data (FD-176): pure helpers that turn the mapped outline and world state into
   what the phone page shows. Field descriptors drive the shared view/edit/rewrite sheet. */
(function () {
  const POINTS_PREVIEW = 4;
  const ANCHORS = ['hook', 'climax', 'close', 'nextlink'];

  function chapterNumber(value) {
    const match = String(value == null ? '' : value).match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  function list(value) { return Array.isArray(value) ? value : []; }

  // World state at the end of this chapter: time, counts and the forces or undercurrents this chapter moved.
  function worldSummary(wsm, chapter, text) {
    if (!wsm || typeof wsm !== 'object') return null;
    const forces = list(wsm.forces), undercurrents = list(wsm.undercurrents), offCamera = list(wsm.off_camera);
    const time = text(wsm.world_time);
    if (!time && !forces.length && !undercurrents.length && !offCamera.length) return null;
    const no = Number(chapter);
    const changes = forces.filter(item => chapterNumber(item.source) === no).map(item => ({ kind: 'force', distance: item.distance, name: text(item.name), status: text(item.status) }))
      .concat(undercurrents.filter(item => chapterNumber(item.last) === no).map(item => ({ kind: 'under', name: text(item.name), status: text(item.status) })));
    return { time, forces: forces.length, undercurrents: undercurrents.length, offCamera: offCamera.length, changes };
  }

  // New entries are listed in full; advanced or resolved ones collapse to their ids grouped by operation.
  function ledgerGroup(items) {
    const rows = list(items).map((item, index) => ({ ...item, index }));
    const others = {};
    rows.filter(item => item.op !== 'new').forEach(item => { (others[item.op] = others[item.op] || []).push(item); });
    return { listed: rows.filter(item => item.op === 'new'), others: Object.keys(others).map(op => ({ op, items: others[op] })), count: rows.length };
  }

  function ledgerSummary(detail) {
    const foreshadow = ledgerGroup(detail && detail.foreshadow), debts = ledgerGroup(detail && detail.debts);
    return { foreshadow, debts, total: foreshadow.count + debts.count };
  }

  function volumeLabel(data, chapter, text) {
    const chapters = list(data && data.chapters), volumes = list(data && data.volumes);
    const row = chapters.find(item => Number(item.no) === Number(chapter));
    if (!row || row.vol == null) return '';
    const volume = volumes.find(item => item.vnum === row.vol);
    return volume ? [text(volume.no), text(volume.name)].filter(Boolean).join(' · ') : '';
  }

  function joined(value, text) { return Array.isArray(value) ? value.map(item => text(item)).join('；') : text(value); }

  // A field key names one editable outline value: 'pos', 'points.2', 'anchors.hook', 'foreshadow.0', ...
  function fieldPath(key) {
    const [head, rest] = String(key || '').split('.');
    if (['pos', 'target', 'worldtime', 'dilemma', 'know', 'dontknow'].includes(head) && rest === undefined) return [head];
    if (head === 'anchors' && ANCHORS.includes(rest)) return ['anchors', rest];
    if ((head === 'points' || head === 'foreshadow' || head === 'debts') && /^\d+$/.test(rest || '')) {
      return head === 'points' ? ['points', Number(rest)] : [head, Number(rest), 't'];
    }
    return null;
  }

  function fieldValue(detail, path, text) {
    if (!detail || !path) return null;
    if (path[0] === 'know' || path[0] === 'dontknow') return joined(detail[path[0]], text);
    if (path[0] === 'anchors') return detail.anchors ? text(detail.anchors[path[1]]) : null;
    if (path[0] === 'points') { const item = list(detail.points)[path[1]]; return item == null ? null : text(item); }
    if (path[0] === 'foreshadow' || path[0] === 'debts') { const item = list(detail[path[0]])[path[1]]; return item ? text(item.t) : null; }
    return text(detail[path[0]]);
  }

  // Position inside a list the sheet can step through (plot points only).
  function fieldStep(detail, key) {
    const path = fieldPath(key);
    if (!path || path[0] !== 'points') return null;
    const total = list(detail && detail.points).length;
    return { index: path[1], total, prev: path[1] > 0 ? 'points.' + (path[1] - 1) : null, next: path[1] < total - 1 ? 'points.' + (path[1] + 1) : null };
  }

  window.MobileOutlineCore = Object.freeze({ POINTS_PREVIEW, ANCHORS, chapterNumber, worldSummary, ledgerSummary, volumeLabel, joined, fieldPath, fieldValue, fieldStep });
})();
