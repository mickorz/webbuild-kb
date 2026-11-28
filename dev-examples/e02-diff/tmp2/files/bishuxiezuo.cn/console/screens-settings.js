{
/* ===== 个人中心 / 设置（双语 · 与控制台一体） ===== */
const SD = window.CONSOLE_DATA;
const SL = window.L,
  STC = window.TC;
const {
  useEffect: sUseEffect,
  useState: sUseState
} = React;
const SettingsDataTable = window.AdminDataTable;
const PersonalCreditLedger = window.PersonalCreditLedger;

/* ---- local icon set (stroke, 24x24) ---- */
function SIcon({
  n,
  s = 20,
  w = 1.7,
  style
}) {
  const map = {
    user: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "8",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M4 20c0-4 4-6 8-6s8 2 8 6"
    })),
    chart: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M4 20V4M4 20h16"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 20v-6M12 20v-9M16 20v-4"
    })),
    card: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "5",
      width: "18",
      height: "14",
      rx: "2.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M3 10h18M7 15h4"
    })),
    sliders: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M4 8h16M4 16h16"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "14",
      cy: "8",
      r: "2.5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "9",
      cy: "16",
      r: "2.5"
    })),
    shield: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 3l8 3v6c0 4.5-3.2 7.5-8 9-4.8-1.5-8-4.5-8-9V6z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 12l2 2 4-4"
    })),
    mail: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "5",
      width: "18",
      height: "14",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M3 7l9 6 9-6"
    })),
    lock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "4",
      y: "11",
      width: "16",
      height: "9",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 11V8a4 4 0 0 1 8 0v3"
    })),
    key: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "8",
      cy: "15",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M11 12l9-9M16 7l3 3M14 9l2 2"
    })),
    monitor: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "13",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 21h6M12 17v4"
    })),
    logout: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 17l5-5-5-5M21 12H9"
    })),
    edit: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 20h9"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"
    })),
    flame: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5 0 1 1 1.5 1.5 1.5C9 8 11 6 12 3z"
    })),
    sparkle: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"
    })),
    check: /*#__PURE__*/React.createElement("path", {
      d: "M20 6L9 17l-5-5"
    }),
    link: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M9 12a3 3 0 0 1 3-3h3a3 3 0 0 1 0 6h-1"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M15 12a3 3 0 0 1-3 3H9a3 3 0 0 1 0-6h1"
    })),
    chevron: /*#__PURE__*/React.createElement("path", {
      d: "M9 6l6 6-6 6"
    }),
    pen: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 20h9"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"
    })),
    bolt: /*#__PURE__*/React.createElement("path", {
      d: "M13 2L4 14h7l-1 8 9-12h-7z"
    }),
    grid: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "3",
      width: "7",
      height: "7",
      rx: "1.5"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "3",
      width: "7",
      height: "7",
      rx: "1.5"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "14",
      width: "7",
      height: "7",
      rx: "1.5"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "14",
      width: "7",
      height: "7",
      rx: "1.5"
    }))
  };
  return /*#__PURE__*/React.createElement("svg", {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: w,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, map[n]);
}
const tintColor = t => t === 'gold' ? 'var(--gold-deep)' : t === 'terra' ? 'var(--terra)' : t === 'slate' ? 'var(--slate)' : 'var(--gold-deep)';

/* ---------- shared bits ---------- */
function MetaRow({
  u
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "set-metarow"
  }, /*#__PURE__*/React.createElement("span", null, STC('set_joined'), " ", /*#__PURE__*/React.createElement("b", null, SL(u.joined))), /*#__PURE__*/React.createElement("span", {
    className: "mdot"
  }), /*#__PURE__*/React.createElement("span", {
    className: "c-latin",
    style: {
      color: 'var(--gold-deep)'
    }
  }, u.home), /*#__PURE__*/React.createElement("span", {
    className: "mdot"
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, u.stats.works), " ", STC('set_works_unit')), /*#__PURE__*/React.createElement("span", {
    className: "mdot"
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, u.stats.chapters), " ", STC('set_u_chap')));
}

