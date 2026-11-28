{
(function () {
  const {
    useState,
    useEffect,
    useRef
  } = React;
  const vol = () => window.LF_BOOK_DATA_VOLUME;
  const copy = (key, values) => {
    const core = vol();
    if (window.TC) {
      const text = window.TC(key);
      if (text && text !== key) {
        return values ? String(text).replace(/\{(\w+)\}/g, (_, name) => values[name] == null ? '' : String(values[name])) : text;
      }
    }
    return core && core.defaultCopy ? core.defaultCopy(key, values) : key;
  };
  function useBookDataUsage(bookId, open) {
    const [state, setState] = useState({
      usage: null,
      loading: false,
      error: null
    });
    useEffect(() => {
      if (!open || !bookId || !vol() || typeof vol().fetchDataUsage !== 'function') {
        setState({
          usage: null,
          loading: false,
          error: null
        });
        return undefined;
      }
      let alive = true;
      let sequence = 0;
      const load = () => {
        const owned = ++sequence;
        setState({
          usage: null,
          loading: true,
          error: null
        });
        vol().fetchDataUsage(bookId).then(usage => {
          if (alive && sequence === owned) setState({
            usage,
            loading: false,
            error: null
          });
        }).catch(error => {
          if (alive && sequence === owned) setState({
            usage: vol().parseDataUsage(null),
            loading: false,
            error
          });
        });
      };
      const onSaved = event => {
        if (String(event.detail?.bookId || '') === String(bookId)) load();
      };
      const events = ['lf:book-data-updated', 'lf:custom-settings-updated'];
      events.forEach(name => window.addEventListener(name, onSaved));
      load();
      return () => {
        alive = false;
        events.forEach(name => window.removeEventListener(name, onSaved));
      };
    }, [open, bookId]);
    return state;
  }
  function PricingLink() {
    return /*#__PURE__*/React.createElement("a", {
      className: "bdv-pricing-link",
      href: "/site/credit-pricing.html#volume-pricing",
      target: "_blank",
      rel: "noopener noreferrer"
    }, copy('bdv_pricing'));
  }
  function BookDataUsageChart({
    usage
  }) {
    const core = vol();
    if (!core) return null;
    const view = core.usageView(usage, copy);
    if (view.unknown) {
      return /*#__PURE__*/React.createElement("div", {
        className: "bdv-usage",
        role: "status"
      }, /*#__PURE__*/React.createElement("span", {
        className: "bdv-usage-unknown"
      }, view.title, " \xB7 ", view.unknownText), /*#__PURE__*/React.createElement("div", {
        className: "bdv-usage-footer"
      }, /*#__PURE__*/React.createElement(PricingLink, null)));
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "bdv-usage"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bdv-usage-main"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "bdv-usage-label"
    }, view.title), /*#__PURE__*/React.createElement("strong", {
      className: "bdv-usage-amount c-latin"
    }, view.amountText)), view.tierText ? /*#__PURE__*/React.createElement("span", {
      className: "bdv-usage-tier",
      "aria-label": copy('bdv_multiplier_label', {
        multiplier: view.tierText
      })
    }, view.tierText) : null), view.progress ? /*#__PURE__*/React.createElement("div", {
      className: 'bdv-usage-range' + (view.unsupported ? ' is-over-limit' : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "bdv-usage-track",
      role: "progressbar",
      "aria-label": view.title,
      "aria-valuemin": view.progress.min,
      "aria-valuemax": view.progress.max,
      "aria-valuenow": view.progress.value,
      "aria-valuetext": view.progress.valueText
    }, /*#__PURE__*/React.createElement("span", {
      className: "bdv-usage-fill",
      style: {
        width: view.progress.percent + '%'
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "bdv-usage-scale",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("span", {
      className: "c-latin"
    }, view.progress.lowerText), /*#__PURE__*/React.createElement("span", null, view.progress.nextText), /*#__PURE__*/React.createElement("span", {
      className: "c-latin"
    }, view.progress.upperText))) : null, view.unsupported ? /*#__PURE__*/React.createElement("div", {
      className: "bdv-usage-note"
    }, copy('bdv_unsupported'), " \xB7 ", view.unsupportedNote) : null, /*#__PURE__*/React.createElement("div", {
      className: "bdv-usage-footer"
    }, view.components.length ? /*#__PURE__*/React.createElement("details", null, /*#__PURE__*/React.createElement("summary", null, view.detailsLabel), /*#__PURE__*/React.createElement("ul", {
      className: "bdv-usage-parts"
    }, view.components.map(item => /*#__PURE__*/React.createElement("li", {
      key: item.key
    }, /*#__PURE__*/React.createElement("span", null, item.labelKey ? copy(item.labelKey) : item.key), /*#__PURE__*/React.createElement("b", {
      className: "c-latin"
    }, item.units == null ? copy('bdv_unknown') : item.units + 'k'))))) : null, /*#__PURE__*/React.createElement(PricingLink, null)));
  }
  function BookDataUsagePanel({
    bookId,
    open
  }) {
    const {
      usage,
      loading
    } = useBookDataUsage(bookId, open !== false);
    if (!bookId) return null;
    if (loading && !usage) return /*#__PURE__*/React.createElement("div", {
      className: "bdv-usage",
      role: "status"
    }, /*#__PURE__*/React.createElement("span", {
      className: "bdv-usage-label"
    }, copy('bdv_usage')));
    return /*#__PURE__*/React.createElement(BookDataUsageChart, {
      usage: usage
    });
  }
  function BookDataQuoteHost() {
    const [request, setRequest] = useState(null);
    const [remember, setRemember] = useState(false);
    const requestRef = useRef(null);
    useEffect(() => {
      const core = vol();
      if (!core || typeof core.registerConfirmer !== 'function') return undefined;
      const release = core.registerConfirmer((payload, context) => new Promise(resolve => {
        const current = requestRef.current;
        if (current) current.resolve(false);
        const next = {
          payload,
          context: context || {},
          resolve
        };
        requestRef.current = next;
        setRemember(false);
        setRequest(next);
      }));
      return () => {
        release();
        if (requestRef.current) requestRef.current.resolve(false);
        requestRef.current = null;
      };
    }, []);
    const Confirm = window.ConfirmDialog;
    if (!Confirm || !request) return null;
    const close = accepted => {
      if (requestRef.current !== request) return;
      if (accepted && remember) vol().rememberMultiplier(request.payload, request.context);
      requestRef.current = null;
      setRequest(null);
      request.resolve(!!accepted);
    };
    const view = vol().chargeView(request.payload, copy);
    return /*#__PURE__*/React.createElement(Confirm, {
      open: true,
      icon: "bolt",
      title: copy('bdv_quote_title'),
      message: copy('bdv_reminder_message', {
        multiplier: request.payload.multiplier
      }),
      cancelLabel: copy('bdv_quote_cancel'),
      confirmLabel: copy('bdv_quote_confirm'),
      confirmDisabled: !view.confirmEnabled || view.unsupported,
      footerStart: /*#__PURE__*/React.createElement("label", {
        className: "bdv-reminder-choice"
      }, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: remember,
        onChange: event => setRemember(event.target.checked)
      }), /*#__PURE__*/React.createElement("span", null, copy('bdv_remember'))),
      onClose: () => close(false),
      onConfirm: () => close(true)
    }, /*#__PURE__*/React.createElement(BookDataUsageChart, {
      usage: request.payload.usage
    }));
  }
  window.BookDataUsagePanel = BookDataUsagePanel;
  window.BookDataUsageChart = BookDataUsageChart;
  window.BookDataQuoteHost = BookDataQuoteHost;
})();
}
