'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Flame, TrendingUp, Award } from 'lucide-react';
import { CountUp } from './CountUp';

interface StatsOverviewProps {
  totalSquats: number;
  streak: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

export function StatsOverview({ totalSquats, streak, weeklyGoal, weeklyProgress }: StatsOverviewProps) {
  const weeklyPercentage = Math.min((weeklyProgress / weeklyGoal) * 100, 100);

  // Debug log to see what values we're receiving
  console.log('StatsOverview received:', { totalSquats, streak, weeklyGoal, weeklyProgress });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Total Squats</CardTitle>
          <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <CountUp
            value={totalSquats}
            duration={2500}
            className="text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent"
            formatter={(val) => val.toLocaleString()}
            startOnView={true}
          />
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
            <CountUp
              value={streak}
              duration={2000}
              formatter={(val) => val.toString()}
              startOnView={true}
            />
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
          <CountUp
            value={weeklyProgress}
            duration={2200}
            className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400"
            formatter={(val) => val.toLocaleString()}
            startOnView={true}
          />
          <p className="text-xs text-muted-foreground mb-2">
            of {weeklyGoal.toLocaleString()} weekly goal
          </p>
          <Badge variant={weeklyPercentage >= 100 ? "default" : "secondary"} className="glass-subtle text-xs">
            <CountUp
              value={weeklyPercentage}
              duration={2500}
              formatter={(val) => `${val.toFixed(0)}% complete`}
              startOnView={true}
            />
          </Badge>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs md:text-sm font-medium">Achievement</CardTitle>
          <Award className="h-3 w-3 md:h-4 md:w-4 text-purple-600 dark:text-purple-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold mb-1">
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