import Layout from '@/components/Layout'
import { useAppStore } from '@/store/appStore'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { matchingEngine, MatchGroup } from '@/services/matchingEngine'
import { TinderCard, TinderCardMatch } from '@/components/discover/TinderCard'
import { MatchNotification } from '@/components/discover/MatchNotification'
import { SwipeControls, useSwipeKeyboard } from '@/components/discover/SwipeControls'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import {
  Grid3x3,
  Flame,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  ArrowLeft,
  Clock
} from 'lucide-react'
import { NIGERIAN_CATEGORIES } from '@/config/categories'

type DecisionLogItem = {
  id: string
  decision: 'pass' | 'trade'
  name: string
  score: number
}

const HOURS_BASELINE = 4

const ACCEPT_TOAST = {
  title: '🎉 Match accepted',
  description: 'We notified the other participant to finalise the trade.'
}

const DECLINE_TOAST = {
  title: 'Match passed',
  description: 'We will prioritise better fits for you.'
}

export default function DiscoverTinder() {
  const { user } = useAppStore()
  const [matches, setMatches] = useState<TinderCardMatch[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMatchNotification, setShowMatchNotification] = useState(false)
  const [lastMatchedUser, setLastMatchedUser] = useState<{
    name: string
    icon: string
    score: number
  } | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const [decisions, setDecisions] = useState<DecisionLogItem[]>([])
  const [messageDraft, setMessageDraft] = useState('')
  const [infoMatch, setInfoMatch] = useState<TinderCardMatch | null>(null)
  const hasAutoReloaded = useRef(false)

  const currentMatch = useMemo(
    () => (matches.length > 0 ? matches[currentIndex] : undefined),
    [matches, currentIndex]
  )

  const progress = useMemo(() => {
    if (!matches.length) return 0
    return Math.min(Math.round((currentIndex / matches.length) * 100), 100)
  }, [matches.length, currentIndex])

  const buildSwipeMatch = useCallback(
    (group: MatchGroup): TinderCardMatch | null => {
      if (!user) return null

      const sortedParticipants = [...group.participants].sort(
        (a, b) => a.roleIndex - b.roleIndex
      )
      const myIndex = sortedParticipants.findIndex(
        (participant) => participant.profile.id === user.id
      )

      if (myIndex === -1) return null

      const myParticipant = sortedParticipants[myIndex]
      const totalParticipants = sortedParticipants.length
      if (!myParticipant || totalParticipants < 2) return null

      const prevIndex = (myIndex - 1 + totalParticipants) % totalParticipants
      const nextIndex = (myIndex + 1) % totalParticipants

      const receiver = sortedParticipants[nextIndex] // You deliver to this profile
      const giver = sortedParticipants[prevIndex] // You receive from this profile

      const resolveTrust = (participant: MatchGroup['participants'][number]) =>
        participant.profile.trust_score ?? 50

      const calcHours = (participant: MatchGroup['participants'][number]) =>
        Number(
          Math.max(1, resolveTrust(participant) / 20 + HOURS_BASELINE - 1).toFixed(1)
        )

      const hoursFromGiver = calcHours(giver)
      const hoursToReceiver = calcHours(receiver)

      const receiveCategory = giver.offerCategory
      const deliverCategory = receiver.needCategory

      const loopPartners = []

      if (totalParticipants === 2) {
        loopPartners.push({
          userId: giver.profile.id,
          userName: giver.profile.display_name || 'Matched Member',
          location: giver.profile.location,
          offersCategory: giver.offerCategory,
          needsCategory: giver.needCategory,
          trustScore: resolveTrust(giver),
          relation: 'mutual' as const,
          hoursTheyProvide: hoursFromGiver,
          hoursYouProvide: hoursToReceiver
        })
      } else {
        loopPartners.push({
          userId: giver.profile.id,
          userName: giver.profile.display_name || 'Matched Member',
          location: giver.profile.location,
          offersCategory: giver.offerCategory,
          needsCategory: giver.needCategory,
          trustScore: resolveTrust(giver),
          relation: 'receive_from' as const,
          hoursTheyProvide: hoursFromGiver,
          hoursYouProvide: hoursToReceiver
        })
        if (receiver.profile.id !== giver.profile.id) {
          loopPartners.push({
            userId: receiver.profile.id,
            userName: receiver.profile.display_name || 'Matched Member',
            location: receiver.profile.location,
            offersCategory: receiver.offerCategory,
            needsCategory: receiver.needCategory,
            trustScore: resolveTrust(receiver),
            relation: 'deliver_to' as const,
            hoursTheyProvide: 0,
            hoursYouProvide: hoursToReceiver
          })
        }
      }

      const primaryPartner = loopPartners[0]
      const trustScore = primaryPartner?.trustScore ?? resolveTrust(myParticipant)
      const isPerfectCategoryMatch = myParticipant.offerCategory === primaryPartner?.needsCategory
      const baseScore = Math.min(
        95,
        Math.round(trustScore * 0.6 + (isPerfectCategoryMatch ? 35 : 20))
      )

      const exchangeRateBtoA = isPerfectCategoryMatch ? 1 : 1.2
      const savings = Math.max(
        10000,
        Math.round((primaryPartner?.hoursTheyProvide ?? hoursFromGiver) * 4500 + trustScore * 80)
      )

      return {
        type: group.type === 'three_way' ? '3-way' : '2-way',
        groupId: group.id,
        participantId: myParticipant.id,
        score: baseScore,
        userB: {
          userId: primaryPartner?.userId ?? giver.profile.id,
          userName: primaryPartner?.userName ?? (giver.profile.display_name || 'Matched Member'),
          location: primaryPartner?.location ?? giver.profile.location,
          category: primaryPartner?.offersCategory ?? receiveCategory,
          offersCategory: primaryPartner?.offersCategory ?? receiveCategory,
          needsCategory: primaryPartner?.needsCategory ?? deliverCategory,
          hoursOffered: primaryPartner?.hoursTheyProvide ?? hoursFromGiver,
          trustScore: primaryPartner?.trustScore ?? trustScore
        },
        exchangeRateAtoB: Number((1 / exchangeRateBtoA).toFixed(2)),
        exchangeRateBtoA: Number(exchangeRateBtoA.toFixed(2)),
        isBalancedTrade: Math.abs(exchangeRateBtoA - 1) < 0.15,
        estimatedSavings: {
          userA: savings,
          userB: Math.round(savings * 0.8)
        },
        myOfferCategory: myParticipant.offerCategory,
        myNeedCategory: myParticipant.needCategory,
        loopPartners
      }
    },
    [user]
  )

  const loadMatches = useCallback(async () => {
    if (!user) {
      setMatches([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const groups = await matchingEngine.getMatchesForUser(user.id)
      const swipeMatches = groups
        .filter((group) => group.status === 'pending')
        .map(buildSwipeMatch)
        .filter((match): match is TinderCardMatch => Boolean(match))

      if (swipeMatches.length === 0) {
        setError(
          "We don't have swipe-ready matches yet. Update your services or try again soon."
        )
      }

      setMatches(swipeMatches)
      setCurrentIndex((index) =>
        swipeMatches.length === 0 ? 0 : Math.min(index, swipeMatches.length - 1)
      )
      hasAutoReloaded.current = false
    } catch (err) {
      console.error('Error loading matches:', err)
      setError('Failed to load matches. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [user, buildSwipeMatch])

  useEffect(() => {
    loadMatches()
  }, [loadMatches])

  useEffect(() => {
    if (
      !hasAutoReloaded.current &&
      matches.length > 0 &&
      currentIndex >= matches.length - 2
    ) {
      hasAutoReloaded.current = true
      void loadMatches()
    }
  }, [currentIndex, matches.length, loadMatches])

  const appendDecision = useCallback((entry: DecisionLogItem) => {
    setDecisions((prev) => [entry, ...prev].slice(0, 5))
  }, [])

  const handleSwipeLeft = useCallback(async () => {
    if (!currentMatch || isProcessing) return

    try {
      setIsProcessing(true)
      if (currentMatch.groupId) {
        await matchingEngine.declineMatch(currentMatch.groupId)
      }

      appendDecision({
        id: currentMatch.groupId ?? `${currentMatch.userB.userId}-${Date.now()}`,
        decision: 'pass',
        name: currentMatch.userB.userName,
        score: currentMatch.score
      })

      setHistory((prev) => [...prev, currentIndex])
      setCurrentIndex((index) => index + 1)

      toast(DECLINE_TOAST)
    } catch (err) {
      console.error('Error declining match:', err)
      toast({
        variant: 'destructive',
        title: 'Could not pass on match',
        description: 'Please try again.'
      })
    } finally {
      setIsProcessing(false)
    }
  }, [appendDecision, currentIndex, currentMatch, isProcessing])

  const handleSwipeRight = useCallback(async () => {
    if (!currentMatch || isProcessing) return

    try {
      setIsProcessing(true)
      if (currentMatch.groupId) {
        await matchingEngine.acceptMatch(
          currentMatch.groupId,
          messageDraft
        )
      }

      appendDecision({
        id: currentMatch.groupId ?? `${currentMatch.userB.userId}-${Date.now()}`,
        decision: 'trade',
        name: currentMatch.userB.userName,
        score: currentMatch.score
      })

      setHistory((prev) => [...prev, currentIndex])
      setCurrentIndex((index) => index + 1)
      setMessageDraft('')

      setLastMatchedUser({
        name: currentMatch.userB.userName,
        icon:
          NIGERIAN_CATEGORIES.find(
            (category) => category.id === currentMatch.userB.offersCategory
          )?.icon || '👤',
        score: currentMatch.score
      })
      setShowMatchNotification(true)

      toast(ACCEPT_TOAST)
    } catch (err) {
      console.error('Error accepting match:', err)
      toast({
        variant: 'destructive',
        title: 'Could not accept match',
        description: 'Please try again.'
      })
    } finally {
      setIsProcessing(false)
    }
  }, [appendDecision, currentIndex, currentMatch, isProcessing])

  const handleInfo = useCallback(() => {
    if (!currentMatch) return
    setInfoMatch(currentMatch)
  }, [currentMatch])

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const lastIndex = next.pop() ?? 0
      setCurrentIndex(lastIndex)
      setDecisions((entries) => entries.slice(1))
      return next
    })
  }, [])

  useSwipeKeyboard({
    onPass: handleSwipeLeft,
    onTrade: handleSwipeRight,
    onInfo: handleInfo,
    onUndo: history.length > 0 ? handleUndo : undefined,
    disabled: isLoading || isProcessing || currentIndex >= matches.length
  })

  const renderEmptyState = useCallback(
    () => (
      <div className="flex items-center justify-center min-h-[600px]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-brand font-bold">No More Matches</h3>
            <p className="text-muted-foreground">
              {matches.length === 0
                ? "We haven't found any matches yet. Add more services to increase your match potential!"
                : "You've seen all available matches! Check back later for new opportunities."}
            </p>
            <div className="space-y-2 pt-4">
              <Button asChild className="w-full">
                <Link to="/services">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Add More Services
                </Link>
              </Button>
              <Button variant="outline" className="w-full" onClick={loadMatches}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Matches
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
    [loadMatches, matches.length]
  )

  const renderLoadingState = useCallback(
    () => (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="space-y-4 text-center">
          <div className="animate-pulse text-6xl">🔥</div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
          <p className="text-sm text-muted-foreground">
            Matching you with the best trade opportunities...
          </p>
        </div>
      </div>
    ),
    []
  )

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-8">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" asChild>
              <Link to="/discover">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Grid
              </Link>
            </Button>
            <Badge variant="outline" className="gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Swipe Mode
            </Badge>
          </div>
          {renderLoadingState()}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" asChild>
            <Link to="/discover">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Grid
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Swipe Mode
            </Badge>
            {matches.length > 0 && (
              <Badge variant="secondary">
                {Math.min(currentIndex + 1, matches.length)} / {matches.length}
              </Badge>
            )}
          </div>
          <Button variant="ghost" asChild>
            <Link to="/discover">
              <Grid3x3 className="w-4 h-4 mr-2" />
              Grid View
            </Link>
          </Button>
        </div>

        {/* Error Banner */}
        {error && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadMatches}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              {matches.length > 0
                ? `Viewing match ${Math.min(currentIndex + 1, matches.length)} of ${matches.length}`
                : 'No matches yet'}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-4 h-4" />
              Swipe or use arrow keys to respond quickly
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Card Stack */}
        {currentIndex < matches.length ? (
          <div className="relative" style={{ height: '600px' }}>
            {matches.slice(currentIndex, currentIndex + 3).map((match, index) => (
              <div
                key={`${match.userB.userId}-${currentIndex + index}`}
                className="absolute inset-0"
                style={{
                  zIndex: 3 - index,
                  transform: `scale(${1 - index * 0.05}) translateY(${index * 10}px)`,
                  opacity: index === 0 ? 1 : 0.5,
                  pointerEvents: index === 0 ? 'auto' : 'none'
                }}
              >
                <TinderCard
                  match={match}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                  onInfo={handleInfo}
                />
              </div>
            ))}
          </div>
        ) : (
          renderEmptyState()
        )}

        {/* Controls */}
        {currentIndex < matches.length && (
          <SwipeControls
            onPass={handleSwipeLeft}
            onTrade={handleSwipeRight}
            onInfo={handleInfo}
            onUndo={handleUndo}
            canUndo={history.length > 0}
            disabled={isProcessing}
          />
        )}

        {decisions.length > 0 && (
          <div className="mt-4 border rounded-lg p-4 bg-muted/30">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Recent decisions
            </div>
            <div className="flex flex-wrap gap-2">
              {decisions.map((decision) => (
                <Badge
                  key={decision.id}
                  variant={decision.decision === 'trade' ? 'default' : 'outline'}
                  className="gap-1"
                >
                  {decision.decision === 'trade' ? '✅' : '⏭️'} {decision.name}{' '}
                  <span className="text-xs text-muted-foreground">
                    {decision.score}%
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Match Notification */}
        {lastMatchedUser && (
          <MatchNotification
            show={showMatchNotification}
            userName={lastMatchedUser.name}
            userIcon={lastMatchedUser.icon}
            matchScore={lastMatchedUser.score}
            onClose={() => setShowMatchNotification(false)}
          />
        )}

        {/* Info Dialog */}
        <Dialog open={!!infoMatch} onOpenChange={(open) => !open && setInfoMatch(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>About {infoMatch?.userB.userName}</DialogTitle>
              <DialogDescription>
                View detailed information about this trade opportunity
              </DialogDescription>
            </DialogHeader>
            {infoMatch && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Match Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Match Score:</span>
                      <span className="font-medium">{infoMatch.score}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">{infoMatch.userB.location || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trust Score:</span>
                      <span className="font-medium">⭐ {infoMatch.userB.trustScore.toFixed(1)}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fair Trade:</span>
                      <span className="font-medium">
                        {infoMatch.isBalancedTrade ? '✅ Yes' : '⚠️ Review exchange terms'}
                      </span>
                    </div>
                  </div>
                </div>

                {infoMatch.loopPartners.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Loop Participants</h4>
                    <div className="space-y-2 text-sm">
                      {infoMatch.loopPartners.map((partner) => (
                        <div
                          key={partner.userId}
                          className="flex items-start justify-between rounded-lg border p-3"
                        >
                          <div>
                            <div className="font-medium">{partner.userName}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {partner.relation === 'receive_from'
                                ? 'You receive from this partner'
                                : partner.relation === 'deliver_to'
                                  ? 'You deliver to this partner'
                                  : 'Mutual trade partner'}
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <div>{partner.hoursTheyProvide.toFixed(1)} hrs → you</div>
                            <div>{partner.hoursYouProvide.toFixed(1)} hrs ← you</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Add a Message (Optional)</h4>
                  <Textarea
                    placeholder="Tell them why you'd be a great trade partner..."
                    value={messageDraft}
                    onChange={(e) => setMessageDraft(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setInfoMatch(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setInfoMatch(null)
                  handleSwipeRight()
                }}
                disabled={isProcessing}
              >
                Accept Match
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}