/* ---------- profile header (view + edit mode) ---------- */
function HeaderA({
  u,
  toast,
  editing,
  onStartEdit,
  onCancel,
  onSave,
  saving
}) {
  const [draft, setDraft] = sUseState({
    displayName: '',
    bio: ''
  });
  const en = window.CLANG === 'en';
  const beginEdit = () => {
    setDraft({
      displayName: u.penName && typeof u.penName === 'object' ? u.penName.zh : u.penName || '',
      bio: u.motto && typeof u.motto === 'object' ? u.motto.zh : u.motto || ''
    });
    onStartEdit();
  };
  const handleSave = () => {
    const displayName = (draft.displayName || '').trim();
    const bio = (draft.bio || '').trim();
    if (!displayName) {
      toast(en ? 'Pen name cannot be empty' : '笔名不能为空');
      return;
    }
    if (displayName.length > 80) {
      toast(en ? 'Pen name too long (max 80)' : '笔名过长，最多 80 字');
      return;
    }
    if (bio.length > 500) {
      toast(en ? 'Bio too long (max 500)' : '简介过长，最多 500 字');
      return;
    }
    onSave({
      display_name: displayName,
      bio: bio || null
    });
  };
  if (editing) {
    return /*#__PURE__*/React.createElement("div", {
      className: "set-hcard",
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        position: 'absolute',
        top: 14,
        right: 16,
        zIndex: 1
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "c-btn sm",
      onClick: onCancel,
      disabled: saving
    }, en ? 'Cancel' : '取消'), /*#__PURE__*/React.createElement("button", {
      className: "c-btn gold sm",
      onClick: handleSave,
      disabled: saving
    }, saving ? /*#__PURE__*/React.createElement("span", {
      className: "c-shimmer"
    }, en ? 'Saving...' : '保存中...') : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SIcon, {
      n: "check",
      s: 12,
      w: 2.4
    }), en ? 'Save' : '保存'))), /*#__PURE__*/React.createElement("div", {
      className: "set-seal-lg",
      style: {
        opacity: 0.6
      }
    }, (draft.displayName || '?')[0]), /*#__PURE__*/React.createElement("div", {
      className: "set-hcard-info"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: {
        fontSize: 12,
        color: 'var(--ink-3)',
        display: 'block',
        marginBottom: 4
      }
    }, en ? 'Pen name' : '笔名'), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: draft.displayName,
      onChange: e => setDraft(d => ({
        ...d,
        displayName: e.target.value
      })),
      maxLength: 80,
      placeholder: en ? 'Your pen name' : '你的笔名',
      style: {
        width: '100%',
        maxWidth: 360,
        padding: '7px 12px',
        fontSize: 15,
        border: '1px solid var(--line)',
        borderRadius: 6,
        background: 'var(--card)',
        color: 'var(--ink)',
        outline: 'none',
        fontFamily: 'inherit'
      },
      onFocus: e => {
        e.target.style.borderColor = 'var(--gold)';
        e.target.style.boxShadow = '0 0 0 2px oklch(0.78 0.13 72 / 0.15)';
      },
      onBlur: e => {
        e.target.style.borderColor = 'var(--line)';
        e.target.style.boxShadow = 'none';
      }
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: {
        fontSize: 12,
        color: 'var(--ink-3)',
        display: 'block',
        marginBottom: 4
      }
    }, en ? 'Bio' : '个人简介'), /*#__PURE__*/React.createElement("textarea", {
      value: draft.bio,
      onChange: e => setDraft(d => ({
        ...d,
        bio: e.target.value
      })),
      maxLength: 500,
      rows: 3,
      placeholder: en ? 'A few words about yourself...' : '写几句话介绍自己...',
      style: {
        width: '100%',
        maxWidth: 480,
        padding: '7px 12px',
        fontSize: 14,
        border: '1px solid var(--line)',
        borderRadius: 6,
        background: 'var(--card)',
        color: 'var(--ink)',
        outline: 'none',
        fontFamily: 'inherit',
        resize: 'vertical',
        lineHeight: 1.6
      },
      onFocus: e => {
        e.target.style.borderColor = 'var(--gold)';
        e.target.style.boxShadow = '0 0 0 2px oklch(0.78 0.13 72 / 0.15)';
      },
      onBlur: e => {
        e.target.style.borderColor = 'var(--line)';
        e.target.style.boxShadow = 'none';
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: 'var(--ink-3)',
        marginTop: 3,
        textAlign: 'right'
      }
    }, (draft.bio || '').length, " / 500"))), /*#__PURE__*/React.createElement(MetaRow, {
      u: u
    })));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "set-hcard"
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm set-edit-btn",
    onClick: beginEdit
  }, /*#__PURE__*/React.createElement(SIcon, {
    n: "edit",
    s: 13
  }), STC('set_edit')), /*#__PURE__*/React.createElement("div", {
    className: "set-seal-lg"
  }, u.seal), /*#__PURE__*/React.createElement("div", {
    className: "set-hcard-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-namerow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "set-pen"
  }, SL(u.penName)), /*#__PURE__*/React.createElement("span", {
    className: "set-handle"
  }, u.handle), /*#__PURE__*/React.createElement("span", {
    className: "c-badge gold"
  }, SL(u.role))), /*#__PURE__*/React.createElement("p", {
    className: "set-motto"
  }, SL(u.motto)), /*#__PURE__*/React.createElement(MetaRow, {
    u: u
  })));
}
function fmtJoined(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return {
    zh: d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月',
    en: d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    })
  };
}
function ProfilePanel({
  u,
  toast,
  onUserUpdate
}) {
  const en = STC('set_title') === 'Account';
  const [editing, setEditing] = sUseState(false);
  const [saving, setSaving] = sUseState(false);

  // Hydrate the demo seed with the real account on mount (bio + join date live
  // in /profile, which the lighter /auth/me snapshot doesn't carry).
  React.useEffect(() => {
    if (!window.LF_API || !window.LF_API.getProfile) return;
    let alive = true;
    window.LF_API.getProfile().then(p => {
      if (!alive || !p) return;
      if (p.display_name) {
        u.penName = {
          zh: p.display_name,
          en: p.display_name
        };
        u.seal = p.display_name[0] || u.seal;
        u.home = 'novelbuilt.ai/@' + p.display_name;
      }
      if (p.email) u.email = p.email;
      if (p.bio != null) u.motto = {
        zh: p.bio || '',
        en: p.bio || ''
      };
      const joined = p.created_at && fmtJoined(p.created_at);
      if (joined) u.joined = joined;
      if (onUserUpdate) onUserUpdate();
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const handleSave = async payload => {
    setSaving(true);
    try {
      if (window.LF_API) {
        const updated = await window.LF_API.updateProfile(payload);
        // Sync back into CONSOLE_DATA.user so the view reflects the change
        if (updated) {
          if (updated.display_name != null) {
            u.penName = {
              zh: updated.display_name,
              en: updated.display_name
            };
            u.seal = updated.display_name[0] || '砚';
            u.home = 'novelbuilt.ai/@' + updated.display_name;
          }
          if (updated.bio != null) u.motto = {
            zh: updated.bio || '',
            en: updated.bio || ''
          };
        }
      }
      setEditing(false);
      toast(en ? 'Profile saved' : '资料已保存');
      if (onUserUpdate) onUserUpdate();
    } catch (err) {
      toast(err.message || (en ? 'Save failed' : '保存失败'));
    } finally {
      setSaving(false);
    }
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "set-panel-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "set-panel-t"
  }, STC('set_profile')))), /*#__PURE__*/React.createElement(HeaderA, {
    u: u,
    toast: toast,
    editing: editing,
    saving: saving,
    onStartEdit: () => setEditing(true),
    onCancel: () => setEditing(false),
    onSave: handleSave
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "set-cardlab",
    style: {
      marginLeft: 2
    }
  }, en ? 'Basic info' : '基本资料'), /*#__PURE__*/React.createElement("div", {
    className: "set-fieldgrid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fk"
  }, en ? 'Pen name' : '笔名'), /*#__PURE__*/React.createElement("span", {
    className: "fv"
  }, SL(u.penName))), /*#__PURE__*/React.createElement("div", {
    className: "set-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fk"
  }, "Handle"), /*#__PURE__*/React.createElement("span", {
    className: "fv mono"
  }, u.handle)), /*#__PURE__*/React.createElement("div", {
    className: "set-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fk"
  }, en ? 'Role' : '身份'), /*#__PURE__*/React.createElement("span", {
    className: "fv"
  }, SL(u.role))), /*#__PURE__*/React.createElement("div", {
    className: "set-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fk"
  }, STC('set_email')), /*#__PURE__*/React.createElement("span", {
    className: "fv mono"
  }, u.email)), /*#__PURE__*/React.createElement("div", {
    className: "set-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fk"
  }, STC('set_joined')), /*#__PURE__*/React.createElement("span", {
    className: "fv"
  }, SL(u.joined))), /*#__PURE__*/React.createElement("div", {
    className: "set-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fk"
  }, STC('set_home')), /*#__PURE__*/React.createElement("span", {
    className: "fv mono",
    style: {
      color: 'var(--gold-deep)'
    }
  }, u.home)))));
}

