import { describe, expect, it } from 'vitest'

import { getBillingCycle } from '../billing-cycle/index'
import { computeInvoiceMetrics } from './metrics'
import { isPriorInvoiceSettledByNextBalance } from './next-statement-settlement'

describe('isPriorInvoiceSettledByNextBalance', () => {
  it('treats zero previous balance as settled', () => {
    expect(isPriorInvoiceSettledByNextBalance('0.00')).toBe(true)
    expect(isPriorInvoiceSettledByNextBalance('0')).toBe(true)
  })

  it('ignores missing previous balance', () => {
    expect(isPriorInvoiceSettledByNextBalance(null)).toBe(false)
    expect(isPriorInvoiceSettledByNextBalance(undefined)).toBe(false)
    expect(isPriorInvoiceSettledByNextBalance('')).toBe(false)
  })

  it('keeps open prior invoice when next still carries balance', () => {
    expect(isPriorInvoiceSettledByNextBalance('3880.35')).toBe(false)
  })
})

describe('computeInvoiceMetrics next-statement settlement', () => {
  it('clears remaining when the next OFX reports previousBalance 0', () => {
    const cycle = getBillingCycle(10, 17, '2026-07')
    const statement = {
      id: 'st-july',
      totalAmount: '6030.35',
      previousBalance: '0.00',
      purchasesTotal: '7025.12',
      paymentsReceived: '2150.00',
      importSource: 'ofx' as const,
      isClosed: true,
      isPaid: false,
      periodStart: '2026-06-01',
      periodEnd: '2026-07-10',
      dueDate: '2026-07-17',
    }

    const metrics = computeInvoiceMetrics(
      cycle,
      statement,
      [
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '500.00',
          date: '2026-07-11',
          statementId: 'st-july',
        },
      ],
      {
        closingDay: 10,
        dueDay: 17,
        previousStatement: { dueDate: '2026-06-08' },
        nextStatement: { previousBalance: '0.00' },
      }
    )

    expect(metrics.remaining).toBe(0n)
  })
})
