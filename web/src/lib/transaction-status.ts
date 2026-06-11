import dayjs from 'dayjs'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import type { AlertStatusBadgeVariant } from '@/lib/alert-status-colors'
import { computeDaysUntilDue } from '@/lib/date'

export function getTransactionDisplayStatus(
  transaction: Pick<ListTransactions200TransactionsItem, 'status' | 'dueDate' | 'overdueDays'>
): 'paid' | 'partial' | 'pending' | 'overdue' | 'canceled' {
  if (
    transaction.status === 'paid' ||
    transaction.status === 'partial' ||
    transaction.status === 'canceled'
  ) {
    return transaction.status
  }

  if (transaction.overdueDays > 0) {
    return 'overdue'
  }

  const daysUntilDue = computeDaysUntilDue(new Date(transaction.dueDate))
  if (daysUntilDue < 0) {
    return 'overdue'
  }

  return 'pending'
}

export function getTransactionStatusLabel(
  transaction: Pick<ListTransactions200TransactionsItem, 'status' | 'dueDate' | 'overdueDays'>
): string {
  switch (getTransactionDisplayStatus(transaction)) {
    case 'paid':
      return 'Pago'
    case 'partial':
      return 'Parcial'
    case 'overdue':
      return 'Vencido'
    case 'canceled':
      return 'Cancelado'
    default:
      return 'Pendente'
  }
}

export function getTransactionStatusBadgeVariant(
  transaction: Pick<ListTransactions200TransactionsItem, 'status' | 'dueDate' | 'overdueDays'>
): AlertStatusBadgeVariant {
  switch (getTransactionDisplayStatus(transaction)) {
    case 'paid':
      return 'secondary'
    case 'partial':
      return 'partial'
    case 'overdue':
      return 'destructive'
    case 'canceled':
      return 'outline'
    default:
      return 'warning'
  }
}

export function getTransactionStatusLine(
  transaction: Pick<
    ListTransactions200TransactionsItem,
    'status' | 'dueDate' | 'overdueDays' | 'paidAt'
  >
): string {
  if (transaction.status === 'paid' && transaction.paidAt) {
    const paidDate = dayjs(transaction.paidAt)
    const dueDate = dayjs(transaction.dueDate)
    const daysLate = paidDate.diff(dueDate, 'day')

    if (daysLate > 0) {
      return `Pago em ${paidDate.format('DD/MM/YYYY')} · ${daysLate} dia${daysLate > 1 ? 's' : ''} em atraso`
    }
    if (daysLate < 0) {
      return `Pago em ${paidDate.format('DD/MM/YYYY')} · ${Math.abs(daysLate)} dia${Math.abs(daysLate) > 1 ? 's' : ''} antes do vencimento`
    }
    return `Pago em ${paidDate.format('DD/MM/YYYY')}`
  }

  if (transaction.status === 'partial') {
    return 'Pagamento parcial em andamento'
  }

  if (transaction.status === 'canceled') {
    return 'Transação cancelada'
  }

  const daysUntilDue = computeDaysUntilDue(new Date(transaction.dueDate))

  if (daysUntilDue < 0) {
    const overdue = Math.abs(daysUntilDue)
    return `${overdue} dia${overdue > 1 ? 's' : ''} em atraso`
  }
  if (daysUntilDue === 0) {
    return 'Vence hoje'
  }
  if (daysUntilDue === 1) {
    return 'Vence amanhã'
  }
  return `Vence em ${daysUntilDue} dias`
}

export function getInstallmentProgress(
  transaction: Pick<
    ListTransactions200TransactionsItem,
    'installmentsTotal' | 'installmentsPaid' | 'installmentIndex' | 'status'
  >
): { paid: number; total: number; show: boolean } | null {
  const hasSeries =
    transaction.installmentsTotal != null ||
    transaction.installmentIndex != null ||
    (transaction.installmentsPaid ?? 0) > 0

  if (!hasSeries) return null

  const total =
    transaction.installmentsTotal ??
    (transaction.installmentIndex != null ? transaction.installmentIndex : 1)
  const paid = transaction.installmentsPaid ?? (transaction.status === 'paid' ? 1 : 0)

  if (total <= 1 && paid <= 1 && transaction.installmentIndex == null) {
    return null
  }

  return { paid, total, show: true }
}
