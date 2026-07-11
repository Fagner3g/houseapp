import dayjs from 'dayjs'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import {
  isWithinBillingRange,
  transactionPurchaseDate,
  transactionsOwnedByInvoiceCycle,
} from '@/lib/credit-card-invoice-metrics'
import { normalizeMerchantTitle } from '@/lib/normalize-merchant-title'

export type AnalyticsGroupFilter = {
  type: 'category' | 'merchant'
  key: string
}

export type AnalyticsPurchasePeriod = {
  start: string
  end: string
}

export function filterAnalyticsGroupTransactions(
  transactions: ListTransactions200TransactionsItem[],
  group: AnalyticsGroupFilter,
  period: AnalyticsPurchasePeriod,
  statementId: string | null = null
) {
  const owned = transactionsOwnedByInvoiceCycle(transactions, statementId ? { id: statementId } : null)

  return owned
    .filter(transaction => {
      if (transaction.type !== 'expense') return false

      const purchaseDate = transactionPurchaseDate(transaction)
      if (!isWithinBillingRange(purchaseDate, period.start, period.end)) return false

      if (group.type === 'category') {
        return transaction.categoryIds.includes(group.key)
      }

      return normalizeMerchantTitle(transaction.title) === group.key
    })
    .sort(
      (left, right) =>
        dayjs(transactionPurchaseDate(right)).valueOf() -
        dayjs(transactionPurchaseDate(left)).valueOf()
    )
}
