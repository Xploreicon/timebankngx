import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'

export const TimeCreditsCard = () => {
  const user = useAppStore(s => s.currentUser)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const target = user?.timeCredits ?? 0
    let raf: number
    const start = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 800)
      setValue(Math.round(target * p))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [user?.timeCredits])

  return (
    <div className="rounded-xl p-6 bg-gradient-to-br from-accent/30 to-primary/5 border shadow-[var(--shadow-elevate)]">
      <p className="text-sm text-muted-foreground">Time Credits</p>
      <div className="mt-2 text-4xl font-brand">⏰ {value} hrs</div>
      <p className="text-xs text-muted-foreground mt-2">Earn by offering services. Spend to get help.</p>
    </div>
  )
}
