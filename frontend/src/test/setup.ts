/**
 * #24 FIX: Vitest global test setup
 * Dijalankan sebelum setiap test file.
 */
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock URL.createObjectURL (used in CSV export)
Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:mock-url') })
Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn() })

// Suppress console.error for cleaner test output (remove if you want full noise)
vi.spyOn(console, 'error').mockImplementation(() => {})
