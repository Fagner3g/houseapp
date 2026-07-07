import { describe, expect, it } from 'vitest'

import { getBillingCycle } from './billing-cycle'
import {
  computeInvoiceMetrics,
  filterTransactionsForInvoiceCycle,
  isAppBookkeepingInvoicePayment,
  isInvoicePayment,
} from './credit-card-invoice-metrics'

describe('computeInvoiceMetrics', () => {
  it('counts payment on due date even when it is after period end', () => {
    const cycle = getBillingCycle(1, 18, '2026-07')

    expect(cycle.periodEnd).toBe('2026-07-01')
    expect(cycle.dueDate).toBe('2026-07-18')

    const metricsBeforePay = computeInvoiceMetrics(
      cycle,
      { totalAmount: '6.06', purchasesTotal: '6.06', previousBalance: '0' },
      [
        {
          type: 'expense',
          amount: '6.06',
          date: '2026-06-18T12:00:00.000Z',
        },
      ]
    )

    expect(metricsBeforePay.remaining).toBe(6.06)

    const metricsAfterPay = computeInvoiceMetrics(
      cycle,
      { totalAmount: '6.06', purchasesTotal: '6.06', previousBalance: '0' },
      [
        {
          type: 'expense',
          amount: '6.06',
          date: '2026-06-18T12:00:00.000Z',
        },
        {
          type: 'income',
          amount: '6.06',
          date: '2026-07-18T12:00:00.000Z',
        },
      ]
    )

    expect(metricsAfterPay.payments).toBe(6.06)
    expect(metricsAfterPay.remaining).toBe(0)
  })

  it('does not use statement paymentsReceived instead of recorded payments', () => {
    const cycle = getBillingCycle(1, 18, '2026-07')

    const metrics = computeInvoiceMetrics(
      cycle,
      {
        totalAmount: '6.06',
        isClosed: true,
        purchasesTotal: '6.06',
        previousBalance: '0',
        paymentsReceived: '0',
      },
      [
        {
          type: 'income',
          amount: '60600',
          date: '2026-07-18T12:00:00.000Z',
        },
      ]
    )

    expect(metrics.payments).toBe(606)
    expect(metrics.remaining).toBe(0)
  })

  it('does not attribute previous invoice payment to a future billing cycle', () => {
    const augustCycle = getBillingCycle(1, 18, '2026-08')

    const metrics = computeInvoiceMetrics(
      augustCycle,
      null,
      [
        {
          type: 'income',
          amount: '600.00',
          date: '2026-07-18T12:00:00.000Z',
        },
      ],
      { closingDay: 1, dueDay: 18 }
    )

    expect(metrics.purchases).toBe(0)
    expect(metrics.invoiceTotal).toBe(0)
    expect(metrics.payments).toBe(0)
    expect(metrics.remaining).toBe(0)
  })

  it('ignores statement totalAmount for open CSV imports', () => {
    const cycle = getBillingCycle(1, 8, '2026-07')

    const metrics = computeInvoiceMetrics(
      cycle,
      {
        totalAmount: '9999.99',
        isClosed: false,
        importSource: 'csv',
      },
      [
        {
          type: 'expense',
          amount: '120.00',
          date: '2026-06-30T12:00:00.000Z',
        },
      ]
    )

    expect(metrics.invoiceTotal).toBe(120)
    expect(metrics.remaining).toBe(120)
  })

  it('uses OFX total and period for open mid-cycle imports', () => {
    const julyCycle = getBillingCycle(10, 17, '2026-07')
    const julyStatement = {
      id: 'st-july-open',
      totalAmount: '6268.27',
      isClosed: false,
      importSource: 'ofx',
      periodStart: '2026-06-01T12:00:00.000Z',
      periodEnd: '2026-07-10T12:00:00.000Z',
      dueDate: '2026-07-17T12:00:00.000Z',
      purchasesTotal: '6763.04',
      previousBalance: '0.00',
    }

    const metrics = computeInvoiceMetrics(
      julyCycle,
      julyStatement,
      [
        {
          type: 'expense',
          amount: '2281.17',
          date: '2026-06-05T12:00:00.000Z',
          statementId: 'st-july-open',
        },
        {
          type: 'expense',
          amount: '100.00',
          date: '2026-06-15T12:00:00.000Z',
          statementId: 'st-july-open',
        },
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '500.00',
          date: '2026-07-03T12:00:00.000Z',
          statementId: 'st-july-open',
        },
      ],
      {
        closingDay: 10,
        dueDay: 17,
        previousStatement: { dueDate: '2026-06-08T12:00:00.000Z' },
      }
    )

    expect(metrics.usesImportedStatementPeriod).toBe(true)
    expect(metrics.invoiceTotal).toBe(6268.27)
    expect(metrics.purchases).toBe(6763.04)
    expect(metrics.payments).toBe(500)
    expect(metrics.remaining).toBe(6268.27)
  })

  it('marks remaining as zero when closed statement is imported as paid', () => {
    const cycle = getBillingCycle(1, 8, '2026-05')

    const metrics = computeInvoiceMetrics(
      cycle,
      {
        totalAmount: '6104.49',
        isClosed: true,
        isPaid: true,
      },
      []
    )

    expect(metrics.invoiceTotal).toBe(6104.49)
    expect(metrics.remaining).toBe(0)
  })

  it('does not round imported April total up by float drift', () => {
    const aprilCycle = getBillingCycle(1, 8, '2026-04')
    const aprilStatement = {
      id: 'st-april',
      totalAmount: '5828.83',
      isClosed: true,
      isPaid: true,
      periodStart: '2026-03-01T12:00:00.000Z',
      periodEnd: '2026-04-01T12:00:00.000Z',
      dueDate: '2026-04-08T12:00:00.000Z',
      purchasesTotal: '5836.51',
      previousBalance: '0.00',
      paymentsReceived: '5828.84',
    }

    const metrics = computeInvoiceMetrics(aprilCycle, aprilStatement, [
      { type: 'expense', amount: '5836.51', date: '2026-03-15T12:00:00.000Z', statementId: 'st-april' },
      {
        type: 'income',
        title: 'Pagamento recebido',
        amount: '5828.84',
        date: '2026-04-08T12:00:00.000Z',
        statementId: 'st-april',
      },
    ], { closingDay: 1, dueDay: 8, previousStatement: { dueDate: '2026-03-08T12:00:00.000Z' } })

    expect(metrics.invoiceTotal).toBe(5828.83)
    expect(metrics.payments).toBe(5828.84)
    expect(metrics.remaining).toBe(0)
  })

  it('counts cross-statement OFX bill payment for the previous invoice', () => {
    const aprilCycle = getBillingCycle(1, 8, '2026-04')
    const aprilStatement = {
      id: 'st-april',
      totalAmount: '5828.83',
      isClosed: true,
      isPaid: false,
      importSource: 'ofx',
      periodStart: '2026-03-01T12:00:00.000Z',
      periodEnd: '2026-04-01T12:00:00.000Z',
      dueDate: '2026-04-08T12:00:00.000Z',
      purchasesTotal: '5836.51',
      previousBalance: '0.00',
    }

    const metrics = computeInvoiceMetrics(
      aprilCycle,
      aprilStatement,
      [
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '5828.84',
          date: '2026-04-08T12:00:00.000Z',
          statementId: 'st-may',
        },
      ],
      { closingDay: 1, dueDay: 8, previousStatement: { dueDate: '2026-03-08T12:00:00.000Z' } }
    )

    expect(metrics.payments).toBe(5828.84)
  })

  it('shows partial remaining on closed OFX invoice with cross-statement payments', () => {
    const juneCycle = getBillingCycle(10, 17, '2026-06')
    const juneStatement = {
      id: 'st-june',
      totalAmount: '6983.60',
      isClosed: true,
      isPaid: false,
      importSource: 'ofx',
      periodStart: '2026-05-01T12:00:00.000Z',
      periodEnd: '2026-06-01T12:00:00.000Z',
      dueDate: '2026-06-08T12:00:00.000Z',
      purchasesTotal: '7010.61',
      previousBalance: '0.00',
      paymentsReceived: '6956.61',
    }

    const metrics = computeInvoiceMetrics(
      juneCycle,
      juneStatement,
      [
        {
          type: 'income',
          title: 'Crédito de Confiança de "Vantagens.Cvolta.Com"',
          amount: '27.00',
          date: '2026-05-29T12:00:00.000Z',
          statementId: 'st-june',
        },
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '2500.00',
          date: '2026-06-01T12:00:00.000Z',
          statementId: 'st-june',
        },
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '4456.61',
          date: '2026-06-08T12:00:00.000Z',
          statementId: 'st-june',
        },
      ],
      {
        closingDay: 10,
        dueDay: 17,
        previousStatement: { dueDate: '2026-05-08T12:00:00.000Z' },
      }
    )

    expect(metrics.invoiceTotal).toBe(6983.6)
    expect(metrics.payments).toBe(6956.61)
    expect(metrics.remaining).toBe(0)
  })

  it('does not count imported purchases in a misaligned billing cycle', () => {
    const marchCycle = getBillingCycle(10, 17, '2026-03')
    const aprilStatement = {
      id: 'st-april',
      totalAmount: '5828.83',
      isClosed: true,
      previousBalance: '0',
      periodStart: '2026-03-01T12:00:00.000Z',
      periodEnd: '2026-04-01T12:00:00.000Z',
      dueDate: '2026-04-08T12:00:00.000Z',
      purchasesTotal: '5836.51',
    }

    const metrics = computeInvoiceMetrics(marchCycle, null, [
      {
        type: 'expense',
        amount: '2281.17',
        date: '2026-03-01T12:00:00.000Z',
        statementId: 'st-april',
      },
      {
        type: 'income',
        amount: '3.91',
        date: '2026-03-17T12:00:00.000Z',
      },
    ])

    expect(metrics.purchases).toBe(0)
    expect(metrics.invoiceTotal).toBe(0)
    expect(metrics.remaining).toBe(0)
  })

  it('does not apply April OFX total to March cycle when statement closing differs', () => {
    const marchCycle = getBillingCycle(1, 8, '2026-03')
    const aprilStatement = {
      totalAmount: '5828.83',
      isClosed: true,
      previousBalance: '0',
      periodStart: '2026-03-01T12:00:00.000Z',
      periodEnd: '2026-04-01T12:00:00.000Z',
      dueDate: '2026-04-08T12:00:00.000Z',
      purchasesTotal: '5836.51',
    }

    const metrics = computeInvoiceMetrics(
      marchCycle,
      null,
      [
        {
          type: 'expense',
          amount: '765.91',
          date: '2026-03-01T12:00:00.000Z',
        },
        {
          type: 'income',
          amount: '3.76',
          date: '2026-03-02T12:00:00.000Z',
        },
      ]
    )

    expect(metrics.purchases).toBe(765.91)
    expect(metrics.invoiceTotal).toBe(765.91)
    expect(metrics.payments).toBe(3.76)
    expect(metrics.remaining).toBe(762.15)

    const aprilCycle = getBillingCycle(1, 8, '2026-04')
    const aprilMetrics = computeInvoiceMetrics(aprilCycle, { ...aprilStatement, id: 'st-april' }, [
      {
        type: 'expense',
        amount: '2281.17',
        date: '2026-03-01T12:00:00.000Z',
        statementId: 'st-april',
      },
    ])

    expect(aprilMetrics.invoiceTotal).toBe(5828.83)
    expect(aprilMetrics.purchases).toBe(5836.51)
    expect(aprilMetrics.previousBalance).toBe(0)
    expect(aprilMetrics.remaining).toBe(5828.83)
    expect(aprilMetrics.usesImportedStatementPeriod).toBe(true)
  })

  it('counts early payment before invoice closing date', () => {
    const julyCycle = getBillingCycle(10, 17, '2026-07')
    const julyStatement = {
      id: 'st-july',
      totalAmount: '6751.33',
      isClosed: true,
      periodStart: '2026-06-01T12:00:00.000Z',
      periodEnd: '2026-07-10T12:00:00.000Z',
      dueDate: '2026-07-17T12:00:00.000Z',
      purchasesTotal: '6746.10',
      previousBalance: '5.23',
    }

    const metrics = computeInvoiceMetrics(
      julyCycle,
      julyStatement,
      [
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '500.00',
          date: '2026-07-03T12:00:00.000Z',
          statementId: 'st-july',
        },
      ],
      {
        closingDay: 10,
        dueDay: 17,
        previousStatement: { dueDate: '2026-06-08T12:00:00.000Z' },
      }
    )

    expect(metrics.payments).toBe(500)
    expect(metrics.remaining).toBe(6251.33)
  })

  it('aligns imported invoice KPIs with OFX period and derives previous balance', () => {
    const julyCycle = getBillingCycle(10, 17, '2026-07')
    const julyStatement = {
      totalAmount: '6751.33',
      isClosed: true,
      periodStart: '2026-06-01T12:00:00.000Z',
      periodEnd: '2026-07-10T12:00:00.000Z',
      dueDate: '2026-07-17T12:00:00.000Z',
      purchasesTotal: '6746.10',
      previousBalance: '5.23',
      paymentsReceived: '0',
    }

    const metrics = computeInvoiceMetrics(julyCycle, julyStatement, [])

    expect(metrics.purchases).toBe(6746.1)
    expect(metrics.previousBalance).toBe(5.23)
    expect(metrics.invoiceTotal).toBe(6751.33)
    expect(metrics.usesImportedStatementPeriod).toBe(true)
  })

  it('includes manual purchases on top of imported statement summary', () => {
    const julyCycle = getBillingCycle(10, 17, '2026-07')
    const julyStatement = {
      id: 'st-july',
      totalAmount: '6751.33',
      isClosed: true,
      periodStart: '2026-06-01T12:00:00.000Z',
      periodEnd: '2026-07-10T12:00:00.000Z',
      dueDate: '2026-07-17T12:00:00.000Z',
      purchasesTotal: '6746.10',
      previousBalance: '5.23',
    }

    const metrics = computeInvoiceMetrics(julyCycle, julyStatement, [
      {
        type: 'expense',
        amount: '16.94',
        date: '2026-07-03T12:00:00.000Z',
        source: 'manual',
      },
      { type: 'income', amount: '500.00', date: '2026-07-03T12:00:00.000Z' },
    ])

    expect(metrics.purchases).toBe(6763.04)
    expect(metrics.invoiceTotal).toBe(6768.27)
    expect(metrics.remaining).toBe(6268.27)
  })

  it('derives previous balance when imported statement omits summary fields', () => {
    const julyCycle = getBillingCycle(10, 17, '2026-07')
    const julyStatement = {
      totalAmount: '100.00',
      isClosed: true,
      periodStart: '2026-06-01T12:00:00.000Z',
      periodEnd: '2026-07-10T12:00:00.000Z',
      dueDate: '2026-07-17T12:00:00.000Z',
    }

    const metrics = computeInvoiceMetrics(julyCycle, julyStatement, [
      {
        type: 'expense',
        amount: '30.00',
        date: '2026-06-15T12:00:00.000Z',
      },
      {
        type: 'expense',
        amount: '20.00',
        date: '2026-07-05T12:00:00.000Z',
      },
    ])

    expect(metrics.purchases).toBe(50)
    expect(metrics.previousBalance).toBe(50)
    expect(metrics.invoiceTotal).toBe(100)
  })
})

