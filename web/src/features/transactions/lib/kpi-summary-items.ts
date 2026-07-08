import dayjs from 'dayjs'

import type {
  ListPendingSplits200SplitsItem,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
import { formatCurrency, moneyStringToCents, moneyStringToReais, centsToReais } from '@/lib/currency'
import { isInvoicePaymentTitle } from '@/lib/transaction-kpi'

import type { InvoiceSummaryRow } from '../types'

export type KpiKey = 'mySpend' | 'pendingSplits' | 'toPay' | 'toReceive' | 'overdue'

export type KpiSummaryItem = {
  id: string
  title: string
  subtitle?: string
  meta?: string
  amountLabel: string
  amountClassName?: string
  onClick?: () => void
}

export type KpiDialogView = {
  title: string
  description: string
  totalLabel: string
  total: string
  totalClassName?: string
  items: KpiSummaryItem[]
  isLoading?: boolean
  emptyMessage: string
  footerHint?: string
}

const MAX_DIALOG_ITEMS = 40

function displayAmountReais(tx: ListTransactions200TransactionsItem) {
  return moneyStringToReais(tx.paidAmount ?? tx.amount)
}

/** Remaining split balance in reais (converts at the feature boundary). */
export function remainingSplitReais(amount: string, paidAmount: string): number {
  return centsToReais(Math.max(0, moneyStringToCents(amount) - moneyStringToCents(paidAmount)))
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

export function mapPendingSplitKpiItems(input: {
  splits: ListPendingSplits200SplitsItem[]
  onOpenTransaction: (id: string) => void
}): KpiSummaryItem[] {
  return input.splits.map(split => ({
    id: split.id,
    title: split.personName ?? split.contactName ?? 'Contato',
    subtitle: split.transactionTitle,
    meta: `${dayjs(split.transactionDate).format('DD/MM/YYYY')}${
      split.status === 'partial' ? ' · parcial' : ''
    }`,
    amountLabel: formatCurrency(remainingSplitReais(split.amount, split.paidAmount)),
    amountClassName: 'text-amber-600',
    onClick: () => input.onOpenTransaction(split.transactionId),
  }))
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

export function buildKpiDialogByKey(input: {
  kpis: {
    myPaid: number
    myPendingSplits: number
    pendingExpense: number
    pendingIncome: number
  }
  overdueCount: number
  paidExpenseItems: KpiSummaryItem[]
  splitItems: KpiSummaryItem[]
  toPayItems: KpiSummaryItem[]
  toReceiveItems: KpiSummaryItem[]
  overdueItems: KpiSummaryItem[]
  splitsLoading: boolean
  overdueLoading: boolean
}): Record<KpiKey, KpiDialogView> {
  const { kpis, overdueCount } = input

  return {
    mySpend: {
      title: 'Meu gasto',
      description:
        'É o que ficou com você no período: despesas pagas menos a fatia de quem divide a conta. Essa fatia já sai daqui mesmo se a pessoa ainda não te pagou — o que falta voltar aparece em Splits a receber.',
      totalLabel: 'Seu custo no período',
      total: formatCurrency(kpis.myPaid),
      items: input.paidExpenseItems,
      emptyMessage: 'Nenhuma despesa paga no período.',
      footerHint: 'Toque em um item para abrir o lançamento',
    },
    pendingSplits: {
      title: 'Splits a receber',
      description:
        'Dinheiro que outras pessoas ainda te devem em divisões. Já foi retirado de Meu gasto; aqui é só o que falta entrar. Não segue o filtro de período da lista.',
      totalLabel: 'Total em aberto',
      total: formatCurrency(kpis.myPendingSplits),
      totalClassName: 'text-amber-700',
      items: input.splitItems,
      isLoading: input.splitsLoading,
      emptyMessage: 'Nenhum split pendente.',
      footerHint: 'Toque em um item para abrir o lançamento',
    },
    toPay: {
      title: 'A pagar',
      description: 'Despesas e faturas de cartão ainda pendentes no período selecionado.',
      totalLabel: 'Total a pagar',
      total: formatCurrency(kpis.pendingExpense),
      totalClassName: 'text-amber-700',
      items: input.toPayItems,
      emptyMessage: 'Nada pendente no período.',
      footerHint: 'Toque em um item para abrir',
    },
    toReceive: {
      title: 'A receber',
      description: 'Receitas previstas no período que ainda não foram confirmadas como recebidas.',
      totalLabel: 'Total a receber',
      total: formatCurrency(kpis.pendingIncome),
      totalClassName: 'text-emerald-700',
      items: input.toReceiveItems,
      emptyMessage: 'Nenhuma receita pendente no período.',
      footerHint: 'Toque em um item para abrir o lançamento',
    },
    overdue: {
      title: 'Vencidos',
      description:
        'Lançamentos pagáveis com data anterior a hoje. Contagem global, sem filtro de período.',
      totalLabel: 'Quantidade',
      total: String(overdueCount),
      totalClassName: 'text-rose-700',
      items: input.overdueItems,
      isLoading: input.overdueLoading,
      emptyMessage: 'Nenhum lançamento vencido.',
      footerHint:
        overdueCount > input.overdueItems.length
          ? `Mostrando ${input.overdueItems.length} de ${overdueCount} · toque para abrir`
          : 'Toque em um item para abrir o lançamento',
    },
  }
}
