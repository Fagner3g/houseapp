import { describe, expect, it } from 'vitest'

import {
  getImportReviewGroupSignedAmount,
  getImportReviewSignedAmount,
} from './import-review-amount'

describe('getImportReviewSignedAmount', () => {
  it('prefixes expenses with minus and income with plus', () => {
    const expense = getImportReviewSignedAmount('100.00', 'expense')
    const income = getImportReviewSignedAmount('25.50', 'income')

    expect(expense.label).toMatch(/^- R\$\s?100,00$/)
    expect(expense.className).toBe('text-rose-600')
    expect(income.label).toMatch(/^\+ R\$\s?25,50$/)
    expect(income.className).toBe('text-emerald-600')
  })
})

describe('getImportReviewGroupSignedAmount', () => {
  it('uses uniform type for group totals', () => {
    const signed = getImportReviewGroupSignedAmount([], {
      total: '80.00',
      uniformType: 'expense',
    })

    expect(signed.label).toMatch(/^- R\$\s?80,00$/)
    expect(signed.className).toBe('text-rose-600')
  })

  it('nets mixed group totals by transaction type', () => {
    const signed = getImportReviewGroupSignedAmount(
      [
        {
          id: 'a',
          index: 0,
          title: 'IOF',
          amount: '3.91',
          date: '2026-03-01',
          type: 'expense',
          categoryId: null,
        },
        {
          id: 'b',
          index: 1,
          title: 'IOF de volta',
          amount: '3.91',
          date: '2026-03-02',
          type: 'income',
          categoryId: null,
        },
      ],
      { total: '7.82', uniformType: null }
    )

    expect(signed.label).toMatch(/^R\$\s?0,00$/)
    expect(signed.className).toBe('text-slate-500')
  })
})
