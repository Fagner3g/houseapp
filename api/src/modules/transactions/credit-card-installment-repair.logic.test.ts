import { describe, expect, it } from 'vitest'

import {
  buildInstallmentSeriesRepairPlan,
  groupManualInstallmentSeries,
  isIncompleteInstallmentSeries,
} from '@/modules/transactions/credit-card-installment-repair.logic'
import type { TransactionRecord } from '@/modules/transactions/transaction.repository'

function manualInstallmentRow(
  overrides: Partial<TransactionRecord> & Pick<TransactionRecord, 'id'>
): TransactionRecord {
  return {
    organizationId: 'org-1',
    accountId: 'acc-1',
    cardId: 'card-1',
    recurringTransactionId: null,
    statementId: null,
    title: 'Celular',
    description: null,
    amount: 50000n,
    type: 'expense',
    date: new Date('2026-07-02T12:00:00.000Z'),
    competenceDate: new Date('2026-07-02T12:00:00.000Z'),
    status: 'pending',
    paidAt: null,
    paidAmount: null,
    counterparty: null,
    installmentNumber: 1,
    installmentsTotal: 10,
    source: 'manual',
    externalId: null,
    transferPairId: null,
    notifyEnabled: false,
    notifyTargetType: null,
    notifyUserId: null,
    notifyContactName: null,
    notifyContactPhone: null,
    notifyDaysBefore: null,
    notifyLastNotifiedAt: null,
    createdAt: new Date('2026-07-02T12:00:00.000Z'),
    updatedAt: new Date('2026-07-02T12:00:00.000Z'),
    ...overrides,
  }
}

describe('credit-card-installment-repair', () => {
  it('detects a single manual row as incomplete installment series', () => {
    const groups = groupManualInstallmentSeries([manualInstallmentRow({ id: 'tx-1' })])
    expect(groups).toHaveLength(1)
    expect(isIncompleteInstallmentSeries(groups[0]!)).toBe(true)
  })

  it('builds nine missing installments and updates the first amount', () => {
    const groups = groupManualInstallmentSeries([manualInstallmentRow({ id: 'tx-1' })])
    const plan = buildInstallmentSeriesRepairPlan(groups[0]!, 1, 18)

    expect(plan.updates).toHaveLength(1)
    expect(plan.updates[0]?.row.amount).toBe(5000n)
    expect(plan.creates).toHaveLength(9)
    expect(plan.creates[0]?.installmentNumber).toBe(2)
    expect(plan.creates[8]?.installmentNumber).toBe(10)
  })
})
