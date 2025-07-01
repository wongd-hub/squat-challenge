'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Users, TrendingUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { database, isSupabaseConfigured, storage } from '@/lib/supabase';
import { LeaderboardEntry, getMockLeaderboardPreview } from '@/lib/mockData';

interface LeaderboardPreviewProps {
  refreshTrigger?: number; // Add this prop to trigger refreshes
  userTotalSquats?: number; // User's total squats for local mode
  userTodaySquats?: number; // User's today squats for local mode
  userDisplayName?: string; // User's display name for local mode
  dataSource?: 'supabase' | 'localStorage'; // Data source indicator
}

function LeaderboardPreviewComponent({ refreshTrigger, userTotalSquats, userTodaySquats, userDisplayName, dataSource }: LeaderboardPreviewProps = {}) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'total'>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingSupabase, setIsUsingSupabase] = useState(false);

  const loadLeaderboardData = useCallback(async () => {
    const loadMockData = () => {
      // Use shared mock data
      let mockData = getMockLeaderboardPreview();
      
      // If we're in local mode and have user data, inject the user into the leaderboard
      if (dataSource === 'localStorage' && userDisplayName && (userTotalSquats || userTodaySquats)) {
        const userStreak = storage.calculateLocalStreak();
        const userEntry: LeaderboardEntry = {
          id: 'local-user',
          name: userDisplayName,
          todaySquats: userTodaySquats || 0,
          totalSquats: userTotalSquats || 0,
          streak: userStreak,
          rank: 1, // Will be recalculated when sorted
        };
        
        // Add user entry and remove duplicate if exists
        mockData = [userEntry, ...mockData.filter(entry => entry.id !== 'local-user')];
      }
      
      setLeaderboardData(mockData);
      setIsUsingSupabase(false);
    };

    setIsLoading(true);
    
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
  }, [dataSource]); // Only depend on dataSource to reduce re-creation

  // Load data on mount, when dataSource changes, or when refresh is triggered
  useEffect(() => {
    loadLeaderboardData();
  }, [dataSource]); // Only depend on dataSource, not the function itself

  // Refresh leaderboard when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      console.log("🔄 Leaderboard refresh triggered:", refreshTrigger);
      loadLeaderboardData();
    }
  }, [refreshTrigger]); // Only depend on refreshTrigger, not the function itself

  // Memoize expensive calculations
  const sortedData = useMemo(() => {
    return [...leaderboardData].sort((a, b) => {
      if (activeTab === 'today') {
        return b.todaySquats - a.todaySquats;
      }
      return b.totalSquats - a.totalSquats;
    }).slice(0, 5); // Show top 5
  }, [leaderboardData, activeTab]);

  const getRankIcon = useCallback((rank: number) => {
    // Only show special icons for all-time leaderboard
    if (activeTab === 'total') {
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
      // For daily leaderboard, just show rank numbers
      return <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-muted-foreground">#{rank}</span>;
    }
  }, [activeTab]);

  const getRankBadgeColor = useCallback((rank: number) => {
    // Only show special badges for all-time leaderboard
    if (activeTab === 'total') {
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
    // Only show special badges for all-time leaderboard
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
    }
    return null;
  }, [activeTab]);

  // Memoize community total calculation
  const communityTotal = useMemo(() => {
    return leaderboardData.reduce((acc, entry) => acc + (activeTab === 'today' ? entry.todaySquats : entry.totalSquats), 0);
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
            <div className="flex space-x-2 mb-4">
              <Button
                variant={activeTab === 'today' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('today')}
                size="sm"
                className="flex-1"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                Today
              </Button>
              <Button
                variant={activeTab === 'total' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('total')}
                size="sm"
                className="flex-1"
              >
                <Trophy className="w-3 h-3 mr-1" />
                All-Time
              </Button>
            </div>

            {/* Top 5 Leaderboard */}
            <div className="space-y-2">
              {sortedData.map((entry, index) => {
                const displayRank = index + 1;
                const isTopThree = displayRank <= 3 && activeTab === 'total';
                const badgeText = getBadgeText(displayRank);
                
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-muted/20 cursor-pointer ${
                      isTopThree ? 'glass-subtle' : 'bg-muted/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6">
                        {getRankIcon(displayRank)}
                      </div>
                      
                      <div>
                        <div className="font-semibold text-foreground text-sm">{entry.name}</div>
                        {badgeText && (
                          <Badge className={`text-xs mt-1 ${getRankBadgeColor(displayRank)}`}>
                            {badgeText}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-primary">
                        {activeTab === 'today' ? entry.todaySquats : entry.totalSquats.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.streak > 0 && (
                          <span className="text-orange-500">🔥{entry.streak}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

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
                    {activeTab === 'today' ? "Today's Total" : 'Community Total'}
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
