import type { ListTransactions200TransactionsItem } from '@/api/generated/model'

export type InvoiceOverdueKind = 'bank' | 'receivable' | 'both'

export type InvoiceSummaryRow = {
  kind: 'invoice_summary'
  id: string
  accountId: string
  accountName: string
  monthKey: string
  title: string
  /** Total da fatura (saldo anterior + compras). */
  amount: string
  /** Valor já pago no ciclo (créditos no cartão). */
  payments: string
  /** Saldo em aberto da fatura. */
  remaining: string
  /** Remaining receivable split amounts for the cycle (creditor view). */
  receivableRemaining?: string
  /** Why this invoice still appears on the overdue list. */
  overdueKind?: InvoiceOverdueKind
  type: 'expense'
  date: string
  status: 'pending' | 'paid'
}

export type TransactionListItem =
  | ({ kind: 'transaction' } & ListTransactions200TransactionsItem)
  | InvoiceSummaryRow

export function isInvoiceSummary(item: TransactionListItem): item is InvoiceSummaryRow {
  return item.kind === 'invoice_summary'
}

export function toTransactionListItem(
  tx: ListTransactions200TransactionsItem
): TransactionListItem {
  return { kind: 'transaction', ...tx }
}
