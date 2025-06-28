'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowLeft, Trophy, Medal, Award, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardEntry {
  id: string;
  name: string;
  todaySquats: number;
  totalSquats: number;
  streak: number;
  rank: number;
}

// Function to scramble names (except for "Darren Wong")
const scrambleName = (name: string): string => {
  if (name === "Darren Wong" || name === "Darren W") {
    return name; // Don't scramble your name
  }
  
  // List of scrambled names to use
  const scrambledNames = [
    "Alex K", "Jordan M", "Casey R", "Taylor B", "Morgan L",
    "Riley P", "Avery S", "Quinn T", "Blake W", "Sage N",
    "River C", "Phoenix D", "Rowan F", "Skylar H", "Emery J",
    "Cameron G", "Drew H", "Finley K", "Hayden L", "Kendall M"
  ];
  
  // Use a simple hash of the original name to consistently map to the same scrambled name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % scrambledNames.length;
  return scrambledNames[index];
};

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'total'>('today');

  useEffect(() => {
    // Mock leaderboard data with scrambled names
    const mockData: LeaderboardEntry[] = [
      { id: '1', name: scrambleName('Darren W'), todaySquats: 150, totalSquats: 3214, streak: 23, rank: 1 },
      { id: '2', name: scrambleName('Grissel A'), todaySquats: 150, totalSquats: 2824, streak: 20, rank: 2 },
      { id: '3', name: scrambleName('Afzal A'), todaySquats: 60, totalSquats: 3124, streak: 15, rank: 3 },
      { id: '4', name: scrambleName('Ching C'), todaySquats: 0, totalSquats: 2764, streak: 0, rank: 4 },
      { id: '5', name: scrambleName('Braidan S'), todaySquats: 0, totalSquats: 1336, streak: 0, rank: 5 },
      { id: '6', name: scrambleName('David M'), todaySquats: 0, totalSquats: 1286, streak: 0, rank: 6 },
      { id: '7', name: scrambleName('Isaac H'), todaySquats: 0, totalSquats: 955, streak: 0, rank: 7 },
      { id: '8', name: scrambleName('Devika L'), todaySquats: 0, totalSquats: 581, streak: 0, rank: 8 },
      { id: '9', name: scrambleName('Vincent D'), todaySquats: 0, totalSquats: 543, streak: 0, rank: 9 },
      { id: '10', name: scrambleName('Wentao L'), todaySquats: 0, totalSquats: 30, streak: 0, rank: 10 },
      { id: '11', name: scrambleName('Peter H'), todaySquats: 0, totalSquats: 0, streak: 0, rank: 11 },
      { id: '12', name: scrambleName('Jake C'), todaySquats: 0, totalSquats: 0, streak: 0, rank: 12 },
    ];

    setLeaderboardData(mockData);
  }, []);

  const sortedData = [...leaderboardData].sort((a, b) => {
    if (activeTab === 'today') {
      return b.todaySquats - a.todaySquats;
    }
    return b.totalSquats - a.totalSquats;
  });

  const getRankIcon = (rank: number) => {
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
  };

  const getRankBadgeColor = (rank: number) => {
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
  };

  const getBadgeText = (rank: number) => {
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
  };

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
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">See how you stack up against others</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Tab Navigation */}
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

        {/* Leaderboard */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              {activeTab === 'today' ? "Today's Rankings" : 'All-Time Rankings'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="glass-subtle">
            <CardContent className="p-4 text-center">
              <div className="text-xl md:text-2xl font-bold text-primary">
                {sortedData.reduce((acc, entry) => acc + (activeTab === 'today' ? entry.todaySquats : entry.totalSquats), 0).toLocaleString()}
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
                {Math.max(...sortedData.map(entry => entry.streak))}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Longest Streak</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
