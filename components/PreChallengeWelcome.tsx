"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Countdown } from "@/components/CountDown"
import { CHALLENGE_CONFIG, getDateFromChallengeDay } from "@/lib/supabase"
import { Calendar, Trophy, Heart, Info, Sparkles } from "lucide-react"
import ShinyText from "@/components/ShinyText"

interface PreChallengeWelcomeProps {
  onCountdownComplete?: () => void
}

export function PreChallengeWelcome({ onCountdownComplete }: PreChallengeWelcomeProps) {
  const challengeEndDate = getDateFromChallengeDay(CHALLENGE_CONFIG.TOTAL_DAYS)
  
  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
      {/* Extra spacer for header overlap */}
      <div className="h-20 md:h-16"></div>
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <div className="mb-6">
          <div className="text-6xl md:text-8xl mb-4">🏋️‍♂️</div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-4 leading-normal pb-2">
            Welcome to the Squat Challenge!
          </h1>
          <div className="text-base md:text-xl mb-6">
            <ShinyText 
              text="Get ready to build strength, track progress, and stand up for better" 
              disabled={false}
              className="" 
            />
          </div>
        </div>

        {/* Challenge Info Badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Badge variant="outline" className="text-sm glass-subtle px-4 py-2">
            <Trophy className="w-4 h-4 mr-2" />
            {CHALLENGE_CONFIG.TOTAL_DAYS} Days
          </Badge>
          <Badge variant="outline" className="text-sm glass-subtle px-4 py-2">
            <Calendar className="w-4 h-4 mr-2" />
            {CHALLENGE_CONFIG.START_DATE} - {challengeEndDate}
          </Badge>
          <Badge variant="outline" className="text-sm glass-subtle px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            3,214 Total Squats
          </Badge>
        </div>
      </div>

      {/* Countdown Section */}
      <Card className="mb-8 md:mb-12 glass-strong bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200/30 dark:border-blue-800/30">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-xl md:text-2xl">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Challenge Starts In
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-8">
          <Countdown 
            targetDate={CHALLENGE_CONFIG.START_DATE} 
            onComplete={onCountdownComplete}
          />
        </CardContent>
      </Card>

      {/* About the Challenge */}
      <Card className="mb-8 glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            About the Challenge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-3">
            <p>
              <strong className="text-foreground">🏋️ The Challenge:</strong> This {CHALLENGE_CONFIG.TOTAL_DAYS}-day squat challenge mimics the progressive targets of the renowned Pushup Challenge, adapted for building lower body strength and endurance.
            </p>
            <p>
              <strong className="text-foreground">🎯 How It Works:</strong> Use our intuitive squat dial to count your daily squats (drag clockwise to add, counter-clockwise to subtract), then bank your progress to track your journey.
            </p>
            <p>
              <strong className="text-foreground">📈 Track Your Progress:</strong> View detailed charts, edit previous days if needed, and see how you compare with others on the live leaderboard.
            </p>
            <p>
              <strong className="text-foreground">📅 Challenge Structure:</strong> Progressive daily targets from 50-150 squats with strategic rest days for recovery. Some days are rest days (0 squats) to help you recover and stay strong.
            </p>
          </div>
          
          <div className="border-t border-border pt-4 space-y-2">
            <p>
              <strong className="text-foreground">🔐 Easy Access:</strong> No passwords needed! Just enter your email for a 6-digit access code to sync across devices and compete with others.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Supporting Causes */}
      <Card className="mb-8 glass-strong border-pink-200/30 dark:border-pink-800/30 bg-gradient-to-br from-pink-50/30 to-purple-50/30 dark:from-pink-950/10 dark:to-purple-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            Supporting Important Causes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">💙 Making a Difference:</strong> While this challenge isn't tied to a specific charity, we encourage participants to consider supporting these impactful organizations:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="font-semibold text-foreground">🩸 Blood Cancer Research:</p>
              <ul className="space-y-1 text-xs ml-4">
                <li>• <strong><a href="https://lymphoma.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors cursor-pointer">Lymphoma Research Foundation</a></strong></li>
                <li>• <strong><a href="https://lls.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors cursor-pointer">Leukemia & Lymphoma Society</a></strong></li>
                <li>• <strong><a href="https://www.theflf.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors cursor-pointer">Follicular Lymphoma Foundation</a></strong></li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">🧠 Parkinson's Research:</p>
              <ul className="space-y-1 text-xs ml-4">
                <li>• <strong><a href="https://michaeljfox.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors cursor-pointer">Michael J. Fox Foundation</a></strong></li>
                <li>• <strong><a href="https://parkinson.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors cursor-pointer">Parkinson's Foundation</a></strong></li>
                <li>• <strong><a href="https://researchparkinsons.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors cursor-pointer">Parkinson's & Brain Research Foundation</a></strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Get Ready Message */}
      <Card className="glass-strong bg-gradient-to-br from-green-50/50 to-blue-50/50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200/30 dark:border-green-800/30">
        <CardContent className="p-6 md:p-8 text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="text-lg md:text-xl font-semibold text-green-700 dark:text-green-400 mb-3">
            Get Ready to Transform Your Strength!
          </h3>
          <p className="text-sm md:text-base text-muted-foreground mb-4">
            Use this time to prepare yourself mentally and physically. When the challenge begins, you'll have access to the squat dial, progress tracking, leaderboards, and all the tools you need to succeed.
          </p>
          <p className="text-xs text-muted-foreground">
            Bookmark this page and sign in when you're ready to start tracking your progress!
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 