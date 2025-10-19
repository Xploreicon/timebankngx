import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'

import Layout from '@/components/Layout'
import { useAppStore } from '@/store/appStore'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { NIGERIAN_CATEGORIES, getPopularCategories } from '@/config/categories'
import { matchingEngine, type MatchGroup } from '@/services/matchingEngine'

import {
  AlertCircle,
  Clock,
  Flame,
  Loader2,
  Plus,
  RefreshCw,
  TrendingUp,
  Users2,
  XCircle,
  ThumbsUp
} from 'lucide-react'

const categories = NIGERIAN_CATEGORIES

export default function Discover() {
  const { services, fetchServices, isLoading, user } = useAppStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('all')
  const [matches, setMatches] = useState<MatchGroup[]>([])
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [matchActionId, setMatchActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const loadMatches = useCallback(async () => {
    if (!user) {
      setMatches([])
      return
    }
    try {
      setMatchesLoading(true)
      const proposals = await matchingEngine.getMatchesForUser(user.id)
      setMatches(proposals)
    } catch (err) {
      console.error('Error loading matches:', err)
    } finally {
      setMatchesLoading(false)
    }
  }, [user])

  useEffect(() => {
    const loadServices = async () => {
      try {
        setError(null)
        await fetchServices()
      } catch (err) {
        console.error('Error loading services:', err)
        setError('Failed to load services. Please check your connection and try again.')
      }
    }
    loadServices()
  }, [fetchServices])

  useEffect(() => {
    loadMatches()
  }, [loadMatches])

  const filteredServices = useMemo(() => services.filter(service => (
    (!cat || cat === 'all' || service.category === cat) &&
    (service.title?.toLowerCase().includes(q.toLowerCase()) ||
      service.description?.toLowerCase().includes(q.toLowerCase()))
  )), [services, cat, q])

  const pendingMatches = matches.filter(match => match.status === 'pending')
  const popularCategories = getPopularCategories()

  const handleRetryServices = async () => {
    setError(null)
    await fetchServices()
  }

  const handleAcceptMatch = async (matchId: string) => {
    try {
      setMatchActionId(matchId)
      await matchingEngine.acceptMatch(matchId)
      toast({ title: 'Match accepted', description: "We'll alert the other participants." })
      await loadMatches()
    } catch (err) {
      console.error('Error accepting match:', err)
      toast({ variant: 'destructive', title: 'Could not accept match', description: (err as Error).message })
    } finally {
      setMatchActionId(null)
    }
  }

  const handleDeclineMatch = async (matchId: string) => {
    try {
      setMatchActionId(matchId)
      await matchingEngine.declineMatch(matchId)
      toast({ title: 'Match declined' })
      await loadMatches()
    } catch (err) {
      console.error('Error declining match:', err)
      toast({ variant: 'destructive', title: 'Could not decline match', description: (err as Error).message })
    } finally {
      setMatchActionId(null)
    }
  }

  const isProcessingMatch = (matchId: string) => matchActionId === matchId

  const renderMatchCard = (match: MatchGroup) => {
    const myParticipant = match.myParticipant
    const waitingOnOthers = match.participants.some(p => p.status === 'pending' && p.id !== myParticipant?.id)
    const allAccepted = match.participants.every(p => p.status === 'accepted')

    return (
      <div key={match.id} className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg capitalize">{match.type.replace('_', ' ')}</h3>
            <p className="text-sm text-muted-foreground">
              Created {new Date(match.created_at).toLocaleString()}
            </p>
          </div>
          <Badge variant={match.status === 'pending' ? 'outline' : 'secondary'} className="capitalize">
            {match.status}
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          {match.participants.map(participant => (
            <div
              key={participant.id}
              className={`rounded-md border p-3 text-sm ${participant.profile.id === myParticipant?.profile.id ? 'border-primary bg-primary/5' : 'bg-muted/40'}`}
            >
              <p className="font-medium flex items-center gap-2">
                {participant.profile.display_name || 'Member'}
                {participant.status === 'accepted' && <ThumbsUp className="w-3 h-3 text-green-600" />}
                {participant.status === 'declined' && <XCircle className="w-3 h-3 text-red-600" />}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Offers <strong>{participant.offerCategory}</strong><br />Needs <strong>{participant.needCategory}</strong>
              </p>
              {participant.profile.location && (
                <p className="text-[11px] text-muted-foreground mt-1">{participant.profile.location}</p>
              )}
            </div>
          ))}
        </div>

        {myParticipant && myParticipant.status === 'pending' && match.status === 'pending' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleAcceptMatch(match.id)}
              disabled={isProcessingMatch(match.id)}
            >
              {isProcessingMatch(match.id) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeclineMatch(match.id)}
              disabled={isProcessingMatch(match.id)}
            >
              Decline
            </Button>
            {waitingOnOthers && (
              <span className="text-xs text-muted-foreground">
                Waiting for other participants…
              </span>
            )}
          </div>
        )}

        {myParticipant && myParticipant.status === 'accepted' && match.status === 'pending' && (
          <p className="text-xs text-muted-foreground">
            You've accepted. We'll start the trade once everyone confirms.
          </p>
        )}

        {allAccepted && match.status === 'converted' && (
          <p className="text-xs text-green-700">
            Everyone accepted! Trades have been created in your dashboard.
          </p>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          <Skeleton className="h-40 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, index) => (
                <Skeleton key={index} className="h-40 w-full" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRetryServices} className="flex-shrink-0">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      <div className="mb-4 p-4 rounded-lg border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Flame className="w-8 h-8 text-orange-500" />
          <div>
            <h4 className="font-semibold text-gray-900">🔥 Try Swipe Mode!</h4>
            <p className="text-sm text-gray-600">
              Like Tinder but for trading services. Find matches faster!
            </p>
          </div>
        </div>
        <Button asChild className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
          <Link to="/discover/swipe">
            <Flame className="w-4 h-4 mr-2" />
            Start Swiping
          </Link>
        </Button>
      </div>

      <main className="grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="hidden lg:block border rounded-lg p-4 h-fit sticky top-20">
          <h3 className="font-semibold mb-3">Filters</h3>
          <div className="space-y-4">
            <Select onValueChange={setCat} value={cat}>
              <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div>
              <h4 className="text-sm font-medium mb-2">Popular in Nigeria</h4>
              <div className="space-y-1">
                {popularCategories.map(category => (
                  <Button
                    key={category.id}
                    variant={cat === category.id ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setCat(category.id)}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            {matches.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Users2 className="w-4 h-4" />
                  Match summary
                </h4>
                {matches.slice(0, 3).map(match => (
                  <div key={match.id} className="rounded-md border px-3 py-2 text-xs space-y-1">
                    <p className="font-medium capitalize">{match.type.replace('_', ' ')}</p>
                    <p className="text-muted-foreground">
                      {match.participants.map(p => p.profile.display_name || 'Member').join(', ')}
                    </p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Status: {match.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="space-y-6" id="matches">
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search services (e.g. 'legal help', 'website design')"
              />
              <div className="lg:hidden w-48">
                <Select onValueChange={setCat} value={cat}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name.split('&')[0].trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {pendingMatches.length > 0 && (
              <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50 text-green-800">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 mt-0.5 text-green-600" />
                  <div className="space-y-1">
                    <h4 className="font-semibold">🎉 Time trade opportunities waiting!</h4>
                    <p className="text-sm">
                      You have {pendingMatches.length} pending trade{pendingMatches.length !== 1 ? 's' : ''}. Respond to keep the loop moving.
                    </p>
                    <Button size="sm" variant="outline" onClick={loadMatches} disabled={matchesLoading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${matchesLoading ? 'animate-spin' : ''}`} />
                      Refresh matches
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Match Proposals
              </h2>
              <Button variant="outline" size="sm" onClick={loadMatches} disabled={matchesLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${matchesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {matchesLoading && matches.length === 0 && (
              <Skeleton className="h-24 w-full" />
            )}

            {!matchesLoading && matches.length === 0 && (
              <div className="border rounded-lg p-6 text-center text-muted-foreground">
                <Users2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p>No match proposals yet. Keep your profile updated and check back soon.</p>
              </div>
            )}

            <div className="grid gap-4">
              {matches.map(renderMatchCard)}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map(service => {
              const category = categories.find(c => c.id === service.category || c.name === service.category)
              return (
                <article key={service.id} className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer group">
                  <div className="aspect-video w-full rounded-md bg-gradient-to-br from-accent/30 to-primary/5 mb-3 flex items-center justify-center text-4xl">
                    {category?.icon || '💼'}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold group-hover:text-primary transition-colors">{service.title}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {category?.name || service.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {service.description || 'Professional service offering'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>₦{((category?.baseRate || 5) * 1000).toLocaleString()}/hr equivalent</span>
                      </div>
                      {service.availability && (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          Available
                        </Badge>
                      )}
                    </div>
                    <div className="pt-2 border-t">
                      <Button size="sm" className="w-full" asChild>
                        <Link to={`/proposals?service=${service.id}&action=request`}>
                          Start Trade
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {filteredServices.length === 0 && !isLoading && !error && (
            <div className="text-center py-12">
              {services.length === 0 ? (
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Welcome to TimeBank!</h3>
                    <p className="text-muted-foreground mb-4">
                      No services available yet. Be the first to offer your skills and start trading time!
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild>
                      <Link to="/services">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Service
                      </Link>
                    </Button>
                    <Button variant="outline" onClick={handleRetryServices}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    No services match your search "{q}" {cat && cat !== 'all' && `in ${cat}`}.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQ('')
                      setCat('all')
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </Layout>
  )
}
