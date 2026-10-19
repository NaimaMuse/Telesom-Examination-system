import React, { useState, useCallback, useMemo } from 'react';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import './ui.css';

/**
 * DataTable - Sortable, searchable, paginated data table
 * @param {{ key: string, label: string, render?: Function }[]} columns - Column definitions
 * @param {Object[]} data - Row data array
 * @param {boolean} loading - Show loading skeleton
 * @param {string} emptyMessage - Message when no data
 * @param {boolean} searchable - Show search input
 * @param {React.ReactNode} actions - Action buttons rendered in header right
 */
const ROWS_OPTIONS = [10, 25, 50, 100];

const SortIcon = ({ direction }) => {
  if (!direction) {
    return (
      <svg className="sort-icon sort-icon--neutral" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M4 5.5L7 2.5L10 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 8.5L7 11.5L10 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (direction === 'asc') {
    return (
      <svg className="sort-icon sort-icon--active" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M4 9L7 5L10 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="sort-icon sort-icon--active" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4 5L7 9L10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data available',
  searchable = false,
  actions,
}) => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleSort = useCallback(
    (key) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
      setPage(1);
    },
    [sortKey]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleRowsChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setPage(1);
  };

  return (
    <div className="data-table-wrapper">
      {/* Table Header */}
      {(searchable || actions) && (
        <div className="data-table-header">
          {searchable && (
            <div className="table-search-wrapper">
              <svg className="table-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                className="table-search-input"
                type="text"
                placeholder="Search..."
                value={search}
                onChange={handleSearchChange}
              />
            </div>
          )}
          {actions && <div className="data-table-actions">{actions}</div>}
        </div>
      )}

      {/* Table */}
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`data-table-th${col.sortable !== false ? ' data-table-th--sortable' : ''}`}
                  onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                >
                  <span className="th-content">
                    {col.label}
                    {col.sortable !== false && (
                      <SortIcon direction={sortKey === col.key ? sortDir : null} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: rowsPerPage > 5 ? 5 : rowsPerPage }).map((_, i) => (
                <tr key={i} className="table-skeleton-row">
                  {columns.map((col) => (
                    <td key={col.key}>
                      <div className="skeleton skeleton-text" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="table-empty">
                    <EmptyState
                      icon={
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                          <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
                          <path d="M16 20h16M16 26h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      }
                      title="No results found"
                      description={emptyMessage}
                    />
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, rowIdx) => (
                <tr key={row.id ?? rowIdx} className="table-row-hover">
                  {columns.map((col) => (
                    <td key={col.key} className="data-table-td">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && sorted.length > 0 && (
        <div className="table-pagination">
          <div className="pagination-info">
            <span>Rows per page:</span>
            <select
              className="pagination-rows-select"
              value={rowsPerPage}
              onChange={handleRowsChange}
            >
              {ROWS_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="pagination-nav">
            <span className="pagination-count">
              {(page - 1) * rowsPerPage + 1}–
              {Math.min(page * rowsPerPage, sorted.length)} of {sorted.length}
            </span>
            <button
              className="pagination-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className="pagination-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
