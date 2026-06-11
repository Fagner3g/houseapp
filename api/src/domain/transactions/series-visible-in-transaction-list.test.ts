import { describe, expect, it } from 'vitest'

import { isSeriesVisibleInTransactionList } from './series-visible-in-transaction-list'

const JUNE_FROM = new Date('2026-06-01T00:00:00')
const JUNE_TO = new Date('2026-06-30T23:59:59')
const REFERENCE = new Date('2026-06-11T12:00:00')
const MAY_DUE = new Date('2026-05-10T00:00:00')

describe('isSeriesVisibleInTransactionList', () => {
  it('includes inactive series when Empréstimo 4k was due in May and paid on June 11', () => {
    expect(
      isSeriesVisibleInTransactionList(
        false,
        'paid',
        new Date('2026-06-11T12:00:00'),
        MAY_DUE,
        JUNE_FROM,
        JUNE_TO,
        REFERENCE
      )
    ).toBe(true)
  })

  it('excludes inactive series when paid in a prior month while viewing June', () => {
    expect(
      isSeriesVisibleInTransactionList(
        false,
        'paid',
        new Date('2026-05-15T12:00:00'),
        MAY_DUE,
        JUNE_FROM,
        JUNE_TO,
        REFERENCE
      )
    ).toBe(false)
  })

  it('includes inactive series with open overdue after cancel payment (unpay)', () => {
    expect(
      isSeriesVisibleInTransactionList(
        false,
        'pending',
        null,
        MAY_DUE,
        JUNE_FROM,
        JUNE_TO,
        REFERENCE
      )
    ).toBe(true)
  })

  it('keeps active series visible regardless of payment date', () => {
    expect(
      isSeriesVisibleInTransactionList(
        true,
        'pending',
        null,
        MAY_DUE,
        JUNE_FROM,
        JUNE_TO,
        REFERENCE
      )
    ).toBe(true)
  })

  it('excludes inactive series with future due dates', () => {
    expect(
      isSeriesVisibleInTransactionList(
        false,
        'pending',
        null,
        new Date('2026-07-01T00:00:00'),
        JUNE_FROM,
        JUNE_TO,
        REFERENCE
      )
    ).toBe(false)
  })
})
