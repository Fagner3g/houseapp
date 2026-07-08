import { describe, expect, it, vi } from 'vitest'

import type { ListPendingSplits200SplitsItem } from '@/api/generated/model'
import { mapPendingSplitKpiItems } from './map-items'

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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    transactionAmount: null,
    personName: null,
    ...overrides,
  }
}

describe('mapPendingSplitKpiItems', () => {
  it('groups by person with date-sorted children and summed amounts', () => {
    const onOpen = vi.fn()
    const items = mapPendingSplitKpiItems({
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
      onOpenTransaction: onOpen,
    })

    expect(items).toHaveLength(2)
    expect(items[0]?.title).toBe('Aline Stefane')
    expect(items[0]?.amountLabel).toContain('4.000,00')
    expect(items[0]?.children).toHaveLength(1)

    expect(items[1]?.title).toBe('Karoline')
    expect(items[1]?.amountLabel).toContain('117,95')
    expect(items[1]?.meta).toBe('2 lançamentos')
    expect(items[1]?.children?.map(c => c.title)).toEqual(['Early', 'Late'])
    expect(items[1]?.children?.[0]?.onClick).toBeTypeOf('function')
    expect(items[1]?.onClick).toBeUndefined()
  })
})
