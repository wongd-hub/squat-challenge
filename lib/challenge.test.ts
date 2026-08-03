import { describe, it, expect } from 'vitest'
import { deriveChallengeId, effectiveTarget } from './challenge'

describe('deriveChallengeId', () => {
  it('takes YYYY-MM from a start date', () => {
    expect(deriveChallengeId('2026-07-09')).toBe('2026-07')
    expect(deriveChallengeId('2025-06-15')).toBe('2025-06')
  })
})

describe('effectiveTarget', () => {
  it('returns the prescribed number in full mode', () => {
    expect(effectiveTarget(120, 'full')).toBe(120)
  })
  it('halves and rounds in half mode', () => {
    expect(effectiveTarget(75, 'half')).toBe(38) // 37.5 -> 38
    expect(effectiveTarget(120, 'half')).toBe(60)
  })
  it('keeps rest days at zero in both modes', () => {
    expect(effectiveTarget(0, 'full')).toBe(0)
    expect(effectiveTarget(0, 'half')).toBe(0)
  })
})
