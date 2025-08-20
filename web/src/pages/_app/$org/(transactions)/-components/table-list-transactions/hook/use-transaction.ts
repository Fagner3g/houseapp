import { useNavigate, useSearch } from '@tanstack/react-router'
import dayjs from 'dayjs'

import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useListTransactions } from '@/api/generated/api'
import type { ListTransactionsParams } from '@/api/generated/model'

const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD')
const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD')

export const useTransaction = () => {
  const { slug } = useActiveOrganization()
  const { tags = [], type, dateFrom, dateTo, page, perPage } = useSearch({ strict: false })
  const navigate = useNavigate()

  const params: ListTransactionsParams = {
    tags,
    type: type ?? 'all',
    dateFrom: dateFrom ?? startOfMonth,
    dateTo: dateTo ?? endOfMonth,
    page,
    perPage,
  }

  const { data, isPending } = useListTransactions(slug, params, {
    query: {
      retry: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  })

  const onPageChange = (page: number) => {
    navigate({ to: '.', search: prev => ({ ...prev, page }), replace: true })
  }

  const onPerPageChange = (perPage: number) => {
    navigate({
      to: '.',
      search: prev => ({ ...prev, perPage, page: 1 }),
      replace: true,
    })
  }

  return {
    onPageChange,
    onPerPageChange,
    transactions: data?.transactions ?? [],
    page: data?.page ?? page ?? 1,
    perPage: data?.perPage ?? perPage ?? 10,
    totalPages: data?.totalPages ?? 1,
    pagesRemaining: data?.pagesRemaining ?? 0,
    isPending,
    type,
    dateFrom,
    dateTo,
    tags,
  }
}