describe('filterTransactionsForInvoiceCycle', () => {
  it('includes imported bill payments that fall inside the purchase period', () => {
    const julyCycle = getBillingCycle(10, 17, '2026-07')
    const julyStatement = {
      id: 'st-july',
      totalAmount: '6268.27',
      isClosed: false,
      importSource: 'ofx',
      periodStart: '2026-06-01T12:00:00.000Z',
      periodEnd: '2026-07-10T12:00:00.000Z',
      dueDate: '2026-07-17T12:00:00.000Z',
    }

    const items = filterTransactionsForInvoiceCycle(
      [
        {
          type: 'expense',
          amount: '16.94',
          date: '2026-07-03T12:00:00.000Z',
          statementId: 'st-july',
        },
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '500.00',
          date: '2026-07-03T12:00:00.000Z',
          statementId: 'st-july',
        },
        {
          type: 'income',
          title: '99Food - NuPay',
          amount: '18.98',
          date: '2026-06-27T12:00:00.000Z',
          statementId: 'st-july',
        },
      ],
      julyCycle,
      julyStatement,
      {
        closingDay: 10,
        dueDay: 17,
        previousStatement: { dueDate: '2026-06-08T12:00:00.000Z' },
      }
    )

    expect(items).toHaveLength(3)
    expect(items.filter(item => item.type === 'income')).toHaveLength(2)
  })

  it('excludes manual Pagamento Fatura for the same month when OFX is imported', () => {
    const juneCycle = getBillingCycle(1, 8, '2026-06')
    const juneStatement = {
      id: 'st-june',
      totalAmount: '6983.60',
      isClosed: true,
      isPaid: true,
      importSource: 'ofx',
      purchasesTotal: '7010.61',
      previousBalance: '6956.59',
      periodStart: '2026-05-01T12:00:00.000Z',
      periodEnd: '2026-06-01T12:00:00.000Z',
      dueDate: '2026-06-08T12:00:00.000Z',
    }

    const items = filterTransactionsForInvoiceCycle(
      [
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '5604.49',
          date: '2026-05-08T12:00:00.000Z',
          statementId: 'st-june',
        },
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '500.00',
          date: '2026-05-05T12:00:00.000Z',
          statementId: 'st-june',
        },
        {
          type: 'income',
          title: 'Pagamento Fatura Nubank Ultravioleta - junho 2026',
          amount: '6983.60',
          date: '2026-06-08T12:00:00.000Z',
          source: 'manual',
        },
      ],
      juneCycle,
      juneStatement,
      {
        closingDay: 1,
        dueDay: 8,
        previousStatement: { dueDate: '2026-05-08T12:00:00.000Z' },
      }
    )

    expect(items.map(item => item.title)).toEqual(['Pagamento recebido', 'Pagamento recebido'])
    expect(isAppBookkeepingInvoicePayment({ title: 'Pagamento Fatura Nubank - junho 2026' })).toBe(
      true
    )
    expect(
      isInvoicePayment(
        {
          type: 'income',
          title: 'Pagamento Fatura Nubank Ultravioleta - junho 2026',
          amount: '6983.60',
          date: '2026-06-08T12:00:00.000Z',
        },
        { start: juneStatement.periodStart, end: juneStatement.periodEnd },
        { start: '2026-05-09', end: juneStatement.dueDate },
        juneCycle,
        juneStatement
      )
    ).toBe(false)
  })

  it('excludes manual pay-invoice from another month when OFX period spans months', () => {
    const julyCycle = getBillingCycle(10, 17, '2026-07')
    const julyStatement = {
      id: 'st-july',
      totalAmount: '6268.27',
      isClosed: false,
      importSource: 'ofx',
      periodStart: '2026-06-01T12:00:00.000Z',
      periodEnd: '2026-07-10T12:00:00.000Z',
      dueDate: '2026-07-17T12:00:00.000Z',
    }

    const items = filterTransactionsForInvoiceCycle(
      [
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '2500.00',
          date: '2026-06-01T12:00:00.000Z',
          statementId: 'st-july',
        },
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '4456.61',
          date: '2026-06-08T12:00:00.000Z',
          statementId: 'st-july',
        },
        {
          type: 'income',
          title: 'Pagamento Fatura Nubank Ultravioleta - junho 2026',
          amount: '6983.60',
          date: '2026-06-08T12:00:00.000Z',
          source: 'manual',
        },
        {
          type: 'income',
          title: 'Pagamento recebido',
          amount: '500.00',
          date: '2026-07-03T12:00:00.000Z',
          statementId: 'st-july',
        },
      ],
      julyCycle,
      julyStatement,
      {
        closingDay: 10,
        dueDay: 17,
        previousStatement: { dueDate: '2026-06-08T12:00:00.000Z' },
      }
    )

    expect(items.map(item => item.title)).toEqual([
      'Pagamento recebido',
      'Pagamento recebido',
      'Pagamento recebido',
    ])
  })
})

