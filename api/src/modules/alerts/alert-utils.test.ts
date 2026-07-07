import { describe, expect, it } from 'vitest'

import { hasReachedNotifyTime } from './alert-utils'

describe('hasReachedNotifyTime', () => {
  it('returns false before configured time in Sao Paulo', () => {
    const referenceDate = new Date('2026-07-02T11:30:00.000Z') // 08:30 SP

    expect(hasReachedNotifyTime(9, 0, referenceDate)).toBe(false)
  })

  it('returns true at or after configured time in Sao Paulo', () => {
    const atNine = new Date('2026-07-02T12:00:00.000Z') // 09:00 SP
    const afterNine = new Date('2026-07-02T13:00:00.000Z') // 10:00 SP

    expect(hasReachedNotifyTime(9, 0, atNine)).toBe(true)
    expect(hasReachedNotifyTime(9, 0, afterNine)).toBe(true)
  })
})
