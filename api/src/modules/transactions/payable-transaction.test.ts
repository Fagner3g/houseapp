import { describe, expect, it } from 'vitest'

import {
  isOverduePayableListFilter,
  shouldExcludeFutureScheduled,
} from './payable-transaction'

describe('isOverduePayableListFilter', () => {
  it('returns true for payable dateTo-only queries', () => {
    expect(
      isOverduePayableListFilter({
        payableOnly: true,
        dateTo: new Date('2026-07-08T23:59:59.999-03:00'),
      })
    ).toBe(true)
  })

  it('returns false for monthly period queries', () => {
    expect(
      isOverduePayableListFilter({
        payableOnly: true,
        dateFrom: new Date('2026-07-01'),
        dateTo: new Date('2026-07-31'),
      })
    ).toBe(false)
  })
})

describe('shouldExcludeFutureScheduled', () => {
  it('returns true for overdue-style queries regardless of timezone on dateTo', () => {
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

  it('returns true when dateTo in UTC is after server local midnight (Brazil client)', () => {
    const yesterdayEndBrazil = new Date('2026-07-08T23:59:59.999-03:00')

    expect(
      shouldExcludeFutureScheduled({
        payableOnly: true,
        dateTo: yesterdayEndBrazil,
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
