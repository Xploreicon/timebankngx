import { supabase } from '@/integrations/supabase/client'
import { timeCreditsService } from './timeCredits'
import { matchingEngine } from './matchingEngine'

export interface TradeProposal {
  id: string
  proposerId: string
  providerId: string
  proposerServiceId: string
  providerServiceId: string
  hoursOffered: number
  hoursRequested: number
  creditsOffered: number
  creditsRequested: number
  exchangeRate: number
  status: 'pending' | 'accepted' | 'rejected' | 'counter_offered' | 'withdrawn'
  message?: string
  urgency: 'low' | 'medium' | 'high'
  estimatedCompletionDays: number
  deliverables: string[]
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
}

export interface CounterOffer {
  originalProposalId: string
  newHoursOffered?: number
  newHoursRequested?: number
  newMessage?: string
  newEstimatedDays?: number
  newDeliverables?: string[]
}

export interface TradeNegotiation {
  proposalId: string
  offers: TradeProposal[]
  currentOffer: TradeProposal
  negotiationStatus: 'active' | 'accepted' | 'failed'
}

export class TradeProposalService {
  private static instance: TradeProposalService

  public static getInstance(): TradeProposalService {
    if (!TradeProposalService.instance) {
      TradeProposalService.instance = new TradeProposalService()
    }
    return TradeProposalService.instance
  }

  /**
   * Create a new trade proposal
   */
  async createProposal(
    proposerId: string,
    providerId: string,
    proposerServiceId: string,
    providerServiceId: string,
    details: {
      hoursOffered: number
      hoursRequested: number
      message?: string
      urgency?: 'low' | 'medium' | 'high'
      estimatedCompletionDays?: number
      deliverables?: string[]
    }
  ): Promise<{ success: boolean; proposal?: TradeProposal; error?: string }> {
    try {
      // Get service details
      const { data: proposerService, error: proposerError } = await supabase
        .from('services')
        .select('*')
        .eq('id', proposerServiceId)
        .single()

      const { data: providerService, error: providerError } = await supabase
        .from('services')
        .select('*')
        .eq('id', providerServiceId)
        .single()

      if (proposerError || providerError || !proposerService || !providerService) {
        return { success: false, error: 'Service not found' }
      }

      // Calculate credits and exchange rate
      const creditsOffered = timeCreditsService.calculateCredits(
        details.hoursOffered,
        proposerService.category
      )
      const creditsRequested = timeCreditsService.calculateCredits(
        details.hoursRequested,
        providerService.category
      )
      const exchangeRate = timeCreditsService.calculateExchangeRate(
        proposerService.category,
        providerService.category
      )

      // Create proposal in database
      const proposalData = {
        proposer_id: proposerId,
        provider_id: providerId,
        service_offered_id: proposerServiceId,
        service_requested_id: providerServiceId,
        hours_offered: details.hoursOffered,
        hours_requested: details.hoursRequested,
        status: 'pending' as const
      }

      const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .insert(proposalData)
        .select()
        .single()

      if (tradeError) throw tradeError

      // TODO: Store additional proposal metadata in a proposals table
      // For now, we'll return a constructed proposal object

      const proposal: TradeProposal = {
        id: trade.id,
        proposerId,
        providerId,
        proposerServiceId,
        providerServiceId,
        hoursOffered: details.hoursOffered,
        hoursRequested: details.hoursRequested,
        creditsOffered,
        creditsRequested,
        exchangeRate,
        status: 'pending',
        message: details.message,
        urgency: details.urgency || 'medium',
        estimatedCompletionDays: details.estimatedCompletionDays || 7,
        deliverables: details.deliverables || [],
        createdAt: new Date(trade.created_at),
        updatedAt: new Date(trade.updated_at),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }

      // Send notification (in a real app, this would be push notification/email)
      await this.sendProposalNotification(providerId, proposal)

      return { success: true, proposal }

    } catch (error) {
      console.error('Error creating proposal:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create proposal'
      }
    }
  }

