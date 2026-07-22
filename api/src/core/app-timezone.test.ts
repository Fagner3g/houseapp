import { afterEach, describe, expect, it, vi } from 'vitest'

import { startOfTodayInAppTimezone } from './app-timezone'

describe('startOfTodayInAppTimezone', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses America/Sao_Paulo midnight, not UTC midnight', () => {
    // 2026-07-16 00:53 UTC == 2026-07-15 21:53 in São Paulo
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-16T00:53:00.000Z'))

    const start = startOfTodayInAppTimezone()
    expect(start.toISOString()).toBe('2026-07-15T03:00:00.000Z')
  })

  it('keeps due-today UTC-noon transactions out of the overdue window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-16T00:53:00.000Z'))

    const todayStart = startOfTodayInAppTimezone()
    const dueToday = new Date('2026-07-15T12:00:00.000Z')
    const dueYesterday = new Date('2026-07-14T12:00:00.000Z')

    expect(dueToday < todayStart).toBe(false)
    expect(dueYesterday < todayStart).toBe(true)
  })
})
