import { describe, expect, it, vi } from 'vitest'

vi.mock('@/domain/ai/providers', () => ({
  completeWithProvider: vi.fn(),
  listAvailableProviders: vi.fn(() => []),
}))

import { categorizeStatementTransactions } from './statement-categorizer'

const categories = [
  { id: 'income-salary', name: 'Salário', type: 'income' },
  { id: 'expense-shopping', name: 'Compras Pessoais', type: 'expense' },
]

describe('categorizeStatementTransactions', () => {
  it('does not reuse income history for expense transactions', async () => {
    const result = await categorizeStatementTransactions(
      [
        {
          title: 'Loja Exemplo XYZ',
          amount: '434.29',
          type: 'expense',
          date: '2026-06-01T00:00:00.000Z',
        },
      ],
      categories,
      {
        historicalExamples: [
          {
            title: 'Loja Exemplo ABC',
            categoryId: 'income-salary',
            categoryName: 'Salário',
            categoryType: 'income',
          },
        ],
      }
    )

    expect(result[0]?.categoryIds).toBeUndefined()
  })

  it('reuses expense history for similar expense transactions', async () => {
    const result = await categorizeStatementTransactions(
      [
        {
          title: 'ZP*OLX - NuPay - Parcela 3/3',
          amount: '434.29',
          type: 'expense',
          date: '2026-06-01T00:00:00.000Z',
        },
      ],
      categories,
      {
        historicalExamples: [
          {
            title: 'ZP*OLX - NuPay - Parcela 2/3',
            categoryId: 'expense-shopping',
            categoryName: 'Compras Pessoais',
            categoryType: 'expense',
          },
        ],
      }
    )

    expect(result[0]?.categoryIds).toEqual(['expense-shopping'])
  })
})
