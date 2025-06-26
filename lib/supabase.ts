import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Export auth object
export const auth = supabase.auth

// Challenge configuration
export const CHALLENGE_CONFIG = {
  START_DATE: '2025-06-015', // Updated to 2025
  TOTAL_DAYS: 23 // Updated to match the database
}

// Utility function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-supabase-url' && supabaseAnonKey !== 'your-supabase-anon-key')
}

// Challenge day utilities
export const getChallengeDay = (dateString: string): number => {
  const startDate = new Date(CHALLENGE_CONFIG.START_DATE)
  const currentDate = new Date(dateString)
  const diffTime = currentDate.getTime() - startDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(1, diffDays)
}

export const getDateFromChallengeDay = (day: number): string => {
  const startDate = new Date(CHALLENGE_CONFIG.START_DATE)
  startDate.setDate(startDate.getDate() + day - 1)
  return startDate.toISOString().split('T')[0]
}

// Check if challenge is complete
export const isChallengeComplete = (): boolean => {
  const today = new Date().toISOString().split('T')[0]
  const currentDay = getChallengeDay(today)
  return currentDay > CHALLENGE_CONFIG.TOTAL_DAYS
}

// Database operations
export const database = {
  getDailyTargets: async () => {
    if (!isSupabaseConfigured()) {
      // Return the correct targets for offline mode (matching database)
      const defaultTargets = [
        { day: 1, target_squats: 120 }, { day: 2, target_squats: 75 }, { day: 3, target_squats: 140 },
        { day: 4, target_squats: 143 }, { day: 5, target_squats: 0 }, { day: 6, target_squats: 128 },
        { day: 7, target_squats: 103 }, { day: 8, target_squats: 170 }, { day: 9, target_squats: 167 },
        { day: 10, target_squats: 130 }, { day: 11, target_squats: 200 }, { day: 12, target_squats: 0 },
        { day: 13, target_squats: 163 }, { day: 14, target_squats: 174 }, { day: 15, target_squats: 160 },
        { day: 16, target_squats: 170 }, { day: 17, target_squats: 210 }, { day: 18, target_squats: 191 },
        { day: 19, target_squats: 0 }, { day: 20, target_squats: 220 }, { day: 21, target_squats: 170 },
        { day: 22, target_squats: 230 }, { day: 23, target_squats: 150 }
      ]
      return { data: defaultTargets, error: null }
    }

    try {
      const { data, error } = await supabase
        .from('daily_targets')
        .select('*')
        .order('day')
      
      console.log('📊 Loaded daily targets from Supabase:', data?.length || 0, 'targets')
      return { data, error }
    } catch (error) {
      console.error('Error fetching daily targets:', error)
      return { data: null, error }
    }
  },

  getUserProgress: async (userId: string, days: number = 7) => {
    if (!isSupabaseConfigured()) {
      return { data: [], error: null }
    }

    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(days)
      return { data, error }
    } catch (error) {
      console.error('Error fetching user progress:', error)
      return { data: null, error }
    }
  },

  updateUserProgress: async (userId: string, date: string, squatsCompleted: number, targetSquats: number) => {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase not configured') }
    }

    try {
      const { data, error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          date,
          squats_completed: squatsCompleted,
          target_squats: targetSquats
        })
        .select()
      return { data, error }
    } catch (error) {
      console.error('Error updating user progress:', error)
      return { data: null, error }
    }
  },

  // Create or update user profile
  createUserProfile: async (userId: string, email: string, displayName: string) => {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase not configured') }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email,
          display_name: displayName,
          updated_at: new Date().toISOString()
        })
        .select()
      return { data, error }
    } catch (error) {
      console.error('Error creating user profile:', error)
      return { data: null, error }
    }
  },

  // Check if user exists
  checkUserExists: async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { exists: false, error: null }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('email', email)
      
      if (error) {
        console.error('Error checking user existence:', error)
        return { exists: false, error }
      }
      
      const exists = data && data.length > 0
      const profile = exists ? data[0] : null
      
      return { exists, profile, error: null }
    } catch (error) {
      console.error('Error checking user existence:', error)
      return { exists: false, error }
    }
  }
}

// Local storage operations
export const storage = {
  getTodayProgress: (): number => {
    if (typeof window === 'undefined') return 0
    const today = new Date().toISOString().split('T')[0]
    const saved = localStorage.getItem(`squats_${today}`)
    return saved ? parseInt(saved, 10) : 0
  },

  updateTodayProgress: (squats: number): void => {
    if (typeof window === 'undefined') return
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem(`squats_${today}`, squats.toString())
    
    // Also update the progress history
    const progressKey = 'squat_progress_history'
    const existing = localStorage.getItem(progressKey)
    let history = existing ? JSON.parse(existing) : []
    
    // Update or add today's entry
    const todayIndex = history.findIndex((entry: any) => entry.date === today)
    const todayEntry = {
      date: today,
      squats_completed: squats,
      target_squats: 50
    }
    
    if (todayIndex >= 0) {
      history[todayIndex] = todayEntry
    } else {
      history.push(todayEntry)
    }
    
    // Keep only last 30 days
    history = history.slice(-30)
    localStorage.setItem(progressKey, JSON.stringify(history))
  },

  getUserProgress: (): any[] => {
    if (typeof window === 'undefined') return []
    const progressKey = 'squat_progress_history'
    const existing = localStorage.getItem(progressKey)
    return existing ? JSON.parse(existing) : []
  }
}

// Simplified authentication using ONLY 6-digit OTP codes
export const sendLoginCode = async (email: string, displayName?: string) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please check your environment variables.')
  }

  try {
    console.log('📧 Sending 6-digit OTP code to:', email)
    
    // ALWAYS use signInWithOtp - this sends a 6-digit code
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // Allow new user creation
        data: displayName ? { display_name: displayName } : undefined
      }
    })
    
    if (error) {
      console.error('❌ Error sending OTP:', error)
      throw error
    }
    
    console.log('✅ 6-digit OTP sent successfully')
    return { success: true }
    
  } catch (error) {
    console.error('❌ Error in sendLoginCode:', error)
    throw error
  }
}

export const verifyLoginCode = async (email: string, token: string, displayName?: string) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please check your environment variables.')
  }

  try {
    console.log('🔐 Verifying 6-digit OTP code for:', email)
    
    // Verify the OTP token
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email' // This verifies the 6-digit code
    })
    
    if (error) {
      console.error('❌ Error verifying OTP:', error)
      throw error
    }
    
    if (data.user) {
      // Create or update profile if needed
      if (displayName) {
        await database.createUserProfile(data.user.id, email, displayName)
      }
      
      console.log('✅ User verified and signed in with 6-digit code')
      return { success: true, data }
    }
    
    throw new Error('Verification failed')
    
  } catch (error) {
    console.error('❌ Error verifying login code:', error)
    throw error
  }
}

export const getCurrentUser = async () => {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error getting user:', error)
      return null
    }
    return user
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

export const signOut = async () => {
  if (!isSupabaseConfigured()) {
    return
  }

  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}