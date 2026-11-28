{
/* Shared writer and prose generation controls. */
const WRITER_TOGGLE_CSS = `
.c-writer-toggle{position:relative;display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none;-webkit-user-select:none}
.c-writer-toggle .wt-label{font-size:11.5px;font-weight:500;color:var(--ink-3);transition:color .3s,opacity .3s;opacity:.55}
.c-writer-toggle .wt-label.on{color:var(--gold-deep);opacity:1}
.c-writer-toggle .wt-track{position:relative;width:52px;height:28px;border-radius:14px;background:var(--line-2);border:1px solid var(--line);transition:background .35s,border-color .35s,box-shadow .35s;flex:none}
.c-writer-toggle.active .wt-track{background:linear-gradient(135deg,var(--gold),var(--gold-deep));border-color:var(--gold);box-shadow:0 0 12px oklch(0.70 0.125 70/.35),0 0 28px oklch(0.70 0.125 70/.15)}
.c-writer-toggle .wt-knob{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.18);transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .3s}
.c-writer-toggle.active .wt-knob{transform:translateX(24px);box-shadow:0 1px 4px rgba(0,0,0,.18),0 0 8px oklch(0.70 0.125 70/.5)}
.c-writer-toggle .wt-icon{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none}
.c-writer-toggle .wt-icon svg{width:12px;height:12px;transition:color .3s}
.c-writer-toggle .wt-icon svg{color:var(--ink-3)}
.c-writer-toggle.active .wt-icon svg{color:var(--gold-deep)}

/* energy ring pulse when active */
.c-writer-toggle .wt-ring{position:absolute;inset:-4px;border-radius:18px;border:2px solid var(--gold);opacity:0;pointer-events:none}
.c-writer-toggle.active .wt-ring{animation:wt-ring-pulse 2s ease-out infinite}
@keyframes wt-ring-pulse{0%{opacity:.6;transform:scale(.92)}50%{opacity:0;transform:scale(1.18)}100%{opacity:0;transform:scale(1.18)}}

/* golden glow aura */
.c-writer-toggle .wt-glow{position:absolute;inset:-6px;border-radius:20px;background:radial-gradient(ellipse at center,oklch(0.70 0.125 70/.2),transparent 70%);opacity:0;pointer-events:none;transition:opacity .4s}
.c-writer-toggle.active .wt-glow{opacity:1;animation:wt-glow-breathe 3s ease-in-out infinite}
@keyframes wt-glow-breathe{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.9;transform:scale(1.04)}}

/* spark particles */
.c-writer-toggle .wt-sparks{position:absolute;inset:0;pointer-events:none;overflow:visible}
.c-writer-toggle .wt-spark{position:absolute;width:3px;height:3px;border-radius:50%;background:var(--gold);opacity:0}
.c-writer-toggle.active .wt-spark{animation:wt-spark-fly var(--dur) var(--delay) ease-out infinite}
@keyframes wt-spark-fly{
  0%{opacity:0;transform:translate(var(--sx),var(--sy)) scale(0)}
  15%{opacity:1;transform:translate(calc(var(--sx)*.5),calc(var(--sy)*.5)) scale(1)}
  100%{opacity:0;transform:translate(var(--ex),var(--ey)) scale(0)}
}

/* lightning flash on knob when active */
.c-writer-toggle .wt-flash{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle,#fff 0%,oklch(0.70 0.125 70/.6) 40%,transparent 70%);opacity:0;pointer-events:none;transition:none}
.c-writer-toggle.active .wt-flash{animation:wt-flash-pop .6s ease-out}
@keyframes wt-flash-pop{0%{opacity:1;transform:scale(.5)}100%{opacity:0;transform:scale(2.5)}}

/* label text slide */
.c-writer-toggle .wt-name{font-size:11.5px;font-weight:600;color:var(--ink-3);transition:color .3s;white-space:nowrap}
.c-writer-toggle.active .wt-name{color:var(--gold-deep)}

/* reduced motion */
@media(prefers-reduced-motion:reduce){
  .c-writer-toggle .wt-ring,.c-writer-toggle .wt-glow,.c-writer-toggle .wt-spark,.c-writer-toggle .wt-flash{animation:none!important}
  .c-writer-toggle .wt-track,.c-writer-toggle .wt-knob{transition-duration:.01ms!important}
}
`;
(function injectWriterToggleCSS() {
  if (document.getElementById('c-writer-toggle-css')) return;
  var s = document.createElement('style');
  s.id = 'c-writer-toggle-css';
  s.textContent = WRITER_TOGGLE_CSS;
  document.head.appendChild(s);
})();
function GenerationToggle({
  checked,
  onChange,
  label,
  icon = 'bolt',
  disabled = false,
  sideLabels = null,
  title
}) {
  var isOn = !!checked;
  var sparks = [{
    sx: '4px',
    sy: '-2px',
    ex: '14px',
    ex2: '-18px',
    ey: '-22px',
    dur: 1.6,
    delay: 0
  }, {
    sx: '48px',
    sy: '14px',
    ex: '62px',
    ex2: '72px',
    ey: '-8px',
    dur: 2,
    delay: .4
  }, {
    sx: '24px',
    sy: '26px',
    ex: '20px',
    ex2: '10px',
    ey: '38px',
    dur: 1.8,
    delay: .8
  }, {
    sx: '42px',
    sy: '0px',
    ex: '56px',
    ex2: '60px',
    ey: '-16px',
    dur: 2.2,
    delay: 1.2
  }, {
    sx: '14px',
    sy: '24px',
    ex: '-4px',
    ex2: '-12px',
    ey: '36px',
    dur: 1.5,
    delay: .2
  }, {
    sx: '38px',
    sy: '26px',
    ex: '44px',
    ex2: '50px',
    ey: '40px',
    dur: 1.9,
    delay: 1
  }];
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": isOn,
    "aria-label": label,
    disabled: disabled,
    className: 'c-writer-toggle' + (isOn ? ' active' : ''),
    title: title,
    onClick: () => onChange(!isOn)
  }, sideLabels && /*#__PURE__*/React.createElement("span", {
    className: 'wt-label' + (isOn ? '' : ' on')
  }, sideLabels[0]), /*#__PURE__*/React.createElement("span", {
    className: "wt-track",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wt-glow"
  }), /*#__PURE__*/React.createElement("span", {
    className: "wt-ring"
  }), /*#__PURE__*/React.createElement("span", {
    className: "wt-sparks"
  }, sparks.map(function (sp, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "wt-spark",
      style: {
        left: '50%',
        top: '50%',
        '--sx': sp.sx,
        '--sy': sp.sy,
        '--ex': sp.ex2,
        '--ey': sp.ey,
        '--dur': sp.dur + 's',
        '--delay': sp.delay + 's'
      }
    });
  })), /*#__PURE__*/React.createElement("span", {
    className: "wt-knob"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wt-icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: icon,
    s: 12,
    w: 2
  }))), /*#__PURE__*/React.createElement("span", {
    className: "wt-flash"
  })), sideLabels && /*#__PURE__*/React.createElement("span", {
    className: 'wt-name' + (isOn ? ' on' : '')
  }, sideLabels[1]));
}
function WriterToggle({
  writerType,
  onToggle,
  onIntro,
  showLabels = true,
  disabled = false
}) {
  const isOn = writerType === 'muti';
  return /*#__PURE__*/React.createElement(GenerationToggle, {
    checked: isOn,
    disabled: disabled,
    label: window.CLANG === 'en' ? 'Enable multiple writers' : '开启多写手',
    title: isOn ? TC('wr_muti_tip') : TC('wr_single_tip'),
    sideLabels: showLabels ? [TC('wr_single'), TC('wr_muti')] : null,
    onChange: () => {
      if (!isOn && onIntro) {
        onIntro();
        return;
      }
      onToggle();
    }
  });
}
window.GenerationToggle = GenerationToggle;
window.WriterToggle = WriterToggle;

