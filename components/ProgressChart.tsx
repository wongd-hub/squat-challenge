'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, CheckCircle } from 'lucide-react';
import { useRef, useEffect, useState, useCallback } from 'react';
import { getChallengeDay, CHALLENGE_CONFIG, isChallengeComplete } from '@/lib/supabase';

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
  const [challengeComplete, setChallengeComplete] = useState(false);

  // Generate challenge data using actual daily targets from database
  const generateChallengeDays = useCallback(() => {
    if (typeof window === 'undefined') return [];

    const today = new Date().toISOString().split('T')[0];
    const todayDay = getChallengeDay(today);
    const isComplete = isChallengeComplete();

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
        isToday: !isComplete && dayNumber === todayDay,
        isPast: dayNumber < todayDay,
        isFuture: !isComplete && dayNumber > todayDay,
        completionRate: targetSquats > 0 ? (completedSquats / targetSquats) * 100 : 100,
        isCompleted: targetSquats === 0 ? true : completedSquats >= targetSquats,
        isRestDay: targetSquats === 0
      };
    });
  }, [data, dailyTargets]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Calculate current day and challenge status
    const today = new Date().toISOString().split('T')[0];
    const todayDay = getChallengeDay(today);
    const isComplete = isChallengeComplete();
    
    setCurrentDay(todayDay);
    setChallengeComplete(isComplete);
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
    // Auto-scroll to current day (only if challenge is not complete)
    if (scrollRef.current && !challengeComplete && currentDay > 6) {
      const scrollPosition = (currentDay - 6) * 60; // Approximate width per bar
      scrollRef.current.scrollLeft = scrollPosition;
    } else if (scrollRef.current && challengeComplete) {
      // Scroll to the end when challenge is complete
      const scrollPosition = (CHALLENGE_CONFIG.TOTAL_DAYS - 6) * 60;
      scrollRef.current.scrollLeft = scrollPosition;
    }
  }, [currentDay, challengeComplete]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-strong p-4 rounded-xl shadow-2xl border border-border/50 min-w-48 backdrop-blur-xl">
          <p className="font-semibold text-foreground mb-3 text-center">{data.dayLabel}</p>
          <div className="space-y-2">
            {data.isRestDay ? (
              <div className="text-center">
                <div className="text-3xl mb-2">🛌</div>
                <p className="text-blue-600 dark:text-blue-400 font-medium">Rest Day</p>
                <p className="text-xs text-muted-foreground">Recovery & relaxation</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-2 glass-subtle rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-sm">Completed</span>
                  </div>
                  <span className="font-bold text-green-600 dark:text-green-400">{data.squats_completed}</span>
                </div>
                
                <div className="flex items-center justify-between p-2 glass-subtle rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="w-3 h-3 text-primary" />
                    <span className="text-sm">Target</span>
                  </div>
                  <span className="font-bold text-primary">{data.target_squats}</span>
                </div>
                
                <div className="p-2 glass-subtle rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    <span className={`text-xs font-bold ${data.completionRate >= 100 ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>
                      {Math.min(data.completionRate, 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        data.completionRate >= 100 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                          : 'bg-gradient-to-r from-orange-500 to-amber-500'
                      }`}
                      style={{ width: `${Math.min(data.completionRate, 100)}%` }}
                    />
                  </div>
                </div>
                
                {data.remaining_target > 0 && (
                  <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <span className="text-sm text-orange-700 dark:text-orange-300">
                      <span className="font-bold">{data.remaining_target}</span> squats remaining
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          {data.isToday && !challengeComplete && (
            <Badge className="mt-3 w-full justify-center bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
              📅 Today
            </Badge>
          )}
        </div>
      );
    }
    return null;
  };

  const totalCompleted = challengeData.reduce((acc, day) => acc + day.squats_completed, 0);
  const totalTarget = challengeData.reduce((acc, day) => acc + day.target_squats, 0);
  const overallCompletion = totalTarget > 0 ? Math.min((totalCompleted / totalTarget) * 100, 100) : 0;
  const completedDays = challengeData.filter(day => day.isCompleted).length;
  const totalDays = challengeData.length;

  // Calculate display values for progress indicator
  const getProgressDisplayDay = () => {
    if (challengeComplete) {
      return CHALLENGE_CONFIG.TOTAL_DAYS;
    }
    return Math.min(currentDay, CHALLENGE_CONFIG.TOTAL_DAYS);
  };

  const getProgressPercentage = () => {
    if (challengeComplete) {
      return 100;
    }
    return Math.min((currentDay / CHALLENGE_CONFIG.TOTAL_DAYS) * 100, 100);
  };

  return (
    <Card className="glass overflow-hidden">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {totalDays}-Day Challenge Progress
              {challengeComplete && (
                <Badge className="ml-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                  Complete
                </Badge>
              )}
            </CardTitle>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
              <span>Total: {totalCompleted.toLocaleString()} / {totalTarget.toLocaleString()} squats</span>
              <span>Overall: {overallCompletion.toFixed(1)}%</span>
              <span>Days completed: {completedDays}/{totalDays}</span>
            </div>
          </div>
          
          {/* Enhanced Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2 p-2 glass-subtle rounded-lg">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-green-500 to-emerald-500 shadow-sm"></div>
              <span className="text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-2 p-2 glass-subtle rounded-lg">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-orange-500 to-amber-500 shadow-sm"></div>
              <span className="text-muted-foreground">Partial</span>
            </div>
            <div className="flex items-center gap-2 p-2 glass-subtle rounded-lg">
              <div className="w-3 h-3 rounded bg-gray-300 dark:bg-muted/50 border border-gray-400 dark:border-muted shadow-sm"></div>
              <span className="text-muted-foreground">Remaining</span>
            </div>
            <div className="flex items-center gap-2 p-2 glass-subtle rounded-lg">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-cyan-500 shadow-sm"></div>
              <span className="text-muted-foreground">Rest Day</span>
            </div>
            {!challengeComplete && (
              <div className="flex items-center gap-2 p-2 glass-subtle rounded-lg">
                <div className="w-3 h-3 rounded border-2 border-blue-500 bg-transparent shadow-sm"></div>
                <span className="text-muted-foreground">Today</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={scrollRef}
          className="overflow-x-auto pb-4"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--muted)) transparent'
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              height: 8px;
            }
            div::-webkit-scrollbar-track {
              background: hsl(var(--muted) / 0.1);
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb {
              background: linear-gradient(90deg, hsl(var(--primary) / 0.5), hsl(var(--primary) / 0.8));
              border-radius: 4px;
              border: 1px solid hsl(var(--border));
            }
            div::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(90deg, hsl(var(--primary) / 0.7), hsl(var(--primary)));
            }
          `}</style>
          
          <div className="min-w-[1200px] h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={challengeData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                barCategoryGap="15%"
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.2}
                  vertical={false}
                />
                <XAxis 
                  dataKey="dayLabel" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--muted-foreground))"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  tickLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  tickLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Completed squats (bottom part of bar) */}
                <Bar 
                  dataKey="squats_completed" 
                  stackId="progress"
                  radius={[0, 0, 4, 4]}
                  name="Completed"
                >
                  {challengeData.map((entry, index) => {
                    let fillColor = 'hsl(var(--muted))'; // Default for no progress
                    
                    if (entry.isRestDay) {
                      fillColor = 'url(#restDayGradient)'; // Blue gradient for rest days
                    } else if (entry.squats_completed > 0) {
                      if (entry.squats_completed >= entry.target_squats) {
                        fillColor = 'url(#completedGradient)'; // Green gradient for goal met
                      } else {
                        fillColor = 'url(#partialGradient)'; // Orange gradient for partial
                      }
                    }
                    
                    return (
                      <Cell 
                        key={`completed-${index}`} 
                        fill={fillColor}
                        stroke={entry.isToday && !challengeComplete ? 'hsl(var(--primary))' : 'transparent'}
                        strokeWidth={entry.isToday && !challengeComplete ? 3 : 0}
                        style={{
                          filter: entry.isToday && !challengeComplete ? 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))' : 'none',
                          transition: 'all 0.3s ease'
                        }}
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
                      fill={entry.isRestDay ? 'transparent' : 'hsl(var(--muted) / 0.6)'}
                      fillOpacity={entry.isRestDay ? 0 : 0.8}
                      stroke={entry.isToday && !challengeComplete ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                      strokeWidth={entry.isToday && !challengeComplete ? 3 : 1}
                      strokeDasharray={entry.isToday && !challengeComplete ? "0" : "2,2"}
                      style={{
                        filter: entry.isToday && !challengeComplete ? 'drop-shadow(0 0 8px hsl(var(--primary) / 0.3))' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  ))}
                </Bar>
                
                {/* Gradient Definitions */}
                <defs>
                  <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(142 76% 36%)" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="partialGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(25 95% 53%)" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="restDayGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(200 100% 50%)" stopOpacity={1} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Enhanced Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center p-4 glass-strong rounded-xl border border-primary/20 hover:border-primary/40 transition-all duration-300">
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 dark:from-primary dark:to-blue-400 bg-clip-text text-transparent">
              {totalCompleted.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Squats</div>
          </div>
          <div className="text-center p-4 glass-strong rounded-xl border border-green-500/20 hover:border-green-500/40 transition-all duration-300">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedDays}</div>
            <div className="text-sm text-muted-foreground">Days Completed</div>
          </div>
          <div className="text-center p-4 glass-strong rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300">
            <div className="text-2xl font-bold text-orange-500">{overallCompletion.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Overall Progress</div>
          </div>
          <div className="text-center p-4 glass-strong rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {challengeComplete ? '🎉' : Math.max(0, CHALLENGE_CONFIG.TOTAL_DAYS - Math.min(currentDay, CHALLENGE_CONFIG.TOTAL_DAYS) + 1)}
            </div>
            <div className="text-sm text-muted-foreground">
              {challengeComplete ? 'Complete!' : 'Days Remaining'}
            </div>
          </div>
        </div>

        {/* Enhanced Progress Indicator */}
        <div className="mt-6 p-6 glass-strong rounded-xl border border-primary/10">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium">
              {challengeComplete ? 'Challenge Complete!' : 'Challenge Progress'}
            </span>
            <span className="text-sm text-muted-foreground">
              {getProgressDisplayDay()}/{CHALLENGE_CONFIG.TOTAL_DAYS} days
            </span>
          </div>
          <div className="relative">
            <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
                  challengeComplete 
                    ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600' 
                    : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
                }`}
                style={{ width: `${getProgressPercentage()}%` }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
            {/* Progress percentage */}
            <div className="absolute -top-8 left-0 right-0 flex justify-center">
              <span className="text-xs font-medium text-primary bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full border border-border/50">
                {getProgressPercentage().toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}