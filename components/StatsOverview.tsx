'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Flame, TrendingUp, Award } from 'lucide-react';

interface StatsOverviewProps {
  totalSquats: number;
  streak: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

export function StatsOverview({ totalSquats, streak, weeklyGoal, weeklyProgress }: StatsOverviewProps) {
  const weeklyPercentage = Math.min((weeklyProgress / weeklyGoal) * 100, 100);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Total Squats</CardTitle>
          <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            {totalSquats.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">All time record</p>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Current Streak</CardTitle>
          <Flame className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-lg md:text-2xl font-bold text-orange-500 flex items-center gap-1">
            {streak > 0 && <span>🔥</span>}
            {streak}
          </div>
          <p className="text-xs text-muted-foreground">
            {streak === 1 ? 'day' : 'days'} in a row
          </p>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Weekly Progress</CardTitle>
          <Calendar className="h-3 w-3 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">{weeklyProgress}</div>
          <p className="text-xs text-muted-foreground mb-2">
            of {weeklyGoal} weekly goal
          </p>
          <Badge variant={weeklyPercentage >= 100 ? "default" : "secondary"} className="glass-subtle text-xs">
            {weeklyPercentage.toFixed(0)}% complete
          </Badge>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Achievement</CardTitle>
          <Award className="h-3 w-3 md:h-4 md:w-4 text-purple-600 dark:text-purple-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold">
            {totalSquats >= 1000 ? '🏆' : totalSquats >= 500 ? '🥇' : totalSquats >= 100 ? '🥈' : '🥉'}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalSquats >= 1000 ? 'Squat Master' : 
             totalSquats >= 500 ? 'Squat Pro' : 
             totalSquats >= 100 ? 'Squat Hero' : 'Getting Started'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}