/* ---------- almanac ---------- */
function buildHeat() {
  const weeks = 53,
    total = weeks * 7;
  let seed = 20240607;
  const rnd = () => {
    seed = seed * 1103515245 + 12345 & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const cells = [];
  for (let i = 0; i < total; i++) {
    const fromEnd = total - 1 - i,
      dow = i % 7;
    const recency = 1 - fromEnd / total;
    let p = 0.42 + recency * 0.4;
    if (dow === 0 || dow === 6) p -= 0.12;
    let lvl = 0;
    if (rnd() < p) {
      lvl = 1 + Math.floor(rnd() * (1 + recency * 3.4));
      if (lvl > 4) lvl = 4;
    }
    if (fromEnd < 28 && lvl < 1) lvl = 1 + Math.floor(rnd() * 3);
    cells.push(lvl);
  }
  return cells;
}
const HEAT_BG = ['var(--paper-3)', 'color-mix(in srgb,var(--gold) 30%,var(--card))', 'color-mix(in srgb,var(--gold) 58%,var(--card))', 'var(--gold)', 'var(--gold-deep)'];
function AlmanacPanel({
  u
}) {
  const st = u.stats;
  const cells = buildHeat();
  const note = STC('set_heat_days').replace('{n}', st.activeDays).replace('{s}', st.streak);
  const subs = [{
    ic: 'pen',
    n: st.monthWords,
    l: STC('set_s_month'),
    v: SL
  }, {
    ic: 'bolt',
    n: st.agentRuns,
    l: STC('set_s_agent'),
    u: STC('set_u_times')
  }, {
    ic: 'sparkle',
    n: st.foreshadow,
    l: STC('set_s_fore'),
    u: STC('set_u_places')
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "set-panel-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "set-panel-t"
  }, STC('set_almanac')), /*#__PURE__*/React.createElement("p", {
    className: "set-panel-d"
  }, STC('set_almanac_sub')))), /*#__PURE__*/React.createElement("div", {
    className: "set-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-hstat feature"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "hn"
  }, SL(st.words)), /*#__PURE__*/React.createElement("span", {
    className: "hu"
  }, SL(st.wordsU))), /*#__PURE__*/React.createElement("div", {
    className: "hl"
  }, STC('set_s_words'))), /*#__PURE__*/React.createElement("div", {
    className: "set-hstat"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "hn"
  }, st.works)), /*#__PURE__*/React.createElement("div", {
    className: "hl"
  }, STC('set_s_works'))), /*#__PURE__*/React.createElement("div", {
    className: "set-hstat"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "hn"
  }, st.chapters)), /*#__PURE__*/React.createElement("div", {
    className: "hl"
  }, STC('set_s_chap'))), /*#__PURE__*/React.createElement("div", {
    className: "set-hstat"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "hn"
  }, st.streak), /*#__PURE__*/React.createElement("span", {
    className: "hu"
  }, STC('set_streak_unit'))), /*#__PURE__*/React.createElement("div", {
    className: "hl"
  }, STC('set_s_streak')))), /*#__PURE__*/React.createElement("div", {
    className: "set-substats"
  }, subs.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "set-sub"
  }, /*#__PURE__*/React.createElement("span", {
    className: "si"
  }, /*#__PURE__*/React.createElement(SIcon, {
    n: s.ic,
    s: 18
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sn c-latin"
  }, s.v ? s.v(s.n) : s.n, s.u ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--ink-3)',
      fontFamily: 'var(--sans)',
      marginLeft: 3
    }
  }, s.u) : null), /*#__PURE__*/React.createElement("div", {
    className: "sl"
  }, s.l))))), /*#__PURE__*/React.createElement("div", {
    className: "set-card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 16,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-cardlab",
    style: {
      margin: 0
    }
  }, STC('set_heat')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--ink-3)'
    }
  }, STC('set_heat_sub'))), /*#__PURE__*/React.createElement("div", {
    className: "set-heatwrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-heatgrid"
  }, cells.map((lv, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "set-cell",
    style: {
      background: HEAT_BG[lv]
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "set-heatfoot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-heatnote",
    dangerouslySetInnerHTML: {
      __html: note.replace(/(\d[\d,]*)/g, '<b>$1</b>')
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "set-heatlegend"
  }, /*#__PURE__*/React.createElement("span", null, STC('set_less')), HEAT_BG.map((b, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "lc",
    style: {
      background: b
    }
  })), /*#__PURE__*/React.createElement("span", null, STC('set_more'))))));
}

/* ---------- billing ---------- */
function CreditRing({
  used,
  total,
  centerValue,
  centerLabel
}) {
  const R = 46,
    C = 2 * Math.PI * R;
  const left = total - used,
    frac = total > 0 ? left / total : 0;
  const val = centerValue != null ? centerValue : left.toLocaleString();
  const lab = centerLabel != null ? centerLabel : STC('set_credit_left');
  return /*#__PURE__*/React.createElement("svg", {
    className: "set-ring",
    width: "120",
    height: "120",
    viewBox: "0 0 120 120"
  }, /*#__PURE__*/React.createElement("circle", {
    className: "set-ring-track",
    cx: "60",
    cy: "60",
    r: R
  }), /*#__PURE__*/React.createElement("circle", {
    className: "set-ring-arc",
    cx: "60",
    cy: "60",
    r: R,
    transform: "rotate(-90 60 60)",
    strokeDasharray: C,
    strokeDashoffset: C * (1 - frac)
  }), /*#__PURE__*/React.createElement("text", {
    x: "60",
    y: "55",
    textAnchor: "middle",
    style: {
      fontFamily: 'var(--latin)',
      fontSize: 26,
      fontWeight: 500,
      fill: 'var(--ink)'
    }
  }, val), /*#__PURE__*/React.createElement("text", {
    x: "60",
    y: "74",
    textAnchor: "middle",
    style: {
      fontFamily: 'var(--sans)',
      fontSize: 11,
      fill: 'var(--ink-3)'
    }
  }, lab));
}
/* ---- billing helpers ---- */
const creditsOf = m => Math.round((Number(m) || 0) / 1000);
/* Per-action 笔力 cost (mirrors backend task_credit_estimates; used only for
   the "≈ 可写 N 章" framing where the runtime capacity value isn't to hand). */
const COST_SINGLE = 4,
  COST_GROUP = 15,
  COST_POLISH = 4,
  COST_POSTHOC = 1;
