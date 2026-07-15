import { describe, expect, it } from 'vitest'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'

import {
  sumViewerShares,
  transactionsWithViewerShareAmounts,
} from './debtor-analytics'

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

describe('sumViewerShares', () => {
  it('sums share amounts for listed transaction ids', () => {
    const viewerShareById = new Map([
      ['tx-1', { amount: 83.75, remainingAmount: 83.75 }],
      ['tx-2', { amount: 19.5, remainingAmount: 19.5 }],
      ['tx-3', { amount: 11.56, remainingAmount: 11.56 }],
    ])

    expect(sumViewerShares(['tx-1', 'tx-2', 'tx-missing'], viewerShareById)).toBeCloseTo(
      103.25,
      2
    )
  })
})

describe('transactionsWithViewerShareAmounts', () => {
  it('keeps only txs with a positive viewer share and replaces amount', () => {
    const result = transactionsWithViewerShareAmounts(
      [
        makeTransaction({ id: 'tx-1', amount: '167.51' }),
        makeTransaction({ id: 'tx-2', amount: '50.00' }),
        makeTransaction({ id: 'tx-3', amount: '10.00' }),
      ],
      new Map([
        ['tx-1', { amount: 83.75, remainingAmount: 83.75 }],
        ['tx-3', { amount: 0, remainingAmount: 0 }],
      ])
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'tx-1', amount: '83.75' })
  })
})
