import type { TransactionStatus } from '@/db/schemas/transactions'

export const UNPAID_TRANSACTION_STATUSES = ['pending', 'partial'] as const satisfies TransactionStatus[]

export function isUnpaidTransactionStatus(status: TransactionStatus): boolean {
  return status === 'pending' || status === 'partial'
}

/** Amount null/0 means value will be filled in later (e.g. recurring bill). */
export function isReminderWithoutValue(amount: bigint | null | undefined): boolean {
  return amount == null || amount <= 0n
}

export function computeTransactionStatus(
  amount: bigint | null | undefined,
  paidAmount: bigint,
  currentStatus: TransactionStatus
): TransactionStatus {
  if (currentStatus === 'canceled') return 'canceled'
  if (paidAmount <= 0n) return 'pending'
  if (isReminderWithoutValue(amount)) return 'paid'
  if (amount != null && paidAmount >= amount) return 'paid'
  return 'partial'
}

export function transactionRemainingAmount(
  amount: bigint | null | undefined,
  paidAmount: bigint | null | undefined
): bigint {
  const total = amount ?? 0n
  const paid = paidAmount ?? 0n
  const remaining = total - paid
  return remaining > 0n ? remaining : 0n
}

export function resolveTransactionPaidAt(
  status: TransactionStatus,
  paymentDate: Date,
  existingPaidAt?: Date | null
): Date | null {
  if (status === 'pending') return null
  if (status === 'paid') return paymentDate
  return existingPaidAt ?? paymentDate
}
