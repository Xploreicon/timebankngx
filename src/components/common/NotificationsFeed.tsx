
import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'

const toSafeDate = (value: unknown): Date | null => {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export const NotificationsFeed = () => {
  const { notifications, addNotification } = useAppStore()

  useEffect(() => {
    const id = setInterval(() => {
      const texts = [
        'New service match near Lagos!',
        'Ada sent you a trade message.',
        '2 new services in Creative category.',
      ]
      const text = texts[Math.floor(Math.random()*texts.length)]
      addNotification(text)
    }, 10000)
    return () => clearInterval(id)
  }, [addNotification])

  return (
    <div className="space-y-3">
      {notifications.slice(0,5).map(n => {
        const dt = toSafeDate((n as any).time)
        const timeText = dt ? dt.toLocaleTimeString() : ''
        return (
          <div key={n.id} className="p-3 rounded-md border bg-card animate-fade-in">
            <div className="text-sm">{n.text}</div>
            <div className="text-xs text-muted-foreground">{timeText}</div>
          </div>
        )
      })}
      {notifications.length === 0 && (
        <div className="p-6 text-center text-muted-foreground border rounded-md">No notifications yet</div>
      )}
    </div>
  )
}
