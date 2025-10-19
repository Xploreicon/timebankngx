import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { queryKeys, queryInvalidation } from '@/lib/queryClient'
import { captureError, setSentryBusinessContext } from '@/lib/sentry'

// Optimized user profile hook with caching
export const useUserProfile = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.userProfile(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!userId,
  })
}

// Optimized services hook with location-based caching
export const useServices = (filters?: {
  category?: string
  location?: string
  limit?: number
}) => {
  const queryKey = filters?.category
    ? queryKeys.servicesByCategory(filters.category)
    : filters?.location
    ? queryKeys.servicesByLocation(filters.location)
    : queryKeys.services

  return useQuery({
    queryKey: [...queryKey, filters],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select(`
          *,
          profiles!inner(
            id,
            display_name,
            location,
            trust_score,
            avg_rating
          )
        `)
        .eq('is_available', true)

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      if (filters?.location) {
        query = query.contains('coverage_areas', [filters.location])
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query
        .order('view_count', { ascending: false })

      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Optimized user trades with real-time updates
export const useUserTrades = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.userTrades(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select(`
          *,
          proposer:profiles!proposer_id(display_name, location, trust_score),
          provider:profiles!provider_id(display_name, location, trust_score),
          proposer_service:services!proposer_service_id(title, category),
          provider_service:services!provider_service_id(title, category)
        `)
        .or(`proposer_id.eq.${userId},provider_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 2, // 2 minutes for active data
    enabled: !!userId,
  })
}

// Optimized trade messages with real-time subscriptions
export const useTradeMessages = (tradeId: string) => {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.tradeMessages(tradeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_messages')
        .select(`
          *,
          sender:profiles!sender_id(display_name, avatar_url)
        `)
        .eq('trade_id', tradeId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!tradeId,
    staleTime: 1000 * 30, // 30 seconds for messages
  })

  // Set up real-time subscription for messages
  useQuery({
    queryKey: ['trade-messages-subscription', tradeId],
    queryFn: () => null,
    enabled: !!tradeId,
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    initialData: null,
    meta: {
      subscription: true,
    },
    onMount: () => {
      const channel = supabase
        .channel(`trade-messages:${tradeId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'trade_messages',
            filter: `trade_id=eq.${tradeId}`
          },
          () => {
            queryInvalidation.invalidateTradeMessages(queryClient, tradeId)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    },
  } as any)

  return query
}

// Optimized service creation mutation
export const useCreateService = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (serviceData: {
      title: string
      description: string
      category: string
      base_hourly_rate: number
      credits_per_hour: number
    }) => {
      setSentryBusinessContext({
        serviceId: 'new',
        transactionType: 'create_service'
      })

      const { data, error } = await supabase
        .from('services')
        .insert(serviceData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryInvalidation.invalidateUserServices(queryClient, data.user_id)
      queryInvalidation.invalidateServicesByCategory(queryClient, data.category)
    },
    onError: (error) => {
      captureError(error as Error, {
        context: 'create_service',
        mutation: 'useCreateService'
      })
    }
  })
}

// Optimized trade creation mutation
export const useCreateTrade = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tradeData: {
      provider_id: string
      proposer_service_id: string
      provider_service_id: string
      proposer_hours: number
      provider_hours: number
      title: string
      description?: string
    }) => {
      setSentryBusinessContext({
        tradeId: 'new',
        transactionType: 'create_trade'
      })

      const { data, error } = await supabase
        .from('trades')
        .insert(tradeData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate relevant queries for both users
      queryInvalidation.invalidateUserTrades(queryClient, data.proposer_id)
      queryInvalidation.invalidateUserTrades(queryClient, data.provider_id)
    },
    onError: (error) => {
      captureError(error as Error, {
        context: 'create_trade',
        mutation: 'useCreateTrade'
      })
    }
  })
}

// Nigerian-specific pricing hook
export const useNigerianPricing = (category: string, location: string) => {
  return useQuery({
    queryKey: queryKeys.locationPricing(location, category),
    queryFn: async () => {
      // This would integrate with our Nigerian pricing service
      const { data, error } = await supabase
        .from('nigerian_category_rates')
        .select('*')
        .eq('category', category)
        .single()

      if (error) throw error

      // Calculate location-based multiplier
      const locationMultipliers: Record<string, number> = {
        'Lagos': 1.3,
        'Abuja': 1.2,
        'Port Harcourt': 1.1,
        'Kano': 1.0,
        'Ibadan': 0.9,
      }

      const multiplier = locationMultipliers[location] || 0.8

      return {
        ...data,
        location_multiplier: multiplier,
        adjusted_rate: data.base_rate_naira * data.demand_multiplier * multiplier,
        adjusted_credits: data.base_credits_per_hour * data.demand_multiplier * multiplier
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour for pricing data
    enabled: !!category && !!location,
  })
}

// Market analytics hook with caching
export const useMarketAnalytics = () => {
  return useQuery({
    queryKey: queryKeys.marketAnalytics(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nigerian_market_analytics')
        .select('*')

      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 15, // 15 minutes for analytics
  })
}