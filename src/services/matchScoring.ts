import { supabase } from '@/integrations/supabase/client'
import { timeCreditsService } from './timeCredits'
import { NIGERIAN_CATEGORIES, getCategoryById, B2B_CATEGORIES, B2C_CATEGORIES } from '@/config/categories'

export interface UserProfile {
  id: string
  displayName: string
  location?: string
  category: string
  trustScore: number
  verificationPhone: boolean
  verificationEmail: boolean
  verificationCAC: boolean
  isOnboarded: boolean
  responseTime: number // Average hours to respond
  completionRate: number // Percentage of completed trades
  cancellationRate: number // Percentage of cancelled trades
  avgRating: number // Average star rating
  totalTrades: number
  joinDate: Date
}

export interface ServiceProfile {
  id: string
  userId: string
  title: string
  description: string
  category: string
  availability: boolean
  skillLevel: 'Beginner' | 'Intermediate' | 'Expert'
  hourlyRate: number
  avgDeliveryTime: number // Average days to complete
  portfolioItems: number
  successRate: number
}

export interface MatchScore {
  totalScore: number // 0-100
  breakdown: {
    trustCompatibility: number
    locationProximity: number
    categoryDemand: number
    exchangeFairness: number
    timeCompatibility: number
    skillLevelMatch: number
    responseSpeed: number
    verificationLevel: number
    marketTiming: number
    businessType: number
  }
  recommendations: string[]
  riskFactors: string[]
  estimatedSuccessRate: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export interface TradeMatch {
  type: '2-way' | '3-way'
  users: UserProfile[]
  services: ServiceProfile[]
  score: MatchScore
  estimatedValue: number // In Naira
  estimatedDuration: number // In days
  urgency: number // 1-10
  nigerianMarketFit: number // How well this fits Nigerian business needs
}

export class MatchScoringEngine {
  private static instance: MatchScoringEngine

  // Nigerian market-specific weights
  private readonly scoringWeights = {
    trustCompatibility: 0.20, // 20% - Trust is crucial in Nigerian business
    locationProximity: 0.15,  // 15% - Local connections matter
    categoryDemand: 0.12,     // 12% - Market demand for service category
    exchangeFairness: 0.12,   // 12% - Fair exchange of value
    timeCompatibility: 0.10,  // 10% - Matching time commitments
    skillLevelMatch: 0.08,    // 8% - Appropriate skill levels
    responseSpeed: 0.08,      // 8% - Quick response is valued
    verificationLevel: 0.06,  // 6% - CAC/Phone verification
    marketTiming: 0.05,       // 5% - Timing within business cycles
    businessType: 0.04        // 4% - B2B vs B2C compatibility
  }

  // Nigerian location scoring (major business centers)
  private readonly locationScores = {
    'Lagos': 100,
    'Abuja': 90,
    'Port Harcourt': 85,
    'Kano': 80,
    'Ibadan': 75,
    'Benin City': 70,
    'Kaduna': 65,
    'Jos': 60,
    'Aba': 55,
    'default': 30 // Other locations
  }

  // Time of year business activity multipliers
  private readonly seasonalMultipliers = {
    january: 0.8,   // Post-holiday slow period
    february: 0.9,
    march: 1.0,
    april: 1.1,
    may: 1.1,
    june: 1.0,
    july: 0.9,      // Mid-year slowdown
    august: 1.0,
    september: 1.1, // Back-to-school business
    october: 1.2,   // Pre-holiday ramp up
    november: 1.3,  // Peak business season
    december: 1.1   // Holiday season
  }

  public static getInstance(): MatchScoringEngine {
    if (!MatchScoringEngine.instance) {
      MatchScoringEngine.instance = new MatchScoringEngine()
    }
    return MatchScoringEngine.instance
  }

