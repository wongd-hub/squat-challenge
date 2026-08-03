export type Exercise = { id: string; name: string; normalized_name: string }

export const DEFAULT_EXERCISE = 'Sit-ups'

export const SEED_EXERCISES: string[] = [
  'Sit-ups', 'Push-ups', 'Squats', 'Burpees', 'Lunges', 'Crunches',
]

export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}
