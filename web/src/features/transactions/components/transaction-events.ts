import dayjs from 'dayjs'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import type { CalendarEvent } from '@/components/event-calendar'
import { centsStringToNumber, formatCompactCurrency } from '@/lib/currency'
import { computeDaysUntilDue } from '@/lib/date'

function toDateKey(value: Date | string): string {
  return dayjs(value).format('YYYY-MM-DD')
}

function isInRange(dateKey: string, from: string, to: string): boolean {
  return dateKey >= from && dateKey <= to
}

function buildInstallmentLabel(
  transaction: ListTransactions200TransactionsItem
): string | undefined {
  if (transaction.installmentsTotal && transaction.installmentsTotal > 1) {
    if (transaction.installmentNumber) {
      return `${transaction.installmentNumber}/${transaction.installmentsTotal}`
    }
    return `${transaction.installmentsTotal}x`
  }
  return undefined
}

function buildStatusLine(
  transaction: ListTransactions200TransactionsItem,
  referenceDate = new Date()
): string | undefined {
  if (transaction.status === 'paid') {
    return transaction.type === 'income' ? 'Recebido' : 'Pago'
  }
  if (transaction.status === 'canceled') return 'Cancelado'

  const daysUntilDue = computeDaysUntilDue(new Date(transaction.date), referenceDate)
  if (daysUntilDue < 0) {
    const overdue = Math.abs(daysUntilDue)
    return `${overdue}d · Vencido`
  }
  if (daysUntilDue === 0) return 'Vence hoje'
  if (daysUntilDue === 1) return 'Amanhã'
  if (daysUntilDue > 1) return `${daysUntilDue}d`
  return 'Pendente'
}

function resolveEventColor(
  transaction: ListTransactions200TransactionsItem
): CalendarEvent['color'] {
  if (transaction.type === 'income') return 'emerald'
  if (transaction.type === 'transfer') return 'sky'
  return 'rose'
}

export function transactionToCalendarEvent(
  transaction: ListTransactions200TransactionsItem,
  dateFrom: string,
  dateTo: string,
  referenceDate = new Date()
): CalendarEvent | null {
  const dateKey = toDateKey(transaction.date)
  if (!isInRange(dateKey, dateFrom, dateTo)) return null

  const displayDate = dayjs(dateKey).toDate()
  const amount = centsStringToNumber(transaction.amount)

  let overdueDays: number | undefined
  if (transaction.status === 'pending') {
    const daysUntil = computeDaysUntilDue(new Date(transaction.date), referenceDate)
    if (daysUntil < 0) overdueDays = Math.abs(daysUntil)
  }

  return {
    id: transaction.id,
    title: transaction.title,
    start: displayDate,
    end: displayDate,
    allDay: true,
    color: resolveEventColor(transaction),
    status: transaction.status,
    overdueDays,
    eventType: 'transaction',
    amountLabel: formatCompactCurrency(amount),
    installmentLabel: buildInstallmentLabel(transaction),
    statusLine: buildStatusLine(transaction, referenceDate),
  }
}

export function transactionsToCalendarEvents(
  transactions: ListTransactions200TransactionsItem[],
  dateFrom: string,
  dateTo: string,
  referenceDate = new Date()
): CalendarEvent[] {
  return transactions
    .map(transaction =>
      transactionToCalendarEvent(transaction, dateFrom, dateTo, referenceDate)
    )
    .filter((event): event is CalendarEvent => event != null)
}
