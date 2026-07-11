import { describe, expect, it } from 'vitest'

import type { PendingSplitNotifyRow } from '@/modules/splits/split.repository'

import { keepSoonestUpcomingInstallmentSplits } from './keep-soonest-installment-splits'

function split(overrides: Partial<PendingSplitNotifyRow> & { id: string }): PendingSplitNotifyRow {
  return {
    transactionId: overrides.transactionId ?? overrides.id,
    userId: 'user-1',
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    amount: 14167n,
    description: null,
    status: 'pending',
    paidAmount: 0n,
    paidAt: null,
    notifyEnabled: true,
    collectLumpSum: false,
    isNotified: false,
    lastNotifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    transactionTitle: 'Marmori cozinha',
    transactionDate: new Date('2026-07-17'),
    transactionAmount: 85000n,
    personName: null,
    transactionStatus: 'pending',
    organizationId: 'org-1',
    competenceDate: null,
    transactionType: 'expense',
    installmentNumber: 1,
    installmentsTotal: 3,
    accountId: 'acc-1',
    cardId: null,
    accountType: 'checking',
    closingDay: null,
    dueDay: null,
    ...overrides,
  }
}

describe('keepSoonestUpcomingInstallmentSplits', () => {
  it('keeps only the soonest installment per series', () => {
    const splits = [
      split({ id: 's1', installmentNumber: 1, transactionId: 't1' }),
      split({ id: 's2', installmentNumber: 2, transactionId: 't2' }),
      split({ id: 's3', installmentNumber: 3, transactionId: 't3' }),
      split({
        id: 's4',
        transactionTitle: 'Piso cozinha',
        installmentNumber: null,
        installmentsTotal: null,
        transactionId: 't4',
        amount: 14990n,
        transactionAmount: 29980n,
      }),
    ]

    const daysUntilDue = (row: PendingSplitNotifyRow) => {
      if (row.id === 's1') return 6
      if (row.id === 's2') return 37
      if (row.id === 's3') return 68
      return 6
    }

    const kept = keepSoonestUpcomingInstallmentSplits(splits, daysUntilDue)
    expect(kept.map(row => row.id)).toEqual(['s1', 's4'])
  })
})
