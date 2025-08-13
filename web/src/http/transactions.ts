import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { toast } from 'sonner'

import { http } from './client'
import { getListTransactionsQueryKey } from './generated/api'
import type { ListTransactions200 } from './generated/model'

async function deleteTransactionsApi(slug: string, ids: string[]) {
  return http<null>(`/org/${slug}/transactions`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
}

export function useDeleteTransactions(slug: string): UseMutationResult<
  Awaited<ReturnType<typeof deleteTransactionsApi>>, unknown, string[]
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ids => deleteTransactionsApi(slug, ids),
    onMutate: async ids => {
      await queryClient.cancelQueries({ queryKey: getListTransactionsQueryKey(slug) })
      const previous = queryClient.getQueryData<ListTransactions200>(
        getListTransactionsQueryKey(slug),
      )
      queryClient.setQueryData<ListTransactions200>(
        getListTransactionsQueryKey(slug),
        old => ({
          ...(old ?? { transactions: [] }),
          transactions: old?.transactions.filter(t => !ids.includes(t.id)) ?? [],
        }),
      )
      return { previous }
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(getListTransactionsQueryKey(slug), ctx.previous)
      }
      toast.error('Erro ao excluir transações')
    },
    onSuccess: () => {
      toast.success('Transações excluídas com sucesso!')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(slug) })
    },
  })
}
