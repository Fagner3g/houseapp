import { describe, expect, it } from 'vitest'

import { billingDaysFromStatementDates, getBillingCycle } from './cycle'

describe('billingDaysFromStatementDates', () => {
  it('extracts closing and due days from Date inputs', () => {
    expect(
      billingDaysFromStatementDates(
        new Date('2026-05-01T12:00:00.000Z'),
        new Date('2026-05-08T12:00:00.000Z')
      )
    ).toEqual({ closingDay: 1, dueDay: 8 })
  })

  it('extracts closing and due days from ISO strings', () => {
    expect(
      billingDaysFromStatementDates(
        '2026-03-01T12:00:00.000Z',
        '2026-03-08T12:00:00.000Z'
      )
    ).toEqual({ closingDay: 1, dueDay: 8 })
  })
})

describe('getBillingCycle', () => {
  it('computes Nubank March 2026 with closing day 1', () => {
    const cycle = getBillingCycle(1, 8, '2026-03')

    expect(cycle.periodStart).toBe('2026-02-02')
    expect(cycle.periodEnd).toBe('2026-03-01')
    expect(cycle.dueDate).toBe('2026-03-08')
  })
})
