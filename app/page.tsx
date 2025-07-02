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
  CHALLENGE_CONFIG,
  isChallengeComplete,
  checkUserExists,
  updateUserProfile,
} from "@/lib/supabase"
import { Calendar, Info, Users, LogOut, User, Trophy } from "lucide-react"
import FooterFloat from "@/components/FooterFloat"
import ScrollLottie from "@/components/ScrollLottie"
import { EditDayModal } from "@/components/EditDayModal"

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
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split("T")[0])

  // Edit day modal state
  const [editDayModalOpen, setEditDayModalOpen] = useState(false)
  const [selectedEditDate, setSelectedEditDate] = useState<string | null>(null)
  const [selectedEditSquats, setSelectedEditSquats] = useState(0)
  const [modalOpenedFromChart, setModalOpenedFromChart] = useState(false)

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
        const newDate = new Date().toISOString().split("T")[0]
        if (newDate !== currentDate) {
          console.log(`🔄 Tab became visible - date changed from ${currentDate} to ${newDate}`)
          setCurrentDate(newDate)
        }
        
        // Also refresh data for Supabase users
        if (dataSource === "supabase" && user) {
          console.log("🔄 Tab became visible, refreshing data for cross-device sync")
          loadData()
        }
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
      console.log("⚠️ Auth operations timed out, falling back to local mode")
      if (!DISABLE_OFFLINE_MODE) {
        setDataSource("local")
      }
      setIsLoading(false)
    }, 8000) // 8 second timeout

    const checkAuth = async () => {
      console.log("🔍 Starting authentication check...")
      
      if (!isSupabaseConfigured()) {
        console.log("⚠️ Supabase not configured, using local storage")
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
          console.log("🔧 Manual override: Forcing local storage mode")
          setDataSource("local")
          setIsLoading(false)
          clearTimeout(authTimeout)
          return
        }
      }

      try {
        console.log("🔍 Checking authentication status...")
        
        if (!auth) {
          console.log("❌ Auth client not available")
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
          console.log("👤 User signed in:", session.user.email)
          setUser(session.user)
          setDataSource("supabase")
          
          // Check if user exists in profiles table and create if needed
          if (session.user.email) {
            try {
              console.log("🔍 checkUserExists called with email:", session.user.email || 'no email')
              const userCheckResult = await checkUserExists(session.user.email)
              
              if (!userCheckResult.exists) {
                const displayName = session.user.user_metadata?.display_name || 
                                   session.user.email?.split('@')[0] || 
                                   'User'
                
                console.log("➕ Creating profile for new user")
                try {
                  await updateUserProfile(session.user.id, {
                    display_name: displayName,
                    email: session.user.email
                  })
                  setUserProfile({ display_name: displayName })
                  console.log("✅ Profile created for new user")
                } catch (profileError) {
                  console.error("❌ Error creating profile:", profileError)
                  setUserProfile({ display_name: displayName })
                }
              } else if (userCheckResult.profile) {
                // Set existing profile
                setUserProfile({ display_name: userCheckResult.profile.display_name })
                console.log("✅ Loaded existing user profile:", userCheckResult.profile.display_name)
              }
            } catch (userCheckError) {
              console.error("❌ Error checking user:", userCheckError)
            }
          }
        } else {
          console.log("👤 No user session found")
          if (DISABLE_OFFLINE_MODE) {
            console.log("👤 No user session and offline mode disabled - waiting for user to sign in")
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
      console.log("❌ Auth client not available for subscription")
      return
    }
    
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state changed:", event)
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("👤 User signed in:", session.user.email)
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
          console.log("👋 User signed out")
          setUser(null)
          setUserProfile(null)
          if (DISABLE_OFFLINE_MODE) {
            console.log("👋 User signed out - staying in Supabase mode (offline disabled)")
            setDataSource("supabase") // Stay in supabase mode but without user
          } else {
            setDataSource("local")
            setHasPromptedForName(false) // Reset name prompt flag when signing out
          }
        }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check if challenge is complete
  useEffect(() => {
    const checkChallengeStatus = () => {
      const isComplete = isChallengeComplete()
      setChallengeComplete(isComplete)
      console.log("🏁 Challenge complete status:", isComplete)

      if (isComplete) {
        console.log("🎉 Challenge has ended! Showing completion screen.")
      }
    }

    checkChallengeStatus()
  }, [])

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

    console.log(`📅 Loading data for challenge day ${currentDay} (${currentDate})`)

    if (dataSource === "supabase" && user) {
      // Load from Supabase
      try {
        console.log("📡 Loading user data from Supabase...")

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
            const target = freshDailyTargets.find((t) => t.day === progressDay)?.target_squats || 50
            return {
              ...progress,
              target_squats: target,
            }
          })

          setChallengeProgressData(challengeProgressWithTargets)
          console.log(`✅ Loaded ${challengeProgressWithTargets.length} challenge progress records from Supabase`)

          // Get today's progress from the authoritative challenge data
          const todayProgress = challengeProgressWithTargets.find((p) => p.date === currentDate)
          todaySquatsFromData = todayProgress?.squats_completed || 0
        }

        // Process recent progress for chart display
        if (recentResult.data) {
          const progressWithTargets = recentResult.data.map((progress) => {
            const progressDay = getChallengeDay(progress.date)
            const target = freshDailyTargets.find((t) => t.day === progressDay)?.target_squats || 50
            return {
              ...progress,
              target_squats: target,
            }
          })

          setProgressData(progressWithTargets)
          console.log(`✅ Loaded ${progressWithTargets.length} recent progress records for chart`)
        }

        // Set today's squats from the most authoritative source
        setTodaySquats(todaySquatsFromData)
        console.log(`📊 Set today's squats to ${todaySquatsFromData} from challenge data`)
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
    console.log("💾 Loading data from local storage...")
    const today = storage.getTodayProgress()
    setTodaySquats(today)

    const savedProgress = storage.getUserProgress()
    if (savedProgress.length === 0) {
      // Generate sample data for demo with higher values to show count-up effect
      const sampleData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const challengeDay = getChallengeDay(date.toISOString().split("T")[0])
        const target = freshDailyTargets.find((t) => t.day === challengeDay)?.target_squats || 50

        return {
          date: date.toISOString().split("T")[0],
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
        const target = freshDailyTargets.find((t) => t.day === progressDay)?.target_squats || 50
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
        const target = freshDailyTargets.find((t) => t.day === progressDay)?.target_squats || 50
        return {
          ...progress,
          target_squats: target,
        }
      })
      setChallengeProgressData(challengeProgressWithTargets)
    }
    console.log("✅ Loaded data from local storage")
  }

  // Get today's target
  const todayTarget = dailyTargets.find((t) => t.day === currentDay)?.target_squats || 50

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
      
      console.log("🔄 Loading data due to dependency change:", { dataSource, userId: !!userId })
      lastLoadDataRef.current = { dataSource, userId: userId || "", timestamp: now }
      loadData()
    }
  }, [isLoading, dataSource, userId])

  // Setup real-time subscription for current user's progress
  useEffect(() => {
    if (!isSupabaseConfigured() || dataSource !== "supabase" || !user || !supabase) {
      return // No real-time subscription needed for local mode or when not signed in
    }

    console.log("🔔 Setting up real-time subscription for user_progress updates")

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
          console.log("🔔 Real-time update received for current user:", payload.eventType, payload.new || payload.old)
          
          // Reload data when current user's progress changes
          loadData()
        }
      )
      .subscribe((status: string) => {
        console.log("🔔 User progress subscription status:", status)
      })

    return () => {
      console.log("🔔 Cleaning up user progress subscription")
      userSubscription.unsubscribe()
    }
  }, [user, dataSource, loadData])

  // Setup real-time subscription for leaderboard updates (all users)
  useEffect(() => {
    if (!isSupabaseConfigured() || dataSource !== "supabase" || !supabase) {
      return // No subscription needed for local mode
    }

    console.log("🏆 Setting up real-time subscription for leaderboard updates")

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
          console.log("🏆 Leaderboard real-time update received:", payload.eventType, payload.new?.user_id || payload.old?.user_id)
          
          // Only trigger leaderboard refresh, not full data reload
          setLeaderboardRefreshTrigger(prev => prev + 1)
        }
      )
      .subscribe((status: string) => {
        console.log("🏆 Leaderboard subscription status:", status)
      })

    return () => {
      console.log("🏆 Cleaning up leaderboard subscription")
      leaderboardSubscription.unsubscribe()
    }
  }, [dataSource]) // Only depends on dataSource, not user

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
        console.log(`💾 Saving ${newTotalSquats} total squats to database`)
        
        await database.updateUserProgress(user.id, currentDate, newTotalSquats, todayTarget)
        console.log("✅ Saved to Supabase")
        
        // Update local state immediately for responsive UI
        setTodaySquats(newTotalSquats)

        // Reload both challenge progress AND recent progress to update all displays
        const [challengeResult, recentResult] = await Promise.all([
          database.getChallengeProgress(user.id),
          database.getUserProgress(user.id, 7)
        ])

        // Update challenge progress data for stats
        if (challengeResult.data) {
          const challengeProgressWithTargets = challengeResult.data.map((progress) => {
            const progressDay = getChallengeDay(progress.date)
            const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats || 50
            return {
              ...progress,
              target_squats: target,
            }
          })
          setChallengeProgressData(challengeProgressWithTargets)
          console.log("✅ Reloaded challenge progress data")
        }

        // Update recent progress data for chart
        if (recentResult.data) {
          const progressWithTargets = recentResult.data.map((progress) => {
            const progressDay = getChallengeDay(progress.date)
            const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats || 50
            return {
              ...progress,
              target_squats: target,
            }
          })
          setProgressData(progressWithTargets)
          console.log("✅ Reloaded recent progress data for chart")
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
      console.log(`💾 Saving ${newTotalSquats} total squats to local storage`)
      
      storage.updateTodayProgress(newTotalSquats)
      setTodaySquats(newTotalSquats)
      console.log("✅ Saved to local storage")

      // Update challenge progress data for local storage
      const challengeProgress = storage.getChallengeProgress()
      const challengeProgressWithTargets = challengeProgress.map((progress) => {
        const progressDay = getChallengeDay(progress.date)
        const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats || 50
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
    console.log("🔍 Sign out button clicked")
    try {
      if (!auth) {
        console.error("❌ Auth client not available")
        return
      }
      console.log("🔍 Calling auth.signOut()...")
      const result = await auth.signOut()
      console.log("🔍 Sign out result:", result)
      console.log("👋 User signed out successfully")
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
    console.log(`📅 Clicked on day: ${date}, current: ${currentSquats}, target: ${target}`)
    setSelectedEditDate(date)
    setSelectedEditSquats(currentSquats)
    setModalOpenedFromChart(true)
    setEditDayModalOpen(true)
  }

  // Handle saving edited day squats
  const handleSaveEditedDay = async (date: string, squats: number) => {
    console.log(`💾 Saving ${squats} squats for date ${date}`)
    
    const challengeDay = getChallengeDay(date)
    const target = dailyTargets.find((t) => t.day === challengeDay)?.target_squats || 50

    if (dataSource === "supabase" && user) {
      // Save to Supabase
      try {
        await database.updateUserProgress(user.id, date, squats, target)
        console.log("✅ Saved edited day to Supabase")
        
        // Reload both challenge progress AND recent progress to update all displays
        const [challengeResult, recentResult] = await Promise.all([
          database.getChallengeProgress(user.id),
          database.getUserProgress(user.id, 7)
        ])

        // Update challenge progress data for stats
        if (challengeResult.data) {
          const challengeProgressWithTargets = challengeResult.data.map((progress) => {
            const progressDay = getChallengeDay(progress.date)
            const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats || 50
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
            const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats || 50
            return {
              ...progress,
              target_squats: target,
            }
          })
          setProgressData(progressWithTargets)
        }

        // If editing today's date, update today's squats
        if (date === currentDate) {
          setTodaySquats(squats)
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
      console.log(`💾 Saving ${squats} squats for ${date} to local storage`)
      
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
        const target = dailyTargets.find((t) => t.day === progressDay)?.target_squats || 50
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

      // If editing today's date, update today's squats
      if (date === currentDate) {
        setTodaySquats(squats)
      }

      console.log("✅ Saved edited day to local storage")
    }
  }

  // Memoize expensive calculations to prevent unnecessary recalculations
  const totalSquats = useMemo(() => {
    return challengeProgressData.reduce((acc, day) => acc + day.squats_completed, 0)
  }, [challengeProgressData])

  const currentStreak = useMemo(() => {
    const streak = calculateStreak(challengeProgressData)
    console.log(`🔥 Streak calculation triggered:`, {
      dataLength: challengeProgressData.length,
      calculatedStreak: streak,
      recentDays: challengeProgressData.slice(-5).map(d => ({
        date: d.date,
        squats: d.squats_completed,
        target: d.target_squats,
        completed: d.squats_completed >= d.target_squats && d.target_squats > 0
      }))
    })
    return streak
  }, [challengeProgressData])

  // Stable props for LeaderboardPreview to prevent constant re-renders
  const leaderboardProps = useMemo(() => ({
    refreshTrigger: leaderboardRefreshTrigger,
    userTotalSquats: totalSquats,
    userTodaySquats: todaySquats,
    userDisplayName: effectiveUserProfile?.display_name,
    userStreak: currentStreak, // Pass the correct current streak
    dataSource: dataSource === "local" ? "localStorage" as const : "supabase" as const
  }), [leaderboardRefreshTrigger, totalSquats, todaySquats, effectiveUserProfile?.display_name, currentStreak, dataSource])

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
    if (challengeComplete) {
      return CHALLENGE_CONFIG.TOTAL_DAYS // Show final day instead of current day
    }
    return Math.min(currentDay, CHALLENGE_CONFIG.TOTAL_DAYS)
  }, [challengeComplete, currentDay])

  const displayDayText = useMemo(() => {
    if (challengeComplete) {
      return `Challenge Complete (${CHALLENGE_CONFIG.TOTAL_DAYS} days)`
    }
    return `Day ${displayDay} of ${CHALLENGE_CONFIG.TOTAL_DAYS}`
  }, [challengeComplete, displayDay])

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
  }, [currentDate])

  useEffect(() => {
    const checkDateChange = () => {
      const newDate = new Date().toISOString().split("T")[0]
      console.log(`🔍 Debug: Checking date change - Current: ${currentDateRef.current}, New: ${newDate}`)
      
      if (newDate !== currentDateRef.current) {
        console.log(`📅 Date changed from ${currentDateRef.current} to ${newDate}`)
        setCurrentDate(newDate)
      } else {
        // Force update current date to trigger recalculation
        console.log(`🔄 Force refreshing current date: ${newDate}`)
        setCurrentDate(newDate)
      }
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
    // Debug: Force check the current date
    const actualToday = new Date().toISOString().split("T")[0]
    console.log(`🔍 DEBUG: currentDate state = ${currentDate}, actual today = ${actualToday}`)
    
    // If there's a mismatch, force update
    if (currentDate !== actualToday) {
      console.log(`❌ Date mismatch detected! Forcing update to ${actualToday}`)
      setCurrentDate(actualToday)
      return // Exit early, this will retrigger the effect
    }
    
    const newCurrentDay = getChallengeDay(currentDate)
    setCurrentDay(newCurrentDay)
    console.log(`📅 Updated to challenge day ${newCurrentDay} for date ${currentDate}`)
    console.log(`📅 Challenge started: ${CHALLENGE_CONFIG.START_DATE}, Current: ${currentDate}`)
    console.log(`📅 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
    
    // Debug the math manually
    const [startYear, startMonth, startDay] = CHALLENGE_CONFIG.START_DATE.split('-').map(Number)
    const [currentYear, currentMonth, currentDay] = currentDate.split('-').map(Number)
    const startDate = new Date(startYear, startMonth - 1, startDay, 12, 0, 0)
    const currentDateObj = new Date(currentYear, currentMonth - 1, currentDay, 12, 0, 0)
    const diffTime = currentDateObj.getTime() - startDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const calculatedDay = Math.max(1, Math.min(diffDays + 1, CHALLENGE_CONFIG.TOTAL_DAYS))
    console.log(`🔢 Manual calculation: ${CHALLENGE_CONFIG.START_DATE} → ${currentDate} = ${diffDays} days = Day ${calculatedDay}`)
  }, [currentDate])

  // Separate effect for data reloading with throttling to prevent loops
  const lastDataReloadRef = useRef<string>("")
  
  useEffect(() => {
    // Only reload data if the date actually changed and enough time has passed
    if (currentDate !== lastDataReloadRef.current && !isLoading && !isReloadingData && (dataSource === "supabase" || dataSource === "local")) {
      console.log("🔄 Date changed - reloading data for new day")
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
                  console.log("🔧 Manual skip triggered by user")
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
              About / Donations
            </Button>
            <Button variant="ghost" size="sm" className="glass-subtle text-xs" onClick={scrollToLeaderboard}>
              <Users className="w-3 h-3 mr-1" />
              Leaderboard
            </Button>
            {/* Temporary debug button */}
            {currentDay !== 18 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0]
                  console.log(`🔧 MANUAL FIX: Forcing date to ${today}`)
                  setCurrentDate(today)
                }} 
                className="glass-subtle text-xs border-red-500 text-red-600"
              >
                🔧 Fix Day (Debug)
              </Button>
            )}
          </div>
        </div>

        {/* Testing Notice */}
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

        {/* Challenge Complete Message */}
        {challengeComplete && (
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
                About / Donations
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
                <p>
                  <strong>📊 Stats:</strong> All progress and stats only count squats completed during the official challenge period.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Centered Content Layout */}
        <div className="space-y-4 md:space-y-6 max-w-5xl mx-auto">
          {/* Only show squat dial and daily target if challenge is not complete */}
          {!challengeComplete && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Squat Dial */}
              <Card className="glass-strong">
                <CardContent className="p-4 md:p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Squat Dial</h2>
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
          />

          {/* Progress Chart */}
                      <ProgressChart 
              data={challengeProgressData} 
              dailyTargets={dailyTargets} 
              onDayClick={handleDayClick}
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

        {/* Footer */}
        <FooterFloat />
      </div>
    </div>
  )
}

function calculateStreak(progressData: any[]): number {
  if (progressData.length === 0) return 0

  const today = new Date().toISOString().split("T")[0]
  const currentDay = getChallengeDay(today)
  
  let streak = 0
  
  console.log(`🔥 calculateStreak: Starting calculation for day ${currentDay} (${today})`)
  
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
    
    const dayProgress = progressData.find(p => p.date === dateStr)
    
    console.log(`🔥 Day ${day} (${dateStr}):`, {
      found: !!dayProgress,
      squats: dayProgress?.squats_completed || 0,
      target: dayProgress?.target_squats || 0,
      isCompleted: dayProgress && dayProgress.squats_completed >= dayProgress.target_squats && dayProgress.target_squats > 0
    })
    
    // Skip rest days (they don't break streak)
    if (dayProgress?.target_squats === 0) {
      console.log(`🔥 Day ${day}: Rest day - skipping`)
      continue
    }
    
    // Check if this day was completed
    const isCompleted = dayProgress && dayProgress.squats_completed >= dayProgress.target_squats && dayProgress.target_squats > 0
    
    if (isCompleted) {
      streak++
      console.log(`🔥 Day ${day}: Completed! Streak now: ${streak}`)
    } else {
      // As soon as we hit an incomplete day, the consecutive streak is broken
      console.log(`🔥 Day ${day}: Not completed, consecutive streak broken at: ${streak}`)
      break
    }
  }

  // Limit streak to challenge duration (can't have a streak longer than the challenge itself)
  const limitedStreak = Math.min(streak, 23)
  console.log(`🔥 Final consecutive streak: ${streak}, limited to: ${limitedStreak}`)
  return limitedStreak
}
