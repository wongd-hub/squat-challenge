'use client';

import { useState, useEffect } from 'react';
import { SquatDial } from '@/components/SquatDial';
import { DailyTarget } from '@/components/DailyTarget';
import { ProgressChart } from '@/components/ProgressChart';
import { StatsOverview } from '@/components/StatsOverview';
import { LeaderboardPreview } from '@/components/LeaderboardPreview';
import AuthModal from '@/components/AuthModal';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { storage, database, auth, isSupabaseConfigured, getChallengeDay, getDateFromChallengeDay, CHALLENGE_CONFIG } from '@/lib/supabase';
import { Calendar, Info, Users, LogOut, User } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [todaySquats, setTodaySquats] = useState(0);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [dailyTargets, setDailyTargets] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local');

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      if (!isSupabaseConfigured()) {
        console.log('🔄 Supabase not configured, using local storage mode');
        setDataSource('local');
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔍 Checking authentication status...');
        const session = await auth.getSession();
        if (session?.data?.session?.user) {
          const currentUser = session.data.session.user;
          console.log('✅ User session found:', currentUser.email);
          setUser(currentUser);
          setDataSource('supabase');
          
          // Get user profile for display name
          if (currentUser.user_metadata?.display_name) {
            setUserProfile({ display_name: currentUser.user_metadata.display_name });
          }
        } else {
          console.log('🔄 No user session found, using local storage');
          setDataSource('local');
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        setDataSource('local');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    if (isSupabaseConfigured()) {
      const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in:', session.user.email);
          setUser(session.user);
          setDataSource('supabase');
          
          // Get user profile for display name
          if (session.user.user_metadata?.display_name) {
            setUserProfile({ display_name: session.user.user_metadata.display_name });
          }
          
          // Reload data from Supabase
          loadData();
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          setUser(null);
          setUserProfile(null);
          setDataSource('local');
          
          // Reload data from local storage
          loadData();
        }
      });

      return () => subscription?.unsubscribe();
    }
  }, []);

  // Load daily targets from database or fallback
  const loadDailyTargets = async () => {
    try {
      console.log('📊 Loading daily targets...');
      const { data, error } = await database.getDailyTargets();
      if (data && !error) {
        setDailyTargets(data);
        console.log(`✅ Loaded ${data.length} daily targets from ${dataSource}`);
      } else {
        console.error('❌ Error loading daily targets:', error);
      }
    } catch (error) {
      console.error('❌ Error loading daily targets:', error);
    }
  };

  // Load all data
  const loadData = async () => {
    await loadDailyTargets();

    const today = new Date().toISOString().split('T')[0];
    const challengeDay = getChallengeDay(today);
    setCurrentDay(challengeDay);
    console.log(`📅 Today is challenge day ${challengeDay}`);

    if (dataSource === 'supabase' && user) {
      // Load from Supabase
      try {
        console.log('📡 Loading user data from Supabase...');
        const { data: userProgress } = await database.getUserProgress(user.id, 7);
        if (userProgress) {
          setProgressData(userProgress);
          const todayProgress = userProgress.find(p => p.date === today);
          setTodaySquats(todayProgress?.squats_completed || 0);
          console.log('✅ Loaded user progress from Supabase');
        }
      } catch (error) {
        console.error('❌ Error loading Supabase data:', error);
        // Fallback to local storage
        loadLocalData();
      }
    } else {
      // Load from local storage
      loadLocalData();
    }
  };

  const loadLocalData = () => {
    console.log('💾 Loading data from local storage...');
    const today = storage.getTodayProgress();
    setTodaySquats(today);

    const savedProgress = storage.getUserProgress();
    if (savedProgress.length === 0) {
      // Generate sample data for demo
      const sampleData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toISOString().split('T')[0],
          squats_completed: Math.floor(Math.random() * 40) + 10,
          target_squats: 50
        };
      });
      setProgressData(sampleData);
    } else {
      setProgressData(savedProgress.slice(-7)); // Last 7 days
    }
    console.log('✅ Loaded data from local storage');
  };

  // Get today's target
  const todayTarget = dailyTargets.find(t => t.day === currentDay)?.target_squats || 50;

  useEffect(() => {
    if (!isLoading) {
      loadData();
    }
  }, [isLoading, dataSource, user]);

  const handleSquatsUpdate = async (newSquats: number) => {
    setTodaySquats(newSquats);
    const today = new Date().toISOString().split('T')[0];

    if (dataSource === 'supabase' && user) {
      // Save to Supabase
      try {
        await database.updateUserProgress(user.id, today, newSquats, todayTarget);
        console.log('✅ Saved to Supabase');
      } catch (error) {
        console.error('❌ Error saving to Supabase:', error);
        // Fallback to local storage
        storage.updateTodayProgress(newSquats);
      }
    } else {
      // Save to local storage
      storage.updateTodayProgress(newSquats);
      console.log('✅ Saved to local storage');
    }
    
    // Update progress data
    const updatedProgress = [...progressData];
    const todayIndex = updatedProgress.findIndex(p => p.date === today);
    
    if (todayIndex >= 0) {
      updatedProgress[todayIndex].squats_completed = newSquats;
    } else {
      updatedProgress.push({
        date: today,
        squats_completed: newSquats,
        target_squats: todayTarget
      });
    }
    
    setProgressData(updatedProgress.slice(-7));
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      console.log('👋 User signed out');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const handleAuthSuccess = (authUser: any) => {
    setUser(authUser);
    if (authUser.user_metadata?.display_name) {
      setUserProfile({ display_name: authUser.user_metadata.display_name });
    }
  };

  const totalSquats = progressData.reduce((acc, day) => acc + day.squats_completed, 0);
  const currentStreak = calculateStreak(progressData);
  const weeklyGoal = 350; // 50 squats × 7 days
  const weeklyProgress = progressData.reduce((acc, day) => acc + day.squats_completed, 0);

  // Get display name for user
  const getDisplayName = () => {
    if (userProfile?.display_name) {
      return userProfile.display_name;
    }
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
        {/* Mobile-Optimized Header */}
        <div className="mb-6 md:mb-8">
          {/* Top Row - Title and Controls */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Squat Challenge
              </h1>
              <p className="text-sm md:text-lg text-muted-foreground mt-1">
                Build strength, track progress, and crush your goals
              </p>
            </div>
            
            {/* Controls - Stacked on mobile */}
            <div className="flex flex-col items-end gap-2 ml-4">
              <div className="flex items-center gap-2">
                {user ? (
                  <>
                    <Badge variant="outline" className="glass-subtle text-xs">
                      <User className="w-3 h-3 mr-1" />
                      {getDisplayName()}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={handleSignOut} className="glass-subtle w-8 h-8">
                      <LogOut className="w-3 h-3" />
                    </Button>
                  </>
                ) : isSupabaseConfigured() && (
                  <AuthModal onAuthSuccess={handleAuthSuccess}>
                    <Button variant="ghost" size="sm" className="glass-subtle text-xs px-2 py-1">
                      <User className="w-3 h-3 mr-1" />
                      Sign In
                    </Button>
                  </AuthModal>
                )}
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Status Badges Row - Centered on desktop */}
          <div className="flex flex-wrap justify-center md:justify-center gap-2 mb-4">
            <Badge variant="outline" className="text-xs glass-subtle">
              <Calendar className="w-3 h-3 mr-1" />
              Day {currentDay} of {CHALLENGE_CONFIG.TOTAL_DAYS}
            </Badge>
            <Badge variant="outline" className={`text-xs ${dataSource === 'supabase' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'}`}>
              {dataSource === 'supabase' ? '📡 Online' : '💾 Offline'}
            </Badge>
          </div>

          {/* Action Buttons Row - Centered on desktop */}
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfo(!showInfo)}
              className="glass-subtle text-xs"
            >
              <Info className="w-3 h-3 mr-1" />
              How it works
            </Button>
            <Link href="/leaderboard">
              <Button variant="ghost" size="sm" className="glass-subtle text-xs">
                <Users className="w-3 h-3 mr-1" />
                Leaderboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Data Source Info */}
        {!isSupabaseConfigured() && (
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

        {/* How it works info */}
        {showInfo && (
          <Card className="mb-6 md:mb-8 glass-strong max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                How to Use the Squat Dial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>🎯 <strong>Set your reps:</strong> Drag the dial clockwise to count squats. Each full revolution = 10 squats.</p>
              <p>🔄 <strong>Remove squats:</strong> Drag the dial counter-clockwise to subtract squats from your daily total.</p>
              <p>💾 <strong>Bank your squats:</strong> Click "Bank Squats" to add the counted squats to your daily total.</p>
              <p>📈 <strong>Track progress:</strong> Your daily totals are saved and displayed in the progress chart.</p>
              <p>🏆 <strong>{CHALLENGE_CONFIG.TOTAL_DAYS}-Day Challenge:</strong> Complete daily targets that vary each day - some days are rest days (0 squats)!</p>
              <p>📅 <strong>Challenge Period:</strong> {CHALLENGE_CONFIG.START_DATE} to {getDateFromChallengeDay(CHALLENGE_CONFIG.TOTAL_DAYS)}</p>
              <p>🔐 <strong>Easy Sign In:</strong> No passwords needed! Just enter your email and we'll send you a 6-digit code to sign in.</p>
            </CardContent>
          </Card>
        )}

        {/* Centered Content Layout */}
        <div className="space-y-6 md:space-y-8 max-w-5xl mx-auto">
          {/* Mobile-First Layout: Squat Dial at Top, Desktop: Side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Squat Dial */}
            <Card className="glass-strong">
              <CardContent className="p-4 md:p-8">
                <div className="text-center mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Squat Dial</h2>
                  <p className="text-sm md:text-base text-muted-foreground">Drag clockwise to add, counter-clockwise to subtract</p>
                </div>
                <SquatDial
                  onSquatsChange={handleSquatsUpdate}
                  currentSquats={todaySquats}
                  targetSquats={todayTarget}
                  currentDay={currentDay}
                  compact={false}
                />
              </CardContent>
            </Card>

            {/* Daily Target */}
            <DailyTarget
              targetSquats={todayTarget}
              completedSquats={todaySquats}
              day={currentDay}
            />
          </div>

          {/* Stats Overview - Single Row on Desktop */}
          <StatsOverview
            totalSquats={totalSquats}
            streak={currentStreak}
            weeklyGoal={weeklyGoal}
            weeklyProgress={weeklyProgress}
          />

          {/* Progress Chart */}
          <ProgressChart data={progressData} dailyTargets={dailyTargets} />

          {/* Leaderboard Preview */}
          <LeaderboardPreview />
        </div>
      </div>
    </div>
  );
}

function calculateStreak(progressData: any[]): number {
  if (progressData.length === 0) return 0;
  
  const sortedData = [...progressData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let streak = 0;
  
  for (const day of sortedData) {
    if (day.squats_completed >= day.target_squats) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}