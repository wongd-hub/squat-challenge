"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FOLLOWON_PROGRAMS, getFollowOnStartDate } from "@/lib/supabase"
import { Trophy, Target, TrendingUp, Calendar, Check, Zap } from "lucide-react"

interface PostChallengeOptionsProps {
  onProgramSelect: (program: keyof typeof FOLLOWON_PROGRAMS) => void
  selectedProgram?: keyof typeof FOLLOWON_PROGRAMS | null
  isLoading?: boolean
}

export function PostChallengeOptions({ 
  onProgramSelect, 
  selectedProgram, 
  isLoading = false 
}: PostChallengeOptionsProps) {
  const [hoveredProgram, setHoveredProgram] = useState<keyof typeof FOLLOWON_PROGRAMS | null>(null)
  const followOnStartDate = getFollowOnStartDate()

  const handleProgramSelect = (program: keyof typeof FOLLOWON_PROGRAMS) => {
    onProgramSelect(program)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="text-4xl mb-2">🚀</div>
        <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
          Continue Your Journey
        </h3>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Don't lose the strength you've built! Choose a follow-on program to keep progressing.
        </p>
        <Badge variant="outline" className="glass-subtle">
          <Calendar className="w-3 h-3 mr-1" />
          Starts {followOnStartDate}
        </Badge>
      </div>

      {/* Program Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Retain Strength Program */}
        <Card 
          className={`glass-strong transition-all duration-300 cursor-pointer ${
            selectedProgram === 'RETAIN' 
              ? 'ring-2 ring-blue-500 border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20' 
              : hoveredProgram === 'RETAIN' 
                ? 'border-blue-300/50 transform scale-105' 
                : 'hover:border-blue-200/30'
          }`}
          onMouseEnter={() => setHoveredProgram('RETAIN')}
          onMouseLeave={() => setHoveredProgram(null)}
          onClick={() => handleProgramSelect('RETAIN')}
        >
          <CardHeader className="text-center pb-3">
            <div className="text-3xl mb-2">{FOLLOWON_PROGRAMS.RETAIN.emoji}</div>
            <CardTitle className="flex items-center justify-center gap-2">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {FOLLOWON_PROGRAMS.RETAIN.name}
              {selectedProgram === 'RETAIN' && (
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {FOLLOWON_PROGRAMS.RETAIN.description}
            </p>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="glass-subtle p-3 rounded-lg text-center">
                  <div className="font-semibold text-blue-600 dark:text-blue-400">Duration</div>
                  <div className="text-xs text-muted-foreground">{FOLLOWON_PROGRAMS.RETAIN.duration} days</div>
                </div>
                                 <div className="glass-subtle p-3 rounded-lg text-center">
                   <div className="font-semibold text-blue-600 dark:text-blue-400">Target Range</div>
                   <div className="text-xs text-muted-foreground">80-160 squats</div>
                 </div>
              </div>
              
              <div className="glass-subtle p-3 rounded-lg">
                <div className="text-xs font-medium mb-2 text-center">Perfect if you want to:</div>
                                 <ul className="text-xs text-muted-foreground space-y-1">
                   <li className="flex items-center gap-2">
                     <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                     Science-based maintenance volume
                   </li>
                   <li className="flex items-center gap-2">
                     <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                     Retain strength with less volume
                   </li>
                   <li className="flex items-center gap-2">
                     <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                     Sustainable long-term approach
                   </li>
                 </ul>
              </div>
            </div>

            <Button 
              variant={selectedProgram === 'RETAIN' ? "default" : "outline"}
              size="sm" 
              className="w-full"
              disabled={isLoading}
            >
              {selectedProgram === 'RETAIN' ? 'Selected' : 'Choose This Program'}
            </Button>
          </CardContent>
        </Card>

        {/* Ramp Up Program */}
        <Card 
          className={`glass-strong transition-all duration-300 cursor-pointer ${
            selectedProgram === 'RAMPUP' 
              ? 'ring-2 ring-purple-500 border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20' 
              : hoveredProgram === 'RAMPUP' 
                ? 'border-purple-300/50 transform scale-105' 
                : 'hover:border-purple-200/30'
          }`}
          onMouseEnter={() => setHoveredProgram('RAMPUP')}
          onMouseLeave={() => setHoveredProgram(null)}
          onClick={() => handleProgramSelect('RAMPUP')}
        >
          <CardHeader className="text-center pb-3">
            <div className="text-3xl mb-2">{FOLLOWON_PROGRAMS.RAMPUP.emoji}</div>
            <CardTitle className="flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              {FOLLOWON_PROGRAMS.RAMPUP.name}
              {selectedProgram === 'RAMPUP' && (
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {FOLLOWON_PROGRAMS.RAMPUP.description}
            </p>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="glass-subtle p-3 rounded-lg text-center">
                  <div className="font-semibold text-purple-600 dark:text-purple-400">Duration</div>
                  <div className="text-xs text-muted-foreground">{FOLLOWON_PROGRAMS.RAMPUP.duration} days</div>
                </div>
                <div className="glass-subtle p-3 rounded-lg text-center">
                  <div className="font-semibold text-purple-600 dark:text-purple-400">Target Range</div>
                  <div className="text-xs text-muted-foreground">235-290 squats</div>
                </div>
              </div>
              
              <div className="glass-subtle p-3 rounded-lg">
                <div className="text-xs font-medium mb-2 text-center">Perfect if you want to:</div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                    Continue building strength
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                    Push beyond your current limits
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                    Take on a bigger challenge
                  </li>
                </ul>
              </div>
            </div>

            <Button 
              variant={selectedProgram === 'RAMPUP' ? "default" : "outline"}
              size="sm" 
              className="w-full"
              disabled={isLoading}
            >
              {selectedProgram === 'RAMPUP' ? 'Selected' : 'Choose This Program'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Continue Later Option */}
      <div className="text-center pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-3">
          Not ready to decide? You can always choose a program later.
        </p>
        <Button 
          variant="ghost" 
          size="sm" 
          className="glass-subtle text-xs"
          onClick={() => onProgramSelect('NONE' as any)}
          disabled={isLoading}
        >
          I'll Decide Later
        </Button>
      </div>
    </div>
  )
} 