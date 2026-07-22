import type { QueryClient } from '@tanstack/react-query'

import {
  getGetSplitDebtSummaryQueryKey,
  getListSplitPaymentsQueryKey,
  getListSplitsQueryKey,
} from '@/api/generated/api'
import type {
  ListSplitPayments200,
  ListSplits200,
  RegisterSplitPayment201,
} from '@/api/generated/model'
import { getSplitTransactionIdsQueryKey } from '@/features/credit-cards/hooks/use-split-transaction-ids'

/** Patch list caches immediately after registering a split receipt, then refetch. */
export async function syncAfterSplitReceipt(
  queryClient: QueryClient,
  slug: string,
  transactionId: string,
  result: RegisterSplitPayment201
): Promise<void> {
  const { payment, split } = result

  queryClient.setQueryData<ListSplits200>(
    getListSplitsQueryKey(slug, transactionId),
    prev => {
      if (!prev) return prev
      return {
        ...prev,
        splits: prev.splits.map(item =>
          item.id === split.id ? { ...item, ...split } : item
        ),
      }
    }
  )

  queryClient.setQueryData<ListSplitPayments200>(
    getListSplitPaymentsQueryKey(slug, transactionId, split.id),
    prev => {
      const existing = prev?.payments ?? []
      if (existing.some(item => item.id === payment.id)) return prev ?? { payments: existing }
      return { payments: [...existing, payment] }
    }
  )

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getListSplitsQueryKey(slug, transactionId) }),
    queryClient.invalidateQueries({
      queryKey: getGetSplitDebtSummaryQueryKey(slug, transactionId),
    }),
    queryClient.invalidateQueries({ queryKey: getSplitTransactionIdsQueryKey(slug) }),
    queryClient.invalidateQueries({
      queryKey: getListSplitPaymentsQueryKey(slug, transactionId, split.id),
    }),
  ])
}
