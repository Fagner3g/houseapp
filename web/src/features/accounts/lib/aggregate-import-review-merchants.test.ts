import { describe, expect, it } from 'vitest'

import type { ParsedTransactionReviewItem } from '../components/import-review-types'

import {
  aggregateImportReviewMerchants,
  formatImportReviewMerchantSubtitle,
} from './aggregate-import-review-merchants'

function makeItem(
  overrides: Partial<ParsedTransactionReviewItem> = {}
): ParsedTransactionReviewItem {
  return {
    id: 'preview-0',
    index: 0,
    title: 'Loja XYZ',
    amount: '100.00',
    date: '2026-01-10',
    type: 'expense',
    categoryId: null,
    ...overrides,
  }
}

describe('aggregateImportReviewMerchants', () => {
  it('groups items by normalized merchant title', () => {
    const items = [
      makeItem({ id: 'preview-0', title: 'Loja XYZ - Parcela 1/3', amount: '100.00' }),
      makeItem({ id: 'preview-1', title: 'Loja XYZ - Parcela 2/3', amount: '100.00', date: '2026-01-15' }),
      makeItem({ id: 'preview-2', title: 'Outra Loja', amount: '40.00' }),
    ]

    const { merchants, grandTotal } = aggregateImportReviewMerchants(items, {})

    expect(grandTotal).toBe('240.00')
    expect(merchants).toHaveLength(2)
    expect(merchants[0]).toMatchObject({
      key: 'loja xyz',
      label: 'Loja XYZ',
      total: '200.00',
      occurrenceCount: 2,
      isRecurring: true,
      hasInstallments: true,
      itemIds: ['preview-0', 'preview-1'],
      reviewItemIds: ['preview-0', 'preview-1'],
      reviewCount: 2,
    })
    expect(merchants[1]).toMatchObject({
      key: 'outra loja',
      total: '40.00',
      occurrenceCount: 1,
      isRecurring: false,
    })
  })

  it('tracks review status from rows and duplicates', () => {
    const items = [
      makeItem({ id: 'preview-0', title: 'iFood - NuPay', amount: '25.00' }),
      makeItem({ id: 'preview-1', title: 'iFood - NuPay', amount: '30.00', isDuplicate: true }),
      makeItem({ id: 'preview-2', title: 'iFood - NuPay', amount: '15.00' }),
    ]

    const { merchants } = aggregateImportReviewMerchants(items, {
      'preview-0': {
        id: 'preview-0',
        categoryId: 'cat-1',
        splitMode: 'none',
        splitPersonMode: 'member',
        splitUserId: null,
        splitContactName: '',
        splitContactPhone: '',
        splitAmountReais: 0,
        validated: true,
      },
      'preview-2': {
        id: 'preview-2',
        categoryId: null,
        splitMode: 'none',
        splitPersonMode: 'member',
        splitUserId: null,
        splitContactName: '',
        splitContactPhone: '',
        splitAmountReais: 0,
        validated: false,
      },
    })

    expect(merchants).toHaveLength(1)
    expect(merchants[0]).toMatchObject({
      occurrenceCount: 3,
      existingCount: 1,
      reviewCount: 2,
      approvedCount: 1,
      uncategorizedCount: 1,
    })
  })

  it('sets uniformType null when group mixes income and expense', () => {
    const items = [
      makeItem({ id: 'preview-0', title: 'Estorno Loja', type: 'income' }),
      makeItem({ id: 'preview-1', title: 'Estorno Loja', type: 'expense' }),
    ]

    const { merchants } = aggregateImportReviewMerchants(items, {})

    expect(merchants[0]?.uniformType).toBeNull()
  })
})

describe('formatImportReviewMerchantSubtitle', () => {
  it('describes mixed existing and review counts', () => {
    const subtitle = formatImportReviewMerchantSubtitle({
      key: 'ifood',
      label: 'iFood',
      total: '70.00',
      avgAmount: '23.33',
      lastDate: '2026-07-02',
      occurrenceCount: 3,
      isRecurring: true,
      hasInstallments: false,
      itemIds: ['a', 'b', 'c'],
      reviewItemIds: ['a', 'c'],
      existingCount: 1,
      reviewCount: 2,
      approvedCount: 1,
      uncategorizedCount: 1,
      uniformType: 'expense',
    })

    expect(subtitle).toBe('1 já no sistema · 2 para revisar · 1 sem categoria · 1/2 aprovados')
  })
})
