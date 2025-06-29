// Shared mock data utilities
export interface LeaderboardEntry {
  id: string;
  name: string;
  todaySquats: number;
  totalSquats: number;
  streak: number;
  rank: number;
}

// Function to scramble names for privacy (only when using mock data)
export function scrambleName(name: string): string {
  const scrambled = name.split(' ').map(part => {
    if (part.length <= 2) return part;
    const firstChar = part[0];
    const lastChar = part[part.length - 1];
    const middle = part.slice(1, -1).split('').sort(() => Math.random() - 0.5).join('');
    return `${firstChar}${middle}${lastChar}`;
  }).join(' ');
  return scrambled;
}

// Shared mock leaderboard data
export const MOCK_LEADERBOARD_DATA: LeaderboardEntry[] = [
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

// Get mock data with only first 5 entries for preview
export function getMockLeaderboardPreview(): LeaderboardEntry[] {
  return MOCK_LEADERBOARD_DATA.slice(0, 5);
}

// Get full mock data for leaderboard page
export function getMockLeaderboardFull(): LeaderboardEntry[] {
  return MOCK_LEADERBOARD_DATA;
} 