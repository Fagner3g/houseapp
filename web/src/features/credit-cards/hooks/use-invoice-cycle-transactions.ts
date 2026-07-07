import { useQueries, useQuery } from '@tanstack/react-query'

import {
  getListTransactionsQueryKey,
  listTransactions,
} from '@/api/generated/api'
import type { ListTransactionsParams } from '@/api/generated/model'

/** Loads every page of filtered transactions for invoice cycle views. */
export function useInvoiceCycleTransactions(
  slug: string | undefined,
  params: ListTransactionsParams | undefined,
  enabled = true
) {
  const perPage = Math.min(params?.perPage ?? 100, 100)

  const firstPageQuery = useQuery({
    queryKey: getListTransactionsQueryKey(slug, { ...params, page: 1, perPage }),
    queryFn: ({ signal }) => listTransactions(slug!, { ...params, page: 1, perPage }, { signal }),
    enabled: enabled && !!slug && !!params,
  })

  const totalPages = firstPageQuery.data?.pagination.totalPages ?? 0
  const extraPages = useQueries({
    queries: Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => {
      const page = index + 2
      return {
        queryKey: getListTransactionsQueryKey(slug, { ...params, page, perPage }),
        queryFn: ({ signal }: { signal?: AbortSignal }) =>
          listTransactions(slug!, { ...params, page, perPage }, { signal }),
        enabled: enabled && !!slug && !!params && firstPageQuery.isSuccess && totalPages > 1,
      }
    }),
  })

  const isPending =
    firstPageQuery.isPending ||
    extraPages.some(query => query.isPending && query.fetchStatus !== 'idle')
  const isLoading =
    firstPageQuery.isLoading || extraPages.some(query => query.isLoading && query.fetchStatus !== 'idle')
  const isFetching =
    firstPageQuery.isFetching || extraPages.some(query => query.isFetching)

  const transactions = [
    ...(firstPageQuery.data?.transactions ?? []),
    ...extraPages.flatMap(query => query.data?.transactions ?? []),
  ]

  return {
    transactions,
    isPending,
    isLoading,
    isFetching,
    error: firstPageQuery.error ?? extraPages.find(query => query.error)?.error,
    refetch: async () => {
      await firstPageQuery.refetch()
      await Promise.all(extraPages.map(query => query.refetch()))
    },
  }
}
