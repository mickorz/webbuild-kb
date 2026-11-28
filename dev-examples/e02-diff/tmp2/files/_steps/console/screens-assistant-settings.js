{
/* Account task panels and the administrator-owned assistant entry policy. */
(function () {
  function useAssistantAvailability() {
    const [availability, setAvailability] = React.useState({
      enabled: false,
      launcherVisible: false
    });
    const sequence = React.useRef(0),
      alive = React.useRef(false),
      pending = React.useRef(false);
    const applySettings = React.useCallback(value => {
      sequence.current += 1;
      const enabled = !!value && value.enabled === true;
      setAvailability({
        enabled,
        launcherVisible: enabled && value.launcher_visible === true
      });
    }, []);
    const refresh = React.useCallback(async () => {
      if (!alive.current || pending.current) return;
      const current = ++sequence.current;
      pending.current = true;
      try {
        const value = await window.LF_API.assistantAvailability();
        if (alive.current && current === sequence.current) applySettings(window.LF_AUTH_EXPIRED ? null : value);
      } catch (error) {
        const status = Number(error?.status || 0);
        const transport = error?.code === 'invalid_json_response' && status >= 200 && status < 300 ? error.cause : !status ? error : null;
        const temporary = status >= 500 && status < 600 || ['TypeError', 'AbortError', 'TimeoutError'].includes(transport?.name);
        // A failed read cannot revoke the last observed setting. Initial state
        // stays closed; explicit disable and authorization failures still close.
        if (alive.current && current === sequence.current && (window.LF_AUTH_EXPIRED || !temporary)) applySettings(null);
      } finally {
        pending.current = false;
      }
    }, [applySettings]);
    React.useEffect(() => {
      alive.current = true;
      const onVisible = () => {
        if (!document.hidden) refresh();
      };
      onVisible();
      const timer = setInterval(onVisible, 30000);
      window.addEventListener('focus', onVisible);
      document.addEventListener('visibilitychange', onVisible);
      return () => {
        alive.current = false;
        sequence.current += 1;
        clearInterval(timer);
        window.removeEventListener('focus', onVisible);
        document.removeEventListener('visibilitychange', onVisible);
      };
    }, [refresh]);
    return {
      ...availability,
      applySettings
    };
  }
  function AssistantSettingsView({
    ctl,
    controls,
    target
  }) {
    const en = ctl.lang === 'en';
    const enabled = ctl.assistantEnabled === true;
    const userId = window.CONSOLE_DATA && window.CONSOLE_DATA.user && window.CONSOLE_DATA.user.id;
    return /*#__PURE__*/React.createElement("div", {
      className: "set-main asst-settings"
    }, /*#__PURE__*/React.createElement("div", {
      className: "c-top"
    }, /*#__PURE__*/React.createElement("h1", {
      className: "c-crumb"
    }, /*#__PURE__*/React.createElement("b", null, en ? 'Creative assistant' : '创作助手')), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), controls), /*#__PURE__*/React.createElement("div", {
      className: "set-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "set-inner asst-settings-inner"
    }, /*#__PURE__*/React.createElement(AssistantSettingsPanels, {
      key: userId,
      target: target,
      enabled: enabled,
      lang: ctl.lang,
      userId: userId,
      onReference: ctl.onAssistantReference
    }))));
  }
  function AssistantSettingsPanels({
    enabled,
    lang,
    userId,
    onReference,
    target
  }) {
    const [selected, setSelected] = React.useState('memory');
    const [visited, setVisited] = React.useState(['memory']);
    const tabsRef = React.useRef(null);
    const en = lang === 'en';
    const sections = [{
      id: 'memory',
      label: en ? 'Memory' : '记忆',
      Panel: window.AssistantMemoryGraphPanel
    }, {
      id: 'workspace',
      label: en ? 'Materials and notes' : '资料与手记',
      Panel: window.AssistantWorkspacePanel
    }, {
      id: 'personalization',
      label: en ? 'Personalization' : '个性化',
      Panel: window.AssistantPersonalizationPanel
    }, {
      id: 'usage',
      label: en ? 'Settings' : '设置',
      Panel: window.AssistantUsageSettingsPanel
    }];
    const choose = id => {
      setSelected(id);
      setVisited(previous => previous.includes(id) ? previous : [...previous, id]);
    };
    React.useEffect(() => {
      if (target && sections.some(section => section.id === target.tab)) choose(target.tab);
    }, [target && target.request_id, target && target.tab]);
    const onKeyDown = event => {
      const index = sections.findIndex(section => section.id === selected);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1 : event.key === 'ArrowRight' ? (index + 1) % sections.length : event.key === 'ArrowLeft' ? (index + sections.length - 1) % sections.length : -1;
      if (next < 0) return;
      event.preventDefault();
      choose(sections[next].id);
      const target = tabsRef.current && tabsRef.current.querySelectorAll('[role="tab"]')[next];
      if (target) target.focus();
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "asst-settings-panels"
    }, /*#__PURE__*/React.createElement("div", {
      className: "asst-settings-tabs",
      role: "tablist",
      "aria-label": en ? 'Assistant settings' : '创作助手分区',
      ref: tabsRef,
      onKeyDown: onKeyDown
    }, sections.map(({
      id,
      label
    }) => /*#__PURE__*/React.createElement("button", {
      key: id,
      type: "button",
      className: "c-btn asst-settings-tab",
      id: 'assistant-tab-' + id,
      role: "tab",
      "aria-selected": selected === id,
      "aria-controls": 'assistant-panel-' + id,
      tabIndex: selected === id ? 0 : -1,
      onClick: () => choose(id)
    }, label))), sections.map(({
      id,
      Panel
    }) => /*#__PURE__*/React.createElement("div", {
      key: id,
      id: 'assistant-panel-' + id,
      className: "asst-settings-panel",
      role: "tabpanel",
      "aria-labelledby": 'assistant-tab-' + id,
      hidden: selected !== id,
      tabIndex: 0
    }, Panel && visited.includes(id) ? /*#__PURE__*/React.createElement(Panel, {
      key: userId,
      enabled: enabled,
      active: selected === id,
      lang: lang,
      userId: userId,
      onReference: id === 'workspace' ? onReference : undefined,
      onManage: id === 'usage' ? target => {
        choose(target);
        tabsRef.current?.querySelector('#assistant-tab-' + target)?.focus();
      } : undefined
    }) : null)));
  }
  window.AssistantSettingsPanels = AssistantSettingsPanels;
  window.useAssistantAvailability = useAssistantAvailability;
  window.AssistantSettingsView = AssistantSettingsView;
})();
}
