import { describe, expect, it } from 'vitest'

import type { TransactionRecord } from '@/modules/transactions/transaction.repository'

import {
  buildSplitDebtSummary,
  matchesInstallmentSeries,
  personKey,
  resolvePersonShareInstallmentAmountCentavos,
} from './split-debt-summary.logic'
import type { SplitWithTransaction } from './split-debt-summary.logic'

function tx(
  partial: Partial<TransactionRecord> & Pick<TransactionRecord, 'id' | 'title' | 'amount'>
): TransactionRecord {
  return {
    organizationId: 'org-1',
    accountId: 'acc-1',
    cardId: 'card-1',
    installmentNumber: 1,
    installmentsTotal: 2,
    status: 'pending',
    type: 'expense',
    date: new Date('2026-07-06'),
    source: 'manual',
    notifyEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    description: null,
    competenceDate: null,
    paidAt: null,
    paidAmount: null,
    counterparty: null,
    recurringTransactionId: null,
    statementId: null,
    externalId: null,
    transferPairId: null,
    notifyTargetType: null,
    notifyUserId: null,
    notifyContactName: null,
    notifyContactPhone: null,
    notifyDaysBefore: null,
    notifyLastNotifiedAt: null,
    ...partial,
  }
}

function split(
  partial: Partial<SplitWithTransaction> & Pick<SplitWithTransaction, 'id' | 'transactionId'>
): SplitWithTransaction {
  return {
    userId: 'user-karoline',
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    amount: 22500n,
    paidAmount: 0n,
    status: 'pending',
    description: null,
    paidAt: null,
    isNotified: false,
    lastNotifiedAt: null,
    notifyEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    installmentNumber: 1,
    transactionAmount: 45000n,
    userName: 'Karoline',
    ...partial,
  }
}

describe('matchesInstallmentSeries', () => {
  const anchor = tx({
    id: 'tx-1',
    title: 'Pia da cozinha - Parcela 1/2',
    amount: 45000n,
    installmentNumber: 1,
    installmentsTotal: 2,
  })

  it('matches sibling installment with same base title', () => {
    const sibling = tx({
      id: 'tx-2',
      title: 'Pia da cozinha - Parcela 2/2',
      amount: 45000n,
      installmentNumber: 2,
      installmentsTotal: 2,
    })

    expect(matchesInstallmentSeries(sibling, anchor)).toBe(true)
  })

  it('rejects different purchase titles', () => {
    const other = tx({
      id: 'tx-3',
      title: 'Outra compra - Parcela 2/2',
      amount: 45000n,
      installmentNumber: 2,
      installmentsTotal: 2,
    })

    expect(matchesInstallmentSeries(other, anchor)).toBe(false)
  })
})

describe('buildSplitDebtSummary', () => {
  it('aggregates 50/50 split across two installments', () => {
    const anchor = tx({
      id: 'tx-1',
      title: 'Pia da cozinha - Parcela 1/2',
      amount: 45000n,
      installmentNumber: 1,
      installmentsTotal: 2,
    })

    const siblings = [
      anchor,
      tx({
        id: 'tx-2',
        title: 'Pia da cozinha - Parcela 2/2',
        amount: 45000n,
        installmentNumber: 2,
        installmentsTotal: 2,
      }),
    ]

    const splits: SplitWithTransaction[] = [
      split({ id: 'split-1', transactionId: 'tx-1', installmentNumber: 1 }),
      split({ id: 'split-2', transactionId: 'tx-2', installmentNumber: 2 }),
    ]

    const summary = buildSplitDebtSummary({
      anchorTransaction: anchor,
      siblingTransactions: siblings,
      splits,
      resolvePersonName: item => item.userName ?? 'Membro',
    })

    expect(summary.purchaseTotal).toBe('900.00')
    expect(summary.myShareTotal).toBe('450.00')
    expect(summary.installmentsTotal).toBe(2)
    expect(summary.currentInstallmentNumber).toBe(1)
    expect(summary.persons).toHaveLength(1)
    expect(summary.persons[0]).toMatchObject({
      key: personKey({ userId: 'user-karoline', contactName: null, contactPhone: null }),
      name: 'Karoline',
      totalOwed: '450.00',
      totalPaid: '0.00',
      totalRemaining: '450.00',
      status: 'pending',
    })
    expect(summary.persons[0]?.installments).toEqual([
      expect.objectContaining({ installmentNumber: 1, amount: '225.00' }),
      expect.objectContaining({ installmentNumber: 2, amount: '225.00' }),
    ])
    expect(summary.currentTransactionAmount).toBe('450.00')
  })

  it('shows divided installment amount when only the first parcel exists', () => {
    const anchor = tx({
      id: 'tx-1',
      title: 'Compra - Parcela 1/3',
      amount: 90000n,
      installmentNumber: 1,
      installmentsTotal: 3,
    })

    const splits: SplitWithTransaction[] = [
      split({
        id: 'split-1',
        transactionId: 'tx-1',
        amount: 45000n,
        installmentNumber: 1,
        transactionAmount: 90000n,
      }),
    ]

    const summary = buildSplitDebtSummary({
      anchorTransaction: anchor,
      siblingTransactions: [anchor],
      splits,
      resolvePersonName: item => item.userName ?? 'Membro',
    })

    expect(summary.purchaseTotal).toBe('900.00')
    expect(summary.currentTransactionAmount).toBe('300.00')
    expect(summary.myShareTotal).toBe('450.00')
  })
})

describe('resolvePersonShareInstallmentAmountCentavos', () => {
  it('divides total share when stored on a single split', () => {
    expect(
      resolvePersonShareInstallmentAmountCentavos({
        totalOwedCentavos: 45000n,
        installmentsTotal: 3,
        installmentNumber: 1,
        currentSplitAmountCentavos: 45000n,
        materializedInstallmentSplits: 1,
      })
    ).toBe(15000n)
  })

  it('keeps per-installment split amount when already divided', () => {
    expect(
      resolvePersonShareInstallmentAmountCentavos({
        totalOwedCentavos: 45000n,
        installmentsTotal: 3,
        installmentNumber: 1,
        currentSplitAmountCentavos: 15000n,
        materializedInstallmentSplits: 1,
      })
    ).toBe(15000n)
  })
})
