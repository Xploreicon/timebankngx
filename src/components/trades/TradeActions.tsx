import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import type { TradeStatus } from './TradeTimeline'

interface Trade {
  id: string
  status: TradeStatus
  proposer_id: string
  provider_id: string
  proposer_completion_confirmed: boolean
  provider_completion_confirmed: boolean
  accepted_at: string | null
  started_at: string | null
  completed_at: string | null
}

interface TradeActionsProps {
  trade: Trade
  currentUserId: string
  onStatusUpdate: () => void
  onRequestRating?: () => void
}

export function TradeActions({ trade, currentUserId, onStatusUpdate, onRequestRating }: TradeActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [actionType, setActionType] = useState<'accept' | 'start' | 'complete' | 'cancel' | 'dispute'>('accept')

  const isProposer = trade.proposer_id === currentUserId
  const isProvider = trade.provider_id === currentUserId
  const otherPartyConfirmed = isProposer
    ? trade.provider_completion_confirmed
    : trade.proposer_completion_confirmed
  const currentUserConfirmed = isProposer
    ? trade.proposer_completion_confirmed
    : trade.provider_completion_confirmed

  const updateTradeStatus = async (newStatus: TradeStatus, updates: Record<string, string | boolean | null> = {}) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('trades')
        .update({
          status: newStatus,
          ...updates,
        })
        .eq('id', trade.id)

      if (error) throw error

      toast({
        title: 'Trade Updated',
        description: `Trade status changed to ${newStatus}`,
      })

      onStatusUpdate()

      // Trigger rating dialog if trade just completed
      if (newStatus === 'completed' && onRequestRating) {
        // Wait a bit for the UI to update
        setTimeout(() => {
          onRequestRating()
        }, 1000)
      }
    } catch (error) {
      console.error('Error updating trade:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update trade status',
      })
    } finally {
      setIsLoading(false)
      setShowConfirmDialog(false)
    }
  }

  const handleAccept = async () => {
    await updateTradeStatus('accepted', {
      accepted_at: new Date().toISOString(),
    })
  }

  const handleStart = async () => {
    await updateTradeStatus('active', {
      started_at: new Date().toISOString(),
    })
  }

  const handleConfirmCompletion = async () => {
    const confirmField = isProposer ? 'proposer_completion_confirmed' : 'provider_completion_confirmed'

    // If other party already confirmed, mark as completed
    if (otherPartyConfirmed) {
      await updateTradeStatus('completed', {
        [confirmField]: true,
        completed_at: new Date().toISOString(),
      })
    } else {
      // Just mark this user as confirmed
      const { error } = await supabase
        .from('trades')
        .update({ [confirmField]: true })
        .eq('id', trade.id)

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to confirm completion',
        })
        return
      }

      toast({
        title: 'Confirmation Recorded',
        description: 'Waiting for the other party to confirm completion',
      })

      onStatusUpdate()
    }
  }

  const handleCancel = async () => {
    await updateTradeStatus('cancelled', {
      cancelled_at: new Date().toISOString(),
    })
  }

  const handleRaiseDispute = async () => {
    await updateTradeStatus('disputed')

    // Create a dispute record (this should ideally be in a disputes table)
    // For now, we'll just change the status
    toast({
      title: 'Dispute Raised',
      description: 'Our team will review this trade. You will be contacted shortly.',
    })
  }

  const openConfirmDialog = (type: typeof actionType) => {
    setActionType(type)
    setShowConfirmDialog(true)
  }

  const executeAction = () => {
    switch (actionType) {
      case 'accept':
        handleAccept()
        break
      case 'start':
        handleStart()
        break
      case 'complete':
        handleConfirmCompletion()
        break
      case 'cancel':
        handleCancel()
        break
      case 'dispute':
        handleRaiseDispute()
        break
    }
  }

  const getDialogContent = () => {
    switch (actionType) {
      case 'accept':
        return {
          title: 'Accept Trade Proposal',
          description: 'Are you ready to accept this trade? Credits will be held in escrow until completion.',
        }
      case 'start':
        return {
          title: 'Start Trade Work',
          description: 'Mark this trade as active and begin working?',
        }
      case 'complete':
        return {
          title: 'Confirm Completion',
          description: otherPartyConfirmed
            ? 'Both parties will confirm completion. The trade will be marked as complete and credits will be released.'
            : 'Confirm that you have completed your part of the trade? The other party must also confirm before credits are released.',
        }
      case 'cancel':
        return {
          title: 'Cancel Trade',
          description: 'Are you sure you want to cancel this trade? This action cannot be undone.',
        }
      case 'dispute':
        return {
          title: 'Raise Dispute',
          description: 'Report an issue with this trade? Our team will review and mediate.',
        }
      default:
        return { title: '', description: '' }
    }
  }

  const dialogContent = getDialogContent()

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Trade Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Pending - Provider can accept */}
          {trade.status === 'pending' && isProvider && (
            <Button onClick={() => openConfirmDialog('accept')} className="w-full" disabled={isLoading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Accept Trade
            </Button>
          )}

          {/* Accepted - Either party can start */}
          {trade.status === 'accepted' && (
            <Button onClick={() => openConfirmDialog('start')} className="w-full" disabled={isLoading}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Start Work
            </Button>
          )}

          {/* Active - Can mark complete or raise dispute */}
          {trade.status === 'active' && (
            <>
              {currentUserConfirmed ? (
                <div className="p-3 bg-secondary rounded-lg text-center">
                  <p className="text-sm font-medium">You've confirmed completion</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {otherPartyConfirmed
                      ? 'Processing completion...'
                      : 'Waiting for other party to confirm'}
                  </p>
                </div>
              ) : (
                <Button
                  onClick={() => openConfirmDialog('complete')}
                  className="w-full"
                  disabled={isLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Complete
                </Button>
              )}

              <Button
                onClick={() => openConfirmDialog('dispute')}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Raise Dispute
              </Button>
            </>
          )}

          {/* Can cancel if not completed */}
          {['pending', 'accepted', 'negotiating'].includes(trade.status) && (
            <Button
              onClick={() => openConfirmDialog('cancel')}
              variant="destructive"
              className="w-full"
              disabled={isLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Trade
            </Button>
          )}

          {/* Completed */}
          {trade.status === 'completed' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="font-medium text-green-900">Trade Completed</p>
              <p className="text-sm text-green-700 mt-1">Credits have been exchanged successfully</p>
            </div>
          )}

          {/* Disputed */}
          {trade.status === 'disputed' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
              <p className="font-medium text-yellow-900">Trade Under Review</p>
              <p className="text-sm text-yellow-700 mt-1">Our team is investigating this issue</p>
            </div>
          )}

          {/* Cancelled */}
          {trade.status === 'cancelled' && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <XCircle className="h-8 w-8 mx-auto text-gray-600 mb-2" />
              <p className="font-medium text-gray-900">Trade Cancelled</p>
              <p className="text-sm text-gray-700 mt-1">This trade has been cancelled</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
