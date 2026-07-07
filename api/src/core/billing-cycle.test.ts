import { describe, expect, it } from 'vitest'

import { billingDaysFromStatementDates } from './billing-cycle'

describe('billingDaysFromStatementDates', () => {
  it('extracts closing and due days from statement dates', () => {
    expect(
      billingDaysFromStatementDates(
        new Date('2026-05-01T12:00:00.000Z'),
        new Date('2026-05-08T12:00:00.000Z')
      )
    ).toEqual({ closingDay: 1, dueDay: 8 })
  })
})
