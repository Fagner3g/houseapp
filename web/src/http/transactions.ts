import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { toast } from 'sonner'

import { http } from './client'
import { getListTransactionsQueryKey } from './generated/api'
import type { ListTransactions200, ListTransactions200TransactionsItem } from './generated/model'

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

interface UpdateInput {
  id: string
  data: Partial<Omit<ListTransactions200TransactionsItem, 'id' | 'ownerId' | 'payTo'>> & {
    payToEmail: string
  }
}

async function updateTransactionApi(slug: string, { id, data }: UpdateInput) {
  return http<null>(`/org/${slug}/transaction/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function useUpdateTransaction(
  slug: string,
): UseMutationResult<Awaited<ReturnType<typeof updateTransactionApi>>, unknown, UpdateInput> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: input => updateTransactionApi(slug, input),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: getListTransactionsQueryKey(slug) })
      const previous = queryClient.getQueryData<ListTransactions200>(
        getListTransactionsQueryKey(slug),
      )
      queryClient.setQueryData<ListTransactions200>(
        getListTransactionsQueryKey(slug),
        old => ({
          ...(old ?? { transactions: [] }),
          transactions:
            old?.transactions.map(t => (t.id === id ? { ...t, ...data } : t)) ?? [],
        }),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(getListTransactionsQueryKey(slug), ctx.previous)
      }
      toast.error('Erro ao atualizar transação')
    },
    onSuccess: () => {
      toast.success('Transação atualizada!')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(slug) })
    },
  })
}
