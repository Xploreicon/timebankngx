import Layout from '@/components/Layout'
import { useParams } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TradeTimeline } from '@/components/trades/TradeTimeline'
import { TimeLogger } from '@/components/trades/TimeLogger'
import { TimeLogsList } from '@/components/trades/TimeLogsList'
import { TradeActions } from '@/components/trades/TradeActions'
import { TradeMessaging } from '@/components/trades/TradeMessaging'
import { RatingDialog } from '@/components/trades/RatingDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function TradeDetails(){
  const { id } = useParams()
  const { trades, fetchTrades, profile } = useAppStore()
  const [activeTab, setActiveTab] = useState('overview')
  const [showRatingDialog, setShowRatingDialog] = useState(false)

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  const trade = useMemo(() =>
    trades.find(t => t.id === id),
    [trades, id]
  )

  if (!trade) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Trade not found</h2>
          <p className="text-muted-foreground">The trade you're looking for doesn't exist.</p>
        </div>
      </Layout>
    )
  }

  const isProvider = trade.provider_id === profile?.id
  const isProposer = trade.proposer_id === profile?.id
  const canApproveTimeLogs = (isProvider && trade.status === 'active') || (isProposer && trade.status === 'active')

  // Get other party info for rating
  const otherPartyId = isProposer ? trade.provider_id : trade.proposer_id
  const otherPartyName = isProposer ? 'Provider' : 'Proposer' // In real app, fetch from profiles

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">{trade.title}</h1>
          <p className="text-muted-foreground mt-1">{trade.description}</p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* Left Column - Tabs */}
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="work">Work Logs</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <TradeTimeline
                  currentStatus={trade.status}
                  createdAt={trade.created_at}
                  acceptedAt={trade.accepted_at || undefined}
                  startedAt={trade.started_at || undefined}
                  completedAt={trade.completed_at || undefined}
                  cancelledAt={trade.cancelled_at || undefined}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Trade Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">You Offer</h4>
                        <p className="text-sm mt-1">
                          {isProposer ? trade.proposer_hours : trade.provider_hours} hours
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isProposer ? trade.proposer_credits : trade.provider_credits} credits
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">You Receive</h4>
                        <p className="text-sm mt-1">
                          {isProposer ? trade.provider_hours : trade.proposer_hours} hours
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isProposer ? trade.provider_credits : trade.proposer_credits} credits
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Exchange Rate</h4>
                      <p className="text-sm mt-1">{trade.exchange_rate.toFixed(2)}x</p>
                    </div>

                    {trade.delivery_deadline && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Deadline</h4>
                        <p className="text-sm mt-1">
                          {new Date(trade.delivery_deadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {trade.terms_and_conditions && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Terms & Conditions</h4>
                        <p className="text-sm mt-1 text-muted-foreground">
                          {trade.terms_and_conditions}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Messages Tab */}
              <TabsContent value="messages">
                <Card>
                  <CardHeader>
                    <CardTitle>Trade Communication</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {profile && (
                      <TradeMessaging
                        tradeId={trade.id}
                        currentUserId={profile.id}
                        otherPartyId={isProposer ? trade.provider_id : trade.proposer_id}
                        otherPartyName={isProposer ? 'Provider' : 'Proposer'}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Work Logs Tab */}
              <TabsContent value="work" className="space-y-6">
                {trade.status === 'active' && profile && (
                  <TimeLogger
                    tradeId={trade.id}
                    userId={profile.id}
                    onLogCreated={() => fetchTrades()}
                  />
                )}

                <TimeLogsList
                  tradeId={trade.id}
                  currentUserId={profile?.id || ''}
                  canApprove={canApproveTimeLogs}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Actions & Info */}
          <div className="space-y-4">
            {profile && (
              <TradeActions
                trade={trade as any}
                currentUserId={profile.id}
                onStatusUpdate={fetchTrades}
                onRequestRating={() => setShowRatingDialog(true)}
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle>Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="secondary" className="ml-2 capitalize">
                    {trade.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>
                  <span className="ml-2">{trade.priority_level || 3}/5</span>
                </div>
                {trade.requires_physical_meetup && (
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="mt-1">{trade.meetup_location || 'To be determined'}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Preferred Contact:</span>
                  <span className="ml-2 capitalize">{trade.preferred_communication_method || 'WhatsApp'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Rating Dialog */}
        {profile && showRatingDialog && (
          <RatingDialog
            isOpen={showRatingDialog}
            onClose={() => setShowRatingDialog(false)}
            tradeId={trade.id}
            reviewerId={profile.id}
            revieweeId={otherPartyId}
            revieweeName={otherPartyName}
            serviceId={isProposer ? trade.provider_service_id || undefined : trade.proposer_service_id || undefined}
            onReviewSubmitted={() => {
              fetchTrades()
              setShowRatingDialog(false)
            }}
          />
        )}
      </div>
    </Layout>
  )
}