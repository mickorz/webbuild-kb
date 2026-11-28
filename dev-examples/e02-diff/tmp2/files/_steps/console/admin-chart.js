{
/* ===== 管理后台 / 通用数据可视化 ===== */
(function () {
  const {
    useEffect,
    useMemo,
    useState
  } = React;
  const Recharts = window.LFAdminVendor && window.LFAdminVendor.Recharts;
  const {
    ChartContainer,
    ChartTooltipContent
  } = window.AdminUIPrimitives;
  const copy = () => window.CLANG === 'en' ? {
    empty: 'No chart data',
    overall: 'of first stage',
    previous: 'from previous stage',
    max: 'maximum',
    unknown: 'Unavailable',
    series: 'Chart series'
  } : {
    empty: '暂无图表数据',
    overall: '占首阶段',
    previous: '较上一阶段',
    max: '最大值',
    unknown: '暂不可用',
    series: '图表序列'
  };
  const number = value => (Number(value) || 0).toLocaleString();
  const finite = value => {
    if (value == null || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };
  const valueOf = (item, index, getter, key) => getter ? getter(item, index) : item && item[key];
  const formatValue = (series, value) => series.format ? series.format(value) : number(value);
  const toneClass = tone => `tone-${tone || 'gold'}`;
  const toneColor = tone => ({
    gold: 'var(--gold-deep)',
    terra: 'var(--terra)',
    slate: 'var(--slate)',
    sage: 'var(--sage)',
    ink: 'var(--ink-2)'
  })[tone || 'gold'];
  function AdminCartesianChart({
    rows = [],
    series = [],
    xKey,
    xValue,
    xDomain,
    domains,
    xTickFormatter,
    ariaLabel,
    empty,
    loading = false,
    height = 190,
    compact = false,
    legend = true,
    showGrid = true,
    showXAxis = true,
    showYAxis = true,
    tickCount = 3,
    className = ''
  }) {
    const labels = copy();
    const [hiddenKeys, setHiddenKeys] = useState(() => new Set());
    const visibleSeries = series.filter(item => !hiddenKeys.has(item.key));
    const numericXAxis = Array.isArray(xDomain) && xDomain.length === 2;
    const chartRows = useMemo(() => rows.map((row, index) => {
      const rawX = xValue ? xValue(row, index) : xKey ? row && row[xKey] : index + 1;
      const normalizedX = numericXAxis ? rawX instanceof Date ? rawX.getTime() : typeof rawX === 'string' ? Date.parse(rawX) : Number(rawX) : rawX;
      const output = {
        __source: row,
        __x: normalizedX
      };
      series.forEach(item => {
        output[item.key] = finite(item.value ? item.value(row, index) : row && row[item.key]);
      });
      return output;
    }), [rows, series, xKey, xValue, numericXAxis]);
    const config = useMemo(() => Object.fromEntries(series.map(item => [item.key, {
      label: item.label,
      color: toneColor(item.tone)
    }])), [series]);
    useEffect(() => {
      const keys = new Set(series.map(item => item.key));
      setHiddenKeys(current => {
        const next = new Set([...current].filter(key => keys.has(key)));
        return next.size === current.size ? current : next;
      });
    }, [series.map(item => item.key).join('|')]);
    const toggleSeries = key => {
      setHiddenKeys(current => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key);else if (visibleSeries.length > 1) next.add(key);
        return next;
      });
    };
    const formatX = value => xTickFormatter ? xTickFormatter(value) : String(value == null ? '' : value);
    const formatTooltipValue = (value, item) => {
      const owner = series.find(seriesItem => seriesItem.key === item.dataKey);
      return owner ? formatValue(owner, value) : number(value);
    };
    const axisSeries = axis => visibleSeries.find(item => (item.axis || 'left') === axis);
    const axisFormatter = axis => value => {
      const owner = axisSeries(axis);
      return owner ? formatValue(owner, value) : number(value);
    };
    if (loading) return /*#__PURE__*/React.createElement("div", {
      className: 'c-admin-chart is-loading' + (compact ? ' is-compact' : '')
    }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null));
    if (!chartRows.length || !visibleSeries.length) return /*#__PURE__*/React.createElement("div", {
      className: "c-admin-chart-empty"
    }, empty || labels.empty);
    const hasRightAxis = visibleSeries.some(item => item.axis === 'right');
    return /*#__PURE__*/React.createElement("div", {
      className: 'c-admin-chart' + (compact ? ' is-compact' : '') + (className ? ` ${className}` : '')
    }, legend ? /*#__PURE__*/React.createElement("div", {
      className: "c-admin-chart-legend",
      "aria-label": labels.series
    }, series.map(item => {
      const visible = !hiddenKeys.has(item.key);
      return /*#__PURE__*/React.createElement("button", {
        type: "button",
        key: item.key,
        className: `${toneClass(item.tone)}${visible ? ' is-visible' : ''}`,
        "aria-pressed": visible,
        disabled: visible && visibleSeries.length === 1,
        onClick: () => toggleSeries(item.key)
      }, /*#__PURE__*/React.createElement("i", null), item.label);
    })) : null, /*#__PURE__*/React.createElement(ChartContainer, {
      config: config,
      className: "c-admin-chart-stage",
      style: {
        height: `${height}px`
      },
      role: "img",
      "aria-label": ariaLabel
    }, /*#__PURE__*/React.createElement(Recharts.ComposedChart, {
      data: chartRows,
      margin: {
        top: compact ? 6 : 12,
        right: hasRightAxis ? 8 : 2,
        bottom: showXAxis ? 0 : -14,
        left: showYAxis ? -8 : -30
      },
      accessibilityLayer: true,
      barCategoryGap: "28%"
    }, showGrid ? /*#__PURE__*/React.createElement(Recharts.CartesianGrid, {
      vertical: false,
      stroke: "var(--line-2)",
      strokeDasharray: "2 4"
    }) : null, showXAxis ? /*#__PURE__*/React.createElement(Recharts.XAxis, {
      dataKey: "__x",
      type: numericXAxis ? 'number' : 'category',
      domain: numericXAxis ? xDomain : undefined,
      scale: numericXAxis ? 'time' : 'auto',
      tickFormatter: formatX,
      tickLine: false,
      axisLine: false,
      minTickGap: 24,
      tickCount: tickCount
    }) : null, showYAxis ? /*#__PURE__*/React.createElement(Recharts.YAxis, {
      yAxisId: "left",
      domain: domains && domains.left != null ? [0, domains.left] : [0, 'auto'],
      tickFormatter: axisFormatter('left'),
      tickLine: false,
      axisLine: false,
      width: 38
    }) : null, showYAxis && hasRightAxis ? /*#__PURE__*/React.createElement(Recharts.YAxis, {
      yAxisId: "right",
      orientation: "right",
      domain: domains && domains.right != null ? [0, domains.right] : [0, 'auto'],
      tickFormatter: axisFormatter('right'),
      tickLine: false,
      axisLine: false,
      width: 38
    }) : null, /*#__PURE__*/React.createElement(Recharts.Tooltip, {
      cursor: {
        stroke: 'var(--ink-3)',
        strokeDasharray: '2 3'
      },
      content: /*#__PURE__*/React.createElement(ChartTooltipContent, {
        labelFormatter: formatX,
        valueFormatter: formatTooltipValue
      })
    }), visibleSeries.map(item => item.type === 'bar' ? /*#__PURE__*/React.createElement(Recharts.Bar, {
      key: item.key,
      dataKey: item.key,
      name: item.label,
      yAxisId: item.axis || 'left',
      fill: toneColor(item.tone),
      fillOpacity: item.overlay ? .92 : .7,
      barSize: item.overlay ? 8 : undefined,
      radius: [2, 2, 0, 0],
      isAnimationActive: false
    }) : /*#__PURE__*/React.createElement(Recharts.Line, {
      key: item.key,
      type: "linear",
      dataKey: item.key,
      name: item.label,
      yAxisId: item.axis || 'left',
      stroke: toneColor(item.tone),
      strokeWidth: 2,
      strokeDasharray: item.dashed ? '5 4' : undefined,
      dot: false,
      activeDot: {
        r: 3.5,
        strokeWidth: 2,
        fill: 'var(--card)'
      },
      connectNulls: false,
      isAnimationActive: false
    })))));
  }
  function AdminMetricBars({
    items = [],
    ariaLabel,
    empty,
    max,
    labelKey = 'label',
    valueKey = 'value',
    value,
    format,
    detail,
    tone = 'slate',
    compact = false
  }) {
    const labels = copy();
    const values = items.map((item, index) => finite(valueOf(item, index, value, valueKey)));
    const domain = Math.max(1, finite(max) || 0, ...values.map(item => item == null ? 0 : Math.max(0, item)));
    if (!items.length) return /*#__PURE__*/React.createElement("div", {
      className: "c-admin-chart-empty"
    }, empty || labels.empty);
    return /*#__PURE__*/React.createElement("ol", {
      className: `c-admin-metric-bars ${toneClass(tone)}${compact ? ' is-compact' : ''}`,
      "aria-label": ariaLabel
    }, items.map((item, index) => {
      const numeric = values[index];
      const available = numeric != null;
      const itemDetail = typeof detail === 'function' ? detail(item, index) : item.detail;
      return /*#__PURE__*/React.createElement("li", {
        key: item.key || item[labelKey] || index,
        className: available ? '' : 'is-unavailable'
      }, /*#__PURE__*/React.createElement("span", null, item[labelKey]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("i", {
        style: {
          width: available ? numeric > 0 ? `${Math.max(2, numeric / domain * 100)}%` : '0%' : '100%'
        }
      })), /*#__PURE__*/React.createElement("strong", null, available ? format ? format(numeric, item, index) : number(numeric) : labels.unknown), itemDetail ? /*#__PURE__*/React.createElement("small", null, itemDetail) : null);
    }));
  }
  function AdminFunnelChart({
    stages = [],
    ariaLabel,
    empty,
    format = number,
    overallLabel,
    previousLabel,
    compact = false
  }) {
    const labels = copy();
    if (!stages.length) return /*#__PURE__*/React.createElement("div", {
      className: "c-admin-chart-empty"
    }, empty || labels.empty);
    const first = finite(stages[0].value);
    const percentage = (value, total) => total ? value * 100 / total : null;
    return /*#__PURE__*/React.createElement("ol", {
      className: `c-admin-funnel${compact ? ' is-compact' : ''}`,
      "aria-label": ariaLabel
    }, stages.map((stage, index) => {
      const numeric = finite(stage.value);
      const available = numeric != null;
      const previous = index ? finite(stages[index - 1].value) : null;
      const overall = available && first != null ? percentage(numeric, first) : null;
      const step = available && previous != null ? percentage(numeric, previous) : null;
      return /*#__PURE__*/React.createElement("li", {
        key: stage.key || stage.label || index,
        className: available ? '' : 'is-unavailable'
      }, /*#__PURE__*/React.createElement("span", {
        className: "c-admin-funnel-index"
      }, String(index + 1).padStart(2, '0')), /*#__PURE__*/React.createElement("span", {
        className: "c-admin-funnel-label"
      }, stage.label), /*#__PURE__*/React.createElement("div", {
        className: "c-admin-funnel-track"
      }, /*#__PURE__*/React.createElement("i", {
        style: {
          width: available ? first > 0 && numeric > 0 ? `${Math.max(2, Math.min(100, numeric / first * 100))}%` : '0%' : '100%'
        }
      })), /*#__PURE__*/React.createElement("strong", null, available ? format(numeric, stage, index) : '—'), /*#__PURE__*/React.createElement("small", null, available ? /*#__PURE__*/React.createElement(React.Fragment, null, overall == null ? '—' : `${overall.toFixed(1)}%`, " \xB7 ", overallLabel || labels.overall, index && step != null ? /*#__PURE__*/React.createElement("em", null, step.toFixed(1), "% \xB7 ", previousLabel || labels.previous) : null) : labels.unknown));
    }));
  }
  window.AdminCartesianChart = AdminCartesianChart;
  window.AdminMetricBars = AdminMetricBars;
  window.AdminFunnelChart = AdminFunnelChart;
})();
}
