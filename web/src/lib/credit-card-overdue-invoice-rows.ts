import dayjs from 'dayjs'

import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import type { ListStatements200StatementsItem } from '@/api/generated/model'
import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import type { InvoiceOverdueKind, InvoiceSummaryRow } from '@/features/transactions/types'
import {
  findStatementForCycle,
  findPreviousStatementForCycle,
  getBillingCycle,
} from '@/lib/billing-cycle'
import {
  computeInvoiceMetrics,
  resolvePaymentPeriod,
} from '@/lib/credit-card-invoice-metrics'
import {
  receivableByMonthKey,
  type OverdueReceivableSplit,
} from '@/lib/credit-card-overdue-receivables'
import { reaisToMoneyString } from '@/lib/currency'

export type { OverdueReceivableSplit } from '@/lib/credit-card-overdue-receivables'
export {
  receivableByMonthKey,
  receivablesFromPendingSplits,
} from '@/lib/credit-card-overdue-receivables'

type CreditCardAccount = Pick<
  ListAccounts200AccountsItem,
  'id' | 'name' | 'type' | 'closingDay' | 'dueDay'
>

function recentMonthKeys(monthsBack = 13) {
  const keys: string[] = []
  let cursor = dayjs().startOf('month')
  for (let index = 0; index < monthsBack; index++) {
    keys.push(cursor.format('YYYY-MM'))
    cursor = cursor.subtract(1, 'month')
  }
  return keys
}

function hasConfiguredBillingCycle(account: CreditCardAccount) {
  return account.type === 'credit_card' && account.closingDay != null && account.dueDay != null
}

function resolveInvoiceAmount(metrics: ReturnType<typeof computeInvoiceMetrics>) {
  if (metrics.invoiceTotal > 0) return metrics.invoiceTotal
  if (metrics.purchases > 0) return metrics.purchases
  return Math.max(metrics.invoiceTotal, 0)
}

function resolveOverdueKind(bankRemaining: number, receivableRemaining: number): InvoiceOverdueKind {
  if (bankRemaining > 0 && receivableRemaining > 0) return 'both'
  if (receivableRemaining > 0) return 'receivable'
  return 'bank'
}

export function buildOverdueInvoiceSummaries({
  creditCards,
  statementsByAccountId,
  transactions,
  receivables = [],
}: {
  creditCards: CreditCardAccount[]
  statementsByAccountId: Record<string, ListStatements200StatementsItem[]>
  transactions: ListTransactions200TransactionsItem[]
  receivables?: OverdueReceivableSplit[]
}): InvoiceSummaryRow[] {
  const summaries: InvoiceSummaryRow[] = []
  const today = dayjs().startOf('day')
  const seen = new Set<string>()

  for (const account of creditCards) {
    if (!hasConfiguredBillingCycle(account)) continue

    const closing = account.closingDay as number
    const due = account.dueDay as number
    const accountTx = transactions.filter(t => t.accountId === account.id)
    const accountStatements = statementsByAccountId[account.id] ?? []
    const receivableMonths = receivableByMonthKey(account, receivables)

    for (const monthKey of new Set([...recentMonthKeys(), ...receivableMonths.keys()])) {
      const cycle = getBillingCycle(closing, due, monthKey)
      const statement = findStatementForCycle(accountStatements, cycle, {
        closingDay: closing,
        dueDay: due,
      })
      const effectiveDue = statement?.dueDate ?? cycle.dueDate
      if (!dayjs(effectiveDue).isBefore(today)) continue

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
      const receivableRemaining = receivableMonths.get(monthKey) ?? 0

      if (invoiceAmount <= 0 && receivableRemaining <= 0) continue
      if (remaining <= 0 && receivableRemaining <= 0) continue

      const summaryKey = `${account.id}-${monthKey}`
      if (seen.has(summaryKey)) continue
      seen.add(summaryKey)

      const overdueKind = resolveOverdueKind(remaining, receivableRemaining)
      const displayRemaining = remaining > 0 ? remaining : receivableRemaining
      const displayAmount = invoiceAmount > 0 ? invoiceAmount : receivableRemaining

      summaries.push({
        kind: 'invoice_summary',
        id: `invoice-${account.id}-${monthKey}`,
        accountId: account.id,
        accountName: account.name,
        monthKey,
        title: `Fatura ${account.name} — ${cycle.label}`,
        amount: reaisToMoneyString(displayAmount),
        payments: reaisToMoneyString(metrics.payments),
        remaining: reaisToMoneyString(displayRemaining),
        receivableRemaining: reaisToMoneyString(receivableRemaining),
        overdueKind,
        type: 'expense',
        date: dayjs(statement?.dueDate ?? paymentPeriod.end)
          .hour(12)
          .minute(0)
          .second(0)
          .millisecond(0)
          .toISOString(),
        status: 'pending',
      })
    }
  }

  summaries.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
  return summaries
}
