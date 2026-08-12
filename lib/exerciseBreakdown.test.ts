import { describe, it, expect } from 'vitest'
import { formatExerciseBreakdown } from './exerciseBreakdown'

describe('formatExerciseBreakdown', () => {
  it('returns null for no entries', () => {
    expect(formatExerciseBreakdown([])).toBeNull()
  })

  it('formats a single exercise', () => {
    expect(formatExerciseBreakdown([{ exercise: 'Squats', reps: 40 }])).toBe('40 Squats')
  })

  it('sums repeated entries for the same exercise', () => {
    const entries = [
      { exercise: 'Squats', reps: 20 },
      { exercise: 'Squats', reps: 20 },
    ]
    expect(formatExerciseBreakdown(entries)).toBe('40 Squats')
  })

  it('sorts multiple exercises by reps descending', () => {
    const entries = [
      { exercise: 'Squats', reps: 14 },
      { exercise: 'Push-ups + 10kg', reps: 86 },
    ]
    expect(formatExerciseBreakdown(entries)).toBe('86 Push-ups + 10kg, 14 Squats')
  })

  it('breaks reps ties by exercise name ascending', () => {
    const entries = [
      { exercise: 'Squats', reps: 10 },
      { exercise: 'Push-ups', reps: 10 },
    ]
    expect(formatExerciseBreakdown(entries)).toBe('10 Push-ups, 10 Squats')
  })
})
