import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Export auth object
export const auth = supabase.auth

// Challenge configuration
export const CHALLENGE_CONFIG = {
  START_DATE: '2024-01-01',
  TOTAL_DAYS: 30
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
  return Math.max(1, Math.min(diffDays, CHALLENGE_CONFIG.TOTAL_DAYS))
}

export const getDateFromChallengeDay = (day: number): string => {
  const startDate = new Date(CHALLENGE_CONFIG.START_DATE)
  startDate.setDate(startDate.getDate() + day - 1)
  return startDate.toISOString().split('T')[0]
}

// Database operations
export const database = {
  getDailyTargets: async () => {
    if (!isSupabaseConfigured()) {
      // Return default targets for offline mode
      const defaultTargets = Array.from({ length: CHALLENGE_CONFIG.TOTAL_DAYS }, (_, i) => ({
        day: i + 1,
        target_squats: i % 7 === 6 ? 0 : 50 // Rest day every 7th day
      }))
      return { data: defaultTargets, error: null }
    }

    try {
      const { data, error } = await supabase
        .from('daily_targets')
        .select('*')
        .order('day')
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

// Simplified authentication using Supabase's built-in OTP system
export const sendLoginCode = async (email: string, displayName?: string) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please check your environment variables.')
  }

  try {
    console.log('📧 Sending login code to:', email)
    
    // Check if user exists
    const { exists } = await database.checkUserExists(email)
    const isNewUser = !exists
    
    console.log(`👤 Is new user: ${isNewUser}`)
    
    if (isNewUser && displayName) {
      // For new users, we'll use signUp with email confirmation
      const { data, error } = await supabase.auth.signUp({
        email,
        password: 'temp-password-' + Math.random(), // Temporary password, user will use OTP
        options: {
          data: {
            display_name: displayName
          }
        }
      })
      
      if (error) {
        console.error('❌ Error creating user:', error)
        throw error
      }
      
      console.log('✅ New user created, confirmation email sent')
      return { success: true, isNewUser: true }
    } else {
      // For existing users or new users without display name, use OTP
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: !isNewUser, // Only create if new user
          data: displayName ? { display_name: displayName } : undefined
        }
      })
      
      if (error) {
        console.error('❌ Error sending OTP:', error)
        throw error
      }
      
      console.log('✅ OTP sent successfully')
      return { success: true, isNewUser }
    }
    
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
    console.log('🔐 Verifying login code for:', email)
    
    // Verify the OTP token
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
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
      
      console.log('✅ User verified and signed in')
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