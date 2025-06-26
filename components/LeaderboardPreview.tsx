'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Users, TrendingUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardEntry {
  id: string;
  name: string;
  todaySquats: number;
  totalSquats: number;
  streak: number;
  rank: number;
}

export function LeaderboardPreview() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'total'>('today');

  useEffect(() => {
    // Mock leaderboard data - in production this would come from Supabase
    const mockData: LeaderboardEntry[] = [
      { id: '1', name: 'Darren W', todaySquats: 150, totalSquats: 3214, streak: 23, rank: 1 },
      { id: '2', name: 'Grissel A', todaySquats: 150, totalSquats: 2824, streak: 20, rank: 2 },
      { id: '3', name: 'Afzal A', todaySquats: 60, totalSquats: 3124, streak: 15, rank: 3 },
      { id: '4', name: 'Ching C', todaySquats: 0, totalSquats: 2764, streak: 0, rank: 4 },
      { id: '5', name: 'Braidan S', todaySquats: 0, totalSquats: 1336, streak: 0, rank: 5 },
    ];

    setLeaderboardData(mockData);
  }, []);

  const sortedData = [...leaderboardData].sort((a, b) => {
    if (activeTab === 'today') {
      return b.todaySquats - a.todaySquats;
    }
    return b.totalSquats - a.totalSquats;
  }).slice(0, 5); // Show top 5

  const getRankIcon = (rank: number) => {
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
  };

  const getRankBadgeColor = (rank: number) => {
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
  };

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Leaderboard
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
            const isTopThree = displayRank <= 3;
            
            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-muted/20 ${
                  isTopThree ? 'glass-subtle' : 'bg-muted/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6">
                    {getRankIcon(displayRank)}
                  </div>
                  
                  <div>
                    <div className="font-semibold text-foreground text-sm">{entry.name}</div>
                    {isTopThree && (
                      <Badge className={`text-xs mt-1 ${getRankBadgeColor(displayRank)}`}>
                        {displayRank === 1 ? '🥇' : displayRank === 2 ? '🥈' : '🥉'}
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
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {sortedData.reduce((acc, entry) => acc + (activeTab === 'today' ? entry.todaySquats : entry.totalSquats), 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {activeTab === 'today' ? "Today's Total" : 'Top 5 Total'}
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
              {Math.max(...sortedData.map(entry => entry.streak))}
            </div>
            <div className="text-xs text-muted-foreground">Best Streak</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}