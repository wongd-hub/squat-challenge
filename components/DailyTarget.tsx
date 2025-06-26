'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Trophy, Coffee } from 'lucide-react';

interface DailyTargetProps {
  targetSquats: number;
  completedSquats: number;
  day: number;
}

export function DailyTarget({ targetSquats, completedSquats, day }: DailyTargetProps) {
  const isRestDay = targetSquats === 0;
  const completionPercentage = isRestDay ? 100 : Math.min((completedSquats / targetSquats) * 100, 100);
  const isCompleted = isRestDay || completedSquats >= targetSquats;
  const remaining = Math.max(targetSquats - completedSquats, 0);

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRestDay ? (
              <Coffee className="w-5 h-5 text-blue-500" />
            ) : (
              <Target className="w-5 h-5 text-primary" />
            )}
            Day {day} {isRestDay ? 'Rest Day' : 'Challenge'}
          </div>
          {isCompleted && (
            <Trophy className="w-6 h-6 text-yellow-500 dark:text-yellow-400 animate-pulse" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          {isRestDay ? (
            <>
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent mb-2">
                🛌
              </div>
              <div className="text-sm text-muted-foreground">Rest & Recovery Day</div>
            </>
          ) : (
            <>
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
                {targetSquats}
              </div>
              <div className="text-sm text-muted-foreground">squats target</div>
            </>
          )}
        </div>

        {!isRestDay && (
          <>
            <div className="space-y-2">
              <Progress 
                value={completionPercentage} 
                className="h-4 glass-subtle"
              />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {completedSquats} / {targetSquats}
                </span>
                <span className={`font-semibold ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-primary'}`}>
                  {completionPercentage.toFixed(1)}%
                </span>
              </div>
            </div>

            {!isCompleted && (
              <div className="text-center p-4 glass-subtle rounded-xl">
                <div className="text-2xl font-bold text-primary mb-1">{remaining}</div>
                <div className="text-sm text-muted-foreground">squats remaining</div>
              </div>
            )}
          </>
        )}

        {isCompleted && (
          <div className="text-center p-4 glass-subtle rounded-xl border border-green-500/20">
            <div className="text-xl font-bold text-green-600 dark:text-green-400 mb-1">
              {isRestDay ? '🌟 Rest Day Complete!' : '🎉 Goal Achieved!'}
            </div>
            <div className="text-sm text-muted-foreground">
              {isRestDay ? 'Take it easy today!' : 'Great job today!'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}