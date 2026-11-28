{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/*
 * Shared UI primitives adapted from shadcn/ui's Table and Chart source.
 * Upstream: https://ui.shadcn.com/docs/components/table and /chart (MIT).
 * Product-specific behavior stays in AdminDataTable/AdminChart; these primitives
 * keep the semantic DOM, responsive container, tooltip and legend contracts small.
 */
(function () {
  const {
    createContext,
    forwardRef,
    useContext,
    useId
  } = React;
  const Recharts = window.LFAdminVendor && window.LFAdminVendor.Recharts;
  const join = (...values) => values.filter(Boolean).join(' ');
  const Table = forwardRef(function Table({
    className = '',
    containerClassName = '',
    containerProps = {},
    ...props
  }, ref) {
    return /*#__PURE__*/React.createElement("div", _extends({
      "data-slot": "table-container",
      className: join('c-table-container', containerClassName)
    }, containerProps), /*#__PURE__*/React.createElement("table", _extends({
      ref: ref,
      "data-slot": "table",
      className: className
    }, props)));
  });
  const TableHeader = forwardRef(function TableHeader({
    className = '',
    ...props
  }, ref) {
    return /*#__PURE__*/React.createElement("thead", _extends({
      ref: ref,
      "data-slot": "table-header",
      className: className
    }, props));
  });
  const TableBody = forwardRef(function TableBody({
    className = '',
    ...props
  }, ref) {
    return /*#__PURE__*/React.createElement("tbody", _extends({
      ref: ref,
      "data-slot": "table-body",
      className: className
    }, props));
  });
  const TableFooter = forwardRef(function TableFooter({
    className = '',
    ...props
  }, ref) {
    return /*#__PURE__*/React.createElement("tfoot", _extends({
      ref: ref,
      "data-slot": "table-footer",
      className: className
    }, props));
  });
  const TableRow = forwardRef(function TableRow({
    className = '',
    ...props
  }, ref) {
    return /*#__PURE__*/React.createElement("tr", _extends({
      ref: ref,
      "data-slot": "table-row",
      className: className
    }, props));
  });
  const TableHead = forwardRef(function TableHead({
    className = '',
    ...props
  }, ref) {
    return /*#__PURE__*/React.createElement("th", _extends({
      ref: ref,
      "data-slot": "table-head",
      className: className
    }, props));
  });
  const TableCell = forwardRef(function TableCell({
    className = '',
    ...props
  }, ref) {
    return /*#__PURE__*/React.createElement("td", _extends({
      ref: ref,
      "data-slot": "table-cell",
      className: className
    }, props));
  });
  const TableCaption = forwardRef(function TableCaption({
    className = '',
    ...props
  }, ref) {
    return /*#__PURE__*/React.createElement("caption", _extends({
      ref: ref,
      "data-slot": "table-caption",
      className: className
    }, props));
  });
  const ChartContext = createContext(null);
  const useChart = () => {
    const context = useContext(ChartContext);
    if (!context) throw new Error('useChart must be used inside ChartContainer');
    return context;
  };
  const ChartContainer = forwardRef(function ChartContainer({
    id,
    className = '',
    config = {},
    children,
    ...props
  }, ref) {
    const generatedId = useId();
    const chartId = `chart-${String(id || generatedId).replace(/:/g, '')}`;
    if (!Recharts) return null;
    return /*#__PURE__*/React.createElement(ChartContext.Provider, {
      value: {
        config
      }
    }, /*#__PURE__*/React.createElement("div", _extends({
      ref: ref,
      "data-slot": "chart",
      "data-chart": chartId,
      className: join('c-chart-container', className)
    }, props), /*#__PURE__*/React.createElement(Recharts.ResponsiveContainer, null, children)));
  });
  function ChartTooltipContent({
    active,
    payload,
    label,
    labelFormatter,
    valueFormatter,
    className = ''
  }) {
    const {
      config
    } = useChart();
    if (!active || !payload || !payload.length) return null;
    const heading = labelFormatter ? labelFormatter(label, payload) : label;
    return /*#__PURE__*/React.createElement("div", {
      "data-slot": "chart-tooltip",
      role: "tooltip",
      className: join('c-admin-chart-tooltip', className)
    }, heading == null || heading === '' ? null : /*#__PURE__*/React.createElement("strong", null, heading), payload.map((item, index) => {
      const key = String(item.dataKey || item.name || index);
      const entry = config[key] || {};
      const color = item.color || entry.color;
      const value = valueFormatter ? valueFormatter(item.value, item, index) : item.value;
      return /*#__PURE__*/React.createElement("span", {
        key: key
      }, /*#__PURE__*/React.createElement("i", {
        style: {
          background: color
        }
      }), entry.label || item.name || key, /*#__PURE__*/React.createElement("b", null, value));
    }));
  }
  function ChartLegendContent({
    payload,
    className = ''
  }) {
    const {
      config
    } = useChart();
    if (!payload || !payload.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      "data-slot": "chart-legend",
      className: join('c-admin-chart-legend', className)
    }, payload.map((item, index) => {
      const key = String(item.dataKey || item.value || index);
      const entry = config[key] || {};
      return /*#__PURE__*/React.createElement("span", {
        key: key
      }, /*#__PURE__*/React.createElement("i", {
        style: {
          background: item.color || entry.color
        }
      }), entry.label || item.value || key);
    }));
  }
  window.AdminUIPrimitives = Object.freeze({
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
    ChartContainer,
    ChartLegendContent,
    ChartTooltipContent,
    useChart
  });
})();
}
