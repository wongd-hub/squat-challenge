import { createClient } from "@supabase/supabase-js"

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Configuration check with reduced logging
let configCheckLogged = false
export function isSupabaseConfigured(): boolean {
  const hasUrl = !!supabaseUrl
  const hasKey = !!supabaseAnonKey
  const urlValid = supabaseUrl ? supabaseUrl.startsWith("https://") && supabaseUrl.includes(".supabase.co") : false
  const keyValid = supabaseAnonKey ? supabaseAnonKey.length > 100 : false

  // Only log configuration check once to reduce console spam
  if (!configCheckLogged) {
    configCheckLogged = true
  }

  return hasUrl && hasKey && urlValid && keyValid
}

// Create Supabase client
export const supabase = isSupabaseConfigured() ? createClient(supabaseUrl!, supabaseAnonKey!) : null

// Auth client
export const auth = supabase?.auth



// Challenge configuration
export const CHALLENGE_CONFIG = {
  START_DATE: process.env.NEXT_PUBLIC_CHALLENGE_START_DATE || "2025-06-15",
  TOTAL_DAYS: parseInt(process.env.NEXT_PUBLIC_CHALLENGE_TOTAL_DAYS || "23"),
  DAILY_TARGETS: [
    { day: 1, target_squats: 120 },
    { day: 2, target_squats: 75 },
    { day: 3, target_squats: 140 },
    { day: 4, target_squats: 143 },
    { day: 5, target_squats: 0 }, // Rest day
    { day: 6, target_squats: 128 },
    { day: 7, target_squats: 103 },
    { day: 8, target_squats: 170 },
    { day: 9, target_squats: 167 },
    { day: 10, target_squats: 130 },
    { day: 11, target_squats: 200 },
    { day: 12, target_squats: 0 }, // Rest day
    { day: 13, target_squats: 163 },
    { day: 14, target_squats: 174 },
    { day: 15, target_squats: 160 },
    { day: 16, target_squats: 170 },
    { day: 17, target_squats: 210 },
    { day: 18, target_squats: 191 },
    { day: 19, target_squats: 0 }, // Rest day
    { day: 20, target_squats: 220 },
    { day: 21, target_squats: 170 },
    { day: 22, target_squats: 230 },
    { day: 23, target_squats: 150 },
  ],
}

// Helper functions
export function getLocalDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getChallengeDay(date: string): number {
  // Parse dates consistently by creating them as local dates at noon to avoid timezone issues
  const [startYear, startMonth, startDay] = CHALLENGE_CONFIG.START_DATE.split('-').map(Number)
  const [currentYear, currentMonth, currentDay] = date.split('-').map(Number)
  
  const startDate = new Date(startYear, startMonth - 1, startDay, 12, 0, 0) // noon local time
  const currentDate = new Date(currentYear, currentMonth - 1, currentDay, 12, 0, 0) // noon local time
  
  const diffTime = currentDate.getTime() - startDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.min(diffDays + 1, CHALLENGE_CONFIG.TOTAL_DAYS))
}

