import { describe, expect, it } from 'vitest'

import { formatNextNotifyRun } from './next-notify-run'

describe('formatNextNotifyRun', () => {
  it('returns today when current time is before scheduled time', () => {
    const now = new Date('2026-07-09T14:00:00.000Z') // 11:00 in Sao Paulo (UTC-3)

    expect(formatNextNotifyRun(13, 38, now)).toBe(
      'Próximos alertas automáticos: hoje às 13:38'
    )
  })

  it('returns tomorrow when current time is after scheduled time', () => {
    const now = new Date('2026-07-09T18:00:00.000Z') // 15:00 in Sao Paulo

    expect(formatNextNotifyRun(13, 38, now)).toBe(
      'Próximos alertas automáticos: amanhã às 13:38'
    )
  })
})
