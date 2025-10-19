import { supabase } from '@/integrations/supabase/client'
import { timeCreditsService } from './timeCredits'

export interface CreditTransaction {
  id: string
  userId: string
  amount: number
  type: 'earned' | 'spent' | 'bonus' | 'refund' | 'penalty' | 'referral'
  description: string
  relatedTradeId?: string
  relatedServiceId?: string
  balanceAfter: number
  createdAt: Date
  metadata?: {
    category?: string
    hours?: number
    exchangeRate?: number
    otherUserId?: string
    otherUserName?: string
  }
}

export interface WalletBalance {
  currentBalance: number
  totalEarned: number
  totalSpent: number
  pendingCredits: number // Credits held in escrow
  availableCredits: number // Current balance minus pending
}

export interface CreditEarningOpportunity {
  type: 'trade' | 'referral' | 'bonus'
  potentialCredits: number
  description: string
  action?: string
  actionUrl?: string
}

export class CreditWalletService {
  private static instance: CreditWalletService

  public static getInstance(): CreditWalletService {
    if (!CreditWalletService.instance) {
      CreditWalletService.instance = new CreditWalletService()
    }
    return CreditWalletService.instance
  }

  /**
   * Get user's wallet balance and summary
   */
  async getWalletBalance(userId: string): Promise<{ balance: WalletBalance; error?: string }> {
    try {
      // For now, we'll use the trust_score field as the main balance
      // In a real implementation, you'd query a credit_transactions table

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('trust_score')
        .eq('id', userId)
        .single()

      if (error) throw error

      const currentBalance = profile.trust_score || 0

      // TODO: Calculate these from actual transaction history
      // For now, we'll provide mock data for demonstration
      const mockBalance: WalletBalance = {
        currentBalance,
        totalEarned: Math.max(currentBalance, 50), // At least 50 if they have positive balance
        totalSpent: Math.max(0, 50 - currentBalance),
        pendingCredits: 0, // TODO: Calculate from active trades
        availableCredits: currentBalance
      }

      return { balance: mockBalance }

    } catch (error) {
      console.error('Error getting wallet balance:', error)
      return {
        balance: {
          currentBalance: 0,
          totalEarned: 0,
          totalSpent: 0,
          pendingCredits: 0,
          availableCredits: 0
        },
        error: error instanceof Error ? error.message : 'Failed to get wallet balance'
      }
    }
  }

  /**
   * Record a credit transaction
   */
  async recordTransaction(
    userId: string,
    amount: number,
    type: CreditTransaction['type'],
    description: string,
    metadata?: CreditTransaction['metadata']
  ): Promise<{ success: boolean; transaction?: CreditTransaction; error?: string }> {
    try {
      // Get current balance
      const { balance } = await this.getWalletBalance(userId)
      const newBalance = balance.currentBalance + amount

      // Ensure balance doesn't go negative (except for penalties)
      if (newBalance < 0 && type !== 'penalty') {
        return {
          success: false,
          error: 'Insufficient credits'
        }
      }

      // Update user's balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ trust_score: Math.max(0, newBalance) })
        .eq('id', userId)

      if (updateError) throw updateError

      // TODO: Store in credit_transactions table
      // For now, we'll return a mock transaction object
      const transaction: CreditTransaction = {
        id: crypto.randomUUID(),
        userId,
        amount,
        type,
        description,
        balanceAfter: Math.max(0, newBalance),
        createdAt: new Date(),
        metadata
      }

      return { success: true, transaction }

    } catch (error) {
      console.error('Error recording transaction:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record transaction'
      }
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ transactions: CreditTransaction[]; error?: string }> {
    try {
      // TODO: Query actual transactions table
      // For now, return mock transaction history
      const mockTransactions: CreditTransaction[] = [
        {
          id: '1',
          userId,
          amount: 25,
          type: 'earned',
          description: 'Completed legal consultation for Tech startup',
          balanceAfter: 75,
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          metadata: {
            category: 'Legal',
            hours: 2.5,
            otherUserName: 'TechCorp',
            exchangeRate: 10
          }
        },
        {
          id: '2',
          userId,
          amount: -15,
          type: 'spent',
          description: 'Received website development services',
          balanceAfter: 50,
          createdAt: new Date(Date.now() - 172800000), // 2 days ago
          metadata: {
            category: 'Tech',
            hours: 2,
            otherUserName: 'WebDev Pro',
            exchangeRate: 7.5
          }
        },
        {
          id: '3',
          userId,
          amount: 10,
          type: 'bonus',
          description: 'New user welcome bonus',
          balanceAfter: 65,
          createdAt: new Date(Date.now() - 604800000), // 1 week ago
        },
        {
          id: '4',
          userId,
          amount: 5,
          type: 'referral',
          description: 'Referred a friend: Kemi joined TimeBank',
          balanceAfter: 55,
          createdAt: new Date(Date.now() - 1209600000), // 2 weeks ago
        }
      ]

      // Sort by date, newest first
      const sortedTransactions = mockTransactions
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(offset, offset + limit)

      return { transactions: sortedTransactions }

    } catch (error) {
      console.error('Error getting transaction history:', error)
      return {
        transactions: [],
        error: error instanceof Error ? error.message : 'Failed to get transaction history'
      }
    }
  }

  /**
   * Process credit transfer between users (for trades)
   */
  async transferCredits(
    fromUserId: string,
    toUserId: string,
    amount: number,
    description: string,
    tradeId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Start a transaction (pseudo-transaction since we're using trust_score)

      // Deduct from sender
      const debitResult = await this.recordTransaction(
        fromUserId,
        -amount,
        'spent',
        `Paid: ${description}`,
        { relatedTradeId: tradeId }
      )

      if (!debitResult.success) {
        return debitResult
      }

      // Credit to receiver
      const creditResult = await this.recordTransaction(
        toUserId,
        amount,
        'earned',
        `Earned: ${description}`,
        { relatedTradeId: tradeId }
      )

      if (!creditResult.success) {
        // TODO: Rollback the debit transaction
        console.error('Credit transfer failed - rollback needed')
        return creditResult
      }

      return { success: true }

    } catch (error) {
      console.error('Error transferring credits:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transfer credits'
      }
    }
  }

  /**
   * Hold credits in escrow for a trade
   */
  async holdCreditsInEscrow(
    userId: string,
    amount: number,
    tradeId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real implementation, you'd mark credits as "pending" rather than deducting them
      // For now, we'll just record a pending transaction

      const result = await this.recordTransaction(
        userId,
        0, // Don't change balance yet
        'spent',
        `Credits held in escrow for trade`,
        { relatedTradeId: tradeId }
      )

      return result

    } catch (error) {
      console.error('Error holding credits in escrow:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to hold credits in escrow'
      }
    }
  }

