{
/* ===== Assistant merged field-edit card (BNM-058, FD-177) =====
   One card for parallel edits of one resource: folded summary by default,
   expandable checklist with per-item comparison, one decision for the group. */
(function () {
  const Action = window.AssistantActionCore;
  const Group = window.AssistantFieldGroupCore;
  const FieldReview = window.AssistantFieldReview || {};
  const FieldCore = window.AssistantFieldReviewCore;
  function copy(key, values) {
    return Action.interpolate(TC(key), values);
  }
  function itemLabel(action) {
    const localize = window.L || (value => value && value.zh);
    return FieldCore && FieldCore.fieldLabel(null, action, localize) || action.arguments && action.arguments.path || "";
  }
  function previewText(action) {
    const value = Group.proposedValue(action);
    return FieldCore ? FieldCore.asText(value) : String(value == null ? "" : value);
  }
  function GroupItem({
    action,
    checked,
    deciding,
    locked,
    onToggle,
    api
  }) {
    const [open, setOpen] = React.useState(false);
    const review = FieldReview.useFieldReview ? FieldReview.useFieldReview(action, open && deciding, null, api) : {
      loading: false,
      review: null,
      error: null
    };
    const label = itemLabel(action);
    const settled = !deciding;
    const result = action.state === "succeeded" ? "asst_group_item_saved" : action.state === "rejected" ? "asst_group_item_skipped" : null;
    return /*#__PURE__*/React.createElement("li", {
      className: "asst-group__item" + (checked ? "" : " asst-group__item--off")
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-group__row"
    }, settled ? null : /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      className: "asst-group__check",
      checked: checked,
      disabled: locked,
      "aria-label": label,
      onChange: () => onToggle(action.id)
    }), /*#__PURE__*/React.createElement("span", {
      className: "asst-group__label"
    }, label), open ? /*#__PURE__*/React.createElement("span", {
      className: "asst-group__spacer"
    }) : /*#__PURE__*/React.createElement("span", {
      className: "asst-group__preview"
    }, previewText(action)), result ? /*#__PURE__*/React.createElement("span", {
      className: "asst-group__result" + (action.state === "succeeded" ? " asst-group__result--ok" : "")
    }, copy(result)) : null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "asst-group__toggle",
      "aria-expanded": open,
      onClick: () => setOpen(value => !value)
    }, copy(open ? "asst_group_compare_close" : "asst_group_compare"))), open ? review.loading ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__note",
      role: "status"
    }, copy("asst_field_loading")) : review.error ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__review-error",
      role: "alert"
    }, copy("asst_field_unavailable")) : FieldReview.FieldDiff ? /*#__PURE__*/React.createElement(FieldReview.FieldDiff, {
      kind: FieldCore.inferFieldKind(review.review ? review.review.before : undefined, Group.proposedValue(action)),
      before: review.review ? review.review.before : "",
      after: Group.proposedValue(action),
      copy: TC
    }) : null : null);
  }
  function FieldGroupCard({
    card,
    busy,
    waiting,
    onDecide,
    api
  }) {
    const members = card.actions;
    const first = members[0];
    const presentation = Action.actionPresentation(first, copy);
    const deciding = Group.isDeciding(card);
    const pending = card.state === "pending";
    const recovering = card.state === "executing" || card.state === "ambiguous";
    const historical = members.some(member => member.version_current === false);
    const [expanded, setExpanded] = React.useState(false);
    const [excluded, setExcluded] = React.useState([]);
    const locked = busy || waiting || historical || !pending;
    const selected = Group.selectedCount(card, excluded);
    const summary = card.state === "succeeded" ? copy("asst_group_saved_summary", {
      saved: members.filter(member => member.state === "succeeded").length,
      skipped: members.filter(member => member.state === "rejected").length
    }) : members.map(itemLabel).join("、");
    const toggle = id => setExcluded(list => list.includes(id) ? list.filter(item => item !== id) : list.concat([id]));
    const failure = members.find(member => ["failed", "conflict"].includes(member.state));
    return /*#__PURE__*/React.createElement("section", {
      className: "asst-action asst-action--write asst-group" + (deciding ? "" : " asst-action--settled"),
      "aria-label": presentation.title
    }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", {
      className: "asst-action__heading"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "asst-action__title"
    }, presentation.title), pending ? /*#__PURE__*/React.createElement("span", {
      className: "asst-action__badge"
    }, TC("asst_pending")) : null, presentation.showBook === false ? null : /*#__PURE__*/React.createElement("p", {
      className: "asst-action__book" + (presentation.bookAvailable ? "" : " asst-action__book--unavailable")
    }, presentation.bookLabel))), /*#__PURE__*/React.createElement("dl", {
      className: "asst-action__facts"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-action__fact"
    }, /*#__PURE__*/React.createElement("dt", null, TC("asst_field_object")), /*#__PURE__*/React.createElement("dd", null, FieldCore ? FieldCore.objectLabel(null, first, window.L || (value => value && value.zh)) : "")), /*#__PURE__*/React.createElement("div", {
      className: "asst-action__fact"
    }, /*#__PURE__*/React.createElement("dt", null, TC("asst_field_name")), /*#__PURE__*/React.createElement("dd", null, copy("asst_group_field_count", {
      count: members.length
    })))), failure ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__review-error",
      role: "alert"
    }, failure.error_detail || TC("asst_group_failed")) : null, /*#__PURE__*/React.createElement("div", {
      className: "asst-group__fold"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "asst-group__bar",
      "aria-expanded": expanded,
      onClick: () => setExpanded(value => !value)
    }, /*#__PURE__*/React.createElement("span", {
      className: "asst-group__caret" + (expanded ? " asst-group__caret--open" : ""),
      "aria-hidden": "true"
    }, "\u203A"), /*#__PURE__*/React.createElement("span", {
      className: "asst-group__summary"
    }, expanded ? "" : summary), /*#__PURE__*/React.createElement("span", {
      className: "asst-group__fold-action"
    }, copy(expanded ? "asst_group_collapse" : "asst_group_expand"))), expanded ? /*#__PURE__*/React.createElement("ol", {
      className: "asst-group__items"
    }, members.map(member => /*#__PURE__*/React.createElement(GroupItem, {
      key: member.id,
      action: member,
      checked: !excluded.includes(member.id),
      deciding: deciding,
      locked: locked,
      onToggle: toggle,
      api: api
    }))) : null), deciding ? /*#__PURE__*/React.createElement(React.Fragment, null, recovering ? /*#__PURE__*/React.createElement("p", {
      className: "asst-action__state asst-action__state--" + card.state
    }, TC(card.state === "ambiguous" ? "asst_unknown" : "asst_executing_recovery")) : /*#__PURE__*/React.createElement("p", {
      className: "asst-action__note"
    }, copy(presentation.bookAvailable ? "asst_group_note" : "asst_group_note_unavailable", {
      title: presentation.bookTitle || ""
    })), /*#__PURE__*/React.createElement("div", {
      className: "asst-action__buttons"
    }, pending ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn ghost",
      disabled: locked,
      onClick: () => onDecide(card, "reject")
    }, TC("asst_reject")) : null, pending && FieldReview.ReviseForm ? /*#__PURE__*/React.createElement(FieldReview.ReviseForm, {
      action: first,
      busy: busy,
      disabled: locked,
      copy: TC,
      onRevise: (_action, instruction) => onDecide(card, "revise", {
        instruction
      })
    }) : null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-btn primary",
      disabled: locked && !recovering || busy || waiting || selected === 0,
      onClick: () => onDecide(card, "confirm", {
        excluded
      })
    }, busy ? TC("asst_executing") : recovering ? TC("asst_check_recover") : copy("asst_group_confirm", {
      count: selected
    })))) : null);
  }
  window.AssistantFieldGroupCard = FieldGroupCard;
})();
}
