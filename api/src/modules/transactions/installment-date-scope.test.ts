import { describe, expect, it } from 'vitest'

import {
  selectInstallmentDateCascadeTargets,
  shiftUtcCalendarDays,
  utcCalendarDaysDelta,
} from './installment-date-scope'

describe('utcCalendarDaysDelta', () => {
  it('returns calendar-day difference', () => {
    expect(
      utcCalendarDaysDelta(new Date('2026-07-28T12:00:00.000Z'), new Date('2026-08-05T12:00:00.000Z'))
    ).toBe(8)
    expect(
      utcCalendarDaysDelta(new Date('2026-08-05T12:00:00.000Z'), new Date('2026-07-28T12:00:00.000Z'))
    ).toBe(-8)
    expect(
      utcCalendarDaysDelta(new Date('2026-07-28T12:00:00.000Z'), new Date('2026-07-28T18:00:00.000Z'))
    ).toBe(0)
  })
})

describe('shiftUtcCalendarDays', () => {
  it('shifts and keeps UTC noon', () => {
    const shifted = shiftUtcCalendarDays(new Date('2026-07-28T12:00:00.000Z'), 8)
    expect(shifted.toISOString()).toBe('2026-08-05T12:00:00.000Z')
  })
})

describe('selectInstallmentDateCascadeTargets', () => {
  const siblings = [
    { id: 'p1', installmentNumber: 1, status: 'paid' },
    { id: 'p2', installmentNumber: 2, status: 'pending' },
    { id: 'p3', installmentNumber: 3, status: 'pending' },
    { id: 'p4', installmentNumber: 4, status: 'canceled' },
  ]
  const anchor = { id: 'p2', installmentNumber: 2 }

  it('returns empty for current scope', () => {
    expect(selectInstallmentDateCascadeTargets(siblings, anchor, 'current')).toEqual([])
  })

  it('selects following unpaid for from_here', () => {
    expect(selectInstallmentDateCascadeTargets(siblings, anchor, 'from_here')).toEqual([
      { id: 'p3', installmentNumber: 3, status: 'pending' },
    ])
  })

  it('selects all unpaid except anchor for all', () => {
    expect(selectInstallmentDateCascadeTargets(siblings, anchor, 'all')).toEqual([
      { id: 'p3', installmentNumber: 3, status: 'pending' },
    ])
  })

  it('includes earlier unpaid when scope is all', () => {
    const open = [
      { id: 'p1', installmentNumber: 1, status: 'pending' },
      { id: 'p2', installmentNumber: 2, status: 'pending' },
      { id: 'p3', installmentNumber: 3, status: 'partial' },
    ]
    expect(selectInstallmentDateCascadeTargets(open, anchor, 'all')).toEqual([
      { id: 'p1', installmentNumber: 1, status: 'pending' },
      { id: 'p3', installmentNumber: 3, status: 'partial' },
    ])
  })
})
