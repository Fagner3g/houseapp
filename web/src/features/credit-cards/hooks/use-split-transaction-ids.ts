import { useQuery } from '@tanstack/react-query'

import { http } from '@/lib/http'

export function useSplitTransactionIds(slug: string | undefined, transactionIds: string[]) {
  const sortedIds = [...transactionIds].sort().join(',')

  return useQuery({
    queryKey: ['split-transaction-ids', slug, sortedIds],
    queryFn: () =>
      http<{ transactionIds: string[] }>(`/organizations/${slug}/splits/transaction-ids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds }),
      }),
    enabled: !!slug && transactionIds.length > 0,
    select: data => new Set(data.transactionIds),
  })
}
