"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import CountUp from "./CountUp"
import { Trophy, Target, Flame, Calendar } from "lucide-react"

interface StatsOverviewProps {
  totalSquats: number
  streak: number
  weeklyGoal: number
  weeklyProgress: number
}

export function StatsOverview({ totalSquats, streak, weeklyGoal, weeklyProgress }: StatsOverviewProps) {
  const weeklyPercentage = Math.min((weeklyProgress / weeklyGoal) * 100, 100)

  return (
    <div className="space-y-6">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="glass-strong shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              <CountUp end={totalSquats} duration={2000} />
            </div>
            <p className="text-sm text-muted-foreground">Total Squats</p>
          </CardContent>
        </Card>

        <Card className="glass-strong shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              <CountUp end={streak} duration={1500} />
            </div>
            <p className="text-sm text-muted-foreground">Days Completed</p>
          </CardContent>
        </Card>

        <Card className="glass-strong shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              <CountUp end={Math.round(weeklyPercentage)} duration={2000} suffix="%" />
            </div>
            <p className="text-sm text-muted-foreground">Overall Progress</p>
          </CardContent>
        </Card>

        <Card className="glass-strong shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">🎯</div>
            <p className="text-sm text-muted-foreground">Completed!</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress Card */}
      <Card className="glass-strong shadow-sm mt-6 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Challenge Complete!</h3>
            <Badge variant="outline" className="text-xs">
              23/23 days
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-medium">100%</span>
            </div>
            <Progress value={100} className="h-3" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
