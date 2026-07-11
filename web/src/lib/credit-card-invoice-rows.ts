import dayjs from 'dayjs'

import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import type { ListStatements200StatementsItem } from '@/api/generated/model'
import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import type { InvoiceSummaryRow } from '@/features/transactions/types'
import { findStatementForCycle, findPreviousStatementForCycle, getBillingCycle } from '@/lib/billing-cycle'
import { computeInvoiceMetrics, resolvePaymentPeriod, resolvePurchasesPeriod, isWithinBillingRange, isInvoicePayment, transactionPurchaseDate } from '@/lib/credit-card-invoice-metrics'
import { reaisToMoneyString } from '@/lib/currency'

type CreditCardAccount = Pick<
  ListAccounts200AccountsItem,
  'id' | 'name' | 'type' | 'closingDay' | 'dueDay'
>

function monthKeysBetween(dateFrom: string, dateTo: string) {
  const keys: string[] = []
  let cursor = dayjs(dateFrom).startOf('month')
  const end = dayjs(dateTo).startOf('month')

  while (!cursor.isAfter(end)) {
    keys.push(cursor.format('YYYY-MM'))
    cursor = cursor.add(1, 'month')
  }

  return keys
}

function monthKeysAround(dateFrom: string, dateTo: string) {
  const keys = new Set(monthKeysBetween(dateFrom, dateTo))
  keys.add(dayjs(dateFrom).subtract(1, 'month').format('YYYY-MM'))
  keys.add(dayjs(dateTo).add(1, 'month').format('YYYY-MM'))
  return [...keys]
}

function isDateInRange(date: string, dateFrom: string, dateTo: string) {
  const d = dayjs(date)
  return !d.isBefore(dayjs(dateFrom).startOf('day')) && !d.isAfter(dayjs(dateTo).endOf('day'))
}

/** Match API payable period: due date in range, or scheduled debit date in range. */
function isTransactionInPeriod(
  tx: Pick<ListTransactions200TransactionsItem, 'date' | 'paymentScheduledAt'>,
  dateFrom: string,
  dateTo: string
) {
  if (isDateInRange(tx.date, dateFrom, dateTo)) return true
  if (tx.paymentScheduledAt && isDateInRange(tx.paymentScheduledAt, dateFrom, dateTo)) return true
  return false
}

function listSortDate(
  item: { date: string; paymentScheduledAt?: string | null }
): string {
  return item.paymentScheduledAt || item.date
}

function hasConfiguredBillingCycle(account: CreditCardAccount) {
  return account.type === 'credit_card' && account.closingDay != null && account.dueDay != null
}

/** Period picker is the source of truth: only cycles whose due date falls in range. */
function shouldIncludeCycleInRange(
  cycle: ReturnType<typeof getBillingCycle>,
  dateFrom: string,
  dateTo: string
) {
  return isDateInRange(cycle.dueDate, dateFrom, dateTo)
}

function resolveInvoiceAmount(metrics: ReturnType<typeof computeInvoiceMetrics>) {
  if (metrics.invoiceTotal > 0) return metrics.invoiceTotal
  if (metrics.purchases > 0) return metrics.purchases
  return Math.max(metrics.invoiceTotal, 0)
}

export function buildInvoiceSummariesForRange({
  creditCards,
  statementsByAccountId,
  transactions,
  dateFrom,
  dateTo,
}: {
  creditCards: CreditCardAccount[]
  statementsByAccountId: Record<string, ListStatements200StatementsItem[]>
  transactions: ListTransactions200TransactionsItem[]
  dateFrom: string
  dateTo: string
}): { summaries: InvoiceSummaryRow[]; hiddenTransactionIds: Set<string> } {
  const summaries: InvoiceSummaryRow[] = []
  const hiddenTransactionIds = new Set<string>()
  const summaryKeys = new Set<string>()

  for (const account of creditCards) {
    if (!hasConfiguredBillingCycle(account)) continue

    const closing = account.closingDay as number
    const due = account.dueDay as number
    const accountTx = transactions.filter(t => t.accountId === account.id)
    const accountStatements = statementsByAccountId[account.id] ?? []

    for (const monthKey of monthKeysAround(dateFrom, dateTo)) {
      const cycle = getBillingCycle(closing, due, monthKey)
      if (!shouldIncludeCycleInRange(cycle, dateFrom, dateTo)) continue

      const statement = findStatementForCycle(accountStatements, cycle, {
        closingDay: closing,
        dueDay: due,
      })
      const previousStatement = findPreviousStatementForCycle(
        accountStatements,
        cycle,
        closing,
        due
      )
      const paymentContext = { previousStatement, closingDay: closing, dueDay: due }
      const metrics = computeInvoiceMetrics(cycle, statement, accountTx, paymentContext)
      const purchasesPeriod = resolvePurchasesPeriod(cycle, statement)
      const paymentPeriod = resolvePaymentPeriod(cycle, statement, paymentContext)
      const invoiceAmount = resolveInvoiceAmount(metrics)
      const summaryKey = `${account.id}-${monthKey}`

      if (!summaryKeys.has(summaryKey) && invoiceAmount > 0) {
        summaryKeys.add(summaryKey)
        summaries.push({
          kind: 'invoice_summary',
          id: `invoice-${account.id}-${monthKey}`,
          accountId: account.id,
          accountName: account.name,
          monthKey,
          title: `Fatura ${account.name} — ${cycle.label}`,
          amount: reaisToMoneyString(invoiceAmount),
          payments: reaisToMoneyString(metrics.payments),
          remaining: reaisToMoneyString(metrics.remaining),
          type: 'expense',
          date: dayjs(cycle.dueDate).hour(12).minute(0).second(0).millisecond(0).toISOString(),
          status:
            statement?.isClosed && statement?.isPaid
              ? 'paid'
              : metrics.remaining <= 0
                ? 'paid'
                : 'pending',
        })
      }

      for (const tx of accountTx) {
        const hidePurchase =
          tx.type === 'expense' &&
          isWithinBillingRange(
            transactionPurchaseDate(tx),
            purchasesPeriod.start,
            purchasesPeriod.end
          )
        const hidePayment = isInvoicePayment(tx, purchasesPeriod, paymentPeriod, cycle, statement)

        if (hidePurchase || hidePayment) {
          hiddenTransactionIds.add(tx.id)
        }
      }
    }

    for (const tx of accountTx) {
      hiddenTransactionIds.add(tx.id)
    }
  }

  summaries.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())

  return { summaries, hiddenTransactionIds }
}

