import { resolveBillingMonthKey, shiftBillingMonthByOffset } from '@/core/billing-cycle'

import { computeDaysUntilDue } from '../alert-utils'
import { resolveTransactionAlertDueDate } from '../resolve-transaction-alert-due-date'
import { isCreditCardResidual, isReminderWithoutValue, remainingCentavos } from './classify'
import type { InvoiceGroupSeed } from './invoice-remaining'
import type { OwnerTxAlert, ResidualTransaction } from './types'

export function resolveResidualInvoiceMonthKey(tx: ResidualTransaction): string | null {
  if (!tx.accountId || tx.closingDay == null || tx.dueDay == null) return null

  const purchaseDate = tx.competenceDate ?? tx.date
  const firstMonthKey = resolveBillingMonthKey(purchaseDate, tx.closingDay, tx.dueDay)
  const installmentIndex = (tx.installmentNumber ?? 1) - 1
  return shiftBillingMonthByOffset(firstMonthKey, installmentIndex)
}

export function collectInvoiceGroupSeeds(
  transactions: ResidualTransaction[]
): InvoiceGroupSeed[] {
  const groups = new Map<string, InvoiceGroupSeed>()

  for (const tx of transactions) {
    if (!isCreditCardResidual(tx) || !tx.accountId) continue
    if (isReminderWithoutValue(tx)) continue
    if (tx.closingDay == null || tx.dueDay == null) continue

    const monthKey = resolveResidualInvoiceMonthKey(tx)
    if (!monthKey) continue

    const key = `${tx.accountId}:${monthKey}`
    const existing = groups.get(key)
    if (existing) {
      existing.transactionIds.push(tx.id)
      continue
    }

    groups.set(key, {
      accountId: tx.accountId,
      accountName: tx.accountName?.trim() || 'Cartão',
      monthKey,
      closingDay: tx.closingDay,
      dueDay: tx.dueDay,
      transactionIds: [tx.id],
    })
  }

  return [...groups.values()]
}

export function listResidualNonCcAlerts(
  transactions: ResidualTransaction[],
  referenceDate = new Date()
): OwnerTxAlert[] {
  const alerts: OwnerTxAlert[] = []

  for (const tx of transactions) {
    if (isCreditCardResidual(tx)) continue

    const dueDate = resolveTransactionAlertDueDate({
      date: tx.date,
      competenceDate: tx.competenceDate,
      installmentNumber: tx.installmentNumber,
      type: tx.type,
      accountType: tx.accountType,
      closingDay: tx.closingDay,
      dueDay: tx.dueDay,
    })
    const rem = remainingCentavos(tx)
    if (rem <= 0n && !isReminderWithoutValue(tx)) continue

    alerts.push({
      transaction: tx,
      dueDate,
      daysUntilDue: computeDaysUntilDue(dueDate, referenceDate),
      remainingCentavos: rem,
    })
  }

  return alerts
}
