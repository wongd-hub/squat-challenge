"use client"

import React, { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, TooltipProps } from "recharts"
import { CHALLENGE_CONFIG, getChallengeDay } from "@/lib/supabase"

interface ProgressChartProps {
  data: any[]
  dailyTargets: any[]
  onDayClick?: (date: string, currentSquats: number, target: number) => void
}

export function ProgressChart({ data, dailyTargets, onDayClick }: ProgressChartProps) {
  // Memoize expensive chart data generation
  const chartData = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    const currentDay = getChallengeDay(today)

    return Array.from({ length: CHALLENGE_CONFIG.TOTAL_DAYS }, (_, index) => {
      const day = index + 1
      const target =
        dailyTargets.find((t) => t.day === day)?.target_squats ??
        CHALLENGE_CONFIG.DAILY_TARGETS.find((t) => t.day === day)?.target_squats ??
        50

      // Find actual progress for this day
      const dayDate = new Date(CHALLENGE_CONFIG.START_DATE)
      dayDate.setDate(dayDate.getDate() + index)
      const dateStr = dayDate.toISOString().split("T")[0]

      const progress = data.find((d) => d.date === dateStr)
      const completed = progress?.squats_completed || 0

      const isRestDay = target === 0
      const isToday = day === currentDay
      const isCompleted = !isRestDay && completed >= target
      const isPartial = !isRestDay && completed > 0 && completed < target

      return {
        day: `Day ${day}`,
        dayNumber: day,
        target,
        completed,
        percentage: isRestDay ? 100 : Math.min((completed / target) * 100, 100),
        isRestDay,
        isToday,
        isCompleted,
        isPartial,
        date: dateStr,
      }
    })
  }, [data, dailyTargets])

  // Memoize stats calculations
  const stats = useMemo(() => {
    const totalTarget = CHALLENGE_CONFIG.DAILY_TARGETS.reduce((sum, day) => sum + day.target_squats, 0)
    const totalCompleted = chartData.reduce((sum, day) => sum + day.completed, 0)
    const daysCompleted = chartData.filter((day) => !day.isRestDay && day.completed >= day.target).length
    const overallPercentage = Math.round((totalCompleted / totalTarget) * 100)

    return { totalTarget, totalCompleted, daysCompleted, overallPercentage }
  }, [chartData])

  // Memoize Y-axis calculation
  const yAxisMax = useMemo(() => {
    const maxTarget = Math.max(...chartData.map(day => day.target))
    const maxCompleted = Math.max(...chartData.map(day => day.completed))
    const maxValue = Math.max(maxTarget, maxCompleted)
    return Math.ceil((maxValue * 1.1) / 50) * 50 // Round up to nearest 50
  }, [chartData])

  const getBarColor = (entry: any) => {
    if (entry.isRestDay) return "#3b82f6" // Blue for rest days
    if (entry.isToday) return "#8b5cf6" // Purple for today
    if (entry.isCompleted) return "#10b981" // Green for completed
    if (entry.isPartial) return "#f59e0b" // Orange for partial
    return "#e5e7eb" // Gray for remaining
  }

  const CustomBar = (props: any) => {
    const { payload, x, y, width, height } = props
    if (!payload) return null

    const fillHeight = (height * payload.percentage) / 100
    const emptyHeight = height - fillHeight

    const handleBarClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onDayClick && payload) {
        onDayClick(payload.date, payload.completed, payload.target)
      }
    }

    const isClickable = onDayClick && !payload.isRestDay && new Date(payload.date) <= new Date()
    const cursorStyle = isClickable ? 'pointer' : 'default'

    return (
      <g 
        style={{ cursor: cursorStyle }}
        onClick={isClickable ? handleBarClick : undefined}
        className={isClickable ? 'hover:opacity-80 transition-opacity' : ''}
      >
        {/* Invisible clickable area for better UX */}
        {isClickable && (
          <rect 
            x={x} 
            y={y} 
            width={width} 
            height={height} 
            fill="transparent"
            style={{ cursor: 'pointer' }}
          />
        )}
        {/* Empty portion (top) */}
        {emptyHeight > 0 && <rect x={x} y={y} width={width} height={emptyHeight} fill="#e5e7eb" opacity={0.3} />}
        {/* Filled portion (bottom) */}
        {fillHeight > 0 && (
          <rect x={x} y={y + emptyHeight} width={width} height={fillHeight} fill={getBarColor(payload)} />
        )}
        {/* Border */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke={payload.isToday ? "#8b5cf6" : "#d1d5db"}
          strokeWidth={payload.isToday ? 2 : 1}
        />
      </g>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload
      
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{label}</p>
          <div className="space-y-1 mt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Progress:</span>
              <span className="font-medium text-foreground">
                {data.completed} / {data.target} squats
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Completion:</span>
              <span className="font-medium text-foreground">
                {data.isRestDay ? "Rest Day" : `${Math.round(data.percentage)}%`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className={`font-medium ${
                data.isRestDay ? "text-blue-500" :
                data.isCompleted ? "text-green-500" :
                data.isPartial ? "text-orange-500" : "text-gray-500"
              }`}>
                {data.isRestDay ? "Rest Day" :
                 data.isCompleted ? "Completed" :
                 data.isPartial ? "Partial" : "Not Started"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Date:</span>
              <span className="font-medium text-foreground">
                {new Date(data.date).toLocaleDateString()}
              </span>
            </div>
            {onDayClick && !data.isRestDay && new Date(data.date) <= new Date() && (
              <div className="text-xs text-primary pt-1 border-t border-border/50 mt-2">
                📝 Click to edit this day
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-4">
        <div className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            📊 23-Day Challenge Progress
          </CardTitle>
          
          {/* Stats Row */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-muted-foreground">
            <span className="font-medium">
              Total: {stats.totalCompleted.toLocaleString()} / {stats.totalTarget.toLocaleString()} squats
            </span>
            <span className="font-medium">Overall: {stats.overallPercentage}%</span>
            <span className="font-medium">Days completed: {stats.daysCompleted}/23</span>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 sm:gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-gray-300 rounded"></div>
              <span>Remaining</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Rest Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-purple-500 rounded"></div>
              <span>Today</span>
            </div>
            {onDayClick && (
              <div className="flex items-center gap-1.5 text-primary">
                <span>📝</span>
                <span>Click bars to edit</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Horizontally Scrollable Chart Container */}
        <div className="overflow-x-auto pb-4">
          <div className="h-80 md:h-96" style={{ minWidth: `${Math.max(chartData.length * 32, 800)}px` }}>
            <ResponsiveContainer width="100%" height="100%">
                              <BarChart 
                  data={chartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                  barCategoryGap="10%"
                >
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 11 }} 
                    interval={0} 
                    angle={-45} 
                    textAnchor="end" 
                    height={50}
                  />
                                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    width={50} 
                    domain={[0, yAxisMax]}
                    tickCount={Math.floor(yAxisMax / 50) + 1}
                    ticks={Array.from({ length: Math.floor(yAxisMax / 50) + 1 }, (_, i) => i * 50)}
                  />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} />
                <Bar dataKey="target" shape={<CustomBar />} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Mobile Scroll Hint */}
        <div className="text-xs text-muted-foreground text-center sm:hidden mt-2">
          ← Swipe to see all days →
        </div>
      </CardContent>
    </Card>
  )
}
