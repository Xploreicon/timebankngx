import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/integrations/supabase/client'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { mock } from '@/data/mock'

export interface Profile {
  id: string
  email?: string
  display_name?: string
  phone?: string
  location?: string
  category?: string
  trust_score: number
  total_credits?: number
  available_credits?: number
  total_trades_completed?: number
  success_rate?: number
  average_response_hours?: number | null
  verification_phone: boolean
  phone_verified?: boolean
  verification_email: boolean
  email_verified?: boolean
  verification_cac: boolean
  is_onboarded: boolean
  avatar_url?: string
  created_at: string
  updated_at: string
  needs?: string[]
}

interface NotificationItem { id: string; text: string; time: Date }

interface SignUpPayload {
  email: string
  password: string
  displayName: string
  category?: string
  location?: string
  needs?: string[]
  phone?: string
}

interface AppState {
  session: Session | null
  user: SupabaseUser | null
  profile: Profile | null
  isAuthenticated: boolean
  isOnboarded: boolean
  dismissedEmailReminder: boolean
  notifications: NotificationItem[]
  isLoading: boolean
  
  // Data storage
  services: any[]
  trades: any[]
  
  // Auth
  setAuth: (session: Session | null, user: SupabaseUser | null) => void
  setProfile: (profile: Profile | null) => void
  signUp: (payload: SignUpPayload) => Promise<{ error?: string }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  dismissEmailReminder: (dismissed: boolean) => void
  resetEmailReminder: () => void
  
  // Profile & Onboarding
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: string }>
  completeOnboarding: () => Promise<{ error?: string }>
  
  // Data operations
  addNotification: (text: string) => void
  fetchServices: () => Promise<void>
  fetchTrades: () => Promise<void>
  addService: (service: { title: string; description: string; category: string }) => Promise<{ error?: string }>
  addTradeMessage: (tradeId: string, message: { text: string }) => Promise<{ error?: string }>
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isAuthenticated: false,
  isOnboarded: false,
  dismissedEmailReminder: false,
  notifications: [],
  isLoading: false,
  services: [],
  trades: [],

  setAuth: (session, user) => {
    const previousUserId = get().user?.id
    const shouldReset = !user || (previousUserId !== undefined && user?.id !== previousUserId)

    set({ 
      session, 
      user, 
      isAuthenticated: !!session && !!user,
      ...(shouldReset ? { trades: [], services: [], notifications: [] } : {})
    })
  },

  setProfile: (profile) => {
    set({ 
      profile,
      isOnboarded: profile?.is_onboarded || false
    })
  },

  signUp: async ({ email, password, displayName, category, location, needs, phone }: SignUpPayload) => {
    try {
      set({ isLoading: true })
      
      const redirectUrl = `${window.location.origin}/auth/callback`
      const metadata: Record<string, unknown> = {}

      if (displayName) metadata.display_name = displayName
      if (category) metadata.primary_category = category
      if (location) metadata.location = location
      if (phone) metadata.phone = phone
      if (needs && needs.length > 0) metadata.needs = needs

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata
        }
      })
      
      if (error) return { error: error.message }
      
      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    } finally {
      set({ isLoading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true })
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) return { error: error.message }
      
      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut()
      set({
        session: null,
        user: null,
        profile: null,
        isAuthenticated: false,
        isOnboarded: false,
        notifications: [],
        trades: [],
        services: [],
        dismissedEmailReminder: false
      })
    } catch (error) {
      console.error('Sign out error:', error)
    }
  },

  dismissEmailReminder: (dismissed) => set({ dismissedEmailReminder: dismissed }),
  resetEmailReminder: () => set({ dismissedEmailReminder: false }),

  updateProfile: async (updates: Partial<Profile>) => {
    try {
      const { user } = get()
      if (!user) return { error: 'Not authenticated' }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) return { error: error.message }

      // Update local state
      const currentProfile = get().profile
      if (currentProfile) {
        const mergedProfile: Profile = {
          ...currentProfile,
          ...updates,
        } as Profile

        if ('phone_verified' in updates) {
          mergedProfile.phone_verified = updates.phone_verified as boolean | undefined
          if (updates.phone_verified) {
            mergedProfile.verification_phone = true
          }
        }

        if ('needs' in updates) {
          mergedProfile.needs = updates.needs as string[] | undefined
        }

        set({ profile: mergedProfile })
      }

      return {}
    } catch (error) {
      return { error: 'Failed to update profile' }
    }
  },

  completeOnboarding: async () => {
    return await get().updateProfile({ is_onboarded: true })
  },

  addNotification: (text) => set({ 
    notifications: [
      { id: crypto.randomUUID(), text, time: new Date() }, 
      ...get().notifications
    ].slice(0, 20) 
  }),

  fetchServices: async () => {
    try {
      const { data } = await supabase.from('services').select('*')
      set({ services: data || [] })
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  },

  fetchTrades: async () => {
    try {
      const { user } = get()
      if (!user) return
      
      const { data } = await supabase
        .from('trades')
        .select(`
          *,
          service_requested:service_requested_id(*),
          service_offered:service_offered_id(*)
        `)
        .or(`proposer_id.eq.${user.id},provider_id.eq.${user.id}`)
      
      set({ trades: data || [] })
    } catch (error) {
      console.error('Error fetching trades:', error)
    }
  },

  addService: async (serviceData) => {
    try {
      const { user } = get()
      if (!user) return { error: 'Not authenticated' }

      const payload = {
        user_id: user.id,
        title: serviceData.title,
        description: serviceData.description,
        category: serviceData.category,
        base_hourly_rate: serviceData.baseHourlyRate ?? 0,
        credits_per_hour: serviceData.creditsPerHour ?? serviceData.baseHourlyRate ?? 0,
        minimum_hours: serviceData.minimum_hours ?? 1,
        maximum_hours: serviceData.maximum_hours ?? Math.max(serviceData.minimum_hours ?? 1, 8),
        skill_level: serviceData.skillLevel ?? 'Intermediate',
        is_available: serviceData.is_available ?? true,
        serves_remote: serviceData.serves_remote ?? true,
        serves_onsite: serviceData.serves_onsite ?? false,
        tags: serviceData.tags ?? [],
        portfolio_images: serviceData.portfolio_images ?? [],
      }

      const { error } = await supabase.from('services').insert(payload)

      if (error) return { error: error.message }

      // Refresh services
      get().fetchServices()
      return {}
    } catch (error) {
      return { error: 'Failed to add service' }
    }
  },

  addTradeMessage: async (tradeId, messageData) => {
    try {
      const { user } = get()
      if (!user) return { error: 'Not authenticated' }

      const { error } = await supabase.from('trade_messages').insert({
        trade_id: tradeId,
        sender_id: user.id,
        text: messageData.text
      })

      if (error) return { error: error.message }

      // Refresh trades to get updated messages
      get().fetchTrades()
      return {}
    } catch (error) {
      return { error: 'Failed to send message' }
    }
  }
}), { name: 'timebank-store' }))
