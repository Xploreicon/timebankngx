import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CountUp from 'react-countup'
import { TrendingUp, Clock, Star, Trophy } from 'lucide-react'

interface MetricsGridProps {
  metrics: {
    totalHours: number
    creditsEarned: number
    successfulTrades: number
    trustScore: number
  }
}

export const MetricsGrid = ({ metrics }: MetricsGridProps) => {
  const metricCards = [
    {
      title: 'Total Hours Traded',
      value: metrics.totalHours,
      icon: Clock,
      suffix: ' hrs',
      color: 'text-primary'
    },
    {
      title: 'Credits Earned',
      value: metrics.creditsEarned,
      icon: TrendingUp,
      suffix: '',
      color: 'text-green-600'
    },
    {
      title: 'Successful Trades',
      value: metrics.successfulTrades,
      icon: Trophy,
      suffix: '',
      color: 'text-blue-600'
    },
    {
      title: 'Trust Score',
      value: metrics.trustScore,
      icon: Star,
      suffix: '%',
      color: 'text-yellow-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon
        return (
          <Card key={metric.title} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <CountUp
                  start={0}
                  end={metric.value}
                  duration={2 + (index * 0.2)}
                  suffix={metric.suffix}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}