const chaptersOf = (millis, cost) => Math.floor(creditsOf(millis) / (cost || COST_SINGLE));
const yuanOf = c => {
  const n = (Number(c) || 0) / 100;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const en = window.CLANG === 'en';
  return en ? d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
}
const catLabel = c => (window.CLANG === 'en' ? c.label_en || c.label : c.label) || c.key;
function showsCreditSources(account) {
  if (!account) return false;
  return Boolean(account.subscription_expires_at) || Number(account.subscription_available_millis) > 0 || Number(account.subscription_balance_millis) > 0 || Number(account.subscription_reserved_millis) > 0;
}
function CreditSources({
  account
}) {
  if (!showsCreditSources(account)) return null;
  const subscription = Number(account.subscription_available_millis) || 0;
  const permanent = account.permanent_available_millis != null ? Number(account.permanent_available_millis) || 0 : Math.max(0, (Number(account.available_millis) || 0) - subscription);
  return /*#__PURE__*/React.createElement("div", {
    className: "set-creditsplit"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-creditsource"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "set-creditsource-name"
  }, STC('set_credit_subscription')), /*#__PURE__*/React.createElement("div", {
    className: "set-creditsource-note"
  }, STC('set_expire_at'), " ", fmtDate(account.subscription_expires_at))), /*#__PURE__*/React.createElement("strong", null, creditsOf(subscription).toLocaleString())), /*#__PURE__*/React.createElement("div", {
    className: "set-creditsource"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "set-creditsource-name"
  }, STC('set_credit_permanent')), /*#__PURE__*/React.createElement("div", {
    className: "set-creditsource-note"
  }, STC('set_credit_permanent_note'))), /*#__PURE__*/React.createElement("strong", null, creditsOf(permanent).toLocaleString())));
}
function BillingPanel({
  u,
  toast,
  redeemRequest
}) {
  const [data, setData] = sUseState(null);
  const [view, setView] = sUseState('main');
  const redeemRequestId = redeemRequest && redeemRequest.requestId;
  React.useEffect(() => {
    if (redeemRequestId != null) setView('main');
  }, [redeemRequestId]);
  const goPricing = anchor => {
    window.location.href = '/public/site/pricing.html' + (anchor ? '#' + anchor : '');
  };
  const reload = React.useCallback(() => {
    if (!window.LF_API) return;
    window.LF_API.billingSummary().then(setData).catch(() => setData(false));
  }, []);
  React.useEffect(() => {
    reload();
  }, [reload]);

  // After a billing write (redeem/upgrade/buy): reload this panel AND refresh the
  // portal-wide account snapshot so the credit balance/badge elsewhere updates.
  const afterBillingWrite = React.useCallback(() => {
    reload();
    if (window.LF_PORTAL && window.LF_PORTAL.refreshAccount) window.LF_PORTAL.refreshAccount();
    if (window.LFAvatar) window.LFAvatar.reloadAll();
  }, [reload]);
  if (view === 'invoice') return /*#__PURE__*/React.createElement(InvoiceView, {
    onBack: () => setView('main')
  });

  // skeleton while loading — never a blank panel
  const loading = data == null;
  const sub = data && data.subscription;
  const acct = data && data.account;
  const usage = data && data.usage;
  const monthlyCredits = sub ? creditsOf(sub.monthly_credit_millis) : 0;
  const availCredits = acct ? creditsOf(acct.available_millis) : 0;
  const cap = data && data.capacity;
  const availMillis = acct ? acct.available_millis : 0;
  const capSingle = cap ? cap.chapters_single : chaptersOf(availMillis, COST_SINGLE);
  const capGroup = cap ? cap.chapters_group : chaptersOf(availMillis, COST_GROUP);
  const capPolish = cap ? cap.polishes : chaptersOf(availMillis, COST_POLISH);
  const capPostHoc = cap ? cap.post_hocs != null ? cap.post_hocs : chaptersOf(availMillis, COST_POSTHOC) : chaptersOf(availMillis, COST_POSTHOC);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "set-panel-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "set-panel-t"
  }, STC('set_billing')))), /*#__PURE__*/React.createElement("div", {
    className: "set-plancard"
  }, /*#__PURE__*/React.createElement("span", {
    className: "set-planbadge"
  }, /*#__PURE__*/React.createElement(SIcon, {
    n: "bolt",
    s: 22
  })), /*#__PURE__*/React.createElement("div", {
    className: "set-planinfo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-planname"
  }, loading ? /*#__PURE__*/React.createElement("span", {
    className: "c-shimmer"
  }, STC('set_loading')) : sub.plan_name || sub.plan_code, sub && sub.monthly_credit_millis > 0 && /*#__PURE__*/React.createElement("span", {
    className: "c-badge gold"
  }, monthlyCredits, " ", STC('set_credits_unit'), STC('price_month'))), /*#__PURE__*/React.createElement("div", {
    className: "set-plansub"
  }, sub ? (sub.auto_renew === false ? STC('set_expire_at') : STC('set_renew_at')) + ' ' + fmtDate(sub.current_period_end) : STC('set_plan_feat')), sub && sub.pending_plan_code && /*#__PURE__*/React.createElement("div", {
    className: "set-planpending"
  }, STC('set_pending_plan'), " ", sub.pending_plan_name || sub.pending_plan_code, " \xB7 ", STC(sub.pending_billing_cycle === 'yearly' ? 'set_cycle_yearly' : 'set_cycle_monthly'), " \xB7 ", fmtDate(sub.pending_effective_at), sub.pending_term_count > 1 ? ` · ${sub.pending_term_count} ${STC('set_pending_terms')}` : '')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: () => goPricing('cards')
  }, STC('set_manage')), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold sm",
    onClick: () => goPricing('cards')
  }, STC('set_upgrade')))), /*#__PURE__*/React.createElement("div", {
    className: "set-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-cardlab"
  }, STC('cap_title')), /*#__PURE__*/React.createElement("div", {
    className: "set-creditcard"
  }, /*#__PURE__*/React.createElement(CreditRing, {
    used: Math.max(0, monthlyCredits - availCredits),
    total: Math.max(monthlyCredits, availCredits, 1),
    centerValue: loading ? '…' : capSingle,
    centerLabel: STC('cap_chapter_unit')
  }), /*#__PURE__*/React.createElement("div", {
    className: "set-creditmid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cap-stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cap-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cap-k"
  }, STC('cap_single_writer')), /*#__PURE__*/React.createElement("span", {
    className: "cap-v"
  }, capSingle, " ", /*#__PURE__*/React.createElement("em", null, STC('cap_chapter_unit')))), /*#__PURE__*/React.createElement("div", {
    className: "cap-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cap-k"
  }, STC('cap_group_writer')), /*#__PURE__*/React.createElement("span", {
    className: "cap-v"
  }, capGroup, " ", /*#__PURE__*/React.createElement("em", null, STC('cap_chapter_unit')))), /*#__PURE__*/React.createElement("div", {
    className: "cap-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cap-k"
  }, STC('cap_polish_times')), /*#__PURE__*/React.createElement("span", {
    className: "cap-v"
  }, capPolish, " ", /*#__PURE__*/React.createElement("em", null, STC('cap_times_unit')))), /*#__PURE__*/React.createElement("div", {
    className: "cap-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cap-k"
  }, STC('cap_posthoc_times')), /*#__PURE__*/React.createElement("span", {
    className: "cap-v"
  }, capPostHoc, " ", /*#__PURE__*/React.createElement("em", null, STC('cap_times_unit'))))), !loading && /*#__PURE__*/React.createElement(CreditSources, {
    account: acct
  }), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    style: {
      marginTop: 14
    },
    onClick: () => goPricing('packs')
  }, /*#__PURE__*/React.createElement(SIcon, {
    n: "bolt",
    s: 13
  }), STC('set_buy')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--ink-3)',
      marginTop: 10
    }
  }, STC('cap_detail'))))), /*#__PURE__*/React.createElement(RedeemBox, {
    toast: toast,
    onDone: afterBillingWrite,
    focusRequest: redeemRequest
  }), /*#__PURE__*/React.createElement("div", {
    className: "set-secrow",
    style: {
      borderRadius: 8,
      border: '1px solid var(--line)'
    },
    onClick: () => setView('invoice'),
    role: "button"
  }, /*#__PURE__*/React.createElement("span", {
    className: "si"
  }, /*#__PURE__*/React.createElement(SIcon, {
    n: "card",
    s: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "sinfo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sname"
  }, STC('set_invoice')), /*#__PURE__*/React.createElement("div", {
    className: "sval"
  }, STC('set_invoice_sub'))), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-3)'
    }
  }, /*#__PURE__*/React.createElement(SIcon, {
    n: "chevron",
    s: 17
  }))));
}

