import { describe, expect, it } from 'vitest'

import {
  findStatementForCycle,
  formatBillingCycleContext,
  formatBillingPeriodRange,
  formatImportedPurchasePeriodRange,
  formatInvoiceLabel,
  getBillingCycle,
  resolveBillingCycleForPurchaseDate,
  resolveStatementViewMonthKey,
  shiftBillingMonth,
} from './billing-cycle'

describe('getBillingCycle', () => {
  it('computes period from closing day 10 and due day 20 for June 2026', () => {
    const cycle = getBillingCycle(10, 20, '2026-06')

    expect(cycle.periodStart).toBe('2026-05-11')
    expect(cycle.periodEnd).toBe('2026-06-10')
    expect(cycle.dueDate).toBe('2026-06-20')
    expect(cycle.label).toMatch(/junho de 2026/i)
  })

  it('puts due date in next month when due day is before closing day', () => {
    const cycle = getBillingCycle(25, 10, '2026-06')

    expect(cycle.dueDate).toBe('2026-07-10')
  })
})

describe('shiftBillingMonth', () => {
  it('shifts months', () => {
    expect(shiftBillingMonth('2026-06', -1)).toBe('2026-05')
    expect(shiftBillingMonth('2026-06', 1)).toBe('2026-07')
  })
})

describe('resolveBillingCycleForPurchaseDate', () => {
  it('maps a purchase inside the billing window to the invoice month', () => {
    const cycle = resolveBillingCycleForPurchaseDate(10, 20, '2026-06-05')
    expect(cycle.monthKey).toBe('2026-06')
    expect(cycle.periodStart).toBe('2026-05-11')
    expect(cycle.periodEnd).toBe('2026-06-10')
  })

  it('maps a purchase after closing to the next invoice month', () => {
    const cycle = resolveBillingCycleForPurchaseDate(10, 20, '2026-06-15')
    expect(cycle.monthKey).toBe('2026-07')
  })
})

describe('formatInvoiceLabel', () => {
  it('formats invoice label for UI', () => {
    expect(formatInvoiceLabel('2026-07')).toMatch(/Fatura de Julho\/2026/)
  })
})

describe('formatBillingCycleContext', () => {
  it('describes purchase window and due date', () => {
    const cycle = getBillingCycle(1, 8, '2026-03')
    expect(formatBillingPeriodRange(cycle)).toBe('02/02 – 01/03/2026')
    expect(formatBillingCycleContext(cycle)).toMatch(/Compras de 02\/02 – 01\/03\/2026 · Venceu 08\/03\/2026/)
  })
})

describe('formatImportedPurchasePeriodRange', () => {
  it('shows last purchase day when OFX closes on the 1st', () => {
    expect(
      formatImportedPurchasePeriodRange(
        '2026-03-01T12:00:00.000Z',
        '2026-04-01T12:00:00.000Z'
      )
    ).toBe('01/03 – 31/03/2026')
  })

  it('keeps closing day when it is not the 1st', () => {
    expect(
      formatImportedPurchasePeriodRange(
        '2026-06-01T12:00:00.000Z',
        '2026-07-10T12:00:00.000Z'
      )
    ).toBe('01/06 – 10/07/2026')
  })
})

describe('findStatementForCycle', () => {
  const julyStatement = {
    periodStart: '2026-06-02T12:00:00.000Z',
    periodEnd: '2026-07-01T12:00:00.000Z',
    closingDate: '2026-07-01T12:00:00.000Z',
  }

  it('matches statement with the same closing date as the cycle', () => {
    const cycle = getBillingCycle(1, 18, '2026-07')
    expect(findStatementForCycle([julyStatement], cycle)).toBe(julyStatement)
  })

  it('does not match a previous statement to a future billing cycle', () => {
    const cycle = getBillingCycle(1, 18, '2026-08')
    expect(findStatementForCycle([julyStatement], cycle)).toBeNull()
  })

  it('does not match an April OFX statement to the March billing cycle', () => {
    const aprilOfxStatement = {
      periodStart: '2026-03-01T12:00:00.000Z',
      periodEnd: '2026-04-01T12:00:00.000Z',
      closingDate: '2026-04-01T12:00:00.000Z',
    }

    const marchCycle = getBillingCycle(1, 8, '2026-03')
    const aprilCycle = getBillingCycle(1, 8, '2026-04')

    expect(findStatementForCycle([aprilOfxStatement], marchCycle)).toBeNull()
    expect(findStatementForCycle([aprilOfxStatement], aprilCycle)).toBe(aprilOfxStatement)
  })

  it('matches statement by invoice month when OFX closing day differs from account', () => {
    const aprilOfxStatement = {
      periodStart: '2026-03-01T12:00:00.000Z',
      periodEnd: '2026-04-01T12:00:00.000Z',
      closingDate: '2026-04-01T12:00:00.000Z',
      dueDate: '2026-04-08T12:00:00.000Z',
    }

    const aprilCycle = getBillingCycle(10, 17, '2026-04')

    expect(aprilCycle.closingDate).toBe('2026-04-10')
    expect(findStatementForCycle([aprilOfxStatement], aprilCycle, { closingDay: 10, dueDay: 17 })).toBe(
      aprilOfxStatement
    )
  })

  it('matches statement by billing view month when closing day differs from account', () => {
    const julyOpenStatement = {
      periodStart: '2026-06-01T12:00:00.000Z',
      periodEnd: '2026-07-10T12:00:00.000Z',
      closingDate: '2026-07-10T12:00:00.000Z',
      dueDate: '2026-07-17T12:00:00.000Z',
    }

    const julyCycle = getBillingCycle(10, 17, '2026-07')

    expect(
      findStatementForCycle([julyOpenStatement], julyCycle, { closingDay: 10, dueDay: 17 })
    ).toBe(julyOpenStatement)
  })

  it('resolves the UI month for a Nubank statement with closing on the 1st', () => {
    const augustStatement = {
      closingDate: '2026-08-01T12:00:00.000Z',
      dueDate: '2026-08-08T12:00:00.000Z',
    }

    expect(resolveStatementViewMonthKey(augustStatement, 1, 8)).toBe('2026-08')
  })
})