  /**
   * Calculate comprehensive match score between two users
   */
  async calculateMatchScore(
    userA: UserProfile,
    userB: UserProfile,
    serviceA: ServiceProfile,
    serviceB: ServiceProfile
  ): Promise<MatchScore> {
    const breakdown = {
      trustCompatibility: this.calculateTrustCompatibility(userA, userB),
      locationProximity: this.calculateLocationProximity(userA.location, userB.location),
      categoryDemand: this.calculateCategoryDemand(serviceA.category, serviceB.category),
      exchangeFairness: this.calculateExchangeFairness(serviceA, serviceB),
      timeCompatibility: this.calculateTimeCompatibility(serviceA, serviceB),
      skillLevelMatch: this.calculateSkillLevelMatch(serviceA.skillLevel, serviceB.skillLevel),
      responseSpeed: this.calculateResponseSpeed(userA.responseTime, userB.responseTime),
      verificationLevel: this.calculateVerificationLevel(userA, userB),
      marketTiming: this.calculateMarketTiming(),
      businessType: this.calculateBusinessTypeCompatibility(serviceA.category, serviceB.category)
    }

    // Calculate weighted total score
    const totalScore = Object.entries(breakdown).reduce((total, [key, value]) => {
      const weight = this.scoringWeights[key as keyof typeof this.scoringWeights] || 0
      return total + (value * weight)
    }, 0) * 100

    const recommendations = this.generateRecommendations(breakdown, userA, userB, serviceA, serviceB)
    const riskFactors = this.identifyRiskFactors(breakdown, userA, userB)
    const estimatedSuccessRate = this.calculateSuccessRate(breakdown, userA, userB)
    const priority = this.determinePriority(totalScore, breakdown)

    return {
      totalScore: Math.round(totalScore),
      breakdown,
      recommendations,
      riskFactors,
      estimatedSuccessRate,
      priority
    }
  }

  /**
   * Calculate trust compatibility between users
   */
  private calculateTrustCompatibility(userA: UserProfile, userB: UserProfile): number {
    const trustDiff = Math.abs(userA.trustScore - userB.trustScore)
    const avgTrust = (userA.trustScore + userB.trustScore) / 2
    const completionBonus = Math.min(userA.completionRate + userB.completionRate, 200) / 200

    // Higher score for similar trust levels and high average trust
    let score = Math.max(0, 1 - trustDiff / 100)
    score *= (avgTrust / 100) // Weight by average trust
    score *= completionBonus // Bonus for good completion rates

    // Penalty for high cancellation rates
    const avgCancellation = (userA.cancellationRate + userB.cancellationRate) / 2
    score *= Math.max(0.5, 1 - avgCancellation / 100)

    return Math.min(1, score)
  }

  /**
   * Calculate location proximity score
   */
  private calculateLocationProximity(locationA?: string, locationB?: string): number {
    if (!locationA || !locationB) return 0.3 // Default score for unknown locations

    const scoreA = this.locationScores[locationA] || this.locationScores.default
    const scoreB = this.locationScores[locationB] || this.locationScores.default

    if (locationA === locationB) {
      // Same location - perfect score
      return Math.max(scoreA, scoreB) / 100
    }

    // Different locations - base score on business importance of both locations
    const avgLocationScore = (scoreA + scoreB) / 2
    return (avgLocationScore / 100) * 0.7 // Penalty for different locations
  }

  /**
   * Calculate category demand in Nigerian market
   */
  private calculateCategoryDemand(categoryA: string, categoryB: string): number {
    const catA = getCategoryById(categoryA)
    const catB = getCategoryById(categoryB)

    if (!catA || !catB) return 0.5

    // Higher scores for popular/high-demand categories
    const popularityScore = (catA.popular ? 0.8 : 0.5) + (catB.popular ? 0.8 : 0.5)

    // Bonus for categories that commonly trade with each other
    const complementarity = this.calculateCategoryComplementarity(categoryA, categoryB)

    return Math.min(1, popularityScore + complementarity)
  }

  /**
   * Calculate how well categories complement each other
   */
  private calculateCategoryComplementarity(catA: string, catB: string): number {
    const commonPairs = {
      'legal': ['tech', 'creative', 'marketing', 'accounting'],
      'tech': ['legal', 'creative', 'marketing'],
      'creative': ['tech', 'marketing', 'legal'],
      'marketing': ['creative', 'tech', 'photography'],
      'accounting': ['legal', 'tech', 'marketing'],
      'generator_repair': ['transportation', 'construction'],
      'photography': ['marketing', 'event_planning', 'creative']
    }

    const complementsA = commonPairs[catA] || []
    const complementsB = commonPairs[catB] || []

    if (complementsA.includes(catB) || complementsB.includes(catA)) {
      return 0.3 // Good complementarity bonus
    }

    return 0
  }