/* ---- CDK redemption ---- */
function RedeemBox({
  toast,
  onDone,
  focusRequest
}) {
  const [code, setCode] = sUseState('');
  const [busy, setBusy] = sUseState(false);
  const boxRef = React.useRef(null),
    inputRef = React.useRef(null);
  const focusRequestId = focusRequest && focusRequest.requestId;
  React.useEffect(() => {
    if (focusRequestId == null || !inputRef.current) return;
    if (boxRef.current && boxRef.current.scrollIntoView) boxRef.current.scrollIntoView({
      block: 'center',
      behavior: 'auto'
    });
    inputRef.current.focus({
      preventScroll: true
    });
  }, [focusRequestId]);
  const submit = async () => {
    const c = (code || '').trim();
    if (!c || busy || !window.LF_API) return;
    setBusy(true);
    try {
      const r = await window.LF_API.redeemCode(c);
      toast(STC('set_redeem_ok') + (r && r.reward_millis ? ' +' + creditsOf(r.reward_millis) : ''));
      setCode('');
      if (onDone) onDone();
    } catch (err) {
      toast(err.message || STC('set_redeem_fail'));
    } finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "set-card",
    id: "settings-cdk-redeem",
    ref: boxRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-cardlab"
  }, STC('set_redeem')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--ink-3)',
      marginBottom: 10
    }
  }, STC('set_redeem_sub')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    "aria-label": STC('set_redeem'),
    value: code,
    onChange: e => setCode(e.target.value.toUpperCase()),
    onKeyDown: e => {
      if (e.key === 'Enter') submit();
    },
    placeholder: STC('set_redeem_ph'),
    maxLength: 64,
    style: {
      flex: 1,
      padding: '8px 12px',
      fontSize: 14,
      border: '1px solid var(--line)',
      borderRadius: 6,
      background: 'var(--card)',
      color: 'var(--ink)',
      fontFamily: 'var(--mono, monospace)',
      letterSpacing: '0.04em'
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold sm",
    onClick: submit,
    disabled: busy || !code.trim()
  }, busy ? /*#__PURE__*/React.createElement("span", {
    className: "c-shimmer"
  }, STC('price_processing')) : STC('set_redeem_btn'))));
}

/* ---- invoice / billing detail (secondary page) ---- */
function InvoiceView({
  onBack
}) {
  const [orders, setOrders] = sUseState(null);
  const [summary, setSummary] = sUseState(null);
  React.useEffect(() => {
    if (!window.LF_API) return;
    window.LF_API.billingOrders(100).then(setOrders).catch(() => setOrders([]));
    window.LF_API.billingSummary().then(setSummary).catch(() => setSummary(false));
  }, []);
  const acct = summary && summary.account;
  const cats = summary && summary.usage && summary.usage.by_category || [];
  const ledger = window.CreditLedgerCore;
  const lang = window.CLANG === 'en' ? 'en' : 'zh';
  const orderColumns = [{
    key: 'type',
    header: STC('inv_type'),
    priority: 'primary',
    sortable: false,
    render: order => ledger.orderTitle(order, lang)
  }, {
    key: 'amount',
    header: STC('inv_amount'),
    numeric: true,
    sortValue: order => order.amount_cents,
    render: order => `¥${yuanOf(order.amount_cents)}`
  }, {
    key: 'benefit',
    header: lang === 'en' ? 'Order benefit' : '订单权益',
    numeric: true,
    sortable: false,
    render: order => ledger.orderBenefit(order, lang)
  }, {
    key: 'time',
    header: STC('inv_time'),
    sortValue: order => Date.parse(order.created_at),
    render: order => fmtDate(order.created_at)
  }, {
    key: 'status',
    header: '',
    sortable: false,
    render: order => /*#__PURE__*/React.createElement("span", {
      className: 'c-badge' + (order.status === 'fulfilled' ? ' gold' : '')
    }, ledger.orderStatus(order, lang))
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "set-panel-head",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(SIcon, {
    n: "chevron",
    s: 13,
    w: 2.4,
    style: {
      transform: 'rotate(180deg)'
    }
  }), STC('inv_back')), /*#__PURE__*/React.createElement("h2", {
    className: "set-panel-t",
    style: {
      margin: 0
    }
  }, STC('inv_title'))), /*#__PURE__*/React.createElement("div", {
    className: "set-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-cardlab"
  }, STC('set_credit')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--latin)',
      fontSize: 28,
      fontWeight: 500,
      color: 'var(--ink)'
    }
  }, acct ? creditsOf(acct.available_millis).toLocaleString() : '—'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--ink-3)'
    }
  }, STC('set_credits_unit'), " \xB7 ", STC('set_credit_left')), acct && acct.reserved_millis > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--ink-3)',
      marginLeft: 'auto'
    }
  }, STC('tx_reserve'), " ", creditsOf(acct.reserved_millis))), /*#__PURE__*/React.createElement(CreditSources, {
    account: acct
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--ink-3)',
      marginBottom: 6
    }
  }, STC('set_usage'), " \xB7 ", STC('set_period')), cats.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "set-usagebar"
  }, cats.map((g, i) => g.pct > 0 ? /*#__PURE__*/React.createElement("i", {
    key: i,
    style: {
      width: g.pct + '%',
      background: tintColor(g.tint)
    }
  }) : null), /*#__PURE__*/React.createElement("i", {
    style: {
      flex: 1,
      background: 'var(--paper-3)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "set-usagelist"
  }, cats.map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "set-usagerow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ud",
    style: {
      background: tintColor(g.tint)
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "uk"
  }, catLabel(g)), /*#__PURE__*/React.createElement("span", {
    className: "uv"
  }, creditsOf(g.credits_millis), " ", STC('set_credits_unit')), /*#__PURE__*/React.createElement("span", {
    className: "up"
  }, g.pct, "%"))))) : /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--ink-3)',
      padding: '6px 0'
    }
  }, summary == null ? STC('set_loading') : STC('set_no_usage'))), /*#__PURE__*/React.createElement("div", {
    className: "set-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-cardlab"
  }, STC('inv_orders')), orders == null ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-3)',
      fontSize: 13
    }
  }, STC('set_loading')) : orders.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ink-3)',
      fontSize: 13
    }
  }, STC('inv_no_orders')) : /*#__PURE__*/React.createElement(SettingsDataTable, {
    rows: orders,
    columns: orderColumns,
    rowKey: "id",
    ariaLabel: STC('inv_orders'),
    className: "inv-table",
    compact: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "set-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-cardlab"
  }, STC('inv_tx')), /*#__PURE__*/React.createElement(PersonalCreditLedger, null)));
}

