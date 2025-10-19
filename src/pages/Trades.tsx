import Layout from '@/components/Layout'
import { useAppStore } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowRightLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  TrendingUp,
  Package
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface Trade {
  id: string
  status: string
  hours_offered: number
  hours_requested: number
  created_at: string
  updated_at: string
  service_offered?: {
    id: string
    title: string
    category: string
  }
  service_requested?: {
    id: string
    title: string
    category: string
  }
  proposer_id: string
  provider_id: string
}

const getStatusBadge = (status: string) => {
  const statusConfig = {
    pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
    negotiating: { icon: MessageSquare, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Negotiating' },
    accepted: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: 'Accepted' },
    active: { icon: TrendingUp, color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Active' },
    completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
    disputed: { icon: AlertCircle, color: 'bg-red-100 text-red-800 border-red-200', label: 'Disputed' },
    cancelled: { icon: XCircle, color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelled' },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Trades() {
  const { trades, fetchTrades, user } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadTrades = async () => {
      try {
        setIsLoading(true)
        setError(null)
        await fetchTrades()
      } catch (err) {
        console.error('Error loading trades:', err)
        setError('Failed to load trades. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadTrades()
  }, [fetchTrades])

  // Filter trades by status
  const { activeTrades, completedTrades, allTrades } = useMemo(() => {
    const active = trades.filter(t =>
      ['pending', 'negotiating', 'accepted', 'active'].includes(t.status)
    )
    const completed = trades.filter(t =>
      ['completed', 'cancelled', 'disputed'].includes(t.status)
    )

    return {
      activeTrades: active,
      completedTrades: completed,
      allTrades: trades
    }
  }, [trades])

  const renderTradeCard = (trade: Trade) => {
    const isProposer = trade.proposer_id === user?.id
    const serviceOffered = trade.service_offered
    const serviceRequested = trade.service_requested

    return (
      <Card
        key={trade.id}
        className="hover:shadow-lg transition cursor-pointer group"
        onClick={() => navigate(`/trades/${trade.id}`)}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-lg group-hover:text-primary transition">
                  {isProposer ? 'You Proposed' : 'Proposal Received'}
                </h4>
                {getStatusBadge(trade.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(trade.created_at)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* What you're offering */}
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Package className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-green-600 font-medium">Offering</p>
                <p className="text-sm font-medium">
                  {serviceOffered?.title || 'Service'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {trade.hours_offered} hours • {serviceOffered?.category || 'Service'}
                </p>
              </div>
            </div>

            {/* Exchange arrow */}
            <div className="flex justify-center">
              <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* What you're requesting */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-blue-600 font-medium">Requesting</p>
                <p className="text-sm font-medium">
                  {serviceRequested?.title || 'Service'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {trade.hours_requested} hours • {serviceRequested?.category || 'Service'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/trades/${trade.id}`)
              }}
            >
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/trades/${trade.id}?tab=messages`)
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderEmptyState = (type: 'active' | 'completed' | 'all') => {
    const messages = {
      active: {
        title: 'No Active Trades',
        description: "You don't have any active trades at the moment. Browse services to start trading time instead of money!",
        action: 'Browse Services',
        link: '/discover'
      },
      completed: {
        title: 'No Completed Trades',
        description: "You haven't completed any trades yet. Once you finish a trade, it will appear here.",
        action: 'View Active Trades',
        link: '/trades'
      },
      all: {
        title: 'No Trades Yet',
        description: "Start your first trade! Find services you need and offer your skills in exchange. Save money by trading time.",
        action: 'Discover Services',
        link: '/discover'
      }
    }

    const message = messages[type]

    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <ArrowRightLeft className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{message.title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {message.description}
        </p>
        <Button asChild>
          <Link to={message.link}>{message.action}</Link>
        </Button>
      </div>
    )
  }

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-6 w-12 mx-auto" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="mt-4 pt-4 border-t flex gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-brand flex items-center gap-2">
              <ArrowRightLeft className="w-8 h-8 text-primary" />
              My Trades
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your time-trading agreements
            </p>
          </div>
          <Button asChild>
            <Link to="/discover">
              <Package className="w-4 h-4 mr-2" />
              Browse Services
            </Link>
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null)
                  fetchTrades()
                }}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Summary */}
        {!isLoading && !error && allTrades.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold">{activeTrades.length}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{completedTrades.length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{allTrades.length}</p>
                  </div>
                  <ArrowRightLeft className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trades Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">
              Active ({activeTrades.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedTrades.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({allTrades.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {isLoading ? (
              renderLoadingSkeleton()
            ) : activeTrades.length === 0 ? (
              renderEmptyState('active')
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeTrades.map(renderTradeCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {isLoading ? (
              renderLoadingSkeleton()
            ) : completedTrades.length === 0 ? (
              renderEmptyState('completed')
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {completedTrades.map(renderTradeCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            {isLoading ? (
              renderLoadingSkeleton()
            ) : allTrades.length === 0 ? (
              renderEmptyState('all')
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {allTrades.map(renderTradeCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
