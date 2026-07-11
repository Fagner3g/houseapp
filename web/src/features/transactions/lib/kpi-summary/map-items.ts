import dayjs from 'dayjs'

import type {
  GetReportMyExpenses200ItemsItem,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
import { formatCurrency, moneyStringToReais } from '@/lib/currency'
import { isInvoicePaymentTitle } from '@/lib/transaction-kpi'
import { resolveTransactionListAmountReais } from '../../installment-amount.utils'
import type { InvoiceSummaryRow } from '../../types'
import type { KpiSummaryItem } from './types'

const MAX_DIALOG_ITEMS = 40

function displayAmountReais(tx: ListTransactions200TransactionsItem) {
  return moneyStringToReais(tx.paidAmount ?? tx.amount)
}

function invoiceItem(
  inv: InvoiceSummaryRow,
  amountField: 'payments' | 'remaining',
  onClick: () => void
): KpiSummaryItem {
  const amount = moneyStringToReais(inv[amountField])
  return {
    id: inv.id,
    title: inv.title,
    subtitle: inv.accountName,
    meta: dayjs(inv.date).format('DD/MM/YYYY'),
    amountLabel: formatCurrency(amount),
    amountClassName: amountField === 'remaining' ? 'text-amber-600' : 'text-violet-700',
    onClick,
  }
}

function transactionItem(
  tx: ListTransactions200TransactionsItem,
  options: {
    amountReais: number
    amountClassName: string
    onClick: () => void
  }
): KpiSummaryItem {
  return {
    id: tx.id,
    title: tx.title,
    meta: dayjs(tx.date).format('DD/MM/YYYY'),
    amountLabel: formatCurrency(options.amountReais),
    amountClassName: options.amountClassName,
    onClick: options.onClick,
  }
}

export function mapMySpendKpiItems(input: {
  items: GetReportMyExpenses200ItemsItem[]
  onOpenTransaction: (id: string) => void
  onOpenInvoice: (accountId: string, monthKey: string) => void
}): KpiSummaryItem[] {
  return input.items
    .filter(item => moneyStringToReais(item.grossAmount) > 0)
    .map(item => {
      const gross = moneyStringToReais(item.grossAmount)
      const split = moneyStringToReais(item.splitAmount)
      const myAmount = moneyStringToReais(item.myAmount)
      const splitHint =
        split > 0 ? `Total ${formatCurrency(gross)} · split ${formatCurrency(split)}` : undefined

      return {
        id: item.id,
        title: item.title,
        subtitle: item.subtitle ?? splitHint,
        meta: dayjs(item.date).format('DD/MM/YYYY'),
        amountLabel: formatCurrency(myAmount),
        amountClassName: item.kind === 'invoice' ? 'text-violet-700' : 'text-rose-600',
        onClick: () => {
          if (item.kind === 'invoice' && item.accountId && item.monthKey) {
            input.onOpenInvoice(item.accountId, item.monthKey)
            return
          }
          if (item.kind === 'expense') {
            input.onOpenTransaction(item.id)
          }
        },
      }
    })
}

export function mapPaidExpenseKpiItems(input: {
  transactions: ListTransactions200TransactionsItem[]
  invoiceSummaries: InvoiceSummaryRow[]
  onOpenTransaction: (id: string) => void
  onOpenInvoice: (inv: InvoiceSummaryRow) => void
}): KpiSummaryItem[] {
  const txs = input.transactions
    .filter(tx => !isInvoicePaymentTitle(tx.title))
    .map(tx =>
      transactionItem(tx, {
        amountReais: displayAmountReais(tx),
        amountClassName: 'text-rose-600',
        onClick: () => input.onOpenTransaction(tx.id),
      })
    )

  const invoices = input.invoiceSummaries
    .filter(inv => moneyStringToReais(inv.payments) > 0)
    .map(inv => invoiceItem(inv, 'payments', () => input.onOpenInvoice(inv)))

  return [...txs, ...invoices].slice(0, MAX_DIALOG_ITEMS)
}

function payableRemainingReais(
  tx: ListTransactions200TransactionsItem,
  splitPaidById?: Map<string, number>
): number {
  return resolveTransactionListAmountReais(
    tx.amount,
    tx.paidAmount,
    splitPaidById?.get(tx.id) ?? 0
  )
}

export function mapToPayKpiItems(input: {
  transactions: ListTransactions200TransactionsItem[]
  invoiceSummaries: InvoiceSummaryRow[]
  splitPaidById?: Map<string, number>
  onOpenTransaction: (id: string) => void
  onOpenInvoice: (inv: InvoiceSummaryRow) => void
}): KpiSummaryItem[] {
  const txs = input.transactions.map(tx =>
    transactionItem(tx, {
      amountReais: payableRemainingReais(tx, input.splitPaidById),
      amountClassName: 'text-amber-600',
      onClick: () => input.onOpenTransaction(tx.id),
    })
  )

  const invoices = input.invoiceSummaries
    .filter(inv => inv.status === 'pending' && moneyStringToReais(inv.remaining) > 0)
    .map(inv => invoiceItem(inv, 'remaining', () => input.onOpenInvoice(inv)))

  return [...txs, ...invoices].slice(0, MAX_DIALOG_ITEMS)
}

export function mapToReceiveKpiItems(input: {
  transactions: ListTransactions200TransactionsItem[]
  splitPaidById?: Map<string, number>
  onOpenTransaction: (id: string) => void
}): KpiSummaryItem[] {
  return input.transactions.map(tx =>
    transactionItem(tx, {
      amountReais: payableRemainingReais(tx, input.splitPaidById),
      amountClassName: 'text-emerald-600',
      onClick: () => input.onOpenTransaction(tx.id),
    })
  )
}

export function mapOverdueKpiItems(input: {
  transactions: ListTransactions200TransactionsItem[]
  splitPaidById?: Map<string, number>
  onOpenTransaction: (id: string) => void
}): KpiSummaryItem[] {
  return input.transactions.map(tx =>
    transactionItem(tx, {
      amountReais: payableRemainingReais(tx, input.splitPaidById),
      amountClassName: 'text-rose-600',
      onClick: () => input.onOpenTransaction(tx.id),
    })
  )
}
