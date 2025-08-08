import AppShell from '@/components/layout/AppShell'
import { TimeCreditsCard } from '@/components/common/TimeCreditsCard'
import { ActiveTradesGrid } from '@/components/common/ActiveTradesGrid'
import { QuickActionsBar } from '@/components/common/QuickActionsBar'
import { NotificationsFeed } from '@/components/common/NotificationsFeed'
import { useAppStore } from '@/store/appStore'
import { Stars } from '@/components/common/Stars'

const Dashboard = () => {
  const user = useAppStore(s => s.currentUser)
  return (
    <AppShell>
      <main className="space-y-8">
        <section className="grid md:grid-cols-3 gap-6">
          <TimeCreditsCard />
          <div className="md:col-span-2">
            <QuickActionsBar />
            <div className="mt-4 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Welcome, {user?.businessName}</h3>
                  <p className="text-sm text-muted-foreground">Location: {user?.location}</p>
                </div>
                <Stars score={user?.trustScore ?? 0} />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-brand mb-3">Active Trades</h2>
          <ActiveTradesGrid />
        </section>

        <section>
          <h2 className="text-xl font-brand mb-3">Notifications</h2>
          <NotificationsFeed />
        </section>
      </main>
    </AppShell>
  )
}

export default Dashboard
