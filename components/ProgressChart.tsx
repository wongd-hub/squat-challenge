"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { CHALLENGE_CONFIG, getChallengeDay } from "@/lib/supabase"

interface ProgressChartProps {
  data: any[]
  dailyTargets: any[]
}

export function ProgressChart({ data, dailyTargets }: ProgressChartProps) {
  // Generate all challenge days with their data
  const generateChallengeDays = () => {
    const today = new Date().toISOString().split("T")[0]
    const currentDay = getChallengeDay(today)

    return Array.from({ length: CHALLENGE_CONFIG.TOTAL_DAYS }, (_, index) => {
      const day = index + 1
      const target =
        dailyTargets.find((t) => t.day === day)?.target_squats ||
        CHALLENGE_CONFIG.DAILY_TARGETS.find((t) => t.day === day)?.target_squats ||
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
  }

  const chartData = generateChallengeDays()

  // Calculate stats
  const totalTarget = CHALLENGE_CONFIG.DAILY_TARGETS.reduce((sum, day) => sum + day.target_squats, 0)
  const totalCompleted = chartData.reduce((sum, day) => sum + day.completed, 0)
  const daysCompleted = chartData.filter((day) => !day.isRestDay && day.completed >= day.target).length
  const overallPercentage = Math.round((totalCompleted / totalTarget) * 100)

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

    return (
      <g>
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

  return (
    <Card className="glass-strong">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">📊 23-Day Challenge Progress</CardTitle>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>
            Total: {totalCompleted.toLocaleString()} / {totalTarget.toLocaleString()} squats
          </span>
          <span>Overall: {overallPercentage}%</span>
          <span>Days completed: {daysCompleted}/23</span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>Partial</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>Remaining</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Rest Day</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border-2 border-purple-500 rounded"></div>
            <span>Today</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} />
              <Bar dataKey="target" shape={<CustomBar />} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
