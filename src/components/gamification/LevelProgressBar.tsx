import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Trophy, Star } from 'lucide-react'

interface LevelProgressBarProps {
  currentXP: number
  currentLevel: number
  xpToNextLevel: number
  totalXPForNextLevel: number
}

export const LevelProgressBar = ({ 
  currentXP, 
  currentLevel, 
  xpToNextLevel, 
  totalXPForNextLevel 
}: LevelProgressBarProps) => {
  const progress = ((totalXPForNextLevel - xpToNextLevel) / totalXPForNextLevel) * 100

  const levelTitles = [
    'Newcomer', 'Helper', 'Contributor', 'Expert', 'Master', 'Legend'
  ]

  const levelTitle = levelTitles[Math.min(currentLevel - 1, levelTitles.length - 1)] || 'TimeBank Legend'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Level Progress
          </CardTitle>
          <Badge variant="secondary" className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 dark:from-yellow-900 dark:to-orange-900 dark:text-yellow-200">
            Level {currentLevel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          <h3 className="font-semibold text-primary">{levelTitle}</h3>
          <p className="text-xs text-muted-foreground">
            {currentXP.toLocaleString()} XP earned
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Progress to Level {currentLevel + 1}</span>
            <span>{xpToNextLevel} XP to go</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star 
              key={i}
              className={`h-3 w-3 ${i < currentLevel ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
            />
          ))}
        </div>
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Complete trades and help others to earn XP
          </p>
        </div>
      </CardContent>
    </Card>
  )
}