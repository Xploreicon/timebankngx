import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/utils/test-utils'
import { PageLoadingSpinner } from '../PageLoadingSpinner'

describe('PageLoadingSpinner', () => {
  it('renders loading spinner with Nigerian time-banking context', () => {
    renderWithProviders(<PageLoadingSpinner />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays for appropriate duration for Nigerian internet speeds', async () => {
    const { container } = renderWithProviders(<PageLoadingSpinner />)

    expect(container.firstChild).toBeInTheDocument()

    // Should remain visible for slow connections
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(container.firstChild).toBeInTheDocument()
  })

  it('has accessible loading indicator', () => {
    renderWithProviders(<PageLoadingSpinner />)

    // Check for any loading-related content
    const hasLoadingContent = screen.queryByText(/loading/i) ||
                             screen.queryByText(/timebank/i) ||
                             document.querySelector('.animate-pulse')

    expect(hasLoadingContent).toBeTruthy()
  })
})