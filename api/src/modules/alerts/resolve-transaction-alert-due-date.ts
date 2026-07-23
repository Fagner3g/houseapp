import dayjs from 'dayjs'

import {
  getBillingCycle,
  resolveBillingMonthKey,
  shiftBillingMonthByOffset,
} from '@/core/billing-cycle'

export type TransactionAlertDueDateInput = {
  date: Date
  competenceDate?: Date | null
  installmentNumber?: number | null
  type: 'income' | 'expense' | 'transfer'
  accountType?: string | null
  closingDay?: number | null
  dueDay?: number | null
}

export type SplitAlertDueDateInput = {
  transactionDate: Date
  competenceDate?: Date | null
  installmentNumber?: number | null
  type: 'income' | 'expense' | 'transfer'
  accountType?: string | null
  closingDay?: number | null
  dueDay?: number | null
  /** Partner collect-plan due date overrides purchase/card due logic. */
  splitDueAt?: Date | null
}

export function resolveSplitAlertDueDate(input: SplitAlertDueDateInput): Date {
  if (input.splitDueAt) return input.splitDueAt

  return resolveTransactionAlertDueDate({
    date: input.transactionDate,
    competenceDate: input.competenceDate,
    installmentNumber: input.installmentNumber,
    type: input.type,
    accountType: input.accountType,
    closingDay: input.closingDay,
    dueDay: input.dueDay,
  })
}

export function isCreditCardInvoiceAlert(input: TransactionAlertDueDateInput): boolean {
  return input.accountType === 'credit_card' && input.type === 'expense'
}

export function resolveTransactionAlertDueDate(input: TransactionAlertDueDateInput): Date {
  if (!isCreditCardInvoiceAlert(input)) {
    return input.date
  }

  if (input.closingDay == null || input.dueDay == null) {
    return input.competenceDate ?? input.date
  }

  const purchaseDate = input.competenceDate ?? input.date
  const firstMonthKey = resolveBillingMonthKey(purchaseDate, input.closingDay, input.dueDay)
  const installmentIndex = (input.installmentNumber ?? 1) - 1
  const monthKey = shiftBillingMonthByOffset(firstMonthKey, installmentIndex)
  const cycle = getBillingCycle(input.closingDay, input.dueDay, monthKey)

  return dayjs(cycle.dueDate).hour(12).minute(0).second(0).millisecond(0).toDate()
}
