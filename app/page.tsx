"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { SquatDial } from "@/components/SquatDial"
import { DailyTarget } from "@/components/DailyTarget"
import { ProgressChart } from "@/components/ProgressChart"
import { StatsOverview } from "@/components/StatsOverview"
import { LeaderboardPreview } from "@/components/LeaderboardPreview"
import AuthModal from "@/components/AuthModal"
import { ThemeToggle } from "@/components/theme-toggle"
import ShinyText from "@/components/ShinyText"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  storage,
  database,
  auth,
  supabase,
  isSupabaseConfigured,
  getChallengeDay,
  getDateFromChallengeDay,
  getLocalDateString,
  CHALLENGE_CONFIG,
  FOLLOWON_PROGRAMS,
  isChallengeComplete,
  isBeforeChallengeStart,
  checkUserExists,
  updateUserProfile,
  getFollowOnDay,
  getFollowOnTarget,
  getFollowOnStartDate,
  isInFollowOnProgram,
  isUserInFollowOnProgram,
  isFollowOnComplete,
} from "@/lib/supabase"
import { getNewMilestones, getRandomEncouragementMessage } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Info, Users, LogOut, User, Trophy, Bug } from "lucide-react"
import FooterFloat from "@/components/FooterFloat"
import ScrollLottie from "@/components/ScrollLottie"
import { EditDayModal } from "@/components/EditDayModal"
import { PreChallengeWelcome } from "@/components/PreChallengeWelcome"
import { PostChallengeOptions } from "@/components/PostChallengeOptions"
import BugReportModal from "@/components/BugReportModal"
import ConfettiExplosion from "react-confetti-explosion"

