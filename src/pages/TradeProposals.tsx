import Layout from '@/components/Layout'
import { useAppStore } from '@/store/appStore'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { tradeProposalService, TradeProposal } from '@/services/tradeProposals'
import { timeCreditsService } from '@/services/timeCredits'
import { NIGERIAN_CATEGORIES } from '@/config/categories'
import { Clock, User, CheckCircle, XCircle, MessageSquare, Calendar, AlertCircle, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function TradeProposals() {
  const { user } = useAppStore()
  const [sentProposals, setSentProposals] = useState<TradeProposal[]>([])
  const [receivedProposals, setReceivedProposals] = useState<TradeProposal[]>([])
  const [recommendations, setRecommendations] = useState<any>({ twoWayMatches: [], threeWayMatches: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProposal, setSelectedProposal] = useState<TradeProposal | null>(null)
  const [showCounterOfferDialog, setShowCounterOfferDialog] = useState(false)
  const [counterOfferHours, setCounterOfferHours] = useState('')
  const [counterOfferMessage, setCounterOfferMessage] = useState('')

  useEffect(() => {
    if (user) {
      loadProposals()
      loadRecommendations()
    }
  }, [user])

  const loadProposals = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const { sent, received, error } = await tradeProposalService.getUserProposals(user.id)

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error
        })
      } else {
        setSentProposals(sent)
        setReceivedProposals(received)
      }
    } catch (error) {
      console.error('Error loading proposals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecommendations = async () => {
    if (!user) return

    try {
      const recs = await tradeProposalService.getTradeRecommendations(user.id)
      setRecommendations(recs)
    } catch (error) {
      console.error('Error loading recommendations:', error)
    }
  }

  const handleAcceptProposal = async (proposalId: string) => {
    if (!user) return

    try {
      const { success, error } = await tradeProposalService.acceptProposal(proposalId, user.id)

      if (success) {
        toast({
          title: 'Proposal Accepted! 🎉',
          description: 'The trade has started. Check your active trades for next steps.'
        })
        loadProposals()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error
        })
      }
    } catch (error) {
      console.error('Error accepting proposal:', error)
    }
  }

  const handleRejectProposal = async (proposalId: string) => {
    if (!user) return

    try {
      const { success, error } = await tradeProposalService.rejectProposal(proposalId, user.id)

      if (success) {
        toast({
          title: 'Proposal Rejected',
          description: 'The proposal has been declined.'
        })
        loadProposals()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error
        })
      }
    } catch (error) {
      console.error('Error rejecting proposal:', error)
    }
  }

  const handleCounterOffer = async () => {
    if (!selectedProposal || !user || !counterOfferHours) return

    try {
      const { success, error } = await tradeProposalService.createCounterOffer(
        selectedProposal.id,
        user.id,
        {
          originalProposalId: selectedProposal.id,
          newHoursOffered: parseFloat(counterOfferHours),
          newMessage: counterOfferMessage
        }
      )

      if (success) {
        toast({
          title: 'Counter-Offer Sent',
          description: 'Your counter-offer has been sent to the other party.'
        })
        setShowCounterOfferDialog(false)
        setCounterOfferHours('')
        setCounterOfferMessage('')
        loadProposals()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error
        })
      }
    } catch (error) {
      console.error('Error creating counter-offer:', error)
    }
  }

  const getProposalStatusBadge = (status: string) => {
    const variants = {
      pending: 'outline',
      accepted: 'default',
      rejected: 'destructive',
      counter_offered: 'secondary'
    } as const

    const colors = {
      pending: 'text-yellow-600',
      accepted: 'text-green-600',
      rejected: 'text-red-600',
      counter_offered: 'text-blue-600'
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} className={colors[status as keyof typeof colors]}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const getFairnessColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const ProposalCard = ({ proposal, isSent = false }: { proposal: TradeProposal, isSent?: boolean }) => {
    const fairness = tradeProposalService.calculateProposalFairness(proposal)
    const otherUserId = isSent ? proposal.providerId : proposal.proposerId

    return (
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">
                {isSent ? 'Requested:' : 'Offering:'} {proposal.hoursRequested}h
              </CardTitle>
              <CardDescription>
                {isSent ? 'From' : 'To'} User • {formatDistanceToNow(proposal.createdAt)} ago
              </CardDescription>
            </div>
            {getProposalStatusBadge(proposal.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {isSent ? 'You Offer' : 'They Want'}
              </h4>
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-semibold">{proposal.hoursOffered} hours</div>
                <div className="text-sm text-muted-foreground">{proposal.creditsOffered} credits</div>
                <div className="text-xs">≈₦{(proposal.creditsOffered * 1000).toLocaleString()}</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {isSent ? 'You Want' : 'They Offer'}
              </h4>
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-semibold">{proposal.hoursRequested} hours</div>
                <div className="text-sm text-muted-foreground">{proposal.creditsRequested} credits</div>
                <div className="text-xs">≈₦{(proposal.creditsRequested * 1000).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Fairness Score:</span>
              <span className={`font-bold ${getFairnessColor(fairness.score)}`}>
                {fairness.score}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{proposal.estimatedCompletionDays} days estimated</span>
            </div>
          </div>

          {proposal.message && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 mt-0.5 text-blue-600" />
                <p className="text-sm text-blue-800">{proposal.message}</p>
              </div>
            </div>
          )}

          {!isSent && proposal.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAcceptProposal(proposal.id)}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedProposal(proposal)
                  setShowCounterOfferDialog(true)
                }}
                className="flex-1"
              >
                Counter-Offer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRejectProposal(proposal.id)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-pulse text-4xl mb-4">🔄</div>
            <p>Loading your trade proposals...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-brand">Trade Proposals</h1>
          <p className="text-muted-foreground">
            Manage your trade offers and discover new opportunities
          </p>
        </div>

        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="received">
              Received ({receivedProposals.length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              Sent ({sentProposals.length})
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              Suggestions ({recommendations.twoWayMatches.length + recommendations.threeWayMatches.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4">
            {receivedProposals.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-4xl mb-4">📥</div>
                  <h3 className="font-semibold mb-2">No proposals yet</h3>
                  <p className="text-muted-foreground">
                    When other users want to trade with you, their proposals will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              receivedProposals.map(proposal => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {sentProposals.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-4xl mb-4">📤</div>
                  <h3 className="font-semibold mb-2">No sent proposals</h3>
                  <p className="text-muted-foreground">
                    Your outgoing trade proposals will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              sentProposals.map(proposal => (
                <ProposalCard key={proposal.id} proposal={proposal} isSent />
              ))
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>🎯 Perfect Matches for You</CardTitle>
                <CardDescription>
                  Our AI found these trade opportunities based on your services and needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recommendations.twoWayMatches.length === 0 && recommendations.threeWayMatches.length === 0 ? (
                  <div className="text-center p-8">
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="text-muted-foreground">
                      No matches yet. Add more services to increase your match potential!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-blue-600">
                      💡 These are high-quality matches where everyone saves money by trading time instead of paying cash!
                    </p>
                    {/* Recommendations would be rendered here */}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Counter-Offer Dialog */}
      <Dialog open={showCounterOfferDialog} onOpenChange={setShowCounterOfferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make a Counter-Offer</DialogTitle>
            <DialogDescription>
              Propose different terms for this trade
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Hours you're willing to offer:</label>
              <Input
                type="number"
                placeholder="e.g., 8"
                value={counterOfferHours}
                onChange={(e) => setCounterOfferHours(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message (optional):</label>
              <Textarea
                placeholder="Explain why you're making this counter-offer..."
                value={counterOfferMessage}
                onChange={(e) => setCounterOfferMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCounterOfferDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCounterOffer} disabled={!counterOfferHours}>
              Send Counter-Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}