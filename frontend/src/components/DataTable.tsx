import React, { useMemo, useState } from 'react';
import {
  Search, Edit2, Trash2, Eye, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, SlidersHorizontal,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SkeletonRow } from './ui/Skeleton';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, item: T) => React.ReactNode;
  className?: string;
}

/**
 * #13 FIX: Props untuk server-side pagination.
 * Ketika prop ini disediakan, DataTable menonaktifkan paginasi/filter client-side
 * dan mendelegasikan pengendalian halaman ke parent.
 */
export interface ServerPaginationProps {
  /** Total item dari server */
  totalItems: number;
  /** Halaman aktif saat ini (1-indexed) */
  currentPage: number;
  /** Jumlah item per halaman saat ini */
  perPage: number;
  /** Dipanggil saat user ganti halaman */
  onPageChange: (page: number) => void;
  /** Dipanggil saat user ganti jumlah per halaman */
  onPerPageChange: (perPage: number) => void;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onView?:   (item: T) => void;
  onEdit?:   (item: T) => void;
  onDelete?: (item: T) => void;
  searchPlaceholder?: string;
  /** Called on every keystroke; if omitted, client-side search applies */
  onSearch?: (value: string) => void;
  /** Keys to search across (for client-side search) */
  searchKeys?: string[];
  pageSize?: number;
  /** Extra toolbar slot (e.g. Add button) */
  toolbar?: React.ReactNode;
  rowKey?: (item: T) => string | number;
  emptyMessage?: string;
  /** #13 FIX: Aktifkan server-side pagination. Jika disediakan, paginasi client-side dinonaktifkan. */
  serverPagination?: ServerPaginationProps;
}

type SortDir = 'asc' | 'desc';

