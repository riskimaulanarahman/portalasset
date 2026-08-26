/**
 * lib/utils.ts
 * Utility helpers for the Portal Asset admin panel.
 */

// ── Class merging ──────────────────────────────────────────────────────────────
/** Simple cn() helper – merges class strings, filtering falsy values. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ── Formatting ─────────────────────────────────────────────────────────────────
/** Format a number as Indonesian Rupiah */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a number with thousand separators */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n);
}

/** Format a date string to locale (e.g. "18 Mar 2026") */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Format a date to ISO yyyy-mm-dd (for input[type=date] default) */
export function toInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/** Relative time (e.g. "2 hours ago") */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

// ── String ─────────────────────────────────────────────────────────────────────
/** Capitalize first letter */
export function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Truncate a string with ellipsis */
export function truncate(s: string, maxLen = 40): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + '...';
}

/** Get initials from a name (e.g. "John Doe" → "JD") */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Array helpers ──────────────────────────────────────────────────────────────
/** Paginate an array */
export function paginate<T>(arr: T[], page: number, perPage: number): T[] {
  return arr.slice((page - 1) * perPage, page * perPage);
}

/** Filter array by a search string across given keys */
export function filterBySearch<T extends Record<string, unknown>>(
  arr: T[],
  search: string,
  keys: (keyof T)[],
): T[] {
  if (!search.trim()) return arr;
  const lower = search.toLowerCase();
  return arr.filter((item) =>
    keys.some((k) => String(item[k] ?? '').toLowerCase().includes(lower)),
  );
}

// ── Color helpers ──────────────────────────────────────────────────────────────
/** Map a transaction type to badge class */
export function txTypeBadge(type: string): string {
  return type === 'IN' ? 'badge badge-active' : 'badge badge-inactive';
}

/** Map active status to badge class */
export function statusBadge(notActive: unknown): string {
  return parseBoolean(notActive) ? 'badge badge-inactive' : 'badge badge-active';
}

export function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'y', 'on'].includes(value.trim().toLowerCase());
  }

  return Boolean(value);
}

// ── Local Storage ──────────────────────────────────────────────────────────────
export function getStoredUser(): {
  name?: string;
  not_active?: boolean;
  access_setup_required?: boolean;
  estate_id?: string;
  role_id?: number;
  role?: { name: string };
  permissions?: string[];
  estate?: { id?: number; estate_id?: string; estate?: string };
  asset_departments?: { id: number; name: string; code?: string | null }[];
  asset_divisions?: { id: number; name: string; code?: string | null; asset_department_id?: number }[];
  username?: string;
} {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

// ── Head Office helpers ────────────────────────────────────────────────────────
/**
 * #22 FIX: Sentralisasi cek apakah user dari Head Office.
 * Gunakan fungsi ini di semua halaman — jangan inline cek estate_id === 'HO'.
 */
export function isHeadOfficeUser(): boolean {
  const user = getStoredUser();
  return user?.estate?.estate_id === 'HO';
}

export function isStoredAdmin(): boolean {
  const user = getStoredUser();
  return user.role?.name === 'admin';
}

// ── CSV Export ─────────────────────────────────────────────────────────────────
/**
 * #12 FIX: Export data ke file CSV tanpa library tambahan.
 *
 * @param data    Array of plain objects (harus sudah flat — tidak nested)
 * @param columns Daftar kolom: { key, label }. Jika tidak disediakan, pakai semua key dari row pertama.
 * @param filename Nama file yang akan didownload (tanpa ekstensi, ".csv" ditambahkan otomatis)
 *
 * Contoh:
 *   exportToCSV(materials, [
 *     { key: 'code', label: 'Kode' },
 *     { key: 'nama', label: 'Nama Material' },
 *   ], 'material-export')
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns?: { key: keyof T; label: string }[],
  filename = 'export',
): void {
  if (!data.length) return;

  const cols = columns ?? (Object.keys(data[0]) as (keyof T)[]).map((k) => ({ key: k, label: String(k) }));

  const escape = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    // Wrap in quotes if value contains comma, newline, or double-quote
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const header = cols.map((c) => escape(c.label)).join(',');
  const rows   = data.map((row) => cols.map((c) => escape(row[c.key])).join(','));
  const csv    = [header, ...rows].join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Dark mode ──────────────────────────────────────────────────────────────────
export function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function toggleDarkMode(): boolean {
  const html = document.documentElement;
  const body = document.body;
  const isDark = html.classList.toggle('dark');
  body.classList.toggle('dark', isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  return isDark;
}

export function applyStoredTheme(): void {
  const theme = localStorage.getItem('theme');
  // Per user request: default is light theme. 
  // We only apply dark if explicitly stored as 'dark'.
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }
}
