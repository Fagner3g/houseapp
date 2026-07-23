import { afterEach, describe, expect, it, vi } from 'vitest'

import type { GetInstallmentSeries200InstallmentsItem } from '@/api/generated/model/getInstallmentSeries200InstallmentsItem'

import {
  listFutureUnpaidInstallments,
  listPriorOverdueUnpaidInstallments,
  listSettlementExtraInstallments,
} from './settlement-extra-installments'

const installments: GetInstallmentSeries200InstallmentsItem[] = [
  {
    id: 'tx-1',
    installmentNumber: 1,
    date: '2026-06-01T00:00:00.000Z',
    amount: '100.00',
    paidAmount: '0.00',
    remaining: '100.00',
    status: 'pending',
  },
  {
    id: 'tx-2',
    installmentNumber: 2,
    date: '2026-07-15T00:00:00.000Z',
    amount: '100.00',
    paidAmount: '0.00',
    remaining: '100.00',
    status: 'pending',
  },
  {
    id: 'tx-3',
    installmentNumber: 3,
    date: '2026-08-02T00:00:00.000Z',
    amount: '100.00',
    paidAmount: '0.00',
    remaining: '100.00',
    status: 'pending',
  },
  {
    id: 'tx-4',
    installmentNumber: 4,
    date: '2026-09-01T00:00:00.000Z',
    amount: '100.00',
    paidAmount: '0.00',
    remaining: '100.00',
    status: 'pending',
  },
]

describe('listSettlementExtraInstallments', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('includes prior overdue and future unpaid, excluding current', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'))

    expect(listFutureUnpaidInstallments(installments, 2).map(i => i.id)).toEqual([
      'tx-3',
      'tx-4',
    ])
    expect(listPriorOverdueUnpaidInstallments(installments, 2).map(i => i.id)).toEqual([
      'tx-1',
    ])
    expect(listSettlementExtraInstallments(installments, 2).map(i => i.id)).toEqual([
      'tx-1',
      'tx-3',
      'tx-4',
    ])
  })

  it('skips prior parcels that are not overdue yet', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-01T12:00:00.000Z'))

    expect(listPriorOverdueUnpaidInstallments(installments, 2)).toEqual([])
    expect(listSettlementExtraInstallments(installments, 2).map(i => i.id)).toEqual([
      'tx-3',
      'tx-4',
    ])
  })
})
