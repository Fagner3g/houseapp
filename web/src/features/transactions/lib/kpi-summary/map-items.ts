import dayjs from 'dayjs'

import type {
  ListPendingSplits200SplitsItem,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
import { centsToReais, formatCurrency, moneyStringToReais } from '@/lib/currency'
import { isInvoicePaymentTitle } from '@/lib/transaction-kpi'
import type { InvoiceSummaryRow } from '../../types'
import { remainingSplitCents } from './money'
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

export function mapToPayKpiItems(input: {
  transactions: ListTransactions200TransactionsItem[]
  invoiceSummaries: InvoiceSummaryRow[]
  onOpenTransaction: (id: string) => void
  onOpenInvoice: (inv: InvoiceSummaryRow) => void
}): KpiSummaryItem[] {
  const txs = input.transactions.map(tx =>
    transactionItem(tx, {
      amountReais: moneyStringToReais(tx.amount),
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
  onOpenTransaction: (id: string) => void
}): KpiSummaryItem[] {
  return input.transactions.map(tx =>
    transactionItem(tx, {
      amountReais: moneyStringToReais(tx.amount),
      amountClassName: 'text-emerald-600',
      onClick: () => input.onOpenTransaction(tx.id),
    })
  )
}

function pendingSplitPersonKey(split: ListPendingSplits200SplitsItem): string {
  if (split.userId) return `user:${split.userId}`
  const name = (split.personName ?? split.contactName ?? 'Contato').trim().toLowerCase()
  return `name:${name}`
}

function pendingSplitPersonLabel(split: ListPendingSplits200SplitsItem): string {
  return split.personName ?? split.contactName ?? 'Contato'
}

export function mapPendingSplitKpiItems(input: {
  splits: ListPendingSplits200SplitsItem[]
  onOpenTransaction: (id: string) => void
}): KpiSummaryItem[] {
  const groups = new Map<
    string,
    {
      label: string
      remainingCents: number
      children: Array<KpiSummaryItem & { sortDate: string }>
    }
  >()

  for (const split of input.splits) {
    const key = pendingSplitPersonKey(split)
    const remainingCents = remainingSplitCents(split.amount, split.paidAmount)
    const child = {
      id: split.id,
      title: split.transactionTitle,
      meta: `${dayjs(split.transactionDate).format('DD/MM/YYYY')}${
        split.status === 'partial' ? ' · parcial' : ''
      }`,
      amountLabel: formatCurrency(centsToReais(remainingCents)),
      amountClassName: 'text-amber-600',
      onClick: () => input.onOpenTransaction(split.transactionId),
      sortDate: split.transactionDate,
    }

    const existing = groups.get(key)
    if (existing) {
      existing.remainingCents += remainingCents
      existing.children.push(child)
    } else {
      groups.set(key, {
        label: pendingSplitPersonLabel(split),
        remainingCents,
        children: [child],
      })
    }
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const children = [...group.children]
        .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
        .map(child => {
          const { sortDate: _sortDate, ...item } = child
          return item
        })
      const count = children.length
      return {
        id: key,
        title: group.label,
        meta: count === 1 ? '1 lançamento' : `${count} lançamentos`,
        amountLabel: formatCurrency(centsToReais(group.remainingCents)),
        amountClassName: 'text-amber-600',
        children,
      } satisfies KpiSummaryItem
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
}

export function mapOverdueKpiItems(input: {
  transactions: ListTransactions200TransactionsItem[]
  onOpenTransaction: (id: string) => void
}): KpiSummaryItem[] {
  return input.transactions.map(tx =>
    transactionItem(tx, {
      amountReais: moneyStringToReais(tx.amount),
      amountClassName: 'text-rose-600',
      onClick: () => input.onOpenTransaction(tx.id),
    })
  )
}