/* ---------- preferences ---------- */
function Seg({
  opts,
  val,
  onPick,
  wrap,
  disabled
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "set-seg",
    style: wrap ? {
      flexWrap: 'wrap'
    } : null
  }, opts.map(o => /*#__PURE__*/React.createElement("button", {
    type: "button",
    key: o.k,
    className: val === o.k ? 'on' : '',
    "aria-pressed": val === o.k,
    disabled: disabled,
    onClick: () => onPick(o.k)
  }, o.l)));
}
function PrefRow({
  name,
  desc,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "set-prow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pinfo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pname"
  }, name), desc && /*#__PURE__*/React.createElement("div", {
    className: "pdesc"
  }, desc)), /*#__PURE__*/React.createElement("div", {
    className: "pctl"
  }, children));
}
function PrefsPanel({
  ctl,
  toast
}) {
  const [saving, setSaving] = sUseState(false);
  const en = window.CLANG === 'en';
  const settings = ctl.settings || {};
  const storedBookLang = settings.default_writing_language || 'zh-CN';
  const booklang = storedBookLang.startsWith('zh') ? 'zh' : storedBookLang;
  const save = async action => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await action();
      if (saved) toast(STC('set_saved'));
    } finally {
      setSaving(false);
    }
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "set-panel-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "set-panel-t"
  }, STC('set_prefs')))), /*#__PURE__*/React.createElement("div", {
    className: "set-prefs"
  }, /*#__PURE__*/React.createElement(PrefRow, {
    name: STC('set_pref_lang')
  }, /*#__PURE__*/React.createElement(Seg, {
    disabled: saving,
    val: booklang,
    onPick: k => save(() => ctl.updateSettings({
      default_writing_language: k === 'zh' ? 'zh-CN' : k
    })),
    opts: SD.create.bookLangs.map(b => ({
      k: b.code,
      l: SL(b)
    }))
  })), /*#__PURE__*/React.createElement(PrefRow, {
    name: STC('set_pref_theme')
  }, /*#__PURE__*/React.createElement(Seg, {
    disabled: saving,
    val: ctl.theme,
    onPick: k => save(() => ctl.setTheme(k)),
    opts: [{
      k: 'light',
      l: STC('set_light')
    }, {
      k: 'dark',
      l: STC('set_dark')
    }]
  })), /*#__PURE__*/React.createElement(PrefRow, {
    name: STC('set_pref_uilang')
  }, /*#__PURE__*/React.createElement(Seg, {
    disabled: saving,
    val: en ? 'en' : 'zh',
    onPick: k => save(() => ctl.setLang(k)),
    opts: [{
      k: 'zh',
      l: '中文'
    }, {
      k: 'en',
      l: 'English'
    }]
  }))));
}