  /**
   * Calculate exchange fairness
   */
  private calculateExchangeFairness(serviceA: ServiceProfile, serviceB: ServiceProfile): number {
    const exchangeRate = timeCreditsService.calculateExchangeRate(serviceA.category, serviceB.category)
    const reverseRate = timeCreditsService.calculateExchangeRate(serviceB.category, serviceA.category)

    const theoreticalBalance = exchangeRate * reverseRate
    const fairnessScore = Math.max(0, 1 - Math.abs(1 - theoreticalBalance))

    // Bonus for similar skill levels
    const skillLevels = ['Beginner', 'Intermediate', 'Expert']
    const skillDiff = Math.abs(skillLevels.indexOf(serviceA.skillLevel) - skillLevels.indexOf(serviceB.skillLevel))
    const skillBonus = Math.max(0, 1 - skillDiff / 2)

    return (fairnessScore * 0.7) + (skillBonus * 0.3)
  }

  /**
   * Calculate time compatibility
   */
  private calculateTimeCompatibility(serviceA: ServiceProfile, serviceB: ServiceProfile): number {
    const timeDiff = Math.abs(serviceA.avgDeliveryTime - serviceB.avgDeliveryTime)

    // Perfect compatibility if delivery times are within 2 days of each other
    if (timeDiff <= 2) return 1.0
    if (timeDiff <= 5) return 0.8
    if (timeDiff <= 10) return 0.6
    return 0.3
  }

  /**
   * Calculate skill level match
   */
  private calculateSkillLevelMatch(skillA: string, skillB: string): number {
    const levels = { 'Beginner': 1, 'Intermediate': 2, 'Expert': 3 }
    const levelA = levels[skillA as keyof typeof levels] || 2
    const levelB = levels[skillB as keyof typeof levels] || 2

    const diff = Math.abs(levelA - levelB)

    if (diff === 0) return 1.0 // Perfect match
    if (diff === 1) return 0.8 // Close match
    return 0.5 // Skill gap
  }

  /**
   * Calculate response speed compatibility
   */
  private calculateResponseSpeed(responseTimeA: number, responseTimeB: number): number {
    const avgResponse = (responseTimeA + responseTimeB) / 2

    // Excellent response times (< 2 hours)
    if (avgResponse < 2) return 1.0
    // Good response times (< 6 hours)
    if (avgResponse < 6) return 0.8
    // Acceptable response times (< 24 hours)
    if (avgResponse < 24) return 0.6
    // Slow response times
    return 0.3
  }

  /**
   * Calculate verification level bonus
   */
  private calculateVerificationLevel(userA: UserProfile, userB: UserProfile): number {
    let score = 0

    // Phone verification (most important in Nigeria)
    if (userA.verificationPhone && userB.verificationPhone) score += 0.4
    else if (userA.verificationPhone || userB.verificationPhone) score += 0.2

    // Email verification
    if (userA.verificationEmail && userB.verificationEmail) score += 0.3
    else if (userA.verificationEmail || userB.verificationEmail) score += 0.1

    // CAC verification (business registration)
    if (userA.verificationCAC && userB.verificationCAC) score += 0.3
    else if (userA.verificationCAC || userB.verificationCAC) score += 0.1

    return Math.min(1, score)
  }

  /**
   * Calculate market timing score
   */
  private calculateMarketTiming(): number {
    const currentMonth = new Date().getMonth()
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                       'july', 'august', 'september', 'october', 'november', 'december']
    const currentMonthName = monthNames[currentMonth] as keyof typeof this.seasonalMultipliers

    return Math.min(1, this.seasonalMultipliers[currentMonthName] || 1.0)
  }

