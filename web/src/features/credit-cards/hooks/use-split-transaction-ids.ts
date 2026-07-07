import { useQuery } from '@tanstack/react-query'

import type { ListSplitTransactionIds200 } from '@/api/generated/model'
import { http } from '@/lib/http'

export type SplitTransactionIdsResult = {
  transactionIds: Set<string>
  fullyDelegatedById: Map<string, string>
  fullyDelegatedCount: number
}

function toSplitTransactionIdsResult(data: ListSplitTransactionIds200): SplitTransactionIdsResult {
  return {
    transactionIds: new Set(data.transactionIds),
    fullyDelegatedById: new Map(
      data.fullyDelegated.map(item => [item.transactionId, item.delegateName])
    ),
    fullyDelegatedCount: data.fullyDelegated.length,
  }
}

export function useSplitTransactionIds(slug: string | undefined, transactionIds: string[]) {
  const sortedIds = [...transactionIds].sort().join(',')

  return useQuery({
    queryKey: ['split-transaction-ids', slug, sortedIds],
    queryFn: () =>
      http<ListSplitTransactionIds200>(`/organizations/${slug}/splits/transaction-ids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds }),
      }),
    enabled: !!slug && transactionIds.length > 0,
    select: toSplitTransactionIdsResult,
  })
}