export function getDateFromChallengeDay(day: number): string {
  // Parse start date consistently as local date
  const [startYear, startMonth, startDay] = CHALLENGE_CONFIG.START_DATE.split('-').map(Number)
  const startDate = new Date(startYear, startMonth - 1, startDay, 12, 0, 0) // noon local time
  
  const targetDate = new Date(startDate)
  targetDate.setDate(startDate.getDate() + day - 1)
  
  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  const dayStr = String(targetDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${dayStr}`
}

export function isChallengeComplete(): boolean {
  const today = getLocalDateString()
  const endDate = getDateFromChallengeDay(CHALLENGE_CONFIG.TOTAL_DAYS)
  return today > endDate
}

export function isBeforeChallengeStart(): boolean {
  const today = getLocalDateString()
  return today < CHALLENGE_CONFIG.START_DATE
}

// Database functions
export const database = {
  async getDailyTargets() {
    if (!supabase) {
      return { data: CHALLENGE_CONFIG.DAILY_TARGETS, error: null }
    }

    try {
      const { data, error } = await supabase.from("daily_targets").select("*").order("day")

      if (error) {
        console.warn("⚠️ Database not available, using hardcoded targets:", error.message)
        return { data: CHALLENGE_CONFIG.DAILY_TARGETS, error: null }
      }
      
      if (data && data.length > 0) {
        return { data, error: null }
      } else {
        return { data: CHALLENGE_CONFIG.DAILY_TARGETS, error: null }
      }
    } catch (error) {
      console.warn("⚠️ Database connection failed, using hardcoded targets")
      return { data: CHALLENGE_CONFIG.DAILY_TARGETS, error: null }
    }
  },

  async getUserProgress(userId: string, limit?: number) {
    if (!supabase) return { data: [], error: "Supabase not configured" }

    try {
      let query = supabase.from("user_progress").select("*").eq("user_id", userId).order("date", { ascending: false })

      if (limit) query = query.limit(limit)

      const { data, error } = await query
      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error("Database error:", error)
      return { data: [], error }
    }
  },

  async getChallengeProgress(userId: string) {
    if (!supabase) return { data: [], error: "Supabase not configured" }

    try {
      const startDate = CHALLENGE_CONFIG.START_DATE
      const endDate = getDateFromChallengeDay(CHALLENGE_CONFIG.TOTAL_DAYS)

      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date")

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error("Database error:", error)
      return { data: [], error }
    }
  },

  async updateUserProgress(userId: string, date: string, squats: number, target: number) {
    if (!supabase) throw new Error("Supabase not configured")

    try {
      // First, try to update existing record
      const { data: updateData, error: updateError } = await supabase
        .from("user_progress")
        .update({
          squats_completed: squats,
          target_squats: target,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('date', date)
        .select()

      // If update succeeded (row existed), return
      if (!updateError && updateData && updateData.length > 0) {
        return { data: updateData, error: null }
      }

      // If no rows were updated (record doesn't exist), insert new one
      const { data: insertData, error: insertError } = await supabase
        .from("user_progress")
        .insert({
          user_id: userId,
          date: date,
          squats_completed: squats,
          target_squats: target,
        })
        .select()

      if (insertError) {
        console.error("❌ Error inserting user progress:", insertError)
        throw insertError
      }

      return { data: insertData, error: null }
    } catch (error) {
      console.error("❌ Exception in updateUserProgress:", error)
      throw error
    }
  },

  // Leaderboard functions with reduced logging
  async getTotalLeaderboard() {
    if (!supabase) return { data: [], error: "Supabase not configured" }

    try {
      // Calculate challenge date range
      const startDate = CHALLENGE_CONFIG.START_DATE
      const endDate = getDateFromChallengeDay(CHALLENGE_CONFIG.TOTAL_DAYS)
      
      const { data, error } = await supabase.rpc('get_total_leaderboard', {
        start_date: startDate,
        end_date: endDate
      })
      
      if (error) {
        console.warn("⚠️ Leaderboard not available:", error.message)
        return { data: [], error: null }
      }

      if (!data || data.length === 0) {
        return { data: [], error: null }
      }

      // Get streaks for each user with timeout protection

      const leaderboardWithStreaks = await Promise.allSettled(
        data.map(async (entry: any) => {
          try {
            const { data: streakData, error: streakError } = await supabase.rpc('calculate_user_streak', { 
              input_user_id: entry.user_id,
              challenge_start_date: CHALLENGE_CONFIG.START_DATE,
              total_challenge_days: CHALLENGE_CONFIG.TOTAL_DAYS
            })
            
            if (streakError) {
              console.error("❌ Streak calculation error for user", entry.user_id, ":", streakError)
            }
            
            return {
              id: entry.user_id,
              name: entry.display_name,
              email: entry.email,
              totalSquats: Number(entry.total_squats),
              daysActive: Number(entry.days_active),
              streak: streakError ? 0 : (streakData || 0),
            }
          } catch (error) {
            console.error("❌ Exception calculating streak for user", entry.user_id, ":", error)
            return {
              id: entry.user_id,
              name: entry.display_name,
              email: entry.email,
              totalSquats: Number(entry.total_squats),
              daysActive: Number(entry.days_active),
              streak: 0,
            }
          }
        })
      )

      // Filter successful results
      const successfulResults = leaderboardWithStreaks
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)

      return { data: successfulResults, error: null }
    } catch (error) {
      console.warn("⚠️ Leaderboard service unavailable")
      return { data: [], error: null }
    }
  },

  async getDailyLeaderboard(date?: string) {
    if (!supabase) return { data: [], error: "Supabase not configured" }

    try {
      const targetDate = date || new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('user_progress')
        .select(`
          user_id,
          squats_completed,
          profiles!inner(display_name, email)
        `)
        .eq('date', targetDate)
        .order('squats_completed', { ascending: false })

      if (error) {
        console.warn("⚠️ Daily leaderboard not available:", error.message)
        return { data: [], error: null }
      }

      if (!data || data.length === 0) {
        return { data: [], error: null }
      }

      // Get streaks for each user with timeout protection
      const dailyLeaderboard = await Promise.allSettled(
        data.map(async (entry: any) => {
          try {
            const { data: streakData, error: streakError } = await supabase.rpc('calculate_user_streak', { 
              input_user_id: entry.user_id,
              challenge_start_date: CHALLENGE_CONFIG.START_DATE,
              total_challenge_days: CHALLENGE_CONFIG.TOTAL_DAYS
            })
            return {
              id: entry.user_id,
              name: entry.profiles.display_name,
              email: entry.profiles.email,
              todaySquats: entry.squats_completed,
              streak: streakError ? 0 : (streakData || 0),
            }
          } catch (error) {
            return {
              id: entry.user_id,
              name: entry.profiles.display_name,
              email: entry.profiles.email,
              todaySquats: entry.squats_completed,
              streak: 0,
            }
          }
        })
      )

      // Filter successful results
      const successfulResults = dailyLeaderboard
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)

      return { data: successfulResults, error: null }
    } catch (error) {
      console.warn("⚠️ Daily leaderboard service unavailable")
      return { data: [], error: null }
    }
  },

  async getFullLeaderboard(date?: string) {
    if (!supabase) return { data: [], error: "Supabase not configured" }

    try {
      // Get total leaderboard data
      const { data: totalData, error: totalError } = await this.getTotalLeaderboard()
      if (totalError) throw totalError

      // Get daily leaderboard data
      const { data: dailyData, error: dailyError } = await this.getDailyLeaderboard(date)
      if (dailyError) throw dailyError

      // Merge the data
      const fullLeaderboard = totalData.map(totalEntry => {
        const dailyEntry = dailyData.find(d => d.id === totalEntry.id)
        return {
          id: totalEntry.id,
          name: totalEntry.name,
          email: totalEntry.email,
          todaySquats: dailyEntry?.todaySquats || 0,
          totalSquats: totalEntry.totalSquats,
          streak: totalEntry.streak,
          daysActive: totalEntry.daysActive,
        }
      })

      // Add users who have daily data but not total data (new users)
      dailyData.forEach(dailyEntry => {
        if (!fullLeaderboard.find(f => f.id === dailyEntry.id)) {
          fullLeaderboard.push({
            id: dailyEntry.id,
            name: dailyEntry.name,
            email: dailyEntry.email,
            todaySquats: dailyEntry.todaySquats,
            totalSquats: dailyEntry.todaySquats, // Same as today if no history
            streak: dailyEntry.streak,
            daysActive: 1,
          })
        }
      })

      return { data: fullLeaderboard, error: null }
    } catch (error) {
      console.error("❌ Database error:", error)
      return { data: [], error }
    }
  },
}

// Storage functions
export const storage = {
  getTodayProgress(): number {
    if (typeof window === "undefined") return 0
    const today = getLocalDateString()
    const saved = localStorage.getItem(`squats_${today}`)
    return saved ? Number.parseInt(saved, 10) : 0
  },

  updateTodayProgress(squats: number): void {
    if (typeof window === "undefined") return
    const today = getLocalDateString()
    localStorage.setItem(`squats_${today}`, squats.toString())

    // Also update the progress history
    const history = this.getUserProgress()
    const existingIndex = history.findIndex((p) => p.date === today)
    const challengeDay = getChallengeDay(today)
    const target = CHALLENGE_CONFIG.DAILY_TARGETS.find((t) => t.day === challengeDay)?.target_squats || 50

    const progressEntry = {
      date: today,
      squats_completed: squats,
      target_squats: target,
    }

    if (existingIndex >= 0) {
      history[existingIndex] = progressEntry
    } else {
      history.push(progressEntry)
    }

    localStorage.setItem("squat_progress", JSON.stringify(history))
  },

  getUserProgress(): any[] {
    if (typeof window === "undefined") return []
    const saved = localStorage.getItem("squat_progress")
    return saved ? JSON.parse(saved) : []
  },

  getChallengeProgress(): any[] {
    const allProgress = this.getUserProgress()
    const startDate = CHALLENGE_CONFIG.START_DATE
    const endDate = getDateFromChallengeDay(CHALLENGE_CONFIG.TOTAL_DAYS)

    return allProgress.filter((p) => p.date >= startDate && p.date <= endDate)
  },

  calculateLocalStreak(): number {
    const progress = this.getUserProgress()
    if (progress.length === 0) return 0

    // Sort progress by date (most recent first)
    const sortedProgress = progress.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    let streak = 0
    const today = getLocalDateString()
    let currentDate = new Date()

    // Check each day going backwards from today
    for (let i = 0; i < 365; i++) { // Max 365 days to prevent infinite loop
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      const dayProgress = sortedProgress.find(p => p.date === dateStr)
      
      if (dayProgress && dayProgress.squats_completed > 0) {
        streak++
      } else {
        // No squats on this day, streak is broken
        break
      }
      
      // Move to previous day
      currentDate.setDate(currentDate.getDate() - 1)
    }

    return streak
  },
}

// Auth functions
export async function sendLoginCode(email: string, displayName?: string) {
  if (!supabase) throw new Error("Supabase not configured")

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        ...(displayName ? {
          data: {
            display_name: displayName,
          },
        } : {}),
      },
    })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error("Send login code error:", error)
    throw error
  }
}

export async function verifyLoginCode(email: string, token: string, displayName?: string) {
  if (!supabase) throw new Error("Supabase not configured")

  try {
    // For verification, we don't typically pass user data during OTP verification
    // The user data should be set after successful verification
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    })

    if (error) throw error

    // If this is a new user with a display name, update their profile
    if (data.user && displayName) {
      await updateUserProfile(data.user.id, { display_name: displayName, email })
    }

    return { success: true, data }
  } catch (error) {
    console.error("Verify login code error:", error)
    throw error
  }
}

export async function updateUserProfile(userId: string, profileData: { display_name: string; email: string }) {
  if (!supabase) throw new Error("Supabase not configured")

  try {
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email: profileData.email,
      display_name: profileData.display_name,
      updated_at: new Date().toISOString(),
    })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error("Update user profile error:", error)
    throw error
  }
}

export async function checkUserExists(email: string) {
  if (!supabase) {
    return { exists: false, profile: null }
  }

  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("email", email).single()

    // PGRST116 is "not found" error, which is expected when user doesn't exist
    if (error) {
      if (error.code === "PGRST116") {
        // User doesn't exist, this is normal
        return { exists: false, profile: null }
      }
      
      // Log actual errors but don't throw to allow auth flow to continue
      console.error("❌ Error in checkUserExists:", error)
      return { exists: false, profile: null }
    }

    return { exists: true, profile: data }
  } catch (error) {
    console.error("❌ Exception in checkUserExists:", error)
    return { exists: false, profile: null }
  }
}
