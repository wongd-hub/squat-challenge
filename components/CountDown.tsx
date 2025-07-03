"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface CountdownProps {
  targetDate: string // YYYY-MM-DD format
  onComplete?: () => void
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function Countdown({ targetDate, onComplete }: CountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date()
      const target = new Date(targetDate + 'T00:00:00') // Start of day in local timezone
      const difference = target.getTime() - now.getTime()

      if (difference <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        onComplete?.()
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeRemaining({ days, hours, minutes, seconds })
    }

    // Calculate immediately
    calculateTimeRemaining()

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [targetDate, onComplete])

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="text-center flex-1 min-w-0 max-w-[22%] xs:max-w-none">
      <div className="text-xl xs:text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-none mb-1 sm:mb-2 pb-1">
        {value.toString().padStart(2, '0')}
      </div>
      <div className="text-[9px] xs:text-[10px] sm:text-sm md:text-base text-muted-foreground font-medium uppercase tracking-tight xs:tracking-wide">
        {label}
      </div>
    </div>
  )

  return (
    <Card className="glass-strong bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-900/80 dark:to-gray-800/60 border-white/30 dark:border-gray-700/30 shadow-2xl max-w-4xl mx-auto rounded-3xl">
      <CardContent className="p-4 xs:p-6 sm:p-8 md:p-12">
        <div className="flex items-center justify-between xs:justify-center xs:gap-2 sm:gap-4 md:gap-8 lg:gap-12 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          <TimeUnit value={timeRemaining.days} label="Days" />
          
          {/* Separator - Hidden on very small mobile */}
          <div className="text-lg xs:text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-none opacity-60 flex-shrink-0 hidden xs:block">
            :
          </div>
          
          <TimeUnit value={timeRemaining.hours} label="Hours" />
          
          {/* Separator - Hidden on very small mobile */}
          <div className="text-lg xs:text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-none opacity-60 flex-shrink-0 hidden xs:block">
            :
          </div>
          
          <TimeUnit value={timeRemaining.minutes} label="Minutes" />
          
          {/* Separator - Hidden on very small mobile */}
          <div className="text-lg xs:text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-none opacity-60 flex-shrink-0 hidden xs:block">
            :
          </div>
          
          <TimeUnit value={timeRemaining.seconds} label="Seconds" />
        </div>
        
        {/* Additional info below */}
        <div className="mt-4 sm:mt-6 text-center">
          <div className="text-[11px] xs:text-xs sm:text-sm text-muted-foreground/80 font-medium px-2">
            Challenge begins on {new Date(targetDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 