import '@testing-library/jest-dom'
import { expect, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

// Setup MSW server for API mocking
export const server = setupServer(...handlers)

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }
}))

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: vi.fn(() => ({ pathname: '/', search: '', hash: '' })),
  }
})

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    profile: {
      id: 'mock-user-id',
      email: 'test@example.com',
      display_name: 'Test User',
      location: 'Lagos',
      category: 'Technology',
      trust_score: 85,
      is_onboarded: true,
    },
    loading: false,
  }))
}))

vi.mock('@/store/appStore', () => ({
  useAppStore: vi.fn(() => ({
    isAuthenticated: true,
    isOnboarded: true,
    profile: {
      id: 'mock-user-id',
      display_name: 'Test User',
      location: 'Lagos',
      category: 'Technology',
    }
  }))
}))

// Mock query hooks
vi.mock('@/integrations/supabase/hooks/useProfile', () => ({
  useProfile: vi.fn(() => ({
    data: {
      id: 'mock-user-id',
      display_name: 'Test User',
      location: 'Lagos',
      category: 'Technology',
    },
    isLoading: false,
  }))
}))

vi.mock('@/integrations/supabase/hooks/useTrades', () => ({
  useTrades: vi.fn(() => ({
    data: [],
    isLoading: false,
  }))
}))

vi.mock('@/integrations/supabase/hooks/useServices', () => ({
  useServices: vi.fn(() => ({
    data: [],
    isLoading: false,
  }))
}))

vi.mock('@/integrations/supabase/hooks/useNotifications', () => ({
  useNotifications: vi.fn(() => ({
    data: [],
    isLoading: false,
  }))
}))

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'http://localhost:54321',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    VITE_ENVIRONMENT: 'test',
    VITE_ENABLE_ANALYTICS: 'false',
    VITE_SENTRY_DSN: '',
  }
})

// Setup and teardown MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Mock window.gtag for analytics
Object.defineProperty(window, 'gtag', {
  value: vi.fn(),
  writable: true,
})

// Mock IntersectionObserver for components that use it
Object.defineProperty(window, 'IntersectionObserver', {
  value: vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
  writable: true,
})

// Mock ResizeObserver
Object.defineProperty(window, 'ResizeObserver', {
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
  writable: true,
})

// Mock PerformanceObserver for performance monitoring
Object.defineProperty(window, 'PerformanceObserver', {
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
  })),
  writable: true,
})

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
})