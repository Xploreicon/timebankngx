import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'

export const TimeCreditsCard = () => {
  const { profile } = useAppStore()
  const [value, setValue] = useState(0)

  const timeCredits = Number(profile?.available_credits ?? 0)

  useEffect(() => {
    const target = timeCredits
    let raf: number
    const start = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 800)
      const nextValue = p === 1 ? target : Number((target * p).toFixed(1))
      setValue(nextValue)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [timeCredits])

  return (
    <div className="rounded-xl p-6 bg-gradient-to-br from-accent/30 to-primary/5 border shadow-[var(--shadow-elevate)]">
      <p className="text-sm text-muted-foreground">Time Credits</p>
      <div className="mt-2 text-4xl font-brand">⏰ {value.toFixed(value % 1 === 0 ? 0 : 1)} hrs</div>
      <p className="text-xs text-muted-foreground mt-2">Earn by offering services. Spend to get help.</p>
    </div>
  )
}
