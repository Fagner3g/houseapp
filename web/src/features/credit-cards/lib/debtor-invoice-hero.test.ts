import { describe, expect, it } from 'vitest'

import { resolveDebtorInvoiceHero } from './debtor-invoice-hero'

describe('resolveDebtorInvoiceHero', () => {
  it('marks unpaid share past due as overdue', () => {
    expect(
      resolveDebtorInvoiceHero({
        dueDate: '2026-07-08',
        shareTotal: 4000,
        shareRemaining: 4000,
        now: '2026-07-22',
      })
    ).toEqual({
      isPaid: false,
      isSettledEmpty: false,
      isOverdue: true,
      heroAmount: 4000,
    })
  })

  it('marks fully paid share as paid with total as hero', () => {
    expect(
      resolveDebtorInvoiceHero({
        dueDate: '2026-07-08',
        shareTotal: 4000,
        shareRemaining: 0,
        now: '2026-07-22',
      })
    ).toEqual({
      isPaid: true,
      isSettledEmpty: false,
      isOverdue: false,
      heroAmount: 4000,
    })
  })

  it('treats no share as empty', () => {
    expect(
      resolveDebtorInvoiceHero({
        dueDate: '2026-07-08',
        shareTotal: 0,
        shareRemaining: 0,
        now: '2026-07-22',
      })
    ).toEqual({
      isPaid: false,
      isSettledEmpty: true,
      isOverdue: false,
      heroAmount: 0,
    })
  })
})
