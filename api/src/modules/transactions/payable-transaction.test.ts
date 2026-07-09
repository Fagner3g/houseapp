import { describe, expect, it } from 'vitest'

import { shouldExcludeFutureScheduled } from './payable-transaction'

describe('shouldExcludeFutureScheduled', () => {
  it('returns true for overdue-style queries (dateTo only, before today)', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999)

    expect(
      shouldExcludeFutureScheduled({
        payableOnly: true,
        dateTo: yesterday,
      })
    ).toBe(true)
  })

  it('returns false for monthly list queries with dateFrom and dateTo', () => {
    const dateFrom = new Date()
    dateFrom.setDate(1)
    dateFrom.setHours(0, 0, 0, 0)
    const dateTo = new Date()
    dateTo.setMonth(dateTo.getMonth() + 1, 0)
    dateTo.setHours(23, 59, 59, 999)

    expect(
      shouldExcludeFutureScheduled({
        payableOnly: true,
        dateFrom,
        dateTo,
      })
    ).toBe(false)
  })

  it('returns false when payableOnly is off', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    expect(
      shouldExcludeFutureScheduled({
        payableOnly: false,
        dateTo: yesterday,
      })
    ).toBe(false)
  })

  it('returns false when scheduledOnly is on', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    expect(
      shouldExcludeFutureScheduled({
        payableOnly: true,
        scheduledOnly: true,
        dateTo: yesterday,
      })
    ).toBe(false)
  })
})
