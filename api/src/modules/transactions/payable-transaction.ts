import { and, eq, gt, gte, inArray, isNotNull, isNull, lte, ne, or, sql, type SQL } from 'drizzle-orm'

import { accounts } from '@/db/schemas/accounts'
import { transactions } from '@/db/schemas/transactions'

/** Lançamentos no cartão não são contas a pagar/receber — a obrigação é a fatura. */
export function isPayableTransactionCondition(): SQL {
  return or(
    isNull(transactions.accountId),
    isNull(accounts.type),
    ne(accounts.type, 'credit_card')
  ) as SQL
}

export function payableTransactionJoin() {
  return {
    accounts,
    on: eq(transactions.accountId, accounts.id),
  } as const
}

export function payableTransactionWhere(extra?: SQL) {
  return extra ? and(extra, isPayableTransactionCondition()) : isPayableTransactionCondition()
}

/** Hide transactions with a future scheduled payment from urgency lists and alerts. */
export function isNotScheduledForFutureCondition(): SQL {
  return or(
    isNull(transactions.paymentScheduledAt),
    lte(transactions.paymentScheduledAt, sql`now()`)
  ) as SQL
}

/** Payable list period: due date in range OR pending/partial with scheduled debit in range. */
export function matchesPayablePeriodCondition(dateFrom?: Date, dateTo?: Date): SQL | undefined {
  if (!dateFrom && !dateTo) return undefined

  const dueRange: SQL[] = []
  if (dateFrom) {
    dueRange.push(gte(transactions.date, sql`${dateFrom.toISOString()}::timestamptz`))
  }
  if (dateTo) {
    dueRange.push(lte(transactions.date, sql`${dateTo.toISOString()}::timestamptz`))
  }

  const scheduledRange: SQL[] = [
    inArray(transactions.status, ['pending', 'partial']),
    isNotNull(transactions.paymentScheduledAt),
  ]
  if (dateFrom) {
    scheduledRange.push(
      gte(transactions.paymentScheduledAt, sql`${dateFrom.toISOString()}::timestamptz`)
    )
  }
  if (dateTo) {
    scheduledRange.push(
      lte(transactions.paymentScheduledAt, sql`${dateTo.toISOString()}::timestamptz`)
    )
  }

  const dueMatch = dueRange.length > 0 ? and(...dueRange) : undefined
  const scheduledMatch = and(...scheduledRange)

  return dueMatch ? (or(dueMatch, scheduledMatch) as SQL) : scheduledMatch
}

/** Overdue queries use dateTo-only; keep hiding future-scheduled items there. */
export function shouldExcludeFutureScheduled(filter: {
  payableOnly?: boolean
  scheduledOnly?: boolean
  dateFrom?: Date
  dateTo?: Date
}): boolean {
  if (filter.scheduledOnly) return false
  if (!filter.payableOnly || !filter.dateTo || filter.dateFrom) return false

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  return filter.dateTo < todayStart
}

/** Pending/partial payables with a future scheduled debit date. */
export function isScheduledOnlyCondition(): SQL {
  return and(
    inArray(transactions.status, ['pending', 'partial']),
    isNotNull(transactions.paymentScheduledAt),
    gt(transactions.paymentScheduledAt, sql`now()`)
  ) as SQL
}