describe('computeInvoiceAmountReconciliation', () => {
  it('derives invoice credits from purchases and imported total', async () => {
    const { computeInvoiceAmountReconciliation } = await import('./credit-card-invoice-metrics')

    expect(
      computeInvoiceAmountReconciliation({
        purchases: 5836.51,
        previousBalance: 0,
        invoiceTotal: 5828.83,
      })
    ).toEqual({
      purchases: 5836.51,
      previousBalance: 0,
      invoiceCredits: 7.68,
      invoiceCharges: 0,
    })
  })

  it('includes previous balance in the reconciliation base', async () => {
    const { computeInvoiceAmountReconciliation } = await import('./credit-card-invoice-metrics')

    expect(
      computeInvoiceAmountReconciliation({
        purchases: 500,
        previousBalance: 100,
        invoiceTotal: 600,
      })
    ).toEqual({
      purchases: 500,
      previousBalance: 100,
      invoiceCredits: 0,
      invoiceCharges: 0,
    })
  })

  it('derives extra invoice charges when total exceeds purchases plus balance', async () => {
    const { computeInvoiceAmountReconciliation } = await import('./credit-card-invoice-metrics')

    expect(
      computeInvoiceAmountReconciliation({
        purchases: 500,
        previousBalance: 0,
        invoiceTotal: 515,
      })
    ).toEqual({
      purchases: 500,
      previousBalance: 0,
      invoiceCredits: 0,
      invoiceCharges: 15,
    })
  })
})

