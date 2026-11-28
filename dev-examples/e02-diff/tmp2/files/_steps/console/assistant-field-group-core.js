/* ===== Assistant merged field-edit card: grouping and request shape (BNM-058) ===== */
(function (root) {
  const DECIDING_STATES = ["pending", "pending_confirmation", "executing", "ambiguous", "unknown"];

  function groupOf(action) {
    const group = action && action.field_group;
    return group && typeof group.id === "string" && Array.isArray(group.action_ids) && group.action_ids.length >= 2
      ? group : null;
  }

  function aggregateState(actions) {
    const states = actions.map((item) => item && item.state);
    if (states.some((state) => state === "executing")) return "executing";
    if (states.some((state) => state === "ambiguous" || state === "unknown")) return "ambiguous";
    if (states.some((state) => state === "pending" || state === "pending_confirmation")) return "pending";
    if (states.every((state) => state === "expired")) return "expired";
    return states.find((state) => state === "succeeded") || states[0] || "pending";
  }

  /* Replace complete groups in a card list with one card item at the first member's position. */
  function groupCards(cards) {
    const list = Array.isArray(cards) ? cards : [];
    const byId = new Map(list.map((item) => [item && item.id, item]));
    const emitted = new Set();
    const result = [];
    for (const item of list) {
      const group = groupOf(item);
      const members = group ? group.action_ids.map((id) => byId.get(id)) : null;
      if (!group || members.some((member) => !member)) {
        result.push(item);
        continue;
      }
      if (emitted.has(group.id)) continue;
      emitted.add(group.id);
      result.push(Object.assign({}, members[0], {
        id: group.id,
        kind: "field_group",
        actions: members,
        state: aggregateState(members),
        continuation_pending: members.some((member) => member.continuation_pending)
      }));
    }
    return result;
  }

  function isGroupCard(item) {
    return !!(item && item.kind === "field_group" && Array.isArray(item.actions));
  }

  function isDeciding(card) {
    return isGroupCard(card) && card.actions.some((member) => DECIDING_STATES.includes(member.state));
  }

  function decisionBody(card, decision, options) {
    const opts = options || {};
    const actions = isGroupCard(card) ? card.actions : [];
    const body = {
      decision: decision,
      action_ids: actions.map((member) => member.id),
      arguments_hashes: Object.fromEntries(actions.map((member) => [member.id, member.arguments_hash])),
      excluded_action_ids: decision === "confirm" ? (opts.excluded || []).filter((id) => actions.some((member) => member.id === id)) : []
    };
    if (decision === "revise") body.instruction = opts.instruction;
    return body;
  }

  function selectedCount(card, excluded) {
    const skip = new Set(excluded || []);
    return isGroupCard(card) ? card.actions.filter((member) => !skip.has(member.id)).length : 0;
  }

  function proposedValue(action) {
    const raw = action && action.arguments && action.arguments.value_json;
    if (typeof raw !== "string") return raw;
    try { return JSON.parse(raw); } catch (error) { return raw; }
  }

  root.AssistantFieldGroupCore = {
    groupCards,
    isGroupCard,
    isDeciding,
    decisionBody,
    selectedCount,
    proposedValue,
    aggregateState
  };
})(typeof window !== "undefined" ? window : globalThis);
