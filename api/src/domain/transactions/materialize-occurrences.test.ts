import { describe, expect, it } from 'vitest'

import { addPeriod, subPeriod } from '../recurrence/utils'

describe('materializeOccurrences first due date', () => {
  it('places a single transaction on the requested due date', () => {
    const dueDate = new Date(2026, 5, 15)
    const recurrenceType = 'monthly' as const
    const interval = 1

    const startDate = subPeriod(dueDate, recurrenceType, interval)
    const firstOccurrenceDueDate = addPeriod(startDate, recurrenceType, interval)

    expect(firstOccurrenceDueDate.getFullYear()).toBe(dueDate.getFullYear())
    expect(firstOccurrenceDueDate.getMonth()).toBe(dueDate.getMonth())
    expect(firstOccurrenceDueDate.getDate()).toBe(dueDate.getDate())
  })

  it('does not shift reminder completion transactions to the next month', () => {
    const requestedDueDate = new Date(2026, 5, 12)
    const startDate = subPeriod(requestedDueDate, 'monthly', 1)
    const firstOccurrenceDueDate = addPeriod(startDate, 'monthly', 1)

    expect(firstOccurrenceDueDate.getMonth()).toBe(5)
    expect(firstOccurrenceDueDate.getDate()).toBe(12)
  })
})
