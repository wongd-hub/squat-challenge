import { createClient } from "@supabase/supabase-js"

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Configuration check
export function isSupabaseConfigured(): boolean {
  const hasUrl = !!supabaseUrl
  const hasKey = !!supabaseAnonKey
  const urlValid = supabaseUrl ? supabaseUrl.startsWith("https://") && supabaseUrl.includes(".supabase.co") : false
  const keyValid = supabaseAnonKey ? supabaseAnonKey.length > 100 : false

  console.log("🔧 Supabase configuration check:", {
    hasUrl,
    hasKey,
    urlValid,
    keyValid,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : "undefined",
    keyLength: supabaseAnonKey?.length || 0,
  })

  const configured = hasUrl && hasKey && urlValid && keyValid
  console.log("🔧 Supabase configured:", configured)

  return configured
}

// Create Supabase client
export const supabase = isSupabaseConfigured() ? createClient(supabaseUrl!, supabaseAnonKey!) : null

// Auth client
export const auth = supabase?.auth

// Additional debugging for client creation
if (typeof window !== 'undefined') {
  console.log("🔧 Supabase client creation:", {
    hasSupabase: !!supabase,
    hasAuth: !!auth,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 50)}...` : 'undefined',
    fullUrl: supabaseUrl, // Show the full URL for debugging
    keyLength: supabaseAnonKey?.length || 0,
    keyStart: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined'
  })
}

// Challenge configuration
export const CHALLENGE_CONFIG = {
  START_DATE: process.env.NEXT_PUBLIC_CHALLENGE_START_DATE || "2025-06-15",
  TOTAL_DAYS: parseInt(process.env.NEXT_PUBLIC_CHALLENGE_TOTAL_DAYS || "23"),
  DAILY_TARGETS: [
    { day: 1, target_squats: 50 },
    { day: 2, target_squats: 55 },
    { day: 3, target_squats: 60 },
    { day: 4, target_squats: 65 },
    { day: 5, target_squats: 70 },
    { day: 6, target_squats: 75 },
    { day: 7, target_squats: 0 }, // Rest day
    { day: 8, target_squats: 80 },
    { day: 9, target_squats: 85 },
    { day: 10, target_squats: 90 },
    { day: 11, target_squats: 95 },
    { day: 12, target_squats: 100 },
    { day: 13, target_squats: 105 },
    { day: 14, target_squats: 0 }, // Rest day
    { day: 15, target_squats: 110 },
    { day: 16, target_squats: 115 },
    { day: 17, target_squats: 120 },
    { day: 18, target_squats: 125 },
    { day: 19, target_squats: 130 },
    { day: 20, target_squats: 135 },
    { day: 21, target_squats: 0 }, // Rest day
    { day: 22, target_squats: 140 },
    { day: 23, target_squats: 150 },
  ],
}

// Helper functions
export function getChallengeDay(date: string): number {
  const startDate = new Date(CHALLENGE_CONFIG.START_DATE)
  const currentDate = new Date(date)
  const diffTime = currentDate.getTime() - startDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.min(diffDays + 1, CHALLENGE_CONFIG.TOTAL_DAYS))
}

export function getDateFromChallengeDay(day: number): string {
  const startDate = new Date(CHALLENGE_CONFIG.START_DATE)
  const targetDate = new Date(startDate)
  targetDate.setDate(startDate.getDate() + day - 1)
  return targetDate.toISOString().split("T")[0]
}

export function isChallengeComplete(): boolean {
  const today = new Date().toISOString().split("T")[0]
  const endDate = getDateFromChallengeDay(CHALLENGE_CONFIG.TOTAL_DAYS)
  return today > endDate
}

// Database functions
export const database = {
  async getDailyTargets() {
    if (!supabase) {
      return { data: CHALLENGE_CONFIG.DAILY_TARGETS, error: null }
    }

    try {
      const { data, error } = await supabase.from("daily_targets").select("*").order("day")

      if (error) throw error
      return { data: data || CHALLENGE_CONFIG.DAILY_TARGETS, error: null }
    } catch (error) {
      console.error("Database error:", error)
      return { data: CHALLENGE_CONFIG.DAILY_TARGETS, error }
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
    if (!supabase) return { error: "Supabase not configured" }

    console.log("💾 updateUserProgress called with:", {
      userId: userId?.substring(0, 8) + "...",
      date,
      squats,
      target
    })

    try {
      const upsertData = {
        user_id: userId,
        date,
        squats_completed: squats,
        target_squats: target,
        updated_at: new Date().toISOString(),
      }

      console.log("📤 Upserting data:", upsertData)

      // Try update first, then insert if no record exists
      const { data: existingData, error: selectError } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("date", date)
        .single()

      console.log("🔍 Existing record check:", { 
        hasExisting: !!existingData, 
        hasSelectError: !!selectError,
        selectErrorCode: selectError?.code 
      })

      let data, error

      if (existingData) {
        // Record exists, update it
        console.log("🔄 Updating existing record...")
        const result = await supabase
          .from("user_progress")
          .update({
            squats_completed: squats,
            target_squats: target,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("date", date)
          .select()
        
        data = result.data
        error = result.error
      } else {
        // No record exists, insert new one
        console.log("➕ Inserting new record...")
        const result = await supabase
          .from("user_progress")
          .insert(upsertData)
          .select()
        
        data = result.data
        error = result.error
      }

      console.log("📡 Upsert response:", { 
        hasData: !!data, 
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message,
        dataLength: data?.length
      })

      if (error) {
        console.error("❌ Supabase error in updateUserProgress:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: error
        })
        throw error
      }

      console.log("✅ Successfully updated user progress")
      return { error: null }
    } catch (error: unknown) {
      console.error("❌ Exception in updateUserProgress:", {
        error,
        errorType: typeof error,
        errorConstructor: error && typeof error === 'object' && 'constructor' in error ? error.constructor?.name : undefined,
        errorString: String(error),
        errorJSON: JSON.stringify(error, null, 2)
      })
      return { error }
    }
  },

  // Leaderboard functions
  async getTotalLeaderboard() {
    if (!supabase) return { data: [], error: "Supabase not configured" }

    try {
      console.log("🏆 Fetching total leaderboard...")
      
      // Calculate challenge date range
      const startDate = CHALLENGE_CONFIG.START_DATE
      const endDate = getDateFromChallengeDay(CHALLENGE_CONFIG.TOTAL_DAYS)
      
      console.log(`🗓️ Filtering leaderboard data from ${startDate} to ${endDate}`)
      
      const { data, error } = await supabase.rpc('get_total_leaderboard', {
        start_date: startDate,
        end_date: endDate
      })
      
      if (error) throw error

      // Get streaks for each user
      const leaderboardWithStreaks = await Promise.all(
        (data || []).map(async (entry: any) => {
          const { data: streakData } = await supabase.rpc('calculate_user_streak', { input_user_id: entry.user_id })
          return {
            id: entry.user_id,
            name: entry.display_name,
            email: entry.email,
            totalSquats: Number(entry.total_squats),
            daysActive: Number(entry.days_active),
            streak: streakData || 0,
          }
        })
      )

      console.log(`✅ Loaded ${leaderboardWithStreaks.length} total leaderboard entries (challenge period only)`)
      return { data: leaderboardWithStreaks, error: null }
    } catch (error) {
      console.error("❌ Database error:", error)
      return { data: [], error }
    }
  },

  async getDailyLeaderboard(date?: string) {
    if (!supabase) return { data: [], error: "Supabase not configured" }

    try {
      const targetDate = date || new Date().toISOString().split('T')[0]
      console.log("📅 Fetching daily leaderboard for:", targetDate)

      const { data, error } = await supabase
        .from('user_progress')
        .select(`
          user_id,
          squats_completed,
          profiles!inner(display_name, email)
        `)
        .eq('date', targetDate)
        .order('squats_completed', { ascending: false })

      if (error) throw error

      // Get streaks for each user and format data
      const dailyLeaderboard = await Promise.all(
        (data || []).map(async (entry: any) => {
          const { data: streakData } = await supabase.rpc('calculate_user_streak', { input_user_id: entry.user_id })
          return {
            id: entry.user_id,
            name: entry.profiles.display_name,
            email: entry.profiles.email,
            todaySquats: entry.squats_completed,
            streak: streakData || 0,
          }
        })
      )

      console.log(`✅ Loaded ${dailyLeaderboard.length} daily leaderboard entries`)
      return { data: dailyLeaderboard, error: null }
    } catch (error) {
      console.error("❌ Database error:", error)
      return { data: [], error }
    }
  },

  async getFullLeaderboard(date?: string) {
    if (!supabase) return { data: [], error: "Supabase not configured" }

    try {
      console.log("🏆 Fetching full leaderboard...")
      
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

      console.log(`✅ Loaded full leaderboard with ${fullLeaderboard.length} entries`)
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
    const today = new Date().toISOString().split("T")[0]
    const saved = localStorage.getItem(`squats_${today}`)
    return saved ? Number.parseInt(saved, 10) : 0
  },

  updateTodayProgress(squats: number): void {
    if (typeof window === "undefined") return
    const today = new Date().toISOString().split("T")[0]
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

// Test function to verify Supabase connection
export async function testSupabaseConnection() {
  if (!supabase) {
    console.log("❌ Supabase client not available for connection test")
    return false
  }

  try {
    console.log("🧪 Testing Supabase connection with simple query...")
    
    // First try a very basic query
    const { data, error } = await supabase.from("profiles").select("count", { count: "exact", head: true })
    
    console.log("🔍 Connection test raw response:", { data, error, hasError: !!error })
    
    if (error) {
      console.error("❌ Supabase connection test failed:", {
        error,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint,
        fullError: JSON.stringify(error, null, 2)
      })
      return false
    }
    
    console.log("✅ Supabase connection test successful")
    return true
  } catch (error: unknown) {
    console.error("❌ Supabase connection test exception:", {
      error,
      errorType: typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.stringify(error, null, 2)
    })
    return false
  }
}

export async function checkUserExists(email: string) {
  console.log("🔍 checkUserExists called with email:", email)
  
  if (!supabase) {
    console.log("❌ Supabase client not available")
    return { exists: false, profile: null }
  }

  console.log("✅ Supabase client available, making query...")
  
  // Test connection first
  const connectionOk = await testSupabaseConnection()
  if (!connectionOk) {
    console.log("🔄 Connection test failed, returning false")
    return { exists: false, profile: null }
  }

  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("email", email).single()

    console.log("📡 Supabase query response:", { 
      hasData: !!data, 
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message
    })

    // PGRST116 is "not found" error, which is expected when user doesn't exist
    if (error) {
      if (error.code === "PGRST116") {
        // User doesn't exist, this is normal
        console.log("👤 User not found (PGRST116) - this is normal for new users")
        return { exists: false, profile: null }
      }
      
      // Log the actual error for debugging
      console.error("❌ Supabase error in checkUserExists:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      })
      
      // Don't throw the error, just return false to allow the flow to continue
      console.log("🔄 Returning false due to Supabase error to allow auth flow to continue")
      return { exists: false, profile: null }
    }

    console.log("✅ User exists, returning profile data")
    return { exists: !!data, profile: data }
  } catch (error: unknown) {
    console.error("❌ Exception in checkUserExists:", {
      error,
      errorType: typeof error,
      errorConstructor: error && typeof error === 'object' && 'constructor' in error ? error.constructor?.name : undefined,
      errorString: String(error),
      errorJSON: JSON.stringify(error, null, 2)
    })
    
    // Return false to allow the flow to continue even if there's an error
    console.log("🔄 Returning false due to exception to allow auth flow to continue")
    return { exists: false, profile: null }
  }
}