/* ---------- security ---------- */
const SEC_INPUT_STYLE = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  border: '1px solid var(--line)',
  borderRadius: 6,
  background: 'var(--card)',
  color: 'var(--ink)',
  outline: 'none',
  fontFamily: 'inherit'
};
function SecField({
  label,
  type,
  value,
  onChange,
  ph,
  autoFocus
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: 'var(--ink-3)',
      display: 'block',
      marginBottom: 4
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    type: type,
    value: value,
    autoFocus: autoFocus,
    onChange: e => onChange(e.target.value),
    placeholder: ph,
    style: SEC_INPUT_STYLE,
    onFocus: e => {
      e.target.style.borderColor = 'var(--gold)';
      e.target.style.boxShadow = '0 0 0 2px oklch(0.78 0.13 72 / 0.15)';
    },
    onBlur: e => {
      e.target.style.borderColor = 'var(--line)';
      e.target.style.boxShadow = 'none';
    }
  }));
}
function SecModal({
  title,
  note,
  onClose,
  onSubmit,
  children,
  busy
}) {
  const en = window.CLANG === 'en';
  sUseEffect(() => {
    const closeOnEscape = event => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [busy, onClose]);
  return /*#__PURE__*/React.createElement("div", {
    className: "lf-modal-scrim",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "lf-modal",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "sec-modal-title",
    onClick: e => e.stopPropagation(),
    style: {
      maxWidth: 420
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lf-modal-head"
  }, /*#__PURE__*/React.createElement("h3", {
    id: "sec-modal-title",
    style: {
      margin: 0,
      fontSize: 17
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-ic",
    "aria-label": en ? 'Close dialog' : '关闭对话框',
    onClick: onClose,
    style: {
      width: 30,
      height: 30
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "lf-modal-body",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, children, note && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--ink-3)'
    }
  }, note)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      justifyContent: 'flex-end',
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: onClose,
    disabled: busy
  }, en ? 'Cancel' : '取消'), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold sm",
    onClick: onSubmit,
    disabled: busy
  }, busy ? /*#__PURE__*/React.createElement("span", {
    className: "c-shimmer"
  }, en ? 'Saving...' : '保存中...') : en ? 'Save' : '保存'))));
}
function ChangePasswordModal({
  onClose,
  toast
}) {
  const en = window.CLANG === 'en';
  const [cur, setCur] = sUseState('');
  const [nw, setNw] = sUseState('');
  const [cf, setCf] = sUseState('');
  const [busy, setBusy] = sUseState(false);
  const submit = async () => {
    if (busy) return;
    if (!cur || !nw) {
      toast(en ? 'Please fill in all fields' : '请填写完整');
      return;
    }
    if (nw.length < 8) {
      toast(en ? 'New password too short (min 8)' : '新密码至少 8 位');
      return;
    }
    if (nw !== cf) {
      toast(en ? 'Passwords do not match' : '两次输入的新密码不一致');
      return;
    }
    setBusy(true);
    try {
      await window.LF_API.changePassword(cur, nw);
      toast(en ? 'Password changed ✓' : '密码已修改 ✓');
      onClose();
    } catch (err) {
      toast(err.message || (en ? 'Operation failed' : '操作失败'));
    } finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement(SecModal, {
    title: en ? 'Change password' : '修改登录密码',
    busy: busy,
    onClose: onClose,
    onSubmit: submit,
    note: en ? 'Other devices will be signed out after the change.' : '修改后其他登录设备将被登出。'
  }, /*#__PURE__*/React.createElement(SecField, {
    type: "password",
    autoFocus: true,
    value: cur,
    onChange: setCur,
    label: en ? 'Current password' : '当前密码'
  }), /*#__PURE__*/React.createElement(SecField, {
    type: "password",
    value: nw,
    onChange: setNw,
    label: en ? 'New password' : '新密码',
    ph: en ? 'At least 8 characters' : '至少 8 位'
  }), /*#__PURE__*/React.createElement(SecField, {
    type: "password",
    value: cf,
    onChange: setCf,
    label: en ? 'Confirm new password' : '确认新密码'
  }));
}
function ChangeEmailModal({
  u,
  onClose,
  toast,
  onUserUpdate
}) {
  const en = window.CLANG === 'en';
  const [pw, setPw] = sUseState('');
  const [email, setEmail] = sUseState('');
  const [busy, setBusy] = sUseState(false);
  const submit = async () => {
    if (busy) return;
    const next = (email || '').trim();
    if (!pw || !next) {
      toast(en ? 'Please fill in all fields' : '请填写完整');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) {
      toast(en ? 'Invalid email' : '邮箱格式不正确');
      return;
    }
    setBusy(true);
    try {
      await window.LF_API.changeEmail(pw, next);
      u.email = next.toLowerCase();
      toast(en ? 'Email changed ✓' : '邮箱已修改 ✓');
      if (onUserUpdate) onUserUpdate();
      onClose();
    } catch (err) {
      toast(err.message || (en ? 'Operation failed' : '操作失败'));
    } finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement(SecModal, {
    title: en ? 'Change login email' : '修改登录邮箱',
    busy: busy,
    onClose: onClose,
    onSubmit: submit,
    note: en ? 'The new email will need to be verified again.' : '新邮箱需要重新验证。'
  }, /*#__PURE__*/React.createElement(SecField, {
    type: "password",
    autoFocus: true,
    value: pw,
    onChange: setPw,
    label: en ? 'Current password' : '当前密码'
  }), /*#__PURE__*/React.createElement(SecField, {
    type: "email",
    value: email,
    onChange: setEmail,
    label: en ? 'New email' : '新邮箱',
    ph: "name@example.com"
  }));
}
function SecurityPanel({
  u,
  ctl,
  toast,
  onUserUpdate
}) {
  const [modal, setModal] = sUseState(null); // null | 'password' | 'email'
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "set-panel-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "set-panel-t"
  }, STC('set_security')))), /*#__PURE__*/React.createElement("div", {
    className: "set-seclist"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-secrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "si"
  }, /*#__PURE__*/React.createElement(SIcon, {
    n: "mail",
    s: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "sinfo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sname"
  }, STC('set_email')), /*#__PURE__*/React.createElement("div", {
    className: "sval mono"
  }, u.email)), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: () => setModal('email')
  }, STC('set_change'))), /*#__PURE__*/React.createElement("div", {
    className: "set-secrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "si"
  }, /*#__PURE__*/React.createElement(SIcon, {
    n: "lock",
    s: 17
  })), /*#__PURE__*/React.createElement("div", {
    className: "sinfo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sname"
  }, STC('set_pw')), /*#__PURE__*/React.createElement("div", {
    className: "sval"
  }, STC('set_pw_set'))), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: () => setModal('password')
  }, STC('set_change')))), modal === 'password' && /*#__PURE__*/React.createElement(ChangePasswordModal, {
    onClose: () => setModal(null),
    toast: toast
  }), modal === 'email' && /*#__PURE__*/React.createElement(ChangeEmailModal, {
    u: u,
    onClose: () => setModal(null),
    toast: toast,
    onUserUpdate: onUserUpdate
  }));
}
function InvitationPanel({
  toast
}) {
  const en = window.CLANG === 'en';
  const [data, setData] = sUseState(null);
  const [error, setError] = sUseState('');
  const load = React.useCallback(() => {
    setError('');
    window.LF_API.invitationsMe().then(setData).catch(err => setError(err.message || (en ? 'Could not load invitations' : '邀请记录载入失败')));
  }, [en]);
  sUseEffect(() => {
    load();
  }, [load]);
  const copy = async value => {
    try {
      await navigator.clipboard.writeText(value);
      toast(en ? 'Copied' : '已复制');
    } catch (err) {
      toast(en ? 'Copy failed' : '复制失败');
    }
  };
  if (error) return /*#__PURE__*/React.createElement("div", {
    className: "set-card"
  }, /*#__PURE__*/React.createElement("p", {
    className: "set-invite-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: load
  }, en ? 'Retry' : '重试'));
  if (!data) return /*#__PURE__*/React.createElement("div", {
    className: "set-card c-shimmer"
  }, STC('set_loading'));
  const link = window.location.origin + data.invite_path;
  const credits = Math.round(data.reward_millis / 1000);
  const invitationColumns = [{
    key: 'friend',
    header: en ? 'Friend' : '好友',
    priority: 'primary',
    sortable: false,
    value: row => row.invitee_label
  }, {
    key: 'registered',
    header: en ? 'Registered' : '注册时间',
    sortValue: row => Date.parse(row.registered_at),
    render: row => new Date(row.registered_at).toLocaleDateString(en ? 'en-US' : 'zh-CN')
  }, {
    key: 'build',
    header: en ? 'Book setup' : '建书进度',
    numeric: true,
    sortValue: row => row.build_progress,
    render: row => `${row.build_progress} / 4`
  }, {
    key: 'reward',
    header: en ? 'Locked reward' : '锁定奖励',
    numeric: true,
    sortValue: row => row.reward_millis,
    render: row => en ? `${Math.round(row.reward_millis / 1000)} each` : `双方各 ${Math.round(row.reward_millis / 1000)}`
  }, {
    key: 'status',
    header: en ? 'Status' : '状态',
    sortable: false,
    render: row => /*#__PURE__*/React.createElement("strong", {
      className: row.reward_status === 'granted' ? 'done' : ''
    }, row.reward_status === 'granted' ? en ? 'Rewarded' : '已奖励' : en ? 'Building' : '待完成建书')
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "set-panel-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "set-panel-t"
  }, STC('set_invite'))), /*#__PURE__*/React.createElement("span", {
    className: "set-invite-current"
  }, en ? `${credits} credits each` : `当前双方各 ${credits} 笔力`)), /*#__PURE__*/React.createElement("div", {
    className: "set-invite-code-card"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, en ? 'Invitation code' : '邀请码'), /*#__PURE__*/React.createElement("strong", {
    className: "mono"
  }, data.code), /*#__PURE__*/React.createElement("small", null, en ? 'The reward is locked when your friend registers.' : '好友注册时锁定当时的双方奖励')), /*#__PURE__*/React.createElement("div", {
    className: "set-invite-copy-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: () => copy(data.code)
  }, en ? 'Copy code' : '复制邀请码'), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold sm",
    onClick: () => copy(link)
  }, en ? 'Copy link' : '复制邀请链接'))), /*#__PURE__*/React.createElement("div", {
    className: "set-invite-stats"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, data.invited_count), /*#__PURE__*/React.createElement("span", null, en ? 'Registered' : '已注册')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, data.pending_count), /*#__PURE__*/React.createElement("span", null, en ? 'Building' : '待完成建书')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, data.rewarded_count), /*#__PURE__*/React.createElement("span", null, en ? 'Rewarded' : '已发奖励'))), /*#__PURE__*/React.createElement("div", {
    className: "set-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-cardlab"
  }, en ? 'Recent invitations' : '最近邀请'), data.invitations.length ? /*#__PURE__*/React.createElement(SettingsDataTable, {
    rows: data.invitations,
    columns: invitationColumns,
    ariaLabel: en ? 'Recent invitations' : '最近邀请',
    className: "set-invite-table",
    compact: true
  }) : /*#__PURE__*/React.createElement("p", {
    className: "set-empty"
  }, en ? 'No one has registered with your code yet.' : '还没有好友通过你的邀请码注册。')));
}

