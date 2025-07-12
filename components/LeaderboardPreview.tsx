'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Users, TrendingUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import CountUp from './CountUp';
import { database, isSupabaseConfigured, storage, supabase } from '@/lib/supabase';
import { LeaderboardEntry, getMockLeaderboardPreview } from '@/lib/mockData';

interface LeaderboardPreviewProps {
  refreshTrigger?: number; // Add this prop to trigger refreshes
  userTotalSquats?: number; // User's total squats for local mode
  userTodaySquats?: number; // User's today squats for local mode
  userDisplayName?: string; // User's display name for local mode
  userStreak?: number; // User's current streak for local mode
  dataSource?: 'supabase' | 'localStorage'; // Data source indicator
  liveDataTrigger?: number; // Live data trigger for real-time updates
  // Follow-on program props
  isInFollowOn?: boolean; // Whether user is in follow-on program
  userChallengeSquats?: number; // User's challenge-only squats
  userFollowOnSquats?: number; // User's follow-on program squats
}

function LeaderboardPreviewComponent({ refreshTrigger, userTotalSquats, userTodaySquats, userDisplayName, userStreak, dataSource, liveDataTrigger, isInFollowOn = false, userChallengeSquats, userFollowOnSquats }: LeaderboardPreviewProps = {}) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [previousData, setPreviousData] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'challenge' | 'followon' | 'total'>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUsingSupabase, setIsUsingSupabase] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0
    },
    exit: {
      opacity: 0,
      x: -100
    }
  };

  const loadLeaderboardData = useCallback(async (isRefreshOnly = false) => {
    const loadMockData = () => {
      // Use shared mock data
      let mockData = getMockLeaderboardPreview();
      
      // If we're in local mode and have user data, inject the user into the leaderboard
      if (dataSource === 'localStorage' && userDisplayName && (userTotalSquats || userTodaySquats)) {
        const userEntry: LeaderboardEntry & { challengeSquats?: number; followOnSquats?: number } = {
          id: 'local-user',
          name: userDisplayName,
          todaySquats: userTodaySquats || 0,
          totalSquats: userTotalSquats || 0,
          streak: userStreak || 0, // Use the passed userStreak prop instead of calculating locally
          rank: 1, // Will be recalculated when sorted
          challengeSquats: userChallengeSquats,
          followOnSquats: userFollowOnSquats,
        };
        
        // Add user entry and remove duplicate if exists
        mockData = [userEntry, ...mockData.filter(entry => entry.id !== 'local-user')];
      }
      
      // Store previous data before updating for animations
      setPreviousData(leaderboardData);
      setLeaderboardData(mockData);
      setIsUsingSupabase(false);
    };

    // Only show loading skeleton for initial load, use refreshing state for updates
    if (isRefreshOnly) {
      setIsRefreshing(true);
      // Store previous data before refresh for smooth animations
      setPreviousData([...leaderboardData]);
    } else {
      setIsLoading(true);
    }
    
    if (isSupabaseConfigured() && dataSource === 'supabase') {
      try {
        const { data, error } = await database.getFullLeaderboard();
        
        if (error) {
          console.error('❌ Error loading leaderboard:', error);
          loadMockData();
        } else {
          // Map the data to match our interface
          const formattedData: LeaderboardEntry[] = data.map((entry, index) => ({
            id: entry.id,
            name: entry.name,
            todaySquats: entry.todaySquats,
            totalSquats: entry.totalSquats,
            streak: entry.streak,
            rank: index + 1,
          }));
          
          // Store previous data before updating for animations
          setPreviousData([...leaderboardData]);
          setLeaderboardData(formattedData);
          setIsUsingSupabase(true);
        }
      } catch (error) {
        console.error('❌ Exception loading leaderboard:', error);
        loadMockData();
      }
    } else {
      loadMockData();
    }
    
    setIsLoading(false);
    setIsRefreshing(false);
  }, [dataSource]); // Only depend on dataSource to reduce re-creation

  // Load data on mount, when dataSource changes, or when refresh is triggered
  useEffect(() => {
    loadLeaderboardData(false); // Initial load
  }, [dataSource]); // Only depend on dataSource, not the function itself

  // Refresh leaderboard when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadLeaderboardData(true); // Background refresh
    }
  }, [refreshTrigger]); // Only depend on refreshTrigger, not the function itself

  // Refresh leaderboard when liveDataTrigger changes
  useEffect(() => {
    if (liveDataTrigger !== undefined && liveDataTrigger > 0) {
      loadLeaderboardData(true); // Background refresh for live data
    }
  }, [liveDataTrigger]); // Respond to live data changes

  // Setup additional real-time subscription for immediate updates
  useEffect(() => {
    if (!isSupabaseConfigured() || dataSource !== 'supabase' || !supabase) {
      return
    }

    // Subscribe to real-time changes for immediate leaderboard updates
    const realtimeSubscription = supabase
      .channel('leaderboard_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress'
        },
        (payload: any) => {
          // Immediate refresh for better real-time experience
          setTimeout(() => {
            loadLeaderboardData(true)
          }, 100) // Small delay to ensure data consistency
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
          // Refresh when profile changes (display names)
          setTimeout(() => {
            loadLeaderboardData(true)
          }, 100)
        }
      )
      .subscribe()

    return () => {
      realtimeSubscription.unsubscribe()
    }
  }, [dataSource, loadLeaderboardData])

  // Memoize expensive calculations
  const sortedData = useMemo(() => {
    return [...leaderboardData].sort((a, b) => {
      if (activeTab === 'today') {
        return b.todaySquats - a.todaySquats;
      } else if (activeTab === 'challenge') {
        // For challenge tab, prioritize challenge squats (if available) over total
        const aChallengeSquats = (a as any).challengeSquats ?? a.totalSquats;
        const bChallengeSquats = (b as any).challengeSquats ?? b.totalSquats;
        return bChallengeSquats - aChallengeSquats;
      } else if (activeTab === 'followon') {
        // For follow-on tab, show follow-on squats
        const aFollowOnSquats = (a as any).followOnSquats ?? 0;
        const bFollowOnSquats = (b as any).followOnSquats ?? 0;
        return bFollowOnSquats - aFollowOnSquats;
      }
      return b.totalSquats - a.totalSquats;
    }).slice(0, 5); // Show top 5
  }, [leaderboardData, activeTab]);

  const getRankIcon = useCallback((rank: number) => {
    // Show special icons for all-time and challenge leaderboards
    if (activeTab === 'total' || activeTab === 'challenge') {
      switch (rank) {
        case 1:
          return <Trophy className="w-4 h-4 text-yellow-500" />;
        case 2:
          return <Medal className="w-4 h-4 text-gray-400" />;
        case 3:
          return <Award className="w-4 h-4 text-amber-600" />;
        default:
          return <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-muted-foreground">#{rank}</span>;
      }
    } else {
      // For daily and follow-on leaderboards, just show rank numbers
      return <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-muted-foreground">#{rank}</span>;
    }
  }, [activeTab]);

  const getRankBadgeColor = useCallback((rank: number) => {
    // Show special badges for all-time and challenge leaderboards
    if (activeTab === 'total' || activeTab === 'challenge') {
      switch (rank) {
        case 1:
          return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
        case 2:
          return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
        case 3:
          return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300';
        default:
          return 'bg-muted/50 text-muted-foreground';
      }
    } else {
      return 'bg-muted/50 text-muted-foreground';
    }
  }, [activeTab]);

  const getBadgeText = useCallback((rank: number) => {
    // Show special badges for all-time and challenge leaderboards
    if (activeTab === 'total') {
      switch (rank) {
        case 1:
          return '🥇 Champion';
        case 2:
          return '🥈 Runner-up';
        case 3:
          return '🥉 Third Place';
        default:
          return null;
      }
    } else if (activeTab === 'challenge') {
      switch (rank) {
        case 1:
          return '🏆 Challenge Winner';
        case 2:
          return '🥈 2nd Place';
        case 3:
          return '🥉 3rd Place';
        default:
          return null;
      }
    }
    return null;
  }, [activeTab]);

  // Helper function to get previous value for animations
  const getPreviousValue = useCallback((entryId: string, field: 'todaySquats' | 'totalSquats') => {
    const previousEntry = previousData.find(entry => entry.id === entryId);
    return previousEntry?.[field] || 0;
  }, [previousData]);

  // Memoize community total calculation
  const communityTotal = useMemo(() => {
    return leaderboardData.reduce((acc, entry) => {
      if (activeTab === 'today') {
        return acc + entry.todaySquats;
      } else if (activeTab === 'challenge') {
        return acc + ((entry as any).challengeSquats ?? entry.totalSquats);
      } else if (activeTab === 'followon') {
        return acc + ((entry as any).followOnSquats ?? 0);
      } else { // total
        return acc + entry.totalSquats;
      }
    }, 0);
  }, [leaderboardData, activeTab]);

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Leaderboard
            {!isUsingSupabase && (
              <Badge variant="outline" className="text-xs ml-2">
                Demo Data
              </Badge>
            )}
            {isRefreshing && (
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin ml-2" />
            )}
          </CardTitle>
          <Link href="/leaderboard">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              View All
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex space-x-2 mb-4">
              <div className="flex-1 h-8 bg-muted/50 rounded animate-pulse"></div>
              <div className="flex-1 h-8 bg-muted/50 rounded animate-pulse"></div>
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-muted/50 rounded-full animate-pulse"></div>
                  <div className="w-20 h-4 bg-muted/50 rounded animate-pulse"></div>
                </div>
                <div className="w-12 h-6 bg-muted/50 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className={`grid gap-2 mb-4 ${isInFollowOn ? 'grid-cols-4' : 'grid-cols-2'}`}>
              <Button
                variant={activeTab === 'today' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('today')}
                size="sm"
                className="text-xs"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                Today
              </Button>
              
              {isInFollowOn && (
                <>
                  <Button
                    variant={activeTab === 'challenge' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('challenge')}
                    size="sm"
                    className="text-xs"
                  >
                    <Trophy className="w-3 h-3 mr-1" />
                    Challenge
                  </Button>
                  <Button
                    variant={activeTab === 'followon' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('followon')}
                    size="sm"
                    className="text-xs"
                  >
                    🚀
                    Follow-on
                  </Button>
                </>
              )}
              
              <Button
                variant={activeTab === 'total' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('total')}
                size="sm"
                className="text-xs"
              >
                <Trophy className="w-3 h-3 mr-1" />
                All-Time
              </Button>
            </div>

            {/* Top 5 Leaderboard */}
            <LayoutGroup>
              <motion.div 
                className="space-y-2"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {sortedData.map((entry, index) => {
                    const displayRank = index + 1;
                    const isTopThree = displayRank <= 3 && (activeTab === 'total' || activeTab === 'challenge');
                    const badgeText = getBadgeText(displayRank);
                    
                    // Determine current value based on active tab
                    let currentValue = 0;
                    let previousValueField: 'todaySquats' | 'totalSquats' = 'totalSquats';
                    
                    if (activeTab === 'today') {
                      currentValue = entry.todaySquats;
                      previousValueField = 'todaySquats';
                    } else if (activeTab === 'challenge') {
                      currentValue = (entry as any).challengeSquats ?? entry.totalSquats;
                      previousValueField = 'totalSquats';
                    } else if (activeTab === 'followon') {
                      currentValue = (entry as any).followOnSquats ?? 0;
                      previousValueField = 'totalSquats';
                    } else { // total
                      currentValue = entry.totalSquats;
                      previousValueField = 'totalSquats';
                    }
                    
                    const previousValue = getPreviousValue(entry.id, previousValueField);
                    
                    return (
                      <motion.div
                        key={entry.id}
                        layout
                        layoutId={`leaderboard-entry-${entry.id}`}
                        initial={false}
                        animate={{
                          opacity: 1,
                          y: 0
                        }}
                        exit={{
                          opacity: 0,
                          x: -100
                        }}
                        transition={{
                          type: "tween",
                          duration: 0.3,
                          layout: {
                            type: "spring",
                            stiffness: 120,
                            damping: 20,
                            mass: 2
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted/20 cursor-pointer ${
                          isTopThree ? 'glass-subtle' : 'bg-muted/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <motion.div 
                            className="flex items-center justify-center w-6"
                            layout
                          >
                            {getRankIcon(displayRank)}
                          </motion.div>
                          
                          <motion.div layout>
                            <motion.div 
                              className="font-semibold text-foreground text-sm"
                              layout
                            >
                              {entry.name}
                            </motion.div>
                            {badgeText && (
                              <motion.div layout>
                                <Badge className={`text-xs mt-1 ${getRankBadgeColor(displayRank)}`}>
                                  {badgeText}
                                </Badge>
                              </motion.div>
                            )}
                          </motion.div>
                        </div>
                        
                        <motion.div className="text-right" layout>
                          <motion.div className="font-bold text-primary" layout>
                            <CountUp
                              key={`${entry.id}-${activeTab}-${currentValue}`}
                              start={previousValue}
                              end={currentValue}
                              duration={1500}
                            />
                          </motion.div>
                          <motion.div className="text-xs text-muted-foreground" layout>
                            {entry.streak > 0 && (
                              <span className="text-orange-500">🔥{entry.streak}</span>
                            )}
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </LayoutGroup>

            {/* Quick Stats */}
            {isLoading ? (
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="text-center">
                    <div className="w-12 h-6 bg-muted/50 rounded animate-pulse mx-auto mb-1"></div>
                    <div className="w-16 h-3 bg-muted/50 rounded animate-pulse mx-auto"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">
                    {communityTotal.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activeTab === 'today' ? "Today's Total" : 
                     activeTab === 'challenge' ? 'Challenge Total' :
                     activeTab === 'followon' ? 'Follow-on Total' :
                     'Community Total'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {sortedData.filter(entry => entry.streak > 0).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Active Streaks</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-500">
                    {sortedData.length > 0 ? Math.max(...sortedData.map(entry => entry.streak)) : 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Best Streak</div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const LeaderboardPreview = React.memo(LeaderboardPreviewComponent);
