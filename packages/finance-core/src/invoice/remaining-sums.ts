import dayjs from 'dayjs'

import { isWithinBillingRange, type BillingCycle } from '../billing-cycle/index'
import { isImportedInvoiceSettlementCredit } from './classifiers'
import { sumAmounts } from './filters'
import { isInvoicePayment } from './periods'
import type { InvoiceStatementLike, TransactionLike } from './types'

type Period = { start: string; end: string }

function statementClosingDate(
  statement: InvoiceStatementLike | null,
  cycle: BillingCycle
): string {
  return statement?.periodEnd ?? cycle.closingDate
}

function isOnOrAfterDay(date: string, day: string): boolean {
  return !dayjs(date).startOf('day').isBefore(dayjs(day).startOf('day'))
}

export function sumPaymentsNotInStatement(
  transactions: TransactionLike[],
  purchasesPeriod: Period,
  paymentPeriod: Period,
  statement: InvoiceStatementLike | null,
  cycle: BillingCycle
): bigint {
  const statementId = statement?.id ?? null

  return sumAmounts(
    transactions.filter(
      tx =>
        isInvoicePayment(tx, purchasesPeriod, paymentPeriod, cycle, statement) &&
        (statementId == null || !tx.statementId || tx.statementId !== statementId)
    ),
    'income'
  )
}

export function sumInStatementPaymentsOnOrAfterClosing(
  transactions: TransactionLike[],
  purchasesPeriod: Period,
  paymentPeriod: Period,
  statement: InvoiceStatementLike | null,
  cycle: BillingCycle
): bigint {
  const statementId = statement?.id ?? null
  if (!statementId) return 0n

  const closing = statementClosingDate(statement, cycle)

  return sumAmounts(
    transactions.filter(
      tx =>
        tx.statementId === statementId &&
        isInvoicePayment(tx, purchasesPeriod, paymentPeriod, cycle, statement) &&
        isOnOrAfterDay(tx.date, closing)
    ),
    'income'
  )
}

export function sumSettlementCreditsInPeriod(
  transactions: TransactionLike[],
  purchasesPeriod: Period
): bigint {
  return sumAmounts(
    transactions.filter(
      tx =>
        tx.type === 'income' &&
        isImportedInvoiceSettlementCredit(tx) &&
        isWithinBillingRange(tx.date, purchasesPeriod.start, purchasesPeriod.end)
    ),
    'income'
  )
}
