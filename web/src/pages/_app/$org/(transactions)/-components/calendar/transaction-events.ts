import dayjs from 'dayjs'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import type { CalendarEvent } from '@/components/event-calendar'
import {
  formatCompactCurrency,
  formatPartialPaymentDescription,
  formatPartialPaymentStatusCompact,
} from '@/lib/currency'
import { computeDaysUntilDue } from '@/lib/date'
import {
  getInstallmentProgress,
  getTransactionDisplayStatus,
  getTransactionStatusLabel,
} from '@/lib/transaction-status'

function toDateKey(value: Date | string): string {
  return dayjs(value).format('YYYY-MM-DD')
}

function isInRange(dateKey: string, from: string, to: string): boolean {
  return dateKey >= from && dateKey <= to
}

/** Original due date is in a month before the calendar view month. */
function isDueDateBeforeViewMonth(dueDate: Date | string, dateFrom: string): boolean {
  return toDateKey(dueDate).slice(0, 7) < dateFrom.slice(0, 7)
}

function isOpenTransaction(status: ListTransactions200TransactionsItem['status']): boolean {
  return status === 'pending' || status === 'partial'
}

export function findNextOpenInstallmentDueDate(
  transaction: ListTransactions200TransactionsItem,
  allTransactions: ListTransactions200TransactionsItem[]
): string | null {
  const dueKey = toDateKey(transaction.dueDate)

  const nextInstallment = allTransactions
    .filter(
      candidate =>
        candidate.serieId === transaction.serieId &&
        candidate.id !== transaction.id &&
        isOpenTransaction(candidate.status) &&
        toDateKey(candidate.dueDate) > dueKey
    )
    .sort((a, b) => toDateKey(a.dueDate).localeCompare(toDateKey(b.dueDate)))[0]

  return nextInstallment ? toDateKey(nextInstallment.dueDate) : null
}

function rollDueDateIntoViewMonth(
  dueKey: string,
  dateFrom: string,
  dateTo: string
): string | null {
  if (dueKey > dateTo) return null

  let cursor = dayjs(dueKey)
  while (cursor.format('YYYY-MM-DD') < dateFrom) {
    cursor = cursor.add(1, 'month')
  }

  const rolledKey = cursor.format('YYYY-MM-DD')
  return isInRange(rolledKey, dateFrom, dateTo) ? rolledKey : null
}

export function getOpenTransactionDisplayDate(
  transaction: ListTransactions200TransactionsItem,
  _allTransactions: ListTransactions200TransactionsItem[],
  dateFrom: string,
  dateTo: string
): { displayKey: string; isTransbordoRepositioned: boolean } {
  const dueKey = toDateKey(transaction.dueDate)

  if (isInRange(dueKey, dateFrom, dateTo)) {
    return { displayKey: dueKey, isTransbordoRepositioned: false }
  }

  if (dueKey < dateFrom) {
    const rolledKey = rollDueDateIntoViewMonth(dueKey, dateFrom, dateTo)
    if (rolledKey) {
      return { displayKey: rolledKey, isTransbordoRepositioned: true }
    }
  }

  return { displayKey: dueKey, isTransbordoRepositioned: false }
}

export function getTransactionEventSpan(
  transaction: ListTransactions200TransactionsItem,
  dateFrom: string,
  dateTo: string,
  allTransactions: ListTransactions200TransactionsItem[] = []
): {
  start: Date
  end: Date
  displayKey: string
  isTransbordoRepositioned: boolean
  isPaidAtRepositioned: boolean
} | null {
  const dueKey = toDateKey(transaction.dueDate)

  // Transbordo paid in the viewing month: show on payment date (partial or paid).
  if (!isInRange(dueKey, dateFrom, dateTo) && transaction.paidAt) {
    const paidKey = toDateKey(transaction.paidAt)
    if (isInRange(paidKey, dateFrom, dateTo)) {
      const displayDate = dayjs(paidKey).toDate()
      return {
        start: displayDate,
        end: displayDate,
        displayKey: paidKey,
        isTransbordoRepositioned: false,
        isPaidAtRepositioned: true,
      }
    }
  }

  if (isOpenTransaction(transaction.status)) {
    const { displayKey, isTransbordoRepositioned } = getOpenTransactionDisplayDate(
      transaction,
      allTransactions,
      dateFrom,
      dateTo
    )
    if (!isInRange(displayKey, dateFrom, dateTo)) return null

    const displayDate = dayjs(displayKey).toDate()
    return {
      start: displayDate,
      end: displayDate,
      displayKey,
      isTransbordoRepositioned,
      isPaidAtRepositioned: false,
    }
  }

  if (!isInRange(dueKey, dateFrom, dateTo)) return null

  const dueDate = dayjs(dueKey).toDate()
  return {
    start: dueDate,
    end: dueDate,
    displayKey: dueKey,
    isTransbordoRepositioned: false,
    isPaidAtRepositioned: false,
  }
}

function buildTransactionEventDescription(
  transaction: ListTransactions200TransactionsItem,
  isTransbordoRepositioned: boolean
): string | undefined {
  const parts: string[] = []

  if (isTransbordoRepositioned) {
    parts.push(`Transbordo · venc. ${dayjs(transaction.dueDate).format('DD/MM')}`)
  }

  if (transaction.status === 'partial' && transaction.valuePaid != null) {
    parts.push(
      formatPartialPaymentDescription(Number(transaction.amount), transaction.valuePaid)
    )
  }

  if (transaction.installmentsTotal != null && transaction.installmentIndex != null) {
    parts.push(`Parcela ${transaction.installmentIndex} de ${transaction.installmentsTotal}`)
  }

  return parts.length > 0 ? parts.join(' · ') : undefined
}

