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
      statementId: 'st-july',
    },
    {
      id: '2',
      title: 'App Premmia - NuPay - Parcela 2/3',
      type: 'expense' as const,
      date: '2026-06-20T12:00:00.000Z',
      competenceDate: null,
      categoryIds: ['cat-food'],
      statementId: 'st-july',
    },
    {
      id: '3',
      title: 'Supermercado BH',
      type: 'expense' as const,
      date: '2026-06-18T12:00:00.000Z',
      competenceDate: null,
      categoryIds: ['cat-market'],
      statementId: 'st-july',
    },
    {
      id: '4',
      title: 'Pagamento recebido',
      type: 'income' as const,
      date: '2026-06-18T12:00:00.000Z',
      competenceDate: null,
      categoryIds: [],
      statementId: 'st-july',
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
      period,
      'st-july'
    )

    expect(result.map(item => item.id)).toEqual(['1', '2'])
  })

  it('filters category purchases in the billing period', () => {
    const result = filterAnalyticsGroupTransactions(
      transactions as never,
      { type: 'category', key: 'cat-market' },
      period,
      'st-july'
    )

    expect(result.map(item => item.id)).toEqual(['3'])
  })

  it('excludes purchases from another statement in the OFX overlap window', () => {
    const withOverlap = [
      ...transactions,
      {
        id: '5',
        title: 'Loja Anterior',
        type: 'expense' as const,
        date: '2026-06-05T12:00:00.000Z',
        competenceDate: null,
        categoryIds: ['cat-market'],
        statementId: 'st-june',
      },
      {
        id: '6',
        title: 'Compra Manual',
        type: 'expense' as const,
        date: '2026-06-08T12:00:00.000Z',
        competenceDate: null,
        categoryIds: ['cat-market'],
        statementId: null,
      },
    ]

    const result = filterAnalyticsGroupTransactions(
      withOverlap as never,
      { type: 'category', key: 'cat-market' },
      period,
      'st-july'
    )

    expect(result.map(item => item.id)).toEqual(['3', '6'])
  })

  it('keeps only manual purchases when there is no matched statement', () => {
    const result = filterAnalyticsGroupTransactions(
      [
        {
          id: 'imported',
          title: 'Importada',
          type: 'expense' as const,
          date: '2026-06-18T12:00:00.000Z',
          competenceDate: null,
          categoryIds: ['cat-market'],
          statementId: 'st-july',
        },
        {
          id: 'manual',
          title: 'Manual',
          type: 'expense' as const,
          date: '2026-06-18T12:00:00.000Z',
          competenceDate: null,
          categoryIds: ['cat-market'],
          statementId: null,
        },
      ] as never,
      { type: 'category', key: 'cat-market' },
      period,
      null
    )

    expect(result.map(item => item.id)).toEqual(['manual'])
  })
})