  /**
   * Get all proposals for a user (sent and received)
   */
  async getUserProposals(userId: string): Promise<{
    sent: TradeProposal[]
    received: TradeProposal[]
    error?: string
  }> {
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select(`
          *,
          service_offered:service_offered_id(*),
          service_requested:service_requested_id(*),
          proposer:proposer_id(display_name, avatar_url),
          provider:provider_id(display_name, avatar_url)
        `)
        .or(`proposer_id.eq.${userId},provider_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      const sent: TradeProposal[] = []
      const received: TradeProposal[] = []

      for (const trade of trades || []) {
        const proposal = await this.convertTradeToProposal(trade)

        if (trade.proposer_id === userId) {
          sent.push(proposal)
        } else {
          received.push(proposal)
        }
      }

      return { sent, received }

    } catch (error) {
      console.error('Error getting user proposals:', error)
      return {
        sent: [],
        received: [],
        error: error instanceof Error ? error.message : 'Failed to get proposals'
      }
    }
  }

  /**
   * Accept a trade proposal
   */
  async acceptProposal(proposalId: string, accepterId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Update trade status to active
      const { error: updateError } = await supabase
        .from('trades')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', proposalId)
        .eq('provider_id', accepterId) // Ensure only the provider can accept

      if (updateError) throw updateError

      // TODO: Create escrow for credits
      // TODO: Send notifications to both parties
      // TODO: Create milestone tracking

      return { success: true }

    } catch (error) {
      console.error('Error accepting proposal:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept proposal'
      }
    }
  }

  /**
   * Reject a trade proposal
   */
  async rejectProposal(
    proposalId: string,
    rejecterId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error: updateError } = await supabase
        .from('trades')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', proposalId)
        .eq('provider_id', rejecterId)

      if (updateError) throw updateError

      // TODO: Send rejection notification with reason

      return { success: true }

    } catch (error) {
      console.error('Error rejecting proposal:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject proposal'
      }
    }
  }

  /**
   * Make a counter-offer
   */
  async createCounterOffer(
    originalProposalId: string,
    counterOfferId: string,
    counterOffer: CounterOffer
  ): Promise<{ success: boolean; proposal?: TradeProposal; error?: string }> {
    try {
      // Get the original proposal
      const { data: originalTrade, error: fetchError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', originalProposalId)
        .single()

      if (fetchError || !originalTrade) {
        return { success: false, error: 'Original proposal not found' }
      }

      // Create new proposal with updated terms
      const updatedData = {
        proposer_id: originalTrade.provider_id, // Reverse the roles
        provider_id: originalTrade.proposer_id,
        service_offered_id: originalTrade.service_requested_id,
        service_requested_id: originalTrade.service_offered_id,
        hours_offered: counterOffer.newHoursOffered || originalTrade.hours_requested,
        hours_requested: counterOffer.newHoursRequested || originalTrade.hours_offered,
        status: 'pending' as const
      }

      const { data: newTrade, error: createError } = await supabase
        .from('trades')
        .insert(updatedData)
        .select()
        .single()

      if (createError) throw createError

      // Mark original proposal as counter-offered
      await supabase
        .from('trades')
        .update({ status: 'cancelled' })
        .eq('id', originalProposalId)

      // TODO: Convert to full proposal object and return

      return { success: true }

    } catch (error) {
      console.error('Error creating counter-offer:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create counter-offer'
      }
    }
  }

  /**
   * Get smart trade suggestions for a user
   */
  async getTradeRecommendations(userId: string): Promise<{
    twoWayMatches: any[]
    threeWayMatches: any[]
    error?: string
  }> {
    try {
      const matches = await matchingEngine.getMatchesForUser(userId)

      return {
        twoWayMatches: matches.filter(m => m.type === '2-way'),
        threeWayMatches: matches.filter(m => m.type === '3-way')
      }

    } catch (error) {
      console.error('Error getting trade recommendations:', error)
      return {
        twoWayMatches: [],
        threeWayMatches: [],
        error: error instanceof Error ? error.message : 'Failed to get recommendations'
      }
    }
  }

  /**
   * Calculate proposal fairness score (0-100)
   */
  calculateProposalFairness(proposal: TradeProposal): {
    score: number
    factors: { [key: string]: number }
  } {
    const factors = {
      creditBalance: 50, // Base fair trade
      exchangeRate: 0,
      timeCommitment: 0,
      urgency: 0,
      trustScore: 0
    }

    // Exchange rate fairness (closer to market rate = higher score)
    const marketRate = proposal.exchangeRate
    const proposalRate = proposal.creditsOffered / proposal.creditsRequested
    const rateDiff = Math.abs(marketRate - proposalRate) / marketRate
    factors.exchangeRate = Math.max(0, 25 - rateDiff * 25)

    // Time commitment balance
    const hoursDiff = Math.abs(proposal.hoursOffered - proposal.hoursRequested)
    factors.timeCommitment = Math.max(0, 15 - hoursDiff * 2)

    // Urgency penalty (high urgency = slightly unfair)
    const urgencyPenalty = { low: 0, medium: -2, high: -5 }
    factors.urgency = urgencyPenalty[proposal.urgency]

    const totalScore = Object.values(factors).reduce((sum, val) => sum + val, 0)

    return {
      score: Math.max(0, Math.min(100, totalScore)),
      factors
    }
  }

  /**
   * Send notification about new proposal
   */
  private async sendProposalNotification(
    userId: string,
    proposal: TradeProposal
  ): Promise<void> {
    // TODO: Implement push notifications
    // TODO: Send email notification
    // TODO: Send SMS for urgent proposals

    console.log(`Notification sent to ${userId} about proposal ${proposal.id}`)
  }

  /**
   * Convert database trade to proposal object
   */
  private async convertTradeToProposal(trade: any): Promise<TradeProposal> {
    // This is a simplified conversion
    // In a real app, you'd fetch additional proposal metadata

    return {
      id: trade.id,
      proposerId: trade.proposer_id,
      providerId: trade.provider_id,
      proposerServiceId: trade.service_offered_id,
      providerServiceId: trade.service_requested_id,
      hoursOffered: trade.hours_offered,
      hoursRequested: trade.hours_requested,
      creditsOffered: trade.hours_offered * 5, // Simplified calculation
      creditsRequested: trade.hours_requested * 5,
      exchangeRate: 1, // Simplified
      status: trade.status === 'cancelled' ? 'rejected' : trade.status,
      urgency: 'medium',
      estimatedCompletionDays: 7,
      deliverables: [],
      createdAt: new Date(trade.created_at),
      updatedAt: new Date(trade.updated_at),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  }
}

export const tradeProposalService = TradeProposalService.getInstance()