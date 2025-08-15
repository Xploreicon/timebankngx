import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Medal, Lock, Check } from 'lucide-react'

interface Achievement {
  id: string
  name: string
  description: string
  level: 'bronze' | 'silver' | 'gold' | 'platinum'
  unlocked: boolean
  progress?: number
  maxProgress?: number
}

const achievements: Achievement[] = [
  {
    id: 'first_trade',
    name: 'First Trade',
    description: 'Complete your first trade',
    level: 'bronze',
    unlocked: true
  },
  {
    id: 'loop_master',
    name: 'Loop Master',
    description: 'Complete a 3-way trade loop',
    level: 'silver', 
    unlocked: false,
    progress: 1,
    maxProgress: 3
  },
  {
    id: 'time_millionaire',
    name: 'Time Millionaire',
    description: 'Earn 1000 time credits',
    level: 'gold',
    unlocked: false,
    progress: 450,
    maxProgress: 1000
  },
  {
    id: 'community_builder',
    name: 'Community Builder',
    description: 'Connect 50+ traders',
    level: 'platinum',
    unlocked: false,
    progress: 12,
    maxProgress: 50
  }
]

export const AchievementGrid = () => {
  const getLevelColor = (level: Achievement['level']) => {
    const colors = {
      bronze: 'bg-gradient-to-br from-orange-400 to-orange-600',
      silver: 'bg-gradient-to-br from-gray-300 to-gray-500',
      gold: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
      platinum: 'bg-gradient-to-br from-purple-400 to-purple-600'
    }
    return colors[level]
  }

  const getLevelBadgeColor = (level: Achievement['level']) => {
    const colors = {
      bronze: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      silver: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', 
      gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      platinum: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    }
    return colors[level]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Medal className="h-5 w-5" />
          Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`relative p-4 rounded-lg border transition-all duration-200 ${
                achievement.unlocked
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800'
                  : 'bg-muted/50 border-muted-foreground/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-full ${getLevelColor(achievement.level)}`}>
                  {achievement.unlocked ? (
                    <Check className="h-4 w-4 text-white" />
                  ) : (
                    <Lock className="h-4 w-4 text-white" />
                  )}
                </div>
                <Badge 
                  variant="secondary" 
                  className={getLevelBadgeColor(achievement.level)}
                >
                  {achievement.level}
                </Badge>
              </div>
              
              <h4 className={`font-semibold ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                {achievement.name}
              </h4>
              <p className={`text-xs ${achievement.unlocked ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                {achievement.description}
              </p>
              
              {!achievement.unlocked && achievement.progress !== undefined && achievement.maxProgress && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{achievement.progress}/{achievement.maxProgress}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}