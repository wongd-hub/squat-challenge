export interface ExerciseReps {
  exercise: string
  reps: number
}

// Sums reps per exercise and formats as "86 Push-ups, 14 Squats" (reps desc,
// exercise name asc as a tiebreak) — matches get_total_leaderboard's
// exercise_breakdown convention so the daily and lifetime badges read
// consistently when a user switches tabs.
export function formatExerciseBreakdown(entries: ExerciseReps[]): string | null {
  const totals = new Map<string, number>()
  for (const { exercise, reps } of entries) {
    totals.set(exercise, (totals.get(exercise) || 0) + reps)
  }
  if (totals.size === 0) return null
  return Array.from(totals.entries())
    .sort(([exerciseA, repsA], [exerciseB, repsB]) => repsB - repsA || exerciseA.localeCompare(exerciseB))
    .map(([exercise, reps]) => `${reps} ${exercise}`)
    .join(', ')
}
