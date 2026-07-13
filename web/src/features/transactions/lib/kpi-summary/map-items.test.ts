import { describe, expect, it, vi } from 'vitest'

import type { ListPendingSplits200SplitsItem, ListTransactions200TransactionsItem } from '@/api/generated/model'
import { mapOverdueKpiItems } from './map-items'
import { mapPendingSplitKpiItems } from './map-pending-splits'

function split(
  overrides: Partial<ListPendingSplits200SplitsItem> &
    Pick<
      ListPendingSplits200SplitsItem,
      'id' | 'transactionId' | 'transactionTitle' | 'transactionDate'
    >
): ListPendingSplits200SplitsItem {
  return {
    userId: null,
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    amount: '100.00',
    description: null,
    status: 'pending',
    paidAmount: '0.00',
    paidAt: null,
    isNotified: false,
    lastNotifiedAt: null,
    notifyEnabled: false,
    collectLumpSum: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    transactionAmount: null,
    personName: null,
    ...overrides,
  }
}

function transaction(
  overrides: Partial<ListTransactions200TransactionsItem> &
    Pick<ListTransactions200TransactionsItem, 'id' | 'title' | 'date' | 'amount'>
): ListTransactions200TransactionsItem {
  return {
    organizationId: 'org-1',
    accountId: null,
    cardId: null,
    recurringTransactionId: null,
    statementId: null,
    description: null,
    type: 'expense',
    competenceDate: null,
    status: 'partial',
    paidAt: null,
    paidAmount: '0.00',
    paymentScheduledAt: null,
    counterparty: null,
    installmentNumber: null,
    installmentsTotal: null,
    source: 'manual',
    categoryIds: [],
    transferPairId: null,
    notifyEnabled: false,
    notifyTargetType: 'none',
    notifyUserId: null,
    notifyContactName: null,
    notifyContactPhone: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('mapOverdueKpiItems', () => {
  it('shows remaining balance after partial payment', () => {
    const onOpen = vi.fn()
    const items = mapOverdueKpiItems({
      transactions: [
        transaction({
          id: 'tx-1',
          title: 'Empréstimo 4K',
          date: '2026-06-17',
          amount: '4000.00',
          paidAmount: '1500.00',
        }),
      ],
      onOpenTransaction: onOpen,
    })

    expect(items).toHaveLength(1)
    expect(items[0]?.amountLabel).toContain('2.500,00')
  })

  it('shows remaining balance after split payments', () => {
    const onOpen = vi.fn()
    const splitPaidById = new Map([['tx-1', 3000]])
    const items = mapOverdueKpiItems({
      transactions: [
        transaction({
          id: 'tx-1',
          title: 'Empréstimo 4K',
          date: '2026-06-17',
          amount: '4000.00',
          paidAmount: '0.00',
        }),
      ],
      splitPaidById,
      onOpenTransaction: onOpen,
    })

    expect(items).toHaveLength(1)
    expect(items[0]?.amountLabel).toContain('1.000,00')
  })
})

describe('mapPendingSplitKpiItems', () => {
  const dateTo = '2026-06-30'

  it('groups by person with date-sorted children and summed amounts due through period', () => {
    const onOpen = vi.fn()
    const { items, secondaryItems } = mapPendingSplitKpiItems({
      splits: [
        split({
          id: '1',
          transactionId: 't1',
          personName: 'Karoline',
          transactionTitle: 'Late',
          transactionDate: '2026-06-27',
          amount: '34.20',
        }),
        split({
          id: '2',
          transactionId: 't2',
          personName: 'Karoline',
          transactionTitle: 'Early',
          transactionDate: '2026-06-15',
          amount: '83.75',
        }),
        split({
          id: '3',
          transactionId: 't3',
          personName: 'Aline Stefane',
          transactionTitle: 'Only',
          transactionDate: '2026-06-18',
          amount: '4000.00',
        }),
      ],
      dateTo,
      onOpenTransaction: onOpen,
    })

    expect(items).toHaveLength(2)
    expect(secondaryItems).toHaveLength(0)
    expect(items[0]?.title).toBe('Aline Stefane')
    expect(items[0]?.amountLabel).toContain('4.000,00')
    expect(items[0]?.children).toHaveLength(1)
    expect(items[0]?.subtitle).toBeUndefined()

    expect(items[1]?.title).toBe('Karoline')
    expect(items[1]?.amountLabel).toContain('117,95')
    expect(items[1]?.meta).toBe('2 lançamentos')
    expect(items[1]?.children?.map(c => c.title)).toEqual(['Early', 'Late'])
    expect(items[1]?.children?.[0]?.onClick).toBeTypeOf('function')
    expect(items[1]?.onClick).toBeUndefined()
  })

  it('includes past/overdue before period start in the primary amount', () => {
    const onOpen = vi.fn()
    const { items, secondaryItems } = mapPendingSplitKpiItems({
      splits: [
        split({
          id: '1',
          transactionId: 't1',
          personName: 'Karoline',
          transactionTitle: 'Past May',
          transactionDate: '2026-05-10',
          amount: '50.00',
        }),
        split({
          id: '2',
          transactionId: 't2',
          personName: 'Karoline',
          transactionTitle: 'In June',
          transactionDate: '2026-06-15',
          amount: '100.00',
        }),
        split({
          id: '3',
          transactionId: 't3',
          personName: 'Karoline',
          transactionTitle: 'Future July',
          transactionDate: '2026-07-15',
          amount: '200.00',
        }),
      ],
      dateTo,
      onOpenTransaction: onOpen,
    })

    expect(items).toHaveLength(1)
    expect(secondaryItems).toHaveLength(0)
    expect(items[0]?.amountLabel).toContain('150,00')
    expect(items[0]?.subtitle).toContain('350,00')
    expect(items[0]?.meta).toBe('2 lançamentos')
    expect(items[0]?.children?.map(c => c.title)).toEqual(['Past May', 'In June'])
  })

  it('uses due-through-period amount as primary and full outstanding as subtitle', () => {
    const onOpen = vi.fn()
    const { items, secondaryItems } = mapPendingSplitKpiItems({
      splits: [
        split({
          id: '1',
          transactionId: 't1',
          personName: 'Karoline',
          transactionTitle: 'In period',
          transactionDate: '2026-06-15',
          amount: '100.00',
        }),
        split({
          id: '2',
          transactionId: 't2',
          personName: 'Karoline',
          transactionTitle: 'Future',
          transactionDate: '2026-07-15',
          amount: '200.00',
        }),
      ],
      dateTo,
      onOpenTransaction: onOpen,
    })

    expect(items).toHaveLength(1)
    expect(secondaryItems).toHaveLength(0)
    expect(items[0]?.amountLabel).toContain('100,00')
    expect(items[0]?.subtitle).toContain('300,00')
    expect(items[0]?.meta).toBe('1 lançamento')
    expect(items[0]?.children?.map(c => c.title)).toEqual(['In period'])
  })

  it('strips Parcela N/M from lump-sum split titles and marks à vista in meta', () => {
    const onOpen = vi.fn()
    const { items } = mapPendingSplitKpiItems({
      splits: [
        split({
          id: '1',
          transactionId: 't1',
          personName: 'Karoline',
          transactionTitle: 'Supermercados Bh - Parcela 1/3',
          transactionDate: '2026-06-10',
          amount: '412.19',
          collectLumpSum: true,
        }),
      ],
      dateTo,
      onOpenTransaction: onOpen,
    })

    expect(items[0]?.children?.[0]?.title).toBe('Supermercados Bh')
    expect(items[0]?.children?.[0]?.meta).toBe('10/06/2026 · à vista')
  })

  it('keeps Parcela N/M when the person share is also installmentized', () => {
    const onOpen = vi.fn()
    const { items } = mapPendingSplitKpiItems({
      splits: [
        split({
          id: '1',
          transactionId: 't1',
          personName: 'Karoline',
          transactionTitle: 'Celular - Parcela 6/10',
          transactionDate: '2026-06-17',
          amount: '556.09',
          collectLumpSum: false,
        }),
      ],
      dateTo,
      onOpenTransaction: onOpen,
    })

    expect(items[0]?.children?.[0]?.title).toBe('Celular - Parcela 6/10')
    expect(items[0]?.children?.[0]?.meta).toBe('17/06/2026')
  })

  it('puts people with only future splits in secondaryItems', () => {
    const onOpen = vi.fn()
    const { items, secondaryItems } = mapPendingSplitKpiItems({
      splits: [
        split({
          id: '1',
          transactionId: 't1',
          personName: 'Karoline',
          transactionTitle: 'Future only',
          transactionDate: '2026-07-15',
          amount: '500.00',
        }),
      ],
      dateTo,
      onOpenTransaction: onOpen,
    })

    expect(items).toHaveLength(0)
    expect(secondaryItems).toHaveLength(1)
    expect(secondaryItems[0]?.title).toBe('Karoline')
    expect(secondaryItems[0]?.amountLabel).toContain('500,00')
    expect(secondaryItems[0]?.children?.map(c => c.title)).toEqual(['Future only'])
  })
})
