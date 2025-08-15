import Layout from '@/components/Layout'
import { MetricsGrid } from '@/components/analytics/MetricsGrid'
import { TimeFlowChart } from '@/components/analytics/TimeFlowChart'
import { ROICalculator } from '@/components/analytics/ROICalculator'
import { NetworkGraph } from '@/components/analytics/NetworkGraph'
import { LevelProgressBar } from '@/components/gamification/LevelProgressBar'
import { AchievementGrid } from '@/components/gamification/AchievementGrid'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  const metrics = {
    totalHours: 127,
    creditsEarned: 89,
    successfulTrades: 23,
    trustScore: 87
  }

  const levelData = {
    currentXP: 2450,
    currentLevel: 3,
    xpToNextLevel: 550,
    totalXPForNextLevel: 3000
  }

  return (
    <Layout>
      <main className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-brand">Analytics Dashboard</h1>
        </div>

        {/* Metrics Overview */}
        <MetricsGrid metrics={metrics} />

        {/* Charts and Progress */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TimeFlowChart />
          </div>
          <div className="space-y-4">
            <LevelProgressBar {...levelData} />
            <ROICalculator />
          </div>
        </div>

        {/* Achievements and Network */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AchievementGrid />
          </div>
          <NetworkGraph />
        </div>
      </main>
    </Layout>
  )
}