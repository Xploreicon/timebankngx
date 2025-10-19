import { supabase } from '@/integrations/supabase/client'

export type MatchGroupStatus = 'pending' | 'converted' | 'declined' | 'expired'
export type MatchParticipantStatus = 'pending' | 'accepted' | 'declined'
export type MatchGroupType = 'two_way' | 'three_way'

export interface MatchProfile {
  id: string
  display_name?: string
  category?: string
  location?: string
  needs?: string[]
  trust_score?: number
  total_trades_completed?: number
  average_response_hours?: number | null
  phone_verified?: boolean
  email_verified?: boolean
  cac_verified?: boolean
}

export interface MatchParticipant {
  id: string
  roleIndex: number
  offerCategory: string
  needCategory: string
  status: MatchParticipantStatus
  accepted_at?: string
  profile: MatchProfile
}

export interface MatchGroup {
  id: string
  type: MatchGroupType
  status: MatchGroupStatus
  created_at: string
  updated_at: string
  participants: MatchParticipant[]
  myParticipant?: MatchParticipant
}

class MatchingEngine {
  private static instance: MatchingEngine

  public static getInstance(): MatchingEngine {
    if (!MatchingEngine.instance) {
      MatchingEngine.instance = new MatchingEngine()
    }
    return MatchingEngine.instance
  }

  /**
   * Generate fresh two-way matches and return proposals relevant to the user.
   */
  public async getMatchesForUser(userId: string): Promise<MatchGroup[]> {
    await this.refreshMatches()

    const { data, error } = await supabase
      .from('match_groups')
      .select(`
        id,
        group_type,
        status,
        created_at,
        updated_at,
        participants:match_group_participants (
          id,
          role_index,
          status,
          offer_category,
          need_category,
          accepted_at,
          profile:profile_id (
            id,
            display_name,
            category,
            location,
            needs,
            trust_score,
            total_trades_completed,
            average_response_hours,
            phone_verified,
            email_verified,
            cac_verified
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load matches', error)
      throw error
    }

    return (data || []).map((row) => {
      const participants: MatchParticipant[] = (row.participants ?? []).map((participant: any) => ({
        id: participant.id,
        roleIndex: participant.role_index,
        offerCategory: participant.offer_category,
        needCategory: participant.need_category,
        status: participant.status as MatchParticipantStatus,
        accepted_at: participant.accepted_at,
        profile: participant.profile ?? { id: '', display_name: 'Unknown' }
      }))

      const myParticipant = participants.find((p) => p.profile.id === userId)

      return {
        id: row.id,
        type: row.group_type as MatchGroupType,
        status: row.status as MatchGroupStatus,
        created_at: row.created_at,
        updated_at: row.updated_at,
        participants,
        myParticipant
      }
    })
  }

  public async acceptMatch(groupId: string, introMessage?: string) {
    const payload: Record<string, unknown> = {
      p_match_group_id: groupId
    };

    if (introMessage && introMessage.trim().length > 0) {
      payload.p_intro_message = introMessage.trim();
    }

    const { error } = await supabase.rpc('accept_match_participation', {
      ...payload
    })

    if (error) {
      console.error('Failed to accept match', error)
      throw error
    }
  }

  public async declineMatch(groupId: string) {
    const { error } = await supabase.rpc('decline_match_participation', {
      p_match_group_id: groupId
    })

    if (error) {
      console.error('Failed to decline match', error)
      throw error
    }
  }

  private async refreshMatches() {
    const { error } = await supabase.rpc('refresh_match_groups')
    if (error && error.code !== 'PGRST116') {
      // PGRST116 indicates no result from the function, which is acceptable
      console.error('Failed to refresh matches', error)
      throw error
    }
  }
}

export const matchingEngine = MatchingEngine.getInstance()
