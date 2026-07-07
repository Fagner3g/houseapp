import { describe, expect, it } from 'vitest'

import {
  getBillingCycle,
  isWithinBillingRange,
  resolveBillingMonthKey,
  shiftBillingMonth,
} from '@/core/billing-cycle'
import { divideCentavos } from '@/core/money'
import { buildCreditCardInstallments } from '@/modules/transactions/credit-card-installments.logic'

describe('divideCentavos', () => {
  it('splits evenly', () => {
    expect(divideCentavos(50000n, 10)).toEqual(Array(10).fill(5000n))
  })

  it('distributes remainder to first installments', () => {
    expect(divideCentavos(50001n, 10)).toEqual([5001n, ...Array(9).fill(5000n)])
  })
})

describe('resolveBillingMonthKey', () => {
  it('assigns purchase after closing to the next invoice month', () => {
    const purchaseDate = new Date('2026-07-02T12:00:00.000Z')
    const monthKey = resolveBillingMonthKey(purchaseDate, 1, 18)

    expect(monthKey).toBe('2026-08')

    const cycle = getBillingCycle(1, 18, monthKey)
    expect(isWithinBillingRange(purchaseDate, cycle.periodStart, cycle.periodEnd)).toBe(true)
  })
})

describe('buildCreditCardInstallments', () => {
  it('creates divided rows with parcel labels and future billing cycles', () => {
    const rows = buildCreditCardInstallments({
      title: 'Celular',
      totalCentavos: 50000n,
      purchaseDate: new Date('2026-07-02T12:00:00.000Z'),
      closingDay: 1,
      dueDay: 18,
      installmentsTotal: 10,
    })

    expect(rows).toHaveLength(10)
    expect(rows[0]).toMatchObject({
      title: 'Celular - Parcela 1/10',
      amount: 5000n,
      installmentNumber: 1,
      installmentsTotal: 10,
    })
    expect(rows[9]?.title).toBe('Celular - Parcela 10/10')
    expect(rows[9]?.amount).toBe(5000n)

    const firstMonth = resolveBillingMonthKey(rows[0]!.date, 1, 18)
    const secondMonth = shiftBillingMonth(firstMonth, 1)
    const secondCycle = getBillingCycle(1, 18, secondMonth)
    expect(
      isWithinBillingRange(rows[1]!.date, secondCycle.periodStart, secondCycle.periodEnd)
    ).toBe(true)
  })
})
