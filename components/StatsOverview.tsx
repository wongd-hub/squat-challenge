"use client"

import { Card, CardContent } from "@/components/ui/card"
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
              <CountUp end={streak} duration={800} />
            </div>
            <p className="text-sm text-muted-foreground">Current Streak</p>
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
            <p className="text-sm text-muted-foreground">Weekly Progress</p>
          </CardContent>
        </Card>

        <Card className="glass-strong shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              <CountUp end={weeklyProgress} duration={1800} />
            </div>
            <p className="text-sm text-muted-foreground">Weekly Squats</p>
          </CardContent>
        </Card>
      </div>


    </div>
  )
}
