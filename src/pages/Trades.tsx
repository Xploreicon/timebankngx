import Layout from '@/components/Layout'
import { useAppStore } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'

export default function Trades(){
  const trades = useAppStore(s=>s.trades)
  const navigate = useNavigate()
  return (
    <Layout>
      <main className="space-y-4">
        {trades.map(t => (
          <div key={t.id} className="p-4 border rounded-lg hover:shadow-md transition cursor-pointer" onClick={()=>navigate(`/trades/${t.id}`)}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{t.serviceRequested.title}</h4>
              <span className="text-xs capitalize px-2 py-1 rounded bg-muted">{t.status}</span>
            </div>
            <p className="text-sm text-muted-foreground">Offering: {t.serviceOffered.title} • {t.hoursOffered}h</p>
          </div>
        ))}
      </main>
    </Layout>
  )
}
