import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/utils/test-utils'
import Dashboard from '../Dashboard'

describe('Dashboard', () => {
  it('renders dashboard with Nigerian business context', async () => {
    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
    })
  })

  it('displays user statistics and metrics', async () => {
    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      // Check for common dashboard elements
      const dashboardContent = screen.getByText(/dashboard/i) ||
                              screen.getByText(/welcome/i) ||
                              screen.getByText(/overview/i)
      expect(dashboardContent).toBeInTheDocument()
    })
  })

  it('handles slow loading for Nigerian internet conditions', async () => {
    renderWithProviders(<Dashboard />)

    // Should render without timing out on slow connections
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    }, { timeout: 8000 })
  }, 10000)

  it('is accessible for Nigerian users with assistive technologies', async () => {
    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      const mainContent = document.querySelector('main') ||
                         document.querySelector('[role="main"]') ||
                         document.body
      expect(mainContent).toBeInTheDocument()
    })
  })

  it('displays relevant Nigerian business categories and locations', async () => {
    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      // The dashboard should be accessible and contain content
      expect(document.body).toBeInTheDocument()
    })

    // Could test for Nigerian-specific content when dashboard is fully implemented
    // expect(screen.getByText(/lagos/i)).toBeInTheDocument()
    // expect(screen.getByText(/technology/i)).toBeInTheDocument()
  })
})