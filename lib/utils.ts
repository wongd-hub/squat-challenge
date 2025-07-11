import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Encouragement messages for milestone achievements
export const ENCOURAGEMENT_MESSAGES = {
  '50': [
    "🔥 Halfway there! You're crushing it!",
    "💪 50% done! Keep that momentum going!",
    "⚡ You're on fire! Halfway to victory!",
    "🌟 Amazing progress! 50% complete!",
    "🚀 Halfway conquered! You've got this!",
    "💥 Fantastic! You're at the halfway mark!",
    "🎯 50% achieved! Your dedication is paying off!",
    "⭐ Incredible work! Halfway to your goal!"
  ],
  '75': [
    "🎉 75% complete! Almost there champion!",
    "🏆 Three quarters done! Victory is in sight!",
    "🔥 75% conquered! You're unstoppable!",
    "💪 Amazing! Only 25% left to go!",
    "⚡ Superb effort! 75% in the books!",
    "🌟 Outstanding! Three quarters complete!",
    "🚀 Phenomenal! 75% achieved!",
    "💥 Brilliant work! The finish line awaits!"
  ],
  '100': [
    "🎊 GOAL COMPLETE! You absolutely crushed it today!",
    "🏆 VICTORY! Another day conquered like a true champion!",
    "💥 BOOM! Daily target smashed to perfection!",
    "⭐ LEGENDARY! You've completed today's challenge!",
    "🔥 ON FIRE! 100% complete - you're unstoppable!",
    "🚀 MISSION ACCOMPLISHED! Outstanding dedication!",
    "👑 CHAMPION STATUS! Today's goal conquered!",
    "💪 BEAST MODE! Daily target absolutely demolished!"
  ]
};

export function getRandomEncouragementMessage(percentage: 50 | 75 | 100): string {
  const messages = ENCOURAGEMENT_MESSAGES[percentage.toString() as keyof typeof ENCOURAGEMENT_MESSAGES];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function checkMilestone(currentSquats: number, targetSquats: number): 50 | 75 | 100 | null {
  if (targetSquats === 0) return null; // Skip rest days
  
  const percentage = (currentSquats / targetSquats) * 100;
  
  if (percentage >= 100) return 100;
  if (percentage >= 75) return 75;
  if (percentage >= 50) return 50;
  return null;
}

// Helper function to get new milestones that haven't been achieved yet
export function getNewMilestones(
  currentSquats: number, 
  targetSquats: number, 
  achievedMilestones: Set<50 | 75 | 100>
): (50 | 75 | 100)[] {
  if (targetSquats === 0) return []; // Skip rest days
  
  const percentage = (currentSquats / targetSquats) * 100;
  const newMilestones: (50 | 75 | 100)[] = [];
  
  // Check each milestone in order and add if not already achieved
  if (percentage >= 50 && !achievedMilestones.has(50)) {
    newMilestones.push(50);
  }
  if (percentage >= 75 && !achievedMilestones.has(75)) {
    newMilestones.push(75);
  }
  if (percentage >= 100 && !achievedMilestones.has(100)) {
    newMilestones.push(100);
  }
  
  return newMilestones;
}