/* ---------- Writer Group Intro Modal — first-time switch from single to muti ---------- */
const WRITER_INTRO_CSS = `
.wrin-inline{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;background:oklch(0.22 0.03 60/.42);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:lfFadeOnly .25s ease both}
.wrin-card{width:100%;max-width:640px;max-height:calc(100dvh - 40px);overflow-y:auto;background:var(--card);border:1px solid var(--gold-soft);border-radius:10px;box-shadow:0 24px 64px -20px oklch(0.56 0.125 58/.22);padding:24px 22px 20px;position:relative;animation:rgPop .5s var(--ease-out) both}
@media(max-width:560px){.wrin-inline{padding:12px}.wrin-card{max-height:calc(100dvh - 24px);padding:20px 16px 16px}}
.wrin-card::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,oklch(0.70 0.125 70/.06),transparent 50%);pointer-events:none}
.wrin-title{font-family:var(--serif);font-size:21px;font-weight:600;text-align:center;margin-bottom:4px;position:relative;z-index:1}
.wrin-highlight{color:var(--gold-deep)}
.wrin-sub{text-align:center;font-size:13.5px;color:var(--ink-2);margin-bottom:18px;line-height:1.6;position:relative;z-index:1}
/* benefit cards */
.wrin-benefits{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;position:relative;z-index:1}
@media(max-width:560px){.wrin-benefits{grid-template-columns:1fr}}
.wrin-benefit{background:color-mix(in srgb,var(--paper-2) 60%,var(--gold-wash));border:1px solid var(--line);border-radius:8px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start}
.wrin-benefit .wb-ic{width:30px;height:30px;border-radius:7px;flex:none;display:grid;place-items:center;background:var(--gold-wash);border:1px solid var(--gold-soft);color:var(--gold-deep)}
.wrin-benefit .wb-d{font-size:13px;color:var(--ink-2);line-height:1.5}
.wrin-benefit .wb-d b{color:var(--ink);font-weight:600}
/* cost comparison bar */
.wrin-costbar{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--ink-2);background:var(--paper-2);border:1px solid var(--line);border-radius:8px;padding:12px 16px;margin-bottom:16px;position:relative;z-index:1}
.wrin-costbar .cost-item{display:flex;align-items:center;gap:6px}
.wrin-costbar .cost-label{font-weight:500}
.wrin-costbar .cost-val{font-weight:600;color:var(--ink);font-family:var(--latin)}
.wrin-costbar .cost-val.gold{color:var(--gold-deep)}
.wrin-costbar .cost-divider{width:1px;height:18px;background:var(--line)}
.wrin-costbar .cost-note{font-size:12px;color:var(--ink-3);font-weight:500}
/* footer */
.wrin-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;position:relative;z-index:1}
.wrin-footer .wrin-note{font-size:12px;color:var(--ink-3);display:flex;align-items:center;gap:6px}
.wrin-footer .wrin-note svg{color:var(--ink-3)}
`;
(function injectWriterIntroCSS() {
  if (document.getElementById('c-wrintro-css')) return;
  var s = document.createElement('style');
  s.id = 'c-wrintro-css';
  s.textContent = WRITER_INTRO_CSS;
  document.head.appendChild(s);
})();
function WriterGroupIntroModal(_ref) {
  var open = _ref.open,
    onClose = _ref.onClose,
    onConfirm = _ref.onConfirm;
  const {
    useEffect
  } = React;
  useEffect(function () {
    if (!open) return;
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function () {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  var en = window.CLANG === 'en';
  var TITLE = en ? 'Writer Group' : '写手群';
  var HI_LINE = en ? '7-Agent Deep Collaboration Pipeline' : '7 Agent 深度协作管线';
  var SUB = en ? 'A high-end pipeline powered by 7 specialist expert writer agents that collaborate, cross-check, and refine each chapter. Backed by top-tier closed-source models.' : '七位笔枢特调专家写手 Agent 组队，互校验、互协作，形成一条动态高级管线。搭载国际顶尖闭源模型，每一章都经过多层雕琢。';
  var B1_TITLE = en ? 'Multi-Agent Cross-Validation' : '多 Agent 交叉校验';
  var B1_DESC = en ? '7 specialist agents check each other — logic holes, continuity errors, and character drift are caught before they reach the page.' : '七位专家 Agent 互相校验：逻辑漏洞、连续性错误、人物偏移在落笔前就被拦截。';
  var B2_TITLE = en ? 'Elite Closed-Source Models' : '顶尖闭源模型';
  var B2_DESC = en ? 'Top-tier proprietary LLMs deliver prose quality and consistency that open-source alternatives cannot match.' : '搭载国际顶级闭源大模型，成文质量和一致性远超开源方案。';
  var B3_TITLE = en ? 'Dynamic Role Handoff' : '动态角色接力';
  var B3_DESC = en ? 'Draft flows through the pipeline — conceive, structure, style, tension, verify, polish, audit. Each agent owns a specific craft dimension.' : '草稿在各 Agent 之间接力流转：构思→结构→文体→张力→校验→润色→审核。每个 Agent 专精一项创作维度。';
  var B4_TITLE = en ? '1+3+3 Guardian Architecture' : '1+3+3 护航架构';
  var B4_DESC = en ? '1 Orchestrator + 3 Creative + 3 Reviewing Agents: inner ring creates, outer ring challenges. Every sentence survives two rounds of adversarial review.' : '1 位指挥 + 3 位创作 + 3 位审议 Agent：内圈创作，外圈质询。每句话经历两轮对抗性审查后才落定。';
  var COST_SINGLE = en ? 'Single Writer' : '单写手';
  var COST_S_RATE = en ? '4 credits / ch.' : '4 笔力/章';
  var COST_GROUP = en ? 'Writer Group' : '写手群';
  var COST_G_RATE = en ? '15 credits / ch.' : '15 笔力/章';
  var COST_NOTE = en ? '~3.75x cost, for critical/high-stakes chapters' : '约 3.75 倍消耗，面向高潮/关键章节';
  var FOOT_NOTE = en ? 'Toggle anytime. Switch per-chapter.' : '可随时切换，按章节灵活选择。';
  var CTA = en ? 'Enable Writer Group' : '启用写手群';
  return /*#__PURE__*/React.createElement(Portal, null, /*#__PURE__*/React.createElement("div", {
    className: "wrin-inline",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrin-card",
    onClick: function (e) {
      e.stopPropagation();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrin-title"
  }, TITLE, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: 'var(--ink-3)',
      marginLeft: 6
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "wrin-highlight"
  }, HI_LINE)), /*#__PURE__*/React.createElement("div", {
    className: "wrin-sub"
  }, SUB), /*#__PURE__*/React.createElement("div", {
    className: "wrin-benefits"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrin-benefit"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wb-ic"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3v18M3 12h18M12 3a9 9 0 0 1 0 18 9 9 0 0 1 0-18"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "wb-d"
  }, /*#__PURE__*/React.createElement("b", null, B1_TITLE), /*#__PURE__*/React.createElement("br", null), B1_DESC)), /*#__PURE__*/React.createElement("div", {
    className: "wrin-benefit"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wb-ic"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M13 2L4 14h7l-1 8 9-12h-7z"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "wb-d"
  }, /*#__PURE__*/React.createElement("b", null, B2_TITLE), /*#__PURE__*/React.createElement("br", null), B2_DESC)), /*#__PURE__*/React.createElement("div", {
    className: "wrin-benefit"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wb-ic"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L14.5 2h-5l-.3 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.5L3 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h5l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.5L19 13z"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "wb-d"
  }, /*#__PURE__*/React.createElement("b", null, B3_TITLE), /*#__PURE__*/React.createElement("br", null), B3_DESC)), /*#__PURE__*/React.createElement("div", {
    className: "wrin-benefit"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wb-ic"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 7a3 3 0 1 0 0-.01M17 9a2.5 2.5 0 1 0 0-.01M5 20c0-3 2-5 4-5s4 2 4 5M14 20c0-2.2 1.5-4 3-4s3 1.8 3 4"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "wb-d"
  }, /*#__PURE__*/React.createElement("b", null, B4_TITLE), /*#__PURE__*/React.createElement("br", null), B4_DESC))), /*#__PURE__*/React.createElement("div", {
    className: "wrin-costbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cost-item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cost-label"
  }, COST_SINGLE), /*#__PURE__*/React.createElement("span", {
    className: "cost-val"
  }, COST_S_RATE)), /*#__PURE__*/React.createElement("div", {
    className: "cost-divider"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gold-deep)',
      fontSize: 16
    }
  }, "\u25B2"), /*#__PURE__*/React.createElement("div", {
    className: "cost-item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cost-label",
    style: {
      color: 'var(--gold-deep)'
    }
  }, COST_GROUP), /*#__PURE__*/React.createElement("span", {
    className: "cost-val gold",
    style: {
      fontSize: 15
    }
  }, COST_G_RATE)), /*#__PURE__*/React.createElement("div", {
    className: "cost-divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "cost-note"
  }, COST_NOTE)), /*#__PURE__*/React.createElement("div", {
    className: "wrin-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrin-note"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8v4M12 16h.01"
  })), /*#__PURE__*/React.createElement("span", null, FOOT_NOTE)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "c-btn sm",
    onClick: onClose
  }, en ? 'Dismiss' : '不再提示'), /*#__PURE__*/React.createElement("button", {
    className: "c-btn gold",
    onClick: function () {
      onConfirm();
      onClose();
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M13 2L4 14h7l-1 8 9-12h-7z"
  })), CTA))))));
}
window.WriterGroupIntroModal = WriterGroupIntroModal;
}
