import { computeDaysUntilDue } from '../alert-utils'
import {
  resolveSplitAlertDueDate,
  resolveTransactionAlertDueDate,
} from '../resolve-transaction-alert-due-date'
import type { PendingSplitNotifyRow } from '@/modules/splits/split.repository'

import type { PendingTransactionRow } from './types'

export function resolveDueDateForTransaction(transaction: PendingTransactionRow): Date {
  return resolveTransactionAlertDueDate({
    date: transaction.date,
    competenceDate: transaction.competenceDate,
    installmentNumber: transaction.installmentNumber,
    type: transaction.type,
    accountType: transaction.accountType,
    closingDay: transaction.closingDay,
    dueDay: transaction.dueDay,
  })
}

export function resolveDaysUntilDueForTransaction(transaction: PendingTransactionRow): number {
  return computeDaysUntilDue(resolveDueDateForTransaction(transaction))
}

export function resolveDueDateForSplit(split: PendingSplitNotifyRow): Date {
  return resolveSplitAlertDueDate({
    transactionDate: split.transactionDate,
    competenceDate: split.competenceDate,
    installmentNumber: split.installmentNumber,
    type: split.transactionType,
    accountType: split.accountType,
    closingDay: split.closingDay,
    dueDay: split.dueDay,
  })
}

export function resolveDaysUntilDueForSplit(split: PendingSplitNotifyRow): number {
  return computeDaysUntilDue(resolveDueDateForSplit(split))
}
