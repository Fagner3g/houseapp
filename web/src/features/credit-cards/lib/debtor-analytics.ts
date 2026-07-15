import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { reaisToMoneyString } from '@/lib/currency'

type ShareAmount = { amount: number }

/**
 * Sum of the viewer's debtor shares for the given transaction ids.
 */
export function sumViewerShares(
  transactionIds: Iterable<string>,
  viewerShareById: Map<string, ShareAmount>
): number {
  let total = 0
  for (const id of transactionIds) {
    total += viewerShareById.get(id)?.amount ?? 0
  }
  return total
}

/**
 * Clone expenses substituting the viewer's share as `amount` for debtor analytics.
 * Drops transactions where the viewer has no share.
 */
export function transactionsWithViewerShareAmounts(
  transactions: ListTransactions200TransactionsItem[],
  viewerShareById: Map<string, ShareAmount>
): ListTransactions200TransactionsItem[] {
  const result: ListTransactions200TransactionsItem[] = []
  for (const transaction of transactions) {
    const share = viewerShareById.get(transaction.id)
    if (!share || share.amount <= 0) continue
    result.push({
      ...transaction,
      amount: reaisToMoneyString(share.amount),
    })
  }
  return result
}
