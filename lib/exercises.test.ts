import { describe, it, expect } from 'vitest'
import { normalizeExerciseName, SEED_EXERCISES, DEFAULT_EXERCISE } from './exercises'

describe('normalizeExerciseName', () => {
  it('collapses case, punctuation and spacing to one key', () => {
    const key = normalizeExerciseName('Sit-ups')
    expect(normalizeExerciseName('situps')).toBe(key)
    expect(normalizeExerciseName('Sit-Ups')).toBe(key)
    expect(normalizeExerciseName('  sit   ups  ')).toBe(key)
  })
  it('produces the expected normalised string', () => {
    expect(normalizeExerciseName('Push-ups!!')).toBe('pushups')
  })
})

describe('seed list', () => {
  it('includes the default and has no normalised duplicates', () => {
    expect(SEED_EXERCISES).toContain(DEFAULT_EXERCISE)
    const keys = SEED_EXERCISES.map(normalizeExerciseName)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
