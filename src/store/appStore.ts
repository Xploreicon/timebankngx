import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { mock } from '@/data/mock'
import type { User, Service, Trade, Message } from '@/types'

interface NotificationItem { id: string; text: string; time: Date }

interface AppState {
  currentUser: User | null
  isAuthenticated: boolean
  isOnboarded: boolean
  users: User[]
  services: Service[]
  trades: Trade[]
  notifications: NotificationItem[]
  // Auth
  login: (identifier: string) => { otpSent: boolean }
  verifyOtp: (code: string) => boolean
  logout: () => void
  register: (user: Omit<User, 'id' | 'createdAt' | 'timeCredits' | 'trustScore' | 'verificationStatus'> & { verificationStatus?: boolean }) => User
  // Onboarding
  completeOnboarding: () => void
  // Data operations
  addService: (s: Omit<Service,'id'>) => Service
  toggleServiceAvailability: (id: string) => void
  addTradeMessage: (tradeId: string, m: Message) => void
  addNotification: (text: string) => void
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isOnboarded: false,
  users: mock.users,
  services: mock.services,
  trades: mock.trades,
  notifications: [],

  login: () => ({ otpSent: true }),
  verifyOtp: (code: string) => {
    if (code === '123456') {
      const user = mock.users[0]
      set({ currentUser: user, isAuthenticated: true })
      return true
    }
    return false
  },
  logout: () => set({ currentUser: null, isAuthenticated: false, isOnboarded: false }),
  register: (data) => {
    const newUser: User = {
      id: `u${get().users.length + 1}`,
      businessName: data.businessName,
      phone: data.phone,
      email: data.email,
      category: data.category,
      location: data.location,
      timeCredits: 50,
      trustScore: 75,
      verificationStatus: !!data.verificationStatus,
      createdAt: new Date(),
    }
    set({ users: [newUser, ...get().users], currentUser: newUser, isAuthenticated: true })
    return newUser
  },
  completeOnboarding: () => set({ isOnboarded: true }),

  addService: (s) => {
    const service: Service = { ...s, id: `s${get().services.length + 1}` }
    set({ services: [service, ...get().services] })
    return service
  },
  toggleServiceAvailability: (id) => set({ services: get().services.map(s => s.id === id ? { ...s, availability: !s.availability } : s) }),
  addTradeMessage: (tradeId, m) => set({ trades: get().trades.map(t => t.id === tradeId ? { ...t, messages: [...t.messages, m] } : t) }),
  addNotification: (text) => set({ notifications: [{ id: crypto.randomUUID(), text, time: new Date() }, ...get().notifications].slice(0, 20) })
}), { name: 'timebank-ng' }))
