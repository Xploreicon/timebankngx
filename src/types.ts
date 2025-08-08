export type Category = 'Legal' | 'Tech' | 'Creative' | 'Fashion' | 'Food' | 'Professional'

export interface User {
  id: string
  businessName: string
  phone: string
  email: string
  category: Category
  location: string
  timeCredits: number
  trustScore: number
  verificationStatus: boolean
  createdAt: Date
}

export interface Service {
  id: string
  userId: string
  title: string
  description: string
  category: string
  hourlyRate: number
  availability: boolean
  skillLevel: 'Beginner' | 'Intermediate' | 'Expert'
}

export interface Message {
  id: string
  senderId: string
  text: string
  timestamp: Date
}

export interface Trade {
  id: string
  proposerId: string
  providerId: string
  serviceOffered: Service
  serviceRequested: Service
  hoursOffered: number
  hoursRequested: number
  status: 'pending' | 'active' | 'completed' | 'disputed'
  messages: Message[]
  createdAt: Date
  completedAt: Date | null
}