function recentMonthKeys(monthsBack = 13) {
  const keys: string[] = []
  let cursor = dayjs().startOf('month')

  for (let index = 0; index < monthsBack; index++) {
    keys.push(cursor.format('YYYY-MM'))
    cursor = cursor.subtract(1, 'month')
  }

  return keys
}

export function buildOverdueInvoiceSummaries({
  creditCards,
  statementsByAccountId,
  transactions,
}: {
  creditCards: CreditCardAccount[]
  statementsByAccountId: Record<string, ListStatements200StatementsItem[]>
  transactions: ListTransactions200TransactionsItem[]
}): InvoiceSummaryRow[] {
  const summaries: InvoiceSummaryRow[] = []
  const today = dayjs().startOf('day')

  for (const account of creditCards) {
    if (!hasConfiguredBillingCycle(account)) continue

    const closing = account.closingDay as number
    const due = account.dueDay as number
    const accountTx = transactions.filter(t => t.accountId === account.id)
    const accountStatements = statementsByAccountId[account.id] ?? []

    for (const monthKey of recentMonthKeys()) {
      const cycle = getBillingCycle(closing, due, monthKey)
      if (!dayjs(cycle.dueDate).isBefore(today)) continue

      const statement = findStatementForCycle(accountStatements, cycle, {
        closingDay: closing,
        dueDay: due,
      })
      const previousStatement = findPreviousStatementForCycle(
        accountStatements,
        cycle,
        closing,
        due
      )
      const paymentContext = { previousStatement, closingDay: closing, dueDay: due }
      const metrics = computeInvoiceMetrics(cycle, statement, accountTx, paymentContext)
      const paymentPeriod = resolvePaymentPeriod(cycle, statement, paymentContext)
      const invoiceAmount = resolveInvoiceAmount(metrics)
      const remaining = metrics.remaining

      if (invoiceAmount <= 0 || remaining <= 0) continue

      summaries.push({
        kind: 'invoice_summary',
        id: `invoice-${account.id}-${monthKey}`,
        accountId: account.id,
        accountName: account.name,
        monthKey,
        title: `Fatura ${account.name} — ${cycle.label}`,
        amount: reaisToMoneyString(invoiceAmount),
        payments: reaisToMoneyString(metrics.payments),
        remaining: reaisToMoneyString(remaining),
        type: 'expense',
        date: dayjs(paymentPeriod.end).hour(12).minute(0).second(0).millisecond(0).toISOString(),
        status: 'pending',
      })
    }
  }

  summaries.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())

  return summaries
}

export function mergeTransactionsWithInvoices(
  transactions: ListTransactions200TransactionsItem[],
  summaries: InvoiceSummaryRow[],
  hiddenTransactionIds: Set<string>,
  dateFrom: string,
  dateTo: string
) {
  const visible = transactions.filter(t => !hiddenTransactionIds.has(t.id))
  const merged = [
    ...summaries.filter(item => isDateInRange(item.date, dateFrom, dateTo)),
    ...visible
      .filter(tx => isTransactionInPeriod(tx, dateFrom, dateTo))
      .map(tx => ({ kind: 'transaction' as const, ...tx })),
  ]

  merged.sort(
    (a, b) => dayjs(listSortDate(b)).valueOf() - dayjs(listSortDate(a)).valueOf()
  )

  return merged
}
