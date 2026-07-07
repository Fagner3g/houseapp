import { describe, expect, it } from 'vitest'

import { filterAnalyticsGroupTransactions } from './filter-analytics-group-transactions'

describe('filterAnalyticsGroupTransactions', () => {
  const transactions = [
    {
      id: '1',
      title: 'App Premmia - NuPay',
      type: 'expense' as const,
      date: '2026-06-25T12:00:00.000Z',
      competenceDate: null,
      categoryIds: ['cat-food'],
    },
    {
      id: '2',
      title: 'App Premmia - NuPay - Parcela 2/3',
      type: 'expense' as const,
      date: '2026-06-20T12:00:00.000Z',
      competenceDate: null,
      categoryIds: ['cat-food'],
    },
    {
      id: '3',
      title: 'Supermercado BH',
      type: 'expense' as const,
      date: '2026-06-18T12:00:00.000Z',
      competenceDate: null,
      categoryIds: ['cat-market'],
    },
    {
      id: '4',
      title: 'Pagamento recebido',
      type: 'income' as const,
      date: '2026-06-18T12:00:00.000Z',
      competenceDate: null,
      categoryIds: [],
    },
  ]

  const period = {
    start: '2026-06-01T00:00:00.000Z',
    end: '2026-07-10T23:59:59.999Z',
  }

  it('groups merchant purchases by normalized title', () => {
    const result = filterAnalyticsGroupTransactions(
      transactions as never,
      { type: 'merchant', key: 'app premmia - nupay' },
      period
    )

    expect(result.map(item => item.id)).toEqual(['1', '2'])
  })

  it('filters category purchases in the billing period', () => {
    const result = filterAnalyticsGroupTransactions(
      transactions as never,
      { type: 'category', key: 'cat-market' },
      period
    )

    expect(result.map(item => item.id)).toEqual(['3'])
  })
})
