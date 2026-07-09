import { describe, expect, it } from 'vitest'

import type { InvoiceSummaryRow } from '@/features/transactions/types'

import { computeTransactionKpis } from './transaction-kpi'

function invoice(overrides: Partial<InvoiceSummaryRow>): InvoiceSummaryRow {
  return {
    kind: 'invoice_summary',
    id: 'inv-1',
    accountId: 'cc-1',
    accountName: 'Nubank',
    monthKey: '2026-07',
    title: 'Fatura Nubank — julho 2026',
    amount: '6.06',
    payments: '0.00',
    remaining: '6.06',
    type: 'expense',
    date: '2026-07-18T12:00:00.000Z',
    status: 'pending',
    ...overrides,
  }
}

describe('computeTransactionKpis', () => {
  it('includes open invoice remaining in pending expenses', () => {
    const kpis = computeTransactionKpis({
      reportTotalIncome: 5000,
      reportTotalExpense: 0,
      paidPayableExpenses: [],
      pendingPayableExpenses: [{ title: 'Aluguel', amount: '1500.00' }],
      pendingIncomeAmounts: [],
      invoiceSummaries: [invoice({ amount: '243.11', remaining: '243.11' })],
    })

    expect(kpis.pendingExpense).toBe(1500 + 243.11)
    expect(kpis.balance).toBe(5000)
  })

  it('counts paid invoice via credit-card payment without double-counting checking debit', () => {
    const kpis = computeTransactionKpis({
      reportTotalIncome: 5000,
      reportTotalExpense: 450,
      paidPayableExpenses: [
        {
          title: 'Pagamento Fatura Nubank - junho 2026',
          amount: '450.00',
          paidAmount: '450.00',
        },
      ],
      pendingPayableExpenses: [],
      pendingIncomeAmounts: [],
      invoiceSummaries: [
        invoice({
          amount: '450.00',
          payments: '450.00',
          remaining: '0.00',
          status: 'paid',
        }),
      ],
    })

    expect(kpis.paid).toBe(450)
    expect(kpis.balance).toBe(5000 - 450)
  })

  it('counts invoice paid only on credit card (no checking expense)', () => {
    const kpis = computeTransactionKpis({
      reportTotalIncome: 5000,
      reportTotalExpense: 0,
      paidPayableExpenses: [],
      pendingPayableExpenses: [],
      pendingIncomeAmounts: [],
      invoiceSummaries: [
        invoice({
          amount: '450.00',
          payments: '450.00',
          remaining: '0.00',
          status: 'paid',
        }),
      ],
    })

    expect(kpis.paid).toBe(450)
    expect(kpis.balance).toBe(5000 - 450)
  })

  it('counts whole-reais invoice payments without centavos drift', () => {
    const kpis = computeTransactionKpis({
      reportTotalIncome: 0,
      reportTotalExpense: 0,
      paidPayableExpenses: [],
      pendingPayableExpenses: [],
      pendingIncomeAmounts: [],
      invoiceSummaries: [
        invoice({
          amount: '6384.67',
          payments: '500.00',
          remaining: '6384.67',
        }),
      ],
    })

    expect(kpis.paid).toBe(500)
    expect(kpis.pendingExpense).toBe(6384.67)
  })
})
