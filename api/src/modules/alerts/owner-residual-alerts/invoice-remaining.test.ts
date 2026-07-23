import { describe, expect, it } from 'vitest'

import { resolveInvoiceRemainingCentavos } from './invoice-remaining'
import type { ResidualMetricTransaction, ResidualStatement } from './metric-map'

describe('resolveInvoiceRemainingCentavos', () => {
  it('returns 0 when statement isPaid even if purchases stay pending', () => {
    const purchase: ResidualMetricTransaction = {
      id: 'cc-1',
      accountId: 'card-1',
      title: 'Uber',
      amount: 10000n,
      type: 'expense',
      date: new Date('2026-06-15T15:00:00.000Z'),
      competenceDate: new Date('2026-06-15T15:00:00.000Z'),
      statementId: 'st-1',
      source: 'import',
    }
    const statement: ResidualStatement = {
      id: 'st-1',
      accountId: 'card-1',
      previousBalance: 0n,
      purchasesTotal: 10000n,
      paymentsReceived: 10000n,
      totalAmount: 10000n,
      isClosed: true,
      isPaid: true,
      periodStart: new Date('2026-06-02T00:00:00.000Z'),
      periodEnd: new Date('2026-07-01T00:00:00.000Z'),
      closingDate: new Date('2026-07-01T00:00:00.000Z'),
      dueDate: new Date('2026-07-10T00:00:00.000Z'),
      importSource: 'ofx',
    }

    const remaining = resolveInvoiceRemainingCentavos({
      seed: {
        accountId: 'card-1',
        accountName: 'Nubank',
        monthKey: '2026-07',
        closingDay: 1,
        dueDay: 10,
        transactionIds: ['cc-1'],
        accountCreatedBy: 'owner',
      },
      accountTransactions: [purchase],
      accountStatements: [statement],
    })

    expect(remaining).toBe(0n)
  })
})
