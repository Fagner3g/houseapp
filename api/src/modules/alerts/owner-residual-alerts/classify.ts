import { isReminderWithoutValue as isReminderWithoutValueAmount } from '@/core/transaction-payment'

import { isCreditCardInvoiceAlert } from '../resolve-transaction-alert-due-date'

import type { ResidualTransaction } from './types'

/** Recurring reminder with value to fill in later (amount null or 0). */
export function isReminderWithoutValue(tx: Pick<ResidualTransaction, 'amount'>): boolean {
  return isReminderWithoutValueAmount(tx.amount)
}

export function remainingCentavos(tx: ResidualTransaction): bigint {
  if (isReminderWithoutValue(tx)) return 0n
  const amount = tx.amount ?? 0n
  const paid = tx.paidAmount ?? 0n
  const remaining = amount - paid
  return remaining > 0n ? remaining : 0n
}

export function isResidualCandidate(
  tx: ResidualTransaction,
  delegatedTransactionIds: Set<string>
): boolean {
  if (tx.type !== 'expense') return false
  if (tx.notifyEnabled) return false
  if (delegatedTransactionIds.has(tx.id)) return false
  if (isReminderWithoutValue(tx)) return true
  return remainingCentavos(tx) > 0n
}

export function isCreditCardResidual(tx: ResidualTransaction): boolean {
  return (
    Boolean(tx.accountId) &&
    isCreditCardInvoiceAlert({
      date: tx.date,
      competenceDate: tx.competenceDate,
      installmentNumber: tx.installmentNumber,
      type: tx.type,
      accountType: tx.accountType,
      closingDay: tx.closingDay,
      dueDay: tx.dueDay,
    })
  )
}
