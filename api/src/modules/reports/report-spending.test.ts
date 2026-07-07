import { describe, expect, it } from 'vitest'

import {
  countsAsReportExpense,
  countsAsReportIncome,
  expenseAmountForReport,
  isInvoicePaymentTitle,
  purchaseDateForTransaction,
} from './report-spending'

const julyRange = {
  from: new Date('2026-07-01T00:00:00.000Z'),
  to: new Date('2026-07-31T23:59:59.999Z'),
}

describe('isInvoicePaymentTitle', () => {
  it('detects invoice payment titles', () => {
    expect(isInvoicePaymentTitle('Pagamento fatura Nubank')).toBe(true)
    expect(isInvoicePaymentTitle('Supermercado')).toBe(false)
  })
})

describe('purchaseDateForTransaction', () => {
  it('prefers competence date over transaction date', () => {
    const date = new Date('2026-06-28T12:00:00.000Z')
    const competenceDate = new Date('2026-07-05T12:00:00.000Z')

    expect(purchaseDateForTransaction({ date, competenceDate })).toEqual(competenceDate)
    expect(purchaseDateForTransaction({ date, competenceDate: null })).toEqual(date)
  })
})

describe('countsAsReportExpense', () => {
  it('includes pending credit card purchase by competence date', () => {
    expect(
      countsAsReportExpense(
        {
          type: 'expense',
          status: 'pending',
          title: 'iFood',
          date: new Date('2026-06-28T12:00:00.000Z'),
          competenceDate: new Date('2026-07-05T12:00:00.000Z'),
          amount: 5000n,
          accountType: 'credit_card',
        },
        julyRange
      )
    ).toBe(true)
  })

  it('excludes card purchase outside range by competence date', () => {
    expect(
      countsAsReportExpense(
        {
          type: 'expense',
          status: 'pending',
          title: 'iFood',
          date: new Date('2026-06-28T12:00:00.000Z'),
          competenceDate: new Date('2026-06-05T12:00:00.000Z'),
          amount: 5000n,
          accountType: 'credit_card',
        },
        julyRange
      )
    ).toBe(false)
  })

  it('includes paid checking expense in range', () => {
    expect(
      countsAsReportExpense(
        {
          type: 'expense',
          status: 'paid',
          title: 'Aluguel',
          date: new Date('2026-07-10T12:00:00.000Z'),
          paidAmount: 200000n,
          accountType: 'checking',
        },
        julyRange
      )
    ).toBe(true)
  })

  it('excludes invoice payment from checking account', () => {
    expect(
      countsAsReportExpense(
        {
          type: 'expense',
          status: 'paid',
          title: 'Pagamento fatura Nubank',
          date: new Date('2026-07-15T12:00:00.000Z'),
          paidAmount: 300000n,
          accountType: 'checking',
        },
        julyRange
      )
    ).toBe(false)
  })
})

describe('countsAsReportIncome', () => {
  it('includes paid checking income', () => {
    expect(
      countsAsReportIncome(
        {
          type: 'income',
          status: 'paid',
          title: 'Salário',
          date: new Date('2026-07-05T12:00:00.000Z'),
          paidAmount: 600000n,
          accountType: 'checking',
        },
        julyRange
      )
    ).toBe(true)
  })

  it('excludes credit card income (invoice payment)', () => {
    expect(
      countsAsReportIncome(
        {
          type: 'income',
          status: 'paid',
          title: 'Pagamento recebido',
          date: new Date('2026-07-15T12:00:00.000Z'),
          paidAmount: 300000n,
          accountType: 'credit_card',
        },
        julyRange
      )
    ).toBe(false)
  })
})

describe('expenseAmountForReport', () => {
  it('uses amount for credit card purchases', () => {
    expect(
      expenseAmountForReport({
        type: 'expense',
        status: 'pending',
        title: 'Uber',
        date: new Date(),
        amount: 4500n,
        paidAmount: null,
        accountType: 'credit_card',
      })
    ).toBe(4500n)
  })

  it('uses paid amount for checking expenses', () => {
    expect(
      expenseAmountForReport({
        type: 'expense',
        status: 'paid',
        title: 'Aluguel',
        date: new Date(),
        amount: 200000n,
        paidAmount: 200000n,
        accountType: 'checking',
      })
    ).toBe(200000n)
  })
})
