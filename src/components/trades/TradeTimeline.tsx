import { Check, Clock, AlertCircle, XCircle, Play } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

export type TradeStatus = 'pending' | 'negotiating' | 'accepted' | 'active' | 'completed' | 'disputed' | 'cancelled'

interface TimelineStep {
  status: TradeStatus
  label: string
  description: string
  icon: typeof Check
  timestamp?: string
}

interface TradeTimelineProps {
  currentStatus: TradeStatus
  createdAt: string
  acceptedAt?: string
  startedAt?: string
  completedAt?: string
  cancelledAt?: string
}

const getStatusColor = (status: TradeStatus) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500'
    case 'active':
      return 'bg-blue-500'
    case 'accepted':
      return 'bg-indigo-500'
    case 'negotiating':
      return 'bg-yellow-500'
    case 'pending':
      return 'bg-gray-400'
    case 'disputed':
      return 'bg-red-500'
    case 'cancelled':
      return 'bg-gray-500'
    default:
      return 'bg-gray-300'
  }
}

const getStatusIcon = (status: TradeStatus) => {
  switch (status) {
    case 'completed':
      return Check
    case 'active':
      return Play
    case 'accepted':
      return Check
    case 'negotiating':
    case 'pending':
      return Clock
    case 'disputed':
      return AlertCircle
    case 'cancelled':
      return XCircle
    default:
      return Clock
  }
}

export function TradeTimeline({ currentStatus, createdAt, acceptedAt, startedAt, completedAt, cancelledAt }: TradeTimelineProps) {
  const steps: TimelineStep[] = [
    {
      status: 'pending',
      label: 'Proposed',
      description: 'Trade proposal created',
      icon: Clock,
      timestamp: createdAt,
    },
    {
      status: 'accepted',
      label: 'Accepted',
      description: 'Terms agreed by both parties',
      icon: Check,
      timestamp: acceptedAt,
    },
    {
      status: 'active',
      label: 'In Progress',
      description: 'Work has started',
      icon: Play,
      timestamp: startedAt,
    },
    {
      status: 'completed',
      label: 'Completed',
      description: 'Trade successfully finished',
      icon: Check,
      timestamp: completedAt,
    },
  ]

  // Handle cancelled/disputed states
  if (currentStatus === 'cancelled') {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
              <XCircle className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Trade Cancelled</h4>
              <p className="text-sm">
                {cancelledAt ? formatDistanceToNow(new Date(cancelledAt), { addSuffix: true }) : 'Cancelled'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (currentStatus === 'disputed') {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-destructive">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium">Trade Disputed</h4>
              <p className="text-sm">Under review by TimeBank team</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getCurrentStepIndex = () => {
    const statusOrder: TradeStatus[] = ['pending', 'accepted', 'active', 'completed']
    return statusOrder.indexOf(currentStatus)
  }

  const currentStepIndex = getCurrentStepIndex()

  return (
    <Card>
      <CardContent className="py-6">
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isPast = index < currentStepIndex
            const isCurrent = index === currentStepIndex
            const isFuture = index > currentStepIndex
            const Icon = step.icon

            return (
              <div key={step.status} className="relative flex items-start gap-3">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-5 top-10 w-0.5 h-full -ml-px ${
                      isPast ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  />
                )}

                {/* Status Icon */}
                <div
                  className={`relative flex items-center justify-center w-10 h-10 rounded-full ${
                    isCurrent
                      ? getStatusColor(currentStatus) + ' text-white ring-4 ring-primary/20'
                      : isPast
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Step Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`font-medium ${
                        isCurrent ? 'text-foreground' : isPast ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </h4>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.timestamp && (isPast || isCurrent) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(step.timestamp), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
