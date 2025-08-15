import Layout from '@/components/Layout'
import { TimeCreditsCard } from '@/components/common/TimeCreditsCard'
import { ActiveTradesGrid } from '@/components/common/ActiveTradesGrid'
import { QuickActionsBar } from '@/components/common/QuickActionsBar'
import { NotificationsFeed } from '@/components/common/NotificationsFeed'
import { useAppStore } from '@/store/appStore'
import { Stars } from '@/components/common/Stars'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { Search, Plus, TrendingUp, Clock } from 'lucide-react'

const Dashboard = () => {
  const { profile } = useAppStore()
  
  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <section className="text-center space-y-2">
          <h1 className="text-3xl font-brand">
            Welcome back, {profile?.display_name || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Ready to trade some time? Check out what's happening in your network.
          </p>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TimeCreditsCard />
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">
                +2 from last week
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.4h</div>
              <p className="text-xs text-muted-foreground">
                Average response time
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-brand mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild className="h-20 flex-col gap-2">
              <Link to="/discover">
                <Search className="h-6 w-6" />
                <span>Find Services</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to="/services">
                <Plus className="h-6 w-6" />
                <span>Offer Service</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to="/trades">
                <TrendingUp className="h-6 w-6" />
                <span>View Matches</span>
              </Link>
            </Button>
          </div>
        </section>

        {/* Active Trades */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-brand">Active Trades</h2>
            <Button asChild variant="outline" size="sm">
              <Link to="/trades">View All</Link>
            </Button>
          </div>
          <ActiveTradesGrid />
        </section>

        {/* Recent Activity */}
        <section>
          <h2 className="text-xl font-brand mb-4">Recent Activity</h2>
          <NotificationsFeed />
        </section>
      </div>
    </Layout>
  )
}

export default Dashboard
