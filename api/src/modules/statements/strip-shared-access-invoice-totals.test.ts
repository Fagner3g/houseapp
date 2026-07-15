import { describe, expect, it } from 'vitest'

import { stripSharedAccessInvoiceTotals } from './strip-shared-access-invoice-totals'

describe('stripSharedAccessInvoiceTotals', () => {
  it('clears owner money fields and paid flag, keeps period and import metadata', () => {
    const stripped = stripSharedAccessInvoiceTotals({
      id: 'st-1',
      periodStart: '2026-05-27T00:00:00.000Z',
      periodEnd: '2026-06-30T00:00:00.000Z',
      totalAmount: '5660.00',
      minimumPayment: '100.00',
      previousBalance: '0.00',
      paymentsReceived: '5660.00',
      purchasesTotal: '5660.00',
      otherCharges: null,
      nextInvoiceBalance: null,
      totalOpenBalance: null,
      importSource: 'ofx' as const,
      isClosed: true,
      isPaid: true,
    })

    expect(stripped.totalAmount).toBeNull()
    expect(stripped.purchasesTotal).toBeNull()
    expect(stripped.paymentsReceived).toBeNull()
    expect(stripped.previousBalance).toBeNull()
    expect(stripped.isPaid).toBe(false)
    expect(stripped.periodStart).toBe('2026-05-27T00:00:00.000Z')
    expect(stripped.periodEnd).toBe('2026-06-30T00:00:00.000Z')
    expect(stripped.importSource).toBe('ofx')
    expect(stripped.isClosed).toBe(true)
  })
})
