import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'

// Create a test query client with no retries and no cache time
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  initialEntries?: string[]
}

// Custom render function with all providers
export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    initialEntries = ['/'],
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}

// Mock user data for tests
export const mockUser = {
  id: 'mock-user-id',
  email: 'test@example.com',
  display_name: 'Test User',
  location: 'Lagos',
  category: 'Technology',
  trust_score: 85,
  skills: ['JavaScript', 'React', 'Node.js'],
  hourly_rate: 2500,
  available_hours: 20,
  is_onboarded: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

// Mock service data
export const mockService = {
  id: 'service-1',
  title: 'Web Development',
  description: 'Professional web development services',
  category: 'Technology',
  location: 'Lagos',
  hourly_rate: 3000,
  provider_id: 'mock-user-id',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z'
}

// Mock trade data
export const mockTrade = {
  id: 'trade-1',
  title: 'Website for Marketing Consultation',
  description: 'I need a website built in exchange for marketing consultation',
  status: 'active',
  proposer_id: 'mock-user-id',
  provider_id: null,
  proposer_category: 'Technology',
  provider_category: 'Marketing',
  proposer_hours: 20,
  provider_hours: 15,
  estimated_value: 45000,
  location: 'Lagos',
  created_at: '2024-01-01T00:00:00Z'
}

// Performance testing helpers for Nigerian conditions
export const performanceHelpers = {
  // Simulate slow network conditions
  simulateSlowNetwork: (delay: number = 3000) => {
    return new Promise(resolve => setTimeout(resolve, delay))
  },

  // Simulate network interruption
  simulateNetworkError: () => {
    throw new Error('Network connection failed')
  },

  // Test for Nigerian business hours (6 AM to 10 PM WAT)
  isBusinessHours: () => {
    const now = new Date()
    const hour = now.getHours()
    return hour >= 6 && hour <= 22
  },

  // Simulate Nigerian mobile device constraints
  simulateMobileConstraints: () => ({
    screenSize: { width: 375, height: 667 }, // iPhone SE
    connectionType: '3g',
    batteryLevel: 'low',
  })
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'