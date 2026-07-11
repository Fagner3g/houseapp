import { isInvoicePaymentTitle } from '@houseapp/finance-core'

import type { InvoiceSummaryRow } from '@/features/transactions/types'
import { moneyStringToReais } from '@/lib/currency'

type ExpenseLike = {
  title: string
  amount: string | null
  paidAmount?: string | null
}

function sumAmounts(amounts: (string | null | undefined)[]) {
  return amounts.reduce((sum, value) => sum + moneyStringToReais(value), 0)
}

export { isInvoicePaymentTitle }

/**
 * Cash-flow KPIs for the transactions page.
 *
 * Invoice payments create a checking expense + credit-card income. We count the
 * obligation once via credit-card payments in summaries, not both legs.
 *
 * Callers must pass payable-only pending income (excludes credit-card credits
 * such as IOF refunds — those belong to the invoice, not "A receber").
 */
export function computeTransactionKpis({
  reportTotalIncome,
  reportTotalExpense,
  reportMyExpense,
  reportMyExpenseGross,
  reportMySplitsInPeriod,
  reportMyPendingSplits,
  reportMyPendingSplitsInPeriod,
  paidPayableExpenses,
  pendingPayableExpenses,
  pendingIncomeAmounts,
  invoiceSummaries,
}: {
  reportTotalIncome: number
  reportTotalExpense: number
  reportMyExpense?: number
  reportMyExpenseGross?: number
  reportMySplitsInPeriod?: number
  reportMyPendingSplits?: number
  reportMyPendingSplitsInPeriod?: number
  paidPayableExpenses: ExpenseLike[]
  pendingPayableExpenses: ExpenseLike[]
  pendingIncomeAmounts: (string | null | undefined)[]
  invoiceSummaries: InvoiceSummaryRow[]
}) {
  const invoiceCheckingPaid = sumAmounts(
    paidPayableExpenses
      .filter(tx => isInvoicePaymentTitle(tx.title))
      .map(tx => tx.paidAmount ?? tx.amount)
  )

  const invoicePayments = sumAmounts(invoiceSummaries.map(inv => inv.payments))

  const paid = reportTotalExpense - invoiceCheckingPaid + invoicePayments
  const myPaid = reportMyExpense ?? paid
  const myExpenseGross = reportMyExpenseGross ?? myPaid
  const mySplitsInPeriod = reportMySplitsInPeriod ?? Math.max(myExpenseGross - myPaid, 0)

  const pendingPayable = sumAmounts(pendingPayableExpenses.map(tx => tx.amount))
  const pendingInvoices = sumAmounts(invoiceSummaries.map(inv => inv.remaining))
  const pendingExpense = pendingPayable + pendingInvoices
  const pendingIncome = sumAmounts(pendingIncomeAmounts)
  const myPendingSplits = reportMyPendingSplits ?? 0
  const myPendingSplitsInPeriod = reportMyPendingSplitsInPeriod ?? myPendingSplits

  const received = reportTotalIncome
  const balance = received - myPaid
  const realized = balance

  return {
    received,
    paid,
    myPaid,
    myExpenseGross,
    mySplitsInPeriod,
    myPendingSplits,
    myPendingSplitsInPeriod,
    pendingIncome,
    pendingExpense,
    balance,
    realized,
    incomeTotal: received + pendingIncome,
    expenseTotal: myPaid + pendingExpense,
  }
}
