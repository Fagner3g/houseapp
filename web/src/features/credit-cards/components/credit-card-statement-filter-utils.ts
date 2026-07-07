import type { ListTransactions200TransactionsItem } from '@/api/generated/model'

export type InvoiceQuickFilter =
  | 'all'
  | 'purchases'
  | 'payments'
  | 'uncategorized'
  | 'installments'
  | 'divided'

export type InvoiceStatementFilters = {
  search: string
  categoryId: string
  cardId: string
  quickFilter: InvoiceQuickFilter
}

export const defaultInvoiceStatementFilters = (): InvoiceStatementFilters => ({
  search: '',
  categoryId: 'all',
  cardId: 'all',
  quickFilter: 'all',
})

export type InvoiceFilterCounts = {
  purchases: number
  payments: number
  uncategorized: number
  installments: number
  divided: number
}

export function computeInvoiceFilterCounts(
  transactions: ListTransactions200TransactionsItem[],
  dividedTransactionIds: Set<string>
): InvoiceFilterCounts {
  return {
    purchases: transactions.filter(tx => tx.type === 'expense').length,
    payments: transactions.filter(tx => tx.type === 'income').length,
    uncategorized: transactions.filter(
      tx => tx.type === 'expense' && !(tx.categoryIds?.length ?? 0)
    ).length,
    installments: transactions.filter(tx => (tx.installmentsTotal ?? 0) > 1).length,
    divided: transactions.filter(tx => dividedTransactionIds.has(tx.id)).length,
  }
}

export function filterInvoiceTransactions(
  transactions: ListTransactions200TransactionsItem[],
  filters: InvoiceStatementFilters,
  dividedTransactionIds: Set<string>
): ListTransactions200TransactionsItem[] {
  const search = filters.search.trim().toLowerCase()

  return transactions.filter(tx => {
    if (search && !tx.title.toLowerCase().includes(search)) {
      return false
    }

    if (filters.categoryId !== 'all' && !tx.categoryIds?.includes(filters.categoryId)) {
      return false
    }

    if (filters.cardId !== 'all') {
      if (tx.type === 'income') {
        // Pagamentos entram em qualquer filtro de cartão.
      } else if (filters.cardId === 'unassigned') {
        if (tx.cardId) return false
      } else if (tx.cardId !== filters.cardId) {
        return false
      }
    }

    switch (filters.quickFilter) {
      case 'purchases':
        return tx.type === 'expense'
      case 'payments':
        return tx.type === 'income'
      case 'uncategorized':
        return tx.type === 'expense' && !(tx.categoryIds?.length ?? 0)
      case 'installments':
        return (tx.installmentsTotal ?? 0) > 1
      case 'divided':
        return dividedTransactionIds.has(tx.id)
      default:
        return true
    }
  })
}
