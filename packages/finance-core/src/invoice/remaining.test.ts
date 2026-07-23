import { describe, expect, it } from 'vitest'

import { getBillingCycle } from '../billing-cycle/index'
import { computeInvoiceMetrics } from './metrics'
import { isGrossImportedInvoiceTotal } from './reconciliation'

describe('isGrossImportedInvoiceTotal', () => {
  it('allows one-cent drift between gross anchor and imported total', () => {
    expect(
      isGrossImportedInvoiceTotal(
        698360n, // 6983.60
        701061n, // 7010.61
        0n,
        2700n // 27.00 settlement credit
      )
    ).toBe(true)
  })

  it('rejects net LEDGERBAL totals that already deducted prepayments', () => {
    expect(
      isGrossImportedInvoiceTotal(
        603035n, // 6030.35
        702512n, // 7025.12
        0n,
        2888n // 28.88
      )
    ).toBe(false)
  })
})

describe('computeInvoiceMetrics remaining for net OFX LEDGERBAL', () => {
  it('does not double-subtract pre-closing payments already in BALAMT', () => {
    const cycle = getBillingCycle(10, 17, '2026-07')
    const statement = {
      id: 'st-july',
      totalAmount: '6030.35',
      previousBalance: '0.00',
      purchasesTotal: '7025.12',
      paymentsReceived: '650.00',
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
          date: '2026-07-03',
          statementId: 'st-july',
        },
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '500.00',
          date: '2026-07-09',
          statementId: 'st-july',
        },
        {
          type: 'income',
          title: 'Estorno de "Vantagens.Cvolta.Com" (Compra e Volta)',
          amount: '27.00',
          date: '2026-06-01',
          statementId: 'st-july',
        },
        {
          type: 'income',
          title: 'IOF de volta de Cursor, Ai Powered Ide',
          amount: '1.88',
          date: '2026-06-02',
          statementId: 'st-july',
        },
      ],
      {
        closingDay: 10,
        dueDay: 17,
        previousStatement: { dueDate: '2026-06-08' },
      }
    )

    expect(metrics.invoiceTotal).toBe(603035n)
    expect(metrics.payments).toBe(100000n)
    expect(metrics.remaining).toBe(603035n)
  })

  it('still deducts post-closing payments from a net LEDGERBAL', () => {
    const cycle = getBillingCycle(10, 17, '2026-07')
    const statement = {
      id: 'st-july',
      totalAmount: '6030.35',
      previousBalance: '0.00',
      purchasesTotal: '7025.12',
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
          date: '2026-07-03',
          statementId: 'st-july',
        },
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '1000.00',
          date: '2026-07-12',
          statementId: 'st-july',
        },
      ],
      {
        closingDay: 10,
        dueDay: 17,
        previousStatement: { dueDate: '2026-06-08' },
      }
    )

    expect(metrics.remaining).toBe(503035n)
  })

  it('deducts open-invoice bookkeeping payments after OFX import', () => {
    const cycle = getBillingCycle(10, 17, '2026-04')
    const statement = {
      id: 'st-april',
      totalAmount: '5828.83',
      previousBalance: '0.00',
      purchasesTotal: '5836.51',
      paymentsReceived: '0',
      isClosed: true,
      isPaid: false,
      periodStart: '2026-03-01',
      periodEnd: '2026-04-01',
      dueDate: '2026-04-08',
    }

    const metrics = computeInvoiceMetrics(
      cycle,
      statement,
      [
        {
          type: 'income',
          title: 'Pagamento fatura',
          amount: '5828.83',
          date: '2026-04-08',
          source: 'manual',
          statementId: null,
        },
      ],
      {
        closingDay: 10,
        dueDay: 17,
        previousStatement: null,
      }
    )

    expect(metrics.payments).toBe(582883n)
    expect(metrics.remaining).toBe(0n)
  })
})
