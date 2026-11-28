{
/* ===== 管理后台 / 通用数据表格 ===== */
(function () {
  const {
    useDeferredValue,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState
  } = React;
  const Vendor = window.LFAdminVendor && window.LFAdminVendor.TanStackTable;
  const UI = window.AdminUIPrimitives;
  const {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  } = UI;
  const EMPTY_ROWS = Object.freeze([]);
  const EMPTY_COLUMNS = Object.freeze([]);
  const TABLE_FEATURES = Vendor.tableFeatures({
    columnFilteringFeature: Vendor.columnFilteringFeature,
    globalFilteringFeature: Vendor.globalFilteringFeature,
    filteredRowModel: Vendor.createFilteredRowModel(),
    filterFns: {
      includesString: Vendor.filterFn_includesString
    },
    rowSortingFeature: Vendor.rowSortingFeature,
    sortedRowModel: Vendor.createSortedRowModel(),
    sortFns: {
      alphanumeric: Vendor.sortFn_alphanumeric,
      basic: Vendor.sortFn_basic,
      text: Vendor.sortFn_text
    },
    rowPaginationFeature: Vendor.rowPaginationFeature,
    paginatedRowModel: Vendor.createPaginatedRowModel()
  });
  const copy = () => window.CLANG === 'en' ? {
    search: 'Search table',
    rows: 'rows',
    noMatch: 'No matching rows',
    empty: 'No data yet',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
    showing: 'Showing',
    sortBy: 'Sort by',
    noSort: 'Original order',
    ascending: 'Ascending',
    descending: 'Descending',
    sortAsc: 'Sort ascending',
    sortDesc: 'Sort descending'
  } : {
    search: '搜索表格',
    rows: '行',
    noMatch: '没有符合条件的数据',
    empty: '暂无数据',
    previous: '上一页',
    next: '下一页',
    page: '第',
    of: '页，共',
    showing: '显示',
    sortBy: '排序字段',
    noSort: '原始顺序',
    ascending: '升序',
    descending: '降序',
    sortAsc: '升序排列',
    sortDesc: '降序排列'
  };
  const classValue = (value, ...args) => typeof value === 'function' ? value(...args) : value || '';
  const textOf = value => {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(textOf).join(' ');
    if (typeof value === 'object') return Object.values(value).map(textOf).join(' ');
    return String(value);
  };
  const filterOptions = filter => [{
    value: filter.allValue == null ? '' : filter.allValue,
    label: filter.allLabel || (window.CLANG === 'en' ? 'All' : '全部'),
    count: filter.allCount
  }].concat((filter.options || []).map(option => typeof option === 'object' ? option : {
    value: option,
    label: option
  }));
  function filterSelection(filter) {
    const options = filterOptions(filter);
    const allValue = filter.allValue == null ? '' : filter.allValue;
    const values = Array.isArray(filter.value) ? filter.value.map(String) : [];
    const available = options.slice(1).map(option => String(option.value));
    const allSelected = available.length > 0 && available.every(value => values.includes(value));
    return {
      options,
      active: filter.multiple ? !allSelected : String(filter.value == null ? allValue : filter.value) !== String(allValue),
      checked: value => filter.multiple ? String(value) === String(allValue) ? allSelected : values.includes(String(value)) : String(filter.value == null ? allValue : filter.value) === String(value),
      select: value => {
        if (!filter.multiple) return filter.onChange(value);
        const next = String(value) === String(allValue) ? allSelected ? [] : available : values.includes(String(value)) ? values.filter(item => item !== String(value)) : values.concat(String(value));
        filter.onChange(next);
      }
    };
  }
  function ColumnFilter({
    column
  }) {
    const [open, setOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState(null);
    const rootRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const filter = column.filter;
    const selection = filterSelection(filter);
    useEffect(() => {
      if (!open) return undefined;
      const closeOutside = event => {
        const insideTrigger = rootRef.current && rootRef.current.contains(event.target);
        const insideMenu = menuRef.current && menuRef.current.contains(event.target);
        if (!insideTrigger && !insideMenu) setOpen(false);
      };
      const closeOnEscape = event => {
        if (event.key !== 'Escape') return;
        setOpen(false);
        if (triggerRef.current) triggerRef.current.focus();
      };
      document.addEventListener('mousedown', closeOutside);
      document.addEventListener('keydown', closeOnEscape);
      return () => {
        document.removeEventListener('mousedown', closeOutside);
        document.removeEventListener('keydown', closeOnEscape);
      };
    }, [open]);
    useLayoutEffect(() => {
      if (!open || !triggerRef.current) {
        setMenuPosition(null);
        return undefined;
      }
      const placeMenu = () => {
        const rect = triggerRef.current.getBoundingClientRect();
        const top = Math.round(rect.bottom + 4);
        setMenuPosition({
          top,
          right: Math.max(12, Math.round(window.innerWidth - rect.right)),
          maxHeight: Math.max(120, Math.min(300, window.innerHeight - top - 12))
        });
      };
      placeMenu();
      window.addEventListener('resize', placeMenu);
      window.addEventListener('scroll', placeMenu, {
        capture: true,
        passive: true
      });
      return () => {
        window.removeEventListener('resize', placeMenu);
        window.removeEventListener('scroll', placeMenu, true);
      };
    }, [open]);
    const menu = open && menuPosition ? /*#__PURE__*/React.createElement("div", {
      ref: menuRef,
      className: "c-data-table-filter-menu",
      role: "menu",
      "aria-label": filter.label || column.header,
      style: menuPosition
    }, selection.options.map(option => /*#__PURE__*/React.createElement("button", {
      type: "button",
      role: filter.multiple ? 'menuitemcheckbox' : 'menuitemradio',
      "aria-checked": selection.checked(option.value),
      key: String(option.value),
      onClick: () => {
        selection.select(option.value);
        if (!filter.multiple) {
          setOpen(false);
          window.requestAnimationFrame(() => triggerRef.current && triggerRef.current.focus());
        }
      }
    }, /*#__PURE__*/React.createElement("span", null, option.label), option.count == null ? null : /*#__PURE__*/React.createElement("small", null, option.count)))) : null;
    return /*#__PURE__*/React.createElement("div", {
      className: 'c-data-table-filter' + (selection.active ? ' is-active' : ''),
      ref: rootRef
    }, /*#__PURE__*/React.createElement("button", {
      ref: triggerRef,
      type: "button",
      className: "c-data-table-filter-trigger",
      "aria-label": filter.label || column.header,
      "aria-haspopup": "menu",
      "aria-expanded": open,
      onClick: () => setOpen(value => !value)
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u25BC")), menu ? window.ReactDOM.createPortal(menu, document.body) : null);
  }
  function ColumnHeader({
    column,
    sortable,
    isSorted,
    direction,
    onSort,
    labels
  }) {
    const tooltipId = useId();
    const description = column.description;
    const sortLabel = isSorted && direction === 'asc' ? labels.sortDesc : labels.sortAsc;
    const content = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "c-data-table-header-label"
    }, column.header), description ? /*#__PURE__*/React.createElement("span", {
      id: tooltipId,
      role: "tooltip",
      className: "c-data-table-header-tooltip"
    }, description) : null);
    const label = sortable ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "c-data-table-sort-trigger",
      onClick: onSort,
      "aria-label": `${column.header}: ${sortLabel}`,
      "aria-describedby": description ? tooltipId : undefined
    }, content, /*#__PURE__*/React.createElement("i", {
      "aria-hidden": "true"
    }, isSorted ? direction === 'asc' ? '↑' : '↓' : '↕')) : /*#__PURE__*/React.createElement("span", {
      tabIndex: description ? 0 : undefined,
      "aria-describedby": description ? tooltipId : undefined
    }, content);
    return /*#__PURE__*/React.createElement("div", {
      className: "c-data-table-header"
    }, label, column.filter ? /*#__PURE__*/React.createElement(ColumnFilter, {
      column: column
    }) : null);
  }
  function AdminDataTable({
    rows = EMPTY_ROWS,
    columns = EMPTY_COLUMNS,
    rowKey,
    ariaLabel,
    caption,
    className = '',
    wrapClassName = '',
    search = false,
    pageSize = 0,
    initialSort,
    controlledSort,
    onSortChange,
    serverSort = false,
    pagination,
    empty,
    loading = false,
    loadingRows = 5,
    onRowActivate,
    rowClassName,
    selectedRowKey,
    toolbarEnd,
    compact = false
  }) {
    const labels = copy();
    const searchConfig = search && typeof search === 'object' ? search : {};
    const [query, setQuery] = useState(searchConfig.value || '');
    const deferredQuery = useDeferredValue(query);
    const [localSort, setLocalSort] = useState(initialSort || null);
    const [page, setPage] = useState(1);
    const sort = controlledSort === undefined ? localSort : controlledSort;
    const activeColumn = sort && columns.find(column => column.key === sort.key);
    const sortableColumns = useMemo(() => columns.filter(column => column.sortable !== false && (serverSort || !pagination || pagination.allowPageSort) && Boolean(column.sortValue || column.value || column.key)), [columns, serverSort, pagination && pagination.allowPageSort]);
    const filterColumns = useMemo(() => columns.filter(column => column.filter), [columns]);
    const getSearchText = useMemo(() => searchConfig.getText || ((row, index) => columns.map(column => {
      const valueOf = column.searchValue || column.sortValue || column.value;
      return valueOf ? valueOf(row, index) : row && row[column.key];
    })), [columns, searchConfig.getText]);
    const tableColumns = useMemo(() => [{
      id: '__search',
      accessorFn: (row, index) => textOf(getSearchText(row, index)),
      enableSorting: false
    }].concat(columns.map(column => ({
      id: column.key,
      accessorFn: (row, index) => {
        const valueOf = column.sortValue || column.value;
        return valueOf ? valueOf(row, index) : row && row[column.key];
      },
      enableSorting: sortableColumns.includes(column),
      sortUndefined: 'last',
      sortingFn: 'auto'
    }))), [columns, getSearchText, sortableColumns]);
    const localPageSize = Math.max(1, Number(pageSize) || rows.length || 1);
    const table = Vendor.useTable({
      features: TABLE_FEATURES,
      data: rows,
      columns: tableColumns,
      state: {
        globalFilter: search ? deferredQuery : '',
        sorting: sort ? [{
          id: sort.key,
          desc: sort.direction === 'desc'
        }] : [],
        pagination: {
          pageIndex: pagination ? 0 : page - 1,
          pageSize: pagination ? Math.max(1, rows.length || 1) : localPageSize
        }
      },
      globalFilterFn: 'includesString',
      getColumnCanGlobalFilter: column => column.id === '__search',
      manualSorting: serverSort,
      manualPagination: Boolean(pagination),
      rowCount: pagination ? Number(pagination.total || 0) : rows.length,
      getRowId: rowKey ? (row, index) => String(typeof rowKey === 'function' ? rowKey(row, index) : row[rowKey]) : undefined
    });
    const visibleRows = table.getRowModel().rows.map(row => row.original);
    const processedCount = table.getPrePaginatedRowModel().rows.length;
    const totalRows = pagination ? Number(pagination.total || 0) : processedCount;
    const totalPages = pagination ? Math.max(1, Number(pagination.pages || 1)) : Math.max(1, Math.ceil(processedCount / localPageSize));
    const currentPage = pagination ? Number(pagination.page || 1) : Math.min(Math.max(1, page), totalPages);
    const start = visibleRows.length ? (currentPage - 1) * (pagination ? Number(pagination.pageSize || visibleRows.length) : localPageSize) + 1 : 0;
    const end = visibleRows.length ? Math.min(totalRows, start + visibleRows.length - 1) : 0;
    useEffect(() => {
      setPage(1);
    }, [deferredQuery, sort && sort.key, sort && sort.direction, rows.length]);
    useEffect(() => {
      if (!pagination && page !== currentPage) setPage(currentPage);
    }, [pagination, page, currentPage]);
    const applySort = next => {
      if (onSortChange) onSortChange(next);
      if (controlledSort === undefined) setLocalSort(next);
    };
    const changeSort = column => {
      if (!sortableColumns.includes(column)) return;
      applySort(sort && sort.key === column.key ? {
        key: column.key,
        direction: sort.direction === 'asc' ? 'desc' : 'asc'
      } : {
        key: column.key,
        direction: column.defaultDirection || 'asc'
      });
    };
    const changePage = next => {
      const safe = Math.max(1, Math.min(totalPages, next));
      if (pagination && pagination.onPageChange) pagination.onPageChange(safe);else setPage(safe);
    };
    const activateRow = (event, row) => {
      if (!onRowActivate) return;
      const interactive = event.target.closest && event.target.closest('button,a,input,select,textarea,label');
      if (interactive && interactive !== event.currentTarget) return;
      if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
      if (event.type === 'keydown') event.preventDefault();
      onRowActivate(row);
    };
    const keyOf = (row, index) => typeof rowKey === 'function' ? rowKey(row, index) : rowKey ? row[rowKey] : index;
    const emptyCopy = typeof empty === 'string' ? empty : empty && (deferredQuery ? empty.filtered : empty.default) || (deferredQuery ? labels.noMatch : labels.empty);
    const showFooter = totalPages > 1 || totalRows > 0;
    return /*#__PURE__*/React.createElement("div", {
      className: 'c-data-table' + (compact ? ' is-compact' : '')
    }, search || toolbarEnd ? /*#__PURE__*/React.createElement("div", {
      className: "c-data-table-toolbar"
    }, search ? /*#__PURE__*/React.createElement("label", {
      className: "c-data-table-search"
    }, /*#__PURE__*/React.createElement("span", {
      className: "sr-only"
    }, searchConfig.label || labels.search), /*#__PURE__*/React.createElement("input", {
      type: "search",
      value: query,
      onChange: event => {
        setQuery(event.target.value);
        if (searchConfig.onChange) searchConfig.onChange(event.target.value);
      },
      placeholder: searchConfig.placeholder || labels.search
    })) : /*#__PURE__*/React.createElement("span", null), toolbarEnd ? /*#__PURE__*/React.createElement("div", {
      className: "c-data-table-toolbar-end"
    }, toolbarEnd) : null) : null, sortableColumns.length ? /*#__PURE__*/React.createElement("div", {
      className: "c-data-table-mobile-sort"
    }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, labels.sortBy), /*#__PURE__*/React.createElement("select", {
      value: sort ? sort.key : '',
      onChange: event => {
        const column = sortableColumns.find(item => item.key === event.target.value);
        applySort(column ? {
          key: column.key,
          direction: column.defaultDirection || 'asc'
        } : null);
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, labels.noSort), sortableColumns.map(column => /*#__PURE__*/React.createElement("option", {
      key: column.key,
      value: column.key
    }, column.header)))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: !activeColumn,
      "aria-label": sort && sort.direction === 'asc' ? labels.sortDesc : labels.sortAsc,
      onClick: () => activeColumn && changeSort(activeColumn)
    }, sort && sort.direction === 'desc' ? labels.descending : labels.ascending)) : null, filterColumns.length ? /*#__PURE__*/React.createElement("div", {
      className: "c-data-table-mobile-filters"
    }, filterColumns.map(column => {
      const selection = filterSelection(column.filter);
      return column.filter.multiple ? /*#__PURE__*/React.createElement("fieldset", {
        className: "c-data-table-multi-filter",
        key: column.key
      }, /*#__PURE__*/React.createElement("legend", null, column.header), selection.options.map(option => /*#__PURE__*/React.createElement("label", {
        key: String(option.value)
      }, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: selection.checked(option.value),
        onChange: () => selection.select(option.value)
      }), /*#__PURE__*/React.createElement("span", null, option.label, option.count == null ? '' : ` (${option.count})`)))) : /*#__PURE__*/React.createElement("label", {
        key: column.key
      }, /*#__PURE__*/React.createElement("span", null, column.header), /*#__PURE__*/React.createElement("select", {
        value: column.filter.value == null ? column.filter.allValue || '' : column.filter.value,
        onChange: event => column.filter.onChange(event.target.value)
      }, selection.options.map(option => /*#__PURE__*/React.createElement("option", {
        value: option.value,
        key: String(option.value)
      }, option.label, option.count == null ? '' : ` (${option.count})`))));
    })) : null, /*#__PURE__*/React.createElement(Table, {
      className: 'c-data-table-grid ' + className,
      containerClassName: 'c-data-table-scroll ' + wrapClassName,
      containerProps: {
        role: 'region',
        'aria-label': ariaLabel,
        tabIndex: 0
      }
    }, /*#__PURE__*/React.createElement(TableCaption, {
      className: "sr-only"
    }, caption || ariaLabel), /*#__PURE__*/React.createElement(TableHeader, null, /*#__PURE__*/React.createElement(TableRow, null, columns.map(column => {
      const isSorted = sort && sort.key === column.key;
      const sortable = sortableColumns.includes(column);
      return /*#__PURE__*/React.createElement(TableHead, {
        key: column.key,
        scope: "col",
        className: [column.numeric ? 'is-numeric' : '', column.priority ? `is-${column.priority}` : '', column.headerClassName || ''].filter(Boolean).join(' '),
        "aria-sort": isSorted ? sort.direction === 'asc' ? 'ascending' : 'descending' : undefined
      }, /*#__PURE__*/React.createElement(ColumnHeader, {
        column: column,
        sortable: sortable,
        isSorted: isSorted,
        direction: sort && sort.direction,
        onSort: () => changeSort(column),
        labels: labels
      }));
    }))), /*#__PURE__*/React.createElement(TableBody, null, loading ? Array.from({
      length: loadingRows
    }, (_, rowIndex) => /*#__PURE__*/React.createElement(TableRow, {
      className: "is-loading",
      key: `loading-${rowIndex}`
    }, columns.map(column => /*#__PURE__*/React.createElement(TableCell, {
      key: column.key
    }, /*#__PURE__*/React.createElement("i", null))))) : visibleRows.map((row, rowIndex) => {
      const key = keyOf(row, rowIndex);
      const selected = selectedRowKey != null && String(selectedRowKey) === String(key);
      return /*#__PURE__*/React.createElement(TableRow, {
        key: key,
        className: [classValue(rowClassName, row, rowIndex), selected ? 'is-selected' : '', onRowActivate ? 'is-actionable' : ''].filter(Boolean).join(' '),
        tabIndex: onRowActivate ? 0 : undefined,
        "aria-selected": selected || undefined,
        onClick: event => activateRow(event, row),
        onKeyDown: event => activateRow(event, row)
      }, columns.map(column => /*#__PURE__*/React.createElement(TableCell, {
        key: column.key,
        "data-label": column.header,
        className: [column.numeric ? 'is-numeric' : '', column.priority ? `is-${column.priority}` : '', column.header ? '' : 'is-action', classValue(column.cellClassName, row, rowIndex)].filter(Boolean).join(' ')
      }, column.render ? column.render(row, rowIndex) : column.value ? column.value(row, rowIndex) : row[column.key])));
    }), !loading && !visibleRows.length ? /*#__PURE__*/React.createElement(TableRow, {
      className: "is-empty"
    }, /*#__PURE__*/React.createElement(TableCell, {
      colSpan: Math.max(1, columns.length)
    }, /*#__PURE__*/React.createElement("strong", null, emptyCopy))) : null)), showFooter ? /*#__PURE__*/React.createElement("footer", {
      className: "c-data-table-footer"
    }, /*#__PURE__*/React.createElement("span", null, labels.showing, " ", start, "\u2013", end, " / ", totalRows, " ", labels.rows), totalPages > 1 ? /*#__PURE__*/React.createElement("nav", {
      "aria-label": `${labels.page} ${currentPage} ${labels.of} ${totalPages}`
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: currentPage <= 1,
      onClick: () => changePage(currentPage - 1)
    }, labels.previous), /*#__PURE__*/React.createElement("span", null, currentPage, " / ", totalPages), /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: currentPage >= totalPages,
      onClick: () => changePage(currentPage + 1)
    }, labels.next)) : null) : null);
  }
  window.AdminDataTable = AdminDataTable;
})();
}
