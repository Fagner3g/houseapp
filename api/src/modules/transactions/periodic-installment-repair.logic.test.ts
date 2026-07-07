import { describe, expect, it } from 'vitest'

import type { TransactionRecord } from './transaction.repository'
import { buildPeriodicInstallmentSeriesRepairPlan } from './periodic-installment-repair.logic'

function tx(
  overrides: Partial<TransactionRecord> & Pick<TransactionRecord, 'id'>
): TransactionRecord {
  return {
    organizationId: 'org-1',
    accountId: 'acc-1',
    cardId: null,
    recurringTransactionId: null,
    statementId: null,
    title: 'Pia da cozinha',
    description: null,
    amount: 90000n,
    type: 'expense',
    date: new Date('2026-07-15T12:00:00.000Z'),
    competenceDate: new Date('2026-07-15T12:00:00.000Z'),
    status: 'pending',
    paidAt: null,
    paidAmount: null,
    counterparty: null,
    installmentNumber: 1,
    installmentsTotal: 3,
    source: 'manual',
    externalId: null,
    transferPairId: null,
    notifyEnabled: false,
    notifyTargetType: null,
    notifyUserId: null,
    notifyContactName: null,
    notifyContactPhone: null,
    notifyDaysBefore: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('buildPeriodicInstallmentSeriesRepairPlan', () => {
  it('updates first row amount and creates missing installments', () => {
    const seed = tx({ id: 'tx-1' })
    const plan = buildPeriodicInstallmentSeriesRepairPlan(
      {
        baseTitle: 'Pia da cozinha',
        installmentsTotal: 3,
        rows: [seed],
      },
      'monthly-1'
    )

    expect(plan.updates).toHaveLength(1)
    expect(plan.updates[0]?.row.amount).toBe(30000n)
    expect(plan.creates).toHaveLength(2)
    expect(plan.creates.map(row => row.installmentNumber)).toEqual([2, 3])
    expect(plan.creates.every(row => row.amount === 30000n)).toBe(true)
  })
})
