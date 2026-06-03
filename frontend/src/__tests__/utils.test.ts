/**
 * #24 FIX: Unit tests untuk lib/utils.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  formatRupiah,
  formatNumber,
  formatDate,
  cn,
  truncate,
  getInitials,
  exportToCSV,
  isHeadOfficeUser,
  getStoredUser,
} from '../lib/utils'

// ── formatRupiah ──────────────────────────────────────────────────────────────
describe('formatRupiah', () => {
  it('formats positive numbers as IDR', () => {
    expect(formatRupiah(10000)).toContain('10.000')
    expect(formatRupiah(0)).toBeDefined()
  })
})

// ── formatNumber ─────────────────────────────────────────────────────────────
describe('formatNumber', () => {
  it('formats with thousand separator', () => {
    expect(formatNumber(1234567)).toBe('1.234.567')
  })
})

// ── formatDate ────────────────────────────────────────────────────────────────
describe('formatDate', () => {
  it('returns dash for null/undefined', () => {
    expect(formatDate(null)).toBe('-')
    expect(formatDate(undefined)).toBe('-')
  })
  it('formats valid ISO string', () => {
    const result = formatDate('2026-01-15')
    expect(result).not.toBe('-')
    expect(result.length).toBeGreaterThan(0)
  })
})

// ── cn ────────────────────────────────────────────────────────────────────────
describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b', undefined, null, false, 'c')).toBe('a b c')
  })
  it('returns empty string for all falsy', () => {
    expect(cn(undefined, null, false)).toBe('')
  })
})

// ── truncate ─────────────────────────────────────────────────────────────────
describe('truncate', () => {
  it('does not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })
  it('truncates long strings with ellipsis', () => {
    const result = truncate('hello world!', 8)
    expect(result.length).toBe(8)
    expect(result.endsWith('...')).toBe(true)
  })
})

// ── getInitials ───────────────────────────────────────────────────────────────
describe('getInitials', () => {
  it('extracts two initials', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })
  it('handles single name', () => {
    expect(getInitials('John')).toBe('J')
  })
})

// ── exportToCSV ───────────────────────────────────────────────────────────────
describe('exportToCSV', () => {
  it('triggers download for non-empty data', () => {
    // Should not throw; URL.createObjectURL is mocked in setup
    expect(() =>
      exportToCSV(
        [{ name: 'Test', value: 42 }],
        [{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }],
        'test-export',
      ),
    ).not.toThrow()
  })

  it('does nothing for empty data', () => {
    expect(() => exportToCSV([], undefined, 'empty')).not.toThrow()
  })
})

// ── isHeadOfficeUser ──────────────────────────────────────────────────────────
describe('isHeadOfficeUser', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns false when no user in localStorage', () => {
    expect(isHeadOfficeUser()).toBe(false)
  })

  it('returns true for HO user', () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ estate: { estate_id: 'HO' } }),
    )
    expect(isHeadOfficeUser()).toBe(true)
  })

  it('returns false for estate user', () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ estate: { estate_id: 'KLT' } }),
    )
    expect(isHeadOfficeUser()).toBe(false)
  })
})

// ── getStoredUser ─────────────────────────────────────────────────────────────
describe('getStoredUser', () => {
  it('returns empty object for missing user', () => {
    localStorage.clear()
    expect(getStoredUser()).toEqual({})
  })

  it('returns parsed user from localStorage', () => {
    localStorage.setItem('user', JSON.stringify({ name: 'Alice', estate_id: 1 }))
    expect(getStoredUser().name).toBe('Alice')
  })
})
