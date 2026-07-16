import { describe, expect, it } from 'vitest'

import type { TransactionRecord } from './transaction.repository'
import {
  allocateInstallmentSeriesPayments,
  buildPeriodicInstallmentSeriesRepairPlan,
} from './periodic-installment-repair.logic'

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

describe('allocateInstallmentSeriesPayments', () => {
  it('marks early parcels paid and leaves the rest pending', () => {
    const paidAt = new Date('2026-07-15T12:00:00.000Z')
    const allocations = allocateInstallmentSeriesPayments([20000n, 20000n], 20000n, paidAt)

    expect(allocations[0]).toMatchObject({
      paidAmount: 20000n,
      status: 'paid',
      paidAt,
    })
    expect(allocations[1]).toMatchObject({
      paidAmount: null,
      status: 'pending',
      paidAt: null,
    })
  })

  it('keeps a leftover paid amount as partial on the next parcel', () => {
    const allocations = allocateInstallmentSeriesPayments([20000n, 20000n], 30000n, null)

    expect(allocations[0]?.status).toBe('paid')
    expect(allocations[1]).toMatchObject({
      paidAmount: 10000n,
      status: 'partial',
    })
  })
})

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

  it('redistributes paid balance when a single income row held the purchase total', () => {
    const paidAt = new Date('2026-07-15T12:00:00.000Z')
    const seed = tx({
      id: 'tx-income',
      title: 'Teste',
      type: 'income',
      amount: 40000n,
      paidAmount: 20000n,
      paidAt,
      status: 'partial',
      installmentsTotal: 2,
    })

    const plan = buildPeriodicInstallmentSeriesRepairPlan(
      {
        baseTitle: 'Teste',
        installmentsTotal: 2,
        rows: [seed],
      },
      'monthly-1'
    )

    expect(plan.paymentAllocations?.get(1)).toMatchObject({
      paidAmount: 20000n,
      status: 'paid',
      paidAt,
    })
    expect(plan.paymentAllocations?.get(2)).toMatchObject({
      paidAmount: null,
      status: 'pending',
      paidAt: null,
    })
    expect(plan.creates).toHaveLength(1)
    expect(plan.creates[0]?.installmentNumber).toBe(2)
  })
})
