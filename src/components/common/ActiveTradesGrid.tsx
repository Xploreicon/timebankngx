import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'

const statusColor: Record<string, string> = {
  pending: 'bg-muted text-foreground',
  active: 'bg-accent text-accent-foreground',
  completed: 'bg-secondary text-secondary-foreground',
  disputed: 'bg-destructive text-destructive-foreground',
}

export const ActiveTradesGrid = () => {
  const { trades, fetchTrades } = useAppStore()
  const navigate = useNavigate()
  
  React.useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {trades.map((t) => {
        const total = t.hours_requested || 1
        const done = t.status === 'completed' ? total : Math.floor(total / 2)
        const pct = Math.round((done/total)*100)
        return (
          <div key={t.id} className="p-4 rounded-lg border hover:shadow-md transition cursor-pointer" onClick={() => navigate(`/trades/${t.id}`)}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{t.service_requested?.title || 'Trade'}</h4>
              <Badge className={`${statusColor[t.status]} capitalize`}>{t.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">For {t.service_offered?.title || 'Service'}</p>
            <Progress className="mt-3" value={pct} />
            <div className="mt-2 text-xs text-muted-foreground">{done}h / {total}h</div>
          </div>
        )
      })}
      {trades.length === 0 && (
        <div className="col-span-full text-center p-6 text-muted-foreground">
          No active trades yet. Start trading to see your progress here!
        </div>
      )}
    </div>
  )
}
