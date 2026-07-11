import { describe, expect, it } from 'vitest'

import { divideCentavos } from '@/core/money'
import { buildCreditCardInstallments } from '@/modules/transactions/credit-card-installments.logic'

import { buildSplitDebtSummary, resolvePersonShareInstallmentAmountCentavos } from './split-debt-summary.logic'
import type { SplitWithTransaction } from './split-debt-summary.logic'

/**
 * Simulates the create-transaction + applyDraftSplits flow for a 50/50 split
 * on a parceled credit-card purchase (R$ 900 in 2 installments).
 */
describe('split installment create flow', () => {
  it('50/50 split on 2× R$ 450 installments yields R$ 225 per split and R$ 450 total owed', () => {
    const installmentRows = buildCreditCardInstallments({
      title: 'Pia da cozinha',
      totalCentavos: 90000n,
      purchaseDate: new Date('2026-07-06T12:00:00.000Z'),
      closingDay: 1,
      dueDay: 18,
      installmentsTotal: 2,
    })

    expect(installmentRows).toHaveLength(2)
    expect(installmentRows.map(row => row.amount)).toEqual(divideCentavos(90000n, 2))

    const transactions = installmentRows.map((row, index) => ({
      id: `tx-${index + 1}`,
      organizationId: 'org-1',
      accountId: 'acc-1',
      cardId: 'card-1',
      title: row.title,
      amount: row.amount,
      installmentNumber: row.installmentNumber,
      installmentsTotal: row.installmentsTotal,
      status: 'pending' as const,
      type: 'expense' as const,
      date: row.date,
      source: 'manual' as const,
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
    }))

    const splits: SplitWithTransaction[] = transactions.map((transaction, index) => ({
      id: `split-${index + 1}`,
      transactionId: transaction.id,
      userId: 'user-karoline',
      contactName: null,
      contactPhone: null,
      contactEmail: null,
      amount: (transaction.amount as bigint) / 2n,
      paidAmount: 0n,
      status: 'pending',
      description: null,
      paidAt: null,
      isNotified: false,
      lastNotifiedAt: null,
      notifyEnabled: true,
      collectLumpSum: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      installmentNumber: transaction.installmentNumber,
      transactionAmount: transaction.amount,
      userName: 'Karoline',
    }))

    const summary = buildSplitDebtSummary({
      anchorTransaction: transactions[0] as SplitWithTransaction,
      siblingTransactions: transactions,
      splits,
      resolvePersonName: item => item.userName ?? 'Membro',
    })

    expect(summary.purchaseTotal).toBe('900.00')
    expect(summary.myShareTotal).toBe('450.00')
    expect(summary.installmentsTotal).toBe(2)
    expect(summary.persons).toHaveLength(1)
    expect(summary.persons[0]).toMatchObject({
      name: 'Karoline',
      totalOwed: '450.00',
      totalRemaining: '450.00',
    })
    expect(summary.persons[0]?.installments.map(row => row.amount)).toEqual(['225.00', '225.00'])
  })

  it('lump-sum 50% share on parcel 1 keeps full R$ 450 owed on one split', () => {
    const installmentRows = buildCreditCardInstallments({
      title: 'Pia da cozinha',
      totalCentavos: 90000n,
      purchaseDate: new Date('2026-07-06T12:00:00.000Z'),
      closingDay: 1,
      dueDay: 18,
      installmentsTotal: 2,
    })

    const transactions = installmentRows.map((row, index) => ({
      id: `tx-${index + 1}`,
      organizationId: 'org-1',
      accountId: 'acc-1',
      cardId: 'card-1',
      title: row.title,
      amount: row.amount,
      installmentNumber: row.installmentNumber,
      installmentsTotal: row.installmentsTotal,
      status: 'pending' as const,
      type: 'expense' as const,
      date: row.date,
      source: 'manual' as const,
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
    }))

    const splits: SplitWithTransaction[] = [
      {
        id: 'split-1',
        transactionId: transactions[0]?.id as string,
        userId: 'user-karoline',
        contactName: null,
        contactPhone: null,
        contactEmail: null,
        amount: 45000n,
        paidAmount: 0n,
        status: 'pending',
        description: null,
        paidAt: null,
        isNotified: false,
        lastNotifiedAt: null,
        notifyEnabled: true,
        collectLumpSum: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        installmentNumber: 1,
        transactionAmount: transactions[0]?.amount as bigint,
        userName: 'Karoline',
      },
    ]

    const summary = buildSplitDebtSummary({
      anchorTransaction: transactions[0] as SplitWithTransaction,
      siblingTransactions: transactions,
      splits,
      resolvePersonName: item => item.userName ?? 'Membro',
    })

    expect(summary.persons[0]).toMatchObject({
      totalOwed: '450.00',
      totalRemaining: '450.00',
    })
    expect(summary.persons[0]?.installments).toHaveLength(1)
    expect(summary.persons[0]?.installments[0]?.amount).toBe('450.00')

    expect(
      resolvePersonShareInstallmentAmountCentavos({
        totalOwedCentavos: 45000n,
        installmentsTotal: 2,
        installmentNumber: 1,
        currentSplitAmountCentavos: 45000n,
        materializedInstallmentSplits: 1,
        collectLumpSum: true,
      })
    ).toBe(45000n)
  })
})
