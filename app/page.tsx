'use client';

import { useState, useEffect, useRef } from 'react';
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
import { storage, database, auth, isSupabaseConfigured, getChallengeDay, getDateFromChallengeDay, CHALLENGE_CONFIG, isChallengeComplete } from '@/lib/supabase';
import { Calendar, Info, Users, LogOut, User, Trophy, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [todaySquats, setTodaySquats] = useState(0);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [challengeProgressData, setChallengeProgressData] = useState<any[]>([]); // Store challenge-only progress data
  const [currentDay, setCurrentDay] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [dailyTargets, setDailyTargets] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local');
  const [challengeComplete, setChallengeComplete] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [weightLiftingEmoji, setWeightLiftingEmoji] = useState('🏋️‍♂️');
  
  // Ref for leaderboard section
  const leaderboardRef = useRef<HTMLDivElement>(null);

  // Set random weight lifting emoji on mount
  useEffect(() => {
    const emojis = ['🏋️‍♂️', '🏋️‍♀️'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    setWeightLiftingEmoji(randomEmoji);
  }, []);

  // Handle scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 100;
      setIsScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Check if challenge is complete
  useEffect(() => {
    const checkChallengeStatus = () => {
      const isComplete = isChallengeComplete();
      setChallengeComplete(isComplete);
      console.log('🏁 Challenge complete status:', isComplete);
      
      if (isComplete) {
        console.log('🎉 Challenge has ended! Showing completion screen.');
      }
    };

    checkChallengeStatus();
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
        
        // Load recent progress for chart (last 7 days)
        const { data: recentProgress } = await database.getUserProgress(user.id, 7);
        if (recentProgress) {
          // Add target_squats to each progress entry by looking up from dailyTargets
          const progressWithTargets = recentProgress.map(progress => {
            const progressDay = getChallengeDay(progress.date);
            const target = dailyTargets.find(t => t.day === progressDay)?.target_squats || 50;
            return {
              ...progress,
              target_squats: target
            };
          });
          
          setProgressData(progressWithTargets);
          const todayProgress = progressWithTargets.find(p => p.date === today);
          setTodaySquats(todayProgress?.squats_completed || 0);
        }

        // Load ALL challenge progress for stats (challenge dates only)
        const { data: challengeProgress } = await database.getChallengeProgress(user.id);
        if (challengeProgress) {
          // Add target_squats to each challenge progress entry
          const challengeProgressWithTargets = challengeProgress.map(progress => {
            const progressDay = getChallengeDay(progress.date);
            const target = dailyTargets.find(t => t.day === progressDay)?.target_squats || 50;
            return {
              ...progress,
              target_squats: target
            };
          });
          
          setChallengeProgressData(challengeProgressWithTargets);
          console.log(`✅ Loaded ${challengeProgressWithTargets.length} challenge progress records from Supabase`);
          
          // Calculate total squats from challenge data
          const totalSquats = challengeProgressWithTargets.reduce((acc, day) => acc + day.squats_completed, 0);
          console.log(`📊 Total challenge squats: ${totalSquats}`);
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
      // Generate sample data for demo with higher values to show count-up effect
      const sampleData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const challengeDay = getChallengeDay(date.toISOString().split('T')[0]);
        const target = dailyTargets.find(t => t.day === challengeDay)?.target_squats || 50;
        
        return {
          date: date.toISOString().split('T')[0],
          squats_completed: Math.floor(Math.random() * 150) + 50, // Higher values: 50-200
          target_squats: target
        };
      });
      setProgressData(sampleData);
      setChallengeProgressData(sampleData); // For local storage, use same data
    } else {
      // Add target_squats to saved progress
      const progressWithTargets = savedProgress.map(progress => {
        const progressDay = getChallengeDay(progress.date);
        const target = dailyTargets.find(t => t.day === progressDay)?.target_squats || 50;
        return {
          ...progress,
          target_squats: target
        };
      });
      
      setProgressData(progressWithTargets.slice(-7)); // Last 7 days for chart
      
      // Get challenge progress from local storage
      const challengeProgress = storage.getChallengeProgress();
      const challengeProgressWithTargets = challengeProgress.map(progress => {
        const progressDay = getChallengeDay(progress.date);
        const target = dailyTargets.find(t => t.day === progressDay)?.target_squats || 50;
        return {
          ...progress,
          target_squats: target
        };
      });
      setChallengeProgressData(challengeProgressWithTargets);
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
        
        // Reload challenge progress to update stats
        const { data: challengeProgress } = await database.getChallengeProgress(user.id);
        if (challengeProgress) {
          const challengeProgressWithTargets = challengeProgress.map(progress => {
            const progressDay = getChallengeDay(progress.date);
            const target = dailyTargets.find(t => t.day === progressDay)?.target_squats || 50;
            return {
              ...progress,
              target_squats: target
            };
          });
          setChallengeProgressData(challengeProgressWithTargets);
        }
      } catch (error) {
        console.error('❌ Error saving to Supabase:', error);
        // Fallback to local storage
        storage.updateTodayProgress(newSquats);
      }
    } else {
      // Save to local storage
      storage.updateTodayProgress(newSquats);
      console.log('✅ Saved to local storage');
      
      // Update challenge progress data for local storage
      const challengeProgress = storage.getChallengeProgress();
      const challengeProgressWithTargets = challengeProgress.map(progress => {
        const progressDay = getChallengeDay(progress.date);
        const target = dailyTargets.find(t => t.day === progressDay)?.target_squats || 50;
        return {
          ...progress,
          target_squats: target
        };
      });
      setChallengeProgressData(challengeProgressWithTargets);
    }
    
    // Update progress data for chart
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

  // Function to scroll to leaderboard
  const scrollToLeaderboard = () => {
    leaderboardRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  // Calculate stats from CHALLENGE progress data only
  const totalSquats = challengeProgressData.reduce((acc, day) => acc + day.squats_completed, 0);
  const currentStreak = calculateStreak(challengeProgressData);
  
  // Calculate weekly progress (last 7 days within challenge period)
  const weeklyGoal = 850;
  const last7Days = challengeProgressData
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7);
  const weeklyProgress = last7Days.reduce((acc, day) => acc + day.squats_completed, 0);

  // Calculate display values based on challenge status
  const getDisplayDay = () => {
    if (challengeComplete) {
      return CHALLENGE_CONFIG.TOTAL_DAYS; // Show final day instead of current day
    }
    return Math.min(currentDay, CHALLENGE_CONFIG.TOTAL_DAYS);
  };

  const getDisplayDayText = () => {
    if (challengeComplete) {
      return `Challenge Complete (${CHALLENGE_CONFIG.TOTAL_DAYS} days)`;
    }
    return `Day ${getDisplayDay()} of ${CHALLENGE_CONFIG.TOTAL_DAYS}`;
  };

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
      {/* Sticky Glassmorphic Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        isScrolled 
          ? 'backdrop-blur-xl bg-background/10 border-b border-white/10 shadow-xl' 
          : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-4 py-3 max-w-6xl">
          <div className="flex justify-between items-center">
            {/* Left side - Logo/Title */}
            <div className="flex items-center gap-3">
              <h1 className={`font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent transition-all duration-300 ${
                isScrolled ? 'text-lg' : 'text-xl'
              }`}>
                {weightLiftingEmoji}
              </h1>
            </div>

            {/* Right side - User controls */}
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Badge variant="outline" className="glass-subtle text-xs border-white/20 bg-white/10 backdrop-blur-sm">
                    <User className="w-3 h-3 mr-1" />
                    {getDisplayName()}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={handleSignOut} className="glass-subtle w-8 h-8 hover:bg-white/10 border-white/20">
                    <LogOut className="w-3 h-3" />
                  </Button>
                </>
              ) : isSupabaseConfigured() && (
                <AuthModal onAuthSuccess={handleAuthSuccess}>
                  <Button variant="ghost" size="sm" className="glass-subtle text-xs px-2 py-1 hover:bg-white/10 border-white/20">
                    <User className="w-3 h-3 mr-1" />
                    Sign In
                  </Button>
                </AuthModal>
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
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-2">
            Squat Challenge
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground mb-4">
            Build strength, track progress, and crush your goals
          </p>

          {/* Status Badges Row - Centered */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <Badge variant="outline" className="text-xs glass-subtle">
              <Calendar className="w-3 h-3 mr-1" />
              {getDisplayDayText()}
            </Badge>
            <Badge variant="outline" className={`text-xs ${dataSource === 'supabase' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'}`}>
              {dataSource === 'supabase' ? '📡 Online' : '💾 Offline'}
            </Badge>
            <Badge variant="outline" className="text-xs glass-subtle">
              📊 Challenge Total: {totalSquats.toLocaleString()}
            </Badge>
          </div>

          {/* Action Buttons Row - Centered */}
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="glass-subtle text-xs"
              onClick={scrollToLeaderboard}
            >
              <Users className="w-3 h-3 mr-1" />
              Leaderboard
            </Button>
          </div>
        </div>

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
                  Challenge ran from {CHALLENGE_CONFIG.START_DATE} to {getDateFromChallengeDay(CHALLENGE_CONFIG.TOTAL_DAYS)}
                </p>
                <p className="text-lg font-bold text-primary mt-2">
                  Your Total: {totalSquats.toLocaleString()} squats
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
              <p>📊 <strong>Stats:</strong> All stats only count squats completed during the challenge period.</p>
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
                    <p className="text-sm md:text-base text-muted-foreground">Drag clockwise to add, counter-clockwise to subtract</p>
                  </div>
                  <SquatDial
                    onSquatsChange={handleSquatsUpdate}
                    currentSquats={todaySquats}
                    targetSquats={todayTarget}
                    currentDay={getDisplayDay()}
                    compact={false}
                  />
                </CardContent>
              </Card>

              {/* Daily Target */}
              <DailyTarget
                targetSquats={todayTarget}
                completedSquats={todaySquats}
                day={getDisplayDay()}
              />
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
          <ProgressChart data={progressData} dailyTargets={dailyTargets} />

          {/* Leaderboard Preview */}
          <div ref={leaderboardRef}>
            <LeaderboardPreview />
          </div>
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