describe('computePersonalSpendAdjustment', () => {
  it('returns the split portion when personal spend is lower than purchases', async () => {
    const { computePersonalSpendAdjustment } = await import('./credit-card-invoice-metrics')

    expect(computePersonalSpendAdjustment(6000, 5836.51)).toBe(163.49)
    expect(computePersonalSpendAdjustment(5836.51, 5836.51)).toBe(0)
  })
})

describe('listInvoiceAdjustmentCredits', () => {
  it('lists settlement credits in the purchase period', async () => {
    const { listInvoiceAdjustmentCredits } = await import('./credit-card-invoice-metrics')
    const cycle = getBillingCycle(10, 17, '2026-06')
    const period = {
      start: '2026-05-01T12:00:00.000Z',
      end: '2026-06-08T12:00:00.000Z',
    }
    const statement = { id: 'st-june' }

    expect(
      listInvoiceAdjustmentCredits(
        [
          {
            type: 'income',
            title: 'Crédito de Confiança de "Vantagens.Cvolta.Com"',
            amount: '27.00',
            date: '2026-05-29T12:00:00.000Z',
            statementId: 'st-june',
          },
          {
            type: 'income',
            title: 'Pagamento recebido',
            amount: '2500.00',
            date: '2026-06-01T12:00:00.000Z',
            statementId: 'st-june',
          },
          {
            type: 'income',
            title: 'Reversão do Crédito de confiança de Vantagens.Cvolta.Com',
            amount: '27.00',
            date: '2026-06-01T12:00:00.000Z',
            statementId: 'st-june',
          },
        ],
        period,
        cycle,
        statement
      )
    ).toEqual([
      {
        title: 'Crédito — Vantagens.Cvolta.Com',
        amount: 27,
      },
    ])
  })

  it('includes large credits that reduce the invoice total', async () => {
    const { listInvoiceAdjustmentCredits } = await import('./credit-card-invoice-metrics')
    const cycle = getBillingCycle(10, 17, '2026-07')
    const period = {
      start: '2026-06-01T12:00:00.000Z',
      end: '2026-07-17T12:00:00.000Z',
    }

    expect(
      listInvoiceAdjustmentCredits(
        [
          {
            type: 'income',
            title: 'Estorno de Compra Loja Exemplo',
            amount: '494.77',
            date: '2026-06-15T12:00:00.000Z',
            statementId: 'st-july',
          },
        ],
        period,
        cycle,
        { id: 'st-july' }
      )
    ).toEqual([
      {
        title: 'Estorno de Compra Loja Exemplo',
        amount: 494.77,
      },
    ])
  })

  it('includes credits after purchase period end but before due date', async () => {
    const { listInvoiceAdjustmentCredits } = await import('./credit-card-invoice-metrics')
    const cycle = getBillingCycle(10, 17, '2026-07')
    const purchasesEnd = '2026-07-10T23:59:59.999Z'
    const period = {
      start: '2026-06-01T12:00:00.000Z',
      end: '2026-07-17T12:00:00.000Z',
    }

    expect(
      listInvoiceAdjustmentCredits(
        [
          {
            type: 'income',
            title: 'Estorno de compra (Compra e Volta)',
            amount: '446.91',
            date: '2026-07-12T12:00:00.000Z',
            statementId: 'st-july',
          },
          {
            type: 'income',
            title: 'Estorno de compra (Compra e Volta)',
            amount: '27.00',
            date: '2026-06-15T12:00:00.000Z',
            statementId: 'st-july',
          },
        ],
        period,
        cycle,
        { id: 'st-july' }
      )
    ).toEqual([
      { title: 'Estorno de compra (Compra e Volta)', amount: 446.91 },
      { title: 'Estorno de compra (Compra e Volta)', amount: 27 },
    ])

    expect(
      listInvoiceAdjustmentCredits(
        [
          {
            type: 'income',
            title: 'Estorno de compra (Compra e Volta)',
            amount: '446.91',
            date: '2026-07-12T12:00:00.000Z',
            statementId: 'st-july',
          },
        ],
        { start: '2026-06-01T12:00:00.000Z', end: purchasesEnd },
        cycle,
        { id: 'st-july' }
      )
    ).toEqual([])
  })

  it('uses competenceDate when date falls outside the billing window', async () => {
    const { listInvoiceAdjustmentCredits } = await import('./credit-card-invoice-metrics')
    const cycle = getBillingCycle(10, 17, '2026-07')
    const period = {
      start: '2026-06-01T12:00:00.000Z',
      end: '2026-07-17T12:00:00.000Z',
    }

    expect(
      listInvoiceAdjustmentCredits(
        [
          {
            type: 'income',
            title: 'Estorno Loja Exemplo',
            amount: '500.00',
            date: '2026-07-20T12:00:00.000Z',
            competenceDate: '2026-06-20T12:00:00.000Z',
            statementId: 'st-july',
          },
        ],
        period,
        cycle,
        { id: 'st-july' }
      )
    ).toEqual([{ title: 'Estorno Loja Exemplo', amount: 500 }])
  })
})