function buildPartialPaymentSummary(
  transaction: ListTransactions200TransactionsItem
): string | undefined {
  if (transaction.status !== 'partial' || transaction.valuePaid == null) return undefined

  return formatPartialPaymentStatusCompact(Number(transaction.amount), transaction.valuePaid)
}

function titleHasInstallmentHint(title: string, total: number): boolean {
  return new RegExp(`\\b${total}x\\s*$`, 'i').test(title.trim())
}

function buildTransactionInstallmentLabel(
  transaction: ListTransactions200TransactionsItem
): string | undefined {
  const progress = getInstallmentProgress(transaction)
  if (!progress?.show) return undefined
  if (titleHasInstallmentHint(transaction.title, progress.total)) return undefined
  return `${progress.total}x`
}

function resolveOverdueDays(
  transaction: ListTransactions200TransactionsItem,
  referenceDate = new Date()
): number | undefined {
  if (transaction.status === 'paid') {
    if (!transaction.paidAt) return undefined
    const daysUntilDue = computeDaysUntilDue(
      new Date(transaction.dueDate),
      new Date(transaction.paidAt)
    )
    return daysUntilDue < 0 ? Math.abs(daysUntilDue) : undefined
  }

  if (!isOpenTransaction(transaction.status)) return undefined

  if (transaction.overdueDays > 0) {
    return transaction.overdueDays
  }

  const daysUntilDue = computeDaysUntilDue(new Date(transaction.dueDate), referenceDate)
  return daysUntilDue < 0 ? Math.abs(daysUntilDue) : undefined
}

function buildTransactionStatusLine(
  transaction: ListTransactions200TransactionsItem,
  referenceDate = new Date(),
  isTransbordo = false,
  isPaidAtRepositioned = false
): string | undefined {
  if (isPaidAtRepositioned) {
    if (transaction.status === 'paid') {
      const paidOverdueDays = resolveOverdueDays(transaction, referenceDate)
      if (paidOverdueDays != null && paidOverdueDays > 0) {
        return `Pago · ${paidOverdueDays}d venc.`
      }
      return 'Pago'
    }

    if (transaction.status === 'partial') {
      const parts = ['Parcial']
      const partialSummary = buildPartialPaymentSummary(transaction)
      if (partialSummary) parts.push(partialSummary)
      return parts.join(' · ')
    }
  }

  const overdueDays = resolveOverdueDays(transaction, referenceDate)
  const displayStatus = getTransactionDisplayStatus({
    ...transaction,
    overdueDays: overdueDays ?? transaction.overdueDays,
  })

  if (displayStatus === 'paid') return 'Pago'
  if (displayStatus === 'canceled') return 'Cancelado'

  if (displayStatus === 'overdue') {
    const days = overdueDays ?? 0
    if (isTransbordo) {
      return days > 0 ? `${days}d · Vencido · Transbordo` : 'Vencido · Transbordo'
    }
    return days > 0 ? `${days}d · Vencido` : 'Vencido'
  }

  if (displayStatus === 'partial') {
    const parts: string[] = []
    const isOverdue = overdueDays != null && overdueDays > 0

    if (isOverdue) {
      parts.push(`${overdueDays}d`)
      parts.push(isTransbordo ? 'Vencida · Transbordo' : 'Vencida')
    } else {
      parts.push('Parcial')
    }

    const partialSummary = buildPartialPaymentSummary(transaction)
    if (partialSummary) parts.push(partialSummary)
    return parts.join(' · ')
  }

  const daysUntilDue = computeDaysUntilDue(new Date(transaction.dueDate), referenceDate)
  if (daysUntilDue === 0) return 'Vence hoje'
  if (daysUntilDue === 1) return 'Amanhã'
  if (daysUntilDue > 1) return `${daysUntilDue}d`

  return getTransactionStatusLabel({
    ...transaction,
    overdueDays: overdueDays ?? transaction.overdueDays,
  })
}

export function transactionToCalendarEvent(
  transaction: ListTransactions200TransactionsItem,
  dateFrom: string,
  dateTo: string,
  referenceDate = new Date(),
  allTransactions: ListTransactions200TransactionsItem[] = []
): CalendarEvent | null {
  const span = getTransactionEventSpan(transaction, dateFrom, dateTo, allTransactions)
  if (!span) return null

  const isPaidAtDisplay = span.isPaidAtRepositioned
  const isTransbordo =
    !isPaidAtDisplay &&
    isOpenTransaction(transaction.status) &&
    isDueDateBeforeViewMonth(transaction.dueDate, dateFrom)
  const showTransbordoDescription =
    span.isTransbordoRepositioned ||
    (isPaidAtDisplay && isDueDateBeforeViewMonth(transaction.dueDate, dateFrom))

  const overdueDays = resolveOverdueDays(transaction, referenceDate)

  return {
    id: transaction.id,
    title: transaction.title,
    start: span.start,
    end: span.end,
    allDay: true,
    color: transaction.type === 'income' ? 'emerald' : 'rose',
    status: transaction.status,
    overdueDays,
    description: buildTransactionEventDescription(transaction, showTransbordoDescription),
    eventType: 'transaction',
    amountLabel: formatCompactCurrency(Number(transaction.amount)),
    installmentLabel: buildTransactionInstallmentLabel(transaction),
    statusLine: buildTransactionStatusLine(
      transaction,
      referenceDate,
      isTransbordo,
      isPaidAtDisplay
    ),
    valuePaid: transaction.valuePaid,
    isTransbordo,
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
      transactionToCalendarEvent(transaction, dateFrom, dateTo, referenceDate, transactions)
    )
    .filter((event): event is CalendarEvent => event != null)
}