// ── Component ──────────────────────────────────────────────────────────────────
function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  onView,
  onEdit,
  onDelete,
  searchPlaceholder = 'Search...',
  onSearch,
  searchKeys = [],
  pageSize = 10,
  toolbar,
  rowKey,
  emptyMessage = 'No records found',
  serverPagination,
}: DataTableProps<T>) {
  const [search,    setSearch]    = useState('');
  const [page,      setPage]      = useState(1);
  const [sortKey,   setSortKey]   = useState<string | null>(null);
  const [sortDir,   setSortDir]   = useState<SortDir>('asc');
  const [perPage,   setPerPage]   = useState(pageSize);

  // #13 FIX: Jika serverPagination disediakan, gunakan nilai dari parent
  const isServerPaged = !!serverPagination;

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = (val: string) => {
    setSearch(val);
    if (!isServerPaged) setPage(1);
    onSearch?.(val);
  };

  // ── Filter (client-side if no onSearch AND no serverPagination) ───────────
  const filtered = useMemo(() => {
    if (isServerPaged || onSearch || !search.trim()) return data;
    const lower = search.toLowerCase();
    const keys  = searchKeys.length ? searchKeys : columns.map((c) => c.key);
    return data.filter((row) =>
      keys.some((k) => String(row[k] ?? '').toLowerCase().includes(lower)),
    );
  }, [data, search, onSearch, searchKeys, columns, isServerPaged]);

  // ── Sort ───────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (isServerPaged || !sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir, isServerPaged]);

  // ── Pagination values (client vs server) ───────────────────────────────────
  const effectivePerPage  = isServerPaged ? serverPagination!.perPage  : perPage;
  const effectiveTotal    = isServerPaged ? serverPagination!.totalItems : sorted.length;
  const effectivePage     = isServerPaged ? serverPagination!.currentPage : Math.min(page, Math.max(1, Math.ceil(sorted.length / perPage)));
  const totalPages        = Math.max(1, Math.ceil(effectiveTotal / effectivePerPage));
  const pageData          = isServerPaged ? data : sorted.slice((effectivePage - 1) * effectivePerPage, effectivePage * effectivePerPage);

  const handlePageChange = (newPage: number) => {
    if (isServerPaged) {
      serverPagination!.onPageChange(newPage);
    } else {
      setPage(newPage);
    }
  };

  const handlePerPageChange = (newPerPage: number) => {
    if (isServerPaged) {
      serverPagination!.onPerPageChange(newPerPage);
    } else {
      setPerPage(newPerPage);
      setPage(1);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    if (!isServerPaged) setPage(1);
  };

  const hasActions = !!(onView || onEdit || onDelete);

  return (
    <div className="card overflow-hidden">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-0 w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-forest-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-forest-800 placeholder:text-forest-300 focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 transition-all"
          />
        </div>

        {/* Per-page selector */}
        <select
          value={effectivePerPage}
          onChange={(e) => handlePerPageChange(Number(e.target.value))}
          className="py-2 pl-3 pr-7 bg-gray-50 border border-gray-200 rounded-xl text-xs text-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 appearance-none transition-all cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%230d7171' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.5rem center',
          }}
        >
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>

        {/* Right slot */}
        {toolbar && <div className="ml-auto flex items-center gap-2">{toolbar}</div>}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    col.sortable && 'cursor-pointer select-none hover:text-forest-600 transition-colors',
                    col.className,
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="inline-flex flex-col gap-px opacity-50">
                        <span className={cn('text-[8px] leading-none', sortKey === col.key && sortDir === 'asc' && 'opacity-100 text-forest-600')}>▲</span>
                        <span className={cn('text-[8px] leading-none', sortKey === col.key && sortDir === 'desc' && 'opacity-100 text-forest-600')}>▼</span>
                      </span>
                    )}
                  </span>
                </th>
              ))}
              {hasActions && (
                <th className="text-right pr-5">
                  <SlidersHorizontal className="inline h-3 w-3" />
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: perPage }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length + (hasActions ? 1 : 0)} />
              ))
            ) : pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  className="px-6 py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-forest-300">
                    <Search className="h-8 w-8 opacity-30" />
                    <p className="text-sm font-medium italic">{emptyMessage}</p>
                    {search && (
                      <p className="text-xs">
                        No results for{' '}
                        <span className="font-semibold text-forest-500">"{search}"</span>
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map((item, idx) => {
                const key = rowKey
                  ? rowKey(item)
                  : (item.id as string | number) ??
                    (item.reg_id as string | number) ??
                    (item.code as string | number) ??
                    idx;
                return (
                  <tr key={key} className="group transition-colors hover:bg-forest-50/40">
                    {columns.map((col) => (
                      <td key={col.key} className={col.className}>
                        {col.render
                          ? col.render(item[col.key], item)
                          : (item[col.key] as React.ReactNode) ?? '-'}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="pr-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onView && (
                            <button
                              title="View"
                              onClick={() => onView(item)}
                              className="p-1.5 rounded-lg text-forest-400 hover:text-forest-700 hover:bg-forest-100 transition-all"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {onEdit && (
                            <button
                              title="Edit"
                              onClick={() => onEdit(item)}
                              className="p-1.5 rounded-lg text-forest-400 hover:text-forest-700 hover:bg-forest-100 transition-all"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              title="Delete"
                              onClick={() => onDelete(item)}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {!isLoading && effectiveTotal > 0 && (
        <div className="px-5 py-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
          <p className="text-xs text-forest-500 font-medium">
            Showing{' '}
            <span className="font-bold text-forest-700">
              {(effectivePage - 1) * effectivePerPage + 1}–{Math.min(effectivePage * effectivePerPage, effectiveTotal)}
            </span>{' '}
            of{' '}
            <span className="font-bold text-forest-700">{effectiveTotal}</span> records
          </p>

          <div className="flex items-center gap-1">
            <PagBtn
              onClick={() => handlePageChange(1)}
              disabled={effectivePage === 1}
              title="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </PagBtn>
            <PagBtn
              onClick={() => handlePageChange(effectivePage - 1)}
              disabled={effectivePage === 1}
              title="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </PagBtn>

            {getPageNumbers(effectivePage, totalPages).map((n, i) =>
              n === '...' ? (
                <span key={`dot-${i}`} className="px-2 text-forest-300 text-xs">…</span>
              ) : (
                <PagBtn
                  key={n}
                  onClick={() => handlePageChange(Number(n))}
                  active={effectivePage === n}
                >
                  {n}
                </PagBtn>
              ),
            )}

            <PagBtn
              onClick={() => handlePageChange(effectivePage + 1)}
              disabled={effectivePage === totalPages}
              title="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </PagBtn>
            <PagBtn
              onClick={() => handlePageChange(totalPages)}
              disabled={effectivePage === totalPages}
              title="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </PagBtn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pagination button helper ───────────────────────────────────────────────────
const PagBtn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
> = ({ active, className, children, ...props }) => (
  <button
    className={cn(
      'h-7 min-w-[28px] px-1.5 flex items-center justify-center rounded-lg text-xs font-semibold transition-all',
      active
        ? 'bg-forest-800 text-white'
        : 'text-forest-600 hover:bg-forest-100 disabled:opacity-30 disabled:cursor-not-allowed',
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

// ── Page number logic ──────────────────────────────────────────────────────────
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

export default DataTable;