describe('resolveUnlistedInvoiceCredits', () => {
  it('hides sub-real residuals', async () => {
    const { resolveUnlistedInvoiceCredits } = await import('./credit-card-invoice-metrics')

    expect(
      resolveUnlistedInvoiceCredits(494.77, [
        { title: 'A', amount: 494 },
        { title: 'B', amount: 0.5 },
      ])
    ).toBe(0)
  })

  it('surfaces meaningful bank-level adjustments', async () => {
    const { resolveUnlistedInvoiceCredits } = await import('./credit-card-invoice-metrics')

    expect(
      resolveUnlistedInvoiceCredits(494.77, [{ title: 'A', amount: 27 }])
    ).toBe(467.77)
  })
})

describe('buildCreditCardReportScope', () => {
  it('scopes reports to the matched imported statement', async () => {
    const { buildCreditCardReportScope } = await import('./credit-card-invoice-metrics')

    expect(buildCreditCardReportScope({ id: 'st-april', totalAmount: '100.00' })).toEqual({
      statementId: 'st-april',
    })
  })

  it('excludes imported lines when there is no matched statement', async () => {
    const { buildCreditCardReportScope } = await import('./credit-card-invoice-metrics')

    expect(buildCreditCardReportScope(null)).toEqual({ excludeImported: true })
  })
})
