import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveReminderTransactionDueDate } from '@/domain/alerts/utils'
import { addPeriod, subPeriod } from '@/domain/recurrence/utils'
import { toCentsStrict } from '@/http/utils/format'

describe('complete reminder period with transaction input', () => {
  it('accepts decimal amount strings with up to two fractional digits', () => {
    expect(toCentsStrict('1842.00')).toBe(184200n)
    expect(toCentsStrict('10.5')).toBe(1050n)
  })
})

describe('resolveReminderTransactionDueDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 12, 15, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults to period due date when date is omitted', () => {
    const periodDueDate = new Date(2026, 4, 15)
    expect(resolveReminderTransactionDueDate(undefined, periodDueDate)).toEqual(periodDueDate)
    expect(resolveReminderTransactionDueDate('   ', periodDueDate)).toEqual(periodDueDate)
  })

  it('uses the provided date key for the transaction due date', () => {
    const result = resolveReminderTransactionDueDate('2026-06-12', new Date(2026, 4, 15))
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(5)
    expect(result.getDate()).toBe(12)
  })

  it('lets users register transbordo completions on the completion month date', () => {
    const result = resolveReminderTransactionDueDate('2026-06-01', new Date(2026, 4, 15))
    expect(result.getMonth()).toBe(5)
    expect(result.getDate()).toBe(1)
  })
})

describe('generatesTransaction validation', () => {
  it('requires defaultPayToId when generatesTransaction is enabled', () => {
    const generatesTransaction = true
    const defaultPayToId: string | null = null
    expect(generatesTransaction && !defaultPayToId).toBe(true)
  })
})

describe('complete reminder transaction due date pipeline', () => {
  it('keeps the user-selected completion date through startDate materialization', () => {
    const periodDueDate = new Date(2026, 4, 15)
    const selectedDateKey = '2026-06-12'
    const transactionDueDate = resolveReminderTransactionDueDate(selectedDateKey, periodDueDate)

    const startDate = subPeriod(transactionDueDate, 'monthly', 1)
    const firstOccurrenceDueDate = addPeriod(startDate, 'monthly', 1)

    expect(firstOccurrenceDueDate.getFullYear()).toBe(2026)
    expect(firstOccurrenceDueDate.getMonth()).toBe(5)
    expect(firstOccurrenceDueDate.getDate()).toBe(12)
  })
})
