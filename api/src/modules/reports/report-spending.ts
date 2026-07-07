import { and, eq, inArray, isNull, ne, or, sql, type SQL } from 'drizzle-orm'

import { accounts } from '@/db/schemas/accounts'
import { transactions } from '@/db/schemas/transactions'
import { isPayableTransactionCondition } from '@/modules/transactions/payable-transaction'

import type { ReportDateRange } from './report.repository'

/** Purchase date for credit card expenses (competence date when set). */
export const purchaseDateExpr = sql<Date>`COALESCE(${transactions.competenceDate}, ${transactions.date})`

export const paidAmountExpr = sql<bigint>`COALESCE(${transactions.paidAmount}, ${transactions.amount}, 0)`

/** Amount used when summing expenses in dashboard reports. */
export const reportExpenseAmountExpr = sql<bigint>`CASE
  WHEN ${accounts.type} = 'credit_card' THEN COALESCE(${transactions.amount}, 0)
  ELSE ${paidAmountExpr}
END`

/** Date bucket for grouping (month/day) — purchase date on card, due date elsewhere. */
export const reportGroupingDateExpr = sql<Date>`CASE
  WHEN ${transactions.type} = 'expense' AND ${accounts.type} = 'credit_card' THEN ${purchaseDateExpr}
  ELSE ${transactions.date}
END`

export function isInvoicePaymentTitleCondition(): SQL {
  return sql`${transactions.title} ~* 'pagamento fatura'`
}

function isNonCreditCardAccountCondition(): SQL {
  return or(
    isNull(transactions.accountId),
    isNull(accounts.type),
    ne(accounts.type, 'credit_card')
  )!
}

function rangeFromIso(range: ReportDateRange) {
  return range.from.toISOString()
}

function rangeToIso(range: ReportDateRange) {
  return range.to.toISOString()
}

/** Credit card purchase in the report period (pending or paid). */
export function isCreditCardExpenseInRange(range: ReportDateRange): SQL {
  return and(
    eq(transactions.type, 'expense'),
    eq(accounts.type, 'credit_card'),
    inArray(transactions.status, ['paid', 'pending']),
    sql`${purchaseDateExpr} >= ${rangeFromIso(range)}::timestamptz`,
    sql`${purchaseDateExpr} <= ${rangeToIso(range)}::timestamptz`
  )!
}

/** Paid payable expense in the report period, excluding invoice payments. */
export function isPayableExpenseInRange(range: ReportDateRange): SQL {
  return and(
    eq(transactions.type, 'expense'),
    eq(transactions.status, 'paid'),
    sql`${transactions.date} >= ${rangeFromIso(range)}::timestamptz`,
    sql`${transactions.date} <= ${rangeToIso(range)}::timestamptz`,
    isPayableTransactionCondition(),
    sql`NOT (${isInvoicePaymentTitleCondition()})`
  )!
}

/** Any expense that counts toward dashboard spending KPIs. */
export function expenseInReportRangeCondition(range: ReportDateRange): SQL {
  return or(isCreditCardExpenseInRange(range), isPayableExpenseInRange(range))!
}

/** Paid income from non-credit-card accounts in the report period. */
export function incomeInReportRangeCondition(range: ReportDateRange): SQL {
  return and(
    eq(transactions.type, 'income'),
    eq(transactions.status, 'paid'),
    sql`${transactions.date} >= ${rangeFromIso(range)}::timestamptz`,
    sql`${transactions.date} <= ${rangeToIso(range)}::timestamptz`,
    isNonCreditCardAccountCondition()
  )!
}

/** SQL CASE expression: expense amount when in range, else 0. */
export function expenseAmountInRangeCase(range: ReportDateRange) {
  return sql<bigint>`CASE
    WHEN ${expenseInReportRangeCondition(range)} THEN ${reportExpenseAmountExpr}
    ELSE 0
  END`
}

/** SQL CASE expression: income amount when in range, else 0. */
export function incomeAmountInRangeCase(range: ReportDateRange) {
  return sql<bigint>`CASE
    WHEN ${incomeInReportRangeCondition(range)} THEN ${paidAmountExpr}
    ELSE 0
  END`
}

/** Month key for trends grouping. */
export function reportMonthExpr() {
  return sql<string>`to_char(date_trunc('month', ${reportGroupingDateExpr}), 'YYYY-MM')`
}

/** Day key for daily flow grouping. */
export function reportDayExpr() {
  return sql<string>`to_char(${reportGroupingDateExpr}::date, 'YYYY-MM-DD')`
}

/** Pure functions for unit tests (mirror SQL rules). */
export function isInvoicePaymentTitle(title: string): boolean {
  return /pagamento fatura/i.test(title)
}

export type ReportSpendingTransactionLike = {
  type: 'income' | 'expense'
  status: string
  title: string
  date: Date
  competenceDate?: Date | null
  amount?: bigint | null
  paidAmount?: bigint | null
  accountType?: string | null
}

export function purchaseDateForTransaction(tx: {
  date: Date
  competenceDate?: Date | null
}): Date {
  return tx.competenceDate ?? tx.date
}

export function expenseAmountForReport(tx: ReportSpendingTransactionLike): bigint {
  if (tx.accountType === 'credit_card') {
    return tx.amount ?? 0n
  }
  return tx.paidAmount ?? tx.amount ?? 0n
}

export function countsAsReportExpense(
  tx: ReportSpendingTransactionLike,
  range: ReportDateRange
): boolean {
  if (tx.type !== 'expense') return false

  if (tx.accountType === 'credit_card') {
    if (tx.status !== 'paid' && tx.status !== 'pending') return false
    const purchaseDate = purchaseDateForTransaction(tx)
    return purchaseDate >= range.from && purchaseDate <= range.to
  }

  if (tx.status !== 'paid') return false
  if (isInvoicePaymentTitle(tx.title)) return false
  return tx.date >= range.from && tx.date <= range.to
}

export function countsAsReportIncome(
  tx: ReportSpendingTransactionLike,
  range: ReportDateRange
): boolean {
  if (tx.type !== 'income' || tx.status !== 'paid') return false
  if (tx.accountType === 'credit_card') return false
  return tx.date >= range.from && tx.date <= range.to
}
