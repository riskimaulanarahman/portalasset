import { describe, it, expect, beforeEach, vi } from 'vitest'
import type React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'

vi.mock('../layouts/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const renderProtectedPath = (
  user: Record<string, unknown>,
  routeProps: { adminOnly?: boolean; requiredPermissions?: string[] } = {},
) => {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify(user))

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute {...routeProps}>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders admin-only route for admin users', () => {
    renderProtectedPath(
      { not_active: false, estate_id: 1, role: { name: 'admin' }, permissions: [] },
      { adminOnly: true },
    )

    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  it('redirects non-admin users away from admin-only routes', () => {
    renderProtectedPath(
      { not_active: false, estate_id: 1, role: { name: 'estate' }, permissions: ['view-estates'] },
      { adminOnly: true },
    )

    expect(screen.getByText('Dashboard page')).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('keeps regular routes permission-based for non-admin users', () => {
    renderProtectedPath(
      { not_active: false, estate_id: 1, role: { name: 'estate' }, permissions: ['view-assets'] },
      { requiredPermissions: ['view-assets'] },
    )

    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })
})
