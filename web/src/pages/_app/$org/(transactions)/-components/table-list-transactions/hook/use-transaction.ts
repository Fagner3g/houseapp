import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import dayjs from 'dayjs'

import { useActiveOrganization } from '@/hooks/use-active-organization'
import { http } from '@/http/client'
import type { ListTransactions200 } from '@/http/generated/model'

const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD')
const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD')

export const useTransaction = () => {
  const { slug } = useActiveOrganization()
  const { tags = [], type, dateFrom, dateTo, page, perPage } = useSearch({ strict: false })
  const navigate = useNavigate()

  const { data, isPending } = useQuery({
    enabled: !!slug,
    queryKey: ['transactions', slug, tags.join(','), type, dateFrom, dateTo, page, perPage],
    queryFn: async () => {
      const search = new URLSearchParams()
      tags.forEach(tag => search.append('tags', tag))
      search.set('type', type ?? 'all')
      search.set('dateFrom', dateFrom ?? startOfMonth)
      search.set('dateTo', dateTo ?? endOfMonth)
      search.set('page', String(page))
      search.set('perPage', String(perPage))
      const url = `/org/${slug}/transactions?${search.toString()}`
      const res = await http<ListTransactions200>(url, { method: 'GET' })
      return res
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
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
