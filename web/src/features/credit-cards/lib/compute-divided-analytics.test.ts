import { describe, expect, it } from 'vitest'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'

import {
  aggregateCategoriesFromTransactions,
  aggregateMerchantsFromTransactions,
  filterDividedExpenseTransactions,
} from './compute-divided-analytics'

function makeTransaction(
  overrides: Partial<ListTransactions200TransactionsItem> = {}
): ListTransactions200TransactionsItem {
  return {
    id: 'tx-1',
    organizationId: 'org-1',
    accountId: 'acc-1',
    cardId: null,
    recurringTransactionId: null,
    statementId: null,
    title: 'Loja XYZ',
    description: null,
    amount: '100.00',
    type: 'expense',
    date: '2026-01-10T00:00:00.000Z',
    competenceDate: null,
    status: 'paid',
    paidAt: null,
    paidAmount: null,
    counterparty: null,
    installmentNumber: null,
    installmentsTotal: null,
    source: 'manual',
    categoryIds: ['cat-1'],
    transferPairId: null,
    notifyEnabled: false,
    notifyTargetType: null,
    notifyUserId: null,
    notifyContactName: null,
    notifyContactPhone: null,
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
    ...overrides,
  }
}

describe('filterDividedExpenseTransactions', () => {
  it('keeps only expense transactions with splits', () => {
    const transactions = [
      makeTransaction({ id: 'tx-1' }),
      makeTransaction({ id: 'tx-2', type: 'income' }),
      makeTransaction({ id: 'tx-3' }),
    ]

    expect(
      filterDividedExpenseTransactions(transactions, new Set(['tx-1', 'tx-2'])).map(tx => tx.id)
    ).toEqual(['tx-1'])
  })
})

describe('aggregateCategoriesFromTransactions', () => {
  it('groups divided transactions by category', () => {
    const categories = aggregateCategoriesFromTransactions(
      [
        makeTransaction({ id: 'tx-1', amount: '100.00', categoryIds: ['cat-1'] }),
        makeTransaction({ id: 'tx-2', amount: '50.00', categoryIds: ['cat-1'] }),
        makeTransaction({ id: 'tx-3', amount: '25.00', categoryIds: [] }),
      ],
      [{ categoryId: 'cat-1', name: 'Mercado', color: '#000', total: '0', percentage: '0' }]
    )

    expect(categories).toHaveLength(2)
    expect(categories[0]).toMatchObject({ categoryId: 'cat-1', total: '150.00', percentage: '85.7' })
    expect(categories[1]).toMatchObject({
      categoryId: 'uncategorized',
      name: 'Sem categoria',
      total: '25.00',
    })
  })
})

describe('aggregateMerchantsFromTransactions', () => {
  it('groups divided transactions by normalized merchant title', () => {
    const { merchants, merchantCount, grandTotal } = aggregateMerchantsFromTransactions(
      [
        makeTransaction({ id: 'tx-1', title: 'Loja XYZ - Parcela 1/3', amount: '100.00' }),
        makeTransaction({ id: 'tx-2', title: 'Loja XYZ - Parcela 2/3', amount: '100.00' }),
        makeTransaction({ id: 'tx-3', title: 'Outra Loja', amount: '40.00' }),
      ],
      new Map([['tx-3', 'Maria']])
    )

    expect(merchantCount).toBe(2)
    expect(grandTotal).toBe('240.00')
    expect(merchants[0]).toMatchObject({
      key: 'loja xyz',
      label: 'Loja XYZ',
      total: '200.00',
      occurrenceCount: 2,
      isRecurring: true,
    })
    expect(merchants[1]).toMatchObject({
      key: 'outra loja',
      hasFullyDelegated: true,
      delegatedToName: 'Maria',
    })
  })
})