export default function Home() {
  const [todaySquats, setTodaySquats] = useState(0)
  const [progressData, setProgressData] = useState<any[]>([])
  const [challengeProgressData, setChallengeProgressData] = useState<any[]>([]) // Store challenge-only progress data
  const [currentDay, setCurrentDay] = useState(1)
  const [showInfo, setShowInfo] = useState(false)
  const [dailyTargets, setDailyTargets] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dataSource, setDataSource] = useState<"supabase" | "local">("local")
  const [challengeComplete, setChallengeComplete] = useState(false)
  const [isBeforeChallengeStartState, setIsBeforeChallengeStartState] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [leaderboardRefreshTrigger, setLeaderboardRefreshTrigger] = useState(0)

  // Ref for leaderboard section
  const leaderboardRef = useRef<HTMLDivElement>(null)

  // User profile for local mode
  const [localUserProfile, setLocalUserProfile] = useState<{ display_name: string } | null>(null)

  // Track if local mode button should be shown (after 5 seconds)
  const [showLocalModeButton, setShowLocalModeButton] = useState(false)

  // Track if we've already prompted for name in this session to prevent repeated prompts
  const [hasPromptedForName, setHasPromptedForName] = useState(false)

  // Track if data is currently being reloaded to prevent concurrent reloads
  const [isReloadingData, setIsReloadingData] = useState(false)

  // Feature flag to disable offline mode for debugging 
  // Set to false to re-enable offline mode with local storage fallbacks
  const DISABLE_OFFLINE_MODE = true

  // Memoize Supabase configuration to prevent frequent checks
  const isSupabaseSetup = useMemo(() => isSupabaseConfigured(), [])

  // Track current date and update automatically
  const [currentDate, setCurrentDate] = useState(() => getLocalDateString())

  // Edit day modal state
  const [editDayModalOpen, setEditDayModalOpen] = useState(false)
  const [selectedEditDate, setSelectedEditDate] = useState<string | null>(null)
  const [selectedEditSquats, setSelectedEditSquats] = useState(0)
  const [modalOpenedFromChart, setModalOpenedFromChart] = useState(false)
  const [bugReportModalOpen, setBugReportModalOpen] = useState(false)

  // Follow-on program state
  const [selectedFollowOnProgram, setSelectedFollowOnProgram] = useState<keyof typeof FOLLOWON_PROGRAMS | null>(null)
  const [showPostChallengeOptions, setShowPostChallengeOptions] = useState(false)
  const [isInFollowOn, setIsInFollowOn] = useState(false)
  const [followOnDay, setFollowOnDay] = useState(1)
  const [followOnTarget, setFollowOnTarget] = useState(0)
  const [followOnProgressData, setFollowOnProgressData] = useState<any[]>([])

  // Toast hook for encouragement messages
  const { toast } = useToast()

  // Track achieved milestones for today to avoid duplicate messages
  const [todayMilestones, setTodayMilestones] = useState<Set<50 | 75 | 100>>(new Set())

  // Track if confetti should be shown for 100% completion (resets on page refresh)
  const [showConfetti, setShowConfetti] = useState(false)

  // Load local user profile on startup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedProfile = localStorage.getItem("local_user_profile")
      if (savedProfile) {
        setLocalUserProfile(JSON.parse(savedProfile))
      }
    }
  }, [])

  // Save local user profile
  const saveLocalProfile = (profile: { display_name: string }) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("local_user_profile", JSON.stringify(profile))
      setLocalUserProfile(profile)
    }
  }

  // Save follow-on program selection
  const saveFollowOnProgramSelection = (program: keyof typeof FOLLOWON_PROGRAMS | null) => {
    if (typeof window !== "undefined") {
      if (program) {
        localStorage.setItem("followon_program", program)
      } else {
        localStorage.removeItem("followon_program")
      }
      setSelectedFollowOnProgram(program)
    }
  }

  // Load follow-on program selection
  const loadFollowOnProgramSelection = (): keyof typeof FOLLOWON_PROGRAMS | null => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("followon_program")
      return saved as keyof typeof FOLLOWON_PROGRAMS | null
    }
    return null
  }

  // Load user's active follow-on program from database
  const loadUserActiveFollowOnProgram = async () => {
    if (dataSource === "supabase" && user) {
      try {
        const { data } = await database.getUserActiveFollowOnProgram(user.id)
        if (data) {
          setSelectedFollowOnProgram(data.program_id as keyof typeof FOLLOWON_PROGRAMS)
          setIsInFollowOn(true)
          
          // Calculate follow-on day and target
          const followOnDayNum = getFollowOnDay(currentDate, data.program_id as keyof typeof FOLLOWON_PROGRAMS)
          const target = getFollowOnTarget(currentDate, data.program_id as keyof typeof FOLLOWON_PROGRAMS)
          setFollowOnDay(followOnDayNum)
          setFollowOnTarget(target)
        } else {
          setSelectedFollowOnProgram(null)
          setIsInFollowOn(false)
        }
      } catch (error) {
        console.error("❌ Error loading user active follow-on program:", error)
      }
    } else {
      // For local mode, check localStorage
      const localSelection = loadFollowOnProgramSelection()
      if (localSelection && challengeComplete) {
        setSelectedFollowOnProgram(localSelection)
        setIsInFollowOn(true)
        
        // Calculate follow-on day and target
        const followOnDayNum = getFollowOnDay(currentDate, localSelection)
        const target = getFollowOnTarget(currentDate, localSelection)
        setFollowOnDay(followOnDayNum)
        setFollowOnTarget(target)
      }
    }
  }

  // Get effective user profile (online or local)
  const effectiveUserProfile = useMemo(() => {
    if (dataSource === "supabase" && userProfile) {
      return userProfile
    }
    return localUserProfile
  }, [dataSource, userProfile, localUserProfile])

  // Handle scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 100
      setIsScrolled(scrolled)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Refresh data when user returns to tab (fixes cross-device sync issues)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Always check for date changes when tab becomes visible
        const newDate = getLocalDateString()
        if (newDate !== currentDate) {
          setCurrentDate(newDate)
        }
        
        // Also refresh data for Supabase users and check challenge status
        if (dataSource === "supabase" && user) {
          loadData()
        }
        
        // Check if challenge status changed (start/end dates)
        const isBeforeStart = isBeforeChallengeStart()
        let isComplete = isChallengeComplete()
        
        // TESTING OVERRIDE: Force challenge complete for testing follow-on programs
        const FORCE_CHALLENGE_COMPLETE_FOR_TESTING = true
        if (FORCE_CHALLENGE_COMPLETE_FOR_TESTING) {
          isComplete = true
        }
        
        setIsBeforeChallengeStartState(isBeforeStart && !FORCE_CHALLENGE_COMPLETE_FOR_TESTING)
        setChallengeComplete(isComplete)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [dataSource, user, currentDate])

  // Safety timeout to ensure loading state is always cleared
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn("⚠️ Safety timeout triggered - forcing loading to false")
        setIsLoading(false)
        if (dataSource !== "local" && dataSource !== "supabase") {
          if (DISABLE_OFFLINE_MODE) {
            setDataSource("supabase") // Default to supabase mode when offline disabled
          } else {
            setDataSource("local")
          }
        }
      }
    }, 15000) // 15 second safety timeout

    return () => clearTimeout(safetyTimeout)
  }, []) // Run only once on mount

  // Setup auth subscription
  useEffect(() => {
    
    // Set timeout for auth operations to prevent hanging
    const authTimeout = setTimeout(() => {
      if (!DISABLE_OFFLINE_MODE) {
        setDataSource("local")
      }
      setIsLoading(false)
    }, 8000) // 8 second timeout

    const checkAuth = async () => {
      if (!isSupabaseConfigured()) {
        if (!DISABLE_OFFLINE_MODE) {
          setDataSource("local")
        } else {
          // If offline mode is disabled and Supabase isn't configured, keep in Supabase mode
          setDataSource("supabase")
        }
        setIsLoading(false)
        clearTimeout(authTimeout)
        return
      }
      
      // Check for manual override
      if (!DISABLE_OFFLINE_MODE) {
        const forceLocalMode = localStorage.getItem('force_local_mode') === 'true'
        if (forceLocalMode) {
          setDataSource("local")
          setIsLoading(false)
          clearTimeout(authTimeout)
          return
        }
      }

      try {
        if (!auth) {
          if (!DISABLE_OFFLINE_MODE) {
            setDataSource("local")
          } else {
            setDataSource("supabase") // Stay in Supabase mode even without auth
          }
          setIsLoading(false)
          clearTimeout(authTimeout)
          return
        }

        // Check for existing session
        const { data: { session }, error } = await auth.getSession()
        
        if (error) {
          console.error("❌ Session check error:", error)
          if (!DISABLE_OFFLINE_MODE) {
            setDataSource("local")
          } else {
            setDataSource("supabase")
          }
          setIsLoading(false)
          clearTimeout(authTimeout)
          return
        }

        if (session?.user) {
          setUser(session.user)
          setDataSource("supabase")
          
          // Check if user exists in profiles table and create if needed
          if (session.user.email) {
            try {
              const userCheckResult = await checkUserExists(session.user.email)
              
              if (!userCheckResult.exists) {
                const displayName = session.user.user_metadata?.display_name || 
                                   session.user.email?.split('@')[0] || 
                                   'User'
                
                try {
                  await updateUserProfile(session.user.id, {
                    display_name: displayName,
                    email: session.user.email
                  })
                  setUserProfile({ display_name: displayName })
                } catch (profileError) {
                  console.error("❌ Error creating profile:", profileError)
                  setUserProfile({ display_name: displayName })
                }
              } else if (userCheckResult.profile) {
                // Set existing profile
                setUserProfile({ display_name: userCheckResult.profile.display_name })
              }
            } catch (userCheckError) {
              console.error("❌ Error checking user:", userCheckError)
            }
          }
        } else {
          if (DISABLE_OFFLINE_MODE) {
            setDataSource("supabase") // Stay in supabase mode but show sign-in prompt
          } else {
            setDataSource("local")
          }
        }
      } catch (error) {
        console.error("❌ Auth check error:", error)
        if (!DISABLE_OFFLINE_MODE) {
          setDataSource("local")
        } else {
          setDataSource("supabase")
        }
      }
      
      setIsLoading(false)
      clearTimeout(authTimeout)
    }

    checkAuth()

    // Listen for auth changes
    if (!auth) {
      return
    }
    
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        setDataSource("supabase")
        
        // Check if user exists in profiles table and create if needed with timeout protection
        if (session.user.email) {
          try {
            const userCheckPromise = checkUserExists(session.user.email)
            const userCheckTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Auth state checkUserExists timeout')), 3000)
            )
            
            const userCheckResult = await Promise.race([
              userCheckPromise,
              userCheckTimeout
            ]) as any
            
            if (!userCheckResult.exists) {
              const displayName = session.user.user_metadata?.display_name || 
                                 session.user.email?.split('@')[0] || 
                                 'User'
              
              try {
                const profilePromise = updateUserProfile(session.user.id, {
                  display_name: displayName,
                  email: session.user.email
                })
                const profileTimeout = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Auth state updateUserProfile timeout')), 3000)
                )
                
                await Promise.race([profilePromise, profileTimeout])
                setUserProfile({ display_name: displayName })
              } catch (profileError) {
                console.warn("⚠️ Auth state profile creation failed/timeout:", profileError)
                setUserProfile({ display_name: displayName })
              }
            } else if (userCheckResult.profile) {
              // Set existing profile
              setUserProfile({ display_name: userCheckResult.profile.display_name })
            }
          } catch (userCheckError) {
            console.warn("⚠️ Auth state user check failed/timeout:", userCheckError)
          }
        }
              } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
          if (DISABLE_OFFLINE_MODE) {
            setDataSource("supabase") // Stay in supabase mode but without user
          } else {
            setDataSource("local")
            setHasPromptedForName(false) // Reset name prompt flag when signing out
          }
        }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check if challenge is complete or before start
  useEffect(() => {
    const checkChallengeStatus = () => {
      let isComplete = isChallengeComplete()
      const isBeforeStart = isBeforeChallengeStart()
      
      // TESTING OVERRIDE: Force challenge complete for testing follow-on programs
      // Remove this when challenge dates are correct
      const FORCE_CHALLENGE_COMPLETE_FOR_TESTING = true
      if (FORCE_CHALLENGE_COMPLETE_FOR_TESTING) {
        isComplete = true
      }
      
      setChallengeComplete(isComplete)
      setIsBeforeChallengeStartState(isBeforeStart && !FORCE_CHALLENGE_COMPLETE_FOR_TESTING)
      
      // Show post-challenge options if challenge just completed and no program selected yet
      if (isComplete && !selectedFollowOnProgram && !showPostChallengeOptions) {
        setShowPostChallengeOptions(true)
      }
    }

    checkChallengeStatus()
  }, [selectedFollowOnProgram]) // Removed showPostChallengeOptions from dependencies

  // Load follow-on program data when user/challenge state changes
  useEffect(() => {
    if (challengeComplete) {
      loadUserActiveFollowOnProgram()
    }
  }, [dataSource, user, challengeComplete, currentDate])

  // Update follow-on program state when date changes
  useEffect(() => {
    if (selectedFollowOnProgram && challengeComplete) {
      const shouldBeInFollowOn = isInFollowOnProgram(currentDate)
      if (shouldBeInFollowOn && !isInFollowOn) {
        setIsInFollowOn(true)
        
        // Calculate follow-on day and target
        const followOnDayNum = getFollowOnDay(currentDate, selectedFollowOnProgram)
        const target = getFollowOnTarget(currentDate, selectedFollowOnProgram)
        setFollowOnDay(followOnDayNum)
        setFollowOnTarget(target)
        
        // Auto-start program if not started yet and user is authenticated
        if (dataSource === "supabase" && user) {
          database.startFollowOnProgram(user.id, selectedFollowOnProgram).catch(console.error)
        }
      } else if (!shouldBeInFollowOn && isInFollowOn) {
        setIsInFollowOn(false)
        setFollowOnDay(1)
        setFollowOnTarget(0)
      } else if (shouldBeInFollowOn && isInFollowOn) {
        // Update day and target for current follow-on program
        const followOnDayNum = getFollowOnDay(currentDate, selectedFollowOnProgram)
        const target = getFollowOnTarget(currentDate, selectedFollowOnProgram)
        setFollowOnDay(followOnDayNum)
        setFollowOnTarget(target)
      }
    }
  }, [currentDate, selectedFollowOnProgram, challengeComplete, isInFollowOn, dataSource, user])

  // Load daily targets from database or fallback
  const loadDailyTargets = async () => {
    try {

      
      const { data, error } = await database.getDailyTargets()
      if (data && !error) {
        setDailyTargets(data)
        return data // Return the fresh data for immediate use
      } else {
        console.error("❌ Error loading daily targets:", error)
        return []
      }
    } catch (error) {
      console.error("❌ Error loading daily targets:", error)
      return []
    }
  }

  // Load all data - Note: avoid including this in other useEffect dependency arrays to prevent infinite loops
  const loadData = useCallback(async () => {
    const freshDailyTargets = await loadDailyTargets()

    if (dataSource === "supabase" && user) {
      // Load from Supabase
      try {
        // Load both datasets in parallel for better consistency
        const [recentResult, challengeResult] = await Promise.all([
          database.getUserProgress(user.id, 7),
          database.getChallengeProgress(user.id)
        ])

        let todaySquatsFromData = 0

        // Process challenge progress first (more authoritative for today's data)
        if (challengeResult.data) {
          const challengeProgressWithTargets = challengeResult.data.map((progress) => {
            const progressDay = getChallengeDay(progress.date)
            const target = freshDailyTargets.find((t) => t.day === progressDay)?.target_squats ?? 50
            return {
              ...progress,
              target_squats: target,
            }
          })

          setChallengeProgressData(challengeProgressWithTargets)

          // Get today's progress from the authoritative challenge data
          const todayProgress = challengeProgressWithTargets.find((p) => p.date === currentDate)
          todaySquatsFromData = todayProgress?.squats_completed || 0
        }

        // Process recent progress for chart display
        if (recentResult.data) {
          const progressWithTargets = recentResult.data.map((progress) => {
            const progressDay = getChallengeDay(progress.date)
            const target = freshDailyTargets.find((t) => t.day === progressDay)?.target_squats ?? 50
            return {
              ...progress,
              target_squats: target,
            }
          })

          setProgressData(progressWithTargets)
        }

        // Set today's squats from the most authoritative source
        setTodaySquats(todaySquatsFromData)
        
        // Load follow-on progress data if in follow-on mode
        if (isInFollowOn && selectedFollowOnProgram) {
          try {
            const followOnStartDate = getFollowOnStartDate()
            const programData = FOLLOWON_PROGRAMS[selectedFollowOnProgram]
            const followOnEndDate = new Date(followOnStartDate)
            followOnEndDate.setDate(followOnEndDate.getDate() + programData.duration - 1)
            
            const followOnEndStr = followOnEndDate.toISOString().split('T')[0]
            
            const { data: followOnData } = await database.getUserProgress(user.id, 50) // Get more data to cover follow-on period
            
            if (followOnData) {
              const followOnFiltered = followOnData.filter(p => p.date >= followOnStartDate && p.date <= followOnEndStr)
              setFollowOnProgressData(followOnFiltered)
            }
          } catch (error) {
            console.error("❌ Error loading follow-on progress:", error)
          }
        }
      } catch (error) {
        console.error("❌ Error loading Supabase data:", error)
        if (DISABLE_OFFLINE_MODE) {
          console.error("❌ Supabase data load failed and offline mode disabled")
          // Don't fallback to local storage when offline mode is disabled
          setTodaySquats(0)
          setProgressData([])
          setChallengeProgressData([])
        } else {
          // Fallback to local storage
          loadLocalData(freshDailyTargets)
        }
      }
    } else {
      // Load from local storage
      loadLocalData(freshDailyTargets)
    }
  }, [dataSource, user, currentDate, currentDay])

  const loadLocalData = (freshDailyTargets: any[]) => {
    const today = storage.getTodayProgress()
    setTodaySquats(today)

    const savedProgress = storage.getUserProgress()
    if (savedProgress.length === 0) {
      // Generate sample data for demo with higher values to show count-up effect
      const sampleData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        
        const challengeDay = getChallengeDay(dateStr)
        const target = freshDailyTargets.find((t) => t.day === challengeDay)?.target_squats ?? 50

        return {
          date: dateStr,
          squats_completed: Math.floor(Math.random() * 150) + 50, // Higher values: 50-200
          target_squats: target,
        }
      })
      setProgressData(sampleData)
      setChallengeProgressData(sampleData) // For local storage, use same data
    } else {
      // Add target_squats to saved progress
      const progressWithTargets = savedProgress.map((progress) => {
        const progressDay = getChallengeDay(progress.date)
        const target = freshDailyTargets.find((t) => t.day === progressDay)?.target_squats ?? 50
        return {
          ...progress,
          target_squats: target,
        }
      })

      setProgressData(progressWithTargets.slice(-7)) // Last 7 days for chart

      // Get challenge progress from local storage
      const challengeProgress = storage.getChallengeProgress()
      const challengeProgressWithTargets = challengeProgress.map((progress) => {
        const progressDay = getChallengeDay(progress.date)
        const target = freshDailyTargets.find((t) => t.day === progressDay)?.target_squats ?? 50
        return {
          ...progress,
          target_squats: target,
        }
      })
      setChallengeProgressData(challengeProgressWithTargets)
      
      // Load follow-on progress data if in follow-on mode (local storage)
      if (isInFollowOn && selectedFollowOnProgram) {
        const followOnStartDate = getFollowOnStartDate()
        const programData = FOLLOWON_PROGRAMS[selectedFollowOnProgram]
        const followOnEndDate = new Date(followOnStartDate)
        followOnEndDate.setDate(followOnEndDate.getDate() + programData.duration - 1)
        
        const followOnEndStr = followOnEndDate.toISOString().split('T')[0]
        
        const followOnFiltered = progressWithTargets.filter(p => p.date >= followOnStartDate && p.date <= followOnEndStr)
        setFollowOnProgressData(followOnFiltered)
      }
    }
  }

  // Get today's target (follow-on program takes precedence)
  const todayTarget = useMemo(() => {
    if (isInFollowOn && selectedFollowOnProgram) {
      return followOnTarget
    }
    return dailyTargets.find((t) => t.day === currentDay)?.target_squats ?? 50
  }, [isInFollowOn, selectedFollowOnProgram, followOnTarget, dailyTargets, currentDay])

  // Handle follow-on program selection
  const handleFollowOnProgramSelect = async (program: keyof typeof FOLLOWON_PROGRAMS) => {
    if (program === 'NONE' as any) {
      // User chose to decide later
      setShowPostChallengeOptions(false)
      return
    }

    try {
      if (dataSource === "supabase" && user) {
        // Save to database
        await database.selectFollowOnProgram(user.id, program)
        
        // Start the program immediately if we're past the follow-on start date
        if (isInFollowOnProgram(currentDate)) {
          await database.startFollowOnProgram(user.id, program)
        }
      } else {
        // Save to localStorage for local mode
        saveFollowOnProgramSelection(program)
      }

      // Update local state
      setSelectedFollowOnProgram(program)
      setShowPostChallengeOptions(false)
      
      // If we're in the follow-on period, activate follow-on mode
      if (challengeComplete && isInFollowOnProgram(currentDate)) {
        setIsInFollowOn(true)
        
        // Calculate follow-on day and target
        const followOnDayNum = getFollowOnDay(currentDate, program)
        const target = getFollowOnTarget(currentDate, program)
        setFollowOnDay(followOnDayNum)
        setFollowOnTarget(target)
      }

      toast({
        title: "Program Selected! 🎯",
        description: `You've selected the ${FOLLOWON_PROGRAMS[program].name} program. ${challengeComplete && isInFollowOnProgram(currentDate) ? 'You can start today!' : `It will start on ${getFollowOnStartDate()}.`}`,
        duration: 5000,
      })
    } catch (error) {
      console.error("❌ Error selecting follow-on program:", error)
      toast({
        title: "Error",
        description: "Failed to save your program selection. Please try again.",
        duration: 5000,
      })
    }
  }
  


  // Stable user ID to prevent frequent reloads when user object changes
  const userId = useMemo(() => user?.id, [user?.id])

  // Throttled data loading to prevent excessive calls
  const lastLoadDataRef = useRef({ dataSource: "", userId: "", timestamp: 0 })
  
  useEffect(() => {
    const now = Date.now()
    const lastLoad = lastLoadDataRef.current
    
    // Only load if not currently loading and enough time has passed (minimum 1 second between loads)
    if (!isLoading && 
        (lastLoad.dataSource !== dataSource || lastLoad.userId !== userId || now - lastLoad.timestamp > 1000)) {
      
      lastLoadDataRef.current = { dataSource, userId: userId || "", timestamp: now }
      loadData()
    }
  }, [isLoading, dataSource, userId])

  // Setup real-time subscription for current user's progress
  useEffect(() => {
    if (!isSupabaseConfigured() || dataSource !== "supabase" || !user || !supabase) {
      return // No real-time subscription needed for local mode or when not signed in
    }

    // Subscribe to changes in user_progress table for current user only
    const userSubscription = supabase
      .channel('user_progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${user.id}` // Only listen to changes for current user
        },
        (payload: any) => {
          // Reload data when current user's progress changes
          loadData()
        }
      )
      .subscribe()

    return () => {
      userSubscription.unsubscribe()
    }
  }, [user, dataSource, loadData])

  // Setup real-time subscription for leaderboard updates (all users)
  useEffect(() => {
    if (!isSupabaseConfigured() || dataSource !== "supabase" || !supabase) {
      return // No subscription needed for local mode
    }

    // Subscribe to ALL user_progress changes for leaderboard updates
    const leaderboardSubscription = supabase
      .channel('leaderboard_updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_progress'
          // No filter - listen to ALL user progress changes
        },
        (payload: any) => {
          // Only trigger leaderboard refresh, not full data reload
          setLeaderboardRefreshTrigger(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      leaderboardSubscription.unsubscribe()
    }
  }, [dataSource]) // Only depends on dataSource, not user

  // Setup real-time subscription for profile updates (display name changes)
  useEffect(() => {
    if (!isSupabaseConfigured() || dataSource !== "supabase" || !supabase) {
      return // No subscription needed for local mode
    }

    // Subscribe to profile changes for real-time display name updates
    const profileSubscription = supabase
      .channel('profile_updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'profiles'
          // No filter - listen to ALL profile changes
        },
        (payload: any) => {
          // If it's the current user's profile, update local state
          if (user && payload.new && payload.new.id === user.id) {
            setUserProfile({ display_name: payload.new.display_name })
          }
          // Also trigger leaderboard refresh for display name changes
          setLeaderboardRefreshTrigger(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      profileSubscription.unsubscribe()
    }
  }, [dataSource, user]) // Depends on both dataSource and user

  // Setup real-time subscription for daily targets updates
  useEffect(() => {
    if (!isSupabaseConfigured() || dataSource !== "supabase" || !supabase) {
      return // No subscription needed for local mode
    }

    // Subscribe to daily targets changes (less frequent but important)
    const targetsSubscription = supabase
      .channel('daily_targets_updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'daily_targets'
          // No filter - listen to ALL daily target changes
        },
        (payload: any) => {
          // Reload daily targets when they change
          loadDailyTargets()
        }
      )
      .subscribe()

    return () => {
      targetsSubscription.unsubscribe()
    }
  }, [dataSource]) // Only depends on dataSource

  // Throttled refresh trigger for stats and charts
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0)
  const statsRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Setup throttled stats refresh mechanism
  useEffect(() => {
    if (!isSupabaseConfigured() || dataSource !== "supabase" || !user || !supabase) {
      return
    }

    // Subscribe to changes that affect stats calculations
    const statsSubscription = supabase
      .channel('stats_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          // Throttle stats refresh to prevent excessive recalculations
          if (statsRefreshTimeoutRef.current) {
            clearTimeout(statsRefreshTimeoutRef.current)
          }
          
          statsRefreshTimeoutRef.current = setTimeout(() => {
            setStatsRefreshTrigger(prev => prev + 1)
          }, 500) // 500ms throttle
        }
      )
      .subscribe()

    return () => {
      if (statsRefreshTimeoutRef.current) {
        clearTimeout(statsRefreshTimeoutRef.current)
      }
      statsSubscription.unsubscribe()
    }
  }, [user, dataSource])

  // Force recalculation of stats when stats refresh trigger changes
  useEffect(() => {
    if (statsRefreshTrigger > 0 && user && dataSource === "supabase") {
      // Trigger a background refresh of challenge data for stats
      const refreshStats = async () => {
        try {
          const challengeResult = await database.getChallengeProgress(user.id)
          if (challengeResult.data) {
            const challengeProgressWithTargets = challengeResult.data.map((progress) => {
              const progressDay = getChallengeDay(progress.date)
              const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats ?? 50
              return {
                ...progress,
                target_squats: target,
              }
            })
            setChallengeProgressData(challengeProgressWithTargets)
          }
        } catch (error) {
          console.error("❌ Error refreshing stats:", error)
        }
      }
      
      refreshStats()
    }
  }, [statsRefreshTrigger, user, dataSource, dailyTargets])

  // Setup real-time subscription for progress chart updates
  useEffect(() => {
    if (!isSupabaseConfigured() || dataSource !== "supabase" || !supabase) {
      return
    }

    // Subscribe to changes that affect progress chart
    const chartSubscription = supabase
      .channel('progress_chart_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress'
          // Listen to all progress changes for chart updates
        },
        (payload: any) => {
          // For chart updates, we need to refresh progress data
          if (user && payload.new && payload.new.user_id === user.id) {
            // Update progress data for chart
            const refreshChart = async () => {
              try {
                const recentResult = await database.getUserProgress(user.id, 7)
                if (recentResult.data) {
                  const progressWithTargets = recentResult.data.map((progress) => {
                    const progressDay = getChallengeDay(progress.date)
                    const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats ?? 50
                    return {
                      ...progress,
                      target_squats: target,
                    }
                  })
                  setProgressData(progressWithTargets)
                }
              } catch (error) {
                console.error("❌ Error refreshing chart data:", error)
              }
            }
            
            refreshChart()
          }
        }
      )
      .subscribe()

    return () => {
      chartSubscription.unsubscribe()
    }
  }, [user, dataSource, dailyTargets])

  const handleSquatsUpdate = async (newTotalSquats: number) => {
    // Validate against daily target
    if (newTotalSquats > todayTarget) {
      console.warn(`🚫 Cannot exceed daily target: ${newTotalSquats} > ${todayTarget}`)
      alert(`Cannot exceed today's target of ${todayTarget} squats.`)
      return
    }

    if (newTotalSquats < 0) {
      console.warn(`🚫 Cannot have negative squats: ${newTotalSquats}`)
      alert(`Cannot have negative squats.`)
      return
    }

    if (dataSource === "supabase" && user) {
      // Save to Supabase
      try {
        await database.updateUserProgress(user.id, currentDate, newTotalSquats, todayTarget)
        
        // Update local state immediately for responsive UI
        setTodaySquats(newTotalSquats)

        // Check for new milestones and show encouragement messages
        const newMilestones = getNewMilestones(newTotalSquats, todayTarget, todayMilestones)
        newMilestones.forEach(milestone => {
          const message = getRandomEncouragementMessage(milestone)
          const isCompletion = milestone === 100
          toast({
            title: isCompletion ? "🎊 GOAL COMPLETED! 🎊" : "Milestone Achieved! 🎉",
            description: message,
            duration: 5000, // 5 seconds for all milestones
          })
          
          // Trigger confetti for 100% completion
          if (isCompletion) {
            setShowConfetti(true)
          }
        })
        if (newMilestones.length > 0) {
          setTodayMilestones(prev => {
            const updated = new Set(prev)
            newMilestones.forEach(m => updated.add(m))
            return updated
          })
        }

        // Reload both challenge progress AND recent progress to update all displays
        const [challengeResult, recentResult] = await Promise.all([
          database.getChallengeProgress(user.id),
          database.getUserProgress(user.id, 7)
        ])

        // Update challenge progress data for stats
        if (challengeResult.data) {
          const challengeProgressWithTargets = challengeResult.data.map((progress) => {
            const progressDay = getChallengeDay(progress.date)
            const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats ?? 50
            return {
              ...progress,
              target_squats: target,
            }
          })
          setChallengeProgressData(challengeProgressWithTargets)
        }

        // Update recent progress data for chart
        if (recentResult.data) {
          const progressWithTargets = recentResult.data.map((progress) => {
            const progressDay = getChallengeDay(progress.date)
            const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats ?? 50
            return {
              ...progress,
              target_squats: target,
            }
          })
          setProgressData(progressWithTargets)
        }

        // Trigger leaderboard refresh after successful Supabase update (throttled)
        setTimeout(() => {
          setLeaderboardRefreshTrigger(prev => prev + 1);
        }, 1000); // Throttle refresh to at most once per second
        
      } catch (error) {
        console.error("❌ Error saving to Supabase:", error)
        if (DISABLE_OFFLINE_MODE) {
          console.error("❌ Supabase save failed and offline mode disabled")
          alert(`Failed to save to database: ${error instanceof Error ? error.message : 'Unknown error'}. Offline mode is disabled.`)
          return // Don't update local state if we can't save to Supabase
        } else {
          // Fallback to local storage
          storage.updateTodayProgress(newTotalSquats)
        }
      }
    } else {
      // Save to local storage
      storage.updateTodayProgress(newTotalSquats)
      setTodaySquats(newTotalSquats)

      // Check for new milestones and show encouragement messages
      const newMilestones = getNewMilestones(newTotalSquats, todayTarget, todayMilestones)
      newMilestones.forEach(milestone => {
        const message = getRandomEncouragementMessage(milestone)
        const isCompletion = milestone === 100
        toast({
          title: isCompletion ? "🎊 GOAL COMPLETED! 🎊" : "Milestone Achieved! 🎉",
          description: message,
          duration: 5000, // 5 seconds for all milestones
        })
        
        // Trigger confetti for 100% completion
        if (isCompletion) {
          setShowConfetti(true)
        }
      })
      if (newMilestones.length > 0) {
        setTodayMilestones(prev => {
          const updated = new Set(prev)
          newMilestones.forEach(m => updated.add(m))
          return updated
        })
      }

      // Update challenge progress data for local storage
      const challengeProgress = storage.getChallengeProgress()
      const challengeProgressWithTargets = challengeProgress.map((progress) => {
        const progressDay = getChallengeDay(progress.date)
        const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats ?? 50
        return {
          ...progress,
          target_squats: target,
        }
      })
      setChallengeProgressData(challengeProgressWithTargets)

      // Update progress data for chart (local storage)
      const updatedProgress = [...progressData]
      const todayIndex = updatedProgress.findIndex((p) => p.date === currentDate)

      if (todayIndex >= 0) {
        updatedProgress[todayIndex].squats_completed = newTotalSquats
      } else {
        updatedProgress.push({
          date: currentDate,
          squats_completed: newTotalSquats,
          target_squats: todayTarget,
        })
      }

      setProgressData(updatedProgress.slice(-7))
    }
  }

  const handleSignOut = async () => {
    try {
      if (!auth) {
        console.error("❌ Auth client not available")
        return
      }
      await auth.signOut()
    } catch (error) {
      console.error("❌ Sign out error:", error)
    }
  }

  const handleAuthSuccess = (authUser: any) => {
    setUser(authUser)
    if (authUser.user_metadata?.display_name) {
      setUserProfile({ display_name: authUser.user_metadata.display_name })
    }
  }

  // Function to scroll to leaderboard
  const scrollToLeaderboard = () => {
    leaderboardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  // Handle clicking on a day in the progress chart
  const handleDayClick = (date: string, currentSquats: number, target: number) => {
    setSelectedEditDate(date)
    setSelectedEditSquats(currentSquats)
    setModalOpenedFromChart(true)
    setEditDayModalOpen(true)
  }

  // Handle saving edited day squats
  const handleSaveEditedDay = async (date: string, squats: number) => {
    const challengeDay = getChallengeDay(date)
    const target = dailyTargets.find((t) => t.day === challengeDay)?.target_squats ?? 50

    if (dataSource === "supabase" && user) {
      // Save to Supabase
      try {
        await database.updateUserProgress(user.id, date, squats, target)
        
        // Reload both challenge progress AND recent progress to update all displays
        const [challengeResult, recentResult] = await Promise.all([
          database.getChallengeProgress(user.id),
          database.getUserProgress(user.id, 7)
        ])

        // Update challenge progress data for stats
        if (challengeResult.data) {
          const challengeProgressWithTargets = challengeResult.data.map((progress) => {
            const progressDay = getChallengeDay(progress.date)
            const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats ?? 50
            return {
              ...progress,
              target_squats: target,
            }
          })
          setChallengeProgressData(challengeProgressWithTargets)
        }

        // Update recent progress data for chart
        if (recentResult.data) {
          const progressWithTargets = recentResult.data.map((progress) => {
            const progressDay = getChallengeDay(progress.date)
            const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats ?? 50
            return {
              ...progress,
              target_squats: target,
            }
          })
          setProgressData(progressWithTargets)
        }

        // If editing today's date, update today's squats and check milestones
        if (date === currentDate) {
          setTodaySquats(squats)
          
          // Check for new milestones and show encouragement messages for today's edits
          const newMilestones = getNewMilestones(squats, target, todayMilestones)
          newMilestones.forEach(milestone => {
            const message = getRandomEncouragementMessage(milestone)
            const isCompletion = milestone === 100
            toast({
              title: isCompletion ? "🎊 GOAL COMPLETED! 🎊" : "Milestone Achieved! 🎉",
              description: message,
              duration: 5000, // 5 seconds for all milestones
            })
            
            // Trigger confetti for 100% completion
            if (isCompletion) {
              setShowConfetti(true)
            }
          })
          if (newMilestones.length > 0) {
            setTodayMilestones(prev => {
              const updated = new Set(prev)
              newMilestones.forEach(m => updated.add(m))
              return updated
            })
          }
        }

            // Trigger leaderboard refresh (throttled)
    setTimeout(() => {
      setLeaderboardRefreshTrigger(prev => prev + 1);
    }, 1000); // Throttle refresh to at most once per second
        
      } catch (error) {
        console.error("❌ Error saving edited day to Supabase:", error)
        throw error
      }
    } else {
      // Save to local storage
      // Update local storage for this specific date
      localStorage.setItem(`squats_${date}`, squats.toString())

      // Update the progress history
      const history = storage.getUserProgress()
      const existingIndex = history.findIndex((p) => p.date === date)

      const progressEntry = {
        date: date,
        squats_completed: squats,
        target_squats: target,
      }

      if (existingIndex >= 0) {
        history[existingIndex] = progressEntry
      } else {
        history.push(progressEntry)
      }

      localStorage.setItem("squat_progress", JSON.stringify(history))

      // Update challenge progress data for local storage
      const challengeProgress = storage.getChallengeProgress()
      const challengeProgressWithTargets = challengeProgress.map((progress) => {
        const progressDay = getChallengeDay(progress.date)
        const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats ?? 50
        return {
          ...progress,
          target_squats: target,
        }
      })
      setChallengeProgressData(challengeProgressWithTargets)

      // Update recent progress data for chart
      const updatedProgress = [...progressData]
      const dayIndex = updatedProgress.findIndex((p) => p.date === date)

      if (dayIndex >= 0) {
        updatedProgress[dayIndex].squats_completed = squats
      } else {
        updatedProgress.push(progressEntry)
      }

      setProgressData(updatedProgress.slice(-7))

      // If editing today's date, update today's squats and check milestones
      if (date === currentDate) {
        setTodaySquats(squats)
        
        // Check for new milestones and show encouragement messages for today's edits
        const newMilestones = getNewMilestones(squats, target, todayMilestones)
        newMilestones.forEach(milestone => {
          const message = getRandomEncouragementMessage(milestone)
          const isCompletion = milestone === 100
          toast({
            title: isCompletion ? "🎊 GOAL COMPLETED! 🎊" : "Milestone Achieved! 🎉",
            description: message,
            duration: 5000, // 5 seconds for all milestones
          })
          
          // Trigger confetti for 100% completion
          if (isCompletion) {
            setShowConfetti(true)
          }
        })
        if (newMilestones.length > 0) {
          setTodayMilestones(prev => {
            const updated = new Set(prev)
            newMilestones.forEach(m => updated.add(m))
            return updated
          })
        }
      }

    }
  }

  // Memoize expensive calculations to prevent unnecessary recalculations
  const totalSquats = useMemo(() => {
    return challengeProgressData.reduce((acc, day) => acc + day.squats_completed, 0)
  }, [challengeProgressData])

  const currentStreak = useMemo(() => {
    return calculateStreak(challengeProgressData)
  }, [challengeProgressData])

  // Force re-render trigger for all components showing live data
  const [liveDataTrigger, setLiveDataTrigger] = useState(0)

  // Setup comprehensive real-time synchronization
  useEffect(() => {
    if (!isSupabaseConfigured() || dataSource !== "supabase" || !supabase) {
      return
    }

    // Subscribe to all database changes that affect displayed values
    const comprehensiveSubscription = supabase
      .channel('comprehensive_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress'
        },
        (payload: any) => {
          // Update live data trigger to force re-render of all components
          setLiveDataTrigger(prev => prev + 1)
          
          // Also refresh leaderboard
          setTimeout(() => {
            setLeaderboardRefreshTrigger(prev => prev + 1)
          }, 200)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload: any) => {
          // Update live data trigger for profile changes
          setLiveDataTrigger(prev => prev + 1)
          setLeaderboardRefreshTrigger(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      comprehensiveSubscription.unsubscribe()
    }
  }, [dataSource])

  // Update today's squats when live data changes
  useEffect(() => {
    if (liveDataTrigger > 0 && user && dataSource === "supabase") {
      const refreshTodaySquats = async () => {
        try {
          const todayProgress = challengeProgressData.find(p => p.date === currentDate)
          if (todayProgress) {
            setTodaySquats(todayProgress.squats_completed)
          }
        } catch (error) {
          console.error("❌ Error refreshing today's squats:", error)
        }
      }
      
      refreshTodaySquats()
    }
  }, [liveDataTrigger, challengeProgressData, currentDate, user, dataSource])

  // Calculate challenge-only squats and follow-on squats separately
  const { challengeSquats, followOnSquats } = useMemo(() => {
    if (!isInFollowOn || !selectedFollowOnProgram) {
      return { challengeSquats: totalSquats, followOnSquats: 0 }
    }
    
    // Calculate challenge squats (from challenge period only)
    const challengeOnlySquats = challengeProgressData.reduce((acc, day) => acc + day.squats_completed, 0)
    
    // Calculate follow-on squats (from follow-on period only)
    const followOnStartDate = getFollowOnStartDate()
    const followOnOnly = progressData.filter(day => day.date >= followOnStartDate)
    const followOnOnlySquats = followOnOnly.reduce((acc, day) => acc + day.squats_completed, 0)
    
    return {
      challengeSquats: challengeOnlySquats,
      followOnSquats: followOnOnlySquats
    }
  }, [isInFollowOn, selectedFollowOnProgram, totalSquats, challengeProgressData, progressData])

  // Stable props for LeaderboardPreview to prevent constant re-renders
  const leaderboardProps = useMemo(() => ({
    refreshTrigger: leaderboardRefreshTrigger,
    userTotalSquats: totalSquats,
    userTodaySquats: todaySquats,
    userDisplayName: effectiveUserProfile?.display_name,
    userStreak: currentStreak, // Pass the correct current streak
    dataSource: dataSource === "local" ? "localStorage" as const : "supabase" as const,
    liveDataTrigger: liveDataTrigger, // Add live data trigger for real-time updates
    isInFollowOn: isInFollowOn,
    userChallengeSquats: challengeSquats,
    userFollowOnSquats: followOnSquats,
  }), [leaderboardRefreshTrigger, totalSquats, todaySquats, effectiveUserProfile?.display_name, currentStreak, dataSource, liveDataTrigger, isInFollowOn, challengeSquats, followOnSquats])

  // Calculate actual completed days (not streak) - exclude rest days
  const completedDays = useMemo(() => {
    return challengeProgressData.filter(day => 
      day.target_squats > 0 && day.squats_completed >= day.target_squats
    ).length
  }, [challengeProgressData])

  // Calculate current calendar week progress (Sunday to Saturday)
  const weeklyProgress = useMemo(() => {
    const now = new Date()
    const currentWeekStart = new Date(now)
    currentWeekStart.setDate(now.getDate() - now.getDay()) // Go to Sunday of current week
    currentWeekStart.setHours(0, 0, 0, 0)
    
    const currentWeekEnd = new Date(currentWeekStart)
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6) // Saturday of current week
    currentWeekEnd.setHours(23, 59, 59, 999)
    
    const currentWeekDays = challengeProgressData.filter(day => {
      const dayDate = new Date(day.date)
      return dayDate >= currentWeekStart && dayDate <= currentWeekEnd
    })
    
    return currentWeekDays.reduce((acc, day) => acc + day.squats_completed, 0)
  }, [challengeProgressData])

  const weeklyGoal = 850

  // Memoize display calculations
  const displayDay = useMemo(() => {
    if (isInFollowOn && selectedFollowOnProgram) {
      return followOnDay
    }
    if (challengeComplete) {
      return CHALLENGE_CONFIG.TOTAL_DAYS // Show final day instead of current day
    }
    return Math.min(currentDay, CHALLENGE_CONFIG.TOTAL_DAYS)
  }, [isInFollowOn, selectedFollowOnProgram, followOnDay, challengeComplete, currentDay])

  const displayDayText = useMemo(() => {
    if (isInFollowOn && selectedFollowOnProgram) {
      const program = FOLLOWON_PROGRAMS[selectedFollowOnProgram]
      return `${program.emoji} ${program.name} - Day ${followOnDay} of ${program.duration}`
    }
    if (challengeComplete) {
      return `Challenge Complete (${CHALLENGE_CONFIG.TOTAL_DAYS} days)`
    }
    return `Day ${displayDay} of ${CHALLENGE_CONFIG.TOTAL_DAYS}`
  }, [isInFollowOn, selectedFollowOnProgram, followOnDay, challengeComplete, displayDay])

  const displayName = useMemo(() => {
    if (effectiveUserProfile?.display_name) {
      return effectiveUserProfile.display_name
    }
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name
    }
    if (user?.email) {
      return user.email.split("@")[0]
    }
    return "User"
  }, [effectiveUserProfile?.display_name, user?.user_metadata?.display_name, user?.email])

  const statusBadge = useMemo(() => {
    if (!isSupabaseSetup) {
      return {
        text: "💾 Offline",
        className: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
      }
    }

    if (user) {
      return {
        text: "📡 Online (Signed In)",
        className: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
      }
    }

    return {
      text: "📡 Demo Mode (Sign In for Real Data)",
      className: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    }
  }, [user, isSupabaseSetup])

  // Function to prompt for user name in local mode
  const promptForLocalName = () => {
    const name = prompt("Enter your display name:")
    if (name && name.trim()) {
      saveLocalProfile({ display_name: name.trim() })
    }
    setHasPromptedForName(true) // Mark that we've prompted to prevent repeated prompts
  }

  // Check if we should prompt for name in local mode (only once per session)
  useEffect(() => {
    if (!DISABLE_OFFLINE_MODE && dataSource === "local" && !localUserProfile && !isLoading && !hasPromptedForName) {
      // Give a moment for UI to load before prompting
      setTimeout(() => {
        promptForLocalName()
      }, 1000)
    }
  }, [dataSource, localUserProfile, isLoading, hasPromptedForName])

  // Show local mode button after 5 seconds of loading
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    
    if (isLoading) {
      timer = setTimeout(() => {
        setShowLocalModeButton(true)
      }, 5000) // 5 seconds delay
    } else {
      // Reset when loading completes
      setShowLocalModeButton(false)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isLoading])

  // Auto-update current date every minute - use ref to avoid closure issues
  const currentDateRef = useRef(currentDate)
  
  // Keep ref in sync with state
  useEffect(() => {
    currentDateRef.current = currentDate
    // Reset milestones when date changes (new day)
    setTodayMilestones(new Set())
  }, [currentDate])

  useEffect(() => {
    const checkDateChange = () => {
      const newDate = getLocalDateString()
      
      if (newDate !== currentDateRef.current) {
        setCurrentDate(newDate)
      } else {
        // Force update current date to trigger recalculation
        setCurrentDate(newDate)
      }
      
      // Also check challenge status when date changes
      const isBeforeStart = isBeforeChallengeStart()
      let isComplete = isChallengeComplete()
      
      // TESTING OVERRIDE: Force challenge complete for testing follow-on programs
      const FORCE_CHALLENGE_COMPLETE_FOR_TESTING = true
      if (FORCE_CHALLENGE_COMPLETE_FOR_TESTING) {
        isComplete = true
      }
      
      setIsBeforeChallengeStartState(isBeforeStart && !FORCE_CHALLENGE_COMPLETE_FOR_TESTING)
      setChallengeComplete(isComplete)
    }

    // Check immediately on mount
    checkDateChange()
    
    // Check every minute around midnight (11:58 PM to 12:02 AM)
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()
    const isAroundMidnight = hour === 23 && minute >= 58 || hour === 0 && minute <= 2
    
    // Use 1-minute intervals around midnight, 5-minute intervals otherwise
    const intervalTime = isAroundMidnight ? 60000 : 300000 // 1 minute or 5 minutes
    const interval = setInterval(checkDateChange, intervalTime)

    return () => clearInterval(interval)
  }, []) // No dependencies needed since we use ref

  // Recalculate current day when date changes
  useEffect(() => {
    // Force check the current date
    const actualToday = getLocalDateString()
    
    // If there's a mismatch, force update
    if (currentDate !== actualToday) {
      setCurrentDate(actualToday)
      return // Exit early, this will retrigger the effect
    }
    
    const newCurrentDay = getChallengeDay(currentDate)
    setCurrentDay(newCurrentDay)
  }, [currentDate])

  // Separate effect for data reloading with throttling to prevent loops
  const lastDataReloadRef = useRef<string>("")
  
  useEffect(() => {
    // Only reload data if the date actually changed and enough time has passed
    if (currentDate !== lastDataReloadRef.current && !isLoading && !isReloadingData && (dataSource === "supabase" || dataSource === "local")) {
      lastDataReloadRef.current = currentDate
      setIsReloadingData(true)
      
      // Add delay to prevent rapid reloads
      setTimeout(() => {
        loadData()
          .catch(console.error)
          .finally(() => setIsReloadingData(false))
      }, 500) // 500ms delay
    }
  }, [currentDate, isLoading, dataSource, isReloadingData])

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground mb-4">Loading...</p>
          
          {/* Manual skip option - only shows after 5 seconds */}
          {showLocalModeButton && !DISABLE_OFFLINE_MODE && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setDataSource("local")
                  setIsLoading(false)
                }}
                className="glass-subtle text-xs"
              >
                Skip to Local Mode
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Click if loading takes too long
              </p>
            </>
          )}
          
          {/* Show different message when offline mode is disabled */}
          {showLocalModeButton && DISABLE_OFFLINE_MODE && (
            <p className="text-xs text-muted-foreground mt-2">
              Waiting for Supabase connection... (Offline mode disabled)
            </p>
          )}
        </div>
      </div>
    )
  }

  // Show pre-challenge welcome screen if before start date (unless testing override active)
  if (isBeforeChallengeStartState) {
    return (
      <div className="min-h-screen gradient-bg">
        {/* Sticky Header */}
        <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
          isScrolled ? "backdrop-blur-xl bg-background/10 border-b border-white/10 shadow-xl" : "bg-transparent"
        }`}>
          <div className="container mx-auto px-4 py-3 max-w-6xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ScrollLottie 
                  size={isScrolled ? 24 : 32}
                  className="transition-all duration-300"
                />
              </div>
              <div className="flex items-center gap-2">
                {/* User info and controls - slide right when bug button is hidden */}
                <div className={`flex items-center gap-2 transition-all duration-500 ${
                  isScrolled ? 'transform translate-x-10 md:translate-x-8' : ''
                }`}>
                  {user ? (
                    <>
                      <Badge
                        variant="outline"
                        className="glass-subtle text-xs border-white/20 bg-white/10 backdrop-blur-sm"
                      >
                        <User className="w-3 h-3 mr-1" />
                        {displayName}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSignOut}
                        className="glass-subtle w-10 h-10 md:w-8 md:h-8 hover:bg-white/10 border-white/20"
                      >
                        <LogOut className="w-4 h-4 md:w-3 md:h-3" />
                      </Button>
                    </>
                  ) : (
                    isSupabaseSetup && (
                      <AuthModal onAuthSuccess={handleAuthSuccess}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="glass-subtle text-xs px-2 py-1 hover:bg-white/10 border-white/20"
                        >
                          <User className="w-3 h-3 mr-1" />
                          Sign In
                        </Button>
                      </AuthModal>
                    )
                  )}
                </div>
                
                {/* Bug Report Button - fades out when scrolling */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setBugReportModalOpen(true)}
                  className={`glass-subtle w-10 h-10 md:w-8 md:h-8 hover:bg-white/10 border-white/20 touch-manipulation select-none transition-all duration-500 ${
                    isScrolled ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                  title="Report a bug"
                >
                  <Bug className="w-4 h-4 md:w-3 md:h-3" />
                </Button>
                
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        {/* Pre-Challenge Welcome Screen */}
        <PreChallengeWelcome 
          onCountdownComplete={() => {
            // Refresh challenge status when countdown completes
            const isBeforeStart = isBeforeChallengeStart()
            const isComplete = isChallengeComplete()
            setIsBeforeChallengeStartState(isBeforeStart)
            setChallengeComplete(isComplete)
          }}
        />

        {/* Footer */}
        <FooterFloat />

        {/* Scroll Lottie Animation */}
        <ScrollLottie />

        {/* Bug Report Modal */}
        <BugReportModal
          isOpen={bugReportModalOpen}
          onClose={() => setBugReportModalOpen(false)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Sticky Glassmorphic Header */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
          isScrolled ? "backdrop-blur-xl bg-background/10 border-b border-white/10 shadow-xl" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 py-3 max-w-6xl">
          <div className="flex justify-between items-center">
            {/* Left side - Logo/Title */}
            <div className="flex items-center gap-3">
              <ScrollLottie 
                size={isScrolled ? 24 : 32}
                className="transition-all duration-300"
              />
            </div>

            {/* Right side - User controls */}
            <div className="flex items-center gap-2">
              {/* User info and controls - slide right when bug button is hidden */}
              <div className={`flex items-center gap-2 transition-all duration-500 ${
                isScrolled ? 'transform translate-x-10 md:translate-x-8' : ''
              }`}>
                {user ? (
                  <>
                    <Badge
                      variant="outline"
                      className="glass-subtle text-xs border-white/20 bg-white/10 backdrop-blur-sm"
                    >
                      <User className="w-3 h-3 mr-1" />
                      {displayName}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSignOut}
                      className="glass-subtle w-10 h-10 md:w-8 md:h-8 hover:bg-white/10 border-white/20 touch-manipulation select-none"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <LogOut className="w-4 h-4 md:w-3 md:h-3" />
                    </Button>
                  </>
                ) : (
                  isSupabaseSetup && (
                    <AuthModal onAuthSuccess={handleAuthSuccess}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="glass-subtle text-xs px-2 py-1 hover:bg-white/10 border-white/20 touch-manipulation min-h-[40px] md:min-h-[32px]"
                        style={{ touchAction: 'manipulation' }}
                        onClick={() => {}}
                      >
                        <User className="w-3 h-3 mr-1" />
                        Sign In
                      </Button>
                    </AuthModal>
                  )
                )}
              </div>
              
              {/* Bug Report Button - fades out when scrolling */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setBugReportModalOpen(true)}
                className={`glass-subtle w-10 h-10 md:w-8 md:h-8 hover:bg-white/10 border-white/20 touch-manipulation select-none transition-all duration-500 ${
                  isScrolled ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                }`}
                style={{ touchAction: 'manipulation' }}
                title="Report a bug"
              >
                <Bug className="w-4 h-4 md:w-3 md:h-3" />
              </Button>
              
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
        {/* Spacer for sticky header */}
        <div className="h-16"></div>

        {/* Centered Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-2 leading-normal overflow-visible pb-1">
            Squat Challenge
          </h1>
          <div className="text-sm md:text-lg mb-4">
            <ShinyText 
              text="Build strength, track progress, and stand up for better" 
              disabled={false}
              className="" 
            />
          </div>

          {/* Status Badges Row - Centered */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <Badge variant="outline" className="text-xs glass-subtle">
              <Calendar className="w-3 h-3 mr-1" />
              {displayDayText}
            </Badge>
            <Badge variant="outline" className={`text-xs ${statusBadge.className}`}>
              {statusBadge.text}
            </Badge>
            <Badge variant="outline" className="text-xs glass-subtle">
              📊 Challenge Total: {totalSquats.toLocaleString()}
            </Badge>
          </div>

          {/* Action Buttons Row - Centered */}
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowInfo(!showInfo)} className="glass-subtle text-xs">
              <Info className="w-3 h-3 mr-1" />
              About / Causes
            </Button>
            <Button variant="ghost" size="sm" className="glass-subtle text-xs" onClick={scrollToLeaderboard}>
              <Users className="w-3 h-3 mr-1" />
              Leaderboard
            </Button>

          </div>
        </div>

        {/* Testing Notice */}
        {process.env.NEXT_PUBLIC_SHOW_TEST_MODE === 'true' && (
          <Card className="mb-6 md:mb-8 glass-strong border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 max-w-4xl mx-auto">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                  🧪
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300 text-sm">
                    🚀 Challenge Launching July 9th, 2025 - Currently in Testing Phase
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    We're currently testing all features and functionality before the official launch. Feel free to explore the app, track your squats, and provide feedback! All data will be preserved for the official challenge start.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Challenge Complete Message */}
        {challengeComplete && !isInFollowOn && (
          <Card className="mb-6 md:mb-8 glass-strong border-green-500/20 max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <span className="bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent">
                  Challenge Complete!
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <div className="text-4xl mb-4">🎉</div>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                Congratulations! You've completed the {CHALLENGE_CONFIG.TOTAL_DAYS}-day squat challenge!
              </p>
              <p className="text-muted-foreground">
                Check out your progress below and see how you compare on the leaderboard.
              </p>
              <div className="mt-4 p-4 glass-subtle rounded-xl">
                <p className="text-sm text-muted-foreground">
                  Challenge ran from {CHALLENGE_CONFIG.START_DATE} to{" "}
                  {getDateFromChallengeDay(CHALLENGE_CONFIG.TOTAL_DAYS)}
                </p>
                <p className="text-lg font-bold text-primary mt-2">Your Total: {totalSquats.toLocaleString()} squats</p>
              </div>
              
              {/* Show program selection button if not already selected */}
              {!selectedFollowOnProgram && (
                <div className="mt-4">
                  <Button 
                    onClick={() => setShowPostChallengeOptions(true)} 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    Choose Follow-on Program 🚀
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Follow-on Program Active Message */}
        {isInFollowOn && selectedFollowOnProgram && (
          <Card className="mb-6 md:mb-8 glass-strong border-blue-500/20 max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center justify-center">
                <span className="text-2xl">{FOLLOWON_PROGRAMS[selectedFollowOnProgram].emoji}</span>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  {FOLLOWON_PROGRAMS[selectedFollowOnProgram].name} Program
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                Day {followOnDay} of {FOLLOWON_PROGRAMS[selectedFollowOnProgram].duration}
              </p>
              <p className="text-muted-foreground">
                {FOLLOWON_PROGRAMS[selectedFollowOnProgram].description}
              </p>
              <div className="mt-4 p-4 glass-subtle rounded-xl">
                <p className="text-sm text-muted-foreground">
                  Challenge completed: {totalSquats.toLocaleString()} squats
                </p>
                <p className="text-lg font-bold text-primary mt-2">Today's Target: {todayTarget} squats</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Post-Challenge Program Selection */}
        {showPostChallengeOptions && (
          <Card className="mb-6 md:mb-8 glass-strong max-w-4xl mx-auto">
            <CardContent className="p-6">
              <PostChallengeOptions
                onProgramSelect={handleFollowOnProgramSelect}
                selectedProgram={selectedFollowOnProgram}
                isLoading={false}
              />
            </CardContent>
          </Card>
        )}

        {/* Data Source Info */}
        {!isSupabaseSetup && (
          <Card className="mb-6 md:mb-8 glass-strong border-orange-500/20 max-w-4xl mx-auto">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <Info className="w-4 h-4" />
                <span className="text-sm">
                  Running in offline mode. Connect to Supabase to sync data across devices and compete with others.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* About info */}
        {showInfo && (
          <Card className="mb-6 md:mb-8 glass-strong max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                About / Causes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="space-y-3">
                <p>
                  <strong>💙 Supporting Important Causes:</strong> While this challenge isn't tied to a specific charity, we encourage participants to consider supporting these impactful organizations:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
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
              </div>
              
              <div className="border-t border-border pt-4 space-y-3">
                <p>
                  <strong>🏋️ The Challenge:</strong> This {CHALLENGE_CONFIG.TOTAL_DAYS}-day squat challenge mimics the progressive targets of the renowned Pushup Challenge, adapted for building lower body strength and endurance.
                </p>
                <p>
                  <strong>🎯 How to Use the Squat Dial:</strong> Drag clockwise to count squats (each full revolution = 10 squats), drag counter-clockwise to subtract, then click "Bank Squats" to save your daily total.
                </p>
                <p>
                  <strong>📈 Edit Previous Days:</strong> Use the progress chart below to click on any previous day and edit your squat count - perfect for catching up or making corrections!
                </p>
                <p>
                  <strong>📅 Challenge Period:</strong> {CHALLENGE_CONFIG.START_DATE} to {getDateFromChallengeDay(CHALLENGE_CONFIG.TOTAL_DAYS)} • Some days are rest days (0 squats) for recovery.
                </p>
              </div>
              
              <div className="border-t border-border pt-4 space-y-2">
                <p>
                  <strong>🔐 Easy Sign In:</strong> No passwords needed! Just enter your email for a 6-digit access code.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confetti Explosion */}
        {showConfetti && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
            <ConfettiExplosion 
              force={0.8}
              duration={3000}
              particleCount={250}
              width={1600}
              onComplete={() => setShowConfetti(false)}
            />
          </div>
        )}

        {/* Centered Content Layout */}
        <div className="space-y-4 md:space-y-6 max-w-5xl mx-auto">
          {/* Show squat dial and daily target for active programs (challenge or follow-on) */}
          {(!challengeComplete || isInFollowOn) && todayTarget > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Squat Dial */}
              <Card className="glass-strong">
                <CardContent className="p-4 md:p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                      {isInFollowOn && selectedFollowOnProgram ? 
                        `${FOLLOWON_PROGRAMS[selectedFollowOnProgram].emoji} Follow-on Squats` : 
                        'Squat Dial'
                      }
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground">
                      Drag clockwise to add, counter-clockwise to subtract
                    </p>
                  </div>
                  <SquatDial
                    onSquatsChange={handleSquatsUpdate}
                    currentSquats={todaySquats}
                    targetSquats={todayTarget}
                    currentDay={displayDay}
                    compact={false}
                  />
                </CardContent>
              </Card>

              {/* Daily Target */}
              <DailyTarget targetSquats={todayTarget} completedSquats={todaySquats} day={displayDay} />
            </div>
          )}

          {/* Stats Overview */}
          <StatsOverview
            totalSquats={totalSquats}
            streak={currentStreak}
            weeklyGoal={weeklyGoal}
            weeklyProgress={weeklyProgress}
            liveDataTrigger={liveDataTrigger}
          />

          {/* Progress Chart */}
          <ProgressChart 
            data={challengeProgressData} 
            dailyTargets={dailyTargets} 
            onDayClick={handleDayClick}
            isFollowOnMode={isInFollowOn}
            followOnProgram={selectedFollowOnProgram}
            followOnData={isInFollowOn ? followOnProgressData : undefined}
          />

          {/* Leaderboard Preview */}
          <div ref={leaderboardRef}>
            <LeaderboardPreview {...leaderboardProps} />
          </div>
        </div>

        {/* Edit Day Modal */}
        <EditDayModal
          isOpen={editDayModalOpen}
          onClose={() => {
            setEditDayModalOpen(false)
            setModalOpenedFromChart(false)
          }}
          selectedDate={selectedEditDate}
          currentSquats={selectedEditSquats}
          dailyTargets={dailyTargets}
          onSave={handleSaveEditedDay}
          openedFromChart={modalOpenedFromChart}
        />

        {/* Bug Report Modal */}
        <BugReportModal
          isOpen={bugReportModalOpen}
          onClose={() => setBugReportModalOpen(false)}
        />

        {/* Footer */}
        <FooterFloat />
      </div>
    </div>
  )
}

function calculateStreak(progressData: any[]): number {
  if (progressData.length === 0) return 0

  const today = getLocalDateString()
  const currentDay = getChallengeDay(today)
  
  let streak = 0
  
  // Start from yesterday (or latest completed day) and work backwards to find CONSECUTIVE streak
  // This ensures we only count the current active streak, not historical streaks
  for (let day = currentDay - 1; day >= 1; day--) {
    // Use consistent timezone-safe date calculation
    const [startYear, startMonth, startDay] = CHALLENGE_CONFIG.START_DATE.split('-').map(Number)
    const startDate = new Date(startYear, startMonth - 1, startDay, 12, 0, 0)
    const dayDate = new Date(startDate)
    dayDate.setDate(startDate.getDate() + day - 1)
    
    const year = dayDate.getFullYear()
    const month = String(dayDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(dayDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${dayStr}`
    
    // Get the target for this day from CHALLENGE_CONFIG (authoritative source)
    const targetEntry = CHALLENGE_CONFIG.DAILY_TARGETS.find((t) => t.day === day)
    const target = targetEntry?.target_squats ?? 50  // Use nullish coalescing to preserve 0 values
    
    // Skip rest days (they don't break streak)
    if (target === 0) {
      continue
    }
    
    // Find progress data for this day
    const dayProgress = progressData.find(p => p.date === dateStr)
    const squatsCompleted = dayProgress?.squats_completed || 0
    
    // Check if this day was completed
    const isCompleted = squatsCompleted >= target && target > 0
    
    if (isCompleted) {
      streak++
    } else {
      // As soon as we hit an incomplete day, the consecutive streak is broken
      break
    }
  }
  
  // Include today in streak if it is completed and not a rest day
  const todayTargetEntry = CHALLENGE_CONFIG.DAILY_TARGETS.find((t) => t.day === currentDay)
  const todayTarget = todayTargetEntry?.target_squats ?? 50

  if (todayTarget > 0) {
    const todayProgress = progressData.find(p => p.date === today)
    const todayCompleted = (todayProgress?.squats_completed || 0) >= todayTarget
    if (todayCompleted) {
      streak++
    }
  }

  // Limit streak to challenge duration (can't have a streak longer than the challenge itself)
  return Math.min(streak, CHALLENGE_CONFIG.TOTAL_DAYS)
}
