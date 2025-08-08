import AppShell from '@/components/layout/AppShell'
import { useParams } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useMemo, useRef, useState } from 'react'

export default function TradeDetails(){
  const { id } = useParams()
  const trade = useAppStore(s=>s.trades.find(t=>t.id===id))
  const currentUser = useAppStore(s=>s.currentUser)
  const addMsg = useAppStore(s=>s.addTradeMessage)
  const [text, setText] = useState('')

  // Simple swipe card
  const cardRef = useRef<HTMLDivElement>(null)
  const [dx, setDx] = useState(0)
  const onPointerMove = (e: React.PointerEvent) => setDx(prev => prev + e.movementX)
  const onPointerUp = () => { setDx(0) }

  const send = () => {
    if(!text || !trade || !currentUser) return
    addMsg(trade.id, { id: crypto.randomUUID(), senderId: currentUser.id, text, timestamp: new Date() })
    setText('')
  }

  if(!trade) return <AppShell><div className="p-6">Trade not found</div></AppShell>

  return (
    <AppShell>
      <main className="grid lg:grid-cols-[1fr_300px] gap-6">
        <section className="border rounded-lg p-4">
          <h2 className="font-brand text-xl mb-4">Chat</h2>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
            {trade.messages.map(m => (
              <div key={m.id} className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.senderId===currentUser?.id ? 'ml-auto bg-accent text-accent-foreground' : 'mr-auto bg-secondary text-secondary-foreground'}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message" className="flex-1 px-3 py-2 rounded-md border bg-background" />
            <button onClick={send} className="px-4 py-2 rounded-md bg-accent text-accent-foreground">Send</button>
          </div>
        </section>
        <aside className="border rounded-lg p-4 h-fit">
          <h3 className="font-semibold mb-3">Propose Exchange</h3>
          <div ref={cardRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp} className="select-none cursor-grab">
            <div style={{ transform: `translateX(${dx}px) rotate(${dx/20}deg)`}} className="transition-transform will-change-transform p-4 rounded-xl border bg-gradient-to-br from-accent/30 to-primary/5">
              <p className="text-sm">Swipe right to accept, left to skip</p>
              <p className="mt-2 font-medium">{trade.serviceOffered.title} ↔ {trade.serviceRequested.title}</p>
              <p className="text-xs text-muted-foreground">{trade.hoursOffered}h for {trade.hoursRequested}h</p>
            </div>
          </div>
        </aside>
      </main>
    </AppShell>
  )
}
