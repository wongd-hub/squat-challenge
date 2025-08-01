'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowLeft, Trophy, Medal, Award, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { database, isSupabaseConfigured } from '@/lib/supabase';
import { LeaderboardEntry, getMockLeaderboardFull } from '@/lib/mockData';

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'total'>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingSupabase, setIsUsingSupabase] = useState(false);

  useEffect(() => {
    loadLeaderboardData();
  }, []);

  const loadLeaderboardData = async () => {
    setIsLoading(true);
    
    if (isSupabaseConfigured()) {
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
  };

  const loadMockData = useCallback(() => {
    // Use shared mock data
    const mockData = getMockLeaderboardFull();
    setLeaderboardData(mockData);
    setIsUsingSupabase(false);
  }, []);

  // Memoize expensive calculations
  const sortedData = useMemo(() => {
    return [...leaderboardData].sort((a, b) => {
      if (activeTab === 'today') {
        return b.todaySquats - a.todaySquats;
      }
      return b.totalSquats - a.totalSquats;
    });
  }, [leaderboardData, activeTab]);

  const getRankIcon = useCallback((rank: number) => {
    // Only show special icons for all-time leaderboard
    if (activeTab === 'total') {
      switch (rank) {
        case 1:
          return <Trophy className="w-5 h-5 text-yellow-500" />;
        case 2:
          return <Medal className="w-5 h-5 text-gray-400" />;
        case 3:
          return <Award className="w-5 h-5 text-amber-600" />;
        default:
          return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
      }
    } else {
      // For daily leaderboard, just show rank numbers
      return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  }, [activeTab]);

  const getRankBadgeColor = useCallback((rank: number) => {
    // Only show special badges for all-time leaderboard
    if (activeTab === 'total') {
      switch (rank) {
        case 1:
          return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
        case 2:
          return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700';
        case 3:
          return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
        default:
          return 'bg-muted/50 text-muted-foreground border-border';
      }
    } else {
      return 'bg-muted/50 text-muted-foreground border-border';
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
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
        {/* Mobile-Optimized Header */}
        <div className="mb-6 md:mb-8">
          {/* Top Row */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="glass-subtle w-8 h-8">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Leaderboard
                  {!isUsingSupabase && (
                    <Badge variant="outline" className="text-xs ml-2 text-muted-foreground">
                      Demo Data
                    </Badge>
                  )}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">See how you stack up against others</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Loading State for Tab Navigation */}
        {isLoading ? (
          <Card className="glass-strong mb-6">
            <CardContent className="p-4">
              <div className="flex space-x-2">
                <div className="flex-1 h-8 bg-muted/50 rounded animate-pulse"></div>
                <div className="flex-1 h-8 bg-muted/50 rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Tab Navigation */
          <Card className="glass-strong mb-6">
            <CardContent className="p-4">
              <div className="flex space-x-2">
                <Button
                  variant={activeTab === 'today' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('today')}
                  className="flex-1 text-sm"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Today's Squats
                </Button>
                <Button
                  variant={activeTab === 'total' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('total')}
                  className="flex-1 text-sm"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Total Squats
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              {activeTab === 'today' ? "Today's Rankings" : 'All-Time Rankings'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Loading State */}
            {isLoading ? (
              <div className="space-y-0">
                {/* Header Row Skeleton */}
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-border/50">
                  <div className="col-span-1 h-4 bg-muted/50 rounded animate-pulse"></div>
                  <div className="col-span-5 h-4 bg-muted/50 rounded animate-pulse"></div>
                  <div className="col-span-3 h-4 bg-muted/50 rounded animate-pulse"></div>
                  <div className="col-span-3 h-4 bg-muted/50 rounded animate-pulse"></div>
                </div>
                
                {/* Skeleton Entries */}
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="p-4 border-b border-border/30 last:border-b-0">
                    {/* Mobile Layout Skeleton */}
                    <div className="md:hidden">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-muted/50 rounded-full animate-pulse"></div>
                          <div className="w-24 h-4 bg-muted/50 rounded animate-pulse"></div>
                        </div>
                        <div className="w-16 h-6 bg-muted/50 rounded animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Desktop Layout Skeleton */}
                    <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-1 w-5 h-5 bg-muted/50 rounded-full animate-pulse"></div>
                      <div className="col-span-5 w-32 h-4 bg-muted/50 rounded animate-pulse"></div>
                      <div className="col-span-3 w-16 h-6 bg-muted/50 rounded animate-pulse"></div>
                      <div className="col-span-3 w-12 h-4 bg-muted/50 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0">
                {/* Header Row - Hidden on mobile */}
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-border/50 text-sm font-medium text-muted-foreground">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-5">Name</div>
                  <div className="col-span-3 text-center">{activeTab === 'today' ? 'Today' : 'Total'}</div>
                  <div className="col-span-3 text-center">Streak</div>
                </div>

                {/* Leaderboard Entries */}
                {sortedData.map((entry, index) => {
                  const displayRank = index + 1;
                  const isTopThree = displayRank <= 3 && activeTab === 'total';
                  const badgeText = getBadgeText(displayRank);
                  
                  return (
                    <div
                      key={entry.id}
                      className={`p-4 border-b border-border/30 last:border-b-0 transition-all duration-200 hover:bg-muted/20 cursor-pointer ${
                        isTopThree ? 'glass-subtle' : ''
                      }`}
                    >
                      {/* Mobile Layout */}
                      <div className="md:hidden">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getRankIcon(displayRank)}
                            <div>
                              <div className="font-semibold text-foreground">{entry.name}</div>
                              {badgeText && (
                                <Badge className={`text-xs mt-1 ${getRankBadgeColor(displayRank)}`}>
                                  {badgeText}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">
                              {activeTab === 'today' ? entry.todaySquats : entry.totalSquats.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">squats</div>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <div className="flex items-center gap-1">
                            {entry.streak > 0 && <span className="text-orange-500">🔥</span>}
                            <span className="font-semibold text-orange-500">{entry.streak}</span>
                            <span className="text-xs text-muted-foreground">
                              {entry.streak === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-1 flex items-center">
                          {getRankIcon(displayRank)}
                        </div>
                        
                        <div className="col-span-5 flex items-center">
                          <div>
                            <div className="font-semibold text-foreground">{entry.name}</div>
                            {badgeText && (
                              <Badge className={`text-xs mt-1 ${getRankBadgeColor(displayRank)}`}>
                                {badgeText}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="col-span-3 text-center">
                          <div className="text-lg font-bold text-primary">
                            {activeTab === 'today' ? entry.todaySquats : entry.totalSquats.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">squats</div>
                        </div>
                        
                        <div className="col-span-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {entry.streak > 0 && <span className="text-orange-500">🔥</span>}
                            <span className="font-semibold text-orange-500">{entry.streak}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {entry.streak === 1 ? 'day' : 'days'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Summary */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="glass-subtle">
                <CardContent className="p-4 text-center">
                  <div className="w-16 h-8 bg-muted/50 rounded animate-pulse mx-auto mb-2"></div>
                  <div className="w-20 h-4 bg-muted/50 rounded animate-pulse mx-auto"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="glass-subtle">
              <CardContent className="p-4 text-center">
                <div className="text-xl md:text-2xl font-bold text-primary">
                  {communityTotal.toLocaleString()}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">
                  {activeTab === 'today' ? "Today's Total" : 'Community Total'}
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-subtle">
              <CardContent className="p-4 text-center">
                <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
                  {sortedData.filter(entry => entry.streak > 0).length}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Active Streaks</div>
              </CardContent>
            </Card>
            
            <Card className="glass-subtle">
              <CardContent className="p-4 text-center">
                <div className="text-xl md:text-2xl font-bold text-orange-500">
                  {sortedData.length > 0 ? Math.max(...sortedData.map(entry => entry.streak)) : 0}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Longest Streak</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
