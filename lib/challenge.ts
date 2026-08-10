export function deriveChallengeId(startDate: string): string {
  const [year, month] = startDate.split('-')
  return `${year}-${month}`
}

export type GoalMode = 'full' | 'half'

export function effectiveTarget(prescribed: number, goalMode: GoalMode): number {
  if (prescribed === 0) return 0
  return goalMode === 'half' ? Math.round(prescribed / 2) : prescribed
}
