import { and, eq, gte, isNotNull, lt, lte, or } from 'drizzle-orm'

import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'

export function isSeriesVisibleInTransactionList(
  seriesActive: boolean,
  status: 'pending' | 'paid' | 'partial' | 'canceled',
  paidAt: Date | null,
  dueDate: Date,
  dateFrom: Date,
  dateTo: Date,
  referenceDate = new Date()
): boolean {
  if (seriesActive) return true

  if (status === 'paid' && paidAt != null) {
    return paidAt >= dateFrom && paidAt <= dateTo
  }

  if (status === 'pending' || status === 'partial') {
    return dueDate < referenceDate
  }

  return false
}

/** SQL predicate: which series/occurrence rows belong in transaction lists and reports. */
export function seriesVisibleInTransactionList(dateFrom: Date, dateTo: Date) {
  const paidInSelectedRange = and(
    isNotNull(transactionOccurrences.paidAt),
    gte(transactionOccurrences.paidAt, dateFrom),
    lte(transactionOccurrences.paidAt, dateTo)
  )
  const openOverdue = and(
    or(eq(transactionOccurrences.status, 'pending'), eq(transactionOccurrences.status, 'partial')),
    lt(transactionOccurrences.dueDate, new Date())
  )

  return or(
    eq(transactionSeries.active, true),
    and(eq(transactionOccurrences.status, 'paid'), paidInSelectedRange),
    openOverdue
  )
}