/* ---------- root settings view ---------- */
function settingsRedeemTarget() {
  return window.location.hash === '#settings/billing/redeem' ? {
    section: 'billing',
    focus: 'redeem',
    requestId: 'initial-cdk'
  } : null;
}
function SettingsView({
  ctl,
  onShelf,
  target
}) {
  const u = SD.user;
  const toast = ctl.toast;
  const en = window.CLANG === 'en';
  // 笔枢年鉴 (almanac) is hidden until it has a real data source.
  const items = [['profile', 'user'], ['invite', 'link'], ['billing', 'card'], ['prefs', 'sliders'], ['notifications', 'mail'], ['security', 'shield'], ['api_keys', 'key']];
  const allowed = items.map(([k]) => k);
  const savedSec = localStorage.getItem('lf_set_sec');
  const [initialTarget] = sUseState(settingsRedeemTarget);
  const navigationTarget = target === undefined ? initialTarget : target;
  const [sec, setSec] = sUseState(navigationTarget && allowed.includes(navigationTarget.section) ? navigationTarget.section : allowed.includes(savedSec) ? savedSec : 'profile');
  const [navOpen, setNavOpen] = sUseState(false);
  const [, forceUpdate] = sUseState(0);
  const go = s => {
    setSec(s);
    localStorage.setItem('lf_set_sec', s);
    setNavOpen(false);
  };
  const requestId = navigationTarget && navigationTarget.requestId;
  sUseEffect(() => {
    if (navigationTarget && allowed.includes(navigationTarget.section)) go(navigationTarget.section);
  }, [requestId]);
  const doLogout = () => {
    if (window.LF_API) window.LF_API.logout().catch(() => {});
    if (window.LF_CLEAR_AUTH_STATE) window.LF_CLEAR_AUTH_STATE();else try {
      localStorage.removeItem('lf_tokens');
      localStorage.removeItem('novelbuilt.tokens');
      localStorage.removeItem('lf_portal_snapshot');
    } catch (e) {}
    (window.LFNav || (url => window.location.href = url))('/login.html');
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "set-wrap"
  }, /*#__PURE__*/React.createElement("nav", {
    id: "settings-navigation",
    className: 'set-nav' + (navOpen ? ' set-nav-show' : ''),
    "aria-label": STC('set_title')
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-id"
  }, /*#__PURE__*/React.createElement("div", {
    className: "av"
  }, u.seal), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, SL(u.penName)), /*#__PURE__*/React.createElement("div", {
    className: "hd"
  }, u.handle))), items.map(([k, ic]) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    key: k,
    className: 'nv' + (sec === k ? ' on' : ''),
    "aria-current": sec === k ? 'page' : undefined,
    onClick: () => go(k)
  }, /*#__PURE__*/React.createElement(SIcon, {
    n: ic,
    s: 18
  }), STC('set_' + k))), /*#__PURE__*/React.createElement("div", {
    className: "sp"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "set-logout",
    onClick: doLogout
  }, /*#__PURE__*/React.createElement(SIcon, {
    n: "logout",
    s: 17
  }), STC('set_logout'))), /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: 'tree-scrim' + (navOpen ? ' show' : ''),
    onClick: () => setNavOpen(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "set-main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c-top"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "tree-toggle c-ic",
    "aria-controls": "settings-navigation",
    "aria-expanded": navOpen,
    "aria-label": en ? 'Toggle account navigation' : '展开或收起账户导航',
    onClick: () => setNavOpen(!navOpen)
  }, /*#__PURE__*/React.createElement(SIcon, {
    n: "user",
    s: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "c-crumb"
  }, STC('set_title'), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), /*#__PURE__*/React.createElement("b", null, STC('set_' + sec))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(LangSeg, {
    lang: ctl.lang,
    setLang: ctl.setLang
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "c-ic",
    style: {
      width: 32,
      height: 32
    },
    "aria-label": ctl.theme === 'dark' ? en ? 'Switch to light theme' : '切换到浅色主题' : en ? 'Switch to dark theme' : '切换到深色主题',
    onClick: () => ctl.setTheme(ctl.theme === 'dark' ? 'light' : 'dark')
  }, ctl.theme === 'dark' ? /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "set-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "set-inner"
  }, sec === 'profile' && /*#__PURE__*/React.createElement(ProfilePanel, {
    u: u,
    toast: toast,
    onUserUpdate: () => forceUpdate(n => n + 1)
  }), sec === 'invite' && /*#__PURE__*/React.createElement(InvitationPanel, {
    toast: toast
  }), sec === 'almanac' && /*#__PURE__*/React.createElement(AlmanacPanel, {
    u: u
  }), sec === 'billing' && /*#__PURE__*/React.createElement(BillingPanel, {
    u: u,
    toast: toast,
    redeemRequest: navigationTarget && navigationTarget.focus === 'redeem' ? navigationTarget : null
  }), sec === 'prefs' && /*#__PURE__*/React.createElement(PrefsPanel, {
    ctl: ctl,
    toast: toast
  }), sec === 'notifications' && /*#__PURE__*/React.createElement(window.MessageNotificationsPanel, {
    toast: toast
  }), sec === 'security' && /*#__PURE__*/React.createElement(SecurityPanel, {
    u: u,
    ctl: ctl,
    toast: toast,
    onUserUpdate: () => forceUpdate(n => n + 1)
  }), sec === 'api_keys' && /*#__PURE__*/React.createElement(window.ApiKeysPanel, {
    toast: toast
  })))));
}
window.SettingsView = SettingsView;
}
