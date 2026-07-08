import { describe, expect, it, vi } from 'vitest'

vi.mock('@/domain/ai/providers', () => ({
  completeWithProvider: vi.fn(),
  listAvailableProviders: vi.fn(() => []),
}))

import { categorizeStatementTransactions } from './statement-categorizer'

const categories = [
  { id: 'income-salary', name: 'Salário', type: 'income' },
  { id: 'expense-shopping', name: 'Vestuário & Acessórios', type: 'expense' },
  { id: 'expense-bars', name: 'Bares', type: 'expense' },
  { id: 'expense-online', name: 'Compras Online & Marketplaces', type: 'expense' },
  { id: 'expense-restaurants', name: 'Restaurantes & Delivery', type: 'expense' },
  { id: 'expense-supermarket', name: 'Supermercado', type: 'expense' },
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
            categoryName: 'Vestuário & Acessórios',
            categoryType: 'expense',
          },
        ],
      }
    )

    expect(result[0]?.categoryIds).toEqual(['expense-shopping'])
  })

  it('categorizes bars separately from restaurants', async () => {
    const titles = [
      ['Cervejaria Fillys', 'expense-bars'],
      ['Bar do Ze Flavio', 'expense-bars'],
      ['Pub Irlandês', 'expense-bars'],
      ['iFood *Restaurante', 'expense-restaurants'],
    ] as const

    for (const [title, categoryId] of titles) {
      const result = await categorizeStatementTransactions(
        [
          {
            title,
            amount: '100.00',
            type: 'expense',
            date: '2026-06-01T00:00:00.000Z',
          },
        ],
        categories
      )

      expect(result[0]?.categoryIds).toEqual([categoryId])
    }
  })

  it('categorizes online marketplaces separately from clothing stores', async () => {
    const titles = [
      ['Shopee*Valcilene Maria', 'expense-online'],
      ['Mercado Livre*Loja', 'expense-online'],
      ['ZP*OLX - NuPay - Parcela 3/3', 'expense-online'],
      ['Renner Loja 123', 'expense-shopping'],
    ] as const

    for (const [title, categoryId] of titles) {
      const result = await categorizeStatementTransactions(
        [
          {
            title,
            amount: '100.00',
            type: 'expense',
            date: '2026-06-01T00:00:00.000Z',
          },
        ],
        categories
      )

      expect(result[0]?.categoryIds).toEqual([categoryId])
    }
  })

  it('does not classify Mercado Livre as supermarket', async () => {
    const result = await categorizeStatementTransactions(
      [
        {
          title: 'Mercado Livre*Produto',
          amount: '50.00',
          type: 'expense',
          date: '2026-06-01T00:00:00.000Z',
        },
      ],
      categories
    )

    expect(result[0]?.categoryIds).toEqual(['expense-online'])
  })

  it('does not categorize card statement credits such as Pagamento recebido', async () => {
    const titles = ['Pagamento recebido', 'Estorno', 'Crédito de Confiança de "Loja"'] as const

    for (const title of titles) {
      const result = await categorizeStatementTransactions(
        [
          {
            title,
            amount: '6208.85',
            type: 'income',
            date: '2026-03-09T00:00:00.000Z',
          },
        ],
        [
          ...categories,
          { id: 'income-salary', name: 'Salário', type: 'income' },
        ],
        {
          historicalExamples: [
            {
              title: 'Pagamento recebido',
              categoryId: 'income-salary',
              categoryName: 'Salário',
              categoryType: 'income',
            },
          ],
        }
      )

      expect(result[0]?.categoryIds).toBeUndefined()
    }
  })
})
