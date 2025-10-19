import { http, HttpResponse } from 'msw'

// Mock API handlers for Nigerian time-banking platform
export const handlers = [
  // Auth endpoints
  http.post('*/auth/v1/token*', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
      }
    })
  }),

  http.get('*/auth/v1/user', () => {
    return HttpResponse.json({
      id: 'mock-user-id',
      email: 'test@example.com',
      user_metadata: {
        display_name: 'Test User',
        location: 'Lagos',
        category: 'Technology',
      }
    })
  }),

  // Profiles endpoints
  http.get('*/rest/v1/profiles*', () => {
    return HttpResponse.json([
      {
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
    ])
  }),

  http.post('*/rest/v1/profiles*', () => {
    return HttpResponse.json({
      id: 'mock-user-id',
      email: 'test@example.com',
      display_name: 'Test User',
      location: 'Lagos',
      category: 'Technology',
      trust_score: 70,
      is_onboarded: true,
    }, { status: 201 })
  }),

  // Services endpoints
  http.get('*/rest/v1/services*', () => {
    return HttpResponse.json([
      {
        id: 'service-1',
        title: 'Web Development',
        description: 'Professional web development services',
        category: 'Technology',
        location: 'Lagos',
        hourly_rate: 3000,
        provider_id: 'mock-user-id',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'service-2',
        title: 'Graphic Design',
        description: 'Creative graphic design solutions',
        category: 'Design',
        location: 'Abuja',
        hourly_rate: 2000,
        provider_id: 'other-user-id',
        is_active: true,
        created_at: '2024-01-02T00:00:00Z'
      }
    ])
  }),

  // Trades endpoints
  http.get('*/rest/v1/trades*', () => {
    return HttpResponse.json([
      {
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
    ])
  }),

  http.post('*/rest/v1/trades*', () => {
    return HttpResponse.json({
      id: 'new-trade-id',
      title: 'New Trade',
      status: 'active',
      proposer_id: 'mock-user-id',
      created_at: new Date().toISOString()
    }, { status: 201 })
  }),

  // Proposals endpoints
  http.get('*/rest/v1/proposals*', () => {
    return HttpResponse.json([
      {
        id: 'proposal-1',
        trade_id: 'trade-1',
        proposer_id: 'other-user-id',
        message: 'I can help with your marketing needs',
        status: 'pending',
        proposed_hours: 15,
        created_at: '2024-01-01T00:00:00Z'
      }
    ])
  }),

  // Credit transactions endpoints
  http.get('*/rest/v1/credit_transactions*', () => {
    return HttpResponse.json([
      {
        id: 'transaction-1',
        user_id: 'mock-user-id',
        amount: 500,
        type: 'earned',
        description: 'Completed web development service',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'transaction-2',
        user_id: 'mock-user-id',
        amount: -200,
        type: 'spent',
        description: 'Used marketing consultation service',
        created_at: '2024-01-02T00:00:00Z'
      }
    ])
  }),

  // Error simulation for testing error boundaries
  http.get('*/rest/v1/error-test', () => {
    return HttpResponse.json(
      { message: 'Simulated server error for testing' },
      { status: 500 }
    )
  }),

  // Slow response simulation for performance testing
  http.get('*/rest/v1/slow-endpoint', async () => {
    await new Promise(resolve => setTimeout(resolve, 5000)) // 5 second delay
    return HttpResponse.json({ message: 'Slow response' })
  }),
]