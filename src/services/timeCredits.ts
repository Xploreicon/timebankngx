import { supabase } from '@/integrations/supabase/client'

export interface CategoryRates {
  [category: string]: {
    baseRate: number // Base hourly rate in credits
    demand: number // Market demand multiplier (0.5 - 2.0)
    supply: number // Market supply multiplier (0.5 - 2.0)
  }
}

export interface CreditTransaction {
  id: string
  userId: string
  amount: number
  type: 'earned' | 'spent' | 'bonus' | 'refund'
  description: string
  tradeId?: string
  createdAt: Date
}

export class TimeCreditsService {
  private static instance: TimeCreditsService

  // Nigerian market-specific category rates
  private categoryRates: CategoryRates = {
    'Legal': { baseRate: 10, demand: 1.5, supply: 0.8 }, // High demand, low supply
    'Tech': { baseRate: 8, demand: 1.4, supply: 1.0 },
    'Creative': { baseRate: 5, demand: 1.2, supply: 1.1 },
    'Fashion': { baseRate: 4, demand: 1.0, supply: 1.2 },
    'Food': { baseRate: 3, demand: 0.9, supply: 1.3 },
    'Professional': { baseRate: 6, demand: 1.1, supply: 1.0 },
    'Accounting': { baseRate: 7, demand: 1.3, supply: 0.9 },
    'Marketing': { baseRate: 6, demand: 1.2, supply: 1.1 },
    'Photography': { baseRate: 5, demand: 1.1, supply: 1.2 },
    'Event Planning': { baseRate: 4, demand: 1.0, supply: 1.1 },
    'Tailoring': { baseRate: 3, demand: 0.8, supply: 1.4 },
    'Generator Repair': { baseRate: 6, demand: 1.4, supply: 0.7 },
    'Transportation': { baseRate: 2, demand: 0.7, supply: 1.5 },
    'Tutoring': { baseRate: 4, demand: 1.0, supply: 1.3 }
  }

  public static getInstance(): TimeCreditsService {
    if (!TimeCreditsService.instance) {
      TimeCreditsService.instance = new TimeCreditsService()
    }
    return TimeCreditsService.instance
  }

  /**
   * Calculate the credit value for hours worked in a specific category
   */
  calculateCredits(hours: number, category: string): number {
    const categoryRate = this.categoryRates[category]
    if (!categoryRate) {
      console.warn(`Unknown category: ${category}. Using default rate.`)
      return hours * 5 // Default rate
    }

    const { baseRate, demand, supply } = categoryRate
    const marketRate = baseRate * demand / supply
    return Math.round(hours * marketRate * 100) / 100 // Round to 2 decimal places
  }

  /**
   * Calculate exchange rate between two categories
   * Returns how many hours of category B equals 1 hour of category A
   */
  calculateExchangeRate(fromCategory: string, toCategory: string): number {
    const fromCredits = this.calculateCredits(1, fromCategory)
    const toCredits = this.calculateCredits(1, toCategory)

    return Math.round((fromCredits / toCredits) * 100) / 100
  }

  /**
   * Calculate fair trade exchange
   * Returns how many hours of serviceB are needed for hoursA of serviceA
   */
  calculateTradeExchange(hoursA: number, categoryA: string, categoryB: string): {
    hoursB: number
    exchangeRate: number
    creditsA: number
    creditsB: number
  } {
    const creditsA = this.calculateCredits(hoursA, categoryA)
    const exchangeRate = this.calculateExchangeRate(categoryA, categoryB)
    const hoursB = Math.round(hoursA * exchangeRate * 100) / 100
    const creditsB = this.calculateCredits(hoursB, categoryB)

    return {
      hoursB,
      exchangeRate,
      creditsA,
      creditsB
    }
  }

  /**
   * Get current market rates for all categories
   */
  getAllCategoryRates(): { [category: string]: number } {
    const rates: { [category: string]: number } = {}

    Object.keys(this.categoryRates).forEach(category => {
      rates[category] = this.calculateCredits(1, category)
    })

    return rates
  }

  /**
   * Update market rates based on supply/demand (admin function)
   */
  updateMarketRates(category: string, demandMultiplier: number, supplyMultiplier: number): void {
    if (this.categoryRates[category]) {
      this.categoryRates[category].demand = Math.max(0.5, Math.min(2.0, demandMultiplier))
      this.categoryRates[category].supply = Math.max(0.5, Math.min(2.0, supplyMultiplier))
    }
  }

  /**
   * Add credits to user's wallet
   */
  async addCredits(
    userId: string,
    amount: number,
    type: CreditTransaction['type'],
    description: string,
    tradeId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First, update the user's credit balance
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('trust_score')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError

      // For now, we'll store credits in trust_score field until we add a dedicated credits column
      const newBalance = (currentProfile.trust_score || 0) + amount

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ trust_score: Math.max(0, newBalance) })
        .eq('id', userId)

      if (updateError) throw updateError

      // TODO: Create credit_transactions table and log the transaction
      // For now, we'll just return success
      return { success: true }

    } catch (error) {
      console.error('Error adding credits:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add credits'
      }
    }
  }

  /**
   * Spend credits from user's wallet
   */
  async spendCredits(
    userId: string,
    amount: number,
    description: string,
    tradeId?: string
  ): Promise<{ success: boolean; error?: string; newBalance?: number }> {
    try {
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('trust_score')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError

      const currentBalance = currentProfile.trust_score || 0

      if (currentBalance < amount) {
        return {
          success: false,
          error: 'Insufficient credits'
        }
      }

      const newBalance = currentBalance - amount

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ trust_score: newBalance })
        .eq('id', userId)

      if (updateError) throw updateError

      return { success: true, newBalance }

    } catch (error) {
      console.error('Error spending credits:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to spend credits'
      }
    }
  }

  /**
   * Get user's current credit balance
   */
  async getCreditBalance(userId: string): Promise<{ balance: number; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('trust_score')
        .eq('id', userId)
        .single()

      if (error) throw error

      return { balance: data.trust_score || 0 }
    } catch (error) {
      console.error('Error getting credit balance:', error)
      return {
        balance: 0,
        error: error instanceof Error ? error.message : 'Failed to get balance'
      }
    }
  }

  /**
   * Calculate potential earnings for a service posting
   */
  calculateServicePotentialEarnings(category: string, estimatedHoursPerWeek: number = 10): {
    weeklyCredits: number
    monthlyCredits: number
    categoryRate: number
  } {
    const categoryRate = this.calculateCredits(1, category)
    const weeklyCredits = categoryRate * estimatedHoursPerWeek
    const monthlyCredits = weeklyCredits * 4

    return {
      weeklyCredits: Math.round(weeklyCredits * 100) / 100,
      monthlyCredits: Math.round(monthlyCredits * 100) / 100,
      categoryRate
    }
  }
}

export const timeCreditsService = TimeCreditsService.getInstance()