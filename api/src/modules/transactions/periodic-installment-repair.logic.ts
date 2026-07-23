import {
  computeTransactionStatus,
  resolveTransactionPaidAt,
} from '@/core/transaction-payment'
import type { TransactionStatus } from '@/db/schemas/transactions'

import type { InstallmentSeriesGroup } from './credit-card-installment-repair.logic'
import {
  resolveInstallmentSeriesPurchaseDate,
  resolveInstallmentSeriesTotalCentavos,
} from './credit-card-installment-repair.logic'
import { buildPeriodicInstallments } from './periodic-installments.logic'

export type InstallmentPaymentAllocation = {
  paidAmount: bigint | null
  status: TransactionStatus
  paidAt: Date | null
}

/** Spread accumulated paid amount across planned parcel amounts in order. */
export function allocateInstallmentSeriesPayments(
  amounts: bigint[],
  totalPaid: bigint,
  paidAt: Date | null
): InstallmentPaymentAllocation[] {
  let remainingPaid = totalPaid > 0n ? totalPaid : 0n

  return amounts.map(amount => {
    if (remainingPaid <= 0n || amount <= 0n) {
      return { paidAmount: null, status: 'pending' as const, paidAt: null }
    }

    const paidAmount = remainingPaid >= amount ? amount : remainingPaid
    remainingPaid -= paidAmount
    const status = computeTransactionStatus(amount, paidAmount, 'pending')
    return {
      paidAmount,
      status,
      paidAt: resolveTransactionPaidAt(status, paidAt ?? new Date(), paidAt),
    }
  })
}

export function buildPeriodicInstallmentSeriesRepairPlan(
  group: InstallmentSeriesGroup,
  periodicity?: string | null
) {
  const startDate = resolveInstallmentSeriesPurchaseDate(group)
  const totalCentavos = resolveInstallmentSeriesTotalCentavos(group)
  const planned = buildPeriodicInstallments({
    title: group.baseTitle,
    totalCentavos,
    startDate,
    installmentsTotal: group.installmentsTotal,
    periodicity,
  })

  const existingByNumber = new Map(
    group.rows.flatMap(row =>
      row.installmentNumber != null ? [[row.installmentNumber, row] as const] : []
    )
  )

  const updates: Array<{ id: string; row: (typeof planned)[number] }> = []
  const creates: Array<(typeof planned)[number]> = []

  for (const row of planned) {
    const existing = existingByNumber.get(row.installmentNumber)
    if (existing) {
      updates.push({ id: existing.id, row })
      continue
    }
    creates.push(row)
  }

  // Single seed row held the purchase total — redistribute its paid balance.
  const allocatedPayments =
    group.rows.length === 1
      ? allocateInstallmentSeriesPayments(
          planned.map(row => row.amount),
          group.rows[0]?.paidAmount ?? 0n,
          group.rows[0]?.paidAt ?? null
        )
      : null
  const paymentAllocations = allocatedPayments
    ? new Map(
        planned.flatMap((row, index) => {
          const allocation = allocatedPayments[index]
          return allocation ? [[row.installmentNumber, allocation] as const] : []
        })
      )
    : null

  return { updates, creates, startDate, totalCentavos, paymentAllocations }
}
