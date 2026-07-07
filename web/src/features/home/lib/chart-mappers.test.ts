import { describe, expect, it } from 'vitest'

import { computeDeltaPercent, formatDeltaPercent } from './chart-mappers'

describe('chart-mappers', () => {
  describe('computeDeltaPercent', () => {
    it('computes positive change', () => {
      expect(computeDeltaPercent(120, 100)).toBe(20)
    })

    it('computes negative change', () => {
      expect(computeDeltaPercent(80, 100)).toBe(-20)
    })

    it('returns null when previous is zero and current is positive', () => {
      expect(computeDeltaPercent(100, 0)).toBeNull()
    })

    it('returns 0 when both are zero', () => {
      expect(computeDeltaPercent(0, 0)).toBe(0)
    })
  })

  describe('formatDeltaPercent', () => {
    it('formats positive delta', () => {
      expect(formatDeltaPercent(15)).toBe('+15%')
    })

    it('formats negative delta', () => {
      expect(formatDeltaPercent(-10)).toBe('-10%')
    })

    it('returns novo for null', () => {
      expect(formatDeltaPercent(null)).toBe('novo')
    })
  })
})
