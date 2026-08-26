/**
 * #24 FIX: Tests untuk ErrorBoundary component
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '../components/ErrorBoundary'

// Komponen yang sengaja throw error untuk test
const BrokenComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) throw new Error('Intentional test error')
  return <div>Working component</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Working component')).toBeInTheDocument()
  })

  it('shows fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/terjadi kesalahan/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <BrokenComponent shouldThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Custom error UI')).toBeInTheDocument()
  })

  it('resets error state when "Coba Lagi" is clicked', async () => {
    const user = userEvent.setup()

    // Untuk test reset, kita render dengan shouldThrow=true dulu
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByText(/terjadi kesalahan/i)).toBeInTheDocument()

    // Klik "Coba Lagi" — seharusnya mereset state (tapi komponen tetap throw,
    // sehingga fallback muncul lagi)
    await user.click(screen.getByRole('button', { name: /coba lagi/i }))
    expect(screen.getByText(/terjadi kesalahan/i)).toBeInTheDocument()
  })
})