  /**
   * Calculate business type compatibility
   */
  private calculateBusinessTypeCompatibility(categoryA: string, categoryB: string): number {
    const isB2BA = B2B_CATEGORIES.includes(categoryA)
    const isB2BB = B2B_CATEGORIES.includes(categoryB)

    // B2B services work better with other B2B services
    if (isB2BA && isB2BB) return 1.0

    // B2C services can work with B2B services but with lower compatibility
    if (isB2BA !== isB2BB) return 0.7

    // B2C with B2C is moderate compatibility
    return 0.8
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    breakdown: any,
    userA: UserProfile,
    userB: UserProfile,
    serviceA: ServiceProfile,
    serviceB: ServiceProfile
  ): string[] {
    const recommendations: string[] = []

    if (breakdown.trustCompatibility < 0.6) {
      recommendations.push('Consider starting with a smaller trade to build trust')
    }

    if (breakdown.locationProximity < 0.5) {
      recommendations.push('Plan for virtual collaboration or delivery arrangements')
    }

    if (breakdown.exchangeFairness < 0.7) {
      recommendations.push('Negotiate hours to make the exchange more balanced')
    }

    if (breakdown.responseSpeed < 0.6) {
      recommendations.push('Set clear communication expectations and timelines')
    }

    if (breakdown.verificationLevel < 0.5) {
      recommendations.push('Both parties should complete phone and CAC verification')
    }

    return recommendations
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(breakdown: any, userA: UserProfile, userB: UserProfile): string[] {
    const risks: string[] = []

    if (userA.cancellationRate > 20 || userB.cancellationRate > 20) {
      risks.push('High cancellation rate history')
    }

    if (userA.totalTrades < 3 || userB.totalTrades < 3) {
      risks.push('Limited trade experience')
    }

    if (breakdown.trustCompatibility < 0.4) {
      risks.push('Low trust compatibility')
    }

    if (breakdown.timeCompatibility < 0.5) {
      risks.push('Mismatched delivery timelines')
    }

    return risks
  }

  /**
   * Calculate estimated success rate
   */
  private calculateSuccessRate(breakdown: any, userA: UserProfile, userB: UserProfile): number {
    const avgCompletionRate = (userA.completionRate + userB.completionRate) / 2
    const totalScoreNormalized = Object.values(breakdown).reduce((sum: number, val: any) => sum + val, 0) / Object.keys(breakdown).length

    // Base success rate on completion history and compatibility
    const successRate = (avgCompletionRate * 0.6) + (totalScoreNormalized * 100 * 0.4)

    return Math.round(Math.min(95, Math.max(10, successRate)))
  }

  /**
   * Determine match priority
   */
  private determinePriority(totalScore: number, breakdown: any): 'low' | 'medium' | 'high' | 'urgent' {
    if (totalScore >= 85 && breakdown.categoryDemand > 0.8) return 'urgent'
    if (totalScore >= 75) return 'high'
    if (totalScore >= 60) return 'medium'
    return 'low'
  }

  /**
   * Rank multiple matches for a user
   */
  async rankMatches(userId: string, potentialMatches: any[]): Promise<TradeMatch[]> {
    const rankedMatches: TradeMatch[] = []

    for (const match of potentialMatches) {
      // This would include the actual scoring logic for each match
      // For now, return a placeholder
      const mockScore: MatchScore = {
        totalScore: Math.floor(Math.random() * 40) + 60, // 60-100
        breakdown: {
          trustCompatibility: 0.8,
          locationProximity: 0.7,
          categoryDemand: 0.9,
          exchangeFairness: 0.8,
          timeCompatibility: 0.7,
          skillLevelMatch: 0.8,
          responseSpeed: 0.9,
          verificationLevel: 0.6,
          marketTiming: 0.8,
          businessType: 0.9
        },
        recommendations: ['Complete phone verification for better matches'],
        riskFactors: [],
        estimatedSuccessRate: 87,
        priority: 'high'
      }

      rankedMatches.push({
        ...match,
        score: mockScore
      })
    }

    // Sort by total score descending
    return rankedMatches.sort((a, b) => b.score.totalScore - a.score.totalScore)
  }
}

export const matchScoringEngine = MatchScoringEngine.getInstance()