  /**
   * Release escrowed credits
   */
  async releaseEscrowedCredits(
    userId: string,
    amount: number,
    tradeId: string,
    success: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (success) {
        // Release credits to the other party (this would be called for the receiver)
        return await this.recordTransaction(
          userId,
          amount,
          'earned',
          'Trade completed successfully',
          { relatedTradeId: tradeId }
        )
      } else {
        // Refund credits to original owner
        return await this.recordTransaction(
          userId,
          amount,
          'refund',
          'Trade cancelled - credits refunded',
          { relatedTradeId: tradeId }
        )
      }

    } catch (error) {
      console.error('Error releasing escrowed credits:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to release escrowed credits'
      }
    }
  }

  /**
   * Get earning opportunities for a user
   */
  async getEarningOpportunities(userId: string): Promise<{
    opportunities: CreditEarningOpportunity[]
    error?: string
  }> {
    try {
      const opportunities: CreditEarningOpportunity[] = [
        {
          type: 'trade',
          potentialCredits: 50,
          description: 'Complete your first trade',
          action: 'Browse available services',
          actionUrl: '/discover'
        },
        {
          type: 'referral',
          potentialCredits: 10,
          description: 'Refer a friend to TimeBank',
          action: 'Invite friends',
          actionUrl: '/profile?tab=referrals'
        },
        {
          type: 'bonus',
          potentialCredits: 25,
          description: 'Complete your profile and add 3 services',
          action: 'Complete profile',
          actionUrl: '/profile'
        }
      ]

      return { opportunities }

    } catch (error) {
      console.error('Error getting earning opportunities:', error)
      return {
        opportunities: [],
        error: error instanceof Error ? error.message : 'Failed to get earning opportunities'
      }
    }
  }

  /**
   * Calculate monthly credit summary
   */
  async getMonthlySummary(userId: string, year: number, month: number): Promise<{
    summary: {
      earned: number
      spent: number
      net: number
      transactionCount: number
      topCategories: { [category: string]: number }
    }
    error?: string
  }> {
    try {
      // TODO: Calculate from actual transaction data
      // Mock data for demonstration
      const mockSummary = {
        earned: 120,
        spent: 85,
        net: 35,
        transactionCount: 8,
        topCategories: {
          'Legal': 45,
          'Tech': 30,
          'Creative': 25,
          'Marketing': 20
        }
      }

      return { summary: mockSummary }

    } catch (error) {
      console.error('Error getting monthly summary:', error)
      return {
        summary: {
          earned: 0,
          spent: 0,
          net: 0,
          transactionCount: 0,
          topCategories: {}
        },
        error: error instanceof Error ? error.message : 'Failed to get monthly summary'
      }
    }
  }

  /**
   * Award bonus credits
   */
  async awardBonus(
    userId: string,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.recordTransaction(
      userId,
      amount,
      'bonus',
      `Bonus: ${reason}`
    )

    return result
  }

  /**
   * Calculate credit equivalent in Naira
   */
  calculateNairaEquivalent(credits: number, category?: string): number {
    const baseRate = category
      ? timeCreditsService.calculateCredits(1, category)
      : 5 // Default rate

    // 1 credit ≈ ₦1,000 (this is configurable)
    return credits * 1000
  }
}

export const creditWalletService = CreditWalletService.getInstance()