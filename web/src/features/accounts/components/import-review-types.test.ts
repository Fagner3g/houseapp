import { describe, expect, it } from 'vitest'

import { formatCentsString, moneyStringToReais } from '@/lib/currency'

import {
  buildItemsFromParsedTransactions,
  buildPostImportUpdates,
  buildSplitCreateBody,
  buildSplitPayload,
  resolveSplitAmountReais,
} from './import-review-types'

describe('buildItemsFromParsedTransactions', () => {
  it('keeps API decimal amounts so small values display correctly', () => {
    const items = buildItemsFromParsedTransactions([
      {
        title: 'Papelaria Santa Ines',
        amount: '6.00',
        date: '2026-07-07T12:00:00.000Z',
        type: 'expense',
      },
    ])

    expect(items[0]?.amount).toBe('6.00')
    expect(moneyStringToReais(items[0]!.amount)).toBe(6)
    expect(formatCentsString(items[0]!.amount)).toContain('6,00')
  })
})

describe('resolveSplitAmountReais', () => {
  it('parses internal centavos strings', () => {
    expect(resolveSplitAmountReais('90000', 'half', 0)).toBe(450)
    expect(resolveSplitAmountReais('90000', 'full_other', 0)).toBe(900)
  })

  it('parses API decimal reais strings', () => {
    expect(resolveSplitAmountReais('900.00', 'half', 0)).toBe(450)
    expect(resolveSplitAmountReais('225.00', 'half', 0)).toBe(112.5)
  })

  it('parses whole-number reais without decimal (legacy bug)', () => {
    expect(resolveSplitAmountReais('900', 'half', 0)).toBe(450)
  })
})

describe('buildSplitCreateBody', () => {
  it('creates split from API transaction amount strings', () => {
    const body = buildSplitCreateBody('900.00', {
      splitMode: 'half',
      splitPersonMode: 'member',
      splitUserId: 'user-1',
      splitContactName: '',
      splitContactPhone: '',
      splitAmountReais: 450,
      notifyEnabled: true,
    })

    expect(body?.amount).toBe('450.00')
  })

  it('divides custom split amount across installments', () => {
    const body = buildSplitCreateBody(
      '450.00',
      {
        splitMode: 'custom',
        splitPersonMode: 'member',
        splitUserId: 'user-1',
        splitContactName: '',
        splitContactPhone: '',
        splitAmountReais: 450,
        notifyEnabled: true,
      },
      { installmentsTotal: 2, installmentNumber: 1 }
    )

    expect(body?.amount).toBe('225.00')
  })

  it('buildSplitPayload passes installment context from parsed import item', () => {
    const payload = buildSplitPayload(
      {
        id: 'preview-0',
        index: 0,
        title: 'Compra - Parcela 1/2',
        amount: '450.00',
        date: '2026-07-06',
        type: 'expense',
        installmentNumber: 1,
        installmentsTotal: 2,
        categoryId: null,
      },
      {
        id: 'preview-0',
        categoryId: null,
        splitMode: 'custom',
        splitPersonMode: 'member',
        splitUserId: 'user-1',
        splitContactName: '',
        splitContactPhone: '',
        splitAmountReais: 450,
        validated: true,
      }
    )

    expect(payload?.amount).toBe('225.00')
  })
})

describe('buildPostImportUpdates', () => {
  it('skips duplicate items when aligning created transaction ids', () => {
    const updates = buildPostImportUpdates(
      [
        {
          id: 'dup',
          index: 0,
          title: 'Existing',
          amount: '100.00',
          date: '2026-05-01',
          type: 'expense',
          categoryId: 'cat-1',
          isDuplicate: true,
        },
        {
          id: 'new',
          index: 1,
          title: 'New purchase',
          amount: '200.00',
          date: '2026-05-02',
          type: 'expense',
          categoryId: 'cat-2',
        },
      ],
      {
        dup: {
          id: 'dup',
          categoryId: 'cat-1',
          splitMode: 'none',
          splitPersonMode: 'member',
          splitUserId: null,
          splitContactName: '',
          splitContactPhone: '',
          splitAmountReais: 0,
          validated: true,
        },
        new: {
          id: 'new',
          categoryId: 'cat-2',
          splitMode: 'none',
          splitPersonMode: 'member',
          splitUserId: null,
          splitContactName: '',
          splitContactPhone: '',
          splitAmountReais: 0,
          validated: true,
        },
      },
      ['tx-created-1']
    )

    expect(updates).toEqual([{ transactionId: 'tx-created-1', categoryIds: ['cat-2'] }])
  })
})
