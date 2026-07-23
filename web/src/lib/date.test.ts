import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  calendarDateToIso,
  calendarDateToLocalDate,
  dateToCalendarDate,
  formatDateToIso,
  formatIsoDateLabel,
  isoToCalendarDate,
  overdueDateToIso,
  parseDateFromIso,
} from './date'

describe('calendar date helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('round-trips YYYY-MM-DD through UTC noon without shifting the day in BRT', () => {
    vi.stubEnv('TZ', 'America/Sao_Paulo')
    const iso = calendarDateToIso('2026-07-10')
    expect(iso).toBe('2026-07-10T12:00:00.000Z')
    expect(isoToCalendarDate(iso)).toBe('2026-07-10')
    expect(formatIsoDateLabel(iso)).toBe('10/07/2026')
  })

  it('keeps UTC-midnight timestamps on the intended UTC calendar day', () => {
    vi.stubEnv('TZ', 'America/Sao_Paulo')
    // Homolog bug: server startOfDay produced UTC midnight for day 10
    expect(isoToCalendarDate('2026-07-10T00:00:00.000Z')).toBe('2026-07-10')
    expect(formatIsoDateLabel('2026-07-10T00:00:00.000Z')).toBe('10/07/2026')
  })

  it('maps local Date picker values to calendar keys without UTC shift', () => {
    vi.stubEnv('TZ', 'America/Sao_Paulo')
    const local = calendarDateToLocalDate('2026-07-10')
    expect(dateToCalendarDate(local)).toBe('2026-07-10')
    expect(formatDateToIso(local)).toBe('2026-07-10T12:00:00.000Z')
    expect(dateToCalendarDate(parseDateFromIso('2026-07-10T00:00:00.000Z'))).toBe('2026-07-10')
  })

  it('builds overdue dateTo as previous BRT calendar day at UTC noon', () => {
    // After midnight UTC but still 15/07 in São Paulo — must not treat due-today as overdue.
    const reference = new Date('2026-07-16T00:53:00.000Z')
    expect(overdueDateToIso(reference)).toBe('2026-07-14T12:00:00.000Z')
  })
})
