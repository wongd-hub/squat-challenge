'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, CheckCircle } from 'lucide-react';
import { useRef, useEffect, useState, useCallback } from 'react';
import { getChallengeDay, CHALLENGE_CONFIG } from '@/lib/supabase';

interface ProgressData {
  date: string;
  squats_completed: number;
  target_squats: number;
  day: string;
}

interface DailyTarget {
  day: number;
  target_squats: number;
}

interface ProgressChartProps {
  data: ProgressData[];
  dailyTargets: DailyTarget[];
}

export function ProgressChart({ data, dailyTargets }: ProgressChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [challengeData, setChallengeData] = useState<any[]>([]);

  // Generate challenge data using actual daily targets from database
  const generateChallengeDays = useCallback(() => {
    if (typeof window === 'undefined') return [];

    const today = new Date().toISOString().split('T')[0];
    const todayDay = getChallengeDay(today);

    // Use the actual daily targets from the database
    const totalDays = Math.max(dailyTargets.length, CHALLENGE_CONFIG.TOTAL_DAYS);
    
    return Array.from({ length: totalDays }, (_, i) => {
      const dayNumber = i + 1;
      const challengeStart = new Date(CHALLENGE_CONFIG.START_DATE);
      const dayDate = new Date(challengeStart);
      dayDate.setDate(challengeStart.getDate() + i);
      const dateStr = dayDate.toISOString().split('T')[0];
      
      // Find existing progress data for this day
      const existingData = data.find(d => d.date === dateStr);
      
      // Get target from dailyTargets array (from database)
      const targetSquats = dailyTargets.find(t => t.day === dayNumber)?.target_squats ?? 50;
      const completedSquats = existingData?.squats_completed || 0;
      
      return {
        day: dayNumber,
        date: dateStr,
        dayLabel: `Day ${dayNumber}`,
        target_squats: targetSquats,
        squats_completed: completedSquats,
        // For stacked bar: show remaining target as separate value
        remaining_target: Math.max(0, targetSquats - completedSquats),
        isToday: dayNumber === todayDay,
        isPast: dayNumber < todayDay,
        isFuture: dayNumber > todayDay,
        completionRate: targetSquats > 0 ? (completedSquats / targetSquats) * 100 : 100,
        isCompleted: targetSquats === 0 ? true : completedSquats >= targetSquats,
        isRestDay: targetSquats === 0
      };
    });
  }, [data, dailyTargets]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Calculate current day
    const today = new Date().toISOString().split('T')[0];
    const todayDay = getChallengeDay(today);
    setCurrentDay(todayDay);
  }, []);

  useEffect(() => {
    // Generate challenge data when dailyTargets or data changes
    if (dailyTargets.length > 0) {
      const challengeData = generateChallengeDays();
      setChallengeData(challengeData);
      console.log('📊 Generated challenge data with', challengeData.length, 'days using database targets');
    }
  }, [generateChallengeDays, dailyTargets]);

  useEffect(() => {
    // Auto-scroll to current day
    if (scrollRef.current && currentDay > 6) {
      const scrollPosition = (currentDay - 6) * 60; // Approximate width per bar
      scrollRef.current.scrollLeft = scrollPosition;
    }
  }, [currentDay]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-strong p-4 rounded-lg shadow-xl border border-border/50 min-w-48">
          <p className="font-semibold text-foreground mb-2">{data.dayLabel}</p>
          <div className="space-y-1">
            {data.isRestDay ? (
              <p className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
                🛌 Rest Day
              </p>
            ) : (
              <>
                <p className="text-green-600 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  Completed: <span className="font-bold">{data.squats_completed}</span>
                </p>
                <p className="text-primary flex items-center gap-2">
                  <Target className="w-3 h-3" />
                  Target: <span className="font-bold">{data.target_squats}</span>
                </p>
                <p className={`${data.completionRate >= 100 ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>
                  Progress: <span className="font-bold">{data.completionRate.toFixed(1)}%</span>
                </p>
                {data.remaining_target > 0 && (
                  <p className="text-muted-foreground">
                    Remaining: <span className="font-bold">{data.remaining_target}</span>
                  </p>
                )}
              </>
            )}
          </div>
          {data.isToday && (
            <Badge className="mt-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
              Today
            </Badge>
          )}
        </div>
      );
    }
    return null;
  };

  const totalCompleted = challengeData.reduce((acc, day) => acc + day.squats_completed, 0);
  const totalTarget = challengeData.reduce((acc, day) => acc + day.target_squats, 0);
  const overallCompletion = totalTarget > 0 ? (totalCompleted / totalTarget) * 100 : 0;
  const completedDays = challengeData.filter(day => day.isCompleted).length;
  const totalDays = challengeData.length;

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {totalDays}-Day Challenge Progress
            </CardTitle>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
              <span>Total: {totalCompleted.toLocaleString()} / {totalTarget.toLocaleString()} squats</span>
              <span>Overall: {overallCompletion.toFixed(1)}%</span>
              <span>Days completed: {completedDays}/{totalDays}</span>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500"></div>
              <span className="text-muted-foreground">Partial Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted/50 border border-muted"></div>
              <span className="text-muted-foreground">Remaining Target</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-muted-foreground">Rest Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-2 border-blue-500 bg-transparent"></div>
              <span className="text-muted-foreground">Today</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={scrollRef}
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="min-w-[1200px] h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={challengeData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                barCategoryGap="15%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="dayLabel" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--muted-foreground))"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Completed squats (bottom part of bar) */}
                <Bar 
                  dataKey="squats_completed" 
                  stackId="progress"
                  radius={[0, 0, 0, 0]}
                  name="Completed"
                >
                  {challengeData.map((entry, index) => {
                    let fillColor = 'hsl(var(--muted))'; // Default for no progress
                    
                    if (entry.isRestDay) {
                      fillColor = 'hsl(var(--chart-1))'; // Blue for rest days
                    } else if (entry.squats_completed > 0) {
                      if (entry.squats_completed >= entry.target_squats) {
                        fillColor = 'hsl(var(--chart-2))'; // Green for goal met
                      } else {
                        fillColor = 'hsl(var(--chart-4))'; // Orange for partial
                      }
                    }
                    
                    return (
                      <Cell 
                        key={`completed-${index}`} 
                        fill={fillColor}
                        stroke={entry.isToday ? 'hsl(var(--chart-1))' : 'transparent'}
                        strokeWidth={entry.isToday ? 2 : 0}
                      />
                    );
                  })}
                </Bar>
                
                {/* Remaining target (top part of bar) - only for non-rest days */}
                <Bar 
                  dataKey="remaining_target" 
                  stackId="progress"
                  radius={[4, 4, 0, 0]}
                  name="Remaining"
                >
                  {challengeData.map((entry, index) => (
                    <Cell 
                      key={`remaining-${index}`} 
                      fill={entry.isRestDay ? 'transparent' : 'hsl(var(--muted))'}
                      fillOpacity={entry.isRestDay ? 0 : 0.3}
                      stroke={entry.isToday ? 'hsl(var(--chart-1))' : 'hsl(var(--border))'}
                      strokeWidth={entry.isToday ? 2 : 1}
                      strokeDasharray={entry.isToday ? "0" : "2,2"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center p-4 glass-subtle rounded-xl">
            <div className="text-2xl font-bold text-primary">{totalCompleted.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Squats</div>
          </div>
          <div className="text-center p-4 glass-subtle rounded-xl">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedDays}</div>
            <div className="text-sm text-muted-foreground">Days Completed</div>
          </div>
          <div className="text-center p-4 glass-subtle rounded-xl">
            <div className="text-2xl font-bold text-orange-500">{overallCompletion.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Overall Progress</div>
          </div>
          <div className="text-center p-4 glass-subtle rounded-xl">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Math.max(0, totalDays - currentDay + 1)}</div>
            <div className="text-sm text-muted-foreground">Days Remaining</div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 p-4 glass-subtle rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Challenge Progress</span>
            <span className="text-sm text-muted-foreground">{currentDay}/{totalDays} days</span>
          </div>
          <div className="w-full bg-muted/30 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((currentDay / totalDays) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}